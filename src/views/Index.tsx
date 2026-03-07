import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Download, Search, Settings } from "lucide-react";

import { DashboardLayout } from "@/components/DashboardLayout";
import { DispatcherBoard } from "@/components/dashboard/DispatcherBoard";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { NextSchedule } from "@/components/dashboard/NextSchedule";
import { ProblemProjectsTable } from "@/components/dashboard/ProblemProjectsTable";
import { TopReasonsCard } from "@/components/dashboard/TopReasonsCard";
import { apiFetch } from "@/lib/api";

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

type ProblemProjectsResponse = {
  items: Array<{
    project_id: string;
    name: string;
    address: string;
    not_installed_doors: number;
  }>;
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

type TopReasonsResponse = {
  items: Array<{
    reason_id: string | null;
    reason_name: string;
    count: number;
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

function formatCurrency(value: string): string {
  const num = decimalToNumber(value);
  return `${num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} NIS`;
}

function hhmm(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

const Index = () => {
  const router = useRouter();
  const now = new Date();
  const dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const dateTo = now.toISOString();
  const eventsFrom = now.toISOString();
  const eventsTo = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const dashboardQuery = useQuery({
    queryKey: ["dashboard-reports", dateFrom, dateTo],
    queryFn: () =>
      apiFetch<ReportsDashboardResponse>(
        `/api/v1/admin/reports/dashboard?date_from=${encodeURIComponent(
          dateFrom
        )}&date_to=${encodeURIComponent(dateTo)}`
      ),
    refetchInterval: 30_000,
  });

  const problemProjectsQuery = useQuery({
    queryKey: ["dashboard-problem-projects"],
    queryFn: () =>
      apiFetch<ProblemProjectsResponse>("/api/v1/admin/reports/problem-projects?limit=10"),
    refetchInterval: 30_000,
  });

  const dispatcherBoardQuery = useQuery({
    queryKey: ["dashboard-dispatcher-board"],
    queryFn: () =>
      apiFetch<DispatcherBoardResponse>(
        "/api/v1/admin/reports/dispatcher-board?projects_limit=6&installers_limit=6&recommendation_limit=3"
      ),
    refetchInterval: 30_000,
  });

  const topReasonsQuery = useQuery({
    queryKey: ["dashboard-top-reasons", dateFrom, dateTo],
    queryFn: () =>
      apiFetch<TopReasonsResponse>(
        `/api/v1/admin/reports/top-reasons?limit=5&date_from=${encodeURIComponent(
          dateFrom
        )}&date_to=${encodeURIComponent(dateTo)}`
      ),
    refetchInterval: 30_000,
  });

  const nextScheduleQuery = useQuery({
    queryKey: ["dashboard-next-schedule", eventsFrom, eventsTo],
    queryFn: () =>
      apiFetch<CalendarEventsResponse>(
        `/api/v1/admin/calendar/events?starts_at=${encodeURIComponent(
          eventsFrom
        )}&ends_at=${encodeURIComponent(eventsTo)}`
      ),
    refetchInterval: 30_000,
  });

  const dashboard = dashboardQuery.data;
  const kpi = dashboard?.kpi;
  const projectUtilization = dashboard?.limits.projects.utilization_pct ?? 0;
  const syncCounts = dashboard?.sync_health.counts;
  const installed = kpi?.installed_doors ?? 0;
  const notInstalled = kpi?.not_installed_doors ?? 0;
  const installedPct =
    installed + notInstalled > 0
      ? Math.round((installed / (installed + notInstalled)) * 100)
      : 0;
  const profitPct =
    kpi && decimalToNumber(kpi.revenue_total) > 0
      ? Math.round(
          (decimalToNumber(kpi.profit_total) / decimalToNumber(kpi.revenue_total)) * 100
        )
      : 0;

  const reasons = useMemo(() => {
    const rows = topReasonsQuery.data?.items || [];
    const total = rows.reduce((acc, row) => acc + row.count, 0);
    return rows.map((row) => ({
      reason: row.reason_name,
      count: row.count,
      percentage: total > 0 ? Math.round((row.count / total) * 100) : 0,
    }));
  }, [topReasonsQuery.data]);

  const problemProjects = useMemo(() => {
    return (problemProjectsQuery.data?.items || []).map((item) => ({
      name: item.name,
      problems: item.not_installed_doors,
      updated: item.address || "Address not set",
    }));
  }, [problemProjectsQuery.data]);

  const events = useMemo(() => {
    return (nextScheduleQuery.data?.items || []).slice(0, 8).map((item) => ({
      title: item.title,
      timeRange: `${hhmm(item.starts_at)} - ${hhmm(item.ends_at)}`,
      initials: item.event_type.slice(0, 1).toUpperCase() || "E",
    }));
  }, [nextScheduleQuery.data]);

  const hasError =
    dashboardQuery.isError ||
    dispatcherBoardQuery.isError ||
    problemProjectsQuery.isError ||
    topReasonsQuery.isError ||
    nextScheduleQuery.isError;

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-[1400px]">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-xl font-semibold text-foreground tracking-tight">Dashboard</h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              Last 7 days operations snapshot
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative group/search">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors duration-200 group-focus-within/search:text-accent" strokeWidth={1.8} />
              <input
                type="text"
                placeholder="Search..."
                className="h-9 w-[220px] rounded-lg border border-border bg-card pl-9 pr-3 text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-accent/40 focus:border-accent/40 transition-all duration-200"
              />
            </div>
            <button className="btn-premium h-9 px-4 rounded-lg border border-border bg-card text-[13px] font-medium text-card-foreground hover:text-accent flex items-center gap-2 group/export">
              <Download className="w-3.5 h-3.5 transition-all duration-250 ease-in-out group-hover/export:scale-110 group-hover/export:text-accent group-hover/export:drop-shadow-[0_0_4px_hsl(var(--accent)/0.3)]" strokeWidth={1.8} />
              Export
            </button>
            <button
              onClick={() => router.push("/settings")}
              className="btn-premium h-9 w-9 rounded-lg border border-border bg-card flex items-center justify-center group/settings"
            >
              <Settings className="w-4 h-4 text-muted-foreground transition-all duration-250 ease-in-out group-hover/settings:text-accent group-hover/settings:scale-110 group-hover/settings:rotate-45 group-hover/settings:drop-shadow-[0_0_5px_hsl(var(--accent)/0.3)]" strokeWidth={1.8} />
            </button>
          </div>
        </div>

        {hasError && (
          <div className="mb-4 rounded-lg border border-[hsl(var(--destructive)/0.35)] bg-[hsl(var(--destructive)/0.08)] px-4 py-3 text-[13px] text-[hsl(var(--destructive))]">
            Failed to load dashboard data. Check token and API availability.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard
            title="Active Projects"
            value={dashboard?.limits.projects.current ?? 0}
            subtitle={
              syncCounts
                ? `Sync danger: ${syncCounts.danger}/${syncCounts.total}`
                : "Sync status pending"
            }
            progress={projectUtilization || 0}
            progressColor="accent"
          />
          <KpiCard
            title="Installed (7d)"
            value={installed}
            subtitle={`Not installed: ${notInstalled}`}
            progress={installedPct}
            progressColor="success"
          />
          <KpiCard
            title="Problems"
            value={kpi?.problem_projects ?? 0}
            subtitle={`${kpi?.missing_rates_installed_doors ?? 0} doors without rates`}
            progress={Math.min((kpi?.problem_projects ?? 0) * 10, 100)}
            progressColor="destructive"
          />
          <KpiCard
            title="Profit (7d)"
            value={kpi ? formatCurrency(kpi.profit_total) : "0.00 NIS"}
            subtitle={
              kpi
                ? `Revenue: ${formatCurrency(kpi.revenue_total)} | Payroll: ${formatCurrency(
                    kpi.payroll_total
                  )}`
                : "Revenue: 0.00 NIS | Payroll: 0.00 NIS"
            }
            progress={profitPct}
            progressColor="primary"
          />
        </div>

        {dispatcherBoardQuery.data && (
          <DispatcherBoard
            summary={dispatcherBoardQuery.data.summary}
            projects={dispatcherBoardQuery.data.projects}
            installers={dispatcherBoardQuery.data.installers}
            onOpenProject={(projectId) => router.push(`/projects?project_id=${projectId}`)}
            onOpenProjects={() => router.push("/projects")}
            onOpenInstallers={() => router.push("/installers")}
            onOpenCalendar={() => router.push("/calendar")}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
          <div className="lg:col-span-3">
            <ProblemProjectsTable
              projects={problemProjects}
              onViewAll={() => router.push("/projects")}
            />
          </div>
          <div className="lg:col-span-2">
            <TopReasonsCard reasons={reasons} />
          </div>
        </div>

        <NextSchedule events={events} onOpenCalendar={() => router.push("/calendar")} />
      </div>
    </DashboardLayout>
  );
};

export default Index;
