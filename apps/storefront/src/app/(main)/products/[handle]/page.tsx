import { Metadata } from "next";
import { notFound } from "next/navigation";
import { listProducts } from "@lib/data/products";
import { getRegion } from "@lib/data/regions";
import { buildSocialMetadata, getProductSocialImage } from "@/lib/seo/metadata";
import ProductTemplate from "@modules/products/templates";
import { HttpTypes } from "@medusajs/types";

type Props = {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ v_id?: string }>;
};

export const dynamic = "force-dynamic";

function getImagesForVariant(
  product: HttpTypes.StoreProduct,
  selectedVariantId?: string
): HttpTypes.StoreProductImage[] {
  if (!selectedVariantId || !product.variants) {
    return product.images ?? [];
  }

  const variant = product.variants.find((v) => v.id === selectedVariantId);
  if (!variant?.images?.length) {
    return product.images ?? [];
  }

  const imageIdsMap = new Map(variant.images.map((i) => [i.id, true]));
  return (
    product.images?.filter((i) => imageIdsMap.has(i.id)) ?? product.images ?? []
  );
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const { handle } = params;
  const region = await getRegion();

  if (!region) {
    notFound();
  }

  const product = await listProducts({
    queryParams: { handle },
  }).then(({ response }) => response.products[0]);

  if (!product) {
    notFound();
  }

  return buildSocialMetadata({
    title: product.title,
    description: product.description,
    fallbackDescription: `${product.title} disponibil la DYLLU. Comandă online cu livrare rapidă în toată Moldova.`,
    path: `/products/${handle}`,
    image: getProductSocialImage(product),
    imageAlt: `${product.title} — imagine produs`,
  });
}

export default async function ProductPage(props: Props) {
  const params = await props.params;
  const region = await getRegion();
  const searchParams = await props.searchParams;

  const selectedVariantId = searchParams.v_id;

  if (!region) {
    notFound();
  }

  const pricedProduct = await listProducts({
    queryParams: { handle: params.handle },
  }).then(({ response }) => response.products[0]);

  if (!pricedProduct) {
    notFound();
  }

  const images = getImagesForVariant(pricedProduct, selectedVariantId);

  return (
    <ProductTemplate product={pricedProduct} region={region} images={images} />
  );
}
