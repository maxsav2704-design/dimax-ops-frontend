import { useMemo, useState } from "react";
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
import { useUserRole } from "@/hooks/use-user-role";
import { apiFetch } from "@/lib/api";
import { canRunPrivilegedAdminActions } from "@/lib/admin-access";
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
  const [weekStartDate, setWeekStartDate] = useState<Date>(startOfWeek(new Date()));
  const [filterType, setFilterType] = useState<EventType | "all">("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [form, setForm] = useState<EventFormState>(makeDefaultForm(weekStartDate));
  const userRole = useUserRole();
  const canManageCalendar = canRunPrivilegedAdminActions(userRole);
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
      await queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (eventId: string) =>
      apiFetch<{ ok: boolean }>(`/api/v1/admin/calendar/events/${eventId}`, {
        method: "DELETE",
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
    },
  });

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
    setIsCreateOpen(true);
  };

  const onOpenEdit = (event: CalendarEvent) => {
    setEditingEvent(event);
    setForm(eventToForm(event));
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
    (createMutation.error instanceof Error && createMutation.error.message) ||
    (updateMutation.error instanceof Error && updateMutation.error.message) ||
    (deleteMutation.error instanceof Error && deleteMutation.error.message) ||
    "Calendar action failed.";
  const isInvalidTimeRange = form.ends_at_hhmm <= form.starts_at_hhmm;

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-[1500px]">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl font-semibold text-foreground tracking-tight">Calendar</h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              Week planning for installation operations
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onPrevWeek}
              className="btn-premium h-9 w-9 rounded-lg border border-border bg-card flex items-center justify-center"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setWeekStartDate(startOfWeek(new Date()))}
              className="btn-premium h-9 px-3 rounded-lg border border-border bg-card text-[13px] font-medium"
            >
              Today
            </button>
            <button
              onClick={onNextWeek}
              className="btn-premium h-9 w-9 rounded-lg border border-border bg-card flex items-center justify-center"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={onOpenCreate}
              disabled={!canManageCalendar}
              title={privilegedActionHint}
              className="h-9 px-4 rounded-lg bg-accent text-accent-foreground text-[13px] font-medium flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              Add Event
            </button>
          </div>
        </div>

        {hasLoadError && (
          <div className="mb-4 rounded-lg border border-[hsl(var(--destructive)/0.35)] bg-[hsl(var(--destructive)/0.08)] px-4 py-3 text-[13px] text-[hsl(var(--destructive))]">
            Failed to load calendar data.
          </div>
        )}
        {hasActionError && (
          <div className="mb-4 rounded-lg border border-[hsl(var(--destructive)/0.35)] bg-[hsl(var(--destructive)/0.08)] px-4 py-3 text-[13px] text-[hsl(var(--destructive))]">
            {actionErrorMessage}
          </div>
        )}
        {!canManageCalendar && (
          <div className="mb-4 rounded-lg border border-[hsl(var(--warning)/0.35)] bg-[hsl(var(--warning)/0.08)] px-4 py-3 text-[13px] text-[hsl(var(--warning-foreground))]">
            Installer role has read-only access to calendar planning.
          </div>
        )}

        <div className="glass-card rounded-xl p-4 mb-4 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilterType("all")}
            className={cn(
              "h-8 px-3 rounded-md text-[12px] border",
              filterType === "all"
                ? "bg-accent text-accent-foreground border-accent"
                : "bg-card border-border text-muted-foreground"
            )}
          >
            All
          </button>
          {EVENT_TYPE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setFilterType(option.value)}
              className={cn(
                "h-8 px-3 rounded-md text-[12px] border capitalize",
                filterType === option.value
                  ? "bg-accent text-accent-foreground border-accent"
                  : "bg-card border-border text-muted-foreground"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-7 gap-3">
          {weekDays.map((day) => {
            const key = fromIsoToDate(day.toISOString());
            const dayEvents = eventsByDay.get(key) || [];
            return (
              <section key={key} className="glass-card rounded-xl p-3 min-h-[260px]">
                <div className="mb-3">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {labelDate(day.toISOString())}
                  </div>
                </div>
                <div className="space-y-2">
                  {eventsQuery.isLoading && (
                    <div className="text-[12px] text-muted-foreground">Loading...</div>
                  )}
                  {!eventsQuery.isLoading && dayEvents.length === 0 && (
                    <div className="text-[12px] text-muted-foreground">No events</div>
                  )}
                  {dayEvents.map((event) => (
                    <article key={event.id} className="rounded-lg border border-border bg-background p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-[12px] font-semibold text-card-foreground leading-tight">
                            {event.title}
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            {fromIsoToHHMM(event.starts_at)} - {fromIsoToHHMM(event.ends_at)}
                          </div>
                        </div>
                        <span
                          className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded-md capitalize",
                            EVENT_BADGE_CLASS[event.event_type]
                          )}
                        >
                          {event.event_type}
                        </span>
                      </div>
                      {event.location ? (
                        <div className="text-[11px] text-muted-foreground mt-1 truncate">
                          {event.location}
                        </div>
                      ) : null}
                      <div className="mt-2 flex items-center justify-end gap-1">
                        <button
                          onClick={() => onOpenEdit(event)}
                          disabled={!canManageCalendar}
                          title={privilegedActionHint}
                          className="h-7 w-7 rounded-md border border-border bg-card flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteMutation.mutate(event.id)}
                          disabled={!canManageCalendar || deleteMutation.isPending}
                          title={privilegedActionHint}
                          className="h-7 w-7 rounded-md border border-border bg-card flex items-center justify-center text-[hsl(var(--destructive))] disabled:opacity-60 disabled:cursor-not-allowed"
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
          <div className="w-full max-w-[720px] rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[16px] font-semibold">
                {isEditOpen ? "Edit Event" : "Create Event"}
              </h2>
              <button
                onClick={() => {
                  setIsCreateOpen(false);
                  setIsEditOpen(false);
                  setEditingEvent(null);
                }}
                className="h-8 px-3 rounded-md border border-border text-[12px]"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] text-muted-foreground mb-1">Title</label>
                <input
                  aria-label="Title"
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  disabled={!canManageCalendar}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-[13px] disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-[12px] text-muted-foreground mb-1">Type</label>
                <select
                  aria-label="Type"
                  value={form.event_type}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, event_type: e.target.value as EventType }))
                  }
                  disabled={!canManageCalendar}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-[13px] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {EVENT_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[12px] text-muted-foreground mb-1">Date</label>
                <input
                  aria-label="Date"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                  disabled={!canManageCalendar}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-[13px] disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[12px] text-muted-foreground mb-1">Start</label>
                  <input
                    aria-label="Start"
                    type="time"
                    value={form.starts_at_hhmm}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, starts_at_hhmm: e.target.value }))
                    }
                    disabled={!canManageCalendar}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-[13px] disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[12px] text-muted-foreground mb-1">End</label>
                  <input
                    aria-label="End"
                    type="time"
                    value={form.ends_at_hhmm}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, ends_at_hhmm: e.target.value }))
                    }
                    disabled={!canManageCalendar}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-[13px] disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[12px] text-muted-foreground mb-1">Location</label>
                <input
                  aria-label="Location"
                  value={form.location}
                  onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
                  disabled={!canManageCalendar}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-[13px] disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-[12px] text-muted-foreground mb-1">Project</label>
                <select
                  aria-label="Project"
                  value={form.project_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, project_id: e.target.value }))}
                  disabled={!canManageCalendar}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-[13px] disabled:opacity-60 disabled:cursor-not-allowed"
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

            <div className="mt-3">
              <label className="block text-[12px] text-muted-foreground mb-1">Description</label>
              <textarea
                aria-label="Description"
                rows={3}
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                disabled={!canManageCalendar}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>

            <div className="mt-3">
              <label className="block text-[12px] text-muted-foreground mb-1">Installers</label>
              <div className="max-h-[140px] overflow-auto rounded-lg border border-border bg-background p-2 space-y-1">
                {(installersQuery.data || [])
                  .filter((installer) => installer.is_active)
                  .map((installer) => (
                    <label
                      key={installer.id}
                      className="flex items-center gap-2 text-[12px] text-card-foreground"
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
              <div className="mt-3 rounded-lg border border-[hsl(var(--warning)/0.35)] bg-[hsl(var(--warning)/0.08)] px-3 py-2 text-[12px] text-[hsl(var(--warning-foreground))]">
                End time must be later than start time.
              </div>
            )}

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setIsCreateOpen(false);
                  setIsEditOpen(false);
                  setEditingEvent(null);
                }}
                className="h-9 px-4 rounded-lg border border-border text-[13px]"
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
                className="h-9 px-4 rounded-lg bg-accent text-accent-foreground text-[13px] font-medium disabled:opacity-60 disabled:cursor-not-allowed"
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


