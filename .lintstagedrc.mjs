import path from "node:path";

const repoRoot = process.cwd();

function quoteFiles(filenames) {
  return filenames.map((f) => JSON.stringify(f)).join(" ");
}

function relativeToWorkspace(filenames, workspaceDir) {
  const absWorkspace = path.join(repoRoot, workspaceDir);
  return filenames
    .map((f) => path.relative(absWorkspace, f))
    .map((f) => JSON.stringify(f))
    .join(" ");
}

export default {
  "apps/storefront/**/*.{ts,tsx,js,jsx,mjs}": (filenames) => [
    `pnpm -F @dyllu/storefront exec eslint --fix ${relativeToWorkspace(filenames, "apps/storefront")}`,
    `prettier --write ${quoteFiles(filenames)}`,
  ],
  "**/*.{json,md,css,yml,yaml}": (filenames) =>
    `prettier --write ${quoteFiles(filenames)}`,
};
