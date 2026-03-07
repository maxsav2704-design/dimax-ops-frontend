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

export function getAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return (
    localStorage.getItem("dimax_access_token") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token")
  );
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers(init?.headers);
  const isFormData =
    typeof FormData !== "undefined" && init?.body instanceof FormData;

  if (!isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${apiBaseUrl()}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;
    try {
      const body = await response.json();
      message = body?.error?.message || body?.detail || message;
    } catch {
      // Keep default error message.
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
