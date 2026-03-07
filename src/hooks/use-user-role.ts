"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { type UserRole, getCurrentUserRole } from "@/lib/auth-role";
import { apiFetch, getAccessToken } from "@/lib/api";

type AuthMeResponse = {
  role: UserRole;
};

export function useUserRole(): UserRole | null {
  const queryClient = useQueryClient();
  const token = getAccessToken();
  const fallbackRole = getCurrentUserRole();

  const query = useQuery({
    queryKey: ["auth-me"],
    queryFn: () => apiFetch<AuthMeResponse>("/api/v1/auth/me"),
    enabled: Boolean(token),
    staleTime: 60_000,
    retry: false,
    initialData: fallbackRole ? { role: fallbackRole } : undefined,
  });

  useEffect(() => {
    const onStorage = () => {
      void queryClient.invalidateQueries({ queryKey: ["auth-me"] });
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
    };
  }, [queryClient]);

  if (!token) {
    return null;
  }

  return query.data?.role ?? fallbackRole ?? null;
}
