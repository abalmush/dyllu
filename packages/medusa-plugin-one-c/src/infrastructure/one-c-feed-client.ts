const ONE_C_BASE_URL = "http://135.181.211.55/polim/hs/WebAPI";
const DEFAULT_TIMEOUT_MS = 25_000;
const DEFAULT_MAX_RESPONSE_BYTES = 20 * 1024 * 1024;
const DEFAULT_MAX_CATALOG_BYTES = 100 * 1024 * 1024;
const DEFAULT_MAX_BATCHES = 1_000;
const DEFAULT_CATALOG_TIMEOUT_MS = 60_000;
const PRODUCT_BRAND_FILTER = "dyllu";

export const ONE_C_ENDPOINTS = Object.freeze({
  productBatches: `${ONE_C_BASE_URL}/pit_site_batches`,
  products: `${ONE_C_BASE_URL}/pit_site_products`,
  categories: `${ONE_C_BASE_URL}/pit_site_categories`,
  brands: `${ONE_C_BASE_URL}/pit_site_brands`,
  promo: `${ONE_C_BASE_URL}/pit_site_promo`,
});

type OneCFetch = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response>;

type OneCFeedClientOptions = {
  fetcher?: OneCFetch;
  timeoutMs?: number;
  maxResponseBytes?: number;
  maxCatalogBytes?: number;
  maxBatches?: number;
  catalogTimeoutMs?: number;
};

export type ProductBatchResponse = {
  batch: number;
  url: string;
  rawBody: string;
  data: { Items: unknown[] };
  statusCode: number;
  elapsedMs: number;
};

type JsonResponse = {
  rawBody: string;
  data: unknown;
  statusCode: number;
  elapsedMs: number;
};

export class OneCFeedError extends Error {
  constructor(
    public readonly code:
      | "network_error"
      | "http_error"
      | "response_too_large"
      | "invalid_json"
      | "invalid_batches"
      | "invalid_items",
    message: string
  ) {
    super(message);
    this.name = "OneCFeedError";
  }
}

export class OneCFeedClient {
  private readonly fetcher: OneCFetch;
  private readonly timeoutMs: number;
  private readonly maxResponseBytes: number;
  private readonly maxCatalogBytes: number;
  private readonly maxBatches: number;
  private readonly catalogTimeoutMs: number;

  constructor(options: OneCFeedClientOptions = {}) {
    this.fetcher = options.fetcher ?? fetch;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxResponseBytes =
      options.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES;
    this.maxCatalogBytes = options.maxCatalogBytes ?? DEFAULT_MAX_CATALOG_BYTES;
    this.maxBatches = options.maxBatches ?? DEFAULT_MAX_BATCHES;
    this.catalogTimeoutMs =
      options.catalogTimeoutMs ?? DEFAULT_CATALOG_TIMEOUT_MS;
  }

  async fetchProducts(): Promise<ProductBatchResponse[]> {
    const { batches } = await this.fetchProductBatches();
    return batches;
  }

  async fetchCatalog() {
    const [products, categories, brands, promo, outboundIp] = await Promise.all(
      [
        this.fetchProductBatches(),
        this.fetchItemsEndpoint(ONE_C_ENDPOINTS.categories, "categories"),
        this.fetchItemsEndpoint(ONE_C_ENDPOINTS.brands, "brands"),
        this.fetchItemsEndpoint(ONE_C_ENDPOINTS.promo, "promo"),
        this.fetchOutboundIp(),
      ]
    );
    const totalBytes = [
      products.batchList,
      ...products.batches,
      categories,
      brands,
      promo,
    ].reduce(
      (total, response) => total + Buffer.byteLength(response.rawBody, "utf8"),
      0
    );
    if (totalBytes > this.maxCatalogBytes) {
      throw new OneCFeedError(
        "response_too_large",
        "1C catalog exceeds the total size limit"
      );
    }

    return {
      outboundIp,
      snapshots: [
        {
          endpoint: "product_batches" as const,
          batch: null,
          url: ONE_C_ENDPOINTS.productBatches,
          ...products.batchList,
        },
        ...products.batches.map((result) => ({
          endpoint: "products" as const,
          batch: result.batch,
          url: result.url,
          rawBody: result.rawBody,
          data: result.data,
          statusCode: result.statusCode,
          elapsedMs: result.elapsedMs,
        })),
        categories,
        brands,
        promo,
      ],
    };
  }

  private async fetchProductBatches() {
    const deadline = Date.now() + this.catalogTimeoutMs;
    const batchesResponse = await this.fetchJson(
      ONE_C_ENDPOINTS.productBatches,
      this.remainingTime(deadline)
    );
    const batchNumbers = parseBatches(batchesResponse.data, this.maxBatches);
    const results: ProductBatchResponse[] = [];
    let totalBytes = Buffer.byteLength(batchesResponse.rawBody, "utf8");

    for (const batch of batchNumbers) {
      const query = new URLSearchParams({
        batch: String(batch),
        brand: PRODUCT_BRAND_FILTER,
      });
      const url = `${ONE_C_ENDPOINTS.products}?${query.toString()}`;
      const response = await this.fetchJson(url, this.remainingTime(deadline));
      totalBytes += Buffer.byteLength(response.rawBody, "utf8");
      if (totalBytes > this.maxCatalogBytes) {
        throw new OneCFeedError(
          "response_too_large",
          "1C catalog exceeds the total size limit"
        );
      }
      if (!isRecord(response.data) || !Array.isArray(response.data.Items)) {
        throw new OneCFeedError(
          "invalid_items",
          `1C product batch ${batch} has no Items array`
        );
      }
      results.push({
        batch,
        url,
        rawBody: response.rawBody,
        data: { Items: response.data.Items },
        statusCode: response.statusCode,
        elapsedMs: response.elapsedMs,
      });
    }

    return { batchList: batchesResponse, batches: results };
  }

  private async fetchItemsEndpoint(
    url: string,
    endpoint: "categories" | "brands" | "promo"
  ) {
    const response = await this.fetchJson(url);
    if (!isRecord(response.data) || !Array.isArray(response.data.Items)) {
      throw new OneCFeedError(
        "invalid_items",
        `1C ${endpoint} feed has no Items array`
      );
    }
    return {
      endpoint,
      batch: null,
      url,
      ...response,
    };
  }

  private async fetchJson(
    url: string,
    timeoutMs = this.timeoutMs
  ): Promise<JsonResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      Math.min(this.timeoutMs, timeoutMs)
    );
    const startedAt = Date.now();
    let response: Response;
    try {
      response = await this.fetcher(url, {
        method: "GET",
        redirect: "error",
        signal: controller.signal,
        headers: { accept: "application/json" },
      });
    } catch (error) {
      throw new OneCFeedError(
        "network_error",
        error instanceof Error ? error.message : "1C request failed"
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new OneCFeedError(
        "http_error",
        `1C returned HTTP ${response.status}`
      );
    }
    const contentLength = Number(response.headers.get("content-length"));
    if (
      Number.isFinite(contentLength) &&
      contentLength > this.maxResponseBytes
    ) {
      throw new OneCFeedError(
        "response_too_large",
        "1C response exceeds the configured size limit"
      );
    }

    const rawBody = await response.text();
    if (Buffer.byteLength(rawBody, "utf8") > this.maxResponseBytes) {
      throw new OneCFeedError(
        "response_too_large",
        "1C response exceeds the configured size limit"
      );
    }
    try {
      return {
        rawBody,
        data: JSON.parse(rawBody) as unknown,
        statusCode: response.status,
        elapsedMs: Date.now() - startedAt,
      };
    } catch {
      throw new OneCFeedError("invalid_json", "1C returned invalid JSON");
    }
  }

  private remainingTime(deadline: number) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      throw new OneCFeedError(
        "network_error",
        "1C catalog request exceeded the total timeout"
      );
    }
    return remaining;
  }

  private async fetchOutboundIp() {
    try {
      const response = await this.fetcher("https://api.ipify.org?format=json", {
        method: "GET",
        redirect: "error",
        signal: AbortSignal.timeout(Math.min(this.timeoutMs, 8_000)),
        headers: { accept: "application/json" },
      });
      if (!response.ok) return null;
      const data = (await response.json()) as { ip?: unknown };
      return typeof data.ip === "string" ? data.ip : null;
    } catch {
      return null;
    }
  }
}

function parseBatches(input: unknown, maxBatches: number) {
  if (!isRecord(input)) {
    throw new OneCFeedError("invalid_batches", "Invalid 1C batch response");
  }
  const raw = Array.isArray(input.Batches)
    ? input.Batches
    : Array.isArray(input.batches)
      ? input.batches
      : null;
  if (!raw || raw.length === 0 || raw.length > maxBatches) {
    throw new OneCFeedError(
      "invalid_batches",
      "1C batch response has an invalid batch count"
    );
  }

  const batches = raw.map((entry) => {
    if (!isRecord(entry)) return null;
    const number = Number(entry.batch ?? entry.Batch);
    return Number.isSafeInteger(number) && number > 0 ? number : null;
  });
  if (batches.some((batch) => batch === null)) {
    throw new OneCFeedError(
      "invalid_batches",
      "1C batch response contains an invalid batch number"
    );
  }
  return [...new Set(batches as number[])];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
