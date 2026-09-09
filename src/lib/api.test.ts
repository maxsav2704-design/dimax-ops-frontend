import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createDownloadResponse } from "@/test/download-response";

const {
  getAccessTokenMock,
  getRefreshTokenMock,
  persistAccessTokenMock,
  persistRefreshTokenMock,
  clearStoredSessionMock,
  getOrCreateDeviceIdMock,
} = vi.hoisted(() => ({
  getAccessTokenMock: vi.fn(),
  getRefreshTokenMock: vi.fn(),
  persistAccessTokenMock: vi.fn(),
  persistRefreshTokenMock: vi.fn(),
  clearStoredSessionMock: vi.fn(),
  getOrCreateDeviceIdMock: vi.fn(),
}));

vi.mock("@/lib/auth-session", () => ({
  getAccessToken: getAccessTokenMock,
  getRefreshToken: getRefreshTokenMock,
  persistAccessToken: persistAccessTokenMock,
  persistRefreshToken: persistRefreshTokenMock,
  clearStoredSession: clearStoredSessionMock,
}));

vi.mock("@/lib/device-id", () => ({
  getOrCreateDeviceId: getOrCreateDeviceIdMock,
}));

import { ApiError, apiDownload, apiFetch, logoutSession } from "./api";

const storageState = new Map<string, string>();

const storageMock = {
  getItem: (key: string) => storageState.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storageState.set(key, value);
  },
  removeItem: (key: string) => {
    storageState.delete(key);
  },
};

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
    getRefreshTokenMock.mockReset();
    persistAccessTokenMock.mockReset();
    persistRefreshTokenMock.mockReset();
    clearStoredSessionMock.mockReset();
    getOrCreateDeviceIdMock.mockReset();
    getOrCreateDeviceIdMock.mockReturnValue("test-device-id");
    storageState.clear();
    Object.defineProperty(window, "localStorage", {
      value: storageMock,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("sets application/json content type for json requests", async () => {
    getAccessTokenMock.mockReturnValue(null);
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse({ ok: true })
    );
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
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse({ ok: true })
    );
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
    getRefreshTokenMock.mockReturnValue("refresh-token");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ detail: "expired" }, 401, "UNAUTHORIZED"))
      .mockResolvedValueOnce(jsonResponse({ access_token: "fresh-token", refresh_token: "rotated-refresh" }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await apiFetch<{ ok: boolean }>("/api/v1/test");

    expect(result).toEqual({ ok: true });
    expect(persistAccessTokenMock).toHaveBeenCalledWith("fresh-token");
    expect(persistRefreshTokenMock).toHaveBeenCalledWith("rotated-refresh");
    expect(fetchMock).toHaveBeenCalledTimes(3);

    const refreshInit = fetchMock.mock.calls[1]?.[1] as RequestInit;
    expect(refreshInit.method).toBe("POST");
    expect(refreshInit.body).toBe(JSON.stringify({ refresh_token: "refresh-token", device_id: "test-device-id" }));
    const retriedInit = fetchMock.mock.calls[2]?.[1] as RequestInit;
    const retriedHeaders = new Headers(retriedInit?.headers);
    expect(retriedHeaders.get("Authorization")).toBe("Bearer fresh-token");
  });

  it("bootstraps a session from refresh when no access token is present", async () => {
    getAccessTokenMock.mockReturnValue(null);
    getRefreshTokenMock.mockReturnValue("refresh-token");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ detail: "missing token" }, 401, "UNAUTHORIZED"))
      .mockResolvedValueOnce(jsonResponse({ access_token: "fresh-token", refresh_token: "rotated-refresh" }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await apiFetch<{ ok: boolean }>("/api/v1/auth/me");

    expect(result).toEqual({ ok: true });
    expect(persistAccessTokenMock).toHaveBeenCalledWith("fresh-token");
    expect(persistRefreshTokenMock).toHaveBeenCalledWith("rotated-refresh");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const firstHeaders = new Headers((fetchMock.mock.calls[0]?.[1] as RequestInit)?.headers);
    expect(firstHeaders.has("Authorization")).toBe(false);
  });

  it.each([401, 403])("clears session only when refresh is rejected with %s", async (status) => {
    getAccessTokenMock.mockReturnValue("expired-token");
    getRefreshTokenMock.mockReturnValue("refresh-token");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ detail: "expired" }, 401, "UNAUTHORIZED"))
      .mockResolvedValueOnce(jsonResponse({ detail: "refresh expired" }, status, "UNAUTHORIZED"));
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

  it("downloads with refresh when export request gets a 401", async () => {
    getAccessTokenMock.mockReturnValue("expired-token");
    getRefreshTokenMock.mockReturnValue("refresh-token");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ detail: "expired" }, 401, "UNAUTHORIZED"))
      .mockResolvedValueOnce(jsonResponse({ access_token: "fresh-token", refresh_token: "rotated-refresh" }))
      .mockResolvedValueOnce(
        createDownloadResponse("id,value\n1,42", "text/csv", {
          status: 200,
          headers: {
            "content-disposition": 'attachment; filename="export.csv"',
          },
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    const response = await apiDownload("/api/v1/admin/reports/export");

    expect(response.ok).toBe(true);
    expect(persistAccessTokenMock).toHaveBeenCalledWith("fresh-token");
    expect(persistRefreshTokenMock).toHaveBeenCalledWith("rotated-refresh");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const retriedInit = fetchMock.mock.calls[2]?.[1] as RequestInit;
    const retriedHeaders = new Headers(retriedInit?.headers);
    expect(retriedHeaders.get("Authorization")).toBe("Bearer fresh-token");
    expect(retriedInit.credentials).toBe("include");
  });

  it("does not replay a write after a network failure or clear its session", async () => {
    getAccessTokenMock.mockReturnValue("session-token");
    getRefreshTokenMock.mockReturnValue("refresh-token");
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    vi.stubGlobal("fetch", fetchMock);
    await expect(apiFetch("/api/v1/admin/projects", { method: "POST", body: "{}" }))
      .rejects.toMatchObject({ status: 0, code: "NETWORK_UNAVAILABLE" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(clearStoredSessionMock).not.toHaveBeenCalled();
  });

  it("preserves cancellation without converting it into a connection error", async () => {
    const controller = new AbortController();
    controller.abort();
    const error = new DOMException("Aborted", "AbortError");
    const fetchMock = vi.fn().mockRejectedValue(error);
    vi.stubGlobal("fetch", fetchMock);
    await expect(apiFetch("/api/v1/test", { signal: controller.signal })).rejects.toBe(error);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("can retry a refresh after a network failure without losing the refresh token", async () => {
    getAccessTokenMock.mockReturnValue("expired-token");
    getRefreshTokenMock.mockReturnValue("refresh-token");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({}, 401))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(jsonResponse({}, 401))
      .mockResolvedValueOnce(jsonResponse({ access_token: "fresh-token" }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(apiFetch("/api/v1/auth/me")).rejects.toMatchObject({ code: "NETWORK_UNAVAILABLE" });
    expect(clearStoredSessionMock).not.toHaveBeenCalled();
    await expect(apiFetch("/api/v1/auth/me")).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(persistAccessTokenMock).toHaveBeenCalledWith("fresh-token");
  });

  it.each([429, 500, 503])("preserves the session when refresh returns %s", async (status) => {
    getAccessTokenMock.mockReturnValue("expired-token");
    getRefreshTokenMock.mockReturnValue("refresh-token");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({}, 401))
      .mockResolvedValueOnce(jsonResponse({}, status));
    vi.stubGlobal("fetch", fetchMock);
    await expect(apiFetch("/api/v1/auth/me")).rejects.toMatchObject({ status, code: "AUTH_REFRESH_UNAVAILABLE" });
    expect(clearStoredSessionMock).not.toHaveBeenCalled();
    expect(persistAccessTokenMock).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([null, {}, { access_token: 123 }, { access_token: " " }, { access_token: "fresh", refresh_token: 123 }])(
    "rejects malformed successful refresh response %j without deleting the session", async (body) => {
      getAccessTokenMock.mockReturnValue("expired-token");
      getRefreshTokenMock.mockReturnValue("refresh-token");
      vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(jsonResponse({}, 401)).mockResolvedValueOnce(jsonResponse(body)));
      await expect(apiFetch("/api/v1/auth/me")).rejects.toMatchObject({ status: 502, code: "AUTH_REFRESH_UNAVAILABLE" });
      expect(clearStoredSessionMock).not.toHaveBeenCalled();
      expect(persistAccessTokenMock).not.toHaveBeenCalled();
    },
  );

  it("does not leave refresh blocked after a request without a refresh token", async () => {
    getAccessTokenMock.mockReturnValue(null);
    getRefreshTokenMock.mockReturnValue(null);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({}, 401))
      .mockResolvedValueOnce(jsonResponse({}, 401))
      .mockResolvedValueOnce(jsonResponse({ access_token: "fresh-token" }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(apiFetch("/api/v1/auth/me")).rejects.toMatchObject({ status: 401 });
    getRefreshTokenMock.mockReturnValue("new-session-refresh-token");
    await expect(apiFetch("/api/v1/auth/me")).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("shares one refresh between concurrent unauthorized requests", async () => {
    getAccessTokenMock.mockReturnValue("expired-token");
    getRefreshTokenMock.mockReturnValue("refresh-token");
    let completeRefresh!: (response: Response) => void;
    const refresh = new Promise<Response>((resolve) => { completeRefresh = resolve; });
    const fetchMock = vi.fn((url: string, init: RequestInit) => {
      if (url.endsWith("/auth/refresh")) return refresh;
      return Promise.resolve(new Headers(init.headers).get("Authorization") === "Bearer fresh-token"
        ? jsonResponse({ ok: true }) : jsonResponse({}, 401));
    });
    vi.stubGlobal("fetch", fetchMock);
    const first = apiFetch("/api/v1/one");
    const second = apiFetch("/api/v1/two");
    await vi.waitFor(() => expect(fetchMock.mock.calls.filter(([url]) => url.endsWith("/auth/refresh"))).toHaveLength(1));
    completeRefresh(jsonResponse({ access_token: "fresh-token" }));
    await expect(Promise.all([first, second])).resolves.toEqual([{ ok: true }, { ok: true }]);
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it.each([200, 401])("ignores a late refresh response (%s) after session replacement", async (status) => {
    getAccessTokenMock.mockReturnValue("expired-token");
    getRefreshTokenMock.mockReturnValue("refresh-token");
    let finish!: (response: Response) => void;
    const refresh = new Promise<Response>((resolve) => { finish = resolve; });
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({}, 401)).mockReturnValueOnce(refresh);
    vi.stubGlobal("fetch", fetchMock);
    const pending = apiFetch("/api/v1/auth/me").catch((error: unknown) => error);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    getRefreshTokenMock.mockReturnValue("another-session-token");
    finish(jsonResponse({ access_token: "old-session-token" }, status));
    expect(await pending).toMatchObject({ status: 401 });
    expect(persistAccessTokenMock).not.toHaveBeenCalled();
    expect(persistRefreshTokenMock).not.toHaveBeenCalled();
    expect(clearStoredSessionMock).not.toHaveBeenCalled();
  });
});

describe("logoutSession", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls auth logout and clears local session state", async () => {
    getAccessTokenMock.mockReturnValue("session-token");
    getRefreshTokenMock.mockReturnValue("refresh-token");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, 204, "NO CONTENT"))
      .mockResolvedValueOnce(jsonResponse({ ok: true, revoked: true }));
    vi.stubGlobal("fetch", fetchMock);

    await logoutSession();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [logoutUrl, logoutInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(logoutUrl).toContain("/api/v1/auth/logout");
    expect(logoutInit.method).toBe("POST");
    expect(logoutInit.credentials).toBe("include");
    expect(new Headers(logoutInit.headers).get("Authorization")).toBe("Bearer session-token");
    const [refreshUrl, refreshInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(refreshUrl).toContain("/api/v1/auth/logout-refresh");
    expect(refreshInit.method).toBe("POST");
    expect(refreshInit.credentials).toBe("include");
    expect(refreshInit.body).toBe(JSON.stringify({ refresh_token: "refresh-token" }));
    expect(clearStoredSessionMock).toHaveBeenCalledTimes(1);
  });
});
