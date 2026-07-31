import { getLocaleHeader } from "@lib/util/get-locale-header";
import Medusa, { FetchArgs, FetchInput } from "@medusajs/js-sdk";

const MEDUSA_BACKEND_URL =
  process.env.MEDUSA_BACKEND_URL ||
  process.env.NEXT_PUBLIC_MEDUSA_URL ||
  "http://localhost:9000";

export const sdk = new Medusa({
  baseUrl: MEDUSA_BACKEND_URL,
  debug: process.env.NODE_ENV === "development",
  publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
});

const originalFetch = sdk.client.fetch.bind(sdk.client);

const SLOW_REQUEST_THRESHOLD_MS = 500;

// Replaces path segments that look like Medusa IDs (prefix_ULID, e.g.
// cart_01ABC...) with :id so slow-request logs never carry cart/customer/
// order identifiers, cookies, or request/response bodies.
function redactPath(path: string): string {
  const [pathname] = path.split("?");
  return pathname.replace(/\/[a-z]+_[A-Za-z0-9]+/gi, "/:id");
}

sdk.client.fetch = async <T>(
  input: FetchInput,
  init?: FetchArgs
): Promise<T> => {
  const headers = init?.headers ?? {};
  let localeHeader: Record<string, string | null> | undefined;
  try {
    localeHeader = await getLocaleHeader();
    headers["x-medusa-locale"] ??= localeHeader["x-medusa-locale"];
  } catch {}

  const newHeaders = {
    ...localeHeader,
    ...headers,
  };
  const TIMEOUT_MS = 12_000;
  const timeoutSignal = AbortSignal.timeout(TIMEOUT_MS);
  const signal = init?.signal
    ? AbortSignal.any([init.signal, timeoutSignal])
    : timeoutSignal;

  init = {
    ...init,
    headers: newHeaders,
    signal,
  };

  const route = redactPath(typeof input === "string" ? input : String(input));
  const method = init?.method ?? "GET";
  const cacheMode = init?.cache ?? "default";
  const startedAt = performance.now();

  try {
    const result = await originalFetch<T>(input, init);
    const duration = performance.now() - startedAt;
    if (duration >= SLOW_REQUEST_THRESHOLD_MS) {
      console.warn("[medusa] slow request", {
        route,
        method,
        cacheMode,
        durationMs: Math.round(duration),
        status: "ok",
      });
    }
    return result;
  } catch (error) {
    const duration = performance.now() - startedAt;
    const status =
      typeof error === "object" && error && "status" in error
        ? (error as { status: unknown }).status
        : undefined;

    // AbortSignal.timeout throws a getter-only DOMException (TimeoutError).
    // If it propagates unwrapped, downstream code that reassigns `.message`
    // crashes with "Cannot set property message", masking the real cause.
    // Re-throw as a plain Error with a clear, debuggable message so a slow or
    // unreachable Medusa backend surfaces honestly instead of an opaque 500.
    if (
      error instanceof DOMException &&
      (error.name === "TimeoutError" || error.name === "AbortError")
    ) {
      console.warn("[medusa] request timed out", {
        route,
        method,
        cacheMode,
        durationMs: Math.round(duration),
        errorClass: "timeout",
      });
      throw new Error(
        `Medusa request timed out after ${TIMEOUT_MS}ms (backend slow or unreachable): ${route}`
      );
    }

    console.warn("[medusa] request failed", {
      route,
      method,
      cacheMode,
      durationMs: Math.round(duration),
      status,
    });
    throw error;
  }
};
