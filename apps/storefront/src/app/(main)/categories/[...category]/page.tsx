import { Metadata } from "next";
import { notFound } from "next/navigation";

import { getCategoryByHandle } from "@lib/data/categories";
import { listProducts } from "@lib/data/products";
import { buildSocialMetadata, getProductSocialImage } from "@/lib/seo/metadata";
import CategoryTemplate from "@modules/categories/templates";
import { SortOptions } from "@modules/store/components/refinement-list/sort-products";

type Props = {
  params: Promise<{ category: string[] }>;
  searchParams: Promise<{
    sortBy?: SortOptions;
    page?: string;
  }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  try {
    const productCategory = await getCategoryByHandle(params.category);

    const title = productCategory.name;
    const description =
      productCategory.description?.trim() ||
      `Descoperă gama DYLLU pentru categoria ${productCategory.name}.`;
    const categoryIds = [
      productCategory.id,
      ...(productCategory.category_children ?? []).map((child) => child.id),
    ];
    const previewProduct = await listProducts({
      queryParams: {
        category_id: categoryIds,
        fields: "title,thumbnail,*images",
        limit: 1,
      },
    })
      .then(({ response }) => response.products[0])
      .catch(() => undefined);

    return buildSocialMetadata({
      title,
      description,
      path: `/categories/${params.category.join("/")}`,
      image: getProductSocialImage(previewProduct),
      imageAlt: `${productCategory.name} — scule și echipamente DYLLU`,
    });
  } catch {
    notFound();
  }
}

export default async function CategoryPage(props: Props) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const { sortBy, page } = searchParams;

  const productCategory = await getCategoryByHandle(params.category).catch(
    () => null
  );

  if (!productCategory) {
    notFound();
  }

  return (
    <CategoryTemplate category={productCategory} sortBy={sortBy} page={page} />
  );
}
