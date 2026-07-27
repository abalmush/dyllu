import "server-only";

import { HttpTypes } from "@medusajs/types";

import { listProducts } from "@lib/data/products";
import { getIncludedAccessoryRelationships } from "@modules/products/lib/product-presentation";

export type IncludedAccessoryImage = {
  sku: string;
  title: string;
  imageUrl: string;
};

const POWER_ACCESSORY_RE =
  /(acumulator|acumulatori|baterie|baterii|battery|batteries|încărcător|incarcator|charger)/i;

const ACCESSORY_IMAGE_REFERENCES = new Map([
  [
    "dtfcp502",
    {
      sku: "DTFCP518",
      title: "Încărcător DTFCP502",
    },
  ],
]);

const normalizeSku = (sku: string) => sku.trim().toLowerCase();

function getProductSku(product: HttpTypes.StoreProduct): string {
  const value = Reflect.get(product, "sku");
  return typeof value === "string" ? value.trim() : "";
}

function getImageUrl(product: HttpTypes.StoreProduct): string | undefined {
  if (product.thumbnail) return product.thumbnail;
  if (product.images?.[0]?.url) return product.images?.[0]?.url;

  const firstVariantWithImage = (product.variants ?? []).find(
    (variant) => variant.images?.[0]?.url
  );
  return firstVariantWithImage?.images?.[0]?.url;
}

function productMatchesSku(
  product: HttpTypes.StoreProduct,
  targetSku: string
): boolean {
  const lowerSku = normalizeSku(targetSku);
  const productSku = getProductSku(product).toLowerCase();

  if (productSku === lowerSku) return true;

  if (
    product.variants?.some(
      (variant) => normalizeSku(variant.sku ?? "") === lowerSku
    )
  ) {
    return true;
  }

  const handle = product.handle?.trim().toLowerCase();
  return handle === lowerSku || !!handle?.includes(`-${lowerSku}`);
}

function productLooksRelatedToSku(
  product: HttpTypes.StoreProduct,
  targetSku: string
): boolean {
  const lowerSku = normalizeSku(targetSku);
  const productSku = getProductSku(product);
  const searchable = [
    product.title,
    productSku,
    product.handle,
    ...(product.variants ?? []).flatMap((variant) => [
      variant.sku,
      variant.title,
    ]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return searchable.includes(lowerSku);
}

export async function getIncludedAccessoryImages(
  product: HttpTypes.StoreProduct,
  regionId: string
): Promise<IncludedAccessoryImage[]> {
  const relationships = (product.variants ?? [])
    .flatMap((variant) => getIncludedAccessoryRelationships(product, variant))
    .filter(
      (relationship) =>
        relationship.kind === "battery" ||
        relationship.kind === "charger" ||
        (typeof relationship.name === "string" &&
          POWER_ACCESSORY_RE.test(relationship.name))
    );
  const skus = [
    ...new Set(
      relationships
        .map((relationship) => relationship.sku)
        .filter((sku): sku is string => typeof sku === "string" && !!sku.trim())
    ),
  ];
  if (skus.length === 0) return [];

  const resolveAccessoryImage = async (rawSku: string) => {
    const sku = rawSku.trim();
    if (!sku) return null;
    const lowerSku = normalizeSku(sku);
    const imageReference = ACCESSORY_IMAGE_REFERENCES.get(lowerSku);
    const lookupSku = imageReference?.sku ?? sku;
    const lowerLookupSku = normalizeSku(lookupSku);
    const candidateQuery = {
      limit: 12,
    };
    type AccessoryQueryCandidate = {
      params: HttpTypes.FindParams & HttpTypes.StoreProductListParams;
      allowLoose: boolean;
      strict: boolean;
    };
    const queryCandidates: AccessoryQueryCandidate[] = [
      {
        params: {
          ...candidateQuery,
          variants: { sku: lookupSku },
        } as HttpTypes.FindParams &
          HttpTypes.StoreProductListParams & {
            [key: string]: { sku: string };
          },
        strict: true,
        allowLoose: false,
      },
      {
        params: {
          ...candidateQuery,
          ["variants.sku"]: lookupSku,
        } as unknown as HttpTypes.FindParams &
          HttpTypes.StoreProductListParams & {
            [key: string]: string;
          },
        strict: true,
        allowLoose: false,
      },
      {
        params: {
          ...candidateQuery,
          ["variants[sku]"]: lookupSku,
        } as unknown as HttpTypes.FindParams &
          HttpTypes.StoreProductListParams & {
            [key: string]: string;
          },
        strict: true,
        allowLoose: false,
      },
      {
        params: { ...candidateQuery, q: lookupSku },
        strict: false,
        allowLoose: true,
      },
      {
        params: { ...candidateQuery, handle: lookupSku },
        strict: false,
        allowLoose: true,
      },
      {
        params: { ...candidateQuery, q: lowerLookupSku },
        strict: false,
        allowLoose: true,
      },
    ];

    for (const { params, strict, allowLoose } of queryCandidates) {
      try {
        const { response } = await listProducts({
          regionId,
          queryParams: params,
        });
        const matchingProduct = strict
          ? response.products.find((product) =>
              productMatchesSku(product, lowerLookupSku)
            )
          : undefined;
        const relatedProduct = allowLoose
          ? (response.products.find((product) =>
              productMatchesSku(product, lowerLookupSku)
            ) ??
            response.products.find((product) =>
              productLooksRelatedToSku(product, lowerLookupSku)
            ))
          : undefined;
        const fallbackProduct = matchingProduct ?? relatedProduct;

        if (!fallbackProduct) {
          continue;
        }

        const imageUrl = getImageUrl(fallbackProduct);
        if (!imageUrl) {
          continue;
        }

        return {
          sku,
          title: imageReference?.title ?? fallbackProduct.title ?? sku,
          imageUrl,
        };
      } catch {
        continue;
      }
    }

    const fallbackQueryResult = await (async () => {
      try {
        const { response } = await listProducts({
          regionId,
          queryParams: {
            ...candidateQuery,
            limit: 50,
          },
        });
        const responseMatch = response.products.find((product) =>
          productMatchesSku(product, lowerLookupSku)
        );
        const responseFallback = response.products.find((product) =>
          productLooksRelatedToSku(product, lowerLookupSku)
        );
        const product = responseMatch ?? responseFallback;
        if (!product) return null;

        const imageUrl = getImageUrl(product);
        if (!imageUrl) return null;

        return {
          sku,
          title: imageReference?.title ?? product.title ?? sku,
          imageUrl,
        };
      } catch {
        return null;
      }
    })();

    if (fallbackQueryResult) {
      return fallbackQueryResult;
    }

    return null;
  };

  const results = await Promise.allSettled(
    skus.map((sku) => resolveAccessoryImage(sku))
  );

  return results.flatMap((result) => {
    if (result.status !== "fulfilled" || !result.value) return [];
    return [result.value];
  });
}
