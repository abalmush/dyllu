import "server-only";

import { sdk } from "@lib/config";
import { HttpTypes } from "@medusajs/types";

import { getAuthHeaders, getCacheOptions } from "./cookies";
import { getRegion } from "./regions";
import { listProducts } from "./products";

type Response = {
  platform: string;
  battery_handles: string[];
  charger_handles: string[];
};

export type CompatibleAccessories = {
  batteries: HttpTypes.StoreProduct[];
  chargers: HttpTypes.StoreProduct[];
};

export async function getCompatibleAccessories(
  platform: string
): Promise<CompatibleAccessories> {
  const empty: CompatibleAccessories = { batteries: [], chargers: [] };
  if (!platform) return empty;

  const region = await getRegion();
  if (!region) return empty;

  const headers = { ...(await getAuthHeaders()) };
  const next = { ...(await getCacheOptions("compatible-accessories")) };

  const result = await sdk.client.fetch<Response>(
    "/store/compatible-accessories",
    {
      method: "GET",
      query: { platform },
      headers,
      next,
      cache: process.env.NODE_ENV === "production" ? "force-cache" : "no-store",
    }
  );

  const handles = [...result.battery_handles, ...result.charger_handles];
  if (handles.length === 0) return empty;

  const { response } = await listProducts({
    regionId: region.id,
    queryParams: { handle: handles, limit: handles.length },
  });

  const batterySet = new Set(result.battery_handles);
  const chargerSet = new Set(result.charger_handles);
  const batteries: HttpTypes.StoreProduct[] = [];
  const chargers: HttpTypes.StoreProduct[] = [];
  for (const p of response.products) {
    if (batterySet.has(p.handle ?? "")) batteries.push(p);
    else if (chargerSet.has(p.handle ?? "")) chargers.push(p);
  }
  batteries.sort(
    (left, right) =>
      Number(left.metadata?.battery_capacity_ah ?? Number.MAX_SAFE_INTEGER) -
      Number(right.metadata?.battery_capacity_ah ?? Number.MAX_SAFE_INTEGER)
  );
  chargers.sort(
    (left, right) =>
      Number(left.metadata?.charger_output_a ?? Number.MAX_SAFE_INTEGER) -
      Number(right.metadata?.charger_output_a ?? Number.MAX_SAFE_INTEGER)
  );
  return { batteries, chargers };
}
