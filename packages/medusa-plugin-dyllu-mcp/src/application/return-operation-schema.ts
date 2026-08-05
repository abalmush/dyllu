import { z } from "@medusajs/framework/zod";

const returnStatusSchema = z.enum([
  "requested",
  "received",
  "partially_received",
  "canceled",
]);

export const returnRequestOperationValueSchema = z
  .object({
    order: z
      .object({
        id: z.string().min(1),
        displayId: z.number().int().nonnegative(),
        status: z.string(),
        fulfillmentStatus: z.string(),
        currencyCode: z.string(),
        updatedAt: z.string().datetime(),
      })
      .strict(),
    returnId: z.null(),
    status: z.null(),
    note: z.string().max(500).nullable(),
    items: z
      .array(
        z
          .object({
            itemId: z.string().min(1),
            title: z.string(),
            sku: z.string().nullable(),
            orderedQuantity: z.number().int().positive(),
            alreadyReturnedQuantity: z.number().int().nonnegative(),
            requestQuantity: z.number().int().nonnegative(),
            reasonId: z.string().nullable(),
            note: z.string().max(500).nullable(),
          })
          .strict()
      )
      .min(1)
      .max(20),
  })
  .strict();

export const returnCancelOperationValueSchema = z
  .object({
    returnId: z.string().min(1),
    orderId: z.string().min(1),
    displayId: z.number().int().nonnegative(),
    status: returnStatusSchema,
    updatedAt: z.string().datetime(),
    items: z
      .array(
        z
          .object({
            itemId: z.string().min(1),
            quantity: z.number().int().positive(),
            receivedQuantity: z.number().int().nonnegative(),
            reasonId: z.string().nullable(),
          })
          .strict()
      )
      .max(100),
  })
  .strict();
