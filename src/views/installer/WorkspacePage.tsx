"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCcw } from "lucide-react";

import { fetchInstallerWorkspace } from "@/lib/installer-api";
import { useI18n } from "@/lib/i18n";
import { buildInstallerIssuesHref } from "@/views/installer/issue-links";

type ProjectQuickFilter = "ALL" | "PROBLEM" | "ACTIVE" | "TODAY_TASKS";

type PriorityItem = {
  id: string;
  title: string;
  meta: string;
  href: string;
  tone: "problem" | "overdue" | "today";
};

function formatMoney(
  value: string | number | null | undefined,
  currency: string | null | undefined
): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return String(value);
  }

  const formatted = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(numeric);

  return currency ? `${formatted} ${currency}` : formatted;
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

function getWorkspaceIssueHref(projectId: string, eventType: string, title: string) {
  if (eventType.trim().toLowerCase() !== "service") {
    return `/installer/projects/${projectId}`;
  }

  return buildInstallerIssuesHref(projectId, {
    issueStatus: "BLOCKED",
    issueSearch: title,
  });
}

export default function InstallerWorkspacePage() {
  const { locale, t } = useI18n();
  const copy = (en: string, ru: string, he: string) => {
    if (locale === "ru") return ru;
    if (locale === "he") return he;
    return en;
  };

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
    return {
      fromIso: from.toISOString(),
      toIso: now.toISOString(),
    };
  });

  const workspaceQuery = useQuery({
    queryKey: [
      "installer-workspace",
      calendarRange.fromIso,
      calendarRange.toIso,
      tasksRange.fromIso,
      tasksRange.toIso,
    ],
    queryFn: () =>
      fetchInstallerWorkspace({
        calendarFromIso: calendarRange.fromIso,
        calendarToIso: calendarRange.toIso,
        tasksFromIso: tasksRange.fromIso,
        tasksToIso: tasksRange.toIso,
      }),
    refetchInterval: 30_000,
  });

  const workspace = workspaceQuery.data;
  const projects = workspace?.projects || [];
  const events = workspace?.events || [];
  const taskEvents = workspace?.taskEvents || [];
  const issues = workspace?.issues || [];
  const earningsSummary = workspace?.earningsSummary || null;
  const syncQueue = workspace?.syncQueue || null;

  const stats = useMemo(() => {
    const total = projects.length;
    const inProblem = projects.filter((item) => item.status === "PROBLEM").length;
    return { total, inProblem };
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

  const syncStats = useMemo(() => {
    const items = syncQueue?.items || [];
    return {
      total: items.length,
      pending: items.filter((item) => item.status === "PENDING").length,
      failed: items.filter((item) => item.status === "FAILED").length,
      blocked: items.filter((item) => item.status === "BLOCKED").length,
    };
  }, [syncQueue]);

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
    if (!isQueryInitialized || typeof window === "undefined") {
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
    const nextUrl = nextSearch ? `${window.location.pathname}?${nextSearch}` : window.location.pathname;
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
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({
        id: key,
        title: project.name,
        meta: `${t("installerWorkspace.problemProject")}${project.address ? ` | ${project.address}` : ""}`,
        href: `/installer/projects/${project.id}`,
        tone: "problem",
      });
      if (items.length >= 4) return items;
    }

    const overdueEvents = [...taskEvents]
      .filter((event) => new Date(event.ends_at) < now)
      .sort((left, right) => new Date(left.ends_at).getTime() - new Date(right.ends_at).getTime());

    for (const event of overdueEvents) {
      const key = event.project_id ? `project:${event.project_id}` : `event:${event.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const project = event.project_id ? projectsById.get(event.project_id) : null;
      items.push({
        id: key,
        title: project?.name || event.title,
        meta: copy(
          `Overdue task | ${formatDate(event.ends_at)}`,
          `Просроченная задача | ${formatDate(event.ends_at)}`,
          `משימה באיחור | ${formatDate(event.ends_at)}`
        ),
        href: project
          ? getWorkspaceIssueHref(project.id, event.event_type, event.title)
          : "/installer/calendar?preset=7d&overdue=1",
        tone: "overdue",
      });
      if (items.length >= 4) return items;
    }

    const todayEvents = [...taskEvents]
      .filter((event) => {
        const startsAt = new Date(event.starts_at);
        return startsAt >= dayStart && startsAt < nextDayStart && new Date(event.ends_at) >= now;
      })
      .sort((left, right) => new Date(left.starts_at).getTime() - new Date(right.starts_at).getTime());

    for (const event of todayEvents) {
      const key = event.project_id ? `project:${event.project_id}` : `event:${event.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const project = event.project_id ? projectsById.get(event.project_id) : null;
      items.push({
        id: key,
        title: project?.name || event.title,
        meta: copy(
          `Today ${event.event_type.toLowerCase()} | ${formatDate(event.starts_at)}`,
          `Сегодня ${event.event_type.toLowerCase()} | ${formatDate(event.starts_at)}`,
          `היום ${event.event_type.toLowerCase()} | ${formatDate(event.starts_at)}`
        ),
        href: project
          ? getWorkspaceIssueHref(project.id, event.event_type, event.title)
          : "/installer/calendar?preset=today&project_id=none",
        tone: "today",
      });
      if (items.length >= 4) return items;
    }

    return items;
  }, [copy, nowIso, projects, t, taskEvents]);

  async function refetchWorkspace() {
    await workspaceQuery.refetch();
  }

  return (
    <div className="motion-stagger readability-wrap space-y-6">
      <section className="page-hero relative overflow-hidden">
        <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_top_right,hsl(var(--accent)/0.18),transparent_62%)] lg:block" />
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="page-eyebrow">{t("installerWorkspace.eyebrow")}</div>
            <h1 className="mt-4 font-display text-3xl font-semibold tracking-[-0.04em]">
              {t("installerWorkspace.title")}
            </h1>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">{t("installerWorkspace.subtitle")}</p>
          </div>

          <div className="surface-subtle min-w-0 max-w-xl space-y-4 p-4 sm:p-5 xl:min-w-[320px]">
            <div className="text-[12px] leading-5 text-muted-foreground">
              {copy(
                "Start from today, then open the project that needs action.",
                "Сначала смотри задачи на сегодня, затем открывай проект, где нужно действие.",
                "התחל מהיום ואז פתח את הפרויקט שדורש פעולה."
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border/70 bg-background/70 px-3 py-3">
                <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  {copy("Projects", "Проекты", "פרויקטים")}
                </div>
                <div className="mt-1 text-lg font-semibold text-foreground">{stats.total}</div>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/70 px-3 py-3">
                <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  {copy("Problems", "Проблемы", "תקלות")}
                </div>
                <div className="mt-1 text-lg font-semibold text-foreground">{stats.inProblem}</div>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/70 px-3 py-3">
                <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  {copy("Today", "Сегодня", "היום")}
                </div>
                <div className="mt-1 text-lg font-semibold text-foreground">{taskStats.today}</div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/70 bg-background/70 px-3 py-3">
                <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  {copy("Today earnings", "Заработок за день", "רווח להיום")}
                </div>
                <div className="mt-1 text-lg font-semibold text-foreground">
                  {formatMoney(earningsSummary?.today_total, earningsSummary?.currency)}
                </div>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/70 px-3 py-3">
                <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  {copy("Month earnings", "Заработок за месяц", "רווח לחודש")}
                </div>
                <div className="mt-1 text-lg font-semibold text-foreground">
                  {formatMoney(earningsSummary?.month_total, earningsSummary?.currency)}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border/70 bg-background/70 px-3 py-3">
                <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  {copy("Open issues", "Открытые проблемы", "תקלות פתוחות")}
                </div>
                <div className="mt-1 text-lg font-semibold text-foreground">{issues.length}</div>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/70 px-3 py-3">
                <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  {copy("Sync queue", "Очередь синка", "תור סנכרון")}
                </div>
                <div className="mt-1 text-lg font-semibold text-foreground">{syncStats.total}</div>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/70 px-3 py-3">
                <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  {copy("Data source", "Источник данных", "מקור נתונים")}
                </div>
                <div className="mt-1 text-sm font-medium text-foreground">
                  {workspace?.source === "workspace-endpoint"
                    ? copy("Workspace API", "Единый API", "API מרכזי")
                    : copy("Fallback compose", "Собрано из API", "נבנה ממספר API")}
                </div>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Link
                href="/installer/calendar?preset=today"
                className="btn-premium inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-medium"
              >
                {copy("Open today board", "Открыть план на сегодня", "פתח לוח להיום")}
              </Link>
              <button
                type="button"
                disabled={workspaceQuery.isFetching}
                onClick={() => {
                  void refetchWorkspace();
                }}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border/70 bg-background/70 px-4 text-sm font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCcw className="h-4 w-4" />
                {workspaceQuery.isFetching ? t("common.refreshing") : t("common.refresh")}
              </button>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Link
                href="/installer/earnings"
                className="inline-flex h-10 items-center justify-center rounded-xl border border-border/70 bg-background/70 px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                {copy("Open earnings", "Открыть заработок", "פתח רווחים")}
              </Link>
              <Link
                href="/installer/sync-queue"
                className="inline-flex h-10 items-center justify-center rounded-xl border border-border/70 bg-background/70 px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                {copy("Open sync queue", "Открыть очередь синка", "פתח תור סנכרון")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {workspaceQuery.isError && (
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

      <section className="space-y-3">
        <div>
          <div className="page-eyebrow">{t("installerWorkspace.executionPulse")}</div>
          <h2 className="mt-2 text-lg font-semibold">{t("installerWorkspace.todayTasks")}</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div data-testid="installer-tasks-today" className="metric-tile flex h-full min-h-[164px] flex-col items-start">
            <div className="metric-label">{copy("Today", "Сегодня", "היום")}</div>
            <div className="mt-3 flex-1">
              <div className="text-[2.25rem] font-semibold leading-none tracking-tight text-foreground tabular-nums">
                {workspaceQuery.isLoading ? "…" : taskStats.today}
              </div>
            </div>
            <Link
              href="/installer/calendar?preset=today"
              className="mt-auto inline-flex min-h-10 items-center rounded-xl border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted"
            >
              {t("installerWorkspace.openTodayTasks")}
            </Link>
          </div>

          <div data-testid="installer-tasks-overdue" className="metric-tile flex h-full min-h-[164px] flex-col items-start">
            <div className="metric-label">{t("common.overdue")}</div>
            <div className="mt-3 flex-1">
              <div className="text-[2.25rem] font-semibold leading-none tracking-tight text-foreground tabular-nums">
                {workspaceQuery.isLoading ? "…" : taskStats.overdue}
              </div>
            </div>
            <Link
              href="/installer/calendar?preset=7d&overdue=1"
              className="mt-auto inline-flex min-h-10 items-center rounded-xl border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted"
            >
              {t("installerWorkspace.openOverdueTasks")}
            </Link>
          </div>

          <div data-testid="installer-tasks-no-project" className="metric-tile flex h-full min-h-[164px] flex-col items-start">
            <div className="metric-label">{copy("Without project", "Без проекта", "ללא פרויקט")}</div>
            <div className="mt-3 flex-1">
              <div className="text-[2.25rem] font-semibold leading-none tracking-tight text-foreground tabular-nums">
                {workspaceQuery.isLoading ? "…" : taskStats.withoutProject}
              </div>
            </div>
            <Link
              href="/installer/calendar?preset=7d&project_id=none"
              className="mt-auto inline-flex min-h-10 items-center rounded-xl border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted"
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
            {copy("Open today board", "Открыть план на сегодня", "פתח לוח להיום")}
          </Link>
        </div>

        {workspaceQuery.isLoading && (
          <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
            {copy(
              "Building today priorities...",
              "Собираем приоритеты на сегодня...",
              "טוען סדר עדיפויות להיום..."
            )}
          </div>
        )}

        {!workspaceQuery.isLoading && priorityItems.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
            {copy(
              "No urgent priorities right now.",
              "Срочных приоритетов сейчас нет.",
              "אין עדיפויות דחופות כרגע."
            )}
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
                  aria-label={`${copy("Open priority", "Открыть приоритет", "פתח עדיפות")} ${item.title}`}
                  className="mt-3 inline-flex items-center rounded-lg border border-border bg-background px-3 py-1.5 text-xs transition-colors hover:bg-muted"
                >
                  {copy("Open priority", "Открыть приоритет", "פתח עדיפות")}
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
                  ["ALL", t("common.all")],
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

          {workspaceQuery.isLoading && (
            <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
              {copy("Loading projects...", "Загружаем проекты...", "טוען פרויקטים...")}
            </div>
          )}

          {!workspaceQuery.isLoading && projects.length === 0 && (
            <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
              {t("installerWorkspace.noAssignedProjects")}
            </div>
          )}

          {!workspaceQuery.isLoading && projects.length > 0 && filteredProjects.length === 0 && (
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
                    {project.address || copy("No address", "Нет адреса", "אין כתובת")}
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
                  {copy("Open project", "Открыть проект", "פתח פרויקט")}
                </Link>
                <Link
                  href={`/installer/calendar?project_id=${project.id}`}
                  className="inline-flex items-center rounded-xl border border-border/70 bg-background/75 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                >
                  {copy("Open schedule", "Открыть расписание", "פתח לוח זמנים")}
                </Link>
                {project.status === "PROBLEM" && (
                  <Link
                    href={buildInstallerIssuesHref(project.id, { issueStatus: "BLOCKED" })}
                    className="inline-flex items-center rounded-xl border border-amber-500/40 bg-amber-500/12 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-amber-500/20"
                  >
                    {copy("Open issues", "Открыть проблемы", "פתח תקלות")}
                  </Link>
                )}
                {project.waze_url && (
                  <a
                    href={project.waze_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center rounded-xl border border-border/70 bg-background/75 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                  >
                    {copy("Open Waze", "Открыть Waze", "פתח Waze")}
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

          {workspaceQuery.isLoading && (
            <div className="surface-panel text-sm text-muted-foreground">
              {copy("Loading events...", "Загружаем события...", "טוען אירועים...")}
            </div>
          )}

          {!workspaceQuery.isLoading && events.length === 0 && (
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
              <div className="mt-3 flex flex-wrap gap-2">
                {event.project_id ? (
                  <Link
                    href={getWorkspaceIssueHref(event.project_id, event.event_type, event.title)}
                    className="inline-flex items-center rounded-xl border border-border/70 bg-background/75 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                  >
                    {copy("Open project", "Открыть проект", "פתח פרויקט")}
                  </Link>
                ) : (
                  <Link
                    href="/installer/calendar?preset=7d&project_id=none"
                    className="inline-flex items-center rounded-xl border border-border/70 bg-background/75 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                  >
                    {copy("Open calendar", "Открыть календарь", "פתח יומן")}
                  </Link>
                )}
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
