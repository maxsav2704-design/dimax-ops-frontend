// Types shared by ReportsPage and its sections (moved verbatim from the page).

import { type IssueExposureCoverage } from "@/components/prices/IssueExposureBasis";
import { type OrderFinancialCoverage } from "@/components/prices/OrderFinancialBasis";
import { type ProjectPricingCoverage } from "@/components/prices/ProjectPricingNotice";
import { type InstallerFinancialCoverage, type InstallerMatrixCoverage } from "@/lib/installer-financials";
import { type ProjectMarginCoverage } from "@/lib/project-margin";
import { type LucideIcon } from "lucide-react";

export type LimitAlertItem = {
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

export type LimitAlertsResponse = {
  items: LimitAlertItem[];
  unread_count: number;
  last_read_at: string | null;
  limit: number;
  offset: number;
};

export type LimitAlertsReadResponse = {
  unread_count: number;
  last_read_at: string;
};

export type DeliveryStatsResponse = {
  period_from: string | null;
  period_to: string | null;
  whatsapp_pending: number;
  whatsapp_delivered: number;
  whatsapp_failed: number;
  email_sent: number;
  email_failed: number;
};

export type OutboxSummaryResponse = {
  total: number;
  by_channel: Record<string, number>;
  by_status: Record<string, number>;
  by_delivery_status: Record<string, number>;
  pending_overdue_15m: number;
  failed_total: number;
};

export type OutboxItem = {
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

export type OutboxListResponse = {
  items: OutboxItem[];
};

export type OutboxRetryResponse = {
  item: OutboxItem;
};

export type WebhookSignalItem = {
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

export type WebhookSignalListResponse = {
  items: WebhookSignalItem[];
};

export type OutboxRetryAuditItem = {
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

export type OutboxRetryAuditListResponse = {
  items: OutboxRetryAuditItem[];
};

export type AuditCatalogChangeItem = {
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

export type AuditCatalogChangesResponse = {
  items: AuditCatalogChangeItem[];
  summary: {
    total: number;
    by_entity: Record<string, number>;
    by_action: Record<string, number>;
  };
};

export type OperationsSlaMetric = {
  code: string;
  title: string;
  unit: string;
  current: number;
  target: number;
  warn_threshold: number;
  danger_threshold: number;
  status: "OK" | "WARN" | "DANGER" | string;
};

export type OperationsSlaPlaybook = {
  code: string;
  severity: "OK" | "WARN" | "DANGER" | string;
  title: string;
  description: string;
  action_url: string;
};

export type OperationsSlaResponse = {
  generated_at: string;
  overall_status: "OK" | "WARN" | "DANGER" | string;
  metrics: OperationsSlaMetric[];
  playbooks: OperationsSlaPlaybook[];
};

export type OperationsSlaHistoryPoint = {
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

export type OperationsSlaHistorySummary = {
  ok_days: number;
  warn_days: number;
  danger_days: number;
  current_status: "OK" | "WARN" | "DANGER" | string;
  delta_import_failure_rate_pct: number;
  delta_outbox_failed_rate_pct: number;
  delta_danger_alerts_count: number;
};

export type OperationsSlaHistoryResponse = {
  generated_at: string;
  days: number;
  points: OperationsSlaHistoryPoint[];
  summary: OperationsSlaHistorySummary;
};

export type IssuesAnalyticsSummary = {
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

export type IssuesAnalyticsTrendPoint = {
  day: string;
  opened: number;
  closed: number;
  backlog_open_end: number;
};

export type IssuesAnalyticsResponse = {
  generated_at: string;
  days: number;
  summary: IssuesAnalyticsSummary;
  trend: IssuesAnalyticsTrendPoint[];
};

export type ProjectOption = {
  id: string;
  name: string;
};

export type InstallerKpiItem = InstallerFinancialCoverage & {
  installer_id: string;
  installer_name: string;
  installed_doors: number;
  payroll_total: number;
  revenue_total: number;
  profit_total: number | null;
  missing_rates_installed_doors: number;
};

export type InstallersKpiResponse = InstallerMatrixCoverage & {
  total?: number;
  period_from: string | null;
  period_to: string | null;
  items: InstallerKpiItem[];
};

export type InstallerProfitabilityMatrixItem = InstallerFinancialCoverage & {
  installer_id: string;
  installer_name: string;
  performance_band: string;
  installed_doors: number;
  active_projects: number;
  open_issues: number;
  addons_done_qty: number;
  revenue_total: number;
  payroll_total: number;
  profit_total: number | null;
  margin_pct: number | null;
  avg_profit_per_door: number | null;
  missing_rates_installed_doors: number;
  missing_addon_plans_facts: number;
  last_installed_at: string | null;
};

export type InstallerProfitabilityMatrixResponse = InstallerMatrixCoverage & {
  total: number;
  limit: number;
  offset: number;
  items: InstallerProfitabilityMatrixItem[];
};

export type InstallerProjectProfitabilityItem = InstallerFinancialCoverage & {
  installer_id: string;
  installer_name: string;
  project_id: string | null;
  project_name: string | null;
  performance_band: string;
  installed_doors: number;
  open_issues: number;
  addons_done_qty: number;
  revenue_total: number;
  payroll_total: number;
  profit_total: number | null;
  margin_pct: number | null;
  avg_profit_per_door: number | null;
  missing_rates_installed_doors: number;
  missing_addon_plans_facts: number;
  last_installed_at: string | null;
};

export type InstallerProjectProfitabilityResponse = InstallerMatrixCoverage & {
  total: number;
  limit: number;
  offset: number;
  items: InstallerProjectProfitabilityItem[];
};

export type InstallerKpiProjectItem = InstallerFinancialCoverage & {
  project_id: string | null;
  project_name: string | null;
  installed_doors: number;
  open_issues: number;
  revenue_total: number;
  payroll_total: number;
  profit_total: number | null;
  last_installed_at: string | null;
};

export type InstallerKpiOrderItem = InstallerFinancialCoverage & {
  order_number: string;
  installed_doors: number;
  revenue_total: number;
  payroll_total: number;
  profit_total: number | null;
};

export type InstallerKpiDetailsResponse = InstallerFinancialCoverage & {
  installer_id: string;
  installer_name: string;
  installed_doors: number;
  active_projects: number;
  order_numbers: number;
  open_issues: number;
  addons_done_qty: number;
  addon_revenue_total: number;
  addon_payroll_total: number;
  addon_profit_total: number | null;
  revenue_total: number;
  payroll_total: number;
  profit_total: number | null;
  missing_rates_installed_doors: number;
  missing_addon_plans_facts: number;
  last_installed_at: string | null;
  top_projects: InstallerKpiProjectItem[];
  order_breakdown: InstallerKpiOrderItem[];
  project_rows_total?: number | null;
  order_rows_total?: number | null;
};

export type OrderNumberKpiItem = InstallerFinancialCoverage & {
  recorded_installations?: number | null;
  order_number: string;
  total_doors: number;
  installed_doors: number;
  not_installed_doors: number;
  open_issues: number;
  planned_revenue_total: number;
  installed_revenue_total: number;
  payroll_total: number;
  profit_total: number | null;
  missing_rates_installed_doors: number;
  completion_pct: number;
};

export type OrderNumbersKpiResponse = OrderFinancialCoverage & {
  total: number;
  limit: number;
  offset: number;
  items: OrderNumberKpiItem[];
};

export type ProjectPlanFactResponse = ProjectPricingCoverage & {
  project_id: string;
  total_doors: number;
  installed_doors: number;
  not_installed_doors: number;
  completion_pct: number;
  open_issues: number;
  planned_revenue_total: number;
  actual_revenue_total: number;
  revenue_gap_total: number;
  planned_payroll_total: number | null;
  actual_payroll_total: number;
  payroll_gap_total: number | null;
  planned_profit_total: number | null;
  actual_profit_total: number | null;
  profit_gap_total: number | null;
  planned_addons_qty: number;
  actual_addons_qty: number;
  urgency_surcharges_count: number;
  urgency_order_surcharges_count: number;
  urgency_client_total: number;
  urgency_installer_total: number;
  urgency_profit_total: number;
  missing_planned_rates_doors: number;
  missing_actual_rates_doors: number;
  missing_addon_plans_facts: number;
};

export type ProjectAddonPlanItem = {
  id?: string;
  addon_type_id: string;
  addon_name?: string | null;
  qty_planned: string | number;
  client_price: string | number;
  installer_price: string | number | null;
  notes?: string | null;
};

export type UrgencySurchargeItem = {
  id?: string;
  scope: "PROJECT" | "ORDER_NUMBER";
  order_number?: string | null;
  reason: string;
  client_amount: string | number;
  installer_amount: string | number;
  effective_date?: string | null;
  notes?: string | null;
};

export type ProjectRiskDriverItem = {
  code: string;
  label: string;
  severity: string;
  value: number | null;
};

export type ProjectRiskReasonItem = {
  reason_id: string | null;
  reason_name: string;
  doors: number;
  revenue_delayed_total: number;
  profit_delayed_total: number | null;
};

export type ProjectRiskOrderItem = {
  order_number: string;
  total_doors: number;
  installed_doors: number;
  not_installed_doors: number;
  open_issues: number;
  planned_revenue_total: number;
  actual_revenue_total: number;
  revenue_gap_total: number;
  actual_profit_total: number | null;
  completion_pct: number;
};

export type ProjectRiskDrilldownSummary = ProjectPricingCoverage & {
  total_doors: number;
  installed_doors: number;
  not_installed_doors: number;
  completion_pct: number;
  open_issues: number;
  blocked_open_issues: number;
  planned_revenue_total: number;
  actual_revenue_total: number;
  revenue_gap_total: number;
  planned_profit_total: number | null;
  actual_profit_total: number | null;
  profit_gap_total: number | null;
  actual_margin_pct: number | null;
  delayed_revenue_total: number;
  delayed_profit_total: number | null;
  blocked_issue_profit_at_risk: number | null;
  addon_revenue_total: number;
  addon_profit_total: number | null;
  urgency_surcharges_count: number;
  urgency_order_surcharges_count: number;
  urgency_client_total: number;
  urgency_installer_total: number;
  urgency_profit_total: number;
  missing_planned_rates_doors: number;
  missing_actual_rates_doors: number;
  missing_addon_plans_facts: number;
};

export type ProjectRiskDrilldownResponse = {
  generated_at: string;
  project_id: string;
  project_name: string;
  summary: ProjectRiskDrilldownSummary;
  drivers: ProjectRiskDriverItem[];
  top_reasons: ProjectRiskReasonItem[];
  risky_orders: ProjectRiskOrderItem[];
};

export type ProjectMarginItem = ProjectMarginCoverage & {
  project_id: string;
  project_name: string;
  project_status: string;
  total_doors: number;
  installed_doors: number;
  completion_pct: number;
  open_issues: number;
  revenue_total: number;
  payroll_total: number;
  profit_total: number | null;
  margin_pct: number | null;
  missing_rates_installed_doors: number;
  missing_addon_plans_facts: number;
  last_installed_at: string | null;
};

export type ProjectsMarginResponse = {
  pricing_mode?: "LEGACY" | "FACTORY";
  incomplete_projects?: number;
  total: number;
  limit: number;
  offset: number;
  items: ProjectMarginItem[];
};

export type IssuesAddonsImpactSummary = IssueExposureCoverage & {
  open_issues: number;
  blocked_open_issues: number;
  not_installed_doors: number;
  open_issue_revenue_at_risk: number;
  open_issue_payroll_at_risk: number | null;
  open_issue_profit_at_risk: number | null;
  blocked_issue_profit_at_risk: number | null;
  delayed_revenue_total: number;
  delayed_payroll_total: number | null;
  delayed_profit_total: number | null;
  addon_revenue_total: number;
  addon_payroll_total: number;
  addon_profit_total: number | null;
  missing_addon_plans_facts: number;
};

export type IssuesAddonsImpactReasonItem = {
  unpriced_doors?: number;
  reason_id: string | null;
  reason_name: string;
  doors: number;
  revenue_delayed_total: number;
  payroll_delayed_total: number | null;
  profit_delayed_total: number | null;
};

export type IssuesAddonsImpactAddonItem = InstallerFinancialCoverage & {
  addon_type_id: string | null;
  addon_name: string;
  qty_done: number;
  revenue_total: number;
  payroll_total: number;
  profit_total: number | null;
  missing_plan_facts: number;
};

export type IssuesAddonsImpactResponse = {
  generated_at: string;
  summary: IssuesAddonsImpactSummary;
  top_reasons: IssuesAddonsImpactReasonItem[];
  addon_impact: IssuesAddonsImpactAddonItem[];
};

export type RiskConcentrationSummary = IssueExposureCoverage & {
  order_pricing_mode?: "LEGACY" | "FACTORY";
  incomplete_orders?: number;
  order_rows_total?: number;
  installer_pricing_mode?: "LEGACY" | "FACTORY";
  incomplete_installers?: number;
  unassigned_completed_works?: number;
  incomplete_projects?: number;
  open_issue_profit_at_risk: number | null;
  blocked_issue_profit_at_risk: number | null;
  delayed_profit_total: number | null;
  risky_projects: number;
  risky_orders: number;
  risky_installers: number;
  worst_project_profit_total: number | null;
  worst_order_profit_total: number | null;
  worst_installer_profit_total: number | null;
};

export type RiskConcentrationResponse = {
  generated_at: string;
  summary: RiskConcentrationSummary;
  projects: ProjectMarginItem[];
  orders: OrderNumberKpiItem[];
  installers: InstallerProfitabilityMatrixItem[];
};

export type ReportsPreset = {
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

export type ReportsFocus = "operations" | "delivery" | "issues";

export type ReportsOpsPreset = "failed-imports" | "delivery-risk" | "issue-pressure";

export type SortDir = "asc" | "desc";

export type InstallersSortBy =
  | "installed_doors"
  | "payroll_total"
  | "revenue_total"
  | "profit_total"
  | "installer_name";

export type InstallerMatrixSortBy =
  | "profit_total"
  | "margin_pct"
  | "installed_doors"
  | "avg_profit_per_door"
  | "open_issues";

export type InstallerProjectSortBy =
  | "profit_total"
  | "margin_pct"
  | "installed_doors"
  | "open_issues"
  | "avg_profit_per_door";

export type OrderNumbersSortBy =
  | "order_number"
  | "total_doors"
  | "installed_doors"
  | "not_installed_doors"
  | "planned_revenue_total"
  | "installed_revenue_total"
  | "payroll_total"
  | "profit_total"
  | "missing_rates_installed_doors";

export type ReportsScopedContext = {
  projectId: string | null;
  outboxId: string | null;
  installerId: string | null;
  deliveryChannel: string | null;
  webhookProvider: string | null;
};

export type ReportsDashboardTone = "blue" | "green" | "neutral" | "orange" | "red";

export type ReportsInsight = {
  cta: string;
  delta: string;
  detail: string;
  eyebrow: string;
  onClick?: () => void;
  title: string;
  tone: ReportsDashboardTone;
  value: string;
  variant: "bars" | "line-down" | "line-up";
};

export type ReportsLibraryRow = {
  badge?: "live";
  badgeText?: string;
  icon: string;
  meta: string;
  onClick?: () => void;
  subtitle: string;
  title: string;
};

export type ReportsLibraryGroup = {
  icon: LucideIcon;
  rows: ReportsLibraryRow[];
  subtitle: string;
  title: string;
  tone: ReportsDashboardTone;
};

export type OperationsCenterResponse = {
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
