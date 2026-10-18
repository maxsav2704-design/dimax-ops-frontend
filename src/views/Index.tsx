import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CalendarDays, Plus } from "lucide-react";

import { DashboardLayout } from "@/components/DashboardLayout";
import { DataStateNotice } from "@/components/DataStateNotice";
import { DimaxPageHeader } from "@/components/DimaxPageHeader";
import { CardSkeleton, COMPANY_CURRENCY, FreshnessBadge, KpiTile, TableSkeleton, useEntityHighlight, useLastVisitSnapshot, type KpiThresholds, type KpiTone } from "@/components/dimax";
import { getDashboardCopy } from "@/components/dashboard/copy";
import { DispatcherBoard, type DispatcherProjectFilter } from "@/components/dashboard/DispatcherBoard";
import { NextSchedule } from "@/components/dashboard/NextSchedule";
import { apiFetch } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useAuthSession } from "@/hooks/use-auth-session";
import { countNoun, type PluralSpec } from "@/lib/plural";
import { pickLocale } from "@/lib/locale";

// Count nouns for the KPI detail lines: Russian needs one/few/many forms
// ("1 дверь осталась", "2 двери осталось", "5 дверей осталось").
const DOORS_LEFT: PluralSpec = {
  en: ["door left", "doors left"],
  ru: ["дверь осталась", "двери осталось", "дверей осталось"],
  he: ["דלת נותרה", "דלתות נותרו"],
};
const ISSUES_BLOCKED: PluralSpec = {
  en: ["blocked", "blocked"],
  ru: ["заблокирована", "заблокировано", "заблокировано"],
  he: ["חסומה", "חסומות"],
};
const INSTALLERS_BUSY: PluralSpec = {
  en: ["busy", "busy"],
  ru: ["занят", "заняты", "заняты"],
  he: ["עסוק", "עסוקים"],
};

type ReportsDashboardResponse = {
  kpi: {
    period_from: string | null;
    period_to: string | null;
    installed_doors: number;
    not_installed_doors: number;
    payroll_total: string;
    revenue_total: string;
    profit_total: string;
    problem_projects: number;
    missing_rates_installed_doors: number;
    missing_addon_plans_done: number;
    /** Effective installations per day, oldest first (14 days); drives the sparkline. */
    installed_series_14d?: number[];
  };
  sync_health: {
    counts?: {
      ok: number;
      warn: number;
      danger: number;
      total: number;
    };
  };
  limits: {
    projects: {
      current: number;
      utilization_pct: number | null;
    };
  };
};

type DispatcherBoardResponse = {
  generated_at: string;
  summary: {
    total_projects: number;
    total_doors: number;
    installed_doors: number;
    pending_doors: number;
    projects_needing_dispatch: number;
    open_issues: number;
    blocked_issues: number;
    unassigned_doors: number;
    available_installers: number;
    busy_installers: number;
    scheduled_visits_7d: number;
  };
  projects: Array<{
    project_id: string;
    project_name: string;
    address: string;
    project_status: string;
    dispatch_status: string;
    contact_name: string | null;
    total_doors: number;
    installed_doors: number;
    pending_doors: number;
    assigned_open_doors: number;
    unassigned_doors: number;
    open_issues: number;
    blocked_issues: number;
    completion_pct: number;
    next_visit_at: string | null;
    next_visit_title: string | null;
    recommended_installers: Array<{
      installer_id: string;
      installer_name: string;
      availability_band: string;
      active_projects: number;
      assigned_open_doors: number;
      open_issues: number;
      next_event_at: string | null;
    }>;
  }>;
  installers: Array<{
    installer_id: string;
    installer_name: string;
    status: string;
    availability_band: string;
    is_active: boolean;
    phone: string | null;
    email: string | null;
    active_projects: number;
    assigned_open_doors: number;
    open_issues: number;
    next_event_at: string | null;
    next_event_title: string | null;
  }>;
};

type CalendarEventsResponse = {
  items: Array<{
    id: string;
    title: string;
    starts_at: string;
    ends_at: string;
    event_type: string;
  }>;
};

function decimalToNumber(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function localeCode(locale: "en" | "ru" | "he"): string {
  if (locale === "he") {
    return "he-IL";
  }
  if (locale === "ru") {
    return "ru-RU";
  }
  return "en-US";
}

function formatCurrency(value: string, locale: "en" | "ru" | "he"): string {
  const num = Number.parseFloat(value);
  if (!Number.isFinite(num)) return "\u2014";
  return `${num.toLocaleString(localeCode(locale), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${COMPANY_CURRENCY}`;
}

function formatCompactCurrency(value: string, locale: "en" | "ru" | "he"): string {
  const num = Number.parseFloat(value);
  if (!Number.isFinite(num)) return "\u2014";
  if (Math.abs(num) >= 1000) {
    return `${Math.round(num / 1000).toLocaleString(localeCode(locale))}k ${COMPANY_CURRENCY}`;
  }
  return `${num.toLocaleString(localeCode(locale), {
    maximumFractionDigits: 0,
  })} ${COMPANY_CURRENCY}`;
}

function createDashboardTimeWindow() {
  const now = new Date();
  return {
    now,
    dateFrom: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    dateTo: now.toISOString(),
    eventsFrom: now.toISOString(),
    eventsTo: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

function hhmm(value: string, locale: "en" | "ru" | "he"): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }
  return date.toLocaleTimeString(localeCode(locale), {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function dashboardActionLabels(locale: "en" | "ru" | "he") {
  if (locale === "ru") {
    return {
      today: "Сегодня",
      lastRefresh: "обновлено",
      reports: "Отчёты",
      newProject: "Новый проект",
      activeProjects: "активных проектов",
      problemProjects: "проблемных",
      openIssues: "открытых проблем",
      pendingDoors: "дверей в ожидании",
      installed7d: "Установлено за 7 дней",
      freeInstallers: "Свободные монтажники",
      needsAttention: "Требует внимания",
      everythingFine: "Всё в порядке",
      active: "В работе",
      week: "За 7 дней",
      availableNow: "Доступны сейчас",
      issuesAction: "Проблемы",
    };
  }
  if (locale === "he") {
    return {
      today: "היום",
      lastRefresh: "עודכן",
      reports: "דוחות",
      newProject: "פרויקט חדש",
      activeProjects: "פרויקטים פעילים",
      problemProjects: "בעייתיים",
      openIssues: "תקלות פתוחות",
      pendingDoors: "דלתות ממתינות",
      installed7d: "הותקנו ב-7 ימים",
      freeInstallers: "מתקינים זמינים",
      needsAttention: "דורש טיפול",
      everythingFine: "הכל תקין",
      active: "בעבודה",
      week: "ב-7 ימים",
      availableNow: "זמינים עכשיו",
      issuesAction: "תקלות",
    };
  }
  return {
    today: "Today",
    lastRefresh: "updated",
    reports: "Reports",
    newProject: "New project",
    activeProjects: "active projects",
    problemProjects: "problem",
    openIssues: "open issues",
    pendingDoors: "pending doors",
    installed7d: "Installed in 7 days",
    freeInstallers: "Available installers",
    needsAttention: "Needs attention",
    everythingFine: "All clear",
    active: "Active",
    week: "Last 7 days",
    availableNow: "Available now",
    issuesAction: "Issues",
  };
}

type DashboardKpi = {
  label: string;
  value: string | number;
  detail: string;
  ready: boolean;
  pending: boolean;
  status: string;
  /** E4: the tone is computed from the metric and its thresholds unless `tone` is explicit. */
  metric?: number | null;
  thresholds?: KpiThresholds;
  tone?: KpiTone;
  /** E5: the tile toggles this filter on the dispatcher board. */
  filter?: DispatcherProjectFilter;
  /** Not rendered for this session (e.g. money without the rates capability). */
  hidden?: boolean;
  /** Previous-period value and the sparkline series (E4). */
  previous?: number | null;
  deltaLabel?: string;
  series?: number[];
};

function DashboardKpiTile({ item, selected, onSelect }: { item: DashboardKpi; selected?: boolean; onSelect?: () => void }) {
  const { locale } = useI18n();
  const unavailable = pickLocale(locale, "Unavailable", "Нет данных", "אין נתונים");
  const pending = item.pending && !item.ready;
  return (
    <KpiTile
      testId="dashboard-kpi"
      label={item.label}
      value={item.ready ? item.value : "—"}
      metric={item.ready ? item.metric : null}
      previous={item.ready ? item.previous : null}
      deltaLabel={item.deltaLabel}
      series={item.ready ? item.series : undefined}
      thresholds={item.thresholds}
      tone={item.ready ? item.tone : "neutral"}
      status={item.ready ? item.status : unavailable}
      detail={item.ready ? item.detail : unavailable}
      pending={pending}
      selected={selected}
      onSelect={onSelect}
      className="min-h-[120px]"
    />
  );
}

const Index = () => {
  const router = useRouter();
  const { locale } = useI18n();
  const session = useAuthSession();
  const copy = getDashboardCopy(locale);
  const labels = dashboardActionLabels(locale);
  const [openedAt] = useState(() => new Date());
  const [projectFilter, setProjectFilter] = useState<DispatcherProjectFilter | null>(null);
  const toggleProjectFilter = (filter: DispatcherProjectFilter) =>
    setProjectFilter((current) => (current === filter ? null : filter));
  useEntityHighlight();

  const dashboardQuery = useQuery({
    queryKey: ["dashboard-reports"],
    queryFn: () => {
      // A live window must advance on every refetch, not just on module load.
      const { dateFrom, dateTo } = createDashboardTimeWindow();
      return apiFetch<ReportsDashboardResponse>(
        `/api/v1/admin/reports/dashboard?date_from=${encodeURIComponent(dateFrom)}&date_to=${encodeURIComponent(dateTo)}`,
      );
    },
    refetchInterval: 30_000,
  });

  const dispatcherBoardQuery = useQuery({
    queryKey: ["dashboard-dispatcher-board"],
    queryFn: () =>
      apiFetch<DispatcherBoardResponse>(
        "/api/v1/admin/reports/dispatcher-board?projects_limit=6&installers_limit=6&recommendation_limit=3",
      ),
    refetchInterval: 30_000,
  });

  const nextScheduleQuery = useQuery({
    queryKey: ["dashboard-next-schedule"],
    queryFn: () => {
      const { eventsFrom, eventsTo } = createDashboardTimeWindow();
      return apiFetch<CalendarEventsResponse>(
        `/api/v1/admin/calendar/events?starts_at=${encodeURIComponent(eventsFrom)}&ends_at=${encodeURIComponent(eventsTo)}`,
      );
    },
    refetchInterval: 30_000,
  });

  const now = new Date(Math.max(
    dashboardQuery.dataUpdatedAt,
    dispatcherBoardQuery.dataUpdatedAt,
    nextScheduleQuery.dataUpdatedAt,
  ) || openedAt.getTime());
  const dashboard = dashboardQuery.data;
  const dispatcherSummary = dispatcherBoardQuery.data?.summary;
  const kpi = dashboard?.kpi;
  const notInstalled = kpi?.not_installed_doors ?? 0;
  const openIssues = dispatcherSummary?.open_issues ?? 0;
  const blockedIssues = dispatcherSummary?.blocked_issues ?? 0;
  const pendingDoors = dispatcherSummary?.pending_doors ?? notInstalled;
  const availableInstallers = dispatcherSummary?.available_installers ?? 0;
  const busyInstallers = dispatcherSummary?.busy_installers ?? 0;
  const installerCapacityTotal = availableInstallers + busyInstallers;
  const teamUtilization =
    installerCapacityTotal > 0
      ? Math.round((busyInstallers / installerCapacityTotal) * 100)
      : 0;
  // E4 "since your last visit": the previous visit's numbers, stored locally, give every count a delta.
  const activeProjectsCount = dashboard?.limits.projects.current ?? null;
  const visitValues = useMemo(
    () => ({
      activeProjects: activeProjectsCount,
      openIssues: dispatcherSummary ? openIssues : null,
      freeInstallers: dispatcherSummary ? availableInstallers : null,
    }),
    [activeProjectsCount, dispatcherSummary, openIssues, availableInstallers],
  );
  const { previous: lastVisit } = useLastVisitSnapshot("dmx.dashboard.last-visit.v1", visitValues, {
    ready: !!dashboard && !!dispatcherSummary,
  });
  const sinceVisitLabel = pickLocale(locale, "since your last visit", "с прошлого визита", "מאז הביקור הקודם");
  const todayLabel = now.toLocaleDateString(localeCode(locale), {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const refreshedAt = Math.max(dashboardQuery.dataUpdatedAt, dispatcherBoardQuery.dataUpdatedAt, nextScheduleQuery.dataUpdatedAt) || null;
  const refreshing = dashboardQuery.isFetching || dispatcherBoardQuery.isFetching || nextScheduleQuery.isFetching;
  const refreshAll = () => {
    void dashboardQuery.refetch();
    void dispatcherBoardQuery.refetch();
    void nextScheduleQuery.refetch();
  };
  const dashboardTitle =
    pickLocale(locale, "Home", "Главная", "ראשי");
  const dashboardSubtitle =
    pickLocale(locale, "What is happening on site and what needs your attention today.", "Что происходит на объектах и что требует вашего внимания сегодня.", "מה קורה בפרויקטים ומה דורש את תשומת לבך היום.");
  // The 14-day series ends at period_to: the first seven days are the previous week.
  const installedSeries = kpi?.installed_series_14d && kpi.installed_series_14d.length === 14 ? kpi.installed_series_14d : undefined;
  const installedPreviousWeek = installedSeries ? installedSeries.slice(0, 7).reduce((sum, value) => sum + value, 0) : null;
  const dashboardKpis: DashboardKpi[] = [
    {
      label: copy.kpi.activeProjects,
      value: dashboard?.limits.projects.current ?? 0,
      detail: countNoun(locale, pendingDoors, DOORS_LEFT),
      ready: !!dashboard,
      pending: dashboardQuery.isPending,
      status: labels.active,
      tone: "neutral",
      metric: activeProjectsCount,
      previous: lastVisit.activeProjects ?? null,
      deltaLabel: sinceVisitLabel,
    },
    {
      label: labels.installed7d,
      value: kpi?.installed_doors ?? 0,
      detail: countNoun(locale, pendingDoors, DOORS_LEFT),
      ready: !!dashboard,
      pending: dashboardQuery.isPending,
      status: labels.week,
      tone: "ok",
      metric: kpi?.installed_doors ?? null,
      previous: installedPreviousWeek,
      deltaLabel: pickLocale(locale, "vs previous week", "к прошлой неделе", "לעומת השבוע הקודם"),
      series: installedSeries,
    },
    {
      label: copy.dispatcher.metrics.issues,
      value: openIssues,
      detail: countNoun(locale, blockedIssues, ISSUES_BLOCKED),
      ready: !!dispatcherSummary,
      pending: dispatcherBoardQuery.isPending,
      status:
        openIssues > 0 ? labels.needsAttention : labels.everythingFine,
      metric: openIssues,
      thresholds: { warn: 1, bad: 5 },
      filter: "issues",
      previous: lastVisit.openIssues ?? null,
      deltaLabel: sinceVisitLabel,
    },
    {
      label: labels.freeInstallers,
      value: availableInstallers,
      detail: countNoun(locale, busyInstallers, INSTALLERS_BUSY),
      ready: !!dispatcherSummary,
      pending: dispatcherBoardQuery.isPending,
      status: labels.availableNow,
      metric: availableInstallers,
      tone: availableInstallers === 0 ? "bad" : teamUtilization > 85 ? "warn" : "ok",
      previous: lastVisit.freeInstallers ?? null,
      deltaLabel: sinceVisitLabel,
    },
    {
      label: copy.kpi.revenue,
      value: kpi ? formatCompactCurrency(kpi.revenue_total, locale) : "\u2014",
      detail: kpi
        ? `${copy.kpi.payroll}: ${formatCurrency(kpi.payroll_total, locale)}${(kpi.zero_client_price_installed_doors ?? 0) > 0 ? ` · ${kpi.zero_client_price_installed_doors} ${copy.kpi.zeroClientPrice}` : ""}`
        : `${copy.kpi.payroll}: \u2014`,
      // Money is only for sessions with the rates capability.
      hidden: session?.can_view_rates === false,
      ready: !!dashboard,
      pending: dashboardQuery.isPending,
      status: labels.week,
      tone: "neutral",
    },
  ];

  const events = useMemo(
    () =>
      (nextScheduleQuery.data?.items || []).slice(0, 8).map((item) => ({
        title: item.title,
        timeRange: `${hhmm(item.starts_at, locale)} - ${hhmm(item.ends_at, locale)}`,
        initials: item.event_type.slice(0, 1).toUpperCase() || "E",
      })),
    [locale, nextScheduleQuery.data?.items],
  );

  return (
    <DashboardLayout>
      <div className="page-shell page-stack-tight motion-stagger">
        <section
          data-testid="admin-dashboard-v24"
          className="space-y-4"
        >
          <DimaxPageHeader
            title={dashboardTitle}
            badge={`${labels.today} · ${todayLabel}`}
            subtitle={dashboardSubtitle}
            meta={refreshedAt ? <FreshnessBadge testId="dashboard-freshness" updatedAt={refreshedAt} onRefresh={refreshAll} refreshing={refreshing} /> : null}
            actions={
              <>
                <button
                  type="button"
                  onClick={() => router.push("/calendar")}
                  className="dmx-secondary-action"
                >
                  <CalendarDays className="h-4 w-4" strokeWidth={1.8} />
                  {copy.heroActions.calendar}
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/issues")}
                  className="dmx-secondary-action"
                >
                  <AlertTriangle className="h-4 w-4" strokeWidth={1.8} />
                  {labels.issuesAction}
                  {openIssues > 0 ? ` (${openIssues})` : ""}
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/projects?create=1")}
                  className="dmx-primary-action"
                >
                  <Plus className="h-4 w-4" strokeWidth={1.8} />
                  {labels.newProject}
                </button>
              </>
            }
          />

          {[
            { query: dashboardQuery, label: labels.reports },
            { query: dispatcherBoardQuery, label: labels.issuesAction },
            { query: nextScheduleQuery, label: copy.nextSchedule.title },
          ].map(({ query, label }) => query.isError || query.isPending ? (
            <DataStateNotice key={label} label={label}
              state={query.isError ? query.data ? "stale" : "error" : "loading"}
              onRetry={() => { void query.refetch(); }} retrying={query.isFetching} />
          ) : null)}

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-5">
            {dashboardKpis.filter((item) => !item.hidden).map((item) => (
              <DashboardKpiTile
                key={item.label}
                item={item}
                selected={!!item.filter && projectFilter === item.filter}
                onSelect={item.filter ? () => toggleProjectFilter(item.filter as DispatcherProjectFilter) : undefined}
              />
            ))}
          </div>
        </section>

        {dispatcherBoardQuery.isPending && !dispatcherBoardQuery.data && (
          <CardSkeleton cards={3} lines={3} testId="dashboard-dispatcher-loading" />
        )}
        {dispatcherBoardQuery.data && (
          <DispatcherBoard
            summary={dispatcherBoardQuery.data.summary}
            projects={dispatcherBoardQuery.data.projects}
            installers={dispatcherBoardQuery.data.installers}
            projectFilter={projectFilter}
            onToggleFilter={toggleProjectFilter}
            onOpenProject={(projectId) =>
              router.push(`/projects?project_id=${projectId}`)
            }
            onOpenProjects={() => router.push("/projects")}
            onOpenInstallers={() => router.push("/installers")}
            onOpenCalendar={() => router.push("/calendar")}
          />
        )}

        {nextScheduleQuery.isPending && !nextScheduleQuery.data && (
          <TableSkeleton rows={3} columns={3} testId="dashboard-schedule-loading" />
        )}
        {nextScheduleQuery.data && <NextSchedule
          events={events}
          onOpenCalendar={() => router.push("/calendar")}
        />}
      </div>
    </DashboardLayout>
  );
};

export default Index;
