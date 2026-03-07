import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import SettingsPage from "@/views/SettingsPage";

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
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

vi.mock("@/hooks/use-user-role", () => ({
  useUserRole: userRoleMock,
}));

function buildBaseSettingsApi() {
  return async (path: string) => {
    if (path === "/api/v1/admin/settings/company") {
      return {
        id: "company-1",
        name: "DIMAX",
        is_active: true,
        created_at: "2026-02-20T10:00:00Z",
        updated_at: "2026-02-22T10:00:00Z",
      };
    }
    if (path === "/api/v1/admin/settings/integrations") {
      return {
        public_base_url: "https://example.test",
        smtp_configured: true,
        email_enabled: true,
        twilio_configured: true,
        whatsapp_enabled: true,
        whatsapp_fallback_to_email: true,
        storage_configured: true,
        waze_base_url: "https://waze.test",
        waze_navigation_enabled: true,
        file_token_ttl_sec: 300,
        file_token_uses: 3,
        journal_public_token_ttl_sec: 600,
        sync_warn_lag: 10,
        sync_danger_lag: 20,
        sync_warn_days_offline: 3,
        sync_danger_days_offline: 7,
        sync_project_auto_problem_enabled: true,
        sync_project_auto_problem_days: 5,
        auth_login_rl_window_sec: 60,
        auth_login_rl_max_req: 5,
        auth_refresh_rl_window_sec: 60,
        auth_refresh_rl_max_req: 10,
      };
    }
    if (path === "/api/v1/admin/settings/integrations/health") {
      return {
        email: {
          channel: "EMAIL",
          provider: "SMTP",
          enabled: true,
          configured: true,
          ready: true,
          callback_configured: false,
          sender_identity: "no-reply@dimax.local",
          fallback_enabled: null,
          validation_enabled: null,
          notes: [],
        },
        whatsapp: {
          channel: "WHATSAPP",
          provider: "TWILIO",
          enabled: true,
          configured: true,
          ready: true,
          callback_configured: true,
          sender_identity: "whatsapp:+14155238886",
          fallback_enabled: true,
          validation_enabled: false,
          notes: [],
        },
      };
    }
    return {};
  };
}

describe("SettingsPage", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    userRoleMock.mockReset();
  });

  it("disables company mutation and provider tests for installer role", async () => {
    userRoleMock.mockReturnValue("INSTALLER");
    apiFetchMock.mockImplementation(buildBaseSettingsApi());

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <SettingsPage />
      </QueryClientProvider>
    );

    expect(
      await screen.findByText("Installer role has read-only access to company settings.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Company" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Send Email Test" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Send WhatsApp Test" })).toBeDisabled();
  });

  it("sends integration email test for admin role", async () => {
    userRoleMock.mockReturnValue("ADMIN");
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path === "/api/v1/admin/settings/integrations/test-email") {
        return {
          ok: true,
          channel: "EMAIL",
          provider: "SMTP",
          recipient: "ops@example.com",
          provider_message_id: null,
        };
      }
      return buildBaseSettingsApi()(path);
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <SettingsPage />
      </QueryClientProvider>
    );

    await screen.findByText("Provider test send");
    fireEvent.click(screen.getByRole("button", { name: "Send Email Test" }));

    await waitFor(() => {
      const sendCall = apiFetchMock.mock.calls.find(
        (call) => call[0] === "/api/v1/admin/settings/integrations/test-email"
      );
      expect(sendCall).toBeTruthy();
    });

    expect(await screen.findByText("Email test sent to ops@example.com")).toBeInTheDocument();
  });
});
