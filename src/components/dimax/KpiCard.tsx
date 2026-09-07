import { type HTMLAttributes, type ReactNode } from "react";

export type KpiBarColor = "yellow" | "orange" | "red" | "green" | "blue";

type KpiCardProps = HTMLAttributes<HTMLDivElement> & {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  barColor?: KpiBarColor;
  emphasis?: "default" | "problem";
  href?: string;
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
  const actualBarColor = emphasis === "problem" ? "red" : barColor;
  const content = (
    <>
      <div
        aria-hidden="true"
        className={cx(
          "absolute inset-y-2.5 start-0 w-[3px] rounded-e-sm",
          barColorClassName[actualBarColor],
        )}
      />
      <div className="ps-2">
        <div className="mb-1 truncate text-12 text-text-secondary">
          {label}
        </div>
        <div
          className={cx(
            "truncate text-24 font-medium leading-tight tabular-nums",
            emphasis === "problem" ? "text-status-problem-fg" : "text-text",
          )}
        >
          {value}
        </div>
        {hint ? (
          <div className="mt-1 truncate text-11 text-text-secondary">
            {hint}
          </div>
        ) : null}
      </div>
    </>
  );
  const containerClassName = cx(
    "relative overflow-hidden rounded-lg border bg-surface p-4",
    emphasis === "problem"
      ? "border-status-problem-border"
      : "border-border",
    href &&
      "cursor-pointer transition-colors duration-fast ease-standard hover:border-border-strong",
    className,
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
