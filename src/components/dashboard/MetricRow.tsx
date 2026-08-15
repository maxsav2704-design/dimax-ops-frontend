import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type MetricRowTone = "accent" | "success" | "warning" | "danger" | "info";

type MetricRowProps = {
  label: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
  tone?: MetricRowTone;
  progress?: number;
  className?: string;
};

const toneClass: Record<MetricRowTone, string> = {
  accent: "bg-kpi-yellow",
  success: "bg-kpi-green",
  warning: "bg-kpi-orange",
  danger: "bg-kpi-red",
  info: "bg-kpi-blue",
};

export function MetricRow({
  label,
  value,
  detail,
  tone = "accent",
  progress,
  className,
}: MetricRowProps) {
  const normalizedProgress =
    typeof progress === "number" && Number.isFinite(progress)
      ? Math.min(Math.max(progress, 0), 100)
      : null;

  return (
    <div
      className={cn(
        "relative rounded-lg border border-border bg-surface px-4 py-3 ps-5",
        className,
      )}
    >
      <div
        className={cn(
          "absolute inset-y-3 start-0 w-[3px] rounded-e-sm",
          toneClass[tone],
        )}
      />
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 text-start">
          <div className="truncate text-[13px] font-medium leading-5 text-text">
            {label}
          </div>
          {detail ? (
            <div className="mt-1 text-[12px] leading-5 text-text-secondary">
              {detail}
            </div>
          ) : null}
        </div>
        <div className="shrink-0 text-[12px] font-medium leading-5 text-text tabular-nums">
          {value}
        </div>
      </div>
      {normalizedProgress !== null ? (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-sunken">
          <div
            className={cn("h-full rounded-full", toneClass[tone])}
            style={{ width: `${normalizedProgress}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}
