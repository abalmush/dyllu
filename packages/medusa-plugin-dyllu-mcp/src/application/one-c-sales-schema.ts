import { z } from "@medusajs/framework/zod";

export const oneCSalesResultSchema = z
  .object({
    run_id: z.string().nullable(),
    items: z.array(
      z
        .object({
          sku: z.string(),
          dyllu_variant_id: z.string().nullable(),
          regular_price_mdl: z.number().nullable(),
          sale_price_mdl: z.number().nullable(),
          starts_at: z.string().nullable(),
          ends_at: z.string().nullable(),
          mapping_status: z.enum([
            "matched",
            "missing_dyllu",
            "ambiguous",
            "excluded",
          ]),
        })
        .passthrough()
    ),
    count: z.number().int().nonnegative(),
    limit: z.number().int().positive(),
    offset: z.number().int().nonnegative(),
  })
  .passthrough();
