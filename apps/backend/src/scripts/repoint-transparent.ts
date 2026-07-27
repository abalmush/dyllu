import fs from "fs";
import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

const MANIFEST_PATH = "/Users/abalmus/Projects/DYLLU/tools/transparent-manifest.json";

type ManifestEntry = { name: string; url: string };

export default async function repointTransparent({ container }: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const productService = container.resolve(Modules.PRODUCT);

  const manifest: ManifestEntry[] = JSON.parse(
    fs.readFileSync(MANIFEST_PATH, "utf-8")
  );
  const urlBySku = new Map(manifest.map((e) => [e.name, e.url]));

  const { data: variants } = await query.graph({
    entity: "variant",
    fields: ["sku", "product_id"],
    filters: { sku: Array.from(urlBySku.keys()) },
  });

  const urlByProduct = new Map<string, string>();
  for (const v of variants) {
    const url = v.sku ? urlBySku.get(v.sku) : undefined;
    if (url && v.product_id) urlByProduct.set(v.product_id, url);
  }

  console.log(
    `manifest=${manifest.length} matchedVariants=${variants.length} ` +
      `productsToUpdate=${urlByProduct.size}`
  );

  let done = 0;
  for (const [productId, url] of urlByProduct) {
    await productService.updateProducts(productId, {
      thumbnail: url,
      images: [{ url }],
    });
    done += 1;
    if (done % 100 === 0) console.log(`updated ${done}/${urlByProduct.size}`);
  }

  console.log(`done — repointed ${done} products to transparent images`);
}
