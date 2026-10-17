import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  BellRing,
  CalendarClock,
  CheckCheck,
  FileText,
  FolderKanban,
  LineChart,
  Mail,
  MessageSquare,
  Plus,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  Star,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import { DashboardLayout } from "@/components/DashboardLayout";
import { DimaxPageHeader } from "@/components/DimaxPageHeader";
import { COMPANY_CURRENCY, InlineNotice, useEntityHighlight } from "@/components/dimax";
import { queryKeys } from "@/lib/query-keys";
import { ProjectPricingNotice, type ProjectPricingCoverage } from "@/components/prices/ProjectPricingNotice";
import { ProjectMarginBasis, ProjectMarginNotice } from "@/components/prices/ProjectMarginNotice";
import { InstallerFinancialBasis, InstallerFinancialNotice, InstallerFinancialBand } from "@/components/prices/InstallerFinancialNotice";
import { OrderFinancialBasis, type OrderFinancialCoverage } from "@/components/prices/OrderFinancialBasis";
import { IssueExposureBasis, UnpricedExposureNotice, type IssueExposureCoverage } from "@/components/prices/IssueExposureBasis";
import { installerFinancialDataRisk, type InstallerFinancialCoverage, type InstallerMatrixCoverage } from "@/lib/installer-financials";
import { projectMarginDataRisk, type ProjectMarginCoverage } from "@/lib/project-margin";
import { Button } from "@/components/ui/button";
import { apiDownload, apiFetch } from "@/lib/api";
import { readableApiError } from "@/lib/api-error-display";
import { useAuthSession } from "@/hooks/use-auth-session";
import {
  canAccessAdminModule,
  canRunPrivilegedAdminActions,
  canViewRates,
} from "@/lib/admin-access";
import {
  formatLocaleDateTime as formatLocalizedDateTime,
  formatLocaleNumber as formatLocalizedNumber,
  formatLocalePercent as formatLocalizedPercent,
} from "@/lib/formatting";
import { useI18n, type Locale, useCopy } from "@/lib/i18n";
import { createRequestLimiter } from "@/lib/request-limiter";
import { cn } from "@/lib/utils";
import { OperationsCenterSection } from "@/components/reports/OperationsCenterSection";
import { ProjectPlanFactSection } from "@/components/reports/ProjectPlanFactSection";
import { IssueAuditSection } from "@/components/reports/IssueAuditSection";
import { AuditCatalogsSection } from "@/components/reports/AuditCatalogsSection";
import { DeliveryRiskSection } from "@/components/reports/DeliveryRiskSection";
import { OrderNumbersSection } from "@/components/reports/OrderNumbersSection";
import { InstallersKpiTableSection } from "@/components/reports/InstallersKpiTableSection";
import { OperationsSlaSection } from "@/components/reports/OperationsSlaSection";
import { InstallerDetailsSection } from "@/components/reports/InstallerDetailsSection";
import { ProjectRiskDrilldownSection } from "@/components/reports/ProjectRiskDrilldownSection";
import { FailedOutboxSection } from "@/components/reports/FailedOutboxSection";
import { IssuesAddonsImpactSection } from "@/components/reports/IssuesAddonsImpactSection";
import { ProjectMarginExecutiveSection } from "@/components/reports/ProjectMarginExecutiveSection";
import { InstallersKpiSection } from "@/components/reports/InstallersKpiSection";
import { InstallerCrossViewSection } from "@/components/reports/InstallerCrossViewSection";
import { InstallerProfitabilityMatrixSection } from "@/components/reports/InstallerProfitabilityMatrixSection";
import { IssuesAnalyticsSection } from "@/components/reports/IssuesAnalyticsSection";

import { reportsOverrides, downloadCsvExport, AUDIT_ACTION_OPTIONS, AUDIT_ENTITY_OPTIONS, AUDIT_EXPORT_LIMIT, AUDIT_PREVIEW_LIMIT, FAILED_OUTBOX_LIMIT, INSTALLERS_SORT_OPTIONS, INSTALLER_MATRIX_LIMIT, INSTALLER_MATRIX_SORT_OPTIONS, INSTALLER_PROJECT_LIMIT, INSTALLER_PROJECT_SORT_OPTIONS, ISSUES_ANALYTICS_DAYS, ISSUE_AUDIT_ACTION_OPTIONS, KPI_EXPORT_LIMIT, KPI_PAGE_SIZE, LIVE_REPORT_REFRESH_MS, ORDER_NUMBERS_SORT_OPTIONS, PAGE_SIZE, PROJECT_MARGIN_LIMIT, RISK_CONCENTRATION_LIMIT, SLA_HISTORY_DAYS_OPTIONS, SLA_STATUS_CLASS, SORT_DIR_OPTIONS, STANDARD_REPORT_REFRESH_MS, buildAuditParams, buildOperationsHref, changedFieldKeys, compactMap, formatAmount, formatCount, formatDateTime, formatPercent, getReportsFocusCopy, getReportsFocusTargetId, getReportsOpsPresetCopy, installerPerformanceBandClass, isUuid, metricLabel, parseReportsFocus, parseReportsOpsPreset, prettyJson, readReportsPresets, reportsMetricCardClass, reportsNoticeClass, reportsPanelClass, toReportNumber, writeReportsPresets } from "@/components/reports/shared";
import { ReportsInsightCard, ReportsLibraryCard, SavedReportViewCard, SectionMessage } from "@/components/reports/widgets";
import type { AuditCatalogChangesResponse, DeliveryStatsResponse, InstallerKpiDetailsResponse, InstallerMatrixSortBy, InstallerProfitabilityMatrixResponse, InstallerProjectProfitabilityResponse, InstallerProjectSortBy, InstallersKpiResponse, InstallersSortBy, IssuesAddonsImpactResponse, IssuesAnalyticsResponse, LimitAlertsReadResponse, LimitAlertsResponse, OperationsSlaHistoryResponse, OperationsSlaResponse, OrderNumbersKpiResponse, OrderNumbersSortBy, OutboxListResponse, OutboxRetryAuditListResponse, OutboxRetryResponse, OutboxSummaryResponse, ProjectAddonPlanItem, ProjectOption, ProjectPlanFactResponse, ProjectRiskDrilldownResponse, ProjectsMarginResponse, ReportsInsight, ReportsLibraryGroup, ReportsOpsPreset, ReportsPreset, ReportsScopedContext, RiskConcentrationResponse, SortDir, UrgencySurchargeItem, WebhookSignalListResponse, OperationsCenterResponse } from "@/components/reports/types";

export default function ReportsPage() {
  const [reportRequestLimiter] = useState(() => createRequestLimiter(4));
  const reportApiFetch = <T,>(
    path: string,
    signal: AbortSignal,
  ): Promise<T> =>
    reportRequestLimiter.run(() => apiFetch<T>(path, { signal }), signal);
  const { locale, t } = useI18n();
  const readError = (error: unknown, fallback: string) =>
    readableApiError(error, locale, fallback);
  const tt = (key: string) => reportsOverrides[locale]?.[key] ?? t(key);
  const copy = useCopy();
  const optionLabel = (label: string) => {
    switch (label) {
      case "Profit":
        return copy("Profit", "Прибыль", "רווח");
      case "Margin %":
        return copy("Margin %", "Маржа %", "מרווח %");
      case "Installed Doors":
        return copy("Installed Doors", "Смонтированные двери", "דלתות מותקנות");
      case "Profit / Door":
        return copy("Profit / Door", "Прибыль / дверь", "רווח / דלת");
      case "Open Issues":
        return copy("Open Issues", "Открытые проблемы", "תקלות פתוחות");
      case "Total Doors":
        return copy("Total Doors", "Всего дверей", 'סה"כ דלתות');
      case "Not Installed":
        return copy("Not Installed", "Не смонтировано", "לא הותקן");
      case "Planned Revenue":
        return copy("Planned Revenue", "Плановая выручка", "הכנסה מתוכננת");
      case "Installed Revenue":
        return copy("Installed Revenue", "Выручка по монтажу", "הכנסה מותקנת");
      default:
        return label;
    }
  };
  const reportsFocusCopy = getReportsFocusCopy(t);
  // E2: an installer hovered in one report lights up in every other table of the page.
  useEntityHighlight();
  const reportsOpsPresetCopy = useMemo(() => getReportsOpsPresetCopy(t), [t]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const session = useAuthSession();
  const canRunPrivilegedActions = canRunPrivilegedAdminActions(session);
  const canOpenOperations = canAccessAdminModule(session, "operations");
  const canExportFinancialReports = canViewRates(session);
  const privilegedActionHint = canRunPrivilegedActions
    ? undefined
    : t("reports.installerReadOnlyHint");
  const financialReportsRestrictedTitle = copy(
    "Financial reports are restricted",
    "Финансовые отчёты ограничены",
    "הדוחות הכספיים מוגבלים",
  );
  const financialReportsRestrictedDetail = copy(
    "Your current admin scope can work with operations, but payroll, revenue, profit and price details require finance access.",
    "Ваша текущая область администратора может работать с операциями, но данные о заработной плате, доходах, прибыли и ценах требуют доступа к финансам.",
    "הרשאת הניהול הנוכחית מתאימה לתפעול, אך שכר, הכנסה, רווח ופרטי מחירים דורשים גישת כספים.",
  );
  const ratesScopeHint = canExportFinancialReports
    ? undefined
    : "Financial exports are restricted for your current admin scope.";
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
  const [slaHistoryDays, setSlaHistoryDays] = useState<number>(30);
  const [installerMatrixSortBy, setInstallerMatrixSortBy] =
    useState<InstallerMatrixSortBy>("profit_total");
  const [installerMatrixSortDir, setInstallerMatrixSortDir] =
    useState<SortDir>("desc");
  const [installerProjectSortBy, setInstallerProjectSortBy] =
    useState<InstallerProjectSortBy>("profit_total");
  const [installerProjectSortDir, setInstallerProjectSortDir] =
    useState<SortDir>("desc");
  const [installersKpiOffset, setInstallersKpiOffset] = useState(0);
  const [installersSortBy, setInstallersSortBy] =
    useState<InstallersSortBy>("installed_doors");
  const [installersSortDir, setInstallersSortDir] = useState<SortDir>("desc");
  const [installerDetailsId, setInstallerDetailsId] = useState("");
  const [orderNumbersKpiOffset, setOrderNumbersKpiOffset] = useState(0);
  const [orderNumbersSortBy, setOrderNumbersSortBy] =
    useState<OrderNumbersSortBy>("total_doors");
  const [orderNumbersSortDir, setOrderNumbersSortDir] =
    useState<SortDir>("desc");
  const [orderNumbersQuery, setOrderNumbersQuery] = useState("");
  const [orderNumbersProjectId, setOrderNumbersProjectId] = useState("");
  const [projectPlanFactProjectId, setProjectPlanFactProjectId] = useState("");
  const [projectRiskProjectId, setProjectRiskProjectId] = useState("");
  const [presetName, setPresetName] = useState("");
  const [savedPresets, setSavedPresets] = useState<ReportsPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [presetNotice, setPresetNotice] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const activeFocus = parseReportsFocus(searchParams?.get("focus") || null);
  const activeOpsPreset = parseReportsOpsPreset(
    searchParams?.get("ops_preset") || null,
  );
  const scopedProjectId = searchParams?.get("project_id") || null;
  const scopedOutboxId = searchParams?.get("outbox_id") || null;
  const scopedInstallerId = searchParams?.get("installer_id") || null;
  const scopedDeliveryChannel =
    searchParams?.get("delivery_channel")?.trim().toUpperCase() || null;
  const scopedWebhookProvider =
    searchParams?.get("webhook_provider")?.trim().toLowerCase() || null;
  const appliedOpsPresetRef = useRef<ReportsOpsPreset | null>(null);
  const appliedProjectScopeRef = useRef<string | null>(null);
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
    queryFn: ({ signal }) =>
      reportApiFetch<LimitAlertsResponse>(
        `/api/v1/admin/reports/limit-alerts?limit=${PAGE_SIZE}&offset=${offset}`,
        signal,
      ),
    refetchInterval: LIVE_REPORT_REFRESH_MS,
  });

  const deliveryQuery = useQuery({
    queryKey: ["reports-delivery"],
    queryFn: ({ signal }) =>
      reportApiFetch<DeliveryStatsResponse>(
        "/api/v1/admin/reports/delivery",
        signal,
      ),
    refetchInterval: LIVE_REPORT_REFRESH_MS,
  });

  const outboxSummaryQuery = useQuery({
    queryKey: queryKeys.outboxSummary,
    queryFn: ({ signal }) =>
      reportApiFetch<OutboxSummaryResponse>(
        "/api/v1/admin/outbox/summary",
        signal,
      ),
    refetchInterval: LIVE_REPORT_REFRESH_MS,
  });

  const operationsCenterQuery = useQuery({
    queryKey: ["reports-operations-center"],
    queryFn: ({ signal }) =>
      reportApiFetch<OperationsCenterResponse>(
        "/api/v1/admin/reports/operations-center",
        signal,
      ),
    refetchInterval: LIVE_REPORT_REFRESH_MS,
  });

  const operationsSlaQuery = useQuery({
    queryKey: ["reports-operations-sla"],
    queryFn: ({ signal }) =>
      reportApiFetch<OperationsSlaResponse>(
        "/api/v1/admin/reports/operations-sla",
        signal,
      ),
    refetchInterval: STANDARD_REPORT_REFRESH_MS,
  });

  const operationsSlaHistoryQuery = useQuery({
    queryKey: ["reports-operations-sla-history", slaHistoryDays],
    queryFn: ({ signal }) =>
      reportApiFetch<OperationsSlaHistoryResponse>(
        `/api/v1/admin/reports/operations-sla/history?days=${slaHistoryDays}`,
        signal,
      ),
    refetchInterval: STANDARD_REPORT_REFRESH_MS,
  });

  const issuesAnalyticsQuery = useQuery({
    queryKey: ["reports-issues-analytics", ISSUES_ANALYTICS_DAYS],
    queryFn: ({ signal }) =>
      reportApiFetch<IssuesAnalyticsResponse>(
        `/api/v1/admin/reports/issues-analytics?days=${ISSUES_ANALYTICS_DAYS}`,
        signal,
      ),
    refetchInterval: STANDARD_REPORT_REFRESH_MS,
  });

  const issuesAddonsImpactQuery = useQuery({
    queryKey: ["reports-issues-addons-impact"],
    queryFn: ({ signal }) =>
      reportApiFetch<IssuesAddonsImpactResponse>(
        "/api/v1/admin/reports/issues-addons-impact",
        signal,
      ),
    enabled: canExportFinancialReports,
    refetchInterval: STANDARD_REPORT_REFRESH_MS,
  });

  const riskConcentrationQuery = useQuery({
    queryKey: ["reports-risk-concentration"],
    queryFn: ({ signal }) =>
      reportApiFetch<RiskConcentrationResponse>(
        `/api/v1/admin/reports/risk-concentration?limit=${RISK_CONCENTRATION_LIMIT}`,
        signal,
      ),
    enabled: canExportFinancialReports,
    refetchInterval: STANDARD_REPORT_REFRESH_MS,
  });

  const installerProfitabilityMatrixQuery = useQuery({
    queryKey: [
      "reports-installer-profitability-matrix",
      installerMatrixSortBy,
      installerMatrixSortDir,
    ],
    queryFn: ({ signal }) =>
      reportApiFetch<InstallerProfitabilityMatrixResponse>(
        `/api/v1/admin/reports/installers-profitability-matrix` +
          `?limit=${INSTALLER_MATRIX_LIMIT}` +
          `&sort_by=${installerMatrixSortBy}` +
          `&sort_dir=${installerMatrixSortDir}`,
        signal,
      ),
    enabled: canExportFinancialReports,
    refetchInterval: STANDARD_REPORT_REFRESH_MS,
  });

  const installerProjectProfitabilityQuery = useQuery({
    queryKey: [
      "reports-installer-project-profitability",
      installerProjectSortBy,
      installerProjectSortDir,
    ],
    queryFn: ({ signal }) =>
      reportApiFetch<InstallerProjectProfitabilityResponse>(
        `/api/v1/admin/reports/installer-project-profitability` +
          `?limit=${INSTALLER_PROJECT_LIMIT}` +
          `&sort_by=${installerProjectSortBy}` +
          `&sort_dir=${installerProjectSortDir}`,
        signal,
      ),
    enabled: canExportFinancialReports,
    refetchInterval: STANDARD_REPORT_REFRESH_MS,
  });

  const projectsQuery = useQuery({
    queryKey: ["reports-project-options"],
    queryFn: ({ signal }) =>
      reportApiFetch<{ items: ProjectOption[] }>(
        "/api/v1/admin/projects",
        signal,
      ),
    refetchInterval: 120_000,
  });

  const projectPlanFactQuery = useQuery({
    queryKey: ["reports-project-plan-fact", projectPlanFactProjectId],
    queryFn: ({ signal }) =>
      reportApiFetch<ProjectPlanFactResponse>(
        `/api/v1/admin/reports/project-plan-fact/${projectPlanFactProjectId}`,
        signal,
      ),
    enabled: canExportFinancialReports && Boolean(projectPlanFactProjectId),
    refetchInterval: STANDARD_REPORT_REFRESH_MS,
  });

  const projectAddonPlanQuery = useQuery({
    queryKey: ["reports-project-addon-plan", projectPlanFactProjectId],
    queryFn: async ({ signal }) => {
      const response = await reportApiFetch<
        ProjectAddonPlanItem[] | { items?: ProjectAddonPlanItem[] }
      >(
        `/api/v1/admin/projects/${projectPlanFactProjectId}/addons/plan`,
        signal,
      );
      return Array.isArray(response) ? response : response.items || [];
    },
    enabled: canExportFinancialReports && Boolean(projectPlanFactProjectId),
    refetchInterval: STANDARD_REPORT_REFRESH_MS,
  });

  const projectUrgencySurchargesQuery = useQuery({
    queryKey: ["reports-project-urgency-surcharges", projectPlanFactProjectId],
    queryFn: async ({ signal }) => {
      const response = await reportApiFetch<
        UrgencySurchargeItem[] | { items?: UrgencySurchargeItem[] }
      >(
        `/api/v1/admin/projects/${projectPlanFactProjectId}/urgency-surcharges`,
        signal,
      );
      return Array.isArray(response) ? response : response.items || [];
    },
    enabled: canExportFinancialReports && Boolean(projectPlanFactProjectId),
    refetchInterval: STANDARD_REPORT_REFRESH_MS,
  });

  const projectRiskDrilldownQuery = useQuery({
    queryKey: ["reports-project-risk-drilldown", projectRiskProjectId],
    queryFn: ({ signal }) =>
      reportApiFetch<ProjectRiskDrilldownResponse>(
        `/api/v1/admin/reports/project-risk-drilldown/${projectRiskProjectId}?limit=5`,
        signal,
      ),
    enabled: canExportFinancialReports && Boolean(projectRiskProjectId),
    refetchInterval: STANDARD_REPORT_REFRESH_MS,
  });

  const topProjectsMarginQuery = useQuery({
    queryKey: ["reports-projects-margin", "top"],
    queryFn: ({ signal }) =>
      reportApiFetch<ProjectsMarginResponse>(
        `/api/v1/admin/reports/projects-margin?limit=${PROJECT_MARGIN_LIMIT}&sort_by=profit_total&sort_dir=desc`,
        signal,
      ),
    enabled: canExportFinancialReports,
    refetchInterval: STANDARD_REPORT_REFRESH_MS,
  });

  const riskProjectsMarginQuery = useQuery({
    queryKey: ["reports-projects-margin", "risk"],
    queryFn: ({ signal }) =>
      reportApiFetch<ProjectsMarginResponse>(
        `/api/v1/admin/reports/projects-margin?limit=${PROJECT_MARGIN_LIMIT}&sort_by=profit_total&sort_dir=asc`,
        signal,
      ),
    enabled: canExportFinancialReports,
    refetchInterval: STANDARD_REPORT_REFRESH_MS,
  });

  const installersKpiQuery = useQuery({
    queryKey: [
      "reports-installers-kpi",
      installersKpiOffset,
      installersSortBy,
      installersSortDir,
    ],
    queryFn: ({ signal }) =>
      reportApiFetch<InstallersKpiResponse>(
        `/api/v1/admin/reports/installers-kpi?${installersParams.toString()}`,
        signal,
      ),
    enabled: canExportFinancialReports,
    refetchInterval: STANDARD_REPORT_REFRESH_MS,
  });

  const installerDirectoryQuery = useQuery({
    queryKey: ["reports-installer-directory"],
    queryFn: async ({ signal }) => {
      const items = new Map<string, string>();
      for (let offset = 0; ; offset += 200) {
        const page = await reportApiFetch<{ id: string; full_name: string }[]>(
          `/api/v1/admin/installers?limit=200&offset=${offset}`, signal,
        );
        if (!Array.isArray(page) || page.some((item) => !item?.id || typeof item.full_name !== "string")) {
          throw new Error(copy("Invalid installer directory response", "Некорректный справочник монтажников", "רשימת מתקינים לא תקינה"));
        }
        const previousSize = items.size;
        for (const item of page) items.set(item.id, item.full_name);
        if (page.length < 200) break;
        if (items.size === previousSize) {
          throw new Error(copy("Installer directory pagination did not advance", "Не удалось загрузить следующую страницу монтажников", "לא ניתן לטעון את עמוד המתקינים הבא"));
        }
      }
      return Array.from(items, ([installer_id, installer_name]) => ({ installer_id, installer_name }));
    },
    enabled: canExportFinancialReports,
    refetchInterval: STANDARD_REPORT_REFRESH_MS,
  });

  const installerDetailsQuery = useQuery({
    queryKey: ["reports-installer-kpi-details", installerDetailsId],
    queryFn: async ({ signal }) => {
      const data = await reportApiFetch<InstallerKpiDetailsResponse>(
        `/api/v1/admin/reports/installers-kpi/${encodeURIComponent(installerDetailsId)}`,
        signal,
      );
      if (data.installer_id !== installerDetailsId || !Array.isArray(data.top_projects) || !Array.isArray(data.order_breakdown)) {
        throw new Error(copy("Invalid installer report response", "Некорректный ответ отчёта монтажника", "תשובה לא תקינה לדוח המתקין"));
      }
      return data;
    },
    enabled: canExportFinancialReports && Boolean(installerDetailsId),
    refetchInterval: STANDARD_REPORT_REFRESH_MS,
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
    queryFn: ({ signal }) =>
      reportApiFetch<OrderNumbersKpiResponse>(
        `/api/v1/admin/reports/order-numbers-kpi?${orderNumbersParams.toString()}`,
        signal,
      ),
    enabled: canExportFinancialReports,
    refetchInterval: STANDARD_REPORT_REFRESH_MS,
  });

  const failedOutboxQuery = useQuery({
    queryKey: ["outbox-failed", scopedDeliveryChannel],
    queryFn: ({ signal }) =>
      reportApiFetch<OutboxListResponse>(
        `/api/v1/admin/outbox?${(() => {
          const params = new URLSearchParams();
          params.set("status", "FAILED");
          params.set("limit", String(FAILED_OUTBOX_LIMIT));
          if (scopedDeliveryChannel) {
            params.set("channel", scopedDeliveryChannel);
          }
          return params.toString();
        })()}`,
        signal,
      ),
    refetchInterval: LIVE_REPORT_REFRESH_MS,
  });

  const webhookSignalsQuery = useQuery({
    queryKey: ["reports-webhook-signals", scopedWebhookProvider],
    queryFn: ({ signal }) =>
      reportApiFetch<WebhookSignalListResponse>(
        "/api/v1/admin/outbox/webhook-signals?limit=12",
        signal,
      ),
    refetchInterval: LIVE_REPORT_REFRESH_MS,
  });
  const retryAuditsQuery = useQuery({
    queryKey: ["reports-outbox-retry-audits", scopedOutboxId],
    queryFn: ({ signal }) =>
      reportApiFetch<OutboxRetryAuditListResponse>(
        "/api/v1/admin/outbox/retry-audits?limit=12",
        signal,
      ),
    refetchInterval: LIVE_REPORT_REFRESH_MS,
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
    queryFn: ({ signal }) =>
      reportApiFetch<AuditCatalogChangesResponse>(
        `/api/v1/admin/reports/audit-catalogs?${buildAuditParams({
          entityType: auditEntityType,
          action: auditAction,
          dateFrom: auditDateFrom,
          dateTo: auditDateTo,
          limit: AUDIT_PREVIEW_LIMIT,
          offset: auditOffset,
        })}`,
        signal,
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
    queryFn: ({ signal }) =>
      reportApiFetch<AuditCatalogChangesResponse>(
        `/api/v1/admin/reports/audit-issues?${buildAuditParams({
          entityType: "",
          entityId: issueAuditIssueIdNormalized,
          action: issueAuditAction,
          dateFrom: issueAuditDateFrom,
          dateTo: issueAuditDateTo,
          limit: AUDIT_PREVIEW_LIMIT,
          offset: issueAuditOffset,
        })}`,
        signal,
      ),
    refetchInterval: 60_000,
  });

  const markReadMutation = useMutation({
    mutationFn: () =>
      apiFetch<LimitAlertsReadResponse>(
        "/api/v1/admin/reports/limit-alerts/read",
        {
          method: "POST",
          body: JSON.stringify({}),
        },
      ),
    onSuccess: async () => {
      setActionNotice(
        copy(
          "Alerts marked as read.",
          "Алерты отмечены как прочитанные.",
          "ההתראות סומנו כנקראו.",
        ),
      );
      await queryClient.invalidateQueries({ queryKey: ["limit-alerts"] });
      await queryClient.invalidateQueries({
        queryKey: ["limit-alerts-unread"],
      });
    },
  });

  const retryMutation = useMutation({
    mutationFn: (outboxId: string) =>
      apiFetch<OutboxRetryResponse>(`/api/v1/admin/outbox/${outboxId}/retry`, {
        method: "POST",
        body: JSON.stringify({ reason: "manual retry from reports" }),
      }),
    onSuccess: async () => {
      setActionNotice(
        copy(
          "Delivery retry started and reports were refreshed.",
          "Повтор доставки запущен, а отчёты обновлены.",
          "ניסיון המשלוח הופעל מחדש והדוחות רועננו.",
        ),
      );
      await queryClient.invalidateQueries({ queryKey: queryKeys.outboxSummary });
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
        "audit_catalogs.csv",
      ),
    onSuccess: () => {
      setActionNotice(
        copy(
          "Catalog audit export is ready.",
          "Экспорт аудита каталога готов.",
          "ייצוא ביקורת הקטלוג מוכן.",
        ),
      );
    },
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
        "audit_issues.csv",
      ),
    onSuccess: () => {
      setActionNotice(
        copy(
          "Issue audit export is ready.",
          "Экспорт аудита проблем готов.",
          "ייצוא ביקורת התקלות מוכן.",
        ),
      );
    },
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
        "installers_kpi.csv",
      );
    },
    onSuccess: () => {
      setActionNotice(
        copy(
          "Installer KPI export is ready.",
          "Экспорт KPI монтажников готов.",
          "ייצוא KPI למתקינים מוכן.",
        ),
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
        "order_numbers_kpi.csv",
      );
    },
    onSuccess: () => {
      setActionNotice(
        copy(
          "Order numbers export is ready.",
          "Экспорт по номерам заказов готов.",
          "ייצוא מספרי ההזמנות מוכן.",
        ),
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
        "reports_executive_snapshot.csv",
      );
    },
    onSuccess: () => {
      setActionNotice(
        copy(
          "Executive export is ready.",
          "Исполнительный экспорт готов.",
          "ייצוא הנהלה מוכן.",
        ),
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
  const issuesAnalytics = issuesAnalyticsQuery.data;
  const issuesAddonsImpact = issuesAddonsImpactQuery.data;
  const riskConcentration = riskConcentrationQuery.data;
  const projectOptions = useMemo(
    () => projectsQuery.data?.items || [],
    [projectsQuery.data?.items],
  );
  const scopedProjectInOptions = scopedProjectId
    ? projectOptions.some((project) => project.id === scopedProjectId)
    : false;
  const scopedProjectMissing = Boolean(
    scopedProjectId &&
      projectsQuery.isFetched &&
      !projectsQuery.isLoading &&
      !scopedProjectInOptions,
  );
  const projectRiskDrilldown = projectRiskDrilldownQuery.data;
  const riskProjectsMargin = useMemo(
    () => riskProjectsMarginQuery.data?.items || [],
    [riskProjectsMarginQuery.data?.items],
  );
  const installersKpiItems = useMemo(
    () => installersKpiQuery.data?.items || [],
    [installersKpiQuery.data?.items],
  );
  const scopedInstallerMissing = Boolean(
    scopedInstallerId && installerDetailsId === scopedInstallerId && installerDetailsQuery.isError,
  );
  const installerDetails = installerDetailsQuery.data;
  const installerDetailOptions = useMemo(() => {
    const options = new Map<string, string>();
    for (const item of installersKpiItems) options.set(item.installer_id, item.installer_name);
    for (const item of installerDirectoryQuery.data ?? []) options.set(item.installer_id, item.installer_name);
    if (installerDetails) options.set(installerDetails.installer_id, installerDetails.installer_name);
    return Array.from(options, ([installer_id, installer_name]) => ({ installer_id, installer_name }));
  }, [installersKpiItems, installerDirectoryQuery.data, installerDetails]);
  const topFailingProjects = operationsCenter?.top_failing_projects || [];
  const failedItems = failedOutboxQuery.data?.items || [];
  const auditSummary = auditCatalogsQuery.data?.summary;
  const auditCanPrev = auditOffset > 0;
  const auditCanNext =
    auditOffset + AUDIT_PREVIEW_LIMIT < (auditSummary?.total || 0);
  const issueAuditSummary = issueAuditQuery.data?.summary;
  const issueAuditCanPrev = issueAuditOffset > 0;
  const issueAuditCanNext =
    issueAuditOffset + AUDIT_PREVIEW_LIMIT < (issueAuditSummary?.total || 0);
  const installersKpiCanPrev = installersKpiOffset > 0;
  const installersKpiCanNext = installersKpiQuery.data?.total !== undefined
    ? installersKpiOffset + installersKpiItems.length < installersKpiQuery.data.total
    : installersKpiItems.length >= KPI_PAGE_SIZE;
  const orderNumbersKpiCanPrev = orderNumbersKpiOffset > 0;
  const orderNumbersKpiCanNext =
    orderNumbersKpiOffset + KPI_PAGE_SIZE <
    (orderNumbersKpiQuery.data?.total || 0);
  const focusedFailingProjectIds = topFailingProjects.map(
    (item) => item.project_id,
  );
  const focusedFailedProjectsHref =
    focusedFailingProjectIds.length > 0
      ? `/projects?failed_project_ids=${encodeURIComponent(
          focusedFailingProjectIds.join(","),
        )}&only_failed_runs=1`
      : "/projects?only_failed_runs=1";
  const focusFollowupActions =
    activeFocus === "operations"
      ? [
          {
            label: t("reports.openActionableOps"),
            href: "/operations?actionable=1",
          },
          {
            label: t("reports.openFailedProjects"),
            href: focusedFailedProjectsHref,
          },
        ]
      : activeFocus === "delivery"
        ? [
            {
              label: t("reports.openActionableOps"),
              href: buildOperationsHref({
                actionable: true,
                deliveryChannel: scopedDeliveryChannel || undefined,
                webhookProvider: scopedWebhookProvider || undefined,
              }),
            },
            { label: t("reports.openJournalQueue"), href: "/journal" },
          ]
        : activeFocus === "issues"
          ? [
              {
                label: t("reports.openActionableOps"),
                href: "/operations?actionable=1",
              },
              { label: t("reports.openIssuesBoard"), href: "/issues" },
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
    ? t("reports.scopedProject").replace("{id}", scopedProjectId)
    : scopedOutboxId
      ? t("reports.scopedOutbox").replace("{id}", scopedOutboxId)
      : scopedDeliveryChannel
        ? t("reports.scopedDeliveryChannel").replace(
            "{id}",
            scopedDeliveryChannel,
          )
        : scopedWebhookProvider
          ? t("reports.scopedWebhookProvider").replace(
              "{id}",
              scopedWebhookProvider,
            )
          : scopedInstallerId
            ? t("reports.scopedInstaller").replace("{id}", scopedInstallerId)
            : null;
  const hasScopedContextOnly =
    !activeFocus &&
    Boolean(
      (scopedProjectId && !scopedProjectMissing) ||
        (scopedInstallerId && !scopedInstallerMissing),
    );
  const scopedContextLabel = scopedProjectId
    ? copy("Focused project", "Выбранный проект", "הפרויקט שנבחר")
    : scopedInstallerId
      ? copy("Focused installer", "Фокус по монтажнику", "מיקוד מתקין")
      : "";
  const scopedContextValue = scopedProjectId || scopedInstallerId || "";
  const reportsJumpLinks = [
    {
      label: copy(
        "Open Operations SLA",
        "Открыть SLA операций",
        "פתח SLA תפעולי",
      ),
      target: "reports-operations-sla",
    },
    {
      label: copy(
        "Open Plan vs Fact",
        "Открыть план / факт",
        "פתח תכנון מול ביצוע",
      ),
      target: "reports-project-plan-fact",
    },
    {
      label: copy(
        "Open Project Risk",
        "Открыть риск проекта",
        "פתח סיכון פרויקט",
      ),
      target: "reports-project-risk-drilldown",
    },
    {
      label: copy(
        "Open Installers KPI",
        "Открыть KPI монтажников",
        "פתח KPI מתקינים",
      ),
      target: "reports-installers-kpi",
    },
  ];

  const refetchAllReports = () => {
    const refreshes: Array<Promise<unknown>> = [
      alertsQuery.refetch(),
      deliveryQuery.refetch(),
      outboxSummaryQuery.refetch(),
      operationsCenterQuery.refetch(),
      operationsSlaQuery.refetch(),
      operationsSlaHistoryQuery.refetch(),
      issuesAnalyticsQuery.refetch(),
      projectsQuery.refetch(),
      failedOutboxQuery.refetch(),
      auditCatalogsQuery.refetch(),
      issueAuditQuery.refetch(),
    ];

    if (canExportFinancialReports) {
      refreshes.push(
        issuesAddonsImpactQuery.refetch(),
        riskConcentrationQuery.refetch(),
        installerProfitabilityMatrixQuery.refetch(),
        installerProjectProfitabilityQuery.refetch(),
        projectPlanFactQuery.refetch(),
        projectAddonPlanQuery.refetch(),
        projectUrgencySurchargesQuery.refetch(),
        projectRiskDrilldownQuery.refetch(),
        topProjectsMarginQuery.refetch(),
        riskProjectsMarginQuery.refetch(),
        installersKpiQuery.refetch(),
        installerDirectoryQuery.refetch(),
        ...(installerDetailsId ? [installerDetailsQuery.refetch()] : []),
        orderNumbersKpiQuery.refetch(),
      );
    }

    void Promise.all(refreshes);
  };

  const scrollToReportsSection = (targetId: string) => {
    if (typeof window === "undefined") {
      return;
    }
    const element = document.getElementById(targetId);
    if (!element) {
      return;
    }
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    if (scopedProjectId) {
      if (!projectsQuery.isFetched && projectOptions.length === 0) {
        return;
      }
      if (!scopedProjectInOptions) {
        if (projectPlanFactProjectId) {
          setProjectPlanFactProjectId("");
        }
        return;
      }
      if (projectPlanFactProjectId !== scopedProjectId) {
        setProjectPlanFactProjectId(scopedProjectId);
      }
      return;
    }
    if (projectOptions.length === 0) {
      if (projectPlanFactProjectId) {
        setProjectPlanFactProjectId("");
      }
      return;
    }
    const exists = projectOptions.some(
      (project) => project.id === projectPlanFactProjectId,
    );
    if (!exists) {
      setProjectPlanFactProjectId(projectOptions[0].id);
    }
  }, [
    projectOptions,
    projectPlanFactProjectId,
    projectsQuery.isFetched,
    scopedProjectId,
    scopedProjectInOptions,
  ]);

  useEffect(() => {
    if (scopedProjectId) {
      if (!projectsQuery.isFetched && projectOptions.length === 0) {
        return;
      }
      if (!scopedProjectInOptions) {
        if (projectRiskProjectId) {
          setProjectRiskProjectId("");
        }
        return;
      }
      if (projectRiskProjectId !== scopedProjectId) {
        setProjectRiskProjectId(scopedProjectId);
      }
      return;
    }
    const preferredId =
      riskProjectsMargin[0]?.project_id || projectOptions[0]?.id || "";
    if (!preferredId) {
      if (projectRiskProjectId) {
        setProjectRiskProjectId("");
      }
      return;
    }
    const exists =
      projectOptions.some((project) => project.id === projectRiskProjectId) ||
      riskProjectsMargin.some(
        (project) => project.project_id === projectRiskProjectId,
      );
    if (!exists) {
      setProjectRiskProjectId(preferredId);
    }
  }, [
    projectOptions,
    projectRiskProjectId,
    projectsQuery.isFetched,
    riskProjectsMargin,
    scopedProjectId,
    scopedProjectInOptions,
  ]);

  useEffect(() => {
    if (scopedInstallerId) {
      setInstallerDetailsId(scopedInstallerId);
    }
  }, [scopedInstallerId]);

  useEffect(() => {
    if (!scopedInstallerId && !installerDetailsId && installerDetailOptions.length) {
      setInstallerDetailsId(installerDetailOptions[0].installer_id);
    }
  }, [
    installerDetailOptions,
    installerDetailsId,
    scopedInstallerId,
  ]);

  const exportErrorMessage =
    (exportAuditMutation.isError &&
      readError(
        exportAuditMutation.error,
        t("reports.catalogAuditExportFailed"),
      )) ||
    (exportIssueAuditMutation.isError &&
      readError(
        exportIssueAuditMutation.error,
        t("reports.issueAuditExportFailed"),
      )) ||
    (exportInstallersKpiMutation.isError &&
      readError(
        exportInstallersKpiMutation.error,
        t("reports.installersKpiExportFailed"),
      )) ||
    (exportOrderNumbersKpiMutation.isError &&
      readError(
        exportOrderNumbersKpiMutation.error,
        t("reports.orderNumbersKpiExportFailed"),
      )) ||
    (exportExecutiveMutation.isError &&
      readError(
        exportExecutiveMutation.error,
        t("reports.executiveExportFailed"),
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
    if (!actionNotice) {
      return undefined;
    }
    const timer = window.setTimeout(() => setActionNotice(null), 2500);
    return () => window.clearTimeout(timer);
  }, [actionNotice]);

  useEffect(() => {
    if (!activeFocus) {
      return undefined;
    }
    const timer = window.setTimeout(() => {
      const target = focusTargetId
        ? document.getElementById(focusTargetId)
        : null;
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
    const preset = reportsOpsPresetCopy[activeOpsPreset];
    appliedOpsPresetRef.current = activeOpsPreset;
    setSlaHistoryDays(preset.slaHistoryDays);
  }, [activeOpsPreset, reportsOpsPresetCopy]);

  useEffect(() => {
    if (!scopedProjectId) {
      appliedProjectScopeRef.current = null;
      return;
    }
    if (
      (!projectsQuery.isFetched && projectOptions.length === 0) ||
      appliedProjectScopeRef.current === scopedProjectId
    ) {
      return;
    }
    if (!scopedProjectInOptions) {
      appliedProjectScopeRef.current = null;
      if (orderNumbersProjectId) {
        setOrderNumbersProjectId("");
      }
      return;
    }
    appliedProjectScopeRef.current = scopedProjectId;
    setProjectPlanFactProjectId(scopedProjectId);
    setProjectRiskProjectId(scopedProjectId);
    setOrderNumbersProjectId(scopedProjectId);
    setOrderNumbersKpiOffset(0);
  }, [
    orderNumbersProjectId,
    projectOptions,
    projectsQuery.isFetched,
    scopedProjectId,
    scopedProjectInOptions,
  ]);

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
    setPresetNotice(t("reports.presetLoaded").replace("{name}", preset.name));
  }

  function handleSavePreset(): void {
    const normalizedName = presetName.trim();
    if (!normalizedName) {
      setPresetNotice(t("reports.presetNameRequired"));
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
    setPresetNotice(t("reports.presetSaved").replace("{name}", preset.name));
  }

  function handleApplySelectedPreset(): void {
    const preset = savedPresets.find((item) => item.id === selectedPresetId);
    if (!preset) {
      setPresetNotice(t("reports.selectPresetFirst"));
      return;
    }
    applyPreset(preset);
  }

  function handleDeleteSelectedPreset(): void {
    if (!selectedPresetId) {
      setPresetNotice(t("reports.selectPresetFirst"));
      return;
    }
    const next = savedPresets.filter((item) => item.id !== selectedPresetId);
    writeReportsPresets(next);
    setSavedPresets(next);
    setSelectedPresetId("");
    setPresetNotice(t("reports.presetDeleted"));
  }

  const scrollToReport = (id: string) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };
  const reportsLastRefresh =
    operationsCenter?.generated_at ||
    issuesAnalytics?.generated_at ||
    issuesAddonsImpact?.generated_at ||
    riskConcentration?.generated_at ||
    null;
  const exposureProfit = issuesAddonsImpactQuery.isError ? null : issuesAddonsImpact?.summary?.exposure_profit_total;
  const marginLeakageValue = exposureProfit == null ? null : toReportNumber(exposureProfit);
  const installerDoorTotal = installersKpiItems.reduce(
    (sum, item) => sum + item.installed_doors,
    0,
  );
  const installerMissingRates = installersKpiItems.reduce(
    (sum, item) => sum + item.missing_rates_installed_doors,
    0,
  );
  const topInstaller = installersKpiItems[0]?.installer_name || "n/a";
  const reportsInsights: ReportsInsight[] = [
    {
      eyebrow: copy("Door financial exposure", "Финансовый риск по дверям", "חשיפה כספית לפי דלתות"),
      title: copy("Open issues and delayed doors", "Открытые проблемы и задержки монтажа", "תקלות פתוחות ודלתות מעוכבות"),
      value: canExportFinancialReports
        ? `${formatAmount(marginLeakageValue)} ${COMPANY_CURRENCY}`
        : copy("Restricted", "Нет доступа", "אין הרשאה"),
      delta: canExportFinancialReports
        ? `${copy("Unique doors", "Уникальные двери", "דלתות ייחודיות")}: ${formatCount(issuesAddonsImpact?.summary?.exposure_doors)}`
        : copy("Finance access required", "Нужен доступ к финансам", "נדרשת הרשאה לכספים"),
      detail: copy("Forecast only; each door is counted once.", "Оценка риска: каждая дверь учтена один раз.", "הערכת סיכון בלבד; כל דלת נספרת פעם אחת."),
      cta: copy("Review risks and add-ons", "Открыть риски и допработы", "לסיכונים ותוספות"),
      onClick: () => scrollToReport("reports-issues-addons-impact"),
      tone: marginLeakageValue == null ? "orange" : marginLeakageValue !== 0 ? "red" : "green",
      variant: marginLeakageValue == null ? "bars" : marginLeakageValue !== 0 ? "line-down" : "line-up",
    },
    {
      eyebrow: "Risk concentration watch",
      title: "Backlog and profit risk by project",
      value: canExportFinancialReports
        ? `${formatCount(riskConcentration?.summary?.risky_projects)} projects`
        : "Restricted",
      delta: canExportFinancialReports
        ? `${formatAmount(
            riskConcentration?.summary?.open_issue_profit_at_risk,
          )} ${COMPANY_CURRENCY} at risk`
        : "finance access required",
      detail:
        canExportFinancialReports && riskConcentration?.projects?.[0]
          ? `Worst project: ${riskConcentration.projects[0].project_name}.`
          : "Concentrates project, order and installer risk in one view.",
      cta: "Open risk block",
      onClick: () => scrollToReport("reports-project-risk-drilldown"),
      tone:
        (riskConcentration?.summary?.risky_projects ?? 0) > 0
          ? "orange"
          : "green",
      variant: "bars",
    },
    {
      eyebrow: "Installer KPI trend",
      title: "Team delivery and rate coverage",
      value: formatCount(installerDoorTotal),
      delta: `${formatCount(installerMissingRates)} installed doors missing rates`,
      detail: `Top installer in current sort: ${topInstaller}.`,
      cta: "Open installer KPI",
      onClick: () => scrollToReport("reports-installers-kpi"),
      tone: installerMissingRates > 0 ? "orange" : "green",
      variant: "line-up",
    },
  ];
  const reportsLibraryGroups: ReportsLibraryGroup[] = [
    {
      title: "Financial control",
      subtitle: "revenue, payroll, margin",
      count: 6,
      icon: ReceiptText,
      tone: "green",
      rows: [
        {
          icon: "PF",
          title: "Project commercial plan/fact",
          subtitle: "planned vs actual revenue and payroll",
          badge: "live",
          meta: "5m",
          onClick: () => scrollToReport("reports-project-plan-fact"),
        },
        {
          icon: "PL",
          title: "Payroll and earnings ledger",
          subtitle: "installer payouts and project filters",
          badge: "pinned",
          meta: "5m",
          onClick: () => router.push("/earnings-ledger"),
        },
        {
          icon: "ML",
          title: "Leakage and add-on impact",
          subtitle: "missing plans, urgency uplift, delayed profit",
          badge: "new",
          meta: "30m",
          onClick: () => scrollToReport("reports-issues-addons-impact"),
        },
      ],
    },
    {
      title: "Operational control",
      subtitle: "imports, outbox, SLA, issues",
      count: 7,
      icon: Wrench,
      tone: "orange",
      rows: [
        {
          icon: "OC",
          title: "Operations command snapshot",
          subtitle: "failed imports, delivery risk, unread alerts",
          badge: "live",
          meta: "live",
          onClick: () => scrollToReport("reports-operations-center"),
        },
        {
          icon: "SLA",
          title: "SLA and playbook health",
          subtitle: "recovery metrics and action playbooks",
          meta: "30m",
          onClick: () => scrollToReport("reports-operations-sla"),
        },
        {
          icon: "DL",
          title: "Delivery and outbox failures",
          subtitle: "failed communication, retry trail, webhook scope",
          meta: "live",
          onClick: () => scrollToReport("reports-delivery-risk"),
        },
      ],
    },
    {
      title: "Installers",
      subtitle: "performance, workload, cross-view",
      count: 6,
      icon: Users,
      tone: "blue",
      rows: [
        {
          icon: "KPI",
          title: "Installer scorecard",
          subtitle: "doors, earnings, missing rates, issues",
          badge: "live",
          meta: "5m",
          onClick: () => scrollToReport("reports-installers-kpi"),
        },
        {
          icon: "XP",
          title: "Installer/project profitability",
          subtitle: "who worked where and margin by combination",
          meta: "1h",
          onClick: () => scrollToReport("reports-installer-cross-view"),
        },
        {
          icon: "ON",
          title: "Order number progress",
          subtitle: "door completion and profit by order number",
          meta: "30m",
          onClick: () => scrollToReport("reports-order-numbers-kpi"),
        },
      ],
    },
    {
      title: "System and audit",
      subtitle: "audit, integrations, sync",
      count: 4,
      icon: ShieldAlert,
      tone: "neutral",
      rows: [
        {
          icon: "AU",
          title: "Catalog audit export",
          subtitle: "catalog, sync-state and admin changes",
          meta: "5m",
          onClick: () => scrollToReport("reports-audit-catalogs"),
        },
        {
          icon: "IS",
          title: "Issue audit timeline",
          subtitle: "problem lifecycle and operator activity",
          meta: "5m",
          onClick: () => scrollToReport("reports-issue-audit"),
        },
        {
          icon: "WH",
          title: "Webhook and delivery trail",
          subtitle: "provider events and retry audit",
          badge: "live",
          meta: "live",
          onClick: () => scrollToReport("reports-delivery-scope"),
        },
      ],
    },
  ];
  const reportsLibraryCount = reportsLibraryGroups.reduce(
    (sum, group) => sum + group.count,
    0,
  );
  const pinnedSavedViews = savedPresets.slice(0, 4);

  return (
    <DashboardLayout>
      <div className="page-shell page-stack-tight motion-stagger">
        <section data-testid="reports-dashboard-v3" className="space-y-5">
          <div className="space-y-5">
            <DimaxPageHeader
              breadcrumbs={[
                { label: copy("Dashboard", "Главная", "ראשי"), href: "/" },
                { label: copy("Reports cockpit", "Панель отчётов", "לוח דוחות") },
              ]}
              title={copy("Reports cockpit", "Панель отчётов", "לוח דוחות")}
              status={
                <span className="inline-flex items-center rounded-full border border-status-warning-border bg-status-warning-bg px-2.5 py-1 text-11 font-medium text-status-warning-fg">
                  {copy("Unread", "Непрочитано", "לא נקראו")} {unreadBadge}
                </span>
              }
              meta={
                <span>
                  <b className="font-medium text-text">
                    {reportsLibraryCount}
                  </b>{" "}
                  {copy("report signals ·", "сигналы отчета ·", "אותות דיווח ·")}{" "}
                  <b className="font-medium text-text">
                    {savedPresets.length}
                  </b>{" "}
                  {copy("saved views · scheduled exports are manual in this build · last refresh", "сохраненные просмотры · запланированный экспорт в этой сборке выполняется вручную · последнее обновление", "תצוגות שמורות · יצוא מתוכנן הוא ידני בגירסה זו · רענון אחרון")}{" "}
                  <b className="font-medium text-text">
                    {reportsLastRefresh
                      ? formatDateTime(reportsLastRefresh)
                      : copy("not loaded", "не загружено", "לא נטען")}
                  </b>
                </span>
              }
              actions={
                <>
                <button
                  type="button"
                  onClick={refetchAllReports}
                  className="dmx-secondary-action"
                >
                  <RefreshCw className="h-4 w-4" strokeWidth={1.8} />
                  {t("common.refresh")}
                </button>
                <button
                  type="button"
                  onClick={() => exportExecutiveMutation.mutate()}
                  disabled={
                    !canExportFinancialReports ||
                    exportExecutiveMutation.isPending
                  }
                  title={privilegedActionHint}
                  className="dmx-secondary-action disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <FileText className="h-4 w-4" strokeWidth={1.8} />
                  {copy("Export snapshot", "Экспортировать снимок", "ייצא תמונת מצב")}
                </button>
                {canOpenOperations ? (
                  <button
                    type="button"
                    onClick={() => router.push("/operations")}
                    className="dmx-primary-action"
                  >
                    <Wrench className="h-4 w-4" strokeWidth={1.8} />
                    {copy("Open operations", "Открыть операции", "פתיחת פעולות")}
                  </button>
                ) : null}
                </>
              }
            />

            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <LineChart className="h-4 w-4 text-text-secondary" />
                  <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-secondary">
                    {copy("Attention this week", "Внимание на этой неделе", "שימו לב השבוע")}
                  </div>
                  <div className="rounded-full bg-surface px-2 py-0.5 text-[10.5px] text-text-secondary">
                    {copy("live reports", "прямые репортажи", "דיווחים חיים")}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => router.push("/operations?actionable=1")}
                  className="text-[11.5px] font-medium text-link"
                >
                  {copy("Open action queue", "Открыть очередь действий", "פתיחת תור פעולות")}
                </button>
              </div>
              <div className="grid gap-3 xl:grid-cols-3">
                {reportsInsights.map((insight) => (
                  <ReportsInsightCard key={insight.eyebrow} insight={insight} />
                ))}
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <FolderKanban className="h-4 w-4 text-text-secondary" />
                  <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-secondary">
                    {copy("Report library", "Библиотека отчетов", "ספריית דוחות")}
                  </div>
                  <div className="rounded-full bg-surface px-2 py-0.5 text-[10.5px] text-text-secondary">
                    {reportsLibraryCount} {copy("mapped", "сопоставлено", "ממופה")}
                  </div>
                </div>
                <div className="text-[11.5px] font-medium text-text-secondary">
                  {copy("API-first, no fake reports", "API-прежде всего, никаких поддельных отчетов", "תחילה API, ללא דוחות מזויפים")}
                </div>
              </div>
              <div className="grid gap-3 xl:grid-cols-2">
                {reportsLibraryGroups.map((group) => (
                  <ReportsLibraryCard key={group.title} group={group} locale={locale} />
                ))}
              </div>
            </div>

            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.95fr)]">
              <div className="rounded-[12px] border border-border bg-surface p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-secondary">
                      {copy("Saved views", "Сохраненные просмотры", "תצוגות שמורות")}
                    </div>
                    <div className="mt-1 text-[12px] text-text-secondary">
                      {copy("Operator filters stored locally for this browser.", "Фильтры операторов, хранящиеся локально для этого браузера.", "מסנני מפעיל המאוחסנים באופן מקומי עבור דפדפן זה.")}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setPresetNotice(
                        copy(
                          "Name the current filter in the controls below, then save it.",
                          "Назови текущий фильтр в панели ниже и сохрани его.",
                          "תן שם למסנן הנוכחי באזור הבקרה למטה ושמור אותו.",
                        ),
                      )
                    }
                    className="dmx-secondary-action"
                  >
                    <Plus className="h-4 w-4" strokeWidth={1.8} />
                    {copy("Save current filter", "Сохранить текущий фильтр", "שמור את המסנן הנוכחי")}
                  </button>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {pinnedSavedViews.length === 0 ? (
                    <div className="rounded-[10px] border border-dashed border-border bg-surface-subtle px-4 py-5 text-[12px] leading-5 text-text-secondary md:col-span-2">
                      {copy("No saved report views yet. Save the current filters below to pin an operator view.", "Пока нет сохраненных просмотров отчетов. Сохраните текущие фильтры ниже, чтобы закрепить представление оператора.", "אין עדיין תצוגות דוח שמורות. שמור את המסננים הנוכחיים למטה כדי להצמיד תצוגת מפעיל.")}
                    </div>
                  ) : (
                    pinnedSavedViews.map((preset) => (
                      <SavedReportViewCard
                        key={preset.id}
                        eyebrow={copy("saved view", "сохранённый вид", "תצוגה שמורה")}
                        title={preset.name}
                        value={formatDateTime(preset.created_at)}
                        tone="blue"
                      />
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-[12px] border border-border bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-secondary">
                      {copy("Scheduled exports", "Экспорт по расписанию", "ייצוא מתוכנן")}
                    </div>
                    <div className="mt-1 text-[12px] leading-5 text-text-secondary">
                      {copy("Scheduler backend is not configured here. Use manual CSV exports until a real schedule service is added.", "Серверная часть планировщика здесь не настроена. Используйте экспорт CSV вручную, пока не будет добавлена ​​реальная служба расписания.", "הקצה האחורי של המתזמן אינו מוגדר כאן. השתמש בייצוא CSV ידני עד להוספת שירות לוח זמנים אמיתי.")}
                    </div>
                  </div>
                  <CalendarClock className="h-5 w-5 shrink-0 text-text-tertiary" />
                </div>
                <div className="mt-4 grid gap-2">
                  <button
                    type="button"
                    onClick={() => exportExecutiveMutation.mutate()}
                    disabled={
                      !canExportFinancialReports ||
                      exportExecutiveMutation.isPending
                    }
                    title={privilegedActionHint}
                    className="dmx-secondary-action justify-center disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {copy("Executive CSV now", "Исполнительный CSV сейчас", "מנהל CSV עכשיו")}
                  </button>
                  <button
                    type="button"
                    onClick={() => exportInstallersKpiMutation.mutate()}
                    disabled={
                      !canExportFinancialReports ||
                      exportInstallersKpiMutation.isPending
                    }
                    title={ratesScopeHint}
                    className="dmx-secondary-action justify-center disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {copy("Installers CSV now", "CSV-файл для установки прямо сейчас", "מתקינים CSV עכשיו")}
                  </button>
                  <button
                    type="button"
                    onClick={() => exportOrderNumbersKpiMutation.mutate()}
                    disabled={
                      !canExportFinancialReports ||
                      exportOrderNumbersKpiMutation.isPending
                    }
                    title={ratesScopeHint}
                    className="dmx-secondary-action justify-center disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {copy("Orders CSV now", "Заказывает CSV сейчас", "הזמנות CSV עכשיו")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="toolbar-panel grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
          <div className="flex min-w-0 flex-wrap items-center gap-2 text-[12px] text-text-secondary">
            <BellRing className="h-4 w-4 text-text-secondary" />
            <span>{t("reports.helper")}</span>
            <span>{copy("Unread:", "Непрочитано:", "לא נקראו:")}</span>
            <span className="rounded-full border border-status-warning-border bg-status-warning-bg px-2.5 py-1 text-[11px] font-medium text-status-warning-fg">
              {copy("Alert queue", "Очередь алертов", "תור ההתראות")}{" "}
              {unreadBadge}
            </span>
            <button
              type="button"
              onClick={() => markReadMutation.mutate()}
              disabled={
                !canRunPrivilegedActions ||
                markReadMutation.isPending ||
                unreadCount === 0
              }
              title={ratesScopeHint}
              className="dmx-secondary-action disabled:cursor-not-allowed disabled:opacity-60"
            >
              <CheckCheck className="h-4 w-4" strokeWidth={1.8} />
              {t("reports.markAllRead")}
            </button>
          </div>
          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_auto_auto]">
            <input
              aria-label={t("reports.presetName")}
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder={t("reports.savePreset")}
              className="control-input h-8 text-[12px]"
            />
            <button
              type="button"
              onClick={handleSavePreset}
              className="dmx-secondary-action"
            >
              {t("reports.savePreset")}
            </button>
            <select
              aria-label={copy("Saved Presets", "Сохранённые наборы", "ערכות שמורות")}
              value={selectedPresetId}
              onChange={(e) => setSelectedPresetId(e.target.value)}
              className="control-input h-8 text-[12px]"
            >
              <option value="">{t("reports.savedPresets")}</option>
              {savedPresets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleApplySelectedPreset}
              className="dmx-secondary-action"
            >
              {t("reports.applyPreset")}
            </button>
            <button
              type="button"
              onClick={handleDeleteSelectedPreset}
              className="dmx-secondary-action"
            >
              {t("reports.deletePreset")}
            </button>
            <button
              type="button"
              onClick={() => exportExecutiveMutation.mutate()}
              disabled={
                !canExportFinancialReports || exportExecutiveMutation.isPending
              }
              title={privilegedActionHint}
              aria-label={t("reports.exportExecutiveCsv")}
              className="dmx-secondary-action disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t("reports.exportExecutiveCsv")}
            </button>
          </div>
        </section>

        {alertsQuery.isError && (
          <InlineNotice tone="error">
            {readError(alertsQuery.error, t("reports.failedAlerts"))}
          </InlineNotice>
        )}
        {exportErrorMessage && <InlineNotice tone="error">{exportErrorMessage}</InlineNotice>}
        {actionNotice && <InlineNotice tone="success">{actionNotice}</InlineNotice>}
        {presetNotice && (
          <div className={reportsNoticeClass("muted")}>{presetNotice}</div>
        )}
        {scopedProjectMissing && (
          <InlineNotice
            tone="warning"
            action={
              <button
                type="button"
                onClick={() => router.push("/reports")}
                className="dmx-secondary-action shrink-0"
              >
                {copy("Show full report", "Показать полный отчёт", "הצג דוח מלא")}
              </button>
            }
          >
            {copy(
              `Requested project ${scopedProjectId} is not available in the current reports scope. Project-specific reports were not switched to another project.`,
              `Объект ${scopedProjectId} недоступен в текущем контексте отчётов. Объектные отчёты не были переключены на другой проект.`,
              `הפרויקט ${scopedProjectId} אינו זמין בהקשר הדוחות הנוכחי. הדוחות לפי פרויקט לא הועברו לפרויקט אחר.`,
            )}
          </InlineNotice>
        )}
        {scopedInstallerMissing && (
          <InlineNotice
            tone="warning"
            action={
              <button
                type="button"
                onClick={() => router.push("/reports")}
                className="dmx-secondary-action shrink-0"
              >
                {copy("Show full report", "Показать полный отчёт", "הצג דוח מלא")}
              </button>
            }
          >
            {copy(
              `Requested installer ${scopedInstallerId} is not available in the current reports scope. Installer-specific reports were not switched to another installer.`,
              `Монтажник ${scopedInstallerId} недоступен в текущем контексте отчётов. Отчёты по монтажнику не были переключены на другого монтажника.`,
              `המתקין ${scopedInstallerId} אינו זמין בהקשר הדוחות הנוכחי. הדוחות לפי מתקין לא הועברו למתקין אחר.`,
            )}
          </InlineNotice>
        )}
        {hasScopedContextOnly && (
          <div className={reportsNoticeClass("accent")}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-medium text-text">
                  {scopedContextLabel} {scopedContextValue}
                </div>
                <div className="mt-1 text-text-secondary">
                  {copy(
                    "This report is narrowed to one linked context. You can return to the full report at any time.",
                    "Этот отчёт открыт в контексте одной связанной сущности. В любой момент можно вернуться к полному обзору.",
                    "הדוח פתוח בהקשר ממוקד של ישות אחת. אפשר לחזור בכל רגע לתצוגה המלאה.",
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => router.push("/reports")}
                className="dmx-secondary-action"
              >
                {copy(
                  "Show full report",
                  "Показать полный отчёт",
                  "הצג דוח מלא",
                )}
              </button>
            </div>
          </div>
        )}
        {activeFocus && (
          <div className={reportsNoticeClass("accent")}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-medium text-text">
                  {reportsFocusCopy[activeFocus].title}
                </div>
                <div className="mt-1 text-text-secondary">
                  {reportsFocusCopy[activeFocus].description}
                </div>
                {activeOpsPreset && (
                  <div className="mt-2 text-[12px] text-text-secondary">
                    {reportsOpsPresetCopy[activeOpsPreset].title}.{" "}
                    {reportsOpsPresetCopy[activeOpsPreset].description}
                  </div>
                )}
                {scopeSummary && (
                  <div className="mt-2 text-[12px] text-text-secondary">
                    {scopeSummary}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {focusFollowupActions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={() => router.push(action.href)}
                    className="dmx-secondary-action"
                  >
                    {action.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => router.push("/reports")}
                  className="dmx-secondary-action"
                >
                  {t("reports.clearFocus")}
                </button>
              </div>
            </div>
          </div>
        )}
        {!canRunPrivilegedActions && (
          <InlineNotice tone="warning">{t("reports.readOnlyNotice")}</InlineNotice>
        )}
        {!canExportFinancialReports && (
          <div className="rounded-lg border border-border bg-surface-subtle px-4 py-3 text-[13px] text-text-secondary flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0 text-status-warning-fg" />
            <span>
              <span className="font-medium text-text">
                {financialReportsRestrictedTitle}
              </span>{" "}
              {financialReportsRestrictedDetail}
            </span>
          </div>
        )}

        <OperationsCenterSection
          center={operationsCenter}
          loading={operationsCenterQuery.isLoading}
          unreadCount={unreadCount}
        />

        <OperationsSlaSection
          query={operationsSlaQuery}
          historyQuery={operationsSlaHistoryQuery}
          historyDays={slaHistoryDays}
          onHistoryDaysChange={setSlaHistoryDays}
        />

        <IssuesAnalyticsSection
          query={issuesAnalyticsQuery}
        />

        <IssuesAddonsImpactSection
          query={issuesAddonsImpactQuery}
        />

        <ProjectPlanFactSection
          planFactQuery={projectPlanFactQuery}
          addonPlanQuery={projectAddonPlanQuery}
          urgencySurchargesQuery={projectUrgencySurchargesQuery}
          projectsQuery={projectsQuery}
          projectId={projectPlanFactProjectId}
          onProjectIdChange={setProjectPlanFactProjectId}
        />

        <ProjectRiskDrilldownSection
          query={projectRiskDrilldownQuery}
          projectsQuery={projectsQuery}
          projectId={projectRiskProjectId}
          onProjectIdChange={setProjectRiskProjectId}
        />

        <ProjectMarginExecutiveSection
          topQuery={topProjectsMarginQuery}
          riskQuery={riskProjectsMarginQuery}
        />

        <InstallerProfitabilityMatrixSection
          query={riskConcentrationQuery}
        />

        <InstallerCrossViewSection
          query={installerProfitabilityMatrixQuery}
          sortBy={installerMatrixSortBy}
          sortDir={installerMatrixSortDir}
          onSortByChange={setInstallerMatrixSortBy}
          onSortDirChange={setInstallerMatrixSortDir}
        />

        <InstallersKpiSection
          query={installerProjectProfitabilityQuery}
          sortBy={installerProjectSortBy}
          sortDir={installerProjectSortDir}
          onSortByChange={setInstallerProjectSortBy}
          onSortDirChange={setInstallerProjectSortDir}
        />

        <InstallersKpiTableSection
          query={installersKpiQuery}
          items={installersKpiItems}
          sortBy={installersSortBy}
          sortDir={installersSortDir}
          onSortByChange={setInstallersSortBy}
          onSortDirChange={setInstallersSortDir}
          onOffsetChange={setInstallersKpiOffset}
          canPrev={installersKpiCanPrev}
          canNext={installersKpiCanNext}
          exportMutation={exportInstallersKpiMutation}
          canExportFinancialReports={canExportFinancialReports}
          ratesScopeHint={ratesScopeHint}
        />

        <InstallerDetailsSection
          query={installerDetailsQuery}
          directoryQuery={installerDirectoryQuery}
          options={installerDetailOptions}
          installerId={installerDetailsId}
          onInstallerIdChange={setInstallerDetailsId}
          scopedInstallerMissing={scopedInstallerMissing}
        />

        <OrderNumbersSection
          kpiQuery={orderNumbersKpiQuery}
          projectsQuery={projectsQuery}
          searchText={orderNumbersQuery}
          onSearchTextChange={setOrderNumbersQuery}
          projectId={orderNumbersProjectId}
          onProjectIdChange={setOrderNumbersProjectId}
          sortBy={orderNumbersSortBy}
          sortDir={orderNumbersSortDir}
          onSortByChange={setOrderNumbersSortBy}
          onSortDirChange={setOrderNumbersSortDir}
          onOffsetChange={setOrderNumbersKpiOffset}
          canPrev={orderNumbersKpiCanPrev}
          canNext={orderNumbersKpiCanNext}
          exportMutation={exportOrderNumbersKpiMutation}
          canExportFinancialReports={canExportFinancialReports}
          ratesScopeHint={ratesScopeHint}
        />

        <DeliveryRiskSection
          deliveryQuery={deliveryQuery}
          outboxSummaryQuery={outboxSummaryQuery}
          failedItems={failedItems}
          webhookSignalsQuery={webhookSignalsQuery}
          retryAuditsQuery={retryAuditsQuery}
          auditCatalogsQuery={auditCatalogsQuery}
          issueAuditQuery={issueAuditQuery}
          activeOpsPreset={activeOpsPreset}
          scopedOutboxId={scopedOutboxId}
          scopedDeliveryChannel={scopedDeliveryChannel}
          scopedWebhookProvider={scopedWebhookProvider}
        />

        <FailedOutboxSection
          query={failedOutboxQuery}
          retryMutation={retryMutation}
          canRunPrivilegedActions={canRunPrivilegedActions}
          privilegedActionHint={privilegedActionHint}
          scopedDeliveryChannel={scopedDeliveryChannel}
        />

        <div className={reportsPanelClass("overflow-hidden")}>
          <div className="hidden md:grid grid-cols-[180px_130px_130px_130px_1fr] gap-3 px-4 py-3 border-b border-border bg-surface-subtle text-[11px] uppercase text-text-secondary">
            <span>{copy("Time", "Время", "זמן")}</span>
            <span>{copy("Level", "Уровень", "רמה")}</span>
            <span>{copy("Metric", "Метрика", "מדד")}</span>
            <span>{copy("Usage", "Использование", "שימוש")}</span>
            <span>{copy("Action", "Действие", "פעולה")}</span>
          </div>

          {alertsQuery.isLoading && (
            <div className="px-4 py-6 text-[13px] text-text-secondary">
              {copy("Loading alerts…", "Загружаем алерты…", "טוען התראות…")}
            </div>
          )}

          {!alertsQuery.isLoading && items.length === 0 && (
            <div className="px-4 py-6 text-[13px] text-text-secondary">
              {copy(
                "No limit alerts yet.",
                "Алертов по лимитам пока нет.",
                "אין עדיין התראות מגבלה.",
              )}
            </div>
          )}

          {!alertsQuery.isLoading &&
            items.map((item) => {
              const isDanger = item.level === "DANGER";
              const levelClass = isDanger
                ? "text-status-problem-fg bg-status-problem-bg border-status-problem-border"
                : "text-status-warning-fg bg-status-warning-bg border-status-warning-border";
              return (
                <div key={item.id} className="border-t border-border">
                  <article
                    className={cn(
                      "px-4 py-3 md:hidden",
                      item.is_unread && "bg-[var(--dmx-accent-tint)]",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold leading-5 text-text capitalize">
                          {metricLabel(item.metric)}
                        </div>
                        <div className="mt-1 text-[11px] leading-4 text-text-secondary">
                          {formatDateTime(item.created_at)}
                        </div>
                      </div>
                      <span
                        className={cn(
                          "inline-flex shrink-0 items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] font-semibold",
                          levelClass,
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
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                        <div className="text-[10px] uppercase text-text-secondary">
                          {copy("Usage", "Использование", "שימוש")}
                        </div>
                        <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                          {item.current ?? "-"} / {item.max ?? "-"}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                        <div className="text-[10px] uppercase text-text-secondary">
                          %
                        </div>
                        <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                          {item.utilization_pct !== null
                            ? `${item.utilization_pct}%`
                            : "-"}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 text-[12px] leading-5 text-text">
                      <span className="font-medium">{item.action}</span>
                      {item.plan_code ? (
                        <span className="text-text-secondary">
                          {" "}
                          | {copy("plan", "план", "תוכנית")} {item.plan_code}
                        </span>
                      ) : null}
                    </div>
                  </article>
                  <div
                    className={cn(
                      "hidden md:grid grid-cols-[180px_130px_130px_130px_1fr] gap-3 px-4 py-3 text-[13px] row-hover",
                      item.is_unread && "bg-[var(--dmx-accent-tint)]",
                    )}
                  >
                    <div className="text-text-secondary">
                      {formatDateTime(item.created_at)}
                    </div>
                    <div>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] font-semibold",
                          levelClass,
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
                    <div className="font-medium text-text capitalize">
                      {metricLabel(item.metric)}
                    </div>
                    <div className="text-text-secondary">
                      {item.current ?? "-"} / {item.max ?? "-"}
                      {item.utilization_pct !== null
                        ? ` (${item.utilization_pct}%)`
                        : ""}
                    </div>
                    <div className="text-text">
                      <span className="font-medium">{item.action}</span>
                      {item.plan_code ? (
                        <span className="text-text-secondary">
                          {" "}
                          | {copy("plan", "план", "תוכנית")} {item.plan_code}
                        </span>
                      ) : null}
                      {item.is_unread ? (
                        <span className="ml-2 inline-flex w-2 h-2 rounded-full bg-accent align-middle" />
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        <AuditCatalogsSection
          query={auditCatalogsQuery}
          entityType={auditEntityType}
          onEntityTypeChange={setAuditEntityType}
          actionFilter={auditAction}
          onActionFilterChange={setAuditAction}
          dateFrom={auditDateFrom}
          onDateFromChange={setAuditDateFrom}
          dateTo={auditDateTo}
          onDateToChange={setAuditDateTo}
          onOffsetChange={setAuditOffset}
          canPrev={auditCanPrev}
          canNext={auditCanNext}
          exportMutation={exportAuditMutation}
          canRunPrivilegedActions={canRunPrivilegedActions}
          privilegedActionHint={privilegedActionHint}
        />

        <IssueAuditSection
          query={issueAuditQuery}
          actionFilter={issueAuditAction}
          onActionFilterChange={setIssueAuditAction}
          dateFrom={issueAuditDateFrom}
          onDateFromChange={setIssueAuditDateFrom}
          dateTo={issueAuditDateTo}
          onDateToChange={setIssueAuditDateTo}
          issueId={issueAuditIssueId}
          onIssueIdChange={setIssueAuditIssueId}
          issueIdTrimmed={issueAuditIssueIdTrimmed}
          issueIdNormalized={issueAuditIssueIdNormalized}
          onOffsetChange={setIssueAuditOffset}
          canPrev={issueAuditCanPrev}
          canNext={issueAuditCanNext}
          exportMutation={exportIssueAuditMutation}
          canRunPrivilegedActions={canRunPrivilegedActions}
          privilegedActionHint={privilegedActionHint}
        />

        <div className="flex items-center justify-between">
          <div className="text-[12px] text-text-secondary">
            {alertsQuery.data?.last_read_at
              ? copy("Last read at", "Прочитано в", "נקרא לאחרונה ב") +
                `: ${formatDateTime(alertsQuery.data.last_read_at)}`
              : copy(
                  "Alerts are not marked as read yet.",
                  "Алерты ещё не были отмечены как прочитанные.",
                  "ההתראות עדיין לא סומנו כנקראו.",
                )}
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={!canGoPrev}
              onClick={() => setOffset((x) => Math.max(0, x - PAGE_SIZE))}
              className="h-8 px-3 rounded-md border border-border bg-surface text-[12px] disabled:opacity-50"
            >
              {tt("reports.prev")}
            </button>
            <button
              disabled={!canGoNext}
              onClick={() => setOffset((x) => x + PAGE_SIZE)}
              className="h-8 px-3 rounded-md border border-border bg-surface text-[12px] disabled:opacity-50"
            >
              {tt("reports.next")}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
