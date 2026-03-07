import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import JournalPage from "@/views/JournalPage";

const { apiFetchMock, pushMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
  pushMock: vi.fn(),
}));

vi.mock("@/components/DashboardLayout", () => ({
  DashboardLayout: ({ children }: { children: ReactNode }) => (
    <div data-testid="dashboard-layout">{children}</div>
  ),
}));

vi.mock("@/lib/api", () => ({
  apiFetch: apiFetchMock,
}));

vi.mock("@/hooks/use-user-role", () => ({
  useUserRole: () => "ADMIN",
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

function buildApiMock() {
  return async (path: string, init?: RequestInit) => {
    const url = String(path);

    if (url === "/api/v1/admin/projects?limit=200") {
      return {
        items: [
          {
            id: "project-1",
            name: "Ashdod Towers",
            address: "Ashdod, Tower A",
            status: "ACTIVE",
          },
        ],
      };
    }

    if (url.startsWith("/api/v1/admin/journals?limit=100")) {
      return {
        items: [
          {
            id: "journal-1",
            project_id: "project-1",
            status: "READY",
            title: "Final Handover Pack",
            signed_at: "2026-03-02T09:30:00Z",
          },
        ],
      };
    }

    if (url === "/api/v1/admin/settings/integrations") {
      return {
        public_base_url: "https://dimax.example.com",
        smtp_configured: true,
        email_enabled: true,
        twilio_configured: true,
        whatsapp_enabled: true,
        whatsapp_fallback_to_email: true,
        storage_configured: true,
        waze_base_url: "https://waze.com/ul",
        waze_navigation_enabled: true,
        file_token_ttl_sec: 3600,
        file_token_uses: 1,
        journal_public_token_ttl_sec: 86400,
        sync_warn_lag: 60,
        sync_danger_lag: 180,
        sync_warn_days_offline: 1,
        sync_danger_days_offline: 3,
        sync_project_auto_problem_enabled: true,
        sync_project_auto_problem_days: 2,
        auth_login_rl_window_sec: 60,
        auth_login_rl_max_req: 10,
        auth_refresh_rl_window_sec: 60,
        auth_refresh_rl_max_req: 15,
      };
    }

    if (url === "/api/v1/admin/settings/communication-templates") {
      if (init?.method === "POST") {
        const body = JSON.parse(String(init.body));
        return {
          id: "template-new",
          code: "delivery-pack-template",
          name: body.name,
          subject: body.subject,
          message: body.message,
          send_email: body.send_email,
          send_whatsapp: body.send_whatsapp,
          is_active: true,
        };
      }
      return {
        items: [
          {
            id: "template-1",
            code: "client-final-delivery",
            name: "Client Final Delivery",
            subject: "Final delivery confirmation for {{project_name}}",
            message: "The project delivery package is ready. Review {{journal_title}}.",
            send_email: true,
            send_whatsapp: false,
            is_active: true,
          },
        ],
      };
    }

    if (url === "/api/v1/admin/settings/communication-templates/render-preview") {
      return {
        subject: "Final delivery confirmation for Ashdod Towers",
        message: "The project delivery package is ready. Review Final Handover Pack.",
        variables: {
          project_name: "Ashdod Towers",
          journal_title: "Final Handover Pack",
        },
      };
    }

    if (url === "/api/v1/admin/settings/communication-templates/template-1") {
      const body = JSON.parse(String(init?.body));
      return {
        id: "template-1",
        code: "client-final-delivery",
        name: body.name ?? "Client Final Delivery",
        subject: body.subject ?? "Final delivery confirmation for {{project_name}}",
        message: body.message ?? "The project delivery package is ready. Review {{journal_title}}.",
        send_email: body.send_email ?? true,
        send_whatsapp: body.send_whatsapp ?? false,
        is_active: body.is_active ?? true,
      };
    }

    if (url === "/api/v1/admin/settings/communication-templates/template-new") {
      return {};
    }

    if (url === "/api/v1/admin/journals/journal-1") {
      return {
        id: "journal-1",
        project_id: "project-1",
        status: "READY",
        title: "Final Handover Pack",
        notes: "Customer package",
        public_token: "token-123",
        public_token_expires_at: "2026-03-03T09:30:00Z",
        lock_header: true,
        lock_table: true,
        lock_footer: false,
        signed_at: "2026-03-02T09:30:00Z",
        signer_name: "Eyal Cohen",
        snapshot_version: 4,
        email_delivery_status: "PENDING",
        whatsapp_delivery_status: "FAILED",
        email_last_sent_at: "2026-03-02T09:20:00Z",
        whatsapp_last_sent_at: "2026-03-02T09:22:00Z",
        whatsapp_delivered_at: null,
        email_last_error: null,
        whatsapp_last_error: "Provider timeout",
      };
    }

    if (url === "/api/v1/admin/outbox/summary?journal_id=journal-1") {
      return {
        total: 2,
        by_channel: { EMAIL: 1, WHATSAPP: 1 },
        by_status: { PENDING: 1, FAILED: 1 },
        by_delivery_status: { PENDING: 1, FAILED: 1 },
        pending_overdue_15m: 0,
        failed_total: 1,
      };
    }

    if (url === "/api/v1/admin/outbox/summary") {
      return {
        total: 2,
        by_channel: { EMAIL: 1, WHATSAPP: 1 },
        by_status: { PENDING: 1, FAILED: 1 },
        by_delivery_status: { PENDING: 1, FAILED: 1 },
        pending_overdue_15m: 0,
        failed_total: 1,
      };
    }

    if (url === "/api/v1/admin/outbox?journal_id=journal-1&limit=12") {
      return {
        items: [
          {
            id: "outbox-1",
            correlation_id: "journal-1",
            channel: "WHATSAPP",
            recipient: "+972500000000",
            subject: "Final Handover Pack",
            message_preview: "Please review the delivery package.",
            attachment_name: "journal.pdf",
            status: "FAILED",
            scheduled_at: "2026-03-02T09:25:00Z",
            max_attempts: 3,
            last_error: "Provider timeout",
            provider_message_id: null,
            provider_status: null,
            provider_error: "Provider timeout",
            attempts: 2,
            created_at: "2026-03-02T09:23:00Z",
            sent_at: null,
            delivery_status: "FAILED",
            delivered_at: null,
          },
        ],
      };
    }

    if (url === "/api/v1/admin/outbox?limit=12") {
      return {
        items: [],
      };
    }

    if (url === "/api/v1/admin/journals/journal-1/send") {
      return {
        ok: true,
        enqueued: { email: true, whatsapp: true },
        outbox_ids: { email: "outbox-email-1", whatsapp: "outbox-wa-1" },
        public_url: "https://dimax.example.com/public/journal/token-123",
        object_key: "journals/journal-1.pdf",
      };
    }

    if (url === "/api/v1/admin/outbox/outbox-1/retry") {
      return {
        item: {
          id: "outbox-1",
        },
      };
    }

    throw new Error(`Unhandled path: ${url}`);
  };
}

describe("JournalPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    apiFetchMock.mockReset();
    pushMock.mockReset();
    apiFetchMock.mockImplementation(buildApiMock());
    const storage = new Map<string, string>();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: vi.fn((key: string) => storage.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => {
          storage.set(key, value);
        }),
        removeItem: vi.fn((key: string) => {
          storage.delete(key);
        }),
        clear: vi.fn(() => {
          storage.clear();
        }),
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads communication center data and opens journal form route", async () => {
    render(<JournalPage />);

    expect(await screen.findByText("Communications Center")).toBeInTheDocument();
    expect(await screen.findByText("Final Handover Pack")).toBeInTheDocument();
    expect(screen.getAllByText("Ashdod Towers").length).toBeGreaterThan(0);
    expect(await screen.findByText("Please review the delivery package.")).toBeInTheDocument();
    expect(screen.getByText("Integration snapshot")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open journal form" }));
    expect(pushMock).toHaveBeenCalledWith("/journal/journal-1");
  });

  it("queues journal send with email and WhatsApp payload", async () => {
    render(<JournalPage />);

    await screen.findByLabelText("Email recipient");

    fireEvent.change(screen.getByLabelText("Email recipient"), {
      target: { value: "client@example.com" },
    });
    fireEvent.change(screen.getByLabelText("WhatsApp recipient"), {
      target: { value: "+972500000000" },
    });
    fireEvent.change(screen.getByLabelText("Journal subject"), {
      target: { value: "Delivery pack" },
    });
    fireEvent.change(screen.getByLabelText("Journal message"), {
      target: { value: "Please review the final handover package." },
    });

    fireEvent.click(screen.getByRole("button", { name: "Queue Send" }));

    await waitFor(() => {
      const sendCall = apiFetchMock.mock.calls.find(
        (call) => call[0] === "/api/v1/admin/journals/journal-1/send"
      );
      expect(sendCall).toBeTruthy();
      const body = JSON.parse(String((sendCall?.[1] as RequestInit)?.body));
      expect(body).toMatchObject({
        template_id: "template-1",
        email_to: "client@example.com",
        whatsapp_to: "+972500000000",
        subject: "Delivery pack",
        message: "Please review the final handover package.",
        send_email: true,
        send_whatsapp: true,
      });
    });
  }, 15000);

  it("applies preview and saves shared template via backend", async () => {
    render(<JournalPage />);

    await screen.findByLabelText("Communication template");

    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    await waitFor(() => {
      const previewCall = apiFetchMock.mock.calls.find(
        (call) => call[0] === "/api/v1/admin/settings/communication-templates/render-preview"
      );
      expect(previewCall).toBeTruthy();
    });

    expect(screen.getByLabelText("Journal subject")).toHaveValue(
      "Final delivery confirmation for Ashdod Towers"
    );

    fireEvent.change(screen.getByLabelText("Template name"), {
      target: { value: "Delivery Pack Template" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      const createCall = apiFetchMock.mock.calls.find(
        (call) => call[0] === "/api/v1/admin/settings/communication-templates"
          && (call[1] as RequestInit | undefined)?.method === "POST"
      );
      expect(createCall).toBeTruthy();
      const body = JSON.parse(String((createCall?.[1] as RequestInit)?.body));
      expect(body).toMatchObject({
        name: "Delivery Pack Template",
        subject: "Final delivery confirmation for Ashdod Towers",
      });
    });
  });

  it("retries failed outbox delivery from the log", async () => {
    render(<JournalPage />);

    await screen.findByText("Please review the delivery package.");
    await screen.findByRole("button", { name: "Retry" });

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => {
      const retryCall = apiFetchMock.mock.calls.find(
        (call) => call[0] === "/api/v1/admin/outbox/outbox-1/retry"
      );
      expect(retryCall).toBeTruthy();
      const body = JSON.parse(String((retryCall?.[1] as RequestInit)?.body));
      expect(body).toMatchObject({
        reason: "communications_center_manual_retry",
      });
    });
  });
});
