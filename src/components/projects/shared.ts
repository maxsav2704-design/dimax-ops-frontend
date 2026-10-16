// Moved verbatim from ProjectsPage.tsx (monolith split).

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
