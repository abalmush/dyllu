export function getStorefrontUrl(path: string) {
  const origin = process.env.STOREFRONT_URL;
  return origin ? new URL(path, origin).toString() : null;
}

export function getAdminUrl(path: string) {
  const origin = process.env.ADMIN_CORS?.split(",")
    .map((value) => value.trim())
    .find((value) => value.startsWith("https://"));
  return origin ? new URL(path, origin).toString() : null;
}

export function getNewsletterConfirmationUrl() {
  return getAdminUrl("/newsletter/confirm");
}
