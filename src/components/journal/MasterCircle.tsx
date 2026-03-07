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
      className={cn(
        "rounded-full border transition-all duration-150 flex items-center justify-center shrink-0",
        dim,
        state === "complete"
          ? "border-gray-800 bg-gray-800 text-white"
          : state === "partial"
            ? "border-gray-500 bg-gray-100 text-gray-600"
            : "border-gray-300 bg-white text-transparent hover:border-gray-500",
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
