"""
Validation Engine.

Implements the P0 and P1 validation rules defined in the PRD:
  1. Overlap detection      (P0, hard constraint)
  2. Containment check      (P0, hard constraint)
  3. Unassigned-area check  (P0, warning)
  4. Geometry validity      (P0, hard constraint)
  5. Duplicate detection    (P1, warning)
"""
from typing import List, Dict, Tuple
from shapely.geometry import Polygon, MultiPolygon
from shapely.validation import make_valid, explain_validity
import uuid


# ── Individual rule functions ──────────────────────────────────────────────────

def check_geometry_validity(
    unit_id: str,
    polygon: Polygon,
) -> List[Dict]:
    """Check that the polygon is a valid Shapely geometry."""
    results = []
    if not polygon.is_valid:
        results.append({
            "id": str(uuid.uuid4()),
            "unit_id": unit_id,
            "rule": "geometry_validity",
            "status": "fail",
            "message": f"Unit {unit_id} has invalid geometry: {explain_validity(polygon)}",
        })
    else:
        results.append({
            "id": str(uuid.uuid4()),
            "unit_id": unit_id,
            "rule": "geometry_validity",
            "status": "pass",
            "message": None,
        })
    return results


def check_overlaps(
    units: List[Tuple[str, Polygon]],
) -> List[Dict]:
    """
    Pairwise overlap detection among units on the same floor.

    Returns a validation result for each overlapping pair.
    """
    results = []
    n = len(units)
    for i in range(n):
        for j in range(i + 1, n):
            uid_a, poly_a = units[i]
            uid_b, poly_b = units[j]
            if poly_a.intersects(poly_b):
                intersection = poly_a.intersection(poly_b)
                overlap_area = intersection.area
                if overlap_area > 1e-6:  # ignore negligible touching
                    results.append({
                        "id": str(uuid.uuid4()),
                        "unit_id": uid_a,
                        "rule": "overlap",
                        "status": "fail",
                        "message": (
                            f"Unit {uid_a} overlaps Unit {uid_b} "
                            f"by {overlap_area:.2f} m²"
                        ),
                    })
                    results.append({
                        "id": str(uuid.uuid4()),
                        "unit_id": uid_b,
                        "rule": "overlap",
                        "status": "fail",
                        "message": (
                            f"Unit {uid_b} overlaps Unit {uid_a} "
                            f"by {overlap_area:.2f} m²"
                        ),
                    })
    return results


def check_containment(
    unit_id: str,
    unit_polygon: Polygon,
    floor_footprint: Polygon,
) -> List[Dict]:
    """Check that a unit polygon lies fully within its floor footprint."""
    if floor_footprint.contains(unit_polygon):
        return [{
            "id": str(uuid.uuid4()),
            "unit_id": unit_id,
            "rule": "containment",
            "status": "pass",
            "message": None,
        }]
    else:
        # Compute how much extends outside
        outside = unit_polygon.difference(floor_footprint)
        outside_area = outside.area
        return [{
            "id": str(uuid.uuid4()),
            "unit_id": unit_id,
            "rule": "containment",
            "status": "fail",
            "message": (
                f"Unit {unit_id} extends outside the floor footprint "
                f"by {outside_area:.2f} m²"
            ),
        }]


def check_unassigned_area(
    floor_id: str,
    floor_footprint: Polygon,
    unit_polygons: List[Polygon],
    tolerance: float = 0.15,
) -> List[Dict]:
    """
    Flag if unassigned area exceeds a tolerance (default 15% of floor area).

    Returns a floor-level warning (not per-unit).
    """
    floor_area = floor_footprint.area
    if floor_area < 1e-6:
        return []

    covered = floor_footprint  # start with the footprint and subtract
    union = MultiPolygon(unit_polygons) if len(unit_polygons) > 1 else (
        unit_polygons[0] if unit_polygons else Polygon()
    )
    try:
        union = union.buffer(0)  # clean up
    except Exception:
        pass

    unassigned_area = floor_area - union.area
    unassigned_pct = unassigned_area / floor_area if floor_area > 0 else 0

    status = "warning" if unassigned_pct > tolerance else "pass"
    msg = None
    if status == "warning":
        msg = (
            f"Floor {floor_id} has {unassigned_pct:.0%} unassigned area "
            f"({unassigned_area:.2f} m²) — possible missed unit"
        )

    return [{
        "id": str(uuid.uuid4()),
        "unit_id": f"floor:{floor_id}",
        "rule": "unassigned_area",
        "status": status,
        "message": msg,
    }]


def check_duplicates(
    units: List[Tuple[str, Polygon]],
    iou_threshold: float = 0.95,
) -> List[Dict]:
    """
    Detect near-duplicate unit polygons on the same floor (P1).

    Two polygons with IoU > threshold are flagged.
    """
    results = []
    n = len(units)
    for i in range(n):
        for j in range(i + 1, n):
            uid_a, poly_a = units[i]
            uid_b, poly_b = units[j]
            try:
                inter_area = poly_a.intersection(poly_b).area
                union_area = poly_a.union(poly_b).area
                if union_area < 1e-6:
                    continue
                iou = inter_area / union_area
                if iou >= iou_threshold:
                    results.append({
                        "id": str(uuid.uuid4()),
                        "unit_id": uid_a,
                        "rule": "duplicate",
                        "status": "warning",
                        "message": f"Unit {uid_a} appears to duplicate {uid_b} (IoU={iou:.2f})",
                    })
                    results.append({
                        "id": str(uuid.uuid4()),
                        "unit_id": uid_b,
                        "rule": "duplicate",
                        "status": "warning",
                        "message": f"Unit {uid_b} appears to duplicate {uid_a} (IoU={iou:.2f})",
                    })
            except Exception:
                continue
    return results


# ── Orchestrator ───────────────────────────────────────────────────────────────

def validate_floor(
    floor_id: str,
    floor_footprint: Polygon,
    units: List[Tuple[str, Polygon]],
) -> List[Dict]:
    """
    Run all validation rules for a single floor.

    Args:
        floor_id:        Floor identifier (for messages).
        floor_footprint: The floor's outer boundary polygon.
        units:           List of (unit_id, polygon) pairs.

    Returns:
        Combined list of validation result dicts.
    """
    results: List[Dict] = []

    # 1. Geometry validity per unit
    for uid, poly in units:
        results.extend(check_geometry_validity(uid, poly))

    # 2. Pairwise overlaps
    results.extend(check_overlaps(units))

    # 3. Containment per unit
    for uid, poly in units:
        results.extend(check_containment(uid, poly, floor_footprint))

    # 4. Unassigned area (floor-level)
    unit_polys = [p for _, p in units]
    results.extend(check_unassigned_area(floor_id, floor_footprint, unit_polys))

    # 5. Duplicate detection (P1)
    results.extend(check_duplicates(units))

    return results


def summarize_validation(results: List[Dict]) -> Dict:
    """Produce a summary dict for the validation bar."""
    total = len(results)
    passes = sum(1 for r in results if r["status"] == "pass")
    warnings = sum(1 for r in results if r["status"] == "warning")
    fails = sum(1 for r in results if r["status"] == "fail")
    return {
        "total_checks": total,
        "pass": passes,
        "warning": warnings,
        "fail": fails,
    }
