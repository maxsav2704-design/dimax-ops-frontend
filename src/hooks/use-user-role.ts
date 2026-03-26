"use client";

import { useAuthSession } from "@/hooks/use-auth-session";
import type { UserRole } from "@/lib/auth-role";

export function useUserRole(): UserRole | null {
  return useAuthSession()?.role ?? null;
}

