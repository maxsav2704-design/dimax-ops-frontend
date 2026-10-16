// Moved verbatim from ProjectsPage.tsx (monolith split).

import { type ProjectPricingCoverage } from "@/components/prices/ProjectPricingNotice";

export type ProjectPlanFactResponse = ProjectPricingCoverage & {
  project_id: string;
  total_doors: number;
  installed_doors: number;
  not_installed_doors: number;
  completion_pct: number;
  open_issues: number;
  planned_revenue_total: string | number;
  actual_revenue_total: string | number;
  revenue_gap_total: string | number;
  planned_payroll_total: string | number | null;
  actual_payroll_total: string | number;
  payroll_gap_total: string | number | null;
  planned_profit_total: string | number | null;
  actual_profit_total: string | number | null;
  profit_gap_total: string | number | null;
  planned_addons_qty: string | number;
  actual_addons_qty: string | number;
  urgency_surcharges_count: number;
  urgency_order_surcharges_count: number;
  urgency_client_total: string | number;
  urgency_installer_total: string | number;
  urgency_profit_total: string | number;
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

export type ProjectRiskDriverItem = {
  code: string;
  label: string;
  severity: string;
  value: string | number | null;
};

export type ProjectRiskReasonItem = {
  reason_id: string | null;
  reason_name: string;
  doors: number;
  revenue_delayed_total: string | number;
  profit_delayed_total: string | number | null;
};

export type ProjectRiskOrderItem = {
  order_number: string;
  total_doors: number;
  installed_doors: number;
  not_installed_doors: number;
  open_issues: number;
  planned_revenue_total: string | number;
  actual_revenue_total: string | number;
  revenue_gap_total: string | number;
  actual_profit_total: string | number | null;
  completion_pct: number;
};

export type ProjectRiskDrilldownSummary = ProjectPricingCoverage & {
  total_doors: number;
  installed_doors: number;
  not_installed_doors: number;
  completion_pct: number;
  open_issues: number;
  blocked_open_issues: number;
  planned_revenue_total: string | number;
  actual_revenue_total: string | number;
  revenue_gap_total: string | number;
  planned_profit_total: string | number | null;
  actual_profit_total: string | number | null;
  profit_gap_total: string | number | null;
  actual_margin_pct: number | null;
  delayed_revenue_total: string | number;
  delayed_profit_total: string | number | null;
  blocked_issue_profit_at_risk: string | number | null;
  addon_revenue_total: string | number;
  addon_profit_total: string | number | null;
  urgency_surcharges_count: number;
  urgency_order_surcharges_count: number;
  urgency_client_total: string | number;
  urgency_installer_total: string | number;
  urgency_profit_total: string | number;
  missing_planned_rates_doors: number;
  missing_actual_rates_doors: number;
  missing_addon_plans_facts: number;
};
