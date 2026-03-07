import { render, screen } from "@testing-library/react";
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

    expect(await screen.findByText("Ashdod Towers")).toBeInTheDocument();
    expect(await screen.findByText("Morning visit")).toBeInTheDocument();
    expect(screen.getByText("Assigned projects")).toBeInTheDocument();

    const scheduleLink = screen.getByRole("link", { name: "Open schedule" });
    expect(scheduleLink).toHaveAttribute("href", "/installer/calendar?project_id=project-1");

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
  });
});
