"""
CV Output Adapter.

Transforms Person 1's vision-pipeline JSON into the normalised format
that the backend processing pipeline expects.

Coordinate transforms applied:
  1. Y-flip:  y_3d = image_height - y_pixel
  2. Scale:   metres = pixels / px_per_meter  (if known, else pixels / scale_factor)
  3. Centre:  shift so the building centroid sits near the origin
  4. Close ring: append first point to end (Person 1 uses open rings)
"""
from typing import List, Dict, Any, Optional, Tuple
import json
from shapely.geometry import Polygon


# ── Default scale ──────────────────────────────────────────────────────────────
# When px_per_meter is null, we pick a scale that makes a 1600px image ≈ 40m wide.
DEFAULT_SCALE_FACTOR = 40.0  # pixels per metre (1600px / 40 = 40m wide building)


def transform_cv_floor(
    cv_json: Dict[str, Any],
    floor_number: int,
    px_per_meter: Optional[float] = None,
    center: bool = True,
) -> Dict[str, Any]:
    """
    Transform a single Person 1 floor JSON into backend-ready format.

    Args:
        cv_json:      Parsed JSON from L1.json / L2.json / L3.json
        floor_number: Which floor this represents (0 = ground, 1 = first, etc.)
        px_per_meter: Pixels per metre. If None, auto-calculated from image width.
        center:       Whether to shift coords so centroid is near origin.

    Returns:
        Dict with keys:
          - floor_number: int
          - image_size: [w, h]
          - footprint: [[x,y], ...] (convex hull of all units)
          - units: [{polygon, floor_number, unit_type, cv_id, holes, area_px, centroid}, ...]
    """
    image_w, image_h = cv_json["image_size"]

    # Determine scale
    if px_per_meter and px_per_meter > 0:
        scale = px_per_meter
    elif cv_json.get("px_per_meter") and cv_json["px_per_meter"] is not None:
        scale = cv_json["px_per_meter"]
    else:
        scale = image_w / DEFAULT_SCALE_FACTOR

    def transform_point(px: float, py: float) -> List[float]:
        """Pixel coords → metres with Y-flip."""
        x_m = px / scale
        y_m = (image_h - py) / scale  # flip Y
        return [round(x_m, 3), round(y_m, 3)]

    def transform_ring(ring: List[List[float]]) -> List[List[float]]:
        """Transform and close a ring."""
        transformed = [transform_point(p[0], p[1]) for p in ring]
        # Close the ring (Person 1 uses open rings)
        if len(transformed) > 1 and transformed[0] != transformed[-1]:
            transformed.append(transformed[0])
        return transformed

    # Transform all unit polygons
    transformed_units = []
    all_points = []

    for unit in cv_json["units"]:
        poly = transform_ring(unit["polygon"])
        all_points.extend(poly)

        # Transform holes if present
        holes = []
        for hole_ring in unit.get("holes", []):
            holes.append(transform_ring(hole_ring))

        transformed_units.append({
            "polygon": poly,
            "holes": holes,
            "floor_number": floor_number,
            "unit_type": "residential",  # default; Person 1 doesn't classify types
            "cv_id": unit["id"],
            "area_px": unit.get("area_px"),
            "centroid_px": unit.get("centroid"),
        })

    # Centre all coordinates if requested
    if center and all_points:
        xs = [p[0] for p in all_points]
        ys = [p[1] for p in all_points]
        cx = (min(xs) + max(xs)) / 2
        cy = (min(ys) + max(ys)) / 2

        for u in transformed_units:
            u["polygon"] = [[round(p[0] - cx, 3), round(p[1] - cy, 3)] for p in u["polygon"]]
            u["holes"] = [
                [[round(p[0] - cx, 3), round(p[1] - cy, 3)] for p in hole]
                for hole in u["holes"]
            ]

        # Shift all_points too for footprint calculation
        all_points = [[p[0] - cx, p[1] - cy] for p in all_points]

    # Compute floor footprint as convex hull of all unit points
    if all_points:
        from shapely.geometry import MultiPoint
        hull = MultiPoint([(p[0], p[1]) for p in all_points]).convex_hull
        footprint = [[round(c[0], 3), round(c[1], 3)] for c in hull.exterior.coords]
    else:
        footprint = []

    return {
        "floor_number": floor_number,
        "floor_id": cv_json.get("floor_id", f"L{floor_number}"),
        "image_size": [image_w, image_h],
        "source": cv_json.get("source", "unknown"),
        "scale_px_per_m": round(scale, 2),
        "footprint": footprint,
        "units": transformed_units,
    }


def transform_multi_floor(
    floor_jsons: List[Tuple[Dict[str, Any], int]],
    px_per_meter: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Transform multiple floor JSONs into a complete project definition.

    Args:
        floor_jsons: List of (parsed_json, floor_number) tuples.
        px_per_meter: Optional override.

    Returns:
        Dict suitable for project creation + unit ingestion.
    """
    floors = []
    all_units = []

    for cv_json, floor_num in floor_jsons:
        result = transform_cv_floor(cv_json, floor_num, px_per_meter)
        floors.append({
            "floor_number": result["floor_number"],
            "floor_id": result["floor_id"],
            "footprint": result["footprint"],
        })
        all_units.extend(result["units"])

    return {
        "name": "CV-Detected Building",
        "parcel_id": "CV-PARCEL-001",
        "floor_count": len(floor_jsons),
        "floor_height": 3.0,
        "basement_count": 0,
        "floors": floors,
        "units": all_units,
        "total_units": len(all_units),
    }
