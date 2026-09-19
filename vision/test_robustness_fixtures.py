"""Tests for Vision Robustness"""
import cv2
import numpy as np
from pathlib import Path

def create_synthetic_tests():
    base_img_path = Path("plans/L1.png")
    if not base_img_path.exists():
        print("L1.png not found, skipping fixture generation.")
        return
        
    out_dir = Path("plans/real_messy")
    out_dir.mkdir(parents=True, exist_ok=True)
    
    img = cv2.imread(str(base_img_path), cv2.IMREAD_GRAYSCALE)
    if img is None:
        return
        
    h, w = img.shape
    
    # 1. Blurred and slightly rotated
    center = (w // 2, h // 2)
    M = cv2.getRotationMatrix2D(center, 3, 1.0)
    rotated = cv2.warpAffine(img, M, (w, h), borderValue=255)
    blurred = cv2.GaussianBlur(rotated, (7, 7), 0)
    cv2.imwrite(str(out_dir / "L1_blurred.jpg"), blurred)
    
    # 2. Inverted blueprint (dark bg, light lines)
    inverted = cv2.bitwise_not(img)
    # Add a slight blue tint to make it a "blueprint" (convert to BGR first)
    blueprint = cv2.cvtColor(inverted, cv2.COLOR_GRAY2BGR)
    blueprint[:, :, 0] = np.clip(blueprint[:, :, 0] + 100, 0, 255) # Add blue
    cv2.imwrite(str(out_dir / "L1_blueprint.png"), blueprint)
    
    # 3. Hatched walls simulation
    # We'll just draw some thin random lines across the white areas
    hatched = img.copy()
    for _ in range(500):
        x1, y1 = np.random.randint(0, w), np.random.randint(0, h)
        x2, y2 = x1 + np.random.randint(-50, 50), y1 + np.random.randint(-50, 50)
        if hatched[y1, x1] == 255: # only on free space
            cv2.line(hatched, (x1, y1), (x2, y2), 0, 1) # draw thin black line
    cv2.imwrite(str(out_dir / "L1_hatched.png"), hatched)
    
    print("Fixtures created in plans/real_messy/")

if __name__ == "__main__":
    create_synthetic_tests()
