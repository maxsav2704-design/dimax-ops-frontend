"use client";

import { apiFetch, getAccessToken } from "@/lib/api";
import { canAccessAdminPath, resolveAdminHomePath } from "@/lib/admin-access";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { normalizeAuthSession, type AuthSession } from "@/lib/auth-session";

type AuthMeResponse = {
  role: "ADMIN" | "INSTALLER";
  admin_scope?: "OWNER" | "OPERATIONS" | "FINANCE" | "VIEWER" | null;
  can_view_rates?: boolean | null;
};

type AuthScope = "admin" | "installer" | "any";

function isAllowed(scope: AuthScope, session: AuthSession, pathname: string): boolean {
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

export function RequireAuth({
  children,
  scope = "admin",
}: {
  children: ReactNode;
  scope?: AuthScope;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkAccess(): Promise<void> {
      const token = getAccessToken();
      const next = pathname || "/";
      if (!token) {
        router.replace(`/login?next=${encodeURIComponent(next)}`);
        return;
      }

      try {
        const me = await apiFetch<AuthMeResponse>("/api/v1/auth/me");
        const session = normalizeAuthSession(me);
        if (cancelled) {
          return;
        }
        if (!session) {
          router.replace(`/login?next=${encodeURIComponent(next)}`);
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
          router.replace(`/login?next=${encodeURIComponent(next)}&error=${deniedErrorCode(scope)}`);
          return;
        }
        setAllowed(true);
      } catch {
        if (!cancelled) {
          router.replace(`/login?next=${encodeURIComponent(next)}`);
        }
      }
    }

    void checkAccess();
    return () => {
      cancelled = true;
    };
  }, [router, pathname, scope]);

  if (!allowed) {
    return null;
  }
  return <>{children}</>;
}
