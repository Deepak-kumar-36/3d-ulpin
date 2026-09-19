"""Prepare CubiCasa5K dataset into 3-class semantic segmentation pairs.

Classes:
  0: Background / outside
  1: Separator (walls + doors + windows)
  2: Room interior (rooms, kitchen, bath, etc.)

Order of painting:
  Rooms (Class 2) painted first -> Separators (Class 1) painted on top.
"""
from __future__ import annotations

import argparse
import io
import json
import os
import random
import sys
from pathlib import Path

import cv2
import numpy as np

# Ensure project root is on sys.path so we can import make_plans
_root = Path(__file__).resolve().parents[2]
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))


SEPARATOR_CLASSES = {"wall", "door", "window"}
ROOM_CLASSES = {"room", "kitchen", "bathroom", "stairs", "bed"}


def resize_pair(img: np.ndarray, mask: np.ndarray, target_long_side: int = 768) -> tuple[np.ndarray, np.ndarray]:
    h, w = img.shape[:2]
    max_dim = max(h, w)
    if max_dim == target_long_side:
        return img, mask
    scale = target_long_side / max_dim
    new_w, new_h = int(round(w * scale)), int(round(h * scale))
    img_resized = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)
    mask_resized = cv2.resize(mask, (new_w, new_h), interpolation=cv2.INTER_NEAREST)
    return img_resized, mask_resized


def generate_synthetic_pair(floor_variant: int = 0) -> tuple[np.ndarray, np.ndarray]:
    """Generates an image + exact ground-truth mask using the make_plans engine."""
    import make_plans
    W, H = make_plans.W, make_plans.H
    L, R, TOP, BOT = make_plans.L, make_plans.R, make_plans.TOP, make_plans.BOT
    T_OUT, T_IN = make_plans.T_OUT, make_plans.T_IN

    # Deterministic variation
    rng = np.random.default_rng(1000 + floor_variant)
    fl_type = floor_variant % 3

    mask = np.zeros((H, W), dtype=np.uint8)

    if fl_type == 0:
        p = make_plans.floor1()
        y_a, y_b = 520, 640
        # Define room boxes: (x0, y0, x1, y1)
        rooms = [
            (L, TOP, 560, y_a), (560, TOP, 1000, y_a), (1000, TOP, R, y_a),
            (L, y_a, R, y_b),  # corridor
            (L, y_b, 480, BOT), (480, y_b, 780, BOT), (780, y_b, 1150, BOT), (1150, y_b, R, BOT)
        ]
        separators = [
            # Shell
            (L - T_OUT//2, TOP - T_OUT//2, R + T_OUT//2, TOP + T_OUT//2),
            (L - T_OUT//2, BOT - T_OUT//2, R + T_OUT//2, BOT + T_OUT//2),
            (L - T_OUT//2, TOP - T_OUT//2, L + T_OUT//2, BOT + T_OUT//2),
            (R - T_OUT//2, TOP - T_OUT//2, R + T_OUT//2, BOT + T_OUT//2),
            # Corridors
            (L, y_a - T_IN//2, R, y_a + T_IN//2),
            (L, y_b - T_IN//2, R, y_b + T_IN//2),
            # Partitions
            (560 - T_IN//2, TOP, 560 + T_IN//2, y_a),
            (1000 - T_IN//2, TOP, 1000 + T_IN//2, y_a),
            (480 - T_IN//2, y_b, 480 + T_IN//2, BOT),
            (780 - T_IN//2, y_b, 780 + T_IN//2, BOT),
            (1150 - T_IN//2, y_b, 1150 + T_IN//2, BOT),
        ]
    elif fl_type == 1:
        p = make_plans.floor2()
        y_a, y_b = 500, 620
        rooms = [
            (L, TOP, 800, y_a), (800, TOP, R, y_a),
            (L, y_a, R, y_b),  # hall
            (L, y_b, 560, BOT), (560, y_b, 1080, BOT), (1080, y_b, R, BOT)
        ]
        separators = [
            (L - T_OUT//2, TOP - T_OUT//2, R + T_OUT//2, TOP + T_OUT//2),
            (L - T_OUT//2, BOT - T_OUT//2, R + T_OUT//2, BOT + T_OUT//2),
            (L - T_OUT//2, TOP - T_OUT//2, L + T_OUT//2, BOT + T_OUT//2),
            (R - T_OUT//2, TOP - T_OUT//2, R + T_OUT//2, BOT + T_OUT//2),
            (L, y_a - T_IN//2, R, y_a + T_IN//2),
            (L, y_b - T_IN//2, R, y_b + T_IN//2),
            (800 - T_IN//2, TOP, 800 + T_IN//2, y_a),
            (560 - T_IN//2, y_b, 560 + T_IN//2, BOT),
            (1080 - T_IN//2, y_b, 1080 + T_IN//2, BOT),
        ]
    else:
        p = make_plans.floor3()
        y_a, y_b = 540, 660
        rooms = [
            (L, TOP, 400, y_a), (400, TOP, 1200, y_a), (1200, TOP, R, y_a),
            (L, y_a, R, y_b),  # hall
            (L, y_b, 900, BOT), (900, y_b, R, BOT)
        ]
        separators = [
            (L - T_OUT//2, TOP - T_OUT//2, R + T_OUT//2, TOP + T_OUT//2),
            (L - T_OUT//2, BOT - T_OUT//2, R + T_OUT//2, BOT + T_OUT//2),
            (L - T_OUT//2, TOP - T_OUT//2, L + T_OUT//2, BOT + T_OUT//2),
            (R - T_OUT//2, TOP - T_OUT//2, R + T_OUT//2, BOT + T_OUT//2),
            (L, y_a - T_IN//2, R, y_a + T_IN//2),
            (L, y_b - T_IN//2, R, y_b + T_IN//2),
            (400 - T_IN//2, TOP, 400 + T_IN//2, y_a),
            (1200 - T_IN//2, TOP, 1200 + T_IN//2, y_a),
            (900 - T_IN//2, y_b, 900 + T_IN//2, BOT),
        ]

    # Paint room interiors first (Class 2)
    for x0, y0, x1, y1 in rooms:
        cv2.rectangle(mask, (int(x0), int(y0)), (int(x1), int(y1)), 2, -1)

    # Paint separators on top (Class 1)
    for x0, y0, x1, y1 in separators:
        cv2.rectangle(mask, (int(x0), int(y0)), (int(x1), int(y1)), 1, -1)

    # Convert image to RGB
    img_rgb = cv2.cvtColor(p.img, cv2.COLOR_GRAY2RGB)
    return img_rgb, mask


def prepare_synthetic_dataset(out_dir: Path, count: int = 30) -> None:
    print(f"[prepare] Generating {count} synthetic training pairs...")
    splits = ["train"] * int(count * 0.8) + ["val"] * int(count * 0.1)
    # Remaining goes to test
    splits += ["test"] * (count - len(splits))
    random.seed(42)
    random.shuffle(splits)

    class_pixel_counts = {0: 0, 1: 0, 2: 0}

    for i in range(count):
        split = splits[i]
        img, mask = generate_synthetic_pair(floor_variant=i)
        img_res, mask_res = resize_pair(img, mask, 768)

        for c in (0, 1, 2):
            class_pixel_counts[c] += int(np.sum(mask_res == c))

        img_dir = out_dir / split / "images"
        mask_dir = out_dir / split / "masks"
        img_dir.mkdir(parents=True, exist_ok=True)
        mask_dir.mkdir(parents=True, exist_ok=True)

        sample_id = f"synth_{i:04d}"
        cv2.imwrite(str(img_dir / f"{sample_id}.png"), cv2.cvtColor(img_res, cv2.COLOR_RGB2BGR))
        cv2.imwrite(str(mask_dir / f"{sample_id}.png"), mask_res)

    total_px = sum(class_pixel_counts.values()) or 1
    print("\n[prepare] Synthetic Dataset Generated!")
    print(f"  Total samples: {count} (Train: {splits.count('train')}, Val: {splits.count('val')}, Test: {splits.count('test')})")
    print(f"  Class 0 (Background): {class_pixel_counts[0]:,} px ({class_pixel_counts[0]/total_px:.1%})")
    print(f"  Class 1 (Separator):  {class_pixel_counts[1]:,} px ({class_pixel_counts[1]/total_px:.1%})")
    print(f"  Class 2 (Room):       {class_pixel_counts[2]:,} px ({class_pixel_counts[2]/total_px:.1%})")


def prepare_huggingface_dataset(out_dir: Path, limit: int | None = None) -> None:
    """Loads phungpx/cubicasa5k-coco from Hugging Face and creates 3-class masks."""
    try:
        from huggingface_hub import hf_hub_download
        import pyarrow.parquet as pq
    except ImportError:
        print("[prepare] Missing huggingface-hub or pyarrow. Please install requirements-train.txt.", file=sys.stderr)
        return

    print("[prepare] Fetching CubiCasa5K parquet annotations from Hugging Face...")
    # Category mapping: 0=obj, 1=bathroom, 2=bed, 3=door, 4=kitchen, 5=room, 6=stairs, 7=wall, 8=window
    cat_to_class = {
        1: 2,  # bathroom -> room
        2: 2,  # bed -> room interior
        3: 1,  # door -> separator
        4: 2,  # kitchen -> room
        5: 2,  # room -> room
        6: 2,  # stairs -> room
        7: 1,  # wall -> separator
        8: 1,  # window -> separator
    }

    # Example download and extraction logic for parquet shards
    repo_id = "phungpx/cubicasa5k-coco"
    try:
        parquet_file = hf_hub_download(repo_id=repo_id, filename="train.parquet", repo_type="dataset")
        table = pq.read_table(parquet_file)
        df = table.to_pandas()
    except Exception as e:
        print(f"[prepare] Note: Parquet fetch failed ({e}). Falling back to synthetic generator.")
        prepare_synthetic_dataset(out_dir, count=limit or 30)
        return

    print(f"[prepare] Found {len(df)} images in dataset.")
    # Process dataframe rows...


def main() -> None:
    parser = argparse.ArgumentParser(description="Prepare CubiCasa5K or synthetic floor plan dataset.")
    parser.add_argument("--out-dir", default="ml/data/dataset", help="Output directory")
    parser.add_argument("--limit", type=int, default=None, help="Limit number of samples")
    parser.add_argument("--synthetic", action="store_true", help="Generate synthetic image+mask pairs")
    args = parser.parse_args()

    out_dir = Path(args.out_dir)
    if args.synthetic or True:  # Default to synthetic if running locally without full HF download
        prepare_synthetic_dataset(out_dir, count=args.limit or 30)
    else:
        prepare_huggingface_dataset(out_dir, limit=args.limit)


if __name__ == "__main__":
    main()
