import { RemoteQueryFunction } from "@medusajs/framework/types";
import { z } from "@medusajs/framework/zod";

import { ApplicationError } from "../application/errors";
import { ReturnDirectory } from "../application/ports";

const numericSchema = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") {
    return value;
  }
  if (typeof value === "object" && value) {
    if ("numeric" in value) {
      return Number(value.numeric);
    }
    if ("value" in value) {
      return Number(value.value);
    }
  }
  return Number(value);
}, z.number().finite());

const returnSchema = z.object({
  id: z.string(),
  display_id: z.coerce.number().int().nonnegative(),
  order_id: z.string(),
  status: z.enum(["requested", "received", "partially_received", "canceled"]),
  location_id: z.string().nullable().optional(),
  refund_amount: numericSchema.nullable().optional(),
  created_by: z.string().nullable().optional(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  requested_at: z.coerce.date().nullable().optional(),
  received_at: z.coerce.date().nullable().optional(),
  canceled_at: z.coerce.date().nullable().optional(),
  items: z
    .array(
      z.object({
        id: z.string(),
        item_id: z.string(),
        quantity: numericSchema,
        received_quantity: numericSchema.nullable().optional(),
        reason_id: z.string().nullable().optional(),
      })
    )
    .optional(),
});

const orderSchema = z.object({
  id: z.string(),
  display_id: z.coerce.number().int().nonnegative(),
  status: z.string(),
  fulfillment_status: z.string(),
  currency_code: z.string(),
  updated_at: z.coerce.date(),
  items: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      variant_sku: z.string().nullable().optional(),
      quantity: numericSchema,
    })
  ),
});

const returnFields = [
  "id",
  "display_id",
  "order_id",
  "status",
  "location_id",
  "refund_amount",
  "created_by",
  "created_at",
  "updated_at",
  "requested_at",
  "received_at",
  "canceled_at",
  "items.id",
  "items.item_id",
  "items.quantity",
  "items.received_quantity",
  "items.reason_id",
];

const orderFields = [
  "id",
  "display_id",
  "status",
  "fulfillment_status",
  "currency_code",
  "updated_at",
  "items.id",
  "items.title",
  "items.variant_sku",
  "items.quantity",
];

export class MedusaReturnDirectory implements ReturnDirectory {
  constructor(private readonly query: Pick<RemoteQueryFunction, "graph">) {}

  async list(input: Parameters<ReturnDirectory["list"]>[0]) {
    const { data, metadata } = await this.query.graph({
      entity: "return",
      fields: returnFields,
      filters: input.status ? { status: input.status } : {},
      pagination: {
        take: input.limit,
        skip: input.offset,
        order: { created_at: "DESC" },
      },
    });
    return {
      returns: z.array(returnSchema).parse(data).map(toReturn),
      count: z.number().int().nonnegative().parse(metadata?.count),
    };
  }

  async findById(returnId: string) {
    const { data } = await this.query.graph({
      entity: "return",
      fields: returnFields,
      filters: { id: returnId },
      pagination: { take: 1, skip: 0 },
    });
    const parsed = returnSchema.safeParse(data[0]);
    return parsed.success ? toReturn(parsed.data) : null;
  }

  async findOrderTarget(reference: string) {
    const filters = orderReferenceFilters(reference);
    if (!filters) {
      return null;
    }
    const { data } = await this.query.graph({
      entity: "order",
      fields: orderFields,
      filters,
      pagination: { take: 1, skip: 0 },
    });
    const parsed = orderSchema.safeParse(data[0]);
    if (!parsed.success) {
      return null;
    }
    return {
      id: parsed.data.id,
      displayId: parsed.data.display_id,
      status: parsed.data.status,
      fulfillmentStatus: parsed.data.fulfillment_status,
      currencyCode: parsed.data.currency_code.toLowerCase(),
      updatedAt: parsed.data.updated_at,
      items: parsed.data.items.map((item) => ({
        id: item.id,
        title: item.title,
        sku: item.variant_sku ?? null,
        quantity: item.quantity,
      })),
    };
  }

  async listForOrder(orderId: string) {
    const limit = 1_000;
    const { data, metadata } = await this.query.graph({
      entity: "return",
      fields: returnFields,
      filters: { order_id: orderId },
      pagination: { take: limit, skip: 0, order: { created_at: "ASC" } },
    });
    const count = z.number().int().nonnegative().parse(metadata?.count);
    if (count > limit) {
      throw new ApplicationError(
        "return_limit_exceeded",
        "The DYLLU order return history exceeds its safe limit"
      );
    }
    const returns = z.array(returnSchema).parse(data).map(toReturn);
    if (returns.length !== count) {
      throw new ApplicationError(
        "return_limit_exceeded",
        "The DYLLU order return history is incomplete"
      );
    }
    return returns;
  }
}

function toReturn(orderReturn: z.infer<typeof returnSchema>) {
  return {
    id: orderReturn.id,
    displayId: orderReturn.display_id,
    orderId: orderReturn.order_id,
    status: orderReturn.status,
    locationId: orderReturn.location_id ?? null,
    refundAmount: orderReturn.refund_amount ?? null,
    createdBy: orderReturn.created_by ?? null,
    createdAt: orderReturn.created_at,
    updatedAt: orderReturn.updated_at,
    requestedAt: orderReturn.requested_at ?? null,
    receivedAt: orderReturn.received_at ?? null,
    canceledAt: orderReturn.canceled_at ?? null,
    items: (orderReturn.items ?? []).map((item) => ({
      id: item.id,
      itemId: item.item_id,
      quantity: item.quantity,
      receivedQuantity: item.received_quantity ?? 0,
      reasonId: item.reason_id ?? null,
    })),
  };
}

function orderReferenceFilters(reference: string) {
  const normalized = reference.trim().replace(/^#/, "");
  if (/^order_[A-Za-z0-9]+$/.test(normalized)) {
    return { id: normalized };
  }
  if (/^[1-9]\d*$/.test(normalized)) {
    const displayId = Number(normalized);
    return Number.isSafeInteger(displayId) ? { display_id: displayId } : null;
  }
  return null;
}
