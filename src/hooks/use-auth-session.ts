"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import { getAccessToken, normalizeAuthSession, onAuthChanged, type AuthSession } from "@/lib/auth-session";

type AuthMeResponse = {
  role: "ADMIN" | "INSTALLER";
  admin_scope?: "OWNER" | "OPERATIONS" | "FINANCE" | "VIEWER" | null;
  can_view_rates?: boolean | null;
};

export function useAuthSession(): AuthSession | null {
  const queryClient = useQueryClient();
  const token = getAccessToken();

  const query = useQuery({
    queryKey: ["auth-me"],
    queryFn: async () => {
      const response = await apiFetch<AuthMeResponse>("/api/v1/auth/me");
      return normalizeAuthSession(response);
    },
    enabled: Boolean(token),
    staleTime: 60_000,
    retry: false,
  });

  useEffect(() => {
    return onAuthChanged(() => {
      void queryClient.invalidateQueries({ queryKey: ["auth-me"] });
    });
  }, [queryClient]);

  if (!token) {
    return null;
  }

  return query.data ?? null;
}
