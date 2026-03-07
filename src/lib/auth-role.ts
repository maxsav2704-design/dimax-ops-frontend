"use client";

export type UserRole = "ADMIN" | "INSTALLER";

const ACCESS_TOKEN_STORAGE_KEYS = ["dimax_access_token", "access_token", "token"] as const;

function getStoredAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  for (const key of ACCESS_TOKEN_STORAGE_KEYS) {
    const value = window.localStorage.getItem(key);
    if (value) {
      return value;
    }
  }
  return null;
}

function decodeBase64Url(value: string): string | null {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (normalized.length % 4)) % 4;
  const padded = `${normalized}${"=".repeat(padLength)}`;
  try {
    if (typeof window !== "undefined" && typeof window.atob === "function") {
      return window.atob(padded);
    }
    return null;
  } catch {
    return null;
  }
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length < 2) {
    return null;
  }
  const decoded = decodeBase64Url(parts[1]);
  if (!decoded) {
    return null;
  }
  try {
    const parsed = JSON.parse(decoded) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function getCurrentUserRole(): UserRole | null {
  const token = getStoredAccessToken();
  if (!token) {
    return null;
  }
  const payload = decodeJwtPayload(token);
  if (!payload) {
    return null;
  }
  const role = payload.role;
  if (role === "ADMIN" || role === "INSTALLER") {
    return role;
  }
  return null;
}
