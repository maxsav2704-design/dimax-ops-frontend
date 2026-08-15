import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  ClipboardList,
  MapPinned,
  Users2,
} from "lucide-react";
import { KpiCard as DimaxKpiCard } from "@/components/dimax";
import { getDashboardCopy } from "@/components/dashboard/copy";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/lib/i18n";
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
export function DispatcherBoard({
  summary,
  projects,
  installers,
  onOpenProject,
  onOpenProjects,
  onOpenInstallers,
  onOpenCalendar,
}: DispatcherBoardProps) {
  const { locale } = useI18n();
  const copy = getDashboardCopy(locale).dispatcher;
  const panelClassName = "rounded-lg border border-border bg-surface";
  const formatDateTime = (value: string | null): string => {
    if (!value) {
      return copy.notScheduled;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return copy.notScheduled;
    }
    return date.toLocaleString(
      locale === "he" ? "he-IL" : locale === "ru" ? "ru-RU" : "en-US",
      {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      },
    );
  };
  return (
    <section
      data-testid="dispatcher-board"
      className="mb-4 overflow-hidden rounded-lg border border-border bg-surface animate-fade-in"
    >
      {" "}
      <div className="flex flex-col gap-3 border-b border-border-subtle px-4 py-3 lg:flex-row lg:items-start lg:justify-between">
        {" "}
        <div className="text-start">
          {" "}
          <div className="text-[10.5px] font-medium uppercase text-text-secondary">
            {" "}
            {copy.eyebrow}{" "}
          </div>{" "}
          <h3 className="mt-1 text-[13.5px] font-medium leading-5 text-text">
            {copy.title}
          </h3>{" "}
          <p className="mt-1 max-w-3xl text-[12px] leading-5 text-text-secondary">
            {copy.description}
          </p>{" "}
        </div>{" "}
        <div className="flex flex-wrap gap-2">
          {" "}
          <button onClick={onOpenProjects} className="dmx-secondary-action">
            {" "}
            {copy.openProjects}{" "}
          </button>{" "}
          <button onClick={onOpenInstallers} className="dmx-secondary-action">
            {" "}
            {copy.openInstallers}{" "}
          </button>{" "}
          <button onClick={onOpenCalendar} className="dmx-secondary-action">
            {" "}
            {copy.openCalendar}{" "}
          </button>{" "}
        </div>{" "}
      </div>{" "}
      <div className="grid grid-cols-2 gap-2.5 px-4 py-3 md:grid-cols-3 xl:grid-cols-6">
        {" "}
        <DimaxKpiCard
          label={copy.metrics.projects}
          value={summary.total_projects}
          hint={`${copy.metrics.needsDispatch}: ${summary.projects_needing_dispatch}`}
          barColor="blue"
        />{" "}
        <DimaxKpiCard
          label={copy.metrics.doors}
          value={summary.total_doors}
          hint={`${copy.metrics.pending}: ${summary.pending_doors}`}
          barColor="yellow"
        />{" "}
        <DimaxKpiCard
          label={copy.metrics.installed}
          value={summary.installed_doors}
          hint={`${copy.metrics.unassigned}: ${summary.unassigned_doors}`}
          barColor="green"
        />{" "}
        <DimaxKpiCard
          label={copy.metrics.issues}
          value={summary.open_issues}
          hint={`${copy.metrics.blocked}: ${summary.blocked_issues}`}
          barColor="red"
          emphasis={summary.open_issues > 0 ? "problem" : "default"}
        />{" "}
        <DimaxKpiCard
          label={copy.metrics.availableCrew}
          value={summary.available_installers}
          hint={`${copy.metrics.busy}: ${summary.busy_installers}`}
          barColor="orange"
        />{" "}
        <DimaxKpiCard
          label={copy.metrics.nextVisits7d}
          value={summary.scheduled_visits_7d}
          hint={copy.metrics.installationSchedule}
          barColor="yellow"
        />{" "}
      </div>{" "}
      <div className="grid grid-cols-1 gap-3 border-t border-border-subtle p-4 xl:grid-cols-5">
        {" "}
        <div className="xl:col-span-3">
          {" "}
          <div className={`${panelClassName} h-full overflow-hidden p-4`}>
            {" "}
            <div className="mb-4 flex items-center justify-between gap-3">
              {" "}
              <div className="text-start">
                {" "}
                <h4 className="text-[13.5px] font-medium leading-5 text-text">
                  {copy.projectsSection.title}
                </h4>{" "}
                <p className="mt-1 text-[12px] leading-5 text-text-secondary">
                  {copy.projectsSection.description}
                </p>{" "}
              </div>{" "}
              <ClipboardList
                className="h-4 w-4 text-text-secondary"
                strokeWidth={1.8}
              />{" "}
            </div>{" "}
            <div className="space-y-3">
              {" "}
              {projects.length > 0 ? (
                projects.map((project) => (
                  <div
                    key={project.project_id}
                    className="rounded-lg border border-border bg-surface-subtle p-3"
                  >
                    {" "}
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      {" "}
                      <div className="text-start">
                        {" "}
                        <div className="flex flex-wrap items-center gap-2">
                          {" "}
                          <h5 className="text-[13px] font-medium text-text">
                            {project.project_name}
                          </h5>{" "}
                          <StatusBadge
                            status={project.dispatch_status}
                            domain="project"
                          />{" "}
                        </div>{" "}
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-[11.5px] leading-5 text-text-secondary">
                          {" "}
                          <span className="inline-flex items-center gap-1">
                            {" "}
                            <MapPinned
                              className="h-3.5 w-3.5"
                              strokeWidth={1.7}
                            />{" "}
                            {project.address}{" "}
                          </span>{" "}
                          <span>
                            {copy.projectsSection.contact}:{" "}
                            {project.contact_name || "—"}
                          </span>{" "}
                          <span className="inline-flex items-center gap-1">
                            {" "}
                            {copy.projectsSection.status}:{" "}
                            <StatusBadge
                              status={project.project_status}
                              domain="project"
                            />{" "}
                          </span>{" "}
                        </div>{" "}
                      </div>{" "}
                      <button
                        onClick={() => onOpenProject?.(project.project_id)}
                        className="dmx-secondary-action self-start"
                      >
                        {" "}
                        {copy.projectsSection.openProject}{" "}
                        <ArrowRight
                          className="h-3.5 w-3.5"
                          strokeWidth={1.7}
                        />{" "}
                      </button>{" "}
                    </div>{" "}
                    <div className="mt-3 grid grid-cols-2 gap-2 text-[12px] text-text-secondary md:grid-cols-4">
                      {" "}
                      <div className="rounded-lg border border-border bg-surface px-3 py-2">
                        {" "}
                        <div className="text-[10px] uppercase text-text-secondary">
                          {copy.projectsSection.pending}
                        </div>{" "}
                        <div className="mt-1 text-[13px] font-medium text-text">
                          {project.pending_doors}
                        </div>{" "}
                      </div>{" "}
                      <div className="rounded-lg border border-border bg-surface px-3 py-2">
                        {" "}
                        <div className="text-[10px] uppercase text-text-secondary">
                          {copy.projectsSection.assigned}
                        </div>{" "}
                        <div className="mt-1 text-[13px] font-medium text-text">
                          {project.assigned_open_doors}
                        </div>{" "}
                      </div>{" "}
                      <div className="rounded-lg border border-border bg-surface px-3 py-2">
                        {" "}
                        <div className="text-[10px] uppercase text-text-secondary">
                          {copy.projectsSection.unassigned}
                        </div>{" "}
                        <div className="mt-1 text-[13px] font-medium text-text">
                          {project.unassigned_doors}
                        </div>{" "}
                      </div>{" "}
                      <div className="rounded-lg border border-border bg-surface px-3 py-2">
                        {" "}
                        <div className="text-[10px] uppercase text-text-secondary">
                          {copy.projectsSection.completion}
                        </div>{" "}
                        <div className="mt-1 text-[13px] font-medium text-text">
                          {project.completion_pct.toFixed(0)}%
                        </div>{" "}
                      </div>{" "}
                    </div>{" "}
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[11.5px] text-text-secondary">
                      {" "}
                      <span className="inline-flex items-center gap-1 rounded-full border border-status-problem-border bg-status-problem-bg px-2.5 py-1 text-status-problem-fg">
                        {" "}
                        <AlertTriangle
                          className="h-3.5 w-3.5"
                          strokeWidth={1.7}
                        />{" "}
                        {copy.projectsSection.issues}:{" "}
                        {project.open_issues}{" "}
                      </span>{" "}
                      <span className="inline-flex items-center gap-1 rounded-full border border-status-warning-border bg-status-warning-bg px-2.5 py-1 text-status-warning-fg">
                        {" "}
                        {copy.projectsSection.blocked}:{" "}
                        {project.blocked_issues}{" "}
                      </span>{" "}
                      <span className="inline-flex items-center gap-1 rounded-full border border-status-progress-border bg-status-progress-bg px-2.5 py-1 text-status-progress-fg">
                        {" "}
                        <CalendarDays
                          className="h-3.5 w-3.5"
                          strokeWidth={1.7}
                        />{" "}
                        {project.next_visit_title ||
                          copy.projectsSection.noScheduledVisit}
                        {" / "} {formatDateTime(project.next_visit_at)}{" "}
                      </span>{" "}
                    </div>{" "}
                    <div className="mt-4">
                      {" "}
                      <div className="mb-2 text-[10px] uppercase text-text-secondary">
                        {" "}
                        {copy.projectsSection.suggestedInstallers}{" "}
                      </div>{" "}
                      {project.recommended_installers.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {" "}
                          {project.recommended_installers.map((installer) => (
                            <div
                              key={`${project.project_id}-${installer.installer_id}`}
                              className="rounded-lg border border-border bg-surface px-3 py-2 text-start"
                            >
                              {" "}
                              <div className="flex items-center gap-2">
                                {" "}
                                <span className="text-[12px] font-medium text-text">
                                  {installer.installer_name}
                                </span>{" "}
                                <StatusBadge
                                  status={installer.availability_band}
                                  domain="installer"
                                />{" "}
                              </div>{" "}
                              <div className="mt-1 text-[11px] leading-5 text-text-secondary">
                                {" "}
                                {copy.projectsSection.projects}:{" "}
                                {installer.active_projects}
                                {" / "} {copy.projectsSection.doors}:{" "}
                                {installer.assigned_open_doors}
                                {" / "} {copy.projectsSection.issues}:{" "}
                                {installer.open_issues}{" "}
                              </div>{" "}
                            </div>
                          ))}{" "}
                        </div>
                      ) : (
                        <div className="rounded-lg border border-dashed border-border px-3 py-3 text-[12px] text-text-secondary">
                          {" "}
                          {copy.projectsSection.noRecommendations}{" "}
                        </div>
                      )}{" "}
                    </div>{" "}
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-[13px] text-text-secondary">
                  {" "}
                  {copy.projectsSection.noProjects}{" "}
                </div>
              )}{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
        <div className="xl:col-span-2">
          {" "}
          <div className={`${panelClassName} h-full overflow-hidden p-4`}>
            {" "}
            <div className="mb-4 flex items-center justify-between gap-3">
              {" "}
              <div className="text-start">
                {" "}
                <h4 className="text-[13.5px] font-medium leading-5 text-text">
                  {copy.installersSection.title}
                </h4>{" "}
                <p className="mt-1 text-[12px] leading-5 text-text-secondary">
                  {copy.installersSection.description}
                </p>{" "}
              </div>{" "}
              <Users2
                className="h-4 w-4 text-text-secondary"
                strokeWidth={1.8}
              />{" "}
            </div>{" "}
            <div className="space-y-3">
              {" "}
              {installers.length > 0 ? (
                installers.map((installer) => (
                  <div
                    key={installer.installer_id}
                    className="rounded-lg border border-border bg-surface-subtle p-3 text-start"
                  >
                    {" "}
                    <div className="flex items-start justify-between gap-3">
                      {" "}
                      <div>
                        {" "}
                        <div className="flex flex-wrap items-center gap-2">
                          {" "}
                          <div className="text-[13px] font-medium text-text">
                            {installer.installer_name}
                          </div>{" "}
                          <StatusBadge
                            status={installer.availability_band}
                            domain="installer"
                          />{" "}
                        </div>{" "}
                        <div className="mt-1 text-[11px] leading-5 text-text-secondary">
                          {" "}
                          {installer.phone ||
                            installer.email ||
                            copy.installersSection.noContactData}
                          {" / "} {copy.installersSection.status}:{" "}
                          {installer.status ||
                            copy.installersSection.activeFallback}{" "}
                        </div>{" "}
                      </div>{" "}
                    </div>{" "}
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      {" "}
                      <div className="rounded-lg border border-border bg-surface px-2 py-2">
                        {" "}
                        <div className="text-[10px] uppercase text-text-secondary">
                          {copy.installersSection.projects}
                        </div>{" "}
                        <div className="mt-1 text-[13px] font-medium text-text">
                          {installer.active_projects}
                        </div>{" "}
                      </div>{" "}
                      <div className="rounded-lg border border-border bg-surface px-2 py-2">
                        {" "}
                        <div className="text-[10px] uppercase text-text-secondary">
                          {copy.installersSection.openDoors}
                        </div>{" "}
                        <div className="mt-1 text-[13px] font-medium text-text">
                          {installer.assigned_open_doors}
                        </div>{" "}
                      </div>{" "}
                      <div className="rounded-lg border border-border bg-surface px-2 py-2">
                        {" "}
                        <div className="text-[10px] uppercase text-text-secondary">
                          {copy.installersSection.issues}
                        </div>{" "}
                        <div className="mt-1 text-[13px] font-medium text-text">
                          {installer.open_issues}
                        </div>{" "}
                      </div>{" "}
                    </div>{" "}
                    <div className="mt-3 rounded-lg border border-status-progress-border bg-status-progress-bg px-3 py-2 text-[12px] leading-5 text-status-progress-fg">
                      {" "}
                      {copy.installersSection.nextSlot}:{" "}
                      <span className="font-medium text-text">
                        {" "}
                        {installer.next_event_title ||
                          copy.installersSection.noScheduledEvent}{" "}
                      </span>{" "}
                      {" / "} {formatDateTime(installer.next_event_at)}{" "}
                    </div>{" "}
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-[13px] text-text-secondary">
                  {" "}
                  {copy.installersSection.noInstallers}{" "}
                </div>
              )}{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
    </section>
  );
}
