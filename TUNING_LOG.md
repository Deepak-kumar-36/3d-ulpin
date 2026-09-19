# Tuning Log

Results from running each floor plan through the detection pipeline with `--debug`.

## Synthetic Plans

| floor_id | Config Overrides | Units | Status | Notes |
|----------|-----------------|-------|--------|-------|
| `synthetic_L1` | defaults (`close_frac=0.03`) | 6 | ✅ Pass | Clean detection, all 6 rooms separated correctly. Column detected as small feature inside unit 1. |
| `synthetic_thick` | defaults | 6 | ✅ Pass | Thicker walls (T=18) handled without config changes. Slightly smaller unit areas due to thicker walls. |
| `synthetic_noisy` | `threshold="adaptive"`, `blur_ksize=5` | 6 | ✅ Pass | Gaussian noise + blur handled by switching to adaptive thresholding. Default Otsu also works but adaptive is more robust. |
| `synthetic_wide_gaps` | `close_frac=0.055` | 6 | ✅ Pass | Door gaps widened to 55px. Default `close_frac=0.03` leaked units to outside. Raised to 0.055 to seal gaps. |

## Architectural Plans (L1, L2, L3)

Generated via `make_plans.py` with realistic ~70px door openings, structural columns, windows, and room labels (L2 also has blur, sensor noise, and uneven lighting).

| floor_id | Config Overrides | Units | Status | Notes |
|----------|-----------------|-------|--------|-------|
| `L1` | `close_frac=0.06` | 8 | ✅ Pass | 8 units: Living, Kitchen, Bedroom 1, Corridor, Bedroom 2, Bath, Utility, Bedroom 3. Door gaps are ~70px. Default `close_frac=0.03` fails (rooms merge through doors → 0 units). At 0.08 corridors split, so 0.06 is ideal. |
| `L2` | `close_frac=0.06` | 6 | ✅ Pass | 6 units: Office A, Office B, Hall, Meeting, Pantry, Studio. Noise and gradient handled cleanly; `close_frac=0.06` seals ~70px doors. |
| `L3` | `close_frac=0.06` | 6 | ✅ Pass | 6 units: Store, Open Workspace, Lounge, Hall, Lab, Server Rm. Columns inside Open Workspace handled; `close_frac=0.06` seals door gaps cleanly. |


## Config Reference

Per-plan overrides live in [`vision/plan_configs.py`](vision/plan_configs.py). The main tuning knobs:

| Parameter | Default | Raise when... | Lower when... |
|-----------|---------|---------------|---------------|
| `close_frac` | 0.03 | Rooms leak to outside (wide door gaps) | Rooms merge into one blob |
| `min_area_frac` | 0.002 | False positives (text fragments detected as rooms) | Small rooms missing |
| `threshold` | "otsu" | — | Use "adaptive" for uneven scans/lighting |
| `blur_ksize` | 3 | — | Raise to 5+ for noisy scans |
