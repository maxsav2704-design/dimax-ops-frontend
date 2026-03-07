import { useState, useCallback } from "react";
import {
  X, MapPin, Clock, User, Calendar, FileText, Shield,
  ChevronRight, Phone, Mail, AlertTriangle, Trash2,
  Edit3, Save, Star, Activity, History, Building2, Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

/* ── Types ── */
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
  installation: { label: "Installation", color: "bg-emerald-500" },
  delivery: { label: "Delivery", color: "bg-amber-500" },
  meeting: { label: "Meeting", color: "bg-violet-400" },
  consultation: { label: "Consultation", color: "bg-amber-400" },
  inspection: { label: "Inspection", color: "bg-sky-500" },
};

const PEOPLE = [
  { name: "David Cohen", initials: "DC", color: "bg-blue-600", role: "Lead Installer", phone: "+972-50-123-4567", email: "david@dimax.co.il", rating: 4.8, jobs: 142, status: "active" as const },
  { name: "Sarah Miller", initials: "SM", color: "bg-emerald-600", role: "Senior Installer", phone: "+972-52-987-6543", email: "sarah@dimax.co.il", rating: 4.6, jobs: 98, status: "active" as const },
  { name: "Michael Jordan", initials: "MJ", color: "bg-red-500", role: "Installer", phone: "+972-54-111-2233", email: "michael@dimax.co.il", rating: 4.4, jobs: 67, status: "busy" as const },
  { name: "Rachel Green", initials: "RG", color: "bg-amber-600", role: "Junior Installer", phone: "+972-53-444-5566", email: "rachel@dimax.co.il", rating: 4.2, jobs: 34, status: "active" as const },
];

const AUDIT_TRAIL = [
  { action: "Created", by: "Admin", date: "2026-02-01 09:15" },
  { action: "Installer assigned: DC", by: "Admin", date: "2026-02-02 14:30" },
  { action: "Time updated", by: "Manager", date: "2026-02-05 11:00" },
];

/* ── Section wrapper ── */
function Section({ icon: Icon, title, children, className }: {
  icon: React.ElementType; title: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn("py-5 border-b border-border/60", className)}>
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-7 h-7 rounded-lg bg-accent/8 flex items-center justify-center">
          <Icon className="w-3.5 h-3.5 text-accent" strokeWidth={1.8} />
        </div>
        <h3 className="text-[13px] font-semibold text-foreground tracking-tight">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function InfoRow({ label, value, icon: Icon }: { label: string; value: string; icon?: React.ElementType }) {
  return (
    <div className="flex items-start justify-between py-1.5 group/row">
      <span className="text-[12px] text-muted-foreground flex items-center gap-1.5">
        {Icon && <Icon className="w-3 h-3 opacity-50 group-hover/row:opacity-100 group-hover/row:text-accent transition-all duration-200" />}
        {label}
      </span>
      <span className="text-[12.5px] font-medium text-foreground text-right max-w-[55%] truncate">{value}</span>
    </div>
  );
}

/* ── Main Panel ── */
interface Props {
  event: CalendarEvent | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (ev: CalendarEvent) => void;
  onDelete: (id: string) => void;
}

export function EventControlPanel({ event, open, onClose, onUpdate, onDelete }: Props) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editForm, setEditForm] = useState({ title: "", location: "", date: "", startTime: "", endTime: "", type: "" as EventType, assignee: "" });

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
    const person = PEOPLE.find((p) => p.initials === editForm.assignee) || PEOPLE[0];
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
    toast({ title: "Event updated", description: "Changes saved successfully." });
  }, [event, editForm, onUpdate, toast]);

  const confirmDelete = useCallback(() => {
    if (!event) return;
    onDelete(event.id);
    setDeleteOpen(false);
    toast({ title: "Event removed", description: "Scheduling updated." });
  }, [event, onDelete, toast]);

  if (!event) return null;

  const installer = PEOPLE.find((p) => p.initials === event.assignees[0]?.initials) || PEOPLE[0];
  const sInfo = STATUS_MAP[event.type];
  const durationMin = (() => {
    const [sh, sm] = event.startTime.split(":").map(Number);
    const [eh, em] = event.endTime.split(":").map(Number);
    return (eh * 60 + em) - (sh * 60 + sm);
  })();

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-foreground/10 backdrop-blur-[2px] transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-[420px] bg-card border-l border-border shadow-[-24px_0_64px_-16px_hsl(var(--foreground)/0.08)] transition-transform duration-300 [transition-timing-function:cubic-bezier(0.25,0.46,0.45,0.94)] overflow-hidden flex flex-col",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-4 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className={cn("w-2.5 h-2.5 rounded-full", sInfo.color)} />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{sInfo.label}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {!editing ? (
              <button onClick={startEdit} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors duration-200 group/e">
                <Edit3 className="w-3.5 h-3.5 text-muted-foreground group-hover/e:text-accent transition-colors duration-200" />
              </button>
            ) : (
              <button onClick={saveEdit} className="h-8 px-3 rounded-lg bg-accent text-accent-foreground text-[12px] font-semibold flex items-center gap-1.5 hover:brightness-110 transition-all duration-200">
                <Save className="w-3 h-3" /> Save
              </button>
            )}
            <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors duration-200 group/c">
              <X className="w-4 h-4 text-muted-foreground group-hover/c:text-foreground transition-colors duration-200" />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5">
          {/* A) Project Section */}
          <Section icon={Building2} title="Project">
            {editing ? (
              <div className="space-y-3">
                <div><Label className="text-[11px] text-muted-foreground">Title</Label><Input value={editForm.title} onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))} className="h-8 text-[13px] mt-1" /></div>
                <div><Label className="text-[11px] text-muted-foreground">Location</Label><Input value={editForm.location} onChange={(e) => setEditForm((p) => ({ ...p, location: e.target.value }))} className="h-8 text-[13px] mt-1" /></div>
              </div>
            ) : (
              <>
                <p className="text-[15px] font-semibold text-foreground mb-2">{event.title}</p>
                <InfoRow label="Address" value={event.location || "—"} icon={MapPin} />
                <InfoRow label="Client" value="Mock Client Ltd." icon={User} />
                <InfoRow label="Stage" value="In Progress" icon={Activity} />
                <div className="flex items-center gap-2 mt-3 px-2.5 py-2 rounded-lg bg-success/6 border border-success/15">
                  <div className="w-1.5 h-1.5 rounded-full bg-success" />
                  <span className="text-[11px] font-medium text-success">On Track — No Issues</span>
                </div>
              </>
            )}
          </Section>

          {/* B) Task Section */}
          <Section icon={Briefcase} title="Task Details">
            {editing ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-[11px] text-muted-foreground">Date</Label><Input type="date" value={editForm.date} onChange={(e) => setEditForm((p) => ({ ...p, date: e.target.value }))} className="h-8 text-[13px] mt-1" /></div>
                  <div><Label className="text-[11px] text-muted-foreground">Type</Label>
                    <Select value={editForm.type} onValueChange={(v) => setEditForm((p) => ({ ...p, type: v as EventType }))}>
                      <SelectTrigger className="h-8 text-[13px] mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}><div className="flex items-center gap-2"><div className={cn("w-2 h-2 rounded-full", v.color)} />{v.label}</div></SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-[11px] text-muted-foreground">Start</Label><Input type="time" value={editForm.startTime} onChange={(e) => setEditForm((p) => ({ ...p, startTime: e.target.value }))} className="h-8 text-[13px] mt-1" /></div>
                  <div><Label className="text-[11px] text-muted-foreground">End</Label><Input type="time" value={editForm.endTime} onChange={(e) => setEditForm((p) => ({ ...p, endTime: e.target.value }))} className="h-8 text-[13px] mt-1" /></div>
                </div>
              </div>
            ) : (
              <>
                <InfoRow label="Type" value={sInfo.label} icon={FileText} />
                <InfoRow label="Date" value={event.date} icon={Calendar} />
                <InfoRow label="Time" value={`${event.startTime} – ${event.endTime}`} icon={Clock} />
                <InfoRow label="Duration" value={`${Math.floor(durationMin / 60)}h ${durationMin % 60 > 0 ? `${durationMin % 60}m` : ""}`} icon={Clock} />
                <InfoRow label="Status" value="Scheduled" icon={Shield} />
              </>
            )}
          </Section>

          {/* C) Installer Section */}
          <Section icon={User} title="Assigned Installer">
            {editing ? (
              <Select value={editForm.assignee} onValueChange={(v) => setEditForm((p) => ({ ...p, assignee: v }))}>
                <SelectTrigger className="h-10 text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PEOPLE.map((p) => (
                    <SelectItem key={p.initials} value={p.initials}>
                      <div className="flex items-center gap-2.5">
                        <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white", p.color)}>{p.initials}</div>
                        <div><span className="text-[13px] font-medium">{p.name}</span><span className="text-[11px] text-muted-foreground ml-2">{p.role}</span></div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold text-white shadow-sm", installer.color)}>
                    {installer.initials}
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold text-foreground">{installer.name}</p>
                    <p className="text-[11px] text-muted-foreground">{installer.role}</p>
                  </div>
                  <div className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold", installer.status === "active" ? "bg-success/10 text-success" : "bg-warning/10 text-warning")}>
                    {installer.status}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Rating", value: `${installer.rating}★` },
                    { label: "Jobs", value: String(installer.jobs) },
                    { label: "Workload", value: "72%" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-lg bg-secondary/50 p-2 text-center group/s hover:bg-accent/6 transition-colors duration-200">
                      <p className="text-[14px] font-semibold text-foreground group-hover/s:text-accent transition-colors duration-200">{s.value}</p>
                      <p className="text-[10px] text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-1">
                  <InfoRow label="Phone" value={installer.phone} icon={Phone} />
                  <InfoRow label="Email" value={installer.email} icon={Mail} />
                </div>
              </div>
            )}
          </Section>

          {/* D) Audit Trail */}
          <Section icon={History} title="Audit Trail" className="border-b-0">
            <div className="relative pl-4">
              <div className="absolute left-[5px] top-1 bottom-1 w-px bg-border" />
              {AUDIT_TRAIL.map((a, i) => (
                <div key={i} className="relative pb-3 last:pb-0 group/a">
                  <div className="absolute left-[-11px] top-1.5 w-2 h-2 rounded-full bg-border group-hover/a:bg-accent transition-colors duration-200" />
                  <p className="text-[12px] font-medium text-foreground">{a.action}</p>
                  <p className="text-[10px] text-muted-foreground">{a.by} · {a.date}</p>
                </div>
              ))}
            </div>
          </Section>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/60">
          <button
            onClick={() => setDeleteOpen(true)}
            className="w-full h-9 rounded-lg border border-destructive/20 text-destructive text-[12px] font-semibold flex items-center justify-center gap-2 hover:bg-destructive/8 hover:border-destructive/40 transition-all duration-200 group/d"
          >
            <Trash2 className="w-3.5 h-3.5 group-hover/d:scale-110 transition-transform duration-200" /> Delete Event
          </button>
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-[15px]">
              <AlertTriangle className="w-4 h-4 text-destructive" /> Confirm Deletion
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[13px]">
              This action affects scheduling and workforce allocation. Event <strong>"{event.title}"</strong> will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-[13px]">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-[13px]">
              Delete Event
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

