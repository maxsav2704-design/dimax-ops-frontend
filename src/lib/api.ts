import {
  clearStoredSession,
  getAccessToken,
  getRefreshToken,
  persistAccessToken,
  persistRefreshToken,
} from "@/lib/auth-session";
import { getOrCreateDeviceId } from "@/lib/device-id";

export { getAccessToken } from "@/lib/auth-session";

type ApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
    field?: string;
    meta?: Record<string, unknown>;
  };
  detail?: string;
};

export class ApiError extends Error {
  code?: string;
  field?: string;
  meta?: Record<string, unknown>;
  status: number;

  constructor(status: number, message: string, body?: ApiErrorBody) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = body?.error?.code;
    this.field = body?.error?.field;
    this.meta = body?.error?.meta;
  }
}

type RefreshResponse = {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
};

let refreshPromise: Promise<string | null> | null = null;

function trimTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, "");
}

export function apiBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    process.env.VITE_API_BASE_URL?.trim();
  if (!raw) {
    return "http://localhost:8000";
  }
  return trimTrailingSlashes(raw);
}

function isAuthMutationPath(path: string): boolean {
  return path === "/api/v1/auth/login" || path === "/api/v1/auth/refresh" || path === "/api/v1/auth/logout";
}

function buildHeaders(init: RequestInit | undefined, token: string | null): Headers {
  const headers = new Headers(init?.headers);
  const isFormData =
    typeof FormData !== "undefined" && init?.body instanceof FormData;

  if (!isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Accept-Language") && typeof window !== "undefined") {
    const locale = window.localStorage.getItem("dimax_locale");
    if (locale) {
      headers.set("Accept-Language", locale);
    }
  }
  return headers;
}

async function fetchFromApi(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (error) {
    if (init.signal?.aborted || (error instanceof Error && error.name === "AbortError")) {
      throw error;
    }
    throw new ApiError(0, "The server could not be reached.", {
      error: { code: "NETWORK_UNAVAILABLE" },
    });
  }
}

async function requestAccessTokenRefresh(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearStoredSession();
    return null;
  }

  const request = (async () => {
    const response = await fetchFromApi(`${apiBaseUrl()}/api/v1/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refresh_token: refreshToken,
        device_id: getOrCreateDeviceId(),
      }),
      credentials: "include",
    });

    if (response.status === 401 || response.status === 403) {
      if (getRefreshToken() === refreshToken) clearStoredSession();
      return null;
    }
    if (!response.ok) {
      throw new ApiError(response.status, "Session verification is temporarily unavailable.", {
        error: { code: "AUTH_REFRESH_UNAVAILABLE" },
      });
    }

    let body: RefreshResponse | null;
    try {
      body = (await response.json()) as RefreshResponse | null;
    } catch {
      body = null;
    }
    if (
      typeof body?.access_token !== "string" || !body.access_token.trim() ||
      (body.refresh_token != null && (typeof body.refresh_token !== "string" || !body.refresh_token.trim()))
    ) {
      throw new ApiError(502, "The session response is invalid.", {
        error: { code: "AUTH_REFRESH_UNAVAILABLE" },
      });
    }

    // A late refresh must not restore a logged-out or replaced session.
    if (getRefreshToken() !== refreshToken) return null;
    persistAccessToken(body.access_token);
    if (body.refresh_token) {
      persistRefreshToken(body.refresh_token);
    }
    return body.access_token;
  })();

  refreshPromise = request;
  try {
    return await request;
  } finally {
    if (refreshPromise === request) refreshPromise = null;
  }
}

async function requestWithToken(path: string, init: RequestInit | undefined, token: string | null): Promise<Response> {
  const headers = buildHeaders(init, token);

  const response = await fetchFromApi(`${apiBaseUrl()}${path}`, {
    ...init,
    headers,
    credentials: init?.credentials ?? "include",
  });
  return response;
}

async function ensureAuthorizedResponse(path: string, init?: RequestInit): Promise<Response> {
  const token = getAccessToken();
  let response = await requestWithToken(path, init, token);

  if (response.status === 401 && !isAuthMutationPath(path)) {
    const refreshedToken = await requestAccessTokenRefresh();
    if (refreshedToken) {
      response = await requestWithToken(path, init, refreshedToken);
    }
  }

  return response;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await ensureAuthorizedResponse(path, init);

  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;
    let body: ApiErrorBody | undefined;
    try {
      body = (await response.json()) as ApiErrorBody;
      message = body?.error?.message || body?.detail || message;
    } catch {
      // Keep default error message.
    }
    throw new ApiError(response.status, message, body);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function apiDownload(path: string, init?: RequestInit): Promise<Response> {
  const response = await ensureAuthorizedResponse(path, init);

  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;
    let body: ApiErrorBody | undefined;
    try {
      body = (await response.json()) as ApiErrorBody;
      message = body?.error?.message || body?.detail || message;
    } catch {
      // Keep default error message.
    }
    throw new ApiError(response.status, message, body);
  }

  return response;
}

export async function logoutSession(): Promise<void> {
  const token = getAccessToken();
  const refreshToken = getRefreshToken();
  try {
    if (token) {
      await fetch(`${apiBaseUrl()}/api/v1/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
    }
    if (refreshToken) {
      await fetch(`${apiBaseUrl()}/api/v1/auth/logout-refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          refresh_token: refreshToken,
        }),
        credentials: "include",
      });
    }
  } finally {
    clearStoredSession();
  }
}
