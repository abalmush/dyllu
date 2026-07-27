import { expect, test } from "@playwright/test";

test("root categories include products assigned to child categories", async ({
  request,
}) => {
  const response = await request.get("/categories/gradinarit");
  const html = await response.text();

  expect(response.status()).toBe(200);
  expect(html).toContain("Grădinărit");
  expect(html).toContain('data-testid="products-list"');
  expect(html).not.toContain("Categoria încă nu are produse");
  expect(html.match(/href="\/products\//g)?.length ?? 0).toBeGreaterThanOrEqual(
    12
  );
});

test("power-tool accessories render only under the accessories hierarchy", async ({
  request,
}) => {
  const [
    powerTools,
    accessories,
    powerToolAccessoriesPageOne,
    powerToolAccessoriesPageTwo,
    batteries,
  ] = await Promise.all([
    request.get("/categories/scule-electrice"),
    request.get("/categories/accesorii-si-consumabile-pentru-scule"),
    request.get(
      "/categories/accesorii-si-consumabile-pentru-scule-accesorii-pentru-scule-electrice"
    ),
    request.get(
      "/categories/accesorii-si-consumabile-pentru-scule-accesorii-pentru-scule-electrice?page=2"
    ),
    request.get(
      "/categories/scule-electrice-acumulatori-si-incarcatoare-pentru-scule"
    ),
  ]);

  const powerToolsHtml = await powerTools.text();
  const accessoriesHtml = await accessories.text();
  const powerToolAccessoriesHtml =
    (await powerToolAccessoriesPageOne.text()) +
    (await powerToolAccessoriesPageTwo.text());
  const batteriesHtml = await batteries.text();

  for (const response of [
    powerTools,
    accessories,
    powerToolAccessoriesPageOne,
    powerToolAccessoriesPageTwo,
    batteries,
  ]) {
    expect(response.status()).toBe(200);
  }

  expect(powerToolsHtml).not.toContain(
    'href="/categories/scule-electrice-acumulatori-si-incarcatoare-pentru-scule"'
  );
  expect(powerToolsHtml).not.toContain(
    'href="/categories/scule-electrice-pistoale-de-lipit-cu-silicon"'
  );
  expect(accessoriesHtml).toContain(
    'href="/categories/scule-electrice-acumulatori-si-incarcatoare-pentru-scule"'
  );
  expect(powerToolAccessoriesHtml).toContain("Set baton de silicon");
  expect(powerToolAccessoriesHtml).toContain("Set freze pentru lemn 6 mm");
  expect(powerToolAccessoriesHtml).toContain("Set freze pentru lemn 8 mm");
  expect(powerToolAccessoriesHtml).toContain("Set freze pentru lemn 12 mm");
  expect(batteriesHtml).toContain("Accesorii și consumabile pentru scule");
});

test("complete screwdriver bit sets render as hand tools", async ({
  request,
}) => {
  const [bitAccessories, manualScrewdrivers] = await Promise.all([
    request.get(
      "/categories/accesorii-si-consumabile-pentru-scule-biti-si-port-biti"
    ),
    request.get("/categories/surubelnite?page=8"),
  ]);
  const bitAccessoriesHtml = await bitAccessories.text();
  const manualScrewdriversHtml = await manualScrewdrivers.text();
  const manualSetNames = [
    "Set biți pentru șurubelniță, 12 piese",
    "Set biți cu mâner cu clichet, 28 piese",
    "Set bițe pentru șurubelniță 25 mm",
    "Set bițe profesional 62 buc., 25 mm",
    "Set bițe profesional 36 buc., 25 mm",
  ];

  expect(bitAccessories.status()).toBe(200);
  expect(manualScrewdrivers.status()).toBe(200);
  expect(manualScrewdriversHtml).toContain("Scule de mână");

  for (const name of manualSetNames) {
    expect(bitAccessoriesHtml).not.toContain(name);
    expect(manualScrewdriversHtml).toContain(name);
  }
});

test("garden replacement parts render under utility accessories", async ({
  request,
}) => {
  const accessoryPath =
    "/categories/accesorii-si-consumabile-pentru-scule-accesorii-pentru-scule-electrice";
  const [garden, accessoryPageOne, accessoryPageTwo] = await Promise.all([
    request.get("/categories/gradinarit"),
    request.get(accessoryPath),
    request.get(`${accessoryPath}?page=2`),
  ]);
  const gardenHtml = await garden.text();
  const accessoryHtml =
    (await accessoryPageOne.text()) + (await accessoryPageTwo.text());
  const accessoryNames = [
    "Fir nailon pentru motocoasă 3 mm 15 m",
    "Fir nailon pentru motocoasă 3,3 mm",
    "Fir nailon pentru motocoasă 3 mm 9 m",
    "Fir nailon pentru motocoasă 2,7 mm",
    "Fir nailon pentru motocoasă 2 mm",
    "Fir nailon pentru motocoasă 3 mm, model DTJC2404",
    "Fir nailon pentru motocoasă 3 mm, model DTJC2402",
    "Fir nailon pentru motocoasă",
    "Disc de tăiere pentru motocoasă 255 mm",
    "Set coliere pentru furtun 26 buc.",
    "Șină de ghidaj pentru drujbă, 18″",
    "Lanț pentru drujbă, 18″",
  ];

  expect(garden.status()).toBe(200);
  expect(accessoryPageOne.status()).toBe(200);
  expect(accessoryPageTwo.status()).toBe(200);
  expect(accessoryHtml).toContain("Accesorii pentru scule și utilaje");

  for (const name of accessoryNames) {
    expect(gardenHtml).not.toContain(name);
    expect(accessoryHtml).toContain(name);
  }
});

test("construction products render in product-type categories", async ({
  request,
}) => {
  const [
    paintSprayers,
    poweredTileTools,
    caulkGuns,
    manualTileTools,
    utilityAccessories,
    generators,
  ] = await Promise.all([
    request.get("/categories/scule-electrice-pistoale-electrice-de-vopsit"),
    request.get(
      "/categories/scule-electrice-scule-electrice-pentru-gresie-si-beton"
    ),
    request.get(
      "/categories/scule-de-mana-pistoale-manuale-pentru-silicon-si-adeziv"
    ),
    request.get(
      "/categories/scule-de-mana-scule-manuale-pentru-gresie-si-sticla"
    ),
    request.get(
      "/categories/accesorii-si-consumabile-pentru-scule-accesorii-pentru-scule-electrice"
    ),
    request.get("/categories/constructii-si-finisaje-generatoare-electrice"),
  ]);
  const paintHtml = await paintSprayers.text();
  const poweredTileHtml = await poweredTileTools.text();
  const caulkHtml = await caulkGuns.text();
  const manualTileHtml = await manualTileTools.text();
  const accessoryHtml = await utilityAccessories.text();
  const generatorHtml = await generators.text();

  for (const response of [
    paintSprayers,
    poweredTileTools,
    caulkGuns,
    manualTileTools,
    utilityAccessories,
    generators,
  ]) {
    expect(response.status()).toBe(200);
  }

  for (const name of [
    "Pistol de vopsit electric 20 V",
    "Pistol de vopsit electric Fără acumulator",
    "Pistol de vopsit electric 220–240 V ~ 50/60 Hz",
    "Pistol de vopsit electric 450 W",
    "Pistol de vopsit electric 500 W",
  ]) {
    expect(paintHtml).toContain(name);
  }

  for (const name of [
    "Vibrator intern pentru beton cu acumulator 20 V, 2 Ah",
    "Mașină de tăiat gresie cu acumulator 20 V",
    "Vibrator cu ventuză pentru gresie 20 V, 180 mm",
    "Vibrator cu ventuză pentru gresie 20 V, 130 mm",
  ]) {
    expect(poweredTileHtml).toContain(name);
  }

  for (const model of ["DTCG4109", "DTCG3109", "DTCG2309", "DTCG1309"]) {
    expect(caulkHtml).toContain(model);
  }

  for (const name of [
    "Aparat de tăiat gresie manual 1200 mm, model DTTR8512",
    "Aparat de tăiat gresie manual 1600 mm",
    "Aparat de tăiat gresie manual 1200 mm, model DTTR3512",
    "Aparat de tăiat gresie manual 1200 mm, model DTTR1512",
    "Aparat de tăiat gresie manual 1000 mm",
    "Aparat de tăiat gresie manual 600 mm",
    "Ventuze pentru sticlă și gresie 115 mm",
  ]) {
    expect(manualTileHtml).toContain(name);
  }

  expect(accessoryHtml).toContain("Lamă pentru tăiat gresie 2 mm, 6×2 mm");
  expect(generatorHtml).toContain("Electrică");
  for (const name of [
    "Generator electric invertor, 1 kW, 220-240 V",
    "Generator electric invertor, 5,5 kW, 220-240 V, model DTGEAB08",
    "Generator electric invertor, 3,8 kW, 220-240 V",
    "Generator electric invertor, 7000 W, 220-240 V",
    "Generator electric invertor, 8,5 kW, 220-240 V",
    "Generator electric invertor, 5,5 kW, 220-240 V, model DTGEAA08",
    "Generator electric invertor, 2,8 kW, 220-240 V",
  ]) {
    expect(generatorHtml).toContain(name);
  }
});

test("measurement tools and electrical equipment use separate roots", async ({
  request,
}) => {
  const [
    powerTools,
    electrical,
    laserMeasurementPageOne,
    laserMeasurementPageTwo,
    manualMeasurement,
  ] = await Promise.all([
    request.get("/categories/scule-electrice"),
    request.get("/categories/electrica"),
    request.get(
      "/categories/masurare-si-electrica-nivele-si-instrumente-laser"
    ),
    request.get(
      "/categories/masurare-si-electrica-nivele-si-instrumente-laser?page=2"
    ),
    request.get("/categories/masurare-si-trasare"),
  ]);
  const powerToolsHtml = await powerTools.text();
  const electricalHtml = await electrical.text();
  const laserMeasurementHtml =
    (await laserMeasurementPageOne.text()) +
    (await laserMeasurementPageTwo.text());
  const manualMeasurementHtml = await manualMeasurement.text();

  for (const response of [
    powerTools,
    electrical,
    laserMeasurementPageOne,
    laserMeasurementPageTwo,
    manualMeasurement,
  ]) {
    expect(response.status()).toBe(200);
  }

  expect(powerToolsHtml).toContain("Măsurare laser și nivele");
  expect(powerToolsHtml).toContain("Măsurare și trasare");
  expect(laserMeasurementHtml).toContain("Nivelă laser cu linii 12 V, 30 m");
  expect(laserMeasurementHtml).toContain("Telemetru cu laser 100 m");
  expect(manualMeasurementHtml).toContain("Șubler digital 150 mm");
  expect(electricalHtml).toContain("Generatoare electrice");
  expect(electricalHtml).toContain("Iluminat de lucru");
  expect(electricalHtml).not.toContain("Nivelă laser cu linii 12 V, 30 m");
});

test("cleaning equipment is split by customer use and has no separate root", async ({
  request,
}) => {
  const [removedCleaningRoot, pressureWashers, vacuumsAndSteam] =
    await Promise.all([
      request.get("/categories/curatenie"),
      request.get("/categories/curatenie-aparate-de-spalat-cu-presiune"),
      request.get(
        "/categories/curatenie-aspiratoare-si-aparate-de-curatat-cu-aburi"
      ),
    ]);
  const pressureHtml = await pressureWashers.text();
  const vacuumHtml = await vacuumsAndSteam.text();

  expect(removedCleaningRoot.status()).toBe(404);
  expect(pressureWashers.status()).toBe(200);
  expect(vacuumsAndSteam.status()).toBe(200);
  expect(pressureHtml).toContain("Auto și garaj");
  expect(vacuumHtml).toContain("Casă și gospodărie");

  for (const name of [
    "Aparat de spălat cu presiune electric, 1400 W",
    "Aparat de spălat cu presiune electric, 1600 W",
    "Aparat de spălat cu presiune electric, 1800 W",
    "Aparat de spălat cu presiune electric, 1200 W",
    "Aparat de spălat cu presiune electric, 2200 W",
    "Aparat de spălat cu presiune cu 2 acumulatori",
    "Aparat de spălat cu presiune fără acumulator",
    "Aparat de spălat cu presiune cu acumulator",
    "Furtun de înaltă presiune 5 m cu cuplaj rapid",
    "Lance de spumare 550 ml pentru aparat de spălat",
    "Aparat de spălat cu presiune pe benzină",
  ]) {
    expect(pressureHtml).toContain(name);
  }

  for (const name of [
    "Aspirator industrial, 2 × 1200 W, 60 L, 20 kPa",
    "Aspirator industrial (variantă și, ), 1200 W, 20 L, 18 kPa",
    "Aspirator cu acumulator și încărcător, 20 V",
    "Aspirator cu acumulator, 8 V",
    "Aspirator cu acumulator și încărcător, 8 V",
    "Aparat de curățat cu aburi, 1800 W, 1,5 L",
  ]) {
    expect(vacuumHtml).toContain(name);
  }
});
