import { z } from "@medusajs/framework/zod";

const ProductIdSchema = z.string().trim().min(1).max(128);
const SummarySchema = z.string().trim().min(1).max(240);
const LongTextSchema = z.string().max(50_000);
const HttpUrlSchema = z
  .string()
  .trim()
  .min(1)
  .max(2_048)
  .url()
  .refine((value) => {
    const protocol = new URL(value).protocol;
    return protocol === "https:" || protocol === "http:";
  }, "URL must use http: or https:");

const HistoryMessageSchema = z
  .object({
    role: z.enum(["user", "assistant", "system"]),
    text: z.string().trim().min(1).max(4_000),
  })
  .strict();

const TextProposalBaseSchema = z.object({
  currentValue: LongTextSchema,
  summary: SummarySchema,
});

export const AiProposalSchema = z.discriminatedUnion("kind", [
  TextProposalBaseSchema.extend({
    kind: z.literal("description"),
    proposedValue: z.string().trim().min(1).max(50_000),
  }).strict(),
  TextProposalBaseSchema.extend({
    kind: z.literal("title"),
    currentValue: z.string().max(255),
    proposedValue: z.string().trim().min(1).max(255),
  }).strict(),
  z
    .object({
      kind: z.literal("image_edit"),
      sourceUrl: HttpUrlSchema,
      previewUrl: HttpUrlSchema,
      summary: SummarySchema,
    })
    .strict(),
]);

export const AiChatBodySchema = z
  .object({
    product_id: ProductIdSchema,
    message: z.string().trim().min(1).max(2_000),
    history: z.array(HistoryMessageSchema).max(20).default([]),
  })
  .strict();

export const AiApplyBodySchema = z
  .object({
    product_id: ProductIdSchema,
    proposal: AiProposalSchema,
  })
  .strict();

export const AccessoryKindSchema = z.enum(["battery", "charger"]);

const AccessoryKindsSchema = z
  .preprocess((value) => {
    if (value === undefined) return ["battery", "charger"];
    if (typeof value === "string") {
      return value.split(",").map((item) => item.trim());
    }
    if (
      Array.isArray(value) &&
      value.every((item) => typeof item === "string")
    ) {
      return value
        .flatMap((item) => item.split(","))
        .map((item) => item.trim());
    }
    return value;
  }, z.array(AccessoryKindSchema).min(1).max(2))
  .transform((values) => [...new Set(values)]);

export const CompatibleAccessoriesQuerySchema = z
  .object({
    platform: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .regex(/^[a-z0-9][a-z0-9-]*$/i, "platform contains invalid characters"),
    types: AccessoryKindsSchema,
  })
  .strict();

export type AiProposal = z.infer<typeof AiProposalSchema>;
export type AiChatBody = z.infer<typeof AiChatBodySchema>;
export type AiApplyBody = z.infer<typeof AiApplyBodySchema>;
export type AccessoryKind = z.infer<typeof AccessoryKindSchema>;
export type CompatibleAccessoriesQuery = z.infer<
  typeof CompatibleAccessoriesQuerySchema
>;
