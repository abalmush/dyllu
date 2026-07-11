import { type CategoryNode } from "@lib/data/categories";

export const CATEGORY_NAV_ORDER = [
  "scule-electrice",
  "scule-manuale",
  "consumabile-si-accesorii",
  "gradinarit",
  "auto-si-moto",
  "constructii",
  "electrice",
  "echipament-de-protectie",
  "depozitare",
] as const;

export const PRIMARY_CATEGORY_NAV_HANDLES = [
  "scule-electrice",
  "scule-manuale",
  "consumabile-si-accesorii",
  "gradinarit",
  "constructii",
] as const;

const CATEGORY_NAV_LABELS: Record<string, string> = {
  "consumabile-si-accesorii": "Consumabile",
  "echipament-de-protectie": "Protecție",
};

const ORDER_INDEX = new Map<string, number>(
  CATEGORY_NAV_ORDER.map((handle, index) => [handle, index])
);
const PRIMARY_HANDLES = new Set<string>(PRIMARY_CATEGORY_NAV_HANDLES);

export const getCategoryNavLabel = (category: {
  handle: string;
  name: string;
}): string => CATEGORY_NAV_LABELS[category.handle] ?? category.name;

export const orderCategoriesForNavigation = (
  categories: CategoryNode[]
): CategoryNode[] =>
  [...categories].sort((a, b) => {
    const aIndex = ORDER_INDEX.get(a.handle) ?? Number.MAX_SAFE_INTEGER;
    const bIndex = ORDER_INDEX.get(b.handle) ?? Number.MAX_SAFE_INTEGER;

    if (aIndex !== bIndex) {
      return aIndex - bIndex;
    }

    return a.name.localeCompare(b.name, "ro");
  });

export const getPrimaryCategoriesForNavigation = (
  categories: CategoryNode[]
): CategoryNode[] =>
  orderCategoriesForNavigation(categories).filter((category) =>
    PRIMARY_HANDLES.has(category.handle)
  );

export const getSecondaryCategoriesForNavigation = (
  categories: CategoryNode[]
): CategoryNode[] =>
  orderCategoriesForNavigation(categories).filter(
    (category) => !PRIMARY_HANDLES.has(category.handle)
  );
