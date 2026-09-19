"""Creates ml_bundle.zip containing all source files required for Google Colab GPU training."""
from __future__ import annotations

import zipfile
from pathlib import Path

_root = Path(__file__).resolve().parents[1]
_bundle_path = _root / "ml_bundle.zip"

INCLUDE_DIRS = ["ml", "vision", "plans"]
INCLUDE_FILES = ["make_plans.py", "run_vision.py"]
EXCLUDE_EXTS = {".pyc", ".zip", ".tar", ".gz", ".onnx"}
EXCLUDE_DIRS = {"__pycache__", ".pytest_cache", "dataset", "eval", "outputs"}


def make_bundle() -> None:
    print(f"[bundle] Archiving codebase for Google Colab into {_bundle_path}...")
    count = 0
    with zipfile.ZipFile(_bundle_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for d in INCLUDE_DIRS:
            dir_path = _root / d
            if not dir_path.exists():
                continue
            for p in dir_path.rglob("*"):
                if p.is_file():
                    if any(ex in p.parts for ex in EXCLUDE_DIRS):
                        continue
                    if p.suffix.lower() in EXCLUDE_EXTS:
                        continue
                    arcname = p.relative_to(_root)
                    zf.write(p, arcname)
                    count += 1

        for f in INCLUDE_FILES:
            f_path = _root / f
            if f_path.exists() and f_path.is_file():
                zf.write(f_path, f)
                count += 1

    size_mb = _bundle_path.stat().st_size / (1024 * 1024)
    print(f"[bundle] Created {_bundle_path.name} with {count} files ({size_mb:.2f} MB).")


if __name__ == "__main__":
    make_bundle()
