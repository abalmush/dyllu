import { ExecArgs, RemoteQueryFunction } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows";

import { revalidateStorefront } from "./_revalidate";

function parseArgs(args: string[]) {
  const values = new Map(
    args.map((arg) => {
      const [key, value] = arg.replace(/^--/, "").split("=", 2);
      return [key, value] as const;
    })
  );
  const sku = values.get("sku")?.trim().toUpperCase();
  const publicValue = values.get("public");

  if (!sku) throw new Error("sku=<SKU> is required");
  if (publicValue !== "true" && publicValue !== "false") {
    throw new Error("public must be true or false");
  }

  return { sku, isPublic: publicValue === "true" };
}

export default async function dylluSetProductPublication({
  container,
  args,
}: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(
    ContainerRegistrationKeys.QUERY
  ) as RemoteQueryFunction;
  const { sku, isPublic } = parseArgs(args ?? []);

  const { data: variants } = await query.graph({
    entity: "variant",
    fields: ["sku", "product.id", "product.status"],
    filters: { sku },
  });
  const products = new Map(
    variants.flatMap((variant) =>
      variant.product?.id
        ? [[variant.product.id, variant.product.status] as const]
        : []
    )
  );

  if (products.size !== 1) {
    throw new Error(
      `Expected exactly one product for SKU ${sku}; found ${products.size}`
    );
  }

  const [[productId, currentStatus]] = products;
  const status = isPublic ? "published" : "draft";

  if (currentStatus === status) {
    await revalidateStorefront(logger);
    logger.info(`[product-publication] ${sku} is already ${status}`);
    return;
  }

  await updateProductsWorkflow(container).run({
    input: { products: [{ id: productId, status }] },
  });
  await revalidateStorefront(logger);
  logger.info(`[product-publication] ${sku}: ${currentStatus} -> ${status}`);
}
