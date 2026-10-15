import type { ReactNode } from "react";
import { Inbox, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type IconComponent = LucideIcon;

type EmptyStateProps = {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  icon?: IconComponent;
  /** "panel" draws the dashed card; "row" is the flat variant for table bodies. */
  variant?: "panel" | "row";
  className?: string;
  testId?: string;
};

// One empty state for every list, table and widget. Dashed border, calm tone,
// optional primary action; never a red or warning colour (empty is not an error).
export function EmptyState({
  title,
  description,
  action,
  icon: Icon = Inbox,
  variant = "panel",
  className,
  testId,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      data-testid={testId}
      className={cn(
        "flex flex-col items-center justify-center gap-2 px-6 text-center",
        variant === "panel"
          ? "rounded-lg border border-dashed border-border bg-surface-subtle py-10"
          : "py-8",
        className,
      )}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-sunken text-text-tertiary">
        <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden />
      </span>
      <p className="type-body font-medium">{title}</p>
      {description ? <p className="type-meta max-w-[42ch]">{description}</p> : null}
      {action ? <div className="mt-2 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}
