#!/bin/bash
# Run detection on all floor plans with debug overlays and cache saving.
# Usage: bash run_all.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== Vision: detect all plans ==="
echo ""

count=0
for f in plans/*.png; do
    [ -f "$f" ] || { echo "No .png files in plans/"; exit 1; }
    python run_vision.py run "$f" --debug --save-cache
    count=$((count + 1))
done

echo ""
echo "=== Done: $count plans processed ==="
echo "Output JSON:    out/*.json"
echo "Debug overlays: out/debug/*_overlay.png"
echo "Cache:          cache/*.json"
