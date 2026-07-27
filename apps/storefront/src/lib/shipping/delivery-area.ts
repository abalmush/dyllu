export const DELIVERY_AREAS = {
  CHISINAU: "chisinau",
  OUTSIDE_CHISINAU: "outside_chisinau",
} as const;

export type DeliveryArea = (typeof DELIVERY_AREAS)[keyof typeof DELIVERY_AREAS];

type AddressLike = {
  city?: string | null;
  country_code?: string | null;
  province?: string | null;
};

type ShippingOptionLike = {
  data?: Record<string, unknown> | null;
};

const CHISINAU_NAMES = new Set([
  "chisinau",
  "mun chisinau",
  "municipiul chisinau",
  "municipiu chisinau",
  "oras chisinau",
  "orasul chisinau",
]);

const CHISINAU_SECTORS = new Set(["botanica", "buiucani", "centru", "ciocana"]);
const AMBIGUOUS_CHISINAU_SECTOR = "riscani";

export function normalizePlaceName(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function isChisinauCityName(value: string | null | undefined) {
  const normalized = normalizePlaceName(value);
  if (CHISINAU_NAMES.has(normalized)) {
    return true;
  }

  const withoutSectorPrefix = normalized.replace(
    /^(?:sectorul|sector|sect|sec)\s+/,
    ""
  );
  const hasSectorPrefix = withoutSectorPrefix !== normalized;
  const sectorName = withoutSectorPrefix
    .replace(/^chisinau\s+/, "")
    .replace(/\s+chisinau$/, "");
  const hasChisinauQualifier = sectorName !== withoutSectorPrefix;

  if (sectorName === AMBIGUOUS_CHISINAU_SECTOR) {
    return hasSectorPrefix || hasChisinauQualifier;
  }

  return CHISINAU_SECTORS.has(sectorName);
}

export function getDeliveryArea(address?: AddressLike | null): DeliveryArea {
  const countryCode = normalizePlaceName(address?.country_code);

  return countryCode === "md" && isChisinauCityName(address?.city)
    ? DELIVERY_AREAS.CHISINAU
    : DELIVERY_AREAS.OUTSIDE_CHISINAU;
}

export function canonicalizeShippingAddress<T extends AddressLike>(
  address: T
): T {
  if (getDeliveryArea(address) !== DELIVERY_AREAS.CHISINAU) {
    return address;
  }

  return {
    ...address,
    city: "Chișinău",
    province: "cu",
  };
}

export function getShippingOptionDeliveryArea(
  option: ShippingOptionLike
): DeliveryArea | null {
  const area = option.data?.delivery_area;

  return area === DELIVERY_AREAS.CHISINAU ||
    area === DELIVERY_AREAS.OUTSIDE_CHISINAU
    ? area
    : null;
}

export function isShippingOptionAllowedForAddress(
  option: ShippingOptionLike,
  address?: AddressLike | null
) {
  const optionArea = getShippingOptionDeliveryArea(option);

  // Untagged options (for example, pickup) remain available. Delivery options
  // become authoritative as soon as the Medusa configuration tags them.
  return optionArea === null || optionArea === getDeliveryArea(address);
}
