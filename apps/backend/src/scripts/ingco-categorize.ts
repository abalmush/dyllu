import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import {
  createProductCategoriesWorkflow,
  deleteProductCategoriesWorkflow,
  updateProductCategoriesWorkflow,
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows";
import { access, readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

import {
  ALL_LEAF_HANDLES,
  ALL_ROOT_HANDLES,
  CATEGORY_TREE,
  ROOT_HANDLE_BY_LEAF,
} from "../data/category-tree";
import { revalidateStorefront } from "./_revalidate";

type MergedVariant = {
  article?: string | null;
  internalSku?: string | null;
  sku?: string | null;
};

type MergedProduct = {
  handle: string;
  name: string;
  breadcrumbs?: string[];
  sourceCategorySlugs?: string[];
  variants: MergedVariant[];
};

type DbProduct = {
  id: string;
  handle: string;
  categories?: Array<{ id: string; handle: string }> | null;
};

type DbCategory = {
  id: string;
  handle: string;
  name: string;
  rank: number | null;
  parent_category_id: string | null;
};

type Logger = {
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
};

type ManifestRow = {
  image: string;
  category_main: string;
  category_sub: string;
};

type ProductResolution = {
  product: MergedProduct;
  leafHandles: string[];
  rootHandles: string[];
  via: "manifest" | "fallback" | "root-fallback" | "unmatched";
};

const ROOT_HANDLE_BY_NAME = new Map(
  CATEGORY_TREE.map((root) => [root.name, root.handle] as const)
);

const ROOT_NAME_ALIASES: Record<string, string> = {};

const LEAF_HANDLE_BY_KEY = new Map(
  CATEGORY_TREE.flatMap((root) =>
    root.children.map((leaf) => [`${root.name}::${leaf.name}`, leaf.handle] as const)
  )
);

const FALLBACK_HANDLES_BY_PRODUCT_HANDLE: Record<string, string[]> = {
  "set-chei-combinate-cu-clinchet-12-buc-8-19mm-ingco-dyllu": ["chei-fixe"],
  "polizor-unghiular-125mm-850w-dyllu-dtag15851": [
    "polizor-unghiular-flex",
  ],
  "motobur-dtdz1": ["motocultor"],
  "set-de-perie-slefuit-cu-sarma-5buc-dyllu-dtce6401": [
    "abrazive-si-perii",
  ],
  "trimer-pe-acumulator-dyllu-dtgtp535": ["motocoasa"],
  "mixer-de-constructie-1200w-dyllu-dtmx151201": ["utilaje-beton"],
  "set-de-accesorii-pentru-baie-dtzg1": ["instalatii-sanitare"],
  "aspirator-compatibil-148w-dyllu-dvcw1001": ["electrice"],
  "incarcator-usb-a-li-ion-20v-dyllu-dtucp118": [
    "accesorii-scule-electrice",
  ],
  "set-suport-magnetic-pentru-unelte-3buc-dyllu-dthh2603": [
    "cutii-si-organizatoare",
  ],
};

const FALLBACK_HANDLES_BY_SOURCE_SLUG: Record<string, string[]> = {
  "aspiratoare-portative": ["electrice"],
  "echipamente-auto-si-pentru-garaj": ["auto-si-moto"],
  "incarcatoare-pentru-scule": ["accesorii-scule-electrice"],
  "mixere-pentru-constructie": ["utilaje-beton"],
  motobururi: ["motocultor"],
  perii: ["abrazive-si-perii"],
  "polizoare-unghiulare-electrice": ["polizor-unghiular-flex"],
  "seturi-de-instrumente": ["chei-fixe"],
  "tehnica-de-casa-ingco": ["electrice"],
  "tehnica-sanitara-si-clima": ["instalatii-sanitare"],
  trimmere: ["motocoasa"],
  "trimmere-electrice-de-tuns-iarba": ["motocoasa"],
};

const ROOT_FALLBACKS_BY_SOURCE_SLUG: Record<string, string[]> = {
  "auto-moto": ["auto-si-moto"],
  "consumabile": ["consumabile-si-accesorii"],
  "constructie-si-reparatii": ["constructii"],
  depozitare: ["depozitare"],
  "echipamente-de-protectie": ["echipament-de-protectie"],
  gradinarit: ["gradinarit"],
  imbracaminte: ["echipament-de-protectie"],
  incaltaminte: ["echipament-de-protectie"],
  "lumina-si-electrica": ["electrice"],
  "pompe-si-aprovizionarea-cu-apa": ["gradinarit"],
  "scule-electrice": ["scule-electrice"],
  "scule-manuale": ["scule-manuale"],
  "tehnica-de-casa-ingco": ["electrice"],
  "trimmere-si-cositoare-de-gazon": ["gradinarit"],
};

export default async function ingcoCategorize({ container, args }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const flags = parseArgs(args ?? []);
  const dryRun =
    flags.dryRun ?? (process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true");
  const dataDir = flags.dir ?? resolve(process.cwd(), "data", "ingco", "products-merged");
  const manifestPath = await resolveManifestPath(flags.manifest);

  if (dryRun) {
    logger.info("[categorize] DRY_RUN active — DB will not be touched");
  }

  logger.info(`[categorize] reading manifest from ${manifestPath}`);
  const manifestLeafHandlesByArticle = await loadManifestLeafHandlesByArticle(
    manifestPath
  );

  const files = (await readdir(dataDir)).filter((file) => file.endsWith(".json"));
  logger.info(`[categorize] reading ${files.length} merged products`);

  const resolutions = new Map<string, ProductResolution>();
  const stats = {
    manifest: 0,
    fallback: 0,
    rootFallback: 0,
    unmatched: 0,
    multiLeaf: 0,
  };

  for (const file of files) {
    const product = JSON.parse(
      await readFile(join(dataDir, file), "utf8")
    ) as MergedProduct;

    const resolution = resolveProductCategories(
      product,
      manifestLeafHandlesByArticle
    );

    if (resolution.leafHandles.length > 1) {
      stats.multiLeaf++;
    }

    if (resolution.via === "manifest") stats.manifest++;
    else if (resolution.via === "fallback") stats.fallback++;
    else if (resolution.via === "root-fallback") stats.rootFallback++;
    else stats.unmatched++;

    resolutions.set(product.handle, resolution);
  }

  logger.info(
    `[categorize] resolved ${resolutions.size} products: manifest=${stats.manifest}, fallback=${stats.fallback}, root-only=${stats.rootFallback}, unmatched=${stats.unmatched}, multi-leaf=${stats.multiLeaf}`
  );

  const leafCounts = new Map<string, number>();
  for (const resolution of resolutions.values()) {
    for (const handle of resolution.leafHandles) {
      leafCounts.set(handle, (leafCounts.get(handle) ?? 0) + 1);
    }
  }
  for (const [handle, count] of [...leafCounts.entries()].sort((a, b) => b[1] - a[1])) {
    logger.info(`[categorize] ${handle}: ${count}`);
  }

  const unmatched = [...resolutions.values()].filter(
    (resolution) => resolution.via === "unmatched"
  );
  if (unmatched.length > 0) {
    logger.warn(`[categorize] ${unmatched.length} products remain unmatched:`);
    for (const resolution of unmatched.slice(0, 30)) {
      logger.warn(`  - ${resolution.product.handle}`);
    }
    if (unmatched.length > 30) {
      logger.warn(`  ... and ${unmatched.length - 30} more`);
    }
  }

  if (dryRun) {
    logger.info("[categorize] DRY RUN — not touching DB");
    return;
  }

  const categoryByHandle = await ensureCategories(container, logger);

  const handles = [...resolutions.keys()];
  const handleChunks: string[][] = [];
  for (let index = 0; index < handles.length; index += 200) {
    handleChunks.push(handles.slice(index, index + 200));
  }

  const dbProducts: DbProduct[] = [];
  for (const chunk of handleChunks) {
    const { data } = await query.graph({
      entity: "product",
      fields: ["id", "handle", "categories.id", "categories.handle"],
      filters: { handle: chunk },
    });
    for (const product of data as DbProduct[]) {
      dbProducts.push(product);
    }
  }

  logger.info(`[categorize] matched ${dbProducts.length}/${handles.length} products in DB`);

  const updates: Array<{ id: string; category_ids: string[] }> = [];
  let skipped = 0;

  for (const product of dbProducts) {
    const resolution = resolutions.get(product.handle);
    if (!resolution) {
      skipped++;
      continue;
    }

    const targetHandles = dedupeStrings([
      ...resolution.leafHandles,
      ...resolution.rootHandles,
    ]);
    const targetIds = targetHandles
      .map((handle) => categoryByHandle.get(handle)?.id)
      .filter((value): value is string => Boolean(value));

    if (targetIds.length === 0) {
      skipped++;
      continue;
    }

    const currentIds = new Set((product.categories ?? []).map((category) => category.id));
    const isSameMembership =
      targetIds.length === currentIds.size &&
      targetIds.every((id) => currentIds.has(id));

    if (isSameMembership) {
      skipped++;
      continue;
    }

    updates.push({ id: product.id, category_ids: targetIds });
  }

  logger.info(
    `[categorize] ${updates.length} products to reassign, ${skipped} already correct`
  );

  const batchSize = Number(flags.batch ?? 50);
  for (let index = 0; index < updates.length; index += batchSize) {
    const batch = updates.slice(index, index + batchSize);
    await updateProductsWorkflow(container).run({
      input: { products: batch },
    });
    logger.info(
      `[categorize] batch ${index / batchSize + 1}: updated ${batch.length} (total ${Math.min(index + batch.length, updates.length)}/${updates.length})`
    );
  }

  await cleanupStaleCategories(container, logger);
  await revalidateStorefront(logger);
}

function resolveProductCategories(
  product: MergedProduct,
  manifestLeafHandlesByArticle: Map<string, string[]>
): ProductResolution {
  const manifestLeafHandles = new Set<string>();

  for (const variant of product.variants) {
    const article = normalizeValue(variant.article);
    if (!article) {
      continue;
    }
    const handles = manifestLeafHandlesByArticle.get(article);
    if (!handles) {
      continue;
    }
    for (const handle of handles) {
      manifestLeafHandles.add(handle);
    }
  }

  if (manifestLeafHandles.size > 0) {
    const leafHandles = [...manifestLeafHandles];
    return {
      product,
      leafHandles,
      rootHandles: dedupeStrings(
        leafHandles
          .map((handle) => ROOT_HANDLE_BY_LEAF.get(handle))
          .filter((value): value is string => Boolean(value))
      ),
      via: "manifest",
    };
  }

  const exactFallback = FALLBACK_HANDLES_BY_PRODUCT_HANDLE[product.handle];
  if (exactFallback?.length) {
    return buildFallbackResolution(product, exactFallback);
  }

  const sourceSlugs = dedupeStrings([
    ...(product.breadcrumbs ?? []),
    ...(product.sourceCategorySlugs ?? []),
  ]);

  const fallbackHandles = new Set<string>();
  for (const slug of sourceSlugs) {
    const exactHandles = FALLBACK_HANDLES_BY_SOURCE_SLUG[slug];
    if (exactHandles) {
      for (const handle of exactHandles) {
        fallbackHandles.add(handle);
      }
    }
  }
  if (fallbackHandles.size > 0) {
    return buildFallbackResolution(product, [...fallbackHandles]);
  }

  const rootFallbacks = new Set<string>();
  for (const slug of sourceSlugs) {
    const rootHandles = ROOT_FALLBACKS_BY_SOURCE_SLUG[slug];
    if (!rootHandles) {
      continue;
    }
    for (const handle of rootHandles) {
      rootFallbacks.add(handle);
    }
  }

  if (rootFallbacks.size > 0) {
    return {
      product,
      leafHandles: [],
      rootHandles: [...rootFallbacks].filter((handle) => ALL_ROOT_HANDLES.has(handle)),
      via: "root-fallback",
    };
  }

  return {
    product,
    leafHandles: [],
    rootHandles: [],
    via: "unmatched",
  };
}

function buildFallbackResolution(
  product: MergedProduct,
  handles: string[]
): ProductResolution {
  const leafHandles = handles.filter((handle) => ALL_LEAF_HANDLES.has(handle));
  const rootHandles = dedupeStrings([
    ...handles.filter((handle) => ALL_ROOT_HANDLES.has(handle)),
    ...leafHandles
      .map((handle) => ROOT_HANDLE_BY_LEAF.get(handle))
      .filter((value): value is string => Boolean(value)),
  ]);

  return {
    product,
    leafHandles,
    rootHandles,
    via: leafHandles.length > 0 ? "fallback" : "root-fallback",
  };
}

async function loadManifestLeafHandlesByArticle(
  manifestPath: string
): Promise<Map<string, string[]>> {
  const text = await readFile(manifestPath, "utf8");
  const rows = parseManifestRows(text);
  const leafHandlesByArticle = new Map<string, string[]>();

  for (const row of rows) {
    const article = normalizeValue(row.image);
    if (!article) {
      continue;
    }

    const rootName = normalizeRootName(normalizeValue(row.category_main));
    const subName = normalizeValue(row.category_sub);
    if (!rootName || rootName === "__DROP__" || !subName) {
      continue;
    }

    const rootHandle = ROOT_HANDLE_BY_NAME.get(rootName);
    const leafHandle = LEAF_HANDLE_BY_KEY.get(`${rootName}::${subName}`);

    if (!rootHandle || !leafHandle) {
      throw new Error(
        `Manifest category "${rootName} / ${subName}" is not present in CATEGORY_TREE`
      );
    }

    const current = leafHandlesByArticle.get(article) ?? [];
    if (!current.includes(leafHandle)) {
      current.push(leafHandle);
      leafHandlesByArticle.set(article, current);
    }
  }

  return leafHandlesByArticle;
}

async function ensureCategories(
  container: ExecArgs["container"],
  logger: Logger
): Promise<Map<string, DbCategory>> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data } = await query.graph({
    entity: "product_category",
    fields: ["id", "handle", "name", "rank", "parent_category_id"],
  });

  const byHandle = new Map<string, DbCategory>(
    (data as DbCategory[]).map((category) => [category.handle, category])
  );

  const missingRoots = CATEGORY_TREE.filter((root) => !byHandle.has(root.handle));
  if (missingRoots.length > 0) {
    logger.info(`[categorize] creating ${missingRoots.length} missing roots`);
    const { result } = await createProductCategoriesWorkflow(container).run({
      input: {
        product_categories: missingRoots.map((root, index) => ({
          name: root.name,
          handle: root.handle,
          is_active: true,
          rank: CATEGORY_TREE.findIndex((candidate) => candidate.handle === root.handle),
        })),
      },
    });

    for (const category of result) {
      byHandle.set(category.handle, {
        id: category.id,
        handle: category.handle,
        name: category.name,
        rank: category.rank ?? null,
        parent_category_id: category.parent_category_id ?? null,
      });
    }
  }

  for (const [index, root] of CATEGORY_TREE.entries()) {
    const existing = byHandle.get(root.handle);
    if (!existing) {
      continue;
    }

    const needsUpdate =
      existing.name !== root.name ||
      existing.parent_category_id !== null ||
      (existing.rank ?? 0) !== index;

    if (!needsUpdate) {
      continue;
    }

    await updateProductCategoriesWorkflow(container).run({
      input: {
        selector: { id: existing.id },
        update: {
          name: root.name,
          parent_category_id: null,
          rank: index,
          is_active: true,
        },
      },
    });

    byHandle.set(root.handle, {
      ...existing,
      name: root.name,
      rank: index,
      parent_category_id: null,
    });
  }

  const missingLeaves: Array<{
    name: string;
    handle: string;
    parent_category_id: string;
    rank: number;
  }> = [];

  for (const root of CATEGORY_TREE) {
    const parent = byHandle.get(root.handle);
    if (!parent) {
      continue;
    }

    for (const [index, leaf] of root.children.entries()) {
      if (!byHandle.has(leaf.handle)) {
        missingLeaves.push({
          name: leaf.name,
          handle: leaf.handle,
          parent_category_id: parent.id,
          rank: index,
        });
      }
    }
  }

  if (missingLeaves.length > 0) {
    logger.info(`[categorize] creating ${missingLeaves.length} missing leaves`);
    const { result } = await createProductCategoriesWorkflow(container).run({
      input: { product_categories: missingLeaves },
    });

    for (const category of result) {
      byHandle.set(category.handle, {
        id: category.id,
        handle: category.handle,
        name: category.name,
        rank: category.rank ?? null,
        parent_category_id: category.parent_category_id ?? null,
      });
    }
  }

  for (const root of CATEGORY_TREE) {
    const parent = byHandle.get(root.handle);
    if (!parent) {
      continue;
    }

    for (const [index, leaf] of root.children.entries()) {
      const existing = byHandle.get(leaf.handle);
      if (!existing) {
        continue;
      }

      const needsUpdate =
        existing.name !== leaf.name ||
        existing.parent_category_id !== parent.id ||
        (existing.rank ?? 0) !== index;

      if (!needsUpdate) {
        continue;
      }

      await updateProductCategoriesWorkflow(container).run({
        input: {
          selector: { id: existing.id },
          update: {
            name: leaf.name,
            parent_category_id: parent.id,
            rank: index,
            is_active: true,
          },
        },
      });

      byHandle.set(leaf.handle, {
        ...existing,
        name: leaf.name,
        rank: index,
        parent_category_id: parent.id,
      });
    }
  }

  return byHandle;
}

async function cleanupStaleCategories(
  container: ExecArgs["container"],
  logger: Logger
) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data } = await query.graph({
    entity: "product_category",
    fields: ["id", "handle", "products.id", "parent_category_id"],
  });

  type CategoryWithProducts = {
    id: string;
    handle: string;
    parent_category_id: string | null;
    products?: Array<{ id: string }> | null;
  };

  const stale: CategoryWithProducts[] = [];

  for (const category of data as CategoryWithProducts[]) {
    const isCanonical =
      ALL_ROOT_HANDLES.has(category.handle) || ALL_LEAF_HANDLES.has(category.handle);
    if (isCanonical) {
      continue;
    }

    const productCount = category.products?.length ?? 0;
    if (productCount > 0) {
      logger.warn(
        `[cleanup] keeping stale category "${category.handle}" — still holds ${productCount} products`
      );
      continue;
    }

    stale.push(category);
  }

  if (stale.length === 0) {
    logger.info("[cleanup] no stale empty categories to delete");
    return;
  }

  logger.info(`[cleanup] deleting ${stale.length} stale empty categories`);

  const staleById = new Map(stale.map((category) => [category.id, category]));
  while (staleById.size > 0) {
    const batch = [...staleById.values()].filter((category) => {
      return ![...staleById.values()].some(
        (candidate) => candidate.parent_category_id === category.id
      );
    });

    if (batch.length === 0) {
      throw new Error("Could not resolve stale category delete order");
    }

    await deleteProductCategoriesWorkflow(container).run({
      input: batch.map((category) => category.id),
    });

    for (const category of batch) {
      staleById.delete(category.id);
    }
  }
}

function parseManifestRows(text: string): ManifestRow[] {
  const rows = parseCsv(text);
  if (rows.length === 0) {
    return [];
  }

  const [header, ...body] = rows;
  const indexes = {
    image: header.indexOf("image"),
    categoryMain: header.indexOf("category_main"),
    categorySub: header.indexOf("category_sub"),
  };

  if (
    indexes.image === -1 ||
    indexes.categoryMain === -1 ||
    indexes.categorySub === -1
  ) {
    throw new Error("Manifest is missing one of: image, category_main, category_sub");
  }

  return body
    .filter((row) => row.some((value) => value.trim().length > 0))
    .map((row) => ({
      image: row[indexes.image] ?? "",
      category_main: row[indexes.categoryMain] ?? "",
      category_sub: row[indexes.categorySub] ?? "",
    }));
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index++) {
    const char = text[index];

    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      row.push(field);
      field = "";
      continue;
    }

    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    if (char === "\r") {
      continue;
    }

    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

async function resolveManifestPath(manifestArg?: string): Promise<string> {
  const envPath = process.env.MANIFEST_CSV;
  const candidates = [
    manifestArg,
    envPath,
    resolve(process.cwd(), "manifest.csv"),
    resolve(process.cwd(), "../catalog-ai-pipeline/manifest.csv"),
    resolve(process.cwd(), "../../catalog-ai-pipeline/manifest.csv"),
    resolve(process.cwd(), "../../../catalog-ai-pipeline/manifest.csv"),
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    const absolutePath = resolve(process.cwd(), candidate);
    try {
      await access(absolutePath);
      return absolutePath;
    } catch {}
  }

  throw new Error("Could not find manifest.csv. Pass --manifest=/absolute/path/to/manifest.csv");
}

function normalizeValue(value: string | null | undefined): string {
  return String(value ?? "").trim();
}

function normalizeRootName(value: string): string {
  return ROOT_NAME_ALIASES[value] ?? value;
}

function dedupeStrings(values: Array<string | undefined>): string[] {
  const next = new Set<string>();
  for (const value of values) {
    if (!value) {
      continue;
    }
    next.add(value);
  }
  return [...next];
}

function parseArgs(args: string[]) {
  const output: {
    batch?: number;
    dir?: string;
    dryRun?: boolean;
    manifest?: string;
  } = {};

  for (const arg of args) {
    const stripped = arg.replace(/^--/, "");
    const [key, rawValue] = stripped.split("=");

    if (key === "dryRun") {
      output.dryRun = rawValue !== "false";
      continue;
    }

    if (key === "batch" && rawValue) {
      output.batch = Number(rawValue);
      continue;
    }

    if (key === "dir" && rawValue) {
      output.dir = rawValue;
      continue;
    }

    if (key === "manifest" && rawValue) {
      output.manifest = rawValue;
    }
  }

  return output;
}
