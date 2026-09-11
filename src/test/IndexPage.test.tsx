import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import Index from "@/views/Index";
import { LanguageProvider } from "@/lib/i18n";

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}));
const { pushMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
}));

const storageState = new Map<string, string>();
const storageMock = {
  getItem: (key: string) => storageState.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storageState.set(key, value);
  },
  removeItem: (key: string) => {
    storageState.delete(key);
  },
  clear: () => {
    storageState.clear();
  },
};

vi.mock("@/components/DashboardLayout", () => ({
  DashboardLayout: ({ children }: { children: ReactNode }) => (
    <div data-testid="dashboard-layout">{children}</div>
  ),
}));

vi.mock("@/lib/api", () => ({
  apiFetch: apiFetchMock,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

function renderSubject() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const result = render(
    <LanguageProvider>
      <QueryClientProvider client={queryClient}>
        <Index />
      </QueryClientProvider>
    </LanguageProvider>,
  );
  return { ...result, queryClient };
}

function emptyDashboardResponse(path: string) {
  if (path.includes("reports/dashboard?")) return {
    kpi: { installed_doors: 0, not_installed_doors: 0, payroll_total: "0", revenue_total: "0", profit_total: "0" },
    limits: { projects: { current: 0 } },
  };
  if (path.includes("dispatcher-board?")) return {
    summary: { projects_needing_dispatch: 0, unassigned_doors: 0, open_issues: 0, available_installers: 0, busy_installers: 0 },
    projects: [], installers: [],
  };
  return { items: [] };
}

describe("Index dashboard", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    apiFetchMock.mockReset();
    pushMock.mockReset();
    storageState.clear();
    Object.defineProperty(window, "localStorage", {
      value: storageMock,
      configurable: true,
    });
    document.documentElement.lang = "en";
    document.documentElement.dir = "ltr";
  });

  it("does not present missing data as zero or all clear while loading", () => {
    apiFetchMock.mockImplementation(() => new Promise(() => {}));
    renderSubject();
    expect(screen.getAllByRole("status")).toHaveLength(3);
    for (const tile of screen.getAllByTestId("dashboard-kpi")) {
      expect(tile).toHaveAttribute("aria-busy", "true");
      expect(within(tile).queryByText("0")).not.toBeInTheDocument();
    }
    expect(screen.queryByText("All clear")).not.toBeInTheDocument();
    expect(screen.queryByText("No upcoming events.")).not.toBeInTheDocument();
  });

  it("offers retry after failures and distinguishes successful empty responses", async () => {
    apiFetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    renderSubject();
    expect(await screen.findAllByRole("alert")).toHaveLength(3);
    expect(screen.queryByText("All clear")).not.toBeInTheDocument();
    expect(screen.queryByText("No upcoming events.")).not.toBeInTheDocument();
    apiFetchMock.mockImplementation(async (path: string) => emptyDashboardResponse(path));
    for (const button of screen.getAllByRole("button", { name: "Try again" })) fireEvent.click(button);
    expect(await screen.findByText("All clear")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryAllByRole("alert")).toHaveLength(0));
    expect(screen.getAllByTestId("dashboard-kpi")[0]).toHaveTextContent("0");
  });

  it("keeps loaded values with a stale warning when refresh fails", async () => {
    apiFetchMock.mockImplementation(async (path: string) => emptyDashboardResponse(path));
    const { queryClient } = renderSubject();
    await screen.findByText("All clear");
    apiFetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    await act(async () => { await queryClient.refetchQueries(); });
    expect(await screen.findAllByText(/Showing the last loaded data/)).toHaveLength(3);
    expect(screen.getByText("All clear")).toBeInTheDocument();
  });

  it.each(["refetch", "remount"])("advances report and calendar windows on %s", async (mode) => {
    const openedAt = new Date();
    const completedAt = new Date(openedAt.getTime() + 60_000);
    const refreshedAt = new Date(openedAt.getTime() + 120_000);
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(openedAt);
    apiFetchMock.mockImplementation(async (path: string) => {
      const response = emptyDashboardResponse(path);
      if ("kpi" in response && response.kpi) {
        const end = new URL(path, "http://localhost").searchParams.get("date_to")!;
        if (new Date(end) > completedAt) {
          response.kpi.installed_doors = 3;
          response.kpi.payroll_total = "750.00";
        }
      }
      return response;
    });
    let subject = renderSubject();
    await screen.findByText("All clear");
    expect(screen.getAllByTestId("dashboard-kpi")[1]).toHaveTextContent("0");

    vi.setSystemTime(refreshedAt);
    apiFetchMock.mockClear();
    if (mode === "remount") {
      subject.unmount();
      subject.queryClient.clear();
      subject = renderSubject();
      await screen.findByText("All clear");
    } else {
      await act(async () => { await subject.queryClient.refetchQueries(); });
    }

    const paths = apiFetchMock.mock.calls.map(([path]) => String(path));
    const reports = new URL(paths.find((path) => path.includes("reports/dashboard?"))!, "http://localhost");
    const calendar = new URL(paths.find((path) => path.includes("calendar/events?"))!, "http://localhost");
    expect(reports.searchParams.get("date_to")).toBe(refreshedAt.toISOString());
    expect(reports.searchParams.get("date_from")).toBe(new Date(refreshedAt.getTime() - 7 * 86_400_000).toISOString());
    expect(calendar.searchParams.get("starts_at")).toBe(refreshedAt.toISOString());
    expect(calendar.searchParams.get("ends_at")).toBe(new Date(refreshedAt.getTime() + 7 * 86_400_000).toISOString());
    await waitFor(() => expect(screen.getAllByTestId("dashboard-kpi")[1]).toHaveTextContent("3"));
    expect(screen.getByText("Payroll: 750.00 NIS")).toBeInTheDocument();
    expect(subject.queryClient.getQueryCache().getAll()).toHaveLength(3);
  });

  it("renders DIMAX dashboard v2.4 shell with live business sections", async () => {
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path.includes("/api/v1/admin/reports/dashboard?")) {
        return {
          kpi: {
            period_from: "2026-07-01T00:00:00Z",
            period_to: "2026-07-06T12:00:00Z",
            installed_doors: 12,
            not_installed_doors: 8,
            payroll_total: "25000.00",
            revenue_total: "84000.00",
            profit_total: "59000.00",
            problem_projects: 2,
            missing_rates_installed_doors: 1,
            missing_addon_plans_done: 0,
          },
          sync_health: {
            counts: {
              ok: 4,
              warn: 1,
              danger: 1,
              total: 6,
            },
          },
          limits: {
            projects: {
              current: 7,
              utilization_pct: 58,
            },
          },
        };
      }
      if (path.includes("/api/v1/admin/reports/problem-projects?")) {
        return {
          items: [
            {
              project_id: "project-1",
              name: "Ashdod Towers",
              address: "Ashdod, Tower A",
              not_installed_doors: 8,
            },
          ],
        };
      }
      if (path.includes("/api/v1/admin/reports/dispatcher-board?")) {
        return {
          generated_at: "2026-07-06T12:10:00Z",
          summary: {
            total_projects: 7,
            total_doors: 20,
            installed_doors: 12,
            pending_doors: 8,
            projects_needing_dispatch: 2,
            open_issues: 3,
            blocked_issues: 1,
            unassigned_doors: 4,
            available_installers: 2,
            busy_installers: 1,
            scheduled_visits_7d: 3,
          },
          projects: [
            {
              project_id: "project-1",
              project_name: "Ashdod Towers",
              address: "Ashdod, Tower A",
              project_status: "ACTIVE",
              dispatch_status: "NEEDS_ASSIGNMENT",
              contact_name: "Eyal Cohen",
              total_doors: 20,
              installed_doors: 12,
              pending_doors: 8,
              assigned_open_doors: 4,
              unassigned_doors: 4,
              open_issues: 3,
              blocked_issues: 1,
              completion_pct: 60,
              next_visit_at: "2026-07-07T08:00:00Z",
              next_visit_title: "Door installation",
              recommended_installers: [],
            },
          ],
          installers: [
            {
              installer_id: "installer-1",
              installer_name: "Installer One",
              status: "ACTIVE",
              availability_band: "AVAILABLE",
              is_active: true,
              phone: "+972500000001",
              email: null,
              active_projects: 1,
              assigned_open_doors: 4,
              open_issues: 0,
              next_event_at: null,
              next_event_title: null,
            },
          ],
        };
      }
      if (path.includes("/api/v1/admin/reports/top-reasons?")) {
        return {
          items: [
            {
              reason_id: "reason-1",
              reason_name: "Missing installer assignment",
              count: 3,
            },
          ],
        };
      }
      if (path.includes("/api/v1/admin/calendar/events?")) {
        return {
          items: [
            {
              id: "event-1",
              title: "Door installation",
              starts_at: "2026-07-07T08:00:00Z",
              ends_at: "2026-07-07T10:00:00Z",
              event_type: "INSTALLATION",
            },
          ],
        };
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    renderSubject();

    expect(await screen.findByTestId("admin-dashboard-v24")).toBeInTheDocument();

    await waitFor(() => {
      expect(
        apiFetchMock.mock.calls.some((call) =>
          String(call[0]).includes("/api/v1/admin/reports/dashboard?"),
        ),
      ).toBe(true);
    });

    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getAllByText("Available installers").length).toBeGreaterThan(0);
    expect(screen.getByText("Installed in 7 days")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /issues \(3\)/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /new project/i }));
    expect(pushMock).toHaveBeenCalledWith("/projects?create=1");
    expect(screen.getAllByText("Ashdod Towers").length).toBeGreaterThan(0);
    expect(screen.getByTestId("dispatcher-board")).toBeInTheDocument();
    expect(screen.getByText("Door installation")).toBeInTheDocument();
  });
});
