import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import CalendarPage from "@/views/CalendarPage";

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
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

describe("CalendarPage", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    userRoleMock.mockReset();
    userRoleMock.mockReturnValue("ADMIN");
  });

  it("creates calendar event from admin page", async () => {
    apiFetchMock.mockImplementation(async (path: string, init?: RequestInit) => {
      const url = String(path);

      if (url.includes("/api/v1/admin/calendar/events?")) {
        return { items: [] };
      }
      if (url.includes("/api/v1/admin/installers?limit=200")) {
        return [
          {
            id: "installer-1",
            full_name: "Installer Alpha",
            is_active: true,
          },
        ];
      }
      if (url === "/api/v1/admin/projects") {
        return {
          items: [
            {
              id: "project-1",
              name: "Project A",
              address: "Address A",
              status: "NEW",
            },
          ],
        };
      }
      if (url === "/api/v1/admin/calendar/events" && init?.method === "POST") {
        return { id: "event-1" };
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
        <CalendarPage />
      </QueryClientProvider>
    );

    expect(await screen.findByText("Add Event")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add Event" }));

    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Install Tower A" },
    });
    fireEvent.change(screen.getByLabelText("Location"), {
      target: { value: "Ashdod Site" },
    });
    fireEvent.change(screen.getByLabelText("Project"), {
      target: { value: "project-1" },
    });
    fireEvent.click(screen.getByLabelText("Installer Alpha"));

    fireEvent.click(screen.getByRole("button", { name: "Create Event" }));

    await waitFor(() => {
      const createCall = apiFetchMock.mock.calls.find(
        (call) => call[0] === "/api/v1/admin/calendar/events" && call[1]?.method === "POST"
      );
      expect(createCall).toBeTruthy();
      const payload = createCall?.[1]?.body ? JSON.parse(String(createCall[1].body)) : {};
      expect(payload.title).toBe("Install Tower A");
      expect(payload.location).toBe("Ashdod Site");
      expect(payload.project_id).toBe("project-1");
      expect(payload.installer_ids).toEqual(["installer-1"]);
    });
  }, 20000);

  it("blocks invalid event time range locally", async () => {
    apiFetchMock.mockImplementation(async (path: string) => {
      const url = String(path);
      if (url.includes("/api/v1/admin/calendar/events?")) {
        return { items: [] };
      }
      if (url.includes("/api/v1/admin/installers?limit=200")) {
        return [];
      }
      if (url === "/api/v1/admin/projects") {
        return { items: [] };
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
        <CalendarPage />
      </QueryClientProvider>
    );

    expect(await screen.findByText("Add Event")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add Event" }));
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Broken Event" },
    });
    fireEvent.change(screen.getByLabelText("Start"), {
      target: { value: "16:00" },
    });
    fireEvent.change(screen.getByLabelText("End"), {
      target: { value: "15:00" },
    });

    expect(screen.getByText("End time must be later than start time.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Event" })).toBeDisabled();
  });

  it("disables privileged calendar actions for installer role", async () => {
    userRoleMock.mockReturnValue("INSTALLER");
    apiFetchMock.mockImplementation(async (path: string) => {
      const url = String(path);
      if (url.includes("/api/v1/admin/calendar/events?")) {
        return {
          items: [
            {
              id: "event-1",
              title: "Delivery Window",
              event_type: "delivery",
              starts_at: "2026-02-24T09:00:00Z",
              ends_at: "2026-02-24T10:00:00Z",
              location: "Site A",
              waze_url: null,
              description: null,
              project_id: null,
              installer_ids: [],
            },
          ],
        };
      }
      if (url.includes("/api/v1/admin/installers?limit=200")) {
        return [];
      }
      if (url === "/api/v1/admin/projects") {
        return { items: [] };
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
        <CalendarPage />
      </QueryClientProvider>
    );

    expect(await screen.findByText("Installer role has read-only access to calendar planning.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Event" })).toBeDisabled();
    expect(screen.getAllByRole("button").find((button) => button.getAttribute("title") === "Installer role is read-only in calendar")).toBeTruthy();
  });
});
