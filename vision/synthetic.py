"""Synthetic floor plans so you can test the pipeline before real plans are chosen.

Base variant: six units, door gaps in the walls, one structural column, a few text labels.
Additional variants for regression testing:
  - thick:  thicker walls (T=18)
  - noisy:  Gaussian noise + slight blur
  - wide_gaps: larger door gaps (GAP=55) to stress-test close_frac
"""
from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np


def _draw_base(T: int = 10, GAP: int = 30) -> np.ndarray:
    """Core 6-unit layout. Returns a grayscale image."""
    W, H = 1600, 1200
    img = np.full((H, W), 255, np.uint8)
    L, R, Tp, B = 100, 1500, 100, 1100

    cv2.rectangle(img, (L, Tp), (R, B), 0, T)  # outer walls

    def vwall(x, y0, y1, gaps=()):
        y = y0
        for g0, g1 in sorted(gaps):
            cv2.line(img, (x, y), (x, g0), 0, T)
            y = g1
        cv2.line(img, (x, y), (x, y1), 0, T)

    def hwall(y, x0, x1, gaps=()):
        x = x0
        for g0, g1 in sorted(gaps):
            cv2.line(img, (x, y), (g0, y), 0, T)
            x = g1
        cv2.line(img, (x, y), (x1, y), 0, T)

    hwall(600, L, R, gaps=[(300, 300 + GAP), (800, 800 + GAP), (1250, 1250 + GAP)])
    vwall(570, Tp, 600, gaps=[(300, 300 + GAP)])
    vwall(1030, Tp, 600, gaps=[(250, 250 + GAP)])
    vwall(570, 600, B, gaps=[(850, 850 + GAP)])
    vwall(1030, 600, B, gaps=[(850, 850 + GAP)])

    cv2.rectangle(img, (300, 330), (330, 360), 0, -1)  # column
    for i, (x, y) in enumerate([(200, 200), (700, 200), (1150, 200), (200, 800), (700, 800), (1150, 800)]):
        cv2.putText(img, f"Unit {i + 1}", (x, y), cv2.FONT_HERSHEY_SIMPLEX, 1.0, 0, 2, cv2.LINE_AA)

    return img


def write_synthetic(out_dir: str | Path = "plans", name: str = "synthetic_L1.png") -> Path:
    """Standard 6-unit synthetic plan (T=10, GAP=30)."""
    img = _draw_base(T=10, GAP=30)
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    path = out / name
    cv2.imwrite(str(path), img)
    return path


def write_synthetic_thick(out_dir: str | Path = "plans", name: str = "synthetic_thick.png") -> Path:
    """Thicker walls (T=18). Tests robustness to varying wall thickness."""
    img = _draw_base(T=18, GAP=30)
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    path = out / name
    cv2.imwrite(str(path), img)
    return path


def write_synthetic_noisy(out_dir: str | Path = "plans", name: str = "synthetic_noisy.png") -> Path:
    """Adds Gaussian noise + slight blur to simulate a scanned/photographed plan."""
    img = _draw_base(T=10, GAP=30).astype(np.float32)
    noise = np.random.default_rng(42).normal(0, 25, img.shape)
    img = np.clip(img + noise, 0, 255).astype(np.uint8)
    img = cv2.GaussianBlur(img, (5, 5), 1.2)
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    path = out / name
    cv2.imwrite(str(path), img)
    return path


def write_synthetic_wide_gaps(out_dir: str | Path = "plans", name: str = "synthetic_wide_gaps.png") -> Path:
    """Larger door gaps (GAP=55). Stress-tests close_frac sealing."""
    img = _draw_base(T=10, GAP=55)
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    path = out / name
    cv2.imwrite(str(path), img)
    return path


def write_all_synthetics(out_dir: str | Path = "plans") -> list[Path]:
    """Generate all synthetic variants."""
    return [
        write_synthetic(out_dir),
        write_synthetic_thick(out_dir),
        write_synthetic_noisy(out_dir),
        write_synthetic_wide_gaps(out_dir),
    ]
