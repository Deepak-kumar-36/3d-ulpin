"""
3D Extrusion Engine.

Takes a 2D polygon + floor elevation + floor height and produces a 3D prism
represented as vertices and triangle faces — ready for Three.js consumption.
"""
from typing import List, Tuple
import numpy as np
from shapely.geometry import Polygon


def extrude_polygon(
    polygon_coords: List[List[float]],
    base_z: float,
    height: float,
) -> Tuple[List[List[float]], List[List[int]]]:
    """
    Extrude a 2D polygon into a 3D prism.

    Args:
        polygon_coords: Ring of [x, y] coordinates (closed or unclosed).
        base_z: Base elevation in metres (negative for basement).
        height: Floor height in metres.

    Returns:
        (vertices, faces) where:
          vertices = [[x, y, z], ...] – all 3D points of the prism
          faces    = [[i, j, k], ...] – triangle indices (0-based)
    """
    # Ensure the ring is not closed (remove duplicate last point)
    coords = list(polygon_coords)
    if len(coords) > 1 and coords[0] == coords[-1]:
        coords = coords[:-1]

    n = len(coords)
    if n < 3:
        raise ValueError(f"Need at least 3 vertices, got {n}")

    top_z = base_z + height
    vertices: List[List[float]] = []
    faces: List[List[int]] = []

    # ── Bottom ring (indices 0 .. n-1) ────────────────────────────────────
    for x, y in coords:
        vertices.append([x, y, base_z])

    # ── Top ring (indices n .. 2n-1) ──────────────────────────────────────
    for x, y in coords:
        vertices.append([x, y, top_z])

    # ── Side faces (two triangles per edge) ───────────────────────────────
    for i in range(n):
        j = (i + 1) % n
        bi, bj = i, j          # bottom
        ti, tj = i + n, j + n  # top
        faces.append([bi, bj, tj])
        faces.append([bi, tj, ti])

    # ── Bottom cap (fan from vertex 0) ────────────────────────────────────
    for i in range(1, n - 1):
        faces.append([0, i + 1, i])  # reversed winding for downward normal

    # ── Top cap (fan from vertex n) ───────────────────────────────────────
    for i in range(1, n - 1):
        faces.append([n, n + i, n + i + 1])

    return vertices, faces


def compute_elevation(floor_number: int, floor_height: float) -> float:
    """
    Compute the base elevation for a given floor.

    Ground floor = 0:  base_z = 0
    Floor 1:           base_z = floor_height
    Floor 2:           base_z = 2 * floor_height
    Basement -1:       base_z = -floor_height
    Basement -2:       base_z = -2 * floor_height
    """
    return floor_number * floor_height


def polygon_area(coords: List[List[float]]) -> float:
    """Compute the area of a 2D polygon using Shapely."""
    ring = list(coords)
    if len(ring) > 1 and ring[0] != ring[-1]:
        ring.append(ring[0])
    return Polygon(ring).area
