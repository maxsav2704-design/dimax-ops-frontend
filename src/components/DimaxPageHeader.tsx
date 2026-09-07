import type { ReactNode } from "react";
type DimaxPageHeaderProps = {
  eyebrow: ReactNode;
  title: ReactNode;
  badge?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
};
export function DimaxPageHeader({
  eyebrow,
  title,
  badge,
  subtitle,
  actions,
}: DimaxPageHeaderProps) {
  return (
    <section className="dmx-page-header">
      {" "}
      <div className="min-w-0 flex-1">
        {" "}
        <div className="mb-2 text-[10.5px] font-medium uppercase text-text-secondary">
          {" "}
          {eyebrow}{" "}
        </div>{" "}
        <div className="dmx-title-row">
          {" "}
          <h1 className="dmx-page-title">{title}</h1>{" "}
          {badge ? <span className="dmx-week-pill">{badge}</span> : null}{" "}
        </div>{" "}
        {subtitle ? (
          <p className="dmx-page-subtitle mt-1">{subtitle}</p>
        ) : null}{" "}
      </div>{" "}
      {actions ? <div className="toolbar-row">{actions}</div> : null}{" "}
    </section>
  );
}
