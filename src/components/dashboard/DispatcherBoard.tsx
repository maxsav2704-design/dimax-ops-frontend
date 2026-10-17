import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  DoorOpen,
  FolderKanban,
  Users2,
} from "lucide-react";

import { getDashboardCopy } from "@/components/dashboard/copy";
import { attentionAttr, attentionLevel, byAttention, entityKey, FilterChip } from "@/components/dimax";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

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

/** E5: the filter a tile or summary item applies to the project list. */
export type DispatcherProjectFilter = "issues" | "unassigned";

interface DispatcherBoardProps {
  summary: DispatcherSummary;
  projectFilter?: DispatcherProjectFilter | null;
  onToggleFilter?: (filter: DispatcherProjectFilter) => void;
  projects: DispatcherProject[];
  installers: DispatcherInstaller[];
  onOpenProject?: (projectId: string) => void;
  onOpenProjects?: () => void;
  onOpenInstallers?: () => void;
  onOpenCalendar?: () => void;
}

function boardCopy(locale: "en" | "ru" | "he") {
  if (locale === "ru") {
    return {
      title: "Что нужно решить",
      description:
        "Сначала проекты без назначений и свободные монтажники. Подробности откроются в нужном разделе.",
      projects: "Проекты без назначения",
      projectsEmpty: "Срочных назначений нет.",
      installers: "Монтажники, которые могут взять работу",
      installersEmpty: "Сейчас нет свободных монтажников.",
      needInstaller: "нужен монтажник",
      unassignedDoors: "дверей без монтажника",
      problems: "проблем",
      openDoors: "дверей в работе",
      activeProjects: "объектов",
      nextVisit: "Следующий выезд",
      noVisit: "не запланирован",
      openProject: "Открыть проект",
      summaryProjects: "Проектов ждут назначения",
      summaryDoors: "Дверей без монтажника",
      summaryProblems: "Открытых проблем",
      summaryInstallers: "Свободных монтажников",
      statusBlocked: "Заблокирован",
      statusNeedsAssignment: "Нужен монтажник",
      statusAttention: "Требует внимания",
      statusReady: "Готов к работе",
      statusAvailable: "Свободен",
      statusBusy: "Занят",
      sortAttention: "Сначала требующие внимания",
      rail: "{installed} установлено, {assigned} в работе, {unassigned} без монтажника",
    };
  }
  if (locale === "he") {
    return {
      title: "מה דורש טיפול",
      description:
        "תחילה פרויקטים ללא שיבוץ ומתקינים פנויים. הפרטים המלאים נמצאים באזור המתאים.",
      projects: "פרויקטים ללא שיבוץ",
      projectsEmpty: "אין שיבוצים דחופים.",
      installers: "מתקינים שיכולים לקבל עבודה",
      installersEmpty: "אין כרגע מתקינים פנויים.",
      needInstaller: "נדרש מתקין",
      unassignedDoors: "דלתות ללא מתקין",
      problems: "תקלות",
      openDoors: "דלתות בעבודה",
      activeProjects: "פרויקטים",
      nextVisit: "הביקור הבא",
      noVisit: "לא נקבע",
      openProject: "פתיחת פרויקט",
      summaryProjects: "פרויקטים ממתינים לשיבוץ",
      summaryDoors: "דלתות ללא מתקין",
      summaryProblems: "תקלות פתוחות",
      summaryInstallers: "מתקינים פנויים",
      statusBlocked: "חסום",
      statusNeedsAssignment: "נדרש מתקין",
      statusAttention: "דורש טיפול",
      statusReady: "מוכן לעבודה",
      statusAvailable: "פנוי",
      statusBusy: "עסוק",
      sortAttention: "דורשים טיפול תחילה",
      rail: "{installed} הותקנו, {assigned} בעבודה, {unassigned} ללא מתקין",
    };
  }
  return {
    title: "What needs attention",
    description:
      "Projects waiting for assignment and installers who can take work. Full details stay in their sections.",
    projects: "Projects waiting for assignment",
    projectsEmpty: "No urgent assignments.",
    installers: "Installers who can take work",
    installersEmpty: "No installers are available right now.",
    needInstaller: "needs installer",
    unassignedDoors: "doors without installer",
    problems: "issues",
    openDoors: "open doors",
    activeProjects: "projects",
    nextVisit: "Next visit",
    noVisit: "not scheduled",
    openProject: "Open project",
    summaryProjects: "Projects waiting for assignment",
    summaryDoors: "Doors without installer",
    summaryProblems: "Open issues",
    summaryInstallers: "Available installers",
    statusBlocked: "Blocked",
    statusNeedsAssignment: "Needs installer",
    statusAttention: "Needs attention",
    statusReady: "Ready",
    statusAvailable: "Available",
    statusBusy: "Busy",
    sortAttention: "Attention first",
    rail: "{installed} installed, {assigned} in progress, {unassigned} without installer",
  };
}

// E7 (compact): one proportional rail per project, the building's doors by state.
function BuildingRail({ installed, assigned, unassigned, total, label }: { installed: number; assigned: number; unassigned: number; total: number; label: string }) {
  const base = Math.max(total, installed + assigned + unassigned, 1);
  const pct = (value: number) => `${Math.max(0, Math.min(100, (value / base) * 100))}%`;
  return (
    <div className="dmx-rail mt-2" role="img" aria-label={label} data-testid="building-rail">
      <i className="dmx-rail-installed" style={{ width: pct(installed) }} />
      <i className="dmx-rail-assigned" style={{ width: pct(assigned) }} />
      <i className="dmx-rail-unassigned" style={{ width: pct(unassigned) }} />
    </div>
  );
}

function formatStatus(
  value: string,
  copy: ReturnType<typeof boardCopy>,
  domain: "project" | "installer",
) {
  const normalized = value.trim().toUpperCase();
  if (domain === "installer") {
    return normalized === "AVAILABLE"
      ? copy.statusAvailable
      : copy.statusBusy;
  }
  if (normalized === "BLOCKED") return copy.statusBlocked;
  if (normalized === "NEEDS_ASSIGNMENT" || normalized === "UNASSIGNED") {
    return copy.statusNeedsAssignment;
  }
  if (normalized === "AT_RISK" || normalized === "PROBLEM") {
    return copy.statusAttention;
  }
  return copy.statusReady;
}

export function DispatcherBoard({
  summary,
  projects,
  installers,
  projectFilter = null,
  onToggleFilter,
  onOpenProject,
  onOpenProjects,
  onOpenInstallers,
  onOpenCalendar,
}: DispatcherBoardProps) {
  const { locale } = useI18n();
  const actions = getDashboardCopy(locale).dispatcher;
  const copy = boardCopy(locale);
  const localeCode = locale === "he" ? "he-IL" : locale === "ru" ? "ru-RU" : "en-US";
  // E1: "attention first" pins blocked, problem and unassigned projects to the top.
  const [attentionFirst, setAttentionFirst] = useState(false);
  const projectAttention = (project: DispatcherProject) =>
    attentionLevel({ blocked: project.blocked_issues > 0, issues: project.open_issues > 0, unassigned: project.unassigned_doors > 0 });
  const matchesFilter = (project: DispatcherProject) =>
    projectFilter === "issues" ? project.open_issues > 0 : projectFilter === "unassigned" ? project.unassigned_doors > 0 : true;
  const filteredProjects = projects.filter(matchesFilter);
  const visibleProjects = (attentionFirst ? [...filteredProjects].sort(byAttention(projectAttention)) : filteredProjects).slice(0, 4);
  const filterLabel = projectFilter === "issues" ? copy.summaryProblems : projectFilter === "unassigned" ? copy.summaryDoors : null;
  const visibleInstallers = installers
    .filter((installer) => installer.availability_band === "AVAILABLE")
    .slice(0, 4);

  const formatDateTime = (value: string | null): string => {
    if (!value) return copy.noVisit;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return copy.noVisit;
    return date.toLocaleString(localeCode, {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const summaryItems = [
    {
      label: copy.summaryProjects,
      value: summary.projects_needing_dispatch,
      icon: FolderKanban,
      tone: "text-status-warning-fg bg-status-warning-bg",
    },
    {
      label: copy.summaryDoors,
      value: summary.unassigned_doors,
      icon: DoorOpen,
      tone: "text-text bg-surface-sunken",
      filter: "unassigned" as const,
    },
    {
      label: copy.summaryProblems,
      value: summary.open_issues,
      icon: AlertTriangle,
      tone:
        summary.open_issues > 0
          ? "text-status-problem-fg bg-status-problem-bg"
          : "text-status-ok-fg bg-status-ok-bg",
      filter: "issues" as const,
    },
    {
      label: copy.summaryInstallers,
      value: summary.available_installers,
      icon: Users2,
      tone: "text-link bg-blue-50",
    },
  ];

  return (
    <section
      data-testid="dispatcher-board"
      className="overflow-hidden rounded-lg border border-border bg-surface"
    >
      <div className="flex flex-col gap-3 border-b border-border-subtle px-4 py-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="type-section">{copy.title}</h2>
          <p className="mt-1 max-w-3xl text-12 leading-5 text-text-secondary">
            {copy.description}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={onOpenProjects} className="dmx-secondary-action">
            {actions.openProjects}
          </button>
          <button onClick={onOpenCalendar} className="dmx-secondary-action">
            <CalendarDays className="h-4 w-4" strokeWidth={1.8} />
            {actions.openCalendar}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px bg-border-subtle lg:grid-cols-4">
        {summaryItems.map((item) => {
          const filterable = "filter" in item && !!item.filter && !!onToggleFilter;
          const pressed = filterable && projectFilter === item.filter;
          const body = (
            <>
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                  item.tone,
                )}
              >
                <item.icon className="h-4 w-4" strokeWidth={1.8} />
              </span>
              <div className="min-w-0">
                <div className="num text-18 font-semibold leading-none text-text">
                  {item.value}
                </div>
                <div className="mt-1 truncate text-11 text-text-secondary">
                  {item.label}
                </div>
              </div>
            </>
          );
          return filterable ? (
            <button
              key={item.label}
              type="button"
              aria-pressed={pressed}
              onClick={() => onToggleFilter?.(item.filter as DispatcherProjectFilter)}
              className={cn(
                "flex items-center gap-3 bg-surface px-4 py-3 text-start transition-colors duration-fast ease-standard hover:bg-surface-subtle",
                pressed && "bg-[var(--dmx-accent-tint)] hover:bg-[var(--dmx-accent-tint)]",
              )}
            >
              {body}
            </button>
          ) : (
            <div key={item.label} className="flex items-center gap-3 bg-surface px-4 py-3">
              {body}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 border-t border-border-subtle p-4 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <div className="mb-2.5 flex flex-wrap items-center gap-2 text-12 font-semibold text-text">
            <span>{copy.projects}</span>
            {projectFilter && filterLabel ? (
              <FilterChip testId="dispatcher-filter" onRemove={() => onToggleFilter?.(projectFilter)}>{filterLabel}</FilterChip>
            ) : null}
            <button
              type="button"
              aria-pressed={attentionFirst}
              onClick={() => setAttentionFirst((value) => !value)}
              className={cn(
                "ms-auto inline-flex h-6 items-center rounded-full border px-2.5 text-11 font-medium transition-colors",
                attentionFirst ? "border-[var(--dmx-accent)] bg-[var(--dmx-accent-tint)] text-text" : "border-border-strong bg-surface text-text-secondary hover:bg-surface-subtle",
              )}
            >
              {copy.sortAttention}
            </button>
          </div>
          <div className="space-y-2">
            {visibleProjects.length > 0 ? (
              visibleProjects.map((project) => (
                <button
                  key={project.project_id}
                  type="button"
                  onClick={() => onOpenProject?.(project.project_id)}
                  data-entity={entityKey("project", project.project_id)}
                  {...attentionAttr(projectAttention(project))}
                  className="attn-stripe group flex w-full items-center gap-3 rounded-md border border-border bg-surface-subtle px-3 py-2.5 text-start transition-colors hover:border-border-strong hover:bg-surface"
                  aria-label={`${copy.openProject}: ${project.project_name}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-13 font-semibold text-text">
                        {project.project_name}
                      </span>
                      <span className="rounded-full bg-status-warning-bg px-2 py-0.5 text-11 font-medium text-status-warning-fg">
                        {formatStatus(project.dispatch_status, copy, "project")}
                      </span>
                    </div>
                    <div className="mt-0.5 truncate text-11 text-text-secondary">
                      {project.address || "—"}
                    </div>
                    <BuildingRail
                      installed={project.installed_doors}
                      assigned={project.assigned_open_doors}
                      unassigned={project.unassigned_doors}
                      total={project.total_doors}
                      label={copy.rail
                        .replace("{installed}", String(project.installed_doors))
                        .replace("{assigned}", String(project.assigned_open_doors))
                        .replace("{unassigned}", String(project.unassigned_doors))}
                    />
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-11 text-text-secondary">
                      <span>
                        <b className="font-semibold text-text">{project.unassigned_doors}</b>{" "}
                        {copy.unassignedDoors}
                      </span>
                      <span>
                        <b className="font-semibold text-text">{project.open_issues}</b>{" "}
                        {copy.problems}
                      </span>
                      <span>
                        {copy.nextVisit}: {project.next_visit_title || formatDateTime(project.next_visit_at)}
                      </span>
                    </div>
                  </div>
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-text-tertiary transition-transform group-hover:translate-x-0.5 group-hover:text-text rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
                    strokeWidth={1.8}
                  />
                </button>
              ))
            ) : (
              <div className="rounded-md border border-dashed border-border px-4 py-6 text-center text-12 text-text-secondary">
                {copy.projectsEmpty}
              </div>
            )}
          </div>
        </div>

        <div className="xl:col-span-2">
          <div className="mb-2.5 flex items-center justify-between gap-3">
            <div className="text-12 font-semibold text-text">{copy.installers}</div>
            <button
              type="button"
              onClick={onOpenInstallers}
              className="text-11 font-medium text-link hover:underline"
            >
              {actions.openInstallers}
            </button>
          </div>
          <div className="space-y-2">
            {visibleInstallers.length > 0 ? (
              visibleInstallers.map((installer) => (
                <div
                  key={installer.installer_id}
                  data-entity={entityKey("installer", installer.installer_id)}
                  className="rounded-md border border-border bg-surface-subtle px-3 py-2.5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-13 font-semibold text-text">
                      {installer.installer_name}
                    </span>
                    <span className="shrink-0 rounded-full bg-status-ok-bg px-2 py-0.5 text-11 font-medium text-status-ok-fg">
                      {formatStatus(installer.availability_band, copy, "installer")}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-11 text-text-secondary">
                    <span>{installer.assigned_open_doors} {copy.openDoors}</span>
                    <span>{installer.active_projects} {copy.activeProjects}</span>
                  </div>
                  <div className="mt-1 truncate text-11 text-text-secondary">
                    {copy.nextVisit}: {installer.next_event_title || formatDateTime(installer.next_event_at)}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-md border border-dashed border-border px-4 py-6 text-center text-12 text-text-secondary">
                {copy.installersEmpty}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
