"""
Synthetic Fallback Dataset.

Generates a deterministic multi-floor building with realistic room layouts
so the demo pipeline works even if the CV detection pipeline is unavailable.

Building: "Greenfield Residences"
  - 1 basement level  (parking, storage, utility)
  - Ground floor      (lobby, shop, office units)
  - Floor 1           (residential flats)
  - Floor 2           (residential flats)

All coordinates are in metres, local/arbitrary system.
The building footprint is 30m × 20m.
"""
from typing import Dict, List, Any


PARCEL_ID = "PARCEL-001"
BUILDING_NAME = "Greenfield Residences"
FLOOR_HEIGHT = 3.0        # metres per floor
FLOOR_COUNT = 3           # above-ground (ground + 2 upper)
BASEMENT_COUNT = 1

# Building footprint: 30m × 20m rectangle
BUILDING_FOOTPRINT = [[0, 0], [30, 0], [30, 20], [0, 20], [0, 0]]

# Parcel boundary: slightly larger than building (2m margin)
PARCEL_BOUNDARY = [[-2, -2], [32, -2], [32, 22], [-2, 22], [-2, -2]]


def _make_rect(x1: float, y1: float, x2: float, y2: float) -> List[List[float]]:
    """Helper: create a closed rectangular polygon."""
    return [[x1, y1], [x2, y1], [x2, y2], [x1, y2], [x1, y1]]


# ── Per-floor unit definitions ─────────────────────────────────────────────────

BASEMENT_UNITS = [
    {"polygon": _make_rect(0, 0, 15, 10), "unit_type": "parking", "label": "Parking A"},
    {"polygon": _make_rect(15, 0, 30, 10), "unit_type": "parking", "label": "Parking B"},
    {"polygon": _make_rect(0, 10, 10, 20), "unit_type": "storage", "label": "Storage"},
    {"polygon": _make_rect(10, 10, 20, 20), "unit_type": "utility", "label": "Utility Room"},
    {"polygon": _make_rect(20, 10, 30, 20), "unit_type": "storage", "label": "Storage B"},
]

GROUND_FLOOR_UNITS = [
    {"polygon": _make_rect(0, 0, 10, 10), "unit_type": "commercial", "label": "Shop A"},
    {"polygon": _make_rect(10, 0, 20, 10), "unit_type": "lobby", "label": "Main Lobby"},
    {"polygon": _make_rect(20, 0, 30, 10), "unit_type": "commercial", "label": "Shop B"},
    {"polygon": _make_rect(0, 10, 15, 20), "unit_type": "office", "label": "Office 1"},
    {"polygon": _make_rect(15, 10, 30, 20), "unit_type": "office", "label": "Office 2"},
]

FLOOR_1_UNITS = [
    {"polygon": _make_rect(0, 0, 10, 10), "unit_type": "residential", "label": "Flat 101"},
    {"polygon": _make_rect(10, 0, 20, 10), "unit_type": "residential", "label": "Flat 102"},
    {"polygon": _make_rect(20, 0, 30, 10), "unit_type": "residential", "label": "Flat 103"},
    {"polygon": _make_rect(0, 10, 15, 20), "unit_type": "residential", "label": "Flat 104"},
    {"polygon": _make_rect(15, 10, 30, 20), "unit_type": "residential", "label": "Flat 105"},
]

FLOOR_2_UNITS = [
    {"polygon": _make_rect(0, 0, 10, 10), "unit_type": "residential", "label": "Flat 201"},
    {"polygon": _make_rect(10, 0, 20, 10), "unit_type": "residential", "label": "Flat 202"},
    {"polygon": _make_rect(20, 0, 30, 10), "unit_type": "residential", "label": "Flat 203"},
    {"polygon": _make_rect(0, 10, 15, 20), "unit_type": "residential", "label": "Flat 204"},
    {"polygon": _make_rect(15, 10, 30, 20), "unit_type": "residential", "label": "Flat 205"},
    # Intentional overlap to demonstrate validation engine
    {"polygon": _make_rect(9, 9, 21, 11), "unit_type": "residential", "label": "Flat 206 (overlap demo)"},
]


def get_fallback_project() -> Dict[str, Any]:
    """
    Return the complete synthetic project definition.

    This is the same format that the /project endpoint + /process pipeline
    produces — so the frontend can consume it identically whether the data
    came from live CV detection or this fallback.
    """
    floors = [
        {"floor_number": -1, "units": BASEMENT_UNITS,      "footprint": BUILDING_FOOTPRINT},
        {"floor_number":  0, "units": GROUND_FLOOR_UNITS,   "footprint": BUILDING_FOOTPRINT},
        {"floor_number":  1, "units": FLOOR_1_UNITS,        "footprint": BUILDING_FOOTPRINT},
        {"floor_number":  2, "units": FLOOR_2_UNITS,        "footprint": BUILDING_FOOTPRINT},
    ]

    return {
        "name": BUILDING_NAME,
        "parcel_id": PARCEL_ID,
        "parcel_boundary": PARCEL_BOUNDARY,
        "floor_count": FLOOR_COUNT,
        "floor_height": FLOOR_HEIGHT,
        "basement_count": BASEMENT_COUNT,
        "floors": floors,
    }
