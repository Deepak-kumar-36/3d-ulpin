"""Floor plan -> clean 2D unit polygons.

Pipeline:
    PDF Rasterization (optional) -> Resize (long side 1600px) ->
    Grayscale -> CLAHE & uneven light correction -> Auto Polarity ->
    Binarize (walls white) -> Remove thin hatched lines ->
    Auto-Tuning loop (close door gaps) -> invert (free space white) ->
    drop outside region -> contours (with holes) -> approxPolyDP -> Shapely cleanup
"""
from __future__ import annotations

import sys
from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np
from shapely.geometry import GeometryCollection, MultiPolygon, Polygon
from shapely.geometry.polygon import orient
from shapely.validation import make_valid

try:
    import pymupdf as fitz
except ImportError:
    fitz = None


@dataclass
class DetectConfig:
    # --- binarization ---
    threshold: str = "otsu"            # "otsu" or "adaptive"
    blur_ksize: int = 3
    adaptive_block_frac: float = 0.03
    adaptive_c: int = 10
    min_component_frac: float = 0.0005
    # --- morphology (fractions of min(h, w)) ---
    close_frac: float = 0.03           # Default if auto-tune is off
    open_frac: float = 0.004
    # --- filtering (fractions of total image area) ---
    min_area_frac: float = 0.002
    max_area_frac: float = 0.40
    # --- simplification ---
    approx_eps_frac: float = 0.015
    shapely_tol_frac: float = 0.002
    # --- holes ---
    keep_holes: bool = True
    min_hole_frac: float = 0.003
    # --- thin feature suppression ---
    window_close_frac: float = 0.008
    thin_line_open_frac: float = 0.004
    # --- misc ---
    pad: int = 10
    auto_tune: bool = True             # Run the parameter sweep


# --------------------------------------------------------------------------- helpers
def _odd_kernel(frac: float, ref: int, minimum: int = 3) -> int:
    k = int(round(frac * ref))
    k = max(minimum, k)
    return k if k % 2 == 1 else k + 1


def _load_gray(image_path) -> tuple[np.ndarray, float]:
    """Loads image/PDF, normalizes to 1600px long side, returns (gray_img, scale_factor)."""
    p = Path(image_path)
    if p.suffix.lower() == ".pdf":
        if fitz is None:
            raise RuntimeError("pymupdf not installed; cannot read PDF.")
        doc = fitz.open(str(p))
        if len(doc) == 0:
            raise ValueError("PDF is empty.")
        page = doc.load_page(0)
        # Render at 200 DPI roughly
        pix = page.get_pixmap(matrix=fitz.Matrix(200/72, 200/72))
        img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.h, pix.w, pix.n)
        if pix.n == 4:
            img = cv2.cvtColor(img, cv2.COLOR_RGBA2GRAY)
        elif pix.n == 3:
            img = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
        elif pix.n == 1:
            pass # already gray
        else:
            raise ValueError(f"Unexpected PDF color space: {pix.n} channels")
    else:
        img = cv2.imread(str(p), cv2.IMREAD_GRAYSCALE)
        if img is None:
            raise ValueError(f"Could not read image: {image_path}")

    # Resize so long side is 1600px
    h, w = img.shape
    max_dim = max(h, w)
    target_dim = 1600
    if max_dim != target_dim:
        scale = target_dim / max_dim
        new_w, new_h = int(w * scale), int(h * scale)
        img = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)
        return img, scale
    return img, 1.0


def _cleanup_photo(gray: np.ndarray) -> np.ndarray:
    """Fix uneven lighting and enhance contrast for phone photos."""
    # Uneven lighting correction: divide by blurred background
    blur = cv2.GaussianBlur(gray, (0, 0), 50)
    # Avoid division by zero
    blur[blur == 0] = 1
    # Normalized division
    corrected = cv2.divide(gray, blur, scale=255)
    
    # CLAHE for local contrast
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(corrected)
    return enhanced


def _detect_and_fix_polarity(gray: np.ndarray) -> np.ndarray:
    """Ensure walls are dark and background is light before binarization."""
    # Check the borders to see what the background color is
    h, w = gray.shape
    border_pixels = np.concatenate([
        gray[0, :], gray[-1, :], gray[:, 0], gray[:, -1]
    ])
    median_border = np.median(border_pixels)
    
    # If the border is mostly dark, it's a blueprint (light walls on dark bg). Invert it.
    if median_border < 127:
        return cv2.bitwise_not(gray)
    return gray


def _largest_polygon(geom) -> Polygon | None:
    if geom is None or geom.is_empty:
        return None
    if isinstance(geom, Polygon):
        return geom
    if isinstance(geom, (MultiPolygon, GeometryCollection)):
        polys = [g for g in geom.geoms if isinstance(g, Polygon) and not g.is_empty]
        return max(polys, key=lambda p: p.area) if polys else None
    return None


def clean_polygon(shell, holes, tol: float, min_area: float) -> Polygon | None:
    if len(shell) < 3:
        return None
    poly = Polygon(shell, [h for h in holes if len(h) >= 3])
    if not poly.is_valid:
        poly = make_valid(poly)
    poly = _largest_polygon(poly)
    if poly is None:
        return None
    poly = _largest_polygon(poly.simplify(tol, preserve_topology=True).buffer(0))
    if poly is None or poly.area < min_area:
        return None
    return orient(poly, sign=1.0)


def _ring_to_list(ring, nd: int = 1) -> list[list[float]]:
    return [[round(x, nd), round(y, nd)] for x, y in list(ring.coords)[:-1]]


def _approx(cnt: np.ndarray, eps_frac: float, pad: int) -> np.ndarray:
    eps = eps_frac * cv2.arcLength(cnt, True)
    pts = cv2.approxPolyDP(cnt, eps, True).reshape(-1, 2).astype(float)
    return pts - pad


# --------------------------------------------------------------------------- stages
def binarize_walls(gray: np.ndarray, cfg: DetectConfig) -> np.ndarray:
    """Walls -> 255, everything else -> 0."""
    h, w = gray.shape
    if cfg.blur_ksize > 1:
        gray = cv2.GaussianBlur(gray, (cfg.blur_ksize, cfg.blur_ksize), 0)
    if cfg.threshold == "adaptive":
        block = _odd_kernel(cfg.adaptive_block_frac, min(h, w), minimum=11)
        walls = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, block, cfg.adaptive_c
        )
    else:
        _, walls = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV | cv2.THRESH_OTSU)
    return remove_specks(walls, cfg.min_component_frac * h * w)


def remove_specks(mask: np.ndarray, min_area: float) -> np.ndarray:
    n, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    keep = np.zeros(n, np.uint8)
    keep[1:] = (stats[1:, cv2.CC_STAT_AREA] >= min_area).astype(np.uint8) * 255
    return keep[labels]


def free_space_mask(walls: np.ndarray, cfg: DetectConfig) -> tuple[np.ndarray, list[dict]]:
    h, w = walls.shape

    if cfg.window_close_frac > 0:
        kw = _odd_kernel(cfg.window_close_frac, min(h, w))
        walls = cv2.morphologyEx(walls, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_RECT, (kw, kw)))

    doors = []
    if cfg.thin_line_open_frac > 0:
        kt = _odd_kernel(cfg.thin_line_open_frac, min(h, w))
        opened = cv2.morphologyEx(walls, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (kt, kt)))
        thin_features = cv2.bitwise_xor(walls, opened)
        walls = opened
        
        min_door_area = 0.00005 * h * w
        contours, _ = cv2.findContours(thin_features, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for cnt in contours:
            if cv2.contourArea(cnt) >= min_door_area:
                x, y, bw, bh = cv2.boundingRect(cnt)
                doors.append({
                    "bbox": [x, y, x + bw, y + bh],
                    "centroid": [round(x + bw / 2.0, 1), round(y + bh / 2.0, 1)]
                })

    k = _odd_kernel(cfg.close_frac, min(h, w))
    sealed = cv2.morphologyEx(walls, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_RECT, (k, k)))
    free = cv2.bitwise_not(sealed)

    ko = _odd_kernel(cfg.open_frac, min(h, w))
    free = cv2.morphologyEx(free, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (ko, ko)))

    free = cv2.copyMakeBorder(free, cfg.pad, cfg.pad, cfg.pad, cfg.pad, cv2.BORDER_CONSTANT, value=255)
    ff_mask = np.zeros((free.shape[0] + 2, free.shape[1] + 2), np.uint8)
    cv2.floodFill(free, ff_mask, (0, 0), 0)
    return free, doors


def extract_units(free: np.ndarray, image_hw: tuple[int, int], cfg: DetectConfig) -> list[Polygon]:
    h, w = image_hw
    img_area = float(h * w)
    diag = float(np.hypot(h, w))
    tol = cfg.shapely_tol_frac * diag

    contours, hier = cv2.findContours(free, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
    if hier is None:
        return []
    hier = hier[0]

    polys: list[Polygon] = []
    for i, (_nxt, _prv, first_child, parent) in enumerate(hier):
        if parent != -1:
            continue
        area = cv2.contourArea(contours[i])
        if not (cfg.min_area_frac * img_area <= area <= cfg.max_area_frac * img_area):
            continue

        holes = []
        if cfg.keep_holes:
            c = first_child
            while c != -1:
                if cv2.contourArea(contours[c]) >= cfg.min_hole_frac * area:
                    holes.append(_approx(contours[c], cfg.approx_eps_frac, cfg.pad))
                c = hier[c][0]

        shell = _approx(contours[i], cfg.approx_eps_frac, cfg.pad)
        poly = clean_polygon(shell, holes, tol, cfg.min_area_frac * img_area)
        if poly is not None:
            polys.append(poly)
    return polys


def _reading_order(polys: list[Polygon], height: int) -> list[Polygon]:
    band = max(1.0, height / 10.0)
    return sorted(polys, key=lambda p: (int(p.centroid.y // band), p.centroid.x))


# --------------------------------------------------------------------------- auto-tuning
def _score_polys(polys: list[Polygon], h: int, w: int, cfg: DetectConfig) -> float:
    if not polys:
        return -1.0
        
    img_area = h * w
    total_area = sum(p.area for p in polys)
    
    # Calculate bounding box of all units combined
    minx = min(p.bounds[0] for p in polys)
    miny = min(p.bounds[1] for p in polys)
    maxx = max(p.bounds[2] for p in polys)
    maxy = max(p.bounds[3] for p in polys)
    bbox_area = max(1.0, (maxx - minx) * (maxy - miny))
    
    # Reward: Area coverage relative to bounding box
    coverage = total_area / bbox_area
    
    # Penalty: Massive merged blob (>40% of image area)
    max_poly_area = max(p.area for p in polys)
    merge_penalty = 0.0
    if max_poly_area > 0.40 * img_area:
        merge_penalty = 1.0  # Heavy penalty
        
    # Penalty: Too many tiny fragments (< 0.5% area)
    tiny_count = sum(1 for p in polys if p.area < 0.005 * img_area)
    fragment_penalty = tiny_count * 0.05
    
    # Penalty: Thin slivers (low solidity)
    solidity_penalty = 0.0
    for p in polys:
        if p.area / p.convex_hull.area < 0.4:
            solidity_penalty += 0.1
            
    score = coverage - merge_penalty - fragment_penalty - solidity_penalty
    return score


def _evaluate_unit_confidence(poly: Polygon, h: int, w: int, pad: int = 10) -> float:
    """Calculate 0-1 confidence for a single unit."""
    solidity = poly.area / poly.convex_hull.area
    
    # Check if touching image bounds (leak to outside)
    minx, miny, maxx, maxy = poly.bounds
    touches_border = (minx <= pad or miny <= pad or maxx >= w - pad or maxy >= h - pad)
    
    confidence = min(1.0, max(0.1, solidity))
    if touches_border:
        confidence *= 0.5  # Penalize leaks
        
    return confidence


def _detect_with_auto_tune(walls: np.ndarray, cfg: DetectConfig) -> tuple[list[Polygon], list[dict], float, float]:
    h, w = walls.shape
    best_score = -999.0
    best_polys = []
    best_doors = []
    best_close_frac = cfg.close_frac
    
    if not cfg.auto_tune:
        free, doors = free_space_mask(walls, cfg)
        polys = extract_units(free, (h, w), cfg)
        return polys, doors, cfg.close_frac, 0.8
        
    # Sweep close_frac
    for frac in np.arange(0.02, 0.11, 0.01):
        test_cfg = DetectConfig(**{**cfg.__dict__, "close_frac": frac})
        free, doors = free_space_mask(walls, test_cfg)
        polys = extract_units(free, (h, w), test_cfg)
        
        score = _score_polys(polys, h, w, test_cfg)
        if score > best_score:
            best_score = score
            best_polys = polys
            best_doors = doors
            best_close_frac = float(frac)
            
    # Calculate overall confidence
    if not best_polys:
        overall_conf = 0.0
    else:
        overall_conf = sum(_evaluate_unit_confidence(p, h, w) for p in best_polys) / len(best_polys)
        
    return best_polys, best_doors, best_close_frac, overall_conf


# --------------------------------------------------------------------------- public API
def detect_units(image_path, floor_id: str, cfg: DetectConfig | None = None) -> dict:
    cfg = cfg or DetectConfig()
    gray, scale_factor = _load_gray(image_path)
    
    # Preprocessing
    gray = _cleanup_photo(gray)
    gray = _detect_and_fix_polarity(gray)
    
    h, w = gray.shape
    walls = binarize_walls(gray, cfg)
    
    # Extract with auto-tuning
    polys, doors_raw, best_close_frac, confidence = _detect_with_auto_tune(walls, cfg)
    polys = _reading_order(polys, h)

    warnings = []
    if not polys:
        warnings.append("No units detected. The plan might be too low contrast, or walls are not solid.")
    elif len(polys) == 1 and polys[0].area > 0.4 * (h * w):
        warnings.append("Possible merged rooms. Only one massive unit was found.")
    elif confidence < 0.5:
        warnings.append("Low confidence detection. Polygons might be fragmented or leaking to the outside.")

    units = []
    for i, p in enumerate(polys, start=1):
        unit_conf = _evaluate_unit_confidence(p, h, w)
        units.append(
            {
                "id": f"{floor_id}-{i:02d}",
                "polygon": _ring_to_list(p.exterior),
                "holes": [_ring_to_list(r) for r in p.interiors],
                "area_px": round(p.area, 1),
                "centroid": [round(p.centroid.x, 1), round(p.centroid.y, 1)],
                "confidence": round(unit_conf, 2)
            }
        )

    doors = []
    for i, d in enumerate(doors_raw, start=1):
        d["id"] = f"{floor_id}-door-{i:02d}"
        doors.append(d)

    return {
        "floor_id": floor_id,
        "image_size": [w, h],
        "scale_from_original": scale_factor,
        "px_per_meter": None,
        "coord_system": {"origin": "top-left", "y_axis": "down", "exterior_winding": "ccw", "closed_ring": False},
        "auto_config": {"close_frac": round(best_close_frac, 3)},
        "confidence": round(confidence, 2),
        "warnings": warnings,
        "units": units,
        "doors": doors,
    }


def draw_overlay(image_path, result: dict) -> np.ndarray:
    gray, _ = _load_gray(image_path)
    canvas = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)
    layer = canvas.copy()
    palette = [(66, 133, 244), (52, 168, 83), (251, 188, 5), (234, 67, 53), (171, 71, 188), (0, 172, 193)]
    for i, u in enumerate(result.get("units", [])):
        color = palette[i % len(palette)]
        pts = np.array(u["polygon"], np.int32)
        cv2.fillPoly(layer, [pts], color)
        for hole in u.get("holes", []):
            cv2.fillPoly(layer, [np.array(hole, np.int32)], (255, 255, 255))
    canvas = cv2.addWeighted(layer, 0.35, canvas, 0.65, 0)
    for i, u in enumerate(result.get("units", [])):
        color = palette[i % len(palette)]
        cv2.polylines(canvas, [np.array(u["polygon"], np.int32)], True, color, 2)
        cx, cy = map(int, u["centroid"])
        cv2.putText(canvas, u["id"], (cx - 30, cy), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1, cv2.LINE_AA)
        
        # Display warning if low confidence
        if u.get("confidence", 1.0) < 0.5:
            cv2.putText(canvas, "!", (cx + 20, cy), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)
    return canvas
