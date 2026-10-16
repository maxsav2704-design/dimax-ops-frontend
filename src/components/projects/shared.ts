// Moved verbatim from ProjectsPage.tsx (monolith split).
import { cn } from "@/lib/utils";
import { type ProjectOpenIssue } from "@/components/projects/project-types";
import { normalizeDraftPhone } from "@/components/projects/project-form";

export function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

export function formatPct(value: number | null | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }
  return `${value.toFixed(1)}%`;
}

export function riskTone(value: string): string {
  const normalized = value.trim().toUpperCase();
  if (["DANGER", "FAILED", "BLOCKED", "ERROR"].includes(normalized)) {
    return "border border-status-problem-border bg-status-problem-bg text-status-problem-fg";
  }
  if (["WARN", "AT_RISK", "UNASSIGNED"].includes(normalized)) {
    return "border border-status-warning-border bg-status-warning-bg text-status-warning-fg";
  }
  if (["OK", "READY", "DONE"].includes(normalized)) {
    return "border border-status-ok-border bg-status-ok-bg text-status-ok-fg";
  }
  return "border border-status-blocked-border bg-status-blocked-bg text-status-blocked-fg";
}

export async function copyTextToClipboard(value: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    return false;
  }
  await navigator.clipboard.writeText(value);
  return true;
}

export function formatReadablePhone(value: string | null | undefined): string {
  const normalized = normalizeDraftPhone(value || "");
  if (!normalized) {
    return value?.trim() || "?";
  }
  if (normalized.startsWith("+972") && normalized.length === 13) {
    return `+972 ${normalized.slice(4, 6)}-${normalized.slice(6, 9)}-${normalized.slice(9)}`;
  }
  return normalized;
}

export function initialsFromName(value: string | null | undefined): string {
  const parts = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) {
    return "--";
  }
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

export function issueLabel(issue: ProjectOpenIssue): string {
  const parts = [issue.title, issue.details].filter(
    (value) => !!value && value.trim().length > 0,
  );
  if (parts.length === 0) {
    return issue.status;
  }
  return parts.join(" - ");
}

export function chunkIds(values: string[], size: number): string[][] {
  const safeSize = Math.max(1, size);
  const chunks: string[][] = [];
  for (let i = 0; i < values.length; i += safeSize) {
    chunks.push(values.slice(i, i + safeSize));
  }
  return chunks;
}

// Lazily loaded panels of the selected project. A failed load is recorded
// here and rendered as a retryable notice instead of an empty panel.

export const FAILED_QUEUE_PAGE_SIZE = 10;
// Door ledger rows rendered at once; "Show more" reveals the next page.

export function compareNatural(valueA: string, valueB: string): number {
  return valueA.localeCompare(valueB, "en", {
    numeric: true,
    sensitivity: "base",
  });
}

export function projectsPanelClass(extra?: string): string {
  return cn("rounded-lg border border-border bg-surface", extra);
}
