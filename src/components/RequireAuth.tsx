"use client";

import { apiFetch, getAccessToken } from "@/lib/api";
import { canAccessAdminPath } from "@/lib/admin-access";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

type AuthMeResponse = {
  role: "ADMIN" | "INSTALLER";
};

type AuthScope = "admin" | "installer" | "any";

function isAllowed(scope: AuthScope, role: AuthMeResponse["role"], pathname: string): boolean {
  if (scope === "any") {
    return true;
  }
  if (scope === "installer") {
    return role === "INSTALLER";
  }
  return canAccessAdminPath(role, pathname);
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
        if (cancelled) {
          return;
        }
        if (scope === "admin" && me.role === "INSTALLER") {
          router.replace("/installer");
          return;
        }
        if (scope === "installer" && me.role === "ADMIN") {
          router.replace("/");
          return;
        }
        if (!isAllowed(scope, me.role, next)) {
          router.replace(
            `/login?next=${encodeURIComponent(next)}&error=${deniedErrorCode(scope)}`
          );
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
