import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import InstallerIssuesPage from "@/views/installer/IssuesPage";

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

describe("InstallerIssuesPage", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    window.history.replaceState({}, "", "/installer/issues");
  });

  it("renders installer issues with filters and project links", async () => {
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path === "/api/v1/installer/issues") {
        return {
          items: [
            {
              id: "issue-1",
              project_id: "project-1",
              door_id: "door-1",
              status: "BLOCKED",
              priority: "P1",
              title: "Blocked lock",
              description: "Lock jammed on site",
            },
            {
              id: "issue-2",
              project_id: "project-2",
              door_id: "door-2",
              status: "OPEN",
              priority: "P2",
              title: "Missing handle",
              description: "Need replacement",
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
        <InstallerIssuesPage />
      </QueryClientProvider>
    );

    expect(await screen.findByText("Installer issues")).toBeInTheDocument();
    expect(await screen.findByText("Blocked lock")).toBeInTheDocument();
    const projectHrefs = screen
      .getAllByRole("link", { name: "Open project" })
      .map((link) => link.getAttribute("href"));
    expect(projectHrefs).toContain("/installer/projects/project-1");
    expect(projectHrefs).toContain("/installer/projects/project-2");

    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "OPEN" } });

    await waitFor(() => {
      expect(screen.queryByText("Blocked lock")).not.toBeInTheDocument();
      expect(screen.getByText("Missing handle")).toBeInTheDocument();
      expect(window.location.search).toContain("issue_status=OPEN");
    });
  });

  it("reads deep-link filters from query params", async () => {
    window.history.replaceState({}, "", "/installer/issues?project_id=project-2&issue_status=OPEN&issue_search=handle");

    apiFetchMock.mockResolvedValue({
      items: [
        {
          id: "issue-1",
          project_id: "project-1",
          door_id: "door-1",
          status: "BLOCKED",
          priority: "P1",
          title: "Blocked lock",
          description: "Lock jammed on site",
        },
        {
          id: "issue-2",
          project_id: "project-2",
          door_id: "door-2",
          status: "OPEN",
          priority: "P2",
          title: "Missing handle",
          description: "Need replacement",
        },
      ],
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <InstallerIssuesPage />
      </QueryClientProvider>
    );

    expect(await screen.findByText("Missing handle")).toBeInTheDocument();
    expect(screen.queryByText("Blocked lock")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Project")).toHaveValue("project-2");
    expect(screen.getByLabelText("Status")).toHaveValue("OPEN");
    expect(screen.getByLabelText("Issue search")).toHaveValue("handle");
  });

  it("saves installer note for an issue", async () => {
    apiFetchMock.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === "/api/v1/installer/issues" && !init) {
        return {
          items: [
            {
              id: "issue-1",
              project_id: "project-1",
              door_id: "door-1",
              status: "BLOCKED",
              priority: "P1",
              title: "Blocked lock",
              description: "Lock jammed on site",
              comment: "Initial note",
              media_count: 0,
            },
          ],
        };
      }
      if (path === "/api/v1/installer/issues/issue-1" && init?.method === "PATCH") {
        expect(init.body).toBe(JSON.stringify({ comment: "Updated field note" }));
        return { ok: true };
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <InstallerIssuesPage />
      </QueryClientProvider>
    );

    const noteInput = await screen.findByLabelText("Field note issue-1");
    fireEvent.change(noteInput, { target: { value: "Updated field note" } });
    fireEvent.click(screen.getByRole("button", { name: "Save note" }));

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenCalledWith("/api/v1/installer/issues/issue-1", {
        method: "PATCH",
        body: JSON.stringify({ comment: "Updated field note" }),
      });
    });
  });
});
