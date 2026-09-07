"use client";

import type { AuthSession, UserRole } from "@/lib/auth-role";

export type AdminModule =
  | "dashboard"
  | "projects"
  | "issues"
  | "installers"
  | "calendar"
  | "journal"
  | "library"
  | "door-types"
  | "reasons"
  | "reports"
  | "operations"
  | "settings";

type AuthLike =
  | AuthSession
  | {
      role: UserRole;
      admin_scope?: AuthSession["admin_scope"];
      can_view_rates?: boolean;
      can_manage_imports?: boolean;
      can_manage_users?: boolean;
    }
  | UserRole
  | null;

const ADMIN_HOME_FALLBACKS: readonly string[] = [
  "/",
  "/projects",
  "/issues",
  "/calendar",
  "/installers",
  "/journal",
  "/library",
  "/door-types",
  "/reasons",
  "/reports",
  "/earnings-ledger",
  "/operations",
  "/settings",
];

function normalizePath(pathname: string): string {
  const trimmed = pathname.trim();
  if (!trimmed) {
    return "/";
  }
  const withoutQuery = trimmed.split("?")[0]?.split("#")[0] || "/";
  if (withoutQuery === "/") {
    return "/";
  }
  return withoutQuery.replace(/\/+$/, "");
}

function normalizeSession(auth: AuthLike): AuthSession | null {
  if (!auth) {
    return null;
  }
  if (typeof auth === "string") {
    return auth === "INSTALLER"
      ? {
          role: "INSTALLER",
          admin_scope: null,
          can_view_rates: false,
          can_manage_imports: false,
          can_manage_users: false,
        }
      : {
          role: "ADMIN",
          admin_scope: null,
          can_view_rates: false,
          can_manage_imports: false,
          can_manage_users: false,
        };
  }
  if (auth.role === "INSTALLER") {
    return {
      role: "INSTALLER",
      admin_scope: null,
      can_view_rates: false,
      can_manage_imports: false,
      can_manage_users: false,
    };
  }
  return {
    role: "ADMIN",
    admin_scope: auth.admin_scope ?? null,
    can_view_rates: auth.can_view_rates === true,
    can_manage_imports: auth.can_manage_imports === true,
    can_manage_users: auth.can_manage_users === true,
  };
}

export function pathToAdminModule(pathname: string): AdminModule {
  const normalizedPath = normalizePath(pathname);
  if (normalizedPath === "/") {
    return "dashboard";
  }
  if (normalizedPath.startsWith("/projects")) {
    return "projects";
  }
  if (normalizedPath.startsWith("/issues")) {
    return "issues";
  }
  if (normalizedPath.startsWith("/installers")) {
    return "installers";
  }
  if (normalizedPath.startsWith("/calendar")) {
    return "calendar";
  }
  if (normalizedPath.startsWith("/journal")) {
    return "journal";
  }
  if (normalizedPath.startsWith("/library")) {
    return "library";
  }
  if (normalizedPath.startsWith("/door-types")) {
    return "door-types";
  }
  if (normalizedPath.startsWith("/reasons")) {
    return "reasons";
  }
  if (normalizedPath.startsWith("/reports")) {
    return "reports";
  }
  if (normalizedPath.startsWith("/earnings-ledger")) {
    return "reports";
  }
  if (normalizedPath.startsWith("/operations")) {
    return "operations";
  }
  if (normalizedPath.startsWith("/settings")) {
    return "settings";
  }
  return "dashboard";
}

export function canAccessAdminModule(auth: AuthLike, module: AdminModule): boolean {
  const session = normalizeSession(auth);
  if (!session) {
    return false;
  }
  if (session.role !== "ADMIN") {
    return false;
  }
  switch (session.admin_scope) {
    case "OWNER":
      return true;
    case "OPERATIONS":
      return module !== "settings";
    case "FINANCE":
      return module === "reports" || module === "installers";
    case "VIEWER":
      return !["reports", "operations", "settings", "library"].includes(module);
    default:
      return false;
  }
}

export function canAccessAdminPath(auth: AuthLike, pathname: string): boolean {
  return canAccessAdminModule(auth, pathToAdminModule(pathname));
}

export function canRunPrivilegedAdminActions(auth: AuthLike): boolean {
  const session = normalizeSession(auth);
  if (!session) {
    return false;
  }
  if (session.role !== "ADMIN") {
    return false;
  }
  return session.admin_scope === "OWNER" || session.admin_scope === "OPERATIONS";
}

export function canViewRates(auth: AuthLike): boolean {
  const session = normalizeSession(auth);
  if (!session || session.role !== "ADMIN") {
    return false;
  }
  return session.can_view_rates;
}

export function canManageImports(auth: AuthLike): boolean {
  const session = normalizeSession(auth);
  return (
    canRunPrivilegedAdminActions(session) && session?.can_manage_imports === true
  );
}

export function canManageUsers(auth: AuthLike): boolean {
  const session = normalizeSession(auth);
  return canRunPrivilegedAdminActions(session) && session?.can_manage_users === true;
}

export function resolveAdminHomePath(auth: AuthLike): string {
  const session = normalizeSession(auth);
  if (!session || session.role !== "ADMIN") {
    return "/login";
  }
  const nextPath = ADMIN_HOME_FALLBACKS.find((path) => canAccessAdminPath(session, path));
  return nextPath ?? "/login";
}
