"""Floor plan -> clean 2D unit polygons.

Pipeline:
    grayscale -> binarize (walls white) -> close door gaps -> invert (free space white)
    -> drop outside region -> contours (with holes) -> approxPolyDP -> Shapely cleanup

All size thresholds are FRACTIONS of the image, so one config works across plans of
different resolutions. Tune per-plan by overriding fields on DetectConfig.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np
from shapely.geometry import GeometryCollection, MultiPolygon, Polygon
from shapely.geometry.polygon import orient
from shapely.validation import make_valid


@dataclass
class DetectConfig:
    # --- binarization ---
    threshold: str = "otsu"            # "otsu" or "adaptive" (use adaptive for uneven scans)
    blur_ksize: int = 3
    adaptive_block_frac: float = 0.03  # adaptive block size, fraction of min(h, w)
    adaptive_c: int = 10
    min_component_frac: float = 0.0005  # drop wall-mask specks (text, symbols) below this fraction of image area
    # --- morphology (fractions of min(h, w)) ---
    close_frac: float = 0.03           # MAIN KNOB: must exceed door-gap width to seal it
    open_frac: float = 0.004           # removes thin slivers / text remnants in free space
    # --- filtering (fractions of total image area) ---
    min_area_frac: float = 0.002
    max_area_frac: float = 0.35
    # --- simplification ---
    approx_eps_frac: float = 0.015     # approxPolyDP epsilon, fraction of contour perimeter
    shapely_tol_frac: float = 0.002    # Shapely simplify tolerance, fraction of image diagonal
    # --- holes (columns, shafts) ---
    keep_holes: bool = True
    min_hole_frac: float = 0.003       # hole must be >= this fraction of its unit's area
    # --- thin feature suppression (door leaves, swing arcs, dimension lines) ---
    window_close_frac: float = 0.008   # fuses multi-line windows before thin-line stripping
    thin_line_open_frac: float = 0.004 # strips door leaves, swing arcs, and dimension marks (<~5px)
    # --- misc ---
    pad: int = 10                      # white margin so the outside is one connected region


# --------------------------------------------------------------------------- helpers
def _odd_kernel(frac: float, ref: int, minimum: int = 3) -> int:
    k = int(round(frac * ref))
    k = max(minimum, k)
    return k if k % 2 == 1 else k + 1


def _load_gray(image) -> np.ndarray:
    if isinstance(image, (str, Path)):
        img = cv2.imread(str(image), cv2.IMREAD_GRAYSCALE)
        if img is None:
            raise FileNotFoundError(f"Could not read image: {image}")
        return img
    img = np.asarray(image)
    return cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if img.ndim == 3 else img


def _largest_polygon(geom) -> Polygon | None:
    """Pull the largest Polygon out of whatever make_valid / buffer returned."""
    if geom is None or geom.is_empty:
        return None
    if isinstance(geom, Polygon):
        return geom
    if isinstance(geom, (MultiPolygon, GeometryCollection)):
        polys = [g for g in geom.geoms if isinstance(g, Polygon) and not g.is_empty]
        return max(polys, key=lambda p: p.area) if polys else None
    return None


def clean_polygon(shell, holes, tol: float, min_area: float) -> Polygon | None:
    """Guarantee valid, simplified, consistently-oriented geometry for Person 2."""
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
    return orient(poly, sign=1.0)  # exterior CCW, holes CW (in the coordinates as given)


def _ring_to_list(ring, nd: int = 1) -> list[list[float]]:
    """Open ring (no repeated first point), rounded."""
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
    """Drop small connected components (text glyphs, tiny symbols) BEFORE the close step,
    otherwise closing fuses letters into solid blobs that show up as false holes."""
    n, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    keep = np.zeros(n, np.uint8)
    keep[1:] = (stats[1:, cv2.CC_STAT_AREA] >= min_area).astype(np.uint8) * 255
    return keep[labels]


def free_space_mask(walls: np.ndarray, cfg: DetectConfig) -> np.ndarray:
    """Seal gaps in walls, invert to free space, remove the outside region."""
    h, w = walls.shape

    # Pre-clean walls: fuse window multi-lines, then strip thin lines (door leaves, arcs)
    if cfg.window_close_frac > 0:
        kw = _odd_kernel(cfg.window_close_frac, min(h, w))
        walls = cv2.morphologyEx(walls, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_RECT, (kw, kw)))

    if cfg.thin_line_open_frac > 0:
        kt = _odd_kernel(cfg.thin_line_open_frac, min(h, w))
        walls = cv2.morphologyEx(walls, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (kt, kt)))

    k = _odd_kernel(cfg.close_frac, min(h, w))
    sealed = cv2.morphologyEx(walls, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_RECT, (k, k)))
    free = cv2.bitwise_not(sealed)

    ko = _odd_kernel(cfg.open_frac, min(h, w))
    free = cv2.morphologyEx(free, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (ko, ko)))

    # Pad with free space, then flood-fill from the corner: everything connected to the
    # outside becomes 0. Enclosed units survive.
    free = cv2.copyMakeBorder(free, cfg.pad, cfg.pad, cfg.pad, cfg.pad, cv2.BORDER_CONSTANT, value=255)
    ff_mask = np.zeros((free.shape[0] + 2, free.shape[1] + 2), np.uint8)
    cv2.floodFill(free, ff_mask, (0, 0), 0)
    return free


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
        if parent != -1:  # this is a hole; handled via its parent
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
    band = max(1.0, height / 10.0)  # units in the same horizontal band sort left-to-right
    return sorted(polys, key=lambda p: (int(p.centroid.y // band), p.centroid.x))


# --------------------------------------------------------------------------- public API
def detect_units(image, floor_id: str, cfg: DetectConfig | None = None) -> dict:
    """Run the full pipeline. Returns the JSON-serialisable handoff dict for Person 2."""
    cfg = cfg or DetectConfig()
    gray = _load_gray(image)
    h, w = gray.shape

    walls = binarize_walls(gray, cfg)
    free = free_space_mask(walls, cfg)
    polys = _reading_order(extract_units(free, (h, w), cfg), h)

    units = []
    for i, p in enumerate(polys, start=1):
        units.append(
            {
                "id": f"{floor_id}-{i:02d}",
                "polygon": _ring_to_list(p.exterior),
                "holes": [_ring_to_list(r) for r in p.interiors],
                "area_px": round(p.area, 1),
                "centroid": [round(p.centroid.x, 1), round(p.centroid.y, 1)],
            }
        )

    return {
        "floor_id": floor_id,
        "image_size": [w, h],
        "px_per_meter": None,  # fill in once you know the plan scale
        "coord_system": {"origin": "top-left", "y_axis": "down", "exterior_winding": "ccw", "closed_ring": False},
        "units": units,
    }


def draw_overlay(image, result: dict) -> np.ndarray:
    """Debug picture: polygons + ids on the original plan. Great for tuning and for the demo."""
    gray = _load_gray(image)
    canvas = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)
    layer = canvas.copy()
    palette = [(66, 133, 244), (52, 168, 83), (251, 188, 5), (234, 67, 53), (171, 71, 188), (0, 172, 193)]
    for i, u in enumerate(result["units"]):
        color = palette[i % len(palette)]
        pts = np.array(u["polygon"], np.int32)
        cv2.fillPoly(layer, [pts], color)
        for hole in u.get("holes", []):
            cv2.fillPoly(layer, [np.array(hole, np.int32)], (255, 255, 255))
    canvas = cv2.addWeighted(layer, 0.35, canvas, 0.65, 0)
    for i, u in enumerate(result["units"]):
        color = palette[i % len(palette)]
        cv2.polylines(canvas, [np.array(u["polygon"], np.int32)], True, color, 2)
        cx, cy = map(int, u["centroid"])
        cv2.putText(canvas, u["id"], (cx - 30, cy), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1, cv2.LINE_AA)
    return canvas
