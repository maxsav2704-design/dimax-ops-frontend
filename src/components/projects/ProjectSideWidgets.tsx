"use client";

import { MetricRow, WidgetCard } from "@/components/dimax";
import { type ProjectPlanFactResponse, type ProjectRiskDrilldownResponse } from "@/components/projects/financial-types";
import { type ProjectDetailsResponse } from "@/components/projects/project-types";
import { formatDateTime, formatPct } from "@/components/projects/shared";
import { LtrText } from "@/components/ui/LtrText";
import { cn } from "@/lib/utils";
import { useCopy, useI18n } from "@/lib/i18n";

import type { ProjectImportRunItem } from "./project-types";
import { initialsFromName, issueLabel } from "./shared";

type ProjectSideWidgetsProps = {
  canViewRates: boolean;
  restrictedTitle: string;
  formatMoney: (value: string | number | null | undefined) => string;
  details: ProjectDetailsResponse | null;
  financialReady: boolean;
  openIssues: number;
  planFact: ProjectPlanFactResponse | null;
  risk: ProjectRiskDrilldownResponse | null;
  importHistory: ProjectImportRunItem[];
  assignedInstallers: { id: string; name: string; email: string | null; status: string | null; doorCount: number }[];
  scrollToSection: (sectionId: string) => void;
  tokenLabel: (value: string) => string;
  onMatrixIssueFilterChange: (value: "all" | "issues") => void;
};

// Projects → side widgets: stakeholders, finance summary, open issues and recent activity next to the door workspace. Markup, state and handlers moved verbatim from ProjectsPage (monolith split).
export function ProjectSideWidgets({
  canViewRates,
  restrictedTitle,
  formatMoney,
  details,
  financialReady,
  openIssues,
  planFact,
  risk,
  importHistory,
  assignedInstallers,
  scrollToSection,
  tokenLabel,
  onMatrixIssueFilterChange,
}: ProjectSideWidgetsProps) {
  const copy = useCopy();

  const projectTopIssues = (details?.issues_open || []).slice(0, 3);
  const projectRecentImportActivity = importHistory.slice(0, 3);

  return (
    <aside className="space-y-3" data-testid="project-detail-v28-side">
      <WidgetCard
        title={copy("Stakeholders", "Участники", "מעורבים")}
        headerMeta={copy(
          "Contacts and assigned installers",
          "Контакты и назначенные монтажники",
          "אנשי קשר ומתקינים משובצים",
        )}
        bleed
      >
        <div className="divide-y divide-border-subtle">
          <div className="grid grid-cols-[32px_1fr] gap-2 px-4 py-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--dmx-accent-tint)] text-[11px] font-semibold text-text">
              {initialsFromName(details?.contact_name)}
            </span>
            <div className="min-w-0">
              <div className="truncate text-[12.5px] font-medium text-text">
                {details?.contact_name
                  ? `${copy("Contact", "Контакт", "איש קשר")}: ${details.contact_name}`
                  : copy("Site contact missing", "Контакт объекта не задан", "חסר איש קשר")}
              </div>
              <div className="truncate text-[10.5px] text-text-secondary">
                {details?.developer_company ||
                  copy("Developer", "Застройщик", "יזם")}
              </div>
            </div>
          </div>
          {assignedInstallers.length === 0 ? (
            <div className="px-4 py-3 text-[12px] text-text-secondary">
              {copy(
                "No doors are assigned to installers yet.",
                "Двери ещё не назначены монтажникам.",
                "עדיין אין דלתות משובצות למתקינים.",
              )}
            </div>
          ) : (
            assignedInstallers.slice(0, 3).map((installer) => (
              <div
                key={installer.id}
                className="grid grid-cols-[32px_1fr_auto] gap-2 px-4 py-3"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-sunken text-[11px] font-semibold text-text-secondary">
                  {initialsFromName(installer.name)}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-[12.5px] font-medium text-text">
                    {copy("Installer", "Монтажник", "מתקין")}:{" "}
                    {installer.name}
                  </div>
                  <div className="truncate text-[10.5px] text-text-secondary">
                    {installer.email ||
                      copy("Assigned installer", "Назначенный монтажник", "מתקין משובץ")}
                  </div>
                </div>
                <LtrText className="self-center rounded-full border border-border bg-surface-subtle px-2 py-1 text-[10.5px] font-medium text-text">
                  {installer.doorCount}
                </LtrText>
              </div>
            ))
          )}
        </div>
      </WidgetCard>

      <WidgetCard
        title={copy("Finance", "Финансы", "כספים")}
        headerMeta={copy(
          "Plan/fact summary",
          "Кратко план/факт",
          "סיכום תכנון מול ביצוע",
        )}
        actionSlot={
          <button
            type="button"
            onClick={() =>
              scrollToSection(
                financialReady
                  ? "project-financial-screen"
                  : "project-commercial-restricted",
              )
            }
            className="text-[11.5px] font-medium text-link hover:underline"
          >
            {copy("Details", "Детали", "פרטים")}
          </button>
        }
      >
        {financialReady && planFact && risk?.summary ? (
          <div className="space-y-2 text-[12px]">
            <MetricRow
              label={copy("Revenue", "Выручка", "הכנסות")}
              value={formatMoney(planFact.actual_revenue_total)}
            />
            <MetricRow
              label={copy("Payroll", "Начисления", "שכר מתקינים")}
              value={formatMoney(planFact.actual_payroll_total)}
            />
            <MetricRow
              label={copy("Profit", "Прибыль", "רווח")}
              value={formatMoney(risk.summary.actual_profit_total)}
            />
            <MetricRow
              label={copy("Margin", "Маржа", "מרווח")}
              value={formatPct(risk.summary.actual_margin_pct)}
            />
          </div>
        ) : (
          <div className="text-[12px] leading-5 text-text-secondary">
            {canViewRates
              ? copy(
                  "Financial data is still loading or missing for this project.",
                  "Финансовые данные ещё загружаются или не заполнены по объекту.",
                  "הנתונים הכספיים עדיין נטענים או חסרים בפרויקט.",
                )
              : restrictedTitle}
          </div>
        )}
      </WidgetCard>

      <WidgetCard
        title={copy("Open issues", "Открытые проблемы", "בעיות פתוחות")}
        titleAccessory={
          <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-[10.5px] text-text-secondary">
            {openIssues}
          </span>
        }
        actionSlot={
          <button
            type="button"
            onClick={() => {
              onMatrixIssueFilterChange("issues");
              scrollToSection("project-door-matrix");
            }}
            className="text-[11.5px] font-medium text-link hover:underline"
          >
            {copy("View all", "Все", "הצג הכל")}
          </button>
        }
        bleed
      >
        {projectTopIssues.length === 0 ? (
          <div className="px-4 py-3 text-[12px] text-text-secondary">
            {copy(
              "No open issues on this project.",
              "По объекту нет открытых проблем.",
              "אין בעיות פתוחות בפרויקט.",
            )}
          </div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {projectTopIssues.map((issue) => (
              <button
                key={issue.id}
                type="button"
                onClick={() => {
                  onMatrixIssueFilterChange("issues");
                  scrollToSection("project-door-matrix");
                }}
                className="grid w-full grid-cols-[24px_1fr] gap-2 px-4 py-3 text-start hover:bg-surface-subtle"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-status-problem-bg text-[10px] font-semibold text-status-problem-fg">
                  !
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[12px] font-medium text-text">
                    {issueLabel(issue)}
                  </span>
                  <span className="mt-0.5 block truncate text-[10.5px] text-text-secondary">
                    {copy("Door", "Дверь", "דלת")} {issue.door_id} ·{" "}
                    {tokenLabel(issue.status)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </WidgetCard>

      <WidgetCard
        title={copy("Activity", "Активность", "פעילות")}
        headerMeta={copy(
          "Latest import and recovery events",
          "Последние события импорта и восстановления",
          "אירועי יבוא ושחזור אחרונים",
        )}
        actionSlot={
          <button
            type="button"
            onClick={() => scrollToSection("project-import-history")}
            className="text-[11.5px] font-medium text-link hover:underline"
          >
            {copy("Log", "Журнал", "יומן")}
          </button>
        }
        bleed
      >
        {projectRecentImportActivity.length === 0 ? (
          <div className="px-4 py-3 text-[12px] text-text-secondary">
            {copy(
              "No recent import activity.",
              "Недавней активности импорта нет.",
              "אין פעילות יבוא אחרונה.",
            )}
          </div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {projectRecentImportActivity.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-[10px_1fr] gap-3 px-4 py-3"
              >
                <span
                  className={cn(
                    "mt-1 h-2.5 w-2.5 rounded-full",
                    item.status === "FAILED"
                      ? "bg-kpi-red"
                      : item.status === "COMPLETED"
                        ? "bg-kpi-green"
                        : "bg-kpi-yellow",
                  )}
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <div className="truncate text-[12px] font-medium text-text">
                    {tokenLabel(item.status)}
                  </div>
                  <div className="mt-0.5 truncate text-[10.5px] text-text-secondary">
                    {formatDateTime(item.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </WidgetCard>
    </aside>
  );
}
