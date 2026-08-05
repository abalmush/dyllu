import { z } from "@medusajs/framework/zod";

export const promotionStatusOperationValueSchema = z
  .object({
    id: z.string().min(1),
    code: z.string(),
    type: z.enum(["standard", "buyget"]),
    status: z.enum(["draft", "active", "inactive"]),
    isAutomatic: z.boolean(),
    isTaxInclusive: z.boolean(),
    limit: z.number().int().nonnegative().nullable(),
    used: z.number().int().nonnegative(),
    campaignId: z.string().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();
