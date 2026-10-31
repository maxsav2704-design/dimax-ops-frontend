"use client";

import type { UseQueryResult } from "@tanstack/react-query";

import { ISSUES_ANALYTICS_DAYS, formatCount, formatDateTime, formatPercent, reportsPanelClass, useReportsText } from "./shared";
import { statusLabel } from "@/lib/status-labels";
import type { IssuesAnalyticsResponse } from "./types";

type IssuesAnalyticsSectionProps = {
  query: UseQueryResult<IssuesAnalyticsResponse>;
};

// Reports → "Issues analytics": issue counts, reasons and ageing for the last window. Markup moved verbatim from ReportsPage (section split).
export function IssuesAnalyticsSection({ query }: IssuesAnalyticsSectionProps) {
  const { tt, copy, readError, locale } = useReportsText();
  const analytics = query.data;

  return (
    <div
      id="reports-issues-analytics"
      className={reportsPanelClass("space-y-4 p-4")}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase text-text-secondary">
            {tt("reports.issuesAnalyticsTitle")}
          </div>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-text">
            {tt("reports.issuesAnalyticsSubtitle")}
          </h2>
        </div>
        <div className="text-end text-[11px] text-text-secondary">
          {analytics?.generated_at
            ? formatDateTime(analytics.generated_at)
            : tt("reports.notAvailableShort")}
        </div>
      </div>

      {query.isLoading ? (
        <div className="text-[13px] text-text-secondary">
          {tt("reports.loadingIssuesAnalytics")}
        </div>
      ) : query.isError ? (
        <div className="text-[13px] text-status-problem-fg">
          {readError(
            query.error,
            tt("reports.failedIssuesAnalytics"),
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-5">
            <div className="rounded-lg border border-border bg-surface-subtle px-3 py-3">
              <div className="text-[11px] uppercase text-text-secondary">
                {tt("reports.openTotal")}
              </div>
              <div className="mt-1 text-lg font-semibold tabular-nums text-text">
                {formatCount(analytics?.summary.open_issues)} /{" "}
                {formatCount(analytics?.summary.total_issues)}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-surface-subtle px-3 py-3">
              <div className="text-[11px] uppercase text-text-secondary">
                {tt("reports.overdueRate")}
              </div>
              <div className="mt-1 text-lg font-semibold text-status-problem-fg">
                {formatPercent(
                  analytics?.summary.overdue_open_rate_pct,
                )}
              </div>
              <div className="mt-1 text-[11px] text-text-secondary">
                {tt("reports.overdueOpen").replace(
                  "{count}",
                  formatCount(analytics?.summary.overdue_open_issues),
                )}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-surface-subtle px-3 py-3">
              <div className="text-[11px] uppercase text-text-secondary">
                {copy("MTTR (h)", "Среднее время восстановления (ч)", "MTTR (ח)")}
              </div>
              <div className="mt-1 text-lg font-semibold tabular-nums text-text">
                {analytics?.summary.mttr_hours ?? 0}
              </div>
              <div className="mt-1 text-[11px] text-text-secondary">
                P50: {analytics?.summary.mttr_p50_hours ?? 0} | n=
                {analytics?.summary.mttr_sample_size ?? 0}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-surface-subtle px-3 py-3">
              <div className="text-[11px] uppercase text-text-secondary">
                {tt("reports.blockedOpen")}
              </div>
              <div className="mt-1 text-lg font-semibold text-status-warning-fg">
                {analytics?.summary.blocked_open_issues ?? 0}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-surface-subtle px-3 py-3">
              <div className="text-[11px] uppercase text-text-secondary">
                {copy("P1 open", "P1 открыто", "P1 פתוחות")}
              </div>
              <div className="mt-1 text-lg font-semibold text-status-problem-fg">
                {analytics?.summary.p1_open_issues ?? 0}
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-border bg-surface-subtle px-3 py-3">
              <div className="text-[11px] uppercase text-text-secondary mb-2">
                {tt("reports.backlogByWorkflow")}
              </div>
              <div className="space-y-1 text-[12px]">
                {Object.entries(
                  analytics?.summary.backlog_by_workflow || {},
                ).map(([workflow, count]) => (
                  <div
                    key={workflow}
                    className="flex items-center justify-between"
                  >
                    <span className="text-text-secondary">{statusLabel(workflow, locale, "issue")}</span>
                    <span className="font-medium text-text">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-surface-subtle px-3 py-3">
              <div className="text-[11px] uppercase text-text-secondary mb-2">
                {tt("reports.backlogByPriority")}
              </div>
              <div className="space-y-1 text-[12px]">
                {Object.entries(
                  analytics?.summary.backlog_by_priority || {},
                ).map(([priority, count]) => (
                  <div
                    key={priority}
                    className="flex items-center justify-between"
                  >
                    <span className="text-text-secondary">{priority}</span>
                    <span className="font-medium text-text">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2 rounded-lg border border-border bg-surface-subtle px-3 py-3">
            <div className="text-[11px] uppercase text-text-secondary">
              {tt("reports.trendLastDays").replace(
                "{days}",
                String(analytics?.days ?? ISSUES_ANALYTICS_DAYS),
              )}
            </div>
            {(analytics?.trend || []).slice(-10).map((point) => (
              <div
                key={point.day}
                className="grid grid-cols-[90px_70px_70px_1fr] gap-2 items-center text-[11px]"
              >
                <span className="text-text-secondary">{point.day}</span>
                <span className="text-status-ok-fg">+{point.opened}</span>
                <span className="text-status-problem-fg">
                  -{point.closed}
                </span>
                <div className="h-2 rounded bg-surface-sunken overflow-hidden">
                  <div
                    className="h-full bg-accent"
                    style={{
                      width: `${Math.min(100, point.backlog_open_end)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
