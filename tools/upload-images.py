#!/usr/bin/env python3
"""Upload one or many images to Cloudflare R2 with content-hashed names.

Each file becomes `<prefix>/<name>-<sha256[:12]>.<ext>` served from the CDN with a
one-year immutable cache. Because the hash is derived from content, replacing an
image produces a new URL automatically — no cache purge, never stale. Re-uploading
unchanged content yields the same key (idempotent).

Usage:
    export AWS_ACCESS_KEY_ID=...  AWS_SECRET_ACCESS_KEY=...   # R2 S3 token
    python tools/upload-images.py IMAGE [IMAGE ...]
    python tools/upload-images.py photo.png --name DTAAC501
    python tools/upload-images.py *.png --json

    # also set the result on a Medusa product (thumbnail + images):
    export MEDUSA_ADMIN_TOKEN=...
    python tools/upload-images.py hero.png --name DTAAC501 --set-product prod_123

Config via env (with defaults):
    R2_ENDPOINT   https://592732e1a9ae45cfe9cafce4228ebe2d.r2.cloudflarestorage.com
    R2_BUCKET     dyllu-media
    CDN_BASE      https://cdn.dyllu.md
    MEDUSA_BACKEND_URL  https://api.dyllu.md
    MEDUSA_ADMIN_TOKEN  (required only for --set-product)
"""
import argparse
import hashlib
import json
import os
import subprocess
import sys
import urllib.request

R2_ENDPOINT = os.environ.get(
    "R2_ENDPOINT",
    "https://592732e1a9ae45cfe9cafce4228ebe2d.r2.cloudflarestorage.com",
)
R2_BUCKET = os.environ.get("R2_BUCKET", "dyllu-media")
CDN_BASE = os.environ.get("CDN_BASE", "https://cdn.dyllu.md").rstrip("/")
MEDUSA_URL = os.environ.get("MEDUSA_BACKEND_URL", "https://api.dyllu.md").rstrip("/")

CONTENT_TYPES = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".avif": "image/avif",
    ".gif": "image/gif",
}


def content_hash(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()[:12]


def upload_one(path, prefix, name=None):
    ext = os.path.splitext(path)[1].lower()
    if ext not in CONTENT_TYPES:
        raise SystemExit(f"unsupported image type: {path}")
    base = name or os.path.splitext(os.path.basename(path))[0]
    key = f"{prefix}/{base}-{content_hash(path)}{ext}"
    subprocess.run(
        [
            "aws", "s3", "cp", path, f"s3://{R2_BUCKET}/{key}",
            "--endpoint-url", R2_ENDPOINT,
            "--content-type", CONTENT_TYPES[ext],
            "--cache-control", "public, max-age=31536000, immutable",
            "--only-show-errors",
        ],
        check=True,
    )
    return base, key, f"{CDN_BASE}/{key}"


def set_product_images(product_id, urls, token):
    payload = json.dumps(
        {"thumbnail": urls[0], "images": [{"url": u} for u in urls]}
    ).encode()
    req = urllib.request.Request(
        f"{MEDUSA_URL}/admin/products/{product_id}",
        data=payload,
        method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "content-type": "application/json",
        },
    )
    with urllib.request.urlopen(req) as resp:
        return resp.status == 200


def main():
    p = argparse.ArgumentParser(description="Upload images to Cloudflare R2 (content-hashed).")
    p.add_argument("images", nargs="+", help="image file(s) to upload")
    p.add_argument("--prefix", default="products", help="R2 key prefix (default: products)")
    p.add_argument("--name", help="override base name (SKU); only with a single image")
    p.add_argument("--set-product", dest="product", help="Medusa product id to set images/thumbnail on")
    p.add_argument("--token", help="Medusa admin token (or env MEDUSA_ADMIN_TOKEN)")
    p.add_argument("--json", action="store_true", help="emit JSON")
    args = p.parse_args()

    if args.name and len(args.images) != 1:
        raise SystemExit("--name is only valid with a single image")
    if not os.environ.get("AWS_ACCESS_KEY_ID"):
        raise SystemExit("set AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY (R2 S3 token)")

    results = [upload_one(img, args.prefix, args.name) for img in args.images]

    if args.product:
        token = args.token or os.environ.get("MEDUSA_ADMIN_TOKEN")
        if not token:
            raise SystemExit("--set-product needs --token or MEDUSA_ADMIN_TOKEN")
        ok = set_product_images(args.product, [u for _, _, u in results], token)
        if not ok:
            raise SystemExit("failed to update product images")

    if args.json:
        print(json.dumps([{"name": n, "key": k, "url": u} for n, k, u in results], indent=2))
    else:
        for n, k, u in results:
            print(f"{n}\t{u}")


if __name__ == "__main__":
    main()
