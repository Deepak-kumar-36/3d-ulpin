
"""
FastAPI Application — 3D ULPIN Vertical Property Mapping.

Single-service backend serving the complete pipeline:
  /project   → project management
  /process   → CV interface (accepts polygons from Person 1)
  /extrude   → 2D→3D extrusion + ULPIN generation
  /validate  → validation engine
  /health    → health check
  /fallback  → demo fallback endpoint
"""
import json
import os
import uuid
from typing import List, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.storage.database import init_db, get_db, ProjectModel, UnitModel, FloorModel
from app.schemas import (
    ProjectCreate, FloorUnitsInput, UnitPatchInput,
    ProjectResponse, FullProjectResponse, ExtrudeResponse,
    ValidateResponse, ProcessResponse, HealthResponse,
    UnitResponse, ValidationResult,
)
from app.services import (
    create_project, ingest_units, run_validation,
    get_full_project, run_fallback_pipeline,
)
from app.geometry.extrusion import extrude_polygon, compute_elevation, polygon_area
from app.geometry.ulpin import generate_ulpin
from app.validation.engine import summarize_validation


# ── Lifespan ───────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


# ── App init ───────────────────────────────────────────────────────────────────

app = FastAPI(
    title="3D ULPIN — Vertical Property Mapping",
    description=(
        "Converts 2D building floor plans into validated, uniquely-identified "
        "3D representations of individual property units."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health ─────────────────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse, tags=["System"])
def health():
    return {"status": "ok", "version": "0.1.0"}


# ── Project CRUD ───────────────────────────────────────────────────────────────

@app.post("/project", response_model=ProjectResponse, tags=["Project"])
def create_project_endpoint(body: ProjectCreate, db: Session = Depends(get_db)):
    """Create a new project with building metadata and a mock parcel."""
    try:
        pid = create_project(
            db=db,
            name=body.name,
            parcel_id=body.parcel_id,
            floor_count=body.floor_count,
            floor_height=body.floor_height,
            basement_count=body.basement_count,
            parcel_boundary=body.parcel_boundary,
        )
        return {"project_id": pid}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/project/{project_id}", tags=["Project"])
def get_project_endpoint(project_id: str, db: Session = Depends(get_db)):
    """Retrieve the full project payload (floors, units, validation, 3D geometry)."""
    result = get_full_project(db, project_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return result


# ── Floor plan upload (interface for Person 1) ────────────────────────────────

@app.post("/project/{project_id}/floor-plan", tags=["Floor Plan"])
def upload_floor_plan(
    project_id: str,
    floor_number: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Upload a floor plan image for a given floor.

    NOTE: The actual CV processing is Person 1's responsibility.
    This endpoint stores the image and returns a floor_plan_id that can be
    passed to /process.
    """
    project = db.query(ProjectModel).filter_by(id=project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Save image to data/uploads/
    upload_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    fp_id = str(uuid.uuid4())
    ext = os.path.splitext(file.filename or "image.png")[1]
    filepath = os.path.join(upload_dir, f"{fp_id}{ext}")
    with open(filepath, "wb") as f:
        f.write(file.file.read())

    return {
        "floor_plan_id": fp_id,
        "project_id": project_id,
        "floor_number": floor_number,
        "file_path": filepath,
    }


# ── Process: ingest detected polygons ─────────────────────────────────────────

@app.post("/process/{project_id}", tags=["Processing"])
def process_units(
    project_id: str,
    body: FloorUnitsInput,
    db: Session = Depends(get_db),
):
    """
    Ingest detected unit polygons into the project.

    Accepts a list of {polygon, floor_number, unit_type} objects.
    Runs extrusion + ULPIN generation.
    """
    project = db.query(ProjectModel).filter_by(id=project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    try:
        units_data = [u.model_dump() for u in body.units]
        unit_ids = ingest_units(db, project_id, units_data)
        return {"units_created": len(unit_ids), "unit_ids": unit_ids}
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))


# ── Extrude: re-extrude all units (if needed) ─────────────────────────────────

@app.post("/extrude/{project_id}", tags=["Processing"])
def extrude_project(project_id: str, db: Session = Depends(get_db)):
    """
    Re-extrude all units in the project.

    Normally extrusion happens during /process, but this endpoint allows
    re-running after polygon corrections.
    """
    project = db.query(ProjectModel).filter_by(id=project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    building = project.building
    if not building:
        raise HTTPException(status_code=409, detail="No building found for project")

    floor_height = building.floor_height
    updated = 0

    for floor_rec in building.floors:
        base_z = compute_elevation(floor_rec.floor_number, floor_height)
        for unit_rec in floor_rec.units:
            coords = json.loads(unit_rec.polygon_2d)
            vertices, faces = extrude_polygon(coords, base_z, floor_height)
            unit_rec.vertices = json.dumps(vertices)
            unit_rec.faces = json.dumps(faces)
            unit_rec.elevation = base_z
            unit_rec.height = floor_height
            unit_rec.area = round(polygon_area(coords), 2)
            updated += 1

    db.commit()

    result = get_full_project(db, project_id)
    return {"units_updated": updated, "units_3d": result["units"]}


# ── Validate ───────────────────────────────────────────────────────────────────

@app.post("/validate/{project_id}", tags=["Validation"])
def validate_project(project_id: str, db: Session = Depends(get_db)):
    """Run all validation rules on the project's units."""
    try:
        results = run_validation(db, project_id)
        summary = summarize_validation(results)
        return {"results": results, "summary": summary}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ── Unit endpoints ─────────────────────────────────────────────────────────────

@app.get("/units/{unit_id}", tags=["Units"])
def get_unit(unit_id: str, db: Session = Depends(get_db)):
    """Retrieve a single unit's full detail."""
    unit = db.query(UnitModel).filter_by(id=unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")

    floor_rec = unit.floor
    return {
        "id": unit.id,
        "ulpin_3d": unit.ulpin_3d,
        "floor_id": unit.floor_id,
        "floor_number": floor_rec.floor_number,
        "polygon_2d": json.loads(unit.polygon_2d),
        "vertices": json.loads(unit.vertices),
        "faces": json.loads(unit.faces),
        "area": unit.area,
        "elevation": unit.elevation,
        "height": unit.height,
        "unit_type": unit.unit_type,
        "validations": [
            {
                "id": v.id,
                "unit_id": v.unit_id,
                "rule": v.rule,
                "status": v.status,
                "message": v.message,
            }
            for v in unit.validations
        ],
    }


@app.patch("/units/{unit_id}", tags=["Units"])
def patch_unit(unit_id: str, body: UnitPatchInput, db: Session = Depends(get_db)):
    """Lightweight polygon correction (P1)."""
    unit = db.query(UnitModel).filter_by(id=unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")

    floor_rec = unit.floor
    floor_height = floor_rec.building.floor_height
    base_z = compute_elevation(floor_rec.floor_number, floor_height)

    # Update polygon
    unit.polygon_2d = json.dumps(body.polygon)
    unit.area = round(polygon_area(body.polygon), 2)

    # Re-extrude
    vertices, faces = extrude_polygon(body.polygon, base_z, floor_height)
    unit.vertices = json.dumps(vertices)
    unit.faces = json.dumps(faces)
    unit.elevation = base_z

    db.commit()
    return {"id": unit.id, "status": "updated", "area": unit.area}


# ── Fallback demo pipeline ────────────────────────────────────────────────────

@app.post("/fallback/run", tags=["Demo"])
def run_fallback(db: Session = Depends(get_db)):
    """
    Execute the full pipeline using synthetic fallback data.

    This endpoint is the safety net: if the CV pipeline is unavailable,
    the frontend can call this to get a fully processed demo project.
    """
    result = run_fallback_pipeline(db)
    return result


# ── Static fallback JSON (for when the backend itself is down) ────────────────

@app.get("/fallback/static", tags=["Demo"])
def get_static_fallback():
    """Return the raw fallback dataset definition (no processing)."""
    from app.fallback_data import get_fallback_project
    return get_fallback_project()


# ── CV Integration (Person 1 → Person 2 handoff) ─────────────────────────────

@app.post("/cv/ingest", tags=["CV Integration"])
def ingest_cv_floors(
    body: dict,
    db: Session = Depends(get_db),
):
    """
    Ingest Person 1's floor-plan JSON files and run the full pipeline.

    Accepts:
    {
      "floors": [
        {"json": <L1.json content>, "floor_number": 0},
        {"json": <L2.json content>, "floor_number": 1},
        {"json": <L3.json content>, "floor_number": 2}
      ],
      "project_name": "CV-Detected Building",  // optional
      "floor_height": 3.0,                     // optional
      "px_per_meter": null                     // optional
    }

    Applies coordinate transforms (Y-flip, px→m scaling, centering),
    then runs extrusion, ULPIN generation, validation, and persistence.
    """
    from app.cv_adapter import transform_cv_floor

    floors_input = body.get("floors", [])
    if not floors_input:
        raise HTTPException(status_code=400, detail="No floors provided")

    project_name = body.get("project_name", "CV-Detected Building")
    floor_height = body.get("floor_height", 3.0)
    px_per_meter = body.get("px_per_meter", None)

    # Create project
    parcel_id = f"CV-{project_name.replace(' ', '-').upper()[:20]}"
    floor_count = len(floors_input)
    basement_count = sum(1 for f in floors_input if f.get("floor_number", 0) < 0)

    project_id = create_project(
        db=db,
        name=project_name,
        parcel_id=parcel_id,
        floor_count=floor_count,
        floor_height=floor_height,
        basement_count=basement_count,
    )

    # Transform and ingest each floor
    all_units = []
    floor_reports = []

    for floor_entry in floors_input:
        cv_json = floor_entry["json"]
        floor_num = floor_entry.get("floor_number", 0)

        transformed = transform_cv_floor(
            cv_json=cv_json,
            floor_number=floor_num,
            px_per_meter=px_per_meter,
        )

        floor_reports.append({
            "floor_id": transformed["floor_id"],
            "floor_number": floor_num,
            "units_detected": len(transformed["units"]),
            "source": transformed["source"],
            "scale_px_per_m": transformed["scale_px_per_m"],
        })

        for u in transformed["units"]:
            all_units.append({
                "polygon": u["polygon"],
                "floor_number": u["floor_number"],
                "unit_type": u["unit_type"],
            })

    # Run the pipeline
    unit_ids = ingest_units(db, project_id, all_units)
    validation_results = run_validation(db, project_id)
    result = get_full_project(db, project_id)

    return {
        "project_id": project_id,
        "project": result,
        "floor_reports": floor_reports,
        "total_units_ingested": len(unit_ids),
        "validation_summary": result["validation_summary"],
    }


@app.post("/cv/ingest-file", tags=["CV Integration"])
def ingest_cv_file(
    floor_number: int = Form(0),
    floor_height: float = Form(3.0),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Upload a single Person 1 floor JSON file and process it.

    Simpler alternative to /cv/ingest — one floor at a time via file upload.
    """
    import json as json_module
    from app.cv_adapter import transform_cv_floor

    content = file.file.read().decode("utf-8")
    cv_json = json_module.loads(content)

    transformed = transform_cv_floor(cv_json, floor_number)

    # Create a minimal project for this single floor
    parcel_id = f"CV-{cv_json.get('floor_id', 'FLOOR')}"
    project_id = create_project(
        db=db,
        name=f"CV Floor {cv_json.get('floor_id', floor_number)}",
        parcel_id=parcel_id,
        floor_count=1,
        floor_height=floor_height,
    )

    units_data = [{
        "polygon": u["polygon"],
        "floor_number": u["floor_number"],
        "unit_type": u["unit_type"],
    } for u in transformed["units"]]

    unit_ids = ingest_units(db, project_id, units_data)
    run_validation(db, project_id)
    result = get_full_project(db, project_id)

    return {
        "project_id": project_id,
        "floor_id": transformed["floor_id"],
        "source": transformed["source"],
        "scale_px_per_m": transformed["scale_px_per_m"],
        "units_ingested": len(unit_ids),
        "project": result,
    }


@app.post("/cv/preview", tags=["CV Integration"])
def preview_cv_transform(body: dict):
    """
    Preview the coordinate transformation without persisting anything.

    Useful for debugging: see what the backend produces from Person 1's JSON
    before running the full pipeline.
    """
    from app.cv_adapter import transform_cv_floor

    cv_json = body.get("json", body)
    floor_number = body.get("floor_number", 0)
    px_per_meter = body.get("px_per_meter", None)

    transformed = transform_cv_floor(cv_json, floor_number, px_per_meter)
    return transformed
