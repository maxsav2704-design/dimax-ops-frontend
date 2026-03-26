import { useCallback, useState, type ElementType, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  Building2,
  Calendar,
  Clock,
  Edit3,
  FileText,
  History,
  Mail,
  MapPin,
  Phone,
  Save,
  Shield,
  Trash2,
  User,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

export interface CalendarEvent {
  id: string;
  title: string;
  location?: string;
  date: string;
  startTime: string;
  endTime: string;
  type: EventType;
  assignees: { initials: string; color: string; name?: string }[];
}

export type EventType =
  | "installation"
  | "delivery"
  | "meeting"
  | "consultation"
  | "inspection";

const STATUS_MAP: Record<EventType, { label: string; color: string }> = {
  installation: { label: "Монтаж", color: "bg-emerald-500" },
  delivery: { label: "Доставка", color: "bg-amber-500" },
  meeting: { label: "Встреча", color: "bg-violet-400" },
  consultation: { label: "Консультация", color: "bg-amber-400" },
  inspection: { label: "Проверка", color: "bg-sky-500" },
};

const PEOPLE = [
  {
    name: "David Cohen",
    initials: "DC",
    color: "bg-blue-600",
    role: "Lead Installer",
    phone: "+972-50-123-4567",
    email: "david@dimax.co.il",
    rating: 4.8,
    jobs: 142,
    status: "active" as const,
  },
  {
    name: "Sarah Miller",
    initials: "SM",
    color: "bg-emerald-600",
    role: "Senior Installer",
    phone: "+972-52-987-6543",
    email: "sarah@dimax.co.il",
    rating: 4.6,
    jobs: 98,
    status: "active" as const,
  },
  {
    name: "Michael Jordan",
    initials: "MJ",
    color: "bg-red-500",
    role: "Installer",
    phone: "+972-54-111-2233",
    email: "michael@dimax.co.il",
    rating: 4.4,
    jobs: 67,
    status: "busy" as const,
  },
  {
    name: "Rachel Green",
    initials: "RG",
    color: "bg-amber-600",
    role: "Junior Installer",
    phone: "+972-53-444-5566",
    email: "rachel@dimax.co.il",
    rating: 4.2,
    jobs: 34,
    status: "active" as const,
  },
];

const AUDIT_TRAIL = [
  { action: "Создано", by: "Admin", date: "2026-02-01 09:15" },
  { action: "Назначен монтажник: DC", by: "Admin", date: "2026-02-02 14:30" },
  { action: "Обновлено время", by: "Manager", date: "2026-02-05 11:00" },
];

function Section({
  icon: Icon,
  title,
  children,
  className,
}: {
  icon: ElementType;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("border-b border-border/60 py-5", className)}>
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/8">
          <Icon className="h-3.5 w-3.5 text-accent" strokeWidth={1.8} />
        </div>
        <h3 className="text-[13px] font-semibold tracking-tight text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function InfoRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: ElementType;
}) {
  return (
    <div className="group/row flex items-start justify-between gap-4 py-1.5">
      <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
        {Icon && (
          <Icon className="h-3 w-3 opacity-50 transition-all duration-200 group-hover/row:text-accent group-hover/row:opacity-100" />
        )}
        {label}
      </span>
      <span className="max-w-[55%] truncate text-right text-[12.5px] font-medium text-foreground">{value}</span>
    </div>
  );
}

interface Props {
  event: CalendarEvent | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (event: CalendarEvent) => void;
  onDelete: (id: string) => void;
}

export function EventControlPanel({ event, open, onClose, onUpdate, onDelete }: Props) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    location: "",
    date: "",
    startTime: "",
    endTime: "",
    type: "installation" as EventType,
    assignee: "",
  });

  const startEdit = useCallback(() => {
    if (!event) return;
    setEditForm({
      title: event.title,
      location: event.location || "",
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      type: event.type,
      assignee: event.assignees[0]?.initials || "DC",
    });
    setEditing(true);
  }, [event]);

  const saveEdit = useCallback(() => {
    if (!event) return;
    const person = PEOPLE.find((item) => item.initials === editForm.assignee) || PEOPLE[0];
    onUpdate({
      ...event,
      title: editForm.title,
      location: editForm.location || undefined,
      date: editForm.date,
      startTime: editForm.startTime,
      endTime: editForm.endTime,
      type: editForm.type,
      assignees: [{ initials: person.initials, color: person.color, name: person.name }],
    });
    setEditing(false);
    toast({ title: "Событие обновлено", description: "Изменения сохранены." });
  }, [editForm, event, onUpdate, toast]);

  const confirmDelete = useCallback(() => {
    if (!event) return;
    onDelete(event.id);
    setDeleteOpen(false);
    toast({ title: "Событие удалено", description: "Расписание обновлено." });
  }, [event, onDelete, toast]);

  if (!event) return null;

  const installer = PEOPLE.find((item) => item.initials === event.assignees[0]?.initials) || PEOPLE[0];
  const statusInfo = STATUS_MAP[event.type];
  const durationMinutes = (() => {
    const [startHours, startMinutes] = event.startTime.split(":").map(Number);
    const [endHours, endMinutes] = event.endTime.split(":").map(Number);
    return endHours * 60 + endMinutes - (startHours * 60 + startMinutes);
  })();

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-foreground/10 backdrop-blur-[2px] transition-opacity duration-300",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
      />

      <div
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full w-[420px] translate-x-full flex-col overflow-hidden border-l border-border bg-card shadow-[-24px_0_64px_-16px_hsl(var(--foreground)/0.08)] transition-transform duration-300 [transition-timing-function:cubic-bezier(0.25,0.46,0.45,0.94)]",
          open && "translate-x-0"
        )}
      >
        <div className="flex items-center justify-between border-b border-border/60 p-5 pb-4">
          <div className="flex items-center gap-3">
            <div className={cn("h-2.5 w-2.5 rounded-full", statusInfo.color)} />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {statusInfo.label}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {!editing ? (
              <button
                onClick={startEdit}
                className="group/e flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-200 hover:bg-secondary"
              >
                <Edit3 className="h-3.5 w-3.5 text-muted-foreground transition-colors duration-200 group-hover/e:text-accent" />
              </button>
            ) : (
              <button
                onClick={saveEdit}
                className="flex h-8 items-center gap-1.5 rounded-lg bg-accent px-3 text-[12px] font-semibold text-accent-foreground transition-all duration-200 hover:brightness-110"
              >
                <Save className="h-3 w-3" /> Сохранить
              </button>
            )}
            <button
              onClick={onClose}
              className="group/c flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-200 hover:bg-secondary"
            >
              <X className="h-4 w-4 text-muted-foreground transition-colors duration-200 group-hover/c:text-foreground" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5">
          <Section icon={Building2} title="Проект">
            {editing ? (
              <div className="space-y-3">
                <div>
                  <Label className="text-[11px] text-muted-foreground">Название</Label>
                  <Input
                    value={editForm.title}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, title: event.target.value }))}
                    className="mt-1 h-8 text-[13px]"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground">Адрес</Label>
                  <Input
                    value={editForm.location}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, location: event.target.value }))}
                    className="mt-1 h-8 text-[13px]"
                  />
                </div>
              </div>
            ) : (
              <>
                <p className="mb-2 text-[15px] font-semibold text-foreground">{event.title}</p>
                <InfoRow label="Адрес" value={event.location || "Не указан"} icon={MapPin} />
                <InfoRow label="Клиент" value="Mock Client Ltd." icon={User} />
                <InfoRow label="Этап" value="В работе" icon={Activity} />
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-success/15 bg-success/6 px-2.5 py-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-success" />
                  <span className="text-[11px] font-medium text-success">Без критических замечаний</span>
                </div>
              </>
            )}
          </Section>

          <Section icon={FileText} title="Детали задачи">
            {editing ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Дата</Label>
                    <Input
                      type="date"
                      value={editForm.date}
                      onChange={(event) => setEditForm((prev) => ({ ...prev, date: event.target.value }))}
                      className="mt-1 h-8 text-[13px]"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Тип</Label>
                    <Select
                      value={editForm.type}
                      onValueChange={(value) => setEditForm((prev) => ({ ...prev, type: value as EventType }))}
                    >
                      <SelectTrigger className="mt-1 h-8 text-[13px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_MAP).map(([key, value]) => (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center gap-2">
                              <div className={cn("h-2 w-2 rounded-full", value.color)} />
                              {value.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Начало</Label>
                    <Input
                      type="time"
                      value={editForm.startTime}
                      onChange={(event) => setEditForm((prev) => ({ ...prev, startTime: event.target.value }))}
                      className="mt-1 h-8 text-[13px]"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Конец</Label>
                    <Input
                      type="time"
                      value={editForm.endTime}
                      onChange={(event) => setEditForm((prev) => ({ ...prev, endTime: event.target.value }))}
                      className="mt-1 h-8 text-[13px]"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <>
                <InfoRow label="Тип" value={statusInfo.label} icon={FileText} />
                <InfoRow label="Дата" value={event.date} icon={Calendar} />
                <InfoRow label="Время" value={`${event.startTime} – ${event.endTime}`} icon={Clock} />
                <InfoRow
                  label="Длительность"
                  value={`${Math.floor(durationMinutes / 60)}ч ${durationMinutes % 60 > 0 ? `${durationMinutes % 60}м` : ""}`.trim()}
                  icon={Clock}
                />
                <InfoRow label="Статус" value="Запланировано" icon={Shield} />
              </>
            )}
          </Section>

          <Section icon={User} title="Назначенный монтажник">
            {editing ? (
              <Select value={editForm.assignee} onValueChange={(value) => setEditForm((prev) => ({ ...prev, assignee: value }))}>
                <SelectTrigger className="h-10 text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PEOPLE.map((person) => (
                    <SelectItem key={person.initials} value={person.initials}>
                      <div className="flex items-center gap-2.5">
                        <div className={cn("flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold text-white", person.color)}>
                          {person.initials}
                        </div>
                        <div>
                          <span className="text-[13px] font-medium">{person.name}</span>
                          <span className="ml-2 text-[11px] text-muted-foreground">{person.role}</span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm", installer.color)}>
                    {installer.initials}
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold text-foreground">{installer.name}</p>
                    <p className="text-[11px] text-muted-foreground">{installer.role}</p>
                  </div>
                  <div className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", installer.status === "active" ? "bg-success/10 text-success" : "bg-warning/10 text-warning") }>
                    {installer.status === "active" ? "свободен" : "занят"}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Рейтинг", value: `${installer.rating}` },
                    { label: "Объекты", value: String(installer.jobs) },
                    { label: "Загрузка", value: "72%" },
                  ].map((stat) => (
                    <div key={stat.label} className="group/s rounded-lg bg-secondary/50 p-2 text-center transition-colors duration-200 hover:bg-accent/6">
                      <p className="text-[14px] font-semibold text-foreground transition-colors duration-200 group-hover/s:text-accent">{stat.value}</p>
                      <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-1">
                  <InfoRow label="Телефон" value={installer.phone} icon={Phone} />
                  <InfoRow label="Email" value={installer.email} icon={Mail} />
                </div>
              </div>
            )}
          </Section>

          <Section icon={History} title="История" className="border-b-0">
            <div className="relative pl-4">
              <div className="absolute bottom-1 left-[5px] top-1 w-px bg-border" />
              {AUDIT_TRAIL.map((entry, index) => (
                <div key={index} className="group/a relative pb-3 last:pb-0">
                  <div className="absolute left-[-11px] top-1.5 h-2 w-2 rounded-full bg-border transition-colors duration-200 group-hover/a:bg-accent" />
                  <p className="text-[12px] font-medium text-foreground">{entry.action}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {entry.by} / {entry.date}
                  </p>
                </div>
              ))}
            </div>
          </Section>
        </div>

        <div className="border-t border-border/60 p-4">
          <button
            onClick={() => setDeleteOpen(true)}
            className="group/d flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-destructive/20 text-[12px] font-semibold text-destructive transition-all duration-200 hover:border-destructive/40 hover:bg-destructive/8"
          >
            <Trash2 className="h-3.5 w-3.5 transition-transform duration-200 group-hover/d:scale-110" />
            Удалить событие
          </button>
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-[15px]">
              <AlertTriangle className="h-4 w-4 text-destructive" /> Подтвердите удаление
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[13px]">
              Это действие изменит календарь и рабочее распределение. Событие <strong>{event.title}</strong> будет удалено без возможности восстановления.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-[13px]">Отмена</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-[13px] text-destructive-foreground hover:bg-destructive/90" onClick={confirmDelete}>
              Удалить событие
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
