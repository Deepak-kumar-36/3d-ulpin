"""JSON export, precomputed-fallback cache, and stub generation for the Person 2 handoff."""
from __future__ import annotations

import json
import os
import sys
from dataclasses import fields, replace
from pathlib import Path

import cv2

from .detect import DetectConfig, detect_units, draw_overlay
from .plan_configs import PLAN_CONFIGS


def save_json(result: dict, path: str | Path) -> Path:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(result, indent=2))
    return path


def load_json(path: str | Path) -> dict:
    return json.loads(Path(path).read_text())


def cached_flag() -> bool:
    """USE_CACHED=1 in the environment forces cached results (demo-day safety switch)."""
    return os.environ.get("USE_CACHED", "0").strip().lower() in ("1", "true", "yes")


def process_floor(
    image_path: str | Path,
    floor_id: str | None = None,
    out_dir: str | Path = "out",
    cache_dir: str | Path = "cache",
    cfg: DetectConfig | None = None,
    use_cached: bool | None = None,
    save_cache: bool = False,
    debug: bool = False,
    detector: str | None = None,
) -> dict:
    """Detect one floor and write out/<floor_id>.json.

    Order of preference:
      1. USE_CACHED / use_cached  -> load cache/<floor_id>.json (if it exists)
      2. live detection (using specified detector: classic, ml, or auto)
      3. if live detection raises or finds zero units -> fall back to the cache
    The chosen path is recorded in result["source"] so you can see it in logs.
    """
    image_path = Path(image_path)
    floor_id = floor_id or image_path.stem
    out_dir, cache_dir = Path(out_dir), Path(cache_dir)
    cache_path = cache_dir / f"{floor_id}.json"
    use_cached = cached_flag() if use_cached is None else use_cached

    # Detector selection: CLI arg -> env var -> "classic" default
    det = (detector or os.environ.get("VERTA_DETECTOR", "classic")).strip().lower()

    # Apply per-plan config overrides (plan_configs.py), then CLI overrides on top
    base_cfg = cfg or DetectConfig()
    if floor_id in PLAN_CONFIGS:
        overrides = PLAN_CONFIGS[floor_id]
        valid_fields = {f.name for f in fields(DetectConfig)}
        safe = {k: v for k, v in overrides.items() if k in valid_fields}
        # If user hardcoded close_frac, trust them over auto-tuning
        if "close_frac" in safe and "auto_tune" not in safe:
            safe["auto_tune"] = False
        base_cfg = replace(base_cfg, **safe)
    cfg = base_cfg

    if use_cached and cache_path.exists():
        result = load_json(cache_path)
        result["source"] = "cache"
    else:
        try:
            if det == "ml":
                from .ml_detector import detect_units_ml
                result = detect_units_ml(image_path, floor_id, cfg)
            elif det == "auto":
                # Auto: Try ML first, fall back to classical if fails or finds 0 units
                ml_res = None
                try:
                    from .ml_detector import detect_units_ml
                    ml_res = detect_units_ml(image_path, floor_id, cfg)
                except Exception as ml_err:
                    print(f"[vision] Auto-detector ML pass failed ({ml_err}); falling back to classic", file=sys.stderr)

                classic_res = detect_units(image_path, floor_id, cfg)
                classic_res["detector"] = "classic"

                if ml_res is not None and len(ml_res.get("units", [])) > 0:
                    ml_conf = ml_res.get("confidence", 0.0)
                    cl_conf = classic_res.get("confidence", 0.0)
                    # If ML has reasonable confidence, use it or higher confidence
                    if ml_conf >= 0.4 and (ml_conf >= cl_conf or len(classic_res.get("units", [])) == 0):
                        result = ml_res
                    else:
                        result = classic_res
                else:
                    result = classic_res
            else:
                result = detect_units(image_path, floor_id, cfg)
                result["detector"] = "classic"

            result["source"] = "live"

            # Check for zero units fallback to cache
            if len(result.get("units", [])) == 0 and cache_path.exists():
                print(f"[vision] live detection found 0 units for {floor_id}; using cache", file=sys.stderr)
                result = load_json(cache_path)
                result["source"] = "cache-fallback"

        except Exception as exc:  # noqa: BLE001 - we genuinely want any failure to fall back
            if not cache_path.exists():
                raise
            print(f"[vision] live detection failed for {floor_id} ({exc}); using cache", file=sys.stderr)
            result = load_json(cache_path)
            result["source"] = "cache-fallback"

    result.setdefault("detector", det if det in ("classic", "ml", "auto") else "classic")
    result.setdefault("confidence", 0.8)

    save_json(result, out_dir / f"{floor_id}.json")
    if save_cache and result["source"] == "live":
        save_json({k: v for k, v in result.items() if k != "source"}, cache_path)
    if debug and result["source"] == "live":
        overlay = draw_overlay(image_path, result)
        (out_dir / "debug").mkdir(parents=True, exist_ok=True)
        cv2.imwrite(str(out_dir / "debug" / f"{floor_id}_overlay.png"), overlay)
    return result


def make_stub(floor_id: str, size: tuple[int, int] = (1600, 1200), grid: tuple[int, int] = (2, 2)) -> dict:
    """Dummy floor in the real format so Person 2 can build against it from hour 1."""
    w, h = size
    cols, rows = grid
    margin = 100
    cw, ch = (w - 2 * margin) / cols, (h - 2 * margin) / rows
    units, n = [], 1
    for r in range(rows):
        for c in range(cols):
            x0, y0 = margin + c * cw + 8, margin + r * ch + 8
            x1, y1 = margin + (c + 1) * cw - 8, margin + (r + 1) * ch - 8
            units.append(
                {
                    "id": f"{floor_id}-{n:02d}",
                    "polygon": [[x0, y0], [x1, y0], [x1, y1], [x0, y1]],  # CCW in numeric coords
                    "holes": [],
                    "area_px": round((x1 - x0) * (y1 - y0), 1),
                    "centroid": [round((x0 + x1) / 2, 1), round((y0 + y1) / 2, 1)],
                }
            )
            n += 1
    return {
        "floor_id": floor_id,
        "image_size": [w, h],
        "px_per_meter": None,
        "coord_system": {"origin": "top-left", "y_axis": "down", "exterior_winding": "ccw", "closed_ring": False},
        "units": units,
        "source": "stub",
    }
