import { defineRouteConfig } from "@medusajs/admin-sdk";
import { ServerStack } from "@medusajs/icons";
import {
  Alert,
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Table,
  Tabs,
  Text,
  toast,
} from "@medusajs/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

type MappingStatus = "matched" | "missing_medusa" | "ambiguous" | "excluded";

type SyncCounts = {
  total: number;
  matched: number;
  missingMedusa: number;
  ambiguous: number;
  excluded: number;
  invalid: number;
  changed: number;
};

type SyncRun = {
  id: string;
  trigger: "manual" | "mcp";
  status: "fetching" | "ready" | "failed";
  transport_trusted: false;
  outbound_ip: string | null;
  counts: SyncCounts | null;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
};

type SyncItem = {
  id: string;
  external_id: string;
  sku: string;
  name: string;
  mapping_status: MappingStatus;
  preparation_status: string;
  medusa_product_title: string | null;
  regular_price_mdl: number | null;
  sale_price_mdl: number | null;
  sale_starts_at: string | null;
  sale_ends_at: string | null;
  balance: number | null;
  brand_external_id: string | null;
  suggested_medusa_sku: string | null;
  differences: {
    fields?: Array<{
      field: string;
      before?: string | number | boolean | null;
      proposed?: string | number | boolean | null;
    }>;
    issue?: string;
  };
  hidden: boolean;
  deleted: boolean;
};

type RunsResponse = { runs: SyncRun[]; count: number };
type ItemsResponse = { items: SyncItem[]; count: number };

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: "include", ...init });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new Error(body?.message ?? `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

function StatusBadge({ status }: { status: MappingStatus }) {
  const label = {
    matched: "On site",
    missing_medusa: "Missing from DYLLU",
    ambiguous: "Needs mapping",
    excluded: "Hidden or deleted",
  }[status];
  const color = {
    matched: "green",
    missing_medusa: "orange",
    ambiguous: "red",
    excluded: "grey",
  }[status] as "green" | "orange" | "red" | "grey";
  return <Badge color={color}>{label}</Badge>;
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border-ui-border-base rounded-lg border p-4">
      <Text size="small" className="text-ui-fg-subtle">
        {label}
      </Text>
      <Text size="xlarge" weight="plus" className="mt-1">
        {value}
      </Text>
    </div>
  );
}

const OneCConnectionPage = () => {
  const pageSize = 50;
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<MappingStatus | "all">("missing_medusa");
  const [page, setPage] = useState(0);
  const [mappingSkus, setMappingSkus] = useState<Record<string, string>>({});
  const runsQuery = useQuery({
    queryKey: ["one-c-sync", "runs"],
    queryFn: () =>
      requestJson<RunsResponse>("/admin/one-c-sync/runs?limit=25&offset=0"),
  });
  const latestRun = runsQuery.data?.runs[0] ?? null;
  const itemsUrl = useMemo(() => {
    if (!latestRun) return null;
    const status = filter === "all" ? "" : `&mapping_status=${filter}`;
    return `/admin/one-c-sync/runs/${latestRun.id}/items?limit=${pageSize}&offset=${page * pageSize}${status}`;
  }, [filter, latestRun, page]);
  const itemsQuery = useQuery({
    queryKey: ["one-c-sync", "items", latestRun?.id, filter, page],
    queryFn: () => requestJson<ItemsResponse>(itemsUrl!),
    enabled: Boolean(itemsUrl),
  });
  const saveMapping = useMutation({
    mutationFn: ({
      itemId,
      medusaSku,
    }: {
      itemId: string;
      medusaSku: string;
    }) =>
      requestJson<{ mapping: { medusa_sku: string } }>(
        "/admin/one-c-sync/mappings",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sync_item_id: itemId, medusa_sku: medusaSku }),
        }
      ),
    onSuccess: () =>
      toast.success("Mapping saved. Receive fresh data to compare prices."),
    onError: (error) =>
      toast.error("Could not save mapping", {
        description: error instanceof Error ? error.message : "Unknown error",
      }),
  });
  const receive = useMutation({
    mutationFn: () =>
      requestJson<{ run: SyncRun }>("/admin/one-c-sync/runs", {
        method: "POST",
      }),
    onSuccess: () => {
      toast.success("1C data received");
    },
    onError: (error) => {
      toast.error("Could not receive 1C data", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["one-c-sync"] });
    },
  });

  const download = async (format: "csv" | "json") => {
    if (!latestRun) return;
    const status = filter === "all" ? "" : `&mapping_status=${filter}`;
    try {
      const response = await fetch(
        `/admin/one-c-sync/runs/${latestRun.id}/export?format=${format}${status}`,
        { method: "POST", credentials: "include" }
      );
      if (!response.ok) throw new Error(`Export failed (${response.status})`);
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `one-c-${latestRun.id}.${format}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error("Could not export 1C data", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <div className="flex flex-col gap-y-3">
      <Container className="flex items-start justify-between gap-4 p-6">
        <div>
          <Heading level="h1">1C product sync</Heading>
          <Text className="text-ui-fg-subtle mt-1">
            Receive and compare DYLLU brand products from 1C. Other brands are
            not included. This page does not change site products or prices.
          </Text>
        </div>
        <Button
          type="button"
          isLoading={receive.isPending}
          onClick={() => receive.mutate()}
        >
          Receive fresh 1C data
        </Button>
      </Container>

      <Alert variant="warning">
        The 1C feed uses plain HTTP. Automatic jobs and all product changes are
        disabled. Each receive action must be started by a user.
      </Alert>

      {runsQuery.isError ? (
        <Alert variant="error">Could not load the 1C sync history.</Alert>
      ) : null}

      {latestRun ? (
        <>
          <Container className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <Heading level="h2">Latest result</Heading>
                <Text size="small" className="text-ui-fg-subtle mt-1">
                  {new Date(latestRun.started_at).toLocaleString()} · Backend
                  IP:{" "}
                  <span className="font-mono">
                    {latestRun.outbound_ip ?? "not detected"}
                  </span>
                </Text>
              </div>
              <Badge color={latestRun.status === "ready" ? "green" : "red"}>
                {latestRun.status}
              </Badge>
            </div>
            {latestRun.error_message ? (
              <Alert variant="error" className="mt-4">
                {latestRun.error_message}
              </Alert>
            ) : null}
            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Metric
                label="Missing from DYLLU"
                value={latestRun.counts?.missingMedusa ?? 0}
              />
              <Metric label="On site" value={latestRun.counts?.matched ?? 0} />
              <Metric
                label="Data differences"
                value={latestRun.counts?.changed ?? 0}
              />
              <Metric
                label="Needs review"
                value={
                  (latestRun.counts?.ambiguous ?? 0) +
                  (latestRun.counts?.invalid ?? 0)
                }
              />
            </div>
          </Container>

          <Container className="overflow-hidden p-0">
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
              <div>
                <Heading level="h2">Product comparison</Heading>
                <Text size="small" className="text-ui-fg-subtle mt-1">
                  Private 1C mappings to Medusa variants. Showing 50 rows per
                  page.
                </Text>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  disabled
                  title="Locked while 1C uses plain HTTP"
                >
                  Apply all reviewed prices
                </Button>
                <Button variant="secondary" onClick={() => download("csv")}>
                  Export CSV
                </Button>
                <Button variant="secondary" onClick={() => download("json")}>
                  Export JSON
                </Button>
              </div>
            </div>
            <Tabs
              value={filter}
              onValueChange={(value) => {
                setFilter(value as typeof filter);
                setPage(0);
              }}
            >
              <Tabs.List className="px-6">
                <Tabs.Trigger value="missing_medusa">Missing</Tabs.Trigger>
                <Tabs.Trigger value="matched">On site</Tabs.Trigger>
                <Tabs.Trigger value="ambiguous">Needs mapping</Tabs.Trigger>
                <Tabs.Trigger value="excluded">Excluded</Tabs.Trigger>
                <Tabs.Trigger value="all">All</Tabs.Trigger>
              </Tabs.List>
            </Tabs>
            <div className="border-ui-border-base overflow-x-auto border-t">
              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell>Medusa SKU</Table.HeaderCell>
                    <Table.HeaderCell>1C product</Table.HeaderCell>
                    <Table.HeaderCell>Medusa base</Table.HeaderCell>
                    <Table.HeaderCell>1C base</Table.HeaderCell>
                    <Table.HeaderCell>1C sale</Table.HeaderCell>
                    <Table.HeaderCell>Balance</Table.HeaderCell>
                    <Table.HeaderCell>Result</Table.HeaderCell>
                    <Table.HeaderCell>Differences</Table.HeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {(itemsQuery.data?.items ?? []).map((item) => (
                    <Table.Row key={item.id}>
                      <Table.Cell className="font-mono">{item.sku}</Table.Cell>
                      <Table.Cell>
                        <Text weight="plus">{item.name}</Text>
                        <Text size="xsmall" className="text-ui-fg-subtle">
                          {item.external_id}
                        </Text>
                      </Table.Cell>
                      <Table.Cell>
                        {item.mapping_status === "matched"
                          ? (item.differences.fields?.find(
                              (field) => field.field === "regular_price_mdl"
                            )?.before ??
                            item.regular_price_mdl ??
                            "—")
                          : "—"}
                      </Table.Cell>
                      <Table.Cell>{item.regular_price_mdl ?? "—"}</Table.Cell>
                      <Table.Cell>
                        {item.sale_price_mdl ?? "—"}
                        {item.sale_starts_at || item.sale_ends_at ? (
                          <Text size="xsmall" className="text-ui-fg-subtle">
                            {item.sale_starts_at ?? "…"} –{" "}
                            {item.sale_ends_at ?? "…"}
                          </Text>
                        ) : null}
                      </Table.Cell>
                      <Table.Cell>{item.balance ?? "—"}</Table.Cell>
                      <Table.Cell>
                        <StatusBadge status={item.mapping_status} />
                      </Table.Cell>
                      <Table.Cell>
                        {item.mapping_status === "missing_medusa" ? (
                          <div className="flex min-w-64 gap-2">
                            <Input
                              aria-label={`Medusa SKU for ${item.name}`}
                              placeholder="Medusa SKU"
                              value={
                                mappingSkus[item.id] ??
                                item.suggested_medusa_sku ??
                                ""
                              }
                              onChange={(event) =>
                                setMappingSkus((current) => ({
                                  ...current,
                                  [item.id]: event.target.value,
                                }))
                              }
                            />
                            <Button
                              variant="secondary"
                              disabled={
                                !(
                                  mappingSkus[item.id] ??
                                  item.suggested_medusa_sku
                                )?.trim() || saveMapping.isPending
                              }
                              onClick={() =>
                                saveMapping.mutate({
                                  itemId: item.id,
                                  medusaSku: (
                                    mappingSkus[item.id] ??
                                    item.suggested_medusa_sku!
                                  ).trim(),
                                })
                              }
                            >
                              Map
                            </Button>
                          </div>
                        ) : (
                          (item.differences.issue ??
                          item.differences.fields
                            ?.map((field) => field.field)
                            .join(", ") ??
                          "—")
                        )}
                      </Table.Cell>
                    </Table.Row>
                  ))}
                  {!itemsQuery.isLoading && !itemsQuery.data?.items.length ? (
                    <Table.Row>
                      <Table.Cell className="text-ui-fg-subtle py-10">
                        No products in this view.
                      </Table.Cell>
                    </Table.Row>
                  ) : null}
                </Table.Body>
              </Table>
            </div>
            <div className="border-ui-border-base flex items-center justify-between border-t px-6 py-3">
              <Text size="small" className="text-ui-fg-subtle">
                {itemsQuery.data?.count ?? 0} products · Page {page + 1} of{" "}
                {Math.max(
                  1,
                  Math.ceil((itemsQuery.data?.count ?? 0) / pageSize)
                )}
              </Text>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  disabled={page === 0}
                  onClick={() => setPage((value) => value - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  disabled={
                    (page + 1) * pageSize >= (itemsQuery.data?.count ?? 0)
                  }
                  onClick={() => setPage((value) => value + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </Container>

          <Container className="overflow-hidden p-0">
            <div className="px-6 py-4">
              <Heading level="h2">Sync history</Heading>
            </div>
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Started</Table.HeaderCell>
                  <Table.HeaderCell>Trigger</Table.HeaderCell>
                  <Table.HeaderCell>Status</Table.HeaderCell>
                  <Table.HeaderCell>Missing</Table.HeaderCell>
                  <Table.HeaderCell>Changed</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {(runsQuery.data?.runs ?? []).map((run) => (
                  <Table.Row key={run.id}>
                    <Table.Cell>
                      {new Date(run.started_at).toLocaleString()}
                    </Table.Cell>
                    <Table.Cell>{run.trigger}</Table.Cell>
                    <Table.Cell>{run.status}</Table.Cell>
                    <Table.Cell>{run.counts?.missingMedusa ?? "—"}</Table.Cell>
                    <Table.Cell>{run.counts?.changed ?? "—"}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </Container>
        </>
      ) : runsQuery.isLoading ? (
        <Container className="p-6">
          <Text>Loading sync history…</Text>
        </Container>
      ) : (
        <Container className="p-6">
          <Heading level="h2">No sync data</Heading>
          <Text className="text-ui-fg-subtle mt-1">
            Select “Receive fresh 1C data” to create the first read-only
            snapshot.
          </Text>
        </Container>
      )}
    </div>
  );
};

export const config = defineRouteConfig({
  label: "1C sync",
  icon: ServerStack,
});

export default OneCConnectionPage;
