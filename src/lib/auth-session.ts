"use client";

export type UserRole = "ADMIN" | "INSTALLER";
export type AdminScope = "OWNER" | "OPERATIONS" | "FINANCE" | "VIEWER";

export type AuthSession = {
  role: UserRole;
  admin_scope: AdminScope | null;
  can_view_rates: boolean;
};

type RawAuthSession = {
  role?: unknown;
  admin_scope?: unknown;
  can_view_rates?: unknown;
};

const ACCESS_TOKEN_STORAGE_KEYS = ["dimax_access_token", "access_token", "token"] as const;
const LEGACY_REFRESH_TOKEN_STORAGE_KEYS = ["dimax_refresh_token", "refresh_token"] as const;
const AUTH_EVENT_NAME = "dimax-auth-changed";
let inMemoryAccessToken: string | null = null;

function readStorageValue(keys: readonly string[]): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  const stores = [window.sessionStorage, window.localStorage];
  for (const store of stores) {
    if (!store || typeof store.getItem !== "function") {
      continue;
    }
    for (const key of keys) {
      const value = store.getItem(key);
      if (value) {
        return value;
      }
    }
  }
  return null;
}

function removeStorageKeys(keys: readonly string[]): void {
  if (typeof window === "undefined") {
    return;
  }
  const stores = [window.sessionStorage, window.localStorage];
  for (const store of stores) {
    if (!store || typeof store.removeItem !== "function") {
      continue;
    }
    for (const key of keys) {
      store.removeItem(key);
    }
  }
}

function dispatchAuthChanged(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent(AUTH_EVENT_NAME));
}

export function getAccessToken(): string | null {
  if (inMemoryAccessToken) {
    return inMemoryAccessToken;
  }
  const persisted = readStorageValue(ACCESS_TOKEN_STORAGE_KEYS);
  if (persisted) {
    inMemoryAccessToken = persisted;
  }
  return persisted;
}

export function persistAccessToken(token: string): void {
  if (typeof window === "undefined") {
    return;
  }
  inMemoryAccessToken = token;
  removeStorageKeys(ACCESS_TOKEN_STORAGE_KEYS);
  window.sessionStorage.setItem("dimax_access_token", token);
  dispatchAuthChanged();
}

export function clearStoredSession(): void {
  inMemoryAccessToken = null;
  removeStorageKeys(ACCESS_TOKEN_STORAGE_KEYS);
  removeStorageKeys(LEGACY_REFRESH_TOKEN_STORAGE_KEYS);
  dispatchAuthChanged();
}

export function onAuthChanged(listener: () => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }
  const wrapped = () => listener();
  window.addEventListener(AUTH_EVENT_NAME, wrapped);
  window.addEventListener("storage", wrapped);
  return () => {
    window.removeEventListener(AUTH_EVENT_NAME, wrapped);
    window.removeEventListener("storage", wrapped);
  };
}

export function normalizeAuthSession(value: RawAuthSession | null | undefined): AuthSession | null {
  if (!value || (value.role !== "ADMIN" && value.role !== "INSTALLER")) {
    return null;
  }
  if (value.role === "INSTALLER") {
    return {
      role: "INSTALLER",
      admin_scope: null,
      can_view_rates: false,
    };
  }
  const adminScope =
    value.admin_scope === "OWNER" ||
    value.admin_scope === "OPERATIONS" ||
    value.admin_scope === "FINANCE" ||
    value.admin_scope === "VIEWER"
      ? value.admin_scope
      : "OWNER";
  return {
    role: "ADMIN",
    admin_scope: adminScope,
    can_view_rates: value.can_view_rates === true || adminScope === "OWNER" || adminScope === "FINANCE",
  };
}
