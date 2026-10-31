"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import { entityKey } from "@/components/dimax";
import { InstallerFinancialBand, InstallerFinancialBasis, InstallerFinancialNotice } from "@/components/prices/InstallerFinancialNotice";
import { installerFinancialDataRisk } from "@/lib/installer-financials";
import { cn } from "@/lib/utils";

import { INSTALLER_MATRIX_SORT_OPTIONS, SORT_DIR_OPTIONS, formatAmount, formatPercent, installerPerformanceBandClass, reportsPanelClass, useReportsText } from "./shared";
import type { InstallerMatrixSortBy, InstallerProfitabilityMatrixResponse, SortDir } from "./types";

type InstallerCrossViewSectionProps = {
  query: UseQueryResult<InstallerProfitabilityMatrixResponse>;
  sortBy: InstallerMatrixSortBy;
  sortDir: SortDir;
  onSortByChange: (value: InstallerMatrixSortBy) => void;
  onSortDirChange: (value: SortDir) => void;
};

// Reports → "Installer cross view": profitability matrix per installer with sort controls. Markup moved verbatim from ReportsPage (section split).
export function InstallerCrossViewSection({ query, sortBy, sortDir, onSortByChange, onSortDirChange }: InstallerCrossViewSectionProps) {
  const { t, tt, copy, readError, optionLabel } = useReportsText();
  const matrix = query.data?.items || [];

  return (
    <div
      id="reports-installer-cross-view"
      className={reportsPanelClass("overflow-hidden")}
    >
      <div className="px-4 py-3 border-b border-border bg-surface-subtle flex flex-col items-stretch gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="text-[11px] uppercase text-text-secondary">
            {tt("reports.installerProfitabilityMatrix")}
          </div>
          <div className="text-[13px] text-text-secondary">
            {tt("reports.installerProfitabilitySubtitle")}
          </div>
        </div>
        <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 xl:flex xl:flex-wrap xl:items-center xl:justify-end">
          <select
            aria-label={copy("Installer Matrix Sort", "Сортировка матрицы монтажников", "מיון מטריצת מתקינים")}
            value={sortBy}
            onChange={(e) =>
              onSortByChange(
                e.target.value as InstallerMatrixSortBy,
              )
            }
            className="h-9 w-full min-w-0 rounded-md border border-border bg-surface px-2 text-[13px] xl:w-auto xl:max-w-[220px]"
          >
            {INSTALLER_MATRIX_SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {optionLabel(option.label)}
              </option>
            ))}
          </select>
          <select
            aria-label={copy("Installer Matrix Direction", "Направление сортировки матрицы монтажников", "כיוון מיון מטריצת מתקינים")}
            value={sortDir}
            onChange={(e) =>
              onSortDirChange(e.target.value as SortDir)
            }
            className="h-9 w-full min-w-0 rounded-md border border-border bg-surface px-2 text-[13px] xl:w-auto xl:max-w-[220px]"
          >
            {SORT_DIR_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {optionLabel(option.label)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!query.isError && <InstallerFinancialBasis data={query.data} />}
      {query.isLoading ? (
        <div className="px-4 py-6 text-[13px] text-text-secondary">
          {tt("reports.loadingInstallerProfitability")}
        </div>
      ) : query.isError ? (
        <div className="px-4 py-6 text-[13px] text-status-problem-fg">
          {readError(
            query.error,
            copy(
              "Failed to load installer profitability matrix",
              "Не удалось загрузить матрицу прибыльности монтажников",
              "טעינת מטריצת רווחיות המתקינים נכשלה",
            ),
          )}
        </div>
      ) : matrix.length === 0 ? (
        <div className="px-4 py-6 text-[13px] text-text-secondary">
          {copy(
            "No installer profitability rows.",
            "Нет строк прибыльности по монтажникам.",
            "אין שורות רווחיות למתקינים.",
          )}
        </div>
      ) : (
        <>
          <div className="divide-y divide-border-subtle md:hidden">
            {matrix.map((item) => (
              <article
                key={`mobile-${item.installer_id}`}
                className="px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold leading-5 text-text">
                      {item.installer_name}
                    </div>
                    <div className="mt-1 text-[11px] leading-4 text-text-secondary">
                      {tt("reports.projectsAddons")
                        .replace("{projects}", String(item.active_projects))
                        .replace(
                          "{addons}",
                          formatAmount(item.addons_done_qty),
                        )}
                    </div>
                  </div>
                  <span
                    className={cn(
                      "max-w-[50%] shrink-0 break-words rounded border px-2 py-0.5 text-[11px] font-semibold",
                      installerPerformanceBandClass(item.performance_band),
                    )}
                  >
                    <InstallerFinancialBand band={item.performance_band} />
                  </span>
                </div>
                <InstallerFinancialNotice data={item} />
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                    <div className="text-[10px] uppercase text-text-secondary">
                      {copy("Installed", "Смонтировано", "הותקן")}
                    </div>
                    <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                      {item.installed_doors}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                    <div className="text-[10px] uppercase text-text-secondary">
                      {copy("Revenue", "Выручка", "הכנסה")}
                    </div>
                    <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                      {formatAmount(item.revenue_total)}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                    <div className="text-[10px] uppercase text-text-secondary">
                      {copy("Earned", "Начислено", "שכר שנצבר")}
                    </div>
                    <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                      {formatAmount(item.payroll_total)}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                    <div className="text-[10px] uppercase text-text-secondary">
                      {copy("Profit", "Прибыль", "רווח")}
                    </div>
                    <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                      {formatAmount(item.profit_total)}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                    <div className="text-[10px] uppercase text-text-secondary">
                      {copy("Margin", "Маржа", "מרווח")}
                    </div>
                    <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                      {formatPercent(item.margin_pct)}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                    <div className="text-[10px] uppercase text-text-secondary">
                      {copy("Issues", "Проблемы", "תקלות")}
                    </div>
                    <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                      {item.open_issues}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                    <div className="text-[10px] uppercase text-text-secondary">
                      {copy("Data Risk", "Риск данных", "סיכון נתונים")}
                    </div>
                    <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                      {installerFinancialDataRisk(item)}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <div className="hidden overflow-auto md:block">
            <table className="data-table">
              <thead className="bg-surface-subtle text-text-secondary">
                <tr>
                  <th className="text-start px-3 py-2 font-medium">
                    {copy("Installer", "Монтажник", "מתקין")}
                  </th>
                  <th className="text-start px-3 py-2 font-medium">
                    {copy("Band", "Сегмент", "קטגוריה")}
                  </th>
                  <th className="text-end px-3 py-2 font-medium">
                    {copy("Installed", "Смонтировано", "הותקן")}
                  </th>
                  <th className="text-end px-3 py-2 font-medium">
                    {copy("Revenue", "Выручка", "הכנסה")}
                  </th>
                  <th className="text-end px-3 py-2 font-medium">
                    {copy("Earned", "Начислено", "שכר שנצבר")}
                  </th>
                  <th className="text-end px-3 py-2 font-medium">
                    {copy("Profit", "Прибыль", "רווח")}
                  </th>
                  <th className="text-end px-3 py-2 font-medium">
                    {copy("Margin", "Маржа", "מרווח")}
                  </th>
                  <th className="text-end px-3 py-2 font-medium">
                    {copy("Profit / Door", "Прибыль / дверь", "רווח / דלת")}
                  </th>
                  <th className="text-end px-3 py-2 font-medium">
                    {copy("Issues", "Проблемы", "תקלות")}
                  </th>
                  <th className="text-end px-3 py-2 font-medium">
                    {copy("Data Risk", "Риск данных", "סיכון נתונים")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {matrix.map((item) => {
                  const bandClass = installerPerformanceBandClass(
                    item.performance_band,
                  );
                  return (
                    <tr
                      data-entity={entityKey("installer", item.installer_id)}
                      key={item.installer_id}
                      className="border-t border-border"
                    >
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-text">
                          {item.installer_name}
                        </div>
                        <div className="text-[11px] text-text-secondary">
                          {tt("reports.projectsAddons")
                            .replace(
                              "{projects}",
                              String(item.active_projects),
                            )
                            .replace(
                              "{addons}",
                              formatAmount(item.addons_done_qty),
                            )}
                        </div>
                        <InstallerFinancialNotice data={item} />
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={cn(
                            "inline-flex rounded border px-2 py-0.5 text-[11px] font-semibold",
                            bandClass,
                          )}
                        >
                          <InstallerFinancialBand band={item.performance_band} />
                        </span>
                      </td>
                      <td className="px-3 py-2 text-end">
                        {item.installed_doors}
                      </td>
                      <td className="px-3 py-2 text-end">
                        {formatAmount(item.revenue_total)}
                      </td>
                      <td className="px-3 py-2 text-end">
                        {formatAmount(item.payroll_total)}
                      </td>
                      <td className="px-3 py-2 text-end">
                        {formatAmount(item.profit_total)}
                      </td>
                      <td className="px-3 py-2 text-end">
                        {formatPercent(item.margin_pct)}
                      </td>
                      <td className="px-3 py-2 text-end">
                        {formatAmount(item.avg_profit_per_door)}
                      </td>
                      <td className="px-3 py-2 text-end">
                        {item.open_issues}
                      </td>
                      <td className="px-3 py-2 text-end">
                        {installerFinancialDataRisk(item)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
