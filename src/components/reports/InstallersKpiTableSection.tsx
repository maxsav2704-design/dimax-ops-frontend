"use client";

import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import { entityKey } from "@/components/dimax";
import { InstallerFinancialBasis, InstallerFinancialNotice } from "@/components/prices/InstallerFinancialNotice";
import { installerFinancialDataRisk } from "@/lib/installer-financials";

import { INSTALLERS_SORT_OPTIONS, KPI_PAGE_SIZE, SORT_DIR_OPTIONS, formatAmount, formatCount, reportsPanelClass, useReportsText } from "./shared";
import type { InstallersKpiResponse, InstallersSortBy, SortDir } from "./types";

type InstallersKpiTableSectionProps = {
  query: UseQueryResult<InstallersKpiResponse>;
  items: InstallersKpiResponse["items"];
  sortBy: InstallersSortBy;
  sortDir: SortDir;
  onSortByChange: (value: InstallersSortBy) => void;
  onSortDirChange: (value: SortDir) => void;
  onOffsetChange: (value: number | ((prev: number) => number)) => void;
  canPrev: boolean;
  canNext: boolean;
  exportMutation: UseMutationResult<void, Error, void>;
  canExportFinancialReports: boolean;
  ratesScopeHint: string | undefined;
};

// Reports → installers KPI table (section id reports-order-numbers-kpi): paged, sortable scorecard with CSV export. Markup moved verbatim from ReportsPage (section split).
export function InstallersKpiTableSection({ query, items, sortBy, sortDir, onSortByChange, onSortDirChange, onOffsetChange, canPrev, canNext, exportMutation, canExportFinancialReports, ratesScopeHint }: InstallersKpiTableSectionProps) {
  const { t, tt, copy, readError } = useReportsText();

  return (
    <div
      id="reports-order-numbers-kpi"
      className={reportsPanelClass("overflow-hidden")}
    >
      <div className="px-4 py-3 border-b border-border bg-surface-subtle flex flex-col items-stretch gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="text-[11px] uppercase text-text-secondary">
            {tt("reports.installersKpiTitle")}
          </div>
          <div className="text-[13px] text-text-secondary">
            {tt("reports.installersKpiSubtitle")}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <select
            aria-label={copy("Installers: sort by", "Монтажники: сортировать по", "מתקינים: מיון לפי")}
            value={sortBy}
            onChange={(e) => {
              onSortByChange(e.target.value as InstallersSortBy);
              onOffsetChange(0);
            }}
            className="h-9 rounded-md border border-border bg-surface px-2 text-[13px]"
          >
            {INSTALLERS_SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            aria-label={copy("Installers: sort direction", "Монтажники: направление сортировки", "מתקינים: כיוון מיון")}
            value={sortDir}
            onChange={(e) => {
              onSortDirChange(e.target.value as SortDir);
              onOffsetChange(0);
            }}
            className="h-9 rounded-md border border-border bg-surface px-2 text-[13px]"
          >
            {SORT_DIR_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => exportMutation.mutate()}
            disabled={
              !canExportFinancialReports ||
              exportMutation.isPending
            }
            title={ratesScopeHint}
            className="h-9 w-full rounded-md border border-border bg-surface px-3 text-[12px] disabled:opacity-50 xl:w-auto"
          >
            {tt("reports.exportInstallersCsv")}
          </button>
        </div>
      </div>

      {!query.isError && <InstallerFinancialBasis data={query.data} period />}
      <div className="hidden md:grid grid-cols-[minmax(0,1fr)_repeat(5,minmax(0,100px))] gap-3 px-4 py-3 border-b border-border text-[11px] uppercase text-text-secondary">
        <span>{copy("Installer", "Монтажник", "מתקין")}</span>
        <span className="text-end">
          {copy("Installed", "Смонтировано", "הותקן")}
        </span>
        <span className="text-end">{copy("Payroll", "ФОТ", "שכר")}</span>
        <span className="text-end">
          {copy("Revenue", "Выручка", "הכנסה")}
        </span>
        <span className="text-end">
          {copy("Profit", "Прибыль", "רווח")}
        </span>
        <span className="text-end">
          {copy("Data gaps", "Пробелы данных", "נתונים חסרים")}
        </span>
      </div>

      {query.isLoading && (
        <div className="px-4 py-6 text-[13px] text-text-secondary">
          {tt("reports.loadingInstallersKpi")}
        </div>
      )}
      {query.isError && (
        <div className="px-4 py-6 text-[13px] text-status-problem-fg">
          {readError(
            query.error,
            copy(
              "Failed to load installers KPI",
              "Не удалось загрузить KPI монтажников",
              "טעינת KPI המתקינים נכשלה",
            ),
          )}
        </div>
      )}
      {!query.isLoading &&
        !query.isError &&
        items.length === 0 && (
          <div className="px-4 py-6 text-[13px] text-text-secondary">
            {copy(
              "No installers KPI rows.",
              "Нет строк KPI по монтажникам.",
              "אין שורות KPI למתקינים.",
            )}
          </div>
        )}
      {!query.isLoading &&
        !query.isError &&
        items.map((item) => (
          <div key={item.installer_id} data-entity={entityKey("installer", item.installer_id)} className="border-t border-border">
            <article className="px-4 py-3 md:hidden">
              <div className="text-[13px] font-semibold leading-5 text-text">
                {item.installer_name}
              </div>
              <InstallerFinancialNotice data={item} />
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                  <div className="text-[10px] uppercase text-text-secondary">
                    {copy("Installed", "Смонтировано", "הותקן")}
                  </div>
                  <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                    {formatCount(item.installed_doors)}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                  <div className="text-[10px] uppercase text-text-secondary">
                    {copy("Payroll", "ФОТ", "שכר")}
                  </div>
                  <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                    {formatAmount(item.payroll_total)}
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
                    {copy("Profit", "Прибыль", "רווח")}
                  </div>
                  <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                    {formatAmount(item.profit_total)}
                  </div>
                </div>
                <div className="col-span-2 rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                  <div className="text-[10px] uppercase text-text-secondary">
                    {copy("Data gaps", "Пробелы данных", "נתונים חסרים")}
                  </div>
                  <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                    {formatCount(installerFinancialDataRisk(item))}
                  </div>
                </div>
              </div>
            </article>
            <div className="hidden md:grid grid-cols-[minmax(0,1fr)_repeat(5,minmax(0,100px))] gap-3 px-4 py-3 text-[13px] items-center break-words">
              <div className="min-w-0 font-medium text-text">
                {item.installer_name}
                <InstallerFinancialNotice data={item} />
              </div>
              <div className="text-end">
                {formatCount(item.installed_doors)}
              </div>
              <div className="text-end">
                {formatAmount(item.payroll_total)}
              </div>
              <div className="text-end">
                {formatAmount(item.revenue_total)}
              </div>
              <div className="text-end">
                {formatAmount(item.profit_total)}
              </div>
              <div className="text-end">
                {formatCount(installerFinancialDataRisk(item))}
              </div>
            </div>
          </div>
        ))}
      <div className="px-4 py-3 border-t border-border flex items-center justify-between text-[12px]">
        <div className="text-text-secondary">
          {tt("reports.rowsCount").replace(
            "{count}",
            String(items.length),
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled={!canPrev}
            onClick={() =>
              onOffsetChange((x) => Math.max(0, x - KPI_PAGE_SIZE))
            }
            className="h-8 px-3 rounded-md border border-border bg-surface disabled:opacity-50"
          >
            {tt("reports.prev")}
          </button>
          <button
            disabled={!canNext}
            onClick={() => onOffsetChange((x) => x + KPI_PAGE_SIZE)}
            className="h-8 px-3 rounded-md border border-border bg-surface disabled:opacity-50"
          >
            {tt("reports.next")}
          </button>
        </div>
      </div>
    </div>
  );
}
