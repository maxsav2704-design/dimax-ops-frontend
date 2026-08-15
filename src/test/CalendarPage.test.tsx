import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import CalendarPage from "@/views/CalendarPage";

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
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

describe("CalendarPage", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    authSessionMock.mockReset();
    authSessionMock.mockReturnValue({ role: "ADMIN", admin_scope: "OWNER", can_view_rates: true });
  });

  it("renders calendar v2 installer lanes and event detail drawer", async () => {
    const now = new Date();
    const dow = now.getDay();
    const mondayOffset = dow === 0 ? -6 : 1 - dow;
    const eventStart = new Date(now);
    eventStart.setDate(now.getDate() + mondayOffset);
    eventStart.setHours(9, 0, 0, 0);
    const eventEnd = new Date(eventStart);
    eventEnd.setHours(11, 0, 0, 0);

    apiFetchMock.mockImplementation(async (path: string) => {
      const url = String(path);

      if (url.includes("/api/v1/admin/calendar/events?")) {
        return {
          items: [
            {
              id: "event-1",
              title: "Install Tower A",
              event_type: "installation",
              starts_at: eventStart.toISOString(),
              ends_at: eventEnd.toISOString(),
              location: "Ashdod Site",
              waze_url: null,
              description: null,
              project_id: "project-1",
              installer_ids: ["installer-1"],
            },
          ],
        };
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
      if (url === "/api/v1/admin/projects/project-1") {
        return {
          id: "project-1",
          name: "Project A",
          address: "Address A",
          status: "ACTIVE",
          developer_company: "DIMAX Dev Co",
          contact_name: "Eyal Cohen",
          contact_phone: "+972 54 111 2233",
          developer_whatsapp: "+972 54 111 2233",
        };
      }
      if (url.includes("/api/v1/admin/reports/project-plan-fact/project-1")) {
        return {
          total_doors: 10,
          installed_doors: 4,
          not_installed_doors: 6,
          completion_pct: 40,
          actual_payroll_total: "320.00",
        };
      }
      if (url === "/api/v1/admin/projects") {
        return {
          items: [
            {
              id: "project-1",
              name: "Project A",
              address: "Address A",
              status: "ACTIVE",
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
        <CalendarPage />
      </QueryClientProvider>
    );

    expect(await screen.findByTestId("calendar-v27")).toBeInTheDocument();
    expect(await screen.findByText("Operational planning")).toBeInTheDocument();
    expect((await screen.findAllByText("Installer Alpha")).length).toBeGreaterThanOrEqual(2);
    expect(await screen.findByText("1 event · busy 1 day")).toBeInTheDocument();
    expect(await screen.findAllByText("Install Tower A")).toHaveLength(2);
    expect(await screen.findByText("DIMAX Dev Co")).toBeInTheDocument();
    expect(await screen.findByText("4 / 10")).toBeInTheDocument();
    expect(screen.getByText("Waze")).toBeInTheDocument();
    expect(screen.getByText("WhatsApp")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open Installer Alpha schedule row" }));
    const laneFrame = await screen.findByTestId("calendar-lane-info-frame");
    expect(laneFrame).toBeInTheDocument();
    expect(laneFrame).toHaveTextContent("Busy days");
    expect(screen.getByRole("link", { name: /Open installer/ })).toHaveAttribute(
      "href",
      "/installers?installer_id=installer-1",
    );
    fireEvent.click(screen.getByRole("button", { name: "Edit next event" }));
    expect(await screen.findByText("Edit Event")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    fireEvent.click(screen.getByRole("button", { name: "Read schedule" }));
    expect(await screen.findByTestId("calendar-event-info-frame")).toBeInTheDocument();

    fireEvent.click((await screen.findAllByText("Install Tower A"))[0]);
    expect(await screen.findByTestId("calendar-event-info-frame")).toBeInTheDocument();
    expect(screen.getAllByText("Open project").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByLabelText("Close event info"));
    await waitFor(() => {
      expect(screen.queryByTestId("calendar-event-info-frame")).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Day" }));
    expect(screen.getByRole("button", { name: "Day" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Month" }));
    expect(screen.getByRole("button", { name: "Month" })).toHaveAttribute("aria-pressed", "true");
  }, 20000);

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

    expect(await screen.findByText("Event created.")).toBeInTheDocument();
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
  }, 15000);

  it("keeps viewer calendar actions read-only", async () => {
    authSessionMock.mockReturnValue({ role: "ADMIN", admin_scope: "VIEWER", can_view_rates: false, can_manage_imports: true, can_manage_users: true });
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

    expect(await screen.findByText("Your access level has read-only access to calendar planning.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Event" })).toBeDisabled();
    expect(screen.getAllByRole("button").find((button) => button.getAttribute("title") === "Your access level is read-only in calendar")).toBeTruthy();
  });
});
