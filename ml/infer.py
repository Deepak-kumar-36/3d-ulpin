"""Standalone ONNX Runtime CPU inference for VERTA semantic segmentation.

Preprocessing:
  1. Convert to RGB
  2. Resize so long side is 768px (preserving aspect ratio)
  3. Pad height and width to nearest multiple of 32
  4. Normalize using ImageNet mean & std: (img/255.0 - mean) / std
  5. Inference via onnxruntime
  6. Softmax probabilities
  7. Unpad and resize class probabilities back to original (H, W, 3)
"""
from __future__ import annotations

import argparse
import os
from pathlib import Path

import cv2
import numpy as np
import onnxruntime as ort

MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)


class VertaONNXPredictor:
    def __init__(self, model_path: str | Path | None = None):
        if model_path is None:
            model_path = os.environ.get("VERTA_MODEL", "ml/models/verta_seg.onnx")
        self.model_path = Path(model_path)
        if not self.model_path.exists():
            raise FileNotFoundError(f"ONNX model not found: {self.model_path}")

        # CPU inference session
        opts = ort.SessionOptions()
        opts.inter_op_num_threads = 2
        opts.intra_op_num_threads = 4
        self.session = ort.InferenceSession(
            str(self.model_path), sess_options=opts, providers=["CPUExecutionProvider"]
        )
        self.input_name = self.session.get_inputs()[0].name

    def preprocess(self, img_rgb: np.ndarray, target_long_side: int = 768) -> tuple[np.ndarray, tuple[int, int], tuple[int, int]]:
        orig_h, orig_w = img_rgb.shape[:2]
        max_dim = max(orig_h, orig_w)
        scale = target_long_side / max_dim
        new_w, new_h = int(round(orig_w * scale)), int(round(orig_h * scale))

        resized = cv2.resize(img_rgb, (new_w, new_h), interpolation=cv2.INTER_AREA)

        # Pad to multiple of 32
        pad_h = (32 - (new_h % 32)) % 32
        pad_w = (32 - (new_w % 32)) % 32
        padded = cv2.copyMakeBorder(resized, 0, pad_h, 0, pad_w, cv2.BORDER_REFLECT_101)

        # Normalize
        norm = (padded.astype(np.float32) / 255.0 - MEAN) / STD
        # Transpose to (1, 3, H, W)
        tensor = np.ascontiguousarray(norm.transpose(2, 0, 1)[None, :, :, :])
        return tensor, (new_h, new_w), (orig_h, orig_w)

    def softmax(self, logits: np.ndarray) -> np.ndarray:
        # logits shape: (1, 3, H, W)
        e_x = np.exp(logits - np.max(logits, axis=1, keepdims=True))
        return e_x / np.sum(e_x, axis=1, keepdims=True)

    def predict_probabilities(self, img_bgr_or_rgb: np.ndarray, is_bgr: bool = True) -> np.ndarray:
        """Runs inference and returns probabilities map shaped (H, W, 3) in original resolution."""
        if is_bgr:
            img_rgb = cv2.cvtColor(img_bgr_or_rgb, cv2.COLOR_BGR2RGB)
        else:
            img_rgb = img_bgr_or_rgb

        orig_h, orig_w = img_rgb.shape[:2]
        input_tensor, (valid_h, valid_w), _ = self.preprocess(img_rgb)

        logits = self.session.run(None, {self.input_name: input_tensor})[0]
        probs = self.softmax(logits)[0]  # (3, Padded_H, Padded_W)

        # Unpad
        valid_probs = probs[:, :valid_h, :valid_w]  # (3, valid_h, valid_w)

        # Transpose to (valid_h, valid_w, 3)
        valid_probs = valid_probs.transpose(1, 2, 0)

        # Resize back to original image size
        if (valid_h, valid_w) != (orig_h, orig_w):
            orig_probs = cv2.resize(valid_probs, (orig_w, orig_h), interpolation=cv2.INTER_LINEAR)
        else:
            orig_probs = valid_probs

        return orig_probs


def run_inference_file(image_path: str | Path, model_path: str | Path | None = None) -> np.ndarray:
    bgr = cv2.imread(str(image_path))
    if bgr is None:
        raise ValueError(f"Could not read image from {image_path}")

    predictor = VertaONNXPredictor(model_path)
    probs = predictor.predict_probabilities(bgr, is_bgr=True)
    return probs


def main() -> None:
    parser = argparse.ArgumentParser(description="Run ONNX inference on a floor plan image")
    parser.add_argument("image", help="Path to input floor plan image")
    parser.add_argument("--model", default="ml/models/verta_seg.onnx", help="Path to ONNX model")
    parser.add_argument("--out", default="ml/outputs/infer_result.png", help="Path to save visual segmentation")
    args = parser.parse_args()

    probs = run_inference_file(args.image, args.model)
    preds = np.argmax(probs, axis=-1).astype(np.uint8)

    # Color map for classes: 0=Black, 1=Red (separator), 2=Green (room)
    color_map = np.zeros((preds.shape[0], preds.shape[1], 3), dtype=np.uint8)
    color_map[preds == 1] = [0, 0, 220]    # Red in BGR
    color_map[preds == 2] = [0, 200, 0]    # Green in BGR

    bgr = cv2.imread(args.image)
    overlay = cv2.addWeighted(bgr, 0.6, color_map, 0.4, 0)

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(out_path), overlay)
    print(f"[infer] Inference complete! Prediction overlay saved to {out_path}")
    print(f"  Class 0 (BG): {(preds == 0).sum():,} px")
    print(f"  Class 1 (Sep): {(preds == 1).sum():,} px")
    print(f"  Class 2 (Room): {(preds == 2).sum():,} px")


if __name__ == "__main__":
    main()
