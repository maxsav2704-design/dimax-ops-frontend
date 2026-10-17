import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { useCopy } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import { resolveKpiTone, sparklineGeometry, type KpiThresholds, type KpiTone } from "./kpi-logic";
import { useAnimatedNumber } from "./useAnimatedNumber";

// E4 threshold tile: the tone is computed from the metric and its thresholds
// (see kpi-logic.ts), so colour changes only when a threshold is crossed.

type KpiTileProps = {
  label: ReactNode;
  value: ReactNode;
  /** Numeric metric used for the tone (and the delta when `previous` is given). */
  metric?: number | null;
  thresholds?: KpiThresholds;
  /** Explicit tone wins over thresholds. */
  tone?: KpiTone;
  /** Previous-period value; the delta is rendered as "+N"/"−N" with the label. */
  previous?: number | null;
  deltaLabel?: ReactNode;
  /** Status text shown as a quiet pill (e.g. "за неделю"). */
  status?: ReactNode;
  /** Last points for the sparkline (14 is the convention). */
  series?: number[];
  detail?: ReactNode;
  pending?: boolean;
  /** E5: the tile is a toggle that filters the working area below. */
  selected?: boolean;
  onSelect?: () => void;
  className?: string;
  testId?: string;
};

export function KpiTile({
  label, value, metric, thresholds, tone, previous, deltaLabel, status, series, detail, pending, selected, onSelect, className, testId,
}: KpiTileProps) {
  const copy = useCopy();
  const resolvedTone = tone ?? resolveKpiTone(metric, thresholds);
  const interactive = typeof onSelect === "function";
  const delta = metric != null && previous != null && Number.isFinite(metric) && Number.isFinite(previous) ? metric - previous : null;
  const geometry = series && series.length > 1 ? sparklineGeometry(series) : null;
  const loadingText = copy("Loading", "Загрузка", "טוען");
  const content = (
    <>
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <span className="type-caption min-w-0 flex-1 basis-28">{label}</span>
        {pending ? <Skeleton className="h-4 w-12 shrink-0 rounded-full" /> : status ? (
          <span className="shrink-0 rounded-full bg-surface-sunken px-2 py-0.5 text-11 font-medium text-text-secondary">{status}</span>
        ) : null}
      </div>
      {pending ? (
        <>
          <Skeleton className="h-6 w-16" />
          <span className="sr-only">{loadingText}</span>
        </>
      ) : (
        <span className="kpi-tile-value">{typeof value === "number" ? <AnimatedValue value={value} /> : value}</span>
      )}
      {!pending && delta != null ? (
        <span className="num text-12 text-text-secondary" data-testid={testId ? `${testId}-delta` : undefined}>
          {delta > 0 ? "+" : delta < 0 ? "−" : "±"}
          {Math.abs(delta)}
          {deltaLabel ? <span className="font-sans"> {deltaLabel}</span> : null}
        </span>
      ) : null}
      {!pending && detail ? <span className="type-caption line-clamp-2">{detail}</span> : null}
      {geometry?.end && !pending ? (
        <svg className="kpi-tile-spark" viewBox="0 0 180 32" aria-hidden="true" data-testid={testId ? `${testId}-spark` : undefined}>
          <path className="spark-area" d={geometry.area} />
          <path className="spark-line" d={geometry.line} />
          <circle className="spark-end" cx={geometry.end.x} cy={geometry.end.y} r="2.5" />
        </svg>
      ) : null}
    </>
  );
  const shared = {
    className: cn("kpi-tile", className),
    "data-tone": pending ? "neutral" : resolvedTone,
    "data-testid": testId,
    "aria-busy": pending || undefined,
  };
  if (interactive) {
    return (
      <button type="button" {...shared} data-interactive="true" aria-pressed={!!selected} onClick={onSelect}>
        {content}
      </button>
    );
  }
  return <div {...shared}>{content}</div>;
}

function AnimatedValue({ value }: { value: number }) {
  const shown = useAnimatedNumber(value);
  return <>{shown}</>;
}
