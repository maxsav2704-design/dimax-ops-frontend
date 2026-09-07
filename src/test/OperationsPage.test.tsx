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
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-auth-session", () => ({
  useAuthSession: () => ({
    role: "ADMIN",
    admin_scope: "OWNER",
    can_view_rates: true,
  }),
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

function mockWebhookSignals(path: string) {
  if (path === "/api/v1/admin/outbox/webhook-signals/summary") {
    return {
      window_hours: 24,
      total_received: 6,
      updated_total: 3,
      duplicate_total: 2,
      unmatched_total: 1,
      provider_failed_total: 2,
    };
  }
  if (path === "/api/v1/admin/outbox/webhook-signals?limit=6") {
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
          created_at: "2026-03-07T09:05:00Z",
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
          created_at: "2026-03-07T09:00:00Z",
        },
      ],
    };
  }
  if (path === "/api/v1/admin/outbox/retry-audits?limit=6") {
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
          created_at: "2026-03-07T09:10:00Z",
        },
      ],
    };
  }
  if (
    path ===
    "/api/v1/admin/reports/audit-catalogs?entity_type=sync_state&action=SYNC_STATE_RESET&limit=6"
  ) {
    return {
      items: [
        {
          id: "sync-audit-1",
          created_at: "2026-03-07T09:12:00Z",
          actor_user_id: "admin-1",
          entity_type: "sync_state",
          entity_id: "installer-2",
          action: "SYNC_STATE_RESET",
          reason: "admin_cold_resync",
          before: {
            installer_id: "installer-2",
            installer_name: "Avi Cohen",
            user_id: "user-2",
            last_cursor_ack: 18,
            device_id: "device-1",
            app_version: "1.2.0",
          },
          after: {
            installer_id: "installer-2",
            installer_name: "Avi Cohen",
            user_id: "user-2",
            last_cursor_ack: 0,
          },
        },
      ],
      summary: {
        total: 1,
        by_entity: { sync_state: 1 },
        by_action: { SYNC_STATE_RESET: 1 },
      },
    };
  }
  return null;
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
      const webhookMock = mockWebhookSignals(path);
      if (webhookMock) {
        return webhookMock;
      }
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
            failed_events: 1,
            queue_pending: 0,
            queue_conflicts: 1,
            queue_blocked: 0,
            queue_auth_required: 1,
            problem_total: 3,
          },
          alerts_sent: 3,
          top_laggers: [
            {
              installer_id: "installer-2",
              installer_name: "Avi Cohen",
              installer_phone: "+972501112233",
              status: "danger",
              lag: 9,
              days_offline: 2,
              last_seen_at: "2026-03-07T08:00:00Z",
              failed_events: 1,
              queue_pending: 0,
              queue_conflicts: 1,
              queue_blocked: 0,
              queue_auth_required: 1,
              problem_count: 3,
            },
          ],
          top_offline: [],
        };
      }
      if (path.startsWith("/api/v1/admin/sync/problems?")) {
        const url = new URL(path, "https://dimax.test");
        const statusFilter = url.searchParams.get("status");
        const installerFilter = url.searchParams.get("installer_id");
        const items = [
          {
            id: "sync-event-1",
            source: "sync_event",
            installer_id: "installer-2",
            installer_name: "Avi Cohen",
            installer_phone: "+972501112233",
            user_id: "user-2",
            project_id: "project-1",
            client_event_id: "event-1",
            event_type: "DOOR_SET_STATUS",
            entity_type: null,
            entity_id: null,
            operation_type: null,
            status: "FAILED",
            conflict_code: null,
            error: "Door is not assigned to this installer",
            problem_code: "CONFLICT_ASSIGNMENT_CHANGED",
            problem_title: "Assignment changed",
            operator_action:
              "Verify the current installer assignment, then request cold resync if the work still belongs to this installer. Do not retry the stale event blindly.",
            retry_allowed: false,
            manual_review_required: true,
            device_id: null,
            base_version: null,
            payload: { door_id: "door-1" },
            created_at: "2026-03-07T08:30:00Z",
            client_happened_at: "2026-03-07T08:29:00Z",
            applied_at: "2026-03-07T08:31:00Z",
            synced_at: null,
          },
          {
            id: "queue-1",
            source: "sync_queue",
            installer_id: "installer-2",
            installer_name: "Avi Cohen",
            installer_phone: "+972501112233",
            user_id: "user-2",
            project_id: null,
            client_event_id: null,
            event_type: null,
            entity_type: "door",
            entity_id: "door-2",
            operation_type: "DOOR_SET_STATUS",
            status: "CONFLICT",
            conflict_code: "CONFLICT_ASSIGNMENT_CHANGED",
            error: "CONFLICT_ASSIGNMENT_CHANGED",
            problem_code: "CONFLICT_ASSIGNMENT_CHANGED",
            problem_title: "Assignment changed",
            operator_action:
              "Verify the current installer assignment, then request cold resync if the work still belongs to this installer. Do not retry the stale event blindly.",
            retry_allowed: false,
            manual_review_required: true,
            device_id: "device-1",
            base_version: 2,
            payload: { status: "INSTALLED" },
            created_at: "2026-03-07T08:32:00Z",
            client_happened_at: null,
            applied_at: null,
            synced_at: null,
          },
        ].filter((item) => {
          if (installerFilter && item.installer_id !== installerFilter) {
            return false;
          }
          if (statusFilter === "failed") {
            return item.source === "sync_event";
          }
          if (statusFilter === "conflict") {
            return item.status === "CONFLICT";
          }
          if (statusFilter === "pending") {
            return item.status === "PENDING" || item.status === "BLOCKED";
          }
          if (statusFilter === "auth_required") {
            return item.status === "AUTH_REQUIRED";
          }
          return true;
        });
        return {
          items,
          total: items.length,
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
      if (path === "/api/v1/admin/sync/states/user-2/reset") {
        return {
          installer_id: "installer-2",
          installer_name: "Avi Cohen",
          installer_phone: "+972501112233",
          installer_active: true,
          last_cursor_ack: 0,
          last_seen_at: "2026-03-07T08:00:00Z",
          lag: 18,
          health_status: "WARN",
          health_days_offline: 0,
          last_alert_at: null,
        };
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    renderSubject();

    expect(await screen.findByText("Operations Center")).toBeInTheDocument();
    expect(screen.getByTestId("operations-recovery-center")).toBeInTheDocument();
    expect(screen.getByText("Operations recovery")).toBeInTheDocument();
    expect(screen.getByText("Selected actionable recovery")).toBeInTheDocument();
    expect(screen.getByText("2 selected")).toBeInTheDocument();
    expect(screen.getByText("1 sync watchlist")).toBeInTheDocument();
    expect(screen.getByText("Active incidents")).toBeInTheDocument();
    expect(screen.getByText("Integrations")).toBeInTheDocument();
    expect(screen.getByText("Import runs")).toBeInTheDocument();
    expect(screen.getByText("Sync queue by installer")).toBeInTheDocument();
    expect(screen.getByText("Sync danger")).toBeInTheDocument();
    expect(screen.getByText("Failed imports")).toBeInTheDocument();
    expect(screen.getByText("Failed outbox")).toBeInTheDocument();
    expect(screen.getByText("Pending > 15m")).toBeInTheDocument();
    expect(screen.getByText("Action Summary")).toBeInTheDocument();
    expect(screen.getByText("Delivery Drilldown")).toBeInTheDocument();
    expect(screen.getByText("Webhook Signals")).toBeInTheDocument();
    expect(screen.getByText("Delivery Recovery Audit")).toBeInTheDocument();
    expect(screen.getByText("Sync Recovery Audit")).toBeInTheDocument();
    expect(screen.getByText("Data Freshness")).toBeInTheDocument();
    expect(await screen.findByText("fresh")).toBeInTheDocument();
    expect(screen.getByText(/Fresh as of/)).toBeInTheDocument();
    expect(screen.queryByText("Last Batch Result")).not.toBeInTheDocument();
    expect(screen.getByText("Retry failed import for Ashdod Towers")).toBeInTheDocument();
    expect(screen.getByText("Recover delivery for ops@dimax.test")).toBeInTheDocument();
    expect(screen.getByText("Investigate installer Avi Cohen")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Retry actionable imports (1)" })
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Retry actionable deliveries (1)" })
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Reconcile actionable projects (1)" })
    ).toBeEnabled();

    expect(screen.getAllByText("Ashdod Towers")).toHaveLength(2);
    expect(screen.getByText("Unknown door type")).toBeInTheDocument();
    expect(screen.getByText("ops@dimax.test")).toBeInTheDocument();
    expect(screen.getByText("SMTP timeout")).toBeInTheDocument();
    expect(screen.getByText("Duplicates")).toBeInTheDocument();
    expect(screen.getByText("Unmatched")).toBeInTheDocument();
    expect(screen.getByText("Provider failed")).toBeInTheDocument();
    expect(screen.getByText("sendgrid | duplicate")).toBeInTheDocument();
    expect(screen.getByText("twilio | channel_mismatch")).toBeInTheDocument();
    expect(screen.getByText("wrong channel")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Only EMAIL" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Only sendgrid" })).toBeInTheDocument();
    expect(screen.getByText("operations_center_bulk_retry | actor admin-1")).toBeInTheDocument();
    expect(screen.getByText("Cold resync | cursor 18 -> 0")).toBeInTheDocument();
    expect(screen.getByText(/actor admin-1.*device device-1.*app 1.2.0/)).toBeInTheDocument();
    expect(screen.getAllByText("Avi Cohen").length).toBeGreaterThan(0);
    expect(screen.getByText("installer-2")).toBeInTheDocument();
    expect(screen.getByText(/972501112233/)).toBeInTheDocument();
    expect(screen.getByText(/lag 9/)).toBeInTheDocument();
    expect(screen.getAllByText(/failed events 1/).length).toBeGreaterThan(0);
    expect(screen.getByText(/sync errors 3/)).toBeInTheDocument();
    expect(await screen.findByText("Recent sync problems")).toBeInTheDocument();
    expect(screen.getByText("Door is not assigned to this installer")).toBeInTheDocument();
    expect(screen.getAllByText(/CONFLICT_ASSIGNMENT_CHANGED/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Assignment changed").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Verify the current installer assignment/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Manual review required/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/no blind retry/).length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText("Sync problem status"), {
      target: { value: "conflict" },
    });
    await waitFor(() => {
      expect(
        apiFetchMock.mock.calls.some(
          (call) => call[0] === "/api/v1/admin/sync/problems?limit=25&status=conflict"
        )
      ).toBe(true);
    });
    expect(await screen.findByText("Showing 1 of 1")).toBeInTheDocument();
    expect(screen.queryByText("Door is not assigned to this installer")).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Cold resync" })[0]);
    expect(screen.getByText("Request cold resync")).toBeInTheDocument();
    expect(screen.getByText(/does not change door statuses/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => {
      expect(screen.getByText("Cold resync requested for Avi Cohen.")).toBeInTheDocument();
    });

    const syncResetCall = apiFetchMock.mock.calls.find(
      (call) => call[0] === "/api/v1/admin/sync/states/user-2/reset"
    );
    expect(syncResetCall?.[1]).toMatchObject({ method: "POST" });

    expect(screen.getByRole("link", { name: "Open import workspace" })).toHaveAttribute(
      "href",
      "/projects?only_failed_runs=1&failed_project_ids=project-1"
    );
    expect(screen.getByRole("link", { name: "Open operations reports" })).toHaveAttribute(
      "href",
      "/reports?focus=operations&ops_preset=failed-imports"
    );
    expect(screen.getByRole("link", { name: "Review delivery recovery" })).toHaveAttribute(
      "href",
      "/reports?focus=delivery&ops_preset=delivery-risk&outbox_id=outbox-1"
    );
    expect(screen.getAllByRole("link", { name: "Open delivery reports" })[0]).toHaveAttribute(
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
    expect(
      screen
        .getAllByRole("link", { name: "Exact outbox" })
        .some(
          (link) =>
            link.getAttribute("href")
            === "/reports?focus=delivery&ops_preset=delivery-risk&outbox_id=outbox-1&webhook_provider=sendgrid"
        )
    ).toBe(true);
    expect(screen.getByRole("link", { name: "Exact failure" })).toHaveAttribute(
      "href",
      "/reports?focus=delivery&ops_preset=delivery-risk&outbox_id=outbox-1&delivery_channel=EMAIL"
    );
    expect(
      screen
        .getAllByRole("link", { name: "Provider lane" })
        .some((link) => link.getAttribute("href") === "/operations?webhook_provider=sendgrid")
    ).toBe(true);
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
  }, 45000);

  it("allows cold resync from sync health when there is no detailed problem row", async () => {
    apiFetchMock.mockImplementation(async (path: string) => {
      const webhookMock = mockWebhookSignals(path);
      if (webhookMock) {
        return webhookMock;
      }
      if (path === "/api/v1/admin/sync/health/summary") {
        return {
          max_cursor: 24,
          counts: {
            ok: 3,
            warn: 0,
            danger: 1,
            total: 4,
            dead: 0,
            never_seen: 0,
            danger_pct: 25,
            problem_total: 0,
          },
          alerts_sent: 0,
          top_laggers: [
            {
              installer_id: "installer-9",
              installer_name: "Offline Installer",
              installer_phone: "+972501119999",
              status: "danger",
              lag: 24,
              days_offline: 3,
              last_seen_at: "2026-03-07T07:00:00Z",
              problem_count: 0,
            },
          ],
          top_offline: [],
        };
      }
      if (path === "/api/v1/admin/sync/reset/installer-9") {
        return { status: "reset_ok" };
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

    expect(await screen.findByText("Offline Installer")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cold resync" }));
    expect(screen.getByText("Request cold resync")).toBeInTheDocument();
    expect(screen.getByText(/Current lag is 24/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => {
      expect(
        screen.getByText("Cold resync requested for Offline Installer.")
      ).toBeInTheDocument();
    });

    const syncResetCall = apiFetchMock.mock.calls.find(
      (call) => call[0] === "/api/v1/admin/sync/reset/installer-9"
    );
    expect(syncResetCall?.[1]).toMatchObject({ method: "POST" });
  }, 30000);

  it("reads and syncs actionable filter with url state", async () => {
    window.history.replaceState({}, "", "/operations?actionable=1");

    apiFetchMock.mockImplementation(async (path: string) => {
      const webhookMock = mockWebhookSignals(path);
      if (webhookMock) {
        return webhookMock;
      }
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

  it("reads and syncs delivery drilldown filters with url state", async () => {
    window.history.replaceState(
      {},
      "",
      "/operations?delivery_channel=EMAIL&webhook_provider=sendgrid"
    );

    apiFetchMock.mockImplementation(async (path: string) => {
      const webhookMock = mockWebhookSignals(path);
      if (webhookMock) {
        return webhookMock;
      }
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
          top_laggers: [],
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
            {
              id: "outbox-2",
              channel: "whatsapp",
              recipient: "+15550000000",
              subject: null,
              status: "FAILED",
              delivery_status: "failed",
              attempts: 2,
              max_attempts: 4,
              scheduled_at: "2026-03-07T09:10:00Z",
              created_at: "2026-03-07T08:50:00Z",
              last_error: "Twilio rejected",
            },
          ],
        };
      }
      if (path === "/api/v1/admin/projects/import-runs/failed-queue?limit=8&offset=0") {
        return { items: [], total: 0, limit: 8, offset: 0 };
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    renderSubject();

    expect(await screen.findByText("Operations Center")).toBeInTheDocument();
    expect(screen.getByText("scoped to EMAIL")).toBeInTheDocument();
    expect(screen.getByText("scoped to sendgrid")).toBeInTheDocument();
    expect(screen.queryByText("WHATSAPP")).not.toBeInTheDocument();
    expect(screen.queryByText("twilio")).not.toBeInTheDocument();
    expect(screen.queryByText("+15550000000")).not.toBeInTheDocument();
    expect(screen.queryByText("twilio | channel_mismatch")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear drilldown" }));

    await waitFor(() => {
      expect(window.location.search).toBe("");
    });
    expect(screen.getByText("+15550000000")).toBeInTheDocument();
    expect(screen.getByText("WHATSAPP")).toBeInTheDocument();
    expect(screen.getByText("twilio")).toBeInTheDocument();
    expect(screen.getByText("twilio | channel_mismatch")).toBeInTheDocument();
  }, 12000);

  it("shows error state and allows refresh", async () => {
    let shouldFail = true;

    apiFetchMock.mockImplementation(async (path: string) => {
      const webhookMock = mockWebhookSignals(path);
      if (webhookMock) {
        return webhookMock;
      }
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
      await screen.findByText("operations down")
    ).toBeInTheDocument();

    shouldFail = false;
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));

    await waitFor(() => {
      expect(screen.getByText("No failed import runs.")).toBeInTheDocument();
      expect(screen.getByText("No failed outbox messages.")).toBeInTheDocument();
      expect(screen.getByText("No sync health data.")).toBeInTheDocument();
    });
  }, 25000);

  it("retries failed import and outbox items from the overview", async () => {
    apiFetchMock.mockImplementation(async (path: string) => {
      const webhookMock = mockWebhookSignals(path);
      if (webhookMock) {
        return webhookMock;
      }
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
      expect(screen.getByText("Import run run-1 is back in processing.")).toBeInTheDocument();
    });

    const importRetryCall = apiFetchMock.mock.calls.find(
      (call) => call[0] === "/api/v1/admin/projects/project-1/doors/import-runs/run-1/retry"
    );
    expect(importRetryCall?.[1]).toMatchObject({ method: "POST" });

    fireEvent.click(screen.getByRole("button", { name: "Retry delivery" }));

    await waitFor(() => {
      expect(screen.getByText("Delivery item outbox-1 is back in queue.")).toBeInTheDocument();
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
      const webhookMock = mockWebhookSignals(path);
      if (webhookMock) {
        return webhookMock;
      }
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
        screen.getByText("Import retry finished: 2 succeeded, 0 failed, 0 skipped.")
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
      const webhookMock = mockWebhookSignals(path);
      if (webhookMock) {
        return webhookMock;
      }
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
        screen.getByText("Project reconcile finished: 1 updated, 0 failed, 1 skipped.")
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

  it("retries actionable deliveries in bulk from the summary", async () => {
    apiFetchMock.mockImplementation(async (path: string) => {
      const webhookMock = mockWebhookSignals(path);
      if (webhookMock) {
        return webhookMock;
      }
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
          top_laggers: [],
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
            {
              id: "outbox-2",
              channel: "whatsapp",
              recipient: "+15550000000",
              subject: null,
              status: "FAILED",
              delivery_status: "failed",
              attempts: 2,
              max_attempts: 4,
              scheduled_at: "2026-03-07T09:10:00Z",
              created_at: "2026-03-07T08:50:00Z",
              last_error: "Twilio rejected",
            },
          ],
        };
      }
      if (path === "/api/v1/admin/projects/import-runs/failed-queue?limit=8&offset=0") {
        return { items: [], total: 0, limit: 8, offset: 0 };
      }
      if (path === "/api/v1/admin/outbox/retry-failed") {
        return {
          items: [
            {
              outbox_id: "outbox-1",
              status: "retried",
              item: {
                id: "outbox-1",
                recipient: "ops@dimax.test",
                subject: "Import failed",
                channel: "email",
                status: "PENDING",
                delivery_status: "PENDING",
              },
            },
            {
              outbox_id: "outbox-2",
              status: "skipped",
              error: "Cannot retry already sent outbox message",
              item: null,
            },
          ],
          total_messages: 2,
          successful_messages: 1,
          failed_messages: 0,
          skipped_messages: 1,
        };
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    renderSubject();

    expect(await screen.findByText("Operations Center")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry actionable deliveries (2)" }));
    expect(screen.getByText("Retry actionable delivery failures")).toBeInTheDocument();
    expect(
      screen.getByText("This will retry 2 failed outbox messages and write recovery audit entries.")
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => {
      expect(
        screen.getByText("Delivery retry finished: 1 succeeded, 0 failed, 1 skipped.")
      ).toBeInTheDocument();
    });
    expect(screen.getByText("Last Batch Result")).toBeInTheDocument();
    expect(screen.getByText("Retry actionable deliveries over 2 messages")).toBeInTheDocument();
    expect(screen.getAllByText("Outbox outbox-1").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("link", { name: "Review affected deliveries" })).toHaveAttribute(
      "href",
      "/reports?focus=delivery&ops_preset=delivery-risk&outbox_id=outbox-1"
    );

    const bulkRetryCall = apiFetchMock.mock.calls.find(
      (call) => call[0] === "/api/v1/admin/outbox/retry-failed"
    );
    expect(bulkRetryCall?.[1]).toMatchObject({
      method: "POST",
      body: JSON.stringify({
        outbox_ids: ["outbox-1", "outbox-2"],
        reason: "operations_center_bulk_retry",
      }),
    });
  }, 10000);

  it("retries channel-scoped deliveries from the drilldown lane", async () => {
    apiFetchMock.mockImplementation(async (path: string) => {
      const webhookMock = mockWebhookSignals(path);
      if (webhookMock) {
        return webhookMock;
      }
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
          top_laggers: [],
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
            {
              id: "outbox-2",
              channel: "whatsapp",
              recipient: "+15550000000",
              subject: null,
              status: "FAILED",
              delivery_status: "failed",
              attempts: 2,
              max_attempts: 4,
              scheduled_at: "2026-03-07T09:10:00Z",
              created_at: "2026-03-07T08:50:00Z",
              last_error: "Twilio rejected",
            },
          ],
        };
      }
      if (path === "/api/v1/admin/projects/import-runs/failed-queue?limit=8&offset=0") {
        return { items: [], total: 0, limit: 8, offset: 0 };
      }
      if (path === "/api/v1/admin/outbox/retry-failed") {
        return {
          items: [
            {
              outbox_id: "outbox-1",
              status: "retried",
              item: {
                id: "outbox-1",
                recipient: "ops@dimax.test",
                subject: "Import failed",
                channel: "email",
                status: "PENDING",
                delivery_status: "PENDING",
              },
            },
          ],
          total_messages: 1,
          successful_messages: 1,
          failed_messages: 0,
          skipped_messages: 0,
        };
      }
      throw new Error(`Unexpected path: ${path}`);
    });

    renderSubject();

    expect(await screen.findByText("Operations Center")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry EMAIL" }));
    expect(screen.getByText("Retry actionable EMAIL delivery failures")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => {
      expect(
        screen.getByText("Delivery retry finished: 1 succeeded, 0 failed, 0 skipped.")
      ).toBeInTheDocument();
    });

    const bulkRetryCall = apiFetchMock.mock.calls.find(
      (call) => call[0] === "/api/v1/admin/outbox/retry-failed"
    );
    expect(bulkRetryCall?.[1]).toMatchObject({
      method: "POST",
      body: JSON.stringify({
        outbox_ids: ["outbox-1"],
        reason: "operations_center_bulk_retry",
      }),
    });
  }, 10000);

  it("cancels batch actions without calling the api", async () => {
    apiFetchMock.mockImplementation(async (path: string) => {
      const webhookMock = mockWebhookSignals(path);
      if (webhookMock) {
        return webhookMock;
      }
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
      const webhookMock = mockWebhookSignals(path);
      if (webhookMock) {
        return webhookMock;
      }
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
      const webhookMock = mockWebhookSignals(path);
      if (webhookMock) {
        return webhookMock;
      }
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
  }, 30000);

  it("marks data as stale after the freshness threshold", async () => {
    const nowSpy = vi.spyOn(Date, "now");
    nowSpy.mockReturnValue(new Date("2026-03-07T10:00:00Z").getTime());

    apiFetchMock.mockImplementation(async (path: string) => {
      const webhookMock = mockWebhookSignals(path);
      if (webhookMock) {
        return webhookMock;
      }
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
