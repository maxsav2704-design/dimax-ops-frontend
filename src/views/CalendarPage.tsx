import { useCallback, useEffect, useMemo, useState } from "react";
import { eventTypeLabel } from "@/lib/event-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  ExternalLink,
  MapPin,
  MessageCircle,
  Navigation,
  Pencil,
  Phone,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import { DashboardLayout } from "@/components/DashboardLayout";
import { DimaxPageHeader } from "@/components/DimaxPageHeader";
import { ConfirmActionDialog, InlineNotice, useEntityHighlight } from "@/components/dimax";
import { pickLocale } from "@/lib/locale";
import { CalendarScheduleSurface } from "@/components/calendar/CalendarScheduleSurface";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useAuthSession } from "@/hooks/use-auth-session";
import { apiFetch } from "@/lib/api";
import { fetchAllProjects } from "@/lib/projects-list";
import { downloadCsv } from "@/lib/csv";
import { readableApiError } from "@/lib/api-error-display";
import { canRunPrivilegedAdminActions } from "@/lib/admin-access";
import { useI18n, useCopy } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type EventType =
  | "installation"
  | "delivery"
  | "meeting"
  | "consultation"
  | "inspection";

type CalendarViewMode = "day" | "week" | "month";

type CalendarEvent = {
  id: string;
  title: string;
  event_type: EventType;
  starts_at: string;
  ends_at: string;
  location: string | null;
  waze_url: string | null;
  description: string | null;
  project_id: string | null;
  installer_ids: string[];
  overlapping_event_ids?: string[];
};

type EventListResponse = {
  items: CalendarEvent[];
};

type InstallerItem = {
  id: string;
  full_name: string;
  is_active: boolean;
};

type ProjectListItem = {
  id: string;
  name: string;
  address: string;
  status: string;
};

type ProjectListResponse = {
  items: ProjectListItem[];
};

type ProjectDetailsResponse = ProjectListItem & {
  developer_company?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  developer_phone_alt?: string | null;
  developer_whatsapp?: string | null;
  contact_email?: string | null;
};

type ProjectPlanFactResponse = {
  total_doors: number;
  installed_doors: number;
  not_installed_doors: number;
  completion_pct: number;
  actual_payroll_total?: string | number | null;
};

type EventFormState = {
  title: string;
  event_type: EventType;
  date: string;
  end_date: string;
  starts_at_hhmm: string;
  ends_at_hhmm: string;
  location: string;
  description: string;
  project_id: string;
  installer_ids: string[];
};

type CalendarLane = {
  id: string;
  title: string;
  initials: string;
  events: CalendarEvent[];
  tone: "a" | "b" | "c" | "u";
  unassigned?: boolean;
};

const EVENT_TYPE_OPTIONS: Array<{ value: EventType; label: string }> = [
  { value: "installation", label: "Installation" },
  { value: "delivery", label: "Delivery" },
  { value: "meeting", label: "Meeting" },
  { value: "consultation", label: "Consultation" },
  { value: "inspection", label: "Inspection" },
];

function toIsoLocal(date: string, hhmm: string): string {
  return new Date(`${date}T${hhmm}:00`).toISOString();
}

function daysBetween(from: string, to: string): number {
  if (!from || !to) return 0;
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);
}

function shiftDate(date: string, days: number): string {
  if (!date || Number.isNaN(days)) return "";
  const moved = new Date(Date.parse(`${date}T12:00:00Z`) + days * 86_400_000);
  return moved.toISOString().slice(0, 10);
}

function fromIsoToDate(value: string): string {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromIsoToHHMM(value: string): string {
  const date = new Date(value);
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function labelDate(value: string, locale?: "en" | "ru" | "he"): string {
  const date = new Date(value);
  const localeTag =
    locale === "he" ? "he-IL" : locale === "ru" ? "ru-RU" : "en-US";
  return date.toLocaleDateString(localeTag, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatPeriodRange(
  start: Date,
  endExclusive: Date,
  locale?: "en" | "ru" | "he",
  includeYear = true,
): string {
  const end = new Date(endExclusive);
  end.setDate(end.getDate() - 1);
  const localeTag =
    locale === "he" ? "he-IL" : locale === "ru" ? "ru-RU" : "en-US";
  const sameDay = fromIsoToDate(start.toISOString()) === fromIsoToDate(end.toISOString());
  const monthDay = new Intl.DateTimeFormat(localeTag, {
    month: "short",
    day: "numeric",
  });
  const monthDayYear = new Intl.DateTimeFormat(localeTag, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  if (sameDay) {
    return includeYear ? monthDayYear.format(start) : monthDay.format(start);
  }
  if (!includeYear && start.getFullYear() === end.getFullYear()) {
    return `${monthDay.format(start)} - ${monthDay.format(end)}`;
  }
  if (start.getFullYear() === end.getFullYear()) {
    return `${monthDay.format(start)} - ${monthDayYear.format(end)}`;
  }
  return `${monthDayYear.format(start)} - ${monthDayYear.format(end)}`;
}

function startOfDay(base: Date): Date {
  const copy = new Date(base);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function startOfWeek(base: Date): Date {
  const copy = new Date(base);
  const dow = copy.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  copy.setDate(copy.getDate() + mondayOffset);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function startOfMonth(base: Date): Date {
  return new Date(base.getFullYear(), base.getMonth(), 1, 0, 0, 0, 0);
}

function normalizePeriodStart(base: Date, viewMode: CalendarViewMode): Date {
  if (viewMode === "day") {
    return startOfDay(base);
  }
  if (viewMode === "month") {
    return startOfMonth(base);
  }
  return startOfWeek(base);
}

function getPeriodEnd(start: Date, viewMode: CalendarViewMode): Date {
  const end = new Date(start);
  if (viewMode === "day") {
    end.setDate(start.getDate() + 1);
    return end;
  }
  if (viewMode === "month") {
    end.setMonth(start.getMonth() + 1, 1);
    return end;
  }
  end.setDate(start.getDate() + 7);
  return end;
}

function buildCalendarDays(start: Date, viewMode: CalendarViewMode): Date[] {
  const count =
    viewMode === "day"
      ? 1
      : viewMode === "month"
        ? new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate()
        : 7;
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function makeDefaultForm(weekStartDate: Date): EventFormState {
  const date = fromIsoToDate(weekStartDate.toISOString());
  return {
    title: "",
    event_type: "installation",
    date,
    end_date: date,
    starts_at_hhmm: "09:00",
    ends_at_hhmm: "10:00",
    location: "",
    description: "",
    project_id: "",
    installer_ids: [],
  };
}


function eventToForm(event: CalendarEvent): EventFormState {
  return {
    title: event.title,
    event_type: event.event_type,
    date: fromIsoToDate(event.starts_at),
    end_date: fromIsoToDate(event.ends_at),
    starts_at_hhmm: fromIsoToHHMM(event.starts_at),
    ends_at_hhmm: fromIsoToHHMM(event.ends_at),
    location: event.location || "",
    description: event.description || "",
    project_id: event.project_id || "",
    installer_ids: event.installer_ids || [],
  };
}

function localizedEventType(
  eventType: EventType,
  locale?: "en" | "ru" | "he",
): string {
  return eventTypeLabel(eventType, locale);
}

function getInitials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "--";
  }
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function isProjectAtRisk(project: ProjectListItem | null | undefined): boolean {
  const status = (project?.status || "").toUpperCase();
  return (
    status.includes("PROBLEM") ||
    status.includes("BLOCK") ||
    status.includes("RISK") ||
    status.includes("DELAY")
  );
}

function normalizePhone(value: string | null | undefined): string {
  return (value || "").replace(/[^\d+]/g, "");
}

function buildWazeHref(
  event: CalendarEvent | null,
  project: ProjectListItem | ProjectDetailsResponse | null | undefined,
): string | null {
  if (!event) {
    return null;
  }
  if (event.waze_url?.trim()) {
    return event.waze_url.trim();
  }
  const target = event.location || project?.address || "";
  if (!target.trim()) {
    return null;
  }
  return `https://waze.com/ul?q=${encodeURIComponent(target)}&navigate=yes`;
}

function ruPlural(count: number, one: string, few: string, many: string): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) {
    return one;
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return few;
  }
  return many;
}

function localizedEventCount(count: number, locale?: "en" | "ru" | "he"): string {
  if (locale === "ru") {
    return `${count} ${ruPlural(count, "событие", "события", "событий")}`;
  }
  if (locale === "he") {
    return count === 1 ? "אירוע אחד" : `${count} אירועים`;
  }
  return `${count} ${count === 1 ? "event" : "events"}`;
}

function localizedBusyDays(count: number, locale?: "en" | "ru" | "he"): string {
  if (count <= 0) {
    return pickLocale(locale ?? "en", "no tasks", "нет задач", "אין משימות");
  }
  if (locale === "ru") {
    return `занят ${count} ${ruPlural(count, "день", "дня", "дней")}`;
  }
  if (locale === "he") {
    return count === 1 ? "יום עבודה אחד" : `${count} ימי עבודה`;
  }
  return `busy ${count} ${count === 1 ? "day" : "days"}`;
}

function localizedLaneLoad(lane: CalendarLane, locale?: "en" | "ru" | "he"): string {
  const activeDays = new Set(lane.events.map((event) => fromIsoToDate(event.starts_at))).size;
  if (lane.unassigned) {
    return locale === "ru"
      ? `${localizedEventCount(lane.events.length, locale)} без назначения`
      : locale === "he"
        ? `${localizedEventCount(lane.events.length, locale)} ללא שיבוץ`
        : `${localizedEventCount(lane.events.length, locale)} unassigned`;
  }
  if (lane.events.length === 0) {
    return localizedBusyDays(0, locale);
  }
  return `${localizedEventCount(lane.events.length, locale)} · ${localizedBusyDays(activeDays, locale)}`;
}


export default function CalendarPage() {
  const queryClient = useQueryClient();
  const { locale } = useI18n();
  const copy = useCopy();
  // E2: an installer hovered in the lane list lights up on every event that includes them.
  useEntityHighlight();
  const [weekStartDate, setWeekStartDate] = useState<Date>(
    new Date(),
  );
  const [calendarView, setCalendarView] = useState<CalendarViewMode>("week");
  const [enabledEventTypes, setEnabledEventTypes] = useState<EventType[]>(
    () => EVENT_TYPE_OPTIONS.map((option) => option.value),
  );
  const [installerFilter, setInstallerFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [areFiltersOpen, setAreFiltersOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isInfoFrameOpen, setIsInfoFrameOpen] = useState(false);
  const [selectedLaneId, setSelectedLaneId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [form, setForm] = useState<EventFormState>(
    makeDefaultForm(weekStartDate),
  );
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const session = useAuthSession();
  const canManageCalendar = canRunPrivilegedAdminActions(session);
  const runCalendarWrite = <T,>(action: () => Promise<T>): Promise<T> => {
    if (!canManageCalendar) {
      return Promise.reject(new Error("Calendar write access is required."));
    }
    return action();
  };
  const privilegedActionHint = canManageCalendar
    ? undefined
    : copy(
        "Your access level is read-only in calendar",
        "Ваш уровень доступа разрешает только просмотр календаря",
        "רמת הגישה שלך מאפשרת צפייה בלבד ביומן",
      );

  const periodStartDate = useMemo(
    () => normalizePeriodStart(weekStartDate, calendarView),
    [calendarView, weekStartDate],
  );
  const periodEndDate = useMemo(
    () => getPeriodEnd(periodStartDate, calendarView),
    [calendarView, periodStartDate],
  );
  const weekStartIso = periodStartDate.toISOString();
  const weekEndIso = periodEndDate.toISOString();

  const eventsQuery = useQuery({
    queryKey: ["calendar-events", weekStartIso, weekEndIso],
    queryFn: () =>
      apiFetch<EventListResponse>(
        `/api/v1/admin/calendar/events?starts_at=${encodeURIComponent(
          weekStartIso,
        )}&ends_at=${encodeURIComponent(weekEndIso)}`,
      ),
    refetchInterval: 30_000,
  });

  const installersQuery = useQuery({
    queryKey: ["calendar-installers"],
    queryFn: () =>
      apiFetch<InstallerItem[]>("/api/v1/admin/installers?limit=200"),
  });

  const projectsQuery = useQuery({
    queryKey: ["calendar-projects"],
    queryFn: () => fetchAllProjects<ProjectListResponse["items"][number]>(),
  });

  const selectedProjectId = selectedEvent?.project_id || "";

  const projectDetailsQuery = useQuery({
    queryKey: ["calendar-project-detail", selectedProjectId],
    enabled: Boolean(selectedProjectId),
    queryFn: () =>
      apiFetch<ProjectDetailsResponse>(
        `/api/v1/admin/projects/${selectedProjectId}`,
      ),
  });

  const planFactQuery = useQuery({
    queryKey: ["calendar-project-plan-fact", selectedProjectId],
    enabled: Boolean(selectedProjectId),
    queryFn: () =>
      apiFetch<ProjectPlanFactResponse>(
        `/api/v1/admin/reports/project-plan-fact/${selectedProjectId}`,
      ),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      runCalendarWrite(() => apiFetch<{ id: string }>("/api/v1/admin/calendar/events", {
        method: "POST",
        body: JSON.stringify({
          title: form.title.trim(),
          event_type: form.event_type,
          starts_at: toIsoLocal(form.date, form.starts_at_hhmm),
          ends_at: toIsoLocal(form.end_date, form.ends_at_hhmm),
          location: form.location.trim() || null,
          description: form.description.trim() || null,
          project_id: form.project_id || null,
          installer_ids: form.installer_ids,
        }),
      })),
    onSuccess: async () => {
      setIsCreateOpen(false);
      setForm(makeDefaultForm(periodStartDate));
      setActionNotice(
        copy("Event created.", "Событие создано.", "האירוע נוצר."),
      );
      await queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editingEvent) {
        throw new Error("No event selected");
      }
      return runCalendarWrite(() => apiFetch<{ ok: boolean }>(
        `/api/v1/admin/calendar/events/${editingEvent.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            title: form.title.trim(),
            event_type: form.event_type,
            starts_at: toIsoLocal(form.date, form.starts_at_hhmm),
            ends_at: toIsoLocal(form.end_date, form.ends_at_hhmm),
            location: form.location.trim() || null,
            description: form.description.trim() || null,
            project_id: form.project_id || null,
            installer_ids: form.installer_ids,
          }),
        },
      ));
    },
    onSuccess: async () => {
      setIsEditOpen(false);
      setEditingEvent(null);
      setActionNotice(
        copy("Event updated.", "Событие обновлено.", "האירוע עודכן."),
      );
      await queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (eventId: string) =>
      runCalendarWrite(() => apiFetch<{ ok: boolean }>(`/api/v1/admin/calendar/events/${eventId}`, {
        method: "DELETE",
      })),
    onSuccess: async (_, eventId) => {
      if (editingEvent?.id === eventId) {
        setIsEditOpen(false);
        setEditingEvent(null);
      }
      if (selectedEvent?.id === eventId) {
        setSelectedEvent(null);
        setIsInfoFrameOpen(false);
      }
      setActionNotice(
        copy("Event deleted.", "Событие удалено.", "האירוע נמחק."),
      );
      await queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
    },
  });

  useEffect(() => {
    if (!actionNotice) {
      return undefined;
    }
    const timer = window.setTimeout(() => setActionNotice(null), 2500);
    return () => window.clearTimeout(timer);
  }, [actionNotice]);

  const calendarDays = useMemo(
    () => buildCalendarDays(periodStartDate, calendarView),
    [calendarView, periodStartDate],
  );

  const installers = useMemo(
    () => installersQuery.data || [],
    [installersQuery.data],
  );
  const activeInstallers = useMemo(
    () => installers.filter((installer) => installer.is_active),
    [installers],
  );
  const projects = useMemo(
    () => projectsQuery.data?.items || [],
    [projectsQuery.data?.items],
  );

  const installerById = useMemo(() => {
    return new Map(installers.map((installer) => [installer.id, installer]));
  }, [installers]);

  const projectById = useMemo(() => {
    return new Map(projects.map((project) => [project.id, project]));
  }, [projects]);

  const visibleEvents = useMemo(() => {
    const rows = eventsQuery.data?.items || [];
    const normalizedSearch = searchQuery.trim().toLocaleLowerCase();
    return rows
      .filter((item) => enabledEventTypes.includes(item.event_type))
      .filter((item) =>
        installerFilter === "all"
          ? true
          : item.installer_ids.includes(installerFilter),
      )
      .filter((item) =>
        projectFilter === "all" ? true : item.project_id === projectFilter,
      )
      .filter((item) => {
        if (!normalizedSearch) {
          return true;
        }
        const project = projectById.get(item.project_id || "");
        const installerNames = item.installer_ids
          .map((id) => installerById.get(id)?.full_name || "")
          .join(" ");
        return [
          item.title,
          item.location || "",
          project?.name || "",
          installerNames,
        ].some((value) => value.toLocaleLowerCase().includes(normalizedSearch));
      })
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  }, [
    enabledEventTypes,
    eventsQuery.data?.items,
    installerById,
    installerFilter,
    projectById,
    projectFilter,
    searchQuery,
  ]);
  const scheduleEvents = useMemo(
    () =>
      visibleEvents.map((event) => ({
        ...event,
        isAtRisk: isProjectAtRisk(projectById.get(event.project_id || "") || null),
        isDoubleBooked: (event.overlapping_event_ids || []).length > 0,
      })),
    [projectById, visibleEvents],
  );

  useEffect(() => {
    if (visibleEvents.length === 0) {
      setSelectedEvent(null);
      setIsInfoFrameOpen(false);
      return;
    }
    const currentEvent = visibleEvents.find((event) => event.id === selectedEvent?.id);
    if (!currentEvent) {
      setSelectedEvent(visibleEvents[0]);
      setIsInfoFrameOpen(false);
    } else if (currentEvent !== selectedEvent) {
      setSelectedEvent(currentEvent);
    }
  }, [selectedEvent, visibleEvents]);

  const lanes = useMemo<CalendarLane[]>(() => {
    const knownInstallerIds = new Set(activeInstallers.map((item) => item.id));
    const toneCycle: Array<"a" | "b" | "c"> = ["a", "b", "c"];
    const installerLanes = activeInstallers.map((installer, index) => ({
      id: installer.id,
      title: installer.full_name,
      initials: getInitials(installer.full_name),
      tone: toneCycle[index % toneCycle.length],
      events: visibleEvents.filter((event) =>
        event.installer_ids.includes(installer.id),
      ),
    }));
    const unassignedEvents = visibleEvents.filter(
      (event) =>
        event.installer_ids.length === 0 ||
        event.installer_ids.every((id) => !knownInstallerIds.has(id)),
    );
    return [
      ...installerLanes,
      {
        id: "unassigned",
        title: copy("Unassigned", "Без монтажника", "לא משויך"),
        initials: "--",
        tone: "u",
        events: unassignedEvents,
        unassigned: true,
      },
    ];
  }, [activeInstallers, copy, visibleEvents]);

  useEffect(() => {
    if (selectedLaneId && !lanes.some((lane) => lane.id === selectedLaneId)) {
      setSelectedLaneId(null);
    }
  }, [lanes, selectedLaneId]);

  const selectedProjectFromList =
    projectById.get(selectedEvent?.project_id || "") || null;
  const selectedProject = projectDetailsQuery.data || selectedProjectFromList;
  const selectedPlanFact = planFactQuery.data || null;
  const selectedInstallers = selectedEvent
    ? selectedEvent.installer_ids
        .map((id) => installerById.get(id)?.full_name)
        .filter(Boolean)
        .join(", ")
    : "";
  const selectedRisk = isProjectAtRisk(selectedProject);
  const selectedWazeHref = buildWazeHref(selectedEvent, selectedProject);
  const whatsappPhone = normalizePhone(
    projectDetailsQuery.data?.developer_whatsapp ||
      projectDetailsQuery.data?.contact_phone,
  );
  const callPhone = normalizePhone(projectDetailsQuery.data?.contact_phone);
  const selectedLane = selectedLaneId
    ? lanes.find((lane) => lane.id === selectedLaneId) || null
    : null;
  const selectedLaneActiveDays = selectedLane
    ? new Set(selectedLane.events.map((event) => fromIsoToDate(event.starts_at))).size
    : 0;
  const selectedLaneNextEvent = selectedLane?.events[0] || null;
  const selectedLaneNextProject =
    projectById.get(selectedLaneNextEvent?.project_id || "") || null;

  const onMovePeriod = (direction: -1 | 1) => {
    const next = new Date(periodStartDate);
    if (calendarView === "day") {
      next.setDate(periodStartDate.getDate() + direction);
    } else if (calendarView === "month") {
      next.setMonth(periodStartDate.getMonth() + direction, 1);
    } else {
      next.setDate(periodStartDate.getDate() + direction * 7);
    }
    const normalized = normalizePeriodStart(next, calendarView);
    setWeekStartDate(normalized);
    setForm(makeDefaultForm(normalized));
    setIsInfoFrameOpen(false);
    setSelectedLaneId(null);
  };

  const onPrevWeek = () => {
    onMovePeriod(-1);
  };

  const onNextWeek = () => {
    onMovePeriod(1);
  };

  const onToday = () => {
    const next = new Date();
    setWeekStartDate(next);
    setForm(makeDefaultForm(next));
    setIsInfoFrameOpen(false);
    setSelectedLaneId(null);
  };

  const onChangeView = (viewMode: CalendarViewMode) => {
    setCalendarView(viewMode);
    setForm(makeDefaultForm(weekStartDate));
    setIsInfoFrameOpen(false);
    setSelectedLaneId(null);
  };

  const onSelectDate = (date: Date, viewMode: CalendarViewMode = calendarView) => {
    setCalendarView(viewMode);
    setWeekStartDate(date);
    setForm(makeDefaultForm(date));
    setIsInfoFrameOpen(false);
    setSelectedLaneId(null);
  };

  const onToggleEventType = (eventType: EventType) => {
    setEnabledEventTypes((current) =>
      current.includes(eventType)
        ? current.filter((value) => value !== eventType)
        : [...current, eventType],
    );
  };

  const onSelectCalendarEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsInfoFrameOpen(true);
    setSelectedLaneId(null);
    // The details panel sits above the grid: bring it into view, otherwise a click deep in the day looks like nothing.
    window.setTimeout(() => {
      document.querySelector('[data-testid="calendar-event-info-frame"]')?.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
    }, 50);
  };

  const onSelectLane = (lane: CalendarLane) => {
    setSelectedLaneId(lane.id);
    setIsInfoFrameOpen(false);
    if (lane.events[0]) {
      setSelectedEvent(lane.events[0]);
    }
  };

  const unavailableQuickActionHint = copy(
    "No address or contact for this event: link a project or add a place.",
    "У события нет адреса или контакта: привяжите объект или укажите место.",
    "לאירוע אין כתובת או איש קשר: קשרו פרויקט או הוסיפו מקום.",
  );

  const resetEventErrors = () => {
    createMutation.reset();
    updateMutation.reset();
    deleteMutation.reset();
  };

  const closeEventDialog = () => {
    setIsCreateOpen(false);
    setIsEditOpen(false);
    setEditingEvent(null);
    resetEventErrors();
  };

  const onOpenCreate = () => {
    if (!canManageCalendar) return;
    resetEventErrors();
    setForm(makeDefaultForm(weekStartDate));
    setActionNotice(null);
    setIsCreateOpen(true);
  };

  const onOpenCreateForLane = (lane: CalendarLane) => {
    if (!canManageCalendar) return;
    resetEventErrors();
    const nextForm = makeDefaultForm(weekStartDate);
    setForm({
      ...nextForm,
      installer_ids: lane.unassigned ? [] : [lane.id],
    });
    setActionNotice(null);
    setIsCreateOpen(true);
  };

  const onOpenEdit = (event: CalendarEvent) => {
    if (!canManageCalendar) return;
    resetEventErrors();
    setEditingEvent(event);
    setForm(eventToForm(event));
    setActionNotice(null);
    setIsEditOpen(true);
  };

  const onToggleInstaller = (installerId: string) => {
    if (!canManageCalendar) return;
    setForm((prev) => {
      const exists = prev.installer_ids.includes(installerId);
      if (exists) {
        return {
          ...prev,
          installer_ids: prev.installer_ids.filter((x) => x !== installerId),
        };
      }
      return {
        ...prev,
        installer_ids: [...prev.installer_ids, installerId],
      };
    });
  };

  const onExportWeek = () => {
    downloadCsv(
      `dimax_calendar_${fromIsoToDate(weekStartIso)}.csv`,
      [
        [
          copy("Title", "Название", "כותרת"), copy("Type", "Тип", "סוג"), copy("Start", "Начало", "התחלה"),
          copy("End", "Конец", "סיום"), copy("Project", "Объект", "פרויקט"), copy("Installers", "Монтажники", "מתקינים"),
          copy("Place", "Место", "מקום"),
        ],
        ...visibleEvents.map((event) => [
          event.title,
          localizedEventType(event.event_type, locale),
          event.starts_at,
          event.ends_at,
          projectById.get(event.project_id || "")?.name || "",
          event.installer_ids
            .map((id) => installerById.get(id)?.full_name || id)
            .join("; "),
          event.location || "",
        ]),
      ],
    );
    setActionNotice(copy("Schedule exported.", "График экспортирован.", "הלוח יוצא."));
  };

  const hasLoadError =
    eventsQuery.isError || installersQuery.isError || projectsQuery.isError;
  const hasActionError =
    createMutation.isError || updateMutation.isError || deleteMutation.isError;
  const calendarActionFallback = copy(
    "Calendar action failed.",
    "Не удалось выполнить действие календаря.",
    "פעולת היומן נכשלה.",
  );
  const calendarLoadFallback = copy(
    "Failed to load calendar data.",
    "Не удалось загрузить данные календаря.",
    "טעינת נתוני היומן נכשלה.",
  );
  const actionErrorMessage =
    (createMutation.error &&
      readableApiError(createMutation.error, locale, calendarActionFallback)) ||
    (updateMutation.error &&
      readableApiError(updateMutation.error, locale, calendarActionFallback)) ||
    (deleteMutation.error &&
      readableApiError(deleteMutation.error, locale, calendarActionFallback)) ||
    calendarActionFallback;
  const loadErrorMessage = readableApiError(
    eventsQuery.error || installersQuery.error || projectsQuery.error,
    locale,
    calendarLoadFallback,
  );
  // An event may run past midnight: compare the full start and end moments, not the clock times alone.
  const isInvalidTimeRange = `${form.end_date}T${form.ends_at_hhmm}` <= `${form.date}T${form.starts_at_hhmm}`;
  const periodLabel = formatPeriodRange(periodStartDate, periodEndDate, locale);

  return (
    <DashboardLayout>
      <div data-testid="calendar-v27" className="page-shell page-stack-tight motion-stagger">
        <DimaxPageHeader
          breadcrumbs={[
            { label: copy("Dashboard", "Главная", "ראשי"), href: "/" },
            { label: copy("Calendar", "Календарь", "יומן") },
          ]}
          title={copy("Calendar", "Календарь", "יומן")}
          subtitle={copy(
            "Installer schedule, assignments and the unassigned queue by period.",
            "График монтажников, назначения и очередь без назначения по периодам.",
            "לוח המתקינים, השיבוצים והתור ללא שיבוץ לפי תקופה.",
          )}
        />
        {hasLoadError && (
          <InlineNotice
            tone="error"
            action={
              <button
                type="button"
                className="dmx-secondary-action h-8 text-12"
                onClick={() => {
                  void eventsQuery.refetch();
                  void installersQuery.refetch();
                  void projectsQuery.refetch();
                }}
              >
                {copy("Retry", "Повторить", "נסה שוב")}
              </button>
            }
          >
            {loadErrorMessage}
          </InlineNotice>
        )}
        {hasActionError && !isCreateOpen && !isEditOpen && (
          <InlineNotice tone="error">{actionErrorMessage}</InlineNotice>
        )}
        {actionNotice && <InlineNotice tone="success">{actionNotice}</InlineNotice>}
        {!canManageCalendar && (
          <InlineNotice tone="warning">
            {copy(
              "Your access level has read-only access to calendar planning.",
              "Ваш уровень доступа разрешает только просмотр планирования календаря.",
              "רמת הגישה שלך מאפשרת צפייה בלבד בתכנון היומן.",
            )}
          </InlineNotice>
        )}

        {selectedLane ? (
          <section
            data-testid="calendar-lane-info-frame"
            style={{ opacity: 1, animation: "none" }}
            className="rounded-lg border border-accent bg-surface px-4 py-3 shadow-[var(--dmx-shadow-overlay)]"
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex rounded-full border border-status-warning-border bg-status-warning-bg px-2.5 py-1 text-[10.5px] font-medium text-status-warning-fg">
                    {selectedLane.unassigned
                      ? copy("Assignment queue", "Очередь без назначения", "תור ללא שיבוץ")
                      : copy("Installer row", "Строка монтажника", "שורת מתקין")}
                  </span>
                  <span className="text-[11px] font-medium tabular-nums text-text-secondary">
                    {periodLabel}
                  </span>
                </div>
                <h2 className="text-[16px] font-medium leading-tight text-text">
                  {selectedLane.title}
                </h2>
                <p className="mt-1 max-w-[760px] text-[12px] leading-5 text-text-secondary">
                  {selectedLane.unassigned
                    ? copy("Waiting for assignment", "Ожидает назначения", "ממתין לשיבוץ")
                    : copy("Workload", "Загрузка", "עומס")}
                  {" · "}
                  {localizedLaneLoad(selectedLane, locale)}
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-text-secondary">
                  <span className="rounded-full border border-border bg-surface-subtle px-2.5 py-1">
                    {copy("Events", "События", "אירועים")}:{" "}
                    <b className="font-medium text-text">
                      {selectedLane.events.length}
                    </b>
                  </span>
                  <span className="rounded-full border border-border bg-surface-subtle px-2.5 py-1">
                    {copy("Busy days", "Занятые дни", "ימי עבודה")}:{" "}
                    <b className="font-medium text-text">
                      {selectedLaneActiveDays}
                    </b>
                  </span>
                  <span className="rounded-full border border-border bg-surface-subtle px-2.5 py-1">
                    {copy("Next", "Ближайшее", "הבא")}:{" "}
                    <b className="font-medium text-text">
                      {selectedLaneNextEvent
                        ? `${fromIsoToHHMM(selectedLaneNextEvent.starts_at)} · ${
                            selectedLaneNextProject?.name ||
                            selectedLaneNextEvent.location ||
                            selectedLaneNextEvent.title
                          }`
                        : copy("no event", "нет события", "אין אירוע")}
                    </b>
                  </span>
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedLaneNextEvent) {
                      onSelectCalendarEvent(selectedLaneNextEvent);
                      return;
                    }
                    setActionNotice(
                      copy(
                        "There are no events in this row for the selected period.",
                        "В этой строке нет событий за выбранный период.",
                        "אין אירועים בשורה הזו לתקופה שנבחרה.",
                      ),
                    );
                  }}
                  className="dmx-secondary-action h-9"
                >
                  <CalendarDays className="h-4 w-4" />
                  {copy("Read schedule", "Прочитать", "קרא לוח")}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    selectedLaneNextEvent
                      ? onOpenEdit(selectedLaneNextEvent)
                      : onOpenCreateForLane(selectedLane)
                  }
                  disabled={!canManageCalendar}
                  title={privilegedActionHint}
                  className="dmx-secondary-action h-9 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Pencil className="h-4 w-4" />
                  {selectedLaneNextEvent
                    ? copy("Edit next event", "Изменить ближайшее", "ערוך הבא")
                    : copy("Add event", "Добавить событие", "הוסף אירוע")}
                </button>
                {!selectedLane.unassigned ? (
                  <a
                    href={`/installers?installer_id=${selectedLane.id}`}
                    className="dmx-primary-action h-9"
                  >
                    {copy("Open installer", "Открыть монтажника", "פתח מתקין")}
                    <ExternalLink className="h-4 w-4" />
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => onOpenCreateForLane(selectedLane)}
                    disabled={!canManageCalendar}
                    title={privilegedActionHint}
                    className="dmx-primary-action h-9 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Plus className="h-4 w-4" />
                    {copy("Assign work", "Назначить работу", "שבץ עבודה")}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedLaneId(null)}
                  aria-label={copy("Close row info", "Закрыть информацию о строке", "סגור מידע שורה")}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-text-secondary hover:bg-surface-subtle hover:text-text"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {!selectedLane && selectedEvent && isInfoFrameOpen ? (
          <section
            data-testid="calendar-event-info-frame"
            style={{ opacity: 1, animation: "none" }}
            className={cn(
              "rounded-lg border bg-surface px-4 py-3 shadow-[var(--dmx-shadow-overlay)]",
              selectedRisk ? "border-status-problem-border" : "border-accent",
            )}
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex rounded-full border px-2.5 py-1 text-[10.5px] font-medium",
                      selectedRisk
                        ? "border-status-problem-border bg-status-problem-bg text-status-problem-fg"
                        : "border-status-warning-border bg-status-warning-bg text-status-warning-fg",
                    )}
                  >
                    {localizedEventType(selectedEvent.event_type, locale)}
                  </span>
                  <span className="text-[11px] font-medium tabular-nums text-text-secondary">
                    {labelDate(selectedEvent.starts_at, locale)} ·{" "}
                    {fromIsoToHHMM(selectedEvent.starts_at)} -{" "}
                    {fromIsoToHHMM(selectedEvent.ends_at)}
                  </span>
                </div>
                <h2 className="text-[16px] font-medium leading-tight text-text">
                  {selectedEvent.title}
                </h2>
                {(selectedEvent.overlapping_event_ids || []).length > 0 ? (
                  <p data-testid="calendar-overlap-note" className="mt-1 text-12 font-medium text-status-warning-fg">
                    {copy(
                      `The crew is also booked for ${selectedEvent.overlapping_event_ids!.length} other event(s) at this time.`,
                      `Эта бригада в это же время назначена ещё на ${selectedEvent.overlapping_event_ids!.length} событие(я).`,
                      `הצוות משובץ באותו זמן גם ל-${selectedEvent.overlapping_event_ids!.length} אירועים נוספים.`,
                    )}
                  </p>
                ) : null}
                <p className="mt-1 max-w-[760px] text-[12px] leading-5 text-text-secondary">
                  {selectedProject?.name || selectedEvent.location || copy("No project linked", "Проект не привязан", "אין פרויקט מקושר")}
                  {" · "}
                  {selectedEvent.location || selectedProject?.address || copy("No address", "Адрес не указан", "אין כתובת")}
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-text-secondary">
                  <span className="rounded-full border border-border bg-surface-subtle px-2.5 py-1">
                    {copy("Crew", "Бригада", "צוות")}:{" "}
                    <b className="font-medium text-text">
                      {selectedInstallers || copy("Unassigned", "Без монтажника", "לא משויך")}
                    </b>
                  </span>
                  <span className="rounded-full border border-border bg-surface-subtle px-2.5 py-1">
                    {copy("Doors", "Двери", "דלתות")}:{" "}
                    <b className="font-medium text-text">
                      {selectedPlanFact
                        ? `${selectedPlanFact.installed_doors} / ${selectedPlanFact.total_doors}`
                        : copy("no plan", "нет плана", "אין תוכנית")}
                    </b>
                  </span>
                  <span className="rounded-full border border-border bg-surface-subtle px-2.5 py-1">
                    {copy("Developer", "Застройщик", "יזם")}: {" "}
                    <b className="font-medium text-text">
                      {projectDetailsQuery.data?.developer_company || "-"}
                    </b>
                  </span>
                  <span className="rounded-full border border-border bg-surface-subtle px-2.5 py-1">
                    {copy("Contact", "Контакт", "איש קשר")}: {" "}
                    <b className="font-medium text-text">
                      {projectDetailsQuery.data?.contact_name || "-"}
                    </b>
                  </span>
                  <span className="rounded-full border border-border bg-surface-subtle px-2.5 py-1">
                    {copy("Payroll", "Начисления", "שכר")}: {" "}
                    <b className="font-medium text-text">
                      {selectedPlanFact?.actual_payroll_total ?? "-"}
                    </b>
                  </span>
                  <span className="rounded-full border border-border bg-surface-subtle px-2.5 py-1">
                    {copy("Status", "Статус", "סטטוס")}:{" "}
                    <b className="font-medium text-text">
                      {selectedProject?.status || "-"}
                    </b>
                  </span>
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {selectedWazeHref ? (
                  <a
                    href={selectedWazeHref}
                    target="_blank"
                    rel="noreferrer"
                    className="dmx-secondary-action h-9"
                  >
                    <Navigation className="h-4 w-4" />
                    Waze
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled
                    title={unavailableQuickActionHint}
                    className="dmx-secondary-action h-9 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Navigation className="h-4 w-4" />
                    Waze
                  </button>
                )}
                {whatsappPhone ? (
                  <a
                    href={`https://wa.me/${whatsappPhone.replace(/^\+/, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="dmx-secondary-action h-9"
                  >
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled
                    title={unavailableQuickActionHint}
                    className="dmx-secondary-action h-9 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </button>
                )}
                {callPhone ? (
                  <a href={`tel:${callPhone}`} className="dmx-secondary-action h-9">
                    <Phone className="h-4 w-4" />
                    {copy("Call", "Звонок", "שיחה")}
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled
                    title={unavailableQuickActionHint}
                    className="dmx-secondary-action h-9 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Phone className="h-4 w-4" />
                    {copy("Call", "Звонок", "שיחה")}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onOpenEdit(selectedEvent)}
                  disabled={!canManageCalendar}
                  title={privilegedActionHint}
                  className="dmx-secondary-action h-9 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Pencil className="h-4 w-4" />
                  {copy("Edit", "Изменить", "ערוך")}
                </button>
                {selectedEvent.project_id ? (
                  <a href={`/projects?project_id=${selectedEvent.project_id}`} className="dmx-primary-action h-9">
                    {copy("Open project", "Открыть проект", "פתח פרויקט")}
                    <ExternalLink className="h-4 w-4" />
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={() => setIsInfoFrameOpen(false)}
                  aria-label={copy("Close event info", "Закрыть информацию о событии", "סגור מידע על אירוע")}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-text-secondary hover:bg-surface-subtle hover:text-text"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </section>
        ) : null}

        <CalendarScheduleSurface
          locale={locale}
          copy={copy}
          periodStartDate={periodStartDate}
          periodEndDate={periodEndDate}
          calendarDays={calendarDays}
          calendarView={calendarView}
          events={scheduleEvents}
          installers={activeInstallers}
          projects={projects}
          crews={lanes.map((lane) => ({
            id: lane.id,
            title: lane.title,
            initials: lane.initials,
            eventsCount: lane.events.length,
            busyDays: new Set(
              lane.events.map((event) => fromIsoToDate(event.starts_at)),
            ).size,
            tone: lane.tone,
            unassigned: lane.unassigned,
          }))}
          selectedEventId={selectedEvent?.id || null}
          enabledEventTypes={enabledEventTypes}
          installerFilter={installerFilter}
          projectFilter={projectFilter}
          searchQuery={searchQuery}
          areFiltersOpen={areFiltersOpen}
          canManageCalendar={canManageCalendar}
          privilegedActionHint={privilegedActionHint}
          isLoading={eventsQuery.isLoading}
          eventTypeLabel={(eventType) => localizedEventType(eventType, locale)}
          laneLoadLabel={(crewId) => {
            const lane = lanes.find((item) => item.id === crewId);
            return lane ? localizedLaneLoad(lane, locale) : "";
          }}
          onAddEvent={onOpenCreate}
          onMovePeriod={onMovePeriod}
          onToday={onToday}
          onChangeView={onChangeView}
          onSelectDate={onSelectDate}
          onToggleEventType={onToggleEventType}
          onSelectEvent={onSelectCalendarEvent}
          onSelectCrew={(crewId) => {
            const lane = lanes.find((item) => item.id === crewId);
            if (lane) {
              onSelectLane(lane);
            }
          }}
          onSearchChange={setSearchQuery}
          onInstallerFilterChange={setInstallerFilter}
          onProjectFilterChange={setProjectFilter}
          onToggleFilters={() => setAreFiltersOpen((current) => !current)}
          onExport={onExportWeek}
          onPrint={() => window.print()}
        />

      </div>

      <Dialog open={isCreateOpen || isEditOpen} onOpenChange={(open) => {
        if (!open) closeEventDialog();
      }}>
          <DialogContent aria-describedby={undefined} className="w-[calc(100vw-2rem)] max-w-[720px] max-h-[calc(100dvh-2rem)]">
            <div className="pe-6">
              <DialogTitle className="text-[16px] font-semibold">
                {isEditOpen
                  ? copy("Edit Event", "Изменить событие", "ערוך אירוע")
                  : copy("Create Event", "Создать событие", "צור אירוע")}
              </DialogTitle>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="field-stack">
                <label className="field-label">
                  {copy("Title", "Название", "כותרת")}
                </label>
                <input
                  aria-label={copy("Title", "Название", "כותרת")}
                  value={form.title}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                  disabled={!canManageCalendar}
                  className="control-input"
                />
              </div>
              <div className="field-stack">
                <label className="field-label">
                  {copy("Type", "Тип", "סוג")}
                </label>
                <select
                  aria-label={copy("Type", "Тип", "סוג")}
                  value={form.event_type}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      event_type: event.target.value as EventType,
                    }))
                  }
                  disabled={!canManageCalendar}
                  className="control-input"
                >
                  {EVENT_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {localizedEventType(option.value, locale)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field-stack">
                <label className="field-label">
                  {copy("Date", "Дата", "תאריך")}
                </label>
                <input
                  aria-label={copy("Date", "Дата", "תאריך")}
                  type="date"
                  value={form.date}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      date: event.target.value,
                      // The end moves by the same number of days, so the event keeps its length.
                      end_date: shiftDate(prev.end_date, daysBetween(prev.date, event.target.value)) || event.target.value,
                    }))
                  }
                  disabled={!canManageCalendar}
                  className="control-input"
                />
              </div>
              <div className="field-stack">
                <label className="field-label">
                  {copy("End date", "Дата окончания", "תאריך סיום")}
                </label>
                <input
                  aria-label={copy("End date", "Дата окончания", "תאריך סיום")}
                  type="date"
                  value={form.end_date}
                  min={form.date}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, end_date: event.target.value }))
                  }
                  disabled={!canManageCalendar}
                  className="control-input"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="field-stack">
                  <label className="field-label">
                    {copy("Start", "Начало", "התחלה")}
                  </label>
                  <input
                    aria-label={copy("Start", "Начало", "התחלה")}
                    type="time"
                    value={form.starts_at_hhmm}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        starts_at_hhmm: event.target.value,
                      }))
                    }
                    disabled={!canManageCalendar}
                    className="control-input"
                  />
                </div>
                <div className="field-stack">
                  <label className="field-label">
                    {copy("End", "Конец", "סיום")}
                  </label>
                  <input
                    aria-label={copy("End", "Конец", "סיום")}
                    type="time"
                    value={form.ends_at_hhmm}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        ends_at_hhmm: event.target.value,
                      }))
                    }
                    disabled={!canManageCalendar}
                    className="control-input"
                  />
                </div>
              </div>
              <div className="field-stack">
                <label className="field-label">
                  {copy("Location", "Локация", "מיקום")}
                </label>
                <input
                  aria-label={copy("Location", "Локация", "מיקום")}
                  value={form.location}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, location: event.target.value }))
                  }
                  disabled={!canManageCalendar}
                  className="control-input"
                />
              </div>
              <div className="field-stack">
                <label className="field-label">
                  {copy("Project", "Проект", "פרויקט")}
                </label>
                <select
                  aria-label={copy("Project", "Проект", "פרויקט")}
                  value={form.project_id}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, project_id: event.target.value }))
                  }
                  disabled={!canManageCalendar}
                  className="control-input"
                >
                  <option value="">
                    {copy("No project", "Без проекта", "ללא פרויקט")}
                  </option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field-stack mt-4">
              <label className="field-label">
                {copy("Description", "Описание", "תיאור")}
              </label>
              <textarea
                aria-label={copy("Description", "Описание", "תיאור")}
                rows={3}
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, description: event.target.value }))
                }
                disabled={!canManageCalendar}
                className="control-textarea"
              />
            </div>

            <div className="field-stack mt-4">
              <label className="field-label">
                {copy("Installers", "Монтажники", "מתקינים")}
              </label>
              <div className="max-h-[160px] space-y-1 overflow-auto rounded-lg border border-border bg-surface-subtle p-3">
                {activeInstallers.map((installer) => (
                  <label key={installer.id} className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={form.installer_ids.includes(installer.id)}
                      disabled={!canManageCalendar}
                      onChange={() => onToggleInstaller(installer.id)}
                    />
                    {installer.full_name}
                  </label>
                ))}
              </div>
            </div>
            {isInvalidTimeRange && (
              <div role="alert" className="mt-4 rounded-lg border border-status-warning-border bg-status-warning-bg px-3 py-2 text-[12px] text-status-warning-fg">
                {copy(
                  "The end must be later than the start.",
                  "Окончание должно быть позже начала.",
                  "הסיום חייב להיות מאוחר מההתחלה.",
                )}
              </div>
            )}

            {hasActionError && (
              <InlineNotice tone="error">{actionErrorMessage}</InlineNotice>
            )}
            <div className="modal-footer">
              {isEditOpen && editingEvent ? (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteOpen(true)}
                  disabled={!canManageCalendar || deleteMutation.isPending || updateMutation.isPending}
                  title={privilegedActionHint}
                  className="dmx-secondary-action h-10 text-status-problem-fg disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                  {copy("Delete", "Удалить", "מחק")}
                </button>
              ) : null}
              {editingEvent ? (
                <ConfirmActionDialog
                  open={confirmDeleteOpen}
                  onOpenChange={setConfirmDeleteOpen}
                  title={copy("Delete the event?", "Удалить событие?", "למחוק את האירוע?")}
                  changes={copy(
                    `"${editingEvent.title}" is removed from the schedule of every assigned installer.`,
                    `«${editingEvent.title}» исчезнет из графика всех назначенных монтажников.`,
                    `"${editingEvent.title}" יוסר מהלוח של כל המתקינים המשובצים.`,
                  )}
                  confirmLabel={copy("Delete", "Удалить", "מחק")}
                  tone="danger"
                  busy={deleteMutation.isPending}
                  onConfirm={async () => {
                    try {
                      await deleteMutation.mutateAsync(editingEvent.id);
                    } catch {
                      // The error is shown inside the event editor, which stays open for a retry.
                    } finally {
                      setConfirmDeleteOpen(false);
                    }
                  }}
                  testId="calendar-delete-confirm"
                />
              ) : null}
              <button
                onClick={closeEventDialog}
                className="dmx-secondary-action h-10"
              >
                {copy("Cancel", "Отмена", "בטל")}
              </button>
              <button
                onClick={() =>
                  isEditOpen ? updateMutation.mutate() : createMutation.mutate()
                }
                disabled={
                  !canManageCalendar ||
                  !form.title.trim() ||
                  isInvalidTimeRange ||
                  createMutation.isPending ||
                  updateMutation.isPending ||
                  deleteMutation.isPending
                }
                title={privilegedActionHint}
                className="dmx-primary-action h-10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isEditOpen
                  ? copy("Save Changes", "Сохранить изменения", "שמור שינויים")
                  : copy("Create Event", "Создать событие", "צור אירוע")}
              </button>
            </div>
          </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
