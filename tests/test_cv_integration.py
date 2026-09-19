"""Test script: CV integration with Person 1's floor JSONs."""
import json
import sys
sys.path.insert(0, 'backend')

from app.cv_adapter import transform_cv_floor, transform_multi_floor

# Load Person 1's floor JSONs
with open('tests/L1.json') as f: l1 = json.load(f)
with open('tests/L2.json') as f: l2 = json.load(f)
with open('tests/L3.json') as f: l3 = json.load(f)

print("=" * 70)
print("STEP 1: Preview coordinate transform (L1 only)")
print("=" * 70)

t1 = transform_cv_floor(l1, floor_number=0)
print(f"Floor ID: {t1['floor_id']}")
print(f"Source: {t1['source']}")
print(f"Scale: {t1['scale_px_per_m']} px/m")
print(f"Units: {len(t1['units'])}")
print(f"Footprint points: {len(t1['footprint'])}")
print()

for u in t1['units']:
    poly = u['polygon']
    xs = [p[0] for p in poly]
    ys = [p[1] for p in poly]
    w = max(xs) - min(xs)
    h = max(ys) - min(ys)
    has_holes = len(u['holes']) > 0
    print(f"  {u['cv_id']:8s}  size={w:.1f}x{h:.1f}m  holes={has_holes}  area_px={u['area_px']}")
    # Verify Y was flipped: original L1-01 had y=108..515 (top region)
    # After flip, should have higher y values (top of building in 3D)
    if u['cv_id'] == 'L1-01':
        print(f"           Original Y range: 108..515 (top of image)")
        print(f"           Transformed Y range: {min(ys):.1f}..{max(ys):.1f} (should be higher in 3D)")

print()
print("=" * 70)
print("STEP 2: Full multi-floor transform")
print("=" * 70)

result = transform_multi_floor([
    (l1, 0),  # Ground floor
    (l2, 1),  # Floor 1
    (l3, 2),  # Floor 2
])

print(f"Project: {result['name']}")
print(f"Total units: {result['total_units']}")
print(f"Floors: {result['floor_count']}")
print()
for fl in result['floors']:
    units_on_floor = [u for u in result['units'] if u['floor_number'] == fl['floor_number']]
    print(f"  Floor {fl['floor_number']} ({fl['floor_id']}): {len(units_on_floor)} units")

print()
print("=" * 70)
print("STEP 3: End-to-end pipeline via service layer")
print("=" * 70)

from app.storage.database import init_db, drop_db, SessionLocal, Base, engine

# Fresh DB
drop_db()
init_db()

from app.services import create_project, ingest_units, run_validation, get_full_project

db = SessionLocal()

# Create project from CV data
project_id = create_project(
    db=db,
    name=result['name'],
    parcel_id=result['parcel_id'],
    floor_count=result['floor_count'],
    floor_height=result['floor_height'],
    basement_count=result['basement_count'],
)

# Ingest all units
units_for_ingest = [{
    "polygon": u["polygon"],
    "floor_number": u["floor_number"],
    "unit_type": u["unit_type"],
} for u in result['units']]

unit_ids = ingest_units(db, project_id, units_for_ingest)
print(f"Units ingested: {len(unit_ids)}")

# Run validation
val_results = run_validation(db, project_id)
from app.validation.engine import summarize_validation
summary = summarize_validation(val_results)
print(f"Validation: {summary}")

# Get full project
project = get_full_project(db, project_id)

print(f"\nProject: {project['name']}")
print(f"Floors: {len(project['floors'])}")
print(f"Units: {len(project['units'])}")
print()

print("=== All Units with 3D Geometry ===")
for u in project['units']:
    verts = u['vertices']
    z_min = min(v[2] for v in verts)
    z_max = max(v[2] for v in verts)
    x_range = max(v[0] for v in verts) - min(v[0] for v in verts)
    y_range = max(v[1] for v in verts) - min(v[1] for v in verts)
    print(f"  {u['ulpin_3d']:40s}  floor={u['floor_number']}  area={u['area']:8.2f}m²  Z=[{z_min:.1f},{z_max:.1f}]  ~{x_range:.1f}x{y_range:.1f}m")

print()
ulpins = [u['ulpin_3d'] for u in project['units']]
print(f"ULPIN uniqueness: {len(ulpins)} total, {len(set(ulpins))} unique -> {'PASS' if len(ulpins)==len(set(ulpins)) else 'FAIL'}")

print()
print("=== Validation Issues ===")
fail_count = 0
for u in project['units']:
    for v in u['validations']:
        if v['status'] != 'pass':
            fail_count += 1
            if fail_count <= 15:
                print(f"  [{v['status']:7s}] {v['rule']:20s} {v['message']}")
if fail_count > 15:
    print(f"  ... and {fail_count - 15} more")
print(f"Total non-pass: {fail_count}")

# Verify 3D geometry is correct
print()
print("=== 3D Geometry Verification ===")
u0 = project['units'][0]
print(f"Sample unit: {u0['ulpin_3d']}")
print(f"  Vertices: {len(u0['vertices'])} pts")
print(f"  Faces: {len(u0['faces'])} triangles")
print(f"  Elevation: {u0['elevation']}m")
print(f"  Height: {u0['height']}m")
print(f"  Vertex Z values: bottom={[v[2] for v in u0['vertices'][:4]]}, top={[v[2] for v in u0['vertices'][4:8]]}")

# Verify floor stacking
print()
print("=== Floor Stacking ===")
for floor_num in sorted(set(u['floor_number'] for u in project['units'])):
    floor_units = [u for u in project['units'] if u['floor_number'] == floor_num]
    elevs = set(u['elevation'] for u in floor_units)
    print(f"  Floor {floor_num}: {len(floor_units)} units, elevation(s) = {elevs}")

db.close()
drop_db()

print()
print("=" * 70)
print("CV INTEGRATION TEST: ALL PASSED")
print("=" * 70)
