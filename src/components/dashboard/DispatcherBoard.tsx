import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  ClipboardList,
  MapPinned,
  Users2,
} from "lucide-react";

type DispatcherSummary = {
  total_projects: number;
  total_doors: number;
  installed_doors: number;
  pending_doors: number;
  projects_needing_dispatch: number;
  open_issues: number;
  blocked_issues: number;
  unassigned_doors: number;
  available_installers: number;
  busy_installers: number;
  scheduled_visits_7d: number;
};

type DispatcherProjectRecommendation = {
  installer_id: string;
  installer_name: string;
  availability_band: string;
  active_projects: number;
  assigned_open_doors: number;
  open_issues: number;
  next_event_at: string | null;
};

type DispatcherProject = {
  project_id: string;
  project_name: string;
  address: string;
  project_status: string;
  dispatch_status: string;
  contact_name: string | null;
  total_doors: number;
  installed_doors: number;
  pending_doors: number;
  assigned_open_doors: number;
  unassigned_doors: number;
  open_issues: number;
  blocked_issues: number;
  completion_pct: number;
  next_visit_at: string | null;
  next_visit_title: string | null;
  recommended_installers: DispatcherProjectRecommendation[];
};

type DispatcherInstaller = {
  installer_id: string;
  installer_name: string;
  status: string;
  availability_band: string;
  is_active: boolean;
  phone: string | null;
  email: string | null;
  active_projects: number;
  assigned_open_doors: number;
  open_issues: number;
  next_event_at: string | null;
  next_event_title: string | null;
};

interface DispatcherBoardProps {
  summary: DispatcherSummary;
  projects: DispatcherProject[];
  installers: DispatcherInstaller[];
  onOpenProject?: (projectId: string) => void;
  onOpenProjects?: () => void;
  onOpenInstallers?: () => void;
  onOpenCalendar?: () => void;
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "Not scheduled";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not scheduled";
  }
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function badgeTone(value: string): string {
  if (value === "BLOCKED" || value === "INACTIVE") {
    return "bg-destructive/10 text-destructive border-destructive/20";
  }
  if (value === "UNASSIGNED" || value === "BUSY" || value === "AT_RISK") {
    return "bg-amber-500/10 text-amber-300 border-amber-500/20";
  }
  if (value === "DONE" || value === "AVAILABLE") {
    return "bg-emerald-500/10 text-emerald-300 border-emerald-500/20";
  }
  return "bg-accent/10 text-accent border-accent/20";
}

export function DispatcherBoard({
  summary,
  projects,
  installers,
  onOpenProject,
  onOpenProjects,
  onOpenInstallers,
  onOpenCalendar,
}: DispatcherBoardProps) {
  return (
    <div
      data-testid="dispatcher-board"
      className="glass-card card-lift rounded-xl p-5 animate-fade-in mb-6"
    >
      <div className="flex flex-col gap-4 border-b border-border/70 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/[0.06] px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-accent/80">
            Dispatcher Board
          </div>
          <h3 className="mt-3 text-lg font-semibold text-card-foreground">
            Live operator control for doors, blockers and crew load
          </h3>
          <p className="mt-1 max-w-3xl text-[13px] text-muted-foreground">
            Use this board to decide which project needs crew now, where blockers are growing,
            and which installer can absorb the next assignment.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onOpenProjects}
            className="btn-premium rounded-lg border border-border px-3 py-2 text-[12px] font-medium text-muted-foreground hover:text-accent"
          >
            Open projects
          </button>
          <button
            onClick={onOpenInstallers}
            className="btn-premium rounded-lg border border-border px-3 py-2 text-[12px] font-medium text-muted-foreground hover:text-accent"
          >
            Open installers
          </button>
          <button
            onClick={onOpenCalendar}
            className="btn-premium rounded-lg border border-border px-3 py-2 text-[12px] font-medium text-muted-foreground hover:text-accent"
          >
            Open calendar
          </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <div className="rounded-xl border border-border/70 bg-card/70 p-3">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Projects
          </div>
          <div className="mt-2 text-xl font-semibold text-card-foreground">
            {summary.total_projects}
          </div>
          <div className="mt-1 text-[12px] text-muted-foreground">
            Needs dispatch: {summary.projects_needing_dispatch}
          </div>
        </div>
        <div className="rounded-xl border border-border/70 bg-card/70 p-3">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Doors</div>
          <div className="mt-2 text-xl font-semibold text-card-foreground">{summary.total_doors}</div>
          <div className="mt-1 text-[12px] text-muted-foreground">
            Pending: {summary.pending_doors}
          </div>
        </div>
        <div className="rounded-xl border border-border/70 bg-card/70 p-3">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Installed
          </div>
          <div className="mt-2 text-xl font-semibold text-card-foreground">
            {summary.installed_doors}
          </div>
          <div className="mt-1 text-[12px] text-muted-foreground">
            Unassigned: {summary.unassigned_doors}
          </div>
        </div>
        <div className="rounded-xl border border-border/70 bg-card/70 p-3">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Issues
          </div>
          <div className="mt-2 text-xl font-semibold text-card-foreground">
            {summary.open_issues}
          </div>
          <div className="mt-1 text-[12px] text-muted-foreground">
            Blocked: {summary.blocked_issues}
          </div>
        </div>
        <div className="rounded-xl border border-border/70 bg-card/70 p-3">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Available Crew
          </div>
          <div className="mt-2 text-xl font-semibold text-card-foreground">
            {summary.available_installers}
          </div>
          <div className="mt-1 text-[12px] text-muted-foreground">
            Busy: {summary.busy_installers}
          </div>
        </div>
        <div className="rounded-xl border border-border/70 bg-card/70 p-3">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Next 7d Visits
          </div>
          <div className="mt-2 text-xl font-semibold text-card-foreground">
            {summary.scheduled_visits_7d}
          </div>
          <div className="mt-1 text-[12px] text-muted-foreground">
            Installation schedule
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <div className="rounded-xl border border-border/70 bg-card/60 p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-card-foreground">Projects needing dispatch</h4>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  Prioritized by blockers, unassigned doors and pending backlog.
                </p>
              </div>
              <ClipboardList className="h-4 w-4 text-accent" strokeWidth={1.8} />
            </div>

            <div className="space-y-3">
              {projects.length > 0 ? (
                projects.map((project) => (
                  <div
                    key={project.project_id}
                    className="rounded-xl border border-border/70 bg-background/50 p-4"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h5 className="text-[14px] font-semibold text-card-foreground">
                            {project.project_name}
                          </h5>
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${badgeTone(
                              project.dispatch_status
                            )}`}
                          >
                            {project.dispatch_status}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-[12px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <MapPinned className="h-3.5 w-3.5" strokeWidth={1.7} />
                            {project.address}
                          </span>
                          <span>Contact: {project.contact_name || "Not set"}</span>
                          <span>Status: {project.project_status}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => onOpenProject?.(project.project_id)}
                        className="btn-premium inline-flex items-center gap-2 self-start rounded-lg border border-border px-3 py-2 text-[12px] font-medium text-muted-foreground hover:text-accent"
                      >
                        Open project
                        <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.7} />
                      </button>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 text-[12px] text-muted-foreground md:grid-cols-4">
                      <div className="rounded-lg border border-border/60 bg-card/60 px-3 py-2">
                        <div className="text-[11px] uppercase tracking-wider text-muted-foreground/70">
                          Pending
                        </div>
                        <div className="mt-1 text-sm font-semibold text-card-foreground">
                          {project.pending_doors}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border/60 bg-card/60 px-3 py-2">
                        <div className="text-[11px] uppercase tracking-wider text-muted-foreground/70">
                          Assigned
                        </div>
                        <div className="mt-1 text-sm font-semibold text-card-foreground">
                          {project.assigned_open_doors}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border/60 bg-card/60 px-3 py-2">
                        <div className="text-[11px] uppercase tracking-wider text-muted-foreground/70">
                          Unassigned
                        </div>
                        <div className="mt-1 text-sm font-semibold text-card-foreground">
                          {project.unassigned_doors}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border/60 bg-card/60 px-3 py-2">
                        <div className="text-[11px] uppercase tracking-wider text-muted-foreground/70">
                          Completion
                        </div>
                        <div className="mt-1 text-sm font-semibold text-card-foreground">
                          {project.completion_pct.toFixed(0)}%
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-3 text-[12px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-destructive">
                        <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.7} />
                        Issues: {project.open_issues}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-amber-300">
                        Blocked: {project.blocked_issues}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-accent">
                        <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.7} />
                        {project.next_visit_title || "No scheduled visit"} ·{" "}
                        {formatDateTime(project.next_visit_at)}
                      </span>
                    </div>

                    <div className="mt-4">
                      <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                        Suggested installers
                      </div>
                      {project.recommended_installers.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {project.recommended_installers.map((installer) => (
                            <div
                              key={`${project.project_id}-${installer.installer_id}`}
                              className="rounded-lg border border-border/60 bg-card/60 px-3 py-2"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-[12px] font-medium text-card-foreground">
                                  {installer.installer_name}
                                </span>
                                <span
                                  className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${badgeTone(
                                    installer.availability_band
                                  )}`}
                                >
                                  {installer.availability_band}
                                </span>
                              </div>
                              <div className="mt-1 text-[11px] text-muted-foreground">
                                Projects: {installer.active_projects} · Doors:{" "}
                                {installer.assigned_open_doors} · Issues: {installer.open_issues}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-lg border border-dashed border-border/70 px-3 py-3 text-[12px] text-muted-foreground">
                          No active installer recommendations yet.
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-border/70 px-4 py-8 text-center text-[13px] text-muted-foreground">
                  No project dispatch data available yet.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="xl:col-span-2">
          <div className="rounded-xl border border-border/70 bg-card/60 p-4 h-full">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-card-foreground">Crew availability</h4>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  Who can absorb more work right now.
                </p>
              </div>
              <Users2 className="h-4 w-4 text-accent" strokeWidth={1.8} />
            </div>

            <div className="space-y-3">
              {installers.length > 0 ? (
                installers.map((installer) => (
                  <div
                    key={installer.installer_id}
                    className="rounded-xl border border-border/70 bg-background/50 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-[13px] font-semibold text-card-foreground">
                            {installer.installer_name}
                          </div>
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${badgeTone(
                              installer.availability_band
                            )}`}
                          >
                            {installer.availability_band}
                          </span>
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          {installer.phone || installer.email || "No contact data"} · Status:{" "}
                          {installer.status || "ACTIVE"}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg border border-border/60 bg-card/60 px-2 py-2">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                          Projects
                        </div>
                        <div className="mt-1 text-[13px] font-semibold text-card-foreground">
                          {installer.active_projects}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border/60 bg-card/60 px-2 py-2">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                          Open Doors
                        </div>
                        <div className="mt-1 text-[13px] font-semibold text-card-foreground">
                          {installer.assigned_open_doors}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border/60 bg-card/60 px-2 py-2">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                          Issues
                        </div>
                        <div className="mt-1 text-[13px] font-semibold text-card-foreground">
                          {installer.open_issues}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 rounded-lg border border-accent/15 bg-accent/[0.05] px-3 py-2 text-[12px] text-muted-foreground">
                      Next slot:{" "}
                      <span className="font-medium text-card-foreground">
                        {installer.next_event_title || "No scheduled event"}
                      </span>
                      {" · "}
                      {formatDateTime(installer.next_event_at)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-border/70 px-4 py-8 text-center text-[13px] text-muted-foreground">
                  No installer load data available yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
