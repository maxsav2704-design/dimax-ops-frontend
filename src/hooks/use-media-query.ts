"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Tracks a CSS media query. During server rendering and hydration it reports
 * `serverDefault`; once mounted it follows `window.matchMedia`, so a layout
 * that also carries the matching Tailwind breakpoint classes never shows the
 * wrong branch and never triggers a hydration mismatch.
 */
export function useMediaQuery(query: string, serverDefault = false): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );
  const getSnapshot = useCallback(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return serverDefault;
    return window.matchMedia(query).matches;
  }, [query, serverDefault]);
  const getServerSnapshot = useCallback(() => serverDefault, [serverDefault]);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
