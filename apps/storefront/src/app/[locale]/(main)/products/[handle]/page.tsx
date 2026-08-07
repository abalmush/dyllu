import { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { listProducts } from "@lib/data/products";
import { getRegion } from "@lib/data/regions";
import { buildSocialMetadata, getProductSocialImage } from "@/lib/seo/metadata";
import ProductTemplate from "@modules/products/templates";
import {
  getSelectedVariant,
  getVariantDescription,
  getVariantDisplayTitle,
  getVariantImages,
  getVariantImageUrl,
} from "@modules/products/lib/product-presentation";

type Props = {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ v_id?: string }>;
};

export const dynamic = "force-dynamic";

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

  const selectedVariant = getSelectedVariant(product);
  const title = getVariantDisplayTitle(product, selectedVariant);
  const description = getVariantDescription(product, selectedVariant);
  const image = getVariantImageUrl(product, selectedVariant);
  const productPath = `/products/${handle}`;

  return buildSocialMetadata({
    title,
    description,
    fallbackDescription: `${title} disponibil la DYLLU. Comandă online cu livrare rapidă în toată Moldova.`,
    path: productPath,
    image: image ?? getProductSocialImage(product),
    imageAlt: `${title} — imagine produs`,
  });
}

export default async function ProductPage(props: Props) {
  const [params, searchParams] = await Promise.all([
    props.params,
    props.searchParams,
  ]);

  const region = await getRegion();

  if (!region) {
    notFound();
  }

  const pricedProduct = await listProducts({
    queryParams: { handle: params.handle },
  }).then(({ response }) => response.products[0]);

  if (!pricedProduct) {
    notFound();
  }

  const requestedVariantId =
    typeof searchParams.v_id === "string" ? searchParams.v_id : undefined;
  if (requestedVariantId && (pricedProduct.variants?.length ?? 0) <= 1) {
    permanentRedirect(`/products/${params.handle}`);
  }

  const selectedVariant = getSelectedVariant(pricedProduct, requestedVariantId);
  const images = getVariantImages(pricedProduct, selectedVariant);

  return (
    <ProductTemplate
      product={pricedProduct}
      region={region}
      images={images}
      selectedVariant={selectedVariant}
    />
  );
}
