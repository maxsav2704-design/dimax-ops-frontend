import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Save,
  Send,
  Settings2,
} from "lucide-react";

import { DashboardLayout } from "@/components/DashboardLayout";
import { useUserRole } from "@/hooks/use-user-role";
import { apiFetch } from "@/lib/api";
import { canRunPrivilegedAdminActions } from "@/lib/admin-access";
import { cn } from "@/lib/utils";

type CompanySettings = {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type IntegrationsSettings = {
  public_base_url: string;
  smtp_configured: boolean;
  email_enabled: boolean;
  twilio_configured: boolean;
  whatsapp_enabled: boolean;
  whatsapp_fallback_to_email: boolean;
  storage_configured: boolean;
  waze_base_url: string;
  waze_navigation_enabled: boolean;
  file_token_ttl_sec: number;
  file_token_uses: number;
  journal_public_token_ttl_sec: number;
  sync_warn_lag: number;
  sync_danger_lag: number;
  sync_warn_days_offline: number;
  sync_danger_days_offline: number;
  sync_project_auto_problem_enabled: boolean;
  sync_project_auto_problem_days: number;
  auth_login_rl_window_sec: number;
  auth_login_rl_max_req: number;
  auth_refresh_rl_window_sec: number;
  auth_refresh_rl_max_req: number;
};

type IntegrationChannelHealth = {
  channel: string;
  provider: string;
  enabled: boolean;
  configured: boolean;
  ready: boolean;
  callback_configured: boolean;
  sender_identity: string | null;
  fallback_enabled: boolean | null;
  validation_enabled: boolean | null;
  notes: string[];
};

type IntegrationsHealth = {
  email: IntegrationChannelHealth;
  whatsapp: IntegrationChannelHealth;
};

type IntegrationTestSendResponse = {
  ok: boolean;
  channel: string;
  provider: string;
  recipient: string;
  provider_message_id: string | null;
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

function BoolBadge({ value }: { value: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold border",
        value
          ? "text-[hsl(var(--success))] bg-[hsl(var(--success)/0.12)] border-[hsl(var(--success)/0.24)]"
          : "text-muted-foreground bg-muted border-border"
      )}
    >
      {value ? (
        <CheckCircle2 className="w-3.5 h-3.5" />
      ) : (
        <AlertCircle className="w-3.5 h-3.5" />
      )}
      {value ? "Enabled" : "Disabled"}
    </span>
  );
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [companyName, setCompanyName] = useState("");
  const [emailTestRecipient, setEmailTestRecipient] = useState("ops@example.com");
  const [whatsappTestRecipient, setWhatsappTestRecipient] = useState("+972500000000");
  const [testMessage, setTestMessage] = useState("DIMAX delivery channel test");
  const [testFeedback, setTestFeedback] = useState("");
  const userRole = useUserRole();
  const canManageSettings = canRunPrivilegedAdminActions(userRole);
  const privilegedActionHint = canManageSettings
    ? undefined
    : "Installer role is read-only in settings";

  const companyQuery = useQuery({
    queryKey: ["settings-company"],
    queryFn: () => apiFetch<CompanySettings>("/api/v1/admin/settings/company"),
  });

  const integrationsQuery = useQuery({
    queryKey: ["settings-integrations"],
    queryFn: () => apiFetch<IntegrationsSettings>("/api/v1/admin/settings/integrations"),
  });

  const integrationsHealthQuery = useQuery({
    queryKey: ["settings-integrations-health"],
    queryFn: () => apiFetch<IntegrationsHealth>("/api/v1/admin/settings/integrations/health"),
  });

  useEffect(() => {
    if (companyQuery.data?.name) {
      setCompanyName(companyQuery.data.name);
    }
  }, [companyQuery.data?.name]);

  const updateCompanyMutation = useMutation({
    mutationFn: (name: string) =>
      apiFetch<CompanySettings>("/api/v1/admin/settings/company", {
        method: "PATCH",
        body: JSON.stringify({ name }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["settings-company"] });
    },
  });

  const emailTestMutation = useMutation({
    mutationFn: () =>
      apiFetch<IntegrationTestSendResponse>("/api/v1/admin/settings/integrations/test-email", {
        method: "POST",
        body: JSON.stringify({
          to_email: emailTestRecipient.trim(),
          subject: "DIMAX SMTP test",
          message: testMessage.trim() || "DIMAX delivery channel test",
        }),
      }),
    onSuccess: async (result) => {
      setTestFeedback(`Email test sent to ${result.recipient}`);
      await integrationsHealthQuery.refetch();
    },
    onError: (error) => {
      setTestFeedback(error instanceof Error ? error.message : "Email test send failed");
    },
  });

  const whatsappTestMutation = useMutation({
    mutationFn: () =>
      apiFetch<IntegrationTestSendResponse>("/api/v1/admin/settings/integrations/test-whatsapp", {
        method: "POST",
        body: JSON.stringify({
          to_phone: whatsappTestRecipient.trim(),
          message: testMessage.trim() || "DIMAX delivery channel test",
        }),
      }),
    onSuccess: async (result) => {
      const providerId = result.provider_message_id ? ` (${result.provider_message_id})` : "";
      setTestFeedback(`WhatsApp test sent to ${result.recipient}${providerId}`);
      await integrationsHealthQuery.refetch();
    },
    onError: (error) => {
      setTestFeedback(error instanceof Error ? error.message : "WhatsApp test send failed");
    },
  });

  const isLoading =
    companyQuery.isLoading || integrationsQuery.isLoading || integrationsHealthQuery.isLoading;
  const isError =
    companyQuery.isError || integrationsQuery.isError || integrationsHealthQuery.isError;
  const company = companyQuery.data;
  const integrations = integrationsQuery.data;
  const integrationsHealth = integrationsHealthQuery.data;

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-[1400px]">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-foreground tracking-tight">Settings</h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              Company profile and integration health
            </p>
          </div>
          <button
            onClick={() => {
              void companyQuery.refetch();
              void integrationsQuery.refetch();
              void integrationsHealthQuery.refetch();
            }}
            className="btn-premium h-9 px-4 rounded-lg border border-border bg-card text-[13px] font-medium flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" strokeWidth={1.8} />
            Refresh
          </button>
        </div>

        {isError && (
          <div className="mb-4 rounded-lg border border-[hsl(var(--destructive)/0.35)] bg-[hsl(var(--destructive)/0.08)] px-4 py-3 text-[13px] text-[hsl(var(--destructive))]">
            Failed to load settings. Verify auth and backend availability.
          </div>
        )}
        {!canManageSettings && (
          <div className="mb-4 rounded-lg border border-[hsl(var(--warning)/0.35)] bg-[hsl(var(--warning)/0.08)] px-4 py-3 text-[13px] text-[hsl(var(--warning-foreground))]">
            Installer role has read-only access to company settings.
          </div>
        )}
        {testFeedback && (
          <div className="mb-4 rounded-lg border border-border bg-card px-4 py-3 text-[13px] text-foreground">
            {testFeedback}
          </div>
        )}

        {isLoading && (
          <div className="glass-card rounded-xl p-4 text-[13px] text-muted-foreground">
            Loading settings...
          </div>
        )}

        {!isLoading && company && integrations && integrationsHealth && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <section className="glass-card rounded-xl p-5 xl:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <Settings2 className="w-4 h-4 text-accent" />
                <h2 className="text-[14px] font-semibold">Company</h2>
              </div>
              <div className="space-y-3">
                <label className="block text-[12px] text-muted-foreground">Company name</label>
                <input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  disabled={!canManageSettings}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-accent/40 disabled:opacity-60 disabled:cursor-not-allowed"
                />
                <div className="flex items-center justify-between text-[12px] text-muted-foreground">
                  <span>Status</span>
                  <BoolBadge value={company.is_active} />
                </div>
                <div className="text-[12px] text-muted-foreground">
                  Created: {formatDate(company.created_at)}
                </div>
                <div className="text-[12px] text-muted-foreground">
                  Updated: {formatDate(company.updated_at)}
                </div>
                <button
                  onClick={() => updateCompanyMutation.mutate(companyName.trim())}
                  disabled={!canManageSettings || !companyName.trim() || updateCompanyMutation.isPending}
                  title={privilegedActionHint}
                  className="h-10 w-full rounded-lg bg-accent text-accent-foreground text-[13px] font-medium flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  Save Company
                </button>
              </div>
            </section>

            <section className="glass-card rounded-xl p-5 xl:col-span-2">
              <h2 className="text-[14px] font-semibold mb-4">Integrations Snapshot</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-lg border border-border bg-background px-3 py-3">
                  <p className="text-[12px] text-muted-foreground mb-2">Email / SMTP</p>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[12px] text-muted-foreground">SMTP configured</span>
                    <BoolBadge value={integrations.smtp_configured} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] text-muted-foreground">Email enabled</span>
                    <BoolBadge value={integrations.email_enabled} />
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[12px] text-muted-foreground">Channel ready</span>
                    <BoolBadge value={integrationsHealth.email.ready} />
                  </div>
                  <div className="mt-2 text-[12px] text-muted-foreground">
                    Sender: {integrationsHealth.email.sender_identity || "-"}
                  </div>
                  {integrationsHealth.email.notes.map((note) => (
                    <div key={note} className="mt-1 text-[12px] text-muted-foreground">
                      {note}
                    </div>
                  ))}
                </div>

                <div className="rounded-lg border border-border bg-background px-3 py-3">
                  <p className="text-[12px] text-muted-foreground mb-2">WhatsApp / Twilio</p>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[12px] text-muted-foreground">Twilio configured</span>
                    <BoolBadge value={integrations.twilio_configured} />
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[12px] text-muted-foreground">WhatsApp enabled</span>
                    <BoolBadge value={integrations.whatsapp_enabled} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] text-muted-foreground">Fallback to email</span>
                    <BoolBadge value={integrations.whatsapp_fallback_to_email} />
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[12px] text-muted-foreground">Channel ready</span>
                    <BoolBadge value={integrationsHealth.whatsapp.ready} />
                  </div>
                  <div className="mt-2 text-[12px] text-muted-foreground">
                    Sender: {integrationsHealth.whatsapp.sender_identity || "-"}
                  </div>
                  <div className="mt-1 text-[12px] text-muted-foreground">
                    Callback configured: {integrationsHealth.whatsapp.callback_configured ? "yes" : "no"}
                  </div>
                  {integrationsHealth.whatsapp.notes.map((note) => (
                    <div key={note} className="mt-1 text-[12px] text-muted-foreground">
                      {note}
                    </div>
                  ))}
                </div>

                <div className="rounded-lg border border-border bg-background px-3 py-3">
                  <p className="text-[12px] text-muted-foreground mb-2">Storage / Links</p>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[12px] text-muted-foreground">Storage configured</span>
                    <BoolBadge value={integrations.storage_configured} />
                  </div>
                  <div className="text-[12px] text-muted-foreground">
                    Public URL: {integrations.public_base_url || "-"}
                  </div>
                  <div className="text-[12px] text-muted-foreground">
                    Waze URL: {integrations.waze_base_url || "-"}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[12px] text-muted-foreground">Waze nav</span>
                    <BoolBadge value={integrations.waze_navigation_enabled} />
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-background px-3 py-3">
                  <p className="text-[12px] text-muted-foreground mb-2">Limits / Sync / Auth</p>
                  <div className="text-[12px] text-muted-foreground">
                    File token TTL: {integrations.file_token_ttl_sec}s
                  </div>
                  <div className="text-[12px] text-muted-foreground">
                    File token uses: {integrations.file_token_uses}
                  </div>
                  <div className="text-[12px] text-muted-foreground">
                    Journal token TTL: {integrations.journal_public_token_ttl_sec}s
                  </div>
                  <div className="text-[12px] text-muted-foreground mt-1">
                    Sync lag warn/danger: {integrations.sync_warn_lag}/{integrations.sync_danger_lag}
                  </div>
                  <div className="text-[12px] text-muted-foreground">
                    Auth login RL: {integrations.auth_login_rl_max_req} req/{integrations.auth_login_rl_window_sec}s
                  </div>
                  <div className="text-[12px] text-muted-foreground">
                    Auth refresh RL: {integrations.auth_refresh_rl_max_req} req/{integrations.auth_refresh_rl_window_sec}s
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-lg border border-border bg-background px-4 py-4">
                <h3 className="text-[13px] font-semibold mb-3">Provider test send</h3>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="rounded-lg border border-border bg-card px-3 py-3">
                    <div className="text-[12px] font-medium text-foreground mb-2">Email test</div>
                    <input
                      aria-label="Email test recipient"
                      value={emailTestRecipient}
                      onChange={(e) => setEmailTestRecipient(e.target.value)}
                      disabled={!canManageSettings}
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-accent/40 disabled:opacity-60"
                    />
                    <button
                      onClick={() => emailTestMutation.mutate()}
                      disabled={
                        !canManageSettings ||
                        !integrationsHealth.email.ready ||
                        !emailTestRecipient.trim() ||
                        emailTestMutation.isPending
                      }
                      title={privilegedActionHint}
                      className="mt-3 h-10 w-full rounded-lg border border-border bg-card text-[13px] font-medium flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <Send className="w-4 h-4" />
                      Send Email Test
                    </button>
                  </div>

                  <div className="rounded-lg border border-border bg-card px-3 py-3">
                    <div className="text-[12px] font-medium text-foreground mb-2">WhatsApp test</div>
                    <input
                      aria-label="WhatsApp test recipient"
                      value={whatsappTestRecipient}
                      onChange={(e) => setWhatsappTestRecipient(e.target.value)}
                      disabled={!canManageSettings}
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-accent/40 disabled:opacity-60"
                    />
                    <button
                      onClick={() => whatsappTestMutation.mutate()}
                      disabled={
                        !canManageSettings ||
                        !integrationsHealth.whatsapp.ready ||
                        !whatsappTestRecipient.trim() ||
                        whatsappTestMutation.isPending
                      }
                      title={privilegedActionHint}
                      className="mt-3 h-10 w-full rounded-lg border border-border bg-card text-[13px] font-medium flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <Send className="w-4 h-4" />
                      Send WhatsApp Test
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-[12px] text-muted-foreground mb-1">Test message</label>
                  <textarea
                    aria-label="Provider test message"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    disabled={!canManageSettings}
                    rows={3}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-accent/40 disabled:opacity-60"
                  />
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
