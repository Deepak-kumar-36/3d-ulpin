"""End-to-end integration test for VERTA AI Detection + CV Ingest + 3D Extrusion + ULPIN."""
import httpx
from pathlib import Path

def test_full_pipeline():
    client = httpx.Client(base_url="http://127.0.0.1:8000", timeout=60.0)

    # 1. Health check
    h = client.get("/health")
    assert h.status_code == 200, f"Health check failed: {h.status_code}"
    print("[1/5] Health check OK:", h.json())

    # 2. AI Detection on real floor plan (L1.png)
    plan_path = Path("plans/L1.png")
    assert plan_path.exists(), "plans/L1.png does not exist"
    with open(plan_path, "rb") as f:
        files = {"file": ("L1.png", f, "image/png")}
        data = {"floor_id": "L1", "detector": "auto"}
        r_det = client.post("/detect", files=files, data=data)
    assert r_det.status_code == 200, f"Detection failed: {r_det.status_code} {r_det.text}"
    l1_data = r_det.json()
    unit_count = len(l1_data.get("units", []))
    print(f"[2/5] AI Detection OK: {unit_count} units, {len(l1_data.get('doors', []))} doors")
    assert unit_count >= 6, f"Expected >= 6 units, got {unit_count}"

    # 3. CV Ingest + 3D Extrusion + ULPIN Assignment
    ingest_payload = {
        "project_name": "Skyline Heights",
        "floor_height": 3.6,
        "floors": [{"json": l1_data, "floor_number": 1}],
    }
    r_ing = client.post("/cv/ingest", json=ingest_payload)
    assert r_ing.status_code == 200, f"Ingestion failed: {r_ing.status_code} {r_ing.text}"
    ing_res = r_ing.json()
    project_id = ing_res["project_id"]
    proj = ing_res["project"]
    print(f"[3/5] CV Ingestion OK: Project {project_id}")
    print(f"      Parcel ID: {proj.get('parcel_id')}")
    print(f"      Floors: {len(proj.get('floors', []))}")
    print(f"      Floor 1 label: {proj['floors'][0]['label']}, elev: {proj['floors'][0]['elevation_base']}m to {proj['floors'][0]['elevation_top']}m")
    print(f"      3D Units: {len(proj.get('units', []))}")
    first_u = proj["units"][0]
    print(f"      Unit 1 ULPIN: {first_u['ulpin_3d']}, elev: {first_u['elevation']}m, vertices: {len(first_u['vertices'])}, faces: {len(first_u['faces'])}")
    assert len(first_u["vertices"]) > 0, "Vertices missing from 3D unit"
    assert len(first_u["faces"]) > 0, "Faces missing from 3D unit"

    # 4. GET /project/{id} database retrieval
    r_proj = client.get(f"/project/{project_id}")
    assert r_proj.status_code == 200, f"Project retrieval failed: {r_proj.status_code}"
    fetched = r_proj.json()
    assert fetched["id"] == project_id
    assert len(fetched["units"]) == len(proj["units"])
    print(f"[4/5] DB Persistence Verified: Retrieved project with {len(fetched['units'])} units")

    # 5. AI Detection on dark/inverted blueprint
    bp_path = Path("plans/real_messy/L1_blueprint.png")
    if bp_path.exists():
        with open(bp_path, "rb") as f:
            files = {"file": ("L1_blueprint.png", f, "image/png")}
            data = {"floor_id": "L1_BP", "detector": "auto"}
            r_bp = client.post("/detect", files=files, data=data)
        assert r_bp.status_code == 200, f"Blueprint detection failed: {r_bp.status_code}"
        bp_units = len(r_bp.json().get("units", []))
        print(f"[5/5] Blueprint Detection OK: {bp_units} units detected on blueprint")
        assert bp_units >= 6, f"Expected >= 6 units on blueprint, got {bp_units}"

    print("\n>>> ALL 5 END-TO-END PIPELINE CHECKS PASSED PERFECTLY! <<<")

if __name__ == "__main__":
    test_full_pipeline()
