import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuthSession } from "@/hooks/use-auth-session";
import { apiFetch } from "@/lib/api";
import { readableApiError } from "@/lib/api-error-display";
import { canRunPrivilegedAdminActions } from "@/lib/admin-access";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type EventType = "installation" | "delivery" | "meeting" | "consultation" | "inspection";

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
};

type EventListResponse = {
  items: CalendarEvent[];
};

type InstallerItem = {
  id: string;
  full_name: string;
  is_active: boolean;
};

type ProjectListResponse = {
  items: Array<{
    id: string;
    name: string;
    address: string;
    status: string;
  }>;
};

type EventFormState = {
  title: string;
  event_type: EventType;
  date: string;
  starts_at_hhmm: string;
  ends_at_hhmm: string;
  location: string;
  description: string;
  project_id: string;
  installer_ids: string[];
};

const EVENT_TYPE_OPTIONS: Array<{ value: EventType; label: string }> = [
  { value: "installation", label: "Installation" },
  { value: "delivery", label: "Delivery" },
  { value: "meeting", label: "Meeting" },
  { value: "consultation", label: "Consultation" },
  { value: "inspection", label: "Inspection" },
];

const EVENT_BADGE_CLASS: Record<EventType, string> = {
  installation: "bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]",
  delivery: "bg-[hsl(var(--warning)/0.16)] text-[hsl(var(--warning-foreground))]",
  meeting: "bg-[hsl(var(--accent)/0.14)] text-[hsl(var(--accent))]",
  consultation: "bg-[hsl(var(--accent)/0.14)] text-[hsl(var(--accent))]",
  inspection: "bg-[hsl(var(--primary)/0.14)] text-[hsl(var(--primary))]",
};

function toIsoLocal(date: string, hhmm: string): string {
  return new Date(`${date}T${hhmm}:00`).toISOString();
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

function labelDate(value: string): string {
  const date = new Date(value);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function startOfWeek(base: Date): Date {
  const copy = new Date(base);
  const dow = copy.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  copy.setDate(copy.getDate() + mondayOffset);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function makeDefaultForm(weekStartDate: Date): EventFormState {
  const date = fromIsoToDate(weekStartDate.toISOString());
  return {
    title: "",
    event_type: "installation",
    date,
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
    starts_at_hhmm: fromIsoToHHMM(event.starts_at),
    ends_at_hhmm: fromIsoToHHMM(event.ends_at),
    location: event.location || "",
    description: event.description || "",
    project_id: event.project_id || "",
    installer_ids: event.installer_ids || [],
  };
}

export default function CalendarPage() {
  const queryClient = useQueryClient();
  const { locale } = useI18n();
  const [weekStartDate, setWeekStartDate] = useState<Date>(startOfWeek(new Date()));
  const [filterType, setFilterType] = useState<EventType | "all">("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [form, setForm] = useState<EventFormState>(makeDefaultForm(weekStartDate));
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const session = useAuthSession();
  const canManageCalendar = canRunPrivilegedAdminActions(session);
  const privilegedActionHint = canManageCalendar
    ? undefined
    : "Installer role is read-only in calendar";

  const weekStartIso = weekStartDate.toISOString();
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekStartDate.getDate() + 7);
  const weekEndIso = weekEndDate.toISOString();

  const eventsQuery = useQuery({
    queryKey: ["calendar-events", weekStartIso, weekEndIso],
    queryFn: () =>
      apiFetch<EventListResponse>(
        `/api/v1/admin/calendar/events?starts_at=${encodeURIComponent(
          weekStartIso
        )}&ends_at=${encodeURIComponent(weekEndIso)}`
      ),
    refetchInterval: 30_000,
  });

  const installersQuery = useQuery({
    queryKey: ["calendar-installers"],
    queryFn: () => apiFetch<InstallerItem[]>("/api/v1/admin/installers?limit=200"),
  });

  const projectsQuery = useQuery({
    queryKey: ["calendar-projects"],
    queryFn: () => apiFetch<ProjectListResponse>("/api/v1/admin/projects"),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ id: string }>("/api/v1/admin/calendar/events", {
        method: "POST",
        body: JSON.stringify({
          title: form.title.trim(),
          event_type: form.event_type,
          starts_at: toIsoLocal(form.date, form.starts_at_hhmm),
          ends_at: toIsoLocal(form.date, form.ends_at_hhmm),
          location: form.location.trim() || null,
          description: form.description.trim() || null,
          project_id: form.project_id || null,
          installer_ids: form.installer_ids,
        }),
      }),
    onSuccess: async () => {
      setIsCreateOpen(false);
      setForm(makeDefaultForm(weekStartDate));
      setActionNotice(
        locale === "ru" ? "Событие создано." : locale === "he" ? "האירוע נוצר." : "Event created."
      );
      await queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editingEvent) {
        throw new Error("No event selected");
      }
      return apiFetch<{ ok: boolean }>(`/api/v1/admin/calendar/events/${editingEvent.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: form.title.trim(),
          event_type: form.event_type,
          starts_at: toIsoLocal(form.date, form.starts_at_hhmm),
          ends_at: toIsoLocal(form.date, form.ends_at_hhmm),
          location: form.location.trim() || null,
          description: form.description.trim() || null,
          project_id: form.project_id || null,
          installer_ids: form.installer_ids,
        }),
      });
    },
    onSuccess: async () => {
      setIsEditOpen(false);
      setEditingEvent(null);
      setActionNotice(
        locale === "ru" ? "Событие обновлено." : locale === "he" ? "האירוע עודכן." : "Event updated."
      );
      await queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (eventId: string) =>
      apiFetch<{ ok: boolean }>(`/api/v1/admin/calendar/events/${eventId}`, {
        method: "DELETE",
      }),
    onSuccess: async () => {
      setActionNotice(
        locale === "ru" ? "Событие удалено." : locale === "he" ? "האירוע נמחק." : "Event deleted."
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

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStartDate);
      d.setDate(weekStartDate.getDate() + i);
      return d;
    });
  }, [weekStartDate]);

  const eventsByDay = useMemo(() => {
    const rows = eventsQuery.data?.items || [];
    const filtered = rows
      .filter((item) => filterType === "all" || item.event_type === filterType)
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    const map = new Map<string, CalendarEvent[]>();
    for (const day of weekDays) {
      const key = fromIsoToDate(day.toISOString());
      map.set(key, []);
    }
    for (const event of filtered) {
      const key = fromIsoToDate(event.starts_at);
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(event);
    }
    return map;
  }, [eventsQuery.data?.items, filterType, weekDays]);

  const visibleEventsCount = useMemo(
    () => Array.from(eventsByDay.values()).reduce((total, dayEvents) => total + dayEvents.length, 0),
    [eventsByDay]
  );

  const activeDaysCount = useMemo(
    () => Array.from(eventsByDay.values()).filter((dayEvents) => dayEvents.length > 0).length,
    [eventsByDay]
  );

  const onPrevWeek = () => {
    const next = new Date(weekStartDate);
    next.setDate(weekStartDate.getDate() - 7);
    setWeekStartDate(next);
    setForm(makeDefaultForm(next));
  };

  const onNextWeek = () => {
    const next = new Date(weekStartDate);
    next.setDate(weekStartDate.getDate() + 7);
    setWeekStartDate(next);
    setForm(makeDefaultForm(next));
  };

  const onOpenCreate = () => {
    setForm(makeDefaultForm(weekStartDate));
    setActionNotice(null);
    setIsCreateOpen(true);
  };

  const onOpenEdit = (event: CalendarEvent) => {
    setEditingEvent(event);
    setForm(eventToForm(event));
    setActionNotice(null);
    setIsEditOpen(true);
  };

  const onToggleInstaller = (installerId: string) => {
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

  const hasLoadError =
    eventsQuery.isError || installersQuery.isError || projectsQuery.isError;
  const hasActionError =
    createMutation.isError || updateMutation.isError || deleteMutation.isError;
  const actionErrorMessage =
    (createMutation.error &&
      readableApiError(createMutation.error, locale, "Calendar action failed.")) ||
    (updateMutation.error &&
      readableApiError(updateMutation.error, locale, "Calendar action failed.")) ||
    (deleteMutation.error &&
      readableApiError(deleteMutation.error, locale, "Calendar action failed.")) ||
    "Calendar action failed.";
  const loadErrorMessage = readableApiError(
    eventsQuery.error || installersQuery.error || projectsQuery.error,
    locale,
    "Failed to load calendar data."
  );
  const isInvalidTimeRange = form.ends_at_hhmm <= form.starts_at_hhmm;

  return (
    <DashboardLayout>
      <div className="page-shell page-stack motion-stagger">
        <section className="page-hero">
          <div className="relative z-10 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <div className="page-eyebrow">Weekly planning</div>
              <h1 className="mt-3 font-display text-3xl tracking-[-0.04em] text-foreground sm:text-4xl">
                Calendar
              </h1>
              <p className="mt-3 max-w-2xl text-[14px] leading-7 text-muted-foreground">
                Week planning for installation operations, service visits, and project-linked crew time.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="metric-chip">Visible events {visibleEventsCount}</span>
                <span className="metric-chip">Active days {activeDaysCount}</span>
                <span className="metric-chip">Scope {filterType}</span>
              </div>
            </div>
            <div className="surface-subtle min-w-[320px] max-w-xl space-y-4 p-4 sm:p-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="flex min-h-[92px] flex-col rounded-2xl border border-border/70 bg-background/70 px-3 py-3">
                  <div className="metric-label">Week start</div>
                  <div className="mt-auto pt-2 text-lg font-semibold text-foreground">
                    {labelDate(weekStartDate.toISOString())}
                  </div>
                </div>
                <div className="flex min-h-[92px] flex-col rounded-2xl border border-border/70 bg-background/70 px-3 py-3">
                  <div className="metric-label">Filter</div>
                  <div className="mt-auto pt-2 text-lg font-semibold capitalize text-foreground">
                    {filterType}
                  </div>
                </div>
                <div className="flex min-h-[92px] flex-col rounded-2xl border border-border/70 bg-background/70 px-3 py-3">
                  <div className="metric-label">Mode</div>
                  <div className="mt-auto pt-2 text-lg font-semibold text-foreground">
                    {canManageCalendar ? "Manage" : "Read only"}
                  </div>
                </div>
              </div>
              <div className="toolbar-row items-stretch">
                <button
                  onClick={onPrevWeek}
                  className="btn-premium h-10 w-10 rounded-xl border border-border bg-card/80 flex items-center justify-center"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setWeekStartDate(startOfWeek(new Date()))}
                  className="btn-premium h-10 rounded-xl border border-border bg-card/80 px-4 text-[13px] font-medium"
                >
                  Today
                </button>
                <button
                  onClick={onNextWeek}
                  className="btn-premium h-10 w-10 rounded-xl border border-border bg-card/80 flex items-center justify-center"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={onOpenCreate}
                  disabled={!canManageCalendar}
                  title={privilegedActionHint}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-[13px] font-medium text-accent-foreground shadow-[0_16px_34px_-18px_hsl(var(--accent)/0.55)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Plus className="w-4 h-4" />
                  Add Event
                </button>
              </div>
            </div>
          </div>
        </section>

        <div className="toolbar-panel">
          <div className="toolbar-row">
            <button
              onClick={() => setFilterType("all")}
              className={cn(
                "h-9 rounded-xl border px-3 text-[12px] font-medium",
                filterType === "all"
                  ? "bg-accent text-accent-foreground border-accent"
                  : "bg-background/70 border-border/70 text-muted-foreground"
              )}
            >
              All
            </button>
            {EVENT_TYPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setFilterType(option.value)}
                className={cn(
                  "h-9 rounded-xl border px-3 text-[12px] font-medium capitalize",
                  filterType === option.value
                    ? "bg-accent text-accent-foreground border-accent"
                    : "bg-background/70 border-border/70 text-muted-foreground"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {hasLoadError && (
          <div className="rounded-xl border border-[hsl(var(--destructive)/0.35)] bg-[hsl(var(--destructive)/0.08)] px-4 py-3 text-[13px] text-[hsl(var(--destructive))]">
            {loadErrorMessage}
          </div>
        )}
        {hasActionError && (
          <div className="rounded-xl border border-[hsl(var(--destructive)/0.35)] bg-[hsl(var(--destructive)/0.08)] px-4 py-3 text-[13px] text-[hsl(var(--destructive))]">
            {actionErrorMessage}
          </div>
        )}
        {actionNotice && (
          <div className="rounded-xl border border-[hsl(var(--success)/0.35)] bg-[hsl(var(--success)/0.08)] px-4 py-3 text-[13px] text-[hsl(var(--success))]">
            {actionNotice}
          </div>
        )}
        {!canManageCalendar && (
          <div className="rounded-xl border border-[hsl(var(--warning)/0.35)] bg-[hsl(var(--warning)/0.08)] px-4 py-3 text-[13px] text-[hsl(var(--warning-foreground))]">
            Installer role has read-only access to calendar planning.
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-7">
          {weekDays.map((day) => {
            const key = fromIsoToDate(day.toISOString());
            const dayEvents = eventsByDay.get(key) || [];
            return (
              <section key={key} className="surface-panel panel-pad-sm min-h-[280px]">
                <div className="mb-4 border-b border-border/60 pb-3">
                  <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    {labelDate(day.toISOString())}
                  </div>
                  <div className="mt-2 text-[12px] leading-6 text-muted-foreground">
                    {dayEvents.length > 0 ? `${dayEvents.length} scheduled items` : "No scheduled items"}
                  </div>
                </div>
                <div className="space-y-2">
                  {eventsQuery.isLoading && (
                    <div className="text-[12px] leading-6 text-muted-foreground">Loading...</div>
                  )}
                  {!eventsQuery.isLoading && dayEvents.length === 0 && (
                    <div className="rounded-xl border border-dashed border-border/70 px-3 py-4 text-[12px] leading-6 text-muted-foreground">
                      No events
                    </div>
                  )}
                  {dayEvents.map((event) => (
                    <article key={event.id} className="rounded-2xl border border-border/70 bg-background/70 p-3 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.3)]">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-[12px] font-semibold leading-5 text-card-foreground">
                            {event.title}
                          </div>
                          <div className="mt-1 text-[11px] leading-5 text-muted-foreground">
                            {fromIsoToHHMM(event.starts_at)} - {fromIsoToHHMM(event.ends_at)}
                          </div>
                        </div>
                        <span
                          className={cn(
                            "rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]",
                            EVENT_BADGE_CLASS[event.event_type]
                          )}
                        >
                          {event.event_type}
                        </span>
                      </div>
                      {event.location ? (
                        <div className="mt-2 text-[11px] leading-5 text-muted-foreground">
                          {event.location}
                        </div>
                      ) : null}
                      <div className="mt-3 flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onOpenEdit(event)}
                          disabled={!canManageCalendar}
                          title={privilegedActionHint}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border/70 bg-background/80 transition-colors hover:border-accent/35 hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteMutation.mutate(event.id)}
                          disabled={!canManageCalendar || deleteMutation.isPending}
                          title={privilegedActionHint}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border/70 bg-background/80 text-[hsl(var(--destructive))] transition-colors hover:border-[hsl(var(--destructive)/0.4)] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {(isCreateOpen || isEditOpen) && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="modal-shell max-w-[720px]">
            <div className="modal-header">
              <h2 className="text-[16px] font-semibold">
                {isEditOpen ? "Edit Event" : "Create Event"}
              </h2>
              <button
                onClick={() => {
                  setIsCreateOpen(false);
                  setIsEditOpen(false);
                  setEditingEvent(null);
                }}
                className="inline-flex h-9 items-center rounded-xl border border-border/70 px-3 text-[12px] font-medium text-muted-foreground transition-colors hover:border-accent/35 hover:text-accent"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="field-stack">
                <label className="field-label">Title</label>
                <input
                  aria-label="Title"
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  disabled={!canManageCalendar}
                  className="control-input"
                />
              </div>
              <div className="field-stack">
                <label className="field-label">Type</label>
                <select
                  aria-label="Type"
                  value={form.event_type}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, event_type: e.target.value as EventType }))
                  }
                  disabled={!canManageCalendar}
                  className="control-input"
                >
                  {EVENT_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field-stack">
                <label className="field-label">Date</label>
                <input
                  aria-label="Date"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                  disabled={!canManageCalendar}
                  className="control-input"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="field-stack">
                  <label className="field-label">Start</label>
                  <input
                    aria-label="Start"
                    type="time"
                    value={form.starts_at_hhmm}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, starts_at_hhmm: e.target.value }))
                    }
                    disabled={!canManageCalendar}
                    className="control-input"
                  />
                </div>
                <div className="field-stack">
                  <label className="field-label">End</label>
                  <input
                    aria-label="End"
                    type="time"
                    value={form.ends_at_hhmm}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, ends_at_hhmm: e.target.value }))
                    }
                    disabled={!canManageCalendar}
                    className="control-input"
                  />
                </div>
              </div>
              <div className="field-stack">
                <label className="field-label">Location</label>
                <input
                  aria-label="Location"
                  value={form.location}
                  onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
                  disabled={!canManageCalendar}
                  className="control-input"
                />
              </div>
              <div className="field-stack">
                <label className="field-label">Project</label>
                <select
                  aria-label="Project"
                  value={form.project_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, project_id: e.target.value }))}
                  disabled={!canManageCalendar}
                  className="control-input"
                >
                  <option value="">No project</option>
                  {(projectsQuery.data?.items || []).map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field-stack mt-4">
              <label className="field-label">Description</label>
              <textarea
                aria-label="Description"
                rows={3}
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                disabled={!canManageCalendar}
                className="control-textarea"
              />
            </div>

            <div className="field-stack mt-4">
              <label className="field-label">Installers</label>
              <div className="max-h-[160px] space-y-1 overflow-auto rounded-2xl border border-border/70 bg-background/80 p-3">
                {(installersQuery.data || [])
                  .filter((installer) => installer.is_active)
                  .map((installer) => (
                    <label
                      key={installer.id}
                      className="checkbox-row"
                    >
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
              <div className="mt-4 rounded-xl border border-[hsl(var(--warning)/0.35)] bg-[hsl(var(--warning)/0.08)] px-3 py-2 text-[12px] text-[hsl(var(--warning-foreground))]">
                End time must be later than start time.
              </div>
            )}

            <div className="modal-footer">
              <button
                onClick={() => {
                  setIsCreateOpen(false);
                  setIsEditOpen(false);
                  setEditingEvent(null);
                }}
                className="inline-flex h-10 items-center rounded-xl border border-border/70 px-4 text-[13px] font-medium text-muted-foreground transition-colors hover:border-accent/35 hover:text-accent"
              >
                Cancel
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
                  updateMutation.isPending
                }
                title={privilegedActionHint}
                className="inline-flex h-10 items-center rounded-xl bg-accent px-4 text-[13px] font-medium text-accent-foreground shadow-[0_16px_34px_-18px_hsl(var(--accent)/0.55)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isEditOpen ? "Save Changes" : "Create Event"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}



