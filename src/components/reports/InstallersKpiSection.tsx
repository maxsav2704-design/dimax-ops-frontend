"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import { InstallerFinancialBand, InstallerFinancialBasis, InstallerFinancialNotice } from "@/components/prices/InstallerFinancialNotice";
import { installerFinancialDataRisk } from "@/lib/installer-financials";
import { cn } from "@/lib/utils";

import { INSTALLER_PROJECT_SORT_OPTIONS, SORT_DIR_OPTIONS, formatAmount, formatPercent, installerPerformanceBandClass, reportsPanelClass, useReportsText } from "./shared";
import { SectionMessage } from "./widgets";
import type { InstallerProjectProfitabilityResponse, InstallerProjectSortBy, SortDir } from "./types";

type InstallersKpiSectionProps = {
  query: UseQueryResult<InstallerProjectProfitabilityResponse>;
  sortBy: InstallerProjectSortBy;
  sortDir: SortDir;
  onSortByChange: (value: InstallerProjectSortBy) => void;
  onSortDirChange: (value: SortDir) => void;
};

// Reports → "Installer × project profitability" (installers KPI table) with sort controls. Markup moved verbatim from ReportsPage (section split).
export function InstallersKpiSection({ query, sortBy, sortDir, onSortByChange, onSortDirChange }: InstallersKpiSectionProps) {
  const { t, tt, copy, readError, optionLabel } = useReportsText();
  const rows = query.data?.items || [];

  return (
    <div
      id="reports-installers-kpi"
      className={reportsPanelClass("overflow-hidden")}
    >
      <div className="px-4 py-3 border-b border-border bg-surface-subtle flex flex-col items-stretch gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="text-[11px] uppercase text-text-secondary">
            {tt("reports.installerCrossViewTitle")}
          </div>
          <div className="text-[13px] text-text-secondary">
            {tt("reports.installerCrossViewSubtitle")}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <select
            aria-label={copy("Installer Project Sort", "Сортировка объектов монтажника", "מיון פרויקטים של מתקין")}
            value={sortBy}
            onChange={(e) =>
              onSortByChange(
                e.target.value as InstallerProjectSortBy,
              )
            }
            className="h-9 w-full min-w-0 rounded-md border border-border bg-surface px-2 text-[13px] xl:w-auto xl:max-w-[180px]"
          >
            {INSTALLER_PROJECT_SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {optionLabel(option.label)}
              </option>
            ))}
          </select>
          <select
            aria-label={copy("Installer Project Direction", "Направление сортировки объектов монтажника", "כיוון מיון פרויקטים של מתקין")}
            value={sortDir}
            onChange={(e) =>
              onSortDirChange(e.target.value as SortDir)
            }
            className="h-9 w-full min-w-0 rounded-md border border-border bg-surface px-2 text-[13px] xl:w-auto xl:max-w-[120px]"
          >
            {SORT_DIR_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!query.isError && <InstallerFinancialBasis data={query.data} />}
      {query.isLoading ? (
        <div className="px-4 py-6 text-[13px] text-text-secondary">
          {tt("reports.loadingInstallerCrossView")}
        </div>
      ) : query.isError ? (
        <div className="px-4 py-6 text-[13px] text-status-problem-fg">
          {readError(
            query.error,
            copy(
              "Failed to load installer-project cross-view",
              "Не удалось загрузить перекрестное представление проекта монтажника.",
              "טעינת הצגה צולבת של מתקין-פרויקט נכשלה",
            ),
          )}
        </div>
      ) : rows.length === 0 ? (
        <div className="px-4 py-6">
          <SectionMessage
            title={copy(
              "No installer-project cross-view rows",
              "Нет строк перекрестного просмотра монтажника и проекта.",
              "אין שורות צולבות של פרויקט מתקין",
            )}
            detail={copy(
              "This view appears after installed doors or add-on facts create measurable profitability per installer and project.",
              "Это представление появляется после того, как установленные двери или дополнительные элементы создают измеримую прибыльность для каждого монтажника и проекта.",
              "תצוגה זו מופיעה לאחר שדלתות מותקנות או עובדות תוספות יוצרות רווחיות מדידה לכל מתקין ופרויקט.",
            )}
          />
        </div>
      ) : (
        <>
          <div className="divide-y divide-border-subtle md:hidden">
            {rows.map((item) => (
              <article
                key={`mobile-${item.installer_id}-${item.project_id}`}
                className="px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold leading-5 text-text">
                      {item.installer_name}
                    </div>
                    <div className="mt-1 text-[11px] leading-4 text-text-secondary">
                      {item.project_name ?? copy("Project unavailable", "Объект недоступен", "הפרויקט אינו זמין")}
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
            <table className="w-full text-[12px]">
              <thead className="bg-surface-subtle text-text-secondary">
                <tr>
                  <th className="text-start px-3 py-2 font-medium">
                    {copy(
                      "Installer / Project",
                      "Монтажник / проект",
                      "מתקין / פרויקט",
                    )}
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
                {rows.map((item) => {
                  const bandClass = installerPerformanceBandClass(
                    item.performance_band,
                  );
                  return (
                    <tr
                      key={`${item.installer_id}-${item.project_id}`}
                      className="border-t border-border"
                    >
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-text">
                          {item.installer_name}
                        </div>
                        <div className="text-[11px] text-text-secondary">
                          {item.project_name ?? copy("Project unavailable", "Объект недоступен", "הפרויקט אינו זמין")}
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
