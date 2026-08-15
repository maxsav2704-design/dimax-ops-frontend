"use client";

import { apiFetch } from "@/lib/api";
import { canAccessAdminPath, resolveAdminHomePath } from "@/lib/admin-access";
import { buildAuthRequiredLoginPath } from "@/lib/auth-redirect";
import { useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { normalizeAuthSession, type AuthSession } from "@/lib/auth-session";

type AuthMeResponse = {
  role: "ADMIN" | "INSTALLER";
  admin_scope?: "OWNER" | "OPERATIONS" | "FINANCE" | "VIEWER" | null;
  can_view_rates?: boolean | null;
  can_manage_imports?: boolean | null;
  can_manage_users?: boolean | null;
};

type AuthScope = "admin" | "installer" | "any";

function isAllowed(
  scope: AuthScope,
  session: AuthSession,
  pathname: string,
): boolean {
  if (scope === "any") {
    return true;
  }
  if (scope === "installer") {
    return session.role === "INSTALLER";
  }
  return canAccessAdminPath(session, pathname);
}

function deniedErrorCode(scope: AuthScope): string {
  if (scope === "installer") {
    return "installer_only";
  }
  if (scope === "admin") {
    return "admin_only";
  }
  return "access_denied";
}

function AuthGateLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-6 text-text">
      <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3">
        <span
          className="h-2.5 w-2.5 animate-pulse rounded-full bg-accent"
          aria-hidden="true"
        />
        <div role="status" aria-live="polite" className="text-sm font-medium">
          DIMAX
        </div>
      </div>
    </div>
  );
}

export function RequireAuth({
  children,
  scope = "admin",
}: {
  children: ReactNode;
  scope?: AuthScope;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkAccess(): Promise<void> {
      const next = pathname || "/";
      const currentSearch =
        typeof window !== "undefined" ? window.location.search : "";
      const authRequiredPath = buildAuthRequiredLoginPath(
        next,
        currentSearch,
        "auth_required",
      );

      try {
        const me = await apiFetch<AuthMeResponse>("/api/v1/auth/me");
        const session = normalizeAuthSession(me);
        if (cancelled) {
          return;
        }
        queryClient.setQueryData(["auth-me"], session);
        if (!session) {
          router.replace(authRequiredPath);
          return;
        }
        if (scope === "admin" && session.role === "INSTALLER") {
          router.replace("/installer");
          return;
        }
        if (scope === "installer" && session.role === "ADMIN") {
          router.replace(resolveAdminHomePath(session));
          return;
        }
        if (!isAllowed(scope, session, next)) {
          if (session.role === "ADMIN") {
            router.replace(resolveAdminHomePath(session));
            return;
          }
          router.replace(
            buildAuthRequiredLoginPath(next, currentSearch, deniedErrorCode(scope)),
          );
          return;
        }
        setAllowed(true);
      } catch {
        if (!cancelled) {
          queryClient.setQueryData(["auth-me"], null);
          router.replace(authRequiredPath);
        }
      }
    }

    void checkAccess();
    return () => {
      cancelled = true;
    };
  }, [router, pathname, queryClient, scope]);

  if (!allowed) {
    return <AuthGateLoading />;
  }
  return <>{children}</>;
}
