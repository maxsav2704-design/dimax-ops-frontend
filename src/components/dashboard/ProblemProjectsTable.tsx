import { ArrowRight, FileWarning } from "lucide-react";
import { getDashboardCopy } from "@/components/dashboard/copy";
import { WidgetCard } from "@/components/dashboard/WidgetCard";
import { Button } from "@/components/ui/button";
import { LtrText } from "@/components/ui/LtrText";
import { useI18n } from "@/lib/i18n";

interface ProblemProject {
  projectId: string;
  name: string;
  problems: number;
  address: string;
}

interface ProblemProjectsTableProps {
  projects: ProblemProject[];
  onViewAll?: () => void;
  onOpenProject?: (projectId: string) => void;
}

export function ProblemProjectsTable({
  projects,
  onViewAll,
  onOpenProject,
}: ProblemProjectsTableProps) {
  const { locale } = useI18n();
  const dashboardCopy = getDashboardCopy(locale);
  const copy = dashboardCopy.problemsTable;
  const openProjectLabel = dashboardCopy.dispatcher.projectsSection.openProject;
  const showActions = Boolean(onOpenProject);

  return (
    <WidgetCard
      title={copy.title}
      description={copy.description}
      action={
        <Button type="button" variant="outline" size="sm" onClick={onViewAll}>
          {copy.viewAll}
        </Button>
      }
      bodyClassName={projects.length > 0 ? "p-0" : undefined}
    >
      {projects.length > 0 ? (
        <div className="overflow-auto">
          <table className="w-full">
            <thead>
              <tr className="data-table-head">
                <th className="px-4 py-3 text-start">{copy.project}</th>
                <th className="px-4 py-3 text-start">{copy.problems}</th>
                <th className="px-4 py-3 text-start">{copy.address}</th>
                {showActions ? (
                  <th className="px-4 py-3 text-end">{openProjectLabel}</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {projects.map((p, i) => (
                <tr key={`${p.projectId}-${i}`} className="data-table-row row-hover">
                  <td className="max-w-[260px] truncate px-4 py-3 font-medium text-text">
                    {p.name}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full border border-status-problem-border bg-status-problem-bg px-2.5 py-1 text-[11px] font-medium leading-none text-status-problem-fg">
                      <LtrText>{p.problems}</LtrText>
                    </span>
                  </td>
                  <td className="max-w-[280px] truncate px-4 py-3 text-[12px] text-text-secondary">
                    {p.address}
                  </td>
                  {showActions ? (
                    <td className="px-4 py-3 text-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5"
                        onClick={() => onOpenProject?.(p.projectId)}
                      >
                        {openProjectLabel}
                        <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.8} />
                      </Button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="w-10 h-10 rounded-full bg-surface-sunken flex items-center justify-center mb-3">
            <FileWarning
              className="w-5 h-5 text-text-secondary"
              strokeWidth={1.5}
            />
          </div>
          <p className="text-[13px] text-text-secondary">{copy.empty}</p>
          <p className="mt-1 text-[11px] text-text-tertiary">
            {copy.emptyHint}
          </p>
        </div>
      )}
    </WidgetCard>
  );
}
