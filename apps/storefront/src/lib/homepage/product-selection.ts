export type ProductCandidate = {
  id: string;
  title: string;
};

const productTypeKey = (title: string): string =>
  title
    .toLocaleLowerCase("ro")
    .split(
      /\s+(?:fără acumulator(?:i)?(?: și încărcător)?|cu acumulator(?:i)?(?: și încărcător)?|cu dyllu|dyllu)\b/i
    )[0]
    .replace(/\s+/g, " ")
    .trim();

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

// Small seeded PRNG (mulberry32) so the shuffle is reproducible for a given
// seed instead of relying on Math.random(), which would re-randomize on
// every request even when the underlying candidate list is cached.
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const shuffledWith = <T>(items: T[], random: () => number): T[] => {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return result;
};

// Deterministic for a given seed: the same candidates + seed always produce
// the same selection, so concurrent requests within a cache generation see
// consistent merchandising instead of a different random pick each time.
export const selectDiverseProductIds = (
  candidates: ProductCandidate[],
  limit: number,
  seed: string
): string[] => {
  const random = seededRandom(hashString(seed));
  const productsByType = new Map<string, ProductCandidate[]>();

  for (const product of candidates) {
    const type = productTypeKey(product.title);
    const group = productsByType.get(type) ?? [];
    group.push(product);
    productsByType.set(type, group);
  }

  const representatives = Array.from(productsByType.values()).map(
    (group) => group[Math.floor(random() * group.length)]
  );

  return shuffledWith(representatives, random)
    .slice(0, limit)
    .map((product) => product.id);
};
