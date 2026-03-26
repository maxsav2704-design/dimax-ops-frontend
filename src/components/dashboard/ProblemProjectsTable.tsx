import { FileWarning } from "lucide-react";

interface ProblemProject {
  name: string;
  problems: number;
  updated: string;
}

interface ProblemProjectsTableProps {
  projects: ProblemProject[];
  onViewAll?: () => void;
}

export function ProblemProjectsTable({ projects, onViewAll }: ProblemProjectsTableProps) {
  return (
    <div className="glass-card card-lift h-full rounded-[1.2rem] p-5 animate-fade-in">
      <div className="panel-heading mb-5">
        <div>
          <h3 className="panel-title">Problem Projects (Top 10)</h3>
          <p className="panel-subtitle mt-1">Projects with the highest unresolved installation pressure.</p>
        </div>
        <button
          onClick={onViewAll}
          className="btn-premium rounded-xl border border-border px-3 py-2 text-[12px] font-medium text-muted-foreground hover:text-accent"
        >
          View all
        </button>
      </div>

      {projects.length > 0 ? (
        <div className="data-table-shell">
          <table className="w-full">
            <thead>
              <tr className="data-table-head">
                <th className="px-4 py-3 text-left">Project</th>
                <th className="px-4 py-3 text-left">Problems</th>
                <th className="px-4 py-3 text-left">Updated</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p, i) => (
                <tr key={i} className="data-table-row row-hover cursor-pointer">
                  <td className="px-4 py-3 font-medium text-card-foreground">{p.name}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-destructive/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-destructive">
                      {p.problems}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-muted-foreground">{p.updated}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
            <FileWarning className="w-5 h-5 text-muted-foreground/60" strokeWidth={1.5} />
          </div>
          <p className="text-[13px] text-muted-foreground">No problem projects.</p>
          <p className="text-[11px] text-muted-foreground/60 mt-1">All projects are running smoothly.</p>
        </div>
      )}
    </div>
  );
}
