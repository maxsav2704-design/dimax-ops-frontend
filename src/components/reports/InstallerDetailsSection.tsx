"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { UseQueryResult } from "@tanstack/react-query";
import { InstallerFinancialBasis, InstallerFinancialNotice } from "@/components/prices/InstallerFinancialNotice";
import { Button } from "@/components/ui/button";
import { installerFinancialDataRisk } from "@/lib/installer-financials";
import { ReceiptText } from "lucide-react";

import { formatAmount, formatCount, formatDateTime, reportsPanelClass, useReportsText } from "./shared";
import type { InstallerKpiDetailsResponse } from "./types";

type InstallerDetailsSectionProps = {
  query: UseQueryResult<InstallerKpiDetailsResponse>;
  directoryQuery: UseQueryResult<{ installer_id: string; installer_name: string }[]>;
  options: { installer_id: string; installer_name: string }[];
  installerId: string;
  onInstallerIdChange: (value: string) => void;
  scopedInstallerMissing: boolean;
};

// Reports → "Installer details": one installer's KPI breakdown with a directory picker. Markup moved verbatim from ReportsPage (section split).
export function InstallerDetailsSection({ query, directoryQuery, options, installerId, onInstallerIdChange, scopedInstallerMissing }: InstallerDetailsSectionProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, tt, copy, readError } = useReportsText();
  const details = query.data;

  return (
    <div id="reports-installer-details" className={reportsPanelClass("overflow-hidden")}>
      <div className="px-4 py-3 border-b border-border bg-surface-subtle flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase text-text-secondary">
            {tt("reports.installerDrilldownTitle")}
          </div>
          <div className="text-[13px] text-text-secondary">
            {copy(
              "Profitability, projects, orders and addon impact for the selected installer",
              "Доходность, проекты, заказы и влияние доп. работ по выбранному монтажнику",
              "רווחיות, פרויקטים, הזמנות והשפעת תוספות עבור המתקין שנבחר",
            )}
          </div>
        </div>
        <select
          aria-label={copy(
            "Installer KPI Details Filter",
            "Фильтр деталей KPI монтажника",
            "מסנן פרטי KPI למתקין",
          )}
          value={scopedInstallerMissing ? "" : installerId}
          onChange={(e) => {
            const id = e.target.value;
            if (!id) return;
            onInstallerIdChange(id);
            const params = new URLSearchParams(searchParams?.toString());
            params.set("installer_id", id);
            router.push(`/reports?${params.toString()}#reports-installer-details`);
          }}
          className="h-9 max-w-full rounded-md border border-border bg-surface px-2 text-[13px]"
        >
          <option value="" disabled>
            {directoryQuery.isLoading
              ? copy(
                  "Loading installers…",
                  "Загружаем монтажников…",
                  "טוען מתקינים…",
                )
              : copy(
                  "Select installer",
                  "Выберите монтажника",
                  "בחר מתקין",
                )}
          </option>
          {installerId && !scopedInstallerMissing && !options.some((item) => item.installer_id === installerId) && (
            <option value={installerId}>{installerId}</option>
          )}
          {options.map((item) => (
            <option key={item.installer_id} value={item.installer_id}>
              {item.installer_name}
            </option>
          ))}
        </select>
      </div>

      {directoryQuery.isError && <div role="status" className="px-4 py-2 text-xs text-status-warning-fg">
        {copy("The installer directory could not be loaded. The available report entries are shown.",
          "Не удалось загрузить справочник монтажников. Показаны доступные записи отчёта.",
          "לא ניתן לטעון את רשימת המתקינים. מוצגות הרשומות הזמינות מהדוח.")}
      </div>}
      {directoryQuery.isLoading && options.length === 0 && !installerId && (
        <div className="px-4 py-6 text-[13px] text-text-secondary">
          {copy(
            "Loading installer drill-down…",
            "Загрузка детализации по монтажнику…",
            "טוען פירוט לפי מתקין…",
          )}
        </div>
      )}
      {!directoryQuery.isLoading && options.length === 0 && !installerId && (
        <div className="px-4 py-6 text-[13px] text-text-secondary">
          {copy(
            "No installers available for drill-down.",
            "Нет монтажников для детализации.",
            "אין מתקינים זמינים לפירוט.",
          )}
        </div>
      )}
      {query.isLoading && installerId && (
        <div className="px-4 py-6 text-[13px] text-text-secondary">
          {copy(
            "Loading installer details…",
            "Загружаем детали монтажника…",
            "טוען פרטי מתקין…",
          )}
        </div>
      )}
      {query.isError && installerId && (
        <div className="px-4 py-6 text-[13px] text-status-problem-fg">
          {readError(
            query.error,
            tt("reports.failedInstallerDetails"),
          )}
        </div>
      )}
      {!query.isLoading &&
        !query.isError &&
        details && (
          <div className="p-4 space-y-4">
            <InstallerFinancialBasis data={details} />
            <InstallerFinancialNotice data={details} />
            {details.pricing_mode === "FACTORY" && <p className="text-xs text-text-secondary">
              {copy("All recorded work, independent of the period filter. Order numbers use current door records; add-ons are not included in the order breakdown.",
                "Все учтённые работы, независимо от фильтра периода. Номера заказов взяты из текущих данных дверей; допработы не входят в разбивку по заказам.",
                "כל העבודות הרשומות, ללא תלות במסנן התקופה. מספרי ההזמנות נלקחים מרישומי הדלתות הנוכחיים; תוספות אינן נכללות בפירוט ההזמנות.")}
            </p>}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-9"
                onClick={() =>
                  router.push(
                    `/installers?installer_id=${details.installer_id}`,
                  )
                }
              >
                {copy(
                  "Open installer card",
                  "Открыть карточку монтажника",
                  "פתח כרטיס מתקין",
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-9"
                onClick={() =>
                  router.push(
                    `/earnings-ledger?installer_id=${details.installer_id}`,
                  )
                }
              >
                <ReceiptText className="h-3.5 w-3.5" />
                {copy(
                  "Open payroll ledger",
                  "Открыть начисления",
                  "פתח יומן תשלומים",
                )}
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="rounded-lg border border-border bg-surface p-3">
                <div className="text-[11px] uppercase text-text-secondary">
                  {tt("reports.revenuePayrollProfit")}
                </div>
                <div className="mt-2 text-[18px] font-semibold text-text">
                  {formatAmount(details.revenue_total)}
                </div>
                <div className="mt-1 text-[12px] text-text-secondary">
                  {copy("Payroll", "Начисления", "שכר")}{" "}
                  {formatAmount(details.payroll_total)} |{" "}
                  {copy("Profit", "Прибыль", "רווח")}{" "}
                  {formatAmount(details.profit_total)}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-surface p-3">
                <div className="text-[11px] uppercase text-text-secondary">
                  {tt("reports.projectsOrders")}
                </div>
                <div className="mt-2 text-[18px] font-semibold text-text">
                  {formatCount(details.active_projects)} /{" "}
                  {formatCount(details.order_numbers)}
                </div>
                <div className="mt-1 text-[12px] text-text-secondary">
                  {tt("reports.installedDoors").replace(
                    "{count}",
                    String(details.installed_doors),
                  )}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-surface p-3">
                <div className="text-[11px] uppercase text-text-secondary">
                  {copy("Open issues / data gaps", "Открытые проблемы / неполные данные", "תקלות פתוחות / נתונים חסרים")}
                </div>
                <div className="mt-2 text-[18px] font-semibold text-text">
                  {details.open_issues} /{" "}
                  {installerFinancialDataRisk(details)}
                </div>
                <div className="mt-1 text-[12px] text-text-secondary">
                  {tt("reports.lastInstall")}{" "}
                  {details.last_installed_at
                    ? formatDateTime(details.last_installed_at)
                    : tt("reports.notAvailableShort")}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-surface p-3">
                <div className="text-[11px] uppercase text-text-secondary">
                  {tt("reports.addonsImpact")}
                </div>
                <div className="mt-2 text-[18px] font-semibold text-text">
                  {copy("Qty", "Кол-во", "כמות")} {formatAmount(details.addons_done_qty)}
                </div>
                <div className="mt-1 text-[12px] text-text-secondary">
                  {copy("Earned", "Начислено", "שכר שנצבר")}: {formatAmount(details.addon_payroll_total)}
                </div>
                <div className="mt-1 text-[12px] text-text-secondary">
                  {tt("reports.addonsProfitMissingPlans")
                    .replace(
                      "{profit}",
                      formatAmount(details.addon_profit_total),
                    )
                    .replace(
                      "{count}",
                      String(details.missing_addon_plans_facts),
                    )}
                </div>
              </div>
            </div>

            {details.pricing_mode === "FACTORY" && <p className="text-xs text-text-secondary">
              {copy("Project rows shown", "Показано строк объектов", "שורות פרויקטים מוצגות")}: {details.top_projects.length} / {details.project_rows_total}.
              {" "}{copy("Order rows shown", "Показано строк заказов", "שורות הזמנות מוצגות")}: {details.order_breakdown.length} / {details.order_rows_total}.
            </p>}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="overflow-hidden rounded-lg border border-border">
                <div className="divide-y divide-border-subtle md:hidden">
                  {details.top_projects.length === 0 ? (
                    <div className="px-3.5 py-3 text-[12px] text-text-secondary">
                      {copy(
                        "No project drill-down rows.",
                        "Нет строк детализации по проекту.",
                        "אין שורות פירוט לפרויקט.",
                      )}
                    </div>
                  ) : (
                    details.top_projects.map((item) => (
                      <article
                        key={`mobile-${item.project_id ?? "unavailable"}`}
                        className="px-3.5 py-3"
                      >
                        <div className="text-[13px] font-semibold leading-5 text-text">
                          {item.project_name ?? copy("Project unavailable", "Объект недоступен", "הפרויקט אינו זמין")}
                        </div>
                        <InstallerFinancialNotice data={item} />
                        <div className="mt-1 text-xs tabular-nums text-text-secondary">
                          {copy("Earned", "Начислено", "שכר שנצבר")}: {formatAmount(item.payroll_total)}
                        </div>
                        <div className="mt-1 text-[11px] leading-4 text-text-secondary">
                          {item.last_installed_at
                            ? formatDateTime(item.last_installed_at)
                            : copy(
                                "No install date",
                                "Нет даты установки",
                                "אין תאריך התקנה",
                              )}
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2">
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
                              {copy("Issues", "Проблемы", "תקלות")}
                            </div>
                            <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                              {item.open_issues}
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
                        </div>
                      </article>
                    ))
                  )}
                </div>
                <table className="hidden w-full text-[12px] md:table">
                  <thead className="bg-surface-subtle text-text-secondary">
                    <tr>
                      <th className="text-start px-3 py-2 font-medium">
                        {copy("Project", "Проект", "פרויקט")}
                      </th>
                      <th className="text-end px-3 py-2 font-medium">
                        {copy("Installed", "Установлено", "הותקן")}
                      </th>
                      <th className="text-end px-3 py-2 font-medium">
                        {copy("Issues", "Проблемы", "תקלות")}
                      </th>
                      <th className="text-end px-3 py-2 font-medium">
                        {copy("Profit", "Прибыль", "רווח")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {details.top_projects.length === 0 ? (
                      <tr>
                        <td
                          className="px-3 py-3 text-text-secondary"
                          colSpan={4}
                        >
                          {copy(
                            "No project drill-down rows.",
                            "Нет строк детализации по проекту.",
                            "אין שורות פירוט לפרויקט.",
                          )}
                        </td>
                      </tr>
                    ) : (
                      details.top_projects.map((item) => (
                        <tr
                          key={item.project_id ?? "unavailable"}
                          className="border-t border-border"
                        >
                          <td className="px-3 py-2.5">
                            <div className="font-medium text-text">
                              {item.project_name ?? copy("Project unavailable", "Объект недоступен", "הפרויקט אינו זמין")}
                            </div>
                            <InstallerFinancialNotice data={item} />
                            <div className="text-xs tabular-nums text-text-secondary">
                              {copy("Earned", "Начислено", "שכר שנצבר")}: {formatAmount(item.payroll_total)}
                            </div>
                            <div className="text-[11px] text-text-secondary">
                              {item.last_installed_at
                                ? formatDateTime(item.last_installed_at)
                                : copy(
                                    "No install date",
                                    "Нет даты установки",
                                    "אין תאריך התקנה",
                                  )}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-end">
                            {item.installed_doors}
                          </td>
                          <td className="px-3 py-2 text-end">
                            {item.open_issues}
                          </td>
                          <td className="px-3 py-2 text-end">
                            {formatAmount(item.profit_total)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="overflow-hidden rounded-lg border border-border">
                <div className="divide-y divide-border-subtle md:hidden">
                  {details.order_breakdown.length === 0 ? (
                    <div className="px-3.5 py-3 text-[12px] text-text-secondary">
                      {copy(
                        "No order breakdown rows.",
                        "Нет строк по разбивке заказов.",
                        "אין שורות פירוט להזמנות.",
                      )}
                    </div>
                  ) : (
                    details.order_breakdown.map((item) => (
                      <article
                        key={`mobile-${item.order_number}`}
                        className="px-3.5 py-3"
                      >
                        <div className="text-[13px] font-semibold leading-5 text-text">
                          {item.order_number}
                        </div>
                        <InstallerFinancialNotice data={item} />
                        <div className="mt-1 text-xs tabular-nums text-text-secondary">
                          {copy("Earned", "Начислено", "שכר שנצבר")}: {formatAmount(item.payroll_total)}
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2">
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
                        </div>
                      </article>
                    ))
                  )}
                </div>
                <table className="hidden w-full text-[12px] md:table">
                  <thead className="bg-surface-subtle text-text-secondary">
                    <tr>
                      <th className="text-start px-3 py-2 font-medium">
                        {copy("Order", "Заказ", "הזמנה")}
                      </th>
                      <th className="text-end px-3 py-2 font-medium">
                        {copy("Installed", "Установлено", "הותקן")}
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
                    {details.order_breakdown.length === 0 ? (
                      <tr>
                        <td
                          className="px-3 py-3 text-text-secondary"
                          colSpan={4}
                        >
                          {copy(
                            "No order breakdown rows.",
                            "Нет строк по разбивке заказов.",
                            "אין שורות פירוט להזמנות.",
                          )}
                        </td>
                      </tr>
                    ) : (
                      details.order_breakdown.map((item) => (
                        <tr
                          key={item.order_number}
                          className="border-t border-border"
                        >
                          <td className="px-3 py-2.5 font-medium text-text">
                            {item.order_number}
                            <InstallerFinancialNotice data={item} />
                            <div className="text-xs tabular-nums text-text-secondary">
                              {copy("Earned", "Начислено", "שכר שנצבר")}: {formatAmount(item.payroll_total)}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-end">
                            {item.installed_doors}
                          </td>
                          <td className="px-3 py-2 text-end">
                            {formatAmount(item.revenue_total)}
                          </td>
                          <td className="px-3 py-2 text-end">
                            {formatAmount(item.profit_total)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
