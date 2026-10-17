"use client";

import { useCopy, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";
import { reportsDashboardToneClasses } from "./shared";
import type { ReportsDashboardTone, ReportsInsight, ReportsLibraryGroup } from "./types";

// Presentational widgets of the reports page (moved verbatim from ReportsPage.tsx).

const insightTone: Record<ReportsDashboardTone, "neutral" | "ok" | "warn" | "bad"> = {
  red: "bad",
  orange: "warn",
  green: "ok",
  blue: "neutral",
  neutral: "neutral",
};

// Executive insight: tone from the data (E4 semantics), value, delta, the
// detail and where it leads. The decorative chart that drew fixed shapes
// regardless of the numbers was removed (premium visual, 2026-10-17).
export function ReportsInsightCard({ insight }: { insight: ReportsInsight }) {
  return (
    <button
      type="button"
      onClick={insight.onClick}
      className="kpi-tile"
      data-interactive="true"
      data-tone={insightTone[insight.tone]}
      data-testid="reports-insight"
    >
      <span className="type-caption">{insight.eyebrow}</span>
      <span className="truncate text-14 font-medium text-text">{insight.title}</span>
      <span className="kpi-tile-value">{insight.value}</span>
      <span className="text-12 text-text-secondary">{insight.delta}</span>
      <span className="text-12 leading-5 text-text-secondary">
        {insight.detail} <span className="font-medium text-link">{insight.cta}</span>
      </span>
    </button>
  );
}


export function ReportsLibraryCard({ group, locale }: { group: ReportsLibraryGroup; locale: Locale }) {
  const tone = reportsDashboardToneClasses(group.tone);
  const Icon = group.icon;
  const copy = useCopy();

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="flex items-center gap-3 border-b border-border-subtle px-4 py-3.5">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            tone.icon,
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-13 font-medium text-text">
            {group.title}
          </div>
          <div className="truncate text-11 text-text-secondary">
            {group.count} {copy("reports ·", "отчётов ·", "דוחות ·")} {group.subtitle}
          </div>
        </div>
      </div>
      <div className="divide-y divide-border-subtle">
        {group.rows.map((row) => (
          <button
            key={`${group.title}-${row.title}`}
            type="button"
            onClick={row.onClick}
            className="grid w-full grid-cols-[24px_minmax(0,1fr)_auto_auto] items-center gap-3 px-4 py-3 text-start transition hover:bg-surface-subtle"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-md border border-border-subtle bg-surface-subtle text-11 font-medium text-text-secondary">
              {row.icon}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-13 font-medium text-text">
                {row.title}
              </span>
              <span className="block truncate text-11 text-text-secondary">
                {row.subtitle}
              </span>
            </span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-11 font-medium",
                row.badge === "live" && "bg-status-ok-bg text-status-ok-fg",
                row.badge === "new" && "bg-blue-50 text-link",
                row.badge === "pinned" && "bg-accent/20 text-text",
                !row.badge && "bg-transparent text-transparent",
              )}
            >
              {row.badge === "pinned" ? "pin" : row.badge || "-"}
            </span>
            <span className="text-end text-11 font-medium text-text-tertiary">
              {row.meta}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}


export function SavedReportViewCard({
  eyebrow,
  tone,
  title,
  value,
}: {
  eyebrow: string;
  tone: ReportsDashboardTone;
  title: string;
  value: string;
}) {
  const toneClasses = reportsDashboardToneClasses(tone);
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border border-border bg-surface px-4 py-3 before:absolute before:inset-y-3 before:left-0 before:w-[3px] before:rounded-r-full",
        toneClasses.border,
      )}
    >
      <div className="ps-2">
        <div className="flex items-center justify-between gap-2">
          <div className="truncate text-11 font-medium text-text-secondary">
            {eyebrow}
          </div>
          <Star className="h-3.5 w-3.5 shrink-0 text-accent" />
        </div>
        <div className="mt-2 text-13 font-medium text-text">{title}</div>
        <div className={cn("num mt-2 truncate text-18 font-semibold", toneClasses.text)}>
          {value}
        </div>
      </div>
    </div>
  );
}


export function SectionMessage({
  title,
  detail,
  tone = "muted",
}: {
  title: string;
  detail: string;
  tone?: "muted" | "error";
}) {
  const toneClass =
    tone === "error"
      ? "border-status-problem-border bg-status-problem-bg text-status-problem-fg"
      : "border-border bg-surface text-text-secondary";
  return (
    <div className={cn("rounded-lg border px-4 py-3 text-13", toneClass)}>
      <div className="font-medium">{title}</div>
      <div className="mt-1 text-12">{detail}</div>
    </div>
  );
}
