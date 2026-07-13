import { Metadata } from "next";

import { buildSocialMetadata } from "@/lib/seo/metadata";
import { SortOptions } from "@modules/store/components/refinement-list/sort-products";
import StoreTemplate from "@modules/store/templates";

export const metadata: Metadata = buildSocialMetadata({
  title: "Magazin",
  description:
    "Explorează gama completă de scule, accesorii și echipamente DYLLU.",
  path: "/store",
  imageAlt: "Catalogul de scule și echipamente DYLLU",
});

type Params = {
  searchParams: Promise<{
    sortBy?: SortOptions;
    page?: string;
    q?: string;
    on_sale?: string;
  }>;
};

export default async function StorePage(props: Params) {
  const searchParams = await props.searchParams;
  const { sortBy, page, q, on_sale } = searchParams;

  return (
    <StoreTemplate
      sortBy={sortBy}
      page={page}
      query={q}
      onSale={on_sale === "true"}
    />
  );
}
