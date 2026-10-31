import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import IssuesPage from "@/views/IssuesPage";

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}));
const { searchParamsMock } = vi.hoisted(() => ({
  searchParamsMock: vi.fn(),
}));
const { authSessionMock } = vi.hoisted(() => ({
  authSessionMock: vi.fn(),
}));

vi.mock("@/components/DashboardLayout", () => ({
  DashboardLayout: ({ children }: { children: ReactNode }) => (
    <div data-testid="dashboard-layout">{children}</div>
  ),
}));

vi.mock("@/lib/api", () => ({
  apiFetch: apiFetchMock,
}));

vi.mock("@/hooks/use-auth-session", () => ({
  useAuthSession: authSessionMock,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: searchParamsMock,
}));

describe("IssuesPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    apiFetchMock.mockReset();
    searchParamsMock.mockReset();
    authSessionMock.mockReset();
    searchParamsMock.mockReturnValue(new URLSearchParams(""));
    authSessionMock.mockReturnValue({
      role: "ADMIN",
      admin_scope: "OWNER",
      can_view_rates: true,
    });
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

    const issuesControl = await screen.findByTestId("issues-control-v26");
    expect(within(issuesControl).getByText("SLA breached")).toBeInTheDocument();
    expect(
      within(issuesControl).getByRole("button", { name: /Export CSV/i })
    ).toBeInTheDocument();

    expect(await screen.findByText("Install blocked", {}, { timeout: 5000 })).toBeInTheDocument();

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

  it("shows who raised a site issue and lets only the site representative close it", async () => {
    const issueId = "47dc52c8-e2d4-4061-8dc8-05ce3199c0aa";
    const siteIssue = {
      id: issueId, company_id: "8ea9b2c0-0848-4997-a5dd-58e5df3787e0", door_id: "1d8816f9-1bcf-4cfd-a111-2596887197a4",
      project_id: "7fa68e09-d216-4b3c-b5ef-206efe47d457", door_unit_label: "A-102", status: "OPEN", workflow_state: "RESOLVED",
      priority: "P3", owner_user_id: null, due_at: null, is_overdue: false, title: "Gap at the frame", details: null,
      created_at: "2026-10-20T10:00:00Z", updated_at: "2026-10-22T10:00:00Z",
      source: "SITE", stage_code: "FRAME", raised_by_name: "Site Rep", fix_reported_at: "2026-10-22T09:00:00Z",
    };
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path.includes("/api/v1/admin/installers")) return [];
      if (path.includes("/api/v1/admin/issues")) return { items: [siteIssue] };
      return {};
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={queryClient}><IssuesPage /></QueryClientProvider>);
    fireEvent.click(await screen.findByText("Gap at the frame"));
    const trail = await screen.findByTestId("issue-trail");
    expect(within(trail).getByText("Raised by the site: Site Rep")).toBeInTheDocument();
    expect(within(trail).getByText("Stage FRAME")).toBeInTheDocument();
    expect(within(trail).getByText(/Fix reported/)).toBeInTheDocument();
    const statusSelect = screen.getByLabelText("Issue status") as HTMLSelectElement;
    expect((within(statusSelect).getByRole("option", { name: "Closed" }) as HTMLOptionElement).disabled).toBe(true);
    const workflowSelect = screen.getByLabelText("Issue workflow state") as HTMLSelectElement;
    expect((within(workflowSelect).getByRole("option", { name: "Closed" }) as HTMLOptionElement).disabled).toBe(true);
    expect((within(workflowSelect).getByRole("option", { name: "Fixed, awaiting check" }) as HTMLOptionElement).disabled).toBe(false);
    expect(screen.getByText(/closed only by the site representative/)).toBeInTheDocument();
  });

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
    expect(screen.getByText("Project · B-202")).toBeInTheDocument();
  }, 15000);

  it("does not select another issue when issue_id deep link is unavailable", async () => {
    searchParamsMock.mockReturnValue(new URLSearchParams("issue_id=missing-issue"));

    apiFetchMock.mockImplementation(async (path: string) => {
      if (path.includes("/api/v1/admin/installers")) {
        return [];
      }
      if (path.includes("/api/v1/admin/issues")) {
        return {
          items: [
            {
              id: "issue-1",
              company_id: "company-1",
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

    expect(
      await screen.findByText(
        "Requested issue missing-issue is not available in the current issue list. Another issue was not selected automatically.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Install blocked")).toBeInTheDocument();
    expect(screen.getByText("Select an issue to edit workflow.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show issue list" }));

    await waitFor(() => {
      expect(
        screen.queryByText(
          "Requested issue missing-issue is not available in the current issue list. Another issue was not selected automatically.",
        ),
      ).not.toBeInTheDocument();
    });
  }, 15000);

  it("bulk apply carries only workflow fields, never details, and asks for confirmation first", async () => {
    const issueId = "47dc52c8-e2d4-4061-8dc8-05ce3199c06d";
    const otherId = "9b1b6d4e-8f0a-4a0b-9c3e-5d2f1a7c8e90";
    const issue = (id: string, title: string) => ({
      id,
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
      title,
      details: `${title} details`,
      created_at: "2026-02-20T10:00:00Z",
      updated_at: "2026-02-22T10:00:00Z",
    });
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path.includes("/api/v1/admin/installers")) return [];
      if (path.includes("/api/v1/admin/issues/workflow/bulk")) {
        return { updated: 2, missing_issue_ids: [], items: [] };
      }
      if (path.includes("/api/v1/admin/issues")) {
        return { items: [issue(issueId, "Install blocked"), issue(otherId, "Frame damaged")] };
      }
      return {};
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <IssuesPage />
      </QueryClientProvider>,
    );
    fireEvent.click(await screen.findByText("Install blocked", {}, { timeout: 5000 }));
    fireEvent.change(await screen.findByLabelText("Issue workflow state"), { target: { value: "IN_PROGRESS" } });
    fireEvent.change(screen.getByLabelText("Issue details"), { target: { value: "Only mine" } });

    fireEvent.click(screen.getByRole("button", { name: /Apply to filtered/i }));
    const dialog = await screen.findByTestId("issues-bulk-confirm");
    expect(dialog).toHaveTextContent("2 filtered issues");
    expect(dialog).toHaveTextContent("workflow: In progress");
    expect(apiFetchMock.mock.calls.some((call) => String(call[0]).includes("/workflow/bulk"))).toBe(false);

    fireEvent.click(within(dialog).getByRole("button", { name: "Apply" }));
    await waitFor(() => {
      const bulkCall = apiFetchMock.mock.calls.find((call) => String(call[0]).includes("/api/v1/admin/issues/workflow/bulk"));
      expect(bulkCall).toBeTruthy();
      const body = JSON.parse(String(bulkCall?.[1]?.body));
      expect(body.issue_ids).toEqual([issueId, otherId]);
      expect(body.workflow_state).toBe("IN_PROGRESS");
      // Untouched fields are never copied from the selected issue onto the others.
      expect(body).not.toHaveProperty("priority");
      expect(body).not.toHaveProperty("owner_user_id");
      expect(body).not.toHaveProperty("status");
      expect(body).not.toHaveProperty("details");
      expect(body).not.toHaveProperty("due_at");
    });
    expect(await screen.findByText("Bulk updated 2 issues")).toBeInTheDocument();
  }, 15000);

  it("bulk closing leaves issues raised by the site open and lists issues by site name", async () => {
    const issue = (id: string, title: string, source: "INTERNAL" | "SITE") => ({
      id, company_id: "8ea9b2c0-0848-4997-a5dd-58e5df3787e0", door_id: `door-${id}`, project_id: "7fa68e09-d216-4b3c-b5ef-206efe47d457",
      project_name: "Tower A", door_unit_label: `U-${id}`, status: "OPEN", workflow_state: "RESOLVED", priority: "P3",
      owner_user_id: null, due_at: null, is_overdue: false, title, details: null, created_at: "2026-02-20T10:00:00Z",
      updated_at: "2026-02-22T10:00:00Z", source,
    });
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path.includes("/api/v1/admin/installers")) return [];
      if (path.includes("/api/v1/admin/issues/workflow/bulk")) return { updated: 1, missing_issue_ids: [], items: [] };
      if (path.includes("/api/v1/admin/issues")) return { items: [issue("in-1", "Office defect", "INTERNAL"), issue("site-1", "Site defect", "SITE")] };
      return {};
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={queryClient}><IssuesPage /></QueryClientProvider>);
    fireEvent.click(await screen.findByText("Office defect", {}, { timeout: 5000 }));
    expect(screen.getAllByText(/Tower A · door U-in-1/).length).toBeGreaterThan(0);
    fireEvent.change(await screen.findByLabelText("Issue workflow state"), { target: { value: "CLOSED" } });
    fireEvent.click(screen.getByRole("button", { name: /Apply to filtered/i }));
    const dialog = await screen.findByTestId("issues-bulk-confirm");
    expect(dialog).toHaveTextContent("Apply to 1 filtered issues");
    expect(dialog).toHaveTextContent("only the site representative closes them");
    fireEvent.click(within(dialog).getByRole("button", { name: "Apply" }));
    await waitFor(() => {
      const bulkCall = apiFetchMock.mock.calls.find((call) => String(call[0]).includes("/workflow/bulk"));
      expect(JSON.parse(String(bulkCall?.[1]?.body)).issue_ids).toEqual(["in-1"]);
    });
  }, 15000);

  it("keeps viewer workflow actions read-only", async () => {
    authSessionMock.mockReturnValue({
      role: "ADMIN",
      admin_scope: "VIEWER",
      can_view_rates: false,
      can_manage_imports: true,
      can_manage_users: true,
    });

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

    expect(
      await screen.findByText("Your access level has read-only access to issue workflow controls.", {}, { timeout: 5000 })
    ).toBeInTheDocument();
      // E5: the SLA tile is a toggle for the overdue-only filter.
      const overdueTile = screen.getByTestId("issues-kpi-overdue");
      expect(overdueTile).toHaveAttribute("aria-pressed", "false");
      fireEvent.click(overdueTile);
      expect(overdueTile).toHaveAttribute("aria-pressed", "true");
      fireEvent.click(overdueTile);
      expect(overdueTile).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(screen.getByText("Install blocked"));
    expect(await screen.findByRole("button", { name: "Save Workflow" })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Apply To Filtered/i })).toBeDisabled();
  }, 15000);

  it("shows issue comments and opens media attachments for the selected issue", async () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    apiFetchMock.mockImplementation(async (path: string) => {
      if (path.includes("/api/v1/admin/installers")) {
        return [];
      }
      if (path === "/api/v1/admin/issues?limit=200") {
        return {
          items: [
            {
              id: "issue-1",
              company_id: "company-1",
              door_id: "door-1",
              project_id: "project-1",
              door_unit_label: "A-101",
              status: "OPEN",
              workflow_state: "NEW",
              priority: "P2",
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
      if (path === "/api/v1/admin/issues/issue-1/comments") {
        return {
          items: [
            {
              id: "comment-1",
              body: "Called the customer and confirmed the delay.",
              author_name: "Dispatcher One",
              created_at: "2026-02-22T12:00:00Z",
            },
          ],
        };
      }
      if (path === "/api/v1/admin/issues/issue-1/media") {
        return {
          items: [
            {
              id: "media-1",
              file_name: "lock-photo.jpg",
              content_type: "image/jpeg",
              created_at: "2026-02-22T12:30:00Z",
            },
          ],
        };
      }
      if (path === "/api/v1/media/media-1/url") {
        return {
          url: "https://files.dimax.test/lock-photo.jpg",
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
    expect(await screen.findByText("Called the customer and confirmed the delay.", {}, { timeout: 5000 })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show" }));
    expect(await screen.findByText("lock-photo.jpg")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open" }));

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenCalledWith("/api/v1/media/media-1/url");
      expect(openSpy).toHaveBeenCalledWith(
        "https://files.dimax.test/lock-photo.jpg",
        "_blank",
        "noopener,noreferrer"
      );
    });
  }, 15000);
  it("lets the office add a comment to the selected issue", async () => {
    const issueId = "47dc52c8-e2d4-4061-8dc8-05ce3199c06d";
    let comments: Array<{ id: string; body: string; author_name: string; created_at: string }> = [];
    apiFetchMock.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path.includes("/api/v1/admin/installers")) return [];
      if (path === `/api/v1/admin/issues/${issueId}/comments` && init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as { body: string };
        comments = [...comments, { id: `c-${comments.length + 1}`, body: body.body, author_name: "Owner One", created_at: "2026-02-23T10:00:00Z" }];
        return comments[comments.length - 1];
      }
      if (path === `/api/v1/admin/issues/${issueId}/comments`) return { items: comments };
      if (path.includes("/api/v1/admin/issues")) {
        return { items: [{
          id: issueId, company_id: "8ea9b2c0-0848-4997-a5dd-58e5df3787e0", door_id: "1d8816f9-1bcf-4cfd-a111-2596887197a4",
          project_id: "7fa68e09-d216-4b3c-b5ef-206efe47d457", door_unit_label: "A-101", status: "OPEN", workflow_state: "NEW",
          priority: "P3", owner_user_id: null, due_at: null, is_overdue: false, title: "Install blocked",
          details: "Client requested delay", created_at: "2026-02-20T10:00:00Z", updated_at: "2026-02-22T10:00:00Z",
        }] };
      }
      return {};
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={queryClient}><IssuesPage /></QueryClientProvider>);
    fireEvent.click(await screen.findByText("Install blocked", {}, { timeout: 5000 }));
    expect(await screen.findByText("No comments yet.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("New comment"), { target: { value: "Frame ordered, ETA Monday" } });
    fireEvent.click(screen.getByRole("button", { name: "Add comment" }));

    expect(await screen.findByText("Frame ordered, ETA Monday")).toBeInTheDocument();
    const post = apiFetchMock.mock.calls.find((call) => String(call[0]).endsWith("/comments") && call[1]?.method === "POST");
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({ body: "Frame ordered, ETA Monday" });
  }, 15000);

  it("shows a retryable error when issue comments fail to load instead of an empty list", async () => {
    let commentsDown = true;
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path.includes("/api/v1/admin/installers")) return [];
      if (path === "/api/v1/admin/issues?limit=200") {
        return {
          items: [
            {
              id: "issue-1", company_id: "company-1", door_id: "door-1", project_id: "project-1",
              door_unit_label: "A-101", status: "OPEN", workflow_state: "NEW", priority: "P2",
              owner_user_id: null, due_at: null, is_overdue: false, title: "Install blocked",
              details: "Client requested delay", created_at: "2026-02-20T10:00:00Z", updated_at: "2026-02-22T10:00:00Z",
            },
          ],
        };
      }
      if (path === "/api/v1/admin/issues/issue-1/comments") {
        if (commentsDown) throw new TypeError("Failed to fetch");
        return { items: [{ id: "comment-1", body: "Back online.", author_name: "Dispatcher One", created_at: "2026-02-22T12:00:00Z" }] };
      }
      return {};
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <IssuesPage />
      </QueryClientProvider>
    );
    expect(await screen.findByText("Install blocked")).toBeInTheDocument();
    const notice = await screen.findByRole("alert", {}, { timeout: 5000 });
    expect(notice).toHaveTextContent("Could not load comments.");
    expect(screen.queryByText("No comments yet.")).not.toBeInTheDocument();
    commentsDown = false;
    fireEvent.click(within(notice).getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Back online.", {}, { timeout: 5000 })).toBeInTheDocument();
  });
});
