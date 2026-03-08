"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCcw } from "lucide-react";

import { apiFetch } from "@/lib/api";
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

type CalendarEventsResponse = {
  items: CalendarEvent[];
};

type RangePreset = "today" | "7d" | "30d";

const RANGE_HOURS: Record<RangePreset, number> = {
  today: 24,
  "7d": 24 * 7,
  "30d": 24 * 30,
};

const RANGE_PRESET_BUTTONS: Array<{ value: RangePreset; label: string }> = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Next 7 days" },
  { value: "30d", label: "Next 30 days" },
];

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

export default function InstallerSchedulePage() {
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Schedule</h1>
          <p className="text-sm text-muted-foreground">
            Installer events and planned visits for the selected period.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Quick range"
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-card p-1"
          >
            {RANGE_PRESET_BUTTONS.map((item) => {
              const active = preset === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setPreset(item.value)}
                  className={
                    active
                      ? "rounded-md bg-accent px-2.5 py-1.5 text-xs font-medium text-accent-foreground"
                      : "rounded-md px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  }
                >
                  {item.label}
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
                ? "rounded-lg border border-border bg-accent px-3 py-2 text-xs font-medium text-accent-foreground"
                : "rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            }
          >
            Overdue only
          </button>
          <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <span>Event type</span>
            <select
              aria-label="Event type"
              value={eventTypeFilter}
              onChange={(event) => setEventTypeFilter(event.target.value || "ALL")}
              className="h-9 rounded-lg border border-border bg-card px-2 text-sm text-foreground"
            >
              <option value="ALL">All types</option>
              {eventTypeOptions.map((eventType) => (
                <option key={eventType} value={eventType}>
                  {eventType}
                </option>
              ))}
            </select>
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <span>Project</span>
            <select
              aria-label="Project"
              value={projectFilter}
              onChange={(event) => setProjectFilter(event.target.value)}
              className="h-9 rounded-lg border border-border bg-card px-2 text-sm text-foreground"
            >
              <option value="ALL">All projects</option>
              <option value="NONE">No project</option>
              {projectOptions.map((projectId) => (
                <option key={projectId} value={projectId}>
                  {projectId}
                </option>
              ))}
            </select>
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <span>Range</span>
            <select
              aria-label="Range"
              value={preset}
              onChange={(event) => setPreset(event.target.value as RangePreset)}
              className="h-9 rounded-lg border border-border bg-card px-2 text-sm text-foreground"
            >
              <option value="today">Today</option>
              <option value="7d">Next 7 days</option>
              <option value="30d">Next 30 days</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => void eventsQuery.refetch()}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm transition-colors hover:bg-muted"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </button>
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm transition-colors hover:bg-muted"
          >
            Reset filters
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
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            Export CSV
          </button>
        </div>
      </div>

      {eventsQuery.isError && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[hsl(var(--destructive)/0.35)] bg-[hsl(var(--destructive)/0.08)] px-4 py-3 text-sm text-[hsl(var(--destructive))]">
          <span>Failed to load installer schedule.</span>
          <button
            type="button"
            onClick={() => void eventsQuery.refetch()}
            className="inline-flex items-center rounded-lg border border-[hsl(var(--destructive)/0.35)] bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            Retry
          </button>
        </div>
      )}

      {eventsQuery.isLoading && (
        <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          Loading schedule...
        </div>
      )}

      {!eventsQuery.isLoading && events.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          No events in selected range.
        </div>
      )}
      {!eventsQuery.isLoading && events.length > 0 && filteredEvents.length === 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          <span>No events match current filters.</span>
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center rounded-lg border border-border bg-background px-3 py-1.5 text-xs transition-colors hover:bg-muted"
          >
            Reset filters
          </button>
        </div>
      )}

      <div className="space-y-3">
        {filteredEvents.map((event) => (
          <div key={event.id} className="rounded-xl border border-border bg-card p-4">
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
                {event.project_id ? `Project ${event.project_id}` : "No project"}
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
