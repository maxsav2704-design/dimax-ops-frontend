// E8 freshness logic, kept apart from the component for fast refresh and tests.

export type FreshnessState = "fresh" | "stale" | "offline";

export const DEFAULT_STALE_AFTER_MS = 2 * 60 * 1000;

export function resolveFreshness(
  updatedAt: string | number | Date | null | undefined,
  now: number,
  staleAfterMs = DEFAULT_STALE_AFTER_MS,
  offline = false,
): { state: FreshnessState; ageMs: number | null } {
  if (offline) return { state: "offline", ageMs: null };
  const time = updatedAt instanceof Date ? updatedAt.getTime() : updatedAt ? new Date(updatedAt).getTime() : Number.NaN;
  if (!Number.isFinite(time)) return { state: "fresh", ageMs: null };
  const ageMs = Math.max(0, now - time);
  return { state: ageMs > staleAfterMs ? "stale" : "fresh", ageMs };
}
