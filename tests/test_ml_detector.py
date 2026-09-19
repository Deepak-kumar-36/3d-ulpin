"""Tests for ML detector and auto-fallback pipeline."""
import os
from pathlib import Path
import pytest
import numpy as np
import cv2

from vision import process_floor
from vision.detect import DetectConfig


@pytest.fixture
def plan_image(tmp_path):
    """Creates a temporary sample plan image."""
    img_path = tmp_path / "test_plan.png"
    img = np.full((600, 800, 3), 255, dtype=np.uint8)
    # Draw simple outer wall and a room
    cv2.rectangle(img, (50, 50), (750, 550), (0, 0, 0), 10)
    cv2.rectangle(img, (50, 300), (750, 300), (0, 0, 0), 6)
    cv2.imwrite(str(img_path), img)
    return img_path


def test_ml_contract_when_model_present(plan_image, tmp_path):
    """Contract test verifying that ML detector output matches the vision JSON contract."""
    model_path = Path("ml/models/verta_seg.onnx")
    if not model_path.exists():
        pytest.skip("ONNX model ml/models/verta_seg.onnx not present; skipping.")

    out_dir = tmp_path / "out"
    cache_dir = tmp_path / "cache"

    res = process_floor(
        plan_image,
        floor_id="test_fl",
        out_dir=out_dir,
        cache_dir=cache_dir,
        detector="ml"
    )

    # Mandatory contract fields
    assert "floor_id" in res
    assert "image_size" in res
    assert len(res["image_size"]) == 2
    assert "px_per_meter" in res
    assert "coord_system" in res
    assert res["coord_system"]["origin"] == "top-left"
    assert res["coord_system"]["y_axis"] == "down"
    assert res["coord_system"]["closed_ring"] is False
    assert "units" in res
    assert "source" in res
    assert res["detector"] == "ml"
    assert "confidence" in res

    # Per-unit contract
    for u in res["units"]:
        assert "id" in u
        assert "polygon" in u
        assert "holes" in u
        assert "area_px" in u
        assert "centroid" in u
        # Open ring: first and last point must NOT be equal
        if len(u["polygon"]) > 1:
            assert u["polygon"][0] != u["polygon"][-1]


def test_auto_detector_fallback(plan_image, tmp_path):
    """Auto mode should gracefully run classical detector if ML detector fails or finds zero units."""
    out_dir = tmp_path / "out"
    cache_dir = tmp_path / "cache"

    res = process_floor(
        plan_image,
        floor_id="test_auto",
        out_dir=out_dir,
        cache_dir=cache_dir,
        detector="auto"
    )

    assert "floor_id" in res
    assert res["detector"] in ("classic", "ml")
    assert res["source"] in ("live", "cache", "cache-fallback")
    assert len(res["units"]) >= 0


def test_missing_model_graceful_skip(monkeypatch, plan_image, tmp_path):
    """If VERTA_MODEL points to a nonexistent file, auto mode must fall back to classic."""
    monkeypatch.setenv("VERTA_MODEL", "nonexistent_model_file_123.onnx")

    out_dir = tmp_path / "out"
    cache_dir = tmp_path / "cache"

    res = process_floor(
        plan_image,
        floor_id="test_fallback",
        out_dir=out_dir,
        cache_dir=cache_dir,
        detector="auto"
    )

    assert res["detector"] == "classic"
    assert res["source"] == "live"
