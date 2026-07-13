import { Metadata } from "next";
import { notFound } from "next/navigation";

import { getCollectionByHandle } from "@lib/data/collections";
import { listProducts } from "@lib/data/products";
import { buildSocialMetadata, getProductSocialImage } from "@/lib/seo/metadata";
import CollectionTemplate from "@modules/collections/templates";
import { SortOptions } from "@modules/store/components/refinement-list/sort-products";

type Props = {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{
    page?: string;
    sortBy?: SortOptions;
  }>;
};

export const PRODUCT_LIMIT = 12;

export const dynamic = "force-dynamic";

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const collection = await getCollectionByHandle(params.handle);

  if (!collection) {
    notFound();
  }

  const previewProduct = await listProducts({
    queryParams: {
      collection_id: [collection.id],
      fields: "title,thumbnail,*images",
      limit: 1,
    },
  })
    .then(({ response }) => response.products[0])
    .catch(() => undefined);

  const collectionDescription =
    typeof collection.metadata?.description === "string"
      ? collection.metadata.description
      : undefined;

  return buildSocialMetadata({
    title: collection.title,
    description: collectionDescription,
    fallbackDescription: `Explorează selecția DYLLU din colecția ${collection.title}.`,
    path: `/collections/${params.handle}`,
    image: getProductSocialImage(previewProduct),
    imageAlt: `${collection.title} — colecție DYLLU`,
  });
}

export default async function CollectionPage(props: Props) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const { sortBy, page } = searchParams;

  const collection = await getCollectionByHandle(params.handle);

  if (!collection) {
    notFound();
  }

  return (
    <CollectionTemplate collection={collection} page={page} sortBy={sortBy} />
  );
}
