import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  FileSpreadsheet,
  FilterX,
  Layers3,
  RefreshCw,
  Search,
  Upload,
} from "lucide-react";

import { DashboardLayout } from "@/components/DashboardLayout";
import { apiFetch } from "@/lib/api";
import { useI18n, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const projectsOverrides: Partial<Record<Locale, Record<string, string>>> = {
  he: {
    "projects.activeScope": "הקשר פעיל",
    "projects.portfolioOverview": "מבט על הפורטפוליו",
    "projects.selectProjectHint": "בחר פרויקט כדי לעדכן יבוא, רווחיות וסיכונים.",
    "projects.queue": "תור",
    "projects.retryFailed": "נסה שוב כושלים",
    "projects.reconcileAll": "התאמה מלאה",
    "projects.reportsHandoff": "זוהו {count} פרויקטים מהדו\"ח עם יבואים כושלים.",
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
    "projects.lastRetryBatch": "ניסיון אחרון: {success} הצליחו, {failed} נכשלו, {skipped} דולגו",
    "projects.loadingFailedQueue": "טוען תור יבואים כושלים...",
    "projects.noFailedQueue": "אין כרגע יבואים כושלים.",
  },
};

type ProjectListItem = {
  id: string;
  name: string;
  address: string;
  status: string;
};

type ProjectOpenIssue = {
  id: string;
  door_id: string;
  status: string;
  title: string | null;
  details: string | null;
};

type ProjectDetailsResponse = {
  id?: string;
  name?: string;
  address?: string;
  status?: string;
  developer_company?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  issues_open?: ProjectOpenIssue[];
};

type DoorType = {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
};

type LayoutDoor = {
  id: string;
  unit_label: string;
  door_type_id: string;
  order_number: string | null;
  apartment_number: string | null;
  location_code: string | null;
  door_marking: string | null;
  status: string;
  installer_id: string | null;
};

type LayoutBucket = {
  order_number: string | null;
  house_number: string | null;
  floor_label: string | null;
  location_code: string | null;
  door_marking: string | null;
  total: number;
  status_breakdown: Record<string, number>;
  doors: LayoutDoor[];
};

type ProjectDoorsLayoutResponse = {
  project_id: string;
  total_doors: number;
  buckets: LayoutBucket[];
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

type ImportRequiredFieldDiagnostics = {
  field_key: string;
  display_name: string;
  found: boolean;
  matched_columns: string[];
};

type ImportColumnsDiagnostics = {
  required_fields: ImportRequiredFieldDiagnostics[];
  recognized_columns: string[];
  unmapped_columns: string[];
  mapping_profile?: string | null;
  strict_required_fields?: boolean | null;
  missing_required_fields?: string[];
  data_summary?: {
    source_rows: number;
    prepared_rows: number;
    rows_with_errors: number;
    duplicate_rows_skipped: number;
    unique_order_numbers: number;
    unique_houses: number;
    unique_floors: number;
    unique_apartments: number;
    unique_locations: number;
    unique_markings: number;
  } | null;
  preview_groups?: Array<{
    order_number: string | null;
    house_number: string | null;
    floor_label: string | null;
    apartment_number: string | null;
    door_marking: string | null;
    door_count: number;
    location_codes: string[];
  }>;
};

type ImportResult = {
  parsed_rows: number;
  prepared_rows: number;
  imported: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
  diagnostics?: ImportColumnsDiagnostics | null;
  mode?: "analyze" | "import" | string;
  would_import?: number;
  would_skip?: number;
  idempotency_hit?: boolean;
};

type ImportMappingProfile = {
  code: string;
  name: string;
  description: string;
  preferred_delimiter: string | null;
};

type ImportMappingProfilesResponse = {
  default_code: string;
  items: ImportMappingProfile[];
};

type ProjectImportRunItem = {
  id: string;
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
  idempotency_hit: boolean;
  retry_available: boolean;
  last_error?: string | null;
};

type ProjectImportRunsResponse = {
  items: ProjectImportRunItem[];
};

type ProjectImportRunDetails = ProjectImportRunItem & {
  errors: Array<{ row: number; message: string }>;
  diagnostics?: ImportColumnsDiagnostics | null;
  would_import?: number;
  would_skip?: number;
};

type BulkReconcileItem = {
  project_id: string;
  source_run_id: string | null;
  status: string;
  imported: number;
  skipped: number;
  errors_count: number;
  last_error?: string | null;
};

type BulkReconcileResponse = {
  items: BulkReconcileItem[];
  total_projects: number;
  successful_projects: number;
  failed_projects: number;
  skipped_projects: number;
};

type LatestImportReviewItem = {
  project_id: string;
  project_name: string;
  source_run_id: string | null;
  mode: string | null;
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

type LatestImportReviewResponse = {
  items: LatestImportReviewItem[];
  total_projects: number;
  reviewable_projects: number;
  failed_or_partial_projects: number;
  skipped_projects: number;
};

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

const STATUS_CLASS: Record<string, string> = {
  INSTALLED: "bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]",
  NOT_INSTALLED: "bg-[hsl(var(--warning)/0.14)] text-[hsl(var(--warning-foreground))]",
  PROBLEM: "bg-[hsl(var(--destructive)/0.12)] text-[hsl(var(--destructive))]",
};

const LOCATION_LABELS: Record<string, string> = {
  dira: "Dira",
  mamad: "Mamad",
  madregot: "Madregot",
  mahzan: "Mahsan",
  heder_ashpa: "Heder Ashpa",
  lobby_maalit: "Lobby Maalit",
};

const FAILED_QUEUE_PAGE_SIZE = 10;

function locationLabel(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }
  return LOCATION_LABELS[value] || value;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

function formatMoney(value: number | null | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPct(value: number | null | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }
  return `${value.toFixed(1)}%`;
}

function compareNatural(valueA: string, valueB: string): number {
  return valueA.localeCompare(valueB, "en", { numeric: true, sensitivity: "base" });
}

function statusTone(status: string): string {
  return STATUS_CLASS[status] || "bg-muted text-muted-foreground";
}

function riskTone(value: string): string {
  const normalized = value.trim().toUpperCase();
  if (["DANGER", "FAILED", "BLOCKED", "ERROR"].includes(normalized)) {
    return "bg-[hsl(var(--destructive)/0.12)] text-[hsl(var(--destructive))]";
  }
  if (["WARN", "AT_RISK", "UNASSIGNED"].includes(normalized)) {
    return "bg-[hsl(var(--warning)/0.14)] text-[hsl(var(--warning-foreground))]";
  }
  if (["OK", "READY", "DONE"].includes(normalized)) {
    return "bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]";
  }
  return "bg-muted text-muted-foreground";
}

function issueLabel(issue: ProjectOpenIssue): string {
  const parts = [issue.title, issue.details].filter((value) => !!value && value.trim().length > 0);
  if (parts.length === 0) {
    return issue.status;
  }
  return parts.join(" - ");
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

export default function ProjectsPage() {
  const { locale, t } = useI18n();
  const tt = (key: string) => projectsOverrides[locale]?.[key] ?? t(key);
  const searchParams = useSearchParams();
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [doorTypes, setDoorTypes] = useState<DoorType[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectDetails, setProjectDetails] = useState<ProjectDetailsResponse | null>(null);
  const [layout, setLayout] = useState<ProjectDoorsLayoutResponse | null>(null);
  const [projectPlanFact, setProjectPlanFact] = useState<ProjectPlanFactResponse | null>(null);
  const [projectRisk, setProjectRisk] = useState<ProjectRiskDrilldownResponse | null>(null);
  const [search, setSearch] = useState("");
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingDoorTypes, setLoadingDoorTypes] = useState(false);
  const [loadingProjectDetails, setLoadingProjectDetails] = useState(false);
  const [loadingLayout, setLoadingLayout] = useState(false);
  const [loadingProjectPlanFact, setLoadingProjectPlanFact] = useState(false);
  const [loadingProjectRisk, setLoadingProjectRisk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [importFile, setImportFile] = useState<File | null>(null);
  const [defaultDoorTypeId, setDefaultDoorTypeId] = useState("");
  const [delimiter, setDelimiter] = useState("");
  const [mappingProfiles, setMappingProfiles] = useState<ImportMappingProfile[]>([]);
  const [mappingProfile, setMappingProfile] = useState("auto_v1");
  const [loadingMappingProfiles, setLoadingMappingProfiles] = useState(false);
  const [createMissingDoorTypes, setCreateMissingDoorTypes] = useState(true);
  const [importLoading, setImportLoading] = useState(false);
  const [importAction, setImportAction] = useState<"analyze" | "import" | null>(null);
  const [analysisReady, setAnalysisReady] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importHistory, setImportHistory] = useState<ProjectImportRunItem[]>([]);
  const [loadingImportHistory, setLoadingImportHistory] = useState(false);
  const [importHistoryModeFilter, setImportHistoryModeFilter] = useState("all");
  const [importHistoryStatusFilter, setImportHistoryStatusFilter] = useState("all");
  const [retryingRunId, setRetryingRunId] = useState<string | null>(null);
  const [bulkSelectedProjectIds, setBulkSelectedProjectIds] = useState<string[]>([]);
  const [bulkOnlyFailedRuns, setBulkOnlyFailedRuns] = useState(false);
  const [bulkReviewLoading, setBulkReviewLoading] = useState(false);
  const [bulkReviewResult, setBulkReviewResult] = useState<LatestImportReviewResponse | null>(null);
  const [bulkReconcileLoading, setBulkReconcileLoading] = useState(false);
  const [bulkReconcileResult, setBulkReconcileResult] = useState<BulkReconcileResponse | null>(null);
  const [failedQueue, setFailedQueue] = useState<FailedImportQueueResponse | null>(null);
  const [failedQueueOffset, setFailedQueueOffset] = useState(0);
  const [failedQueueOnlySelectedProject, setFailedQueueOnlySelectedProject] = useState(false);
  const [loadingFailedQueue, setLoadingFailedQueue] = useState(false);
  const [selectedFailedRunIds, setSelectedFailedRunIds] = useState<string[]>([]);
  const [retryFailedBatchSize, setRetryFailedBatchSize] = useState(10);
  const [retryFailedProgress, setRetryFailedProgress] = useState<{
    active: boolean;
    total: number;
    processed: number;
    successful: number;
    failed: number;
    skipped: number;
  } | null>(null);
  const [retryFailedSummary, setRetryFailedSummary] = useState<RetryFailedRunsResponse | null>(null);
  const [focusedImportRunId, setFocusedImportRunId] = useState<string | null>(null);
  const [focusedImportRunDetails, setFocusedImportRunDetails] =
    useState<ProjectImportRunDetails | null>(null);
  const [loadingImportRunDetails, setLoadingImportRunDetails] = useState(false);
  const [deepLinkApplied, setDeepLinkApplied] = useState(false);
  const [matrixHouse, setMatrixHouse] = useState("all");
  const [matrixOrderNumber, setMatrixOrderNumber] = useState("all");
  const [matrixFloor, setMatrixFloor] = useState("all");
  const [matrixLocation, setMatrixLocation] = useState("all");
  const [matrixDoorType, setMatrixDoorType] = useState("all");
  const [matrixStatus, setMatrixStatus] = useState("all");
  const [matrixApartmentSearch, setMatrixApartmentSearch] = useState("");
  const [matrixMarkingSearch, setMatrixMarkingSearch] = useState("");

  const deepLinkProjectId = (searchParams?.get("project_id") || "").trim();
  const deepLinkFailedIds = useMemo(
    () => parseIdsCsv(searchParams?.get("failed_project_ids") || null),
    [searchParams]
  );
  const deepLinkOnlyFailed = searchParams?.get("only_failed_runs") === "1";
  const failedQueueCanPrev = failedQueueOffset > 0;
  const failedQueueCanNext =
    (failedQueueOffset + FAILED_QUEUE_PAGE_SIZE) < (failedQueue?.total || 0);

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return projects;
    }
    return projects.filter((p) =>
      `${p.name} ${p.address} ${p.status}`.toLowerCase().includes(q)
    );
  }, [projects, search]);

  const filteredProjectIds = useMemo(
    () => filteredProjects.map((p) => p.id),
    [filteredProjects]
  );

  const allFilteredSelected = useMemo(
    () =>
      filteredProjectIds.length > 0 &&
      filteredProjectIds.every((id) => bulkSelectedProjectIds.includes(id)),
    [filteredProjectIds, bulkSelectedProjectIds]
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
    return ids.length > 0 && ids.every((id) => selectedFailedRunIds.includes(id));
  }, [failedQueue, selectedFailedRunIds]);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) || null,
    [projects, selectedProjectId]
  );

  const filteredImportHistory = useMemo(() => {
    return importHistory.filter((run) => {
      if (importHistoryStatusFilter !== "all" && run.status !== importHistoryStatusFilter) {
        return false;
      }
      return true;
    });
  }, [importHistory, importHistoryStatusFilter]);

  const floorGroups = useMemo(() => {
    if (!layout) {
      return [];
    }
    const byFloor = new Map<string, { floor: string; total: number; buckets: LayoutBucket[] }>();
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
    return [...byFloor.values()].sort((a, b) => a.floor.localeCompare(b.floor, "en"));
  }, [layout]);

  const doorTypeLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of doorTypes) {
      map.set(item.id, `${item.code} - ${item.name}`);
    }
    return map;
  }, [doorTypes]);

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
          door_type_label: doorTypeLabelById.get(door.door_type_id) || door.door_type_id,
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
  }, [layout, doorTypeLabelById, issuesByDoorId]);

  const matrixHouseOptions = useMemo(
    () => Array.from(new Set(matrixRows.map((x) => x.house_number))).sort(compareNatural),
    [matrixRows]
  );
  const matrixOrderNumberOptions = useMemo(
    () =>
      Array.from(new Set(matrixRows.map((x) => x.order_number))).sort(compareNatural),
    [matrixRows]
  );
  const matrixFloorOptions = useMemo(
    () => Array.from(new Set(matrixRows.map((x) => x.floor_label))).sort(compareNatural),
    [matrixRows]
  );
  const matrixLocationOptions = useMemo(
    () => Array.from(new Set(matrixRows.map((x) => x.location_code))).sort(compareNatural),
    [matrixRows]
  );
  const matrixDoorTypeOptions = useMemo(
    () =>
      Array.from(new Set(matrixRows.map((x) => x.door_type_id)))
        .map((id) => ({
          id,
          label: doorTypeLabelById.get(id) || id,
        }))
        .sort((a, b) => compareNatural(a.label, b.label)),
    [matrixRows, doorTypeLabelById]
  );
  const matrixStatusOptions = useMemo(
    () => Array.from(new Set(matrixRows.map((x) => x.status))).sort(compareNatural),
    [matrixRows]
  );

  const filteredMatrixRows = useMemo(() => {
    const aptQ = matrixApartmentSearch.trim().toLowerCase();
    const markingQ = matrixMarkingSearch.trim().toLowerCase();
    return matrixRows.filter((row) => {
      if (matrixOrderNumber !== "all" && row.order_number !== matrixOrderNumber) return false;
      if (matrixHouse !== "all" && row.house_number !== matrixHouse) return false;
      if (matrixFloor !== "all" && row.floor_label !== matrixFloor) return false;
      if (matrixLocation !== "all" && row.location_code !== matrixLocation) return false;
      if (matrixDoorType !== "all" && row.door_type_id !== matrixDoorType) return false;
      if (matrixStatus !== "all" && row.status !== matrixStatus) return false;
      if (aptQ && !row.apartment_number.toLowerCase().includes(aptQ)) return false;
      if (markingQ && !row.door_marking.toLowerCase().includes(markingQ)) return false;
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
    matrixApartmentSearch,
    matrixMarkingSearch,
  ]);

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
      uniqueApartments.add(`${row.house_number}::${row.floor_label}::${row.apartment_number}`);
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
            location_codes: Array.from(floor.location_codes).sort(compareNatural),
            total_doors: floor.total_doors,
            issue_count: floor.issue_count,
            installed_count: floor.installed_count,
            open_count: floor.open_count,
            apartments: Array.from(floor.apartments.values())
              .sort((a, b) => compareNatural(a.apartment_number, b.apartment_number))
              .map<MatrixApartmentGroup>((apartment) => ({
                apartment_number: apartment.apartment_number,
                order_numbers: Array.from(apartment.order_numbers).sort(compareNatural),
                total_doors: apartment.total_doors,
                issue_count: apartment.issue_count,
                installed_count: apartment.installed_count,
                open_count: apartment.open_count,
                cells: Array.from(apartment.cells.values())
                  .sort((a, b) => compareNatural(a.location_code, b.location_code))
                  .map<MatrixCell>((cell) => ({
                    location_code: cell.location_code,
                    door_count: cell.doors.length,
                    issue_count: cell.issue_count,
                    statuses: cell.statuses,
                    doors: [...cell.doors].sort((a, b) => compareNatural(a.unit_label, b.unit_label)),
                  })),
              })),
          })),
      }));
  }, [filteredMatrixRows]);

  const renderImportPreviewGroups = (
    diagnostics?: ImportColumnsDiagnostics | null,
    title = t("projects.projectStructurePreview")
  ) => {
    const previewGroups = diagnostics?.preview_groups || [];
    if (previewGroups.length === 0) {
      return null;
    }
    return (
      <div className="mt-2">
        <div className="text-muted-foreground">{title}</div>
        <div className="mt-1 overflow-auto rounded-md border border-border">
          <table className="w-full text-[11px]">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="text-left px-2 py-1.5 font-medium">מספר הזמנה</th>
                <th className="text-left px-2 py-1.5 font-medium">בניין</th>
                <th className="text-left px-2 py-1.5 font-medium">קומה</th>
                <th className="text-left px-2 py-1.5 font-medium">דירה</th>
                <th className="text-left px-2 py-1.5 font-medium">דגם כנף</th>
                <th className="text-left px-2 py-1.5 font-medium">Locations</th>
                <th className="text-left px-2 py-1.5 font-medium">Doors</th>
              </tr>
            </thead>
            <tbody>
              {previewGroups.map((group, index) => (
                <tr
                  key={`${group.order_number || "-"}-${group.house_number || "-"}-${group.floor_label || "-"}-${group.apartment_number || "-"}-${group.door_marking || "-"}-${index}`}
                  className="row-hover border-t border-border/70"
                >
                  <td className="px-2 py-1.5">{group.order_number || "-"}</td>
                  <td className="px-2 py-1.5">{group.house_number || "-"}</td>
                  <td className="px-2 py-1.5">{group.floor_label || "-"}</td>
                  <td className="px-2 py-1.5">{group.apartment_number || "-"}</td>
                  <td className="px-2 py-1.5">{group.door_marking || "-"}</td>
                  <td className="px-2 py-1.5">
                    {group.location_codes.length > 0
                      ? group.location_codes.map((code) => locationLabel(code)).join(", ")
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

  const loadProjects = async () => {
    setLoadingProjects(true);
    setError(null);
    try {
      const response = await apiFetch<{ items: ProjectListItem[] }>("/api/v1/admin/projects");
      const items = response.items || [];
      setProjects(items);
      const ids = new Set(items.map((x) => x.id));
      setBulkSelectedProjectIds((prev) => prev.filter((id) => ids.has(id)));
      if (selectedProjectId && ids.has(selectedProjectId)) {
        // keep current selection
      } else if (items.length > 0) {
        setSelectedProjectId(items[0].id);
      } else {
        setSelectedProjectId(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("projects.failedLoadProjects"));
    } finally {
      setLoadingProjects(false);
    }
  };

  const loadDoorTypes = async () => {
    setLoadingDoorTypes(true);
    setError(null);
    try {
      const response = await apiFetch<DoorType[]>("/api/v1/admin/door-types?is_active=true&limit=500");
      setDoorTypes(response || []);
    } catch (e) {
      setDoorTypes([]);
      setError(e instanceof Error ? e.message : t("projects.failedLoadDoorTypes"));
    } finally {
      setLoadingDoorTypes(false);
    }
  };

  const loadMappingProfiles = async () => {
    setLoadingMappingProfiles(true);
    try {
      const response = await apiFetch<ImportMappingProfilesResponse>(
        "/api/v1/admin/projects/import-mapping-profiles"
      );
      const items = Array.isArray(response.items) ? response.items : [];
      setMappingProfiles(items);
      if (response.default_code && items.some((x) => x.code === response.default_code)) {
        setMappingProfile(response.default_code);
      } else if (items.length > 0 && !items.some((x) => x.code === mappingProfile)) {
        setMappingProfile(items[0].code);
      }
    } catch {
      setMappingProfiles([]);
      setMappingProfile("auto_v1");
    } finally {
      setLoadingMappingProfiles(false);
    }
  };

  const loadProjectDetails = async (projectId: string) => {
    setLoadingProjectDetails(true);
    try {
      const response = await apiFetch<ProjectDetailsResponse>(
        `/api/v1/admin/projects/${projectId}`
      );
      setProjectDetails(response || null);
    } catch {
      setProjectDetails(null);
    } finally {
      setLoadingProjectDetails(false);
    }
  };

  const loadLayout = async (projectId: string) => {
    setLoadingLayout(true);
    setError(null);
    try {
      const response = await apiFetch<ProjectDoorsLayoutResponse>(
        `/api/v1/admin/projects/${projectId}/doors/layout`
      );
      setLayout(response);
    } catch (e) {
      setLayout(null);
      setError(e instanceof Error ? e.message : t("projects.failedLoadLayout"));
    } finally {
      setLoadingLayout(false);
    }
  };

  const loadProjectPlanFact = async (projectId: string) => {
    setLoadingProjectPlanFact(true);
    try {
      const response = await apiFetch<ProjectPlanFactResponse>(
        `/api/v1/admin/reports/project-plan-fact/${projectId}`
      );
      setProjectPlanFact(
        response && typeof response.project_id === "string" ? response : null
      );
    } catch {
      setProjectPlanFact(null);
    } finally {
      setLoadingProjectPlanFact(false);
    }
  };

  const loadProjectRisk = async (projectId: string) => {
    setLoadingProjectRisk(true);
    try {
      const response = await apiFetch<ProjectRiskDrilldownResponse>(
        `/api/v1/admin/reports/project-risk-drilldown/${projectId}?limit=5`
      );
      setProjectRisk(
        response && typeof response.project_id === "string" ? response : null
      );
    } catch {
      setProjectRisk(null);
    } finally {
      setLoadingProjectRisk(false);
    }
  };

  const loadImportHistory = async (projectId: string) => {
    setLoadingImportHistory(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "30");
      params.set("offset", "0");
      if (importHistoryModeFilter !== "all") {
        params.set("mode", importHistoryModeFilter);
      }
      const response = await apiFetch<ProjectImportRunsResponse>(
        `/api/v1/admin/projects/${projectId}/doors/import-history?${params.toString()}`
      );
      const items = response.items || [];
      setImportHistory(items);
      if ((deepLinkOnlyFailed || deepLinkFailedIds.length > 0) && !focusedImportRunId) {
        const failed = items.find((x) => x.status === "FAILED" || x.status === "PARTIAL");
        if (failed) {
          setFocusedImportRunId(failed.id);
        }
      }
    } catch {
      setImportHistory([]);
    } finally {
      setLoadingImportHistory(false);
    }
  };

  const loadImportRunDetails = async (projectId: string, runId: string) => {
    setLoadingImportRunDetails(true);
    try {
      const response = await apiFetch<ProjectImportRunDetails>(
        `/api/v1/admin/projects/${projectId}/doors/import-runs/${runId}`
      );
      setFocusedImportRunDetails(response);
    } catch {
      setFocusedImportRunDetails(null);
    } finally {
      setLoadingImportRunDetails(false);
    }
  };

  const loadFailedQueue = async () => {
    setLoadingFailedQueue(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(FAILED_QUEUE_PAGE_SIZE));
      params.set("offset", String(failedQueueOffset));
      if (failedQueueOnlySelectedProject && selectedProjectId) {
        params.set("project_id", selectedProjectId);
      }
      const response = await apiFetch<FailedImportQueueResponse>(
        `/api/v1/admin/projects/import-runs/failed-queue?${params.toString()}`
      );
      const safe = {
        items: response.items || [],
        total: response.total || 0,
        limit: response.limit || FAILED_QUEUE_PAGE_SIZE,
        offset: response.offset || 0,
      };
      setFailedQueue(safe);
      const ids = new Set(safe.items.map((x) => x.run_id));
      setSelectedFailedRunIds((prev) => prev.filter((id) => ids.has(id)));
    } catch {
      setFailedQueue({ items: [], total: 0, limit: FAILED_QUEUE_PAGE_SIZE, offset: 0 });
    } finally {
      setLoadingFailedQueue(false);
    }
  };

  useEffect(() => {
    void loadProjects();
    void loadDoorTypes();
    void loadMappingProfiles();
    void loadFailedQueue();
  }, []);

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
    if (selectedProjectId) {
      void loadProjectDetails(selectedProjectId);
      void loadLayout(selectedProjectId);
      void loadProjectPlanFact(selectedProjectId);
      void loadProjectRisk(selectedProjectId);
      void loadImportHistory(selectedProjectId);
    } else {
      setProjectDetails(null);
      setProjectPlanFact(null);
      setProjectRisk(null);
      setImportHistory([]);
      setFocusedImportRunDetails(null);
    }
  }, [selectedProjectId, importHistoryModeFilter]);

  useEffect(() => {
    void loadFailedQueue();
  }, [failedQueueOffset, failedQueueOnlySelectedProject, selectedProjectId]);

  useEffect(() => {
    if (!focusedImportRunId) {
      setFocusedImportRunDetails(null);
      return;
    }
    const node = document.getElementById(`import-run-${focusedImportRunId}`);
    if (!node || typeof node.scrollIntoView !== "function") {
      if (selectedProjectId) {
        void loadImportRunDetails(selectedProjectId, focusedImportRunId);
      }
      return;
    }
    node.scrollIntoView({ behavior: "smooth", block: "center" });
    if (selectedProjectId) {
      void loadImportRunDetails(selectedProjectId, focusedImportRunId);
    }
  }, [focusedImportRunId, importHistory, selectedProjectId]);

  const handleImportAction = async (mode: "analyze" | "import") => {
    if (!selectedProjectId || !importFile) {
      return;
    }
    setImportLoading(true);
    setImportAction(mode);
    setError(null);
    if (mode === "analyze") {
      setImportResult(null);
    }
    try {
      const body = new FormData();
      body.append("file", importFile);
      body.append("default_our_price", "0");
      body.append("create_missing_door_types", String(createMissingDoorTypes));
      body.append("analyze_only", mode === "analyze" ? "true" : "false");
      body.append("mapping_profile", mappingProfile);
      if (defaultDoorTypeId.trim()) {
        body.append("default_door_type_id", defaultDoorTypeId.trim());
      }
      if (delimiter) {
        body.append("delimiter", delimiter);
      }

      const response = await apiFetch<ImportResult>(
        `/api/v1/admin/projects/${selectedProjectId}/doors/import-upload`,
        {
          method: "POST",
          body,
        }
      );
      setImportResult(response);
      if (mode === "analyze") {
        setAnalysisReady(response.mode === "analyze");
      } else {
        setAnalysisReady(false);
        await loadProjectDetails(selectedProjectId);
        await loadLayout(selectedProjectId);
        await loadProjectPlanFact(selectedProjectId);
        await loadProjectRisk(selectedProjectId);
      }
      await loadImportHistory(selectedProjectId);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("projects.failedImportFile"));
    } finally {
      setImportLoading(false);
      setImportAction(null);
    }
  };

  const handleRetryImportRun = async (runId: string, projectIdOverride?: string) => {
    const targetProjectId = projectIdOverride || selectedProjectId;
    if (!targetProjectId) {
      return;
    }
    setRetryingRunId(runId);
    setError(null);
    try {
      const response = await apiFetch<ImportResult>(
        `/api/v1/admin/projects/${targetProjectId}/doors/import-runs/${runId}/retry`,
        { method: "POST" }
      );
      setImportResult(response);
      setAnalysisReady(false);
      await loadProjectDetails(targetProjectId);
      await loadLayout(targetProjectId);
      await loadProjectPlanFact(targetProjectId);
      await loadProjectRisk(targetProjectId);
      await loadImportHistory(targetProjectId);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("projects.failedRetryImportRun"));
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
      prev.filter((id) => !filteredProjectIds.includes(id))
    );
  };

  const handleBulkReconcile = async () => {
    if (bulkSelectedProjectIds.length === 0) {
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
        }
      );
      setBulkReconcileResult(response);
      if (selectedProjectId && bulkSelectedProjectIds.includes(selectedProjectId)) {
        await loadProjectDetails(selectedProjectId);
        await loadLayout(selectedProjectId);
        await loadProjectPlanFact(selectedProjectId);
        await loadProjectRisk(selectedProjectId);
        await loadImportHistory(selectedProjectId);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("projects.failedReconcileProjects"));
    } finally {
      setBulkReconcileLoading(false);
    }
  };

  const handleBulkReview = async () => {
    if (bulkSelectedProjectIds.length === 0) {
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
        }
      );
      setBulkReviewResult(response);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("projects.failedReviewProjects"));
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
    setSelectedFailedRunIds((prev) => prev.filter((id) => !pageIds.includes(id)));
  };

  const retryFailedQueueRuns = async (runIds: string[]) => {
    if (runIds.length === 0) {
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
          }
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
      setError(e instanceof Error ? e.message : t("projects.failedRetryQueueRuns"));
    } finally {
      setRetryFailedProgress((prev) =>
        prev
          ? {
              ...prev,
              active: false,
            }
          : null
      );
    }
  };

  const openImportRun = (projectId: string, runId: string) => {
    setImportHistoryModeFilter("all");
    setImportHistoryStatusFilter("all");
    setFocusedImportRunId(runId);
    setFocusedImportRunDetails(null);
    if (selectedProjectId === projectId) {
      void loadImportHistory(projectId);
      return;
    }
    setSelectedProjectId(projectId);
  };

  return (
    <DashboardLayout>
      <div className="motion-stagger max-w-[1500px] space-y-6 p-6 lg:p-8">
        <section className="page-hero relative overflow-hidden">
          <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_top_right,hsl(var(--accent)/0.18),transparent_62%)] lg:block" />
          <div className="relative z-10 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <div className="page-eyebrow">{tt("projects.eyebrow")}</div>
              <h1 className="mt-3 font-display text-3xl tracking-[-0.04em] text-foreground sm:text-4xl">
                {tt("projects.title")}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[15px]">
                {tt("projects.subtitle")}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="metric-chip">{tt("projects.projectsCount")} {projects.length}</span>
                <span className="metric-chip">{tt("projects.filteredLabel")} {filteredProjects.length}</span>
                <span className="metric-chip">
                  {tt("projects.selectedLabel")} {bulkSelectedProjectIds.length}
                </span>
                {deepLinkedFailedCount > 0 && (
                  <span className="metric-chip">{tt("projects.failedHandoff")} {deepLinkedFailedCount}</span>
                )}
              </div>
            </div>
            <div className="surface-subtle min-w-[320px] max-w-xl space-y-4 p-4 sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    {tt("projects.activeScope")}
                  </div>
                  <div className="mt-2 text-sm font-semibold text-foreground">
                    {selectedProject?.name || tt("projects.portfolioOverview")}
                  </div>
                  <div className="mt-1 text-[12px] leading-5 text-muted-foreground">
                    {selectedProject?.address ||
                      tt("projects.selectProjectHint")}
                  </div>
                </div>
                <button
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
                  className="btn-premium h-10 rounded-xl px-4 text-[13px] font-medium"
                >
                  <RefreshCw className="w-4 h-4" strokeWidth={1.8} />
                  {t("common.refresh")}
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-border/70 bg-background/70 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    {tt("common.search")}
                  </div>
                  <div className="mt-1 text-lg font-semibold text-foreground">
                    {search.trim() ? tt("common.filtered") : tt("common.portfolio")}
                  </div>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/70 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    {tt("projects.queue")}
                  </div>
                  <div className="mt-1 text-lg font-semibold text-foreground">
                    {failedQueue?.total || 0}
                  </div>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/70 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    {tt("common.mode")}
                  </div>
                  <div className="mt-1 text-lg font-semibold text-foreground">
                    {bulkOnlyFailedRuns ? tt("projects.retryFailed") : tt("projects.reconcileAll")}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {error && (
          <div className="mb-4 rounded-lg border border-[hsl(var(--destructive)/0.35)] bg-[hsl(var(--destructive)/0.08)] px-4 py-3 text-[13px] text-[hsl(var(--destructive))] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {deepLinkedFailedCount > 0 && (
          <div className="mb-4 rounded-lg border border-[hsl(var(--accent)/0.35)] bg-[hsl(var(--accent)/0.10)] px-4 py-3 text-[13px] text-foreground">
            {tt("projects.reportsHandoff").replace("{count}", String(deepLinkedFailedCount))}{" "}
            <span className="font-semibold"> {tt("projects.retryFailedOnly")}</span>{" "}
            {tt("projects.toReconcileSafely")}
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <section className="surface-panel xl:col-span-1">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="page-eyebrow">{tt("projects.projectList")}</div>
                <h2 className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                  {tt("projects.portfolioNavigator")}
                </h2>
              </div>
              <div className="text-right text-[12px] text-muted-foreground">
                <div>{tt("projects.filteredCount")} {filteredProjects.length}</div>
                <div>{tt("projects.selectedCount")} {bulkSelectedProjectIds.length}</div>
              </div>
            </div>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={tt("projects.searchProject")}
                className="h-11 w-full rounded-xl border border-border/70 bg-background/80 pl-9 pr-3 text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-accent/40 focus:border-accent/40"
              />
            </div>
            <div className="surface-subtle mb-3 space-y-2 p-3">
              <div className="flex items-center justify-between gap-2">
                <label className="inline-flex items-center gap-2 text-[12px] text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={(e) => toggleSelectAllFilteredProjects(e.target.checked)}
                  />
                  {tt("projects.selectAllFiltered")} ({filteredProjects.length})
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      void handleBulkReview();
                    }}
                    disabled={bulkReviewLoading || bulkSelectedProjectIds.length === 0}
                    className="h-8 rounded-lg border border-border/70 bg-background/70 px-3 text-[12px] font-medium disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {bulkReviewLoading
                      ? tt("projects.reviewing")
                      : `${tt("projects.reviewSelected")} (${bulkSelectedProjectIds.length})`}
                  </button>
                  <button
                    onClick={() => {
                      void handleBulkReconcile();
                    }}
                    disabled={bulkReconcileLoading || bulkSelectedProjectIds.length === 0}
                    className="h-8 rounded-lg border border-border/70 bg-background/70 px-3 text-[12px] font-medium disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {bulkReconcileLoading
                      ? tt("projects.reconciling")
                      : bulkOnlyFailedRuns
                        ? `${tt("projects.retryFailed")} (${bulkSelectedProjectIds.length})`
                        : `${tt("projects.reconcile")} (${bulkSelectedProjectIds.length})`}
                  </button>
                </div>
              </div>
              <label className="inline-flex items-center gap-2 text-[12px] text-muted-foreground">
                <input
                  type="checkbox"
                  checked={bulkOnlyFailedRuns}
                  onChange={(e) => setBulkOnlyFailedRuns(e.target.checked)}
                />
                {tt("projects.retryFailedLatestOnly")}
              </label>
            </div>
            <div className="space-y-2 max-h-[75vh] overflow-auto pr-1">
              {loadingProjects && (
                <div className="text-[13px] text-muted-foreground px-2 py-2">{tt("projects.loadingProjects")}</div>
              )}
              {!loadingProjects && filteredProjects.length === 0 && (
                <div className="text-[13px] text-muted-foreground px-2 py-2">{tt("projects.noProjectsFound")}</div>
              )}
              {filteredProjects.map((project) => {
                const active = project.id === selectedProjectId;
                const checked = bulkSelectedProjectIds.includes(project.id);
                return (
                  <div key={project.id} className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => toggleProjectBulkSelection(project.id, e.target.checked)}
                      className="mt-3"
                    />
                    <button
                      onClick={() => {
                        setSelectedProjectId(project.id);
                        setImportResult(null);
                        setAnalysisReady(false);
                        setImportHistory([]);
                        setFocusedImportRunId(null);
                        setFocusedImportRunDetails(null);
                      }}
                      className={cn(
                        "w-full rounded-xl border px-3 py-3 text-left transition-all duration-200",
                        active
                          ? "border-accent/40 bg-[linear-gradient(135deg,hsl(var(--accent)/0.16),hsl(var(--accent)/0.06))] shadow-[0_18px_40px_-26px_hsl(var(--accent)/0.55)]"
                          : "border-border/70 bg-background/75 hover:border-accent/25 hover:bg-[hsl(var(--accent)/0.04)]"
                      )}
                    >
                      <div className="text-[13px] font-semibold text-card-foreground">{project.name}</div>
                      <div className="text-[12px] text-muted-foreground mt-0.5">{project.address}</div>
                      <div className="text-[11px] text-muted-foreground mt-2">{t("projects.statusPrefix")}: {project.status}</div>
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="xl:col-span-2 space-y-5">
            {selectedProject ? (
              <>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                  <div className="surface-panel">
                    <div className="text-[12px] text-muted-foreground">{t("projects.projectLabel")}</div>
                    <div className="text-[14px] font-semibold mt-1">{selectedProject.name}</div>
                    <div className="text-[12px] text-muted-foreground mt-1">{selectedProject.address}</div>
                    {projectDetails?.developer_company ? (
                      <div className="text-[12px] text-muted-foreground mt-2">
                        {t("projects.developer")}: {projectDetails.developer_company}
                      </div>
                    ) : null}
                  </div>
                  <div className="surface-panel">
                    <div className="text-[12px] text-muted-foreground flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" />
                      {t("projects.totalDoors")}
                    </div>
                    <div className="text-[22px] font-semibold mt-1">
                      {layout ? layout.total_doors : "-"}
                    </div>
                  </div>
                  <div className="surface-panel">
                    <div className="text-[12px] text-muted-foreground flex items-center gap-1">
                      <Layers3 className="w-3.5 h-3.5" />
                      {t("projects.layoutBuckets")}
                    </div>
                    <div className="text-[22px] font-semibold mt-1">
                      {layout ? layout.buckets.length : "-"}
                    </div>
                  </div>
                  <div className="surface-panel">
                    <div className="text-[12px] text-muted-foreground">{t("projects.openBlockers")}</div>
                    <div className="text-[22px] font-semibold mt-1">
                      {loadingProjectDetails ? "-" : projectDetails?.issues_open?.length || 0}
                    </div>
                    <div className="text-[12px] text-muted-foreground mt-1">
                      {projectDetails?.contact_name
                        ? `${t("projects.contact")}: ${projectDetails.contact_name}`
                        : t("projects.noContactAssigned")}
                    </div>
                  </div>
                </div>

                <div className="surface-panel">
                  <div className="flex flex-col gap-2 border-b border-border/70 pb-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-[15px] font-semibold">{t("projects.projectFinancialScreen")}</h3>
                      <p className="mt-1 text-[12px] text-muted-foreground">
                        {t("projects.projectFinancialSubtitle")}
                      </p>
                    </div>
                    <div className="text-[12px] text-muted-foreground">
                      {loadingProjectPlanFact || loadingProjectRisk
                        ? t("projects.refreshingFinancialView")
                        : projectRisk?.generated_at
                          ? `Updated: ${formatDateTime(projectRisk.generated_at)}`
                          : t("projects.financialDataReady")}
                    </div>
                  </div>

                  {loadingProjectPlanFact || loadingProjectRisk ? (
                    <div className="mt-4 text-[13px] text-muted-foreground">
                      {t("projects.loadingFinancialScreen")}
                    </div>
                  ) : projectPlanFact && projectRisk ? (
                    <div className="mt-4 space-y-4">
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
                        <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-[linear-gradient(180deg,hsl(var(--background)/0.92),hsl(var(--accent)/0.08))] p-4">
                          <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,hsl(var(--accent)/0.7),transparent)]" />
                          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                            Completion
                          </div>
                          <div className="mt-2 text-xl font-semibold">
                            {formatPct(projectPlanFact.completion_pct)}
                          </div>
                          <div className="mt-1 text-[12px] text-muted-foreground">
                            Installed: {projectPlanFact.installed_doors}/{projectPlanFact.total_doors}
                          </div>
                        </div>
                        <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-[linear-gradient(180deg,hsl(var(--background)/0.92),hsl(var(--accent)/0.08))] p-4">
                          <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,hsl(var(--accent)/0.7),transparent)]" />
                          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                            Actual Margin
                          </div>
                          <div className="mt-2 text-xl font-semibold">
                            {formatPct(projectRisk.summary.actual_margin_pct)}
                          </div>
                          <div className="mt-1 text-[12px] text-muted-foreground">
                            Profit: {formatMoney(projectRisk.summary.actual_profit_total)}
                          </div>
                        </div>
                        <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-[linear-gradient(180deg,hsl(var(--background)/0.92),hsl(var(--accent)/0.08))] p-4">
                          <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,hsl(var(--accent)/0.7),transparent)]" />
                          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                            Revenue Gap
                          </div>
                          <div className="mt-2 text-xl font-semibold">
                            {formatMoney(projectPlanFact.revenue_gap_total)}
                          </div>
                          <div className="mt-1 text-[12px] text-muted-foreground">
                            Delayed: {formatMoney(projectRisk.summary.delayed_revenue_total)}
                          </div>
                        </div>
                        <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-[linear-gradient(180deg,hsl(var(--background)/0.92),hsl(var(--accent)/0.08))] p-4">
                          <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,hsl(var(--accent)/0.7),transparent)]" />
                          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                            Profit Gap
                          </div>
                          <div className="mt-2 text-xl font-semibold">
                            {formatMoney(projectPlanFact.profit_gap_total)}
                          </div>
                          <div className="mt-1 text-[12px] text-muted-foreground">
                            Risk: {formatMoney(projectRisk.summary.blocked_issue_profit_at_risk)}
                          </div>
                        </div>
                        <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-[linear-gradient(180deg,hsl(var(--background)/0.92),hsl(var(--accent)/0.08))] p-4">
                          <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,hsl(var(--accent)/0.7),transparent)]" />
                          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                            Open Issues
                          </div>
                          <div className="mt-2 text-xl font-semibold">
                            {projectPlanFact.open_issues}
                          </div>
                          <div className="mt-1 text-[12px] text-muted-foreground">
                            Blocked: {projectRisk.summary.blocked_open_issues}
                          </div>
                        </div>
                        <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-[linear-gradient(180deg,hsl(var(--background)/0.92),hsl(var(--accent)/0.08))] p-4">
                          <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,hsl(var(--accent)/0.7),transparent)]" />
                          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                            Data Risk
                          </div>
                          <div className="mt-2 text-xl font-semibold">
                            {projectPlanFact.missing_actual_rates_doors}
                          </div>
                          <div className="mt-1 text-[12px] text-muted-foreground">
                            Add-on gaps: {projectPlanFact.missing_addon_plans_facts}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_0.95fr]">
                        <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-[linear-gradient(180deg,hsl(var(--background)/0.82),hsl(var(--background)/0.62))] p-5">
                          <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,hsl(var(--foreground)/0.14),transparent)]" />
                          <div className="mb-3 flex items-center justify-between">
                            <h4 className="text-[14px] font-semibold">{t("projects.planVsFactLedger")}</h4>
                            <span className="text-[11px] text-muted-foreground">
                              {t("projects.addonsPlannedFact")
                                .replace("{planned}", String(projectPlanFact.planned_addons_qty))
                                .replace("{actual}", String(projectPlanFact.actual_addons_qty))}
                            </span>
                          </div>
                          <div className="overflow-auto rounded-xl border border-border/70 bg-background/70">
                            <table className="w-full text-[12px]">
                              <thead className="bg-[linear-gradient(180deg,hsl(var(--muted)/0.65),hsl(var(--muted)/0.35))] text-muted-foreground">
                                <tr>
                                  <th className="px-3 py-2 text-left font-medium">{t("projects.metric")}</th>
                                  <th className="px-3 py-2 text-left font-medium">{t("projects.plan")}</th>
                                  <th className="px-3 py-2 text-left font-medium">{t("projects.fact")}</th>
                                  <th className="px-3 py-2 text-left font-medium">{t("projects.gap")}</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr className="border-t border-border/70 bg-background/30">
                                  <td className="px-3 py-2 font-medium">{t("projects.revenue")}</td>
                                  <td className="px-3 py-2">{formatMoney(projectPlanFact.planned_revenue_total)}</td>
                                  <td className="px-3 py-2">{formatMoney(projectPlanFact.actual_revenue_total)}</td>
                                  <td className="px-3 py-2">{formatMoney(projectPlanFact.revenue_gap_total)}</td>
                                </tr>
                                <tr className="border-t border-border/70">
                                  <td className="px-3 py-2 font-medium">{t("projects.payroll")}</td>
                                  <td className="px-3 py-2">{formatMoney(projectPlanFact.planned_payroll_total)}</td>
                                  <td className="px-3 py-2">{formatMoney(projectPlanFact.actual_payroll_total)}</td>
                                  <td className="px-3 py-2">{formatMoney(projectPlanFact.payroll_gap_total)}</td>
                                </tr>
                                <tr className="border-t border-border/70 bg-background/30">
                                  <td className="px-3 py-2 font-medium">{t("projects.profit")}</td>
                                  <td className="px-3 py-2">{formatMoney(projectPlanFact.planned_profit_total)}</td>
                                  <td className="px-3 py-2">{formatMoney(projectPlanFact.actual_profit_total)}</td>
                                  <td className="px-3 py-2">{formatMoney(projectPlanFact.profit_gap_total)}</td>
                                </tr>
                                <tr className="border-t border-border/70">
                                  <td className="px-3 py-2 font-medium">{t("projects.addons")}</td>
                                  <td className="px-3 py-2">{projectPlanFact.planned_addons_qty}</td>
                                  <td className="px-3 py-2">{projectPlanFact.actual_addons_qty}</td>
                                  <td className="px-3 py-2">
                                    {projectPlanFact.actual_addons_qty - projectPlanFact.planned_addons_qty}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>

                        <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-[linear-gradient(180deg,hsl(var(--background)/0.82),hsl(var(--background)/0.62))] p-5">
                          <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,hsl(var(--destructive)/0.35),transparent)]" />
                          <h4 className="text-[14px] font-semibold">{t("projects.riskDrivers")}</h4>
                          <div className="mt-3 space-y-2">
                            {projectRisk.drivers.length > 0 ? (
                              projectRisk.drivers.map((driver) => (
                                <div
                                  key={driver.code}
                                  className="flex items-center justify-between rounded-xl border border-border/70 bg-background/70 px-3 py-2.5"
                                >
                                  <div>
                                    <div className="text-[12px] font-medium">{driver.label}</div>
                                    <div className="text-[11px] text-muted-foreground">{driver.code}</div>
                                  </div>
                                  <div className="text-right">
                                    <span
                                      className={cn(
                                        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]",
                                        riskTone(driver.severity)
                                      )}
                                    >
                                      {driver.severity}
                                    </span>
                                    <div className="mt-1 text-[12px] text-muted-foreground">
                                      {driver.code.includes("ISSUE") ? driver.value : formatMoney(driver.value)}
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="text-[12px] text-muted-foreground">
                                {t("projects.noRiskDrivers")}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                        <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-[linear-gradient(180deg,hsl(var(--background)/0.82),hsl(var(--background)/0.62))] p-5">
                          <h4 className="text-[14px] font-semibold">{t("projects.topDelayReasons")}</h4>
                          <div className="mt-3 overflow-auto rounded-xl border border-border/70 bg-background/70">
                            <table className="w-full text-[12px]">
                              <thead className="bg-[linear-gradient(180deg,hsl(var(--muted)/0.65),hsl(var(--muted)/0.35))] text-muted-foreground">
                                <tr>
                                  <th className="px-3 py-2 text-left font-medium">{t("projects.reason")}</th>
                                  <th className="px-3 py-2 text-left font-medium">{t("projects.doors")}</th>
                                  <th className="px-3 py-2 text-left font-medium">{t("projects.revenue")}</th>
                                  <th className="px-3 py-2 text-left font-medium">{t("projects.profit")}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {projectRisk.top_reasons.length > 0 ? (
                                  projectRisk.top_reasons.map((reason) => (
                                    <tr
                                      key={reason.reason_id || reason.reason_name}
                                      className="border-t border-border/70"
                                    >
                                      <td className="px-3 py-2">{reason.reason_name}</td>
                                      <td className="px-3 py-2">{reason.doors}</td>
                                      <td className="px-3 py-2">{formatMoney(reason.revenue_delayed_total)}</td>
                                      <td className="px-3 py-2">{formatMoney(reason.profit_delayed_total)}</td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr className="border-t border-border/70">
                                    <td className="px-3 py-2 text-muted-foreground" colSpan={4}>
                                      {t("projects.noDelayReasons")}
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-[linear-gradient(180deg,hsl(var(--background)/0.82),hsl(var(--background)/0.62))] p-5">
                          <h4 className="text-[14px] font-semibold">{t("projects.ordersAtRisk")}</h4>
                          <div className="mt-3 overflow-auto rounded-xl border border-border/70 bg-background/70">
                            <table className="w-full text-[12px]">
                              <thead className="bg-[linear-gradient(180deg,hsl(var(--muted)/0.65),hsl(var(--muted)/0.35))] text-muted-foreground">
                                <tr>
                                  <th className="px-3 py-2 text-left font-medium">{t("projects.orderNumber")}</th>
                                  <th className="px-3 py-2 text-left font-medium">{t("projects.completion")}</th>
                                  <th className="px-3 py-2 text-left font-medium">{t("projects.issues")}</th>
                                  <th className="px-3 py-2 text-left font-medium">{t("projects.gap")}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {projectRisk.risky_orders.length > 0 ? (
                                  projectRisk.risky_orders.map((order) => (
                                    <tr key={order.order_number} className="border-t border-border/70">
                                      <td className="px-3 py-2 font-medium">{order.order_number}</td>
                                      <td className="px-3 py-2">{formatPct(order.completion_pct)}</td>
                                      <td className="px-3 py-2">{order.open_issues}</td>
                                      <td className="px-3 py-2">{formatMoney(order.revenue_gap_total)}</td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr className="border-t border-border/70">
                                    <td className="px-3 py-2 text-muted-foreground" colSpan={4}>
                                      {t("projects.noRiskyOrders")}
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 text-[13px] text-muted-foreground">
                      {t("projects.financialUnavailable")}
                    </div>
                  )}
                </div>

                {bulkReconcileResult && (
                  <div className="surface-panel">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <h3 className="text-[14px] font-semibold">{t("projects.bulkReconcileResult")}</h3>
                      <div className="text-[12px] text-muted-foreground">
                        {t("projects.successCount")}: {bulkReconcileResult.successful_projects} | {t("projects.failedCount")}:{" "}
                        {bulkReconcileResult.failed_projects} | {t("projects.skippedCount")}:{" "}
                        {bulkReconcileResult.skipped_projects}
                      </div>
                    </div>
                    <div className="overflow-auto rounded-xl border border-border/70 bg-background/70">
                      <table className="w-full text-[12px]">
                        <thead className="bg-muted/40 text-muted-foreground">
                          <tr>
                            <th className="text-left px-2 py-2 font-medium">{t("common.project")}</th>
                            <th className="text-left px-2 py-2 font-medium">{t("common.status")}</th>
                            <th className="text-left px-2 py-2 font-medium">{t("projects.imported")}</th>
                            <th className="text-left px-2 py-2 font-medium">{t("projects.skippedCount")}</th>
                            <th className="text-left px-2 py-2 font-medium">{t("projects.errorLabel")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bulkReconcileResult.items.map((item) => {
                            const projectName =
                              projects.find((p) => p.id === item.project_id)?.name || item.project_id;
                            return (
                              <tr key={`${item.project_id}-${item.source_run_id || "none"}`} className="row-hover border-t border-border/70">
                                <td className="px-2 py-1.5">{projectName}</td>
                                <td className="px-2 py-1.5">{item.status}</td>
                                <td className="px-2 py-1.5">{item.imported}</td>
                                <td className="px-2 py-1.5">{item.skipped}</td>
                                <td className="px-2 py-1.5 text-[hsl(var(--destructive))]">
                                  {item.last_error || "-"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {bulkReviewResult && (
                  <div className="surface-panel">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <h3 className="text-[14px] font-semibold">{t("projects.bulkImportReview")}</h3>
                      <div className="text-[12px] text-muted-foreground">
                        {t("projects.reviewable")}: {bulkReviewResult.reviewable_projects} | {t("projects.failedPartial")}:{" "}
                        {bulkReviewResult.failed_or_partial_projects} | {t("projects.skippedCount")}:{" "}
                        {bulkReviewResult.skipped_projects}
                      </div>
                    </div>
                    <div className="overflow-auto rounded-xl border border-border/70 bg-background/70">
                      <table className="w-full text-[12px]">
                        <thead className="bg-muted/40 text-muted-foreground">
                          <tr>
                            <th className="text-left px-2 py-2 font-medium">{t("common.project")}</th>
                            <th className="text-left px-2 py-2 font-medium">{t("common.status")}</th>
                            <th className="text-left px-2 py-2 font-medium">{t("common.mode")}</th>
                            <th className="text-left px-2 py-2 font-medium">{t("projects.rows")}</th>
                            <th className="text-left px-2 py-2 font-medium">{t("projects.file")}</th>
                            <th className="text-left px-2 py-2 font-medium">{t("projects.errorLabel")}</th>
                            <th className="text-left px-2 py-2 font-medium">{t("projects.actions")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bulkReviewResult.items.map((item) => (
                            <tr
                              key={`${item.project_id}-${item.source_run_id || "none"}`}
                              className="row-hover border-t border-border/70"
                            >
                              <td className="px-2 py-1.5">{item.project_name}</td>
                              <td className="px-2 py-1.5">
                                <span
                                  className={cn(
                                    "inline-flex px-1.5 py-0.5 rounded",
                                    item.status === "SUCCESS" &&
                                      "bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]",
                                    item.status === "FAILED" &&
                                      "bg-[hsl(var(--destructive)/0.12)] text-[hsl(var(--destructive))]",
                                    item.status === "PARTIAL" &&
                                      "bg-[hsl(var(--warning)/0.14)] text-[hsl(var(--warning-foreground))]",
                                    item.status.startsWith("SKIPPED") &&
                                      "bg-muted text-muted-foreground"
                                  )}
                                >
                                  {item.status}
                                </span>
                              </td>
                              <td className="px-2 py-1.5">{item.mode || "-"}</td>
                              <td className="px-2 py-1.5">
                                {item.parsed_rows} / {item.prepared_rows}
                              </td>
                              <td
                                className="px-2 py-1.5 max-w-[220px] truncate"
                                title={item.source_filename || "-"}
                              >
                                {item.source_filename || "-"}
                              </td>
                              <td
                                className="px-2 py-1.5 text-[hsl(var(--destructive))]"
                                title={item.last_error || ""}
                              >
                                {item.last_error || "-"}
                              </td>
                              <td className="px-2 py-1.5">
                                <div className="flex items-center gap-1">
                                  {item.source_run_id ? (
                                    <button
                                      onClick={() => openImportRun(item.project_id, item.source_run_id!)}
                                      className="h-7 px-2 rounded-md border border-border bg-card text-[11px]"
                                    >
                                      {t("projects.openRun")}
                                    </button>
                                  ) : null}
                                  {item.retry_available && item.source_run_id ? (
                                    <button
                                      onClick={() => {
                                        setSelectedProjectId(item.project_id);
                                        void handleRetryImportRun(
                                          item.source_run_id!,
                                          item.project_id
                                        );
                                      }}
                                      className="h-7 px-2 rounded-md border border-border bg-card text-[11px]"
                                    >
                                      {t("projects.retryNow")}
                                    </button>
                                  ) : null}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="glass-card rounded-xl p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <h3 className="text-[14px] font-semibold">{tt("projects.failedImportsQueue")}</h3>
                    <div className="text-[12px] text-muted-foreground">
                      {t("projects.selectedLabel")}: {selectedFailedRunIds.length}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto] gap-2 mb-3">
                    <label className="inline-flex items-center gap-2 text-[12px] text-muted-foreground">
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
                      value={String(retryFailedBatchSize)}
                      onChange={(e) => setRetryFailedBatchSize(Number(e.target.value))}
                      className="h-8 rounded-md border border-border bg-background px-2 text-[12px]"
                    >
                      <option value="5">{t("projects.batch").replace("{count}", "5")}</option>
                      <option value="10">{t("projects.batch").replace("{count}", "10")}</option>
                      <option value="20">{t("projects.batch").replace("{count}", "20")}</option>
                    </select>
                    <button
                      onClick={() => {
                        void loadFailedQueue();
                      }}
                      className="h-8 px-3 rounded-md border border-border bg-card text-[12px]"
                    >
                        {tt("projects.refreshQueue")}
                    </button>
                    <button
                      onClick={() => {
                        void retryFailedQueueRuns(selectedFailedRunIds);
                      }}
                      disabled={
                        !!retryFailedProgress?.active || selectedFailedRunIds.length === 0
                      }
                      className="h-8 px-3 rounded-md border border-border bg-card text-[12px] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {retryFailedProgress?.active
                          ? tt("projects.retryingProgress")
                              .replace("{processed}", String(retryFailedProgress.processed))
                              .replace("{total}", String(retryFailedProgress.total))
                          : tt("projects.retrySelected").replace("{count}", String(selectedFailedRunIds.length))}
                    </button>
                  </div>

                  {retryFailedProgress && (
                    <div className="mb-3 rounded-md border border-border bg-background px-3 py-2">
                        <div className="text-[12px] text-muted-foreground mb-1">
                         {tt("projects.progress")}: {retryFailedProgress.processed}/{retryFailedProgress.total} |
                         {" "}{tt("projects.successCount")} {retryFailedProgress.successful} | {tt("projects.failedCount")} {retryFailedProgress.failed}
                         {" "} | {tt("projects.skippedCount")} {retryFailedProgress.skipped}
                      </div>
                      <div className="h-1.5 rounded bg-muted overflow-hidden">
                        <div
                          className="h-full bg-accent transition-all"
                          style={{
                            width: `${
                              retryFailedProgress.total > 0
                                ? Math.round(
                                    (retryFailedProgress.processed / retryFailedProgress.total) *
                                      100
                                  )
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {retryFailedSummary && (
                    <div className="mb-3 rounded-md border border-border bg-background px-3 py-2 text-[12px] text-muted-foreground">
                        {tt("projects.lastRetryBatch")
                          .replace("{success}", String(retryFailedSummary.successful_runs))
                          .replace("{failed}", String(retryFailedSummary.failed_runs))
                          .replace("{skipped}", String(retryFailedSummary.skipped_runs))}
                    </div>
                  )}

                  <div className="overflow-auto rounded-lg border border-border">
                    <table className="w-full text-[12px]">
                      <thead className="bg-muted/40 text-muted-foreground">
                        <tr>
                          <th className="text-left px-2 py-2 font-medium">
                            <input
                              type="checkbox"
                              checked={allFailedPageSelected}
                              onChange={(e) =>
                                toggleSelectAllFailedQueuePage(e.target.checked)
                              }
                            />
                          </th>
                          <th className="text-left px-2 py-2 font-medium">{t("projects.time")}</th>
                          <th className="text-left px-2 py-2 font-medium">{t("common.project")}</th>
                          <th className="text-left px-2 py-2 font-medium">{t("common.status")}</th>
                          <th className="text-left px-2 py-2 font-medium">{t("projects.errors")}</th>
                          <th className="text-left px-2 py-2 font-medium">{t("projects.file")}</th>
                          <th className="text-left px-2 py-2 font-medium">{t("projects.action")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingFailedQueue ? (
                          <tr>
                            <td className="px-2 py-3 text-muted-foreground" colSpan={7}>
                               {tt("projects.loadingFailedQueue")}
                            </td>
                          </tr>
                        ) : (failedQueue?.items || []).length === 0 ? (
                          <tr>
                            <td className="px-2 py-3 text-muted-foreground" colSpan={7}>
                               {tt("projects.noFailedQueue")}
                            </td>
                          </tr>
                        ) : (
                          (failedQueue?.items || []).map((item) => (
                            <tr key={item.run_id} className="row-hover border-t border-border/70">
                              <td className="px-2 py-1.5">
                                <input
                                  type="checkbox"
                                  checked={selectedFailedRunIds.includes(item.run_id)}
                                  onChange={(e) =>
                                    toggleFailedRunSelection(item.run_id, e.target.checked)
                                  }
                                />
                              </td>
                              <td className="px-2 py-1.5 whitespace-nowrap">
                                {formatDateTime(item.created_at)}
                              </td>
                              <td className="px-2 py-1.5">{item.project_name}</td>
                              <td className="px-2 py-1.5">
                                <span
                                  className={cn(
                                    "inline-flex px-1.5 py-0.5 rounded",
                                    item.status === "FAILED" &&
                                      "bg-[hsl(var(--destructive)/0.12)] text-[hsl(var(--destructive))]",
                                    item.status === "PARTIAL" &&
                                      "bg-[hsl(var(--warning)/0.14)] text-[hsl(var(--warning-foreground))]"
                                  )}
                                >
                                  {item.status}
                                </span>
                              </td>
                              <td
                                className="px-2 py-1.5 text-[hsl(var(--destructive))]"
                                title={item.last_error || ""}
                              >
                                {item.errors_count}
                              </td>
                              <td className="px-2 py-1.5 max-w-[220px] truncate" title={item.source_filename || "-"}>
                                {item.source_filename || "-"}
                              </td>
                              <td className="px-2 py-1.5">
                                <button
                                  onClick={() => openImportRun(item.project_id, item.run_id)}
                                  className="h-7 px-2 rounded-md border border-border bg-card text-[11px]"
                                >
                                  {t("projects.openRun")}
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[12px] text-muted-foreground">
                    <div>
                      {t("projects.totalQueue")}: {failedQueue?.total || 0}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setFailedQueueOffset((x) => Math.max(0, x - FAILED_QUEUE_PAGE_SIZE))}
                        disabled={!failedQueueCanPrev}
                        className="h-7 px-2 rounded-md border border-border bg-card disabled:opacity-50"
                      >
                        {t("projects.prev")}
                      </button>
                      <button
                        onClick={() => setFailedQueueOffset((x) => x + FAILED_QUEUE_PAGE_SIZE)}
                        disabled={!failedQueueCanNext}
                        className="h-7 px-2 rounded-md border border-border bg-card disabled:opacity-50"
                      >
                        {t("projects.next")}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="glass-card rounded-xl p-4">
                  <div className="flex items-center gap-2 text-[13px] font-semibold">
                    <Upload className="w-4 h-4" />
                    {t("projects.importFactoryFile")}
                  </div>
                  <p className="text-[12px] text-muted-foreground mt-1">
                    {t("projects.acceptedFormats")}
                  </p>
                  <p className="text-[12px] text-muted-foreground mt-1">
                    Priority columns: מספר הזמנה, בניין, קומה, דירה, דגם כנף
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_280px_130px] gap-2 mt-3">
                    <label className="h-10 rounded-lg border border-dashed border-border bg-background flex items-center px-3 text-[13px] text-muted-foreground cursor-pointer hover:border-accent/40">
                      <FileSpreadsheet className="w-4 h-4 mr-2 shrink-0" />
                      <span className="truncate">
                        {importFile ? importFile.name : t("projects.chooseFile")}
                      </span>
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          setImportFile(e.target.files?.[0] || null);
                          setAnalysisReady(false);
                          setImportResult(null);
                        }}
                        accept=".csv,.txt,.tsv,.json,.xml,.xlsx,.pdf"
                      />
                    </label>
                    <select
                      value={defaultDoorTypeId}
                      onChange={(e) => {
                        setDefaultDoorTypeId(e.target.value);
                        setAnalysisReady(false);
                      }}
                      className="h-10 rounded-lg border border-border bg-background px-3 text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-accent/40"
                    >
                      <option value="">
                        {loadingDoorTypes
                          ? t("projects.loadingDoorTypes")
                          : t("projects.autoByFileCode")}
                      </option>
                      {doorTypes.map((doorType) => (
                        <option key={doorType.id} value={doorType.id}>
                          {doorType.code} - {doorType.name}
                        </option>
                      ))}
                    </select>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => void handleImportAction("analyze")}
                        disabled={!importFile || importLoading}
                        className="h-10 rounded-lg border border-border bg-card text-card-foreground text-[13px] font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {importLoading && importAction === "analyze" ? t("projects.analyzing") : t("projects.analyze")}
                      </button>
                      <button
                        onClick={() => void handleImportAction("import")}
                        disabled={!importFile || importLoading || !analysisReady}
                        className="h-10 rounded-lg bg-accent text-accent-foreground text-[13px] font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {importLoading && importAction === "import" ? t("projects.importing") : t("projects.import")}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                    <select
                      value={mappingProfile}
                      onChange={(e) => {
                        setMappingProfile(e.target.value);
                        setAnalysisReady(false);
                      }}
                      className="h-9 rounded-lg border border-border bg-background px-3 text-[12px] text-foreground"
                    >
                      {loadingMappingProfiles ? (
                        <option value="auto_v1">{t("projects.mappingProfileLoading")}</option>
                      ) : null}
                      {!loadingMappingProfiles && mappingProfiles.length === 0 ? (
                        <option value="auto_v1">{t("projects.mappingProfileAuto")}</option>
                      ) : null}
                      {mappingProfiles.map((profile) => (
                        <option key={profile.code} value={profile.code}>
                          {profile.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={delimiter}
                      onChange={(e) => {
                        setDelimiter(e.target.value);
                        setAnalysisReady(false);
                      }}
                      className="h-9 rounded-lg border border-border bg-background px-3 text-[12px] text-foreground"
                    >
                      <option value="">{t("projects.delimiterAuto")}</option>
                      <option value=",">{t("projects.delimiterComma")}</option>
                      <option value=";">{t("projects.delimiterSemicolon")}</option>
                      <option value="|">{t("projects.delimiterPipe")}</option>
                      <option value={"\t"}>{t("projects.delimiterTab")}</option>
                    </select>
                    <label className="h-9 rounded-lg border border-border bg-background px-3 text-[12px] text-foreground inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={createMissingDoorTypes}
                        onChange={(e) => {
                          setCreateMissingDoorTypes(e.target.checked);
                          setAnalysisReady(false);
                        }}
                      />
                      {t("projects.createMissingDoorTypes")}
                    </label>
                  </div>

                  {importResult && (
                    <div className="mt-3 rounded-lg border border-border bg-background px-3 py-2 text-[12px]">
                      <div className="flex items-center gap-1.5 text-[hsl(var(--success))]">
                        <CheckCircle2 className="w-4 h-4" />
                        {t("projects.parsedPreparedImportedSkipped")
                          .replace("{parsed}", String(importResult.parsed_rows))
                          .replace("{prepared}", String(importResult.prepared_rows))
                          .replace("{imported}", String(importResult.imported))
                          .replace("{skipped}", String(importResult.skipped))}
                      </div>
                      {typeof importResult.would_import === "number" &&
                      typeof importResult.would_skip === "number" ? (
                        <div className="mt-1 text-muted-foreground">
                          {t("projects.preflightResult")
                            .replace("{mode}", importResult.mode === "analyze" ? t("projects.preflight") : t("projects.result"))
                            .replace("{wouldImport}", String(importResult.would_import))
                            .replace("{wouldSkip}", String(importResult.would_skip))}
                        </div>
                      ) : null}
                      {importResult.mode === "analyze" ? (
                        <div className="mt-1 text-muted-foreground">
                          {t("projects.analyzeCompleted")}
                        </div>
                      ) : null}
                      {importResult.idempotency_hit ? (
                        <div className="mt-1 text-muted-foreground">
                          {t("projects.idempotencyHit")}
                        </div>
                      ) : null}
                      {importResult.diagnostics?.mapping_profile ? (
                        <div className="mt-1 text-muted-foreground">
                          {t("projects.mappingProfileValue").replace("{value}", importResult.diagnostics.mapping_profile)}
                        </div>
                      ) : null}
                      {importResult.diagnostics?.strict_required_fields !== undefined &&
                      importResult.diagnostics?.strict_required_fields !== null ? (
                        <div className="mt-1 text-muted-foreground">
                          {t("projects.strictRequiredFields").replace(
                            "{value}",
                            importResult.diagnostics.strict_required_fields ? t("projects.on") : t("projects.off")
                          )}
                        </div>
                      ) : null}
                      {importResult.diagnostics?.missing_required_fields?.length ? (
                        <div className="mt-1 text-[hsl(var(--destructive))]">
                          {t("projects.missingRequiredFields").replace(
                            "{fields}",
                            importResult.diagnostics.missing_required_fields.join(", ")
                          )}
                        </div>
                      ) : null}
                      {importResult.diagnostics?.data_summary ? (
                        <div className="mt-2">
                          <div className="text-muted-foreground">{t("projects.importDataSummary")}</div>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {[
                              {
                                label: t("projects.orders"),
                                value: importResult.diagnostics.data_summary.unique_order_numbers,
                              },
                              {
                                label: t("projects.houses"),
                                value: importResult.diagnostics.data_summary.unique_houses,
                              },
                              {
                                label: t("projects.floors"),
                                value: importResult.diagnostics.data_summary.unique_floors,
                              },
                              {
                                label: t("projects.apartments"),
                                value: importResult.diagnostics.data_summary.unique_apartments,
                              },
                              {
                                label: t("projects.locations"),
                                value: importResult.diagnostics.data_summary.unique_locations,
                              },
                              {
                                label: t("projects.markings"),
                                value: importResult.diagnostics.data_summary.unique_markings,
                              },
                              {
                                label: t("projects.rowErrors"),
                                value: importResult.diagnostics.data_summary.rows_with_errors,
                              },
                              {
                                label: t("projects.duplicateRows"),
                                value: importResult.diagnostics.data_summary.duplicate_rows_skipped,
                              },
                            ].map((item) => (
                              <span
                                key={item.label}
                                className="rounded-md border border-border bg-muted/40 px-2 py-1 text-foreground"
                              >
                                {item.label}: {item.value}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      {renderImportPreviewGroups(importResult.diagnostics)}
                      {importResult.diagnostics?.required_fields?.length ? (
                        <div className="mt-2">
                          <div className="text-muted-foreground">{t("projects.requiredColumnsStatus")}</div>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {importResult.diagnostics.required_fields.map((field) => (
                              <span
                                key={field.field_key}
                                className={cn(
                                  "px-2 py-1 rounded-md border",
                                  field.found
                                    ? "border-[hsl(var(--success)/0.35)] bg-[hsl(var(--success)/0.10)] text-[hsl(var(--success))]"
                                    : "border-[hsl(var(--destructive)/0.35)] bg-[hsl(var(--destructive)/0.10)] text-[hsl(var(--destructive))]"
                                )}
                                title={
                                  field.matched_columns.length > 0
                                    ? `Matched: ${field.matched_columns.join(", ")}`
                                    : t("projects.notDetected")
                                }
                              >
                                {field.display_name}: {field.found ? t("projects.found") : t("projects.missing")}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      {importResult.errors.length > 0 && (
                        <div className="mt-2 text-[hsl(var(--destructive))]">
                          {t("projects.errorsPreviewInline").replace(
                            "{value}",
                            importResult.errors.slice(0, 5).map((e) => `#${e.row} ${e.message}`).join(" | ")
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-4 rounded-lg border border-border bg-background">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                      <div className="text-[12px] font-semibold">
                        {t("projects.importHistory")}
                        <span className="ml-2 text-muted-foreground">
                          {filteredImportHistory.length} / {importHistory.length}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          aria-label="Import history mode"
                          value={importHistoryModeFilter}
                          onChange={(e) => setImportHistoryModeFilter(e.target.value)}
                          className="h-7 rounded-md border border-border bg-background px-2 text-[11px]"
                        >
                          <option value="all">{t("projects.allModes")}</option>
                          <option value="analyze">{t("projects.analyze")}</option>
                          <option value="import">{t("projects.import")}</option>
                          <option value="import_retry">{t("projects.retry")}</option>
                        </select>
                        <select
                          aria-label="Import history status"
                          value={importHistoryStatusFilter}
                          onChange={(e) => setImportHistoryStatusFilter(e.target.value)}
                          className="h-7 rounded-md border border-border bg-background px-2 text-[11px]"
                        >
                          <option value="all">{t("projects.allStatuses")}</option>
                          <option value="ANALYZED">ANALYZED</option>
                          <option value="SUCCESS">SUCCESS</option>
                          <option value="PARTIAL">PARTIAL</option>
                          <option value="FAILED">FAILED</option>
                          <option value="EMPTY">EMPTY</option>
                        </select>
                        <button
                          onClick={() => {
                            if (selectedProjectId) {
                              void loadImportHistory(selectedProjectId);
                            }
                          }}
                          className="h-7 px-2 rounded-md border border-border bg-card text-[11px]"
                        >
                          {t("projects.refreshHistory")}
                        </button>
                      </div>
                    </div>
                    {loadingImportHistory ? (
                      <div className="px-3 py-3 text-[12px] text-muted-foreground">
                        {t("projects.loadingImportHistory")}
                      </div>
                    ) : importHistory.length === 0 ? (
                      <div className="px-3 py-3 text-[12px] text-muted-foreground">
                        {t("projects.noImportRunsYet")}
                      </div>
                    ) : filteredImportHistory.length === 0 ? (
                      <div className="px-3 py-3 text-[12px] text-muted-foreground">
                        {t("projects.noImportRunsForFilters")}
                      </div>
                    ) : (
                      <div className="overflow-auto">
                        <table className="w-full text-[11px]">
                          <thead className="bg-muted/40 text-muted-foreground">
                            <tr>
                              <th className="text-left px-2 py-1.5 font-medium">{t("projects.time")}</th>
                              <th className="text-left px-2 py-1.5 font-medium">{t("projects.modeLabel")}</th>
                              <th className="text-left px-2 py-1.5 font-medium">{t("common.status")}</th>
                              <th className="text-left px-2 py-1.5 font-medium">{t("projects.rows")}</th>
                              <th className="text-left px-2 py-1.5 font-medium">{t("projects.result")}</th>
                              <th className="text-left px-2 py-1.5 font-medium">{t("projects.file")}</th>
                              <th className="text-left px-2 py-1.5 font-medium">{t("projects.actions")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredImportHistory.map((run) => (
                              <tr
                                id={`import-run-${run.id}`}
                                key={run.id}
                                className={cn(
                                  "row-hover border-t border-border/70",
                                  focusedImportRunId === run.id &&
                                    "bg-[hsl(var(--accent)/0.10)]"
                                )}
                              >
                                <td className="px-2 py-1.5 whitespace-nowrap">
                                  {formatDateTime(run.created_at)}
                                </td>
                                <td className="px-2 py-1.5">{run.mode}</td>
                                <td className="px-2 py-1.5">
                                  <span
                                    className={cn(
                                      "inline-flex px-1.5 py-0.5 rounded",
                                      run.status === "SUCCESS" && "bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]",
                                      run.status === "FAILED" && "bg-[hsl(var(--destructive)/0.12)] text-[hsl(var(--destructive))]",
                                      run.status === "PARTIAL" && "bg-[hsl(var(--warning)/0.14)] text-[hsl(var(--warning-foreground))]",
                                      run.status === "ANALYZED" && "bg-muted text-muted-foreground"
                                    )}
                                  >
                                    {run.status}
                                  </span>
                                </td>
                                <td className="px-2 py-1.5">
                                  {run.parsed_rows} / {run.prepared_rows}
                                </td>
                                <td className="px-2 py-1.5">
                                  {t("projects.resultSummary")
                                    .replace("{imported}", String(run.imported))
                                    .replace("{skipped}", String(run.skipped))
                                    .replace(
                                      "{errors}",
                                      run.errors_count > 0
                                        ? t("projects.errCount").replace("{count}", String(run.errors_count))
                                        : ""
                                    )}
                                </td>
                                <td className="px-2 py-1.5 max-w-[220px] truncate" title={run.source_filename || "-"}>
                                  {run.source_filename || "-"}
                                </td>
                                <td className="px-2 py-1.5">
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => {
                                        openImportRun(selectedProjectId!, run.id);
                                      }}
                                      className="h-7 px-2 rounded-md border border-border bg-card text-[11px]"
                                    >
                                      {t("projects.view")}
                                    </button>
                                    {run.retry_available ? (
                                      <button
                                        onClick={() => {
                                          void handleRetryImportRun(run.id);
                                        }}
                                        disabled={retryingRunId === run.id}
                                        className="h-7 px-2 rounded-md border border-border bg-card text-[11px] disabled:opacity-50"
                                      >
                                        {retryingRunId === run.id ? `${t("projects.retry")}...` : t("projects.retry")}
                                      </button>
                                    ) : null}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 rounded-lg border border-border bg-background px-3 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[12px] font-semibold">{t("projects.selectedImportRun")}</div>
                      {focusedImportRunDetails ? (
                        <div className="text-[11px] text-muted-foreground">
                          {formatDateTime(focusedImportRunDetails.created_at)}
                        </div>
                      ) : null}
                    </div>
                    {loadingImportRunDetails ? (
                      <div className="mt-2 text-[12px] text-muted-foreground">
                        {t("projects.loadingImportRunDetails")}
                      </div>
                    ) : !focusedImportRunDetails ? (
                      <div className="mt-2 text-[12px] text-muted-foreground">
                        {t("projects.selectRunHint")}
                      </div>
                    ) : (
                      <div className="mt-2 space-y-3 text-[12px]">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                          <div className="rounded-md border border-border bg-muted/30 px-2 py-2">
                            <div className="text-muted-foreground">{t("projects.modeLabel")}</div>
                            <div className="font-medium mt-0.5">{focusedImportRunDetails.mode}</div>
                          </div>
                          <div className="rounded-md border border-border bg-muted/30 px-2 py-2">
                            <div className="text-muted-foreground">{t("common.status")}</div>
                            <div className="font-medium mt-0.5">{focusedImportRunDetails.status}</div>
                          </div>
                          <div className="rounded-md border border-border bg-muted/30 px-2 py-2">
                            <div className="text-muted-foreground">{t("projects.file")}</div>
                            <div className="font-medium mt-0.5 truncate" title={focusedImportRunDetails.source_filename || "-"}>
                              {focusedImportRunDetails.source_filename || "-"}
                            </div>
                          </div>
                          <div className="rounded-md border border-border bg-muted/30 px-2 py-2">
                            <div className="text-muted-foreground">{t("projects.profile")}</div>
                            <div className="font-medium mt-0.5">
                              {focusedImportRunDetails.mapping_profile || "-"}
                            </div>
                          </div>
                        </div>
                        <div className="text-muted-foreground">
                          {t("projects.parsedSummary")
                            .replace("{parsed}", String(focusedImportRunDetails.parsed_rows))
                            .replace("{prepared}", String(focusedImportRunDetails.prepared_rows))
                            .replace("{imported}", String(focusedImportRunDetails.imported))
                            .replace("{skipped}", String(focusedImportRunDetails.skipped))
                            .replace(
                              "{wouldPart}",
                              typeof focusedImportRunDetails.would_import === "number" &&
                              typeof focusedImportRunDetails.would_skip === "number"
                                ? t("projects.wouldImportSkip")
                                    .replace("{wouldImport}", String(focusedImportRunDetails.would_import))
                                    .replace("{wouldSkip}", String(focusedImportRunDetails.would_skip))
                                : ""
                            )
                            .replace(
                              "{idempotencyPart}",
                              focusedImportRunDetails.idempotency_hit ? t("projects.idempotencyPart") : ""
                            )}
                        </div>
                        {focusedImportRunDetails.diagnostics?.strict_required_fields !== undefined &&
                        focusedImportRunDetails.diagnostics?.strict_required_fields !== null ? (
                          <div className="text-muted-foreground">
                            {t("projects.strictRequiredFields").replace(
                              "{value}",
                              focusedImportRunDetails.diagnostics.strict_required_fields
                                ? t("projects.on")
                                : t("projects.off")
                            )}
                          </div>
                        ) : null}
                        {focusedImportRunDetails.diagnostics?.missing_required_fields?.length ? (
                          <div className="text-[hsl(var(--destructive))]">
                            {t("projects.missingRequiredFields").replace(
                              "{fields}",
                              focusedImportRunDetails.diagnostics.missing_required_fields.join(", ")
                            )}
                          </div>
                        ) : null}
                        {focusedImportRunDetails.diagnostics?.data_summary ? (
                          <div>
                            <div className="text-muted-foreground">{t("projects.runDataSummary")}</div>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {[
                                {
                                  label: t("projects.orders"),
                                  value: focusedImportRunDetails.diagnostics.data_summary.unique_order_numbers,
                                },
                                {
                                  label: t("projects.houses"),
                                  value: focusedImportRunDetails.diagnostics.data_summary.unique_houses,
                                },
                                {
                                  label: t("projects.floors"),
                                  value: focusedImportRunDetails.diagnostics.data_summary.unique_floors,
                                },
                                {
                                  label: t("projects.apartments"),
                                  value: focusedImportRunDetails.diagnostics.data_summary.unique_apartments,
                                },
                                {
                                  label: t("projects.locations"),
                                  value: focusedImportRunDetails.diagnostics.data_summary.unique_locations,
                                },
                                {
                                  label: t("projects.markings"),
                                  value: focusedImportRunDetails.diagnostics.data_summary.unique_markings,
                                },
                              ].map((item) => (
                                <span
                                  key={item.label}
                                  className="rounded-md border border-border bg-muted/40 px-2 py-1 text-foreground"
                                >
                                  {item.label}: {item.value}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        {renderImportPreviewGroups(
                          focusedImportRunDetails.diagnostics,
                          t("projects.runStructurePreview")
                        )}
                        {focusedImportRunDetails.diagnostics?.required_fields?.length ? (
                          <div>
                            <div className="text-muted-foreground">{t("projects.requiredColumns")}</div>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {focusedImportRunDetails.diagnostics.required_fields.map((field) => (
                                <span
                                  key={field.field_key}
                                  className={cn(
                                    "px-2 py-1 rounded-md border",
                                    field.found
                                      ? "border-[hsl(var(--success)/0.35)] bg-[hsl(var(--success)/0.10)] text-[hsl(var(--success))]"
                                      : "border-[hsl(var(--destructive)/0.35)] bg-[hsl(var(--destructive)/0.10)] text-[hsl(var(--destructive))]"
                                  )}
                                >
                                  {field.display_name}: {field.found ? t("projects.found") : t("projects.missing")}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        {focusedImportRunDetails.errors.length > 0 ? (
                          <div>
                            <div className="text-muted-foreground">{t("projects.errorsPreview")}</div>
                            <div className="mt-1 space-y-1">
                              {focusedImportRunDetails.errors.slice(0, 5).map((errorItem) => (
                                <div
                                  key={`${errorItem.row}-${errorItem.message}`}
                                  className="rounded-md border border-[hsl(var(--destructive)/0.25)] bg-[hsl(var(--destructive)/0.06)] px-2 py-1 text-[hsl(var(--destructive))]"
                                >
                                  {t("projects.rowError")
                                    .replace("{row}", String(errorItem.row))
                                    .replace("{message}", errorItem.message)}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-muted-foreground">{t("projects.noRowErrors")}</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="glass-card rounded-xl p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                        {t("projects.doorAllocationMatrix")}
                      </div>
                      <h3 className="text-[15px] font-semibold mt-1">{t("projects.projectDetailMatrix")}</h3>
                      <p className="text-[12px] text-muted-foreground mt-1">
                        {t("projects.visualCut")}
                      </p>
                    </div>
                    <div className="text-[12px] text-muted-foreground">
                      {t("projects.visibleCount")
                        .replace("{filtered}", String(filteredMatrixRows.length))
                        .replace("{total}", String(matrixRows.length))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {[
                      { label: t("projects.orders"), value: filteredMatrixSummary.orders },
                      { label: t("projects.houses"), value: filteredMatrixSummary.houses },
                      { label: t("projects.floors"), value: filteredMatrixSummary.floors },
                      { label: t("projects.apartments"), value: filteredMatrixSummary.apartments },
                      { label: t("projects.locations"), value: filteredMatrixSummary.locations },
                      { label: t("projects.markings"), value: filteredMatrixSummary.markings },
                      { label: t("projects.assigned"), value: filteredMatrixSummary.assignedCount },
                      { label: t("common.open"), value: filteredMatrixSummary.openCount },
                      { label: t("projects.blockers"), value: filteredMatrixSummary.issuesCount },
                    ].map((item) => (
                      <span
                        key={item.label}
                        className="rounded-md border border-border bg-background px-2.5 py-1 text-[11px] text-foreground"
                      >
                        {item.label}: {item.value}
                      </span>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-5 xl:grid-cols-9 gap-2 mb-3">
                    <select
                      value={matrixOrderNumber}
                      onChange={(e) => setMatrixOrderNumber(e.target.value)}
                      className="h-9 rounded-lg border border-border bg-background px-3 text-[12px]"
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
                      className="h-9 rounded-lg border border-border bg-background px-3 text-[12px]"
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
                      className="h-9 rounded-lg border border-border bg-background px-3 text-[12px]"
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
                      className="h-9 rounded-lg border border-border bg-background px-3 text-[12px]"
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
                      className="h-9 rounded-lg border border-border bg-background px-3 text-[12px]"
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
                      className="h-9 rounded-lg border border-border bg-background px-3 text-[12px]"
                    >
                      <option value="all">{t("projects.allStatuses")}</option>
                      {matrixStatusOptions.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                    <input
                      value={matrixApartmentSearch}
                      onChange={(e) => setMatrixApartmentSearch(e.target.value)}
                      placeholder={t("projects.apartmentPlaceholder")}
                      className="h-9 rounded-lg border border-border bg-background px-3 text-[12px]"
                    />
                    <input
                      value={matrixMarkingSearch}
                      onChange={(e) => setMatrixMarkingSearch(e.target.value)}
                      placeholder={t("projects.markingPlaceholder")}
                      className="h-9 rounded-lg border border-border bg-background px-3 text-[12px]"
                    />
                    <button
                      onClick={() => {
                        setMatrixOrderNumber("all");
                        setMatrixHouse("all");
                        setMatrixFloor("all");
                        setMatrixLocation("all");
                        setMatrixDoorType("all");
                        setMatrixStatus("all");
                        setMatrixApartmentSearch("");
                        setMatrixMarkingSearch("");
                      }}
                      className="h-9 rounded-lg border border-border bg-card text-[12px] inline-flex items-center justify-center gap-1"
                    >
                      <FilterX className="w-3.5 h-3.5" />
                      {t("projects.reset")}
                    </button>
                  </div>

                  {filteredMatrixRows.length === 0 ? (
                    <div className="rounded-lg border border-border bg-background px-4 py-8 text-[13px] text-muted-foreground">
                      {t("projects.noDoorsForFilters")}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {projectDetailMatrix.map((house) => (
                        <section
                          key={house.house_number}
                          className="rounded-xl border border-border bg-background/80"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
                            <div>
                              <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                                בניין / House
                              </div>
                              <div className="text-[15px] font-semibold text-foreground mt-1">
                                {house.house_number}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {[
                                { label: t("projects.doors"), value: house.total_doors },
                                { label: t("projects.apartments"), value: house.apartments_count },
                                { label: t("installerProject.installed"), value: house.installed_count },
                                { label: t("common.open"), value: house.open_count },
                                { label: t("projects.blockers"), value: house.issue_count },
                              ].map((item) => (
                                <span
                                  key={`${house.house_number}-${item.label}`}
                                  className="rounded-md border border-border bg-card px-2 py-1 text-[11px] text-foreground"
                                >
                                  {item.label}: {item.value}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-4 p-4">
                            {house.floors.map((floor) => (
                              <article
                                key={`${house.house_number}-${floor.floor_label}`}
                                className="rounded-lg border border-border bg-card"
                              >
                                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
                                  <div>
                                    <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                                      קומה / Floor
                                    </div>
                                    <div className="text-[14px] font-semibold text-foreground mt-1">
                                      {floor.floor_label}
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {[
                                      { label: t("projects.doors"), value: floor.total_doors },
                                      { label: t("installerProject.installed"), value: floor.installed_count },
                                      { label: t("common.open"), value: floor.open_count },
                                      { label: t("projects.blockers"), value: floor.issue_count },
                                    ].map((item) => (
                                      <span
                                        key={`${house.house_number}-${floor.floor_label}-${item.label}`}
                                        className="rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground"
                                      >
                                        {item.label}: {item.value}
                                      </span>
                                    ))}
                                  </div>
                                </div>

                                <div className="overflow-auto">
                                  <table className="min-w-full text-[12px]">
                                    <thead className="bg-muted/40 text-muted-foreground">
                                      <tr>
                                        <th className="text-left px-3 py-2 font-medium">דירה</th>
                                        <th className="text-left px-3 py-2 font-medium">מספר הזמנה</th>
                                        {floor.location_codes.map((locationCode) => (
                                          <th
                                            key={`${house.house_number}-${floor.floor_label}-${locationCode}`}
                                            className="text-left px-3 py-2 font-medium"
                                          >
                                            {locationLabel(locationCode)}
                                          </th>
                                        ))}
                                        <th className="text-left px-3 py-2 font-medium">{t("projects.statusMix")}</th>
                                        <th className="text-left px-3 py-2 font-medium">{t("projects.blockers")}</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {floor.apartments.map((apartment) => (
                                        <tr
                                          key={`${house.house_number}-${floor.floor_label}-${apartment.apartment_number}`}
                                          className="border-t border-border/70 align-top"
                                        >
                                          <td className="px-3 py-3">
                                            <div className="font-medium text-foreground">
                                              {apartment.apartment_number}
                                            </div>
                                            <div className="text-[11px] text-muted-foreground mt-1">
                                              {t("projects.doorsCount").replace("{count}", String(apartment.total_doors))}
                                            </div>
                                          </td>
                                          <td className="px-3 py-3">
                                            <div className="flex flex-wrap gap-1.5">
                                              {apartment.order_numbers.map((orderNumber) => (
                                                <span
                                                  key={`${house.house_number}-${floor.floor_label}-${apartment.apartment_number}-${orderNumber}`}
                                                  className="rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground"
                                                >
                                                  {orderNumber}
                                                </span>
                                              ))}
                                            </div>
                                          </td>
                                          {floor.location_codes.map((locationCode) => {
                                            const cell =
                                              apartment.cells.find(
                                                (item) => item.location_code === locationCode
                                              ) || null;
                                            return (
                                              <td
                                                key={`${house.house_number}-${floor.floor_label}-${apartment.apartment_number}-${locationCode}`}
                                                className="px-3 py-3 min-w-[220px]"
                                              >
                                                {!cell ? (
                                                  <span className="text-muted-foreground">-</span>
                                                ) : (
                                                  <div className="space-y-2">
                                                    {cell.doors.map((door) => (
                                                      <div
                                                        key={door.door_id}
                                                        className={cn(
                                                          "rounded-lg border px-2.5 py-2",
                                                          door.issue_count > 0
                                                            ? "border-[hsl(var(--destructive)/0.35)] bg-[hsl(var(--destructive)/0.04)]"
                                                            : "border-border bg-background"
                                                        )}
                                                      >
                                                        <div className="flex items-start justify-between gap-2">
                                                          <div className="min-w-0">
                                                            <div className="font-medium text-foreground truncate">
                                                              {door.door_marking}
                                                            </div>
                                                            <div className="text-[11px] text-muted-foreground truncate">
                                                              {door.unit_label}
                                                            </div>
                                                          </div>
                                                          <span
                                                            className={cn(
                                                              "inline-flex rounded px-1.5 py-0.5 text-[10px]",
                                                              statusTone(door.status)
                                                            )}
                                                          >
                                                            {door.status}
                                                          </span>
                                                        </div>
                                                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                                                          <span>{door.door_type_label}</span>
                                                          <span>
                                                            {door.installer_id ? t("projects.assigned") : t("projects.unassigned")}
                                                          </span>
                                                        </div>
                                                        {door.issue_count > 0 ? (
                                                          <div className="mt-1 text-[10px] text-[hsl(var(--destructive))]">
                                                            {door.issue_titles[0] || t("projects.openBlocker")}
                                                            {door.issue_count > 1
                                                              ? ` (+${door.issue_count - 1})`
                                                              : ""}
                                                          </div>
                                                        ) : null}
                                                      </div>
                                                    ))}
                                                  </div>
                                                )}
                                              </td>
                                            );
                                          })}
                                          <td className="px-3 py-3">
                                            <div className="flex flex-wrap gap-1.5">
                                              <span className="rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground">
                                                {t("projects.installedShort").replace("{count}", String(apartment.installed_count))}
                                              </span>
                                              <span className="rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground">
                                                {t("projects.openShort").replace("{count}", String(apartment.open_count))}
                                              </span>
                                            </div>
                                          </td>
                                          <td className="px-3 py-3">
                                            {apartment.issue_count > 0 ? (
                                              <span className="rounded-md border border-[hsl(var(--destructive)/0.35)] bg-[hsl(var(--destructive)/0.08)] px-2 py-1 text-[11px] text-[hsl(var(--destructive))]">
                                                {t("projects.blockerCount").replace("{count}", String(apartment.issue_count)).replace("{suffix}", apartment.issue_count > 1 ? "s" : "")}
                                                {apartment.issue_count > 1 ? "s" : ""}
                                              </span>
                                            ) : (
                                              <span className="text-muted-foreground">{t("projects.noBlockers")}</span>
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </article>
                            ))}
                          </div>
                        </section>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 overflow-auto rounded-lg border border-border">
                    <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/30 px-3 py-2">
                      <div>
                        <div className="text-[13px] font-semibold text-foreground">
                          {t("projects.doorLedgerTable")}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {t("projects.doorLedgerSubtitle")}
                        </div>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {t("projects.rowsCount").replace("{count}", String(filteredMatrixRows.length))}
                      </div>
                    </div>
                    <table className="w-full text-[12px]">
                      <thead className="bg-muted/40 text-muted-foreground">
                        <tr>
                          <th className="text-left px-2 py-2 font-medium">{t("projects.orderNumber")}</th>
                          <th className="text-left px-2 py-2 font-medium">{t("projects.houseLabel")}</th>
                          <th className="text-left px-2 py-2 font-medium">{t("projects.floorLabel")}</th>
                          <th className="text-left px-2 py-2 font-medium">{t("projects.apt")}</th>
                          <th className="text-left px-2 py-2 font-medium">{t("projects.location")}</th>
                          <th className="text-left px-2 py-2 font-medium">{t("projects.marking")}</th>
                          <th className="text-left px-2 py-2 font-medium">{t("projects.doorType")}</th>
                          <th className="text-left px-2 py-2 font-medium">{t("projects.unit")}</th>
                          <th className="text-left px-2 py-2 font-medium">{t("common.status")}</th>
                          <th className="text-left px-2 py-2 font-medium">{t("projects.blockers")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMatrixRows.length === 0 ? (
                          <tr>
                            <td className="px-2 py-4 text-muted-foreground" colSpan={10}>
                              No doors for selected filters.
                            </td>
                          </tr>
                        ) : (
                          filteredMatrixRows.map((row) => (
                            <tr key={row.door_id} className="row-hover border-t border-border/70">
                              <td className="px-2 py-1.5">{row.order_number}</td>
                              <td className="px-2 py-1.5">{row.house_number}</td>
                              <td className="px-2 py-1.5">{row.floor_label}</td>
                              <td className="px-2 py-1.5">{row.apartment_number}</td>
                              <td className="px-2 py-1.5">{locationLabel(row.location_code)}</td>
                              <td className="px-2 py-1.5">{row.door_marking}</td>
                              <td className="px-2 py-1.5">{row.door_type_label}</td>
                              <td className="px-2 py-1.5">{row.unit_label}</td>
                              <td className="px-2 py-1.5">
                                <span
                                  className={cn(
                                    "inline-flex px-1.5 py-0.5 rounded",
                                    statusTone(row.status)
                                  )}
                                >
                                  {row.status}
                                </span>
                              </td>
                              <td className="px-2 py-1.5">
                                {row.issue_count > 0 ? (
                                  <span className="text-[hsl(var(--destructive))]">
                                    {row.issue_count}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">0</span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {loadingLayout && (
                  <div className="glass-card rounded-xl p-4 text-[13px] text-muted-foreground">
                    {t("projects.loadingLayout")}
                  </div>
                )}

                {!loadingLayout && layout && floorGroups.length === 0 && (
                  <div className="glass-card rounded-xl p-4 text-[13px] text-muted-foreground">
                    {t("projects.noDoorsInProjectYet")}
                  </div>
                )}

                {!loadingLayout &&
                  floorGroups.map((group) => (
                    <div key={group.floor} className="glass-card rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-[14px] font-semibold">{group.floor}</h3>
                        <span className="text-[12px] text-muted-foreground">{t("projects.doorsCount").replace("{count}", String(group.total))}</span>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {group.buckets.map((bucket, idx) => (
                          <article key={`${group.floor}-${idx}`} className="rounded-lg border border-border bg-background p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="text-[12px] text-muted-foreground">
                                  {t("projects.orderNumber")} {bucket.order_number || "-"} | {t("projects.houseLabel")} {bucket.house_number || "-"}
                                </div>
                                <div className="text-[13px] font-semibold mt-0.5">
                                  {(bucket.location_code || "unknown").toUpperCase()}
                                  {bucket.door_marking ? ` / ${bucket.door_marking}` : ""}
                                </div>
                              </div>
                              <div className="text-[12px] rounded-md border border-border px-2 py-1">
                                {bucket.total}
                              </div>
                            </div>

                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {Object.entries(bucket.status_breakdown).map(([status, count]) => (
                                <span
                                  key={status}
                                  className={cn(
                                    "text-[11px] px-2 py-1 rounded-md",
                                    STATUS_CLASS[status] || "bg-muted text-muted-foreground"
                                  )}
                                >
                                  {status}: {count}
                                </span>
                              ))}
                            </div>

                            <div className="mt-3 overflow-hidden rounded-md border border-border">
                              <table className="w-full text-[12px]">
                                <thead className="bg-muted/50 text-muted-foreground">
                                  <tr>
                                    <th className="text-left px-2 py-1.5 font-medium">{t("projects.apt")}</th>
                                    <th className="text-left px-2 py-1.5 font-medium">{t("projects.unit")}</th>
                                    <th className="text-left px-2 py-1.5 font-medium">{t("common.status")}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {bucket.doors.map((door) => (
                                    <tr key={door.id} className="row-hover border-t border-border/70">
                                      <td className="px-2 py-1.5">{door.apartment_number || "-"}</td>
                                      <td className="px-2 py-1.5">{door.unit_label}</td>
                                      <td className="px-2 py-1.5">
                                        <span
                                          className={cn(
                                            "inline-flex px-1.5 py-0.5 rounded",
                                            STATUS_CLASS[door.status] || "bg-muted text-muted-foreground"
                                          )}
                                        >
                                          {door.status}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </article>
                        ))}
                      </div>
                    </div>
                  ))}
              </>
            ) : (
              <div className="glass-card rounded-xl p-6 text-[13px] text-muted-foreground">
                {t("projects.selectProjectLayout")}
              </div>
            )}
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}

