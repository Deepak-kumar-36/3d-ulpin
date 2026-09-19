import httpx
import sys

API_URL = "http://localhost:8000/api/v1/process-floorplan"

def test_api(img_path):
    print(f"Testing {img_path}...")
    try:
        with open(img_path, "rb") as f:
            files = {"file": ("test.jpg", f, "image/jpeg")}
            response = httpx.post(API_URL, files=files, timeout=60.0)
            
        if response.status_code == 200:
            print(f"  [Success] Returned GLB file size: {len(response.content)} bytes")
        else:
            print(f"  [Server Error] {response.status_code}: {response.text}")
    except Exception as e:
        print(f"  [Request Failed] {e}")

if __name__ == "__main__":
    test_api(sys.argv[1])
