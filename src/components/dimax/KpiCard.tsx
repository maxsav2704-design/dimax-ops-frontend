import { type HTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/utils";

import type { KpiTone } from "./kpi-logic";

export type KpiBarColor = "yellow" | "orange" | "red" | "green" | "blue";

type KpiCardProps = HTMLAttributes<HTMLDivElement> & {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  /** Legacy bar colour; mapped onto the shared tile tones (R3: yellow and blue are not statuses). */
  barColor?: KpiBarColor;
  emphasis?: "default" | "problem";
  href?: string;
};

const toneForBar: Record<KpiBarColor, KpiTone> = {
  yellow: "neutral",
  blue: "neutral",
  green: "ok",
  orange: "warn",
  red: "bad",
};

// Fact tile kept for the pages that still pass a bar colour: it renders on the
// shared .kpi-tile chrome, so every KPI in the admin shares one look and the
// colour means a state, not a decoration (premium visual, 2026-10-17).
export function KpiCard({
  label,
  value,
  hint,
  barColor = "yellow",
  emphasis = "default",
  href,
  className,
  ...props
}: KpiCardProps) {
  const tone: KpiTone = emphasis === "problem" ? "bad" : toneForBar[barColor];
  const content = (
    <>
      <span className="type-caption truncate">{label}</span>
      <span className="kpi-tile-value truncate">{value}</span>
      {hint ? <span className="type-caption truncate">{hint}</span> : null}
    </>
  );
  const containerClassName = cn("kpi-tile", className);

  if (href) {
    return (
      <a
        href={href}
        className={containerClassName}
        data-tone={tone}
        data-interactive="true"
        {...(props as HTMLAttributes<HTMLAnchorElement>)}
      >
        {content}
      </a>
    );
  }

  return (
    <div className={containerClassName} data-tone={tone} {...props}>
      {content}
    </div>
  );
}
