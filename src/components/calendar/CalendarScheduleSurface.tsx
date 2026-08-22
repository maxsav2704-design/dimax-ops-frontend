import { useMemo } from "react";
import {
  CalendarDays,
  Check,
  ChevronDown,
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
  onSelectDate: (date: Date) => void;
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

const EVENT_STYLE: Record<ScheduleEventType, string> = {
  installation: "border-[#8fd5ad] bg-[#edf8f1] text-[#155c37]",
  delivery: "border-[#e3c675] bg-[#fff8e8] text-[#72530a]",
  meeting: "border-[#bcb1e2] bg-[#f2f0fa] text-[#4f3a85]",
  consultation: "border-[#dfb5a7] bg-[#fff1ed] text-[#7f493a]",
  inspection: "border-[#9dbfe9] bg-[#eef5ff] text-[#285b96]",
};

const EVENT_DOT: Record<ScheduleEventType, string> = {
  installation: "bg-[#9fd7b7]",
  delivery: "bg-[#dec887]",
  meeting: "bg-[#bdb5dc]",
  consultation: "bg-[#debeb3]",
  inspection: "bg-[#a8c6e9]",
};

const AVATAR_STYLE = [
  "bg-[#7457c8] text-white",
  "bg-[#3aa57c] text-white",
  "bg-[#c17354] text-white",
  "bg-[#c29a2f] text-white",
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
      <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-[#d9dce2] text-[9px] font-semibold text-[#667085]">
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
    const width = 100 / layout.columnCount;
    return (
      <button
        type="button"
        data-testid="calendar-event-card"
        key={event.id}
        onClick={() => onSelectEvent(event)}
        aria-label={`${event.title}, ${timeLabel(event.starts_at)} - ${timeLabel(event.ends_at)}`}
        className={cn(
          "absolute z-10 overflow-hidden rounded-[7px] border-s-[3px] px-2.5 py-2 text-start shadow-[0_4px_14px_rgba(25,35,50,0.07)]",
          "transition-[box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:shadow-[0_8px_22px_rgba(25,35,50,0.12)]",
          EVENT_STYLE[event.event_type],
          event.isAtRisk && "border-[#e89a96] bg-[#fff0ef] text-[#922f2a]",
          selectedEventId === event.id && "ring-2 ring-[#17191f] ring-offset-1",
        )}
        style={{
          top: `${layout.top + 4}px`,
          height: `${layout.height}px`,
          left: `calc(${layout.column * width}% + 5px)`,
          width: `calc(${width}% - 9px)`,
        }}
      >
        <div className="mb-1.5 flex items-center justify-between gap-1">
          <EventAvatars event={event} installersById={installersById} />
          <span className="truncate text-[9px] font-semibold uppercase opacity-65">
            {eventTypeLabel(event.event_type)}
          </span>
        </div>
        <div className="truncate text-[12px] font-semibold leading-4">{event.title}</div>
        <div className="mt-0.5 truncate text-[10px] leading-4 opacity-75">
          {project?.name || event.location || copy("No project", "Без проекта", "ללא פרויקט")}
        </div>
        <div className="mt-1 text-[10px] font-medium tabular-nums opacity-70">
          {timeLabel(event.starts_at)} - {timeLabel(event.ends_at)}
        </div>
      </button>
    );
  };

  return (
    <section className="overflow-hidden rounded-lg border border-[#dfe2e8] bg-[#f6f7fa] shadow-[0_18px_60px_rgba(29,38,53,0.08)]">
      <div className="flex flex-col gap-3 border-b border-[#e2e4e9] px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2.5">
          <h1 className="min-w-0 text-[22px] font-semibold capitalize text-[#101828]">
            {monthTitle}
          </h1>
          <CalendarDays aria-hidden="true" className="h-5 w-5 text-[#758096]" />
          <button
            type="button"
            onClick={() => onMovePeriod(-1)}
            aria-label={copy("Previous period", "Предыдущий период", "התקופה הקודמת")}
            title={copy("Previous period", "Предыдущий период", "התקופה הקודמת")}
            className="ms-1 flex h-9 w-9 items-center justify-center rounded-md text-[#758096] hover:bg-white hover:text-[#101828]"
          >
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onToday}
            className="h-9 rounded-md px-2.5 text-[13px] font-semibold text-[#101828] hover:bg-white"
          >
            {copy("Today", "Сегодня", "היום")}
          </button>
          <button
            type="button"
            onClick={() => onMovePeriod(1)}
            aria-label={copy("Next period", "Следующий период", "התקופה הבאה")}
            title={copy("Next period", "Следующий период", "התקופה הבאה")}
            className="flex h-9 w-9 items-center justify-center rounded-md text-[#758096] hover:bg-white hover:text-[#101828]"
          >
            <ChevronRight aria-hidden="true" className="h-4 w-4" />
          </button>
          <span className="hidden text-[12px] font-medium tabular-nums text-[#758096] xl:inline">
            {periodLabel}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex h-9 items-center rounded-md border border-[#dde1e8] bg-white p-0.5">
            {(["day", "week", "month"] as CalendarViewMode[]).map((viewMode) => (
              <button
                key={viewMode}
                type="button"
                onClick={() => onChangeView(viewMode)}
                aria-pressed={calendarView === viewMode}
                className={cn(
                  "h-8 rounded-[5px] px-3 text-[11px] font-semibold transition-colors duration-150",
                  calendarView === viewMode
                    ? "bg-[#17191f] text-white"
                    : "text-[#667085] hover:bg-[#f3f4f7] hover:text-[#101828]",
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
          <label className="flex h-10 min-w-[190px] flex-1 items-center gap-2 rounded-lg border border-[#dde1e8] bg-white px-3 focus-within:border-[#aeb7c6] lg:w-[220px] lg:flex-none">
            <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-[#758096]" />
            <span className="sr-only">{copy("Search schedule", "Поиск в календаре", "חיפוש ביומן")}</span>
            <input
              type="search"
              name="calendar-search"
              autoComplete="off"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={copy("Search…", "Поиск…", "חיפוש…")}
              className="min-w-0 flex-1 bg-transparent text-[12px] text-[#101828] outline-none placeholder:text-[#98a2b3]"
            />
          </label>
          <button
            type="button"
            onClick={onExport}
            aria-label={copy("Export schedule", "Экспорт графика", "ייצוא לוח")}
            title={copy("Export schedule", "Экспорт графика", "ייצוא לוח")}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#dde1e8] bg-white text-[#667085] hover:border-[#b9c0cc] hover:text-[#101828]"
          >
            <Download aria-hidden="true" className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onPrint}
            aria-label={copy("Print schedule", "Печать графика", "הדפס לוח")}
            title={copy("Print schedule", "Печать графика", "הדפס לוח")}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#dde1e8] bg-white text-[#667085] hover:border-[#b9c0cc] hover:text-[#101828]"
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
              "relative flex h-10 w-10 items-center justify-center rounded-lg border bg-white hover:border-[#b9c0cc]",
              areFiltersOpen || activeFilterCount > 0
                ? "border-[#d1ad42] text-[#8a6700]"
                : "border-[#dde1e8] text-[#667085]",
            )}
          >
            <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
            {activeFilterCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#17191f] px-1 text-[9px] font-semibold text-white">
                {activeFilterCount}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      {areFiltersOpen ? (
        <div className="grid gap-3 border-b border-[#e2e4e9] bg-white px-4 py-3 md:grid-cols-2">
          <label className="space-y-1 text-[11px] font-semibold text-[#667085]">
            <span>{copy("Installer", "Монтажник", "מתקין")}</span>
            <select
              aria-label={copy("Installer filter", "Фильтр монтажника", "מסנן מתקין")}
              value={installerFilter}
              onChange={(event) => onInstallerFilterChange(event.target.value)}
              className="h-10 w-full rounded-lg border border-[#dde1e8] bg-white px-3 text-[12px] font-medium text-[#101828]"
            >
              <option value="all">{copy("All installers", "Все монтажники", "כל המתקינים")}</option>
              {installers.map((installer) => (
                <option key={installer.id} value={installer.id}>{installer.full_name}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-[11px] font-semibold text-[#667085]">
            <span>{copy("Project", "Проект", "פרויקט")}</span>
            <select
              aria-label={copy("Project filter", "Фильтр проекта", "מסנן פרויקט")}
              value={projectFilter}
              onChange={(event) => onProjectFilterChange(event.target.value)}
              className="h-10 w-full rounded-lg border border-[#dde1e8] bg-white px-3 text-[12px] font-medium text-[#101828]"
            >
              <option value="all">{copy("All projects", "Все проекты", "כל הפרויקטים")}</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      <div className="grid min-h-[720px] grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="order-2 space-y-4 border-t border-[#e2e4e9] bg-[#f3f4f7] p-4 lg:order-1 lg:border-e lg:border-t-0">
          <button
            type="button"
            onClick={onAddEvent}
            disabled={!canManageCalendar}
            title={privilegedActionHint}
            className="flex h-14 w-full items-center justify-center gap-3 rounded-lg border border-[#dde1e8] bg-white text-[14px] font-semibold text-[#101828] shadow-[0_4px_12px_rgba(29,38,53,0.05)] hover:border-[#bdc4d0] hover:shadow-[0_7px_18px_rgba(29,38,53,0.08)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {copy("Add Event", "Добавить событие", "הוסף אירוע")}
            <Plus aria-hidden="true" className="h-5 w-5" />
          </button>

          <div className="rounded-lg border border-[#e0e3e9] bg-white p-4 shadow-[0_4px_14px_rgba(29,38,53,0.04)]">
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
                className="flex h-8 w-8 items-center justify-center rounded-md text-[#758096] hover:bg-[#f3f4f7] hover:text-[#101828]"
              >
                <ChevronLeft aria-hidden="true" className="h-4 w-4" />
              </button>
              <div className="text-[13px] font-semibold capitalize text-[#101828]">{monthTitle}</div>
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
                className="flex h-8 w-8 items-center justify-center rounded-md text-[#758096] hover:bg-[#f3f4f7] hover:text-[#101828]"
              >
                <ChevronRight aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-y-1 text-center">
              {miniWeekdays.map((weekday, index) => (
                <div key={`${weekday}-${index}`} className="pb-1 text-[10px] font-medium text-[#758096]">
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
                      "mx-auto flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-medium tabular-nums",
                      !isCurrentMonth && "text-[#c2c7d0]",
                      isCurrentMonth && "text-[#344054] hover:bg-[#f0f2f5]",
                      isSelected && "bg-[#17191f] text-white hover:bg-[#17191f]",
                      isToday && !isSelected && "ring-1 ring-[#d1ad42]",
                    )}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-[#e0e3e9] bg-white p-4 shadow-[0_4px_14px_rgba(29,38,53,0.04)]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[13px] font-semibold text-[#101828]">
                {copy("My Schedule", "Моё расписание", "לוח הזמנים שלי")}
              </h2>
              <ChevronDown aria-hidden="true" className="h-4 w-4 text-[#758096]" />
            </div>
            <div className="space-y-1">
              {EVENT_TYPES.map((eventType) => {
                const enabled = enabledEventTypes.includes(eventType);
                return (
                  <label
                    key={eventType}
                    className="flex min-h-10 cursor-pointer items-center gap-3 rounded-md px-2 hover:bg-[#f7f8fa]"
                  >
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={() => onToggleEventType(eventType)}
                      className="sr-only"
                    />
                    <span
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-[5px] border",
                        enabled
                          ? "border-[#7457c8] bg-[#7457c8] text-white"
                          : "border-[#cfd4dc] bg-white text-transparent",
                      )}
                    >
                      <Check aria-hidden="true" className="h-3.5 w-3.5" />
                    </span>
                    <span className={cn("h-3 w-3 rounded-full", EVENT_DOT[eventType])} />
                    <span className="text-[12px] font-medium text-[#344054]">
                      {eventTypeLabel(eventType)}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-[#e0e3e9] bg-white p-4 shadow-[0_4px_14px_rgba(29,38,53,0.04)]">
            <div className="mb-3 text-[11px] font-semibold uppercase text-[#758096]">
              {copy("Crews", "Бригады", "צוותים")}
            </div>
            <div className="space-y-1.5">
              {crews.map((crew) => (
                <button
                  type="button"
                  data-testid="calendar-lane-row"
                  key={crew.id}
                  onClick={() => onSelectCrew(crew.id)}
                  aria-label={copy(
                    `Open ${crew.title} schedule row`,
                    `Открыть строку расписания: ${crew.title}`,
                    `פתח שורת לוח: ${crew.title}`,
                  )}
                  className="flex w-full items-center gap-2.5 rounded-md border border-transparent px-2 py-2 text-start hover:border-[#e1e4e9] hover:bg-[#f7f8fa]"
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                      crew.tone === "a" && "bg-[#fff3cf] text-[#805d00]",
                      crew.tone === "b" && "bg-[#e9f2ff] text-[#2764a8]",
                      crew.tone === "c" && "bg-[#e8f7ee] text-[#277a45]",
                      crew.tone === "u" && "bg-[#eef0f3] text-[#758096]",
                    )}
                  >
                    {crew.initials}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11.5px] font-semibold text-[#344054]">
                      {crew.title}
                    </span>
                    <span className="block truncate text-[10px] text-[#98a2b3]">
                      {laneLoadLabel(crew.id)}
                    </span>
                  </span>
                  <span className="text-[10px] font-semibold tabular-nums text-[#758096]">
                    {crew.busyDays}d
                  </span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <div className="order-1 min-w-0 bg-white lg:order-2">
          {calendarView === "month" ? (
            <div className="overflow-x-auto">
              <div className="min-w-[820px]">
                <div className="grid grid-cols-7 border-b border-[#e2e4e9] bg-[#fafbfc]">
                  {miniWeekdays.map((weekday, index) => (
                    <div key={`${weekday}-${index}`} className="border-e border-[#e6e8ed] px-3 py-3 text-center text-[11px] font-semibold text-[#667085] last:border-e-0">
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
                      <div key={key} className={cn("min-h-[132px] border-b border-e border-[#e6e8ed] p-2", !isCurrentMonth && "bg-[#fafbfc]") }>
                        <button
                          type="button"
                          onClick={() => onSelectDate(date)}
                          className={cn(
                            "mb-1 flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums",
                            isSameDay(date, now) ? "bg-[#17191f] text-white" : "text-[#667085] hover:bg-[#f0f2f5]",
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
                                event.isAtRisk && "border-[#e89a96] bg-[#fff0ef] text-[#922f2a]",
                              )}
                            >
                              {timeLabel(event.starts_at)} {event.title}
                            </button>
                          ))}
                          {dayEvents.length > 3 ? (
                            <div className="px-1 text-[9.5px] font-medium text-[#758096]">
                              +{dayEvents.length - 3} {copy("more", "ещё", "נוספים")}
                            </div>
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
              <div className={cn(calendarView === "day" ? "min-w-[680px]" : "min-w-[980px]") }>
                <div
                  className="sticky top-0 z-30 grid border-b border-[#dfe2e8] bg-white"
                  style={{ gridTemplateColumns: `78px repeat(${calendarDays.length}, minmax(${calendarView === "day" ? "520px" : "128px"}, 1fr))` }}
                >
                  <div className="flex items-end justify-center pb-4 text-[10px] font-semibold text-[#758096]">
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
                          "border-s border-[#e2e4e9] px-2 py-4 text-center hover:bg-[#f8f9fb]",
                          today && "bg-[#fffaf0]",
                        )}
                      >
                        <span className="block text-[10px] font-semibold uppercase text-[#758096]">
                          {new Intl.DateTimeFormat(localeTag, { weekday: "short" }).format(date).replace(".", "")}
                        </span>
                        <span className={cn("mt-1 inline-flex h-8 min-w-8 items-center justify-center rounded-full px-1 text-[20px] font-semibold tabular-nums", today ? "bg-[#17191f] text-white" : "text-[#101828]") }>
                          {date.getDate()}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div
                  className="grid"
                  style={{ gridTemplateColumns: `78px repeat(${calendarDays.length}, minmax(${calendarView === "day" ? "520px" : "128px"}, 1fr))` }}
                >
                  <div className="relative bg-white" style={{ height: `${BODY_HEIGHT}px` }}>
                    {hours.map((hour, index) => (
                      <span
                        key={hour}
                        className="absolute end-3 -translate-y-1/2 text-[10px] font-semibold tabular-nums text-[#758096]"
                        style={{ top: `${index * HOUR_HEIGHT}px` }}
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
                        className={cn("relative border-s border-[#e2e4e9]", today && "bg-[#fffcf4]")}
                        style={{ height: `${BODY_HEIGHT}px` }}
                      >
                        {hours.map((hour, index) => (
                          <div
                            aria-hidden="true"
                            key={hour}
                            className="absolute inset-x-0 border-t border-[#e7e9ee]"
                            style={{ top: `${index * HOUR_HEIGHT}px` }}
                          />
                        ))}
                        {today && showCurrentTime ? (
                          <div className="pointer-events-none absolute inset-x-0 z-20 flex items-center" style={{ top: `${currentTimeTop}px` }}>
                            <span className="h-2 w-2 -translate-x-1 rounded-full bg-[#e84f45]" />
                            <span className="h-px flex-1 bg-[#e84f45]" />
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
            <div className="border-t border-[#e2e4e9] bg-[#fafbfc] px-4 py-3 text-center text-[11px] text-[#758096]">
              {copy(
                "No events match the selected filters.",
                "Нет событий по выбранным фильтрам.",
                "אין אירועים התואמים למסננים שנבחרו.",
              )}
            </div>
          ) : null}
          {isLoading ? (
            <div aria-live="polite" className="border-t border-[#e2e4e9] bg-[#fafbfc] px-4 py-3 text-center text-[11px] text-[#758096]">
              {copy("Loading schedule…", "Загрузка расписания…", "טוען לוח זמנים…")}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
