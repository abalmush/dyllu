import { z } from "@medusajs/framework/zod";

export const categoryAssignmentOperationValueSchema = z
  .object({
    category: z
      .object({
        id: z.string().min(1),
        name: z.string(),
        handle: z.string(),
        updatedAt: z.string().datetime(),
      })
      .strict(),
    products: z
      .array(
        z
          .object({
            productId: z.string().min(1),
            productTitle: z.string(),
            productHandle: z.string(),
            productStatus: z.string(),
            productUpdatedAt: z.string().datetime(),
            assigned: z.boolean(),
          })
          .strict()
      )
      .min(1)
      .max(100),
  })
  .strict();
