import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";


import { useRouter, useSearchParams } from "next/navigation";


import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileText,
  FilterX,
  MapPinned,
  MessageCircle,
  Phone,
  Plus,
  PencilLine,
  RefreshCw,
  Search,
  UserPlus,
} from "lucide-react";


import { DashboardLayout } from "@/components/DashboardLayout";


import { DataStateNotice } from "@/components/DataStateNotice";


import { keepPreviousData, useQuery } from "@tanstack/react-query";


import { useMediaQuery } from "@/hooks/use-media-query";


import { useReferenceList } from "@/hooks/use-reference-list";


import { useCompanyPricingState } from "@/hooks/use-company-pricing-state";


import { DoorMatrixTile } from "@/components/projects/DoorMatrixTile";


import { ProjectDialog } from "@/components/projects/ProjectDialog";

import { ImportHistoryPanel } from "@/components/projects/ImportHistoryPanel";

import type { ProjectImportRunDetails } from "@/components/projects/import-types";


import { ImportLayoutCheck } from "@/components/projects/ImportLayoutCheck";


import type { LayoutBucket, ProjectDoorsLayoutResponse } from "@/components/projects/layout-types";


import { BulkImportReviewCard } from "@/components/projects/BulkImportReviewCard";


import type { LatestImportReviewResponse } from "@/components/projects/import-types";


import { BulkReconcileCard } from "@/components/projects/BulkReconcileCard";


import type { BulkReconcileResponse } from "@/components/projects/import-types";


import { ProjectSideWidgets } from "@/components/projects/ProjectSideWidgets";


import type { ProjectImportRunItem } from "@/components/projects/project-types";


import { issueLabel } from "@/components/projects/shared";


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


import { formatDateTime } from "@/components/projects/shared";


import { DoorImportWizard } from "@/components/projects/DoorImportWizard";


import { useImportCopy } from "@/components/projects/import-copy";


import type { DoorType, ImportColumnsDiagnostics, ImportResult, ImportMappingProfilesResponse } from "@/components/projects/import-types";



import { emptyProjectForm, projectsMetricLabelClass } from "@/components/projects/project-form";


import type { ProjectFormState } from "@/components/projects/project-form";


import {
  Breadcrumbs,
  KpiCard as DimaxKpiCard,
  MetricRow,
  PillButton,
  WidgetCard,
} from "@/components/dimax";


import { Button } from "@/components/ui/button";


import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";


import { Input } from "@/components/ui/input";


import { Label } from "@/components/ui/label";


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

function projectsPanelClass(extra?: string): string {
  return cn("rounded-lg border border-border bg-surface", extra);
}

type ProjectStatusFilter = "ALL" | "ACTIVE" | "PROBLEM" | "COMPLETED" | "ARCHIVED";

const PROJECT_COMPLETED_STATUSES = new Set([
  "COMPLETED",
  "DONE",
  "FINISHED",
  "CLOSED",
]);
const PROJECT_ARCHIVED_STATUSES = new Set(["ARCHIVED"]);
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

type ReasonItem = {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
};

type DoorActionResponse = {
  ok?: boolean;
  id: string;
  status: string;
  version: number;
};

type LibraryProductItem = {
  id: string;
  sku: string;
  name_ru: string;
  name_he: string;
  install_type: string;
  manufacturer: string | null;
  unit: string;
  status: string;
};

type InstallerListItem = {
  id: string;
  full_name: string;
  email: string | null;
  status: string;
  is_active: boolean;
};

type ManualDoorFormState = {
  product_id: string;
  door_code: string;
  unit: string;
  floor: string;
  location_code: string;
  order_number: string;
  install_type: string;
  is_critical: boolean;
  assigned_installer_id: string;
  planned_install_date: string;
};

type BulkAssignDoorsResponse = {
  assigned: number;
  skipped: number;
  assigned_door_ids: string[];
};

type ProjectImportRunsResponse = {
  items: ProjectImportRunItem[];
};

function emptyManualDoorForm(): ManualDoorFormState {
  return {
    product_id: "",
    door_code: "",
    unit: "",
    floor: "",
    location_code: "",
    order_number: "",
    install_type: "",
    is_critical: false,
    assigned_installer_id: "",
    planned_install_date: "",
  };
}

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

type FailedImportQueueItem = {
  run_id: string;
  project_id: string;
  project_name: string;
  created_at: string;
  mode: string;
  status: string;
  source_filename: string | null;
  mapping_profile: string | null;
  parsed_rows: number;
  prepared_rows: number;
  imported: number;
  skipped: number;
  errors_count: number;
  last_error?: string | null;
  retry_available: boolean;
};

type FailedImportQueueResponse = {
  items: FailedImportQueueItem[];
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

type MatrixRow = {
  door_id: string;
  order_number: string;
  house_number: string;
  floor_label: string;
  apartment_number: string;
  location_code: string;
  door_marking: string;
  unit_label: string;
  door_type_id: string;
  door_type_label: string;
  status: string;
  installer_id: string | null;
  issue_count: number;
  issue_titles: string[];
};

type MatrixCell = {
  location_code: string;
  doors: MatrixRow[];
  door_count: number;
  issue_count: number;
  statuses: Record<string, number>;
};

type MatrixApartmentGroup = {
  apartment_number: string;
  order_numbers: string[];
  total_doors: number;
  issue_count: number;
  installed_count: number;
  open_count: number;
  cells: MatrixCell[];
};

type MatrixFloorGroup = {
  floor_label: string;
  location_codes: string[];
  apartments: MatrixApartmentGroup[];
  total_doors: number;
  issue_count: number;
  installed_count: number;
  open_count: number;
};

type MatrixHouseGroup = {
  house_number: string;
  floors: MatrixFloorGroup[];
  total_doors: number;
  apartments_count: number;
  issue_count: number;
  installed_count: number;
  open_count: number;
};

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

const FAILED_QUEUE_PAGE_SIZE = 10;
// Door ledger rows rendered at once; "Show more" reveals the next page.
const LEDGER_ROW_PAGE = 100;

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

function compareNatural(valueA: string, valueB: string): number {
  return valueA.localeCompare(valueB, "en", {
    numeric: true,
    sensitivity: "base",
  });
}

function matrixDoorTileTone(row: MatrixRow): string {
  const normalized = row.status.trim().toUpperCase();
  if (row.issue_count > 0) {
    return "border-status-problem-border bg-status-problem-bg text-status-problem-fg";
  }
  if (["INSTALLED", "DONE", "COMPLETED"].includes(normalized)) {
    return "border-status-ok-border bg-status-ok-bg text-status-ok-fg";
  }
  if (["IN_PROGRESS", "ASSIGNED", "ACTIVE"].includes(normalized)) {
    return "border-status-progress-border bg-status-progress-bg text-status-progress-fg";
  }
  if (["BLOCKED", "LOCKED"].includes(normalized)) {
    return "border-status-blocked-border bg-status-blocked-bg text-status-blocked-fg";
  }
  if (["CANCELLED", "CANCELED"].includes(normalized)) {
    return "border-status-archived-border bg-status-archived-bg text-status-archived-fg line-through opacity-75";
  }
  return "border-status-warning-border bg-status-warning-bg text-status-warning-fg";
}

function matrixProgressTone(issueCount: number, progressPct: number): string {
  if (issueCount > 0) {
    return "bg-kpi-red";
  }
  if (progressPct >= 100) {
    return "bg-kpi-green";
  }
  if (progressPct > 0) {
    return "bg-kpi-yellow";
  }
  return "bg-kpi-orange";
}

function matrixCompletionPct(installedCount: number, totalDoors: number): number {
  return Math.min(
    100,
    Math.max(
      0,
      Math.round((installedCount / Math.max(totalDoors, 1)) * 100),
    ),
  );
}

function matrixDoorTileLabel(row: MatrixRow): string {
  return row.door_marking.trim() || row.unit_label;
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

function chunkIds(values: string[], size: number): string[][] {
  const safeSize = Math.max(1, size);
  const chunks: string[][] = [];
  for (let i = 0; i < values.length; i += safeSize) {
    chunks.push(values.slice(i, i + safeSize));
  }
  return chunks;
}

// Lazily loaded panels of the selected project. A failed load is recorded
// here and rendered as a retryable notice instead of an empty panel.
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
  const locationLabel = (value: string | null | undefined): string => {
    if (!value) {
      return "-";
    }
    return LOCATION_LABELS[value]?.[locale] || value;
  };
  const { importRowErrorLabel, importProfileLabel } = useImportCopy();
  const tokenLabel = (value: string) => {
    const normalized = value.trim().toUpperCase();
    switch (normalized) {
      case "PROBLEM":
        return copy("PROBLEM", "Проблема", "בעיה");
      case "OK":
        return copy("OK", "Норма", "תקין");
      case "SUCCESS":
        return copy("SUCCESS", "Успешно", "הצליח");
      case "FAILED":
        return copy("FAILED", "Ошибка", "נכשל");
      case "PARTIAL":
        return copy("PARTIAL", "Частично", "חלקי");
      case "ANALYZED":
        return copy("ANALYZED", "Анализ", "נותח");
      case "OPEN":
        return copy("OPEN", "Открыто", "פתוח");
      case "BLOCKED":
        return copy("BLOCKED", "Заблокировано", "חסום");
      case "INSTALLED":
        return copy("INSTALLED", "Установлено", "הותקן");
      case "NOT_INSTALLED":
        return copy("NOT_INSTALLED", "Не установлено", "לא הותקן");
      case "LOCKED":
        return copy("LOCKED", "Заблокировано", "נעול");
      case "READY":
        return copy("READY", "Готово", "מוכן");
      case "DONE":
        return copy("DONE", "Выполнено", "בוצע");
      case "DANGER":
        return copy("DANGER", "Опасно", "סכנה");
      case "WARN":
        return copy("WARN", "Риск", "אזהרה");
      case "AT_RISK":
        return copy("AT_RISK", "Под риском", "בסיכון");
      case "UNASSIGNED":
        return copy("UNASSIGNED", "Не назначено", "לא משויך");
      default:
        return value;
    }
  };
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
  const [manualDoorDialogOpen, setManualDoorDialogOpen] = useState(false);
  const [manualDoorForm, setManualDoorForm] = useState<ManualDoorFormState>(
    emptyManualDoorForm(),
  );
  const [manualDoorSubmitting, setManualDoorSubmitting] = useState(false);

  const [analysisReady, setAnalysisReady] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importHistoryModeFilter, setImportHistoryModeFilter] = useState("all");
  const [importHistoryStatusFilter, setImportHistoryStatusFilter] =
    useState("all");
  const [retryingRunId, setRetryingRunId] = useState<string | null>(null);
  const [focusedDoorId, setFocusedDoorId] = useState<string | null>(null);
  const [focusedDoorReasonId, setFocusedDoorReasonId] = useState("");
  const [focusedDoorComment, setFocusedDoorComment] = useState("");
  const [focusedDoorOverrideReason, setFocusedDoorOverrideReason] =
    useState("");
  const [doorStatusAction, setDoorStatusAction] = useState<
    "install" | "not-installed" | "override-not-installed" | null
  >(null);
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
  const [selectedFailedRunIds, setSelectedFailedRunIds] = useState<string[]>(
    [],
  );

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

  // Selected failed runs can only point at rows of the current page.
  useEffect(() => {
    const items = failedQueueQuery.data?.items;
    if (!items) return;
    const ids = new Set(items.map((x) => x.run_id));
    setSelectedFailedRunIds((prev) => prev.filter((id) => ids.has(id)));
  }, [failedQueueQuery.data]);
  const [retryFailedBatchSize, setRetryFailedBatchSize] = useState(10);
  const [retryFailedProgress, setRetryFailedProgress] = useState<{
    active: boolean;
    total: number;
    processed: number;
    successful: number;
    failed: number;
    skipped: number;
  } | null>(null);
  const [retryFailedSummary, setRetryFailedSummary] =
    useState<RetryFailedRunsResponse | null>(null);
  const [focusedImportRunId, setFocusedImportRunId] = useState<string | null>(
    null,
  );
  const [deepLinkApplied, setDeepLinkApplied] = useState(false);
  const [deepLinkProjectMissing, setDeepLinkProjectMissing] = useState(false);
  const [deepLinkFocusApplied, setDeepLinkFocusApplied] = useState(false);
  const [createProjectDeepLinkApplied, setCreateProjectDeepLinkApplied] =
    useState(false);
  const [matrixHouse, setMatrixHouse] = useState("all");
  const [matrixOrderNumber, setMatrixOrderNumber] = useState("all");
  const [matrixFloor, setMatrixFloor] = useState("all");
  const [matrixLocation, setMatrixLocation] = useState("all");
  const [matrixDoorType, setMatrixDoorType] = useState("all");
  const [matrixStatus, setMatrixStatus] = useState("all");
  const [matrixInstaller, setMatrixInstaller] = useState("all");
  const [matrixIssueFilter, setMatrixIssueFilter] = useState<"all" | "issues">(
    "all",
  );
  const [matrixApartmentSearch, setMatrixApartmentSearch] = useState("");
  const [matrixMarkingSearch, setMatrixMarkingSearch] = useState("");
  // Typing stays responsive: the ledger filters on the deferred value.
  const deferredApartmentSearch = useDeferredValue(matrixApartmentSearch);
  const deferredMarkingSearch = useDeferredValue(matrixMarkingSearch);
  // One ledger layout at a time (cards below md, table from md); both keep
  // their breakpoint classes so the hydration default never shows through.
  const ledgerDesktop = useMediaQuery("(min-width: 768px)", true);
  const [ledgerRowLimit, setLedgerRowLimit] = useState(LEDGER_ROW_PAGE);
  const [selectedDoorIds, setSelectedDoorIds] = useState<string[]>([]);
  const [bulkAssignInstallerId, setBulkAssignInstallerId] = useState("");
  const [bulkAssignLoading, setBulkAssignLoading] = useState(false);

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

  const filteredProjectIds = useMemo(
    () => filteredProjects.map((p) => p.id),
    [filteredProjects],
  );

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
  const allFailedPageSelected = useMemo(() => {
    const ids = (failedQueue?.items || []).map((x) => x.run_id);
    return (
      ids.length > 0 && ids.every((id) => selectedFailedRunIds.includes(id))
    );
  }, [failedQueue, selectedFailedRunIds]);

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
  const selectedLibraryProduct = useMemo(
    () =>
      activeLibraryProducts.find(
        (item) => item.id === manualDoorForm.product_id,
      ) || null,
    [activeLibraryProducts, manualDoorForm.product_id],
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
      const floor = bucket.floor_label || "Unknown floor";
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

  const matrixRows = useMemo(() => {
    if (!layout) {
      return [] as MatrixRow[];
    }
    const rows: MatrixRow[] = [];
    for (const bucket of layout.buckets) {
      for (const door of bucket.doors) {
        rows.push({
          door_id: door.id,
          order_number: door.order_number || bucket.order_number || "-",
          house_number: bucket.house_number || "-",
          floor_label: bucket.floor_label || "Unknown floor",
          apartment_number: door.apartment_number || "-",
          location_code: door.location_code || bucket.location_code || "-",
          door_marking: door.door_marking || bucket.door_marking || "-",
          unit_label: door.unit_label,
          door_type_id: door.door_type_id,
          door_type_label:
            doorTypeLabel(door.door_type_id),
          status: door.status,
          installer_id: door.installer_id,
          issue_count: (issuesByDoorId.get(door.id) || []).length,
          issue_titles: (issuesByDoorId.get(door.id) || []).map(issueLabel),
        });
      }
    }
    rows.sort((a, b) => {
      const order = compareNatural(a.order_number, b.order_number);
      if (order !== 0) return order;
      const h = compareNatural(a.house_number, b.house_number);
      if (h !== 0) return h;
      const f = compareNatural(a.floor_label, b.floor_label);
      if (f !== 0) return f;
      const apt = compareNatural(a.apartment_number, b.apartment_number);
      if (apt !== 0) return apt;
      return compareNatural(a.unit_label, b.unit_label);
    });
    return rows;
  }, [layout, doorTypeLabel, issuesByDoorId]);

  const focusedDoorRow = useMemo(
    () => matrixRows.find((row) => row.door_id === focusedDoorId) || null,
    [focusedDoorId, matrixRows],
  );
  const focusedDoorInstaller = focusedDoorRow?.installer_id
    ? activeInstallerById.get(focusedDoorRow.installer_id) || null
    : null;
  const focusedDoorIssues = focusedDoorRow
    ? issuesByDoorId.get(focusedDoorRow.door_id) || []
    : [];

  const projectDoorTotals = useMemo(() => {
    let installedCount = 0;
    let issueCount = 0;
    let assignedCount = 0;

    for (const row of matrixRows) {
      if (row.status === "INSTALLED") {
        installedCount += 1;
      }
      if (row.installer_id) {
        assignedCount += 1;
      }
      issueCount += row.issue_count;
    }

    const totalDoors = layout?.total_doors ?? matrixRows.length;

    return {
      totalDoors,
      installedCount,
      openCount: Math.max(totalDoors - installedCount, 0),
      issueCount,
      assignedCount,
    };
  }, [layout?.total_doors, matrixRows]);

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

  const matrixHouseOptions = useMemo(
    () =>
      Array.from(new Set(matrixRows.map((x) => x.house_number))).sort(
        compareNatural,
      ),
    [matrixRows],
  );
  const matrixOrderNumberOptions = useMemo(
    () =>
      Array.from(new Set(matrixRows.map((x) => x.order_number))).sort(
        compareNatural,
      ),
    [matrixRows],
  );
  const matrixFloorOptions = useMemo(
    () =>
      Array.from(new Set(matrixRows.map((x) => x.floor_label))).sort(
        compareNatural,
      ),
    [matrixRows],
  );
  const matrixLocationOptions = useMemo(
    () =>
      Array.from(new Set(matrixRows.map((x) => x.location_code))).sort(
        compareNatural,
      ),
    [matrixRows],
  );
  const matrixDoorTypeOptions = useMemo(
    () =>
      Array.from(new Set(matrixRows.map((x) => x.door_type_id)))
        .map((id) => ({
          id,
          label: doorTypeLabel(id),
        }))
        .sort((a, b) => compareNatural(a.label, b.label)),
    [matrixRows, doorTypeLabel],
  );
  const matrixStatusOptions = useMemo(
    () =>
      Array.from(new Set(matrixRows.map((x) => x.status))).sort(compareNatural),
    [matrixRows],
  );

  const filteredMatrixRows = useMemo(() => {
    const aptQ = deferredApartmentSearch.trim().toLowerCase();
    const markingQ = deferredMarkingSearch.trim().toLowerCase();
    return matrixRows.filter((row) => {
      if (matrixOrderNumber !== "all" && row.order_number !== matrixOrderNumber)
        return false;
      if (matrixHouse !== "all" && row.house_number !== matrixHouse)
        return false;
      if (matrixFloor !== "all" && row.floor_label !== matrixFloor)
        return false;
      if (matrixLocation !== "all" && row.location_code !== matrixLocation)
        return false;
      if (matrixDoorType !== "all" && row.door_type_id !== matrixDoorType)
        return false;
      if (matrixStatus !== "all" && row.status !== matrixStatus) return false;
      if (matrixInstaller === "unassigned" && row.installer_id) return false;
      if (
        matrixInstaller !== "all" &&
        matrixInstaller !== "unassigned" &&
        row.installer_id !== matrixInstaller
      )
        return false;
      if (matrixIssueFilter === "issues" && row.issue_count === 0)
        return false;
      if (aptQ && !row.apartment_number.toLowerCase().includes(aptQ))
        return false;
      if (
        markingQ &&
        ![row.door_marking, row.unit_label, row.apartment_number].some((value) =>
          value.toLowerCase().includes(markingQ),
        )
      )
        return false;
      return true;
    });
  }, [
    matrixRows,
    matrixOrderNumber,
    matrixHouse,
    matrixFloor,
    matrixLocation,
    matrixDoorType,
    matrixStatus,
    matrixInstaller,
    matrixIssueFilter,
    deferredApartmentSearch,
    deferredMarkingSearch,
  ]);
  const visibleMatrixRows = useMemo(
    () => filteredMatrixRows.slice(0, ledgerRowLimit),
    [filteredMatrixRows, ledgerRowLimit],
  );
  const hiddenMatrixRows = filteredMatrixRows.length - visibleMatrixRows.length;
  useEffect(() => {
    // A new filter result starts from the first page again.
    setLedgerRowLimit(LEDGER_ROW_PAGE);
  }, [filteredMatrixRows]);

  const matrixDoorIds = useMemo(
    () => matrixRows.map((row) => row.door_id),
    [matrixRows],
  );
  const filteredDoorIds = useMemo(
    () => filteredMatrixRows.map((row) => row.door_id),
    [filteredMatrixRows],
  );
  const selectedDoorIdSet = useMemo(
    () => new Set(selectedDoorIds),
    [selectedDoorIds],
  );
  const selectedFilteredDoorCount = useMemo(
    () => filteredDoorIds.filter((id) => selectedDoorIdSet.has(id)).length,
    [filteredDoorIds, selectedDoorIdSet],
  );
  const allFilteredDoorsSelected =
    filteredDoorIds.length > 0 &&
    selectedFilteredDoorCount === filteredDoorIds.length;
  const hiddenSelectedDoorCount = selectedDoorIds.length - selectedFilteredDoorCount;

  const resetMatrixFilters = () => {
    setMatrixOrderNumber("all");
    setMatrixHouse("all");
    setMatrixFloor("all");
    setMatrixLocation("all");
    setMatrixDoorType("all");
    setMatrixStatus("all");
    setMatrixInstaller("all");
    setMatrixIssueFilter("all");
    setMatrixApartmentSearch("");
    setMatrixMarkingSearch("");
  };

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

  const existingDoorMarkings = useMemo(() => {
    const values = new Set<string>();
    for (const row of matrixRows) {
      const marking = row.door_marking.trim();
      if (!marking || marking === "-") {
        continue;
      }
      values.add(marking.toLowerCase());
    }
    return values;
  }, [matrixRows]);

  const filteredMatrixSummary = useMemo(() => {
    const uniqueOrders = new Set<string>();
    const uniqueHouses = new Set<string>();
    const uniqueFloors = new Set<string>();
    const uniqueApartments = new Set<string>();
    const uniqueLocations = new Set<string>();
    const uniqueMarkings = new Set<string>();
    let installedCount = 0;
    let openCount = 0;
    let assignedCount = 0;
    let issuesCount = 0;

    for (const row of filteredMatrixRows) {
      uniqueOrders.add(row.order_number);
      uniqueHouses.add(row.house_number);
      uniqueFloors.add(`${row.house_number}::${row.floor_label}`);
      uniqueApartments.add(
        `${row.house_number}::${row.floor_label}::${row.apartment_number}`,
      );
      uniqueLocations.add(row.location_code);
      if (row.door_marking !== "-") {
        uniqueMarkings.add(row.door_marking);
      }
      if (row.status === "INSTALLED") {
        installedCount += 1;
      } else {
        openCount += 1;
      }
      if (row.installer_id) {
        assignedCount += 1;
      }
      issuesCount += row.issue_count;
    }

    return {
      orders: uniqueOrders.size,
      houses: uniqueHouses.size,
      floors: uniqueFloors.size,
      apartments: uniqueApartments.size,
      locations: uniqueLocations.size,
      markings: uniqueMarkings.size,
      installedCount,
      openCount,
      assignedCount,
      issuesCount,
    };
  }, [filteredMatrixRows]);

  const matrixLegendCounts = useMemo(() => {
    const counts = {
      installed: 0,
      inProgress: 0,
      issues: 0,
      notInstalled: 0,
      locked: 0,
      cancelled: 0,
    };

    for (const row of filteredMatrixRows) {
      const normalized = row.status.trim().toUpperCase();
      if (row.issue_count > 0) {
        counts.issues += 1;
      }
      if (["INSTALLED", "DONE", "COMPLETED"].includes(normalized)) {
        counts.installed += 1;
      } else if (["IN_PROGRESS", "ASSIGNED", "ACTIVE"].includes(normalized)) {
        counts.inProgress += 1;
      } else if (["BLOCKED", "LOCKED"].includes(normalized)) {
        counts.locked += 1;
      } else if (["CANCELLED", "CANCELED"].includes(normalized)) {
        counts.cancelled += 1;
      } else {
        counts.notInstalled += 1;
      }
    }

    return counts;
  }, [filteredMatrixRows]);

  const projectDetailMatrix = useMemo(() => {
    const houseMap = new Map<
      string,
      {
        house_number: string;
        total_doors: number;
        apartments: Set<string>;
        issue_count: number;
        installed_count: number;
        open_count: number;
        floors: Map<
          string,
          {
            floor_label: string;
            total_doors: number;
            issue_count: number;
            installed_count: number;
            open_count: number;
            location_codes: Set<string>;
            apartments: Map<
              string,
              {
                apartment_number: string;
                order_numbers: Set<string>;
                total_doors: number;
                issue_count: number;
                installed_count: number;
                open_count: number;
                cells: Map<
                  string,
                  {
                    location_code: string;
                    doors: MatrixRow[];
                    issue_count: number;
                    statuses: Record<string, number>;
                  }
                >;
              }
            >;
          }
        >;
      }
    >();

    for (const row of filteredMatrixRows) {
      let house = houseMap.get(row.house_number);
      if (!house) {
        house = {
          house_number: row.house_number,
          total_doors: 0,
          apartments: new Set(),
          issue_count: 0,
          installed_count: 0,
          open_count: 0,
          floors: new Map(),
        };
        houseMap.set(row.house_number, house);
      }

      house.total_doors += 1;
      house.apartments.add(`${row.floor_label}::${row.apartment_number}`);
      house.issue_count += row.issue_count;
      if (row.status === "INSTALLED") {
        house.installed_count += 1;
      } else {
        house.open_count += 1;
      }

      let floor = house.floors.get(row.floor_label);
      if (!floor) {
        floor = {
          floor_label: row.floor_label,
          total_doors: 0,
          issue_count: 0,
          installed_count: 0,
          open_count: 0,
          location_codes: new Set(),
          apartments: new Map(),
        };
        house.floors.set(row.floor_label, floor);
      }

      floor.total_doors += 1;
      floor.issue_count += row.issue_count;
      floor.location_codes.add(row.location_code);
      if (row.status === "INSTALLED") {
        floor.installed_count += 1;
      } else {
        floor.open_count += 1;
      }

      let apartment = floor.apartments.get(row.apartment_number);
      if (!apartment) {
        apartment = {
          apartment_number: row.apartment_number,
          order_numbers: new Set(),
          total_doors: 0,
          issue_count: 0,
          installed_count: 0,
          open_count: 0,
          cells: new Map(),
        };
        floor.apartments.set(row.apartment_number, apartment);
      }

      apartment.order_numbers.add(row.order_number);
      apartment.total_doors += 1;
      apartment.issue_count += row.issue_count;
      if (row.status === "INSTALLED") {
        apartment.installed_count += 1;
      } else {
        apartment.open_count += 1;
      }

      let cell = apartment.cells.get(row.location_code);
      if (!cell) {
        cell = {
          location_code: row.location_code,
          doors: [],
          issue_count: 0,
          statuses: {},
        };
        apartment.cells.set(row.location_code, cell);
      }
      cell.doors.push(row);
      cell.issue_count += row.issue_count;
      cell.statuses[row.status] = (cell.statuses[row.status] || 0) + 1;
    }

    return Array.from(houseMap.values())
      .sort((a, b) => compareNatural(a.house_number, b.house_number))
      .map<MatrixHouseGroup>((house) => ({
        house_number: house.house_number,
        total_doors: house.total_doors,
        apartments_count: house.apartments.size,
        issue_count: house.issue_count,
        installed_count: house.installed_count,
        open_count: house.open_count,
        floors: Array.from(house.floors.values())
          .sort((a, b) => compareNatural(a.floor_label, b.floor_label))
          .map<MatrixFloorGroup>((floor) => ({
            floor_label: floor.floor_label,
            location_codes: Array.from(floor.location_codes).sort(
              compareNatural,
            ),
            total_doors: floor.total_doors,
            issue_count: floor.issue_count,
            installed_count: floor.installed_count,
            open_count: floor.open_count,
            apartments: Array.from(floor.apartments.values())
              .sort((a, b) =>
                compareNatural(a.apartment_number, b.apartment_number),
              )
              .map<MatrixApartmentGroup>((apartment) => ({
                apartment_number: apartment.apartment_number,
                order_numbers: Array.from(apartment.order_numbers).sort(
                  compareNatural,
                ),
                total_doors: apartment.total_doors,
                issue_count: apartment.issue_count,
                installed_count: apartment.installed_count,
                open_count: apartment.open_count,
                cells: Array.from(apartment.cells.values())
                  .sort((a, b) =>
                    compareNatural(a.location_code, b.location_code),
                  )
                  .map<MatrixCell>((cell) => ({
                    location_code: cell.location_code,
                    door_count: cell.doors.length,
                    issue_count: cell.issue_count,
                    statuses: cell.statuses,
                    doors: [...cell.doors].sort((a, b) =>
                      compareNatural(a.unit_label, b.unit_label),
                    ),
                  })),
              })),
          })),
      }));
  }, [filteredMatrixRows]);

  const projectDetailFloors = useMemo(
    () =>
      projectDetailMatrix.flatMap((house) =>
        house.floors.map((floor) => ({
          ...floor,
          house_number: house.house_number,
        })),
      ),
    [projectDetailMatrix],
  );
  const projectDetailFloorPreview = useMemo(
    () => projectDetailFloors.slice(0, 4),
    [projectDetailFloors],
  );
  const projectDetailFloorPreviewOverflow = Math.max(
    projectDetailFloors.length - projectDetailFloorPreview.length,
    0,
  );

  const selectedProjectCode =
    projectDetails?.code || selectedProject?.code || selectedProjectId || "-";
  const projectDeadlineDays = daysUntilDate(projectDetails?.planned_end_date);
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
      const response = await apiFetch<{ items: ProjectListItem[] }>(
        "/api/v1/admin/projects",
      );
      const items = response.items || [];
      setProjects(items);
      setProjectsLoaded(true);
      const ids = new Set(items.map((x) => x.id));
      setBulkSelectedProjectIds((prev) => prev.filter((id) => ids.has(id)));
      if (deepLinkProjectId) {
        if (ids.has(deepLinkProjectId)) {
          setSelectedProjectId(deepLinkProjectId);
          setDeepLinkProjectMissing(false);
        } else {
          setSelectedProjectId(null);
          setDeepLinkProjectMissing(true);
        }
      } else {
        setDeepLinkProjectMissing(false);
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
    setLoadingLayout(true);
    setError(null);
    try {
      const response = await apiFetch<ProjectDoorsLayoutResponse>(
        `/api/v1/admin/projects/${projectId}/doors/layout`,
      );
      setLayout(response);
    } catch (e) {
      setLayout(null);
      setError(readableApiError(e, locale, t("projects.failedLoadLayout")));
    } finally {
      setLoadingLayout(false);
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
    if (!selectedLibraryProduct) {
      return;
    }
    setManualDoorForm((prev) => {
      if (prev.install_type.trim()) {
        return prev;
      }
      return {
        ...prev,
        install_type: selectedLibraryProduct.install_type || "",
      };
    });
  }, [selectedLibraryProduct]);

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
      setManualDoorForm({
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
      setManualDoorForm({
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
    setSelectedDoorIds([]);
    setFocusedDoorId(null);
    setFocusedDoorReasonId("");
    setFocusedDoorComment("");
    setFocusedDoorOverrideReason("");
    setBulkAssignInstallerId("");
    setMatrixIssueFilter("all");
    setMatrixInstaller("all");
  }, [selectedProjectId]);

  useEffect(() => {
    const available = new Set(matrixDoorIds);
    setSelectedDoorIds((prev) => prev.filter((id) => available.has(id)));
    setFocusedDoorId((prev) => (prev && available.has(prev) ? prev : null));
  }, [matrixDoorIds]);

  useEffect(() => {
    setFocusedDoorReasonId("");
    setFocusedDoorComment("");
    setFocusedDoorOverrideReason("");
  }, [focusedDoorId]);

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

  const toggleFailedRunSelection = (runId: string, checked: boolean) => {
    setSelectedFailedRunIds((prev) => {
      if (checked) {
        if (prev.includes(runId)) {
          return prev;
        }
        return [...prev, runId];
      }
      return prev.filter((id) => id !== runId);
    });
  };

  const toggleSelectAllFailedQueuePage = (checked: boolean) => {
    const pageIds = (failedQueue?.items || []).map((x) => x.run_id);
    if (checked) {
      setSelectedFailedRunIds((prev) => {
        const merged = new Set(prev);
        for (const id of pageIds) {
          merged.add(id);
        }
        return [...merged];
      });
      return;
    }
    setSelectedFailedRunIds((prev) =>
      prev.filter((id) => !pageIds.includes(id)),
    );
  };

  const retryFailedQueueRuns = async (runIds: string[]) => {
    if (!canManageProjectImports || runIds.length === 0) {
      return;
    }
    const batches = chunkIds(runIds, retryFailedBatchSize);
    let processed = 0;
    let successful = 0;
    let failed = 0;
    let skipped = 0;
    const allItems: RetryFailedRunsResponse["items"] = [];
    setRetryFailedSummary(null);
    setRetryFailedProgress({
      active: true,
      total: runIds.length,
      processed: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
    });
    setError(null);

    try {
      for (const batch of batches) {
        const response = await apiFetch<RetryFailedRunsResponse>(
          "/api/v1/admin/projects/import-runs/retry-failed",
          {
            method: "POST",
            body: JSON.stringify({ run_ids: batch }),
          },
        );
        processed += batch.length;
        successful += response.successful_runs;
        failed += response.failed_runs;
        skipped += response.skipped_runs;
        allItems.push(...(response.items || []));
        setRetryFailedProgress({
          active: true,
          total: runIds.length,
          processed,
          successful,
          failed,
          skipped,
        });
      }

      setRetryFailedSummary({
        items: allItems,
        total_runs: runIds.length,
        successful_runs: successful,
        failed_runs: failed,
        skipped_runs: skipped,
      });
      setSelectedFailedRunIds([]);
      await loadFailedQueue();
      if (selectedProjectId) {
        await loadProjectDetails(selectedProjectId);
        await loadLayout(selectedProjectId);
        await loadProjectPlanFact(selectedProjectId);
        await loadProjectRisk(selectedProjectId);
        await loadImportHistory(selectedProjectId);
      }
    } catch (e) {
      setError(readableApiError(e, locale, t("projects.failedRetryQueueRuns")));
    } finally {
      setRetryFailedProgress((prev) =>
        prev
          ? {
              ...prev,
              active: false,
            }
          : null,
      );
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

  const toggleDoorSelection = (doorId: string) => {
    if (!canManageProjects) return;
    setSelectedDoorIds((prev) =>
      prev.includes(doorId)
        ? prev.filter((id) => id !== doorId)
        : [...prev, doorId],
    );
  };

  const toggleFilteredDoorSelection = () => {
    if (!canManageProjects) return;
    if (filteredDoorIds.length === 0) {
      return;
    }
    const visible = new Set(filteredDoorIds);
    if (allFilteredDoorsSelected) {
      setSelectedDoorIds((prev) => prev.filter((id) => !visible.has(id)));
      return;
    }
    setSelectedDoorIds((prev) =>
      Array.from(new Set([...prev, ...filteredDoorIds])),
    );
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

  const openManualDoorDialog = () => {
    if (!canManageProjects || !libraryReference.ready) return;
    const nextForm = emptyManualDoorForm();
    setManualDoorForm(nextForm);
    setProjectFlowNotice(null);
    setProjectActionHint(null);
    setError(null);
    setManualDoorDialogOpen(true);
  };

  const handleManualDoorSubmit = async () => {
    if (!canManageProjects || !libraryReference.ready ||
      (manualDoorForm.assigned_installer_id && !installersReference.ready)) return;
    if (!selectedProjectId) {
      return;
    }
    const normalizedDoorCode = manualDoorForm.door_code.trim();
    if (
      !manualDoorForm.product_id ||
      !normalizedDoorCode ||
      !manualDoorForm.unit.trim()
    ) {
      setError(
        copy(
          "Choose a product and fill door code + unit before saving.",
          "Выберите продукт и введите код двери + блок перед сохранением.",
          "בחרו מוצר ומלאו קוד דלת + יחידה לפני השמירה.",
        ),
      );
      return;
    }
    if (existingDoorMarkings.has(normalizedDoorCode.toLowerCase())) {
      setError(
        copy(
          `Door code ${normalizedDoorCode} already exists in this project. Review the matrix before creating another door.`,
          `Код двери ${normalizedDoorCode} уже есть в этом проекте. Проверьте матрицу перед созданием новой двери.`,
          `קוד הדלת ${normalizedDoorCode} כבר קיים בפרויקט הזה. בדוק את המטריצה לפני יצירת דלת נוספת.`,
        ),
      );
      setMatrixMarkingSearch(normalizedDoorCode);
      return;
    }

    setManualDoorSubmitting(true);
    setError(null);
    try {
      await apiFetch(`/api/v1/admin/projects/${selectedProjectId}/doors`, {
        method: "POST",
        body: JSON.stringify({
          ...manualDoorForm,
          door_code: normalizedDoorCode,
          unit: manualDoorForm.unit.trim(),
          floor: manualDoorForm.floor.trim() || null,
          location_code: manualDoorForm.location_code.trim() || null,
          order_number: manualDoorForm.order_number.trim() || null,
          install_type:
            manualDoorForm.install_type.trim() ||
            selectedLibraryProduct?.install_type ||
            null,
          assigned_installer_id: manualDoorForm.assigned_installer_id || null,
          planned_install_date: manualDoorForm.planned_install_date || null,
        }),
      });
      setManualDoorDialogOpen(false);
      setManualDoorForm(emptyManualDoorForm());
      await loadProjectDetails(selectedProjectId);
      await loadLayout(selectedProjectId);
      await loadProjectPlanFact(selectedProjectId);
      await loadProjectRisk(selectedProjectId);
      setMatrixApartmentSearch("");
      setMatrixMarkingSearch(normalizedDoorCode);
      if (typeof document !== "undefined") {
        window.setTimeout(() => {
          document.getElementById("project-door-matrix")?.scrollIntoView?.({
            behavior: "smooth",
            block: "start",
          });
        }, 0);
      }
      setProjectFlowNotice(
        copy(
          `Door ${normalizedDoorCode} was added. The project matrix is now filtered to that door.`,
          `Дверь ${normalizedDoorCode} добавлена. Матрица проекта уже отфильтрована по этой двери.`,
          `הדלת ${normalizedDoorCode} נוספה. מטריצת הפרויקט כבר מסוננת לדלת הזו.`,
        ),
      );
    } catch (e) {
      setError(
        readableApiError(
          e,
          locale,
          copy(
            "Failed to create door.",
            "Не удалось создать дверь.",
            "יצירת הדלת נכשלה.",
          ),
        ),
      );
    } finally {
      setManualDoorSubmitting(false);
    }
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
                    onClick={() => {
                      void handleBulkReconcile();
                    }}
                    disabled={
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
                          label={tokenLabel(project.lifecycle_status || project.status)}
                          domain="project"
                        />
                        {project.health_status &&
                        project.health_status !== "NORMAL" ? (
                          <StatusBadge
                            status={project.health_status}
                            label={tokenLabel(project.health_status)}
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
                            )}
                            domain="project"
                          />
                          {selectedProject.health_status &&
                          selectedProject.health_status !== "NORMAL" ? (
                            <StatusBadge
                              status={selectedProject.health_status}
                              label={tokenLabel(selectedProject.health_status)}
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

                  <div className="grid grid-cols-1 gap-2.5 border-t border-border-subtle bg-surface-subtle p-3 sm:grid-cols-2 xl:grid-cols-5">
                    <DimaxKpiCard
                      label={copy(
                        "Doors installed",
                        "Дверей установлено",
                        "דלתות הותקנו",
                      )}
                      value={
                        <LtrText as="span">
                          {projectInstalledDoors} / {projectTotalDoors || "-"}
                        </LtrText>
                      }
                      hint={<LtrText as="span">{formatPct(projectCompletionPct)}</LtrText>}
                      barColor="green"
                    />
                    <DimaxKpiCard
                      label={copy(
                        "Days remaining",
                        "Дней осталось",
                        "ימים נותרו",
                      )}
                      value={
                        projectDeadlineDays === null
                          ? "-"
                          : Math.max(projectDeadlineDays, 0)
                      }
                      hint={projectDeadlineHint}
                      barColor={
                        projectDeadlineDays !== null && projectDeadlineDays < 0
                          ? "red"
                          : "blue"
                      }
                      emphasis={
                        projectDeadlineDays !== null && projectDeadlineDays < 0
                          ? "problem"
                          : "default"
                      }
                    />
                    <DimaxKpiCard
                      label={copy(
                        "Open issues",
                        "Открытые проблемы",
                        "בעיות פתוחות",
                      )}
                      value={projectOpenIssues}
                      hint={
                        projectBlockedIssues > 0
                          ? copy(
                              `${projectBlockedIssues} blocked`,
                              `${projectBlockedIssues} заблокировано`,
                              `${projectBlockedIssues} חסומות`,
                            )
                          : copy("no blocked issues", "нет блокеров", "אין חסימות")
                      }
                      barColor={projectOpenIssues > 0 ? "orange" : "green"}
                      emphasis={
                        projectBlockedIssues > 0 ? "problem" : "default"
                      }
                    />
                    <DimaxKpiCard
                      label={copy("Revenue", "Выручка", "הכנסות")}
                      value={
                        canViewProjectRates && projectPlanFact
                          ? formatMoney(projectPlanFact.actual_revenue_total)
                          : "-"
                      }
                      hint={
                        canViewProjectRates && projectPlanFact
                          ? `${copy("plan", "план", "תכנון")} ${formatMoney(
                              projectPlanFact.planned_revenue_total,
                            )}`
                          : commercialAccessRestrictedTitle
                      }
                      barColor="yellow"
                    />
                    <DimaxKpiCard
                      label={copy("Margin", "Маржа", "מרווח")}
                      value={
                        canViewProjectRates && projectRisk
                          ? formatPct(projectRisk.summary.actual_margin_pct)
                          : "-"
                      }
                      hint={
                        canViewProjectRates && projectRisk
                          ? `${copy("profit", "прибыль", "רווח")} ${formatMoney(
                              projectRisk.summary.actual_profit_total,
                            )}`
                          : commercialAccessRestrictedTitle
                      }
                      barColor="green"
                    />
                  </div>
                </div>

                <div
                  className="grid grid-cols-1 items-start gap-3 xl:grid-cols-[minmax(0,1fr)_320px]"
                  data-testid="project-detail-v28-command"
                >
                  <section className={projectsPanelClass("overflow-hidden")}>
                    <div data-testid="project-detail-v28-door-workspace">
                      <div className="flex gap-0.5 overflow-x-auto border-b border-border bg-surface px-3 pt-1">
                        {[
                          {
                            key: "overview",
                            label: copy("Overview", "Обзор", "סקירה"),
                            count: null,
                            active: false,
                            danger: false,
                            onClick: () =>
                              scrollToProjectSection("project-detail-v2-header"),
                          },
                          {
                            key: "doors",
                            label: copy("Doors", "Двери", "דלתות"),
                            count: projectDoorTotals.totalDoors,
                            active: matrixIssueFilter === "all",
                            danger: false,
                            onClick: () => setMatrixIssueFilter("all"),
                          },
                          {
                            key: "issues",
                            label: copy("Issues", "Проблемы", "בעיות"),
                            count: projectDoorTotals.issueCount,
                            active: matrixIssueFilter === "issues",
                            danger: projectDoorTotals.issueCount > 0,
                            onClick: () => setMatrixIssueFilter("issues"),
                          },
                          {
                            key: "addons",
                            label: copy("Add-ons", "Доп. работы", "תוספות"),
                            count: projectAddonPlan.length,
                            active: false,
                            danger: false,
                            onClick: () =>
                              scrollToProjectSection(
                                canViewProjectRates
                                  ? "project-additional-works"
                                  : "project-commercial-restricted",
                              ),
                          },
                          {
                            key: "documents",
                            label: copy("Documents", "Документы", "מסמכים"),
                            count: projectDocuments.length,
                            active: false,
                            danger: false,
                            onClick: () =>
                              scrollToProjectSection("project-documents"),
                          },
                          {
                            key: "activity",
                            label: copy("Import history", "История импорта", "היסטוריית ייבוא"),
                            count: importHistory.length,
                            active: false,
                            danger: false,
                            onClick: () =>
                              scrollToProjectSection("project-import-history"),
                          },
                        ].map((item) => (
                          <button
                            key={item.key}
                            type="button"
                            aria-pressed={item.active}
                            data-testid={`project-detail-top-tab-${item.key}`}
                            onClick={item.onClick}
                            className={cn(
                              "inline-flex shrink-0 items-center gap-1.5 border-b-2 border-transparent px-3.5 py-2.5 text-[12.5px] font-medium text-text-secondary transition-colors hover:text-text",
                              item.active && "border-text text-text",
                            )}
                          >
                            <span>{item.label}</span>
                            {typeof item.count === "number" ? (
                              <span
                                className={cn(
                                  "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-surface-sunken px-1.5 text-[10.5px] font-medium leading-none text-text-secondary tabular-nums",
                                  item.danger &&
                                    "bg-status-problem-bg text-status-problem-fg",
                                  item.active && "bg-text text-text-inverse",
                                  item.active &&
                                    item.danger &&
                                    "bg-status-problem-fg text-white",
                                )}
                              >
                                {item.count}
                              </span>
                            ) : null}
                          </button>
                        ))}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 border-b border-border-subtle bg-surface-subtle px-4 py-3">
                        <div className="relative min-w-[220px] flex-1">
                          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
                          <input
                            value={matrixMarkingSearch}
                            aria-label={copy("Search doors", "Поиск дверей", "חיפוש דלתות")}
                            onChange={(event) =>
                              setMatrixMarkingSearch(event.target.value)
                            }
                            placeholder={copy(
                              "Search door, unit, marking...",
                              "Поиск двери, квартиры, маркировки...",
                              "חיפוש דלת, דירה או סימון...",
                            )}
                            className="h-9 w-full rounded-full border border-border bg-surface ps-9 pe-3 text-[12.5px] text-text placeholder:text-text-tertiary focus:border-border-strong focus:outline-none"
                          />
                        </div>
                        <select
                          value={matrixFloor}
                          onChange={(event) =>
                            setMatrixFloor(event.target.value)
                          }
                          aria-label={t("projects.allFloors")}
                          className="h-9 rounded-full border border-status-progress-border bg-status-progress-bg px-3 text-[11.5px] font-medium text-status-progress-fg focus:outline-none"
                        >
                          <option value="all">
                            {copy("floor: all", "этаж: все", "קומה: הכל")}
                          </option>
                          {matrixFloorOptions.map((value) => (
                            <option key={value} value={value}>
                              {copy("floor", "этаж", "קומה")}: {value}
                            </option>
                          ))}
                        </select>
                        <select
                          value={matrixStatus}
                          onChange={(event) =>
                            setMatrixStatus(event.target.value)
                          }
                          aria-label={t("projects.allStatuses")}
                          className="h-9 rounded-full border border-status-progress-border bg-status-progress-bg px-3 text-[11.5px] font-medium text-status-progress-fg focus:outline-none"
                        >
                          <option value="all">
                            {copy("status: all", "статус: все", "סטטוס: הכל")}
                          </option>
                          {matrixStatusOptions.map((value) => (
                            <option key={value} value={value}>
                              {tokenLabel(value)}
                            </option>
                          ))}
                        </select>
                        <div className="min-w-0 max-w-full">{matrixInstallerFilterControl}</div>
                        <Button type="button" variant="outline" size="sm" onClick={resetMatrixFilters}>
                          <FilterX className="h-3.5 w-3.5" aria-hidden="true" />
                          {copy("Reset filters", "Сбросить фильтры", "איפוס מסננים")}
                        </Button>
                        <div className="inline-flex h-9 items-center rounded-full border border-border bg-surface p-0.5">
                          <button
                            type="button"
                            onClick={() => scrollToProjectSection("project-door-matrix")}
                            className="h-7 rounded-full bg-text px-3 text-[11.5px] font-medium text-text-inverse"
                          >
                            {copy("Matrix", "Матрица", "מטריצה")}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              scrollToProjectSection("project-door-ledger")
                            }
                            className="h-7 rounded-full px-3 text-[11.5px] font-medium text-text-secondary hover:text-text"
                          >
                            {copy("Table", "Таблица", "טבלה")}
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-2 border-b border-border-subtle bg-surface-subtle px-4 py-2 text-[10.5px] text-text-secondary">
                        {[
                          {
                            label: t("installerProject.installed"),
                            value: matrixLegendCounts.installed,
                            swatch: "border-status-ok-border bg-status-ok-bg",
                          },
                          {
                            label: copy("In progress", "В работе", "בתהליך"),
                            value: matrixLegendCounts.inProgress,
                            swatch:
                              "border-status-progress-border bg-status-progress-bg",
                          },
                          {
                            label: copy("Issues", "Проблемы", "בעיות"),
                            value: matrixLegendCounts.issues,
                            swatch:
                              "border-status-problem-border bg-status-problem-bg",
                          },
                          {
                            label: copy(
                              "Not installed",
                              "Не установлено",
                              "לא הותקן",
                            ),
                            value: matrixLegendCounts.notInstalled,
                            swatch:
                              "border-status-warning-border bg-status-warning-bg",
                          },
                          {
                            label: copy("Locked", "Заблокировано", "נעול"),
                            value: matrixLegendCounts.locked,
                            swatch:
                              "border-status-blocked-border bg-status-blocked-bg",
                          },
                          {
                            label: copy("Cancelled", "Отменено", "בוטל"),
                            value: matrixLegendCounts.cancelled,
                            swatch:
                              "border-status-archived-border bg-status-archived-bg",
                          },
                        ].map((item) => (
                          <span
                            key={item.label}
                            className="inline-flex items-center gap-1.5 font-medium"
                          >
                            <span
                              className={cn(
                                "h-2.5 w-2.5 rounded-[3px] border",
                                item.swatch,
                              )}
                              aria-hidden="true"
                            />
                            <span>{item.label}</span>
                            <LtrText as="span" className="font-normal">
                              {item.value}
                            </LtrText>
                          </span>
                        ))}
                      </div>

                      {focusedDoorRow ? (
                        <div
                          className="flex flex-col gap-3 border-b border-border-subtle bg-surface px-4 py-3 lg:flex-row lg:items-center lg:justify-between"
                          data-testid="project-detail-v28-focused-door"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <LtrText
                                as="span"
                                className="text-[14px] font-semibold text-text"
                              >
                                {focusedDoorRow.door_marking}
                              </LtrText>
                              <StatusBadge
                                status={focusedDoorRow.status}
                                label={tokenLabel(focusedDoorRow.status)}
                                domain="door"
                              />
                              {focusedDoorRow.issue_count > 0 ? (
                                <span className="rounded-full border border-status-problem-border bg-status-problem-bg px-2 py-0.5 text-[10.5px] font-medium text-status-problem-fg">
                                  {focusedDoorRow.issue_count}{" "}
                                  {copy("issues", "проблем", "בעיות")}
                                </span>
                              ) : null}
                            </div>
                            <div className="mt-1 truncate text-[11.5px] text-text-secondary">
                              <LtrText as="span">
                                {focusedDoorRow.unit_label}
                              </LtrText>{" "}
                              - {focusedDoorRow.door_type_label} -{" "}
                              {locationLabel(focusedDoorRow.location_code)}
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                toggleDoorSelection(focusedDoorRow.door_id)
                              }
                              disabled={!canManageProjects}
                              className="dmx-secondary-action"
                            >
                              {selectedDoorIdSet.has(focusedDoorRow.door_id)
                                ? copy("Unselect", "Убрать выбор", "בטל בחירה")
                                : copy("Select", "Выбрать", "בחר")}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                scrollToProjectSection("project-door-matrix")
                              }
                              className="dmx-secondary-action"
                            >
                              {copy("Open card", "Открыть карточку", "פתח כרטיס")}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                void handleFocusedDoorMarkInstalled()
                              }
                              disabled={
                                !canManageProjects ||
                                doorStatusAction !== null ||
                                focusedDoorRow.status === "INSTALLED"
                              }
                              className="dmx-primary-action disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {copy(
                                "Mark installed",
                                "Отметить установлено",
                                "סמן כהותקן",
                              )}
                            </button>
                          </div>
                        </div>
                      ) : null}

                      {filteredMatrixRows.length === 0 ? (
                        <div className="px-4 py-8 text-[13px] text-text-secondary">
                          {t("projects.noDoorsForFilters")}
                        </div>
                      ) : (
                        <div className="space-y-2 bg-surface-subtle px-3 py-3">
                          {projectDetailFloorPreview.map((floor) => {
                            const safeProgressPct = matrixCompletionPct(
                              floor.installed_count,
                              floor.total_doors,
                            );
                            const floorDoors = floor.apartments.flatMap(
                              (apartment) =>
                                apartment.cells.flatMap((cell) => cell.doors),
                            );
                            return (
                              <section
                                key={`${floor.house_number}-${floor.floor_label}-top`}
                                data-testid={`project-detail-v28-floor-row-${floor.house_number}-${floor.floor_label}`}
                                className={cn(
                                  "relative overflow-hidden rounded-lg border bg-surface",
                                  floor.issue_count > 0
                                    ? "border-status-problem-border"
                                    : "border-border",
                                )}
                              >
                                <span
                                  className={cn(
                                    "absolute inset-y-0 start-0 w-1",
                                    matrixProgressTone(
                                      floor.issue_count,
                                      safeProgressPct,
                                    ),
                                  )}
                                  aria-hidden="true"
                                />
                                <div className="grid gap-3 border-b border-border-subtle bg-surface pe-4 ps-5 py-3 md:grid-cols-[minmax(0,1fr)_178px] md:items-center">
                                  <div className="min-w-0">
                                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                                      <span
                                        className={cn(
                                          "inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-[12px] font-semibold tabular-nums",
                                          floor.issue_count > 0
                                            ? "bg-status-problem-bg text-status-problem-fg"
                                            : "bg-[var(--dmx-accent-tint)] text-text",
                                        )}
                                      >
                                        <LtrText as="span">
                                          {floor.floor_label}
                                        </LtrText>
                                      </span>
                                      <h3 className="min-w-0 truncate text-[13px] font-semibold text-text">
                                        {copy("Floor", "Этаж", "קומה")}{" "}
                                        <LtrText as="span">
                                          {floor.floor_label}
                                        </LtrText>
                                      </h3>
                                      <span className="inline-flex min-h-6 items-center rounded-full border border-border bg-surface-subtle px-2.5 text-[10.5px] font-medium text-text-secondary">
                                        {copy("House", "Корпус", "בניין")}{" "}
                                        <LtrText as="span">
                                          {floor.house_number}
                                        </LtrText>
                                      </span>
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                      <span className="inline-flex min-h-6 items-center rounded-full bg-surface-sunken px-2.5 text-[10.5px] font-medium text-text-secondary">
                                        {floor.total_doors}{" "}
                                        {copy("doors", "дверей", "דלתות")}
                                      </span>
                                      <span className="inline-flex min-h-6 items-center rounded-full bg-status-ok-bg px-2.5 text-[10.5px] font-medium text-status-ok-fg">
                                        {copy(
                                          "installed",
                                          "установлено",
                                          "הותקנו",
                                        )}{" "}
                                        {floor.installed_count}
                                      </span>
                                      <span className="inline-flex min-h-6 items-center rounded-full bg-status-warning-bg px-2.5 text-[10.5px] font-medium text-status-warning-fg">
                                        {copy("open", "открыто", "פתוח")}{" "}
                                        {floor.open_count}
                                      </span>
                                      {floor.issue_count > 0 ? (
                                        <span className="inline-flex min-h-6 items-center rounded-full bg-status-problem-bg px-2.5 text-[10.5px] font-medium text-status-problem-fg">
                                          {floor.issue_count}{" "}
                                          {copy("issues", "проблем", "בעיות")}
                                        </span>
                                      ) : (
                                        <span className="inline-flex min-h-6 items-center rounded-full border border-border bg-surface px-2.5 text-[10.5px] font-medium text-text-secondary">
                                          {copy(
                                            "all clear",
                                            "без проблем",
                                            "תקין",
                                          )}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="min-w-[150px]">
                                    <div className="mb-1 flex items-center justify-between gap-2 text-[10.5px] font-medium text-text-secondary">
                                      <span>
                                        {copy("Progress", "Прогресс", "התקדמות")}
                                      </span>
                                      <LtrText as="span">
                                        {floor.installed_count}/{floor.total_doors} ·{" "}
                                        {safeProgressPct}%
                                      </LtrText>
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-surface-sunken">
                                      <span
                                        className={cn(
                                          "block h-full rounded-full",
                                          matrixProgressTone(
                                            floor.issue_count,
                                            safeProgressPct,
                                          ),
                                        )}
                                        style={{ width: `${safeProgressPct}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>
                                <div className="pe-4 ps-5 py-3">
                                  <div className="grid grid-cols-[repeat(auto-fill,minmax(144px,1fr))] gap-2">
                                    {floorDoors.map((door) => (
                                      <DoorMatrixTile
                                        key={`${floor.house_number}-${floor.floor_label}-${door.door_id}-top`}
                                        marking={matrixDoorTileLabel(door)}
                                        context={door.unit_label}
                                        status={tokenLabel(door.status)}
                                        tone={matrixDoorTileTone(door)}
                                        focused={focusedDoorId === door.door_id}
                                        selected={selectedDoorIdSet.has(door.door_id)}
                                        hasIssues={door.issue_count > 0}
                                        inspectLabel={`${door.door_marking} - ${tokenLabel(door.status)}`}
                                        testId={`project-detail-v28-door-tile-${door.door_id}`}
                                        onInspect={() => setFocusedDoorId(door.door_id)}
                                        onToggleSelection={() => toggleDoorSelection(door.door_id)}
                                      />
                                    ))}
                                  </div>
                                </div>
                              </section>
                            );
                          })}
                          {projectDetailFloorPreviewOverflow > 0 ? (
                            <button
                              type="button"
                              onClick={() =>
                                scrollToProjectSection("project-door-matrix")
                              }
                              className="flex w-full items-center justify-between gap-3 rounded-lg border border-dashed border-border bg-surface px-4 py-3 text-start text-[12px] font-medium text-text hover:bg-surface-subtle"
                            >
                              <span>
                                +{projectDetailFloorPreviewOverflow}{" "}
                                {copy(
                                  "more floors in full matrix",
                                  "этажей в полной матрице",
                                  "קומות נוספות במטריצה המלאה",
                                )}
                              </span>
                              <span className="rounded-full bg-[var(--dmx-accent-tint)] px-2.5 py-1 text-[10.5px] text-text">
                                {copy("Open", "Открыть", "פתח")}
                              </span>
                            </button>
                          ) : null}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2 border-t border-border-subtle bg-[var(--dmx-accent-tint)] px-4 py-3">
                        {selectedDoorIds.length > 0 ? (
                          <>
                            <span className="inline-flex min-h-7 items-center rounded-full bg-accent px-3 text-[11px] font-semibold text-text">
                              {selectedDoorIds.length}{" "}
                              {copy(
                                "doors selected",
                                "дверей выбрано",
                                "דלתות נבחרו",
                              )}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                scrollToProjectSection("project-door-matrix")
                              }
                              className="rounded-full border border-border bg-surface px-3 py-1.5 text-[11.5px] font-medium text-text hover:bg-surface-subtle"
                            >
                              {copy(
                                "Assign / edit",
                                "Назначить / изменить",
                                "שייך / ערוך",
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedDoorIds([])}
                              className="ms-auto flex h-7 w-7 items-center justify-center rounded-full text-[18px] text-text-secondary hover:bg-surface hover:text-text"
                              aria-label={copy(
                                "Clear selected doors",
                                "Очистить выбранные двери",
                                "נקה דלתות שנבחרו",
                              )}
                            >
                              ×
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="text-[12px] font-medium text-text">
                              {copy(
                                "Live door matrix",
                                "Живая матрица дверей",
                                "מטריצת דלתות חיה",
                              )}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                scrollToProjectSection("project-door-matrix")
                              }
                              className="ms-auto rounded-full border border-border bg-surface px-3 py-1.5 text-[11.5px] font-medium text-text hover:bg-surface-subtle"
                            >
                              {copy(
                                "Open full matrix",
                                "Открыть полную матрицу",
                                "פתח מטריצה מלאה",
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <details className="border-t border-border-subtle bg-surface">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-[12px] font-semibold text-text hover:bg-surface-subtle">
                        <span>
                          {copy(
                            "Operational summary",
                            "Операционная сводка",
                            "סיכום תפעולי",
                          )}
                        </span>
                        <span className="rounded-full border border-border bg-surface-subtle px-2.5 py-1 text-[10.5px] font-medium text-text-secondary">
                          {projectInstalledDoors}/{projectTotalDoors || 0}{" "}
                          {copy("doors", "дверей", "דלתות")}
                        </span>
                      </summary>
                    <div className="border-b border-border-subtle bg-surface px-4 py-3">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className={projectsMetricLabelClass}>
                            {copy(
                              "Object execution",
                              "Ход работ по объекту",
                              "ביצוע באתר",
                            )}
                          </div>
                          <h3 className="mt-1 text-[15px] font-semibold text-text">
                            {copy(
                              "Door installation control",
                              "Контроль монтажа дверей",
                              "בקרת התקנת דלתות",
                            )}
                          </h3>
                          <p className="mt-1 max-w-3xl text-[12px] leading-5 text-text-secondary">
                            {copy(
                              "A short dispatcher view: installed, assigned, open issues and the next working sections for this project.",
                              "Короткий диспетчерский срез: что установлено, что назначено, где проблемы и куда переходить дальше по объекту.",
                              "תמונת מצב קצרה: מה הותקן, מה שובץ, איפה יש בעיות ולאן ממשיכים בפרויקט.",
                            )}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <PillButton
                            variant="accent"
                            size="sm"
                            data-testid="project-detail-v28-open-doors"
                            onClick={() => {
                              setMatrixIssueFilter("all");
                              scrollToProjectSection("project-door-matrix");
                            }}
                          >
                            {copy("Open doors", "Открыть двери", "פתח דלתות")}
                          </PillButton>
                          <PillButton
                            variant={
                              projectOpenIssues > 0 ? "destructive" : "secondary"
                            }
                            size="sm"
                            data-testid="project-detail-v28-open-issues"
                            onClick={() => {
                              setMatrixIssueFilter("issues");
                              scrollToProjectSection("project-door-matrix");
                            }}
                          >
                            {copy("Problems", "Проблемы", "בעיות")}
                          </PillButton>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 p-4">
                      <div className="rounded-lg border border-border bg-surface-subtle px-4 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className={projectsMetricLabelClass}>
                              {copy("Progress", "Прогресс", "התקדמות")}
                            </div>
                            <div className="mt-1 flex items-baseline gap-2">
                              <LtrText
                                as="span"
                                className="text-[22px] font-medium leading-none text-text"
                              >
                                {projectInstalledDoors}/{projectTotalDoors || 0}
                              </LtrText>
                              <span className="text-[12px] font-medium text-text-secondary">
                                {formatPct(projectCompletionPct)}
                              </span>
                            </div>
                          </div>
                          <div className="min-w-[220px] flex-1">
                            <div className="h-2 overflow-hidden rounded-full bg-surface-sunken">
                              <span
                                className={cn(
                                  "block h-full rounded-full",
                                  projectOpenIssues > 0
                                    ? "bg-kpi-orange"
                                    : "bg-kpi-green",
                                )}
                                style={{
                                  width: `${Math.min(
                                    Math.max(projectCompletionPct, 0),
                                    100,
                                  )}%`,
                                }}
                              />
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-text-secondary">
                              <span className="rounded-full border border-border bg-surface px-2.5 py-1">
                                {copy("Assigned", "Назначено", "שובץ")}:{" "}
                                {projectDoorTotals.assignedCount}
                              </span>
                              <span className="rounded-full border border-border bg-surface px-2.5 py-1">
                                {copy("Unassigned", "Без назначения", "לא שובץ")}:{" "}
                                {projectUnassignedDoors}
                              </span>
                              <span className="rounded-full border border-border bg-surface px-2.5 py-1">
                                {copy("Open", "Осталось", "פתוח")}:{" "}
                                {projectDoorTotals.openCount}
                              </span>
                              <span
                                className={cn(
                                  "rounded-full border px-2.5 py-1",
                                  projectOpenIssues > 0
                                    ? "border-status-problem-border bg-status-problem-bg text-status-problem-fg"
                                    : "border-status-ok-border bg-status-ok-bg text-status-ok-fg",
                                )}
                              >
                                {copy("Issues", "Проблемы", "בעיות")}:{" "}
                                {projectOpenIssues}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <div className="rounded-lg border border-border bg-surface px-3 py-3">
                          <div className={projectsMetricLabelClass}>
                            {copy("Status mix", "Статусы дверей", "סטטוס דלתות")}
                          </div>
                          <div className="mt-2 space-y-2 text-[12px] text-text-secondary">
                            {[
                              {
                                label: copy(
                                  "Installed",
                                  "Установлено",
                                  "הותקן",
                                ),
                                value: matrixLegendCounts.installed,
                                tone: "bg-kpi-green",
                              },
                              {
                                label: copy("In work", "В работе", "בעבודה"),
                                value: matrixLegendCounts.inProgress,
                                tone: "bg-kpi-blue",
                              },
                              {
                                label: copy(
                                  "Not installed",
                                  "Не установлено",
                                  "לא הותקן",
                                ),
                                value: matrixLegendCounts.notInstalled,
                                tone: "bg-kpi-yellow",
                              },
                            ].map((item) => (
                              <div
                                key={item.label}
                                className="flex items-center justify-between gap-3"
                              >
                                <span className="inline-flex min-w-0 items-center gap-2">
                                  <span
                                    className={cn(
                                      "h-2.5 w-2.5 shrink-0 rounded-[3px]",
                                      item.tone,
                                    )}
                                    aria-hidden="true"
                                  />
                                  <span className="truncate">{item.label}</span>
                                </span>
                                <LtrText className="font-medium text-text">
                                  {item.value}
                                </LtrText>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-lg border border-border bg-surface px-3 py-3">
                          <div className={projectsMetricLabelClass}>
                            {copy("Critical view", "Критический срез", "מבט קריטי")}
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                              <div className="text-[10.5px] text-text-secondary">
                                {copy("Locked", "Заблокировано", "נעול")}
                              </div>
                              <div className="mt-1 text-[16px] font-medium text-text tabular-nums">
                                {matrixLegendCounts.locked}
                              </div>
                            </div>
                            <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                              <div className="text-[10.5px] text-text-secondary">
                                {copy("Cancelled", "Отменено", "בוטל")}
                              </div>
                              <div className="mt-1 text-[16px] font-medium text-text tabular-nums">
                                {matrixLegendCounts.cancelled}
                              </div>
                            </div>
                            <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                              <div className="text-[10.5px] text-text-secondary">
                                {copy("Documents", "Документы", "מסמכים")}
                              </div>
                              <div className="mt-1 text-[16px] font-medium text-text tabular-nums">
                                {loadingProjectDocuments
                                  ? "-"
                                  : projectDocuments.length}
                              </div>
                            </div>
                            <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                              <div className="text-[10.5px] text-text-secondary">
                                {copy("Imports", "Импорты", "יבוא")}
                              </div>
                              <div className="mt-1 text-[16px] font-medium text-text tabular-nums">
                                {loadingImportHistory ? "-" : importHistory.length}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-lg border border-border bg-surface px-3 py-3">
                          <div className={projectsMetricLabelClass}>
                            {copy("Next sections", "Следующие разделы", "המשך")}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => scrollToProjectSection("project-documents")}
                              className="rounded-full border border-border bg-surface-subtle px-3 py-1.5 text-[11.5px] font-medium text-text hover:bg-surface"
                            >
                              {copy("Documents", "Документы", "מסמכים")}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                scrollToProjectSection(
                                  projectFinancialReady
                                    ? "project-financial-screen"
                                    : "project-commercial-restricted",
                                )
                              }
                              className="rounded-full border border-border bg-surface-subtle px-3 py-1.5 text-[11.5px] font-medium text-text hover:bg-surface"
                            >
                              {copy("Finance", "Финансы", "כספים")}
                            </button>
                            <button
                              type="button"
                              onClick={() => scrollToProjectSection("project-import-history")}
                              className="rounded-full border border-border bg-surface-subtle px-3 py-1.5 text-[11.5px] font-medium text-text hover:bg-surface"
                            >
                              {copy("Activity", "Активность", "פעילות")}
                            </button>
                            {selectedProjectId ? (
                              <button
                                type="button"
                                onClick={() =>
                                  router.push(
                                    `/reports?project_id=${encodeURIComponent(
                                      selectedProjectId,
                                    )}`,
                                  )
                                }
                                className="rounded-full border border-border-strong bg-surface px-3 py-1.5 text-[11.5px] font-medium text-text hover:bg-surface-subtle"
                              >
                                {copy("Report", "Отчёт", "דוח")}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                    </details>
                  </section>

                  <ProjectSideWidgets
                    canViewRates={canViewProjectRates}
                    restrictedTitle={commercialAccessRestrictedTitle}
                    formatMoney={formatMoney}
                    details={projectDetails}
                    financialReady={projectFinancialReady}
                    openIssues={projectOpenIssues}
                    planFact={projectPlanFact}
                    risk={projectRisk}
                    importHistory={importHistory}
                    assignedInstallers={projectAssignedInstallerSummary}
                    scrollToSection={scrollToProjectSection}
                    tokenLabel={tokenLabel}
                    onMatrixIssueFilterChange={setMatrixIssueFilter}
                  />
                </div>

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

                <WidgetCard
                  title={tt("projects.failedImportsQueue")}
                  headerMeta={
                    <>
                      {t("projects.selectedLabel")}:{" "}
                      {selectedFailedRunIds.length}
                    </>
                  }
                >

                  <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto] gap-2 mb-3">
                    <label className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={failedQueueOnlySelectedProject}
                        onChange={(e) => {
                          setFailedQueueOnlySelectedProject(e.target.checked);
                          setFailedQueueOffset(0);
                        }}
                      />
                      {t("projects.onlySelectedProject")}
                    </label>
                    <select
                      aria-label={t("projects.batch").replace(
                        "{count}",
                        String(retryFailedBatchSize),
                      )}
                      value={String(retryFailedBatchSize)}
                      onChange={(e) =>
                        setRetryFailedBatchSize(Number(e.target.value))
                      }
                      className="control-input h-8 text-[12px]"
                    >
                      <option value="5">
                        {t("projects.batch").replace("{count}", "5")}
                      </option>
                      <option value="10">
                        {t("projects.batch").replace("{count}", "10")}
                      </option>
                      <option value="20">
                        {t("projects.batch").replace("{count}", "20")}
                      </option>
                    </select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        void loadFailedQueue();
                      }}
                    >
                      {tt("projects.refreshQueue")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        void retryFailedQueueRuns(selectedFailedRunIds);
                      }}
                      disabled={
                        !!retryFailedProgress?.active ||
                        selectedFailedRunIds.length === 0
                      }
                    >
                      {retryFailedProgress?.active
                        ? tt("projects.retryingProgress")
                            .replace(
                              "{processed}",
                              String(retryFailedProgress.processed),
                            )
                            .replace(
                              "{total}",
                              String(retryFailedProgress.total),
                            )
                        : tt("projects.retrySelected").replace(
                            "{count}",
                            String(selectedFailedRunIds.length),
                          )}
                    </Button>
                  </div>

                  {retryFailedProgress && (
                    <div className="mb-3 rounded-lg border border-border bg-surface-subtle px-3 py-2">
                      <div className="text-[12px] text-text-secondary mb-1">
                        {tt("projects.progress")}:{" "}
                        {retryFailedProgress.processed}/
                        {retryFailedProgress.total} |{" "}
                        {tt("projects.successCount")}{" "}
                        {retryFailedProgress.successful} |{" "}
                        {tt("projects.failedCount")}{" "}
                        {retryFailedProgress.failed} |{" "}
                        {tt("projects.skippedCount")}{" "}
                        {retryFailedProgress.skipped}
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-surface-sunken">
                        <div
                          className="h-full bg-accent transition-colors"
                          style={{
                            width: `${
                              retryFailedProgress.total > 0
                                ? Math.round(
                                    (retryFailedProgress.processed /
                                      retryFailedProgress.total) *
                                      100,
                                  )
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {retryFailedSummary && (
                    <div className="mb-3 rounded-lg border border-border bg-surface-subtle px-3 py-2 text-[12px] text-text-secondary">
                      {tt("projects.lastRetryBatch")
                        .replace(
                          "{success}",
                          String(retryFailedSummary.successful_runs),
                        )
                        .replace(
                          "{failed}",
                          String(retryFailedSummary.failed_runs),
                        )
                        .replace(
                          "{skipped}",
                          String(retryFailedSummary.skipped_runs),
                        )}
                    </div>
                  )}

                  <div className="divide-y divide-border-subtle overflow-hidden rounded-lg border border-border bg-surface md:hidden">
                    {loadingFailedQueue ? (
                      <div className="px-3.5 py-4 text-[12px] text-text-secondary">
                        {tt("projects.loadingFailedQueue")}
                      </div>
                    ) : (failedQueue?.items || []).length === 0 ? (
                      <div className="px-3.5 py-4 text-[12px] text-text-secondary">
                        {tt("projects.noFailedQueue")}
                      </div>
                    ) : (
                      (failedQueue?.items || []).map((item) => (
                        <article key={item.run_id} className="px-3.5 py-3.5">
                          <div className="flex items-start justify-between gap-3">
                            <label className="flex min-w-0 items-start gap-2">
                              <input
                                type="checkbox"
                                className="mt-1 shrink-0"
                                checked={selectedFailedRunIds.includes(
                                  item.run_id,
                                )}
                                onChange={(e) =>
                                  toggleFailedRunSelection(
                                    item.run_id,
                                    e.target.checked,
                                  )
                                }
                              />
                              <span className="min-w-0">
                                <span className="block truncate text-[13px] font-semibold text-text">
                                  {item.project_name}
                                </span>
                                <span
                                  className="mt-1 block truncate text-[12px] text-text-secondary"
                                  dir="ltr"
                                >
                                  {item.source_filename || "-"}
                                </span>
                              </span>
                            </label>
                            <StatusBadge
                              status={item.status}
                              label={tokenLabel(item.status)}
                              domain="sync"
                            />
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                              <div className={projectsMetricLabelClass}>
                                {t("projects.time")}
                              </div>
                              <div
                                className="mt-1 truncate text-[12px] text-text-secondary tabular-nums"
                                dir="ltr"
                              >
                                {formatDateTime(item.created_at)}
                              </div>
                            </div>
                            <div className="rounded-lg border border-status-problem-border bg-status-problem-bg px-2.5 py-2">
                              <div className={projectsMetricLabelClass}>
                                {t("projects.errors")}
                              </div>
                              <div className="mt-1 text-[13px] font-medium text-status-problem-fg tabular-nums">
                                {item.errors_count}
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 flex items-center justify-between gap-2 border-t border-border-subtle pt-3">
                            <div className="min-w-0 truncate text-[11px] text-text-secondary">
                              {item.last_error || t("projects.errorLabel")}
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                openImportRun(item.project_id, item.run_id)
                              }
                              className="h-8 shrink-0 px-3 text-[11px]"
                            >
                              {t("projects.openRun")}
                            </Button>
                          </div>
                        </article>
                      ))
                    )}
                  </div>

                  <div className="hidden overflow-auto rounded-lg border border-border bg-surface md:block">
                    <table className="min-w-[760px] w-full text-[12px] leading-5">
                      <thead className="bg-surface-subtle text-text-secondary">
                        <tr>
                          <th className="text-start px-2 py-2 font-medium">
                            <input
                              type="checkbox"
                              aria-label={copy("Select all failed runs on this page", "Выбрать все сбойные запуски на странице", "בחר את כל ההרצות שנכשלו בעמוד")}
                              checked={allFailedPageSelected}
                              onChange={(e) =>
                                toggleSelectAllFailedQueuePage(e.target.checked)
                              }
                            />
                          </th>
                          <th className="text-start px-2 py-2 font-medium">
                            {t("projects.time")}
                          </th>
                          <th className="text-start px-2 py-2 font-medium">
                            {t("common.project")}
                          </th>
                          <th className="text-start px-2 py-2 font-medium">
                            {t("common.status")}
                          </th>
                          <th className="text-start px-2 py-2 font-medium">
                            {t("projects.errors")}
                          </th>
                          <th className="text-start px-2 py-2 font-medium">
                            {t("projects.file")}
                          </th>
                          <th className="text-start px-2 py-2 font-medium">
                            {t("projects.action")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingFailedQueue ? (
                          <tr>
                            <td
                              className="px-2 py-3 text-text-secondary"
                              colSpan={7}
                            >
                              {tt("projects.loadingFailedQueue")}
                            </td>
                          </tr>
                        ) : (failedQueue?.items || []).length === 0 ? (
                          <tr>
                            <td
                              className="px-2 py-3 text-text-secondary"
                              colSpan={7}
                            >
                              {tt("projects.noFailedQueue")}
                            </td>
                          </tr>
                        ) : (
                          (failedQueue?.items || []).map((item) => (
                            <tr
                              key={item.run_id}
                              className="row-hover border-t border-border"
                            >
                              <td className="px-2 py-1.5">
                                <input
                                  type="checkbox"
                                  aria-label={copy("Select failed run {name}", "Выбрать сбойный запуск {name}", "בחר הרצה שנכשלה {name}").replace("{name}", item.project_name)}
                                  checked={selectedFailedRunIds.includes(
                                    item.run_id,
                                  )}
                                  onChange={(e) =>
                                    toggleFailedRunSelection(
                                      item.run_id,
                                      e.target.checked,
                                    )
                                  }
                                />
                              </td>
                              <td className="px-2 py-1.5 whitespace-nowrap">
                                {formatDateTime(item.created_at)}
                              </td>
                              <td className="px-2 py-1.5">
                                {item.project_name}
                              </td>
                              <td className="px-2 py-1.5">
                                <StatusBadge
                                  status={item.status}
                                  label={tokenLabel(item.status)}
                                  domain="sync"
                                />
                              </td>
                              <td
                                className="px-2 py-1.5 text-status-problem-fg"
                                title={item.last_error || ""}
                              >
                                {item.errors_count}
                              </td>
                              <td
                                className="px-2 py-1.5 max-w-[220px] truncate"
                                title={item.source_filename || "-"}
                              >
                                {item.source_filename || "-"}
                              </td>
                              <td className="px-2 py-1.5">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    openImportRun(item.project_id, item.run_id)
                                  }
                                  className="h-7 px-2 text-[11px]"
                                >
                                  {t("projects.openRun")}
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[12px] text-text-secondary">
                    <div>
                      {t("projects.totalQueue")}: {failedQueue?.total || 0}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setFailedQueueOffset((x) =>
                            Math.max(0, x - FAILED_QUEUE_PAGE_SIZE),
                          )
                        }
                        disabled={!failedQueueCanPrev}
                        className="h-7 px-2 text-[11px]"
                      >
                        {t("projects.prev")}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setFailedQueueOffset(
                            (x) => x + FAILED_QUEUE_PAGE_SIZE,
                          )
                        }
                        disabled={!failedQueueCanNext}
                        className="h-7 px-2 text-[11px]"
                      >
                        {t("projects.next")}
                      </Button>
                    </div>
                  </div>
                </WidgetCard>

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

                <div
                  id="project-door-matrix"
                  tabIndex={-1}
                  className={projectsPanelClass("overflow-hidden p-4")}
                >
                  <div className="-mx-4 -mt-4 mb-4 flex gap-0.5 overflow-x-auto border-b border-border bg-surface px-2 pt-1">
                    {[
                      {
                        key: "overview",
                        label: copy("Overview", "Обзор", "סקירה"),
                        count: null,
                        active: false,
                        danger: false,
                        onClick: () =>
                          scrollToProjectSection("project-detail-v2-header"),
                      },
                      {
                        key: "doors",
                        label: t("projects.doors"),
                        count: projectDoorTotals.totalDoors,
                        active: matrixIssueFilter === "all",
                        danger: false,
                        onClick: () => {
                          setMatrixIssueFilter("all");
                          scrollToProjectSection("project-door-matrix");
                        },
                      },
                      {
                        key: "issues",
                        label: t("projects.issues"),
                        count: projectDoorTotals.issueCount,
                        active: matrixIssueFilter === "issues",
                        danger: projectDoorTotals.issueCount > 0,
                        onClick: () => {
                          setMatrixIssueFilter("issues");
                          scrollToProjectSection("project-door-matrix");
                        },
                      },
                      {
                        key: "addons",
                        label: t("projects.addons"),
                        count: projectAddonPlan.length,
                        active: false,
                        danger: false,
                        onClick: () =>
                          scrollToProjectSection(
                            canViewProjectRates
                              ? "project-additional-works"
                              : "project-commercial-restricted",
                          ),
                      },
                      {
                        key: "documents",
                        label: copy("Documents", "Документы", "מסמכים"),
                        count: projectDocuments.length,
                        active: false,
                        danger: false,
                        onClick: () => scrollToProjectSection("project-documents"),
                      },
                      {
                        key: "activity",
                        label: copy("Import history", "История импорта", "היסטוריית ייבוא"),
                        count: importHistory.length,
                        active: false,
                        danger: false,
                        onClick: () =>
                          scrollToProjectSection("project-import-history"),
                      },
                    ].map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        aria-pressed={item.active}
                        data-testid={`project-detail-tab-${item.key}`}
                        onClick={item.onClick}
                        className={cn(
                          "inline-flex shrink-0 items-center gap-1.5 border-b-2 border-transparent px-3.5 py-2.5 text-[12.5px] font-medium text-text-secondary transition-colors hover:text-text",
                          item.active && "border-text text-text",
                        )}
                      >
                        <span>{item.label}</span>
                        {typeof item.count === "number" ? (
                          <span
                            className={cn(
                              "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-surface-sunken px-1.5 text-[10.5px] font-medium leading-none text-text-secondary tabular-nums",
                              item.danger &&
                                "bg-status-problem-bg text-status-problem-fg",
                              item.active &&
                                "bg-text text-text-inverse",
                              item.active &&
                                item.danger &&
                                "bg-status-problem-fg text-white",
                            )}
                          >
                            {item.count}
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div>
                      <div className={projectsMetricLabelClass}>
                        {t("projects.doorAllocationMatrix")}
                      </div>
                      <h3 className="mt-1 text-[15px] font-semibold text-text">
                        {t("projects.projectDetailMatrix")}
                      </h3>
                      <p className="text-[12px] text-text-secondary mt-1">
                        {t("projects.visualCut")}
                      </p>
                    </div>
                    <div className="text-[12px] text-text-secondary">
                      {t("projects.visibleCount")
                        .replace(
                          "{filtered}",
                          String(filteredMatrixRows.length),
                        )
                        .replace("{total}", String(matrixRows.length))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {[
                      {
                        label: t("projects.orders"),
                        value: filteredMatrixSummary.orders,
                      },
                      {
                        label: t("projects.houses"),
                        value: filteredMatrixSummary.houses,
                      },
                      {
                        label: t("projects.floors"),
                        value: filteredMatrixSummary.floors,
                      },
                      {
                        label: t("projects.apartments"),
                        value: filteredMatrixSummary.apartments,
                      },
                      {
                        label: t("projects.locations"),
                        value: filteredMatrixSummary.locations,
                      },
                      {
                        label: t("projects.markings"),
                        value: filteredMatrixSummary.markings,
                      },
                      {
                        label: t("projects.assigned"),
                        value: filteredMatrixSummary.assignedCount,
                      },
                      {
                        label: t("common.open"),
                        value: filteredMatrixSummary.openCount,
                      },
                      {
                        label: t("projects.blockers"),
                        value: filteredMatrixSummary.issuesCount,
                      },
                    ].map((item) => (
                      <span
                        key={item.label}
                        className="rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] text-text"
                      >
                        {item.label}: {item.value}
                      </span>
                    ))}
                  </div>

                  <div className="mb-3 flex flex-wrap gap-x-4 gap-y-2 border-y border-border-subtle bg-surface-subtle px-3 py-2 text-[10.5px] text-text-secondary">
                    {[
                      {
                        label: t("installerProject.installed"),
                        value: matrixLegendCounts.installed,
                        swatch: "border-status-ok-border bg-status-ok-bg",
                      },
                      {
                        label: copy("In progress", "В работе", "בתהליך"),
                        value: matrixLegendCounts.inProgress,
                        swatch:
                          "border-status-progress-border bg-status-progress-bg",
                      },
                      {
                        label: t("projects.issues"),
                        value: matrixLegendCounts.issues,
                        swatch:
                          "border-status-problem-border bg-status-problem-bg",
                      },
                      {
                        label: copy(
                          "Not installed",
                          "Не установлено",
                          "לא הותקן",
                        ),
                        value: matrixLegendCounts.notInstalled,
                        swatch:
                          "border-status-warning-border bg-status-warning-bg",
                      },
                      {
                        label: copy("Locked", "Заблокировано", "נעול"),
                        value: matrixLegendCounts.locked,
                        swatch:
                          "border-status-blocked-border bg-status-blocked-bg",
                      },
                      {
                        label: copy("Cancelled", "Отменено", "בוטל"),
                        value: matrixLegendCounts.cancelled,
                        swatch:
                          "border-status-archived-border bg-status-archived-bg",
                      },
                    ].map((item) => (
                      <span
                        key={item.label}
                        className="inline-flex items-center gap-1.5 font-medium"
                      >
                        <span
                          className={cn(
                            "h-2.5 w-2.5 rounded-[3px] border",
                            item.swatch,
                          )}
                          aria-hidden="true"
                        />
                        <span>{item.label}</span>
                        <LtrText
                          as="span"
                          className="font-normal text-text-tertiary"
                        >
                          {item.value}
                        </LtrText>
                      </span>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-3">
                    <select
                      value={matrixOrderNumber}
                      onChange={(e) => setMatrixOrderNumber(e.target.value)}
                      aria-label={t("projects.allOrders")}
                      className="control-input h-9 text-[12px]"
                    >
                      <option value="all">{t("projects.allOrders")}</option>
                      {matrixOrderNumberOptions.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                    <select
                      value={matrixHouse}
                      onChange={(e) => setMatrixHouse(e.target.value)}
                      aria-label={t("projects.allHouses")}
                      className="control-input h-9 text-[12px]"
                    >
                      <option value="all">{t("projects.allHouses")}</option>
                      {matrixHouseOptions.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                    <select
                      value={matrixFloor}
                      onChange={(e) => setMatrixFloor(e.target.value)}
                      aria-label={t("projects.allFloors")}
                      className="control-input h-9 text-[12px]"
                    >
                      <option value="all">{t("projects.allFloors")}</option>
                      {matrixFloorOptions.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                    <select
                      value={matrixLocation}
                      onChange={(e) => setMatrixLocation(e.target.value)}
                      aria-label={t("projects.allLocations")}
                      className="control-input h-9 text-[12px]"
                    >
                      <option value="all">{t("projects.allLocations")}</option>
                      {matrixLocationOptions.map((value) => (
                        <option key={value} value={value}>
                          {locationLabel(value)}
                        </option>
                      ))}
                    </select>
                    <select
                      value={matrixDoorType}
                      onChange={(e) => setMatrixDoorType(e.target.value)}
                      aria-label={t("projects.allDoorTypes")}
                      className="control-input h-9 text-[12px]"
                    >
                      <option value="all">{t("projects.allDoorTypes")}</option>
                      {matrixDoorTypeOptions.map((value) => (
                        <option key={value.id} value={value.id}>
                          {value.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={matrixStatus}
                      onChange={(e) => setMatrixStatus(e.target.value)}
                      aria-label={t("projects.allStatuses")}
                      className="control-input h-9 text-[12px]"
                    >
                      <option value="all">{t("projects.allStatuses")}</option>
                      {matrixStatusOptions.map((value) => (
                        <option key={value} value={value}>
                          {tokenLabel(value)}
                        </option>
                      ))}
                    </select>
                    <input
                      value={matrixApartmentSearch}
                      onChange={(e) => setMatrixApartmentSearch(e.target.value)}
                      placeholder={t("projects.apartmentPlaceholder")}
                      aria-label={t("projects.apartmentPlaceholder")}
                      autoComplete="off"
                      className="control-input h-9 text-[12px]"
                    />
                    {matrixInstallerFilterControl}
                    <input
                      value={matrixMarkingSearch}
                      onChange={(e) => setMatrixMarkingSearch(e.target.value)}
                      placeholder={t("projects.markingPlaceholder")}
                      aria-label={t("projects.markingPlaceholder")}
                      autoComplete="off"
                      className="control-input h-9 text-[12px]"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={resetMatrixFilters}
                      className="h-9 text-[12px]"
                    >
                      <FilterX className="w-3.5 h-3.5" aria-hidden="true" />
                      {t("projects.reset")}
                    </Button>
                  </div>

                  {focusedDoorRow ? (
                    <div
                      data-testid="project-door-info-frame"
                      aria-live="polite"
                      className="sticky top-3 z-20 mb-3 overflow-hidden rounded-lg border border-border-strong bg-surface shadow-[var(--dmx-shadow-overlay)] ring-1 ring-black/5"
                    >
                      <span
                        className={cn(
                          "block h-1 w-full",
                          focusedDoorRow.issue_count > 0
                            ? "bg-kpi-red"
                            : "bg-[var(--dmx-accent)]",
                        )}
                        aria-hidden="true"
                      />
                      <div className="flex flex-col gap-3 border-b border-border-subtle bg-surface px-4 py-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className={projectsMetricLabelClass}>
                            {copy("Door details", "Карточка двери", "פרטי דלת")}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <h4 className="text-[16px] font-semibold leading-tight text-text">
                              <LtrText as="span">
                                {focusedDoorRow.door_marking}
                              </LtrText>
                            </h4>
                            <StatusBadge
                              status={focusedDoorRow.status}
                              label={tokenLabel(focusedDoorRow.status)}
                              domain="door"
                            />
                            {focusedDoorRow.issue_count > 0 ? (
                              <span className="rounded-full border border-status-problem-border bg-status-problem-bg px-2.5 py-1 text-[11px] font-medium text-status-problem-fg">
                                {copy("Problem", "Проблема", "בעיה")} ·{" "}
                                {focusedDoorRow.issue_count}
                              </span>
                            ) : (
                              <span className="rounded-full border border-status-ok-border bg-status-ok-bg px-2.5 py-1 text-[11px] font-medium text-status-ok-fg">
                                {copy("No open issues", "Нет открытых проблем", "אין בעיות פתוחות")}
                              </span>
                            )}
                          </div>
                          <div className="mt-1 text-[12px] text-text-secondary">
                            <LtrText as="span">
                              {focusedDoorRow.order_number}
                            </LtrText>{" "}
                            · {copy("house", "корпус", "בניין")}{" "}
                            <LtrText as="span">
                              {focusedDoorRow.house_number}
                            </LtrText>{" "}
                            · {copy("floor", "этаж", "קומה")}{" "}
                            <LtrText as="span">
                              {focusedDoorRow.floor_label}
                            </LtrText>{" "}
                            · {copy("apt", "кв.", "דירה")}{" "}
                            <LtrText as="span">
                              {focusedDoorRow.apartment_number}
                            </LtrText>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <PillButton
                            variant={
                              selectedDoorIdSet.has(focusedDoorRow.door_id)
                                ? "secondary"
                                : "accent"
                            }
                            size="sm"
                            data-testid="project-door-info-select"
                            disabled={!canManageProjects}
                            onClick={() =>
                              toggleDoorSelection(focusedDoorRow.door_id)
                            }
                          >
                            {selectedDoorIdSet.has(focusedDoorRow.door_id)
                              ? copy("Unselect", "Убрать выбор", "בטל בחירה")
                              : copy("Select for assignment", "Выбрать для назначения", "בחר לשיבוץ")}
                          </PillButton>
                          <PillButton
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setMatrixOrderNumber(focusedDoorRow.order_number);
                              scrollToProjectSection("project-door-matrix");
                            }}
                          >
                            {copy("Show order", "Показать заказ", "הצג הזמנה")}
                          </PillButton>
                          <PillButton
                            variant="ghost"
                            size="sm"
                            onClick={() => setFocusedDoorId(null)}
                          >
                            {copy("Close", "Закрыть", "סגור")}
                          </PillButton>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 p-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(260px,0.85fr)]">
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                          <MetricRow
                            label={copy("Unit", "Позиция", "מיקום")}
                            value={<LtrText>{focusedDoorRow.unit_label}</LtrText>}
                            barColor="blue"
                          />
                          <MetricRow
                            label={copy("Door type", "Тип двери", "סוג דלת")}
                            value={focusedDoorRow.door_type_label}
                            barColor="yellow"
                          />
                          <MetricRow
                            label={copy("Location", "Локация", "מיקום")}
                            value={locationLabel(focusedDoorRow.location_code)}
                            barColor="green"
                          />
                          <MetricRow
                            label={copy("Installer", "Монтажник", "מתקין")}
                            value={
                              focusedDoorInstaller?.full_name ||
                              copy("Unassigned", "Не назначен", "לא שובץ")
                            }
                            barColor={focusedDoorInstaller ? "green" : "orange"}
                          />
                        </div>

                        <div className="rounded-lg border border-border bg-surface-subtle px-3 py-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className={projectsMetricLabelClass}>
                              {copy("Open issues", "Открытые проблемы", "בעיות פתוחות")}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setMatrixIssueFilter("issues");
                                scrollToProjectSection("project-door-matrix");
                              }}
                              className="text-[11.5px] font-medium text-link hover:underline"
                            >
                              {copy("Filter issues", "Фильтр проблем", "סנן בעיות")}
                            </button>
                          </div>
                          {focusedDoorIssues.length === 0 ? (
                            <div className="mt-2 text-[12px] leading-5 text-text-secondary">
                              {copy(
                                "This door has no open issue in the project log.",
                                "По этой двери нет открытой проблемы в журнале объекта.",
                                "לדלת הזו אין בעיה פתוחה ביומן הפרויקט.",
                              )}
                            </div>
                          ) : (
                            <div className="mt-2 space-y-2">
                              {focusedDoorIssues.map((issue) => (
                                <div
                                  key={issue.id}
                                  className="rounded-lg border border-status-problem-border bg-status-problem-bg px-3 py-2"
                                >
                                  <div className="line-clamp-2 text-[12px] font-medium text-status-problem-fg">
                                    {issueLabel(issue)}
                                  </div>
                                  <div className="mt-1 text-[10.5px] text-text-secondary">
                                    {copy("Status", "Статус", "סטטוס")}:{" "}
                                    {tokenLabel(issue.status)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="rounded-lg border border-border bg-surface-subtle px-3 py-3 lg:col-span-2">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className={projectsMetricLabelClass}>
                                {copy(
                                  "Status action",
                                  "Действие по статусу",
                                  "פעולת סטטוס",
                                )}
                              </div>
                              <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-[minmax(220px,0.75fr)_minmax(260px,1fr)]">
                                <select
                                  aria-label={copy(
                                    "Not installed reason",
                                    "Причина неустановки",
                                    "סיבת אי התקנה",
                                  )}
                                  data-testid="project-door-reason-select"
                                  value={focusedDoorReasonId}
                                  onChange={(event) =>
                                    setFocusedDoorReasonId(event.target.value)
                                  }
                                  disabled={
                                    !reasonsReference.ready || doorStatusAction !== null
                                  }
                                  className="control-input h-9 text-[12px]"
                                >
                                  <option value="">
                                    {loadingReasons
                                      ? copy(
                                          "Loading reasons...",
                                          "Загружаем причины...",
                                          "טוען סיבות...",
                                        )
                                      : copy(
                                          "Choose reason for not installed",
                                          "Выберите причину неустановки",
                                          "בחר סיבת אי התקנה",
                                        )}
                                  </option>
                                  {activeReasons.map((reason) => (
                                    <option key={reason.id} value={reason.id}>
                                      {reason.name}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  value={focusedDoorComment}
                                  onChange={(event) =>
                                    setFocusedDoorComment(event.target.value)
                                  }
                                  disabled={doorStatusAction !== null}
                                  placeholder={copy(
                                    "Optional field note",
                                    "Комментарий с объекта, если нужен",
                                    "הערת שטח אופציונלית",
                                  )}
                                  aria-label={copy(
                                    "Door status comment",
                                    "Комментарий к статусу двери",
                                    "הערת סטטוס לדלת",
                                  )}
                                  data-testid="project-door-status-comment"
                                  className="control-input h-9 text-[12px]"
                                />
                              </div>
                              {focusedDoorRow.status === "INSTALLED" ? (
                                <input
                                  value={focusedDoorOverrideReason}
                                  onChange={(event) =>
                                    setFocusedDoorOverrideReason(
                                      event.target.value,
                                    )
                                  }
                                  disabled={doorStatusAction !== null}
                                  maxLength={500}
                                  placeholder={copy(
                                    "Required admin override reason",
                                    "Требуемая причина переопределения администратором",
                                    "נדרשת סיבה לעקוף מנהל מערכת",
                                  )}
                                  aria-label={copy(
                                    "Admin override reason",
                                    "Причина отмены администратором",
                                    "סיבה לעקוף מנהל המערכת",
                                  )}
                                  data-testid="project-door-override-reason"
                                  className="control-input mt-2 h-9 text-[12px]"
                                />
                              ) : null}
                              {reasonsReference.error ? (
                                <p className="mt-2 text-[11.5px] text-status-problem-fg">{referenceUnavailable}</p>
                              ) : activeReasons.length === 0 && !loadingReasons ? (
                                <button
                                  type="button"
                                  onClick={() => router.push("/reasons")}
                                  className="mt-2 text-[11.5px] font-medium text-link hover:underline"
                                >
                                  {copy(
                                    "No active reasons. Open reason catalog.",
                                    "Нет активных причин. Открыть справочник причин.",
                                    "אין סיבות פעילות. פתח קטלוג סיבות.",
                                  )}
                                </button>
                              ) : (
                                <div className="mt-2 text-[11.5px] leading-5 text-text-secondary">
                                  {focusedDoorRow.status === "INSTALLED"
                                    ? copy(
                                        "Installed doors are locked. Admin override reverses completed work, reopens an issue and writes audit history.",
                                        "Установленные двери запираются. Администраторское переопределение отменяет завершенную работу, повторно открывает проблему и записывает историю аудита.",
                                        "דלתות מותקנות ננעלות. עקיפה של מנהל מערכת הופכת עבודה שהושלמה, פותחת בעיה מחדש וכותבת היסטוריית ביקורת.",
                                      )
                                    : copy(
                                        "Not installed always requires a reason and writes an issue to the project log.",
                                        "Неустановка всегда требует причину и записывает проблему в журнал объекта.",
                                        "אי התקנה תמיד דורשת סיבה ונרשמת כיומן בעיות בפרויקט.",
                                      )}
                                </div>
                              )}
                            </div>
                            <div className="flex shrink-0 flex-wrap gap-2">
                              <PillButton
                                variant="accent"
                                size="sm"
                                iconStart={
                                  <CheckCircle2
                                    className="h-3.5 w-3.5"
                                    aria-hidden="true"
                                  />
                                }
                                loading={doorStatusAction === "install"}
                                disabled={
                                  !canManageProjects ||
                                  doorStatusAction !== null ||
                                  focusedDoorRow.status === "INSTALLED"
                                }
                                data-testid="project-door-mark-installed"
                                onClick={() =>
                                  void handleFocusedDoorMarkInstalled()
                                }
                              >
                                {focusedDoorRow.status === "INSTALLED"
                                  ? copy(
                                      "Installed",
                                      "Установлена",
                                      "הותקנה",
                                    )
                                  : copy(
                                      "Mark installed",
                                      "Отметить установленной",
                                      "סמן כהותקנה",
                                    )}
                              </PillButton>
                              <PillButton
                                variant="destructive"
                                size="sm"
                                iconStart={
                                  <AlertCircle
                                    className="h-3.5 w-3.5"
                                    aria-hidden="true"
                                  />
                                }
                                loading={
                                  doorStatusAction === "not-installed" ||
                                  doorStatusAction ===
                                    "override-not-installed"
                                }
                                disabled={
                                  !canManageProjects ||
                                  doorStatusAction !== null ||
                                  !focusedDoorReasonId ||
                                  !reasonsReference.ready ||
                                  (focusedDoorRow.status === "INSTALLED" &&
                                    !focusedDoorOverrideReason.trim())
                                }
                                data-testid="project-door-mark-not-installed"
                                onClick={() =>
                                  void handleFocusedDoorMarkNotInstalled()
                                }
                              >
                                {focusedDoorRow.status === "INSTALLED"
                                  ? copy(
                                      "Override to not installed",
                                      "Откатить в неустановленную",
                                      "החזר ללא הותקנה",
                                    )
                                  : copy(
                                      "Save not installed",
                                      "Сохранить неустановку",
                                      "שמור אי התקנה",
                                    )}
                              </PillButton>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      data-testid="project-door-info-empty"
                      className="mb-3 rounded-lg border border-dashed border-border bg-surface-subtle px-4 py-3 text-[12px] text-text-secondary"
                    >
                      {copy(
                        "Click any door tile or table row to inspect status, assignment and open issues.",
                        "Нажмите на плитку или строку двери, чтобы посмотреть статус, назначение и открытые проблемы.",
                        "לחץ על אריח או שורה של דלת כדי לראות סטטוס, שיבוץ ובעיות פתוחות.",
                      )}
                    </div>
                  )}

                  <div className="mb-3 rounded-lg border border-border bg-surface-subtle p-3">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex flex-wrap items-center gap-3">
                        <label className="checkbox-row h-9 rounded-lg border border-border bg-surface px-3 text-[12px]">
                          <input
                            type="checkbox"
                            checked={allFilteredDoorsSelected}
                            disabled={!canManageProjects || filteredDoorIds.length === 0}
                            onChange={toggleFilteredDoorSelection}
                          />
                          <span>
                            {copy(
                              "Select visible doors",
                              "Выбрать видимые двери",
                              "בחר דלתות מוצגות",
                            )}
                          </span>
                        </label>
                        <div className="text-[12px] text-text-secondary">
                          {copy("Selected", "Выбрано", "נבחרו")}:{" "}
                          {selectedDoorIds.length}
                          {hiddenSelectedDoorCount > 0 && (
                            <span role="status" className="ms-2 text-status-warning-fg">
                              {copy("Hidden by filters", "Скрыто фильтрами", "מוסתרות על ידי מסננים")}: {hiddenSelectedDoorCount}
                            </span>
                          )}
                        </div>
                        {canManageProjects && hiddenSelectedDoorCount > 0 && (
                          <Button
                            type="button" variant="outline" size="sm" disabled={bulkAssignLoading}
                            onClick={() => setSelectedDoorIds((current) => current.filter((id) => filteredDoorIds.includes(id)))}
                          >
                            <FilterX className="h-3.5 w-3.5" aria-hidden="true" />
                            {copy("Deselect hidden", "Снять скрытое выделение", "ביטול בחירה מוסתרת")}
                          </Button>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <select
                          aria-label={copy(
                            "Bulk assign installer",
                            "Массовое назначение монтажника",
                            "שיוך מתקין קבוצתי",
                          )}
                          value={bulkAssignInstallerId}
                          onChange={(event) =>
                            setBulkAssignInstallerId(event.target.value)
                          }
                          disabled={
                            !canManageProjects ||
                            !installersReference.ready || bulkAssignLoading || selectedDoorIds.length === 0
                          }
                          className="control-input h-9 min-w-[220px] text-[12px]"
                        >
                          <option value="">
                            {copy(
                              "Choose installer",
                              "Выберите монтажника",
                              "בחר מתקין",
                            )}
                          </option>
                          {activeInstallers.map((installer) => (
                            <option key={installer.id} value={installer.id}>
                              {installer.full_name}
                            </option>
                          ))}
                        </select>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => void handleBulkAssignDoors()}
                          disabled={
                            !canManageProjects ||
                            bulkAssignLoading ||
                            selectedDoorIds.length === 0 ||
                            !installersReference.ready || !activeInstallerById.has(bulkAssignInstallerId)
                          }
                          className="h-9 text-[12px]"
                        >
                          <UserPlus
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                          {bulkAssignLoading
                            ? copy("Assigning...", "Назначаем...", "משייך...")
                            : copy(
                                "Assign selected",
                                "Назначить выбранные",
                                "שייך נבחרות",
                              )}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedDoorIds([])}
                          disabled={
                            !canManageProjects ||
                            bulkAssignLoading || selectedDoorIds.length === 0
                          }
                          className="h-9 text-[12px]"
                        >
                          <FilterX className="h-3.5 w-3.5" aria-hidden="true" />
                          {copy("Clear", "Очистить", "נקה")}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {filteredMatrixRows.length === 0 ? (
                    <div className="rounded-lg border border-border bg-surface-subtle px-4 py-8 text-[13px] text-text-secondary">
                      {t("projects.noDoorsForFilters")}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {projectDetailMatrix.map((house) => (
                        <section
                          key={house.house_number}
                          className="rounded-lg border border-border bg-surface"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
                            <div>
                              <div className={projectsMetricLabelClass}>
                                {copy("Building", "Дом", "בניין")}
                              </div>
                              <div className="text-[15px] font-semibold text-text mt-1">
                                {house.house_number}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {[
                                {
                                  label: t("projects.doors"),
                                  value: house.total_doors,
                                },
                                {
                                  label: t("projects.apartments"),
                                  value: house.apartments_count,
                                },
                                {
                                  label: t("installerProject.installed"),
                                  value: house.installed_count,
                                },
                                {
                                  label: t("common.open"),
                                  value: house.open_count,
                                },
                                {
                                  label: t("projects.blockers"),
                                  value: house.issue_count,
                                },
                              ].map((item) => (
                                <span
                                  key={`${house.house_number}-${item.label}`}
                                  className="rounded-full border border-border bg-surface-subtle px-2.5 py-1 text-[11px] text-text"
                                >
                                  {item.label}: {item.value}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-3 bg-surface-subtle p-4">
                            {house.floors.map((floor) => {
                              const floorProgressPct = matrixCompletionPct(
                                floor.installed_count,
                                floor.total_doors,
                              );
                              const floorDoors = floor.apartments.flatMap(
                                (apartment) =>
                                  apartment.cells.flatMap((cell) =>
                                    cell.doors.map((door) => ({
                                      apartment,
                                      cell,
                                      door,
                                    })),
                                  ),
                              );
                              return (
                              <article
                                key={`${house.house_number}-${floor.floor_label}`}
                                data-testid={`project-detail-v28-full-floor-row-${house.house_number}-${floor.floor_label}`}
                                className={cn(
                                  "relative overflow-hidden rounded-lg border bg-surface",
                                  floor.issue_count > 0
                                    ? "border-status-problem-border"
                                    : "border-border",
                                )}
                              >
                                <span
                                  className={cn(
                                    "absolute inset-y-0 start-0 w-1",
                                    matrixProgressTone(
                                      floor.issue_count,
                                      floorProgressPct,
                                    ),
                                  )}
                                  aria-hidden="true"
                                />
                                <div className="grid gap-3 border-b border-border-subtle bg-surface pe-4 ps-5 py-3 md:grid-cols-[minmax(0,1fr)_180px] md:items-center">
                                  <div className="min-w-0">
                                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                                      <span
                                        className={cn(
                                          "inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-[12px] font-semibold tabular-nums",
                                          floor.issue_count > 0
                                            ? "bg-status-problem-bg text-status-problem-fg"
                                            : "bg-[var(--dmx-accent-tint)] text-text",
                                        )}
                                      >
                                        <LtrText as="span">
                                          {floor.floor_label}
                                        </LtrText>
                                      </span>
                                      <h4 className="min-w-0 truncate text-[14px] font-semibold text-text">
                                        {copy("Floor", "Этаж", "קומה")}{" "}
                                        <LtrText as="span">
                                          {floor.floor_label}
                                        </LtrText>
                                      </h4>
                                      <span className="inline-flex min-h-6 items-center rounded-full border border-border bg-surface-subtle px-2.5 text-[10.5px] font-medium text-text-secondary">
                                        {copy("House", "Корпус", "בניין")}{" "}
                                        <LtrText as="span">
                                          {house.house_number}
                                        </LtrText>
                                      </span>
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                      <span className="inline-flex min-h-6 items-center rounded-full bg-surface-sunken px-2.5 text-[10.5px] font-medium text-text-secondary">
                                        {floor.total_doors}{" "}
                                        {copy("doors", "дверей", "דלתות")}
                                      </span>
                                      <span className="inline-flex min-h-6 items-center rounded-full bg-status-ok-bg px-2.5 text-[10.5px] font-medium text-status-ok-fg">
                                        {copy(
                                          "installed",
                                          "установлено",
                                          "הותקנו",
                                        )}{" "}
                                        {floor.installed_count}
                                      </span>
                                      <span className="inline-flex min-h-6 items-center rounded-full bg-status-warning-bg px-2.5 text-[10.5px] font-medium text-status-warning-fg">
                                        {copy("open", "открыто", "פתוח")}{" "}
                                        {floor.open_count}
                                      </span>
                                      {floor.issue_count > 0 ? (
                                        <span className="inline-flex min-h-6 items-center rounded-full bg-status-problem-bg px-2.5 text-[10.5px] font-medium text-status-problem-fg">
                                          {floor.issue_count}{" "}
                                          {copy("issues", "проблем", "בעיות")}
                                        </span>
                                      ) : (
                                        <span className="inline-flex min-h-6 items-center rounded-full border border-border bg-surface px-2.5 text-[10.5px] font-medium text-text-secondary">
                                          {copy(
                                            "all clear",
                                            "без проблем",
                                            "תקין",
                                          )}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="min-w-[150px]">
                                    <div className="mb-1 flex items-center justify-between gap-2 text-[10.5px] font-medium text-text-secondary">
                                      <span>
                                        {copy("Progress", "Прогресс", "התקדמות")}
                                      </span>
                                      <LtrText as="span">
                                        {floor.installed_count}/{floor.total_doors} ·{" "}
                                        {floorProgressPct}%
                                      </LtrText>
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-surface-sunken">
                                      <span
                                        className={cn(
                                          "block h-full rounded-full",
                                          matrixProgressTone(
                                            floor.issue_count,
                                            floorProgressPct,
                                          ),
                                        )}
                                        style={{ width: `${floorProgressPct}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>

                                <div className="border-b border-border-subtle bg-surface px-4 py-3">
                                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-text-secondary">
                                    <span className="font-medium text-text-secondary">
                                      {copy("Door matrix", "Матрица дверей", "מטריצת דלתות")}
                                    </span>
                                    <span className="tabular-nums">
                                      {floorDoors.length}{" "}
                                      {copy("doors", "дверей", "דלתות")} ·{" "}
                                      {floor.apartments.length}{" "}
                                      {copy("apartments", "квартир", "דירות")} ·{" "}
                                      {floor.location_codes.length}{" "}
                                      {copy("locations", "локаций", "מיקומים")}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-[repeat(auto-fill,minmax(144px,1fr))] gap-2">
                                    {floorDoors.map(({ apartment, cell, door }) => (
                                      <DoorMatrixTile
                                            key={`${house.house_number}-${floor.floor_label}-${apartment.apartment_number}-${cell.location_code}-${door.door_id}-tile`}
                                            marking={matrixDoorTileLabel(door)}
                                            status={tokenLabel(door.status)}
                                            tone={matrixDoorTileTone(door)}
                                            focused={focusedDoorId === door.door_id}
                                            selected={selectedDoorIdSet.has(door.door_id)}
                                            hasIssues={door.issue_count > 0}
                                            inspectLabel={copy(
                                              "Inspect door {door}",
                                              "Открыть дверь {door}",
                                              "פתח דלת {door}",
                                            ).replace(
                                              "{door}",
                                              door.door_marking,
                                            )}
                                            context={`${apartment.apartment_number} · ${locationLabel(
                                              cell.location_code,
                                            )}`}
                                            onInspect={() =>
                                              setFocusedDoorId(door.door_id)
                                            }
                                            onToggleSelection={() =>
                                              toggleDoorSelection(door.door_id)
                                            }
                                      />
                                    ))}
                                  </div>
                                </div>

                                <div className="space-y-3 p-3 md:hidden">
                                  {floor.apartments.map((apartment) => (
                                    <article
                                      key={`${house.house_number}-${floor.floor_label}-${apartment.apartment_number}-mobile`}
                                      className="rounded-lg border border-border bg-surface px-3 py-3"
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                          <div className={projectsMetricLabelClass}>
                                            {copy("Apartment", "Квартира", "דירה")}
                                          </div>
                                          <div className="mt-1 text-[14px] font-semibold text-text">
                                            <LtrText>
                                              {apartment.apartment_number}
                                            </LtrText>
                                          </div>
                                        </div>
                                        <div className="shrink-0 text-end">
                                          <div className={projectsMetricLabelClass}>
                                            {t("projects.doors")}
                                          </div>
                                          <div className="mt-1 text-[17px] font-medium leading-tight text-text tabular-nums">
                                            {apartment.total_doors}
                                          </div>
                                        </div>
                                      </div>

                                      <div className="mt-3 flex flex-wrap gap-1.5">
                                        {apartment.order_numbers.map(
                                          (orderNumber) => (
                                            <span
                                              key={`${house.house_number}-${floor.floor_label}-${apartment.apartment_number}-mobile-${orderNumber}`}
                                              className="rounded-full border border-border bg-surface-subtle px-2.5 py-1 text-[11px] text-text"
                                            >
                                              <LtrText>{orderNumber}</LtrText>
                                            </span>
                                          ),
                                        )}
                                      </div>

                                      <div className="mt-3 space-y-2">
                                        {apartment.cells.map((cell) =>
                                          cell.doors.map((door) => (
                                            <button
                                              key={`${apartment.apartment_number}-${door.door_id}-mobile`}
                                              type="button"
                                              data-testid={`project-matrix-mobile-door-card-${door.door_id}`}
                                              aria-label={copy(
                                                "Open door detail {door}",
                                                "Открыть карточку двери {door}",
                                                "פתח כרטיס דלת {door}",
                                              ).replace(
                                                "{door}",
                                                door.door_marking,
                                              )}
                                              onClick={() =>
                                                setFocusedDoorId(door.door_id)
                                              }
                                              className={cn(
                                                "w-full rounded-lg border px-2.5 py-2 text-start transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35",
                                                door.issue_count > 0
                                                  ? "border-status-problem-border bg-status-problem-bg"
                                                  : "border-border bg-surface-subtle",
                                              )}
                                            >
                                              <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                  <div className="truncate text-[12px] font-semibold text-text">
                                                    <LtrText>
                                                      {door.door_marking}
                                                    </LtrText>
                                                  </div>
                                                  <div className="mt-0.5 truncate text-[11px] text-text-secondary">
                                                    <LtrText>
                                                      {door.unit_label}
                                                    </LtrText>
                                                  </div>
                                                </div>
                                                <StatusBadge
                                                  status={door.status}
                                                  label={tokenLabel(
                                                    door.status,
                                                  )}
                                                  domain="door"
                                                />
                                              </div>
                                              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10.5px] text-text-secondary">
                                                <span>
                                                  {locationLabel(
                                                    cell.location_code,
                                                  )}
                                                </span>
                                                <span>
                                                  {door.door_type_label}
                                                </span>
                                                <span>
                                                  {door.installer_id
                                                    ? t("projects.assigned")
                                                    : t("projects.unassigned")}
                                                </span>
                                              </div>
                                              {door.issue_count > 0 ? (
                                                <div className="mt-2 line-clamp-2 break-words text-[11px] text-status-problem-fg">
                                                  {door.issue_titles[0] ||
                                                    t("projects.openBlocker")}
                                                  {door.issue_count > 1
                                                    ? ` (+${door.issue_count - 1})`
                                                    : ""}
                                                </div>
                                              ) : null}
                                            </button>
                                          )),
                                        )}
                                      </div>

                                      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                                        <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                                          <div className={projectsMetricLabelClass}>
                                            {t("installerProject.installed")}
                                          </div>
                                          <div className="mt-1 text-[13px] font-medium text-text tabular-nums">
                                            {apartment.installed_count}
                                          </div>
                                        </div>
                                        <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                                          <div className={projectsMetricLabelClass}>
                                            {t("common.open")}
                                          </div>
                                          <div className="mt-1 text-[13px] font-medium text-text tabular-nums">
                                            {apartment.open_count}
                                          </div>
                                        </div>
                                        <div
                                          className={cn(
                                            "rounded-lg border px-2.5 py-2",
                                            apartment.issue_count > 0
                                              ? "border-status-problem-border bg-status-problem-bg"
                                              : "border-border bg-surface-subtle",
                                          )}
                                        >
                                          <div className={projectsMetricLabelClass}>
                                            {t("projects.blockers")}
                                          </div>
                                          <div
                                            className={cn(
                                              "mt-1 text-[13px] font-medium tabular-nums",
                                              apartment.issue_count > 0
                                                ? "text-status-problem-fg"
                                                : "text-text",
                                            )}
                                          >
                                            {apartment.issue_count}
                                          </div>
                                        </div>
                                      </div>
                                    </article>
                                  ))}
                                </div>

                                <div className="hidden overflow-auto md:block">
                                  <table className="w-full min-w-[920px] border-separate border-spacing-0 text-[12px]">
                                    <thead className="bg-surface-subtle text-text-secondary">
                                      <tr>
                                        <th className="px-3 py-2 text-start font-medium">
                                          {copy("Apartment", "Квартира", "דירה")}
                                        </th>
                                        <th className="px-3 py-2 text-start font-medium">
                                          {copy("Order", "Заказ", "הזמנה")}
                                        </th>
                                        {floor.location_codes.map(
                                          (locationCode) => (
                                            <th
                                              key={`${house.house_number}-${floor.floor_label}-${locationCode}`}
                                              className="px-3 py-2 text-start font-medium"
                                            >
                                              {locationLabel(locationCode)}
                                            </th>
                                          ),
                                        )}
                                        <th className="px-3 py-2 text-start font-medium">
                                          {t("projects.statusMix")}
                                        </th>
                                        <th className="px-3 py-2 text-start font-medium">
                                          {t("projects.blockers")}
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {floor.apartments.map((apartment) => (
                                        <tr
                                          key={`${house.house_number}-${floor.floor_label}-${apartment.apartment_number}`}
                                          className={cn(
                                            "align-top transition-colors hover:bg-surface-subtle",
                                            apartment.issue_count > 0 &&
                                              "bg-status-problem-bg",
                                          )}
                                        >
                                          <td className="px-3 py-3">
                                            <div className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-full bg-surface-sunken px-2 text-[12px] font-semibold text-text tabular-nums">
                                              <LtrText as="span">
                                                {apartment.apartment_number}
                                              </LtrText>
                                            </div>
                                            <div className="text-[11px] text-text-secondary mt-1">
                                              {t("projects.doorsCount").replace(
                                                "{count}",
                                                String(apartment.total_doors),
                                              )}
                                            </div>
                                          </td>
                                          <td className="px-3 py-3">
                                            <div className="flex flex-wrap gap-1.5">
                                              {apartment.order_numbers.map(
                                                (orderNumber) => (
                                                  <span
                                                    key={`${house.house_number}-${floor.floor_label}-${apartment.apartment_number}-${orderNumber}`}
                                                    className="rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] text-text"
                                                  >
                                                    <LtrText>
                                                      {orderNumber}
                                                    </LtrText>
                                                  </span>
                                                ),
                                              )}
                                            </div>
                                          </td>
                                          {floor.location_codes.map(
                                            (locationCode) => {
                                              const cell =
                                                apartment.cells.find(
                                                  (item) =>
                                                    item.location_code ===
                                                    locationCode,
                                                ) || null;
                                              return (
                                                <td
                                                  key={`${house.house_number}-${floor.floor_label}-${apartment.apartment_number}-${locationCode}`}
                                                  className="px-3 py-3 min-w-[220px]"
                                                >
                                                  {!cell ? (
                                                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-surface-sunken text-[12px] text-text-tertiary">
                                                      -
                                                    </span>
                                                  ) : (
                                                    <div className="space-y-2">
                                                      {cell.doors.map(
                                                        (door) => (
                                                          <button
                                                            key={door.door_id}
                                                            type="button"
                                                            data-testid={`project-matrix-door-card-${door.door_id}`}
                                                            aria-label={copy(
                                                              "Open door detail {door}",
                                                              "Открыть карточку двери {door}",
                                                              "פתח כרטיס דלת {door}",
                                                            ).replace(
                                                              "{door}",
                                                              door.door_marking,
                                                            )}
                                                            onClick={() =>
                                                              setFocusedDoorId(
                                                                door.door_id,
                                                              )
                                                            }
                                                            className={cn(
                                                              "w-full min-w-0 rounded-lg border px-2.5 py-2 text-start transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35",
                                                              door.issue_count >
                                                                0
                                                                ? "border-status-problem-border bg-status-problem-bg"
                                                                : "border-border bg-surface",
                                                            )}
                                                          >
                                                            <div className="flex items-start justify-between gap-2">
                                                              <div className="min-w-0">
                                                                <div className="truncate font-medium text-text">
                                                                  <LtrText>
                                                                    {
                                                                      door.door_marking
                                                                    }
                                                                  </LtrText>
                                                                </div>
                                                                <div className="truncate text-[11px] text-text-secondary">
                                                                  <LtrText>
                                                                    {
                                                                      door.unit_label
                                                                    }
                                                                  </LtrText>
                                                                </div>
                                                              </div>
                                                              <StatusBadge
                                                                status={
                                                                  door.status
                                                                }
                                                                label={tokenLabel(
                                                                  door.status,
                                                                )}
                                                                domain="door"
                                                                className="shrink-0"
                                                              />
                                                            </div>
                                                            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-text-secondary">
                                                              <span>
                                                                {
                                                                  door.door_type_label
                                                                }
                                                              </span>
                                                              <span>
                                                                {door.installer_id
                                                                  ? t(
                                                                      "projects.assigned",
                                                                    )
                                                                  : t(
                                                                      "projects.unassigned",
                                                                    )}
                                                              </span>
                                                            </div>
                                                            {door.issue_count >
                                                            0 ? (
                                                              <div className="mt-1 line-clamp-2 break-words text-[10px] text-status-problem-fg">
                                                                {door
                                                                  .issue_titles[0] ||
                                                                  t(
                                                                    "projects.openBlocker",
                                                                  )}
                                                                {door.issue_count >
                                                                1
                                                                  ? ` (+${door.issue_count - 1})`
                                                                : ""}
                                                              </div>
                                                            ) : null}
                                                          </button>
                                                        ),
                                                      )}
                                                    </div>
                                                  )}
                                                </td>
                                              );
                                            },
                                          )}
                                          <td className="px-3 py-3">
                                            <div className="flex flex-wrap gap-1.5">
                                              <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] text-text">
                                                {t(
                                                  "projects.installedShort",
                                                ).replace(
                                                  "{count}",
                                                  String(
                                                    apartment.installed_count,
                                                  ),
                                                )}
                                              </span>
                                              <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] text-text">
                                                {t(
                                                  "projects.openShort",
                                                ).replace(
                                                  "{count}",
                                                  String(apartment.open_count),
                                                )}
                                              </span>
                                            </div>
                                          </td>
                                          <td className="px-3 py-3">
                                            {apartment.issue_count > 0 ? (
                                              <span className="rounded-full border border-status-problem-border bg-status-problem-bg px-2.5 py-1 text-[11px] text-status-problem-fg">
                                                {t("projects.blockerCount")
                                                  .replace(
                                                    "{count}",
                                                    String(
                                                      apartment.issue_count,
                                                    ),
                                                  )
                                                  .replace(
                                                    "{suffix}",
                                                    apartment.issue_count > 1
                                                      ? "s"
                                                      : "",
                                                  )}
                                              </span>
                                            ) : (
                                              <span className="text-text-secondary">
                                                {t("projects.noBlockers")}
                                              </span>
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </article>
                              );
                            })}
                          </div>
                        </section>
                      ))}
                    </div>
                  )}

                  <div id="project-door-ledger" tabIndex={-1} className="mt-4 overflow-hidden rounded-lg border border-border bg-surface">
                    <div className="flex flex-col gap-3 border-b border-border bg-surface px-3 py-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className={projectsMetricLabelClass}>
                          {copy("Audit ledger", "Реестр контроля", "יומן בקרה")}
                        </div>
                        <div className="mt-1 text-[13px] font-semibold text-text">
                          {t("projects.doorLedgerTable")}
                        </div>
                        <div className="text-[11px] text-text-secondary">
                          {t("projects.doorLedgerSubtitle")}
                        </div>
                      </div>
                      <div className="inline-flex w-fit rounded-full border border-border bg-surface-subtle px-2.5 py-1 text-[11px] font-medium text-text-secondary">
                        {t("projects.rowsCount").replace(
                          "{count}",
                          String(filteredMatrixRows.length),
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 border-b border-border-subtle bg-surface-subtle px-3 py-3 md:grid-cols-4">
                      {[
                        {
                          label: copy("Visible", "Видимые", "מוצגות"),
                          value: filteredMatrixRows.length,
                        },
                        {
                          label: copy("Selected", "Выбрано", "נבחרו"),
                          value: selectedDoorIds.length,
                        },
                        {
                          label: t("projects.blockers"),
                          value: filteredMatrixSummary.issuesCount,
                        },
                        {
                          label: copy("Unassigned", "Без назначения", "לא שובצו"),
                          value: Math.max(
                            filteredMatrixRows.length -
                              filteredMatrixSummary.assignedCount,
                            0,
                          ),
                        },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="rounded-lg border border-border bg-surface px-2.5 py-2"
                        >
                          <div className={projectsMetricLabelClass}>
                            {item.label}
                          </div>
                          <div className="mt-1 text-[16px] font-semibold leading-none text-text tabular-nums">
                            {item.value}
                          </div>
                        </div>
                      ))}
                    </div>
                    {!ledgerDesktop && (
                    <div className="divide-y divide-border-subtle md:hidden">
                      {filteredMatrixRows.length === 0 ? (
                        <div className="px-3.5 py-4 text-[12px] text-text-secondary">
                          {copy(
                            "No doors for selected filters.",
                            "Нет дверей для выбранных фильтров.",
                            "אין דלתות עבור המסננים שנבחרו.",
                          )}
                        </div>
                      ) : (
                        visibleMatrixRows.map((row) => (
                          <div
                            key={row.door_id}
                            data-testid={`project-door-row-${row.door_id}`}
                            role="button"
                            tabIndex={0}
                            onClick={() => setFocusedDoorId(row.door_id)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                setFocusedDoorId(row.door_id);
                              }
                            }}
                            aria-label={copy(
                              "Open door ledger row {door}",
                              "Открыть строку реестра двери {door}",
                              "פתח שורת יומן דלת {door}",
                            ).replace("{door}", row.door_marking)}
                            className={cn(
                              "cursor-pointer px-3.5 py-3.5 transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35",
                              row.issue_count > 0 &&
                                "bg-status-problem-bg",
                              focusedDoorId === row.door_id &&
                                "bg-[var(--dmx-accent-tint)]",
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="truncate text-[13px] font-semibold text-text">
                                  <LtrText>{row.door_marking}</LtrText>
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                  <span className="inline-flex rounded-full bg-surface-sunken px-2 py-1 text-[10.5px] font-medium leading-none text-text-secondary">
                                    <LtrText>{row.order_number}</LtrText>
                                  </span>
                                  <span className="inline-flex rounded-full bg-surface-sunken px-2 py-1 text-[10.5px] font-medium leading-none text-text-secondary">
                                    {locationLabel(row.location_code)}
                                  </span>
                                </div>
                              </div>
                              <div className="flex shrink-0 flex-col items-end gap-2">
                                <input
                                  type="checkbox"
                                  aria-label={copy(
                                    "Select door {door}",
                                    "Выбрать дверь {door}",
                                    "בחר דלת {door}",
                                  ).replace("{door}", row.unit_label)}
                                  checked={selectedDoorIdSet.has(row.door_id)}
                                  disabled={!canManageProjects}
                                  onClick={(event) => event.stopPropagation()}
                                  onChange={() =>
                                    toggleDoorSelection(row.door_id)
                                  }
                                  className="h-4 w-4 rounded border-border text-accent focus:ring-accent/30"
                                />
                                <StatusBadge
                                  status={row.status}
                                  label={tokenLabel(row.status)}
                                  domain="door"
                                />
                              </div>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                                <div className={projectsMetricLabelClass}>
                                  {t("projects.unit")}
                                </div>
                                <div className="mt-1 truncate text-[12px] font-medium text-text">
                                  <LtrText>{row.unit_label}</LtrText>
                                </div>
                              </div>
                              <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                                <div className={projectsMetricLabelClass}>
                                  {t("projects.doorType")}
                                </div>
                                <div className="mt-1 truncate text-[12px] font-medium text-text">
                                  {row.door_type_label}
                                </div>
                              </div>
                              <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                                <div className={projectsMetricLabelClass}>
                                  {t("projects.houseLabel")}
                                </div>
                                <div className="mt-1 text-[12px] font-medium text-text">
                                  <LtrText>{row.house_number}</LtrText>
                                </div>
                              </div>
                              <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                                <div className={projectsMetricLabelClass}>
                                  {t("projects.floorLabel")}
                                </div>
                                <div className="mt-1 text-[12px] font-medium text-text">
                                  <LtrText>{row.floor_label}</LtrText>
                                </div>
                              </div>
                            </div>
                            <div className="mt-3 rounded-lg border border-border bg-surface-subtle px-3 py-2 text-[12px] text-text-secondary">
                              {t("projects.apt")}:{" "}
                              <LtrText>{row.apartment_number}</LtrText>
                              <span className="mx-2 text-border-strong">|</span>
                              {t("projects.blockers")}:{" "}
                              <LtrText>{String(row.issue_count)}</LtrText>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    )}
                    {ledgerDesktop && (
                    <div className="hidden overflow-auto md:block">
                      <table className="w-full min-w-[980px] border-separate border-spacing-0 text-[12px] leading-5">
                        <thead className="bg-surface-subtle text-text-secondary">
                          <tr>
                            <th className="w-10 px-2 py-2 text-start font-medium">
                              <input
                                type="checkbox"
                                aria-label={copy(
                                  "Select visible doors",
                                  "Выбрать видимые двери",
                                  "בחר דלתות מוצגות",
                                )}
                                checked={allFilteredDoorsSelected}
                                disabled={!canManageProjects || filteredDoorIds.length === 0}
                                onChange={toggleFilteredDoorSelection}
                                className="h-4 w-4 rounded border-border text-accent focus:ring-accent/30"
                              />
                            </th>
                            <th className="px-2 py-2 text-start font-medium">
                              {copy(
                                "Order Number",
                                "Номер заказа",
                                "מספר הזמנה",
                              )}
                            </th>
                            <th className="px-2 py-2 text-start font-medium">
                              {t("projects.houseLabel")}
                            </th>
                            <th className="px-2 py-2 text-start font-medium">
                              {t("projects.floorLabel")}
                            </th>
                            <th className="px-2 py-2 text-start font-medium">
                              {t("projects.apt")}
                            </th>
                            <th className="px-2 py-2 text-start font-medium">
                              {t("projects.location")}
                            </th>
                            <th className="px-2 py-2 text-start font-medium">
                              {t("projects.marking")}
                            </th>
                            <th className="px-2 py-2 text-start font-medium">
                              {t("projects.doorType")}
                            </th>
                            <th className="px-2 py-2 text-start font-medium">
                              {t("projects.unit")}
                            </th>
                            <th className="px-2 py-2 text-start font-medium">
                              {t("common.status")}
                            </th>
                            <th className="px-2 py-2 text-start font-medium">
                              {t("projects.blockers")}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredMatrixRows.length === 0 ? (
                            <tr>
                              <td
                                className="px-2 py-4 text-text-secondary"
                                colSpan={11}
                              >
                                {copy(
                                  "No doors for selected filters.",
                                  "Нет дверей для выбранных фильтров.",
                                  "אין דלתות עבור המסננים שנבחרו.",
                                )}
                              </td>
                            </tr>
                          ) : (
                            visibleMatrixRows.map((row) => (
                              <tr
                                key={row.door_id}
                                data-testid={`project-door-table-row-${row.door_id}`}
                                tabIndex={0}
                                aria-selected={focusedDoorId === row.door_id}
                                onClick={() => setFocusedDoorId(row.door_id)}
                                onKeyDown={(event) => {
                                  if (
                                    event.key === "Enter" ||
                                    event.key === " "
                                  ) {
                                    event.preventDefault();
                                    setFocusedDoorId(row.door_id);
                                  }
                                }}
                                className={cn(
                                  "cursor-pointer border-t border-border transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/35",
                                  row.issue_count > 0 &&
                                    "bg-status-problem-bg",
                                  focusedDoorId === row.door_id &&
                                    "bg-[var(--dmx-accent-tint)]",
                                )}
                              >
                                <td className="px-2 py-1.5">
                                  <input
                                    type="checkbox"
                                    aria-label={copy(
                                      "Select door {door}",
                                      "Выбрать дверь {door}",
                                      "בחר דלת {door}",
                                    ).replace("{door}", row.unit_label)}
                                    checked={selectedDoorIdSet.has(row.door_id)}
                                    disabled={!canManageProjects}
                                    onClick={(event) => event.stopPropagation()}
                                    onChange={() =>
                                      toggleDoorSelection(row.door_id)
                                    }
                                    className="h-4 w-4 rounded border-border text-accent focus:ring-accent/30"
                                  />
                                </td>
                                <td className="px-2 py-1.5">
                                  <LtrText>{row.order_number}</LtrText>
                                </td>
                                <td className="px-2 py-1.5">
                                  <LtrText>{row.house_number}</LtrText>
                                </td>
                                <td className="px-2 py-1.5">
                                  <LtrText>{row.floor_label}</LtrText>
                                </td>
                                <td className="px-2 py-1.5">
                                  <LtrText>{row.apartment_number}</LtrText>
                                </td>
                                <td className="px-2 py-1.5">
                                  {locationLabel(row.location_code)}
                                </td>
                                <td className="px-2 py-1.5">
                                  <button
                                    type="button"
                                    aria-label={copy("Open door {door}", "Открыть дверь {door}", "פתח דלת {door}").replace("{door}", row.door_marking)}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setFocusedDoorId(row.door_id);
                                    }}
                                    className="inline-flex max-w-[140px] items-center rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-semibold text-text hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
                                  >
                                    <LtrText as="span" className="truncate">
                                      {row.door_marking}
                                    </LtrText>
                                  </button>
                                </td>
                                <td className="px-2 py-1.5">
                                  {row.door_type_label}
                                </td>
                                <td className="px-2 py-1.5">
                                  <LtrText>{row.unit_label}</LtrText>
                                </td>
                                <td className="px-2 py-1.5">
                                  <StatusBadge
                                    status={row.status}
                                    label={tokenLabel(row.status)}
                                    domain="door"
                                  />
                                </td>
                                <td className="px-2 py-1.5">
                                  {row.issue_count > 0 ? (
                                    <span className="text-status-problem-fg">
                                      <LtrText>{row.issue_count}</LtrText>
                                    </span>
                                  ) : (
                                    <span className="text-text-secondary">
                                      <LtrText>0</LtrText>
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                    )}
                    {hiddenMatrixRows > 0 && (
                      <div
                        data-testid="project-door-ledger-more"
                        className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle px-3.5 py-3 text-[12px] text-text-secondary"
                      >
                        <span>
                          {copy("Showing {shown} of {total} doors", "Показано {shown} из {total} дверей", "מוצגות {shown} מתוך {total} דלתות")
                            .replace("{shown}", String(visibleMatrixRows.length))
                            .replace("{total}", String(filteredMatrixRows.length))}
                        </span>
                        <button
                          type="button"
                          className="dmx-secondary-action"
                          onClick={() => setLedgerRowLimit((limit) => limit + LEDGER_ROW_PAGE)}
                        >
                          {copy("Show {n} more", "Показать ещё {n}", "הצג עוד {n}").replace(
                            "{n}",
                            String(Math.min(LEDGER_ROW_PAGE, hiddenMatrixRows)),
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

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
        key={projectDialogSession}
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

      <Dialog
        open={manualDoorDialogOpen}
        onOpenChange={setManualDoorDialogOpen}
      >
        <DialogContent className="max-w-[840px]">
          <DialogHeader>
            <DialogTitle>
              {copy(
                "Add door manually",
                "Добавить дверь вручную",
                "הוסף דלת ידנית",
              )}
            </DialogTitle>
            <DialogDescription>
              {copy(
                "Create one operational door row directly in the selected project using a product from Library.",
                "Создайте один ряд эксплуатационных дверей непосредственно в выбранном проекте с помощью продукта из справочник.",
                "צור רשומת דלת תפעולית ישירות בפרויקט הנבחר בעזרת מוצר מהספרייה.",
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="manual-door-product">
                {copy("Library product", "Библиотечный продукт", "מוצר ספרייה")}
              </Label>
              <select
                id="manual-door-product"
                value={manualDoorForm.product_id}
                onChange={(event) =>
                  setManualDoorForm((prev) => ({
                    ...prev,
                    product_id: event.target.value,
                    install_type:
                      activeLibraryProducts.find(
                        (item) => item.id === event.target.value,
                      )?.install_type || prev.install_type,
                  }))
                }
                className="control-input"
              >
                <option value="">
                  {copy("Choose a product", "Выберите продукт", "בחר מוצר")}
                </option>
                {activeLibraryProducts.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.sku} -{" "}
                    {locale === "he"
                      ? item.name_he || item.name_ru
                      : item.name_ru || item.name_he}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-door-code">
                {copy("Door code", "Код двери", "קוד דלת")}
              </Label>
              <Input
                id="manual-door-code"
                value={manualDoorForm.door_code}
                onChange={(event) =>
                  setManualDoorForm((prev) => ({
                    ...prev,
                    door_code: event.target.value,
                  }))
                }
                placeholder={copy("D-1201", "D-1201", "D-1201")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-door-unit">
                {copy("Unit / apartment", "Единица/квартира", "יחידה/דירה")}
              </Label>
              <Input
                id="manual-door-unit"
                value={manualDoorForm.unit}
                onChange={(event) =>
                  setManualDoorForm((prev) => ({
                    ...prev,
                    unit: event.target.value,
                  }))
                }
                placeholder={copy("12-04", "12-04", "12-04")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-door-floor">
                {copy("Floor", "Этаж", "קומה")}
              </Label>
              <Input
                id="manual-door-floor"
                value={manualDoorForm.floor}
                onChange={(event) =>
                  setManualDoorForm((prev) => ({
                    ...prev,
                    floor: event.target.value,
                  }))
                }
                placeholder={copy("12", "12", "12")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-door-location">
                {copy("Location code", "Код локации", "קוד מיקום")}
              </Label>
              <Input
                id="manual-door-location"
                value={manualDoorForm.location_code}
                onChange={(event) =>
                  setManualDoorForm((prev) => ({
                    ...prev,
                    location_code: event.target.value,
                  }))
                }
                placeholder={copy("dira", "dira", "dira")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-door-order">
                {copy("Order number", "Номер заказа", "מספר הזמנה")}
              </Label>
              <Input
                id="manual-door-order"
                value={manualDoorForm.order_number}
                onChange={(event) =>
                  setManualDoorForm((prev) => ({
                    ...prev,
                    order_number: event.target.value,
                  }))
                }
                placeholder={copy("AZ-5001", "AZ-5001", "AZ-5001")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-door-install-type">
                {copy("Install type", "Тип монтажа", "סוג התקנה")}
              </Label>
              <Input
                id="manual-door-install-type"
                value={manualDoorForm.install_type}
                onChange={(event) =>
                  setManualDoorForm((prev) => ({
                    ...prev,
                    install_type: event.target.value,
                  }))
                }
                placeholder={copy("service", "service", "service")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-door-installer">
                {copy(
                  "Assigned installer",
                  "Назначенный монтажник",
                  "מתקין משויך",
                )}
              </Label>
              <select
                id="manual-door-installer"
                disabled={!installersReference.ready}
                value={manualDoorForm.assigned_installer_id}
                onChange={(event) =>
                  setManualDoorForm((prev) => ({
                    ...prev,
                    assigned_installer_id: event.target.value,
                  }))
                }
                className="control-input"
              >
                <option value="">
                  {copy(
                    "Leave unassigned",
                    "Оставить без назначения",
                    "השאר ללא שיוך",
                  )}
                </option>
                {activeInstallers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.full_name}
                    {item.email ? ` - ${item.email}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-door-date">
                {copy(
                  "Planned install date",
                  "Плановая дата монтажа",
                  "תאריך התקנה מתוכנן",
                )}
              </Label>
              <Input
                id="manual-door-date"
                type="date"
                value={manualDoorForm.planned_install_date}
                onChange={(event) =>
                  setManualDoorForm((prev) => ({
                    ...prev,
                    planned_install_date: event.target.value,
                  }))
                }
              />
            </div>
          </div>

          <label className="checkbox-row mt-3">
            <input
              type="checkbox"
              checked={manualDoorForm.is_critical}
              onChange={(event) =>
                setManualDoorForm((prev) => ({
                  ...prev,
                  is_critical: event.target.checked,
                }))
              }
            />
            {copy(
              "Mark as critical door",
              "Отметить как критичную дверь",
              "סמן כדלת קריטית",
            )}
          </label>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setManualDoorDialogOpen(false)}
              disabled={manualDoorSubmitting}
            >
              {copy("Cancel", "Отмена", "ביטול")}
            </Button>
            <Button
              onClick={() => void handleManualDoorSubmit()}
              disabled={manualDoorSubmitting || !libraryReference.ready ||
                Boolean(manualDoorForm.assigned_installer_id && !installersReference.ready)}
            >
              {manualDoorSubmitting
                ? copy("Saving...", "Сохраняем...", "שומר...")
                : copy("Create door", "Создать дверь", "צור דלת")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
