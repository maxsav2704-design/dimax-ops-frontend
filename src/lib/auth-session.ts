"use client";

export type UserRole = "ADMIN" | "INSTALLER";
export type AdminScope = "OWNER" | "OPERATIONS" | "FINANCE" | "VIEWER";

export type AuthSession = {
  role: UserRole;
  admin_scope: AdminScope | null;
  can_view_rates: boolean;
  can_manage_imports: boolean;
  can_manage_users: boolean;
};

type RawAuthSession = {
  role?: unknown;
  admin_scope?: unknown;
  can_view_rates?: unknown;
  can_manage_imports?: unknown;
  can_manage_users?: unknown;
};

const ACCESS_TOKEN_STORAGE_KEYS = ["dimax_access_token", "access_token", "token"] as const;
const LEGACY_REFRESH_TOKEN_STORAGE_KEYS = ["dimax_refresh_token", "refresh_token"] as const;
const AUTH_EVENT_NAME = "dimax-auth-changed";
let inMemoryAccessToken: string | null = null;

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
  return inMemoryAccessToken;
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined" || !window.sessionStorage) {
    return null;
  }
  for (const key of LEGACY_REFRESH_TOKEN_STORAGE_KEYS) {
    const value = window.sessionStorage.getItem(key);
    if (value) {
      return value;
    }
  }
  return null;
}

export function persistAccessToken(token: string): void {
  inMemoryAccessToken = token;
  removeStorageKeys(ACCESS_TOKEN_STORAGE_KEYS);
  dispatchAuthChanged();
}

export function persistRefreshToken(token: string): void {
  if (typeof window !== "undefined" && window.sessionStorage) {
    for (const key of LEGACY_REFRESH_TOKEN_STORAGE_KEYS) {
      window.sessionStorage.setItem(key, token);
    }
  }
  if (typeof window !== "undefined" && window.localStorage) {
    for (const key of LEGACY_REFRESH_TOKEN_STORAGE_KEYS) {
      window.localStorage.removeItem(key);
    }
  }
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

function tokenSubject(token: string | null): string | null {
  if (!token) {
    return null;
  }
  try {
    const part = token.split(".")[1] ?? "";
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const claims = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="))) as { sub?: unknown };
    return typeof claims.sub === "string" && claims.sub ? claims.sub : token;
  } catch {
    return token;
  }
}

/**
 * Fires when the signed-in person changes: sign-out, a failed refresh, or another account in this tab.
 * A routine access-token refresh (same person) does not fire, so open forms and dialogs survive it.
 * Signing in after a sign-out does not fire again: the sign-out already dropped what was on screen.
 */
export function onSessionIdentityChanged(listener: () => void): () => void {
  let current = tokenSubject(getAccessToken());
  return onAuthChanged(() => {
    const next = tokenSubject(getAccessToken());
    if (next === current) {
      return;
    }
    const previous = current;
    current = next;
    if (previous !== null) {
      listener();
    }
  });
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
      can_manage_imports: false,
      can_manage_users: false,
    };
  }
  const adminScope =
    value.admin_scope === "OWNER" ||
    value.admin_scope === "OPERATIONS" ||
    value.admin_scope === "FINANCE" ||
    value.admin_scope === "VIEWER"
      ? value.admin_scope
      : null;
  return {
    role: "ADMIN",
    admin_scope: adminScope,
    can_view_rates: value.can_view_rates === true,
    can_manage_imports: value.can_manage_imports === true,
    can_manage_users: value.can_manage_users === true,
  };
}
