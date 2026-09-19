import os
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import shutil
import uuid

# Make sure the current directory is in sys.path so we can import modules properly
import sys
sys.path.insert(0, os.getcwd())

from vision.export import process_floor
from backend.app.geometry.extrusion import create_3d_model, export_model

app = FastAPI(title="3D-ULPIN AI API")

# Add CORS for the frontend (Person 2)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins for the prototype
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OUT_DIR = Path("out")
OUT_DIR.mkdir(exist_ok=True)

@app.post("/api/v1/process-floorplan")
async def process_floorplan(file: UploadFile = File(...)):
    """
    Takes a 2D floor plan image, runs the Vision Pipeline to extract rooms,
    runs the Geometry Pipeline to extrude walls, and returns a 3D .glb file.
    """
    request_id = str(uuid.uuid4())
    
    # 1. Save uploaded file temporarily with a UUID to prevent concurrency issues
    file_name_no_ext, file_ext = os.path.splitext(file.filename)
    if not file_ext:
        file_ext = ".png"
    
    unique_floor_id = f"{file_name_no_ext}_{request_id}"
    temp_img_path = OUT_DIR / f"{unique_floor_id}{file_ext}"
    
    with open(temp_img_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        # 2. Run Vision Pipeline
        # We pass file_name_no_ext as floor_id so it picks up the correct config in plan_configs.py!
        result_json = process_floor(
            image_path=temp_img_path,
            floor_id=file_name_no_ext,
            out_dir=OUT_DIR,
            use_cached=False,
            save_cache=False,
            debug=False
        )
        
        # 3. Run Geometry Pipeline
        scene = create_3d_model(result_json, wall_height=100.0)
        
        # 4. Export to .glb
        out_glb_path = OUT_DIR / f"{unique_floor_id}.glb"
        export_model(scene, out_glb_path)
        
        # 5. Return the 3D file
        return FileResponse(
            path=out_glb_path,
            media_type="model/gltf-binary",
            filename=f"{file_name_no_ext}.glb"
        )
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        # Optional: cleanup could go here, but we can leave the files in out/ for debugging the prototype
        pass

@app.get("/")
def read_root():
    return {"status": "AI Backend is running!"}
