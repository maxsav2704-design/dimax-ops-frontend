import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import IssuesPage from "@/views/IssuesPage";

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}));
const { searchParamsMock } = vi.hoisted(() => ({
  searchParamsMock: vi.fn(),
}));
const { userRoleMock } = vi.hoisted(() => ({
  userRoleMock: vi.fn(),
}));

vi.mock("@/components/DashboardLayout", () => ({
  DashboardLayout: ({ children }: { children: ReactNode }) => (
    <div data-testid="dashboard-layout">{children}</div>
  ),
}));

vi.mock("@/lib/api", () => ({
  apiFetch: apiFetchMock,
}));

vi.mock("@/hooks/use-user-role", () => ({
  useUserRole: userRoleMock,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: searchParamsMock,
}));

describe("IssuesPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    apiFetchMock.mockReset();
    searchParamsMock.mockReset();
    userRoleMock.mockReset();
    searchParamsMock.mockReturnValue(new URLSearchParams(""));
    userRoleMock.mockReturnValue("ADMIN");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads issues, applies filters and saves workflow update", async () => {
    const ownerUserId = "3fd8d8c0-bdc4-4f72-bf18-b93f14f6f8eb";
    const issueId = "47dc52c8-e2d4-4061-8dc8-05ce3199c06d";

    apiFetchMock.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path.includes("/api/v1/admin/installers")) {
        return [
          {
            id: "installer-1",
            full_name: "Owner One",
            user_id: ownerUserId,
          },
        ];
      }

      if (path.includes(`/api/v1/admin/issues/${issueId}/workflow`)) {
        const payload = init?.body ? JSON.parse(String(init.body)) : {};
        return {
          id: issueId,
          company_id: "8ea9b2c0-0848-4997-a5dd-58e5df3787e0",
          door_id: "1d8816f9-1bcf-4cfd-a111-2596887197a4",
          project_id: "7fa68e09-d216-4b3c-b5ef-206efe47d457",
          door_unit_label: "A-101",
          status: payload.status || "OPEN",
          workflow_state: payload.workflow_state || "NEW",
          priority: payload.priority || "P3",
          owner_user_id: payload.owner_user_id ?? null,
          due_at: payload.due_at ?? null,
          is_overdue: false,
          title: "Install blocked",
          details: payload.details ?? "Client requested delay",
          created_at: "2026-02-20T10:00:00Z",
          updated_at: "2026-02-22T11:00:00Z",
        };
      }

      if (path.includes("/api/v1/admin/issues")) {
        return {
          items: [
            {
              id: issueId,
              company_id: "8ea9b2c0-0848-4997-a5dd-58e5df3787e0",
              door_id: "1d8816f9-1bcf-4cfd-a111-2596887197a4",
              project_id: "7fa68e09-d216-4b3c-b5ef-206efe47d457",
              door_unit_label: "A-101",
              status: "OPEN",
              workflow_state: "NEW",
              priority: "P3",
              owner_user_id: null,
              due_at: null,
              is_overdue: false,
              title: "Install blocked",
              details: "Client requested delay",
              created_at: "2026-02-20T10:00:00Z",
              updated_at: "2026-02-22T10:00:00Z",
            },
          ],
        };
      }

      return {};
    });

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <IssuesPage />
      </QueryClientProvider>
    );

    expect(await screen.findByText("Install blocked")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Status filter"), {
      target: { value: "OPEN" },
    });
    fireEvent.change(screen.getByLabelText("Workflow filter"), {
      target: { value: "NEW" },
    });

    await waitFor(() => {
      const hasFilteredCall = apiFetchMock.mock.calls.some((call) => {
        const url = String(call[0]);
        return (
          url.includes("/api/v1/admin/issues?") &&
          url.includes("status=OPEN") &&
          url.includes("workflow_state=NEW")
        );
      });
      expect(hasFilteredCall).toBe(true);
    });

    fireEvent.click(screen.getByText("Install blocked"));

    fireEvent.change(await screen.findByLabelText("Issue workflow state"), {
      target: { value: "IN_PROGRESS" },
    });
    fireEvent.change(screen.getByLabelText("Issue priority"), {
      target: { value: "P1" },
    });
    fireEvent.change(screen.getByLabelText("Issue owner select"), {
      target: { value: ownerUserId },
    });
    fireEvent.change(screen.getByLabelText("Issue details"), {
      target: { value: "Dispatcher triage started" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save Workflow" }));

    await waitFor(() => {
      const workflowCall = apiFetchMock.mock.calls.find((call) =>
        String(call[0]).includes(`/api/v1/admin/issues/${issueId}/workflow`)
      );
      expect(workflowCall).toBeTruthy();
      expect(workflowCall?.[1]).toMatchObject({
        method: "PATCH",
      });
      const body = workflowCall?.[1]?.body ? JSON.parse(String(workflowCall[1].body)) : {};
      expect(body.workflow_state).toBe("IN_PROGRESS");
      expect(body.priority).toBe("P1");
      expect(body.owner_user_id).toBe(ownerUserId);
      expect(body.details).toBe("Dispatcher triage started");
    });

    expect(await screen.findByText("Workflow updated")).toBeInTheDocument();
  }, 15000);

  it("preselects issue from query param issue_id", async () => {
    const issueA = "47dc52c8-e2d4-4061-8dc8-05ce3199c06d";
    const issueB = "1fe3476d-2438-4d8b-9a66-d0f7f5564f20";
    searchParamsMock.mockReturnValue(new URLSearchParams(`issue_id=${issueB}`));

    apiFetchMock.mockImplementation(async (path: string) => {
      if (path.includes("/api/v1/admin/installers")) {
        return [];
      }
      if (path.includes("/api/v1/admin/issues")) {
        return {
          items: [
            {
              id: issueA,
              company_id: "8ea9b2c0-0848-4997-a5dd-58e5df3787e0",
              door_id: "1d8816f9-1bcf-4cfd-a111-2596887197a4",
              project_id: "7fa68e09-d216-4b3c-b5ef-206efe47d457",
              door_unit_label: "A-101",
              status: "OPEN",
              workflow_state: "NEW",
              priority: "P3",
              owner_user_id: null,
              due_at: null,
              is_overdue: false,
              title: "Install blocked A",
              details: null,
              created_at: "2026-02-20T10:00:00Z",
              updated_at: "2026-02-22T10:00:00Z",
            },
            {
              id: issueB,
              company_id: "8ea9b2c0-0848-4997-a5dd-58e5df3787e0",
              door_id: "2d8816f9-1bcf-4cfd-a111-2596887197a5",
              project_id: "8fa68e09-d216-4b3c-b5ef-206efe47d458",
              door_unit_label: "B-202",
              status: "OPEN",
              workflow_state: "TRIAGED",
              priority: "P2",
              owner_user_id: null,
              due_at: null,
              is_overdue: false,
              title: "Install blocked B",
              details: null,
              created_at: "2026-02-20T10:00:00Z",
              updated_at: "2026-02-22T10:00:00Z",
            },
          ],
        };
      }
      return {};
    });

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <IssuesPage />
      </QueryClientProvider>
    );

    expect(await screen.findByText("Install blocked B")).toBeInTheDocument();
    expect(await screen.findByText("Issue #1fe3476d")).toBeInTheDocument();
    expect(screen.getByText("B-202 / 8fa68e09-d216-4b3c-b5ef-206efe47d458")).toBeInTheDocument();
  }, 15000);

  it("disables privileged workflow actions for installer role", async () => {
    userRoleMock.mockReturnValue("INSTALLER");

    apiFetchMock.mockImplementation(async (path: string) => {
      if (path.includes("/api/v1/admin/installers")) {
        return [];
      }
      if (path.includes("/api/v1/admin/issues")) {
        return {
          items: [
            {
              id: "issue-1",
              company_id: "8ea9b2c0-0848-4997-a5dd-58e5df3787e0",
              door_id: "door-1",
              project_id: "project-1",
              door_unit_label: "A-101",
              status: "OPEN",
              workflow_state: "NEW",
              priority: "P3",
              owner_user_id: null,
              due_at: null,
              is_overdue: false,
              title: "Install blocked",
              details: "Client requested delay",
              created_at: "2026-02-20T10:00:00Z",
              updated_at: "2026-02-22T10:00:00Z",
            },
          ],
        };
      }
      return {};
    });

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <IssuesPage />
      </QueryClientProvider>
    );

    expect(await screen.findByText("Installer role has read-only access to issue workflow controls.")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Install blocked"));
    expect(await screen.findByRole("button", { name: "Save Workflow" })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Apply To Filtered/i })).toBeDisabled();
  });
});

