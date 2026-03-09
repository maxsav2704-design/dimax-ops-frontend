"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCcw } from "lucide-react";

import { apiFetch } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { buildInstallerIssuesHref } from "@/views/installer/issue-links";

type ProjectQuickFilter = "ALL" | "PROBLEM" | "ACTIVE" | "TODAY_TASKS";

type InstallerProjectListItem = {
  id: string;
  name: string;
  address: string | null;
  status: string;
  waze_url: string | null;
};

type InstallerProjectListResponse = {
  items: InstallerProjectListItem[];
};

type CalendarEvent = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  event_type: string;
  project_id?: string | null;
};

type CalendarEventsResponse = {
  items: CalendarEvent[];
};

type PriorityItem = {
  id: string;
  title: string;
  meta: string;
  href: string;
  tone: "problem" | "overdue" | "today";
};

function getWorkspaceIssueHref(projectId: string, eventType: string, title: string) {
  if (eventType.trim().toLowerCase() !== "service") {
    return `/installer/projects/${projectId}`;
  }

  return buildInstallerIssuesHref(projectId, {
    issueStatus: "BLOCKED",
    issueSearch: title,
  });
}

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function InstallerWorkspacePage() {
  const { t } = useI18n();
  const [nowIso] = useState(() => new Date().toISOString());
  const [projectQuickFilter, setProjectQuickFilter] = useState<ProjectQuickFilter>("ALL");
  const [isQueryInitialized, setIsQueryInitialized] = useState(false);
  const [calendarRange] = useState(() => {
    const from = new Date(nowIso);
    const to = new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000);
    return {
      fromIso: from.toISOString(),
      toIso: to.toISOString(),
    };
  });
  const [tasksRange] = useState(() => {
    const now = new Date(nowIso);
    const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const to = now;
    return {
      fromIso: from.toISOString(),
      toIso: to.toISOString(),
    };
  });

  const projectsQuery = useQuery({
    queryKey: ["installer-projects"],
    queryFn: () => apiFetch<InstallerProjectListResponse>("/api/v1/installer/projects"),
    refetchInterval: 30_000,
  });

  const eventsQuery = useQuery({
    queryKey: [
      "installer-calendar-events",
      calendarRange.fromIso,
      calendarRange.toIso,
    ],
    queryFn: () =>
      apiFetch<CalendarEventsResponse>(
        `/api/v1/installer/calendar/events?starts_at=${encodeURIComponent(
          calendarRange.fromIso
        )}&ends_at=${encodeURIComponent(calendarRange.toIso)}`
      ),
    refetchInterval: 30_000,
  });
  const tasksQuery = useQuery({
    queryKey: ["installer-task-events", tasksRange.fromIso, tasksRange.toIso],
    queryFn: () =>
      apiFetch<CalendarEventsResponse>(
        `/api/v1/installer/calendar/events?starts_at=${encodeURIComponent(
          tasksRange.fromIso
        )}&ends_at=${encodeURIComponent(tasksRange.toIso)}`
      ),
    refetchInterval: 30_000,
  });

  const projects = projectsQuery.data?.items || [];
  const events = eventsQuery.data?.items || [];
  const taskEvents = tasksQuery.data?.items || [];

  const stats = useMemo(() => {
    const total = projects.length;
    const inProblem = projects.filter((item) => item.status === "PROBLEM").length;
    const done = projects.filter((item) => item.status === "DONE").length;
    return { total, inProblem, done };
  }, [projects]);
  const taskStats = useMemo(() => {
    const now = new Date(nowIso);
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const nextDayStart = new Date(dayStart);
    nextDayStart.setDate(nextDayStart.getDate() + 1);

    const today = taskEvents.filter((event) => {
      const startsAt = new Date(event.starts_at);
      return startsAt >= dayStart && startsAt < nextDayStart;
    }).length;
    const overdue = taskEvents.filter((event) => new Date(event.ends_at) < now).length;
    const withoutProject = taskEvents.filter((event) => !event.project_id).length;

    return { today, overdue, withoutProject };
  }, [nowIso, taskEvents]);

  const todayTaskProjectIds = useMemo(() => {
    const now = new Date(nowIso);
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const nextDayStart = new Date(dayStart);
    nextDayStart.setDate(nextDayStart.getDate() + 1);

    return new Set(
      taskEvents
        .filter((event) => {
          const startsAt = new Date(event.starts_at);
          return startsAt >= dayStart && startsAt < nextDayStart && Boolean(event.project_id);
        })
        .map((event) => event.project_id as string)
    );
  }, [nowIso, taskEvents]);

  const projectQuickFilterCounts = useMemo(
    () => ({
      ALL: projects.length,
      PROBLEM: projects.filter((project) => project.status === "PROBLEM").length,
      ACTIVE: projects.filter((project) => project.status !== "DONE").length,
      TODAY_TASKS: projects.filter((project) => todayTaskProjectIds.has(project.id)).length,
    }),
    [projects, todayTaskProjectIds]
  );

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      if (projectQuickFilter === "PROBLEM") {
        return project.status === "PROBLEM";
      }
      if (projectQuickFilter === "ACTIVE") {
        return project.status !== "DONE";
      }
      if (projectQuickFilter === "TODAY_TASKS") {
        return todayTaskProjectIds.has(project.id);
      }
      return true;
    });
  }, [projectQuickFilter, projects, todayTaskProjectIds]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const rawProjectFilter = params.get("project_filter");
    setProjectQuickFilter(
      rawProjectFilter === "problem"
        ? "PROBLEM"
        : rawProjectFilter === "active"
          ? "ACTIVE"
          : rawProjectFilter === "today"
            ? "TODAY_TASKS"
            : "ALL"
    );
    setIsQueryInitialized(true);
  }, []);

  useEffect(() => {
    if (!isQueryInitialized) {
      return;
    }
    if (typeof window === "undefined") {
      return;
    }

    const nextParams = new URLSearchParams(window.location.search);
    nextParams.delete("project_filter");
    if (projectQuickFilter === "PROBLEM") {
      nextParams.set("project_filter", "problem");
    } else if (projectQuickFilter === "ACTIVE") {
      nextParams.set("project_filter", "active");
    } else if (projectQuickFilter === "TODAY_TASKS") {
      nextParams.set("project_filter", "today");
    }

    const nextSearch = nextParams.toString();
    const nextUrl = nextSearch
      ? `${window.location.pathname}?${nextSearch}`
      : window.location.pathname;
    window.history.replaceState(window.history.state, "", nextUrl);
  }, [isQueryInitialized, projectQuickFilter]);

  const priorityItems = useMemo(() => {
    const items: PriorityItem[] = [];
    const seen = new Set<string>();
    const now = new Date(nowIso);
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const nextDayStart = new Date(dayStart);
    nextDayStart.setDate(nextDayStart.getDate() + 1);
    const projectsById = new Map(projects.map((project) => [project.id, project]));

    for (const project of projects.filter((item) => item.status === "PROBLEM")) {
      const key = `project:${project.id}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      items.push({
        id: key,
        title: project.name,
        meta: `${t("installerWorkspace.problemProject")}${project.address ? ` | ${project.address}` : ""}`,
        href: `/installer/projects/${project.id}`,
        tone: "problem",
      });
      if (items.length >= 4) {
        return items;
      }
    }

    const overdueEvents = [...taskEvents]
      .filter((event) => new Date(event.ends_at) < now)
      .sort((left, right) => new Date(left.ends_at).getTime() - new Date(right.ends_at).getTime());

    for (const event of overdueEvents) {
      const key = event.project_id ? `project:${event.project_id}` : `event:${event.id}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      const project = event.project_id ? projectsById.get(event.project_id) : null;
      items.push({
        id: key,
        title: project?.name || event.title,
        meta: `Overdue task | ${formatDate(event.ends_at)}`,
        href: project
          ? getWorkspaceIssueHref(project.id, event.event_type, event.title)
          : "/installer/calendar?preset=7d&overdue=1",
        tone: "overdue",
      });
      if (items.length >= 4) {
        return items;
      }
    }

    const todayEvents = [...taskEvents]
      .filter((event) => {
        const startsAt = new Date(event.starts_at);
        return startsAt >= dayStart && startsAt < nextDayStart && new Date(event.ends_at) >= now;
      })
      .sort((left, right) => new Date(left.starts_at).getTime() - new Date(right.starts_at).getTime());

    for (const event of todayEvents) {
      const key = event.project_id ? `project:${event.project_id}` : `event:${event.id}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      const project = event.project_id ? projectsById.get(event.project_id) : null;
      items.push({
        id: key,
        title: project?.name || event.title,
        meta: `Today ${event.event_type.toLowerCase()} | ${formatDate(event.starts_at)}`,
        href: project
          ? getWorkspaceIssueHref(project.id, event.event_type, event.title)
          : "/installer/calendar?preset=today&project_id=none",
        tone: "today",
      });
      if (items.length >= 4) {
        return items;
      }
    }

    return items;
  }, [nowIso, projects, taskEvents]);

  const isRefreshing =
    projectsQuery.isFetching || eventsQuery.isFetching || tasksQuery.isFetching;

  async function refetchWorkspace() {
    await Promise.all([
      projectsQuery.refetch(),
      eventsQuery.refetch(),
      tasksQuery.refetch(),
    ]);
  }

  return (
    <div className="motion-stagger space-y-6">
      <div className="page-hero relative overflow-hidden">
        <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_top_right,hsl(var(--accent)/0.18),transparent_62%)] lg:block" />
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="page-eyebrow">{t("installerWorkspace.eyebrow")}</div>
            <h1 className="mt-4 font-display text-3xl font-semibold tracking-[-0.04em]">
              {t("installerWorkspace.title")}
            </h1>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {t("installerWorkspace.subtitle")}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="metric-chip">{t("installerWorkspace.priorityDoors")}</span>
              <span className="metric-chip">Issue continuity</span>
              <span className="metric-chip">Today schedule</span>
            </div>
          </div>
          <div className="surface-subtle min-w-[280px] max-w-xl space-y-4 p-4 sm:p-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border/70 bg-background/70 px-3 py-3">
                <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Projects
                </div>
                <div className="mt-1 text-lg font-semibold text-foreground">{stats.total}</div>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/70 px-3 py-3">
                <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Problem
                </div>
                <div className="mt-1 text-lg font-semibold text-foreground">{stats.inProblem}</div>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/70 px-3 py-3">
                <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Today
                </div>
                <div className="mt-1 text-lg font-semibold text-foreground">{taskStats.today}</div>
              </div>
            </div>
            <button
              type="button"
              disabled={isRefreshing}
              onClick={() => {
                void refetchWorkspace();
              }}
              className="btn-premium h-11 rounded-xl px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCcw className="h-4 w-4" />
              {isRefreshing ? t("common.refreshing") : t("common.refresh")}
            </button>
          </div>
        </div>
      </div>

      {(projectsQuery.isError || eventsQuery.isError || tasksQuery.isError) && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[hsl(var(--destructive)/0.35)] bg-[hsl(var(--destructive)/0.08)] px-4 py-3 text-sm text-[hsl(var(--destructive))]">
          <span>{t("installerWorkspace.error")}</span>
          <button
            type="button"
            onClick={() => {
              void refetchWorkspace();
            }}
            className="inline-flex items-center rounded-lg border border-[hsl(var(--destructive)/0.35)] bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            {t("common.retry")}
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-[linear-gradient(180deg,hsl(var(--background)/0.92),hsl(var(--accent)/0.08))] p-4">
          <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,hsl(var(--accent)/0.65),transparent)]" />
          <div className="text-sm text-muted-foreground">{t("installerWorkspace.assignedProjects")}</div>
          <div className="mt-1 text-2xl font-semibold">{stats.total}</div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-[linear-gradient(180deg,hsl(var(--background)/0.92),hsl(var(--accent)/0.08))] p-4">
          <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,hsl(var(--accent)/0.65),transparent)]" />
          <div className="text-sm text-muted-foreground">{t("installerWorkspace.problemProjects")}</div>
          <div className="mt-1 text-2xl font-semibold">{stats.inProblem}</div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-[linear-gradient(180deg,hsl(var(--background)/0.92),hsl(var(--accent)/0.08))] p-4">
          <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,hsl(var(--accent)/0.65),transparent)]" />
          <div className="text-sm text-muted-foreground">{t("installerWorkspace.completedProjects")}</div>
          <div className="mt-1 text-2xl font-semibold">{stats.done}</div>
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="page-eyebrow">{t("installerWorkspace.executionPulse")}</div>
            <h2 className="mt-2 text-lg font-semibold">{t("installerWorkspace.todayTasks")}</h2>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div
            data-testid="installer-tasks-today"
            className="surface-panel"
          >
            <div className="text-sm text-muted-foreground">Today</div>
            <div className="mt-1 text-2xl font-semibold">
              {tasksQuery.isLoading ? "..." : taskStats.today}
            </div>
            <Link
              href="/installer/calendar?preset=today"
              className="mt-3 inline-flex items-center rounded-lg border border-border bg-background px-3 py-1.5 text-xs transition-colors hover:bg-muted"
            >
              {t("installerWorkspace.openTodayTasks")}
            </Link>
          </div>
          <div
            data-testid="installer-tasks-overdue"
            className="surface-panel"
          >
            <div className="text-sm text-muted-foreground">Overdue</div>
            <div className="mt-1 text-2xl font-semibold">
              {tasksQuery.isLoading ? "..." : taskStats.overdue}
            </div>
            <Link
              href="/installer/calendar?preset=7d&overdue=1"
              className="mt-3 inline-flex items-center rounded-lg border border-border bg-background px-3 py-1.5 text-xs transition-colors hover:bg-muted"
            >
              {t("installerWorkspace.openOverdueTasks")}
            </Link>
          </div>
          <div
            data-testid="installer-tasks-no-project"
            className="surface-panel"
          >
            <div className="text-sm text-muted-foreground">Without project</div>
            <div className="mt-1 text-2xl font-semibold">
              {tasksQuery.isLoading ? "..." : taskStats.withoutProject}
            </div>
            <Link
              href="/installer/calendar?preset=7d&project_id=none"
              className="mt-3 inline-flex items-center rounded-lg border border-border bg-background px-3 py-1.5 text-xs transition-colors hover:bg-muted"
            >
              {t("installerWorkspace.openNoProjectTasks")}
            </Link>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{t("installerWorkspace.todayPriorities")}</h2>
          <Link
            href="/installer/calendar?preset=today"
            className="inline-flex items-center rounded-xl border border-border/70 bg-background/75 px-3 py-2 text-xs font-medium transition-colors hover:bg-muted"
          >
            Open today board
          </Link>
        </div>
        {tasksQuery.isLoading && (
          <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
            Building today priorities...
          </div>
        )}
        {!tasksQuery.isLoading && priorityItems.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
            No urgent priorities right now.
          </div>
        )}
        {priorityItems.length > 0 && (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {priorityItems.map((item) => (
            <div
              key={item.id}
              className={
                item.tone === "problem"
                  ? "relative overflow-hidden rounded-2xl border border-amber-500/40 bg-[linear-gradient(180deg,hsl(38_100%_60%/0.16),hsl(38_100%_60%/0.08))] p-4"
                  : item.tone === "overdue"
                    ? "relative overflow-hidden rounded-2xl border border-[hsl(var(--destructive)/0.35)] bg-[linear-gradient(180deg,hsl(var(--destructive)/0.16),hsl(var(--destructive)/0.08))] p-4"
                    : "surface-panel"
              }
            >
              <div className="text-sm font-semibold">{item.title}</div>
              <div className="mt-1 text-xs text-muted-foreground">{item.meta}</div>
                <Link
                  href={item.href}
                  aria-label={`Open priority ${item.title}`}
                  className="mt-3 inline-flex items-center rounded-lg border border-border bg-background px-3 py-1.5 text-xs transition-colors hover:bg-muted"
                >
                  Open priority
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        <section aria-label="My projects list" className="space-y-3 lg:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{t("installerWorkspace.myProjects")}</h2>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["ALL", "All"],
                  ["PROBLEM", t("installerWorkspace.onlyProblem")],
                  ["ACTIVE", t("installerWorkspace.onlyActive")],
                  ["TODAY_TASKS", t("installerWorkspace.hasTasksToday")],
                ] as Array<[ProjectQuickFilter, string]>
              ).map(([value, label]) => {
                const active = projectQuickFilter === value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setProjectQuickFilter(value)}
                    className={
                      active
                        ? "rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground"
                        : "rounded-lg border border-border bg-background px-3 py-1.5 text-xs transition-colors hover:bg-muted"
                    }
                  >
                    {label} ({projectQuickFilterCounts[value]})
                  </button>
                );
              })}
            </div>
          </div>
          {projectsQuery.isLoading && (
            <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
              Loading projects...
            </div>
          )}
          {!projectsQuery.isLoading && projects.length === 0 && (
            <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
              {t("installerWorkspace.noAssignedProjects")}
            </div>
          )}
          {!projectsQuery.isLoading && projects.length > 0 && filteredProjects.length === 0 && (
            <div className="surface-panel text-sm text-muted-foreground">
              {t("installerWorkspace.noProjectsSelectedFilter")}
            </div>
          )}
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="relative overflow-hidden rounded-2xl border border-border/70 bg-[linear-gradient(180deg,hsl(var(--background)/0.9),hsl(var(--accent)/0.06))] p-4 transition-colors hover:bg-[linear-gradient(180deg,hsl(var(--background)/0.94),hsl(var(--accent)/0.1))]"
            >
              <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,hsl(var(--accent)/0.6),transparent)]" />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{project.name}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {project.address || "No address"}
                  </div>
                </div>
                <span className="rounded-lg border border-border/70 bg-background/70 px-2.5 py-1 text-xs">
                  {project.status}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={`/installer/projects/${project.id}`}
                  className="inline-flex items-center rounded-xl border border-border/70 bg-background/75 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                >
                  Open project
                </Link>
                <Link
                  href={`/installer/calendar?project_id=${project.id}`}
                  className="inline-flex items-center rounded-xl border border-border/70 bg-background/75 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                >
                  Open schedule
                </Link>
                <Link
                  href={`/installer/calendar?preset=today&project_id=${project.id}`}
                  className="inline-flex items-center rounded-xl border border-border/70 bg-background/75 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                >
                  {t("installerWorkspace.todayOnProject")}
                </Link>
                <Link
                  href={`/installer/projects/${project.id}#project-doors`}
                  className="inline-flex items-center rounded-xl border border-border/70 bg-background/75 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                >
                  {t("installerWorkspace.priorityDoors")}
                </Link>
                {project.status === "PROBLEM" && (
                  <Link
                    href={buildInstallerIssuesHref(project.id, { issueStatus: "BLOCKED" })}
                    className="inline-flex items-center rounded-xl border border-amber-500/40 bg-amber-500/12 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-amber-500/20"
                  >
                    Open issues
                  </Link>
                )}
                {project.waze_url && (
                  <a
                    href={project.waze_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center rounded-xl border border-border/70 bg-background/75 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                  >
                    Open Waze
                  </a>
                )}
              </div>
            </div>
          ))}
        </section>

        <section className="space-y-3 lg:col-span-2">
          <div>
            <div className="page-eyebrow">{t("installerWorkspace.forwardView")}</div>
            <h2 className="mt-2 text-lg font-semibold">{t("installerWorkspace.next7Days")}</h2>
          </div>
          {eventsQuery.isLoading && (
            <div className="surface-panel text-sm text-muted-foreground">
              Loading events...
            </div>
          )}
          {!eventsQuery.isLoading && events.length === 0 && (
            <div className="surface-panel text-sm text-muted-foreground">
              {t("installerWorkspace.noEventsScheduled")}
            </div>
          )}
          {events.map((event) => (
            <div
              key={event.id}
              className="relative overflow-hidden rounded-2xl border border-border/70 bg-[linear-gradient(180deg,hsl(var(--background)/0.9),hsl(var(--accent)/0.06))] p-4"
            >
              <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,hsl(var(--accent)/0.6),transparent)]" />
              <div className="font-medium">{event.title}</div>
              <div className="mt-1 text-xs text-muted-foreground">{event.event_type}</div>
              <div className="mt-2 text-sm text-muted-foreground">{formatDate(event.starts_at)}</div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
