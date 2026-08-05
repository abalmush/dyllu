import { defineRouteConfig } from "@medusajs/admin-sdk";
import { ServerStack } from "@medusajs/icons";
import { toast } from "@medusajs/ui";
import { useState } from "react";

type ProbeResult = {
  id: string;
  label: string;
  source: string;
  network: "private" | "public";
  url: string;
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
  error: string | null;
};

type TestResponse = {
  tested_at: string;
  outbound_ip: string | null;
  outbound_ip_error: string | null;
  results: ProbeResult[];
};

function resultLabel(result: ProbeResult) {
  if (result.outcome === "network_error") return "No connection";
  if (result.outcome === "http_error") return "HTTP error";
  return "Connected";
}

function resultDotClass(result: ProbeResult) {
  if (result.outcome === "reachable") return "bg-ui-tag-green-icon";
  if (result.outcome === "http_error") return "bg-ui-tag-orange-icon";
  return "bg-ui-tag-red-icon";
}

function feedSummary(result: ProbeResult) {
  if (result.item_count !== null) return `${result.item_count} items`;
  if (result.batch_count !== null) {
    const total =
      result.items_count === null ? "" : `, ${result.items_count} total items`;
    return `${result.batch_count} batches${total}`;
  }
  if (result.is_json) {
    return result.top_level_keys.length
      ? `JSON: ${result.top_level_keys.join(", ")}`
      : "JSON response";
  }
  if (result.sample_truncated) return "Large response";
  return result.content_type ?? "No response body";
}

function responseSize(result: ProbeResult) {
  if (result.content_length !== null) {
    return `${result.content_length.toLocaleString()} bytes`;
  }
  if (result.sample_bytes > 0) {
    return `${result.sample_bytes.toLocaleString()}${result.sample_truncated ? "+" : ""} bytes`;
  }
  return "—";
}

const OneCConnectionPage = () => {
  const [running, setRunning] = useState(false);
  const [test, setTest] = useState<TestResponse | null>(null);

  const runTest = async () => {
    if (running) return;
    setRunning(true);

    try {
      const response = await fetch("/admin/one-c-connection-test", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error(`Test failed (${response.status})`);

      setTest((await response.json()) as TestResponse);
    } catch (error) {
      toast.error("Could not run the 1C test", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex flex-col gap-y-3">
      <div className="border-ui-border-base bg-ui-bg-base shadow-elevation-card-rest rounded-lg border">
        <div className="flex items-center justify-between gap-4 p-6">
          <div>
            <h1 className="text-ui-fg-base text-xl font-semibold">
              1C connection test
            </h1>
            <p className="text-ui-fg-subtle mt-1 text-sm">
              This read-only test runs from the DYLLU backend. It uses fixed 1C
              URLs from the engineer and the old WooCommerce plug-in.
            </p>
          </div>
          <button
            className="bg-ui-bg-interactive text-ui-fg-on-color rounded-md px-3 py-2 text-sm font-medium disabled:opacity-50"
            disabled={running}
            onClick={runTest}
            type="button"
          >
            {running ? "Testing…" : "Run connection test"}
          </button>
        </div>

        {test && (
          <div
            className="border-ui-border-base border-t p-6"
            aria-live="polite"
          >
            <p className="text-ui-fg-base text-sm font-semibold">
              Backend public IP
            </p>
            <p className="text-ui-fg-base mt-1 font-mono text-lg">
              {test.outbound_ip ?? "Could not detect"}
            </p>
            <p className="text-ui-fg-subtle mt-1 text-sm">
              Give this IP to the 1C engineer for the allowlist. The private
              192.168.99.10 URL also needs a private network route.
            </p>
            {test.outbound_ip_error && (
              <p className="text-ui-fg-error mt-2 text-sm">
                {test.outbound_ip_error}
              </p>
            )}
          </div>
        )}
      </div>

      {test && (
        <div className="border-ui-border-base bg-ui-bg-base shadow-elevation-card-rest overflow-hidden rounded-lg border">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-ui-fg-subtle">
                <tr>
                  <th className="px-4 py-3 font-medium">Endpoint</th>
                  <th className="px-4 py-3 font-medium">Result</th>
                  <th className="px-4 py-3 font-medium">HTTP</th>
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Response</th>
                  <th className="px-4 py-3 font-medium">Feed</th>
                </tr>
              </thead>
              <tbody>
                {test.results.map((result) => (
                  <tr
                    className="border-ui-border-base border-t align-top"
                    key={result.id}
                  >
                    <td className="px-4 py-3">
                      <p className="text-ui-fg-base text-sm font-semibold">
                        {result.label}
                      </p>
                      <p className="text-ui-fg-subtle mt-1 max-w-80 font-mono text-xs break-all">
                        {result.url}
                      </p>
                      <p className="text-ui-fg-muted mt-1 text-xs">
                        {result.source} · {result.network}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-ui-bg-subtle text-ui-fg-subtle border-ui-border-base inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium">
                        <span
                          aria-hidden="true"
                          className={`${resultDotClass(result)} size-2 rounded-sm`}
                        />
                        {resultLabel(result)}
                      </span>
                      {result.error && (
                        <p className="text-ui-fg-subtle mt-1 max-w-48 text-xs">
                          {result.error}
                        </p>
                      )}
                    </td>
                    <td className="text-ui-fg-base px-4 py-3">
                      {result.status_code ?? "—"}
                    </td>
                    <td className="text-ui-fg-base px-4 py-3">
                      {result.elapsed_ms} ms
                    </td>
                    <td className="text-ui-fg-base px-4 py-3">
                      {responseSize(result)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-ui-fg-base max-w-64 text-sm">
                        {feedSummary(result)}
                      </p>
                      {result.preview && (
                        <details className="mt-2 max-w-80">
                          <summary className="text-ui-fg-interactive cursor-pointer text-xs">
                            Show response sample
                          </summary>
                          <pre className="bg-ui-bg-subtle mt-2 max-h-48 overflow-auto rounded p-2 text-xs break-all whitespace-pre-wrap">
                            {result.preview}
                          </pre>
                        </details>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-ui-border-base text-ui-fg-subtle border-t px-6 py-4 text-xs">
            Tested at {new Date(test.tested_at).toLocaleString()}. Each request
            stops after 8 seconds. Response samples stop after 64 KB.
          </p>
        </div>
      )}
    </div>
  );
};

export const config = defineRouteConfig({
  label: "1C connection",
  icon: ServerStack,
});

export default OneCConnectionPage;
