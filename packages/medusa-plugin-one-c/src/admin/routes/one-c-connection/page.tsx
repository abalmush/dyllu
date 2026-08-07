import { defineRouteConfig } from "@medusajs/admin-sdk";
import { ServerStack } from "@medusajs/icons";
import {
  Alert,
  Badge,
  Button,
  Container,
  Drawer,
  FocusModal,
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

type ApplyStatus = "not_applied" | "applied" | "flagged" | "failed";

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
  apply_status: ApplyStatus;
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
type ItemDetailsResponse = {
  item: SyncItem & { source: unknown; normalized: unknown };
};
type BulkMappingPreview = {
  eligible_count: number;
  skipped_count: number;
  sample: Array<{
    sync_item_id: string;
    one_c_sku: string;
    medusa_sku: string;
    name: string;
  }>;
};

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

function ApplyStatusBadge({ status }: { status: ApplyStatus }) {
  if (status === "not_applied") return null;
  const label = {
    applied: "Applied",
    flagged: "Needs review",
    failed: "Failed",
  }[status];
  const color = { applied: "green", flagged: "orange", failed: "red" }[
    status
  ] as "green" | "orange" | "red";
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

function JsonPanel({ title, value }: { title: string; value: unknown }) {
  return (
    <section>
      <Heading level="h3">{title}</Heading>
      <pre className="bg-ui-bg-subtle border-ui-border-base mt-2 max-h-96 overflow-auto rounded-lg border p-4 text-xs break-all whitespace-pre-wrap">
        {JSON.stringify(value, null, 2)}
      </pre>
    </section>
  );
}

function ProductDetailsDrawer({
  runId,
  item,
  onClose,
}: {
  runId: string;
  item: SyncItem | null;
  onClose: () => void;
}) {
  const detailsQuery = useQuery({
    queryKey: ["one-c-sync", "item-details", runId, item?.id],
    queryFn: () =>
      requestJson<ItemDetailsResponse>(
        `/admin/one-c-sync/runs/${runId}/items/${item!.id}`
      ),
    enabled: Boolean(item),
  });
  const details = detailsQuery.data?.item;

  return (
    <Drawer open={Boolean(item)} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>{item?.name ?? "1C product data"}</Drawer.Title>
          <Drawer.Description>
            Complete stored 1C record and normalized comparison data.
          </Drawer.Description>
        </Drawer.Header>
        <Drawer.Body className="flex flex-col gap-6 overflow-y-auto">
          {detailsQuery.isLoading ? <Text>Loading product data…</Text> : null}
          {detailsQuery.isError ? (
            <Alert variant="error">Could not load the 1C product data.</Alert>
          ) : null}
          {details ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Metric label="Medusa SKU" value={details.sku || "—"} />
                <Metric label="1C SKU" value={details.external_id} />
                <Metric
                  label="1C base price"
                  value={details.regular_price_mdl ?? "—"}
                />
                <Metric label="1C balance" value={details.balance ?? "—"} />
                <Metric
                  label="Brand ID"
                  value={details.brand_external_id ?? "—"}
                />
                <Metric label="Mapping" value={details.mapping_status} />
              </div>
              <JsonPanel title="Raw 1C product" value={details.source} />
              <JsonPanel title="Normalized data" value={details.normalized} />
              <JsonPanel title="Comparison" value={details.differences} />
            </>
          ) : null}
        </Drawer.Body>
        <Drawer.Footer>
          <Drawer.Close asChild>
            <Button variant="secondary">Close</Button>
          </Drawer.Close>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  );
}

function BulkMappingModal({
  runId,
  open,
  onOpenChange,
}: {
  runId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const previewQuery = useQuery({
    queryKey: ["one-c-sync", "mapping-preview", runId],
    queryFn: () =>
      requestJson<BulkMappingPreview>(
        `/admin/one-c-sync/mappings/bulk?run_id=${runId}`
      ),
    enabled: open,
  });
  const saveMappings = useMutation({
    mutationFn: () =>
      requestJson<{ mapped_count: number; skipped_count: number }>(
        "/admin/one-c-sync/mappings/bulk",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ run_id: runId }),
        }
      ),
    onSuccess: (result) => {
      toast.success(`${result.mapped_count} exact mappings saved`, {
        description: "Receive fresh 1C data to compare the mapped products.",
      });
      onOpenChange(false);
    },
    onError: (error) =>
      toast.error("Could not save exact mappings", {
        description: error instanceof Error ? error.message : "Unknown error",
      }),
  });
  const preview = previewQuery.data;

  return (
    <FocusModal open={open} onOpenChange={onOpenChange}>
      <FocusModal.Content>
        <FocusModal.Header>
          <FocusModal.Title>Review exact 1C mappings</FocusModal.Title>
        </FocusModal.Header>
        <FocusModal.Body className="flex flex-col gap-4 overflow-y-auto p-6">
          <Alert variant="warning">
            Only one exact SKU token, one Medusa variant, and no existing
            mapping conflict are accepted. All other products are skipped.
          </Alert>
          {previewQuery.isLoading ? (
            <Text>Checking exact mappings…</Text>
          ) : null}
          {previewQuery.isError ? (
            <Alert variant="error">Could not prepare the mapping review.</Alert>
          ) : null}
          {preview ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Metric label="Ready to map" value={preview.eligible_count} />
                <Metric label="Skipped" value={preview.skipped_count} />
              </div>
              <div className="border-ui-border-base overflow-auto rounded-lg border">
                <Table>
                  <Table.Header>
                    <Table.Row>
                      <Table.HeaderCell>Medusa SKU</Table.HeaderCell>
                      <Table.HeaderCell>1C SKU</Table.HeaderCell>
                      <Table.HeaderCell>1C product</Table.HeaderCell>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {preview.sample.map((mapping) => (
                      <Table.Row key={mapping.sync_item_id}>
                        <Table.Cell className="font-mono">
                          {mapping.medusa_sku}
                        </Table.Cell>
                        <Table.Cell className="font-mono">
                          {mapping.one_c_sku}
                        </Table.Cell>
                        <Table.Cell>{mapping.name}</Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table>
              </div>
              {preview.eligible_count > preview.sample.length ? (
                <Text size="small" className="text-ui-fg-subtle">
                  Showing the first {preview.sample.length} exact mappings.
                </Text>
              ) : null}
            </>
          ) : null}
        </FocusModal.Body>
        <FocusModal.Footer>
          <FocusModal.Close asChild>
            <Button variant="secondary">Cancel</Button>
          </FocusModal.Close>
          <Button
            isLoading={saveMappings.isPending}
            disabled={!preview?.eligible_count}
            onClick={() => saveMappings.mutate()}
          >
            Save {preview?.eligible_count ?? 0} exact mappings
          </Button>
        </FocusModal.Footer>
      </FocusModal.Content>
    </FocusModal>
  );
}

const OneCConnectionPage = () => {
  const pageSize = 50;
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<MappingStatus | "all">("missing_medusa");
  const [page, setPage] = useState(0);
  const [mappingSkus, setMappingSkus] = useState<Record<string, string>>({});
  const [selectedItem, setSelectedItem] = useState<SyncItem | null>(null);
  const [bulkMappingOpen, setBulkMappingOpen] = useState(false);
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
  const applyAll = useMutation({
    mutationFn: () =>
      requestJson<{
        applied_count: number;
        flagged_count: number;
        failed_count: number;
      }>(`/admin/one-c-sync/runs/${latestRun!.id}/apply`, { method: "POST" }),
    onSuccess: (result) => {
      toast.success(
        `${result.applied_count} applied, ${result.flagged_count} flagged for review, ${result.failed_count} failed`
      );
    },
    onError: (error) =>
      toast.error("Could not apply 1C updates", {
        description: error instanceof Error ? error.message : "Unknown error",
      }),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["one-c-sync"] });
    },
  });
  const applyItem = useMutation({
    mutationFn: (itemId: string) =>
      requestJson<{ outcome: string }>(
        `/admin/one-c-sync/runs/${latestRun!.id}/items/${itemId}/apply`,
        { method: "POST" }
      ),
    onSuccess: (result) => {
      const outcomeLabel = {
        applied: "applied",
        flagged: "flagged for review",
        failed: "failed",
        no_change: "already in sync",
      }[result.outcome as "applied" | "flagged" | "failed" | "no_change"];
      toast.success(`Item ${outcomeLabel ?? result.outcome}`);
    },
    onError: (error) =>
      toast.error("Could not apply this item", {
        description: error instanceof Error ? error.message : "Unknown error",
      }),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["one-c-sync"] });
    },
  });
  const anyApplyInFlight = applyAll.isPending || applyItem.isPending;

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
                  onClick={() => setBulkMappingOpen(true)}
                >
                  Review exact mappings
                </Button>
                <Button
                  variant="secondary"
                  isLoading={applyAll.isPending}
                  disabled={anyApplyInFlight}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Apply all reviewed price, sale price, and stock updates for this run's matched products? This writes directly to the live catalog."
                      )
                    ) {
                      applyAll.mutate();
                    }
                  }}
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
              <Table className="min-w-[2100px]">
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell>Medusa SKU</Table.HeaderCell>
                    <Table.HeaderCell>1C SKU</Table.HeaderCell>
                    <Table.HeaderCell>1C product</Table.HeaderCell>
                    <Table.HeaderCell>Medusa product</Table.HeaderCell>
                    <Table.HeaderCell>Brand ID</Table.HeaderCell>
                    <Table.HeaderCell>Medusa base</Table.HeaderCell>
                    <Table.HeaderCell>1C base</Table.HeaderCell>
                    <Table.HeaderCell>Medusa sale</Table.HeaderCell>
                    <Table.HeaderCell>1C sale</Table.HeaderCell>
                    <Table.HeaderCell>Balance</Table.HeaderCell>
                    <Table.HeaderCell>1C state</Table.HeaderCell>
                    <Table.HeaderCell>Workflow</Table.HeaderCell>
                    <Table.HeaderCell>Result</Table.HeaderCell>
                    <Table.HeaderCell>Mapping or differences</Table.HeaderCell>
                    <Table.HeaderCell>Details</Table.HeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {(itemsQuery.data?.items ?? []).map((item) => (
                    <Table.Row key={item.id}>
                      <Table.Cell className="font-mono whitespace-nowrap">
                        {item.sku || "—"}
                      </Table.Cell>
                      <Table.Cell className="font-mono whitespace-nowrap">
                        {item.external_id}
                      </Table.Cell>
                      <Table.Cell className="max-w-80">
                        <Text
                          weight="plus"
                          title={item.name}
                          className="block truncate"
                        >
                          {item.name}
                        </Text>
                      </Table.Cell>
                      <Table.Cell className="max-w-80">
                        <Text
                          title={item.medusa_product_title ?? undefined}
                          className="block truncate"
                        >
                          {item.medusa_product_title ?? "—"}
                        </Text>
                      </Table.Cell>
                      <Table.Cell className="font-mono whitespace-nowrap">
                        {item.brand_external_id ?? "—"}
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
                        {item.mapping_status === "matched"
                          ? (item.differences.fields?.find(
                              (field) => field.field === "sale_price_mdl"
                            )?.before ??
                            item.sale_price_mdl ??
                            "—")
                          : "—"}
                      </Table.Cell>
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
                      <Table.Cell className="whitespace-nowrap">
                        {item.deleted
                          ? "Deleted"
                          : item.hidden
                            ? "Hidden"
                            : "Visible"}
                      </Table.Cell>
                      <Table.Cell className="whitespace-nowrap">
                        {item.preparation_status.replaceAll("_", " ")}
                      </Table.Cell>
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
                      <Table.Cell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="secondary"
                            size="small"
                            onClick={() => setSelectedItem(item)}
                          >
                            View 1C data
                          </Button>
                          {item.mapping_status === "matched" ? (
                            <Button
                              variant="secondary"
                              size="small"
                              isLoading={
                                applyItem.isPending &&
                                applyItem.variables === item.id
                              }
                              disabled={anyApplyInFlight}
                              onClick={() => applyItem.mutate(item.id)}
                            >
                              Apply
                            </Button>
                          ) : null}
                          <ApplyStatusBadge status={item.apply_status} />
                        </div>
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

          <ProductDetailsDrawer
            runId={latestRun.id}
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
          />
          <BulkMappingModal
            runId={latestRun.id}
            open={bulkMappingOpen}
            onOpenChange={setBulkMappingOpen}
          />

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
