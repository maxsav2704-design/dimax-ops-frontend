"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import { InstallerFinancialNotice } from "@/components/prices/InstallerFinancialNotice";
import { IssueExposureBasis, UnpricedExposureNotice } from "@/components/prices/IssueExposureBasis";

import { formatAmount, formatCount, formatDateTime, reportsPanelClass, useReportsText } from "./shared";
import type { IssuesAddonsImpactResponse } from "./types";

type IssuesAddonsImpactSectionProps = {
  query: UseQueryResult<IssuesAddonsImpactResponse>;
};

// Reports → "Add-on profit impact": open-issue exposure, delayed doors and realized add-on margin. Markup moved verbatim from ReportsPage (section split).
export function IssuesAddonsImpactSection({ query }: IssuesAddonsImpactSectionProps) {
  const { t, tt, copy, readError } = useReportsText();
  const impact = query.data;
  const summaryRows = [
    {
      label: tt("reports.openIssuesExposure"),
      revenue: formatAmount(impact?.summary?.open_issue_revenue_at_risk),
      payroll: formatAmount(impact?.summary?.open_issue_payroll_at_risk),
      profit: formatAmount(impact?.summary?.open_issue_profit_at_risk),
    },
    {
      label: tt("reports.delayedNotInstalled"),
      revenue: formatAmount(impact?.summary?.delayed_revenue_total),
      payroll: formatAmount(impact?.summary?.delayed_payroll_total),
      profit: formatAmount(impact?.summary?.delayed_profit_total),
    },
    {
      label: tt("reports.addonRealized"),
      revenue: formatAmount(impact?.summary?.addon_revenue_total),
      payroll: formatAmount(impact?.summary?.addon_payroll_total),
      profit: formatAmount(impact?.summary?.addon_profit_total),
    },
  ];

  return (
    <div
      id="reports-issues-addons-impact"
      className={reportsPanelClass("space-y-4 p-4")}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase text-text-secondary">
            {tt("reports.marginLeakageTitle")}
          </div>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-text">
            {tt("reports.marginLeakageSubtitle")}
          </h2>
        </div>
        <div className="text-end text-[11px] text-text-secondary">
          {impact?.generated_at
            ? formatDateTime(impact.generated_at)
            : tt("reports.notAvailableShort")}
        </div>
      </div>

      {query.isLoading ? (
        <div className="text-[13px] text-text-secondary">
          {tt("reports.loadingMarginLeakage")}
        </div>
      ) : query.isError ? (
        <div className="text-[13px] text-status-problem-fg">
          {readError(
            query.error,
            tt("reports.failedMarginLeakage"),
          )}
        </div>
      ) : (
        <>
          <IssueExposureBasis data={impact?.summary}
            reasonsShown={impact?.top_reasons?.length ?? 0}
            addonsShown={impact?.addon_impact?.length ?? 0} />
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-border bg-surface-subtle px-3 py-3">
              <div className="text-[11px] uppercase text-text-secondary">
                {tt("reports.openIssuesAtRisk")}
              </div>
              <div className="mt-1 text-lg font-semibold tabular-nums text-text">
                {formatCount(impact?.summary?.open_issues)}
              </div>
              <div className="mt-1 text-[11px] text-text-secondary">
                {tt("reports.profitAtRisk").replace(
                  "{amount}",
                  formatAmount(
                    impact?.summary?.open_issue_profit_at_risk,
                  ),
                )}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-surface-subtle px-3 py-3">
              <div className="text-[11px] uppercase text-text-secondary">
                {tt("reports.blockedMarginRisk")}
              </div>
              <div className="mt-1 text-lg font-semibold text-status-problem-fg">
                {formatCount(
                  impact?.summary?.blocked_open_issues,
                )}
              </div>
              <div className="mt-1 text-[11px] text-text-secondary">
                {tt("reports.blockedProfit").replace(
                  "{amount}",
                  formatAmount(
                    impact?.summary
                      ?.blocked_issue_profit_at_risk,
                  ),
                )}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-surface-subtle px-3 py-3">
              <div className="text-[11px] uppercase text-text-secondary">
                {tt("reports.delayedDoors")}
              </div>
              <div className="mt-1 text-lg font-semibold tabular-nums text-text">
                {impact?.summary?.not_installed_doors ?? 0}
              </div>
              <div className="mt-1 text-[11px] text-text-secondary">
                {tt("reports.delayedProfit").replace(
                  "{amount}",
                  formatAmount(
                    impact?.summary?.delayed_profit_total,
                  ),
                )}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-surface-subtle px-3 py-3">
              <div className="text-[11px] uppercase text-text-secondary">
                {tt("reports.addonUplift")}
              </div>
              <div className={`mt-1 text-lg font-semibold ${impact?.summary?.addon_profit_total == null ? "text-text-secondary" : impact.summary.addon_profit_total < 0 ? "text-status-problem-fg" : "text-status-ok-fg"}`}>
                {formatAmount(
                  impact?.summary?.addon_profit_total,
                )}
              </div>
              <div className="mt-1 text-[11px] text-text-secondary">
                {t("reports.missingPlans")}{" "}
                {impact?.summary?.missing_addon_plans_facts ??
                  0}
              </div>
            </div>
          </div>

          <div className="divide-y divide-border-subtle overflow-hidden rounded-lg border border-border bg-surface-subtle md:hidden">
            {summaryRows.map((row) => (
              <article key={row.label} className="px-3.5 py-3.5">
                <div className="text-[13px] font-semibold leading-5 text-text">
                  {row.label}
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div className="rounded-lg border border-border bg-surface px-2.5 py-2">
                    <div className="text-[10.5px] font-semibold uppercase text-text-secondary">
                      {copy("Revenue", "Выручка", "הכנסה")}
                    </div>
                    <div className="mt-1 text-[13px] font-medium text-text tabular-nums">
                      {row.revenue}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-surface px-2.5 py-2">
                    <div className="text-[10.5px] font-semibold uppercase text-text-secondary">
                      {copy("Payroll", "ФОТ", "שכר")}
                    </div>
                    <div className="mt-1 text-[13px] font-medium text-text tabular-nums">
                      {row.payroll}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-surface px-2.5 py-2">
                    <div className="text-[10.5px] font-semibold uppercase text-text-secondary">
                      {copy("Profit", "Прибыль", "רווח")}
                    </div>
                    <div className="mt-1 text-[13px] font-medium text-text tabular-nums">
                      {row.profit}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-auto rounded-lg border border-border bg-surface-subtle md:block">
            <table className="data-table">
              <thead className="bg-surface-subtle text-text-secondary">
                <tr>
                  <th className="text-start px-3 py-2 font-medium">
                    {tt("reports.summary")}
                  </th>
                  <th className="text-end px-3 py-2 font-medium">
                    {copy("Revenue", "Выручка", "הכנסה")}
                  </th>
                  <th className="text-end px-3 py-2 font-medium">
                    {copy("Payroll", "ФОТ", "שכר")}
                  </th>
                  <th className="text-end px-3 py-2 font-medium">
                    {copy("Profit", "Прибыль", "רווח")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {summaryRows.map((row) => (
                  <tr key={row.label} className="border-t border-border">
                    <td className="px-3 py-2.5 font-medium text-text">
                      {row.label}
                    </td>
                    <td className="px-3 py-2 text-end">{row.revenue}</td>
                    <td className="px-3 py-2 text-end">{row.payroll}</td>
                    <td className="px-3 py-2 text-end">{row.profit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="overflow-hidden rounded-lg border border-border bg-surface-subtle">
              <div className="border-b border-border px-3 py-2 text-[11px] uppercase text-text-secondary">
                {tt("reports.delayedByReason")}
              </div>
              <div className="divide-y divide-border-subtle md:hidden">
                {(impact?.top_reasons || []).length === 0 ? (
                  <div className="px-3.5 py-3 text-[12px] text-text-secondary">
                    {tt("reports.noDelayedReasons")}
                  </div>
                ) : (
                  (impact?.top_reasons || []).map((item) => (
                    <article
                      key={`${item.reason_id || item.reason_name}-mobile`}
                      className="px-3.5 py-3.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 text-[13px] font-semibold leading-5 text-text">
                          {item.reason_name}
                          <UnpricedExposureNotice count={item.unpriced_doors} />
                        </div>
                        <div className="shrink-0 rounded-full bg-surface px-2 py-1 text-[10.5px] font-medium leading-none text-text-secondary">
                          {copy("Doors", "Двери", "דלתות")}: {item.doors}
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="rounded-lg border border-border bg-surface px-2.5 py-2">
                          <div className="text-[10.5px] font-semibold uppercase text-text-secondary">
                            {copy("Revenue", "Выручка", "הכנסה")}
                          </div>
                          <div className="mt-1 text-[13px] font-medium text-text tabular-nums">
                            {formatAmount(item.revenue_delayed_total)}
                          </div>
                        </div>
                        <div className="rounded-lg border border-border bg-surface px-2.5 py-2">
                          <div className="text-[10.5px] font-semibold uppercase text-text-secondary">
                            {copy("Profit", "Прибыль", "רווח")}
                          </div>
                          <div className="mt-1 text-[13px] font-medium text-text tabular-nums">
                            {formatAmount(item.profit_delayed_total)}
                          </div>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
              <table className="data-table hidden md:table">
                <thead className="bg-surface-subtle text-text-secondary">
                  <tr>
                    <th className="text-start px-3 py-2 font-medium">
                      {copy("Reason", "Причина", "סיבה")}
                    </th>
                    <th className="text-end px-3 py-2 font-medium">
                      {copy("Doors", "Двери", "דלתות")}
                    </th>
                    <th className="text-end px-3 py-2 font-medium">
                      {copy("Revenue", "Выручка", "הכנסה")}
                    </th>
                    <th className="text-end px-3 py-2 font-medium">
                      {copy("Profit", "Прибыль", "רווח")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(impact?.top_reasons || []).length === 0 ? (
                    <tr>
                      <td
                        className="px-3 py-3 text-text-secondary"
                        colSpan={4}
                      >
                        {tt("reports.noDelayedReasons")}
                      </td>
                    </tr>
                  ) : (
                    (impact?.top_reasons || []).map((item) => (
                      <tr
                        key={item.reason_id || item.reason_name}
                        className="border-t border-border"
                      >
                        <td className="px-3 py-2.5 font-medium text-text">
                          {item.reason_name}
                          <UnpricedExposureNotice count={item.unpriced_doors} />
                        </td>
                        <td className="px-3 py-2 text-end">{item.doors}</td>
                        <td className="px-3 py-2 text-end">
                          {formatAmount(item.revenue_delayed_total)}
                        </td>
                        <td className="px-3 py-2 text-end">
                          {formatAmount(item.profit_delayed_total)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="overflow-hidden rounded-lg border border-border bg-surface-subtle">
              <div className="border-b border-border px-3 py-2 text-[11px] uppercase text-text-secondary">
                {tt("reports.addonProfitImpact")}
              </div>
              <div className="divide-y divide-border-subtle md:hidden">
                {(impact?.addon_impact || []).length === 0 ? (
                  <div className="px-3.5 py-3 text-[12px] text-text-secondary">
                    {tt("reports.noAddonImpactRows")}
                  </div>
                ) : (
                  (impact?.addon_impact || []).map((item) => (
                    <article
                      key={`${item.addon_type_id || item.addon_name}-mobile`}
                      className="px-3.5 py-3.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 text-[13px] font-semibold leading-5 text-text">
                          {item.addon_name}
                          <InstallerFinancialNotice data={item} />
                        </div>
                        <div className="shrink-0 rounded-full bg-surface px-2 py-1 text-[10.5px] font-medium leading-none text-text-secondary">
                          {copy("Qty", "Кол-во", "כמות")}:{" "}
                          {formatAmount(item.qty_done)}
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="rounded-lg border border-border bg-surface px-2.5 py-2">
                          <div className="text-[10.5px] font-semibold uppercase text-text-secondary">
                            {copy("Profit", "Прибыль", "רווח")}
                          </div>
                          <div className="mt-1 text-[13px] font-medium text-text tabular-nums">
                            {formatAmount(item.profit_total)}
                          </div>
                        </div>
                        <div className="rounded-lg border border-border bg-surface px-2.5 py-2">
                          <div className="text-[10.5px] font-semibold uppercase text-text-secondary">
                            {tt("reports.missingPlans")}
                          </div>
                          <div className="mt-1 text-[13px] font-medium text-text tabular-nums">
                            {item.missing_plan_facts}
                          </div>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
              <table className="data-table hidden md:table">
                <thead className="bg-surface-subtle text-text-secondary">
                  <tr>
                    <th className="text-start px-3 py-2 font-medium">
                      {tt("reports.addon")}
                    </th>
                    <th className="text-end px-3 py-2 font-medium">
                      {copy("Qty", "Кол-во", "כמות")}
                    </th>
                    <th className="text-end px-3 py-2 font-medium">
                      {copy("Profit", "Прибыль", "רווח")}
                    </th>
                    <th className="text-end px-3 py-2 font-medium">
                      {tt("reports.missingPlans")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(impact?.addon_impact || []).length === 0 ? (
                    <tr>
                      <td
                        className="px-3 py-3 text-text-secondary"
                        colSpan={4}
                      >
                        {tt("reports.noAddonImpactRows")}
                      </td>
                    </tr>
                  ) : (
                    (impact?.addon_impact || []).map((item) => (
                      <tr
                        key={item.addon_type_id || item.addon_name}
                        className="border-t border-border"
                      >
                        <td className="px-3 py-2.5 font-medium text-text">
                          {item.addon_name}
                          <InstallerFinancialNotice data={item} />
                        </td>
                        <td className="px-3 py-2 text-end">
                          {formatAmount(item.qty_done)}
                        </td>
                        <td className="px-3 py-2 text-end">
                          {formatAmount(item.profit_total)}
                        </td>
                        <td className="px-3 py-2 text-end">
                          {item.missing_plan_facts}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
