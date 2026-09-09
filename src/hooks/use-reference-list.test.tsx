import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import { useReferenceList } from "./use-reference-list";

const { apiFetchMock } = vi.hoisted(() => ({ apiFetchMock: vi.fn() }));
vi.mock("@/lib/api", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/api")>(),
  apiFetch: apiFetchMock,
}));

describe("useReferenceList", () => {
  beforeEach(() => apiFetchMock.mockReset());

  it.each([[{ id: "one" }], { items: [{ id: "one" }] }])("loads a reference list response %j", async (response) => {
    apiFetchMock.mockResolvedValue(response);
    const { result } = renderHook(() => useReferenceList<{ id: string }>("/catalog"));
    expect(result.current.loading).toBe(true);
    expect(result.current.ready).toBe(false);
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.items).toEqual([{ id: "one" }]);
  });

  it("keeps initial failure distinct from a successfully empty list and retries explicitly", async () => {
    apiFetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch")).mockResolvedValueOnce([]);
    const { result } = renderHook(() => useReferenceList("/catalog"));
    await waitFor(() => expect(result.current.error).toBe(true));
    expect(result.current.loaded).toBe(false);
    expect(result.current.ready).toBe(false);
    expect(apiFetchMock).toHaveBeenCalledTimes(1);
    await act(() => result.current.reload());
    expect(result.current).toMatchObject({ items: [], loaded: true, ready: true, error: false });
  });

  it("preserves the last successful list after a refresh error but does not mark it ready", async () => {
    apiFetchMock.mockResolvedValueOnce([{ id: "one" }]).mockRejectedValueOnce(new ApiError(503, "Unavailable"));
    const { result } = renderHook(() => useReferenceList("/catalog"));
    await waitFor(() => expect(result.current.ready).toBe(true));
    await act(() => result.current.reload());
    expect(result.current).toMatchObject({ items: [{ id: "one" }], loaded: true, error: true, ready: false });
  });

  it.each([401, 403])("does not preserve reference data after access is rejected with %s", async (status) => {
    apiFetchMock.mockResolvedValueOnce([{ id: "private" }]).mockRejectedValueOnce(new ApiError(status, "Denied"));
    const { result } = renderHook(() => useReferenceList("/catalog"));
    await waitFor(() => expect(result.current.ready).toBe(true));
    await act(() => result.current.reload());
    expect(result.current).toMatchObject({ items: [], loaded: false, error: true, ready: false });
  });

  it("ignores late results from an aborted request", async () => {
    let finishOld!: (items: unknown[]) => void;
    apiFetchMock.mockImplementationOnce(() => new Promise((resolve) => { finishOld = resolve; }))
      .mockResolvedValueOnce([{ id: "latest" }]);
    const { result } = renderHook(() => useReferenceList("/catalog"));
    const firstSignal = apiFetchMock.mock.calls[0][1].signal as AbortSignal;
    await act(() => result.current.reload());
    expect(firstSignal.aborted).toBe(true);
    await act(async () => { finishOld([{ id: "obsolete" }]); });
    expect(result.current.items).toEqual([{ id: "latest" }]);
  });

  it("loads every catalog page without publishing a partial list", async () => {
    let finish!: (items: unknown[]) => void;
    apiFetchMock.mockResolvedValueOnce([{ id: "one" }, { id: "two" }])
      .mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const { result } = renderHook(() => useReferenceList("/catalog?limit=2", 2));
    await waitFor(() => expect(apiFetchMock).toHaveBeenCalledTimes(2));
    expect(apiFetchMock.mock.calls[1][0]).toBe("/catalog?limit=2&offset=2");
    expect(result.current.items).toEqual([]);
    expect(result.current.ready).toBe(false);
    await act(async () => { finish([{ id: "three" }]); });
    expect(result.current.items).toEqual([{ id: "one" }, { id: "two" }, { id: "three" }]);
    expect(result.current.ready).toBe(true);
  });

  it("does not treat an incomplete catalog as ready when a later page fails", async () => {
    apiFetchMock.mockResolvedValueOnce([{ id: "one" }, { id: "two" }])
      .mockRejectedValueOnce(new ApiError(503, "Unavailable"));
    const { result } = renderHook(() => useReferenceList("/catalog?limit=2", 2));
    await waitFor(() => expect(result.current.error).toBe(true));
    expect(result.current).toMatchObject({ items: [], loaded: false, ready: false });
  });

  it("clears the previous endpoint data and aborts pending work on unmount", async () => {
    apiFetchMock.mockResolvedValueOnce([{ id: "old" }]).mockImplementationOnce(() => new Promise(() => {}));
    const { result, rerender, unmount } = renderHook(({ path }) => useReferenceList(path), {
      initialProps: { path: "/one" },
    });
    await waitFor(() => expect(result.current.ready).toBe(true));
    rerender({ path: "/two" });
    expect(result.current).toMatchObject({ items: [], loaded: false, loading: true });
    const signal = apiFetchMock.mock.calls[1][1].signal as AbortSignal;
    unmount();
    expect(signal.aborted).toBe(true);
  });
});
