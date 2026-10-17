// Moved verbatim from ProjectsPage.tsx (monolith split).

import type { KeyboardEvent } from "react";

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

export type MatrixArrowKey = "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown";

export function isMatrixArrowKey(key: string): key is MatrixArrowKey {
  return key === "ArrowLeft" || key === "ArrowRight" || key === "ArrowUp" || key === "ArrowDown";
}

/**
 * E7 keyboard logic: tiles are listed in DOM order and grouped by their floor
 * key. Left/right move within the floor (mirrored in RTL), up/down move to the
 * same position on the previous/next floor, clamped to that floor's last tile.
 * Returns null when there is nowhere to go.
 */
export function nextMatrixTile<T extends { floorKey: string }>(
  tiles: T[],
  current: T,
  key: MatrixArrowKey,
  rtl = false,
): T | null {
  const index = tiles.indexOf(current);
  if (index < 0) return null;
  const floorKeys = Array.from(new Set(tiles.map((tile) => tile.floorKey)));
  const floorIndex = floorKeys.indexOf(current.floorKey);
  const floorTiles = tiles.filter((tile) => tile.floorKey === current.floorKey);
  const position = floorTiles.indexOf(current);
  const forward = rtl ? key === "ArrowLeft" : key === "ArrowRight";
  const backward = rtl ? key === "ArrowRight" : key === "ArrowLeft";
  if (forward) return floorTiles[position + 1] ?? null;
  if (backward) return floorTiles[position - 1] ?? null;
  const targetFloor = floorKeys[key === "ArrowDown" ? floorIndex + 1 : floorIndex - 1];
  if (targetFloor === undefined) return null;
  const targetTiles = tiles.filter((tile) => tile.floorKey === targetFloor);
  return targetTiles[Math.min(position, targetTiles.length - 1)] ?? null;
}

/**
 * E7 DOM side of the keyboard logic: tiles are the `[data-matrix-tile]` buttons
 * under the nearest `[data-matrix-root]`; the floor grouping comes from each
 * tile's `data-floor-key`. Moves focus and returns true when it did.
 */
export function moveMatrixFocus(event: KeyboardEvent<HTMLButtonElement>, rtl: boolean): boolean {
  if (!isMatrixArrowKey(event.key)) return false;
  const root = event.currentTarget.closest<HTMLElement>("[data-matrix-root]");
  if (!root) return false;
  const tiles = Array.from(root.querySelectorAll<HTMLElement>("[data-matrix-tile]"))
    .map((element) => ({ element, floorKey: element.dataset.floorKey ?? "" }));
  const current = tiles.find((tile) => tile.element === event.currentTarget);
  if (!current) return false;
  const next = nextMatrixTile(tiles, current, event.key, rtl);
  if (!next) return false;
  event.preventDefault();
  next.element.focus();
  return true;
}

export type MatrixDoorState = "problem" | "installed" | "progress" | "blocked" | "cancelled" | "open";

/** The door's state word, the single source for colours in both tile densities. */
export function matrixDoorState(row: Pick<MatrixRow, "status" | "issue_count">): MatrixDoorState {
  const normalized = row.status.trim().toUpperCase();
  if (row.issue_count > 0) return "problem";
  if (["INSTALLED", "DONE", "COMPLETED"].includes(normalized)) return "installed";
  if (["IN_PROGRESS", "ASSIGNED", "ACTIVE"].includes(normalized)) return "progress";
  if (["BLOCKED", "LOCKED"].includes(normalized)) return "blocked";
  if (["CANCELLED", "CANCELED"].includes(normalized)) return "cancelled";
  return "open";
}


export type MatrixDensity = "rows" | "cards";
export const MATRIX_DENSITY_STORAGE_KEY = "dmx.projects.matrix.density";
export const MATRIX_ROWS_DEFAULT_FROM = 25;

/** Large projects open as compact rows (one door per line); a stored choice wins over the default. */
export function defaultMatrixDensity(totalDoors: number, stored: string | null): MatrixDensity {
  if (stored === "rows" || stored === "cards") return stored;
  return totalDoors >= MATRIX_ROWS_DEFAULT_FROM ? "rows" : "cards";
}
