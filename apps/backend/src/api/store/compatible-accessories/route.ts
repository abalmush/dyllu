import { MedusaResponse, MedusaStoreRequest } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import {
  AccessoryKind,
  AccessoryKindSchema,
  CompatibleAccessoriesQuery,
} from "../../_shared/contracts";
import { logRouteError } from "../../_shared/logging";

export async function GET(
  req: MedusaStoreRequest<unknown, CompatibleAccessoriesQuery>,
  res: MedusaResponse
) {
  const { platform, types } = req.validatedQuery as CompatibleAccessoriesQuery;

  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

    // Return identifiers only — the storefront fetches full pricing via the
    // standard /store/products endpoint where the SDK handles region context.
    const products: Array<{
      id: string;
      handle: string;
      metadata: Record<string, unknown> | null;
    }> = [];
    const pageSize = 200;
    for (let skip = 0; ; skip += pageSize) {
      const { data } = await query.graph({
        entity: "product",
        fields: ["id", "handle", "metadata"],
        filters: { status: "published" },
        pagination: { skip, take: pageSize },
      });
      products.push(...(data as typeof products));
      if (data.length < pageSize) break;
    }

    const grouped: Record<AccessoryKind, string[]> = {
      battery: [],
      charger: [],
    };
    for (const product of products) {
      const metadata = product.metadata ?? {};
      const parsedKind = AccessoryKindSchema.safeParse(metadata.accessory_kind);
      if (!parsedKind.success || !types.includes(parsedKind.data)) continue;
      if (metadata.platform !== platform) continue;
      grouped[parsedKind.data].push(product.handle);
    }

    res.setHeader(
      "Cache-Control",
      "public, max-age=60, s-maxage=300, stale-while-revalidate=3600"
    );
    res.json({
      platform,
      battery_handles: grouped.battery,
      charger_handles: grouped.charger,
    });
  } catch (error) {
    logRouteError(req, "store.compatible_accessories.failed", error);
    res.status(500).json({
      error: "internal_error",
      message: "Unable to load compatible accessories.",
    });
  }
}
