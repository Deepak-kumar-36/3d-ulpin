"""
VERTA Backend — FastAPI app exposing the vision pipeline as a JSON API.

Start from the project root:
    python -m uvicorn backend.app.main:app --reload --port 8000
"""
import os
import sys
import shutil
import uuid
import asyncio
from pathlib import Path
from functools import partial

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

# ── Make sure the project root is on sys.path (Python 3.13 blocks CWD) ──
_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if _root not in sys.path:
    sys.path.insert(0, _root)

from vision.export import process_floor  # noqa: E402

app = FastAPI(
    title="VERTA — 3D ULPIN Backend",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OUT_DIR = Path("out")
OUT_DIR.mkdir(exist_ok=True)

ALLOWED_CONTENT_TYPES = {"image/png", "image/jpeg", "image/jpg", "application/pdf"}
MAX_UPLOAD_BYTES = 50 * 1024 * 1024  # 50 MB


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/detect")
async def detect(
    file: UploadFile = File(...),
    floor_id: str = Form(default=""),
):
    """
    Accept a floor-plan image, run the vision pipeline, return the floor JSON.

    The JSON matches the vision contract:
      { floor_id, image_size, px_per_meter, coord_system, units, doors, source }

    Errors:
      400 — bad file (wrong type, too large, unreadable)
      422 — detection ran but found zero units
      500 — unexpected
    """
    # ── Validate content type ──
    ct = (file.content_type or "").lower()
    if ct not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ct}'. Upload a PNG, JPEG, or PDF.",
        )

    # ── Validate size ──
    contents = await file.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="File too large (max 50 MB).")
    if len(contents) < 100:
        raise HTTPException(status_code=400, detail="File is too small or empty.")

    # ── Derive floor_id ──
    if not floor_id:
        name_no_ext = Path(file.filename or "upload").stem
        floor_id = name_no_ext

    # ── Save to temp file ──
    ext = Path(file.filename or "upload.png").suffix or ".png"
    request_id = uuid.uuid4().hex[:8]
    temp_path = OUT_DIR / f"_upload_{request_id}{ext}"
    temp_path.write_bytes(contents)

    # ── Run vision in a thread so we don't block the event loop ──
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
            ),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Detection failed: {e}")
    finally:
        # Clean up temp file
        if temp_path.exists():
            temp_path.unlink(missing_ok=True)

    # ── Check for zero units ──
    if not result.get("units"):
        raise HTTPException(
            status_code=422,
            detail="No units detected. Try a clearer, higher-contrast plan with dark walls on a white background.",
        )

    return JSONResponse(content=result)


# ── Keep the old endpoint for backward compat (returns .glb) ──
# Only import geometry if it's available
try:
    from backend.app.geometry.extrusion import create_3d_model, export_model  # noqa: E402

    from fastapi.responses import FileResponse  # noqa: E402

    @app.post("/api/v1/process-floorplan")
    async def process_floorplan(file: UploadFile = File(...)):
        """Legacy endpoint: returns a .glb binary file."""
        request_id = str(uuid.uuid4())
        file_name_no_ext = Path(file.filename or "upload").stem
        ext = Path(file.filename or "upload.png").suffix or ".png"

        temp_path = OUT_DIR / f"{file_name_no_ext}_{request_id}{ext}"
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        try:
            result_json = process_floor(
                image_path=temp_path,
                floor_id=file_name_no_ext,
                out_dir=OUT_DIR,
                use_cached=False,
                save_cache=False,
                debug=False,
            )
            scene = create_3d_model(result_json, wall_height=100.0)
            out_glb_path = OUT_DIR / f"{file_name_no_ext}_{request_id}.glb"
            export_model(scene, out_glb_path)
            return FileResponse(
                path=out_glb_path,
                media_type="model/gltf-binary",
                filename=f"{file_name_no_ext}.glb",
            )
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

except ImportError:
    pass  # geometry module not installed, skip legacy endpoint


@app.get("/")
def root():
    return {"status": "VERTA backend running", "endpoints": ["/detect", "/health"]}
