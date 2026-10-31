"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import { ProjectMarginBasis, ProjectMarginNotice } from "@/components/prices/ProjectMarginNotice";
import { projectMarginDataRisk } from "@/lib/project-margin";

import { formatAmount, formatPercent, reportsPanelClass, useReportsText } from "./shared";
import { statusLabel } from "@/lib/status-labels";
import type { ProjectsMarginResponse } from "./types";

type ProjectMarginExecutiveSectionProps = {
  topQuery: UseQueryResult<ProjectsMarginResponse>;
  riskQuery: UseQueryResult<ProjectsMarginResponse>;
};

// Reports → "Project margin executive": top-margin and low-margin / risk project tables. Markup moved verbatim from ReportsPage (section split).
export function ProjectMarginExecutiveSection({ topQuery, riskQuery }: ProjectMarginExecutiveSectionProps) {
  const { t, tt, copy, readError, locale } = useReportsText();
  const topProjects = topQuery.data?.items || [];
  const riskProjects = riskQuery.data?.items || [];

  return (
    <div
      id="reports-project-margin-executive"
      className={reportsPanelClass("overflow-hidden")}
    >
      <div className="px-4 py-3 border-b border-border bg-surface-subtle">
        <div className="text-[11px] uppercase text-text-secondary">
          {tt("reports.projectMarginExecutiveTitle")}
        </div>
        <div className="text-[13px] text-text-secondary">
          {tt("reports.projectMarginExecutiveSubtitle")}
        </div>
      </div>
      <ProjectMarginBasis
        mode={topQuery.data?.pricing_mode ?? riskQuery.data?.pricing_mode}
        incomplete={topQuery.data?.incomplete_projects ?? riskQuery.data?.incomplete_projects}
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 p-4">
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="px-3 py-2 border-b border-border bg-surface-subtle text-[12px] font-medium">
            {tt("reports.topMarginProjects")}
          </div>
          {topQuery.isLoading ? (
            <div className="px-3 py-4 text-[13px] text-text-secondary">
              {tt("reports.loadingTopMarginProjects")}
            </div>
          ) : topQuery.isError ? (
            <div className="px-3 py-4 text-[13px] text-status-problem-fg">
              {readError(
                topQuery.error,
                tt("reports.failedTopMarginProjects"),
              )}
            </div>
          ) : (
            <>
              <div className="divide-y divide-border-subtle md:hidden">
                {topProjects.length === 0 ? (
                  <div className="px-3.5 py-3 text-[12px] text-text-secondary">
                    {tt("reports.noProfitableProjects")}
                  </div>
                ) : (
                  topProjects.map((item) => (
                    <article
                      key={`mobile-top-${item.project_id}`}
                      className="px-3.5 py-3"
                    >
                      <div className="min-w-0 text-[13px] font-semibold leading-5 text-text">
                        {item.project_name}
                      </div>
                      <ProjectMarginNotice data={item} />
                      <div className="mt-1 text-[11px] leading-4 text-text-secondary">
                        {tt("reports.statusIssues")
                          .replace("{status}", statusLabel(item.project_status, locale, "project"))
                          .replace("{issues}", String(item.open_issues))}
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
                            {copy("Completion", "Завершение", "השלמה")}
                          </div>
                          <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                            {formatPercent(item.completion_pct)}
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
                      {copy("Completion", "Завершение", "השלמה")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topProjects.length === 0 ? (
                    <tr>
                      <td
                        className="px-3 py-3 text-text-secondary"
                        colSpan={4}
                      >
                        {tt("reports.noProfitableProjects")}
                      </td>
                    </tr>
                  ) : (
                    topProjects.map((item) => (
                      <tr
                        key={`top-${item.project_id}`}
                        className="border-t border-border"
                      >
                        <td className="px-3 py-2.5">
                          <div className="font-medium text-text">
                            {item.project_name}
                          </div>
                          <ProjectMarginNotice data={item} />
                          <div className="text-[11px] text-text-secondary">
                            {tt("reports.statusIssues")
                              .replace("{status}", statusLabel(item.project_status, locale, "project"))
                              .replace(
                                "{issues}",
                                String(item.open_issues),
                              )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-end">
                          {formatAmount(item.profit_total)}
                        </td>
                        <td className="px-3 py-2 text-end">
                          {formatPercent(item.margin_pct)}
                        </td>
                        <td className="px-3 py-2 text-end">
                          {formatPercent(item.completion_pct)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </>
          )}
        </div>

        <div className="overflow-hidden rounded-lg border border-border">
          <div className="px-3 py-2 border-b border-border bg-surface-subtle text-[12px] font-medium">
            {tt("reports.lowMarginRiskProjects")}
          </div>
          {riskQuery.isLoading ? (
            <div className="px-3 py-4 text-[13px] text-text-secondary">
              {tt("reports.loadingLowMarginProjects")}
            </div>
          ) : riskQuery.isError ? (
            <div className="px-3 py-4 text-[13px] text-status-problem-fg">
              {readError(
                riskQuery.error,
                tt("reports.failedLowMarginProjects"),
              )}
            </div>
          ) : (
            <>
              <div className="divide-y divide-border-subtle md:hidden">
                {riskProjects.length === 0 ? (
                  <div className="px-3.5 py-3 text-[12px] text-text-secondary">
                    {tt("reports.noLowMarginProjects")}
                  </div>
                ) : (
                  riskProjects.map((item) => (
                    <article
                      key={`mobile-risk-${item.project_id}`}
                      className="px-3.5 py-3"
                    >
                      <div className="min-w-0 text-[13px] font-semibold leading-5 text-text">
                        {item.project_name}
                      </div>
                      <ProjectMarginNotice data={item} />
                      <div className="mt-1 text-[11px] leading-4 text-text-secondary">
                        {tt("reports.completionIssues")
                          .replace(
                            "{completion}",
                            formatPercent(item.completion_pct),
                          )
                          .replace("{issues}", String(item.open_issues))}
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
                            {copy(
                              "Data Risk",
                              "Риск данных",
                              "סיכון נתונים",
                            )}
                          </div>
                          <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                            {projectMarginDataRisk(item)}
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
                      {copy("Data Risk", "Риск данных", "סיכון נתונים")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {riskProjects.length === 0 ? (
                    <tr>
                      <td
                        className="px-3 py-3 text-text-secondary"
                        colSpan={4}
                      >
                        {tt("reports.noLowMarginProjects")}
                      </td>
                    </tr>
                  ) : (
                    riskProjects.map((item) => (
                      <tr
                        key={`risk-${item.project_id}`}
                        className="border-t border-border"
                      >
                        <td className="px-3 py-2.5">
                          <div className="font-medium text-text">
                            {item.project_name}
                          </div>
                          <ProjectMarginNotice data={item} />
                          <div className="text-[11px] text-text-secondary">
                            {tt("reports.completionIssues")
                              .replace(
                                "{completion}",
                                formatPercent(item.completion_pct),
                              )
                              .replace(
                                "{issues}",
                                String(item.open_issues),
                              )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-end">
                          {formatAmount(item.profit_total)}
                        </td>
                        <td className="px-3 py-2 text-end">
                          {formatPercent(item.margin_pct)}
                        </td>
                        <td className="px-3 py-2 text-end">
                          {projectMarginDataRisk(item)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
