import { ExecArgs, RemoteQueryFunction } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

type BundleComponentMetadata = {
  qty: number;
  unit: string;
  name: string;
  sku: string | null;
  resolution: "linked" | "loose";
};

type VariantRow = {
  sku: string | null;
  product: {
    id: string;
    title: string;
    handle: string;
    metadata: Record<string, unknown> | null;
  } | null;
};

export default async function ingcoBackupBundleMetadata({
  container,
}: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(
    ContainerRegistrationKeys.QUERY
  ) as Omit<RemoteQueryFunction, symbol>;

  const { data } = await query.graph({
    entity: "product_variant",
    fields: [
      "sku",
      "product.id",
      "product.title",
      "product.handle",
      "product.metadata",
    ],
    pagination: { skip: 0, take: 5000 },
  });
  const variants = data as VariantRow[];

  const bundleEntries: Array<{
    sku: string;
    is_bundle: true;
    components: Array<{
      qty: number;
      unit: string;
      name: string;
      component_sku: string | null;
    }>;
  }> = [];
  const rawBackup: Array<{
    sku: string;
    productId: string;
    productHandle: string;
    productTitle: string;
    bundleComponents: BundleComponentMetadata[];
  }> = [];

  for (const variant of variants) {
    if (!variant.sku || !variant.product) continue;
    const raw = variant.product.metadata?.["bundle_components"];
    if (typeof raw !== "string") continue;
    let components: BundleComponentMetadata[];
    try {
      components = JSON.parse(raw) as BundleComponentMetadata[];
    } catch {
      logger.warn(
        `[backup] unparseable bundle_components on ${variant.product.handle}, skipping`
      );
      continue;
    }
    if (components.length === 0) continue;

    rawBackup.push({
      sku: variant.sku,
      productId: variant.product.id,
      productHandle: variant.product.handle,
      productTitle: variant.product.title,
      bundleComponents: components,
    });
    bundleEntries.push({
      sku: variant.sku.toUpperCase(),
      is_bundle: true,
      components: components.map((c) => ({
        qty: c.qty,
        unit: c.unit,
        name: c.name,
        component_sku: c.sku,
      })),
    });
  }

  logger.info(
    `[backup] found bundle_components on ${rawBackup.length} variants`
  );

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = resolve(process.cwd(), "data", "ingco", "backups");
  await mkdir(backupDir, { recursive: true });
  const backupPath = resolve(
    backupDir,
    `bundle-components-backup-${timestamp}.json`
  );
  await writeFile(backupPath, JSON.stringify(rawBackup, null, 2), "utf8");
  logger.info(`[backup] raw backup written to ${backupPath}`);

  const bundlesJsonPath = resolve(
    process.cwd(),
    "..",
    "catalog-admin",
    "data",
    "bundles.json"
  );
  await mkdir(resolve(process.cwd(), "..", "catalog-admin", "data"), {
    recursive: true,
  });
  await writeFile(
    bundlesJsonPath,
    JSON.stringify(bundleEntries, null, 2),
    "utf8"
  );
  logger.info(
    `[backup] reconstructed bundles.json written to ${bundlesJsonPath} (${bundleEntries.length} entries)`
  );
}
