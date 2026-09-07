"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Bell,
  ClipboardList,
  FileSpreadsheet,
  Mail,
  MessageCircle,
  RefreshCcw,
  ServerCrash,
  ShieldAlert,
  Siren,
  TimerReset,
  Webhook,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";

import { DashboardLayout } from "@/components/DashboardLayout";
import {
  KpiCard as DimaxKpiCard,
  MetricRow,
  WidgetCard,
} from "@/components/dimax";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuthSession } from "@/hooks/use-auth-session";
import { canRunPrivilegedAdminActions } from "@/lib/admin-access";
import { apiFetch } from "@/lib/api";
import {
  readableApiError,
  readableConflictCode,
} from "@/lib/api-error-display";
import { useI18n, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const operationsOverrides: Record<Locale, Record<string, string>> = {
  en: {
    "operations.actionableOnlyView": "Actionable-only view",
    "operations.batchRecovery": "Batch recovery",
    "operations.webhookDiagnostics": "Webhook diagnostics",
    "operations.showAll": "Show all",
    "operations.providerLane": "Provider lane",
    "operations.deliveryRecoveryAuditTitle": "Delivery Recovery Audit",
    "operations.deliveryRecoveryAuditSubtitle":
      "Latest manual retries recorded for failed outbox recovery actions.",
    "operations.openDeliveryReports": "Open delivery reports",
    "operations.loadingDeliveryRecoveryAudit":
      "Loading delivery recovery audit...",
    "operations.noDeliveryRecoveryAudit":
      "No delivery recovery audit entries yet.",
    "operations.reviewDeliveryRecovery": "Review delivery recovery",
    "operations.webhookSignalsTitle": "Webhook Signals",
    "operations.webhookSignalsSubtitle":
      "Delivery webhook duplicates, mismatches, and provider failures in the last {hours} hours.",
    "operations.received": "Received",
    "operations.duplicates": "Duplicates",
    "operations.unmatched": "Unmatched",
    "operations.providerFailed": "Provider failed",
    "operations.loadingWebhookSignals": "Loading webhook signals...",
    "operations.noWebhookSignalsScoped":
      "No webhook signals match current provider scope.",
    "operations.noWebhookSignals": "No webhook signals recorded.",
    "operations.deliveryReport": "Delivery report",
    "operations.openImportWorkspace": "Open import workspace",
    "operations.openOperationsReports": "Open operations reports",
    "operations.openIssuesReports": "Open issues reports",
    "operations.openCommunicationQueue": "Open communication queue",
    "operations.openInstallerBoard": "Open installer board",
    "operations.failedImportQueue": "Failed Import Queue",
    "operations.openQueue": "Open queue",
    "operations.loadingFailedImports": "Loading failed imports...",
    "operations.noActionableImportRuns": "No actionable import runs.",
    "operations.noFailedImportRuns": "No failed import runs.",
    "operations.unknown": "unknown",
    "operations.noReasonSupplied": "No reason supplied",
  },
  ru: {
    "operations.actionableOnlyView": "Только сигналы, требующие действий",
    "operations.batchRecovery": "Пакетное восстановление",
    "operations.webhookDiagnostics": "Диагностика вебхуков",
    "operations.showAll": "Показать все",
    "operations.providerLane": "Срез провайдера",
    "operations.deliveryRecoveryAuditTitle": "Аудит восстановления доставки",
    "operations.deliveryRecoveryAuditSubtitle":
      "Последние ручные повторы для сообщений с ошибкой отправки.",
    "operations.openDeliveryReports": "Открыть отчеты по доставке",
    "operations.loadingDeliveryRecoveryAudit":
      "Загружаем аудит восстановления доставки...",
    "operations.noDeliveryRecoveryAudit":
      "Записей аудита восстановления доставки пока нет.",
    "operations.reviewDeliveryRecovery": "Проверить восстановление доставки",
    "operations.webhookSignalsTitle": "Сигналы вебхуков",
    "operations.webhookSignalsSubtitle":
      "Дубликаты вебхуков, несовпадения и ошибки провайдера за последние {hours} ч.",
    "operations.received": "Получено",
    "operations.duplicates": "Дубликаты",
    "operations.unmatched": "Без совпадения",
    "operations.providerFailed": "Ошибка провайдера",
    "operations.loadingWebhookSignals": "Загружаем сигналы вебхуков...",
    "operations.noWebhookSignalsScoped":
      "Для текущего провайдера нет сигналов вебхуков.",
    "operations.noWebhookSignals": "Сигналы вебхуков пока не зафиксированы.",
    "operations.deliveryReport": "Отчет по доставке",
    "operations.openImportWorkspace": "Открыть импорт",
    "operations.openOperationsReports": "Открыть операционные отчёты",
    "operations.openIssuesReports": "Открыть отчеты по проблемам",
    "operations.openCommunicationQueue": "Открыть очередь коммуникаций",
    "operations.openInstallerBoard": "Открыть доску монтажников",
    "operations.failedImportQueue": "Очередь неуспешных импортов",
    "operations.openQueue": "Открыть очередь",
    "operations.loadingFailedImports": "Загружаем неуспешные импорты...",
    "operations.noActionableImportRuns": "Сейчас нет импортов, требующих действий.",
    "operations.noFailedImportRuns": "Неуспешных импортов нет.",
    "operations.unknown": "неизвестно",
    "operations.noReasonSupplied": "Причина не указана",
  },
  he: {
    "operations.actionableOnlyView": "רק אותות הדורשים פעולה",
    "operations.batchRecovery": "שחזור מרוכז",
    "operations.webhookDiagnostics": "אבחון וובהוקים",
    "operations.showAll": "הצג הכל",
    "operations.providerLane": "נתיב ספק",
    "operations.deliveryRecoveryAuditTitle": "בקרת שחזור שליחות",
    "operations.deliveryRecoveryAuditSubtitle":
      "ניסיונות שחזור ידניים אחרונים עבור הודעות שנכשלו בשליחה.",
    "operations.openDeliveryReports": "פתח דוחות משלוח",
    "operations.loadingDeliveryRecoveryAudit": "טוען בקרת שחזור שליחות...",
    "operations.noDeliveryRecoveryAudit":
      "עדיין אין רשומות בקרת שחזור שליחות.",
    "operations.reviewDeliveryRecovery": "בדוק את שחזור המשלוח",
    "operations.webhookSignalsTitle": "אותות וובהוק",
    "operations.webhookSignalsSubtitle":
      "כפילויות וובהוק, אי-התאמות וכשלי ספק ב-{hours} השעות האחרונות.",
    "operations.received": "התקבלו",
    "operations.duplicates": "כפילויות",
    "operations.unmatched": "ללא התאמה",
    "operations.providerFailed": "כשל ספק",
    "operations.loadingWebhookSignals": "טוען אותות וובהוק...",
    "operations.noWebhookSignalsScoped": "אין אותות וובהוק עבור ספק זה.",
    "operations.noWebhookSignals": "עדיין לא נרשמו אותות וובהוק.",
    "operations.deliveryReport": "דוח משלוח",
    "operations.openImportWorkspace": "פתח סביבת ייבוא",
    "operations.openOperationsReports": "פתח דוחות תפעול",
    "operations.openIssuesReports": "פתח דוחות תקלות",
    "operations.openCommunicationQueue": "פתח תור תקשורת",
    "operations.openInstallerBoard": "פתח לוח מתקינים",
    "operations.failedImportQueue": "תור ייבואים שנכשלו",
    "operations.openQueue": "פתח תור",
    "operations.loadingFailedImports": "טוען ייבואים שנכשלו...",
    "operations.noActionableImportRuns": "אין כרגע ייבואים הדורשים פעולה.",
    "operations.noFailedImportRuns": "אין ייבואים שנכשלו.",
    "operations.unknown": "לא ידוע",
    "operations.noReasonSupplied": "לא סופקה סיבה",
  },
};

type SyncHealthSummaryResponse = {
  max_cursor: number;
  counts: {
    ok: number;
    warn: number;
    danger: number;
    total: number;
    dead: number;
    never_seen: number;
    danger_pct: number;
    failed_events?: number;
    queue_pending?: number;
    queue_conflicts?: number;
    queue_blocked?: number;
    queue_auth_required?: number;
    problem_total?: number;
  };
  alerts_sent: number;
  top_laggers: Array<{
    installer_id: string;
    installer_name?: string | null;
    installer_phone?: string | null;
    status: string;
    lag: number;
    days_offline: number;
    last_seen_at: string | null;
    failed_events?: number;
    queue_pending?: number;
    queue_conflicts?: number;
    queue_blocked?: number;
    queue_auth_required?: number;
    problem_count?: number;
  }>;
  top_offline: Array<{
    installer_id: string;
    installer_name?: string | null;
    installer_phone?: string | null;
    status: string;
    lag: number;
    days_offline: number;
    last_seen_at: string | null;
    failed_events?: number;
    queue_pending?: number;
    queue_conflicts?: number;
    queue_blocked?: number;
    queue_auth_required?: number;
    problem_count?: number;
  }>;
};

type SyncProblemItem = {
  id: string;
  source: string;
  installer_id?: string | null;
  installer_name?: string | null;
  installer_phone?: string | null;
  user_id?: string | null;
  project_id?: string | null;
  client_event_id?: string | null;
  event_type?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  operation_type?: string | null;
  status: string;
  conflict_code?: string | null;
  error?: string | null;
  problem_code?: string | null;
  problem_title?: string | null;
  operator_action?: string | null;
  retry_allowed?: boolean;
  manual_review_required?: boolean;
  device_id?: string | null;
  base_version?: number | null;
  payload: Record<string, unknown>;
  created_at: string;
  client_happened_at?: string | null;
  applied_at?: string | null;
  synced_at?: string | null;
};

type SyncProblemsResponse = {
  items: SyncProblemItem[];
  total: number;
};

type SyncResetTarget = {
  busyKey: string;
  label: string;
  resetPath: string;
  description: string;
};

type OutboxSummaryResponse = {
  total: number;
  by_channel: Record<string, number>;
  by_status: Record<string, number>;
  by_delivery_status: Record<string, number>;
  pending_overdue_15m: number;
  failed_total: number;
};

type OutboxListResponse = {
  items: Array<{
    id: string;
    channel: string;
    recipient: string | null;
    subject: string | null;
    status: string;
    delivery_status: string;
    attempts: number;
    max_attempts: number;
    scheduled_at: string;
    created_at: string;
    last_error: string | null;
  }>;
};

type WebhookSignalsSummaryResponse = {
  window_hours: number;
  total_received: number;
  updated_total: number;
  duplicate_total: number;
  unmatched_total: number;
  provider_failed_total: number;
};

type WebhookSignalsListResponse = {
  items: Array<{
    id: string;
    provider: string;
    event_type: string;
    external_id: string | null;
    result: string;
    status: string | null;
    error: string | null;
    outbox_id: string | null;
    created_at: string;
  }>;
};

type OutboxRetryAuditListResponse = {
  items: Array<{
    id: string;
    outbox_id: string;
    actor_user_id: string;
    reason: string | null;
    before_status: string | null;
    after_status: string | null;
    before_delivery_status: string | null;
    after_delivery_status: string | null;
    created_at: string;
  }>;
};

type AuditChangesResponse = {
  items: Array<{
    id: string;
    created_at: string;
    actor_user_id: string;
    entity_type: string;
    entity_id: string;
    action: string;
    reason: string | null;
    before: Record<string, unknown> | null;
    after: Record<string, unknown> | null;
  }>;
  summary: {
    total: number;
    by_entity: Record<string, number>;
    by_action: Record<string, number>;
  };
};

type FailedImportRunsQueueResponse = {
  items: Array<{
    run_id: string;
    project_id: string;
    project_name: string;
    created_at: string;
    mode: string;
    status: string;
    source_filename: string | null;
    parsed_rows: number;
    prepared_rows: number;
    imported: number;
    skipped: number;
    errors_count: number;
    last_error: string | null;
    retry_available: boolean;
  }>;
  total: number;
  limit: number;
  offset: number;
};

type RetryFailedRunsResponse = {
  items: Array<{
    run_id: string;
    project_id: string | null;
    status: string;
    imported: number;
    skipped: number;
    errors_count: number;
    last_error?: string | null;
  }>;
  total_runs: number;
  successful_runs: number;
  failed_runs: number;
  skipped_runs: number;
};

type BulkReconcileResponse = {
  items: Array<{
    project_id: string;
    source_run_id: string | null;
    status: string;
    imported: number;
    skipped: number;
    errors_count: number;
    last_error?: string | null;
  }>;
  total_projects: number;
  successful_projects: number;
  failed_projects: number;
  skipped_projects: number;
};

type BulkOutboxRetryResponse = {
  items: Array<{
    outbox_id: string;
    status: string;
    error?: string | null;
    item?: {
      id: string;
      recipient: string | null;
      subject: string | null;
      channel: string;
      status: string;
      delivery_status: string;
    } | null;
  }>;
  total_messages: number;
  successful_messages: number;
  failed_messages: number;
  skipped_messages: number;
};

type OperationsBatchResult =
  | {
      action: "retry";
      createdAt: string;
      successful: number;
      failed: number;
      skipped: number;
      scope: number;
      items: RetryFailedRunsResponse["items"];
    }
  | {
      action: "reconcile";
      createdAt: string;
      successful: number;
      failed: number;
      skipped: number;
      scope: number;
      items: BulkReconcileResponse["items"];
    }
  | {
      action: "outbox-retry";
      createdAt: string;
      successful: number;
      failed: number;
      skipped: number;
      scope: number;
      items: BulkOutboxRetryResponse["items"];
    };

function formatDateTime(value: string | null): string {
  if (!value) {
    return "Never";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
}

function compactMap(value: Record<string, number>): string {
  const entries = Object.entries(value);
  if (entries.length === 0) {
    return "n/a";
  }
  return entries.map(([key, count]) => `${key}: ${count}`).join(" | ");
}

function buildProjectsImportHref(
  projectId: string | null,
  failedProjectIds: string[],
): string {
  const params = new URLSearchParams();
  params.set("only_failed_runs", "1");
  if (projectId) {
    params.set("project_id", projectId);
  }
  if (failedProjectIds.length > 0) {
    params.set("failed_project_ids", failedProjectIds.join(","));
  }
  return `/projects?${params.toString()}`;
}

function buildOperationsHref(params: {
  actionable?: boolean;
  deliveryChannel?: string;
  webhookProvider?: string;
}): string {
  const query = new URLSearchParams();
  if (params.actionable) {
    query.set("actionable", "1");
  }
  if (params.deliveryChannel) {
    query.set("delivery_channel", params.deliveryChannel);
  }
  if (params.webhookProvider) {
    query.set("webhook_provider", params.webhookProvider);
  }
  const value = query.toString();
  return value ? `/operations?${value}` : "/operations";
}

function buildDeliveryReportHref(params: {
  outboxId?: string;
  deliveryChannel?: string;
  webhookProvider?: string;
}): string {
  const query = new URLSearchParams();
  query.set("focus", "delivery");
  query.set("ops_preset", "delivery-risk");
  if (params.outboxId) {
    query.set("outbox_id", params.outboxId);
  }
  if (params.deliveryChannel) {
    query.set("delivery_channel", params.deliveryChannel);
  }
  if (params.webhookProvider) {
    query.set("webhook_provider", params.webhookProvider);
  }
  return `/reports?${query.toString()}`;
}

function formatRefreshTimestamp(
  value: number | null,
  t: (key: string) => string,
): string {
  if (!value || Number.isNaN(value)) {
    return t("operations.waitingForRefresh");
  }
  return `${t("operations.freshAsOf")} ${new Date(value).toLocaleTimeString()}`;
}

function describeAgeMinutes(
  value: number | null,
  now: number,
  t: (key: string) => string,
): string {
  if (!value || Number.isNaN(value)) {
    return t("operations.noSuccessfulSnapshot");
  }
  const ageMinutes = Math.max(0, Math.floor((now - value) / 60_000));
  if (ageMinutes === 0) {
    return t("operations.updatedLessThanMinute");
  }
  if (ageMinutes === 1) {
    return t("operations.updatedOneMinute");
  }
  return t("operations.updatedMinutesAgo").replace(
    "{count}",
    String(ageMinutes),
  );
}

function summarizeActions(params: {
  actionableImports: number;
  actionableOutbox: number;
  actionableSync: number;
  firstImportProjectName: string | null;
  firstOutboxRecipient: string | null;
  firstSyncInstallerLabel: string | null;
  t: (key: string) => string;
}): Array<{ label: string; value: string; href: string }> {
  const items: Array<{ label: string; value: string; href: string }> = [];

  if (params.actionableImports > 0) {
    items.push({
      label: params.t("operations.summaryImports"),
      value:
        params.actionableImports === 1 && params.firstImportProjectName
          ? params
              .t("operations.summaryRetryFailedImportFor")
              .replace("{name}", params.firstImportProjectName)
          : params
              .t("operations.summaryFailedImportsNeedRetry")
              .replace("{count}", String(params.actionableImports)),
      href: "/projects?only_failed_runs=1",
    });
  }

  if (params.actionableOutbox > 0) {
    items.push({
      label: params.t("operations.summaryOutbox"),
      value:
        params.actionableOutbox === 1 && params.firstOutboxRecipient
          ? params
              .t("operations.summaryRecoverDeliveryFor")
              .replace("{name}", params.firstOutboxRecipient)
          : params
              .t("operations.summaryDeliveryFailuresNeedRetry")
              .replace("{count}", String(params.actionableOutbox)),
      href: "/reports",
    });
  }

  if (params.actionableSync > 0) {
    items.push({
      label: params.t("operations.summarySync"),
      value:
        params.actionableSync === 1 && params.firstSyncInstallerLabel
          ? params
              .t("operations.summaryInvestigateInstaller")
              .replace("{name}", params.firstSyncInstallerLabel)
          : params
              .t("operations.summaryInstallersNeedSyncAttention")
              .replace("{count}", String(params.actionableSync)),
      href: "/installers",
    });
  }

  if (items.length === 0) {
    items.push({
      label: params.t("operations.summaryStatus"),
      value: params.t("operations.summaryNoActiveActions"),
      href: "/operations",
    });
  }

  return items;
}

function syncInstallerLabel(item: {
  installer_id: string;
  installer_name?: string | null;
}): string {
  return item.installer_name?.trim() || item.installer_id;
}

function syncProblemInstallerLabel(problem: SyncProblemItem): string {
  return (
    problem.installer_name?.trim() ||
    problem.installer_id ||
    "Unknown installer"
  );
}

function syncProblemResetPath(problem: SyncProblemItem): string | null {
  if (problem.user_id) {
    return `/api/v1/admin/sync/states/${encodeURIComponent(problem.user_id)}/reset`;
  }
  if (problem.installer_id) {
    return `/api/v1/admin/sync/reset/${encodeURIComponent(problem.installer_id)}`;
  }
  return null;
}

function syncProblemResetTarget(
  problem: SyncProblemItem,
): SyncResetTarget | null {
  const resetPath = syncProblemResetPath(problem);
  if (!resetPath) {
    return null;
  }
  return {
    busyKey: `sync-reset:${problem.id}`,
    label: syncProblemInstallerLabel(problem),
    resetPath,
    description:
      "This resets the sync cursor for this installer. It does not change door statuses, payroll, or history.",
  };
}

function syncHealthResetTarget(
  item: SyncHealthSummaryResponse["top_laggers"][number],
): SyncResetTarget {
  return {
    busyKey: `sync-reset:health:${item.installer_id}`,
    label: syncInstallerLabel(item),
    resetPath: `/api/v1/admin/sync/reset/${encodeURIComponent(item.installer_id)}`,
    description: `This resets the sync cursor for this installer. Current lag is ${item.lag}, offline ${item.days_offline} days. It does not change door statuses, payroll, or history.`,
  };
}

type SyncProblemStatusFilter =
  | "all"
  | "failed"
  | "conflict"
  | "pending"
  | "auth_required";

function syncProblemStatusBucket(
  problem: SyncProblemItem,
): Exclude<SyncProblemStatusFilter, "all"> {
  const status = problem.status.trim().toUpperCase();
  if (problem.source === "sync_event" || status === "FAILED") {
    return "failed";
  }
  if (status === "CONFLICT") {
    return "conflict";
  }
  if (status === "AUTH_REQUIRED") {
    return "auth_required";
  }
  return "pending";
}

function syncProblemStatusLabel(status: SyncProblemStatusFilter): string {
  if (status === "failed") return "Failed events";
  if (status === "conflict") return "Conflicts";
  if (status === "auth_required") return "Auth required";
  if (status === "pending") return "Pending/blocked";
  return "All problems";
}

function auditField(
  row: Record<string, unknown> | null,
  field: string,
): string | null {
  const value = row?.[field];
  return typeof value === "string" && value.trim() ? value : null;
}

function auditIntField(
  row: Record<string, unknown> | null,
  field: string,
): number | null {
  const value = row?.[field];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (
    typeof value === "string" &&
    value.trim() &&
    Number.isFinite(Number(value))
  ) {
    return Number(value);
  }
  return null;
}

function syncRecoveryAuditInstallerLabel(
  item: AuditChangesResponse["items"][number],
): string {
  return (
    auditField(item.after, "installer_name") ||
    auditField(item.before, "installer_name") ||
    auditField(item.after, "installer_id") ||
    auditField(item.before, "installer_id") ||
    item.entity_id
  );
}

function syncRecoveryAuditReasonLabel(reason: string | null): string {
  if (reason === "admin_cold_resync") return "Cold resync";
  if (reason === "admin_legacy_reset") return "Legacy reset";
  return reason || "No reason supplied";
}

function extractBatchProjectIds(
  result: OperationsBatchResult | null,
): string[] {
  if (!result || result.action === "outbox-retry") {
    return [];
  }
  const ids = new Set<string>();
  for (const item of result.items) {
    if ("project_id" in item && item.project_id) {
      ids.add(item.project_id);
    }
  }
  return [...ids];
}

function extractBatchOutboxIds(result: OperationsBatchResult | null): string[] {
  if (!result || result.action !== "outbox-retry") {
    return [];
  }
  return result.items
    .map((item) => item.outbox_id)
    .filter(
      (value, index, self) => Boolean(value) && self.indexOf(value) === index,
    );
}

function operationsNoticeClass(tone: "success" | "error"): string {
  return cn(
    "rounded-lg border px-4 py-3 text-[13px]",
    tone === "success"
      ? "border-status-ok-border bg-status-ok-bg text-status-ok-fg"
      : "border-status-problem-border bg-status-problem-bg text-status-problem-fg",
  );
}

function freshnessBadgeClass(state: string): string {
  if (state === "fresh") {
    return "rounded-full border border-status-ok-border bg-status-ok-bg px-2.5 py-1 text-[11px] font-medium text-status-ok-fg";
  }
  if (state === "stale") {
    return "rounded-full border border-status-warning-border bg-status-warning-bg px-2.5 py-1 text-[11px] font-medium text-status-warning-fg";
  }
  if (state === "degraded") {
    return "rounded-full border border-status-problem-border bg-status-problem-bg px-2.5 py-1 text-[11px] font-medium text-status-problem-fg";
  }
  return "rounded-full border border-status-blocked-border bg-status-blocked-bg px-2.5 py-1 text-[11px] font-medium text-status-blocked-fg";
}

type OperationsTone = "blue" | "green" | "neutral" | "orange" | "red";

type RecoveryIncident = {
  actionLabel: string;
  age: string;
  detail: string;
  disabled?: boolean;
  href?: string;
  icon: LucideIcon;
  id: string;
  kind: string;
  onAction?: () => void;
  priority: string;
  title: string;
  tone: OperationsTone;
};

function operationToneClasses(tone: OperationsTone) {
  if (tone === "red") {
    return {
      border: "before:bg-status-problem-fg",
      icon: "bg-status-problem-bg text-status-problem-fg",
      status: "bg-status-problem-bg text-status-problem-fg",
      value: "text-status-problem-fg",
      dot: "bg-status-problem-fg",
    };
  }
  if (tone === "orange") {
    return {
      border: "before:bg-status-warning-fg",
      icon: "bg-status-warning-bg text-status-warning-fg",
      status: "bg-status-warning-bg text-status-warning-fg",
      value: "text-status-warning-fg",
      dot: "bg-status-warning-fg",
    };
  }
  if (tone === "green") {
    return {
      border: "before:bg-status-ok-fg",
      icon: "bg-status-ok-bg text-status-ok-fg",
      status: "bg-status-ok-bg text-status-ok-fg",
      value: "text-status-ok-fg",
      dot: "bg-status-ok-fg",
    };
  }
  if (tone === "blue") {
    return {
      border: "before:bg-link",
      icon: "bg-blue-50 text-link",
      status: "bg-blue-50 text-link",
      value: "text-link",
      dot: "bg-link",
    };
  }
  return {
    border: "before:bg-border-strong",
    icon: "bg-surface-subtle text-text-secondary",
    status: "bg-surface-subtle text-text-secondary",
    value: "text-text",
    dot: "bg-text-tertiary",
  };
}

function OperationsMiniBars({ tone }: { tone: OperationsTone }) {
  const colors =
    tone === "red"
      ? [
          "var(--dmx-kpi-green)",
          "var(--dmx-kpi-green)",
          "var(--dmx-kpi-yellow)",
          "var(--dmx-kpi-orange)",
          "var(--dmx-kpi-red)",
          "var(--dmx-kpi-red)",
        ]
      : tone === "orange"
        ? [
            "var(--dmx-kpi-green)",
            "var(--dmx-kpi-yellow)",
            "var(--dmx-kpi-yellow)",
            "var(--dmx-kpi-orange)",
            "var(--dmx-kpi-yellow)",
            "var(--dmx-kpi-orange)",
          ]
        : [
            "var(--dmx-kpi-green)",
            "var(--dmx-kpi-green)",
            "var(--dmx-kpi-green)",
            "var(--dmx-kpi-green)",
            "var(--dmx-kpi-green)",
            "var(--dmx-kpi-yellow)",
          ];

  return (
    <svg
      aria-hidden="true"
      className="h-5 w-[62px] shrink-0"
      viewBox="0 0 62 20"
      preserveAspectRatio="none"
    >
      {colors.map((color, index) => (
        <rect
          key={`${color}-${index}`}
          x={index * 10}
          y={tone === "red" ? 4 + index : tone === "orange" ? 5 + (index % 3) : 4}
          width="5"
          height={tone === "red" ? Math.max(4, 15 - index) : 12}
          rx="1.5"
          fill={color}
        />
      ))}
    </svg>
  );
}

function RecoveryHealthTile({
  alias,
  detail,
  href,
  label,
  status,
  tone,
  unit,
  value,
}: {
  alias?: string;
  detail: string;
  href?: string;
  label: string;
  status: string;
  tone: OperationsTone;
  unit?: string;
  value: string | number;
}) {
  const toneClasses = operationToneClasses(tone);
  const body = (
    <div
      className={cn(
        "group relative min-h-[112px] overflow-hidden rounded-[10px] border border-border bg-surface px-4 py-3 transition before:absolute before:inset-y-3 before:left-0 before:w-[3px] before:rounded-r-full hover:border-border-strong",
        toneClasses.border,
      )}
    >
      <div className="flex items-start justify-between gap-3 pl-2">
        <div className="min-w-0">
          <div className="truncate text-[11px] font-medium uppercase tracking-[0.08em] text-text-secondary">
            {label}
          </div>
          {alias ? (
            <div className="mt-0.5 truncate text-[10.5px] text-text-tertiary">
              {alias}
            </div>
          ) : null}
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.04em]",
            toneClasses.status,
          )}
        >
          {status}
        </span>
      </div>
      <div
        className={cn(
          "mt-4 truncate pl-2 text-[24px] font-semibold leading-none text-text",
          tone !== "neutral" ? toneClasses.value : "",
        )}
      >
        {value}
        {unit ? (
          <span className="ml-1 text-[11px] font-medium text-text-tertiary">
            {unit}
          </span>
        ) : null}
      </div>
      <div className="mt-3 truncate pl-2 text-[11px] text-text-secondary">
        {detail}
      </div>
    </div>
  );

  return href ? <Link href={href}>{body}</Link> : body;
}

function RecoveryIntegrationRow({
  detail,
  icon: Icon,
  label,
  tone,
}: {
  detail: string;
  icon: LucideIcon;
  label: string;
  tone: OperationsTone;
}) {
  const toneClasses = operationToneClasses(tone);

  return (
    <div className="flex min-w-0 items-center gap-3 border-b border-border-subtle px-4 py-3 last:border-b-0">
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          toneClasses.icon,
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12px] font-medium text-text">
          {label}
        </div>
        <div
          className={cn(
            "mt-0.5 truncate text-[10.5px] text-text-secondary",
            tone !== "neutral" ? toneClasses.value : "",
          )}
        >
          {detail}
        </div>
      </div>
      <OperationsMiniBars tone={tone} />
      <span
        className={cn("h-2 w-2 shrink-0 rounded-full", toneClasses.dot)}
        aria-hidden="true"
      />
    </div>
  );
}

export default function OperationsPage() {
  const { locale, t } = useI18n();
  const tt = (key: string) => operationsOverrides[locale]?.[key] ?? t(key);
  const copy = (en: string, ru: string, he: string) => {
    if (locale === "ru") return ru;
    if (locale === "he") return he;
    return en;
  };
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const session = useAuthSession();
  const canRunPrivilegedActions = canRunPrivilegedAdminActions(session);
  const [busyAction, setBusyAction] = useState("");
  const [onlyActionable, setOnlyActionable] = useState(
    searchParams?.get("actionable") === "1",
  );
  const [deliveryChannelFilter, setDeliveryChannelFilter] = useState(
    searchParams?.get("delivery_channel")?.trim().toUpperCase() || "",
  );
  const [webhookProviderFilter, setWebhookProviderFilter] = useState(
    searchParams?.get("webhook_provider")?.trim().toLowerCase() || "",
  );
  const [pendingBatchAction, setPendingBatchAction] = useState<
    "retry" | "reconcile" | "outbox-retry" | null
  >(null);
  const [pendingSyncReset, setPendingSyncReset] =
    useState<SyncResetTarget | null>(null);
  const [syncProblemInstallerFilter, setSyncProblemInstallerFilter] =
    useState("all");
  const [syncProblemStatusFilter, setSyncProblemStatusFilter] =
    useState<SyncProblemStatusFilter>("all");
  const [pendingOutboxChannel, setPendingOutboxChannel] = useState<
    string | null
  >(null);
  const [lastBatchResult, setLastBatchResult] =
    useState<OperationsBatchResult | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!actionFeedback || actionFeedback.tone !== "success") {
      return;
    }
    const timeout = window.setTimeout(() => setActionFeedback(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [actionFeedback]);

  const syncQuery = useQuery({
    queryKey: ["operations-sync-health"],
    queryFn: () =>
      apiFetch<SyncHealthSummaryResponse>("/api/v1/admin/sync/health/summary"),
    refetchInterval: 30_000,
  });

  const syncProblemsQuery = useQuery({
    queryKey: [
      "operations-sync-problems",
      syncProblemInstallerFilter,
      syncProblemStatusFilter,
    ],
    queryFn: () => {
      const params = new URLSearchParams({ limit: "25" });
      if (syncProblemInstallerFilter !== "all") {
        params.set("installer_id", syncProblemInstallerFilter);
      }
      if (syncProblemStatusFilter !== "all") {
        params.set("status", syncProblemStatusFilter);
      }
      return apiFetch<SyncProblemsResponse>(
        `/api/v1/admin/sync/problems?${params.toString()}`,
      );
    },
    enabled: Boolean(syncQuery.data?.counts.problem_total),
    refetchInterval: 30_000,
  });

  const outboxSummaryQuery = useQuery({
    queryKey: ["operations-outbox-summary"],
    queryFn: () =>
      apiFetch<OutboxSummaryResponse>("/api/v1/admin/outbox/summary"),
    refetchInterval: 30_000,
  });

  const outboxFailedQuery = useQuery({
    queryKey: ["operations-outbox-failed"],
    queryFn: () =>
      apiFetch<OutboxListResponse>(
        "/api/v1/admin/outbox?status=FAILED&limit=8",
      ),
    refetchInterval: 30_000,
  });

  const failedImportsQuery = useQuery({
    queryKey: ["operations-failed-imports"],
    queryFn: () =>
      apiFetch<FailedImportRunsQueueResponse>(
        "/api/v1/admin/projects/import-runs/failed-queue?limit=8&offset=0",
      ),
    refetchInterval: 30_000,
  });
  const webhookSummaryQuery = useQuery({
    queryKey: ["operations-webhook-signals-summary"],
    queryFn: () =>
      apiFetch<WebhookSignalsSummaryResponse>(
        "/api/v1/admin/outbox/webhook-signals/summary",
      ),
    refetchInterval: 30_000,
  });
  const webhookSignalsQuery = useQuery({
    queryKey: ["operations-webhook-signals"],
    queryFn: () =>
      apiFetch<WebhookSignalsListResponse>(
        "/api/v1/admin/outbox/webhook-signals?limit=6",
      ),
    refetchInterval: 30_000,
  });
  const retryAuditsQuery = useQuery({
    queryKey: ["operations-outbox-retry-audits"],
    queryFn: () =>
      apiFetch<OutboxRetryAuditListResponse>(
        "/api/v1/admin/outbox/retry-audits?limit=6",
      ),
    refetchInterval: 30_000,
  });
  const syncRecoveryAuditsQuery = useQuery({
    queryKey: ["operations-sync-recovery-audits"],
    queryFn: () =>
      apiFetch<AuditChangesResponse>(
        "/api/v1/admin/reports/audit-catalogs?entity_type=sync_state&action=SYNC_STATE_RESET&limit=6",
      ),
    refetchInterval: 30_000,
  });

  const isRefreshing =
    syncQuery.isFetching ||
    syncProblemsQuery.isFetching ||
    outboxSummaryQuery.isFetching ||
    outboxFailedQuery.isFetching ||
    failedImportsQuery.isFetching ||
    webhookSummaryQuery.isFetching ||
    webhookSignalsQuery.isFetching ||
    retryAuditsQuery.isFetching ||
    syncRecoveryAuditsQuery.isFetching;

  const hasError =
    syncQuery.isError ||
    syncProblemsQuery.isError ||
    outboxSummaryQuery.isError ||
    outboxFailedQuery.isError ||
    failedImportsQuery.isError ||
    webhookSummaryQuery.isError ||
    webhookSignalsQuery.isError ||
    retryAuditsQuery.isError ||
    syncRecoveryAuditsQuery.isError;

  const sync = syncQuery.data;
  const syncProblems = useMemo(
    () => syncProblemsQuery.data?.items || [],
    [syncProblemsQuery.data?.items],
  );
  const syncProblemInstallerOptions = useMemo(() => {
    const options = new Map<string, string>();
    for (const item of [
      ...(sync?.top_laggers || []),
      ...(sync?.top_offline || []),
    ]) {
      if (!options.has(item.installer_id)) {
        options.set(item.installer_id, syncInstallerLabel(item));
      }
    }
    for (const problem of syncProblems) {
      const key = problem.installer_id || problem.user_id || "unknown";
      if (!options.has(key)) {
        options.set(key, syncProblemInstallerLabel(problem));
      }
    }
    if (
      syncProblemInstallerFilter !== "all" &&
      !options.has(syncProblemInstallerFilter)
    ) {
      options.set(syncProblemInstallerFilter, syncProblemInstallerFilter);
    }
    return [...options.entries()].map(([value, label]) => ({ value, label }));
  }, [sync, syncProblemInstallerFilter, syncProblems]);
  const visibleSyncProblems = useMemo(
    () =>
      syncProblems.filter((problem) => {
        const installerKey =
          problem.installer_id || problem.user_id || "unknown";
        const installerMatches =
          syncProblemInstallerFilter === "all" ||
          installerKey === syncProblemInstallerFilter;
        const statusMatches =
          syncProblemStatusFilter === "all" ||
          syncProblemStatusBucket(problem) === syncProblemStatusFilter;
        return installerMatches && statusMatches;
      }),
    [syncProblemInstallerFilter, syncProblemStatusFilter, syncProblems],
  );
  const outboxSummary = outboxSummaryQuery.data;
  const failedOutbox = useMemo(
    () => outboxFailedQuery.data?.items || [],
    [outboxFailedQuery.data?.items],
  );
  const failedImports = useMemo(
    () => failedImportsQuery.data?.items || [],
    [failedImportsQuery.data?.items],
  );
  const webhookSummary = webhookSummaryQuery.data;
  const webhookSignals = useMemo(
    () => webhookSignalsQuery.data?.items || [],
    [webhookSignalsQuery.data?.items],
  );
  const retryAudits = retryAuditsQuery.data?.items || [];
  const syncRecoveryAudits = syncRecoveryAuditsQuery.data?.items || [];
  const loadErrorMessage = readableApiError(
    syncQuery.error ||
      syncProblemsQuery.error ||
      outboxSummaryQuery.error ||
      outboxFailedQuery.error ||
      failedImportsQuery.error ||
      webhookSummaryQuery.error ||
      webhookSignalsQuery.error ||
      retryAuditsQuery.error ||
      syncRecoveryAuditsQuery.error,
    locale,
    t("operations.error"),
  );
  const freshnessTimestamp = useMemo(() => {
    const timestamps = [
      syncQuery.dataUpdatedAt,
      syncProblemsQuery.dataUpdatedAt,
      outboxSummaryQuery.dataUpdatedAt,
      outboxFailedQuery.dataUpdatedAt,
      failedImportsQuery.dataUpdatedAt,
      webhookSummaryQuery.dataUpdatedAt,
      webhookSignalsQuery.dataUpdatedAt,
      retryAuditsQuery.dataUpdatedAt,
      syncRecoveryAuditsQuery.dataUpdatedAt,
    ].filter((value) => value > 0);
    if (timestamps.length === 0) {
      return null;
    }
    return Math.min(...timestamps);
  }, [
    failedImportsQuery.dataUpdatedAt,
    outboxFailedQuery.dataUpdatedAt,
    outboxSummaryQuery.dataUpdatedAt,
    retryAuditsQuery.dataUpdatedAt,
    syncRecoveryAuditsQuery.dataUpdatedAt,
    syncQuery.dataUpdatedAt,
    syncProblemsQuery.dataUpdatedAt,
    webhookSignalsQuery.dataUpdatedAt,
    webhookSummaryQuery.dataUpdatedAt,
  ]);
  const freshnessAgeMs = freshnessTimestamp
    ? Date.now() - freshnessTimestamp
    : null;
  const freshnessState = isRefreshing
    ? "refreshing"
    : hasError
      ? "degraded"
      : freshnessAgeMs !== null && freshnessAgeMs > 120_000
        ? "stale"
        : "fresh";
  const syncItems = useMemo(
    () =>
      sync
        ? sync.top_laggers.length
          ? sync.top_laggers
          : sync.top_offline
        : [],
    [sync],
  );
  const actionableFailedImports = useMemo(
    () => failedImports.filter((item) => item.retry_available),
    [failedImports],
  );
  const channelScopedFailedOutbox = useMemo(
    () =>
      failedOutbox.filter(
        (item) =>
          !deliveryChannelFilter ||
          item.channel.toUpperCase() === deliveryChannelFilter,
      ),
    [deliveryChannelFilter, failedOutbox],
  );
  const actionableFailedOutbox = useMemo(
    () => channelScopedFailedOutbox,
    [channelScopedFailedOutbox],
  );
  const actionableSyncItems = useMemo(
    () =>
      syncItems.filter((item) => {
        const status = item.status.trim().toLowerCase();
        return (
          status === "danger" ||
          status === "dead" ||
          item.lag > 0 ||
          item.days_offline > 0
        );
      }),
    [syncItems],
  );
  const visibleFailedImports = onlyActionable
    ? actionableFailedImports
    : failedImports;
  const visibleFailedOutbox = onlyActionable
    ? actionableFailedOutbox
    : channelScopedFailedOutbox;
  const visibleWebhookSignals = useMemo(
    () =>
      webhookSignals.filter(
        (item) =>
          !webhookProviderFilter ||
          item.provider.toLowerCase() === webhookProviderFilter,
      ),
    [webhookProviderFilter, webhookSignals],
  );
  const visibleSyncItems = onlyActionable ? actionableSyncItems : syncItems;
  const deliveryChannelGroups = useMemo(() => {
    const grouped = new Map<
      string,
      {
        channel: string;
        count: number;
        firstOutboxId: string;
        recipients: string[];
      }
    >();
    for (const item of failedOutbox) {
      const channel = item.channel.toUpperCase();
      const existing = grouped.get(channel);
      if (existing) {
        existing.count += 1;
        if (item.recipient) {
          existing.recipients.push(item.recipient);
        }
        continue;
      }
      grouped.set(channel, {
        channel,
        count: 1,
        firstOutboxId: item.id,
        recipients: item.recipient ? [item.recipient] : [],
      });
    }
    return [...grouped.values()];
  }, [failedOutbox]);
  const visibleDeliveryChannelGroups = useMemo(
    () =>
      deliveryChannelFilter
        ? deliveryChannelGroups.filter(
            (group) => group.channel === deliveryChannelFilter,
          )
        : deliveryChannelGroups,
    [deliveryChannelFilter, deliveryChannelGroups],
  );
  const webhookProviderGroups = useMemo(() => {
    const grouped = new Map<
      string,
      {
        provider: string;
        count: number;
        duplicateCount: number;
        unmatchedCount: number;
        providerFailedCount: number;
      }
    >();
    for (const item of webhookSignals) {
      const key = item.provider.toLowerCase();
      const existing = grouped.get(key) || {
        provider: item.provider,
        count: 0,
        duplicateCount: 0,
        unmatchedCount: 0,
        providerFailedCount: 0,
      };
      existing.count += 1;
      if (item.result === "duplicate") {
        existing.duplicateCount += 1;
      }
      if (
        item.result === "message_not_found" ||
        item.result === "channel_mismatch"
      ) {
        existing.unmatchedCount += 1;
      }
      if (
        item.status &&
        [
          "failed",
          "undelivered",
          "bounced",
          "bounce",
          "dropped",
          "blocked",
          "rejected",
          "complained",
          "error",
        ].includes(item.status.toLowerCase())
      ) {
        existing.providerFailedCount += 1;
      }
      grouped.set(key, existing);
    }
    return [...grouped.values()];
  }, [webhookSignals]);
  const visibleWebhookProviderGroups = useMemo(
    () =>
      webhookProviderFilter
        ? webhookProviderGroups.filter(
            (group) => group.provider.toLowerCase() === webhookProviderFilter,
          )
        : webhookProviderGroups,
    [webhookProviderFilter, webhookProviderGroups],
  );
  const actionableImportProjectIds = useMemo(
    () =>
      Array.from(
        new Set(
          actionableFailedImports
            .map((item) => item.project_id)
            .filter(Boolean),
        ),
      ),
    [actionableFailedImports],
  );
  const actionSummary = useMemo(
    () =>
      summarizeActions({
        actionableImports: actionableFailedImports.length,
        actionableOutbox: actionableFailedOutbox.length,
        actionableSync: actionableSyncItems.length,
        firstImportProjectName:
          actionableFailedImports[0]?.project_name || null,
        firstOutboxRecipient:
          actionableFailedOutbox[0]?.recipient ||
          actionableFailedOutbox[0]?.subject ||
          actionableFailedOutbox[0]?.channel ||
          null,
        firstSyncInstallerLabel: actionableSyncItems[0]
          ? syncInstallerLabel(actionableSyncItems[0])
          : null,
        t,
      }),
    [actionableFailedImports, actionableFailedOutbox, actionableSyncItems, t],
  );
  const failedImportProjectIds = useMemo(
    () =>
      Array.from(
        new Set(
          visibleFailedImports.map((item) => item.project_id).filter(Boolean),
        ),
      ),
    [visibleFailedImports],
  );
  const failedImportsHref = useMemo(
    () => buildProjectsImportHref(null, failedImportProjectIds),
    [failedImportProjectIds],
  );
  const batchResultProjectIds = useMemo(
    () => extractBatchProjectIds(lastBatchResult),
    [lastBatchResult],
  );
  const batchResultOutboxIds = useMemo(
    () => extractBatchOutboxIds(lastBatchResult),
    [lastBatchResult],
  );
  const outboxRetryScope = useMemo(
    () =>
      pendingOutboxChannel
        ? actionableFailedOutbox.filter(
            (item) => item.channel.toUpperCase() === pendingOutboxChannel,
          )
        : actionableFailedOutbox,
    [actionableFailedOutbox, pendingOutboxChannel],
  );
  const batchResultFollowupHref = useMemo(() => {
    if (lastBatchResult?.action === "outbox-retry") {
      return buildDeliveryReportHref({
        outboxId: batchResultOutboxIds[0],
      });
    }
    return batchResultProjectIds.length > 0
      ? buildProjectsImportHref(null, batchResultProjectIds)
      : "/projects?only_failed_runs=1";
  }, [batchResultOutboxIds, batchResultProjectIds, lastBatchResult]);

  const cards = useMemo(
    () => [
      {
        label: "Sync danger",
        value: onlyActionable
          ? visibleSyncItems.length
          : (sync?.counts.danger ?? 0),
        note: sync
          ? `${sync.counts.danger_pct.toFixed(1)}% of ${sync.counts.total} installers`
          : "Sync health pending",
        icon: ShieldAlert,
        tone:
          (onlyActionable
            ? visibleSyncItems.length
            : (sync?.counts.danger ?? 0)) > 0
            ? "danger"
            : "success",
      },
      {
        label: "Failed imports",
        value: onlyActionable
          ? visibleFailedImports.length
          : (failedImportsQuery.data?.total ?? 0),
        note:
          visibleFailedImports.length > 0
            ? visibleFailedImports[0]?.project_name
            : onlyActionable
              ? "No actionable imports"
              : "No failed imports",
        icon: ServerCrash,
        tone:
          (onlyActionable
            ? visibleFailedImports.length
            : (failedImportsQuery.data?.total ?? 0)) > 0
            ? "danger"
            : "success",
      },
      {
        label: "Failed outbox",
        value: onlyActionable
          ? visibleFailedOutbox.length
          : (outboxSummary?.failed_total ?? 0),
        note: outboxSummary
          ? compactMap(outboxSummary.by_channel)
          : "No outbox data",
        icon: Siren,
        tone:
          (onlyActionable
            ? visibleFailedOutbox.length
            : (outboxSummary?.failed_total ?? 0)) > 0
            ? "danger"
            : "success",
      },
      {
        label: "Pending > 15m",
        value: outboxSummary?.pending_overdue_15m ?? 0,
        note: outboxSummary
          ? compactMap(outboxSummary.by_delivery_status)
          : "No queue data",
        icon: TimerReset,
        tone:
          (outboxSummary?.pending_overdue_15m ?? 0) > 0 ? "warning" : "neutral",
      },
    ],
    [
      failedImportsQuery.data?.total,
      onlyActionable,
      outboxSummary,
      sync,
      visibleFailedImports,
      visibleFailedOutbox.length,
      visibleSyncItems.length,
    ],
  );

  async function refetchAll() {
    await Promise.all([
      syncQuery.refetch(),
      syncProblemsQuery.refetch(),
      outboxSummaryQuery.refetch(),
      outboxFailedQuery.refetch(),
      failedImportsQuery.refetch(),
      webhookSummaryQuery.refetch(),
      webhookSignalsQuery.refetch(),
      retryAuditsQuery.refetch(),
      syncRecoveryAuditsQuery.refetch(),
    ]);
  }

  async function handleRetryImport(runId: string, projectId: string) {
    if (!canRunPrivilegedActions) {
      return;
    }
    setBusyAction(`import:${runId}`);
    setActionFeedback(null);
    try {
      await apiFetch(
        `/api/v1/admin/projects/${projectId}/doors/import-runs/${runId}/retry`,
        {
          method: "POST",
        },
      );
      await refetchAll();
      setActionFeedback({
        tone: "success",
        message: copy(
          `Import run ${runId} is back in processing.`,
          "\u0418\u043c\u043f\u043e\u0440\u0442 ${runId} \u0441\u043d\u043e\u0432\u0430 \u0432 \u043e\u0431\u0440\u0430\u0431\u043e\u0442\u043a\u0435.",
          "\u05d9\u05d9\u05d1\u05d5\u05d0 ${runId} \u05d7\u05d6\u05e8 \u05dc\u05e2\u05d9\u05d1\u05d5\u05d3.",
        ),
      });
    } catch (error) {
      setActionFeedback({
        tone: "error",
        message: readableApiError(
          error,
          locale,
          locale === "ru"
            ? "Не удалось повторно запустить импорт."
            : locale === "he"
              ? "לא ניתן להפעיל מחדש את ריצת הייבוא."
              : "Failed to retry import run",
        ),
      });
    } finally {
      setBusyAction("");
    }
  }

  async function handleRetryOutbox(outboxId: string) {
    if (!canRunPrivilegedActions) {
      return;
    }
    setBusyAction(`outbox:${outboxId}`);
    setActionFeedback(null);
    try {
      await apiFetch(`/api/v1/admin/outbox/${outboxId}/retry`, {
        method: "POST",
        body: JSON.stringify({
          reason: "operations_center_manual_retry",
        }),
      });
      await refetchAll();
      setActionFeedback({
        tone: "success",
        message: copy(
          `Delivery item ${outboxId} is back in queue.`,
          "\u042d\u043b\u0435\u043c\u0435\u043d\u0442 \u0434\u043e\u0441\u0442\u0430\u0432\u043a\u0438 ${outboxId} \u0441\u043d\u043e\u0432\u0430 \u0432 \u043e\u0447\u0435\u0440\u0435\u0434\u0438.",
          "\u05e4\u05e8\u05d9\u05d8 \u05d4\u05de\u05e9\u05dc\u05d5\u05d7 ${outboxId} \u05d7\u05d6\u05e8 \u05dc\u05ea\u05d5\u05e8.",
        ),
      });
    } catch (error) {
      setActionFeedback({
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

  async function handleResetSyncTarget(target: SyncResetTarget) {
    if (!canRunPrivilegedActions) {
      return;
    }

    setBusyAction(target.busyKey);
    setActionFeedback(null);
    try {
      await apiFetch(target.resetPath, {
        method: "POST",
      });
      await refetchAll();
      setActionFeedback({
        tone: "success",
        message: `Cold resync requested for ${target.label}.`,
      });
    } catch (error) {
      setActionFeedback({
        tone: "error",
        message: readableApiError(
          error,
          locale,
          "Failed to request cold resync.",
        ),
      });
    } finally {
      setBusyAction("");
      setPendingSyncReset(null);
    }
  }

  async function handleRetryAllImports() {
    if (!canRunPrivilegedActions || actionableFailedImports.length === 0) {
      return;
    }
    setBusyAction("imports:bulk");
    setActionFeedback(null);
    try {
      const response = await apiFetch<RetryFailedRunsResponse>(
        "/api/v1/admin/projects/import-runs/retry-failed",
        {
          method: "POST",
          body: JSON.stringify({
            run_ids: actionableFailedImports.map((item) => item.run_id),
          }),
        },
      );
      await refetchAll();
      setLastBatchResult({
        action: "retry",
        createdAt: new Date().toISOString(),
        successful: response.successful_runs,
        failed: response.failed_runs,
        skipped: response.skipped_runs,
        scope: actionableFailedImports.length,
        items: response.items || [],
      });
      setActionFeedback({
        tone: response.failed_runs > 0 ? "error" : "success",
        message: copy(
          `Import retry finished: ${response.successful_runs} succeeded, ${response.failed_runs} failed, ${response.skipped_runs} skipped.`,
          "\u041f\u043e\u0432\u0442\u043e\u0440 \u0438\u043c\u043f\u043e\u0440\u0442\u0430 \u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043d: \u0443\u0441\u043f\u0435\u0448\u043d\u043e ${response.successful_runs}, \u043e\u0448\u0438\u0431\u043e\u043a ${response.failed_runs}, \u043f\u0440\u043e\u043f\u0443\u0449\u0435\u043d\u043e ${response.skipped_runs}.",
          "\u05e0\u05d9\u05e1\u05d9\u05d5\u05df \u05d4\u05d9\u05d9\u05d1\u05d5\u05d0 \u05d4\u05e1\u05ea\u05d9\u05d9\u05dd: ${response.successful_runs} \u05d4\u05e6\u05dc\u05d9\u05d7\u05d5, ${response.failed_runs} \u05e0\u05db\u05e9\u05dc\u05d5, ${response.skipped_runs} \u05d3\u05d5\u05dc\u05d2\u05d5.",
        ),
      });
    } catch (error) {
      setActionFeedback({
        tone: "error",
        message: readableApiError(
          error,
          locale,
          locale === "ru"
            ? "Не удалось повторить проблемные импорты."
            : locale === "he"
              ? "לא ניתן לנסות שוב את הייבואים הדורשים טיפול."
              : "Failed to retry actionable imports",
        ),
      });
    } finally {
      setBusyAction("");
      setPendingBatchAction(null);
    }
  }

  async function handleReconcileActionableProjects() {
    if (!canRunPrivilegedActions || actionableImportProjectIds.length === 0) {
      return;
    }
    setBusyAction("imports:reconcile");
    setActionFeedback(null);
    try {
      const response = await apiFetch<BulkReconcileResponse>(
        "/api/v1/admin/projects/import-runs/reconcile-latest",
        {
          method: "POST",
          body: JSON.stringify({
            project_ids: actionableImportProjectIds,
            only_failed_runs: true,
          }),
        },
      );
      await refetchAll();
      setLastBatchResult({
        action: "reconcile",
        createdAt: new Date().toISOString(),
        successful: response.successful_projects,
        failed: response.failed_projects,
        skipped: response.skipped_projects,
        scope: actionableImportProjectIds.length,
        items: response.items || [],
      });
      setActionFeedback({
        tone: response.failed_projects > 0 ? "error" : "success",
        message: copy(
          `Project reconcile finished: ${response.successful_projects} updated, ${response.failed_projects} failed, ${response.skipped_projects} skipped.`,
          "\u0421\u0432\u0435\u0440\u043a\u0430 \u043f\u0440\u043e\u0435\u043a\u0442\u043e\u0432 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u0430: \u043e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u043e ${response.successful_projects}, \u043e\u0448\u0438\u0431\u043e\u043a ${response.failed_projects}, \u043f\u0440\u043e\u043f\u0443\u0449\u0435\u043d\u043e ${response.skipped_projects}.",
          "\u05d4\u05ea\u05d0\u05de\u05ea \u05d4\u05e4\u05e8\u05d5\u05d9\u05e7\u05d8\u05d9\u05dd \u05d4\u05e1\u05ea\u05d9\u05d9\u05de\u05d4: ${response.successful_projects} \u05e2\u05d5\u05d3\u05db\u05e0\u05d5, ${response.failed_projects} \u05e0\u05db\u05e9\u05dc\u05d5, ${response.skipped_projects} \u05d3\u05d5\u05dc\u05d2\u05d5.",
        ),
      });
    } catch (error) {
      setActionFeedback({
        tone: "error",
        message: readableApiError(
          error,
          locale,
          locale === "ru"
            ? "Не удалось выполнить сверку проблемных проектов."
            : locale === "he"
              ? "לא ניתן לבצע התאמה לפרויקטים הדורשים טיפול."
              : "Failed to reconcile actionable projects",
        ),
      });
    } finally {
      setBusyAction("");
      setPendingBatchAction(null);
    }
  }

  async function handleRetryAllOutbox() {
    if (!canRunPrivilegedActions || outboxRetryScope.length === 0) {
      return;
    }
    setBusyAction("outbox:bulk");
    setActionFeedback(null);
    try {
      const response = await apiFetch<BulkOutboxRetryResponse>(
        "/api/v1/admin/outbox/retry-failed",
        {
          method: "POST",
          body: JSON.stringify({
            outbox_ids: outboxRetryScope.map((item) => item.id),
            reason: "operations_center_bulk_retry",
          }),
        },
      );
      await refetchAll();
      setLastBatchResult({
        action: "outbox-retry",
        createdAt: new Date().toISOString(),
        successful: response.successful_messages,
        failed: response.failed_messages,
        skipped: response.skipped_messages,
        scope: outboxRetryScope.length,
        items: response.items || [],
      });
      setActionFeedback({
        tone: response.failed_messages > 0 ? "error" : "success",
        message: copy(
          `Delivery retry finished: ${response.successful_messages} succeeded, ${response.failed_messages} failed, ${response.skipped_messages} skipped.`,
          "\u041f\u043e\u0432\u0442\u043e\u0440 \u0434\u043e\u0441\u0442\u0430\u0432\u043a\u0438 \u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043d: \u0443\u0441\u043f\u0435\u0448\u043d\u043e ${response.successful_messages}, \u043e\u0448\u0438\u0431\u043e\u043a ${response.failed_messages}, \u043f\u0440\u043e\u043f\u0443\u0449\u0435\u043d\u043e ${response.skipped_messages}.",
          "\u05e0\u05d9\u05e1\u05d9\u05d5\u05df \u05d4\u05de\u05e9\u05dc\u05d5\u05d7 \u05d4\u05e1\u05ea\u05d9\u05d9\u05dd: ${response.successful_messages} \u05d4\u05e6\u05dc\u05d9\u05d7\u05d5, ${response.failed_messages} \u05e0\u05db\u05e9\u05dc\u05d5, ${response.skipped_messages} \u05d3\u05d5\u05dc\u05d2\u05d5.",
        ),
      });
    } catch (error) {
      setActionFeedback({
        tone: "error",
        message: readableApiError(
          error,
          locale,
          locale === "ru"
            ? "Не удалось повторить проблемные доставки."
            : locale === "he"
              ? "לא ניתן לנסות שוב את המשלוחים הדורשים טיפול."
              : "Failed to retry actionable delivery",
        ),
      });
    } finally {
      setBusyAction("");
      setPendingBatchAction(null);
      setPendingOutboxChannel(null);
    }
  }

  function batchActionLabel(): string {
    if (pendingBatchAction === "retry") {
      return "Retry actionable imports";
    }
    if (pendingBatchAction === "outbox-retry") {
      return pendingOutboxChannel
        ? `Retry actionable ${pendingOutboxChannel} delivery failures`
        : "Retry actionable delivery failures";
    }
    if (pendingBatchAction === "reconcile") {
      return "Reconcile actionable projects";
    }
    return "";
  }

  function batchActionDescription(): string {
    if (pendingBatchAction === "retry") {
      return `This will retry ${actionableFailedImports.length} actionable import runs across ${actionableImportProjectIds.length} projects.`;
    }
    if (pendingBatchAction === "outbox-retry") {
      return pendingOutboxChannel
        ? `This will retry ${outboxRetryScope.length} failed ${pendingOutboxChannel} outbox messages and write recovery audit entries.`
        : `This will retry ${outboxRetryScope.length} failed outbox messages and write recovery audit entries.`;
    }
    if (pendingBatchAction === "reconcile") {
      return `This will reconcile latest failed import state for ${actionableImportProjectIds.length} actionable projects.`;
    }
    return "";
  }

  async function confirmBatchAction() {
    if (pendingBatchAction === "retry") {
      await handleRetryAllImports();
      return;
    }
    if (pendingBatchAction === "outbox-retry") {
      await handleRetryAllOutbox();
      return;
    }
    if (pendingBatchAction === "reconcile") {
      await handleReconcileActionableProjects();
    }
  }

  function syncUrlState(params: {
    nextOnlyActionable?: boolean;
    nextDeliveryChannel?: string;
    nextWebhookProvider?: string;
  }) {
    const nextParams = new URLSearchParams(searchParams?.toString() || "");
    nextParams.delete("actionable");
    nextParams.delete("delivery_channel");
    nextParams.delete("webhook_provider");
    if (params.nextOnlyActionable) {
      nextParams.set("actionable", "1");
    }
    if (params.nextDeliveryChannel) {
      nextParams.set("delivery_channel", params.nextDeliveryChannel);
    }
    if (params.nextWebhookProvider) {
      nextParams.set("webhook_provider", params.nextWebhookProvider);
    }
    const nextQuery = nextParams.toString();
    const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;
    window.history.replaceState(window.history.state, "", nextUrl);
  }

  const failedDeliveryTotal = onlyActionable
    ? visibleFailedOutbox.length
    : (outboxSummary?.failed_total ?? 0);
  const failedImportTotal = onlyActionable
    ? visibleFailedImports.length
    : (failedImportsQuery.data?.total ?? 0);
  const syncQueuePressure =
    (sync?.counts.queue_pending ?? 0) +
    (sync?.counts.queue_conflicts ?? 0) +
    (sync?.counts.queue_blocked ?? 0) +
    (sync?.counts.queue_auth_required ?? 0);
  const syncQueueInstallerCount = syncItems.filter(
    (item) =>
      (item.queue_pending ?? 0) +
        (item.queue_conflicts ?? 0) +
        (item.queue_blocked ?? 0) +
        (item.queue_auth_required ?? 0) >
        0 ||
      item.lag > 0 ||
      item.days_offline > 0,
  ).length;
  const webhookIssueTotal =
    (webhookSummary?.provider_failed_total ?? 0) +
    (webhookSummary?.unmatched_total ?? 0);
  const manualReviewCount = visibleSyncProblems.filter(
    (item) => item.manual_review_required,
  ).length;
  const actionableRecoveryCount =
    actionableFailedImports.length + actionableFailedOutbox.length;
  const importsPendingReconciliation = actionableImportProjectIds.length;
  const activeIncidentCount =
    failedDeliveryTotal +
    failedImportTotal +
    (sync?.counts.problem_total ?? visibleSyncProblems.length) +
    webhookIssueTotal;
  const recoveryStatusTone: OperationsTone =
    hasError || failedDeliveryTotal > 0
      ? "red"
      : activeIncidentCount > 0
        ? "orange"
        : "green";
  const recoveryStatusLabel =
    recoveryStatusTone === "green"
      ? "System nominal"
      : recoveryStatusTone === "orange"
        ? `System degraded · ${activeIncidentCount} incidents`
        : `System degraded · ${activeIncidentCount} incidents`;
  const freshnessValue =
    freshnessState === "fresh"
      ? "fresh"
      : freshnessState === "stale"
        ? "stale"
        : freshnessState === "degraded"
          ? "degraded"
          : "refreshing";
  const recoveryIncidents: RecoveryIncident[] = [
    ...visibleFailedOutbox.slice(0, 3).map((item) => ({
      id: `delivery-${item.id}`,
      title: `${item.channel} delivery failed`,
      detail: `${item.recipient || item.subject || "outbox item"} · ${item.attempts}/${item.max_attempts} attempts · ${item.last_error || "no error payload"}`,
      priority: "P1",
      kind: "delivery",
      tone: "red" as OperationsTone,
      icon: MessageCircle,
      age: formatDateTime(item.created_at),
      actionLabel: "Recover delivery",
      disabled:
        !canRunPrivilegedActions || busyAction === `outbox:${item.id}`,
      onAction: () => {
        void handleRetryOutbox(item.id);
      },
      href: buildDeliveryReportHref({
        outboxId: item.id,
        deliveryChannel: item.channel.toUpperCase(),
      }),
    })),
    ...visibleFailedImports.slice(0, 2).map((item) => ({
      id: `import-${item.run_id}`,
      title: `${item.project_name} import failed`,
      detail: `${item.source_filename || "manual import"} · rows ${item.parsed_rows} · errors ${item.errors_count} · ${item.last_error || "no error payload"}`,
      priority: item.errors_count > 0 ? "P2" : "P3",
      kind: "import",
      tone: "orange" as OperationsTone,
      icon: FileSpreadsheet,
      age: formatDateTime(item.created_at),
      actionLabel: item.retry_available ? "Recover import" : "Open import",
      disabled:
        !item.retry_available ||
        !canRunPrivilegedActions ||
        busyAction === `import:${item.run_id}`,
      onAction: item.retry_available
        ? () => {
            void handleRetryImport(item.run_id, item.project_id);
          }
        : undefined,
      href: buildProjectsImportHref(item.project_id, [item.project_id]),
    })),
    ...visibleWebhookSignals
      .filter(
        (item) =>
          item.error ||
          item.status?.toLowerCase() === "failed" ||
          item.result === "message_not_found" ||
          item.result === "channel_mismatch",
      )
      .slice(0, 2)
      .map((item) => ({
        id: `webhook-${item.id}`,
        title: `${item.provider} webhook signal`,
        detail: `${item.event_type} · ${item.result}${item.status ? ` · ${item.status}` : ""}${item.error ? ` · ${item.error}` : ""}`,
        priority: "P2",
        kind: "webhook",
        tone: "orange" as OperationsTone,
        icon: Webhook,
        age: formatDateTime(item.created_at),
        actionLabel: "Details",
        disabled: false,
        href: buildDeliveryReportHref({
          outboxId: item.outbox_id || undefined,
          webhookProvider: item.provider.toLowerCase(),
        }),
      })),
    ...visibleSyncProblems.slice(0, 3).map((problem) => {
      const resetTarget = syncProblemResetTarget(problem);
      return {
        id: `sync-problem-${problem.id}`,
        title: `${syncProblemInstallerLabel(problem)} sync issue`,
        detail: `${problem.problem_title || problem.status} · ${readableConflictCode(problem.conflict_code || problem.problem_code || null, locale)} · ${problem.operator_action || problem.error || "manual review required"}`,
        priority: problem.manual_review_required ? "P2" : "P3",
        kind: "sync",
        tone: problem.manual_review_required
          ? ("orange" as OperationsTone)
          : ("blue" as OperationsTone),
        icon: ShieldAlert,
        age: formatDateTime(problem.created_at),
        actionLabel: resetTarget ? "Request resync" : "Details",
        disabled: !resetTarget || !canRunPrivilegedActions,
        onAction: resetTarget
          ? () => {
              setPendingSyncReset(resetTarget);
            }
          : undefined,
        href: "/installers",
      };
    }),
  ].slice(0, 7);
  const hasRecoveryIncidents = recoveryIncidents.length > 0;
  const recoveryIntegrations = [
    {
      label: "WhatsApp / delivery outbox",
      detail:
        failedDeliveryTotal > 0
          ? `degraded · ${failedDeliveryTotal} failed deliveries`
          : "nominal · delivery queue clean",
      tone: failedDeliveryTotal > 0 ? ("red" as OperationsTone) : ("green" as OperationsTone),
      icon: MessageCircle,
    },
    {
      label: "Email / SMTP",
      detail: `${outboxSummary?.by_channel.EMAIL ?? 0} queued signals · ${outboxSummary?.pending_overdue_15m ?? 0} overdue`,
      tone:
        (outboxSummary?.pending_overdue_15m ?? 0) > 0
          ? ("orange" as OperationsTone)
          : ("green" as OperationsTone),
      icon: Mail,
    },
    {
      label: "Delivery webhooks",
      detail:
        webhookIssueTotal > 0
          ? `${webhookIssueTotal} provider/unmatched signals`
          : `${webhookSummary?.total_received ?? 0} signals in ${webhookSummary?.window_hours ?? 24}h`,
      tone: webhookIssueTotal > 0 ? ("orange" as OperationsTone) : ("green" as OperationsTone),
      icon: Webhook,
    },
    {
      label: "Door file imports",
      detail:
        failedImportTotal > 0
          ? `${failedImportTotal} failed runs need recovery`
          : "clean · no failed import runs",
      tone: failedImportTotal > 0 ? ("orange" as OperationsTone) : ("green" as OperationsTone),
      icon: FileSpreadsheet,
    },
    {
      label: "Mobile offline sync",
      detail:
        syncQueuePressure > 0
          ? `${syncQueuePressure} queued/conflict actions`
          : "nominal · no queue pressure",
      tone: syncQueuePressure > 0 ? ("orange" as OperationsTone) : ("green" as OperationsTone),
      icon: Zap,
    },
  ];

  return (
    <DashboardLayout>
      <div className="page-shell page-stack-tight motion-stagger">
        <section
          data-testid="operations-recovery-center"
          className="overflow-hidden rounded-[14px] border border-border bg-app text-[13px] shadow-sm"
        >
          <div className="flex items-center gap-3 border-b border-border bg-app px-4 py-3">
            <div className="rounded-full bg-text px-3 py-1 text-[11px] font-semibold tracking-[0.12em] text-accent">
              DIMAX
            </div>
            <div className="min-w-0 flex-1 truncate text-center text-[11px] font-medium uppercase tracking-[0.14em] text-text-secondary">
              {copy("DIMAX GROUP · OPERATIONS", "ГРУППА DIMAX · ОПЕРАЦИИ", "DIMAX GROUP · פעולות")}
            </div>
            <div className="flex items-center gap-2 text-text-secondary">
              <Bell className="h-4 w-4" />
              <Activity className="h-4 w-4" />
            </div>
          </div>

          <div className="space-y-4 p-4">
            <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-link">
              {copy("Dashboard", "Главная", "ראשי")} <span className="mx-1 text-text-tertiary">#</span>{" "}
              <b className="font-medium text-text">{copy("Operations Center", "Операционный центр", "מרכז מבצעים")}</b>
            </div>

            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-[24px] font-semibold leading-tight text-text">
                    {copy("Operations recovery", "Восстановление операций", "שחזור תפעולי")}
                  </h1>
                  <span
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11.5px] font-medium",
                      operationToneClasses(recoveryStatusTone).status,
                    )}
                  >
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        operationToneClasses(recoveryStatusTone).dot,
                      )}
                    />
                    {recoveryStatusLabel}
                  </span>
                </div>
                <div className="mt-2 text-[12.5px] text-text-secondary">
                  <b className="font-medium text-text">
                    {activeIncidentCount}
                  </b>{" "}
                  {copy("incidents need attention ·", "инциденты требуют внимания ·", "דורשות התייחסות ·")}{" "}
                  <b className="font-medium text-text">
                    {importsPendingReconciliation}
                  </b>{" "}
                  {copy("imports pending reconciliation · last scan", "импорт в ожидании сверки · последнее сканирование", "ייבוא בהמתנה לפיוס · סריקה אחרונה")}{" "}
                  <b className="font-medium text-text">
                    {describeAgeMinutes(freshnessTimestamp, Date.now(), t)}
                  </b>{" "}
                  {copy("· delivery lane", "· канал отправки", "· ערוץ שליחה")}{" "}
                  <b className="font-medium text-text">
                    {deliveryChannelFilter || t("common.all")}
                  </b>{" "}
                  {copy("· provider", "· провайдер", "· ספק")}{" "}
                  <b className="font-medium text-text">
                    {webhookProviderFilter || t("common.all")}
                  </b>{" "}
                  · <b className="font-medium text-text">{manualReviewCount}</b>{" "}
                  {copy("manual review", "проверка вручную", "סקירה ידנית")}
                </div>
              </div>

              <div className="flex flex-wrap justify-start gap-2 sm:justify-end">
                <Link href="/settings" className="dmx-secondary-action">
                  <Bell className="h-4 w-4" />
                  {copy("Alerts config", "Конфигурация оповещений", "תצורת התראות")}
                </Link>
                <Link
                  href="/reports?focus=operations"
                  className="dmx-secondary-action"
                >
                  <ClipboardList className="h-4 w-4" />
                  {copy("Incident log", "Журнал инцидентов", "יומן תקריות")}
                </Link>
                <button
                  type="button"
                  onClick={() =>
                    setOnlyActionable((value) => {
                      const nextValue = !value;
                      syncUrlState({
                        nextOnlyActionable: nextValue,
                        nextDeliveryChannel: deliveryChannelFilter,
                        nextWebhookProvider: webhookProviderFilter,
                      });
                      return nextValue;
                    })
                  }
                  aria-pressed={onlyActionable}
                  className="dmx-secondary-action aria-[pressed=true]:border-accent aria-[pressed=true]:bg-accent aria-[pressed=true]:text-accent-foreground"
                >
                  {t("operations.onlyActionable")}
                </button>
                <button
                  type="button"
                  aria-label={isRefreshing ? t("common.refreshing") : t("common.refresh")}
                  onClick={() => {
                    void refetchAll();
                  }}
                  className="dmx-primary-action disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isRefreshing}
                >
                  <RefreshCcw className="h-4 w-4" />
                  {isRefreshing ? t("common.refreshing") : "Run diagnostics"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
              {cards.map((card) => {
                const tone: OperationsTone =
                  card.tone === "danger"
                    ? "red"
                    : card.tone === "warning"
                      ? "orange"
                      : card.tone === "success"
                        ? "green"
                        : "blue";
                const alias =
                  card.label === "Sync danger"
                    ? "Sync queue pressure"
                    : card.label === "Failed outbox"
                      ? "Failed deliveries"
                      : card.label === "Pending > 15m"
                        ? "Queue aging"
                        : "Door import recovery";

                return (
                  <RecoveryHealthTile
                    key={card.label}
                    alias={alias}
                    detail={card.note}
                    href={
                      card.label === "Failed imports"
                        ? failedImportsHref
                        : card.label === "Failed outbox"
                          ? buildDeliveryReportHref({
                              deliveryChannel:
                                deliveryChannelFilter || undefined,
                              webhookProvider:
                                webhookProviderFilter || undefined,
                            })
                          : undefined
                    }
                    label={card.label}
                    status={
                      tone === "red" ? "P1" : tone === "orange" ? "warn" : "ok"
                    }
                    tone={tone}
                    value={card.value}
                  />
                );
              })}
              <RecoveryHealthTile
                detail={formatRefreshTimestamp(freshnessTimestamp, t)}
                label={t("operations.dataFreshness")}
                status={
                  freshnessState === "fresh"
                    ? "ok"
                    : freshnessState === "degraded"
                      ? "error"
                      : freshnessState === "refreshing"
                        ? "sync"
                        : "warn"
                }
                tone={
                  freshnessState === "fresh"
                    ? "green"
                    : freshnessState === "degraded"
                      ? "red"
                      : "orange"
                }
                value={freshnessValue}
              />
            </div>

            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="overflow-hidden rounded-[12px] border border-border bg-surface">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-4 py-3">
                  <div className="flex min-w-0 items-center gap-2 text-[13px] font-semibold text-text">
                    {copy("Active incidents", "Активные инциденты", "אירועים פעילים")}
                    <span className="rounded-full bg-status-problem-bg px-2 py-0.5 text-[10.5px] font-medium text-status-problem-fg">
                      {recoveryIncidents.length}
                    </span>
                  </div>
                  <Link
                    href="/reports?focus=operations"
                    className="text-[11.5px] font-medium text-link hover:underline"
                  >
                    {copy("Export log →", "Экспорт журнала →", "יומן ייצוא →")}
                  </Link>
                </div>

                <div className="flex flex-wrap gap-1.5 border-b border-border-subtle bg-surface-subtle px-4 py-2.5">
                  {[
                    ["All", recoveryIncidents.length],
                    ["Delivery", visibleFailedOutbox.length],
                    ["Webhook", webhookIssueTotal],
                    ["Sync", visibleSyncProblems.length],
                    ["Import", visibleFailedImports.length],
                  ].map(([label, count]) => (
                    <span
                      key={String(label)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-[11px] font-medium",
                        label === "All"
                          ? "border-text bg-text text-text-inverse"
                          : "border-border bg-surface text-text",
                      )}
                    >
                      {label}{" "}
                      <span className="ml-1 text-[10px] opacity-75">
                        {count}
                      </span>
                    </span>
                  ))}
                </div>

                {hasRecoveryIncidents ? (
                  <div className="divide-y divide-border-subtle">
                    {recoveryIncidents.map((incident, index) => {
                      const Icon = incident.icon;
                      const toneClasses = operationToneClasses(incident.tone);
                      return (
                        <div
                          key={incident.id}
                          className={cn(
                            "grid gap-3 px-4 py-3 md:grid-cols-[auto_minmax(0,1fr)_120px_auto] md:items-center",
                            index < 2 ? "bg-accent/10" : "bg-surface",
                          )}
                        >
                          <div
                            className={cn(
                              "flex h-9 w-9 items-center justify-center rounded-lg",
                              toneClasses.icon,
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="truncate text-[12.5px] font-medium text-text">
                                {incident.title}
                              </div>
                              <span
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-[9.5px] font-semibold uppercase",
                                  toneClasses.status,
                                )}
                              >
                                {incident.priority}
                              </span>
                              <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-[9.5px] font-medium uppercase text-text-secondary">
                                {incident.kind}
                              </span>
                            </div>
                            <div className="mt-1 truncate text-[10.5px] text-text-secondary">
                              {incident.detail}
                            </div>
                          </div>
                          <div className="text-[11px] text-text-secondary md:text-end">
                            <div
                              className={
                                incident.tone === "red"
                                  ? "font-medium text-status-problem-fg"
                                  : ""
                              }
                            >
                              {incident.age}
                            </div>
                            <div className="text-[9.5px] text-text-tertiary">
                              {copy("ongoing", "продолжается", "מתמשך")}
                            </div>
                          </div>
                          {incident.onAction ? (
                            <button
                              type="button"
                              onClick={incident.onAction}
                              disabled={incident.disabled}
                              className="dmx-primary-action min-h-8 px-3 py-1.5 text-[11.5px] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {incident.actionLabel}
                            </button>
                          ) : incident.href ? (
                            <Link
                              href={incident.href}
                              className="dmx-secondary-action min-h-8 px-3 py-1.5 text-[11.5px]"
                            >
                              {incident.actionLabel}
                            </Link>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="px-4 py-8 text-[13px] text-text-secondary">
                    {copy("No active operations incidents.", "Нет активных операционных проблем.", "אין תקלות תפעוליות פעילות.")}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 border-t border-accent/40 bg-accent/15 px-4 py-3 text-[12px]">
                  <span className="font-medium text-text">
                    {copy("Selected actionable recovery", "Выбранные действия восстановления", "פעולות השחזור שנבחרו")}
                  </span>
                  <span className="rounded-full bg-accent px-3 py-1 text-[11px] font-medium text-accent-foreground">
                    {actionableRecoveryCount} {copy("selected", "выбрано", "נבחר")}
                  </span>
                  <span className="rounded-full border border-status-warning-border bg-status-warning-bg px-3 py-1 text-[11px] font-medium text-status-warning-fg">
                    {actionableSyncItems.length} {copy("sync watchlist", "список наблюдения для синхронизации", "רשימת מעקב סנכרון")}
                  </span>
                  <span className="hidden h-4 w-px bg-accent/50 sm:inline-block" />
                  <button
                    type="button"
                    onClick={() => {
                      setPendingBatchAction("retry");
                    }}
                    disabled={
                      !canRunPrivilegedActions ||
                      actionableFailedImports.length === 0 ||
                      busyAction === "imports:bulk"
                    }
                    className="dmx-secondary-action min-h-8 px-3 py-1.5 text-[11.5px] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {copy("Recover imports", "Восстановить импорт", "שחזור יבוא")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPendingOutboxChannel(deliveryChannelFilter || null);
                      setPendingBatchAction("outbox-retry");
                    }}
                    disabled={
                      !canRunPrivilegedActions ||
                      actionableFailedOutbox.length === 0 ||
                      busyAction === "outbox:bulk"
                    }
                    className="dmx-secondary-action min-h-8 px-3 py-1.5 text-[11.5px] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {copy("Recover deliveries", "Восстановить поставки", "שחזור משלוחים")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPendingBatchAction("reconcile");
                    }}
                    disabled={
                      !canRunPrivilegedActions ||
                      actionableImportProjectIds.length === 0 ||
                      busyAction === "imports:reconcile"
                    }
                    className="dmx-secondary-action min-h-8 px-3 py-1.5 text-[11.5px] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {copy("Reconcile projects", "Согласование проектов", "התאימו פרויקטים")}
                  </button>
                </div>
              </div>

              <div className="overflow-hidden rounded-[12px] border border-border bg-surface">
                <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-3">
                  <div className="text-[13px] font-semibold text-text">
                    {copy("Integrations", "Интеграции", "אינטגרציות")}{" "}
                    <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-[10.5px] font-medium text-text-secondary">
                      {recoveryIntegrations.length}
                    </span>
                  </div>
                  <Link
                    href="/settings"
                    className="text-[11.5px] font-medium text-link hover:underline"
                  >
                    {copy("Config →", "Конфигурация →", "תצורה →")}
                  </Link>
                </div>
                {recoveryIntegrations.map((item) => (
                  <RecoveryIntegrationRow
                    key={item.label}
                    detail={item.detail}
                    icon={item.icon}
                    label={item.label}
                    tone={item.tone}
                  />
                ))}
              </div>
            </div>

            <div className="grid gap-3 xl:grid-cols-[1.2fr_1fr]">
              <div className="overflow-hidden rounded-[12px] border border-border bg-surface">
                <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-3">
                  <div className="text-[13px] font-semibold text-text">
                    {copy("Import runs", "Запуски импорта", "הרצות ייבוא")}{" "}
                    <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-[10.5px] font-medium text-text-secondary">
                      {copy("failed queue", "очередь с ошибками", "תור שגיאות")}
                    </span>
                  </div>
                  <Link
                    href={failedImportsHref}
                    className="text-[11.5px] font-medium text-link hover:underline"
                  >
                    {copy("Full log →", "Полный журнал →", "יומן מלא →")}
                  </Link>
                </div>
                {visibleFailedImports.length === 0 ? (
                  <div className="px-4 py-6 text-[13px] text-text-secondary">
                    {copy("No failed import runs in recovery panel.", "В панели восстановления нет неудачных запусков импорта.", "אין הרצות ייבוא שנכשלו בלוח השחזור.")}
                  </div>
                ) : (
                  <div className="divide-y divide-border-subtle">
                    {visibleFailedImports.slice(0, 5).map((item) => (
                      <Link
                        key={item.run_id}
                        href={buildProjectsImportHref(item.project_id, [
                          item.project_id,
                        ])}
                        className="grid gap-3 px-4 py-3 text-[12px] transition hover:bg-surface-subtle md:grid-cols-[90px_minmax(0,1fr)_auto] md:items-center"
                      >
                        <div className="text-[11px] text-text-secondary">
                          {formatDateTime(item.created_at)}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-medium text-text">
                            {item.source_filename || "Manual import"} ·{" "}
                            {item.project_name}
                          </div>
                          <div className="mt-1 grid grid-cols-2 gap-1 text-[10.5px] text-text-secondary sm:grid-cols-4">
                            <span>{item.imported} {copy("imported", "импортировано", "מיובא")}</span>
                            <span>{item.skipped} {copy("skipped", "пропущено", "דילג")}</span>
                            <span>{item.prepared_rows} {copy("prepared", "подготовлено", "מוכן")}</span>
                            <span className="text-status-problem-fg">
                              {item.errors_count} {copy("errors", "ошибки", "שגיאות")}
                            </span>
                          </div>
                        </div>
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 text-[10px] font-medium",
                            item.errors_count > 0
                              ? "bg-status-warning-bg text-status-warning-fg"
                              : "bg-status-ok-bg text-status-ok-fg",
                          )}
                        >
                          {item.status}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <div className="overflow-hidden rounded-[12px] border border-border bg-surface">
                <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-3">
                  <div className="text-[13px] font-semibold text-text">
                    {copy("Sync queue by installer", "Очередь синхронизации монтажника", "תור סנכרון לפי מתקין")}
                  </div>
                  <Link
                    href="/installers"
                    className="text-[11.5px] font-medium text-link hover:underline"
                  >
                    {copy("Open board →", "Открыть панель →", "פתח לוח ←")}
                  </Link>
                </div>
                {visibleSyncItems.length === 0 ? (
                  <div className="px-4 py-6 text-[13px] text-text-secondary">
                    {copy("Sync queue is clean.", "Очередь синхронизации чиста.", "תור הסנכרון נקי.")}
                  </div>
                ) : (
                  <div className="divide-y divide-border-subtle">
                    {visibleSyncItems.slice(0, 5).map((item, index) => {
                      const queueTotal =
                        (item.queue_pending ?? 0) +
                        (item.queue_conflicts ?? 0) +
                        (item.queue_blocked ?? 0) +
                        (item.queue_auth_required ?? 0);
                      const tone: OperationsTone =
                        item.status.toLowerCase() === "danger" ||
                        item.days_offline > 0
                          ? "red"
                          : queueTotal > 0 || item.lag > 0
                            ? "orange"
                            : "green";
                      return (
                        <div
                          key={item.installer_id}
                          className="flex min-w-0 items-center gap-3 px-4 py-3"
                        >
                          <div
                            className={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                              operationToneClasses(tone).icon,
                            )}
                          >
                            {syncInstallerLabel(item).slice(0, 2)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[12px] font-medium text-text">
                              {copy("Sync ·", "Синхронизация ·", "סנכרון ·")} {syncInstallerLabel(item)}
                            </div>
                            <div className="mt-0.5 flex flex-wrap gap-2 text-[10.5px] text-text-secondary">
                              <span className="text-status-warning-fg">
                                {queueTotal} {copy("queued", "в очереди", "בתור")}
                              </span>
                              <span>{item.lag} {copy("lag", "задержка", "פיגור")}</span>
                              <span>{item.days_offline}{copy("d offline", " дн. без сети", " ימים ללא חיבור")}</span>
                            </div>
                            <div className="mt-2 flex h-3 gap-1">
                              {Array.from({ length: 8 }).map((_, barIndex) => (
                                <span
                                  key={`${item.installer_id}-${barIndex}`}
                                  className={cn(
                                    "h-full flex-1 rounded-sm",
                                    barIndex < 5 - Math.min(index, 3)
                                      ? "bg-status-ok-fg"
                                      : tone === "red"
                                        ? "bg-status-problem-fg"
                                        : "bg-status-warning-fg",
                                  )}
                                />
                              ))}
                            </div>
                          </div>
                          <span
                            className={cn(
                              "text-[11px] font-medium",
                              operationToneClasses(tone).value,
                            )}
                          >
                            {item.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {hasError && (
          <div className={operationsNoticeClass("error")}>
            {loadErrorMessage}
          </div>
        )}
        {actionFeedback && (
          <div
            className={operationsNoticeClass(
              actionFeedback.tone === "success" ? "success" : "error",
            )}
          >
            {actionFeedback.message}
          </div>
        )}

        <WidgetCard
          title={t("operations.actionSummary")}
          headerMeta={t("operations.highValueActions")}
          titleAccessory={
            onlyActionable ? (
              <span className="rounded-full border border-accent bg-accent px-2.5 py-1 text-[11px] font-medium text-accent-foreground">
                {t("operations.actionableMode")}
              </span>
            ) : null
          }
          actionSlot={
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setPendingBatchAction("retry");
                }}
                disabled={
                  !canRunPrivilegedActions ||
                  actionableFailedImports.length === 0 ||
                  busyAction === "imports:bulk"
                }
                className="dmx-secondary-action h-auto min-h-8 w-full py-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {busyAction === "imports:bulk"
                  ? t("operations.retryingImports")
                  : `${t("operations.retryActionableImports")} (${actionableFailedImports.length})`}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPendingOutboxChannel(deliveryChannelFilter || null);
                  setPendingBatchAction("outbox-retry");
                }}
                disabled={
                  !canRunPrivilegedActions ||
                  actionableFailedOutbox.length === 0 ||
                  busyAction === "outbox:bulk"
                }
                className="dmx-secondary-action h-auto min-h-8 w-full py-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {busyAction === "outbox:bulk"
                  ? t("operations.retryingDeliveries")
                  : `${t("operations.retryActionableDeliveries")} (${actionableFailedOutbox.length})`}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPendingBatchAction("reconcile");
                }}
                disabled={
                  !canRunPrivilegedActions ||
                  actionableImportProjectIds.length === 0 ||
                  busyAction === "imports:reconcile"
                }
                className="dmx-secondary-action h-auto min-h-8 w-full py-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {busyAction === "imports:reconcile"
                  ? t("operations.reconcilingProjects")
                  : `${t("operations.reconcileActionableProjects")} (${actionableImportProjectIds.length})`}
              </button>
            </div>
          }
        >
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            {actionSummary.map((item, index) => (
              <MetricRow
                key={`${item.label}-${item.href}`}
                label={item.label}
                value={
                  <span className="inline-block max-w-[28rem] truncate align-bottom">
                    {item.value}
                  </span>
                }
                href={item.href}
                barColor={
                  index === 0 ? "yellow" : index === 1 ? "orange" : "blue"
                }
              />
            ))}
          </div>
        </WidgetCard>

        <WidgetCard
          title={t("operations.deliveryDrilldown")}
          headerMeta={t("operations.exactLanes")}
          actionSlot={
            (deliveryChannelFilter || webhookProviderFilter) ? (
              <button
                type="button"
                onClick={() => {
                  setDeliveryChannelFilter("");
                  setWebhookProviderFilter("");
                  syncUrlState({
                    nextOnlyActionable: onlyActionable,
                    nextDeliveryChannel: "",
                    nextWebhookProvider: "",
                  });
                }}
                className="dmx-secondary-action"
              >
                {t("operations.clearDrilldown")}
              </button>
            ) : null
          }
        >
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="surface-subtle p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] uppercase text-text-secondary">
                  {t("operations.byChannel")}
                </div>
                {deliveryChannelFilter ? (
                  <span className="rounded-full border border-status-warning-border bg-status-warning-bg px-2.5 py-1 text-[11px] font-medium text-status-warning-fg">
                    {t("operations.scopedTo")} {deliveryChannelFilter}
                  </span>
                ) : null}
              </div>
              <div className="mt-3 space-y-2">
                {visibleDeliveryChannelGroups.length === 0 ? (
                  <div className="text-[13px] text-text-secondary">
                    {t("operations.noFailedDeliveryLanes")}
                  </div>
                ) : (
                  visibleDeliveryChannelGroups.map((group) => (
                    <div
                      key={group.channel}
                      className="rounded-lg border border-border bg-surface px-4 py-3 text-[13px]"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="font-medium text-text">
                            {group.channel}
                          </div>
                          <div className="mt-1 text-xs text-text-secondary">
                            {group.count} {t("operations.failedMessages")}
                            {group.recipients[0]
                              ? ` | ${group.recipients[0]}`
                              : ""}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const nextValue =
                              deliveryChannelFilter === group.channel
                                ? ""
                                : group.channel;
                            setDeliveryChannelFilter(nextValue);
                            syncUrlState({
                              nextOnlyActionable: onlyActionable,
                              nextDeliveryChannel: nextValue,
                              nextWebhookProvider: webhookProviderFilter,
                            });
                          }}
                          className="dmx-secondary-action h-auto px-2.5 py-1"
                        >
                          {deliveryChannelFilter === group.channel
                            ? t("operations.showAll")
                            : `${t("operations.only")} ${group.channel}`}
                        </button>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <Link
                          href={buildOperationsHref({
                            actionable: true,
                            deliveryChannel: group.channel,
                            webhookProvider: webhookProviderFilter || undefined,
                          })}
                          className="font-medium text-link hover:underline"
                        >
                          {t("operations.actionableLane")}
                        </Link>
                        <Link
                          href={buildDeliveryReportHref({
                            outboxId: group.firstOutboxId,
                            deliveryChannel: group.channel,
                            webhookProvider: webhookProviderFilter || undefined,
                          })}
                          className="font-medium text-link hover:underline"
                        >
                          {t("operations.exactFailure")}
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setPendingOutboxChannel(group.channel);
                            setPendingBatchAction("outbox-retry");
                          }}
                          disabled={
                            !canRunPrivilegedActions ||
                            busyAction === "outbox:bulk"
                          }
                          className="font-medium text-text disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {t("operations.retryChannel")} {group.channel}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="surface-subtle p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] uppercase text-text-secondary">
                  {t("operations.byProvider")}
                </div>
                {webhookProviderFilter ? (
                  <span className="rounded-full border border-status-warning-border bg-status-warning-bg px-2.5 py-1 text-[11px] font-medium text-status-warning-fg">
                    {t("operations.scopedTo")} {webhookProviderFilter}
                  </span>
                ) : null}
              </div>
              <div className="mt-3 space-y-2">
                {visibleWebhookProviderGroups.length === 0 ? (
                  <div className="text-[13px] text-text-secondary">
                    {t("operations.noWebhookProviderLanes")}
                  </div>
                ) : (
                  visibleWebhookProviderGroups.map((group) => (
                    <div
                      key={group.provider}
                      className="rounded-lg border border-border bg-surface px-4 py-3 text-[13px]"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="font-medium text-text">
                            {group.provider}
                          </div>
                          <div className="mt-1 text-xs text-text-secondary">
                            {group.count} {t("operations.signals")} |{" "}
                            {t("operations.duplicates")} {group.duplicateCount}{" "}
                            | {t("operations.unmatched")} {group.unmatchedCount}{" "}
                            | {t("operations.failed")}{" "}
                            {group.providerFailedCount}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const nextValue =
                              webhookProviderFilter ===
                              group.provider.toLowerCase()
                                ? ""
                                : group.provider.toLowerCase();
                            setWebhookProviderFilter(nextValue);
                            syncUrlState({
                              nextOnlyActionable: onlyActionable,
                              nextDeliveryChannel: deliveryChannelFilter,
                              nextWebhookProvider: nextValue,
                            });
                          }}
                          className="dmx-secondary-action h-auto px-2.5 py-1"
                        >
                          {webhookProviderFilter ===
                          group.provider.toLowerCase()
                            ? tt("operations.showAll")
                            : `Only ${group.provider}`}
                        </button>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <Link
                          href={buildOperationsHref({
                            actionable: onlyActionable,
                            deliveryChannel: deliveryChannelFilter || undefined,
                            webhookProvider: group.provider.toLowerCase(),
                          })}
                          className="font-medium text-link hover:underline"
                        >
                          {tt("operations.providerLane")}
                        </Link>
                        <Link
                          href={buildDeliveryReportHref({
                            deliveryChannel: deliveryChannelFilter || undefined,
                            webhookProvider: group.provider.toLowerCase(),
                          })}
                          className="font-medium text-link hover:underline"
                        >
                          {t("operations.deliveryReport")}
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </WidgetCard>

        <WidgetCard
          title={copy("Sync Recovery Audit", "Аудит восстановления синхронизации", "ביקורת שחזור סנכרון")}
          headerMeta={copy(
            "Latest cold resync and sync-state reset actions recorded in audit logs.",
            "Последние полные синхронизации и сбросы состояния, зафиксированные в журнале действий.",
            "פעולות הסנכרון המלא ואיפוס המצב האחרונות שנרשמו ביומן הביקורת.",
          )}
          actionSlot={
            <Link href="/reports" className="dmx-secondary-action">
              {copy("Open reports", "Открыть отчеты", "פתחו דוחות")}
            </Link>
          }
        >
          <div className="space-y-2">
            {syncRecoveryAuditsQuery.isLoading ? (
              <div className="text-[13px] text-text-secondary">
                {copy("Loading sync recovery audit...", "Загрузка аудита восстановления синхронизации...", "טוען ביקורת שחזור סנכרון...")}
              </div>
            ) : syncRecoveryAudits.length === 0 ? (
              <div className="text-[13px] text-text-secondary">
                {copy("No sync recovery audit entries yet.", "Пока нет записей аудита восстановления синхронизации.", "אין עדיין ערכי ביקורת לשחזור סנכרון.")}
              </div>
            ) : (
              syncRecoveryAudits.map((item) => {
                const beforeCursor = auditIntField(
                  item.before,
                  "last_cursor_ack",
                );
                const afterCursor = auditIntField(
                  item.after,
                  "last_cursor_ack",
                );
                const beforeDevice = auditField(item.before, "device_id");
                const beforeApp = auditField(item.before, "app_version");
                return (
                  <div
                    key={item.id}
                    className="rounded-lg border border-border bg-surface px-4 py-3 text-[13px]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-text">
                          {syncRecoveryAuditInstallerLabel(item)}
                        </div>
                        <div className="mt-1 text-xs text-text-secondary">
                          {syncRecoveryAuditReasonLabel(item.reason)} {copy("| cursor", "| курсор", "| הסמן")}{" "}
                          {beforeCursor ?? "unknown"} -&gt;{" "}
                          {afterCursor ?? "unknown"}
                        </div>
                      </div>
                      <div className="text-end text-xs text-text-secondary">
                        {formatDateTime(item.created_at)}
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-text-secondary">
                      {copy("actor", "пользователь", "משתמש")} {item.actor_user_id}
                      {beforeDevice ? ` | device ${beforeDevice}` : ""}
                      {beforeApp ? ` | app ${beforeApp}` : ""}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </WidgetCard>

        <WidgetCard
          title={tt("operations.deliveryRecoveryAuditTitle")}
          headerMeta={tt("operations.deliveryRecoveryAuditSubtitle")}
          actionSlot={
            <Link
              href={buildDeliveryReportHref({
                deliveryChannel: deliveryChannelFilter || undefined,
                webhookProvider: webhookProviderFilter || undefined,
              })}
              className="dmx-secondary-action"
            >
              {tt("operations.openDeliveryReports")}
            </Link>
          }
        >
          <div className="space-y-2">
            {retryAuditsQuery.isLoading ? (
              <div className="text-[13px] text-text-secondary">
                {tt("operations.loadingDeliveryRecoveryAudit")}
              </div>
            ) : retryAudits.length === 0 ? (
              <div className="text-[13px] text-text-secondary">
                {tt("operations.noDeliveryRecoveryAudit")}
              </div>
            ) : (
              retryAudits.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-border bg-surface px-4 py-3 text-[13px]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-text">
                        {copy("Outbox", "Исходящие", "תיבת דואר יוצא")} {item.outbox_id}
                      </div>
                      <div className="mt-1 text-xs text-text-secondary">
                        {item.before_status || tt("operations.unknown")} →{" "}
                        {item.after_status || tt("operations.unknown")}
                        {item.before_delivery_status ||
                        item.after_delivery_status
                          ? ` | delivery ${item.before_delivery_status || tt("operations.unknown")} → ${item.after_delivery_status || tt("operations.unknown")}`
                          : ""}
                      </div>
                    </div>
                    <div className="text-end text-xs text-text-secondary">
                      {formatDateTime(item.created_at)}
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-text-secondary">
                    {item.reason || tt("operations.noReasonSupplied")} {copy("| actor", "| пользователь", "| משתמש")}{" "}
                    {item.actor_user_id}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <Link
                      href={buildDeliveryReportHref({
                        outboxId: item.outbox_id,
                      })}
                      className="font-medium text-link hover:underline"
                    >
                      {tt("operations.reviewDeliveryRecovery")}
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </WidgetCard>

        <WidgetCard
          title={tt("operations.webhookSignalsTitle")}
          headerMeta={tt("operations.webhookSignalsSubtitle").replace(
            "{hours}",
            String(webhookSummary?.window_hours ?? 24),
          )}
          actionSlot={
            <Link
              href={buildDeliveryReportHref({
                deliveryChannel: deliveryChannelFilter || undefined,
                webhookProvider: webhookProviderFilter || undefined,
              })}
              className="dmx-secondary-action"
            >
              {tt("operations.openDeliveryReports")}
            </Link>
          }
        >
          <div className="grid gap-3 md:grid-cols-4">
            <DimaxKpiCard
              label={tt("operations.received")}
              value={webhookSummary?.total_received ?? 0}
              barColor="blue"
            />
            <DimaxKpiCard
              label={tt("operations.duplicates")}
              value={webhookSummary?.duplicate_total ?? 0}
              barColor="orange"
            />
            <DimaxKpiCard
              label={tt("operations.unmatched")}
              value={webhookSummary?.unmatched_total ?? 0}
              barColor="orange"
            />
            <DimaxKpiCard
              label={tt("operations.providerFailed")}
              value={webhookSummary?.provider_failed_total ?? 0}
              barColor="red"
              emphasis={
                (webhookSummary?.provider_failed_total ?? 0) > 0
                  ? "problem"
                  : "default"
              }
            />
          </div>
          <div className="mt-4 space-y-2">
            {webhookSignalsQuery.isLoading ? (
              <div className="text-[13px] text-text-secondary">
                {tt("operations.loadingWebhookSignals")}
              </div>
            ) : visibleWebhookSignals.length === 0 ? (
              <div className="text-[13px] text-text-secondary">
                {webhookProviderFilter
                  ? tt("operations.noWebhookSignalsScoped")
                  : tt("operations.noWebhookSignals")}
              </div>
            ) : (
              visibleWebhookSignals.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-border bg-surface px-4 py-3 text-[13px]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-text">
                        {item.provider} | {item.result}
                      </div>
                      <div className="mt-1 text-xs text-text-secondary">
                        {item.event_type}
                        {item.external_id ? ` | ${item.external_id}` : ""}
                        {item.status ? ` | status ${item.status}` : ""}
                      </div>
                    </div>
                    <div className="text-end text-xs text-text-secondary">
                      {formatDateTime(item.created_at)}
                    </div>
                  </div>
                  {item.error ? (
                    <div className="mt-1 text-xs text-text-secondary">
                      {item.error}
                    </div>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <Link
                      href={buildDeliveryReportHref({
                        deliveryChannel: deliveryChannelFilter || undefined,
                        webhookProvider: item.provider.toLowerCase(),
                      })}
                      className="font-medium text-link hover:underline"
                    >
                      {tt("operations.deliveryReport")}
                    </Link>
                    {item.outbox_id ? (
                      <Link
                        href={buildDeliveryReportHref({
                          outboxId: item.outbox_id,
                          webhookProvider: item.provider.toLowerCase(),
                        })}
                        className="font-medium text-link hover:underline"
                      >
                        {t("operations.exactOutbox")}
                      </Link>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </WidgetCard>

        {lastBatchResult ? (
          <WidgetCard
            title={t("operations.lastBatchResult")}
            headerMeta={
              lastBatchResult.action === "retry"
                ? t("operations.retryImportsRuns").replace(
                    "{count}",
                    String(lastBatchResult.scope),
                  )
                : lastBatchResult.action === "outbox-retry"
                  ? t("operations.retryDeliveriesMessages").replace(
                      "{count}",
                      String(lastBatchResult.scope),
                    )
                  : t("operations.reconcileProjectsScope").replace(
                      "{count}",
                      String(lastBatchResult.scope),
                    )
            }
            updatedLabel={formatDateTime(lastBatchResult.createdAt)}
          >
            <div className="grid gap-3 md:grid-cols-4">
              <DimaxKpiCard
                label={t("operations.success")}
                value={lastBatchResult.successful}
                barColor="green"
              />
              <DimaxKpiCard
                label={t("operations.failed")}
                value={lastBatchResult.failed}
                barColor="red"
                emphasis={lastBatchResult.failed > 0 ? "problem" : "default"}
              />
              <DimaxKpiCard
                label={t("operations.skipped")}
                value={lastBatchResult.skipped}
                barColor="orange"
              />
              <DimaxKpiCard
                label={t("operations.scope")}
                value={lastBatchResult.scope}
                barColor="blue"
              />
            </div>
            <div className="mt-4 space-y-2">
              {lastBatchResult.items.length === 0 ? (
                <div className="text-[13px] text-text-secondary">
                  {t("operations.noItemDetails")}
                </div>
              ) : (
                lastBatchResult.items.slice(0, 5).map((item) => (
                  <div
                    key={
                      lastBatchResult.action === "retry"
                        ? `retry-${item.run_id}`
                        : lastBatchResult.action === "outbox-retry"
                          ? `outbox-${item.outbox_id}`
                          : `reconcile-${item.project_id}-${item.source_run_id || "latest"}`
                    }
                    className="rounded-lg border border-border bg-surface px-4 py-3 text-[13px]"
                  >
                    <div className="font-medium text-text">
                      {lastBatchResult.action === "retry"
                        ? `Run ${item.run_id}`
                        : lastBatchResult.action === "outbox-retry"
                          ? `Outbox ${item.outbox_id}`
                          : `Project ${item.project_id}`}
                    </div>
                    <div className="mt-1 text-xs text-text-secondary">
                      {lastBatchResult.action === "outbox-retry"
                        ? `status ${item.status} | channel ${item.item?.channel || "n/a"} | delivery ${item.item?.delivery_status || "n/a"}`
                        : `status ${item.status} | imported ${item.imported} | skipped ${item.skipped} | errors ${item.errors_count}`}
                    </div>
                    {lastBatchResult.action === "outbox-retry" ? (
                      item.error ? (
                        <div className="mt-1 text-xs text-text-secondary">
                          {item.error}
                        </div>
                      ) : null
                    ) : "last_error" in item && item.last_error ? (
                      <div className="mt-1 text-xs text-text-secondary">
                        {item.last_error}
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={batchResultFollowupHref}
                className="dmx-secondary-action"
              >
                {lastBatchResult.action === "outbox-retry"
                  ? t("operations.reviewAffectedDeliveries")
                  : t("operations.reviewAffectedImports")}
              </Link>
              <Link href="/operations" className="dmx-secondary-action">
                {t("operations.backToOverview")}
              </Link>
            </div>
          </WidgetCard>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Link href={failedImportsHref} className="dmx-secondary-action">
            {tt("operations.openImportWorkspace")}
          </Link>
          <Link
            href="/reports?focus=operations&ops_preset=failed-imports"
            className="dmx-secondary-action"
          >
            {tt("operations.openOperationsReports")}
          </Link>
          <Link
            href={buildDeliveryReportHref({
              deliveryChannel: deliveryChannelFilter || undefined,
              webhookProvider: webhookProviderFilter || undefined,
            })}
            className="dmx-secondary-action"
          >
            {tt("operations.openDeliveryReports")}
          </Link>
          <Link
            href="/reports?focus=issues&ops_preset=issue-pressure"
            className="dmx-secondary-action"
          >
            {tt("operations.openIssuesReports")}
          </Link>
          <Link href="/journal" className="dmx-secondary-action">
            {tt("operations.openCommunicationQueue")}
          </Link>
          <Link href="/installers" className="dmx-secondary-action">
            {tt("operations.openInstallerBoard")}
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <WidgetCard
            title={tt("operations.failedImportQueue")}
            actionSlot={
              <Link
                href={failedImportsHref}
                className="text-[12px] font-medium text-link hover:underline"
              >
                {tt("operations.openQueue")}
              </Link>
            }
            bleed
          >
            <div className="space-y-0">
              {failedImportsQuery.isLoading && (
                <div className="px-4 py-6 text-[13px] text-text-secondary">
                  {tt("operations.loadingFailedImports")}
                </div>
              )}
              {!failedImportsQuery.isLoading &&
                visibleFailedImports.length === 0 && (
                  <div className="px-4 py-6 text-[13px] text-text-secondary">
                    {onlyActionable
                      ? tt("operations.noActionableImportRuns")
                      : tt("operations.noFailedImportRuns")}
                  </div>
                )}
              {visibleFailedImports.map((item) => (
                <div
                  key={item.run_id}
                  className="border-t border-border-subtle px-4 py-3 text-[13px]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-text">
                        {item.project_name}
                      </div>
                      <div className="mt-1 text-xs text-text-secondary">
                        {item.mode} |{" "}
                        {item.source_filename ||
                          copy("No file", "Нет файла", "אין קובץ")}{" "}
                        | {formatDateTime(item.created_at)}
                      </div>
                    </div>
                    <span className="rounded-md border border-border px-2 py-1 text-[11px]">
                      {item.status}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-text-secondary">
                    {copy("rows", "строк", "שורות")} {item.parsed_rows} /{" "}
                    {copy("prepared", "подготовлено", "מוכן")}{" "}
                    {item.prepared_rows} /{" "}
                    {copy("imported", "импортировано", "יובא")} {item.imported}
                    {" | "}
                    {copy("errors", "ошибки", "שגיאות")} {item.errors_count}
                  </div>
                  <div className="mt-1 text-xs text-text-secondary">
                    {item.last_error ||
                      copy(
                        "No error payload",
                        "Нет данных об ошибке",
                        "אין נתוני שגיאה",
                      )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <Link
                      href={buildProjectsImportHref(item.project_id, [
                        item.project_id,
                      ])}
                      className="font-medium text-link hover:underline"
                    >
                      {copy(
                        "Project imports",
                        "Импорты проекта",
                        "ייבואי פרויקט",
                      )}
                    </Link>
                    <Link
                      href={`/reports?focus=operations&ops_preset=failed-imports&project_id=${encodeURIComponent(item.project_id)}`}
                      className="font-medium text-link hover:underline"
                    >
                      {copy("Project report", "Отчет по проекту", "דוח פרויקט")}
                    </Link>
                    <Link
                      href={`/projects?project_id=${encodeURIComponent(item.project_id)}`}
                      className="font-medium text-link hover:underline"
                    >
                      {copy("Open project", "Открыть проект", "פתח פרויקט")}
                    </Link>
                    {item.retry_available ? (
                      <button
                        type="button"
                        onClick={() => {
                          void handleRetryImport(item.run_id, item.project_id);
                        }}
                        disabled={
                          !canRunPrivilegedActions ||
                          busyAction === `import:${item.run_id}`
                        }
                        className="font-medium text-text disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {busyAction === `import:${item.run_id}`
                          ? copy(
                              "Retrying import…",
                              "Повторяем импорт…",
                              "מנסה שוב את הייבוא…",
                            )
                          : copy(
                              "Retry import",
                              "Повторить импорт",
                              "נסה שוב ייבוא",
                            )}
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </WidgetCard>

          <WidgetCard
            title={copy("Failed Outbox", "Ошибки отправки", "שגיאות שליחה")}
            actionSlot={
              <div className="flex flex-wrap justify-end gap-3 text-[12px]">
                <Link
                  href={buildDeliveryReportHref({
                    deliveryChannel: deliveryChannelFilter || undefined,
                    webhookProvider: webhookProviderFilter || undefined,
                  })}
                  className="font-medium text-link hover:underline"
                >
                  {copy(
                    "Delivery reports",
                    "Отчеты по доставке",
                    "דוחות משלוח",
                  )}
                </Link>
                <Link
                  href="/journal"
                  className="font-medium text-link hover:underline"
                >
                  {copy("Journal", "Журнал", "יומן")}
                </Link>
              </div>
            }
            bleed
          >
            <div className="space-y-0">
              {outboxFailedQuery.isLoading && (
                <div className="px-4 py-6 text-[13px] text-text-secondary">
                  {t("operations.loadingOutboxFailures")}
                </div>
              )}
              {!outboxFailedQuery.isLoading &&
                visibleFailedOutbox.length === 0 && (
                  <div className="px-4 py-6 text-[13px] text-text-secondary">
                    {deliveryChannelFilter
                      ? t("operations.noFailedOutboxMessagesFor").replace(
                          "{scope}",
                          deliveryChannelFilter,
                        )
                      : onlyActionable
                        ? t("operations.noActionableOutboxMessages")
                        : t("operations.noFailedOutboxMessages")}
                  </div>
                )}
              {visibleFailedOutbox.map((item) => (
                <div
                  key={item.id}
                  className="border-t border-border-subtle px-4 py-3 text-[13px]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-text">
                        {item.recipient || item.subject || item.channel}
                      </div>
                      <div className="mt-1 text-xs text-text-secondary">
                        {item.channel} | {item.delivery_status} |{" "}
                        {copy("scheduled", "запланировано", "מתוזמן")}{" "}
                        {formatDateTime(item.scheduled_at)}
                      </div>
                    </div>
                    <span className="rounded-md border border-border px-2 py-1 text-[11px]">
                      {item.attempts}/{item.max_attempts}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-text-secondary">
                    {item.last_error ||
                      copy(
                        "No error payload",
                        "Нет данных об ошибке",
                        "אין נתוני שגיאה",
                      )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <Link
                      href={buildDeliveryReportHref({
                        outboxId: item.id,
                        deliveryChannel: item.channel.toUpperCase(),
                      })}
                      className="font-medium text-link hover:underline"
                    >
                      {copy(
                        "Delivery report",
                        "Отчёт по доставке",
                        "דוח משלוח",
                      )}
                    </Link>
                    <Link
                      href="/journal"
                      className="font-medium text-link hover:underline"
                    >
                      {copy("Journal outbox", "Очередь отправки журнала", "תור שליחת היומן")}
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        void handleRetryOutbox(item.id);
                      }}
                      disabled={
                        !canRunPrivilegedActions ||
                        busyAction === `outbox:${item.id}`
                      }
                      className="font-medium text-text disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {busyAction === `outbox:${item.id}`
                        ? copy(
                            "Retrying delivery…",
                            "Повторяем доставку…",
                            "מנסה שוב משלוח…",
                          )
                        : copy(
                            "Retry delivery",
                            "Повторить доставку",
                            "נסה שוב משלוח",
                          )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </WidgetCard>

          <WidgetCard
            title={copy("Sync Health", "Состояние синхронизации", "מצב סנכרון")}
            actionSlot={
              <Link
                href="/installers"
                className="text-[12px] font-medium text-link hover:underline"
              >
                {copy("Open installers", "Открыть монтажников", "פתח מתקינים")}
              </Link>
            }
            bleed
          >
            <div className="space-y-0">
              {syncQuery.isLoading && (
                <div className="px-4 py-6 text-[13px] text-text-secondary">
                  {copy(
                    "Loading sync health…",
                    "Загружаем состояние синка…",
                    "טוען מצב סנכרון…",
                  )}
                </div>
              )}
              {!syncQuery.isLoading && !sync && (
                <div className="px-4 py-6 text-[13px] text-text-secondary">
                  {copy(
                    "No sync health data.",
                    "Нет данных по синку.",
                    "אין נתוני סנכרון.",
                  )}
                </div>
              )}
              {sync && (
                <>
                  <div className="px-4 py-3 text-[13px]">
                    <div className="font-medium text-text">
                      {copy("ok", "норма", "תקין")} {sync.counts.ok} |{" "}
                      {copy("warn", "предупр.", "אזהרה")} {sync.counts.warn} |{" "}
                      {copy("danger", "риск", "סיכון")} {sync.counts.danger}
                    </div>
                    <div className="mt-1 text-xs text-text-secondary">
                      {copy("dead", "неактивен", "מנותק")} {sync.counts.dead} |{" "}
                      {copy("never seen", "не замечен", "לא נראה")}{" "}
                      {sync.counts.never_seen} |{" "}
                      {copy(
                        "alerts sent",
                        "алертов отправлено",
                        "התראות נשלחו",
                      )}{" "}
                      {sync.alerts_sent}
                    </div>
                    <div className="mt-1 text-xs text-text-secondary">
                      {copy("failed events", "ошибки событий", "אירועים שנכשלו")}{" "}
                      {sync.counts.failed_events ?? 0} |{" "}
                      {copy(
                        "queue conflicts",
                        "конфликты очереди",
                        "התנגשויות בתור",
                      )}{" "}
                      {sync.counts.queue_conflicts ?? 0} |{" "}
                      {copy("auth required", "нужен повторный вход", "נדרשת התחברות מחדש")}{" "}
                      {sync.counts.queue_auth_required ?? 0}
                    </div>
                  </div>
                  {(sync.counts.problem_total ?? 0) > 0 ? (
                    <div className="border-t border-border-subtle px-4 py-3">
                      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <div className="text-[12px] font-semibold uppercase text-text-secondary">
                            {copy(
                              "Recent sync problems",
                              "Последние проблемы синхронизации",
                              "בעיות סנכרון אחרונות",
                            )}
                          </div>
                          <div className="mt-1 text-[11px] text-text-secondary">
                            {copy("Showing", "Показано", "מוצגים")} {visibleSyncProblems.length}{" "}
                            {copy("of", "из", "מתוך")}{" "}
                            {syncProblemsQuery.data?.total ??
                              syncProblems.length}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <label
                            className="sr-only"
                            htmlFor="sync-problem-installer-filter"
                          >
                            {copy("Sync problem installer", "Монтажник с проблемой синхронизации", "מתקין עם בעיית סנכרון")}
                          </label>
                          <select
                            id="sync-problem-installer-filter"
                            aria-label={copy("Sync problem installer", "Монтажник с проблемой синхронизации", "מתקין עם בעיית סנכרון")}
                            value={syncProblemInstallerFilter}
                            onChange={(event) =>
                              setSyncProblemInstallerFilter(event.target.value)
                            }
                            className="h-9 rounded-md border border-border bg-surface px-2.5 text-[12px] text-text"
                          >
                            <option value="all">{copy("All installers", "Все монтажники", "כל המתקינים")}</option>
                            {syncProblemInstallerOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <label
                            className="sr-only"
                            htmlFor="sync-problem-status-filter"
                          >
                            {copy("Sync problem status", "Состояние проблемы с синхронизацией", "מצב בעיית סנכרון")}
                          </label>
                          <select
                            id="sync-problem-status-filter"
                            aria-label={copy("Sync problem status", "Статус проблемы синхронизации", "סטטוס בעיית סנכרון")}
                            value={syncProblemStatusFilter}
                            onChange={(event) =>
                              setSyncProblemStatusFilter(
                                event.target.value as SyncProblemStatusFilter,
                              )
                            }
                            className="h-9 rounded-md border border-border bg-surface px-2.5 text-[12px] text-text"
                          >
                            {(
                              [
                                "all",
                                "failed",
                                "conflict",
                                "pending",
                                "auth_required",
                              ] as SyncProblemStatusFilter[]
                            ).map((status) => (
                              <option key={status} value={status}>
                                {syncProblemStatusLabel(status)}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      {syncProblemsQuery.isLoading ? (
                        <div className="text-[13px] text-text-secondary">
                          {copy(
                            "Loading sync problems...",
                            "Загрузка проблем синхронизации...",
                            "טוען בעיות סנכרון...",
                          )}
                        </div>
                      ) : syncProblems.length === 0 ? (
                        <div className="text-[13px] text-text-secondary">
                          {copy(
                            "No problem details returned.",
                            "Подробности проблемы не получены.",
                            "לא התקבלו פרטי התקלה.",
                          )}
                        </div>
                      ) : visibleSyncProblems.length === 0 ? (
                        <div className="text-[13px] text-text-secondary">
                          {copy(
                            "No sync problems match the selected filters.",
                            "Нет проблем синхронизации по выбранным фильтрам.",
                            "אין בעיות סנכרון התואמות למסננים שנבחרו.",
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {visibleSyncProblems.map((problem) => {
                            const resetTarget = syncProblemResetTarget(problem);
                            const problemTitle =
                              problem.problem_title ||
                              (problem.conflict_code
                                ? readableConflictCode(
                                    problem.conflict_code,
                                    locale,
                                  )
                                : null);
                            const problemCode =
                              problem.problem_code ||
                              problem.conflict_code ||
                              problem.error;
                            return (
                              <div
                                key={`${problem.source}-${problem.id}`}
                                className="rounded-lg border border-border-subtle bg-surface-subtle px-3 py-2 text-[12px]"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="font-medium text-text">
                                      {syncProblemInstallerLabel(problem)}
                                    </div>
                                    <div className="mt-0.5 text-text-secondary">
                                      {problem.source} | {problem.status}
                                      {problemTitle
                                        ? ` | ${problemTitle}`
                                        : ""}
                                    </div>
                                    {problemCode ? (
                                      <div className="mt-0.5 font-mono text-[11px] text-text-secondary">
                                        {problemCode}
                                      </div>
                                    ) : null}
                                  </div>
                                  <div className="flex shrink-0 flex-col items-end gap-2">
                                    <span className="text-text-secondary">
                                      {formatDateTime(
                                        problem.applied_at ||
                                          problem.created_at,
                                      )}
                                    </span>
                                    {resetTarget ? (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setPendingSyncReset(resetTarget)
                                        }
                                        disabled={
                                          !canRunPrivilegedActions ||
                                          busyAction === resetTarget.busyKey
                                        }
                                        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-[11px] font-medium text-text transition-colors hover:bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-60"
                                      >
                                        <RefreshCcw className="h-3.5 w-3.5" />
                                        {busyAction === resetTarget.busyKey
                                          ? "Requesting..."
                                          : "Cold resync"}
                                      </button>
                                    ) : null}
                                  </div>
                                </div>
                                <div className="mt-1 text-text-secondary">
                                  {problem.event_type ||
                                    problem.operation_type ||
                                    problem.entity_type ||
                                    problem.client_event_id ||
                                    problem.id}
                                </div>
                                {problem.error ? (
                                  <div className="mt-1 text-status-problem-fg">
                                    {readableConflictCode(
                                      problem.error,
                                      locale,
                                    ) || problem.error}
                                  </div>
                                ) : null}
                                {problem.operator_action ? (
                                  <div className="mt-2 rounded-md border border-status-warning-border bg-status-warning-bg px-2.5 py-2 text-[12px] text-status-warning-fg">
                                    {problem.operator_action}
                                  </div>
                                ) : null}
                                {problem.manual_review_required ? (
                                  <div className="mt-1 text-[11px] font-medium text-status-warning-fg">
                                    {copy("Manual review required", "Требуется ручная проверка", "נדרשת סקירה ידנית")}
                                    {problem.retry_allowed === false
                                      ? " | no blind retry"
                                      : ""}
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : null}
                  {visibleSyncItems.length === 0 ? (
                    <div className="border-t border-border-subtle px-4 py-6 text-[13px] text-text-secondary">
                      {copy(
                        "No actionable sync items.",
                        "Нет задач синхронизации, требующих действий.",
                        "אין פריטי סנכרון לטיפול.",
                      )}
                    </div>
                  ) : null}
                  {visibleSyncItems.map((item) => {
                    const resetTarget = syncHealthResetTarget(item);
                    return (
                      <div
                        key={`${item.installer_id}-${item.status}`}
                        className="border-t border-border-subtle px-4 py-3 text-[13px]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium text-text">
                              {syncInstallerLabel(item)}
                            </div>
                            {item.installer_name ? (
                              <div className="mt-0.5 text-[11px] text-text-secondary">
                                {item.installer_id}
                              </div>
                            ) : null}
                          </div>
                          <span className="rounded-md border border-border px-2 py-1 text-[11px]">
                            {item.status}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-text-secondary">
                          {copy("lag", "лаг", "פיגור")} {item.lag} |{" "}
                          {copy("offline", "офлайн", "לא מקוון")}{" "}
                          {item.days_offline} {copy("days", "дн.", "ימים")} |{" "}
                          {copy(
                            "last seen",
                            "последний сигнал",
                            "נראה לאחרונה",
                          )}{" "}
                          {formatDateTime(item.last_seen_at)}
                          {item.installer_phone
                            ? ` | ${item.installer_phone}`
                            : ""}
                        </div>
                        {(item.problem_count ?? 0) > 0 ? (
                          <div className="mt-1 text-xs text-status-problem-fg">
                            {copy("sync errors", "ошибки синхронизации", "שגיאות סנכרון")}{" "}
                            {item.problem_count ?? 0} |{" "}
                            {copy(
                              "failed events",
                              "ошибки событий",
                              "אירועים שנכשלו",
                            )}{" "}
                            {item.failed_events ?? 0} |{" "}
                            {copy(
                              "queue conflicts",
                              "конфликты очереди",
                              "התנגשויות בתור",
                            )}{" "}
                            {item.queue_conflicts ?? 0}
                          </div>
                        ) : null}
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                          <Link
                            href={`/reports?focus=operations&ops_preset=issue-pressure&installer_id=${encodeURIComponent(item.installer_id)}`}
                            className="font-medium text-link hover:underline"
                          >
                            {copy(
                              "Installer report",
                              "Отчёт по монтажнику",
                              "דוח מתקין",
                            )}
                          </Link>
                          <Link
                            href="/installers"
                            className="font-medium text-link hover:underline"
                          >
                            {copy(
                              "Installer board",
                              "Доска монтажников",
                              "לוח מתקינים",
                            )}
                          </Link>
                          <button
                            type="button"
                            onClick={() => setPendingSyncReset(resetTarget)}
                            disabled={
                              !canRunPrivilegedActions ||
                              busyAction === resetTarget.busyKey
                            }
                            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-[11px] font-medium text-text transition-colors hover:bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <RefreshCcw className="h-3.5 w-3.5" />
                            {busyAction === resetTarget.busyKey
                              ? "Requesting..."
                              : "Cold resync"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </WidgetCard>
        </div>
      </div>
      <AlertDialog
        open={pendingSyncReset !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingSyncReset(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy("Request cold resync", "Запросить холодную повторную синхронизацию", "בקש סנכרון קר")}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingSyncReset ? pendingSyncReset.description : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {copy("Cancel", "Отмена", "ביטול")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingSyncReset) {
                  void handleResetSyncTarget(pendingSyncReset);
                }
              }}
            >
              {copy("Confirm", "Подтвердить", "אשר")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={pendingBatchAction !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingBatchAction(null);
            setPendingOutboxChannel(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{batchActionLabel()}</AlertDialogTitle>
            <AlertDialogDescription>
              {batchActionDescription()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {copy("Cancel", "Отмена", "ביטול")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                void confirmBatchAction();
              }}
            >
              {copy("Confirm", "Подтвердить", "אשר")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
