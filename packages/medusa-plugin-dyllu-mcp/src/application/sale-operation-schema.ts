import { z } from "@medusajs/framework/zod";

export const saleOperationValueSchema = z
  .object({
    saleId: z.string().nullable(),
    title: z.string().min(1).max(120),
    description: z.string().max(500),
    status: z.enum(["active", "draft"]),
    startsAt: z.string().datetime().nullable(),
    endsAt: z.string().datetime().nullable(),
    items: z
      .array(
        z
          .object({
            productId: z.string(),
            productTitle: z.string(),
            variantId: z.string(),
            variantTitle: z.string(),
            sku: z.string().nullable(),
            basePriceId: z.string(),
            salePriceId: z.string().nullable(),
            normalAmount: z.number().int().positive(),
            saleAmount: z.number().int().positive(),
            currencyCode: z.literal("mdl"),
            targetUpdatedAt: z.string().datetime(),
          })
          .strict()
      )
      .max(100),
  })
  .strict();
