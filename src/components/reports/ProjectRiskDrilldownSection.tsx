"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import { ProjectPricingNotice } from "@/components/prices/ProjectPricingNotice";

import { formatAmount, formatPercent, reportsPanelClass, useReportsText } from "./shared";
import { SectionMessage } from "./widgets";
import type { ProjectOption, ProjectRiskDrilldownResponse } from "./types";

type ProjectRiskDrilldownSectionProps = {
  query: UseQueryResult<ProjectRiskDrilldownResponse>;
  projectsQuery: UseQueryResult<{ items: ProjectOption[] }>;
  projectId: string;
  onProjectIdChange: (value: string) => void;
};

// Reports → "Project risk drill-down": per-project risk breakdown with a project picker. Markup moved verbatim from ReportsPage (section split).
export function ProjectRiskDrilldownSection({ query, projectsQuery, projectId, onProjectIdChange }: ProjectRiskDrilldownSectionProps) {
  const { t, tt, copy, readError } = useReportsText();
  const drilldown = query.data;
  const projectOptions = projectsQuery.data?.items || [];

  return (
    <div
      id="reports-project-risk-drilldown"
      className={reportsPanelClass("overflow-hidden")}
    >
      <div className="px-4 py-3 border-b border-border bg-surface-subtle flex flex-col items-stretch gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-[11px] uppercase text-text-secondary">
            {tt("reports.projectRiskTitle")}
          </div>
          <div className="text-[13px] text-text-secondary">
            {tt("reports.projectRiskSubtitle")}
          </div>
        </div>
        <select
          aria-label={copy("Project Risk Drilldown Filter", "Фильтр детализации рисков по объекту", "מסנן פירוט סיכונים לפי פרויקט")}
          value={projectId}
          onChange={(e) => onProjectIdChange(e.target.value)}
          className="h-9 w-full min-w-0 rounded-md border border-border bg-surface px-2 text-[13px] md:w-auto md:max-w-[280px]"
        >
          <option value="">
            {projectsQuery.isLoading
              ? tt("reports.loadingProjects")
              : t("reports.selectProject")}
          </option>
          {projectOptions.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>

      {query.isLoading && projectId && (
        <div className="px-4 py-6 text-[13px] text-text-secondary">
          {tt("reports.loadingProjectRisk")}
        </div>
      )}
      {query.isError && projectId && (
        <div className="px-4 py-6 text-[13px] text-status-problem-fg">
          {readError(
            query.error,
            tt("reports.failedProjectRisk"),
          )}
        </div>
      )}
      {!projectsQuery.isLoading &&
        projectOptions.length > 0 &&
        !projectId && (
          <div className="px-4 py-6">
            <SectionMessage
              title={copy("Select a project", "Выберите объект", "בחרו פרויקט")}
              detail={copy(
                "Choose a project to inspect the exact drivers behind low margin, stalled reasons and risky orders.",
                "Выберите объект, чтобы увидеть причины низкой маржи, задержек и заказов с риском.",
                "בחרו פרויקט כדי לראות את הגורמים לרווחיות נמוכה, לעיכובים ולהזמנות בסיכון.",
              )}
            />
          </div>
        )}
      {!query.isLoading &&
        !query.isError &&
        drilldown && (
          <div className="p-4 space-y-4">
            <ProjectPricingNotice data={drilldown.summary} />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="rounded-lg border border-border bg-surface p-3">
                <div className="text-[11px] uppercase text-text-secondary">
                  {copy(
                    "Actual Margin",
                    "Фактическая маржа",
                    "מרווח בפועל",
                  )}
                </div>
                <div className="mt-2 text-[22px] font-semibold text-text">
                  {formatPercent(
                    drilldown.summary?.actual_margin_pct,
                  )}
                </div>
                <div className="mt-1 text-[12px] text-text-secondary">
                  {copy("Profit gap", "Разрыв по прибыли", "פער רווח")}{" "}
                  {formatAmount(
                    drilldown.summary?.profit_gap_total,
                  )}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-surface p-3">
                <div className="text-[11px] uppercase text-text-secondary">
                  {copy(
                    "Completion / Delayed",
                    "Завершение / задержка",
                    "השלמה / עיכוב",
                  )}
                </div>
                <div className="mt-2 text-[22px] font-semibold text-text">
                  {formatPercent(
                    drilldown.summary?.completion_pct,
                  )}
                </div>
                <div className="mt-1 text-[12px] text-text-secondary">
                  {drilldown.summary?.not_installed_doors ?? 0}{" "}
                  {copy(
                    "delayed doors",
                    "дверей в задержке",
                    "דלתות בעיכוב",
                  )}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-surface p-3">
                <div className="text-[11px] uppercase text-text-secondary">
                  {copy("Issue Pressure", "Давление проблем", "לחץ תקלות")}
                </div>
                <div className="mt-2 text-[22px] font-semibold text-text">
                  {drilldown.summary?.open_issues ?? 0} /{" "}
                  {drilldown.summary?.blocked_open_issues ?? 0}
                </div>
                <div className="mt-1 text-[12px] text-text-secondary">
                  {copy(
                    "Open / blocked issues",
                    "Открытые / заблокированные проблемы",
                    "תקלות פתוחות / חסומות",
                  )}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-surface p-3">
                <div className="text-[11px] uppercase text-text-secondary">
                  {copy("Data Risk", "Риск данных", "סיכון נתונים")}
                </div>
                <div className="mt-2 text-[22px] font-semibold text-text">
                  {(drilldown.summary
                    ?.missing_planned_rates_doors ?? 0) +
                    (drilldown.summary
                      ?.missing_actual_rates_doors ?? 0) +
                    (drilldown.summary
                      ?.missing_addon_plans_facts ?? 0)}
                </div>
                <div className="mt-1 text-[12px] text-text-secondary">
                  {copy(
                    "rates + addon plan gaps",
                    "тарифы + пробелы в дополнительных планах",
                    "תעריפים + פערי תוכנית תוספות",
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              <div className="rounded-lg border border-border bg-surface p-3 xl:col-span-1">
                <div className="text-[11px] uppercase text-text-secondary">
                  {copy("Drivers", "Драйверы", "דרייברים")}
                </div>
                <div className="mt-3 space-y-2">
                  {(drilldown.drivers || []).map((driver) => (
                    <div
                      key={driver.code}
                      className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                    >
                      <div>
                        <div className="text-[12px] font-medium text-text">
                          {driver.label}
                        </div>
                        <div className="text-[11px] text-text-secondary">
                          {driver.severity}
                        </div>
                      </div>
                      <div className="text-[12px] font-semibold text-text">
                        {formatAmount(driver.value)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-surface overflow-hidden xl:col-span-1">
                <div className="border-b border-border px-3 py-2 text-[11px] uppercase text-text-secondary">
                  {copy(
                    "Stalled Reasons",
                    "Причины задержки",
                    "סיבות לעיכוב",
                  )}
                </div>
                <div className="divide-y divide-border-subtle md:hidden">
                  {(drilldown.top_reasons || []).length === 0 ? (
                    <div className="px-3.5 py-3 text-[12px] text-text-secondary">
                      {copy("No stalled reasons.", "Нет причин задержки.", "אין סיבות לעיכוב.")}
                    </div>
                  ) : (
                    (drilldown.top_reasons || []).map((item) => (
                      <article
                        key={`mobile-${item.reason_id || item.reason_name}`}
                        className="px-3.5 py-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 text-[13px] font-semibold leading-5 text-text">
                            {item.reason_name}
                          </div>
                          <div className="shrink-0 rounded-full bg-surface-subtle px-2 py-1 text-[10.5px] font-medium leading-none text-text-secondary">
                            {copy("Doors", "Двери", "דלתות")}: {item.doors}
                          </div>
                        </div>
                        <div className="mt-3 rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                          <div className="text-[10px] uppercase text-text-secondary">
                            {copy(
                              "Profit Leak",
                              "Потеря прибыли",
                              "דליפת רווח",
                            )}
                          </div>
                          <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                            {formatAmount(item.profit_delayed_total)}
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
                        {copy(
                          "Profit Leak",
                          "Потеря прибыли",
                          "דליפת רווח",
                        )}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(drilldown.top_reasons || []).length ===
                    0 ? (
                      <tr>
                        <td
                          className="px-3 py-3 text-text-secondary"
                          colSpan={3}
                        >
                          {copy("No stalled reasons.", "Нет причин задержки.", "אין סיבות לעיכוב.")}
                        </td>
                      </tr>
                    ) : (
                      (drilldown.top_reasons || []).map(
                        (item) => (
                          <tr
                            key={item.reason_id || item.reason_name}
                            className="border-t border-border"
                          >
                            <td className="px-3 py-2.5 font-medium text-text">
                              {item.reason_name}
                            </td>
                            <td className="px-3 py-2 text-end">
                              {item.doors}
                            </td>
                            <td className="px-3 py-2 text-end">
                              {formatAmount(item.profit_delayed_total)}
                            </td>
                          </tr>
                        ),
                      )
                    )}
                  </tbody>
                </table>
              </div>

              <div className="rounded-lg border border-border bg-surface overflow-hidden xl:col-span-1">
                <div className="border-b border-border px-3 py-2 text-[11px] uppercase text-text-secondary">
                  {copy("Risky Orders", "Заказы с риском", "הזמנות בסיכון")}
                </div>
                <div className="divide-y divide-border-subtle md:hidden">
                  {(drilldown.risky_orders || []).length ===
                  0 ? (
                    <div className="px-3.5 py-3 text-[12px] text-text-secondary">
                      {copy(
                        "No risky orders.",
                        "Рискованных заказов нет.",
                        "אין הזמנות מסוכנות.",
                      )}
                    </div>
                  ) : (
                    (drilldown.risky_orders || []).map(
                      (item) => (
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
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                              <div className="text-[10px] uppercase text-text-secondary">
                                {copy("Gap", "Разрыв", "פער")}
                              </div>
                              <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                                {formatAmount(item.revenue_gap_total)}
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
                      ),
                    )
                  )}
                </div>
                <table className="data-table hidden md:table">
                  <thead className="bg-surface-subtle text-text-secondary">
                    <tr>
                      <th className="text-start px-3 py-2 font-medium">
                        {copy("Order", "Заказ", "הזמנה")}
                      </th>
                      <th className="text-end px-3 py-2 font-medium">
                        {copy("Gap", "Разрыв", "פער")}
                      </th>
                      <th className="text-end px-3 py-2 font-medium">
                        {copy("Issues", "Проблемы", "תקלות")}
                      </th>
                      <th className="text-end px-3 py-2 font-medium">
                        {copy("Completion", "Завершение", "השלמה")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(drilldown.risky_orders || []).length ===
                    0 ? (
                      <tr>
                        <td
                          className="px-3 py-3 text-text-secondary"
                          colSpan={4}
                        >
                          {copy(
                            "No risky orders.",
                            "Рискованных заказов нет.",
                            "אין הזמנות מסוכנות.",
                          )}
                        </td>
                      </tr>
                    ) : (
                      (drilldown.risky_orders || []).map(
                        (item) => (
                          <tr
                            key={item.order_number}
                            className="border-t border-border"
                          >
                            <td className="px-3 py-2.5 font-medium text-text">
                              {item.order_number}
                            </td>
                            <td className="px-3 py-2 text-end">
                              {formatAmount(item.revenue_gap_total)}
                            </td>
                            <td className="px-3 py-2 text-end">
                              {item.open_issues}
                            </td>
                            <td className="px-3 py-2 text-end">
                              {formatPercent(item.completion_pct)}
                            </td>
                          </tr>
                        ),
                      )
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
