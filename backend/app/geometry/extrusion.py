import json
from pathlib import Path
import trimesh
from shapely.geometry import Polygon
from shapely.ops import unary_union
import numpy as np

def load_vision_json(path: str | Path) -> dict:
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def flip_y(coords: list, image_height: float) -> list:
    """Flip Y coordinates for 3D mapping (y_3d = height - y_pixel)"""
    return [[c[0], image_height - c[1]] for c in coords]

def create_3d_model(json_data: dict, wall_height: float = 100.0, floor_thickness: float = 5.0) -> trimesh.Trimesh:
    """
    Creates a 3D model from the vision JSON.
    The vision JSON provides 'units' which are the rooms (free space).
    To create walls, we subtract all rooms from the bounding box of the image.
    """
    width, height = json_data["image_size"]
    
    # 1. Parse all room polygons
    room_polys = []
    for unit in json_data.get("units", []):
        ext_coords = flip_y(unit["polygon"], height)
        holes_coords = [flip_y(hole, height) for hole in unit.get("holes", [])]
        
        poly = Polygon(shell=ext_coords, holes=holes_coords)
        if poly.is_valid and not poly.is_empty:
            room_polys.append(poly)
            
    # Combine overlapping/touching rooms just in case
    rooms_union = unary_union(room_polys)
    
    # 2. Create Wall Polygon (Image Bounding Box - Rooms)
    # The bounding box in flipped coords is from (0,0) to (width, height)
    bbox_poly = Polygon([
        (0, 0),
        (width, 0),
        (width, height),
        (0, height)
    ])
    
    wall_poly = bbox_poly.difference(rooms_union)
    
    meshes = []
    
    # 3. Extrude Walls
    # wall_poly might be a MultiPolygon
    if wall_poly.geom_type == 'Polygon':
        wall_polys = [wall_poly]
    elif wall_poly.geom_type == 'MultiPolygon':
        wall_polys = list(wall_poly.geoms)
    else:
        wall_polys = []
        
    for p in wall_polys:
        # Extrude polygon upwards
        # trimesh.creation.extrude_polygon creates a mesh from z=0 to z=height
        mesh = trimesh.creation.extrude_polygon(p, height=wall_height)
        meshes.append(mesh)

    # 4. Create Floor Mesh (Extrude the entire bounding box downwards)
    # So the floor sits at Z=0 and goes down to Z=-floor_thickness
    floor_mesh = trimesh.creation.extrude_polygon(bbox_poly, height=floor_thickness)
    # Translate floor mesh down
    floor_mesh.apply_translation([0, 0, -floor_thickness])
    # Optionally color the floor differently
    floor_mesh.visual.face_colors = [200, 200, 200, 255] # Light grey
    
    for w in meshes:
        w.visual.face_colors = [100, 100, 100, 255] # Dark grey for walls
        
    meshes.append(floor_mesh)
    
    # Merge all meshes
    # Using concatenate ensures it acts as a single solid model, but Scene is fine too.
    # .glb export handles scenes nicely, but let's just make it a single scene
    scene = trimesh.Scene(meshes)
    
    return scene

def export_model(scene: trimesh.Scene, out_path: str | Path):
    """Exports the trimesh Scene to a file (.glb, .obj, etc)"""
    scene.export(str(out_path))
