import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import { createDownloadResponse } from "@/test/download-response";
import ReportsPage from "@/views/ReportsPage";

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}));
const { pushMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
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
  apiDownload: (path: string, init?: RequestInit) => fetch(path, init),
  apiBaseUrl: () => "",
  getAccessToken: () => null,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

vi.mock("@/hooks/use-auth-session", () => ({
  useAuthSession: authSessionMock,
}));

function mockReportWebhookSignals(url: string) {
  if (!url.includes("/api/v1/admin/outbox/webhook-signals")) {
    return null;
  }
  return {
    items: [
      {
        id: "webhook-1",
        provider: "sendgrid",
        event_type: "delivery_status",
        external_id: "evt-1",
        result: "duplicate",
        status: "delivered",
        error: null,
        outbox_id: "outbox-1",
        created_at: "2026-02-22T18:00:00Z",
      },
      {
        id: "webhook-2",
        provider: "twilio",
        event_type: "message_status",
        external_id: "evt-2",
        result: "channel_mismatch",
        status: "failed",
        error: "wrong channel",
        outbox_id: "outbox-2",
        created_at: "2026-02-22T18:02:00Z",
      },
    ],
  };
}

function mockReportRetryAudits(url: string) {
  if (!url.includes("/api/v1/admin/outbox/retry-audits")) {
    return null;
  }
  return {
    items: [
      {
        id: "audit-1",
        outbox_id: "outbox-1",
        actor_user_id: "admin-1",
        reason: "operations_center_bulk_retry",
        before_status: "FAILED",
        after_status: "PENDING",
        before_delivery_status: "FAILED",
        after_delivery_status: "PENDING",
        created_at: "2026-02-22T18:05:00Z",
      },
      {
        id: "audit-2",
        outbox_id: "outbox-9",
        actor_user_id: "admin-2",
        reason: "manual_retry",
        before_status: "FAILED",
        after_status: "PENDING",
        before_delivery_status: "FAILED",
        after_delivery_status: "PENDING",
        created_at: "2026-02-22T18:06:00Z",
      },
    ],
  };
}

function installerDetailFixture(id: string) {
  return {
    installer_id: id, installer_name: `Performer ${id}`, pricing_mode: "FACTORY",
    installed_doors: 0, active_projects: 1, order_numbers: 0, open_issues: 0,
    addons_done_qty: 1.5, addon_revenue_total: 30, addon_payroll_total: 13.5, addon_profit_total: 16.5,
    revenue_total: 30, payroll_total: 13.5, profit_total: 16.5,
    missing_rates_installed_doors: 0, missing_addon_plans_facts: 0, missing_client_prices: 0,
    unrecorded_completed_works: 0, last_installed_at: null,
    top_projects: [], order_breakdown: [], project_rows_total: 0, order_rows_total: 0,
  };
}

describe("ReportsPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    apiFetchMock.mockReset();
    pushMock.mockReset();
    authSessionMock.mockReset();
    authSessionMock.mockReturnValue({
      role: "ADMIN",
      admin_scope: "OWNER",
      can_view_rates: true,
    });
    if (typeof window !== "undefined" && window.localStorage) {
      if (typeof window.localStorage.clear === "function") {
        window.localStorage.clear();
      } else if (typeof window.localStorage.removeItem === "function") {
        window.localStorage.removeItem("dimax_reports_presets_v1");
      }
    }
    window.history.replaceState({}, "", "/reports");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([null, "123.45", "0.00"])("uses unique exposure without inventing a total: %s", async (exposure) => {
    const summary = { pricing_mode: "FACTORY", price_list_version: 3, exposure_doors: 2, exposure_profit_total: exposure,
      unpriced_exposure_doors: exposure == null ? 1 : 0, unpriced_open_issue_doors: 1,
      unpriced_blocked_issue_doors: 0, unpriced_delayed_doors: 1,
      open_issues: 1, blocked_open_issues: 0, not_installed_doors: 2,
      open_issue_revenue_at_risk: 500, open_issue_payroll_at_risk: null, open_issue_profit_at_risk: 200,
      blocked_issue_profit_at_risk: 0, delayed_revenue_total: 600, delayed_payroll_total: null, delayed_profit_total: 300,
      addon_revenue_total: 0, addon_payroll_total: 13.5, addon_profit_total: null, missing_addon_plans_facts: 1,
      addon_unrecorded_completed_works: 1, addon_missing_client_prices: 1,
      reason_rows_total: 9, addon_rows_total: 7, incomplete_addon_rows: 2 };
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path === "/api/v1/admin/projects") return { items: [] };
      if (path.includes("/issues-addons-impact")) return { summary, generated_at: "2026-10-09T12:00:00Z",
        top_reasons: [{ reason_id: "r1", reason_name: "Unpriced reason", doors: 2, revenue_delayed_total: 600,
          payroll_delayed_total: null, profit_delayed_total: null, unpriced_doors: 1 }],
        addon_impact: [{ addon_type_id: "a1", addon_name: "Recorded adjustment", pricing_mode: "FACTORY", qty_done: 1.5,
          revenue_total: 0, payroll_total: 13.5, profit_total: null, missing_plan_facts: 1,
          unrecorded_completed_works: 1, missing_client_prices: 1 }],
      };
      throw new Error("Unrelated report unavailable");
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><ReportsPage /></QueryClientProvider>);
    const section = within(document.getElementById("reports-issues-addons-impact")!);
    await waitFor(() => expect(section.getByRole("status")).toHaveTextContent("active confirmed price list: 3"), { timeout: 5000 });
    expect(section.getByRole("status")).toHaveTextContent("Reasons shown: 1 / 9");
    expect(section.getByRole("status")).toHaveTextContent("Add-on types shown: 1 / 7");
    expect(section.getAllByText(/Works without earnings: 1/)).toHaveLength(2);
    for (const label of ["Unpriced reason", "Recorded adjustment"]) {
      const row = section.getAllByText(label).map((element) => element.closest("tr")).find(Boolean)!;
      expect(within(row).getByText("-")).toBeInTheDocument();
    }
    const card = screen.getByRole("button", { name: /Door financial exposure/ });
    expect(within(card).getByText(`${exposure ?? "-"} ILS`)).toBeInTheDocument();
    expect(within(card).queryByText("500.00 ILS")).not.toBeInTheDocument();
    client.clear();
  });

  it.each([false, true])("shows order coverage and unknown profit, including an empty page: %s", async (empty) => {
    const row = { order_number: "ORDER-GAP", pricing_mode: "FACTORY", total_doors: 1,
      installed_doors: 1, not_installed_doors: 0, open_issues: 0, completion_pct: 100,
      planned_revenue_total: 500, installed_revenue_total: 0, payroll_total: 0, profit_total: null,
      recorded_installations: 0, unrecorded_completed_works: 1, missing_client_prices: 0,
      missing_rates_installed_doors: 1 };
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path === "/api/v1/admin/projects") return { items: [] };
      if (path.includes("/order-numbers-kpi?")) return { pricing_mode: "FACTORY", total: 9,
        incomplete_orders: 3, items: empty ? [] : [row] };
      if (path.includes("/risk-concentration?")) return {
        generated_at: "2026-10-09T12:00:00Z", projects: [], installers: [], orders: empty ? [] : [row],
        summary: { order_pricing_mode: "FACTORY", incomplete_orders: 3, order_rows_total: 9,
          risky_projects: 0, risky_orders: empty ? 0 : 1, risky_installers: 0,
          open_issue_profit_at_risk: 0, blocked_issue_profit_at_risk: 0, delayed_profit_total: 0,
          worst_project_profit_total: 0, worst_order_profit_total: null, worst_installer_profit_total: 0 },
      };
      throw new Error("Unrelated report unavailable");
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><ReportsPage /></QueryClientProvider>);
    const section = within(document.getElementById("reports-orders")!);
    await waitFor(() => expect(section.getByRole("status")).toHaveTextContent("Orders with incomplete finances: 3"), { timeout: 5000 });
    expect(section.getByRole("status")).toHaveTextContent("outside this page");
    expect(section.getByRole("button", { name: "Next" })).toBeDisabled();
    expect(screen.getByText(`Orders shown: ${empty ? 0 : 1} / 9.`)).toBeInTheDocument();
    expect(screen.getByText(/Lowest known order profit/)).toHaveTextContent("-");
    if (empty) expect(section.getByText("No order KPI rows.")).toBeInTheDocument();
    else {
      expect(section.getByText(/Works without earnings: 1/)).toBeInTheDocument();
      expect(section.getByText(/Recorded installations: 0/)).toHaveTextContent("Recorded revenue: 0.00");
      expect(section.getAllByText("-")).toHaveLength(2);
    }
    client.clear();
  });

  it("keeps order pagination, filters and export scoped to the chosen rows", async () => {
    for (const key of ["createObjectURL", "revokeObjectURL"] as const) {
      if (!(key in URL)) Object.defineProperty(URL, key, { writable: true, configurable: true, value: vi.fn() });
    }
    const createUrl = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:order-report");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const queries: URLSearchParams[] = [];
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path === "/api/v1/admin/projects") return { items: [{ id: "site-1", name: "Order site" }] };
      if (path.includes("/order-numbers-kpi?")) {
        const params = new URL(path, "http://localhost").searchParams;
        queries.push(params);
        return { pricing_mode: "FACTORY", incomplete_orders: 2, total: 21, items: [] };
      }
      throw new Error("Unrelated report unavailable");
    });
    const download = vi.spyOn(globalThis, "fetch").mockResolvedValue(createDownloadResponse("order_number\nORDER-1", "text/csv"));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><ReportsPage /></QueryClientProvider>);
    const section = within(document.getElementById("reports-orders")!);
    await waitFor(() => expect(section.getByRole("button", { name: "Next" })).toBeEnabled(), { timeout: 5000 });
    fireEvent.click(section.getByRole("button", { name: "Next" }));
    await waitFor(() => expect(queries.at(-1)?.get("offset")).toBe("20"), { timeout: 5000 });
    expect(section.getByRole("button", { name: "Next" })).toBeDisabled();
    fireEvent.change(section.getByLabelText("Order Project Filter"), { target: { value: "site-1" } });
    fireEvent.change(section.getByPlaceholderText("Search order…"), { target: { value: "A_%/1" } });
    await waitFor(() => expect(queries.at(-1)?.get("q")).toBe("A_%/1"), { timeout: 5000 });
    expect(queries.at(-1)?.get("project_id")).toBe("site-1");
    expect(queries.at(-1)?.get("offset")).toBe("0");
    fireEvent.click(section.getByRole("button", { name: "Export Orders CSV" }));
    await waitFor(() => expect(download).toHaveBeenCalled(), { timeout: 5000 });
    const params = new URL(String(download.mock.calls.at(-1)![0]), "http://localhost").searchParams;
    expect(params.get("project_id")).toBe("site-1");
    expect(params.get("q")).toBe("A_%/1");
    expect(params.get("offset")).toBe("0");
    await screen.findByText("Order numbers export is ready.", {}, { timeout: 5000 });
    expect(createUrl).toHaveBeenCalled();
    client.clear();
  });

  it("loads all installer directory pages and offers addon-only performers outside period KPI", async () => {
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path === "/api/v1/admin/projects") return { items: [] };
      if (path.includes("/installers-kpi?")) return { items: [], total: 0 };
      if (path.includes("/installers?")) return path.endsWith("offset=0")
        ? Array.from({ length: 200 }, (_, i) => ({ id: `worker-${i}`, full_name: `Performer worker-${i}` }))
        : [{ id: "addon-only", full_name: "Performer addon-only" }];
      if (path.includes("/installers-kpi/")) return installerDetailFixture(path.split("/").at(-1)!);
      throw new Error("Unrelated report unavailable");
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><ReportsPage /></QueryClientProvider>);
    const section = within(document.getElementById("reports-installer-details")!);
    await section.findByRole("option", { name: "Performer addon-only" }, { timeout: 5000 });
    expect(section.getAllByRole("option")).toHaveLength(202);
    fireEvent.change(section.getByRole("combobox"), { target: { value: "addon-only" } });
    await waitFor(() => expect(apiFetchMock).toHaveBeenCalledWith(
      "/api/v1/admin/reports/installers-kpi/addon-only", expect.anything()), { timeout: 5000 });
    await section.findByText("Earned: 13.50", {}, { timeout: 5000 });
    expect(section.getByRole("combobox")).toHaveValue("addon-only");
    expect(pushMock).toHaveBeenCalledWith("/reports?installer_id=addon-only#reports-installer-details");
    expect(section.getByText(/All recorded work, independent of the period filter/)).toBeInTheDocument();
    act(() => {
      client.setQueriesData({ queryKey: ["reports-installers-kpi"] }, {
        items: [installerDetailFixture("new-period-performer")], total: 1,
      });
    });
    expect(section.getByRole("combobox")).toHaveValue("addon-only");
    expect(apiFetchMock.mock.calls.some(([path]) => String(path).endsWith("/installers-kpi/new-period-performer"))).toBe(false);
    client.clear();
  });

  it("loads a scoped historical performer directly and allows explicit selection of another", async () => {
    window.history.replaceState({}, "", "/reports?installer_id=historical&project_id=site-1");
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path === "/api/v1/admin/projects") return { items: [] };
      if (path.includes("/installers-kpi?")) return { items: [], total: 0 };
      if (path.includes("/installers?")) return [{ id: "another", full_name: "Performer another" }];
      if (path.includes("/installers-kpi/")) return installerDetailFixture(path.split("/").at(-1)!);
      throw new Error("Unrelated report unavailable");
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><ReportsPage /></QueryClientProvider>);
    const section = within(document.getElementById("reports-installer-details")!);
    await section.findByText("Earned: 13.50", {}, { timeout: 5000 });
    expect(section.getByRole("combobox")).toHaveValue("historical");
    fireEvent.change(section.getByRole("combobox"), { target: { value: "another" } });
    await waitFor(() => expect(apiFetchMock).toHaveBeenCalledWith(
      "/api/v1/admin/reports/installers-kpi/another", expect.anything()), { timeout: 5000 });
    expect(section.getByRole("combobox")).toHaveValue("another");
    expect(pushMock).toHaveBeenCalledWith("/reports?installer_id=another&project_id=site-1#reports-installer-details");
    client.clear();
  });

  it("discloses incomplete detail amounts and limited project/order breakdowns", async () => {
    window.history.replaceState({}, "", "/reports?installer_id=incomplete");
    const row = { pricing_mode: "FACTORY", installed_doors: 1, open_issues: 0,
      revenue_total: 500, payroll_total: 250, profit_total: null, last_installed_at: null,
      missing_rates_installed_doors: 1, unrecorded_completed_works: 1, missing_client_prices: 0 };
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path === "/api/v1/admin/projects") return { items: [] };
      if (path.includes("/installers?")) return [];
      if (path.endsWith("/installers-kpi/incomplete")) return {
        ...installerDetailFixture("incomplete"), ...row, project_rows_total: 7, order_rows_total: 9,
        top_projects: [{ ...row, project_id: null, project_name: null }],
        order_breakdown: [{ ...row, order_number: "ORDER-1" }],
      };
      throw new Error("Unrelated report unavailable");
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><ReportsPage /></QueryClientProvider>);
    const section = within(document.getElementById("reports-installer-details")!);
    await section.findByText(/Project rows shown: 1 \/ 7/, {}, { timeout: 5000 });
    expect(section.getByText(/Order rows shown: 1 \/ 9/)).toBeInTheDocument();
    expect(section.getAllByText("Project unavailable")).toHaveLength(2);
    expect(section.getAllByText("Earned: 250.00")).toHaveLength(4);
    expect(section.getAllByText(/Works without earnings: 1/)).toHaveLength(5);
    for (const tr of section.getAllByRole("row").filter((row) => row.querySelector("td"))) {
      expect(within(tr).getByText("-")).toBeInTheDocument();
    }
    client.clear();
  });

  it("does not request the installer financial directory without rates access", async () => {
    authSessionMock.mockReturnValue({ role: "ADMIN", admin_scope: "DISPATCHER", can_view_rates: false });
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path === "/api/v1/admin/projects") return { items: [] };
      throw new Error("Unrelated report unavailable");
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><ReportsPage /></QueryClientProvider>);
    await waitFor(() => expect(apiFetchMock).toHaveBeenCalled());
    expect(apiFetchMock.mock.calls.some(([path]) => /\/installers\?|\/installers-kpi\//.test(String(path)))).toBe(false);
    client.clear();
  });

  it.each([false, true])("shows installer ledger coverage even when the matrix is empty: %s", async (empty) => {
    const item = { installer_id: "installer-1", installer_name: "Recorded installer", project_id: null, project_name: null,
      pricing_mode: "FACTORY", performance_band: "INCOMPLETE", installed_doors: 1, active_projects: 1, open_issues: 0,
      addons_done_qty: 0, revenue_total: 500, payroll_total: 250, profit_total: null, margin_pct: null, avg_profit_per_door: null,
      unrecorded_completed_works: 1, missing_client_prices: 1, missing_rates_installed_doors: 1, missing_addon_plans_facts: 1 };
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path === "/api/v1/admin/projects") return { items: [] };
      if (path.includes("/installers-profitability-matrix") || path.includes("/installer-project-profitability")) return {
        pricing_mode: "FACTORY", incomplete_items: empty ? 0 : 7, unassigned_completed_works: 3,
        total: empty ? 0 : 7, items: empty ? [] : [item],
      };
      throw new Error("Unrelated report unavailable in this focused fixture");
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><ReportsPage /></QueryClientProvider>);
    await waitFor(() => expect(screen.getAllByText(/Unrecorded works without an installer: 3/)).toHaveLength(2), { timeout: 5000 });
    for (const id of ["reports-installer-cross-view", "reports-installers-kpi"]) {
      const section = within(document.getElementById(id)!);
      expect(section.getByRole("status")).toHaveTextContent("recorded performer");
      if (!empty) {
        expect(section.getByRole("status")).toHaveTextContent("Incomplete financial rows: 7");
        expect(section.getAllByText("Incomplete", { exact: true })).toHaveLength(2);
        expect(section.getAllByText(/Works without earnings: 1/)).toHaveLength(2);
        const row = section.getAllByText("Recorded installer").map((e) => e.closest("tr")).find(Boolean)!;
        expect(within(row).getAllByText("-")).toHaveLength(3);
        expect(within(row).getByText("250.00")).toBeInTheDocument();
        expect(within(row).getByText("2")).toBeInTheDocument();
      }
    }
    if (!empty) expect(screen.getAllByText("Project unavailable")).toHaveLength(2);
    client.clear();
  });

  it.each([0, 20])("shows period KPI gaps and stops pagination at the exact total: %s", async (count) => {
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path === "/api/v1/admin/projects") return { items: [] };
      if (path.includes("/installers-kpi?")) return {
        period_from: null, period_to: null, pricing_mode: "FACTORY",
        total: count, incomplete_items: count, unassigned_completed_works: 3,
        items: Array.from({ length: count }, (_, index) => ({
          installer_id: `kpi-${index}`, installer_name: `KPI performer ${index}`,
          pricing_mode: "FACTORY", installed_doors: 1, payroll_total: 250, revenue_total: 500,
          profit_total: null, unrecorded_completed_works: 1, missing_client_prices: 1, missing_rates_installed_doors: 1,
        })),
      };
      throw new Error("Unrelated report unavailable in this focused fixture");
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><ReportsPage /></QueryClientProvider>);
    const section = within(document.getElementById("reports-order-numbers-kpi")!);
    await waitFor(() => expect(section.getByRole("status")).toHaveTextContent("Unrecorded works without an installer: 3"), { timeout: 5000 });
    expect(section.getByRole("status")).toHaveTextContent("Door installations only");
    expect(section.getByRole("button", { name: "Next" })).toBeDisabled();
    if (count) {
      expect(section.getAllByText(/Works without earnings: 1/)).toHaveLength(count * 2);
      expect(section.getAllByText("-")).toHaveLength(count * 2);
      expect(section.getAllByText("250.00")).toHaveLength(count * 2);
      expect(section.getAllByText("2", { exact: true })).toHaveLength(count * 2);
    } else {
      expect(section.getByText("No installers KPI rows.")).toBeInTheDocument();
    }
    client.clear();
  });

  it("does not present an unconfirmed addon rate or its payroll total as zero", async () => {
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path === "/api/v1/admin/projects") return { items: [{ id: "project-1", name: "Tower" }] };
      if (path.includes("/project-plan-fact/")) return { project_id: "project-1" };
      if (path.includes("/addons/plan")) return { items: [{ addon_type_id: "addon-1", addon_name: "Unpriced work",
        qty_planned: "2", client_price: "20", installer_price: null }] };
      if (path.includes("/urgency-surcharges")) return { items: [] };
      throw new Error("Unrelated report unavailable in this focused fixture");
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><ReportsPage /></QueryClientProvider>);
    await waitFor(() => expect(screen.getAllByText("No confirmed price")).toHaveLength(4), { timeout: 5000 });
    expect(screen.getAllByText("Unpriced work")).toHaveLength(2);
    client.clear();
  });

  it("keeps incomplete financial totals distinct from zero earnings", async () => {
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path === "/api/v1/admin/projects") return { items: [{ id: "project-1", name: "Tower" }] };
      if (path.includes("/project-plan-fact/")) return {
        project_id: "project-1", pricing_mode: "FACTORY", price_list_version: 2,
        planned_revenue_total: 500, actual_revenue_total: 0, revenue_gap_total: 500,
        planned_payroll_total: null, actual_payroll_total: 0, payroll_gap_total: null,
        planned_profit_total: null, actual_profit_total: null, profit_gap_total: null,
        missing_planned_rates_addons: 1, unrecorded_completed_works: 1,
      };
      if (path.includes("/addons/plan") || path.includes("/urgency-surcharges")) return { items: [] };
      throw new Error("Unrelated report unavailable in this focused fixture");
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><ReportsPage /></QueryClientProvider>);
    await waitFor(() => expect(screen.getByText(/Plan: confirmed factory price list v2/)).toBeInTheDocument(), { timeout: 5000 });
    const section = within(document.getElementById("reports-project-plan-fact")!);
    const payrollRows = section.getAllByText("Payroll").map((label) => label.closest("tr")).filter(Boolean);
    expect(payrollRows).toHaveLength(1);
    expect(within(payrollRows[0]!).getAllByText("-")).toHaveLength(2);
    expect(within(payrollRows[0]!).getByText("0.00")).toBeInTheDocument();
    expect(section.getByText(/Actual profit is incomplete/)).toBeInTheDocument();
    client.clear();
  });

  it("keeps historical urgency out of the confirmed addon payroll plan", async () => {
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path === "/api/v1/admin/projects") return { items: [{ id: "project-1", name: "Tower" }] };
      if (path.includes("/project-plan-fact/")) return { project_id: "project-1", pricing_mode: "FACTORY", price_list_version: 1 };
      if (path.includes("/addons/plan")) return { items: [{ addon_type_id: "addon-1", addon_name: "Adjustment",
        qty_planned: "3", client_price: "20", installer_price: "9" }] };
      if (path.includes("/urgency-surcharges")) return { items: [{ id: "old-1", scope: "PROJECT", reason: "Old urgency",
        installer_amount: "80", client_amount: "100" }] };
      throw new Error("Unrelated report unavailable in this focused fixture");
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><ReportsPage /></QueryClientProvider>);
    const label = await screen.findByText("Additional work payroll plan", {}, { timeout: 5000 });
    await waitFor(() => expect(within(label.parentElement!).getByText("27.00")).toBeInTheDocument(), { timeout: 5000 });
    expect(within(label.parentElement!).queryByText("107.00")).not.toBeInTheDocument();
    expect(screen.getAllByText("Old urgency").length).toBeGreaterThan(0);
    client.clear();
  });

  it("keeps unknown project margins blank and counts unrecorded addon work", async () => {
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path.includes("/projects-margin")) return {
        pricing_mode: "FACTORY", total: 7, incomplete_projects: 7, items: [{
          project_id: "incomplete-project", project_name: "Unrecorded adjustment", project_status: "OK",
          completion_pct: 100, open_issues: 0, profit_total: null, margin_pct: null,
          pricing_mode: "FACTORY", unrecorded_completed_works: 1,
          missing_rates_installed_doors: 0, missing_addon_plans_facts: 0,
        }],
      };
      throw new Error("Unrelated report unavailable in this focused fixture");
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><ReportsPage /></QueryClientProvider>);
    await screen.findByText(/Projects with incomplete financial data: 7/, {}, { timeout: 5000 });
    const section = within(document.getElementById("reports-project-margin-executive")!);
    expect(section.getAllByText(/Works without earnings: 1/)).toHaveLength(4);
    const rows = section.getAllByRole("row").filter((row) => row.textContent?.includes("Unrecorded adjustment"));
    expect(rows).toHaveLength(2);
    for (const row of rows) expect(within(row).getAllByText("-")).toHaveLength(2);
    expect(within(rows[1]).getByText("1")).toBeInTheDocument();
    client.clear();
  });

  it("loads reports dashboard sections", async () => {
    apiFetchMock.mockImplementation(async (path: string, init?: RequestInit) => {
      const url = String(path);
      const webhookMock = mockReportWebhookSignals(url);
      if (webhookMock) {
        return webhookMock;
      }
      const retryAuditMock = mockReportRetryAudits(url);
      if (retryAuditMock) {
        return retryAuditMock;
      }
      if (url.includes("/api/v1/admin/reports/limit-alerts/read")) {
        return {
          unread_count: 0,
          last_read_at: "2026-02-22T18:00:00Z",
        };
      }
      if (url.includes("/api/v1/admin/reports/delivery")) {
        return {
          period_from: null,
          period_to: null,
          whatsapp_pending: 1,
          whatsapp_delivered: 5,
          whatsapp_failed: 2,
          email_sent: 3,
          email_failed: 1,
        };
      }
      if (url.includes("/api/v1/admin/outbox/summary")) {
        return {
          total: 8,
          by_channel: { EMAIL: 4, WHATSAPP: 4 },
          by_status: { PENDING: 2, FAILED: 1, SENT: 5 },
          by_delivery_status: { PENDING: 2, FAILED: 1, DELIVERED: 5 },
          pending_overdue_15m: 1,
          failed_total: 1,
        };
      }
      if (url.includes("/api/v1/admin/reports/operations-center")) {
        return {
          generated_at: "2026-02-22T18:01:00Z",
          imports: {
            window_hours: 24,
            total_runs: 5,
            analyze_runs: 1,
            import_runs: 3,
            retry_runs: 1,
            success_runs: 3,
            partial_runs: 1,
            failed_runs: 1,
            empty_runs: 0,
          },
          outbox: {
            total: 8,
            failed_total: 1,
            pending_overdue_15m: 1,
            by_channel: { EMAIL: 4, WHATSAPP: 4 },
          },
          alerts: {
            unread_count: 2,
            total_last_24h: 3,
            warn_last_24h: 2,
            danger_last_24h: 1,
            latest_created_at: "2026-02-22T17:50:00Z",
          },
          top_failing_projects: [
            {
              project_id: "57f6df22-fe4b-47db-af44-198ab5f5a462",
              project_name: "Ashdod Tower A",
              failure_runs: 2,
              last_run_at: "2026-02-22T17:40:00Z",
              last_error: "missing required column",
            },
          ],
        };
      }
      if (url.includes("/api/v1/admin/reports/operations-sla/history")) {
        return {
          generated_at: "2026-02-22T18:03:00Z",
          days: 30,
          points: [
            {
              day: "2026-02-21",
              overall_status: "WARN",
              import_status: "WARN",
              outbox_status: "OK",
              alerts_status: "OK",
              import_runs: 3,
              risky_import_runs: 1,
              import_failure_rate_pct: 33.3,
              outbox_total: 4,
              outbox_failed: 0,
              outbox_failed_rate_pct: 0,
              danger_alerts_count: 0,
            },
            {
              day: "2026-02-22",
              overall_status: "DANGER",
              import_status: "DANGER",
              outbox_status: "WARN",
              alerts_status: "WARN",
              import_runs: 3,
              risky_import_runs: 2,
              import_failure_rate_pct: 66.6,
              outbox_total: 4,
              outbox_failed: 1,
              outbox_failed_rate_pct: 25,
              danger_alerts_count: 1,
            },
          ],
          summary: {
            ok_days: 20,
            warn_days: 7,
            danger_days: 3,
            current_status: "DANGER",
            delta_import_failure_rate_pct: 33.3,
            delta_outbox_failed_rate_pct: 25,
            delta_danger_alerts_count: 1,
          },
        };
      }
      if (url.includes("/api/v1/admin/reports/operations-sla")) {
        return {
          generated_at: "2026-02-22T18:02:00Z",
          overall_status: "DANGER",
          metrics: [
            {
              code: "imports_failure_rate_24h",
              title: "Import Failure Rate (24h)",
              unit: "pct",
              current: 33.3,
              target: 5,
              warn_threshold: 15,
              danger_threshold: 30,
              status: "DANGER",
            },
          ],
          playbooks: [
            {
              code: "PLAYBOOK_IMPORTS_RETRY_FAILED",
              severity: "DANGER",
              title: "Retry failed imports in bulk",
              description:
                "Open Projects with failed runs preselected and retry only failed entries.",
              action_url: "/projects?only_failed_runs=1",
            },
          ],
        };
      }
      if (url.includes("/api/v1/admin/reports/issues-analytics")) {
        return {
          generated_at: "2026-02-22T18:04:00Z",
          days: 30,
          summary: {
            total_issues: 12,
            open_issues: 5,
            closed_issues: 7,
            overdue_open_issues: 2,
            blocked_open_issues: 1,
            p1_open_issues: 1,
            overdue_open_rate_pct: 40.0,
            mttr_hours: 18.5,
            mttr_p50_hours: 12.0,
            mttr_sample_size: 6,
            backlog_by_workflow: {
              NEW: 1,
              TRIAGED: 2,
              IN_PROGRESS: 1,
              BLOCKED: 1,
              RESOLVED: 0,
              CLOSED: 0,
            },
            backlog_by_priority: {
              P1: 1,
              P2: 1,
              P3: 2,
              P4: 1,
            },
          },
          trend: [
            { day: "2026-02-21", opened: 2, closed: 1, backlog_open_end: 4 },
            { day: "2026-02-22", opened: 1, closed: 0, backlog_open_end: 5 },
          ],
        };
      }
      if (url.includes("/api/v1/admin/reports/issues-addons-impact")) {
        return {
          generated_at: "2026-02-22T18:05:00Z",
          summary: {
            open_issues: 4,
            blocked_open_issues: 2,
            not_installed_doors: 6,
            open_issue_revenue_at_risk: 1450,
            open_issue_payroll_at_risk: 580,
            open_issue_profit_at_risk: 870,
            blocked_issue_profit_at_risk: 310,
            delayed_revenue_total: 2200,
            delayed_payroll_total: 880,
            delayed_profit_total: 1320,
            addon_revenue_total: 180,
            addon_payroll_total: 72,
            addon_profit_total: 108,
            missing_addon_plans_facts: 1,
          },
          top_reasons: [
            {
              reason_id: "df76c997-b4a6-4d2c-8668-91dc0e64a5d0",
              reason_name: "Site Blocked",
              doors: 3,
              revenue_delayed_total: 1200,
              payroll_delayed_total: 480,
              profit_delayed_total: 720,
            },
          ],
          addon_impact: [
            {
              addon_type_id: "9a8e2868-7201-45d0-ac31-772aa8cbdd97",
              addon_name: "Handle Upgrade",
              qty_done: 2,
              revenue_total: 100,
              payroll_total: 40,
              profit_total: 60,
              missing_plan_facts: 0,
            },
          ],
        };
      }
      if (url.includes("/api/v1/admin/reports/risk-concentration")) {
        return {
          generated_at: "2026-02-22T18:05:30Z",
          summary: {
            open_issue_profit_at_risk: 870,
            blocked_issue_profit_at_risk: 310,
            delayed_profit_total: 1320,
            risky_projects: 2,
            risky_orders: 2,
            risky_installers: 2,
            worst_project_profit_total: 20,
            worst_order_profit_total: 10,
            worst_installer_profit_total: 40,
          },
          projects: [
            {
              project_id: "7cb76f7d-8d96-4b0a-a279-ec6baee4db15",
              project_name: "Ashdod Tower B",
              project_status: "PROBLEM",
              total_doors: 8,
              installed_doors: 2,
              completion_pct: 25,
              open_issues: 3,
              revenue_total: 600,
              payroll_total: 580,
              profit_total: 20,
              margin_pct: 3.33,
              missing_rates_installed_doors: 1,
              missing_addon_plans_facts: 2,
              last_installed_at: "2026-02-21T11:00:00Z",
            },
          ],
          orders: [
            {
              order_number: "RC-100",
              total_doors: 4,
              installed_doors: 1,
              not_installed_doors: 3,
              open_issues: 2,
              planned_revenue_total: 1200,
              installed_revenue_total: 300,
              payroll_total: 290,
              profit_total: 10,
              missing_rates_installed_doors: 1,
              completion_pct: 25,
            },
          ],
          installers: [
            {
              installer_id: "0d8a8d5d-1fdb-4ef2-a004-9101e76ca3bc",
              installer_name: "Installer Beta",
              performance_band: "RISK",
              installed_doors: 2,
              active_projects: 1,
              open_issues: 3,
              addons_done_qty: 0,
              revenue_total: 300,
              payroll_total: 260,
              profit_total: 40,
              margin_pct: 13.33,
              avg_profit_per_door: 20,
              missing_rates_installed_doors: 1,
              missing_addon_plans_facts: 0,
              last_installed_at: "2026-02-21T11:00:00Z",
            },
          ],
        };
      }
      if (url.includes("/api/v1/admin/reports/installers-profitability-matrix")) {
        return {
          total: 2,
          limit: 8,
          offset: 0,
          items: [
            {
              installer_id: "6ac2c77d-f5f2-45d8-b0a3-6382dbd95fbf",
              installer_name: "Installer Alpha",
              performance_band: "STRONG",
              installed_doors: 7,
              active_projects: 2,
              open_issues: 1,
              addons_done_qty: 4,
              revenue_total: 1060,
              payroll_total: 732,
              profit_total: 328,
              margin_pct: 30.94,
              avg_profit_per_door: 46.86,
              missing_rates_installed_doors: 0,
              missing_addon_plans_facts: 1,
              last_installed_at: "2026-02-22T17:00:00Z",
            },
            {
              installer_id: "0d8a8d5d-1fdb-4ef2-a004-9101e76ca3bc",
              installer_name: "Installer Beta",
              performance_band: "RISK",
              installed_doors: 2,
              active_projects: 1,
              open_issues: 3,
              addons_done_qty: 0,
              revenue_total: 300,
              payroll_total: 260,
              profit_total: 40,
              margin_pct: 13.33,
              avg_profit_per_door: 20,
              missing_rates_installed_doors: 1,
              missing_addon_plans_facts: 0,
              last_installed_at: "2026-02-21T11:00:00Z",
            },
          ],
        };
      }
      if (url.includes("/api/v1/admin/reports/installer-project-profitability")) {
        return {
          total: 2,
          limit: 10,
          offset: 0,
          items: [
            {
              installer_id: "6ac2c77d-f5f2-45d8-b0a3-6382dbd95fbf",
              installer_name: "Installer Alpha",
              project_id: "57f6df22-fe4b-47db-af44-198ab5f5a462",
              project_name: "Ashdod Tower A",
              performance_band: "STRONG",
              installed_doors: 5,
              open_issues: 0,
              addons_done_qty: 2,
              revenue_total: 840,
              payroll_total: 560,
              profit_total: 280,
              margin_pct: 33.33,
              avg_profit_per_door: 56,
              missing_rates_installed_doors: 0,
              missing_addon_plans_facts: 0,
              last_installed_at: "2026-02-22T17:00:00Z",
            },
            {
              installer_id: "0d8a8d5d-1fdb-4ef2-a004-9101e76ca3bc",
              installer_name: "Installer Beta",
              project_id: "7cb76f7d-8d96-4b0a-a279-ec6baee4db15",
              project_name: "Ashdod Tower B",
              performance_band: "WATCH",
              installed_doors: 2,
              open_issues: 1,
              addons_done_qty: 0,
              revenue_total: 300,
              payroll_total: 260,
              profit_total: 40,
              margin_pct: 13.33,
              avg_profit_per_door: 20,
              missing_rates_installed_doors: 1,
              missing_addon_plans_facts: 0,
              last_installed_at: "2026-02-21T11:00:00Z",
            },
          ],
        };
      }
      if (url === "/api/v1/admin/projects" || url.startsWith("/api/v1/admin/projects?")) {
        return {
          items: [
            {
              id: "57f6df22-fe4b-47db-af44-198ab5f5a462",
              name: "Ashdod Tower A",
            },
            {
              id: "7cb76f7d-8d96-4b0a-a279-ec6baee4db15",
              name: "Ashdod Tower B",
            },
          ],
        };
      }
      if (url.includes("/api/v1/admin/reports/project-plan-fact/")) {
        return {
          project_id: "57f6df22-fe4b-47db-af44-198ab5f5a462",
          total_doors: 10,
          installed_doors: 6,
          not_installed_doors: 4,
          completion_pct: 60,
          open_issues: 2,
          planned_revenue_total: 5000,
          actual_revenue_total: 3200,
          revenue_gap_total: 1800,
          planned_payroll_total: 2100,
          actual_payroll_total: 1260,
          payroll_gap_total: 840,
          planned_profit_total: 2900,
          actual_profit_total: 1940,
          profit_gap_total: 960,
          planned_addons_qty: 8,
          actual_addons_qty: 3,
          urgency_surcharges_count: 1,
          urgency_order_surcharges_count: 1,
          urgency_client_total: 250,
          urgency_installer_total: 120,
          urgency_profit_total: 130,
          missing_planned_rates_doors: 1,
          missing_actual_rates_doors: 0,
          missing_addon_plans_facts: 1,
        };
      }
      if (url.includes("/api/v1/admin/projects/57f6df22-fe4b-47db-af44-198ab5f5a462/addons/plan")) {
        return {
          items: [
            {
              id: "addon-plan-1",
              addon_type_id: "addon-1",
              addon_name: "Handle Upgrade",
              qty_planned: 3,
              client_price: 120,
              installer_price: 55,
              notes: "Lobby priority",
            },
          ],
        };
      }
      if (url.includes("/api/v1/admin/projects/57f6df22-fe4b-47db-af44-198ab5f5a462/urgency-surcharges")) {
        return {
          items: [
            {
              id: "surcharge-1",
              scope: "ORDER_NUMBER",
              order_number: "AZ-100",
              reason: "Late-night uplift",
              client_amount: 250,
              installer_amount: 120,
              effective_date: "2026-02-22",
              notes: "Approved",
            },
          ],
        };
      }
      if (url.includes("/api/v1/admin/reports/project-risk-drilldown/")) {
        return {
          generated_at: "2026-02-22T18:06:00Z",
          project_id: "7cb76f7d-8d96-4b0a-a279-ec6baee4db15",
          project_name: "Ashdod Tower B",
          summary: {
            total_doors: 8,
            installed_doors: 2,
            not_installed_doors: 6,
            completion_pct: 25,
            open_issues: 3,
            blocked_open_issues: 1,
            planned_revenue_total: 2400,
            actual_revenue_total: 600,
            revenue_gap_total: 1800,
            planned_profit_total: 1420,
            actual_profit_total: 20,
            profit_gap_total: 1400,
            actual_margin_pct: 3.33,
            delayed_revenue_total: 1800,
            delayed_profit_total: 1060,
            blocked_issue_profit_at_risk: 280,
            addon_revenue_total: 40,
            addon_profit_total: 12,
            urgency_surcharges_count: 0,
            urgency_order_surcharges_count: 0,
            urgency_client_total: 0,
            urgency_installer_total: 0,
            urgency_profit_total: 0,
            missing_planned_rates_doors: 1,
            missing_actual_rates_doors: 0,
            missing_addon_plans_facts: 2,
          },
          drivers: [
            {
              code: "profit_gap_total",
              label: "Profit Gap",
              severity: "DANGER",
              value: 1400,
            },
          ],
          top_reasons: [
            {
              reason_id: "1132ba5f-b280-4c42-a1c8-d0de7a54198e",
              reason_name: "Blocked Site",
              doors: 3,
              revenue_delayed_total: 900,
              profit_delayed_total: 540,
            },
          ],
          risky_orders: [
            {
              order_number: "BZ-400",
              total_doors: 4,
              installed_doors: 1,
              not_installed_doors: 3,
              open_issues: 2,
              planned_revenue_total: 1200,
              actual_revenue_total: 300,
              revenue_gap_total: 900,
              actual_profit_total: 10,
              completion_pct: 25,
            },
          ],
        };
      }
      if (
        url.includes("/api/v1/admin/reports/projects-margin?") &&
        url.includes("sort_dir=desc")
      ) {
        return {
          total: 2,
          limit: 5,
          offset: 0,
          items: [
            {
              project_id: "57f6df22-fe4b-47db-af44-198ab5f5a462",
              project_name: "Ashdod Tower A",
              project_status: "OK",
              total_doors: 10,
              installed_doors: 6,
              completion_pct: 60,
              open_issues: 2,
              revenue_total: 3200,
              payroll_total: 1260,
              profit_total: 1940,
              margin_pct: 60.63,
              missing_rates_installed_doors: 1,
              missing_addon_plans_facts: 1,
              last_installed_at: "2026-02-22T17:00:00Z",
            },
          ],
        };
      }
      if (
        url.includes("/api/v1/admin/reports/projects-margin?") &&
        url.includes("sort_dir=asc")
      ) {
        return {
          total: 2,
          limit: 5,
          offset: 0,
          items: [
            {
              project_id: "7cb76f7d-8d96-4b0a-a279-ec6baee4db15",
              project_name: "Ashdod Tower B",
              project_status: "PROBLEM",
              total_doors: 8,
              installed_doors: 2,
              completion_pct: 25,
              open_issues: 3,
              revenue_total: 600,
              payroll_total: 580,
              profit_total: 20,
              margin_pct: 3.33,
              missing_rates_installed_doors: 0,
              missing_addon_plans_facts: 2,
              last_installed_at: "2026-02-21T15:00:00Z",
            },
          ],
        };
      }
      if (url.includes("/api/v1/admin/reports/installers-kpi/")) {
        return {
          installer_id: "6ac2c77d-f5f2-45d8-b0a3-6382dbd95fbf",
          installer_name: "Installer Alpha",
          installed_doors: 7,
          active_projects: 2,
          order_numbers: 3,
          open_issues: 1,
          addons_done_qty: 4,
          addon_revenue_total: 80,
          addon_payroll_total: 32,
          addon_profit_total: 48,
          revenue_total: 1060,
          payroll_total: 732,
          profit_total: 328,
          missing_rates_installed_doors: 0,
          missing_addon_plans_facts: 1,
          last_installed_at: "2026-02-22T17:00:00Z",
          top_projects: [
            {
              project_id: "57f6df22-fe4b-47db-af44-198ab5f5a462",
              project_name: "Ashdod Tower A",
              installed_doors: 4,
              open_issues: 1,
              revenue_total: 620,
              payroll_total: 430,
              profit_total: 190,
              last_installed_at: "2026-02-22T17:00:00Z",
            },
          ],
          order_breakdown: [
            {
              order_number: "AZ-100",
              installed_doors: 3,
              revenue_total: 720,
              payroll_total: 480,
              profit_total: 240,
            },
          ],
        };
      }
      if (url.includes("/api/v1/admin/reports/installers-kpi")) {
        return {
          period_from: null,
          period_to: null,
          items: [
            {
              installer_id: "6ac2c77d-f5f2-45d8-b0a3-6382dbd95fbf",
              installer_name: "Installer Alpha",
              installed_doors: 7,
              payroll_total: 700,
              revenue_total: 980,
              profit_total: 280,
              missing_rates_installed_doors: 0,
            },
          ],
        };
      }
      if (url.includes("/api/v1/admin/reports/order-numbers-kpi")) {
        return {
          total: 1,
          limit: 20,
          offset: 0,
          items: [
            {
              order_number: "AZ-100",
              total_doors: 5,
              installed_doors: 3,
              not_installed_doors: 2,
              open_issues: 1,
              planned_revenue_total: 1200,
              installed_revenue_total: 720,
              payroll_total: 480,
              profit_total: 240,
              missing_rates_installed_doors: 0,
              completion_pct: 60,
            },
          ],
        };
      }
      if (url.includes("/api/v1/admin/outbox?status=FAILED")) {
        return {
          items: [
            {
              id: "9bd9204f-612f-44f2-be07-c6bc2a9f04ca",
              channel: "EMAIL",
              status: "FAILED",
              delivery_status: "FAILED",
              attempts: 5,
              max_attempts: 5,
              scheduled_at: "2026-02-22T17:45:00Z",
              created_at: "2026-02-22T17:40:00Z",
              last_error: "smtp unavailable",
            },
          ],
        };
      }
      if (url.includes("/api/v1/admin/reports/audit-catalogs")) {
        return {
          items: [
            {
              id: "2f262754-3cde-4ca9-a4d8-7852d680e4cf",
              created_at: "2026-02-22T17:30:00Z",
              entity_type: "door_type",
              action: "DOOR_TYPE_UPDATE",
              reason: "price sync",
            },
          ],
          summary: {
            total: 1,
            by_entity: { door_type: 1 },
            by_action: { DOOR_TYPE_UPDATE: 1 },
          },
        };
      }
      if (url.includes("/api/v1/admin/reports/audit-issues")) {
        return {
          items: [
            {
              id: "ca5ca6fd-5f60-43e6-a7bc-08114ef0f65f",
              created_at: "2026-02-22T17:31:00Z",
              entity_type: "issue",
              entity_id: "7f1b4874-2c5e-44b5-82ff-cbd89a8a2ca5",
              action: "ISSUE_WORKFLOW_UPDATE",
              reason: null,
              before: {
                workflow_state: "NEW",
                status: "OPEN",
              },
              after: {
                workflow_state: "IN_PROGRESS",
                status: "OPEN",
              },
            },
          ],
          summary: {
            total: 1,
            by_entity: { issue: 1 },
            by_action: { ISSUE_WORKFLOW_UPDATE: 1 },
          },
        };
      }
      if (url.includes("/api/v1/admin/outbox/") && url.includes("/retry")) {
        return {
          item: {
            id: "9bd9204f-612f-44f2-be07-c6bc2a9f04ca",
            channel: "EMAIL",
            status: "PENDING",
            delivery_status: "PENDING",
            attempts: 5,
            max_attempts: 6,
            scheduled_at: "2026-02-22T18:00:00Z",
            created_at: "2026-02-22T17:40:00Z",
            last_error: null,
          },
        };
      }
      if (url.includes("/api/v1/admin/reports/limit-alerts")) {
        const unread = init?.method === "POST" ? 0 : 2;
        return {
          items: [
            {
              id: "8fce56bd-d0a2-43cc-b4de-f1a53fcaab17",
              created_at: "2026-02-22T17:50:00Z",
              action: "PLAN_LIMIT_ALERT_DANGER_USERS",
              level: "DANGER",
              metric: "users",
              current: 10,
              max: 10,
              utilization_pct: 100,
              plan_code: "trial",
              is_unread: unread > 0,
            },
          ],
          unread_count: unread,
          last_read_at: unread > 0 ? null : "2026-02-22T18:00:00Z",
          limit: 20,
          offset: 0,
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
        <ReportsPage />
      </QueryClientProvider>
    );

    await waitFor(() => {
      const hasLimitAlertsCall = apiFetchMock.mock.calls.some((call) => {
        const url = String(call[0]);
        return url.includes("/api/v1/admin/reports/limit-alerts?limit=");
      });
      expect(hasLimitAlertsCall).toBe(true);
    });
    expect(screen.getByTestId("reports-dashboard-v3")).toBeInTheDocument();
    expect(screen.getAllByText("Reports cockpit").length).toBeGreaterThan(0);
    expect(screen.getByText("Attention this week")).toBeInTheDocument();
    expect(screen.getByText("Report library")).toBeInTheDocument();
    expect(screen.getByText("Saved views")).toBeInTheDocument();
    expect(screen.getByText("Scheduled exports")).toBeInTheDocument();
    expect(screen.getByText("Door financial exposure")).toBeInTheDocument();
    expect(screen.getByText("Risk concentration watch")).toBeInTheDocument();
    expect(screen.getAllByText("Installer scorecard").length).toBeGreaterThan(0);
    expect(screen.getByText("Failed Outbox Queue")).toBeInTheDocument();
    expect(screen.getAllByText("DOOR_TYPE_UPDATE").length).toBeGreaterThan(0);
    expect(screen.getAllByText("ISSUE_WORKFLOW_UPDATE").length).toBeGreaterThan(0);
    expect(screen.getByText("Operations Command Center")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Open Operations Center" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Open Actionable Ops" })
    ).toBeInTheDocument();
    expect(screen.getByText("Operations SLA")).toBeInTheDocument();
    // Server codes are shown in the reader's words, not the server's English titles and raw statuses.
    expect(screen.getByText("Retry failed imports")).toBeInTheDocument();
    expect(screen.getByText("Failed imports (24 h)")).toBeInTheDocument();
    expect(screen.queryByText("DANGER")).toBeNull();
    expect(screen.getByText("SLA Trend (last 30 days)")).toBeInTheDocument();
    expect(screen.getByText("Issues Analytics")).toBeInTheDocument();
    expect(screen.getByText("Project Plan vs Fact")).toBeInTheDocument();
    expect(screen.getByText("Margin Leakage")).toBeInTheDocument();
    expect(screen.getByText("Risk Concentration")).toBeInTheDocument();
    expect(screen.getByText("Delayed by Reason / Defect")).toBeInTheDocument();
    expect(screen.getByText("Add-on Profit Impact")).toBeInTheDocument();
    expect(screen.getByText("Project Risk Drill-down")).toBeInTheDocument();
    expect(screen.getByText("Project Margin Executive")).toBeInTheDocument();
    expect(screen.getByText("Installer Profitability Matrix")).toBeInTheDocument();
    expect(screen.getByText("Installer x Project Cross-view")).toBeInTheDocument();
    expect(screen.getByText("Top Margin Projects")).toBeInTheDocument();
    expect(screen.getByText("Low Margin / Risk Projects")).toBeInTheDocument();
    expect(screen.getByText("Installers KPI")).toBeInTheDocument();
    expect(screen.getByText("Installer Drill-down")).toBeInTheDocument();
    expect(screen.getByText("Order Numbers KPI")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export Executive CSV" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Preset" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Saved Presets" })).toBeInTheDocument();
    expect(screen.getAllByText("Installer Alpha").length).toBeGreaterThan(0);
    expect(screen.getAllByText("AZ-100").length).toBeGreaterThan(0);
    expect(screen.getByText("Top Failing Projects (7d import errors)")).toBeInTheDocument();
    expect(screen.getByText("Unread:")).toBeInTheDocument();
    expect(screen.getAllByText("2").length).toBeGreaterThan(0);

    await waitFor(() => {
      const hasInstallersKpiCall = apiFetchMock.mock.calls.some((call) => {
        const url = String(call[0]);
        return (
          url.includes("/api/v1/admin/reports/installers-kpi?") &&
          url.includes("sort_by=installed_doors") &&
          url.includes("sort_dir=desc")
        );
      });
      expect(hasInstallersKpiCall).toBe(true);
    });
    await waitFor(() => {
      const hasOrderKpiCall = apiFetchMock.mock.calls.some((call) => {
        const url = String(call[0]);
        return (
          url.includes("/api/v1/admin/reports/order-numbers-kpi?") &&
          url.includes("sort_by=total_doors") &&
          url.includes("sort_dir=desc")
        );
      });
      expect(hasOrderKpiCall).toBe(true);
    });
    await waitFor(() => {
      const hasProjectPlanFactCall = apiFetchMock.mock.calls.some((call) => {
        const url = String(call[0]);
        return url.includes("/api/v1/admin/reports/project-plan-fact/");
      });
      expect(hasProjectPlanFactCall).toBe(true);
    });
    expect(await screen.findByText("Additional Works Plan")).toBeInTheDocument();
    expect(await screen.findByText("Urgency Surcharge")).toBeInTheDocument();
    expect(await screen.findByText("Commercial Adjustments")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Open pricing flow" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Open urgency rows" })
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "Open payroll ledger" }).length
    ).toBeGreaterThanOrEqual(2);
    expect(
      await screen.findByRole("button", { name: "Open installer card" })
    ).toBeInTheDocument();
    expect((await screen.findAllByText("Handle Upgrade")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Client uplift").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Installer uplift").length).toBeGreaterThan(0);
    expect(await screen.findByText(/610[.,]00/)).toBeInTheDocument();
    expect(await screen.findByText(/285[.,]00/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open pricing flow" }));
    expect(pushMock).toHaveBeenCalledWith(
      "/projects?project_id=57f6df22-fe4b-47db-af44-198ab5f5a462&focus_section=addons"
    );
    fireEvent.click(screen.getByRole("button", { name: "Open urgency rows" }));
    expect(pushMock).toHaveBeenCalledWith(
      "/projects?project_id=57f6df22-fe4b-47db-af44-198ab5f5a462&focus_section=urgency"
    );
    const ledgerButtons = screen.getAllByRole("button", { name: "Open payroll ledger" });
    fireEvent.click(ledgerButtons[0]);
    expect(pushMock).toHaveBeenCalledWith(
      "/earnings-ledger?project_id=57f6df22-fe4b-47db-af44-198ab5f5a462"
    );
    fireEvent.click(ledgerButtons[1]);
    expect(pushMock).toHaveBeenCalledWith(
      "/earnings-ledger?installer_id=6ac2c77d-f5f2-45d8-b0a3-6382dbd95fbf"
    );
    fireEvent.click(screen.getByRole("button", { name: "Open installer card" }));
    expect(pushMock).toHaveBeenCalledWith(
      "/installers?installer_id=6ac2c77d-f5f2-45d8-b0a3-6382dbd95fbf"
    );
    await waitFor(() => {
      const hasProjectAddonPlanCall = apiFetchMock.mock.calls.some((call) => {
        const url = String(call[0]);
        return url.includes("/api/v1/admin/projects/57f6df22-fe4b-47db-af44-198ab5f5a462/addons/plan");
      });
      expect(hasProjectAddonPlanCall).toBe(true);
    });
    await waitFor(() => {
      const hasProjectUrgencyCall = apiFetchMock.mock.calls.some((call) => {
        const url = String(call[0]);
        return url.includes("/api/v1/admin/projects/57f6df22-fe4b-47db-af44-198ab5f5a462/urgency-surcharges");
      });
      expect(hasProjectUrgencyCall).toBe(true);
    });
    await waitFor(() => {
      const hasIssuesAddonsImpactCall = apiFetchMock.mock.calls.some((call) => {
        const url = String(call[0]);
        return url.includes("/api/v1/admin/reports/issues-addons-impact");
      });
      expect(hasIssuesAddonsImpactCall).toBe(true);
    });
    await waitFor(() => {
      const hasRiskConcentrationCall = apiFetchMock.mock.calls.some((call) => {
        const url = String(call[0]);
        return url.includes("/api/v1/admin/reports/risk-concentration");
      });
      expect(hasRiskConcentrationCall).toBe(true);
    });
    await waitFor(() => {
      const hasProjectRiskDrilldownCall = apiFetchMock.mock.calls.some((call) => {
        const url = String(call[0]);
        return url.includes("/api/v1/admin/reports/project-risk-drilldown/");
      });
      expect(hasProjectRiskDrilldownCall).toBe(true);
    });
    await waitFor(() => {
      const hasInstallerProjectProfitabilityCall = apiFetchMock.mock.calls.some((call) => {
        const url = String(call[0]);
        return url.includes("/api/v1/admin/reports/installer-project-profitability");
      });
      expect(hasInstallerProjectProfitabilityCall).toBe(true);
    });
    await waitFor(() => {
      const hasInstallerDetailsCall = apiFetchMock.mock.calls.some((call) => {
        const url = String(call[0]);
        return url.includes("/api/v1/admin/reports/installers-kpi/");
      });
      expect(hasInstallerDetailsCall).toBe(true);
    });
    await waitFor(() => {
      const hasTopMarginCall = apiFetchMock.mock.calls.some((call) => {
        const url = String(call[0]);
        return (
          url.includes("/api/v1/admin/reports/projects-margin?") &&
          url.includes("sort_dir=desc")
        );
      });
      const hasRiskMarginCall = apiFetchMock.mock.calls.some((call) => {
        const url = String(call[0]);
        return (
          url.includes("/api/v1/admin/reports/projects-margin?") &&
          url.includes("sort_dir=asc")
        );
      });
      expect(hasTopMarginCall).toBe(true);
      expect(hasRiskMarginCall).toBe(true);
    });
    expect((await screen.findAllByText("60.00%")).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/3,?200\.00/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/1,?800\.00/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/1,?060\.00/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Ashdod Tower A").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Ashdod Tower B").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Site Blocked").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Handle Upgrade").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Blocked Site").length).toBeGreaterThan(0);
    expect(screen.getAllByText("BZ-400").length).toBeGreaterThan(0);
    expect(screen.getAllByText("RC-100").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Installer Beta").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Strong").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Risk").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Watch").length).toBeGreaterThan(0);

    // Tiers: one page, three readers. "People" hides the operations sections and is remembered.
    const switcher = screen.getByTestId("reports-tier-switch");
    // (the library and insight cards at the top name every section, so sections are checked by id)
    fireEvent.click(within(switcher).getByRole("button", { name: "People" }));
    expect(document.getElementById("reports-installers-kpi")).not.toBeNull();
    expect(document.getElementById("reports-operations-center")).toBeNull();
    expect(document.getElementById("reports-delivery-risk")).toBeNull();
    expect(window.localStorage.getItem("dmx.reports.tier")).toBe("people");
    fireEvent.click(within(switcher).getByRole("button", { name: "Operations" }));
    expect(document.getElementById("reports-operations-center")).not.toBeNull();
    expect(document.getElementById("reports-installers-kpi")).toBeNull();
    fireEvent.click(within(switcher).getByRole("button", { name: "Everything" }));
    expect(document.getElementById("reports-installers-kpi")).not.toBeNull();
    expect(document.getElementById("reports-operations-center")).not.toBeNull();
    window.localStorage.removeItem("dmx.reports.tier");
  }, 45000);

  it("shows readable success notice after executive export", async () => {
    if (!("createObjectURL" in URL)) {
      Object.defineProperty(URL, "createObjectURL", {
        writable: true,
        configurable: true,
        value: vi.fn(),
      });
    }
    if (!("revokeObjectURL" in URL)) {
      Object.defineProperty(URL, "revokeObjectURL", {
        writable: true,
        configurable: true,
        value: vi.fn(),
      });
    }
    const createObjectUrlSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:reports-executive");
    const revokeObjectUrlSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      createDownloadResponse("id,value\n1,42", "text/csv", {
        status: 200,
        headers: {
          "content-disposition": 'attachment; filename="executive.csv"',
        },
      })
    );

    apiFetchMock.mockImplementation(async (path: string) => {
      const url = String(path);
      const webhookMock = mockReportWebhookSignals(url);
      if (webhookMock) return webhookMock;
      const retryAuditMock = mockReportRetryAudits(url);
      if (retryAuditMock) return retryAuditMock;
      if (url.includes("/api/v1/admin/reports/limit-alerts")) {
        return { items: [], unread_count: 0, total: 0 };
      }
      if (url.includes("/api/v1/admin/reports/delivery")) {
        return {
          period_from: null,
          period_to: null,
          whatsapp_pending: 0,
          whatsapp_delivered: 0,
          whatsapp_failed: 0,
          email_sent: 0,
          email_failed: 0,
        };
      }
      if (url.includes("/api/v1/admin/outbox/summary")) {
        return { total: 0, by_channel: {}, by_status: {}, by_delivery_status: {}, pending_overdue_15m: 0, failed_total: 0 };
      }
      if (url.includes("/api/v1/admin/reports/operations-center")) {
        return {
          generated_at: "2026-02-22T18:01:00Z",
          imports: { window_hours: 24, total_runs: 0, analyze_runs: 0, import_runs: 0, retry_runs: 0, success_runs: 0, partial_runs: 0, failed_runs: 0, empty_runs: 0 },
          outbox: { total: 0, failed_total: 0, pending_overdue_15m: 0, by_channel: {} },
          alerts: { unread_count: 0, total_last_24h: 0, warn_last_24h: 0, danger_last_24h: 0, latest_created_at: null },
          top_failing_projects: [],
        };
      }
      if (url.includes("/api/v1/admin/reports/operations-sla/history")) return { points: [], summary: null };
      if (url.includes("/api/v1/admin/reports/operations-sla")) return { metrics: [], playbooks: [] };
      if (url.includes("/api/v1/admin/reports/issues-analytics")) {
        return {
          generated_at: "2026-02-22T18:04:00Z",
          days: 30,
          summary: {
            total_issues: 0,
            open_issues: 0,
            closed_issues: 0,
            overdue_open_issues: 0,
            blocked_open_issues: 0,
            p1_open_issues: 0,
            overdue_open_rate_pct: 0,
            mttr_hours: 0,
            mttr_p50_hours: 0,
            mttr_sample_size: 0,
            backlog_by_workflow: {},
            backlog_by_priority: {},
          },
          trend: [],
        };
      }
      if (url.includes("/api/v1/admin/reports/issues-addons-impact")) return { items: [] };
      if (url.includes("/api/v1/admin/reports/risk-concentration")) {
        return {
          summary: {
            delayed_profit_total: 0,
            open_issue_profit_at_risk: 0,
            blocked_issue_profit_at_risk: 0,
            worst_installer_profit_total: 0,
            risky_projects: 0,
            risky_orders: 0,
            worst_project_profit_total: 0,
            risky_installers: 0,
            worst_order_profit_total: 0,
          },
          projects: [],
          orders: [],
          installers: [],
        };
      }
      if (url.includes("/api/v1/admin/reports/installers-profitability-matrix")) return { items: [] };
      if (url.includes("/api/v1/admin/reports/installer-project-profitability")) return { items: [] };
      if (url.includes("/api/v1/admin/projects?")) return { items: [{ id: "project-1", name: "Ashdod Tower A" }] };
      if (url.includes("/api/v1/admin/reports/project-plan-fact/")) {
        return {
          project_id: "project-1",
          total_doors: 0,
          installed_doors: 0,
          not_installed_doors: 0,
          completion_pct: 0,
          open_issues: 0,
          planned_revenue_total: 0,
          actual_revenue_total: 0,
          revenue_gap_total: 0,
          planned_payroll_total: 0,
          actual_payroll_total: 0,
          payroll_gap_total: 0,
          planned_profit_total: 0,
          actual_profit_total: 0,
          profit_gap_total: 0,
          planned_addons_qty: 0,
          actual_addons_qty: 0,
          urgency_surcharges_count: 0,
          urgency_order_surcharges_count: 0,
          urgency_client_total: 0,
          urgency_installer_total: 0,
          urgency_profit_total: 0,
          missing_planned_rates_doors: 0,
          missing_actual_rates_doors: 0,
          missing_addon_plans_facts: 0,
        };
      }
      if (url.includes("/api/v1/admin/projects/project-1/addons/plan")) return { items: [] };
      if (url.includes("/api/v1/admin/projects/project-1/urgency-surcharges")) return { items: [] };
      if (url.includes("/api/v1/admin/reports/project-risk-drilldown/")) {
        return {
          generated_at: "2026-02-22T18:01:00Z",
          project_id: "project-1",
          project_name: "Ashdod Tower A",
          summary: {
            total_doors: 0, installed_doors: 0, not_installed_doors: 0, completion_pct: 0, open_issues: 0, blocked_open_issues: 0,
            planned_revenue_total: 0, actual_revenue_total: 0, revenue_gap_total: 0, planned_profit_total: 0, actual_profit_total: 0, profit_gap_total: 0,
            actual_margin_pct: 0, delayed_revenue_total: 0, delayed_profit_total: 0, blocked_issue_profit_at_risk: 0, addon_revenue_total: 0, addon_profit_total: 0,
            urgency_surcharges_count: 0, urgency_order_surcharges_count: 0, urgency_client_total: 0, urgency_installer_total: 0, urgency_profit_total: 0,
            missing_planned_rates_doors: 0, missing_actual_rates_doors: 0, missing_addon_plans_facts: 0,
          },
          drivers: [], top_reasons: [], risky_orders: [],
        };
      }
      if (url.includes("/api/v1/admin/reports/projects-margin")) return { items: [] };
      if (url.includes("/api/v1/admin/reports/installers-kpi")) return { items: [], total: 0 };
      if (url.includes("/api/v1/admin/reports/order-numbers-kpi")) return { items: [], total: 0 };
      if (url.includes("/api/v1/admin/reports/audit-catalogs")) return { items: [], summary: { total: 0 } };
      if (url.includes("/api/v1/admin/reports/audit-issues")) return { items: [], summary: { total: 0 } };
      if (url.includes("/api/v1/admin/outbox?status=FAILED")) return { items: [] };
      throw new Error(`Unexpected path: ${url}`);
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ReportsPage />
      </QueryClientProvider>
    );

    fireEvent.click(await screen.findByRole("button", { name: "Export Executive CSV" }));

    expect(await screen.findByText("Executive export is ready.")).toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalled();
    expect(createObjectUrlSpy).toHaveBeenCalled();
    expect(revokeObjectUrlSpy).toHaveBeenCalled();
  }, 20000);

  it("navigates from reports into operations center variants", async () => {
    apiFetchMock.mockImplementation(async (path: string) => {
      const url = String(path);
      const webhookMock = mockReportWebhookSignals(url);
      if (webhookMock) {
        return webhookMock;
      }
      const retryAuditMock = mockReportRetryAudits(url);
      if (retryAuditMock) {
        return retryAuditMock;
      }
      if (url.includes("/api/v1/admin/reports/limit-alerts/read")) {
        return { unread_count: 0, last_read_at: "2026-02-22T18:00:00Z" };
      }
      if (url.includes("/api/v1/admin/reports/delivery")) {
        return {
          period_from: null,
          period_to: null,
          whatsapp_pending: 1,
          whatsapp_delivered: 5,
          whatsapp_failed: 2,
          email_sent: 3,
          email_failed: 1,
        };
      }
      if (url.includes("/api/v1/admin/outbox/summary")) {
        return {
          total: 8,
          by_channel: { EMAIL: 4, WHATSAPP: 4 },
          by_status: { PENDING: 2, FAILED: 1, SENT: 5 },
          by_delivery_status: { PENDING: 2, FAILED: 1, DELIVERED: 5 },
          pending_overdue_15m: 1,
          failed_total: 1,
        };
      }
      if (url.includes("/api/v1/admin/reports/operations-center")) {
        return {
          generated_at: "2026-02-22T18:01:00Z",
          imports: {
            window_hours: 24,
            total_runs: 5,
            analyze_runs: 1,
            import_runs: 3,
            retry_runs: 1,
            success_runs: 3,
            partial_runs: 1,
            failed_runs: 1,
            empty_runs: 0,
          },
          outbox: {
            total: 8,
            failed_total: 1,
            pending_overdue_15m: 1,
            by_channel: { EMAIL: 4, WHATSAPP: 4 },
          },
          alerts: {
            unread_count: 2,
            total_last_24h: 3,
            warn_last_24h: 2,
            danger_last_24h: 1,
            latest_created_at: "2026-02-22T17:50:00Z",
          },
          top_failing_projects: [],
        };
      }
      if (url.includes("/api/v1/admin/reports/operations-sla/history")) {
        return {
          generated_at: "2026-02-22T18:03:00Z",
          days: 30,
          points: [],
          summary: {
            ok_days: 20,
            warn_days: 7,
            danger_days: 3,
            current_status: "DANGER",
            delta_import_failure_rate_pct: 33.3,
            delta_outbox_failed_rate_pct: 25,
            delta_danger_alerts_count: 1,
          },
        };
      }
      if (url.includes("/api/v1/admin/reports/operations-sla")) {
        return {
          generated_at: "2026-02-22T18:02:00Z",
          overall_status: "DANGER",
          metrics: [],
          playbooks: [],
        };
      }
      if (url.includes("/api/v1/admin/reports/issues-analytics")) {
        return {
          generated_at: "2026-02-22T18:04:00Z",
          days: 30,
          summary: {
            total_issues: 0,
            open_issues: 0,
            closed_issues: 0,
            overdue_open_issues: 0,
            blocked_open_issues: 0,
            p1_open_issues: 0,
            overdue_open_rate_pct: 0,
            mttr_hours: 0,
            mttr_p50_hours: 0,
            mttr_sample_size: 0,
            backlog_by_workflow: {},
            backlog_by_priority: {},
          },
          trend: [],
        };
      }
      if (url.includes("/api/v1/admin/reports/issues-addons-impact")) {
        return {
          generated_at: "2026-02-22T18:04:00Z",
          summary: {
            open_issues: 0,
            blocked_open_issues: 0,
            not_installed_doors: 0,
            open_issue_revenue_at_risk: 0,
            open_issue_payroll_at_risk: 0,
            open_issue_profit_at_risk: 0,
            blocked_issue_profit_at_risk: 0,
            delayed_revenue_total: 0,
            delayed_payroll_total: 0,
            delayed_profit_total: 0,
            addon_revenue_total: 0,
            addon_payroll_total: 0,
            addon_profit_total: 0,
            missing_addon_plans_facts: 0,
          },
          top_reasons: [],
          addon_impact: [],
        };
      }
      if (url.includes("/api/v1/admin/reports/risk-concentration")) {
        return {
          generated_at: "2026-02-22T18:04:00Z",
          summary: {
            open_issue_profit_at_risk: 0,
            blocked_issue_profit_at_risk: 0,
            delayed_profit_total: 0,
            risky_projects: 0,
            risky_orders: 0,
            risky_installers: 0,
            worst_project_profit_total: 0,
            worst_order_profit_total: 0,
            worst_installer_profit_total: 0,
          },
          projects: [],
          orders: [],
          installers: [],
        };
      }
      if (url.includes("/api/v1/admin/reports/installers-profitability-matrix")) {
        return { total: 0, limit: 8, offset: 0, items: [] };
      }
      if (url.includes("/api/v1/admin/reports/installer-project-profitability")) {
        return { total: 0, limit: 10, offset: 0, items: [] };
      }
      if (url.includes("/api/v1/admin/projects?limit=200")) {
        return { items: [] };
      }
      if (url.includes("/api/v1/admin/reports/projects-margin?")) {
        return { total: 0, limit: 5, offset: 0, items: [] };
      }
      if (url.includes("/api/v1/admin/reports/installers-kpi?")) {
        return { period_from: null, period_to: null, items: [] };
      }
      if (url.includes("/api/v1/admin/reports/order-numbers-kpi?")) {
        return { total: 0, limit: 20, offset: 0, items: [] };
      }
      if (url.includes("/api/v1/admin/outbox?status=FAILED")) {
        return { items: [] };
      }
      if (url.includes("/api/v1/admin/reports/audit-catalogs")) {
        return { items: [], summary: { total: 0, by_entity: {}, by_action: {} } };
      }
      if (url.includes("/api/v1/admin/reports/audit-issues")) {
        return { items: [], summary: { total: 0, by_entity: {}, by_action: {} } };
      }
      throw new Error(`Unexpected path: ${url}`);
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ReportsPage />
      </QueryClientProvider>
    );

    expect(await screen.findByText("Operations Command Center")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open Operations Center" }));
    expect(pushMock).toHaveBeenCalledWith("/operations");

    fireEvent.click(screen.getByRole("button", { name: "Open Actionable Ops" }));
    expect(pushMock).toHaveBeenCalledWith("/operations?actionable=1");
  }, 15000);

  it("loads focused reports view from operations deep-link", async () => {
    window.history.replaceState(
      {},
      "",
      "/reports?focus=delivery&ops_preset=delivery-risk&delivery_channel=EMAIL&webhook_provider=sendgrid"
    );

    apiFetchMock.mockImplementation(async (path: string) => {
      const url = String(path);
      const webhookMock = mockReportWebhookSignals(url);
      if (webhookMock) {
        return webhookMock;
      }
      const retryAuditMock = mockReportRetryAudits(url);
      if (retryAuditMock) {
        return retryAuditMock;
      }
      if (url.includes("/api/v1/admin/reports/limit-alerts/read")) {
        return { unread_count: 0, last_read_at: "2026-02-22T18:00:00Z" };
      }
      if (url.includes("/api/v1/admin/reports/delivery")) {
        return {
          period_from: null,
          period_to: null,
          whatsapp_pending: 1,
          whatsapp_delivered: 5,
          whatsapp_failed: 2,
          email_sent: 3,
          email_failed: 1,
        };
      }
      if (url.includes("/api/v1/admin/outbox/summary")) {
        return {
          total: 8,
          by_channel: { EMAIL: 4, WHATSAPP: 4 },
          by_status: { PENDING: 2, FAILED: 1, SENT: 5 },
          by_delivery_status: { PENDING: 2, FAILED: 1, DELIVERED: 5 },
          pending_overdue_15m: 1,
          failed_total: 1,
        };
      }
      if (url.includes("/api/v1/admin/reports/operations-center")) {
        return {
          generated_at: "2026-02-22T18:01:00Z",
          imports: {
            window_hours: 24,
            total_runs: 5,
            analyze_runs: 1,
            import_runs: 3,
            retry_runs: 1,
            success_runs: 3,
            partial_runs: 1,
            failed_runs: 1,
            empty_runs: 0,
          },
          outbox: {
            total: 8,
            failed_total: 1,
            pending_overdue_15m: 1,
            by_channel: { EMAIL: 4, WHATSAPP: 4 },
          },
          alerts: {
            unread_count: 2,
            total_last_24h: 3,
            warn_last_24h: 2,
            danger_last_24h: 1,
            latest_created_at: "2026-02-22T17:50:00Z",
          },
          top_failing_projects: [],
        };
      }
      if (url.includes("/api/v1/admin/reports/operations-sla/history")) {
        return {
          generated_at: "2026-02-22T18:03:00Z",
          days: 30,
          points: [],
          summary: {
            ok_days: 20,
            warn_days: 7,
            danger_days: 3,
            current_status: "DANGER",
            delta_import_failure_rate_pct: 33.3,
            delta_outbox_failed_rate_pct: 25,
            delta_danger_alerts_count: 1,
          },
        };
      }
      if (url.includes("/api/v1/admin/reports/operations-sla")) {
        return {
          generated_at: "2026-02-22T18:02:00Z",
          overall_status: "DANGER",
          metrics: [],
          playbooks: [],
        };
      }
      if (url.includes("/api/v1/admin/reports/issues-analytics")) {
        return {
          generated_at: "2026-02-22T18:04:00Z",
          days: 30,
          summary: {
            total_issues: 0,
            open_issues: 0,
            closed_issues: 0,
            overdue_open_issues: 0,
            blocked_open_issues: 0,
            p1_open_issues: 0,
            overdue_open_rate_pct: 0,
            mttr_hours: 0,
            mttr_p50_hours: 0,
            mttr_sample_size: 0,
            backlog_by_workflow: {},
            backlog_by_priority: {},
          },
          trend: [],
        };
      }
      if (url.includes("/api/v1/admin/reports/issues-addons-impact")) {
        return {
          generated_at: "2026-02-22T18:04:00Z",
          summary: {
            open_issues: 0,
            blocked_open_issues: 0,
            not_installed_doors: 0,
            open_issue_revenue_at_risk: 0,
            open_issue_payroll_at_risk: 0,
            open_issue_profit_at_risk: 0,
            blocked_issue_profit_at_risk: 0,
            delayed_revenue_total: 0,
            delayed_payroll_total: 0,
            delayed_profit_total: 0,
            addon_revenue_total: 0,
            addon_payroll_total: 0,
            addon_profit_total: 0,
            missing_addon_plans_facts: 0,
          },
          top_reasons: [],
          addon_impact: [],
        };
      }
      if (url.includes("/api/v1/admin/reports/risk-concentration")) {
        return {
          generated_at: "2026-02-22T18:04:00Z",
          summary: {
            open_issue_profit_at_risk: 0,
            blocked_issue_profit_at_risk: 0,
            delayed_profit_total: 0,
            risky_projects: 0,
            risky_orders: 0,
            risky_installers: 0,
            worst_project_profit_total: 0,
            worst_order_profit_total: 0,
            worst_installer_profit_total: 0,
          },
          projects: [],
          orders: [],
          installers: [],
        };
      }
      if (url.includes("/api/v1/admin/reports/installers-profitability-matrix")) {
        return { total: 0, limit: 8, offset: 0, items: [] };
      }
      if (url.includes("/api/v1/admin/reports/installer-project-profitability")) {
        return { total: 0, limit: 10, offset: 0, items: [] };
      }
      if (url.includes("/api/v1/admin/projects?limit=200")) {
        return { items: [] };
      }
      if (url.includes("/api/v1/admin/reports/projects-margin?")) {
        return { total: 0, limit: 5, offset: 0, items: [] };
      }
      if (url.includes("/api/v1/admin/reports/installers-kpi?")) {
        return { period_from: null, period_to: null, items: [] };
      }
      if (url.includes("/api/v1/admin/reports/order-numbers-kpi?")) {
        return { total: 0, limit: 20, offset: 0, items: [] };
      }
      if (url.includes("/api/v1/admin/outbox?status=FAILED")) {
        return { items: [] };
      }
      if (url.includes("/api/v1/admin/reports/audit-catalogs")) {
        return { items: [], summary: { total: 0, by_entity: {}, by_action: {} } };
      }
      if (url.includes("/api/v1/admin/reports/audit-issues")) {
        return { items: [], summary: { total: 0, by_entity: {}, by_action: {} } };
      }
      throw new Error(`Unexpected path: ${url}`);
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ReportsPage />
      </QueryClientProvider>
    );

    const focusBannerText = await screen.findByText("Focused from Operations: delivery risk");
    const focusBanner = focusBannerText.closest("div.rounded-lg");
    expect(focusBanner).not.toBeNull();
    const focusQueries = within(focusBanner as HTMLElement);
    expect(
      focusQueries.getByText("Operations preset: delivery risk. Short-range delivery view for failed outbox and communication pressure.")
    ).toBeInTheDocument();
    expect(await screen.findByText("SLA Trend (last 7 days)")).toBeInTheDocument();

    expect(focusQueries.getByRole("button", { name: "Open Actionable Ops" })).toBeInTheDocument();
    expect(focusQueries.getByRole("button", { name: "Open Journal Queue" })).toBeInTheDocument();
    expect(await screen.findByText("Delivery Scope")).toBeInTheDocument();
    expect(screen.getByText("Channel:")).toBeInTheDocument();
    expect(screen.getAllByText("EMAIL").length).toBeGreaterThan(0);
    expect(screen.getAllByText("sendgrid").length).toBeGreaterThan(0);
    expect(screen.getByText("sendgrid | duplicate")).toBeInTheDocument();
    expect(screen.getByText("Recovery trail")).toBeInTheDocument();
    expect(screen.getByText("Outbox outbox-1")).toBeInTheDocument();
    expect(screen.getByText(/actor admin-1/)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Open recovery lane" }).length).toBeGreaterThan(0);

    fireEvent.click(focusQueries.getByRole("button", { name: "Open Actionable Ops" }));
    expect(pushMock).toHaveBeenCalledWith(
      "/operations?actionable=1&delivery_channel=EMAIL&webhook_provider=sendgrid"
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Open recovery lane" })[0]);
    expect(pushMock).toHaveBeenCalledWith(
      "/operations?actionable=1&delivery_channel=EMAIL&webhook_provider=sendgrid"
    );

    fireEvent.click(focusQueries.getByRole("button", { name: "Open Journal Queue" }));
    expect(pushMock).toHaveBeenCalledWith("/journal");

    fireEvent.click(focusQueries.getByRole("button", { name: "Clear focus" }));
    expect(pushMock).toHaveBeenCalledWith("/reports");
  }, 15000);

  it("applies exact project scope from operations queue links", async () => {
    window.history.replaceState(
      {},
      "",
      "/reports?focus=operations&ops_preset=failed-imports&project_id=project-1"
    );

    apiFetchMock.mockImplementation(async (path: string) => {
      const url = String(path);
      const webhookMock = mockReportWebhookSignals(url);
      if (webhookMock) {
        return webhookMock;
      }
      const retryAuditMock = mockReportRetryAudits(url);
      if (retryAuditMock) {
        return retryAuditMock;
      }
      if (url.includes("/api/v1/admin/reports/limit-alerts/read")) {
        return { unread_count: 0, last_read_at: "2026-02-22T18:00:00Z" };
      }
      if (url.includes("/api/v1/admin/reports/delivery")) {
        return {
          period_from: null,
          period_to: null,
          whatsapp_pending: 1,
          whatsapp_delivered: 5,
          whatsapp_failed: 2,
          email_sent: 3,
          email_failed: 1,
        };
      }
      if (url.includes("/api/v1/admin/outbox/summary")) {
        return {
          total: 8,
          by_channel: { EMAIL: 4, WHATSAPP: 4 },
          by_status: { PENDING: 2, FAILED: 1, SENT: 5 },
          by_delivery_status: { PENDING: 2, FAILED: 1, DELIVERED: 5 },
          pending_overdue_15m: 1,
          failed_total: 1,
        };
      }
      if (url.includes("/api/v1/admin/reports/operations-center")) {
        return {
          generated_at: "2026-02-22T18:01:00Z",
          imports: {
            window_hours: 24,
            total_runs: 5,
            analyze_runs: 1,
            import_runs: 3,
            retry_runs: 1,
            success_runs: 3,
            partial_runs: 1,
            failed_runs: 1,
            empty_runs: 0,
          },
          outbox: {
            total: 8,
            failed_total: 1,
            pending_overdue_15m: 1,
            by_channel: { EMAIL: 4, WHATSAPP: 4 },
          },
          alerts: {
            unread_count: 2,
            total_last_24h: 3,
            warn_last_24h: 2,
            danger_last_24h: 1,
            latest_created_at: "2026-02-22T17:50:00Z",
          },
          top_failing_projects: [
            {
              project_id: "project-1",
              project_name: "Ashdod Towers",
              failure_runs: 2,
              last_run_at: "2026-02-22T17:40:00Z",
            },
          ],
        };
      }
      if (url.includes("/api/v1/admin/reports/operations-sla/history?days=7")) {
        return {
          generated_at: "2026-02-22T18:03:00Z",
          days: 7,
          points: [],
          summary: {
            ok_days: 5,
            warn_days: 1,
            danger_days: 1,
            current_status: "DANGER",
            delta_import_failure_rate_pct: 33.3,
            delta_outbox_failed_rate_pct: 25,
            delta_danger_alerts_count: 1,
          },
        };
      }
      if (url.includes("/api/v1/admin/reports/operations-sla")) {
        return {
          generated_at: "2026-02-22T18:02:00Z",
          overall_status: "DANGER",
          metrics: [],
          playbooks: [],
        };
      }
      if (url.includes("/api/v1/admin/reports/issues-analytics")) {
        return {
          generated_at: "2026-02-22T18:04:00Z",
          days: 30,
          summary: {
            total_issues: 0,
            open_issues: 0,
            closed_issues: 0,
            overdue_open_issues: 0,
            blocked_open_issues: 0,
            p1_open_issues: 0,
            overdue_open_rate_pct: 0,
            mttr_hours: 0,
            mttr_p50_hours: 0,
            mttr_sample_size: 0,
            backlog_by_workflow: {},
            backlog_by_priority: {},
          },
          trend: [],
        };
      }
      if (url.includes("/api/v1/admin/reports/issues-addons-impact")) {
        return {
          generated_at: "2026-02-22T18:04:00Z",
          summary: {
            open_issues: 0,
            blocked_open_issues: 0,
            not_installed_doors: 0,
            open_issue_revenue_at_risk: 0,
            open_issue_payroll_at_risk: 0,
            open_issue_profit_at_risk: 0,
            blocked_issue_profit_at_risk: 0,
            delayed_revenue_total: 0,
            delayed_payroll_total: 0,
            delayed_profit_total: 0,
            addon_revenue_total: 0,
            addon_payroll_total: 0,
            addon_profit_total: 0,
            missing_addon_plans_facts: 0,
          },
          top_reasons: [],
          addon_impact: [],
        };
      }
      if (url.includes("/api/v1/admin/reports/risk-concentration")) {
        return {
          generated_at: "2026-02-22T18:04:00Z",
          summary: {
            open_issue_profit_at_risk: 0,
            blocked_issue_profit_at_risk: 0,
            delayed_profit_total: 0,
            risky_projects: 0,
            risky_orders: 0,
            risky_installers: 0,
            worst_project_profit_total: 0,
            worst_order_profit_total: 0,
            worst_installer_profit_total: 0,
          },
          projects: [],
          orders: [],
          installers: [],
        };
      }
      if (url.includes("/api/v1/admin/reports/installers-profitability-matrix")) {
        return { total: 0, limit: 8, offset: 0, items: [] };
      }
      if (url.includes("/api/v1/admin/reports/installer-project-profitability")) {
        return { total: 0, limit: 10, offset: 0, items: [] };
      }
      if (url.includes("/api/v1/admin/projects?limit=200") || url.endsWith("/api/v1/admin/projects")) {
        return { items: [{ id: "project-1", name: "Ashdod Towers" }] };
      }
      if (url.includes("/api/v1/admin/reports/project-plan-fact/")) {
        return {
          project_id: "project-1",
          total_doors: 10,
          installed_doors: 6,
          not_installed_doors: 4,
          open_issues: 2,
          completion_pct: 60,
          planned_revenue_total: 1000,
          actual_revenue_total: 900,
          revenue_gap_total: -100,
          planned_payroll_total: 500,
          actual_payroll_total: 450,
          payroll_gap_total: -50,
          planned_profit_total: 500,
          actual_profit_total: 450,
          profit_gap_total: -50,
          planned_addons_qty: 2,
          actual_addons_qty: 1,
          urgency_surcharges_count: 0,
          urgency_order_surcharges_count: 0,
          urgency_client_total: 0,
          urgency_installer_total: 0,
          urgency_profit_total: 0,
          missing_planned_rates_doors: 0,
          missing_actual_rates_doors: 0,
          missing_addon_plans_facts: 0,
        };
      }
      if (url.includes("/api/v1/admin/reports/project-risk-drilldown/")) {
        return {
          generated_at: "2026-02-22T18:04:00Z",
          project_id: "project-1",
          project_name: "Ashdod Towers",
          summary: {
            total_doors: 10,
            installed_doors: 6,
            not_installed_doors: 4,
            completion_pct: 60,
            open_issues: 2,
            blocked_open_issues: 1,
            planned_revenue_total: 1000,
            actual_revenue_total: 900,
            revenue_gap_total: -100,
            planned_profit_total: 500,
            actual_profit_total: 450,
            profit_gap_total: -50,
            actual_margin_pct: 50,
            delayed_revenue_total: 100,
            delayed_profit_total: 50,
            blocked_issue_profit_at_risk: 25,
            addon_revenue_total: 40,
            addon_profit_total: 20,
            urgency_surcharges_count: 0,
            urgency_order_surcharges_count: 0,
            urgency_client_total: 0,
            urgency_installer_total: 0,
            urgency_profit_total: 0,
            missing_planned_rates_doors: 0,
            missing_actual_rates_doors: 0,
            missing_addon_plans_facts: 0,
          },
          drivers: [],
          top_reasons: [],
          risky_orders: [],
        };
      }
      if (url.includes("/api/v1/admin/reports/projects-margin?")) {
        return { total: 0, limit: 5, offset: 0, items: [] };
      }
      if (url.includes("/api/v1/admin/reports/installers-kpi?")) {
        return { period_from: null, period_to: null, items: [] };
      }
      if (url.includes("/api/v1/admin/reports/order-numbers-kpi")) {
        return { total: 0, limit: 20, offset: 0, items: [] };
      }
      if (url.includes("/api/v1/admin/outbox?status=FAILED")) {
        return { items: [] };
      }
      if (url.includes("/api/v1/admin/reports/audit-catalogs")) {
        return { items: [], summary: { total: 0, by_entity: {}, by_action: {} } };
      }
      if (url.includes("/api/v1/admin/reports/audit-issues")) {
        return { items: [], summary: { total: 0, by_entity: {}, by_action: {} } };
      }
      throw new Error(`Unexpected path: ${url}`);
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ReportsPage />
      </QueryClientProvider>
    );

    expect(await screen.findByText("Scoped project: project-1")).toBeInTheDocument();
    expect(await screen.findByText("SLA Trend (last 7 days)")).toBeInTheDocument();
    expect(screen.getByLabelText("Project Plan Fact Filter")).toHaveValue("project-1");
    expect(screen.getByLabelText("Project Risk Drilldown Filter")).toHaveValue("project-1");
    expect(screen.getByLabelText("Order Project Filter")).toHaveValue("project-1");
  });

  it("does not switch project reports to another project when scoped project is unavailable", async () => {
    window.history.replaceState({}, "", "/reports?project_id=missing-project");

    apiFetchMock.mockImplementation(async (path: string) => {
      const url = String(path);
      const webhookMock = mockReportWebhookSignals(url);
      if (webhookMock) {
        return webhookMock;
      }
      const retryAuditMock = mockReportRetryAudits(url);
      if (retryAuditMock) {
        return retryAuditMock;
      }
      if (url.includes("/api/v1/admin/reports/limit-alerts/read")) {
        return { unread_count: 0, last_read_at: "2026-02-22T18:00:00Z" };
      }
      if (url.includes("/api/v1/admin/reports/delivery")) {
        return {
          period_from: null,
          period_to: null,
          whatsapp_pending: 0,
          whatsapp_delivered: 0,
          whatsapp_failed: 0,
          email_sent: 0,
          email_failed: 0,
        };
      }
      if (url.includes("/api/v1/admin/outbox/summary")) {
        return {
          total: 0,
          by_channel: {},
          by_status: {},
          by_delivery_status: {},
          pending_overdue_15m: 0,
          failed_total: 0,
        };
      }
      if (url.includes("/api/v1/admin/reports/operations-center")) {
        return {
          generated_at: "2026-02-22T18:01:00Z",
          imports: {
            window_hours: 24,
            total_runs: 0,
            analyze_runs: 0,
            import_runs: 0,
            retry_runs: 0,
            success_runs: 0,
            partial_runs: 0,
            failed_runs: 0,
            empty_runs: 0,
          },
          outbox: {
            total: 0,
            failed_total: 0,
            pending_overdue_15m: 0,
            by_channel: {},
          },
          alerts: {
            unread_count: 0,
            total_last_24h: 0,
            warn_last_24h: 0,
            danger_last_24h: 0,
            latest_created_at: null,
          },
          top_failing_projects: [],
        };
      }
      if (url.includes("/api/v1/admin/reports/operations-sla/history")) {
        return {
          generated_at: "2026-02-22T18:03:00Z",
          days: 30,
          points: [],
          summary: null,
        };
      }
      if (url.includes("/api/v1/admin/reports/operations-sla")) {
        return {
          generated_at: "2026-02-22T18:02:00Z",
          overall_status: "OK",
          metrics: [],
          playbooks: [],
        };
      }
      if (url.includes("/api/v1/admin/reports/issues-analytics")) {
        return {
          generated_at: "2026-02-22T18:04:00Z",
          days: 30,
          summary: {
            total_issues: 0,
            open_issues: 0,
            closed_issues: 0,
            overdue_open_issues: 0,
            blocked_open_issues: 0,
            p1_open_issues: 0,
            overdue_open_rate_pct: 0,
            mttr_hours: 0,
            mttr_p50_hours: 0,
            mttr_sample_size: 0,
            backlog_by_workflow: {},
            backlog_by_priority: {},
          },
          trend: [],
        };
      }
      if (url.includes("/api/v1/admin/reports/issues-addons-impact")) {
        return {
          generated_at: "2026-02-22T18:04:00Z",
          summary: {
            open_issues: 0,
            blocked_open_issues: 0,
            not_installed_doors: 0,
            open_issue_revenue_at_risk: 0,
            open_issue_payroll_at_risk: 0,
            open_issue_profit_at_risk: 0,
            blocked_issue_profit_at_risk: 0,
            delayed_revenue_total: 0,
            delayed_payroll_total: 0,
            delayed_profit_total: 0,
            addon_revenue_total: 0,
            addon_payroll_total: 0,
            addon_profit_total: 0,
            missing_addon_plans_facts: 0,
          },
          top_reasons: [],
          addon_impact: [],
        };
      }
      if (url.includes("/api/v1/admin/reports/risk-concentration")) {
        return {
          generated_at: "2026-02-22T18:04:00Z",
          summary: {
            open_issue_profit_at_risk: 0,
            blocked_issue_profit_at_risk: 0,
            delayed_profit_total: 0,
            risky_projects: 0,
            risky_orders: 0,
            risky_installers: 0,
            worst_project_profit_total: 0,
            worst_order_profit_total: 0,
            worst_installer_profit_total: 0,
          },
          projects: [],
          orders: [],
          installers: [],
        };
      }
      if (url.includes("/api/v1/admin/reports/installers-profitability-matrix")) {
        return { total: 0, limit: 8, offset: 0, items: [] };
      }
      if (url.includes("/api/v1/admin/reports/installer-project-profitability")) {
        return { total: 0, limit: 10, offset: 0, items: [] };
      }
      if (url.includes("/api/v1/admin/projects?limit=200") || url.endsWith("/api/v1/admin/projects")) {
        return { items: [{ id: "project-1", name: "Ashdod Towers" }] };
      }
      if (url.includes("/api/v1/admin/reports/projects-margin?")) {
        return { total: 0, limit: 5, offset: 0, items: [] };
      }
      if (url.includes("/api/v1/admin/reports/installers-kpi?")) {
        return { period_from: null, period_to: null, items: [] };
      }
      if (url.includes("/api/v1/admin/reports/order-numbers-kpi")) {
        return { total: 0, limit: 20, offset: 0, items: [] };
      }
      if (url.includes("/api/v1/admin/outbox?status=FAILED")) {
        return { items: [] };
      }
      if (url.includes("/api/v1/admin/reports/audit-catalogs")) {
        return { items: [], summary: { total: 0, by_entity: {}, by_action: {} } };
      }
      if (url.includes("/api/v1/admin/reports/audit-issues")) {
        return { items: [], summary: { total: 0, by_entity: {}, by_action: {} } };
      }
      throw new Error(`Unexpected path: ${url}`);
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ReportsPage />
      </QueryClientProvider>
    );

    expect(
      await screen.findByText(
        "Requested project missing-project is not available in the current reports scope. Project-specific reports were not switched to another project.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Project Plan Fact Filter")).toHaveValue("");
    expect(screen.getByLabelText("Project Risk Drilldown Filter")).toHaveValue("");
    expect(screen.getByLabelText("Order Project Filter")).toHaveValue("");

    fireEvent.click(screen.getByRole("button", { name: "Show full report" }));
    expect(pushMock).toHaveBeenCalledWith("/reports");
  });

  it("does not switch installer reports to another installer when scoped installer is unavailable", async () => {
    window.history.replaceState(
      {},
      "",
      "/reports?installer_id=missing-installer",
    );

    apiFetchMock.mockImplementation(async (path: string) => {
      const url = String(path);
      const webhookMock = mockReportWebhookSignals(url);
      if (webhookMock) {
        return webhookMock;
      }
      const retryAuditMock = mockReportRetryAudits(url);
      if (retryAuditMock) {
        return retryAuditMock;
      }
      if (url.includes("/api/v1/admin/reports/limit-alerts/read")) {
        return { unread_count: 0, last_read_at: "2026-02-22T18:00:00Z" };
      }
      if (url.includes("/api/v1/admin/reports/delivery")) {
        return {
          period_from: null,
          period_to: null,
          whatsapp_pending: 0,
          whatsapp_delivered: 0,
          whatsapp_failed: 0,
          email_sent: 0,
          email_failed: 0,
        };
      }
      if (url.includes("/api/v1/admin/outbox/summary")) {
        return {
          total: 0,
          by_channel: {},
          by_status: {},
          by_delivery_status: {},
          pending_overdue_15m: 0,
          failed_total: 0,
        };
      }
      if (url.includes("/api/v1/admin/reports/operations-center")) {
        return {
          generated_at: "2026-02-22T18:01:00Z",
          imports: {
            window_hours: 24,
            total_runs: 0,
            analyze_runs: 0,
            import_runs: 0,
            retry_runs: 0,
            success_runs: 0,
            partial_runs: 0,
            failed_runs: 0,
            empty_runs: 0,
          },
          outbox: {
            total: 0,
            failed_total: 0,
            pending_overdue_15m: 0,
            by_channel: {},
          },
          alerts: {
            unread_count: 0,
            total_last_24h: 0,
            warn_last_24h: 0,
            danger_last_24h: 0,
            latest_created_at: null,
          },
          top_failing_projects: [],
        };
      }
      if (url.includes("/api/v1/admin/reports/operations-sla/history")) {
        return {
          generated_at: "2026-02-22T18:03:00Z",
          days: 30,
          points: [],
          summary: null,
        };
      }
      if (url.includes("/api/v1/admin/reports/operations-sla")) {
        return {
          generated_at: "2026-02-22T18:02:00Z",
          overall_status: "OK",
          metrics: [],
          playbooks: [],
        };
      }
      if (url.includes("/api/v1/admin/reports/issues-analytics")) {
        return {
          generated_at: "2026-02-22T18:04:00Z",
          days: 30,
          summary: {
            total_issues: 0,
            open_issues: 0,
            closed_issues: 0,
            overdue_open_issues: 0,
            blocked_open_issues: 0,
            p1_open_issues: 0,
            overdue_open_rate_pct: 0,
            mttr_hours: 0,
            mttr_p50_hours: 0,
            mttr_sample_size: 0,
            backlog_by_workflow: {},
            backlog_by_priority: {},
          },
          trend: [],
        };
      }
      if (url.includes("/api/v1/admin/reports/issues-addons-impact")) {
        return {
          generated_at: "2026-02-22T18:04:00Z",
          summary: {
            open_issues: 0,
            blocked_open_issues: 0,
            not_installed_doors: 0,
            open_issue_revenue_at_risk: 0,
            open_issue_payroll_at_risk: 0,
            open_issue_profit_at_risk: 0,
            blocked_issue_profit_at_risk: 0,
            delayed_revenue_total: 0,
            delayed_payroll_total: 0,
            delayed_profit_total: 0,
            addon_revenue_total: 0,
            addon_payroll_total: 0,
            addon_profit_total: 0,
            missing_addon_plans_facts: 0,
          },
          top_reasons: [],
          addon_impact: [],
        };
      }
      if (url.includes("/api/v1/admin/reports/risk-concentration")) {
        return {
          generated_at: "2026-02-22T18:04:00Z",
          summary: {
            open_issue_profit_at_risk: 0,
            blocked_issue_profit_at_risk: 0,
            delayed_profit_total: 0,
            risky_projects: 0,
            risky_orders: 0,
            risky_installers: 0,
            worst_project_profit_total: 0,
            worst_order_profit_total: 0,
            worst_installer_profit_total: 0,
          },
          projects: [],
          orders: [],
          installers: [],
        };
      }
      if (url.includes("/api/v1/admin/reports/installers-profitability-matrix")) {
        return { total: 0, limit: 8, offset: 0, items: [] };
      }
      if (url.includes("/api/v1/admin/reports/installer-project-profitability")) {
        return { total: 0, limit: 10, offset: 0, items: [] };
      }
      if (
        url.includes("/api/v1/admin/projects?limit=200") ||
        url.endsWith("/api/v1/admin/projects")
      ) {
        return { items: [{ id: "project-1", name: "Ashdod Towers" }] };
      }
      if (url.includes("/api/v1/admin/reports/projects-margin?")) {
        return { total: 0, limit: 5, offset: 0, items: [] };
      }
      if (url.includes("/api/v1/admin/reports/installers-kpi/")) {
        return {
          installer_id: "installer-1",
          installer_name: "Installer One",
          installed_doors: 4,
          active_projects: 1,
          order_numbers: 1,
          open_issues: 0,
          addons_done_qty: 0,
          addon_revenue_total: 0,
          addon_payroll_total: 0,
          addon_profit_total: 0,
          revenue_total: 400,
          payroll_total: 200,
          profit_total: 200,
          missing_rates_installed_doors: 0,
          missing_addon_plans_facts: 0,
          last_installed_at: "2026-02-22T17:00:00Z",
          top_projects: [],
          order_breakdown: [],
        };
      }
      if (url.includes("/api/v1/admin/reports/installers-kpi?")) {
        return {
          period_from: null,
          period_to: null,
          items: [
            {
              installer_id: "installer-1",
              installer_name: "Installer One",
              installed_doors: 4,
              payroll_total: 200,
              revenue_total: 400,
              profit_total: 200,
              missing_rates_installed_doors: 0,
            },
          ],
        };
      }
      if (url.includes("/api/v1/admin/reports/order-numbers-kpi")) {
        return { total: 0, limit: 20, offset: 0, items: [] };
      }
      if (url.includes("/api/v1/admin/outbox?status=FAILED")) {
        return { items: [] };
      }
      if (url.includes("/api/v1/admin/reports/audit-catalogs")) {
        return { items: [], summary: { total: 0, by_entity: {}, by_action: {} } };
      }
      if (url.includes("/api/v1/admin/reports/audit-issues")) {
        return { items: [], summary: { total: 0, by_entity: {}, by_action: {} } };
      }
      throw new Error(`Unexpected path: ${url}`);
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ReportsPage />
      </QueryClientProvider>,
    );

    expect(
      await screen.findByText(
        "Requested installer missing-installer is not available in the current reports scope. Installer-specific reports were not switched to another installer.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Installer KPI Details Filter")).toHaveValue(
      "",
    );
    expect(
      screen.queryByRole("button", { name: "Open installer card" }),
    ).not.toBeInTheDocument();
    expect(
      apiFetchMock.mock.calls.some((call) =>
        String(call[0]).includes(
          "/api/v1/admin/reports/installers-kpi/installer-1",
        ),
      ),
    ).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Show full report" }));
    expect(pushMock).toHaveBeenCalledWith("/reports");
  });

  it("disables privileged actions for INSTALLER role", async () => {
    authSessionMock.mockReturnValue({
      role: "INSTALLER",
      admin_scope: null,
      can_view_rates: false,
    });

    apiFetchMock.mockImplementation(async (path: string) => {
      const url = String(path);
      const webhookMock = mockReportWebhookSignals(url);
      if (webhookMock) {
        return webhookMock;
      }
      const retryAuditMock = mockReportRetryAudits(url);
      if (retryAuditMock) {
        return retryAuditMock;
      }
      if (url.includes("/api/v1/admin/reports/delivery")) {
        return {
          period_from: null,
          period_to: null,
          whatsapp_pending: 0,
          whatsapp_delivered: 0,
          whatsapp_failed: 0,
          email_sent: 0,
          email_failed: 0,
        };
      }
      if (url.includes("/api/v1/admin/outbox/summary")) {
        return {
          total: 0,
          by_channel: {},
          by_status: {},
          by_delivery_status: {},
          pending_overdue_15m: 0,
          failed_total: 0,
        };
      }
      if (url.includes("/api/v1/admin/reports/operations-center")) {
        return {
          generated_at: "2026-02-22T18:01:00Z",
          imports: {
            window_hours: 24,
            total_runs: 0,
            analyze_runs: 0,
            import_runs: 0,
            retry_runs: 0,
            success_runs: 0,
            partial_runs: 0,
            failed_runs: 0,
            empty_runs: 0,
          },
          outbox: {
            total: 0,
            failed_total: 0,
            pending_overdue_15m: 0,
            by_channel: {},
          },
          alerts: {
            unread_count: 1,
            total_last_24h: 0,
            warn_last_24h: 0,
            danger_last_24h: 0,
            latest_created_at: null,
          },
          top_failing_projects: [],
        };
      }
      if (url.includes("/api/v1/admin/reports/operations-sla/history")) {
        return {
          generated_at: "2026-02-22T18:03:00Z",
          days: 30,
          points: [],
          summary: {
            ok_days: 0,
            warn_days: 0,
            danger_days: 0,
            current_status: "OK",
            delta_import_failure_rate_pct: 0,
            delta_outbox_failed_rate_pct: 0,
            delta_danger_alerts_count: 0,
          },
        };
      }
      if (url.includes("/api/v1/admin/reports/operations-sla")) {
        return {
          generated_at: "2026-02-22T18:02:00Z",
          overall_status: "OK",
          metrics: [],
          playbooks: [],
        };
      }
      if (url.includes("/api/v1/admin/reports/issues-analytics")) {
        return {
          generated_at: "2026-02-22T18:04:00Z",
          days: 30,
          summary: {
            total_issues: 0,
            open_issues: 0,
            closed_issues: 0,
            overdue_open_issues: 0,
            blocked_open_issues: 0,
            p1_open_issues: 0,
            overdue_open_rate_pct: 0,
            mttr_hours: 0,
            mttr_p50_hours: 0,
            mttr_sample_size: 0,
            backlog_by_workflow: {},
            backlog_by_priority: {},
          },
          trend: [],
        };
      }
      if (url.includes("/api/v1/admin/reports/risk-concentration")) {
        return {
          generated_at: "2026-02-22T18:05:30Z",
          summary: {
            open_issue_profit_at_risk: 0,
            blocked_issue_profit_at_risk: 0,
            delayed_profit_total: 0,
            risky_projects: 0,
            risky_orders: 0,
            risky_installers: 0,
            worst_project_profit_total: 0,
            worst_order_profit_total: 0,
            worst_installer_profit_total: 0,
          },
          projects: [],
          orders: [],
          installers: [],
        };
      }
      if (url.includes("/api/v1/admin/reports/installers-profitability-matrix")) {
        return {
          total: 0,
          limit: 8,
          offset: 0,
          items: [],
        };
      }
      if (url.includes("/api/v1/admin/reports/installer-project-profitability")) {
        return {
          total: 0,
          limit: 10,
          offset: 0,
          items: [],
        };
      }
      if (url.includes("/api/v1/admin/reports/limit-alerts")) {
        return {
          items: [
            {
              id: "8fce56bd-d0a2-43cc-b4de-f1a53fcaab17",
              created_at: "2026-02-22T17:50:00Z",
              action: "PLAN_LIMIT_ALERT_DANGER_USERS",
              level: "DANGER",
              metric: "users",
              current: 10,
              max: 10,
              utilization_pct: 100,
              plan_code: "trial",
              is_unread: true,
            },
          ],
          unread_count: 1,
          last_read_at: null,
          limit: 20,
          offset: 0,
        };
      }
      if (url.includes("/api/v1/admin/reports/installers-kpi")) {
        return {
          period_from: null,
          period_to: null,
          items: [],
        };
      }
      if (url.includes("/api/v1/admin/reports/order-numbers-kpi")) {
        return {
          total: 0,
          limit: 20,
          offset: 0,
          items: [],
        };
      }
      if (url.includes("/api/v1/admin/projects")) {
        return { items: [] };
      }
      if (url.includes("/api/v1/admin/outbox?status=FAILED")) {
        return {
          items: [
            {
              id: "9bd9204f-612f-44f2-be07-c6bc2a9f04ca",
              channel: "EMAIL",
              status: "FAILED",
              delivery_status: "FAILED",
              attempts: 5,
              max_attempts: 5,
              scheduled_at: "2026-02-22T17:45:00Z",
              created_at: "2026-02-22T17:40:00Z",
              last_error: "smtp unavailable",
            },
          ],
        };
      }
      if (url.includes("/api/v1/admin/reports/audit-catalogs")) {
        return { items: [], summary: { total: 0, by_entity: {}, by_action: {} } };
      }
      if (url.includes("/api/v1/admin/reports/audit-issues")) {
        return { items: [], summary: { total: 0, by_entity: {}, by_action: {} } };
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
        <ReportsPage />
      </QueryClientProvider>
    );

    expect(
      await screen.findByText(
        "Read-only mode for INSTALLER role: export/retry/mark-read actions are disabled."
      )
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mark All Read" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Export Executive CSV" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Export Installers CSV" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Export Orders CSV" })).toBeDisabled();
    const retryButtons = await screen.findAllByRole("button", { name: "Retry" });
    retryButtons.forEach((button) => {
      expect(button).toBeDisabled();
    });
    const exportButtons = screen.getAllByRole("button", { name: "Export CSV" });
    expect(exportButtons).toHaveLength(2);
    expect(exportButtons[0]).toBeDisabled();
    expect(exportButtons[1]).toBeDisabled();
  }, 30000);

  it("does not query financial report endpoints without rate access", async () => {
    authSessionMock.mockReturnValue({
      role: "ADMIN",
      admin_scope: "OPERATIONS",
      can_view_rates: false,
    });

    const financialPathFragments = [
      "/api/v1/admin/reports/issues-addons-impact",
      "/api/v1/admin/reports/risk-concentration",
      "/api/v1/admin/reports/installers-profitability-matrix",
      "/api/v1/admin/reports/installer-project-profitability",
      "/api/v1/admin/reports/project-plan-fact/",
      "/api/v1/admin/reports/project-risk-drilldown/",
      "/api/v1/admin/reports/projects-margin",
      "/api/v1/admin/reports/installers-kpi",
      "/api/v1/admin/reports/order-numbers-kpi",
      "/api/v1/admin/projects/project-1/addons/plan",
      "/api/v1/admin/projects/project-1/urgency-surcharges",
    ];

    apiFetchMock.mockImplementation(async (path: string) => {
      const url = String(path);
      if (financialPathFragments.some((fragment) => url.includes(fragment))) {
        throw new Error(`Financial endpoint should not be called: ${url}`);
      }
      const webhookMock = mockReportWebhookSignals(url);
      if (webhookMock) return webhookMock;
      const retryAuditMock = mockReportRetryAudits(url);
      if (retryAuditMock) return retryAuditMock;
      if (url.includes("/api/v1/admin/reports/delivery")) {
        return {
          period_from: null,
          period_to: null,
          whatsapp_pending: 0,
          whatsapp_delivered: 0,
          whatsapp_failed: 0,
          email_sent: 0,
          email_failed: 0,
        };
      }
      if (url.includes("/api/v1/admin/outbox/summary")) {
        return {
          total: 0,
          by_channel: {},
          by_status: {},
          by_delivery_status: {},
          pending_overdue_15m: 0,
          failed_total: 0,
        };
      }
      if (url.includes("/api/v1/admin/reports/operations-center")) {
        return {
          generated_at: "2026-02-22T18:01:00Z",
          imports: {
            window_hours: 24,
            total_runs: 0,
            analyze_runs: 0,
            import_runs: 0,
            retry_runs: 0,
            success_runs: 0,
            partial_runs: 0,
            failed_runs: 0,
            empty_runs: 0,
          },
          outbox: {
            total: 0,
            failed_total: 0,
            pending_overdue_15m: 0,
            by_channel: {},
          },
          alerts: {
            unread_count: 0,
            total_last_24h: 0,
            warn_last_24h: 0,
            danger_last_24h: 0,
            latest_created_at: null,
          },
          top_failing_projects: [],
        };
      }
      if (url.includes("/api/v1/admin/reports/operations-sla/history")) {
        return {
          generated_at: "2026-02-22T18:03:00Z",
          days: 30,
          points: [],
          summary: {
            ok_days: 0,
            warn_days: 0,
            danger_days: 0,
            current_status: "OK",
            delta_import_failure_rate_pct: 0,
            delta_outbox_failed_rate_pct: 0,
            delta_danger_alerts_count: 0,
          },
        };
      }
      if (url.includes("/api/v1/admin/reports/operations-sla")) {
        return {
          generated_at: "2026-02-22T18:02:00Z",
          overall_status: "OK",
          metrics: [],
          playbooks: [],
        };
      }
      if (url.includes("/api/v1/admin/reports/issues-analytics")) {
        return {
          generated_at: "2026-02-22T18:04:00Z",
          days: 30,
          summary: {
            total_issues: 0,
            open_issues: 0,
            closed_issues: 0,
            overdue_open_issues: 0,
            blocked_open_issues: 0,
            p1_open_issues: 0,
            overdue_open_rate_pct: 0,
            mttr_hours: 0,
            mttr_p50_hours: 0,
            mttr_sample_size: 0,
            backlog_by_workflow: {},
            backlog_by_priority: {},
          },
          trend: [],
        };
      }
      if (url.includes("/api/v1/admin/reports/limit-alerts")) {
        return { items: [], unread_count: 0, total: 0, limit: 20, offset: 0 };
      }
      if (url.includes("/api/v1/admin/projects")) return { items: [] };
      if (url.includes("/api/v1/admin/outbox?status=FAILED")) return { items: [] };
      if (url.includes("/api/v1/admin/reports/audit-catalogs")) {
        return { items: [], summary: { total: 0, by_entity: {}, by_action: {} } };
      }
      if (url.includes("/api/v1/admin/reports/audit-issues")) {
        return { items: [], summary: { total: 0, by_entity: {}, by_action: {} } };
      }
      return {};
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ReportsPage />
      </QueryClientProvider>
    );

    expect(await screen.findByText("Financial reports are restricted")).toBeInTheDocument();
    await waitFor(() => expect(apiFetchMock).toHaveBeenCalled());
    const calledUrls = apiFetchMock.mock.calls.map(([path]) => String(path));
    expect(calledUrls.some((url) => financialPathFragments.some((fragment) => url.includes(fragment)))).toBe(false);
  }, 30000);
});
