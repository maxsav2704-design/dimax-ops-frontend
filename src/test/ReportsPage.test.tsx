import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import ReportsPage from "@/views/ReportsPage";

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}));
const { pushMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
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

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

vi.mock("@/hooks/use-user-role", () => ({
  useUserRole: userRoleMock,
}));

describe("ReportsPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    apiFetchMock.mockReset();
    pushMock.mockReset();
    userRoleMock.mockReset();
    userRoleMock.mockReturnValue(null);
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

  it("loads reports dashboard sections", async () => {
    apiFetchMock.mockImplementation(async (path: string, init?: RequestInit) => {
      const url = String(path);
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
      if (url.startsWith("/api/v1/admin/projects")) {
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
          missing_planned_rates_doors: 1,
          missing_actual_rates_doors: 0,
          missing_addon_plans_facts: 1,
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
    expect(screen.getByText("Retry failed imports in bulk")).toBeInTheDocument();
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
    expect(screen.getByText("AZ-100")).toBeInTheDocument();
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
    expect(screen.getByText("3200.00")).toBeInTheDocument();
    expect(screen.getByText("1800.00")).toBeInTheDocument();
    expect(screen.getAllByText("1060.00").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Ashdod Tower A").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Ashdod Tower B").length).toBeGreaterThan(0);
    expect(screen.getByText("Site Blocked")).toBeInTheDocument();
    expect(screen.getByText("Handle Upgrade")).toBeInTheDocument();
    expect(screen.getByText("Blocked Site")).toBeInTheDocument();
    expect(screen.getByText("BZ-400")).toBeInTheDocument();
    expect(screen.getByText("RC-100")).toBeInTheDocument();
    expect(screen.getAllByText("Installer Beta").length).toBeGreaterThan(0);
    expect(screen.getAllByText("STRONG").length).toBeGreaterThan(0);
    expect(screen.getAllByText("RISK").length).toBeGreaterThan(0);
    expect(screen.getAllByText("WATCH").length).toBeGreaterThan(0);
  }, 45000);

  it("navigates from reports into operations center variants", async () => {
    apiFetchMock.mockImplementation(async (path: string) => {
      const url = String(path);
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
  });

  it("loads focused reports view from operations deep-link", async () => {
    window.history.replaceState({}, "", "/reports?focus=delivery");

    apiFetchMock.mockImplementation(async (path: string) => {
      const url = String(path);
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

    expect(focusQueries.getByRole("button", { name: "Open Actionable Ops" })).toBeInTheDocument();
    expect(focusQueries.getByRole("button", { name: "Open Journal Queue" })).toBeInTheDocument();

    fireEvent.click(focusQueries.getByRole("button", { name: "Open Actionable Ops" }));
    expect(pushMock).toHaveBeenCalledWith("/operations?actionable=1");

    fireEvent.click(focusQueries.getByRole("button", { name: "Open Journal Queue" }));
    expect(pushMock).toHaveBeenCalledWith("/journal");

    fireEvent.click(focusQueries.getByRole("button", { name: "Clear focus" }));
    expect(pushMock).toHaveBeenCalledWith("/reports");
  });

  it("disables privileged actions for INSTALLER role", async () => {
    userRoleMock.mockReturnValue("INSTALLER");

    apiFetchMock.mockImplementation(async (path: string) => {
      const url = String(path);
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
    expect(screen.getByRole("button", { name: "Retry" })).toBeDisabled();
    const exportButtons = screen.getAllByRole("button", { name: "Export CSV" });
    expect(exportButtons).toHaveLength(2);
    expect(exportButtons[0]).toBeDisabled();
    expect(exportButtons[1]).toBeDisabled();
  }, 30000);
});
