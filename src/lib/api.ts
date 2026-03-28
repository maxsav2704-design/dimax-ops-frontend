import { clearStoredSession, getAccessToken, persistAccessToken } from "@/lib/auth-session";

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
  return headers;
}

async function requestAccessTokenRefresh(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${apiBaseUrl()}/api/v1/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        clearStoredSession();
        return null;
      }

      const body = (await response.json()) as RefreshResponse;
      if (!body.access_token) {
        clearStoredSession();
        return null;
      }

      persistAccessToken(body.access_token);
      return body.access_token;
    } catch {
      clearStoredSession();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function requestWithToken(path: string, init: RequestInit | undefined, token: string | null): Promise<Response> {
  const headers = buildHeaders(init, token);

  const response = await fetch(`${apiBaseUrl()}${path}`, {
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
  try {
    await fetch(`${apiBaseUrl()}/api/v1/auth/logout`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      credentials: "include",
    });
  } finally {
    clearStoredSession();
  }
}
