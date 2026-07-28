import { type CategoryNode } from "@lib/data/categories";

export const CATEGORY_NAV_ORDER = [
  "scule-electrice",
  "scule-de-mana",
  "accesorii-si-consumabile-pentru-scule",
  "gradinarit",
  "constructii-si-finisaje",
  "energie-si-electricitate",
  "auto-si-service",
  "compresoare-si-pneumatice",
  "sudura-si-lipire",
  "pompe-si-instalatii",
  "echipamente-de-protectie",
  "atelier-depozitare-si-manipulare",
  "curatenie-si-gospodarie",
  "masurare-si-detectare",
] as const;

export const PRIMARY_CATEGORY_NAV_HANDLES = [
  "scule-electrice",
  "scule-de-mana",
  "accesorii-si-consumabile-pentru-scule",
  "gradinarit",
] as const;

const CATEGORY_NAV_LABELS: Record<string, string> = {
  "accesorii-si-consumabile": "Accesorii",
  "accesorii-si-consumabile-pentru-scule": "Accesorii",
  "echipamente-de-protectie": "Protecție",
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
