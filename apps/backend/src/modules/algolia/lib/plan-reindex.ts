export type ReindexInput = {
  id: string;
  updatedAt: Date;
  deletedAt: Date | null;
  variants: {
    updatedAt: Date;
    prices: { updatedAt: Date }[];
  }[];
};

export type ReindexPlan<T extends ReindexInput> = {
  toUpsert: T[];
  toDelete: T[];
};

export function planReindex<T extends ReindexInput>(
  products: T[],
  lastSyncedAt: Date
): ReindexPlan<T> {
  const toUpsert: T[] = [];
  const toDelete: T[] = [];

  for (const product of products) {
    if (product.deletedAt) {
      if (product.deletedAt > lastSyncedAt) toDelete.push(product);
      continue;
    }

    const timestamps = [
      product.updatedAt,
      ...product.variants.map((v) => v.updatedAt),
      ...product.variants.flatMap((v) => v.prices.map((p) => p.updatedAt)),
    ];
    const changedAt = timestamps.reduce((latest, current) =>
      current > latest ? current : latest
    );

    if (changedAt > lastSyncedAt) toUpsert.push(product);
  }

  return { toUpsert, toDelete };
}
