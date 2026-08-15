import { cn } from "@/lib/utils";
import { Check, Minus } from "lucide-react";

export type CircleState = "empty" | "partial" | "complete";

interface MasterCircleProps {
  state: CircleState;
  onClick: () => void;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function MasterCircle({
  state,
  onClick,
  disabled = false,
  size = "md",
  className,
}: MasterCircleProps) {
  const dim = size === "sm" ? "w-[14px] h-[14px]" : "w-[18px] h-[18px]";
  const iconSize = size === "sm" ? "w-2 h-2" : "w-2.5 h-2.5";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={
        state === "complete"
          ? "Отметить как не выполнено"
          : state === "partial"
            ? "Заполнено частично"
            : "Отметить как выполнено"
      }
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border transition-transform duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        dim,
        state === "complete"
          ? "border-dimax-ink bg-dimax-ink text-text-inverse"
          : state === "partial"
            ? "border-border-strong bg-surface-sunken text-text-secondary"
            : "border-border bg-surface text-transparent hover:border-border-strong",
        disabled && "opacity-30 cursor-not-allowed",
        !disabled && "cursor-pointer hover:scale-[1.02]",
        className,
      )}
    >
      {state === "complete" && <Check className={iconSize} strokeWidth={2.5} />}
      {state === "partial" && <Minus className={iconSize} strokeWidth={2.5} />}
    </button>
  );
}

export function computeCircleState(checks: boolean[]): CircleState {
  const total = checks.length;
  if (total === 0) return "empty";
  const checked = checks.filter(Boolean).length;
  if (checked === 0) return "empty";
  if (checked === total) return "complete";
  return "partial";
}
