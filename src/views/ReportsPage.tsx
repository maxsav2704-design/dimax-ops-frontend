import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  BellRing,
  CheckCheck,
  Mail,
  MessageSquare,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";

import { DashboardLayout } from "@/components/DashboardLayout";
import { apiBaseUrl, apiFetch, getAccessToken } from "@/lib/api";
import { useUserRole } from "@/hooks/use-user-role";
import { cn } from "@/lib/utils";

type LimitAlertItem = {
  id: string;
  created_at: string;
  action: string;
  level: string;
  metric: string | null;
  current: number | null;
  max: number | null;
  utilization_pct: number | null;
  plan_code: string | null;
  is_unread: boolean;
};

type LimitAlertsResponse = {
  items: LimitAlertItem[];
  unread_count: number;
  last_read_at: string | null;
  limit: number;
  offset: number;
};

type LimitAlertsReadResponse = {
  unread_count: number;
  last_read_at: string;
};

type DeliveryStatsResponse = {
  period_from: string | null;
  period_to: string | null;
  whatsapp_pending: number;
  whatsapp_delivered: number;
  whatsapp_failed: number;
  email_sent: number;
  email_failed: number;
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
  channel: string;
  status: string;
  delivery_status: string;
  attempts: number;
  max_attempts: number;
  scheduled_at: string;
  created_at: string;
  last_error: string | null;
};

type OutboxListResponse = {
  items: OutboxItem[];
};

type OutboxRetryResponse = {
  item: OutboxItem;
};

type WebhookSignalItem = {
  id: string;
  provider: string;
  event_type: string;
  external_id: string | null;
  result: string;
  status: string | null;
  error: string | null;
  outbox_id: string | null;
  created_at: string;
};

type WebhookSignalListResponse = {
  items: WebhookSignalItem[];
};

type OutboxRetryAuditItem = {
  id: string;
  outbox_id: string;
  actor_user_id: string;
  reason: string | null;
  before_status: string | null;
  after_status: string | null;
  before_delivery_status: string | null;
  after_delivery_status: string | null;
  created_at: string;
};

type OutboxRetryAuditListResponse = {
  items: OutboxRetryAuditItem[];
};

type AuditCatalogChangeItem = {
  id: string;
  created_at: string;
  entity_type: string;
  entity_id?: string;
  actor_user_id?: string;
  action: string;
  reason: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
};

type AuditCatalogChangesResponse = {
  items: AuditCatalogChangeItem[];
  summary: {
    total: number;
    by_entity: Record<string, number>;
    by_action: Record<string, number>;
  };
};

type OperationsCenterResponse = {
  generated_at: string;
  imports: {
    window_hours: number;
    total_runs: number;
    analyze_runs: number;
    import_runs: number;
    retry_runs: number;
    success_runs: number;
    partial_runs: number;
    failed_runs: number;
    empty_runs: number;
  };
  outbox: {
    total: number;
    failed_total: number;
    pending_overdue_15m: number;
    by_channel: Record<string, number>;
  };
  alerts: {
    unread_count: number;
    total_last_24h: number;
    warn_last_24h: number;
    danger_last_24h: number;
    latest_created_at: string | null;
  };
  top_failing_projects: Array<{
    project_id: string;
    project_name: string;
    failure_runs: number;
    last_run_at: string;
    last_error: string | null;
  }>;
};

type OperationsSlaMetric = {
  code: string;
  title: string;
  unit: string;
  current: number;
  target: number;
  warn_threshold: number;
  danger_threshold: number;
  status: "OK" | "WARN" | "DANGER" | string;
};

type OperationsSlaPlaybook = {
  code: string;
  severity: "OK" | "WARN" | "DANGER" | string;
  title: string;
  description: string;
  action_url: string;
};

type OperationsSlaResponse = {
  generated_at: string;
  overall_status: "OK" | "WARN" | "DANGER" | string;
  metrics: OperationsSlaMetric[];
  playbooks: OperationsSlaPlaybook[];
};

type OperationsSlaHistoryPoint = {
  day: string;
  overall_status: "OK" | "WARN" | "DANGER" | string;
  import_status: "OK" | "WARN" | "DANGER" | string;
  outbox_status: "OK" | "WARN" | "DANGER" | string;
  alerts_status: "OK" | "WARN" | "DANGER" | string;
  import_runs: number;
  risky_import_runs: number;
  import_failure_rate_pct: number;
  outbox_total: number;
  outbox_failed: number;
  outbox_failed_rate_pct: number;
  danger_alerts_count: number;
};

type OperationsSlaHistorySummary = {
  ok_days: number;
  warn_days: number;
  danger_days: number;
  current_status: "OK" | "WARN" | "DANGER" | string;
  delta_import_failure_rate_pct: number;
  delta_outbox_failed_rate_pct: number;
  delta_danger_alerts_count: number;
};

type OperationsSlaHistoryResponse = {
  generated_at: string;
  days: number;
  points: OperationsSlaHistoryPoint[];
  summary: OperationsSlaHistorySummary;
};

type IssuesAnalyticsSummary = {
  total_issues: number;
  open_issues: number;
  closed_issues: number;
  overdue_open_issues: number;
  blocked_open_issues: number;
  p1_open_issues: number;
  overdue_open_rate_pct: number;
  mttr_hours: number;
  mttr_p50_hours: number;
  mttr_sample_size: number;
  backlog_by_workflow: Record<string, number>;
  backlog_by_priority: Record<string, number>;
};

type IssuesAnalyticsTrendPoint = {
  day: string;
  opened: number;
  closed: number;
  backlog_open_end: number;
};

type IssuesAnalyticsResponse = {
  generated_at: string;
  days: number;
  summary: IssuesAnalyticsSummary;
  trend: IssuesAnalyticsTrendPoint[];
};

type ProjectOption = {
  id: string;
  name: string;
};

type InstallerKpiItem = {
  installer_id: string;
  installer_name: string;
  installed_doors: number;
  payroll_total: number;
  revenue_total: number;
  profit_total: number;
  missing_rates_installed_doors: number;
};

type InstallersKpiResponse = {
  period_from: string | null;
  period_to: string | null;
  items: InstallerKpiItem[];
};

type InstallerProfitabilityMatrixItem = {
  installer_id: string;
  installer_name: string;
  performance_band: string;
  installed_doors: number;
  active_projects: number;
  open_issues: number;
  addons_done_qty: number;
  revenue_total: number;
  payroll_total: number;
  profit_total: number;
  margin_pct: number;
  avg_profit_per_door: number;
  missing_rates_installed_doors: number;
  missing_addon_plans_facts: number;
  last_installed_at: string | null;
};

type InstallerProfitabilityMatrixResponse = {
  total: number;
  limit: number;
  offset: number;
  items: InstallerProfitabilityMatrixItem[];
};

type InstallerProjectProfitabilityItem = {
  installer_id: string;
  installer_name: string;
  project_id: string;
  project_name: string;
  performance_band: string;
  installed_doors: number;
  open_issues: number;
  addons_done_qty: number;
  revenue_total: number;
  payroll_total: number;
  profit_total: number;
  margin_pct: number;
  avg_profit_per_door: number;
  missing_rates_installed_doors: number;
  missing_addon_plans_facts: number;
  last_installed_at: string | null;
};

type InstallerProjectProfitabilityResponse = {
  total: number;
  limit: number;
  offset: number;
  items: InstallerProjectProfitabilityItem[];
};

type InstallerKpiProjectItem = {
  project_id: string;
  project_name: string;
  installed_doors: number;
  open_issues: number;
  revenue_total: number;
  payroll_total: number;
  profit_total: number;
  last_installed_at: string | null;
};

type InstallerKpiOrderItem = {
  order_number: string;
  installed_doors: number;
  revenue_total: number;
  payroll_total: number;
  profit_total: number;
};

type InstallerKpiDetailsResponse = {
  installer_id: string;
  installer_name: string;
  installed_doors: number;
  active_projects: number;
  order_numbers: number;
  open_issues: number;
  addons_done_qty: number;
  addon_revenue_total: number;
  addon_payroll_total: number;
  addon_profit_total: number;
  revenue_total: number;
  payroll_total: number;
  profit_total: number;
  missing_rates_installed_doors: number;
  missing_addon_plans_facts: number;
  last_installed_at: string | null;
  top_projects: InstallerKpiProjectItem[];
  order_breakdown: InstallerKpiOrderItem[];
};

type OrderNumberKpiItem = {
  order_number: string;
  total_doors: number;
  installed_doors: number;
  not_installed_doors: number;
  open_issues: number;
  planned_revenue_total: number;
  installed_revenue_total: number;
  payroll_total: number;
  profit_total: number;
  missing_rates_installed_doors: number;
  completion_pct: number;
};

type OrderNumbersKpiResponse = {
  total: number;
  limit: number;
  offset: number;
  items: OrderNumberKpiItem[];
};

type ProjectPlanFactResponse = {
  project_id: string;
  total_doors: number;
  installed_doors: number;
  not_installed_doors: number;
  completion_pct: number;
  open_issues: number;
  planned_revenue_total: number;
  actual_revenue_total: number;
  revenue_gap_total: number;
  planned_payroll_total: number;
  actual_payroll_total: number;
  payroll_gap_total: number;
  planned_profit_total: number;
  actual_profit_total: number;
  profit_gap_total: number;
  planned_addons_qty: number;
  actual_addons_qty: number;
  missing_planned_rates_doors: number;
  missing_actual_rates_doors: number;
  missing_addon_plans_facts: number;
};

type ProjectRiskDriverItem = {
  code: string;
  label: string;
  severity: string;
  value: number;
};

type ProjectRiskReasonItem = {
  reason_id: string | null;
  reason_name: string;
  doors: number;
  revenue_delayed_total: number;
  profit_delayed_total: number;
};

type ProjectRiskOrderItem = {
  order_number: string;
  total_doors: number;
  installed_doors: number;
  not_installed_doors: number;
  open_issues: number;
  planned_revenue_total: number;
  actual_revenue_total: number;
  revenue_gap_total: number;
  actual_profit_total: number;
  completion_pct: number;
};

type ProjectRiskDrilldownSummary = {
  total_doors: number;
  installed_doors: number;
  not_installed_doors: number;
  completion_pct: number;
  open_issues: number;
  blocked_open_issues: number;
  planned_revenue_total: number;
  actual_revenue_total: number;
  revenue_gap_total: number;
  planned_profit_total: number;
  actual_profit_total: number;
  profit_gap_total: number;
  actual_margin_pct: number;
  delayed_revenue_total: number;
  delayed_profit_total: number;
  blocked_issue_profit_at_risk: number;
  addon_revenue_total: number;
  addon_profit_total: number;
  missing_planned_rates_doors: number;
  missing_actual_rates_doors: number;
  missing_addon_plans_facts: number;
};

type ProjectRiskDrilldownResponse = {
  generated_at: string;
  project_id: string;
  project_name: string;
  summary: ProjectRiskDrilldownSummary;
  drivers: ProjectRiskDriverItem[];
  top_reasons: ProjectRiskReasonItem[];
  risky_orders: ProjectRiskOrderItem[];
};

type ProjectMarginItem = {
  project_id: string;
  project_name: string;
  project_status: string;
  total_doors: number;
  installed_doors: number;
  completion_pct: number;
  open_issues: number;
  revenue_total: number;
  payroll_total: number;
  profit_total: number;
  margin_pct: number;
  missing_rates_installed_doors: number;
  missing_addon_plans_facts: number;
  last_installed_at: string | null;
};

type ProjectsMarginResponse = {
  total: number;
  limit: number;
  offset: number;
  items: ProjectMarginItem[];
};

type IssuesAddonsImpactSummary = {
  open_issues: number;
  blocked_open_issues: number;
  not_installed_doors: number;
  open_issue_revenue_at_risk: number;
  open_issue_payroll_at_risk: number;
  open_issue_profit_at_risk: number;
  blocked_issue_profit_at_risk: number;
  delayed_revenue_total: number;
  delayed_payroll_total: number;
  delayed_profit_total: number;
  addon_revenue_total: number;
  addon_payroll_total: number;
  addon_profit_total: number;
  missing_addon_plans_facts: number;
};

type IssuesAddonsImpactReasonItem = {
  reason_id: string | null;
  reason_name: string;
  doors: number;
  revenue_delayed_total: number;
  payroll_delayed_total: number;
  profit_delayed_total: number;
};

type IssuesAddonsImpactAddonItem = {
  addon_type_id: string | null;
  addon_name: string;
  qty_done: number;
  revenue_total: number;
  payroll_total: number;
  profit_total: number;
  missing_plan_facts: number;
};

type IssuesAddonsImpactResponse = {
  generated_at: string;
  summary: IssuesAddonsImpactSummary;
  top_reasons: IssuesAddonsImpactReasonItem[];
  addon_impact: IssuesAddonsImpactAddonItem[];
};

type RiskConcentrationSummary = {
  open_issue_profit_at_risk: number;
  blocked_issue_profit_at_risk: number;
  delayed_profit_total: number;
  risky_projects: number;
  risky_orders: number;
  risky_installers: number;
  worst_project_profit_total: number;
  worst_order_profit_total: number;
  worst_installer_profit_total: number;
};

type RiskConcentrationResponse = {
  generated_at: string;
  summary: RiskConcentrationSummary;
  projects: ProjectMarginItem[];
  orders: OrderNumberKpiItem[];
  installers: InstallerProfitabilityMatrixItem[];
};

type ReportsPreset = {
  id: string;
  name: string;
  created_at: string;
  slaHistoryDays: number;
  installerMatrixSortBy: InstallerMatrixSortBy;
  installerMatrixSortDir: SortDir;
  installerProjectSortBy: InstallerProjectSortBy;
  installerProjectSortDir: SortDir;
  installersSortBy: InstallersSortBy;
  installersSortDir: SortDir;
  orderNumbersSortBy: OrderNumbersSortBy;
  orderNumbersSortDir: SortDir;
  orderNumbersQuery: string;
  orderNumbersProjectId: string;
  projectPlanFactProjectId: string;
  projectRiskProjectId: string;
};

type ReportsFocus = "operations" | "delivery" | "issues";
type ReportsOpsPreset = "failed-imports" | "delivery-risk" | "issue-pressure";

type SortDir = "asc" | "desc";
type InstallersSortBy =
  | "installed_doors"
  | "payroll_total"
  | "revenue_total"
  | "profit_total"
  | "installer_name";
type InstallerMatrixSortBy =
  | "profit_total"
  | "margin_pct"
  | "installed_doors"
  | "avg_profit_per_door"
  | "open_issues";
type InstallerProjectSortBy =
  | "profit_total"
  | "margin_pct"
  | "installed_doors"
  | "open_issues"
  | "avg_profit_per_door";
type OrderNumbersSortBy =
  | "order_number"
  | "total_doors"
  | "installed_doors"
  | "not_installed_doors"
  | "planned_revenue_total"
  | "installed_revenue_total"
  | "payroll_total"
  | "profit_total"
  | "missing_rates_installed_doors";

const PAGE_SIZE = 20;
const KPI_PAGE_SIZE = 20;
const FAILED_OUTBOX_LIMIT = 8;
const AUDIT_PREVIEW_LIMIT = 8;
const AUDIT_EXPORT_LIMIT = 10000;
const KPI_EXPORT_LIMIT = 5000;
const ISSUES_ANALYTICS_DAYS = 30;
const PROJECT_MARGIN_LIMIT = 5;
const INSTALLER_MATRIX_LIMIT = 8;
const INSTALLER_PROJECT_LIMIT = 10;
const RISK_CONCENTRATION_LIMIT = 5;
const REPORTS_PRESETS_STORAGE_KEY = "dimax_reports_presets_v1";
const REPORTS_FOCUS_IDS: Record<ReportsFocus, string> = {
  operations: "reports-operations-center",
  delivery: "reports-delivery-risk",
  issues: "reports-issues-analytics",
};

const REPORTS_FOCUS_COPY: Record<ReportsFocus, { title: string; description: string }> = {
  operations: {
    title: "Focused from Operations: command center",
    description: "Operational command center and SLA blocks are in focus for queue triage.",
  },
  delivery: {
    title: "Focused from Operations: delivery risk",
    description: "Delivery and failed outbox blocks are in focus for communication incidents.",
  },
  issues: {
    title: "Focused from Operations: issue pressure",
    description: "Issues analytics is in focus for backlog and risk follow-up.",
  },
};

const REPORTS_OPS_PRESET_COPY: Record<
  ReportsOpsPreset,
  { title: string; description: string; slaHistoryDays: number }
> = {
  "failed-imports": {
    title: "Operations preset: failed imports",
    description: "Short-range SLA view for import failures and queue recovery.",
    slaHistoryDays: 7,
  },
  "delivery-risk": {
    title: "Operations preset: delivery risk",
    description: "Short-range delivery view for failed outbox and communication pressure.",
    slaHistoryDays: 7,
  },
  "issue-pressure": {
    title: "Operations preset: issue pressure",
    description: "Two-week issue pressure view for backlog and escalation monitoring.",
    slaHistoryDays: 14,
  },
};

type ReportsScopedContext = {
  projectId: string | null;
  outboxId: string | null;
  installerId: string | null;
  deliveryChannel: string | null;
  webhookProvider: string | null;
};

function parseReportsFocus(value: string | null): ReportsFocus | null {
  if (value === "operations" || value === "delivery" || value === "issues") {
    return value;
  }
  return null;
}

function parseReportsOpsPreset(value: string | null): ReportsOpsPreset | null {
  if (value === "failed-imports" || value === "delivery-risk" || value === "issue-pressure") {
    return value;
  }
  return null;
}

function getReportsFocusTargetId(
  focus: ReportsFocus | null,
  scope: ReportsScopedContext
): string | null {
  if (scope.projectId) {
    return "reports-project-plan-fact";
  }
  if (scope.outboxId) {
    return "reports-failed-outbox";
  }
  if (scope.deliveryChannel || scope.webhookProvider) {
    return "reports-delivery-scope";
  }
  if (scope.installerId) {
    return "reports-installers-kpi";
  }
  if (!focus) {
    return null;
  }
  return REPORTS_FOCUS_IDS[focus];
}
const AUDIT_ENTITY_OPTIONS = ["door_type", "reason", "company", "project"] as const;
const AUDIT_ACTION_OPTIONS = [
  "DOOR_TYPE_CREATE",
  "DOOR_TYPE_UPDATE",
  "DOOR_TYPE_DELETE",
  "REASON_CREATE",
  "REASON_UPDATE",
  "REASON_DELETE",
  "SETTINGS_COMPANY_UPDATE",
  "PROJECT_DOORS_IMPORT_ANALYZE",
  "PROJECT_DOORS_IMPORT_APPLY",
  "PROJECT_DOORS_IMPORT_RETRY",
  "PROJECT_DOORS_IMPORT_RETRY_BULK",
] as const;
const ISSUE_AUDIT_ACTION_OPTIONS = [
  "ISSUE_STATUS_UPDATE",
  "ISSUE_WORKFLOW_UPDATE",
  "ISSUE_WORKFLOW_BULK_UPDATE",
] as const;
const SLA_HISTORY_DAYS_OPTIONS = [7, 30] as const;
const SORT_DIR_OPTIONS: Array<{ value: SortDir; label: string }> = [
  { value: "desc", label: "Desc" },
  { value: "asc", label: "Asc" },
];
const INSTALLERS_SORT_OPTIONS: Array<{ value: InstallersSortBy; label: string }> = [
  { value: "installed_doors", label: "Installed Doors" },
  { value: "payroll_total", label: "Payroll" },
  { value: "revenue_total", label: "Revenue" },
  { value: "profit_total", label: "Profit" },
  { value: "installer_name", label: "Installer Name" },
];
const INSTALLER_MATRIX_SORT_OPTIONS: Array<{
  value: InstallerMatrixSortBy;
  label: string;
}> = [
  { value: "profit_total", label: "Profit" },
  { value: "margin_pct", label: "Margin %" },
  { value: "installed_doors", label: "Installed Doors" },
  { value: "avg_profit_per_door", label: "Profit / Door" },
  { value: "open_issues", label: "Open Issues" },
];
const INSTALLER_PROJECT_SORT_OPTIONS: Array<{
  value: InstallerProjectSortBy;
  label: string;
}> = [
  { value: "profit_total", label: "Profit" },
  { value: "margin_pct", label: "Margin %" },
  { value: "installed_doors", label: "Installed Doors" },
  { value: "avg_profit_per_door", label: "Profit / Door" },
  { value: "open_issues", label: "Open Issues" },
];
const ORDER_NUMBERS_SORT_OPTIONS: Array<{ value: OrderNumbersSortBy; label: string }> = [
  { value: "total_doors", label: "Total Doors" },
  { value: "installed_doors", label: "Installed Doors" },
  { value: "not_installed_doors", label: "Not Installed" },
  { value: "planned_revenue_total", label: "Planned Revenue" },
  { value: "installed_revenue_total", label: "Installed Revenue" },
  { value: "payroll_total", label: "Payroll" },
  { value: "profit_total", label: "Profit" },
  { value: "missing_rates_installed_doors", label: "Missing Rates" },
  { value: "order_number", label: "Order Number" },
];

const SLA_STATUS_CLASS: Record<string, string> = {
  OK: "text-[hsl(var(--success))] bg-[hsl(var(--success)/0.12)] border-[hsl(var(--success)/0.28)]",
  WARN: "text-[hsl(var(--warning-foreground))] bg-[hsl(var(--warning)/0.12)] border-[hsl(var(--warning)/0.28)]",
  DANGER:
    "text-[hsl(var(--destructive))] bg-[hsl(var(--destructive)/0.12)] border-[hsl(var(--destructive)/0.28)]",
};

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

function metricLabel(metric: string | null): string {
  if (!metric) {
    return "unknown";
  }
  return metric.replaceAll("_", " ");
}

function compactMap(map: Record<string, number> | undefined): string {
  if (!map || Object.keys(map).length === 0) {
    return "n/a";
  }
  return Object.entries(map)
    .map(([k, v]) => `${k}: ${v}`)
    .join(" | ");
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

function formatAmount(value: number | null | undefined): string {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) {
    return "0.00";
  }
  return num.toFixed(2);
}

function formatPercent(value: number | null | undefined): string {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) {
    return "0.00%";
  }
  return `${num.toFixed(2)}%`;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function errorMessageFromUnknown(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

async function downloadCsvExport(pathWithQuery: string, fallbackFilename: string): Promise<void> {
  const token = getAccessToken();
  const headers = new Headers();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const response = await fetch(`${apiBaseUrl()}${pathWithQuery}`, {
    method: "GET",
    headers,
  });
  if (!response.ok) {
    throw new Error(`Export failed: ${response.status} ${response.statusText}`);
  }
  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition") || "";
  const match = disposition.match(/filename=\"?([^"]+)\"?/i);
  const filename = match?.[1] || fallbackFilename;
  downloadBlob(blob, filename);
}

function auditDateFromValue(value: string): string | null {
  if (!value) {
    return null;
  }
  return new Date(`${value}T00:00:00`).toISOString();
}

function auditDateToValue(value: string): string | null {
  if (!value) {
    return null;
  }
  return new Date(`${value}T23:59:59.999`).toISOString();
}

function buildAuditParams({
  entityType,
  entityId,
  action,
  dateFrom,
  dateTo,
  limit,
  offset,
}: {
  entityType: string;
  entityId?: string;
  action: string;
  dateFrom: string;
  dateTo: string;
  limit: number;
  offset: number;
}): string {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  if (entityType) {
    params.set("entity_type", entityType);
  }
  if (entityId) {
    params.set("issue_id", entityId);
  }
  if (action) {
    params.set("action", action);
  }
  const from = auditDateFromValue(dateFrom);
  const to = auditDateToValue(dateTo);
  if (from) {
    params.set("date_from", from);
  }
  if (to) {
    params.set("date_to", to);
  }
  return params.toString();
}

function changedFieldKeys(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined
): string[] {
  const beforeObj = before || {};
  const afterObj = after || {};
  const keys = new Set<string>([
    ...Object.keys(beforeObj),
    ...Object.keys(afterObj),
  ]);
  const changed: string[] = [];
  for (const key of keys) {
    const left = JSON.stringify(beforeObj[key] ?? null);
    const right = JSON.stringify(afterObj[key] ?? null);
    if (left !== right) {
      changed.push(key);
    }
  }
  changed.sort((a, b) => a.localeCompare(b, "en"));
  return changed;
}

function prettyJson(value: unknown): string {
  if (value === null || value === undefined) {
    return "{}";
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function readReportsPresets(): ReportsPreset[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(REPORTS_PRESETS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeReportsPresets(presets: ReportsPreset[]): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(REPORTS_PRESETS_STORAGE_KEY, JSON.stringify(presets));
}

function SectionMessage({
  title,
  detail,
  tone = "muted",
}: {
  title: string;
  detail: string;
  tone?: "muted" | "error";
}) {
  const toneClass =
    tone === "error"
      ? "border-[hsl(var(--destructive)/0.35)] bg-[hsl(var(--destructive)/0.08)] text-[hsl(var(--destructive))]"
      : "border-border/70 bg-background/60 text-muted-foreground";
  return (
    <div className={cn("rounded-lg border px-4 py-3 text-[13px]", toneClass)}>
      <div className="font-medium">{title}</div>
      <div className="mt-1 text-[12px]">{detail}</div>
    </div>
  );
}

export default function ReportsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const userRole = useUserRole();
  const canRunPrivilegedActions = userRole !== "INSTALLER";
  const privilegedActionHint = canRunPrivilegedActions
    ? undefined
    : "Installer role is read-only in reports";
  const [offset, setOffset] = useState(0);
  const [auditOffset, setAuditOffset] = useState(0);
  const [auditEntityType, setAuditEntityType] = useState("");
  const [auditAction, setAuditAction] = useState("");
  const [auditDateFrom, setAuditDateFrom] = useState("");
  const [auditDateTo, setAuditDateTo] = useState("");
  const [issueAuditOffset, setIssueAuditOffset] = useState(0);
  const [issueAuditAction, setIssueAuditAction] = useState("");
  const [issueAuditDateFrom, setIssueAuditDateFrom] = useState("");
  const [issueAuditDateTo, setIssueAuditDateTo] = useState("");
  const [issueAuditIssueId, setIssueAuditIssueId] = useState("");
  const [expandedIssueAuditId, setExpandedIssueAuditId] = useState<string | null>(null);
  const [slaHistoryDays, setSlaHistoryDays] = useState<number>(30);
  const [installerMatrixSortBy, setInstallerMatrixSortBy] =
    useState<InstallerMatrixSortBy>("profit_total");
  const [installerMatrixSortDir, setInstallerMatrixSortDir] = useState<SortDir>("desc");
  const [installerProjectSortBy, setInstallerProjectSortBy] =
    useState<InstallerProjectSortBy>("profit_total");
  const [installerProjectSortDir, setInstallerProjectSortDir] = useState<SortDir>("desc");
  const [installersKpiOffset, setInstallersKpiOffset] = useState(0);
  const [installersSortBy, setInstallersSortBy] = useState<InstallersSortBy>("installed_doors");
  const [installersSortDir, setInstallersSortDir] = useState<SortDir>("desc");
  const [installerDetailsId, setInstallerDetailsId] = useState("");
  const [orderNumbersKpiOffset, setOrderNumbersKpiOffset] = useState(0);
  const [orderNumbersSortBy, setOrderNumbersSortBy] = useState<OrderNumbersSortBy>("total_doors");
  const [orderNumbersSortDir, setOrderNumbersSortDir] = useState<SortDir>("desc");
  const [orderNumbersQuery, setOrderNumbersQuery] = useState("");
  const [orderNumbersProjectId, setOrderNumbersProjectId] = useState("");
  const [projectPlanFactProjectId, setProjectPlanFactProjectId] = useState("");
  const [projectRiskProjectId, setProjectRiskProjectId] = useState("");
  const [presetName, setPresetName] = useState("");
  const [savedPresets, setSavedPresets] = useState<ReportsPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [presetNotice, setPresetNotice] = useState<string | null>(null);
  const activeFocus = parseReportsFocus(searchParams?.get("focus") || null);
  const activeOpsPreset = parseReportsOpsPreset(searchParams?.get("ops_preset") || null);
  const scopedProjectId = searchParams?.get("project_id") || null;
  const scopedOutboxId = searchParams?.get("outbox_id") || null;
  const scopedInstallerId = searchParams?.get("installer_id") || null;
  const scopedDeliveryChannel = searchParams?.get("delivery_channel")?.trim().toUpperCase() || null;
  const scopedWebhookProvider = searchParams?.get("webhook_provider")?.trim().toLowerCase() || null;
  const appliedOpsPresetRef = useRef<ReportsOpsPreset | null>(null);
  const appliedProjectScopeRef = useRef<string | null>(null);
  const appliedInstallerScopeRef = useRef<string | null>(null);
  const issueAuditIssueIdTrimmed = issueAuditIssueId.trim();
  const issueAuditIssueIdNormalized = isUuid(issueAuditIssueIdTrimmed)
    ? issueAuditIssueIdTrimmed
    : "";
  const orderNumbersQueryNormalized = orderNumbersQuery.trim();

  const installersParams = new URLSearchParams();
  installersParams.set("limit", String(KPI_PAGE_SIZE));
  installersParams.set("offset", String(installersKpiOffset));
  installersParams.set("sort_by", installersSortBy);
  installersParams.set("sort_dir", installersSortDir);

  const orderNumbersParams = new URLSearchParams();
  orderNumbersParams.set("limit", String(KPI_PAGE_SIZE));
  orderNumbersParams.set("offset", String(orderNumbersKpiOffset));
  orderNumbersParams.set("sort_by", orderNumbersSortBy);
  orderNumbersParams.set("sort_dir", orderNumbersSortDir);
  if (orderNumbersQueryNormalized) {
    orderNumbersParams.set("q", orderNumbersQueryNormalized);
  }
  if (orderNumbersProjectId) {
    orderNumbersParams.set("project_id", orderNumbersProjectId);
  }

  const alertsQuery = useQuery({
    queryKey: ["limit-alerts", offset],
    queryFn: () =>
      apiFetch<LimitAlertsResponse>(
        `/api/v1/admin/reports/limit-alerts?limit=${PAGE_SIZE}&offset=${offset}`
      ),
    refetchInterval: 30_000,
  });

  const deliveryQuery = useQuery({
    queryKey: ["reports-delivery"],
    queryFn: () => apiFetch<DeliveryStatsResponse>("/api/v1/admin/reports/delivery"),
    refetchInterval: 30_000,
  });

  const outboxSummaryQuery = useQuery({
    queryKey: ["outbox-summary"],
    queryFn: () => apiFetch<OutboxSummaryResponse>("/api/v1/admin/outbox/summary"),
    refetchInterval: 30_000,
  });

  const operationsCenterQuery = useQuery({
    queryKey: ["reports-operations-center"],
    queryFn: () =>
      apiFetch<OperationsCenterResponse>("/api/v1/admin/reports/operations-center"),
    refetchInterval: 30_000,
  });

  const operationsSlaQuery = useQuery({
    queryKey: ["reports-operations-sla"],
    queryFn: () => apiFetch<OperationsSlaResponse>("/api/v1/admin/reports/operations-sla"),
    refetchInterval: 30_000,
  });

  const operationsSlaHistoryQuery = useQuery({
    queryKey: ["reports-operations-sla-history", slaHistoryDays],
    queryFn: () =>
      apiFetch<OperationsSlaHistoryResponse>(
        `/api/v1/admin/reports/operations-sla/history?days=${slaHistoryDays}`
      ),
    refetchInterval: 30_000,
  });

  const issuesAnalyticsQuery = useQuery({
    queryKey: ["reports-issues-analytics", ISSUES_ANALYTICS_DAYS],
    queryFn: () =>
      apiFetch<IssuesAnalyticsResponse>(
        `/api/v1/admin/reports/issues-analytics?days=${ISSUES_ANALYTICS_DAYS}`
      ),
    refetchInterval: 30_000,
  });

  const issuesAddonsImpactQuery = useQuery({
    queryKey: ["reports-issues-addons-impact"],
    queryFn: () =>
      apiFetch<IssuesAddonsImpactResponse>("/api/v1/admin/reports/issues-addons-impact"),
    refetchInterval: 30_000,
  });

  const riskConcentrationQuery = useQuery({
    queryKey: ["reports-risk-concentration"],
    queryFn: () =>
      apiFetch<RiskConcentrationResponse>(
        `/api/v1/admin/reports/risk-concentration?limit=${RISK_CONCENTRATION_LIMIT}`
      ),
    refetchInterval: 30_000,
  });

  const installerProfitabilityMatrixQuery = useQuery({
    queryKey: [
      "reports-installer-profitability-matrix",
      installerMatrixSortBy,
      installerMatrixSortDir,
    ],
    queryFn: () =>
      apiFetch<InstallerProfitabilityMatrixResponse>(
        `/api/v1/admin/reports/installers-profitability-matrix`
        + `?limit=${INSTALLER_MATRIX_LIMIT}`
        + `&sort_by=${installerMatrixSortBy}`
        + `&sort_dir=${installerMatrixSortDir}`
      ),
    refetchInterval: 30_000,
  });

  const installerProjectProfitabilityQuery = useQuery({
    queryKey: [
      "reports-installer-project-profitability",
      installerProjectSortBy,
      installerProjectSortDir,
    ],
    queryFn: () =>
      apiFetch<InstallerProjectProfitabilityResponse>(
        `/api/v1/admin/reports/installer-project-profitability`
        + `?limit=${INSTALLER_PROJECT_LIMIT}`
        + `&sort_by=${installerProjectSortBy}`
        + `&sort_dir=${installerProjectSortDir}`
      ),
    refetchInterval: 30_000,
  });

  const projectsQuery = useQuery({
    queryKey: ["reports-project-options"],
    queryFn: () => apiFetch<{ items: ProjectOption[] }>("/api/v1/admin/projects"),
    refetchInterval: 120_000,
  });

  const projectPlanFactQuery = useQuery({
    queryKey: ["reports-project-plan-fact", projectPlanFactProjectId],
    queryFn: () =>
      apiFetch<ProjectPlanFactResponse>(
        `/api/v1/admin/reports/project-plan-fact/${projectPlanFactProjectId}`
      ),
    enabled: Boolean(projectPlanFactProjectId),
    refetchInterval: 30_000,
  });

  const projectRiskDrilldownQuery = useQuery({
    queryKey: ["reports-project-risk-drilldown", projectRiskProjectId],
    queryFn: () =>
      apiFetch<ProjectRiskDrilldownResponse>(
        `/api/v1/admin/reports/project-risk-drilldown/${projectRiskProjectId}?limit=5`
      ),
    enabled: Boolean(projectRiskProjectId),
    refetchInterval: 30_000,
  });

  const topProjectsMarginQuery = useQuery({
    queryKey: ["reports-projects-margin", "top"],
    queryFn: () =>
      apiFetch<ProjectsMarginResponse>(
        `/api/v1/admin/reports/projects-margin?limit=${PROJECT_MARGIN_LIMIT}&sort_by=profit_total&sort_dir=desc`
      ),
    refetchInterval: 30_000,
  });

  const riskProjectsMarginQuery = useQuery({
    queryKey: ["reports-projects-margin", "risk"],
    queryFn: () =>
      apiFetch<ProjectsMarginResponse>(
        `/api/v1/admin/reports/projects-margin?limit=${PROJECT_MARGIN_LIMIT}&sort_by=profit_total&sort_dir=asc`
      ),
    refetchInterval: 30_000,
  });

  const installersKpiQuery = useQuery({
    queryKey: [
      "reports-installers-kpi",
      installersKpiOffset,
      installersSortBy,
      installersSortDir,
    ],
    queryFn: () =>
      apiFetch<InstallersKpiResponse>(
        `/api/v1/admin/reports/installers-kpi?${installersParams.toString()}`
      ),
    refetchInterval: 30_000,
  });

  const installerDetailsQuery = useQuery({
    queryKey: ["reports-installer-kpi-details", installerDetailsId],
    queryFn: () =>
      apiFetch<InstallerKpiDetailsResponse>(
        `/api/v1/admin/reports/installers-kpi/${installerDetailsId}`
      ),
    enabled: Boolean(installerDetailsId),
    refetchInterval: 30_000,
  });

  const orderNumbersKpiQuery = useQuery({
    queryKey: [
      "reports-order-numbers-kpi",
      orderNumbersKpiOffset,
      orderNumbersSortBy,
      orderNumbersSortDir,
      orderNumbersQueryNormalized,
      orderNumbersProjectId,
    ],
    queryFn: () =>
      apiFetch<OrderNumbersKpiResponse>(
        `/api/v1/admin/reports/order-numbers-kpi?${orderNumbersParams.toString()}`
      ),
    refetchInterval: 30_000,
  });

  const failedOutboxQuery = useQuery({
    queryKey: ["outbox-failed", scopedDeliveryChannel],
    queryFn: () =>
      apiFetch<OutboxListResponse>(`/api/v1/admin/outbox?${(() => {
        const params = new URLSearchParams();
        params.set("status", "FAILED");
        params.set("limit", String(FAILED_OUTBOX_LIMIT));
        if (scopedDeliveryChannel) {
          params.set("channel", scopedDeliveryChannel);
        }
        return params.toString();
      })()}`),
    refetchInterval: 30_000,
  });

  const webhookSignalsQuery = useQuery({
    queryKey: ["reports-webhook-signals", scopedWebhookProvider],
    queryFn: () =>
      apiFetch<WebhookSignalListResponse>("/api/v1/admin/outbox/webhook-signals?limit=12"),
    refetchInterval: 30_000,
  });
  const retryAuditsQuery = useQuery({
    queryKey: ["reports-outbox-retry-audits", scopedOutboxId],
    queryFn: () =>
      apiFetch<OutboxRetryAuditListResponse>("/api/v1/admin/outbox/retry-audits?limit=12"),
    refetchInterval: 30_000,
  });

  const auditCatalogsQuery = useQuery({
    queryKey: [
      "audit-catalogs-preview",
      auditOffset,
      auditEntityType,
      auditAction,
      auditDateFrom,
      auditDateTo,
    ],
    queryFn: () =>
      apiFetch<AuditCatalogChangesResponse>(
        `/api/v1/admin/reports/audit-catalogs?${buildAuditParams({
          entityType: auditEntityType,
          action: auditAction,
          dateFrom: auditDateFrom,
          dateTo: auditDateTo,
          limit: AUDIT_PREVIEW_LIMIT,
          offset: auditOffset,
        })}`
      ),
    refetchInterval: 60_000,
  });

  const issueAuditQuery = useQuery({
    queryKey: [
      "audit-issues-preview",
      issueAuditOffset,
      issueAuditAction,
      issueAuditDateFrom,
      issueAuditDateTo,
      issueAuditIssueIdNormalized,
    ],
    queryFn: () =>
      apiFetch<AuditCatalogChangesResponse>(
        `/api/v1/admin/reports/audit-issues?${buildAuditParams({
          entityType: "",
          entityId: issueAuditIssueIdNormalized,
          action: issueAuditAction,
          dateFrom: issueAuditDateFrom,
          dateTo: issueAuditDateTo,
          limit: AUDIT_PREVIEW_LIMIT,
          offset: issueAuditOffset,
        })}`
      ),
    refetchInterval: 60_000,
  });

  const markReadMutation = useMutation({
    mutationFn: () =>
      apiFetch<LimitAlertsReadResponse>("/api/v1/admin/reports/limit-alerts/read", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["limit-alerts"] });
      await queryClient.invalidateQueries({ queryKey: ["limit-alerts-unread"] });
    },
  });

  const retryMutation = useMutation({
    mutationFn: (outboxId: string) =>
      apiFetch<OutboxRetryResponse>(`/api/v1/admin/outbox/${outboxId}/retry`, {
        method: "POST",
        body: JSON.stringify({ reason: "manual retry from reports" }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["outbox-summary"] });
      await queryClient.invalidateQueries({ queryKey: ["outbox-failed"] });
      await queryClient.invalidateQueries({ queryKey: ["reports-delivery"] });
    },
  });

  const exportAuditMutation = useMutation({
    mutationFn: () =>
      downloadCsvExport(
        `/api/v1/admin/reports/audit-catalogs/export?${buildAuditParams({
          entityType: auditEntityType,
          action: auditAction,
          dateFrom: auditDateFrom,
          dateTo: auditDateTo,
          limit: AUDIT_EXPORT_LIMIT,
          offset: 0,
        })}`,
        "audit_catalogs.csv"
      ),
  });

  const exportIssueAuditMutation = useMutation({
    mutationFn: () =>
      downloadCsvExport(
        `/api/v1/admin/reports/audit-issues/export?${buildAuditParams({
          entityType: "",
          entityId: issueAuditIssueIdNormalized,
          action: issueAuditAction,
          dateFrom: issueAuditDateFrom,
          dateTo: issueAuditDateTo,
          limit: AUDIT_EXPORT_LIMIT,
          offset: 0,
        })}`,
        "audit_issues.csv"
      ),
  });

  const exportInstallersKpiMutation = useMutation({
    mutationFn: () => {
      const params = new URLSearchParams();
      params.set("limit", String(KPI_EXPORT_LIMIT));
      params.set("offset", "0");
      params.set("sort_by", installersSortBy);
      params.set("sort_dir", installersSortDir);
      return downloadCsvExport(
        `/api/v1/admin/reports/installers-kpi/export?${params.toString()}`,
        "installers_kpi.csv"
      );
    },
  });

  const exportOrderNumbersKpiMutation = useMutation({
    mutationFn: () => {
      const params = new URLSearchParams();
      params.set("limit", String(KPI_EXPORT_LIMIT));
      params.set("offset", "0");
      params.set("sort_by", orderNumbersSortBy);
      params.set("sort_dir", orderNumbersSortDir);
      if (orderNumbersQueryNormalized) {
        params.set("q", orderNumbersQueryNormalized);
      }
      if (orderNumbersProjectId) {
        params.set("project_id", orderNumbersProjectId);
      }
      return downloadCsvExport(
        `/api/v1/admin/reports/order-numbers-kpi/export?${params.toString()}`,
        "order_numbers_kpi.csv"
      );
    },
  });

  const exportExecutiveMutation = useMutation({
    mutationFn: () => {
      const params = new URLSearchParams();
      if (projectPlanFactProjectId) {
        params.set("project_plan_fact_project_id", projectPlanFactProjectId);
      }
      if (projectRiskProjectId) {
        params.set("project_risk_project_id", projectRiskProjectId);
      }
      return downloadCsvExport(
        `/api/v1/admin/reports/executive/export?${params.toString()}`,
        "reports_executive_snapshot.csv"
      );
    },
  });

  const items = alertsQuery.data?.items || [];
  const unreadCount = alertsQuery.data?.unread_count || 0;
  const opsUnreadCount = operationsCenterQuery.data?.alerts?.unread_count;
  const unreadBadge = opsUnreadCount ?? unreadCount;
  const canGoPrev = offset > 0;
  const canGoNext = items.length >= PAGE_SIZE;

  const delivery = deliveryQuery.data;
  const outboxSummary = outboxSummaryQuery.data;
  const operationsCenter = operationsCenterQuery.data;
  const operationsSla = operationsSlaQuery.data;
  const operationsSlaHistory = operationsSlaHistoryQuery.data;
  const issuesAnalytics = issuesAnalyticsQuery.data;
  const issuesAddonsImpact = issuesAddonsImpactQuery.data;
  const riskConcentration = riskConcentrationQuery.data;
  const installerProfitabilityMatrix = installerProfitabilityMatrixQuery.data?.items || [];
  const installerProjectProfitability = installerProjectProfitabilityQuery.data?.items || [];
  const projectOptions = projectsQuery.data?.items || [];
  const projectPlanFact = projectPlanFactQuery.data;
  const projectRiskDrilldown = projectRiskDrilldownQuery.data;
  const topProjectsMargin = topProjectsMarginQuery.data?.items || [];
  const riskProjectsMargin = riskProjectsMarginQuery.data?.items || [];
  const installersKpiItems = installersKpiQuery.data?.items || [];
  const installerDetails = installerDetailsQuery.data;
  const orderNumbersKpiItems = orderNumbersKpiQuery.data?.items || [];
  const topFailingProjects = operationsCenter?.top_failing_projects || [];
  const slaMetrics = operationsSla?.metrics || [];
  const slaPlaybooks = operationsSla?.playbooks || [];
  const slaHistoryPoints = operationsSlaHistory?.points || [];
  const slaHistorySummary = operationsSlaHistory?.summary;
  const slaHistoryRecent = slaHistoryPoints.slice(-10).reverse();
  const failedItems = failedOutboxQuery.data?.items || [];
  const webhookSignalItems = webhookSignalsQuery.data?.items || [];
  const scopedWebhookSignals = webhookSignalItems.filter(
    (item) => !scopedWebhookProvider || item.provider.toLowerCase() === scopedWebhookProvider
  );
  const retryAuditItems = retryAuditsQuery.data?.items || [];
  const scopedRetryAuditItems = retryAuditItems.filter(
    (item) => !scopedOutboxId || item.outbox_id === scopedOutboxId
  );
  const auditItems = auditCatalogsQuery.data?.items || [];
  const auditSummary = auditCatalogsQuery.data?.summary;
  const auditCanPrev = auditOffset > 0;
  const auditCanNext = (auditOffset + AUDIT_PREVIEW_LIMIT) < (auditSummary?.total || 0);
  const issueAuditItems = issueAuditQuery.data?.items || [];
  const issueAuditSummary = issueAuditQuery.data?.summary;
  const issueAuditCanPrev = issueAuditOffset > 0;
  const issueAuditCanNext =
    (issueAuditOffset + AUDIT_PREVIEW_LIMIT) < (issueAuditSummary?.total || 0);
  const installersKpiCanPrev = installersKpiOffset > 0;
  const installersKpiCanNext = installersKpiItems.length >= KPI_PAGE_SIZE;
  const orderNumbersKpiCanPrev = orderNumbersKpiOffset > 0;
  const orderNumbersKpiCanNext =
    (orderNumbersKpiOffset + KPI_PAGE_SIZE) < (orderNumbersKpiQuery.data?.total || 0);
  const focusedFailingProjectIds = topFailingProjects.map((item) => item.project_id);
  const focusedFailedProjectsHref = focusedFailingProjectIds.length > 0
    ? `/projects?failed_project_ids=${encodeURIComponent(
        focusedFailingProjectIds.join(",")
      )}&only_failed_runs=1`
    : "/projects?only_failed_runs=1";
  const focusFollowupActions = activeFocus === "operations"
    ? [
        { label: "Open Actionable Ops", href: "/operations?actionable=1" },
        { label: "Open Failed Projects", href: focusedFailedProjectsHref },
      ]
    : activeFocus === "delivery"
      ? [
          {
            label: "Open Actionable Ops",
            href: buildOperationsHref({
              actionable: true,
              deliveryChannel: scopedDeliveryChannel || undefined,
              webhookProvider: scopedWebhookProvider || undefined,
            }),
          },
          { label: "Open Journal Queue", href: "/journal" },
        ]
      : activeFocus === "issues"
        ? [
            { label: "Open Actionable Ops", href: "/operations?actionable=1" },
            { label: "Open Issues Board", href: "/issues" },
          ]
        : [];
  const scopedContext: ReportsScopedContext = {
    projectId: scopedProjectId,
    outboxId: scopedOutboxId,
    installerId: scopedInstallerId,
    deliveryChannel: scopedDeliveryChannel,
    webhookProvider: scopedWebhookProvider,
  };
  const focusTargetId = getReportsFocusTargetId(activeFocus, scopedContext);
  const scopeSummary = scopedProjectId
    ? `Scoped project: ${scopedProjectId}`
    : scopedOutboxId
      ? `Scoped outbox message: ${scopedOutboxId}`
      : scopedDeliveryChannel
        ? `Scoped delivery channel: ${scopedDeliveryChannel}`
        : scopedWebhookProvider
          ? `Scoped webhook provider: ${scopedWebhookProvider}`
      : scopedInstallerId
        ? `Scoped installer: ${scopedInstallerId}`
        : null;

  useEffect(() => {
    if (projectOptions.length === 0) {
      if (projectPlanFactProjectId) {
        setProjectPlanFactProjectId("");
      }
      return;
    }
    const exists = projectOptions.some((project) => project.id === projectPlanFactProjectId);
    if (!exists) {
      setProjectPlanFactProjectId(projectOptions[0].id);
    }
  }, [projectOptions, projectPlanFactProjectId]);

  useEffect(() => {
    const preferredId = riskProjectsMargin[0]?.project_id || projectOptions[0]?.id || "";
    if (!preferredId) {
      if (projectRiskProjectId) {
        setProjectRiskProjectId("");
      }
      return;
    }
    const exists =
      projectOptions.some((project) => project.id === projectRiskProjectId) ||
      riskProjectsMargin.some((project) => project.project_id === projectRiskProjectId);
    if (!exists) {
      setProjectRiskProjectId(preferredId);
    }
  }, [projectOptions, riskProjectsMargin, projectRiskProjectId]);

  useEffect(() => {
    if (installersKpiItems.length === 0) {
      if (installerDetailsId) {
        setInstallerDetailsId("");
      }
      return;
    }
    const exists = installersKpiItems.some((item) => item.installer_id === installerDetailsId);
    if (!exists) {
      setInstallerDetailsId(installersKpiItems[0].installer_id);
    }
  }, [installersKpiItems, installerDetailsId]);

  const exportErrorMessage =
    (exportAuditMutation.isError &&
      errorMessageFromUnknown(exportAuditMutation.error, "Catalog audit export failed")) ||
    (exportIssueAuditMutation.isError &&
      errorMessageFromUnknown(exportIssueAuditMutation.error, "Issue audit export failed")) ||
    (exportInstallersKpiMutation.isError &&
      errorMessageFromUnknown(exportInstallersKpiMutation.error, "Installers KPI export failed")) ||
    (exportOrderNumbersKpiMutation.isError &&
      errorMessageFromUnknown(
        exportOrderNumbersKpiMutation.error,
        "Order numbers KPI export failed"
      )) ||
    (exportExecutiveMutation.isError &&
      errorMessageFromUnknown(
        exportExecutiveMutation.error,
        "Executive reports export failed"
      )) ||
    null;

  useEffect(() => {
    setSavedPresets(readReportsPresets());
  }, []);

  useEffect(() => {
    if (!presetNotice) {
      return undefined;
    }
    const timer = window.setTimeout(() => setPresetNotice(null), 2500);
    return () => window.clearTimeout(timer);
  }, [presetNotice]);

  useEffect(() => {
    if (!activeFocus) {
      return undefined;
    }
    const timer = window.setTimeout(() => {
      const target = focusTargetId ? document.getElementById(focusTargetId) : null;
      target?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [activeFocus, focusTargetId]);

  useEffect(() => {
    if (!activeOpsPreset) {
      appliedOpsPresetRef.current = null;
      return;
    }
    if (appliedOpsPresetRef.current === activeOpsPreset) {
      return;
    }
    const preset = REPORTS_OPS_PRESET_COPY[activeOpsPreset];
    appliedOpsPresetRef.current = activeOpsPreset;
    setSlaHistoryDays(preset.slaHistoryDays);
  }, [activeOpsPreset]);

  useEffect(() => {
    if (!scopedProjectId) {
      appliedProjectScopeRef.current = null;
      return;
    }
    if (projectOptions.length === 0 || appliedProjectScopeRef.current === scopedProjectId) {
      return;
    }
    const exists = projectOptions.some((project) => project.id === scopedProjectId);
    if (!exists) {
      return;
    }
    appliedProjectScopeRef.current = scopedProjectId;
    setProjectPlanFactProjectId(scopedProjectId);
    setProjectRiskProjectId(scopedProjectId);
    setOrderNumbersProjectId(scopedProjectId);
    setOrderNumbersKpiOffset(0);
  }, [projectOptions, scopedProjectId]);

  useEffect(() => {
    if (!scopedInstallerId) {
      appliedInstallerScopeRef.current = null;
      return;
    }
    if (
      installersKpiItems.length === 0
      || appliedInstallerScopeRef.current === scopedInstallerId
    ) {
      return;
    }
    const exists = installersKpiItems.some((item) => item.installer_id === scopedInstallerId);
    if (!exists) {
      return;
    }
    appliedInstallerScopeRef.current = scopedInstallerId;
    setInstallerDetailsId(scopedInstallerId);
  }, [installersKpiItems, scopedInstallerId]);

  function applyPreset(preset: ReportsPreset): void {
    setSlaHistoryDays(preset.slaHistoryDays);
    setInstallerMatrixSortBy(preset.installerMatrixSortBy);
    setInstallerMatrixSortDir(preset.installerMatrixSortDir);
    setInstallerProjectSortBy(preset.installerProjectSortBy);
    setInstallerProjectSortDir(preset.installerProjectSortDir);
    setInstallersSortBy(preset.installersSortBy);
    setInstallersSortDir(preset.installersSortDir);
    setOrderNumbersSortBy(preset.orderNumbersSortBy);
    setOrderNumbersSortDir(preset.orderNumbersSortDir);
    setOrderNumbersQuery(preset.orderNumbersQuery);
    setOrderNumbersProjectId(preset.orderNumbersProjectId);
    setProjectPlanFactProjectId(preset.projectPlanFactProjectId);
    setProjectRiskProjectId(preset.projectRiskProjectId);
    setInstallersKpiOffset(0);
    setOrderNumbersKpiOffset(0);
    setPresetNotice(`Preset loaded: ${preset.name}`);
  }

  function handleSavePreset(): void {
    const normalizedName = presetName.trim();
    if (!normalizedName) {
      setPresetNotice("Preset name is required");
      return;
    }
    const preset: ReportsPreset = {
      id: crypto.randomUUID(),
      name: normalizedName,
      created_at: new Date().toISOString(),
      slaHistoryDays,
      installerMatrixSortBy,
      installerMatrixSortDir,
      installerProjectSortBy,
      installerProjectSortDir,
      installersSortBy,
      installersSortDir,
      orderNumbersSortBy,
      orderNumbersSortDir,
      orderNumbersQuery,
      orderNumbersProjectId,
      projectPlanFactProjectId,
      projectRiskProjectId,
    };
    const next = [preset, ...savedPresets].slice(0, 12);
    writeReportsPresets(next);
    setSavedPresets(next);
    setSelectedPresetId(preset.id);
    setPresetName("");
    setPresetNotice(`Preset saved: ${preset.name}`);
  }

  function handleApplySelectedPreset(): void {
    const preset = savedPresets.find((item) => item.id === selectedPresetId);
    if (!preset) {
      setPresetNotice("Select a preset first");
      return;
    }
    applyPreset(preset);
  }

  function handleDeleteSelectedPreset(): void {
    if (!selectedPresetId) {
      setPresetNotice("Select a preset first");
      return;
    }
    const next = savedPresets.filter((item) => item.id !== selectedPresetId);
    writeReportsPresets(next);
    setSavedPresets(next);
    setSelectedPresetId("");
    setPresetNotice("Preset deleted");
  }

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] space-y-6 p-6 lg:p-8">
        <section className="page-hero relative overflow-hidden">
          <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_top_right,hsl(var(--accent)/0.18),transparent_62%)] lg:block" />
          <div className="relative z-10 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <div className="page-eyebrow">Executive reporting surface</div>
              <h1 className="mt-3 font-display text-3xl tracking-[-0.04em] text-foreground sm:text-4xl">
                Reports
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[15px]">
                Limits, delivery, queue pressure and audit visibility shaped into an operations-grade
                decision screen.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="metric-chip">Unread alerts {unreadBadge}</span>
                <span className="metric-chip">
                  Focus {activeFocus ? REPORTS_FOCUS_COPY[activeFocus].title : "Portfolio"}
                </span>
                <span className="metric-chip">
                  Privileged {canRunPrivilegedActions ? "enabled" : "read only"}
                </span>
              </div>
            </div>
            <div className="surface-subtle min-w-[320px] max-w-2xl space-y-3 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-[12px] leading-5 text-muted-foreground">
                  Save or reapply exact report states before you push into operations, exports or
                  recovery review.
                </div>
                <div className="inline-flex h-9 items-center gap-2 rounded-xl border border-border/70 bg-background/70 px-3 text-[13px]">
                  <BellRing className="h-4 w-4 text-accent" />
                  <span className="text-muted-foreground">Unread:</span>
                  <span className="font-semibold text-foreground">{unreadBadge}</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
              <input
                aria-label="Preset Name"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="Save preset"
                className="h-10 rounded-xl border border-border/70 bg-background/80 px-3 text-[13px]"
              />
              <button
                type="button"
                onClick={handleSavePreset}
                className="h-10 rounded-xl border border-border/70 bg-background/70 px-3 text-[13px] font-medium"
              >
                Save Preset
              </button>
              <select
                aria-label="Saved Presets"
                value={selectedPresetId}
                onChange={(e) => setSelectedPresetId(e.target.value)}
                className="h-10 rounded-xl border border-border/70 bg-background/80 px-2 text-[13px]"
              >
                <option value="">Saved presets</option>
                {savedPresets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleApplySelectedPreset}
                className="h-10 rounded-xl border border-border/70 bg-background/70 px-3 text-[13px] font-medium"
              >
                Apply Preset
              </button>
              <button
                type="button"
                onClick={handleDeleteSelectedPreset}
                className="h-10 rounded-xl border border-border/70 bg-background/70 px-3 text-[13px] font-medium"
              >
                Delete Preset
              </button>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
              onClick={() => {
                void Promise.all([
                  alertsQuery.refetch(),
                  deliveryQuery.refetch(),
                  outboxSummaryQuery.refetch(),
                  operationsCenterQuery.refetch(),
                  operationsSlaQuery.refetch(),
                  operationsSlaHistoryQuery.refetch(),
                  issuesAnalyticsQuery.refetch(),
                  issuesAddonsImpactQuery.refetch(),
                  riskConcentrationQuery.refetch(),
                  installerProfitabilityMatrixQuery.refetch(),
                  installerProjectProfitabilityQuery.refetch(),
                  projectsQuery.refetch(),
                  projectPlanFactQuery.refetch(),
                  projectRiskDrilldownQuery.refetch(),
                  topProjectsMarginQuery.refetch(),
                  riskProjectsMarginQuery.refetch(),
                  installersKpiQuery.refetch(),
                  installerDetailsQuery.refetch(),
                  orderNumbersKpiQuery.refetch(),
                  failedOutboxQuery.refetch(),
                  auditCatalogsQuery.refetch(),
                  issueAuditQuery.refetch(),
                ]);
              }}
                  className="btn-premium h-10 rounded-xl px-4 text-[13px] font-medium"
                >
                  <RefreshCw className="w-4 h-4" strokeWidth={1.8} />
                  Refresh
                </button>
                <button
                  onClick={() => exportExecutiveMutation.mutate()}
                  disabled={!canRunPrivilegedActions || exportExecutiveMutation.isPending}
                  title={privilegedActionHint}
                  aria-label="Export Executive CSV"
                  className="h-10 rounded-xl border border-border/70 bg-background/70 px-4 text-[13px] font-medium disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Export Executive CSV
                </button>
                <button
                  onClick={() => markReadMutation.mutate()}
                  disabled={!canRunPrivilegedActions || markReadMutation.isPending || unreadCount === 0}
                  title={privilegedActionHint}
                  className="btn-premium h-10 rounded-xl px-4 text-[13px] font-medium disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <CheckCheck className="w-4 h-4" strokeWidth={1.8} />
                  Mark All Read
                </button>
              </div>
            </div>
          </div>
        </section>

        {alertsQuery.isError && (
          <div className="rounded-lg border border-[hsl(var(--destructive)/0.35)] bg-[hsl(var(--destructive)/0.08)] px-4 py-3 text-[13px] text-[hsl(var(--destructive))] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              {alertsQuery.error instanceof Error
                ? alertsQuery.error.message
                : "Failed to load alerts"}
            </span>
          </div>
        )}
        {exportErrorMessage && (
          <div className="rounded-lg border border-[hsl(var(--destructive)/0.35)] bg-[hsl(var(--destructive)/0.08)] px-4 py-3 text-[13px] text-[hsl(var(--destructive))] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{exportErrorMessage}</span>
          </div>
        )}
        {presetNotice && (
          <div className="rounded-lg border border-border/70 bg-background/60 px-4 py-3 text-[13px] text-muted-foreground">
            {presetNotice}
          </div>
        )}
        {activeFocus && (
          <div className="rounded-lg border border-[hsl(var(--accent)/0.35)] bg-[hsl(var(--accent)/0.08)] px-4 py-3 text-[13px]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-medium text-foreground">
                  {REPORTS_FOCUS_COPY[activeFocus].title}
                </div>
                <div className="mt-1 text-muted-foreground">
                  {REPORTS_FOCUS_COPY[activeFocus].description}
                </div>
                {activeOpsPreset && (
                  <div className="mt-2 text-[12px] text-muted-foreground">
                    {REPORTS_OPS_PRESET_COPY[activeOpsPreset].title}.{" "}
                    {REPORTS_OPS_PRESET_COPY[activeOpsPreset].description}
                  </div>
                )}
                {scopeSummary && (
                  <div className="mt-2 text-[12px] text-muted-foreground">{scopeSummary}</div>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {focusFollowupActions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={() => router.push(action.href)}
                    className="h-8 rounded-lg border border-border bg-background/70 px-3 text-[12px] font-medium text-foreground"
                  >
                    {action.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => router.push("/reports")}
                  className="h-8 rounded-lg border border-border bg-background/70 px-3 text-[12px] font-medium text-foreground"
                >
                  Clear focus
                </button>
              </div>
            </div>
          </div>
        )}
        {!canRunPrivilegedActions && (
          <div className="rounded-lg border border-[hsl(var(--warning)/0.35)] bg-[hsl(var(--warning)/0.1)] px-4 py-3 text-[13px] text-[hsl(var(--warning-foreground))] flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>Read-only mode for INSTALLER role: export/retry/mark-read actions are disabled.</span>
          </div>
        )}

        <div
          id="reports-operations-center"
          className="surface-panel relative overflow-hidden"
        >
          <div className="absolute -top-14 -right-14 h-40 w-40 rounded-full bg-[hsl(var(--accent)/0.15)] blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Operations Command Center
                </div>
                <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
                  Real-time pressure map
                </h2>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="text-right">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Generated
                  </div>
                  <div className="text-[12px] text-foreground">
                    {operationsCenter?.generated_at
                      ? formatDateTime(operationsCenter.generated_at)
                      : "n/a"}
                  </div>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => router.push("/operations")}
                    className="h-8 rounded-lg border border-border bg-background/70 px-3 text-[12px] font-medium text-foreground"
                  >
                    Open Operations Center
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/operations?actionable=1")}
                    className="h-8 rounded-lg border border-border bg-background/70 px-3 text-[12px] font-medium text-foreground"
                  >
                    Open Actionable Ops
                  </button>
                </div>
              </div>
            </div>

            {operationsCenterQuery.isLoading ? (
              <div className="text-[13px] text-muted-foreground">Loading command center...</div>
            ) : (
              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-xl border border-border/70 bg-background/60 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Imports (24h)
                  </div>
                  <div className="mt-1 text-xl font-semibold text-foreground">
                    {operationsCenter?.imports.total_runs ?? 0}
                  </div>
                  <div className="mt-1 text-[12px] text-muted-foreground">
                    Success {operationsCenter?.imports.success_runs ?? 0} | Partial{" "}
                    {operationsCenter?.imports.partial_runs ?? 0} | Failed{" "}
                    {operationsCenter?.imports.failed_runs ?? 0}
                  </div>
                </div>

                <div className="rounded-xl border border-border/70 bg-background/60 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Import Modes
                  </div>
                  <div className="mt-1 text-xl font-semibold text-foreground">
                    {operationsCenter?.imports.import_runs ?? 0}
                  </div>
                  <div className="mt-1 text-[12px] text-muted-foreground">
                    Analyze {operationsCenter?.imports.analyze_runs ?? 0} | Retry{" "}
                    {operationsCenter?.imports.retry_runs ?? 0}
                  </div>
                </div>

                <div className="rounded-xl border border-border/70 bg-background/60 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Outbox Risk
                  </div>
                  <div className="mt-1 text-xl font-semibold text-foreground">
                    {operationsCenter?.outbox.failed_total ?? 0}
                  </div>
                  <div className="mt-1 text-[12px] text-muted-foreground">
                    Failed | Overdue {operationsCenter?.outbox.pending_overdue_15m ?? 0}
                  </div>
                </div>

                <div className="rounded-xl border border-border/70 bg-background/60 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Limit Alerts
                  </div>
                  <div className="mt-1 text-xl font-semibold text-foreground">
                    {operationsCenter?.alerts.unread_count ?? unreadCount}
                  </div>
                  <div className="mt-1 text-[12px] text-muted-foreground">
                    24h warn {operationsCenter?.alerts.warn_last_24h ?? 0} | danger{" "}
                    {operationsCenter?.alerts.danger_last_24h ?? 0}
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-border/70 bg-background/60 px-3 py-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Top Failing Projects (7d import errors)
                </div>
                <button
                  onClick={() => {
                    if (topFailingProjects.length === 0) {
                      return;
                    }
                    const ids = topFailingProjects.map((item) => item.project_id).join(",");
                    router.push(
                      `/projects?failed_project_ids=${encodeURIComponent(
                        ids
                      )}&only_failed_runs=1`
                    );
                  }}
                  disabled={topFailingProjects.length === 0}
                  className="h-7 px-2 rounded-md border border-border bg-card text-[11px] disabled:opacity-50"
                >
                  Open in Projects
                </button>
              </div>
              {topFailingProjects.length === 0 ? (
                <div className="text-[12px] text-muted-foreground">No failing projects in current window.</div>
              ) : (
                <div className="grid gap-2">
                  {topFailingProjects.slice(0, 3).map((item) => (
                    <div
                      key={`${item.project_id}-${item.last_run_at}`}
                      className="grid grid-cols-[1fr_80px_170px_74px] gap-2 text-[12px] items-center"
                    >
                      <div className="font-medium text-foreground truncate">{item.project_name}</div>
                      <div className="text-muted-foreground text-right">{item.failure_runs} fails</div>
                      <div className="text-muted-foreground text-right">{formatDateTime(item.last_run_at)}</div>
                      <button
                        onClick={() =>
                          router.push(
                            `/projects?project_id=${encodeURIComponent(
                              item.project_id
                            )}&failed_project_ids=${encodeURIComponent(
                              item.project_id
                            )}&only_failed_runs=1`
                          )
                        }
                        className="h-7 px-2 rounded-md border border-border bg-card text-[11px]"
                      >
                        Open
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div
          id="reports-operations-sla"
          className="glass-card rounded-2xl border border-border p-5 space-y-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Operations SLA
              </div>
              <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
                Health metrics and action playbooks
              </h2>
            </div>
            <span
              className={cn(
                "inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-semibold",
                SLA_STATUS_CLASS[operationsSla?.overall_status || ""] ||
                  "text-muted-foreground bg-muted/40 border-border"
              )}
            >
              {operationsSla?.overall_status || "n/a"}
            </span>
          </div>

          {operationsSlaQuery.isLoading ? (
            <div className="text-[13px] text-muted-foreground">Loading SLA metrics...</div>
          ) : operationsSlaQuery.isError ? (
            <div className="text-[13px] text-[hsl(var(--destructive))]">
              {operationsSlaQuery.error instanceof Error
                ? operationsSlaQuery.error.message
                : "Failed to load SLA metrics"}
            </div>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-5">
                {slaMetrics.map((metric) => (
                  <div
                    key={metric.code}
                    className="rounded-xl border border-border/70 bg-background/60 px-3 py-3"
                  >
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {metric.title}
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <div className="text-lg font-semibold text-foreground">
                        {metric.current}
                        <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                          {metric.unit}
                        </span>
                      </div>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold",
                          SLA_STATUS_CLASS[metric.status] ||
                            "text-muted-foreground bg-muted/40 border-border"
                        )}
                      >
                        {metric.status}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      target {metric.target} | warn {metric.warn_threshold} | danger{" "}
                      {metric.danger_threshold}
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-border/70 bg-background/60 px-3 py-3 space-y-2">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Action Playbooks
                </div>
                {slaPlaybooks.map((playbook) => (
                  <div
                    key={playbook.code}
                    className="grid grid-cols-[1fr_120px] gap-2 items-center text-[12px]"
                  >
                    <div>
                      <div className="font-medium text-foreground">
                        {playbook.title}
                        <span
                          className={cn(
                            "ml-2 inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold",
                            SLA_STATUS_CLASS[playbook.severity] ||
                              "text-muted-foreground bg-muted/40 border-border"
                          )}
                        >
                          {playbook.severity}
                        </span>
                      </div>
                      <div className="text-muted-foreground">{playbook.description}</div>
                    </div>
                    <button
                      onClick={() => router.push(playbook.action_url)}
                      className="h-8 px-3 rounded-md border border-border bg-card text-[12px]"
                    >
                      Open Playbook
                    </button>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-border/70 bg-background/60 px-3 py-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    SLA Trend (last {slaHistoryDays} days)
                  </div>
                  <div className="inline-flex items-center rounded-md border border-border bg-card p-0.5">
                    {SLA_HISTORY_DAYS_OPTIONS.map((option) => (
                      <button
                        key={option}
                        onClick={() => setSlaHistoryDays(option)}
                        className={cn(
                          "h-7 px-2 rounded text-[11px]",
                          option === slaHistoryDays
                            ? "bg-accent text-accent-foreground"
                            : "text-muted-foreground"
                        )}
                      >
                        {option}d
                      </button>
                    ))}
                  </div>
                </div>
                {operationsSlaHistoryQuery.isLoading ? (
                  <div className="text-[12px] text-muted-foreground">Loading trend...</div>
                ) : operationsSlaHistoryQuery.isError ? (
                  <div className="text-[12px] text-[hsl(var(--destructive))]">
                    {operationsSlaHistoryQuery.error instanceof Error
                      ? operationsSlaHistoryQuery.error.message
                      : "Failed to load SLA trend"}
                  </div>
                ) : (
                  <>
                    <div className="grid gap-2 md:grid-cols-4 text-[12px]">
                      <div className="rounded-md border border-border px-2 py-1.5">
                        <div className="text-muted-foreground">Current</div>
                        <div className="font-semibold">{slaHistorySummary?.current_status || "n/a"}</div>
                      </div>
                      <div className="rounded-md border border-border px-2 py-1.5">
                        <div className="text-muted-foreground">Status Days</div>
                        <div className="font-semibold">
                          OK {slaHistorySummary?.ok_days || 0} | WARN {slaHistorySummary?.warn_days || 0} | DANGER{" "}
                          {slaHistorySummary?.danger_days || 0}
                        </div>
                      </div>
                      <div className="rounded-md border border-border px-2 py-1.5">
                        <div className="text-muted-foreground">Delta Import % (d-1)</div>
                        <div className="font-semibold">
                          {slaHistorySummary?.delta_import_failure_rate_pct ?? 0}
                        </div>
                      </div>
                      <div className="rounded-md border border-border px-2 py-1.5">
                        <div className="text-muted-foreground">Delta Outbox % (d-1)</div>
                        <div className="font-semibold">
                          {slaHistorySummary?.delta_outbox_failed_rate_pct ?? 0}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      {slaHistoryRecent.map((point) => (
                        <div
                          key={point.day}
                          className="grid grid-cols-[92px_62px_1fr_1fr_64px] gap-2 items-center text-[11px]"
                        >
                          <div className="text-muted-foreground">{point.day}</div>
                          <span
                            className={cn(
                              "inline-flex justify-center rounded border px-1.5 py-0.5 font-semibold",
                              SLA_STATUS_CLASS[point.overall_status] ||
                                "text-muted-foreground bg-muted/40 border-border"
                            )}
                          >
                            {point.overall_status}
                          </span>
                          <div className="h-2 rounded bg-muted overflow-hidden">
                            <div
                              className="h-full bg-[hsl(var(--warning))]"
                              style={{ width: `${Math.min(100, point.import_failure_rate_pct)}%` }}
                            />
                          </div>
                          <div className="h-2 rounded bg-muted overflow-hidden">
                            <div
                              className="h-full bg-[hsl(var(--destructive))]"
                              style={{ width: `${Math.min(100, point.outbox_failed_rate_pct)}%` }}
                            />
                          </div>
                          <div className="text-right text-muted-foreground">
                            A:{point.danger_alerts_count}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        <div
          id="reports-issues-analytics"
          className="glass-card rounded-2xl border border-border p-5 space-y-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Issues Analytics
              </div>
              <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
                MTTR, overdue pressure and backlog dynamics
              </h2>
            </div>
            <div className="text-right text-[11px] text-muted-foreground">
              {issuesAnalytics?.generated_at
                ? formatDateTime(issuesAnalytics.generated_at)
                : "n/a"}
            </div>
          </div>

          {issuesAnalyticsQuery.isLoading ? (
            <div className="text-[13px] text-muted-foreground">Loading issues analytics...</div>
          ) : issuesAnalyticsQuery.isError ? (
            <div className="text-[13px] text-[hsl(var(--destructive))]">
              {issuesAnalyticsQuery.error instanceof Error
                ? issuesAnalyticsQuery.error.message
                : "Failed to load issues analytics"}
            </div>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-5">
                <div className="rounded-xl border border-border/70 bg-background/60 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Open / Total
                  </div>
                  <div className="mt-1 text-lg font-semibold text-foreground">
                    {issuesAnalytics?.summary.open_issues ?? 0} /{" "}
                    {issuesAnalytics?.summary.total_issues ?? 0}
                  </div>
                </div>
                <div className="rounded-xl border border-border/70 bg-background/60 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Overdue Rate
                  </div>
                  <div className="mt-1 text-lg font-semibold text-[hsl(var(--destructive))]">
                    {issuesAnalytics?.summary.overdue_open_rate_pct ?? 0}%
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {issuesAnalytics?.summary.overdue_open_issues ?? 0} overdue open
                  </div>
                </div>
                <div className="rounded-xl border border-border/70 bg-background/60 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    MTTR (h)
                  </div>
                  <div className="mt-1 text-lg font-semibold text-foreground">
                    {issuesAnalytics?.summary.mttr_hours ?? 0}
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    P50: {issuesAnalytics?.summary.mttr_p50_hours ?? 0} | n=
                    {issuesAnalytics?.summary.mttr_sample_size ?? 0}
                  </div>
                </div>
                <div className="rounded-xl border border-border/70 bg-background/60 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Blocked Open
                  </div>
                  <div className="mt-1 text-lg font-semibold text-[hsl(var(--warning-foreground))]">
                    {issuesAnalytics?.summary.blocked_open_issues ?? 0}
                  </div>
                </div>
                <div className="rounded-xl border border-border/70 bg-background/60 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    P1 Open
                  </div>
                  <div className="mt-1 text-lg font-semibold text-[hsl(var(--destructive))]">
                    {issuesAnalytics?.summary.p1_open_issues ?? 0}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-border/70 bg-background/60 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
                    Backlog by Workflow
                  </div>
                  <div className="space-y-1 text-[12px]">
                    {Object.entries(issuesAnalytics?.summary.backlog_by_workflow || {}).map(
                      ([workflow, count]) => (
                        <div key={workflow} className="flex items-center justify-between">
                          <span className="text-muted-foreground">{workflow}</span>
                          <span className="font-medium text-foreground">{count}</span>
                        </div>
                      )
                    )}
                  </div>
                </div>
                <div className="rounded-xl border border-border/70 bg-background/60 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
                    Backlog by Priority
                  </div>
                  <div className="space-y-1 text-[12px]">
                    {Object.entries(issuesAnalytics?.summary.backlog_by_priority || {}).map(
                      ([priority, count]) => (
                        <div key={priority} className="flex items-center justify-between">
                          <span className="text-muted-foreground">{priority}</span>
                          <span className="font-medium text-foreground">{count}</span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border/70 bg-background/60 px-3 py-3 space-y-2">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Trend (last {issuesAnalytics?.days ?? ISSUES_ANALYTICS_DAYS} days)
                </div>
                {(issuesAnalytics?.trend || []).slice(-10).map((point) => (
                  <div
                    key={point.day}
                    className="grid grid-cols-[90px_70px_70px_1fr] gap-2 items-center text-[11px]"
                  >
                    <span className="text-muted-foreground">{point.day}</span>
                    <span className="text-[hsl(var(--success))]">+{point.opened}</span>
                    <span className="text-[hsl(var(--destructive))]">-{point.closed}</span>
                    <div className="h-2 rounded bg-muted overflow-hidden">
                      <div
                        className="h-full bg-accent"
                        style={{ width: `${Math.min(100, point.backlog_open_end)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="glass-card rounded-2xl border border-border p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Margin Leakage
              </div>
              <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
                Open issue exposure, stalled reasons and add-on uplift
              </h2>
            </div>
            <div className="text-right text-[11px] text-muted-foreground">
              {issuesAddonsImpact?.generated_at
                ? formatDateTime(issuesAddonsImpact.generated_at)
                : "n/a"}
            </div>
          </div>

          {issuesAddonsImpactQuery.isLoading ? (
            <div className="text-[13px] text-muted-foreground">Loading margin leakage...</div>
          ) : issuesAddonsImpactQuery.isError ? (
            <div className="text-[13px] text-[hsl(var(--destructive))]">
              {issuesAddonsImpactQuery.error instanceof Error
                ? issuesAddonsImpactQuery.error.message
                : "Failed to load margin leakage"}
            </div>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-xl border border-border/70 bg-background/60 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Open Issues at Risk
                  </div>
                  <div className="mt-1 text-lg font-semibold text-foreground">
                    {issuesAddonsImpact?.summary?.open_issues ?? 0}
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    Profit at risk {formatAmount(issuesAddonsImpact?.summary?.open_issue_profit_at_risk)}
                  </div>
                </div>
                <div className="rounded-xl border border-border/70 bg-background/60 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Blocked Margin Risk
                  </div>
                  <div className="mt-1 text-lg font-semibold text-[hsl(var(--destructive))]">
                    {issuesAddonsImpact?.summary?.blocked_open_issues ?? 0}
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    Blocked profit {formatAmount(issuesAddonsImpact?.summary?.blocked_issue_profit_at_risk)}
                  </div>
                </div>
                <div className="rounded-xl border border-border/70 bg-background/60 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Delayed Doors
                  </div>
                  <div className="mt-1 text-lg font-semibold text-foreground">
                    {issuesAddonsImpact?.summary?.not_installed_doors ?? 0}
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    Delayed profit {formatAmount(issuesAddonsImpact?.summary?.delayed_profit_total)}
                  </div>
                </div>
                <div className="rounded-xl border border-border/70 bg-background/60 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Add-on Uplift
                  </div>
                  <div className="mt-1 text-lg font-semibold text-[hsl(var(--success))]">
                    {formatAmount(issuesAddonsImpact?.summary?.addon_profit_total)}
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    Missing plans {issuesAddonsImpact?.summary?.missing_addon_plans_facts ?? 0}
                  </div>
                </div>
              </div>

              <div className="overflow-auto rounded-xl border border-border/70 bg-background/60">
                <table className="w-full text-[12px]">
                  <thead className="bg-muted/40 text-muted-foreground">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Summary</th>
                      <th className="text-right px-3 py-2 font-medium">Revenue</th>
                      <th className="text-right px-3 py-2 font-medium">Payroll</th>
                      <th className="text-right px-3 py-2 font-medium">Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-border/70">
                      <td className="px-3 py-2 font-medium text-foreground">Open Issues Exposure</td>
                      <td className="px-3 py-2 text-right">
                        {formatAmount(issuesAddonsImpact?.summary?.open_issue_revenue_at_risk)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatAmount(issuesAddonsImpact?.summary?.open_issue_payroll_at_risk)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatAmount(issuesAddonsImpact?.summary?.open_issue_profit_at_risk)}
                      </td>
                    </tr>
                    <tr className="border-t border-border/70">
                      <td className="px-3 py-2 font-medium text-foreground">Delayed Not Installed</td>
                      <td className="px-3 py-2 text-right">
                        {formatAmount(issuesAddonsImpact?.summary?.delayed_revenue_total)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatAmount(issuesAddonsImpact?.summary?.delayed_payroll_total)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatAmount(issuesAddonsImpact?.summary?.delayed_profit_total)}
                      </td>
                    </tr>
                    <tr className="border-t border-border/70">
                      <td className="px-3 py-2 font-medium text-foreground">Add-on Realized</td>
                      <td className="px-3 py-2 text-right">
                        {formatAmount(issuesAddonsImpact?.summary?.addon_revenue_total)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatAmount(issuesAddonsImpact?.summary?.addon_payroll_total)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatAmount(issuesAddonsImpact?.summary?.addon_profit_total)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-border/70 bg-background/60 overflow-auto">
                  <div className="border-b border-border/70 px-3 py-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                    Delayed by Reason / Defect
                  </div>
                  <table className="w-full text-[12px]">
                    <thead className="bg-muted/40 text-muted-foreground">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Reason</th>
                        <th className="text-right px-3 py-2 font-medium">Doors</th>
                        <th className="text-right px-3 py-2 font-medium">Revenue</th>
                        <th className="text-right px-3 py-2 font-medium">Profit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(issuesAddonsImpact?.top_reasons || []).length === 0 ? (
                        <tr>
                          <td className="px-3 py-3 text-muted-foreground" colSpan={4}>
                            No delayed reasons.
                          </td>
                        </tr>
                      ) : (
                        (issuesAddonsImpact?.top_reasons || []).map((item) => (
                          <tr
                            key={item.reason_id || item.reason_name}
                            className="border-t border-border/70"
                          >
                            <td className="px-3 py-2 font-medium text-foreground">
                              {item.reason_name}
                            </td>
                            <td className="px-3 py-2 text-right">{item.doors}</td>
                            <td className="px-3 py-2 text-right">
                              {formatAmount(item.revenue_delayed_total)}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {formatAmount(item.profit_delayed_total)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="rounded-xl border border-border/70 bg-background/60 overflow-auto">
                  <div className="border-b border-border/70 px-3 py-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                    Add-on Profit Impact
                  </div>
                  <table className="w-full text-[12px]">
                    <thead className="bg-muted/40 text-muted-foreground">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Add-on</th>
                        <th className="text-right px-3 py-2 font-medium">Qty</th>
                        <th className="text-right px-3 py-2 font-medium">Profit</th>
                        <th className="text-right px-3 py-2 font-medium">Missing Plans</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(issuesAddonsImpact?.addon_impact || []).length === 0 ? (
                        <tr>
                          <td className="px-3 py-3 text-muted-foreground" colSpan={4}>
                            No add-on impact rows.
                          </td>
                        </tr>
                      ) : (
                        (issuesAddonsImpact?.addon_impact || []).map((item) => (
                          <tr
                            key={item.addon_type_id || item.addon_name}
                            className="border-t border-border/70"
                          >
                            <td className="px-3 py-2 font-medium text-foreground">
                              {item.addon_name}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {formatAmount(item.qty_done)}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {formatAmount(item.profit_total)}
                            </td>
                            <td className="px-3 py-2 text-right">{item.missing_plan_facts}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        <div id="reports-project-plan-fact" className="glass-card rounded-xl overflow-hidden border border-border">
          <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Project Plan vs Fact
              </div>
              <div className="text-[13px] text-muted-foreground">
                Financial execution and delivery gap on the selected project
              </div>
            </div>
            <select
              aria-label="Project Plan Fact Filter"
              value={projectPlanFactProjectId}
              onChange={(e) => setProjectPlanFactProjectId(e.target.value)}
              className="h-9 rounded-md border border-border bg-card px-2 text-[13px]"
            >
              <option value="">
                {projectsQuery.isLoading ? "Loading projects..." : "Select project"}
              </option>
              {projectOptions.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          {projectsQuery.isLoading && !projectPlanFactProjectId && (
            <div className="px-4 py-6">
              <SectionMessage title="Loading projects" detail="Preparing project plan vs fact filters." />
            </div>
          )}
          {!projectsQuery.isLoading && projectOptions.length === 0 && (
            <div className="px-4 py-6">
              <SectionMessage
                title="No projects for plan vs fact"
                detail="Import a factory file into Projects first, then this block will compute plan, fact and profit gap."
              />
            </div>
          )}
          {!projectsQuery.isLoading && projectOptions.length > 0 && !projectPlanFactProjectId && (
            <div className="px-4 py-6">
              <SectionMessage
                title="Select a project"
                detail="Choose a project to calculate planned revenue, actual payroll and realized profit."
              />
            </div>
          )}
          {projectPlanFactQuery.isLoading && projectPlanFactProjectId && (
            <div className="px-4 py-6 text-[13px] text-muted-foreground">
              Loading project plan vs fact...
            </div>
          )}
          {projectPlanFactQuery.isError && projectPlanFactProjectId && (
            <div className="px-4 py-6 text-[13px] text-[hsl(var(--destructive))]">
              {projectPlanFactQuery.error instanceof Error
                ? projectPlanFactQuery.error.message
                : "Failed to load project plan vs fact"}
            </div>
          )}
          {!projectPlanFactQuery.isLoading &&
            !projectPlanFactQuery.isError &&
            projectPlanFact && (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="rounded-lg border border-border bg-card p-3">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Completion
                    </div>
                    <div className="mt-2 text-[22px] font-semibold text-foreground">
                      {formatPercent(projectPlanFact.completion_pct)}
                    </div>
                    <div className="mt-1 text-[12px] text-muted-foreground">
                      {projectPlanFact.installed_doors} / {projectPlanFact.total_doors} doors installed
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-3">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Open Issues
                    </div>
                    <div className="mt-2 text-[22px] font-semibold text-foreground">
                      {projectPlanFact.open_issues}
                    </div>
                    <div className="mt-1 text-[12px] text-muted-foreground">
                      {projectPlanFact.not_installed_doors} doors still pending
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-3">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Missing Rates
                    </div>
                    <div className="mt-2 text-[22px] font-semibold text-foreground">
                      {projectPlanFact.missing_planned_rates_doors}
                    </div>
                    <div className="mt-1 text-[12px] text-muted-foreground">
                      Actual missing: {projectPlanFact.missing_actual_rates_doors}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-3">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Addons Qty
                    </div>
                    <div className="mt-2 text-[22px] font-semibold text-foreground">
                      {formatAmount(projectPlanFact.actual_addons_qty)} /{" "}
                      {formatAmount(projectPlanFact.planned_addons_qty)}
                    </div>
                    <div className="mt-1 text-[12px] text-muted-foreground">
                      Missing addon plans: {projectPlanFact.missing_addon_plans_facts}
                    </div>
                  </div>
                </div>

                <div className="overflow-auto rounded-lg border border-border">
                  <table className="w-full text-[13px]">
                    <thead className="bg-muted/40 text-muted-foreground">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Metric</th>
                        <th className="text-right px-3 py-2 font-medium">Plan</th>
                        <th className="text-right px-3 py-2 font-medium">Fact</th>
                        <th className="text-right px-3 py-2 font-medium">Gap</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-border/70">
                        <td className="px-3 py-2 font-medium text-foreground">Revenue</td>
                        <td className="px-3 py-2 text-right">
                          {formatAmount(projectPlanFact.planned_revenue_total)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {formatAmount(projectPlanFact.actual_revenue_total)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {formatAmount(projectPlanFact.revenue_gap_total)}
                        </td>
                      </tr>
                      <tr className="border-t border-border/70">
                        <td className="px-3 py-2 font-medium text-foreground">Payroll</td>
                        <td className="px-3 py-2 text-right">
                          {formatAmount(projectPlanFact.planned_payroll_total)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {formatAmount(projectPlanFact.actual_payroll_total)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {formatAmount(projectPlanFact.payroll_gap_total)}
                        </td>
                      </tr>
                      <tr className="border-t border-border/70">
                        <td className="px-3 py-2 font-medium text-foreground">Profit</td>
                        <td className="px-3 py-2 text-right">
                          {formatAmount(projectPlanFact.planned_profit_total)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {formatAmount(projectPlanFact.actual_profit_total)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {formatAmount(projectPlanFact.profit_gap_total)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
        </div>

        <div id="reports-project-risk-drilldown" className="glass-card rounded-xl overflow-hidden border border-border">
          <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Project Risk Drill-down
              </div>
              <div className="text-[13px] text-muted-foreground">
                Why the selected project is leaking margin: drivers, stalled reasons and risky orders
              </div>
            </div>
            <select
              aria-label="Project Risk Drilldown Filter"
              value={projectRiskProjectId}
              onChange={(e) => setProjectRiskProjectId(e.target.value)}
              className="h-9 rounded-md border border-border bg-card px-2 text-[13px]"
            >
              <option value="">
                {projectsQuery.isLoading ? "Loading projects..." : "Select project"}
              </option>
              {projectOptions.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          {projectRiskDrilldownQuery.isLoading && projectRiskProjectId && (
            <div className="px-4 py-6 text-[13px] text-muted-foreground">
              Loading project risk drill-down...
            </div>
          )}
          {projectRiskDrilldownQuery.isError && projectRiskProjectId && (
            <div className="px-4 py-6 text-[13px] text-[hsl(var(--destructive))]">
              {projectRiskDrilldownQuery.error instanceof Error
                ? projectRiskDrilldownQuery.error.message
                : "Failed to load project risk drill-down"}
            </div>
          )}
          {!projectsQuery.isLoading && projectOptions.length > 0 && !projectRiskProjectId && (
            <div className="px-4 py-6">
              <SectionMessage
                title="Select a project"
                detail="Choose a project to inspect the exact drivers behind low margin, stalled reasons and risky orders."
              />
            </div>
          )}
          {!projectRiskDrilldownQuery.isLoading &&
            !projectRiskDrilldownQuery.isError &&
            projectRiskDrilldown && (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="rounded-lg border border-border bg-card p-3">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Actual Margin
                    </div>
                    <div className="mt-2 text-[22px] font-semibold text-foreground">
                      {formatPercent(projectRiskDrilldown.summary.actual_margin_pct)}
                    </div>
                    <div className="mt-1 text-[12px] text-muted-foreground">
                      Profit gap {formatAmount(projectRiskDrilldown.summary.profit_gap_total)}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-3">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Completion / Delayed
                    </div>
                    <div className="mt-2 text-[22px] font-semibold text-foreground">
                      {formatPercent(projectRiskDrilldown.summary.completion_pct)}
                    </div>
                    <div className="mt-1 text-[12px] text-muted-foreground">
                      {projectRiskDrilldown.summary.not_installed_doors} delayed doors
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-3">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Issue Pressure
                    </div>
                    <div className="mt-2 text-[22px] font-semibold text-foreground">
                      {projectRiskDrilldown.summary.open_issues} /{" "}
                      {projectRiskDrilldown.summary.blocked_open_issues}
                    </div>
                    <div className="mt-1 text-[12px] text-muted-foreground">
                      Open / blocked issues
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-3">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Data Risk
                    </div>
                    <div className="mt-2 text-[22px] font-semibold text-foreground">
                      {projectRiskDrilldown.summary.missing_planned_rates_doors
                        + projectRiskDrilldown.summary.missing_actual_rates_doors
                        + projectRiskDrilldown.summary.missing_addon_plans_facts}
                    </div>
                    <div className="mt-1 text-[12px] text-muted-foreground">
                      rates + addon plan gaps
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-3">
                  <div className="rounded-lg border border-border bg-card p-3 xl:col-span-1">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Drivers
                    </div>
                    <div className="mt-3 space-y-2">
                      {(projectRiskDrilldown.drivers || []).map((driver) => (
                        <div
                          key={driver.code}
                          className="flex items-center justify-between rounded-md border border-border/70 px-3 py-2"
                        >
                          <div>
                            <div className="text-[12px] font-medium text-foreground">
                              {driver.label}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {driver.severity}
                            </div>
                          </div>
                          <div className="text-[12px] font-semibold text-foreground">
                            {formatAmount(driver.value)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-card overflow-auto xl:col-span-1">
                    <div className="border-b border-border/70 px-3 py-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                      Stalled Reasons
                    </div>
                    <table className="w-full text-[12px]">
                      <thead className="bg-muted/40 text-muted-foreground">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium">Reason</th>
                          <th className="text-right px-3 py-2 font-medium">Doors</th>
                          <th className="text-right px-3 py-2 font-medium">Profit Leak</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(projectRiskDrilldown.top_reasons || []).length === 0 ? (
                          <tr>
                            <td className="px-3 py-3 text-muted-foreground" colSpan={3}>
                              No stalled reasons.
                            </td>
                          </tr>
                        ) : (
                          (projectRiskDrilldown.top_reasons || []).map((item) => (
                            <tr
                              key={item.reason_id || item.reason_name}
                              className="border-t border-border/70"
                            >
                              <td className="px-3 py-2 font-medium text-foreground">
                                {item.reason_name}
                              </td>
                              <td className="px-3 py-2 text-right">{item.doors}</td>
                              <td className="px-3 py-2 text-right">
                                {formatAmount(item.profit_delayed_total)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="rounded-lg border border-border bg-card overflow-auto xl:col-span-1">
                    <div className="border-b border-border/70 px-3 py-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                      Risky Orders
                    </div>
                    <table className="w-full text-[12px]">
                      <thead className="bg-muted/40 text-muted-foreground">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium">Order</th>
                          <th className="text-right px-3 py-2 font-medium">Gap</th>
                          <th className="text-right px-3 py-2 font-medium">Issues</th>
                          <th className="text-right px-3 py-2 font-medium">Completion</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(projectRiskDrilldown.risky_orders || []).length === 0 ? (
                          <tr>
                            <td className="px-3 py-3 text-muted-foreground" colSpan={4}>
                              No risky orders.
                            </td>
                          </tr>
                        ) : (
                          (projectRiskDrilldown.risky_orders || []).map((item) => (
                            <tr key={item.order_number} className="border-t border-border/70">
                              <td className="px-3 py-2 font-medium text-foreground">
                                {item.order_number}
                              </td>
                              <td className="px-3 py-2 text-right">
                                {formatAmount(item.revenue_gap_total)}
                              </td>
                              <td className="px-3 py-2 text-right">{item.open_issues}</td>
                              <td className="px-3 py-2 text-right">
                                {formatPercent(item.completion_pct)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
        </div>

        <div id="reports-installers-kpi" className="glass-card rounded-xl overflow-hidden border border-border">
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Project Margin Executive
            </div>
            <div className="text-[13px] text-muted-foreground">
              Top profitable and low-margin projects based on actual realized margin
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 p-4">
            <div className="overflow-auto rounded-lg border border-border">
              <div className="px-3 py-2 border-b border-border bg-muted/30 text-[12px] font-medium">
                Top Margin Projects
              </div>
              {topProjectsMarginQuery.isLoading ? (
                <div className="px-3 py-4 text-[13px] text-muted-foreground">
                  Loading top margin projects...
                </div>
              ) : topProjectsMarginQuery.isError ? (
                <div className="px-3 py-4 text-[13px] text-[hsl(var(--destructive))]">
                  {topProjectsMarginQuery.error instanceof Error
                    ? topProjectsMarginQuery.error.message
                    : "Failed to load top margin projects"}
                </div>
              ) : (
                <table className="w-full text-[12px]">
                  <thead className="bg-muted/40 text-muted-foreground">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Project</th>
                      <th className="text-right px-3 py-2 font-medium">Profit</th>
                      <th className="text-right px-3 py-2 font-medium">Margin</th>
                      <th className="text-right px-3 py-2 font-medium">Completion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProjectsMargin.length === 0 ? (
                      <tr>
                        <td className="px-3 py-3 text-muted-foreground" colSpan={4}>
                          No profitable projects yet.
                        </td>
                      </tr>
                    ) : (
                      topProjectsMargin.map((item) => (
                        <tr key={`top-${item.project_id}`} className="border-t border-border/70">
                          <td className="px-3 py-2">
                            <div className="font-medium text-foreground">{item.project_name}</div>
                            <div className="text-[11px] text-muted-foreground">
                              Status {item.project_status} | Issues {item.open_issues}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right">
                            {formatAmount(item.profit_total)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {formatPercent(item.margin_pct)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {formatPercent(item.completion_pct)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>

            <div className="overflow-auto rounded-lg border border-border">
              <div className="px-3 py-2 border-b border-border bg-muted/30 text-[12px] font-medium">
                Low Margin / Risk Projects
              </div>
              {riskProjectsMarginQuery.isLoading ? (
                <div className="px-3 py-4 text-[13px] text-muted-foreground">
                  Loading low-margin projects...
                </div>
              ) : riskProjectsMarginQuery.isError ? (
                <div className="px-3 py-4 text-[13px] text-[hsl(var(--destructive))]">
                  {riskProjectsMarginQuery.error instanceof Error
                    ? riskProjectsMarginQuery.error.message
                    : "Failed to load low-margin projects"}
                </div>
              ) : (
                <table className="w-full text-[12px]">
                  <thead className="bg-muted/40 text-muted-foreground">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Project</th>
                      <th className="text-right px-3 py-2 font-medium">Profit</th>
                      <th className="text-right px-3 py-2 font-medium">Margin</th>
                      <th className="text-right px-3 py-2 font-medium">Data Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {riskProjectsMargin.length === 0 ? (
                      <tr>
                        <td className="px-3 py-3 text-muted-foreground" colSpan={4}>
                          No low-margin projects.
                        </td>
                      </tr>
                    ) : (
                      riskProjectsMargin.map((item) => (
                        <tr key={`risk-${item.project_id}`} className="border-t border-border/70">
                          <td className="px-3 py-2">
                            <div className="font-medium text-foreground">{item.project_name}</div>
                            <div className="text-[11px] text-muted-foreground">
                              Completion {formatPercent(item.completion_pct)} | Issues {item.open_issues}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right">
                            {formatAmount(item.profit_total)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {formatPercent(item.margin_pct)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {item.missing_rates_installed_doors + item.missing_addon_plans_facts}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl overflow-hidden border border-border">
          <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Risk Concentration
              </div>
              <div className="text-[13px] text-muted-foreground">
                Where margin risk is currently concentrated across projects, orders and installers
              </div>
            </div>
            <div className="text-right text-[11px] text-muted-foreground">
              {riskConcentration?.generated_at
                ? formatDateTime(riskConcentration.generated_at)
                : "n/a"}
            </div>
          </div>

          {riskConcentrationQuery.isLoading ? (
            <div className="px-4 py-6 text-[13px] text-muted-foreground">
              Loading risk concentration...
            </div>
          ) : riskConcentrationQuery.isError ? (
            <div className="px-4 py-6 text-[13px] text-[hsl(var(--destructive))]">
              {riskConcentrationQuery.error instanceof Error
                ? riskConcentrationQuery.error.message
                : "Failed to load risk concentration"}
            </div>
          ) : (
            <div className="p-4 space-y-4">
              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-lg border border-border bg-card p-3">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Delayed Profit
                  </div>
                  <div className="mt-2 text-[22px] font-semibold text-[hsl(var(--destructive))]">
                    {formatAmount(riskConcentration?.summary.delayed_profit_total)}
                  </div>
                  <div className="mt-1 text-[12px] text-muted-foreground">
                    Open issue risk {formatAmount(riskConcentration?.summary.open_issue_profit_at_risk)}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-card p-3">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Blocked Issue Risk
                  </div>
                  <div className="mt-2 text-[22px] font-semibold text-[hsl(var(--warning-foreground))]">
                    {formatAmount(riskConcentration?.summary.blocked_issue_profit_at_risk)}
                  </div>
                  <div className="mt-1 text-[12px] text-muted-foreground">
                    Worst installer {formatAmount(riskConcentration?.summary.worst_installer_profit_total)}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-card p-3">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Risky Projects / Orders
                  </div>
                  <div className="mt-2 text-[22px] font-semibold text-foreground">
                    {riskConcentration?.summary.risky_projects ?? 0} /{" "}
                    {riskConcentration?.summary.risky_orders ?? 0}
                  </div>
                  <div className="mt-1 text-[12px] text-muted-foreground">
                    Worst project {formatAmount(riskConcentration?.summary.worst_project_profit_total)}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-card p-3">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Risky Installers
                  </div>
                  <div className="mt-2 text-[22px] font-semibold text-foreground">
                    {riskConcentration?.summary.risky_installers ?? 0}
                  </div>
                  <div className="mt-1 text-[12px] text-muted-foreground">
                    Worst order {formatAmount(riskConcentration?.summary.worst_order_profit_total)}
                  </div>
                </div>
              </div>

              {(riskConcentration?.projects || []).length === 0 &&
              (riskConcentration?.orders || []).length === 0 &&
              (riskConcentration?.installers || []).length === 0 && (
                <SectionMessage
                  title="No concentrated risk yet"
                  detail="This tenant does not currently have enough delayed doors, open issues or low-margin rows to populate the cross-cutting executive risk view."
                />
              )}

              <div className="grid gap-4 xl:grid-cols-3">
                <div className="rounded-lg border border-border bg-card overflow-auto">
                  <div className="border-b border-border/70 px-3 py-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                    Projects at Risk
                  </div>
                  <table className="w-full text-[12px]">
                    <thead className="bg-muted/40 text-muted-foreground">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Project</th>
                        <th className="text-right px-3 py-2 font-medium">Profit</th>
                        <th className="text-right px-3 py-2 font-medium">Margin</th>
                        <th className="text-right px-3 py-2 font-medium">Issues</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(riskConcentration?.projects || []).length === 0 ? (
                        <tr>
                          <td className="px-3 py-3 text-muted-foreground" colSpan={4}>
                            No risky projects.
                          </td>
                        </tr>
                      ) : (
                        (riskConcentration?.projects || []).map((item) => (
                          <tr key={item.project_id} className="border-t border-border/70">
                            <td className="px-3 py-2">
                              <div className="font-medium text-foreground">{item.project_name}</div>
                              <div className="text-[11px] text-muted-foreground">
                                Completion {formatPercent(item.completion_pct)}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right">{formatAmount(item.profit_total)}</td>
                            <td className="px-3 py-2 text-right">{formatPercent(item.margin_pct)}</td>
                            <td className="px-3 py-2 text-right">{item.open_issues}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="rounded-lg border border-border bg-card overflow-auto">
                  <div className="border-b border-border/70 px-3 py-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                    Orders at Risk
                  </div>
                  <table className="w-full text-[12px]">
                    <thead className="bg-muted/40 text-muted-foreground">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Order</th>
                        <th className="text-right px-3 py-2 font-medium">Profit</th>
                        <th className="text-right px-3 py-2 font-medium">Delayed</th>
                        <th className="text-right px-3 py-2 font-medium">Completion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(riskConcentration?.orders || []).length === 0 ? (
                        <tr>
                          <td className="px-3 py-3 text-muted-foreground" colSpan={4}>
                            No risky orders.
                          </td>
                        </tr>
                      ) : (
                        (riskConcentration?.orders || []).map((item) => (
                          <tr key={item.order_number} className="border-t border-border/70">
                            <td className="px-3 py-2 font-medium text-foreground">
                              {item.order_number}
                            </td>
                            <td className="px-3 py-2 text-right">{formatAmount(item.profit_total)}</td>
                            <td className="px-3 py-2 text-right">{item.not_installed_doors}</td>
                            <td className="px-3 py-2 text-right">
                              {formatPercent(item.completion_pct)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="rounded-lg border border-border bg-card overflow-auto">
                  <div className="border-b border-border/70 px-3 py-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                    Installers at Risk
                  </div>
                  <table className="w-full text-[12px]">
                    <thead className="bg-muted/40 text-muted-foreground">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Installer</th>
                        <th className="text-left px-3 py-2 font-medium">Band</th>
                        <th className="text-right px-3 py-2 font-medium">Profit</th>
                        <th className="text-right px-3 py-2 font-medium">Margin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(riskConcentration?.installers || []).length === 0 ? (
                        <tr>
                          <td className="px-3 py-3 text-muted-foreground" colSpan={4}>
                            No risky installers.
                          </td>
                        </tr>
                      ) : (
                        (riskConcentration?.installers || []).map((item) => {
                          const bandClass =
                            item.performance_band === "STRONG"
                              ? "text-[hsl(var(--success))] bg-[hsl(var(--success)/0.12)] border-[hsl(var(--success)/0.28)]"
                              : item.performance_band === "RISK"
                                ? "text-[hsl(var(--destructive))] bg-[hsl(var(--destructive)/0.12)] border-[hsl(var(--destructive)/0.28)]"
                                : "text-[hsl(var(--warning-foreground))] bg-[hsl(var(--warning)/0.12)] border-[hsl(var(--warning)/0.28)]";
                          return (
                            <tr key={item.installer_id} className="border-t border-border/70">
                              <td className="px-3 py-2">
                                <div className="font-medium text-foreground">{item.installer_name}</div>
                                <div className="text-[11px] text-muted-foreground">
                                  Issues {item.open_issues}
                                </div>
                              </td>
                              <td className="px-3 py-2">
                                <span
                                  className={cn(
                                    "inline-flex rounded border px-2 py-0.5 text-[11px] font-semibold",
                                    bandClass
                                  )}
                                >
                                  {item.performance_band}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right">{formatAmount(item.profit_total)}</td>
                              <td className="px-3 py-2 text-right">{formatPercent(item.margin_pct)}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="glass-card rounded-xl overflow-hidden border border-border">
          <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Installer Profitability Matrix
              </div>
              <div className="text-[13px] text-muted-foreground">
                Ranking by money output, margin quality and issue pressure
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <select
                aria-label="Installer Matrix Sort"
                value={installerMatrixSortBy}
                onChange={(e) => setInstallerMatrixSortBy(e.target.value as InstallerMatrixSortBy)}
                className="h-9 rounded-md border border-border bg-card px-2 text-[13px]"
              >
                {INSTALLER_MATRIX_SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                aria-label="Installer Matrix Direction"
                value={installerMatrixSortDir}
                onChange={(e) => setInstallerMatrixSortDir(e.target.value as SortDir)}
                className="h-9 rounded-md border border-border bg-card px-2 text-[13px]"
              >
                {SORT_DIR_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {installerProfitabilityMatrixQuery.isLoading ? (
            <div className="px-4 py-6 text-[13px] text-muted-foreground">
              Loading installer profitability matrix...
            </div>
          ) : installerProfitabilityMatrixQuery.isError ? (
            <div className="px-4 py-6 text-[13px] text-[hsl(var(--destructive))]">
              {installerProfitabilityMatrixQuery.error instanceof Error
                ? installerProfitabilityMatrixQuery.error.message
                : "Failed to load installer profitability matrix"}
            </div>
          ) : installerProfitabilityMatrix.length === 0 ? (
            <div className="px-4 py-6 text-[13px] text-muted-foreground">
              No installer profitability rows.
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-[12px]">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Installer</th>
                    <th className="text-left px-3 py-2 font-medium">Band</th>
                    <th className="text-right px-3 py-2 font-medium">Installed</th>
                    <th className="text-right px-3 py-2 font-medium">Revenue</th>
                    <th className="text-right px-3 py-2 font-medium">Profit</th>
                    <th className="text-right px-3 py-2 font-medium">Margin</th>
                    <th className="text-right px-3 py-2 font-medium">Profit / Door</th>
                    <th className="text-right px-3 py-2 font-medium">Issues</th>
                    <th className="text-right px-3 py-2 font-medium">Data Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {installerProfitabilityMatrix.map((item) => {
                    const bandClass =
                      item.performance_band === "STRONG"
                        ? "text-[hsl(var(--success))] bg-[hsl(var(--success)/0.12)] border-[hsl(var(--success)/0.28)]"
                        : item.performance_band === "RISK"
                          ? "text-[hsl(var(--destructive))] bg-[hsl(var(--destructive)/0.12)] border-[hsl(var(--destructive)/0.28)]"
                          : "text-[hsl(var(--warning-foreground))] bg-[hsl(var(--warning)/0.12)] border-[hsl(var(--warning)/0.28)]";
                    return (
                      <tr key={item.installer_id} className="border-t border-border/70">
                        <td className="px-3 py-2">
                          <div className="font-medium text-foreground">{item.installer_name}</div>
                          <div className="text-[11px] text-muted-foreground">
                            Projects {item.active_projects} | Add-ons {formatAmount(item.addons_done_qty)}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={cn(
                              "inline-flex rounded border px-2 py-0.5 text-[11px] font-semibold",
                              bandClass
                            )}
                          >
                            {item.performance_band}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">{item.installed_doors}</td>
                        <td className="px-3 py-2 text-right">{formatAmount(item.revenue_total)}</td>
                        <td className="px-3 py-2 text-right">{formatAmount(item.profit_total)}</td>
                        <td className="px-3 py-2 text-right">{formatPercent(item.margin_pct)}</td>
                        <td className="px-3 py-2 text-right">
                          {formatAmount(item.avg_profit_per_door)}
                        </td>
                        <td className="px-3 py-2 text-right">{item.open_issues}</td>
                        <td className="px-3 py-2 text-right">
                          {item.missing_rates_installed_doors + item.missing_addon_plans_facts}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="glass-card rounded-xl overflow-hidden border border-border">
          <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Installer x Project Cross-view
              </div>
              <div className="text-[13px] text-muted-foreground">
                Which installer-project combinations create or destroy margin
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <select
                aria-label="Installer Project Sort"
                value={installerProjectSortBy}
                onChange={(e) => setInstallerProjectSortBy(e.target.value as InstallerProjectSortBy)}
                className="h-9 rounded-md border border-border bg-card px-2 text-[13px]"
              >
                {INSTALLER_PROJECT_SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                aria-label="Installer Project Direction"
                value={installerProjectSortDir}
                onChange={(e) => setInstallerProjectSortDir(e.target.value as SortDir)}
                className="h-9 rounded-md border border-border bg-card px-2 text-[13px]"
              >
                {SORT_DIR_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {installerProjectProfitabilityQuery.isLoading ? (
            <div className="px-4 py-6 text-[13px] text-muted-foreground">
              Loading installer-project cross-view...
            </div>
          ) : installerProjectProfitabilityQuery.isError ? (
            <div className="px-4 py-6 text-[13px] text-[hsl(var(--destructive))]">
              {installerProjectProfitabilityQuery.error instanceof Error
                ? installerProjectProfitabilityQuery.error.message
                : "Failed to load installer-project cross-view"}
            </div>
          ) : installerProjectProfitability.length === 0 ? (
            <div className="px-4 py-6">
              <SectionMessage
                title="No installer-project cross-view rows"
                detail="This view appears after installed doors or add-on facts create measurable profitability per installer and project."
              />
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-[12px]">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Installer / Project</th>
                    <th className="text-left px-3 py-2 font-medium">Band</th>
                    <th className="text-right px-3 py-2 font-medium">Installed</th>
                    <th className="text-right px-3 py-2 font-medium">Revenue</th>
                    <th className="text-right px-3 py-2 font-medium">Profit</th>
                    <th className="text-right px-3 py-2 font-medium">Margin</th>
                    <th className="text-right px-3 py-2 font-medium">Profit / Door</th>
                    <th className="text-right px-3 py-2 font-medium">Issues</th>
                    <th className="text-right px-3 py-2 font-medium">Data Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {installerProjectProfitability.map((item) => {
                    const bandClass =
                      item.performance_band === "STRONG"
                        ? "text-[hsl(var(--success))] bg-[hsl(var(--success)/0.12)] border-[hsl(var(--success)/0.28)]"
                        : item.performance_band === "RISK"
                          ? "text-[hsl(var(--destructive))] bg-[hsl(var(--destructive)/0.12)] border-[hsl(var(--destructive)/0.28)]"
                          : "text-[hsl(var(--warning-foreground))] bg-[hsl(var(--warning)/0.12)] border-[hsl(var(--warning)/0.28)]";
                    return (
                      <tr
                        key={`${item.installer_id}-${item.project_id}`}
                        className="border-t border-border/70"
                      >
                        <td className="px-3 py-2">
                          <div className="font-medium text-foreground">{item.installer_name}</div>
                          <div className="text-[11px] text-muted-foreground">{item.project_name}</div>
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={cn(
                              "inline-flex rounded border px-2 py-0.5 text-[11px] font-semibold",
                              bandClass
                            )}
                          >
                            {item.performance_band}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">{item.installed_doors}</td>
                        <td className="px-3 py-2 text-right">{formatAmount(item.revenue_total)}</td>
                        <td className="px-3 py-2 text-right">{formatAmount(item.profit_total)}</td>
                        <td className="px-3 py-2 text-right">{formatPercent(item.margin_pct)}</td>
                        <td className="px-3 py-2 text-right">
                          {formatAmount(item.avg_profit_per_door)}
                        </td>
                        <td className="px-3 py-2 text-right">{item.open_issues}</td>
                        <td className="px-3 py-2 text-right">
                          {item.missing_rates_installed_doors + item.missing_addon_plans_facts}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="glass-card rounded-xl overflow-hidden border border-border">
          <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Installers KPI
              </div>
              <div className="text-[13px] text-muted-foreground">
                Sorted, paginated installer performance and money metrics
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <select
                value={installersSortBy}
                onChange={(e) => {
                  setInstallersSortBy(e.target.value as InstallersSortBy);
                  setInstallersKpiOffset(0);
                }}
                className="h-9 rounded-md border border-border bg-card px-2 text-[13px]"
              >
                {INSTALLERS_SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                value={installersSortDir}
                onChange={(e) => {
                  setInstallersSortDir(e.target.value as SortDir);
                  setInstallersKpiOffset(0);
                }}
                className="h-9 rounded-md border border-border bg-card px-2 text-[13px]"
              >
                {SORT_DIR_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => exportInstallersKpiMutation.mutate()}
                disabled={!canRunPrivilegedActions || exportInstallersKpiMutation.isPending}
                title={privilegedActionHint}
                className="h-9 px-3 rounded-md border border-border bg-card text-[12px] disabled:opacity-50"
              >
                Export Installers CSV
              </button>
            </div>
          </div>

          <div className="grid grid-cols-[1fr_120px_120px_120px_120px_110px] gap-3 px-4 py-3 border-b border-border/70 text-[11px] uppercase tracking-wide text-muted-foreground">
            <span>Installer</span>
            <span className="text-right">Installed</span>
            <span className="text-right">Payroll</span>
            <span className="text-right">Revenue</span>
            <span className="text-right">Profit</span>
            <span className="text-right">Missing Rates</span>
          </div>

          {installersKpiQuery.isLoading && (
            <div className="px-4 py-6 text-[13px] text-muted-foreground">
              Loading installers KPI...
            </div>
          )}
          {installersKpiQuery.isError && (
            <div className="px-4 py-6 text-[13px] text-[hsl(var(--destructive))]">
              {installersKpiQuery.error instanceof Error
                ? installersKpiQuery.error.message
                : "Failed to load installers KPI"}
            </div>
          )}
          {!installersKpiQuery.isLoading &&
            !installersKpiQuery.isError &&
            installersKpiItems.length === 0 && (
              <div className="px-4 py-6 text-[13px] text-muted-foreground">
                No installers KPI rows.
              </div>
            )}
          {!installersKpiQuery.isLoading &&
            !installersKpiQuery.isError &&
            installersKpiItems.map((item) => (
              <div
                key={item.installer_id}
                className="grid grid-cols-[1fr_120px_120px_120px_120px_110px] gap-3 px-4 py-3 border-t border-border/70 text-[13px] items-center"
              >
                <div className="font-medium text-foreground">{item.installer_name}</div>
                <div className="text-right">{item.installed_doors}</div>
                <div className="text-right">{formatAmount(item.payroll_total)}</div>
                <div className="text-right">{formatAmount(item.revenue_total)}</div>
                <div className="text-right">{formatAmount(item.profit_total)}</div>
                <div className="text-right">{item.missing_rates_installed_doors}</div>
              </div>
            ))}
          <div className="px-4 py-3 border-t border-border/70 flex items-center justify-between text-[12px]">
            <div className="text-muted-foreground">Rows: {installersKpiItems.length}</div>
            <div className="flex items-center gap-2">
              <button
                disabled={!installersKpiCanPrev}
                onClick={() =>
                  setInstallersKpiOffset((x) => Math.max(0, x - KPI_PAGE_SIZE))
                }
                className="h-8 px-3 rounded-md border border-border bg-card disabled:opacity-50"
              >
                Prev
              </button>
              <button
                disabled={!installersKpiCanNext}
                onClick={() => setInstallersKpiOffset((x) => x + KPI_PAGE_SIZE)}
                className="h-8 px-3 rounded-md border border-border bg-card disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl overflow-hidden border border-border">
          <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Installer Drill-down
              </div>
              <div className="text-[13px] text-muted-foreground">
                Profitability, projects, orders and addon impact for the selected installer
              </div>
            </div>
            <select
              aria-label="Installer KPI Details Filter"
              value={installerDetailsId}
              onChange={(e) => setInstallerDetailsId(e.target.value)}
              className="h-9 rounded-md border border-border bg-card px-2 text-[13px]"
            >
              <option value="">
                {installersKpiQuery.isLoading ? "Loading installers..." : "Select installer"}
              </option>
              {installersKpiItems.map((item) => (
                <option key={item.installer_id} value={item.installer_id}>
                  {item.installer_name}
                </option>
              ))}
            </select>
          </div>

          {installersKpiQuery.isLoading && installersKpiItems.length === 0 && (
            <div className="px-4 py-6 text-[13px] text-muted-foreground">
              Loading installer drill-down...
            </div>
          )}
          {!installersKpiQuery.isLoading && installersKpiItems.length === 0 && (
            <div className="px-4 py-6 text-[13px] text-muted-foreground">
              No installers available for drill-down.
            </div>
          )}
          {installerDetailsQuery.isLoading && installerDetailsId && (
            <div className="px-4 py-6 text-[13px] text-muted-foreground">
              Loading installer details...
            </div>
          )}
          {installerDetailsQuery.isError && installerDetailsId && (
            <div className="px-4 py-6 text-[13px] text-[hsl(var(--destructive))]">
              {installerDetailsQuery.error instanceof Error
                ? installerDetailsQuery.error.message
                : "Failed to load installer details"}
            </div>
          )}
          {!installerDetailsQuery.isLoading &&
            !installerDetailsQuery.isError &&
            installerDetails && (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="rounded-lg border border-border bg-card p-3">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Revenue / Payroll / Profit
                    </div>
                    <div className="mt-2 text-[18px] font-semibold text-foreground">
                      {formatAmount(installerDetails.revenue_total)}
                    </div>
                    <div className="mt-1 text-[12px] text-muted-foreground">
                      Payroll {formatAmount(installerDetails.payroll_total)} | Profit{" "}
                      {formatAmount(installerDetails.profit_total)}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-3">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Projects / Orders
                    </div>
                    <div className="mt-2 text-[18px] font-semibold text-foreground">
                      {installerDetails.active_projects} / {installerDetails.order_numbers}
                    </div>
                    <div className="mt-1 text-[12px] text-muted-foreground">
                      Installed doors: {installerDetails.installed_doors}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-3">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Open Issues / Missing Rates
                    </div>
                    <div className="mt-2 text-[18px] font-semibold text-foreground">
                      {installerDetails.open_issues} / {installerDetails.missing_rates_installed_doors}
                    </div>
                    <div className="mt-1 text-[12px] text-muted-foreground">
                      Last install:{" "}
                      {installerDetails.last_installed_at
                        ? formatDateTime(installerDetails.last_installed_at)
                        : "n/a"}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-3">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Addons Impact
                    </div>
                    <div className="mt-2 text-[18px] font-semibold text-foreground">
                      Qty {formatAmount(installerDetails.addons_done_qty)}
                    </div>
                    <div className="mt-1 text-[12px] text-muted-foreground">
                      Profit {formatAmount(installerDetails.addon_profit_total)} | Missing plans{" "}
                      {installerDetails.missing_addon_plans_facts}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <div className="overflow-auto rounded-lg border border-border">
                    <table className="w-full text-[12px]">
                      <thead className="bg-muted/40 text-muted-foreground">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium">Project</th>
                          <th className="text-right px-3 py-2 font-medium">Installed</th>
                          <th className="text-right px-3 py-2 font-medium">Issues</th>
                          <th className="text-right px-3 py-2 font-medium">Profit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {installerDetails.top_projects.length === 0 ? (
                          <tr>
                            <td className="px-3 py-3 text-muted-foreground" colSpan={4}>
                              No project drill-down rows.
                            </td>
                          </tr>
                        ) : (
                          installerDetails.top_projects.map((item) => (
                            <tr key={item.project_id} className="border-t border-border/70">
                              <td className="px-3 py-2">
                                <div className="font-medium text-foreground">{item.project_name}</div>
                                <div className="text-[11px] text-muted-foreground">
                                  {item.last_installed_at
                                    ? formatDateTime(item.last_installed_at)
                                    : "No install date"}
                                </div>
                              </td>
                              <td className="px-3 py-2 text-right">{item.installed_doors}</td>
                              <td className="px-3 py-2 text-right">{item.open_issues}</td>
                              <td className="px-3 py-2 text-right">
                                {formatAmount(item.profit_total)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="overflow-auto rounded-lg border border-border">
                    <table className="w-full text-[12px]">
                      <thead className="bg-muted/40 text-muted-foreground">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium">Order</th>
                          <th className="text-right px-3 py-2 font-medium">Installed</th>
                          <th className="text-right px-3 py-2 font-medium">Revenue</th>
                          <th className="text-right px-3 py-2 font-medium">Profit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {installerDetails.order_breakdown.length === 0 ? (
                          <tr>
                            <td className="px-3 py-3 text-muted-foreground" colSpan={4}>
                              No order breakdown rows.
                            </td>
                          </tr>
                        ) : (
                          installerDetails.order_breakdown.map((item) => (
                            <tr key={item.order_number} className="border-t border-border/70">
                              <td className="px-3 py-2 font-medium text-foreground">
                                {item.order_number}
                              </td>
                              <td className="px-3 py-2 text-right">{item.installed_doors}</td>
                              <td className="px-3 py-2 text-right">
                                {formatAmount(item.revenue_total)}
                              </td>
                              <td className="px-3 py-2 text-right">
                                {formatAmount(item.profit_total)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
        </div>

        <div className="glass-card rounded-xl overflow-hidden border border-border">
          <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Order Numbers KPI
              </div>
              <div className="text-[13px] text-muted-foreground">
                Money and operational control by order number
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <select
                aria-label="Order Project Filter"
                value={orderNumbersProjectId}
                onChange={(e) => {
                  setOrderNumbersProjectId(e.target.value);
                  setOrderNumbersKpiOffset(0);
                }}
                className="h-9 rounded-md border border-border bg-card px-2 text-[13px]"
              >
                <option value="">
                  {projectsQuery.isLoading ? "Loading projects..." : "All projects"}
                </option>
                {projectOptions.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <input
                value={orderNumbersQuery}
                onChange={(e) => {
                  setOrderNumbersQuery(e.target.value);
                  setOrderNumbersKpiOffset(0);
                }}
                placeholder="Search order"
                className="h-9 rounded-md border border-border bg-card px-2 text-[13px]"
              />
              <select
                value={orderNumbersSortBy}
                onChange={(e) => {
                  setOrderNumbersSortBy(e.target.value as OrderNumbersSortBy);
                  setOrderNumbersKpiOffset(0);
                }}
                className="h-9 rounded-md border border-border bg-card px-2 text-[13px]"
              >
                {ORDER_NUMBERS_SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                value={orderNumbersSortDir}
                onChange={(e) => {
                  setOrderNumbersSortDir(e.target.value as SortDir);
                  setOrderNumbersKpiOffset(0);
                }}
                className="h-9 rounded-md border border-border bg-card px-2 text-[13px]"
              >
                {SORT_DIR_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => exportOrderNumbersKpiMutation.mutate()}
                disabled={!canRunPrivilegedActions || exportOrderNumbersKpiMutation.isPending}
                title={privilegedActionHint}
                className="h-9 px-3 rounded-md border border-border bg-card text-[12px] disabled:opacity-50"
              >
                Export Orders CSV
              </button>
            </div>
          </div>

          <div className="grid grid-cols-[1fr_80px_90px_90px_80px_120px_120px_120px_110px] gap-3 px-4 py-3 border-b border-border/70 text-[11px] uppercase tracking-wide text-muted-foreground">
            <span>Order</span>
            <span className="text-right">Total</span>
            <span className="text-right">Installed</span>
            <span className="text-right">Not Installed</span>
            <span className="text-right">Issues</span>
            <span className="text-right">Planned</span>
            <span className="text-right">Payroll</span>
            <span className="text-right">Profit</span>
            <span className="text-right">Completion</span>
          </div>

          {orderNumbersKpiQuery.isLoading && (
            <div className="px-4 py-6 text-[13px] text-muted-foreground">
              Loading order numbers KPI...
            </div>
          )}
          {orderNumbersKpiQuery.isError && (
            <div className="px-4 py-6 text-[13px] text-[hsl(var(--destructive))]">
              {orderNumbersKpiQuery.error instanceof Error
                ? orderNumbersKpiQuery.error.message
                : "Failed to load order numbers KPI"}
            </div>
          )}
          {!orderNumbersKpiQuery.isLoading &&
            !orderNumbersKpiQuery.isError &&
            orderNumbersKpiItems.length === 0 && (
              <div className="px-4 py-6 text-[13px] text-muted-foreground">
                No order KPI rows.
              </div>
            )}
          {!orderNumbersKpiQuery.isLoading &&
            !orderNumbersKpiQuery.isError &&
            orderNumbersKpiItems.map((item) => (
              <div
                key={item.order_number}
                className="grid grid-cols-[1fr_80px_90px_90px_80px_120px_120px_120px_110px] gap-3 px-4 py-3 border-t border-border/70 text-[13px] items-center"
              >
                <div className="font-medium text-foreground">{item.order_number}</div>
                <div className="text-right">{item.total_doors}</div>
                <div className="text-right">{item.installed_doors}</div>
                <div className="text-right">{item.not_installed_doors}</div>
                <div className="text-right">{item.open_issues}</div>
                <div className="text-right">{formatAmount(item.planned_revenue_total)}</div>
                <div className="text-right">{formatAmount(item.payroll_total)}</div>
                <div className="text-right">{formatAmount(item.profit_total)}</div>
                <div className="text-right">{item.completion_pct}%</div>
              </div>
            ))}
          <div className="px-4 py-3 border-t border-border/70 flex items-center justify-between text-[12px]">
            <div className="text-muted-foreground">
              Total matched: {orderNumbersKpiQuery.data?.total || 0}
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={!orderNumbersKpiCanPrev}
                onClick={() =>
                  setOrderNumbersKpiOffset((x) => Math.max(0, x - KPI_PAGE_SIZE))
                }
                className="h-8 px-3 rounded-md border border-border bg-card disabled:opacity-50"
              >
                Prev
              </button>
              <button
                disabled={!orderNumbersKpiCanNext}
                onClick={() => setOrderNumbersKpiOffset((x) => x + KPI_PAGE_SIZE)}
                className="h-8 px-3 rounded-md border border-border bg-card disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        <div id="reports-delivery-risk" className="grid gap-3 md:grid-cols-4">
          <div className="glass-card rounded-xl border border-border p-4">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
              Delivery
            </div>
            {deliveryQuery.isLoading ? (
              <div className="text-[13px] text-muted-foreground">Loading...</div>
            ) : (
              <div className="space-y-1 text-[13px]">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-accent" />
                  <span>WA pending: {delivery?.whatsapp_pending ?? 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-500" />
                  <span>WA delivered: {delivery?.whatsapp_delivered ?? 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[hsl(var(--destructive))]" />
                  <span>WA failed: {delivery?.whatsapp_failed ?? 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-emerald-500" />
                  <span>Email sent: {delivery?.email_sent ?? 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[hsl(var(--destructive))]" />
                  <span>Email failed: {delivery?.email_failed ?? 0}</span>
                </div>
              </div>
            )}
          </div>

          <div className="glass-card rounded-xl border border-border p-4">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
              Outbox Queue
            </div>
            {outboxSummaryQuery.isLoading ? (
              <div className="text-[13px] text-muted-foreground">Loading...</div>
            ) : (
              <div className="space-y-1 text-[13px]">
                <div>Total: {outboxSummary?.total ?? 0}</div>
                <div>Failed total: {outboxSummary?.failed_total ?? 0}</div>
                <div>Pending overdue &gt;15m: {outboxSummary?.pending_overdue_15m ?? 0}</div>
                <div className="text-muted-foreground">
                  Channels: {compactMap(outboxSummary?.by_channel)}
                </div>
                <div className="text-muted-foreground">
                  Status: {compactMap(outboxSummary?.by_status)}
                </div>
              </div>
            )}
          </div>

          <div
            id="reports-delivery-scope"
            className="glass-card rounded-xl border border-border p-4 md:col-span-2"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
                  Delivery Scope
                </div>
                <div className="space-y-1 text-[13px]">
                  <div>
                    Channel:{" "}
                    <span className="font-medium text-card-foreground">
                      {scopedDeliveryChannel || "all channels"}
                    </span>
                  </div>
                  <div>
                    Webhook provider:{" "}
                    <span className="font-medium text-card-foreground">
                      {scopedWebhookProvider || "all providers"}
                    </span>
                  </div>
                  {scopedOutboxId ? (
                    <div>
                      Outbox:{" "}
                      <span className="font-medium text-card-foreground">{scopedOutboxId}</span>
                    </div>
                  ) : null}
                </div>
              </div>
              {(scopedDeliveryChannel || scopedWebhookProvider) && (
                <button
                  onClick={() => {
                    const params = new URLSearchParams();
                    params.set("focus", "delivery");
                    params.set("ops_preset", activeOpsPreset || "delivery-risk");
                    if (scopedOutboxId) {
                      params.set("outbox_id", scopedOutboxId);
                    }
                    router.push(`/reports?${params.toString()}`);
                  }}
                  className="h-8 px-3 rounded-md border border-border bg-card text-[12px]"
                >
                  Clear delivery scope
                </button>
              )}
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-border/70 bg-background/60 p-3">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Failed outbox lane
                </div>
                <div className="mt-2 text-[13px] text-card-foreground">
                  {failedItems.length} failed messages in current scope
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    onClick={() =>
                      router.push(
                        buildOperationsHref({
                          actionable: true,
                          deliveryChannel: scopedDeliveryChannel || undefined,
                          webhookProvider: scopedWebhookProvider || undefined,
                        })
                      )
                    }
                    className="h-8 px-3 rounded-md border border-border bg-card text-[12px]"
                  >
                    Open scoped ops
                  </button>
                  {scopedOutboxId ? (
                    <button
                      onClick={() =>
                        router.push(
                          buildOperationsHref({
                            actionable: true,
                            deliveryChannel: scopedDeliveryChannel || undefined,
                            webhookProvider: scopedWebhookProvider || undefined,
                          })
                        )
                      }
                      className="h-8 px-3 rounded-md border border-border bg-card text-[12px]"
                    >
                      Continue recovery
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="rounded-lg border border-border/70 bg-background/60 p-3">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Webhook lane
                </div>
                {webhookSignalsQuery.isLoading ? (
                  <div className="mt-2 text-[13px] text-muted-foreground">Loading webhook scope...</div>
                ) : scopedWebhookSignals.length === 0 ? (
                  <div className="mt-2 text-[13px] text-muted-foreground">
                    No webhook signals for current scope.
                  </div>
                ) : (
                  <div className="mt-2 space-y-2">
                    {scopedWebhookSignals.slice(0, 3).map((item) => (
                      <div key={item.id} className="text-[13px]">
                        <div className="font-medium text-card-foreground">
                          {item.provider} | {item.result}
                        </div>
                        <div className="text-muted-foreground">
                          {item.event_type}
                          {item.status ? ` | status ${item.status}` : ""}
                          {item.error ? ` | ${item.error}` : ""}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-border/70 bg-background/60 p-3 md:col-span-2">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Recovery trail
                </div>
                {retryAuditsQuery.isLoading ? (
                  <div className="mt-2 text-[13px] text-muted-foreground">Loading retry audit trail...</div>
                ) : scopedRetryAuditItems.length === 0 ? (
                  <div className="mt-2 text-[13px] text-muted-foreground">
                    {scopedOutboxId
                      ? "No recovery actions recorded for this outbox yet."
                      : "No delivery recovery actions recorded yet."}
                  </div>
                ) : (
                  <div className="mt-2 space-y-2">
                    {scopedRetryAuditItems.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        className="rounded-md border border-border/60 bg-card/60 px-3 py-2 text-[13px]"
                      >
                        <div className="font-medium text-card-foreground">
                          Outbox {item.outbox_id}
                        </div>
                        <div className="text-muted-foreground">
                          {formatDateTime(item.created_at)} | actor {item.actor_user_id}
                        </div>
                        <div className="text-muted-foreground">
                          {item.before_status || "unknown"} {"->"} {item.after_status || "unknown"}
                          {item.before_delivery_status || item.after_delivery_status
                            ? ` | delivery ${item.before_delivery_status || "unknown"} -> ${item.after_delivery_status || "unknown"}`
                            : ""}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            onClick={() =>
                              router.push(
                                buildOperationsHref({
                                  actionable: true,
                                  deliveryChannel: scopedDeliveryChannel || undefined,
                                  webhookProvider: scopedWebhookProvider || undefined,
                                })
                              )
                            }
                            className="h-8 px-3 rounded-md border border-border bg-card text-[12px]"
                          >
                            Open recovery lane
                          </button>
                          <button
                            onClick={() =>
                              router.push(
                                buildOperationsHref({
                                  actionable: true,
                                  deliveryChannel: scopedDeliveryChannel || undefined,
                                  webhookProvider: scopedWebhookProvider || undefined,
                                })
                              )
                            }
                            className="h-8 px-3 rounded-md border border-border bg-card text-[12px]"
                          >
                            Continue in ops
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl border border-border p-4">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
              Catalog Audit
            </div>
            {auditCatalogsQuery.isLoading ? (
              <div className="text-[13px] text-muted-foreground">Loading...</div>
            ) : (
              <div className="space-y-1 text-[13px]">
                <div>Total changes: {auditSummary?.total ?? 0}</div>
                <div className="text-muted-foreground">
                  Entities: {compactMap(auditSummary?.by_entity)}
                </div>
                <div className="text-muted-foreground">
                  Actions: {compactMap(auditSummary?.by_action)}
                </div>
              </div>
            )}
          </div>

          <div className="glass-card rounded-xl border border-border p-4">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
              Issue Audit
            </div>
            {issueAuditQuery.isLoading ? (
              <div className="text-[13px] text-muted-foreground">Loading...</div>
            ) : (
              <div className="space-y-1 text-[13px]">
                <div>Total changes: {issueAuditSummary?.total ?? 0}</div>
                <div className="text-muted-foreground">
                  Entities: {compactMap(issueAuditSummary?.by_entity)}
                </div>
                <div className="text-muted-foreground">
                  Actions: {compactMap(issueAuditSummary?.by_action)}
                </div>
              </div>
            )}
          </div>
        </div>

        <div
          id="reports-failed-outbox"
          className="glass-card rounded-xl overflow-hidden border border-border"
        >
          <div className="px-4 py-3 border-b border-border bg-muted/30 text-[11px] uppercase tracking-wide text-muted-foreground">
            Failed Outbox Queue
          </div>
          {failedOutboxQuery.isLoading && (
            <div className="px-4 py-6 text-[13px] text-muted-foreground">
              Loading failed messages...
            </div>
          )}
          {!failedOutboxQuery.isLoading && failedItems.length === 0 && (
            <div className="px-4 py-6 text-[13px] text-muted-foreground">
              {scopedDeliveryChannel
                ? `No failed outbox messages for ${scopedDeliveryChannel}.`
                : "No failed outbox messages."}
            </div>
          )}
          {!failedOutboxQuery.isLoading &&
            failedItems.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-[120px_120px_120px_160px_1fr_120px] gap-3 px-4 py-3 border-t border-border/70 text-[13px] items-center"
              >
                <div className="font-medium">{item.channel}</div>
                <div>{item.status}</div>
                <div>{item.delivery_status}</div>
                <div className="text-muted-foreground">
                  {item.attempts}/{item.max_attempts}
                </div>
                <div className="text-muted-foreground truncate">
                  {item.last_error || "No error payload"}
                </div>
                <button
                  onClick={() => retryMutation.mutate(item.id)}
                  disabled={!canRunPrivilegedActions || retryMutation.isPending}
                  title={privilegedActionHint}
                  className="h-8 px-3 rounded-md border border-border bg-card text-[12px] inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Retry
                </button>
              </div>
            ))}
        </div>

        <div className="glass-card rounded-xl overflow-hidden border border-border">
          <div className="grid grid-cols-[180px_130px_130px_130px_1fr] gap-3 px-4 py-3 border-b border-border bg-muted/30 text-[11px] uppercase tracking-wide text-muted-foreground">
            <span>Time</span>
            <span>Level</span>
            <span>Metric</span>
            <span>Usage</span>
            <span>Action</span>
          </div>

          {alertsQuery.isLoading && (
            <div className="px-4 py-6 text-[13px] text-muted-foreground">Loading alerts...</div>
          )}

          {!alertsQuery.isLoading && items.length === 0 && (
            <div className="px-4 py-6 text-[13px] text-muted-foreground">
              No limit alerts yet.
            </div>
          )}

          {!alertsQuery.isLoading &&
            items.map((item) => {
              const isDanger = item.level === "DANGER";
              const levelClass = isDanger
                ? "text-[hsl(var(--destructive))] bg-[hsl(var(--destructive)/0.12)] border-[hsl(var(--destructive)/0.25)]"
                : "text-[hsl(var(--warning-foreground))] bg-[hsl(var(--warning)/0.12)] border-[hsl(var(--warning)/0.28)]";
              return (
                <div
                  key={item.id}
                  className={cn(
                    "grid grid-cols-[180px_130px_130px_130px_1fr] gap-3 px-4 py-3 border-t border-border/70 text-[13px] row-hover",
                    item.is_unread && "bg-[hsl(var(--accent)/0.06)]"
                  )}
                >
                  <div className="text-muted-foreground">{formatDateTime(item.created_at)}</div>
                  <div>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] font-semibold",
                        levelClass
                      )}
                    >
                      {isDanger ? (
                        <ShieldAlert className="w-3.5 h-3.5" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5" />
                      )}
                      {item.level}
                    </span>
                  </div>
                  <div className="font-medium text-card-foreground capitalize">
                    {metricLabel(item.metric)}
                  </div>
                  <div className="text-muted-foreground">
                    {item.current ?? "-"} / {item.max ?? "-"}
                    {item.utilization_pct !== null ? ` (${item.utilization_pct}%)` : ""}
                  </div>
                  <div className="text-card-foreground">
                    <span className="font-medium">{item.action}</span>
                    {item.plan_code ? (
                      <span className="text-muted-foreground"> | plan {item.plan_code}</span>
                    ) : null}
                    {item.is_unread ? (
                      <span className="ml-2 inline-flex w-2 h-2 rounded-full bg-accent align-middle" />
                    ) : null}
                  </div>
                </div>
              );
            })}
        </div>

        <div className="glass-card rounded-xl overflow-hidden border border-border">
          <div className="px-4 py-3 border-b border-border bg-muted/30 text-[11px] uppercase tracking-wide text-muted-foreground">
            Catalog Audit Report
          </div>
          <div className="px-4 py-3 border-b border-border/70 grid gap-2 md:grid-cols-[180px_220px_150px_150px_auto] items-center">
            <select
              value={auditEntityType}
              onChange={(e) => {
                setAuditEntityType(e.target.value);
                setAuditOffset(0);
              }}
              className="h-9 rounded-md border border-border bg-card px-2 text-[13px]"
            >
              <option value="">All entities</option>
              {AUDIT_ENTITY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <select
              value={auditAction}
              onChange={(e) => {
                setAuditAction(e.target.value);
                setAuditOffset(0);
              }}
              className="h-9 rounded-md border border-border bg-card px-2 text-[13px]"
            >
              <option value="">All actions</option>
              {AUDIT_ACTION_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <input
              value={auditDateFrom}
              onChange={(e) => {
                setAuditDateFrom(e.target.value);
                setAuditOffset(0);
              }}
              type="date"
              className="h-9 rounded-md border border-border bg-card px-2 text-[13px]"
            />
            <input
              value={auditDateTo}
              onChange={(e) => {
                setAuditDateTo(e.target.value);
                setAuditOffset(0);
              }}
              type="date"
              className="h-9 rounded-md border border-border bg-card px-2 text-[13px]"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() =>
                  exportAuditMutation.mutate()
                }
                disabled={!canRunPrivilegedActions || exportAuditMutation.isPending}
                title={privilegedActionHint}
                className="h-9 px-3 rounded-md border border-border bg-card text-[12px] disabled:opacity-50"
              >
                Export CSV
              </button>
              <button
                onClick={() => {
                  setAuditEntityType("");
                  setAuditAction("");
                  setAuditDateFrom("");
                  setAuditDateTo("");
                  setAuditOffset(0);
                }}
                className="h-9 px-3 rounded-md border border-border bg-card text-[12px]"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="grid grid-cols-[170px_120px_1fr_1fr] gap-3 px-4 py-3 border-b border-border/70 text-[11px] uppercase tracking-wide text-muted-foreground">
            <span>Time</span>
            <span>Entity</span>
            <span>Action</span>
            <span>Reason</span>
          </div>
          {auditCatalogsQuery.isLoading && (
            <div className="px-4 py-6 text-[13px] text-muted-foreground">Loading audit...</div>
          )}
          {!auditCatalogsQuery.isLoading && auditItems.length === 0 && (
            <div className="px-4 py-6 text-[13px] text-muted-foreground">
              No catalog audit entries.
            </div>
          )}
          {!auditCatalogsQuery.isLoading &&
            auditItems.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-[170px_120px_1fr_1fr] gap-3 px-4 py-3 border-t border-border/70 text-[13px] items-center"
              >
                <div className="text-muted-foreground">{formatDateTime(item.created_at)}</div>
                <div className="font-medium">{item.entity_type}</div>
                <div>{item.action}</div>
                <div className="text-muted-foreground">{item.reason || "-"}</div>
              </div>
            ))}
          <div className="px-4 py-3 border-t border-border/70 flex items-center justify-between text-[12px]">
            <div className="text-muted-foreground">
              Total matched: {auditSummary?.total || 0}
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={!auditCanPrev}
                onClick={() => setAuditOffset((x) => Math.max(0, x - AUDIT_PREVIEW_LIMIT))}
                className="h-8 px-3 rounded-md border border-border bg-card disabled:opacity-50"
              >
                Prev
              </button>
              <button
                disabled={!auditCanNext}
                onClick={() => setAuditOffset((x) => x + AUDIT_PREVIEW_LIMIT)}
                className="h-8 px-3 rounded-md border border-border bg-card disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl overflow-hidden border border-border">
          <div className="px-4 py-3 border-b border-border bg-muted/30 text-[11px] uppercase tracking-wide text-muted-foreground">
            Issue Audit Report
          </div>
          <div className="px-4 py-3 border-b border-border/70 grid gap-2 md:grid-cols-[220px_240px_150px_150px_auto] items-center">
            <select
              value={issueAuditAction}
              onChange={(e) => {
                setIssueAuditAction(e.target.value);
                setIssueAuditOffset(0);
              }}
              className="h-9 rounded-md border border-border bg-card px-2 text-[13px]"
            >
              <option value="">All actions</option>
              {ISSUE_AUDIT_ACTION_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <input
              value={issueAuditIssueId}
              onChange={(e) => {
                setIssueAuditIssueId(e.target.value);
                setIssueAuditOffset(0);
              }}
              placeholder="Issue UUID"
              className="h-9 rounded-md border border-border bg-card px-2 text-[13px]"
            />
            <input
              value={issueAuditDateFrom}
              onChange={(e) => {
                setIssueAuditDateFrom(e.target.value);
                setIssueAuditOffset(0);
              }}
              type="date"
              className="h-9 rounded-md border border-border bg-card px-2 text-[13px]"
            />
            <input
              value={issueAuditDateTo}
              onChange={(e) => {
                setIssueAuditDateTo(e.target.value);
                setIssueAuditOffset(0);
              }}
              type="date"
              className="h-9 rounded-md border border-border bg-card px-2 text-[13px]"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => exportIssueAuditMutation.mutate()}
                disabled={!canRunPrivilegedActions || exportIssueAuditMutation.isPending}
                title={privilegedActionHint}
                className="h-9 px-3 rounded-md border border-border bg-card text-[12px] disabled:opacity-50"
              >
                Export CSV
              </button>
              <button
                onClick={() => {
                  setIssueAuditAction("");
                  setIssueAuditIssueId("");
                  setIssueAuditDateFrom("");
                  setIssueAuditDateTo("");
                  setIssueAuditOffset(0);
                }}
                className="h-9 px-3 rounded-md border border-border bg-card text-[12px]"
              >
                Reset
              </button>
            </div>
          </div>
          {issueAuditIssueIdTrimmed.length > 0 && !issueAuditIssueIdNormalized ? (
            <div className="px-4 pt-2 text-[12px] text-[hsl(var(--warning-foreground))]">
              Issue UUID format is invalid, filter is not applied.
            </div>
          ) : null}

          <div className="grid grid-cols-[170px_1fr_1fr_220px] gap-3 px-4 py-3 border-b border-border/70 text-[11px] uppercase tracking-wide text-muted-foreground">
            <span>Time</span>
            <span>Action</span>
            <span>Changed fields</span>
            <span>Controls</span>
          </div>
          {issueAuditQuery.isLoading && (
            <div className="px-4 py-6 text-[13px] text-muted-foreground">Loading issue audit...</div>
          )}
          {!issueAuditQuery.isLoading && issueAuditItems.length === 0 && (
            <div className="px-4 py-6 text-[13px] text-muted-foreground">
              No issue audit entries.
            </div>
          )}
          {!issueAuditQuery.isLoading &&
            issueAuditItems.map((item) => {
              const changedFields = changedFieldKeys(item.before, item.after);
              const isExpanded = expandedIssueAuditId === item.id;
              return (
                <div key={item.id} className="border-t border-border/70">
                  <div className="grid grid-cols-[170px_1fr_1fr_220px] gap-3 px-4 py-3 text-[13px] items-start">
                    <div className="text-muted-foreground">{formatDateTime(item.created_at)}</div>
                    <div>
                      <div className="font-medium">{item.action}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {item.reason || "No reason"}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {changedFields.length === 0 ? (
                        <span className="text-[12px] text-muted-foreground">No detected changes</span>
                      ) : (
                        changedFields.slice(0, 4).map((field) => (
                          <span
                            key={field}
                            className="inline-flex h-6 items-center rounded-md border border-border bg-background px-2 text-[11px]"
                          >
                            {field}
                          </span>
                        ))
                      )}
                      {changedFields.length > 4 ? (
                        <span className="inline-flex h-6 items-center rounded-md border border-border bg-background px-2 text-[11px] text-muted-foreground">
                          +{changedFields.length - 4}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          if (item.entity_id) {
                            router.push(`/issues?issue_id=${item.entity_id}`);
                          }
                        }}
                        disabled={!item.entity_id}
                        className="h-8 px-3 rounded-md border border-border bg-card text-[12px] disabled:opacity-50"
                      >
                        Open Issue
                      </button>
                      <button
                        onClick={() =>
                          setExpandedIssueAuditId((current) =>
                            current === item.id ? null : item.id
                          )
                        }
                        className="h-8 px-3 rounded-md border border-border bg-card text-[12px]"
                      >
                        {isExpanded ? "Hide Diff" : "Show Diff"}
                      </button>
                    </div>
                  </div>
                  {isExpanded ? (
                    <div className="px-4 pb-3">
                      <div className="grid gap-2 md:grid-cols-2">
                        <div className="rounded-lg border border-border/70 bg-background/60">
                          <div className="px-3 py-2 border-b border-border/70 text-[11px] uppercase tracking-wide text-muted-foreground">
                            Before
                          </div>
                          <pre className="p-3 text-[11px] leading-5 whitespace-pre-wrap break-all text-muted-foreground overflow-x-auto">
                            {prettyJson(item.before)}
                          </pre>
                        </div>
                        <div className="rounded-lg border border-border/70 bg-background/60">
                          <div className="px-3 py-2 border-b border-border/70 text-[11px] uppercase tracking-wide text-muted-foreground">
                            After
                          </div>
                          <pre className="p-3 text-[11px] leading-5 whitespace-pre-wrap break-all text-muted-foreground overflow-x-auto">
                            {prettyJson(item.after)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          <div className="px-4 py-3 border-t border-border/70 flex items-center justify-between text-[12px]">
            <div className="text-muted-foreground">
              Total matched: {issueAuditSummary?.total || 0}
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={!issueAuditCanPrev}
                onClick={() =>
                  setIssueAuditOffset((x) => Math.max(0, x - AUDIT_PREVIEW_LIMIT))
                }
                className="h-8 px-3 rounded-md border border-border bg-card disabled:opacity-50"
              >
                Prev
              </button>
              <button
                disabled={!issueAuditCanNext}
                onClick={() => setIssueAuditOffset((x) => x + AUDIT_PREVIEW_LIMIT)}
                className="h-8 px-3 rounded-md border border-border bg-card disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-[12px] text-muted-foreground">
            {alertsQuery.data?.last_read_at
              ? `Last read at: ${formatDateTime(alertsQuery.data.last_read_at)}`
              : "Alerts are not marked as read yet."}
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={!canGoPrev}
              onClick={() => setOffset((x) => Math.max(0, x - PAGE_SIZE))}
              className="h-8 px-3 rounded-md border border-border bg-card text-[12px] disabled:opacity-50"
            >
              Prev
            </button>
            <button
              disabled={!canGoNext}
              onClick={() => setOffset((x) => x + PAGE_SIZE)}
              className="h-8 px-3 rounded-md border border-border bg-card text-[12px] disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
