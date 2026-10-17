import { useEffect, useMemo, useRef } from "react";

// E4 "since your last visit": a page remembers the numbers it showed when it
// was last opened and reports, for each key, the difference now. The snapshot
// is taken once per page visit (first time the values are complete) and
// replaced on the next visit, so a user coming back sees what moved while
// they were away, not what moved while they watched.

export type SnapshotValues = Record<string, number | null | undefined>;

type StoredSnapshot = { at: number; values: Record<string, number> };

export function readSnapshot(storage: Pick<Storage, "getItem">, key: string): StoredSnapshot | null {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const { at, values } = parsed as { at?: unknown; values?: unknown };
    if (typeof at !== "number" || !values || typeof values !== "object") return null;
    const clean: Record<string, number> = {};
    for (const [name, value] of Object.entries(values as Record<string, unknown>)) {
      if (typeof value === "number" && Number.isFinite(value)) clean[name] = value;
    }
    return { at, values: clean };
  } catch {
    return null;
  }
}

export function writeSnapshot(storage: Pick<Storage, "setItem">, key: string, values: SnapshotValues, at = Date.now()): void {
  const clean: Record<string, number> = {};
  for (const [name, value] of Object.entries(values)) {
    if (typeof value === "number" && Number.isFinite(value)) clean[name] = value;
  }
  try {
    storage.setItem(key, JSON.stringify({ at, values: clean } satisfies StoredSnapshot));
  } catch {
    /* storage unavailable: no memory of the visit */
  }
}

/** Previous values per key (undefined when the key was not stored). */
export function previousValues(snapshot: StoredSnapshot | null, keys: string[]): Record<string, number | undefined> {
  const out: Record<string, number | undefined> = {};
  for (const key of keys) out[key] = snapshot?.values[key];
  return out;
}

type Options = {
  /** All values must be numbers before the snapshot is taken and the previous one is read. */
  ready: boolean;
  /** Ignore snapshots older than this (default 30 days). */
  maxAgeMs?: number;
};

export function useLastVisitSnapshot(storageKey: string, values: SnapshotValues, { ready, maxAgeMs = 30 * 24 * 60 * 60 * 1000 }: Options) {
  const captured = useRef<{ previous: Record<string, number | undefined>; at: number | null } | null>(null);
  const keys = useMemo(() => Object.keys(values), [values]);

  if (ready && captured.current === null && typeof window !== "undefined") {
    const snapshot = readSnapshot(window.localStorage, storageKey);
    const fresh = snapshot && Date.now() - snapshot.at <= maxAgeMs ? snapshot : null;
    captured.current = { previous: previousValues(fresh, keys), at: fresh?.at ?? null };
  }

  useEffect(() => {
    if (!ready || typeof window === "undefined") return;
    writeSnapshot(window.localStorage, storageKey, values);
    // The snapshot follows the latest values of this visit; the previous visit's stays captured above.
  }, [ready, storageKey, values]);

  return {
    previous: captured.current?.previous ?? previousValues(null, keys),
    previousAt: captured.current?.at ?? null,
  };
}
