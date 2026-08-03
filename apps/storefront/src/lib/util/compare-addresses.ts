const ADDRESS_FIELDS = [
  "first_name",
  "last_name",
  "address_1",
  "address_2",
  "company",
  "postal_code",
  "city",
  "country_code",
  "province",
  "phone",
] as const;

type AddressField = (typeof ADDRESS_FIELDS)[number];

type AddressLike = Partial<Record<AddressField, string | null>>;

export default function compareAddresses(
  address1?: AddressLike | null,
  address2?: AddressLike | null
) {
  return ADDRESS_FIELDS.every(
    (field) =>
      String(address1?.[field] ?? "").trim() ===
      String(address2?.[field] ?? "").trim()
  );
}
