import { type HTMLAttributes, type ReactNode } from "react";
import { MoreVertical, RefreshCw } from "lucide-react";

type WidgetCardProps = HTMLAttributes<HTMLElement> & {
  title: ReactNode;
  updatedLabel?: ReactNode;
  titleAccessory?: ReactNode;
  headerMeta?: ReactNode;
  actionSlot?: ReactNode;
  onRefresh?: () => void;
  onMenu?: () => void;
  footer?: ReactNode;
  bleed?: boolean;
  children: ReactNode;
};

function cx(...classes: Array<string | undefined | false>): string {
  return classes.filter(Boolean).join(" ");
}

export function WidgetCard({
  title,
  updatedLabel,
  titleAccessory,
  headerMeta,
  actionSlot,
  onRefresh,
  onMenu,
  footer,
  bleed = false,
  className,
  children,
  ...props
}: WidgetCardProps) {
  return (
    <section
      className={cx(
        "overflow-hidden rounded-lg border border-border bg-surface",
        className,
      )}
      {...props}
    >
      <header className="flex flex-col gap-2 border-b border-border-subtle px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-baseline gap-2">
            <h3 className="truncate text-13 font-medium text-text">{title}</h3>
            {updatedLabel ? (
              <span className="text-11 text-text-secondary">
                {updatedLabel}
              </span>
            ) : null}
            {titleAccessory ? (
              <span className="ms-0.5">{titleAccessory}</span>
            ) : null}
          </div>
          {headerMeta ? (
            <div className="mt-0.5 truncate text-11 text-text-secondary">
              {headerMeta}
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 text-text-secondary">
          {actionSlot}
          {onRefresh ? (
            <button
              type="button"
              aria-label="Refresh"
              onClick={onRefresh}
              className="inline-flex h-8 w-8 items-center justify-center rounded-pill border border-border bg-surface text-text-secondary transition-colors duration-fast hover:bg-surface-subtle hover:text-text"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ) : null}
          {onMenu ? (
            <button
              type="button"
              aria-label="More options"
              onClick={onMenu}
              className="inline-flex h-8 w-8 items-center justify-center rounded-pill border border-border bg-surface text-text-secondary transition-colors duration-fast hover:bg-surface-subtle hover:text-text"
            >
              <MoreVertical className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </header>

      <div className={bleed ? "" : "p-4"}>{children}</div>

      {footer ? (
        <div className="border-t border-border-subtle px-4 py-2.5">
          {footer}
        </div>
      ) : null}
    </section>
  );
}
