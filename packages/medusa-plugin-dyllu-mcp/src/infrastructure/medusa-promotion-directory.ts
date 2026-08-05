import { RemoteQueryFunction } from "@medusajs/framework/types";
import { z } from "@medusajs/framework/zod";

import { PromotionDirectory } from "../application/ports";

const promotionSchema = z.object({
  id: z.string(),
  code: z.string(),
  type: z.enum(["standard", "buyget"]),
  status: z.enum(["draft", "active", "inactive"]),
  is_automatic: z.boolean(),
  is_tax_inclusive: z.boolean(),
  limit: z.coerce.number().int().nonnegative().nullable().optional(),
  used: z.coerce.number().int().nonnegative(),
  campaign_id: z.string().nullable().optional(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

const promotionFields = [
  "id",
  "code",
  "type",
  "status",
  "is_automatic",
  "is_tax_inclusive",
  "limit",
  "used",
  "campaign_id",
  "created_at",
  "updated_at",
];

export class MedusaPromotionDirectory implements PromotionDirectory {
  constructor(private readonly query: Pick<RemoteQueryFunction, "graph">) {}

  async list(input: Parameters<PromotionDirectory["list"]>[0]) {
    const { data, metadata } = await this.query.graph({
      entity: "promotion",
      fields: promotionFields,
      filters: input.status ? { status: input.status } : {},
      pagination: {
        take: input.limit,
        skip: input.offset,
        order: { created_at: "DESC" },
      },
    });
    return {
      promotions: z.array(promotionSchema).parse(data).map(toPromotion),
      count: z.number().int().nonnegative().parse(metadata?.count),
    };
  }

  async findById(promotionId: string) {
    const { data } = await this.query.graph({
      entity: "promotion",
      fields: promotionFields,
      filters: { id: promotionId },
      pagination: { take: 1, skip: 0 },
    });
    const parsed = promotionSchema.safeParse(data[0]);
    return parsed.success ? toPromotion(parsed.data) : null;
  }
}

function toPromotion(promotion: z.infer<typeof promotionSchema>) {
  return {
    id: promotion.id,
    code: promotion.code,
    type: promotion.type,
    status: promotion.status,
    isAutomatic: promotion.is_automatic,
    isTaxInclusive: promotion.is_tax_inclusive,
    limit: promotion.limit ?? null,
    used: promotion.used,
    campaignId: promotion.campaign_id ?? null,
    createdAt: promotion.created_at,
    updatedAt: promotion.updated_at,
  };
}
