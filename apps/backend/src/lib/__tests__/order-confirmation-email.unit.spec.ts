import { createOrderConfirmationEmail } from "../order-confirmation-email";

const order = {
  id: "order_01KZ3N0F79VXMSR98FYY48H31N",
  display_id: 9,
  email: "andrei@example.com",
  created_at: "2026-08-03T11:09:12.303Z",
  currency_code: "mdl",
  total: 3055,
  item_subtotal: 3055,
  shipping_subtotal: 0,
  tax_total: 0,
  discount_subtotal: 0,
  shipping_address: {
    first_name: "Andrei",
    last_name: "Test",
    address_1: "str. Independenței 1",
    postal_code: "MD-2001",
    city: "Chișinău",
    country_code: "md",
    phone: "+373 60 000 000",
  },
  items: [
    {
      product_title: "Suflantă frunze fără acumulator și încărcător",
      variant_title: "Standard",
      thumbnail: "https://cdn.dyllu.md/transparent/DTBLP520-ed33fa688628.webp",
      quantity: 1,
      unit_price: 599,
      total: 599,
    },
    {
      product_title:
        "Pistol de aer cald fără acumulator și încărcător, 20 V, 300/550 °C",
      variant_title: "20.0V",
      quantity: 1,
      unit_price: 579,
      total: 579,
    },
    {
      product_title: "Acumulator Li-Ion, 20 V, 5 Ah",
      variant_title: "20.0V",
      quantity: 2,
      unit_price: 799,
      total: 1598,
    },
    {
      product_title: "Încărcător rapid, 20 V, 4 A",
      variant_title: "20V · 0ah",
      quantity: 1,
      unit_price: 279,
      total: 279,
    },
  ],
  shipping_methods: [{ name: "Municipiul Chișinău", total: 0 }],
  payment_collections: [{ payments: [{ provider_id: "pp_system_default" }] }],
};

describe("createOrderConfirmationEmail", () => {
  it("renders the confirmation page information with correct prices", () => {
    const email = createOrderConfirmationEmail(order, "https://dyllu.md/");

    expect(email.subject).toBe("Comanda DYLLU #9 a fost confirmată");
    expect(email.html).toContain('data-email-style="dyllu-transactional-v1"');
    expect(email.html).toContain("Mulțumim, Andrei!");
    expect(email.html).toContain("3.055,00");
    expect(email.html).toContain("1.598,00");
    expect(email.html).toContain("2 ×");
    expect(email.html).toContain("Variantă: 20.0V");
    expect(email.html).toContain("DTBLP520-ed33fa688628.webp");
    expect(email.html).toContain("Municipiul Chișinău");
    expect(email.html).toContain("Plată la livrare");
    expect(email.html).toContain("https://dyllu.md/");
    expect(email.text).toContain("Total: 3.055,00");
  });

  it("calculates missing computed totals from persisted unit prices", () => {
    const email = createOrderConfirmationEmail(
      {
        ...order,
        total: undefined,
        item_subtotal: undefined,
        subtotal: undefined,
        items: order.items.map((item) => ({ ...item, total: undefined })),
      },
      null
    );

    expect(email.html).toContain("3.055,00");
    expect(email.html).toContain("1.598,00");
    expect(email.text).toContain("2 × 799,00");
  });

  it("escapes customer and product content", () => {
    const email = createOrderConfirmationEmail(
      {
        ...order,
        email: "customer+test@example.com",
        shipping_address: {
          ...order.shipping_address,
          first_name: "<Andrei>",
        },
        items: [
          {
            product_title: '<img src=x onerror="alert(1)">',
            variant_title: "A&B",
            quantity: 1,
            unit_price: 10,
          },
        ],
        total: 10,
        item_subtotal: 10,
      },
      "javascript:alert(1)"
    );

    expect(email.html).toContain("Mulțumim, &lt;Andrei&gt;!");
    expect(email.html).toContain(
      "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;"
    );
    expect(email.html).toContain("Variantă: A&amp;B");
    expect(email.html).not.toContain("javascript:alert(1)");
    expect(email.html).not.toContain('<img src=x onerror="alert(1)">');
  });

  it("rejects an item without usable pricing", () => {
    expect(() =>
      createOrderConfirmationEmail(
        {
          ...order,
          items: [{ product_title: "Produs", quantity: 1 }],
        },
        null
      )
    ).toThrow('Missing price for order item "Produs"');
  });
});
