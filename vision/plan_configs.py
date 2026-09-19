"""Per-plan detection config overrides.

When a specific floor plan needs non-default DetectConfig settings (e.g. a higher
close_frac to seal wide door gaps, or adaptive threshold for uneven scans), add an
entry here keyed by floor_id.  Values are dicts of DetectConfig field overrides.

process_floor() in export.py automatically applies these before detection.
"""
from __future__ import annotations

# Keys = floor_id (stem of the image filename)
# Values = dict of DetectConfig field names -> override values
PLAN_CONFIGS: dict[str, dict] = {
    # The noisy variant needs adaptive thresholding to handle uneven background
    "synthetic_noisy": {
        "threshold": "adaptive",
        "blur_ksize": 5,
    },
    # Wide gaps need a bigger close kernel to seal them
    "synthetic_wide_gaps": {
        "close_frac": 0.055,
    },
}
