# How the Floor Plan Detection Works

## 30-Second Version

We take a 2D floor plan image and turn it into clean polygon outlines for each room. The pipeline: convert to grayscale → threshold to isolate walls → seal door gaps with morphological closing → invert to get free space → flood-fill to remove the outside → find contours → simplify polygons with Shapely → export as JSON. No machine learning — just classical computer vision, tuned per plan. Output is a JSON file with unit polygons that Person 2 extrudes into 3D.

---

## 2-Minute Version

**Input**: A floor plan image (PNG/JPG) with walls drawn as dark lines on a light background.

**Step 1 — Wall Extraction**: Convert to grayscale and binarize. We use Otsu's method for clean digital plans (automatic threshold) or adaptive thresholding for scanned plans with uneven lighting. Walls become white, everything else black.

**Step 2 — Noise Removal**: Small connected components (text labels, furniture symbols, dimension lines) are removed by area filtering. This prevents them from creating false walls or holes after the morphological step.

**Step 3 — Door Gap Sealing**: This is the critical step. Doors appear as gaps in walls. We apply morphological closing with a rectangular kernel sized as a fraction (`close_frac`) of the image. This "fills in" gaps smaller than the kernel. `close_frac` is the main tuning knob — too small and doors leak, too large and small rooms merge.

**Step 4 — Free Space Isolation**: Invert the wall mask to get free space. Pad the image with free space and flood-fill from the corner — everything connected to the outside boundary is erased. What remains are enclosed interior rooms.

**Step 5 — Contour Extraction**: Use OpenCV's `findContours` with `RETR_CCOMP` (two-level hierarchy). Outer contours are rooms; child contours are holes (columns, elevator shafts). Filter by area to discard noise.

**Step 6 — Polygon Cleanup**: Simplify contours with `approxPolyDP`, then run through Shapely's `make_valid`, `simplify`, `buffer(0)`, and `orient` to guarantee valid, CCW-wound, topology-clean polygons.

**Output**: JSON with unit polygons, holes, areas, and centroids. Coordinates are in pixels, origin top-left, y-down. Person 2 flips y and extrudes.

---

## Likely Judge Questions

### 1. Why not use deep learning?

Honestly, for a 24-hour hackathon, classical CV is more practical. Deep learning needs training data (thousands of annotated floor plans), GPU time, and careful model selection. Our target floor plans are clean digital drawings with consistent styling — exactly where thresholding and morphology work well. A deep learning approach would be better for diverse, hand-drawn, or photographed plans, but we'd need weeks, not hours. We chose reliability over generality.

### 2. How do you handle door gaps?

Morphological closing with a rectangular kernel. The kernel size is `close_frac × min(height, width)` of the image. Default is 3% — a 1200px-tall image gets a ~36px kernel, which seals standard door openings. For plans with wider doors (e.g. double doors, garage entries), we raise `close_frac` per plan via `plan_configs.py`. The trade-off: bigger kernels seal bigger gaps but can merge narrow corridors or small rooms.

### 3. What fails?

- **Very wide openings** (open-plan layouts, balconies) can leak rooms to the outside if `close_frac` isn't high enough.
- **Curved walls** get approximated as polygons — fine for most plans but loses fidelity on arcs.
- **Dense text labels** can survive speck removal if they're large enough, creating false wall segments.
- **Low-contrast or hand-drawn plans** with inconsistent line weight may need adaptive thresholding and per-plan tuning.
- **Overlapping rooms** (split-level plans, mezzanines) aren't handled — we assume a single 2D slice per floor.

### 4. How do you validate geometry?

Every polygon goes through Shapely's `make_valid()` (fixes self-intersections), `simplify()` (removes redundant points), `buffer(0)` (cleans topology), and `orient()` (enforces CCW exterior, CW holes). After cleanup, we check `is_valid` and `area > 0`. Our test suite verifies every output polygon passes these checks, rings are open (no repeated first point), and all JSON contract fields are present.

### 5. What would you improve with more time?

1. **Scale extraction**: OCR dimension annotations to auto-set `px_per_meter` instead of requiring manual input.
2. **Room labeling**: Use text detection (EAST/Tesseract) to extract room names and attach them to units.
3. **Adaptive `close_frac`**: Instead of one global value, analyze gap widths locally and vary the kernel.
4. **Wall thickness detection**: Automatically measure wall thickness to set better thresholds.
5. **Multi-floor alignment**: Register floors vertically using stairwell/elevator positions.
