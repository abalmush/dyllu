import {
  escapeHtml,
  renderEmailDocument,
  renderEmailHero,
  type EmailContent,
} from "./email-content";

type OrderEmailItemSource = {
  title?: string | null;
  product_title?: string | null;
  variant_title?: string | null;
  thumbnail?: string | null;
  quantity?: unknown;
  unit_price?: unknown;
  total?: unknown;
};

type OrderEmailAddressSource = {
  first_name?: string | null;
  last_name?: string | null;
  address_1?: string | null;
  address_2?: string | null;
  postal_code?: string | null;
  city?: string | null;
  country_code?: string | null;
  phone?: string | null;
};

type OrderEmailShippingMethodSource = {
  name?: string | null;
  total?: unknown;
};

type OrderEmailPaymentSource = {
  provider_id?: string | null;
};

type OrderEmailPaymentCollectionSource = {
  payments?: OrderEmailPaymentSource[] | null;
};

export type OrderConfirmationEmailSource = {
  id?: string;
  display_id?: number | string;
  email?: string;
  created_at?: string | Date;
  currency_code?: string;
  total?: unknown;
  subtotal?: unknown;
  item_subtotal?: unknown;
  shipping_total?: unknown;
  shipping_subtotal?: unknown;
  tax_total?: unknown;
  discount_total?: unknown;
  discount_subtotal?: unknown;
  gift_card_total?: unknown;
  items?: OrderEmailItemSource[] | null;
  shipping_address?: OrderEmailAddressSource | null;
  shipping_methods?: OrderEmailShippingMethodSource[] | null;
  payment_collections?: OrderEmailPaymentCollectionSource[] | null;
};

type EmailLineItem = {
  title: string;
  variant: string | null;
  thumbnail: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
};

type EmailTotals = {
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  giftCard: number;
  total: number;
};

type EmailPaymentMethod = {
  title: string;
  description: string;
};

const moneyFormatters = new Map<string, Intl.NumberFormat>();

const asText = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const asAmount = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || !value.trim()) return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const requireQuantity = (value: unknown, itemTitle: string) => {
  const quantity = asAmount(value);
  if (!quantity || !Number.isInteger(quantity) || quantity < 1) {
    throw new Error(`Invalid quantity for order item "${itemTitle}"`);
  }
  return quantity;
};

const safeHttpUrl = (value: unknown) => {
  const text = asText(value);
  if (!text) return null;

  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
};

const formatMoney = (amount: number, currencyCode: string) => {
  let formatter = moneyFormatters.get(currencyCode);
  if (!formatter) {
    formatter = new Intl.NumberFormat("ro-MD", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    moneyFormatters.set(currencyCode, formatter);
  }
  return formatter.format(amount);
};

const formatDate = (value: string | Date | undefined) => {
  const date = value instanceof Date ? value : new Date(value ?? "");
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid order creation date");
  }

  return new Intl.DateTimeFormat("ro-MD", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Chisinau",
  }).format(date);
};

const resolveLineItem = (source: OrderEmailItemSource): EmailLineItem => {
  const title =
    asText(source.product_title) ?? asText(source.title) ?? "Produs DYLLU";
  const quantity = requireQuantity(source.quantity, title);
  const sourceUnitPrice = asAmount(source.unit_price);
  const sourceTotal = asAmount(source.total);

  let unitPrice: number;
  let total: number;
  if (sourceUnitPrice === null) {
    if (sourceTotal === null) {
      throw new Error(`Missing price for order item "${title}"`);
    }
    unitPrice = sourceTotal / quantity;
    total = sourceTotal;
  } else {
    unitPrice = sourceUnitPrice;
    total = sourceTotal ?? sourceUnitPrice * quantity;
  }

  return {
    title,
    variant: asText(source.variant_title),
    thumbnail: safeHttpUrl(source.thumbnail),
    quantity,
    unitPrice,
    total,
  };
};

const sum = (values: number[]) =>
  values.reduce((total, value) => total + value, 0);

const resolveTotals = (
  order: OrderConfirmationEmailSource,
  items: EmailLineItem[]
): EmailTotals => {
  const itemTotal = sum(items.map((item) => item.total));
  const shippingMethodsTotal = sum(
    (order.shipping_methods ?? []).map((method) => asAmount(method.total) ?? 0)
  );
  const subtotal =
    asAmount(order.item_subtotal) ?? asAmount(order.subtotal) ?? itemTotal;
  const shipping =
    asAmount(order.shipping_subtotal) ??
    asAmount(order.shipping_total) ??
    shippingMethodsTotal;
  const tax = asAmount(order.tax_total) ?? 0;
  const discount =
    asAmount(order.discount_subtotal) ?? asAmount(order.discount_total) ?? 0;
  const giftCard = asAmount(order.gift_card_total) ?? 0;
  const calculatedTotal = subtotal + shipping + tax - discount - giftCard;

  return {
    subtotal,
    shipping,
    tax,
    discount,
    giftCard,
    total: asAmount(order.total) ?? calculatedTotal,
  };
};

const getPaymentMethod = (
  order: OrderConfirmationEmailSource
): EmailPaymentMethod => {
  const providerId = order.payment_collections?.[0]?.payments?.[0]?.provider_id;
  if (providerId === "pp_system_default") {
    return {
      title: "Plată la livrare",
      description:
        "Achitarea se face la livrare, după confirmarea comenzii de către echipa DYLLU.",
    };
  }

  return {
    title: "Metodă de plată confirmată",
    description: "Detaliile plății sunt înregistrate împreună cu comanda.",
  };
};

const getAddressLines = (
  address: OrderEmailAddressSource | null | undefined
) => {
  if (!address) return [];

  const fullName = [asText(address.first_name), asText(address.last_name)]
    .filter(Boolean)
    .join(" ");
  const street = [asText(address.address_1), asText(address.address_2)]
    .filter(Boolean)
    .join(", ");
  const locality = [asText(address.postal_code), asText(address.city)]
    .filter(Boolean)
    .join(" ");

  return [
    fullName,
    street,
    locality,
    asText(address.country_code)?.toUpperCase() ?? "",
  ].filter(Boolean);
};

const renderProductRows = (items: EmailLineItem[], currencyCode: string) =>
  items
    .map((item) => {
      const title = escapeHtml(item.title);
      const image = item.thumbnail
        ? `<img class="product-image" src="${escapeHtml(item.thumbnail)}" width="72" height="72" alt="${title}" style="display:block;width:72px;height:72px;object-fit:contain;border:1px solid #e5e5e5;border-radius:12px;background:#fafafa" />`
        : `<div class="product-image" style="width:72px;height:72px;border:1px solid #e5e5e5;border-radius:12px;background:#fafafa"></div>`;
      const variant = item.variant
        ? `<div style="margin-top:5px;color:#68686f;font-size:14px;line-height:20px">Variantă: ${escapeHtml(item.variant)}</div>`
        : "";

      return `<tr>
        <td class="product-image-cell" width="88" valign="middle" style="padding:20px 16px 20px 0;border-bottom:1px solid #e4e4e7">${image}</td>
        <td valign="middle" style="padding:20px 12px 20px 0;border-bottom:1px solid #e4e4e7">
          <div style="color:#111;font-size:16px;font-weight:700;line-height:22px">${title}</div>
          ${variant}
        </td>
        <td class="product-price-cell" width="154" valign="middle" align="right" style="padding:20px 0;border-bottom:1px solid #e4e4e7;text-align:right;white-space:nowrap">
          <div style="color:#71717a;font-size:14px;line-height:20px;white-space:nowrap">${item.quantity} × ${escapeHtml(formatMoney(item.unitPrice, currencyCode))}</div>
          <div style="margin-top:4px;color:#111;font-size:16px;font-weight:700;line-height:22px;white-space:nowrap">${escapeHtml(formatMoney(item.total, currencyCode))}</div>
        </td>
      </tr>`;
    })
    .join("");

const renderTotalRow = (
  label: string,
  value: string,
  options: { total?: boolean; muted?: boolean } = {}
) => {
  const size = options.total ? "24px" : "15px";
  const weight = options.total ? "800" : "600";
  const color = options.muted ? "#68700f" : "#111";
  const labelStyle = options.total
    ? "font-size:12px;letter-spacing:.16em;text-transform:uppercase"
    : "font-size:15px";

  return `<tr>
    <td style="padding:${options.total ? "20px 0 0" : "6px 0"};color:${color};font-weight:${weight};${labelStyle}">${escapeHtml(label)}</td>
    <td align="right" style="padding:${options.total ? "20px 0 0" : "6px 0"};color:${color};font-size:${size};font-weight:${weight};text-align:right;white-space:nowrap">${escapeHtml(value)}</td>
  </tr>`;
};

const renderDetailsColumn = (title: string, lines: string[]) => `<td
  class="details-column"
  width="33.33%"
  valign="top"
  style="padding:0 20px 20px 0"
>
  <div style="margin-bottom:8px;color:#111;font-size:13px;font-weight:800;letter-spacing:.08em;text-transform:uppercase">${escapeHtml(title)}</div>
  <div style="color:#5f5f67;font-size:14px;line-height:21px">${lines
    .map((line) => escapeHtml(line))
    .join("<br />")}</div>
</td>`;

const renderText = ({
  orderNumber,
  firstName,
  email,
  createdAt,
  currencyCode,
  items,
  totals,
  addressLines,
  phone,
  shippingMethod,
  paymentMethod,
}: {
  orderNumber: string;
  firstName: string | null;
  email: string;
  createdAt: string;
  currencyCode: string;
  items: EmailLineItem[];
  totals: EmailTotals;
  addressLines: string[];
  phone: string | null;
  shippingMethod: string;
  paymentMethod: EmailPaymentMethod;
}) => {
  const itemLines = items
    .map((item) => {
      const variant = item.variant ? `, varianta ${item.variant}` : "";
      return `${item.title}${variant}\n${item.quantity} × ${formatMoney(item.unitPrice, currencyCode)} — ${formatMoney(item.total, currencyCode)}`;
    })
    .join("\n\n");
  const deliveryLines = [
    ...addressLines,
    phone ? `Telefon: ${phone}` : "",
    `Metodă: ${shippingMethod}`,
  ].filter(Boolean);
  const adjustmentLines = [
    totals.discount > 0
      ? `Reducere: − ${formatMoney(totals.discount, currencyCode)}`
      : "",
    totals.giftCard > 0
      ? `Card cadou: − ${formatMoney(totals.giftCard, currencyCode)}`
      : "",
  ].filter(Boolean);

  return `COMANDĂ CONFIRMATĂ

Mulțumim${firstName ? `, ${firstName}` : ""}!
Am primit comanda ta și am trimis confirmarea pe ${email}.

Număr comandă: #${orderNumber}
Plasată la: ${createdAt}
Total: ${formatMoney(totals.total, currencyCode)}

COMANDA TA

${itemLines}

Subtotal: ${formatMoney(totals.subtotal, currencyCode)}
Livrare: ${totals.shipping === 0 ? "Gratuită" : formatMoney(totals.shipping, currencyCode)}
${adjustmentLines.length ? `${adjustmentLines.join("\n")}\n` : ""}TVA: ${formatMoney(totals.tax, currencyCode)}
Total: ${formatMoney(totals.total, currencyCode)}

LIVRARE
${deliveryLines.join("\n")}

PLATĂ
${paymentMethod.title}
${paymentMethod.description}

DYLLU Moldova`;
};

export const createOrderConfirmationEmail = (
  order: OrderConfirmationEmailSource,
  storefrontUrl: string | null
): EmailContent => {
  const email = asText(order.email);
  if (!email) throw new Error("Order confirmation email requires a recipient");

  const currencyCode = (asText(order.currency_code) ?? "MDL").toUpperCase();
  const orderNumber = String(order.display_id ?? asText(order.id) ?? "—");
  const firstName = asText(order.shipping_address?.first_name);
  const createdAt = formatDate(order.created_at);
  const items = (order.items ?? []).map(resolveLineItem);
  if (items.length === 0) {
    throw new Error("Order confirmation email requires at least one item");
  }

  const totals = resolveTotals(order, items);
  const addressLines = getAddressLines(order.shipping_address);
  const phone = asText(order.shipping_address?.phone);
  const shippingMethod =
    asText(order.shipping_methods?.[0]?.name) ?? "Livrare standard";
  const paymentMethod = getPaymentMethod(order);
  const safeStorefrontUrl = safeHttpUrl(storefrontUrl);
  const greeting = `Mulțumim${firstName ? `, ${firstName}` : ""}!`;
  const productRows = renderProductRows(items, currencyCode);
  const discountRow =
    totals.discount > 0
      ? renderTotalRow(
          "Reducere",
          `− ${formatMoney(totals.discount, currencyCode)}`,
          { muted: true }
        )
      : "";
  const giftCardRow =
    totals.giftCard > 0
      ? renderTotalRow(
          "Card cadou",
          `− ${formatMoney(totals.giftCard, currencyCode)}`,
          { muted: true }
        )
      : "";
  const addressColumn = renderDetailsColumn(
    "Adresă de livrare",
    addressLines.length ? addressLines : ["Adresa înregistrată în comandă"]
  );
  const contactColumn = renderDetailsColumn(
    "Contact",
    [phone, email].filter((value): value is string => Boolean(value))
  );
  const methodColumn = renderDetailsColumn("Metodă", [
    shippingMethod,
    totals.shipping === 0
      ? "Gratuită"
      : formatMoney(totals.shipping, currencyCode),
  ]);
  const totalFormatted = formatMoney(totals.total, currencyCode);
  const subject = `Comanda DYLLU #${orderNumber} a fost confirmată`;
  const hero = renderEmailHero({
    eyebrow: "Comandă confirmată",
    title: greeting,
    description: "Am primit comanda ta și am trimis confirmarea pe",
    descriptionEmphasis: `${email}.`,
    stats: [
      { label: "Număr comandă", value: `#${orderNumber}` },
      { label: "Plasată la", value: createdAt },
      { label: "Total", value: totalFormatted },
    ],
    action: safeStorefrontUrl
      ? { label: "Continuă cumpărăturile", url: safeStorefrontUrl }
      : undefined,
  });
  const summary = `<tr>
    <td class="content-section" style="padding:46px 44px;background:#fff">
      <div style="color:#68686f;font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase">Comanda ta</div>
      <h2 style="margin:9px 0 0;color:#111;font-size:34px;line-height:1.1;letter-spacing:-.7px">Sumar</h2>
      <p style="margin:12px 0 14px;color:#68686f;font-size:15px;line-height:23px">Articolele și costurile pentru comanda plasată.</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:collapse">${productRows}</table>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:20px;width:100%;border-collapse:collapse">
        ${renderTotalRow("Subtotal", formatMoney(totals.subtotal, currencyCode))}
        ${renderTotalRow(
          "Livrare",
          totals.shipping === 0
            ? "Gratuită"
            : formatMoney(totals.shipping, currencyCode)
        )}
        ${discountRow}
        ${giftCardRow}
        ${renderTotalRow("TVA", formatMoney(totals.tax, currencyCode))}
        <tr><td colspan="2" style="padding-top:14px;border-bottom:1px solid #dedee2"></td></tr>
        ${renderTotalRow("Total", totalFormatted, { total: true })}
      </table>
      <p style="margin:12px 0 0;color:#68686f;font-size:12px;line-height:18px">Toate prețurile includ TVA.</p>
    </td>
  </tr>`;
  const deliveryAndPayment = `<tr>
    <td class="content-section" style="padding:4px 44px 40px;background:#fff">
      <div style="padding-top:34px;border-top:1px solid #dedee2">
        <div style="color:#68686f;font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase">Livrare</div>
        <h2 style="margin:9px 0 24px;color:#111;font-size:28px;line-height:1.1">Detalii expediere</h2>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:collapse"><tr>${addressColumn}${contactColumn}${methodColumn}</tr></table>
      </div>
      <div style="margin-top:8px;padding:24px;background:#f5f5f3">
        <div style="color:#68686f;font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase">Plată</div>
        <div style="margin-top:9px;color:#111;font-size:20px;font-weight:800">${escapeHtml(paymentMethod.title)}</div>
        <p style="margin:8px 0 0;color:#68686f;font-size:14px;line-height:21px">${escapeHtml(paymentMethod.description)}</p>
      </div>
    </td>
  </tr>`;
  const html = renderEmailDocument({
    title: subject,
    preheader: `Comanda #${orderNumber} a fost confirmată. Total: ${totalFormatted}.`,
    trustedBodyHtml: `${hero}${summary}${deliveryAndPayment}`,
  });

  return {
    subject,
    text: renderText({
      orderNumber,
      firstName,
      email,
      createdAt,
      currencyCode,
      items,
      totals,
      addressLines,
      phone,
      shippingMethod,
      paymentMethod,
    }),
    html,
  };
};
