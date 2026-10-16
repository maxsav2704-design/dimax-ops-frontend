import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";

import { ApiError, apiFetch } from "@/lib/api";

const EMPTY_ITEMS: readonly never[] = Object.freeze([]);

export const referenceListQueryKey = (path: string, pageSize?: number) =>
  ["reference-list", path, pageSize ?? null] as const;

// Loads every page of a paginated catalog; commits only when all pages arrived.
async function loadReferenceList<T>(path: string, pageSize: number | undefined, signal: AbortSignal): Promise<T[]> {
  const items: T[] = [];
  let nextPath = path;
  for (;;) {
    const response = await apiFetch<T[] | { items?: T[] }>(nextPath, { signal });
    const page = Array.isArray(response) ? response : response?.items ?? [];
    if (!Array.isArray(page)) throw new Error("Invalid reference list response");
    items.push(...page);
    if (!pageSize || page.length < pageSize) break;
    const url = new URL(nextPath, "http://reference.local");
    url.searchParams.set("offset", String(Number(url.searchParams.get("offset") || 0) + page.length));
    nextPath = url.pathname + url.search;
  }
  return items;
}

/**
 * Reference catalog (door types, installers, reasons, ...) through the shared
 * react-query cache. Same shape as before: items / loaded / loading / error /
 * ready / reload. A 401/403 drops the previously loaded items; any other
 * failure keeps the last good list and flags `error` so the page can offer a retry.
 */
export function useReferenceList<T>(path: string, pageSize?: number) {
  const query = useQuery({
    queryKey: referenceListQueryKey(path, pageSize),
    queryFn: ({ signal }) => loadReferenceList<T>(path, pageSize, signal),
    retry: false,
  });

  const accessRejected =
    query.error instanceof ApiError && (query.error.status === 401 || query.error.status === 403);
  // Stable empty list: a fresh `[]` per render would re-trigger every effect
  // and memo that depends on `items` and loop the page.
  const items = accessRejected ? (EMPTY_ITEMS as unknown as T[]) : (query.data ?? (EMPTY_ITEMS as unknown as T[]));
  const loaded = query.data !== undefined && !accessRejected;
  const loading = query.isFetching;
  const error = query.isError;
  const refetch = query.refetch;
  const reload = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return { path, items, loaded, loading, error, ready: loaded && !loading && !error, reload };
}
