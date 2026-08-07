import { getTranslations } from "next-intl/server";
import { listProducts } from "@lib/data/products";
import { getRegion } from "@lib/data/regions";
import { HttpTypes } from "@medusajs/types";

import { ProductRailSection } from "@/components/organisms/product-rail-section";
import Product from "../product-preview";

type Props = {
  product: HttpTypes.StoreProduct;
};

export default async function RelatedProducts({ product }: Props) {
  const t = await getTranslations("RelatedProducts");
  const region = await getRegion();
  if (!region) return null;

  const collectionId = product.collection_id ?? undefined;
  const hasCollection = Boolean(collectionId);
  const tagIds = product.tags?.map((tag) => tag.id).filter(Boolean) as
    | string[]
    | undefined;
  const hasTags = Boolean(tagIds?.length);

  if (!hasCollection && !hasTags) {
    return null;
  }

  const queryParams: HttpTypes.StoreProductListParams = {
    region_id: region.id,
    is_giftcard: false,
  };
  if (collectionId) {
    queryParams.collection_id = [collectionId];
  }
  if (hasTags && tagIds) {
    queryParams.tag_id = tagIds;
  }

  const products = await listProducts({ queryParams }).then(({ response }) =>
    response.products.filter((p) => p.id !== product.id)
  );

  if (!products.length) return null;

  return (
    <ProductRailSection
      eyebrow={t("eyebrow")}
      title={t("title")}
      description={t("description")}
      background="subtle"
    >
      <ul className="small:grid-cols-3 medium:grid-cols-4 medium:gap-6 grid grid-cols-2 gap-4">
        {products.slice(0, 8).map((p) => (
          <li key={p.id}>
            <Product product={p} region={region} />
          </li>
        ))}
      </ul>
    </ProductRailSection>
  );
}
