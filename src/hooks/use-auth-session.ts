"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import { normalizeAuthSession, onAuthChanged, type AuthSession } from "@/lib/auth-session";

type AuthMeResponse = {
  role: "ADMIN" | "INSTALLER";
  admin_scope?: "OWNER" | "OPERATIONS" | "FINANCE" | "VIEWER" | null;
  can_view_rates?: boolean | null;
};

export function useAuthSession(): AuthSession | null {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["auth-me"],
    queryFn: async () => {
      const response = await apiFetch<AuthMeResponse>("/api/v1/auth/me");
      return normalizeAuthSession(response);
    },
    retry: false,
    staleTime: 60_000,
  });

  useEffect(() => {
    return onAuthChanged(() => {
      void queryClient.invalidateQueries({ queryKey: ["auth-me"] });
    });
  }, [queryClient]);

  return query.data ?? null;
}
