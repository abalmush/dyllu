import { z } from "@medusajs/framework/zod";

const promoSchema = z
  .object({
    Items: z
      .array(
        z
          .object({
            id: z.union([z.string(), z.number()]),
            discountPrice: z
              .union([z.string(), z.number(), z.null()])
              .optional(),
            Action: z
              .object({
                StartDate: z.string().nullable().optional(),
                EndDate: z.string().nullable().optional(),
              })
              .passthrough()
              .optional(),
          })
          .passthrough()
      )
      .max(100_000),
  })
  .passthrough();

export type OneCPromotion = {
  externalId: string;
  salePriceMdl: number | null;
  startsAt: string | null;
  endsAt: string | null;
};

export function normalizePromoFeed(input: unknown) {
  const parsed = promoSchema.parse(input);
  return new Map(
    parsed.Items.map((item) => {
      const value =
        typeof item.discountPrice === "string"
          ? Number(item.discountPrice.trim().replace(",", "."))
          : item.discountPrice;
      const salePriceMdl =
        typeof value === "number" && Number.isFinite(value) && value > 0
          ? value
          : null;
      const promotion: OneCPromotion = {
        externalId: String(item.id).trim(),
        salePriceMdl,
        startsAt: item.Action?.StartDate ?? null,
        endsAt: item.Action?.EndDate ?? null,
      };
      return [promotion.externalId, promotion] as const;
    })
  );
}
