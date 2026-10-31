import { useMemo } from "react";
import { entityKey } from "@/components/dimax";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  Printer,
  Search,
  SlidersHorizontal,
} from "lucide-react";

import { cn } from "@/lib/utils";

export type ScheduleEventType =
  | "installation"
  | "delivery"
  | "meeting"
  | "consultation"
  | "inspection";

export type ScheduleEvent = {
  id: string;
  title: string;
  event_type: ScheduleEventType;
  starts_at: string;
  ends_at: string;
  location: string | null;
  waze_url: string | null;
  description: string | null;
  project_id: string | null;
  installer_ids: string[];
  isAtRisk?: boolean;
  /** Shares an installer with another event at the same time (double booking). */
  isDoubleBooked?: boolean;
};

export type ScheduleInstaller = {
  id: string;
  full_name: string;
};

export type ScheduleProject = {
  id: string;
  name: string;
};

export type ScheduleCrew = {
  id: string;
  title: string;
  initials: string;
  eventsCount: number;
  busyDays: number;
  tone: "a" | "b" | "c" | "u";
  unassigned?: boolean;
};

type CalendarViewMode = "day" | "week" | "month";
type Locale = "en" | "ru" | "he";
type Copy = (en: string, ru: string, he: string) => string;

type EventLayout = {
  event: ScheduleEvent;
  column: number;
  columnCount: number;
  top: number;
  height: number;
};

type Props = {
  locale: Locale;
  copy: Copy;
  periodStartDate: Date;
  periodEndDate: Date;
  calendarDays: Date[];
  calendarView: CalendarViewMode;
  events: ScheduleEvent[];
  installers: ScheduleInstaller[];
  projects: ScheduleProject[];
  crews: ScheduleCrew[];
  selectedEventId: string | null;
  enabledEventTypes: ScheduleEventType[];
  installerFilter: string;
  projectFilter: string;
  searchQuery: string;
  areFiltersOpen: boolean;
  canManageCalendar: boolean;
  privilegedActionHint?: string;
  isLoading: boolean;
  eventTypeLabel: (eventType: ScheduleEventType) => string;
  laneLoadLabel: (crewId: string) => string;
  onAddEvent: () => void;
  onMovePeriod: (direction: -1 | 1) => void;
  onToday: () => void;
  onChangeView: (viewMode: CalendarViewMode) => void;
  onSelectDate: (date: Date, viewMode?: CalendarViewMode) => void;
  onToggleEventType: (eventType: ScheduleEventType) => void;
  onSelectEvent: (event: ScheduleEvent) => void;
  onSelectCrew: (crewId: string) => void;
  onSearchChange: (value: string) => void;
  onInstallerFilterChange: (value: string) => void;
  onProjectFilterChange: (value: string) => void;
  onToggleFilters: () => void;
  onExport: () => void;
  onPrint: () => void;
};

const START_HOUR = 7;
const END_HOUR = 19;
const HOUR_HEIGHT = 72;
const BODY_HEIGHT = (END_HOUR - START_HOUR) * HOUR_HEIGHT;

const EVENT_TYPES: ScheduleEventType[] = [
  "installation",
  "delivery",
  "meeting",
  "consultation",
  "inspection",
];

// Event colours come from the --dmx-event-* tokens (light and dark sets in index.css).
const EVENT_STYLE: Record<ScheduleEventType, string> = {
  installation: "border-event-installation-border bg-event-installation-bg text-event-installation-fg",
  delivery: "border-event-delivery-border bg-event-delivery-bg text-event-delivery-fg",
  meeting: "border-event-meeting-border bg-event-meeting-bg text-event-meeting-fg",
  consultation: "border-event-consultation-border bg-event-consultation-bg text-event-consultation-fg",
  inspection: "border-event-inspection-border bg-event-inspection-bg text-event-inspection-fg",
};

const EVENT_DOT: Record<ScheduleEventType, string> = {
  installation: "bg-event-installation-dot",
  delivery: "bg-event-delivery-dot",
  meeting: "bg-event-meeting-dot",
  consultation: "bg-event-consultation-dot",
  inspection: "bg-event-inspection-dot",
};

const AVATAR_STYLE = [
  "bg-event-meeting-fg text-text-inverse",
  "bg-event-installation-fg text-text-inverse",
  "bg-event-consultation-fg text-text-inverse",
  "bg-event-delivery-fg text-text-inverse",
];

function startOfWeek(base: Date): Date {
  const date = new Date(base);
  const weekday = date.getDay();
  date.setDate(date.getDate() + (weekday === 0 ? -6 : 1 - weekday));
  date.setHours(0, 0, 0, 0);
  return date;
}

function monthGridDays(base: Date): Date[] {
  const first = new Date(base.getFullYear(), base.getMonth(), 1);
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function dayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function eventDayKey(value: string): string {
  return dayKey(new Date(value));
}

function timeLabel(value: string): string {
  const date = new Date(value);
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;
}

function hourLabel(hour: number, locale: Locale): string {
  const date = new Date(2026, 0, 1, hour, 0, 0);
  return new Intl.DateTimeFormat(
    locale === "he" ? "he-IL" : locale === "ru" ? "ru-RU" : "en-US",
    { hour: "2-digit", minute: "2-digit", hour12: locale === "en" },
  ).format(date);
}

function initials(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "--";
}

function minuteOfDay(value: string): number {
  const date = new Date(value);
  return date.getHours() * 60 + date.getMinutes();
}

function layoutDayEvents(events: ScheduleEvent[]): EventLayout[] {
  const dayStart = START_HOUR * 60;
  const dayEnd = END_HOUR * 60;
  const occupiedUntil: number[] = [];
  const layouts = [...events]
    .sort((left, right) => left.starts_at.localeCompare(right.starts_at))
    .map((event) => {
      const rawStart = minuteOfDay(event.starts_at);
      const rawEnd = Math.max(rawStart + 30, minuteOfDay(event.ends_at));
      const start = Math.min(dayEnd - 30, Math.max(dayStart, rawStart));
      const end = Math.min(dayEnd, Math.max(start + 30, rawEnd));
      let column = occupiedUntil.findIndex((occupied) => occupied <= start);
      if (column === -1) {
        column = occupiedUntil.length;
      }
      occupiedUntil[column] = end;
      return {
        event,
        column,
        columnCount: 1,
        top: ((start - dayStart) / 60) * HOUR_HEIGHT,
        height: Math.max(54, ((end - start) / 60) * HOUR_HEIGHT - 8),
      };
    });
  const columnCount = Math.max(1, occupiedUntil.length);
  return layouts.map((layout) => ({ ...layout, columnCount }));
}

function isSameDay(left: Date, right: Date): boolean {
  return dayKey(left) === dayKey(right);
}

function EventAvatars({
  event,
  installersById,
}: {
  event: ScheduleEvent;
  installersById: Map<string, ScheduleInstaller>;
}) {
  const people = event.installer_ids
    .map((id) => installersById.get(id))
    .filter((item): item is ScheduleInstaller => Boolean(item))
    .slice(0, 3);

  if (people.length === 0) {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-border-strong text-[9px] font-semibold text-text-secondary">
        --
      </span>
    );
  }

  return (
    <span className="flex -space-x-1.5 rtl:space-x-reverse">
      {people.map((person, index) => (
        <span
          key={person.id}
          title={person.full_name}
          data-entity={entityKey("installer", person.id)}
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-[9px] font-semibold",
            AVATAR_STYLE[index % AVATAR_STYLE.length],
          )}
        >
          {initials(person.full_name)}
        </span>
      ))}
    </span>
  );
}

export function CalendarScheduleSurface(props: Props) {
  const {
    locale,
    copy,
    periodStartDate,
    periodEndDate,
    calendarDays,
    calendarView,
    events,
    installers,
    projects,
    crews,
    selectedEventId,
    enabledEventTypes,
    installerFilter,
    projectFilter,
    searchQuery,
    areFiltersOpen,
    canManageCalendar,
    privilegedActionHint,
    isLoading,
    eventTypeLabel,
    laneLoadLabel,
    onAddEvent,
    onMovePeriod,
    onToday,
    onChangeView,
    onSelectDate,
    onToggleEventType,
    onSelectEvent,
    onSelectCrew,
    onSearchChange,
    onInstallerFilterChange,
    onProjectFilterChange,
    onToggleFilters,
    onExport,
    onPrint,
  } = props;
  const localeTag = locale === "he" ? "he-IL" : locale === "ru" ? "ru-RU" : "en-US";
  const now = new Date();
  const displayMonthDate =
    calendarView === "week" && calendarDays.length > 0
      ? calendarDays[Math.floor(calendarDays.length / 2)]
      : periodStartDate;
  const selectedMiniDate =
    calendarDays.find((date) => isSameDay(date, now)) || periodStartDate;
  const monthTitle = new Intl.DateTimeFormat(localeTag, {
    month: "long",
    year: "numeric",
  }).format(displayMonthDate);
  const periodLabel = (() => {
    const endInclusive = new Date(periodEndDate);
    endInclusive.setDate(endInclusive.getDate() - 1);
    const formatter = new Intl.DateTimeFormat(localeTag, {
      month: "short",
      day: "numeric",
    });
    return `${formatter.format(periodStartDate)} - ${formatter.format(endInclusive)}`;
  })();
  const miniDays = useMemo(() => monthGridDays(displayMonthDate), [displayMonthDate]);
  const installersById = useMemo(
    () => new Map(installers.map((installer) => [installer.id, installer])),
    [installers],
  );
  const projectsById = useMemo(
    () => new Map(projects.map((project) => [project.id, project])),
    [projects],
  );
  const eventsByDay = useMemo(() => {
    const map = new Map<string, ScheduleEvent[]>();
    for (const event of events) {
      const key = eventDayKey(event.starts_at);
      map.set(key, [...(map.get(key) || []), event]);
    }
    return map;
  }, [events]);
  const hours = useMemo(
    () =>
      Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, index) => START_HOUR + index),
    [],
  );
  const miniWeekdays = useMemo(() => {
    const monday = new Date(2026, 0, 5);
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      return new Intl.DateTimeFormat(localeTag, { weekday: "short" }).format(date);
    });
  }, [localeTag]);
  const currentOffset = -periodStartDate.getTimezoneOffset() / 60;
  const timezoneLabel = `GMT${currentOffset >= 0 ? "+" : ""}${currentOffset}`;
  const currentTimeTop =
    ((now.getHours() * 60 + now.getMinutes() - START_HOUR * 60) / 60) * HOUR_HEIGHT;
  const showCurrentTime = currentTimeTop >= 0 && currentTimeTop <= BODY_HEIGHT;
  const activeFilterCount =
    (installerFilter !== "all" ? 1 : 0) +
    (projectFilter !== "all" ? 1 : 0) +
    (enabledEventTypes.length !== EVENT_TYPES.length ? 1 : 0);

  const renderEvent = (layout: EventLayout) => {
    const { event } = layout;
    const project = projectsById.get(event.project_id || "");
    // Overlapping events are stacked with an offset (each nearly full width, the later one on top) instead of being
    // squeezed into side-by-side slivers; only a deep stack falls back to the compact card.
    const offset = layout.columnCount > 1 ? Math.min(28, 60 / (layout.columnCount - 1)) : 0;
    const leftPct = layout.column * offset;
    const widthPct = 100 - leftPct;
    const narrow = widthPct < 45;
    return (
      <button
        type="button"
        data-testid="calendar-event-card"
        key={event.id}
        onClick={() => onSelectEvent(event)}
        aria-label={`${event.title}, ${timeLabel(event.starts_at)} - ${timeLabel(event.ends_at)}`}
        title={[
          event.title,
          `${eventTypeLabel(event.event_type)} · ${timeLabel(event.starts_at)} - ${timeLabel(event.ends_at)}`,
          project?.name || event.location || copy("No project", "Без проекта", "ללא פרויקט"),
          event.installer_ids.map((id) => installersById.get(id)?.full_name).filter(Boolean).join(", "),
          event.isDoubleBooked ? copy("Crew double-booked", "Бригада занята дважды", "הצוות משובץ פעמיים") : "",
        ].filter(Boolean).join(String.fromCharCode(10))}
        className={cn(
          "absolute z-10 overflow-hidden rounded-[7px] border-s-[3px] py-2 text-start shadow-[0_4px_14px_rgba(25,35,50,0.07)]",
          narrow ? "px-1.5" : "px-2.5",
          "motion-safe:transition-[box-shadow,transform] motion-safe:duration-150 motion-safe:hover:-translate-y-0.5 hover:shadow-[0_8px_22px_rgba(25,35,50,0.12)]",
          EVENT_STYLE[event.event_type],
          event.isAtRisk && "border-status-problem-border bg-status-problem-bg text-status-problem-fg",
          event.isDoubleBooked && "border-status-warning-border",
          selectedEventId === event.id && "ring-2 ring-text ring-offset-1",
        )}
        style={{
          top: `${layout.top + 4}px`,
          height: `${layout.height}px`,
          left: `calc(${leftPct}% + 5px)`,
          width: `calc(${widthPct}% - 9px)`,
          zIndex: 10 + layout.column,
        }}
      >
        <div className="mb-1.5 flex items-center justify-between gap-1">
          <EventAvatars event={event} installersById={installersById} />
          {narrow ? (
            event.isDoubleBooked ? (
              <span data-testid="calendar-double-booked" aria-label={copy("Crew double-booked", "Бригада занята дважды", "הצוות משובץ פעמיים")}
                className="rounded-full bg-status-warning-bg px-1 text-11 font-bold leading-4 text-status-warning-fg">×2</span>
            ) : null
          ) : (
            <span className="truncate text-[9px] font-semibold uppercase opacity-65">
              {eventTypeLabel(event.event_type)}
            </span>
          )}
        </div>
        <div className={cn("text-[12px] font-semibold leading-4", narrow ? "line-clamp-4 break-words [overflow-wrap:anywhere]" : "truncate")}>{event.title}</div>
        {event.isDoubleBooked && !narrow ? (
          <div data-testid="calendar-double-booked" className="mt-0.5 truncate text-11 font-semibold leading-4 text-status-warning-fg">
            {copy("Crew double-booked", "Бригада занята дважды", "הצוות משובץ פעמיים")}
          </div>
        ) : null}
        {narrow ? null : (
          <>
            <div className="mt-0.5 truncate text-[10px] leading-4 opacity-75">
              {project?.name || event.location || copy("No project", "Без проекта", "ללא פרויקט")}
            </div>
            <div className="mt-1 text-[10px] font-medium tabular-nums opacity-70">
              {timeLabel(event.starts_at)} - {timeLabel(event.ends_at)}
            </div>
          </>
        )}
      </button>
    );
  };

  return (
    <section className="dmx-calendar overflow-hidden rounded-lg border border-border bg-surface-subtle">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2.5">
          <h2 className="min-w-0 text-18 font-semibold capitalize text-text">
            {monthTitle}
          </h2>
          <CalendarDays aria-hidden="true" className="h-5 w-5 text-text-secondary" />
          <button
            type="button"
            onClick={() => onMovePeriod(-1)}
            aria-label={copy("Previous period", "Предыдущий период", "התקופה הקודמת")}
            title={copy("Previous period", "Предыдущий период", "התקופה הקודמת")}
            className="ms-1 flex h-9 w-9 items-center justify-center rounded-md text-text-secondary hover:bg-surface hover:text-text"
          >
            <ChevronLeft aria-hidden="true" className="h-4 w-4 rtl:rotate-180" />
          </button>
          <button
            type="button"
            onClick={onToday}
            className="h-9 rounded-md px-2.5 text-[13px] font-semibold text-text hover:bg-surface"
          >
            {copy("Today", "Сегодня", "היום")}
          </button>
          <button
            type="button"
            onClick={() => onMovePeriod(1)}
            aria-label={copy("Next period", "Следующий период", "התקופה הבאה")}
            title={copy("Next period", "Следующий период", "התקופה הבאה")}
            className="flex h-9 w-9 items-center justify-center rounded-md text-text-secondary hover:bg-surface hover:text-text"
          >
            <ChevronRight aria-hidden="true" className="h-4 w-4 rtl:rotate-180" />
          </button>
          <span className="hidden text-[12px] font-medium tabular-nums text-text-secondary xl:inline">
            {periodLabel}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onAddEvent}
            disabled={!canManageCalendar}
            title={privilegedActionHint}
            className="dmx-primary-action min-h-10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            {copy("Add Event", "Добавить событие", "הוסף אירוע")}
          </button>
          <div className="inline-flex h-9 items-center rounded-md border border-border bg-surface p-0.5">
            {(["day", "week", "month"] as CalendarViewMode[]).map((viewMode) => (
              <button
                key={viewMode}
                type="button"
                onClick={() => onChangeView(viewMode)}
                aria-pressed={calendarView === viewMode}
                className={cn(
                  "h-8 rounded-[5px] px-3 text-[11px] font-semibold transition-colors duration-150",
                  calendarView === viewMode
                    ? "bg-text text-white"
                    : "text-text-secondary hover:bg-surface-sunken hover:text-text",
                )}
              >
                {viewMode === "day"
                  ? copy("Day", "День", "יום")
                  : viewMode === "month"
                    ? copy("Month", "Месяц", "חודש")
                    : copy("Week", "Неделя", "שבוע")}
              </button>
            ))}
          </div>
          <label className="flex h-10 min-w-[120px] flex-1 items-center gap-2 rounded-lg border border-border bg-surface px-3 focus-within:border-border-strong lg:w-[180px] lg:flex-none">
            <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-text-secondary" />
            <span className="sr-only">{copy("Search schedule", "Поиск в календаре", "חיפוש ביומן")}</span>
            <input
              type="search"
              name="calendar-search"
              autoComplete="off"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={copy("Search…", "Поиск…", "חיפוש…")}
              className="min-w-0 flex-1 bg-transparent text-[12px] text-text outline-none placeholder:text-text-tertiary"
            />
          </label>
          <button
            type="button"
            onClick={onExport}
            aria-label={copy("Export schedule", "Экспорт графика", "ייצוא לוח")}
            title={copy("Export schedule", "Экспорт графика", "ייצוא לוח")}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface text-text-secondary hover:border-border-strong hover:text-text"
          >
            <Download aria-hidden="true" className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onPrint}
            aria-label={copy("Print schedule", "Печать графика", "הדפס לוח")}
            title={copy("Print schedule", "Печать графика", "הדפס לוח")}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface text-text-secondary hover:border-border-strong hover:text-text"
          >
            <Printer aria-hidden="true" className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onToggleFilters}
            aria-expanded={areFiltersOpen}
            aria-label={copy("Calendar filters", "Фильтры календаря", "מסנני יומן")}
            title={copy("Calendar filters", "Фильтры календаря", "מסנני יומן")}
            className={cn(
              "relative flex h-10 w-10 items-center justify-center rounded-lg border bg-surface hover:border-border-strong",
              areFiltersOpen || activeFilterCount > 0
                ? "border-accent text-status-warning-fg"
                : "border-border text-text-secondary",
            )}
          >
            <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
            {activeFilterCount > 0 ? (
              <span className="absolute -end-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-text px-1 text-[9px] font-semibold text-white">
                {activeFilterCount}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      {areFiltersOpen ? (
        <div className="grid gap-3 border-b border-border bg-surface px-4 py-3 md:grid-cols-2">
          <label className="space-y-1 text-[11px] font-semibold text-text-secondary">
            <span>{copy("Installer", "Монтажник", "מתקין")}</span>
            <select
              aria-label={copy("Installer filter", "Фильтр монтажника", "מסנן מתקין")}
              value={installerFilter}
              onChange={(event) => onInstallerFilterChange(event.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-[12px] font-medium text-text"
            >
              <option value="all">{copy("All installers", "Все монтажники", "כל המתקינים")}</option>
              {installers.map((installer) => (
                <option key={installer.id} value={installer.id}>{installer.full_name}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-[11px] font-semibold text-text-secondary">
            <span>{copy("Project", "Проект", "פרויקט")}</span>
            <select
              aria-label={copy("Project filter", "Фильтр проекта", "מסנן פרויקט")}
              value={projectFilter}
              onChange={(event) => onProjectFilterChange(event.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-[12px] font-medium text-text"
            >
              <option value="all">{copy("All projects", "Все проекты", "כל הפרויקטים")}</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      <div className="dmx-calendar-layout">
        <aside className="dmx-calendar-sidebar space-y-4 border-border bg-surface-sunken p-3">
          <div className="rounded-lg border border-border bg-surface p-4 shadow-[0_4px_14px_rgba(29,38,53,0.04)]">
            <div className="mb-4 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() =>
                  onSelectDate(
                    new Date(
                      displayMonthDate.getFullYear(),
                      displayMonthDate.getMonth() - 1,
                      1,
                    ),
                  )
                }
                aria-label={copy("Previous month", "Предыдущий месяц", "החודש הקודם")}
                title={copy("Previous month", "Предыдущий месяц", "החודש הקודם")}
                className="flex h-8 w-8 items-center justify-center rounded-md text-text-secondary hover:bg-surface-sunken hover:text-text"
              >
                <ChevronLeft aria-hidden="true" className="h-4 w-4 rtl:rotate-180" />
              </button>
              <div className="text-[13px] font-semibold capitalize text-text">{monthTitle}</div>
              <button
                type="button"
                onClick={() =>
                  onSelectDate(
                    new Date(
                      displayMonthDate.getFullYear(),
                      displayMonthDate.getMonth() + 1,
                      1,
                    ),
                  )
                }
                aria-label={copy("Next month", "Следующий месяц", "החודש הבא")}
                title={copy("Next month", "Следующий месяц", "החודש הבא")}
                className="flex h-8 w-8 items-center justify-center rounded-md text-text-secondary hover:bg-surface-sunken hover:text-text"
              >
                <ChevronRight aria-hidden="true" className="h-4 w-4 rtl:rotate-180" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-y-1 text-center">
              {miniWeekdays.map((weekday, index) => (
                <div key={`${weekday}-${index}`} className="pb-1 text-[10px] font-medium text-text-secondary">
                  {weekday.replace(".", "")}
                </div>
              ))}
              {miniDays.map((date) => {
                const isCurrentMonth = date.getMonth() === displayMonthDate.getMonth();
                const isSelected = isSameDay(selectedMiniDate, date);
                const isToday = isSameDay(date, now);
                return (
                  <button
                    type="button"
                    key={dayKey(date)}
                    onClick={() => onSelectDate(date)}
                    aria-label={new Intl.DateTimeFormat(localeTag, { dateStyle: "full" }).format(date)}
                    aria-current={isToday ? "date" : undefined}
                    className={cn(
                      "mx-auto flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-medium tabular-nums",
                      !isCurrentMonth && "text-text-tertiary",
                      isCurrentMonth && "text-text hover:bg-surface-sunken",
                      isSelected && "bg-text text-white hover:bg-text",
                      isToday && !isSelected && "ring-1 ring-accent",
                    )}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface p-4 shadow-[0_4px_14px_rgba(29,38,53,0.04)]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[13px] font-semibold text-text">
                {copy("My Schedule", "Моё расписание", "לוח הזמנים שלי")}
              </h2>
            </div>
            <div className="space-y-1">
              {EVENT_TYPES.map((eventType) => {
                const enabled = enabledEventTypes.includes(eventType);
                return (
                  <label
                    key={eventType}
                    className="flex min-h-10 cursor-pointer items-center gap-3 rounded-md px-2 hover:bg-surface-subtle"
                  >
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={() => onToggleEventType(eventType)}
                      className="peer sr-only"
                    />
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] border peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--dmx-link)]",
                        enabled
                          ? "border-event-meeting-fg bg-event-meeting-fg text-white"
                          : "border-border-strong bg-surface text-transparent",
                      )}
                    >
                      <Check aria-hidden="true" className="h-3.5 w-3.5" />
                    </span>
                    <span className={cn("h-3 w-3 rounded-full", EVENT_DOT[eventType])} />
                    <span className="text-[12px] font-medium text-text">
                      {eventTypeLabel(eventType)}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface p-4 shadow-[0_4px_14px_rgba(29,38,53,0.04)]">
            <div className="mb-3 text-[11px] font-semibold uppercase text-text-secondary">
              {copy("Crews", "Бригады", "צוותים")}
            </div>
            <div className="space-y-1.5">
              {crews.map((crew) => (
                <button
                  type="button"
                  data-testid="calendar-lane-row"
                  key={crew.id}
                  data-entity={crew.tone === "u" ? undefined : entityKey("installer", crew.id)}
                  onClick={() => onSelectCrew(crew.id)}
                  aria-label={copy(
                    `Open ${crew.title} schedule row`,
                    `Открыть строку расписания: ${crew.title}`,
                    `פתח שורת לוח: ${crew.title}`,
                  )}
                  className="flex w-full items-center gap-2.5 rounded-md border border-transparent px-2 py-2 text-start hover:border-border-strong hover:bg-surface-subtle"
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                      crew.tone === "a" && "bg-status-warning-bg text-status-warning-fg",
                      crew.tone === "b" && "bg-status-progress-bg text-status-progress-fg",
                      crew.tone === "c" && "bg-status-ok-bg text-status-ok-fg",
                      crew.tone === "u" && "bg-surface-sunken text-text-secondary",
                    )}
                  >
                    {crew.initials}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-[12px] font-semibold leading-4 text-text">
                      {crew.title}
                    </span>
                    <span className="mt-1 block break-words text-[11px] leading-4 text-text-secondary">
                      {laneLoadLabel(crew.id)}
                    </span>
                  </span>
                  <span className="shrink-0 text-[10px] font-semibold tabular-nums text-text-secondary">
                    {crew.busyDays} {copy("d", "дн.", "ימים")}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <div className="dmx-calendar-main min-w-0 bg-surface">
          {calendarView === "month" ? (
            <div className="overflow-x-auto">
              <div className="min-w-[640px]">
                <div className="grid grid-cols-7 border-b border-border bg-surface-subtle">
                  {miniWeekdays.map((weekday, index) => (
                    <div key={`${weekday}-${index}`} className="border-e border-border-subtle px-3 py-3 text-center text-[11px] font-semibold text-text-secondary last:border-e-0">
                      {weekday}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {miniDays.map((date) => {
                    const key = dayKey(date);
                    const dayEvents = eventsByDay.get(key) || [];
                    const isCurrentMonth = date.getMonth() === displayMonthDate.getMonth();
                    return (
                      <div key={key} className={cn("min-h-[132px] border-b border-e border-border-subtle p-2", !isCurrentMonth && "bg-surface-subtle") }>
                        <button
                          type="button"
                          onClick={() => onSelectDate(date, "day")}
                          aria-label={copy("Open day", "Открыть день", "פתיחת יום") + ": " + new Intl.DateTimeFormat(localeTag, { dateStyle: "long" }).format(date)}
                          className={cn(
                            "mb-1 flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums",
                            isSameDay(date, now) ? "bg-text text-white" : "text-text-secondary hover:bg-surface-sunken",
                          )}
                        >
                          {date.getDate()}
                        </button>
                        <div className="space-y-1">
                          {dayEvents.slice(0, 3).map((event) => (
                            <button
                              type="button"
                              key={event.id}
                              onClick={() => onSelectEvent(event)}
                              className={cn(
                                "block w-full truncate rounded-[5px] border-s-2 px-2 py-1 text-start text-[10px] font-semibold",
                                EVENT_STYLE[event.event_type],
                                event.isAtRisk && "border-status-problem-border bg-status-problem-bg text-status-problem-fg",
                              )}
                            >
                              {timeLabel(event.starts_at)} {event.title}
                            </button>
                          ))}
                          {dayEvents.length > 3 ? (
                            <button
                              type="button"
                              onClick={() => onSelectDate(date, "day")}
                              aria-label={copy("Show all events", "Показать все события", "הצגת כל האירועים") + ": " + new Intl.DateTimeFormat(localeTag, { dateStyle: "long" }).format(date)}
                              className="w-full rounded px-1 py-1 text-start text-[11px] font-medium text-event-meeting-fg hover:bg-event-meeting-bg"
                            >
                              +{dayEvents.length - 3} {copy("more", "ещё", "נוספים")}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="max-h-[760px] overflow-auto overscroll-contain">
              <div className={cn(calendarView === "day" ? "min-w-[280px]" : "min-w-[700px]") }>
                <div
                  className="sticky top-0 z-30 grid border-b border-border bg-surface"
                  style={{ gridTemplateColumns: `64px repeat(${calendarDays.length}, minmax(0, 1fr))` }}
                >
                  <div className="flex items-end justify-center pb-4 text-[10px] font-semibold text-text-secondary">
                    {timezoneLabel}
                  </div>
                  {calendarDays.map((date) => {
                    const key = dayKey(date);
                    const today = isSameDay(date, now);
                    return (
                      <button
                        type="button"
                        key={key}
                        onClick={() => onSelectDate(date)}
                        className={cn(
                          "border-s border-border px-2 py-4 text-center hover:bg-surface-subtle",
                          today && "bg-surface-subtle",
                        )}
                      >
                        <span className="block text-[10px] font-semibold uppercase text-text-secondary">
                          {new Intl.DateTimeFormat(localeTag, { weekday: "short" }).format(date).replace(".", "")}
                        </span>
                        <span className={cn("mt-1 inline-flex h-8 min-w-8 items-center justify-center rounded-full px-1 text-[20px] font-semibold tabular-nums", today ? "bg-text text-white" : "text-text") }>
                          {date.getDate()}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div
                  className="grid"
                  style={{ gridTemplateColumns: `64px repeat(${calendarDays.length}, minmax(0, 1fr))` }}
                >
                  <div className="relative bg-surface" style={{ height: `${BODY_HEIGHT}px` }}>
                    {hours.map((hour, index) => (
                      <span
                        key={hour}
                        className="absolute end-3 -translate-y-1/2 text-[10px] font-semibold tabular-nums text-text-secondary"
                        style={{ top: `${index === 0 ? 8 : index * HOUR_HEIGHT}px` }}
                      >
                        {hourLabel(hour, locale)}
                      </span>
                    ))}
                  </div>
                  {calendarDays.map((date) => {
                    const key = dayKey(date);
                    const layouts = layoutDayEvents(eventsByDay.get(key) || []);
                    const today = isSameDay(date, now);
                    return (
                      <div
                        key={key}
                        className={cn("relative border-s border-border", today && "bg-surface-subtle")}
                        style={{ height: `${BODY_HEIGHT}px` }}
                      >
                        {hours.map((hour, index) => (
                          <div
                            aria-hidden="true"
                            key={hour}
                            className="absolute inset-x-0 border-t border-border"
                            style={{ top: `${index * HOUR_HEIGHT}px` }}
                          />
                        ))}
                        {today && showCurrentTime ? (
                          <div className="pointer-events-none absolute inset-x-0 z-20 flex items-center" style={{ top: `${currentTimeTop}px` }}>
                            <span className="h-2 w-2 -translate-x-1 rounded-full bg-status-problem-fg" />
                            <span className="h-px flex-1 bg-status-problem-fg" />
                          </div>
                        ) : null}
                        {layouts.map(renderEvent)}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {!isLoading && events.length === 0 ? (
            <div className="border-t border-border bg-surface-subtle px-4 py-3 text-center text-[11px] text-text-secondary">
              {copy(
                "No events match the selected filters.",
                "Нет событий по выбранным фильтрам.",
                "אין אירועים התואמים למסננים שנבחרו.",
              )}
            </div>
          ) : null}
          {isLoading ? (
            <div aria-live="polite" className="border-t border-border bg-surface-subtle px-4 py-3 text-center text-[11px] text-text-secondary">
              {copy("Loading schedule…", "Загрузка расписания…", "טוען לוח זמנים…")}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
