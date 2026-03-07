"use client";

import type { UserRole } from "@/lib/auth-role";

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

function isPathOrChild(pathname: string, prefix: string): boolean {
  const normalizedPath = normalizePath(pathname);
  const normalizedPrefix = normalizePath(prefix);
  if (normalizedPrefix === "/") {
    return normalizedPath === "/";
  }
  return (
    normalizedPath === normalizedPrefix ||
    normalizedPath.startsWith(`${normalizedPrefix}/`)
  );
}

const INSTALLER_ALLOWED_ADMIN_PATHS: readonly string[] = [];

export function canAccessAdminPath(role: UserRole | null, pathname: string): boolean {
  if (role === "ADMIN" || role === null) {
    return true;
  }
  return INSTALLER_ALLOWED_ADMIN_PATHS.some((prefix) => isPathOrChild(pathname, prefix));
}

export function canRunPrivilegedAdminActions(role: UserRole | null): boolean {
  return role !== "INSTALLER";
}
