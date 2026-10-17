"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import { entityKey } from "@/components/dimax";
import { InstallerFinancialBand, InstallerFinancialBasis, InstallerFinancialNotice } from "@/components/prices/InstallerFinancialNotice";
import { IssueExposureBasis } from "@/components/prices/IssueExposureBasis";
import { OrderFinancialBasis } from "@/components/prices/OrderFinancialBasis";
import { ProjectMarginBasis, ProjectMarginNotice } from "@/components/prices/ProjectMarginNotice";
import { cn } from "@/lib/utils";

import { formatAmount, formatDateTime, formatPercent, installerPerformanceBandClass, reportsPanelClass, useReportsText } from "./shared";
import { SectionMessage } from "./widgets";
import type { RiskConcentrationResponse } from "./types";

type InstallerProfitabilityMatrixSectionProps = {
  query: UseQueryResult<RiskConcentrationResponse>;
};

// Reports → "Installer profitability matrix": risk concentration by installer and project. Markup moved verbatim from ReportsPage (section split).
export function InstallerProfitabilityMatrixSection({ query }: InstallerProfitabilityMatrixSectionProps) {
  const { t, tt, copy, readError } = useReportsText();
  const concentration = query.data;

  return (
    <div
      id="reports-installer-profitability-matrix"
      className={reportsPanelClass("overflow-hidden")}
    >
      <div className="px-4 py-3 border-b border-border bg-surface-subtle flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase text-text-secondary">
            {tt("reports.riskConcentrationTitle")}
          </div>
          <div className="text-[13px] text-text-secondary">
            {tt("reports.riskConcentrationSubtitle")}
          </div>
        </div>
        <div className="text-end text-[11px] text-text-secondary">
          {concentration?.generated_at
            ? formatDateTime(concentration.generated_at)
            : tt("reports.notAvailableShort")}
        </div>
      </div>

      {query.isLoading ? (
        <div className="px-4 py-6 text-[13px] text-text-secondary">
          {tt("reports.loadingRiskConcentration")}
        </div>
      ) : query.isError ? (
        <div className="px-4 py-6 text-[13px] text-status-problem-fg">
          {readError(
            query.error,
            tt("reports.failedRiskConcentration"),
          )}
        </div>
      ) : (
        <div className="p-4 space-y-4">
          <IssueExposureBasis data={concentration?.summary} />
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-border bg-surface p-3">
              <div className="text-[11px] uppercase text-text-secondary">
                {tt("reports.delayedProfitLabel")}
              </div>
              <div className="mt-2 text-[22px] font-semibold text-status-problem-fg">
                {formatAmount(
                  concentration?.summary?.delayed_profit_total,
                )}
              </div>
              <div className="mt-1 text-[12px] text-text-secondary">
                {tt("reports.openIssueRisk").replace(
                  "{amount}",
                  formatAmount(
                    concentration?.summary?.open_issue_profit_at_risk,
                  ),
                )}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-surface p-3">
              <div className="text-[11px] uppercase text-text-secondary">
                {tt("reports.blockedIssueRisk")}
              </div>
              <div className="mt-2 text-[22px] font-semibold text-status-warning-fg">
                {formatAmount(
                  concentration?.summary?.blocked_issue_profit_at_risk,
                )}
              </div>
              <div className="mt-1 text-[12px] text-text-secondary">
                {tt("reports.worstInstaller").replace(
                  "{amount}",
                  formatAmount(
                    concentration?.summary
                      ?.worst_installer_profit_total,
                  ),
                )}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-surface p-3">
              <div className="text-[11px] uppercase text-text-secondary">
                {copy("Projects / orders shown", "Объекты / заказы в выборке", "פרויקטים / הזמנות מוצגים")}
              </div>
              <div className="mt-2 text-[22px] font-semibold text-text">
                {concentration?.summary?.risky_projects ?? 0} /{" "}
                {concentration?.summary?.risky_orders ?? 0}
              </div>
              <div className="mt-1 text-[12px] text-text-secondary">
                {tt("reports.worstProject").replace(
                  "{amount}",
                  formatAmount(
                    concentration?.summary?.worst_project_profit_total,
                  ),
                )}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-surface p-3">
              <div className="text-[11px] uppercase text-text-secondary">
                {copy("Risky Installers", "Рискованные монтажники", "מתקינים מסוכנים")}
              </div>
              <div className="mt-2 text-[22px] font-semibold text-text">
                {concentration?.summary?.risky_installers ?? 0}
              </div>
              <div className="mt-1 text-[12px] text-text-secondary">
                {copy("Lowest known order profit", "Минимальная известная прибыль заказа", "הרווח הידוע הנמוך ביותר להזמנה")}{" "}
                {formatAmount(
                  concentration?.summary?.worst_order_profit_total,
                )}
              </div>
            </div>
          </div>

          {(concentration?.projects || []).length === 0 &&
            (concentration?.orders || []).length === 0 &&
            (concentration?.installers || []).length === 0 && (
              <SectionMessage
                title={copy("No concentrated risk yet", "Скопления рисков пока нет", "אין עדיין ריכוז סיכונים")}
                detail={copy(
                  "This tenant does not currently have enough delayed doors, open issues or low-margin rows to populate the cross-cutting executive risk view.",
                  "Сейчас недостаточно просроченных дверей, открытых проблем или низкомаржинальных строк для сводного анализа рисков.",
                  "כרגע אין מספיק דלתות באיחור, תקלות פתוחות או שורות ברווחיות נמוכה להצגת סיכונים משולבת.",
                )}
              />
            )}

          <div className="grid gap-4 xl:grid-cols-3">
            <div className="rounded-lg border border-border bg-surface overflow-hidden">
              <div className="border-b border-border px-3 py-2 text-[11px] uppercase text-text-secondary">
                {copy("Projects at Risk", "Проекты под угрозой", "פרויקטים בסיכון")}
              </div>
              <ProjectMarginBasis
                mode={concentration?.projects?.[0]?.pricing_mode}
                incomplete={concentration?.summary?.incomplete_projects}
              />
              <div className="divide-y divide-border-subtle md:hidden">
                {(concentration?.projects || []).length === 0 ? (
                  <div className="px-3.5 py-3 text-[12px] text-text-secondary">
                    {copy("No risky projects.", "Никаких рискованных проектов.", "אין פרויקטים מסוכנים.")}
                  </div>
                ) : (
                  (concentration?.projects || []).map((item) => (
                    <article
                      key={`mobile-${item.project_id}`}
                      className="px-3.5 py-3"
                    >
                      <div className="min-w-0 text-[13px] font-semibold leading-5 text-text">
                        {item.project_name}
                      </div>
                      <ProjectMarginNotice data={item} />
                      <div className="mt-1 text-[11px] text-text-secondary">
                        {copy("Completion", "Завершение", "השלמה")} {formatPercent(item.completion_pct)}
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2">
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
                      </div>
                    </article>
                  ))
                )}
              </div>
              <table className="data-table hidden md:table">
                <thead className="bg-surface-subtle text-text-secondary">
                  <tr>
                    <th className="text-start px-3 py-2 font-medium">
                      {copy("Project", "Проект", "פרויקט")}
                    </th>
                    <th className="text-end px-3 py-2 font-medium">
                      {copy("Profit", "Прибыль", "רווח")}
                    </th>
                    <th className="text-end px-3 py-2 font-medium">
                      {copy("Margin", "Маржа", "מרווח")}
                    </th>
                    <th className="text-end px-3 py-2 font-medium">
                      {copy("Issues", "Проблемы", "תקלות")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(concentration?.projects || []).length === 0 ? (
                    <tr>
                      <td
                        className="px-3 py-3 text-text-secondary"
                        colSpan={4}
                      >
                        {copy("No risky projects.", "Никаких рискованных проектов.", "אין פרויקטים מסוכנים.")}
                      </td>
                    </tr>
                  ) : (
                    (concentration?.projects || []).map((item) => (
                      <tr
                        key={item.project_id}
                        className="border-t border-border"
                      >
                        <td className="px-3 py-2.5">
                          <div className="font-medium text-text">
                            {item.project_name}
                          </div>
                          <ProjectMarginNotice data={item} />
                          <div className="text-[11px] text-text-secondary">
                            {copy("Completion", "Завершение", "השלמה")} {formatPercent(item.completion_pct)}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-end">
                          {formatAmount(item.profit_total)}
                        </td>
                        <td className="px-3 py-2 text-end">
                          {formatPercent(item.margin_pct)}
                        </td>
                        <td className="px-3 py-2 text-end">
                          {item.open_issues}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="rounded-lg border border-border bg-surface overflow-hidden">
              <div className="border-b border-border px-3 py-2 text-[11px] uppercase text-text-secondary">
                {copy("Orders by lowest known profit", "Заказы по минимальной известной прибыли", "הזמנות לפי הרווח הידוע הנמוך ביותר")}
              </div>
              <OrderFinancialBasis data={{
                pricing_mode: concentration?.summary?.order_pricing_mode,
                incomplete_orders: concentration?.summary?.incomplete_orders,
                total: concentration?.summary?.order_rows_total,
              }} shown={concentration?.orders?.length ?? 0} />
              <div className="divide-y divide-border-subtle md:hidden">
                {(concentration?.orders || []).length === 0 ? (
                  <div className="px-3.5 py-3 text-[12px] text-text-secondary">
                    {copy("No order financial rows.", "Нет финансовых данных по заказам.", "אין נתונים כספיים להזמנות.")}
                  </div>
                ) : (
                  (concentration?.orders || []).map((item) => (
                    <article
                      key={`mobile-${item.order_number}`}
                      className="px-3.5 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 text-[13px] font-semibold leading-5 text-text">
                          {item.order_number}
                        </div>
                        <div className="shrink-0 rounded-full bg-surface-subtle px-2 py-1 text-[10.5px] font-medium leading-none text-text-secondary">
                          {formatPercent(item.completion_pct)}
                        </div>
                      </div>
                      <InstallerFinancialNotice data={item} />
                      <div className="mt-3 grid grid-cols-2 gap-2">
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
                            {copy("Delayed", "Задержка", "עיכוב")}
                          </div>
                          <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                            {item.not_installed_doors}
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
                      {copy("Order", "Заказ", "הזמנה")}
                    </th>
                    <th className="text-end px-3 py-2 font-medium">
                      {copy("Profit", "Прибыль", "רווח")}
                    </th>
                    <th className="text-end px-3 py-2 font-medium">
                      {copy("Delayed", "Задержка", "עיכוב")}
                    </th>
                    <th className="text-end px-3 py-2 font-medium">
                      {copy("Completion", "Завершение", "השלמה")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(concentration?.orders || []).length === 0 ? (
                    <tr>
                      <td
                        className="px-3 py-3 text-text-secondary"
                        colSpan={4}
                      >
                        {copy("No order financial rows.", "Нет финансовых данных по заказам.", "אין נתונים כספיים להזמנות.")}
                      </td>
                    </tr>
                  ) : (
                    (concentration?.orders || []).map((item) => (
                      <tr
                        key={item.order_number}
                        className="border-t border-border"
                      >
                        <td className="px-3 py-2.5 font-medium text-text">
                          {item.order_number}
                          <InstallerFinancialNotice data={item} />
                        </td>
                        <td className="px-3 py-2 text-end">
                          {formatAmount(item.profit_total)}
                        </td>
                        <td className="px-3 py-2 text-end">
                          {item.not_installed_doors}
                        </td>
                        <td className="px-3 py-2 text-end">
                          {formatPercent(item.completion_pct)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="rounded-lg border border-border bg-surface overflow-hidden">
              <div className="border-b border-border px-3 py-2 text-[11px] uppercase text-text-secondary">
                {copy("Installer financial risk", "Финансовые риски монтажников", "סיכון כספי לפי מתקין")}
              </div>
              <InstallerFinancialBasis data={{
                pricing_mode: concentration?.summary?.installer_pricing_mode,
                incomplete_items: concentration?.summary?.incomplete_installers,
                unassigned_completed_works: concentration?.summary?.unassigned_completed_works,
              }} />
              <div className="divide-y divide-border-subtle md:hidden">
                {(concentration?.installers || []).length === 0 ? (
                  <div className="px-3.5 py-3 text-[12px] text-text-secondary">
                    {copy("No installer financial rows.", "Нет финансовых данных по монтажникам.", "אין נתונים כספיים למתקינים.")}
                  </div>
                ) : (
                  (concentration?.installers || []).map((item) => (
                    <article
                      key={`mobile-${item.installer_id}`}
                      className="px-3.5 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[13px] font-semibold leading-5 text-text">
                            {item.installer_name}
                          </div>
                          <div className="mt-1 text-[11px] text-text-secondary">
                            {copy("Issues", "Проблемы", "תקלות")} {item.open_issues}
                          </div>
                        </div>
                        <span
                          className={cn(
                            "max-w-[50%] shrink-0 break-words rounded border px-2 py-0.5 text-[11px] font-semibold",
                            installerPerformanceBandClass(
                              item.performance_band,
                            ),
                          )}
                        >
                          <InstallerFinancialBand band={item.performance_band} />
                        </span>
                      </div>
                      <InstallerFinancialNotice data={item} />
                      <div className="mt-3 grid grid-cols-2 gap-2">
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
                      </div>
                    </article>
                  ))
                )}
              </div>
              <table className="data-table hidden md:table">
                <thead className="bg-surface-subtle text-text-secondary">
                  <tr>
                    <th className="text-start px-3 py-2 font-medium">
                      {copy("Installer", "Монтажник", "מתקין")}
                    </th>
                    <th className="text-start px-3 py-2 font-medium">
                      {copy("Band", "Сегмент", "קטגוריה")}
                    </th>
                    <th className="text-end px-3 py-2 font-medium">
                      {copy("Profit", "Прибыль", "רווח")}
                    </th>
                    <th className="text-end px-3 py-2 font-medium">
                      {copy("Margin", "Маржа", "מרווח")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(concentration?.installers || []).length === 0 ? (
                    <tr>
                      <td
                        className="px-3 py-3 text-text-secondary"
                        colSpan={4}
                      >
                        {copy("No installer financial rows.", "Нет финансовых данных по монтажникам.", "אין נתונים כספיים למתקינים.")}
                      </td>
                    </tr>
                  ) : (
                    (concentration?.installers || []).map((item) => {
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
                              {copy("Issues", "Проблемы", "תקלות")} {item.open_issues}
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
                            {formatAmount(item.profit_total)}
                          </td>
                          <td className="px-3 py-2 text-end">
                            {formatPercent(item.margin_pct)}
                          </td>
                        </tr>
                      );
                    })
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
