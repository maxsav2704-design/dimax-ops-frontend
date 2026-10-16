// Moved verbatim from ProjectsPage.tsx (monolith split).

import { type MatrixRow } from "@/components/projects/door-workspace/types";

export function matrixCompletionPct(installedCount: number, totalDoors: number): number {
  return Math.min(
    100,
    Math.max(
      0,
      Math.round((installedCount / Math.max(totalDoors, 1)) * 100),
    ),
  );
}

export function matrixDoorTileLabel(row: MatrixRow): string {
  return row.door_marking.trim() || row.unit_label;
}

export function matrixDoorTileTone(row: MatrixRow): string {
  const normalized = row.status.trim().toUpperCase();
  if (row.issue_count > 0) {
    return "border-status-problem-border bg-status-problem-bg text-status-problem-fg";
  }
  if (["INSTALLED", "DONE", "COMPLETED"].includes(normalized)) {
    return "border-status-ok-border bg-status-ok-bg text-status-ok-fg";
  }
  if (["IN_PROGRESS", "ASSIGNED", "ACTIVE"].includes(normalized)) {
    return "border-status-progress-border bg-status-progress-bg text-status-progress-fg";
  }
  if (["BLOCKED", "LOCKED"].includes(normalized)) {
    return "border-status-blocked-border bg-status-blocked-bg text-status-blocked-fg";
  }
  if (["CANCELLED", "CANCELED"].includes(normalized)) {
    return "border-status-archived-border bg-status-archived-bg text-status-archived-fg line-through opacity-75";
  }
  return "border-status-warning-border bg-status-warning-bg text-status-warning-fg";
}

export function matrixProgressTone(issueCount: number, progressPct: number): string {
  if (issueCount > 0) {
    return "bg-kpi-red";
  }
  if (progressPct >= 100) {
    return "bg-kpi-green";
  }
  if (progressPct > 0) {
    return "bg-kpi-yellow";
  }
  return "bg-kpi-orange";
}
