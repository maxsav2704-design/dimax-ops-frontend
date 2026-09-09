"use client";

import { ApiError, apiFetch } from "@/lib/api";
import { readableApiError } from "@/lib/api-error-display";
import { useI18n } from "@/lib/i18n";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const { replace } = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { locale } = useI18n();
  const [attempt, setAttempt] = useState(0);
  const [access, setAccess] = useState<{
    path: string;
    scope: AuthScope;
    state: "allowed" | "error";
    error?: unknown;
  } | null>(null);
  const next = pathname || "/";
  const currentAccess = access?.path === next && access.scope === scope ? access : null;

  useEffect(() => {
    let cancelled = false;
    setAccess(null);

    async function checkAccess(): Promise<void> {
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
          replace(authRequiredPath);
          return;
        }
        if (scope === "admin" && session.role === "INSTALLER") {
          replace("/installer");
          return;
        }
        if (scope === "installer" && session.role === "ADMIN") {
          replace(resolveAdminHomePath(session));
          return;
        }
        if (!isAllowed(scope, session, next)) {
          if (session.role === "ADMIN") {
            replace(resolveAdminHomePath(session));
            return;
          }
          replace(
            buildAuthRequiredLoginPath(next, currentSearch, deniedErrorCode(scope)),
          );
          return;
        }
        setAccess({ path: next, scope, state: "allowed" });
      } catch (error) {
        if (!cancelled) {
          if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
            queryClient.setQueryData(["auth-me"], null);
            replace(authRequiredPath);
          } else {
            setAccess({ path: next, scope, state: "error", error });
          }
        }
      }
    }

    void checkAccess();
    return () => {
      cancelled = true;
    };
  }, [replace, next, queryClient, scope, attempt]);

  if (currentAccess?.state === "error") {
    const copy = locale === "ru"
      ? {
          title: "Не удалось проверить доступ",
          fallback: "Сервер временно недоступен. Повторите попытку.",
          retry: "Повторить",
        }
      : locale === "he"
        ? {
            title: "לא ניתן לבדוק הרשאות גישה",
            fallback: "השרת אינו זמין כרגע. יש לנסות שוב.",
            retry: "נסה שוב",
          }
        : {
            title: "Could not verify access",
            fallback: "The server is temporarily unavailable. Please try again.",
            retry: "Try again",
          };
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas px-6 text-text">
        <div className="w-full max-w-md space-y-4">
          <div role="alert" className="space-y-2">
            <h1 className="text-lg font-semibold">{copy.title}</h1>
            <p className="text-sm text-text-secondary">
              {readableApiError(currentAccess.error, locale, copy.fallback)}
            </p>
          </div>
          <Button
            type="button"
            onClick={() => {
              setAccess(null);
              setAttempt((value) => value + 1);
            }}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {copy.retry}
          </Button>
        </div>
      </main>
    );
  }
  if (currentAccess?.state !== "allowed") {
    return <AuthGateLoading />;
  }
  return <>{children}</>;
}
