"use client";

import { useRouter } from "next/navigation";

import { formatReportDateTime, reportsMetricCardClass, reportsPanelClass, useReportsText } from "./shared";
import type { OperationsCenterResponse } from "./types";

type OperationsCenterSectionProps = {
  center: OperationsCenterResponse | undefined;
  loading: boolean;
  /** Unread limit alerts from the alerts query; the center's own count wins when present. */
  unreadCount: number;
};

// Reports → "Operations command center": import/outbox/alert pressure for the
// last window and the projects with the most failed runs. Markup moved
// verbatim from ReportsPage (section split, step 1).
export function OperationsCenterSection({ center, loading, unreadCount }: OperationsCenterSectionProps) {
  const router = useRouter();
  const { t, tt, copy } = useReportsText();
  const topFailingProjects = center?.top_failing_projects || [];

  return (
    <div
      id="reports-operations-center"
      className={reportsPanelClass("relative overflow-hidden p-4")}
    >
      <div className="relative z-10 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase text-text-secondary">
              {t("reports.operationsCommandCenter")}
            </div>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-text">
              {t("reports.realTimePressureMap")}
            </h2>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="text-end">
              <div className="text-[11px] uppercase text-text-secondary">
                {t("reports.generated")}
              </div>
              <div className="text-[12px] text-text">
                {center?.generated_at
                  ? formatReportDateTime(center.generated_at)
                  : t("reports.notAvailable")}
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => router.push("/operations")}
                className="dmx-secondary-action"
              >
                {tt("reports.openOperationsCenter")}
              </button>
              <button
                type="button"
                onClick={() => router.push("/operations?actionable=1")}
                className="dmx-secondary-action"
              >
                {tt("reports.openActionableOps")}
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-[13px] text-text-secondary">
            {tt("reports.loadingCommandCenter")}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-4">
            <div className={reportsMetricCardClass("soft")}>
              <div className="text-[11px] uppercase text-text-secondary">
                {t("reports.imports24h")}
              </div>
              <div className="mt-1 text-xl font-semibold text-text">
                {center?.imports?.total_runs ?? 0}
              </div>
              <div className="mt-1 text-[12px] text-text-secondary">
                {copy("Success", "Успех", "הצלחה")} {center?.imports?.success_runs ?? 0} {copy("| Partial", "| Частичный", "| חלקי")} {center?.imports?.partial_runs ?? 0} {copy("| Failed", "| Не удалось", "| נכשל")} {center?.imports?.failed_runs ?? 0}
              </div>
            </div>

            <div className={reportsMetricCardClass("soft")}>
              <div className="text-[11px] uppercase text-text-secondary">
                {tt("reports.importModes")}
              </div>
              <div className="mt-1 text-xl font-semibold text-text">
                {center?.imports?.import_runs ?? 0}
              </div>
              <div className="mt-1 text-[12px] text-text-secondary">
                {tt("reports.analyzeRetry")
                  .replace(
                    "{analyze}",
                    String(center?.imports?.analyze_runs ?? 0),
                  )
                  .replace(
                    "{retry}",
                    String(center?.imports?.retry_runs ?? 0),
                  )}
              </div>
            </div>

            <div className={reportsMetricCardClass("danger")}>
              <div className="text-[11px] uppercase text-text-secondary">
                {tt("reports.outboxRisk")}
              </div>
              <div className="mt-1 text-xl font-semibold text-text">
                {center?.outbox?.failed_total ?? 0}
              </div>
              <div className="mt-1 text-[12px] text-text-secondary">
                {copy("Failed | Overdue", "Ошибка | Просрочено", "נכשל | באיחור")}{" "}
                {center?.outbox?.pending_overdue_15m ?? 0}
              </div>
            </div>

            <div className={reportsMetricCardClass("warning")}>
              <div className="text-[11px] uppercase text-text-secondary">
                {tt("reports.limitAlerts")}
              </div>
              <div className="mt-1 text-xl font-semibold text-text">
                {center?.alerts?.unread_count ?? unreadCount}
              </div>
              <div className="mt-1 text-[12px] text-text-secondary">
                {tt("reports.warnDanger24h")
                  .replace(
                    "{warn}",
                    String(center?.alerts?.warn_last_24h ?? 0),
                  )
                  .replace(
                    "{danger}",
                    String(center?.alerts?.danger_last_24h ?? 0),
                  )}
              </div>
            </div>
          </div>
        )}

        <div className="surface-subtle p-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="text-[11px] uppercase text-text-secondary">
              {tt("reports.topFailingProjectsTitle")}
            </div>
            <button
              onClick={() => {
                if (topFailingProjects.length === 0) {
                  return;
                }
                const ids = topFailingProjects
                  .map((item) => item.project_id)
                  .join(",");
                router.push(
                  `/projects?failed_project_ids=${encodeURIComponent(
                    ids,
                  )}&only_failed_runs=1`,
                );
              }}
              disabled={topFailingProjects.length === 0}
              className="dmx-secondary-action disabled:opacity-50"
            >
              {tt("reports.openInProjects")}
            </button>
          </div>
          {topFailingProjects.length === 0 ? (
            <div className="text-[12px] text-text-secondary">
              {tt("reports.noFailingProjectsCurrentWindow")}
            </div>
          ) : (
            <div className="grid gap-2">
              {topFailingProjects.slice(0, 3).map((item) => (
                <div
                  key={`${item.project_id}-${item.last_run_at}`}
                  className="grid grid-cols-[1fr_80px_170px_74px] items-center gap-2 rounded-lg border border-border bg-surface-subtle px-3 py-2 text-[12px]"
                >
                  <div className="font-medium text-text truncate">
                    {item.project_name}
                  </div>
                  <div className="text-text-secondary text-end">
                    {tt("reports.failureRuns").replace(
                      "{count}",
                      String(item.failure_runs),
                    )}
                  </div>
                  <div className="text-text-secondary text-end">
                    {formatReportDateTime(item.last_run_at)}
                  </div>
                  <button
                    onClick={() =>
                      router.push(
                        `/projects?project_id=${encodeURIComponent(
                          item.project_id,
                        )}&failed_project_ids=${encodeURIComponent(
                          item.project_id,
                        )}&only_failed_runs=1`,
                      )
                    }
                    className="h-7 rounded-lg border border-border bg-surface-subtle px-2 text-[11px] font-medium"
                  >
                    {tt("reports.openShort")}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
