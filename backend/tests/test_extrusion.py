import json
import sys
import os
sys.path.insert(0, os.getcwd())
import os

from pathlib import Path
import pytest
import trimesh
from backend.app.geometry.extrusion import load_vision_json, create_3d_model, export_model

@pytest.fixture
def sample_json_data():
    return {
      "floor_id": "test_floor",
      "image_size": [100, 100],
      "units": [
        {
          "id": "room_1",
          "polygon": [
            [10, 10],
            [90, 10],
            [90, 90],
            [10, 90]
          ],
          "holes": []
        }
      ]
    }

def test_load_vision_json(tmp_path, sample_json_data):
    json_path = tmp_path / "test.json"
    with open(json_path, "w") as f:
        json.dump(sample_json_data, f)
        
    loaded = load_vision_json(json_path)
    assert loaded["floor_id"] == "test_floor"

def test_create_3d_model(sample_json_data):
    scene = create_3d_model(sample_json_data, wall_height=50.0, floor_thickness=2.0)
    
    assert isinstance(scene, trimesh.Scene)
    assert len(scene.geometry) > 0
    
    # We expect at least one mesh for the wall and one for the floor
    assert len(scene.geometry) >= 2

def test_export_model(tmp_path, sample_json_data):
    scene = create_3d_model(sample_json_data)
    out_path = tmp_path / "out.glb"
    
    export_model(scene, out_path)
    assert out_path.exists()
    assert out_path.stat().st_size > 0
