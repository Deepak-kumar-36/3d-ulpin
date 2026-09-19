"""ML-based unit detector using ONNX semantic segmentation model.

Reuses the existing contour extraction, reading order sorting, and Shapely cleanup
from `vision.detect` so the output contract remains 100% identical.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

import cv2
import numpy as np

# Ensure root is on path
_root = Path(__file__).resolve().parents[1]
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

from ml.infer import VertaONNXPredictor
from .detect import (
    DetectConfig,
    _evaluate_unit_confidence,
    _load_gray,
    _reading_order,
    _ring_to_list,
    extract_units,
)

# Global cached predictor for lazy loading
_GLOBAL_PREDICTOR: VertaONNXPredictor | None = None


def get_predictor(model_path: str | Path | None = None) -> VertaONNXPredictor:
    global _GLOBAL_PREDICTOR
    if _GLOBAL_PREDICTOR is None:
        if model_path is None:
            model_path = os.environ.get("VERTA_MODEL", "ml/models/verta_seg.onnx")
        _GLOBAL_PREDICTOR = VertaONNXPredictor(model_path)
    return _GLOBAL_PREDICTOR


def detect_units_ml(image_path: str | Path, floor_id: str, cfg: DetectConfig | None = None) -> dict:
    """Executes ML semantic segmentation and extracts units via contour/Shapely pipeline."""
    cfg = cfg or DetectConfig()
    img_path = Path(image_path)

    # 1. Load image (bgr for inference)
    # Check if PDF
    if img_path.suffix.lower() == ".pdf":
        gray, scale_factor = _load_gray(image_path)
        bgr = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)
    else:
        bgr = cv2.imread(str(img_path))
        if bgr is None:
            raise ValueError(f"Could not load image: {image_path}")
        scale_factor = 1.0

    orig_h, orig_w = bgr.shape[:2]

    # 2. Run ONNX predictor
    predictor = get_predictor()
    probs = predictor.predict_probabilities(bgr, is_bgr=True)
    preds = np.argmax(probs, axis=-1).astype(np.uint8)

    # 3. Process masks
    # Class 1: Separator (walls + doors + windows)
    # Class 2: Room interior
    room_raw = (preds == 2).astype(np.uint8) * 255
    separator_raw = (preds == 1).astype(np.uint8) * 255

    # Clean small specks
    ko = max(3, int(min(orig_h, orig_w) * 0.005))
    if ko % 2 == 0:
        ko += 1
    room_clean = cv2.morphologyEx(room_raw, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (ko, ko)))

    # Subtract separator from room mask to ensure clean boundaries
    room_separated = cv2.bitwise_and(room_clean, cv2.bitwise_not(separator_raw))

    # 4. Free space preparation for extract_units
    # Pad to match standard floodfill boundary handling
    free = cv2.copyMakeBorder(room_separated, cfg.pad, cfg.pad, cfg.pad, cfg.pad, cv2.BORDER_CONSTANT, value=0)

    # 5. Contour & Shapely unit extraction
    polys = extract_units(free, (orig_h, orig_w), cfg)
    polys = _reading_order(polys, orig_h)

    # 6. Format JSON matching existing contract
    warnings = []
    if not polys:
        warnings.append("ML detector found 0 units in the floor plan.")
        overall_confidence = 0.0
    else:
        overall_confidence = sum(_evaluate_unit_confidence(p, orig_h, orig_w) for p in polys) / len(polys)
        if overall_confidence < 0.5:
            warnings.append("Low confidence detection in ML detector.")

    units = []
    for i, p in enumerate(polys, start=1):
        unit_conf = _evaluate_unit_confidence(p, orig_h, orig_w)
        units.append(
            {
                "id": f"{floor_id}-{i:02d}",
                "polygon": _ring_to_list(p.exterior),
                "holes": [_ring_to_list(r) for r in p.interiors],
                "area_px": round(p.area, 1),
                "centroid": [round(p.centroid.x, 1), round(p.centroid.y, 1)],
                "confidence": round(unit_conf, 2),
            }
        )

    return {
        "floor_id": floor_id,
        "image_size": [orig_w, orig_h],
        "scale_from_original": scale_factor,
        "px_per_meter": None,
        "coord_system": {"origin": "top-left", "y_axis": "down", "exterior_winding": "ccw", "closed_ring": False},
        "detector": "ml",
        "confidence": round(overall_confidence, 2),
        "warnings": warnings,
        "units": units,
        "doors": [],
    }
