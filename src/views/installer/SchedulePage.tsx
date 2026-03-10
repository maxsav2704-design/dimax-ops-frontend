"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCcw } from "lucide-react";

import { apiFetch } from "@/lib/api";
import { useI18n, type Locale } from "@/lib/i18n";
import { buildInstallerIssuesHref } from "@/views/installer/issue-links";
import {
  buildScheduleCsv,
  downloadScheduleCsv,
  scheduleExportFilename,
} from "@/views/installer/schedule-export";

const scheduleOverrides: Partial<Record<Locale, Record<string, string>>> = {
  en: {
    "installerSchedule.eventsMetric": "Events {count}",
    "installerSchedule.visibleMetric": "Visible {count}",
    "installerSchedule.presetMetric": "Preset {preset}",
    "installerSchedule.loading": "Loading schedule...",
    "installerSchedule.emptySelectedRange": "No events in selected range.",
  },
  ru: {
    "installerSchedule.eventsMetric": "События {count}",
    "installerSchedule.visibleMetric": "Видно {count}",
    "installerSchedule.presetMetric": "Пресет {preset}",
    "installerSchedule.loading": "Загрузка расписания...",
    "installerSchedule.emptySelectedRange": "В выбранном диапазоне событий нет.",
  },
  he: {
    "installerSchedule.eventsMetric": "אירועים {count}",
    "installerSchedule.visibleMetric": "מוצגים {count}",
    "installerSchedule.presetMetric": "Preset {preset}",
    "installerSchedule.loading": "טוען לוח זמנים...",
    "installerSchedule.emptySelectedRange": "אין אירועים בטווח שנבחר.",
  },
};

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

type CalendarEventsResponse = {
  items: CalendarEvent[];
};

type RangePreset = "today" | "7d" | "30d";

const RANGE_HOURS: Record<RangePreset, number> = {
  today: 24,
  "7d": 24 * 7,
  "30d": 24 * 30,
};

const RANGE_PRESET_BUTTONS: RangePreset[] = ["today", "7d", "30d"];

function formatDateTime(value: string): string {
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

function getScheduleIssueStatusPreset(eventType: string) {
  return eventType.trim().toLowerCase() === "service" ? "BLOCKED" : null;
}

function getScheduleIssueSearchPreset(eventType: string, title: string) {
  return eventType.trim().toLowerCase() === "service" ? title : null;
}

export default function InstallerSchedulePage() {
  const { locale, t } = useI18n();
  const tt = (key: string) => scheduleOverrides[locale]?.[key] ?? t(key);
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
    setPreset(rawPreset === "today" || rawPreset === "7d" || rawPreset === "30d" ? rawPreset : "7d");
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
    const ends = new Date(starts.getTime() + RANGE_HOURS[preset] * 60 * 60 * 1000);
    return {
      startsAt: starts.toISOString(),
      endsAt: ends.toISOString(),
    };
  }, [anchor, preset]);

  const eventsQuery = useQuery({
    queryKey: ["installer-schedule-events", range.startsAt, range.endsAt],
    queryFn: () =>
      apiFetch<CalendarEventsResponse>(
        `/api/v1/installer/calendar/events?starts_at=${encodeURIComponent(
          range.startsAt
        )}&ends_at=${encodeURIComponent(range.endsAt)}`
      ),
    refetchInterval: 30_000,
  });

  const events = eventsQuery.data?.items || [];
  const eventTypeOptions = useMemo(() => {
    const unique = Array.from(new Set(events.map((event) => event.event_type))).sort();
    if (eventTypeFilter !== "ALL" && !unique.includes(eventTypeFilter)) {
      return [eventTypeFilter, ...unique];
    }
    return unique;
  }, [eventTypeFilter, events]);

  const projectOptions = useMemo(() => {
    const unique = Array.from(
      new Set(events.map((event) => event.project_id).filter(Boolean) as string[])
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
      const matchesProject = projectFilter === "ALL"
        ? true
        : projectFilter === "NONE"
        ? !event.project_id
        : event.project_id === projectFilter;
      const matchesOverdue = !overdueOnly || new Date(event.ends_at) < now;
      return matchesEventType && matchesProject && matchesOverdue;
    });
  }, [eventTypeFilter, events, nowIso, overdueOnly, projectFilter]);

  return (
    <div className="motion-stagger space-y-6">
      <section className="page-hero relative overflow-hidden">
        <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_top_right,hsl(var(--accent)/0.18),transparent_62%)] lg:block" />
        <div className="relative z-10 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="page-eyebrow">{t("installerSchedule.eyebrow")}</div>
            <h1 className="mt-3 font-display text-3xl tracking-[-0.04em] text-foreground sm:text-4xl">
              {t("installerSchedule.title")}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[15px]">
              {t("installerSchedule.subtitle")}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="metric-chip">{tt("installerSchedule.eventsMetric").replace("{count}", String(events.length))}</span>
              <span className="metric-chip">{tt("installerSchedule.visibleMetric").replace("{count}", String(filteredEvents.length))}</span>
              <span className="metric-chip">{tt("installerSchedule.presetMetric").replace("{preset}", preset.toUpperCase())}</span>
              <span className="metric-chip">
                {overdueOnly ? t("installerSchedule.overdueFocus") : t("installerSchedule.mixedQueue")}
              </span>
            </div>
          </div>
          <div className="surface-subtle max-w-3xl space-y-4 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div
                role="group"
                aria-label="Quick range"
                className="inline-flex items-center gap-1 rounded-xl border border-border/70 bg-background/70 p-1"
              >
            {RANGE_PRESET_BUTTONS.map((item) => {
              const active = preset === item;
              return (
                <button
                  key={item}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setPreset(item)}
                  className={
                    active
                      ? "rounded-md bg-accent px-2.5 py-1.5 text-xs font-medium text-accent-foreground"
                      : "rounded-md px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  }
                >
                  {rangePresetLabels[item]}
                </button>
              );
            })}
              </div>
              <button
                type="button"
                aria-pressed={overdueOnly}
                onClick={() => setOverdueOnly((prev) => !prev)}
                className={
                  overdueOnly
                    ? "rounded-xl border border-border bg-accent px-3 py-2 text-xs font-medium text-accent-foreground"
                    : "rounded-xl border border-border/70 bg-background/75 px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                }
              >
                {t("installerSchedule.overdueOnly")}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <span>{t("installerSchedule.eventType")}</span>
            <select
              aria-label={t("installerSchedule.eventType")}
              value={eventTypeFilter}
              onChange={(event) => setEventTypeFilter(event.target.value || "ALL")}
              className="h-10 rounded-xl border border-border/70 bg-background/80 px-2 text-sm text-foreground"
            >
              <option value="ALL">{t("installerSchedule.allTypes")}</option>
              {eventTypeOptions.map((eventType) => (
                <option key={eventType} value={eventType}>
                  {eventType}
                </option>
              ))}
            </select>
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <span>{t("common.project")}</span>
            <select
              aria-label={t("common.project")}
              value={projectFilter}
              onChange={(event) => setProjectFilter(event.target.value)}
              className="h-10 rounded-xl border border-border/70 bg-background/80 px-2 text-sm text-foreground"
            >
              <option value="ALL">{t("installerSchedule.allProjects")}</option>
              <option value="NONE">{t("installerSchedule.noProject")}</option>
              {projectOptions.map((projectId) => (
                <option key={projectId} value={projectId}>
                  {projectId}
                </option>
              ))}
            </select>
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <span>{t("installerSchedule.range")}</span>
            <select
              aria-label={t("installerSchedule.range")}
              value={preset}
              onChange={(event) => setPreset(event.target.value as RangePreset)}
              className="h-10 rounded-xl border border-border/70 bg-background/80 px-2 text-sm text-foreground"
            >
              <option value="today">{t("common.today")}</option>
              <option value="7d">{t("installerSchedule.next7Days")}</option>
              <option value="30d">{t("installerSchedule.next30Days")}</option>
            </select>
              </label>
              <button
                type="button"
                onClick={() => void eventsQuery.refetch()}
                className="btn-premium rounded-xl px-4 py-2 text-sm font-medium"
              >
                <RefreshCcw className="h-4 w-4" />
                {t("common.refresh")}
              </button>
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-background/75 px-3 py-2 text-sm transition-colors hover:bg-muted"
              >
                {t("installerSchedule.resetFilters")}
              </button>
              <button
                type="button"
                onClick={() =>
                  downloadScheduleCsv(
                    buildScheduleCsv(filteredEvents),
                    scheduleExportFilename()
                  )
                }
                disabled={filteredEvents.length === 0}
                className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-background/75 px-3 py-2 text-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
              >
                {t("installerSchedule.exportCsv")}
              </button>
            </div>
          </div>
        </div>
      </section>

      {eventsQuery.isError && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[hsl(var(--destructive)/0.35)] bg-[hsl(var(--destructive)/0.08)] px-4 py-3 text-sm text-[hsl(var(--destructive))]">
          <span>{t("installerSchedule.error")}</span>
          <button
            type="button"
            onClick={() => void eventsQuery.refetch()}
            className="inline-flex items-center rounded-lg border border-[hsl(var(--destructive)/0.35)] bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            {t("common.retry")}
          </button>
        </div>
      )}

      {eventsQuery.isLoading && (
        <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          {tt("installerSchedule.loading")}
        </div>
      )}

      {!eventsQuery.isLoading && events.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          {tt("installerSchedule.emptySelectedRange")}
        </div>
      )}
      {!eventsQuery.isLoading && events.length > 0 && filteredEvents.length === 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          <span>{t("installerSchedule.noEventsForFilters")}</span>
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center rounded-lg border border-border bg-background px-3 py-1.5 text-xs transition-colors hover:bg-muted"
          >
                {t("installerSchedule.resetFilters")}
          </button>
        </div>
      )}

      <div className="space-y-3">
        {filteredEvents.map((event) => (
          <div key={event.id} className="surface-panel">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="font-medium">{event.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">{event.event_type}</div>
              </div>
              <div className="text-xs text-muted-foreground">
                {formatDateTime(event.starts_at)} - {formatDateTime(event.ends_at)}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-md border border-border px-2 py-1 text-foreground">
                {event.project_id ? `${t("installerSchedule.projectPrefix")} ${event.project_id}` : t("installerSchedule.noProject")}
              </span>
              {event.project_id && (
                <>
                  <Link
                    href={`/installer/projects/${event.project_id}#project-doors`}
                    className="inline-flex items-center rounded-lg border border-border bg-background px-2.5 py-1 transition-colors hover:bg-muted"
                  >
                    Priority doors
                  </Link>
                  <Link
                    href={buildInstallerIssuesHref(event.project_id, {
                      issueStatus: getScheduleIssueStatusPreset(event.event_type),
                      issueSearch: getScheduleIssueSearchPreset(event.event_type, event.title),
                    })}
                    className="inline-flex items-center rounded-lg border border-border bg-background px-2.5 py-1 transition-colors hover:bg-muted"
                  >
                    Open issues
                  </Link>
                </>
              )}
            </div>

            {event.location && (
              <div className="mt-2 text-sm text-muted-foreground">{event.location}</div>
            )}
            {event.description && (
              <div className="mt-1 text-sm text-muted-foreground">{event.description}</div>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              {event.project_id && (
                <Link
                  href={`/installer/projects/${event.project_id}`}
                  className="inline-flex items-center rounded-lg border border-border bg-background px-3 py-1.5 text-xs transition-colors hover:bg-muted"
                >
                  Open project
                </Link>
              )}
              {event.waze_url && (
                <a
                  href={event.waze_url}
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
      </div>
    </div>
  );
}
