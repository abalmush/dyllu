#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const CONFIRMATION = "RESET_LOCAL_MEDUSA";
const EXPECTED_SKUS = 888;
const EXPECTED_CATEGORIES = 106;

function parseEnv(text) {
  const values = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[match[1]] = value;
  }
  return values;
}

function localUrl(value, label) {
  const url = new URL(value);
  if (!["localhost", "127.0.0.1", "::1"].includes(url.hostname)) {
    throw new Error(`${label} must target localhost, received ${url.host}`);
  }
  return url.toString().replace(/\/+$/, "");
}

function flag(name) {
  const prefix = `--${name}=`;
  return process.argv.slice(2).find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

async function pool(items, concurrency, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
  return results;
}

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const envPath = path.join(root, "apps", "catalog-admin", ".env.local");
const env = { ...parseEnv(await fs.readFile(envPath, "utf8")), ...process.env };
const medusaUrl = localUrl(env.CATALOG_MEDUSA_ADMIN_URL, "Medusa Admin URL");
const catalogUrl = localUrl(flag("catalog-url") || "http://localhost:4100", "Catalog Admin URL");
const adminKey = env.CATALOG_MEDUSA_ADMIN_KEY?.trim();
if (!adminKey) throw new Error("CATALOG_MEDUSA_ADMIN_KEY is missing");
const authorization = `Basic ${Buffer.from(`${adminKey}:`).toString("base64")}`;
const confirmed = process.argv.includes(`--confirm=${CONFIRMATION}`);
const reportPath = path.resolve(flag("report") || path.join(root, "apps", "backend", "backups", "medusa-fresh-import-report.json"));

const report = {
  startedAt: new Date().toISOString(),
  target: new URL(medusaUrl).host,
  catalog: new URL(catalogUrl).host,
  confirmed,
  expected: { skus: EXPECTED_SKUS, categories: EXPECTED_CATEGORIES },
  phases: [],
};

async function request(base, pathname, init = {}) {
  const response = await fetch(`${base}${pathname}`, {
    ...init,
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`${init.method || "GET"} ${pathname} failed: ${response.status} ${response.statusText} ${body}`);
  }
  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function catalogPackage() {
  const response = await fetch(`${catalogUrl}/bulk/export?scope=complete`, {
    cache: "no-store",
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) throw new Error(`Catalog export failed: ${response.status} ${response.statusText}`);
  return response.json();
}

async function categories() {
  const data = await request(medusaUrl, "/admin/product-categories?limit=1000&fields=id,name,handle,parent_category_id");
  return data.product_categories || [];
}

async function products() {
  const rows = [];
  for (let offset = 0; offset < 20_000; offset += 100) {
    const fields = encodeURIComponent("id,handle,title,status,variants.id,variants.sku,categories.id,categories.handle,categories.parent_category_id");
    const data = await request(medusaUrl, `/admin/products?limit=100&offset=${offset}&fields=${fields}`);
    const page = data.products || [];
    rows.push(...page);
    if (page.length < 100) break;
  }
  return rows;
}

function validatePackage(pkg, { requireRequests }) {
  if (pkg.schemaVersion !== "dyllu.medusa-import.v1") throw new Error(`Unexpected schema ${pkg.schemaVersion}`);
  if (pkg.summary.eligibleSkus !== EXPECTED_SKUS) throw new Error(`Expected ${EXPECTED_SKUS} eligible SKUs, got ${pkg.summary.eligibleSkus}`);
  if (pkg.summary.blockedSkus !== 0) throw new Error(`Catalog still has ${pkg.summary.blockedSkus} blocked SKUs`);
  if (pkg.categories.length !== EXPECTED_CATEGORIES) throw new Error(`Expected ${EXPECTED_CATEGORIES} categories, got ${pkg.categories.length}`);
  if (requireRequests && pkg.requests.length !== EXPECTED_SKUS) throw new Error(`Expected ${EXPECTED_SKUS} requests, got ${pkg.requests.length}`);
  const skus = new Set((pkg.records || []).map((row) => row.sku));
  if (skus.size !== EXPECTED_SKUS) throw new Error(`Expected ${EXPECTED_SKUS} unique records, got ${skus.size}`);
}

async function persist() {
  report.finishedAt = new Date().toISOString();
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
}

try {
  const initialPackage = await catalogPackage();
  validatePackage(initialPackage, { requireRequests: false });
  const currentProducts = await products();
  const currentCategories = await categories();
  report.phases.push({
    phase: "preflight",
    catalogSkus: initialPackage.summary.eligibleSkus,
    desiredCategories: initialPackage.categories.length,
    currentProducts: currentProducts.length,
    currentCategories: currentCategories.length,
    currentRequests: initialPackage.requests.length,
  });

  if (!confirmed) {
    report.status = "dry_run";
    await persist();
    console.log(JSON.stringify(report, null, 2));
    console.log(`Dry run only. Re-run with --confirm=${CONFIRMATION}`);
    process.exit(0);
  }

  let deletedProducts = 0;
  await pool(currentProducts, 8, async (product) => {
    await request(medusaUrl, `/admin/products/${product.id}`, { method: "DELETE" });
    deletedProducts += 1;
    if (deletedProducts % 100 === 0 || deletedProducts === currentProducts.length) {
      console.log(`[reset] products deleted ${deletedProducts}/${currentProducts.length}`);
    }
  });
  const productsAfterDelete = await products();
  if (productsAfterDelete.length !== 0) throw new Error(`${productsAfterDelete.length} products remain after reset`);
  report.phases.push({ phase: "delete_products", deleted: deletedProducts, remaining: 0 });

  const categoryDepth = new Map(currentCategories.map((category) => [category.id, category.parent_category_id ? 1 : 0]));
  const childFirst = [...currentCategories].sort((left, right) => (categoryDepth.get(right.id) || 0) - (categoryDepth.get(left.id) || 0));
  let deletedCategories = 0;
  for (const category of childFirst) {
    await request(medusaUrl, `/admin/product-categories/${category.id}`, { method: "DELETE" });
    deletedCategories += 1;
  }
  const categoriesAfterDelete = await categories();
  if (categoriesAfterDelete.length !== 0) throw new Error(`${categoriesAfterDelete.length} categories remain after reset`);
  report.phases.push({ phase: "delete_categories", deleted: deletedCategories, remaining: 0 });

  const categoryIdByHandle = new Map();
  const orderedCategories = [...initialPackage.categories].sort((left, right) => Number(Boolean(left.parentHandle)) - Number(Boolean(right.parentHandle)) || left.path.localeCompare(right.path, "ro"));
  for (const [index, category] of orderedCategories.entries()) {
    const parentId = category.parentHandle ? categoryIdByHandle.get(category.parentHandle) : null;
    if (category.parentHandle && !parentId) throw new Error(`Parent ${category.parentHandle} is missing for ${category.handle}`);
    const data = await request(medusaUrl, "/admin/product-categories", {
      method: "POST",
      body: JSON.stringify({
        name: category.name,
        handle: category.handle,
        is_active: true,
        is_internal: false,
        parent_category_id: parentId,
        rank: index,
      }),
    });
    const created = data.product_category;
    if (!created?.id) throw new Error(`Category ${category.handle} did not return an id`);
    categoryIdByHandle.set(category.handle, created.id);
  }
  const createdCategories = await categories();
  if (createdCategories.length !== EXPECTED_CATEGORIES) throw new Error(`Created ${createdCategories.length} categories, expected ${EXPECTED_CATEGORIES}`);
  report.phases.push({ phase: "create_categories", created: createdCategories.length });

  const resolvedPackage = await catalogPackage();
  validatePackage(resolvedPackage, { requireRequests: true });
  const unresolvedCategories = resolvedPackage.categories.filter((category) => category.action !== "reuse");
  if (unresolvedCategories.length) throw new Error(`${unresolvedCategories.length} categories are still unresolved after creation`);
  report.phases.push({
    phase: "resolve_import",
    requests: resolvedPackage.requests.length,
    blocked: resolvedPackage.summary.blockedSkus,
    actions: resolvedPackage.requests.reduce((counts, row) => ({ ...counts, [row.action]: (counts[row.action] || 0) + 1 }), {}),
  });

  let imported = 0;
  const failures = [];
  await pool(resolvedPackage.requests, 6, async (entry) => {
    try {
      await request(medusaUrl, entry.request.path, {
        method: entry.request.method,
        body: JSON.stringify(entry.request.body),
      });
      imported += 1;
      if (imported % 100 === 0 || imported === resolvedPackage.requests.length) {
        console.log(`[import] products created ${imported}/${resolvedPackage.requests.length}`);
      }
    } catch (error) {
      failures.push({ sku: entry.sku, error: error instanceof Error ? error.message : String(error) });
    }
  });
  report.phases.push({ phase: "import_products", imported, failures });
  if (failures.length) throw new Error(`${failures.length} product imports failed`);

  const finalProducts = await products();
  const finalCategories = await categories();
  const finalSkus = finalProducts.flatMap((product) => product.variants || []).map((variant) => variant.sku).filter(Boolean);
  const uniqueFinalSkus = new Set(finalSkus);
  if (finalProducts.length !== EXPECTED_SKUS) throw new Error(`Expected ${EXPECTED_SKUS} products, got ${finalProducts.length}`);
  if (uniqueFinalSkus.size !== EXPECTED_SKUS) throw new Error(`Expected ${EXPECTED_SKUS} unique SKUs, got ${uniqueFinalSkus.size}`);
  if (finalCategories.length !== EXPECTED_CATEGORIES) throw new Error(`Expected ${EXPECTED_CATEGORIES} categories, got ${finalCategories.length}`);
  report.phases.push({
    phase: "verification",
    products: finalProducts.length,
    variants: finalSkus.length,
    uniqueSkus: uniqueFinalSkus.size,
    categories: finalCategories.length,
  });
  report.status = "complete";
  await persist();
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  report.status = "failed";
  report.error = error instanceof Error ? error.message : String(error);
  await persist();
  console.error(JSON.stringify(report, null, 2));
  process.exitCode = 1;
}
