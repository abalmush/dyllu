#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

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

async function pool(items, concurrency, worker) {
  let cursor = 0;
  async function run() {
    while (cursor < items.length) await worker(items[cursor++]);
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
}

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const env = { ...parseEnv(await fs.readFile(path.join(root, "apps", "catalog-admin", ".env.local"), "utf8")), ...process.env };
const medusaUrl = localUrl(env.CATALOG_MEDUSA_ADMIN_URL, "Medusa Admin URL");
const catalogUrl = localUrl(flag("catalog-url") || "http://localhost:4100", "Catalog Admin URL");
const adminKey = env.CATALOG_MEDUSA_ADMIN_KEY?.trim();
if (!adminKey) throw new Error("CATALOG_MEDUSA_ADMIN_KEY is missing");
const authorization = `Basic ${Buffer.from(`${adminKey}:`).toString("base64")}`;
const changePaths = (flag("changes") || "").split(",").filter(Boolean).map((value) => path.resolve(value));
const explicitSkus = (flag("skus") || "").split(",").map((value) => value.trim()).filter(Boolean);
if (!changePaths.length && !explicitSkus.length) {
  throw new Error("Pass --changes=<report.json>[,<report.json>] or --skus=<sku>[,<sku>]");
}
const reportPath = path.resolve(flag("report") || path.join(root, "apps", "backend", "backups", "medusa-catalog-update-report.json"));

const skuSet = new Set(explicitSkus);
for (const changePath of changePaths) {
  const changeReport = JSON.parse(await fs.readFile(changePath, "utf8"));
  for (const change of changeReport.changes || []) skuSet.add(change.sku);
}

async function catalogExport() {
  const response = await fetch(`${catalogUrl}/bulk/export?scope=complete`, { cache: "no-store", signal: AbortSignal.timeout(120_000) });
  if (!response.ok) throw new Error(`Catalog export failed: ${response.status} ${response.statusText}`);
  return response.json();
}

let packageData = await catalogExport();
if (packageData.summary.blockedSkus !== 0) throw new Error(`Catalog has ${packageData.summary.blockedSkus} blocked SKUs`);

const categoryResponse = await fetch(`${medusaUrl}/admin/product-categories?limit=1000&fields=id,name,handle,parent_category_id`, {
  headers: { Authorization: authorization, "Content-Type": "application/json" },
  cache: "no-store",
  signal: AbortSignal.timeout(120_000),
});
if (!categoryResponse.ok) throw new Error(`Medusa category read failed: ${categoryResponse.status} ${categoryResponse.statusText}`);
const currentCategories = (await categoryResponse.json()).product_categories || [];
const currentCategoryByHandle = new Map(currentCategories.map((category) => [category.handle, category]));
let updatedCategories = 0;
let createdCategories = 0;
for (const expected of packageData.categories) {
  let current = currentCategoryByHandle.get(expected.handle);
  const expectedParentId = expected.parentHandle ? currentCategoryByHandle.get(expected.parentHandle)?.id : null;
  if (expected.parentHandle && !expectedParentId) throw new Error(`Medusa parent ${expected.parentHandle} is unresolved`);
  if (!current) {
    const response = await fetch(`${medusaUrl}/admin/product-categories`, {
      method: "POST",
      headers: { Authorization: authorization, "Content-Type": "application/json" },
      body: JSON.stringify({ name: expected.name, handle: expected.handle, is_active: true, parent_category_id: expectedParentId }),
      signal: AbortSignal.timeout(120_000),
    });
    if (!response.ok) throw new Error(`Medusa category create failed for ${expected.handle}: ${response.status} ${response.statusText} ${await response.text()}`);
    current = (await response.json()).product_category;
    if (!current?.id) throw new Error(`Medusa category create returned no ID for ${expected.handle}`);
    currentCategoryByHandle.set(expected.handle, current);
    createdCategories += 1;
    continue;
  }
  if (current.name === expected.name && (current.parent_category_id || null) === expectedParentId) continue;
  const response = await fetch(`${medusaUrl}/admin/product-categories/${current.id}`, {
    method: "POST",
    headers: { Authorization: authorization, "Content-Type": "application/json" },
    body: JSON.stringify({ name: expected.name, parent_category_id: expectedParentId }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) throw new Error(`Medusa category update failed for ${expected.handle}: ${response.status} ${response.statusText} ${await response.text()}`);
  updatedCategories += 1;
}

if (createdCategories) {
  packageData = await catalogExport();
  if (packageData.summary.blockedSkus !== 0) throw new Error(`Catalog has ${packageData.summary.blockedSkus} blocked SKUs after category creation`);
}

const requestBySku = new Map(packageData.requests.map((entry) => [entry.sku, entry]));
const entries = [...skuSet].map((sku) => requestBySku.get(sku)).filter(Boolean);
if (entries.length !== skuSet.size) throw new Error(`Generated ${entries.length} requests for ${skuSet.size} changed SKUs`);

const failures = [];
let updated = 0;
await pool(entries, 6, async (entry) => {
  try {
    const response = await fetch(`${medusaUrl}${entry.request.path}`, {
      method: entry.request.method,
      headers: { Authorization: authorization, "Content-Type": "application/json" },
      body: JSON.stringify(entry.request.body),
      signal: AbortSignal.timeout(120_000),
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText} ${await response.text()}`);
    updated += 1;
    if (updated % 50 === 0 || updated === entries.length) console.log(`[update] ${updated}/${entries.length}`);
  } catch (error) {
    failures.push({ sku: entry.sku, error: error instanceof Error ? error.message : String(error) });
  }
});

const report = {
  generatedAt: new Date().toISOString(),
  target: new URL(medusaUrl).host,
  requested: entries.length,
  updated,
  updatedCategories,
  createdCategories,
  failures,
};
await fs.mkdir(path.dirname(reportPath), { recursive: true });
await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
