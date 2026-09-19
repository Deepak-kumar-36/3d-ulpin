"""
Comprehensive test suite for the 3D ULPIN backend.

Tests cover:
  - Polygon validity and area
  - Containment checks
  - Overlap detection
  - Unassigned area
  - Duplicate detection
  - 3D extrusion (including negative Z for basements)
  - ULPIN identifier uniqueness and determinism
  - Project creation and retrieval
  - Validation API
  - Health endpoint
  - Full pipeline (end-to-end)
"""
import sys
import os
import json
import pytest

# Ensure the backend package is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from shapely.geometry import Polygon

from app.geometry.extrusion import extrude_polygon, compute_elevation, polygon_area
from app.geometry.ulpin import generate_ulpin, reset_counters
from app.validation.engine import (
    check_geometry_validity, check_overlaps, check_containment,
    check_unassigned_area, check_duplicates, validate_floor,
    summarize_validation,
)
from app.fallback_data import get_fallback_project
from app.storage.database import init_db, drop_db, engine, SessionLocal, Base
from app.services import create_project, ingest_units, run_validation, get_full_project, run_fallback_pipeline


# ── Fixtures ───────────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def clean_db():
    """Create a fresh DB for each test."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def _rect(x1, y1, x2, y2):
    return [[x1, y1], [x2, y1], [x2, y2], [x1, y2], [x1, y1]]


# ═══════════════════════════════════════════════════════════════════════════════
# 1. POLYGON VALIDITY & AREA
# ═══════════════════════════════════════════════════════════════════════════════

class TestPolygonArea:
    def test_rectangle_area(self):
        coords = _rect(0, 0, 10, 5)
        assert polygon_area(coords) == pytest.approx(50.0)

    def test_square_area(self):
        coords = _rect(0, 0, 7, 7)
        assert polygon_area(coords) == pytest.approx(49.0)

    def test_triangle_area(self):
        coords = [[0, 0], [10, 0], [5, 8], [0, 0]]
        assert polygon_area(coords) == pytest.approx(40.0)


class TestGeometryValidity:
    def test_valid_polygon(self):
        poly = Polygon(_rect(0, 0, 5, 5))
        results = check_geometry_validity("U1", poly)
        assert len(results) == 1
        assert results[0]["status"] == "pass"

    def test_invalid_polygon_bowtie(self):
        # Self-intersecting bowtie
        poly = Polygon([(0, 0), (10, 10), (10, 0), (0, 10), (0, 0)])
        results = check_geometry_validity("U1", poly)
        assert results[0]["status"] == "fail"
        assert "geometry_validity" in results[0]["rule"]


# ═══════════════════════════════════════════════════════════════════════════════
# 2. CONTAINMENT
# ═══════════════════════════════════════════════════════════════════════════════

class TestContainment:
    def test_unit_inside_footprint(self):
        footprint = Polygon(_rect(0, 0, 30, 20))
        unit = Polygon(_rect(2, 2, 10, 8))
        results = check_containment("U1", unit, footprint)
        assert results[0]["status"] == "pass"

    def test_unit_outside_footprint(self):
        footprint = Polygon(_rect(0, 0, 30, 20))
        unit = Polygon(_rect(25, 15, 35, 25))  # extends past boundary
        results = check_containment("U1", unit, footprint)
        assert results[0]["status"] == "fail"
        assert "extends outside" in results[0]["message"]


# ═══════════════════════════════════════════════════════════════════════════════
# 3. OVERLAP DETECTION
# ═══════════════════════════════════════════════════════════════════════════════

class TestOverlap:
    def test_no_overlap(self):
        u1 = ("U1", Polygon(_rect(0, 0, 5, 5)))
        u2 = ("U2", Polygon(_rect(5, 0, 10, 5)))
        results = check_overlaps([u1, u2])
        assert len(results) == 0

    def test_overlap_detected(self):
        u1 = ("U1", Polygon(_rect(0, 0, 6, 5)))
        u2 = ("U2", Polygon(_rect(4, 0, 10, 5)))  # overlaps by 2×5=10 m²
        results = check_overlaps([u1, u2])
        assert len(results) == 2  # one result per unit
        assert all(r["status"] == "fail" for r in results)
        assert "10.00" in results[0]["message"]


# ═══════════════════════════════════════════════════════════════════════════════
# 4. UNASSIGNED AREA
# ═══════════════════════════════════════════════════════════════════════════════

class TestUnassignedArea:
    def test_full_coverage(self):
        footprint = Polygon(_rect(0, 0, 10, 10))
        units = [Polygon(_rect(0, 0, 10, 10))]
        results = check_unassigned_area("F1", footprint, units)
        assert results[0]["status"] == "pass"

    def test_large_gap_warned(self):
        footprint = Polygon(_rect(0, 0, 10, 10))  # area = 100
        units = [Polygon(_rect(0, 0, 5, 5))]       # area = 25 → 75% unassigned
        results = check_unassigned_area("F1", footprint, units)
        assert results[0]["status"] == "warning"
        assert "unassigned area" in results[0]["message"]


# ═══════════════════════════════════════════════════════════════════════════════
# 5. DUPLICATE DETECTION
# ═══════════════════════════════════════════════════════════════════════════════

class TestDuplicates:
    def test_no_duplicates(self):
        u1 = ("U1", Polygon(_rect(0, 0, 5, 5)))
        u2 = ("U2", Polygon(_rect(10, 10, 15, 15)))
        results = check_duplicates([u1, u2])
        assert len(results) == 0

    def test_duplicate_detected(self):
        poly = Polygon(_rect(0, 0, 5, 5))
        u1 = ("U1", poly)
        u2 = ("U2", poly)  # exact duplicate
        results = check_duplicates([u1, u2])
        assert len(results) == 2
        assert all(r["status"] == "warning" for r in results)


# ═══════════════════════════════════════════════════════════════════════════════
# 6. EXTRUSION
# ═══════════════════════════════════════════════════════════════════════════════

class TestExtrusion:
    def test_basic_extrusion(self):
        coords = _rect(0, 0, 10, 5)
        vertices, faces = extrude_polygon(coords, base_z=0.0, height=3.0)
        # 5 coords (closed ring), deduplicated to 4
        assert len(vertices) == 8  # 4 bottom + 4 top
        assert all(v[2] == 0.0 for v in vertices[:4])  # bottom z
        assert all(v[2] == 3.0 for v in vertices[4:])  # top z
        assert len(faces) > 0

    def test_basement_negative_z(self):
        coords = _rect(0, 0, 10, 5)
        vertices, faces = extrude_polygon(coords, base_z=-3.0, height=3.0)
        assert all(v[2] == -3.0 for v in vertices[:4])
        assert all(v[2] == 0.0 for v in vertices[4:])

    def test_upper_floor_elevation(self):
        coords = _rect(0, 0, 5, 5)
        vertices, faces = extrude_polygon(coords, base_z=6.0, height=3.0)
        assert all(v[2] == 6.0 for v in vertices[:4])
        assert all(v[2] == 9.0 for v in vertices[4:])


class TestComputeElevation:
    def test_ground_floor(self):
        assert compute_elevation(0, 3.0) == 0.0

    def test_floor_1(self):
        assert compute_elevation(1, 3.0) == 3.0

    def test_floor_2(self):
        assert compute_elevation(2, 3.0) == 6.0

    def test_basement_1(self):
        assert compute_elevation(-1, 3.0) == -3.0

    def test_basement_2(self):
        assert compute_elevation(-2, 3.0) == -6.0


# ═══════════════════════════════════════════════════════════════════════════════
# 7. ULPIN IDENTIFIER
# ═══════════════════════════════════════════════════════════════════════════════

class TestULPIN:
    def test_format(self):
        ulpin = generate_ulpin("PARCEL-001", 1, 2, 3)
        assert ulpin == "PARCEL-001-B01-F02-U03"

    def test_ground_floor_label(self):
        ulpin = generate_ulpin("PARCEL-001", 1, 0, 1)
        assert "-GF-" in ulpin

    def test_basement_label(self):
        ulpin = generate_ulpin("PARCEL-001", 1, -1, 1)
        assert "-BF01-" in ulpin

    def test_determinism(self):
        """Same inputs always produce the same ULPIN."""
        a = generate_ulpin("PARCEL-001", 1, 1, 5)
        b = generate_ulpin("PARCEL-001", 1, 1, 5)
        assert a == b

    def test_uniqueness_across_floors(self):
        ids = set()
        for floor in range(-1, 3):
            for unit in range(1, 6):
                ids.add(generate_ulpin("PARCEL-001", 1, floor, unit))
        assert len(ids) == 4 * 5  # 4 floors × 5 units = 20 unique IDs


# ═══════════════════════════════════════════════════════════════════════════════
# 8. PROJECT CRUD (SERVICE LAYER)
# ═══════════════════════════════════════════════════════════════════════════════

class TestProjectCrud:
    def test_create_project(self, db):
        pid = create_project(db, "Test", "PARCEL-001", 3, 3.0, 1)
        assert pid is not None
        assert len(pid) == 36  # UUID

    def test_get_project(self, db):
        pid = create_project(db, "Test", "PARCEL-001", 3, 3.0, 1)
        result = get_full_project(db, pid)
        assert result is not None
        assert result["name"] == "Test"
        assert result["parcel"]["id"] == "PARCEL-001"
        assert result["building"]["floor_count"] == 3

    def test_get_nonexistent_project(self, db):
        result = get_full_project(db, "nonexistent-id")
        assert result is None


# ═══════════════════════════════════════════════════════════════════════════════
# 9. UNIT INGESTION & RETRIEVAL
# ═══════════════════════════════════════════════════════════════════════════════

class TestUnitIngestion:
    def test_ingest_and_retrieve(self, db):
        pid = create_project(db, "Test", "PARCEL-001", 2, 3.0, 0)
        units = [
            {"polygon": _rect(0, 0, 10, 5), "floor_number": 0, "unit_type": "office"},
            {"polygon": _rect(0, 0, 10, 5), "floor_number": 1, "unit_type": "residential"},
        ]
        ids = ingest_units(db, pid, units)
        assert len(ids) == 2

        result = get_full_project(db, pid)
        assert len(result["units"]) == 2
        # Check one has ground elevation, one has floor 1
        elevations = sorted(u["elevation"] for u in result["units"])
        assert elevations == [0.0, 3.0]


# ═══════════════════════════════════════════════════════════════════════════════
# 10. VALIDATION API (SERVICE LAYER)
# ═══════════════════════════════════════════════════════════════════════════════

class TestValidationService:
    def test_validation_detects_overlap(self, db):
        pid = create_project(db, "Overlap Test", "PARCEL-001", 1, 3.0, 0)
        units = [
            {"polygon": _rect(0, 0, 6, 5), "floor_number": 0, "unit_type": "a"},
            {"polygon": _rect(4, 0, 10, 5), "floor_number": 0, "unit_type": "b"},
        ]
        ingest_units(db, pid, units)
        results = run_validation(db, pid)
        overlap_results = [r for r in results if r["rule"] == "overlap"]
        assert len(overlap_results) > 0


# ═══════════════════════════════════════════════════════════════════════════════
# 11. HEALTH ENDPOINT
# ═══════════════════════════════════════════════════════════════════════════════

class TestHealthEndpoint:
    def test_health(self):
        from fastapi.testclient import TestClient
        from app.main import app
        client = TestClient(app)
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"


# ═══════════════════════════════════════════════════════════════════════════════
# 12. FULL PIPELINE (END-TO-END)
# ═══════════════════════════════════════════════════════════════════════════════

class TestFullPipeline:
    def test_fallback_pipeline(self, db):
        """Run the complete pipeline on synthetic data."""
        result = run_fallback_pipeline(db)

        assert result is not None
        assert result["name"] == "Greenfield Residences"
        assert result["parcel"]["id"] == "PARCEL-001"
        assert result["building"]["floor_count"] == 3
        assert result["building"]["basement_count"] == 1

        # Should have 4 floors (basement + ground + 2 upper)
        assert len(result["floors"]) == 4

        # Total units: 5+5+5+6 = 21
        assert len(result["units"]) == 21

        # All units should have vertices and faces
        for u in result["units"]:
            assert len(u["vertices"]) > 0
            assert len(u["faces"]) > 0
            assert u["ulpin_3d"] is not None
            assert u["area"] > 0

        # Basement units should have negative elevation
        basement_units = [u for u in result["units"] if u["elevation"] < 0]
        assert len(basement_units) == 5

        # Validation should have found the intentional overlap on floor 2
        overlap_validations = [
            v for u in result["units"]
            for v in u["validations"]
            if v["rule"] == "overlap"
        ]
        assert len(overlap_validations) > 0

        # All ULPINs should be unique
        ulpins = [u["ulpin_3d"] for u in result["units"]]
        assert len(ulpins) == len(set(ulpins))

        # Validation summary should exist
        assert result["validation_summary"]["total_checks"] > 0

    def test_frontend_json_structure(self, db):
        """Verify the response contains all fields the frontend needs."""
        result = run_fallback_pipeline(db)

        # Top-level keys
        assert "id" in result
        assert "name" in result
        assert "parcel" in result
        assert "building" in result
        assert "floors" in result
        assert "units" in result
        assert "validation_summary" in result

        # Unit structure
        u = result["units"][0]
        required_keys = {
            "id", "ulpin_3d", "floor_id", "floor_number",
            "polygon_2d", "vertices", "faces",
            "area", "elevation", "height", "unit_type", "validations",
        }
        assert required_keys.issubset(set(u.keys()))


# ═══════════════════════════════════════════════════════════════════════════════
# 13. FALLBACK DATA ENDPOINT
# ═══════════════════════════════════════════════════════════════════════════════

class TestFallbackEndpoint:
    def test_fallback_run(self):
        from fastapi.testclient import TestClient
        from app.main import app
        client = TestClient(app)
        resp = client.post("/fallback/run")
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Greenfield Residences"
        assert len(data["units"]) == 21


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
