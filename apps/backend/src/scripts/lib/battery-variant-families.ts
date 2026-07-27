import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";

const memberSchema = z.object({
  sku: z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.toUpperCase()),
  configuration: z.string().trim().min(1),
});

const familySchema = z.object({
  family_id: z.string().trim().min(1),
  members: z.array(memberSchema).min(2),
});

const manifestSchema = z.array(familySchema).min(1);

export type BatteryVariantFamily = z.infer<typeof familySchema>;
export type BatteryVariantMember = z.infer<typeof memberSchema> & {
  familyId: string;
  position: number;
};

export type BatteryVariantImportPlan = {
  append: Array<{ familyId: string; productId: string; skus: string[] }>;
  create: Array<{ familyId: string; skus: string[] }>;
};

export async function loadBatteryVariantFamilies(
  path = resolve(
    process.cwd(),
    "src/scripts/data/battery-variant-families.json"
  )
): Promise<BatteryVariantFamily[]> {
  const parsed = manifestSchema.parse(
    JSON.parse(await readFile(path, "utf8")) as unknown
  );
  indexBatteryVariantFamilies(parsed);
  return parsed;
}

export function indexBatteryVariantFamilies(
  families: BatteryVariantFamily[]
): Map<string, BatteryVariantMember> {
  const bySku = new Map<string, BatteryVariantMember>();
  for (const family of families) {
    for (const [position, member] of family.members.entries()) {
      if (bySku.has(member.sku)) {
        throw new Error(
          `Battery variant SKU ${member.sku} belongs to multiple families`
        );
      }
      bySku.set(member.sku, {
        ...member,
        familyId: family.family_id,
        position,
      });
    }
  }
  return bySku;
}

export function planBatteryVariantImports(input: {
  families: BatteryVariantFamily[];
  incomingSkus: Iterable<string>;
  existingProductIdBySku: ReadonlyMap<string, string>;
}): BatteryVariantImportPlan {
  const incoming = new Set(
    [...input.incomingSkus].map((sku) => sku.trim().toUpperCase())
  );
  const append: BatteryVariantImportPlan["append"] = [];
  const create: BatteryVariantImportPlan["create"] = [];

  for (const family of input.families) {
    const existingProductIds = new Set(
      family.members.flatMap((member) => {
        const productId = input.existingProductIdBySku.get(member.sku);
        return productId ? [productId] : [];
      })
    );
    if (existingProductIds.size > 1) {
      throw new Error(
        `Battery variant family ${family.family_id} is split across existing products`
      );
    }

    const incomingMembers = family.members.filter(
      (member) =>
        incoming.has(member.sku) &&
        !input.existingProductIdBySku.has(member.sku)
    );
    if (incomingMembers.length === 0) continue;

    const skus = incomingMembers.map((member) => member.sku);
    const productId = [...existingProductIds][0];
    if (productId) append.push({ familyId: family.family_id, productId, skus });
    else create.push({ familyId: family.family_id, skus });
  }

  return { append, create };
}
