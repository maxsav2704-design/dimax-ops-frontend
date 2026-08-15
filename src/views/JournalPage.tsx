"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  FileDown,
  Mail,
  MessageSquare,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Send,
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
import { canRunPrivilegedAdminActions } from "@/lib/admin-access";
import { useI18n, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type ProjectListItem = {
  id: string;
  name: string;
  address: string;
  status: string;
};

type ProjectListResponse = {
  items: ProjectListItem[];
};

type JournalListItem = {
  id: string;
  project_id: string;
  status: string;
  title: string | null;
  signed_at: string | null;
};

type JournalListResponse = {
  items: JournalListItem[];
};

type JournalDetailsResponse = {
  id: string;
  project_id: string;
  status: string;
  title: string | null;
  notes: string | null;
  public_token: string | null;
  public_token_expires_at: string | null;
  lock_header: boolean;
  lock_table: boolean;
  lock_footer: boolean;
  signed_at: string | null;
  signer_name: string | null;
  snapshot_version: number;
  email_delivery_status: string;
  whatsapp_delivery_status: string;
  email_last_sent_at: string | null;
  whatsapp_last_sent_at: string | null;
  whatsapp_delivered_at: string | null;
  email_last_error: string | null;
  whatsapp_last_error: string | null;
};

type JournalCreateResponse = {
  id: string;
};

type JournalMarkReadyResponse = {
  public_token: string;
  public_url: string;
};

type JournalExportPdfResponse = {
  file_path: string;
  size_bytes: number;
};

type SendJournalResponse = {
  ok: boolean;
  enqueued: {
    email: boolean;
    whatsapp: boolean;
  };
  outbox_ids: {
    email: string | null;
    whatsapp: string | null;
  };
  public_url: string | null;
  object_key: string;
};

type OutboxSummaryResponse = {
  total: number;
  by_channel: Record<string, number>;
  by_status: Record<string, number>;
  by_delivery_status: Record<string, number>;
  pending_overdue_15m: number;
  failed_total: number;
};

type OutboxItem = {
  id: string;
  correlation_id: string | null;
  channel: string;
  recipient: string | null;
  subject: string | null;
  template_id: string | null;
  template_code: string | null;
  template_name: string | null;
  message_preview: string | null;
  attachment_name: string | null;
  status: string;
  scheduled_at: string;
  max_attempts: number;
  last_error: string | null;
  provider_message_id: string | null;
  provider_status: string | null;
  provider_error: string | null;
  attempts: number;
  created_at: string;
  sent_at: string | null;
  delivery_status: string;
  delivered_at: string | null;
};

type OutboxListResponse = {
  items: OutboxItem[];
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

type CommunicationTemplatesResponse = {
  items: CommunicationTemplate[];
};

type CommunicationTemplate = {
  id: string;
  code: string;
  name: string;
  subject: string;
  message: string;
  send_email: boolean;
  send_whatsapp: boolean;
  is_active: boolean;
};

type CommunicationTemplateRenderPreviewResponse = {
  subject: string;
  message: string;
  variables: Record<string, string | null>;
};

type FeedbackTone = "success" | "error" | "info";

function pickByLocale(
  locale: Locale,
  en: string,
  ru: string,
  he: string,
): string {
  if (locale === "ru") return ru;
  if (locale === "he") return he;
  return en;
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "Not set";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not set";
  }
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function compactDate(value: string | null): string {
  if (!value) {
    return "Not signed";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not signed";
  }
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function badgeTone(value: string): string {
  const normalized = value.trim().toUpperCase();
  if (["FAILED", "ERROR", "BLOCKED", "CANCELLED"].includes(normalized)) {
    return "border-status-problem-border bg-status-problem-bg text-status-problem-fg";
  }
  if (
    ["READY", "SENT", "DELIVERED", "SIGNED", "ACTIVE", "CONFIGURED"].includes(
      normalized,
    )
  ) {
    return "border-status-ok-border bg-status-ok-bg text-status-ok-fg";
  }
  if (
    ["PENDING", "QUEUED", "PROCESSING", "DRAFT", "WARN"].includes(normalized)
  ) {
    return "border-status-warning-border bg-status-warning-bg text-status-warning-fg";
  }
  return "border-status-progress-border bg-status-progress-bg text-status-progress-fg";
}

function BoolBadge({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-surface-subtle px-3 py-2">
      <span className="text-[12px] text-text-secondary">{label}</span>
      <span
        className={cn(
          "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase",
          value
            ? "border-status-ok-border bg-status-ok-bg text-status-ok-fg"
            : "border-status-blocked-border bg-status-blocked-bg text-status-blocked-fg",
        )}
      >
        {value ? "ON" : "OFF"}
      </span>
    </div>
  );
}
function normalizeTemplateCode(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function SectionMessage({
  title,
  description,
  tone = "info",
}: {
  title: string;
  description: string;
  tone?: FeedbackTone;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3 text-sm",
        tone === "error" &&
          "border-status-problem-border bg-status-problem-bg text-status-problem-fg",
        tone === "success" &&
          "border-status-ok-border bg-status-ok-bg text-status-ok-fg",
        tone === "info" &&
          "border-status-progress-border bg-status-progress-bg text-status-progress-fg",
      )}
    >
      <div className="font-medium">{title}</div>
      <div className="mt-1 text-[12px] opacity-90">{description}</div>
    </div>
  );
}

export default function JournalPage() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const session = useAuthSession();
  const canManage = canRunPrivilegedAdminActions(session);

  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [journals, setJournals] = useState<JournalListItem[]>([]);
  const [selectedJournalId, setSelectedJournalId] = useState<string>("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedJournal, setSelectedJournal] =
    useState<JournalDetailsResponse | null>(null);
  const [outboxSummary, setOutboxSummary] =
    useState<OutboxSummaryResponse | null>(null);
  const [outboxItems, setOutboxItems] = useState<OutboxItem[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationsSettings | null>(
    null,
  );

  const [queueLoading, setQueueLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [pageError, setPageError] = useState<string>("");
  const [detailsError, setDetailsError] = useState<string>("");

  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [createTitle, setCreateTitle] = useState<string>("");

  const [sendEmail, setSendEmail] = useState(true);
  const [sendWhatsapp, setSendWhatsapp] = useState(true);
  const [emailTo, setEmailTo] = useState("");
  const [whatsappTo, setWhatsappTo] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const [savedTemplates, setSavedTemplates] = useState<CommunicationTemplate[]>(
    [],
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [templateName, setTemplateName] = useState("");

  const [refreshTick, setRefreshTick] = useState(0);
  const [feedback, setFeedback] = useState<{
    tone: FeedbackTone;
    message: string;
  } | null>(null);
  const [busyAction, setBusyAction] = useState<string>("");

  useEffect(() => {
    if (savedTemplates.some((template) => template.id === selectedTemplateId)) {
      return;
    }
    setSelectedTemplateId(savedTemplates[0]?.id ?? "");
  }, [savedTemplates, selectedTemplateId]);

  useEffect(() => {
    if (!feedback || feedback.tone === "error") {
      return undefined;
    }
    const timer = window.setTimeout(() => setFeedback(null), 3000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  useEffect(() => {
    let alive = true;

    async function loadQueue() {
      setQueueLoading(true);
      setPageError("");
      try {
        const [
          projectsResponse,
          journalsResponse,
          integrationsResponse,
          templatesResponse,
        ] = await Promise.all([
          apiFetch<ProjectListResponse>("/api/v1/admin/projects?limit=200"),
          apiFetch<JournalListResponse>(
            `/api/v1/admin/journals?limit=100${
              statusFilter !== "ALL"
                ? `&status=${encodeURIComponent(statusFilter)}`
                : ""
            }`,
          ),
          canManage
            ? apiFetch<IntegrationsSettings>("/api/v1/admin/settings/integrations")
            : Promise.resolve<IntegrationsSettings | null>(null),
          canManage
            ? apiFetch<CommunicationTemplatesResponse>(
                "/api/v1/admin/settings/communication-templates",
              )
            : Promise.resolve<CommunicationTemplatesResponse>({ items: [] }),
        ]);

        if (!alive) {
          return;
        }

        setProjects(projectsResponse.items ?? []);
        setJournals(journalsResponse.items ?? []);
        setIntegrations(integrationsResponse);
        setSavedTemplates(templatesResponse.items ?? []);
        setSelectedProjectId(
          (current) => current || projectsResponse.items?.[0]?.id || "",
        );
        setSelectedJournalId((current) => {
          if (
            current &&
            journalsResponse.items.some((item) => item.id === current)
          ) {
            return current;
          }
          return journalsResponse.items?.[0]?.id || "";
        });
      } catch (error) {
        if (!alive) {
          return;
        }
        setPageError(
          readableApiError(
            error,
            locale,
            locale === "ru"
              ? "Не удалось загрузить центр коммуникаций."
              : locale === "he"
                ? "לא ניתן לטעון את מרכז התקשורת."
                : "Failed to load communications center",
          ),
        );
      } finally {
        if (alive) {
          setQueueLoading(false);
        }
      }
    }

    void loadQueue();

    return () => {
      alive = false;
    };
  }, [canManage, refreshTick, statusFilter]);

  useEffect(() => {
    let alive = true;

    async function loadSelectedJournal() {
      if (!selectedJournalId) {
        setSelectedJournal(null);
        setDetailsError("");
        return;
      }

      setDetailsLoading(true);
      setDetailsError("");
      try {
        const journal = await apiFetch<JournalDetailsResponse>(
          `/api/v1/admin/journals/${selectedJournalId}`,
        );
        if (!alive) {
          return;
        }
        setSelectedJournal(journal);
      } catch (error) {
        if (!alive) {
          return;
        }
        setDetailsError(
          readableApiError(
            error,
            locale,
            locale === "ru"
              ? "Не удалось загрузить выбранный журнал."
              : locale === "he"
                ? "לא ניתן לטעון את היומן שנבחר."
                : "Failed to load selected journal",
          ),
        );
        setSelectedJournal(null);
      } finally {
        if (alive) {
          setDetailsLoading(false);
        }
      }
    }

    void loadSelectedJournal();

    return () => {
      alive = false;
    };
  }, [selectedJournalId, refreshTick]);

  useEffect(() => {
    if (!canManage) {
      setOutboxSummary(null);
      setOutboxItems([]);
      setDeliveryLoading(false);
      return undefined;
    }
    let alive = true;

    async function loadDelivery() {
      setDeliveryLoading(true);
      try {
        const journalQuery = selectedJournalId
          ? `?journal_id=${encodeURIComponent(selectedJournalId)}`
          : "";
        const [summaryResponse, outboxResponse] = await Promise.all([
          apiFetch<OutboxSummaryResponse>(
            `/api/v1/admin/outbox/summary${journalQuery}`,
          ),
          apiFetch<OutboxListResponse>(
            `/api/v1/admin/outbox${journalQuery ? `${journalQuery}&limit=12` : "?limit=12"}`,
          ),
        ]);
        if (!alive) {
          return;
        }
        setOutboxSummary(summaryResponse);
        setOutboxItems(outboxResponse.items ?? []);
      } catch (error) {
        if (!alive) {
          return;
        }
        setPageError(
          readableApiError(
            error,
            locale,
            locale === "ru"
              ? "Не удалось загрузить журнал доставок."
              : locale === "he"
                ? "לא ניתן לטעון את יומן המשלוחים."
                : "Failed to load delivery log",
          ),
        );
      } finally {
        if (alive) {
          setDeliveryLoading(false);
        }
      }
    }

    void loadDelivery();

    return () => {
      alive = false;
    };
  }, [canManage, selectedJournalId, refreshTick]);

  const journalsWithProject = useMemo(() => {
    const projectById = new Map(
      projects.map((project) => [project.id, project]),
    );
    return journals.map((journal) => ({
      ...journal,
      project_name:
        projectById.get(journal.project_id)?.name ?? "Unknown project",
      project_address: projectById.get(journal.project_id)?.address ?? "",
    }));
  }, [journals, projects]);

  const filteredJournals = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();
    if (!needle) {
      return journalsWithProject;
    }
    return journalsWithProject.filter((journal) =>
      [
        journal.title,
        journal.project_name,
        journal.project_address,
        journal.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [journalsWithProject, searchTerm]);

  const journalSummary = useMemo(() => {
    const summary = {
      total: journals.length,
      ready: 0,
      draft: 0,
      signed: 0,
    };
    for (const item of journals) {
      const status = item.status.toUpperCase();
      if (status === "READY") {
        summary.ready += 1;
      } else if (status === "SIGNED") {
        summary.signed += 1;
      } else {
        summary.draft += 1;
      }
    }
    return summary;
  }, [journals]);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );

  const selectedTemplate = useMemo(
    () =>
      savedTemplates.find((template) => template.id === selectedTemplateId) ??
      null,
    [savedTemplates, selectedTemplateId],
  );

  const effectiveSendEmail = sendEmail && Boolean(integrations?.email_enabled);
  const effectiveSendWhatsapp =
    sendWhatsapp && Boolean(integrations?.whatsapp_enabled);
  async function handleCreateDraft() {
    if (!canManage || !selectedProjectId) {
      return;
    }
    setBusyAction("create");
    setFeedback(null);
    try {
      const response = await apiFetch<JournalCreateResponse>(
        "/api/v1/admin/journals",
        {
          method: "POST",
          body: JSON.stringify({
            project_id: selectedProjectId,
            title: createTitle.trim() || null,
          }),
        },
      );
      setCreateTitle("");
      setSelectedJournalId(response.id);
      setRefreshTick((value) => value + 1);
      setFeedback({
        tone: "success",
        message: pickByLocale(
          locale,
          `Draft created for ${selectedProject?.name ?? "selected project"}.`,
          `Черновик создан для ${selectedProject?.name ?? "выбранного проекта"}.`,
          `טיוטה נוצרה עבור ${selectedProject?.name ?? "הפרויקט שנבחר"}.`,
        ),
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        message: readableApiError(
          error,
          locale,
          locale === "ru"
            ? "Не удалось создать черновик журнала."
            : locale === "he"
              ? "לא ניתן ליצור טיוטת יומן."
              : "Failed to create journal draft",
        ),
      });
    } finally {
      setBusyAction("");
    }
  }

  async function handleMarkReady() {
    if (!canManage || !selectedJournalId) {
      return;
    }
    setBusyAction("ready");
    setFeedback(null);
    try {
      const response = await apiFetch<JournalMarkReadyResponse>(
        `/api/v1/admin/journals/${selectedJournalId}/mark-ready`,
        { method: "POST" },
      );
      setRefreshTick((value) => value + 1);
      setFeedback({
        tone: "success",
        message: pickByLocale(
          locale,
          `Journal marked ready. Public URL: ${response.public_url}`,
          `Журнал отмечен как готовый. Публичная ссылка: ${response.public_url}`,
          `היומן סומן כמוכן. קישור ציבורי: ${response.public_url}`,
        ),
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        message: readableApiError(
          error,
          locale,
          locale === "ru"
            ? "Не удалось отметить журнал как готовый."
            : locale === "he"
              ? "לא ניתן לסמן את היומן כמוכן."
              : "Failed to mark journal ready",
        ),
      });
    } finally {
      setBusyAction("");
    }
  }

  async function handleExportPdf() {
    if (!canManage || !selectedJournalId) {
      return;
    }
    setBusyAction("export");
    setFeedback(null);
    try {
      const response = await apiFetch<JournalExportPdfResponse>(
        `/api/v1/admin/journals/${selectedJournalId}/export-pdf`,
        { method: "POST" },
      );
      setFeedback({
        tone: "success",
        message: pickByLocale(
          locale,
          `PDF exported: ${response.file_path} (${response.size_bytes} bytes).`,
          `PDF экспортирован: ${response.file_path} (${response.size_bytes} байт).`,
          `ה-PDF יוצא: ${response.file_path} (${response.size_bytes} בתים).`,
        ),
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        message: readableApiError(
          error,
          locale,
          locale === "ru"
            ? "Не удалось экспортировать PDF."
            : locale === "he"
              ? "לא ניתן לייצא PDF."
              : "Failed to export PDF",
        ),
      });
    } finally {
      setBusyAction("");
    }
  }

  async function handleQueueSend() {
    if (!canManage || !selectedJournalId) {
      return;
    }
    if (!effectiveSendEmail && !effectiveSendWhatsapp) {
      setFeedback({
        tone: "error",
        message: pickByLocale(
          locale,
          "Enable at least one active delivery channel before queueing send.",
          "Перед отправкой включите хотя бы один активный канал доставки.",
          "לפני השליחה יש להפעיל לפחות ערוץ משלוח פעיל אחד.",
        ),
      });
      return;
    }
    if (effectiveSendEmail && !emailTo.trim()) {
      setFeedback({
        tone: "error",
        message: pickByLocale(
          locale,
          "Email recipient is required when email delivery is enabled.",
          "Когда включена email-доставка, нужно указать получателя.",
          "כאשר משלוח באימייל פעיל, חייבים לציין נמען.",
        ),
      });
      return;
    }
    if (effectiveSendWhatsapp && !whatsappTo.trim()) {
      setFeedback({
        tone: "error",
        message: pickByLocale(
          locale,
          "WhatsApp recipient is required when WhatsApp delivery is enabled.",
          "Когда включена доставка через WhatsApp, нужно указать получателя.",
          "כאשר משלוח ב-WhatsApp פעיל, חייבים לציין נמען.",
        ),
      });
      return;
    }

    setBusyAction("send");
    setFeedback(null);
    try {
      const response = await apiFetch<SendJournalResponse>(
        `/api/v1/admin/journals/${selectedJournalId}/send`,
        {
          method: "POST",
          body: JSON.stringify({
            template_id: selectedTemplateId || null,
            email_to: emailTo.trim() || null,
            whatsapp_to: whatsappTo.trim() || null,
            subject: subject.trim() || null,
            message: message.trim() || null,
            send_email: effectiveSendEmail,
            send_whatsapp: effectiveSendWhatsapp,
          }),
        },
      );
      setRefreshTick((value) => value + 1);
      const sentChannels = [
        response.enqueued.email ? "email" : null,
        response.enqueued.whatsapp ? "WhatsApp" : null,
      ]
        .filter(Boolean)
        .join(" + ");
      setFeedback({
        tone: "success",
        message: pickByLocale(
          locale,
          `Queued send via ${sentChannels || "selected channels"}. Object key: ${response.object_key}`,
          `Отправка поставлена в очередь через ${sentChannels || "выбранные каналы"}. Object key: ${response.object_key}`,
          `השליחה הוכנסה לתור דרך ${sentChannels || "הערוצים שנבחרו"}. Object key: ${response.object_key}`,
        ),
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        message: readableApiError(
          error,
          locale,
          locale === "ru"
            ? "Не удалось поставить отправку журнала в очередь."
            : locale === "he"
              ? "לא ניתן להכניס את שליחת היומן לתור."
              : "Failed to queue journal send",
        ),
      });
    } finally {
      setBusyAction("");
    }
  }

  async function handleRetryOutbox(outboxId: string) {
    if (!canManage) {
      return;
    }
    setBusyAction(`retry:${outboxId}`);
    setFeedback(null);
    try {
      await apiFetch(`/api/v1/admin/outbox/${outboxId}/retry`, {
        method: "POST",
        body: JSON.stringify({
          reason: "communications_center_manual_retry",
        }),
      });
      setRefreshTick((value) => value + 1);
      setFeedback({
        tone: "success",
        message: pickByLocale(
          locale,
          "Delivery item moved back to queue.",
          "Элемент доставки возвращён в очередь.",
          "פריט המשלוח הוחזר לתור.",
        ),
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        message: readableApiError(
          error,
          locale,
          locale === "ru"
            ? "Не удалось повторно отправить элемент outbox."
            : locale === "he"
              ? "לא ניתן לנסות שוב פריט outbox."
              : "Failed to retry outbox item",
        ),
      });
    } finally {
      setBusyAction("");
    }
  }

  async function applyTemplate() {
    if (!canManage) return;
    if (!selectedTemplate) {
      return;
    }
    setBusyAction("apply-template");
    try {
      const preview =
        await apiFetch<CommunicationTemplateRenderPreviewResponse>(
          "/api/v1/admin/settings/communication-templates/render-preview",
          {
            method: "POST",
            body: JSON.stringify({
              template_id: selectedTemplate.id,
              journal_id: selectedJournalId || null,
            }),
          },
        );
      setSubject(preview.subject);
      setMessage(preview.message);
      setSendEmail(selectedTemplate.send_email);
      setSendWhatsapp(selectedTemplate.send_whatsapp);
      setFeedback({
        tone: "info",
        message: pickByLocale(
          locale,
          `Template applied: ${selectedTemplate.name}`,
          `Шаблон применён: ${selectedTemplate.name}`,
          `התבנית הוחלה: ${selectedTemplate.name}`,
        ),
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        message: readableApiError(
          error,
          locale,
          locale === "ru"
            ? "Не удалось построить предпросмотр шаблона."
            : locale === "he"
              ? "לא ניתן ליצור תצוגה מקדימה לתבנית."
              : "Failed to render template preview",
        ),
      });
    } finally {
      setBusyAction("");
    }
  }

  async function saveTemplate() {
    if (!canManage) return;
    const normalizedName = templateName.trim();
    if (!normalizedName) {
      setFeedback({
        tone: "error",
        message: pickByLocale(
          locale,
          "Template name is required.",
          "Нужно указать имя шаблона.",
          "יש לציין שם לתבנית.",
        ),
      });
      return;
    }
    setBusyAction("save-template");
    try {
      const nextCode = normalizeTemplateCode(normalizedName);
      const existing = savedTemplates.find((item) => item.code === nextCode);
      const nextTemplate = existing
        ? await apiFetch<CommunicationTemplate>(
            `/api/v1/admin/settings/communication-templates/${existing.id}`,
            {
              method: "PATCH",
              body: JSON.stringify({
                name: normalizedName,
                subject: subject.trim(),
                message: message.trim(),
                send_email: sendEmail,
                send_whatsapp: sendWhatsapp,
                is_active: true,
              }),
            },
          )
        : await apiFetch<CommunicationTemplate>(
            "/api/v1/admin/settings/communication-templates",
            {
              method: "POST",
              body: JSON.stringify({
                name: normalizedName,
                subject: subject.trim(),
                message: message.trim(),
                send_email: sendEmail,
                send_whatsapp: sendWhatsapp,
                is_active: true,
              }),
            },
          );

      setSavedTemplates((current) => {
        const withoutSameId = current.filter(
          (item) => item.id !== nextTemplate.id,
        );
        return [nextTemplate, ...withoutSameId].sort((a, b) =>
          a.name.localeCompare(b.name),
        );
      });
      setSelectedTemplateId(nextTemplate.id);
      setTemplateName("");
      setFeedback({
        tone: "success",
        message: pickByLocale(
          locale,
          `Template saved: ${nextTemplate.name}`,
          `Шаблон сохранён: ${nextTemplate.name}`,
          `התבנית נשמרה: ${nextTemplate.name}`,
        ),
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        message: readableApiError(
          error,
          locale,
          locale === "ru"
            ? "Не удалось сохранить шаблон."
            : locale === "he"
              ? "לא ניתן לשמור את התבנית."
              : "Failed to save template",
        ),
      });
    } finally {
      setBusyAction("");
    }
  }

  async function deleteTemplate() {
    if (!canManage) return;
    if (!selectedTemplateId) {
      return;
    }
    setBusyAction("delete-template");
    try {
      await apiFetch(
        `/api/v1/admin/settings/communication-templates/${selectedTemplateId}`,
        {
          method: "DELETE",
        },
      );
      setSavedTemplates((current) => {
        const next = current.filter((item) => item.id !== selectedTemplateId);
        setSelectedTemplateId(next[0]?.id ?? "");
        return next;
      });
      setFeedback({
        tone: "info",
        message: pickByLocale(
          locale,
          "Template removed from shared presets.",
          "Шаблон удалён из общих пресетов.",
          "התבנית הוסרה מההגדרות המשותפות.",
        ),
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        message: readableApiError(
          error,
          locale,
          locale === "ru"
            ? "Не удалось удалить шаблон."
            : locale === "he"
              ? "לא ניתן למחוק את התבנית."
              : "Failed to delete template",
        ),
      });
    } finally {
      setBusyAction("");
    }
  }

  return (
    <DashboardLayout>
      <div className="page-shell page-stack-tight motion-stagger">
        <DimaxPageHeader
          eyebrow={t("journal.eyebrow")}
          title={t("journal.title")}
          badge={`${t("journal.journals")} ${journalSummary.total}`}
          subtitle={t("journal.subtitle")}
          actions={
            <>
              <button
                type="button"
                onClick={() => setRefreshTick((value) => value + 1)}
                className="dmx-secondary-action h-9"
              >
                <RefreshCw className="h-4 w-4" strokeWidth={1.8} />
                {t("common.refresh")}
              </button>
              <button
                type="button"
                onClick={() =>
                  selectedJournalId &&
                  router.push(`/journal/${selectedJournalId}`)
                }
                disabled={!selectedJournalId}
                className="dmx-secondary-action h-9 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t("journal.openJournalForm")}
              </button>
            </>
          }
        />

        <div className="grid gap-3 md:grid-cols-4">
          <DimaxKpiCard
            label={t("journal.journals")}
            value={journalSummary.total}
            hint={t("journal.commsRecovery")}
            barColor="blue"
          />
          <DimaxKpiCard
            label={t("journal.ready")}
            value={journalSummary.ready}
            hint={t("journal.openJournalForm")}
            barColor="green"
          />
          <DimaxKpiCard
            label={t("journal.draft")}
            value={journalSummary.draft}
            hint={t("journal.createDraft")}
            barColor="yellow"
          />
          <DimaxKpiCard
            label={t("journal.failedOutbox")}
            value={outboxSummary?.failed_total ?? 0}
            hint={t("journal.retry")}
            barColor="red"
            emphasis={
              (outboxSummary?.failed_total ?? 0) > 0 ? "problem" : "default"
            }
          />
        </div>

        {!canManage ? (
          <div>
            <SectionMessage
              title={t("journal.readOnlyRole")}
              description={t("journal.readOnlyDescription")}
              tone="info"
            />
          </div>
        ) : null}

        {feedback ? (
          <div>
            <SectionMessage
              title={
                feedback.tone === "error"
                  ? t("journal.actionFailed")
                  : t("journal.actionUpdate")
              }
              description={feedback.message}
              tone={feedback.tone}
            />
          </div>
        ) : null}

        {pageError ? (
          <div>
            <SectionMessage
              title={t("journal.loadError")}
              description={pageError}
              tone="error"
            />
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="xl:col-span-4">
            <WidgetCard
              title={t("journal.journalQueue")}
              headerMeta={t("journal.queueDescription")}
              actionSlot={
                <Clock3
                  className="h-4 w-4 text-text-secondary"
                  strokeWidth={1.8}
                />
              }
            >
              <div className="surface-subtle space-y-3 p-4">
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-text">
                    {t("journal.project")}
                  </label>
                  <select
                    aria-label={t("journal.createDraftProject")}
                    value={selectedProjectId}
                    onChange={(event) =>
                      setSelectedProjectId(event.target.value)
                    }
                    className="control-input"
                  >
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-text">
                    {t("journal.draftTitle")}
                  </label>
                  <input
                    aria-label={t("journal.draftTitle")}
                    value={createTitle}
                    onChange={(event) => setCreateTitle(event.target.value)}
                    placeholder={t("journal.finalDeliveryPackage")}
                    className="control-input"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleCreateDraft}
                  disabled={
                    !canManage || !selectedProjectId || busyAction === "create"
                  }
                  title={
                    !canManage ? t("journal.adminRoleRequired") : undefined
                  }
                  className="dmx-primary-action h-10 w-full disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" strokeWidth={1.8} />
                  {t("journal.createDraft")}
                </button>
              </div>

              <div className="mt-4 flex gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
                  <input
                    aria-label={t("journal.searchJournals")}
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder={t("journal.searchPlaceholder")}
                    className="control-input ps-9"
                  />
                </div>
                <select
                  aria-label={t("journal.statusFilter")}
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="control-input"
                >
                  <option value="ALL">{t("journal.all")}</option>
                  <option value="DRAFT">{t("journal.draft")}</option>
                  <option value="READY">{t("journal.ready")}</option>
                  <option value="SIGNED">{t("journal.signed")}</option>
                </select>
              </div>

              <div className="mt-4 space-y-3">
                {queueLoading ? (
                  <SectionMessage
                    title={t("journal.loadingQueue")}
                    description={t("journal.loadingQueueDescription")}
                  />
                ) : filteredJournals.length === 0 ? (
                  <SectionMessage
                    title={t("journal.noJournalsFound")}
                    description={t("journal.noJournalsDescription")}
                  />
                ) : (
                  filteredJournals.map((journal) => {
                    const isSelected = journal.id === selectedJournalId;
                    return (
                      <button
                        key={journal.id}
                        type="button"
                        onClick={() => setSelectedJournalId(journal.id)}
                        className={cn(
                          "w-full rounded-lg border px-4 py-3 text-start transition-colors",
                          isSelected
                            ? "border-[var(--dmx-accent)] bg-[var(--dmx-accent-tint)]"
                            : "border-border bg-surface-subtle hover:border-border-strong hover:bg-surface",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-text">
                              {journal.title || t("journal.untitledJournal")}
                            </div>
                            <div className="mt-1 text-[12px] text-text-secondary">
                              {journal.project_name}
                            </div>
                            <div className="mt-1 text-[11px] text-text-secondary/90">
                              {journal.project_address ||
                                t("journal.addressNotSet")}
                            </div>
                          </div>
                          <span
                            className={cn(
                              "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase",
                              badgeTone(journal.status),
                            )}
                          >
                            {journal.status}
                          </span>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-[11px] text-text-secondary">
                          <span>
                            {t("journal.signed")}:{" "}
                            {compactDate(journal.signed_at)}
                          </span>
                          <span>{journal.id.slice(0, 8)}</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </WidgetCard>
          </div>

          <div className="xl:col-span-5">
            <WidgetCard
              title={t("journal.sendWorkspace")}
              headerMeta={t("journal.sendWorkspaceDescription")}
              actionSlot={
                <Send
                  className="h-4 w-4 text-text-secondary"
                  strokeWidth={1.8}
                />
              }
            >
              {!selectedJournalId ? (
                <SectionMessage
                  title={t("journal.noJournalSelected")}
                  description={t("journal.noJournalSelectedDescription")}
                />
              ) : detailsError ? (
                <SectionMessage
                  title={t("journal.journalLoadFailed")}
                  description={detailsError}
                  tone="error"
                />
              ) : detailsLoading ? (
                <SectionMessage
                  title={t("journal.loadingJournal")}
                  description={t("journal.loadingJournalDescription")}
                />
              ) : selectedJournal ? (
                <div className="space-y-5">
                  <div className="surface-subtle p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-text">
                            {selectedJournal.title ||
                              t("journal.untitledJournal")}
                          </h3>
                          <span
                            className={cn(
                              "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase",
                              badgeTone(selectedJournal.status),
                            )}
                          >
                            {selectedJournal.status}
                          </span>
                        </div>
                        <div className="mt-1 text-[12px] text-text-secondary">
                          {t("journal.snapshotVersion")} v
                          {selectedJournal.snapshot_version} •{" "}
                          {t("journal.signed")}:{" "}
                          {compactDate(selectedJournal.signed_at)}
                        </div>
                        {selectedJournal.signer_name ? (
                          <div className="mt-1 text-[12px] text-text-secondary">
                            {t("journal.signer")}: {selectedJournal.signer_name}
                          </div>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={handleMarkReady}
                          disabled={!canManage || busyAction === "ready"}
                          title={
                            !canManage
                              ? t("journal.adminRoleRequired")
                              : undefined
                          }
                          className="dmx-secondary-action h-9 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <CheckCircle2 className="h-4 w-4" strokeWidth={1.8} />
                          {t("journal.markReady")}
                        </button>
                        <button
                          type="button"
                          onClick={handleExportPdf}
                          disabled={!canManage || busyAction === "export"}
                          title={
                            !canManage
                              ? t("journal.adminRoleRequired")
                              : undefined
                          }
                          className="dmx-secondary-action h-9 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <FileDown className="h-4 w-4" strokeWidth={1.8} />
                          {t("journal.exportPdf")}
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <BoolBadge
                        label={t("journal.headerLocked")}
                        value={selectedJournal.lock_header}
                      />
                      <BoolBadge
                        label={t("journal.tableLocked")}
                        value={selectedJournal.lock_table}
                      />
                      <BoolBadge
                        label={t("journal.footerLocked")}
                        value={selectedJournal.lock_footer}
                      />
                      <BoolBadge
                        label={t("journal.publicTokenActive")}
                        value={Boolean(selectedJournal.public_token)}
                      />
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="rounded-lg border border-border bg-surface-subtle p-3">
                        <div className="text-[11px] uppercase text-text-secondary">
                          {t("journal.emailDelivery")}
                        </div>
                        <div
                          className={cn(
                            "mt-2 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase",
                            badgeTone(selectedJournal.email_delivery_status),
                          )}
                        >
                          {selectedJournal.email_delivery_status}
                        </div>
                        <div className="mt-2 text-[12px] text-text-secondary">
                          {t("journal.lastSent")}:{" "}
                          {formatDateTime(selectedJournal.email_last_sent_at)}
                        </div>
                        {selectedJournal.email_last_error ? (
                          <div className="mt-2 text-[12px] text-status-problem-fg">
                            {selectedJournal.email_last_error}
                          </div>
                        ) : null}
                      </div>
                      <div className="rounded-lg border border-border bg-surface-subtle p-3">
                        <div className="text-[11px] uppercase text-text-secondary">
                          {t("journal.whatsappDelivery")}
                        </div>
                        <div
                          className={cn(
                            "mt-2 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase",
                            badgeTone(selectedJournal.whatsapp_delivery_status),
                          )}
                        >
                          {selectedJournal.whatsapp_delivery_status}
                        </div>
                        <div className="mt-2 text-[12px] text-text-secondary">
                          {t("journal.lastSent")}:{" "}
                          {formatDateTime(
                            selectedJournal.whatsapp_last_sent_at,
                          )}
                        </div>
                        <div className="mt-1 text-[12px] text-text-secondary">
                          {t("journal.delivered")}:{" "}
                          {formatDateTime(
                            selectedJournal.whatsapp_delivered_at,
                          )}
                        </div>
                        {selectedJournal.whatsapp_last_error ? (
                          <div className="mt-2 text-[12px] text-status-problem-fg">
                            {selectedJournal.whatsapp_last_error}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="surface-subtle p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-text">
                          {t("journal.templates")}
                        </h3>
                        <p className="mt-1 text-[12px] text-text-secondary">
                          {t("journal.templatesDescription")}
                        </p>
                      </div>
                      <Save
                        className="h-4 w-4 text-text-secondary"
                        strokeWidth={1.8}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_1fr]">
                      <select
                        aria-label={t("journal.communicationTemplate")}
                        value={selectedTemplateId}
                        onChange={(event) =>
                          setSelectedTemplateId(event.target.value)
                        }
                        className="control-input"
                      >
                        {savedTemplates.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.name}
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={applyTemplate}
                          disabled={!canManage}
                          className="dmx-secondary-action h-10 flex-1"
                        >
                          {t("journal.apply")}
                        </button>
                        <button
                          type="button"
                          onClick={deleteTemplate}
                          disabled={!canManage}
                          className="dmx-secondary-action h-10"
                        >
                          {t("journal.delete")}
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <input
                        aria-label={t("journal.templateName")}
                        value={templateName}
                        disabled={!canManage}
                        onChange={(event) =>
                          setTemplateName(event.target.value)
                        }
                        placeholder={t("journal.templatePlaceholder")}
                        className="control-input flex-1"
                      />
                      <button
                        type="button"
                        onClick={saveTemplate}
                        disabled={!canManage}
                        className="dmx-secondary-action h-10"
                      >
                        <Save className="h-4 w-4" strokeWidth={1.8} />
                        {t("journal.save")}
                      </button>
                    </div>
                  </div>
                  <div className="surface-subtle p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-text">
                          {t("journal.deliveryChannels")}
                        </h3>
                        <p className="mt-1 text-[12px] text-text-secondary">
                          {t("journal.deliveryChannelsDescription")}
                        </p>
                      </div>
                      <Mail
                        className="h-4 w-4 text-text-secondary"
                        strokeWidth={1.8}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <label className="flex items-start gap-3 rounded-lg border border-border bg-surface-subtle p-3">
                        <input
                          aria-label="Send email"
                          type="checkbox"
                          checked={sendEmail}
                          onChange={(event) =>
                            setSendEmail(event.target.checked)
                          }
                          disabled={!canManage || !integrations?.email_enabled}
                          className="mt-1"
                        />
                        <div>
                          <div className="text-sm font-medium text-text">
                            {t("journal.email")}
                          </div>
                          <div className="mt-1 text-[12px] text-text-secondary">
                            {t("journal.smtpConfigured")}:{" "}
                            {integrations?.smtp_configured
                              ? t("journal.yes")
                              : t("journal.no")}
                          </div>
                        </div>
                      </label>
                      <label className="flex items-start gap-3 rounded-lg border border-border bg-surface-subtle p-3">
                        <input
                          aria-label="Send WhatsApp"
                          type="checkbox"
                          checked={sendWhatsapp}
                          onChange={(event) =>
                            setSendWhatsapp(event.target.checked)
                          }
                          disabled={!canManage || !integrations?.whatsapp_enabled}
                          className="mt-1"
                        />
                        <div>
                          <div className="text-sm font-medium text-text">
                            {t("journal.whatsapp")}
                          </div>
                          <div className="mt-1 text-[12px] text-text-secondary">
                            {t("journal.twilioConfigured")}:{" "}
                            {integrations?.twilio_configured
                              ? t("journal.yes")
                              : t("journal.no")}
                          </div>
                        </div>
                      </label>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-[12px] font-medium text-text">
                          {t("journal.emailRecipient")}
                        </label>
                        <input
                          aria-label="Email recipient"
                          value={emailTo}
                          disabled={!canManage}
                          onChange={(event) => setEmailTo(event.target.value)}
                          placeholder="client@example.com"
                          className="control-input"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[12px] font-medium text-text">
                          {t("journal.whatsappRecipient")}
                        </label>
                        <input
                          aria-label="WhatsApp recipient"
                          value={whatsappTo}
                          disabled={!canManage}
                          onChange={(event) =>
                            setWhatsappTo(event.target.value)
                          }
                          placeholder="+9725xxxxxxx"
                          className="control-input"
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="mb-1 block text-[12px] font-medium text-text">
                        {t("journal.subject")}
                      </label>
                      <input
                        aria-label="Journal subject"
                        value={subject}
                        disabled={!canManage}
                        onChange={(event) => setSubject(event.target.value)}
                        placeholder={t("journal.projectHandoverPackage")}
                        className="control-input"
                      />
                    </div>

                    <div className="mt-4">
                      <label className="mb-1 block text-[12px] font-medium text-text">
                        {t("journal.message")}
                      </label>
                      <textarea
                        aria-label="Journal message"
                        value={message}
                        disabled={!canManage}
                        onChange={(event) => setMessage(event.target.value)}
                        placeholder={t("journal.messagePlaceholder")}
                        rows={6}
                        className="control-textarea"
                      />
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleQueueSend}
                        disabled={!canManage || busyAction === "send"}
                        title={
                          !canManage
                            ? t("journal.adminRoleRequired")
                            : undefined
                        }
                        className="dmx-primary-action h-10 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Send className="h-4 w-4" strokeWidth={1.8} />
                        {t("journal.queueSend")}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          selectedJournalId &&
                          router.push(`/journal/${selectedJournalId}`)
                        }
                        className="dmx-secondary-action h-10"
                      >
                        {t("journal.editJournalForm")}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <SectionMessage
                  title={t("journal.journalNotAvailable")}
                  description={t("journal.journalNotAvailableDescription")}
                />
              )}
            </WidgetCard>
          </div>

          <div className="xl:col-span-3">
            <WidgetCard
              title={t("journal.deliveryLog")}
              headerMeta={t("journal.deliveryLogDescription")}
              actionSlot={
                <MessageSquare
                  className="h-4 w-4 text-text-secondary"
                  strokeWidth={1.8}
                />
              }
            >
              {deliveryLoading ? (
                <SectionMessage
                  title={t("journal.loadingOutbox")}
                  description={t("journal.loadingOutboxDescription")}
                />
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="surface-subtle p-3">
                      <div className="text-[11px] uppercase text-text-secondary">
                        {t("journal.channelMix")}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-[12px] text-text">
                        <span>
                          {t("journal.email")}:{" "}
                          {outboxSummary?.by_channel?.EMAIL ?? 0}
                        </span>
                        <span>
                          {t("journal.whatsapp")}:{" "}
                          {outboxSummary?.by_channel?.WHATSAPP ?? 0}
                        </span>
                      </div>
                    </div>
                    <div className="surface-subtle p-3">
                      <div className="text-[11px] uppercase text-text-secondary">
                        {t("journal.deliveryStatus")}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-[12px] text-text">
                        <span>
                          {t("journal.delivered")}:{" "}
                          {outboxSummary?.by_delivery_status?.DELIVERED ?? 0}
                        </span>
                        <span>
                          PENDING:{" "}
                          {outboxSummary?.by_delivery_status?.PENDING ?? 0}
                        </span>
                        <span>
                          {t("journal.failed")}:{" "}
                          {outboxSummary?.by_delivery_status?.FAILED ?? 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {outboxItems.length === 0 ? (
                      <SectionMessage
                        title={t("journal.noDeliveryItems")}
                        description={t("journal.noDeliveryItemsDescription")}
                      />
                    ) : (
                      outboxItems.map((item) => (
                        <div key={item.id} className="surface-subtle p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-semibold text-text">
                                  {item.channel}
                                </span>
                                <span
                                  className={cn(
                                    "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase",
                                    badgeTone(item.status),
                                  )}
                                >
                                  {item.status}
                                </span>
                              </div>
                              <div className="mt-1 text-[12px] text-text-secondary">
                                {item.recipient ||
                                  t("journal.recipientMissing")}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRetryOutbox(item.id)}
                              disabled={
                                !canManage || busyAction === `retry:${item.id}`
                              }
                              title={
                                !canManage
                                  ? t("journal.adminRoleRequired")
                                  : undefined
                              }
                              className="dmx-secondary-action h-9 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <RotateCcw
                                className="h-4 w-4"
                                strokeWidth={1.8}
                              />
                              {t("journal.retry")}
                            </button>
                          </div>
                          {item.subject ? (
                            <div className="mt-2 text-[12px] font-medium text-text">
                              {item.subject}
                            </div>
                          ) : null}
                          {item.template_name ? (
                            <div className="mt-1 text-[11px] uppercase text-link">
                              {t("journal.template")}: {item.template_name}
                            </div>
                          ) : null}
                          {item.message_preview ? (
                            <div className="mt-2 text-[12px] text-text-secondary">
                              {item.message_preview}
                            </div>
                          ) : null}
                          <div className="mt-3 space-y-1 text-[11px] text-text-secondary">
                            <div>
                              {t("journal.scheduled")}:{" "}
                              {formatDateTime(item.scheduled_at)}
                            </div>
                            <div>
                              {t("journal.attempts")}: {item.attempts}/
                              {item.max_attempts}
                            </div>
                            <div>
                              {t("journal.delivery")}: {item.delivery_status}
                            </div>
                            {item.attachment_name ? (
                              <div>
                                {t("journal.attachment")}:{" "}
                                {item.attachment_name}
                              </div>
                            ) : null}
                            {item.last_error ? (
                              <div className="text-status-problem-fg">
                                {t("journal.error")}: {item.last_error}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}

              <div className="surface-subtle mt-5 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <AlertCircle
                    className="h-4 w-4 text-text-secondary"
                    strokeWidth={1.8}
                  />
                  <h3 className="text-sm font-semibold text-text">
                    {t("journal.integrationSnapshot")}
                  </h3>
                </div>
                {integrations ? (
                  <div className="space-y-2">
                    <BoolBadge
                      label={t("journal.emailEnabled")}
                      value={integrations.email_enabled}
                    />
                    <BoolBadge
                      label={t("journal.whatsappEnabled")}
                      value={integrations.whatsapp_enabled}
                    />
                    <BoolBadge
                      label={t("journal.storageConfigured")}
                      value={integrations.storage_configured}
                    />
                    <BoolBadge
                      label={t("journal.whatsappFallbackToEmail")}
                      value={integrations.whatsapp_fallback_to_email}
                    />
                    <BoolBadge
                      label={t("journal.wazeNavigationEnabled")}
                      value={integrations.waze_navigation_enabled}
                    />
                    <div className="rounded-lg border border-border bg-surface p-3 text-[12px] text-text-secondary">
                      <div>
                        {t("journal.publicBaseUrl")}:{" "}
                        {integrations.public_base_url}
                      </div>
                      <div className="mt-1">
                        {t("journal.tokenTtl")}:{" "}
                        {integrations.journal_public_token_ttl_sec}s
                      </div>
                    </div>
                  </div>
                ) : (
                  <SectionMessage
                    title={t("journal.integrationUnavailable")}
                    description={t("journal.integrationUnavailableDescription")}
                  />
                )}
              </div>
            </WidgetCard>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
