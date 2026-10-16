import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import { fetchInstallerEarningsSummary, fetchInstallerIssueMedia, fetchInstallerSyncQueue } from "@/lib/installer-api";

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
});
