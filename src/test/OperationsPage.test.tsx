import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import OperationsPage from "@/views/OperationsPage";

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  apiFetch: apiFetchMock,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/operations",
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

vi.mock("@/hooks/use-user-role", () => ({
  useUserRole: () => "ADMIN",
}));

function renderSubject() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <OperationsPage />
    </QueryClientProvider>
  );
}

describe("OperationsPage", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    window.history.replaceState({}, "", "/operations");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders operational queue health data", async () => {
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path === "/api/v1/admin/sync/health/summary") {
        return {
          max_cursor: 18,
          counts: {
            ok: 4,
            warn: 1,
            danger: 2,
            total: 7,
            dead: 1,
            never_seen: 0,
            danger_pct: 28.57,
          },
          alerts_sent: 3,
          top_laggers: [
            {
              installer_id: "installer-2",
              status: "danger",
              lag: 9,
              days_offline: 2,
              last_seen_at: "2026-03-07T08:00:00Z",
            },
          ],
          top_offline: [],
        };
      }
      if (path === "/api/v1/admin/outbox/summary") {
        return {
          total: 12,
          by_channel: { email: 8, whatsapp: 4 },
          by_status: { PENDING: 5, FAILED: 3 },
          by_delivery_status: { failed: 3, pending: 5 },
          pending_overdue_15m: 2,
          failed_total: 3,
        };
      }
      if (path === "/api/v1/admin/outbox?status=FAILED&limit=8") {
        return {
          items: [
            {
              id: "outbox-1",
              channel: "email",
              recipient: "ops@dimax.test",
              subject: "Import failed",
              status: "FAILED",
              delivery_status: "failed",
              attempts: 3,
              max_attempts: 5,
              scheduled_at: "2026-03-07T09:00:00Z",
              created_at: "2026-03-07T08:55:00Z",
              last_error: "SMTP timeout",
            },
          ],
        };
      }
      if (path === "/api/v1/admin/projects/import-runs/failed-queue?limit=8&offset=0") {
        return {
          items: [
            {
              run_id: "run-1",
              project_id: "project-1",
              project_name: "Ashdod Towers",
              created_at: "2026-03-07T08:00:00Z",
              mode: "import",
              status: "FAILED",
              source_filename: "ashdod.csv",
              parsed_rows: 12,
              prepared_rows: 10,
              imported: 0,
              skipped: 0,
              errors_count: 2,
              last_error: "Unknown door type",
              retry_available: true,
            },
          ],
          total: 1,
          limit: 8,
          offset: 0,
        };
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    renderSubject();

    expect(await screen.findByText("Operations Center")).toBeInTheDocument();
    expect(screen.getByText("Sync danger")).toBeInTheDocument();
    expect(screen.getByText("Failed imports")).toBeInTheDocument();
    expect(screen.getByText("Failed outbox")).toBeInTheDocument();
    expect(screen.getByText("Pending > 15m")).toBeInTheDocument();
    expect(screen.getByText("Action Summary")).toBeInTheDocument();
    expect(screen.getByText("Data Freshness")).toBeInTheDocument();
    expect(screen.getByText("fresh")).toBeInTheDocument();
    expect(screen.getByText(/Fresh as of/)).toBeInTheDocument();
    expect(screen.queryByText("Last Batch Result")).not.toBeInTheDocument();
    expect(screen.getByText("Retry failed import for Ashdod Towers")).toBeInTheDocument();
    expect(screen.getByText("Recover delivery for ops@dimax.test")).toBeInTheDocument();
    expect(screen.getByText("Investigate installer installer-2")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Retry actionable imports (1)" })
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Reconcile actionable projects (1)" })
    ).toBeEnabled();

    expect(screen.getAllByText("Ashdod Towers")).toHaveLength(2);
    expect(screen.getByText("Unknown door type")).toBeInTheDocument();
    expect(screen.getByText("ops@dimax.test")).toBeInTheDocument();
    expect(screen.getByText("SMTP timeout")).toBeInTheDocument();
    expect(screen.getByText("installer-2")).toBeInTheDocument();
    expect(screen.getByText(/lag 9/)).toBeInTheDocument();

    expect(screen.getByRole("link", { name: "Open import workspace" })).toHaveAttribute(
      "href",
      "/projects?only_failed_runs=1&failed_project_ids=project-1"
    );
    expect(screen.getByRole("link", { name: "Open operations reports" })).toHaveAttribute(
      "href",
      "/reports?focus=operations&ops_preset=failed-imports"
    );
    expect(screen.getByRole("link", { name: "Open delivery reports" })).toHaveAttribute(
      "href",
      "/reports?focus=delivery&ops_preset=delivery-risk"
    );
    expect(screen.getByRole("link", { name: "Open issues reports" })).toHaveAttribute(
      "href",
      "/reports?focus=issues&ops_preset=issue-pressure"
    );
    expect(screen.getByRole("link", { name: "Open communication queue" })).toHaveAttribute(
      "href",
      "/journal"
    );
    expect(screen.getByRole("link", { name: "Open installer board" })).toHaveAttribute(
      "href",
      "/installers"
    );
    expect(screen.getByRole("link", { name: "Project imports" })).toHaveAttribute(
      "href",
      "/projects?only_failed_runs=1&project_id=project-1&failed_project_ids=project-1"
    );
    expect(screen.getByRole("link", { name: "Project report" })).toHaveAttribute(
      "href",
      "/reports?focus=operations&ops_preset=failed-imports&project_id=project-1"
    );
    expect(screen.getByRole("link", { name: "Open project" })).toHaveAttribute(
      "href",
      "/projects?project_id=project-1"
    );
    expect(screen.getByRole("link", { name: "Delivery reports" })).toHaveAttribute(
      "href",
      "/reports?focus=delivery&ops_preset=delivery-risk"
    );
    expect(screen.getByRole("link", { name: "Delivery report" })).toHaveAttribute(
      "href",
      "/reports?focus=delivery&ops_preset=delivery-risk&outbox_id=outbox-1"
    );
    expect(screen.getByRole("link", { name: "Journal outbox" })).toHaveAttribute(
      "href",
      "/journal"
    );
    expect(screen.getByRole("link", { name: "Installer report" })).toHaveAttribute(
      "href",
      "/reports?focus=operations&ops_preset=issue-pressure&installer_id=installer-2"
    );
    expect(screen.getByRole("link", { name: "Installer board" })).toHaveAttribute(
      "href",
      "/installers"
    );
  }, 15000);

  it("reads and syncs actionable filter with url state", async () => {
    window.history.replaceState({}, "", "/operations?actionable=1");

    apiFetchMock.mockImplementation(async (path: string) => {
      if (path === "/api/v1/admin/sync/health/summary") {
        return {
          max_cursor: 18,
          counts: {
            ok: 4,
            warn: 1,
            danger: 2,
            total: 7,
            dead: 1,
            never_seen: 0,
            danger_pct: 28.57,
          },
          alerts_sent: 3,
          top_laggers: [
            {
              installer_id: "installer-2",
              status: "danger",
              lag: 9,
              days_offline: 2,
              last_seen_at: "2026-03-07T08:00:00Z",
            },
            {
              installer_id: "installer-3",
              status: "warn",
              lag: 0,
              days_offline: 0,
              last_seen_at: "2026-03-07T08:05:00Z",
            },
          ],
          top_offline: [],
        };
      }
      if (path === "/api/v1/admin/outbox/summary") {
        return {
          total: 12,
          by_channel: { email: 8, whatsapp: 4 },
          by_status: { PENDING: 5, FAILED: 3 },
          by_delivery_status: { failed: 3, pending: 5 },
          pending_overdue_15m: 2,
          failed_total: 3,
        };
      }
      if (path === "/api/v1/admin/outbox?status=FAILED&limit=8") {
        return {
          items: [
            {
              id: "outbox-1",
              channel: "email",
              recipient: "ops@dimax.test",
              subject: "Import failed",
              status: "FAILED",
              delivery_status: "failed",
              attempts: 3,
              max_attempts: 5,
              scheduled_at: "2026-03-07T09:00:00Z",
              created_at: "2026-03-07T08:55:00Z",
              last_error: "SMTP timeout",
            },
          ],
        };
      }
      if (path === "/api/v1/admin/projects/import-runs/failed-queue?limit=8&offset=0") {
        return {
          items: [
            {
              run_id: "run-1",
              project_id: "project-1",
              project_name: "Ashdod Towers",
              created_at: "2026-03-07T08:00:00Z",
              mode: "import",
              status: "FAILED",
              source_filename: "ashdod.csv",
              parsed_rows: 12,
              prepared_rows: 10,
              imported: 0,
              skipped: 0,
              errors_count: 2,
              last_error: "Unknown door type",
              retry_available: true,
            },
            {
              run_id: "run-2",
              project_id: "project-2",
              project_name: "Bat Yam Heights",
              created_at: "2026-03-07T07:40:00Z",
              mode: "import",
              status: "FAILED",
              source_filename: "bat-yam.csv",
              parsed_rows: 9,
              prepared_rows: 9,
              imported: 0,
              skipped: 0,
              errors_count: 1,
              last_error: "Provider timeout",
              retry_available: false,
            },
          ],
          total: 2,
          limit: 8,
          offset: 0,
        };
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    renderSubject();

    expect(await screen.findByText("Operations Center")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Only actionable" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(window.location.search).toBe("?actionable=1");
    expect(screen.queryByText("Bat Yam Heights")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Only actionable" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Only actionable" })).toHaveAttribute(
        "aria-pressed",
        "false"
      );
    });
    expect(window.location.pathname).toBe("/operations");
    expect(window.location.search).toBe("");
    expect(screen.getByText("Bat Yam Heights")).toBeInTheDocument();
  }, 10000);

  it("shows error state and allows refresh", async () => {
    let shouldFail = true;

    apiFetchMock.mockImplementation(async (path: string) => {
      if (shouldFail) {
        throw new Error("operations down");
      }
      if (path === "/api/v1/admin/sync/health/summary") {
        return {
          max_cursor: 0,
          counts: {
            ok: 0,
            warn: 0,
            danger: 0,
            total: 0,
            dead: 0,
            never_seen: 0,
            danger_pct: 0,
          },
          alerts_sent: 0,
          top_laggers: [],
          top_offline: [],
        };
      }
      if (path === "/api/v1/admin/outbox/summary") {
        return {
          total: 0,
          by_channel: {},
          by_status: {},
          by_delivery_status: {},
          pending_overdue_15m: 0,
          failed_total: 0,
        };
      }
      if (path === "/api/v1/admin/outbox?status=FAILED&limit=8") {
        return { items: [] };
      }
      if (path === "/api/v1/admin/projects/import-runs/failed-queue?limit=8&offset=0") {
        return { items: [], total: 0, limit: 8, offset: 0 };
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    renderSubject();

    expect(
      await screen.findByText(
        "Failed to load operations data. Check API availability and admin permissions."
      )
    ).toBeInTheDocument();

    shouldFail = false;
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));

    await waitFor(() => {
      expect(screen.getByText("No failed import runs.")).toBeInTheDocument();
      expect(screen.getByText("No failed outbox messages.")).toBeInTheDocument();
      expect(screen.getByText("No sync health data.")).toBeInTheDocument();
    });
  });

  it("retries failed import and outbox items from the overview", async () => {
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path === "/api/v1/admin/sync/health/summary") {
        return {
          max_cursor: 18,
          counts: {
            ok: 4,
            warn: 1,
            danger: 2,
            total: 7,
            dead: 1,
            never_seen: 0,
            danger_pct: 28.57,
          },
          alerts_sent: 3,
          top_laggers: [
            {
              installer_id: "installer-2",
              status: "danger",
              lag: 9,
              days_offline: 2,
              last_seen_at: "2026-03-07T08:00:00Z",
            },
          ],
          top_offline: [],
        };
      }
      if (path === "/api/v1/admin/outbox/summary") {
        return {
          total: 12,
          by_channel: { email: 8, whatsapp: 4 },
          by_status: { PENDING: 5, FAILED: 3 },
          by_delivery_status: { failed: 3, pending: 5 },
          pending_overdue_15m: 2,
          failed_total: 3,
        };
      }
      if (path === "/api/v1/admin/outbox?status=FAILED&limit=8") {
        return {
          items: [
            {
              id: "outbox-1",
              channel: "email",
              recipient: "ops@dimax.test",
              subject: "Import failed",
              status: "FAILED",
              delivery_status: "failed",
              attempts: 3,
              max_attempts: 5,
              scheduled_at: "2026-03-07T09:00:00Z",
              created_at: "2026-03-07T08:55:00Z",
              last_error: "SMTP timeout",
            },
          ],
        };
      }
      if (path === "/api/v1/admin/projects/import-runs/failed-queue?limit=8&offset=0") {
        return {
          items: [
            {
              run_id: "run-1",
              project_id: "project-1",
              project_name: "Ashdod Towers",
              created_at: "2026-03-07T08:00:00Z",
              mode: "import",
              status: "FAILED",
              source_filename: "ashdod.csv",
              parsed_rows: 12,
              prepared_rows: 10,
              imported: 0,
              skipped: 0,
              errors_count: 2,
              last_error: "Unknown door type",
              retry_available: true,
            },
          ],
          total: 1,
          limit: 8,
          offset: 0,
        };
      }
      if (path === "/api/v1/admin/projects/project-1/doors/import-runs/run-1/retry") {
        return { ok: true };
      }
      if (path === "/api/v1/admin/outbox/outbox-1/retry") {
        return { item: { id: "outbox-1" } };
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    renderSubject();

    expect(await screen.findByText("Operations Center")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry import" }));

    await waitFor(() => {
      expect(screen.getByText("Import run run-1 moved back to processing.")).toBeInTheDocument();
    });

    const importRetryCall = apiFetchMock.mock.calls.find(
      (call) => call[0] === "/api/v1/admin/projects/project-1/doors/import-runs/run-1/retry"
    );
    expect(importRetryCall?.[1]).toMatchObject({ method: "POST" });

    fireEvent.click(screen.getByRole("button", { name: "Retry delivery" }));

    await waitFor(() => {
      expect(screen.getByText("Outbox item outbox-1 moved back to queue.")).toBeInTheDocument();
    });

    const outboxRetryCall = apiFetchMock.mock.calls.find(
      (call) => call[0] === "/api/v1/admin/outbox/outbox-1/retry"
    );
    expect(outboxRetryCall?.[1]).toMatchObject({
      method: "POST",
      body: JSON.stringify({ reason: "operations_center_manual_retry" }),
    });
  }, 10000);

  it("retries actionable imports in bulk from the summary", async () => {
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path === "/api/v1/admin/sync/health/summary") {
        return {
          max_cursor: 18,
          counts: {
            ok: 4,
            warn: 1,
            danger: 2,
            total: 7,
            dead: 1,
            never_seen: 0,
            danger_pct: 28.57,
          },
          alerts_sent: 3,
          top_laggers: [
            {
              installer_id: "installer-2",
              status: "danger",
              lag: 9,
              days_offline: 2,
              last_seen_at: "2026-03-07T08:00:00Z",
            },
          ],
          top_offline: [],
        };
      }
      if (path === "/api/v1/admin/outbox/summary") {
        return {
          total: 12,
          by_channel: { email: 8, whatsapp: 4 },
          by_status: { PENDING: 5, FAILED: 3 },
          by_delivery_status: { failed: 3, pending: 5 },
          pending_overdue_15m: 2,
          failed_total: 3,
        };
      }
      if (path === "/api/v1/admin/outbox?status=FAILED&limit=8") {
        return { items: [] };
      }
      if (path === "/api/v1/admin/projects/import-runs/failed-queue?limit=8&offset=0") {
        return {
          items: [
            {
              run_id: "run-1",
              project_id: "project-1",
              project_name: "Ashdod Towers",
              created_at: "2026-03-07T08:00:00Z",
              mode: "import",
              status: "FAILED",
              source_filename: "ashdod.csv",
              parsed_rows: 12,
              prepared_rows: 10,
              imported: 0,
              skipped: 0,
              errors_count: 2,
              last_error: "Unknown door type",
              retry_available: true,
            },
            {
              run_id: "run-2",
              project_id: "project-2",
              project_name: "Bat Yam Heights",
              created_at: "2026-03-07T07:40:00Z",
              mode: "import",
              status: "FAILED",
              source_filename: "bat-yam.csv",
              parsed_rows: 9,
              prepared_rows: 9,
              imported: 0,
              skipped: 0,
              errors_count: 1,
              last_error: "Provider timeout",
              retry_available: true,
            },
          ],
          total: 2,
          limit: 8,
          offset: 0,
        };
      }
      if (path === "/api/v1/admin/projects/import-runs/retry-failed") {
        return {
          items: [
            {
              run_id: "run-1",
              project_id: "project-1",
              status: "SUCCESS",
              imported: 10,
              skipped: 0,
              errors_count: 0,
              last_error: null,
            },
          ],
          total_runs: 2,
          successful_runs: 2,
          failed_runs: 0,
          skipped_runs: 0,
        };
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    renderSubject();

    expect(await screen.findByText("Operations Center")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry actionable imports (2)" }));
    expect(screen.getByText("Retry actionable imports")).toBeInTheDocument();
    expect(
      screen.getByText("This will retry 2 actionable import runs across 2 projects.")
    ).toBeInTheDocument();
    expect(
      apiFetchMock.mock.calls.some(
        (call) => call[0] === "/api/v1/admin/projects/import-runs/retry-failed"
      )
    ).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => {
      expect(
        screen.getByText("Bulk import retry finished: success 2 | failed 0 | skipped 0.")
      ).toBeInTheDocument();
    });
    expect(screen.getByText("Last Batch Result")).toBeInTheDocument();
    expect(screen.getByText("Retry actionable imports over 2 runs")).toBeInTheDocument();
    expect(screen.getByText("Run run-1")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review affected imports" })).toHaveAttribute(
      "href",
      "/projects?only_failed_runs=1&failed_project_ids=project-1"
    );
    expect(screen.getByRole("link", { name: "Back to overview" })).toHaveAttribute(
      "href",
      "/operations"
    );

    const bulkRetryCall = apiFetchMock.mock.calls.find(
      (call) => call[0] === "/api/v1/admin/projects/import-runs/retry-failed"
    );
    expect(bulkRetryCall?.[1]).toMatchObject({
      method: "POST",
      body: JSON.stringify({ run_ids: ["run-1", "run-2"] }),
    });
  }, 10000);

  it("reconciles actionable projects in bulk from the summary", async () => {
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path === "/api/v1/admin/sync/health/summary") {
        return {
          max_cursor: 18,
          counts: {
            ok: 4,
            warn: 1,
            danger: 2,
            total: 7,
            dead: 1,
            never_seen: 0,
            danger_pct: 28.57,
          },
          alerts_sent: 3,
          top_laggers: [
            {
              installer_id: "installer-2",
              status: "danger",
              lag: 9,
              days_offline: 2,
              last_seen_at: "2026-03-07T08:00:00Z",
            },
          ],
          top_offline: [],
        };
      }
      if (path === "/api/v1/admin/outbox/summary") {
        return {
          total: 12,
          by_channel: { email: 8, whatsapp: 4 },
          by_status: { PENDING: 5, FAILED: 3 },
          by_delivery_status: { failed: 3, pending: 5 },
          pending_overdue_15m: 2,
          failed_total: 3,
        };
      }
      if (path === "/api/v1/admin/outbox?status=FAILED&limit=8") {
        return { items: [] };
      }
      if (path === "/api/v1/admin/projects/import-runs/failed-queue?limit=8&offset=0") {
        return {
          items: [
            {
              run_id: "run-1",
              project_id: "project-1",
              project_name: "Ashdod Towers",
              created_at: "2026-03-07T08:00:00Z",
              mode: "import",
              status: "FAILED",
              source_filename: "ashdod.csv",
              parsed_rows: 12,
              prepared_rows: 10,
              imported: 0,
              skipped: 0,
              errors_count: 2,
              last_error: "Unknown door type",
              retry_available: true,
            },
            {
              run_id: "run-2",
              project_id: "project-2",
              project_name: "Bat Yam Heights",
              created_at: "2026-03-07T07:40:00Z",
              mode: "import",
              status: "FAILED",
              source_filename: "bat-yam.csv",
              parsed_rows: 9,
              prepared_rows: 9,
              imported: 0,
              skipped: 0,
              errors_count: 1,
              last_error: "Provider timeout",
              retry_available: true,
            },
          ],
          total: 2,
          limit: 8,
          offset: 0,
        };
      }
      if (path === "/api/v1/admin/projects/import-runs/reconcile-latest") {
        return {
          items: [
            {
              project_id: "project-1",
              source_run_id: "run-1",
              status: "SUCCESS",
              imported: 10,
              skipped: 0,
              errors_count: 0,
              last_error: null,
            },
          ],
          total_projects: 2,
          successful_projects: 1,
          failed_projects: 0,
          skipped_projects: 1,
        };
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    renderSubject();

    expect(await screen.findByText("Operations Center")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reconcile actionable projects (2)" }));
    expect(screen.getByText("Reconcile actionable projects")).toBeInTheDocument();
    expect(
      screen.getByText("This will reconcile latest failed import state for 2 actionable projects.")
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => {
      expect(
        screen.getByText("Bulk reconcile finished: success 1 | failed 0 | skipped 1.")
      ).toBeInTheDocument();
    });
    expect(screen.getByText("Last Batch Result")).toBeInTheDocument();
    expect(screen.getByText("Reconcile actionable projects over 2 projects")).toBeInTheDocument();
    expect(screen.getByText("Project project-1")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review affected imports" })).toHaveAttribute(
      "href",
      "/projects?only_failed_runs=1&failed_project_ids=project-1"
    );

    const reconcileCall = apiFetchMock.mock.calls.find(
      (call) => call[0] === "/api/v1/admin/projects/import-runs/reconcile-latest"
    );
    expect(reconcileCall?.[1]).toMatchObject({
      method: "POST",
      body: JSON.stringify({
        project_ids: ["project-1", "project-2"],
        only_failed_runs: true,
      }),
    });
  }, 10000);

  it("cancels batch actions without calling the api", async () => {
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path === "/api/v1/admin/sync/health/summary") {
        return {
          max_cursor: 18,
          counts: {
            ok: 4,
            warn: 1,
            danger: 2,
            total: 7,
            dead: 1,
            never_seen: 0,
            danger_pct: 28.57,
          },
          alerts_sent: 3,
          top_laggers: [
            {
              installer_id: "installer-2",
              status: "danger",
              lag: 9,
              days_offline: 2,
              last_seen_at: "2026-03-07T08:00:00Z",
            },
          ],
          top_offline: [],
        };
      }
      if (path === "/api/v1/admin/outbox/summary") {
        return {
          total: 12,
          by_channel: { email: 8, whatsapp: 4 },
          by_status: { PENDING: 5, FAILED: 3 },
          by_delivery_status: { failed: 3, pending: 5 },
          pending_overdue_15m: 2,
          failed_total: 3,
        };
      }
      if (path === "/api/v1/admin/outbox?status=FAILED&limit=8") {
        return { items: [] };
      }
      if (path === "/api/v1/admin/projects/import-runs/failed-queue?limit=8&offset=0") {
        return {
          items: [
            {
              run_id: "run-1",
              project_id: "project-1",
              project_name: "Ashdod Towers",
              created_at: "2026-03-07T08:00:00Z",
              mode: "import",
              status: "FAILED",
              source_filename: "ashdod.csv",
              parsed_rows: 12,
              prepared_rows: 10,
              imported: 0,
              skipped: 0,
              errors_count: 2,
              last_error: "Unknown door type",
              retry_available: true,
            },
          ],
          total: 1,
          limit: 8,
          offset: 0,
        };
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    renderSubject();

    expect(await screen.findByText("Operations Center")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry actionable imports (1)" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(screen.queryByText("This will retry 1 actionable import runs across 1 projects.")).not.toBeInTheDocument();
    });

    expect(
      apiFetchMock.mock.calls.some(
        (call) => call[0] === "/api/v1/admin/projects/import-runs/retry-failed"
      )
    ).toBe(false);
  }, 10000);

  it("filters overview to only actionable items", async () => {
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path === "/api/v1/admin/sync/health/summary") {
        return {
          max_cursor: 18,
          counts: {
            ok: 4,
            warn: 1,
            danger: 2,
            total: 7,
            dead: 1,
            never_seen: 0,
            danger_pct: 28.57,
          },
          alerts_sent: 3,
          top_laggers: [
            {
              installer_id: "installer-2",
              status: "danger",
              lag: 9,
              days_offline: 2,
              last_seen_at: "2026-03-07T08:00:00Z",
            },
            {
              installer_id: "installer-3",
              status: "warn",
              lag: 0,
              days_offline: 0,
              last_seen_at: "2026-03-07T08:05:00Z",
            },
          ],
          top_offline: [],
        };
      }
      if (path === "/api/v1/admin/outbox/summary") {
        return {
          total: 12,
          by_channel: { email: 8, whatsapp: 4 },
          by_status: { PENDING: 5, FAILED: 3 },
          by_delivery_status: { failed: 3, pending: 5 },
          pending_overdue_15m: 2,
          failed_total: 3,
        };
      }
      if (path === "/api/v1/admin/outbox?status=FAILED&limit=8") {
        return {
          items: [
            {
              id: "outbox-1",
              channel: "email",
              recipient: "ops@dimax.test",
              subject: "Import failed",
              status: "FAILED",
              delivery_status: "failed",
              attempts: 3,
              max_attempts: 5,
              scheduled_at: "2026-03-07T09:00:00Z",
              created_at: "2026-03-07T08:55:00Z",
              last_error: "SMTP timeout",
            },
          ],
        };
      }
      if (path === "/api/v1/admin/projects/import-runs/failed-queue?limit=8&offset=0") {
        return {
          items: [
            {
              run_id: "run-1",
              project_id: "project-1",
              project_name: "Ashdod Towers",
              created_at: "2026-03-07T08:00:00Z",
              mode: "import",
              status: "FAILED",
              source_filename: "ashdod.csv",
              parsed_rows: 12,
              prepared_rows: 10,
              imported: 0,
              skipped: 0,
              errors_count: 2,
              last_error: "Unknown door type",
              retry_available: true,
            },
            {
              run_id: "run-2",
              project_id: "project-2",
              project_name: "Bat Yam Heights",
              created_at: "2026-03-07T07:40:00Z",
              mode: "import",
              status: "FAILED",
              source_filename: "bat-yam.csv",
              parsed_rows: 9,
              prepared_rows: 9,
              imported: 0,
              skipped: 0,
              errors_count: 1,
              last_error: "Provider timeout",
              retry_available: false,
            },
          ],
          total: 2,
          limit: 8,
          offset: 0,
        };
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    renderSubject();

    expect(await screen.findByText("Operations Center")).toBeInTheDocument();
    expect(screen.getByText("Bat Yam Heights")).toBeInTheDocument();
    expect(screen.getByText("installer-3")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Only actionable" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Only actionable" })).toHaveAttribute(
        "aria-pressed",
        "true"
      );
    });

    expect(screen.queryByText("Bat Yam Heights")).not.toBeInTheDocument();
    expect(screen.queryByText("installer-3")).not.toBeInTheDocument();
    expect(screen.getAllByText("Ashdod Towers").length).toBeGreaterThan(0);
    expect(screen.getByText("installer-2")).toBeInTheDocument();
    expect(screen.getByText("actionable mode")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open import workspace" })).toHaveAttribute(
      "href",
      "/projects?only_failed_runs=1&failed_project_ids=project-1"
    );
  }, 10000);

  it("shows calm summary when there are no actionable items", async () => {
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path === "/api/v1/admin/sync/health/summary") {
        return {
          max_cursor: 4,
          counts: {
            ok: 4,
            warn: 0,
            danger: 0,
            total: 4,
            dead: 0,
            never_seen: 0,
            danger_pct: 0,
          },
          alerts_sent: 0,
          top_laggers: [
            {
              installer_id: "installer-1",
              status: "ok",
              lag: 0,
              days_offline: 0,
              last_seen_at: "2026-03-07T08:00:00Z",
            },
          ],
          top_offline: [],
        };
      }
      if (path === "/api/v1/admin/outbox/summary") {
        return {
          total: 0,
          by_channel: {},
          by_status: {},
          by_delivery_status: {},
          pending_overdue_15m: 0,
          failed_total: 0,
        };
      }
      if (path === "/api/v1/admin/outbox?status=FAILED&limit=8") {
        return { items: [] };
      }
      if (path === "/api/v1/admin/projects/import-runs/failed-queue?limit=8&offset=0") {
        return { items: [], total: 0, limit: 8, offset: 0 };
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    renderSubject();

    expect(await screen.findByText("Operations Center")).toBeInTheDocument();
    expect(screen.getByText("No active operational actions right now")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Retry actionable imports (0)" })
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Reconcile actionable projects (0)" })
    ).toBeDisabled();
  });

  it("marks data as stale after the freshness threshold", async () => {
    const nowSpy = vi.spyOn(Date, "now");
    nowSpy.mockReturnValue(new Date("2026-03-07T10:00:00Z").getTime());

    apiFetchMock.mockImplementation(async (path: string) => {
      if (path === "/api/v1/admin/sync/health/summary") {
        return {
          max_cursor: 18,
          counts: {
            ok: 4,
            warn: 1,
            danger: 1,
            total: 6,
            dead: 0,
            never_seen: 0,
            danger_pct: 16.67,
          },
          alerts_sent: 1,
          top_laggers: [
            {
              installer_id: "installer-2",
              status: "danger",
              lag: 9,
              days_offline: 2,
              last_seen_at: "2026-03-07T08:00:00Z",
            },
          ],
          top_offline: [],
        };
      }
      if (path === "/api/v1/admin/outbox/summary") {
        return {
          total: 3,
          by_channel: { email: 3 },
          by_status: { FAILED: 1 },
          by_delivery_status: { failed: 1 },
          pending_overdue_15m: 0,
          failed_total: 1,
        };
      }
      if (path === "/api/v1/admin/outbox?status=FAILED&limit=8") {
        return {
          items: [],
        };
      }
      if (path === "/api/v1/admin/projects/import-runs/failed-queue?limit=8&offset=0") {
        return {
          items: [],
          total: 0,
          limit: 8,
          offset: 0,
        };
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    renderSubject();

    expect(await screen.findByText("Operations Center")).toBeInTheDocument();
    expect(screen.getByText("fresh")).toBeInTheDocument();

    nowSpy.mockReturnValue(new Date("2026-03-07T10:03:30Z").getTime());
    fireEvent.click(screen.getByRole("button", { name: "Only actionable" }));

    await waitFor(() => {
      expect(screen.getByText("stale")).toBeInTheDocument();
      expect(screen.getByText("Updated 3 minutes ago")).toBeInTheDocument();
    });
  }, 10000);
});
