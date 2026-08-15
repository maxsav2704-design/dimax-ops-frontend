"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  CircleAlert,
  Download,
  FolderOpen,
  MapPinned,
  RefreshCcw,
  WalletCards,
} from "lucide-react";
import { LtrText } from "@/components/ui/LtrText";
import { apiFetch } from "@/lib/api";
import { formatLocaleDateTime, formatLocaleNumber } from "@/lib/formatting";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { buildInstallerIssuesHref } from "@/views/installer/issue-links";
import {
  buildScheduleCsv,
  downloadScheduleCsv,
  scheduleExportFilename,
} from "@/views/installer/schedule-export";
type CalendarEvent = {
  id: string;
  title: string;
  event_type: string;
  starts_at: string;
  ends_at: string;
  location: string | null;
  waze_url: string | null;
  description: string | null;
  project_id: string | null;
  installer_ids: string[];
};
type CalendarEventsResponse = { items: CalendarEvent[] };
type RangePreset = "today" | "7d" | "30d";
const RANGE_HOURS: Record<RangePreset, number> = {
  today: 24,
  "7d": 24 * 7,
  "30d": 24 * 30,
};
const RANGE_PRESET_BUTTONS: RangePreset[] = ["today", "7d", "30d"];
function getScheduleIssueStatusPreset(eventType: string) {
  return eventType.trim().toLowerCase() === "service" ? "BLOCKED" : null;
}
function getScheduleIssueSearchPreset(eventType: string, title: string) {
  return eventType.trim().toLowerCase() === "service" ? title : null;
}
function scheduleNoticeClass(): string {
  return "flex flex-wrap items-center justify-between gap-3 rounded-lg border border-status-problem-border bg-status-problem-bg px-4 py-3 text-sm text-status-problem-fg";
}
const schedulePrimaryActionClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-transparent bg-accent px-3 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60";
const scheduleSmallActionClass =
  "inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-text transition-colors hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-60";
function scheduleQuickFilterClass(active: boolean): string {
  return active ? "dmx-primary-action h-8" : "dmx-secondary-action h-8";
}
function scheduleStateCardClass(): string {
  return "rounded-lg border border-border bg-surface p-4 text-sm text-text-secondary";
}
export default function InstallerSchedulePage() {
  const { locale, t } = useI18n();
  const copy = (en: string, ru: string, he: string) => {
    if (locale === "ru") return ru;
    if (locale === "he") return he;
    return en;
  };
  const rangePresetLabels: Record<RangePreset, string> = {
    today: t("common.today"),
    "7d": t("installerSchedule.next7Days"),
    "30d": t("installerSchedule.next30Days"),
  };
  const [nowIso] = useState(() => new Date().toISOString());
  const [preset, setPreset] = useState<RangePreset>("7d");
  const [eventTypeFilter, setEventTypeFilter] = useState("ALL");
  const [projectFilter, setProjectFilter] = useState("ALL");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [isQueryInitialized, setIsQueryInitialized] = useState(false);
  const [anchor] = useState(() => new Date().toISOString());
  function resetFilters() {
    setPreset("7d");
    setEventTypeFilter("ALL");
    setProjectFilter("ALL");
    setOverdueOnly(false);
  }
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const rawPreset = params.get("preset");
    setPreset(
      rawPreset === "today" || rawPreset === "7d" || rawPreset === "30d"
        ? rawPreset
        : "7d",
    );
    setEventTypeFilter(params.get("event_type") || "ALL");
    const rawProjectId = params.get("project_id");
    if (rawProjectId === "none") {
      setProjectFilter("NONE");
    } else {
      setProjectFilter(rawProjectId || "ALL");
    }
    setOverdueOnly(params.get("overdue") === "1");
    setIsQueryInitialized(true);
  }, []);
  useEffect(() => {
    if (!isQueryInitialized) {
      return;
    }
    if (typeof window === "undefined") {
      return;
    }
    const nextParams = new URLSearchParams();
    if (preset !== "7d") {
      nextParams.set("preset", preset);
    }
    if (eventTypeFilter !== "ALL") {
      nextParams.set("event_type", eventTypeFilter);
    }
    if (projectFilter === "NONE") {
      nextParams.set("project_id", "none");
    } else if (projectFilter !== "ALL") {
      nextParams.set("project_id", projectFilter);
    }
    if (overdueOnly) {
      nextParams.set("overdue", "1");
    }
    const nextSearch = nextParams.toString();
    const nextUrl = nextSearch
      ? `${window.location.pathname}?${nextSearch}`
      : window.location.pathname;
    window.history.replaceState(window.history.state, "", nextUrl);
  }, [eventTypeFilter, isQueryInitialized, overdueOnly, preset, projectFilter]);
  const range = useMemo(() => {
    const starts = new Date(anchor);
    const ends = new Date(
      starts.getTime() + RANGE_HOURS[preset] * 60 * 60 * 1000,
    );
    return { startsAt: starts.toISOString(), endsAt: ends.toISOString() };
  }, [anchor, preset]);
  const eventsQuery = useQuery({
    queryKey: ["installer-schedule-events", range.startsAt, range.endsAt],
    queryFn: () =>
      apiFetch<CalendarEventsResponse>(
        `/api/v1/installer/calendar/events?starts_at=${encodeURIComponent(range.startsAt)}&ends_at=${encodeURIComponent(range.endsAt)}`,
      ),
    refetchInterval: 30_000,
  });
  const events = eventsQuery.data?.items || [];
  const eventTypeOptions = useMemo(() => {
    const unique = Array.from(
      new Set(events.map((event) => event.event_type)),
    ).sort();
    if (eventTypeFilter !== "ALL" && !unique.includes(eventTypeFilter)) {
      return [eventTypeFilter, ...unique];
    }
    return unique;
  }, [eventTypeFilter, events]);
  const projectOptions = useMemo(() => {
    const unique = Array.from(
      new Set(
        events.map((event) => event.project_id).filter(Boolean) as string[],
      ),
    ).sort();
    if (
      projectFilter !== "ALL" &&
      projectFilter !== "NONE" &&
      !unique.includes(projectFilter)
    ) {
      return [projectFilter, ...unique];
    }
    return unique;
  }, [events, projectFilter]);
  const filteredEvents = useMemo(() => {
    const now = new Date(nowIso);
    return events.filter((event) => {
      const matchesEventType =
        eventTypeFilter === "ALL" || event.event_type === eventTypeFilter;
      const matchesProject =
        projectFilter === "ALL"
          ? true
          : projectFilter === "NONE"
            ? !event.project_id
            : event.project_id === projectFilter;
      const matchesOverdue = !overdueOnly || new Date(event.ends_at) < now;
      return matchesEventType && matchesProject && matchesOverdue;
    });
  }, [eventTypeFilter, events, nowIso, overdueOnly, projectFilter]);
  const hasActiveFilters =
    preset !== "7d" ||
    eventTypeFilter !== "ALL" ||
    projectFilter !== "ALL" ||
    overdueOnly;
  return (
    <div className="motion-stagger page-stack">
      {" "}
      <section className="border-b border-border pb-5">
        {" "}
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          {" "}
          <div className="max-w-3xl">
            {" "}
            <div className="page-eyebrow">
              {t("installerSchedule.eyebrow")}
            </div>{" "}
            <h1 className="mt-3 flex items-center gap-2 text-[26px] font-medium leading-tight text-text sm:text-[30px]">
              {" "}
              <CalendarDays aria-hidden="true" className="h-6 w-6" />{" "}
              {t("installerSchedule.title")}{" "}
            </h1>{" "}
            <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary sm:text-[15px]">
              {" "}
              {t("installerSchedule.subtitle")}{" "}
            </p>{" "}
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="metric-chip">
                {copy("Events", "События", "אירועים")}{" "}
                <LtrText>{formatLocaleNumber(events.length, locale)}</LtrText>
              </span>{" "}
              <span className="metric-chip">
                {copy("Visible", "Видно", "מוצגים")}{" "}
                <LtrText>
                  {formatLocaleNumber(filteredEvents.length, locale)}
                </LtrText>
              </span>{" "}
              <span className="metric-chip">
                {copy("Preset", "Пресет", "טווח")}{" "}
                <LtrText>{preset.toUpperCase()}</LtrText>
              </span>{" "}
              <span className="metric-chip">
                {overdueOnly
                  ? t("installerSchedule.overdueFocus")
                  : t("installerSchedule.mixedQueue")}
              </span>{" "}
            </div>{" "}
            {projectFilter !== "ALL" && projectFilter !== "NONE" ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="metric-chip">
                  {copy("Focused project", "Фокус на проекте", "פרויקט במיקוד")}{" "}
                  <LtrText>{projectFilter}</LtrText>
                </span>
                <Link
                  href="/installer/calendar"
                  className={scheduleSmallActionClass}
                >
                  {copy(
                    "Show full calendar",
                    "Показать весь календарь",
                    "הצג את כל היומן",
                  )}
                </Link>{" "}
              </div>
            ) : null}{" "}
          </div>{" "}
          <div className="max-w-3xl space-y-4 rounded-lg border border-border bg-surface p-4 sm:p-5">
            {" "}
            <div className="text-[12px] leading-5 text-text-secondary">
              {" "}
              {copy(
                "Choose the day range first, then open the event you need and continue to the project.",
                "Сначала выбери диапазон, затем открой нужное событие и перейди в проект.",
                "בחר קודם טווח זמן, אחר כך פתח את האירוע הדרוש והמשך לפרויקט.",
              )}{" "}
            </div>{" "}
            <div className="flex flex-wrap items-center justify-between gap-3">
              {" "}
              <div
                role="group"
                aria-label="Quick range"
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-subtle p-1"
              >
                {" "}
                {RANGE_PRESET_BUTTONS.map((item) => {
                  const active = preset === item;
                  return (
                    <button
                      key={item}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setPreset(item)}
                      className={scheduleQuickFilterClass(active)}
                    >
                      {" "}
                      {rangePresetLabels[item]}{" "}
                    </button>
                  );
                })}{" "}
              </div>{" "}
              <div className="flex flex-wrap gap-2">
                {" "}
                <button
                  type="button"
                  onClick={() => void eventsQuery.refetch()}
                  className={schedulePrimaryActionClass}
                >
                  {" "}
                  <RefreshCcw aria-hidden="true" className="h-4 w-4" />{" "}
                  {t("common.refresh")}{" "}
                </button>{" "}
                <button
                  type="button"
                  onClick={resetFilters}
                  disabled={!hasActiveFilters}
                  className={scheduleSmallActionClass}
                >
                  {" "}
                  {t("installerSchedule.resetFilters")}{" "}
                </button>{" "}
              </div>{" "}
            </div>{" "}
            <div className="grid gap-3 sm:grid-cols-3">
              {" "}
              <label className="field-stack">
                {" "}
                <span className="text-sm text-text-secondary">
                  {t("installerSchedule.eventType")}
                </span>{" "}
                <select
                  aria-label={t("installerSchedule.eventType")}
                  value={eventTypeFilter}
                  onChange={(event) =>
                    setEventTypeFilter(event.target.value || "ALL")
                  }
                  className="control-input"
                >
                  {" "}
                  <option value="ALL">
                    {t("installerSchedule.allTypes")}
                  </option>{" "}
                  {eventTypeOptions.map((eventType) => (
                    <option key={eventType} value={eventType}>
                      {" "}
                      {eventType}{" "}
                    </option>
                  ))}{" "}
                </select>{" "}
              </label>{" "}
              <label className="field-stack">
                {" "}
                <span className="text-sm text-text-secondary">
                  {t("common.project")}
                </span>{" "}
                <select
                  aria-label={t("common.project")}
                  value={projectFilter}
                  onChange={(event) => setProjectFilter(event.target.value)}
                  className="control-input"
                >
                  {" "}
                  <option value="ALL">
                    {t("installerSchedule.allProjects")}
                  </option>{" "}
                  <option value="NONE">
                    {t("installerSchedule.noProject")}
                  </option>{" "}
                  {projectOptions.map((projectId) => (
                    <option key={projectId} value={projectId}>
                      {" "}
                      {projectId}{" "}
                    </option>
                  ))}{" "}
                </select>{" "}
              </label>{" "}
              <div className="field-stack">
                {" "}
                <span className="text-sm text-text-secondary">
                  {t("installerSchedule.overdueOnly")}
                </span>{" "}
                <button
                  type="button"
                  aria-pressed={overdueOnly}
                  onClick={() => setOverdueOnly((prev) => !prev)}
                  className={
                    overdueOnly
                      ? schedulePrimaryActionClass
                      : scheduleSmallActionClass
                  }
                >
                  {" "}
                  {t("installerSchedule.overdueOnly")}{" "}
                </button>{" "}
              </div>{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
      </section>{" "}
      <section className="space-y-3">
        {" "}
        <div className="flex flex-wrap items-end justify-between gap-3">
          {" "}
          <div>
            {" "}
            <div className="page-eyebrow">
              {t("installerSchedule.eyebrow")}
            </div>{" "}
            <h2 className="mt-2 text-lg font-semibold">
              {" "}
              {copy(
                "Events in focus",
                "События в работе",
                "אירועים בטיפול",
              )}{" "}
            </h2>{" "}
          </div>{" "}
          <button
            type="button"
            onClick={() =>
              downloadScheduleCsv(
                buildScheduleCsv(filteredEvents),
                scheduleExportFilename(),
              )
            }
            disabled={filteredEvents.length === 0}
            className={scheduleSmallActionClass}
          >
            {" "}
            <Download aria-hidden="true" className="h-4 w-4" />{" "}
            {t("installerSchedule.exportCsv")}{" "}
          </button>{" "}
        </div>{" "}
      </section>{" "}
      {eventsQuery.isError && (
        <div className={scheduleNoticeClass()}>
          {" "}
          <span>{t("installerSchedule.error")}</span>{" "}
          <button
            type="button"
            onClick={() => void eventsQuery.refetch()}
            className={scheduleSmallActionClass}
          >
            {" "}
            {t("common.retry")}{" "}
          </button>{" "}
        </div>
      )}{" "}
      {eventsQuery.isLoading && (
        <div className={scheduleStateCardClass()}>
          {" "}
          {copy(
            "Loading schedule...",
            "Загрузка расписания...",
            "טוען לוח זמנים...",
          )}{" "}
        </div>
      )}{" "}
      {!eventsQuery.isLoading && events.length === 0 && (
        <div className={scheduleStateCardClass()}>
          {" "}
          {copy(
            "No events in selected range.",
            "В выбранном диапазоне событий нет.",
            "אין אירועים בטווח שנבחר.",
          )}{" "}
        </div>
      )}{" "}
      {!eventsQuery.isLoading &&
        events.length > 0 &&
        filteredEvents.length === 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4 text-sm text-text-secondary">
            {" "}
            <span>{t("installerSchedule.noEventsForFilters")}</span>{" "}
            <button
              type="button"
              onClick={resetFilters}
              className={scheduleSmallActionClass}
            >
              {" "}
              {t("installerSchedule.resetFilters")}{" "}
            </button>{" "}
          </div>
        )}{" "}
      <div className="space-y-3">
        {" "}
        {filteredEvents.map((event) => {
          const isOverdue = new Date(event.ends_at) < new Date(nowIso);
          return (
            <div
              key={event.id}
              className={cn(
                "rounded-lg border border-border bg-surface p-4",
                isOverdue &&
                  "border-status-problem-border bg-status-problem-bg",
              )}
            >
              {" "}
              <div className="flex flex-wrap items-start justify-between gap-2">
                {" "}
                <div>
                  {" "}
                  <div className="font-medium">{event.title}</div>{" "}
                  <div className="mt-1 text-xs text-text-secondary">
                    {event.event_type}
                  </div>{" "}
                </div>{" "}
                <LtrText className="text-xs text-text-secondary">
                  {" "}
                  {formatLocaleDateTime(event.starts_at, locale)} -{" "}
                  {formatLocaleDateTime(event.ends_at, locale)}{" "}
                </LtrText>{" "}
              </div>{" "}
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                {" "}
                <span className="rounded-md border border-border px-2 py-1 text-text">
                  {" "}
                  {event.project_id
                    ? `${t("installerSchedule.projectPrefix")} ${event.project_id}`
                    : t("installerSchedule.noProject")}
                </span>{" "}
              </div>{" "}
              {event.location && (
                <div className="mt-2 text-sm text-text-secondary">
                  {event.location}
                </div>
              )}{" "}
              {event.description && (
                <div className="mt-1 text-sm text-text-secondary">
                  {event.description}
                </div>
              )}{" "}
              <div className="mt-3 flex flex-wrap gap-2">
                {" "}
                {event.project_id && (
                  <>
                    {" "}
                    <Link
                      href={`/installer/projects/${event.project_id}`}
                      className={scheduleSmallActionClass}
                    >
                      {" "}
                      <FolderOpen aria-hidden="true" className="h-4 w-4" />{" "}
                      {copy("Open project", "Открыть проект", "פתח פרויקט")}
                    </Link>{" "}
                    <Link
                      href={buildInstallerIssuesHref(event.project_id, {
                        issueStatus: getScheduleIssueStatusPreset(
                          event.event_type,
                        ),
                        issueSearch: getScheduleIssueSearchPreset(
                          event.event_type,
                          event.title,
                        ),
                      })}
                      className={scheduleSmallActionClass}
                    >
                      {" "}
                      <CircleAlert
                        aria-hidden="true"
                        className="h-4 w-4"
                      />{" "}
                      {copy("Open issues", "Открыть проблемы", "פתח תקלות")}
                    </Link>{" "}
                    <Link
                      href={`/installer/earnings?project_id=${event.project_id}`}
                      className={scheduleSmallActionClass}
                    >
                      {" "}
                      <WalletCards
                        aria-hidden="true"
                        className="h-4 w-4"
                      />{" "}
                      {copy("Open earnings", "Открыть заработок", "פתח רווחים")}
                    </Link>{" "}
                    <Link
                      href={`/installer/sync-queue?project_id=${event.project_id}`}
                      className={scheduleSmallActionClass}
                    >
                      {" "}
                      <RefreshCcw aria-hidden="true" className="h-4 w-4" />{" "}
                      {copy(
                        "Open sync queue",
                        "Открыть очередь синка",
                        "פתח תור סנכרון",
                      )}
                    </Link>{" "}
                  </>
                )}{" "}
                {event.waze_url && (
                  <a
                    href={event.waze_url}
                    target="_blank"
                    rel="noreferrer"
                    className={scheduleSmallActionClass}
                  >
                    {" "}
                    <MapPinned aria-hidden="true" className="h-4 w-4" />{" "}
                    {copy("Open Waze", "Открыть Waze", "פתח Waze")}{" "}
                  </a>
                )}{" "}
              </div>{" "}
            </div>
          );
        })}{" "}
      </div>{" "}
    </div>
  );
}
