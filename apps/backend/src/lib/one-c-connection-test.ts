const REQUEST_TIMEOUT_MS = 8_000;
const RESPONSE_SAMPLE_LIMIT = 64 * 1024;
const EGRESS_IP_URL = "https://api.ipify.org?format=json";

type OneCFetch = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response>;

type OneCTarget = {
  id: string;
  label: string;
  source: "Engineer" | "Old WooCommerce plug-in";
  network: "private" | "public";
  url: string;
};

export type OneCProbeResult = OneCTarget & {
  outcome: "reachable" | "http_error" | "network_error";
  status_code: number | null;
  elapsed_ms: number;
  content_type: string | null;
  content_length: number | null;
  sample_bytes: number;
  sample_truncated: boolean;
  preview: string | null;
  is_json: boolean;
  top_level_keys: string[];
  item_count: number | null;
  batch_count: number | null;
  items_count: number | null;
  first_batch: number | null;
  error: string | null;
};

export type OneCConnectionTestResponse = {
  tested_at: string;
  outbound_ip: string | null;
  outbound_ip_error: string | null;
  results: OneCProbeResult[];
};

const ONE_C_TARGETS: OneCTarget[] = [
  {
    id: "engineer-private-test",
    label: "Engineer private test",
    source: "Engineer",
    network: "private",
    url: "http://192.168.99.10/polim/hs/WebAPI/test",
  },
  {
    id: "engineer-public-test",
    label: "Engineer public test",
    source: "Engineer",
    network: "public",
    url: "http://135.181.211.55/polim/hs/WebAPI/test",
  },
  {
    id: "plugin-products-test",
    label: "Plug-in product test feed",
    source: "Old WooCommerce plug-in",
    network: "public",
    url: "http://135.181.211.55/polim/hs/WebAPI/pit_site_test",
  },
  {
    id: "plugin-batches",
    label: "Plug-in batch list",
    source: "Old WooCommerce plug-in",
    network: "public",
    url: "http://135.181.211.55/polim/hs/WebAPI/pit_site_batches",
  },
  {
    id: "plugin-categories",
    label: "Plug-in category feed",
    source: "Old WooCommerce plug-in",
    network: "public",
    url: "http://135.181.211.55/polim/hs/WebAPI/pit_site_categories",
  },
  {
    id: "plugin-brands",
    label: "Plug-in brand feed",
    source: "Old WooCommerce plug-in",
    network: "public",
    url: "http://135.181.211.55/polim/hs/WebAPI/pit_site_brands",
  },
  {
    id: "plugin-promo",
    label: "Plug-in promotion feed",
    source: "Old WooCommerce plug-in",
    network: "public",
    url: "http://135.181.211.55/polim/hs/WebAPI/pit_site_promo",
  },
];

function numericHeader(value: string | null) {
  if (!value || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

async function readResponseSample(response: Response) {
  if (!response.body) {
    return { text: "", bytes: 0, truncated: false };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  let bytes = 0;
  let reachedEnd = false;

  while (bytes < RESPONSE_SAMPLE_LIMIT) {
    const chunk = await reader.read();
    if (chunk.done) {
      reachedEnd = true;
      break;
    }

    const remaining = RESPONSE_SAMPLE_LIMIT - bytes;
    const value = chunk.value.subarray(0, remaining);
    bytes += value.byteLength;
    text += decoder.decode(value, { stream: true });

    if (value.byteLength < chunk.value.byteLength) break;
  }

  const contentLength = numericHeader(response.headers.get("content-length"));
  const truncated = contentLength
    ? contentLength > bytes
    : !reachedEnd && bytes === RESPONSE_SAMPLE_LIMIT;

  if (!reachedEnd) await reader.cancel();
  text += decoder.decode();

  return { text, bytes, truncated };
}

function sanitizePreview(value: string) {
  const preview = value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ")
    .trim()
    .slice(0, 2_000);
  return preview || null;
}

function recordValue(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function integerValue(value: unknown) {
  if (typeof value === "number" && Number.isSafeInteger(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  return null;
}

function inspectJson(text: string, truncated: boolean) {
  const empty = {
    is_json: false,
    top_level_keys: [] as string[],
    item_count: null as number | null,
    batch_count: null as number | null,
    items_count: null as number | null,
    first_batch: null as number | null,
  };

  if (truncated) return empty;
  const normalized = text.replace(/^\uFEFF/, "").trim();
  if (!normalized) return empty;

  try {
    const parsed = JSON.parse(normalized) as unknown;
    const record = recordValue(parsed);
    if (!record) return { ...empty, is_json: true };

    const items = Array.isArray(record.Items) ? record.Items : null;
    const batches = Array.isArray(record.Batches)
      ? record.Batches
      : Array.isArray(record.batches)
        ? record.batches
        : null;
    const firstBatchRecord = batches?.map(recordValue).find(Boolean) ?? null;

    return {
      is_json: true,
      top_level_keys: Object.keys(record).slice(0, 20),
      item_count: items?.length ?? null,
      batch_count: batches?.length ?? null,
      items_count: integerValue(record.ItemsCount),
      first_batch: firstBatchRecord
        ? integerValue(firstBatchRecord.batch)
        : null,
    };
  } catch {
    return empty;
  }
}

function errorMessage(error: unknown) {
  if (!(error instanceof Error)) return "Unknown network error";
  if (error.name === "AbortError" || error.name === "TimeoutError") {
    return `Timed out after ${REQUEST_TIMEOUT_MS} ms`;
  }
  return error.message.slice(0, 500);
}

export async function probeOneCEndpoint(
  target: OneCTarget,
  fetcher: OneCFetch = fetch
): Promise<OneCProbeResult> {
  const startedAt = performance.now();

  try {
    const response = await fetcher(target.url, {
      method: "GET",
      headers: { Accept: "application/json, text/plain;q=0.9, */*;q=0.1" },
      redirect: "manual",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const sample = await readResponseSample(response);
    const json = inspectJson(sample.text, sample.truncated);

    return {
      ...target,
      outcome: response.ok ? "reachable" : "http_error",
      status_code: response.status,
      elapsed_ms: Math.round(performance.now() - startedAt),
      content_type: response.headers.get("content-type"),
      content_length: numericHeader(response.headers.get("content-length")),
      sample_bytes: sample.bytes,
      sample_truncated: sample.truncated,
      preview: sanitizePreview(sample.text),
      ...json,
      error: response.ok ? null : `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      ...target,
      outcome: "network_error",
      status_code: null,
      elapsed_ms: Math.round(performance.now() - startedAt),
      content_type: null,
      content_length: null,
      sample_bytes: 0,
      sample_truncated: false,
      preview: null,
      is_json: false,
      top_level_keys: [],
      item_count: null,
      batch_count: null,
      items_count: null,
      first_batch: null,
      error: errorMessage(error),
    };
  }
}

async function findOutboundIp(fetcher: OneCFetch) {
  try {
    const response = await fetcher(EGRESS_IP_URL, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const payload = (await response.json()) as { ip?: unknown };
    if (
      typeof payload.ip !== "string" ||
      payload.ip.length > 64 ||
      !/^[0-9a-f:.]+$/i.test(payload.ip)
    ) {
      throw new Error("The IP service returned an invalid value");
    }

    return { ip: payload.ip, error: null };
  } catch (error) {
    return { ip: null, error: errorMessage(error) };
  }
}

export async function runOneCConnectionTest(
  fetcher: OneCFetch = fetch
): Promise<OneCConnectionTestResponse> {
  const [baseResults, outboundIp] = await Promise.all([
    Promise.all(
      ONE_C_TARGETS.map((target) => probeOneCEndpoint(target, fetcher))
    ),
    findOutboundIp(fetcher),
  ]);

  const batchResult = baseResults.find(
    (result) => result.id === "plugin-batches"
  );
  const results = [...baseResults];

  if (batchResult?.first_batch) {
    const productsUrl = new URL(
      "http://135.181.211.55/polim/hs/WebAPI/pit_site_products"
    );
    productsUrl.searchParams.set("batch", String(batchResult.first_batch));
    results.push(
      await probeOneCEndpoint(
        {
          id: "plugin-products-batch",
          label: `Plug-in product batch ${batchResult.first_batch}`,
          source: "Old WooCommerce plug-in",
          network: "public",
          url: productsUrl.toString(),
        },
        fetcher
      )
    );
  }

  return {
    tested_at: new Date().toISOString(),
    outbound_ip: outboundIp.ip,
    outbound_ip_error: outboundIp.error,
    results,
  };
}
