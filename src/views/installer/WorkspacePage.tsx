"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCcw } from "lucide-react";

import { apiFetch } from "@/lib/api";

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
        meta: `Problem project${project.address ? ` | ${project.address}` : ""}`,
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
        href: project ? `/installer/projects/${project.id}` : "/installer/calendar?preset=7d&overdue=1",
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
          ? `/installer/projects/${project.id}`
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Installer Workspace</h1>
          <p className="text-sm text-muted-foreground">
            Assigned projects, current issues, and upcoming events.
          </p>
        </div>
        <button
          type="button"
          disabled={isRefreshing}
          onClick={() => {
            void refetchWorkspace();
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCcw className="h-4 w-4" />
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {(projectsQuery.isError || eventsQuery.isError || tasksQuery.isError) && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[hsl(var(--destructive)/0.35)] bg-[hsl(var(--destructive)/0.08)] px-4 py-3 text-sm text-[hsl(var(--destructive))]">
          <span>Failed to load installer workspace. Check API availability and role mapping.</span>
          <button
            type="button"
            onClick={() => {
              void refetchWorkspace();
            }}
            className="inline-flex items-center rounded-lg border border-[hsl(var(--destructive)/0.35)] bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-sm text-muted-foreground">Assigned projects</div>
          <div className="mt-1 text-2xl font-semibold">{stats.total}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-sm text-muted-foreground">Problem projects</div>
          <div className="mt-1 text-2xl font-semibold">{stats.inProblem}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-sm text-muted-foreground">Completed projects</div>
          <div className="mt-1 text-2xl font-semibold">{stats.done}</div>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Today tasks</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div
            data-testid="installer-tasks-today"
            className="rounded-xl border border-border bg-card p-4"
          >
            <div className="text-sm text-muted-foreground">Today</div>
            <div className="mt-1 text-2xl font-semibold">
              {tasksQuery.isLoading ? "..." : taskStats.today}
            </div>
            <Link
              href="/installer/calendar?preset=today"
              className="mt-3 inline-flex items-center rounded-lg border border-border bg-background px-3 py-1.5 text-xs transition-colors hover:bg-muted"
            >
              Open today tasks
            </Link>
          </div>
          <div
            data-testid="installer-tasks-overdue"
            className="rounded-xl border border-border bg-card p-4"
          >
            <div className="text-sm text-muted-foreground">Overdue</div>
            <div className="mt-1 text-2xl font-semibold">
              {tasksQuery.isLoading ? "..." : taskStats.overdue}
            </div>
            <Link
              href="/installer/calendar?preset=7d&overdue=1"
              className="mt-3 inline-flex items-center rounded-lg border border-border bg-background px-3 py-1.5 text-xs transition-colors hover:bg-muted"
            >
              Open overdue tasks
            </Link>
          </div>
          <div
            data-testid="installer-tasks-no-project"
            className="rounded-xl border border-border bg-card p-4"
          >
            <div className="text-sm text-muted-foreground">Without project</div>
            <div className="mt-1 text-2xl font-semibold">
              {tasksQuery.isLoading ? "..." : taskStats.withoutProject}
            </div>
            <Link
              href="/installer/calendar?preset=7d&project_id=none"
              className="mt-3 inline-flex items-center rounded-lg border border-border bg-background px-3 py-1.5 text-xs transition-colors hover:bg-muted"
            >
              Open no-project tasks
            </Link>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Today priorities</h2>
          <Link
            href="/installer/calendar?preset=today"
            className="inline-flex items-center rounded-lg border border-border bg-card px-3 py-1.5 text-xs transition-colors hover:bg-muted"
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
                    ? "rounded-xl border border-amber-500/40 bg-amber-500/10 p-4"
                    : item.tone === "overdue"
                      ? "rounded-xl border border-[hsl(var(--destructive)/0.35)] bg-[hsl(var(--destructive)/0.08)] p-4"
                      : "rounded-xl border border-border bg-card p-4"
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
            <h2 className="text-lg font-semibold">My projects</h2>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["ALL", "All"],
                  ["PROBLEM", "Only problem"],
                  ["ACTIVE", "Only active"],
                  ["TODAY_TASKS", "Has tasks today"],
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
              No assigned projects yet.
            </div>
          )}
          {!projectsQuery.isLoading && projects.length > 0 && filteredProjects.length === 0 && (
            <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
              No projects for selected filter.
            </div>
          )}
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{project.name}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {project.address || "No address"}
                  </div>
                </div>
                <span className="rounded-md border border-border px-2 py-1 text-xs">
                  {project.status}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={`/installer/projects/${project.id}`}
                  className="inline-flex items-center rounded-lg border border-border bg-background px-3 py-1.5 text-xs transition-colors hover:bg-muted"
                >
                  Open project
                </Link>
                <Link
                  href={`/installer/calendar?project_id=${project.id}`}
                  className="inline-flex items-center rounded-lg border border-border bg-background px-3 py-1.5 text-xs transition-colors hover:bg-muted"
                >
                  Open schedule
                </Link>
                <Link
                  href={`/installer/calendar?preset=today&project_id=${project.id}`}
                  className="inline-flex items-center rounded-lg border border-border bg-background px-3 py-1.5 text-xs transition-colors hover:bg-muted"
                >
                  Today on project
                </Link>
                <Link
                  href={`/installer/projects/${project.id}#project-doors`}
                  className="inline-flex items-center rounded-lg border border-border bg-background px-3 py-1.5 text-xs transition-colors hover:bg-muted"
                >
                  Priority doors
                </Link>
                {project.status === "PROBLEM" && (
                  <Link
                    href={`/installer/projects/${project.id}?door_filter=WITH_ISSUES#project-open-issues`}
                    className="inline-flex items-center rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs transition-colors hover:bg-amber-500/20"
                  >
                    Open issues
                  </Link>
                )}
                {project.waze_url && (
                  <a
                    href={project.waze_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center rounded-lg border border-border bg-background px-3 py-1.5 text-xs transition-colors hover:bg-muted"
                  >
                    Open Waze
                  </a>
                )}
              </div>
            </div>
          ))}
        </section>

        <section className="space-y-3 lg:col-span-2">
          <h2 className="text-lg font-semibold">Next 7 days</h2>
          {eventsQuery.isLoading && (
            <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
              Loading events...
            </div>
          )}
          {!eventsQuery.isLoading && events.length === 0 && (
            <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
              No events scheduled.
            </div>
          )}
          {events.map((event) => (
            <div key={event.id} className="rounded-xl border border-border bg-card p-4">
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
