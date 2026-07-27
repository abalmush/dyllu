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

  try {
    return await originalFetch<T>(input, init);
  } catch (error) {
    // AbortSignal.timeout throws a getter-only DOMException (TimeoutError).
    // If it propagates unwrapped, downstream code that reassigns `.message`
    // crashes with "Cannot set property message", masking the real cause.
    // Re-throw as a plain Error with a clear, debuggable message so a slow or
    // unreachable Medusa backend surfaces honestly instead of an opaque 500.
    if (
      error instanceof DOMException &&
      (error.name === "TimeoutError" || error.name === "AbortError")
    ) {
      const path = typeof input === "string" ? input : String(input);
      throw new Error(
        `Medusa request timed out after ${TIMEOUT_MS}ms (backend slow or unreachable): ${path}`
      );
    }
    throw error;
  }
};
