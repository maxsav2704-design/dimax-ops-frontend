import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

  function mockEditableEvent() {
    const start = new Date();
    start.setHours(9, 0, 0, 0);
    const end = new Date(start);
    end.setHours(10);
    let items = [{
      id: "event-edit", title: "Site inspection", event_type: "inspection",
      starts_at: start.toISOString(), ends_at: end.toISOString(),
      location: null, waze_url: null, description: null, project_id: null,
      installer_ids: [],
    }];
    apiFetchMock.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === "/api/v1/admin/calendar/events/event-edit") {
        if (init?.method === "PATCH") {
          items = [{ ...items[0], ...JSON.parse(String(init.body)) }];
          return { ok: true };
        }
        if (init?.method === "DELETE") {
          items = [];
          return { ok: true };
        }
      }
      if (path.includes("/calendar/events?")) return { items };
      if (path.includes("/installers?")) return [];
      return { items: [] };
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={queryClient}><CalendarPage /></QueryClientProvider>);
    return queryClient;
  }

  async function openEventEditor() {
    fireEvent.click(await screen.findByRole("button", { name: "Site inspection, 09:00 - 10:00" }, { timeout: 5000 }));
    const frame = await screen.findByTestId("calendar-event-info-frame");
    fireEvent.click(within(frame).getByRole("button", { name: "Edit" }));
    return screen.getByRole("dialog", { name: "Edit Event" });
  }

  it("regression: refreshes the open event panel after saving without another card click", async () => {
    const queryClient = mockEditableEvent();
    const dialog = await openEventEditor();
    fireEvent.change(within(dialog).getByLabelText("Title"), { target: { value: "Updated inspection" } });
    fireEvent.change(within(dialog).getByLabelText("Start"), { target: { value: "11:00" } });
    fireEvent.change(within(dialog).getByLabelText("End"), { target: { value: "12:30" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save Changes" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await screen.findByRole("button", { name: "Updated inspection, 11:00 - 12:30" });
    const frame = screen.getByTestId("calendar-event-info-frame");
    await waitFor(() => {
      expect(frame).toHaveTextContent("Updated inspection");
      expect(frame).toHaveTextContent("11:00 - 12:30");
      expect(frame).not.toHaveTextContent("09:00 - 10:00");
    });
    fireEvent.click(within(frame).getByRole("button", { name: "Edit" }));
    expect(within(screen.getByRole("dialog")).getByLabelText("Title")).toHaveValue("Updated inspection");
    queryClient.clear();
  });

  it("regression: keeps a failed deletion editable and closes both panels after a successful retry", async () => {
    const queryClient = mockEditableEvent();
    const dialog = await openEventEditor();
    const remove = within(dialog).getByRole("button", { name: "Delete" });
    apiFetchMock.mockRejectedValueOnce(new Error("Deletion failed"));
    fireEvent.click(remove);
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Deletion failed");
    expect(dialog).toBeInTheDocument();
    fireEvent.click(remove);
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.queryByTestId("calendar-event-info-frame")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Site inspection, 09:00 - 10:00" })).not.toBeInTheDocument();
    });
    expect(apiFetchMock.mock.calls.filter(([, init]) => init?.method === "DELETE")).toHaveLength(2);
    queryClient.clear();
  });

  it("button audit: keeps the event editor scrollable and its errors inside the dialog", async () => {
    apiFetchMock.mockImplementation(async (path: string, init?: RequestInit) => {
      if (init?.method === "POST") throw new TypeError("Failed to fetch");
      if (path.includes("/installers?")) return [];
      return { items: [] };
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={queryClient}><CalendarPage /></QueryClientProvider>);
    fireEvent.click(await screen.findByRole("button", { name: "Add Event" }));
    const dialog = screen.getByRole("dialog", { name: "Create Event" });
    expect(dialog).toHaveClass("overflow-y-auto");
    expect(dialog.className).toContain("max-h-");
    fireEvent.change(within(dialog).getByLabelText("Title"), { target: { value: "QA event" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create Event" }));
    expect(await within(dialog).findByRole("alert")).not.toBeEmptyDOMElement();
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add Event" }));
    expect(within(screen.getByRole("dialog")).queryByRole("alert")).not.toBeInTheDocument();
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    queryClient.clear();
  });

  it("button audit: preserves the selected day when switching calendar views", async () => {
    apiFetchMock.mockImplementation(async (path: string) =>
      path.includes("/installers?") ? [] : { items: [] });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={queryClient}><CalendarPage /></QueryClientProvider>);
    fireEvent.click(await screen.findByRole("button", { name: "Today" }));
    fireEvent.click(screen.getByRole("button", { name: "Month" }));
    const now = new Date();
    const selected = new Date(now.getFullYear(), now.getMonth(), 15);
    const label = new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(selected);
    fireEvent.click(screen.getByRole("button", { name: `Open day: ${label}` }));
    for (const name of ["Month", "Week", "Day"]) {
      fireEvent.click(screen.getByRole("button", { name }));
    }
    fireEvent.click(screen.getByRole("button", { name: "Add Event" }));
    const date = `${selected.getFullYear()}-${String(selected.getMonth() + 1).padStart(2, "0")}-15`;
    expect(screen.getByLabelText("Date")).toHaveValue(date);
    expect(apiFetchMock.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
    queryClient.clear();
  });

  it("renders the premium time grid and keeps schedule interactions working", async () => {
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
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
    expect(screen.getByText("My Schedule")).toBeInTheDocument();
    const addEventButtons = screen.getAllByRole("button", { name: "Add Event" });
    expect(addEventButtons).toHaveLength(1);
    expect(addEventButtons[0].closest("aside")).toBeNull();
    expect(screen.getByText("Crews")).toBeInTheDocument();
    expect(await screen.findByText("Installer Alpha")).toBeInTheDocument();
    expect(await screen.findByText("1 event · busy 1 day")).toBeInTheDocument();
    const eventCard = await screen.findByRole("button", {
      name: "Install Tower A, 09:00 - 11:00",
    });
    expect(eventCard).toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "missing schedule" },
    });
    expect(screen.queryByRole("button", { name: "Install Tower A, 09:00 - 11:00" })).not.toBeInTheDocument();
    expect(await screen.findByText("No events match the selected filters.")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "" } });

    fireEvent.click(screen.getByRole("checkbox", { name: "Installation" }));
    expect(screen.queryByRole("button", { name: "Install Tower A, 09:00 - 11:00" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: "Installation" }));

    fireEvent.click(await screen.findByRole("button", {
      name: "Install Tower A, 09:00 - 11:00",
    }));
    expect(await screen.findByTestId("calendar-event-info-frame")).toBeInTheDocument();
    expect(await screen.findByText("DIMAX Dev Co")).toBeInTheDocument();
    expect(await screen.findByText("4 / 10")).toBeInTheDocument();
    expect(screen.getByText("Waze")).toBeInTheDocument();
    expect(screen.getByText("WhatsApp")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Close event info"));
    await waitFor(() => {
      expect(screen.queryByTestId("calendar-event-info-frame")).not.toBeInTheDocument();
    });

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

  it.each(["Show all events", "Open day"])("opens the exact month day via %s without losing events or filters", async (action) => {
    const today = new Date();
    const date = new Date(today.getFullYear(), today.getMonth(), 15);
    const events = Array.from({ length: 5 }, (_, index) => ({
      id: `event-${index}`, title: `Door installation ${index + 1}`, event_type: "installation",
      starts_at: new Date(date.getFullYear(), date.getMonth(), 15, 8 + index).toISOString(),
      ends_at: new Date(date.getFullYear(), date.getMonth(), 15, 9 + index).toISOString(),
      location: null, waze_url: null, description: null, project_id: null, installer_ids: [],
    }));
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path.includes("/calendar/events?")) return { items: events };
      if (path.includes("/installers?")) return [];
      return { items: [] };
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={queryClient}><CalendarPage /></QueryClientProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Today" }));
    fireEvent.click(screen.getByRole("button", { name: "Month" }));
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Door installation" } });
    const dateLabel = new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(date);
    await screen.findByRole("button", { name: `Show all events: ${dateLabel}` }, { timeout: 5000 });
    expect(screen.queryByRole("button", { name: /Door installation 5/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: `${action}: ${dateLabel}` }));
    expect(screen.getByRole("button", { name: "Day" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("searchbox")).toHaveValue("Door installation");
    await screen.findByRole("button", { name: "Door installation 5, 12:00 - 13:00" });
    const expectedEnd = new Date(date);
    expectedEnd.setDate(date.getDate() + 1);
    expect(apiFetchMock.mock.calls.some(([path]) => {
      if (!String(path).includes("/calendar/events?")) return false;
      const params = new URL(String(path), "http://localhost").searchParams;
      return params.get("starts_at") === date.toISOString() && params.get("ends_at") === expectedEnd.toISOString();
    })).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Door installation 5, 12:00 - 13:00" }));
    expect(await screen.findByTestId("calendar-event-info-frame")).toHaveTextContent("Door installation 5");
    expect(apiFetchMock.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
    queryClient.clear();
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
