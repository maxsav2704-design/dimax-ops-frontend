import { useCallback, useEffect, useMemo, useState, useRef } from "react";


import { useRouter, useSearchParams } from "next/navigation";


import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileText,
  MapPinned,
  MessageCircle,
  Phone,
  Plus,
  PencilLine,
  RefreshCw,
  Search,
} from "lucide-react";

import { DashboardLayout } from "@/components/DashboardLayout";
import { AiAssistPanel } from "@/components/ai/AiAssistPanel";


import { DataStateNotice } from "@/components/DataStateNotice";


import { keepPreviousData, useQuery } from "@tanstack/react-query";


import { useReferenceList } from "@/hooks/use-reference-list";


import { useCompanyPricingState } from "@/hooks/use-company-pricing-state";



import { ProjectDialog } from "@/components/projects/ProjectDialog";

import { DoorCommandBar } from "@/components/projects/door-workspace/DoorCommandBar";


import { DoorMatrix } from "@/components/projects/door-workspace/DoorMatrix";


import type { ReasonItem } from "@/components/projects/catalog-types";



import { projectsPanelClass } from "@/components/projects/shared";


import { DoorLedger } from "@/components/projects/door-workspace/DoorLedger";


import { useDoorWorkspace } from "@/components/projects/door-workspace/useDoorWorkspace";


import { compareNatural } from "@/components/projects/shared";


import { ManualDoorDialog } from "@/components/projects/ManualDoorDialog";


import { emptyManualDoorForm } from "@/components/projects/manual-door-form";


import type { ManualDoorFormState } from "@/components/projects/manual-door-form";


import type { InstallerListItem, LibraryProductItem } from "@/components/projects/catalog-types";


import { FailedImportQueueCard } from "@/components/projects/FailedImportQueueCard";
import { DoorStagesCard } from "@/components/projects/DoorStagesCard";


import type { FailedImportQueueResponse } from "@/components/projects/import-types";


import { FAILED_QUEUE_PAGE_SIZE } from "@/components/projects/shared";


import { ImportHistoryPanel } from "@/components/projects/ImportHistoryPanel";


import type { ProjectImportRunDetails } from "@/components/projects/import-types";


import { ImportLayoutCheck } from "@/components/projects/ImportLayoutCheck";


import type { LayoutBucket, ProjectDoorsLayoutResponse } from "@/components/projects/layout-types";


import { BulkImportReviewCard } from "@/components/projects/BulkImportReviewCard";


import type { LatestImportReviewResponse } from "@/components/projects/import-types";


import { BulkReconcileCard } from "@/components/projects/BulkReconcileCard";


import type { BulkReconcileResponse } from "@/components/projects/import-types";



import type { ProjectImportRunItem } from "@/components/projects/project-types";


import { ProjectSettingsCard } from "@/components/projects/ProjectSettingsCard";


import type { ProjectDetailsResponse, ProjectListItem, ProjectOpenIssue } from "@/components/projects/project-types";


import { ProjectFinancialScreen } from "@/components/projects/ProjectFinancialScreen";


import type { ProjectPlanFactResponse, ProjectRiskDrilldownResponse } from "@/components/projects/financial-types";


import { formatPct } from "@/components/projects/shared";


import { AdditionalWorksCard } from "@/components/projects/AdditionalWorksCard";


import type { AddonTypeItem, ProjectAddonPlanItem } from "@/components/projects/catalog-types";


import { UrgencySurchargesCard } from "@/components/projects/UrgencySurchargesCard";


import type { UrgencySurchargeItem } from "@/components/projects/urgency-form";


import { ProjectDocumentsCard } from "@/components/projects/ProjectDocumentsCard";


import type { DocumentGenerationDTO, DocumentTemplateDTO } from "@/components/projects/document-shared";


import { DoorImportWizard } from "@/components/projects/DoorImportWizard";


import { useImportCopy } from "@/components/projects/import-copy";


import type { DoorType, ImportColumnsDiagnostics, ImportResult, ImportMappingProfilesResponse } from "@/components/projects/import-types";


import { emptyProjectForm, projectsMetricLabelClass } from "@/components/projects/project-form";


import type { ProjectFormState } from "@/components/projects/project-form";


import {
  Breadcrumbs,
  ConfirmActionDialog,
  FactStrip,
  PillButton,
  WidgetCard,
  resolveKpiTone,
  useScrolledPast,
} from "@/components/dimax";


import { Button } from "@/components/ui/button";


import { LtrText } from "@/components/ui/LtrText";


import {
  Select,
} from "@/components/ui/select";


import { StatusBadge } from "@/components/ui/status-badge";


import { apiFetch } from "@/lib/api";


import { readableApiError } from "@/lib/api-error-display";


import { formatLocaleMoney } from "@/lib/formatting";


import { useAuthSession } from "@/hooks/use-auth-session";


import {
  canManageImports,
  canRunPrivilegedAdminActions,
  canViewRates,
} from "@/lib/admin-access";


import { useI18n, type Locale, useCopy } from "@/lib/i18n";
import { statusLabel, type StatusLabelDomain } from "@/lib/status-labels";


import { cn } from "@/lib/utils";


const projectsOverrides: Partial<Record<Locale, Record<string, string>>> = {
  he: {
    "projects.activeScope": "הקשר פעיל",
    "projects.portfolioOverview": "מבט על הפורטפוליו",
    "projects.selectProjectHint":
      "בחר פרויקט כדי לעדכן יבוא, רווחיות וסיכונים.",
    "projects.queue": "תור",
    "projects.retryFailed": "נסה שוב כושלים",
    "projects.reconcileAll": "התאמה מלאה",
    "projects.reportsHandoff": 'זוהו {count} פרויקטים מהדו"ח עם יבואים כושלים.',
    "projects.retryFailedOnly": "נסה שוב רק את הכושלים",
    "projects.toReconcileSafely": "ואז בצע התאמה בצורה בטוחה.",
    "projects.projectList": "רשימת פרויקטים",
    "projects.portfolioNavigator": "ניווט פורטפוליו",
    "projects.filteredCount": "מסוננים:",
    "projects.selectedCount": "נבחרו:",
    "projects.searchProject": "חיפוש לפי שם או כתובת",
    "projects.selectAllFiltered": "בחר את כל המסוננים",
    "projects.reviewing": "בודק...",
    "projects.reviewSelected": "בדוק נבחרים",
    "projects.reconciling": "מבצע התאמה...",
    "projects.reconcile": "התאם",
    "projects.retryFailedLatestOnly": "רק הרצות אחרונות שנכשלו",
    "projects.loadingProjects": "טוען פרויקטים...",
    "projects.noProjectsFound": "לא נמצאו פרויקטים.",
    "projects.failedImportsQueue": "תור יבואים כושלים",
    "projects.refreshQueue": "רענן תור",
    "projects.retryingProgress": "מנסה שוב {processed} מתוך {total}",
    "projects.retrySelected": "נסה שוב נבחרים ({count})",
    "projects.progress": "התקדמות",
    "projects.lastRetryBatch":
      "ניסיון אחרון: {success} הצליחו, {failed} נכשלו, {skipped} דולגו",
    "projects.loadingFailedQueue": "טוען תור יבואים כושלים...",
    "projects.noFailedQueue": "אין כרגע יבואים כושלים.",
  },
};

type ProjectStatusFilter = "ALL" | "ACTIVE" | "PROBLEM" | "COMPLETED" | "ARCHIVED";

const PROJECT_COMPLETED_STATUSES = new Set([
  "COMPLETED",
  "DONE",
  "FINISHED",
  "CLOSED",
]);
const PROJECT_ARCHIVED_STATUSES = new Set(["ARCHIVED"]);
const PROJECTS_PAGE_SIZE = 200;
const PROJECT_PROBLEM_STATUSES = new Set([
  "AT_RISK",
  "BLOCKED",
  "DELAYED",
  "ON_HOLD",
  "OVERDUE",
  "PROBLEM",
  "PROBLEMATIC",
  "RISK",
]);

function normalizeProjectStatus(status: string | null | undefined): string {
  return String(status || "").trim().toUpperCase().replace(/[-\s]+/g, "_");
}

function isProjectCompletedStatus(status: string | null | undefined): boolean {
  return PROJECT_COMPLETED_STATUSES.has(normalizeProjectStatus(status));
}

function isProjectArchivedStatus(status: string | null | undefined): boolean {
  return PROJECT_ARCHIVED_STATUSES.has(normalizeProjectStatus(status));
}

function isProjectProblemStatus(status: string | null | undefined): boolean {
  return PROJECT_PROBLEM_STATUSES.has(normalizeProjectStatus(status));
}

function projectLifecycleStatus(project: ProjectListItem): string {
  return normalizeProjectStatus(project.lifecycle_status || project.status);
}

function projectHealthStatus(project: ProjectListItem): string {
  return normalizeProjectStatus(project.health_status || project.status);
}

function isProjectActivePortfolioStatus(project: ProjectListItem): boolean {
  const lifecycle = projectLifecycleStatus(project);
  return (
    !isProjectCompletedStatus(lifecycle) &&
    !isProjectArchivedStatus(lifecycle) &&
    lifecycle !== "CANCELLED"
  );
}

function projectMatchesStatusFilter(
  project: ProjectListItem,
  filter: ProjectStatusFilter,
): boolean {
  const lifecycle = projectLifecycleStatus(project);
  const health = projectHealthStatus(project);
  if (filter === "ACTIVE") {
    return isProjectActivePortfolioStatus(project);
  }
  if (filter === "PROBLEM") {
    return isProjectProblemStatus(health);
  }
  if (filter === "COMPLETED") {
    return isProjectCompletedStatus(lifecycle);
  }
  if (filter === "ARCHIVED") {
    return lifecycle === "CANCELLED" || isProjectArchivedStatus(lifecycle);
  }
  return true;
}

type DoorActionResponse = {
  ok?: boolean;
  id: string;
  status: string;
  version: number;
};

type BulkAssignDoorsResponse = {
  assigned: number;
  skipped: number;
  assigned_door_ids: string[];
};

type ProjectImportRunsResponse = {
  items: ProjectImportRunItem[];
};

function projectFormFromDetails(
  details: ProjectDetailsResponse | null,
): ProjectFormState {
  const addressDetails = details?.address_details;
  const developer = details?.developer;
  return {
    code: details?.code || "",
    name: details?.name || "",
    planned_start_date: details?.planned_start_date || "",
    planned_end_date: details?.planned_end_date || "",
    lifecycle_status: details?.lifecycle_status || "ACTIVE",
    address: details?.address || "",
    address_street: addressDetails?.street || details?.address_street || "",
    address_building:
      addressDetails?.building || details?.address_building || "",
    address_city: addressDetails?.city || details?.address_city || "",
    address_entrance:
      addressDetails?.entrance || details?.address_entrance || "",
    address_lat:
      addressDetails?.lat != null
        ? String(addressDetails.lat)
        : details?.address_lat != null
          ? String(details.address_lat)
          : "",
    address_lng:
      addressDetails?.lng != null
        ? String(addressDetails.lng)
        : details?.address_lng != null
          ? String(details.address_lng)
          : "",
    address_waze_url:
      addressDetails?.waze_url || details?.address_waze_url || "",
    developer_company: developer?.name || details?.developer_company || "",
    contact_name: developer?.contact_name || details?.contact_name || "",
    contact_phone: developer?.phone || details?.contact_phone || "",
    developer_phone_alt:
      developer?.phone_alt || details?.developer_phone_alt || "",
    developer_whatsapp:
      developer?.whatsapp || details?.developer_whatsapp || "",
    contact_email: developer?.email || details?.contact_email || "",
    developer_notes: developer?.notes || details?.developer_notes || "",
  };
}

const LOCATION_LABELS: Record<
  string,
  { en: string; ru: string; he: string }
> = {
  dira: { en: "Dira", ru: "Квартира", he: "דירה" },
  mamad: { en: "Mamad", ru: "МАМАД", he: "ממ״ד" },
  madregot: { en: "Stairwell", ru: "Лестница", he: "חדר מדרגות" },
  mahzan: { en: "Storage", ru: "Склад", he: "מחסן" },
  heder_ashpa: { en: "Waste room", ru: "Мусорная комната", he: "חדר אשפה" },
  lobby_maalit: { en: "Elevator lobby", ru: "Холл лифта", he: "לובי מעלית" },
};

function daysUntilDate(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }
  const target = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T23:59:59` : value,
  );
  if (Number.isNaN(target.getTime())) {
    return null;
  }
  return Math.ceil((target.getTime() - Date.now()) / 86_400_000);
}

function parseIdsCsv(value: string | null): string[] {
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map((x) => x.trim())
    .filter((x) => x.length > 0);
}

type ProjectSectionKey =
  | "mappingProfiles"
  | "details"
  | "planFact"
  | "risk"
  | "addonPlan"
  | "urgency"
  | "documents"
  | "importHistory"
  | "importRunDetails"
  | "failedQueue";

export default function ProjectsPage() {
  const { locale, t } = useI18n();
  const formatMoney = (value: string | number | null | undefined): string => {
    if (value == null || String(value).trim() === "" || !Number.isFinite(Number(value))) {
      return "-";
    }
    return formatLocaleMoney(value, "ILS", locale, { minimumFractionDigits: 2 });
  };
  const tt = (key: string) => projectsOverrides[locale]?.[key] ?? t(key);
  const copy = useCopy();
  // E3: past 120 px the selected project keeps its name, status and the way back to its doors.
  const projectBarCondensed = useScrolledPast();
  const locationLabel = (value: string | null | undefined): string => {
    if (!value) {
      return "-";
    }
    return LOCATION_LABELS[value]?.[locale] || value;
  };
  const { importRowErrorLabel, importProfileLabel } = useImportCopy();
  // Server status codes in the reader's language (shared table, so other pages name them the same way).
  const tokenLabel = (value: string, domain: StatusLabelDomain = "generic") => statusLabel(value, locale, domain);
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = useAuthSession();
  const canManageProjects = canRunPrivilegedAdminActions(session);
  const canViewProjectRates = canViewRates(session);
  const canManageProjectImports = canManageImports(session);
  const commercialAccessRestrictedTitle = copy(
    "Commercial access is restricted",
    "Коммерческий доступ ограничен",
    "הגישה המסחרית מוגבלת",
  );
  // A money tile without its figures says why: no right to see them, still loading, or the request failed.
  const financeTileState = (query: { isError: boolean; isSuccess: boolean }) =>
    !canViewProjectRates
      ? commercialAccessRestrictedTitle
      : query.isError || query.isSuccess
        ? copy("No data", "Нет данных", "אין נתונים")
        : copy("Loading…", "Загрузка…", "טוען…");
  const commercialAccessRestrictedDetail = copy(
    "This admin scope can manage project operations, doors and imports, but prices, payroll, profit, add-on plans and urgency surcharge rows require finance access.",
    "Этот админ-доступ может управлять операциями проекта, дверями и импортом, но цены, зарплаты, прибыль, планы доп. работ и срочные надбавки требуют финансового доступа.",
    "היקף ניהול זה יכול לנהל את פעולות הפרויקט, דלתות וייבוא, אך מחירים, שכר, רווח, תוכניות תוספות ושורות היטלים דחופים דורשים גישה למימון.",
  );
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const doorTypesReference = useReferenceList<DoorType>("/api/v1/admin/door-types?limit=200", 200);
  const libraryReference = useReferenceList<LibraryProductItem>("/api/v1/admin/library?status=ACTIVE&limit=500");
  const installersReference = useReferenceList<InstallerListItem>("/api/v1/admin/installers?limit=200");
  const reasonsReference = useReferenceList<ReasonItem>("/api/v1/admin/reasons?is_active=true&limit=200");
  const addonTypesReference = useReferenceList<AddonTypeItem>("/api/v1/admin/addons/types");
  const templatesReference = useReferenceList<DocumentTemplateDTO>("/api/v1/admin/documents/templates");
  const { items: doorTypes, loading: loadingDoorTypes } = doorTypesReference;
  const { items: libraryProducts, loading: loadingLibraryProducts } = libraryReference;
  const { items: installers } = installersReference;
  const { items: reasons, loading: loadingReasons } = reasonsReference;
  const { items: addonTypes, loading: loadingAddonTypes } = addonTypesReference;
  const { items: documentTemplates, loading: loadingDocumentTemplates } = templatesReference;
  const references = [
    { key: "door-types", label: copy("Door types", "Типы дверей", "סוגי דלתות"), data: doorTypesReference },
    { key: "library", label: copy("Product library", "Каталог изделий", "קטלוג מוצרים"), data: libraryReference },
    { key: "installers", label: copy("Installers", "Монтажники", "מתקינים"), data: installersReference },
    { key: "reasons", label: copy("Issue reasons", "Причины проблем", "סיבות לתקלות"), data: reasonsReference },
    { key: "addons", label: copy("Additional work types", "Виды доп. работ", "סוגי עבודות נוספות"), data: addonTypesReference },
    { key: "templates", label: copy("Document templates", "Шаблоны документов", "תבניות מסמכים"), data: templatesReference },
  ];
  const referenceUnavailable = copy(
    "Reference data is unavailable. Try loading it again.",
    "Справочник недоступен. Повторите его загрузку.",
    "נתוני הקטלוג אינם זמינים. יש לטעון אותם שוב.",
  );
  const appliedDeepLinkRef = useRef<string | null>(null);
  const layoutRequestRef = useRef<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );

  // Financial sections of the selected project live in react-query: keyed by
  // project, only when rates are visible, cached across selections.
  const financialsEnabled = Boolean(selectedProjectId) && canViewProjectRates;
  const projectPlanFactQuery = useQuery({
    queryKey: ["projects", "plan-fact", selectedProjectId],
    queryFn: async () => {
      const response = await apiFetch<ProjectPlanFactResponse>(
        `/api/v1/admin/reports/project-plan-fact/${selectedProjectId}`,
      );
      return response && typeof response.project_id === "string" ? response : null;
    },
    enabled: financialsEnabled,
    retry: false,
  });
  const projectRiskQuery = useQuery({
    queryKey: ["projects", "risk-drilldown", selectedProjectId],
    queryFn: async () => {
      const response = await apiFetch<ProjectRiskDrilldownResponse>(
        `/api/v1/admin/reports/project-risk-drilldown/${selectedProjectId}?limit=5`,
      );
      return response && typeof response.project_id === "string" ? response : null;
    },
    enabled: financialsEnabled,
    retry: false,
  });
  const projectAddonPlanQuery = useQuery({
    queryKey: ["projects", "addon-plan", selectedProjectId],
    queryFn: async () => {
      const response = await apiFetch<
        ProjectAddonPlanItem[] | { items?: ProjectAddonPlanItem[] }
      >(`/api/v1/admin/projects/${selectedProjectId}/addons/plan`);
      return Array.isArray(response) ? response : response.items || [];
    },
    enabled: financialsEnabled,
    retry: false,
  });
  const urgencySurchargesQuery = useQuery({
    queryKey: ["projects", "urgency-surcharges", selectedProjectId],
    queryFn: async () => {
      const response = await apiFetch<
        UrgencySurchargeItem[] | { items?: UrgencySurchargeItem[] }
      >(`/api/v1/admin/projects/${selectedProjectId}/urgency-surcharges`);
      return Array.isArray(response) ? response : response.items || [];
    },
    enabled: financialsEnabled,
    retry: false,
  });
  const projectPlanFact = financialsEnabled ? (projectPlanFactQuery.data ?? null) : null;
  const projectRisk = financialsEnabled ? (projectRiskQuery.data ?? null) : null;
  const projectAddonPlan = useMemo(
    () => (financialsEnabled ? (projectAddonPlanQuery.data ?? []) : []),
    [financialsEnabled, projectAddonPlanQuery.data],
  );
  const urgencySurcharges = useMemo(
    () => (financialsEnabled ? (urgencySurchargesQuery.data ?? []) : []),
    [financialsEnabled, urgencySurchargesQuery.data],
  );
  const loadingProjectPlanFact = projectPlanFactQuery.isFetching;
  const loadingProjectRisk = projectRiskQuery.isFetching;
  const loadingProjectAddonPlan = projectAddonPlanQuery.isFetching;
  const loadingUrgencySurcharges = urgencySurchargesQuery.isFetching;

  // Same names as the former loaders so call sites stay untouched; refetch()
  // ignores `enabled`, hence the guard.
  const refetchPlanFact = projectPlanFactQuery.refetch;
  const refetchRisk = projectRiskQuery.refetch;
  const refetchAddonPlan = projectAddonPlanQuery.refetch;
  const refetchUrgency = urgencySurchargesQuery.refetch;
  const loadProjectPlanFact = useCallback(async (_projectId: string) => {
    if (financialsEnabled) await refetchPlanFact();
  }, [financialsEnabled, refetchPlanFact]);
  const loadProjectRisk = useCallback(async (_projectId: string) => {
    if (financialsEnabled) await refetchRisk();
  }, [financialsEnabled, refetchRisk]);
  const loadProjectAddonPlan = useCallback(async (_projectId: string) => {
    if (financialsEnabled) await refetchAddonPlan();
  }, [financialsEnabled, refetchAddonPlan]);
  const loadUrgencySurcharges = useCallback(async (_projectId: string) => {
    if (financialsEnabled) await refetchUrgency();
  }, [financialsEnabled, refetchUrgency]);

  const pricing = useCompanyPricingState(canViewProjectRates && Boolean(selectedProjectId));
  const factoryPricing = pricing.state?.mode === "FACTORY";
  const pricingKnown = Boolean(pricing.state) && !pricing.error;
  const pricingReady = pricingKnown && !pricing.loading;
  const missingAddonPrice = copy("No confirmed price", "Нет подтверждённой цены", "אין מחיר מאושר");
  const factoryAddonRates = useMemo(() => new Map(
    (pricing.state?.active_price?.items ?? []).filter((item) => item.kind === "ADDON").map((item) => [item.target_id, item.rate]),
  ), [pricing.state]);
  const addonPlanRate = (item: ProjectAddonPlanItem) => !pricingKnown ? null
    : factoryPricing ? factoryAddonRates.get(item.addon_type_id) ?? null : item.installer_price;
  const [layout, setLayout] = useState<ProjectDoorsLayoutResponse | null>(null);
  const [search, setSearch] = useState("");
  const [projectStatusFilter, setProjectStatusFilter] =
    useState<ProjectStatusFilter>("ALL");
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [projectsLoaded, setProjectsLoaded] = useState(false);
  const [projectsLoadError, setProjectsLoadError] = useState(false);
  const [loadingLayout, setLoadingLayout] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectFlowNotice, setProjectFlowNotice] = useState<string | null>(
    null,
  );
  const [projectActionHint, setProjectActionHint] = useState<string | null>(
    null,
  );
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [projectDialogMode, setProjectDialogMode] = useState<"create" | "edit">(
    "create",
  );
  const [projectDialogInitialForm, setProjectDialogInitialForm] =
    useState<ProjectFormState>(emptyProjectForm());
  // Bumped on every open so ProjectDialog remounts with a fresh form state.
  const [projectDialogSession, setProjectDialogSession] = useState(0);
  // ManualDoorDialog owns the form; the page passes the values it should open with
  // and remounts the dialog per open (key) so a fresh form state is guaranteed.
  const [manualDoorInitialForm, setManualDoorInitialForm] =
    useState<ManualDoorFormState>(emptyManualDoorForm());
  const [manualDoorSession, setManualDoorSession] = useState(0);
  const openManualDoorWith = (form: ManualDoorFormState) => {
    setManualDoorInitialForm(form);
    setManualDoorSession((prev) => prev + 1);
  };

  const [manualDoorDialogOpen, setManualDoorDialogOpen] = useState(false);

  const [analysisReady, setAnalysisReady] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importHistoryModeFilter, setImportHistoryModeFilter] = useState("all");
  const [importHistoryStatusFilter, setImportHistoryStatusFilter] =
    useState("all");
  const [retryingRunId, setRetryingRunId] = useState<string | null>(null);
  const [bulkSelectedProjectIds, setBulkSelectedProjectIds] = useState<
    string[]
  >([]);
  const [bulkOnlyFailedRuns, setBulkOnlyFailedRuns] = useState(false);
  const [bulkReviewLoading, setBulkReviewLoading] = useState(false);
  const [bulkReviewResult, setBulkReviewResult] =
    useState<LatestImportReviewResponse | null>(null);
  const [bulkReconcileLoading, setBulkReconcileLoading] = useState(false);
  const [bulkReconcileResult, setBulkReconcileResult] =
    useState<BulkReconcileResponse | null>(null);
  const [failedQueueOffset, setFailedQueueOffset] = useState(0);
  const [failedQueueOnlySelectedProject, setFailedQueueOnlySelectedProject] =
    useState(false);

  // Selected-project panels and page catalogs on react-query. Loader names
  // below stay as thin refetch wrappers so existing call sites keep working.
  const projectDetailsQuery = useQuery({
    queryKey: ["projects", "details", selectedProjectId],
    queryFn: async () =>
      (await apiFetch<ProjectDetailsResponse>(`/api/v1/admin/projects/${selectedProjectId}`)) || null,
    enabled: Boolean(selectedProjectId),
    retry: false,
  });
  const projectDocumentsQuery = useQuery({
    queryKey: ["projects", "documents", selectedProjectId],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("project_id", selectedProjectId as string);
      params.set("limit", "12");
      const response = await apiFetch<{ items?: DocumentGenerationDTO[] }>(
        `/api/v1/admin/documents/generated?${params.toString()}`,
      );
      return response.items || [];
    },
    enabled: Boolean(selectedProjectId),
    retry: false,
  });
  const mappingProfilesQuery = useQuery({
    queryKey: ["projects", "import-mapping-profiles"],
    queryFn: () => apiFetch<ImportMappingProfilesResponse>("/api/v1/admin/projects/import-mapping-profiles"),
    retry: false,
  });
  const failedQueueQuery = useQuery({
    queryKey: [
      "projects",
      "failed-import-queue",
      failedQueueOffset,
      failedQueueOnlySelectedProject ? selectedProjectId : null,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("limit", String(FAILED_QUEUE_PAGE_SIZE));
      params.set("offset", String(failedQueueOffset));
      if (failedQueueOnlySelectedProject && selectedProjectId) {
        params.set("project_id", selectedProjectId);
      }
      const response = await apiFetch<FailedImportQueueResponse>(
        `/api/v1/admin/projects/import-runs/failed-queue?${params.toString()}`,
      );
      return {
        items: response.items || [],
        total: response.total || 0,
        limit: response.limit || FAILED_QUEUE_PAGE_SIZE,
        offset: response.offset || 0,
      };
    },
    placeholderData: keepPreviousData,
    retry: false,
  });
  const projectDetails = selectedProjectId ? (projectDetailsQuery.data ?? null) : null;
  const projectDocuments = useMemo(
    () => (selectedProjectId ? (projectDocumentsQuery.data ?? []) : []),
    [projectDocumentsQuery.data, selectedProjectId],
  );
  const failedQueue = failedQueueQuery.data ?? null;
  const loadingProjectDetails = projectDetailsQuery.isFetching;
  const loadingProjectDocuments = projectDocumentsQuery.isFetching;
  const loadingMappingProfiles = mappingProfilesQuery.isFetching;
  const loadingFailedQueue = failedQueueQuery.isFetching;
  const refetchProjectDetails = projectDetailsQuery.refetch;
  const refetchProjectDocuments = projectDocumentsQuery.refetch;
  const refetchMappingProfiles = mappingProfilesQuery.refetch;
  const refetchFailedQueue = failedQueueQuery.refetch;
  const loadProjectDetails = useCallback(async (_projectId: string) => {
    if (selectedProjectId) await refetchProjectDetails();
  }, [refetchProjectDetails, selectedProjectId]);
  const loadProjectDocuments = useCallback(async (_projectId: string) => {
    if (selectedProjectId) await refetchProjectDocuments();
  }, [refetchProjectDocuments, selectedProjectId]);
  const loadMappingProfiles = useCallback(async () => {
    await refetchMappingProfiles();
  }, [refetchMappingProfiles]);
  const loadFailedQueue = useCallback(async () => {
    await refetchFailedQueue();
  }, [refetchFailedQueue]);

  const [focusedImportRunId, setFocusedImportRunId] = useState<string | null>(
    null,
  );
  const [deepLinkApplied, setDeepLinkApplied] = useState(false);
  const [deepLinkProjectMissing, setDeepLinkProjectMissing] = useState(false);
  const [deepLinkFocusApplied, setDeepLinkFocusApplied] = useState(false);
  const [createProjectDeepLinkApplied, setCreateProjectDeepLinkApplied] =
    useState(false);
  // One ledger layout at a time (cards below md, table from md); both keep

  const deepLinkProjectId = (searchParams?.get("project_id") || "").trim();
  const createProjectRequested = searchParams?.get("create") === "1";
  const deepLinkFocusSection = (searchParams?.get("focus_section") || "")
    .trim()
    .toLowerCase();
  const deepLinkOrderNumber = (searchParams?.get("order_number") || "").trim();
  const focusedSectionLabel =
    deepLinkFocusSection === "doors"
      ? copy("Doors", "Двери", "דלתות")
      : deepLinkFocusSection === "addons"
        ? copy("Additional works", "Дополнительные работы", "עבודות נוספות")
        : deepLinkFocusSection === "urgency"
          ? copy("Urgency surcharge", "Доплата за срочность", "תוספת דחיפות")
          : "";
  const deepLinkLibraryProductId = (
    searchParams?.get("library_product_id") || ""
  ).trim();
  const deepLinkLibraryInstallType = (
    searchParams?.get("library_install_type") || ""
  ).trim();
  const deepLinkFailedIds = useMemo(
    () => parseIdsCsv(searchParams?.get("failed_project_ids") || null),
    [searchParams],
  );
  const deepLinkOnlyFailed = searchParams?.get("only_failed_runs") === "1";

  // Import history and the focused run on react-query, keyed by project / filter / run.
  const importHistoryQuery = useQuery({
    queryKey: ["projects", "import-history", selectedProjectId, importHistoryModeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("limit", "30");
      params.set("offset", "0");
      if (importHistoryModeFilter !== "all") {
        params.set("mode", importHistoryModeFilter);
      }
      const response = await apiFetch<ProjectImportRunsResponse>(
        `/api/v1/admin/projects/${selectedProjectId}/doors/import-history?${params.toString()}`,
      );
      return response.items || [];
    },
    enabled: Boolean(selectedProjectId),
    retry: false,
  });
  const importRunDetailsQuery = useQuery({
    queryKey: ["projects", "import-run", selectedProjectId, focusedImportRunId],
    queryFn: () =>
      apiFetch<ProjectImportRunDetails>(
        `/api/v1/admin/projects/${selectedProjectId}/doors/import-runs/${focusedImportRunId}`,
      ),
    enabled: Boolean(selectedProjectId && focusedImportRunId),
    retry: false,
  });
  const importHistory = useMemo(
    () => (selectedProjectId ? (importHistoryQuery.data ?? []) : []),
    [importHistoryQuery.data, selectedProjectId],
  );
  const focusedImportRunDetails =
    selectedProjectId && focusedImportRunId ? (importRunDetailsQuery.data ?? null) : null;
  const loadingImportHistory = importHistoryQuery.isFetching;
  const loadingImportRunDetails = importRunDetailsQuery.isFetching;
  const refetchImportHistory = importHistoryQuery.refetch;
  const refetchImportRunDetails = importRunDetailsQuery.refetch;
  const loadImportHistory = useCallback(async (_projectId: string) => {
    if (selectedProjectId) await refetchImportHistory();
  }, [refetchImportHistory, selectedProjectId]);
  const loadImportRunDetails = useCallback(async (_projectId: string, _runId: string) => {
    if (selectedProjectId && focusedImportRunId) await refetchImportRunDetails();
  }, [focusedImportRunId, refetchImportRunDetails, selectedProjectId]);

  // Deep link into failed runs: focus the first failed/partial run once history is in.
  useEffect(() => {
    const items = importHistoryQuery.data;
    if (!items || (!deepLinkOnlyFailed && deepLinkFailedIds.length === 0)) return;
    setFocusedImportRunId((currentRunId) => {
      if (currentRunId) return currentRunId;
      const failed = items.find((item) => item.status === "FAILED" || item.status === "PARTIAL");
      return failed?.id || currentRunId;
    });
  }, [deepLinkFailedIds, deepLinkOnlyFailed, importHistoryQuery.data]);
  const [deepLinkDoorFlowApplied, setDeepLinkDoorFlowApplied] = useState(false);
  const failedQueueCanPrev = failedQueueOffset > 0;
  const failedQueueCanNext =
    failedQueueOffset + FAILED_QUEUE_PAGE_SIZE < (failedQueue?.total || 0);

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter((p) => {
      if (!projectMatchesStatusFilter(p, projectStatusFilter)) {
        return false;
      }
      if (!q) {
        return true;
      }
      return `${p.name} ${p.address} ${p.lifecycle_status || ""} ${p.health_status || p.status}`
        .toLowerCase()
        .includes(q);
    });
  }, [projects, projectStatusFilter, search]);

  const projectPortfolioStats = useMemo(() => {
    const active = projects.filter(isProjectActivePortfolioStatus).length;
    const problem = projects.filter((project) =>
      isProjectProblemStatus(projectHealthStatus(project)),
    ).length;
    const completed = projects.filter((project) =>
      isProjectCompletedStatus(projectLifecycleStatus(project)),
    ).length;
    const archived = projects.filter((project) => {
      const lifecycle = projectLifecycleStatus(project);
      return lifecycle === "CANCELLED" || isProjectArchivedStatus(lifecycle);
    }).length;

    return {
      active,
      archived,
      completed,
      problem,
      total: projects.length,
    };
  }, [projects]);

  const projectStatusTabs = [
      { id: "ALL" as const, label: copy("All", "Все", "הכל"), count: projectPortfolioStats.total },
      {
        id: "ACTIVE" as const,
        label: copy("Active", "Активные", "פעילים"),
        count: projectPortfolioStats.active,
      },
      {
        id: "PROBLEM" as const,
        label: copy("Problem", "Проблемные", "בעייתיים"),
        count: projectPortfolioStats.problem,
      },
      {
        id: "COMPLETED" as const,
        label: copy("Completed", "Завершённые", "הושלמו"),
        count: projectPortfolioStats.completed,
      },
      {
        id: "ARCHIVED" as const,
        label: copy("Archived / cancelled", "Архив / отменённые", "ארכיון / בוטלו"),
        count: projectPortfolioStats.archived,
      },
    ];

  const [confirmBulkReconcileOpen, setConfirmBulkReconcileOpen] = useState(false);
  const filteredProjectIds = useMemo(
    () => filteredProjects.map((p) => p.id),
    [filteredProjects],
  );

  const hiddenBulkSelectionCount = useMemo(() => {
    const visible = new Set(filteredProjectIds);
    return bulkSelectedProjectIds.filter((id) => !visible.has(id)).length;
  }, [bulkSelectedProjectIds, filteredProjectIds]);

  const allFilteredSelected = useMemo(
    () =>
      filteredProjectIds.length > 0 &&
      filteredProjectIds.every((id) => bulkSelectedProjectIds.includes(id)),
    [filteredProjectIds, bulkSelectedProjectIds],
  );
  const deepLinkedFailedCount = useMemo(() => {
    if (deepLinkFailedIds.length === 0) {
      return 0;
    }
    const ids = new Set(projects.map((x) => x.id));
    return deepLinkFailedIds.filter((id) => ids.has(id)).length;
  }, [deepLinkFailedIds, projects]);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) || null,
    [projects, selectedProjectId],
  );
  const projectDetailFocused = Boolean(selectedProject);
  const activeLibraryProducts = useMemo(
    () => libraryProducts.filter((item) => item.status === "ACTIVE"),
    [libraryProducts],
  );
  const activeInstallers = useMemo(
    () =>
      installers.filter((item) => item.is_active && item.status !== "ARCHIVED"),
    [installers],
  );
  const activeReasons = useMemo(
    () => reasons.filter((item) => item.is_active),
    [reasons],
  );
  const activeInstallerById = useMemo(
    () => new Map(activeInstallers.map((item) => [item.id, item])),
    [activeInstallers],
  );
  const activeAddonTypes = useMemo(
    () => addonTypes.filter((item) => item.status !== "ARCHIVED"),
    [addonTypes],
  );
  const addonPlanTotals = useMemo(() => {
    return projectAddonPlan.reduce(
      (acc, item) => {
        const qty = Number(item.qty_planned) || 0;
        const client = Number(item.client_price) || 0;
        const price = !pricingKnown ? null : factoryPricing ? factoryAddonRates.get(item.addon_type_id) ?? null : item.installer_price;
        const installer = Number(price) || 0;
        if (price === null) acc.missingPrice = true;
        acc.rows += 1;
        acc.qty += qty;
        acc.client += qty * client;
        acc.installer += qty * installer;
        return acc;
      },
      { rows: 0, qty: 0, client: 0, installer: 0, missingPrice: false },
    );
  }, [projectAddonPlan, pricingKnown, factoryPricing, factoryAddonRates]);

  const floorGroups = useMemo(() => {
    if (!layout) {
      return [];
    }
    const byFloor = new Map<
      string,
      { floor: string; total: number; buckets: LayoutBucket[] }
    >();
    for (const bucket of layout.buckets) {
      const floor = bucket.floor_label || "-";
      const existing = byFloor.get(floor);
      if (existing) {
        existing.total += bucket.total;
        existing.buckets.push(bucket);
      } else {
        byFloor.set(floor, { floor, total: bucket.total, buckets: [bucket] });
      }
    }
    return [...byFloor.values()].sort((a, b) =>
      a.floor.localeCompare(b.floor, "en"),
    );
  }, [layout]);

  const doorTypeLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of doorTypes) {
      map.set(item.id, `${item.code} - ${item.name}`);
    }
    return map;
  }, [doorTypes]);

  const missingDoorTypeLabel = loadingDoorTypes
    ? copy("Loading type...", "Загружаем тип...", "טוען סוג...")
    : doorTypesReference.error
      ? copy("Type unavailable", "Тип недоступен", "הסוג אינו זמין")
      : copy("Unknown type", "Неизвестный тип", "סוג לא ידוע");
  const doorTypeLabel = useCallback((id: string) =>
    doorTypeLabelById.get(id) || missingDoorTypeLabel, [doorTypeLabelById, missingDoorTypeLabel]);

  const issuesByDoorId = useMemo(() => {
    const map = new Map<string, ProjectOpenIssue[]>();
    for (const issue of projectDetails?.issues_open || []) {
      const existing = map.get(issue.door_id);
      if (existing) {
        existing.push(issue);
      } else {
        map.set(issue.door_id, [issue]);
      }
    }
    return map;
  }, [projectDetails]);
  const workspace = useDoorWorkspace({
    layout,
    selectedProjectId,
    canManageProjects,
    activeInstallerById,
    issuesByDoorId,
    doorTypeLabel,
  });
  const {
    allFilteredDoorsSelected,
    bulkAssignInstallerId,
    bulkAssignLoading,
    doorStatusAction,
    existingDoorMarkings,
    filteredDoorIds,
    filteredMatrixRows,
    filteredMatrixSummary,
    focusedDoorComment,
    focusedDoorId,
    focusedDoorInstaller,
    focusedDoorIssues,
    focusedDoorOverrideReason,
    focusedDoorReasonId,
    focusedDoorRow,
    hiddenMatrixRows,
    hiddenSelectedDoorCount,
    ledgerDesktop,
    matrixApartmentSearch,
    matrixDoorType,
    matrixDoorTypeOptions,
    matrixFloor,
    matrixFloorOptions,
    matrixHouse,
    matrixHouseOptions,
    matrixInstaller,
    matrixIssueFilter,
    matrixLegendCounts,
    matrixLocation,
    matrixLocationOptions,
    matrixMarkingSearch,
    matrixOrderNumber,
    matrixOrderNumberOptions,
    matrixRows,
    matrixStatus,
    matrixStatusOptions,
    projectDetailFloorPreview,
    projectDetailFloorPreviewOverflow,
    projectDetailMatrix,
    projectDoorTotals,
    resetMatrixFilters,
    selectedDoorIdSet,
    selectedDoorIds,
    setBulkAssignInstallerId,
    setBulkAssignLoading,
    setDoorStatusAction,
    setFocusedDoorComment,
    setFocusedDoorId,
    setFocusedDoorOverrideReason,
    setFocusedDoorReasonId,
    setLedgerRowLimit,
    setMatrixApartmentSearch,
    setMatrixDoorType,
    setMatrixFloor,
    setMatrixHouse,
    setMatrixInstaller,
    setMatrixIssueFilter,
    setMatrixLocation,
    setMatrixMarkingSearch,
    setMatrixOrderNumber,
    setMatrixStatus,
    setSelectedDoorIds,
    toggleDoorSelection,
    toggleFilteredDoorSelection,
    visibleMatrixRows,
  } = workspace;

  const projectAssignedInstallerSummary = useMemo(() => {
    const counts = new Map<string, number>();

    for (const row of matrixRows) {
      if (!row.installer_id) {
        continue;
      }
      counts.set(row.installer_id, (counts.get(row.installer_id) || 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([installerId, doorCount]) => {
        const installer = activeInstallerById.get(installerId);
        return {
          id: installerId,
          name: installer?.full_name || installerId,
          email: installer?.email || null,
          status: installer?.status || null,
          doorCount,
        };
      })
      .sort((a, b) => b.doorCount - a.doorCount || compareNatural(a.name, b.name));
  }, [activeInstallerById, matrixRows]);

  const matrixInstallerFilterControl = (
    <select
      aria-label={copy("Door assignment", "Назначение дверей", "שיבוץ דלתות")}
      value={matrixInstaller}
      onChange={(event) => setMatrixInstaller(event.target.value)}
      className="control-input h-9 min-w-0 max-w-full text-[12px]"
    >
      <option value="all">{copy("All installers", "Все монтажники", "כל המתקינים")}</option>
      <option value="unassigned">{copy("Unassigned", "Без назначения", "לא שובצו")}</option>
      {projectAssignedInstallerSummary.map((installer) => (
        <option key={installer.id} value={installer.id}>{installer.name}</option>
      ))}
    </select>
  );

  const selectedProjectCode =
    projectDetails?.code || selectedProject?.code || selectedProjectId || "-";
  const projectDeadlineDays = daysUntilDate(projectDetails?.planned_end_date);
  const projectOpenRisks = projectDetails?.open_risks ?? [];
  const projectRiskLabel = (kind: string) =>
    kind === "SYNC"
      ? copy("installer sync", "синхронизация монтажника", "סנכרון המתקין")
      : kind === "DELIVERY_OUTBOX"
        ? copy("document delivery", "доставка документов", "משלוח מסמכים")
        : kind;
  const projectInstalledDoors =
    projectPlanFact?.installed_doors ?? projectDoorTotals.installedCount;
  const projectTotalDoors =
    projectPlanFact?.total_doors ?? projectDoorTotals.totalDoors;
  const projectCompletionPct =
    typeof projectPlanFact?.completion_pct === "number"
      ? projectPlanFact.completion_pct
      : projectTotalDoors > 0
        ? (projectInstalledDoors / projectTotalDoors) * 100
        : 0;
  const projectOpenIssues =
    projectPlanFact?.open_issues ??
    projectDetails?.issues_open?.length ??
    projectDoorTotals.issueCount;
  const projectBlockedIssues = projectRisk?.summary.blocked_open_issues ?? 0;
  const projectDeadlineHint =
    projectDeadlineDays === null
      ? copy("due date missing", "дедлайн не задан", "אין תאריך יעד")
      : projectDeadlineDays < 0
        ? copy(
            `overdue ${Math.abs(projectDeadlineDays)}d`,
            `просрочено ${Math.abs(projectDeadlineDays)} дн.`,
            `באיחור ${Math.abs(projectDeadlineDays)} ימים`,
          )
        : projectDetails?.planned_end_date
          ? `${copy("due", "срок", "יעד")} ${projectDetails.planned_end_date}`
          : copy("on schedule", "по графику", "לפי לוח זמנים");
  const projectUnassignedDoors = Math.max(
    projectDoorTotals.totalDoors - projectDoorTotals.assignedCount,
    0,
  );
  const projectFinancialReady = Boolean(
    canViewProjectRates && projectPlanFact && projectRisk?.summary,
  );
  const scrollToProjectSection = (sectionId: string) => {
    if (typeof document === "undefined") {
      return;
    }
    const target = document.getElementById(sectionId);
    target?.scrollIntoView?.({
      behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
    target?.focus({ preventScroll: true });
  };

  const renderImportPreviewGroups = (
    diagnostics?: ImportColumnsDiagnostics | null,
    title = t("projects.projectStructurePreview"),
  ) => {
    const previewGroups = diagnostics?.preview_groups || [];
    if (previewGroups.length === 0) {
      return null;
    }
    return (
      <div className="mt-2">
        <div className="text-text-secondary">{title}</div>
        <div className="mt-1 max-h-[480px] divide-y divide-border-subtle overflow-y-auto rounded-lg border border-border bg-surface md:hidden">
          {previewGroups.map((group, index) => {
            const locations =
              group.location_codes.length > 0
                ? group.location_codes
                    .map((code) => locationLabel(code))
                    .join(", ")
                : "-";
            const doorTypes =
              (group.door_type_labels || []).length > 0
                ? (group.door_type_labels || []).join(", ")
                : (group.door_type_ids || []).length > 0
                  ? (group.door_type_ids || [])
                      .map(doorTypeLabel)
                      .join(", ")
                  : "-";
            return (
              <article
                key={`${group.order_number || "-"}-${group.house_number || "-"}-${group.floor_label || "-"}-${group.apartment_number || "-"}-${group.door_marking || "-"}-${index}`}
                className="px-3.5 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold text-text">
                      <LtrText>{group.order_number || "-"}</LtrText>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex rounded-full bg-surface-sunken px-2 py-1 text-[10.5px] font-medium leading-none text-text-secondary">
                        {copy("House", "Корпус", "בניין")}:{" "}
                        <LtrText>{group.house_number || "-"}</LtrText>
                      </span>
                      <span className="inline-flex rounded-full bg-surface-sunken px-2 py-1 text-[10.5px] font-medium leading-none text-text-secondary">
                        {copy("Floor", "Этаж", "קומה")}:{" "}
                        <LtrText>{group.floor_label || "-"}</LtrText>
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 text-end">
                    <div className={projectsMetricLabelClass}>
                      {copy("Doors", "Двери", "דלתות")}
                    </div>
                    <div className="mt-1 text-[17px] font-medium leading-tight text-text tabular-nums">
                      {group.door_count}
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                    <div className={projectsMetricLabelClass}>
                      {copy("Apartment", "Квартира", "דירה")}
                    </div>
                    <div className="mt-1 truncate text-[12px] font-medium text-text">
                      <LtrText>{group.apartment_number || "-"}</LtrText>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                    <div className={projectsMetricLabelClass}>
                      {copy("Door mark", "Маркировка", "סימון דלת")}
                    </div>
                    <div className="mt-1 truncate text-[12px] font-medium text-text">
                      <LtrText>{group.door_marking || "-"}</LtrText>
                    </div>
                  </div>
                </div>
                <div className="mt-3 rounded-lg border border-border bg-surface-subtle px-3 py-2 text-[12px] leading-5 text-text-secondary">
                  <span className="font-medium text-text-secondary">
                    {copy("Locations", "Локации", "מיקומים")}:{" "}
                  </span>
                  <span className="break-words">{locations}</span>
                </div>
                <div className="mt-2 rounded-lg border border-border bg-surface-subtle px-3 py-2 text-[12px] leading-5 text-text-secondary">
                  <span className="font-medium text-text-secondary">
                    {copy("Door types", "Типы дверей", "סוגי דלתות")}:{" "}
                  </span>
                  <span className="break-words">{doorTypes}</span>
                </div>
              </article>
            );
          })}
        </div>
        <div className="mt-1 hidden max-h-[380px] overflow-auto rounded-lg border border-border bg-surface md:block">
          <table className="min-w-[860px] w-full text-[11px]">
            <thead className="sticky top-0 z-10 bg-surface-subtle text-text-secondary shadow-[0_1px_0_var(--dmx-border)]">
              <tr>
                <th className="text-start px-2 py-1.5 font-medium">
                  מספר הזמנה
                </th>
                <th className="text-start px-2 py-1.5 font-medium">בניין</th>
                <th className="text-start px-2 py-1.5 font-medium">קומה</th>
                <th className="text-start px-2 py-1.5 font-medium">דירה</th>
                <th className="text-start px-2 py-1.5 font-medium">דגם כנף</th>
                <th className="text-start px-2 py-1.5 font-medium">
                  {copy("Locations", "Локации", "מיקומים")}
                </th>
                <th className="text-start px-2 py-1.5 font-medium">
                  {copy("Door types", "Типы дверей", "סוגי דלתות")}
                </th>
                <th className="text-start px-2 py-1.5 font-medium">
                  {copy("Doors", "Двери", "דלתות")}
                </th>
              </tr>
            </thead>
            <tbody>
              {previewGroups.map((group, index) => (
                <tr
                  key={`${group.order_number || "-"}-${group.house_number || "-"}-${group.floor_label || "-"}-${group.apartment_number || "-"}-${group.door_marking || "-"}-${index}`}
                  className="row-hover border-t border-border"
                >
                  <td className="px-2 py-1.5">{group.order_number || "-"}</td>
                  <td className="px-2 py-1.5">{group.house_number || "-"}</td>
                  <td className="px-2 py-1.5">{group.floor_label || "-"}</td>
                  <td className="px-2 py-1.5">
                    {group.apartment_number || "-"}
                  </td>
                  <td className="px-2 py-1.5">{group.door_marking || "-"}</td>
                  <td className="px-2 py-1.5">
                    {group.location_codes.length > 0
                      ? group.location_codes
                          .map((code) => locationLabel(code))
                          .join(", ")
                      : "-"}
                  </td>
                  <td className="px-2 py-1.5">
                    {(group.door_type_labels || []).length > 0
                      ? (group.door_type_labels || []).join(", ")
                      : (group.door_type_ids || []).length > 0
                        ? (group.door_type_ids || [])
                            .map(doorTypeLabel)
                            .join(", ")
                        : "-"}
                  </td>
                  <td className="px-2 py-1.5">{group.door_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const loadProjects = useCallback(async () => {
    setLoadingProjects(true);
    setProjectsLoadError(false);
    try {
      // The API pages at most 200 rows; read every page so search, counts and bulk actions see all projects.
      const items: ProjectListItem[] = [];
      for (let offset = 0; offset < PROJECTS_PAGE_SIZE * 50; offset += PROJECTS_PAGE_SIZE) {
        const response = await apiFetch<{ items: ProjectListItem[] }>(
          `/api/v1/admin/projects?limit=${PROJECTS_PAGE_SIZE}&offset=${offset}`,
        );
        const page = response.items || [];
        items.push(...page);
        if (page.length < PROJECTS_PAGE_SIZE) break;
      }
      setProjects(items);
      setProjectsLoaded(true);
      const ids = new Set(items.map((x) => x.id));
      setBulkSelectedProjectIds((prev) => prev.filter((id) => ids.has(id)));
      // A deep link chooses the project once; later reloads (after a door action) keep what the user selected.
      if (deepLinkProjectId && appliedDeepLinkRef.current !== deepLinkProjectId) {
        appliedDeepLinkRef.current = deepLinkProjectId;
        if (ids.has(deepLinkProjectId)) {
          setSelectedProjectId(deepLinkProjectId);
          setDeepLinkProjectMissing(false);
        } else {
          setSelectedProjectId(null);
          setDeepLinkProjectMissing(true);
        }
      } else {
        if (!deepLinkProjectId) setDeepLinkProjectMissing(false);
        setSelectedProjectId((currentProjectId) =>
          currentProjectId && ids.has(currentProjectId)
            ? currentProjectId
            : items[0]?.id || null,
        );
      }
    } catch {
      setProjectsLoadError(true);
    } finally {
      setLoadingProjects(false);
    }
  }, [deepLinkProjectId]);

  const loadLayout = useCallback(async (projectId: string) => {
    // Only the latest requested project may write the layout: a slow answer for the previous project is dropped.
    layoutRequestRef.current = projectId;
    setLoadingLayout(true);
    setError(null);
    try {
      const response = await apiFetch<ProjectDoorsLayoutResponse>(
        `/api/v1/admin/projects/${projectId}/doors/layout`,
      );
      if (layoutRequestRef.current === projectId) setLayout(response);
    } catch (e) {
      if (layoutRequestRef.current !== projectId) return;
      setLayout(null);
      setError(readableApiError(e, locale, t("projects.failedLoadLayout")));
    } finally {
      if (layoutRequestRef.current === projectId) setLoadingLayout(false);
    }
  }, [locale, t]);

  const refreshSelectedProjectOperationalData = async (projectId: string) => {
    await Promise.all([
      loadProjects(),
      loadProjectDetails(projectId),
      loadLayout(projectId),
      canViewProjectRates ? loadProjectPlanFact(projectId) : Promise.resolve(),
      canViewProjectRates ? loadProjectRisk(projectId) : Promise.resolve(),
      canViewProjectRates
        ? loadProjectAddonPlan(projectId)
        : Promise.resolve(),
      loadImportHistory(projectId),
    ]);
  };

  const projectSections: Array<{
    key: ProjectSectionKey;
    label: string;
    loading: boolean;
    failed: boolean;
    reload: () => Promise<void> | void;
  }> = [
    {
      key: "mappingProfiles",
      failed: mappingProfilesQuery.isError,
      label: copy("Import mapping profiles", "Профили сопоставления импорта", "פרופילי מיפוי ייבוא"),
      loading: loadingMappingProfiles,
      reload: loadMappingProfiles,
    },
    {
      key: "details",
      failed: projectDetailsQuery.isError,
      label: copy("Project details", "Детали проекта", "פרטי הפרויקט"),
      loading: loadingProjectDetails,
      reload: () => (selectedProjectId ? loadProjectDetails(selectedProjectId) : undefined),
    },
    {
      key: "planFact",
      failed: projectPlanFactQuery.isError,
      label: copy("Plan / fact", "План / факт", "תכנון / ביצוע"),
      loading: loadingProjectPlanFact,
      reload: () => (selectedProjectId ? loadProjectPlanFact(selectedProjectId) : undefined),
    },
    {
      key: "risk",
      failed: projectRiskQuery.isError,
      label: copy("Project risk", "Риски проекта", "סיכוני הפרויקט"),
      loading: loadingProjectRisk,
      reload: () => (selectedProjectId ? loadProjectRisk(selectedProjectId) : undefined),
    },
    {
      key: "addonPlan",
      failed: projectAddonPlanQuery.isError,
      label: copy("Additional work plan", "План допработ", "תכנית עבודות נוספות"),
      loading: loadingProjectAddonPlan,
      reload: () => (selectedProjectId ? loadProjectAddonPlan(selectedProjectId) : undefined),
    },
    {
      key: "urgency",
      failed: urgencySurchargesQuery.isError,
      label: copy("Urgency surcharges", "Надбавки за срочность", "תוספות דחיפות"),
      loading: loadingUrgencySurcharges,
      reload: () => (selectedProjectId ? loadUrgencySurcharges(selectedProjectId) : undefined),
    },
    {
      key: "documents",
      failed: projectDocumentsQuery.isError,
      label: copy("Project documents", "Документы проекта", "מסמכי הפרויקט"),
      loading: loadingProjectDocuments,
      reload: () => (selectedProjectId ? loadProjectDocuments(selectedProjectId) : undefined),
    },
    {
      key: "importHistory",
      failed: importHistoryQuery.isError,
      label: copy("Import history", "История импорта", "היסטוריית ייבוא"),
      loading: loadingImportHistory,
      reload: () => (selectedProjectId ? loadImportHistory(selectedProjectId) : undefined),
    },
    {
      key: "importRunDetails",
      failed: importRunDetailsQuery.isError,
      label: copy("Import run details", "Детали запуска импорта", "פרטי הרצת הייבוא"),
      loading: loadingImportRunDetails,
      reload: () =>
        selectedProjectId && focusedImportRunId
          ? loadImportRunDetails(selectedProjectId, focusedImportRunId)
          : undefined,
    },
    {
      key: "failedQueue",
      failed: failedQueueQuery.isError,
      label: copy("Failed import queue", "Очередь сбойных импортов", "תור ייבואים שנכשלו"),
      loading: loadingFailedQueue,
      reload: loadFailedQueue,
    },
  ];
  const failedProjectSections = projectSections.filter((section) => section.failed);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (projects.length === 0 || deepLinkApplied) {
      return;
    }
    const ids = new Set(projects.map((x) => x.id));
    const matchedFailed = deepLinkFailedIds.filter((id) => ids.has(id));

    if (deepLinkOnlyFailed) {
      setBulkOnlyFailedRuns(true);
      setFailedQueueOnlySelectedProject(!!deepLinkProjectId);
      setFailedQueueOffset(0);
    }
    if (matchedFailed.length > 0) {
      setBulkSelectedProjectIds((prev) => {
        const merged = new Set(prev);
        for (const id of matchedFailed) {
          merged.add(id);
        }
        return [...merged];
      });
    }
    if (deepLinkProjectId && ids.has(deepLinkProjectId)) {
      setSelectedProjectId(deepLinkProjectId);
    } else if (matchedFailed.length > 0 && !selectedProjectId) {
      setSelectedProjectId(matchedFailed[0]);
    }

    if (deepLinkOnlyFailed || matchedFailed.length > 0 || !!deepLinkProjectId) {
      setDeepLinkApplied(true);
    }
  }, [
    projects,
    deepLinkApplied,
    deepLinkFailedIds,
    deepLinkOnlyFailed,
    deepLinkProjectId,
    selectedProjectId,
  ]);

  useEffect(() => {
    if (
      deepLinkFocusApplied ||
      !selectedProjectId ||
      selectedProjectId !== deepLinkProjectId
    ) {
      return;
    }

    const targetSectionId =
      deepLinkFocusSection === "doors"
        ? "project-door-matrix"
        : deepLinkFocusSection === "addons"
          ? canViewProjectRates
            ? "project-additional-works"
            : "project-commercial-restricted"
          : deepLinkFocusSection === "urgency"
            ? canViewProjectRates
              ? "project-urgency-surcharge"
              : "project-commercial-restricted"
            : null;

    if (deepLinkOrderNumber) {
      setMatrixOrderNumber(deepLinkOrderNumber);
    }

    if (!targetSectionId && !deepLinkOrderNumber) {
      return;
    }

    setDeepLinkFocusApplied(true);
    window.setTimeout(() => {
      document
        .getElementById(targetSectionId || "project-door-matrix")
        ?.scrollIntoView?.({
          behavior: "smooth",
          block: "start",
        });
    }, 80);
  }, [
    deepLinkFocusApplied,
    deepLinkFocusSection,
    setMatrixOrderNumber,
    deepLinkOrderNumber,
    deepLinkProjectId,
    canViewProjectRates,
    selectedProjectId,
  ]);

  useEffect(() => {
    if (
      deepLinkDoorFlowApplied ||
      !canManageProjects ||
      !selectedProjectId ||
      selectedProjectId !== deepLinkProjectId
    ) {
      return;
    }
    if (deepLinkFocusSection !== "doors") {
      return;
    }
    if (!deepLinkLibraryProductId && !deepLinkLibraryInstallType) {
      return;
    }

    if (deepLinkLibraryProductId && activeLibraryProducts.length > 0) {
      const matchedProduct = activeLibraryProducts.find(
        (item) => item.id === deepLinkLibraryProductId,
      );
      if (!matchedProduct && !deepLinkLibraryInstallType) {
        setDeepLinkDoorFlowApplied(true);
        return;
      }
      openManualDoorWith({
        ...emptyManualDoorForm(),
        product_id: matchedProduct?.id || "",
        install_type:
          matchedProduct?.install_type || deepLinkLibraryInstallType,
      });
      setProjectFlowNotice(null);
      setError(null);
      setManualDoorDialogOpen(true);
      setDeepLinkDoorFlowApplied(true);
      return;
    }

    if (!deepLinkLibraryProductId && deepLinkLibraryInstallType) {
      openManualDoorWith({
        ...emptyManualDoorForm(),
        install_type: deepLinkLibraryInstallType,
      });
      setProjectFlowNotice(null);
      setError(null);
      setManualDoorDialogOpen(true);
      setDeepLinkDoorFlowApplied(true);
    }
  }, [
    activeLibraryProducts,
    canManageProjects,
    deepLinkDoorFlowApplied,
    deepLinkFocusSection,
    deepLinkLibraryInstallType,
    deepLinkLibraryProductId,
    deepLinkProjectId,
    selectedProjectId,
  ]);

  useEffect(() => {
    // Every other panel is a react-query entry keyed by selectedProjectId;
    // the door layout is the last hand-rolled loader.
    if (selectedProjectId) {
      void loadLayout(selectedProjectId);
    }
  }, [loadLayout, selectedProjectId]);

  useEffect(() => {
    if (!projectActionHint) {
      return;
    }
    const timeout = window.setTimeout(() => setProjectActionHint(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [projectActionHint]);

  useEffect(() => {
    if (!focusedImportRunId) {
      return;
    }
    const candidates = [
      document.getElementById(`import-run-card-${focusedImportRunId}`),
      document.getElementById(`import-run-${focusedImportRunId}`),
    ].filter(Boolean) as HTMLElement[];
    const node =
      candidates.find((element) => element.getClientRects().length > 0) ||
      candidates[0] ||
      null;
    // The run details query follows focusedImportRunId on its own.
    if (!node || typeof node.scrollIntoView !== "function") {
      return;
    }
    node.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusedImportRunId, importHistory]);

  const handleImportAnalyzed = async (projectId: string) => {
    await loadImportHistory(projectId);
  };

  const handleImportCompleted = async (projectId: string) => {
    await loadProjectDetails(projectId);
    await loadLayout(projectId);
    await loadProjectPlanFact(projectId);
    await loadProjectRisk(projectId);
    await loadImportHistory(projectId);
  };

  const handleRetryImportRun = async (
    runId: string,
    projectIdOverride?: string,
  ) => {
    const targetProjectId = projectIdOverride || selectedProjectId;
    if (!canManageProjectImports || !targetProjectId) {
      return;
    }
    setRetryingRunId(runId);
    setError(null);
    try {
      const response = await apiFetch<ImportResult>(
        `/api/v1/admin/projects/${targetProjectId}/doors/import-runs/${runId}/retry`,
        { method: "POST" },
      );
      setImportResult(response);
      setAnalysisReady(false);
      await loadProjectDetails(targetProjectId);
      await loadLayout(targetProjectId);
      await loadProjectPlanFact(targetProjectId);
      await loadProjectRisk(targetProjectId);
      await loadImportHistory(targetProjectId);
    } catch (e) {
      setError(readableApiError(e, locale, t("projects.failedRetryImportRun")));
    } finally {
      setRetryingRunId(null);
    }
  };

  const toggleProjectBulkSelection = (projectId: string, checked: boolean) => {
    setBulkSelectedProjectIds((prev) => {
      if (checked) {
        if (prev.includes(projectId)) {
          return prev;
        }
        return [...prev, projectId];
      }
      return prev.filter((id) => id !== projectId);
    });
  };

  const toggleSelectAllFilteredProjects = (checked: boolean) => {
    if (checked) {
      setBulkSelectedProjectIds((prev) => {
        const merged = new Set(prev);
        for (const id of filteredProjectIds) {
          merged.add(id);
        }
        return [...merged];
      });
      return;
    }
    setBulkSelectedProjectIds((prev) =>
      prev.filter((id) => !filteredProjectIds.includes(id)),
    );
  };

  const handleBulkReconcile = async () => {
    if (!canManageProjectImports || bulkSelectedProjectIds.length === 0) {
      return;
    }
    setBulkReconcileLoading(true);
    setError(null);
    try {
      const response = await apiFetch<BulkReconcileResponse>(
        "/api/v1/admin/projects/import-runs/reconcile-latest",
        {
          method: "POST",
          body: JSON.stringify({
            project_ids: bulkSelectedProjectIds,
            only_failed_runs: bulkOnlyFailedRuns,
          }),
        },
      );
      setBulkReconcileResult(response);
      if (
        selectedProjectId &&
        bulkSelectedProjectIds.includes(selectedProjectId)
      ) {
        await loadProjectDetails(selectedProjectId);
        await loadLayout(selectedProjectId);
        await loadProjectPlanFact(selectedProjectId);
        await loadProjectRisk(selectedProjectId);
        await loadImportHistory(selectedProjectId);
      }
    } catch (e) {
      setError(
        readableApiError(e, locale, t("projects.failedReconcileProjects")),
      );
    } finally {
      setBulkReconcileLoading(false);
    }
  };

  const handleBulkReview = async () => {
    if (!canManageProjectImports || bulkSelectedProjectIds.length === 0) {
      return;
    }
    setBulkReviewLoading(true);
    setError(null);
    try {
      const response = await apiFetch<LatestImportReviewResponse>(
        "/api/v1/admin/projects/import-runs/review-latest",
        {
          method: "POST",
          body: JSON.stringify({
            project_ids: bulkSelectedProjectIds,
            only_failed_runs: bulkOnlyFailedRuns,
          }),
        },
      );
      setBulkReviewResult(response);
    } catch (e) {
      setError(readableApiError(e, locale, t("projects.failedReviewProjects")));
    } finally {
      setBulkReviewLoading(false);
    }
  };

  const openImportRun = (projectId: string, runId: string) => {
    setImportHistoryModeFilter("all");
    setImportHistoryStatusFilter("all");
    setFocusedImportRunId(runId);
    if (selectedProjectId === projectId) {
      void loadImportHistory(projectId);
      return;
    }
    setSelectedProjectId(projectId);
  };

  const openCreateProjectDialog = () => {
    if (!canManageProjects) return;
    setProjectDialogMode("create");
    setProjectDialogInitialForm(emptyProjectForm());
    setProjectDialogSession((prev) => prev + 1);
    setProjectFlowNotice(null);
    setProjectActionHint(null);
    setError(null);
    setProjectDialogOpen(true);
  };

  useEffect(() => {
    if (
      !createProjectRequested ||
      createProjectDeepLinkApplied ||
      !canManageProjects
    ) {
      return;
    }
    setCreateProjectDeepLinkApplied(true);
    setProjectDialogMode("create");
    setProjectDialogInitialForm(emptyProjectForm());
    setProjectDialogSession((prev) => prev + 1);
    setProjectFlowNotice(null);
    setProjectActionHint(null);
    setError(null);
    setProjectDialogOpen(true);
  }, [
    canManageProjects,
    createProjectDeepLinkApplied,
    createProjectRequested,
  ]);

  const handleProjectCreated = async (projectId: string) => {
    await loadProjects();
    setSelectedProjectId(projectId);
    setProjectFlowNotice(
      copy(
        "Project created. Continue with address, contacts and import flow.",
        "Проект создан. Продолжайте с адресом, контактами и импортом.",
        "הפרויקט נוצר. המשך עם כתובת, אנשי קשר וזרימת הייבוא.",
      ),
    );
  };

  const handleProjectUpdated = async (projectId: string) => {
    await loadProjects();
    await loadProjectDetails(projectId);
    setProjectFlowNotice(
      copy(
        "Project settings updated. Quick actions are ready where data is available.",
        "Настройки проекта обновлены. Быстрые действия готовы там, где данные заполнены.",
        "הגדרות הפרויקט עודכנו. פעולות מהירות מוכנות היכן שהנתונים מולאו.",
      ),
    );
  };

  const openEditProjectDialog = () => {
    if (!canManageProjects) return;
    if (!projectDetails) {
      return;
    }
    setProjectDialogMode("edit");
    setProjectDialogInitialForm(projectFormFromDetails(projectDetails));
    setProjectDialogSession((prev) => prev + 1);
    setProjectFlowNotice(null);
    setProjectActionHint(null);
    setError(null);
    setProjectDialogOpen(true);
  };

  const showProjectActionHint = (message: string) => {
    setProjectFlowNotice(null);
    setProjectActionHint(message);
  };

  const handleBulkAssignDoors = async () => {
    if (!canManageProjects || !installersReference.ready || !activeInstallerById.has(bulkAssignInstallerId)) return;
    if (
      !selectedProjectId ||
      selectedDoorIds.length === 0 ||
      !bulkAssignInstallerId
    ) {
      return;
    }
    setBulkAssignLoading(true);
    setProjectFlowNotice(null);
    setProjectActionHint(null);
    setError(null);
    try {
      const response = await apiFetch<BulkAssignDoorsResponse>(
        "/api/v1/admin/projects/doors/bulk-assign-installer",
        {
          method: "POST",
          body: JSON.stringify({
            door_ids: selectedDoorIds,
            installer_id: bulkAssignInstallerId,
          }),
        },
      );
      const assigned = response.assigned || 0;
      const skipped = response.skipped || 0;
      setProjectFlowNotice(
        assigned > 0
          ? copy(
              "Assigned {assigned} doors. Skipped: {skipped}.",
              "Назначено дверей: {assigned}. Пропущено: {skipped}.",
              "שויכו {assigned} דלתות. דולגו: {skipped}.",
            )
              .replace("{assigned}", String(assigned))
              .replace("{skipped}", String(skipped))
          : copy(
              "No assignment changes. Skipped: {skipped}.",
              "Изменений в назначениях нет. Пропущено: {skipped}.",
              "אין שינויי שיוך. דולגו: {skipped}.",
            ).replace("{skipped}", String(skipped)),
      );
      setSelectedDoorIds([]);
      await Promise.all([
        loadProjectDetails(selectedProjectId),
        loadLayout(selectedProjectId),
        canViewProjectRates
          ? loadProjectPlanFact(selectedProjectId)
          : Promise.resolve(),
        canViewProjectRates
          ? loadProjectRisk(selectedProjectId)
          : Promise.resolve(),
      ]);
    } catch (e) {
      setError(
        readableApiError(
          e,
          locale,
          copy(
            "Failed to assign selected doors.",
            "Не удалось назначить выбранные двери.",
            "שיוך הדלתות שנבחרו נכשל.",
          ),
        ),
      );
    } finally {
      setBulkAssignLoading(false);
    }
  };

  const handleFocusedDoorMarkInstalled = async () => {
    if (!canManageProjects) return;
    if (!selectedProjectId || !focusedDoorRow) {
      return;
    }

    setDoorStatusAction("install");
    setProjectFlowNotice(null);
    setProjectActionHint(null);
    setError(null);
    try {
      await apiFetch<DoorActionResponse>(
        `/api/v1/admin/doors/${focusedDoorRow.door_id}/install`,
        { method: "POST" },
      );
      setProjectFlowNotice(
        copy(
          "Door {door} marked installed.",
          "Дверь {door} отмечена как установленная.",
          "הדלת {door} סומנה כהותקנה.",
        ).replace("{door}", focusedDoorRow.door_marking),
      );
      await refreshSelectedProjectOperationalData(selectedProjectId);
    } catch (e) {
      // The server may have refused a stale state (409): show the real door first, then the error.
      try {
        await refreshSelectedProjectOperationalData(selectedProjectId);
      } catch {
        /* the action error below is the one to show */
      }
      setError(
        readableApiError(
          e,
          locale,
          copy(
            "Failed to mark the door as installed.",
            "Не удалось отметить дверь как установленную.",
            "סימון הדלת כהותקנה נכשל.",
          ),
        ),
      );
    } finally {
      setDoorStatusAction(null);
    }
  };

  const handleFocusedDoorMarkNotInstalled = async () => {
    if (!canManageProjects || !reasonsReference.ready) return;
    if (!selectedProjectId || !focusedDoorRow) {
      return;
    }
    const isAdminOverride = focusedDoorRow.status === "INSTALLED";
    if (!focusedDoorReasonId) {
      showProjectActionHint(
        copy(
          "Choose a reason before saving the door as not installed.",
          "Выберите причину перед сохранением двери как неустановленной.",
          "בחר סיבה לפני שמירת הדלת כלא הותקנה.",
        ),
      );
      return;
    }
    if (isAdminOverride && !focusedDoorOverrideReason.trim()) {
      showProjectActionHint(
        copy(
          "Add an admin override reason before reverting an installed door.",
          "Прежде чем возвращать установленную дверь, добавьте причину переопределения администратором.",
          "הוסף סיבה לעקיפה של מנהל מערכת לפני החזרת דלת מותקנת.",
        ),
      );
      return;
    }

    setDoorStatusAction(
      isAdminOverride ? "override-not-installed" : "not-installed",
    );
    setProjectFlowNotice(null);
    setProjectActionHint(null);
    setError(null);
    try {
      if (isAdminOverride) {
        await apiFetch<{ ok: boolean }>(
          `/api/v1/admin/doors/${focusedDoorRow.door_id}/override`,
          {
            method: "POST",
            body: JSON.stringify({
              new_status: "NOT_INSTALLED",
              reason_id: focusedDoorReasonId,
              comment: focusedDoorComment.trim() || null,
              override_reason: focusedDoorOverrideReason.trim(),
            }),
          },
        );
      } else {
        await apiFetch<DoorActionResponse>(
          `/api/v1/admin/doors/${focusedDoorRow.door_id}/not-installed`,
          {
            method: "POST",
            body: JSON.stringify({
              reason_id: focusedDoorReasonId,
              comment: focusedDoorComment.trim() || null,
            }),
          },
        );
      }
      setProjectFlowNotice(
        (isAdminOverride
          ? copy(
              "Door {door} reverted to not installed by admin override.",
              "Дверь {door} снова стала не установлена ​​администратором.",
              "הדלת {door} הוחזרה למצב לא הותקנה על ידי עקיפה של מנהל המערכת.",
            )
          : copy(
              "Door {door} saved as not installed.",
              "Дверь {door} сохранена как неустановленная.",
              "הדלת {door} נשמרה כלא הותקנה.",
            )
        ).replace("{door}", focusedDoorRow.door_marking),
      );
      await refreshSelectedProjectOperationalData(selectedProjectId);
    } catch (e) {
      // The server may have refused a stale state (409): show the real door first, then the error.
      try {
        await refreshSelectedProjectOperationalData(selectedProjectId);
      } catch {
        /* the action error below is the one to show */
      }
      setError(
        readableApiError(
          e,
          locale,
          copy(
            "Failed to save the door as not installed.",
            "Не удалось сохранить дверь как неустановленную.",
            "שמירת הדלת כלא הותקנה נכשלה.",
          ),
        ),
      );
    } finally {
      setDoorStatusAction(null);
    }
  };

  // UrgencySurchargesCard saved a surcharge: refresh the financial views and,
  // for an order-scoped one, focus the matrix on that order (as before the split).
  const handleUrgencySaved = async (projectId: string, orderNumber: string | null) => {
    await loadProjectPlanFact(projectId);
    await loadProjectRisk(projectId);
    if (orderNumber) {
      setMatrixOrderNumber(orderNumber);
    }
  };

  // AdditionalWorksCard saved a plan row: refresh the financial views (as before the split).
  const handleAdditionalWorkSaved = async (projectId: string) => {
    await loadProjectPlanFact(projectId);
    await loadProjectRisk(projectId);
  };

  // FailedImportQueueCard retried runs: refresh the selected project's views (as before the split).
  const handleFailedRunsRetried = async (projectId: string | null) => {
    if (!projectId) return;
    await loadProjectDetails(projectId);
    await loadLayout(projectId);
    await loadProjectPlanFact(projectId);
    await loadProjectRisk(projectId);
    await loadImportHistory(projectId);
  };

  // ManualDoorDialog created a door: refresh the project views and focus the matrix on it.
  const handleManualDoorCreated = async (projectId: string, doorCode: string) => {
    await loadProjectDetails(projectId);
    await loadLayout(projectId);
    await loadProjectPlanFact(projectId);
    await loadProjectRisk(projectId);
    setMatrixApartmentSearch("");
    setMatrixMarkingSearch(doorCode);
  };

  const openManualDoorDialog = () => {
    if (!canManageProjects || !libraryReference.ready) return;
    const nextForm = emptyManualDoorForm();
    openManualDoorWith(nextForm);
    setProjectFlowNotice(null);
    setProjectActionHint(null);
    setError(null);
    setManualDoorDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="page-shell motion-stagger readability-wrap flex flex-col gap-4 lg:gap-5">
        <Breadcrumbs
          items={[
            { label: copy("Dashboard", "Главная", "ראשי"), href: "/" },
            { label: copy("Projects", "Проекты", "פרויקטים") },
            ...(selectedProject
              ? [{ label: selectedProjectCode }]
              : []),
          ]}
        />

        <section
          className={cn(
            "border-b border-border pb-4",
            projectDetailFocused ? "order-5" : "order-1",
          )}
          data-testid="projects-list-v25"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <h1 className="dmx-page-title">
                {copy("Projects", "Проекты", "פרויקטים")}
              </h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  void loadProjects();
                  void loadFailedQueue();
                  if (selectedProjectId) {
                    void loadProjectDetails(selectedProjectId);
                    void loadLayout(selectedProjectId);
                    void loadProjectPlanFact(selectedProjectId);
                    void loadProjectRisk(selectedProjectId);
                    void loadImportHistory(selectedProjectId);
                  }
                }}
                disabled={loadingProjects}
                className="dmx-secondary-action disabled:opacity-60"
              >
                <RefreshCw className="h-4 w-4" strokeWidth={1.8} />
                {t("common.refresh")}
              </button>
              <button
                type="button"
                onClick={() => router.push("/reports")}
                className="dmx-secondary-action"
              >
                <Download className="h-4 w-4" strokeWidth={1.8} />
                {copy("Reports", "Отчеты", "דוחות")}
              </button>
              <button
                type="button"
                onClick={openCreateProjectDialog}
                disabled={!canManageProjects}
                className="dmx-primary-action"
              >
                <Plus className="h-4 w-4" strokeWidth={1.8} />
                {copy("New project", "Новый проект", "פרויקט חדש")}
              </button>
            </div>
          </div>

          <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-[12px]">
            {[
              {
                label: copy("Portfolio", "Всего проектов", "כל הפרויקטים"),
                value: projectsLoaded ? projectPortfolioStats.total : "—",
              },
              {
                label: copy("Active", "Активные", "פעילים"),
                value: projectsLoaded ? projectPortfolioStats.active : "—",
              },
              {
                label: copy("Problem", "Проблемные", "בעייתיים"),
                value: projectsLoaded ? projectPortfolioStats.problem : "—",
              },
              {
                label: copy("Selected", "Выбрано", "נבחרו"),
                value: bulkSelectedProjectIds.length,
              },
              {
                label: copy("Failed imports", "Ошибки импорта", "שגיאות ייבוא"),
                value: failedQueue?.total ?? "—",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-baseline gap-2"
              >
                <dt className="text-text-secondary">{item.label}</dt>
                <dd className="font-semibold tabular-nums text-text">{item.value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap gap-2">
                {projectStatusTabs.map((tab) => {
                  const active = projectStatusFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setProjectStatusFilter(tab.id)}
                      aria-pressed={active}
                      className={cn(
                        "inline-flex min-h-8 items-center gap-2 rounded-md border px-2.5 text-[12px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dmx-link)]",
                        active
                          ? "border-accent bg-[var(--dmx-accent-tint)] text-text"
                          : "border-border bg-surface text-text-secondary hover:border-border-strong hover:text-text",
                      )}
                    >
                      <span>{tab.label}</span>
                      <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] text-text-secondary">
                        {projectsLoaded ? tab.count : "—"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            {bulkSelectedProjectIds.length > 0 ? (
              <div className="mt-4 flex flex-col gap-2 rounded-lg border border-accent/35 bg-[var(--dmx-accent-tint)] px-3 py-3 text-[12px] text-text-secondary sm:flex-row sm:items-center sm:justify-between">
                <span>
                  {bulkSelectedProjectIds.length} {copy("projects selected for review or reconciliation.", "проектов выбрано для проверки или согласования.", "פרויקטים שנבחרו לבדיקה או התאמה.")}
                </span>
                <button
                  type="button"
                  onClick={() => setBulkSelectedProjectIds([])}
                  className="dmx-secondary-action"
                >
                  {copy("Clear selection", "Очистить выбор", "נקה בחירה")}
                </button>
              </div>
            ) : null}
          </div>
        </section>

        {selectedProjectId && selectedProjectId === deepLinkProjectId ? <section
          className={cn(
            "border-b border-border py-3",
            projectDetailFocused ? "order-3" : "order-2",
          )}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="text-[10.5px] font-medium uppercase text-text-secondary">
                {tt("projects.activeScope")}
              </div>
              <div className="mt-1 truncate text-[13.5px] font-medium text-text">
                {selectedProject?.name || tt("projects.portfolioOverview")}
              </div>
              <div className="mt-1 truncate text-[12px] leading-5 text-text-secondary">
                {selectedProject?.address || tt("projects.selectProjectHint")}
              </div>
            </div>
            {selectedProjectId && selectedProjectId === deepLinkProjectId ? (
              <div className="flex flex-wrap gap-2">
                <span className="metric-chip">
                  {copy("Focused project", "Выбранный проект", "הפרויקט שנבחר")} {selectedProjectId}
                </span>
                {focusedSectionLabel ? (
                  <span className="metric-chip">
                    {copy("Focused section", "Выбранный раздел", "החלק שנבחר")} {focusedSectionLabel}
                  </span>
                ) : null}
                {deepLinkOrderNumber ? (
                  <span className="metric-chip">
                    {copy("Order", "Заказ", "הזמנה")} {deepLinkOrderNumber}
                  </span>
                ) : null}
                {focusedSectionLabel || deepLinkOrderNumber ? (
                  <button
                    type="button"
                    onClick={() =>
                      router.push(`/projects?project_id=${selectedProjectId}`)
                    }
                    className="dmx-secondary-action"
                  >
                    {copy("Show full project workspace", "Показать всю рабочую область проекта", "הצג את סביבת העבודה המלאה של הפרויקט")}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => router.push("/projects")}
                  className="dmx-secondary-action"
                >
                  {copy("Show all projects", "Показать все проекты", "הצג את כל הפרויקטים")}
                </button>
              </div>
            ) : null}
          </div>
        </section> : null}

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-status-problem-border bg-status-problem-bg px-4 py-3 text-[13px] text-status-problem-fg">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {references.some((reference) => reference.data.error) && (
          <section aria-label={copy("Project catalogs", "Справочники проекта", "קטלוגים לפרויקט")} className="mb-4 space-y-2">
            {references.filter((reference) => reference.data.error).map(({ key, label, data }) => (
              <DataStateNotice key={key} label={label} state={data.loaded ? "stale" : "error"}
                retrying={data.loading} onRetry={() => { void data.reload(); }} />
            ))}
          </section>
        )}

        {failedProjectSections.length > 0 && (
          <section aria-label={copy("Project data", "Данные проекта", "נתוני הפרויקט")} className="mb-4 space-y-2">
            {failedProjectSections.map((section) => (
              <DataStateNotice key={section.key} label={section.label} state="error"
                retrying={section.loading} onRetry={() => { void section.reload(); }} />
            ))}
          </section>
        )}

        {projectFlowNotice && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-status-ok-border bg-status-ok-bg px-4 py-3 text-[13px] text-status-ok-fg">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{projectFlowNotice}</span>
          </div>
        )}
        {projectActionHint && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-status-warning-border bg-status-warning-bg px-4 py-3 text-[13px] text-status-warning-fg">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{projectActionHint}</span>
          </div>
        )}
        {deepLinkProjectMissing && (
          <div className="mb-4 flex flex-col gap-3 rounded-lg border border-status-warning-border bg-status-warning-bg px-4 py-3 text-[13px] text-status-warning-fg sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {copy(
                  `Requested project ${deepLinkProjectId} is not available in the current project list or admin scope.`,
                  `Объект ${deepLinkProjectId} недоступен в текущем списке проектов или правах администратора.`,
                  `הפרויקט ${deepLinkProjectId} אינו זמין ברשימת הפרויקטים הנוכחית או בהרשאות המנהל.`,
                )}
              </span>
            </div>
            <button
              type="button"
              onClick={() => router.push("/projects")}
              className="dmx-secondary-action shrink-0"
            >
              {copy("Show all projects", "Показать все проекты", "הצג את כל הפרויקטים")}
            </button>
          </div>
        )}

        {deepLinkedFailedCount > 0 && (
          <div className="mb-4 rounded-lg border border-status-progress-border bg-status-progress-bg px-4 py-3 text-[13px] text-status-progress-fg">
            {tt("projects.reportsHandoff").replace(
              "{count}",
              String(deepLinkedFailedCount),
            )}{" "}
            <span className="font-semibold">
              {" "}
              {tt("projects.retryFailedOnly")}
            </span>{" "}
            {tt("projects.toReconcileSafely")}
          </div>
        )}

        <div
          className={cn(
            "grid grid-cols-1 gap-4",
            projectDetailFocused
              ? "order-1 xl:grid-cols-1"
              : "order-3 xl:grid-cols-3",
          )}
        >
          <section
            className={cn(
              "rounded-lg border border-border bg-surface p-4 xl:col-span-1",
              projectDetailFocused ? "order-2" : "",
            )}
          >
            <div className="mb-3 border-b border-border-subtle pb-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h2 className="text-[13.5px] font-medium leading-5 text-text">
                    {tt("projects.projectList")}
                  </h2>
                  <p className="mt-1 text-[12px] leading-5 text-text-secondary">
                    {tt("projects.filteredCount")} {projectsLoaded ? filteredProjects.length : "—"} ·{" "}
                    {tt("projects.selectedCount")}{" "}
                    {bulkSelectedProjectIds.length}
                  </p>
                </div>
              </div>
            </div>
            <div className="relative mb-3">
              <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label={tt("projects.searchProject")}
                placeholder={tt("projects.searchProject")}
                className="h-9 w-full rounded-md border border-border bg-surface ps-9 pe-3 text-[12.5px] text-text placeholder:text-text-tertiary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dmx-link)]"
              />
            </div>
            <details className="mb-3 border-b border-border-subtle pb-3" open={bulkSelectedProjectIds.length > 0 || deepLinkedFailedCount > 0}>
              <summary className="cursor-pointer py-1 text-[12px] font-medium text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--dmx-link)]">
                {copy("Batch actions", "\u041c\u0430\u0441\u0441\u043e\u0432\u044b\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044f", "\u05e4\u05e2\u05d5\u05dc\u05d5\u05ea \u05de\u05e8\u05d5\u05d1\u05d5\u05ea")}
                {bulkSelectedProjectIds.length > 0 ? ` (${bulkSelectedProjectIds.length})` : ""}
              </summary>
              <div className="mt-3 space-y-3">
                <label className="inline-flex items-start gap-2 text-[12px] leading-snug text-text-secondary">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={(e) =>
                      toggleSelectAllFilteredProjects(e.target.checked)
                    }
                    className="mt-0.5"
                  />
                  {tt("projects.selectAllFiltered")} ({filteredProjects.length})
                </label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      void handleBulkReview();
                    }}
                    disabled={
                      bulkReviewLoading || bulkSelectedProjectIds.length === 0
                    }
                    className="inline-flex min-h-9 items-center justify-center rounded-full border border-border-strong bg-surface px-3 text-center text-[12px] font-medium leading-tight text-text disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {bulkReviewLoading
                      ? tt("projects.reviewing")
                      : `${tt("projects.reviewSelected")} (${bulkSelectedProjectIds.length})`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmBulkReconcileOpen(true)}
                    disabled={
                      !canManageProjectImports ||
                      bulkReconcileLoading ||
                      bulkSelectedProjectIds.length === 0
                    }
                    className="inline-flex min-h-9 items-center justify-center rounded-full border border-border-strong bg-surface px-3 text-center text-[12px] font-medium leading-tight text-text disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {bulkReconcileLoading
                      ? tt("projects.reconciling")
                      : bulkOnlyFailedRuns
                        ? `${tt("projects.retryFailed")} (${bulkSelectedProjectIds.length})`
                        : `${tt("projects.reconcile")} (${bulkSelectedProjectIds.length})`}
                  </button>
                </div>
                <ConfirmActionDialog
                  open={confirmBulkReconcileOpen}
                  onOpenChange={setConfirmBulkReconcileOpen}
                  title={bulkOnlyFailedRuns ? tt("projects.retryFailed") : tt("projects.reconcile")}
                  changes={copy(
                    `The latest import of ${bulkSelectedProjectIds.length} selected project(s) is applied again${bulkOnlyFailedRuns ? " where it failed" : ""}. Doors already present are kept.`,
                    `Последний импорт ${bulkSelectedProjectIds.length} выбранных объектов будет применён снова${bulkOnlyFailedRuns ? " там, где он завершился ошибкой" : ""}. Уже созданные двери сохраняются.`,
                    `הייבוא האחרון של ${bulkSelectedProjectIds.length} פרויקטים שנבחרו יוחל שוב${bulkOnlyFailedRuns ? " היכן שנכשל" : ""}. דלתות קיימות נשמרות.`,
                  )}
                  keeps={hiddenBulkSelectionCount > 0 ? copy(
                    `${hiddenBulkSelectionCount} of the selected projects are hidden by the current filter and are included.`,
                    `${hiddenBulkSelectionCount} из выбранных объектов скрыты текущим фильтром и тоже будут обработаны.`,
                    `${hiddenBulkSelectionCount} מהפרויקטים שנבחרו מוסתרים על ידי המסנן הנוכחי וייכללו גם הם.`,
                  ) : undefined}
                  confirmLabel={bulkOnlyFailedRuns ? tt("projects.retryFailed") : tt("projects.reconcile")}
                  busy={bulkReconcileLoading}
                  onConfirm={async () => {
                    await handleBulkReconcile();
                    setConfirmBulkReconcileOpen(false);
                  }}
                  testId="bulk-reconcile-confirm"
                />
              </div>
              <div className="mt-3 border-t border-border-subtle pt-3">
                <label className="inline-flex items-center gap-2 text-[12px] text-text-secondary">
                  <input
                    type="checkbox"
                    checked={bulkOnlyFailedRuns}
                    onChange={(e) => setBulkOnlyFailedRuns(e.target.checked)}
                  />
                  {tt("projects.retryFailedLatestOnly")}
                </label>
              </div>
            </details>
            <div
              className={cn(
                "space-y-2 overflow-auto pe-1",
                projectDetailFocused ? "max-h-[44vh]" : "max-h-[75vh]",
              )}
            >
              {loadingProjects && (
                <div className="px-2 py-2 text-[13px] text-text-secondary">
                  {tt("projects.loadingProjects")}
                </div>
              )}
              {projectsLoadError && (
                <DataStateNotice label={copy("Projects", "Проекты", "פרויקטים")}
                  state={projectsLoaded ? "stale" : "error"}
                  onRetry={() => { void loadProjects(); }} retrying={loadingProjects} />
              )}
              {projectsLoaded && !loadingProjects && !projectsLoadError && filteredProjects.length === 0 && (
                <div className="px-2 py-2 text-[13px] text-text-secondary">
                  {tt("projects.noProjectsFound")}
                </div>
              )}
              {filteredProjects.map((project) => {
                const active = project.id === selectedProjectId;
                const checked = bulkSelectedProjectIds.includes(project.id);
                return (
                  <div key={project.id} className="flex items-start gap-2">
                    <input
                      aria-label={`${copy("Select project", "Выбрать проект", "בחר פרויקט")} ${project.name}`}
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        toggleProjectBulkSelection(project.id, e.target.checked)
                      }
                      className="mt-3 h-4 w-4 rounded border-border text-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProjectId(project.id);
                        setImportResult(null);
                        setAnalysisReady(false);
                        setFocusedImportRunId(null);
                      }}
                      className={cn(
                        "flex min-h-[96px] w-full min-w-0 flex-col justify-between rounded-lg border px-3 py-3 text-start transition-colors duration-150",
                        active
                          ? "border-border-strong bg-[var(--dmx-accent-tint)]"
                          : "border-border bg-surface hover:border-border-strong hover:bg-surface-subtle",
                      )}
                    >
                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-medium text-text">
                          {project.name}
                        </div>
                        <div className="mt-0.5 truncate text-[12px] text-text-secondary">
                          {project.address}
                        </div>
                      </div>
                      <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1 text-[11px] text-text-secondary">
                        {t("projects.statusPrefix")}:{" "}
                        <StatusBadge
                          status={project.lifecycle_status || project.status}
                          label={tokenLabel(project.lifecycle_status || project.status, "project")}
                          domain="project"
                        />
                        {project.health_status &&
                        project.health_status !== "NORMAL" ? (
                          <StatusBadge
                            status={project.health_status}
                            label={tokenLabel(project.health_status, "health")}
                            domain="project"
                          />
                        ) : null}
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          <section
            className={cn(
              "space-y-5",
              projectDetailFocused
                ? "order-1 xl:col-span-1"
                : "xl:col-span-2",
            )}
          >
            {selectedProject ? (
              <>
                <div className="dmx-condensed">
                <div
                  className="dmx-condensed-bar"
                  data-on={projectBarCondensed ? "true" : "false"}
                  aria-hidden={!projectBarCondensed}
                  data-testid="project-condensed-bar"
                >
                  <span className="truncate text-14 font-medium text-text">{selectedProject.name}</span>
                  <StatusBadge
                    status={selectedProject.lifecycle_status || selectedProject.status}
                    label={tokenLabel(selectedProject.lifecycle_status || selectedProject.status, "project")}
                    domain="project"
                  />
                  <span className="flex-1" />
                  <button
                    type="button"
                    className="dmx-secondary-action"
                    onClick={() => scrollToProjectSection("project-door-matrix")}
                  >
                    {copy("Doors", "Двери", "דלתות")}
                  </button>
                </div>
                </div>
                <div
                  className={projectsPanelClass("overflow-hidden")}
                  data-testid="project-detail-v2-header"
                >
                  <div className="p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="truncate text-20 font-medium leading-tight text-text">
                            {selectedProject.name}
                          </h2>
                          <StatusBadge
                            status={
                              selectedProject.lifecycle_status ||
                              selectedProject.status
                            }
                            label={tokenLabel(
                              selectedProject.lifecycle_status ||
                                selectedProject.status,
                              "project",
                            )}
                            domain="project"
                          />
                          {selectedProject.health_status &&
                          selectedProject.health_status !== "NORMAL" ? (
                            <StatusBadge
                              status={selectedProject.health_status}
                              label={tokenLabel(selectedProject.health_status, "health")}
                              domain="project"
                            />
                          ) : null}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-12 leading-5 text-text-secondary">
                          <span className="min-w-0">
                            <span className="text-text-tertiary">
                              {copy("Code", "Код", "קוד")}
                            </span>{" "}
                            <LtrText as="span" className="font-medium text-text">
                              {selectedProjectCode}
                            </LtrText>
                          </span>
                          <span className="min-w-0">
                            <span className="text-text-tertiary">
                              {copy("Developer", "Застройщик", "יזם")}
                            </span>{" "}
                            <span className="font-medium text-text">
                              {projectDetails?.developer_company || "-"}
                            </span>
                          </span>
                          <span className="min-w-0">
                            <span className="text-text-tertiary">
                              {copy("Address", "Адрес", "כתובת")}
                            </span>{" "}
                            <span className="font-medium text-text">
                              {projectDetails?.address ||
                                selectedProject.address ||
                                "-"}
                            </span>
                          </span>
                          <span className="min-w-0">
                            <span className="text-text-tertiary">
                              {copy("Started", "Старт", "התחלה")}
                            </span>{" "}
                            <LtrText as="span" className="font-medium text-text">
                              {projectDetails?.planned_start_date || "-"}
                            </LtrText>
                          </span>
                          <span className="min-w-0">
                            <span className="text-text-tertiary">
                              {copy("Due", "Срок", "יעד")}
                            </span>{" "}
                            <LtrText as="span" className="font-medium text-text">
                              {projectDetails?.planned_end_date || "-"}
                            </LtrText>
                          </span>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
                        <PillButton
                          variant="secondary"
                          size="sm"
                          onClick={openEditProjectDialog}
                          disabled={!canManageProjects}
                          iconStart={
                            <PencilLine className="h-4 w-4" strokeWidth={1.8} />
                          }
                        >
                          {copy("Settings", "Настройки", "הגדרות")}
                        </PillButton>
                        {selectedProjectId ? (
                          <PillButton
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                              router.push(
                                `/reports?project_id=${encodeURIComponent(selectedProjectId)}`,
                              )
                            }
                            iconStart={
                              <FileText className="h-4 w-4" strokeWidth={1.8} />
                            }
                          >
                            {copy("Report", "Отчёт", "דוח")}
                          </PillButton>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 border-t border-border-subtle pt-3">
                      <PillButton
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          projectDetails?.waze_deep_link
                            ? window.open(
                                projectDetails.waze_deep_link,
                                "_blank",
                                "noreferrer",
                              )
                            : showProjectActionHint(
                                copy(
                                  "Add address in project settings to unlock Waze.",
                                  "Добавьте адрес в настройках проекта, чтобы включить Waze.",
                                  "הוסף כתובת בהגדרות הפרויקט כדי לפתוח את Waze.",
                                ),
                              )
                        }
                        iconStart={
                          <MapPinned className="h-4 w-4" strokeWidth={1.8} />
                        }
                      >
                        {copy("Waze to site", "Waze на объект", "Waze לאתר")}
                      </PillButton>
                      <PillButton
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          projectDetails?.whatsapp_deep_link
                            ? window.open(
                                projectDetails.whatsapp_deep_link,
                                "_blank",
                                "noreferrer",
                              )
                            : showProjectActionHint(
                                copy(
                                  "Add a contact phone or WhatsApp number to unlock WhatsApp.",
                                  "Добавьте телефон контакта или номер WhatsApp, чтобы включить WhatsApp.",
                                  "הוסף טלפון איש קשר או מספר WhatsApp כדי לפתוח את WhatsApp.",
                                ),
                              )
                        }
                        iconStart={
                          <MessageCircle
                            className="h-4 w-4"
                            strokeWidth={1.8}
                          />
                        }
                      >
                        {copy(
                          "WhatsApp developer",
                          "WhatsApp застройщику",
                          "WhatsApp ליזם",
                        )}
                      </PillButton>
                      <PillButton
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          projectDetails?.call_deep_link
                            ? window.open(projectDetails.call_deep_link, "_self")
                            : showProjectActionHint(
                                copy(
                                  "Add a primary phone in project settings to unlock calling.",
                                  "Добавьте основной телефон в настройках проекта, чтобы включить звонок.",
                                  "הוסף טלפון ראשי בהגדרות הפרויקט כדי לפתוח חיוג.",
                                ),
                              )
                        }
                        iconStart={
                          <Phone className="h-4 w-4" strokeWidth={1.8} />
                        }
                      >
                        {copy("Call contact", "Позвонить контакту", "התקשר")}
                      </PillButton>
                    </div>
                  </div>

                  <FactStrip
                    testId="project-facts"
                    items={[
                      {
                        key: "doors",
                        label: copy("Doors installed", "Дверей установлено", "דלתות הותקנו"),
                        value: <LtrText as="span">{projectInstalledDoors} / {projectTotalDoors || "-"}</LtrText>,
                        detail: <LtrText as="span">{formatPct(projectCompletionPct)}</LtrText>,
                        tone: projectTotalDoors > 0 && projectInstalledDoors >= projectTotalDoors ? "ok" : "neutral",
                        rail: { done: projectInstalledDoors, total: projectTotalDoors },
                      },
                      {
                        key: "deadline",
                        label: copy("Days remaining", "Дней осталось", "ימים נותרו"),
                        value: projectDeadlineDays === null ? "-" : Math.max(projectDeadlineDays, 0),
                        detail: projectDeadlineHint,
                        tone:
                          projectDeadlineDays === null
                            ? "neutral"
                            : projectDeadlineDays < 0
                              ? "bad"
                              : projectDeadlineDays <= 3
                                ? "warn"
                                : "ok",
                      },
                      {
                        key: "issues",
                        label: copy("Open issues", "Открытые проблемы", "בעיות פתוחות"),
                        value: projectOpenIssues,
                        detail:
                          projectBlockedIssues > 0
                            ? copy(
                                `${projectBlockedIssues} blocked`,
                                `${projectBlockedIssues} заблокировано`,
                                `${projectBlockedIssues} חסומות`,
                              )
                            : copy("no blocked issues", "нет блокеров", "אין חסימות"),
                        tone: projectBlockedIssues > 0 ? "bad" : resolveKpiTone(projectOpenIssues, { warn: 1, bad: 5 }),
                      },
                      ...(projectOpenRisks.length > 0
                        ? [
                            {
                              key: "risks",
                              label: copy("System risks", "Системные риски", "סיכוני מערכת"),
                              value: projectOpenRisks.length,
                              detail: projectOpenRisks.map((risk) => projectRiskLabel(risk.kind)).join(" · "),
                              tone: "warn" as const,
                              testId: "project-fact-risks",
                            },
                          ]
                        : []),
                      {
                        key: "revenue",
                        label: copy("Revenue", "Выручка", "הכנסות"),
                        value: canViewProjectRates && projectPlanFact ? formatMoney(projectPlanFact.actual_revenue_total) : "-",
                        detail:
                          canViewProjectRates && projectPlanFact
                            ? `${copy("plan", "план", "תכנון")} ${formatMoney(projectPlanFact.planned_revenue_total)}`
                            : financeTileState(projectPlanFactQuery),
                      },
                      {
                        key: "margin",
                        label: copy("Margin", "Маржа", "מרווח"),
                        value: canViewProjectRates && projectRisk ? formatPct(projectRisk.summary.actual_margin_pct) : "-",
                        detail:
                          canViewProjectRates && projectRisk
                            ? `${copy("profit", "прибыль", "רווח")} ${formatMoney(projectRisk.summary.actual_profit_total)}`
                            : financeTileState(projectRiskQuery),
                      },
                    ]}
                  />
                </div>

                <AiAssistPanel
                  testId="project-ai-assist"
                  context={
                    focusedDoorRow
                      ? { kind: "door", id: focusedDoorRow.door_id }
                      : selectedProjectId
                        ? { kind: "project", id: selectedProjectId }
                        : null
                  }
                  label={focusedDoorRow ? focusedDoorRow.unit_label : projectDetails?.name ?? ""}
                />

                {focusedDoorRow && (
                  <DoorStagesCard
                    key={focusedDoorRow.door_id}
                    doorId={focusedDoorRow.door_id}
                    doorTypeId={focusedDoorRow.door_type_id}
                    canPlan={canManageProjects}
                    installers={installersReference.items}
                    onDoorChanged={() => { if (selectedProjectId) void refreshSelectedProjectOperationalData(selectedProjectId); }}
                  />
                )}

                <DoorCommandBar
                  workspace={workspace}
                  selectedProjectId={selectedProjectId}
                  canManageProjects={canManageProjects}
                  canViewProjectRates={canViewProjectRates}
                  commercialAccessRestrictedTitle={commercialAccessRestrictedTitle}
                  formatMoney={formatMoney}
                  projectDetails={projectDetails}
                  projectPlanFact={projectPlanFact}
                  projectRisk={projectRisk}
                  projectFinancialReady={projectFinancialReady}
                  projectCompletionPct={projectCompletionPct}
                  projectInstalledDoors={projectInstalledDoors}
                  projectTotalDoors={projectTotalDoors}
                  projectOpenIssues={projectOpenIssues}
                  projectUnassignedDoors={projectUnassignedDoors}
                  projectAssignedInstallerSummary={projectAssignedInstallerSummary}
                  importHistory={importHistory}
                  loadingImportHistory={loadingImportHistory}
                  projectDocuments={projectDocuments}
                  loadingProjectDocuments={loadingProjectDocuments}
                  projectAddonPlan={projectAddonPlan}
                  locationLabel={locationLabel}
                  tokenLabel={tokenLabel}
                  scrollToProjectSection={scrollToProjectSection}
                  matrixInstallerFilterControl={matrixInstallerFilterControl}
                  onMarkInstalled={handleFocusedDoorMarkInstalled}
                />

                <ProjectSettingsCard
                  details={projectDetails}
                  project={selectedProject}
                  projectCode={selectedProjectCode}
                  canManage={canManageProjects}
                  onEdit={openEditProjectDialog}
                  onActionHint={showProjectActionHint}
                  onActionHintChange={setProjectActionHint}
                  onNotice={setProjectFlowNotice}
                />

                <ProjectDocumentsCard
                  projectId={selectedProjectId}
                  canManage={canManageProjects}
                  templates={documentTemplates}
                  loadingTemplates={loadingDocumentTemplates}
                  templatesReady={templatesReference.ready}
                  documents={projectDocuments}
                  loadingDocuments={loadingProjectDocuments}
                  onReloadDocuments={loadProjectDocuments}
                  onError={setError}
                  onNotice={setProjectFlowNotice}
                />

                <WidgetCard
                  id="project-manual-door"
                  title={copy(
                    "Manual Door Creation",
                    "Ручное создание двери",
                    "יצירה ידנית של דלת",
                  )}
                  headerMeta={copy(
                    "Fallback for missing import rows",
                    "Резерв для пропущенных строк импорта",
                    "גיבוי לשורות ייבוא חסרות",
                  )}
                >
                  <div className="space-y-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="max-w-2xl">
                      <h3 className="text-[15px] font-semibold leading-tight text-text">
                        {copy(
                          "Add a missing door without waiting for a new import run.",
                          "Добавьте недостающую дверь без ожидания нового импорта.",
                          "הוסף דלת חסרה בלי לחכות להרצת ייבוא חדשה.",
                        )}
                      </h3>
                      <p className="mt-2 text-[12px] leading-6 text-text-secondary">
                        {copy(
                          "Use a canonical product from Library, assign an installer if needed, and refresh the layout immediately.",
                          "Используйте канонический продукт из справочник, при необходимости назначьте монтажника и немедленно обновите макет.",
                          "בחר מוצר קנוני מהספרייה, שיוך מתקין אם צריך, ורענן מיד את פריסת הפרויקט.",
                        )}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-text-secondary">
                        <span className="metric-chip">
                          {copy(
                            "Library products",
                            "Библиотечные продукты",
                            "מוצרי ספרייה",
                          )}{" "}
                          {activeLibraryProducts.length}
                        </span>
                        <span className="metric-chip">
                          {copy(
                            "Active installers",
                            "Активные монтажники",
                            "מתקינים פעילים",
                          )}{" "}
                          {activeInstallers.length}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-start gap-2 md:items-end">
                      <div className="flex flex-wrap gap-2 md:justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            router.push(
                              `/library?open=create&return_to=${encodeURIComponent(
                                `/projects?project_id=${selectedProjectId || ""}&focus_section=doors`,
                              )}`,
                            )
                          }
                        disabled={!canManageProjects}
                        >
                          {copy(
                            "Open Library",
                            "Открытая справочник",
                            "פתח ספרייה",
                          )}
                        </Button>
                        <Button
                          type="button"
                          onClick={openManualDoorDialog}
                          className="gap-2"
                          disabled={
                            !canManageProjects ||
                            !libraryReference.ready ||
                            activeLibraryProducts.length === 0
                          }
                        >
                          <Plus className="h-4 w-4" />
                          {copy(
                            "Add door manually",
                            "Добавить дверь вручную",
                            "הוסף דלת ידנית",
                          )}
                        </Button>
                      </div>
                      <div className="text-[11px] text-text-secondary">
                        {loadingLibraryProducts
                          ? copy(
                              "Loading library...",
                              "Загрузка справочника...",
                              "טוען ספרייה...",
                            )
                          : libraryReference.error ? referenceUnavailable
                          : activeLibraryProducts.length === 0
                            ? copy(
                                "Add active products in Library first.",
                                "Сначала добавьте активные продукты в справочник.",
                                "קודם הוסף מוצרים פעילים בספרייה.",
                              )
                            : copy(
                                "Door will appear after project refresh.",
                                "Дверь появится после обновления проекта.",
                                "הדלת תופיע אחרי רענון הפרויקט.",
                              )}
                      </div>
                    </div>
                  </div>
                  </div>
                </WidgetCard>

                {canViewProjectRates ? (
                  <>
                    <AdditionalWorksCard
                      projectId={selectedProjectId}
                      canManage={canManageProjects}
                      canViewRates={canViewProjectRates}
                      pricing={pricing}
                      pricingReady={pricingReady}
                      factoryPricing={factoryPricing}
                      factoryAddonRates={factoryAddonRates}
                      addonPlanRate={addonPlanRate}
                      addonPlanTotals={addonPlanTotals}
                      formatMoney={formatMoney}
                      missingAddonPrice={missingAddonPrice}
                      referenceUnavailable={referenceUnavailable}
                      addonTypes={activeAddonTypes}
                      loadingAddonTypes={loadingAddonTypes}
                      addonTypesReady={addonTypesReference.ready}
                      addonTypesError={addonTypesReference.error}
                      plan={projectAddonPlan}
                      loadingPlan={loadingProjectAddonPlan}
                      onReloadPlan={loadProjectAddonPlan}
                      restrictedDetail={commercialAccessRestrictedDetail}
                      onError={setError}
                      onNotice={setProjectFlowNotice}
                      onActionHint={setProjectActionHint}
                      onSaved={handleAdditionalWorkSaved}
                    />

                    <UrgencySurchargesCard
                      projectId={selectedProjectId}
                      canManage={canManageProjects}
                      canViewRates={canViewProjectRates}
                      pricing={pricing}
                      formatMoney={formatMoney}
                      surcharges={urgencySurcharges}
                      loading={loadingUrgencySurcharges}
                      onReload={loadUrgencySurcharges}
                      restrictedDetail={commercialAccessRestrictedDetail}
                      onError={setError}
                      onNotice={setProjectFlowNotice}
                      onActionHint={setProjectActionHint}
                      onSaved={handleUrgencySaved}
                    />

                    <ProjectFinancialScreen
                      projectId={selectedProjectId}
                      formatMoney={formatMoney}
                      planFact={projectPlanFact}
                      risk={projectRisk}
                      loadingPlanFact={loadingProjectPlanFact}
                      loadingRisk={loadingProjectRisk}
                      tokenLabel={tokenLabel}
                    />
                  </>
                ) : (
                  <WidgetCard
                    id="project-commercial-restricted"
                    title={commercialAccessRestrictedTitle}
                    headerMeta={copy(
                      "Operations access only",
                      "Только операционный доступ",
                      "גישת תפעול בלבד",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-status-warning-fg" />
                      <div>
                        <p className="mt-1 max-w-3xl text-[12px] leading-6 text-text-secondary">
                          {commercialAccessRestrictedDetail}
                        </p>
                      </div>
                    </div>
                  </WidgetCard>
                )}

                {bulkReconcileResult && (
                  <BulkReconcileCard
                    result={bulkReconcileResult}
                    projects={projects}
                    tokenLabel={tokenLabel}
                  />
                )}

                {bulkReviewResult && (
                  <BulkImportReviewCard
                    result={bulkReviewResult}
                    tokenLabel={tokenLabel}
                    onRetryRun={handleRetryImportRun}
                    onOpenRun={openImportRun}
                    onSelectProject={setSelectedProjectId}
                  />
                )}

                <FailedImportQueueCard
                  projectId={selectedProjectId}
                  canManage={canManageProjectImports}
                  queue={failedQueue}
                  loading={loadingFailedQueue}
                  canPrev={failedQueueCanPrev}
                  canNext={failedQueueCanNext}
                  onOffsetChange={setFailedQueueOffset}
                  onlySelectedProject={failedQueueOnlySelectedProject}
                  onOnlySelectedProjectChange={setFailedQueueOnlySelectedProject}
                  onReload={loadFailedQueue}
                  onOpenRun={openImportRun}
                  onError={setError}
                  onRetried={handleFailedRunsRetried}
                  tokenLabel={tokenLabel}
                  tt={tt}
                />

                <DoorImportWizard
                  projectId={selectedProjectId}
                  canManage={canManageProjectImports}
                  canViewRates={canViewProjectRates}
                  doorTypes={doorTypes}
                  loadingDoorTypes={loadingDoorTypes}
                  doorTypesReady={doorTypesReference.ready}
                  mappingProfilesQuery={mappingProfilesQuery}
                  importResult={importResult}
                  analysisReady={analysisReady}
                  onImportResultChange={setImportResult}
                  onAnalysisReadyChange={setAnalysisReady}
                  onError={setError}
                  onAnalyzed={handleImportAnalyzed}
                  onImported={handleImportCompleted}
                  renderPreviewGroups={renderImportPreviewGroups}
                >
                  <ImportHistoryPanel
                    projectId={selectedProjectId}
                    canManage={canManageProjectImports}
                    canViewRates={canViewProjectRates}
                    importHistory={importHistory}
                    loadingHistory={loadingImportHistory}
                    onReloadHistory={loadImportHistory}
                    modeFilter={importHistoryModeFilter}
                    onModeFilterChange={setImportHistoryModeFilter}
                    statusFilter={importHistoryStatusFilter}
                    onStatusFilterChange={setImportHistoryStatusFilter}
                    focusedRunId={focusedImportRunId}
                    retryingRunId={retryingRunId}
                    onRetryRun={handleRetryImportRun}
                    onOpenRun={openImportRun}
                    details={focusedImportRunDetails}
                    loadingDetails={loadingImportRunDetails}
                    renderPreviewGroups={renderImportPreviewGroups}
                    tokenLabel={tokenLabel}
                  />
                </DoorImportWizard>

                <DoorMatrix
                  workspace={workspace}
                  canManageProjects={canManageProjects}
                  canViewProjectRates={canViewProjectRates}
                  activeInstallerById={activeInstallerById}
                  activeInstallers={activeInstallers}
                  installersReady={installersReference.ready}
                  reasons={reasons}
                  activeReasons={activeReasons}
                  loadingReasons={loadingReasons}
                  reasonsReady={reasonsReference.ready}
                  reasonsError={reasonsReference.error}
                  importHistoryCount={importHistory.length}
                  documentsCount={projectDocuments.length}
                  addonPlanCount={projectAddonPlan.length}
                  referenceUnavailable={referenceUnavailable}
                  locationLabel={locationLabel}
                  tokenLabel={tokenLabel}
                  scrollToProjectSection={scrollToProjectSection}
                  matrixInstallerFilterControl={matrixInstallerFilterControl}
                  onBulkAssign={handleBulkAssignDoors}
                  onMarkInstalled={handleFocusedDoorMarkInstalled}
                  onMarkNotInstalled={handleFocusedDoorMarkNotInstalled}
                >
                  <DoorLedger
                    filteredMatrixRows={filteredMatrixRows}
                    visibleMatrixRows={visibleMatrixRows}
                    hiddenMatrixRows={hiddenMatrixRows}
                    filteredMatrixSummary={filteredMatrixSummary}
                    filteredDoorIds={filteredDoorIds}
                    selectedDoorIds={selectedDoorIds}
                    selectedDoorIdSet={selectedDoorIdSet}
                    allFilteredDoorsSelected={allFilteredDoorsSelected}
                    focusedDoorId={focusedDoorId}
                    setFocusedDoorId={setFocusedDoorId}
                    setLedgerRowLimit={setLedgerRowLimit}
                    ledgerDesktop={ledgerDesktop}
                    toggleDoorSelection={toggleDoorSelection}
                    toggleFilteredDoorSelection={toggleFilteredDoorSelection}
                    canManageProjects={canManageProjects}
                    locationLabel={locationLabel}
                    tokenLabel={tokenLabel}
                  />
                </DoorMatrix>

                {loadingLayout && (
                  <WidgetCard
                    title={copy(
                      "Import layout check",
                      "Проверка раскладки импорта",
                      "בדיקת פריסת יבוא",
                    )}
                  >
                    <div className="text-[13px] text-text-secondary">
                      {t("projects.loadingLayout")}
                    </div>
                  </WidgetCard>
                )}

                {!loadingLayout && layout && floorGroups.length === 0 && (
                  <WidgetCard
                    title={copy(
                      "Import layout check",
                      "Проверка раскладки импорта",
                      "בדיקת פריסת יבוא",
                    )}
                  >
                    <div className="text-[13px] text-text-secondary">
                      {t("projects.noDoorsInProjectYet")}
                    </div>
                  </WidgetCard>
                )}

                {!loadingLayout && floorGroups.length > 0 && (
                  <ImportLayoutCheck
                    layout={layout}
                    floorGroups={floorGroups}
                    tokenLabel={tokenLabel}
                  />
                )}
              </>
            ) : (
              <WidgetCard
                title={copy(
                  "Import layout check",
                  "Проверка раскладки импорта",
                  "בדיקת פריסת יבוא",
                )}
              >
                <div className="text-[13px] text-text-secondary">
                  {t("projects.selectProjectLayout")}
                </div>
              </WidgetCard>
            )}
          </section>
        </div>
      </div>

      <ProjectDialog
        key={`project-dialog-${projectDialogSession}`}
        open={projectDialogOpen}
        onOpenChange={setProjectDialogOpen}
        mode={projectDialogMode}
        initialForm={projectDialogInitialForm}
        projectId={selectedProjectId}
        canManage={canManageProjects}
        tokenLabel={tokenLabel}
        onCreated={handleProjectCreated}
        onUpdated={handleProjectUpdated}
      />

      <ManualDoorDialog
        key={`manual-door-${manualDoorSession}`}
        open={manualDoorDialogOpen}
        onOpenChange={setManualDoorDialogOpen}
        initialForm={manualDoorInitialForm}
        projectId={selectedProjectId}
        canManage={canManageProjects}
        libraryReady={libraryReference.ready}
        installersReady={installersReference.ready}
        products={activeLibraryProducts}
        installers={activeInstallers}
        existingDoorMarkings={existingDoorMarkings}
        onError={setError}
        onNotice={setProjectFlowNotice}
        onDuplicate={setMatrixMarkingSearch}
        onCreated={handleManualDoorCreated}
      />
    </DashboardLayout>
  );
}
