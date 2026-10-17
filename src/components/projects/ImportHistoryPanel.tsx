"use client";

import { useMemo, type ReactNode } from "react";
import { MetricRow } from "@/components/dimax";
import { downloadImportErrorsCsv, safeDownloadFilename } from "@/components/projects/import-download";
import { type ImportColumnsDiagnostics } from "@/components/projects/import-types";
import { projectsMetricLabelClass } from "@/components/projects/project-form";
import { type ProjectImportRunItem } from "@/components/projects/project-types";
import { formatDateTime } from "@/components/projects/shared";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import { Download } from "lucide-react";
import { useCopy, useI18n } from "@/lib/i18n";
import { useImportCopy } from "./import-copy";
import type { ProjectImportRunDetails } from "./import-types";

type ImportHistoryPanelProps = {
  projectId: string | null;
  canManage: boolean;
  canViewRates: boolean;
  importHistory: ProjectImportRunItem[];
  loadingHistory: boolean;
  onReloadHistory: (projectId: string) => Promise<void>;
  modeFilter: string;
  onModeFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  focusedRunId: string | null;
  retryingRunId: string | null;
  onRetryRun: (runId: string, projectId?: string) => Promise<void>;
  onOpenRun: (projectId: string, runId: string) => void;
  details: ProjectImportRunDetails | null;
  loadingDetails: boolean;
  renderPreviewGroups: (diagnostics?: ImportColumnsDiagnostics | null, title?: string) => ReactNode;
  tokenLabel: (value: string) => string;
};

// Projects → import history list with filters and retry, plus the focused import-run details (inside the import card). Markup, state and handlers moved verbatim from ProjectsPage (monolith split).
export function ImportHistoryPanel({
  projectId,
  canManage,
  canViewRates,
  importHistory,
  loadingHistory,
  onReloadHistory,
  modeFilter,
  onModeFilterChange,
  statusFilter,
  onStatusFilterChange,
  focusedRunId,
  retryingRunId,
  onRetryRun,
  onOpenRun,
  details,
  loadingDetails,
  renderPreviewGroups,
  tokenLabel,
}: ImportHistoryPanelProps) {
  const { t } = useI18n();
  const copy = useCopy();
  const { importRowErrorLabel, importProfileLabel } = useImportCopy();

  const filteredImportHistory = useMemo(() => {
    return importHistory.filter((run) => {
      if (
        statusFilter !== "all" &&
        run.status !== statusFilter
      ) {
        return false;
      }
      return true;
    });
  }, [importHistory, statusFilter]);
  const importRunResultSummary = (
    run: Pick<ProjectImportRunItem, "imported" | "skipped" | "errors_count">,
  ) =>
    t("projects.resultSummary")
      .replace("{imported}", String(run.imported))
      .replace("{skipped}", String(run.skipped))
      .replace(
        "{errors}",
        run.errors_count > 0
          ? t("projects.errCount").replace("{count}", String(run.errors_count))
          : "",
      );

  return (
    <>
      <div
        id="project-import-history"
        className="mt-4 rounded-lg border border-border bg-surface"
      >
        <div className="flex flex-col gap-2 border-b border-border bg-surface-subtle px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-[12px] font-semibold text-text">
            {t("projects.importHistory")}
            <span className="ms-2 text-text-secondary">
              {filteredImportHistory.length} /{" "}
              {importHistory.length}
            </span>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <select
              aria-label={copy("Import history mode", "Режим истории импорта", "מצב היסטוריית ייבוא")}
              value={modeFilter}
              onChange={(e) =>
                onModeFilterChange(e.target.value)
              }
              className="control-input h-7 min-w-0 flex-1 px-2 text-[11px] sm:flex-none"
            >
              <option value="all">{t("projects.allModes")}</option>
              <option value="analyze">
                {t("projects.analyze")}
              </option>
              <option value="import">{t("projects.import")}</option>
              <option value="import_retry">
                {t("projects.retry")}
              </option>
            </select>
            <select
              aria-label={copy("Import history status", "Статус истории импорта", "סטטוס היסטוריית ייבוא")}
              value={statusFilter}
              onChange={(e) =>
                onStatusFilterChange(e.target.value)
              }
              className="control-input h-7 min-w-0 flex-1 px-2 text-[11px] sm:flex-none"
            >
              <option value="all">
                {t("projects.allStatuses")}
              </option>
              <option value="ANALYZED">
                {copy("ANALYZED", "ПРОАНАЛИЗИРОВАНО", "נותח")}
              </option>
              <option value="SUCCESS">
                {copy("SUCCESS", "УСПЕШНО", "הצליח")}
              </option>
              <option value="PARTIAL">
                {copy("PARTIAL", "ЧАСТИЧНО", "חלקי")}
              </option>
              <option value="FAILED">
                {copy("FAILED", "ОШИБКА", "נכשל")}
              </option>
              <option value="EMPTY">
                {copy("EMPTY", "ПУСТО", "ריק")}
              </option>
            </select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (projectId) {
                  void onReloadHistory(projectId);
                }
              }}
              className="h-7 px-2 text-[11px]"
            >
              {t("projects.refreshHistory")}
            </Button>
          </div>
        </div>
        {loadingHistory ? (
          <div className="px-3 py-3 text-[12px] text-text-secondary">
            {t("projects.loadingImportHistory")}
          </div>
        ) : importHistory.length === 0 ? (
          <div className="px-3 py-3 text-[12px] text-text-secondary">
            {t("projects.noImportRunsYet")}
          </div>
        ) : filteredImportHistory.length === 0 ? (
          <div className="px-3 py-3 text-[12px] text-text-secondary">
            {t("projects.noImportRunsForFilters")}
          </div>
        ) : (
          <>
            <div className="divide-y divide-border-subtle md:hidden">
              {filteredImportHistory.map((run) => (
                <article
                  id={`import-run-card-${run.id}`}
                  key={`${run.id}-mobile`}
                  className={cn(
                    "px-3.5 py-3.5",
                    focusedRunId === run.id &&
                      "bg-[var(--dmx-accent-tint)]",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-text">
                        {formatDateTime(run.created_at)}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex rounded-full bg-surface-sunken px-2 py-1 text-[10.5px] font-medium leading-none text-text-secondary">
                          {t("projects.modeLabel")}: {run.mode}
                        </span>
                        {run.source_filename ? (
                          <span className="inline-flex max-w-full rounded-full bg-surface-sunken px-2 py-1 text-[10.5px] font-medium leading-none text-text-secondary">
                            <span className="truncate">
                              {run.source_filename}
                            </span>
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <StatusBadge
                      status={run.status}
                      label={tokenLabel(run.status)}
                      domain="sync"
                    />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                      <div className={projectsMetricLabelClass}>
                        {t("projects.rows")}
                      </div>
                      <div className="mt-1 text-[15px] font-medium text-text tabular-nums">
                        {run.parsed_rows} / {run.prepared_rows}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                      <div className={projectsMetricLabelClass}>
                        {t("projects.result")}
                      </div>
                      <div className="mt-1 line-clamp-2 text-[12px] font-medium leading-5 text-text">
                        {importRunResultSummary(run)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onOpenRun(projectId!, run.id);
                      }}
                      className="h-8 px-2.5 text-[11px]"
                    >
                      {t("projects.view")}
                    </Button>
                    {run.retry_available ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          void onRetryRun(run.id);
                        }}
                        disabled={!canManage || retryingRunId === run.id}
                        className="h-8 px-2.5 text-[11px]"
                      >
                        {retryingRunId === run.id
                          ? `${t("projects.retry")}…`
                          : t("projects.retry")}
                      </Button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
            <div className="hidden overflow-auto md:block">
              <table className="w-full text-[11px]">
                <thead className="bg-surface-subtle text-text-secondary">
                  <tr>
                    <th className="text-start px-2 py-1.5 font-medium">
                      {t("projects.time")}
                    </th>
                    <th className="text-start px-2 py-1.5 font-medium">
                      {t("projects.modeLabel")}
                    </th>
                    <th className="text-start px-2 py-1.5 font-medium">
                      {t("common.status")}
                    </th>
                    <th className="text-start px-2 py-1.5 font-medium">
                      {t("projects.rows")}
                    </th>
                    <th className="text-start px-2 py-1.5 font-medium">
                      {t("projects.result")}
                    </th>
                    <th className="text-start px-2 py-1.5 font-medium">
                      {t("projects.file")}
                    </th>
                    <th className="text-start px-2 py-1.5 font-medium">
                      {t("projects.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredImportHistory.map((run) => (
                    <tr
                      id={`import-run-${run.id}`}
                      key={run.id}
                      className={cn(
                        "row-hover border-t border-border",
                        focusedRunId === run.id &&
                          "bg-[var(--dmx-accent-tint)]",
                      )}
                    >
                      <td className="px-2 py-1.5 whitespace-nowrap">
                        {formatDateTime(run.created_at)}
                      </td>
                      <td className="px-2 py-1.5">{run.mode}</td>
                      <td className="px-2 py-1.5">
                        <StatusBadge
                          status={run.status}
                          label={tokenLabel(run.status)}
                          domain="sync"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        {run.parsed_rows} / {run.prepared_rows}
                      </td>
                      <td className="px-2 py-1.5">
                        {importRunResultSummary(run)}
                      </td>
                      <td
                        className="px-2 py-1.5 max-w-[220px] truncate"
                        title={run.source_filename || "-"}
                      >
                        {run.source_filename || "-"}
                      </td>
                      <td className="px-2 py-1.5">
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              onOpenRun(
                                projectId!,
                                run.id,
                              );
                            }}
                            className="h-7 px-2 text-[11px]"
                          >
                            {t("projects.view")}
                          </Button>
                          {run.retry_available ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                void onRetryRun(run.id);
                              }}
                              disabled={!canManage || retryingRunId === run.id}
                              className="h-7 px-2 text-[11px]"
                            >
                              {retryingRunId === run.id
                                ? `${t("projects.retry")}…`
                                : t("projects.retry")}
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
      <div className="mt-3 rounded-lg border border-border bg-surface px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[12px] font-semibold text-text">
            {t("projects.selectedImportRun")}
          </div>
          {details ? (
            <div className="text-[11px] text-text-secondary">
              {formatDateTime(details.created_at)}
            </div>
          ) : null}
        </div>
        {loadingDetails ? (
          <div className="mt-2 text-[12px] text-text-secondary">
            {t("projects.loadingImportRunDetails")}
          </div>
        ) : !details ? (
          <div className="mt-2 text-[12px] text-text-secondary">
            {t("projects.selectRunHint")}
          </div>
        ) : (
          <div className="mt-2 space-y-3 text-[12px]">
            <div className="overflow-hidden rounded-lg border border-border bg-surface">
              <MetricRow
                label={t("projects.modeLabel")}
                value={details.mode}
                barColor="blue"
              />
              <MetricRow
                label={t("common.status")}
                value={
                  <StatusBadge
                    status={details.status}
                    label={tokenLabel(
                      details.status,
                    )}
                    domain="sync"
                  />
                }
                barColor="green"
              />
              <MetricRow
                label={t("projects.file")}
                value={
                  <span
                    className="inline-block max-w-[16rem] truncate align-bottom"
                    title={
                      details.source_filename || "-"
                    }
                  >
                    {details.source_filename || "-"}
                  </span>
                }
                barColor="yellow"
              />
              <MetricRow
                label={t("projects.profile")}
                value={
                  <span className="inline-block max-w-[12rem] truncate align-bottom">
                    {details.mapping_profile
                      ? importProfileLabel(
                          details.mapping_profile,
                        )
                      : "-"}
                  </span>
                }
                barColor="orange"
              />
            </div>
            <div className="text-text-secondary">
              {t("projects.parsedSummary")
                .replace(
                  "{parsed}",
                  String(details.parsed_rows),
                )
                .replace(
                  "{prepared}",
                  String(details.prepared_rows),
                )
                .replace(
                  "{imported}",
                  String(details.imported),
                )
                .replace(
                  "{skipped}",
                  String(details.skipped),
                )
                .replace(
                  "{wouldPart}",
                  typeof details.would_import ===
                    "number" &&
                    typeof details.would_skip ===
                      "number"
                    ? t("projects.wouldImportSkip")
                        .replace(
                          "{wouldImport}",
                          String(
                            details.would_import,
                          ),
                        )
                        .replace(
                          "{wouldSkip}",
                          String(
                            details.would_skip,
                          ),
                        )
                    : "",
                )
                .replace(
                  "{idempotencyPart}",
                  details.idempotency_hit
                    ? t("projects.idempotencyPart")
                    : "",
                )}
            </div>
            {details.diagnostics
              ?.strict_required_fields !== undefined &&
            details.diagnostics
              ?.strict_required_fields !== null ? (
              <div className="text-text-secondary">
                {t("projects.strictRequiredFields").replace(
                  "{value}",
                  details.diagnostics
                    .strict_required_fields
                    ? t("projects.on")
                    : t("projects.off"),
                )}
              </div>
            ) : null}
            {details.diagnostics
              ?.missing_required_fields?.length ? (
              <div className="text-status-problem-fg">
                {t("projects.missingRequiredFields").replace(
                  "{fields}",
                  details.diagnostics.missing_required_fields.join(
                    ", ",
                  ),
                )}
              </div>
            ) : null}
            {details.diagnostics?.data_summary ? (
              <div>
                <div className="text-text-secondary">
                  {t("projects.runDataSummary")}
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {[
                    {
                      label: t("projects.orders"),
                      value:
                        details.diagnostics
                          .data_summary.unique_order_numbers,
                    },
                    {
                      label: t("projects.houses"),
                      value:
                        details.diagnostics
                          .data_summary.unique_houses,
                    },
                    {
                      label: t("projects.floors"),
                      value:
                        details.diagnostics
                          .data_summary.unique_floors,
                    },
                    {
                      label: t("projects.apartments"),
                      value:
                        details.diagnostics
                          .data_summary.unique_apartments,
                    },
                    {
                      label: t("projects.locations"),
                      value:
                        details.diagnostics
                          .data_summary.unique_locations,
                    },
                    {
                      label: t("projects.markings"),
                      value:
                        details.diagnostics
                          .data_summary.unique_markings,
                    },
                  ].map((item) => (
                    <span
                      key={item.label}
                      className="rounded-full border border-border bg-surface px-2.5 py-1 text-text"
                    >
                      {item.label}: {item.value}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            {canViewRates &&
            (details.diagnostics?.data_summary
              ?.zero_price_doors || 0) > 0 ? (
              <div className="rounded-lg border border-status-warning-border bg-status-warning-bg px-2.5 py-2 text-status-warning-fg">
                {copy(
                  "Zero client price doors: {count}. Check the source price column or default client price before importing.",
                  "Двери с нулевой ценой клиента: {count}. Проверьте колонку цены в файле или цену клиента по умолчанию перед импортом.",
                  "דלתות עם מחיר לקוח אפס: {count}. בדוק את עמודת המחיר בקובץ או מחיר ברירת מחדל לפני הייבוא.",
                ).replace(
                  "{count}",
                  String(
                    details.diagnostics
                      ?.data_summary?.zero_price_doors || 0,
                  ),
                )}
              </div>
            ) : null}
            {renderPreviewGroups(
              details.diagnostics,
              t("projects.runStructurePreview"),
            )}
            {details.diagnostics?.required_fields
              ?.length ? (
              <div>
                <div className="text-text-secondary">
                  {t("projects.requiredColumns")}
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {details.diagnostics.required_fields.map(
                    (field) => (
                      <span
                        key={field.field_key}
                        className={cn(
                          "rounded-full border px-2.5 py-1",
                          field.found
                            ? "border-status-ok-border bg-status-ok-bg text-status-ok-fg"
                            : "border-status-problem-border bg-status-problem-bg text-status-problem-fg",
                        )}
                      >
                        {field.display_name}:{" "}
                        {field.found
                          ? t("projects.found")
                          : t("projects.missing")}
                      </span>
                    ),
                  )}
                </div>
              </div>
            ) : null}
            {details.errors.length > 0 ? (
              <div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-text-secondary">
                    {t("projects.errorsPreview")}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      downloadImportErrorsCsv(
                        details.errors,
                        `dimax-import-errors-${safeDownloadFilename(
                          details.source_filename ||
                            details.id,
                        )}.csv`,
                      )
                    }
                    className="h-7 w-full justify-center px-2 text-[11px] sm:w-auto"
                  >
                    <Download
                      className="me-1.5 h-3.5 w-3.5"
                      aria-hidden="true"
                    />
                    {copy(
                      "Download error report",
                      "Скачать отчёт ошибок",
                      "הורד דוח שגיאות",
                    )}
                  </Button>
                </div>
                <div className="mt-1 space-y-1">
                  {details.errors
                    .slice(0, 5)
                    .map((errorItem) => (
                      <div
                        key={`${errorItem.row}-${errorItem.message}`}
                        className="rounded-lg border border-status-problem-border bg-status-problem-bg px-2 py-1 text-status-problem-fg"
                      >
                        {t("projects.rowError")
                          .replace("{row}", String(errorItem.row))
                          .replace("{message}", importRowErrorLabel(errorItem.message))}
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <div className="text-text-secondary">
                {t("projects.noRowErrors")}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
