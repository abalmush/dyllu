import { Metadata } from "next";
import { notFound } from "next/navigation";

import { getCategoryByHandle, listCategories } from "@lib/data/categories";
import CategoryTemplate from "@modules/categories/templates";
import { SortOptions } from "@modules/store/components/refinement-list/sort-products";

type Props = {
  params: Promise<{ category: string[] }>;
  searchParams: Promise<{
    sortBy?: SortOptions;
    page?: string;
  }>;
};

export async function generateStaticParams() {
  try {
    const product_categories = await listCategories();

    if (!product_categories) {
      return [];
    }

    return product_categories.map((category: any) => ({
      category: [category.handle],
    }));
  } catch (error) {
    console.error(
      `Failed to generate static paths for category pages: ${
        error instanceof Error ? error.message : "Unknown error"
      }.`
    );
    return [];
  }
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  try {
    const productCategory = await getCategoryByHandle(params.category);

    const title = productCategory.name;
    const description =
      productCategory.description ??
      `Descoperă gama DYLLU pentru categoria ${productCategory.name}.`;

    return {
      title,
      description,
      alternates: {
        canonical: `/categories/${params.category.join("/")}`,
      },
    };
  } catch (error) {
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
