"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import { normalizeAuthSession, onAuthChanged, type AuthSession } from "@/lib/auth-session";
import { queryKeys } from "@/lib/query-keys";

export type AuthMeResponse = {
  role: "ADMIN" | "INSTALLER";
  admin_scope?: "OWNER" | "OPERATIONS" | "FINANCE" | "VIEWER" | null;
  can_view_rates?: boolean | null;
  can_manage_imports?: boolean | null;
  can_manage_users?: boolean | null;
};

/** How long a verified session is trusted before /auth/me is asked again. */
export const AUTH_SESSION_STALE_MS = 60_000;

export async function loadAuthSession(): Promise<AuthSession | null> {
  const response = await apiFetch<AuthMeResponse>("/api/v1/auth/me");
  return normalizeAuthSession(response);
}

/**
 * Reads the session through the shared cache: a route change within the stale
 * window reuses the verified session instead of calling /auth/me again.
 * `fresh: true` forces a network round-trip (right after login).
 */
export function fetchAuthSession(
  queryClient: QueryClient,
  options: { fresh?: boolean } = {},
): Promise<AuthSession | null> {
  return queryClient.fetchQuery({
    queryKey: queryKeys.authMe,
    queryFn: loadAuthSession,
    retry: false,
    staleTime: options.fresh ? 0 : AUTH_SESSION_STALE_MS,
  });
}

export function useAuthSession(): AuthSession | null {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.authMe,
    queryFn: loadAuthSession,
    retry: false,
    staleTime: AUTH_SESSION_STALE_MS,
  });

  useEffect(() => {
    return onAuthChanged(() => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.authMe });
    });
  }, [queryClient]);

  return query.data ?? null;
}
