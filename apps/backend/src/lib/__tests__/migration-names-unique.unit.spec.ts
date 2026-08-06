import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = join(__dirname, "..", "..", "..", "..", "..");
const PACKAGES_DIR = join(REPO_ROOT, "packages");

function findMigrationFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".medusa") continue;
    const path = join(dir, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) {
      found.push(...findMigrationFiles(path));
      continue;
    }
    if (
      entry.startsWith("Migration") &&
      entry.endsWith(".ts") &&
      dir.endsWith("migrations")
    ) {
      found.push(path);
    }
  }
  return found;
}

describe("Medusa module migration names", () => {
  it("are unique across every package, since db:migrate tracks them in one shared table", () => {
    const files = findMigrationFiles(PACKAGES_DIR);
    const byBasename = new Map<string, string[]>();
    for (const file of files) {
      const basename = file.slice(file.lastIndexOf("/") + 1);
      const existing = byBasename.get(basename) ?? [];
      existing.push(file.slice(REPO_ROOT.length + 1));
      byBasename.set(basename, existing);
    }
    const collisions = [...byBasename.entries()].filter(
      ([, paths]) => paths.length > 1
    );
    expect(collisions).toEqual([]);
  });
});
