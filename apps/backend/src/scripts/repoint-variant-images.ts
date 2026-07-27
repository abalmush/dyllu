import fs from "fs";
import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

const MANIFEST_PATH = "/Users/abalmus/Projects/DYLLU/tools/transparent-manifest.json";

type ManifestEntry = { name: string; url: string };

export default async function repointVariantImages({ container }: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const productService = container.resolve(Modules.PRODUCT);

  const manifest: ManifestEntry[] = JSON.parse(
    fs.readFileSync(MANIFEST_PATH, "utf-8")
  );
  const urlBySku = new Map(manifest.map((e) => [e.name, e.url]));

  const { data: variants } = await query.graph({
    entity: "variant",
    fields: ["id", "sku", "metadata"],
    filters: { sku: Array.from(urlBySku.keys()) },
  });

  console.log(`manifest=${manifest.length} matchedVariants=${variants.length}`);

  let done = 0;
  for (const v of variants) {
    const url = v.sku ? urlBySku.get(v.sku) : undefined;
    if (!url) continue;
    const metadata = (v.metadata ?? {}) as Record<string, unknown>;
    if (metadata.ingco_variant_image === url) continue;
    await productService.updateProductVariants(v.id, {
      metadata: { ...metadata, ingco_variant_image: url },
    });
    done += 1;
    if (done % 100 === 0) console.log(`updated ${done}/${variants.length}`);
  }

  console.log(`done — repointed ingco_variant_image on ${done} variants`);
}
