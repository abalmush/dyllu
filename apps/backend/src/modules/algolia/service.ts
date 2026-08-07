import { algoliasearch, type SearchClient } from "algoliasearch";
import { MedusaService } from "@medusajs/framework/utils";

import { AlgoliaSyncState } from "./models";
import type { AlgoliaProductRecord } from "./lib/build-record";

type ModuleOptions = {
  appId: string;
  adminApiKey: string;
  searchApiKey: string;
  indexName: string;
};

type SearchArgs = {
  query?: string;
  categoryIds?: string[];
  onSale?: boolean;
  sort?: "relevance" | "price_asc" | "price_desc" | "created_at";
  page?: number;
  hitsPerPage?: number;
  locale?: string | null;
};

type IndexedHit = {
  title: string;
  description: string;
  title_ru?: string;
  description_ru?: string;
  [key: string]: unknown;
};

function localizeHit(hit: IndexedHit, locale?: string | null) {
  if (!locale?.toLowerCase().startsWith("ru")) return hit;
  return {
    ...hit,
    title: hit.title_ru ?? hit.title,
    description: hit.description_ru ?? hit.description,
  };
}

class AlgoliaModuleService extends MedusaService({
  AlgoliaSyncState,
}) {
  private adminClient: SearchClient;
  private searchClient: SearchClient;
  private indexName: string;

  constructor(container: unknown, options: ModuleOptions) {
    super(container, options);
    this.adminClient = algoliasearch(options.appId, options.adminApiKey);
    this.searchClient = algoliasearch(options.appId, options.searchApiKey);
    this.indexName = options.indexName;
  }

  async getLastSyncedAt(): Promise<Date | null> {
    const [state] = await this.listAlgoliaSyncStates({}, { take: 1 });
    return state?.last_synced_at ?? null;
  }

  async recordSyncCompleted(at: Date): Promise<void> {
    const [state] = await this.listAlgoliaSyncStates({}, { take: 1 });
    if (state) {
      await this.updateAlgoliaSyncStates({
        id: state.id,
        last_synced_at: at,
      });
    } else {
      await this.createAlgoliaSyncStates({ last_synced_at: at });
    }
  }

  async indexData(records: AlgoliaProductRecord[]): Promise<void> {
    if (records.length === 0) return;
    const batches = chunk(records, 50);
    for (const batch of batches) {
      await this.adminClient.saveObjects({
        indexName: this.indexName,
        objects: batch,
      });
    }
  }

  async deleteFromIndex(objectIDs: string[]): Promise<void> {
    if (objectIDs.length === 0) return;
    const batches = chunk(objectIDs, 50);
    for (const batch of batches) {
      await this.adminClient.deleteObjects({
        indexName: this.indexName,
        objectIDs: batch,
      });
    }
  }

  async search({
    query,
    categoryIds,
    onSale,
    sort = "relevance",
    page = 0,
    hitsPerPage = 20,
    locale,
  }: SearchArgs) {
    const indexName =
      sort === "relevance" ? this.indexName : `${this.indexName}_${sort}`;

    const facetFilters: string[][] = [];
    if (categoryIds?.length) {
      facetFilters.push(categoryIds.map((id) => `category_ids:${id}`));
    }
    if (onSale) {
      facetFilters.push(["on_sale:true"]);
    }

    const { results } = await this.searchClient.search({
      requests: [
        {
          indexName,
          query: query ?? "",
          page,
          hitsPerPage,
          facetFilters,
        },
      ],
    });

    const [result] = results;
    if (!result || !("hits" in result)) return result;

    return {
      ...result,
      hits: result.hits.map((hit) =>
        localizeHit(hit as unknown as IndexedHit, locale)
      ),
    };
  }
}

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}

export default AlgoliaModuleService;
