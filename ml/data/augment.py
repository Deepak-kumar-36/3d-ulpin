"""Photo-style data augmentation applied jointly to image and segmentation mask.

Preserves nearest-neighbor interpolation on the mask at all times.
"""
from __future__ import annotations

import random
from pathlib import Path

import cv2
import numpy as np


class JointAugmentor:
    def __init__(self, seed: int | None = None):
        self.rng = np.random.default_rng(seed)

    def random_affine_and_perspective(
        self, img: np.ndarray, mask: np.ndarray
    ) -> tuple[np.ndarray, np.ndarray]:
        h, w = img.shape[:2]

        # 1. Rotation +- 10 deg, Scale 0.9 - 1.1
        angle = self.rng.uniform(-10.0, 10.0)
        scale = self.rng.uniform(0.92, 1.08)
        center = (w / 2.0, h / 2.0)
        M_rot = cv2.getRotationMatrix2D(center, angle, scale)

        img_rot = cv2.warpAffine(img, M_rot, (w, h), flags=cv2.INTER_LINEAR, borderValue=(255, 255, 255))
        mask_rot = cv2.warpAffine(mask, M_rot, (w, h), flags=cv2.INTER_NEAREST, borderValue=0)

        # 2. Perspective +- 8%
        pts1 = np.float32([[0, 0], [w, 0], [w, h], [0, h]])
        dx = w * 0.08
        dy = h * 0.08
        pts2 = np.float32([
            [self.rng.uniform(0, dx), self.rng.uniform(0, dy)],
            [w - self.rng.uniform(0, dx), self.rng.uniform(0, dy)],
            [w - self.rng.uniform(0, dx), h - self.rng.uniform(0, dy)],
            [self.rng.uniform(0, dx), h - self.rng.uniform(0, dy)]
        ])
        M_persp = cv2.getPerspectiveTransform(pts1, pts2)

        img_persp = cv2.warpPerspective(img_rot, M_persp, (w, h), flags=cv2.INTER_LINEAR, borderValue=(255, 255, 255))
        mask_persp = cv2.warpPerspective(mask_rot, M_persp, (w, h), flags=cv2.INTER_NEAREST, borderValue=0)

        return img_persp, mask_persp

    def add_lighting_gradient_and_shadows(self, img: np.ndarray) -> np.ndarray:
        h, w = img.shape[:2]
        img_f = img.astype(np.float32)

        # Uneven lighting gradient
        grad_type = self.rng.integers(0, 3)
        if grad_type == 0:  # Horizontal
            grad = np.linspace(self.rng.uniform(0.7, 0.9), self.rng.uniform(1.0, 1.2), w)[None, :, None]
        elif grad_type == 1:  # Vertical
            grad = np.linspace(self.rng.uniform(0.7, 0.9), self.rng.uniform(1.0, 1.2), h)[:, None, None]
        else:  # Diagonal
            x = np.linspace(0, 1, w)
            y = np.linspace(0, 1, h)
            xx, yy = np.meshgrid(x, y)
            grad = (0.75 + 0.4 * (xx + yy) / 2.0)[:, :, None]

        img_f = img_f * grad

        # Soft shadow polygon (simulating phone shadow)
        if self.rng.random() < 0.5:
            shadow_mask = np.ones((h, w), dtype=np.float32)
            pts = np.array([
                [self.rng.integers(0, w // 2), 0],
                [self.rng.integers(w // 2, w), 0],
                [self.rng.integers(w // 3, w), h],
                [0, self.rng.integers(h // 2, h)]
            ], dtype=np.int32)
            cv2.fillPoly(shadow_mask, [pts], 0.65)
            shadow_mask = cv2.GaussianBlur(shadow_mask, (51, 51), 0)
            img_f = img_f * shadow_mask[:, :, None]

        return np.clip(img_f, 0, 255).astype(np.uint8)

    def add_noise_and_blur(self, img: np.ndarray) -> np.ndarray:
        out = img.copy()

        # Gaussian blur or motion blur
        r = self.rng.random()
        if r < 0.35:
            k = self.rng.choice([3, 5])
            out = cv2.GaussianBlur(out, (k, k), 0)
        elif r < 0.6:  # Motion blur
            size = self.rng.choice([3, 5])
            kernel = np.zeros((size, size))
            kernel[int((size - 1) / 2), :] = np.ones(size) / size
            out = cv2.filter2D(out, -1, kernel)

        # Sensor noise
        if self.rng.random() < 0.5:
            sigma = self.rng.uniform(3.0, 12.0)
            noise = self.rng.normal(0, sigma, out.shape)
            out = np.clip(out.astype(np.float32) + noise, 0, 255).astype(np.uint8)

        # JPEG compression artifacts
        if self.rng.random() < 0.6:
            quality = int(self.rng.integers(30, 95))
            encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), quality]
            _, enc = cv2.imencode('.jpg', out, encode_param)
            out = cv2.imdecode(enc, 1)

        return out

    def add_paper_tint_and_inversion(self, img: np.ndarray) -> np.ndarray:
        out = img.astype(np.float32)

        # Occasional inversion (blueprint white lines on blue background)
        if self.rng.random() < 0.15:
            gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
            # Blueprint palette: dark blue background, white/cyan lines
            bg_blue = np.array([120, 50, 15], dtype=np.float32)  # BGR-ish
            line_white = np.array([240, 240, 250], dtype=np.float32)
            alpha = (255 - gray) / 255.0  # Lines are inverted
            out = (1.0 - alpha[:, :, None]) * bg_blue + alpha[:, :, None] * line_white
            return np.clip(out, 0, 255).astype(np.uint8)

        # Paper tint (warm/yellow or cool gray)
        tint = self.rng.choice(["warm", "cool", "neutral"])
        if tint == "warm":
            out[:, :, 0] *= self.rng.uniform(0.95, 1.0)   # Red
            out[:, :, 1] *= self.rng.uniform(0.92, 0.98)  # Green
            out[:, :, 2] *= self.rng.uniform(0.82, 0.90)  # Blue (yellowish)
        elif tint == "cool":
            out[:, :, 0] *= self.rng.uniform(0.88, 0.95)
            out[:, :, 1] *= self.rng.uniform(0.95, 1.0)
            out[:, :, 2] *= self.rng.uniform(0.98, 1.05)

        # Occasional grayscale
        if self.rng.random() < 0.2:
            gray = cv2.cvtColor(np.clip(out, 0, 255).astype(np.uint8), cv2.COLOR_RGB2GRAY)
            out = cv2.cvtColor(gray, cv2.COLOR_GRAY2RGB).astype(np.float32)

        return np.clip(out, 0, 255).astype(np.uint8)

    def add_clutter(self, img: np.ndarray) -> np.ndarray:
        """Adds thin dimension lines and text-like specks without affecting room mask."""
        h, w = img.shape[:2]
        out = img.copy()

        # Dimension lines
        num_lines = self.rng.integers(1, 5)
        for _ in range(num_lines):
            x1, y1 = self.rng.integers(0, w), self.rng.integers(0, h)
            x2 = x1 + self.rng.integers(-100, 100)
            y2 = y1 + self.rng.integers(-100, 100)
            color = (int(self.rng.integers(50, 150)), int(self.rng.integers(50, 150)), int(self.rng.integers(50, 150)))
            cv2.line(out, (int(x1), int(y1)), (int(x2), int(y2)), color, 1, cv2.LINE_AA)

        # Specks / dust
        num_specks = self.rng.integers(10, 50)
        for _ in range(num_specks):
            cx, cy = self.rng.integers(0, w), self.rng.integers(0, h)
            rad = self.rng.integers(1, 3)
            val = int(self.rng.integers(80, 180))
            cv2.circle(out, (int(cx), int(cy)), int(rad), (val, val, val), -1)

        return out

    def __call__(self, img: np.ndarray, mask: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        """Apply full joint augmentation pipeline."""
        img_aug, mask_aug = self.random_affine_and_perspective(img, mask)
        img_aug = self.add_lighting_gradient_and_shadows(img_aug)
        img_aug = self.add_paper_tint_and_inversion(img_aug)
        img_aug = self.add_clutter(img_aug)
        img_aug = self.add_noise_and_blur(img_aug)
        return img_aug, mask_aug


def generate_preview_grid(out_path: Path = Path("ml/outputs/aug_preview.png")) -> None:
    try:
        from .prepare_cubicasa import generate_synthetic_pair, resize_pair
    except ImportError:
        from prepare_cubicasa import generate_synthetic_pair, resize_pair
    out_path.parent.mkdir(parents=True, exist_ok=True)

    base_img, base_mask = generate_synthetic_pair(floor_variant=0)
    base_img, base_mask = resize_pair(base_img, base_mask, 512)

    augmentor = JointAugmentor(seed=42)
    grid_rows = []

    # 4 rows of 4 samples = 16 samples
    for r in range(4):
        row_imgs = []
        for c in range(4):
            img_aug, mask_aug = augmentor(base_img, base_mask)

            # Overlay mask with color: Class 1 = Red, Class 2 = Green
            overlay = img_aug.copy()
            # Green for rooms
            overlay[mask_aug == 2] = (overlay[mask_aug == 2] * 0.5 + np.array([0, 200, 0]) * 0.5).astype(np.uint8)
            # Red for walls/doors
            overlay[mask_aug == 1] = (overlay[mask_aug == 1] * 0.3 + np.array([220, 30, 30]) * 0.7).astype(np.uint8)

            # Small thumb
            thumb = cv2.resize(overlay, (240, 180))
            row_imgs.append(thumb)
        grid_rows.append(np.hstack(row_imgs))

    grid = np.vstack(grid_rows)
    cv2.imwrite(str(out_path), cv2.cvtColor(grid, cv2.COLOR_RGB2BGR))
    print(f"[augment] Saved 16-sample preview grid to {out_path}")


if __name__ == "__main__":
    # If run directly as a script, fix package relative import
    import sys
    _data_dir = Path(__file__).resolve().parent
    if str(_data_dir) not in sys.path:
        sys.path.insert(0, str(_data_dir))
    generate_preview_grid()
