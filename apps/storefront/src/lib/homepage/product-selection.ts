import type { HttpTypes } from "@medusajs/types";

const productTypeKey = (title: string): string =>
  title
    .toLocaleLowerCase("ro")
    .split(
      /\s+(?:fără acumulator(?:i)?(?: și încărcător)?|cu acumulator(?:i)?(?: și încărcător)?|cu dyllu|dyllu)\b/i
    )[0]
    .replace(/\s+/g, " ")
    .trim();

const shuffled = <T>(items: T[]): T[] => {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return result;
};

export const selectDiverseProducts = (
  products: HttpTypes.StoreProduct[],
  limit: number
): HttpTypes.StoreProduct[] => {
  const productsByType = new Map<string, HttpTypes.StoreProduct[]>();

  for (const product of products) {
    const type = productTypeKey(product.title);
    const group = productsByType.get(type) ?? [];
    group.push(product);
    productsByType.set(type, group);
  }

  return shuffled(
    Array.from(productsByType.values()).map(
      (group) => group[Math.floor(Math.random() * group.length)]
    )
  ).slice(0, limit);
};
