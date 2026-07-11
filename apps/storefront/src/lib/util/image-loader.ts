import type { ImageLoaderProps } from "next/image";

export default function cloudflareImageLoader({
  src,
}: ImageLoaderProps): string {
  return src;
}
