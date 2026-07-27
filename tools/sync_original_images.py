#!/usr/bin/env python3
"""Build and optionally upload the SKU-mapped original product image manifest."""

import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys


CONTENT_TYPES = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".avif": "image/avif",
    ".gif": "image/gif",
}


def content_hash(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()[:12]


def build_manifest(
    source_manifest_path: Path,
    images_dir: Path,
    prefix: str,
    cdn_base: str,
) -> list[dict[str, str]]:
    source = json.loads(source_manifest_path.read_text(encoding="utf-8"))
    if not isinstance(source, dict):
        raise ValueError("source manifest must be an object keyed by SKU")

    entries: list[dict[str, str]] = []
    errors: list[str] = []
    seen_files: set[Path] = set()
    for raw_sku, record in sorted(source.items()):
        sku = raw_sku.strip().upper()
        filename = record.get("file") if isinstance(record, dict) else None
        if not sku or not isinstance(filename, str) or not filename.strip():
            errors.append(f"{raw_sku}: missing SKU or file")
            continue

        path = (images_dir / filename).resolve()
        if path.parent != images_dir.resolve() or not path.is_file():
            errors.append(f"{sku}: image not found: {filename}")
            continue
        if path in seen_files:
            errors.append(f"{sku}: source image reused: {filename}")
            continue
        seen_files.add(path)

        extension = path.suffix.lower()
        if extension not in CONTENT_TYPES:
            errors.append(f"{sku}: unsupported image type: {extension}")
            continue

        key = f"{prefix.strip('/')}/{sku}-{content_hash(path)}{extension}"
        entries.append(
            {
                "name": sku,
                "file": str(path),
                "key": key,
                "url": f"{cdn_base.rstrip('/')}/{key}",
                "content_type": CONTENT_TYPES[extension],
            }
        )

    if errors:
        raise ValueError("\n".join(errors))
    if len(entries) != len(source):
        raise ValueError(
            f"manifest coverage mismatch: {len(entries)} entries for {len(source)} SKUs"
        )
    return entries


def existing_keys(bucket: str, endpoint: str, prefix: str) -> set[str]:
    result = subprocess.run(
        [
            "aws",
            "s3api",
            "list-objects-v2",
            "--bucket",
            bucket,
            "--prefix",
            f"{prefix.strip('/')}/",
            "--endpoint-url",
            endpoint,
            "--output",
            "json",
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    payload = json.loads(result.stdout)
    return {
        item["Key"]
        for item in payload.get("Contents", [])
        if isinstance(item, dict) and isinstance(item.get("Key"), str)
    }


def upload_entry(
    entry: dict[str, str], bucket: str, endpoint: str
) -> dict[str, str]:
    subprocess.run(
        [
            "aws",
            "s3",
            "cp",
            entry["file"],
            f"s3://{bucket}/{entry['key']}",
            "--endpoint-url",
            endpoint,
            "--content-type",
            entry["content_type"],
            "--cache-control",
            "public, max-age=31536000, immutable",
            "--only-show-errors",
        ],
        check=True,
    )
    return entry


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Prepare and upload original catalog images to Cloudflare R2."
    )
    parser.add_argument(
        "--source-manifest",
        type=Path,
        default=Path("/Users/abalmus/Projects/catalog-ai-pipeline/images/manifest.json"),
    )
    parser.add_argument(
        "--images-dir",
        type=Path,
        default=Path("/Users/abalmus/Projects/catalog-ai-pipeline/images"),
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("tools/original-manifest.json"),
    )
    parser.add_argument("--prefix", default="original")
    parser.add_argument("--workers", type=int, default=8)
    parser.add_argument("--apply-upload", action="store_true")
    args = parser.parse_args()

    if args.workers < 1 or args.workers > 32:
        raise SystemExit("--workers must be between 1 and 32")

    cdn_base = os.environ.get("CDN_BASE") or os.environ.get("S3_FILE_URL")
    if not cdn_base:
        cdn_base = "https://cdn.dyllu.md"

    try:
        entries = build_manifest(
            args.source_manifest, args.images_dir, args.prefix, cdn_base
        )
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(error, file=sys.stderr)
        return 1

    args.output.parent.mkdir(parents=True, exist_ok=True)
    public_manifest = [
        {"name": entry["name"], "key": entry["key"], "url": entry["url"]}
        for entry in entries
    ]
    args.output.write_text(
        json.dumps(public_manifest, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    total_bytes = sum(Path(entry["file"]).stat().st_size for entry in entries)
    print(
        f"validated={len(entries)} bytes={total_bytes} "
        f"manifest={args.output.resolve()}"
    )

    if not args.apply_upload:
        print("DRY RUN — pass --apply-upload to upload")
        return 0

    endpoint = os.environ.get("R2_ENDPOINT") or os.environ.get("S3_ENDPOINT")
    bucket = os.environ.get("R2_BUCKET") or os.environ.get("S3_BUCKET")
    access_key = os.environ.get("AWS_ACCESS_KEY_ID") or os.environ.get(
        "S3_ACCESS_KEY_ID"
    )
    secret_key = os.environ.get("AWS_SECRET_ACCESS_KEY") or os.environ.get(
        "S3_SECRET_ACCESS_KEY"
    )
    if not endpoint or not bucket or not access_key or not secret_key:
        print(
            "upload requires S3_ENDPOINT/S3_BUCKET/S3_ACCESS_KEY_ID/"
            "S3_SECRET_ACCESS_KEY (or R2/AWS equivalents)",
            file=sys.stderr,
        )
        return 1

    upload_env = os.environ.copy()
    upload_env["AWS_ACCESS_KEY_ID"] = access_key
    upload_env["AWS_SECRET_ACCESS_KEY"] = secret_key
    upload_env.setdefault("AWS_DEFAULT_REGION", os.environ.get("S3_REGION", "auto"))
    os.environ.update(upload_env)

    present = existing_keys(bucket, endpoint, args.prefix)
    pending = [entry for entry in entries if entry["key"] not in present]
    print(f"existing={len(entries) - len(pending)} upload={len(pending)}")
    with ThreadPoolExecutor(max_workers=args.workers) as executor:
        list(
            executor.map(
                lambda entry: upload_entry(entry, bucket, endpoint),
                pending,
            )
        )
    print(f"uploaded={len(pending)} skipped={len(entries) - len(pending)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
