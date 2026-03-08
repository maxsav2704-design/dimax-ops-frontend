import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import InstallerWorkspacePage from "@/views/installer/WorkspacePage";

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  apiFetch: apiFetchMock,
}));

describe("InstallerWorkspacePage", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-03-07T12:00:00.000Z"));
    apiFetchMock.mockReset();
    window.history.replaceState({}, "", "/installer");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders installer projects and events", async () => {
    const base = new Date();
    base.setHours(12, 0, 0, 0);
    const iso = (hoursShift: number) =>
      new Date(base.getTime() + hoursShift * 60 * 60 * 1000).toISOString();

    apiFetchMock.mockImplementation(async (path: string) => {
      if (path === "/api/v1/installer/projects") {
        return {
          items: [
            {
              id: "project-1",
              name: "Ashdod Towers",
              address: "Harbor 11",
              status: "IN_PROGRESS",
              waze_url: "https://waze.example/project-1",
            },
          ],
        };
      }
      if (String(path).includes("/api/v1/installer/calendar/events?")) {
        return {
          items: [
            {
              id: "event-1",
              title: "Morning visit",
              starts_at: iso(1),
              ends_at: iso(2),
              event_type: "INSTALLATION",
              project_id: "project-1",
            },
            {
              id: "event-2",
              title: "Late follow-up",
              starts_at: iso(-3),
              ends_at: iso(-2),
              event_type: "INSTALLATION",
              project_id: "project-1",
            },
            {
              id: "event-3",
              title: "Unassigned pickup",
              starts_at: iso(3),
              ends_at: iso(4),
              event_type: "DELIVERY",
              project_id: null,
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
        <InstallerWorkspacePage />
      </QueryClientProvider>
    );

    expect((await screen.findAllByText("Ashdod Towers")).length).toBeGreaterThan(0);
    expect(await screen.findByText("Morning visit")).toBeInTheDocument();
    expect(screen.getByText("Assigned projects")).toBeInTheDocument();

    const scheduleLink = screen.getByRole("link", { name: "Open schedule" });
    expect(scheduleLink).toHaveAttribute("href", "/installer/calendar?project_id=project-1");
    expect(screen.getByRole("link", { name: "Today on project" })).toHaveAttribute(
      "href",
      "/installer/calendar?preset=today&project_id=project-1"
    );
    expect(screen.getByRole("link", { name: "Priority doors" })).toHaveAttribute(
      "href",
      "/installer/projects/project-1#project-doors"
    );
    expect(screen.getByRole("link", { name: "Open Waze" })).toHaveAttribute(
      "href",
      "https://waze.example/project-1"
    );

    expect(screen.getByTestId("installer-tasks-today")).toHaveTextContent("3");
    expect(screen.getByTestId("installer-tasks-overdue")).toHaveTextContent("1");
    expect(screen.getByTestId("installer-tasks-no-project")).toHaveTextContent("1");
    expect(screen.getByRole("link", { name: "Open today tasks" })).toHaveAttribute(
      "href",
      "/installer/calendar?preset=today"
    );
    expect(screen.getByRole("link", { name: "Open overdue tasks" })).toHaveAttribute(
      "href",
      "/installer/calendar?preset=7d&overdue=1"
    );
    expect(screen.getByRole("link", { name: "Open no-project tasks" })).toHaveAttribute(
      "href",
      "/installer/calendar?preset=7d&project_id=none"
    );
    expect(screen.getByText("Today priorities")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open priority Ashdod Towers" })).toHaveAttribute(
      "href",
      "/installer/projects/project-1"
    );
    expect(screen.getByRole("link", { name: "Open priority Unassigned pickup" })).toHaveAttribute(
      "href",
      "/installer/calendar?preset=today&project_id=none"
    );
  }, 15000);

  it("shows retry action and refetches all installer workspace queries", async () => {
    let shouldFail = true;

    apiFetchMock.mockImplementation(async (path: string) => {
      if (shouldFail) {
        throw new Error("network down");
      }
      if (path === "/api/v1/installer/projects") {
        return { items: [] };
      }
      if (String(path).includes("/api/v1/installer/calendar/events?")) {
        return { items: [] };
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <InstallerWorkspacePage />
      </QueryClientProvider>
    );

    expect(
      await screen.findByText("Failed to load installer workspace. Check API availability and role mapping.")
    ).toBeInTheDocument();

    shouldFail = false;
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => {
      expect(screen.getByText("No assigned projects yet.")).toBeInTheDocument();
      expect(screen.getByText("No events scheduled.")).toBeInTheDocument();
    });

    const paths = (apiFetchMock.mock.calls as Array<[string]>).map(([path]) => path);
    expect(paths.filter((path) => path === "/api/v1/installer/projects").length).toBeGreaterThanOrEqual(2);
    expect(
      paths.filter((path) => String(path).includes("/api/v1/installer/calendar/events?")).length
    ).toBeGreaterThanOrEqual(4);
  });

  it("surfaces problem projects in today priorities", async () => {
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path === "/api/v1/installer/projects") {
        return {
          items: [
            {
              id: "project-2",
              name: "Haifa Port",
              address: "Dock 7",
              status: "PROBLEM",
              waze_url: null,
            },
          ],
        };
      }
      if (String(path).includes("/api/v1/installer/calendar/events?")) {
        return { items: [] };
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <InstallerWorkspacePage />
      </QueryClientProvider>
    );

    expect((await screen.findAllByText("Haifa Port")).length).toBeGreaterThan(0);
    expect(screen.getByText("Problem project | Dock 7")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open priority Haifa Port" })).toHaveAttribute(
      "href",
      "/installer/projects/project-2"
    );
    expect(screen.getByRole("link", { name: "Open issues" })).toHaveAttribute(
      "href",
      "/installer/projects/project-2?door_filter=WITH_ISSUES#project-open-issues"
    );
  });

  it("filters projects by quick workspace shortcuts", async () => {
    const base = new Date();
    base.setHours(12, 0, 0, 0);
    const iso = (hoursShift: number) =>
      new Date(base.getTime() + hoursShift * 60 * 60 * 1000).toISOString();

    apiFetchMock.mockImplementation(async (path: string) => {
      if (path === "/api/v1/installer/projects") {
        return {
          items: [
            {
              id: "project-1",
              name: "Ashdod Towers",
              address: "Harbor 11",
              status: "IN_PROGRESS",
              waze_url: null,
            },
            {
              id: "project-2",
              name: "Haifa Port",
              address: "Dock 7",
              status: "PROBLEM",
              waze_url: null,
            },
            {
              id: "project-3",
              name: "Jerusalem Mall",
              address: "City 3",
              status: "DONE",
              waze_url: null,
            },
          ],
        };
      }
      if (String(path).includes("/api/v1/installer/calendar/events?")) {
        return {
          items: [
            {
              id: "event-1",
              title: "Morning visit",
              starts_at: iso(1),
              ends_at: iso(2),
              event_type: "INSTALLATION",
              project_id: "project-1",
            },
            {
              id: "event-2",
              title: "Problem revisit",
              starts_at: iso(2),
              ends_at: iso(3),
              event_type: "SERVICE",
              project_id: "project-2",
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
        <InstallerWorkspacePage />
      </QueryClientProvider>
    );

    const projectsSection = screen.getByLabelText("My projects list");

    expect((await screen.findAllByText("Ashdod Towers")).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Only problem (1)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Only active (2)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Has tasks today (2)" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Only problem (1)" }));

    await waitFor(() => {
      expect(within(projectsSection).queryByText("Ashdod Towers")).not.toBeInTheDocument();
      expect(within(projectsSection).getByText("Haifa Port")).toBeInTheDocument();
      expect(within(projectsSection).queryByText("Jerusalem Mall")).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Has tasks today (2)" }));

    await waitFor(() => {
      expect(within(projectsSection).getByText("Ashdod Towers")).toBeInTheDocument();
      expect(within(projectsSection).getByText("Haifa Port")).toBeInTheDocument();
      expect(within(projectsSection).queryByText("Jerusalem Mall")).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Only active (2)" }));

    await waitFor(() => {
      expect(within(projectsSection).getByText("Ashdod Towers")).toBeInTheDocument();
      expect(within(projectsSection).getByText("Haifa Port")).toBeInTheDocument();
      expect(within(projectsSection).queryByText("Jerusalem Mall")).not.toBeInTheDocument();
    });
  });

  it("syncs workspace quick filter to URL query params", async () => {
    const base = new Date();
    base.setHours(12, 0, 0, 0);
    const iso = (hoursShift: number) =>
      new Date(base.getTime() + hoursShift * 60 * 60 * 1000).toISOString();

    apiFetchMock.mockImplementation(async (path: string) => {
      if (path === "/api/v1/installer/projects") {
        return {
          items: [
            {
              id: "project-1",
              name: "Ashdod Towers",
              address: "Harbor 11",
              status: "IN_PROGRESS",
              waze_url: null,
            },
            {
              id: "project-2",
              name: "Haifa Port",
              address: "Dock 7",
              status: "PROBLEM",
              waze_url: null,
            },
          ],
        };
      }
      if (String(path).includes("/api/v1/installer/calendar/events?")) {
        return {
          items: [
            {
              id: "event-1",
              title: "Morning visit",
              starts_at: iso(1),
              ends_at: iso(2),
              event_type: "INSTALLATION",
              project_id: "project-1",
            },
          ],
        };
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    window.history.replaceState({}, "", "/installer?project_filter=problem");

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <InstallerWorkspacePage />
      </QueryClientProvider>
    );

    const projectsSection = screen.getByLabelText("My projects list");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Only problem (1)" })).toHaveAttribute(
        "aria-pressed",
        "true"
      );
      expect(within(projectsSection).getByText("Haifa Port")).toBeInTheDocument();
      expect(within(projectsSection).queryByText("Ashdod Towers")).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Only active (2)" }));

    await waitFor(() => {
      expect(window.location.search).toContain("project_filter=active");
    });

    fireEvent.click(screen.getByRole("button", { name: "All (2)" }));

    await waitFor(() => {
      expect(window.location.search).toBe("");
    });
  });
});
