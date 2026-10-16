import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import { useReferenceList } from "./use-reference-list";

const { apiFetchMock } = vi.hoisted(() => ({ apiFetchMock: vi.fn() }));
vi.mock("@/lib/api", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/api")>(),
  apiFetch: apiFetchMock,
}));

// The hook reads through react-query; each test gets a fresh client (no retries).
let wrapper: ({ children }: { children: ReactNode }) => JSX.Element;

describe("useReferenceList", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    wrapper = ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  });

  it.each([[{ id: "one" }], { items: [{ id: "one" }] }])("loads a reference list response %j", async (response) => {
    apiFetchMock.mockResolvedValue(response);
    const { result } = renderHook(() => useReferenceList<{ id: string }>("/catalog"), { wrapper });
    expect(result.current.loading).toBe(true);
    expect(result.current.ready).toBe(false);
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.items).toEqual([{ id: "one" }]);
  });

  it("keeps initial failure distinct from a successfully empty list and retries explicitly", async () => {
    apiFetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch")).mockResolvedValueOnce([]);
    const { result } = renderHook(() => useReferenceList("/catalog"), { wrapper });
    await waitFor(() => expect(result.current.error).toBe(true));
    expect(result.current.loaded).toBe(false);
    expect(result.current.ready).toBe(false);
    expect(apiFetchMock).toHaveBeenCalledTimes(1);
    await act(() => result.current.reload());
    await waitFor(() => expect(result.current).toMatchObject({ items: [], loaded: true, ready: true, error: false }));
  });

  it("preserves the last successful list after a refresh error but does not mark it ready", async () => {
    apiFetchMock.mockResolvedValueOnce([{ id: "one" }]).mockRejectedValueOnce(new ApiError(503, "Unavailable"));
    const { result } = renderHook(() => useReferenceList("/catalog"), { wrapper });
    await waitFor(() => expect(result.current.ready).toBe(true));
    await act(() => result.current.reload());
    await waitFor(() => expect(result.current).toMatchObject({ items: [{ id: "one" }], loaded: true, error: true, ready: false }));
  });

  it.each([401, 403])("does not preserve reference data after access is rejected with %s", async (status) => {
    apiFetchMock.mockResolvedValueOnce([{ id: "private" }]).mockRejectedValueOnce(new ApiError(status, "Denied"));
    const { result } = renderHook(() => useReferenceList("/catalog"), { wrapper });
    await waitFor(() => expect(result.current.ready).toBe(true));
    await act(() => result.current.reload());
    await waitFor(() => expect(result.current).toMatchObject({ items: [], loaded: false, error: true, ready: false }));
  });

  it("deduplicates a reload issued during the initial load into the in-flight request", async () => {
    // react-query semantics: while the first load is pending there is nothing
    // to cancel, so reload() joins that request instead of starting a second
    // one; its result is the one published. (A reload after data exists
    // cancels and refetches, covered below.)
    let finishFirst!: (items: unknown[]) => void;
    apiFetchMock.mockImplementationOnce(() => new Promise((resolve) => { finishFirst = resolve; }))
      .mockResolvedValueOnce([{ id: "second" }]);
    const { result } = renderHook(() => useReferenceList("/catalog"), { wrapper });
    let reloaded!: Promise<void>;
    await act(async () => { reloaded = result.current.reload(); });
    expect(apiFetchMock).toHaveBeenCalledTimes(1);
    await act(async () => { finishFirst([{ id: "first" }]); });
    await act(() => reloaded);
    await waitFor(() => expect(result.current.items).toEqual([{ id: "first" }]));
    expect(apiFetchMock).toHaveBeenCalledTimes(1);
  });

  it("cancels the in-flight refresh when reload() is called again after data exists", async () => {
    let finishStale!: (items: unknown[]) => void;
    apiFetchMock.mockResolvedValueOnce([{ id: "one" }])
      .mockImplementationOnce(() => new Promise((resolve) => { finishStale = resolve; }))
      .mockResolvedValueOnce([{ id: "latest" }]);
    const { result } = renderHook(() => useReferenceList("/catalog"), { wrapper });
    await waitFor(() => expect(result.current.ready).toBe(true));
    let firstReload!: Promise<void>;
    await act(async () => { firstReload = result.current.reload(); });
    const staleSignal = apiFetchMock.mock.calls[1][1].signal as AbortSignal;
    let secondReload!: Promise<void>;
    await act(async () => { secondReload = result.current.reload(); });
    expect(staleSignal.aborted).toBe(true);
    await act(async () => { finishStale([{ id: "obsolete" }]); });
    await act(async () => { await Promise.allSettled([firstReload, secondReload]); });
    await waitFor(() => expect(result.current.items).toEqual([{ id: "latest" }]));
  });

  it("loads every catalog page without publishing a partial list", async () => {
    let finish!: (items: unknown[]) => void;
    apiFetchMock.mockResolvedValueOnce([{ id: "one" }, { id: "two" }])
      .mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const { result } = renderHook(() => useReferenceList("/catalog?limit=2", 2), { wrapper });
    await waitFor(() => expect(apiFetchMock).toHaveBeenCalledTimes(2));
    expect(apiFetchMock.mock.calls[1][0]).toBe("/catalog?limit=2&offset=2");
    expect(result.current.items).toEqual([]);
    expect(result.current.ready).toBe(false);
    await act(async () => { finish([{ id: "three" }]); });
    await waitFor(() => expect(result.current.items).toEqual([{ id: "one" }, { id: "two" }, { id: "three" }]));
    expect(result.current.ready).toBe(true);
  });

  it("does not treat an incomplete catalog as ready when a later page fails", async () => {
    apiFetchMock.mockResolvedValueOnce([{ id: "one" }, { id: "two" }])
      .mockRejectedValueOnce(new ApiError(503, "Unavailable"));
    const { result } = renderHook(() => useReferenceList("/catalog?limit=2", 2), { wrapper });
    await waitFor(() => expect(result.current.error).toBe(true));
    expect(result.current).toMatchObject({ items: [], loaded: false, ready: false });
  });

  it("clears the previous endpoint data and aborts pending work on unmount", async () => {
    apiFetchMock.mockResolvedValueOnce([{ id: "old" }]).mockImplementationOnce(() => new Promise(() => {}));
    const { result, rerender, unmount } = renderHook(({ path }) => useReferenceList(path), {
      initialProps: { path: "/one" },
      wrapper,
    });
    await waitFor(() => expect(result.current.ready).toBe(true));
    rerender({ path: "/two" });
    expect(result.current).toMatchObject({ items: [], loaded: false, loading: true });
    const signal = apiFetchMock.mock.calls[1][1].signal as AbortSignal;
    unmount();
    expect(signal.aborted).toBe(true);
  });
});
