import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import InstallerSyncQueuePage from "@/views/installer/SyncQueuePage";

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status = 500) {
      super(message);
      this.status = status;
    }
  },
  apiFetch: apiFetchMock,
}));

describe("InstallerSyncQueuePage", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it("renders sync queue stats and items", async () => {
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path === "/api/v1/installer/sync-queue") {
        return {
          items: [
            {
              id: "item-1",
              entity_type: "door",
              entity_id: "door-1",
              operation_type: "set_status",
              status: "PENDING",
              created_at: "2026-03-21T10:00:00Z",
              synced_at: null,
              conflict_code: null,
            },
            {
              id: "item-2",
              entity_type: "issue",
              entity_id: "issue-1",
              operation_type: "add_comment",
              status: "BLOCKED",
              created_at: "2026-03-21T11:00:00Z",
              synced_at: null,
              conflict_code: "CONFLICT_ASSIGNMENT_CHANGED",
            },
          ],
        };
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <InstallerSyncQueuePage />
      </QueryClientProvider>
    );

    expect(await screen.findByText("Installer sync queue")).toBeInTheDocument();
    expect(await screen.findByText("set_status")).toBeInTheDocument();
    expect(await screen.findByText("add_comment")).toBeInTheDocument();
    expect(await screen.findByText("CONFLICT_ASSIGNMENT_CHANGED")).toBeInTheDocument();
    expect(await screen.findAllByText("2")).not.toHaveLength(0);
  });

  it("shows empty state when queue has no items", async () => {
    apiFetchMock.mockResolvedValue({ items: [] });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <InstallerSyncQueuePage />
      </QueryClientProvider>
    );

    expect(await screen.findByText("Sync queue is empty.")).toBeInTheDocument();
  });
});
