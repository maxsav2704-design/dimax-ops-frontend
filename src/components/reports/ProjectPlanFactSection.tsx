"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import type { UseQueryResult } from "@tanstack/react-query";
import { ProjectPricingNotice } from "@/components/prices/ProjectPricingNotice";
import { Button } from "@/components/ui/button";
import { ReceiptText } from "lucide-react";

import { formatAmount, formatCount, formatPercent, reportsPanelClass, useReportsText } from "./shared";
import { SectionMessage } from "./widgets";
import type { ProjectAddonPlanItem, ProjectOption, ProjectPlanFactResponse, UrgencySurchargeItem } from "./types";

type ProjectPlanFactSectionProps = {
  planFactQuery: UseQueryResult<ProjectPlanFactResponse>;
  addonPlanQuery: UseQueryResult<ProjectAddonPlanItem[]>;
  urgencySurchargesQuery: UseQueryResult<UrgencySurchargeItem[]>;
  projectsQuery: UseQueryResult<{ items: ProjectOption[] }>;
  projectId: string;
  onProjectIdChange: (value: string) => void;
};

// Reports → "Project plan/fact": commercial plan vs actual per project with add-on and urgency totals. Markup moved verbatim from ReportsPage (section split).
export function ProjectPlanFactSection({ planFactQuery, addonPlanQuery, urgencySurchargesQuery, projectsQuery, projectId, onProjectIdChange }: ProjectPlanFactSectionProps) {
  const router = useRouter();
  const { t, tt, copy, readError } = useReportsText();
  const projectOptions = useMemo(
    () => projectsQuery.data?.items || [],
    [projectsQuery.data?.items],
  );
  const projectPlanFact = planFactQuery.data;
  const projectAddonPlan = useMemo(
    () => addonPlanQuery.data || [],
    [addonPlanQuery.data],
  );
  const projectUrgencySurcharges = useMemo(
    () => urgencySurchargesQuery.data || [],
    [urgencySurchargesQuery.data],
  );
  const selectedProjectPlanFact = useMemo(
    () =>
      projectOptions.find(
        (project) => project.id === projectId,
      ) || null,
    [projectOptions, projectId],
  );
  const projectAddonPlanTotals = useMemo(
    () =>
      projectAddonPlan.reduce(
        (acc, item) => {
          const qty = Number(item.qty_planned) || 0;
          const clientPrice = Number(item.client_price) || 0;
          const installerPrice = Number(item.installer_price) || 0;
          if (qty > 0 && item.installer_price == null) acc.missingPrice = true;
          acc.rows += 1;
          acc.qty += qty;
          acc.client += qty * clientPrice;
          acc.installer += qty * installerPrice;
          return acc;
        },
        { rows: 0, qty: 0, client: 0, installer: 0, missingPrice: false },
      ),
    [projectAddonPlan],
  );
  const projectUrgencyTotals = useMemo(
    () =>
      projectUrgencySurcharges.reduce(
        (acc, item) => {
          acc.rows += 1;
          acc.client += Number(item.client_amount) || 0;
          acc.installer += Number(item.installer_amount) || 0;
          if (item.scope === "ORDER_NUMBER") {
            acc.orderScoped += 1;
          }
          return acc;
        },
        { rows: 0, client: 0, installer: 0, orderScoped: 0 },
      ),
    [projectUrgencySurcharges],
  );
  const projectUrgencyContractTotals = useMemo(() => {
    const client =
      Number(
        projectPlanFact?.urgency_client_total ?? projectUrgencyTotals.client,
      ) || 0;
    const installer =
      Number(
        projectPlanFact?.urgency_installer_total ??
          projectUrgencyTotals.installer,
      ) || 0;
    return {
      rows:
        Number(
          projectPlanFact?.urgency_surcharges_count ??
            projectUrgencyTotals.rows,
        ) || 0,
      orderScoped:
        Number(
          projectPlanFact?.urgency_order_surcharges_count ??
            projectUrgencyTotals.orderScoped,
        ) || 0,
      client,
      installer,
      profit:
        Number(projectPlanFact?.urgency_profit_total ?? client - installer) ||
        0,
    };
  }, [projectPlanFact, projectUrgencyTotals]);
  const projectCommercialAdjustments = useMemo(
    () => ({
      rows: projectAddonPlanTotals.rows + projectUrgencyContractTotals.rows,
      client:
        projectAddonPlanTotals.client + projectUrgencyContractTotals.client,
      installer:
        projectAddonPlanTotals.installer +
        (projectPlanFact?.pricing_mode === "FACTORY" ? 0 : projectUrgencyContractTotals.installer),
    }),
    [projectAddonPlanTotals, projectUrgencyContractTotals, projectPlanFact?.pricing_mode],
  );
  const projectPlanFactRows = projectPlanFact
    ? [
        {
          label: t("reports.revenue"),
          plan: formatAmount(projectPlanFact.planned_revenue_total),
          fact: formatAmount(projectPlanFact.actual_revenue_total),
          gap: formatAmount(projectPlanFact.revenue_gap_total),
        },
        {
          label: tt("reports.payroll"),
          plan: formatAmount(projectPlanFact.planned_payroll_total),
          fact: formatAmount(projectPlanFact.actual_payroll_total),
          gap: formatAmount(projectPlanFact.payroll_gap_total),
        },
        {
          label: copy("Profit", "Прибыль", "רווח"),
          plan: formatAmount(projectPlanFact.planned_profit_total),
          fact: formatAmount(projectPlanFact.actual_profit_total),
          gap: formatAmount(projectPlanFact.profit_gap_total),
        },
      ]
    : [];

  return (
    <div
      id="reports-project-plan-fact"
      className={reportsPanelClass("overflow-hidden")}
    >
      <div className="px-4 py-3 border-b border-border bg-surface-subtle flex flex-col items-stretch gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-[11px] uppercase text-text-secondary">
            {tt("reports.projectPlanVsFactTitle")}
          </div>
          <div className="text-[13px] text-text-secondary">
            {tt("reports.projectPlanVsFactSubtitle")}
          </div>
        </div>
        <select
          aria-label={copy("Project Plan Fact Filter", "Фильтр план/факт по объекту", "מסנן תכנון מול ביצוע לפי פרויקט")}
          value={projectId}
          onChange={(e) => onProjectIdChange(e.target.value)}
          className="h-9 w-full min-w-0 rounded-md border border-border bg-surface px-2 text-[13px] md:w-auto md:max-w-[280px]"
        >
          <option value="">
            {projectsQuery.isLoading
              ? t("reports.loadingProjects")
              : t("reports.selectProject")}
          </option>
          {projectOptions.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>

      {projectsQuery.isLoading && !projectId && (
        <div className="px-4 py-6">
          <SectionMessage
            title={tt("reports.loadingProjectsForPlanFact")}
            detail={tt("reports.preparingPlanFactFilters")}
          />
        </div>
      )}
      {!projectsQuery.isLoading && projectOptions.length === 0 && (
        <div className="px-4 py-6">
          <SectionMessage
            title={t("reports.noProjectsForPlanFact")}
            detail={t("reports.importFactoryFileFirst")}
          />
        </div>
      )}
      {!projectsQuery.isLoading &&
        projectOptions.length > 0 &&
        !projectId && (
          <div className="px-4 py-6">
            <SectionMessage
              title={t("reports.selectProject")}
              detail={t("reports.selectProjectPlanFact")}
            />
          </div>
        )}
      {planFactQuery.isLoading && projectId && (
        <div className="px-4 py-6 text-[13px] text-text-secondary">
          {tt("reports.loadingProjectPlanFact")}
        </div>
      )}
      {planFactQuery.isError && projectId && (
        <div className="px-4 py-6 text-[13px] text-status-problem-fg">
          {readError(
            planFactQuery.error,
            tt("reports.failedProjectPlanFact"),
          )}
        </div>
      )}
      {!planFactQuery.isLoading &&
        !planFactQuery.isError &&
        projectPlanFact && (
          <div className="p-4 space-y-4">
            <ProjectPricingNotice data={projectPlanFact} />
            <div className="rounded-lg border border-border bg-surface-subtle p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="max-w-3xl">
                  <div className="text-[11px] uppercase text-text-secondary">
                    {copy(
                      "Commercial Adjustments",
                      "Коммерческие корректировки",
                      "התאמות מסחריות",
                    )}
                  </div>
                  <div className="mt-1 text-[13px] text-text-secondary">
                    {copy(
                      `Cross-check add-on plans and urgency uplift for ${selectedProjectPlanFact?.name || "the selected project"} before drilling deeper into margin risk.`,
                      `Сверьте план доп. работ и срочную надбавку для ${selectedProjectPlanFact?.name || "выбранного проекта"} до детального разбора маржи и рисков.`,
                      `בדוק את תוכנית העבודות הנוספות ותוספת הדחיפות עבור ${selectedProjectPlanFact?.name || "הפרויקט הנבחר"} לפני ירידה עמוקה יותר לסיכון המרווח.`,
                    )}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-surface px-3 py-2 text-[12px] text-text-secondary">
                  {copy("Plan rows", "Строк плана", "שורות תוכנית")}:{" "}
                  {formatCount(projectCommercialAdjustments.rows)}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg border border-border bg-surface p-3">
                  <div className="text-[11px] uppercase text-text-secondary">
                    {copy(
                      "Client uplift",
                      "Надбавка клиента",
                      "תוספת לקוח",
                    )}
                  </div>
                  <div className="mt-1 text-lg font-semibold tabular-nums text-text">
                    {formatAmount(projectCommercialAdjustments.client)}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-surface p-3">
                  <div className="text-[11px] uppercase text-text-secondary">
                    {copy(
                      projectPlanFact.pricing_mode === "FACTORY" ? "Additional work payroll plan" : "Installer uplift",
                      projectPlanFact.pricing_mode === "FACTORY" ? "План начислений за допработы" : "Надбавка монтажника",
                      projectPlanFact.pricing_mode === "FACTORY" ? "תכנון שכר לעבודות נוספות" : "תוספת מתקין",
                    )}
                  </div>
                  <div className="mt-1 text-lg font-semibold tabular-nums text-text">
                    {projectAddonPlanTotals.missingPrice ? copy("No confirmed price", "Нет подтверждённой цены", "אין מחיר מאושר") : formatAmount(projectCommercialAdjustments.installer)}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-surface p-3">
                  <div className="text-[11px] uppercase text-text-secondary">
                    {copy(
                      "Unreconciled add-on facts",
                      "Несогласованные дополнительные факты",
                      "עובדות תוספות לא מתואמות",
                    )}
                  </div>
                  <div className="mt-1 text-lg font-semibold tabular-nums text-text">
                    {formatCount(projectPlanFact.missing_addon_plans_facts)}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-surface p-3">
                  <div className="text-[11px] uppercase text-text-secondary">
                    {copy(
                      "Order-level urgency",
                      "Срочность по заказам",
                      "דחיפות ברמת הזמנה",
                    )}
                  </div>
                  <div className="mt-1 text-lg font-semibold tabular-nums text-text">
                    {formatCount(projectUrgencyContractTotals.orderScoped)}
                  </div>
                </div>
              </div>
              {selectedProjectPlanFact && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9"
                    onClick={() =>
                      router.push(
                        `/projects?project_id=${selectedProjectPlanFact.id}&focus_section=addons`,
                      )
                    }
                  >
                    {copy(
                      "Open pricing flow",
                      "Открыть блок цен",
                      "פתח את בלוק התמחור",
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9"
                    onClick={() =>
                      router.push(
                        `/projects?project_id=${selectedProjectPlanFact.id}&focus_section=urgency`,
                      )
                    }
                  >
                    {copy(
                      "Open urgency rows",
                      "Открыть срочные надбавки",
                      "פתח שורות דחיפות",
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9"
                    onClick={() =>
                      router.push(
                        `/earnings-ledger?project_id=${selectedProjectPlanFact.id}`,
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
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="rounded-lg border border-border bg-surface p-3">
                <div className="text-[11px] uppercase text-text-secondary">
                  {t("projects.completion")}
                </div>
                <div className="mt-2 text-[22px] font-semibold text-text">
                  {formatPercent(projectPlanFact.completion_pct)}
                </div>
                <div className="mt-1 text-[12px] text-text-secondary">
                  {projectPlanFact.installed_doors} /{" "}
                  {projectPlanFact.total_doors}{" "}
                  {t("reports.doors").toLowerCase()} {copy("installed", "установлен", "מותקן")}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-surface p-3">
                <div className="text-[11px] uppercase text-text-secondary">
                  {t("reports.openIssuesExposure")}
                </div>
                <div className="mt-2 text-[22px] font-semibold text-text">
                  {projectPlanFact.open_issues}
                </div>
                <div className="mt-1 text-[12px] text-text-secondary">
                  {projectPlanFact.not_installed_doors}{" "}
                  {t("reports.doors").toLowerCase()} {copy("still pending", "все еще находится на рассмотрении", "עדיין בהמתנה")}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-surface p-3">
                <div className="text-[11px] uppercase text-text-secondary">
                  {t("projects.missingRates")}
                </div>
                <div className="mt-2 text-[22px] font-semibold text-text">
                  {projectPlanFact.missing_planned_rates_doors}
                </div>
                <div className="mt-1 text-[12px] text-text-secondary">
                  {tt("reports.actualMissing")}:{" "}
                  {projectPlanFact.missing_actual_rates_doors}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-surface p-3">
                <div className="text-[11px] uppercase text-text-secondary">
                  {t("projects.addons")}
                </div>
                <div className="mt-2 text-[22px] font-semibold text-text">
                  {formatAmount(projectPlanFact.actual_addons_qty)} /{" "}
                  {formatAmount(projectPlanFact.planned_addons_qty)}
                </div>
                <div className="mt-1 text-[12px] text-text-secondary">
                  {t("reports.missingPlans")}:{" "}
                  {projectPlanFact.missing_addon_plans_facts}
                </div>
              </div>
            </div>

            <div className="divide-y divide-border-subtle overflow-hidden rounded-lg border border-border bg-surface md:hidden">
              {projectPlanFactRows.map((row) => (
                <article
                  key={`${row.label}-mobile`}
                  className="px-3.5 py-3.5"
                >
                  <div className="text-[13px] font-semibold leading-5 text-text">
                    {row.label}
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                      <div className="text-[10.5px] font-semibold uppercase text-text-secondary">
                        {t("reports.plan")}
                      </div>
                      <div className="mt-1 text-[13px] font-medium text-text tabular-nums">
                        {row.plan}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                      <div className="text-[10.5px] font-semibold uppercase text-text-secondary">
                        {t("reports.fact")}
                      </div>
                      <div className="mt-1 text-[13px] font-medium text-text tabular-nums">
                        {row.fact}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                      <div className="text-[10.5px] font-semibold uppercase text-text-secondary">
                        {t("reports.gap")}
                      </div>
                      <div className="mt-1 text-[13px] font-medium text-text tabular-nums">
                        {row.gap}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-auto rounded-lg border border-border md:block">
              <table className="w-full text-[13px]">
                <thead className="bg-surface-subtle text-text-secondary">
                  <tr>
                    <th className="text-start px-3 py-2 font-medium">
                      {t("reports.metric")}
                    </th>
                    <th className="text-end px-3 py-2 font-medium">
                      {t("reports.plan")}
                    </th>
                    <th className="text-end px-3 py-2 font-medium">
                      {t("reports.fact")}
                    </th>
                    <th className="text-end px-3 py-2 font-medium">
                      {t("reports.gap")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {projectPlanFactRows.map((row) => (
                    <tr key={row.label} className="border-t border-border">
                      <td className="px-3 py-2.5 font-medium text-text">
                        {row.label}
                      </td>
                      <td className="px-3 py-2 text-end">{row.plan}</td>
                      <td className="px-3 py-2 text-end">{row.fact}</td>
                      <td className="px-3 py-2 text-end">{row.gap}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div className="rounded-lg border border-border bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="max-w-[32rem]">
                    <div className="text-[11px] uppercase text-text-secondary">
                      {copy(
                        "Additional Works Plan",
                        "План доп. работ",
                        "תוכנית עבודות נוספות",
                      )}
                    </div>
                    <div className="mt-1 text-[12px] text-text-secondary">
                      {copy(
                        "Planned add-on rows that should later reconcile with installer facts.",
                        "Плановые строки доп. работ, которые позже должны сойтись с фактами монтажника.",
                        "שורות תוספות מתוכננות שאמורות להתאים מאוחר יותר עם עובדות המתקין.",
                      )}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-surface-subtle px-3 py-2 text-end text-[12px] text-text-secondary">
                    {copy("Rows", "Строки", "שורות")}:{" "}
                    {projectAddonPlanTotals.rows}
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-border bg-surface-subtle p-3">
                    <div className="text-[11px] uppercase text-text-secondary">
                      {copy("Qty planned", "План", "כמות")}
                    </div>
                    <div className="mt-1 text-lg font-semibold tabular-nums text-text">
                      {formatAmount(projectAddonPlanTotals.qty)}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-surface-subtle p-3">
                    <div className="text-[11px] uppercase text-text-secondary">
                      {copy("Client total", "Сумма клиента", 'סה"כ לקוח')}
                    </div>
                    <div className="mt-1 text-lg font-semibold tabular-nums text-text">
                      {formatAmount(projectAddonPlanTotals.client)}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-surface-subtle p-3">
                    <div className="text-[11px] uppercase text-text-secondary">
                      {copy(
                        "Installer total",
                        "Сумма монтажника",
                        'סה"כ מתקין',
                      )}
                    </div>
                    <div className="mt-1 text-lg font-semibold tabular-nums text-text">
                      {projectAddonPlanTotals.missingPrice ? copy("No confirmed price", "Нет подтверждённой цены", "אין מחיר מאושר") : formatAmount(projectAddonPlanTotals.installer)}
                    </div>
                  </div>
                </div>
                <div className="mt-3 divide-y divide-border-subtle overflow-hidden rounded-lg border border-border md:hidden">
                  {addonPlanQuery.isLoading ? (
                    <div className="px-3.5 py-3 text-[12px] text-text-secondary">
                      {copy(
                        "Loading additional works plan...",
                        "Загружаем план доп. работ...",
                        "טוען תוכנית עבודות נוספות...",
                      )}
                    </div>
                  ) : projectAddonPlan.length === 0 ? (
                    <div className="px-3.5 py-3 text-[12px] text-text-secondary">
                      {copy(
                        "No planned additional works for this project.",
                        "Для этого проекта нет запланированных доп. работ.",
                        "אין עבודות נוספות מתוכננות לפרויקט זה.",
                      )}
                    </div>
                  ) : (
                    projectAddonPlan.slice(0, 4).map((item, index) => (
                      <article
                        key={`${item.id || `${item.addon_type_id}-${index}`}-mobile`}
                        className="px-3.5 py-3.5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 text-[13px] font-semibold leading-5 text-text">
                            {item.addon_name || item.addon_type_id}
                          </div>
                          <div className="shrink-0 rounded-full bg-surface-subtle px-2 py-1 text-[10.5px] font-medium leading-none text-text-secondary">
                            {copy("Qty", "Кол-во", "כמות")}:{" "}
                            {formatAmount(Number(item.qty_planned) || 0)}
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                            <div className="text-[10.5px] font-semibold uppercase text-text-secondary">
                              {copy("Client", "Клиент", "לקוח")}
                            </div>
                            <div className="mt-1 text-[13px] font-medium text-text tabular-nums">
                              {formatAmount(Number(item.client_price) || 0)}
                            </div>
                          </div>
                          <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                            <div className="text-[10.5px] font-semibold uppercase text-text-secondary">
                              {copy("Installer", "Монтажник", "מתקין")}
                            </div>
                            <div className="mt-1 text-[13px] font-medium text-text tabular-nums">
                              {item.installer_price == null ? copy("No confirmed price", "Нет подтверждённой цены", "אין מחיר מאושר") : formatAmount(Number(item.installer_price))}
                            </div>
                          </div>
                        </div>
                      </article>
                    ))
                  )}
                </div>
                <div className="mt-3 hidden overflow-auto rounded-lg border border-border md:block">
                  <table className="min-w-[520px] w-full text-[12px] leading-5">
                    <thead className="bg-surface-subtle text-text-secondary">
                      <tr>
                        <th className="px-3 py-2.5 text-start font-medium">
                          {tt("reports.addon")}
                        </th>
                        <th className="px-3 py-2.5 text-end font-medium">
                          {copy("Qty", "Кол-во", "כמות")}
                        </th>
                        <th className="px-3 py-2.5 text-end font-medium">
                          {copy("Client", "Клиент", "לקוח")}
                        </th>
                        <th className="px-3 py-2.5 text-end font-medium">
                          {copy("Installer", "Монтажник", "מתקין")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {addonPlanQuery.isLoading ? (
                        <tr>
                          <td
                            className="px-3 py-3 text-text-secondary"
                            colSpan={4}
                          >
                            {copy(
                              "Loading additional works plan...",
                              "Загружаем план доп. работ...",
                              "טוען תוכנית עבודות נוספות...",
                            )}
                          </td>
                        </tr>
                      ) : projectAddonPlan.length === 0 ? (
                        <tr>
                          <td
                            className="px-3 py-3 text-text-secondary"
                            colSpan={4}
                          >
                            {copy(
                              "No planned additional works for this project.",
                              "Для этого проекта нет запланированных доп. работ.",
                              "אין עבודות נוספות מתוכננות לפרויקט זה.",
                            )}
                          </td>
                        </tr>
                      ) : (
                        projectAddonPlan.slice(0, 4).map((item, index) => (
                          <tr
                            key={
                              item.id || `${item.addon_type_id}-${index}`
                            }
                            className="border-t border-border"
                          >
                            <td className="px-3 py-2.5 font-medium text-text">
                              {item.addon_name || item.addon_type_id}
                            </td>
                            <td className="px-3 py-2.5 text-end tabular-nums">
                              {formatAmount(Number(item.qty_planned) || 0)}
                            </td>
                            <td className="px-3 py-2.5 text-end tabular-nums">
                              {formatAmount(Number(item.client_price) || 0)}
                            </td>
                            <td className="px-3 py-2.5 text-end tabular-nums">
                              {item.installer_price == null ? copy("No confirmed price", "Нет подтверждённой цены", "אין מחיר מאושר") : formatAmount(Number(item.installer_price))}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="max-w-[32rem]">
                    <div className="text-[11px] uppercase text-text-secondary">
                      {copy(
                        "Urgency Surcharge",
                        "Срочная надбавка",
                        "תוספת דחיפות",
                      )}
                    </div>
                    <div className="mt-1 text-[12px] text-text-secondary">
                      {copy(
                        "Separate urgency uplift rows that should stay visible in project commercial review.",
                        "Отдельные строки срочной надбавки, которые должны быть видимы в коммерческом разборе проекта.",
                        "שורות תוספת דחיפות נפרדות שצריכות להישאר גלויות בבדיקה המסחרית של הפרויקט.",
                      )}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-surface-subtle px-3 py-2 text-end text-[12px] text-text-secondary">
                    {copy("Rows", "Строки", "שורות")}:{" "}
                    {projectUrgencyContractTotals.rows}
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-border bg-surface-subtle p-3">
                    <div className="text-[11px] uppercase text-text-secondary">
                      {copy("Order-scoped", "По заказу", "לפי הזמנה")}
                    </div>
                    <div className="mt-1 text-lg font-semibold tabular-nums text-text">
                      {projectUrgencyContractTotals.orderScoped}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-surface-subtle p-3">
                    <div className="text-[11px] uppercase text-text-secondary">
                      {copy(
                        "Client uplift",
                        "Надбавка клиента",
                        "תוספת לקוח",
                      )}
                    </div>
                    <div className="mt-1 text-lg font-semibold tabular-nums text-text">
                      {formatAmount(projectUrgencyContractTotals.client)}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-surface-subtle p-3">
                    <div className="text-[11px] uppercase text-text-secondary">
                      {copy(
                        "Installer uplift",
                        "Надбавка монтажника",
                        "תוספת מתקין",
                      )}
                    </div>
                    <div className="mt-1 text-lg font-semibold tabular-nums text-text">
                      {formatAmount(projectUrgencyContractTotals.installer)}
                    </div>
                  </div>
                </div>
                <div className="mt-3 divide-y divide-border-subtle overflow-hidden rounded-lg border border-border md:hidden">
                  {urgencySurchargesQuery.isLoading ? (
                    <div className="px-3.5 py-3 text-[12px] text-text-secondary">
                      {copy(
                        "Loading urgency surcharge rows...",
                        "Загружаем строки срочной надбавки...",
                        "טוען שורות תוספת דחיפות...",
                      )}
                    </div>
                  ) : projectUrgencySurcharges.length === 0 ? (
                    <div className="px-3.5 py-3 text-[12px] text-text-secondary">
                      {copy(
                        "No urgency surcharge rows for this project.",
                        "Для этого проекта нет строк срочной надбавки.",
                        "אין שורות תוספת דחיפות לפרויקט זה.",
                      )}
                    </div>
                  ) : (
                    projectUrgencySurcharges
                      .slice(0, 4)
                      .map((item, index) => (
                        <article
                          key={`${item.id || `${item.scope}-${index}`}-mobile`}
                          className="px-3.5 py-3.5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-[13px] font-semibold leading-5 text-text">
                                {item.reason}
                              </div>
                              <div className="mt-1 text-[11px] text-text-secondary">
                                {item.scope === "ORDER_NUMBER"
                                  ? `${copy("Order", "Заказ", "הזמנה")}${item.order_number ? ` • ${item.order_number}` : ""}`
                                  : copy("Project", "Проект", "פרויקט")}
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                              <div className="text-[10.5px] font-semibold uppercase text-text-secondary">
                                {copy("Client", "Клиент", "לקוח")}
                              </div>
                              <div className="mt-1 text-[13px] font-medium text-text tabular-nums">
                                {formatAmount(
                                  Number(item.client_amount) || 0,
                                )}
                              </div>
                            </div>
                            <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                              <div className="text-[10.5px] font-semibold uppercase text-text-secondary">
                                {copy("Installer", "Монтажник", "מתקין")}
                              </div>
                              <div className="mt-1 text-[13px] font-medium text-text tabular-nums">
                                {formatAmount(
                                  Number(item.installer_amount) || 0,
                                )}
                              </div>
                            </div>
                          </div>
                        </article>
                      ))
                  )}
                </div>
                <div className="mt-3 hidden overflow-auto rounded-lg border border-border md:block">
                  <table className="min-w-[520px] w-full text-[12px] leading-5">
                    <thead className="bg-surface-subtle text-text-secondary">
                      <tr>
                        <th className="px-3 py-2.5 text-start font-medium">
                          {copy("Scope", "Раздел", "תחום")}
                        </th>
                        <th className="px-3 py-2.5 text-start font-medium">
                          {copy("Reason", "Причина", "סיבה")}
                        </th>
                        <th className="px-3 py-2.5 text-end font-medium">
                          {copy("Client", "Клиент", "לקוח")}
                        </th>
                        <th className="px-3 py-2.5 text-end font-medium">
                          {copy("Installer", "Монтажник", "מתקין")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {urgencySurchargesQuery.isLoading ? (
                        <tr>
                          <td
                            className="px-3 py-3 text-text-secondary"
                            colSpan={4}
                          >
                            {copy(
                              "Loading urgency surcharge rows...",
                              "Загружаем строки срочной надбавки...",
                              "טוען שורות תוספת דחיפות...",
                            )}
                          </td>
                        </tr>
                      ) : projectUrgencySurcharges.length === 0 ? (
                        <tr>
                          <td
                            className="px-3 py-3 text-text-secondary"
                            colSpan={4}
                          >
                            {copy(
                              "No urgency surcharge rows for this project.",
                              "Для этого проекта нет строк срочной надбавки.",
                              "אין שורות תוספת דחיפות לפרויקט זה.",
                            )}
                          </td>
                        </tr>
                      ) : (
                        projectUrgencySurcharges
                          .slice(0, 4)
                          .map((item, index) => (
                            <tr
                              key={item.id || `${item.scope}-${index}`}
                              className="border-t border-border"
                            >
                              <td className="px-3 py-2.5">
                                {item.scope === "ORDER_NUMBER"
                                  ? `${copy("Order", "Заказ", "הזמנה")}${item.order_number ? ` • ${item.order_number}` : ""}`
                                  : copy("Project", "Проект", "פרויקט")}
                              </td>
                              <td className="px-3 py-2.5 font-medium text-text">
                                {item.reason}
                              </td>
                              <td className="px-3 py-2.5 text-end tabular-nums">
                                {formatAmount(
                                  Number(item.client_amount) || 0,
                                )}
                              </td>
                              <td className="px-3 py-2.5 text-end tabular-nums">
                                {formatAmount(
                                  Number(item.installer_amount) || 0,
                                )}
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
