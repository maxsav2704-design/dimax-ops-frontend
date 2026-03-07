import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import OperationsPage from "@/views/OperationsPage";

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  apiFetch: apiFetchMock,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/operations",
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

    expect(screen.getAllByText("Ashdod Towers")).toHaveLength(2);
    expect(screen.getByText("Unknown door type")).toBeInTheDocument();
    expect(screen.getByText("ops@dimax.test")).toBeInTheDocument();
    expect(screen.getByText("SMTP timeout")).toBeInTheDocument();
    expect(screen.getByText("installer-2")).toBeInTheDocument();
    expect(screen.getByText(/lag 9/)).toBeInTheDocument();
  });

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
});
