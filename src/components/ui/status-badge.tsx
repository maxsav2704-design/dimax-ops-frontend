import { cn } from "@/lib/utils";
import {
  formatStatusLabel,
  getStatusRamp,
  type StatusDomain,
  type StatusRamp,
} from "@/lib/status-tokens";

type StatusBadgeProps = {
  status: string | null | undefined;
  label?: string;
  domain?: StatusDomain;
  ramp?: StatusRamp;
  className?: string;
  strikethrough?: boolean;
};

const RAMP_CLASSES: Record<StatusRamp, string> = {
  ok: "border-status-ok-border bg-status-ok-bg text-status-ok-fg",
  problem:
    "border-status-problem-border bg-status-problem-bg text-status-problem-fg",
  warning:
    "border-status-warning-border bg-status-warning-bg text-status-warning-fg",
  progress:
    "border-status-progress-border bg-status-progress-bg text-status-progress-fg",
  blocked:
    "border-status-blocked-border bg-status-blocked-bg text-status-blocked-fg",
  draft: "border-status-draft-border bg-status-draft-bg text-status-draft-fg",
  archived:
    "border-status-archived-border bg-status-archived-bg text-status-archived-fg",
};

export function StatusBadge({
  status,
  label,
  domain = "generic",
  ramp,
  className,
  strikethrough = false,
}: StatusBadgeProps) {
  const resolvedRamp = ramp || getStatusRamp(status, domain);
  const resolvedLabel = label || formatStatusLabel(status);

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none",
        "whitespace-nowrap tabular-nums",
        RAMP_CLASSES[resolvedRamp],
        strikethrough && "line-through opacity-75",
        className,
      )}
      title={resolvedLabel}
    >
      {resolvedLabel}
    </span>
  );
}
