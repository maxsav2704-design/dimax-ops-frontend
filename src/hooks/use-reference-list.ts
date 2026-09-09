import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError, apiFetch } from "@/lib/api";

type ReferenceState<T> = {
  path: string;
  items: T[];
  loaded: boolean;
  loading: boolean;
  error: boolean;
};

function initialState<T>(path: string): ReferenceState<T> {
  return { path, items: [], loaded: false, loading: true, error: false };
}

export function useReferenceList<T>(path: string, pageSize?: number) {
  const [state, setState] = useState<ReferenceState<T>>(() => initialState(path));
  const activeRequest = useRef<AbortController | null>(null);

  const reload = useCallback(async () => {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setState((previous) => previous.path === path
      ? { ...previous, loading: true }
      : initialState(path));
    try {
      const items: T[] = [];
      let nextPath = path;
      // Commit paginated catalogs only after every page has loaded successfully.
      while (!controller.signal.aborted) {
        const response = await apiFetch<T[] | { items?: T[] }>(nextPath, { signal: controller.signal });
        if (controller.signal.aborted) return;
        const page = Array.isArray(response) ? response : response?.items ?? [];
        if (!Array.isArray(page)) throw new Error("Invalid reference list response");
        items.push(...page);
        if (!pageSize || page.length < pageSize) break;
        const url = new URL(nextPath, "http://reference.local");
        url.searchParams.set("offset", String(Number(url.searchParams.get("offset") || 0) + page.length));
        nextPath = url.pathname + url.search;
      }
      if (controller.signal.aborted) return;
      setState({ path, items, loaded: true, loading: false, error: false });
    } catch (error) {
      if (controller.signal.aborted) return;
      const accessRejected = error instanceof ApiError && (error.status === 401 || error.status === 403);
      setState((previous) => ({
        ...(previous.path === path && !accessRejected ? previous : initialState<T>(path)),
        loading: false,
        error: true,
      }));
    }
  }, [path, pageSize]);

  useEffect(() => {
    void reload();
    return () => activeRequest.current?.abort();
  }, [reload]);

  const current = state.path === path ? state : initialState<T>(path);
  return { ...current, ready: current.loaded && !current.loading && !current.error, reload };
}
