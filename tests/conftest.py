"""Shared pytest fixtures for vision module tests."""
from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

import pytest

# Ensure the project root is on sys.path (same fix as run_vision.py)
_project_root = Path(__file__).resolve().parent.parent
if str(_project_root) not in sys.path:
    sys.path.insert(0, str(_project_root))


@pytest.fixture(scope="session")
def project_root() -> Path:
    return _project_root


@pytest.fixture(scope="session")
def plans_dir(project_root) -> Path:
    """Generate synthetic plans once per test session."""
    d = project_root / "plans"
    d.mkdir(exist_ok=True)
    from vision.synthetic import write_all_synthetics
    write_all_synthetics(str(d))
    return d


@pytest.fixture(scope="session")
def synthetic_image(plans_dir) -> Path:
    return plans_dir / "synthetic_L1.png"


@pytest.fixture()
def tmp_out(tmp_path) -> Path:
    out = tmp_path / "out"
    out.mkdir()
    return out


@pytest.fixture()
def tmp_cache(tmp_path) -> Path:
    cache = tmp_path / "cache"
    cache.mkdir()
    return cache


@pytest.fixture(scope="session")
def synthetic_result(synthetic_image, tmp_path_factory) -> dict:
    """Run detection on the base synthetic plan once per session."""
    from vision import process_floor
    out = tmp_path_factory.mktemp("session_out")
    cache = tmp_path_factory.mktemp("session_cache")
    result = process_floor(
        str(synthetic_image),
        out_dir=str(out),
        cache_dir=str(cache),
        save_cache=True,
    )
    return result


@pytest.fixture(scope="session")
def all_synthetic_results(plans_dir, tmp_path_factory) -> dict[str, dict]:
    """Run detection on all synthetic plans once per session. Returns {floor_id: result}."""
    from vision import process_floor
    out = tmp_path_factory.mktemp("all_out")
    cache = tmp_path_factory.mktemp("all_cache")
    results = {}
    for img in sorted(plans_dir.glob("synthetic_*.png")):
        result = process_floor(str(img), out_dir=str(out), cache_dir=str(cache), save_cache=True)
        results[result["floor_id"]] = result
    return results
