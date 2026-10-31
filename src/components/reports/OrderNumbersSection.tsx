"use client";

import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import { InstallerFinancialNotice } from "@/components/prices/InstallerFinancialNotice";
import { OrderFinancialBasis } from "@/components/prices/OrderFinancialBasis";

import { KPI_PAGE_SIZE, ORDER_NUMBERS_SORT_OPTIONS, SORT_DIR_OPTIONS, formatAmount, reportsPanelClass, useReportsText } from "./shared";
import type { OrderNumbersKpiResponse, OrderNumbersSortBy, ProjectOption, SortDir } from "./types";

type OrderNumbersSectionProps = {
  kpiQuery: UseQueryResult<OrderNumbersKpiResponse>;
  projectsQuery: UseQueryResult<{ items: ProjectOption[] }>;
  searchText: string;
  onSearchTextChange: (value: string) => void;
  projectId: string;
  onProjectIdChange: (value: string) => void;
  sortBy: OrderNumbersSortBy;
  sortDir: SortDir;
  onSortByChange: (value: OrderNumbersSortBy) => void;
  onSortDirChange: (value: SortDir) => void;
  onOffsetChange: (value: number | ((prev: number) => number)) => void;
  canPrev: boolean;
  canNext: boolean;
  exportMutation: UseMutationResult<void, Error, void>;
  canExportFinancialReports: boolean;
  ratesScopeHint: string | undefined;
};

// Reports → "Order numbers": paged, searchable order-number KPI table with CSV export. Markup moved verbatim from ReportsPage (section split).
export function OrderNumbersSection({ kpiQuery, projectsQuery, searchText, onSearchTextChange, projectId, onProjectIdChange, sortBy, sortDir, onSortByChange, onSortDirChange, onOffsetChange, canPrev, canNext, exportMutation, canExportFinancialReports, ratesScopeHint }: OrderNumbersSectionProps) {
  const { t, tt, copy, readError, optionLabel } = useReportsText();
  const items = kpiQuery.data?.items || [];
  const projectOptions = projectsQuery.data?.items || [];

  return (
    <div id="reports-orders" className={reportsPanelClass("overflow-hidden")}>
      <div className="px-4 py-3 border-b border-border bg-surface-subtle flex flex-col items-stretch gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="text-[11px] uppercase text-text-secondary">
            {copy(
              "Order Numbers KPI",
              "KPI по номерам заказов",
              "KPI לפי מספרי הזמנה",
            )}
          </div>
          <div className="text-[13px] text-text-secondary">
            {copy(
              "Money and operational control by order number",
              "Деньги и операционный контроль по номеру заказа",
              "כסף ובקרה תפעולית לפי מספר הזמנה",
            )}
          </div>
        </div>
        <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 xl:flex xl:flex-wrap xl:items-center xl:justify-end">
          <select
            aria-label={copy("Order Project Filter", "Фильтр заказов по объекту", "סינון הזמנות לפי פרויקט")}
            value={projectId}
            onChange={(e) => {
              onProjectIdChange(e.target.value);
              onOffsetChange(0);
            }}
            className="h-9 w-full min-w-0 rounded-md border border-border bg-surface px-2 text-[13px] xl:w-auto xl:max-w-[220px]"
          >
            <option value="">
              {projectsQuery.isLoading
                ? tt("reports.loadingProjects")
                : t("common.all")}
            </option>
            {projectOptions.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <input
            aria-label={copy(
              "Search order…",
              "Поиск заказа…",
              "חפש הזמנה…",
            )}
            value={searchText}
            onChange={(e) => {
              onSearchTextChange(e.target.value);
              onOffsetChange(0);
            }}
            placeholder={copy(
              "Search order…",
              "Поиск заказа…",
              "חפש הזמנה…",
            )}
            className="h-9 w-full min-w-0 rounded-md border border-border bg-surface px-2 text-[13px] xl:w-auto xl:max-w-[220px]"
          />
          <select
            aria-label={copy("Orders: sort by", "Заказы: сортировать по", "הזמנות: מיון לפי")}
            value={sortBy}
            onChange={(e) => {
              onSortByChange(e.target.value as OrderNumbersSortBy);
              onOffsetChange(0);
            }}
            className="h-9 w-full min-w-0 rounded-md border border-border bg-surface px-2 text-[13px] xl:w-auto xl:max-w-[180px]"
          >
            {ORDER_NUMBERS_SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {optionLabel(option.label)}
              </option>
            ))}
          </select>
          <select
            aria-label={copy("Orders: sort direction", "Заказы: направление сортировки", "הזמנות: כיוון מיון")}
            value={sortDir}
            onChange={(e) => {
              onSortDirChange(e.target.value as SortDir);
              onOffsetChange(0);
            }}
            className="h-9 w-full min-w-0 rounded-md border border-border bg-surface px-2 text-[13px] xl:w-auto xl:max-w-[120px]"
          >
            {SORT_DIR_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {optionLabel(option.label)}
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
            {tt("reports.exportOrdersCsv")}
          </button>
        </div>
      </div>

      {!kpiQuery.isError && <OrderFinancialBasis data={kpiQuery.data} />}
      <div className="hidden xl:grid grid-cols-[minmax(0,1fr)_80px_90px_90px_80px_120px_120px_120px_110px] gap-3 px-4 py-3 border-b border-border text-[11px] uppercase text-text-secondary">
        <span>{copy("Order", "Заказ", "הזמנה")}</span>
        <span className="text-end">{copy("Total", "Всего", 'סה"כ')}</span>
        <span className="text-end">
          {copy("Installed", "Установлено", "הותקן")}
        </span>
        <span className="text-end">
          {copy("Not Installed", "Не установлено", "לא הותקן")}
        </span>
        <span className="text-end">
          {copy("Issues", "Проблемы", "תקלות")}
        </span>
        <span className="text-end">
          {copy("Planned", "План", "מתוכנן")}
        </span>
        <span className="text-end">
          {copy("Payroll", "Начисления", "שכר")}
        </span>
        <span className="text-end">
          {copy("Profit", "Прибыль", "רווח")}
        </span>
        <span className="text-end">
          {copy("Completion", "Готовность", "השלמה")}
        </span>
      </div>

      {kpiQuery.isLoading && (
        <div className="px-4 py-6 text-[13px] text-text-secondary">
          {copy(
            "Loading order numbers KPI…",
            "Загружаем KPI по номерам заказов…",
            "טוען KPI למספרי הזמנות…",
          )}
        </div>
      )}
      {kpiQuery.isError && (
        <div className="px-4 py-6 text-[13px] text-status-problem-fg">
          {readError(
            kpiQuery.error,
            copy(
              "Failed to load order numbers KPI",
              "Не удалось загрузить KPI по номерам заказов",
              "טעינת KPI למספרי הזמנות נכשלה",
            ),
          )}
        </div>
      )}
      {!kpiQuery.isLoading &&
        !kpiQuery.isError &&
        items.length === 0 && (
          <div className="px-4 py-6 text-[13px] text-text-secondary">
            {copy(
              "No order KPI rows.",
              "Нет строк KPI по заказам.",
              "אין שורות KPI להזמנות.",
            )}
          </div>
        )}
      {!kpiQuery.isLoading &&
        !kpiQuery.isError &&
        items.map((item) => (
          <div key={item.order_number} className="border-t border-border">
            <div className="px-4"><InstallerFinancialNotice data={item} /></div>
            {item.pricing_mode === "FACTORY" && <div className="px-4 pt-2 text-xs text-text-secondary">
              {copy("Recorded installations", "Учтённые установки", "התקנות רשומות")}: {item.recorded_installations ?? "-"}.
              {" "}{copy("Recorded revenue", "Учтённая выручка", "הכנסה רשומה")}: {formatAmount(item.installed_revenue_total)}.
            </div>}
            <article className="px-4 py-3 xl:hidden">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 break-words text-[13px] font-semibold leading-5 text-text">
                  {item.order_number}
                </div>
                <div className="shrink-0 rounded-full bg-surface-subtle px-2 py-1 text-[10.5px] font-medium leading-none text-text-secondary">
                  {item.completion_pct}%
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                  <div className="text-[10px] uppercase text-text-secondary">
                    {copy("Total", "Всего", 'סה"כ')}
                  </div>
                  <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                    {item.total_doors}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                  <div className="text-[10px] uppercase text-text-secondary">
                    {copy("Installed", "Установлено", "הותקן")}
                  </div>
                  <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                    {item.installed_doors}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                  <div className="text-[10px] uppercase text-text-secondary">
                    {copy("Not Installed", "Не установлено", "לא הותקן")}
                  </div>
                  <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                    {item.not_installed_doors}
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
                    {copy("Payroll", "Начисления", "שכר")}
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
                <div className="col-span-3 rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                  <div className="text-[10px] uppercase text-text-secondary">
                    {copy("Planned", "План", "מתוכנן")}
                  </div>
                  <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                    {formatAmount(item.planned_revenue_total)}
                  </div>
                </div>
              </div>
            </article>
            <div className="hidden xl:grid grid-cols-[minmax(0,1fr)_80px_90px_90px_80px_120px_120px_120px_110px] gap-3 px-4 py-3 text-[13px] items-center">
              <div className="min-w-0 break-words font-medium text-text">
                {item.order_number}
              </div>
              <div className="text-end">{item.total_doors}</div>
              <div className="text-end">{item.installed_doors}</div>
              <div className="text-end">{item.not_installed_doors}</div>
              <div className="text-end">{item.open_issues}</div>
              <div className="text-end">
                {formatAmount(item.planned_revenue_total)}
              </div>
              <div className="text-end">
                {formatAmount(item.payroll_total)}
              </div>
              <div className="text-end">
                {formatAmount(item.profit_total)}
              </div>
              <div className="text-end">{item.completion_pct}%</div>
            </div>
          </div>
        ))}
      <div className="px-4 py-3 border-t border-border flex items-center justify-between text-[12px]">
        <div className="text-text-secondary">
          {copy("Total matched", "Всего совпадений", 'סה"כ התאמות')}:{" "}
          {kpiQuery.data?.total || 0}
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled={!canPrev}
            onClick={() =>
              onOffsetChange((x) =>
                Math.max(0, x - KPI_PAGE_SIZE),
              )
            }
            className="h-8 px-3 rounded-md border border-border bg-surface disabled:opacity-50"
          >
            {tt("reports.prev")}
          </button>
          <button
            disabled={!canNext}
            onClick={() =>
              onOffsetChange((x) => x + KPI_PAGE_SIZE)
            }
            className="h-8 px-3 rounded-md border border-border bg-surface disabled:opacity-50"
          >
            {tt("reports.next")}
          </button>
        </div>
      </div>
    </div>
  );
}
