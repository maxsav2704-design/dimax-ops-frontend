import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  getAccessTokenMock,
  persistAccessTokenMock,
  clearStoredSessionMock,
} = vi.hoisted(() => ({
  getAccessTokenMock: vi.fn(),
  persistAccessTokenMock: vi.fn(),
  clearStoredSessionMock: vi.fn(),
}));

vi.mock("@/lib/auth-session", () => ({
  getAccessToken: getAccessTokenMock,
  persistAccessToken: persistAccessTokenMock,
  clearStoredSession: clearStoredSessionMock,
}));

import { ApiError, apiFetch, logoutSession } from "./api";

function jsonResponse(body: unknown, status = 200, statusText = "OK"): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: async () => body,
  } as Response;
}

describe("apiFetch", () => {
  beforeEach(() => {
    getAccessTokenMock.mockReset();
    persistAccessTokenMock.mockReset();
    clearStoredSessionMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sets application/json content type for json requests", async () => {
    getAccessTokenMock.mockReturnValue(null);
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch<{ ok: boolean }>("/api/v1/test", {
      method: "POST",
      body: JSON.stringify({ a: 1 }),
    });

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const headers = new Headers(init?.headers);
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(init.credentials).toBe("include");
  });

  it("does not force content type for multipart/form-data", async () => {
    getAccessTokenMock.mockReturnValue(null);
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    const form = new FormData();
    form.append("file", new Blob(["x"], { type: "text/plain" }), "a.txt");

    await apiFetch<{ ok: boolean }>("/api/v1/test-upload", {
      method: "POST",
      body: form,
    });

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const headers = new Headers(init?.headers);
    expect(headers.has("Content-Type")).toBe(false);
  });

  it("refreshes access token once after a 401 and retries the request", async () => {
    getAccessTokenMock.mockReturnValue("expired-token");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ detail: "expired" }, 401, "UNAUTHORIZED"))
      .mockResolvedValueOnce(jsonResponse({ access_token: "fresh-token" }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await apiFetch<{ ok: boolean }>("/api/v1/test");

    expect(result).toEqual({ ok: true });
    expect(persistAccessTokenMock).toHaveBeenCalledWith("fresh-token");
    expect(fetchMock).toHaveBeenCalledTimes(3);

    const retriedInit = fetchMock.mock.calls[2]?.[1] as RequestInit;
    const retriedHeaders = new Headers(retriedInit?.headers);
    expect(retriedHeaders.get("Authorization")).toBe("Bearer fresh-token");
  });

  it("bootstraps a session from refresh when no access token is present", async () => {
    getAccessTokenMock.mockReturnValue(null);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ detail: "missing token" }, 401, "UNAUTHORIZED"))
      .mockResolvedValueOnce(jsonResponse({ access_token: "fresh-token" }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await apiFetch<{ ok: boolean }>("/api/v1/auth/me");

    expect(result).toEqual({ ok: true });
    expect(persistAccessTokenMock).toHaveBeenCalledWith("fresh-token");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const firstHeaders = new Headers((fetchMock.mock.calls[0]?.[1] as RequestInit)?.headers);
    expect(firstHeaders.has("Authorization")).toBe(false);
  });

  it("clears session when refresh fails and surfaces the original 401", async () => {
    getAccessTokenMock.mockReturnValue("expired-token");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ detail: "expired" }, 401, "UNAUTHORIZED"))
      .mockResolvedValueOnce(jsonResponse({ detail: "refresh expired" }, 401, "UNAUTHORIZED"));
    vi.stubGlobal("fetch", fetchMock);

    let thrown: unknown;
    try {
      await apiFetch("/api/v1/test");
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(ApiError);
    expect((thrown as ApiError).status).toBe(401);
    expect(clearStoredSessionMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("logoutSession", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls auth logout and clears local session state", async () => {
    getAccessTokenMock.mockReturnValue("session-token");
    const fetchMock = vi.fn(async () => jsonResponse({}, 204, "NO CONTENT"));
    vi.stubGlobal("fetch", fetchMock);

    await logoutSession();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/v1/auth/logout");
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("include");
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer session-token");
    expect(clearStoredSessionMock).toHaveBeenCalledTimes(1);
  });
});
