
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
import { useUserRole } from "@/hooks/use-user-role";
import { apiFetch } from "@/lib/api";
import { canRunPrivilegedAdminActions } from "@/lib/admin-access";
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
    return "bg-destructive/10 text-destructive border-destructive/20";
  }
  if (["READY", "SENT", "DELIVERED", "SIGNED", "ACTIVE", "CONFIGURED"].includes(normalized)) {
    return "bg-emerald-500/10 text-emerald-300 border-emerald-500/20";
  }
  if (["PENDING", "QUEUED", "PROCESSING", "DRAFT", "WARN"].includes(normalized)) {
    return "bg-amber-500/10 text-amber-300 border-amber-500/20";
  }
  return "bg-accent/10 text-accent border-accent/20";
}

function BoolBadge({
  label,
  value,
}: {
  label: string;
  value: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border/70 bg-background/40 px-3 py-2">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <span
        className={cn(
          "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]",
          value
            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
            : "border-border bg-card text-muted-foreground"
        )}
      >
        {value ? "ON" : "OFF"}
      </span>
    </div>
  );
}
function normalizeTemplateCode(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
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
        "rounded-xl border px-4 py-3 text-sm",
        tone === "error" && "border-destructive/20 bg-destructive/10 text-destructive",
        tone === "success" && "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
        tone === "info" && "border-border/70 bg-background/40 text-muted-foreground"
      )}
    >
      <div className="font-medium">{title}</div>
      <div className="mt-1 text-[12px] opacity-90">{description}</div>
    </div>
  );
}

export default function JournalPage() {
  const router = useRouter();
  const role = useUserRole();
  const canManage = canRunPrivilegedAdminActions(role);

  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [journals, setJournals] = useState<JournalListItem[]>([]);
  const [selectedJournalId, setSelectedJournalId] = useState<string>("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedJournal, setSelectedJournal] = useState<JournalDetailsResponse | null>(null);
  const [outboxSummary, setOutboxSummary] = useState<OutboxSummaryResponse | null>(null);
  const [outboxItems, setOutboxItems] = useState<OutboxItem[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationsSettings | null>(null);

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

  const [savedTemplates, setSavedTemplates] = useState<CommunicationTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [templateName, setTemplateName] = useState("");

  const [refreshTick, setRefreshTick] = useState(0);
  const [feedback, setFeedback] = useState<{ tone: FeedbackTone; message: string } | null>(null);
  const [busyAction, setBusyAction] = useState<string>("");

  useEffect(() => {
    if (savedTemplates.some((template) => template.id === selectedTemplateId)) {
      return;
    }
    setSelectedTemplateId(savedTemplates[0]?.id ?? "");
  }, [savedTemplates, selectedTemplateId]);

  useEffect(() => {
    let alive = true;

    async function loadQueue() {
      setQueueLoading(true);
      setPageError("");
      try {
        const [projectsResponse, journalsResponse, integrationsResponse, templatesResponse] = await Promise.all([
          apiFetch<ProjectListResponse>("/api/v1/admin/projects?limit=200"),
          apiFetch<JournalListResponse>(
            `/api/v1/admin/journals?limit=100${
              statusFilter !== "ALL" ? `&status=${encodeURIComponent(statusFilter)}` : ""
            }`
          ),
          apiFetch<IntegrationsSettings>("/api/v1/admin/settings/integrations"),
          apiFetch<CommunicationTemplatesResponse>("/api/v1/admin/settings/communication-templates"),
        ]);

        if (!alive) {
          return;
        }

        setProjects(projectsResponse.items ?? []);
        setJournals(journalsResponse.items ?? []);
        setIntegrations(integrationsResponse);
        setSavedTemplates(templatesResponse.items ?? []);
        setSelectedProjectId((current) => current || projectsResponse.items?.[0]?.id || "");
        setSelectedJournalId((current) => {
          if (current && journalsResponse.items.some((item) => item.id === current)) {
            return current;
          }
          return journalsResponse.items?.[0]?.id || "";
        });
      } catch (error) {
        if (!alive) {
          return;
        }
        setPageError(error instanceof Error ? error.message : "Failed to load communications center");
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
  }, [refreshTick, statusFilter]);

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
        const journal = await apiFetch<JournalDetailsResponse>(`/api/v1/admin/journals/${selectedJournalId}`);
        if (!alive) {
          return;
        }
        setSelectedJournal(journal);
      } catch (error) {
        if (!alive) {
          return;
        }
        setDetailsError(error instanceof Error ? error.message : "Failed to load selected journal");
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
    let alive = true;

    async function loadDelivery() {
      setDeliveryLoading(true);
      try {
        const journalQuery = selectedJournalId
          ? `?journal_id=${encodeURIComponent(selectedJournalId)}`
          : "";
        const [summaryResponse, outboxResponse] = await Promise.all([
          apiFetch<OutboxSummaryResponse>(`/api/v1/admin/outbox/summary${journalQuery}`),
          apiFetch<OutboxListResponse>(
            `/api/v1/admin/outbox${journalQuery ? `${journalQuery}&limit=12` : "?limit=12"}`
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
        setPageError(error instanceof Error ? error.message : "Failed to load delivery log");
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
  }, [selectedJournalId, refreshTick]);

  const journalsWithProject = useMemo(() => {
    const projectById = new Map(projects.map((project) => [project.id, project]));
    return journals.map((journal) => ({
      ...journal,
      project_name: projectById.get(journal.project_id)?.name ?? "Unknown project",
      project_address: projectById.get(journal.project_id)?.address ?? "",
    }));
  }, [journals, projects]);

  const filteredJournals = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();
    if (!needle) {
      return journalsWithProject;
    }
    return journalsWithProject.filter((journal) =>
      [journal.title, journal.project_name, journal.project_address, journal.status]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle)
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
    [projects, selectedProjectId]
  );

  const selectedTemplate = useMemo(
    () => savedTemplates.find((template) => template.id === selectedTemplateId) ?? null,
    [savedTemplates, selectedTemplateId]
  );

  const effectiveSendEmail = sendEmail && Boolean(integrations?.email_enabled);
  const effectiveSendWhatsapp = sendWhatsapp && Boolean(integrations?.whatsapp_enabled);
  async function handleCreateDraft() {
    if (!canManage || !selectedProjectId) {
      return;
    }
    setBusyAction("create");
    setFeedback(null);
    try {
      const response = await apiFetch<JournalCreateResponse>("/api/v1/admin/journals", {
        method: "POST",
        body: JSON.stringify({
          project_id: selectedProjectId,
          title: createTitle.trim() || null,
        }),
      });
      setCreateTitle("");
      setSelectedJournalId(response.id);
      setRefreshTick((value) => value + 1);
      setFeedback({
        tone: "success",
        message: `Draft created for ${selectedProject?.name ?? "selected project"}.`,
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "Failed to create journal draft",
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
        { method: "POST" }
      );
      setRefreshTick((value) => value + 1);
      setFeedback({
        tone: "success",
        message: `Journal marked ready. Public URL: ${response.public_url}`,
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "Failed to mark journal ready",
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
        { method: "POST" }
      );
      setFeedback({
        tone: "success",
        message: `PDF exported: ${response.file_path} (${response.size_bytes} bytes).`,
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "Failed to export PDF",
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
        message: "Enable at least one active delivery channel before queueing send.",
      });
      return;
    }
    if (effectiveSendEmail && !emailTo.trim()) {
      setFeedback({
        tone: "error",
        message: "Email recipient is required when email delivery is enabled.",
      });
      return;
    }
    if (effectiveSendWhatsapp && !whatsappTo.trim()) {
      setFeedback({
        tone: "error",
        message: "WhatsApp recipient is required when WhatsApp delivery is enabled.",
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
        }
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
        message: `Queued send via ${sentChannels || "selected channels"}. Object key: ${response.object_key}`,
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "Failed to queue journal send",
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
        message: "Delivery item moved back to queue.",
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "Failed to retry outbox item",
      });
    } finally {
      setBusyAction("");
    }
  }

  async function applyTemplate() {
    if (!selectedTemplate) {
      return;
    }
    setBusyAction("apply-template");
    try {
      const preview = await apiFetch<CommunicationTemplateRenderPreviewResponse>(
        "/api/v1/admin/settings/communication-templates/render-preview",
        {
          method: "POST",
          body: JSON.stringify({
            template_id: selectedTemplate.id,
            journal_id: selectedJournalId || null,
          }),
        }
      );
      setSubject(preview.subject);
      setMessage(preview.message);
      setSendEmail(selectedTemplate.send_email);
      setSendWhatsapp(selectedTemplate.send_whatsapp);
      setFeedback({
        tone: "info",
        message: `Template applied: ${selectedTemplate.name}`,
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "Failed to render template preview",
      });
    } finally {
      setBusyAction("");
    }
  }

  async function saveTemplate() {
    const normalizedName = templateName.trim();
    if (!normalizedName) {
      setFeedback({
        tone: "error",
        message: "Template name is required.",
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
            }
          )
        : await apiFetch<CommunicationTemplate>("/api/v1/admin/settings/communication-templates", {
            method: "POST",
            body: JSON.stringify({
              name: normalizedName,
              subject: subject.trim(),
              message: message.trim(),
              send_email: sendEmail,
              send_whatsapp: sendWhatsapp,
              is_active: true,
            }),
          });

      setSavedTemplates((current) => {
        const withoutSameId = current.filter((item) => item.id !== nextTemplate.id);
        return [nextTemplate, ...withoutSameId].sort((a, b) => a.name.localeCompare(b.name));
      });
      setSelectedTemplateId(nextTemplate.id);
      setTemplateName("");
      setFeedback({
        tone: "success",
        message: `Template saved: ${nextTemplate.name}`,
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "Failed to save template",
      });
    } finally {
      setBusyAction("");
    }
  }

  async function deleteTemplate() {
    if (!selectedTemplateId) {
      return;
    }
    setBusyAction("delete-template");
    try {
      await apiFetch(`/api/v1/admin/settings/communication-templates/${selectedTemplateId}`, {
        method: "DELETE",
      });
      setSavedTemplates((current) => {
        const next = current.filter((item) => item.id !== selectedTemplateId);
        setSelectedTemplateId(next[0]?.id ?? "");
        return next;
      });
      setFeedback({
        tone: "info",
        message: "Template removed from shared presets.",
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : "Failed to delete template",
      });
    } finally {
      setBusyAction("");
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="glass-card card-lift rounded-xl p-5 animate-fade-in">
          <div className="flex flex-col gap-4 border-b border-border/70 pb-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/[0.06] px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-accent/80">
                Communications Center
              </div>
              <h1 className="mt-3 text-2xl font-semibold text-card-foreground">
                Journal queue, delivery channels and resend control
              </h1>
              <p className="mt-1 max-w-3xl text-[13px] text-muted-foreground">
                Control customer communication from one place: create journal drafts, mark them
                ready, queue email and WhatsApp delivery, and recover failed sends from outbox.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setRefreshTick((value) => value + 1)}
                className="btn-premium rounded-lg border border-border px-3 py-2 text-[12px] font-medium text-muted-foreground hover:text-accent"
              >
                <RefreshCw className="mr-1 inline h-4 w-4" strokeWidth={1.8} />
                Refresh
              </button>
              <button
                onClick={() => selectedJournalId && router.push(`/journal/${selectedJournalId}`)}
                disabled={!selectedJournalId}
                className="btn-premium rounded-lg border border-border px-3 py-2 text-[12px] font-medium text-muted-foreground hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
              >
                Open journal form
              </button>
            </div>
          </div>

          {!canManage ? (
            <div className="mt-5">
              <SectionMessage
                title="Read-only role"
                description="Installer role can view communication history but cannot create drafts, queue sends, or retry outbox items."
                tone="info"
              />
            </div>
          ) : null}

          {feedback ? (
            <div className="mt-5">
              <SectionMessage
                title={feedback.tone === "error" ? "Action failed" : "Action update"}
                description={feedback.message}
                tone={feedback.tone}
              />
            </div>
          ) : null}

          {pageError ? (
            <div className="mt-5">
              <SectionMessage title="Load error" description={pageError} tone="error" />
            </div>
          ) : null}

          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
            <div className="rounded-xl border border-border/70 bg-card/70 p-3">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Journals
              </div>
              <div className="mt-2 text-xl font-semibold text-card-foreground">
                {journalSummary.total}
              </div>
              <div className="mt-1 text-[12px] text-muted-foreground">
                Draft: {journalSummary.draft}
              </div>
            </div>
            <div className="rounded-xl border border-border/70 bg-card/70 p-3">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Ready
              </div>
              <div className="mt-2 text-xl font-semibold text-card-foreground">
                {journalSummary.ready}
              </div>
              <div className="mt-1 text-[12px] text-muted-foreground">
                Signed: {journalSummary.signed}
              </div>
            </div>
            <div className="rounded-xl border border-border/70 bg-card/70 p-3">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Outbox
              </div>
              <div className="mt-2 text-xl font-semibold text-card-foreground">
                {outboxSummary?.total ?? 0}
              </div>
              <div className="mt-1 text-[12px] text-muted-foreground">
                Failed: {outboxSummary?.failed_total ?? 0}
              </div>
            </div>
            <div className="rounded-xl border border-border/70 bg-card/70 p-3">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Overdue
              </div>
              <div className="mt-2 text-xl font-semibold text-card-foreground">
                {outboxSummary?.pending_overdue_15m ?? 0}
              </div>
              <div className="mt-1 text-[12px] text-muted-foreground">
                Pending over 15m
              </div>
            </div>
            <div className="rounded-xl border border-border/70 bg-card/70 p-3">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Email
              </div>
              <div className="mt-2 text-xl font-semibold text-card-foreground">
                {outboxSummary?.by_channel?.EMAIL ?? 0}
              </div>
              <div className="mt-1 text-[12px] text-muted-foreground">
                Enabled: {integrations?.email_enabled ? "yes" : "no"}
              </div>
            </div>
            <div className="rounded-xl border border-border/70 bg-card/70 p-3">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                WhatsApp
              </div>
              <div className="mt-2 text-xl font-semibold text-card-foreground">
                {outboxSummary?.by_channel?.WHATSAPP ?? 0}
              </div>
              <div className="mt-1 text-[12px] text-muted-foreground">
                Enabled: {integrations?.whatsapp_enabled ? "yes" : "no"}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="xl:col-span-4">
            <div className="glass-card rounded-xl p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-card-foreground">Journal Queue</h2>
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    Create drafts, filter by status, and pick the active delivery target.
                  </p>
                </div>
                <Clock3 className="h-4 w-4 text-accent" strokeWidth={1.8} />
              </div>

              <div className="space-y-3 rounded-xl border border-border/70 bg-background/40 p-4">
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-card-foreground">
                    Project
                  </label>
                  <select
                    aria-label="Create draft project"
                    value={selectedProjectId}
                    onChange={(event) => setSelectedProjectId(event.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-card-foreground outline-none focus:border-accent"
                  >
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-card-foreground">
                    Draft title
                  </label>
                  <input
                    aria-label="Draft title"
                    value={createTitle}
                    onChange={(event) => setCreateTitle(event.target.value)}
                    placeholder="Final delivery package"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-card-foreground outline-none focus:border-accent"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleCreateDraft}
                  disabled={!canManage || !selectedProjectId || busyAction === "create"}
                  title={!canManage ? "Admin role required" : undefined}
                  className="btn-premium w-full rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-sm font-medium text-accent hover:bg-accent/15 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus className="mr-1 inline h-4 w-4" strokeWidth={1.8} />
                  Create Draft
                </button>
              </div>

              <div className="mt-4 flex gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    aria-label="Search journals"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search by project, title or status"
                    className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-card-foreground outline-none focus:border-accent"
                  />
                </div>
                <select
                  aria-label="Journal status filter"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-card-foreground outline-none focus:border-accent"
                >
                  <option value="ALL">All</option>
                  <option value="DRAFT">Draft</option>
                  <option value="READY">Ready</option>
                  <option value="SIGNED">Signed</option>
                </select>
              </div>

              <div className="mt-4 space-y-3">
                {queueLoading ? (
                  <SectionMessage
                    title="Loading queue"
                    description="Fetching journals, projects and integration state."
                  />
                ) : filteredJournals.length === 0 ? (
                  <SectionMessage
                    title="No journals found"
                    description="Create the first draft or loosen the current filters."
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
                          "w-full rounded-xl border px-4 py-3 text-left transition-all",
                          isSelected
                            ? "border-accent/40 bg-accent/[0.08]"
                            : "border-border/70 bg-background/40 hover:border-accent/25 hover:bg-background/60"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-card-foreground">
                              {journal.title || "Untitled journal"}
                            </div>
                            <div className="mt-1 text-[12px] text-muted-foreground">
                              {journal.project_name}
                            </div>
                            <div className="mt-1 text-[11px] text-muted-foreground/90">
                              {journal.project_address || "Address not set"}
                            </div>
                          </div>
                          <span
                            className={cn(
                              "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]",
                              badgeTone(journal.status)
                            )}
                          >
                            {journal.status}
                          </span>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>Signed: {compactDate(journal.signed_at)}</span>
                          <span>{journal.id.slice(0, 8)}</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="xl:col-span-5">
            <div className="glass-card rounded-xl p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-card-foreground">Send Workspace</h2>
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    Prepare the final message, choose channels, and queue delivery for the selected
                    journal.
                  </p>
                </div>
                <Send className="h-4 w-4 text-accent" strokeWidth={1.8} />
              </div>
              {!selectedJournalId ? (
                <SectionMessage
                  title="No journal selected"
                  description="Choose a journal from the queue to open the delivery workspace."
                />
              ) : detailsError ? (
                <SectionMessage title="Journal load failed" description={detailsError} tone="error" />
              ) : detailsLoading ? (
                <SectionMessage
                  title="Loading journal"
                  description="Fetching delivery status, public token and lock state."
                />
              ) : selectedJournal ? (
                <div className="space-y-5">
                  <div className="rounded-xl border border-border/70 bg-background/40 p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-card-foreground">
                            {selectedJournal.title || "Untitled journal"}
                          </h3>
                          <span
                            className={cn(
                              "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]",
                              badgeTone(selectedJournal.status)
                            )}
                          >
                            {selectedJournal.status}
                          </span>
                        </div>
                        <div className="mt-1 text-[12px] text-muted-foreground">
                          Snapshot v{selectedJournal.snapshot_version} • Signed: {compactDate(selectedJournal.signed_at)}
                        </div>
                        {selectedJournal.signer_name ? (
                          <div className="mt-1 text-[12px] text-muted-foreground">
                            Signer: {selectedJournal.signer_name}
                          </div>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={handleMarkReady}
                          disabled={!canManage || busyAction === "ready"}
                          title={!canManage ? "Admin role required" : undefined}
                          className="btn-premium rounded-lg border border-border px-3 py-2 text-[12px] font-medium text-muted-foreground hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <CheckCircle2 className="mr-1 inline h-4 w-4" strokeWidth={1.8} />
                          Mark Ready
                        </button>
                        <button
                          type="button"
                          onClick={handleExportPdf}
                          disabled={!canManage || busyAction === "export"}
                          title={!canManage ? "Admin role required" : undefined}
                          className="btn-premium rounded-lg border border-border px-3 py-2 text-[12px] font-medium text-muted-foreground hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <FileDown className="mr-1 inline h-4 w-4" strokeWidth={1.8} />
                          Export PDF
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <BoolBadge label="Header locked" value={selectedJournal.lock_header} />
                      <BoolBadge label="Table locked" value={selectedJournal.lock_table} />
                      <BoolBadge label="Footer locked" value={selectedJournal.lock_footer} />
                      <BoolBadge
                        label="Public token active"
                        value={Boolean(selectedJournal.public_token)}
                      />
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="rounded-xl border border-border/70 bg-card/60 p-3">
                        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                          Email delivery
                        </div>
                        <div className="mt-2 inline-flex rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-card-foreground">
                          {selectedJournal.email_delivery_status}
                        </div>
                        <div className="mt-2 text-[12px] text-muted-foreground">
                          Last sent: {formatDateTime(selectedJournal.email_last_sent_at)}
                        </div>
                        {selectedJournal.email_last_error ? (
                          <div className="mt-2 text-[12px] text-destructive">
                            {selectedJournal.email_last_error}
                          </div>
                        ) : null}
                      </div>
                      <div className="rounded-xl border border-border/70 bg-card/60 p-3">
                        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                          WhatsApp delivery
                        </div>
                        <div className="mt-2 inline-flex rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-card-foreground">
                          {selectedJournal.whatsapp_delivery_status}
                        </div>
                        <div className="mt-2 text-[12px] text-muted-foreground">
                          Last sent: {formatDateTime(selectedJournal.whatsapp_last_sent_at)}
                        </div>
                        <div className="mt-1 text-[12px] text-muted-foreground">
                          Delivered: {formatDateTime(selectedJournal.whatsapp_delivered_at)}
                        </div>
                        {selectedJournal.whatsapp_last_error ? (
                          <div className="mt-2 text-[12px] text-destructive">
                            {selectedJournal.whatsapp_last_error}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/70 bg-background/40 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-card-foreground">Templates</h3>
                        <p className="mt-1 text-[12px] text-muted-foreground">
                          Save shared server-side presets for client, site manager and installer flows.
                        </p>
                      </div>
                      <Save className="h-4 w-4 text-accent" strokeWidth={1.8} />
                    </div>

                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_1fr]">
                      <select
                        aria-label="Communication template"
                        value={selectedTemplateId}
                        onChange={(event) => setSelectedTemplateId(event.target.value)}
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-card-foreground outline-none focus:border-accent"
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
                          className="btn-premium flex-1 rounded-lg border border-border px-3 py-2 text-[12px] font-medium text-muted-foreground hover:text-accent"
                        >
                          Apply
                        </button>
                        <button
                          type="button"
                          onClick={deleteTemplate}
                          className="btn-premium rounded-lg border border-border px-3 py-2 text-[12px] font-medium text-muted-foreground hover:text-accent"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <input
                        aria-label="Template name"
                        value={templateName}
                        onChange={(event) => setTemplateName(event.target.value)}
                        placeholder="Save current message as template"
                        className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-card-foreground outline-none focus:border-accent"
                      />
                      <button
                        type="button"
                        onClick={saveTemplate}
                        className="btn-premium rounded-lg border border-border px-3 py-2 text-[12px] font-medium text-muted-foreground hover:text-accent"
                      >
                        <Save className="mr-1 inline h-4 w-4" strokeWidth={1.8} />
                        Save
                      </button>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-background/40 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-card-foreground">Delivery channels</h3>
                        <p className="mt-1 text-[12px] text-muted-foreground">
                          Queue email and WhatsApp from the selected journal snapshot.
                        </p>
                      </div>
                      <Mail className="h-4 w-4 text-accent" strokeWidth={1.8} />
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <label className="flex items-start gap-3 rounded-xl border border-border/70 bg-card/60 p-3">
                        <input
                          aria-label="Send email"
                          type="checkbox"
                          checked={sendEmail}
                          onChange={(event) => setSendEmail(event.target.checked)}
                          disabled={!integrations?.email_enabled}
                          className="mt-1"
                        />
                        <div>
                          <div className="text-sm font-medium text-card-foreground">Email</div>
                          <div className="mt-1 text-[12px] text-muted-foreground">
                            SMTP configured: {integrations?.smtp_configured ? "yes" : "no"}
                          </div>
                        </div>
                      </label>
                      <label className="flex items-start gap-3 rounded-xl border border-border/70 bg-card/60 p-3">
                        <input
                          aria-label="Send WhatsApp"
                          type="checkbox"
                          checked={sendWhatsapp}
                          onChange={(event) => setSendWhatsapp(event.target.checked)}
                          disabled={!integrations?.whatsapp_enabled}
                          className="mt-1"
                        />
                        <div>
                          <div className="text-sm font-medium text-card-foreground">WhatsApp</div>
                          <div className="mt-1 text-[12px] text-muted-foreground">
                            Twilio configured: {integrations?.twilio_configured ? "yes" : "no"}
                          </div>
                        </div>
                      </label>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-[12px] font-medium text-card-foreground">
                          Email recipient
                        </label>
                        <input
                          aria-label="Email recipient"
                          value={emailTo}
                          onChange={(event) => setEmailTo(event.target.value)}
                          placeholder="client@example.com"
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-card-foreground outline-none focus:border-accent"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[12px] font-medium text-card-foreground">
                          WhatsApp recipient
                        </label>
                        <input
                          aria-label="WhatsApp recipient"
                          value={whatsappTo}
                          onChange={(event) => setWhatsappTo(event.target.value)}
                          placeholder="+9725xxxxxxx"
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-card-foreground outline-none focus:border-accent"
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="mb-1 block text-[12px] font-medium text-card-foreground">
                        Subject
                      </label>
                      <input
                        aria-label="Journal subject"
                        value={subject}
                        onChange={(event) => setSubject(event.target.value)}
                        placeholder="Project handover package"
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-card-foreground outline-none focus:border-accent"
                      />
                    </div>

                    <div className="mt-4">
                      <label className="mb-1 block text-[12px] font-medium text-card-foreground">
                        Message
                      </label>
                      <textarea
                        aria-label="Journal message"
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                        placeholder="Add the customer-facing context for this journal send."
                        rows={6}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-card-foreground outline-none focus:border-accent"
                      />
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleQueueSend}
                        disabled={!canManage || busyAction === "send"}
                        title={!canManage ? "Admin role required" : undefined}
                        className="btn-premium rounded-lg border border-accent/30 bg-accent/10 px-4 py-2 text-sm font-medium text-accent hover:bg-accent/15 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Send className="mr-1 inline h-4 w-4" strokeWidth={1.8} />
                        Queue Send
                      </button>
                      <button
                        type="button"
                        onClick={() => selectedJournalId && router.push(`/journal/${selectedJournalId}`)}
                        className="btn-premium rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-accent"
                      >
                        Edit journal form
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <SectionMessage
                  title="Journal not available"
                  description="Select a queue item to load the communication workspace."
                />
              )}
            </div>
          </div>

          <div className="xl:col-span-3">
            <div className="glass-card rounded-xl p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-card-foreground">Delivery Log</h2>
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    Monitor outbox delivery, provider errors and retry queue recovery.
                  </p>
                </div>
                <MessageSquare className="h-4 w-4 text-accent" strokeWidth={1.8} />
              </div>

              {deliveryLoading ? (
                <SectionMessage
                  title="Loading outbox"
                  description="Fetching delivery summary and recent communication attempts."
                />
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="rounded-xl border border-border/70 bg-background/40 p-3">
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        Channel mix
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-[12px] text-card-foreground">
                        <span>Email: {outboxSummary?.by_channel?.EMAIL ?? 0}</span>
                        <span>WhatsApp: {outboxSummary?.by_channel?.WHATSAPP ?? 0}</span>
                      </div>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-background/40 p-3">
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        Delivery status
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-[12px] text-card-foreground">
                        <span>Delivered: {outboxSummary?.by_delivery_status?.DELIVERED ?? 0}</span>
                        <span>Pending: {outboxSummary?.by_delivery_status?.PENDING ?? 0}</span>
                        <span>Failed: {outboxSummary?.by_delivery_status?.FAILED ?? 0}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {outboxItems.length === 0 ? (
                      <SectionMessage
                        title="No delivery items"
                        description="Send a journal or clear the current filter to inspect outbox traffic."
                      />
                    ) : (
                      outboxItems.map((item) => (
                        <div key={item.id} className="rounded-xl border border-border/70 bg-background/40 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-semibold text-card-foreground">
                                  {item.channel}
                                </span>
                                <span
                                  className={cn(
                                    "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]",
                                    badgeTone(item.status)
                                  )}
                                >
                                  {item.status}
                                </span>
                              </div>
                              <div className="mt-1 text-[12px] text-muted-foreground">
                                {item.recipient || "Recipient missing"}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRetryOutbox(item.id)}
                              disabled={!canManage || busyAction === `retry:${item.id}`}
                              title={!canManage ? "Admin role required" : undefined}
                              className="btn-premium rounded-lg border border-border px-3 py-2 text-[12px] font-medium text-muted-foreground hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <RotateCcw className="mr-1 inline h-4 w-4" strokeWidth={1.8} />
                              Retry
                            </button>
                          </div>
                          {item.subject ? (
                            <div className="mt-2 text-[12px] font-medium text-card-foreground">
                              {item.subject}
                            </div>
                          ) : null}
                          {item.template_name ? (
                            <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-accent">
                              Template: {item.template_name}
                            </div>
                          ) : null}
                          {item.message_preview ? (
                            <div className="mt-2 text-[12px] text-muted-foreground">
                              {item.message_preview}
                            </div>
                          ) : null}
                          <div className="mt-3 space-y-1 text-[11px] text-muted-foreground">
                            <div>Scheduled: {formatDateTime(item.scheduled_at)}</div>
                            <div>
                              Attempts: {item.attempts}/{item.max_attempts}
                            </div>
                            <div>Delivery: {item.delivery_status}</div>
                            {item.attachment_name ? <div>Attachment: {item.attachment_name}</div> : null}
                            {item.last_error ? (
                              <div className="text-destructive">Error: {item.last_error}</div>
                            ) : null}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}

              <div className="mt-5 rounded-xl border border-border/70 bg-background/40 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-accent" strokeWidth={1.8} />
                  <h3 className="text-sm font-semibold text-card-foreground">Integration snapshot</h3>
                </div>
                {integrations ? (
                  <div className="space-y-2">
                    <BoolBadge label="Email enabled" value={integrations.email_enabled} />
                    <BoolBadge label="WhatsApp enabled" value={integrations.whatsapp_enabled} />
                    <BoolBadge label="Storage configured" value={integrations.storage_configured} />
                    <BoolBadge
                      label="WhatsApp fallback to email"
                      value={integrations.whatsapp_fallback_to_email}
                    />
                    <BoolBadge
                      label="Waze navigation enabled"
                      value={integrations.waze_navigation_enabled}
                    />
                    <div className="rounded-xl border border-border/70 bg-card/60 p-3 text-[12px] text-muted-foreground">
                      <div>Public base URL: {integrations.public_base_url}</div>
                      <div className="mt-1">
                        Journal token TTL: {integrations.journal_public_token_ttl_sec}s
                      </div>
                    </div>
                  </div>
                ) : (
                  <SectionMessage
                    title="Integration settings unavailable"
                    description="The settings endpoint did not return a snapshot."
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

