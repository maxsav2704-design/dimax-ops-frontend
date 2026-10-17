import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import type { KpiTone } from "./kpi-logic";

// One quiet line of facts under a page or record header (premium visual,
// 2026-10-17): number, caption, a tone dot only where the number is a state,
// and an optional mini rail for a done/total pair. Replaces rows of cards
// that pushed the working area below the fold.

export type FactItem = {
  key: string;
  label: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
  /** neutral draws no dot; ok / warn / bad draw the status dot before the value. */
  tone?: KpiTone;
  /** Mini rail: done out of total (0..1 fill), drawn after the value. */
  rail?: { done: number; total: number };
  testId?: string;
};

type FactStripProps = {
  items: FactItem[];
  className?: string;
  testId?: string;
};

export function FactStrip({ items, className, testId }: FactStripProps) {
  return (
    <dl className={cn("dmx-facts", className)} data-testid={testId}>
      {items.map((item) => {
        const tone = item.tone ?? "neutral";
        const ratio = item.rail ? Math.max(0, Math.min(1, item.rail.total > 0 ? item.rail.done / item.rail.total : 0)) : null;
        return (
          <div key={item.key} className="dmx-fact" data-tone={tone} data-testid={item.testId}>
            <dt className="type-caption">{item.label}</dt>
            <dd className="dmx-fact-value">
              {tone !== "neutral" ? <span className="dmx-fact-dot" aria-hidden="true" /> : null}
              <span className="num text-16 font-semibold leading-none text-text">{item.value}</span>
              {ratio !== null ? (
                <span className="dmx-rail dmx-fact-rail" role="img" aria-label={`${item.rail!.done} / ${item.rail!.total}`}>
                  <i className="dmx-rail-installed" style={{ width: `${ratio * 100}%` }} />
                </span>
              ) : null}
            </dd>
            {item.detail ? <dd className="type-caption truncate">{item.detail}</dd> : null}
          </div>
        );
      })}
    </dl>
  );
}
