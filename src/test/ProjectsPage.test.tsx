import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import ProjectsPage from "@/views/ProjectsPage";

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
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
  useSearchParams: () => new URLSearchParams(""),
}));

describe("ProjectsPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    apiFetchMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uploads import file via multipart import-upload endpoint", async () => {
    apiFetchMock.mockImplementation(async (path: string, init?: RequestInit) => {
      const url = String(path);

      if (url.includes("/api/v1/admin/door-types")) {
        return [{ id: "door-type-1", code: "entrance", name: "Entrance", is_active: true }];
      }

      if (url.endsWith("/api/v1/admin/projects")) {
        return {
          items: [{ id: "project-1", name: "Project A", address: "Address A", status: "NEW" }],
        };
      }

      if (url.includes("/api/v1/admin/projects/import-mapping-profiles")) {
        return {
          default_code: "auto_v1",
          items: [],
        };
      }

      if (url.includes("/api/v1/admin/projects/project-1/doors/layout")) {
        return {
          project_id: "project-1",
          total_doors: 0,
          buckets: [],
        };
      }

      if (url.includes("/api/v1/admin/projects/project-1/doors/import-upload")) {
        const body = init?.body as FormData | undefined;
        const analyzeOnly =
          body instanceof FormData && String(body.get("analyze_only")) === "true";
        if (analyzeOnly) {
          return {
            parsed_rows: 1,
            prepared_rows: 1,
            imported: 0,
            skipped: 0,
            errors: [],
            mode: "analyze",
            would_import: 1,
            would_skip: 0,
            diagnostics: {
              mapping_profile: "factory_he_v1",
              strict_required_fields: true,
              missing_required_fields: [],
              required_fields: [],
              recognized_columns: ["house", "floor", "apartment"],
              unmapped_columns: [],
              data_summary: {
                source_rows: 1,
                prepared_rows: 1,
                rows_with_errors: 0,
                duplicate_rows_skipped: 0,
                unique_order_numbers: 1,
                unique_houses: 1,
                unique_floors: 1,
                unique_apartments: 1,
                unique_locations: 1,
                unique_markings: 1,
              },
              preview_groups: [
                {
                  order_number: "AZ-1001",
                  house_number: "A",
                  floor_label: "1",
                  apartment_number: "11",
                  door_marking: "D-11",
                  door_count: 1,
                  location_codes: ["dira"],
                },
              ],
            },
          };
        }
        return {
          parsed_rows: 1,
          prepared_rows: 1,
          imported: 1,
          skipped: 0,
          errors: [],
          mode: "import",
          would_import: 1,
          would_skip: 0,
          diagnostics: {
            mapping_profile: "factory_he_v1",
            strict_required_fields: true,
            missing_required_fields: [],
            required_fields: [],
            recognized_columns: ["house", "floor", "apartment"],
            unmapped_columns: [],
            data_summary: {
              source_rows: 1,
              prepared_rows: 1,
              rows_with_errors: 0,
              duplicate_rows_skipped: 0,
              unique_order_numbers: 1,
              unique_houses: 1,
              unique_floors: 1,
              unique_apartments: 1,
              unique_locations: 1,
              unique_markings: 1,
            },
            preview_groups: [
              {
                order_number: "AZ-1001",
                house_number: "A",
                floor_label: "1",
                apartment_number: "11",
                door_marking: "D-11",
                door_count: 1,
                location_codes: ["dira"],
              },
            ],
          },
        };
      }

      return {};
    });

    const { container } = render(<ProjectsPage />);

    expect(await screen.findByText("Import Factory File")).toBeInTheDocument();

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["house,floor,apartment\nA,1,11"], "factory_manifest.csv", {
      type: "text/csv",
    });
    fireEvent.change(fileInput, { target: { files: [file] } });

    const importButton = screen.getByRole("button", { name: "Import" });
    expect(importButton).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Analyze" }));

    await waitFor(() => {
      const analyzeCall = apiFetchMock.mock.calls.find((call) => {
        if (!String(call[0]).includes("/api/v1/admin/projects/project-1/doors/import-upload")) {
          return false;
        }
        const requestInit = call[1] as RequestInit;
        const body = requestInit?.body;
        return body instanceof FormData && String(body.get("analyze_only")) === "true";
      });
      expect(analyzeCall).toBeTruthy();
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Import" })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Import" }));

    await waitFor(() => {
      const importCall = apiFetchMock.mock.calls.find((call) => {
        if (!String(call[0]).includes("/api/v1/admin/projects/project-1/doors/import-upload")) {
          return false;
        }
        const requestInit = call[1] as RequestInit;
        const body = requestInit?.body;
        return body instanceof FormData && String(body.get("analyze_only")) === "false";
      });
      expect(importCall).toBeTruthy();
    });

    expect(screen.getByText("Import data summary:")).toBeInTheDocument();
    expect(screen.getByText("Orders: 1")).toBeInTheDocument();
    expect(screen.getByText("Apartments: 1")).toBeInTheDocument();
    expect(screen.getByText("Strict required fields: on")).toBeInTheDocument();
    expect(screen.getByText("Project structure preview:")).toBeInTheDocument();
    expect(screen.getAllByText("AZ-1001").length).toBeGreaterThan(0);
    expect(screen.getByText("Dira")).toBeInTheDocument();
  }, 45000);

  it("shows order number in allocation matrix and allows filtering by order", async () => {
    apiFetchMock.mockImplementation(async (path: string) => {
      const url = String(path);

      if (url.includes("/api/v1/admin/door-types")) {
        return [{ id: "door-type-1", code: "entrance", name: "Entrance", is_active: true }];
      }

      if (url.endsWith("/api/v1/admin/projects")) {
        return {
          items: [{ id: "project-1", name: "Project A", address: "Address A", status: "NEW" }],
        };
      }

      if (url.includes("/api/v1/admin/projects/import-mapping-profiles")) {
        return {
          default_code: "auto_v1",
          items: [],
        };
      }

      if (url.includes("/api/v1/admin/projects/project-1") && !url.includes("/doors/")) {
        return {
          id: "project-1",
          name: "Project A",
          address: "Address A",
          status: "NEW",
          developer_company: "DIMAX Dev Co",
          contact_name: "Eyal Cohen",
          issues_open: [
            {
              id: "issue-1",
              door_id: "door-2",
              status: "OPEN",
              title: "Blocked opening",
              details: "Client floor access not ready",
            },
          ],
        };
      }

      if (url.includes("/api/v1/admin/projects/project-1/doors/layout")) {
        return {
          project_id: "project-1",
          total_doors: 2,
          buckets: [
            {
              order_number: "AZ-1001",
              house_number: "1",
              floor_label: "2",
              location_code: "dira",
              door_marking: "D1",
              total: 1,
              status_breakdown: { NOT_INSTALLED: 1 },
              doors: [
                {
                  id: "door-1",
                  unit_label: "1-2-21-dira-D1",
                  door_type_id: "door-type-1",
                  order_number: "AZ-1001",
                  apartment_number: "21",
                  location_code: "dira",
                  door_marking: "D1",
                  status: "NOT_INSTALLED",
                  installer_id: null,
                },
              ],
            },
            {
              order_number: "AZ-1002",
              house_number: "1",
              floor_label: "2",
              location_code: "mamad",
              door_marking: "M1",
              total: 1,
              status_breakdown: { INSTALLED: 1 },
              doors: [
                {
                  id: "door-2",
                  unit_label: "1-2-22-mamad-M1",
                  door_type_id: "door-type-1",
                  order_number: "AZ-1002",
                  apartment_number: "22",
                  location_code: "mamad",
                  door_marking: "M1",
                  status: "INSTALLED",
                  installer_id: null,
                },
              ],
            },
          ],
        };
      }

      if (url.includes("/doors/import-history")) {
        return { items: [] };
      }

      if (url.includes("/import-runs/failed-queue")) {
        return { items: [], total: 0, limit: 10, offset: 0 };
      }

      return {};
    });

    render(<ProjectsPage />);

    expect(await screen.findByText("Project Detail Matrix")).toBeInTheDocument();
    expect(screen.getByText("Door Allocation Matrix")).toBeInTheDocument();
    expect(screen.getByText("בניין / House")).toBeInTheDocument();
    expect(screen.getByText("קומה / Floor")).toBeInTheDocument();
    expect(screen.getByText("Open Blockers")).toBeInTheDocument();
    expect(await screen.findByText("Contact: Eyal Cohen")).toBeInTheDocument();
    expect(
      await screen.findByText("Blocked opening - Client floor access not ready")
    ).toBeInTheDocument();
    expect(screen.getAllByText("AZ-1001").length).toBeGreaterThan(0);
    expect(screen.getAllByText("AZ-1002").length).toBeGreaterThan(0);

    fireEvent.change(screen.getByDisplayValue("All orders"), {
      target: { value: "AZ-1001" },
    });

    await waitFor(() => {
      expect(screen.getAllByText("AZ-1001").length).toBeGreaterThan(0);
      expect(screen.getByText("Visible: 1 / 2")).toBeInTheDocument();
    });
  }, 20000);

  it("shows project financial screen with plan fact and risk drill-down", async () => {
    apiFetchMock.mockImplementation(async (path: string) => {
      const url = String(path);

      if (url.includes("/api/v1/admin/door-types")) {
        return [{ id: "door-type-1", code: "entrance", name: "Entrance", is_active: true }];
      }

      if (url.endsWith("/api/v1/admin/projects")) {
        return {
          items: [{ id: "project-1", name: "Project A", address: "Address A", status: "ACTIVE" }],
        };
      }

      if (url.includes("/api/v1/admin/projects/import-mapping-profiles")) {
        return {
          default_code: "auto_v1",
          items: [],
        };
      }

      if (url.includes("/api/v1/admin/projects/project-1") && !url.includes("/doors/")) {
        return {
          id: "project-1",
          name: "Project A",
          address: "Address A",
          status: "ACTIVE",
          developer_company: "DIMAX Dev Co",
          contact_name: "Eyal Cohen",
          issues_open: [],
        };
      }

      if (url.includes("/api/v1/admin/projects/project-1/doors/layout")) {
        return {
          project_id: "project-1",
          total_doors: 2,
          buckets: [],
        };
      }

      if (url.includes("/api/v1/admin/reports/project-plan-fact/project-1")) {
        return {
          project_id: "project-1",
          total_doors: 10,
          installed_doors: 6,
          not_installed_doors: 4,
          completion_pct: 60,
          open_issues: 3,
          planned_revenue_total: 20000,
          actual_revenue_total: 12000,
          revenue_gap_total: 8000,
          planned_payroll_total: 9000,
          actual_payroll_total: 5400,
          payroll_gap_total: 3600,
          planned_profit_total: 11000,
          actual_profit_total: 6600,
          profit_gap_total: 4400,
          planned_addons_qty: 4,
          actual_addons_qty: 2,
          missing_planned_rates_doors: 1,
          missing_actual_rates_doors: 2,
          missing_addon_plans_facts: 1,
        };
      }

      if (url.includes("/api/v1/admin/reports/project-risk-drilldown/project-1")) {
        return {
          generated_at: "2026-03-02T10:00:00Z",
          project_id: "project-1",
          project_name: "Project A",
          summary: {
            total_doors: 10,
            installed_doors: 6,
            not_installed_doors: 4,
            completion_pct: 60,
            open_issues: 3,
            blocked_open_issues: 1,
            planned_revenue_total: 20000,
            actual_revenue_total: 12000,
            revenue_gap_total: 8000,
            planned_profit_total: 11000,
            actual_profit_total: 6600,
            profit_gap_total: 4400,
            actual_margin_pct: 55,
            delayed_revenue_total: 5000,
            delayed_profit_total: 2500,
            blocked_issue_profit_at_risk: 1200,
            addon_revenue_total: 600,
            addon_profit_total: 250,
            missing_planned_rates_doors: 1,
            missing_actual_rates_doors: 2,
            missing_addon_plans_facts: 1,
          },
          drivers: [
            {
              code: "PROFIT_GAP",
              label: "Profit Gap",
              severity: "DANGER",
              value: 4400,
            },
            {
              code: "OPEN_ISSUES",
              label: "Open Issues",
              severity: "WARN",
              value: 3,
            },
          ],
          top_reasons: [
            {
              reason_id: "reason-1",
              reason_name: "Site access blocked",
              doors: 2,
              revenue_delayed_total: 3000,
              profit_delayed_total: 1500,
            },
          ],
          risky_orders: [
            {
              order_number: "AZ-5001",
              total_doors: 4,
              installed_doors: 1,
              not_installed_doors: 3,
              open_issues: 2,
              planned_revenue_total: 8000,
              actual_revenue_total: 2000,
              revenue_gap_total: 6000,
              actual_profit_total: 900,
              completion_pct: 25,
            },
          ],
        };
      }

      if (url.includes("/doors/import-history")) {
        return { items: [] };
      }

      if (url.includes("/import-runs/failed-queue")) {
        return { items: [], total: 0, limit: 10, offset: 0 };
      }

      return {};
    });

    render(<ProjectsPage />);

    expect(await screen.findByText("Project Financial Screen")).toBeInTheDocument();
    expect(screen.getByText("Plan vs Fact Ledger")).toBeInTheDocument();
    expect(screen.getByText("Risk Drivers")).toBeInTheDocument();
    expect(screen.getByText("Top Delay Reasons")).toBeInTheDocument();
    expect(screen.getByText("Orders at Risk")).toBeInTheDocument();
    expect(screen.getAllByText("$8,000").length).toBeGreaterThan(0);
    expect(screen.getByText("55.0%")).toBeInTheDocument();
    expect(screen.getByText("Site access blocked")).toBeInTheDocument();
    expect(screen.getAllByText("AZ-5001").length).toBeGreaterThan(0);
    expect(screen.getByText("DANGER")).toBeInTheDocument();
  }, 20000);

  it("shows selected import run details with diagnostics and errors", async () => {
    apiFetchMock.mockImplementation(async (path: string) => {
      const url = String(path);

      if (url.includes("/api/v1/admin/door-types")) {
        return [];
      }

      if (url.endsWith("/api/v1/admin/projects")) {
        return {
          items: [{ id: "project-1", name: "Project A", address: "Address A", status: "NEW" }],
        };
      }

      if (url.includes("/api/v1/admin/projects/import-mapping-profiles")) {
        return {
          default_code: "factory_he_v1",
          items: [],
        };
      }

      if (url.includes("/api/v1/admin/projects/project-1/doors/layout")) {
        return {
          project_id: "project-1",
          total_doors: 0,
          buckets: [],
        };
      }

      if (url.includes("/api/v1/admin/projects/project-1/doors/import-history")) {
        return {
          items: [
            {
              id: "run-1",
              created_at: "2026-02-28T10:00:00Z",
              mode: "import",
              status: "PARTIAL",
              source_filename: "factory_manifest_hebrew_cols.csv",
              mapping_profile: "factory_he_v1",
              parsed_rows: 2,
              prepared_rows: 2,
              imported: 1,
              skipped: 0,
              errors_count: 1,
              idempotency_hit: false,
              retry_available: true,
              last_error: "Missing apartment number",
            },
          ],
        };
      }

      if (url.includes("/api/v1/admin/projects/project-1/doors/import-runs/run-1")) {
        return {
          id: "run-1",
          created_at: "2026-02-28T10:00:00Z",
          mode: "import",
          status: "PARTIAL",
          source_filename: "factory_manifest_hebrew_cols.csv",
          mapping_profile: "factory_he_v1",
          parsed_rows: 2,
          prepared_rows: 2,
          imported: 1,
          skipped: 0,
          errors_count: 1,
          idempotency_hit: false,
          retry_available: true,
          last_error: "Missing apartment number",
          would_import: 1,
          would_skip: 1,
          diagnostics: {
            mapping_profile: "factory_he_v1",
            strict_required_fields: true,
            missing_required_fields: [],
            recognized_columns: ["מספר הזמנה", "בניין", "קומה", "דירה", "דגם כנף"],
            unmapped_columns: [],
            required_fields: [
              {
                field_key: "order_number",
                display_name: "מספר הזמנה",
                found: true,
                matched_columns: ["מספר הזמנה"],
              },
            ],
            data_summary: {
              source_rows: 2,
              prepared_rows: 2,
              rows_with_errors: 1,
              duplicate_rows_skipped: 0,
              unique_order_numbers: 1,
              unique_houses: 1,
              unique_floors: 1,
              unique_apartments: 1,
              unique_locations: 1,
              unique_markings: 1,
            },
            preview_groups: [
              {
                order_number: "AZ-2001",
                house_number: "B",
                floor_label: "5",
                apartment_number: "501",
                door_marking: "M-501",
                door_count: 2,
                location_codes: ["mamad", "dira"],
              },
            ],
          },
          errors: [{ row: 7, message: "Missing apartment number" }],
        };
      }

      if (url.includes("/import-runs/failed-queue")) {
        return { items: [], total: 0, limit: 10, offset: 0 };
      }

      return {};
    });

    render(<ProjectsPage />);

    expect(await screen.findByText("Import History")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "View" }));

    expect(await screen.findByText("Selected Import Run")).toBeInTheDocument();
    expect(await screen.findByText("Run data summary:")).toBeInTheDocument();
    expect(screen.getByText("Run structure preview:")).toBeInTheDocument();
    expect(screen.getByText("Orders: 1")).toBeInTheDocument();
    expect(screen.getByText("מספר הזמנה: found")).toBeInTheDocument();
    expect(screen.getAllByText("AZ-2001").length).toBeGreaterThan(0);
    expect(screen.getByText("Mamad, Dira")).toBeInTheDocument();
    expect(screen.getByText("Row 7: Missing apartment number")).toBeInTheDocument();
  }, 20000);

  it("filters import history and opens failed run from queue", async () => {
    apiFetchMock.mockImplementation(async (path: string) => {
      const url = String(path);

      if (url.includes("/api/v1/admin/door-types")) {
        return [];
      }

      if (url.endsWith("/api/v1/admin/projects")) {
        return {
          items: [{ id: "project-1", name: "Project A", address: "Address A", status: "NEW" }],
        };
      }

      if (url.includes("/api/v1/admin/projects/import-mapping-profiles")) {
        return {
          default_code: "auto_v1",
          items: [],
        };
      }

      if (url.includes("/api/v1/admin/projects/project-1/doors/layout")) {
        return {
          project_id: "project-1",
          total_doors: 0,
          buckets: [],
        };
      }

      if (url.includes("/api/v1/admin/projects/project-1/doors/import-history")) {
        if (url.includes("mode=analyze")) {
          return {
            items: [
              {
                id: "run-analyze",
                created_at: "2026-02-28T08:00:00Z",
                mode: "analyze",
                status: "ANALYZED",
                source_filename: "analyze.csv",
                mapping_profile: "auto_v1",
                parsed_rows: 2,
                prepared_rows: 2,
                imported: 0,
                skipped: 1,
                errors_count: 0,
                idempotency_hit: false,
                retry_available: false,
                last_error: null,
              },
            ],
          };
        }
        return {
          items: [
            {
              id: "run-analyze",
              created_at: "2026-02-28T08:00:00Z",
              mode: "analyze",
              status: "ANALYZED",
              source_filename: "analyze.csv",
              mapping_profile: "auto_v1",
              parsed_rows: 2,
              prepared_rows: 2,
              imported: 0,
              skipped: 1,
              errors_count: 0,
              idempotency_hit: false,
              retry_available: false,
              last_error: null,
            },
            {
              id: "run-failed",
              created_at: "2026-02-28T09:00:00Z",
              mode: "import",
              status: "FAILED",
              source_filename: "failed.csv",
              mapping_profile: "factory_he_v1",
              parsed_rows: 2,
              prepared_rows: 1,
              imported: 0,
              skipped: 0,
              errors_count: 1,
              idempotency_hit: false,
              retry_available: true,
              last_error: "Missing door marking",
            },
            {
              id: "run-success",
              created_at: "2026-02-28T10:00:00Z",
              mode: "import",
              status: "SUCCESS",
              source_filename: "success.csv",
              mapping_profile: "factory_he_v1",
              parsed_rows: 1,
              prepared_rows: 1,
              imported: 1,
              skipped: 0,
              errors_count: 0,
              idempotency_hit: false,
              retry_available: true,
              last_error: null,
            },
          ],
        };
      }

      if (url.includes("/api/v1/admin/projects/project-1/doors/import-runs/run-failed")) {
        return {
          id: "run-failed",
          created_at: "2026-02-28T09:00:00Z",
          mode: "import",
          status: "FAILED",
          source_filename: "failed.csv",
          mapping_profile: "factory_he_v1",
          parsed_rows: 2,
          prepared_rows: 1,
          imported: 0,
          skipped: 0,
          errors_count: 1,
          idempotency_hit: false,
          retry_available: true,
          last_error: "Missing door marking",
          would_import: 0,
          would_skip: 1,
          diagnostics: {
            mapping_profile: "factory_he_v1",
            strict_required_fields: true,
            missing_required_fields: ["door_marking"],
            recognized_columns: [],
            unmapped_columns: [],
            required_fields: [],
            data_summary: {
              source_rows: 2,
              prepared_rows: 1,
              rows_with_errors: 1,
              duplicate_rows_skipped: 0,
              unique_order_numbers: 1,
              unique_houses: 1,
              unique_floors: 1,
              unique_apartments: 1,
              unique_locations: 0,
              unique_markings: 0,
            },
            preview_groups: [],
          },
          errors: [{ row: 3, message: "Missing door marking" }],
        };
      }

      if (url.includes("/import-runs/failed-queue")) {
        return {
          items: [
            {
              run_id: "run-failed",
              project_id: "project-1",
              project_name: "Project A",
              created_at: "2026-02-28T09:00:00Z",
              mode: "import",
              status: "FAILED",
              source_filename: "failed.csv",
              mapping_profile: "factory_he_v1",
              parsed_rows: 2,
              prepared_rows: 1,
              imported: 0,
              skipped: 0,
              errors_count: 1,
              last_error: "Missing door marking",
              retry_available: true,
            },
          ],
          total: 1,
          limit: 10,
          offset: 0,
        };
      }

      return {};
    });

    render(<ProjectsPage />);

    expect(await screen.findByText("Import History")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Import history mode"), {
      target: { value: "analyze" },
    });

    await waitFor(() => {
      expect(screen.getByText("1 / 1")).toBeInTheDocument();
      expect(screen.getByText("analyze.csv")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Import history status"), {
      target: { value: "FAILED" },
    });

    expect(await screen.findByText("No import runs for selected filters.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open run" }));

    expect(await screen.findByText("Selected Import Run")).toBeInTheDocument();
    expect(await screen.findByText("Row 3: Missing door marking")).toBeInTheDocument();
    expect(screen.getByText("Missing required fields: door_marking")).toBeInTheDocument();
  }, 20000);

  it("reviews selected projects before bulk reconcile", async () => {
    apiFetchMock.mockImplementation(async (path: string, init?: RequestInit) => {
      const url = String(path);

      if (url.includes("/api/v1/admin/door-types")) {
        return [];
      }

      if (url.endsWith("/api/v1/admin/projects")) {
        return {
          items: [
            { id: "project-1", name: "Project A", address: "Address A", status: "NEW" },
            { id: "project-2", name: "Project B", address: "Address B", status: "NEW" },
          ],
        };
      }

      if (url.includes("/api/v1/admin/projects/import-mapping-profiles")) {
        return {
          default_code: "auto_v1",
          items: [],
        };
      }

      if (url.includes("/api/v1/admin/projects/project-1/doors/layout")) {
        return { project_id: "project-1", total_doors: 0, buckets: [] };
      }

      if (url.includes("/api/v1/admin/projects/project-1/doors/import-history")) {
        return {
          items: [
            {
              id: "run-1",
              created_at: "2026-02-28T09:00:00Z",
              mode: "import",
              status: "FAILED",
              source_filename: "bulk_failed.csv",
              mapping_profile: "factory_he_v1",
              parsed_rows: 2,
              prepared_rows: 1,
              imported: 0,
              skipped: 0,
              errors_count: 1,
              idempotency_hit: false,
              retry_available: true,
              last_error: "Missing marking",
            },
          ],
        };
      }

      if (url.includes("/api/v1/admin/projects/project-1/doors/import-runs/run-1")) {
        return {
          id: "run-1",
          created_at: "2026-02-28T09:00:00Z",
          mode: "import",
          status: "FAILED",
          source_filename: "bulk_failed.csv",
          mapping_profile: "factory_he_v1",
          parsed_rows: 2,
          prepared_rows: 1,
          imported: 0,
          skipped: 0,
          errors_count: 1,
          idempotency_hit: false,
          retry_available: true,
          last_error: "Missing marking",
          would_import: 0,
          would_skip: 1,
          diagnostics: {
            required_fields: [],
            recognized_columns: [],
            unmapped_columns: [],
            missing_required_fields: [],
            preview_groups: [],
          },
          errors: [{ row: 4, message: "Missing marking" }],
        };
      }

      if (url.includes("/api/v1/admin/projects/import-runs/review-latest")) {
        expect(init?.method).toBe("POST");
        return {
          items: [
            {
              project_id: "project-1",
              project_name: "Project A",
              source_run_id: "run-1",
              mode: "import",
              status: "FAILED",
              source_filename: "bulk_failed.csv",
              mapping_profile: "factory_he_v1",
              parsed_rows: 2,
              prepared_rows: 1,
              imported: 0,
              skipped: 0,
              errors_count: 1,
              last_error: "Missing marking",
              retry_available: true,
            },
            {
              project_id: "project-2",
              project_name: "Project B",
              source_run_id: null,
              mode: null,
              status: "SKIPPED_NO_RUN",
              source_filename: null,
              mapping_profile: null,
              parsed_rows: 0,
              prepared_rows: 0,
              imported: 0,
              skipped: 0,
              errors_count: 0,
              last_error: null,
              retry_available: false,
            },
          ],
          total_projects: 2,
          reviewable_projects: 1,
          failed_or_partial_projects: 1,
          skipped_projects: 1,
        };
      }

      if (url.includes("/import-runs/failed-queue")) {
        return { items: [], total: 0, limit: 10, offset: 0 };
      }

      return {};
    });

    render(<ProjectsPage />);

    expect(await screen.findByText("Select all filtered (2)")).toBeInTheDocument();

    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]);

    fireEvent.click(screen.getByRole("button", { name: "Review Selected (2)" }));

    expect(await screen.findByText("Bulk Import Review")).toBeInTheDocument();
    expect(screen.getAllByText("Project A").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Project B").length).toBeGreaterThan(0);
    expect(screen.getByText("Reviewable: 1 | Failed/Partial: 1 | Skipped: 1")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open run" }));

    expect(await screen.findByText("Row 4: Missing marking")).toBeInTheDocument();
  }, 20000);
});
