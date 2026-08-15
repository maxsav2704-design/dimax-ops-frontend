"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  CircleAlert,
  FolderOpen,
  MapPinned,
  RefreshCcw,
  WalletCards,
} from "lucide-react";
import { WidgetCard } from "@/components/dimax";
import { fetchInstallerWorkspace } from "@/lib/installer-api";
import { readableApiError } from "@/lib/api-error-display";
import {
  formatLocaleDateTime,
  formatLocaleMoney,
  formatLocaleNumber,
} from "@/lib/formatting";
import { useI18n } from "@/lib/i18n";
import { buildInstallerIssuesHref } from "@/views/installer/issue-links";
import { LtrText } from "@/components/ui/LtrText";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
type ProjectQuickFilter = "ALL" | "PROBLEM" | "ACTIVE" | "TODAY_TASKS";
type PriorityItem = {
  id: string;
  title: string;
  meta: string;
  href: string;
  tone: "problem" | "overdue" | "today";
};
function getWorkspaceIssueHref(
  projectId: string,
  eventType: string,
  title: string,
) {
  if (eventType.trim().toLowerCase() !== "service") {
    return `/installer/projects/${projectId}`;
  }
  return buildInstallerIssuesHref(projectId, {
    issueStatus: "BLOCKED",
    issueSearch: title,
  });
}
function workspaceNoticeClass(tone: "error"): string {
  return cn(
    "flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm",
    tone === "error" &&
      "border-status-problem-border bg-status-problem-bg text-status-problem-fg",
  );
}
function workspaceMiniMetricClass(): string {
  return "rounded-lg border border-border bg-surface px-3 py-3";
}
function workspaceMiniMetricLabelClass(): string {
  return "text-12 font-medium uppercase text-text-secondary";
}
function workspaceStateCardClass(): string {
  return "rounded-lg border border-border bg-surface p-4 text-sm text-text-secondary";
}
function workspaceTaskMetricClass(): string {
  return "flex h-full min-h-[164px] flex-col items-start rounded-lg border border-border bg-surface p-4";
}
function workspacePriorityClass(tone: PriorityItem["tone"]): string {
  if (tone === "problem") {
    return "relative overflow-hidden rounded-lg border border-status-warning-border bg-status-warning-bg p-4 text-status-warning-fg";
  }
  if (tone === "overdue") {
    return "relative overflow-hidden rounded-lg border border-status-problem-border bg-status-problem-bg p-4 text-status-problem-fg";
  }
  return "relative overflow-hidden rounded-lg border border-border bg-surface p-4";
}
function workspaceQuickFilterClass(active: boolean): string {
  return cn(active ? "dmx-primary-action h-8" : "dmx-secondary-action h-8");
}
const workspaceSmallActionClass =
  "inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-text transition-colors hover:bg-surface-subtle";
export default function InstallerWorkspacePage() {
  const { locale, t } = useI18n();
  const copy = (en: string, ru: string, he: string) => {
    if (locale === "ru") return ru;
    if (locale === "he") return he;
    return en;
  };
  const projectStatusLabel = (status: string) => {
    const normalized = status.trim().toUpperCase();
    switch (normalized) {
      case "PROBLEM":
        return copy("Problem", "Проблема", "תקלה");
      case "DONE":
        return copy("Done", "Выполнено", "בוצע");
      case "IN_PROGRESS":
        return copy("In Progress", "В работе", "בתהליך");
      case "ACTIVE":
        return copy("Active", "Активен", "פעיל");
      case "READY":
        return copy("Ready", "Готов", "מוכן");
      case "NOT_STARTED":
        return copy("Not Started", "Не начато", "לא התחיל");
      default:
        return status || "-";
    }
  };
  const [nowIso] = useState(() => new Date().toISOString());
  const [projectQuickFilter, setProjectQuickFilter] =
    useState<ProjectQuickFilter>("ALL");
  const [isQueryInitialized, setIsQueryInitialized] = useState(false);
  const [calendarRange] = useState(() => {
    const from = new Date(nowIso);
    const to = new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000);
    return { fromIso: from.toISOString(), toIso: to.toISOString() };
  });
  const [tasksRange] = useState(() => {
    const now = new Date(nowIso);
    const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { fromIso: from.toISOString(), toIso: now.toISOString() };
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
    const inProblem = projects.filter(
      (item) => item.status === "PROBLEM",
    ).length;
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
    const overdue = taskEvents.filter(
      (event) => new Date(event.ends_at) < now,
    ).length;
    const withoutProject = taskEvents.filter(
      (event) => !event.project_id,
    ).length;
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
          return (
            startsAt >= dayStart &&
            startsAt < nextDayStart &&
            Boolean(event.project_id)
          );
        })
        .map((event) => event.project_id as string),
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
      PROBLEM: projects.filter((project) => project.status === "PROBLEM")
        .length,
      ACTIVE: projects.filter((project) => project.status !== "DONE").length,
      TODAY_TASKS: projects.filter((project) =>
        todayTaskProjectIds.has(project.id),
      ).length,
    }),
    [projects, todayTaskProjectIds],
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
            : "ALL",
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
    const projectsById = new Map(
      projects.map((project) => [project.id, project]),
    );
    for (const project of projects.filter(
      (item) => item.status === "PROBLEM",
    )) {
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
      .sort(
        (left, right) =>
          new Date(left.ends_at).getTime() - new Date(right.ends_at).getTime(),
      );
    for (const event of overdueEvents) {
      const key = event.project_id
        ? `project:${event.project_id}`
        : `event:${event.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const project = event.project_id
        ? projectsById.get(event.project_id)
        : null;
      items.push({
        id: key,
        title: project?.name || event.title,
        meta: copy(
          `Overdue task | ${formatLocaleDateTime(event.ends_at, locale)}`,
          `Просроченная задача | ${formatLocaleDateTime(event.ends_at, locale)}`,
          `משימה באיחור | ${formatLocaleDateTime(event.ends_at, locale)}`,
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
        return (
          startsAt >= dayStart &&
          startsAt < nextDayStart &&
          new Date(event.ends_at) >= now
        );
      })
      .sort(
        (left, right) =>
          new Date(left.starts_at).getTime() -
          new Date(right.starts_at).getTime(),
      );
    for (const event of todayEvents) {
      const key = event.project_id
        ? `project:${event.project_id}`
        : `event:${event.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const project = event.project_id
        ? projectsById.get(event.project_id)
        : null;
      items.push({
        id: key,
        title: project?.name || event.title,
        meta: copy(
          `Today ${event.event_type.toLowerCase()} | ${formatLocaleDateTime(event.starts_at, locale)}`,
          `Сегодня ${event.event_type.toLowerCase()} | ${formatLocaleDateTime(event.starts_at, locale)}`,
          `היום ${event.event_type.toLowerCase()} | ${formatLocaleDateTime(event.starts_at, locale)}`,
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
    <div className="motion-stagger readability-wrap space-y-4">
      {" "}
      <section className="rounded-lg border border-border bg-surface p-5 sm:p-6">
        {" "}
        <div className="flex flex-wrap items-start justify-between gap-4">
          {" "}
          <div className="max-w-2xl">
            {" "}
            <div className="mb-2 text-[10.5px] font-medium uppercase text-text-secondary">
              {" "}
              {t("installerWorkspace.eyebrow")}{" "}
            </div>{" "}
            <h1 className="dmx-page-title">
              {" "}
              {t("installerWorkspace.title")}{" "}
            </h1>{" "}
            <p className="dmx-page-subtitle mt-1 max-w-2xl">
              {t("installerWorkspace.subtitle")}
            </p>{" "}
          </div>{" "}
          <div className="surface-subtle min-w-0 max-w-xl space-y-4 p-4 sm:p-5 xl:min-w-[320px]">
            {" "}
            <div className="text-[12px] leading-5 text-text-secondary">
              {" "}
              {copy(
                "Start from today, then open the project that needs action.",
                "Сначала смотри задачи на сегодня, затем открывай проект, где нужно действие.",
                "התחל מהיום ואז פתח את הפרויקט שדורש פעולה.",
              )}{" "}
            </div>{" "}
            <div className="grid gap-3 sm:grid-cols-3">
              {" "}
              <div className={workspaceMiniMetricClass()}>
                {" "}
                <div className={workspaceMiniMetricLabelClass()}>
                  {" "}
                  {copy("Projects", "Проекты", "פרויקטים")}{" "}
                </div>{" "}
                <LtrText className="mt-1 text-lg font-semibold text-text">
                  {formatLocaleNumber(stats.total, locale)}
                </LtrText>{" "}
              </div>{" "}
              <div className={workspaceMiniMetricClass()}>
                {" "}
                <div className={workspaceMiniMetricLabelClass()}>
                  {" "}
                  {copy("Problems", "Проблемы", "תקלות")}{" "}
                </div>{" "}
                <LtrText className="mt-1 text-lg font-semibold text-text">
                  {formatLocaleNumber(stats.inProblem, locale)}
                </LtrText>{" "}
              </div>{" "}
              <div className={workspaceMiniMetricClass()}>
                {" "}
                <div className={workspaceMiniMetricLabelClass()}>
                  {" "}
                  {copy("Today", "Сегодня", "היום")}{" "}
                </div>{" "}
                <LtrText className="mt-1 text-lg font-semibold text-text">
                  {formatLocaleNumber(taskStats.today, locale)}
                </LtrText>{" "}
              </div>{" "}
            </div>{" "}
            <div className="grid gap-3 sm:grid-cols-2">
              {" "}
              <div className={workspaceMiniMetricClass()}>
                {" "}
                <div className={workspaceMiniMetricLabelClass()}>
                  {" "}
                  {copy(
                    "Today earnings",
                    "Заработок за день",
                    "רווח להיום",
                  )}{" "}
                </div>{" "}
                <LtrText className="mt-1 text-lg font-semibold text-text">
                  {" "}
                  {formatLocaleMoney(
                    earningsSummary?.today_total,
                    earningsSummary?.currency,
                    locale,
                  )}{" "}
                </LtrText>{" "}
              </div>{" "}
              <div className={workspaceMiniMetricClass()}>
                {" "}
                <div className={workspaceMiniMetricLabelClass()}>
                  {" "}
                  {copy(
                    "Month earnings",
                    "Заработок за месяц",
                    "רווח לחודש",
                  )}{" "}
                </div>{" "}
                <LtrText className="mt-1 text-lg font-semibold text-text">
                  {" "}
                  {formatLocaleMoney(
                    earningsSummary?.month_total,
                    earningsSummary?.currency,
                    locale,
                  )}{" "}
                </LtrText>{" "}
              </div>{" "}
            </div>{" "}
            <div className="grid gap-3 sm:grid-cols-3">
              {" "}
              <div className={workspaceMiniMetricClass()}>
                {" "}
                <div className={workspaceMiniMetricLabelClass()}>
                  {" "}
                  {copy(
                    "Open issues",
                    "Открытые проблемы",
                    "תקלות פתוחות",
                  )}{" "}
                </div>{" "}
                <LtrText className="mt-1 text-lg font-semibold text-text">
                  {formatLocaleNumber(issues.length, locale)}
                </LtrText>{" "}
              </div>{" "}
              <div className={workspaceMiniMetricClass()}>
                {" "}
                <div className={workspaceMiniMetricLabelClass()}>
                  {" "}
                  {copy("Sync queue", "Очередь синка", "תור סנכרון")}{" "}
                </div>{" "}
                <LtrText className="mt-1 text-lg font-semibold text-text">
                  {formatLocaleNumber(syncStats.total, locale)}
                </LtrText>{" "}
              </div>{" "}
              <div className={workspaceMiniMetricClass()}>
                {" "}
                <div className={workspaceMiniMetricLabelClass()}>
                  {" "}
                  {copy("Data source", "Источник данных", "מקור נתונים")}{" "}
                </div>{" "}
                <div className="mt-1 text-sm font-medium text-text">
                  {" "}
                  {workspace?.source === "workspace-endpoint"
                    ? copy("Workspace API", "Единый API", "API מרכזי")
                    : copy(
                        "Fallback compose",
                        "Собрано из API",
                        "נבנה ממספר API",
                      )}{" "}
                </div>{" "}
              </div>{" "}
            </div>{" "}
            <div className="grid gap-2 sm:grid-cols-2">
              {" "}
              <Link
                href="/installer/calendar?preset=today"
                className="dmx-primary-action h-11 justify-center"
              >
                {" "}
                {copy(
                  "Open today board",
                  "Открыть план на сегодня",
                  "פתח לוח להיום",
                )}{" "}
              </Link>{" "}
              <button
                type="button"
                disabled={workspaceQuery.isFetching}
                onClick={() => {
                  void refetchWorkspace();
                }}
                className="dmx-secondary-action h-11 justify-center disabled:cursor-not-allowed disabled:opacity-60"
              >
                {" "}
                <RefreshCcw className="h-4 w-4" />{" "}
                {workspaceQuery.isFetching
                  ? t("common.refreshing")
                  : t("common.refresh")}{" "}
              </button>{" "}
            </div>{" "}
            <div className="grid gap-2 sm:grid-cols-2">
              {" "}
              <Link
                href="/installer/earnings"
                className="dmx-secondary-action h-10 justify-center"
              >
                {" "}
                {copy("Open earnings", "Открыть заработок", "פתח רווחים")}{" "}
              </Link>{" "}
              <Link
                href="/installer/sync-queue"
                className="dmx-secondary-action h-10 justify-center"
              >
                {" "}
                {copy(
                  "Open sync queue",
                  "Открыть очередь синка",
                  "פתח תור סנכרון",
                )}{" "}
              </Link>{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
      </section>{" "}
      {workspaceQuery.isError && (
        <div className={workspaceNoticeClass("error")}>
          {" "}
          <span>
            {readableApiError(
              workspaceQuery.error,
              locale,
              t("installerWorkspace.error"),
            )}
          </span>{" "}
          <button
            type="button"
            onClick={() => {
              void refetchWorkspace();
            }}
            className="dmx-secondary-action h-8"
          >
            {" "}
            {t("common.retry")}{" "}
          </button>{" "}
        </div>
      )}{" "}
      <WidgetCard
        title={t("installerWorkspace.todayTasks")}
        headerMeta={t("installerWorkspace.executionPulse")}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          {" "}
          <div
            data-testid="installer-tasks-today"
            className={workspaceTaskMetricClass()}
          >
            {" "}
            <div className={workspaceMiniMetricLabelClass()}>
              {copy("Today", "Сегодня", "היום")}
            </div>{" "}
            <div className="mt-3 flex-1">
              {" "}
              <LtrText className="text-24 font-medium leading-tight text-text">
                {" "}
                {workspaceQuery.isLoading
                  ? "…"
                  : formatLocaleNumber(taskStats.today, locale)}{" "}
              </LtrText>{" "}
            </div>{" "}
            <Link
              href="/installer/calendar?preset=today"
              className="dmx-secondary-action mt-auto min-h-10"
            >
              {" "}
              {t("installerWorkspace.openTodayTasks")}{" "}
            </Link>{" "}
          </div>{" "}
          <div
            data-testid="installer-tasks-overdue"
            className={workspaceTaskMetricClass()}
          >
            {" "}
            <div className={workspaceMiniMetricLabelClass()}>
              {t("common.overdue")}
            </div>{" "}
            <div className="mt-3 flex-1">
              {" "}
              <LtrText className="text-24 font-medium leading-tight text-text">
                {" "}
                {workspaceQuery.isLoading
                  ? "…"
                  : formatLocaleNumber(taskStats.overdue, locale)}{" "}
              </LtrText>{" "}
            </div>{" "}
            <Link
              href="/installer/calendar?preset=7d&overdue=1"
              className="dmx-secondary-action mt-auto min-h-10"
            >
              {" "}
              {t("installerWorkspace.openOverdueTasks")}{" "}
            </Link>{" "}
          </div>{" "}
          <div
            data-testid="installer-tasks-no-project"
            className={workspaceTaskMetricClass()}
          >
            {" "}
            <div className={workspaceMiniMetricLabelClass()}>
              {copy("Without project", "Без проекта", "ללא פרויקט")}
            </div>{" "}
            <div className="mt-3 flex-1">
              {" "}
              <LtrText className="text-24 font-medium leading-tight text-text">
                {" "}
                {workspaceQuery.isLoading
                  ? "…"
                  : formatLocaleNumber(taskStats.withoutProject, locale)}{" "}
              </LtrText>{" "}
            </div>{" "}
            <Link
              href="/installer/calendar?preset=7d&project_id=none"
              className="dmx-secondary-action mt-auto min-h-10"
            >
              {" "}
              {t("installerWorkspace.openNoProjectTasks")}{" "}
            </Link>{" "}
          </div>{" "}
        </div>{" "}
      </WidgetCard>{" "}
      <WidgetCard
        title={t("installerWorkspace.todayPriorities")}
        actionSlot={
          <Link
            href="/installer/calendar?preset=today"
            className="dmx-secondary-action min-h-8 w-full justify-center sm:w-auto"
          >
            {" "}
            {copy(
              "Open today board",
              "Открыть план на сегодня",
              "פתח לוח להיום",
            )}{" "}
          </Link>
        }
      >
        {workspaceQuery.isLoading && (
          <div className={workspaceStateCardClass()}>
            {" "}
            {copy(
              "Building today priorities...",
              "Собираем приоритеты на сегодня...",
              "טוען סדר עדיפויות להיום...",
            )}{" "}
          </div>
        )}{" "}
        {!workspaceQuery.isLoading && priorityItems.length === 0 && (
          <div className={workspaceStateCardClass()}>
            {" "}
            {copy(
              "No urgent priorities right now.",
              "Срочных приоритетов сейчас нет.",
              "אין עדיפויות דחופות כרגע.",
            )}{" "}
          </div>
        )}{" "}
        {priorityItems.length > 0 && (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {" "}
            {priorityItems.map((item) => (
              <div key={item.id} className={workspacePriorityClass(item.tone)}>
                {" "}
                <div className="text-sm font-semibold text-text">
                  {item.title}
                </div>{" "}
                <div className="mt-1 text-xs text-text-secondary">
                  {item.meta}
                </div>{" "}
                <Link
                  href={item.href}
                  aria-label={`${copy("Open priority", "Открыть приоритет", "פתח עדיפות")} ${item.title}`}
                  className="dmx-secondary-action mt-3 h-8"
                >
                  {" "}
                  {copy(
                    "Open priority",
                    "Открыть приоритет",
                    "פתח עדיפות",
                  )}{" "}
                </Link>{" "}
              </div>
            ))}{" "}
          </div>
        )}{" "}
      </WidgetCard>{" "}
      <div className="grid gap-6 lg:grid-cols-5">
        {" "}
        <section
          aria-label="My projects list"
          className="space-y-3 lg:col-span-3"
        >
          {" "}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {" "}
            <h2 className="text-lg font-semibold">
              {t("installerWorkspace.myProjects")}
            </h2>{" "}
            <div className="flex flex-wrap gap-2">
              {" "}
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
                    className={workspaceQuickFilterClass(active)}
                  >
                    {" "}
                    <span>{label}</span>{" "}
                    <LtrText>({projectQuickFilterCounts[value]})</LtrText>{" "}
                  </button>
                );
              })}{" "}
            </div>{" "}
          </div>{" "}
          {workspaceQuery.isLoading && (
            <div className={workspaceStateCardClass()}>
              {" "}
              {copy(
                "Loading projects...",
                "Загружаем проекты...",
                "טוען פרויקטים...",
              )}{" "}
            </div>
          )}{" "}
          {!workspaceQuery.isLoading && projects.length === 0 && (
            <div className={workspaceStateCardClass()}>
              {" "}
              {t("installerWorkspace.noAssignedProjects")}{" "}
            </div>
          )}{" "}
          {!workspaceQuery.isLoading &&
            projects.length > 0 &&
            filteredProjects.length === 0 && (
              <div className={workspaceStateCardClass()}>
                {" "}
                {t("installerWorkspace.noProjectsSelectedFilter")}{" "}
              </div>
            )}{" "}
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className={cn(
                "relative min-w-0 overflow-hidden rounded-lg border bg-surface p-4 transition-colors",
                "hover:border-border-strong hover:bg-surface-subtle",
                project.status === "PROBLEM"
                  ? "border-status-problem-border bg-status-problem-bg"
                  : "border-border",
              )}
            >
              {" "}
              <div className="flex items-start justify-between gap-3">
                {" "}
                <div className="min-w-0">
                  {" "}
                  <div className="truncate font-medium">
                    {project.name}
                  </div>{" "}
                  {project.waze_url && project.address ? (
                    <a
                      href={project.waze_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex max-w-full items-center gap-1.5 text-sm text-text-secondary underline-offset-4 transition-colors hover:text-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {" "}
                      <MapPinned
                        aria-hidden="true"
                        className="h-3.5 w-3.5 shrink-0"
                      />{" "}
                      <span className="truncate">{project.address}</span>{" "}
                    </a>
                  ) : (
                    <div className="mt-1 line-clamp-2 text-sm text-text-secondary">
                      {" "}
                      {project.address ||
                        copy(
                          "Address not specified",
                          "Адрес не указан",
                          "הכתובת לא צוינה",
                        )}{" "}
                    </div>
                  )}{" "}
                </div>{" "}
                <StatusBadge
                  status={project.status}
                  label={projectStatusLabel(project.status)}
                  domain="project"
                  className="shrink-0"
                />{" "}
              </div>{" "}
              <div className="mt-3 flex flex-wrap gap-2">
                {" "}
                <Link
                  href={`/installer/projects/${project.id}`}
                  className={workspaceSmallActionClass}
                >
                  {" "}
                  <FolderOpen aria-hidden="true" />{" "}
                  {copy("Open project", "Открыть проект", "פתח פרויקט")}{" "}
                </Link>{" "}
                <Link
                  href={`/installer/calendar?project_id=${project.id}`}
                  className={workspaceSmallActionClass}
                >
                  {" "}
                  <CalendarDays aria-hidden="true" />{" "}
                  {copy(
                    "Open schedule",
                    "Открыть расписание",
                    "פתח לוח זמנים",
                  )}{" "}
                </Link>{" "}
                <Link
                  href={`/installer/earnings?project_id=${project.id}`}
                  className={workspaceSmallActionClass}
                >
                  {" "}
                  <WalletCards aria-hidden="true" />{" "}
                  {copy(
                    "Open earnings",
                    "Открыть заработок",
                    "פתח רווחים",
                  )}{" "}
                </Link>{" "}
                {project.status === "PROBLEM" && (
                  <Link
                    href={buildInstallerIssuesHref(project.id, {
                      issueStatus: "BLOCKED",
                    })}
                    className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-status-problem-border bg-status-problem-bg px-3 text-xs font-medium text-status-problem-fg transition-colors hover:bg-status-problem-bg"
                  >
                    {" "}
                    <CircleAlert aria-hidden="true" />{" "}
                    {copy("Open issues", "Открыть проблемы", "פתח תקלות")}{" "}
                  </Link>
                )}{" "}
                {project.waze_url && (
                  <a
                    href={project.waze_url}
                    target="_blank"
                    rel="noreferrer"
                    className={workspaceSmallActionClass}
                  >
                    {" "}
                    <MapPinned aria-hidden="true" />{" "}
                    {copy("Open Waze", "Открыть Waze", "פתח Waze")}{" "}
                  </a>
                )}{" "}
              </div>{" "}
            </div>
          ))}{" "}
        </section>{" "}
        <section className="space-y-3 lg:col-span-2">
          {" "}
          <div>
            {" "}
            <div className="page-eyebrow">
              {t("installerWorkspace.forwardView")}
            </div>{" "}
            <h2 className="mt-2 text-lg font-semibold">
              {t("installerWorkspace.next7Days")}
            </h2>{" "}
          </div>{" "}
          {workspaceQuery.isLoading && (
            <div className={workspaceStateCardClass()}>
              {" "}
              {copy(
                "Loading events...",
                "Загружаем события...",
                "טוען אירועים...",
              )}{" "}
            </div>
          )}{" "}
          {!workspaceQuery.isLoading && events.length === 0 && (
            <div className={workspaceStateCardClass()}>
              {" "}
              {t("installerWorkspace.noEventsScheduled")}{" "}
            </div>
          )}{" "}
          {events.map((event) => (
            <div
              key={event.id}
              data-testid={`workspace-event-${event.id}`}
              className="rounded-lg border border-border bg-surface p-4"
            >
              {" "}
              <div className="font-medium">{event.title}</div>{" "}
              <div className="mt-1 text-xs text-text-secondary">
                {event.event_type}
              </div>{" "}
              <LtrText className="mt-2 text-sm text-text-secondary">
                {formatLocaleDateTime(event.starts_at, locale)}
              </LtrText>{" "}
              <div className="mt-3 flex flex-wrap gap-2">
                {" "}
                {event.project_id ? (
                  <>
                    {" "}
                    <Link
                      href={`/installer/projects/${event.project_id}`}
                      className={workspaceSmallActionClass}
                    >
                      {" "}
                      {copy(
                        "Open project",
                        "Открыть проект",
                        "פתח פרויקט",
                      )}{" "}
                    </Link>{" "}
                    <Link
                      href={buildInstallerIssuesHref(event.project_id, {
                        issueStatus:
                          event.event_type.trim().toLowerCase() === "service"
                            ? "BLOCKED"
                            : undefined,
                        issueSearch:
                          event.event_type.trim().toLowerCase() === "service"
                            ? event.title
                            : undefined,
                      })}
                      className={workspaceSmallActionClass}
                    >
                      {" "}
                      {copy(
                        "Open issues",
                        "Открыть проблемы",
                        "פתח תקלות",
                      )}{" "}
                    </Link>{" "}
                    <Link
                      href={`/installer/calendar?project_id=${event.project_id}`}
                      className={workspaceSmallActionClass}
                    >
                      {" "}
                      {copy(
                        "Open calendar",
                        "Открыть календарь",
                        "פתח יומן",
                      )}{" "}
                    </Link>{" "}
                    <Link
                      href={`/installer/sync-queue?project_id=${event.project_id}`}
                      className={workspaceSmallActionClass}
                    >
                      {" "}
                      {copy(
                        "Open sync queue",
                        "Открыть очередь синка",
                        "פתח תור סנכרון",
                      )}{" "}
                    </Link>{" "}
                  </>
                ) : (
                  <Link
                    href="/installer/calendar?preset=7d&project_id=none"
                    className={workspaceSmallActionClass}
                  >
                    {" "}
                    {copy(
                      "Open calendar",
                      "Открыть календарь",
                      "פתח יומן",
                    )}{" "}
                  </Link>
                )}{" "}
              </div>{" "}
            </div>
          ))}{" "}
        </section>{" "}
      </div>{" "}
    </div>
  );
}
