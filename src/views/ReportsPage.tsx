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
import { COMPANY_CURRENCY, InlineNotice } from "@/components/dimax";
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
  const [expandedIssueAuditId, setExpandedIssueAuditId] = useState<
    string | null
  >(null);
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
  const operationsSlaHistory = operationsSlaHistoryQuery.data;
  const issuesAnalytics = issuesAnalyticsQuery.data;
  const issuesAddonsImpact = issuesAddonsImpactQuery.data;
  const riskConcentration = riskConcentrationQuery.data;
  const installerProfitabilityMatrix =
    installerProfitabilityMatrixQuery.data?.items || [];
  const installerProjectProfitability =
    installerProjectProfitabilityQuery.data?.items || [];
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
  const projectPlanFact = projectPlanFactQuery.data;
  const projectAddonPlan = useMemo(
    () => projectAddonPlanQuery.data || [],
    [projectAddonPlanQuery.data],
  );
  const projectUrgencySurcharges = useMemo(
    () => projectUrgencySurchargesQuery.data || [],
    [projectUrgencySurchargesQuery.data],
  );
  const selectedProjectPlanFact = useMemo(
    () =>
      projectOptions.find(
        (project) => project.id === projectPlanFactProjectId,
      ) || null,
    [projectOptions, projectPlanFactProjectId],
  );
  const projectAddonPlanTotals = useMemo(
    () =>
      projectAddonPlan.reduce(
        (acc, item) => {
          const qty = Number(item.qty_planned) || 0;
          const clientPrice = Number(item.client_price) || 0;
          const installerPrice = Number(item.installer_price) || 0;
          if (qty > 0 && item.installer_price == null) acc.missingPrice = true;
          acc.rows += 1;
          acc.qty += qty;
          acc.client += qty * clientPrice;
          acc.installer += qty * installerPrice;
          return acc;
        },
        { rows: 0, qty: 0, client: 0, installer: 0, missingPrice: false },
      ),
    [projectAddonPlan],
  );
  const projectUrgencyTotals = useMemo(
    () =>
      projectUrgencySurcharges.reduce(
        (acc, item) => {
          acc.rows += 1;
          acc.client += Number(item.client_amount) || 0;
          acc.installer += Number(item.installer_amount) || 0;
          if (item.scope === "ORDER_NUMBER") {
            acc.orderScoped += 1;
          }
          return acc;
        },
        { rows: 0, client: 0, installer: 0, orderScoped: 0 },
      ),
    [projectUrgencySurcharges],
  );
  const projectUrgencyContractTotals = useMemo(() => {
    const client =
      Number(
        projectPlanFact?.urgency_client_total ?? projectUrgencyTotals.client,
      ) || 0;
    const installer =
      Number(
        projectPlanFact?.urgency_installer_total ??
          projectUrgencyTotals.installer,
      ) || 0;
    return {
      rows:
        Number(
          projectPlanFact?.urgency_surcharges_count ??
            projectUrgencyTotals.rows,
        ) || 0,
      orderScoped:
        Number(
          projectPlanFact?.urgency_order_surcharges_count ??
            projectUrgencyTotals.orderScoped,
        ) || 0,
      client,
      installer,
      profit:
        Number(projectPlanFact?.urgency_profit_total ?? client - installer) ||
        0,
    };
  }, [projectPlanFact, projectUrgencyTotals]);
  const projectCommercialAdjustments = useMemo(
    () => ({
      rows: projectAddonPlanTotals.rows + projectUrgencyContractTotals.rows,
      client:
        projectAddonPlanTotals.client + projectUrgencyContractTotals.client,
      installer:
        projectAddonPlanTotals.installer +
        (projectPlanFact?.pricing_mode === "FACTORY" ? 0 : projectUrgencyContractTotals.installer),
    }),
    [projectAddonPlanTotals, projectUrgencyContractTotals, projectPlanFact?.pricing_mode],
  );
  const issuesImpactSummaryRows = [
    {
      label: tt("reports.openIssuesExposure"),
      revenue: formatAmount(
        issuesAddonsImpact?.summary?.open_issue_revenue_at_risk,
      ),
      payroll: formatAmount(
        issuesAddonsImpact?.summary?.open_issue_payroll_at_risk,
      ),
      profit: formatAmount(
        issuesAddonsImpact?.summary?.open_issue_profit_at_risk,
      ),
    },
    {
      label: tt("reports.delayedNotInstalled"),
      revenue: formatAmount(issuesAddonsImpact?.summary?.delayed_revenue_total),
      payroll: formatAmount(issuesAddonsImpact?.summary?.delayed_payroll_total),
      profit: formatAmount(issuesAddonsImpact?.summary?.delayed_profit_total),
    },
    {
      label: tt("reports.addonRealized"),
      revenue: formatAmount(issuesAddonsImpact?.summary?.addon_revenue_total),
      payroll: formatAmount(issuesAddonsImpact?.summary?.addon_payroll_total),
      profit: formatAmount(issuesAddonsImpact?.summary?.addon_profit_total),
    },
  ];
  const projectPlanFactRows = projectPlanFact
    ? [
        {
          label: t("reports.revenue"),
          plan: formatAmount(projectPlanFact.planned_revenue_total),
          fact: formatAmount(projectPlanFact.actual_revenue_total),
          gap: formatAmount(projectPlanFact.revenue_gap_total),
        },
        {
          label: tt("reports.payroll"),
          plan: formatAmount(projectPlanFact.planned_payroll_total),
          fact: formatAmount(projectPlanFact.actual_payroll_total),
          gap: formatAmount(projectPlanFact.payroll_gap_total),
        },
        {
          label: copy("Profit", "Прибыль", "רווח"),
          plan: formatAmount(projectPlanFact.planned_profit_total),
          fact: formatAmount(projectPlanFact.actual_profit_total),
          gap: formatAmount(projectPlanFact.profit_gap_total),
        },
      ]
    : [];
  const projectRiskDrilldown = projectRiskDrilldownQuery.data;
  const topProjectsMargin = topProjectsMarginQuery.data?.items || [];
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
    (item) =>
      !scopedWebhookProvider ||
      item.provider.toLowerCase() === scopedWebhookProvider,
  );
  const retryAuditItems = retryAuditsQuery.data?.items || [];
  const scopedRetryAuditItems = retryAuditItems.filter(
    (item) => !scopedOutboxId || item.outbox_id === scopedOutboxId,
  );
  const auditItems = auditCatalogsQuery.data?.items || [];
  const auditSummary = auditCatalogsQuery.data?.summary;
  const auditCanPrev = auditOffset > 0;
  const auditCanNext =
    auditOffset + AUDIT_PREVIEW_LIMIT < (auditSummary?.total || 0);
  const issueAuditItems = issueAuditQuery.data?.items || [];
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

        <div
          id="reports-operations-sla"
          className={reportsPanelClass("space-y-4 p-4")}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase text-text-secondary">
                {tt("reports.operationsSlaTitle")}
              </div>
              <h2 className="mt-1 text-lg font-semibold tracking-tight text-text">
                {tt("reports.healthMetricsPlaybooks")}
              </h2>
            </div>
            <span
              className={cn(
                "inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-semibold",
                SLA_STATUS_CLASS[operationsSla?.overall_status || ""] ||
                  "text-text-secondary bg-surface-subtle border-border",
              )}
            >
              {operationsSla?.overall_status || tt("reports.notAvailableShort")}
            </span>
          </div>

          {operationsSlaQuery.isLoading ? (
            <div className="text-[13px] text-text-secondary">
              {tt("reports.loadingSlaMetrics")}
            </div>
          ) : operationsSlaQuery.isError ? (
            <div className="text-[13px] text-status-problem-fg">
              {readError(
                operationsSlaQuery.error,
                "Failed to load SLA metrics",
              )}
            </div>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-5">
                {slaMetrics.map((metric) => (
                  <div
                    key={metric.code}
                    className={reportsMetricCardClass(
                      metric.status === "DANGER"
                        ? "danger"
                        : metric.status === "WARN"
                          ? "warning"
                          : "success",
                    )}
                  >
                    <div className="text-[11px] uppercase text-text-secondary">
                      {metric.title}
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <div className="text-lg font-semibold text-text">
                        {metric.current}
                        <span className="ms-1 text-[11px] font-normal text-text-secondary">
                          {metric.unit}
                        </span>
                      </div>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold",
                          SLA_STATUS_CLASS[metric.status] ||
                            "text-text-secondary bg-surface-subtle border-border",
                        )}
                      >
                        {metric.status}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-text-secondary">
                      {copy("target", "цель", "יעד")} {metric.target} |{" "}
                      {copy("warn", "предупр.", "אזהרה")}{" "}
                      {metric.warn_threshold} |{" "}
                      {copy("danger", "риск", "סיכון")}{" "}
                      {metric.danger_threshold}
                    </div>
                  </div>
                ))}
              </div>

              <div className="surface-subtle space-y-3 p-4">
                <div className="text-[11px] uppercase text-text-secondary">
                  {copy(
                    "Action Playbooks",
                    "Сценарии действий",
                    "תרחישי פעולה",
                  )}
                </div>
                {slaPlaybooks.map((playbook) => (
                  <div
                    key={playbook.code}
                    className="grid grid-cols-[1fr_120px] items-center gap-2 rounded-lg border border-border bg-surface-subtle px-3 py-2.5 text-[12px]"
                  >
                    <div>
                      <div className="font-medium text-text">
                        {playbook.title}
                        <span
                          className={cn(
                            "ml-2 inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold",
                            SLA_STATUS_CLASS[playbook.severity] ||
                              "text-text-secondary bg-surface-subtle border-border",
                          )}
                        >
                          {playbook.severity}
                        </span>
                      </div>
                      <div className="text-text-secondary">
                        {playbook.description}
                      </div>
                    </div>
                    <button
                      onClick={() => router.push(playbook.action_url)}
                      className="h-8 rounded-lg border border-border bg-surface-subtle px-3 text-[12px] font-medium"
                    >
                      {copy("Open Playbook", "Открыть план действий", "פתח תוכנית פעולה")}
                    </button>
                  </div>
                ))}
              </div>

              <div className="surface-subtle space-y-3 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[11px] uppercase text-text-secondary">
                    {copy("SLA Trend (last", "Тренд SLA (последний", "מגמת SLA (אחרון")} {slaHistoryDays} {copy("days)", "дней)", "ימים)")}
                  </div>
                  <div className="inline-flex items-center rounded-lg border border-border bg-surface-subtle p-0.5">
                    {SLA_HISTORY_DAYS_OPTIONS.map((option) => (
                      <button
                        key={option}
                        onClick={() => setSlaHistoryDays(option)}
                        className={cn(
                          "h-7 px-2 rounded text-[11px]",
                          option === slaHistoryDays
                            ? "bg-accent text-accent-foreground"
                            : "text-text-secondary",
                        )}
                      >
                        {option}d
                      </button>
                    ))}
                  </div>
                </div>
                {operationsSlaHistoryQuery.isLoading ? (
                  <div className="text-[12px] text-text-secondary">
                    {copy("Loading trend…", "Загружаем тренд…", "טוען מגמה…")}
                  </div>
                ) : operationsSlaHistoryQuery.isError ? (
                  <div className="text-[12px] text-status-problem-fg">
                    {readError(
                      operationsSlaHistoryQuery.error,
                      copy(
                        "Failed to load SLA trend",
                        "Не удалось загрузить тренд SLA",
                        "טעינת מגמת SLA נכשלה",
                      ),
                    )}
                  </div>
                ) : (
                  <>
                    <div className="grid gap-2 md:grid-cols-4 text-[12px]">
                      <div className="rounded-lg border border-border bg-surface-subtle px-3 py-2">
                        <div className="text-text-secondary">
                          {copy("Current", "Текущее", "נוכחי")}
                        </div>
                        <div className="font-semibold">
                          {slaHistorySummary?.current_status ||
                            tt("reports.notAvailableShort")}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-surface-subtle px-3 py-2">
                        <div className="text-text-secondary">
                          {copy("Status Days", "Дней в статусе", "ימים בסטטוס")}
                        </div>
                        <div className="font-semibold">
                          OK {slaHistorySummary?.ok_days || 0} {copy("| WARN", "| ПРЕДУПРЕЖДАТЬ", "| הזהר")}{" "}
                          {slaHistorySummary?.warn_days || 0} {copy("| DANGER", "| ОПАСНОСТЬ", "| סכנה")}{" "}
                          {slaHistorySummary?.danger_days || 0}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-surface-subtle px-3 py-2">
                        <div className="text-text-secondary">
                          {copy("Delta Import % (d-1)", "Дельта импорта, % (d-1)", "% ייבוא דלתא (ד-1)")}
                        </div>
                        <div className="font-semibold">
                          {slaHistorySummary?.delta_import_failure_rate_pct ??
                            0}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-surface-subtle px-3 py-2">
                        <div className="text-text-secondary">
                          {copy("Delta Outbox % (d-1)", "Дельта исходящих % (d-1)", "דלתא דואר יוצא % (d-1)")}
                        </div>
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
                          <div className="text-text-secondary">{point.day}</div>
                          <span
                            className={cn(
                              "inline-flex justify-center rounded border px-1.5 py-0.5 font-semibold",
                              SLA_STATUS_CLASS[point.overall_status] ||
                                "text-text-secondary bg-surface-subtle border-border",
                            )}
                          >
                            {point.overall_status}
                          </span>
                          <div className="h-2 rounded bg-surface-sunken overflow-hidden">
                            <div
                              className="h-full bg-status-warning-fg"
                              style={{
                                width: `${Math.min(100, point.import_failure_rate_pct)}%`,
                              }}
                            />
                          </div>
                          <div className="h-2 rounded bg-surface-sunken overflow-hidden">
                            <div
                              className="h-full bg-status-problem-fg"
                              style={{
                                width: `${Math.min(100, point.outbox_failed_rate_pct)}%`,
                              }}
                            />
                          </div>
                          <div className="text-end text-text-secondary">
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

        <IssuesAnalyticsSection
          query={issuesAnalyticsQuery}
        />

        <div
          id="reports-issues-addons-impact"
          className={reportsPanelClass("space-y-4 p-4")}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase text-text-secondary">
                {tt("reports.marginLeakageTitle")}
              </div>
              <h2 className="mt-1 text-lg font-semibold tracking-tight text-text">
                {tt("reports.marginLeakageSubtitle")}
              </h2>
            </div>
            <div className="text-end text-[11px] text-text-secondary">
              {issuesAddonsImpact?.generated_at
                ? formatDateTime(issuesAddonsImpact.generated_at)
                : tt("reports.notAvailableShort")}
            </div>
          </div>

          {issuesAddonsImpactQuery.isLoading ? (
            <div className="text-[13px] text-text-secondary">
              {tt("reports.loadingMarginLeakage")}
            </div>
          ) : issuesAddonsImpactQuery.isError ? (
            <div className="text-[13px] text-status-problem-fg">
              {readError(
                issuesAddonsImpactQuery.error,
                tt("reports.failedMarginLeakage"),
              )}
            </div>
          ) : (
            <>
              <IssueExposureBasis data={issuesAddonsImpact?.summary}
                reasonsShown={issuesAddonsImpact?.top_reasons?.length ?? 0}
                addonsShown={issuesAddonsImpact?.addon_impact?.length ?? 0} />
              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-lg border border-border bg-surface-subtle px-3 py-3">
                  <div className="text-[11px] uppercase text-text-secondary">
                    {tt("reports.openIssuesAtRisk")}
                  </div>
                  <div className="mt-1 text-lg font-semibold tabular-nums text-text">
                    {formatCount(issuesAddonsImpact?.summary?.open_issues)}
                  </div>
                  <div className="mt-1 text-[11px] text-text-secondary">
                    {tt("reports.profitAtRisk").replace(
                      "{amount}",
                      formatAmount(
                        issuesAddonsImpact?.summary?.open_issue_profit_at_risk,
                      ),
                    )}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-surface-subtle px-3 py-3">
                  <div className="text-[11px] uppercase text-text-secondary">
                    {tt("reports.blockedMarginRisk")}
                  </div>
                  <div className="mt-1 text-lg font-semibold text-status-problem-fg">
                    {formatCount(
                      issuesAddonsImpact?.summary?.blocked_open_issues,
                    )}
                  </div>
                  <div className="mt-1 text-[11px] text-text-secondary">
                    {tt("reports.blockedProfit").replace(
                      "{amount}",
                      formatAmount(
                        issuesAddonsImpact?.summary
                          ?.blocked_issue_profit_at_risk,
                      ),
                    )}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-surface-subtle px-3 py-3">
                  <div className="text-[11px] uppercase text-text-secondary">
                    {tt("reports.delayedDoors")}
                  </div>
                  <div className="mt-1 text-lg font-semibold tabular-nums text-text">
                    {issuesAddonsImpact?.summary?.not_installed_doors ?? 0}
                  </div>
                  <div className="mt-1 text-[11px] text-text-secondary">
                    {tt("reports.delayedProfit").replace(
                      "{amount}",
                      formatAmount(
                        issuesAddonsImpact?.summary?.delayed_profit_total,
                      ),
                    )}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-surface-subtle px-3 py-3">
                  <div className="text-[11px] uppercase text-text-secondary">
                    {tt("reports.addonUplift")}
                  </div>
                  <div className={`mt-1 text-lg font-semibold ${issuesAddonsImpact?.summary?.addon_profit_total == null ? "text-text-secondary" : issuesAddonsImpact.summary.addon_profit_total < 0 ? "text-status-problem-fg" : "text-status-ok-fg"}`}>
                    {formatAmount(
                      issuesAddonsImpact?.summary?.addon_profit_total,
                    )}
                  </div>
                  <div className="mt-1 text-[11px] text-text-secondary">
                    {t("reports.missingPlans")}{" "}
                    {issuesAddonsImpact?.summary?.missing_addon_plans_facts ??
                      0}
                  </div>
                </div>
              </div>

              <div className="divide-y divide-border-subtle overflow-hidden rounded-lg border border-border bg-surface-subtle md:hidden">
                {issuesImpactSummaryRows.map((row) => (
                  <article key={row.label} className="px-3.5 py-3.5">
                    <div className="text-[13px] font-semibold leading-5 text-text">
                      {row.label}
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <div className="rounded-lg border border-border bg-surface px-2.5 py-2">
                        <div className="text-[10.5px] font-semibold uppercase text-text-secondary">
                          {copy("Revenue", "Выручка", "הכנסה")}
                        </div>
                        <div className="mt-1 text-[13px] font-medium text-text tabular-nums">
                          {row.revenue}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-surface px-2.5 py-2">
                        <div className="text-[10.5px] font-semibold uppercase text-text-secondary">
                          {copy("Payroll", "ФОТ", "שכר")}
                        </div>
                        <div className="mt-1 text-[13px] font-medium text-text tabular-nums">
                          {row.payroll}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-surface px-2.5 py-2">
                        <div className="text-[10.5px] font-semibold uppercase text-text-secondary">
                          {copy("Profit", "Прибыль", "רווח")}
                        </div>
                        <div className="mt-1 text-[13px] font-medium text-text tabular-nums">
                          {row.profit}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className="hidden overflow-auto rounded-lg border border-border bg-surface-subtle md:block">
                <table className="w-full text-[12px]">
                  <thead className="bg-surface-subtle text-text-secondary">
                    <tr>
                      <th className="text-start px-3 py-2 font-medium">
                        {tt("reports.summary")}
                      </th>
                      <th className="text-end px-3 py-2 font-medium">
                        {copy("Revenue", "Выручка", "הכנסה")}
                      </th>
                      <th className="text-end px-3 py-2 font-medium">
                        {copy("Payroll", "ФОТ", "שכר")}
                      </th>
                      <th className="text-end px-3 py-2 font-medium">
                        {copy("Profit", "Прибыль", "רווח")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {issuesImpactSummaryRows.map((row) => (
                      <tr key={row.label} className="border-t border-border">
                        <td className="px-3 py-2.5 font-medium text-text">
                          {row.label}
                        </td>
                        <td className="px-3 py-2 text-end">{row.revenue}</td>
                        <td className="px-3 py-2 text-end">{row.payroll}</td>
                        <td className="px-3 py-2 text-end">{row.profit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="overflow-hidden rounded-lg border border-border bg-surface-subtle">
                  <div className="border-b border-border px-3 py-2 text-[11px] uppercase text-text-secondary">
                    {tt("reports.delayedByReason")}
                  </div>
                  <div className="divide-y divide-border-subtle md:hidden">
                    {(issuesAddonsImpact?.top_reasons || []).length === 0 ? (
                      <div className="px-3.5 py-3 text-[12px] text-text-secondary">
                        {tt("reports.noDelayedReasons")}
                      </div>
                    ) : (
                      (issuesAddonsImpact?.top_reasons || []).map((item) => (
                        <article
                          key={`${item.reason_id || item.reason_name}-mobile`}
                          className="px-3.5 py-3.5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 text-[13px] font-semibold leading-5 text-text">
                              {item.reason_name}
                              <UnpricedExposureNotice count={item.unpriced_doors} />
                            </div>
                            <div className="shrink-0 rounded-full bg-surface px-2 py-1 text-[10.5px] font-medium leading-none text-text-secondary">
                              {copy("Doors", "Двери", "דלתות")}: {item.doors}
                            </div>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <div className="rounded-lg border border-border bg-surface px-2.5 py-2">
                              <div className="text-[10.5px] font-semibold uppercase text-text-secondary">
                                {copy("Revenue", "Выручка", "הכנסה")}
                              </div>
                              <div className="mt-1 text-[13px] font-medium text-text tabular-nums">
                                {formatAmount(item.revenue_delayed_total)}
                              </div>
                            </div>
                            <div className="rounded-lg border border-border bg-surface px-2.5 py-2">
                              <div className="text-[10.5px] font-semibold uppercase text-text-secondary">
                                {copy("Profit", "Прибыль", "רווח")}
                              </div>
                              <div className="mt-1 text-[13px] font-medium text-text tabular-nums">
                                {formatAmount(item.profit_delayed_total)}
                              </div>
                            </div>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                  <table className="hidden w-full text-[12px] md:table">
                    <thead className="bg-surface-subtle text-text-secondary">
                      <tr>
                        <th className="text-start px-3 py-2 font-medium">
                          {copy("Reason", "Причина", "סיבה")}
                        </th>
                        <th className="text-end px-3 py-2 font-medium">
                          {copy("Doors", "Двери", "דלתות")}
                        </th>
                        <th className="text-end px-3 py-2 font-medium">
                          {copy("Revenue", "Выручка", "הכנסה")}
                        </th>
                        <th className="text-end px-3 py-2 font-medium">
                          {copy("Profit", "Прибыль", "רווח")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(issuesAddonsImpact?.top_reasons || []).length === 0 ? (
                        <tr>
                          <td
                            className="px-3 py-3 text-text-secondary"
                            colSpan={4}
                          >
                            {tt("reports.noDelayedReasons")}
                          </td>
                        </tr>
                      ) : (
                        (issuesAddonsImpact?.top_reasons || []).map((item) => (
                          <tr
                            key={item.reason_id || item.reason_name}
                            className="border-t border-border"
                          >
                            <td className="px-3 py-2.5 font-medium text-text">
                              {item.reason_name}
                              <UnpricedExposureNotice count={item.unpriced_doors} />
                            </td>
                            <td className="px-3 py-2 text-end">{item.doors}</td>
                            <td className="px-3 py-2 text-end">
                              {formatAmount(item.revenue_delayed_total)}
                            </td>
                            <td className="px-3 py-2 text-end">
                              {formatAmount(item.profit_delayed_total)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="overflow-hidden rounded-lg border border-border bg-surface-subtle">
                  <div className="border-b border-border px-3 py-2 text-[11px] uppercase text-text-secondary">
                    {tt("reports.addonProfitImpact")}
                  </div>
                  <div className="divide-y divide-border-subtle md:hidden">
                    {(issuesAddonsImpact?.addon_impact || []).length === 0 ? (
                      <div className="px-3.5 py-3 text-[12px] text-text-secondary">
                        {tt("reports.noAddonImpactRows")}
                      </div>
                    ) : (
                      (issuesAddonsImpact?.addon_impact || []).map((item) => (
                        <article
                          key={`${item.addon_type_id || item.addon_name}-mobile`}
                          className="px-3.5 py-3.5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 text-[13px] font-semibold leading-5 text-text">
                              {item.addon_name}
                              <InstallerFinancialNotice data={item} />
                            </div>
                            <div className="shrink-0 rounded-full bg-surface px-2 py-1 text-[10.5px] font-medium leading-none text-text-secondary">
                              {copy("Qty", "Кол-во", "כמות")}:{" "}
                              {formatAmount(item.qty_done)}
                            </div>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <div className="rounded-lg border border-border bg-surface px-2.5 py-2">
                              <div className="text-[10.5px] font-semibold uppercase text-text-secondary">
                                {copy("Profit", "Прибыль", "רווח")}
                              </div>
                              <div className="mt-1 text-[13px] font-medium text-text tabular-nums">
                                {formatAmount(item.profit_total)}
                              </div>
                            </div>
                            <div className="rounded-lg border border-border bg-surface px-2.5 py-2">
                              <div className="text-[10.5px] font-semibold uppercase text-text-secondary">
                                {tt("reports.missingPlans")}
                              </div>
                              <div className="mt-1 text-[13px] font-medium text-text tabular-nums">
                                {item.missing_plan_facts}
                              </div>
                            </div>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                  <table className="hidden w-full text-[12px] md:table">
                    <thead className="bg-surface-subtle text-text-secondary">
                      <tr>
                        <th className="text-start px-3 py-2 font-medium">
                          {tt("reports.addon")}
                        </th>
                        <th className="text-end px-3 py-2 font-medium">
                          {copy("Qty", "Кол-во", "כמות")}
                        </th>
                        <th className="text-end px-3 py-2 font-medium">
                          {copy("Profit", "Прибыль", "רווח")}
                        </th>
                        <th className="text-end px-3 py-2 font-medium">
                          {tt("reports.missingPlans")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(issuesAddonsImpact?.addon_impact || []).length === 0 ? (
                        <tr>
                          <td
                            className="px-3 py-3 text-text-secondary"
                            colSpan={4}
                          >
                            {tt("reports.noAddonImpactRows")}
                          </td>
                        </tr>
                      ) : (
                        (issuesAddonsImpact?.addon_impact || []).map((item) => (
                          <tr
                            key={item.addon_type_id || item.addon_name}
                            className="border-t border-border"
                          >
                            <td className="px-3 py-2.5 font-medium text-text">
                              {item.addon_name}
                              <InstallerFinancialNotice data={item} />
                            </td>
                            <td className="px-3 py-2 text-end">
                              {formatAmount(item.qty_done)}
                            </td>
                            <td className="px-3 py-2 text-end">
                              {formatAmount(item.profit_total)}
                            </td>
                            <td className="px-3 py-2 text-end">
                              {item.missing_plan_facts}
                            </td>
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

        <div
          id="reports-project-plan-fact"
          className={reportsPanelClass("overflow-hidden")}
        >
          <div className="px-4 py-3 border-b border-border bg-surface-subtle flex flex-col items-stretch gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-[11px] uppercase text-text-secondary">
                {tt("reports.projectPlanVsFactTitle")}
              </div>
              <div className="text-[13px] text-text-secondary">
                {tt("reports.projectPlanVsFactSubtitle")}
              </div>
            </div>
            <select
              aria-label={copy("Project Plan Fact Filter", "Фильтр план/факт по объекту", "מסנן תכנון מול ביצוע לפי פרויקט")}
              value={projectPlanFactProjectId}
              onChange={(e) => setProjectPlanFactProjectId(e.target.value)}
              className="h-9 w-full min-w-0 rounded-md border border-border bg-surface px-2 text-[13px] md:w-auto md:max-w-[280px]"
            >
              <option value="">
                {projectsQuery.isLoading
                  ? t("reports.loadingProjects")
                  : t("reports.selectProject")}
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
              <SectionMessage
                title={tt("reports.loadingProjectsForPlanFact")}
                detail={tt("reports.preparingPlanFactFilters")}
              />
            </div>
          )}
          {!projectsQuery.isLoading && projectOptions.length === 0 && (
            <div className="px-4 py-6">
              <SectionMessage
                title={t("reports.noProjectsForPlanFact")}
                detail={t("reports.importFactoryFileFirst")}
              />
            </div>
          )}
          {!projectsQuery.isLoading &&
            projectOptions.length > 0 &&
            !projectPlanFactProjectId && (
              <div className="px-4 py-6">
                <SectionMessage
                  title={t("reports.selectProject")}
                  detail={t("reports.selectProjectPlanFact")}
                />
              </div>
            )}
          {projectPlanFactQuery.isLoading && projectPlanFactProjectId && (
            <div className="px-4 py-6 text-[13px] text-text-secondary">
              {tt("reports.loadingProjectPlanFact")}
            </div>
          )}
          {projectPlanFactQuery.isError && projectPlanFactProjectId && (
            <div className="px-4 py-6 text-[13px] text-status-problem-fg">
              {readError(
                projectPlanFactQuery.error,
                tt("reports.failedProjectPlanFact"),
              )}
            </div>
          )}
          {!projectPlanFactQuery.isLoading &&
            !projectPlanFactQuery.isError &&
            projectPlanFact && (
              <div className="p-4 space-y-4">
                <ProjectPricingNotice data={projectPlanFact} />
                <div className="rounded-lg border border-border bg-surface-subtle p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="max-w-3xl">
                      <div className="text-[11px] uppercase text-text-secondary">
                        {copy(
                          "Commercial Adjustments",
                          "Коммерческие корректировки",
                          "התאמות מסחריות",
                        )}
                      </div>
                      <div className="mt-1 text-[13px] text-text-secondary">
                        {copy(
                          `Cross-check add-on plans and urgency uplift for ${selectedProjectPlanFact?.name || "the selected project"} before drilling deeper into margin risk.`,
                          `Сверьте план доп. работ и срочную надбавку для ${selectedProjectPlanFact?.name || "выбранного проекта"} до детального разбора маржи и рисков.`,
                          `בדוק את תוכנית העבודות הנוספות ותוספת הדחיפות עבור ${selectedProjectPlanFact?.name || "הפרויקט הנבחר"} לפני ירידה עמוקה יותר לסיכון המרווח.`,
                        )}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-[12px] text-text-secondary">
                      {copy("Plan rows", "Строк плана", "שורות תוכנית")}:{" "}
                      {formatCount(projectCommercialAdjustments.rows)}
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-lg border border-border bg-surface p-3">
                      <div className="text-[11px] uppercase text-text-secondary">
                        {copy(
                          "Client uplift",
                          "Надбавка клиента",
                          "תוספת לקוח",
                        )}
                      </div>
                      <div className="mt-1 text-lg font-semibold tabular-nums text-text">
                        {formatAmount(projectCommercialAdjustments.client)}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-surface p-3">
                      <div className="text-[11px] uppercase text-text-secondary">
                        {copy(
                          projectPlanFact.pricing_mode === "FACTORY" ? "Additional work payroll plan" : "Installer uplift",
                          projectPlanFact.pricing_mode === "FACTORY" ? "План начислений за допработы" : "Надбавка монтажника",
                          projectPlanFact.pricing_mode === "FACTORY" ? "תכנון שכר לעבודות נוספות" : "תוספת מתקין",
                        )}
                      </div>
                      <div className="mt-1 text-lg font-semibold tabular-nums text-text">
                        {projectAddonPlanTotals.missingPrice ? copy("No confirmed price", "Нет подтверждённой цены", "אין מחיר מאושר") : formatAmount(projectCommercialAdjustments.installer)}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-surface p-3">
                      <div className="text-[11px] uppercase text-text-secondary">
                        {copy(
                          "Unreconciled add-on facts",
                          "Несогласованные дополнительные факты",
                          "עובדות תוספות לא מתואמות",
                        )}
                      </div>
                      <div className="mt-1 text-lg font-semibold tabular-nums text-text">
                        {formatCount(projectPlanFact.missing_addon_plans_facts)}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-surface p-3">
                      <div className="text-[11px] uppercase text-text-secondary">
                        {copy(
                          "Order-level urgency",
                          "Срочность по заказам",
                          "דחיפות ברמת הזמנה",
                        )}
                      </div>
                      <div className="mt-1 text-lg font-semibold tabular-nums text-text">
                        {formatCount(projectUrgencyContractTotals.orderScoped)}
                      </div>
                    </div>
                  </div>
                  {selectedProjectPlanFact && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9"
                        onClick={() =>
                          router.push(
                            `/projects?project_id=${selectedProjectPlanFact.id}&focus_section=addons`,
                          )
                        }
                      >
                        {copy(
                          "Open pricing flow",
                          "Открыть блок цен",
                          "פתח את בלוק התמחור",
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9"
                        onClick={() =>
                          router.push(
                            `/projects?project_id=${selectedProjectPlanFact.id}&focus_section=urgency`,
                          )
                        }
                      >
                        {copy(
                          "Open urgency rows",
                          "Открыть срочные надбавки",
                          "פתח שורות דחיפות",
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9"
                        onClick={() =>
                          router.push(
                            `/earnings-ledger?project_id=${selectedProjectPlanFact.id}`,
                          )
                        }
                      >
                        <ReceiptText className="h-3.5 w-3.5" />
                        {copy(
                          "Open payroll ledger",
                          "Открыть начисления",
                          "פתח יומן תשלומים",
                        )}
                      </Button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="rounded-lg border border-border bg-surface p-3">
                    <div className="text-[11px] uppercase text-text-secondary">
                      {t("projects.completion")}
                    </div>
                    <div className="mt-2 text-[22px] font-semibold text-text">
                      {formatPercent(projectPlanFact.completion_pct)}
                    </div>
                    <div className="mt-1 text-[12px] text-text-secondary">
                      {projectPlanFact.installed_doors} /{" "}
                      {projectPlanFact.total_doors}{" "}
                      {t("reports.doors").toLowerCase()} {copy("installed", "установлен", "מותקן")}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-surface p-3">
                    <div className="text-[11px] uppercase text-text-secondary">
                      {t("reports.openIssuesExposure")}
                    </div>
                    <div className="mt-2 text-[22px] font-semibold text-text">
                      {projectPlanFact.open_issues}
                    </div>
                    <div className="mt-1 text-[12px] text-text-secondary">
                      {projectPlanFact.not_installed_doors}{" "}
                      {t("reports.doors").toLowerCase()} {copy("still pending", "все еще находится на рассмотрении", "עדיין בהמתנה")}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-surface p-3">
                    <div className="text-[11px] uppercase text-text-secondary">
                      {t("projects.missingRates")}
                    </div>
                    <div className="mt-2 text-[22px] font-semibold text-text">
                      {projectPlanFact.missing_planned_rates_doors}
                    </div>
                    <div className="mt-1 text-[12px] text-text-secondary">
                      {tt("reports.actualMissing")}:{" "}
                      {projectPlanFact.missing_actual_rates_doors}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-surface p-3">
                    <div className="text-[11px] uppercase text-text-secondary">
                      {t("projects.addons")}
                    </div>
                    <div className="mt-2 text-[22px] font-semibold text-text">
                      {formatAmount(projectPlanFact.actual_addons_qty)} /{" "}
                      {formatAmount(projectPlanFact.planned_addons_qty)}
                    </div>
                    <div className="mt-1 text-[12px] text-text-secondary">
                      {t("reports.missingPlans")}:{" "}
                      {projectPlanFact.missing_addon_plans_facts}
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-border-subtle overflow-hidden rounded-lg border border-border bg-surface md:hidden">
                  {projectPlanFactRows.map((row) => (
                    <article
                      key={`${row.label}-mobile`}
                      className="px-3.5 py-3.5"
                    >
                      <div className="text-[13px] font-semibold leading-5 text-text">
                        {row.label}
                      </div>
                      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                          <div className="text-[10.5px] font-semibold uppercase text-text-secondary">
                            {t("reports.plan")}
                          </div>
                          <div className="mt-1 text-[13px] font-medium text-text tabular-nums">
                            {row.plan}
                          </div>
                        </div>
                        <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                          <div className="text-[10.5px] font-semibold uppercase text-text-secondary">
                            {t("reports.fact")}
                          </div>
                          <div className="mt-1 text-[13px] font-medium text-text tabular-nums">
                            {row.fact}
                          </div>
                        </div>
                        <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                          <div className="text-[10.5px] font-semibold uppercase text-text-secondary">
                            {t("reports.gap")}
                          </div>
                          <div className="mt-1 text-[13px] font-medium text-text tabular-nums">
                            {row.gap}
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="hidden overflow-auto rounded-lg border border-border md:block">
                  <table className="w-full text-[13px]">
                    <thead className="bg-surface-subtle text-text-secondary">
                      <tr>
                        <th className="text-start px-3 py-2 font-medium">
                          {t("reports.metric")}
                        </th>
                        <th className="text-end px-3 py-2 font-medium">
                          {t("reports.plan")}
                        </th>
                        <th className="text-end px-3 py-2 font-medium">
                          {t("reports.fact")}
                        </th>
                        <th className="text-end px-3 py-2 font-medium">
                          {t("reports.gap")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {projectPlanFactRows.map((row) => (
                        <tr key={row.label} className="border-t border-border">
                          <td className="px-3 py-2.5 font-medium text-text">
                            {row.label}
                          </td>
                          <td className="px-3 py-2 text-end">{row.plan}</td>
                          <td className="px-3 py-2 text-end">{row.fact}</td>
                          <td className="px-3 py-2 text-end">{row.gap}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <div className="rounded-lg border border-border bg-surface p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="max-w-[32rem]">
                        <div className="text-[11px] uppercase text-text-secondary">
                          {copy(
                            "Additional Works Plan",
                            "План доп. работ",
                            "תוכנית עבודות נוספות",
                          )}
                        </div>
                        <div className="mt-1 text-[12px] text-text-secondary">
                          {copy(
                            "Planned add-on rows that should later reconcile with installer facts.",
                            "Плановые строки доп. работ, которые позже должны сойтись с фактами монтажника.",
                            "שורות תוספות מתוכננות שאמורות להתאים מאוחר יותר עם עובדות המתקין.",
                          )}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-surface-subtle px-3 py-2 text-end text-[12px] text-text-secondary">
                        {copy("Rows", "Строки", "שורות")}:{" "}
                        {projectAddonPlanTotals.rows}
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="rounded-lg border border-border bg-surface-subtle p-3">
                        <div className="text-[11px] uppercase text-text-secondary">
                          {copy("Qty planned", "План", "כמות")}
                        </div>
                        <div className="mt-1 text-lg font-semibold tabular-nums text-text">
                          {formatAmount(projectAddonPlanTotals.qty)}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-surface-subtle p-3">
                        <div className="text-[11px] uppercase text-text-secondary">
                          {copy("Client total", "Сумма клиента", 'סה"כ לקוח')}
                        </div>
                        <div className="mt-1 text-lg font-semibold tabular-nums text-text">
                          {formatAmount(projectAddonPlanTotals.client)}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-surface-subtle p-3">
                        <div className="text-[11px] uppercase text-text-secondary">
                          {copy(
                            "Installer total",
                            "Сумма монтажника",
                            'סה"כ מתקין',
                          )}
                        </div>
                        <div className="mt-1 text-lg font-semibold tabular-nums text-text">
                          {projectAddonPlanTotals.missingPrice ? copy("No confirmed price", "Нет подтверждённой цены", "אין מחיר מאושר") : formatAmount(projectAddonPlanTotals.installer)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 divide-y divide-border-subtle overflow-hidden rounded-lg border border-border md:hidden">
                      {projectAddonPlanQuery.isLoading ? (
                        <div className="px-3.5 py-3 text-[12px] text-text-secondary">
                          {copy(
                            "Loading additional works plan...",
                            "Загружаем план доп. работ...",
                            "טוען תוכנית עבודות נוספות...",
                          )}
                        </div>
                      ) : projectAddonPlan.length === 0 ? (
                        <div className="px-3.5 py-3 text-[12px] text-text-secondary">
                          {copy(
                            "No planned additional works for this project.",
                            "Для этого проекта нет запланированных доп. работ.",
                            "אין עבודות נוספות מתוכננות לפרויקט זה.",
                          )}
                        </div>
                      ) : (
                        projectAddonPlan.slice(0, 4).map((item, index) => (
                          <article
                            key={`${item.id || `${item.addon_type_id}-${index}`}-mobile`}
                            className="px-3.5 py-3.5"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 text-[13px] font-semibold leading-5 text-text">
                                {item.addon_name || item.addon_type_id}
                              </div>
                              <div className="shrink-0 rounded-full bg-surface-subtle px-2 py-1 text-[10.5px] font-medium leading-none text-text-secondary">
                                {copy("Qty", "Кол-во", "כמות")}:{" "}
                                {formatAmount(Number(item.qty_planned) || 0)}
                              </div>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                                <div className="text-[10.5px] font-semibold uppercase text-text-secondary">
                                  {copy("Client", "Клиент", "לקוח")}
                                </div>
                                <div className="mt-1 text-[13px] font-medium text-text tabular-nums">
                                  {formatAmount(Number(item.client_price) || 0)}
                                </div>
                              </div>
                              <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                                <div className="text-[10.5px] font-semibold uppercase text-text-secondary">
                                  {copy("Installer", "Монтажник", "מתקין")}
                                </div>
                                <div className="mt-1 text-[13px] font-medium text-text tabular-nums">
                                  {item.installer_price == null ? copy("No confirmed price", "Нет подтверждённой цены", "אין מחיר מאושר") : formatAmount(Number(item.installer_price))}
                                </div>
                              </div>
                            </div>
                          </article>
                        ))
                      )}
                    </div>
                    <div className="mt-3 hidden overflow-auto rounded-lg border border-border md:block">
                      <table className="min-w-[520px] w-full text-[12px] leading-5">
                        <thead className="bg-surface-subtle text-text-secondary">
                          <tr>
                            <th className="px-3 py-2.5 text-start font-medium">
                              {tt("reports.addon")}
                            </th>
                            <th className="px-3 py-2.5 text-end font-medium">
                              {copy("Qty", "Кол-во", "כמות")}
                            </th>
                            <th className="px-3 py-2.5 text-end font-medium">
                              {copy("Client", "Клиент", "לקוח")}
                            </th>
                            <th className="px-3 py-2.5 text-end font-medium">
                              {copy("Installer", "Монтажник", "מתקין")}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {projectAddonPlanQuery.isLoading ? (
                            <tr>
                              <td
                                className="px-3 py-3 text-text-secondary"
                                colSpan={4}
                              >
                                {copy(
                                  "Loading additional works plan...",
                                  "Загружаем план доп. работ...",
                                  "טוען תוכנית עבודות נוספות...",
                                )}
                              </td>
                            </tr>
                          ) : projectAddonPlan.length === 0 ? (
                            <tr>
                              <td
                                className="px-3 py-3 text-text-secondary"
                                colSpan={4}
                              >
                                {copy(
                                  "No planned additional works for this project.",
                                  "Для этого проекта нет запланированных доп. работ.",
                                  "אין עבודות נוספות מתוכננות לפרויקט זה.",
                                )}
                              </td>
                            </tr>
                          ) : (
                            projectAddonPlan.slice(0, 4).map((item, index) => (
                              <tr
                                key={
                                  item.id || `${item.addon_type_id}-${index}`
                                }
                                className="border-t border-border"
                              >
                                <td className="px-3 py-2.5 font-medium text-text">
                                  {item.addon_name || item.addon_type_id}
                                </td>
                                <td className="px-3 py-2.5 text-end tabular-nums">
                                  {formatAmount(Number(item.qty_planned) || 0)}
                                </td>
                                <td className="px-3 py-2.5 text-end tabular-nums">
                                  {formatAmount(Number(item.client_price) || 0)}
                                </td>
                                <td className="px-3 py-2.5 text-end tabular-nums">
                                  {item.installer_price == null ? copy("No confirmed price", "Нет подтверждённой цены", "אין מחיר מאושר") : formatAmount(Number(item.installer_price))}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-surface p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="max-w-[32rem]">
                        <div className="text-[11px] uppercase text-text-secondary">
                          {copy(
                            "Urgency Surcharge",
                            "Срочная надбавка",
                            "תוספת דחיפות",
                          )}
                        </div>
                        <div className="mt-1 text-[12px] text-text-secondary">
                          {copy(
                            "Separate urgency uplift rows that should stay visible in project commercial review.",
                            "Отдельные строки срочной надбавки, которые должны быть видимы в коммерческом разборе проекта.",
                            "שורות תוספת דחיפות נפרדות שצריכות להישאר גלויות בבדיקה המסחרית של הפרויקט.",
                          )}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-surface-subtle px-3 py-2 text-end text-[12px] text-text-secondary">
                        {copy("Rows", "Строки", "שורות")}:{" "}
                        {projectUrgencyContractTotals.rows}
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="rounded-lg border border-border bg-surface-subtle p-3">
                        <div className="text-[11px] uppercase text-text-secondary">
                          {copy("Order-scoped", "По заказу", "לפי הזמנה")}
                        </div>
                        <div className="mt-1 text-lg font-semibold tabular-nums text-text">
                          {projectUrgencyContractTotals.orderScoped}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-surface-subtle p-3">
                        <div className="text-[11px] uppercase text-text-secondary">
                          {copy(
                            "Client uplift",
                            "Надбавка клиента",
                            "תוספת לקוח",
                          )}
                        </div>
                        <div className="mt-1 text-lg font-semibold tabular-nums text-text">
                          {formatAmount(projectUrgencyContractTotals.client)}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-surface-subtle p-3">
                        <div className="text-[11px] uppercase text-text-secondary">
                          {copy(
                            "Installer uplift",
                            "Надбавка монтажника",
                            "תוספת מתקין",
                          )}
                        </div>
                        <div className="mt-1 text-lg font-semibold tabular-nums text-text">
                          {formatAmount(projectUrgencyContractTotals.installer)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 divide-y divide-border-subtle overflow-hidden rounded-lg border border-border md:hidden">
                      {projectUrgencySurchargesQuery.isLoading ? (
                        <div className="px-3.5 py-3 text-[12px] text-text-secondary">
                          {copy(
                            "Loading urgency surcharge rows...",
                            "Загружаем строки срочной надбавки...",
                            "טוען שורות תוספת דחיפות...",
                          )}
                        </div>
                      ) : projectUrgencySurcharges.length === 0 ? (
                        <div className="px-3.5 py-3 text-[12px] text-text-secondary">
                          {copy(
                            "No urgency surcharge rows for this project.",
                            "Для этого проекта нет строк срочной надбавки.",
                            "אין שורות תוספת דחיפות לפרויקט זה.",
                          )}
                        </div>
                      ) : (
                        projectUrgencySurcharges
                          .slice(0, 4)
                          .map((item, index) => (
                            <article
                              key={`${item.id || `${item.scope}-${index}`}-mobile`}
                              className="px-3.5 py-3.5"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="text-[13px] font-semibold leading-5 text-text">
                                    {item.reason}
                                  </div>
                                  <div className="mt-1 text-[11px] text-text-secondary">
                                    {item.scope === "ORDER_NUMBER"
                                      ? `${copy("Order", "Заказ", "הזמנה")}${item.order_number ? ` • ${item.order_number}` : ""}`
                                      : copy("Project", "Проект", "פרויקט")}
                                  </div>
                                </div>
                              </div>
                              <div className="mt-3 grid grid-cols-2 gap-2">
                                <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                                  <div className="text-[10.5px] font-semibold uppercase text-text-secondary">
                                    {copy("Client", "Клиент", "לקוח")}
                                  </div>
                                  <div className="mt-1 text-[13px] font-medium text-text tabular-nums">
                                    {formatAmount(
                                      Number(item.client_amount) || 0,
                                    )}
                                  </div>
                                </div>
                                <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                                  <div className="text-[10.5px] font-semibold uppercase text-text-secondary">
                                    {copy("Installer", "Монтажник", "מתקין")}
                                  </div>
                                  <div className="mt-1 text-[13px] font-medium text-text tabular-nums">
                                    {formatAmount(
                                      Number(item.installer_amount) || 0,
                                    )}
                                  </div>
                                </div>
                              </div>
                            </article>
                          ))
                      )}
                    </div>
                    <div className="mt-3 hidden overflow-auto rounded-lg border border-border md:block">
                      <table className="min-w-[520px] w-full text-[12px] leading-5">
                        <thead className="bg-surface-subtle text-text-secondary">
                          <tr>
                            <th className="px-3 py-2.5 text-start font-medium">
                              {copy("Scope", "Раздел", "תחום")}
                            </th>
                            <th className="px-3 py-2.5 text-start font-medium">
                              {copy("Reason", "Причина", "סיבה")}
                            </th>
                            <th className="px-3 py-2.5 text-end font-medium">
                              {copy("Client", "Клиент", "לקוח")}
                            </th>
                            <th className="px-3 py-2.5 text-end font-medium">
                              {copy("Installer", "Монтажник", "מתקין")}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {projectUrgencySurchargesQuery.isLoading ? (
                            <tr>
                              <td
                                className="px-3 py-3 text-text-secondary"
                                colSpan={4}
                              >
                                {copy(
                                  "Loading urgency surcharge rows...",
                                  "Загружаем строки срочной надбавки...",
                                  "טוען שורות תוספת דחיפות...",
                                )}
                              </td>
                            </tr>
                          ) : projectUrgencySurcharges.length === 0 ? (
                            <tr>
                              <td
                                className="px-3 py-3 text-text-secondary"
                                colSpan={4}
                              >
                                {copy(
                                  "No urgency surcharge rows for this project.",
                                  "Для этого проекта нет строк срочной надбавки.",
                                  "אין שורות תוספת דחיפות לפרויקט זה.",
                                )}
                              </td>
                            </tr>
                          ) : (
                            projectUrgencySurcharges
                              .slice(0, 4)
                              .map((item, index) => (
                                <tr
                                  key={item.id || `${item.scope}-${index}`}
                                  className="border-t border-border"
                                >
                                  <td className="px-3 py-2.5">
                                    {item.scope === "ORDER_NUMBER"
                                      ? `${copy("Order", "Заказ", "הזמנה")}${item.order_number ? ` • ${item.order_number}` : ""}`
                                      : copy("Project", "Проект", "פרויקט")}
                                  </td>
                                  <td className="px-3 py-2.5 font-medium text-text">
                                    {item.reason}
                                  </td>
                                  <td className="px-3 py-2.5 text-end tabular-nums">
                                    {formatAmount(
                                      Number(item.client_amount) || 0,
                                    )}
                                  </td>
                                  <td className="px-3 py-2.5 text-end tabular-nums">
                                    {formatAmount(
                                      Number(item.installer_amount) || 0,
                                    )}
                                  </td>
                                </tr>
                              ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
        </div>

        <div
          id="reports-project-risk-drilldown"
          className={reportsPanelClass("overflow-hidden")}
        >
          <div className="px-4 py-3 border-b border-border bg-surface-subtle flex flex-col items-stretch gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-[11px] uppercase text-text-secondary">
                {tt("reports.projectRiskTitle")}
              </div>
              <div className="text-[13px] text-text-secondary">
                {tt("reports.projectRiskSubtitle")}
              </div>
            </div>
            <select
              aria-label={copy("Project Risk Drilldown Filter", "Фильтр детализации рисков по объекту", "מסנן פירוט סיכונים לפי פרויקט")}
              value={projectRiskProjectId}
              onChange={(e) => setProjectRiskProjectId(e.target.value)}
              className="h-9 w-full min-w-0 rounded-md border border-border bg-surface px-2 text-[13px] md:w-auto md:max-w-[280px]"
            >
              <option value="">
                {projectsQuery.isLoading
                  ? tt("reports.loadingProjects")
                  : t("reports.selectProject")}
              </option>
              {projectOptions.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          {projectRiskDrilldownQuery.isLoading && projectRiskProjectId && (
            <div className="px-4 py-6 text-[13px] text-text-secondary">
              {tt("reports.loadingProjectRisk")}
            </div>
          )}
          {projectRiskDrilldownQuery.isError && projectRiskProjectId && (
            <div className="px-4 py-6 text-[13px] text-status-problem-fg">
              {readError(
                projectRiskDrilldownQuery.error,
                tt("reports.failedProjectRisk"),
              )}
            </div>
          )}
          {!projectsQuery.isLoading &&
            projectOptions.length > 0 &&
            !projectRiskProjectId && (
              <div className="px-4 py-6">
                <SectionMessage
                  title={copy("Select a project", "Выберите объект", "בחרו פרויקט")}
                  detail={copy(
                    "Choose a project to inspect the exact drivers behind low margin, stalled reasons and risky orders.",
                    "Выберите объект, чтобы увидеть причины низкой маржи, задержек и заказов с риском.",
                    "בחרו פרויקט כדי לראות את הגורמים לרווחיות נמוכה, לעיכובים ולהזמנות בסיכון.",
                  )}
                />
              </div>
            )}
          {!projectRiskDrilldownQuery.isLoading &&
            !projectRiskDrilldownQuery.isError &&
            projectRiskDrilldown && (
              <div className="p-4 space-y-4">
                <ProjectPricingNotice data={projectRiskDrilldown.summary} />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="rounded-lg border border-border bg-surface p-3">
                    <div className="text-[11px] uppercase text-text-secondary">
                      {copy(
                        "Actual Margin",
                        "Фактическая маржа",
                        "מרווח בפועל",
                      )}
                    </div>
                    <div className="mt-2 text-[22px] font-semibold text-text">
                      {formatPercent(
                        projectRiskDrilldown.summary?.actual_margin_pct,
                      )}
                    </div>
                    <div className="mt-1 text-[12px] text-text-secondary">
                      {copy("Profit gap", "Разрыв по прибыли", "פער רווח")}{" "}
                      {formatAmount(
                        projectRiskDrilldown.summary?.profit_gap_total,
                      )}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-surface p-3">
                    <div className="text-[11px] uppercase text-text-secondary">
                      {copy(
                        "Completion / Delayed",
                        "Завершение / задержка",
                        "השלמה / עיכוב",
                      )}
                    </div>
                    <div className="mt-2 text-[22px] font-semibold text-text">
                      {formatPercent(
                        projectRiskDrilldown.summary?.completion_pct,
                      )}
                    </div>
                    <div className="mt-1 text-[12px] text-text-secondary">
                      {projectRiskDrilldown.summary?.not_installed_doors ?? 0}{" "}
                      {copy(
                        "delayed doors",
                        "дверей в задержке",
                        "דלתות בעיכוב",
                      )}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-surface p-3">
                    <div className="text-[11px] uppercase text-text-secondary">
                      {copy("Issue Pressure", "Давление проблем", "לחץ תקלות")}
                    </div>
                    <div className="mt-2 text-[22px] font-semibold text-text">
                      {projectRiskDrilldown.summary?.open_issues ?? 0} /{" "}
                      {projectRiskDrilldown.summary?.blocked_open_issues ?? 0}
                    </div>
                    <div className="mt-1 text-[12px] text-text-secondary">
                      {copy(
                        "Open / blocked issues",
                        "Открытые / заблокированные проблемы",
                        "תקלות פתוחות / חסומות",
                      )}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-surface p-3">
                    <div className="text-[11px] uppercase text-text-secondary">
                      {copy("Data Risk", "Риск данных", "סיכון נתונים")}
                    </div>
                    <div className="mt-2 text-[22px] font-semibold text-text">
                      {(projectRiskDrilldown.summary
                        ?.missing_planned_rates_doors ?? 0) +
                        (projectRiskDrilldown.summary
                          ?.missing_actual_rates_doors ?? 0) +
                        (projectRiskDrilldown.summary
                          ?.missing_addon_plans_facts ?? 0)}
                    </div>
                    <div className="mt-1 text-[12px] text-text-secondary">
                      {copy(
                        "rates + addon plan gaps",
                        "тарифы + пробелы в дополнительных планах",
                        "תעריפים + פערי תוכנית תוספות",
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-3">
                  <div className="rounded-lg border border-border bg-surface p-3 xl:col-span-1">
                    <div className="text-[11px] uppercase text-text-secondary">
                      {copy("Drivers", "Драйверы", "דרייברים")}
                    </div>
                    <div className="mt-3 space-y-2">
                      {(projectRiskDrilldown.drivers || []).map((driver) => (
                        <div
                          key={driver.code}
                          className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                        >
                          <div>
                            <div className="text-[12px] font-medium text-text">
                              {driver.label}
                            </div>
                            <div className="text-[11px] text-text-secondary">
                              {driver.severity}
                            </div>
                          </div>
                          <div className="text-[12px] font-semibold text-text">
                            {formatAmount(driver.value)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-surface overflow-hidden xl:col-span-1">
                    <div className="border-b border-border px-3 py-2 text-[11px] uppercase text-text-secondary">
                      {copy(
                        "Stalled Reasons",
                        "Причины задержки",
                        "סיבות לעיכוב",
                      )}
                    </div>
                    <div className="divide-y divide-border-subtle md:hidden">
                      {(projectRiskDrilldown.top_reasons || []).length === 0 ? (
                        <div className="px-3.5 py-3 text-[12px] text-text-secondary">
                          {copy("No stalled reasons.", "Нет причин задержки.", "אין סיבות לעיכוב.")}
                        </div>
                      ) : (
                        (projectRiskDrilldown.top_reasons || []).map((item) => (
                          <article
                            key={`mobile-${item.reason_id || item.reason_name}`}
                            className="px-3.5 py-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 text-[13px] font-semibold leading-5 text-text">
                                {item.reason_name}
                              </div>
                              <div className="shrink-0 rounded-full bg-surface-subtle px-2 py-1 text-[10.5px] font-medium leading-none text-text-secondary">
                                {copy("Doors", "Двери", "דלתות")}: {item.doors}
                              </div>
                            </div>
                            <div className="mt-3 rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                              <div className="text-[10px] uppercase text-text-secondary">
                                {copy(
                                  "Profit Leak",
                                  "Потеря прибыли",
                                  "דליפת רווח",
                                )}
                              </div>
                              <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                                {formatAmount(item.profit_delayed_total)}
                              </div>
                            </div>
                          </article>
                        ))
                      )}
                    </div>
                    <table className="hidden w-full text-[12px] md:table">
                      <thead className="bg-surface-subtle text-text-secondary">
                        <tr>
                          <th className="text-start px-3 py-2 font-medium">
                            {copy("Reason", "Причина", "סיבה")}
                          </th>
                          <th className="text-end px-3 py-2 font-medium">
                            {copy("Doors", "Двери", "דלתות")}
                          </th>
                          <th className="text-end px-3 py-2 font-medium">
                            {copy(
                              "Profit Leak",
                              "Потеря прибыли",
                              "דליפת רווח",
                            )}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(projectRiskDrilldown.top_reasons || []).length ===
                        0 ? (
                          <tr>
                            <td
                              className="px-3 py-3 text-text-secondary"
                              colSpan={3}
                            >
                              {copy("No stalled reasons.", "Нет причин задержки.", "אין סיבות לעיכוב.")}
                            </td>
                          </tr>
                        ) : (
                          (projectRiskDrilldown.top_reasons || []).map(
                            (item) => (
                              <tr
                                key={item.reason_id || item.reason_name}
                                className="border-t border-border"
                              >
                                <td className="px-3 py-2.5 font-medium text-text">
                                  {item.reason_name}
                                </td>
                                <td className="px-3 py-2 text-end">
                                  {item.doors}
                                </td>
                                <td className="px-3 py-2 text-end">
                                  {formatAmount(item.profit_delayed_total)}
                                </td>
                              </tr>
                            ),
                          )
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="rounded-lg border border-border bg-surface overflow-hidden xl:col-span-1">
                    <div className="border-b border-border px-3 py-2 text-[11px] uppercase text-text-secondary">
                      {copy("Risky Orders", "Заказы с риском", "הזמנות בסיכון")}
                    </div>
                    <div className="divide-y divide-border-subtle md:hidden">
                      {(projectRiskDrilldown.risky_orders || []).length ===
                      0 ? (
                        <div className="px-3.5 py-3 text-[12px] text-text-secondary">
                          {copy(
                            "No risky orders.",
                            "Рискованных заказов нет.",
                            "אין הזמנות מסוכנות.",
                          )}
                        </div>
                      ) : (
                        (projectRiskDrilldown.risky_orders || []).map(
                          (item) => (
                            <article
                              key={`mobile-${item.order_number}`}
                              className="px-3.5 py-3"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 text-[13px] font-semibold leading-5 text-text">
                                  {item.order_number}
                                </div>
                                <div className="shrink-0 rounded-full bg-surface-subtle px-2 py-1 text-[10.5px] font-medium leading-none text-text-secondary">
                                  {formatPercent(item.completion_pct)}
                                </div>
                              </div>
                              <div className="mt-3 grid grid-cols-2 gap-2">
                                <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                                  <div className="text-[10px] uppercase text-text-secondary">
                                    {copy("Gap", "Разрыв", "פער")}
                                  </div>
                                  <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                                    {formatAmount(item.revenue_gap_total)}
                                  </div>
                                </div>
                                <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                                  <div className="text-[10px] uppercase text-text-secondary">
                                    {copy("Issues", "Проблемы", "תקלות")}
                                  </div>
                                  <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                                    {item.open_issues}
                                  </div>
                                </div>
                              </div>
                            </article>
                          ),
                        )
                      )}
                    </div>
                    <table className="hidden w-full text-[12px] md:table">
                      <thead className="bg-surface-subtle text-text-secondary">
                        <tr>
                          <th className="text-start px-3 py-2 font-medium">
                            {copy("Order", "Заказ", "הזמנה")}
                          </th>
                          <th className="text-end px-3 py-2 font-medium">
                            {copy("Gap", "Разрыв", "פער")}
                          </th>
                          <th className="text-end px-3 py-2 font-medium">
                            {copy("Issues", "Проблемы", "תקלות")}
                          </th>
                          <th className="text-end px-3 py-2 font-medium">
                            {copy("Completion", "Завершение", "השלמה")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(projectRiskDrilldown.risky_orders || []).length ===
                        0 ? (
                          <tr>
                            <td
                              className="px-3 py-3 text-text-secondary"
                              colSpan={4}
                            >
                              {copy(
                                "No risky orders.",
                                "Рискованных заказов нет.",
                                "אין הזמנות מסוכנות.",
                              )}
                            </td>
                          </tr>
                        ) : (
                          (projectRiskDrilldown.risky_orders || []).map(
                            (item) => (
                              <tr
                                key={item.order_number}
                                className="border-t border-border"
                              >
                                <td className="px-3 py-2.5 font-medium text-text">
                                  {item.order_number}
                                </td>
                                <td className="px-3 py-2 text-end">
                                  {formatAmount(item.revenue_gap_total)}
                                </td>
                                <td className="px-3 py-2 text-end">
                                  {item.open_issues}
                                </td>
                                <td className="px-3 py-2 text-end">
                                  {formatPercent(item.completion_pct)}
                                </td>
                              </tr>
                            ),
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
        </div>

        <div
          id="reports-project-margin-executive"
          className={reportsPanelClass("overflow-hidden")}
        >
          <div className="px-4 py-3 border-b border-border bg-surface-subtle">
            <div className="text-[11px] uppercase text-text-secondary">
              {tt("reports.projectMarginExecutiveTitle")}
            </div>
            <div className="text-[13px] text-text-secondary">
              {tt("reports.projectMarginExecutiveSubtitle")}
            </div>
          </div>
          <ProjectMarginBasis
            mode={topProjectsMarginQuery.data?.pricing_mode ?? riskProjectsMarginQuery.data?.pricing_mode}
            incomplete={topProjectsMarginQuery.data?.incomplete_projects ?? riskProjectsMarginQuery.data?.incomplete_projects}
          />

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 p-4">
            <div className="overflow-hidden rounded-lg border border-border">
              <div className="px-3 py-2 border-b border-border bg-surface-subtle text-[12px] font-medium">
                {tt("reports.topMarginProjects")}
              </div>
              {topProjectsMarginQuery.isLoading ? (
                <div className="px-3 py-4 text-[13px] text-text-secondary">
                  {tt("reports.loadingTopMarginProjects")}
                </div>
              ) : topProjectsMarginQuery.isError ? (
                <div className="px-3 py-4 text-[13px] text-status-problem-fg">
                  {readError(
                    topProjectsMarginQuery.error,
                    tt("reports.failedTopMarginProjects"),
                  )}
                </div>
              ) : (
                <>
                  <div className="divide-y divide-border-subtle md:hidden">
                    {topProjectsMargin.length === 0 ? (
                      <div className="px-3.5 py-3 text-[12px] text-text-secondary">
                        {tt("reports.noProfitableProjects")}
                      </div>
                    ) : (
                      topProjectsMargin.map((item) => (
                        <article
                          key={`mobile-top-${item.project_id}`}
                          className="px-3.5 py-3"
                        >
                          <div className="min-w-0 text-[13px] font-semibold leading-5 text-text">
                            {item.project_name}
                          </div>
                          <ProjectMarginNotice data={item} />
                          <div className="mt-1 text-[11px] leading-4 text-text-secondary">
                            {tt("reports.statusIssues")
                              .replace("{status}", item.project_status)
                              .replace("{issues}", String(item.open_issues))}
                          </div>
                          <div className="mt-3 grid grid-cols-3 gap-2">
                            <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                              <div className="text-[10px] uppercase text-text-secondary">
                                {copy("Profit", "Прибыль", "רווח")}
                              </div>
                              <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                                {formatAmount(item.profit_total)}
                              </div>
                            </div>
                            <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                              <div className="text-[10px] uppercase text-text-secondary">
                                {copy("Margin", "Маржа", "מרווח")}
                              </div>
                              <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                                {formatPercent(item.margin_pct)}
                              </div>
                            </div>
                            <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                              <div className="text-[10px] uppercase text-text-secondary">
                                {copy("Completion", "Завершение", "השלמה")}
                              </div>
                              <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                                {formatPercent(item.completion_pct)}
                              </div>
                            </div>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                  <table className="hidden w-full text-[12px] md:table">
                    <thead className="bg-surface-subtle text-text-secondary">
                      <tr>
                        <th className="text-start px-3 py-2 font-medium">
                          {copy("Project", "Проект", "פרויקט")}
                        </th>
                        <th className="text-end px-3 py-2 font-medium">
                          {copy("Profit", "Прибыль", "רווח")}
                        </th>
                        <th className="text-end px-3 py-2 font-medium">
                          {copy("Margin", "Маржа", "מרווח")}
                        </th>
                        <th className="text-end px-3 py-2 font-medium">
                          {copy("Completion", "Завершение", "השלמה")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {topProjectsMargin.length === 0 ? (
                        <tr>
                          <td
                            className="px-3 py-3 text-text-secondary"
                            colSpan={4}
                          >
                            {tt("reports.noProfitableProjects")}
                          </td>
                        </tr>
                      ) : (
                        topProjectsMargin.map((item) => (
                          <tr
                            key={`top-${item.project_id}`}
                            className="border-t border-border"
                          >
                            <td className="px-3 py-2.5">
                              <div className="font-medium text-text">
                                {item.project_name}
                              </div>
                              <ProjectMarginNotice data={item} />
                              <div className="text-[11px] text-text-secondary">
                                {tt("reports.statusIssues")
                                  .replace("{status}", item.project_status)
                                  .replace(
                                    "{issues}",
                                    String(item.open_issues),
                                  )}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-end">
                              {formatAmount(item.profit_total)}
                            </td>
                            <td className="px-3 py-2 text-end">
                              {formatPercent(item.margin_pct)}
                            </td>
                            <td className="px-3 py-2 text-end">
                              {formatPercent(item.completion_pct)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </>
              )}
            </div>

            <div className="overflow-hidden rounded-lg border border-border">
              <div className="px-3 py-2 border-b border-border bg-surface-subtle text-[12px] font-medium">
                {tt("reports.lowMarginRiskProjects")}
              </div>
              {riskProjectsMarginQuery.isLoading ? (
                <div className="px-3 py-4 text-[13px] text-text-secondary">
                  {tt("reports.loadingLowMarginProjects")}
                </div>
              ) : riskProjectsMarginQuery.isError ? (
                <div className="px-3 py-4 text-[13px] text-status-problem-fg">
                  {readError(
                    riskProjectsMarginQuery.error,
                    tt("reports.failedLowMarginProjects"),
                  )}
                </div>
              ) : (
                <>
                  <div className="divide-y divide-border-subtle md:hidden">
                    {riskProjectsMargin.length === 0 ? (
                      <div className="px-3.5 py-3 text-[12px] text-text-secondary">
                        {tt("reports.noLowMarginProjects")}
                      </div>
                    ) : (
                      riskProjectsMargin.map((item) => (
                        <article
                          key={`mobile-risk-${item.project_id}`}
                          className="px-3.5 py-3"
                        >
                          <div className="min-w-0 text-[13px] font-semibold leading-5 text-text">
                            {item.project_name}
                          </div>
                          <ProjectMarginNotice data={item} />
                          <div className="mt-1 text-[11px] leading-4 text-text-secondary">
                            {tt("reports.completionIssues")
                              .replace(
                                "{completion}",
                                formatPercent(item.completion_pct),
                              )
                              .replace("{issues}", String(item.open_issues))}
                          </div>
                          <div className="mt-3 grid grid-cols-3 gap-2">
                            <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                              <div className="text-[10px] uppercase text-text-secondary">
                                {copy("Profit", "Прибыль", "רווח")}
                              </div>
                              <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                                {formatAmount(item.profit_total)}
                              </div>
                            </div>
                            <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                              <div className="text-[10px] uppercase text-text-secondary">
                                {copy("Margin", "Маржа", "מרווח")}
                              </div>
                              <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                                {formatPercent(item.margin_pct)}
                              </div>
                            </div>
                            <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                              <div className="text-[10px] uppercase text-text-secondary">
                                {copy(
                                  "Data Risk",
                                  "Риск данных",
                                  "סיכון נתונים",
                                )}
                              </div>
                              <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                                {projectMarginDataRisk(item)}
                              </div>
                            </div>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                  <table className="hidden w-full text-[12px] md:table">
                    <thead className="bg-surface-subtle text-text-secondary">
                      <tr>
                        <th className="text-start px-3 py-2 font-medium">
                          {copy("Project", "Проект", "פרויקט")}
                        </th>
                        <th className="text-end px-3 py-2 font-medium">
                          {copy("Profit", "Прибыль", "רווח")}
                        </th>
                        <th className="text-end px-3 py-2 font-medium">
                          {copy("Margin", "Маржа", "מרווח")}
                        </th>
                        <th className="text-end px-3 py-2 font-medium">
                          {copy("Data Risk", "Риск данных", "סיכון נתונים")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {riskProjectsMargin.length === 0 ? (
                        <tr>
                          <td
                            className="px-3 py-3 text-text-secondary"
                            colSpan={4}
                          >
                            {tt("reports.noLowMarginProjects")}
                          </td>
                        </tr>
                      ) : (
                        riskProjectsMargin.map((item) => (
                          <tr
                            key={`risk-${item.project_id}`}
                            className="border-t border-border"
                          >
                            <td className="px-3 py-2.5">
                              <div className="font-medium text-text">
                                {item.project_name}
                              </div>
                              <ProjectMarginNotice data={item} />
                              <div className="text-[11px] text-text-secondary">
                                {tt("reports.completionIssues")
                                  .replace(
                                    "{completion}",
                                    formatPercent(item.completion_pct),
                                  )
                                  .replace(
                                    "{issues}",
                                    String(item.open_issues),
                                  )}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-end">
                              {formatAmount(item.profit_total)}
                            </td>
                            <td className="px-3 py-2 text-end">
                              {formatPercent(item.margin_pct)}
                            </td>
                            <td className="px-3 py-2 text-end">
                              {projectMarginDataRisk(item)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          </div>
        </div>

        <div
          id="reports-installer-profitability-matrix"
          className={reportsPanelClass("overflow-hidden")}
        >
          <div className="px-4 py-3 border-b border-border bg-surface-subtle flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase text-text-secondary">
                {tt("reports.riskConcentrationTitle")}
              </div>
              <div className="text-[13px] text-text-secondary">
                {tt("reports.riskConcentrationSubtitle")}
              </div>
            </div>
            <div className="text-end text-[11px] text-text-secondary">
              {riskConcentration?.generated_at
                ? formatDateTime(riskConcentration.generated_at)
                : tt("reports.notAvailableShort")}
            </div>
          </div>

          {riskConcentrationQuery.isLoading ? (
            <div className="px-4 py-6 text-[13px] text-text-secondary">
              {tt("reports.loadingRiskConcentration")}
            </div>
          ) : riskConcentrationQuery.isError ? (
            <div className="px-4 py-6 text-[13px] text-status-problem-fg">
              {readError(
                riskConcentrationQuery.error,
                tt("reports.failedRiskConcentration"),
              )}
            </div>
          ) : (
            <div className="p-4 space-y-4">
              <IssueExposureBasis data={riskConcentration?.summary} />
              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-lg border border-border bg-surface p-3">
                  <div className="text-[11px] uppercase text-text-secondary">
                    {tt("reports.delayedProfitLabel")}
                  </div>
                  <div className="mt-2 text-[22px] font-semibold text-status-problem-fg">
                    {formatAmount(
                      riskConcentration?.summary?.delayed_profit_total,
                    )}
                  </div>
                  <div className="mt-1 text-[12px] text-text-secondary">
                    {tt("reports.openIssueRisk").replace(
                      "{amount}",
                      formatAmount(
                        riskConcentration?.summary?.open_issue_profit_at_risk,
                      ),
                    )}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-surface p-3">
                  <div className="text-[11px] uppercase text-text-secondary">
                    {tt("reports.blockedIssueRisk")}
                  </div>
                  <div className="mt-2 text-[22px] font-semibold text-status-warning-fg">
                    {formatAmount(
                      riskConcentration?.summary?.blocked_issue_profit_at_risk,
                    )}
                  </div>
                  <div className="mt-1 text-[12px] text-text-secondary">
                    {tt("reports.worstInstaller").replace(
                      "{amount}",
                      formatAmount(
                        riskConcentration?.summary
                          ?.worst_installer_profit_total,
                      ),
                    )}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-surface p-3">
                  <div className="text-[11px] uppercase text-text-secondary">
                    {copy("Projects / orders shown", "Объекты / заказы в выборке", "פרויקטים / הזמנות מוצגים")}
                  </div>
                  <div className="mt-2 text-[22px] font-semibold text-text">
                    {riskConcentration?.summary?.risky_projects ?? 0} /{" "}
                    {riskConcentration?.summary?.risky_orders ?? 0}
                  </div>
                  <div className="mt-1 text-[12px] text-text-secondary">
                    {tt("reports.worstProject").replace(
                      "{amount}",
                      formatAmount(
                        riskConcentration?.summary?.worst_project_profit_total,
                      ),
                    )}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-surface p-3">
                  <div className="text-[11px] uppercase text-text-secondary">
                    {copy("Risky Installers", "Рискованные монтажники", "מתקינים מסוכנים")}
                  </div>
                  <div className="mt-2 text-[22px] font-semibold text-text">
                    {riskConcentration?.summary?.risky_installers ?? 0}
                  </div>
                  <div className="mt-1 text-[12px] text-text-secondary">
                    {copy("Lowest known order profit", "Минимальная известная прибыль заказа", "הרווח הידוע הנמוך ביותר להזמנה")}{" "}
                    {formatAmount(
                      riskConcentration?.summary?.worst_order_profit_total,
                    )}
                  </div>
                </div>
              </div>

              {(riskConcentration?.projects || []).length === 0 &&
                (riskConcentration?.orders || []).length === 0 &&
                (riskConcentration?.installers || []).length === 0 && (
                  <SectionMessage
                    title={copy("No concentrated risk yet", "Скопления рисков пока нет", "אין עדיין ריכוז סיכונים")}
                    detail={copy(
                      "This tenant does not currently have enough delayed doors, open issues or low-margin rows to populate the cross-cutting executive risk view.",
                      "Сейчас недостаточно просроченных дверей, открытых проблем или низкомаржинальных строк для сводного анализа рисков.",
                      "כרגע אין מספיק דלתות באיחור, תקלות פתוחות או שורות ברווחיות נמוכה להצגת סיכונים משולבת.",
                    )}
                  />
                )}

              <div className="grid gap-4 xl:grid-cols-3">
                <div className="rounded-lg border border-border bg-surface overflow-hidden">
                  <div className="border-b border-border px-3 py-2 text-[11px] uppercase text-text-secondary">
                    {copy("Projects at Risk", "Проекты под угрозой", "פרויקטים בסיכון")}
                  </div>
                  <ProjectMarginBasis
                    mode={riskConcentration?.projects?.[0]?.pricing_mode}
                    incomplete={riskConcentration?.summary?.incomplete_projects}
                  />
                  <div className="divide-y divide-border-subtle md:hidden">
                    {(riskConcentration?.projects || []).length === 0 ? (
                      <div className="px-3.5 py-3 text-[12px] text-text-secondary">
                        {copy("No risky projects.", "Никаких рискованных проектов.", "אין פרויקטים מסוכנים.")}
                      </div>
                    ) : (
                      (riskConcentration?.projects || []).map((item) => (
                        <article
                          key={`mobile-${item.project_id}`}
                          className="px-3.5 py-3"
                        >
                          <div className="min-w-0 text-[13px] font-semibold leading-5 text-text">
                            {item.project_name}
                          </div>
                          <ProjectMarginNotice data={item} />
                          <div className="mt-1 text-[11px] text-text-secondary">
                            {copy("Completion", "Завершение", "השלמה")} {formatPercent(item.completion_pct)}
                          </div>
                          <div className="mt-3 grid grid-cols-3 gap-2">
                            <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                              <div className="text-[10px] uppercase text-text-secondary">
                                {copy("Profit", "Прибыль", "רווח")}
                              </div>
                              <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                                {formatAmount(item.profit_total)}
                              </div>
                            </div>
                            <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                              <div className="text-[10px] uppercase text-text-secondary">
                                {copy("Margin", "Маржа", "מרווח")}
                              </div>
                              <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                                {formatPercent(item.margin_pct)}
                              </div>
                            </div>
                            <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                              <div className="text-[10px] uppercase text-text-secondary">
                                {copy("Issues", "Проблемы", "תקלות")}
                              </div>
                              <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                                {item.open_issues}
                              </div>
                            </div>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                  <table className="hidden w-full text-[12px] md:table">
                    <thead className="bg-surface-subtle text-text-secondary">
                      <tr>
                        <th className="text-start px-3 py-2 font-medium">
                          {copy("Project", "Проект", "פרויקט")}
                        </th>
                        <th className="text-end px-3 py-2 font-medium">
                          {copy("Profit", "Прибыль", "רווח")}
                        </th>
                        <th className="text-end px-3 py-2 font-medium">
                          {copy("Margin", "Маржа", "מרווח")}
                        </th>
                        <th className="text-end px-3 py-2 font-medium">
                          {copy("Issues", "Проблемы", "תקלות")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(riskConcentration?.projects || []).length === 0 ? (
                        <tr>
                          <td
                            className="px-3 py-3 text-text-secondary"
                            colSpan={4}
                          >
                            {copy("No risky projects.", "Никаких рискованных проектов.", "אין פרויקטים מסוכנים.")}
                          </td>
                        </tr>
                      ) : (
                        (riskConcentration?.projects || []).map((item) => (
                          <tr
                            key={item.project_id}
                            className="border-t border-border"
                          >
                            <td className="px-3 py-2.5">
                              <div className="font-medium text-text">
                                {item.project_name}
                              </div>
                              <ProjectMarginNotice data={item} />
                              <div className="text-[11px] text-text-secondary">
                                {copy("Completion", "Завершение", "השלמה")} {formatPercent(item.completion_pct)}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-end">
                              {formatAmount(item.profit_total)}
                            </td>
                            <td className="px-3 py-2 text-end">
                              {formatPercent(item.margin_pct)}
                            </td>
                            <td className="px-3 py-2 text-end">
                              {item.open_issues}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="rounded-lg border border-border bg-surface overflow-hidden">
                  <div className="border-b border-border px-3 py-2 text-[11px] uppercase text-text-secondary">
                    {copy("Orders by lowest known profit", "Заказы по минимальной известной прибыли", "הזמנות לפי הרווח הידוע הנמוך ביותר")}
                  </div>
                  <OrderFinancialBasis data={{
                    pricing_mode: riskConcentration?.summary?.order_pricing_mode,
                    incomplete_orders: riskConcentration?.summary?.incomplete_orders,
                    total: riskConcentration?.summary?.order_rows_total,
                  }} shown={riskConcentration?.orders?.length ?? 0} />
                  <div className="divide-y divide-border-subtle md:hidden">
                    {(riskConcentration?.orders || []).length === 0 ? (
                      <div className="px-3.5 py-3 text-[12px] text-text-secondary">
                        {copy("No order financial rows.", "Нет финансовых данных по заказам.", "אין נתונים כספיים להזמנות.")}
                      </div>
                    ) : (
                      (riskConcentration?.orders || []).map((item) => (
                        <article
                          key={`mobile-${item.order_number}`}
                          className="px-3.5 py-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 text-[13px] font-semibold leading-5 text-text">
                              {item.order_number}
                            </div>
                            <div className="shrink-0 rounded-full bg-surface-subtle px-2 py-1 text-[10.5px] font-medium leading-none text-text-secondary">
                              {formatPercent(item.completion_pct)}
                            </div>
                          </div>
                          <InstallerFinancialNotice data={item} />
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                              <div className="text-[10px] uppercase text-text-secondary">
                                {copy("Profit", "Прибыль", "רווח")}
                              </div>
                              <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                                {formatAmount(item.profit_total)}
                              </div>
                            </div>
                            <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                              <div className="text-[10px] uppercase text-text-secondary">
                                {copy("Delayed", "Задержка", "עיכוב")}
                              </div>
                              <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                                {item.not_installed_doors}
                              </div>
                            </div>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                  <table className="hidden w-full text-[12px] md:table">
                    <thead className="bg-surface-subtle text-text-secondary">
                      <tr>
                        <th className="text-start px-3 py-2 font-medium">
                          {copy("Order", "Заказ", "הזמנה")}
                        </th>
                        <th className="text-end px-3 py-2 font-medium">
                          {copy("Profit", "Прибыль", "רווח")}
                        </th>
                        <th className="text-end px-3 py-2 font-medium">
                          {copy("Delayed", "Задержка", "עיכוב")}
                        </th>
                        <th className="text-end px-3 py-2 font-medium">
                          {copy("Completion", "Завершение", "השלמה")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(riskConcentration?.orders || []).length === 0 ? (
                        <tr>
                          <td
                            className="px-3 py-3 text-text-secondary"
                            colSpan={4}
                          >
                            {copy("No order financial rows.", "Нет финансовых данных по заказам.", "אין נתונים כספיים להזמנות.")}
                          </td>
                        </tr>
                      ) : (
                        (riskConcentration?.orders || []).map((item) => (
                          <tr
                            key={item.order_number}
                            className="border-t border-border"
                          >
                            <td className="px-3 py-2.5 font-medium text-text">
                              {item.order_number}
                              <InstallerFinancialNotice data={item} />
                            </td>
                            <td className="px-3 py-2 text-end">
                              {formatAmount(item.profit_total)}
                            </td>
                            <td className="px-3 py-2 text-end">
                              {item.not_installed_doors}
                            </td>
                            <td className="px-3 py-2 text-end">
                              {formatPercent(item.completion_pct)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="rounded-lg border border-border bg-surface overflow-hidden">
                  <div className="border-b border-border px-3 py-2 text-[11px] uppercase text-text-secondary">
                    {copy("Installer financial risk", "Финансовые риски монтажников", "סיכון כספי לפי מתקין")}
                  </div>
                  <InstallerFinancialBasis data={{
                    pricing_mode: riskConcentration?.summary?.installer_pricing_mode,
                    incomplete_items: riskConcentration?.summary?.incomplete_installers,
                    unassigned_completed_works: riskConcentration?.summary?.unassigned_completed_works,
                  }} />
                  <div className="divide-y divide-border-subtle md:hidden">
                    {(riskConcentration?.installers || []).length === 0 ? (
                      <div className="px-3.5 py-3 text-[12px] text-text-secondary">
                        {copy("No installer financial rows.", "Нет финансовых данных по монтажникам.", "אין נתונים כספיים למתקינים.")}
                      </div>
                    ) : (
                      (riskConcentration?.installers || []).map((item) => (
                        <article
                          key={`mobile-${item.installer_id}`}
                          className="px-3.5 py-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-[13px] font-semibold leading-5 text-text">
                                {item.installer_name}
                              </div>
                              <div className="mt-1 text-[11px] text-text-secondary">
                                {copy("Issues", "Проблемы", "תקלות")} {item.open_issues}
                              </div>
                            </div>
                            <span
                              className={cn(
                                "max-w-[50%] shrink-0 break-words rounded border px-2 py-0.5 text-[11px] font-semibold",
                                installerPerformanceBandClass(
                                  item.performance_band,
                                ),
                              )}
                            >
                              <InstallerFinancialBand band={item.performance_band} />
                            </span>
                          </div>
                          <InstallerFinancialNotice data={item} />
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                              <div className="text-[10px] uppercase text-text-secondary">
                                {copy("Profit", "Прибыль", "רווח")}
                              </div>
                              <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                                {formatAmount(item.profit_total)}
                              </div>
                            </div>
                            <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                              <div className="text-[10px] uppercase text-text-secondary">
                                {copy("Margin", "Маржа", "מרווח")}
                              </div>
                              <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                                {formatPercent(item.margin_pct)}
                              </div>
                            </div>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                  <table className="hidden w-full text-[12px] md:table">
                    <thead className="bg-surface-subtle text-text-secondary">
                      <tr>
                        <th className="text-start px-3 py-2 font-medium">
                          {copy("Installer", "Монтажник", "מתקין")}
                        </th>
                        <th className="text-start px-3 py-2 font-medium">
                          {copy("Band", "Сегмент", "קטגוריה")}
                        </th>
                        <th className="text-end px-3 py-2 font-medium">
                          {copy("Profit", "Прибыль", "רווח")}
                        </th>
                        <th className="text-end px-3 py-2 font-medium">
                          {copy("Margin", "Маржа", "מרווח")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(riskConcentration?.installers || []).length === 0 ? (
                        <tr>
                          <td
                            className="px-3 py-3 text-text-secondary"
                            colSpan={4}
                          >
                            {copy("No installer financial rows.", "Нет финансовых данных по монтажникам.", "אין נתונים כספיים למתקינים.")}
                          </td>
                        </tr>
                      ) : (
                        (riskConcentration?.installers || []).map((item) => {
                          const bandClass = installerPerformanceBandClass(
                            item.performance_band,
                          );
                          return (
                            <tr
                              key={item.installer_id}
                              className="border-t border-border"
                            >
                              <td className="px-3 py-2.5">
                                <div className="font-medium text-text">
                                  {item.installer_name}
                                </div>
                                <div className="text-[11px] text-text-secondary">
                                  {copy("Issues", "Проблемы", "תקלות")} {item.open_issues}
                                </div>
                                <InstallerFinancialNotice data={item} />
                              </td>
                              <td className="px-3 py-2.5">
                                <span
                                  className={cn(
                                    "inline-flex rounded border px-2 py-0.5 text-[11px] font-semibold",
                                    bandClass,
                                  )}
                                >
                                  <InstallerFinancialBand band={item.performance_band} />
                                </span>
                              </td>
                              <td className="px-3 py-2 text-end">
                                {formatAmount(item.profit_total)}
                              </td>
                              <td className="px-3 py-2 text-end">
                                {formatPercent(item.margin_pct)}
                              </td>
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

        <div
          id="reports-installer-cross-view"
          className={reportsPanelClass("overflow-hidden")}
        >
          <div className="px-4 py-3 border-b border-border bg-surface-subtle flex flex-col items-stretch gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="text-[11px] uppercase text-text-secondary">
                {tt("reports.installerProfitabilityMatrix")}
              </div>
              <div className="text-[13px] text-text-secondary">
                {tt("reports.installerProfitabilitySubtitle")}
              </div>
            </div>
            <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 xl:flex xl:flex-wrap xl:items-center xl:justify-end">
              <select
                aria-label={copy("Installer Matrix Sort", "Сортировка матрицы монтажников", "מיון מטריצת מתקינים")}
                value={installerMatrixSortBy}
                onChange={(e) =>
                  setInstallerMatrixSortBy(
                    e.target.value as InstallerMatrixSortBy,
                  )
                }
                className="h-9 w-full min-w-0 rounded-md border border-border bg-surface px-2 text-[13px] xl:w-auto xl:max-w-[220px]"
              >
                {INSTALLER_MATRIX_SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {optionLabel(option.label)}
                  </option>
                ))}
              </select>
              <select
                aria-label={copy("Installer Matrix Direction", "Направление сортировки матрицы монтажников", "כיוון מיון מטריצת מתקינים")}
                value={installerMatrixSortDir}
                onChange={(e) =>
                  setInstallerMatrixSortDir(e.target.value as SortDir)
                }
                className="h-9 w-full min-w-0 rounded-md border border-border bg-surface px-2 text-[13px] xl:w-auto xl:max-w-[220px]"
              >
                {SORT_DIR_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!installerProfitabilityMatrixQuery.isError && <InstallerFinancialBasis data={installerProfitabilityMatrixQuery.data} />}
          {installerProfitabilityMatrixQuery.isLoading ? (
            <div className="px-4 py-6 text-[13px] text-text-secondary">
              {tt("reports.loadingInstallerProfitability")}
            </div>
          ) : installerProfitabilityMatrixQuery.isError ? (
            <div className="px-4 py-6 text-[13px] text-status-problem-fg">
              {readError(
                installerProfitabilityMatrixQuery.error,
                copy(
                  "Failed to load installer profitability matrix",
                  "Не удалось загрузить матрицу прибыльности монтажников",
                  "טעינת מטריצת רווחיות המתקינים נכשלה",
                ),
              )}
            </div>
          ) : installerProfitabilityMatrix.length === 0 ? (
            <div className="px-4 py-6 text-[13px] text-text-secondary">
              {copy(
                "No installer profitability rows.",
                "Нет строк прибыльности по монтажникам.",
                "אין שורות רווחיות למתקינים.",
              )}
            </div>
          ) : (
            <>
              <div className="divide-y divide-border-subtle md:hidden">
                {installerProfitabilityMatrix.map((item) => (
                  <article
                    key={`mobile-${item.installer_id}`}
                    className="px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold leading-5 text-text">
                          {item.installer_name}
                        </div>
                        <div className="mt-1 text-[11px] leading-4 text-text-secondary">
                          {tt("reports.projectsAddons")
                            .replace("{projects}", String(item.active_projects))
                            .replace(
                              "{addons}",
                              formatAmount(item.addons_done_qty),
                            )}
                        </div>
                      </div>
                      <span
                        className={cn(
                          "max-w-[50%] shrink-0 break-words rounded border px-2 py-0.5 text-[11px] font-semibold",
                          installerPerformanceBandClass(item.performance_band),
                        )}
                      >
                        <InstallerFinancialBand band={item.performance_band} />
                      </span>
                    </div>
                    <InstallerFinancialNotice data={item} />
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                        <div className="text-[10px] uppercase text-text-secondary">
                          {copy("Installed", "Смонтировано", "הותקן")}
                        </div>
                        <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                          {item.installed_doors}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                        <div className="text-[10px] uppercase text-text-secondary">
                          {copy("Revenue", "Выручка", "הכנסה")}
                        </div>
                        <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                          {formatAmount(item.revenue_total)}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                        <div className="text-[10px] uppercase text-text-secondary">
                          {copy("Earned", "Начислено", "שכר שנצבר")}
                        </div>
                        <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                          {formatAmount(item.payroll_total)}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                        <div className="text-[10px] uppercase text-text-secondary">
                          {copy("Profit", "Прибыль", "רווח")}
                        </div>
                        <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                          {formatAmount(item.profit_total)}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                        <div className="text-[10px] uppercase text-text-secondary">
                          {copy("Margin", "Маржа", "מרווח")}
                        </div>
                        <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                          {formatPercent(item.margin_pct)}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                        <div className="text-[10px] uppercase text-text-secondary">
                          {copy("Issues", "Проблемы", "תקלות")}
                        </div>
                        <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                          {item.open_issues}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                        <div className="text-[10px] uppercase text-text-secondary">
                          {copy("Data Risk", "Риск данных", "סיכון נתונים")}
                        </div>
                        <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                          {installerFinancialDataRisk(item)}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              <div className="hidden overflow-auto md:block">
                <table className="w-full text-[12px]">
                  <thead className="bg-surface-subtle text-text-secondary">
                    <tr>
                      <th className="text-start px-3 py-2 font-medium">
                        {copy("Installer", "Монтажник", "מתקין")}
                      </th>
                      <th className="text-start px-3 py-2 font-medium">
                        {copy("Band", "Сегмент", "קטגוריה")}
                      </th>
                      <th className="text-end px-3 py-2 font-medium">
                        {copy("Installed", "Смонтировано", "הותקן")}
                      </th>
                      <th className="text-end px-3 py-2 font-medium">
                        {copy("Revenue", "Выручка", "הכנסה")}
                      </th>
                      <th className="text-end px-3 py-2 font-medium">
                        {copy("Earned", "Начислено", "שכר שנצבר")}
                      </th>
                      <th className="text-end px-3 py-2 font-medium">
                        {copy("Profit", "Прибыль", "רווח")}
                      </th>
                      <th className="text-end px-3 py-2 font-medium">
                        {copy("Margin", "Маржа", "מרווח")}
                      </th>
                      <th className="text-end px-3 py-2 font-medium">
                        {copy("Profit / Door", "Прибыль / дверь", "רווח / דלת")}
                      </th>
                      <th className="text-end px-3 py-2 font-medium">
                        {copy("Issues", "Проблемы", "תקלות")}
                      </th>
                      <th className="text-end px-3 py-2 font-medium">
                        {copy("Data Risk", "Риск данных", "סיכון נתונים")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {installerProfitabilityMatrix.map((item) => {
                      const bandClass = installerPerformanceBandClass(
                        item.performance_band,
                      );
                      return (
                        <tr
                          key={item.installer_id}
                          className="border-t border-border"
                        >
                          <td className="px-3 py-2.5">
                            <div className="font-medium text-text">
                              {item.installer_name}
                            </div>
                            <div className="text-[11px] text-text-secondary">
                              {tt("reports.projectsAddons")
                                .replace(
                                  "{projects}",
                                  String(item.active_projects),
                                )
                                .replace(
                                  "{addons}",
                                  formatAmount(item.addons_done_qty),
                                )}
                            </div>
                            <InstallerFinancialNotice data={item} />
                          </td>
                          <td className="px-3 py-2.5">
                            <span
                              className={cn(
                                "inline-flex rounded border px-2 py-0.5 text-[11px] font-semibold",
                                bandClass,
                              )}
                            >
                              <InstallerFinancialBand band={item.performance_band} />
                            </span>
                          </td>
                          <td className="px-3 py-2 text-end">
                            {item.installed_doors}
                          </td>
                          <td className="px-3 py-2 text-end">
                            {formatAmount(item.revenue_total)}
                          </td>
                          <td className="px-3 py-2 text-end">
                            {formatAmount(item.payroll_total)}
                          </td>
                          <td className="px-3 py-2 text-end">
                            {formatAmount(item.profit_total)}
                          </td>
                          <td className="px-3 py-2 text-end">
                            {formatPercent(item.margin_pct)}
                          </td>
                          <td className="px-3 py-2 text-end">
                            {formatAmount(item.avg_profit_per_door)}
                          </td>
                          <td className="px-3 py-2 text-end">
                            {item.open_issues}
                          </td>
                          <td className="px-3 py-2 text-end">
                            {installerFinancialDataRisk(item)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div
          id="reports-installers-kpi"
          className={reportsPanelClass("overflow-hidden")}
        >
          <div className="px-4 py-3 border-b border-border bg-surface-subtle flex flex-col items-stretch gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="text-[11px] uppercase text-text-secondary">
                {tt("reports.installerCrossViewTitle")}
              </div>
              <div className="text-[13px] text-text-secondary">
                {tt("reports.installerCrossViewSubtitle")}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <select
                aria-label={copy("Installer Project Sort", "Сортировка объектов монтажника", "מיון פרויקטים של מתקין")}
                value={installerProjectSortBy}
                onChange={(e) =>
                  setInstallerProjectSortBy(
                    e.target.value as InstallerProjectSortBy,
                  )
                }
                className="h-9 w-full min-w-0 rounded-md border border-border bg-surface px-2 text-[13px] xl:w-auto xl:max-w-[180px]"
              >
                {INSTALLER_PROJECT_SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {optionLabel(option.label)}
                  </option>
                ))}
              </select>
              <select
                aria-label={copy("Installer Project Direction", "Направление сортировки объектов монтажника", "כיוון מיון פרויקטים של מתקין")}
                value={installerProjectSortDir}
                onChange={(e) =>
                  setInstallerProjectSortDir(e.target.value as SortDir)
                }
                className="h-9 w-full min-w-0 rounded-md border border-border bg-surface px-2 text-[13px] xl:w-auto xl:max-w-[120px]"
              >
                {SORT_DIR_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!installerProjectProfitabilityQuery.isError && <InstallerFinancialBasis data={installerProjectProfitabilityQuery.data} />}
          {installerProjectProfitabilityQuery.isLoading ? (
            <div className="px-4 py-6 text-[13px] text-text-secondary">
              {tt("reports.loadingInstallerCrossView")}
            </div>
          ) : installerProjectProfitabilityQuery.isError ? (
            <div className="px-4 py-6 text-[13px] text-status-problem-fg">
              {readError(
                installerProjectProfitabilityQuery.error,
                copy(
                  "Failed to load installer-project cross-view",
                  "Не удалось загрузить перекрестное представление проекта монтажника.",
                  "טעינת הצגה צולבת של מתקין-פרויקט נכשלה",
                ),
              )}
            </div>
          ) : installerProjectProfitability.length === 0 ? (
            <div className="px-4 py-6">
              <SectionMessage
                title={copy(
                  "No installer-project cross-view rows",
                  "Нет строк перекрестного просмотра монтажника и проекта.",
                  "אין שורות צולבות של פרויקט מתקין",
                )}
                detail={copy(
                  "This view appears after installed doors or add-on facts create measurable profitability per installer and project.",
                  "Это представление появляется после того, как установленные двери или дополнительные элементы создают измеримую прибыльность для каждого монтажника и проекта.",
                  "תצוגה זו מופיעה לאחר שדלתות מותקנות או עובדות תוספות יוצרות רווחיות מדידה לכל מתקין ופרויקט.",
                )}
              />
            </div>
          ) : (
            <>
              <div className="divide-y divide-border-subtle md:hidden">
                {installerProjectProfitability.map((item) => (
                  <article
                    key={`mobile-${item.installer_id}-${item.project_id}`}
                    className="px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold leading-5 text-text">
                          {item.installer_name}
                        </div>
                        <div className="mt-1 text-[11px] leading-4 text-text-secondary">
                          {item.project_name ?? copy("Project unavailable", "Объект недоступен", "הפרויקט אינו זמין")}
                        </div>
                      </div>
                      <span
                        className={cn(
                          "max-w-[50%] shrink-0 break-words rounded border px-2 py-0.5 text-[11px] font-semibold",
                          installerPerformanceBandClass(item.performance_band),
                        )}
                      >
                        <InstallerFinancialBand band={item.performance_band} />
                      </span>
                    </div>
                    <InstallerFinancialNotice data={item} />
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                        <div className="text-[10px] uppercase text-text-secondary">
                          {copy("Installed", "Смонтировано", "הותקן")}
                        </div>
                        <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                          {item.installed_doors}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                        <div className="text-[10px] uppercase text-text-secondary">
                          {copy("Revenue", "Выручка", "הכנסה")}
                        </div>
                        <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                          {formatAmount(item.revenue_total)}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                        <div className="text-[10px] uppercase text-text-secondary">
                          {copy("Earned", "Начислено", "שכר שנצבר")}
                        </div>
                        <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                          {formatAmount(item.payroll_total)}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                        <div className="text-[10px] uppercase text-text-secondary">
                          {copy("Profit", "Прибыль", "רווח")}
                        </div>
                        <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                          {formatAmount(item.profit_total)}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                        <div className="text-[10px] uppercase text-text-secondary">
                          {copy("Margin", "Маржа", "מרווח")}
                        </div>
                        <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                          {formatPercent(item.margin_pct)}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                        <div className="text-[10px] uppercase text-text-secondary">
                          {copy("Issues", "Проблемы", "תקלות")}
                        </div>
                        <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                          {item.open_issues}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                        <div className="text-[10px] uppercase text-text-secondary">
                          {copy("Data Risk", "Риск данных", "סיכון נתונים")}
                        </div>
                        <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                          {installerFinancialDataRisk(item)}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              <div className="hidden overflow-auto md:block">
                <table className="w-full text-[12px]">
                  <thead className="bg-surface-subtle text-text-secondary">
                    <tr>
                      <th className="text-start px-3 py-2 font-medium">
                        {copy(
                          "Installer / Project",
                          "Монтажник / проект",
                          "מתקין / פרויקט",
                        )}
                      </th>
                      <th className="text-start px-3 py-2 font-medium">
                        {copy("Band", "Сегмент", "קטגוריה")}
                      </th>
                      <th className="text-end px-3 py-2 font-medium">
                        {copy("Installed", "Смонтировано", "הותקן")}
                      </th>
                      <th className="text-end px-3 py-2 font-medium">
                        {copy("Revenue", "Выручка", "הכנסה")}
                      </th>
                      <th className="text-end px-3 py-2 font-medium">
                        {copy("Earned", "Начислено", "שכר שנצבר")}
                      </th>
                      <th className="text-end px-3 py-2 font-medium">
                        {copy("Profit", "Прибыль", "רווח")}
                      </th>
                      <th className="text-end px-3 py-2 font-medium">
                        {copy("Margin", "Маржа", "מרווח")}
                      </th>
                      <th className="text-end px-3 py-2 font-medium">
                        {copy("Profit / Door", "Прибыль / дверь", "רווח / דלת")}
                      </th>
                      <th className="text-end px-3 py-2 font-medium">
                        {copy("Issues", "Проблемы", "תקלות")}
                      </th>
                      <th className="text-end px-3 py-2 font-medium">
                        {copy("Data Risk", "Риск данных", "סיכון נתונים")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {installerProjectProfitability.map((item) => {
                      const bandClass = installerPerformanceBandClass(
                        item.performance_band,
                      );
                      return (
                        <tr
                          key={`${item.installer_id}-${item.project_id}`}
                          className="border-t border-border"
                        >
                          <td className="px-3 py-2.5">
                            <div className="font-medium text-text">
                              {item.installer_name}
                            </div>
                            <div className="text-[11px] text-text-secondary">
                              {item.project_name ?? copy("Project unavailable", "Объект недоступен", "הפרויקט אינו זמין")}
                            </div>
                            <InstallerFinancialNotice data={item} />
                          </td>
                          <td className="px-3 py-2.5">
                            <span
                              className={cn(
                                "inline-flex rounded border px-2 py-0.5 text-[11px] font-semibold",
                                bandClass,
                              )}
                            >
                              <InstallerFinancialBand band={item.performance_band} />
                            </span>
                          </td>
                          <td className="px-3 py-2 text-end">
                            {item.installed_doors}
                          </td>
                          <td className="px-3 py-2 text-end">
                            {formatAmount(item.revenue_total)}
                          </td>
                          <td className="px-3 py-2 text-end">
                            {formatAmount(item.payroll_total)}
                          </td>
                          <td className="px-3 py-2 text-end">
                            {formatAmount(item.profit_total)}
                          </td>
                          <td className="px-3 py-2 text-end">
                            {formatPercent(item.margin_pct)}
                          </td>
                          <td className="px-3 py-2 text-end">
                            {formatAmount(item.avg_profit_per_door)}
                          </td>
                          <td className="px-3 py-2 text-end">
                            {item.open_issues}
                          </td>
                          <td className="px-3 py-2 text-end">
                            {installerFinancialDataRisk(item)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div
          id="reports-order-numbers-kpi"
          className={reportsPanelClass("overflow-hidden")}
        >
          <div className="px-4 py-3 border-b border-border bg-surface-subtle flex flex-col items-stretch gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="text-[11px] uppercase text-text-secondary">
                {tt("reports.installersKpiTitle")}
              </div>
              <div className="text-[13px] text-text-secondary">
                {tt("reports.installersKpiSubtitle")}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <select
                aria-label={copy("Installers: sort by", "Монтажники: сортировать по", "מתקינים: מיון לפי")}
                value={installersSortBy}
                onChange={(e) => {
                  setInstallersSortBy(e.target.value as InstallersSortBy);
                  setInstallersKpiOffset(0);
                }}
                className="h-9 rounded-md border border-border bg-surface px-2 text-[13px]"
              >
                {INSTALLERS_SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                aria-label={copy("Installers: sort direction", "Монтажники: направление сортировки", "מתקינים: כיוון מיון")}
                value={installersSortDir}
                onChange={(e) => {
                  setInstallersSortDir(e.target.value as SortDir);
                  setInstallersKpiOffset(0);
                }}
                className="h-9 rounded-md border border-border bg-surface px-2 text-[13px]"
              >
                {SORT_DIR_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => exportInstallersKpiMutation.mutate()}
                disabled={
                  !canExportFinancialReports ||
                  exportInstallersKpiMutation.isPending
                }
                title={ratesScopeHint}
                className="h-9 w-full rounded-md border border-border bg-surface px-3 text-[12px] disabled:opacity-50 xl:w-auto"
              >
                {tt("reports.exportInstallersCsv")}
              </button>
            </div>
          </div>

          {!installersKpiQuery.isError && <InstallerFinancialBasis data={installersKpiQuery.data} period />}
          <div className="hidden md:grid grid-cols-[minmax(0,1fr)_repeat(5,minmax(0,100px))] gap-3 px-4 py-3 border-b border-border text-[11px] uppercase text-text-secondary">
            <span>{copy("Installer", "Монтажник", "מתקין")}</span>
            <span className="text-end">
              {copy("Installed", "Смонтировано", "הותקן")}
            </span>
            <span className="text-end">{copy("Payroll", "ФОТ", "שכר")}</span>
            <span className="text-end">
              {copy("Revenue", "Выручка", "הכנסה")}
            </span>
            <span className="text-end">
              {copy("Profit", "Прибыль", "רווח")}
            </span>
            <span className="text-end">
              {copy("Data gaps", "Пробелы данных", "נתונים חסרים")}
            </span>
          </div>

          {installersKpiQuery.isLoading && (
            <div className="px-4 py-6 text-[13px] text-text-secondary">
              {tt("reports.loadingInstallersKpi")}
            </div>
          )}
          {installersKpiQuery.isError && (
            <div className="px-4 py-6 text-[13px] text-status-problem-fg">
              {readError(
                installersKpiQuery.error,
                copy(
                  "Failed to load installers KPI",
                  "Не удалось загрузить KPI монтажников",
                  "טעינת KPI המתקינים נכשלה",
                ),
              )}
            </div>
          )}
          {!installersKpiQuery.isLoading &&
            !installersKpiQuery.isError &&
            installersKpiItems.length === 0 && (
              <div className="px-4 py-6 text-[13px] text-text-secondary">
                {copy(
                  "No installers KPI rows.",
                  "Нет строк KPI по монтажникам.",
                  "אין שורות KPI למתקינים.",
                )}
              </div>
            )}
          {!installersKpiQuery.isLoading &&
            !installersKpiQuery.isError &&
            installersKpiItems.map((item) => (
              <div key={item.installer_id} className="border-t border-border">
                <article className="px-4 py-3 md:hidden">
                  <div className="text-[13px] font-semibold leading-5 text-text">
                    {item.installer_name}
                  </div>
                  <InstallerFinancialNotice data={item} />
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                      <div className="text-[10px] uppercase text-text-secondary">
                        {copy("Installed", "Смонтировано", "הותקן")}
                      </div>
                      <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                        {formatCount(item.installed_doors)}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                      <div className="text-[10px] uppercase text-text-secondary">
                        {copy("Payroll", "ФОТ", "שכר")}
                      </div>
                      <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                        {formatAmount(item.payroll_total)}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                      <div className="text-[10px] uppercase text-text-secondary">
                        {copy("Revenue", "Выручка", "הכנסה")}
                      </div>
                      <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                        {formatAmount(item.revenue_total)}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                      <div className="text-[10px] uppercase text-text-secondary">
                        {copy("Profit", "Прибыль", "רווח")}
                      </div>
                      <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                        {formatAmount(item.profit_total)}
                      </div>
                    </div>
                    <div className="col-span-2 rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                      <div className="text-[10px] uppercase text-text-secondary">
                        {copy("Data gaps", "Пробелы данных", "נתונים חסרים")}
                      </div>
                      <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                        {formatCount(installerFinancialDataRisk(item))}
                      </div>
                    </div>
                  </div>
                </article>
                <div className="hidden md:grid grid-cols-[minmax(0,1fr)_repeat(5,minmax(0,100px))] gap-3 px-4 py-3 text-[13px] items-center break-words">
                  <div className="min-w-0 font-medium text-text">
                    {item.installer_name}
                    <InstallerFinancialNotice data={item} />
                  </div>
                  <div className="text-end">
                    {formatCount(item.installed_doors)}
                  </div>
                  <div className="text-end">
                    {formatAmount(item.payroll_total)}
                  </div>
                  <div className="text-end">
                    {formatAmount(item.revenue_total)}
                  </div>
                  <div className="text-end">
                    {formatAmount(item.profit_total)}
                  </div>
                  <div className="text-end">
                    {formatCount(installerFinancialDataRisk(item))}
                  </div>
                </div>
              </div>
            ))}
          <div className="px-4 py-3 border-t border-border flex items-center justify-between text-[12px]">
            <div className="text-text-secondary">
              {tt("reports.rowsCount").replace(
                "{count}",
                String(installersKpiItems.length),
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={!installersKpiCanPrev}
                onClick={() =>
                  setInstallersKpiOffset((x) => Math.max(0, x - KPI_PAGE_SIZE))
                }
                className="h-8 px-3 rounded-md border border-border bg-surface disabled:opacity-50"
              >
                {tt("reports.prev")}
              </button>
              <button
                disabled={!installersKpiCanNext}
                onClick={() => setInstallersKpiOffset((x) => x + KPI_PAGE_SIZE)}
                className="h-8 px-3 rounded-md border border-border bg-surface disabled:opacity-50"
              >
                {tt("reports.next")}
              </button>
            </div>
          </div>
        </div>

        <div id="reports-installer-details" className={reportsPanelClass("overflow-hidden")}>
          <div className="px-4 py-3 border-b border-border bg-surface-subtle flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase text-text-secondary">
                {tt("reports.installerDrilldownTitle")}
              </div>
              <div className="text-[13px] text-text-secondary">
                {copy(
                  "Profitability, projects, orders and addon impact for the selected installer",
                  "Доходность, проекты, заказы и влияние доп. работ по выбранному монтажнику",
                  "רווחיות, פרויקטים, הזמנות והשפעת תוספות עבור המתקין שנבחר",
                )}
              </div>
            </div>
            <select
              aria-label={copy(
                "Installer KPI Details Filter",
                "Фильтр деталей KPI монтажника",
                "מסנן פרטי KPI למתקין",
              )}
              value={scopedInstallerMissing ? "" : installerDetailsId}
              onChange={(e) => {
                const id = e.target.value;
                if (!id) return;
                setInstallerDetailsId(id);
                const params = new URLSearchParams(searchParams?.toString());
                params.set("installer_id", id);
                router.push(`/reports?${params.toString()}#reports-installer-details`);
              }}
              className="h-9 max-w-full rounded-md border border-border bg-surface px-2 text-[13px]"
            >
              <option value="" disabled>
                {installerDirectoryQuery.isLoading
                  ? copy(
                      "Loading installers…",
                      "Загружаем монтажников…",
                      "טוען מתקינים…",
                    )
                  : copy(
                      "Select installer",
                      "Выберите монтажника",
                      "בחר מתקין",
                    )}
              </option>
              {installerDetailsId && !scopedInstallerMissing && !installerDetailOptions.some((item) => item.installer_id === installerDetailsId) && (
                <option value={installerDetailsId}>{installerDetailsId}</option>
              )}
              {installerDetailOptions.map((item) => (
                <option key={item.installer_id} value={item.installer_id}>
                  {item.installer_name}
                </option>
              ))}
            </select>
          </div>

          {installerDirectoryQuery.isError && <div role="status" className="px-4 py-2 text-xs text-status-warning-fg">
            {copy("The installer directory could not be loaded. The available report entries are shown.",
              "Не удалось загрузить справочник монтажников. Показаны доступные записи отчёта.",
              "לא ניתן לטעון את רשימת המתקינים. מוצגות הרשומות הזמינות מהדוח.")}
          </div>}
          {installerDirectoryQuery.isLoading && installerDetailOptions.length === 0 && !installerDetailsId && (
            <div className="px-4 py-6 text-[13px] text-text-secondary">
              {copy(
                "Loading installer drill-down…",
                "Загрузка детализации по монтажнику…",
                "טוען פירוט לפי מתקין…",
              )}
            </div>
          )}
          {!installerDirectoryQuery.isLoading && installerDetailOptions.length === 0 && !installerDetailsId && (
            <div className="px-4 py-6 text-[13px] text-text-secondary">
              {copy(
                "No installers available for drill-down.",
                "Нет монтажников для детализации.",
                "אין מתקינים זמינים לפירוט.",
              )}
            </div>
          )}
          {installerDetailsQuery.isLoading && installerDetailsId && (
            <div className="px-4 py-6 text-[13px] text-text-secondary">
              {copy(
                "Loading installer details…",
                "Загружаем детали монтажника…",
                "טוען פרטי מתקין…",
              )}
            </div>
          )}
          {installerDetailsQuery.isError && installerDetailsId && (
            <div className="px-4 py-6 text-[13px] text-status-problem-fg">
              {readError(
                installerDetailsQuery.error,
                tt("reports.failedInstallerDetails"),
              )}
            </div>
          )}
          {!installerDetailsQuery.isLoading &&
            !installerDetailsQuery.isError &&
            installerDetails && (
              <div className="p-4 space-y-4">
                <InstallerFinancialBasis data={installerDetails} />
                <InstallerFinancialNotice data={installerDetails} />
                {installerDetails.pricing_mode === "FACTORY" && <p className="text-xs text-text-secondary">
                  {copy("All recorded work, independent of the period filter. Order numbers use current door records; add-ons are not included in the order breakdown.",
                    "Все учтённые работы, независимо от фильтра периода. Номера заказов взяты из текущих данных дверей; допработы не входят в разбивку по заказам.",
                    "כל העבודות הרשומות, ללא תלות במסנן התקופה. מספרי ההזמנות נלקחים מרישומי הדלתות הנוכחיים; תוספות אינן נכללות בפירוט ההזמנות.")}
                </p>}
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9"
                    onClick={() =>
                      router.push(
                        `/installers?installer_id=${installerDetails.installer_id}`,
                      )
                    }
                  >
                    {copy(
                      "Open installer card",
                      "Открыть карточку монтажника",
                      "פתח כרטיס מתקין",
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9"
                    onClick={() =>
                      router.push(
                        `/earnings-ledger?installer_id=${installerDetails.installer_id}`,
                      )
                    }
                  >
                    <ReceiptText className="h-3.5 w-3.5" />
                    {copy(
                      "Open payroll ledger",
                      "Открыть начисления",
                      "פתח יומן תשלומים",
                    )}
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="rounded-lg border border-border bg-surface p-3">
                    <div className="text-[11px] uppercase text-text-secondary">
                      {tt("reports.revenuePayrollProfit")}
                    </div>
                    <div className="mt-2 text-[18px] font-semibold text-text">
                      {formatAmount(installerDetails.revenue_total)}
                    </div>
                    <div className="mt-1 text-[12px] text-text-secondary">
                      {copy("Payroll", "Начисления", "שכר")}{" "}
                      {formatAmount(installerDetails.payroll_total)} |{" "}
                      {copy("Profit", "Прибыль", "רווח")}{" "}
                      {formatAmount(installerDetails.profit_total)}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-surface p-3">
                    <div className="text-[11px] uppercase text-text-secondary">
                      {tt("reports.projectsOrders")}
                    </div>
                    <div className="mt-2 text-[18px] font-semibold text-text">
                      {formatCount(installerDetails.active_projects)} /{" "}
                      {formatCount(installerDetails.order_numbers)}
                    </div>
                    <div className="mt-1 text-[12px] text-text-secondary">
                      {tt("reports.installedDoors").replace(
                        "{count}",
                        String(installerDetails.installed_doors),
                      )}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-surface p-3">
                    <div className="text-[11px] uppercase text-text-secondary">
                      {copy("Open issues / data gaps", "Открытые проблемы / неполные данные", "תקלות פתוחות / נתונים חסרים")}
                    </div>
                    <div className="mt-2 text-[18px] font-semibold text-text">
                      {installerDetails.open_issues} /{" "}
                      {installerFinancialDataRisk(installerDetails)}
                    </div>
                    <div className="mt-1 text-[12px] text-text-secondary">
                      {tt("reports.lastInstall")}{" "}
                      {installerDetails.last_installed_at
                        ? formatDateTime(installerDetails.last_installed_at)
                        : tt("reports.notAvailableShort")}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-surface p-3">
                    <div className="text-[11px] uppercase text-text-secondary">
                      {tt("reports.addonsImpact")}
                    </div>
                    <div className="mt-2 text-[18px] font-semibold text-text">
                      {copy("Qty", "Кол-во", "כמות")} {formatAmount(installerDetails.addons_done_qty)}
                    </div>
                    <div className="mt-1 text-[12px] text-text-secondary">
                      {copy("Earned", "Начислено", "שכר שנצבר")}: {formatAmount(installerDetails.addon_payroll_total)}
                    </div>
                    <div className="mt-1 text-[12px] text-text-secondary">
                      {tt("reports.addonsProfitMissingPlans")
                        .replace(
                          "{profit}",
                          formatAmount(installerDetails.addon_profit_total),
                        )
                        .replace(
                          "{count}",
                          String(installerDetails.missing_addon_plans_facts),
                        )}
                    </div>
                  </div>
                </div>

                {installerDetails.pricing_mode === "FACTORY" && <p className="text-xs text-text-secondary">
                  {copy("Project rows shown", "Показано строк объектов", "שורות פרויקטים מוצגות")}: {installerDetails.top_projects.length} / {installerDetails.project_rows_total}.
                  {" "}{copy("Order rows shown", "Показано строк заказов", "שורות הזמנות מוצגות")}: {installerDetails.order_breakdown.length} / {installerDetails.order_rows_total}.
                </p>}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <div className="overflow-hidden rounded-lg border border-border">
                    <div className="divide-y divide-border-subtle md:hidden">
                      {installerDetails.top_projects.length === 0 ? (
                        <div className="px-3.5 py-3 text-[12px] text-text-secondary">
                          {copy(
                            "No project drill-down rows.",
                            "Нет строк детализации по проекту.",
                            "אין שורות פירוט לפרויקט.",
                          )}
                        </div>
                      ) : (
                        installerDetails.top_projects.map((item) => (
                          <article
                            key={`mobile-${item.project_id ?? "unavailable"}`}
                            className="px-3.5 py-3"
                          >
                            <div className="text-[13px] font-semibold leading-5 text-text">
                              {item.project_name ?? copy("Project unavailable", "Объект недоступен", "הפרויקט אינו זמין")}
                            </div>
                            <InstallerFinancialNotice data={item} />
                            <div className="mt-1 text-xs tabular-nums text-text-secondary">
                              {copy("Earned", "Начислено", "שכר שנצבר")}: {formatAmount(item.payroll_total)}
                            </div>
                            <div className="mt-1 text-[11px] leading-4 text-text-secondary">
                              {item.last_installed_at
                                ? formatDateTime(item.last_installed_at)
                                : copy(
                                    "No install date",
                                    "Нет даты установки",
                                    "אין תאריך התקנה",
                                  )}
                            </div>
                            <div className="mt-3 grid grid-cols-3 gap-2">
                              <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                                <div className="text-[10px] uppercase text-text-secondary">
                                  {copy("Installed", "Установлено", "הותקן")}
                                </div>
                                <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                                  {item.installed_doors}
                                </div>
                              </div>
                              <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                                <div className="text-[10px] uppercase text-text-secondary">
                                  {copy("Issues", "Проблемы", "תקלות")}
                                </div>
                                <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                                  {item.open_issues}
                                </div>
                              </div>
                              <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                                <div className="text-[10px] uppercase text-text-secondary">
                                  {copy("Profit", "Прибыль", "רווח")}
                                </div>
                                <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                                  {formatAmount(item.profit_total)}
                                </div>
                              </div>
                            </div>
                          </article>
                        ))
                      )}
                    </div>
                    <table className="hidden w-full text-[12px] md:table">
                      <thead className="bg-surface-subtle text-text-secondary">
                        <tr>
                          <th className="text-start px-3 py-2 font-medium">
                            {copy("Project", "Проект", "פרויקט")}
                          </th>
                          <th className="text-end px-3 py-2 font-medium">
                            {copy("Installed", "Установлено", "הותקן")}
                          </th>
                          <th className="text-end px-3 py-2 font-medium">
                            {copy("Issues", "Проблемы", "תקלות")}
                          </th>
                          <th className="text-end px-3 py-2 font-medium">
                            {copy("Profit", "Прибыль", "רווח")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {installerDetails.top_projects.length === 0 ? (
                          <tr>
                            <td
                              className="px-3 py-3 text-text-secondary"
                              colSpan={4}
                            >
                              {copy(
                                "No project drill-down rows.",
                                "Нет строк детализации по проекту.",
                                "אין שורות פירוט לפרויקט.",
                              )}
                            </td>
                          </tr>
                        ) : (
                          installerDetails.top_projects.map((item) => (
                            <tr
                              key={item.project_id ?? "unavailable"}
                              className="border-t border-border"
                            >
                              <td className="px-3 py-2.5">
                                <div className="font-medium text-text">
                                  {item.project_name ?? copy("Project unavailable", "Объект недоступен", "הפרויקט אינו זמין")}
                                </div>
                                <InstallerFinancialNotice data={item} />
                                <div className="text-xs tabular-nums text-text-secondary">
                                  {copy("Earned", "Начислено", "שכר שנצבר")}: {formatAmount(item.payroll_total)}
                                </div>
                                <div className="text-[11px] text-text-secondary">
                                  {item.last_installed_at
                                    ? formatDateTime(item.last_installed_at)
                                    : copy(
                                        "No install date",
                                        "Нет даты установки",
                                        "אין תאריך התקנה",
                                      )}
                                </div>
                              </td>
                              <td className="px-3 py-2 text-end">
                                {item.installed_doors}
                              </td>
                              <td className="px-3 py-2 text-end">
                                {item.open_issues}
                              </td>
                              <td className="px-3 py-2 text-end">
                                {formatAmount(item.profit_total)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="overflow-hidden rounded-lg border border-border">
                    <div className="divide-y divide-border-subtle md:hidden">
                      {installerDetails.order_breakdown.length === 0 ? (
                        <div className="px-3.5 py-3 text-[12px] text-text-secondary">
                          {copy(
                            "No order breakdown rows.",
                            "Нет строк по разбивке заказов.",
                            "אין שורות פירוט להזמנות.",
                          )}
                        </div>
                      ) : (
                        installerDetails.order_breakdown.map((item) => (
                          <article
                            key={`mobile-${item.order_number}`}
                            className="px-3.5 py-3"
                          >
                            <div className="text-[13px] font-semibold leading-5 text-text">
                              {item.order_number}
                            </div>
                            <InstallerFinancialNotice data={item} />
                            <div className="mt-1 text-xs tabular-nums text-text-secondary">
                              {copy("Earned", "Начислено", "שכר שנצבר")}: {formatAmount(item.payroll_total)}
                            </div>
                            <div className="mt-3 grid grid-cols-3 gap-2">
                              <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                                <div className="text-[10px] uppercase text-text-secondary">
                                  {copy("Installed", "Установлено", "הותקן")}
                                </div>
                                <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                                  {item.installed_doors}
                                </div>
                              </div>
                              <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                                <div className="text-[10px] uppercase text-text-secondary">
                                  {copy("Revenue", "Выручка", "הכנסה")}
                                </div>
                                <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                                  {formatAmount(item.revenue_total)}
                                </div>
                              </div>
                              <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                                <div className="text-[10px] uppercase text-text-secondary">
                                  {copy("Profit", "Прибыль", "רווח")}
                                </div>
                                <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                                  {formatAmount(item.profit_total)}
                                </div>
                              </div>
                            </div>
                          </article>
                        ))
                      )}
                    </div>
                    <table className="hidden w-full text-[12px] md:table">
                      <thead className="bg-surface-subtle text-text-secondary">
                        <tr>
                          <th className="text-start px-3 py-2 font-medium">
                            {copy("Order", "Заказ", "הזמנה")}
                          </th>
                          <th className="text-end px-3 py-2 font-medium">
                            {copy("Installed", "Установлено", "הותקן")}
                          </th>
                          <th className="text-end px-3 py-2 font-medium">
                            {copy("Revenue", "Выручка", "הכנסה")}
                          </th>
                          <th className="text-end px-3 py-2 font-medium">
                            {copy("Profit", "Прибыль", "רווח")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {installerDetails.order_breakdown.length === 0 ? (
                          <tr>
                            <td
                              className="px-3 py-3 text-text-secondary"
                              colSpan={4}
                            >
                              {copy(
                                "No order breakdown rows.",
                                "Нет строк по разбивке заказов.",
                                "אין שורות פירוט להזמנות.",
                              )}
                            </td>
                          </tr>
                        ) : (
                          installerDetails.order_breakdown.map((item) => (
                            <tr
                              key={item.order_number}
                              className="border-t border-border"
                            >
                              <td className="px-3 py-2.5 font-medium text-text">
                                {item.order_number}
                                <InstallerFinancialNotice data={item} />
                                <div className="text-xs tabular-nums text-text-secondary">
                                  {copy("Earned", "Начислено", "שכר שנצבר")}: {formatAmount(item.payroll_total)}
                                </div>
                              </td>
                              <td className="px-3 py-2 text-end">
                                {item.installed_doors}
                              </td>
                              <td className="px-3 py-2 text-end">
                                {formatAmount(item.revenue_total)}
                              </td>
                              <td className="px-3 py-2 text-end">
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

        <div id="reports-orders" className={reportsPanelClass("overflow-hidden")}>
          <div className="px-4 py-3 border-b border-border bg-surface-subtle flex flex-col items-stretch gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="text-[11px] uppercase text-text-secondary">
                {copy(
                  "Order Numbers KPI",
                  "KPI по номерам заказов",
                  "KPI לפי מספרי הזמנה",
                )}
              </div>
              <div className="text-[13px] text-text-secondary">
                {copy(
                  "Money and operational control by order number",
                  "Деньги и операционный контроль по номеру заказа",
                  "כסף ובקרה תפעולית לפי מספר הזמנה",
                )}
              </div>
            </div>
            <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 xl:flex xl:flex-wrap xl:items-center xl:justify-end">
              <select
                aria-label={copy("Order Project Filter", "Фильтр заказов по объекту", "סינון הזמנות לפי פרויקט")}
                value={orderNumbersProjectId}
                onChange={(e) => {
                  setOrderNumbersProjectId(e.target.value);
                  setOrderNumbersKpiOffset(0);
                }}
                className="h-9 w-full min-w-0 rounded-md border border-border bg-surface px-2 text-[13px] xl:w-auto xl:max-w-[220px]"
              >
                <option value="">
                  {projectsQuery.isLoading
                    ? tt("reports.loadingProjects")
                    : t("common.all")}
                </option>
                {projectOptions.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <input
                aria-label={copy(
                  "Search order…",
                  "Поиск заказа…",
                  "חפש הזמנה…",
                )}
                value={orderNumbersQuery}
                onChange={(e) => {
                  setOrderNumbersQuery(e.target.value);
                  setOrderNumbersKpiOffset(0);
                }}
                placeholder={copy(
                  "Search order…",
                  "Поиск заказа…",
                  "חפש הזמנה…",
                )}
                className="h-9 w-full min-w-0 rounded-md border border-border bg-surface px-2 text-[13px] xl:w-auto xl:max-w-[220px]"
              />
              <select
                aria-label={copy("Orders: sort by", "Заказы: сортировать по", "הזמנות: מיון לפי")}
                value={orderNumbersSortBy}
                onChange={(e) => {
                  setOrderNumbersSortBy(e.target.value as OrderNumbersSortBy);
                  setOrderNumbersKpiOffset(0);
                }}
                className="h-9 w-full min-w-0 rounded-md border border-border bg-surface px-2 text-[13px] xl:w-auto xl:max-w-[180px]"
              >
                {ORDER_NUMBERS_SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {optionLabel(option.label)}
                  </option>
                ))}
              </select>
              <select
                aria-label={copy("Orders: sort direction", "Заказы: направление сортировки", "הזמנות: כיוון מיון")}
                value={orderNumbersSortDir}
                onChange={(e) => {
                  setOrderNumbersSortDir(e.target.value as SortDir);
                  setOrderNumbersKpiOffset(0);
                }}
                className="h-9 w-full min-w-0 rounded-md border border-border bg-surface px-2 text-[13px] xl:w-auto xl:max-w-[120px]"
              >
                {SORT_DIR_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => exportOrderNumbersKpiMutation.mutate()}
                disabled={
                  !canExportFinancialReports ||
                  exportOrderNumbersKpiMutation.isPending
                }
                title={ratesScopeHint}
                className="h-9 w-full rounded-md border border-border bg-surface px-3 text-[12px] disabled:opacity-50 xl:w-auto"
              >
                {tt("reports.exportOrdersCsv")}
              </button>
            </div>
          </div>

          {!orderNumbersKpiQuery.isError && <OrderFinancialBasis data={orderNumbersKpiQuery.data} />}
          <div className="hidden xl:grid grid-cols-[minmax(0,1fr)_80px_90px_90px_80px_120px_120px_120px_110px] gap-3 px-4 py-3 border-b border-border text-[11px] uppercase text-text-secondary">
            <span>{copy("Order", "Заказ", "הזמנה")}</span>
            <span className="text-end">{copy("Total", "Всего", 'סה"כ')}</span>
            <span className="text-end">
              {copy("Installed", "Установлено", "הותקן")}
            </span>
            <span className="text-end">
              {copy("Not Installed", "Не установлено", "לא הותקן")}
            </span>
            <span className="text-end">
              {copy("Issues", "Проблемы", "תקלות")}
            </span>
            <span className="text-end">
              {copy("Planned", "План", "מתוכנן")}
            </span>
            <span className="text-end">
              {copy("Payroll", "Начисления", "שכר")}
            </span>
            <span className="text-end">
              {copy("Profit", "Прибыль", "רווח")}
            </span>
            <span className="text-end">
              {copy("Completion", "Готовность", "השלמה")}
            </span>
          </div>

          {orderNumbersKpiQuery.isLoading && (
            <div className="px-4 py-6 text-[13px] text-text-secondary">
              {copy(
                "Loading order numbers KPI…",
                "Загружаем KPI по номерам заказов…",
                "טוען KPI למספרי הזמנות…",
              )}
            </div>
          )}
          {orderNumbersKpiQuery.isError && (
            <div className="px-4 py-6 text-[13px] text-status-problem-fg">
              {readError(
                orderNumbersKpiQuery.error,
                copy(
                  "Failed to load order numbers KPI",
                  "Не удалось загрузить KPI по номерам заказов",
                  "טעינת KPI למספרי הזמנות נכשלה",
                ),
              )}
            </div>
          )}
          {!orderNumbersKpiQuery.isLoading &&
            !orderNumbersKpiQuery.isError &&
            orderNumbersKpiItems.length === 0 && (
              <div className="px-4 py-6 text-[13px] text-text-secondary">
                {copy(
                  "No order KPI rows.",
                  "Нет строк KPI по заказам.",
                  "אין שורות KPI להזמנות.",
                )}
              </div>
            )}
          {!orderNumbersKpiQuery.isLoading &&
            !orderNumbersKpiQuery.isError &&
            orderNumbersKpiItems.map((item) => (
              <div key={item.order_number} className="border-t border-border">
                <div className="px-4"><InstallerFinancialNotice data={item} /></div>
                {item.pricing_mode === "FACTORY" && <div className="px-4 pt-2 text-xs text-text-secondary">
                  {copy("Recorded installations", "Учтённые установки", "התקנות רשומות")}: {item.recorded_installations ?? "-"}.
                  {" "}{copy("Recorded revenue", "Учтённая выручка", "הכנסה רשומה")}: {formatAmount(item.installed_revenue_total)}.
                </div>}
                <article className="px-4 py-3 xl:hidden">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 break-words text-[13px] font-semibold leading-5 text-text">
                      {item.order_number}
                    </div>
                    <div className="shrink-0 rounded-full bg-surface-subtle px-2 py-1 text-[10.5px] font-medium leading-none text-text-secondary">
                      {item.completion_pct}%
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                      <div className="text-[10px] uppercase text-text-secondary">
                        {copy("Total", "Всего", 'סה"כ')}
                      </div>
                      <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                        {item.total_doors}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                      <div className="text-[10px] uppercase text-text-secondary">
                        {copy("Installed", "Установлено", "הותקן")}
                      </div>
                      <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                        {item.installed_doors}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                      <div className="text-[10px] uppercase text-text-secondary">
                        {copy("Not Installed", "Не установлено", "לא הותקן")}
                      </div>
                      <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                        {item.not_installed_doors}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                      <div className="text-[10px] uppercase text-text-secondary">
                        {copy("Issues", "Проблемы", "תקלות")}
                      </div>
                      <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                        {item.open_issues}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                      <div className="text-[10px] uppercase text-text-secondary">
                        {copy("Payroll", "Начисления", "שכר")}
                      </div>
                      <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                        {formatAmount(item.payroll_total)}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                      <div className="text-[10px] uppercase text-text-secondary">
                        {copy("Profit", "Прибыль", "רווח")}
                      </div>
                      <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                        {formatAmount(item.profit_total)}
                      </div>
                    </div>
                    <div className="col-span-3 rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                      <div className="text-[10px] uppercase text-text-secondary">
                        {copy("Planned", "План", "מתוכנן")}
                      </div>
                      <div className="mt-1 text-[13px] font-medium tabular-nums text-text">
                        {formatAmount(item.planned_revenue_total)}
                      </div>
                    </div>
                  </div>
                </article>
                <div className="hidden xl:grid grid-cols-[minmax(0,1fr)_80px_90px_90px_80px_120px_120px_120px_110px] gap-3 px-4 py-3 text-[13px] items-center">
                  <div className="min-w-0 break-words font-medium text-text">
                    {item.order_number}
                  </div>
                  <div className="text-end">{item.total_doors}</div>
                  <div className="text-end">{item.installed_doors}</div>
                  <div className="text-end">{item.not_installed_doors}</div>
                  <div className="text-end">{item.open_issues}</div>
                  <div className="text-end">
                    {formatAmount(item.planned_revenue_total)}
                  </div>
                  <div className="text-end">
                    {formatAmount(item.payroll_total)}
                  </div>
                  <div className="text-end">
                    {formatAmount(item.profit_total)}
                  </div>
                  <div className="text-end">{item.completion_pct}%</div>
                </div>
              </div>
            ))}
          <div className="px-4 py-3 border-t border-border flex items-center justify-between text-[12px]">
            <div className="text-text-secondary">
              {copy("Total matched", "Всего совпадений", 'סה"כ התאמות')}:{" "}
              {orderNumbersKpiQuery.data?.total || 0}
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={!orderNumbersKpiCanPrev}
                onClick={() =>
                  setOrderNumbersKpiOffset((x) =>
                    Math.max(0, x - KPI_PAGE_SIZE),
                  )
                }
                className="h-8 px-3 rounded-md border border-border bg-surface disabled:opacity-50"
              >
                {tt("reports.prev")}
              </button>
              <button
                disabled={!orderNumbersKpiCanNext}
                onClick={() =>
                  setOrderNumbersKpiOffset((x) => x + KPI_PAGE_SIZE)
                }
                className="h-8 px-3 rounded-md border border-border bg-surface disabled:opacity-50"
              >
                {tt("reports.next")}
              </button>
            </div>
          </div>
        </div>

        <div id="reports-delivery-risk" className="grid gap-3 md:grid-cols-4">
          <div className={reportsPanelClass("p-4")}>
            <div className="text-[11px] uppercase text-text-secondary mb-2">
              {copy("Delivery", "Доставка", "משלוח")}
            </div>
            {deliveryQuery.isLoading ? (
              <div className="text-[13px] text-text-secondary">
                {copy("Loading…", "Загрузка…", "טוען…")}
              </div>
            ) : (
              <div className="space-y-1 text-[13px]">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-link" />
                  <span>{copy("WA pending:", "WhatsApp, ожидают:", "WhatsApp, ממתינות:")} {delivery?.whatsapp_pending ?? 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-500" />
                  <span>{copy("WA delivered:", "WhatsApp, доставлено:", "WhatsApp, נמסרו:")} {delivery?.whatsapp_delivered ?? 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-status-problem-fg" />
                  <span>{copy("WA failed:", "WhatsApp, ошибки:", "WhatsApp, נכשלו:")} {delivery?.whatsapp_failed ?? 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-emerald-500" />
                  <span>{copy("Email sent:", "Письмо отправлено:", "אימייל נשלח:")} {delivery?.email_sent ?? 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-status-problem-fg" />
                  <span>{copy("Email failed:", "Ошибки эл. почты:", "שגיאות דוא״ל:")} {delivery?.email_failed ?? 0}</span>
                </div>
              </div>
            )}
          </div>

          <div className={reportsPanelClass("p-4")}>
            <div className="text-[11px] uppercase text-text-secondary mb-2">
              {copy("Outbox Queue", "Очередь исходящих сообщений", "תור תיבת דואר יוצא")}
            </div>
            {outboxSummaryQuery.isLoading ? (
              <div className="text-[13px] text-text-secondary">
                {copy("Loading…", "Загрузка…", "טוען…")}
              </div>
            ) : (
              <div className="space-y-1 text-[13px]">
                <div>{copy("Total:", "Итого:", "סך הכל:")} {outboxSummary?.total ?? 0}</div>
                <div>{copy("Failed total:", "Всего неудачно:", "סך הכל נכשל:")} {outboxSummary?.failed_total ?? 0}</div>
                <div>
                  {copy("Pending overdue &gt;15m:", "Ожидается просрочка >15 мин:", "בהמתנה באיחור >15 מ':")}{" "}
                  {outboxSummary?.pending_overdue_15m ?? 0}
                </div>
                <div className="text-text-secondary">
                  {copy("Channels:", "Каналы:", "ערוצים:")} {compactMap(outboxSummary?.by_channel)}
                </div>
                <div className="text-text-secondary">
                  {copy("Status:", "Статус:", "סטטוס:")} {compactMap(outboxSummary?.by_status)}
                </div>
              </div>
            )}
          </div>

          <div
            id="reports-delivery-scope"
            className={reportsPanelClass("p-4 md:col-span-2")}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase text-text-secondary mb-2">
                  {copy("Delivery Scope", "Фильтр отправки", "מסנן שליחה")}
                </div>
                <div className="space-y-1 text-[13px]">
                  <div>
                    {copy("Channel:", "Канал:", "ערוץ:")}{" "}
                    <span className="font-medium text-text">
                      {scopedDeliveryChannel || "all channels"}
                    </span>
                  </div>
                  <div>
                    {copy("Webhook provider:", "Провайдер вебхука:", "ספק Webhook:")}{" "}
                    <span className="font-medium text-text">
                      {scopedWebhookProvider || "all providers"}
                    </span>
                  </div>
                  {scopedOutboxId ? (
                    <div>
                      {copy("Outbox:", "Исходящие:", "תיבת דואר יוצא:")}{" "}
                      <span className="font-medium text-text">
                        {scopedOutboxId}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
              {(scopedDeliveryChannel || scopedWebhookProvider) && (
                <button
                  onClick={() => {
                    const params = new URLSearchParams();
                    params.set("focus", "delivery");
                    params.set(
                      "ops_preset",
                      activeOpsPreset || "delivery-risk",
                    );
                    if (scopedOutboxId) {
                      params.set("outbox_id", scopedOutboxId);
                    }
                    router.push(`/reports?${params.toString()}`);
                  }}
                  className="h-8 px-3 rounded-md border border-border bg-surface text-[12px]"
                >
                  {copy("Clear delivery scope", "Сбросить фильтр отправки", "נקה מסנן שליחה")}
                </button>
              )}
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-border bg-surface-subtle p-3">
                <div className="text-[11px] uppercase text-text-secondary">
                  {t("reports.failedOutboxLane")}
                </div>
                <div className="mt-2 text-[13px] text-text">
                  {t("reports.failedMessagesInCurrentScope").replace(
                    "{count}",
                    String(failedItems.length),
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    onClick={() =>
                      router.push(
                        buildOperationsHref({
                          actionable: true,
                          deliveryChannel: scopedDeliveryChannel || undefined,
                          webhookProvider: scopedWebhookProvider || undefined,
                        }),
                      )
                    }
                    className="h-8 px-3 rounded-md border border-border bg-surface text-[12px]"
                  >
                    {t("reports.openScopedOps")}
                  </button>
                  {scopedOutboxId ? (
                    <button
                      onClick={() =>
                        router.push(
                          buildOperationsHref({
                            actionable: true,
                            deliveryChannel: scopedDeliveryChannel || undefined,
                            webhookProvider: scopedWebhookProvider || undefined,
                          }),
                        )
                      }
                      className="h-8 px-3 rounded-md border border-border bg-surface text-[12px]"
                    >
                      {t("reports.continueRecovery")}
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-surface-subtle p-3">
                <div className="text-[11px] uppercase text-text-secondary">
                  {t("reports.webhookLane")}
                </div>
                {webhookSignalsQuery.isLoading ? (
                  <div className="mt-2 text-[13px] text-text-secondary">
                    {t("reports.loadingWebhookScope")}
                  </div>
                ) : scopedWebhookSignals.length === 0 ? (
                  <div className="mt-2 text-[13px] text-text-secondary">
                    {t("reports.noWebhookSignalsCurrentScope")}
                  </div>
                ) : (
                  <div className="mt-2 space-y-2">
                    {scopedWebhookSignals.slice(0, 3).map((item) => (
                      <div key={item.id} className="text-[13px]">
                        <div className="font-medium text-text">
                          {item.provider} | {item.result}
                        </div>
                        <div className="text-text-secondary">
                          {item.event_type}
                          {item.status ? ` | status ${item.status}` : ""}
                          {item.error ? ` | ${item.error}` : ""}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-border bg-surface-subtle p-3 md:col-span-2">
                <div className="text-[11px] uppercase text-text-secondary">
                  {t("reports.recoveryTrail")}
                </div>
                {retryAuditsQuery.isLoading ? (
                  <div className="mt-2 text-[13px] text-text-secondary">
                    {t("reports.loadingRetryAuditTrail")}
                  </div>
                ) : scopedRetryAuditItems.length === 0 ? (
                  <div className="mt-2 text-[13px] text-text-secondary">
                    {scopedOutboxId
                      ? t("reports.noRecoveryActionsForOutbox")
                      : t("reports.noDeliveryRecoveryActionsYet")}
                  </div>
                ) : (
                  <div className="mt-2 space-y-2">
                    {scopedRetryAuditItems.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        className="rounded-md border border-border-subtle bg-surface px-3 py-2 text-[13px]"
                      >
                        <div className="font-medium text-text">
                          {copy("Outbox", "Исходящие", "תיבת דואר יוצא")} {item.outbox_id}
                        </div>
                        <div className="text-text-secondary">
                          {formatDateTime(item.created_at)} {copy("| actor", "| пользователь", "| משתמש")}{" "}
                          {item.actor_user_id}
                        </div>
                        <div className="text-text-secondary">
                          {item.before_status || "unknown"} {"->"}{" "}
                          {item.after_status || "unknown"}
                          {item.before_delivery_status ||
                          item.after_delivery_status
                            ? ` | delivery ${item.before_delivery_status || "unknown"} -> ${item.after_delivery_status || "unknown"}`
                            : ""}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            onClick={() =>
                              router.push(
                                buildOperationsHref({
                                  actionable: true,
                                  deliveryChannel:
                                    scopedDeliveryChannel || undefined,
                                  webhookProvider:
                                    scopedWebhookProvider || undefined,
                                }),
                              )
                            }
                            className="h-8 px-3 rounded-md border border-border bg-surface text-[12px]"
                          >
                            {t("reports.openRecoveryLane")}
                          </button>
                          <button
                            onClick={() =>
                              router.push(
                                buildOperationsHref({
                                  actionable: true,
                                  deliveryChannel:
                                    scopedDeliveryChannel || undefined,
                                  webhookProvider:
                                    scopedWebhookProvider || undefined,
                                }),
                              )
                            }
                            className="h-8 px-3 rounded-md border border-border bg-surface text-[12px]"
                          >
                            {t("reports.continueInOps")}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={reportsPanelClass("p-4")}>
            <div className="text-[11px] uppercase text-text-secondary mb-2">
              {t("reports.catalogAudit")}
            </div>
            {auditCatalogsQuery.isLoading ? (
              <div className="text-[13px] text-text-secondary">
                {t("reports.loading")}
              </div>
            ) : (
              <div className="space-y-1 text-[13px]">
                <div>
                  {t("reports.totalChanges")}: {auditSummary?.total ?? 0}
                </div>
                <div className="text-text-secondary">
                  {t("reports.entities")}: {compactMap(auditSummary?.by_entity)}
                </div>
                <div className="text-text-secondary">
                  {t("reports.actions")}: {compactMap(auditSummary?.by_action)}
                </div>
              </div>
            )}
          </div>

          <div className={reportsPanelClass("p-4")}>
            <div className="text-[11px] uppercase text-text-secondary mb-2">
              {t("reports.issueAudit")}
            </div>
            {issueAuditQuery.isLoading ? (
              <div className="text-[13px] text-text-secondary">
                {t("reports.loading")}
              </div>
            ) : (
              <div className="space-y-1 text-[13px]">
                <div>
                  {t("reports.totalChanges")}: {issueAuditSummary?.total ?? 0}
                </div>
                <div className="text-text-secondary">
                  {t("reports.entities")}:{" "}
                  {compactMap(issueAuditSummary?.by_entity)}
                </div>
                <div className="text-text-secondary">
                  {t("reports.actions")}:{" "}
                  {compactMap(issueAuditSummary?.by_action)}
                </div>
              </div>
            )}
          </div>
        </div>

        <div
          id="reports-failed-outbox"
          className={reportsPanelClass("overflow-hidden")}
        >
          <div className="px-4 py-3 border-b border-border bg-surface-subtle text-[11px] uppercase text-text-secondary">
            {t("reports.failedOutboxQueue")}
          </div>
          {failedOutboxQuery.isLoading && (
            <div className="px-4 py-6 text-[13px] text-text-secondary">
              {t("reports.loadingFailedMessages")}
            </div>
          )}
          {!failedOutboxQuery.isLoading && failedItems.length === 0 && (
            <div className="px-4 py-6 text-[13px] text-text-secondary">
              {scopedDeliveryChannel
                ? t("reports.noFailedOutboxMessagesFor").replace(
                    "{scope}",
                    scopedDeliveryChannel,
                  )
                : t("reports.noFailedOutboxMessages")}
            </div>
          )}
          {!failedOutboxQuery.isLoading &&
            failedItems.map((item) => (
              <div key={item.id} className="border-t border-border">
                <article className="px-4 py-3 md:hidden">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold leading-5 text-text">
                        {item.channel}
                      </div>
                      <div className="mt-1 text-[11px] leading-4 text-text-secondary">
                        {item.status} | {item.delivery_status}
                      </div>
                    </div>
                    <div className="shrink-0 rounded-full bg-surface-subtle px-2 py-1 text-[10.5px] font-medium leading-none text-text-secondary">
                      {item.attempts}/{item.max_attempts}
                    </div>
                  </div>
                  <div className="mt-3 rounded-lg border border-border bg-surface-subtle px-2.5 py-2 text-[12px] leading-5 text-text-secondary">
                    {item.last_error ||
                      copy(
                        "No error payload",
                        "Нет данных об ошибке",
                        "אין נתוני שגיאה",
                      )}
                  </div>
                  <button
                    onClick={() => retryMutation.mutate(item.id)}
                    disabled={
                      !canRunPrivilegedActions || retryMutation.isPending
                    }
                    title={privilegedActionHint}
                    className="mt-3 h-8 px-3 rounded-md border border-border bg-surface text-[12px] inline-flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    {copy("Retry", "Повторить", "נסה שוב")}
                  </button>
                </article>
                <div className="hidden md:grid grid-cols-[120px_120px_120px_160px_1fr_120px] gap-3 px-4 py-3 text-[13px] items-center">
                  <div className="font-medium">{item.channel}</div>
                  <div>{item.status}</div>
                  <div>{item.delivery_status}</div>
                  <div className="text-text-secondary">
                    {item.attempts}/{item.max_attempts}
                  </div>
                  <div className="text-text-secondary truncate">
                    {item.last_error ||
                      copy(
                        "No error payload",
                        "Нет данных об ошибке",
                        "אין נתוני שגיאה",
                      )}
                  </div>
                  <button
                    onClick={() => retryMutation.mutate(item.id)}
                    disabled={
                      !canRunPrivilegedActions || retryMutation.isPending
                    }
                    title={privilegedActionHint}
                    className="h-8 px-3 rounded-md border border-border bg-surface text-[12px] inline-flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    {copy("Retry", "Повторить", "נסה שוב")}
                  </button>
                </div>
              </div>
            ))}
        </div>

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

        <div
          id="reports-audit-catalogs"
          className={reportsPanelClass("overflow-hidden")}
        >
          <div className="px-4 py-3 border-b border-border bg-surface-subtle text-[11px] uppercase text-text-secondary">
            {copy(
              "Catalog Audit Report",
              "Аудит справочников",
              "דוח ביקורת קטלוג",
            )}
          </div>
          <div className="px-4 py-3 border-b border-border grid gap-2 md:grid-cols-[180px_220px_150px_150px_auto] items-center">
            <select
              aria-label={copy("Catalog audit: entity type", "Аудит справочников: тип сущности", "ביקורת קטלוג: סוג ישות")}
              value={auditEntityType}
              onChange={(e) => {
                setAuditEntityType(e.target.value);
                setAuditOffset(0);
              }}
              className="h-9 w-full min-w-0 rounded-md border border-border bg-surface px-2 text-[13px]"
            >
              <option value="">
                {copy("All entities", "Все сущности", "כל הישויות")}
              </option>
              {AUDIT_ENTITY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <select
              aria-label={copy("Catalog audit: action", "Аудит справочников: действие", "ביקורת קטלוג: פעולה")}
              value={auditAction}
              onChange={(e) => {
                setAuditAction(e.target.value);
                setAuditOffset(0);
              }}
              className="h-9 w-full min-w-0 rounded-md border border-border bg-surface px-2 text-[13px]"
            >
              <option value="">
                {copy("All actions", "Все действия", "כל הפעולות")}
              </option>
              {AUDIT_ACTION_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <input
              aria-label={copy("Catalog audit: date from", "Аудит справочников: дата с", "ביקורת קטלוג: מתאריך")}
              value={auditDateFrom}
              onChange={(e) => {
                setAuditDateFrom(e.target.value);
                setAuditOffset(0);
              }}
              type="date"
              className="h-9 w-full min-w-0 rounded-md border border-border bg-surface px-2 text-[13px]"
            />
            <input
              aria-label={copy("Catalog audit: date to", "Аудит справочников: дата по", "ביקורת קטלוג: עד תאריך")}
              value={auditDateTo}
              onChange={(e) => {
                setAuditDateTo(e.target.value);
                setAuditOffset(0);
              }}
              type="date"
              className="h-9 w-full min-w-0 rounded-md border border-border bg-surface px-2 text-[13px]"
            />
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                onClick={() => exportAuditMutation.mutate()}
                disabled={
                  !canRunPrivilegedActions || exportAuditMutation.isPending
                }
                title={privilegedActionHint}
                className="h-9 px-3 rounded-md border border-border bg-surface text-[12px] disabled:opacity-50"
              >
                {copy("Export CSV", "Экспорт CSV", "ייצוא CSV")}
              </button>
              <button
                onClick={() => {
                  setAuditEntityType("");
                  setAuditAction("");
                  setAuditDateFrom("");
                  setAuditDateTo("");
                  setAuditOffset(0);
                }}
                className="h-9 px-3 rounded-md border border-border bg-surface text-[12px]"
              >
                {copy("Reset", "Сбросить", "איפוס")}
              </button>
            </div>
          </div>

          <div className="hidden md:grid grid-cols-[170px_120px_1fr_1fr] gap-3 px-4 py-3 border-b border-border text-[11px] uppercase text-text-secondary">
            <span>{copy("Time", "Время", "זמן")}</span>
            <span>{copy("Entity", "Сущность", "ישות")}</span>
            <span>{copy("Action", "Действие", "פעולה")}</span>
            <span>{copy("Reason", "Причина", "סיבה")}</span>
          </div>
          {auditCatalogsQuery.isLoading && (
            <div className="px-4 py-6 text-[13px] text-text-secondary">
              {copy("Loading audit…", "Загружаем аудит…", "טוען ביקורת...")}
            </div>
          )}
          {!auditCatalogsQuery.isLoading && auditItems.length === 0 && (
            <div className="px-4 py-6 text-[13px] text-text-secondary">
              {copy(
                "No catalog audit entries.",
                "Записей аудита справочников нет.",
                "אין רשומות ביקורת קטלוג.",
              )}
            </div>
          )}
          {!auditCatalogsQuery.isLoading &&
            auditItems.map((item) => (
              <div key={item.id} className="border-t border-border">
                <article className="px-4 py-3 md:hidden">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 text-[13px] font-semibold leading-5 text-text">
                      {item.entity_type}
                    </div>
                    <div className="shrink-0 rounded-full bg-surface-subtle px-2 py-1 text-[10.5px] font-medium leading-none text-text-secondary">
                      {formatDateTime(item.created_at)}
                    </div>
                  </div>
                  <div className="mt-3 rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                    <div className="text-[10px] uppercase text-text-secondary">
                      {copy("Action", "Действие", "פעולה")}
                    </div>
                    <div className="mt-1 text-[13px] font-medium text-text">
                      {item.action}
                    </div>
                  </div>
                  <div className="mt-2 text-[12px] leading-5 text-text-secondary">
                    {item.reason || "-"}
                  </div>
                </article>
                <div className="hidden md:grid grid-cols-[170px_120px_1fr_1fr] gap-3 px-4 py-3 text-[13px] items-center">
                  <div className="text-text-secondary">
                    {formatDateTime(item.created_at)}
                  </div>
                  <div className="font-medium">{item.entity_type}</div>
                  <div>{item.action}</div>
                  <div className="text-text-secondary">
                    {item.reason || "-"}
                  </div>
                </div>
              </div>
            ))}
          <div className="px-4 py-3 border-t border-border flex flex-wrap items-center justify-between gap-2 text-[12px]">
            <div className="text-text-secondary">
              {copy("Total matched", "Всего совпадений", 'סה"כ התאמות')}:{" "}
              {auditSummary?.total || 0}
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={!auditCanPrev}
                onClick={() =>
                  setAuditOffset((x) => Math.max(0, x - AUDIT_PREVIEW_LIMIT))
                }
                className="h-8 px-3 rounded-md border border-border bg-surface disabled:opacity-50"
              >
                {tt("reports.prev")}
              </button>
              <button
                disabled={!auditCanNext}
                onClick={() => setAuditOffset((x) => x + AUDIT_PREVIEW_LIMIT)}
                className="h-8 px-3 rounded-md border border-border bg-surface disabled:opacity-50"
              >
                {tt("reports.next")}
              </button>
            </div>
          </div>
        </div>

        <div
          id="reports-issue-audit"
          className={reportsPanelClass("overflow-hidden")}
        >
          <div className="px-4 py-3 border-b border-border bg-surface-subtle text-[11px] uppercase text-text-secondary">
            {copy("Issue Audit Report", "Аудит проблем", "דוח ביקורת תקלות")}
          </div>
          <div className="px-4 py-3 border-b border-border grid gap-2 md:grid-cols-[220px_240px_150px_150px_auto] items-center">
            <select
              aria-label={copy("Issue audit: action", "Аудит проблем: действие", "ביקורת תקלות: פעולה")}
              value={issueAuditAction}
              onChange={(e) => {
                setIssueAuditAction(e.target.value);
                setIssueAuditOffset(0);
              }}
              className="h-9 w-full min-w-0 rounded-md border border-border bg-surface px-2 text-[13px]"
            >
              <option value="">
                {copy("All actions", "Все действия", "כל הפעולות")}
              </option>
              {ISSUE_AUDIT_ACTION_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <input
              aria-label={copy("Issue UUID", "UUID проблемы", "UUID תקלה")}
              value={issueAuditIssueId}
              onChange={(e) => {
                setIssueAuditIssueId(e.target.value);
                setIssueAuditOffset(0);
              }}
              placeholder={copy("Issue UUID", "UUID проблемы", "UUID תקלה")}
              className="h-9 w-full min-w-0 rounded-md border border-border bg-surface px-2 text-[13px]"
            />
            <input
              aria-label={copy("Issue audit: date from", "Аудит проблем: дата с", "ביקורת תקלות: מתאריך")}
              value={issueAuditDateFrom}
              onChange={(e) => {
                setIssueAuditDateFrom(e.target.value);
                setIssueAuditOffset(0);
              }}
              type="date"
              className="h-9 w-full min-w-0 rounded-md border border-border bg-surface px-2 text-[13px]"
            />
            <input
              aria-label={copy("Issue audit: date to", "Аудит проблем: дата по", "ביקורת תקלות: עד תאריך")}
              value={issueAuditDateTo}
              onChange={(e) => {
                setIssueAuditDateTo(e.target.value);
                setIssueAuditOffset(0);
              }}
              type="date"
              className="h-9 w-full min-w-0 rounded-md border border-border bg-surface px-2 text-[13px]"
            />
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                onClick={() => exportIssueAuditMutation.mutate()}
                disabled={
                  !canRunPrivilegedActions || exportIssueAuditMutation.isPending
                }
                title={privilegedActionHint}
                className="h-9 px-3 rounded-md border border-border bg-surface text-[12px] disabled:opacity-50"
              >
                {copy("Export CSV", "Экспорт CSV", "ייצוא CSV")}
              </button>
              <button
                onClick={() => {
                  setIssueAuditAction("");
                  setIssueAuditIssueId("");
                  setIssueAuditDateFrom("");
                  setIssueAuditDateTo("");
                  setIssueAuditOffset(0);
                }}
                className="h-9 px-3 rounded-md border border-border bg-surface text-[12px]"
              >
                {copy("Reset", "Сбросить", "איפוס")}
              </button>
            </div>
          </div>
          {issueAuditIssueIdTrimmed.length > 0 &&
          !issueAuditIssueIdNormalized ? (
            <div className="px-4 pt-2 text-[12px] text-status-warning-fg">
              {copy(
                "Issue UUID format is invalid, filter is not applied.",
                "Формат UUID проблемы неверный, фильтр не применяется.",
                "פורמט UUID התקלה לא תקין, המסנן לא הוחל.",
              )}
            </div>
          ) : null}

          <div className="hidden md:grid grid-cols-[170px_1fr_1fr_220px] gap-3 px-4 py-3 border-b border-border text-[11px] uppercase text-text-secondary">
            <span>{copy("Time", "Время", "זמן")}</span>
            <span>{copy("Action", "Действие", "פעולה")}</span>
            <span>
              {copy("Changed fields", "Изменённые поля", "שדות שהשתנו")}
            </span>
            <span>{copy("Controls", "Управление", "פקדים")}</span>
          </div>
          {issueAuditQuery.isLoading && (
            <div className="px-4 py-6 text-[13px] text-text-secondary">
              {copy(
                "Loading issue audit…",
                "Загружаем аудит проблем…",
                "טוען ביקורת בעיה...",
              )}
            </div>
          )}
          {!issueAuditQuery.isLoading && issueAuditItems.length === 0 && (
            <div className="px-4 py-6 text-[13px] text-text-secondary">
              {copy(
                "No issue audit entries.",
                "Записей аудита проблем нет.",
                "אין רשומות ביקורת תקלות.",
              )}
            </div>
          )}
          {!issueAuditQuery.isLoading &&
            issueAuditItems.map((item) => {
              const changedFields = changedFieldKeys(item.before, item.after);
              const isExpanded = expandedIssueAuditId === item.id;
              return (
                <div key={item.id} className="border-t border-border">
                  <article className="px-4 py-3 md:hidden">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold leading-5 text-text">
                          {item.action}
                        </div>
                        <div className="mt-1 text-[11px] leading-4 text-text-secondary">
                          {formatDateTime(item.created_at)}
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          setExpandedIssueAuditId((current) =>
                            current === item.id ? null : item.id,
                          )
                        }
                        className="h-8 shrink-0 rounded-md border border-border bg-surface px-3 text-[12px]"
                      >
                        {isExpanded
                          ? copy("Hide Diff", "Скрыть изменения", "הסתר שינויים")
                          : copy("Show Diff", "Показать изменения", "הצג שינויים")}
                      </button>
                    </div>
                    <div className="mt-2 text-[12px] leading-5 text-text-secondary">
                      {item.reason ||
                        copy("No reason", "Без причины", "ללא סיבה")}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {changedFields.length === 0 ? (
                        <span className="text-[12px] text-text-secondary">
                          {copy(
                            "No detected changes",
                            "Изменений не обнаружено",
                            "לא זוהו שינויים",
                          )}
                        </span>
                      ) : (
                        changedFields.slice(0, 4).map((field) => (
                          <span
                            key={field}
                            className="inline-flex h-6 items-center rounded-md border border-border bg-surface px-2 text-[11px]"
                          >
                            {field}
                          </span>
                        ))
                      )}
                      {changedFields.length > 4 ? (
                        <span className="inline-flex h-6 items-center rounded-md border border-border bg-surface px-2 text-[11px] text-text-secondary">
                          +{changedFields.length - 4}
                        </span>
                      ) : null}
                    </div>
                    <button
                      onClick={() => {
                        if (item.entity_id) {
                          router.push(`/issues?issue_id=${item.entity_id}`);
                        }
                      }}
                      disabled={!item.entity_id}
                      className="mt-3 h-8 rounded-md border border-border bg-surface px-3 text-[12px] disabled:opacity-50"
                    >
                      {copy("Open Issue", "Открыть проблему", "פתח תקלה")}
                    </button>
                  </article>
                  <div className="hidden md:grid grid-cols-[170px_1fr_1fr_220px] gap-3 px-4 py-3 text-[13px] items-start">
                    <div className="text-text-secondary">
                      {formatDateTime(item.created_at)}
                    </div>
                    <div>
                      <div className="font-medium">{item.action}</div>
                      <div className="text-[11px] text-text-secondary mt-0.5">
                        {item.reason ||
                          copy("No reason", "Без причины", "ללא סיבה")}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {changedFields.length === 0 ? (
                        <span className="text-[12px] text-text-secondary">
                          {copy(
                            "No detected changes",
                            "Изменений не обнаружено",
                            "לא זוהו שינויים",
                          )}
                        </span>
                      ) : (
                        changedFields.slice(0, 4).map((field) => (
                          <span
                            key={field}
                            className="inline-flex h-6 items-center rounded-md border border-border bg-surface px-2 text-[11px]"
                          >
                            {field}
                          </span>
                        ))
                      )}
                      {changedFields.length > 4 ? (
                        <span className="inline-flex h-6 items-center rounded-md border border-border bg-surface px-2 text-[11px] text-text-secondary">
                          +{changedFields.length - 4}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          if (item.entity_id) {
                            router.push(`/issues?issue_id=${item.entity_id}`);
                          }
                        }}
                        disabled={!item.entity_id}
                        className="h-8 px-3 rounded-md border border-border bg-surface text-[12px] disabled:opacity-50"
                      >
                        {copy("Open Issue", "Открыть проблему", "פתח תקלה")}
                      </button>
                      <button
                        onClick={() =>
                          setExpandedIssueAuditId((current) =>
                            current === item.id ? null : item.id,
                          )
                        }
                        className="h-8 px-3 rounded-md border border-border bg-surface text-[12px]"
                      >
                        {isExpanded
                          ? copy("Hide Diff", "Скрыть изменения", "הסתר שינויים")
                          : copy("Show Diff", "Показать изменения", "הצג שינויים")}
                      </button>
                    </div>
                  </div>
                  {isExpanded ? (
                    <div className="px-4 pb-3">
                      <div className="grid gap-2 md:grid-cols-2">
                        <div className="rounded-lg border border-border bg-surface-subtle">
                          <div className="px-3 py-2 border-b border-border text-[11px] uppercase text-text-secondary">
                            {copy("Before", "До", "לפני")}
                          </div>
                          <pre className="p-3 text-[11px] leading-5 whitespace-pre-wrap break-all text-text-secondary overflow-x-auto">
                            {prettyJson(item.before)}
                          </pre>
                        </div>
                        <div className="rounded-lg border border-border bg-surface-subtle">
                          <div className="px-3 py-2 border-b border-border text-[11px] uppercase text-text-secondary">
                            {copy("After", "После", "אחרי")}
                          </div>
                          <pre className="p-3 text-[11px] leading-5 whitespace-pre-wrap break-all text-text-secondary overflow-x-auto">
                            {prettyJson(item.after)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          <div className="px-4 py-3 border-t border-border flex flex-wrap items-center justify-between gap-2 text-[12px]">
            <div className="text-text-secondary">
              {copy("Total matched", "Всего совпадений", 'סה"כ התאמות')}:{" "}
              {issueAuditSummary?.total || 0}
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={!issueAuditCanPrev}
                onClick={() =>
                  setIssueAuditOffset((x) =>
                    Math.max(0, x - AUDIT_PREVIEW_LIMIT),
                  )
                }
                className="h-8 px-3 rounded-md border border-border bg-surface disabled:opacity-50"
              >
                {tt("reports.prev")}
              </button>
              <button
                disabled={!issueAuditCanNext}
                onClick={() =>
                  setIssueAuditOffset((x) => x + AUDIT_PREVIEW_LIMIT)
                }
                className="h-8 px-3 rounded-md border border-border bg-surface disabled:opacity-50"
              >
                {tt("reports.next")}
              </button>
            </div>
          </div>
        </div>

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
