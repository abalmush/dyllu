const DEFAULT_TAGS = ["products", "categories", "compatible-accessories"];

type Logger = { info: (m: string) => void };

export async function revalidateStorefront(
  logger: Logger,
  tags: string[] = DEFAULT_TAGS
): Promise<void> {
  const isProduction = process.env.NODE_ENV === "production";
  const storefrontUrl =
    process.env.STOREFRONT_URL ?? (isProduction ? "" : "http://localhost:4000");
  const secret = process.env.REVALIDATE_SECRET;
  if (!storefrontUrl || !secret) {
    const message =
      "[revalidate] STOREFRONT_URL and REVALIDATE_SECRET are required";
    if (isProduction) throw new Error(message);
    logger.info(`${message}; skipping outside production`);
    return;
  }

  const target = new URL("/api/revalidate", storefrontUrl);
  if (isProduction && target.protocol !== "https:") {
    throw new Error("[revalidate] production storefront URL must use HTTPS");
  }

  try {
    const res = await fetch(target, {
      method: "POST",
      signal: AbortSignal.timeout(10_000),
      headers: {
        "Content-Type": "application/json",
        "x-revalidate-secret": secret,
      },
      body: JSON.stringify({ tags }),
    });
    if (res.ok) {
      logger.info(
        `[revalidate] storefront cache cleared (${storefrontUrl}): ${tags.join(", ")}`
      );
    } else {
      throw new Error(`storefront returned ${res.status}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    if (isProduction) {
      throw new Error(`[revalidate] failed: ${message}`);
    }
    logger.info(`[revalidate] skipped outside production — ${message}`);
  }
}
