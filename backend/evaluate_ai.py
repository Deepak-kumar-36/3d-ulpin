import os
import time
import httpx
from pathlib import Path
from tqdm import tqdm

API_URL = "http://localhost:8000/api/v1/process-floorplan"
PLANS_DIR = Path("plans")

def main():
    if not PLANS_DIR.exists():
        print(f"Error: {PLANS_DIR} does not exist.")
        return

    images = list(PLANS_DIR.glob("*.png")) + list(PLANS_DIR.glob("*.jpg"))
    if not images:
        print("No images found to evaluate.")
        return

    print(f"Starting AI Evaluation on {len(images)} floor plans...")
    
    results = []
    
    # We use a synchronous client with increased timeout since AI models can take time
    with httpx.Client(timeout=60.0) as client:
        for img_path in tqdm(images, desc="Evaluating AI"):
            start_time = time.time()
            
            try:
                with open(img_path, "rb") as f:
                    files = {"file": (img_path.name, f, "image/png")}
                    response = client.post(API_URL, files=files)
                
                duration = time.time() - start_time
                
                if response.status_code == 200:
                    content_len = len(response.content)
                    if content_len > 100:  # GLB files should be bigger than 100 bytes
                        status = "SUCCESS"
                    else:
                        status = "FAILED (Empty 3D Model)"
                else:
                    status = f"FAILED ({response.status_code}: {response.text})"
                    content_len = 0
                    
            except Exception as e:
                duration = time.time() - start_time
                status = f"ERROR ({str(e)})"
                content_len = 0
                
            results.append({
                "file": img_path.name,
                "status": status,
                "duration": duration,
                "size_kb": content_len / 1024.0
            })
            
    # Write the report
    report_path = Path("AI_EVALUATION.md")
    with open(report_path, "w", encoding="utf-8") as f:
        f.write("# End-to-End AI Evaluation Report\n\n")
        
        success_count = sum(1 for r in results if r["status"] == "SUCCESS")
        total = len(results)
        
        f.write(f"**Total Plans Evaluated:** {total}\n")
        f.write(f"**Success Rate:** {success_count}/{total} ({(success_count/total)*100:.1f}%)\n\n")
        
        f.write("## Detailed Results\n")
        f.write("| Floor Plan | Status | Processing Time (s) | 3D Output Size (KB) |\n")
        f.write("|------------|--------|---------------------|---------------------|\n")
        
        for r in results:
            f.write(f"| {r['file']} | {r['status']} | {r['duration']:.2f}s | {r['size_kb']:.2f} KB |\n")
            
    print(f"\nEvaluation complete! Report saved to {report_path.absolute()}")

if __name__ == "__main__":
    main()
