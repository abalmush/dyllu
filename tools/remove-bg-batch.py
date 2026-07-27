#!/usr/bin/env python3
"""Remove white/solid backgrounds from catalog images, writing transparent PNGs.

Reuses a single rembg model session across all files, and skips any output that
already exists so the run is resumable. Run with the image venv:

    tools/.venv-images/bin/python tools/remove-bg-batch.py \
        --src /Users/abalmus/Projects/catalog-ai-pipeline/output \
        --out /Users/abalmus/Projects/catalog-ai-pipeline/output/transparent
"""
import argparse
import os
import sys
import time
from glob import glob

from PIL import Image
from rembg import new_session, remove


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--src", required=True)
    p.add_argument("--out", required=True)
    p.add_argument("--ext", default="png", choices=["png", "webp"])
    p.add_argument("--model", default="u2net")
    args = p.parse_args()

    os.makedirs(args.out, exist_ok=True)
    sources = sorted(glob(os.path.join(args.src, "*.png")))
    total = len(sources)
    if not total:
        raise SystemExit(f"no .png files in {args.src}")

    session = new_session(args.model)
    done = skipped = failed = 0
    started = time.monotonic()

    for i, src in enumerate(sources, 1):
        base = os.path.splitext(os.path.basename(src))[0]
        dst = os.path.join(args.out, f"{base}.{args.ext}")
        if os.path.exists(dst):
            skipped += 1
            continue
        try:
            cut = remove(Image.open(src), session=session)
            if args.ext == "webp":
                cut.save(dst, "WEBP", quality=90, method=6)
            else:
                cut.save(dst)
            done += 1
        except Exception as exc:
            failed += 1
            print(f"FAIL {base}: {exc}", flush=True)
        if i % 25 == 0 or i == total:
            rate = (time.monotonic() - started) / max(done, 1)
            eta = rate * (total - i) / 60
            print(
                f"[{i}/{total}] done={done} skipped={skipped} "
                f"failed={failed} eta~{eta:.1f}min",
                flush=True,
            )

    print(f"COMPLETE done={done} skipped={skipped} failed={failed}", flush=True)


if __name__ == "__main__":
    main()
