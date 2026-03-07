"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCcw } from "lucide-react";

import { apiFetch } from "@/lib/api";

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

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="space-y-3 lg:col-span-3">
          <h2 className="text-lg font-semibold">My projects</h2>
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
          {projects.map((project) => (
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
