"use client";

import { useEffect, useMemo, useState } from "react";
import { WidgetCard } from "@/components/dimax";
import { projectsMetricLabelClass } from "@/components/projects/project-form";
import { formatDateTime } from "@/components/projects/shared";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { apiFetch } from "@/lib/api";
import { readableApiError } from "@/lib/api-error-display";
import { useCopy, useI18n } from "@/lib/i18n";

import type { FailedImportQueueResponse, RetryFailedRunsResponse } from "./import-types";
import { FAILED_QUEUE_PAGE_SIZE, chunkIds } from "./shared";

type FailedImportQueueCardProps = {
  projectId: string | null;
  canManage: boolean;
  queue: FailedImportQueueResponse | null;
  loading: boolean;
  canPrev: boolean;
  canNext: boolean;
  onOffsetChange: (value: number | ((prev: number) => number)) => void;
  onlySelectedProject: boolean;
  onOnlySelectedProjectChange: (value: boolean) => void;
  onReload: () => Promise<void>;
  onOpenRun: (projectId: string, runId: string) => void;
  onError: (message: string | null) => void;
  onRetried: (projectId: string | null) => Promise<void>;
  tokenLabel: (value: string) => string;
  tt: (key: string) => string;
};

// Projects → "Failed import queue" card: paged queue of failed runs, selection and batched retry with progress. Markup, state and handlers moved verbatim from ProjectsPage (monolith split).
export function FailedImportQueueCard({
  projectId,
  canManage,
  queue,
  loading,
  canPrev,
  canNext,
  onOffsetChange,
  onlySelectedProject,
  onOnlySelectedProjectChange,
  onReload,
  onOpenRun,
  onError,
  onRetried,
  tokenLabel,
  tt,
}: FailedImportQueueCardProps) {
  const { locale, t } = useI18n();
  const copy = useCopy();

  const [selectedFailedRunIds, setSelectedFailedRunIds] = useState<string[]>(
    [],
  );
  const [retryFailedBatchSize, setRetryFailedBatchSize] = useState(10);
  const [retryFailedProgress, setRetryFailedProgress] = useState<{
    active: boolean;
    total: number;
    processed: number;
    successful: number;
    failed: number;
    skipped: number;
  } | null>(null);
  const [retryFailedSummary, setRetryFailedSummary] =
    useState<RetryFailedRunsResponse | null>(null);
  // Selected failed runs can only point at rows of the current page.
  useEffect(() => {
    const items = queue?.items;
    if (!items) return;
    const ids = new Set(items.map((x) => x.run_id));
    setSelectedFailedRunIds((prev) => prev.filter((id) => ids.has(id)));
  }, [queue]);
  const allFailedPageSelected = useMemo(() => {
    const ids = (queue?.items || []).map((x) => x.run_id);
    return (
      ids.length > 0 && ids.every((id) => selectedFailedRunIds.includes(id))
    );
  }, [queue, selectedFailedRunIds]);
  const toggleFailedRunSelection = (runId: string, checked: boolean) => {
    setSelectedFailedRunIds((prev) => {
      if (checked) {
        if (prev.includes(runId)) {
          return prev;
        }
        return [...prev, runId];
      }
      return prev.filter((id) => id !== runId);
    });
  };
  const toggleSelectAllFailedQueuePage = (checked: boolean) => {
    const pageIds = (queue?.items || []).map((x) => x.run_id);
    if (checked) {
      setSelectedFailedRunIds((prev) => {
        const merged = new Set(prev);
        for (const id of pageIds) {
          merged.add(id);
        }
        return [...merged];
      });
      return;
    }
    setSelectedFailedRunIds((prev) =>
      prev.filter((id) => !pageIds.includes(id)),
    );
  };
  const retryFailedQueueRuns = async (runIds: string[]) => {
    if (!canManage || runIds.length === 0) {
      return;
    }
    const batches = chunkIds(runIds, retryFailedBatchSize);
    let processed = 0;
    let successful = 0;
    let failed = 0;
    let skipped = 0;
    const allItems: RetryFailedRunsResponse["items"] = [];
    setRetryFailedSummary(null);
    setRetryFailedProgress({
      active: true,
      total: runIds.length,
      processed: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
    });
    onError(null);

    try {
      for (const batch of batches) {
        const response = await apiFetch<RetryFailedRunsResponse>(
          "/api/v1/admin/projects/import-runs/retry-failed",
          {
            method: "POST",
            body: JSON.stringify({ run_ids: batch }),
          },
        );
        processed += batch.length;
        successful += response.successful_runs;
        failed += response.failed_runs;
        skipped += response.skipped_runs;
        allItems.push(...(response.items || []));
        setRetryFailedProgress({
          active: true,
          total: runIds.length,
          processed,
          successful,
          failed,
          skipped,
        });
      }

      setRetryFailedSummary({
        items: allItems,
        total_runs: runIds.length,
        successful_runs: successful,
        failed_runs: failed,
        skipped_runs: skipped,
      });
      setSelectedFailedRunIds([]);
      await onReload();
      await onRetried(projectId);
    } catch (e) {
      onError(readableApiError(e, locale, t("projects.failedRetryQueueRuns")));
    } finally {
      setRetryFailedProgress((prev) =>
        prev
          ? {
              ...prev,
              active: false,
            }
          : null,
      );
    }
  };

  return (
    <WidgetCard
      title={tt("projects.failedImportsQueue")}
      headerMeta={
        <>
          {t("projects.selectedLabel")}:{" "}
          {selectedFailedRunIds.length}
        </>
      }
    >

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto] gap-2 mb-3">
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={onlySelectedProject}
            onChange={(e) => {
              onOnlySelectedProjectChange(e.target.checked);
              onOffsetChange(0);
            }}
          />
          {t("projects.onlySelectedProject")}
        </label>
        <select
          aria-label={t("projects.batch").replace(
            "{count}",
            String(retryFailedBatchSize),
          )}
          value={String(retryFailedBatchSize)}
          onChange={(e) =>
            setRetryFailedBatchSize(Number(e.target.value))
          }
          className="control-input h-8 text-[12px]"
        >
          <option value="5">
            {t("projects.batch").replace("{count}", "5")}
          </option>
          <option value="10">
            {t("projects.batch").replace("{count}", "10")}
          </option>
          <option value="20">
            {t("projects.batch").replace("{count}", "20")}
          </option>
        </select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            void onReload();
          }}
        >
          {tt("projects.refreshQueue")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            void retryFailedQueueRuns(selectedFailedRunIds);
          }}
          disabled={
            !!retryFailedProgress?.active ||
            selectedFailedRunIds.length === 0
          }
        >
          {retryFailedProgress?.active
            ? tt("projects.retryingProgress")
                .replace(
                  "{processed}",
                  String(retryFailedProgress.processed),
                )
                .replace(
                  "{total}",
                  String(retryFailedProgress.total),
                )
            : tt("projects.retrySelected").replace(
                "{count}",
                String(selectedFailedRunIds.length),
              )}
        </Button>
      </div>

      {retryFailedProgress && (
        <div className="mb-3 rounded-lg border border-border bg-surface-subtle px-3 py-2">
          <div className="text-[12px] text-text-secondary mb-1">
            {tt("projects.progress")}:{" "}
            {retryFailedProgress.processed}/
            {retryFailedProgress.total} |{" "}
            {tt("projects.successCount")}{" "}
            {retryFailedProgress.successful} |{" "}
            {tt("projects.failedCount")}{" "}
            {retryFailedProgress.failed} |{" "}
            {tt("projects.skippedCount")}{" "}
            {retryFailedProgress.skipped}
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-sunken">
            <div
              className="h-full bg-accent transition-colors"
              style={{
                width: `${
                  retryFailedProgress.total > 0
                    ? Math.round(
                        (retryFailedProgress.processed /
                          retryFailedProgress.total) *
                          100,
                      )
                    : 0
                }%`,
              }}
            />
          </div>
        </div>
      )}

      {retryFailedSummary && (
        <div className="mb-3 rounded-lg border border-border bg-surface-subtle px-3 py-2 text-[12px] text-text-secondary">
          {tt("projects.lastRetryBatch")
            .replace(
              "{success}",
              String(retryFailedSummary.successful_runs),
            )
            .replace(
              "{failed}",
              String(retryFailedSummary.failed_runs),
            )
            .replace(
              "{skipped}",
              String(retryFailedSummary.skipped_runs),
            )}
        </div>
      )}

      <div className="divide-y divide-border-subtle overflow-hidden rounded-lg border border-border bg-surface md:hidden">
        {loading ? (
          <div className="px-3.5 py-4 text-[12px] text-text-secondary">
            {tt("projects.loadingFailedQueue")}
          </div>
        ) : (queue?.items || []).length === 0 ? (
          <div className="px-3.5 py-4 text-[12px] text-text-secondary">
            {tt("projects.noFailedQueue")}
          </div>
        ) : (
          (queue?.items || []).map((item) => (
            <article key={item.run_id} className="px-3.5 py-3.5">
              <div className="flex items-start justify-between gap-3">
                <label className="flex min-w-0 items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-1 shrink-0"
                    checked={selectedFailedRunIds.includes(
                      item.run_id,
                    )}
                    onChange={(e) =>
                      toggleFailedRunSelection(
                        item.run_id,
                        e.target.checked,
                      )
                    }
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-semibold text-text">
                      {item.project_name}
                    </span>
                    <span
                      className="mt-1 block truncate text-[12px] text-text-secondary"
                      dir="ltr"
                    >
                      {item.source_filename || "-"}
                    </span>
                  </span>
                </label>
                <StatusBadge
                  status={item.status}
                  label={tokenLabel(item.status)}
                  domain="sync"
                />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                  <div className={projectsMetricLabelClass}>
                    {t("projects.time")}
                  </div>
                  <div
                    className="mt-1 truncate text-[12px] text-text-secondary tabular-nums"
                    dir="ltr"
                  >
                    {formatDateTime(item.created_at)}
                  </div>
                </div>
                <div className="rounded-lg border border-status-problem-border bg-status-problem-bg px-2.5 py-2">
                  <div className={projectsMetricLabelClass}>
                    {t("projects.errors")}
                  </div>
                  <div className="mt-1 text-[13px] font-medium text-status-problem-fg tabular-nums">
                    {item.errors_count}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-border-subtle pt-3">
                <div className="min-w-0 truncate text-[11px] text-text-secondary">
                  {item.last_error || t("projects.errorLabel")}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    onOpenRun(item.project_id, item.run_id)
                  }
                  className="h-8 shrink-0 px-3 text-[11px]"
                >
                  {t("projects.openRun")}
                </Button>
              </div>
            </article>
          ))
        )}
      </div>

      <div className="hidden overflow-auto rounded-lg border border-border bg-surface md:block">
        <table className="min-w-[760px] w-full text-[12px] leading-5">
          <thead className="bg-surface-subtle text-text-secondary">
            <tr>
              <th className="text-start px-2 py-2 font-medium">
                <input
                  type="checkbox"
                  aria-label={copy("Select all failed runs on this page", "Выбрать все сбойные запуски на странице", "בחר את כל ההרצות שנכשלו בעמוד")}
                  checked={allFailedPageSelected}
                  onChange={(e) =>
                    toggleSelectAllFailedQueuePage(e.target.checked)
                  }
                />
              </th>
              <th className="text-start px-2 py-2 font-medium">
                {t("projects.time")}
              </th>
              <th className="text-start px-2 py-2 font-medium">
                {t("common.project")}
              </th>
              <th className="text-start px-2 py-2 font-medium">
                {t("common.status")}
              </th>
              <th className="text-start px-2 py-2 font-medium">
                {t("projects.errors")}
              </th>
              <th className="text-start px-2 py-2 font-medium">
                {t("projects.file")}
              </th>
              <th className="text-start px-2 py-2 font-medium">
                {t("projects.action")}
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  className="px-2 py-3 text-text-secondary"
                  colSpan={7}
                >
                  {tt("projects.loadingFailedQueue")}
                </td>
              </tr>
            ) : (queue?.items || []).length === 0 ? (
              <tr>
                <td
                  className="px-2 py-3 text-text-secondary"
                  colSpan={7}
                >
                  {tt("projects.noFailedQueue")}
                </td>
              </tr>
            ) : (
              (queue?.items || []).map((item) => (
                <tr
                  key={item.run_id}
                  className="row-hover border-t border-border"
                >
                  <td className="px-2 py-1.5">
                    <input
                      type="checkbox"
                      aria-label={copy("Select failed run {name}", "Выбрать сбойный запуск {name}", "בחר הרצה שנכשלה {name}").replace("{name}", item.project_name)}
                      checked={selectedFailedRunIds.includes(
                        item.run_id,
                      )}
                      onChange={(e) =>
                        toggleFailedRunSelection(
                          item.run_id,
                          e.target.checked,
                        )
                      }
                    />
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap">
                    {formatDateTime(item.created_at)}
                  </td>
                  <td className="px-2 py-1.5">
                    {item.project_name}
                  </td>
                  <td className="px-2 py-1.5">
                    <StatusBadge
                      status={item.status}
                      label={tokenLabel(item.status)}
                      domain="sync"
                    />
                  </td>
                  <td
                    className="px-2 py-1.5 text-status-problem-fg"
                    title={item.last_error || ""}
                  >
                    {item.errors_count}
                  </td>
                  <td
                    className="px-2 py-1.5 max-w-[220px] truncate"
                    title={item.source_filename || "-"}
                  >
                    {item.source_filename || "-"}
                  </td>
                  <td className="px-2 py-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        onOpenRun(item.project_id, item.run_id)
                      }
                      className="h-7 px-2 text-[11px]"
                    >
                      {t("projects.openRun")}
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex items-center justify-between text-[12px] text-text-secondary">
        <div>
          {t("projects.totalQueue")}: {queue?.total || 0}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              onOffsetChange((x) =>
                Math.max(0, x - FAILED_QUEUE_PAGE_SIZE),
              )
            }
            disabled={!canPrev}
            className="h-7 px-2 text-[11px]"
          >
            {t("projects.prev")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              onOffsetChange(
                (x) => x + FAILED_QUEUE_PAGE_SIZE,
              )
            }
            disabled={!canNext}
            className="h-7 px-2 text-[11px]"
          >
            {t("projects.next")}
          </Button>
        </div>
      </div>
    </WidgetCard>
  );
}
