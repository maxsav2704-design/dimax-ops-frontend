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
    <div className="glass-card card-lift rounded-xl p-5 animate-fade-in h-full">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold text-card-foreground">Top reasons</h3>
        <span className="text-[11px] text-muted-foreground">7d range</span>
      </div>

      {reasons.length > 0 ? (
        <div className="space-y-3">
          {reasons.map((r, i) => (
            <div key={i} className="group/reason cursor-pointer">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[12px] font-medium text-card-foreground">{r.reason}</span>
                <span className="text-[11px] text-muted-foreground">{r.count}</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
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
