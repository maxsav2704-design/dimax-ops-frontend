import { TrendingUp } from "lucide-react";

interface TopReason {
  reason: string;
  count: number;
  percentage: number;
}

interface TopReasonsCardProps {
  reasons: TopReason[];
}

export function TopReasonsCard({ reasons }: TopReasonsCardProps) {
  return (
    <div className="glass-card card-lift h-full rounded-[1.2rem] p-5 animate-fade-in">
      <div className="panel-heading mb-5">
        <div>
          <h3 className="panel-title">Top reasons</h3>
          <p className="panel-subtitle mt-1">Issue drivers across the last seven-day window.</p>
        </div>
        <span className="metric-chip">7d range</span>
      </div>

      {reasons.length > 0 ? (
        <div className="space-y-4">
          {reasons.map((r, i) => (
            <div key={i} className="group/reason cursor-pointer">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-[13px] font-medium leading-6 text-card-foreground">{r.reason}</span>
                <span className="shrink-0 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  {r.count}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-accent/70 transition-all duration-500 group-hover/reason:bg-accent progress-glow"
                  style={{ width: `${r.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
            <TrendingUp className="w-5 h-5 text-muted-foreground/60" strokeWidth={1.5} />
          </div>
          <p className="text-[13px] text-muted-foreground">No data.</p>
          <p className="text-[11px] text-muted-foreground/60 mt-1">Reasons will appear when issues arise.</p>
        </div>
      )}
    </div>
  );
}
