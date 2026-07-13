import type { Metadata } from "next";

export const SITE_NAME = "DYLLU";
export const DEFAULT_TITLE = "DYLLU — Scule și echipamente profesionale";
export const DEFAULT_DESCRIPTION =
  "Scule electrice, unelte de mână, echipamente de protecție și produse pentru grădină. Livrare rapidă în toată Moldova.";
export const DEFAULT_SOCIAL_IMAGE = "/opengraph-image";

const DESCRIPTION_LIMIT = 160;

type SocialMetadataInput = {
  title: string;
  description?: string | null;
  fallbackDescription?: string;
  path: string;
  image?: string | null;
  imageAlt?: string;
  absoluteTitle?: boolean;
};

export function normalizeMetadataDescription(
  value: string | null | undefined,
  fallback = DEFAULT_DESCRIPTION
): string {
  const normalized = (value || fallback)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();

  if (normalized.length <= DESCRIPTION_LIMIT) return normalized;

  const shortened = normalized.slice(0, DESCRIPTION_LIMIT - 1);
  const lastSpace = shortened.lastIndexOf(" ");
  const boundary = lastSpace >= 120 ? lastSpace : shortened.length;

  return `${shortened.slice(0, boundary).trimEnd()}…`;
}

export function getProductSocialImage(
  product?: {
    thumbnail?: string | null;
    images?: Array<{ url?: string | null }> | null;
  } | null
): string | undefined {
  return (
    product?.thumbnail ||
    product?.images?.find((image) => Boolean(image.url))?.url ||
    undefined
  );
}

export function buildSocialMetadata({
  title,
  description,
  fallbackDescription,
  path,
  image,
  imageAlt,
  absoluteTitle = false,
}: SocialMetadataInput): Metadata {
  const cleanDescription = normalizeMetadataDescription(
    description,
    fallbackDescription
  );
  const socialTitle = title.includes(SITE_NAME)
    ? title
    : `${title} · ${SITE_NAME}`;
  const socialImage = image || DEFAULT_SOCIAL_IMAGE;
  const socialImageAlt = imageAlt || `${title} — ${SITE_NAME}`;

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description: cleanDescription,
    alternates: { canonical: path },
    openGraph: {
      title: socialTitle,
      description: cleanDescription,
      url: path,
      siteName: SITE_NAME,
      locale: "ro_MD",
      type: "website",
      images: [{ url: socialImage, alt: socialImageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description: cleanDescription,
      images: [{ url: socialImage, alt: socialImageAlt }],
    },
  };
}
