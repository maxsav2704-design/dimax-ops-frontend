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
    <div className="glass-card card-lift rounded-xl p-5 animate-fade-in h-full">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold text-card-foreground">Problem Projects (Top 10)</h3>
        <button
          onClick={onViewAll}
          className="btn-premium text-[12px] font-medium text-muted-foreground hover:text-accent px-3 py-1.5 rounded-lg border border-border"
        >
          View all
        </button>
      </div>

      {projects.length > 0 ? (
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-[11px] font-medium text-muted-foreground pb-2.5 uppercase tracking-wider">Project</th>
              <th className="text-left text-[11px] font-medium text-muted-foreground pb-2.5 uppercase tracking-wider">Problems</th>
              <th className="text-left text-[11px] font-medium text-muted-foreground pb-2.5 uppercase tracking-wider">Updated</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p, i) => (
              <tr key={i} className="border-b border-border/50 last:border-0 row-hover cursor-pointer">
                <td className="py-3 text-[13px] text-card-foreground font-medium">{p.name}</td>
                <td className="py-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-destructive/10 text-destructive text-[12px] font-medium">
                    {p.problems}
                  </span>
                </td>
                <td className="py-3 text-[12px] text-muted-foreground">{p.updated}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
