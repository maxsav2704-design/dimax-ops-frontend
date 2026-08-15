import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type WidgetCardProps = {
  title: string;
  description?: string;
  meta?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
};

export function WidgetCard({
  title,
  description,
  meta,
  action,
  children,
  className,
  bodyClassName,
}: WidgetCardProps) {
  return (
    <section
      className={cn(
        "h-full overflow-hidden rounded-lg border border-border bg-surface",
        className,
      )}
    >
      <header className="flex flex-col gap-3 border-b border-border-subtle px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 text-start">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h3 className="text-[13.5px] font-medium leading-5 text-text">
              {title}
            </h3>
            {meta ? (
              <div className="text-[11px] font-medium leading-5 text-text-secondary">
                {meta}
              </div>
            ) : null}
          </div>
          {description ? (
            <p className="mt-1 text-[12px] leading-5 text-text-secondary">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}
