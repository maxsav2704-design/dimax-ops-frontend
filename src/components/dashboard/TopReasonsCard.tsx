import { TrendingUp } from "lucide-react";
import { MetricRow } from "@/components/dashboard/MetricRow";
import { getDashboardCopy } from "@/components/dashboard/copy";
import { WidgetCard } from "@/components/dashboard/WidgetCard";
import { LtrText } from "@/components/ui/LtrText";
import { useI18n } from "@/lib/i18n";
interface TopReason {
  reason: string;
  count: number;
  percentage: number;
}
interface TopReasonsCardProps {
  reasons: TopReason[];
}
export function TopReasonsCard({ reasons }: TopReasonsCardProps) {
  const { locale } = useI18n();
  const copy = getDashboardCopy(locale).topReasons;
  return (
    <WidgetCard
      title={copy.title}
      description={copy.description}
      meta={<span>{copy.range7d}</span>}
    >
      {" "}
      {reasons.length > 0 ? (
        <div className="space-y-3">
          {" "}
          {reasons.map((r, i) => (
            <MetricRow
              key={`${r.reason}-${i}`}
              label={r.reason}
              value={<LtrText>{r.count}</LtrText>}
              detail={<LtrText>{`${r.percentage}%`}</LtrText>}
              progress={r.percentage}
              tone={i === 0 ? "danger" : i === 1 ? "warning" : "accent"}
            />
          ))}{" "}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          {" "}
          <div className="w-10 h-10 rounded-full bg-surface-sunken flex items-center justify-center mb-3">
            {" "}
            <TrendingUp
              className="w-5 h-5 text-text-secondary"
              strokeWidth={1.5}
            />{" "}
          </div>{" "}
          <p className="text-[13px] text-text-secondary">{copy.empty}</p>{" "}
          <p className="mt-1 text-[11px] text-text-tertiary">
            {copy.emptyHint}
          </p>{" "}
        </div>
      )}{" "}
    </WidgetCard>
  );
}
