import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import InstallerSyncQueuePage from "@/views/installer/SyncQueuePage";

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}));
const { searchParamsMock } = vi.hoisted(() => ({
  searchParamsMock: vi.fn(() => new URLSearchParams("")),
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

vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParamsMock(),
}));

describe("InstallerSyncQueuePage", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    searchParamsMock.mockReset();
    searchParamsMock.mockReturnValue(new URLSearchParams(""));
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
              project_id: "project-7",
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
    expect(
      await screen.findByText((content) => content.includes("CONFLICT_ASSIGNMENT_CHANGED"))
    ).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "Open issue" })).toHaveAttribute(
      "href",
      "/installer/issues?issue_id=issue-1&issue_search=issue-1&project_id=project-7"
    );
    expect(await screen.findByRole("link", { name: "Open project" })).toHaveAttribute(
      "href",
      "/installer/projects/project-7"
    );
    expect(await screen.findByRole("link", { name: "Open calendar" })).toHaveAttribute(
      "href",
      "/installer/calendar?project_id=project-7"
    );
    expect(await screen.findByRole("link", { name: "Open earnings" })).toHaveAttribute(
      "href",
      "/installer/earnings?project_id=project-7"
    );
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

  it("surfaces focused project context and filters queue items", async () => {
    searchParamsMock.mockReturnValue(new URLSearchParams("project_id=project-7"));
    apiFetchMock.mockResolvedValue({
      items: [
        {
          id: "item-1",
          entity_type: "issue",
          entity_id: "issue-1",
          project_id: "project-7",
          operation_type: "add_comment",
          status: "BLOCKED",
          created_at: "2026-03-21T11:00:00Z",
          synced_at: null,
          conflict_code: "CONFLICT_ASSIGNMENT_CHANGED",
        },
        {
          id: "item-2",
          entity_type: "project",
          entity_id: "project-9",
          project_id: "project-9",
          operation_type: "update_project",
          status: "PENDING",
          created_at: "2026-03-21T11:30:00Z",
          synced_at: null,
          conflict_code: null,
        },
      ],
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <InstallerSyncQueuePage />
      </QueryClientProvider>
    );

    expect(await screen.findByText("Focused project project-7")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Show full sync queue" })).toHaveAttribute(
      "href",
      "/installer/sync-queue"
    );
    expect(await screen.findByText("add_comment")).toBeInTheDocument();
    expect(screen.queryByText("update_project")).not.toBeInTheDocument();
  });
});
