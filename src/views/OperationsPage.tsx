"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCcw, ServerCrash, ShieldAlert, Siren, TimerReset } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";

import { DashboardLayout } from "@/components/DashboardLayout";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useUserRole } from "@/hooks/use-user-role";
import { canRunPrivilegedAdminActions } from "@/lib/admin-access";
import { apiFetch } from "@/lib/api";

type SyncHealthSummaryResponse = {
  max_cursor: number;
  counts: {
    ok: number;
    warn: number;
    danger: number;
    total: number;
    dead: number;
    never_seen: number;
    danger_pct: number;
  };
  alerts_sent: number;
  top_laggers: Array<{
    installer_id: string;
    status: string;
    lag: number;
    days_offline: number;
    last_seen_at: string | null;
  }>;
  top_offline: Array<{
    installer_id: string;
    status: string;
    lag: number;
    days_offline: number;
    last_seen_at: string | null;
  }>;
};

type OutboxSummaryResponse = {
  total: number;
  by_channel: Record<string, number>;
  by_status: Record<string, number>;
  by_delivery_status: Record<string, number>;
  pending_overdue_15m: number;
  failed_total: number;
};

type OutboxListResponse = {
  items: Array<{
    id: string;
    channel: string;
    recipient: string | null;
    subject: string | null;
    status: string;
    delivery_status: string;
    attempts: number;
    max_attempts: number;
    scheduled_at: string;
    created_at: string;
    last_error: string | null;
  }>;
};

type FailedImportRunsQueueResponse = {
  items: Array<{
    run_id: string;
    project_id: string;
    project_name: string;
    created_at: string;
    mode: string;
    status: string;
    source_filename: string | null;
    parsed_rows: number;
    prepared_rows: number;
    imported: number;
    skipped: number;
    errors_count: number;
    last_error: string | null;
    retry_available: boolean;
  }>;
  total: number;
  limit: number;
  offset: number;
};

type RetryFailedRunsResponse = {
  items: Array<{
    run_id: string;
    project_id: string | null;
    status: string;
    imported: number;
    skipped: number;
    errors_count: number;
    last_error?: string | null;
  }>;
  total_runs: number;
  successful_runs: number;
  failed_runs: number;
  skipped_runs: number;
};

type BulkReconcileResponse = {
  items: Array<{
    project_id: string;
    source_run_id: string | null;
    status: string;
    imported: number;
    skipped: number;
    errors_count: number;
    last_error?: string | null;
  }>;
  total_projects: number;
  successful_projects: number;
  failed_projects: number;
  skipped_projects: number;
};

type OperationsBatchResult =
  | {
      action: "retry";
      createdAt: string;
      successful: number;
      failed: number;
      skipped: number;
      scope: number;
      items: RetryFailedRunsResponse["items"];
    }
  | {
      action: "reconcile";
      createdAt: string;
      successful: number;
      failed: number;
      skipped: number;
      scope: number;
      items: BulkReconcileResponse["items"];
    };

function formatDateTime(value: string | null): string {
  if (!value) {
    return "Never";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
}

function compactMap(value: Record<string, number>): string {
  const entries = Object.entries(value);
  if (entries.length === 0) {
    return "n/a";
  }
  return entries.map(([key, count]) => `${key}: ${count}`).join(" | ");
}

function buildProjectsImportHref(projectId: string | null, failedProjectIds: string[]): string {
  const params = new URLSearchParams();
  params.set("only_failed_runs", "1");
  if (projectId) {
    params.set("project_id", projectId);
  }
  if (failedProjectIds.length > 0) {
    params.set("failed_project_ids", failedProjectIds.join(","));
  }
  return `/projects?${params.toString()}`;
}

function formatRefreshTimestamp(value: number | null): string {
  if (!value || Number.isNaN(value)) {
    return "Waiting for first successful refresh";
  }
  return `Fresh as of ${new Date(value).toLocaleTimeString()}`;
}

function describeAgeMinutes(value: number | null, now: number): string {
  if (!value || Number.isNaN(value)) {
    return "No successful snapshot yet";
  }
  const ageMinutes = Math.max(0, Math.floor((now - value) / 60_000));
  if (ageMinutes === 0) {
    return "Updated less than a minute ago";
  }
  if (ageMinutes === 1) {
    return "Updated 1 minute ago";
  }
  return `Updated ${ageMinutes} minutes ago`;
}

function summarizeActions(params: {
  actionableImports: number;
  actionableOutbox: number;
  actionableSync: number;
  firstImportProjectName: string | null;
  firstOutboxRecipient: string | null;
  firstSyncInstallerId: string | null;
}): Array<{ label: string; value: string; href: string }> {
  const items: Array<{ label: string; value: string; href: string }> = [];

  if (params.actionableImports > 0) {
    items.push({
      label: "Imports",
      value:
        params.actionableImports === 1 && params.firstImportProjectName
          ? `Retry failed import for ${params.firstImportProjectName}`
          : `${params.actionableImports} failed imports need retry`,
      href: "/projects?only_failed_runs=1",
    });
  }

  if (params.actionableOutbox > 0) {
    items.push({
      label: "Outbox",
      value:
        params.actionableOutbox === 1 && params.firstOutboxRecipient
          ? `Recover delivery for ${params.firstOutboxRecipient}`
          : `${params.actionableOutbox} delivery failures need retry`,
      href: "/reports",
    });
  }

  if (params.actionableSync > 0) {
    items.push({
      label: "Sync",
      value:
        params.actionableSync === 1 && params.firstSyncInstallerId
          ? `Investigate installer ${params.firstSyncInstallerId}`
          : `${params.actionableSync} installers need sync attention`,
      href: "/installers",
    });
  }

  if (items.length === 0) {
    items.push({
      label: "Status",
      value: "No active operational actions right now",
      href: "/operations",
    });
  }

  return items;
}

function extractBatchProjectIds(result: OperationsBatchResult | null): string[] {
  if (!result) {
    return [];
  }
  const ids = new Set<string>();
  for (const item of result.items) {
    if ("project_id" in item && item.project_id) {
      ids.add(item.project_id);
    }
  }
  return [...ids];
}

export default function OperationsPage() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const userRole = useUserRole();
  const canRunPrivilegedActions = canRunPrivilegedAdminActions(userRole);
  const [busyAction, setBusyAction] = useState("");
  const [onlyActionable, setOnlyActionable] = useState(searchParams.get("actionable") === "1");
  const [pendingBatchAction, setPendingBatchAction] = useState<"retry" | "reconcile" | null>(null);
  const [lastBatchResult, setLastBatchResult] = useState<OperationsBatchResult | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  const syncQuery = useQuery({
    queryKey: ["operations-sync-health"],
    queryFn: () => apiFetch<SyncHealthSummaryResponse>("/api/v1/admin/sync/health/summary"),
    refetchInterval: 30_000,
  });

  const outboxSummaryQuery = useQuery({
    queryKey: ["operations-outbox-summary"],
    queryFn: () => apiFetch<OutboxSummaryResponse>("/api/v1/admin/outbox/summary"),
    refetchInterval: 30_000,
  });

  const outboxFailedQuery = useQuery({
    queryKey: ["operations-outbox-failed"],
    queryFn: () =>
      apiFetch<OutboxListResponse>("/api/v1/admin/outbox?status=FAILED&limit=8"),
    refetchInterval: 30_000,
  });

  const failedImportsQuery = useQuery({
    queryKey: ["operations-failed-imports"],
    queryFn: () =>
      apiFetch<FailedImportRunsQueueResponse>(
        "/api/v1/admin/projects/import-runs/failed-queue?limit=8&offset=0"
      ),
    refetchInterval: 30_000,
  });

  const isRefreshing =
    syncQuery.isFetching ||
    outboxSummaryQuery.isFetching ||
    outboxFailedQuery.isFetching ||
    failedImportsQuery.isFetching;

  const hasError =
    syncQuery.isError ||
    outboxSummaryQuery.isError ||
    outboxFailedQuery.isError ||
    failedImportsQuery.isError;

  const sync = syncQuery.data;
  const outboxSummary = outboxSummaryQuery.data;
  const failedOutbox = outboxFailedQuery.data?.items || [];
  const failedImports = failedImportsQuery.data?.items || [];
  const freshnessTimestamp = useMemo(() => {
    const timestamps = [
      syncQuery.dataUpdatedAt,
      outboxSummaryQuery.dataUpdatedAt,
      outboxFailedQuery.dataUpdatedAt,
      failedImportsQuery.dataUpdatedAt,
    ].filter((value) => value > 0);
    if (timestamps.length === 0) {
      return null;
    }
    return Math.min(...timestamps);
  }, [
    failedImportsQuery.dataUpdatedAt,
    outboxFailedQuery.dataUpdatedAt,
    outboxSummaryQuery.dataUpdatedAt,
    syncQuery.dataUpdatedAt,
  ]);
  const freshnessAgeMs = freshnessTimestamp ? Date.now() - freshnessTimestamp : null;
  const freshnessState = isRefreshing
    ? "refreshing"
    : hasError
      ? "degraded"
      : freshnessAgeMs !== null && freshnessAgeMs > 120_000
        ? "stale"
        : "fresh";
  const syncItems = useMemo(
    () => (sync ? (sync.top_laggers.length ? sync.top_laggers : sync.top_offline) : []),
    [sync]
  );
  const actionableFailedImports = useMemo(
    () => failedImports.filter((item) => item.retry_available),
    [failedImports]
  );
  const actionableFailedOutbox = useMemo(() => failedOutbox, [failedOutbox]);
  const actionableSyncItems = useMemo(
    () =>
      syncItems.filter((item) => {
        const status = item.status.trim().toLowerCase();
        return status === "danger" || status === "dead" || item.lag > 0 || item.days_offline > 0;
      }),
    [syncItems]
  );
  const visibleFailedImports = onlyActionable ? actionableFailedImports : failedImports;
  const visibleFailedOutbox = onlyActionable ? actionableFailedOutbox : failedOutbox;
  const visibleSyncItems = onlyActionable ? actionableSyncItems : syncItems;
  const actionableImportProjectIds = useMemo(
    () => Array.from(new Set(actionableFailedImports.map((item) => item.project_id).filter(Boolean))),
    [actionableFailedImports]
  );
  const actionSummary = useMemo(
    () =>
      summarizeActions({
        actionableImports: actionableFailedImports.length,
        actionableOutbox: actionableFailedOutbox.length,
        actionableSync: actionableSyncItems.length,
        firstImportProjectName: actionableFailedImports[0]?.project_name || null,
        firstOutboxRecipient:
          actionableFailedOutbox[0]?.recipient ||
          actionableFailedOutbox[0]?.subject ||
          actionableFailedOutbox[0]?.channel ||
          null,
        firstSyncInstallerId: actionableSyncItems[0]?.installer_id || null,
      }),
    [actionableFailedImports, actionableFailedOutbox, actionableSyncItems]
  );
  const failedImportProjectIds = useMemo(
    () => Array.from(new Set(visibleFailedImports.map((item) => item.project_id).filter(Boolean))),
    [visibleFailedImports]
  );
  const failedImportsHref = useMemo(
    () => buildProjectsImportHref(null, failedImportProjectIds),
    [failedImportProjectIds]
  );
  const batchResultProjectIds = useMemo(() => extractBatchProjectIds(lastBatchResult), [lastBatchResult]);
  const batchResultFollowupHref = useMemo(
    () =>
      batchResultProjectIds.length > 0
        ? buildProjectsImportHref(null, batchResultProjectIds)
        : "/projects?only_failed_runs=1",
    [batchResultProjectIds]
  );

  const cards = useMemo(
    () => [
      {
        label: "Sync danger",
        value: onlyActionable ? visibleSyncItems.length : sync?.counts.danger ?? 0,
        note: sync
          ? `${sync.counts.danger_pct.toFixed(1)}% of ${sync.counts.total} installers`
          : "Sync health pending",
        icon: ShieldAlert,
      },
      {
        label: "Failed imports",
        value: onlyActionable ? visibleFailedImports.length : failedImportsQuery.data?.total ?? 0,
        note:
          visibleFailedImports.length > 0
            ? visibleFailedImports[0]?.project_name
            : onlyActionable
              ? "No actionable imports"
              : "No failed imports",
        icon: ServerCrash,
      },
      {
        label: "Failed outbox",
        value: onlyActionable ? visibleFailedOutbox.length : outboxSummary?.failed_total ?? 0,
        note: outboxSummary ? compactMap(outboxSummary.by_channel) : "No outbox data",
        icon: Siren,
      },
      {
        label: "Pending > 15m",
        value: outboxSummary?.pending_overdue_15m ?? 0,
        note: outboxSummary ? compactMap(outboxSummary.by_delivery_status) : "No queue data",
        icon: TimerReset,
      },
    ],
    [
      failedImportsQuery.data?.total,
      onlyActionable,
      outboxSummary,
      visibleFailedImports,
      visibleFailedOutbox.length,
      visibleSyncItems.length,
    ]
  );

  async function refetchAll() {
    await Promise.all([
      syncQuery.refetch(),
      outboxSummaryQuery.refetch(),
      outboxFailedQuery.refetch(),
      failedImportsQuery.refetch(),
    ]);
  }

  async function handleRetryImport(runId: string, projectId: string) {
    if (!canRunPrivilegedActions) {
      return;
    }
    setBusyAction(`import:${runId}`);
    setActionFeedback(null);
    try {
      await apiFetch(`/api/v1/admin/projects/${projectId}/doors/import-runs/${runId}/retry`, {
        method: "POST",
      });
      await refetchAll();
      setActionFeedback({
        tone: "success",
        message: `Import run ${runId} moved back to processing.`,
      });
    } catch (error) {
      setActionFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "Failed to retry import run",
      });
    } finally {
      setBusyAction("");
    }
  }

  async function handleRetryOutbox(outboxId: string) {
    if (!canRunPrivilegedActions) {
      return;
    }
    setBusyAction(`outbox:${outboxId}`);
    setActionFeedback(null);
    try {
      await apiFetch(`/api/v1/admin/outbox/${outboxId}/retry`, {
        method: "POST",
        body: JSON.stringify({
          reason: "operations_center_manual_retry",
        }),
      });
      await refetchAll();
      setActionFeedback({
        tone: "success",
        message: `Outbox item ${outboxId} moved back to queue.`,
      });
    } catch (error) {
      setActionFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "Failed to retry outbox item",
      });
    } finally {
      setBusyAction("");
    }
  }

  async function handleRetryAllImports() {
    if (!canRunPrivilegedActions || actionableFailedImports.length === 0) {
      return;
    }
    setBusyAction("imports:bulk");
    setActionFeedback(null);
    try {
      const response = await apiFetch<RetryFailedRunsResponse>(
        "/api/v1/admin/projects/import-runs/retry-failed",
        {
          method: "POST",
          body: JSON.stringify({
            run_ids: actionableFailedImports.map((item) => item.run_id),
          }),
        }
      );
      await refetchAll();
      setLastBatchResult({
        action: "retry",
        createdAt: new Date().toISOString(),
        successful: response.successful_runs,
        failed: response.failed_runs,
        skipped: response.skipped_runs,
        scope: actionableFailedImports.length,
        items: response.items || [],
      });
      setActionFeedback({
        tone: response.failed_runs > 0 ? "error" : "success",
        message:
          `Bulk import retry finished: success ${response.successful_runs} | ` +
          `failed ${response.failed_runs} | skipped ${response.skipped_runs}.`,
      });
    } catch (error) {
      setActionFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "Failed to retry actionable imports",
      });
    } finally {
      setBusyAction("");
      setPendingBatchAction(null);
    }
  }

  async function handleReconcileActionableProjects() {
    if (!canRunPrivilegedActions || actionableImportProjectIds.length === 0) {
      return;
    }
    setBusyAction("imports:reconcile");
    setActionFeedback(null);
    try {
      const response = await apiFetch<BulkReconcileResponse>(
        "/api/v1/admin/projects/import-runs/reconcile-latest",
        {
          method: "POST",
          body: JSON.stringify({
            project_ids: actionableImportProjectIds,
            only_failed_runs: true,
          }),
        }
      );
      await refetchAll();
      setLastBatchResult({
        action: "reconcile",
        createdAt: new Date().toISOString(),
        successful: response.successful_projects,
        failed: response.failed_projects,
        skipped: response.skipped_projects,
        scope: actionableImportProjectIds.length,
        items: response.items || [],
      });
      setActionFeedback({
        tone: response.failed_projects > 0 ? "error" : "success",
        message:
          `Bulk reconcile finished: success ${response.successful_projects} | ` +
          `failed ${response.failed_projects} | skipped ${response.skipped_projects}.`,
      });
    } catch (error) {
      setActionFeedback({
        tone: "error",
        message:
          error instanceof Error ? error.message : "Failed to reconcile actionable projects",
      });
    } finally {
      setBusyAction("");
      setPendingBatchAction(null);
    }
  }

  function batchActionLabel(): string {
    if (pendingBatchAction === "retry") {
      return "Retry actionable imports";
    }
    if (pendingBatchAction === "reconcile") {
      return "Reconcile actionable projects";
    }
    return "";
  }

  function batchActionDescription(): string {
    if (pendingBatchAction === "retry") {
      return `This will retry ${actionableFailedImports.length} actionable import runs across ${actionableImportProjectIds.length} projects.`;
    }
    if (pendingBatchAction === "reconcile") {
      return `This will reconcile latest failed import state for ${actionableImportProjectIds.length} actionable projects.`;
    }
    return "";
  }

  async function confirmBatchAction() {
    if (pendingBatchAction === "retry") {
      await handleRetryAllImports();
      return;
    }
    if (pendingBatchAction === "reconcile") {
      await handleReconcileActionableProjects();
    }
  }

  function syncUrlState(nextOnlyActionable: boolean) {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("actionable");
    if (nextOnlyActionable) {
      nextParams.set("actionable", "1");
    }
    const nextQuery = nextParams.toString();
    const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;
    window.history.replaceState(window.history.state, "", nextUrl);
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-[1400px] space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Operations Center
            </h1>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              Import failures, outbox delivery problems, and installer sync health.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                setOnlyActionable((value) => {
                  const nextValue = !value;
                  syncUrlState(nextValue);
                  return nextValue;
                })
              }
              aria-pressed={onlyActionable}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-4 text-[13px] font-medium text-card-foreground transition-colors hover:bg-muted aria-[pressed=true]:border-accent aria-[pressed=true]:text-accent"
            >
              Only actionable
            </button>
            <button
              type="button"
              onClick={() => {
                void refetchAll();
              }}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-4 text-[13px] font-medium text-card-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isRefreshing}
            >
              <RefreshCcw className="h-4 w-4" />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        {hasError && (
          <div className="rounded-lg border border-[hsl(var(--destructive)/0.35)] bg-[hsl(var(--destructive)/0.08)] px-4 py-3 text-[13px] text-[hsl(var(--destructive))]">
            Failed to load operations data. Check API availability and admin permissions.
          </div>
        )}
        {actionFeedback && (
          <div
            className={
              actionFeedback.tone === "success"
                ? "rounded-lg border border-[hsl(var(--success)/0.35)] bg-[hsl(var(--success)/0.08)] px-4 py-3 text-[13px] text-[hsl(var(--success))]"
                : "rounded-lg border border-[hsl(var(--destructive)/0.35)] bg-[hsl(var(--destructive)/0.08)] px-4 py-3 text-[13px] text-[hsl(var(--destructive))]"
            }
          >
            {actionFeedback.message}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <div key={card.label} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-muted-foreground">{card.label}</div>
                <card.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2 text-2xl font-semibold">{card.value}</div>
              <div className="mt-2 text-xs text-muted-foreground">{card.note}</div>
            </div>
          ))}
        </div>

        <section className="rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Data Freshness
              </h2>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {formatRefreshTimestamp(freshnessTimestamp)}
              </p>
              <p className="mt-1 text-[12px] text-muted-foreground">
                {describeAgeMinutes(freshnessTimestamp, Date.now())}
              </p>
            </div>
            <span
              className={
                freshnessState === "fresh"
                  ? "rounded-md border border-[hsl(var(--success)/0.35)] bg-[hsl(var(--success)/0.08)] px-2 py-1 text-[11px] font-medium text-[hsl(var(--success))]"
                  : freshnessState === "stale"
                    ? "rounded-md border border-[hsl(var(--warning)/0.35)] bg-[hsl(var(--warning)/0.12)] px-2 py-1 text-[11px] font-medium text-[hsl(var(--warning-foreground))]"
                    : freshnessState === "degraded"
                      ? "rounded-md border border-[hsl(var(--destructive)/0.35)] bg-[hsl(var(--destructive)/0.08)] px-2 py-1 text-[11px] font-medium text-[hsl(var(--destructive))]"
                      : "rounded-md border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground"
              }
            >
              {freshnessState === "fresh"
                ? "fresh"
                : freshnessState === "stale"
                  ? "stale"
                  : freshnessState === "degraded"
                    ? "degraded"
                    : "refreshing"}
            </span>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Action Summary
              </h2>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Highest-value actions from imports, outbox and sync in one view.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {onlyActionable ? (
                <span className="rounded-md border border-accent/40 px-2 py-1 text-[11px] font-medium text-accent">
                  actionable mode
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setPendingBatchAction("retry");
                }}
                disabled={
                  !canRunPrivilegedActions ||
                  actionableFailedImports.length === 0 ||
                  busyAction === "imports:bulk"
                }
                className="inline-flex h-8 items-center rounded-lg border border-border bg-background px-3 text-[12px] font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                >
                {busyAction === "imports:bulk"
                  ? "Retrying imports..."
                  : `Retry actionable imports (${actionableFailedImports.length})`}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPendingBatchAction("reconcile");
                }}
                disabled={
                  !canRunPrivilegedActions ||
                  actionableImportProjectIds.length === 0 ||
                  busyAction === "imports:reconcile"
                }
                className="inline-flex h-8 items-center rounded-lg border border-border bg-background px-3 text-[12px] font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busyAction === "imports:reconcile"
                  ? "Reconciling projects..."
                  : `Reconcile actionable projects (${actionableImportProjectIds.length})`}
              </button>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {actionSummary.map((item) => (
              <Link
                key={`${item.label}-${item.href}`}
                href={item.href}
                className="rounded-lg border border-border/70 bg-background/70 px-4 py-3 transition-colors hover:bg-muted"
              >
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {item.label}
                </div>
                <div className="mt-1 text-sm font-medium text-foreground">{item.value}</div>
              </Link>
            ))}
          </div>
        </section>

        {lastBatchResult ? (
          <section className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Last Batch Result
                </h2>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  {lastBatchResult.action === "retry"
                    ? `Retry actionable imports over ${lastBatchResult.scope} runs`
                    : `Reconcile actionable projects over ${lastBatchResult.scope} projects`}
                </p>
              </div>
              <div className="text-right text-[12px] text-muted-foreground">
                {formatDateTime(lastBatchResult.createdAt)}
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <div className="rounded-lg border border-border/70 bg-background/70 px-4 py-3">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Success</div>
                <div className="mt-1 text-lg font-semibold text-foreground">{lastBatchResult.successful}</div>
              </div>
              <div className="rounded-lg border border-border/70 bg-background/70 px-4 py-3">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Failed</div>
                <div className="mt-1 text-lg font-semibold text-foreground">{lastBatchResult.failed}</div>
              </div>
              <div className="rounded-lg border border-border/70 bg-background/70 px-4 py-3">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Skipped</div>
                <div className="mt-1 text-lg font-semibold text-foreground">{lastBatchResult.skipped}</div>
              </div>
              <div className="rounded-lg border border-border/70 bg-background/70 px-4 py-3">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Scope</div>
                <div className="mt-1 text-lg font-semibold text-foreground">{lastBatchResult.scope}</div>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {lastBatchResult.items.length === 0 ? (
                <div className="text-[13px] text-muted-foreground">No item details returned.</div>
              ) : (
                lastBatchResult.items.slice(0, 5).map((item) => (
                  <div
                    key={
                      lastBatchResult.action === "retry"
                        ? `retry-${item.run_id}`
                        : `reconcile-${item.project_id}-${item.source_run_id || "latest"}`
                    }
                    className="rounded-lg border border-border/70 bg-background/70 px-4 py-3 text-[13px]"
                  >
                    <div className="font-medium text-foreground">
                      {lastBatchResult.action === "retry"
                        ? `Run ${item.run_id}`
                        : `Project ${item.project_id}`}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      status {item.status} | imported {item.imported} | skipped {item.skipped} | errors{" "}
                      {item.errors_count}
                    </div>
                    {"last_error" in item && item.last_error ? (
                      <div className="mt-1 text-xs text-muted-foreground">{item.last_error}</div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={batchResultFollowupHref}
                className="inline-flex h-8 items-center rounded-lg border border-border bg-background px-3 text-[12px] font-medium text-foreground hover:bg-muted"
              >
                Review affected imports
              </Link>
              <Link
                href="/operations"
                className="inline-flex h-8 items-center rounded-lg border border-border bg-background px-3 text-[12px] font-medium text-foreground hover:bg-muted"
              >
                Back to overview
              </Link>
            </div>
          </section>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Link
            href={failedImportsHref}
            className="inline-flex h-9 items-center rounded-lg border border-border bg-card px-4 text-[13px] font-medium text-card-foreground transition-colors hover:bg-muted"
          >
            Open import workspace
          </Link>
          <Link
            href="/reports"
            className="inline-flex h-9 items-center rounded-lg border border-border bg-card px-4 text-[13px] font-medium text-card-foreground transition-colors hover:bg-muted"
          >
            Open delivery reports
          </Link>
          <Link
            href="/journal"
            className="inline-flex h-9 items-center rounded-lg border border-border bg-card px-4 text-[13px] font-medium text-card-foreground transition-colors hover:bg-muted"
          >
            Open communication queue
          </Link>
          <Link
            href="/installers"
            className="inline-flex h-9 items-center rounded-lg border border-border bg-card px-4 text-[13px] font-medium text-card-foreground transition-colors hover:bg-muted"
          >
            Open installer board
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <section className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Failed Import Queue
              </h2>
              <Link
                href={failedImportsHref}
                className="text-[12px] font-medium text-accent hover:underline"
              >
                Open queue
              </Link>
            </div>
            <div className="space-y-0">
              {failedImportsQuery.isLoading && (
                <div className="px-4 py-6 text-[13px] text-muted-foreground">
                  Loading failed imports...
                </div>
              )}
              {!failedImportsQuery.isLoading && visibleFailedImports.length === 0 && (
                <div className="px-4 py-6 text-[13px] text-muted-foreground">
                  {onlyActionable ? "No actionable import runs." : "No failed import runs."}
                </div>
              )}
              {visibleFailedImports.map((item) => (
                <div
                  key={item.run_id}
                  className="border-t border-border/70 px-4 py-3 text-[13px]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-card-foreground">{item.project_name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {item.mode} | {item.source_filename || "No file"} | {formatDateTime(item.created_at)}
                      </div>
                    </div>
                    <span className="rounded-md border border-border px-2 py-1 text-[11px]">
                      {item.status}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    rows {item.parsed_rows} / prepared {item.prepared_rows} / imported {item.imported}
                    {" | "}errors {item.errors_count}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {item.last_error || "No error payload"}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <Link
                      href={buildProjectsImportHref(item.project_id, [item.project_id])}
                      className="font-medium text-accent hover:underline"
                    >
                      Project imports
                    </Link>
                    <Link
                      href={`/projects?project_id=${encodeURIComponent(item.project_id)}`}
                      className="font-medium text-muted-foreground hover:text-foreground hover:underline"
                    >
                      Open project
                    </Link>
                    {item.retry_available ? (
                      <button
                        type="button"
                        onClick={() => {
                          void handleRetryImport(item.run_id, item.project_id);
                        }}
                        disabled={!canRunPrivilegedActions || busyAction === `import:${item.run_id}`}
                        className="font-medium text-accent disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {busyAction === `import:${item.run_id}` ? "Retrying import..." : "Retry import"}
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Failed Outbox
              </h2>
              <div className="flex gap-3 text-[12px]">
                <Link href="/reports" className="font-medium text-accent hover:underline">
                  Reports
                </Link>
                <Link href="/journal" className="font-medium text-accent hover:underline">
                  Journal
                </Link>
              </div>
            </div>
            <div className="space-y-0">
              {outboxFailedQuery.isLoading && (
                <div className="px-4 py-6 text-[13px] text-muted-foreground">
                  Loading outbox failures...
                </div>
              )}
              {!outboxFailedQuery.isLoading && visibleFailedOutbox.length === 0 && (
                <div className="px-4 py-6 text-[13px] text-muted-foreground">
                  {onlyActionable ? "No actionable outbox messages." : "No failed outbox messages."}
                </div>
              )}
              {visibleFailedOutbox.map((item) => (
                <div key={item.id} className="border-t border-border/70 px-4 py-3 text-[13px]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-card-foreground">
                        {item.recipient || item.subject || item.channel}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {item.channel} | {item.delivery_status} | scheduled {formatDateTime(item.scheduled_at)}
                      </div>
                    </div>
                    <span className="rounded-md border border-border px-2 py-1 text-[11px]">
                      {item.attempts}/{item.max_attempts}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {item.last_error || "No error payload"}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <Link href="/reports" className="font-medium text-accent hover:underline">
                      Reports outbox
                    </Link>
                    <Link
                      href="/journal"
                      className="font-medium text-muted-foreground hover:text-foreground hover:underline"
                    >
                      Journal outbox
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        void handleRetryOutbox(item.id);
                      }}
                      disabled={!canRunPrivilegedActions || busyAction === `outbox:${item.id}`}
                      className="font-medium text-accent disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {busyAction === `outbox:${item.id}` ? "Retrying delivery..." : "Retry delivery"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Sync Health
              </h2>
              <Link
                href="/installers"
                className="text-[12px] font-medium text-accent hover:underline"
              >
                Open installers
              </Link>
            </div>
            <div className="space-y-0">
              {syncQuery.isLoading && (
                <div className="px-4 py-6 text-[13px] text-muted-foreground">
                  Loading sync health...
                </div>
              )}
              {!syncQuery.isLoading && !sync && (
                <div className="px-4 py-6 text-[13px] text-muted-foreground">
                  No sync health data.
                </div>
              )}
              {sync && (
                <>
                  <div className="px-4 py-3 text-[13px]">
                    <div className="font-medium text-card-foreground">
                      ok {sync.counts.ok} | warn {sync.counts.warn} | danger {sync.counts.danger}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      dead {sync.counts.dead} | never seen {sync.counts.never_seen} | alerts sent{" "}
                      {sync.alerts_sent}
                    </div>
                  </div>
                  {visibleSyncItems.length === 0 ? (
                    <div className="border-t border-border/70 px-4 py-6 text-[13px] text-muted-foreground">
                      No actionable sync items.
                    </div>
                  ) : null}
                  {visibleSyncItems.map((item) => (
                    <div
                      key={`${item.installer_id}-${item.status}`}
                      className="border-t border-border/70 px-4 py-3 text-[13px]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="font-medium text-card-foreground">{item.installer_id}</div>
                        <span className="rounded-md border border-border px-2 py-1 text-[11px]">
                          {item.status}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        lag {item.lag} | offline {item.days_offline} days | last seen{" "}
                        {formatDateTime(item.last_seen_at)}
                      </div>
                      <div className="mt-3 text-xs">
                        <Link
                          href="/installers"
                          className="font-medium text-accent hover:underline"
                        >
                          Installer board
                        </Link>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </section>
        </div>
      </div>
      <AlertDialog
        open={pendingBatchAction !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingBatchAction(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{batchActionLabel()}</AlertDialogTitle>
            <AlertDialogDescription>{batchActionDescription()}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                void confirmBatchAction();
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
