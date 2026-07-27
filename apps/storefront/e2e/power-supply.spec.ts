import { expect, test } from "@playwright/test";

test("bare P20S tool shows compact supply badges below the image and compatible accessories", async ({
  request,
}) => {
  const response = await request.get(
    "/products/ciocan-rotopercutor-cu-acumulator-22mm-dyllu-dtlm15220"
  );
  const html = await response.text();

  expect(response.status()).toBe(200);
  expect(html).toContain('data-testid="power-supply-badges"');
  expect(html).toContain("Fără acumulator");
  expect(html).toContain("Fără încărcător");
  expect(html).toContain("Platformă DYLLU P20S 20 V");
  expect(html).toContain('data-testid="power-supply-configurator"');
  expect(html).toContain("Sculă fără acumulator și încărcător");
  expect(html.indexOf('data-tmp-id="pdp-image-wrapper"')).toBeLessThan(
    html.indexOf('data-testid="power-supply-badges"')
  );
  expect(html.indexOf('data-testid="power-supply-badges"')).toBeLessThan(
    html.indexOf('data-tmp-id="pdp-card-layer"')
  );
  for (const name of [
    "Acumulator Li-Ion Dyllu DTLBP520, 20 V, 2 Ah",
    "Acumulator Li-Ion Dyllu DTLBP540, 20 V, 4 Ah",
    "Acumulator Li-Ion Dyllu DTLBP550, 20 V, 5 Ah",
    "Încărcător rapid Dyllu DTFCP540, 20 V, 4 A",
  ]) {
    expect(html).toContain(name);
  }
});

test("included P20S kit shows its exact battery package without suggestions", async ({
  request,
}) => {
  const response = await request.get(
    "/products/ciocan-rotopercutor-cu-acumulator-20v-4ah-dyllu-dtlm15225"
  );
  const html = await response.text();

  expect(response.status()).toBe(200);
  expect(html).toContain("2 acumulatori incluși · 4 Ah");
  expect(html).toContain("Încărcător inclus");
  expect(html).not.toContain('data-testid="power-supply-configurator"');
});

test("S12 tool shows its recorded battery and charger state", async ({
  request,
}) => {
  const response = await request.get(
    "/products/cheie-de-impact-cu-acumulator-20n-m-12v-1-5ah-dyllu-dtcds520"
  );
  const html = await response.text();

  expect(response.status()).toBe(200);
  expect(html).toContain("Acumulator inclus");
  expect(html).toContain("Fără încărcător");
  expect(html).toContain("Platformă DYLLU S12 12 V");
});

test("P20S tool sold without battery and charger proposes both", async ({
  request,
}) => {
  const response = await request.get(
    "/products/ciocan-rotopercutor-cu-acumulator-dtlm1516-20v"
  );
  const html = await response.text();
  const title = html.match(
    /<h1[^>]*data-testid="product-title"[^>]*>(.*?)<\/h1>/s
  )?.[1];

  expect(response.status()).toBe(200);
  expect(html).toContain("Fără acumulator");
  expect(html).toContain("Fără încărcător");
  expect(html).toContain("Platformă DYLLU P20S 20 V");
  expect(title).toContain("Ciocan rotopercutor cu acumulator Dyllu DTLM1516");
  expect(title).not.toContain(
    "Ciocan rotopercutor cu acumulator și încărcător Dyllu DTLM1516"
  );
  expect(html).toContain('data-testid="power-supply-configurator"');
  expect(html).toContain("Sculă fără acumulator și încărcător");
});

test("included charger uses its approved reference image", async ({
  request,
}) => {
  const response = await request.get(
    "/products/masina-de-gaurit-cu-acumulator-62n-m-20v-dtcdp6281-2-0ah"
  );
  const html = await response.text();

  expect(response.status()).toBe(200);
  expect(html).toContain("2 acumulatori incluși · 2 Ah");
  expect(html).toContain("Încărcător inclus");
  expect(html).toContain('data-testid="included-power-accessory-DTFCP502"');
  expect(html).toContain("Încărcător DTFCP502");
  expect(html).toContain("DTFCP518-a9c4ce8bb80a.webp");
});

test("product pages use the transparent Cloudflare image relationship", async ({
  request,
}) => {
  const response = await request.get(
    "/products/masina-de-gaurit-cu-acumulator-62n-m-20v-dtcdp6281-2-0ah"
  );
  const html = await response.text();
  const imageSources = Array.from(
    html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g),
    (match) => match[1]
  );

  expect(response.status()).toBe(200);
  expect(
    imageSources.some((src) =>
      src.includes("/transparent/DTCDP6281-6f5c5596b05c.webp")
    )
  ).toBe(true);
  expect(
    imageSources.some((src) =>
      src.includes("/products/DTCDP6281-ed13393298d7.png")
    )
  ).toBe(false);
});

test("CSV-classified cordless saw requires battery and charger everywhere", async ({
  request,
}) => {
  const [productResponse, listingResponse] = await Promise.all([
    request.get("/products/ferastrau-pendular-cu-acumulator-dtls1565-20v"),
    request.get("/store?q=DTLS1565"),
  ]);
  const [productHtml, listingHtml] = await Promise.all([
    productResponse.text(),
    listingResponse.text(),
  ]);

  expect(productResponse.status()).toBe(200);
  expect(listingResponse.status()).toBe(200);
  expect(productHtml).toContain("Fără acumulator");
  expect(productHtml).toContain("Fără încărcător");
  expect(productHtml).toContain('data-testid="power-supply-configurator"');
  expect(listingHtml).toContain("Necesită acumulator");
});

test("DTZY1501 uses the exact charger mapped by the CSV", async ({
  request,
}) => {
  const response = await request.get(
    "/products/polizor-drept-cu-acumulator-dtzy1501"
  );
  const html = await response.text();

  expect(response.status()).toBe(200);
  expect(html).toContain("Acumulator inclus · 4 Ah");
  expect(html).toContain("Încărcător inclus");
  expect(html).toContain('data-testid="included-power-accessory-DTFCP502"');
  expect(html).toContain("Încărcător DTFCP502");
  expect(html).toContain("DTFCP518-a9c4ce8bb80a.webp");
});
