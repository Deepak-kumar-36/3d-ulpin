"""Tests for the vision detection pipeline.

Covers:
  1. Polygon validity (Shapely is_valid, area > 0)
  2. Open rings (first point not repeated)
  3. JSON contract fields
  4. Synthetic plan yields exactly 6 units
  5. USE_CACHED=1 returns source == "cache"
  6. Cache fallback on blank image returns source == "cache-fallback"
"""
from __future__ import annotations

import json
import os
from pathlib import Path

import numpy as np
import pytest
from shapely.geometry import Polygon


# ─── 1. Polygon validity ────────────────────────────────────────────────────────

def test_polygon_validity(all_synthetic_results):
    """Every polygon in every output JSON is valid (Shapely is_valid) with area > 0."""
    for floor_id, result in all_synthetic_results.items():
        for unit in result["units"]:
            # Close the ring for Shapely (our contract uses open rings)
            ring = unit["polygon"] + [unit["polygon"][0]]
            poly = Polygon(ring)
            assert poly.is_valid, f"{unit['id']}: polygon is not valid"
            assert poly.area > 0, f"{unit['id']}: polygon area is 0"

            # Check holes too
            for hi, hole in enumerate(unit.get("holes", [])):
                hole_ring = hole + [hole[0]]
                hole_poly = Polygon(hole_ring)
                assert hole_poly.is_valid, f"{unit['id']} hole {hi}: not valid"
                assert hole_poly.area > 0, f"{unit['id']} hole {hi}: area is 0"


# ─── 2. Open rings (no repeated first point) ────────────────────────────────────

def test_no_repeated_first_point(all_synthetic_results):
    """No ring repeats its first point as the last point."""
    for floor_id, result in all_synthetic_results.items():
        for unit in result["units"]:
            ring = unit["polygon"]
            assert len(ring) >= 3, f"{unit['id']}: polygon has < 3 points"
            assert ring[0] != ring[-1], f"{unit['id']}: first point repeated as last (ring should be open)"

            for hi, hole in enumerate(unit.get("holes", [])):
                assert len(hole) >= 3, f"{unit['id']} hole {hi}: < 3 points"
                assert hole[0] != hole[-1], f"{unit['id']} hole {hi}: first point repeated"


# ─── 3. JSON contract fields ────────────────────────────────────────────────────

REQUIRED_TOP_KEYS = {"floor_id", "image_size", "px_per_meter", "coord_system", "units", "source"}
REQUIRED_COORD_KEYS = {"origin", "y_axis", "exterior_winding", "closed_ring"}
REQUIRED_UNIT_KEYS = {"id", "polygon", "holes", "area_px", "centroid"}


def test_contract_fields(all_synthetic_results):
    """All required JSON contract fields are present with correct types."""
    for floor_id, result in all_synthetic_results.items():
        # Top-level keys
        missing = REQUIRED_TOP_KEYS - set(result.keys())
        assert not missing, f"{floor_id}: missing top-level keys {missing}"

        # image_size is [w, h]
        assert isinstance(result["image_size"], list) and len(result["image_size"]) == 2

        # coord_system
        cs = result["coord_system"]
        missing_cs = REQUIRED_COORD_KEYS - set(cs.keys())
        assert not missing_cs, f"{floor_id}: missing coord_system keys {missing_cs}"
        assert cs["origin"] == "top-left"
        assert cs["y_axis"] == "down"
        assert cs["exterior_winding"] == "ccw"
        assert cs["closed_ring"] is False

        # units
        for unit in result["units"]:
            missing_u = REQUIRED_UNIT_KEYS - set(unit.keys())
            assert not missing_u, f"{unit.get('id', '?')}: missing unit keys {missing_u}"
            assert isinstance(unit["polygon"], list)
            assert isinstance(unit["holes"], list)
            assert isinstance(unit["area_px"], (int, float))
            assert isinstance(unit["centroid"], list) and len(unit["centroid"]) == 2


# ─── 4. Synthetic plan yields exactly 6 units ───────────────────────────────────

def test_synthetic_6_units(synthetic_result):
    """The base synthetic plan (synthetic_L1) must yield exactly 6 units."""
    assert len(synthetic_result["units"]) == 6, (
        f"Expected 6 units, got {len(synthetic_result['units'])}"
    )


def test_all_synthetic_variants_6_units(all_synthetic_results):
    """All synthetic variants should also yield 6 units (regression test)."""
    for floor_id, result in all_synthetic_results.items():
        assert len(result["units"]) == 6, (
            f"{floor_id}: expected 6 units, got {len(result['units'])}"
        )


# ─── 5. USE_CACHED=1 returns source == "cache" ──────────────────────────────────

def test_cached_source(synthetic_image, tmp_out, tmp_cache):
    """With USE_CACHED=1 and a cache file present, source must be 'cache'."""
    from vision import process_floor

    # First run: save to cache
    result1 = process_floor(
        str(synthetic_image), out_dir=str(tmp_out), cache_dir=str(tmp_cache), save_cache=True,
    )
    assert result1["source"] == "live"

    # Second run: force cached
    result2 = process_floor(
        str(synthetic_image), out_dir=str(tmp_out), cache_dir=str(tmp_cache), use_cached=True,
    )
    assert result2["source"] == "cache", f"Expected 'cache', got '{result2['source']}'"


# ─── 6. Cache fallback on blank image ───────────────────────────────────────────

def test_cache_fallback(synthetic_image, tmp_out, tmp_cache):
    """A blank white image with a cache file present should return source == 'cache-fallback'."""
    import cv2
    from vision import process_floor

    # First: run on real synthetic to populate cache
    process_floor(
        str(synthetic_image), floor_id="blank_test",
        out_dir=str(tmp_out), cache_dir=str(tmp_cache), save_cache=True,
    )

    # Create a blank white image (should find zero units → fallback)
    blank_path = tmp_out / "blank_test.png"
    blank = np.full((800, 600), 255, np.uint8)
    cv2.imwrite(str(blank_path), blank)

    result = process_floor(
        str(blank_path), floor_id="blank_test",
        out_dir=str(tmp_out), cache_dir=str(tmp_cache),
    )
    assert result["source"] == "cache-fallback", f"Expected 'cache-fallback', got '{result['source']}'"


# ─── 7. Architectural realistic plans (L1, L2, L3) ─────────────────────────────

def test_architectural_plans_l1_l2_l3(tmp_out, tmp_cache):
    """L1, L2, L3 realistic floor plans with ~70px doors detect correctly with close_frac=0.06."""
    from vision import process_floor
    from make_plans import floor1, floor2, floor3
    import cv2

    expected_counts = {"L1": 8, "L2": 6, "L3": 6}
    floor_funcs = {"L1": floor1, "L2": floor2, "L3": floor3}

    for name, fn in floor_funcs.items():
        img_path = tmp_out / f"{name}.png"
        cv2.imwrite(str(img_path), fn().img)

        result = process_floor(
            str(img_path),
            out_dir=str(tmp_out),
            cache_dir=str(tmp_cache),
        )

        assert len(result["units"]) == expected_counts[name], (
            f"{name}: expected {expected_counts[name]} units, got {len(result['units'])}"
        )

        for unit in result["units"]:
            ring = unit["polygon"]
            assert len(ring) >= 3
            assert ring[0] != ring[-1]
            poly = Polygon(ring + [ring[0]])
            assert poly.is_valid
            assert poly.area > 0

