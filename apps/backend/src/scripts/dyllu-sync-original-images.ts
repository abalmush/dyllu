import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ExecArgs, RemoteQueryFunction } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

type ManifestEntry = {
  name: string;
  key: string;
  url: string;
};

type ProductRow = {
  id: string;
  thumbnail: string | null;
  images: Array<{ id: string; url: string }>;
  variants: Array<{
    id: string;
    sku: string | null;
    metadata: Record<string, unknown> | null;
  }>;
};

function parseArgs(args: string[]) {
  const parsed: { source?: string; confirmed: boolean } = {
    confirmed: false,
  };
  for (const arg of args) {
    const [key, value] = arg.replace(/^--/, "").split("=");
    if (key === "source" && value) parsed.source = value;
    if (key === "confirm" && value === "SYNC_ORIGINAL_IMAGES") {
      parsed.confirmed = true;
    }
  }
  return parsed;
}

function skuFromOriginalUrl(url: string): string | undefined {
  const match = url.match(/\/original\/([^/]+)-[a-f0-9]{12}\.[a-z0-9]+$/i);
  return match?.[1]?.toUpperCase();
}

export default async function syncOriginalImages({
  container,
  args,
}: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as Omit<
    RemoteQueryFunction,
    symbol
  >;
  const productService = container.resolve(Modules.PRODUCT);
  const flags = parseArgs(args ?? []);
  if (!flags.source)
    throw new Error("source=<absolute-manifest-path> is required");

  const manifest = JSON.parse(
    await readFile(resolve(flags.source), "utf8")
  ) as ManifestEntry[];
  if (!Array.isArray(manifest) || manifest.length === 0) {
    throw new Error("source manifest must be a non-empty array");
  }

  const urlBySku = new Map<string, string>();
  for (const entry of manifest) {
    const sku = entry.name?.trim().toUpperCase();
    if (
      !sku ||
      !entry.url?.startsWith("https://cdn.dyllu.md/original/") ||
      urlBySku.has(sku)
    ) {
      throw new Error(`invalid or duplicate manifest entry: ${entry.name}`);
    }
    urlBySku.set(sku, entry.url);
  }

  const { data } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "thumbnail",
      "images.id",
      "images.url",
      "variants.id",
      "variants.sku",
      "variants.metadata",
    ],
    pagination: { skip: 0, take: 5000 },
  });
  const products = data as ProductRow[];
  const matchedSkus = new Set<string>();
  const singleVariantUpdates: Array<{
    product: ProductRow;
    sku: string;
    url: string;
  }> = [];
  const variantUpdates: Array<{
    id: string;
    sku: string;
    url: string;
    metadata: Record<string, unknown>;
  }> = [];

  for (const product of products) {
    const matched = product.variants.flatMap((variant) => {
      const sku = variant.sku?.trim().toUpperCase();
      const url = sku ? urlBySku.get(sku) : undefined;
      if (!sku || !url) return [];
      matchedSkus.add(sku);
      return [{ variant, sku, url }];
    });
    if (matched.length === 0) continue;

    if (product.variants.length === 1 && matched.length === 1) {
      singleVariantUpdates.push({
        product,
        sku: matched[0].sku,
        url: matched[0].url,
      });
      continue;
    }

    for (const { variant, sku, url } of matched) {
      variantUpdates.push({
        id: variant.id,
        sku,
        url,
        metadata: variant.metadata ?? {},
      });
    }
  }

  const unmatched = [...urlBySku.keys()].filter((sku) => !matchedSkus.has(sku));
  const attachedSingleProducts = singleVariantUpdates.filter(
    ({ product, url }) => product.images[1]?.url === url
  ).length;
  const attachedVariants = variantUpdates.filter(
    ({ metadata, url }) => metadata.original_image === url
  ).length;
  logger.info(
    `[original-images] manifest=${manifest.length} matched=${matchedSkus.size} ` +
      `singleProducts=${singleVariantUpdates.length} variants=${variantUpdates.length} ` +
      `notInLocalMedusa=${unmatched.length}`
  );
  logger.info(
    `[original-images] attached singleProducts=${attachedSingleProducts}/${singleVariantUpdates.length} ` +
      `variants=${attachedVariants}/${variantUpdates.length}`
  );
  if (unmatched.length > 0) {
    logger.info(`[original-images] not imported: ${unmatched.join(", ")}`);
  }
  if (!flags.confirmed) {
    logger.info(
      "[original-images] DRY RUN — pass confirm=SYNC_ORIGINAL_IMAGES to apply"
    );
    return;
  }

  let updatedProducts = 0;
  for (const { product, sku, url } of singleVariantUpdates) {
    const retainedImages = product.images.filter((image) => {
      const originalSku = skuFromOriginalUrl(image.url);
      return originalSku !== sku && image.url !== url;
    });
    const mainImage = retainedImages[0];
    const remainingImages = retainedImages.slice(1);
    const images = [
      ...(mainImage
        ? [{ id: mainImage.id, url: mainImage.url }]
        : product.thumbnail
          ? [{ url: product.thumbnail }]
          : []),
      { url },
      ...remainingImages.map((image) => ({ id: image.id, url: image.url })),
    ];
    await productService.updateProducts(product.id, { images });
    updatedProducts += 1;
    if (updatedProducts % 100 === 0) {
      logger.info(
        `[original-images] updated products ${updatedProducts}/${singleVariantUpdates.length}`
      );
    }
  }

  let updatedVariants = 0;
  for (const update of variantUpdates) {
    if (update.metadata.original_image === update.url) continue;
    await productService.updateProductVariants(update.id, {
      metadata: { ...update.metadata, original_image: update.url },
    });
    updatedVariants += 1;
    if (updatedVariants % 100 === 0) {
      logger.info(
        `[original-images] updated variants ${updatedVariants}/${variantUpdates.length}`
      );
    }
  }
  logger.info(
    `[original-images] done products=${updatedProducts} variants=${updatedVariants}`
  );
}
