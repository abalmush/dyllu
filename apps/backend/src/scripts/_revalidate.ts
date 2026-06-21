const DEFAULT_TAGS = ["products", "categories", "compatible-accessories"];

type Logger = { info: (m: string) => void };

export async function revalidateStorefront(
  logger: Logger,
  tags: string[] = DEFAULT_TAGS
): Promise<void> {
  const storefrontUrl = process.env.STOREFRONT_URL ?? "http://localhost:4000";
  const secret = process.env.REVALIDATE_SECRET;
  try {
    const res = await fetch(`${storefrontUrl}/api/revalidate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { "x-revalidate-secret": secret } : {}),
      },
      body: JSON.stringify({ tags }),
    });
    if (res.ok) {
      logger.info(`[revalidate] storefront cache cleared (${storefrontUrl}): ${tags.join(", ")}`);
    } else {
      logger.info(`[revalidate] skipped — ${storefrontUrl} returned ${res.status}`);
    }
  } catch (err) {
    logger.info(
      `[revalidate] skipped — ${err instanceof Error ? err.message : "unknown error"}`
    );
  }
}
