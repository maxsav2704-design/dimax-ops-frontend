import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import InstallerSchedulePage from "@/views/installer/SchedulePage";

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  apiFetch: apiFetchMock,
}));

describe("InstallerSchedulePage", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    window.history.pushState({}, "", "/installer/calendar");
  });

  it("renders installer calendar events", async () => {
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path.includes("/api/v1/installer/calendar/events?")) {
        return {
          items: [
            {
              id: "event-1",
              title: "Site visit",
              event_type: "installation",
              starts_at: "2026-03-08T08:00:00Z",
              ends_at: "2026-03-08T09:00:00Z",
              location: "Ashdod Tower A",
              waze_url: null,
              description: "Install doors on floor 2",
              project_id: "project-1",
              installer_ids: ["installer-1"],
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
        <InstallerSchedulePage />
      </QueryClientProvider>
    );

    expect(await screen.findByText("My Schedule")).toBeInTheDocument();
    expect(await screen.findByText("Site visit")).toBeInTheDocument();
    expect(screen.getByText("Project project-1")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Priority doors" })).toHaveAttribute(
      "href",
      "/installer/projects/project-1#project-doors"
    );
    expect(screen.getByRole("link", { name: "Open issues" })).toHaveAttribute(
      "href",
      "/installer/projects/project-1?door_filter=WITH_ISSUES#project-open-issues"
    );
    expect(await screen.findByRole("link", { name: "Open project" })).toBeInTheDocument();
  });

  it("applies project query filter and event-type filter", async () => {
    window.history.pushState({}, "", "/installer/calendar?project_id=project-2");
    const now = Date.now();
    const installStart = new Date(now + 60 * 60 * 1000).toISOString();
    const installEnd = new Date(now + 2 * 60 * 60 * 1000).toISOString();
    const deliveryStart = new Date(now + 3 * 60 * 60 * 1000).toISOString();
    const deliveryEnd = new Date(now + 4 * 60 * 60 * 1000).toISOString();

    apiFetchMock.mockImplementation(async (path: string) => {
      if (path.includes("/api/v1/installer/calendar/events?")) {
        return {
          items: [
            {
              id: "event-1",
              title: "Install Project 1",
              event_type: "installation",
              starts_at: installStart,
              ends_at: installEnd,
              location: null,
              waze_url: null,
              description: null,
              project_id: "project-1",
              installer_ids: ["installer-1"],
            },
            {
              id: "event-2",
              title: "Delivery Project 2",
              event_type: "delivery",
              starts_at: deliveryStart,
              ends_at: deliveryEnd,
              location: null,
              waze_url: null,
              description: null,
              project_id: "project-2",
              installer_ids: ["installer-1"],
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
        <InstallerSchedulePage />
      </QueryClientProvider>
    );

    expect(await screen.findByText("Delivery Project 2")).toBeInTheDocument();
    expect(screen.queryByText("Install Project 1")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Overdue only" }));
    expect(await screen.findByText("No events match current filters.")).toBeInTheDocument();
  });

  it("switches schedule range using quick actions", async () => {
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path.includes("/api/v1/installer/calendar/events?")) {
        const url = new URL(`http://local${path}`);
        const startsAt = new Date(url.searchParams.get("starts_at") || "");
        const endsAt = new Date(url.searchParams.get("ends_at") || "");
        const diffHours = (endsAt.getTime() - startsAt.getTime()) / (60 * 60 * 1000);

        if (diffHours <= 24.5) {
          return {
            items: [
              {
                id: "event-today",
                title: "Today window event",
                event_type: "installation",
                starts_at: "2026-03-08T08:00:00Z",
                ends_at: "2026-03-08T09:00:00Z",
                location: null,
                waze_url: null,
                description: null,
                project_id: null,
                installer_ids: ["installer-1"],
              },
            ],
          };
        }

        if (diffHours <= 168.5) {
          return {
            items: [
              {
                id: "event-week",
                title: "Week window event",
                event_type: "delivery",
                starts_at: "2026-03-08T10:00:00Z",
                ends_at: "2026-03-08T11:00:00Z",
                location: null,
                waze_url: null,
                description: null,
                project_id: null,
                installer_ids: ["installer-1"],
              },
            ],
          };
        }

        return {
          items: [
            {
              id: "event-month",
              title: "Month window event",
              event_type: "meeting",
              starts_at: "2026-03-10T10:00:00Z",
              ends_at: "2026-03-10T11:00:00Z",
              location: null,
              waze_url: null,
              description: null,
              project_id: null,
              installer_ids: ["installer-1"],
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
        <InstallerSchedulePage />
      </QueryClientProvider>
    );

    expect(await screen.findByText("Week window event")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Today" }));
    expect(await screen.findByText("Today window event")).toBeInTheDocument();
    expect(screen.queryByText("Week window event")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next 30 days" }));
    expect(await screen.findByText("Month window event")).toBeInTheDocument();
    expect(screen.queryByText("Today window event")).not.toBeInTheDocument();
  });

  it("applies overdue and no-project query filters on load", async () => {
    window.history.pushState({}, "", "/installer/calendar?preset=7d&overdue=1&project_id=none");

    apiFetchMock.mockImplementation(async (path: string) => {
      if (path.includes("/api/v1/installer/calendar/events?")) {
        return {
          items: [
            {
              id: "event-1",
              title: "Overdue no-project",
              event_type: "installation",
              starts_at: "2026-03-07T08:00:00Z",
              ends_at: "2026-03-07T09:00:00Z",
              location: null,
              waze_url: null,
              description: null,
              project_id: null,
              installer_ids: ["installer-1"],
            },
            {
              id: "event-2",
              title: "Future no-project",
              event_type: "installation",
              starts_at: "2099-03-08T10:00:00Z",
              ends_at: "2099-03-08T11:00:00Z",
              location: null,
              waze_url: null,
              description: null,
              project_id: null,
              installer_ids: ["installer-1"],
            },
            {
              id: "event-3",
              title: "Overdue with project",
              event_type: "installation",
              starts_at: "2026-03-07T08:00:00Z",
              ends_at: "2026-03-07T09:00:00Z",
              location: null,
              waze_url: null,
              description: null,
              project_id: "project-1",
              installer_ids: ["installer-1"],
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
        <InstallerSchedulePage />
      </QueryClientProvider>
    );

    expect(await screen.findByText("Overdue no-project")).toBeInTheDocument();
    expect(screen.getAllByText("No project").length).toBeGreaterThan(0);
    expect(screen.queryByText("Future no-project")).not.toBeInTheDocument();
    expect(screen.queryByText("Overdue with project")).not.toBeInTheDocument();
  });

  it("applies event type query filter on load", async () => {
    window.history.pushState({}, "", "/installer/calendar?event_type=delivery");

    apiFetchMock.mockImplementation(async (path: string) => {
      if (path.includes("/api/v1/installer/calendar/events?")) {
        return {
          items: [
            {
              id: "event-1",
              title: "Installation event",
              event_type: "installation",
              starts_at: "2026-03-08T08:00:00Z",
              ends_at: "2026-03-08T09:00:00Z",
              location: null,
              waze_url: null,
              description: null,
              project_id: "project-1",
              installer_ids: ["installer-1"],
            },
            {
              id: "event-2",
              title: "Delivery event",
              event_type: "delivery",
              starts_at: "2026-03-08T10:00:00Z",
              ends_at: "2026-03-08T11:00:00Z",
              location: null,
              waze_url: null,
              description: null,
              project_id: "project-2",
              installer_ids: ["installer-1"],
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
        <InstallerSchedulePage />
      </QueryClientProvider>
    );

    expect(await screen.findByText("Delivery event")).toBeInTheDocument();
    expect(screen.queryByText("Installation event")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Event type")).toHaveValue("delivery");
  });

  it("keeps unknown event type query value stable in URL", async () => {
    window.history.pushState({}, "", "/installer/calendar?event_type=delivery");

    apiFetchMock.mockImplementation(async (path: string) => {
      if (path.includes("/api/v1/installer/calendar/events?")) {
        return {
          items: [
            {
              id: "event-1",
              title: "Installation event",
              event_type: "installation",
              starts_at: "2026-03-08T08:00:00Z",
              ends_at: "2026-03-08T09:00:00Z",
              location: null,
              waze_url: null,
              description: null,
              project_id: "project-1",
              installer_ids: ["installer-1"],
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
        <InstallerSchedulePage />
      </QueryClientProvider>
    );

    expect(await screen.findByText("No events match current filters.")).toBeInTheDocument();
    expect(screen.getByLabelText("Event type")).toHaveValue("delivery");
    expect(window.location.search).toContain("event_type=delivery");
    expect(window.location.search).not.toContain("event_type=&");
    expect(window.location.search).not.toBe("?event_type=");
  });

  it("syncs current filters to URL query params", async () => {
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path.includes("/api/v1/installer/calendar/events?")) {
        return {
          items: [
            {
              id: "event-1",
              title: "Delivery Project 2",
              event_type: "delivery",
              starts_at: "2026-03-08T10:00:00Z",
              ends_at: "2026-03-08T11:00:00Z",
              location: null,
              waze_url: null,
              description: null,
              project_id: "project-2",
              installer_ids: ["installer-1"],
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
        <InstallerSchedulePage />
      </QueryClientProvider>
    );

    expect(await screen.findByText("Delivery Project 2")).toBeInTheDocument();
    expect(window.location.search).toBe("");

    fireEvent.change(screen.getByLabelText("Event type"), {
      target: { value: "delivery" },
    });
    expect(window.location.search).toContain("event_type=delivery");

    fireEvent.click(screen.getByRole("button", { name: "Today" }));
    expect(window.location.search).toContain("preset=today");

    fireEvent.click(screen.getByRole("button", { name: "Overdue only" }));
    expect(window.location.search).toContain("overdue=1");

    fireEvent.change(screen.getByLabelText("Project"), {
      target: { value: "NONE" },
    });
    expect(window.location.search).toContain("project_id=none");

    fireEvent.click(screen.getByRole("button", { name: "Reset filters" }));
    expect(window.location.search).toBe("");
    expect(screen.getByLabelText("Range")).toHaveValue("7d");
    expect(screen.getByLabelText("Event type")).toHaveValue("ALL");
    expect(screen.getByLabelText("Project")).toHaveValue("ALL");
    expect(screen.getByRole("button", { name: "Overdue only" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("disables csv export for empty filtered results and restores with reset", async () => {
    window.history.pushState({}, "", "/installer/calendar?overdue=1");

    apiFetchMock.mockImplementation(async (path: string) => {
      if (path.includes("/api/v1/installer/calendar/events?")) {
        return {
          items: [
            {
              id: "event-1",
              title: "Delivery Project 2",
              event_type: "delivery",
              starts_at: "2026-03-08T10:00:00Z",
              ends_at: "2026-03-08T11:00:00Z",
              location: null,
              waze_url: null,
              description: null,
              project_id: "project-2",
              installer_ids: ["installer-1"],
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
        <InstallerSchedulePage />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Export CSV" })).toBeDisabled();
    });

    fireEvent.click(screen.getAllByRole("button", { name: "Reset filters" }).at(-1)!);

    await waitFor(() => {
      expect(screen.getByText("Delivery Project 2")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Export CSV" })).not.toBeDisabled();
    });
  });

  it("shows retry action when schedule query fails", async () => {
    let shouldFail = true;

    apiFetchMock.mockImplementation(async (path: string) => {
      if (path.includes("/api/v1/installer/calendar/events?")) {
        if (shouldFail) {
          throw new Error("schedule down");
        }
        return { items: [] };
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <InstallerSchedulePage />
      </QueryClientProvider>
    );

    expect(await screen.findByText("Failed to load installer schedule.")).toBeInTheDocument();

    shouldFail = false;
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("No events in selected range.")).toBeInTheDocument();
  });
});
