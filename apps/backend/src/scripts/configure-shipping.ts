import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import {
  createServiceZonesWorkflow,
  updateShippingOptionsWorkflow,
} from "@medusajs/medusa/core-flows";

const APPLY_CONFIRMATION = "CONFIGURE_DYLLU_SHIPPING";
const ROLLBACK_CONFIRMATION = "ROLLBACK_DYLLU_SHIPPING";
const COUNTRY_ZONE_NAME = "Moldova";
const CITY_ZONE_NAME = "Municipiul Chișinău";
const CITY_OPTION_NAME = "Municipiul Chișinău";
const OUTSIDE_OPTION_NAME = "Livrare în țară";
const SHIPPING_PRICE = 100;
const CITY_FREE_THRESHOLD = 1000;
const OUTSIDE_FREE_THRESHOLD = 2000;

type Region = {
  id: string;
  name: string;
  currency_code: string;
};

type ServiceZone = {
  id: string;
  name: string;
  fulfillment_set_id: string;
  geo_zones?: Array<{
    id: string;
    type: string;
    country_code: string;
    province_code?: string | null;
    city?: string | null;
  }>;
};

type ShippingOption = {
  id: string;
  name: string;
  service_zone_id: string;
  data: Record<string, unknown> | null;
  prices?: Array<{
    id: string;
    amount: number;
    currency_code: string;
    price_rules?: Array<{
      attribute: string;
      operator: string;
      value: string;
    }>;
  }>;
};

type Flags = {
  apply?: string;
  rollback?: string;
};

export default async function configureShipping({ container, args }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const flags = parseArgs(args ?? []);

  if (flags.apply && flags.rollback) {
    throw new Error("Choose either apply or rollback, not both");
  }
  if (flags.apply && flags.apply !== APPLY_CONFIRMATION) {
    throw new Error(`Apply confirmation must equal ${APPLY_CONFIRMATION}`);
  }
  if (flags.rollback && flags.rollback !== ROLLBACK_CONFIRMATION) {
    throw new Error(
      `Rollback confirmation must equal ${ROLLBACK_CONFIRMATION}`
    );
  }

  const [regionsResult, zonesResult, optionsResult] = await Promise.all([
    query.graph({
      entity: "region",
      fields: ["id", "name", "currency_code"],
    }),
    query.graph({
      entity: "service_zone",
      fields: [
        "id",
        "name",
        "fulfillment_set_id",
        "geo_zones.id",
        "geo_zones.type",
        "geo_zones.country_code",
        "geo_zones.province_code",
        "geo_zones.city",
      ],
    }),
    query.graph({
      entity: "shipping_option",
      fields: [
        "id",
        "name",
        "service_zone_id",
        "data",
        "prices.id",
        "prices.amount",
        "prices.currency_code",
        "prices.price_rules.attribute",
        "prices.price_rules.operator",
        "prices.price_rules.value",
      ],
    }),
  ]);

  const regions = regionsResult.data as Region[];
  const zones = zonesResult.data as ServiceZone[];
  const options = optionsResult.data as ShippingOption[];
  const region = findMoldovaRegion(regions);
  const countryZone = requireExactlyOne(
    zones.filter((zone) => zone.name === COUNTRY_ZONE_NAME),
    `service zone named ${COUNTRY_ZONE_NAME}`
  );
  const cityOption = requireExactlyOne(
    options.filter((option) => option.name === CITY_OPTION_NAME),
    `shipping option named ${CITY_OPTION_NAME}`
  );
  const outsideOption = requireExactlyOne(
    options.filter((option) => option.name === OUTSIDE_OPTION_NAME),
    `shipping option named ${OUTSIDE_OPTION_NAME}`
  );
  let cityZone = zones.find((zone) => zone.name === CITY_ZONE_NAME);

  assertCountryZone(countryZone);
  if (cityZone) {
    assertCityZone(cityZone, countryZone.fulfillment_set_id);
  }

  logger.info(
    `[shipping] current: city option=${cityOption.id} zone=${cityOption.service_zone_id}; outside option=${outsideOption.id} zone=${outsideOption.service_zone_id}`
  );
  logger.info(
    `[shipping] target: 100 MDL; free at ${CITY_FREE_THRESHOLD} MDL in Chișinău city and ${OUTSIDE_FREE_THRESHOLD} MDL outside Chișinău`
  );

  if (!flags.apply && !flags.rollback) {
    logger.info("[shipping] DRY RUN — no data was changed");
    logger.info(
      `[shipping] apply with: medusa exec ./src/scripts/configure-shipping.ts apply=${APPLY_CONFIRMATION}`
    );
    logger.info(
      `[shipping] rollback with: medusa exec ./src/scripts/configure-shipping.ts rollback=${ROLLBACK_CONFIRMATION}`
    );
    return;
  }

  if (flags.rollback) {
    await updateShippingOptionsWorkflow(container).run({
      input: [
        rollbackOption(cityOption, countryZone.id, region.id),
        rollbackOption(outsideOption, countryZone.id, region.id),
      ],
    });
    const rollbackVerification = await loadShippingOptions(query, [
      cityOption.id,
      outsideOption.id,
    ]);
    verifyRollbackOption(
      requireExactlyOne(
        rollbackVerification.filter((option) => option.id === cityOption.id),
        "rolled-back city shipping option"
      ),
      countryZone.id
    );
    verifyRollbackOption(
      requireExactlyOne(
        rollbackVerification.filter((option) => option.id === outsideOption.id),
        "rolled-back outside shipping option"
      ),
      countryZone.id
    );
    logger.info(
      "[shipping] rollback complete and verified: both options use the Moldova zone and a single 100 MDL base price; the unused city zone was retained"
    );
    return;
  }

  if (!cityZone) {
    const { result } = await createServiceZonesWorkflow(container).run({
      input: {
        data: [
          {
            name: CITY_ZONE_NAME,
            fulfillment_set_id: countryZone.fulfillment_set_id,
            geo_zones: [
              {
                type: "city",
                country_code: "md",
                province_code: "cu",
                city: "Chișinău",
              },
            ],
          },
        ],
      },
    });
    cityZone = result[0] as ServiceZone | undefined;
    if (!cityZone) {
      throw new Error(
        "Medusa did not return the created Chișinău service zone"
      );
    }
    logger.info(`[shipping] created city service zone ${cityZone.id}`);
  }

  await updateShippingOptionsWorkflow(container).run({
    input: [
      configuredOption(
        cityOption,
        cityZone.id,
        region.id,
        "chisinau",
        CITY_FREE_THRESHOLD
      ),
      configuredOption(
        outsideOption,
        countryZone.id,
        region.id,
        "outside_chisinau",
        OUTSIDE_FREE_THRESHOLD
      ),
    ],
  });

  const verifiedOptions = await loadShippingOptions(query, [
    cityOption.id,
    outsideOption.id,
  ]);
  verifyOption(
    requireExactlyOne(
      verifiedOptions.filter((option) => option.id === cityOption.id),
      "updated city shipping option"
    ),
    cityZone.id,
    "chisinau",
    CITY_FREE_THRESHOLD
  );
  verifyOption(
    requireExactlyOne(
      verifiedOptions.filter((option) => option.id === outsideOption.id),
      "updated outside shipping option"
    ),
    countryZone.id,
    "outside_chisinau",
    OUTSIDE_FREE_THRESHOLD
  );

  logger.info("[shipping] configuration applied and verified");
}

function configuredOption(
  option: ShippingOption,
  serviceZoneId: string,
  regionId: string,
  deliveryArea: "chisinau" | "outside_chisinau",
  threshold: number
) {
  return {
    id: option.id,
    service_zone_id: serviceZoneId,
    data: { ...(option.data ?? {}), delivery_area: deliveryArea },
    price_type: "flat" as const,
    prices: [
      { region_id: regionId, amount: SHIPPING_PRICE },
      {
        region_id: regionId,
        amount: 0,
        rules: [
          {
            attribute: "item_total",
            operator: "gte" as const,
            value: threshold,
          },
        ],
      },
    ],
  };
}

function rollbackOption(
  option: ShippingOption,
  serviceZoneId: string,
  regionId: string
) {
  const preservedData = { ...(option.data ?? {}) };
  delete preservedData.delivery_area;

  return {
    id: option.id,
    service_zone_id: serviceZoneId,
    data: preservedData,
    price_type: "flat" as const,
    prices: [{ region_id: regionId, amount: SHIPPING_PRICE }],
  };
}

async function loadShippingOptions(
  query: {
    graph: (input: {
      entity: string;
      fields: string[];
      filters: { id: string[] };
    }) => Promise<{ data: unknown[] }>;
  },
  ids: string[]
) {
  const result = await query.graph({
    entity: "shipping_option",
    fields: [
      "id",
      "name",
      "service_zone_id",
      "data",
      "prices.id",
      "prices.amount",
      "prices.currency_code",
      "prices.price_rules.attribute",
      "prices.price_rules.operator",
      "prices.price_rules.value",
    ],
    filters: { id: ids },
  });

  return result.data as ShippingOption[];
}

function findMoldovaRegion(regions: Region[]) {
  const mdlRegions = regions.filter(
    (region) => region.currency_code.toLowerCase() === "mdl"
  );
  const namedMoldova = mdlRegions.filter((region) => region.name === "Moldova");

  return namedMoldova.length === 1
    ? namedMoldova[0]
    : requireExactlyOne(mdlRegions, "MDL region");
}

function assertCountryZone(zone: ServiceZone) {
  const hasMoldova = zone.geo_zones?.some(
    (geoZone) =>
      geoZone.type === "country" && geoZone.country_code.toLowerCase() === "md"
  );
  if (!hasMoldova) {
    throw new Error(
      `Service zone ${zone.id} is named Moldova but has no Moldova country geo zone`
    );
  }
}

function assertCityZone(zone: ServiceZone, fulfillmentSetId: string) {
  if (zone.fulfillment_set_id !== fulfillmentSetId) {
    throw new Error(
      `Existing ${CITY_ZONE_NAME} zone belongs to a different fulfillment set`
    );
  }
  const hasCanonicalCity = zone.geo_zones?.some(
    (geoZone) =>
      geoZone.type === "city" &&
      geoZone.country_code.toLowerCase() === "md" &&
      geoZone.province_code?.toLowerCase() === "cu" &&
      geoZone.city === "Chișinău"
  );
  if (!hasCanonicalCity) {
    throw new Error(
      `Existing ${CITY_ZONE_NAME} zone does not exactly match md/cu/Chișinău`
    );
  }
}

function verifyOption(
  option: ShippingOption,
  serviceZoneId: string,
  deliveryArea: string,
  threshold: number
) {
  if (option.service_zone_id !== serviceZoneId) {
    throw new Error(
      `Verification failed for ${option.name}: wrong service zone`
    );
  }
  if (option.data?.delivery_area !== deliveryArea) {
    throw new Error(`Verification failed for ${option.name}: wrong area tag`);
  }
  const hasBasePrice = option.prices?.some(
    (price) => price.amount === SHIPPING_PRICE
  );
  const hasFreePrice = option.prices?.some(
    (price) =>
      price.amount === 0 &&
      price.price_rules?.some(
        (rule) =>
          rule.attribute === "item_total" &&
          rule.operator === "gte" &&
          Number(rule.value) === threshold
      )
  );
  if (!hasBasePrice || !hasFreePrice) {
    throw new Error(`Verification failed for ${option.name}: wrong prices`);
  }
}

function verifyRollbackOption(
  option: ShippingOption,
  countryServiceZoneId: string
) {
  if (option.service_zone_id !== countryServiceZoneId) {
    throw new Error(
      `Rollback verification failed for ${option.name}: wrong service zone`
    );
  }
  if (option.data?.delivery_area !== undefined) {
    throw new Error(
      `Rollback verification failed for ${option.name}: area tag remains`
    );
  }
  if (
    option.prices?.length !== 1 ||
    option.prices[0].amount !== SHIPPING_PRICE
  ) {
    throw new Error(
      `Rollback verification failed for ${option.name}: wrong prices`
    );
  }
}

function requireExactlyOne<T>(values: T[], description: string): T {
  if (values.length !== 1) {
    throw new Error(
      `Expected exactly one ${description}, found ${values.length}`
    );
  }

  return values[0];
}

function parseArgs(args: string[]): Flags {
  const flags: Flags = {};

  for (const argument of args) {
    const [key, value] = argument.replace(/^--/, "").split("=", 2);
    if (key === "apply") flags.apply = value;
    if (key === "rollback") flags.rollback = value;
  }

  return flags;
}
