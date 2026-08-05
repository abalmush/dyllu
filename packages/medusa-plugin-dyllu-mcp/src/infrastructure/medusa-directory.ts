import { RemoteQueryFunction } from "@medusajs/framework/types";
import { z } from "@medusajs/framework/zod";

import {
  OrderDirectory,
  OrderListQuery,
  ProductCatalog,
  ProductSearch,
  SaleDirectory,
  SaleListQuery,
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
  images: z.array(z.object({ id: z.string() })).optional(),
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
                  price_list: z
                    .object({ id: z.string() })
                    .nullable()
                    .optional(),
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

const saleSchema = z.object({
  id: z.string(),
  title: z.string().nullish(),
  description: z.string().nullish(),
  type: z.literal("sale"),
  status: z.enum(["active", "draft"]),
  starts_at: z.coerce.date().nullable().optional(),
  ends_at: z.coerce.date().nullable().optional(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
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

const saleDetailsSchema = saleSchema.extend({
  prices: z
    .array(
      z.object({
        id: z.string(),
        amount: numericSchema,
        currency_code: z.string(),
        min_quantity: numericSchema.nullable().optional(),
        max_quantity: numericSchema.nullable().optional(),
        price_rules: z.array(z.unknown()).optional(),
        updated_at: z.coerce.date(),
        price_set: z.object({
          variant: z.object({ id: z.string() }).nullable(),
        }),
      })
    )
    .optional(),
});

const saleVariantSchema = z.object({
  id: z.string(),
  title: z.string(),
  sku: z.string().nullable(),
  product: z.object({ id: z.string(), title: z.string() }),
  price_set: z.object({
    prices: z.array(
      z.object({
        id: z.string(),
        amount: numericSchema,
        currency_code: z.string(),
        min_quantity: numericSchema.nullable().optional(),
        max_quantity: numericSchema.nullable().optional(),
        price_list: z.object({ id: z.string() }).nullable().optional(),
        price_rules: z.array(z.unknown()).optional(),
        updated_at: z.coerce.date().optional(),
      })
    ),
  }),
});

const overlapPriceSchema = z.object({
  price_set: z.object({
    variant: z.object({ id: z.string() }),
  }),
  price_list: z.object({
    id: z.string(),
    type: z.literal("sale"),
    status: z.literal("active"),
    starts_at: z.coerce.date().nullable().optional(),
    ends_at: z.coerce.date().nullable().optional(),
  }),
});

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

  async count() {
    const { metadata } = await this.query.graph({
      entity: "product",
      fields: ["id"],
      pagination: { take: 1, skip: 0 },
    });
    return z.number().int().nonnegative().parse(metadata?.count);
  }

  async list(input: { limit: number; offset: number }) {
    const { data, metadata } = await this.query.graph({
      entity: "product",
      fields: productFields,
      pagination: {
        take: input.limit,
        skip: input.offset,
        order: { id: "ASC" },
      },
    });
    return {
      products: z
        .array(productSchema)
        .parse(data)
        .map((product) => this.toProduct(product)),
      count: z.number().int().nonnegative().parse(metadata?.count),
    };
  }

  async findByIds(productIds: string[]) {
    if (productIds.length === 0) {
      return [];
    }
    const { data } = await this.query.graph({
      entity: "product",
      fields: productFields,
      filters: { id: productIds },
      pagination: { take: productIds.length, skip: 0 },
    });
    return z
      .array(productSchema)
      .parse(data)
      .map((product) => this.toProduct(product));
  }

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
      imageCount: product.images?.length ?? 0,
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
              price.price_list == null &&
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

export class MedusaSaleDirectory implements SaleDirectory {
  constructor(private readonly query: Pick<RemoteQueryFunction, "graph">) {}

  async list(input: SaleListQuery) {
    const { data, metadata } = await this.query.graph({
      entity: "price_list",
      fields: saleFields,
      filters: {
        type: "sale",
        ...(input.status ? { status: input.status } : {}),
      },
      pagination: {
        take: input.limit,
        skip: input.offset,
        order: { created_at: "DESC" },
      },
    });
    const sales = z.array(saleSchema).parse(data).map((sale) => ({
      id: sale.id,
      title: sale.title ?? "",
      description: sale.description ?? "",
      status: sale.status,
      startsAt: sale.starts_at ?? null,
      endsAt: sale.ends_at ?? null,
      createdAt: sale.created_at,
      updatedAt: sale.updated_at,
    }));
    return {
      sales,
      count: z.number().int().nonnegative().parse(metadata?.count),
    };
  }

  async findById(saleId: string) {
    const { data } = await this.query.graph({
      entity: "price_list",
      fields: saleDetailsFields,
      filters: { id: saleId, type: "sale" },
      pagination: { take: 1, skip: 0 },
    });
    const parsedSale = saleDetailsSchema.safeParse(data[0]);
    if (!parsedSale.success) {
      return null;
    }

    const variantIds = [
      ...new Set(
        (parsedSale.data.prices ?? [])
          .map((price) => price.price_set.variant?.id)
          .filter((id): id is string => Boolean(id))
      ),
    ];
    const variants = variantIds.length
      ? await this.query.graph({
          entity: "variant",
          fields: saleVariantFields,
          filters: { id: variantIds },
          pagination: { take: variantIds.length, skip: 0 },
        })
      : { data: [] };
    const parsedVariants = z.array(saleVariantSchema).parse(variants.data);
    const variantsById = new Map(
      parsedVariants.map((variant) => [variant.id, variant])
    );
    const sale = parsedSale.data;
    const items = (sale.prices ?? []).map((price) => {
      const variantId = price.price_set.variant?.id;
      const variant = variantId ? variantsById.get(variantId) : undefined;
      if (!variant) {
        throw new ApplicationError(
          "sale_data_invalid",
          "A DYLLU sale item has no valid product variant"
        );
      }
      const currencyCode = price.currency_code.toLowerCase();
      const normalPrice = variant.price_set.prices.find(
        (candidate) =>
          candidate.currency_code.toLowerCase() === currencyCode &&
          candidate.price_list == null &&
          candidate.min_quantity == null &&
          candidate.max_quantity == null &&
          (candidate.price_rules?.length ?? 0) === 0
      );
      return {
        priceId: price.id,
        productId: variant.product.id,
        productTitle: variant.product.title,
        variantId: variant.id,
        variantTitle: variant.title,
        sku: variant.sku,
        currencyCode,
        normalAmount: normalPrice?.amount ?? null,
        saleAmount: price.amount,
        minQuantity: price.min_quantity ?? null,
        maxQuantity: price.max_quantity ?? null,
        hasRules: (price.price_rules?.length ?? 0) > 0,
        updatedAt: price.updated_at,
      };
    });

    return {
      id: sale.id,
      title: sale.title ?? "",
      description: sale.description ?? "",
      status: sale.status,
      startsAt: sale.starts_at ?? null,
      endsAt: sale.ends_at ?? null,
      createdAt: sale.created_at,
      updatedAt: sale.updated_at,
      items,
    };
  }

  async findVariantTargets(variantIds: string[], currencyCode: "mdl") {
    if (variantIds.length === 0) {
      return [];
    }
    const { data } = await this.query.graph({
      entity: "variant",
      fields: saleVariantFields,
      filters: { id: variantIds },
      pagination: { take: variantIds.length, skip: 0 },
    });
    const variants = z.array(saleVariantSchema).parse(data);
    return variants.flatMap((variant) => {
      const basePrice = variant.price_set.prices.find(
        (price) =>
          price.currency_code.toLowerCase() === currencyCode &&
          price.price_list == null &&
          price.min_quantity == null &&
          price.max_quantity == null &&
          (price.price_rules?.length ?? 0) === 0 &&
          price.updated_at
      );
      return basePrice?.updated_at
        ? [
            {
              productId: variant.product.id,
              productTitle: variant.product.title,
              variantId: variant.id,
              variantTitle: variant.title,
              sku: variant.sku,
              basePriceId: basePrice.id,
              normalAmount: basePrice.amount,
              currencyCode,
              updatedAt: basePrice.updated_at,
            },
          ]
        : [];
    });
  }

  async findOverlappingActiveSales(input: {
    variantIds: string[];
    startsAt: Date | null;
    endsAt: Date | null;
    excludeSaleId?: string;
  }) {
    if (input.variantIds.length === 0) {
      return [];
    }
    const { data: variants } = await this.query.graph({
      entity: "variant",
      fields: ["id", "price_set.id"],
      filters: { id: input.variantIds },
      pagination: { take: input.variantIds.length, skip: 0 },
    });
    const priceSetIds = z
      .array(z.object({ price_set: z.object({ id: z.string() }) }))
      .parse(variants)
      .map((variant) => variant.price_set.id);
    if (priceSetIds.length === 0) {
      return [];
    }
    const saleLimit = 1_000;
    const { data: activeSales, metadata: saleMetadata } =
      await this.query.graph({
        entity: "price_list",
        fields: ["id"],
        filters: { type: "sale", status: "active" },
        pagination: { take: saleLimit, skip: 0 },
      });
    const saleCount = z
      .number()
      .int()
      .nonnegative()
      .parse(saleMetadata?.count);
    if (saleCount > saleLimit) {
      throw new ApplicationError(
        "sale_overlap_limit_exceeded",
        "The DYLLU sale overlap check exceeded its safe limit"
      );
    }
    const activeSaleIds = z
      .array(z.object({ id: z.string() }))
      .parse(activeSales)
      .map((sale) => sale.id)
      .filter((saleId) => saleId !== input.excludeSaleId);
    if (activeSaleIds.length === 0) {
      return [];
    }
    const take = 5_000;
    const { data: prices, metadata } = await this.query.graph({
      entity: "price",
      fields: overlapPriceFields,
      filters: {
        price_set_id: priceSetIds,
        price_list_id: activeSaleIds,
        currency_code: "mdl",
      },
      pagination: { take, skip: 0 },
    });
    const count = z.number().int().nonnegative().parse(metadata?.count);
    if (count > take) {
      throw new ApplicationError(
        "sale_overlap_limit_exceeded",
        "The DYLLU sale overlap check exceeded its safe limit"
      );
    }
    return z
      .array(overlapPriceSchema)
      .parse(prices)
      .filter(
        (price) =>
          price.price_list.id !== input.excludeSaleId &&
          dateRangesOverlap(
            input.startsAt,
            input.endsAt,
            price.price_list.starts_at ?? null,
            price.price_list.ends_at ?? null
          )
      )
      .map((price) => ({
        saleId: price.price_list.id,
        variantId: price.price_set.variant.id,
      }));
  }
}

const saleFields = [
  "id",
  "title",
  "description",
  "type",
  "status",
  "starts_at",
  "ends_at",
  "created_at",
  "updated_at",
];

const saleDetailsFields = [
  ...saleFields,
  "prices.id",
  "prices.amount",
  "prices.currency_code",
  "prices.min_quantity",
  "prices.max_quantity",
  "prices.price_rules.id",
  "prices.updated_at",
  "prices.price_set.variant.id",
];

const saleVariantFields = [
  "id",
  "title",
  "sku",
  "product.id",
  "product.title",
  "price_set.prices.id",
  "price_set.prices.amount",
  "price_set.prices.currency_code",
  "price_set.prices.min_quantity",
  "price_set.prices.max_quantity",
  "price_set.prices.price_list.id",
  "price_set.prices.price_rules.id",
  "price_set.prices.updated_at",
];

const overlapPriceFields = [
  "price_set.variant.id",
  "price_list.id",
  "price_list.type",
  "price_list.status",
  "price_list.starts_at",
  "price_list.ends_at",
];

function dateRangesOverlap(
  leftStart: Date | null,
  leftEnd: Date | null,
  rightStart: Date | null,
  rightEnd: Date | null
) {
  return (
    (!leftEnd || !rightStart || rightStart <= leftEnd) &&
    (!rightEnd || !leftStart || leftStart <= rightEnd)
  );
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
  "images.id",
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
  "variants.price_set.prices.price_list.id",
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
