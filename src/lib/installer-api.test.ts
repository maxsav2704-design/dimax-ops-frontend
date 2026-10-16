import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import {
  fetchInstallerEarningsSummary,
  fetchInstallerIssueMedia,
  fetchInstallerSyncQueue,
  fetchInstallerWorkspace,
} from "@/lib/installer-api";

const { apiFetchMock } = vi.hoisted(() => ({ apiFetchMock: vi.fn() }));

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  apiFetch: apiFetchMock,
}));

describe("optional installer endpoints", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it.each([404, 403, 501])("treats HTTP %s as 'nothing here' and returns null", async (status) => {
    apiFetchMock.mockRejectedValue(new ApiError(status, "absent"));
    await expect(fetchInstallerEarningsSummary()).resolves.toBeNull();
    await expect(fetchInstallerSyncQueue()).resolves.toBeNull();
    await expect(fetchInstallerIssueMedia("issue-1")).resolves.toEqual([]);
  });

  it.each([
    ["server error", new ApiError(500, "boom")],
    ["expired session", new ApiError(401, "Unauthorized", { error: { code: "AUTH_REQUIRED" } })],
    ["network failure", new ApiError(0, "Failed to fetch", { error: { code: "NETWORK_UNAVAILABLE" } })],
    ["unexpected exception", new TypeError("bad json")],
  ])("surfaces a %s instead of rendering empty data", async (_label, error) => {
    apiFetchMock.mockRejectedValue(error);
    await expect(fetchInstallerEarningsSummary()).rejects.toBe(error);
    await expect(fetchInstallerSyncQueue()).rejects.toBe(error);
    await expect(fetchInstallerIssueMedia("issue-1")).rejects.toBe(error);
  });

  it("passes successful payloads through unchanged", async () => {
    apiFetchMock.mockResolvedValue({ items: [{ id: "m-1" }] });
    await expect(fetchInstallerIssueMedia("issue-1")).resolves.toEqual([{ id: "m-1" }]);
  });

  it("keeps the composed workspace usable when an optional panel endpoint fails", async () => {
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path === "/api/v1/installer/workspace") throw new ApiError(404, "no aggregate");
      if (path === "/api/v1/installer/projects") return { items: [{ id: "project-1", name: "Ashdod" }] };
      if (path.startsWith("/api/v1/installer/calendar/events")) return { items: [] };
      if (path === "/api/v1/installer/earnings/summary?period=month") throw new ApiError(500, "boom");
      if (path === "/api/v1/installer/sync-queue") throw new TypeError("Failed to fetch");
      if (path === "/api/v1/installer/issues") return { items: [] };
      throw new Error(`Unexpected path: ${path}`);
    });
    const range = { calendarFromIso: "2026-05-01T00:00:00Z", calendarToIso: "2026-05-02T00:00:00Z", tasksFromIso: "2026-05-01T00:00:00Z", tasksToIso: "2026-05-02T00:00:00Z" };
    const workspace = await fetchInstallerWorkspace(range);
    expect(workspace.source).toBe("composed-fallback");
    expect(workspace.projects).toHaveLength(1);
    expect(workspace.earningsSummary).toBeNull();
    expect(workspace.syncQueue).toBeNull();
    // The dedicated pages still see the failure.
    await expect(fetchInstallerEarningsSummary()).rejects.toBeInstanceOf(ApiError);
  });
});
