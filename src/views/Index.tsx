import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CalendarDays, Plus } from "lucide-react";

import { DashboardLayout } from "@/components/DashboardLayout";
import { getDashboardCopy } from "@/components/dashboard/copy";
import { DispatcherBoard } from "@/components/dashboard/DispatcherBoard";
import { NextSchedule } from "@/components/dashboard/NextSchedule";
import { apiFetch } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

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
  const num = decimalToNumber(value);
  return `${num.toLocaleString(localeCode(locale), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} NIS`;
}

function formatCompactCurrency(value: string, locale: "en" | "ru" | "he"): string {
  const num = decimalToNumber(value);
  if (Math.abs(num) >= 1000) {
    return `${Math.round(num / 1000).toLocaleString(localeCode(locale))}k NIS`;
  }
  return `${num.toLocaleString(localeCode(locale), {
    maximumFractionDigits: 0,
  })} NIS`;
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

const DASHBOARD_TIME_WINDOW = createDashboardTimeWindow();

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
      blocked: "заблокировано",
      doorsLeft: "дверей осталось",
      installed7d: "Установлено за 7 дней",
      freeInstallers: "Свободные монтажники",
      busy: "заняты",
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
      blocked: "חסום",
      doorsLeft: "דלתות נותרו",
      installed7d: "הותקנו ב-7 ימים",
      freeInstallers: "מתקינים זמינים",
      busy: "עסוקים",
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
    blocked: "blocked",
    doorsLeft: "doors left",
    installed7d: "Installed in 7 days",
    freeInstallers: "Available installers",
    busy: "busy",
    needsAttention: "Needs attention",
    everythingFine: "All clear",
    active: "Active",
    week: "Last 7 days",
    availableNow: "Available now",
    issuesAction: "Issues",
  };
}

type DashboardV24Tone = "blue" | "green" | "neutral" | "orange" | "red" | "yellow";

type DashboardV24Kpi = {
  detail: string;
  label: string;
  progress: number;
  status: string;
  tone: DashboardV24Tone;
  value: string | number;
};

function dashboardToneClasses(tone: DashboardV24Tone) {
  if (tone === "red") {
    return {
      bar: "before:bg-status-problem-fg",
      status: "bg-status-problem-bg text-status-problem-fg",
      value: "text-status-problem-fg",
      progress: "bg-status-problem-fg",
    };
  }
  if (tone === "orange") {
    return {
      bar: "before:bg-status-warning-fg",
      status: "bg-status-warning-bg text-status-warning-fg",
      value: "text-status-warning-fg",
      progress: "bg-status-warning-fg",
    };
  }
  if (tone === "yellow") {
    return {
      bar: "before:bg-accent",
      status: "bg-accent/20 text-text",
      value: "text-text",
      progress: "bg-accent",
    };
  }
  if (tone === "green") {
    return {
      bar: "before:bg-status-ok-fg",
      status: "bg-status-ok-bg text-status-ok-fg",
      value: "text-status-ok-fg",
      progress: "bg-status-ok-fg",
    };
  }
  if (tone === "blue") {
    return {
      bar: "before:bg-link",
      status: "bg-blue-50 text-link",
      value: "text-link",
      progress: "bg-link",
    };
  }
  return {
    bar: "before:bg-border-strong",
    status: "bg-surface-subtle text-text-secondary",
    value: "text-text",
    progress: "bg-border-strong",
  };
}

function DashboardV24KpiTile({ item }: { item: DashboardV24Kpi }) {
  const tone = dashboardToneClasses(item.tone);
  const progress = Math.min(Math.max(item.progress, 0), 100);

  return (
    <div
      className={cn(
        "relative min-h-[128px] overflow-hidden rounded-lg border border-border bg-surface px-4 py-3 before:absolute before:inset-y-3 before:left-0 before:w-[3px] before:rounded-r-full",
        tone.bar,
      )}
    >
      <div className="pl-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-h-8 text-[10.5px] font-semibold leading-4 text-text-secondary">
            {item.label}
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-semibold",
              tone.status,
            )}
          >
            {item.status}
          </span>
        </div>
        <div
          className={cn(
            "mt-2 text-[24px] font-semibold leading-none tabular-nums",
            tone.value,
          )}
        >
          {item.value}
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-sunken">
          <div
            className={cn("h-full rounded-full", tone.progress)}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-3 line-clamp-2 min-h-8 text-[10.5px] leading-4 text-text-secondary">
          {item.detail}
        </div>
      </div>
    </div>
  );
}

const Index = () => {
  const router = useRouter();
  const { locale } = useI18n();
  const copy = getDashboardCopy(locale);
  const labels = dashboardActionLabels(locale);
  const { now, dateFrom, dateTo, eventsFrom, eventsTo } = DASHBOARD_TIME_WINDOW;

  const dashboardQuery = useQuery({
    queryKey: ["dashboard-reports", dateFrom, dateTo],
    queryFn: () =>
      apiFetch<ReportsDashboardResponse>(
        `/api/v1/admin/reports/dashboard?date_from=${encodeURIComponent(dateFrom)}&date_to=${encodeURIComponent(dateTo)}`,
      ),
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
    queryKey: ["dashboard-next-schedule", eventsFrom, eventsTo],
    queryFn: () =>
      apiFetch<CalendarEventsResponse>(
        `/api/v1/admin/calendar/events?starts_at=${encodeURIComponent(eventsFrom)}&ends_at=${encodeURIComponent(eventsTo)}`,
      ),
    refetchInterval: 30_000,
  });

  const dashboard = dashboardQuery.data;
  const dispatcherSummary = dispatcherBoardQuery.data?.summary;
  const kpi = dashboard?.kpi;
  const projectUtilization = dashboard?.limits.projects.utilization_pct ?? 0;
  const notInstalled = kpi?.not_installed_doors ?? 0;
  const profitPct =
    kpi && decimalToNumber(kpi.revenue_total) > 0
      ? Math.round(
          (decimalToNumber(kpi.profit_total) /
            decimalToNumber(kpi.revenue_total)) *
            100,
        )
      : 0;
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
  const todayLabel = now.toLocaleDateString(localeCode(locale), {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const refreshSource =
    dispatcherBoardQuery.data?.generated_at ||
    dashboard?.kpi.period_to ||
    now.toISOString();
  const refreshLabel = hhmm(refreshSource, locale);
  const dashboardTitle =
    locale === "ru"
      ? "Главная"
      : locale === "he"
        ? "ראשי"
        : "Home";
  const dashboardSubtitle =
    locale === "ru"
      ? "Что происходит на объектах и что требует вашего внимания сегодня."
      : locale === "he"
        ? "מה קורה בפרויקטים ומה דורש את תשומת לבך היום."
        : "What is happening on site and what needs your attention today.";
  const dashboardKpis: DashboardV24Kpi[] = [
    {
      label: copy.kpi.activeProjects,
      value: dashboard?.limits.projects.current ?? 0,
      detail: `${pendingDoors} ${labels.doorsLeft}`,
      progress: projectUtilization || 0,
      status: labels.active,
      tone: "yellow",
    },
    {
      label: labels.installed7d,
      value: kpi?.installed_doors ?? 0,
      detail: `${pendingDoors} ${labels.doorsLeft}`,
      progress:
        (kpi?.installed_doors ?? 0) + pendingDoors > 0
          ? Math.round(
              ((kpi?.installed_doors ?? 0) /
                ((kpi?.installed_doors ?? 0) + pendingDoors)) *
                100,
            )
          : 0,
      status: labels.week,
      tone: "green",
    },
    {
      label: copy.dispatcher.metrics.issues,
      value: openIssues,
      detail: `${blockedIssues} ${labels.blocked}`,
      progress: Math.min(openIssues * 6, 100),
      status:
        openIssues > 0 ? labels.needsAttention : labels.everythingFine,
      tone: openIssues > 0 ? "red" : "green",
    },
    {
      label: labels.freeInstallers,
      value: availableInstallers,
      detail: `${busyInstallers} ${labels.busy}`,
      progress:
        installerCapacityTotal > 0
          ? Math.round((availableInstallers / installerCapacityTotal) * 100)
          : 0,
      status: labels.availableNow,
      tone: teamUtilization > 85 ? "orange" : "blue",
    },
    {
      label: copy.kpi.revenue,
      value: kpi ? formatCompactCurrency(kpi.revenue_total, locale) : "0 NIS",
      detail: kpi
        ? `${copy.kpi.payroll}: ${formatCurrency(kpi.payroll_total, locale)}`
        : `${copy.kpi.payroll}: 0.00 NIS`,
      progress: profitPct,
      status: labels.week,
      tone: "green",
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

  const hasError =
    dashboardQuery.isError ||
    dispatcherBoardQuery.isError ||
    nextScheduleQuery.isError;

  return (
    <DashboardLayout>
      <div className="page-shell page-stack-tight motion-stagger">
        <section
          data-testid="admin-dashboard-v24"
          className="space-y-4"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-[26px] font-semibold leading-tight text-text">
                  {dashboardTitle}
                </h1>
                <span className="rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-medium text-text-secondary">
                  {labels.today} · {todayLabel}
                </span>
              </div>
              <p className="mt-1.5 max-w-3xl text-[13px] leading-5 text-text-secondary">
                {dashboardSubtitle}
              </p>
              <p className="mt-1 text-[11px] text-text-tertiary">
                {labels.lastRefresh}: {refreshLabel}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
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
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-5">
            {dashboardKpis.map((item) => (
              <DashboardV24KpiTile key={item.label} item={item} />
            ))}
          </div>
        </section>

        {hasError && (
          <div className="mb-4 rounded-lg border border-status-problem-border bg-status-problem-bg px-4 py-3 text-[13px] text-status-problem-fg">
            {copy.errors.dashboardLoadFailed}
          </div>
        )}

        {dispatcherBoardQuery.data && (
          <DispatcherBoard
            summary={dispatcherBoardQuery.data.summary}
            projects={dispatcherBoardQuery.data.projects}
            installers={dispatcherBoardQuery.data.installers}
            onOpenProject={(projectId) =>
              router.push(`/projects?project_id=${projectId}`)
            }
            onOpenProjects={() => router.push("/projects")}
            onOpenInstallers={() => router.push("/installers")}
            onOpenCalendar={() => router.push("/calendar")}
          />
        )}

        <NextSchedule
          events={events}
          onOpenCalendar={() => router.push("/calendar")}
        />
      </div>
    </DashboardLayout>
  );
};

export default Index;
