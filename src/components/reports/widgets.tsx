"use client";

import { useCopy, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";
import { reportsDashboardToneClasses } from "./shared";
import type { ReportsDashboardTone, ReportsInsight, ReportsLibraryGroup } from "./types";

// Presentational widgets of the reports page (moved verbatim from ReportsPage.tsx).

export function ReportsInsightChart({
  tone,
  variant,
}: {
  tone: ReportsDashboardTone;
  variant: ReportsInsight["variant"];
}) {
  const stroke =
    tone === "red"
      ? "var(--dmx-status-problem-fg)"
      : tone === "orange"
        ? "var(--dmx-status-warning-fg)"
        : "var(--dmx-status-ok-fg)";

  if (variant === "bars") {
    return (
      <svg
        aria-hidden="true"
        className="h-auto w-full"
        viewBox="0 0 320 100"
        preserveAspectRatio="xMidYMid meet"
      >
        <line x1="18" y1="78" x2="306" y2="78" stroke="var(--dmx-border)" />
        {[64, 38, 28, 18, 12, 10, 8, 6].map((height, index) => (
          <rect
            key={index}
            x={24 + index * 34}
            y={78 - height}
            width="24"
            height={height}
            rx="3"
            fill={index === 0 ? "var(--dmx-kpi-orange)" : "var(--dmx-kpi-yellow)"}
            opacity={index === 0 ? 1 : 0.7}
          />
        ))}
        <line
          x1="16"
          y1="35"
          x2="306"
          y2="35"
          stroke="var(--dmx-border-strong)"
          strokeDasharray="3 3"
        />
      </svg>
    );
  }

  const points =
    variant === "line-up"
      ? "48,68 80,60 112,62 144,52 176,54 208,42 240,38 272,28 304,22"
      : "48,28 80,34 112,30 144,42 176,50 208,54 240,60 272,66 304,72";

  return (
    <svg
      aria-hidden="true"
      className="h-auto w-full"
      viewBox="0 0 320 100"
      preserveAspectRatio="xMidYMid meet"
    >
      <line x1="40" y1="20" x2="308" y2="20" stroke="var(--dmx-border-subtle)" />
      <line x1="40" y1="45" x2="308" y2="45" stroke="var(--dmx-border-subtle)" />
      <line x1="40" y1="70" x2="308" y2="70" stroke="var(--dmx-border-subtle)" />
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.2"
      />
      <circle cx="304" cy={variant === "line-up" ? 22 : 72} r="4" fill="var(--dmx-bg-surface)" stroke={stroke} strokeWidth="2" />
    </svg>
  );
}


export function ReportsInsightCard({ insight }: { insight: ReportsInsight }) {
  const tone = reportsDashboardToneClasses(insight.tone);

  return (
    <button
      type="button"
      onClick={insight.onClick}
      className="overflow-hidden rounded-lg border border-border bg-surface text-start transition-colors hover:border-border-strong"
    >
      <div className={cn("h-[3px]", tone.accent)} />
      <div className="flex items-start justify-between gap-3 px-4 pb-2 pt-4">
        <div className="min-w-0">
          <div
            className={cn(
              "text-[10px] font-semibold uppercase tracking-[0.06em]",
              tone.text,
            )}
          >
            {insight.eyebrow}
          </div>
          <div className="mt-1 truncate text-[14.5px] font-medium text-text">
            {insight.title}
          </div>
        </div>
        <span className="text-lg text-text-tertiary">›</span>
      </div>
      <div className="flex flex-wrap items-baseline gap-2 px-4 pb-3">
        <div className={cn("text-[28px] font-semibold leading-none", tone.text)}>
          {insight.value}
        </div>
        <div className="text-[11.5px] text-text-secondary">{insight.delta}</div>
      </div>
      <div className="border-y border-border-subtle bg-gradient-to-b from-surface-subtle to-surface px-4 py-3">
        <ReportsInsightChart tone={insight.tone} variant={insight.variant} />
      </div>
      <div className="px-4 py-3 text-[11.5px] leading-5 text-text-secondary">
        {insight.detail}{" "}
        <span className="font-medium text-link">{insight.cta}</span>
      </div>
    </button>
  );
}


export function ReportsLibraryCard({ group, locale }: { group: ReportsLibraryGroup; locale: Locale }) {
  const tone = reportsDashboardToneClasses(group.tone);
  const Icon = group.icon;
  const copy = useCopy();

  return (
    <div className="overflow-hidden rounded-[12px] border border-border bg-surface">
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
          <div className="text-[13.5px] font-medium text-text">
            {group.title}
          </div>
          <div className="truncate text-[11px] text-text-secondary">
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
            <span className="flex h-6 w-6 items-center justify-center rounded-md border border-border-subtle bg-surface-subtle text-[11px] font-medium text-text-secondary">
              {row.icon}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-medium text-text">
                {row.title}
              </span>
              <span className="block truncate text-[11px] text-text-secondary">
                {row.subtitle}
              </span>
            </span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[9.5px] font-medium",
                row.badge === "live" && "bg-status-ok-bg text-status-ok-fg",
                row.badge === "new" && "bg-blue-50 text-link",
                row.badge === "pinned" && "bg-accent/20 text-text",
                !row.badge && "bg-transparent text-transparent",
              )}
            >
              {row.badge === "pinned" ? "pin" : row.badge || "-"}
            </span>
            <span className="text-end text-[10.5px] font-medium text-text-tertiary">
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
        "relative overflow-hidden rounded-[10px] border border-border bg-surface px-4 py-3 before:absolute before:inset-y-3 before:left-0 before:w-[3px] before:rounded-r-full",
        toneClasses.border,
      )}
    >
      <div className="pl-2">
        <div className="flex items-center justify-between gap-2">
          <div className="truncate text-[9.5px] font-semibold uppercase tracking-[0.05em] text-text-secondary">
            {eyebrow}
          </div>
          <Star className="h-3.5 w-3.5 shrink-0 text-accent" />
        </div>
        <div className="mt-2 text-[12.5px] font-medium text-text">{title}</div>
        <div className={cn("mt-2 truncate text-lg font-semibold", toneClasses.text)}>
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
    <div className={cn("rounded-lg border px-4 py-3 text-[13px]", toneClass)}>
      <div className="font-medium">{title}</div>
      <div className="mt-1 text-[12px]">{detail}</div>
    </div>
  );
}
