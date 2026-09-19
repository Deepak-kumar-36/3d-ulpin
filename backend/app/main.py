"""
FastAPI Application — 3D ULPIN Vertical Property Mapping.

Single-service backend serving the complete pipeline:
  /project   → project management
  /process   → CV interface (accepts polygons from Person 1)
  /extrude   → 2D→3D extrusion + ULPIN generation
  /validate  → validation engine
  /health    → health check
  /fallback  → demo fallback endpoint
  /detect    → direct vision unit detection from 2D floor plan image/PDF
"""
import asyncio
from functools import partial
import json
import os
from pathlib import Path
import shutil
import sys
import uuid
from typing import List, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.orm import Session

# ── Make sure the project root and backend are on sys.path ──
_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_backend = os.path.join(_root, "backend")
if _root not in sys.path:
    sys.path.insert(0, _root)
if _backend not in sys.path:
    sys.path.insert(0, _backend)

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
from vision.export import process_floor


# ── Lifespan ───────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


# ── App init ───────────────────────────────────────────────────────────────────

app = FastAPI(
    title="VERTA — 3D ULPIN Backend",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OUT_DIR = Path("out")
OUT_DIR.mkdir(exist_ok=True)

ALLOWED_CONTENT_TYPES = {"image/png", "image/jpeg", "image/jpg", "application/pdf"}
MAX_UPLOAD_BYTES = 50 * 1024 * 1024  # 50 MB


# ── Health ─────────────────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse, tags=["System"])
def health():
    return {"status": "ok", "version": "0.2.0"}


# ── Direct Vision Detection (Uploaded Image/PDF -> Polygons) ─────────────────

@app.post("/detect", tags=["Vision"])
async def detect(
    file: UploadFile = File(...),
    floor_id: str = Form(default=""),
    detector: str = Form(default="auto"),
):
    """
    Accept a floor-plan image, run the vision pipeline, return the floor JSON.

    The JSON matches the vision contract:
      { floor_id, image_size, px_per_meter, coord_system, units, doors, source }
    """
    ct = (file.content_type or "").lower()
    if ct not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ct}'. Upload a PNG, JPEG, or PDF.",
        )

    contents = await file.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="File too large (max 50 MB).")
    if len(contents) < 100:
        raise HTTPException(status_code=400, detail="File is too small or empty.")

    if not floor_id:
        name_no_ext = Path(file.filename or "upload").stem
        floor_id = name_no_ext

    ext = Path(file.filename or "upload.png").suffix or ".png"
    request_id = uuid.uuid4().hex[:8]
    temp_path = OUT_DIR / f"_upload_{request_id}{ext}"
    temp_path.write_bytes(contents)

    try:
        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(
            None,
            partial(
                process_floor,
                image_path=temp_path,
                floor_id=floor_id,
                out_dir=OUT_DIR,
                use_cached=False,
                save_cache=False,
                debug=False,
                detector=detector,
            ),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Detection failed: {e}")
    finally:
        if temp_path.exists():
            temp_path.unlink(missing_ok=True)

    if not result.get("units"):
        raise HTTPException(
            status_code=422,
            detail="No units detected. Try a clearer, higher-contrast plan with dark walls on a white background.",
        )

    return JSONResponse(content=result)


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
    if project_id in ("demo", "fallback"):
        return run_fallback_pipeline(db)
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
    Upload a floor plan image, run the CV detection pipeline, and ingest the results.
    """
    project = db.query(ProjectModel).filter_by(id=project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    upload_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    fp_id = str(uuid.uuid4())
    ext = os.path.splitext(file.filename or "image.png")[1]
    filepath = os.path.join(upload_dir, f"{fp_id}{ext}")
    with open(filepath, "wb") as f:
        f.write(file.file.read())

    # Run the CV pipeline
    from vision.detect import detect_units, DetectConfig
    from vision.plan_configs import PLAN_CONFIGS
    
    # Try to get a specific config or fallback to base
    # PLAN_CONFIGS uses 1-based L1, L2, L3 etc.
    config_key = f"L{floor_number + 1}"
    cfg_overrides = PLAN_CONFIGS.get(config_key, PLAN_CONFIGS.get("L1", {}))
    cfg = DetectConfig(**cfg_overrides)
    
    try:
        cv_json = detect_units(filepath, floor_id=f"L{floor_number}", cfg=cfg)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Vision pipeline failed: {str(e)}")

    # Transform to backend coordinates
    from app.cv_adapter import transform_cv_floor
    transformed = transform_cv_floor(cv_json, floor_number)

    # Prepare units for ingestion
    units_data = [{
        "polygon": u["polygon"],
        "floor_number": u["floor_number"],
        "unit_type": u["unit_type"],
    } for u in transformed["units"]]

    # Ingest units and validate
    try:
        from app.services import ingest_units, run_validation
        unit_ids = ingest_units(db, project_id, units_data)
        run_validation(db, project_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")

    return {
        "floor_plan_id": fp_id,
        "project_id": project_id,
        "floor_number": floor_number,
        "file_path": filepath,
        "units_detected": len(unit_ids)
    }


# ── CV Interface: Ingest 2D Polygons ──────────────────────────────────────────

@app.post("/project/{project_id}/floor/{floor_number}/units", response_model=ProcessResponse, tags=["CV Interface"])
def ingest_floor_units(
    project_id: str,
    floor_number: int,
    body: FloorUnitsInput,
    db: Session = Depends(get_db),
):
    """
    Accept 2D polygon data (from CV/Person 1) for a specific floor.

    Coordinates must be in METERS, exterior ring only, counter-clockwise.
    Origin at floor plan bottom-left.
    """
    project = db.query(ProjectModel).filter_by(id=project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    units_data = [
        {
            "polygon": u.polygon,
            "floor_number": floor_number,
            "unit_type": u.unit_type,
        }
        for u in body.units
    ]

    unit_ids = ingest_units(db, project_id, units_data)
    return {
        "project_id": project_id,
        "floor_number": floor_number,
        "units_ingested": len(unit_ids),
        "unit_ids": unit_ids,
    }


# ── Extrusion & ULPIN Generation ──────────────────────────────────────────────

@app.post("/project/{project_id}/extrude", response_model=ExtrudeResponse, tags=["Geometry"])
def extrude_project(project_id: str, db: Session = Depends(get_db)):
    """Run 2D→3D extrusion and assign 3D ULPINs to all un-extruded units."""
    project = db.query(ProjectModel).filter_by(id=project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    floor_height = project.floor_height
    units = (
        db.query(UnitModel)
        .join(FloorModel)
        .filter(FloorModel.project_id == project_id)
        .all()
    )

    extruded_count = 0
    assigned_ulpins = []

    for unit in units:
        polygon = json.loads(unit.polygon_2d)
        floor_num = unit.floor.floor_number

        base_z = compute_elevation(floor_num, floor_height)
        vertices, faces = extrude_polygon(polygon, base_z, floor_height)

        unit.vertices = json.dumps(vertices)
        unit.faces = json.dumps(faces)
        unit.elevation = base_z
        unit.height = floor_height
        unit.area = round(polygon_area(polygon), 2)

        # Generate 3D ULPIN
        center_x = sum(p[0] for p in polygon) / len(polygon)
        center_y = sum(p[1] for p in polygon) / len(polygon)
        ulpin = generate_ulpin(
            parcel_id=project.parcel_id,
            floor_number=floor_num,
            centroid=(center_x, center_y),
            elevation=base_z,
            unit_index=int(unit.id.split("-")[-1]) if "-" in unit.id else 0,
        )
        unit.ulpin_3d = ulpin
        assigned_ulpins.append(ulpin)
        extruded_count += 1

    db.commit()
    return {
        "project_id": project_id,
        "extruded_units": extruded_count,
        "ulpins": assigned_ulpins,
    }


# ── Validation Engine ─────────────────────────────────────────────────────────

@app.post("/project/{project_id}/validate", response_model=ValidateResponse, tags=["Validation"])
def validate_project(project_id: str, db: Session = Depends(get_db)):
    """Run topology, boundary, volume, and ULPIN validation checks on all units."""
    project = db.query(ProjectModel).filter_by(id=project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    try:
        results = run_validation(db, project_id)
        summary = summarize_validation(results)
        return {
            "project_id": project_id,
            "results": [
                {
                    "id": r.id,
                    "unit_id": r.unit_id,
                    "rule": r.rule,
                    "status": r.status,
                    "message": r.message,
                    "severity": r.severity,
                }
                for r in results
            ],
            "summary": summary,
        }
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

    unit.polygon_2d = json.dumps(body.polygon)
    unit.area = round(polygon_area(body.polygon), 2)

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
    """
    result = run_fallback_pipeline(db)
    return result


@app.get("/fallback/static", tags=["Demo"])
def get_static_fallback():
    """Return the raw fallback dataset definition (no processing)."""
    from app.fallback_data import get_fallback_project
    return get_fallback_project()


# ── CV Integration (Person 1 -> Person 2 handoff) ─────────────────────────────

@app.post("/cv/ingest", tags=["CV Integration"])
def ingest_cv_floors(
    body: dict,
    db: Session = Depends(get_db),
):
    from app.cv_adapter import transform_cv_floor

    floors_input = body.get("floors", [])
    if not floors_input:
        raise HTTPException(status_code=400, detail="No floors provided")

    project_name = body.get("project_name", "CV-Detected Building")
    floor_height = body.get("floor_height", 3.0)
    px_per_meter = body.get("px_per_meter", None)

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

    unit_ids = ingest_units(db, project_id, all_units)
    run_validation(db, project_id)
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
    import json as json_module
    from app.cv_adapter import transform_cv_floor

    content = file.file.read().decode("utf-8")
    cv_json = json_module.loads(content)

    transformed = transform_cv_floor(cv_json, floor_number)

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
    from app.cv_adapter import transform_cv_floor

    cv_json = body.get("json", body)
    floor_number = body.get("floor_number", 0)
    px_per_meter = body.get("px_per_meter", None)

    transformed = transform_cv_floor(cv_json, floor_number, px_per_meter)
    return transformed


@app.get("/")
def root():
    return {
        "status": "VERTA backend running",
        "endpoints": ["/detect", "/health", "/project", "/fallback/run", "/cv/ingest"]
    }
