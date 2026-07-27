#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const CONFIRMATION = "FIX_LOCAL_MEASUREMENT_TAXONOMY";
const EXPECTED_BUBBLE_LEVELS = 10;
const TRIPOD_SKU = "DTLE9301";

function parseEnv(text) {
  const values = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[match[1]] = value;
  }
  return values;
}

function localUrl(value) {
  const url = new URL(value);
  if (!["localhost", "127.0.0.1", "::1"].includes(url.hostname)) {
    throw new Error(
      `This migration only supports local Medusa, received ${url.host}`,
    );
  }
  return url.toString().replace(/\/+$/, "");
}

const root = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "..",
);
const env = {
  ...parseEnv(
    await fs.readFile(
      path.join(root, "apps", "catalog-admin", ".env.local"),
      "utf8",
    ),
  ),
  ...process.env,
};
const baseUrl = localUrl(env.CATALOG_MEDUSA_ADMIN_URL);
const adminKey = env.CATALOG_MEDUSA_ADMIN_KEY?.trim();
if (!adminKey) throw new Error("CATALOG_MEDUSA_ADMIN_KEY is missing");
const headers = {
  Authorization: `Basic ${Buffer.from(`${adminKey}:`).toString("base64")}`,
  "Content-Type": "application/json",
};
const confirmed = process.argv.includes(`--confirm=${CONFIRMATION}`);
const timestamp = new Date().toISOString().replace(/[:.]/g, "");
const reportPath = path.join(
  root,
  "apps",
  "backend",
  "backups",
  `medusa-measurement-taxonomy-${timestamp}.json`,
);

async function request(pathname, init = {}, timeoutMs = 120_000) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...init,
    headers,
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    throw new Error(
      `${init.method || "GET"} ${pathname}: ${response.status} ${await response.text()}`,
    );
  }
  return response.status === 204 ? null : response.json();
}

async function updateProductCategories(product, categories) {
  const expectedIds = categories.map((category) => category.id).sort();
  try {
    await request(
      `/admin/products/${product.id}`,
      {
        method: "POST",
        body: JSON.stringify({
          title: product.title,
          status: product.status,
          description: product.description,
          categories,
        }),
      },
      2_000,
    );
  } catch (error) {
    if (!(error instanceof DOMException) || error.name !== "TimeoutError") {
      throw error;
    }
  }
  let lastError;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    try {
      const current = (
        await request(
          `/admin/products/${product.id}?fields=id,categories.id`,
          {},
          3_000,
        )
      ).product;
      const actualIds = (current.categories ?? [])
        .map((category) => category.id)
        .sort();
      if (JSON.stringify(actualIds) === JSON.stringify(expectedIds)) return;
      lastError = new Error(`Category update not visible for ${product.id}`);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error(`Category update failed for ${product.id}`);
}

async function loadState() {
  const categories = (
    await request(
      "/admin/product-categories?limit=1000&fields=id,name,handle,parent_category_id,rank",
    )
  ).product_categories;
  const products = [];
  for (let offset = 0; ; offset += 100) {
    const page = (
      await request(
        `/admin/products?limit=100&offset=${offset}&fields=id,title,handle,status,description,variants.sku,categories.id,categories.name,categories.handle,categories.parent_category_id`,
      )
    ).products;
    products.push(...page);
    if (page.length < 100) break;
  }
  return { categories, products };
}

function findCategory(categories, handle) {
  const category = categories.find((row) => row.handle === handle);
  if (!category) throw new Error(`Missing Medusa category ${handle}`);
  return category;
}

function buildPlan(state) {
  const powerTools = findCategory(state.categories, "scule-electrice");
  const handTools = findCategory(state.categories, "scule-de-mana");
  const accessories = findCategory(
    state.categories,
    "accesorii-si-consumabile-pentru-scule-accesorii-pentru-scule-electrice",
  );
  const laser = findCategory(
    state.categories,
    "masurare-si-electrica-nivele-si-instrumente-laser",
  );
  const manual = findCategory(state.categories, "masurare-si-trasare");
  if (laser.parent_category_id !== powerTools.id) {
    throw new Error("Laser category is no longer under Scule electrice");
  }
  if (![powerTools.id, handTools.id].includes(manual.parent_category_id)) {
    throw new Error("Manual measurement category has an unexpected parent");
  }

  const laserProducts = state.products.filter((product) =>
    product.categories?.some((category) => category.id === laser.id),
  );
  const manualProducts = state.products.filter((product) =>
    product.categories?.some((category) => category.id === manual.id),
  );
  const bubbleLevelsToMove = laserProducts.filter((product) =>
    /nivelă cu bulă|nivela cu bula/i.test(product.title),
  );
  const bubbleLevelsAlreadyMoved = manualProducts.filter((product) =>
    /nivelă cu bulă|nivela cu bula/i.test(product.title),
  );
  const bubbleLevels = [
    ...new Map(
      [...bubbleLevelsToMove, ...bubbleLevelsAlreadyMoved].map((product) => [
        product.id,
        product,
      ]),
    ).values(),
  ];
  if (bubbleLevels.length !== EXPECTED_BUBBLE_LEVELS) {
    throw new Error(
      `Expected ${EXPECTED_BUBBLE_LEVELS} sellable bubble levels, found ${bubbleLevels.length}`,
    );
  }
  const tripod = state.products.find((product) =>
    product.variants?.some((variant) => variant.sku === TRIPOD_SKU),
  );
  if (!tripod) throw new Error(`Missing tripod ${TRIPOD_SKU}`);
  const tripodInLaser = tripod.categories?.some(
    (category) => category.id === laser.id,
  );
  const tripodInAccessories = tripod.categories?.some(
    (category) => category.id === accessories.id,
  );
  if (!tripodInLaser && !tripodInAccessories) {
    throw new Error(`Tripod ${TRIPOD_SKU} has an unexpected category`);
  }

  return {
    categories: { powerTools, handTools, accessories, laser, manual },
    bubbleLevels,
    bubbleLevelsToMove,
    tripod,
    tripodNeedsMove: tripodInLaser,
    retainedLaserProducts: laserProducts.filter(
      (product) =>
        product.id !== tripod.id &&
        !bubbleLevels.some((row) => row.id === product.id),
    ),
  };
}

function categoryIdsAfterMove(product, fromId, toId) {
  return [
    ...new Set([
      ...(product.categories ?? [])
        .map((category) => category.id)
        .filter((id) => id !== fromId),
      toId,
    ]),
  ].map((id) => ({ id }));
}

const before = await loadState();
const plan = buildPlan(before);
const summary = {
  mode: confirmed ? "execute" : "dry_run",
  moveCategory: {
    name: plan.categories.manual.name,
    from: plan.categories.powerTools.name,
    to: plan.categories.handTools.name,
  },
  renameCategory: {
    from: plan.categories.laser.name,
    to: "Măsurare laser",
  },
  bubbleLevels: plan.bubbleLevels.map((product) => ({
    id: product.id,
    sku: product.variants?.[0]?.sku ?? null,
    title: product.title,
  })),
  bubbleLevelsToMove: plan.bubbleLevelsToMove.length,
  tripod: {
    id: plan.tripod.id,
    sku: TRIPOD_SKU,
    title: plan.tripod.title,
    destination: plan.categories.accessories.name,
  },
  retainedLaserProducts: plan.retainedLaserProducts.map((product) => ({
    sku: product.variants?.[0]?.sku ?? null,
    title: product.title,
  })),
};

if (!confirmed) {
  console.log(JSON.stringify(summary, null, 2));
  console.log(`Dry run only. Re-run with --confirm=${CONFIRMATION}`);
  process.exit(0);
}

await fs.mkdir(path.dirname(reportPath), { recursive: true });
await fs.writeFile(
  reportPath,
  `${JSON.stringify({ generatedAt: new Date().toISOString(), before: summary }, null, 2)}\n`,
);

if (
  plan.categories.manual.parent_category_id !== plan.categories.handTools.id
) {
  await request(`/admin/product-categories/${plan.categories.manual.id}`, {
    method: "POST",
    body: JSON.stringify({ parent_category_id: plan.categories.handTools.id }),
  });
}
if (plan.categories.laser.name !== "Măsurare laser") {
  await request(`/admin/product-categories/${plan.categories.laser.id}`, {
    method: "POST",
    body: JSON.stringify({
      name: "Măsurare laser",
      parent_category_id: plan.categories.powerTools.id,
    }),
  });
}
for (const product of plan.bubbleLevelsToMove) {
  await updateProductCategories(
    product,
    categoryIdsAfterMove(
      product,
      plan.categories.laser.id,
      plan.categories.manual.id,
    ),
  );
}
if (plan.tripodNeedsMove) {
  await updateProductCategories(
    plan.tripod,
    categoryIdsAfterMove(
      plan.tripod,
      plan.categories.laser.id,
      plan.categories.accessories.id,
    ),
  );
}

const after = await loadState();
const laserAfter = findCategory(
  after.categories,
  "masurare-si-electrica-nivele-si-instrumente-laser",
);
const manualAfter = findCategory(after.categories, "masurare-si-trasare");
const productsIn = (categoryId) =>
  after.products.filter((product) =>
    product.categories?.some((category) => category.id === categoryId),
  );
const laserProductsAfter = productsIn(laserAfter.id);
const manualProductsAfter = productsIn(manualAfter.id);
const accessoryProductsAfter = productsIn(plan.categories.accessories.id);
const verification = {
  manualParentId: manualAfter.parent_category_id,
  expectedManualParentId: plan.categories.handTools.id,
  laserName: laserAfter.name,
  laserProducts: laserProductsAfter.length,
  bubbleLevelsInLaser: laserProductsAfter.filter((product) =>
    /nivelă cu bulă|nivela cu bula/i.test(product.title),
  ).length,
  manualProducts: manualProductsAfter.length,
  movedBubbleLevels: manualProductsAfter.filter((product) =>
    /nivelă cu bulă|nivela cu bula/i.test(product.title),
  ).length,
  tripodInAccessories: accessoryProductsAfter.some((product) =>
    product.variants?.some((variant) => variant.sku === TRIPOD_SKU),
  ),
};
if (
  verification.manualParentId !== verification.expectedManualParentId ||
  verification.laserName !== "Măsurare laser" ||
  verification.bubbleLevelsInLaser !== 0 ||
  verification.movedBubbleLevels !== EXPECTED_BUBBLE_LEVELS ||
  !verification.tripodInAccessories
) {
  throw new Error(
    `Post-migration verification failed: ${JSON.stringify(verification)}`,
  );
}

const report = {
  generatedAt: new Date().toISOString(),
  status: "complete",
  before: summary,
  verification,
};
await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ reportPath, ...report }, null, 2));
