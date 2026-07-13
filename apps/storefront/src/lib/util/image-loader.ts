import type { ImageLoaderProps } from "next/image";

export default function cloudflareImageLoader({
  src,
  width,
  quality,
}: ImageLoaderProps): string {
  if (/^(data:|blob:)/i.test(src) || /\.svg(?:$|[?#])/i.test(src)) {
    return src;
  }

  if (
    process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PUBLIC_CF_IMAGE_TRANSFORMS !== "on"
  ) {
    const separator = src.includes("?") ? "&" : "?";
    return `${src}${separator}__next_width=${width}`;
  }

  const normalizedSource = src.startsWith("/") ? src.slice(1) : src;
  const normalizedQuality = Math.min(100, Math.max(1, quality ?? 80));

  return `/cdn-cgi/image/width=${width},quality=${normalizedQuality},format=auto/${normalizedSource}`;
}
