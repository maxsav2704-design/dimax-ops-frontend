import type { ReactNode } from "react";

import { Breadcrumbs, type BreadcrumbItem } from "@/components/dimax/Breadcrumbs";
import { useScrolledPast } from "@/components/dimax/useScrolledPast";

type DimaxPageHeaderProps = {
  eyebrow?: ReactNode;
  /** Replaces the eyebrow with a breadcrumb trail; the last item is the current page. */
  breadcrumbs?: BreadcrumbItem[];
  title: ReactNode;
  /** Plain text badge rendered in the quiet week-pill style. */
  badge?: ReactNode;
  /** A ready-made status pill (tone colours included) rendered next to the title as is. */
  status?: ReactNode;
  subtitle?: ReactNode;
  /** Secondary facts under the subtitle (counts, last refresh); rendered as a quiet row. */
  meta?: ReactNode;
  actions?: ReactNode;
  /**
   * E3: after 120 px of scroll a 48 px bar keeps the title, the status and the
   * primary action in view. Pass the primary action (a second instance) here.
   */
  condensedAction?: ReactNode;
};

// The one page heading for admin screens: eyebrow or breadcrumbs, a single h1
// at the page-title size, an optional status badge, subtitle, meta and actions.
export function DimaxPageHeader({ eyebrow, breadcrumbs, title, badge, status, subtitle, meta, actions, condensedAction }: DimaxPageHeaderProps) {
  const condensed = useScrolledPast();
  const wantsCondensed = condensedAction !== undefined;
  return (
    <>
      {wantsCondensed ? (
        <div className="dmx-condensed-bar" data-on={condensed ? "true" : "false"} aria-hidden={!condensed} data-testid="dmx-condensed-bar">
          <span className="truncate text-14 font-medium text-text">{title}</span>
          {status ?? null}
          <span className="flex-1" />
          {condensedAction}
        </div>
      ) : null}
      <section className="dmx-page-header">
        <div className="min-w-0 flex-1">
          {breadcrumbs?.length ? (
            <Breadcrumbs items={breadcrumbs} className="mb-2" />
          ) : eyebrow ? (
            <div className="type-eyebrow mb-2">{eyebrow}</div>
          ) : null}
          <div className="dmx-title-row">
            <h1 className="dmx-page-title">{title}</h1>
            {badge ? <span className="dmx-week-pill">{badge}</span> : null}
            {status ?? null}
          </div>
          {subtitle ? <p className="dmx-page-subtitle mt-1">{subtitle}</p> : null}
          {meta ? <div className="type-caption mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">{meta}</div> : null}
        </div>
        {actions ? <div className="toolbar-row shrink-0">{actions}</div> : null}
      </section>
    </>
  );
}
