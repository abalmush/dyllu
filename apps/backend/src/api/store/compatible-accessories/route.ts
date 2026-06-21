import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

const ALLOWED_KINDS = new Set(["battery", "charger"]);

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const platform = (req.query.platform as string | undefined) ?? "";
    if (!platform) {
      res.status(400).json({ message: "platform query param is required" });
      return;
    }
    const types = ((req.query.types as string | undefined) ?? "battery,charger")
      .split(",")
      .map((t) => t.trim())
      .filter((t) => ALLOWED_KINDS.has(t));
    if (types.length === 0) {
      res.status(400).json({ message: "no valid accessory types requested" });
      return;
    }

    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

    // Return identifiers only — the storefront fetches full pricing via the
    // standard /store/products endpoint where the SDK already handles region
    // and currency context.
    const { data: products } = await query.graph({
      entity: "product",
      fields: ["id", "handle", "metadata"],
      filters: { status: "published" },
    });

    const grouped: Record<string, string[]> = { battery: [], charger: [] };
    for (const p of products as Array<{
      id: string;
      handle: string;
      metadata: Record<string, unknown> | null;
    }>) {
      const md = p.metadata ?? {};
      const kind = String(md.accessory_kind ?? "");
      if (!types.includes(kind)) continue;
      if (md.platform !== platform) continue;
      grouped[kind].push(p.handle);
    }

    res.json({
      platform,
      battery_handles: grouped.battery,
      charger_handles: grouped.charger,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ message, stack: err instanceof Error ? err.stack : undefined });
  }
}
