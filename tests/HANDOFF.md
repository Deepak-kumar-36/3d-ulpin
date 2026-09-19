# HANDOFF — Vision → 3D Module

> JSON contract for Person 2. Do not break this without coordinating.

## How to Get Floor Data

```bash
# Generate stubs immediately (no images needed):
python run_vision.py stub L1 L2 L3 --out out

# Detect from real floor plans:
python run_vision.py run plans/floor1.png --out out --debug --save-cache

# Demo-day safety — use cached results (works offline):
set USE_CACHED=1
python run_vision.py run plans/*.png --out out
```

Output lands in `out/<floor_id>.json`.

---

## JSON Contract

```jsonc
{
  "floor_id": "L1",                      // string, matches filename stem
  "image_size": [1600, 1200],            // [width, height] in pixels
  "px_per_meter": null,                  // null until scale is known; set manually if needed
  "coord_system": {
    "origin": "top-left",                // (0,0) is the top-left corner of the image
    "y_axis": "down",                    // y increases downward (standard image coords)
    "exterior_winding": "ccw",           // exterior rings wind counter-clockwise
    "closed_ring": false                 // first point is NOT repeated as last point
  },
  "units": [
    {
      "id": "L1-01",                     // floor_id + sequential number
      "polygon": [[x, y], ...],          // exterior ring, CCW, open (see above)
      "holes": [[[x, y], ...]],          // list of hole rings (columns, shafts), CW, open
      "area_px": 12345.6,               // area in square pixels
      "centroid": [400.5, 300.2]         // centroid in pixel coords
    }
  ],
  "source": "live"                       // "live", "cache", "cache-fallback", or "stub"
}
```

---

## Key Rules

| Rule | Detail |
|------|--------|
| **Coordinates** | All values are in **pixels**, origin at top-left of the image |
| **Y-axis** | Points **down** (standard image convention) |
| **Winding** | Exterior rings are **CCW** in image coords; holes are **CW** |
| **Open rings** | The first vertex is **not** repeated at the end. To close a ring for rendering, append `ring[0]` |
| **Holes** | Represent interior voids (columns, elevator shafts). Most units have `[]` |
| **Source field** | Tells you where the data came from. `"stub"` = dummy data for testing |

---

## Flipping Y for 3D

Image y points down; 3D y typically points up. To convert:

```
y_3d = image_height - y_pixel
```

Where `image_height` is `image_size[1]` from the JSON. Apply this to every coordinate in `polygon` and `holes`.

---

## What `source` Means

| Value | Meaning |
|-------|---------|
| `live` | Freshly detected from the image — most accurate |
| `cache` | Loaded from a pre-saved JSON (demo-day safety switch) |
| `cache-fallback` | Live detection failed; fell back to cached data |
| `stub` | Synthetic placeholder — use for development only |
