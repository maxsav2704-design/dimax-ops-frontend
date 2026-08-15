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
import { DimaxPageHeader } from "@/components/DimaxPageHeader";
import {
  KpiCard as DimaxKpiCard,
  WidgetCard,
} from "@/components/dimax";
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
function formatDate(value: string, locale?: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString(locale);
}
function BoolBadge({ value, locale }: { value: boolean; locale?: string }) {
  const label = value
    ? locale === "ru"
      ? "Включено"
      : locale === "he"
        ? "פעיל"
        : "Enabled"
    : locale === "ru"
      ? "Отключено"
      : locale === "he"
        ? "כבוי"
        : "Disabled";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold border",
        value
          ? "border-status-ok-border bg-status-ok-bg text-status-ok-fg"
          : "border-status-blocked-border bg-status-blocked-bg text-status-blocked-fg",
      )}
    >
      {" "}
      {value ? (
        <CheckCircle2 className="w-3.5 h-3.5" />
      ) : (
        <AlertCircle className="w-3.5 h-3.5" />
      )}{" "}
      {label}{" "}
    </span>
  );
}
function settingsNoticeClass(tone: "success" | "error" | "warning"): string {
  return cn(
    "flex rounded-lg border px-4 py-3 text-[13px]",
    tone === "success" &&
      "items-center gap-2 border-status-ok-border bg-status-ok-bg text-status-ok-fg",
    tone === "error" &&
      "items-start gap-2 border-status-problem-border bg-status-problem-bg text-status-problem-fg",
    tone === "warning" &&
      "items-start gap-2 border-status-warning-border bg-status-warning-bg text-status-warning-fg",
  );
}
export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { locale } = useI18n();
  const copy = (en: string, ru: string, he: string) =>
    locale === "ru" ? ru : locale === "he" ? he : en;
  const [companyName, setCompanyName] = useState("");
  const [emailTestRecipient, setEmailTestRecipient] =
    useState("ops@example.com");
  const [whatsappTestRecipient, setWhatsappTestRecipient] =
    useState("+972500000000");
  const [testMessage, setTestMessage] = useState("DIMAX delivery channel test");
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const session = useAuthSession();
  const canManageSettings = canAccessAdminModule(session, "settings");
  const privilegedActionHint = canManageSettings
    ? undefined
    : copy(
        "Installer role is read-only in settings",
        "Роль монтажника имеет доступ к настройкам только для чтения",
        "לתפקיד מתקין יש גישת קריאה בלבד להגדרות",
      );
  const companyQuery = useQuery({
    queryKey: ["settings-company"],
    queryFn: () => apiFetch<CompanySettings>("/api/v1/admin/settings/company"),
  });
  const integrationsQuery = useQuery({
    queryKey: ["settings-integrations"],
    queryFn: () =>
      apiFetch<IntegrationsSettings>("/api/v1/admin/settings/integrations"),
  });
  const integrationsHealthQuery = useQuery({
    queryKey: ["settings-integrations-health"],
    queryFn: () =>
      apiFetch<IntegrationsHealth>(
        "/api/v1/admin/settings/integrations/health",
      ),
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
        message: readableApiError(
          error,
          locale,
          copy(
            "Failed to save company details",
            "Не удалось сохранить данные компании",
            "שמירת פרטי החברה נכשלה",
          ),
        ),
      });
    },
  });
  const emailTestMutation = useMutation({
    mutationFn: () =>
      apiFetch<IntegrationTestSendResponse>(
        "/api/v1/admin/settings/integrations/test-email",
        {
          method: "POST",
          body: JSON.stringify({
            to_email: emailTestRecipient.trim(),
            subject: "DIMAX SMTP test",
            message: testMessage.trim() || "DIMAX delivery channel test",
          }),
        },
      ),
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
        message: readableApiError(
          error,
          locale,
          copy(
            "Email test send failed",
            "Не удалось отправить тестовый email",
            "שליחת מייל הבדיקה נכשלה",
          ),
        ),
      });
    },
  });
  const whatsappTestMutation = useMutation({
    mutationFn: () =>
      apiFetch<IntegrationTestSendResponse>(
        "/api/v1/admin/settings/integrations/test-whatsapp",
        {
          method: "POST",
          body: JSON.stringify({
            to_phone: whatsappTestRecipient.trim(),
            message: testMessage.trim() || "DIMAX delivery channel test",
          }),
        },
      ),
    onSuccess: async (result) => {
      const providerId = result.provider_message_id
        ? ` (${result.provider_message_id})`
        : "";
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
        message: readableApiError(
          error,
          locale,
          copy(
            "WhatsApp test send failed",
            "Не удалось отправить тестовый WhatsApp",
            "שליחת בדיקת WhatsApp נכשלה",
          ),
        ),
      });
    },
  });
  const isLoading =
    companyQuery.isLoading ||
    integrationsQuery.isLoading ||
    integrationsHealthQuery.isLoading;
  const isError =
    companyQuery.isError ||
    integrationsQuery.isError ||
    integrationsHealthQuery.isError;
  const company = companyQuery.data;
  const integrations = integrationsQuery.data;
  const integrationsHealth = integrationsHealthQuery.data;
  const loadErrorMessage = readableApiError(
    companyQuery.error ||
      integrationsQuery.error ||
      integrationsHealthQuery.error,
    locale,
    copy(
      "Failed to load settings. Verify auth and backend availability.",
      "Не удалось загрузить настройки. Проверьте авторизацию и доступность backend.",
      "טעינת ההגדרות נכשלה. בדקו הרשאה וזמינות backend.",
    ),
  );
  return (
    <DashboardLayout>
      <div className="page-shell page-stack-tight motion-stagger">
        <DimaxPageHeader
          eyebrow={copy(
            "Company controls",
            "Управление компанией",
            "בקרות חברה",
          )}
          title={copy("Settings", "Настройки", "הגדרות")}
          badge={company?.name || "DIMAX"}
          subtitle={copy(
            "Company profile, provider readiness, token limits, and controlled recovery settings.",
            "Профиль компании, готовность провайдеров, лимиты токенов и управляемые recovery-настройки.",
            "פרופיל חברה, מוכנות ספקים, מגבלות טוקנים והגדרות שחזור מבוקרות.",
          )}
          actions={
            <button
              type="button"
              onClick={() => {
                void companyQuery.refetch();
                void integrationsQuery.refetch();
                void integrationsHealthQuery.refetch();
              }}
              className="dmx-secondary-action h-9"
            >
              <RefreshCw className="w-4 h-4" strokeWidth={1.8} />
              {copy("Refresh", "Обновить", "רענן")}
            </button>
          }
        />

        <div className="grid gap-3 md:grid-cols-5">
          <DimaxKpiCard
            label={copy("Company", "Компания", "חברה")}
            value={company?.name || "—"}
            hint={copy("Profile identity", "Профиль компании", "זהות חברה")}
            barColor="blue"
          />
          <DimaxKpiCard
            label={copy("Mode", "Режим", "מצב")}
            value={
              canManageSettings
                ? copy("Manage", "Управление", "ניהול")
                : copy("Read only", "Только чтение", "קריאה בלבד")
            }
            hint={copy("Access scope", "Права доступа", "היקף הרשאה")}
            barColor={canManageSettings ? "green" : "red"}
          />
          <DimaxKpiCard
            label={copy("Email", "Email", "אימייל")}
            value={
              integrations?.email_enabled
                ? copy("on", "вкл", "פעיל")
                : copy("off", "выкл", "כבוי")
            }
            hint={copy("SMTP channel", "SMTP канал", "ערוץ SMTP")}
            barColor={integrations?.email_enabled ? "green" : "yellow"}
          />
          <DimaxKpiCard
            label="WhatsApp"
            value={
              integrations?.whatsapp_enabled
                ? copy("on", "вкл", "פעיל")
                : copy("off", "выкл", "כבוי")
            }
            hint="Twilio"
            barColor={integrations?.whatsapp_enabled ? "green" : "yellow"}
          />
          <DimaxKpiCard
            label={copy("Refresh state", "Состояние обновления", "מצב רענון")}
            value={
              isLoading
                ? copy("Syncing", "Синхронизация", "מסנכרן")
                : copy("Ready", "Готово", "מוכן")
            }
            hint={copy("Settings snapshot", "Снимок настроек", "תמונת הגדרות")}
            barColor={isLoading ? "orange" : "blue"}
          />
        </div>

        {isError && (
          <div className={settingsNoticeClass("error")}>
            {" "}
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{" "}
            {loadErrorMessage}{" "}
          </div>
        )}{" "}
        {!canManageSettings && (
          <div className={settingsNoticeClass("warning")}>
            {" "}
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{" "}
            {copy(
              "Installer role has read-only access to company settings.",
              "Роль монтажника имеет доступ к настройкам компании только для чтения.",
              "לתפקיד מתקין יש גישת קריאה בלבד להגדרות החברה.",
            )}{" "}
          </div>
        )}{" "}
        {feedback && (
          <div className={settingsNoticeClass(feedback.tone)}>
            {" "}
            {feedback.tone === "error" ? (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            )}{" "}
            {feedback.message}{" "}
          </div>
        )}{" "}
        {isLoading && (
          <div className="rounded-lg border border-border bg-surface p-4 text-[13px] text-text-secondary">
            {" "}
            {copy(
              "Loading settings...",
              "Загрузка настроек...",
              "טוען הגדרות...",
            )}{" "}
          </div>
        )}{" "}
        {!isLoading && company && integrations && integrationsHealth && (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            {" "}
            <WidgetCard
              title={copy("Company", "Компания", "חברה")}
              headerMeta={copy(
                "Canonical identity used by every public handoff and system notice.",
                "Каноническая сущность, которая используется во всех публичных handoff и системных уведомлениях.",
                "זהות קנונית המשמשת בכל handoff ציבורי ובהודעות מערכת.",
              )}
              actionSlot={
                <Settings2 className="h-4 w-4 text-text-secondary" />
              }
              className="xl:col-span-1"
            >
              <div className="space-y-4">
                {" "}
                <div className="field-stack">
                  {" "}
                  <label className="field-label">
                    {copy("Company name", "Название компании", "שם החברה")}
                  </label>{" "}
                  <input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    disabled={!canManageSettings}
                    className="control-input"
                  />{" "}
                </div>{" "}
                <div className="surface-subtle flex min-h-[220px] flex-col px-3 py-3">
                  {" "}
                  <div className="flex items-center justify-between text-[12px] leading-6 text-text-secondary">
                    {" "}
                    <span>{copy("Status", "Статус", "סטטוס")}</span>{" "}
                    <BoolBadge value={company.is_active} locale={locale} />{" "}
                  </div>{" "}
                  <div className="mt-3 grid gap-1 text-[12px] leading-6 text-text-secondary">
                    {" "}
                    <div>
                      {copy("Created", "Создано", "נוצר")}:{" "}
                      {formatDate(company.created_at, locale)}
                    </div>{" "}
                    <div>
                      {copy("Updated", "Обновлено", "עודכן")}:{" "}
                      {formatDate(company.updated_at, locale)}
                    </div>{" "}
                  </div>{" "}
                </div>{" "}
                <button
                  type="button"
                  onClick={() =>
                    updateCompanyMutation.mutate(companyName.trim())
                  }
                  disabled={
                    !canManageSettings ||
                    !companyName.trim() ||
                    updateCompanyMutation.isPending
                  }
                  title={privilegedActionHint}
                  className="dmx-primary-action h-10 w-full disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {" "}
                  <Save className="w-4 h-4" />{" "}
                  {copy("Save Company", "Сохранить компанию", "שמור חברה")}{" "}
                </button>{" "}
              </div>{" "}
            </WidgetCard>{" "}
            <WidgetCard
              title={copy(
                "Integrations Snapshot",
                "Снимок интеграций",
                "תמונת מצב של אינטגרציות",
              )}
              headerMeta={copy(
                "Delivery readiness, storage posture, and protection limits in one place.",
                "Готовность каналов доставки, состояние хранилища и защитные лимиты в одном месте.",
                "מוכנות ערוצי המסירה, מצב האחסון ומגבלות ההגנה במקום אחד.",
              )}
              className="xl:col-span-2"
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {" "}
                <div className="surface-subtle px-3 py-3">
                  {" "}
                  <p className="mb-3 text-[11px] font-medium uppercase text-text-secondary">
                    {copy("Email / SMTP", "Email / SMTP", "אימייל / SMTP")}
                  </p>{" "}
                  <div className="space-y-2">
                    {" "}
                    <div className="flex items-center gap-2">
                      {" "}
                      <span className="text-[12px] leading-6 text-text-secondary">
                        {" "}
                        {copy(
                          "SMTP configured",
                          "SMTP настроен",
                          "SMTP מוגדר",
                        )}{" "}
                      </span>{" "}
                      <BoolBadge
                        value={integrations.smtp_configured}
                        locale={locale}
                      />{" "}
                    </div>{" "}
                    <div className="flex items-center gap-2">
                      {" "}
                      <span className="text-[12px] leading-6 text-text-secondary">
                        {" "}
                        {copy(
                          "Email enabled",
                          "Email включён",
                          "אימייל פעיל",
                        )}{" "}
                      </span>{" "}
                      <BoolBadge
                        value={integrations.email_enabled}
                        locale={locale}
                      />{" "}
                    </div>{" "}
                    <div className="flex items-center gap-2">
                      {" "}
                      <span className="text-[12px] leading-6 text-text-secondary">
                        {" "}
                        {copy(
                          "Channel ready",
                          "Канал готов",
                          "הערוץ מוכן",
                        )}{" "}
                      </span>{" "}
                      <BoolBadge
                        value={integrationsHealth.email.ready}
                        locale={locale}
                      />{" "}
                    </div>{" "}
                  </div>{" "}
                  <div className="mt-auto pt-3 space-y-1 text-[12px] leading-6 text-text-secondary">
                    {" "}
                    <div>
                      {" "}
                      {copy("Sender", "Отправитель", "שולח")}:{" "}
                      {integrationsHealth.email.sender_identity || "-"}{" "}
                    </div>{" "}
                    {integrationsHealth.email.notes.map((note) => (
                      <div key={note}>{note}</div>
                    ))}{" "}
                  </div>{" "}
                </div>{" "}
                <div className="surface-subtle flex min-h-[220px] flex-col px-3 py-3">
                  {" "}
                  <p className="mb-3 text-[11px] font-medium uppercase text-text-secondary">
                    {copy(
                      "WhatsApp / Twilio",
                      "WhatsApp / Twilio",
                      "WhatsApp / Twilio",
                    )}
                  </p>{" "}
                  <div className="space-y-2">
                    {" "}
                    <div className="flex items-center gap-2">
                      {" "}
                      <span className="text-[12px] leading-6 text-text-secondary">
                        {" "}
                        {copy(
                          "Twilio configured",
                          "Twilio настроен",
                          "Twilio מוגדר",
                        )}{" "}
                      </span>{" "}
                      <BoolBadge
                        value={integrations.twilio_configured}
                        locale={locale}
                      />{" "}
                    </div>{" "}
                    <div className="flex items-center gap-2">
                      {" "}
                      <span className="text-[12px] leading-6 text-text-secondary">
                        {" "}
                        {copy(
                          "WhatsApp enabled",
                          "WhatsApp включён",
                          "WhatsApp פעיל",
                        )}{" "}
                      </span>{" "}
                      <BoolBadge
                        value={integrations.whatsapp_enabled}
                        locale={locale}
                      />{" "}
                    </div>{" "}
                    <div className="flex items-center gap-2">
                      {" "}
                      <span className="text-[12px] leading-6 text-text-secondary">
                        {" "}
                        {copy(
                          "Fallback to email",
                          "Резерв на email",
                          "מעבר לגיבוי במייל",
                        )}{" "}
                      </span>{" "}
                      <BoolBadge
                        value={integrations.whatsapp_fallback_to_email}
                        locale={locale}
                      />{" "}
                    </div>{" "}
                    <div className="flex items-center gap-2">
                      {" "}
                      <span className="text-[12px] leading-6 text-text-secondary">
                        {" "}
                        {copy(
                          "Channel ready",
                          "Канал готов",
                          "הערוץ מוכן",
                        )}{" "}
                      </span>{" "}
                      <BoolBadge
                        value={integrationsHealth.whatsapp.ready}
                        locale={locale}
                      />{" "}
                    </div>{" "}
                  </div>{" "}
                  <div className="mt-auto pt-3 space-y-1 text-[12px] leading-6 text-text-secondary">
                    {" "}
                    <div>
                      {" "}
                      {copy("Sender", "Отправитель", "שולח")}:{" "}
                      {integrationsHealth.whatsapp.sender_identity || "-"}{" "}
                    </div>{" "}
                    <div>
                      {" "}
                      {copy(
                        "Callback configured",
                        "Callback настроен",
                        "Callback מוגדר",
                      )}
                      :{" "}
                      {integrationsHealth.whatsapp.callback_configured
                        ? copy("yes", "да", "כן")
                        : copy("no", "нет", "לא")}{" "}
                    </div>{" "}
                    {integrationsHealth.whatsapp.notes.map((note) => (
                      <div key={note}>{note}</div>
                    ))}{" "}
                  </div>{" "}
                </div>{" "}
                <div className="surface-subtle min-h-[220px] px-3 py-3">
                  {" "}
                  <p className="mb-3 text-[11px] font-medium uppercase text-text-secondary">
                    {copy(
                      "Storage / Links",
                      "Хранилище / ссылки",
                      "אחסון / קישורים",
                    )}
                  </p>{" "}
                  <div className="space-y-2 text-[12px] leading-6 text-text-secondary">
                    {" "}
                    <div className="flex items-center gap-2">
                      {" "}
                      <span>
                        {copy(
                          "Storage configured",
                          "Хранилище настроено",
                          "האחסון מוגדר",
                        )}
                      </span>{" "}
                      <BoolBadge
                        value={integrations.storage_configured}
                        locale={locale}
                      />{" "}
                    </div>{" "}
                    <div>
                      {copy("Public URL", "Публичный URL", "URL ציבורי")}:{" "}
                      {integrations.public_base_url || "-"}
                    </div>{" "}
                    <div>
                      {copy("Waze URL", "URL Waze", "URL של Waze")}:{" "}
                      {integrations.waze_base_url || "-"}
                    </div>{" "}
                    <div className="flex items-center gap-2">
                      {" "}
                      <span>
                        {copy("Waze nav", "Навигация Waze", "ניווט Waze")}
                      </span>{" "}
                      <BoolBadge
                        value={integrations.waze_navigation_enabled}
                        locale={locale}
                      />{" "}
                    </div>{" "}
                  </div>{" "}
                </div>{" "}
                <div className="surface-subtle min-h-[220px] px-3 py-3">
                  {" "}
                  <p className="mb-3 text-[11px] font-medium uppercase text-text-secondary">
                    {copy(
                      "Limits / Sync / Auth",
                      "Лимиты / Sync / Auth",
                      "מגבלות / Sync / Auth",
                    )}
                  </p>{" "}
                  <div className="space-y-1 text-[12px] leading-6 text-text-secondary">
                    {" "}
                    <div>
                      {copy(
                        "File token TTL",
                        "TTL файлового токена",
                        "TTL של טוקן קובץ",
                      )}
                      : {integrations.file_token_ttl_sec}s
                    </div>{" "}
                    <div>
                      {copy(
                        "File token uses",
                        "Использований файлового токена",
                        "מספר שימושי טוקן קובץ",
                      )}
                      : {integrations.file_token_uses}
                    </div>{" "}
                    <div>
                      {copy(
                        "Journal token TTL",
                        "TTL токена журнала",
                        "TTL של טוקן יומן",
                      )}
                      : {integrations.journal_public_token_ttl_sec}s
                    </div>{" "}
                    <div>
                      {copy(
                        "Sync lag warn/danger",
                        "Lag sync warn/danger",
                        "השהיית sync אזהרה/סכנה",
                      )}
                      : {integrations.sync_warn_lag}/
                      {integrations.sync_danger_lag}
                    </div>{" "}
                    <div>
                      {copy("Auth login RL", "RL логина", "הגבלת קצב התחברות")}:{" "}
                      {integrations.auth_login_rl_max_req} req/
                      {integrations.auth_login_rl_window_sec}s
                    </div>{" "}
                    <div>
                      {copy("Auth refresh RL", "RL refresh", "הגבלת קצב רענון")}
                      : {integrations.auth_refresh_rl_max_req} req/
                      {integrations.auth_refresh_rl_window_sec}s
                    </div>{" "}
                  </div>{" "}
                </div>{" "}
              </div>{" "}
              <div className="surface-subtle mt-5 px-4 py-4">
                {" "}
                <h3 className="panel-title mb-3">
                  {" "}
                  {copy(
                    "Provider test send",
                    "Тестовая отправка провайдеров",
                    "שליחת בדיקה לספקים",
                  )}{" "}
                </h3>{" "}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {" "}
                  <div className="flex min-h-[184px] flex-col rounded-lg border border-border bg-surface px-3 py-3">
                    {" "}
                    <div className="mb-3 text-[11px] font-medium uppercase text-text-secondary">
                      {copy("Email test", "Тест email", "בדיקת אימייל")}
                    </div>{" "}
                    <input
                      aria-label="Email test recipient"
                      value={emailTestRecipient}
                      onChange={(e) => setEmailTestRecipient(e.target.value)}
                      disabled={!canManageSettings}
                      className="control-input"
                    />{" "}
                    <button
                      type="button"
                      onClick={() => emailTestMutation.mutate()}
                      disabled={
                        !canManageSettings ||
                        !integrationsHealth.email.ready ||
                        !emailTestRecipient.trim() ||
                        emailTestMutation.isPending
                      }
                      title={privilegedActionHint}
                      className="dmx-secondary-action mt-auto h-10 w-full disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {" "}
                      <Send className="w-4 h-4" />{" "}
                      {copy(
                        "Send Email Test",
                        "Отправить email-тест",
                        "שלח בדיקת אימייל",
                      )}{" "}
                    </button>{" "}
                  </div>{" "}
                  <div className="flex min-h-[184px] flex-col rounded-lg border border-border bg-surface px-3 py-3">
                    {" "}
                    <div className="mb-3 text-[11px] font-medium uppercase text-text-secondary">
                      {copy("WhatsApp test", "Тест WhatsApp", "בדיקת WhatsApp")}
                    </div>{" "}
                    <input
                      aria-label="WhatsApp test recipient"
                      value={whatsappTestRecipient}
                      onChange={(e) => setWhatsappTestRecipient(e.target.value)}
                      disabled={!canManageSettings}
                      className="control-input"
                    />{" "}
                    <button
                      type="button"
                      onClick={() => whatsappTestMutation.mutate()}
                      disabled={
                        !canManageSettings ||
                        !integrationsHealth.whatsapp.ready ||
                        !whatsappTestRecipient.trim() ||
                        whatsappTestMutation.isPending
                      }
                      title={privilegedActionHint}
                      className="dmx-secondary-action mt-auto h-10 w-full disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {" "}
                      <Send className="w-4 h-4" />{" "}
                      {copy(
                        "Send WhatsApp Test",
                        "Отправить WhatsApp-тест",
                        "שלח בדיקת WhatsApp",
                      )}{" "}
                    </button>{" "}
                  </div>{" "}
                </div>{" "}
                <div className="field-stack mt-4">
                  {" "}
                  <label className="field-label">
                    {copy("Test message", "Тестовое сообщение", "הודעת בדיקה")}
                  </label>{" "}
                  <textarea
                    aria-label="Provider test message"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    disabled={!canManageSettings}
                    rows={3}
                    className="control-textarea"
                  />{" "}
                </div>{" "}
              </div>{" "}
            </WidgetCard>{" "}
          </div>
        )}{" "}
      </div>{" "}
    </DashboardLayout>
  );
}
