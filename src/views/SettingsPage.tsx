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
import { useAuthSession } from "@/hooks/use-auth-session";
import { apiFetch } from "@/lib/api";
import { readableApiError } from "@/lib/api-error-display";
import { canAccessAdminModule } from "@/lib/admin-access";
import { useI18n } from "@/lib/i18n";
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
  const { locale } = useI18n();
  const [companyName, setCompanyName] = useState("");
  const [emailTestRecipient, setEmailTestRecipient] = useState("ops@example.com");
  const [whatsappTestRecipient, setWhatsappTestRecipient] = useState("+972500000000");
  const [testMessage, setTestMessage] = useState("DIMAX delivery channel test");
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const session = useAuthSession();
  const canManageSettings = canAccessAdminModule(session, "settings");
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

  useEffect(() => {
    if (!feedback || feedback.tone === "error") {
      return undefined;
    }
    const timer = window.setTimeout(() => setFeedback(null), 3000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const updateCompanyMutation = useMutation({
    mutationFn: (name: string) =>
      apiFetch<CompanySettings>("/api/v1/admin/settings/company", {
        method: "PATCH",
        body: JSON.stringify({ name }),
      }),
    onSuccess: async () => {
      setFeedback({
        tone: "success",
        message:
          locale === "ru"
            ? "Данные компании сохранены."
            : locale === "he"
              ? "פרטי החברה נשמרו."
              : "Company details saved.",
      });
      await queryClient.invalidateQueries({ queryKey: ["settings-company"] });
    },
    onError: (error) => {
      setFeedback({
        tone: "error",
        message: readableApiError(error, locale, "Failed to save company details"),
      });
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
      setFeedback({
        tone: "success",
        message:
          locale === "ru"
            ? `Тестовое email-сообщение отправлено на ${result.recipient}`
            : locale === "he"
              ? `מייל בדיקה נשלח אל ${result.recipient}`
              : `Email test sent to ${result.recipient}`,
      });
      await integrationsHealthQuery.refetch();
    },
    onError: (error) => {
      setFeedback({
        tone: "error",
        message: readableApiError(error, locale, "Email test send failed"),
      });
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
      setFeedback({
        tone: "success",
        message:
          locale === "ru"
            ? `Тестовое WhatsApp-сообщение отправлено на ${result.recipient}${providerId}`
            : locale === "he"
              ? `הודעת בדיקה ב-WhatsApp נשלחה אל ${result.recipient}${providerId}`
              : `WhatsApp test sent to ${result.recipient}${providerId}`,
      });
      await integrationsHealthQuery.refetch();
    },
    onError: (error) => {
      setFeedback({
        tone: "error",
        message: readableApiError(error, locale, "WhatsApp test send failed"),
      });
    },
  });

  const isLoading =
    companyQuery.isLoading || integrationsQuery.isLoading || integrationsHealthQuery.isLoading;
  const isError =
    companyQuery.isError || integrationsQuery.isError || integrationsHealthQuery.isError;
  const company = companyQuery.data;
  const integrations = integrationsQuery.data;
  const integrationsHealth = integrationsHealthQuery.data;
  const loadErrorMessage = readableApiError(
    companyQuery.error || integrationsQuery.error || integrationsHealthQuery.error,
    locale,
    "Failed to load settings. Verify auth and backend availability."
  );

  return (
    <DashboardLayout>
      <div className="page-shell page-stack motion-stagger">
        <section className="page-hero">
          <div className="relative z-10 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <div className="page-eyebrow">Company controls</div>
              <h1 className="mt-3 font-display text-3xl tracking-[-0.04em] text-foreground sm:text-4xl">
                Settings
              </h1>
              <p className="mt-3 max-w-2xl text-[14px] leading-7 text-muted-foreground">
                Company profile, provider readiness, token limits, and controlled recovery settings.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="metric-chip">Email {integrations?.email_enabled ? "on" : "off"}</span>
                <span className="metric-chip">WhatsApp {integrations?.whatsapp_enabled ? "on" : "off"}</span>
                <span className="metric-chip">Storage {integrations?.storage_configured ? "ready" : "pending"}</span>
              </div>
            </div>
            <div className="surface-subtle min-w-[320px] max-w-xl space-y-4 p-4 sm:p-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-border/70 bg-background/70 px-3 py-3">
                  <div className="metric-label">Company</div>
                  <div className="mt-1 min-h-[3.5rem] text-lg font-semibold text-foreground">{company?.name || "—"}</div>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/70 px-3 py-3">
                  <div className="metric-label">Mode</div>
                  <div className="mt-1 min-h-[3.5rem] text-lg font-semibold text-foreground">
                    {canManageSettings ? "Manage" : "Read only"}
                  </div>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/70 px-3 py-3">
                  <div className="metric-label">Refresh state</div>
                  <div className="mt-1 min-h-[3.5rem] text-lg font-semibold text-foreground">
                    {isLoading ? "Syncing" : "Ready"}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  void companyQuery.refetch();
                  void integrationsQuery.refetch();
                  void integrationsHealthQuery.refetch();
                }}
                className="btn-premium h-11 rounded-xl border border-border bg-card/80 px-4 text-[13px] font-medium flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" strokeWidth={1.8} />
                Refresh
              </button>
            </div>
          </div>
        </section>

        {isError && (
          <div className="rounded-xl border border-[hsl(var(--destructive)/0.35)] bg-[hsl(var(--destructive)/0.08)] px-4 py-3 text-[13px] text-[hsl(var(--destructive))]">
            {loadErrorMessage}
          </div>
        )}
        {!canManageSettings && (
          <div className="rounded-xl border border-[hsl(var(--warning)/0.35)] bg-[hsl(var(--warning)/0.08)] px-4 py-3 text-[13px] text-[hsl(var(--warning-foreground))]">
            Installer role has read-only access to company settings.
          </div>
        )}
        {feedback && (
          <div
            className={cn(
              "rounded-xl px-4 py-3 text-[13px]",
              feedback.tone === "error"
                ? "border border-[hsl(var(--destructive)/0.35)] bg-[hsl(var(--destructive)/0.08)] text-[hsl(var(--destructive))]"
                : "border border-[hsl(var(--success)/0.35)] bg-[hsl(var(--success)/0.08)] text-[hsl(var(--success))]"
            )}
          >
            {feedback.message}
          </div>
        )}

        {isLoading && (
          <div className="surface-panel panel-pad-sm text-[13px] text-muted-foreground">
            Loading settings...
          </div>
        )}

        {!isLoading && company && integrations && integrationsHealth && (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <section className="surface-panel panel-pad xl:col-span-1">
              <div className="panel-heading mb-4">
                <div>
                  <h2 className="panel-title">Company</h2>
                  <p className="panel-subtitle">Canonical identity used by every public handoff and system notice.</p>
                </div>
                <Settings2 className="w-4 h-4 text-accent" />
              </div>
              <div className="space-y-4">
                <div className="field-stack">
                  <label className="field-label">Company name</label>
                  <input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    disabled={!canManageSettings}
                    className="control-input"
                  />
                </div>
                <div className="surface-subtle flex min-h-[220px] flex-col px-3 py-3">
                  <div className="flex items-center justify-between text-[12px] leading-6 text-muted-foreground">
                    <span>Status</span>
                    <BoolBadge value={company.is_active} />
                  </div>
                  <div className="mt-3 grid gap-1 text-[12px] leading-6 text-muted-foreground">
                    <div>Created: {formatDate(company.created_at)}</div>
                    <div>Updated: {formatDate(company.updated_at)}</div>
                  </div>
                </div>
                <button
                  onClick={() => updateCompanyMutation.mutate(companyName.trim())}
                  disabled={!canManageSettings || !companyName.trim() || updateCompanyMutation.isPending}
                  title={privilegedActionHint}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 text-[13px] font-medium text-accent-foreground shadow-[0_16px_34px_-18px_hsl(var(--accent)/0.55)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save className="w-4 h-4" />
                  Save Company
                </button>
              </div>
            </section>

            <section className="surface-panel panel-pad xl:col-span-2">
              <div className="panel-heading mb-4">
                <div>
                  <h2 className="panel-title">Integrations Snapshot</h2>
                  <p className="panel-subtitle">Delivery readiness, storage posture, and protection limits in one place.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="surface-subtle px-3 py-3">
                  <p className="metric-label mb-3">Email / SMTP</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] leading-6 text-muted-foreground">SMTP configured</span>
                      <BoolBadge value={integrations.smtp_configured} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] leading-6 text-muted-foreground">Email enabled</span>
                      <BoolBadge value={integrations.email_enabled} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] leading-6 text-muted-foreground">Channel ready</span>
                      <BoolBadge value={integrationsHealth.email.ready} />
                    </div>
                  </div>
                  <div className="mt-auto pt-3 space-y-1 text-[12px] leading-6 text-muted-foreground">
                    <div>Sender: {integrationsHealth.email.sender_identity || "-"}</div>
                    {integrationsHealth.email.notes.map((note) => (
                      <div key={note}>{note}</div>
                    ))}
                  </div>
                </div>

                <div className="surface-subtle flex min-h-[220px] flex-col px-3 py-3">
                  <p className="metric-label mb-3">WhatsApp / Twilio</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] leading-6 text-muted-foreground">Twilio configured</span>
                      <BoolBadge value={integrations.twilio_configured} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] leading-6 text-muted-foreground">WhatsApp enabled</span>
                      <BoolBadge value={integrations.whatsapp_enabled} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] leading-6 text-muted-foreground">Fallback to email</span>
                      <BoolBadge value={integrations.whatsapp_fallback_to_email} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] leading-6 text-muted-foreground">Channel ready</span>
                      <BoolBadge value={integrationsHealth.whatsapp.ready} />
                    </div>
                  </div>
                  <div className="mt-auto pt-3 space-y-1 text-[12px] leading-6 text-muted-foreground">
                    <div>Sender: {integrationsHealth.whatsapp.sender_identity || "-"}</div>
                    <div>Callback configured: {integrationsHealth.whatsapp.callback_configured ? "yes" : "no"}</div>
                    {integrationsHealth.whatsapp.notes.map((note) => (
                      <div key={note}>{note}</div>
                    ))}
                  </div>
                </div>

                <div className="surface-subtle min-h-[220px] px-3 py-3">
                  <p className="metric-label mb-3">Storage / Links</p>
                  <div className="space-y-2 text-[12px] leading-6 text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span>Storage configured</span>
                      <BoolBadge value={integrations.storage_configured} />
                    </div>
                    <div>Public URL: {integrations.public_base_url || "-"}</div>
                    <div>Waze URL: {integrations.waze_base_url || "-"}</div>
                    <div className="flex items-center gap-2">
                      <span>Waze nav</span>
                      <BoolBadge value={integrations.waze_navigation_enabled} />
                    </div>
                  </div>
                </div>

                <div className="surface-subtle min-h-[220px] px-3 py-3">
                  <p className="metric-label mb-3">Limits / Sync / Auth</p>
                  <div className="space-y-1 text-[12px] leading-6 text-muted-foreground">
                    <div>File token TTL: {integrations.file_token_ttl_sec}s</div>
                    <div>File token uses: {integrations.file_token_uses}</div>
                    <div>Journal token TTL: {integrations.journal_public_token_ttl_sec}s</div>
                    <div>Sync lag warn/danger: {integrations.sync_warn_lag}/{integrations.sync_danger_lag}</div>
                    <div>Auth login RL: {integrations.auth_login_rl_max_req} req/{integrations.auth_login_rl_window_sec}s</div>
                    <div>Auth refresh RL: {integrations.auth_refresh_rl_max_req} req/{integrations.auth_refresh_rl_window_sec}s</div>
                  </div>
                </div>
              </div>

              <div className="surface-subtle mt-5 px-4 py-4">
                <h3 className="panel-title mb-3">Provider test send</h3>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="flex min-h-[184px] flex-col rounded-2xl border border-border/70 bg-background/75 px-3 py-3">
                    <div className="metric-label mb-3">Email test</div>
                    <input
                      aria-label="Email test recipient"
                      value={emailTestRecipient}
                      onChange={(e) => setEmailTestRecipient(e.target.value)}
                      disabled={!canManageSettings}
                      className="control-input"
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
                      className="mt-auto inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-border/70 bg-background/80 text-[13px] font-medium transition-colors hover:border-accent/35 hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Send className="w-4 h-4" />
                      Send Email Test
                    </button>
                  </div>

                  <div className="flex min-h-[184px] flex-col rounded-2xl border border-border/70 bg-background/75 px-3 py-3">
                    <div className="metric-label mb-3">WhatsApp test</div>
                    <input
                      aria-label="WhatsApp test recipient"
                      value={whatsappTestRecipient}
                      onChange={(e) => setWhatsappTestRecipient(e.target.value)}
                      disabled={!canManageSettings}
                      className="control-input"
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
                      className="mt-auto inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-border/70 bg-background/80 text-[13px] font-medium transition-colors hover:border-accent/35 hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Send className="w-4 h-4" />
                      Send WhatsApp Test
                    </button>
                  </div>
                </div>

                <div className="field-stack mt-4">
                  <label className="field-label">Test message</label>
                  <textarea
                    aria-label="Provider test message"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    disabled={!canManageSettings}
                    rows={3}
                    className="control-textarea"
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

