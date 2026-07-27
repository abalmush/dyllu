import { ExecArgs, RemoteQueryFunction } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import {
  createCollectionsWorkflow,
  updateCollectionsWorkflow,
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows";

import { revalidateStorefront } from "./_revalidate";
import {
  isBatteryTool,
  type BatteryCollectionProduct,
} from "./lib/battery-tool-collection";

const HANDLE = "scule-cu-acumulator";
const TITLE = "Scule cu acumulator";
const DESCRIPTION =
  "Scule DYLLU cu acumulator integrat sau detașabil pentru lucru fără cablu.";
const CONFIRMATION = "SYNC_BATTERY_TOOL_COLLECTION";

type ProductRow = BatteryCollectionProduct & {
  id: string;
  title: string;
  collection_id: string | null;
};

export default async function dylluSyncBatteryToolCollection({
  container,
  args,
}: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as Omit<
    RemoteQueryFunction,
    symbol
  >;
  const confirmed = (args ?? [])
    .map((arg) => arg.replace(/^--/, ""))
    .includes(`confirm=${CONFIRMATION}`);

  const [{ data: collections }, { data: productData }] = await Promise.all([
    query.graph({
      entity: "product_collection",
      fields: ["id", "handle", "title", "metadata"],
      filters: { handle: HANDLE },
    }),
    query.graph({
      entity: "product",
      fields: ["id", "title", "collection_id", "metadata", "variants.metadata"],
      pagination: { skip: 0, take: 5000 },
    }),
  ]);
  const products = productData as ProductRow[];
  const targets = products.filter(isBatteryTool);
  const existingCollection = collections[0] as
    | { id: string; title: string; metadata?: Record<string, unknown> | null }
    | undefined;
  const conflicting = targets.filter(
    (product) =>
      product.collection_id && product.collection_id !== existingCollection?.id
  );
  if (conflicting.length > 0) {
    throw new Error(
      `[battery-collection] ${conflicting.length} battery tools already belong to another collection: ${conflicting
        .slice(0, 10)
        .map((product) => product.title)
        .join(", ")}`
    );
  }

  const stale = existingCollection
    ? products.filter(
        (product) =>
          product.collection_id === existingCollection.id &&
          !isBatteryTool(product)
      )
    : [];
  logger.info(
    `[battery-collection] ${targets.length} battery tools; ${stale.length} stale members`
  );
  if (!confirmed) {
    logger.info(
      `[battery-collection] DRY RUN — pass confirm=${CONFIRMATION} to apply`
    );
    return;
  }

  let collectionId = existingCollection?.id;
  if (!collectionId) {
    const { result } = await createCollectionsWorkflow(container).run({
      input: {
        collections: [
          {
            title: TITLE,
            handle: HANDLE,
            metadata: { description: DESCRIPTION, managed_by: "catalog-sync" },
          },
        ],
      },
    });
    collectionId = result[0]?.id;
    if (!collectionId)
      throw new Error("[battery-collection] collection creation failed");
  } else {
    await updateCollectionsWorkflow(container).run({
      input: {
        selector: { id: collectionId },
        update: {
          title: TITLE,
          handle: HANDLE,
          metadata: { description: DESCRIPTION, managed_by: "catalog-sync" },
        },
      },
    });
  }

  const updates = [
    ...targets
      .filter((product) => product.collection_id !== collectionId)
      .map((product) => ({ id: product.id, collection_id: collectionId })),
    ...stale.map((product) => ({ id: product.id, collection_id: null })),
  ];
  for (let index = 0; index < updates.length; index += 50) {
    await updateProductsWorkflow(container).run({
      input: { products: updates.slice(index, index + 50) },
    });
  }
  logger.info(
    `[battery-collection] collection ${HANDLE} synchronized with ${targets.length} products`
  );
  await revalidateStorefront(logger);
}
