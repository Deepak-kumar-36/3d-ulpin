"""
Core Processing Service.

Orchestrates the end-to-end pipeline:
  polygon input → normalisation → floor assignment → extrusion →
  ULPIN generation → validation → persistence → API-ready response.

This module does NOT depend on any specific CV implementation.
It accepts normalised polygon data and runs the geometry/validation pipeline.
"""
import json
import uuid
from typing import List, Dict, Any, Optional

from sqlalchemy.orm import Session
from shapely.geometry import Polygon

from app.storage.database import (
    ProjectModel, ParcelModel, BuildingModel, FloorModel, UnitModel, ValidationModel,
)
from app.geometry.extrusion import extrude_polygon, compute_elevation, polygon_area
from app.geometry.ulpin import generate_ulpin
from app.validation.engine import validate_floor, summarize_validation


# ── Project creation ───────────────────────────────────────────────────────────

def create_project(
    db: Session,
    name: str,
    parcel_id: str,
    floor_count: int,
    floor_height: float,
    basement_count: int = 0,
    parcel_boundary: Optional[List[List[float]]] = None,
) -> str:
    """Create a project with its parcel and building records."""
    project_id = str(uuid.uuid4())
    building_id = str(uuid.uuid4())

    # Default parcel boundary (50×50 m square centred on origin)
    if parcel_boundary is None:
        parcel_boundary = [[-5, -5], [35, -5], [35, 25], [-5, 25], [-5, -5]]

    # Upsert parcel (idempotent on parcel_id)
    existing_parcel = db.query(ParcelModel).filter_by(id=parcel_id).first()
    if not existing_parcel:
        parcel = ParcelModel(id=parcel_id, boundary=json.dumps(parcel_boundary))
        db.add(parcel)

    project = ProjectModel(id=project_id, name=name, parcel_id=parcel_id)
    building = BuildingModel(
        id=building_id,
        project_id=project_id,
        floor_count=floor_count,
        floor_height=floor_height,
        basement_count=basement_count,
    )
    db.add(project)
    db.add(building)
    db.commit()
    return project_id


# ── Ingest detected polygons ──────────────────────────────────────────────────

def ingest_units(
    db: Session,
    project_id: str,
    units_input: List[Dict[str, Any]],
) -> List[str]:
    """
    Ingest a batch of detected unit polygons.

    Each item: {"polygon": [[x,y],...], "floor_number": int, "unit_type": str}

    Creates Floor records as needed, then Unit records with extrusion + ULPIN.
    Returns list of created unit IDs.
    """
    project = db.query(ProjectModel).filter_by(id=project_id).first()
    if not project:
        raise ValueError(f"Project {project_id} not found")

    building = project.building
    floor_height = building.floor_height
    parcel_id = project.parcel_id

    # Calculate building index to avoid ULPIN collisions on the same parcel
    projects_on_parcel = db.query(ProjectModel).filter_by(parcel_id=parcel_id).order_by(ProjectModel.id).all()
    building_index = 1
    for i, p in enumerate(projects_on_parcel, start=1):
        if p.id == project_id:
            building_index = i
            break

    # Group inputs by floor
    floors_map: Dict[int, List[Dict]] = {}
    for u in units_input:
        fn = u["floor_number"]
        floors_map.setdefault(fn, []).append(u)

    created_unit_ids: List[str] = []

    for floor_number in sorted(floors_map.keys()):
        floor_units = floors_map[floor_number]

        # Find or create floor record
        floor_rec = (
            db.query(FloorModel)
            .filter_by(building_id=building.id, floor_number=floor_number)
            .first()
        )
        if not floor_rec:
            # Derive floor footprint from the union of unit polygons (simplified)
            all_polys = []
            for u in floor_units:
                coords = u["polygon"]
                ring = list(coords)
                if len(ring) > 1 and ring[0] != ring[-1]:
                    ring.append(ring[0])
                all_polys.append(Polygon(ring))

            if all_polys:
                from shapely.ops import unary_union
                union = unary_union(all_polys)
                # Use the convex hull as the floor footprint
                footprint_coords = list(union.convex_hull.exterior.coords)
            else:
                footprint_coords = [[-5, -5], [35, -5], [35, 25], [-5, 25], [-5, -5]]

            floor_rec = FloorModel(
                id=str(uuid.uuid4()),
                building_id=building.id,
                floor_number=floor_number,
                footprint=json.dumps([[c[0], c[1]] for c in footprint_coords]),
            )
            db.add(floor_rec)
            db.flush()

        # Create units
        base_z = compute_elevation(floor_number, floor_height)

        for idx, u in enumerate(floor_units, start=1):
            unit_id = str(uuid.uuid4())

            # Normalise polygon
            coords = u["polygon"]
            ring = list(coords)
            if len(ring) > 1 and ring[0] != ring[-1]:
                ring.append(ring[0])

            # Compute area
            area = polygon_area(coords)

            # Extrude to 3D
            vertices, faces = extrude_polygon(coords, base_z, floor_height)

            # Generate ULPIN
            ulpin = generate_ulpin(
                parcel_id=parcel_id,
                building_index=building_index,
                floor_number=floor_number,
                unit_index=idx,
            )

            unit_type = u.get("unit_type", "residential")

            unit_rec = UnitModel(
                id=unit_id,
                floor_id=floor_rec.id,
                ulpin_3d=ulpin,
                polygon_2d=json.dumps(coords),
                vertices=json.dumps(vertices),
                faces=json.dumps(faces),
                area=round(area, 2),
                elevation=base_z,
                height=floor_height,
                unit_type=unit_type,
            )
            db.add(unit_rec)
            created_unit_ids.append(unit_id)

    db.commit()
    return created_unit_ids


# ── Validation ─────────────────────────────────────────────────────────────────

def run_validation(db: Session, project_id: str) -> List[Dict]:
    """
    Run all validation rules for every floor of a project.

    Persists results and returns them.
    """
    project = db.query(ProjectModel).filter_by(id=project_id).first()
    if not project:
        raise ValueError(f"Project {project_id} not found")

    building = project.building
    all_results: List[Dict] = []

    for floor_rec in building.floors:
        footprint_coords = json.loads(floor_rec.footprint)
        ring = list(footprint_coords)
        if len(ring) > 1 and ring[0] != ring[-1]:
            ring.append(ring[0])
        floor_poly = Polygon(ring)

        unit_tuples = []
        for unit_rec in floor_rec.units:
            poly_coords = json.loads(unit_rec.polygon_2d)
            r = list(poly_coords)
            if len(r) > 1 and r[0] != r[-1]:
                r.append(r[0])
            unit_poly = Polygon(r)
            unit_tuples.append((unit_rec.ulpin_3d, unit_poly))

        floor_results = validate_floor(
            floor_id=f"Floor {floor_rec.floor_number}",
            floor_footprint=floor_poly,
            units=unit_tuples,
        )

        # Persist validation records (clear previous first)
        for unit_rec in floor_rec.units:
            db.query(ValidationModel).filter_by(unit_id=unit_rec.id).delete()

        # Map ulpin back to unit_id for persistence
        ulpin_to_id = {u.ulpin_3d: u.id for u in floor_rec.units}

        for r in floor_results:
            db_unit_id = ulpin_to_id.get(r["unit_id"])
            if db_unit_id:
                val = ValidationModel(
                    id=r["id"],
                    unit_id=db_unit_id,
                    rule=r["rule"],
                    status=r["status"],
                    message=r.get("message"),
                )
                db.add(val)
            # Floor-level checks (unit_id starts with "floor:") stored separately
            elif r["unit_id"].startswith("floor:"):
                # Store against the first unit on the floor for persistence
                if floor_rec.units:
                    val = ValidationModel(
                        id=r["id"],
                        unit_id=floor_rec.units[0].id,
                        rule=r["rule"],
                        status=r["status"],
                        message=r.get("message"),
                    )
                    db.add(val)

        all_results.extend(floor_results)

    db.commit()
    return all_results


# ── Full project retrieval ─────────────────────────────────────────────────────

def get_full_project(db: Session, project_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve the complete project payload for the frontend."""
    project = db.query(ProjectModel).filter_by(id=project_id).first()
    if not project:
        return None

    parcel = project.parcel
    building = project.building

    floors_out = []
    units_out = []
    all_validations = []

    floor_height = building.floor_height

    for floor_rec in sorted(building.floors, key=lambda f: f.floor_number):
        fn = floor_rec.floor_number
        base_z = compute_elevation(fn, building.floor_height)
        top_z = base_z + building.floor_height
        
        if fn < 0:
            label = f"Basement {abs(fn)}"
        elif fn == 0:
            label = "Ground Floor"
        else:
            label = f"Floor {fn:02d}"
            
        floors_out.append({
            "id": floor_rec.id,
            "floor_number": fn,
            "footprint": json.loads(floor_rec.footprint),
            "label": label,
            "unit_count": len(floor_rec.units),
            "elevation_base": base_z,
            "elevation_top": top_z,
        })

        for unit_rec in floor_rec.units:
            val_list = []
            for v in unit_rec.validations:
                vr = {
                    "id": v.id,
                    "unit_id": unit_rec.id,
                    "rule": v.rule,
                    "status": v.status,
                    "message": v.message,
                }
                val_list.append(vr)
                all_validations.append(vr)

            units_out.append({
                "id": unit_rec.id,
                "ulpin_3d": unit_rec.ulpin_3d,
                "floor_id": unit_rec.floor_id,
                "floor_number": floor_rec.floor_number,
                "polygon_2d": json.loads(unit_rec.polygon_2d),
                "vertices": json.loads(unit_rec.vertices),
                "faces": json.loads(unit_rec.faces),
                "area": unit_rec.area,
                "elevation": unit_rec.elevation,
                "height": unit_rec.height,
                "unit_type": unit_rec.unit_type,
                "validations": val_list,
            })

    summary = summarize_validation(all_validations)

    return {
        "id": project.id,
        "name": project.name,
        "parcel_id": parcel.id,
        "parcel_boundary": json.loads(parcel.boundary),
        "parcel": {
            "id": parcel.id,
            "boundary": json.loads(parcel.boundary),
        },
        "building": {
            "id": building.id,
            "floor_count": building.floor_count,
            "floor_height": building.floor_height,
            "basement_count": building.basement_count,
        },
        "floors": floors_out,
        "units": units_out,
        "validation_summary": summary,
    }


# ── Convenience: run the full pipeline on fallback data ────────────────────────

def run_fallback_pipeline(db: Session) -> Dict[str, Any]:
    """
    Execute the full pipeline using the synthetic fallback dataset.

    Returns the complete project payload.
    """
    from app.fallback_data import get_fallback_project

    data = get_fallback_project()

    project_id = create_project(
        db=db,
        name=data["name"],
        parcel_id=data["parcel_id"],
        floor_count=data["floor_count"],
        floor_height=data["floor_height"],
        basement_count=data["basement_count"],
        parcel_boundary=data["parcel_boundary"],
    )

    # Flatten units from all floors
    all_units = []
    for floor_def in data["floors"]:
        for unit_def in floor_def["units"]:
            all_units.append({
                "polygon": unit_def["polygon"],
                "floor_number": floor_def["floor_number"],
                "unit_type": unit_def.get("unit_type", "residential"),
            })

    ingest_units(db, project_id, all_units)
    run_validation(db, project_id)

    return get_full_project(db, project_id)
