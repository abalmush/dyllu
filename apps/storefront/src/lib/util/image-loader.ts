import type { ImageLoaderProps } from "next/image";

const isTransformEnabled = process.env.NEXT_PUBLIC_CF_IMAGE_TRANSFORMS === "on";

export default function cloudflareImageLoader({
  src,
  width,
  quality,
}: ImageLoaderProps): string {
  if (!isTransformEnabled) {
    return src;
  }
  const params = `width=${width},quality=${quality ?? 80},format=auto`;
  return `/cdn-cgi/image/${params}/${src}`;
}
