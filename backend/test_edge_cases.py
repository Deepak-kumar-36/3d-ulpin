import os
import time
import httpx
from pathlib import Path
import numpy as np
import cv2

API_URL = "http://localhost:8000/api/v1/process-floorplan"
TEST_DIR = Path("scratch_tests")
TEST_DIR.mkdir(exist_ok=True)

def create_test_images():
    # 1. Blank white image
    white = np.ones((1000, 1000, 3), dtype=np.uint8) * 255
    cv2.imwrite(str(TEST_DIR / "blank_white.png"), white)
    
    # 2. Solid black image
    black = np.zeros((1000, 1000, 3), dtype=np.uint8)
    cv2.imwrite(str(TEST_DIR / "solid_black.png"), black)
    
    # 3. Corrupted image
    with open(TEST_DIR / "corrupted.png", "w") as f:
        f.write("This is not an image file at all.")

def test_api(img_path):
    print(f"Testing {img_path.name}...")
    try:
        with open(img_path, "rb") as f:
            files = {"file": (img_path.name, f, "image/png")}
            response = httpx.post(API_URL, files=files, timeout=10.0)
            
        if response.status_code == 200:
            if b"error" in response.content:
                print(f"  [Handled Error] {response.json()}")
            else:
                print(f"  [Success] Returned GLB file size: {len(response.content)} bytes")
        else:
            print(f"  [Server Error] {response.status_code}: {response.text}")
    except Exception as e:
        print(f"  [Request Failed] {e}")

if __name__ == "__main__":
    create_test_images()
    for img in TEST_DIR.glob("*.png"):
        test_api(img)
