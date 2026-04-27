import { listProducts } from "@lib/data/products";
import { getRegion } from "@lib/data/regions";
import { HttpTypes } from "@medusajs/types";
import Product from "../product-preview";

type RelatedProductsProps = {
  product: HttpTypes.StoreProduct;
};

export default async function RelatedProducts({
  product,
}: RelatedProductsProps) {
  const region = await getRegion();

  if (!region) {
    return null;
  }

  const queryParams: HttpTypes.StoreProductListParams = {};
  queryParams.region_id = region.id;
  if (product.collection_id) {
    queryParams.collection_id = [product.collection_id];
  }
  if (product.tags) {
    queryParams.tag_id = product.tags
      .map((t) => t.id)
      .filter(Boolean) as string[];
  }
  queryParams.is_giftcard = false;

  const products = await listProducts({ queryParams }).then(({ response }) =>
    response.products.filter((p) => p.id !== product.id)
  );

  if (!products.length) {
    return null;
  }

  return (
    <div className="product-page-constraint">
      <div className="mb-16 flex flex-col items-center text-center">
        <span className="text-base-regular mb-6 text-gray-600">
          Related products
        </span>
        <p className="text-2xl-regular max-w-lg text-ui-fg-base">
          You might also want to check out these products.
        </p>
      </div>

      <ul className="grid grid-cols-2 gap-x-6 gap-y-8 small:grid-cols-3 medium:grid-cols-4">
        {products.map((p) => (
          <li key={p.id}>
            <Product region={region} product={p} />
          </li>
        ))}
      </ul>
    </div>
  );
}
