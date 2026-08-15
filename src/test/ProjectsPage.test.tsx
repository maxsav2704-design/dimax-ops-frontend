import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import { ApiError } from "@/lib/api";
import { createDownloadResponse } from "@/test/download-response";
import ProjectsPage from "@/views/ProjectsPage";

const { apiFetchMock, apiDownloadMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
  apiDownloadMock: vi.fn(),
}));
const { pushMock, searchParamsMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  searchParamsMock: vi.fn(() => new URLSearchParams("")),
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
  apiDownload: apiDownloadMock,
  ApiError: class ApiError extends Error {
    code?: string;
    field?: string;
    meta?: Record<string, unknown>;
    status: number;

    constructor(status: number, message: string, body?: { error?: { code?: string; field?: string; meta?: Record<string, unknown> } }) {
      super(message);
      this.name = "ApiError";
      this.status = status;
      this.code = body?.error?.code;
      this.field = body?.error?.field;
      this.meta = body?.error?.meta;
    }
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => searchParamsMock(),
}));

vi.mock("@/hooks/use-auth-session", () => ({
  useAuthSession: authSessionMock,
}));

describe("ProjectsPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    apiFetchMock.mockReset();
    apiDownloadMock.mockReset();
    pushMock.mockReset();
    searchParamsMock.mockReset();
    authSessionMock.mockReset();
    searchParamsMock.mockReturnValue(new URLSearchParams(""));
    authSessionMock.mockReturnValue({
      role: "ADMIN",
      admin_scope: "OWNER",
      can_view_rates: true,
      can_manage_imports: true,
      can_manage_users: true,
    });
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
                zero_price_doors: 1,
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
                  door_type_ids: ["door-type-1"],
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
              zero_price_doors: 1,
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
                door_type_ids: ["door-type-1"],
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
    expect(screen.getAllByText("Dira").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/entrance - Entrance/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Zero client price doors: 1/)).toBeInTheDocument();
  }, 90000);

  it("downloads the Excel import template from the project import block", async () => {
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:dimax-template"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });

    apiDownloadMock.mockResolvedValue(
      createDownloadResponse("xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", {
        headers: {
          "content-disposition": 'attachment; filename="dimax-door-import-template-auto_v1.xlsx"',
        },
      })
    );
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
          items: [{ code: "auto_v1", name: "Auto Detect v1", description: "", preferred_delimiter: null }],
        };
      }
      if (url.includes("/api/v1/admin/projects/project-1/doors/layout")) {
        return { project_id: "project-1", total_doors: 0, buckets: [] };
      }
      return {};
    });

    try {
      render(<ProjectsPage />);

      expect(await screen.findByText("Import Factory File")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Download Excel template" }));

      await waitFor(() => {
        expect(apiDownloadMock).toHaveBeenCalledWith(
          "/api/v1/admin/projects/doors/import-template.xlsx?mapping_profile=auto_v1"
        );
      });
    } finally {
      Object.defineProperty(URL, "createObjectURL", {
        configurable: true,
        value: originalCreateObjectURL,
      });
      Object.defineProperty(URL, "revokeObjectURL", {
        configurable: true,
        value: originalRevokeObjectURL,
      });
    }
  }, 30000);

  it("downloads a CSV report for import row errors", async () => {
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    const createObjectURLMock = vi.fn(() => "blob:dimax-import-errors");
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectURLMock,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });

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
        return { project_id: "project-1", total_doors: 0, buckets: [] };
      }
      if (url.includes("/api/v1/admin/projects/project-1/doors/import-upload")) {
        const body = init?.body as FormData | undefined;
        expect(body instanceof FormData && String(body.get("analyze_only")) === "true").toBe(true);
        return {
          parsed_rows: 2,
          prepared_rows: 1,
          imported: 0,
          skipped: 0,
          errors: [{ row: 2, message: "door_type_id or door_type_code is required" }],
          mode: "analyze",
          would_import: 1,
          would_skip: 0,
          diagnostics: {
            mapping_profile: "auto_v1",
            strict_required_fields: false,
            missing_required_fields: [],
            required_fields: [],
            recognized_columns: ["house", "floor", "apartment"],
            unmapped_columns: [],
            data_summary: {
              source_rows: 2,
              prepared_rows: 1,
              rows_with_errors: 1,
              duplicate_rows_skipped: 0,
              unique_order_numbers: 1,
              unique_houses: 1,
              unique_floors: 1,
              unique_apartments: 1,
              unique_locations: 1,
              unique_markings: 1,
            },
            preview_groups: [],
          },
        };
      }
      return {};
    });

    try {
      const { container } = render(<ProjectsPage />);

      expect(await screen.findByText("Import Factory File")).toBeInTheDocument();
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(["house,floor,apartment\nA,1,11"], "bad-factory-file.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      fireEvent.change(fileInput, { target: { files: [file] } });
      fireEvent.click(screen.getByRole("button", { name: "Analyze" }));

      const reportButton = await screen.findByRole("button", { name: "Download error report" });
      fireEvent.click(reportButton);

      expect(createObjectURLMock).toHaveBeenCalledTimes(1);
    } finally {
      Object.defineProperty(URL, "createObjectURL", {
        configurable: true,
        value: originalCreateObjectURL,
      });
      Object.defineProperty(URL, "revokeObjectURL", {
        configurable: true,
        value: originalRevokeObjectURL,
      });
    }
  }, 30000);

  it("requires explicit confirmation before importing valid rows from a file with row errors", async () => {
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
        return { default_code: "auto_v1", items: [] };
      }
      if (url.includes("/api/v1/admin/projects/project-1/doors/layout")) {
        return { project_id: "project-1", total_doors: 1, buckets: [] };
      }
      if (url.includes("/api/v1/admin/projects/project-1/doors/import-history")) {
        return { items: [] };
      }
      if (url.includes("/api/v1/admin/projects/project-1/doors/import-upload")) {
        const body = init?.body as FormData | undefined;
        const analyzeOnly =
          body instanceof FormData && String(body.get("analyze_only")) === "true";
        if (analyzeOnly) {
          return {
            parsed_rows: 2,
            prepared_rows: 1,
            imported: 0,
            skipped: 0,
            errors: [{ row: 2, message: "door_type_id or door_type_code is required" }],
            mode: "analyze",
            would_import: 1,
            would_skip: 0,
            diagnostics: {
              mapping_profile: "auto_v1",
              strict_required_fields: false,
              missing_required_fields: [],
              required_fields: [],
              recognized_columns: ["house", "floor", "apartment"],
              unmapped_columns: [],
              data_summary: {
                source_rows: 2,
                prepared_rows: 1,
                rows_with_errors: 1,
                duplicate_rows_skipped: 0,
                unique_order_numbers: 1,
                unique_houses: 1,
                unique_floors: 1,
                unique_apartments: 1,
                unique_locations: 1,
                unique_markings: 1,
              },
              preview_groups: [],
            },
          };
        }
        return {
          parsed_rows: 2,
          prepared_rows: 1,
          imported: 1,
          skipped: 1,
          errors: [{ row: 2, message: "door_type_id or door_type_code is required" }],
          mode: "import",
          would_import: 1,
          would_skip: 1,
          diagnostics: null,
        };
      }
      if (url.includes("/api/v1/admin/projects/project-1")) {
        return {
          id: "project-1",
          name: "Project A",
          address: "Address A",
          status: "NEW",
          doors: [],
        };
      }
      if (url.includes("/api/v1/admin/reports/")) {
        return {};
      }
      return {};
    });

    const { container } = render(<ProjectsPage />);

    const portfolioHeader = await screen.findByTestId("projects-list-v25");
    expect(within(portfolioHeader).getByText("Dashboard # Projects")).toBeInTheDocument();
    expect(within(portfolioHeader).getByText("Portfolio")).toBeInTheDocument();
    expect(within(portfolioHeader).getByRole("button", { name: /Active/i })).toBeInTheDocument();

    expect(await screen.findByText("Import Factory File")).toBeInTheDocument();
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, {
      target: {
        files: [
          new File(["house,floor,apartment\nA,1,11"], "partial-file.xlsx", {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          }),
        ],
      },
    });

    fireEvent.click(screen.getByRole("button", { name: "Analyze" }));

    const importButton = await screen.findByRole("button", { name: "Import" });
    expect(await screen.findByText("Analyze found row errors")).toBeInTheDocument();
    expect(
      screen.queryByText("Analyze completed. Click Import to apply changes.")
    ).not.toBeInTheDocument();
    await waitFor(() => {
      expect(importButton).toBeDisabled();
    });

    fireEvent.click(await screen.findByLabelText("Allow partial import of valid rows"));

    await waitFor(() => {
      expect(importButton).toBeEnabled();
    });

    fireEvent.click(importButton);

    await waitFor(() => {
      const importCall = apiFetchMock.mock.calls.find((call) => {
        if (!String(call[0]).includes("/api/v1/admin/projects/project-1/doors/import-upload")) {
          return false;
        }
        const requestInit = call[1] as RequestInit;
        const body = requestInit?.body;
        return (
          body instanceof FormData &&
          String(body.get("analyze_only")) === "false" &&
          String(body.get("allow_partial_import")) === "true"
        );
      });
      expect(importCall).toBeTruthy();
    });
  }, 30000);

  it("generates a project document from the selected project page", async () => {
    apiFetchMock.mockImplementation(async (path: string, init?: RequestInit) => {
      const url = String(path);

      if (url.includes("/api/v1/admin/door-types")) {
        return [{ id: "door-type-1", code: "entrance", name: "Entrance", is_active: true }];
      }
      if (url.endsWith("/api/v1/admin/projects")) {
        return {
          items: [{ id: "project-1", name: "Project A", code: "PRJ-001", address: "Address A", status: "ACTIVE" }],
        };
      }
      if (url.includes("/api/v1/admin/projects/project-1") && !url.includes("/doors/") && !url.includes("/addons/") && !url.includes("/urgency-surcharges")) {
        return {
          id: "project-1",
          name: "Project A",
          code: "PRJ-001",
          address: "Address A",
          status: "ACTIVE",
          developer_company: "DIMAX Dev Co",
          contact_name: "Eyal Cohen",
          issues_open: [],
        };
      }
      if (url.includes("/api/v1/admin/projects/project-1/doors/layout")) {
        return { project_id: "project-1", total_doors: 2, buckets: [] };
      }
      if (url.includes("/api/v1/admin/projects/import-mapping-profiles")) {
        return { default_code: "auto_v1", items: [] };
      }
      if (url.includes("/api/v1/admin/projects/import-runs/failed-queue")) {
        return { items: [], total: 0, limit: 10, offset: 0 };
      }
      if (url.includes("/api/v1/admin/projects/project-1/doors/import-history")) {
        return { items: [] };
      }
      if (url === "/api/v1/admin/documents/templates") {
        return {
          items: [
            {
              id: "template-1",
              name: "Project Handover",
              source_filename: "handover.txt",
              size_bytes: 120,
              placeholders: ["project.name", "manual.note"],
              is_active: true,
            },
          ],
        };
      }
      if (url.includes("/api/v1/admin/documents/generated?")) {
        return { items: [] };
      }
      if (url === "/api/v1/admin/documents/projects/project-1/render" && init?.method === "POST") {
        expect(init.body).toBe(
          JSON.stringify({
            template_id: "template-1",
            overrides: { "manual.note": "Ready for client" },
          })
        );
        return {
          id: "generation-1",
          template_id: "template-1",
          project_id: "project-1",
          template_name: "Project Handover",
          project_name: "Project A",
          project_code: "PRJ-001",
          file_name: "handover-1234.txt",
          mime_type: "text/plain",
          size_bytes: 80,
          status: "READY",
          download_url: "/api/v1/admin/documents/generated/generation-1/download",
          created_at: "2026-05-19T10:00:00Z",
        };
      }
      if (url.includes("/api/v1/admin/library")) {
        return { items: [] };
      }
      if (url.includes("/api/v1/admin/installers")) {
        return { items: [] };
      }
      if (url.includes("/api/v1/admin/addons/types")) {
        return { items: [] };
      }
      if (url.includes("/api/v1/admin/reports/")) {
        return {};
      }
      return {};
    });

    render(<ProjectsPage />);

    expect(await screen.findByText("Project documents")).toBeInTheDocument();
    expect((await screen.findAllByText("Project Handover")).length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText("Manual note"), {
      target: { value: "Ready for client" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Generate document" }));

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenCalledWith(
        "/api/v1/admin/documents/projects/project-1/render",
        {
          method: "POST",
          body: JSON.stringify({
            template_id: "template-1",
            overrides: { "manual.note": "Ready for client" },
          }),
        }
      );
    });
    expect(await screen.findByText("Document generated: handover-1234.txt")).toBeInTheDocument();
  }, 30000);

  it("shows order number in allocation matrix and allows filtering by order", async () => {
    apiFetchMock.mockImplementation(async (path: string, init?: RequestInit) => {
      const url = String(path);

      if (url.includes("/api/v1/admin/door-types")) {
        return [{ id: "door-type-1", code: "entrance", name: "Entrance", is_active: true }];
      }

      if (url.includes("/api/v1/admin/reasons")) {
        return [
          {
            id: "reason-1",
            code: "blocked-opening",
            name: "Blocked opening",
            is_active: true,
          },
        ];
      }

      if (url.includes("/api/v1/admin/doors/door-1/not-installed") && init?.method === "POST") {
        expect(JSON.parse(String(init.body))).toEqual({
          reason_id: "reason-1",
          comment: "Need access",
        });
        return { ok: true, id: "door-1", status: "NOT_INSTALLED", version: 2 };
      }

      if (url.includes("/api/v1/admin/doors/door-1/install") && init?.method === "POST") {
        return { ok: true, id: "door-1", status: "INSTALLED", version: 3 };
      }

      if (url.includes("/api/v1/admin/doors/door-2/override") && init?.method === "POST") {
        expect(JSON.parse(String(init.body))).toEqual({
          new_status: "NOT_INSTALLED",
          reason_id: "reason-1",
          comment: "Wrong completion",
          override_reason: "Dispatcher confirmed wrong completion",
        });
        return { ok: true };
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
    expect(
      screen.getByTestId("project-detail-v28-full-floor-row-1-2"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Open issues").length).toBeGreaterThan(0);
    expect(await screen.findByText("Eyal Cohen")).toBeInTheDocument();
    expect(
      (await screen.findAllByText("Blocked opening - Client floor access not ready")).length
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("AZ-1001").length).toBeGreaterThan(0);
    expect(screen.getAllByText("AZ-1002").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: "Inspect door D1" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Inspect door M1" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Inspect door M1" }));
    const doorInfoFrame = await screen.findByTestId("project-door-info-frame");
    expect(within(doorInfoFrame).getByText("Door details")).toBeInTheDocument();
    expect(within(doorInfoFrame).getAllByText("M1").length).toBeGreaterThan(0);
    expect(
      within(doorInfoFrame).getByText("Blocked opening - Client floor access not ready"),
    ).toBeInTheDocument();
    expect(
      within(doorInfoFrame).getByTestId("project-door-info-select"),
    ).toBeInTheDocument();
    expect(
      within(doorInfoFrame).getByTestId("project-door-mark-not-installed"),
    ).toBeDisabled();
    fireEvent.change(within(doorInfoFrame).getByTestId("project-door-reason-select"), {
      target: { value: "reason-1" },
    });
    fireEvent.change(within(doorInfoFrame).getByTestId("project-door-status-comment"), {
      target: { value: "Wrong completion" },
    });
    fireEvent.change(within(doorInfoFrame).getByTestId("project-door-override-reason"), {
      target: { value: "Dispatcher confirmed wrong completion" },
    });
    fireEvent.click(within(doorInfoFrame).getByTestId("project-door-mark-not-installed"));

    await waitFor(() => {
      expect(
        apiFetchMock.mock.calls.some(([callPath]) =>
          String(callPath).includes("/api/v1/admin/doors/door-2/override"),
        ),
      ).toBe(true);
    });
    expect(
      await screen.findByText("Door M1 reverted to not installed by admin override."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Inspect door D1" }));
    await waitFor(() => {
      expect(
        within(screen.getByTestId("project-door-info-frame")).getAllByText("D1").length,
      ).toBeGreaterThan(0);
    });
    const d1Frame = screen.getByTestId("project-door-info-frame");
    fireEvent.change(within(d1Frame).getByTestId("project-door-reason-select"), {
      target: { value: "reason-1" },
    });
    fireEvent.change(within(d1Frame).getByTestId("project-door-status-comment"), {
      target: { value: "Need access" },
    });
    fireEvent.click(within(d1Frame).getByTestId("project-door-mark-not-installed"));

    await waitFor(() => {
      expect(
        apiFetchMock.mock.calls.some(([callPath]) =>
          String(callPath).includes("/api/v1/admin/doors/door-1/not-installed"),
        ),
      ).toBe(true);
    });

    await waitFor(() => {
      expect(screen.getByTestId("project-door-mark-installed")).not.toBeDisabled();
    });
    fireEvent.click(screen.getByTestId("project-door-mark-installed"));

    await waitFor(() => {
      expect(
        apiFetchMock.mock.calls.some(([callPath]) =>
          String(callPath).includes("/api/v1/admin/doors/door-1/install"),
        ),
      ).toBe(true);
    });

    const issuesTab = screen.getByTestId("project-detail-tab-issues");
    expect(within(issuesTab).getByText("1")).toBeInTheDocument();
    fireEvent.click(issuesTab);

    await waitFor(() => {
      expect(screen.getByText("Visible: 1 / 2")).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Inspect door D1" }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Inspect door M1" }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("project-detail-tab-doors"));

    await waitFor(() => {
      expect(screen.getByText("Visible: 2 / 2")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByDisplayValue("All orders"), {
      target: { value: "AZ-1001" },
    });

    await waitFor(() => {
      expect(screen.getAllByText("AZ-1001").length).toBeGreaterThan(0);
      expect(screen.getByText("Visible: 1 / 2")).toBeInTheDocument();
    });
  }, 20000);

  it("bulk assigns selected project doors to an active installer", async () => {
    apiFetchMock.mockImplementation(async (path: string, init?: RequestInit) => {
      const url = String(path);

      if (url.includes("/api/v1/admin/door-types")) {
        return [{ id: "door-type-1", code: "entrance", name: "Entrance", is_active: true }];
      }

      if (url.endsWith("/api/v1/admin/projects")) {
        return {
          items: [{ id: "project-1", name: "Project A", address: "Address A", status: "ACTIVE" }],
        };
      }

      if (url.includes("/api/v1/admin/installers?")) {
        return {
          items: [
            {
              id: "installer-1",
              full_name: "Alex Installer",
              email: "installer@dimax.dev",
              status: "ACTIVE",
              is_active: true,
            },
          ],
        };
      }

      if (url.includes("/api/v1/admin/projects/import-mapping-profiles")) {
        return { default_code: "auto_v1", items: [] };
      }

      if (url.includes("/api/v1/admin/projects/doors/bulk-assign-installer")) {
        expect(init?.method).toBe("POST");
        const payload = JSON.parse(String(init?.body || "{}"));
        expect(payload).toEqual({
          door_ids: ["door-1", "door-2"],
          installer_id: "installer-1",
        });
        return {
          assigned: 2,
          skipped: 0,
          assigned_door_ids: ["door-1", "door-2"],
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
              status_breakdown: { NOT_INSTALLED: 1 },
              doors: [
                {
                  id: "door-2",
                  unit_label: "1-2-22-mamad-M1",
                  door_type_id: "door-type-1",
                  order_number: "AZ-1002",
                  apartment_number: "22",
                  location_code: "mamad",
                  door_marking: "M1",
                  status: "NOT_INSTALLED",
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

    const installerSelect = screen.getByLabelText("Bulk assign installer");
    const assignButton = screen.getByRole("button", { name: "Assign selected" });
    expect(installerSelect).toBeDisabled();
    expect(assignButton).toBeDisabled();

    fireEvent.click(screen.getAllByRole("checkbox", { name: "Select visible doors" })[0]);
    expect(installerSelect).toBeEnabled();
    expect(assignButton).toBeDisabled();

    fireEvent.change(installerSelect, {
      target: { value: "installer-1" },
    });
    expect(assignButton).toBeEnabled();
    fireEvent.click(assignButton);

    await waitFor(() => {
      expect(
        apiFetchMock.mock.calls.some(([callPath]) =>
          String(callPath).includes("/api/v1/admin/projects/doors/bulk-assign-installer")
        )
      ).toBe(true);
    });
    expect(await screen.findByText("Assigned 2 doors. Skipped: 0.")).toBeInTheDocument();
  }, 20000);

  it("shows a bulk assignment API error without clearing selected doors", async () => {
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

      if (url.includes("/api/v1/admin/installers?")) {
        return {
          items: [
            {
              id: "installer-1",
              full_name: "Alex Installer",
              email: "installer@dimax.dev",
              status: "ACTIVE",
              is_active: true,
            },
          ],
        };
      }

      if (url.includes("/api/v1/admin/projects/import-mapping-profiles")) {
        return { default_code: "auto_v1", items: [] };
      }

      if (url.includes("/api/v1/admin/projects/doors/bulk-assign-installer")) {
        throw new ApiError(409, "Door is locked. Cannot reassign installer.", {
          error: { code: "CONFLICT" },
        });
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
              status_breakdown: { NOT_INSTALLED: 1 },
              doors: [
                {
                  id: "door-2",
                  unit_label: "1-2-22-mamad-M1",
                  door_type_id: "door-type-1",
                  order_number: "AZ-1002",
                  apartment_number: "22",
                  location_code: "mamad",
                  door_marking: "M1",
                  status: "NOT_INSTALLED",
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
    fireEvent.click(screen.getAllByRole("checkbox", { name: "Select visible doors" })[0]);
    expect(screen.getByText("Selected: 2 / 2")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Bulk assign installer"), {
      target: { value: "installer-1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Assign selected" }));

    expect(await screen.findByText("Door is locked. Cannot reassign installer.")).toBeInTheDocument();
    expect(screen.getByText("Selected: 2 / 2")).toBeInTheDocument();
  }, 20000);

  it("clears selected doors when switching the active project", async () => {
    apiFetchMock.mockImplementation(async (path: string) => {
      const url = String(path);

      if (url.includes("/api/v1/admin/door-types")) {
        return [{ id: "door-type-1", code: "entrance", name: "Entrance", is_active: true }];
      }

      if (url.endsWith("/api/v1/admin/projects")) {
        return {
          items: [
            { id: "project-1", name: "Project A", address: "Address A", status: "ACTIVE" },
            { id: "project-2", name: "Project B", address: "Address B", status: "ACTIVE" },
          ],
        };
      }

      if (url.includes("/api/v1/admin/installers?")) {
        return {
          items: [
            {
              id: "installer-1",
              full_name: "Alex Installer",
              email: "installer@dimax.dev",
              status: "ACTIVE",
              is_active: true,
            },
          ],
        };
      }

      if (url.includes("/api/v1/admin/projects/import-mapping-profiles")) {
        return { default_code: "auto_v1", items: [] };
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

      if (url.includes("/api/v1/admin/projects/project-2") && !url.includes("/doors/")) {
        return {
          id: "project-2",
          name: "Project B",
          address: "Address B",
          status: "ACTIVE",
          developer_company: "DIMAX Dev Co",
          contact_name: "Dana Levi",
          issues_open: [],
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
              status_breakdown: { NOT_INSTALLED: 1 },
              doors: [
                {
                  id: "door-2",
                  unit_label: "1-2-22-mamad-M1",
                  door_type_id: "door-type-1",
                  order_number: "AZ-1002",
                  apartment_number: "22",
                  location_code: "mamad",
                  door_marking: "M1",
                  status: "NOT_INSTALLED",
                  installer_id: null,
                },
              ],
            },
          ],
        };
      }

      if (url.includes("/api/v1/admin/projects/project-2/doors/layout")) {
        return {
          project_id: "project-2",
          total_doors: 1,
          buckets: [
            {
              order_number: "BZ-2001",
              house_number: "2",
              floor_label: "5",
              location_code: "dira",
              door_marking: "D5",
              total: 1,
              status_breakdown: { NOT_INSTALLED: 1 },
              doors: [
                {
                  id: "door-b-1",
                  unit_label: "2-5-51-dira-D5",
                  door_type_id: "door-type-1",
                  order_number: "BZ-2001",
                  apartment_number: "51",
                  location_code: "dira",
                  door_marking: "D5",
                  status: "NOT_INSTALLED",
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
    fireEvent.click(screen.getAllByRole("checkbox", { name: "Select visible doors" })[0]);
    expect(screen.getByText("Selected: 2 / 2")).toBeInTheDocument();

    const projectBButton = screen
      .getAllByText("Project B")
      .map((node) => node.closest("button"))
      .find(Boolean);
    expect(projectBButton).toBeTruthy();
    fireEvent.click(projectBButton!);

    await waitFor(() => {
      expect(screen.getByText("Selected: 0 / 1")).toBeInTheDocument();
    });
    expect(screen.getByLabelText("Bulk assign installer")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Assign selected" })).toBeDisabled();
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
    expect(screen.getAllByText("55.0%").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Site access blocked").length).toBeGreaterThan(0);
    expect(screen.getAllByText("AZ-5001").length).toBeGreaterThan(0);
    expect(screen.getByText("DANGER")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open project report" }));
    expect(pushMock).toHaveBeenCalledWith("/reports?project_id=project-1");
  }, 20000);

  it("creates a manual door for the selected project using library products", async () => {
    apiFetchMock.mockImplementation(async (path: string, init?: RequestInit) => {
      const url = String(path);

      if (url.includes("/api/v1/admin/door-types")) {
        return [{ id: "door-type-1", code: "entrance", name: "Entrance", is_active: true }];
      }

      if (url.endsWith("/api/v1/admin/projects")) {
        return {
          items: [{ id: "project-1", name: "Project A", address: "Address A", status: "ACTIVE" }],
        };
      }

      if (url.includes("/api/v1/admin/library")) {
        return {
          items: [
            {
              id: "product-1",
              sku: "LIB-001",
              name_ru: "Входная дверь",
              name_he: "דלת כניסה",
              install_type: "INSTALL",
              manufacturer: "DIMAX",
              unit: "piece",
              status: "ACTIVE",
            },
          ],
        };
      }

      if (url.includes("/api/v1/admin/installers?")) {
        return {
          items: [
            {
              id: "installer-1",
              full_name: "Alex Installer",
              email: "installer@dimax.dev",
              status: "ACTIVE",
              is_active: true,
            },
          ],
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
          total_doors: 0,
          buckets: [],
        };
      }

      if (url.includes("/api/v1/admin/reports/project-plan-fact/project-1")) {
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
          missing_planned_rates_doors: 0,
          missing_actual_rates_doors: 0,
          missing_addon_plans_facts: 0,
        };
      }

      if (url.includes("/api/v1/admin/reports/project-risk-drilldown/project-1")) {
        return {
          generated_at: "2026-03-02T10:00:00Z",
          project_id: "project-1",
          project_name: "Project A",
          summary: {
            total_doors: 0,
            installed_doors: 0,
            not_installed_doors: 0,
            completion_pct: 0,
            open_issues: 0,
            blocked_open_issues: 0,
            planned_revenue_total: 0,
            actual_revenue_total: 0,
            revenue_gap_total: 0,
            planned_profit_total: 0,
            actual_profit_total: 0,
            profit_gap_total: 0,
            actual_margin_pct: 0,
            delayed_revenue_total: 0,
            delayed_profit_total: 0,
            blocked_issue_profit_at_risk: 0,
            addon_revenue_total: 0,
            addon_profit_total: 0,
            missing_planned_rates_doors: 0,
            missing_actual_rates_doors: 0,
            missing_addon_plans_facts: 0,
          },
          drivers: [],
          top_reasons: [],
          risky_orders: [],
        };
      }

      if (url.includes("/doors/import-history")) {
        return { items: [] };
      }

      if (url.includes("/import-runs/failed-queue")) {
        return { items: [], total: 0, limit: 10, offset: 0 };
      }

      if (url.includes("/api/v1/admin/projects/project-1/doors") && init?.method === "POST") {
        expect(init.body).toBeTruthy();
        const payload = JSON.parse(String(init.body));
        expect(payload).toMatchObject({
          product_id: "product-1",
          door_code: "D-1201",
          unit: "12-04",
          floor: "12",
          location_code: "dira",
          order_number: "AZ-5001",
          install_type: "INSTALL",
          is_critical: true,
          assigned_installer_id: "installer-1",
          planned_install_date: "2026-04-01",
        });
        return { id: "door-new-1" };
      }

      return {};
    });

    render(<ProjectsPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Open Library" }));
    expect(pushMock).toHaveBeenCalledWith(
      "/library?open=create&return_to=%2Fprojects%3Fproject_id%3Dproject-1%26focus_section%3Ddoors"
    );

    const addDoorButton = await screen.findByRole("button", { name: "Add door manually" });
    fireEvent.click(addDoorButton);

    fireEvent.change(screen.getByLabelText("Library product"), {
      target: { value: "product-1" },
    });
    fireEvent.change(screen.getByLabelText("Door code"), {
      target: { value: "D-1201" },
    });
    fireEvent.change(screen.getByLabelText("Unit / apartment"), {
      target: { value: "12-04" },
    });
    fireEvent.change(screen.getByLabelText("Floor"), {
      target: { value: "12" },
    });
    fireEvent.change(screen.getByLabelText("Location code"), {
      target: { value: "dira" },
    });
    fireEvent.change(screen.getByLabelText("Order number"), {
      target: { value: "AZ-5001" },
    });
    fireEvent.change(screen.getByLabelText("Assigned installer"), {
      target: { value: "installer-1" },
    });
    fireEvent.change(screen.getByLabelText("Planned install date"), {
      target: { value: "2026-04-01" },
    });
    fireEvent.click(screen.getByLabelText("Mark as critical door"));

    fireEvent.click(screen.getByRole("button", { name: "Create door" }));

    await waitFor(() => {
      expect(
        apiFetchMock.mock.calls.some(
          ([callPath, requestInit]) =>
            String(callPath).includes("/api/v1/admin/projects/project-1/doors") &&
            (requestInit as RequestInit | undefined)?.method === "POST"
        )
      ).toBe(true);
    });
    expect(
      await screen.findByText("Door D-1201 was added. The project matrix is now filtered to that door.")
    ).toBeInTheDocument();
  }, 40000);

  it("keeps project workflow anchors mapped to the correct business sections", async () => {
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

      if (url.includes("/api/v1/admin/library")) {
        return { items: [] };
      }

      if (url.includes("/api/v1/admin/installers?")) {
        return { items: [] };
      }

      if (url.includes("/api/v1/admin/addons/types")) {
        return {
          items: [{ id: "addon-1", name: "Extra frame", unit: "pcs", status: "ACTIVE" }],
        };
      }

      if (url.includes("/api/v1/admin/projects/import-mapping-profiles")) {
        return { default_code: "auto_v1", items: [] };
      }

      if (url.includes("/api/v1/admin/projects/project-1") && !url.includes("/doors/")) {
        return {
          id: "project-1",
          name: "Project A",
          address: "Address A",
          status: "ACTIVE",
          issues_open: [],
        };
      }

      if (url.includes("/api/v1/admin/projects/project-1/doors/layout")) {
        return { project_id: "project-1", total_doors: 0, buckets: [] };
      }

      if (url.includes("/api/v1/admin/reports/project-plan-fact/project-1")) {
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
          missing_planned_rates_doors: 0,
          missing_actual_rates_doors: 0,
          missing_addon_plans_facts: 0,
        };
      }

      if (url.includes("/api/v1/admin/reports/project-risk-drilldown/project-1")) {
        return {
          generated_at: "2026-03-02T10:00:00Z",
          project_id: "project-1",
          project_name: "Project A",
          summary: {
            total_doors: 0,
            installed_doors: 0,
            not_installed_doors: 0,
            completion_pct: 0,
            open_issues: 0,
            blocked_open_issues: 0,
            planned_revenue_total: 0,
            actual_revenue_total: 0,
            revenue_gap_total: 0,
            planned_profit_total: 0,
            actual_profit_total: 0,
            profit_gap_total: 0,
            actual_margin_pct: 0,
            delayed_revenue_total: 0,
            delayed_profit_total: 0,
            blocked_issue_profit_at_risk: 0,
            addon_revenue_total: 0,
            addon_profit_total: 0,
            missing_planned_rates_doors: 0,
            missing_actual_rates_doors: 0,
            missing_addon_plans_facts: 0,
          },
          drivers: [],
          top_reasons: [],
          risky_orders: [],
        };
      }

      if (url.includes("/api/v1/admin/projects/project-1/addons/plan")) {
        return { items: [] };
      }

      if (url.includes("/api/v1/admin/projects/project-1/urgency-surcharges")) {
        return { items: [] };
      }

      if (url.includes("/api/v1/admin/documents/templates")) {
        return { items: [] };
      }

      if (url.includes("/api/v1/admin/documents/generated")) {
        return { items: [] };
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

    expect(await screen.findByText("Manual Door Creation")).toBeInTheDocument();

    const manualDoorSection = document.getElementById("project-manual-door");
    const addonsSection = document.getElementById("project-additional-works");
    const urgencySection = document.getElementById("project-urgency-surcharge");

    expect(manualDoorSection?.textContent).toContain("Manual Door Creation");
    expect(addonsSection?.textContent).toContain("Additional Works");
    expect(urgencySection?.textContent).toContain("Urgency Surcharge");
    expect(document.querySelectorAll("#project-additional-works")).toHaveLength(1);
    expect(document.querySelectorAll("#project-urgency-surcharge")).toHaveLength(1);
  }, 20000);

  it("opens manual door flow from library deep-link with the selected product", async () => {
    searchParamsMock.mockReturnValue(
      new URLSearchParams(
        "project_id=project-1&focus_section=doors&library_product_id=product-1&library_install_type=INSTALL"
      )
    );

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

      if (url.includes("/api/v1/admin/library?status=ACTIVE")) {
        return {
          items: [
            {
              id: "product-1",
              sku: "LIB-001",
              name_ru: "Входная дверь",
              name_he: "דלת כניסה",
              install_type: "INSTALL",
              manufacturer: "DIMAX",
              unit: "piece",
              status: "ACTIVE",
            },
          ],
        };
      }

      if (url.includes("/api/v1/admin/installers?")) {
        return {
          items: [
            {
              id: "installer-1",
              full_name: "Alex Installer",
              email: "installer@dimax.dev",
              status: "ACTIVE",
              is_active: true,
            },
          ],
        };
      }

      if (url.includes("/api/v1/admin/projects/import-mapping-profiles")) {
        return { default_code: "auto_v1", items: [] };
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
          total_doors: 0,
          buckets: [],
        };
      }

      if (url.includes("/api/v1/admin/reports/project-plan-fact/project-1")) {
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
          missing_planned_rates_doors: 0,
          missing_actual_rates_doors: 0,
          missing_addon_plans_facts: 0,
        };
      }

      if (url.includes("/api/v1/admin/reports/project-risk-drilldown/project-1")) {
        return {
          generated_at: "2026-03-02T10:00:00Z",
          project_id: "project-1",
          project_name: "Project A",
          summary: {
            total_doors: 0,
            installed_doors: 0,
            not_installed_doors: 0,
            completion_pct: 0,
            open_issues: 0,
            blocked_open_issues: 0,
            planned_revenue_total: 0,
            actual_revenue_total: 0,
            revenue_gap_total: 0,
            planned_profit_total: 0,
            actual_profit_total: 0,
            profit_gap_total: 0,
            actual_margin_pct: 0,
            delayed_revenue_total: 0,
            delayed_profit_total: 0,
            blocked_issue_profit_at_risk: 0,
            addon_revenue_total: 0,
            addon_profit_total: 0,
            missing_planned_rates_doors: 0,
            missing_actual_rates_doors: 0,
            missing_addon_plans_facts: 0,
          },
          drivers: [],
          top_reasons: [],
          risky_orders: [],
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

    expect(await screen.findByText("Add door manually")).toBeInTheDocument();
    expect(screen.getByText("Focused project project-1")).toBeInTheDocument();
    expect(screen.getByText("Focused section Doors")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Show full project workspace"));
    expect(pushMock).toHaveBeenCalledWith("/projects?project_id=project-1");
    fireEvent.click(screen.getByText("Show all projects"));
    expect(pushMock).toHaveBeenCalledWith("/projects");
    expect(await screen.findByLabelText("Library product")).toHaveValue("product-1");
    expect(screen.getByLabelText("Install type")).toHaveValue("INSTALL");
  }, 20000);

  it("does not select another project when a project deep-link is unavailable", async () => {
    searchParamsMock.mockReturnValue(
      new URLSearchParams("project_id=missing-project"),
    );

    apiFetchMock.mockImplementation(async (path: string) => {
      const url = String(path);

      if (url.includes("/api/v1/admin/door-types")) {
        return [];
      }

      if (url.endsWith("/api/v1/admin/projects")) {
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

      if (url.includes("/api/v1/admin/library?status=ACTIVE")) {
        return { items: [] };
      }

      if (url.includes("/api/v1/admin/installers?")) {
        return { items: [] };
      }

      if (url.includes("/api/v1/admin/addons/types")) {
        return { items: [] };
      }

      if (url.includes("/api/v1/admin/projects/import-mapping-profiles")) {
        return { default_code: "auto_v1", items: [] };
      }

      if (url.includes("/api/v1/admin/documents/templates")) {
        return { items: [] };
      }

      if (url.includes("/import-runs/failed-queue")) {
        return { items: [], total: 0, limit: 10, offset: 0 };
      }

      return {};
    });

    render(<ProjectsPage />);

    expect(
      await screen.findByText(
        "Requested project missing-project is not available in the current project list or admin scope.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("project-detail-v2-header")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show all projects" }));
    expect(pushMock).toHaveBeenCalledWith("/projects");
  }, 20000);

  it("blocks duplicate manual door codes before sending create request", async () => {
    apiFetchMock.mockImplementation(async (path: string, init?: RequestInit) => {
      const url = String(path);

      if (url.includes("/api/v1/admin/door-types")) {
        return [{ id: "door-type-1", code: "entrance", name: "Entrance", is_active: true }];
      }

      if (url.endsWith("/api/v1/admin/projects")) {
        return {
          items: [{ id: "project-1", name: "Project A", address: "Address A", status: "ACTIVE" }],
        };
      }

      if (url.includes("/api/v1/admin/library")) {
        return {
          items: [
            {
              id: "product-1",
              sku: "LIB-001",
              name_ru: "Входная дверь",
              name_he: "דלת כניסה",
              install_type: "INSTALL",
              manufacturer: "DIMAX",
              unit: "piece",
              status: "ACTIVE",
            },
          ],
        };
      }

      if (url.includes("/api/v1/admin/installers?")) {
        return { items: [] };
      }

      if (url.includes("/api/v1/admin/projects/import-mapping-profiles")) {
        return { default_code: "auto_v1", items: [] };
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
          total_doors: 1,
          buckets: [
            {
              order_number: "AZ-5001",
              house_number: "A",
              floor_label: "12",
              location_code: "dira",
              door_marking: null,
              total: 1,
              status_breakdown: { NOT_INSTALLED: 1 },
              doors: [
                {
                  id: "door-existing-1",
                  unit_label: "12-04",
                  door_type_id: "door-type-1",
                  order_number: "AZ-5001",
                  apartment_number: "12-04",
                  location_code: "dira",
                  door_marking: "D-1201",
                  status: "NOT_INSTALLED",
                  installer_id: null,
                },
              ],
            },
          ],
        };
      }

      if (url.includes("/api/v1/admin/reports/project-plan-fact/project-1")) {
        return {
          project_id: "project-1",
          total_doors: 1,
          installed_doors: 0,
          not_installed_doors: 1,
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
          missing_planned_rates_doors: 0,
          missing_actual_rates_doors: 0,
          missing_addon_plans_facts: 0,
        };
      }

      if (url.includes("/api/v1/admin/reports/project-risk-drilldown/project-1")) {
        return {
          generated_at: "2026-03-02T10:00:00Z",
          project_id: "project-1",
          project_name: "Project A",
          summary: {
            total_doors: 1,
            installed_doors: 0,
            not_installed_doors: 1,
            completion_pct: 0,
            open_issues: 0,
            blocked_open_issues: 0,
            planned_revenue_total: 0,
            actual_revenue_total: 0,
            revenue_gap_total: 0,
            planned_profit_total: 0,
            actual_profit_total: 0,
            profit_gap_total: 0,
            actual_margin_pct: 0,
            delayed_revenue_total: 0,
            delayed_profit_total: 0,
            blocked_issue_profit_at_risk: 0,
            addon_revenue_total: 0,
            addon_profit_total: 0,
            missing_planned_rates_doors: 0,
            missing_actual_rates_doors: 0,
            missing_addon_plans_facts: 0,
          },
          drivers: [],
          top_reasons: [],
          risky_orders: [],
        };
      }

      if (url.includes("/doors/import-history")) {
        return { items: [] };
      }

      if (url.includes("/import-runs/failed-queue")) {
        return { items: [], total: 0, limit: 10, offset: 0 };
      }

      if (url.includes("/api/v1/admin/projects/project-1/doors") && init?.method === "POST") {
        throw new Error("Duplicate request should not be submitted");
      }

      return {};
    });

    render(<ProjectsPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Add door manually" }));
    fireEvent.change(screen.getByLabelText("Library product"), {
      target: { value: "product-1" },
    });
    fireEvent.change(screen.getByLabelText("Door code"), {
      target: { value: "D-1201" },
    });
    fireEvent.change(screen.getByLabelText("Unit / apartment"), {
      target: { value: "12-05" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create door" }));

    expect(
      await screen.findByText(
        "Door code D-1201 already exists in this project. Review the matrix before creating another door."
      )
    ).toBeInTheDocument();
    expect(
      apiFetchMock.mock.calls.some(
        ([callPath, requestInit]) =>
          String(callPath).includes("/api/v1/admin/projects/project-1/doors") &&
          (requestInit as RequestInit | undefined)?.method === "POST"
      )
    ).toBe(false);
  }, 20000);

  it("creates an additional work plan row for the selected project", async () => {
    apiFetchMock.mockImplementation(async (path: string, init?: RequestInit) => {
      const url = String(path);

      if (url.includes("/api/v1/admin/door-types")) {
        return [];
      }

      if (url.endsWith("/api/v1/admin/projects")) {
        return {
          items: [{ id: "project-1", name: "Project A", address: "Address A", status: "ACTIVE" }],
        };
      }

      if (url.includes("/api/v1/admin/library")) {
        return { items: [] };
      }

      if (url.includes("/api/v1/admin/installers?")) {
        return { items: [] };
      }

      if (url.includes("/api/v1/admin/addons/types")) {
        return {
          items: [{ id: "addon-1", name: "Handle Upgrade", unit: "pcs", status: "ACTIVE" }],
        };
      }

      if (url.includes("/api/v1/admin/projects/import-mapping-profiles")) {
        return {
          default_code: "auto_v1",
          items: [],
        };
      }

      if (url.includes("/api/v1/admin/projects/project-1") && !url.includes("/doors/") && !url.includes("/addons/plan")) {
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
          total_doors: 0,
          buckets: [],
        };
      }

      if (url.includes("/api/v1/admin/projects/project-1/addons/plan") && !init?.method) {
        return { items: [] };
      }

      if (url.includes("/api/v1/admin/reports/project-plan-fact/project-1")) {
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
          missing_planned_rates_doors: 0,
          missing_actual_rates_doors: 0,
          missing_addon_plans_facts: 0,
        };
      }

      if (url.includes("/api/v1/admin/reports/project-risk-drilldown/project-1")) {
        return {
          generated_at: "2026-03-02T10:00:00Z",
          project_id: "project-1",
          project_name: "Project A",
          summary: {
            total_doors: 0,
            installed_doors: 0,
            not_installed_doors: 0,
            completion_pct: 0,
            open_issues: 0,
            blocked_open_issues: 0,
            planned_revenue_total: 0,
            actual_revenue_total: 0,
            revenue_gap_total: 0,
            planned_profit_total: 0,
            actual_profit_total: 0,
            profit_gap_total: 0,
            actual_margin_pct: 0,
            delayed_revenue_total: 0,
            delayed_profit_total: 0,
            blocked_issue_profit_at_risk: 0,
            addon_revenue_total: 0,
            addon_profit_total: 0,
            missing_planned_rates_doors: 0,
            missing_actual_rates_doors: 0,
            missing_addon_plans_facts: 0,
          },
          drivers: [],
          top_reasons: [],
          risky_orders: [],
        };
      }

      if (url.includes("/doors/import-history")) {
        return { items: [] };
      }

      if (url.includes("/import-runs/failed-queue")) {
        return { items: [], total: 0, limit: 10, offset: 0 };
      }

      if (url.includes("/api/v1/admin/projects/project-1/addons/plan") && init?.method === "POST") {
        const payload = JSON.parse(String(init.body));
        expect(payload).toMatchObject({
          addon_type_id: "addon-1",
          qty_planned: "3",
          client_price: "120",
          installer_price: "55",
          notes: "Priority lobby",
        });
        return { id: "plan-1" };
      }

      return {};
    });

    render(<ProjectsPage />);

    const addButton = await screen.findByRole("button", { name: "Add additional work" });
    fireEvent.click(addButton);

    fireEvent.change(screen.getByLabelText("Add-on type"), {
      target: { value: "addon-1" },
    });
    fireEvent.change(screen.getByLabelText("Qty planned"), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByLabelText("Client price"), {
      target: { value: "120" },
    });
    fireEvent.change(screen.getByLabelText("Installer price"), {
      target: { value: "55" },
    });
    fireEvent.change(screen.getByLabelText("Notes"), {
      target: { value: "Priority lobby" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save additional work" }));

    await waitFor(() => {
      expect(
        apiFetchMock.mock.calls.some(
          ([callPath, requestInit]) =>
            String(callPath).includes("/api/v1/admin/projects/project-1/addons/plan") &&
            (requestInit as RequestInit | undefined)?.method === "POST"
        )
      ).toBe(true);
    });
    expect(await screen.findByText("Handle Upgrade was added to the project plan.")).toBeInTheDocument();
  }, 60000);

  it("creates an urgency surcharge row for the selected project", async () => {
    apiFetchMock.mockImplementation(async (path: string, init?: RequestInit) => {
      const url = String(path);

      if (url.includes("/api/v1/admin/door-types")) {
        return [];
      }

      if (url.endsWith("/api/v1/admin/projects")) {
        return {
          items: [{ id: "project-1", name: "Project A", address: "Address A", status: "ACTIVE" }],
        };
      }

      if (url.includes("/api/v1/admin/library")) {
        return { items: [] };
      }

      if (url.includes("/api/v1/admin/installers?")) {
        return { items: [] };
      }

      if (url.includes("/api/v1/admin/addons/types")) {
        return { items: [] };
      }

      if (url.includes("/api/v1/admin/projects/import-mapping-profiles")) {
        return {
          default_code: "auto_v1",
          items: [],
        };
      }

      if (
        url.includes("/api/v1/admin/projects/project-1") &&
        !url.includes("/doors/") &&
        !url.includes("/addons/plan") &&
        !url.includes("/urgency-surcharges")
      ) {
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
          total_doors: 0,
          buckets: [],
        };
      }

      if (url.includes("/api/v1/admin/projects/project-1/addons/plan")) {
        return { items: [] };
      }

      if (url.includes("/api/v1/admin/projects/project-1/urgency-surcharges") && !init?.method) {
        return { items: [] };
      }

      if (url.includes("/api/v1/admin/reports/project-plan-fact/project-1")) {
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
          missing_planned_rates_doors: 0,
          missing_actual_rates_doors: 0,
          missing_addon_plans_facts: 0,
        };
      }

      if (url.includes("/api/v1/admin/reports/project-risk-drilldown/project-1")) {
        return {
          generated_at: "2026-03-02T10:00:00Z",
          project_id: "project-1",
          project_name: "Project A",
          summary: {
            total_doors: 0,
            installed_doors: 0,
            not_installed_doors: 0,
            completion_pct: 0,
            open_issues: 0,
            blocked_open_issues: 0,
            planned_revenue_total: 0,
            actual_revenue_total: 0,
            revenue_gap_total: 0,
            planned_profit_total: 0,
            actual_profit_total: 0,
            profit_gap_total: 0,
            actual_margin_pct: 0,
            delayed_revenue_total: 0,
            delayed_profit_total: 0,
            blocked_issue_profit_at_risk: 0,
            addon_revenue_total: 0,
            addon_profit_total: 0,
            missing_planned_rates_doors: 0,
            missing_actual_rates_doors: 0,
            missing_addon_plans_facts: 0,
          },
          drivers: [],
          top_reasons: [],
          risky_orders: [],
        };
      }

      if (url.includes("/doors/import-history")) {
        return { items: [] };
      }

      if (url.includes("/import-runs/failed-queue")) {
        return { items: [], total: 0, limit: 10, offset: 0 };
      }

      if (url.includes("/api/v1/admin/projects/project-1/urgency-surcharges") && init?.method === "POST") {
        const payload = JSON.parse(String(init.body));
        expect(payload).toMatchObject({
          scope: "ORDER_NUMBER",
          order_number: "AZ-9001",
          reason: "Late-night escalation",
          client_amount: "250",
          installer_amount: "120",
          effective_date: "2026-04-02",
          notes: "Approved by ops",
        });
        return { id: "surcharge-1" };
      }

      return {};
    });

    render(<ProjectsPage />);

    const addButton = await screen.findByRole("button", { name: "Add urgency surcharge" });
    fireEvent.click(addButton);

    fireEvent.change(screen.getByLabelText("Scope"), {
      target: { value: "ORDER_NUMBER" },
    });
    fireEvent.change(screen.getByLabelText("Order number"), {
      target: { value: "AZ-9001" },
    });
    fireEvent.change(screen.getByLabelText("Reason"), {
      target: { value: "Late-night escalation" },
    });
    fireEvent.change(screen.getByLabelText("Client amount"), {
      target: { value: "250" },
    });
    fireEvent.change(screen.getByLabelText("Installer amount"), {
      target: { value: "120" },
    });
    fireEvent.change(screen.getByLabelText("Effective date"), {
      target: { value: "2026-04-02" },
    });
    fireEvent.change(screen.getByLabelText("Notes"), {
      target: { value: "Approved by ops" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save surcharge" }));

    await waitFor(() => {
      expect(
        apiFetchMock.mock.calls.some(
          ([callPath, requestInit]) =>
            String(callPath).includes("/api/v1/admin/projects/project-1/urgency-surcharges") &&
            (requestInit as RequestInit | undefined)?.method === "POST"
        )
      ).toBe(true);
    });
    expect(
      await screen.findByText(
        "Urgency surcharge for order AZ-9001 was saved. The project matrix is now filtered to that order."
      )
    ).toBeInTheDocument();
  }, 60000);

  it("hides commercial project flows without rate access", async () => {
    authSessionMock.mockReturnValue({
      role: "ADMIN",
      admin_scope: "OPERATIONS",
      can_view_rates: false,
    });
    const financialPathFragments = [
      "/api/v1/admin/reports/project-plan-fact/",
      "/api/v1/admin/reports/project-risk-drilldown/",
      "/api/v1/admin/projects/project-1/addons/plan",
      "/api/v1/admin/projects/project-1/urgency-surcharges",
    ];

    apiFetchMock.mockImplementation(async (path: string) => {
      const url = String(path);
      if (financialPathFragments.some((fragment) => url.includes(fragment))) {
        throw new Error(`Financial endpoint should not be called: ${url}`);
      }
      if (url.includes("/api/v1/admin/door-types")) return [];
      if (url.endsWith("/api/v1/admin/projects")) {
        return { items: [{ id: "project-1", name: "Project A", address: "Address A", status: "ACTIVE" }] };
      }
      if (url.includes("/api/v1/admin/library")) return { items: [] };
      if (url.includes("/api/v1/admin/installers?")) return { items: [] };
      if (url.includes("/api/v1/admin/addons/types")) return { items: [] };
      if (url.includes("/api/v1/admin/projects/import-mapping-profiles")) {
        return { default_code: "auto_v1", items: [] };
      }
      if (url.includes("/api/v1/admin/projects/project-1/doors/layout")) {
        return { project_id: "project-1", total_doors: 0, buckets: [] };
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
      if (url.includes("/doors/import-history")) return { items: [] };
      if (url.includes("/import-runs/failed-queue")) {
        return { items: [], total: 0, limit: 10, offset: 0 };
      }
      return {};
    });

    render(<ProjectsPage />);

    expect(
      (await screen.findAllByText("Commercial access is restricted")).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Add additional work" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add urgency surcharge" })).not.toBeInTheDocument();
    await waitFor(() => expect(apiFetchMock).toHaveBeenCalled());
    const calledUrls = apiFetchMock.mock.calls.map(([path]) => String(path));
    expect(calledUrls.some((url) => financialPathFragments.some((fragment) => url.includes(fragment)))).toBe(false);
  }, 20000);

  it("blocks invalid additional work amounts before submit", async () => {
    apiFetchMock.mockImplementation(async (path: string, init?: RequestInit) => {
      const url = String(path);

      if (url.includes("/api/v1/admin/door-types")) return [];
      if (url.endsWith("/api/v1/admin/projects")) {
        return { items: [{ id: "project-1", name: "Project A", address: "Address A", status: "ACTIVE" }] };
      }
      if (url.includes("/api/v1/admin/library")) return { items: [] };
      if (url.includes("/api/v1/admin/installers?")) return { items: [] };
      if (url.includes("/api/v1/admin/addons/types")) {
        return { items: [{ id: "addon-1", name: "Handle Upgrade", unit: "pcs", status: "ACTIVE" }] };
      }
      if (url.includes("/api/v1/admin/projects/import-mapping-profiles")) {
        return { default_code: "auto_v1", items: [] };
      }
      if (url.includes("/api/v1/admin/projects/project-1") && !url.includes("/doors/") && !url.includes("/addons/plan")) {
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
        return { project_id: "project-1", total_doors: 0, buckets: [] };
      }
      if (url.includes("/api/v1/admin/projects/project-1/addons/plan") && !init?.method) {
        return { items: [] };
      }
      if (url.includes("/api/v1/admin/reports/project-plan-fact/project-1")) {
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
          missing_planned_rates_doors: 0,
          missing_actual_rates_doors: 0,
          missing_addon_plans_facts: 0,
        };
      }
      if (url.includes("/api/v1/admin/reports/project-risk-drilldown/project-1")) {
        return {
          generated_at: "2026-03-02T10:00:00Z",
          project_id: "project-1",
          project_name: "Project A",
          summary: {
            total_doors: 0,
            installed_doors: 0,
            not_installed_doors: 0,
            completion_pct: 0,
            open_issues: 0,
            blocked_open_issues: 0,
            planned_revenue_total: 0,
            actual_revenue_total: 0,
            revenue_gap_total: 0,
            planned_profit_total: 0,
            actual_profit_total: 0,
            profit_gap_total: 0,
            actual_margin_pct: 0,
            delayed_revenue_total: 0,
            delayed_profit_total: 0,
            blocked_issue_profit_at_risk: 0,
            addon_revenue_total: 0,
            addon_profit_total: 0,
            missing_planned_rates_doors: 0,
            missing_actual_rates_doors: 0,
            missing_addon_plans_facts: 0,
          },
          drivers: [],
          top_reasons: [],
          risky_orders: [],
        };
      }
      if (url.includes("/doors/import-history")) return { items: [] };
      if (url.includes("/import-runs/failed-queue")) return { items: [], total: 0, limit: 10, offset: 0 };
      if (url.includes("/api/v1/admin/projects/project-1/addons/plan") && init?.method === "POST") {
        throw new Error("Invalid plan row should not be submitted");
      }
      return {};
    });

    render(<ProjectsPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Add additional work" }));
    fireEvent.change(screen.getByLabelText("Add-on type"), {
      target: { value: "addon-1" },
    });
    fireEvent.change(screen.getByLabelText("Qty planned"), {
      target: { value: "0" },
    });
    fireEvent.change(screen.getByLabelText("Client price"), {
      target: { value: "-10" },
    });
    fireEvent.change(screen.getByLabelText("Installer price"), {
      target: { value: "0" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save additional work" }));

    expect(
      await screen.findByText("Use positive numbers for planned qty and both prices.")
    ).toBeInTheDocument();
    expect(
      apiFetchMock.mock.calls.some(
        ([callPath, requestInit]) =>
          String(callPath).includes("/api/v1/admin/projects/project-1/addons/plan") &&
          (requestInit as RequestInit | undefined)?.method === "POST"
      )
    ).toBe(false);
  }, 30000);

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

    fireEvent.click(screen.getAllByRole("button", { name: "View" })[0]);

    expect(await screen.findByText("Selected Import Run")).toBeInTheDocument();
    expect(await screen.findByText("Run data summary:")).toBeInTheDocument();
    expect(screen.getByText("Run structure preview:")).toBeInTheDocument();
    expect(screen.getByText("Orders: 1")).toBeInTheDocument();
    expect(screen.getByText("מספר הזמנה: found")).toBeInTheDocument();
    expect(screen.getAllByText("AZ-2001").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Mamad, Dira").length).toBeGreaterThan(0);
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
      expect(screen.getAllByText("analyze.csv").length).toBeGreaterThan(0);
    });

    fireEvent.change(screen.getByLabelText("Import history status"), {
      target: { value: "FAILED" },
    });

    expect(await screen.findByText("No import runs for selected filters.")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Open run" })[0]);

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

    fireEvent.click(screen.getAllByRole("button", { name: "Open run" })[0]);

    expect(await screen.findByText("Row 4: Missing marking")).toBeInTheDocument();
  }, 20000);

  it("creates and edits a project with address and contact quick actions", async () => {
    let projects = [
      { id: "project-1", name: "Project A", code: "PRJ-001", address: "Address A", status: "NEW" },
    ];
    let projectDetails = {
      id: "project-1",
      name: "Project A",
      code: "PRJ-001",
      address: "Address A",
      status: "NEW",
      planned_start_date: null,
      planned_end_date: null,
      developer_company: "DIMAX Dev Co",
      contact_name: "Eyal Cohen",
      contact_phone: "+972501111111",
      contact_email: "eyal@example.com",
      developer_phone_alt: null,
      developer_whatsapp: "+972502222222",
      developer_notes: "Call before arrival",
      address_street: "Harbor",
      address_building: "11",
      address_city: "Ashdod",
      address_entrance: "A",
      address_lat: "31.8",
      address_lng: "34.6",
      address_waze_url: null,
      waze_deep_link: "https://waze.example/project-1",
      whatsapp_deep_link: "https://wa.me/972502222222",
      call_deep_link: "tel:+972501111111",
      issues_open: [],
      doors: [],
    };

    apiFetchMock.mockImplementation(async (path: string, init?: RequestInit) => {
      const url = String(path);

      if (url.includes("/api/v1/admin/door-types")) {
        return [{ id: "door-type-1", code: "entrance", name: "Entrance", is_active: true }];
      }
      if (url.includes("/api/v1/admin/projects/import-mapping-profiles")) {
        return { default_code: "auto_v1", items: [] };
      }
      if (url.includes("/api/v1/admin/projects/project-1/doors/layout")) {
        return { project_id: "project-1", total_doors: 0, buckets: [] };
      }
      if (url.includes("/api/v1/admin/projects/project-1") && !url.includes("/doors/") && !url.includes("/addons/") && !url.includes("/urgency-surcharges")) {
        return projectDetails;
      }
      if (url.endsWith("/api/v1/admin/projects") && (!init || !init.method || init.method === "GET")) {
        return { items: projects };
      }
      if (url === "/api/v1/admin/projects" && init?.method === "POST") {
        const payload = JSON.parse(String(init.body));
        expect(payload).toMatchObject({
          code: "PRJ-777",
          name: "Harbor Tower",
          address_street: "Harbor",
          address_building: "11",
          address_city: "Ashdod",
          developer_company: "Builder Ltd",
          contact_name: "Yael Cohen",
          contact_phone: "+972501234567",
          developer_whatsapp: "+972509876543",
        });

        projects = [
          ...projects,
          {
            id: "project-3",
            name: "Harbor Tower",
            code: "PRJ-777",
            address: "Harbor, 11, Ashdod, A",
            status: "NEW",
          },
        ];
        projectDetails = {
          ...projectDetails,
          id: "project-3",
          name: "Harbor Tower",
          code: "PRJ-777",
          address: "Harbor, 11, Ashdod, A",
          developer_company: "Builder Ltd",
          contact_name: "Yael Cohen",
          contact_phone: "+972501234567",
          contact_email: "yael@example.com",
          developer_whatsapp: "+972509876543",
          address_street: "Harbor",
          address_building: "11",
          address_city: "Ashdod",
          address_entrance: "A",
          waze_deep_link: "https://waze.example/project-3",
          whatsapp_deep_link: "https://wa.me/972509876543",
          call_deep_link: "tel:+972501234567",
          issues_open: [],
          doors: [],
        };
        return { id: "project-3" };
      }
      if (url === "/api/v1/admin/projects/project-3" && init?.method === "PATCH") {
        const payload = JSON.parse(String(init.body));
        expect(payload.contact_name).toBe("Noa Levi");
        projectDetails = {
          ...projectDetails,
          contact_name: "Noa Levi",
        };
        return { ok: true };
      }
      if (url.includes("/api/v1/admin/projects/project-3") && !url.includes("/doors/") && !url.includes("/addons/") && !url.includes("/urgency-surcharges")) {
        return projectDetails;
      }
      if (url.includes("/api/v1/admin/projects/project-3/doors/layout")) {
        return { project_id: "project-3", total_doors: 0, buckets: [] };
      }
      if (url.includes("/api/v1/admin/projects/project-3/addons/plan")) {
        return { items: [], summary: { total_rows: 0, total_qty_planned: "0", total_client_price: "0", total_installer_price: "0" } };
      }
      if (url.includes("/api/v1/admin/projects/project-3/urgency-surcharges")) {
        return { items: [], summary: { total_rows: 0, order_rows: 0, total_client_amount: "0", total_installer_amount: "0" } };
      }
      if (url.includes("/api/v1/admin/projects/project-3/doors/import-history")) {
        return { items: [] };
      }
      if (url.includes("/api/v1/admin/projects/import-runs/failed-queue")) {
        return { items: [], total: 0, limit: 10, offset: 0 };
      }
      if (url.includes("/api/v1/admin/library")) {
        return { items: [] };
      }
      if (url.includes("/api/v1/admin/installers")) {
        return { items: [] };
      }

      return {};
    });

    render(<ProjectsPage />);

    fireEvent.click(await screen.findByRole("button", { name: "New project" }));
    fireEvent.change(screen.getByLabelText("Project code"), { target: { value: "PRJ-777" } });
    fireEvent.change(screen.getByLabelText("Project name"), { target: { value: "Harbor Tower" } });
    fireEvent.change(screen.getByLabelText("Street"), { target: { value: "Harbor" } });
    fireEvent.change(screen.getByLabelText("Building"), { target: { value: "11" } });
    fireEvent.change(screen.getByLabelText("City"), { target: { value: "Ashdod" } });
    fireEvent.change(screen.getByLabelText("Entrance"), { target: { value: "A" } });
    fireEvent.change(screen.getByLabelText("Developer company"), { target: { value: "Builder Ltd" } });
    fireEvent.change(screen.getByLabelText("Contact name"), { target: { value: "Yael Cohen" } });
    fireEvent.change(screen.getByLabelText("Primary phone"), { target: { value: "+972501234567" } });
    fireEvent.change(screen.getByLabelText("WhatsApp"), { target: { value: "+972509876543" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "yael@example.com" } });

    fireEvent.click(screen.getByRole("button", { name: "Create project" }));

    expect(await screen.findByText("Project created. Continue with address, contacts and import flow.")).toBeInTheDocument();
    expect(await screen.findByText(/PRJ-777.*Harbor Tower/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Waze" })).toHaveAttribute("href", "https://waze.example/project-3");
    expect(screen.getByRole("link", { name: "WhatsApp" })).toHaveAttribute("href", "https://wa.me/972509876543");
    expect(screen.getByRole("link", { name: "Call" })).toHaveAttribute("href", "tel:+972501234567");

    fireEvent.click(screen.getByRole("button", { name: "Edit project" }));
    fireEvent.change(screen.getByLabelText("Contact name"), { target: { value: "Noa Levi" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Project settings updated. Quick actions are ready where data is available.")).toBeInTheDocument();
    expect(await screen.findByText("Noa Levi")).toBeInTheDocument();
  }, 90000);

  it("keeps quick actions visible and shows guidance when project contact data is missing", async () => {
    apiFetchMock.mockImplementation(async (path: string) => {
      const url = String(path);

      if (url.includes("/api/v1/admin/door-types")) {
        return [{ id: "door-type-1", code: "entrance", name: "Entrance", is_active: true }];
      }
      if (url.includes("/api/v1/admin/projects/address-suggestions")) {
        return {
          items: [
            {
              key: "herzl-14-ashdod-a",
              label: "Herzl, 14, Ashdod, A",
              street: "Herzl",
              building: "14",
              city: "Ashdod",
              entrance: "A",
              lat: "31.8014",
              lng: "34.6435",
            },
          ],
        };
      }
      if (url.includes("/api/v1/admin/projects/import-mapping-profiles")) {
        return { default_code: "auto_v1", items: [] };
      }
      if (url.endsWith("/api/v1/admin/projects")) {
        return {
          items: [{ id: "project-1", name: "Project A", code: "PRJ-001", address: "", status: "NEW" }],
        };
      }
      if (url.includes("/api/v1/admin/projects/project-1/doors/layout")) {
        return { project_id: "project-1", total_doors: 0, buckets: [] };
      }
      if (url.includes("/api/v1/admin/projects/project-1") && !url.includes("/doors/") && !url.includes("/addons/") && !url.includes("/urgency-surcharges")) {
        return {
          id: "project-1",
          name: "Project A",
          code: "PRJ-001",
          address: "",
          status: "NEW",
          developer_company: null,
          contact_name: null,
          contact_phone: null,
          contact_email: null,
          developer_phone_alt: null,
          developer_whatsapp: null,
          developer_notes: null,
          address_street: null,
          address_building: null,
          address_city: null,
          address_entrance: null,
          address_lat: null,
          address_lng: null,
          address_waze_url: null,
          waze_deep_link: null,
          whatsapp_deep_link: null,
          call_deep_link: null,
          issues_open: [],
          doors: [],
        };
      }
      if (url.includes("/api/v1/admin/projects/import-runs/failed-queue")) {
        return { items: [], total: 0, limit: 10, offset: 0 };
      }
      if (url.includes("/api/v1/admin/library")) {
        return { items: [] };
      }
      if (url.includes("/api/v1/admin/installers")) {
        return { items: [] };
      }
      return {};
    });

    render(<ProjectsPage />);

    const projectHeader = await screen.findByTestId("project-detail-v2-header");
    expect(within(projectHeader).getByText("PRJ-001")).toBeInTheDocument();
    expect(
      within(projectHeader).getByText("Doors installed"),
    ).toBeInTheDocument();
    expect(within(projectHeader).getByText("Open issues")).toBeInTheDocument();
    const commandCenter = await screen.findByTestId("project-detail-v28-command");
    expect(
      within(commandCenter).getByText("Door installation control"),
    ).toBeInTheDocument();
    expect(
      within(commandCenter).getByTestId("project-detail-v28-open-doors"),
    ).toBeInTheDocument();
    expect(within(commandCenter).getByText("Stakeholders")).toBeInTheDocument();

    fireEvent.click(await screen.findByRole("button", { name: "Waze" }));
    expect(
      await screen.findByText("Add address in project settings to unlock Waze.")
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "WhatsApp" }));
    expect(
      await screen.findByText("Add a contact phone or WhatsApp number to unlock WhatsApp.")
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Call" }));
    expect(
      await screen.findByText("Add a primary phone in project settings to unlock calling.")
    ).toBeInTheDocument();
  }, 25000);

  it("shows a single admin mobile actions trigger for quick project actions", async () => {
    apiFetchMock.mockImplementation(async (path: string) => {
      const url = String(path);

      if (url.includes("/api/v1/admin/door-types")) {
        return [{ id: "door-type-1", code: "entrance", name: "Entrance", is_active: true }];
      }
      if (url.includes("/api/v1/admin/projects/address-suggestions")) {
        return { items: [] };
      }
      if (url.includes("/api/v1/admin/projects/import-mapping-profiles")) {
        return { default_code: "auto_v1", items: [] };
      }
      if (url.endsWith("/api/v1/admin/projects")) {
        return {
          items: [{ id: "project-1", name: "Project A", code: "PRJ-001", address: "Harbor 11", status: "NEW" }],
        };
      }
      if (url.includes("/api/v1/admin/projects/project-1/doors/layout")) {
        return { project_id: "project-1", total_doors: 0, buckets: [] };
      }
      if (url.includes("/api/v1/admin/projects/project-1") && !url.includes("/doors/") && !url.includes("/addons/") && !url.includes("/urgency-surcharges")) {
        return {
          id: "project-1",
          name: "Project A",
          code: "PRJ-001",
          address: "Harbor 11, Ashdod",
          status: "NEW",
          developer_company: "Builder Ltd",
          contact_name: "Yael Cohen",
          contact_phone: "+972501234567",
          contact_email: "yael@example.com",
          developer_phone_alt: null,
          developer_whatsapp: "+972509876543",
          developer_notes: "Call before arrival.",
          address_street: "Harbor",
          address_building: "11",
          address_city: "Ashdod",
          address_entrance: null,
          address_lat: "31.8014",
          address_lng: "34.6435",
          address_waze_url: null,
          waze_deep_link: "https://waze.com/ul?ll=31.8014,34.6435&navigate=yes",
          whatsapp_deep_link: "https://wa.me/972509876543",
          call_deep_link: "tel:+972501234567",
          issues_open: [],
          doors: [],
        };
      }
      if (url.includes("/api/v1/admin/projects/import-runs/failed-queue")) {
        return { items: [], total: 0, limit: 10, offset: 0 };
      }
      if (url.includes("/api/v1/admin/library")) {
        return { items: [] };
      }
      if (url.includes("/api/v1/admin/installers")) {
        return { items: [] };
      }
      return {};
    });

    render(<ProjectsPage />);

    expect(await screen.findByRole("button", { name: "Actions" })).toBeInTheDocument();
  }, 25000);

  it("shows readable project phone next to call action and copies it on click", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, "clipboard", {
      value: { writeText: writeTextMock },
      configurable: true,
    });

    apiFetchMock.mockImplementation(async (path: string) => {
      const url = String(path);

      if (url.includes("/api/v1/admin/door-types")) {
        return [{ id: "door-type-1", code: "entrance", name: "Entrance", is_active: true }];
      }
      if (url.includes("/api/v1/admin/projects/address-suggestions")) {
        return { items: [] };
      }
      if (url.includes("/api/v1/admin/projects/import-mapping-profiles")) {
        return { default_code: "auto_v1", items: [] };
      }
      if (url.endsWith("/api/v1/admin/projects")) {
        return {
          items: [{ id: "project-1", name: "Project A", code: "PRJ-001", address: "Harbor 11", status: "NEW" }],
        };
      }
      if (url.includes("/api/v1/admin/projects/project-1/doors/layout")) {
        return { project_id: "project-1", total_doors: 0, buckets: [] };
      }
      if (url.includes("/api/v1/admin/projects/project-1") && !url.includes("/doors/") && !url.includes("/addons/") && !url.includes("/urgency-surcharges")) {
        return {
          id: "project-1",
          name: "Project A",
          code: "PRJ-001",
          address: "Harbor 11, Ashdod",
          status: "NEW",
          developer_company: "Builder Ltd",
          contact_name: "Yael Cohen",
          contact_phone: "+972501234567",
          contact_email: "yael@example.com",
          developer_phone_alt: null,
          developer_whatsapp: "+972509876543",
          developer_notes: "Call before arrival.",
          address_street: "Harbor",
          address_building: "11",
          address_city: "Ashdod",
          address_entrance: null,
          address_lat: "31.8014",
          address_lng: "34.6435",
          address_waze_url: null,
          waze_deep_link: "https://waze.com/ul?ll=31.8014,34.6435&navigate=yes",
          whatsapp_deep_link: "https://wa.me/972509876543",
          call_deep_link: "tel:+972501234567",
          issues_open: [],
          doors: [],
        };
      }
      if (url.includes("/api/v1/admin/projects/import-runs/failed-queue")) {
        return { items: [], total: 0, limit: 10, offset: 0 };
      }
      if (url.includes("/api/v1/admin/library")) {
        return { items: [] };
      }
      if (url.includes("/api/v1/admin/installers")) {
        return { items: [] };
      }
      return {};
    });

    render(<ProjectsPage />);

    const phoneCopyButton = await screen.findByRole("button", { name: "+972 50-123-4567" });
    expect(screen.getByRole("link", { name: "Call" })).toHaveAttribute("href", "tel:+972501234567");

    fireEvent.click(phoneCopyButton);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith("+972501234567");
    });
    expect(await screen.findByText("Phone number copied.")).toBeInTheDocument();
  }, 25000);

  it("autofills structured address fields from project address suggestions", async () => {
    apiFetchMock.mockImplementation(async (path: string) => {
      const url = String(path);

      if (url.includes("/api/v1/admin/door-types")) {
        return [{ id: "door-type-1", code: "entrance", name: "Entrance", is_active: true }];
      }
      if (url.includes("/api/v1/admin/projects/address-suggestions")) {
        return {
          items: [
            {
              key: "herzl-14-ashdod-a",
              label: "Herzl, 14, Ashdod, A",
              street: "Herzl",
              building: "14",
              city: "Ashdod",
              entrance: "A",
              lat: "31.8014",
              lng: "34.6435",
            },
          ],
        };
      }
      if (url.includes("/api/v1/admin/projects/import-mapping-profiles")) {
        return { default_code: "auto_v1", items: [] };
      }
      if (url.endsWith("/api/v1/admin/projects")) {
        return {
          items: [{ id: "project-1", name: "Project A", code: "PRJ-001", address: "Address A", status: "NEW" }],
        };
      }
      if (url.includes("/api/v1/admin/projects/project-1/doors/layout")) {
        return { project_id: "project-1", total_doors: 0, buckets: [] };
      }
      if (url.includes("/api/v1/admin/projects/project-1") && !url.includes("/doors/") && !url.includes("/addons/") && !url.includes("/urgency-surcharges")) {
        return {
          id: "project-1",
          name: "Project A",
          code: "PRJ-001",
          address: "Address A",
          status: "NEW",
          developer_company: "DIMAX Dev Co",
          contact_name: "Eyal Cohen",
          issues_open: [],
          doors: [],
        };
      }
      if (url.includes("/api/v1/admin/projects/import-runs/failed-queue")) {
        return { items: [], total: 0, limit: 10, offset: 0 };
      }
      return {};
    });

    render(<ProjectsPage />);

    fireEvent.click(await screen.findByRole("button", { name: "New project" }));
    fireEvent.change(screen.getByLabelText("Address search / fallback"), {
      target: { value: "Herzl, 14, Ashdod, A" },
    });

    fireEvent.click(await screen.findByRole("button", { name: "Herzl, 14, Ashdod, A" }));

    expect(screen.getByLabelText("Street")).toHaveValue("Herzl");
    expect(screen.getByLabelText("Building")).toHaveValue("14");
    expect(screen.getByLabelText("City")).toHaveValue("Ashdod");
    expect(screen.getByLabelText("Entrance")).toHaveValue("A");
    expect(screen.getByLabelText("Lat")).toHaveValue("31.8014");
    expect(screen.getByLabelText("Lng")).toHaveValue("34.6435");
    expect(screen.getByText("Coordinates: 31.8014, 34.6435")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Test Waze" })).toHaveAttribute(
      "href",
      "https://www.waze.com/ul?ll=31.8014,34.6435&navigate=yes"
    );
    expect(screen.getByTitle("Map preview")).toHaveAttribute("src", expect.stringContaining("openstreetmap.org/export/embed.html"));
  }, 25000);

  it("autoformats project contact phones to israel format while typing", async () => {
    apiFetchMock.mockImplementation(async (path: string) => {
      const url = String(path);

      if (url.includes("/api/v1/admin/door-types")) {
        return [{ id: "door-type-1", code: "entrance", name: "Entrance", is_active: true }];
      }
      if (url.includes("/api/v1/admin/projects/import-mapping-profiles")) {
        return { default_code: "auto_v1", items: [] };
      }
      if (url.endsWith("/api/v1/admin/projects")) {
        return { items: [] };
      }
      if (url.includes("/api/v1/admin/projects/import-runs/failed-queue")) {
        return { items: [], total: 0, limit: 10, offset: 0 };
      }
      return {};
    });

    render(<ProjectsPage />);

    fireEvent.click(await screen.findByRole("button", { name: "New project" }));

    fireEvent.change(screen.getByLabelText("Primary phone"), { target: { value: "050-123-4567" } });
    fireEvent.change(screen.getByLabelText("Alt phone"), { target: { value: "052 765 4321" } });
    fireEvent.change(screen.getByLabelText("WhatsApp"), { target: { value: "0549990000" } });

    expect(screen.getByLabelText("Primary phone")).toHaveValue("+972501234567");
    expect(screen.getByLabelText("Alt phone")).toHaveValue("+972527654321");
    expect(screen.getByLabelText("WhatsApp")).toHaveValue("+972549990000");
  }, 25000);

  it("builds localized WhatsApp draft text for project contact checks", async () => {
    apiFetchMock.mockImplementation(async (path: string) => {
      const url = String(path);

      if (url.includes("/api/v1/admin/door-types")) {
        return [{ id: "door-type-1", code: "entrance", name: "Entrance", is_active: true }];
      }
      if (url.includes("/api/v1/admin/projects/import-mapping-profiles")) {
        return { default_code: "auto_v1", items: [] };
      }
      if (url.endsWith("/api/v1/admin/projects")) {
        return { items: [] };
      }
      if (url.includes("/api/v1/admin/projects/import-runs/failed-queue")) {
        return { items: [], total: 0, limit: 10, offset: 0 };
      }
      return {};
    });

    render(<ProjectsPage />);
    fireEvent.click(await screen.findByRole("button", { name: "New project" }));

    fireEvent.change(screen.getByLabelText("Project code"), { target: { value: "PRJ-042" } });
    fireEvent.change(screen.getByLabelText("Project name"), { target: { value: "Ashdod Towers Block B" } });
    fireEvent.change(screen.getByLabelText("Primary phone"), { target: { value: "0521234567" } });

    expect(screen.getByRole("link", { name: "Test WhatsApp" })).toHaveAttribute(
      "href",
      "https://wa.me/972521234567?text=Hello%2C%20regarding%20project%20Ashdod%20Towers%20Block%20B%20(PRJ-042)"
    );
  }, 25000);

  it("keeps Waze preview priority as coordinates over manual url", async () => {
    apiFetchMock.mockImplementation(async (path: string) => {
      const url = String(path);

      if (url.includes("/api/v1/admin/door-types")) {
        return [{ id: "door-type-1", code: "entrance", name: "Entrance", is_active: true }];
      }
      if (url.includes("/api/v1/admin/projects/import-mapping-profiles")) {
        return { default_code: "auto_v1", items: [] };
      }
      if (url.endsWith("/api/v1/admin/projects")) {
        return { items: [] };
      }
      if (url.includes("/api/v1/admin/projects/import-runs/failed-queue")) {
        return { items: [], total: 0, limit: 10, offset: 0 };
      }
      return {};
    });

    render(<ProjectsPage />);
    fireEvent.click(await screen.findByRole("button", { name: "New project" }));

    fireEvent.change(screen.getByLabelText("Lat"), { target: { value: "31.8014" } });
    fireEvent.change(screen.getByLabelText("Lng"), { target: { value: "34.6435" } });
    fireEvent.change(screen.getByLabelText("Waze URL override"), {
      target: { value: "https://waze.com/ul?q=Manual+Override" },
    });

    expect(screen.getByRole("link", { name: "Test Waze" })).toHaveAttribute(
      "href",
      "https://www.waze.com/ul?ll=31.8014,34.6435&navigate=yes"
    );
  }, 25000);

  it("shows field guidance when backend rejects invalid phone or Waze URL", async () => {
    apiFetchMock.mockImplementation(async (path: string, init?: RequestInit) => {
      const url = String(path);

      if (url.includes("/api/v1/admin/door-types")) {
        return [{ id: "door-type-1", code: "entrance", name: "Entrance", is_active: true }];
      }
      if (url.includes("/api/v1/admin/projects/import-mapping-profiles")) {
        return { default_code: "auto_v1", items: [] };
      }
      if (url.endsWith("/api/v1/admin/projects") && (!init?.method || init.method === "GET")) {
        return { items: [] };
      }
      if (url.includes("/api/v1/admin/projects/import-runs/failed-queue")) {
        return { items: [], total: 0, limit: 10, offset: 0 };
      }
      if (url.endsWith("/api/v1/admin/projects") && init?.method === "POST") {
        const payload = JSON.parse(String(init.body));
        if (payload.address_waze_url) {
          throw new ApiError(422, "Waze URL must be a valid http or https address", {
            error: { code: "INVALID_WAZE_URL", field: "address_waze_url" },
          });
        }
        throw new ApiError(422, "Phone number must be in international format", {
          error: { code: "INVALID_PHONE", field: "contact_phone" },
        });
      }
      return {};
    });

    render(<ProjectsPage />);

    fireEvent.click(await screen.findByRole("button", { name: "New project" }));
    fireEvent.change(screen.getByLabelText("Project name"), { target: { value: "Validation Project" } });
    fireEvent.change(screen.getByLabelText("Primary phone"), { target: { value: "abc" } });

    fireEvent.click(screen.getByRole("button", { name: "Create project" }));
    expect(await screen.findByText("Enter the primary phone in +972XXXXXXXXX format.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Primary phone"), { target: { value: "0501234567" } });
    expect(screen.queryByText("Enter the primary phone in +972XXXXXXXXX format.")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Waze URL override"), { target: { value: "ftp://bad-link" } });
    fireEvent.click(screen.getByRole("button", { name: "Create project" }));

    expect(await screen.findByText("Enter a valid http or https Waze link.")).toBeInTheDocument();
  }, 25000);

});
