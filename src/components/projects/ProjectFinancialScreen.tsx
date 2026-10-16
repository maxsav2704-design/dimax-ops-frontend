"use client";

import { useRouter } from "next/navigation";
import { KpiCard as DimaxKpiCard, WidgetCard } from "@/components/dimax";
import { ProjectPricingNotice } from "@/components/prices/ProjectPricingNotice";
import { projectsMetricLabelClass } from "@/components/projects/project-form";
import { formatDateTime } from "@/components/projects/shared";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCopy, useI18n } from "@/lib/i18n";

import type { ProjectPlanFactResponse, ProjectRiskDrilldownResponse } from "./financial-types";
import { formatPct, riskTone } from "./shared";

type ProjectFinancialScreenProps = {
  projectId: string | null;
  formatMoney: (value: string | number | null | undefined) => string;
  planFact: ProjectPlanFactResponse | null;
  risk: ProjectRiskDrilldownResponse | null;
  loadingPlanFact: boolean;
  loadingRisk: boolean;
  tokenLabel: (value: string) => string;
};

// Projects → "Financial screen" card: plan/fact, risk drivers, delay reasons and orders at risk (read-only). Markup, state and handlers moved verbatim from ProjectsPage (monolith split).
export function ProjectFinancialScreen({
  projectId,
  formatMoney,
  planFact,
  risk,
  loadingPlanFact,
  loadingRisk,
  tokenLabel,
}: ProjectFinancialScreenProps) {
  const router = useRouter();
  const { t } = useI18n();
  const copy = useCopy();

  return (
    <WidgetCard
      id="project-financial-screen"
      title={t("projects.projectFinancialScreen")}
      headerMeta={t("projects.projectFinancialSubtitle")}
      actionSlot={
        projectId ? (
          <Button
            type="button"
            variant="outline"
            className="h-9"
            onClick={() =>
              router.push(
                `/reports?project_id=${encodeURIComponent(projectId)}`,
              )
            }
          >
            {copy(
              "Open project report",
              "Открыть отчёт по проекту",
              "פתח דוח פרויקט",
            )}
          </Button>
        ) : null
      }
    >
      <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="max-w-3xl">
          <p className="mt-1 text-[12px] leading-relaxed text-text-secondary">
            {loadingPlanFact || loadingRisk
              ? t("projects.refreshingFinancialView")
              : risk?.generated_at
                ? `${copy("Updated", "Обновлено", "עודכן")}: ${formatDateTime(risk.generated_at)}`
                : t("projects.financialDataReady")}
          </p>
        </div>
      </div>

      {loadingPlanFact || loadingRisk ? (
        <div className="text-[13px] text-text-secondary">
          {t("projects.loadingFinancialScreen")}
        </div>
      ) : planFact && risk ? (
        <div className="space-y-4">
          <ProjectPricingNotice data={planFact} />
          <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-2 xl:grid-cols-6">
            <DimaxKpiCard
              className="min-h-[176px]"
              label={copy("Completion", "Готовность", "השלמה")}
              value={formatPct(planFact.completion_pct)}
              hint={
                <>
                  {copy("Installed", "Установлено", "הותקן")}:{" "}
                  {planFact.installed_doors}/
                  {planFact.total_doors}
                </>
              }
              barColor="green"
            />
            <DimaxKpiCard
              className="min-h-[176px]"
              label={copy(
                "Actual Margin",
                "Фактическая маржа",
                "מרווח בפועל",
              )}
              value={formatPct(
                risk.summary.actual_margin_pct,
              )}
              hint={
                <>
                  {copy("Profit", "Прибыль", "רווח")}:{" "}
                  {formatMoney(
                    risk.summary.actual_profit_total,
                  )}
                </>
              }
              barColor="blue"
            />
            <DimaxKpiCard
              className="min-h-[176px]"
              label={copy(
                "Revenue Gap",
                "Разрыв по выручке",
                "פער בהכנסה",
              )}
              value={formatMoney(
                planFact.revenue_gap_total,
              )}
              hint={
                <>
                  {copy("Delayed", "Задержано", "בעיכוב")}:{" "}
                  {formatMoney(
                    risk.summary.delayed_revenue_total,
                  )}
                </>
              }
              barColor="orange"
            />
            <DimaxKpiCard
              className="min-h-[176px]"
              label={copy(
                "Profit Gap",
                "Разрыв по прибыли",
                "פער ברווח",
              )}
              value={formatMoney(
                planFact.profit_gap_total,
              )}
              hint={
                <>
                  {copy("Risk", "Риск", "סיכון")}:{" "}
                  {formatMoney(
                    risk.summary
                      .blocked_issue_profit_at_risk,
                  )}
                </>
              }
              barColor="yellow"
            />
            <DimaxKpiCard
              className="min-h-[176px]"
              label={copy(
                "Open Issues",
                "Открытые проблемы",
                "בעיות פתוחות",
              )}
              value={planFact.open_issues}
              hint={
                <>
                  {copy("Blocked", "Заблокировано", "חסום")}:{" "}
                  {risk.summary.blocked_open_issues}
                </>
              }
              barColor="red"
              emphasis={
                planFact.open_issues > 0
                  ? "problem"
                  : "default"
              }
            />
            <DimaxKpiCard
              className="min-h-[176px]"
              label={copy(
                "Data Risk",
                "Риск данных",
                "סיכון נתונים",
              )}
              value={planFact.missing_actual_rates_doors}
              hint={
                <>
                  {copy(
                    "Add-on gaps",
                    "Дополнительные пробелы",
                    "פערי תוספות",
                  )}
                  : {planFact.missing_addon_plans_facts}
                </>
              }
              barColor="orange"
              emphasis={
                planFact.missing_actual_rates_doors > 0
                  ? "problem"
                  : "default"
              }
            />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_0.95fr]">
            <WidgetCard
              title={t("projects.planVsFactLedger")}
              headerMeta={
                <>
                  {t("projects.addonsPlannedFact")
                    .replace(
                      "{planned}",
                      String(
                        planFact.planned_addons_qty,
                      ),
                    )
                    .replace(
                      "{actual}",
                      String(planFact.actual_addons_qty),
                    )}
                </>
              }
            >
              <div className="divide-y divide-border-subtle overflow-hidden rounded-lg border border-border bg-surface md:hidden">
                {[
                  {
                    label: t("projects.revenue"),
                    plan: formatMoney(
                      planFact.planned_revenue_total,
                    ),
                    fact: formatMoney(
                      planFact.actual_revenue_total,
                    ),
                    gap: formatMoney(
                      planFact.revenue_gap_total,
                    ),
                  },
                  {
                    label: t("projects.payroll"),
                    plan: formatMoney(
                      planFact.planned_payroll_total,
                    ),
                    fact: formatMoney(
                      planFact.actual_payroll_total,
                    ),
                    gap: formatMoney(
                      planFact.payroll_gap_total,
                    ),
                  },
                  {
                    label: t("projects.profit"),
                    plan: formatMoney(
                      planFact.planned_profit_total,
                    ),
                    fact: formatMoney(
                      planFact.actual_profit_total,
                    ),
                    gap: formatMoney(
                      planFact.profit_gap_total,
                    ),
                  },
                  {
                    label: t("projects.addons"),
                    plan: String(
                      planFact.planned_addons_qty,
                    ),
                    fact: String(
                      planFact.actual_addons_qty,
                    ),
                    gap: String(
                      Number(planFact.actual_addons_qty) -
                        Number(planFact.planned_addons_qty),
                    ),
                  },
                ].map((row) => (
                  <article
                    key={row.label}
                    className="px-3.5 py-3.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 text-[13px] font-semibold text-text">
                        {row.label}
                      </div>
                      <div className="shrink-0 rounded-full bg-surface-sunken px-2 py-1 text-[10.5px] font-medium leading-none text-text-secondary">
                        {t("projects.gap")}
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                        <div className={projectsMetricLabelClass}>
                          {t("projects.plan")}
                        </div>
                        <div className="mt-1 text-[12px] font-medium text-text tabular-nums">
                          {row.plan}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                        <div className={projectsMetricLabelClass}>
                          {t("projects.fact")}
                        </div>
                        <div className="mt-1 text-[12px] font-medium text-text tabular-nums">
                          {row.fact}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                        <div className={projectsMetricLabelClass}>
                          {t("projects.gap")}
                        </div>
                        <div className="mt-1 text-[12px] font-medium text-text tabular-nums">
                          {row.gap}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              <div className="hidden overflow-auto rounded-lg border border-border bg-surface md:block">
                <table className="min-w-[760px] w-full text-[12px] leading-5">
                  <thead className="bg-surface-subtle text-text-secondary">
                    <tr>
                      <th className="px-3 py-2 text-start font-medium">
                        {t("projects.metric")}
                      </th>
                      <th className="px-3 py-2 text-start font-medium">
                        {t("projects.plan")}
                      </th>
                      <th className="px-3 py-2 text-start font-medium">
                        {t("projects.fact")}
                      </th>
                      <th className="px-3 py-2 text-start font-medium">
                        {t("projects.gap")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-border bg-surface-subtle">
                      <td className="px-3 py-2 font-medium">
                        {t("projects.revenue")}
                      </td>
                      <td className="px-3 py-2">
                        {formatMoney(
                          planFact.planned_revenue_total,
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {formatMoney(
                          planFact.actual_revenue_total,
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {formatMoney(
                          planFact.revenue_gap_total,
                        )}
                      </td>
                    </tr>
                    <tr className="border-t border-border">
                      <td className="px-3 py-2 font-medium">
                        {t("projects.payroll")}
                      </td>
                      <td className="px-3 py-2">
                        {formatMoney(
                          planFact.planned_payroll_total,
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {formatMoney(
                          planFact.actual_payroll_total,
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {formatMoney(
                          planFact.payroll_gap_total,
                        )}
                      </td>
                    </tr>
                    <tr className="border-t border-border bg-surface-subtle">
                      <td className="px-3 py-2 font-medium">
                        {t("projects.profit")}
                      </td>
                      <td className="px-3 py-2">
                        {formatMoney(
                          planFact.planned_profit_total,
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {formatMoney(
                          planFact.actual_profit_total,
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {formatMoney(
                          planFact.profit_gap_total,
                        )}
                      </td>
                    </tr>
                    <tr className="border-t border-border">
                      <td className="px-3 py-2 font-medium">
                        {t("projects.addons")}
                      </td>
                      <td className="px-3 py-2">
                        {planFact.planned_addons_qty}
                      </td>
                      <td className="px-3 py-2">
                        {planFact.actual_addons_qty}
                      </td>
                      <td className="px-3 py-2">
                        {Number(planFact.actual_addons_qty) -
                          Number(planFact.planned_addons_qty)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </WidgetCard>

            <WidgetCard title={t("projects.riskDrivers")}>
              <div className="space-y-2">
                {risk.drivers.length > 0 ? (
                  risk.drivers.map((driver) => (
                    <div
                      key={driver.code}
                      className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2.5"
                    >
                      <div>
                        <div className="text-[12px] font-medium text-text">
                          {driver.label}
                        </div>
                        <div className="text-[11px] text-text-secondary">
                          {driver.code}
                        </div>
                      </div>
                      <div className="text-end">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                            riskTone(driver.severity),
                          )}
                        >
                          {tokenLabel(driver.severity)}
                        </span>
                        <div className="mt-1 text-[12px] text-text-secondary">
                          {driver.code.includes("ISSUE")
                            ? driver.value
                            : formatMoney(driver.value)}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-[12px] text-text-secondary">
                    {t("projects.noRiskDrivers")}
                  </div>
                )}
              </div>
            </WidgetCard>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <WidgetCard title={t("projects.topDelayReasons")}>
              <div className="divide-y divide-border-subtle overflow-hidden rounded-lg border border-border bg-surface md:hidden">
                {risk.top_reasons.length > 0 ? (
                  risk.top_reasons.map((reason) => (
                    <article
                      key={
                        reason.reason_id || reason.reason_name
                      }
                      className="px-3.5 py-3.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 break-words text-[13px] font-semibold leading-5 text-text">
                          {reason.reason_name}
                        </div>
                        <div className="shrink-0 text-end">
                          <div className={projectsMetricLabelClass}>
                            {t("projects.doors")}
                          </div>
                          <div className="mt-1 text-[17px] font-medium leading-tight text-text tabular-nums">
                            {reason.doors}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                          <div className={projectsMetricLabelClass}>
                            {t("projects.revenue")}
                          </div>
                          <div className="mt-1 text-[13px] font-medium text-text tabular-nums">
                            {formatMoney(
                              reason.revenue_delayed_total,
                            )}
                          </div>
                        </div>
                        <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                          <div className={projectsMetricLabelClass}>
                            {t("projects.profit")}
                          </div>
                          <div className="mt-1 text-[13px] font-medium text-text tabular-nums">
                            {formatMoney(
                              reason.profit_delayed_total,
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="px-3.5 py-4 text-[12px] text-text-secondary">
                    {t("projects.noDelayReasons")}
                  </div>
                )}
              </div>
              <div className="hidden overflow-auto rounded-lg border border-border bg-surface md:block">
                <table className="min-w-[760px] w-full text-[12px] leading-5">
                  <thead className="bg-surface-subtle text-text-secondary">
                    <tr>
                      <th className="px-3 py-2 text-start font-medium">
                        {t("projects.reason")}
                      </th>
                      <th className="px-3 py-2 text-start font-medium">
                        {t("projects.doors")}
                      </th>
                      <th className="px-3 py-2 text-start font-medium">
                        {t("projects.revenue")}
                      </th>
                      <th className="px-3 py-2 text-start font-medium">
                        {t("projects.profit")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {risk.top_reasons.length > 0 ? (
                      risk.top_reasons.map((reason) => (
                        <tr
                          key={
                            reason.reason_id ||
                            reason.reason_name
                          }
                          className="border-t border-border"
                        >
                          <td className="px-3 py-2">
                            {reason.reason_name}
                          </td>
                          <td className="px-3 py-2">
                            {reason.doors}
                          </td>
                          <td className="px-3 py-2">
                            {formatMoney(
                              reason.revenue_delayed_total,
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {formatMoney(
                              reason.profit_delayed_total,
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr className="border-t border-border">
                        <td
                          className="px-3 py-2 text-text-secondary"
                          colSpan={4}
                        >
                          {t("projects.noDelayReasons")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </WidgetCard>

            <WidgetCard title={t("projects.ordersAtRisk")}>
              <div className="divide-y divide-border-subtle overflow-hidden rounded-lg border border-border bg-surface md:hidden">
                {risk.risky_orders.length > 0 ? (
                  risk.risky_orders.map((order) => (
                    <article
                      key={order.order_number}
                      className="px-3.5 py-3.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[13px] font-semibold text-text">
                            {order.order_number}
                          </div>
                          <div className="mt-1 text-[12px] text-text-secondary">
                            {copy(
                              "Installed",
                              "Установлено",
                              "הותקן",
                            )}
                            : {order.installed_doors}/
                            {order.total_doors}
                          </div>
                        </div>
                        <div className="shrink-0 text-end">
                          <div className={projectsMetricLabelClass}>
                            {t("projects.completion")}
                          </div>
                          <div className="mt-1 text-[17px] font-medium leading-tight text-text tabular-nums">
                            {formatPct(order.completion_pct)}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                          <div className={projectsMetricLabelClass}>
                            {t("projects.issues")}
                          </div>
                          <div className="mt-1 text-[13px] font-medium text-text tabular-nums">
                            {order.open_issues}
                          </div>
                        </div>
                        <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                          <div className={projectsMetricLabelClass}>
                            {t("projects.gap")}
                          </div>
                          <div className="mt-1 text-[13px] font-medium text-text tabular-nums">
                            {formatMoney(
                              order.revenue_gap_total,
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="px-3.5 py-4 text-[12px] text-text-secondary">
                    {t("projects.noRiskyOrders")}
                  </div>
                )}
              </div>
              <div className="hidden overflow-auto rounded-lg border border-border bg-surface md:block">
                <table className="min-w-[760px] w-full text-[12px] leading-5">
                  <thead className="bg-surface-subtle text-text-secondary">
                    <tr>
                      <th className="px-3 py-2 text-start font-medium">
                        {copy(
                          "Order Number",
                          "Номер заказа",
                          "מספר הזמנה",
                        )}
                      </th>
                      <th className="px-3 py-2 text-start font-medium">
                        {t("projects.completion")}
                      </th>
                      <th className="px-3 py-2 text-start font-medium">
                        {t("projects.issues")}
                      </th>
                      <th className="px-3 py-2 text-start font-medium">
                        {t("projects.gap")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {risk.risky_orders.length > 0 ? (
                      risk.risky_orders.map((order) => (
                        <tr
                          key={order.order_number}
                          className="border-t border-border"
                        >
                          <td className="px-3 py-2 font-medium">
                            {order.order_number}
                          </td>
                          <td className="px-3 py-2">
                            {formatPct(order.completion_pct)}
                          </td>
                          <td className="px-3 py-2">
                            {order.open_issues}
                          </td>
                          <td className="px-3 py-2">
                            {formatMoney(
                              order.revenue_gap_total,
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr className="border-t border-border">
                        <td
                          className="px-3 py-2 text-text-secondary"
                          colSpan={4}
                        >
                          {t("projects.noRiskyOrders")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </WidgetCard>
          </div>
        </div>
      ) : (
        <div className="mt-4 text-[13px] text-text-secondary">
          {t("projects.financialUnavailable")}
        </div>
      )}
      </div>
    </WidgetCard>
  );
}
