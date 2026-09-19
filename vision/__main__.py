"""CLI.

    python -m vision run plans/*.png --out out --cache cache --debug --save-cache
    python -m vision stub L1 L2 L3 --out out
    python -m vision synth plans            # writes plans/synthetic_L1.png for hour-0 testing

Demo-day safety switch:  USE_CACHED=1 python -m vision run plans/*.png
"""
from __future__ import annotations

import argparse
from pathlib import Path

from .detect import DetectConfig
from .export import make_stub, process_floor, save_json


def main() -> None:
    ap = argparse.ArgumentParser(prog="vision")
    sub = ap.add_subparsers(dest="cmd", required=True)

    run = sub.add_parser("run", help="detect units on one or more floor plan images")
    run.add_argument("images", nargs="+")
    run.add_argument("--out", default="out")
    run.add_argument("--cache", default="cache")
    run.add_argument("--debug", action="store_true", help="write overlay PNGs to <out>/debug")
    run.add_argument("--save-cache", action="store_true", help="store live results as the fallback cache")
    run.add_argument("--cached", action="store_true", help="force cached results (same as USE_CACHED=1)")
    run.add_argument("--threshold", choices=["otsu", "adaptive"], default="otsu")
    run.add_argument("--close-frac", type=float, default=None, help="door-gap sealing kernel (fraction of min side)")
    run.add_argument("--min-area-frac", type=float, default=None)

    stub = sub.add_parser("stub", help="write dummy floor JSON for Person 2")
    stub.add_argument("floor_ids", nargs="+")
    stub.add_argument("--out", default="out")

    synth = sub.add_parser("synth", help="generate a synthetic test plan")
    synth.add_argument("out_dir", nargs="?", default="plans")

    args = ap.parse_args()

    if args.cmd == "run":
        cfg = DetectConfig(threshold=args.threshold)
        if args.close_frac is not None:
            cfg.close_frac = args.close_frac
        if args.min_area_frac is not None:
            cfg.min_area_frac = args.min_area_frac
        for img in args.images:
            res = process_floor(
                img, out_dir=args.out, cache_dir=args.cache, cfg=cfg,
                use_cached=True if args.cached else None, save_cache=args.save_cache, debug=args.debug,
            )
            print(f"{res['floor_id']}: {len(res['units'])} units [{res['source']}]")
    elif args.cmd == "stub":
        for fid in args.floor_ids:
            path = save_json(make_stub(fid), Path(args.out) / f"{fid}.json")
            print(f"wrote {path}")
    elif args.cmd == "synth":
        from .synthetic import write_all_synthetics

        for path in write_all_synthetics(args.out_dir):
            print(f"wrote {path}")


if __name__ == "__main__":
    main()
