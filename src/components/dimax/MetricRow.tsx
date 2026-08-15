import { type HTMLAttributes, type ReactNode } from "react";

import type { KpiBarColor } from "./KpiCard";

type MetricRowProps = HTMLAttributes<HTMLDivElement> & {
  label: ReactNode;
  value: ReactNode;
  barColor?: KpiBarColor;
  href?: string;
  withSeparator?: boolean;
};

const barColorClassName: Record<KpiBarColor, string> = {
  yellow: "bg-kpi-yellow",
  orange: "bg-kpi-orange",
  red: "bg-kpi-red",
  green: "bg-kpi-green",
  blue: "bg-kpi-blue",
};

function cx(...classes: Array<string | undefined | false>): string {
  return classes.filter(Boolean).join(" ");
}

export function MetricRow({
  label,
  value,
  barColor = "yellow",
  href,
  withSeparator = true,
  className,
  ...props
}: MetricRowProps) {
  const containerClassName = cx(
    "flex items-center px-4 py-2.5 text-13 text-text",
    withSeparator && "border-t border-border-subtle first:border-t-0",
    href &&
      "cursor-pointer transition-colors duration-fast ease-standard hover:bg-surface-subtle",
    className,
  );

  const content = (
    <>
      <span
        aria-hidden="true"
        className={cx(
          "me-2.5 h-3.5 w-[3px] shrink-0 rounded-pill",
          barColorClassName[barColor],
        )}
      />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className="ms-2 font-medium tabular-nums">{value}</span>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        className={containerClassName}
        {...(props as HTMLAttributes<HTMLAnchorElement>)}
      >
        {content}
      </a>
    );
  }

  return (
    <div className={containerClassName} {...props}>
      {content}
    </div>
  );
}
