import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

type CsvRow = Record<string, string>;

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function parseCsv(text: string): CsvRow[] {
  const lines = text.replace(/^﻿/, "").split(/\r\n|\n/).filter((l) => l.length > 0);
  const header = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: CsvRow = {};
    header.forEach((key, i) => (row[key] = values[i] ?? ""));
    return row;
  });
}

type CategoryNode = {
  name: string;
  handle: string;
  children: CategoryNode[];
};

const csvPath = resolve(
  process.cwd(),
  "data",
  "ingco",
  "project",
  "Dyllu_Taxonomy_v4_Package",
  "Dyllu_Taxonomy_v4.csv"
);
const rows = parseCsv(readFileSync(csvPath, "utf8"));

const root: { children: CategoryNode[] } = { children: [] };
const nodeByParentKey = new Map<string, CategoryNode>();
// L1/L2 is the confirmed depth for the site (no 3rd category level) — L3 is
// intentionally dropped even though it exists in the source CSV.
const terminalHandleByPath = new Map<string, string>();

function flattenHandles(nodes: CategoryNode[]): string[] {
  return nodes.flatMap((n) => [n.handle, ...flattenHandles(n.children)]);
}

function findOrCreate(
  parentChildren: CategoryNode[],
  parentKey: string,
  parentHandle: string,
  name: string,
  rawHandle: string
): CategoryNode {
  const key = `${parentKey}>>${name}`;
  const existing = nodeByParentKey.get(key);
  if (existing) return existing;

  let handle = rawHandle;
  const usedHandles = new Set(flattenHandles(root.children));
  let suffixSource = parentHandle;
  while (usedHandles.has(handle)) {
    handle = `${handle}-${suffixSource}`;
    suffixSource = "x";
  }

  const node: CategoryNode = { name, handle, children: [] };
  nodeByParentKey.set(key, node);
  parentChildren.push(node);
  return node;
}

for (const row of rows) {
  const l1 = row.level_1.trim();
  const l2 = row.level_2.trim();
  const segs = row.category_url_path.trim().replace(/^\/|\/$/g, "").split("/");

  const l1Node = findOrCreate(root.children, "root", "root", l1, segs[0]);
  const l2Node = findOrCreate(
    l1Node.children,
    `root>>${l1}`,
    l1Node.handle,
    l2,
    segs[1]
  );

  terminalHandleByPath.set(`${l1}|${l2}`, l2Node.handle);
}

const collisions = flattenHandles(root.children).filter(
  (h, i, arr) => arr.indexOf(h) !== i
);
if (collisions.length > 0) {
  throw new Error(
    `[generate-category-tree-v4] handle collisions survived disambiguation: ${collisions.join(", ")}`
  );
}

const tsOut = `export type CategoryNode = {
  name: string;
  handle: string;
  children: CategoryNode[];
};

export const CATEGORY_TREE: CategoryNode[] = ${JSON.stringify(root.children, null, 2)};

function flattenHandles(nodes: CategoryNode[]): string[] {
  return nodes.flatMap((n) => [n.handle, ...flattenHandles(n.children)]);
}

function terminalNodes(nodes: CategoryNode[]): CategoryNode[] {
  return nodes.flatMap((n) =>
    n.children.length > 0 ? terminalNodes(n.children) : [n]
  );
}

export const ALL_CATEGORY_HANDLES = new Set(flattenHandles(CATEGORY_TREE));
export const ALL_ROOT_HANDLES = new Set(CATEGORY_TREE.map((root) => root.handle));
export const TERMINAL_HANDLES = new Set(
  terminalNodes(CATEGORY_TREE).map((n) => n.handle)
);
`;

writeFileSync(
  resolve(process.cwd(), "src", "data", "category-tree.ts"),
  tsOut,
  "utf8"
);

writeFileSync(
  resolve(process.cwd(), "data", "ingco", "category-terminal-handles-v4.json"),
  JSON.stringify(Object.fromEntries(terminalHandleByPath), null, 2),
  "utf8"
);

console.log(
  `[generate-category-tree-v4] wrote ${root.children.length} roots, ${flattenHandles(root.children).length} total nodes`
);
