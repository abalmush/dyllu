#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const EXPECTED_SKUS = 888;

function parseEnv(text) {
  const values = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    values[match[1]] = value;
  }
  return values;
}

function localUrl(value, label) {
  const url = new URL(value);
  if (!["localhost", "127.0.0.1", "::1"].includes(url.hostname)) throw new Error(`${label} must target localhost, received ${url.host}`);
  return url.toString().replace(/\/+$/, "");
}

function flag(name) {
  const prefix = `--${name}=`;
  return process.argv.slice(2).find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const env = { ...parseEnv(await fs.readFile(path.join(root, "apps", "catalog-admin", ".env.local"), "utf8")), ...process.env };
const medusaUrl = localUrl(env.CATALOG_MEDUSA_ADMIN_URL, "Medusa Admin URL");
const catalogUrl = localUrl(flag("catalog-url") || "http://localhost:4100", "Catalog Admin URL");
const adminKey = env.CATALOG_MEDUSA_ADMIN_KEY?.trim();
if (!adminKey) throw new Error("CATALOG_MEDUSA_ADMIN_KEY is missing");
const authorization = `Basic ${Buffer.from(`${adminKey}:`).toString("base64")}`;
const reportPath = path.resolve(flag("report") || path.join(root, "apps", "backend", "backups", "medusa-catalog-qa-report.json"));

async function request(pathname) {
  const response = await fetch(`${medusaUrl}${pathname}`, {
    headers: { Authorization: authorization, "Content-Type": "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) throw new Error(`GET ${pathname} failed: ${response.status} ${response.statusText} ${await response.text()}`);
  return response.json();
}

async function catalogPackage() {
  const response = await fetch(`${catalogUrl}/bulk/export?scope=complete`, { cache: "no-store", signal: AbortSignal.timeout(120_000) });
  if (!response.ok) throw new Error(`Catalog export failed: ${response.status} ${response.statusText}`);
  return response.json();
}

async function products() {
  const out = [];
  const fields = encodeURIComponent("id,title,handle,status,description,metadata,images.url,variants.id,variants.sku,variants.title,variants.prices.amount,variants.prices.currency_code,categories.id,categories.name,categories.handle,categories.parent_category_id");
  for (let offset = 0; offset < 20_000; offset += 100) {
    const data = await request(`/admin/products?limit=100&offset=${offset}&fields=${fields}`);
    const page = data.products || [];
    out.push(...page);
    if (page.length < 100) break;
  }
  return out;
}

async function categories() {
  const data = await request("/admin/product-categories?limit=1000&fields=id,name,handle,parent_category_id");
  return data.product_categories || [];
}

const packageData = await catalogPackage();
const [medusaProducts, medusaCategories] = await Promise.all([products(), categories()]);
const requireFromCatalogAdmin = createRequire(path.join(root, "apps", "catalog-admin", "package.json"));
const Database = requireFromCatalogAdmin("better-sqlite3");
const sqlite = new Database(path.join(root, "apps", "catalog-admin", "data", "catalog.db"), { readonly: true });
const profileRows = sqlite.prepare("SELECT sku, profile_key, profile_label, power_source FROM spec_variant_profile").all();
sqlite.close();
const profileBySku = new Map(profileRows.map((row) => [row.sku, row]));

const issues = [];
function issue(severity, type, detail, extra = {}) {
  issues.push({ severity, type, detail, ...extra });
}

const expectedRecords = new Map(packageData.records.map((record) => [record.sku, record]));
const actualBySku = new Map();
for (const product of medusaProducts) {
  if ((product.variants || []).length !== 1) issue("error", "variant_count", `Expected one variant, found ${(product.variants || []).length}`, { productId: product.id, title: product.title });
  for (const variant of product.variants || []) {
    if (!variant.sku) issue("error", "missing_sku", "Medusa variant has no SKU", { productId: product.id, title: product.title });
    else if (actualBySku.has(variant.sku)) issue("error", "duplicate_sku", "SKU appears more than once in Medusa", { sku: variant.sku });
    else actualBySku.set(variant.sku, { product, variant });
  }
}

for (const [sku, expected] of expectedRecords) {
  const actual = actualBySku.get(sku);
  if (!actual) {
    issue("error", "missing_product", "Sellable SKU is missing from Medusa", { sku });
    continue;
  }
  const { product, variant } = actual;
  const expectedBody = expected.targetRequest?.body;
  const expectedTitle = expectedBody?.title || expected.variant?.nameRo || expected.family?.titleRo || sku;
  if (!expectedBody) issue("error", "missing_request", "Catalog did not generate a Medusa request", { sku });
  if (product.title !== expectedTitle) issue("error", "title_mismatch", "Medusa title differs from catalog", { sku, expected: expectedTitle, actual: product.title });
  if (product.status !== "published") issue("error", "status", "Product is not published", { sku, actual: product.status });
  if (!product.description?.trim() || product.description.trim().length < 50) issue("error", "description", "Description is missing or too short", { sku, length: product.description?.trim().length || 0 });
  if (!expected.specifications?.length) issue("error", "specifications", "Catalog record has no specifications", { sku });
  let actualSpecs = [];
  try {
    actualSpecs = JSON.parse(product.metadata?.specs || "[]");
  } catch {
    issue("error", "spec_metadata", "Medusa specification metadata is invalid JSON", { sku });
  }
  if (actualSpecs.length !== expected.specifications.length) issue("error", "spec_count_mismatch", "Specification count differs from catalog", { sku, expected: expected.specifications.length, actual: actualSpecs.length });
  if (actualSpecs.some((row) => !row.label || !row.value)) issue("error", "empty_spec", "Medusa has a specification with an empty label or value", { sku });
  if (actualSpecs.some((row) => /in funcție de variant|depending on variant/i.test(`${row.value}`))) issue("error", "aggregate_spec", "Medusa has a family-level aggregate specification", { sku });
  const expectedCategory = expected.category?.handle;
  const actualCategoryHandles = (product.categories || []).map((category) => category.handle);
  if (!expectedCategory || actualCategoryHandles.length !== 1 || actualCategoryHandles[0] !== expectedCategory) issue("error", "category_mismatch", "Medusa category differs from catalog", { sku, expected: expectedCategory, actual: actualCategoryHandles });
  if ((product.categories || []).some((category) => !category.parent_category_id)) issue("error", "root_category_assignment", "Product is assigned directly to a parent category", { sku, actual: actualCategoryHandles });
  const expectedImage = expected.image?.url || null;
  const actualImages = (product.images || []).map((image) => image.url);
  if (!expectedImage || !actualImages.includes(expectedImage)) issue("error", "image_mismatch", "CDN hero image is missing in Medusa", { sku, expected: expectedImage, actual: actualImages });
  if (actualImages.some((url) => !url.startsWith("https://cdn.dyllu.md/"))) issue("error", "non_cdn_image", "Medusa image is not served by the DYLLU CDN", { sku, actual: actualImages });
  const prices = variant.prices || [];
  const mdlPrice = prices.find((price) => price.currency_code === "mdl")?.amount;
  if (mdlPrice !== expected.variant.priceMdl) issue("error", "price_mismatch", "Medusa MDL price differs from catalog", { sku, expected: expected.variant.priceMdl, actual: mdlPrice ?? null });
  const title = `${expectedTitle}`;
  if (/^(chainsaw|cordless|electric|digital|spray gun|tool set|battery|charger|air |water pump|safety |protective )/i.test(title)) issue("warning", "english_title", "Product title appears to be English", { sku, title });
  if (!profileBySku.has(sku)) issue("warning", "missing_profile", "Functional specification profile is missing", { sku, title });
}

for (const sku of actualBySku.keys()) {
  if (!expectedRecords.has(sku)) issue("error", "unexpected_product", "Medusa contains a SKU outside the sellable assortment", { sku });
}

const expectedCategoryByHandle = new Map(packageData.categories.map((category) => [category.handle, category]));
const actualCategoryByHandle = new Map(medusaCategories.map((category) => [category.handle, category]));
for (const [handle, expected] of expectedCategoryByHandle) {
  const actual = actualCategoryByHandle.get(handle);
  if (!actual) issue("error", "missing_category", "Expected category is missing from Medusa", { handle, path: expected.path });
  else {
    if (actual.name !== expected.name) issue("error", "category_name", "Category name differs from catalog", { handle, expected: expected.name, actual: actual.name });
    const actualParent = actual.parent_category_id ? medusaCategories.find((row) => row.id === actual.parent_category_id)?.handle || null : null;
    if (actualParent !== expected.parentHandle) issue("error", "category_parent", "Category parent differs from catalog", { handle, expected: expected.parentHandle, actual: actualParent });
  }
}
for (const handle of actualCategoryByHandle.keys()) {
  if (!expectedCategoryByHandle.has(handle)) issue("error", "unexpected_category", "Medusa contains a category outside the import taxonomy", { handle });
}

const productCountByCategory = new Map();
for (const { product } of actualBySku.values()) {
  for (const category of product.categories || []) productCountByCategory.set(category.handle, (productCountByCategory.get(category.handle) || 0) + 1);
}
for (const category of packageData.categories.filter((row) => row.parentHandle)) {
  if (!productCountByCategory.get(category.handle)) issue("warning", "empty_leaf_category", "Imported leaf category has no products", { handle: category.handle, path: category.path });
}

const duplicateTitles = new Map();
for (const [sku, { product }] of actualBySku) {
  const key = product.title.trim().toLocaleLowerCase("ro");
  const rows = duplicateTitles.get(key) || [];
  rows.push(sku);
  duplicateTitles.set(key, rows);
}
for (const [title, skus] of duplicateTitles) {
  if (skus.length > 1) issue("warning", "duplicate_title", "Multiple sellable products have the same customer-facing title", { title, skus });
}

const countsByType = issues.reduce((counts, row) => ({ ...counts, [row.type]: (counts[row.type] || 0) + 1 }), {});
const report = {
  generatedAt: new Date().toISOString(),
  target: new URL(medusaUrl).host,
  summary: {
    expectedSkus: EXPECTED_SKUS,
    medusaProducts: medusaProducts.length,
    medusaSkus: actualBySku.size,
    expectedCategories: packageData.categories.length,
    medusaCategories: medusaCategories.length,
    rootCategories: medusaCategories.filter((category) => !category.parent_category_id).length,
    leafCategories: medusaCategories.filter((category) => category.parent_category_id).length,
    errors: issues.filter((row) => row.severity === "error").length,
    warnings: issues.filter((row) => row.severity === "warning").length,
    countsByType,
  },
  issues,
};

await fs.mkdir(path.dirname(reportPath), { recursive: true });
await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report.summary, null, 2));
if (report.summary.errors) process.exitCode = 1;
