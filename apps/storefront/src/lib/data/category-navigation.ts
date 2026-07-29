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

const CHILD_CATEGORY_NAV_ORDER: Record<string, readonly string[]> = {
  "scule-electrice": [
    "seturi-de-scule-electrice",
    "masini-de-gaurit-si-insurubat",
    "polizoare",
    "ciocane-rotopercutoare-si-demolatoare",
    "capsatoare-si-pistoale-de-cuie",
    "chei-si-surubelnite-cu-impact",
    "unelte-multifunctionale",
    "scule-electrice-pentru-gresie-si-beton",
    "pistoale-cu-aer-cald",
    "freze-rindele-si-masini-de-gravat",
    "masini-de-slefuit",
    "ferastraie-electrice",
    "masurare-laser-si-nivele",
    "masurare-si-trasare",
    "masini-de-lustruit",
    "ventilatoare-si-incalzitoare",
    "pistoale-electrice-de-vopsit",
  ],
  "scule-de-mana": [
    "truse-si-seturi",
    "truse-si-seturi-de-scule",
    "capsatoare-si-nituitoare-manuale",
  ],
};

const toNavigationKey = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const getChildOrderIndex = (
  category: CategoryNode,
  order: readonly string[]
): number => {
  const handleIndex = order.indexOf(category.handle);
  if (handleIndex !== -1) return handleIndex;

  return order.indexOf(toNavigationKey(category.name));
};

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

export const orderChildCategoriesForNavigation = (
  category: CategoryNode
): CategoryNode[] => {
  const order = CHILD_CATEGORY_NAV_ORDER[category.handle];
  if (!order) return category.children;

  return category.children
    .map((child, originalIndex) => ({
      child,
      originalIndex,
      orderIndex: getChildOrderIndex(child, order),
    }))
    .sort((a, b) => {
      const aIndex =
        a.orderIndex === -1 ? Number.MAX_SAFE_INTEGER : a.orderIndex;
      const bIndex =
        b.orderIndex === -1 ? Number.MAX_SAFE_INTEGER : b.orderIndex;

      return aIndex - bIndex || a.originalIndex - b.originalIndex;
    })
    .map(({ child }) => child);
};
