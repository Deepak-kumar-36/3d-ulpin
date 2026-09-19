"""Train 3-class segmentation model with PyTorch and segmentation_models_pytorch.

Model: smp.Unet (ResNet34 encoder, ImageNet pretrained)
Loss: CrossEntropy + Dice Loss
Optimizer: AdamW (lr 3e-4) with Cosine Annealing schedule
Checkpointing: Saves every epoch, tracks best model by mean IoU(classes 1, 2)
"""
from __future__ import annotations

import argparse
import csv
import os
import random
import sys
from pathlib import Path

import cv2
import numpy as np

# Ensure PyTorch is available (installed on Colab or training environment)
try:
    import torch
    import torch.nn as nn
    from torch.utils.data import DataLoader, Dataset
    import segmentation_models_pytorch as smp
except ImportError:
    torch = None


class FloorPlanDataset(Dataset):
    def __init__(self, data_dir: Path, split: str = "train", crop_size: int = 512, augment: bool = True):
        self.crop_size = crop_size
        self.augment = augment
        self.images_dir = data_dir / split / "images"
        self.masks_dir = data_dir / split / "masks"
        self.img_files = sorted(list(self.images_dir.glob("*.png")) + list(self.images_dir.glob("*.jpg")))

        if augment:
            try:
                from ml.data.augment import JointAugmentor
                self.augmentor = JointAugmentor()
            except ImportError:
                self.augmentor = None
        else:
            self.augmentor = None

        # ImageNet normalization statistics
        self.mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        self.std = np.array([0.229, 0.224, 0.225], dtype=np.float32)

    def __len__(self) -> int:
        return len(self.img_files)

    def __getitem__(self, idx: int):
        img_path = self.img_files[idx]
        mask_path = self.masks_dir / img_path.name
        if not mask_path.exists():
            mask_path = self.masks_dir / f"{img_path.stem}.png"

        bgr = cv2.imread(str(img_path))
        if bgr is None:
            raise RuntimeError(f"Failed to read image: {img_path}")
        img = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
        mask = cv2.imread(str(mask_path), cv2.IMREAD_GRAYSCALE)
        if mask is None:
            mask = np.zeros(img.shape[:2], dtype=np.uint8)

        # Apply photo degradations
        if self.augment and self.augmentor is not None:
            img, mask = self.augmentor(img, mask)

        # Random 512 crop for training, or center pad/crop for validation
        h, w = img.shape[:2]
        cs = self.crop_size
        if h < cs or w < cs:
            pad_h = max(0, cs - h)
            pad_w = max(0, cs - w)
            img = cv2.copyMakeBorder(img, 0, pad_h, 0, pad_w, cv2.BORDER_CONSTANT, value=(255, 255, 255))
            mask = cv2.copyMakeBorder(mask, 0, pad_h, 0, pad_w, cv2.BORDER_CONSTANT, value=0)
            h, w = img.shape[:2]

        if self.augment:
            y1 = random.randint(0, h - cs)
            x1 = random.randint(0, w - cs)
        else:
            y1 = max(0, (h - cs) // 2)
            x1 = max(0, (w - cs) // 2)

        img_crop = img[y1 : y1 + cs, x1 : x1 + cs]
        mask_crop = mask[y1 : y1 + cs, x1 : x1 + cs]

        # Normalize to [0, 1] then ImageNet standard
        img_norm = (img_crop.astype(np.float32) / 255.0 - self.mean) / self.std
        img_tensor = torch.from_numpy(img_norm.transpose(2, 0, 1)).float()
        mask_tensor = torch.from_numpy(mask_crop).long()

        return img_tensor, mask_tensor


def compute_iou(pred: torch.Tensor, target: torch.Tensor, num_classes: int = 3) -> dict[int, float]:
    ious = {}
    for c in range(num_classes):
        p = (pred == c)
        t = (target == c)
        intersection = (p & t).sum().item()
        union = (p | t).sum().item()
        if union == 0:
            ious[c] = 1.0  # Empty in both
        else:
            ious[c] = intersection / float(union)
    return ious


def train_epoch(model, loader, optimizer, criterion, scaler, device) -> tuple[float, dict[int, float]]:
    model.train()
    total_loss = 0.0
    accum_iou = {0: 0.0, 1: 0.0, 2: 0.0}
    num_batches = len(loader)

    for imgs, masks in loader:
        imgs, masks = imgs.to(device), masks.to(device)
        optimizer.zero_grad()

        with torch.amp.autocast(device_type=device.type if device.type != "mps" else "cpu", enabled=(device.type == "cuda")):
            logits = model(imgs)
            loss = criterion(logits, masks)

        if scaler is not None and device.type == "cuda":
            scaler.scale(loss).backward()
            scaler.step(optimizer)
            scaler.update()
        else:
            loss.backward()
            optimizer.step()

        total_loss += loss.item()
        preds = torch.argmax(logits, dim=1)
        b_iou = compute_iou(preds, masks)
        for c in range(3):
            accum_iou[c] += b_iou[c]

    mean_loss = total_loss / max(1, num_batches)
    mean_ious = {c: accum_iou[c] / max(1, num_batches) for c in range(3)}
    return mean_loss, mean_ious


def validate(model, loader, criterion, device) -> tuple[float, dict[int, float]]:
    model.eval()
    total_loss = 0.0
    accum_iou = {0: 0.0, 1: 0.0, 2: 0.0}
    num_batches = len(loader)

    with torch.no_grad():
        for imgs, masks in loader:
            imgs, masks = imgs.to(device), masks.to(device)
            logits = model(imgs)
            loss = criterion(logits, masks)
            total_loss += loss.item()
            preds = torch.argmax(logits, dim=1)
            b_iou = compute_iou(preds, masks)
            for c in range(3):
                accum_iou[c] += b_iou[c]

    mean_loss = total_loss / max(1, num_batches)
    mean_ious = {c: accum_iou[c] / max(1, num_batches) for c in range(3)}
    return mean_loss, mean_ious


def main() -> None:
    parser = argparse.ArgumentParser(description="Train VERTA segmentation model")
    parser.add_argument("--data-dir", default="ml/data/dataset", help="Path to prepared dataset")
    parser.add_argument("--out", default="ml/models", help="Checkpoint output directory")
    parser.add_argument("--epochs", type=int, default=30)
    parser.add_argument("--batch-size", type=int, default=None)
    parser.add_argument("--lr", type=float, default=3e-4)
    parser.add_argument("--resume", default=None, help="Path to checkpoint to resume from")
    args = parser.parse_args()

    if torch is None:
        print("[train] PyTorch and segmentation_models_pytorch are not installed locally.", file=sys.stderr)
        print("[train] Full training is designed for Google Colab GPU (see ml/train_colab.ipynb).", file=sys.stderr)
        return

    # Seed everything
    torch.manual_seed(42)
    np.random.seed(42)
    random.seed(42)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[train] Training on device: {device}")

    # Auto batch size
    batch_size = args.batch_size
    if batch_size is None:
        batch_size = 8 if device.type == "cuda" else 2

    data_dir = Path(args.data_dir)
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    train_ds = FloorPlanDataset(data_dir, split="train", crop_size=512, augment=True)
    val_ds = FloorPlanDataset(data_dir, split="val", crop_size=512, augment=False)

    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True, num_workers=0 if os.name == 'nt' else 2)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False, num_workers=0)

    # Architecture: ResNet34 Unet
    model = smp.Unet(
        encoder_name="resnet34",
        encoder_weights="imagenet",
        in_channels=3,
        classes=3
    ).to(device)

    dice_loss = smp.losses.DiceLoss(mode="multiclass")
    ce_loss = nn.CrossEntropyLoss()

    def criterion(logits, targets):
        return ce_loss(logits, targets) + dice_loss(logits, targets)

    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs, eta_min=1e-6)
    scaler = torch.amp.GradScaler('cuda') if device.type == "cuda" else None

    start_epoch = 1
    best_target_iou = 0.0

    if args.resume and Path(args.resume).exists():
        print(f"[train] Resuming from checkpoint: {args.resume}")
        checkpoint = torch.load(args.resume, map_location=device)
        model.load_state_dict(checkpoint["model_state_dict"])
        optimizer.load_state_dict(checkpoint["optimizer_state_dict"])
        start_epoch = checkpoint["epoch"] + 1
        best_target_iou = checkpoint.get("best_target_iou", 0.0)

    csv_path = out_dir / "training_log.csv"
    csv_exists = csv_path.exists()
    csv_file = open(csv_path, "a", newline="")
    csv_writer = csv.writer(csv_file)
    if not csv_exists:
        csv_writer.writerow(["epoch", "train_loss", "val_loss", "iou_bg", "iou_sep", "iou_room", "mean_sep_room_iou"])

    print(f"[train] Starting training for {args.epochs} epochs...")
    for epoch in range(start_epoch, args.epochs + 1):
        train_loss, train_ious = train_epoch(model, train_loader, optimizer, criterion, scaler, device)
        val_loss, val_ious = validate(model, val_loader, criterion, device)
        scheduler.step()

        # Score by mean IoU of Class 1 (separator) and Class 2 (rooms)
        target_iou = (val_ious[1] + val_ious[2]) / 2.0

        print(
            f"Epoch [{epoch:02d}/{args.epochs:02d}] "
            f"Train Loss: {train_loss:.4f} | Val Loss: {val_loss:.4f} | "
            f"IoU Sep: {val_ious[1]:.3f}, Room: {val_ious[2]:.3f} (Mean: {target_iou:.3f})"
        )

        csv_writer.writerow([epoch, train_loss, val_loss, val_ious[0], val_ious[1], val_ious[2], target_iou])
        csv_file.flush()

        # Save latest checkpoint
        ckpt = {
            "epoch": epoch,
            "model_state_dict": model.state_dict(),
            "optimizer_state_dict": optimizer.state_dict(),
            "best_target_iou": best_target_iou,
            "val_ious": val_ious,
        }
        torch.save(ckpt, out_dir / "latest_checkpoint.pth")

        # Save best checkpoint
        if target_iou > best_target_iou:
            best_target_iou = target_iou
            torch.save(ckpt, out_dir / "best_model.pth")
            print(f"  --> Saved new best model (Mean IoU: {target_iou:.4f})")

    csv_file.close()
    print(f"[train] Training complete. Best Mean IoU: {best_target_iou:.4f}")


if __name__ == "__main__":
    main()
