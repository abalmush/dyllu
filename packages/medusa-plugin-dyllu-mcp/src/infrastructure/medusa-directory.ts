import { RemoteQueryFunction } from "@medusajs/framework/types";
import { z } from "@medusajs/framework/zod";

import {
  OrderDirectory,
  OrderListQuery,
  ProductCatalog,
  ProductSearch,
  UserDirectory,
} from "../application/ports";
import { ApplicationError } from "../application/errors";

const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
});

const productSchema = z.object({
  id: z.string(),
  title: z.string(),
  handle: z.string(),
  status: z.string(),
  description: z.string().nullable(),
  updated_at: z.coerce.date(),
  variants: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        sku: z.string().nullable(),
        updated_at: z.coerce.date(),
        price_set: z
          .object({
            prices: z
              .array(
                z.object({
                  id: z.string(),
                  amount: z.number(),
                  currency_code: z.string(),
                  min_quantity: z.number().nullable().optional(),
                  max_quantity: z.number().nullable().optional(),
                  updated_at: z.coerce.date(),
                  rules: z.array(z.unknown()).optional(),
                })
              )
              .optional(),
          })
          .nullable()
          .optional(),
      })
    )
    .optional(),
});

const numericSchema = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") {
    return value;
  }
  if (typeof value === "object") {
    if ("numeric" in value && typeof value.numeric === "number") {
      return value.numeric;
    }
    if (
      "value" in value &&
      (typeof value.value === "number" || typeof value.value === "string")
    ) {
      return Number(value.value);
    }
  }
  return Number(value);
}, z.number().finite());

const orderSummarySchema = z.object({
  id: z.string(),
  display_id: z.coerce.number().int(),
  status: z.string(),
  payment_status: z.string(),
  fulfillment_status: z.string(),
  email: z.string().email().nullable().optional(),
  customer_id: z.string().nullable().optional(),
  currency_code: z.string(),
  total: numericSchema,
  items: z.array(z.object({ id: z.string() })).optional(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

const orderAddressSchema = z.object({
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  address_1: z.string().nullable().optional(),
  address_2: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  province: z.string().nullable().optional(),
  postal_code: z.string().nullable().optional(),
  country_code: z.string().nullable().optional(),
});

const orderDetailsSchema = orderSummarySchema.extend({
  subtotal: numericSchema,
  discount_total: numericSchema,
  shipping_total: numericSchema,
  tax_total: numericSchema,
  canceled_at: z.coerce.date().nullable().optional(),
  shipping_address: orderAddressSchema.nullable().optional(),
  billing_address: orderAddressSchema.nullable().optional(),
  items: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      variant_id: z.string().nullable().optional(),
      variant_sku: z.string().nullable().optional(),
      quantity: numericSchema,
      unit_price: numericSchema,
      total: numericSchema,
    })
  ),
  shipping_methods: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        amount: numericSchema,
      })
    )
    .optional(),
});

export class MedusaUserDirectory implements UserDirectory {
  constructor(private readonly query: Pick<RemoteQueryFunction, "graph">) {}

  async findActiveUser(userId: string) {
    const { data } = await this.query.graph({
      entity: "user",
      fields: ["id", "email", "first_name", "last_name"],
      filters: { id: userId },
      pagination: { take: 1, skip: 0 },
    });
    const parsed = userSchema.safeParse(data[0]);
    if (!parsed.success) {
      return null;
    }

    const name = [parsed.data.first_name, parsed.data.last_name]
      .filter((part): part is string => Boolean(part))
      .join(" ");
    return {
      id: parsed.data.id,
      email: parsed.data.email,
      name: name || parsed.data.email,
    };
  }
}

export class MedusaProductCatalog implements ProductCatalog {
  constructor(private readonly query: Pick<RemoteQueryFunction, "graph">) {}

  async findById(productId: string) {
    const { data } = await this.query.graph({
      entity: "product",
      fields: productFields,
      filters: { id: productId },
      pagination: { take: 1, skip: 0 },
    });
    const parsed = productSchema.safeParse(data[0]);
    return parsed.success ? this.toProduct(parsed.data) : null;
  }

  async findVariantPrice(
    input: Parameters<ProductCatalog["findVariantPrice"]>[0]
  ) {
    const product = await this.findById(input.productId);
    const variant = product?.variants.find(
      (candidate) => candidate.id === input.variantId
    );
    const price = variant?.prices.find(
      (candidate) =>
        candidate.id === input.priceId &&
        candidate.currencyCode === input.currencyCode
    );
    if (!product || !variant || !price) {
      return null;
    }
    return {
      productId: product.id,
      productTitle: product.title,
      variantId: variant.id,
      variantTitle: variant.title,
      sku: variant.sku,
      priceId: price.id,
      amount: price.amount,
      currencyCode: price.currencyCode,
      updatedAt: price.updatedAt,
    };
  }

  async search(input: ProductSearch) {
    const { data } = await this.query.graph({
      entity: "product",
      fields: productFields,
      filters: { q: input.query },
      pagination: {
        take: input.limit,
        skip: 0,
        order: { updated_at: "DESC" },
      },
    });
    return z
      .array(productSchema)
      .parse(data)
      .map((product) => this.toProduct(product));
  }

  private toProduct(product: z.infer<typeof productSchema>) {
    return {
      id: product.id,
      title: product.title,
      handle: product.handle,
      status: product.status,
      description: product.description,
      updatedAt: product.updated_at,
      variants: (product.variants ?? []).map((variant) => ({
        id: variant.id,
        title: variant.title,
        sku: variant.sku,
        updatedAt: variant.updated_at,
        prices: (variant.price_set?.prices ?? [])
          .filter(
            (price) =>
              price.min_quantity == null &&
              price.max_quantity == null &&
              (price.rules?.length ?? 0) === 0
          )
          .map((price) => ({
            id: price.id,
            amount: price.amount,
            currencyCode: price.currency_code.toLowerCase(),
            updatedAt: price.updated_at,
          })),
      })),
    };
  }
}

type OrderListWorkflowInput = {
  fields: string[];
  variables: {
    filters: Record<string, unknown>;
    take: number;
    skip: number;
    order: Record<string, string>;
  };
};

type OrderDetailWorkflowInput = {
  order_id: string;
  fields: string[];
};

export interface OrderWorkflowReader {
  list(input: OrderListWorkflowInput): Promise<unknown>;
  retrieve(input: OrderDetailWorkflowInput): Promise<unknown>;
}

const orderListResultSchema = z.object({
  rows: z.array(orderSummarySchema),
  metadata: z.object({ count: z.number() }),
});

export class MedusaOrderDirectory implements OrderDirectory {
  constructor(
    private readonly query: Pick<RemoteQueryFunction, "graph">,
    private readonly workflows: OrderWorkflowReader
  ) {}

  async list(input: OrderListQuery) {
    const { start, end } = calendarDateRange(input.localDate, input.timeZone);
    const result = await this.workflows.list({
      fields: orderSummaryFields,
      variables: {
        filters: {
          created_at: { $gte: start, $lt: end },
          ...(input.status ? { status: input.status } : {}),
          is_draft_order: false,
        },
        take: input.limit,
        skip: input.offset,
        order: { created_at: "DESC" },
      },
    });
    const parsed = orderListResultSchema.parse(result);
    return {
      orders: parsed.rows.map(toOrderSummary),
      count: parsed.metadata.count,
    };
  }

  async findByReference(reference: string) {
    const filters = orderReferenceFilters(reference);
    if (!filters) {
      return null;
    }
    const { data } = await this.query.graph({
      entity: "order",
      fields: ["id"],
      filters,
      pagination: { take: 1, skip: 0 },
    });
    const orderId = z.object({ id: z.string() }).safeParse(data[0]);
    if (!orderId.success) {
      return null;
    }
    const result = await this.workflows.retrieve({
      order_id: orderId.data.id,
      fields: orderDetailsFields,
    });
    const order = orderDetailsSchema.parse(result);
    return {
      ...toOrderSummary(order),
      subtotal: order.subtotal,
      discountTotal: order.discount_total,
      shippingTotal: order.shipping_total,
      taxTotal: order.tax_total,
      canceledAt: order.canceled_at ?? null,
      shippingAddress: toOrderAddress(order.shipping_address),
      billingAddress: toOrderAddress(order.billing_address),
      items: order.items.map((item) => ({
        id: item.id,
        title: item.title,
        variantId: item.variant_id ?? null,
        sku: item.variant_sku ?? null,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        total: item.total,
      })),
      shippingMethods: (order.shipping_methods ?? []).map((method) => ({
        id: method.id,
        name: method.name,
        amount: method.amount,
      })),
    };
  }
}

function toOrderSummary(order: z.infer<typeof orderSummarySchema>) {
  return {
    id: order.id,
    displayId: order.display_id,
    status: order.status,
    paymentStatus: order.payment_status,
    fulfillmentStatus: order.fulfillment_status,
    email: order.email ?? null,
    customerId: order.customer_id ?? null,
    currencyCode: order.currency_code.toLowerCase(),
    total: order.total,
    itemCount: order.items?.length ?? 0,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
  };
}

function toOrderAddress(
  address: z.infer<typeof orderAddressSchema> | null | undefined
) {
  if (!address) {
    return null;
  }
  return {
    firstName: address.first_name ?? null,
    lastName: address.last_name ?? null,
    phone: address.phone ?? null,
    company: address.company ?? null,
    address1: address.address_1 ?? null,
    address2: address.address_2 ?? null,
    city: address.city ?? null,
    province: address.province ?? null,
    postalCode: address.postal_code ?? null,
    countryCode: address.country_code?.toLowerCase() ?? null,
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

function calendarDateRange(localDate: string, timeZone: "Europe/Chisinau") {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(localDate);
  if (!match) {
    throw invalidOrderDate();
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  if (
    calendarDate.getUTCFullYear() !== year ||
    calendarDate.getUTCMonth() !== month - 1 ||
    calendarDate.getUTCDate() !== day
  ) {
    throw invalidOrderDate();
  }
  const nextDate = new Date(calendarDate.getTime() + 24 * 60 * 60 * 1000);
  return {
    start: zonedMidnight(calendarDate, timeZone),
    end: zonedMidnight(nextDate, timeZone),
  };
}

function zonedMidnight(calendarDate: Date, timeZone: string) {
  const desired = Date.UTC(
    calendarDate.getUTCFullYear(),
    calendarDate.getUTCMonth(),
    calendarDate.getUTCDate()
  );
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  let timestamp = desired;
  for (let iteration = 0; iteration < 3; iteration += 1) {
    const values = Object.fromEntries(
      formatter
        .formatToParts(new Date(timestamp))
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, Number(part.value)])
    ) as Record<string, number>;
    const part = (name: string) => {
      const value = values[name];
      if (value === undefined) {
        throw invalidOrderDate();
      }
      return value;
    };
    const represented = Date.UTC(
      part("year"),
      part("month") - 1,
      part("day"),
      part("hour"),
      part("minute"),
      part("second")
    );
    const adjustment = desired - represented;
    timestamp += adjustment;
    if (adjustment === 0) {
      break;
    }
  }
  return new Date(timestamp);
}

function invalidOrderDate() {
  return new ApplicationError(
    "invalid_order_date",
    "Order date must be a valid YYYY-MM-DD calendar date"
  );
}

const productFields = [
  "id",
  "title",
  "handle",
  "status",
  "description",
  "updated_at",
  "variants.id",
  "variants.title",
  "variants.sku",
  "variants.updated_at",
  "variants.price_set.prices.id",
  "variants.price_set.prices.amount",
  "variants.price_set.prices.currency_code",
  "variants.price_set.prices.min_quantity",
  "variants.price_set.prices.max_quantity",
  "variants.price_set.prices.updated_at",
  "variants.price_set.prices.rules.*",
];

const orderSummaryFields = [
  "id",
  "display_id",
  "status",
  "payment_status",
  "fulfillment_status",
  "email",
  "customer_id",
  "currency_code",
  "total",
  "items.id",
  "created_at",
  "updated_at",
];

const orderDetailsFields = [
  ...orderSummaryFields,
  "subtotal",
  "discount_total",
  "shipping_total",
  "tax_total",
  "canceled_at",
  "shipping_address.first_name",
  "shipping_address.last_name",
  "shipping_address.phone",
  "shipping_address.company",
  "shipping_address.address_1",
  "shipping_address.address_2",
  "shipping_address.city",
  "shipping_address.province",
  "shipping_address.postal_code",
  "shipping_address.country_code",
  "billing_address.first_name",
  "billing_address.last_name",
  "billing_address.phone",
  "billing_address.company",
  "billing_address.address_1",
  "billing_address.address_2",
  "billing_address.city",
  "billing_address.province",
  "billing_address.postal_code",
  "billing_address.country_code",
  "items.*",
  "items.detail.*",
  "items.title",
  "items.variant_id",
  "items.variant_sku",
  "items.quantity",
  "items.unit_price",
  "items.total",
  "shipping_methods.id",
  "shipping_methods.name",
  "shipping_methods.amount",
];
