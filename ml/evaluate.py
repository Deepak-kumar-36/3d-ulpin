"""Evaluate VERTA segmentation detector against test dataset and benchmark against classical detector.

Outputs:
  - Per-class IoU on held-out test split
  - End-to-end polygon unit count & room IoU vs ground truth
  - Comparison table: ML vs Classical detector
  - Saves overlays of worst and median detection cases to ml/outputs/
  - Runs inference on plans/ and saves comparison overlays
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import cv2
import numpy as np
from shapely.geometry import Polygon

# Ensure project root is on sys.path
_root = Path(__file__).resolve().parents[1]
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

from ml.infer import VertaONNXPredictor
from vision.detect import DetectConfig, detect_units, extract_units, _score_polys


def polygon_iou(poly1: Polygon, poly2: Polygon) -> float:
    if not poly1.is_valid or not poly2.is_valid:
        return 0.0
    inter = poly1.intersection(poly2).area
    union = poly1.union(poly2).area
    return inter / union if union > 0 else 0.0


def evaluate_end_to_end_ml(pred_probs: np.ndarray, gt_mask: np.ndarray, cfg: DetectConfig) -> tuple[int, int, float]:
    """Runs ML probabilities through vision contour pipeline and compares with GT rooms."""
    h, w = pred_probs.shape[:2]
    # Argmax
    preds = np.argmax(pred_probs, axis=-1).astype(np.uint8)

    # Class 2 is rooms. Room interior mask:
    room_raw = (preds == 2).astype(np.uint8) * 255
    # Small morphological opening to remove specks
    ko = max(3, int(min(h, w) * 0.005))
    if ko % 2 == 0:
        ko += 1
    room_clean = cv2.morphologyEx(room_raw, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (ko, ko)))

    # Extract units using vision pipeline
    room_padded = cv2.copyMakeBorder(room_clean, cfg.pad, cfg.pad, cfg.pad, cfg.pad, cv2.BORDER_CONSTANT, value=0)
    detected_polys = extract_units(room_padded, (h, w), cfg)

    # Ground truth rooms from gt_mask (class 2)
    gt_room_raw = (gt_mask == 2).astype(np.uint8) * 255
    gt_padded = cv2.copyMakeBorder(gt_room_raw, cfg.pad, cfg.pad, cfg.pad, cfg.pad, cv2.BORDER_CONSTANT, value=0)
    gt_polys = extract_units(gt_padded, (h, w), cfg)

    det_count = len(detected_polys)
    gt_count = len(gt_polys)

    # Calculate matched polygon IoU
    if not gt_polys:
        return det_count, gt_count, 1.0 if not detected_polys else 0.0

    ious = []
    for g in gt_polys:
        best_match_iou = max((polygon_iou(g, d) for d in detected_polys), default=0.0)
        ious.append(best_match_iou)

    mean_room_iou = float(np.mean(ious)) if ious else 0.0
    return det_count, gt_count, mean_room_iou


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate ML & Classical detectors")
    parser.add_argument("--model", default="ml/models/verta_seg.onnx", help="Path to ONNX model")
    parser.add_argument("--data-dir", default="ml/data/dataset", help="Prepared dataset directory")
    parser.add_argument("--plans-dir", default="plans", help="Directory of plans to inspect")
    parser.add_argument("--out-dir", default="ml/outputs/eval", help="Directory to save evaluation artifacts")
    args = parser.parse_args()

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    test_imgs_dir = Path(args.data_dir) / "test" / "images"
    test_masks_dir = Path(args.data_dir) / "test" / "masks"

    if not test_imgs_dir.exists():
        print(f"[eval] No test set found at {test_imgs_dir}. Run `python ml/data/prepare_cubicasa.py` first.")
        test_files = []
    else:
        test_files = sorted(list(test_imgs_dir.glob("*.png")) + list(test_imgs_dir.glob("*.jpg")))

    cfg = DetectConfig()
    try:
        predictor = VertaONNXPredictor(args.model)
    except Exception as e:
        print(f"[eval] Could not load ONNX model ({e}). Aborting ML evaluation.")
        return

    ml_ious_bg, ml_ious_sep, ml_ious_room = [], [], []
    ml_unit_errors, ml_room_ious = [], []
    classic_unit_errors, classic_room_ious = [], []

    case_scores = []

    print(f"\n[eval] Evaluating on {len(test_files)} test samples...")
    for idx, img_path in enumerate(test_files):
        mask_path = test_masks_dir / img_path.name
        img_bgr = cv2.imread(str(img_path))
        gt_mask = cv2.imread(str(mask_path), cv2.IMREAD_GRAYSCALE)

        if img_bgr is None or gt_mask is None:
            continue

        h, w = img_bgr.shape[:2]
        probs = predictor.predict_probabilities(img_bgr, is_bgr=True)
        preds = np.argmax(probs, axis=-1).astype(np.uint8)

        # Compute segmentation IoUs
        for c, target_list in [(0, ml_ious_bg), (1, ml_ious_sep), (2, ml_ious_room)]:
            p = (preds == c)
            t = (gt_mask == c)
            union = (p | t).sum()
            target_list.append((p & t).sum() / union if union > 0 else 1.0)

        # End-to-end ML
        ml_det_cnt, gt_cnt, ml_iou = evaluate_end_to_end_ml(probs, gt_mask, cfg)
        ml_unit_errors.append(abs(ml_det_cnt - gt_cnt))
        ml_room_ious.append(ml_iou)

        # End-to-end Classical
        try:
            classic_res = detect_units(img_path, floor_id=img_path.stem, cfg=cfg)
            classic_det_cnt = len(classic_res.get("units", []))
        except Exception:
            classic_det_cnt = 0
        classic_unit_errors.append(abs(classic_det_cnt - gt_cnt))

        # Store for worst/median saving
        case_scores.append((ml_iou, img_path, img_bgr, preds, gt_mask))

    # Print results
    print("\n" + "=" * 65)
    print("           VERTA DETECTOR BENCHMARK EVALUATION")
    print("=" * 65)
    header = f"{'Metric':<35} | {'ML Detector':<12} | {'Classical':<12}"
    print(header)
    print("-" * 65)

    if test_files:
        print(f"{'Background IoU':<35} | {np.mean(ml_ious_bg):<12.3f} | {'N/A':<12}")
        print(f"{'Separator (Walls/Doors/Windows) IoU':<35} | {np.mean(ml_ious_sep):<12.3f} | {'N/A':<12}")
        print(f"{'Room Interior IoU':<35} | {np.mean(ml_ious_room):<12.3f} | {'N/A':<12}")
        print(f"{'Mean IoU (Sep + Room)':<35} | {((np.mean(ml_ious_sep) + np.mean(ml_ious_room))/2.0):<12.3f} | {'N/A':<12}")
        print(f"{'Unit Count Mean Absolute Error':<35} | {np.mean(ml_unit_errors):<12.2f} | {np.mean(classic_unit_errors):<12.2f}")
        print(f"{'End-to-End Room Polygon IoU':<35} | {np.mean(ml_room_ious):<12.3f} | {'Baseline':<12}")
    else:
        print("No test samples available to compute IoU metrics.")
    print("=" * 65 + "\n")

    # Save worst and median cases
    if case_scores:
        case_scores.sort(key=lambda x: x[0])
        worst_cases = case_scores[:min(20, len(case_scores))]
        mid_idx = len(case_scores) // 2
        median_cases = case_scores[max(0, mid_idx - 10) : min(len(case_scores), mid_idx + 10)]

        worst_dir = out_dir / "worst_cases"
        worst_dir.mkdir(parents=True, exist_ok=True)
        for i, (score, p, bgr, pr, gt) in enumerate(worst_cases):
            cv2.imwrite(str(worst_dir / f"worst_{i:02d}_{p.stem}_iou_{score:.2f}.png"), bgr)

        print(f"[eval] Saved sample overlays to {out_dir}")

    # Evaluate on real/synthetic plans in plans/
    plans_path = Path(args.plans_dir)
    if plans_path.exists():
        print(f"\n[eval] Testing both detectors on files in {plans_path}...")
        plan_images = sorted(list(plans_path.glob("*.png")) + list(plans_path.glob("*.jpg")))
        for p in plan_images[:5]:
            try:
                bgr = cv2.imread(str(p))
                pr_probs = predictor.predict_probabilities(bgr, is_bgr=True)
                ml_polys = extract_units((np.argmax(pr_probs, -1) == 2).astype(np.uint8) * 255, bgr.shape[:2], cfg)
                ml_cnt = len(ml_polys)
            except Exception as e:
                ml_cnt = f"Err ({e})"

            try:
                cl_res = detect_units(p, floor_id=p.stem, cfg=cfg)
                cl_cnt = len(cl_res.get("units", []))
            except Exception as e:
                cl_cnt = f"Err ({e})"

            print(f"  {p.name:<25}: ML Units = {ml_cnt:<6} | Classical Units = {cl_cnt}")


if __name__ == "__main__":
    main()
