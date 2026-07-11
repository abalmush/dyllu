import { Metadata } from "next";
import { notFound } from "next/navigation";

import { getCollectionByHandle } from "@lib/data/collections";
import { StoreCollection } from "@medusajs/types";
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
  const collection = await getCollectionByHandle(params.handle).catch(
    () => null
  );

  if (!collection) {
    notFound();
  }

  return {
    title: collection.title,
    description: `Explorează selecția DYLLU din colecția ${collection.title}.`,
  } as Metadata;
}

export default async function CollectionPage(props: Props) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const { sortBy, page } = searchParams;

  const collection = await getCollectionByHandle(params.handle)
    .then((collection: StoreCollection) => collection)
    .catch(() => null);

  if (!collection) {
    notFound();
  }

  return (
    <CollectionTemplate collection={collection} page={page} sortBy={sortBy} />
  );
}
