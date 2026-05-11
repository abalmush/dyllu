import { listProducts } from "@lib/data/products";
import { getRegion } from "@lib/data/regions";
import { HttpTypes } from "@medusajs/types";

import { ProductRailSection } from "@/components/organisms/product-rail-section";
import Product from "../product-preview";

type Props = {
  product: HttpTypes.StoreProduct;
};

export default async function RelatedProducts({ product }: Props) {
  const region = await getRegion();
  if (!region) return null;

  const queryParams: HttpTypes.StoreProductListParams = {
    region_id: region.id,
    is_giftcard: false,
  };
  if (product.collection_id) {
    queryParams.collection_id = [product.collection_id];
  }
  if (product.tags) {
    queryParams.tag_id = product.tags
      .map((t) => t.id)
      .filter(Boolean) as string[];
  }

  const products = await listProducts({ queryParams }).then(({ response }) =>
    response.products.filter((p) => p.id !== product.id)
  );

  if (!products.length) return null;

  return (
    <ProductRailSection
      eyebrow="Selecție DYLLU"
      title="Produse înrudite"
      description="Au mai cumpărat-o profesioniștii care lucrează cu această sculă."
      background="subtle"
    >
      <ul className="grid grid-cols-2 gap-4 small:grid-cols-3 medium:grid-cols-4 medium:gap-6">
        {products.slice(0, 8).map((p) => (
          <li key={p.id}>
            <Product product={p} region={region} />
          </li>
        ))}
      </ul>
    </ProductRailSection>
  );
}
