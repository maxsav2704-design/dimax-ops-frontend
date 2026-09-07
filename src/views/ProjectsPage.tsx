import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Download,
  FileText,
  FileSpreadsheet,
  FilterX,
  MapPinned,
  MessageCircle,
  Phone,
  Play,
  Plus,
  PencilLine,
  RefreshCw,
  Search,
  Upload,
  UserPlus,
} from "lucide-react";

import { DashboardLayout } from "@/components/DashboardLayout";
import {
  Breadcrumbs,
  KpiCard as DimaxKpiCard,
  MetricRow,
  PillButton,
  WidgetCard,
} from "@/components/dimax";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { ApiError, apiDownload, apiFetch } from "@/lib/api";
import { readableApiError } from "@/lib/api-error-display";
import { useAuthSession } from "@/hooks/use-auth-session";
import {
  canManageImports,
  canRunPrivilegedAdminActions,
  canViewRates,
} from "@/lib/admin-access";
import { useI18n, type Locale } from "@/lib/i18n";
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

const projectsMetricLabelClass =
  "text-[10.5px] font-semibold uppercase text-text-secondary";

type ProjectLifecycleStatus =
  | "PLANNED"
  | "ACTIVE"
  | "ON_HOLD"
  | "COMPLETED"
  | "CANCELLED";

type ProjectHealthStatus = "NORMAL" | "AT_RISK" | "BLOCKED";

type ProjectListItem = {
  id: string;
  name: string;
  code?: string | null;
  address: string;
  status: string;
  lifecycle_status?: ProjectLifecycleStatus;
  health_status?: ProjectHealthStatus;
};

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
  code?: string | null;
  address?: string;
  address_details?: {
    street?: string | null;
    building?: string | null;
    city?: string | null;
    entrance?: string | null;
    lat?: string | number | null;
    lng?: string | number | null;
    waze_url?: string | null;
    waze_deep_link?: string | null;
  } | null;
  planned_start_date?: string | null;
  planned_end_date?: string | null;
  status?: string;
  lifecycle_status?: ProjectLifecycleStatus;
  health_status?: ProjectHealthStatus;
  developer?: {
    name?: string | null;
    contact_name?: string | null;
    phone?: string | null;
    phone_alt?: string | null;
    whatsapp?: string | null;
    email?: string | null;
    notes?: string | null;
    whatsapp_deep_link?: string | null;
    call_deep_link?: string | null;
  } | null;
  developer_company?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  developer_phone_alt?: string | null;
  developer_whatsapp?: string | null;
  developer_notes?: string | null;
  address_street?: string | null;
  address_building?: string | null;
  address_city?: string | null;
  address_entrance?: string | null;
  address_lat?: string | number | null;
  address_lng?: string | number | null;
  address_waze_url?: string | null;
  waze_deep_link?: string | null;
  whatsapp_deep_link?: string | null;
  call_deep_link?: string | null;
  issues_open?: ProjectOpenIssue[];
};

type ProjectFormState = {
  code: string;
  name: string;
  planned_start_date: string;
  planned_end_date: string;
  lifecycle_status: ProjectLifecycleStatus;
  address: string;
  address_street: string;
  address_building: string;
  address_city: string;
  address_entrance: string;
  address_lat: string;
  address_lng: string;
  address_waze_url: string;
  developer_company: string;
  contact_name: string;
  contact_phone: string;
  developer_phone_alt: string;
  developer_whatsapp: string;
  contact_email: string;
  developer_notes: string;
};

type ProjectFormFieldErrors = Partial<
  Record<
    | "contact_phone"
    | "developer_phone_alt"
    | "developer_whatsapp"
    | "address_waze_url",
    string
  >
>;

type DoorType = {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
};

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

type AddonTypeItem = {
  id: string;
  name: string;
  unit: string;
  status?: string;
};

type ProjectAddonPlanItem = {
  id?: string;
  addon_type_id: string;
  addon_name?: string | null;
  qty_planned: string | number;
  client_price: string | number;
  installer_price: string | number;
  notes?: string | null;
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

type AdditionalWorkFormState = {
  addon_type_id: string;
  qty_planned: string;
  client_price: string;
  installer_price: string;
  notes: string;
};

type UrgencySurchargeItem = {
  id?: string;
  scope: "PROJECT" | "ORDER_NUMBER";
  order_number?: string | null;
  reason: string;
  client_amount: string | number;
  installer_amount: string | number;
  effective_date?: string | null;
  notes?: string | null;
};

type UrgencySurchargeFormState = {
  scope: "PROJECT" | "ORDER_NUMBER";
  order_number: string;
  reason: string;
  client_amount: string;
  installer_amount: string;
  effective_date: string;
  notes: string;
};

type DocumentTemplateDTO = {
  id: string;
  name: string;
  source_filename: string;
  size_bytes: number;
  placeholders: string[];
  is_active: boolean;
};

type DocumentGenerationDTO = {
  id: string;
  template_id: string;
  project_id: string;
  template_name: string | null;
  project_name: string | null;
  project_code: string | null;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  status: string;
  download_url: string;
  created_at: string;
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
  urgency_surcharges_count: number;
  urgency_order_surcharges_count: number;
  urgency_client_total: number;
  urgency_installer_total: number;
  urgency_profit_total: number;
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
  urgency_surcharges_count: number;
  urgency_order_surcharges_count: number;
  urgency_client_total: number;
  urgency_installer_total: number;
  urgency_profit_total: number;
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
    zero_price_doors?: number;
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
    door_type_ids?: string[];
    door_type_labels?: string[];
  }>;
};

type ImportResult = {
  parsed_rows: number;
  prepared_rows: number;
  imported: number;
  skipped: number;
  errors: ImportRowError[];
  diagnostics?: ImportColumnsDiagnostics | null;
  mode?: "analyze" | "import" | string;
  would_import?: number;
  would_skip?: number;
  idempotency_hit?: boolean;
};

type BulkAssignDoorsResponse = {
  assigned: number;
  skipped: number;
  assigned_door_ids: string[];
};

type ImportRowError = {
  row: number;
  message: string;
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

type ProjectAddressSuggestion = {
  key: string;
  label: string;
  street: string;
  building: string;
  city: string;
  entrance: string;
  lat: string;
  lng: string;
};

type ProjectAddressSuggestionsResponse = {
  items: ProjectAddressSuggestion[];
};

const PROJECT_CITY_COORDS: Array<{
  lat: string;
  lng: string;
  aliases: string[];
}> = [
  { lat: "31.8014", lng: "34.6435", aliases: ["ashdod", "אשדוד", "ашдод"] },
  {
    lat: "31.2518",
    lng: "34.7915",
    aliases: ["ashkelon", "אשקלון", "ашкелон"],
  },
  {
    lat: "31.7683",
    lng: "35.2137",
    aliases: ["jerusalem", "ירושלים", "иерусалим"],
  },
  {
    lat: "32.0853",
    lng: "34.7818",
    aliases: ["tel aviv", "tel-aviv", "תל אביב", "тель авив"],
  },
  { lat: "32.7940", lng: "34.9896", aliases: ["haifa", "חיפה", "хайфа"] },
  {
    lat: "31.9980",
    lng: "34.7320",
    aliases: ["rishon lezion", "ראשון לציון", "ришон лецион"],
  },
  { lat: "32.3215", lng: "34.8532", aliases: ["netanya", "נתניה", "нетания"] },
  {
    lat: "31.2520",
    lng: "34.7913",
    aliases: ["beer sheva", "be'er sheva", "באר שבע", "беэр шева"],
  },
];

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

function emptyProjectForm(): ProjectFormState {
  return {
    code: "",
    name: "",
    planned_start_date: "",
    planned_end_date: "",
    lifecycle_status: "ACTIVE",
    address: "",
    address_street: "",
    address_building: "",
    address_city: "",
    address_entrance: "",
    address_lat: "",
    address_lng: "",
    address_waze_url: "",
    developer_company: "",
    contact_name: "",
    contact_phone: "",
    developer_phone_alt: "",
    developer_whatsapp: "",
    contact_email: "",
    developer_notes: "",
  };
}

function normalizeDraftPhone(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  let digits = trimmed.replace(/[^\d+]/g, "");
  if (digits.startsWith("00")) {
    digits = `+${digits.slice(2)}`;
  }
  if (digits.startsWith("0")) {
    digits = `+972${digits.slice(1)}`;
  } else if (!digits.startsWith("+")) {
    digits = `+${digits}`;
  }
  digits = `+${digits.replace(/[^\d]/g, "")}`;
  return digits.length >= 12 && digits.length <= 13 ? digits : null;
}

function buildDraftProjectAddress(form: ProjectFormState): string {
  const structured = [
    form.address_street.trim(),
    form.address_building.trim(),
    form.address_city.trim(),
  ].filter(Boolean);
  const base =
    structured.length > 0 ? structured.join(", ") : form.address.trim();
  if (!base) {
    return "";
  }
  return form.address_entrance.trim()
    ? `${base}, ${form.address_entrance.trim()}`
    : base;
}

function buildDraftWazeLink(form: ProjectFormState): string | null {
  if (form.address_lat.trim() && form.address_lng.trim()) {
    return `https://www.waze.com/ul?ll=${encodeURIComponent(form.address_lat.trim())},${encodeURIComponent(form.address_lng.trim())}&navigate=yes`;
  }
  if (form.address_waze_url.trim()) {
    return form.address_waze_url.trim();
  }
  const address = buildDraftProjectAddress(form);
  if (!address) {
    return null;
  }
  return `https://www.waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`;
}

function buildDraftWhatsappMessage(
  form: ProjectFormState,
  locale: Locale,
): string | null {
  const code = form.code.trim();
  const name = form.name.trim();
  if (!code && !name) {
    return null;
  }
  const projectRef = code && name ? `${name} (${code})` : name || code;
  if (locale === "ru") {
    return `Добрый день, по проекту ${projectRef}`;
  }
  if (locale === "he") {
    return `שלום, בקשר לפרויקט ${projectRef}`;
  }
  return `Hello, regarding project ${projectRef}`;
}

function buildDraftWhatsappLink(
  form: ProjectFormState,
  locale: Locale,
): string | null {
  const phone = normalizeDraftPhone(
    form.developer_whatsapp || form.contact_phone,
  );
  if (!phone) {
    return null;
  }
  const message = buildDraftWhatsappMessage(form, locale);
  const waPhone = phone.replace("+", "");
  return message
    ? `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`
    : `https://wa.me/${waPhone}`;
}

function formatReadablePhone(value: string | null | undefined): string {
  const normalized = normalizeDraftPhone(value || "");
  if (!normalized) {
    return value?.trim() || "?";
  }
  if (normalized.startsWith("+972") && normalized.length === 13) {
    return `+972 ${normalized.slice(4, 6)}-${normalized.slice(6, 9)}-${normalized.slice(9)}`;
  }
  return normalized;
}

function formatProjectPhoneInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "";
  }

  let digits = trimmed.replace(/[^\d+]/g, "");
  if (digits.startsWith("00")) {
    digits = `+${digits.slice(2)}`;
  }
  if (digits.startsWith("0")) {
    digits = `+972${digits.slice(1)}`;
  } else if (digits.startsWith("972")) {
    digits = `+${digits}`;
  } else if (!digits.startsWith("+")) {
    digits = `+972${digits}`;
  }

  return `+${digits.replace(/[^\d]/g, "")}`;
}

async function copyTextToClipboard(value: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    return false;
  }
  await navigator.clipboard.writeText(value);
  return true;
}

function buildDraftMapPreviewUrl(form: ProjectFormState): string | null {
  const lat = Number(form.address_lat.trim());
  const lng = Number(form.address_lng.trim());
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  const delta = 0.01;
  const bbox = [lng - delta, lat - delta, lng + delta, lat + delta]
    .map((item) => item.toFixed(6))
    .join("%2C");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat.toFixed(6)}%2C${lng.toFixed(6)}`;
}

function buildProjectFieldErrorCopy(
  field: keyof ProjectFormFieldErrors,
  locale: Locale,
): string {
  const copyByField: Record<
    keyof ProjectFormFieldErrors,
    Record<Locale, string>
  > = {
    contact_phone: {
      en: "Enter the primary phone in +972XXXXXXXXX format.",
      ru: "Введите основной телефон в формате +972XXXXXXXXX.",
      he: "הזן את הטלפון הראשי בפורמט ‎+972XXXXXXXXX.",
    },
    developer_phone_alt: {
      en: "Enter the backup phone in +972XXXXXXXXX format.",
      ru: "Введите дополнительный телефон в формате +972XXXXXXXXX.",
      he: "הזן את הטלפון הנוסף בפורמט ‎+972XXXXXXXXX.",
    },
    developer_whatsapp: {
      en: "Enter the WhatsApp number in +972XXXXXXXXX format.",
      ru: "Введите номер WhatsApp в формате +972XXXXXXXXX.",
      he: "הזן את מספר ה-WhatsApp בפורמט ‎+972XXXXXXXXX.",
    },
    address_waze_url: {
      en: "Enter a valid http or https Waze link.",
      ru: "Введите корректную Waze-ссылку с http или https.",
      he: "הזן קישור Waze תקין עם http או https.",
    },
  };

  return copyByField[field][locale];
}

function lookupProjectCityCoords(
  city: string,
): { lat: string; lng: string } | null {
  const normalized = city.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  const match = PROJECT_CITY_COORDS.find((item) =>
    item.aliases.some((alias) => normalized.includes(alias)),
  );
  return match ? { lat: match.lat, lng: match.lng } : null;
}

function buildProjectAddressSuggestions(
  raw: string,
): ProjectAddressSuggestion[] {
  const value = raw.trim();
  if (value.length < 3) {
    return [];
  }

  const suggestions: ProjectAddressSuggestion[] = [];
  const seen = new Set<string>();

  const pushSuggestion = (
    street: string,
    building: string,
    city: string,
    entrance: string,
  ) => {
    const normalizedStreet = street.trim();
    const normalizedBuilding = building.trim();
    const normalizedCity = city.trim();
    const normalizedEntrance = entrance.trim();
    if (!normalizedStreet && !normalizedCity) {
      return;
    }
    const label = [
      normalizedStreet,
      normalizedBuilding,
      normalizedCity,
      normalizedEntrance,
    ]
      .filter(Boolean)
      .join(", ");
    if (!label || seen.has(label.toLowerCase())) {
      return;
    }
    seen.add(label.toLowerCase());
    const coords = lookupProjectCityCoords(normalizedCity);
    suggestions.push({
      key: label.toLowerCase(),
      label,
      street: normalizedStreet,
      building: normalizedBuilding,
      city: normalizedCity,
      entrance: normalizedEntrance,
      lat: coords?.lat || "",
      lng: coords?.lng || "",
    });
  };

  const commaParts = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (commaParts.length >= 3) {
    pushSuggestion(
      commaParts[0] || "",
      commaParts[1] || "",
      commaParts[2] || "",
      commaParts.slice(3).join(", "),
    );
  }

  const compactMatch = value.match(
    /^(.+?)\s+(\d+[A-Za-zА-Яа-я/-]*)\s+([A-Za-z\u0590-\u05FF\u0400-\u04FF][A-Za-z\u0590-\u05FF\u0400-\u04FF\s-]*?)(?:\s+([A-Za-z0-9\u0590-\u05FF\u0400-\u04FF-]+))?$/u,
  );
  if (compactMatch) {
    pushSuggestion(
      compactMatch[1] || "",
      compactMatch[2] || "",
      compactMatch[3] || "",
      compactMatch[4] || "",
    );
  }

  if (suggestions.length === 0) {
    pushSuggestion(value, "", "", "");
  }

  return suggestions;
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

function emptyAdditionalWorkForm(): AdditionalWorkFormState {
  return {
    addon_type_id: "",
    qty_planned: "1",
    client_price: "",
    installer_price: "",
    notes: "",
  };
}

function emptyUrgencySurchargeForm(): UrgencySurchargeFormState {
  return {
    scope: "PROJECT",
    order_number: "",
    reason: "",
    client_amount: "",
    installer_amount: "",
    effective_date: "",
    notes: "",
  };
}

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

function initialsFromName(value: string | null | undefined): string {
  const parts = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) {
    return "--";
  }
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "0 B";
  }
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function escapeCsvCell(value: string | number | null | undefined): string {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function buildImportErrorsCsv(errors: ImportRowError[]): string {
  const rows = [
    ["row", "message"],
    ...errors.map((errorItem) => [String(errorItem.row), errorItem.message]),
  ];
  return rows
    .map((row) => row.map((cell) => escapeCsvCell(cell)).join(","))
    .join("\n");
}

function safeDownloadFilename(value: string): string {
  return value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 140);
}

function downloadImportErrorsCsv(
  errors: ImportRowError[],
  filename: string,
): void {
  const csv = buildImportErrorsCsv(errors);
  downloadBlob(
    new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }),
    filename,
  );
}

function filenameFromDisposition(
  disposition: string | null,
  fallback: string,
): string {
  const match = (disposition || "").match(/filename="?([^"]+)"?/i);
  return match?.[1] || fallback;
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

function riskTone(value: string): string {
  const normalized = value.trim().toUpperCase();
  if (["DANGER", "FAILED", "BLOCKED", "ERROR"].includes(normalized)) {
    return "border border-status-problem-border bg-status-problem-bg text-status-problem-fg";
  }
  if (["WARN", "AT_RISK", "UNASSIGNED"].includes(normalized)) {
    return "border border-status-warning-border bg-status-warning-bg text-status-warning-fg";
  }
  if (["OK", "READY", "DONE"].includes(normalized)) {
    return "border border-status-ok-border bg-status-ok-bg text-status-ok-fg";
  }
  return "border border-status-blocked-border bg-status-blocked-bg text-status-blocked-fg";
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
  const marking = row.door_marking.trim();
  const trailingNumber = marking.match(/(\d+)\D*$/)?.[1];
  const label = trailingNumber || marking || row.unit_label;
  return label.slice(-4);
}

function issueLabel(issue: ProjectOpenIssue): string {
  const parts = [issue.title, issue.details].filter(
    (value) => !!value && value.trim().length > 0,
  );
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
  const copy = (en: string, ru: string, he: string) =>
    locale === "ru" ? ru : locale === "he" ? he : en;
  const locationLabel = (value: string | null | undefined): string => {
    if (!value) {
      return "-";
    }
    return LOCATION_LABELS[value]?.[locale] || value;
  };
  const importRowErrorLabel = (message: string): string => {
    const match = /^missing required row values:\s*(.+)$/i.exec(message.trim());
    if (!match) {
      return message;
    }
    const fieldLabels: Record<string, string> = {
      house_number: copy("house", "дом", "בניין"),
      floor_label: copy("floor", "этаж", "קומה"),
      apartment_number: copy("apartment/location", "квартира/позиция", "דירה/מיקום"),
      door_marking: copy("door marking", "маркировка двери", "סימון דלת"),
      order_number: copy("order number", "номер заказа", "מספר הזמנה"),
    };
    const fields = match[1]
      .split(",")
      .map((field) => field.trim())
      .filter(Boolean)
      .map((field) => fieldLabels[field] || field)
      .join(", ");
    return `${copy(
      "Missing required values",
      "Не заполнены обязательные поля",
      "חסרים ערכי חובה",
    )}: ${fields}`;
  };
  const importProfileLabel = (code: string, fallback = code) => {
    switch (code) {
      case "auto_v1":
        return copy("Auto detect", "Автоопределение", "זיהוי אוטומטי");
      case "factory_he_v1":
        return copy("Factory Hebrew", "Заводской файл на иврите", "קובץ מפעל בעברית");
      case "supplier_delivery_he_v1":
        return copy("Hebrew delivery report", "Отчёт поставки на иврите", "דוח אספקה בעברית");
      case "factory_ru_v1":
        return copy("Factory Russian", "Заводской файл на русском", "קובץ מפעל ברוסית");
      case "generic_en_v1":
        return copy("Generic English", "Универсальный файл на английском", "קובץ כללי באנגלית");
      default:
        return fallback;
    }
  };
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
  const [doorTypes, setDoorTypes] = useState<DoorType[]>([]);
  const [libraryProducts, setLibraryProducts] = useState<LibraryProductItem[]>(
    [],
  );
  const [installers, setInstallers] = useState<InstallerListItem[]>([]);
  const [reasons, setReasons] = useState<ReasonItem[]>([]);
  const [addonTypes, setAddonTypes] = useState<AddonTypeItem[]>([]);
  const [projectAddonPlan, setProjectAddonPlan] = useState<
    ProjectAddonPlanItem[]
  >([]);
  const [urgencySurcharges, setUrgencySurcharges] = useState<
    UrgencySurchargeItem[]
  >([]);
  const [documentTemplates, setDocumentTemplates] = useState<
    DocumentTemplateDTO[]
  >([]);
  const [projectDocuments, setProjectDocuments] = useState<
    DocumentGenerationDTO[]
  >([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );
  const [projectDetails, setProjectDetails] =
    useState<ProjectDetailsResponse | null>(null);
  const [layout, setLayout] = useState<ProjectDoorsLayoutResponse | null>(null);
  const [projectPlanFact, setProjectPlanFact] =
    useState<ProjectPlanFactResponse | null>(null);
  const [projectRisk, setProjectRisk] =
    useState<ProjectRiskDrilldownResponse | null>(null);
  const [search, setSearch] = useState("");
  const [projectStatusFilter, setProjectStatusFilter] =
    useState<ProjectStatusFilter>("ALL");
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingDoorTypes, setLoadingDoorTypes] = useState(false);
  const [loadingLibraryProducts, setLoadingLibraryProducts] = useState(false);
  const [loadingInstallers, setLoadingInstallers] = useState(false);
  const [loadingReasons, setLoadingReasons] = useState(false);
  const [loadingAddonTypes, setLoadingAddonTypes] = useState(false);
  const [loadingProjectAddonPlan, setLoadingProjectAddonPlan] = useState(false);
  const [loadingUrgencySurcharges, setLoadingUrgencySurcharges] =
    useState(false);
  const [loadingDocumentTemplates, setLoadingDocumentTemplates] =
    useState(false);
  const [loadingProjectDocuments, setLoadingProjectDocuments] = useState(false);
  const [loadingProjectDetails, setLoadingProjectDetails] = useState(false);
  const [loadingLayout, setLoadingLayout] = useState(false);
  const [loadingProjectPlanFact, setLoadingProjectPlanFact] = useState(false);
  const [loadingProjectRisk, setLoadingProjectRisk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectFlowNotice, setProjectFlowNotice] = useState<string | null>(
    null,
  );
  const [projectActionHint, setProjectActionHint] = useState<string | null>(
    null,
  );
  const quickActionCopyTimeoutRef = useRef<number | null>(null);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [projectDialogMode, setProjectDialogMode] = useState<"create" | "edit">(
    "create",
  );
  const [projectForm, setProjectForm] =
    useState<ProjectFormState>(emptyProjectForm());
  const [projectFormFieldErrors, setProjectFormFieldErrors] =
    useState<ProjectFormFieldErrors>({});
  const [projectSubmitting, setProjectSubmitting] = useState(false);
  const [manualDoorDialogOpen, setManualDoorDialogOpen] = useState(false);
  const [manualDoorForm, setManualDoorForm] = useState<ManualDoorFormState>(
    emptyManualDoorForm(),
  );
  const [manualDoorSubmitting, setManualDoorSubmitting] = useState(false);
  const [additionalWorkDialogOpen, setAdditionalWorkDialogOpen] =
    useState(false);
  const [additionalWorkForm, setAdditionalWorkForm] =
    useState<AdditionalWorkFormState>(emptyAdditionalWorkForm());
  const [additionalWorkSubmitting, setAdditionalWorkSubmitting] =
    useState(false);
  const [urgencyDialogOpen, setUrgencyDialogOpen] = useState(false);
  const [urgencyForm, setUrgencyForm] = useState<UrgencySurchargeFormState>(
    emptyUrgencySurchargeForm(),
  );
  const [urgencySubmitting, setUrgencySubmitting] = useState(false);
  const [selectedDocumentTemplateId, setSelectedDocumentTemplateId] =
    useState("");
  const [documentManualNote, setDocumentManualNote] = useState("");
  const [documentGenerating, setDocumentGenerating] = useState(false);
  const [downloadingDocumentId, setDownloadingDocumentId] = useState<
    string | null
  >(null);

  const [importFile, setImportFile] = useState<File | null>(null);
  const [defaultDoorTypeId, setDefaultDoorTypeId] = useState("");
  const [delimiter, setDelimiter] = useState("");
  const [mappingProfiles, setMappingProfiles] = useState<
    ImportMappingProfile[]
  >([]);
  const [mappingProfile, setMappingProfile] = useState("auto_v1");
  const [loadingMappingProfiles, setLoadingMappingProfiles] = useState(false);
  const [createMissingDoorTypes, setCreateMissingDoorTypes] = useState(true);
  const [downloadingImportTemplate, setDownloadingImportTemplate] =
    useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importAction, setImportAction] = useState<"analyze" | "import" | null>(
    null,
  );
  const [analysisReady, setAnalysisReady] = useState(false);
  const [allowPartialImport, setAllowPartialImport] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importHistory, setImportHistory] = useState<ProjectImportRunItem[]>(
    [],
  );
  const [loadingImportHistory, setLoadingImportHistory] = useState(false);
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
  const [failedQueue, setFailedQueue] =
    useState<FailedImportQueueResponse | null>(null);
  const [failedQueueOffset, setFailedQueueOffset] = useState(0);
  const [failedQueueOnlySelectedProject, setFailedQueueOnlySelectedProject] =
    useState(false);
  const [loadingFailedQueue, setLoadingFailedQueue] = useState(false);
  const [selectedFailedRunIds, setSelectedFailedRunIds] = useState<string[]>(
    [],
  );
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
  const [focusedImportRunDetails, setFocusedImportRunDetails] =
    useState<ProjectImportRunDetails | null>(null);
  const [loadingImportRunDetails, setLoadingImportRunDetails] = useState(false);
  const [deepLinkApplied, setDeepLinkApplied] = useState(false);
  const [deepLinkProjectMissing, setDeepLinkProjectMissing] = useState(false);
  const [projectAddressSuggestions, setProjectAddressSuggestions] = useState<
    ProjectAddressSuggestion[]
  >([]);
  const [
    loadingProjectAddressSuggestions,
    setLoadingProjectAddressSuggestions,
  ] = useState(false);
  const [deepLinkFocusApplied, setDeepLinkFocusApplied] = useState(false);
  const [createProjectDeepLinkApplied, setCreateProjectDeepLinkApplied] =
    useState(false);
  const [matrixHouse, setMatrixHouse] = useState("all");
  const [matrixOrderNumber, setMatrixOrderNumber] = useState("all");
  const [matrixFloor, setMatrixFloor] = useState("all");
  const [matrixLocation, setMatrixLocation] = useState("all");
  const [matrixDoorType, setMatrixDoorType] = useState("all");
  const [matrixStatus, setMatrixStatus] = useState("all");
  const [matrixIssueFilter, setMatrixIssueFilter] = useState<"all" | "issues">(
    "all",
  );
  const [matrixApartmentSearch, setMatrixApartmentSearch] = useState("");
  const [matrixMarkingSearch, setMatrixMarkingSearch] = useState("");
  const [selectedDoorIds, setSelectedDoorIds] = useState<string[]>([]);
  const [bulkAssignInstallerId, setBulkAssignInstallerId] = useState("");
  const [bulkAssignLoading, setBulkAssignLoading] = useState(false);

  const importAnalyzeErrorsCount =
    importResult?.mode === "analyze" ? importResult.errors.length : 0;
  const importBlockedByRowErrors =
    importAnalyzeErrorsCount > 0 && !allowPartialImport;

  const deepLinkProjectId = (searchParams?.get("project_id") || "").trim();
  const createProjectRequested = searchParams?.get("create") === "1";
  const deepLinkFocusSection = (searchParams?.get("focus_section") || "")
    .trim()
    .toLowerCase();
  const deepLinkOrderNumber = (searchParams?.get("order_number") || "").trim();
  const focusedSectionLabel =
    deepLinkFocusSection === "doors"
      ? "Doors"
      : deepLinkFocusSection === "addons"
        ? "Additional works"
        : deepLinkFocusSection === "urgency"
          ? "Urgency surcharge"
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

  const projectStatusTabs = useMemo(
    () => [
      { id: "ALL" as const, label: "All", count: projectPortfolioStats.total },
      {
        id: "ACTIVE" as const,
        label: "Active",
        count: projectPortfolioStats.active,
      },
      {
        id: "PROBLEM" as const,
        label: "Problem",
        count: projectPortfolioStats.problem,
      },
      {
        id: "COMPLETED" as const,
        label: "Completed",
        count: projectPortfolioStats.completed,
      },
      {
        id: "ARCHIVED" as const,
        label: "Cancelled",
        count: projectPortfolioStats.archived,
      },
    ],
    [projectPortfolioStats],
  );

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
  const activeDocumentTemplates = useMemo(
    () => documentTemplates.filter((template) => template.is_active),
    [documentTemplates],
  );
  const selectedDocumentTemplate = useMemo(
    () =>
      activeDocumentTemplates.find(
        (template) => template.id === selectedDocumentTemplateId,
      ) || null,
    [activeDocumentTemplates, selectedDocumentTemplateId],
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
  const selectedAddonType = useMemo(
    () =>
      activeAddonTypes.find(
        (item) => item.id === additionalWorkForm.addon_type_id,
      ) || null,
    [activeAddonTypes, additionalWorkForm.addon_type_id],
  );
  const addonPlanTotals = useMemo(() => {
    return projectAddonPlan.reduce(
      (acc, item) => {
        const qty = Number(item.qty_planned) || 0;
        const client = Number(item.client_price) || 0;
        const installer = Number(item.installer_price) || 0;
        acc.rows += 1;
        acc.qty += qty;
        acc.client += qty * client;
        acc.installer += qty * installer;
        return acc;
      },
      { rows: 0, qty: 0, client: 0, installer: 0 },
    );
  }, [projectAddonPlan]);
  const urgencyTotals = useMemo(() => {
    return urgencySurcharges.reduce(
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
    );
  }, [urgencySurcharges]);

  const filteredImportHistory = useMemo(() => {
    return importHistory.filter((run) => {
      if (
        importHistoryStatusFilter !== "all" &&
        run.status !== importHistoryStatusFilter
      ) {
        return false;
      }
      return true;
    });
  }, [importHistory, importHistoryStatusFilter]);

  const importRunResultSummary = (
    run: Pick<ProjectImportRunItem, "imported" | "skipped" | "errors_count">,
  ) =>
    t("projects.resultSummary")
      .replace("{imported}", String(run.imported))
      .replace("{skipped}", String(run.skipped))
      .replace(
        "{errors}",
        run.errors_count > 0
          ? t("projects.errCount").replace("{count}", String(run.errors_count))
          : "",
      );

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
            doorTypeLabelById.get(door.door_type_id) || door.door_type_id,
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
          label: doorTypeLabelById.get(id) || id,
        }))
        .sort((a, b) => compareNatural(a.label, b.label)),
    [matrixRows, doorTypeLabelById],
  );
  const matrixStatusOptions = useMemo(
    () =>
      Array.from(new Set(matrixRows.map((x) => x.status))).sort(compareNatural),
    [matrixRows],
  );

  const filteredMatrixRows = useMemo(() => {
    const aptQ = matrixApartmentSearch.trim().toLowerCase();
    const markingQ = matrixMarkingSearch.trim().toLowerCase();
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
      if (matrixIssueFilter === "issues" && row.issue_count === 0)
        return false;
      if (aptQ && !row.apartment_number.toLowerCase().includes(aptQ))
        return false;
      if (markingQ && !row.door_marking.toLowerCase().includes(markingQ))
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
    matrixIssueFilter,
    matrixApartmentSearch,
    matrixMarkingSearch,
  ]);

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
  const projectTopIssues = (projectDetails?.issues_open || []).slice(0, 3);
  const projectRecentImportActivity = importHistory.slice(0, 3);
  const projectFinancialReady = Boolean(
    canViewProjectRates && projectPlanFact && projectRisk?.summary,
  );
  const scrollToProjectSection = (sectionId: string) => {
    if (typeof document === "undefined") {
      return;
    }
    document.getElementById(sectionId)?.scrollIntoView?.({
      behavior: "smooth",
      block: "start",
    });
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
                      .map((id) => doorTypeLabelById.get(id) || id)
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
                            .map((id) => doorTypeLabelById.get(id) || id)
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
    setError(null);
    try {
      const response = await apiFetch<{ items: ProjectListItem[] }>(
        "/api/v1/admin/projects",
      );
      const items = response.items || [];
      setProjects(items);
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
    } catch (e) {
      setError(readableApiError(e, locale, t("projects.failedLoadProjects")));
    } finally {
      setLoadingProjects(false);
    }
  }, [deepLinkProjectId, locale, t]);

  const loadDoorTypes = useCallback(async () => {
    setLoadingDoorTypes(true);
    setError(null);
    try {
      const response = await apiFetch<DoorType[]>(
        "/api/v1/admin/door-types?is_active=true&limit=200",
      );
      setDoorTypes(response || []);
    } catch (e) {
      setDoorTypes([]);
      setError(readableApiError(e, locale, t("projects.failedLoadDoorTypes")));
    } finally {
      setLoadingDoorTypes(false);
    }
  }, [locale, t]);

  const loadLibraryProducts = async () => {
    setLoadingLibraryProducts(true);
    try {
      const response = await apiFetch<
        LibraryProductItem[] | { items?: LibraryProductItem[] }
      >("/api/v1/admin/library?status=ACTIVE&limit=500");
      setLibraryProducts(
        Array.isArray(response) ? response : response.items || [],
      );
    } catch {
      setLibraryProducts([]);
    } finally {
      setLoadingLibraryProducts(false);
    }
  };

  const loadInstallers = async () => {
    setLoadingInstallers(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "200");
      const response = await apiFetch<
        InstallerListItem[] | { items?: InstallerListItem[] }
      >(`/api/v1/admin/installers?${params.toString()}`);
      setInstallers(Array.isArray(response) ? response : response.items || []);
    } catch {
      setInstallers([]);
    } finally {
      setLoadingInstallers(false);
    }
  };

  const loadReasons = async () => {
    setLoadingReasons(true);
    try {
      const response = await apiFetch<ReasonItem[] | { items?: ReasonItem[] }>(
        "/api/v1/admin/reasons?is_active=true&limit=200",
      );
      setReasons(Array.isArray(response) ? response : response.items || []);
    } catch {
      setReasons([]);
    } finally {
      setLoadingReasons(false);
    }
  };

  const loadAddonTypes = async () => {
    setLoadingAddonTypes(true);
    try {
      const response = await apiFetch<
        AddonTypeItem[] | { items?: AddonTypeItem[] }
      >("/api/v1/admin/addons/types");
      setAddonTypes(Array.isArray(response) ? response : response.items || []);
    } catch {
      setAddonTypes([]);
    } finally {
      setLoadingAddonTypes(false);
    }
  };

  const loadMappingProfiles = useCallback(async () => {
    setLoadingMappingProfiles(true);
    try {
      const response = await apiFetch<ImportMappingProfilesResponse>(
        "/api/v1/admin/projects/import-mapping-profiles",
      );
      const items = Array.isArray(response.items) ? response.items : [];
      setMappingProfiles(items);
      setMappingProfile((currentProfile) => {
        if (
          response.default_code &&
          items.some((item) => item.code === response.default_code)
        ) {
          return response.default_code;
        }
        if (
          items.length > 0 &&
          !items.some((item) => item.code === currentProfile)
        ) {
          return items[0].code;
        }
        return currentProfile;
      });
    } catch {
      setMappingProfiles([]);
      setMappingProfile("auto_v1");
    } finally {
      setLoadingMappingProfiles(false);
    }
  }, []);

  const loadProjectDetails = async (projectId: string) => {
    setLoadingProjectDetails(true);
    try {
      const response = await apiFetch<ProjectDetailsResponse>(
        `/api/v1/admin/projects/${projectId}`,
      );
      setProjectDetails(response || null);
    } catch {
      setProjectDetails(null);
    } finally {
      setLoadingProjectDetails(false);
    }
  };

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

  const loadProjectPlanFact = useCallback(async (projectId: string) => {
    if (!canViewProjectRates) {
      setProjectPlanFact(null);
      setLoadingProjectPlanFact(false);
      return;
    }
    setLoadingProjectPlanFact(true);
    try {
      const response = await apiFetch<ProjectPlanFactResponse>(
        `/api/v1/admin/reports/project-plan-fact/${projectId}`,
      );
      setProjectPlanFact(
        response && typeof response.project_id === "string" ? response : null,
      );
    } catch {
      setProjectPlanFact(null);
    } finally {
      setLoadingProjectPlanFact(false);
    }
  }, [canViewProjectRates]);

  const loadProjectRisk = useCallback(async (projectId: string) => {
    if (!canViewProjectRates) {
      setProjectRisk(null);
      setLoadingProjectRisk(false);
      return;
    }
    setLoadingProjectRisk(true);
    try {
      const response = await apiFetch<ProjectRiskDrilldownResponse>(
        `/api/v1/admin/reports/project-risk-drilldown/${projectId}?limit=5`,
      );
      setProjectRisk(
        response && typeof response.project_id === "string" ? response : null,
      );
    } catch {
      setProjectRisk(null);
    } finally {
      setLoadingProjectRisk(false);
    }
  }, [canViewProjectRates]);

  const loadProjectAddonPlan = useCallback(async (projectId: string) => {
    if (!canViewProjectRates) {
      setProjectAddonPlan([]);
      setLoadingProjectAddonPlan(false);
      return;
    }
    setLoadingProjectAddonPlan(true);
    try {
      const response = await apiFetch<
        ProjectAddonPlanItem[] | { items?: ProjectAddonPlanItem[] }
      >(`/api/v1/admin/projects/${projectId}/addons/plan`);
      setProjectAddonPlan(
        Array.isArray(response) ? response : response.items || [],
      );
    } catch {
      setProjectAddonPlan([]);
    } finally {
      setLoadingProjectAddonPlan(false);
    }
  }, [canViewProjectRates]);

  const loadUrgencySurcharges = useCallback(async (projectId: string) => {
    if (!canViewProjectRates) {
      setUrgencySurcharges([]);
      setLoadingUrgencySurcharges(false);
      return;
    }
    setLoadingUrgencySurcharges(true);
    try {
      const response = await apiFetch<
        UrgencySurchargeItem[] | { items?: UrgencySurchargeItem[] }
      >(`/api/v1/admin/projects/${projectId}/urgency-surcharges`);
      setUrgencySurcharges(
        Array.isArray(response) ? response : response.items || [],
      );
    } catch {
      setUrgencySurcharges([]);
    } finally {
      setLoadingUrgencySurcharges(false);
    }
  }, [canViewProjectRates]);

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

  const loadDocumentTemplates = async () => {
    setLoadingDocumentTemplates(true);
    try {
      const response = await apiFetch<{ items?: DocumentTemplateDTO[] }>(
        "/api/v1/admin/documents/templates",
      );
      setDocumentTemplates(response.items || []);
    } catch {
      setDocumentTemplates([]);
    } finally {
      setLoadingDocumentTemplates(false);
    }
  };

  const loadProjectDocuments = async (projectId: string) => {
    setLoadingProjectDocuments(true);
    try {
      const params = new URLSearchParams();
      params.set("project_id", projectId);
      params.set("limit", "12");
      const response = await apiFetch<{ items?: DocumentGenerationDTO[] }>(
        `/api/v1/admin/documents/generated?${params.toString()}`,
      );
      setProjectDocuments(response.items || []);
    } catch {
      setProjectDocuments([]);
    } finally {
      setLoadingProjectDocuments(false);
    }
  };

  const loadImportHistory = useCallback(async (projectId: string) => {
    setLoadingImportHistory(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "30");
      params.set("offset", "0");
      if (importHistoryModeFilter !== "all") {
        params.set("mode", importHistoryModeFilter);
      }
      const response = await apiFetch<ProjectImportRunsResponse>(
        `/api/v1/admin/projects/${projectId}/doors/import-history?${params.toString()}`,
      );
      const items = response.items || [];
      setImportHistory(items);
      if (deepLinkOnlyFailed || deepLinkFailedIds.length > 0) {
        setFocusedImportRunId((currentRunId) => {
          if (currentRunId) {
            return currentRunId;
          }
          const failed = items.find(
            (item) => item.status === "FAILED" || item.status === "PARTIAL",
          );
          return failed?.id || currentRunId;
        });
      }
    } catch {
      setImportHistory([]);
    } finally {
      setLoadingImportHistory(false);
    }
  }, [deepLinkFailedIds, deepLinkOnlyFailed, importHistoryModeFilter]);

  const loadImportRunDetails = async (projectId: string, runId: string) => {
    setLoadingImportRunDetails(true);
    try {
      const response = await apiFetch<ProjectImportRunDetails>(
        `/api/v1/admin/projects/${projectId}/doors/import-runs/${runId}`,
      );
      setFocusedImportRunDetails(response);
    } catch {
      setFocusedImportRunDetails(null);
    } finally {
      setLoadingImportRunDetails(false);
    }
  };

  const loadFailedQueue = useCallback(async () => {
    setLoadingFailedQueue(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(FAILED_QUEUE_PAGE_SIZE));
      params.set("offset", String(failedQueueOffset));
      if (failedQueueOnlySelectedProject && selectedProjectId) {
        params.set("project_id", selectedProjectId);
      }
      const response = await apiFetch<FailedImportQueueResponse>(
        `/api/v1/admin/projects/import-runs/failed-queue?${params.toString()}`,
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
      setFailedQueue({
        items: [],
        total: 0,
        limit: FAILED_QUEUE_PAGE_SIZE,
        offset: 0,
      });
    } finally {
      setLoadingFailedQueue(false);
    }
  }, [failedQueueOffset, failedQueueOnlySelectedProject, selectedProjectId]);

  useEffect(() => {
    void loadProjects();
    void loadDoorTypes();
    void loadLibraryProducts();
    void loadInstallers();
    void loadReasons();
    void loadAddonTypes();
    void loadMappingProfiles();
    void loadDocumentTemplates();
  }, [loadDoorTypes, loadMappingProfiles, loadProjects]);

  useEffect(() => {
    if (
      selectedDocumentTemplateId &&
      activeDocumentTemplates.some(
        (template) => template.id === selectedDocumentTemplateId,
      )
    ) {
      return;
    }
    setSelectedDocumentTemplateId(activeDocumentTemplates[0]?.id || "");
  }, [activeDocumentTemplates, selectedDocumentTemplateId]);

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
    if (selectedProjectId) {
      void loadProjectDetails(selectedProjectId);
      void loadLayout(selectedProjectId);
      if (canViewProjectRates) {
        void loadProjectPlanFact(selectedProjectId);
        void loadProjectRisk(selectedProjectId);
        void loadProjectAddonPlan(selectedProjectId);
        void loadUrgencySurcharges(selectedProjectId);
      } else {
        setProjectPlanFact(null);
        setProjectRisk(null);
        setProjectAddonPlan([]);
        setUrgencySurcharges([]);
      }
      void loadImportHistory(selectedProjectId);
      void loadProjectDocuments(selectedProjectId);
    } else {
      setProjectDetails(null);
      setProjectPlanFact(null);
      setProjectRisk(null);
      setProjectAddonPlan([]);
      setUrgencySurcharges([]);
      setImportHistory([]);
      setProjectDocuments([]);
      setFocusedImportRunDetails(null);
    }
  }, [
    canViewProjectRates,
    loadImportHistory,
    loadLayout,
    loadProjectAddonPlan,
    loadProjectPlanFact,
    loadProjectRisk,
    loadUrgencySurcharges,
    selectedProjectId,
  ]);

  useEffect(() => {
    setSelectedDoorIds([]);
    setFocusedDoorId(null);
    setFocusedDoorReasonId("");
    setFocusedDoorComment("");
    setFocusedDoorOverrideReason("");
    setBulkAssignInstallerId("");
    setMatrixIssueFilter("all");
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
    void loadFailedQueue();
  }, [loadFailedQueue]);

  useEffect(() => {
    if (!projectActionHint) {
      return;
    }
    const timeout = window.setTimeout(() => setProjectActionHint(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [projectActionHint]);

  useEffect(() => {
    if (!focusedImportRunId) {
      setFocusedImportRunDetails(null);
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

  const handleDownloadImportTemplate = async () => {
    if (!canManageProjectImports) return;
    setDownloadingImportTemplate(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        mapping_profile: mappingProfile || "auto_v1",
      });
      const response = await apiDownload(
        `/api/v1/admin/projects/doors/import-template.xlsx?${params.toString()}`,
      );
      const blob = await response.blob();
      downloadBlob(
        blob,
        filenameFromDisposition(
          response.headers.get("content-disposition"),
          `dimax-door-import-template-${mappingProfile || "auto_v1"}.xlsx`,
        ),
      );
    } catch (e) {
      setError(
        readableApiError(
          e,
          locale,
          copy(
            "Failed to download import template.",
            "Не удалось скачать шаблон импорта.",
            "הורדת תבנית הייבוא נכשלה.",
          ),
        ),
      );
    } finally {
      setDownloadingImportTemplate(false);
    }
  };

  const handleImportAction = async (mode: "analyze" | "import") => {
    if (!canManageProjectImports || !selectedProjectId || !importFile) {
      return;
    }
    setImportLoading(true);
    setImportAction(mode);
    setError(null);
    if (mode === "analyze") {
      setAllowPartialImport(false);
      setImportResult(null);
    }
    try {
      const body = new FormData();
      body.append("file", importFile);
      body.append("default_our_price", "0");
      body.append("create_missing_door_types", String(createMissingDoorTypes));
      body.append("analyze_only", mode === "analyze" ? "true" : "false");
      body.append(
        "allow_partial_import",
        mode === "import" && allowPartialImport ? "true" : "false",
      );
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
        },
      );
      setImportResult(response);
      if (mode === "analyze") {
        setAnalysisReady(response.mode === "analyze");
      } else {
        setAnalysisReady(false);
        setAllowPartialImport(false);
        await loadProjectDetails(selectedProjectId);
        await loadLayout(selectedProjectId);
        await loadProjectPlanFact(selectedProjectId);
        await loadProjectRisk(selectedProjectId);
      }
      await loadImportHistory(selectedProjectId);
    } catch (e) {
      setError(readableApiError(e, locale, t("projects.failedImportFile")));
    } finally {
      setImportLoading(false);
      setImportAction(null);
    }
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
    setFocusedImportRunDetails(null);
    if (selectedProjectId === projectId) {
      void loadImportHistory(projectId);
      return;
    }
    setSelectedProjectId(projectId);
  };

  const projectFormPayload = {
    code: projectForm.code.trim() || null,
    name: projectForm.name.trim(),
    planned_start_date: projectForm.planned_start_date || null,
    planned_end_date: projectForm.planned_end_date || null,
    lifecycle_status: projectForm.lifecycle_status,
    address: projectForm.address.trim(),
    address_street: projectForm.address_street.trim() || null,
    address_building: projectForm.address_building.trim() || null,
    address_city: projectForm.address_city.trim() || null,
    address_entrance: projectForm.address_entrance.trim() || null,
    address_lat: projectForm.address_lat.trim()
      ? Number(projectForm.address_lat)
      : null,
    address_lng: projectForm.address_lng.trim()
      ? Number(projectForm.address_lng)
      : null,
    address_waze_url: projectForm.address_waze_url.trim() || null,
    developer_company: projectForm.developer_company.trim() || null,
    contact_name: projectForm.contact_name.trim() || null,
    contact_phone: projectForm.contact_phone.trim() || null,
    developer_phone_alt: projectForm.developer_phone_alt.trim() || null,
    developer_whatsapp: projectForm.developer_whatsapp.trim() || null,
    contact_email: projectForm.contact_email.trim() || null,
    developer_notes: projectForm.developer_notes.trim() || null,
  };
  const draftWazeLink = buildDraftWazeLink(projectForm);
  const draftWhatsappLink = buildDraftWhatsappLink(projectForm, locale);
  const draftCallLink = normalizeDraftPhone(projectForm.contact_phone)
    ? `tel:${normalizeDraftPhone(projectForm.contact_phone)}`
    : null;

  const openCreateProjectDialog = () => {
    if (!canManageProjects) return;
    setProjectDialogMode("create");
    setProjectForm(emptyProjectForm());
    setProjectFormFieldErrors({});
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
    setProjectForm(emptyProjectForm());
    setProjectFormFieldErrors({});
    setProjectFlowNotice(null);
    setProjectActionHint(null);
    setError(null);
    setProjectDialogOpen(true);
  }, [
    canManageProjects,
    createProjectDeepLinkApplied,
    createProjectRequested,
  ]);

  const openEditProjectDialog = () => {
    if (!canManageProjects) return;
    if (!projectDetails) {
      return;
    }
    setProjectDialogMode("edit");
    setProjectForm(projectFormFromDetails(projectDetails));
    setProjectFormFieldErrors({});
    setProjectFlowNotice(null);
    setProjectActionHint(null);
    setError(null);
    setProjectDialogOpen(true);
  };

  const applyProjectAddressSuggestion = (
    suggestion: ProjectAddressSuggestion,
  ) => {
    setProjectForm((prev) => ({
      ...prev,
      address: suggestion.label,
      address_street: suggestion.street,
      address_building: suggestion.building,
      address_city: suggestion.city,
      address_entrance: suggestion.entrance,
      address_lat: suggestion.lat,
      address_lng: suggestion.lng,
    }));
    setProjectFormFieldErrors((prev) => {
      if (!prev.address_waze_url) {
        return prev;
      }
      const next = { ...prev };
      delete next.address_waze_url;
      return next;
    });
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
    if (!canManageProjects) return;
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
    if (!canManageProjects) return;
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

  const clearProjectPhoneCopyTimer = () => {
    if (quickActionCopyTimeoutRef.current != null) {
      window.clearTimeout(quickActionCopyTimeoutRef.current);
      quickActionCopyTimeoutRef.current = null;
    }
  };

  const copyProjectPhone = async (value: string | null | undefined) => {
    const normalized = normalizeDraftPhone(value || "");
    if (!normalized) {
      showProjectActionHint(
        copy(
          "Add a primary phone to unlock direct calling.",
          "Добавьте основной телефон, чтобы включить прямой звонок.",
          "הוסף טלפון ראשי כדי לפתוח חיוג ישיר.",
        ),
      );
      return;
    }
    const copied = await copyTextToClipboard(normalized);
    if (copied) {
      setProjectActionHint(null);
      setProjectFlowNotice(
        copy(
          "Phone number copied.",
          "Номер телефона скопирован.",
          "מספר הטלפון הועתק.",
        ),
      );
    }
  };

  const scheduleProjectPhoneCopy = (value: string | null | undefined) => {
    clearProjectPhoneCopyTimer();
    quickActionCopyTimeoutRef.current = window.setTimeout(() => {
      void copyProjectPhone(value);
      quickActionCopyTimeoutRef.current = null;
    }, 700);
  };

  const handleGenerateProjectDocument = async () => {
    if (!canManageProjects) return;
    if (!selectedProjectId || !selectedDocumentTemplateId) {
      setError(
        copy(
          "Choose a document template before generating.",
          "Выберите шаблон документа перед генерацией.",
          "בחר תבנית מסמך לפני יצירה.",
        ),
      );
      return;
    }
    setDocumentGenerating(true);
    setError(null);
    try {
      const overrides = documentManualNote.trim()
        ? { "manual.note": documentManualNote.trim() }
        : {};
      const generated = await apiFetch<DocumentGenerationDTO>(
        `/api/v1/admin/documents/projects/${selectedProjectId}/render`,
        {
          method: "POST",
          body: JSON.stringify({
            template_id: selectedDocumentTemplateId,
            overrides,
          }),
        },
      );
      setDocumentManualNote("");
      await loadProjectDocuments(selectedProjectId);
      setProjectFlowNotice(
        copy(
          `Document generated: ${generated.file_name}`,
          `Документ создан: ${generated.file_name}`,
          `המסמך נוצר: ${generated.file_name}`,
        ),
      );
    } catch (e) {
      setError(
        readableApiError(
          e,
          locale,
          copy(
            "Failed to generate project document.",
            "Не удалось создать документ объекта.",
            "יצירת מסמך הפרויקט נכשלה.",
          ),
        ),
      );
    } finally {
      setDocumentGenerating(false);
    }
  };

  const handleDownloadProjectDocument = async (
    generation: DocumentGenerationDTO,
  ) => {
    setDownloadingDocumentId(generation.id);
    setError(null);
    try {
      const response = await apiDownload(generation.download_url, {
        method: "GET",
        credentials: "include",
      });
      const blob = await response.blob();
      downloadBlob(
        blob,
        filenameFromDisposition(
          response.headers.get("content-disposition"),
          generation.file_name,
        ),
      );
    } catch (e) {
      setError(
        readableApiError(
          e,
          locale,
          copy(
            "Failed to download project document.",
            "Не удалось скачать документ объекта.",
            "הורדת מסמך הפרויקט נכשלה.",
          ),
        ),
      );
    } finally {
      setDownloadingDocumentId(null);
    }
  };

  const updateProjectFormField = <K extends keyof ProjectFormState>(
    field: K,
    value: ProjectFormState[K],
  ) => {
    setProjectForm((prev) => ({ ...prev, [field]: value }));
    if (field in projectFormFieldErrors) {
      setProjectFormFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field as keyof ProjectFormFieldErrors];
        return next;
      });
    }
  };

  useEffect(() => {
    if (!projectDialogOpen) {
      setProjectAddressSuggestions([]);
      setLoadingProjectAddressSuggestions(false);
      return;
    }

    const query = projectForm.address.trim();
    if (query.length < 3) {
      setProjectAddressSuggestions([]);
      setLoadingProjectAddressSuggestions(false);
      return;
    }

    let active = true;
    const timeoutId = window.setTimeout(async () => {
      setLoadingProjectAddressSuggestions(true);
      try {
        const response = await apiFetch<ProjectAddressSuggestionsResponse>(
          `/api/v1/admin/projects/address-suggestions?q=${encodeURIComponent(query)}&limit=5`,
        );
        if (active) {
          setProjectAddressSuggestions(response.items || []);
        }
      } catch {
        if (active) {
          setProjectAddressSuggestions(buildProjectAddressSuggestions(query));
        }
      } finally {
        if (active) {
          setLoadingProjectAddressSuggestions(false);
        }
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [projectDialogOpen, projectForm.address]);

  const handleProjectSubmit = async () => {
    if (!canManageProjects) return;
    if (!projectForm.name.trim()) {
      setError(
        copy(
          "Project name is required.",
          "Название проекта обязательно.",
          "שם הפרויקט הוא שדה חובה.",
        ),
      );
      return;
    }

    setProjectSubmitting(true);
    setError(null);
    setProjectFormFieldErrors({});

    try {
      if (projectDialogMode === "create") {
        const response = await apiFetch<{ id: string }>(
          "/api/v1/admin/projects",
          {
            method: "POST",
            body: JSON.stringify(projectFormPayload),
          },
        );
        await loadProjects();
        setSelectedProjectId(response.id);
        setProjectDialogOpen(false);
        setProjectForm(emptyProjectForm());
        setProjectFlowNotice(
          copy(
            "Project created. Continue with address, contacts and import flow.",
            "Проект создан. Продолжайте с адресом, контактами и импортом.",
            "הפרויקט נוצר. המשך עם כתובת, אנשי קשר וזרימת הייבוא.",
          ),
        );
        return;
      }

      if (!selectedProjectId) {
        return;
      }
      await apiFetch(`/api/v1/admin/projects/${selectedProjectId}`, {
        method: "PATCH",
        body: JSON.stringify(projectFormPayload),
      });
      await loadProjects();
      await loadProjectDetails(selectedProjectId);
      setProjectDialogOpen(false);
      setProjectFlowNotice(
        copy(
          "Project settings updated. Quick actions are ready where data is available.",
          "Настройки проекта обновлены. Быстрые действия готовы там, где данные заполнены.",
          "הגדרות הפרויקט עודכנו. פעולות מהירות מוכנות היכן שהנתונים מולאו.",
        ),
      );
    } catch (e) {
      if (e instanceof ApiError) {
        const fieldFromMeta =
          typeof e.meta?.field === "string" ? e.meta.field : null;
        const apiField = (e.field || fieldFromMeta) as
          | keyof ProjectFormFieldErrors
          | undefined;
        if (
          e.code === "INVALID_PHONE" &&
          apiField &&
          apiField in emptyProjectForm()
        ) {
          setProjectFormFieldErrors((prev) => ({
            ...prev,
            [apiField]: buildProjectFieldErrorCopy(apiField, locale),
          }));
        }
        if (e.code === "INVALID_WAZE_URL") {
          setProjectFormFieldErrors((prev) => ({
            ...prev,
            address_waze_url: buildProjectFieldErrorCopy(
              "address_waze_url",
              locale,
            ),
          }));
        }
      }
      setError(
        readableApiError(
          e,
          locale,
          copy(
            "Unable to save project settings.",
            "Не удалось сохранить настройки проекта.",
            "לא ניתן לשמור את הגדרות הפרויקט.",
          ),
        ),
      );
    } finally {
      setProjectSubmitting(false);
    }
  };

  const openManualDoorDialog = () => {
    if (!canManageProjects) return;
    const nextForm = emptyManualDoorForm();
    setManualDoorForm(nextForm);
    setProjectFlowNotice(null);
    setProjectActionHint(null);
    setError(null);
    setManualDoorDialogOpen(true);
  };

  const handleManualDoorSubmit = async () => {
    if (!canManageProjects) return;
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

  const openAdditionalWorkDialog = () => {
    if (!canManageProjects) return;
    if (!canViewProjectRates) {
      setError(commercialAccessRestrictedDetail);
      return;
    }
    setAdditionalWorkForm(emptyAdditionalWorkForm());
    setProjectFlowNotice(null);
    setProjectActionHint(null);
    setError(null);
    setAdditionalWorkDialogOpen(true);
  };

  const handleAdditionalWorkSubmit = async () => {
    if (!canManageProjects) return;
    if (!selectedProjectId) {
      return;
    }
    if (!canViewProjectRates) {
      setError(commercialAccessRestrictedDetail);
      return;
    }
    const qtyPlanned = Number(additionalWorkForm.qty_planned.trim());
    const clientPrice = Number(additionalWorkForm.client_price.trim());
    const installerPrice = Number(additionalWorkForm.installer_price.trim());
    if (
      !additionalWorkForm.addon_type_id ||
      !additionalWorkForm.qty_planned.trim() ||
      !additionalWorkForm.client_price.trim() ||
      !additionalWorkForm.installer_price.trim()
    ) {
      setError(
        copy(
          "Choose an add-on and fill qty + prices before saving.",
          "Выберите доп. работу и заполните количество и цены перед сохранением.",
          "בחר עבודת תוספת ומלא כמות ומחירים לפני השמירה.",
        ),
      );
      return;
    }
    if (
      !Number.isFinite(qtyPlanned) ||
      qtyPlanned <= 0 ||
      !Number.isFinite(clientPrice) ||
      clientPrice <= 0 ||
      !Number.isFinite(installerPrice) ||
      installerPrice <= 0
    ) {
      setError(
        copy(
          "Use positive numbers for planned qty and both prices.",
          "Используйте положительные числа для количества и обеих цен.",
          "השתמש במספרים חיוביים לכמות ולשני המחירים.",
        ),
      );
      return;
    }

    setAdditionalWorkSubmitting(true);
    setError(null);
    try {
      await apiFetch(
        `/api/v1/admin/projects/${selectedProjectId}/addons/plan`,
        {
          method: "POST",
          body: JSON.stringify({
            addon_type_id: additionalWorkForm.addon_type_id,
            qty_planned: additionalWorkForm.qty_planned.trim(),
            client_price: additionalWorkForm.client_price.trim(),
            installer_price: additionalWorkForm.installer_price.trim(),
            notes: additionalWorkForm.notes.trim() || null,
          }),
        },
      );
      setAdditionalWorkDialogOpen(false);
      setAdditionalWorkForm(emptyAdditionalWorkForm());
      await loadProjectAddonPlan(selectedProjectId);
      await loadProjectPlanFact(selectedProjectId);
      await loadProjectRisk(selectedProjectId);
      if (typeof document !== "undefined") {
        window.setTimeout(() => {
          document
            .getElementById("project-additional-works")
            ?.scrollIntoView?.({
              behavior: "smooth",
              block: "start",
            });
        }, 0);
      }
      setProjectFlowNotice(
        copy(
          `${selectedAddonType?.name || "Additional work"} was added to the project plan.`,
          `${selectedAddonType?.name || "Доп. работа"} добавлена в план проекта.`,
          `${selectedAddonType?.name || "עבודה נוספת"} נוספה לתוכנית הפרויקט.`,
        ),
      );
    } catch (e) {
      setError(
        readableApiError(
          e,
          locale,
          copy(
            "Failed to save additional work plan.",
            "Не удалось сохранить план доп. работ.",
            "שמירת תוכנית עבודות נוספות נכשלה.",
          ),
        ),
      );
    } finally {
      setAdditionalWorkSubmitting(false);
    }
  };

  const openUrgencyDialog = () => {
    if (!canManageProjects) return;
    if (!canViewProjectRates) {
      setError(commercialAccessRestrictedDetail);
      return;
    }
    setUrgencyForm(emptyUrgencySurchargeForm());
    setProjectFlowNotice(null);
    setProjectActionHint(null);
    setError(null);
    setUrgencyDialogOpen(true);
  };

  const handleUrgencySubmit = async () => {
    if (!canManageProjects) return;
    if (!selectedProjectId) {
      return;
    }
    if (!canViewProjectRates) {
      setError(commercialAccessRestrictedDetail);
      return;
    }
    const clientAmount = Number(urgencyForm.client_amount.trim());
    const installerAmount = Number(urgencyForm.installer_amount.trim());
    if (
      !urgencyForm.reason.trim() ||
      !urgencyForm.client_amount.trim() ||
      !urgencyForm.installer_amount.trim() ||
      (urgencyForm.scope === "ORDER_NUMBER" && !urgencyForm.order_number.trim())
    ) {
      setError(
        copy(
          "Fill reason and both surcharge amounts. Order-scoped surcharge also needs an order number.",
          "Укажите причину и обе суммы доплаты. Надбавке в рамках заказа также требуется номер заказа.",
          "מלא את הסיבה ואת שני סכומי ההיטל. תוספת בהיקף הזמנה צריכה גם מספר הזמנה.",
        ),
      );
      return;
    }
    if (
      !Number.isFinite(clientAmount) ||
      clientAmount <= 0 ||
      !Number.isFinite(installerAmount) ||
      installerAmount <= 0
    ) {
      setError(
        copy(
          "Use positive amounts for both surcharge values.",
          "Используйте положительные суммы для обеих надбавок.",
          "השתמש בסכומים חיוביים לשתי תוספות הדחיפות.",
        ),
      );
      return;
    }

    setUrgencySubmitting(true);
    setError(null);
    try {
      await apiFetch(
        `/api/v1/admin/projects/${selectedProjectId}/urgency-surcharges`,
        {
          method: "POST",
          body: JSON.stringify({
            scope: urgencyForm.scope,
            order_number:
              urgencyForm.scope === "ORDER_NUMBER"
                ? urgencyForm.order_number.trim()
                : null,
            reason: urgencyForm.reason.trim(),
            client_amount: urgencyForm.client_amount.trim(),
            installer_amount: urgencyForm.installer_amount.trim(),
            effective_date: urgencyForm.effective_date || null,
            notes: urgencyForm.notes.trim() || null,
          }),
        },
      );
      setUrgencyDialogOpen(false);
      setUrgencyForm(emptyUrgencySurchargeForm());
      await loadUrgencySurcharges(selectedProjectId);
      await loadProjectPlanFact(selectedProjectId);
      await loadProjectRisk(selectedProjectId);
      if (
        urgencyForm.scope === "ORDER_NUMBER" &&
        urgencyForm.order_number.trim()
      ) {
        setMatrixOrderNumber(urgencyForm.order_number.trim());
        if (typeof document !== "undefined") {
          window.setTimeout(() => {
            document.getElementById("project-door-matrix")?.scrollIntoView?.({
              behavior: "smooth",
              block: "start",
            });
          }, 0);
        }
      } else if (typeof document !== "undefined") {
        window.setTimeout(() => {
          document
            .getElementById("project-urgency-surcharge")
            ?.scrollIntoView?.({
              behavior: "smooth",
              block: "start",
            });
        }, 0);
      }
      setProjectFlowNotice(
        copy(
          urgencyForm.scope === "ORDER_NUMBER" &&
            urgencyForm.order_number.trim()
            ? `Urgency surcharge for order ${urgencyForm.order_number.trim()} was saved. The project matrix is now filtered to that order.`
            : "Project-level urgency surcharge was saved.",
          urgencyForm.scope === "ORDER_NUMBER" &&
            urgencyForm.order_number.trim()
            ? `Срочная надбавка для заказа ${urgencyForm.order_number.trim()} сохранена. Матрица проекта уже отфильтрована по этому заказу.`
            : "Срочная надбавка уровня проекта сохранена.",
          urgencyForm.scope === "ORDER_NUMBER" &&
            urgencyForm.order_number.trim()
            ? `תוספת הדחיפות להזמנה ${urgencyForm.order_number.trim()} נשמרה. מטריצת הפרויקט כבר מסוננת להזמנה הזו.`
            : "תוספת דחיפות ברמת הפרויקט נשמרה.",
        ),
      );
    } catch (e) {
      setError(
        readableApiError(
          e,
          locale,
          copy(
            "Failed to save urgency surcharge.",
            "Не удалось сохранить плату за срочность.",
            "חיסכון של תוספת דחיפות נכשלה.",
          ),
        ),
      );
    } finally {
      setUrgencySubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="page-shell motion-stagger readability-wrap flex flex-col gap-4 lg:gap-5">
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/" },
            { label: "Projects" },
            ...(selectedProject
              ? [{ label: selectedProjectCode }]
              : []),
          ]}
        />

        <section
          className={cn(
            "rounded-lg border border-border bg-surface px-4 py-4 md:px-5",
            projectDetailFocused ? "order-5" : "order-1",
          )}
          data-testid="projects-list-v25"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="inline-flex min-h-8 items-center rounded-full bg-[var(--dmx-accent-tint)] px-3 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-accent">
                {copy("Dashboard / Projects", "Главная / Проекты", "ראשי / פרויקטים")}
              </div>
              <h1 className="mt-4 text-[32px] font-semibold leading-tight text-text md:text-[42px]">
                {copy("Projects", "Проекты", "פרויקטים")}
              </h1>
              <p className="mt-2 max-w-3xl text-[13px] leading-6 text-text-secondary">
                <b className="font-semibold text-text">
                  {projectPortfolioStats.active}
                </b>{" "}
                {copy("active projects ·", "активных проектов ·", "פרויקטים פעילים ·")}{" "}
                <b className="font-semibold text-text">
                  {projectPortfolioStats.problem}
                </b>{" "}
                {copy("problem ·", "проблемных ·", "בעייתיים ·")}{" "}
                <b className="font-semibold text-text">
                  {filteredProjects.length}
                </b>{" "}
                {copy("visible after filters - updated from live project API", "отображается после фильтров — обновлено из API действующего проекта.", "גלוי לאחר מסננים - עודכן מ-API של פרויקט חי")}
              </p>
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
                className="dmx-secondary-action"
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

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {[
              {
                label: "Portfolio",
                value: projectPortfolioStats.total,
                note: "projects in admin scope",
              },
              {
                label: "Active",
                value: projectPortfolioStats.active,
                note: "not completed or archived",
              },
              {
                label: "Problem",
                value: projectPortfolioStats.problem,
                note: "risk, blocked or overdue",
              },
              {
                label: "Selected",
                value: bulkSelectedProjectIds.length,
                note: "ready for bulk actions",
              },
              {
                label: "Import queue",
                value: failedQueue?.total || 0,
                note: "failed Excel runs",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-border bg-surface-subtle px-4 py-3"
              >
                <div className={projectsMetricLabelClass}>{item.label}</div>
                <div className="mt-3 text-[30px] font-semibold leading-none text-text">
                  {item.value}
                </div>
                <div className="mt-2 truncate text-[12px] text-text-secondary">
                  {item.note}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 border-t border-border-subtle pt-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap gap-2">
                {projectStatusTabs.map((tab) => {
                  const active = projectStatusFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setProjectStatusFilter(tab.id)}
                      className={cn(
                        "inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-[12px] font-semibold transition-colors",
                        active
                          ? "border-accent bg-[var(--dmx-accent-tint)] text-text"
                          : "border-border bg-surface text-text-secondary hover:border-border-strong hover:text-text",
                      )}
                    >
                      <span>{tab.label}</span>
                      <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] text-text-secondary">
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="relative w-full xl:max-w-sm">
                <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={copy("Search by project, address or status", "Поиск по объекту, адресу или статусу", "חיפוש לפי פרויקט, כתובת או סטטוס")}
                  className="h-10 w-full rounded-full border border-border bg-surface ps-9 pe-3 text-[12.5px] text-text placeholder:text-text-tertiary focus:border-border-strong focus:outline-none"
                />
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

        <section
          className={cn(
            "rounded-lg border border-border bg-surface px-4 py-3",
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
        </section>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-status-problem-border bg-status-problem-bg px-4 py-3 text-[13px] text-status-problem-fg">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
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
            <div className="mb-4 border-b border-border-subtle pb-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="text-[10.5px] font-medium uppercase text-text-secondary">
                    {tt("projects.projectList")}
                  </div>
                  <h2 className="mt-1 text-[13.5px] font-medium leading-5 text-text">
                    {tt("projects.portfolioNavigator")}
                  </h2>
                  <p className="mt-1 text-[12px] leading-5 text-text-secondary">
                    {tt("projects.filteredCount")} {filteredProjects.length} ·{" "}
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
                placeholder={tt("projects.searchProject")}
                className="h-9 w-full rounded-full border border-border bg-surface ps-9 pe-3 text-[12.5px] text-text placeholder:text-text-tertiary focus:border-border-strong focus:outline-none"
              />
            </div>
            <div className="mb-3 space-y-3 rounded-lg border border-border bg-surface-subtle p-3">
              <div className="text-[12px] font-medium text-text">
                {locale === "ru"
                  ? "\u041c\u0430\u0441\u0441\u043e\u0432\u044b\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044f"
                  : locale === "he"
                    ? "\u05e4\u05e2\u05d5\u05dc\u05d5\u05ea \u05de\u05e8\u05d5\u05d1\u05d5\u05ea"
                    : "Batch actions"}
              </div>
              <div className="space-y-3">
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
              <div className="border-t border-border-subtle pt-3">
                <label className="inline-flex items-center gap-2 text-[12px] text-text-secondary">
                  <input
                    type="checkbox"
                    checked={bulkOnlyFailedRuns}
                    onChange={(e) => setBulkOnlyFailedRuns(e.target.checked)}
                  />
                  {tt("projects.retryFailedLatestOnly")}
                </label>
              </div>
            </div>
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
              {!loadingProjects && filteredProjects.length === 0 && (
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
                        setImportHistory([]);
                        setFocusedImportRunId(null);
                        setFocusedImportRunDetails(null);
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
                            label: copy("Activity", "Активность", "פעילות"),
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
                              {value}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            setMatrixOrderNumber("all");
                            setMatrixHouse("all");
                            setMatrixFloor("all");
                            setMatrixLocation("all");
                            setMatrixDoorType("all");
                            setMatrixStatus("all");
                            setMatrixIssueFilter("all");
                            setMatrixApartmentSearch("");
                            setMatrixMarkingSearch("");
                          }}
                          className="inline-flex h-9 items-center rounded-full border border-dashed border-border-strong bg-surface px-3 text-[11.5px] font-medium text-text-secondary hover:text-text"
                        >
                          {copy("+ filter", "+ фильтр", "+ מסנן")}
                        </button>
                        <div className="inline-flex h-9 items-center rounded-full border border-border bg-surface p-0.5">
                          <button
                            type="button"
                            className="h-7 rounded-full bg-text px-3 text-[11.5px] font-medium text-text-inverse"
                          >
                            {copy("Matrix", "Матрица", "מטריצה")}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              scrollToProjectSection("project-door-matrix")
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
                                  <div className="flex flex-wrap gap-1.5">
                                    {floorDoors.map((door) => (
                                      <button
                                        key={`${floor.house_number}-${floor.floor_label}-${door.door_id}-top`}
                                        type="button"
                                        aria-pressed={
                                          focusedDoorId === door.door_id
                                        }
                                        aria-label={`${door.door_marking} - ${tokenLabel(
                                          door.status,
                                        )}`}
                                        data-testid={`project-detail-v28-door-tile-${door.door_id}`}
                                        title={`${door.door_marking} - ${tokenLabel(
                                          door.status,
                                        )}`}
                                        onClick={() =>
                                          setFocusedDoorId(door.door_id)
                                        }
                                        onDoubleClick={() =>
                                          toggleDoorSelection(door.door_id)
                                        }
                                        className={cn(
                                          "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-md border px-1 text-[11px] font-medium leading-none tabular-nums transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35",
                                          matrixDoorTileTone(door),
                                          focusedDoorId === door.door_id &&
                                            "shadow-[0_0_0_2px_var(--dmx-accent)]",
                                          selectedDoorIdSet.has(
                                            door.door_id,
                                          ) &&
                                            "shadow-[0_0_0_2px_var(--dmx-text)]",
                                        )}
                                      >
                                        <LtrText as="span" className="truncate">
                                          {matrixDoorTileLabel(door)}
                                        </LtrText>
                                        {door.issue_count > 0 ? (
                                          <span
                                            className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-surface bg-kpi-red"
                                            aria-hidden="true"
                                          />
                                        ) : null}
                                      </button>
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

                  <aside className="space-y-3" data-testid="project-detail-v28-side">
                    <WidgetCard
                      title={copy("Stakeholders", "Участники", "מעורבים")}
                      headerMeta={copy(
                        "Contacts and assigned installers",
                        "Контакты и назначенные монтажники",
                        "אנשי קשר ומתקינים משובצים",
                      )}
                      bleed
                    >
                      <div className="divide-y divide-border-subtle">
                        <div className="grid grid-cols-[32px_1fr] gap-2 px-4 py-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--dmx-accent-tint)] text-[11px] font-semibold text-text">
                            {initialsFromName(projectDetails?.contact_name)}
                          </span>
                          <div className="min-w-0">
                            <div className="truncate text-[12.5px] font-medium text-text">
                              {projectDetails?.contact_name
                                ? `${copy("Contact", "Контакт", "איש קשר")}: ${projectDetails.contact_name}`
                                : copy("Site contact missing", "Контакт объекта не задан", "חסר איש קשר")}
                            </div>
                            <div className="truncate text-[10.5px] text-text-secondary">
                              {projectDetails?.developer_company ||
                                copy("Developer", "Застройщик", "יזם")}
                            </div>
                          </div>
                        </div>
                        {projectAssignedInstallerSummary.length === 0 ? (
                          <div className="px-4 py-3 text-[12px] text-text-secondary">
                            {copy(
                              "No doors are assigned to installers yet.",
                              "Двери ещё не назначены монтажникам.",
                              "עדיין אין דלתות משובצות למתקינים.",
                            )}
                          </div>
                        ) : (
                          projectAssignedInstallerSummary.slice(0, 3).map((installer) => (
                            <div
                              key={installer.id}
                              className="grid grid-cols-[32px_1fr_auto] gap-2 px-4 py-3"
                            >
                              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-sunken text-[11px] font-semibold text-text-secondary">
                                {initialsFromName(installer.name)}
                              </span>
                              <div className="min-w-0">
                                <div className="truncate text-[12.5px] font-medium text-text">
                                  {copy("Installer", "Монтажник", "מתקין")}:{" "}
                                  {installer.name}
                                </div>
                                <div className="truncate text-[10.5px] text-text-secondary">
                                  {installer.email ||
                                    copy("Assigned installer", "Назначенный монтажник", "מתקין משובץ")}
                                </div>
                              </div>
                              <LtrText className="self-center rounded-full border border-border bg-surface-subtle px-2 py-1 text-[10.5px] font-medium text-text">
                                {installer.doorCount}
                              </LtrText>
                            </div>
                          ))
                        )}
                      </div>
                    </WidgetCard>

                    <WidgetCard
                      title={copy("Finance", "Финансы", "כספים")}
                      headerMeta={copy(
                        "Plan/fact summary",
                        "Кратко план/факт",
                        "סיכום תכנון מול ביצוע",
                      )}
                      actionSlot={
                        <button
                          type="button"
                          onClick={() =>
                            scrollToProjectSection(
                              projectFinancialReady
                                ? "project-financial-screen"
                                : "project-commercial-restricted",
                            )
                          }
                          className="text-[11.5px] font-medium text-link hover:underline"
                        >
                          {copy("Details", "Детали", "פרטים")}
                        </button>
                      }
                    >
                      {projectFinancialReady && projectPlanFact && projectRisk?.summary ? (
                        <div className="space-y-2 text-[12px]">
                          <MetricRow
                            label={copy("Revenue", "Выручка", "הכנסות")}
                            value={formatMoney(projectPlanFact.actual_revenue_total)}
                          />
                          <MetricRow
                            label={copy("Payroll", "Начисления", "שכר מתקינים")}
                            value={formatMoney(projectPlanFact.actual_payroll_total)}
                          />
                          <MetricRow
                            label={copy("Profit", "Прибыль", "רווח")}
                            value={formatMoney(projectRisk.summary.actual_profit_total)}
                          />
                          <MetricRow
                            label={copy("Margin", "Маржа", "מרווח")}
                            value={formatPct(projectRisk.summary.actual_margin_pct)}
                          />
                        </div>
                      ) : (
                        <div className="text-[12px] leading-5 text-text-secondary">
                          {canViewProjectRates
                            ? copy(
                                "Financial data is still loading or missing for this project.",
                                "Финансовые данные ещё загружаются или не заполнены по объекту.",
                                "הנתונים הכספיים עדיין נטענים או חסרים בפרויקט.",
                              )
                            : commercialAccessRestrictedTitle}
                        </div>
                      )}
                    </WidgetCard>

                    <WidgetCard
                      title={copy("Open issues", "Открытые проблемы", "בעיות פתוחות")}
                      titleAccessory={
                        <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-[10.5px] text-text-secondary">
                          {projectOpenIssues}
                        </span>
                      }
                      actionSlot={
                        <button
                          type="button"
                          onClick={() => {
                            setMatrixIssueFilter("issues");
                            scrollToProjectSection("project-door-matrix");
                          }}
                          className="text-[11.5px] font-medium text-link hover:underline"
                        >
                          {copy("View all", "Все", "הצג הכל")}
                        </button>
                      }
                      bleed
                    >
                      {projectTopIssues.length === 0 ? (
                        <div className="px-4 py-3 text-[12px] text-text-secondary">
                          {copy(
                            "No open issues on this project.",
                            "По объекту нет открытых проблем.",
                            "אין בעיות פתוחות בפרויקט.",
                          )}
                        </div>
                      ) : (
                        <div className="divide-y divide-border-subtle">
                          {projectTopIssues.map((issue) => (
                            <button
                              key={issue.id}
                              type="button"
                              onClick={() => {
                                setMatrixIssueFilter("issues");
                                scrollToProjectSection("project-door-matrix");
                              }}
                              className="grid w-full grid-cols-[24px_1fr] gap-2 px-4 py-3 text-start hover:bg-surface-subtle"
                            >
                              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-status-problem-bg text-[10px] font-semibold text-status-problem-fg">
                                !
                              </span>
                              <span className="min-w-0">
                                <span className="block truncate text-[12px] font-medium text-text">
                                  {issueLabel(issue)}
                                </span>
                                <span className="mt-0.5 block truncate text-[10.5px] text-text-secondary">
                                  {copy("Door", "Дверь", "דלת")} {issue.door_id} ·{" "}
                                  {tokenLabel(issue.status)}
                                </span>
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </WidgetCard>

                    <WidgetCard
                      title={copy("Activity", "Активность", "פעילות")}
                      headerMeta={copy(
                        "Latest import and recovery events",
                        "Последние события импорта и восстановления",
                        "אירועי יבוא ושחזור אחרונים",
                      )}
                      actionSlot={
                        <button
                          type="button"
                          onClick={() => scrollToProjectSection("project-import-history")}
                          className="text-[11.5px] font-medium text-link hover:underline"
                        >
                          {copy("Log", "Журнал", "יומן")}
                        </button>
                      }
                      bleed
                    >
                      {projectRecentImportActivity.length === 0 ? (
                        <div className="px-4 py-3 text-[12px] text-text-secondary">
                          {copy(
                            "No recent import activity.",
                            "Недавней активности импорта нет.",
                            "אין פעילות יבוא אחרונה.",
                          )}
                        </div>
                      ) : (
                        <div className="divide-y divide-border-subtle">
                          {projectRecentImportActivity.map((item) => (
                            <div
                              key={item.id}
                              className="grid grid-cols-[10px_1fr] gap-3 px-4 py-3"
                            >
                              <span
                                className={cn(
                                  "mt-1 h-2.5 w-2.5 rounded-full",
                                  item.status === "FAILED"
                                    ? "bg-kpi-red"
                                    : item.status === "COMPLETED"
                                      ? "bg-kpi-green"
                                      : "bg-kpi-yellow",
                                )}
                                aria-hidden="true"
                              />
                              <div className="min-w-0">
                                <div className="truncate text-[12px] font-medium text-text">
                                  {tokenLabel(item.status)}
                                </div>
                                <div className="mt-0.5 truncate text-[10.5px] text-text-secondary">
                                  {formatDateTime(item.created_at)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </WidgetCard>
                  </aside>
                </div>

                <WidgetCard
                  title={copy(
                    "Project settings",
                    "Настройки проекта",
                    "הגדרות פרויקט",
                  )}
                  headerMeta={
                    <LtrText as="span">
                      {selectedProjectCode}
                    </LtrText>
                  }
                >
                  <div className="space-y-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-3xl min-w-0">
                      <h3 className="line-clamp-2 text-[15px] font-semibold leading-tight text-text">
                        {projectDetails?.code
                          ? `${projectDetails.code} - ${selectedProject.name}`
                          : selectedProject.name}
                      </h3>
                      <p className="mt-2 text-[12px] leading-6 text-text-secondary">
                        {projectDetails?.address ||
                          copy(
                            "Add the site address and developer contact to unlock Waze, WhatsApp and direct calling.",
                            "Добавьте адрес объекта и контакт застройщика, чтобы включить Waze, WhatsApp и прямой звонок.",
                            "הוסף כתובת אתר ואיש קשר של היזם כדי להפעיל Waze, WhatsApp וחיוג ישיר.",
                          )}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-text-secondary">
                        {projectDetails?.planned_start_date ? (
                          <span className="metric-chip">
                            {copy("Start", "Старт", "התחלה")}{" "}
                            <LtrText>
                              {projectDetails.planned_start_date}
                            </LtrText>
                          </span>
                        ) : null}
                        {projectDetails?.planned_end_date ? (
                          <span className="metric-chip">
                            {copy("Finish", "Финиш", "סיום")}{" "}
                            <LtrText>{projectDetails.planned_end_date}</LtrText>
                          </span>
                        ) : null}
                        <span className="metric-chip">
                          {copy("Contact", "Контакт", "איש קשר")}{" "}
                          {projectDetails?.contact_name ||
                            copy("missing", "не заполнен", "חסר")}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={openEditProjectDialog}
                        disabled={!canManageProjects}
                        className="gap-2"
                      >
                        <PencilLine aria-hidden="true" className="h-4 w-4" />
                        {copy(
                          "Edit project",
                          "Редактировать проект",
                          "ערוך פרויקט",
                        )}
                      </Button>
                      <div className="hidden md:flex md:flex-wrap md:gap-2">
                        {projectDetails?.waze_deep_link ? (
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="gap-2"
                          >
                            <a
                              href={projectDetails.waze_deep_link}
                              target="_blank"
                              rel="noreferrer"
                              title={projectDetails.address || ""}
                            >
                              <MapPinned
                                aria-hidden="true"
                                className="h-4 w-4"
                              />
                              Waze
                            </a>
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              showProjectActionHint(
                                copy(
                                  "Add address in project settings to unlock Waze.",
                                  "Добавьте адрес в настройках проекта, чтобы включить Waze.",
                                  "הוסף כתובת בהגדרות הפרויקט כדי לפתוח את Waze.",
                                ),
                              )
                            }
                            className="gap-2 border-dashed border-border bg-surface-subtle text-text-secondary hover:bg-surface"
                          >
                            <MapPinned aria-hidden="true" className="h-4 w-4" />
                            Waze
                          </Button>
                        )}
                        {projectDetails?.whatsapp_deep_link ? (
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="gap-2"
                          >
                            <a
                              href={projectDetails.whatsapp_deep_link}
                              target="_blank"
                              rel="noreferrer"
                              title={[
                                projectDetails.contact_name,
                                projectDetails.developer_whatsapp ||
                                  projectDetails.contact_phone,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            >
                              <MessageCircle
                                aria-hidden="true"
                                className="h-4 w-4"
                              />
                              WhatsApp
                            </a>
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              showProjectActionHint(
                                copy(
                                  "Add a contact phone or WhatsApp number to unlock WhatsApp.",
                                  "Добавьте телефон контакта или номер WhatsApp, чтобы включить WhatsApp.",
                                  "הוסף טלפון איש קשר או מספר WhatsApp כדי לפתוח את WhatsApp.",
                                ),
                              )
                            }
                            className="gap-2 border-dashed border-border bg-surface-subtle text-text-secondary hover:bg-surface"
                          >
                            <MessageCircle
                              aria-hidden="true"
                              className="h-4 w-4"
                            />
                            WhatsApp
                          </Button>
                        )}
                        {projectDetails?.call_deep_link ? (
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="gap-2"
                          >
                            <a
                              href={projectDetails.call_deep_link}
                              title={projectDetails.contact_phone || ""}
                            >
                              <Phone aria-hidden="true" className="h-4 w-4" />
                              {copy("Call", "Позвонить", "התקשר")}
                            </a>
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              showProjectActionHint(
                                copy(
                                  "Add a primary phone in project settings to unlock calling.",
                                  "Добавьте основной телефон в настройках проекта, чтобы включить звонок.",
                                  "הוסף טלפון ראשי בהגדרות הפרויקט כדי לפתוח חיוג.",
                                ),
                              )
                            }
                            className="gap-2 border-dashed border-border bg-surface-subtle text-text-secondary hover:bg-surface"
                          >
                            <Phone aria-hidden="true" className="h-4 w-4" />
                            {copy("Call", "Позвонить", "התקשר")}
                          </Button>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className="gap-2 md:hidden"
                          >
                            {copy("Actions", "Действия", "פעולות")}
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-56 md:hidden"
                        >
                          {projectDetails?.waze_deep_link ? (
                            <DropdownMenuItem asChild className="gap-2">
                              <a
                                href={projectDetails.waze_deep_link}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <MapPinned className="h-4 w-4" />
                                Waze
                              </a>
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              className="gap-2"
                              onSelect={() =>
                                showProjectActionHint(
                                  copy(
                                    "Add address in project settings to unlock Waze.",
                                    "Добавьте адрес в настройках проекта, чтобы включить Waze.",
                                    "הוסף כתובת בהגדרות הפרויקט כדי לפתוח את Waze.",
                                  ),
                                )
                              }
                            >
                              <MapPinned className="h-4 w-4" />
                              Waze
                            </DropdownMenuItem>
                          )}
                          {projectDetails?.whatsapp_deep_link ? (
                            <DropdownMenuItem asChild className="gap-2">
                              <a
                                href={projectDetails.whatsapp_deep_link}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <MessageCircle className="h-4 w-4" />
                                WhatsApp
                              </a>
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              className="gap-2"
                              onSelect={() =>
                                showProjectActionHint(
                                  copy(
                                    "Add a contact phone or WhatsApp number to unlock WhatsApp.",
                                    "Добавьте телефон контакта или номер WhatsApp, чтобы включить WhatsApp.",
                                    "הוסף טלפון איש קשר או מספר WhatsApp כדי לפתוח את WhatsApp.",
                                  ),
                                )
                              }
                            >
                              <MessageCircle className="h-4 w-4" />
                              WhatsApp
                            </DropdownMenuItem>
                          )}
                          {projectDetails?.call_deep_link ? (
                            <DropdownMenuItem asChild className="gap-2">
                              <a href={projectDetails.call_deep_link}>
                                <Phone className="h-4 w-4" />
                                {copy("Call", "Позвонить", "התקשר")}
                              </a>
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              className="gap-2"
                              onSelect={() =>
                                showProjectActionHint(
                                  copy(
                                    "Add a primary phone in project settings to unlock calling.",
                                    "Добавьте основной телефон в настройках проекта, чтобы включить звонок.",
                                    "הוסף טלפון ראשי בהגדרות הפרויקט כדי לפתוח חיוג.",
                                  ),
                                )
                              }
                            >
                              <Phone className="h-4 w-4" />
                              {copy("Call", "Позвонить", "התקשר")}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      {projectDetails?.contact_phone ? (
                        <button
                          type="button"
                          title={copy(
                            "Click or hold to copy the number",
                            "Нажмите или удерживайте, чтобы скопировать номер",
                            "לחץ או החזק כדי להעתיק את המספר",
                          )}
                          onClick={() =>
                            void copyProjectPhone(projectDetails.contact_phone)
                          }
                          onContextMenu={(event) => {
                            event.preventDefault();
                            void copyProjectPhone(projectDetails.contact_phone);
                          }}
                          onPointerDown={() =>
                            scheduleProjectPhoneCopy(
                              projectDetails.contact_phone,
                            )
                          }
                          onPointerUp={clearProjectPhoneCopyTimer}
                          onPointerLeave={clearProjectPhoneCopyTimer}
                          className="hidden min-h-8 items-center rounded-full border border-border-strong bg-surface px-3 text-[12px] font-medium text-text transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 md:inline-flex"
                        >
                          <LtrText>
                            {formatReadablePhone(projectDetails.contact_phone)}
                          </LtrText>
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid gap-3 text-[12px] text-text-secondary md:grid-cols-2 xl:grid-cols-4">
                    <div className="min-w-0 rounded-lg border border-border bg-surface px-4 py-3">
                      <div className={projectsMetricLabelClass}>
                        {copy("Developer", "Застройщик", "יזם")}
                      </div>
                      <div className="mt-1 truncate font-medium text-text">
                        {projectDetails?.developer_company || "-"}
                      </div>
                    </div>
                    <div className="min-w-0 rounded-lg border border-border bg-surface px-4 py-3">
                      <div className={projectsMetricLabelClass}>
                        {copy("Contact", "Контакт", "איש קשר")}
                      </div>
                      <div className="mt-1 truncate font-medium text-text">
                        {projectDetails?.contact_name || "-"}
                      </div>
                      <div className="mt-1 text-text-secondary">
                        {projectDetails?.contact_phone ? (
                          <LtrText>
                            {formatReadablePhone(projectDetails.contact_phone)}
                          </LtrText>
                        ) : (
                          "-"
                        )}
                      </div>
                    </div>
                    <div className="min-w-0 rounded-lg border border-border bg-surface px-4 py-3">
                      <div className={projectsMetricLabelClass}>WhatsApp</div>
                      <div className="mt-1 font-medium text-text">
                        {projectDetails?.developer_whatsapp ||
                        projectDetails?.contact_phone ? (
                          <LtrText>
                            {formatReadablePhone(
                              projectDetails?.developer_whatsapp ||
                                projectDetails?.contact_phone,
                            )}
                          </LtrText>
                        ) : (
                          "-"
                        )}
                      </div>
                      <div className="mt-1 truncate text-text-secondary">
                        {projectDetails?.contact_email ? (
                          <LtrText>{projectDetails.contact_email}</LtrText>
                        ) : (
                          "-"
                        )}
                      </div>
                    </div>
                    <div className="min-w-0 rounded-lg border border-border bg-surface px-4 py-3">
                      <div className={projectsMetricLabelClass}>
                        {copy("Notes", "Заметки", "הערות")}
                      </div>
                      <div className="mt-1 line-clamp-3 break-words text-text-secondary">
                        {projectDetails?.developer_notes || "-"}
                      </div>
                    </div>
                  </div>
                  </div>
                </WidgetCard>

                <WidgetCard
                  id="project-documents"
                  title={copy(
                    "Project documents",
                    "Документы объекта",
                    "מסמכי פרויקט",
                  )}
                  headerMeta={copy(
                    "Generate paperwork from current object data",
                    "Документы из текущих данных объекта",
                    "מסמכים מנתוני הפרויקט הנוכחיים",
                  )}
                  actionSlot={
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 gap-2"
                      onClick={() => router.push("/documents")}
                    >
                      <FileText className="h-4 w-4" aria-hidden="true" />
                      {copy(
                        "Document center",
                        "Центр документов",
                        "מרכז מסמכים",
                      )}
                    </Button>
                  }
                >
                  <div className="space-y-4">
                    <div className="max-w-2xl">
                      <h3 className="text-[15px] font-semibold leading-tight text-text">
                        {copy(
                          "Generate paperwork from the current object data.",
                          "Создавайте документы из текущих данных объекта.",
                          "צור מסמכים מנתוני הפרויקט הנוכחיים.",
                        )}
                      </h3>
                      <p className="mt-2 text-[12px] leading-6 text-text-secondary">
                        {copy(
                          "Templates are managed in the document center. Generated files stay linked to this project.",
                          "Шаблоны управляются в центре документов. Созданные файлы остаются привязанными к этому объекту.",
                          "התבניות מנוהלות במרכז המסמכים. קבצים שנוצרו נשארים משויכים לפרויקט הזה.",
                        )}
                      </p>
                    </div>

                  <div className="-mx-4 border-y border-border-subtle bg-surface">
                    <MetricRow
                      label={copy(
                        "Active templates",
                        "Активные шаблоны",
                        "תבניות פעילות",
                      )}
                      value={
                        loadingDocumentTemplates
                          ? "-"
                          : activeDocumentTemplates.length
                      }
                      barColor="blue"
                      withSeparator={false}
                    />
                    <MetricRow
                      label={copy(
                        "Generated files",
                        "Созданные файлы",
                        "קבצים שנוצרו",
                      )}
                      value={
                        loadingProjectDocuments ? "-" : projectDocuments.length
                      }
                      barColor="green"
                    />
                    <MetricRow
                      label={copy(
                        "Selected template",
                        "Выбранный шаблон",
                        "תבנית נבחרת",
                      )}
                      value={selectedDocumentTemplate?.name || "-"}
                      barColor="yellow"
                    />
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                    <div className="rounded-lg border border-border bg-surface-subtle p-3">
                      <div className="grid gap-3">
                        <div className="field-stack">
                          <Label htmlFor="project-document-template">
                            {copy("Template", "Шаблон", "תבנית")}
                          </Label>
                          <select
                            id="project-document-template"
                            value={selectedDocumentTemplateId}
                            onChange={(event) =>
                              setSelectedDocumentTemplateId(event.target.value)
                            }
                            className="control-input"
                          >
                            <option value="">
                              {copy(
                                "Select template",
                                "Выберите шаблон",
                                "בחר תבנית",
                              )}
                            </option>
                            {activeDocumentTemplates.map((template) => (
                              <option key={template.id} value={template.id}>
                                {template.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {selectedDocumentTemplate ? (
                          <div className="rounded-lg border border-border bg-surface px-3 py-2 text-[12px] text-text-secondary">
                            <div className="font-medium text-text">
                              {selectedDocumentTemplate.source_filename}
                            </div>
                            <div className="mt-1">
                              {formatBytes(selectedDocumentTemplate.size_bytes)}{" "}
                              - {selectedDocumentTemplate.placeholders.length}{" "}
                              {copy("placeholders", "заполнители", "מצייני מקום")}
                            </div>
                          </div>
                        ) : null}

                        <div className="field-stack">
                          <Label htmlFor="project-document-note">
                            {copy(
                              "Manual note",
                              "Ручная заметка",
                              "הערה ידנית",
                            )}
                          </Label>
                          <textarea
                            id="project-document-note"
                            value={documentManualNote}
                            onChange={(event) =>
                              setDocumentManualNote(event.target.value)
                            }
                            rows={3}
                            className="control-textarea min-h-[88px]"
                            placeholder="manual.note"
                          />
                        </div>

                        <Button
                          type="button"
                          className="h-10 gap-2"
                          disabled={
                            !canManageProjects ||
                            !selectedProjectId ||
                            !selectedDocumentTemplateId ||
                            documentGenerating
                          }
                          onClick={() => void handleGenerateProjectDocument()}
                        >
                          {documentGenerating ? (
                            <RefreshCw
                              className="h-4 w-4 animate-spin"
                              aria-hidden="true"
                            />
                          ) : (
                            <Play className="h-4 w-4" aria-hidden="true" />
                          )}
                          {copy(
                            "Generate document",
                            "Создать документ",
                            "צור מסמך",
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-lg border border-border bg-surface-subtle p-3">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <h4 className="text-[13px] font-semibold text-text">
                          {copy(
                            "Generated for this project",
                            "Создано для этого объекта",
                            "נוצר לפרויקט הזה",
                          )}
                        </h4>
                        <button
                          type="button"
                          className="dmx-secondary-action h-8 px-2.5"
                          onClick={() =>
                            selectedProjectId &&
                            void loadProjectDocuments(selectedProjectId)
                          }
                        >
                          <RefreshCw
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                        </button>
                      </div>

                      <div className="divide-y divide-border-subtle overflow-hidden rounded-lg border border-border bg-surface">
                        {loadingProjectDocuments ? (
                          <div className="px-3.5 py-4 text-[12px] text-text-secondary">
                            {copy(
                              "Loading documents...",
                              "Загружаем документы...",
                              "טוען מסמכים...",
                            )}
                          </div>
                        ) : projectDocuments.length === 0 ? (
                          <div className="px-3.5 py-4 text-[12px] text-text-secondary">
                            {copy(
                              "No generated documents for this project yet.",
                              "Для этого объекта пока нет созданных документов.",
                              "עדיין אין מסמכים שנוצרו לפרויקט הזה.",
                            )}
                          </div>
                        ) : (
                          projectDocuments.map((document) => (
                            <div
                              key={document.id}
                              className="flex items-start justify-between gap-3 px-3.5 py-3"
                            >
                              <div className="min-w-0">
                                <div className="truncate text-[13px] font-medium text-text">
                                  {document.file_name}
                                </div>
                                <div className="mt-1 truncate text-[12px] text-text-secondary">
                                  {document.template_name ||
                                    selectedDocumentTemplate?.name ||
                                    "-"}
                                </div>
                                <div className="mt-1 text-[11px] text-text-secondary">
                                  {formatBytes(document.size_bytes)} -{" "}
                                  {formatDateTime(document.created_at)}
                                </div>
                              </div>
                              <button
                                type="button"
                                className="dmx-secondary-action h-8 shrink-0 px-2.5"
                                onClick={() =>
                                  void handleDownloadProjectDocument(document)
                                }
                                disabled={downloadingDocumentId === document.id}
                                aria-label={`${copy("Download", "Скачать", "הורד")} ${document.file_name}`}
                              >
                                {downloadingDocumentId === document.id ? (
                                  <RefreshCw
                                    className="h-3.5 w-3.5 animate-spin"
                                    aria-hidden="true"
                                  />
                                ) : (
                                  <Download
                                    className="h-3.5 w-3.5"
                                    aria-hidden="true"
                                  />
                                )}
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                  </div>
                </WidgetCard>

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
                            loadingLibraryProducts ||
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
                              "Загрузка справочник...",
                              "טוען ספרייה...",
                            )
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
                    <WidgetCard
                      id="project-additional-works"
                      title={copy(
                        "Additional Works",
                        "Дополнительные работы",
                        "עבודות נוספות",
                      )}
                      headerMeta={copy(
                        "Commercial plan layer",
                        "Коммерческий плановый слой",
                        "שכבת תוכנית מסחרית",
                      )}
                    >
                      <div className="space-y-4">
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="max-w-2xl">
                          <h3 className="text-[15px] font-semibold leading-tight text-text">
                            {copy(
                              "Plan add-on work lines before installers start recording facts.",
                              "Планируйте строки доп. работ до того, как монтажники начнут фиксировать факты.",
                              "תכנן שורות עבודות נוספות לפני שהמתקינים מתחילים לרשום ביצוע בפועל.",
                            )}
                          </h3>
                          <p className="mt-2 text-[12px] leading-6 text-text-secondary">
                            {copy(
                              "Keep one simple project plan: what add-on is expected, how many units, and both client/install prices.",
                              "Держите простой план по проекту: какой доп нужен, сколько единиц и обе цены — клиентская и монтажная.",
                              "שמור על תוכנית פרויקט פשוטה אחת: איזה תוספת צפויה, כמה יחידות, וגם מחירי לקוח/התקנה.",
                            )}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-start gap-2 md:items-end">
                          <Button
                            type="button"
                            onClick={openAdditionalWorkDialog}
                            className="gap-2"
                            disabled={
                              !canManageProjects ||
                              loadingAddonTypes || activeAddonTypes.length === 0
                            }
                          >
                            <Plus className="h-4 w-4" />
                            {copy(
                              "Add additional work",
                              "Добавить доп. работу",
                              "הוסף עבודה נוספת",
                            )}
                          </Button>
                          <div className="text-[11px] text-text-secondary">
                            {loadingAddonTypes
                              ? copy(
                                  "Loading add-on types...",
                                  "Загружаем типы доп. работ...",
                                  "טוען סוגי עבודות נוספות...",
                                )
                              : activeAddonTypes.length === 0
                                ? copy(
                                    "No active add-on types yet.",
                                    "Пока нет активных типов доп. работ.",
                                    "עדיין אין סוגי עבודות נוספות פעילים.",
                                  )
                                : copy(
                                    "Installer facts can land on this plan later.",
                                    "Позже монтажники смогут фиксировать факты по этому плану.",
                                    "בהמשך מתקינים יוכלו לדווח ביצוע בפועל על התוכנית הזו.",
                                  )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <DimaxKpiCard
                          className="min-h-[96px]"
                          label={copy("Plan rows", "Строк плана", "שורות תוכנית")}
                          value={addonPlanTotals.rows}
                          barColor="blue"
                        />
                        <DimaxKpiCard
                          className="min-h-[96px]"
                          label={copy(
                            "Planned qty",
                            "Плановое кол-во",
                            "כמות מתוכננת",
                          )}
                          value={addonPlanTotals.qty}
                          barColor="green"
                        />
                        <DimaxKpiCard
                          className="min-h-[96px]"
                          label={copy("Client total", "Сумма клиента", 'סה"כ לקוח')}
                          value={formatMoney(addonPlanTotals.client)}
                          barColor="yellow"
                        />
                        <DimaxKpiCard
                          className="min-h-[96px]"
                          label={copy(
                            "Installer total",
                            "Сумма монтажника",
                            'סה"כ מתקין',
                          )}
                          value={formatMoney(addonPlanTotals.installer)}
                          barColor="orange"
                        />
                      </div>

                      <div className="mt-4 divide-y divide-border-subtle overflow-hidden rounded-lg border border-border bg-surface md:hidden">
                        {loadingProjectAddonPlan ? (
                          <div className="px-3.5 py-4 text-[12px] text-text-secondary">
                            {copy(
                              "Loading additional works plan...",
                              "Загружаем план доп. работ...",
                              "טוען תוכנית עבודות נוספות...",
                            )}
                          </div>
                        ) : projectAddonPlan.length === 0 ? (
                          <div className="px-3.5 py-4 text-[12px] text-text-secondary">
                            {copy(
                              "No additional works planned yet.",
                              "Пока нет запланированных доп. работ.",
                              "עדיין אין עבודות נוספות מתוכננות.",
                            )}
                          </div>
                        ) : (
                          projectAddonPlan.map((item, index) => {
                            const addon =
                              activeAddonTypes.find(
                                (row) => row.id === item.addon_type_id,
                              ) || null;
                            return (
                              <article
                                key={
                                  item.id || `${item.addon_type_id}-${index}`
                                }
                                className="px-3.5 py-3.5"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="text-[13px] font-semibold leading-5 text-text">
                                      {item.addon_name ||
                                        addon?.name ||
                                        item.addon_type_id}
                                    </div>
                                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                      <span className="inline-flex rounded-full bg-surface-sunken px-2 py-1 text-[10.5px] font-medium leading-none text-text-secondary">
                                        {addon?.unit ||
                                          copy(
                                            "No unit",
                                            "Без ед.",
                                            "ללא יחידה",
                                          )}
                                      </span>
                                      <span className="inline-flex rounded-full border border-status-ok-border bg-status-ok-bg px-2 py-1 text-[10.5px] font-semibold leading-none text-status-ok-fg">
                                        {copy("Planned", "План", "מתוכנן")}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="shrink-0 text-end">
                                    <div className={projectsMetricLabelClass}>
                                      {copy("Qty", "Кол-во", "כמות")}
                                    </div>
                                    <div className="mt-1 text-[17px] font-medium leading-tight text-text tabular-nums">
                                      {item.qty_planned}
                                    </div>
                                  </div>
                                </div>

                                <div className="mt-3 grid grid-cols-2 gap-2">
                                  <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                                    <div className={projectsMetricLabelClass}>
                                      {copy("Client", "Клиент", "לקוח")}
                                    </div>
                                    <div className="mt-1 text-[13px] font-medium text-text tabular-nums">
                                      {formatMoney(
                                        Number(item.client_price) || 0,
                                      )}
                                    </div>
                                  </div>
                                  <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                                    <div className={projectsMetricLabelClass}>
                                      {copy("Installer", "Монтажник", "מתקין")}
                                    </div>
                                    <div className="mt-1 text-[13px] font-medium text-text tabular-nums">
                                      {formatMoney(
                                        Number(item.installer_price) || 0,
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {item.notes ? (
                                  <div className="mt-3 rounded-lg border border-border bg-surface-subtle px-3 py-2 text-[12px] leading-5 text-text-secondary">
                                    {item.notes}
                                  </div>
                                ) : null}
                              </article>
                            );
                          })
                        )}
                      </div>

                      <div className="mt-4 hidden overflow-auto rounded-lg border border-border bg-surface md:block">
                        <table className="min-w-[720px] w-full text-[12px] leading-5">
                          <thead className="bg-surface-subtle text-text-secondary">
                            <tr>
                              <th className="w-[28%] px-3 py-2.5 text-start font-medium">
                                {copy("Add-on", "Доп. работа", "עבודה נוספת")}
                              </th>
                              <th className="px-3 py-2.5 text-start font-medium">
                                {copy("Unit", "Ед.", "יחידה")}
                              </th>
                              <th className="px-3 py-2.5 text-end font-medium">
                                {copy("Qty planned", "План", "כמות")}
                              </th>
                              <th className="px-3 py-2.5 text-end font-medium">
                                {copy(
                                  "Client price",
                                  "Цена клиента",
                                  "מחיר לקוח",
                                )}
                              </th>
                              <th className="px-3 py-2.5 text-end font-medium">
                                {copy(
                                  "Installer price",
                                  "Цена монтажника",
                                  "מחיר מתקין",
                                )}
                              </th>
                              <th className="px-3 py-2.5 text-start font-medium">
                                {copy("Notes", "Примечание", "הערה")}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {loadingProjectAddonPlan ? (
                              <tr>
                                <td
                                  className="px-3 py-4 text-text-secondary"
                                  colSpan={6}
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
                                  className="px-3 py-4 text-text-secondary"
                                  colSpan={6}
                                >
                                  {copy(
                                    "No additional works planned yet.",
                                    "Пока нет запланированных доп. работ.",
                                    "עדיין אין עבודות נוספות מתוכננות.",
                                  )}
                                </td>
                              </tr>
                            ) : (
                              projectAddonPlan.map((item, index) => {
                                const addon =
                                  activeAddonTypes.find(
                                    (row) => row.id === item.addon_type_id,
                                  ) || null;
                                return (
                                  <tr
                                    key={
                                      item.id ||
                                      `${item.addon_type_id}-${index}`
                                    }
                                    className="row-hover border-t border-border"
                                  >
                                    <td className="px-3 py-2.5 font-medium text-text">
                                      {item.addon_name ||
                                        addon?.name ||
                                        item.addon_type_id}
                                    </td>
                                    <td className="px-3 py-2.5 text-text-secondary">
                                      {addon?.unit || "-"}
                                    </td>
                                    <td className="px-3 py-2.5 text-end tabular-nums">
                                      {item.qty_planned}
                                    </td>
                                    <td className="px-3 py-2.5 text-end tabular-nums">
                                      {formatMoney(
                                        Number(item.client_price) || 0,
                                      )}
                                    </td>
                                    <td className="px-3 py-2.5 text-end tabular-nums">
                                      {formatMoney(
                                        Number(item.installer_price) || 0,
                                      )}
                                    </td>
                                    <td className="px-3 py-2.5 text-text-secondary">
                                      {item.notes || "-"}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                      </div>
                    </WidgetCard>

                    <WidgetCard
                      id="project-urgency-surcharge"
                      title={copy(
                        "Urgency Surcharge",
                        "Срочная надбавка",
                        "תוספת דחיפות",
                      )}
                      headerMeta={copy(
                        "Separate auditable uplift layer",
                        "Отдельный аудируемый слой надбавок",
                        "שכבת תוספת נפרדת לביקורת",
                      )}
                    >
                      <div className="space-y-4">
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="max-w-2xl">
                          <h3 className="text-[15px] font-semibold leading-tight text-text">
                            {copy(
                              "Track approved urgency uplift without mixing it into the door list.",
                              "Фиксируйте утверждённую срочную надбавку отдельно, не смешивая её со списком дверей.",
                              "עקוב אחרי תוספת דחיפות מאושרת בלי לערבב אותה ברשימת הדלתות.",
                            )}
                          </h3>
                          <p className="mt-2 text-[12px] leading-6 text-text-secondary">
                            {copy(
                              "Use project-level or order-level surcharge rows so finance and operations see the same uplift logic.",
                              "Используйте строки надбавок на уровне проекта или уровня заказа, чтобы финансы и операции видели одну и ту же логику повышения.",
                              "השתמש בשורות היטלים ברמת הפרויקט או ברמת ההזמנה כדי שהכספים והתפעול יראו את אותו היגיון העלאה.",
                            )}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-start gap-2 md:items-end">
                          <Button
                            type="button"
                            onClick={openUrgencyDialog}
                            disabled={!canManageProjects}
                            className="gap-2"
                          >
                            <Plus className="h-4 w-4" />
                            {copy(
                              "Add urgency surcharge",
                              "Добавить срочную надбавку",
                              "הוסף תוספת דחיפות",
                            )}
                          </Button>
                          <div className="text-[11px] text-text-secondary">
                            {copy(
                              "Keep surcharge visible and auditable as a separate plan layer.",
                              "Держите надбавки видимыми и проверяемыми на отдельном уровне плана.",
                              "שמור על תוספת גלויה וניתנת לביקורת כשכבת תוכנית נפרדת.",
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="-mx-4 border-y border-border-subtle bg-surface">
                        <MetricRow
                          label={copy("Rows", "Строки", "שורות")}
                          value={urgencyTotals.rows}
                          barColor="yellow"
                          withSeparator={false}
                        />
                        <MetricRow
                          label={copy("Order-scoped", "По заказу", "לפי הזמנה")}
                          value={urgencyTotals.orderScoped}
                          barColor="blue"
                        />
                        <MetricRow
                          label={copy(
                            "Client uplift",
                            "Надбавка клиента",
                            "תוספת לקוח",
                          )}
                          value={formatMoney(urgencyTotals.client)}
                          barColor="green"
                        />
                        <MetricRow
                          label={copy(
                            "Installer uplift",
                            "Надбавка монтажника",
                            "תוספת מתקין",
                          )}
                          value={formatMoney(urgencyTotals.installer)}
                          barColor="orange"
                        />
                      </div>

                      <div className="mt-4 divide-y divide-border-subtle overflow-hidden rounded-lg border border-border bg-surface md:hidden">
                        {loadingUrgencySurcharges ? (
                          <div className="px-3.5 py-4 text-[12px] text-text-secondary">
                            {copy(
                              "Loading urgency surcharge plan...",
                              "Загружаем план срочной надбавки...",
                              "טוען תוכנית תוספת דחיפות...",
                            )}
                          </div>
                        ) : urgencySurcharges.length === 0 ? (
                          <div className="px-3.5 py-4 text-[12px] text-text-secondary">
                            {copy(
                              "No urgency surcharge rows yet.",
                              "Пока нет строк срочной надбавки.",
                              "עדיין אין שורות תוספת דחיפות.",
                            )}
                          </div>
                        ) : (
                          urgencySurcharges.map((item, index) => (
                            <article
                              key={
                                item.id ||
                                `${item.scope}-${item.order_number || "project"}-${index}`
                              }
                              className="px-3.5 py-3.5"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="inline-flex rounded-full border border-status-warning-border bg-status-warning-bg px-2 py-1 text-[10.5px] font-semibold leading-none text-status-warning-fg">
                                      {item.scope === "ORDER_NUMBER"
                                        ? copy("Order", "Заказ", "הזמנה")
                                        : copy("Project", "Проект", "פרויקט")}
                                    </span>
                                    {item.order_number ? (
                                      <span className="inline-flex rounded-full bg-surface-sunken px-2 py-1 text-[10.5px] font-medium leading-none text-text-secondary">
                                        {item.order_number}
                                      </span>
                                    ) : null}
                                  </div>
                                  <div className="mt-2 break-words text-[13px] font-semibold leading-5 text-text">
                                    {item.reason}
                                  </div>
                                </div>
                                <div className="shrink-0 text-end">
                                  <div className={projectsMetricLabelClass}>
                                    {copy("Client", "Клиент", "לקוח")}
                                  </div>
                                  <div className="mt-1 text-[17px] font-medium leading-tight text-text tabular-nums">
                                    {formatMoney(
                                      Number(item.client_amount) || 0,
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="mt-3 grid grid-cols-2 gap-2">
                                <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                                  <div className={projectsMetricLabelClass}>
                                    {copy("Installer", "Монтажник", "מתקין")}
                                  </div>
                                  <div className="mt-1 text-[13px] font-medium text-text tabular-nums">
                                    {formatMoney(
                                      Number(item.installer_amount) || 0,
                                    )}
                                  </div>
                                </div>
                                <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                                  <div className={projectsMetricLabelClass}>
                                    {copy("Effective", "Дата", "תאריך")}
                                  </div>
                                  <div
                                    className="mt-1 truncate text-[12px] text-text-secondary tabular-nums"
                                    dir="ltr"
                                  >
                                    {item.effective_date || "-"}
                                  </div>
                                </div>
                              </div>

                              {item.notes ? (
                                <div className="mt-3 rounded-lg border border-border bg-surface-subtle px-3 py-2 text-[12px] leading-5 text-text-secondary">
                                  {item.notes}
                                </div>
                              ) : null}
                            </article>
                          ))
                        )}
                      </div>

                      <div className="mt-4 hidden overflow-auto rounded-lg border border-border bg-surface md:block">
                        <table className="min-w-[760px] w-full text-[12px] leading-5">
                          <thead className="bg-surface-subtle text-text-secondary">
                            <tr>
                              <th className="px-3 py-2.5 text-start font-medium">
                                {copy("Scope", "Объём работ", "היקף עבודה")}
                              </th>
                              <th className="px-3 py-2.5 text-start font-medium">
                                {copy("Order", "Заказ", "הזמנה")}
                              </th>
                              <th className="w-[30%] px-3 py-2.5 text-start font-medium">
                                {copy("Reason", "Причина", "סיבה")}
                              </th>
                              <th className="px-3 py-2.5 text-end font-medium">
                                {copy("Client", "Клиент", "לקוח")}
                              </th>
                              <th className="px-3 py-2.5 text-end font-medium">
                                {copy("Installer", "Монтажник", "מתקין")}
                              </th>
                              <th className="px-3 py-2.5 text-start font-medium">
                                {copy("Effective", "Дата", "תאריך")}
                              </th>
                              <th className="px-3 py-2.5 text-start font-medium">
                                {copy("Notes", "Примечание", "הערה")}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {loadingUrgencySurcharges ? (
                              <tr>
                                <td
                                  className="px-3 py-4 text-text-secondary"
                                  colSpan={7}
                                >
                                  {copy(
                                    "Loading urgency surcharge plan...",
                                    "Загружаем план срочной надбавки...",
                                    "טוען תוכנית תוספת דחיפות...",
                                  )}
                                </td>
                              </tr>
                            ) : urgencySurcharges.length === 0 ? (
                              <tr>
                                <td
                                  className="px-3 py-4 text-text-secondary"
                                  colSpan={7}
                                >
                                  {copy(
                                    "No urgency surcharge rows yet.",
                                    "Пока нет строк срочной надбавки.",
                                    "עדיין אין שורות תוספת דחיפות.",
                                  )}
                                </td>
                              </tr>
                            ) : (
                              urgencySurcharges.map((item, index) => (
                                <tr
                                  key={
                                    item.id ||
                                    `${item.scope}-${item.order_number || "project"}-${index}`
                                  }
                                  className="row-hover border-t border-border"
                                >
                                  <td className="px-3 py-2.5">
                                    {item.scope === "ORDER_NUMBER"
                                      ? copy("Order", "Заказ", "הזמנה")
                                      : copy("Project", "Проект", "פרויקט")}
                                  </td>
                                  <td className="px-3 py-2.5">
                                    {item.order_number || "-"}
                                  </td>
                                  <td className="px-3 py-2.5 font-medium text-text">
                                    {item.reason}
                                  </td>
                                  <td className="px-3 py-2.5 text-end tabular-nums">
                                    {formatMoney(
                                      Number(item.client_amount) || 0,
                                    )}
                                  </td>
                                  <td className="px-3 py-2.5 text-end tabular-nums">
                                    {formatMoney(
                                      Number(item.installer_amount) || 0,
                                    )}
                                  </td>
                                  <td className="px-3 py-2.5">
                                    {item.effective_date || "-"}
                                  </td>
                                  <td className="px-3 py-2.5 text-text-secondary">
                                    {item.notes || "-"}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                      </div>
                    </WidgetCard>

                    <WidgetCard
                      id="project-financial-screen"
                      title={t("projects.projectFinancialScreen")}
                      headerMeta={t("projects.projectFinancialSubtitle")}
                      actionSlot={
                        selectedProjectId ? (
                          <Button
                            type="button"
                            variant="outline"
                            className="h-9"
                            onClick={() =>
                              router.push(
                                `/reports?project_id=${encodeURIComponent(selectedProjectId)}`,
                              )
                            }
                          >
                            {copy(
                              "Open project report",
                              "Открыть отчёт по проекту",
                              "פתח דוח פרויקט",
                            )}
                          </Button>
                        ) : null
                      }
                    >
                      <div className="space-y-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="max-w-3xl">
                          <p className="mt-1 text-[12px] leading-relaxed text-text-secondary">
                            {loadingProjectPlanFact || loadingProjectRisk
                              ? t("projects.refreshingFinancialView")
                              : projectRisk?.generated_at
                                ? `${copy("Updated", "Обновлено", "עודכן")}: ${formatDateTime(projectRisk.generated_at)}`
                                : t("projects.financialDataReady")}
                          </p>
                        </div>
                      </div>

                      {loadingProjectPlanFact || loadingProjectRisk ? (
                        <div className="text-[13px] text-text-secondary">
                          {t("projects.loadingFinancialScreen")}
                        </div>
                      ) : projectPlanFact && projectRisk ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-2 xl:grid-cols-6">
                            <DimaxKpiCard
                              className="min-h-[176px]"
                              label={copy("Completion", "Готовность", "השלמה")}
                              value={formatPct(projectPlanFact.completion_pct)}
                              hint={
                                <>
                                  {copy("Installed", "Установлено", "הותקן")}:{" "}
                                  {projectPlanFact.installed_doors}/
                                  {projectPlanFact.total_doors}
                                </>
                              }
                              barColor="green"
                            />
                            <DimaxKpiCard
                              className="min-h-[176px]"
                              label={copy(
                                "Actual Margin",
                                "Фактическая маржа",
                                "מרווח בפועל",
                              )}
                              value={formatPct(
                                projectRisk.summary.actual_margin_pct,
                              )}
                              hint={
                                <>
                                  {copy("Profit", "Прибыль", "רווח")}:{" "}
                                  {formatMoney(
                                    projectRisk.summary.actual_profit_total,
                                  )}
                                </>
                              }
                              barColor="blue"
                            />
                            <DimaxKpiCard
                              className="min-h-[176px]"
                              label={copy(
                                "Revenue Gap",
                                "Разрыв по выручке",
                                "פער בהכנסה",
                              )}
                              value={formatMoney(
                                projectPlanFact.revenue_gap_total,
                              )}
                              hint={
                                <>
                                  {copy("Delayed", "Задержано", "בעיכוב")}:{" "}
                                  {formatMoney(
                                    projectRisk.summary.delayed_revenue_total,
                                  )}
                                </>
                              }
                              barColor="orange"
                            />
                            <DimaxKpiCard
                              className="min-h-[176px]"
                              label={copy(
                                "Profit Gap",
                                "Разрыв по прибыли",
                                "פער ברווח",
                              )}
                              value={formatMoney(
                                projectPlanFact.profit_gap_total,
                              )}
                              hint={
                                <>
                                  {copy("Risk", "Риск", "סיכון")}:{" "}
                                  {formatMoney(
                                    projectRisk.summary
                                      .blocked_issue_profit_at_risk,
                                  )}
                                </>
                              }
                              barColor="yellow"
                            />
                            <DimaxKpiCard
                              className="min-h-[176px]"
                              label={copy(
                                "Open Issues",
                                "Открытые проблемы",
                                "בעיות פתוחות",
                              )}
                              value={projectPlanFact.open_issues}
                              hint={
                                <>
                                  {copy("Blocked", "Заблокировано", "חסום")}:{" "}
                                  {projectRisk.summary.blocked_open_issues}
                                </>
                              }
                              barColor="red"
                              emphasis={
                                projectPlanFact.open_issues > 0
                                  ? "problem"
                                  : "default"
                              }
                            />
                            <DimaxKpiCard
                              className="min-h-[176px]"
                              label={copy(
                                "Data Risk",
                                "Риск данных",
                                "סיכון נתונים",
                              )}
                              value={projectPlanFact.missing_actual_rates_doors}
                              hint={
                                <>
                                  {copy(
                                    "Add-on gaps",
                                    "Дополнительные пробелы",
                                    "פערי תוספות",
                                  )}
                                  : {projectPlanFact.missing_addon_plans_facts}
                                </>
                              }
                              barColor="orange"
                              emphasis={
                                projectPlanFact.missing_actual_rates_doors > 0
                                  ? "problem"
                                  : "default"
                              }
                            />
                          </div>

                          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_0.95fr]">
                            <WidgetCard
                              title={t("projects.planVsFactLedger")}
                              headerMeta={
                                <>
                                  {t("projects.addonsPlannedFact")
                                    .replace(
                                      "{planned}",
                                      String(
                                        projectPlanFact.planned_addons_qty,
                                      ),
                                    )
                                    .replace(
                                      "{actual}",
                                      String(projectPlanFact.actual_addons_qty),
                                    )}
                                </>
                              }
                            >
                              <div className="divide-y divide-border-subtle overflow-hidden rounded-lg border border-border bg-surface md:hidden">
                                {[
                                  {
                                    label: t("projects.revenue"),
                                    plan: formatMoney(
                                      projectPlanFact.planned_revenue_total,
                                    ),
                                    fact: formatMoney(
                                      projectPlanFact.actual_revenue_total,
                                    ),
                                    gap: formatMoney(
                                      projectPlanFact.revenue_gap_total,
                                    ),
                                  },
                                  {
                                    label: t("projects.payroll"),
                                    plan: formatMoney(
                                      projectPlanFact.planned_payroll_total,
                                    ),
                                    fact: formatMoney(
                                      projectPlanFact.actual_payroll_total,
                                    ),
                                    gap: formatMoney(
                                      projectPlanFact.payroll_gap_total,
                                    ),
                                  },
                                  {
                                    label: t("projects.profit"),
                                    plan: formatMoney(
                                      projectPlanFact.planned_profit_total,
                                    ),
                                    fact: formatMoney(
                                      projectPlanFact.actual_profit_total,
                                    ),
                                    gap: formatMoney(
                                      projectPlanFact.profit_gap_total,
                                    ),
                                  },
                                  {
                                    label: t("projects.addons"),
                                    plan: String(
                                      projectPlanFact.planned_addons_qty,
                                    ),
                                    fact: String(
                                      projectPlanFact.actual_addons_qty,
                                    ),
                                    gap: String(
                                      projectPlanFact.actual_addons_qty -
                                        projectPlanFact.planned_addons_qty,
                                    ),
                                  },
                                ].map((row) => (
                                  <article
                                    key={row.label}
                                    className="px-3.5 py-3.5"
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0 text-[13px] font-semibold text-text">
                                        {row.label}
                                      </div>
                                      <div className="shrink-0 rounded-full bg-surface-sunken px-2 py-1 text-[10.5px] font-medium leading-none text-text-secondary">
                                        {t("projects.gap")}
                                      </div>
                                    </div>
                                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                                      <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                                        <div className={projectsMetricLabelClass}>
                                          {t("projects.plan")}
                                        </div>
                                        <div className="mt-1 text-[12px] font-medium text-text tabular-nums">
                                          {row.plan}
                                        </div>
                                      </div>
                                      <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                                        <div className={projectsMetricLabelClass}>
                                          {t("projects.fact")}
                                        </div>
                                        <div className="mt-1 text-[12px] font-medium text-text tabular-nums">
                                          {row.fact}
                                        </div>
                                      </div>
                                      <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                                        <div className={projectsMetricLabelClass}>
                                          {t("projects.gap")}
                                        </div>
                                        <div className="mt-1 text-[12px] font-medium text-text tabular-nums">
                                          {row.gap}
                                        </div>
                                      </div>
                                    </div>
                                  </article>
                                ))}
                              </div>
                              <div className="hidden overflow-auto rounded-lg border border-border bg-surface md:block">
                                <table className="min-w-[760px] w-full text-[12px] leading-5">
                                  <thead className="bg-surface-subtle text-text-secondary">
                                    <tr>
                                      <th className="px-3 py-2 text-start font-medium">
                                        {t("projects.metric")}
                                      </th>
                                      <th className="px-3 py-2 text-start font-medium">
                                        {t("projects.plan")}
                                      </th>
                                      <th className="px-3 py-2 text-start font-medium">
                                        {t("projects.fact")}
                                      </th>
                                      <th className="px-3 py-2 text-start font-medium">
                                        {t("projects.gap")}
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr className="border-t border-border bg-surface-subtle">
                                      <td className="px-3 py-2 font-medium">
                                        {t("projects.revenue")}
                                      </td>
                                      <td className="px-3 py-2">
                                        {formatMoney(
                                          projectPlanFact.planned_revenue_total,
                                        )}
                                      </td>
                                      <td className="px-3 py-2">
                                        {formatMoney(
                                          projectPlanFact.actual_revenue_total,
                                        )}
                                      </td>
                                      <td className="px-3 py-2">
                                        {formatMoney(
                                          projectPlanFact.revenue_gap_total,
                                        )}
                                      </td>
                                    </tr>
                                    <tr className="border-t border-border">
                                      <td className="px-3 py-2 font-medium">
                                        {t("projects.payroll")}
                                      </td>
                                      <td className="px-3 py-2">
                                        {formatMoney(
                                          projectPlanFact.planned_payroll_total,
                                        )}
                                      </td>
                                      <td className="px-3 py-2">
                                        {formatMoney(
                                          projectPlanFact.actual_payroll_total,
                                        )}
                                      </td>
                                      <td className="px-3 py-2">
                                        {formatMoney(
                                          projectPlanFact.payroll_gap_total,
                                        )}
                                      </td>
                                    </tr>
                                    <tr className="border-t border-border bg-surface-subtle">
                                      <td className="px-3 py-2 font-medium">
                                        {t("projects.profit")}
                                      </td>
                                      <td className="px-3 py-2">
                                        {formatMoney(
                                          projectPlanFact.planned_profit_total,
                                        )}
                                      </td>
                                      <td className="px-3 py-2">
                                        {formatMoney(
                                          projectPlanFact.actual_profit_total,
                                        )}
                                      </td>
                                      <td className="px-3 py-2">
                                        {formatMoney(
                                          projectPlanFact.profit_gap_total,
                                        )}
                                      </td>
                                    </tr>
                                    <tr className="border-t border-border">
                                      <td className="px-3 py-2 font-medium">
                                        {t("projects.addons")}
                                      </td>
                                      <td className="px-3 py-2">
                                        {projectPlanFact.planned_addons_qty}
                                      </td>
                                      <td className="px-3 py-2">
                                        {projectPlanFact.actual_addons_qty}
                                      </td>
                                      <td className="px-3 py-2">
                                        {projectPlanFact.actual_addons_qty -
                                          projectPlanFact.planned_addons_qty}
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </WidgetCard>

                            <WidgetCard title={t("projects.riskDrivers")}>
                              <div className="space-y-2">
                                {projectRisk.drivers.length > 0 ? (
                                  projectRisk.drivers.map((driver) => (
                                    <div
                                      key={driver.code}
                                      className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2.5"
                                    >
                                      <div>
                                        <div className="text-[12px] font-medium text-text">
                                          {driver.label}
                                        </div>
                                        <div className="text-[11px] text-text-secondary">
                                          {driver.code}
                                        </div>
                                      </div>
                                      <div className="text-end">
                                        <span
                                          className={cn(
                                            "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                                            riskTone(driver.severity),
                                          )}
                                        >
                                          {tokenLabel(driver.severity)}
                                        </span>
                                        <div className="mt-1 text-[12px] text-text-secondary">
                                          {driver.code.includes("ISSUE")
                                            ? driver.value
                                            : formatMoney(driver.value)}
                                        </div>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-[12px] text-text-secondary">
                                    {t("projects.noRiskDrivers")}
                                  </div>
                                )}
                              </div>
                            </WidgetCard>
                          </div>

                          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                            <WidgetCard title={t("projects.topDelayReasons")}>
                              <div className="divide-y divide-border-subtle overflow-hidden rounded-lg border border-border bg-surface md:hidden">
                                {projectRisk.top_reasons.length > 0 ? (
                                  projectRisk.top_reasons.map((reason) => (
                                    <article
                                      key={
                                        reason.reason_id || reason.reason_name
                                      }
                                      className="px-3.5 py-3.5"
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 break-words text-[13px] font-semibold leading-5 text-text">
                                          {reason.reason_name}
                                        </div>
                                        <div className="shrink-0 text-end">
                                          <div className={projectsMetricLabelClass}>
                                            {t("projects.doors")}
                                          </div>
                                          <div className="mt-1 text-[17px] font-medium leading-tight text-text tabular-nums">
                                            {reason.doors}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="mt-3 grid grid-cols-2 gap-2">
                                        <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                                          <div className={projectsMetricLabelClass}>
                                            {t("projects.revenue")}
                                          </div>
                                          <div className="mt-1 text-[13px] font-medium text-text tabular-nums">
                                            {formatMoney(
                                              reason.revenue_delayed_total,
                                            )}
                                          </div>
                                        </div>
                                        <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                                          <div className={projectsMetricLabelClass}>
                                            {t("projects.profit")}
                                          </div>
                                          <div className="mt-1 text-[13px] font-medium text-text tabular-nums">
                                            {formatMoney(
                                              reason.profit_delayed_total,
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </article>
                                  ))
                                ) : (
                                  <div className="px-3.5 py-4 text-[12px] text-text-secondary">
                                    {t("projects.noDelayReasons")}
                                  </div>
                                )}
                              </div>
                              <div className="hidden overflow-auto rounded-lg border border-border bg-surface md:block">
                                <table className="min-w-[760px] w-full text-[12px] leading-5">
                                  <thead className="bg-surface-subtle text-text-secondary">
                                    <tr>
                                      <th className="px-3 py-2 text-start font-medium">
                                        {t("projects.reason")}
                                      </th>
                                      <th className="px-3 py-2 text-start font-medium">
                                        {t("projects.doors")}
                                      </th>
                                      <th className="px-3 py-2 text-start font-medium">
                                        {t("projects.revenue")}
                                      </th>
                                      <th className="px-3 py-2 text-start font-medium">
                                        {t("projects.profit")}
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {projectRisk.top_reasons.length > 0 ? (
                                      projectRisk.top_reasons.map((reason) => (
                                        <tr
                                          key={
                                            reason.reason_id ||
                                            reason.reason_name
                                          }
                                          className="border-t border-border"
                                        >
                                          <td className="px-3 py-2">
                                            {reason.reason_name}
                                          </td>
                                          <td className="px-3 py-2">
                                            {reason.doors}
                                          </td>
                                          <td className="px-3 py-2">
                                            {formatMoney(
                                              reason.revenue_delayed_total,
                                            )}
                                          </td>
                                          <td className="px-3 py-2">
                                            {formatMoney(
                                              reason.profit_delayed_total,
                                            )}
                                          </td>
                                        </tr>
                                      ))
                                    ) : (
                                      <tr className="border-t border-border">
                                        <td
                                          className="px-3 py-2 text-text-secondary"
                                          colSpan={4}
                                        >
                                          {t("projects.noDelayReasons")}
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </WidgetCard>

                            <WidgetCard title={t("projects.ordersAtRisk")}>
                              <div className="divide-y divide-border-subtle overflow-hidden rounded-lg border border-border bg-surface md:hidden">
                                {projectRisk.risky_orders.length > 0 ? (
                                  projectRisk.risky_orders.map((order) => (
                                    <article
                                      key={order.order_number}
                                      className="px-3.5 py-3.5"
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                          <div className="text-[13px] font-semibold text-text">
                                            {order.order_number}
                                          </div>
                                          <div className="mt-1 text-[12px] text-text-secondary">
                                            {copy(
                                              "Installed",
                                              "Установлено",
                                              "הותקן",
                                            )}
                                            : {order.installed_doors}/
                                            {order.total_doors}
                                          </div>
                                        </div>
                                        <div className="shrink-0 text-end">
                                          <div className={projectsMetricLabelClass}>
                                            {t("projects.completion")}
                                          </div>
                                          <div className="mt-1 text-[17px] font-medium leading-tight text-text tabular-nums">
                                            {formatPct(order.completion_pct)}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="mt-3 grid grid-cols-2 gap-2">
                                        <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                                          <div className={projectsMetricLabelClass}>
                                            {t("projects.issues")}
                                          </div>
                                          <div className="mt-1 text-[13px] font-medium text-text tabular-nums">
                                            {order.open_issues}
                                          </div>
                                        </div>
                                        <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                                          <div className={projectsMetricLabelClass}>
                                            {t("projects.gap")}
                                          </div>
                                          <div className="mt-1 text-[13px] font-medium text-text tabular-nums">
                                            {formatMoney(
                                              order.revenue_gap_total,
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </article>
                                  ))
                                ) : (
                                  <div className="px-3.5 py-4 text-[12px] text-text-secondary">
                                    {t("projects.noRiskyOrders")}
                                  </div>
                                )}
                              </div>
                              <div className="hidden overflow-auto rounded-lg border border-border bg-surface md:block">
                                <table className="min-w-[760px] w-full text-[12px] leading-5">
                                  <thead className="bg-surface-subtle text-text-secondary">
                                    <tr>
                                      <th className="px-3 py-2 text-start font-medium">
                                        {copy(
                                          "Order Number",
                                          "Номер заказа",
                                          "מספר הזמנה",
                                        )}
                                      </th>
                                      <th className="px-3 py-2 text-start font-medium">
                                        {t("projects.completion")}
                                      </th>
                                      <th className="px-3 py-2 text-start font-medium">
                                        {t("projects.issues")}
                                      </th>
                                      <th className="px-3 py-2 text-start font-medium">
                                        {t("projects.gap")}
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {projectRisk.risky_orders.length > 0 ? (
                                      projectRisk.risky_orders.map((order) => (
                                        <tr
                                          key={order.order_number}
                                          className="border-t border-border"
                                        >
                                          <td className="px-3 py-2 font-medium">
                                            {order.order_number}
                                          </td>
                                          <td className="px-3 py-2">
                                            {formatPct(order.completion_pct)}
                                          </td>
                                          <td className="px-3 py-2">
                                            {order.open_issues}
                                          </td>
                                          <td className="px-3 py-2">
                                            {formatMoney(
                                              order.revenue_gap_total,
                                            )}
                                          </td>
                                        </tr>
                                      ))
                                    ) : (
                                      <tr className="border-t border-border">
                                        <td
                                          className="px-3 py-2 text-text-secondary"
                                          colSpan={4}
                                        >
                                          {t("projects.noRiskyOrders")}
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </WidgetCard>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 text-[13px] text-text-secondary">
                          {t("projects.financialUnavailable")}
                        </div>
                      )}
                      </div>
                    </WidgetCard>
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
                  <WidgetCard
                    title={t("projects.bulkReconcileResult")}
                    headerMeta={
                      <>
                        {t("projects.successCount")}:{" "}
                        {bulkReconcileResult.successful_projects} |{" "}
                        {t("projects.failedCount")}:{" "}
                        {bulkReconcileResult.failed_projects} |{" "}
                        {t("projects.skippedCount")}:{" "}
                        {bulkReconcileResult.skipped_projects}
                      </>
                    }
                  >
                    <div className="divide-y divide-border-subtle overflow-hidden rounded-lg border border-border bg-surface md:hidden">
                      {bulkReconcileResult.items.map((item) => {
                        const projectName =
                          projects.find((p) => p.id === item.project_id)
                            ?.name || item.project_id;
                        return (
                          <article
                            key={`${item.project_id}-${item.source_run_id || "none"}-mobile`}
                            className="px-3.5 py-3.5"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="truncate text-[13px] font-semibold text-text">
                                  {projectName}
                                </div>
                                <div className="mt-1 text-[11px] text-text-secondary">
                                  <LtrText>
                                    {item.source_run_id || item.project_id}
                                  </LtrText>
                                </div>
                              </div>
                              <StatusBadge
                                status={item.status}
                                label={tokenLabel(item.status)}
                                domain="sync"
                              />
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                                <div className={projectsMetricLabelClass}>
                                  {t("projects.imported")}
                                </div>
                                <div className="mt-1 text-[15px] font-medium text-text tabular-nums">
                                  {item.imported}
                                </div>
                              </div>
                              <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                                <div className={projectsMetricLabelClass}>
                                  {t("projects.skippedCount")}
                                </div>
                                <div className="mt-1 text-[15px] font-medium text-text tabular-nums">
                                  {item.skipped}
                                </div>
                              </div>
                            </div>
                            {item.last_error ? (
                              <div className="mt-3 rounded-lg border border-status-problem-border bg-status-problem-bg px-3 py-2 text-[12px] leading-5 text-status-problem-fg">
                                {item.last_error}
                              </div>
                            ) : null}
                          </article>
                        );
                      })}
                    </div>
                    <div className="hidden overflow-auto rounded-lg border border-border bg-surface md:block">
                      <table className="min-w-[760px] w-full text-[12px] leading-5">
                        <thead className="bg-surface-subtle text-text-secondary">
                          <tr>
                            <th className="text-start px-2 py-2 font-medium">
                              {t("common.project")}
                            </th>
                            <th className="text-start px-2 py-2 font-medium">
                              {t("common.status")}
                            </th>
                            <th className="text-start px-2 py-2 font-medium">
                              {t("projects.imported")}
                            </th>
                            <th className="text-start px-2 py-2 font-medium">
                              {t("projects.skippedCount")}
                            </th>
                            <th className="text-start px-2 py-2 font-medium">
                              {t("projects.errorLabel")}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {bulkReconcileResult.items.map((item) => {
                            const projectName =
                              projects.find((p) => p.id === item.project_id)
                                ?.name || item.project_id;
                            return (
                              <tr
                                key={`${item.project_id}-${item.source_run_id || "none"}`}
                                className="row-hover border-t border-border"
                              >
                                <td className="px-2 py-1.5">{projectName}</td>
                                <td className="px-2 py-1.5">
                                  <StatusBadge
                                    status={item.status}
                                    label={tokenLabel(item.status)}
                                    domain="sync"
                                  />
                                </td>
                                <td className="px-2 py-1.5">{item.imported}</td>
                                <td className="px-2 py-1.5">{item.skipped}</td>
                                <td
                                  className={cn(
                                    "px-2 py-1.5",
                                    item.last_error
                                      ? "text-status-problem-fg"
                                      : "text-text-secondary",
                                  )}
                                >
                                  {item.last_error || "-"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </WidgetCard>
                )}

                {bulkReviewResult && (
                  <WidgetCard
                    title={t("projects.bulkImportReview")}
                    headerMeta={
                      <>
                        {t("projects.reviewable")}:{" "}
                        {bulkReviewResult.reviewable_projects} |{" "}
                        {t("projects.failedPartial")}:{" "}
                        {bulkReviewResult.failed_or_partial_projects} |{" "}
                        {t("projects.skippedCount")}:{" "}
                        {bulkReviewResult.skipped_projects}
                      </>
                    }
                  >
                    <div className="divide-y divide-border-subtle overflow-hidden rounded-lg border border-border bg-surface md:hidden">
                      {bulkReviewResult.items.map((item) => (
                        <article
                          key={`${item.project_id}-${item.source_run_id || "none"}-mobile`}
                          className="px-3.5 py-3.5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-[13px] font-semibold text-text">
                                {item.project_name}
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                <span className="inline-flex rounded-full bg-surface-sunken px-2 py-1 text-[10.5px] font-medium leading-none text-text-secondary">
                                  {t("common.mode")}: {item.mode || "-"}
                                </span>
                                {item.source_filename ? (
                                  <span className="inline-flex max-w-full rounded-full bg-surface-sunken px-2 py-1 text-[10.5px] font-medium leading-none text-text-secondary">
                                    <span className="truncate">
                                      {item.source_filename}
                                    </span>
                                  </span>
                                ) : null}
                              </div>
                            </div>
                            <StatusBadge
                              status={item.status}
                              label={tokenLabel(item.status)}
                              domain="sync"
                            />
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                              <div className={projectsMetricLabelClass}>
                                {t("projects.rows")}
                              </div>
                              <div className="mt-1 text-[15px] font-medium text-text tabular-nums">
                                {item.parsed_rows} / {item.prepared_rows}
                              </div>
                            </div>
                            <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                              <div className={projectsMetricLabelClass}>
                                {t("projects.actions")}
                              </div>
                              <div className="mt-1 text-[12px] font-medium text-text">
                                {item.source_run_id
                                  ? t("projects.openRun")
                                  : "-"}
                              </div>
                            </div>
                          </div>

                          {item.last_error ? (
                            <div className="mt-3 rounded-lg border border-status-problem-border bg-status-problem-bg px-3 py-2 text-[12px] leading-5 text-status-problem-fg">
                              {item.last_error}
                            </div>
                          ) : null}

                          {item.source_run_id ? (
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  openImportRun(
                                    item.project_id,
                                    item.source_run_id!,
                                  )
                                }
                                className="h-8 px-2.5 text-[11px]"
                              >
                                {t("projects.openRun")}
                              </Button>
                              {item.retry_available ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedProjectId(item.project_id);
                                    void handleRetryImportRun(
                                      item.source_run_id!,
                                      item.project_id,
                                    );
                                  }}
                                  className="h-8 px-2.5 text-[11px]"
                                >
                                  {t("projects.retryNow")}
                                </Button>
                              ) : null}
                            </div>
                          ) : null}
                        </article>
                      ))}
                    </div>
                    <div className="hidden overflow-auto rounded-lg border border-border bg-surface md:block">
                      <table className="min-w-[760px] w-full text-[12px] leading-5">
                        <thead className="bg-surface-subtle text-text-secondary">
                          <tr>
                            <th className="text-start px-2 py-2 font-medium">
                              {t("common.project")}
                            </th>
                            <th className="text-start px-2 py-2 font-medium">
                              {t("common.status")}
                            </th>
                            <th className="text-start px-2 py-2 font-medium">
                              {t("common.mode")}
                            </th>
                            <th className="text-start px-2 py-2 font-medium">
                              {t("projects.rows")}
                            </th>
                            <th className="text-start px-2 py-2 font-medium">
                              {t("projects.file")}
                            </th>
                            <th className="text-start px-2 py-2 font-medium">
                              {t("projects.errorLabel")}
                            </th>
                            <th className="text-start px-2 py-2 font-medium">
                              {t("projects.actions")}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {bulkReviewResult.items.map((item) => (
                            <tr
                              key={`${item.project_id}-${item.source_run_id || "none"}`}
                              className="row-hover border-t border-border"
                            >
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
                              <td className="px-2 py-1.5">
                                {item.mode || "-"}
                              </td>
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
                                className={cn(
                                  "px-2 py-1.5",
                                  item.last_error
                                    ? "text-status-problem-fg"
                                    : "text-text-secondary",
                                )}
                                title={item.last_error || ""}
                              >
                                {item.last_error || "-"}
                              </td>
                              <td className="px-2 py-1.5">
                                <div className="flex items-center gap-1">
                                  {item.source_run_id ? (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        openImportRun(
                                          item.project_id,
                                          item.source_run_id!,
                                        )
                                      }
                                      className="h-7 px-2 text-[11px]"
                                    >
                                      {t("projects.openRun")}
                                    </Button>
                                  ) : null}
                                  {item.retry_available &&
                                  item.source_run_id ? (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedProjectId(item.project_id);
                                        void handleRetryImportRun(
                                          item.source_run_id!,
                                          item.project_id,
                                        );
                                      }}
                                      className="h-7 px-2 text-[11px]"
                                    >
                                      {t("projects.retryNow")}
                                    </Button>
                                  ) : null}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </WidgetCard>
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

                <WidgetCard
                  id="project-door-import"
                  title={t("projects.importFactoryFile")}
                  titleAccessory={
                    <Upload className="h-4 w-4 text-text-secondary" aria-hidden="true" />
                  }
                  headerMeta={t("projects.acceptedFormats")}
                  actionSlot={
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void handleDownloadImportTemplate()}
                      disabled={!canManageProjectImports || downloadingImportTemplate}
                      className="h-8 w-full justify-center px-2 text-[12px] sm:w-auto"
                    >
                      <Download
                        className="mr-1.5 h-3.5 w-3.5"
                        aria-hidden="true"
                      />
                      {downloadingImportTemplate
                        ? copy("Downloading...", "Скачивание...", "מוריד...")
                        : copy(
                            "Download Excel template",
                            "Скачать Excel-шаблон",
                            "הורד תבנית Excel",
                          )}
                    </Button>
                  }
                >
                  <p className="text-[12px] text-text-secondary">
                    {copy(
                      "Priority columns: order, building, floor, apartment, door model",
                      "Основные столбцы: заказ, дом, этаж, квартира, модель двери",
                      "עמודות עיקריות: הזמנה, בניין, קומה, דירה, דגם דלת",
                    )}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_280px_130px] gap-2 mt-3">
                    <label className="flex h-10 cursor-pointer items-center rounded-lg border border-dashed border-border bg-surface px-3 text-[13px] text-text-secondary transition-colors hover:border-border-strong focus-within:ring-2 focus-within:ring-accent/35">
                      <FileSpreadsheet
                        className="w-4 h-4 mr-2 shrink-0"
                        aria-hidden="true"
                      />
                      <span className="truncate">
                        {importFile
                          ? importFile.name
                          : t("projects.chooseFile")}
                      </span>
                      <input
                        type="file"
                        disabled={!canManageProjectImports}
                        className="hidden"
                        onChange={(e) => {
                          setImportFile(e.target.files?.[0] || null);
                          setAnalysisReady(false);
                          setAllowPartialImport(false);
                          setImportResult(null);
                        }}
                        accept=".csv,.txt,.tsv,.json,.xml,.xlsx,.pdf"
                      />
                    </label>
                    <select
                      aria-label={t("projects.autoByFileCode")}
                      value={defaultDoorTypeId}
                      onChange={(e) => {
                        setDefaultDoorTypeId(e.target.value);
                        setAnalysisReady(false);
                        setAllowPartialImport(false);
                      }}
                      className="control-input"
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
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void handleImportAction("analyze")}
                        disabled={!canManageProjectImports || !importFile || importLoading}
                        className="h-10"
                      >
                        {importLoading && importAction === "analyze"
                          ? t("projects.analyzing")
                          : t("projects.analyze")}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => void handleImportAction("import")}
                        disabled={
                          !canManageProjectImports ||
                          !importFile ||
                          importLoading ||
                          !analysisReady ||
                          importBlockedByRowErrors
                        }
                        className="h-10"
                      >
                        {importLoading && importAction === "import"
                          ? t("projects.importing")
                          : t("projects.import")}
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                    <select
                      aria-label={t("projects.mappingProfileAuto")}
                      value={mappingProfile}
                      onChange={(e) => {
                        setMappingProfile(e.target.value);
                        setAnalysisReady(false);
                        setAllowPartialImport(false);
                      }}
                      className="control-input h-9 text-[12px]"
                    >
                      {loadingMappingProfiles ? (
                        <option value="auto_v1">
                          {t("projects.mappingProfileLoading")}
                        </option>
                      ) : null}
                      {!loadingMappingProfiles &&
                      mappingProfiles.length === 0 ? (
                        <option value="auto_v1">
                          {t("projects.mappingProfileAuto")}
                        </option>
                      ) : null}
                      {mappingProfiles.map((profile) => (
                        <option key={profile.code} value={profile.code}>
                          {importProfileLabel(profile.code, profile.name)}
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label={t("projects.delimiterAuto")}
                      value={delimiter}
                      onChange={(e) => {
                        setDelimiter(e.target.value);
                        setAnalysisReady(false);
                        setAllowPartialImport(false);
                      }}
                      className="control-input h-9 text-[12px]"
                    >
                      <option value="">{t("projects.delimiterAuto")}</option>
                      <option value=",">{t("projects.delimiterComma")}</option>
                      <option value=";">
                        {t("projects.delimiterSemicolon")}
                      </option>
                      <option value="|">{t("projects.delimiterPipe")}</option>
                      <option value={"\t"}>{t("projects.delimiterTab")}</option>
                    </select>
                    <label className="checkbox-row h-9 rounded-lg border border-border bg-surface px-3">
                      <input
                        type="checkbox"
                        checked={createMissingDoorTypes}
                        onChange={(e) => {
                          setCreateMissingDoorTypes(e.target.checked);
                          setAnalysisReady(false);
                          setAllowPartialImport(false);
                        }}
                      />
                      {t("projects.createMissingDoorTypes")}
                    </label>
                  </div>

                  {importResult && (
                    <div className="mt-3 rounded-lg border border-border bg-surface-subtle px-3 py-2 text-[12px]">
                      <div className="flex items-center gap-1.5 text-status-ok-fg">
                        <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                        {t("projects.parsedPreparedImportedSkipped")
                          .replace("{parsed}", String(importResult.parsed_rows))
                          .replace(
                            "{prepared}",
                            String(importResult.prepared_rows),
                          )
                          .replace("{imported}", String(importResult.imported))
                          .replace("{skipped}", String(importResult.skipped))}
                      </div>
                      {typeof importResult.would_import === "number" &&
                      typeof importResult.would_skip === "number" ? (
                        <div className="mt-1 text-text-secondary">
                          {t("projects.preflightResult")
                            .replace(
                              "{mode}",
                              importResult.mode === "analyze"
                                ? t("projects.preflight")
                                : t("projects.result"),
                            )
                            .replace(
                              "{wouldImport}",
                              String(importResult.would_import),
                            )
                            .replace(
                              "{wouldSkip}",
                              String(importResult.would_skip),
                            )}
                        </div>
                      ) : null}
                      {importResult.mode === "analyze" &&
                      importAnalyzeErrorsCount === 0 ? (
                        <div className="mt-1 text-text-secondary">
                          {t("projects.analyzeCompleted")}
                        </div>
                      ) : null}
                      {importResult.mode === "analyze" &&
                      importAnalyzeErrorsCount > 0 ? (
                        <div className="mt-2 flex items-start gap-2 rounded-lg border border-status-problem-border bg-status-problem-bg px-2 py-1.5 text-status-problem-fg">
                          <AlertCircle
                            className="mt-0.5 h-4 w-4 shrink-0"
                            aria-hidden="true"
                          />
                          <div>
                            <div className="font-semibold">
                              {copy(
                                "Analyze found row errors",
                                "Анализ нашёл ошибки в строках",
                                "הניתוח מצא שגיאות בשורות",
                              )}
                            </div>
                            <div className="mt-0.5 text-[11px] text-text-secondary">
                              {copy(
                                "Fix the file and analyze again, or explicitly allow partial import of valid rows.",
                                "Исправьте файл и повторите анализ либо явно разрешите частичный импорт корректных строк.",
                                "תקן את הקובץ ונתח שוב, או אשר במפורש יבוא חלקי של שורות תקינות.",
                              )}
                            </div>
                          </div>
                        </div>
                      ) : null}
                      {importResult.idempotency_hit ? (
                        <div className="mt-1 text-text-secondary">
                          {t("projects.idempotencyHit")}
                        </div>
                      ) : null}
                      {importResult.diagnostics?.mapping_profile ? (
                        <div className="mt-1 text-text-secondary">
                          {t("projects.mappingProfileValue").replace(
                            "{value}",
                            importProfileLabel(
                              importResult.diagnostics.mapping_profile,
                            ),
                          )}
                        </div>
                      ) : null}
                      {importResult.diagnostics?.strict_required_fields !==
                        undefined &&
                      importResult.diagnostics?.strict_required_fields !==
                        null ? (
                        <div className="mt-1 text-text-secondary">
                          {t("projects.strictRequiredFields").replace(
                            "{value}",
                            importResult.diagnostics.strict_required_fields
                              ? t("projects.on")
                              : t("projects.off"),
                          )}
                        </div>
                      ) : null}
                      {importResult.diagnostics?.missing_required_fields
                        ?.length ? (
                        <div className="mt-1 text-status-problem-fg">
                          {t("projects.missingRequiredFields").replace(
                            "{fields}",
                            importResult.diagnostics.missing_required_fields.join(
                              ", ",
                            ),
                          )}
                        </div>
                      ) : null}
                      {importResult.diagnostics?.data_summary ? (
                        <div className="mt-2">
                          <div className="text-text-secondary">
                            {t("projects.importDataSummary")}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {[
                              {
                                label: t("projects.orders"),
                                value:
                                  importResult.diagnostics.data_summary
                                    .unique_order_numbers,
                              },
                              {
                                label: t("projects.houses"),
                                value:
                                  importResult.diagnostics.data_summary
                                    .unique_houses,
                              },
                              {
                                label: t("projects.floors"),
                                value:
                                  importResult.diagnostics.data_summary
                                    .unique_floors,
                              },
                              {
                                label: t("projects.apartments"),
                                value:
                                  importResult.diagnostics.data_summary
                                    .unique_apartments,
                              },
                              {
                                label: t("projects.locations"),
                                value:
                                  importResult.diagnostics.data_summary
                                    .unique_locations,
                              },
                              {
                                label: t("projects.markings"),
                                value:
                                  importResult.diagnostics.data_summary
                                    .unique_markings,
                              },
                              {
                                label: t("projects.rowErrors"),
                                value:
                                  importResult.diagnostics.data_summary
                                    .rows_with_errors,
                              },
                              {
                                label: t("projects.duplicateRows"),
                                value:
                                  importResult.diagnostics.data_summary
                                    .duplicate_rows_skipped,
                              },
                            ].map((item) => (
                              <span
                                key={item.label}
                                className="rounded-full border border-border bg-surface px-2.5 py-1 text-text"
                              >
                                {item.label}: {item.value}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      {canViewProjectRates &&
                      (importResult.diagnostics?.data_summary
                        ?.zero_price_doors || 0) > 0 ? (
                        <div className="mt-2 rounded-lg border border-status-warning-border bg-status-warning-bg px-2.5 py-2 text-status-warning-fg">
                          {copy(
                            "Zero client price doors: {count}. Check the source price column or default client price before importing.",
                            "Двери с нулевой ценой клиента: {count}. Проверьте колонку цены в файле или цену клиента по умолчанию перед импортом.",
                            "דלתות עם מחיר לקוח אפס: {count}. בדוק את עמודת המחיר בקובץ או מחיר ברירת מחדל לפני הייבוא.",
                          ).replace(
                            "{count}",
                            String(
                              importResult.diagnostics?.data_summary
                                ?.zero_price_doors || 0,
                            ),
                          )}
                        </div>
                      ) : null}
                      {renderImportPreviewGroups(importResult.diagnostics)}
                      {importResult.diagnostics?.required_fields?.length ? (
                        <div className="mt-2">
                          <div className="text-text-secondary">
                            {t("projects.requiredColumnsStatus")}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {importResult.diagnostics.required_fields.map(
                              (field) => (
                                <span
                                  key={field.field_key}
                                  className={cn(
                                    "rounded-full border px-2.5 py-1",
                                    field.found
                                      ? "border-status-ok-border bg-status-ok-bg text-status-ok-fg"
                                      : "border-status-problem-border bg-status-problem-bg text-status-problem-fg",
                                  )}
                                  title={
                                    field.matched_columns.length > 0
                                      ? `Matched: ${field.matched_columns.join(", ")}`
                                      : t("projects.notDetected")
                                  }
                                >
                                  {field.display_name}:{" "}
                                  {field.found
                                    ? t("projects.found")
                                    : t("projects.missing")}
                                </span>
                              ),
                            )}
                          </div>
                        </div>
                      ) : null}
                      {importResult.errors.length > 0 && (
                        <div className="mt-2 rounded-lg border border-status-problem-border bg-status-problem-bg p-2 text-status-problem-fg">
                          {importResult.mode === "analyze" ? (
                            <div className="mb-2 rounded-md border border-status-problem-border bg-surface px-2 py-1.5 text-text">
                              <label className="checkbox-row text-[12px]">
                                <input
                                  type="checkbox"
                                  checked={allowPartialImport}
                                  onChange={(event) =>
                                    setAllowPartialImport(event.target.checked)
                                  }
                                />
                                {copy(
                                  "Allow partial import of valid rows",
                                  "Разрешить частичный импорт корректных строк",
                                  "אפשר יבוא חלקי של שורות תקינות",
                                )}
                              </label>
                              <div className="mt-1 text-[11px] text-text-secondary">
                                {copy(
                                  "Rows with errors will not create doors.",
                                  "Строки с ошибками не создадут двери.",
                                  "שורות עם שגיאות לא ייצרו דלתות.",
                                )}
                              </div>
                            </div>
                          ) : null}
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              {t("projects.errorsPreviewInline").replace(
                                "{value}",
                                  importResult.errors
                                    .slice(0, 5)
                                    .map(
                                      (e) =>
                                        `#${e.row} ${importRowErrorLabel(e.message)}`,
                                    )
                                    .join(" | "),
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                downloadImportErrorsCsv(
                                  importResult.errors,
                                  `dimax-import-errors-${safeDownloadFilename(importFile?.name || "current-file")}.csv`,
                                )
                              }
                              className="h-7 w-full justify-center border-status-problem-border bg-surface px-2 text-[11px] text-status-problem-fg sm:w-auto"
                            >
                              <Download
                                className="mr-1.5 h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                              {copy(
                                "Download error report",
                                "Скачать отчёт ошибок",
                                "הורד דוח שגיאות",
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div
                    id="project-import-history"
                    className="mt-4 rounded-lg border border-border bg-surface"
                  >
                    <div className="flex flex-col gap-2 border-b border-border bg-surface-subtle px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-[12px] font-semibold text-text">
                        {t("projects.importHistory")}
                        <span className="ml-2 text-text-secondary">
                          {filteredImportHistory.length} /{" "}
                          {importHistory.length}
                        </span>
                      </div>
                      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                        <select
                          aria-label={copy("Import history mode", "Режим истории импорта", "מצב היסטוריית ייבוא")}
                          value={importHistoryModeFilter}
                          onChange={(e) =>
                            setImportHistoryModeFilter(e.target.value)
                          }
                          className="control-input h-7 min-w-0 flex-1 px-2 text-[11px] sm:flex-none"
                        >
                          <option value="all">{t("projects.allModes")}</option>
                          <option value="analyze">
                            {t("projects.analyze")}
                          </option>
                          <option value="import">{t("projects.import")}</option>
                          <option value="import_retry">
                            {t("projects.retry")}
                          </option>
                        </select>
                        <select
                          aria-label={copy("Import history status", "Статус истории импорта", "סטטוס היסטוריית ייבוא")}
                          value={importHistoryStatusFilter}
                          onChange={(e) =>
                            setImportHistoryStatusFilter(e.target.value)
                          }
                          className="control-input h-7 min-w-0 flex-1 px-2 text-[11px] sm:flex-none"
                        >
                          <option value="all">
                            {t("projects.allStatuses")}
                          </option>
                          <option value="ANALYZED">
                            {copy("ANALYZED", "ПРОАНАЛИЗИРОВАНО", "נותח")}
                          </option>
                          <option value="SUCCESS">
                            {copy("SUCCESS", "УСПЕШНО", "הצליח")}
                          </option>
                          <option value="PARTIAL">
                            {copy("PARTIAL", "ЧАСТИЧНО", "חלקי")}
                          </option>
                          <option value="FAILED">
                            {copy("FAILED", "ОШИБКА", "נכשל")}
                          </option>
                          <option value="EMPTY">
                            {copy("EMPTY", "ПУСТО", "ריק")}
                          </option>
                        </select>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (selectedProjectId) {
                              void loadImportHistory(selectedProjectId);
                            }
                          }}
                          className="h-7 px-2 text-[11px]"
                        >
                          {t("projects.refreshHistory")}
                        </Button>
                      </div>
                    </div>
                    {loadingImportHistory ? (
                      <div className="px-3 py-3 text-[12px] text-text-secondary">
                        {t("projects.loadingImportHistory")}
                      </div>
                    ) : importHistory.length === 0 ? (
                      <div className="px-3 py-3 text-[12px] text-text-secondary">
                        {t("projects.noImportRunsYet")}
                      </div>
                    ) : filteredImportHistory.length === 0 ? (
                      <div className="px-3 py-3 text-[12px] text-text-secondary">
                        {t("projects.noImportRunsForFilters")}
                      </div>
                    ) : (
                      <>
                        <div className="divide-y divide-border-subtle md:hidden">
                          {filteredImportHistory.map((run) => (
                            <article
                              id={`import-run-card-${run.id}`}
                              key={`${run.id}-mobile`}
                              className={cn(
                                "px-3.5 py-3.5",
                                focusedImportRunId === run.id &&
                                  "bg-[var(--dmx-accent-tint)]",
                              )}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="text-[13px] font-semibold text-text">
                                    {formatDateTime(run.created_at)}
                                  </div>
                                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                    <span className="inline-flex rounded-full bg-surface-sunken px-2 py-1 text-[10.5px] font-medium leading-none text-text-secondary">
                                      {t("projects.modeLabel")}: {run.mode}
                                    </span>
                                    {run.source_filename ? (
                                      <span className="inline-flex max-w-full rounded-full bg-surface-sunken px-2 py-1 text-[10.5px] font-medium leading-none text-text-secondary">
                                        <span className="truncate">
                                          {run.source_filename}
                                        </span>
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                                <StatusBadge
                                  status={run.status}
                                  label={tokenLabel(run.status)}
                                  domain="sync"
                                />
                              </div>

                              <div className="mt-3 grid grid-cols-2 gap-2">
                                <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                                  <div className={projectsMetricLabelClass}>
                                    {t("projects.rows")}
                                  </div>
                                  <div className="mt-1 text-[15px] font-medium text-text tabular-nums">
                                    {run.parsed_rows} / {run.prepared_rows}
                                  </div>
                                </div>
                                <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                                  <div className={projectsMetricLabelClass}>
                                    {t("projects.result")}
                                  </div>
                                  <div className="mt-1 line-clamp-2 text-[12px] font-medium leading-5 text-text">
                                    {importRunResultSummary(run)}
                                  </div>
                                </div>
                              </div>

                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    openImportRun(selectedProjectId!, run.id);
                                  }}
                                  className="h-8 px-2.5 text-[11px]"
                                >
                                  {t("projects.view")}
                                </Button>
                                {run.retry_available ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      void handleRetryImportRun(run.id);
                                    }}
                                    disabled={!canManageProjectImports || retryingRunId === run.id}
                                    className="h-8 px-2.5 text-[11px]"
                                  >
                                    {retryingRunId === run.id
                                      ? `${t("projects.retry")}…`
                                      : t("projects.retry")}
                                  </Button>
                                ) : null}
                              </div>
                            </article>
                          ))}
                        </div>
                        <div className="hidden overflow-auto md:block">
                          <table className="w-full text-[11px]">
                            <thead className="bg-surface-subtle text-text-secondary">
                              <tr>
                                <th className="text-start px-2 py-1.5 font-medium">
                                  {t("projects.time")}
                                </th>
                                <th className="text-start px-2 py-1.5 font-medium">
                                  {t("projects.modeLabel")}
                                </th>
                                <th className="text-start px-2 py-1.5 font-medium">
                                  {t("common.status")}
                                </th>
                                <th className="text-start px-2 py-1.5 font-medium">
                                  {t("projects.rows")}
                                </th>
                                <th className="text-start px-2 py-1.5 font-medium">
                                  {t("projects.result")}
                                </th>
                                <th className="text-start px-2 py-1.5 font-medium">
                                  {t("projects.file")}
                                </th>
                                <th className="text-start px-2 py-1.5 font-medium">
                                  {t("projects.actions")}
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredImportHistory.map((run) => (
                                <tr
                                  id={`import-run-${run.id}`}
                                  key={run.id}
                                  className={cn(
                                    "row-hover border-t border-border",
                                    focusedImportRunId === run.id &&
                                      "bg-[var(--dmx-accent-tint)]",
                                  )}
                                >
                                  <td className="px-2 py-1.5 whitespace-nowrap">
                                    {formatDateTime(run.created_at)}
                                  </td>
                                  <td className="px-2 py-1.5">{run.mode}</td>
                                  <td className="px-2 py-1.5">
                                    <StatusBadge
                                      status={run.status}
                                      label={tokenLabel(run.status)}
                                      domain="sync"
                                    />
                                  </td>
                                  <td className="px-2 py-1.5">
                                    {run.parsed_rows} / {run.prepared_rows}
                                  </td>
                                  <td className="px-2 py-1.5">
                                    {importRunResultSummary(run)}
                                  </td>
                                  <td
                                    className="px-2 py-1.5 max-w-[220px] truncate"
                                    title={run.source_filename || "-"}
                                  >
                                    {run.source_filename || "-"}
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <div className="flex items-center gap-1">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          openImportRun(
                                            selectedProjectId!,
                                            run.id,
                                          );
                                        }}
                                        className="h-7 px-2 text-[11px]"
                                      >
                                        {t("projects.view")}
                                      </Button>
                                      {run.retry_available ? (
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            void handleRetryImportRun(run.id);
                                          }}
                                          disabled={!canManageProjectImports || retryingRunId === run.id}
                                          className="h-7 px-2 text-[11px]"
                                        >
                                          {retryingRunId === run.id
                                            ? `${t("projects.retry")}…`
                                            : t("projects.retry")}
                                        </Button>
                                      ) : null}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="mt-3 rounded-lg border border-border bg-surface px-3 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[12px] font-semibold text-text">
                        {t("projects.selectedImportRun")}
                      </div>
                      {focusedImportRunDetails ? (
                        <div className="text-[11px] text-text-secondary">
                          {formatDateTime(focusedImportRunDetails.created_at)}
                        </div>
                      ) : null}
                    </div>
                    {loadingImportRunDetails ? (
                      <div className="mt-2 text-[12px] text-text-secondary">
                        {t("projects.loadingImportRunDetails")}
                      </div>
                    ) : !focusedImportRunDetails ? (
                      <div className="mt-2 text-[12px] text-text-secondary">
                        {t("projects.selectRunHint")}
                      </div>
                    ) : (
                      <div className="mt-2 space-y-3 text-[12px]">
                        <div className="overflow-hidden rounded-lg border border-border bg-surface">
                          <MetricRow
                            label={t("projects.modeLabel")}
                            value={focusedImportRunDetails.mode}
                            barColor="blue"
                          />
                          <MetricRow
                            label={t("common.status")}
                            value={
                              <StatusBadge
                                status={focusedImportRunDetails.status}
                                label={tokenLabel(
                                  focusedImportRunDetails.status,
                                )}
                                domain="sync"
                              />
                            }
                            barColor="green"
                          />
                          <MetricRow
                            label={t("projects.file")}
                            value={
                              <span
                                className="inline-block max-w-[16rem] truncate align-bottom"
                                title={
                                  focusedImportRunDetails.source_filename || "-"
                                }
                              >
                                {focusedImportRunDetails.source_filename || "-"}
                              </span>
                            }
                            barColor="yellow"
                          />
                          <MetricRow
                            label={t("projects.profile")}
                            value={
                              <span className="inline-block max-w-[12rem] truncate align-bottom">
                                {focusedImportRunDetails.mapping_profile
                                  ? importProfileLabel(
                                      focusedImportRunDetails.mapping_profile,
                                    )
                                  : "-"}
                              </span>
                            }
                            barColor="orange"
                          />
                        </div>
                        <div className="text-text-secondary">
                          {t("projects.parsedSummary")
                            .replace(
                              "{parsed}",
                              String(focusedImportRunDetails.parsed_rows),
                            )
                            .replace(
                              "{prepared}",
                              String(focusedImportRunDetails.prepared_rows),
                            )
                            .replace(
                              "{imported}",
                              String(focusedImportRunDetails.imported),
                            )
                            .replace(
                              "{skipped}",
                              String(focusedImportRunDetails.skipped),
                            )
                            .replace(
                              "{wouldPart}",
                              typeof focusedImportRunDetails.would_import ===
                                "number" &&
                                typeof focusedImportRunDetails.would_skip ===
                                  "number"
                                ? t("projects.wouldImportSkip")
                                    .replace(
                                      "{wouldImport}",
                                      String(
                                        focusedImportRunDetails.would_import,
                                      ),
                                    )
                                    .replace(
                                      "{wouldSkip}",
                                      String(
                                        focusedImportRunDetails.would_skip,
                                      ),
                                    )
                                : "",
                            )
                            .replace(
                              "{idempotencyPart}",
                              focusedImportRunDetails.idempotency_hit
                                ? t("projects.idempotencyPart")
                                : "",
                            )}
                        </div>
                        {focusedImportRunDetails.diagnostics
                          ?.strict_required_fields !== undefined &&
                        focusedImportRunDetails.diagnostics
                          ?.strict_required_fields !== null ? (
                          <div className="text-text-secondary">
                            {t("projects.strictRequiredFields").replace(
                              "{value}",
                              focusedImportRunDetails.diagnostics
                                .strict_required_fields
                                ? t("projects.on")
                                : t("projects.off"),
                            )}
                          </div>
                        ) : null}
                        {focusedImportRunDetails.diagnostics
                          ?.missing_required_fields?.length ? (
                          <div className="text-status-problem-fg">
                            {t("projects.missingRequiredFields").replace(
                              "{fields}",
                              focusedImportRunDetails.diagnostics.missing_required_fields.join(
                                ", ",
                              ),
                            )}
                          </div>
                        ) : null}
                        {focusedImportRunDetails.diagnostics?.data_summary ? (
                          <div>
                            <div className="text-text-secondary">
                              {t("projects.runDataSummary")}
                            </div>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {[
                                {
                                  label: t("projects.orders"),
                                  value:
                                    focusedImportRunDetails.diagnostics
                                      .data_summary.unique_order_numbers,
                                },
                                {
                                  label: t("projects.houses"),
                                  value:
                                    focusedImportRunDetails.diagnostics
                                      .data_summary.unique_houses,
                                },
                                {
                                  label: t("projects.floors"),
                                  value:
                                    focusedImportRunDetails.diagnostics
                                      .data_summary.unique_floors,
                                },
                                {
                                  label: t("projects.apartments"),
                                  value:
                                    focusedImportRunDetails.diagnostics
                                      .data_summary.unique_apartments,
                                },
                                {
                                  label: t("projects.locations"),
                                  value:
                                    focusedImportRunDetails.diagnostics
                                      .data_summary.unique_locations,
                                },
                                {
                                  label: t("projects.markings"),
                                  value:
                                    focusedImportRunDetails.diagnostics
                                      .data_summary.unique_markings,
                                },
                              ].map((item) => (
                                <span
                                  key={item.label}
                                  className="rounded-full border border-border bg-surface px-2.5 py-1 text-text"
                                >
                                  {item.label}: {item.value}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        {canViewProjectRates &&
                        (focusedImportRunDetails.diagnostics?.data_summary
                          ?.zero_price_doors || 0) > 0 ? (
                          <div className="rounded-lg border border-status-warning-border bg-status-warning-bg px-2.5 py-2 text-status-warning-fg">
                            {copy(
                              "Zero client price doors: {count}. Check the source price column or default client price before importing.",
                              "Двери с нулевой ценой клиента: {count}. Проверьте колонку цены в файле или цену клиента по умолчанию перед импортом.",
                              "דלתות עם מחיר לקוח אפס: {count}. בדוק את עמודת המחיר בקובץ או מחיר ברירת מחדל לפני הייבוא.",
                            ).replace(
                              "{count}",
                              String(
                                focusedImportRunDetails.diagnostics
                                  ?.data_summary?.zero_price_doors || 0,
                              ),
                            )}
                          </div>
                        ) : null}
                        {renderImportPreviewGroups(
                          focusedImportRunDetails.diagnostics,
                          t("projects.runStructurePreview"),
                        )}
                        {focusedImportRunDetails.diagnostics?.required_fields
                          ?.length ? (
                          <div>
                            <div className="text-text-secondary">
                              {t("projects.requiredColumns")}
                            </div>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {focusedImportRunDetails.diagnostics.required_fields.map(
                                (field) => (
                                  <span
                                    key={field.field_key}
                                    className={cn(
                                      "rounded-full border px-2.5 py-1",
                                      field.found
                                        ? "border-status-ok-border bg-status-ok-bg text-status-ok-fg"
                                        : "border-status-problem-border bg-status-problem-bg text-status-problem-fg",
                                    )}
                                  >
                                    {field.display_name}:{" "}
                                    {field.found
                                      ? t("projects.found")
                                      : t("projects.missing")}
                                  </span>
                                ),
                              )}
                            </div>
                          </div>
                        ) : null}
                        {focusedImportRunDetails.errors.length > 0 ? (
                          <div>
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <div className="text-text-secondary">
                                {t("projects.errorsPreview")}
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  downloadImportErrorsCsv(
                                    focusedImportRunDetails.errors,
                                    `dimax-import-errors-${safeDownloadFilename(
                                      focusedImportRunDetails.source_filename ||
                                        focusedImportRunDetails.id,
                                    )}.csv`,
                                  )
                                }
                                className="h-7 w-full justify-center px-2 text-[11px] sm:w-auto"
                              >
                                <Download
                                  className="mr-1.5 h-3.5 w-3.5"
                                  aria-hidden="true"
                                />
                                {copy(
                                  "Download error report",
                                  "Скачать отчёт ошибок",
                                  "הורד דוח שגיאות",
                                )}
                              </Button>
                            </div>
                            <div className="mt-1 space-y-1">
                              {focusedImportRunDetails.errors
                                .slice(0, 5)
                                .map((errorItem) => (
                                  <div
                                    key={`${errorItem.row}-${errorItem.message}`}
                                    className="rounded-lg border border-status-problem-border bg-status-problem-bg px-2 py-1 text-status-problem-fg"
                                  >
                                    {t("projects.rowError")
                                      .replace("{row}", String(errorItem.row))
                                      .replace("{message}", errorItem.message)}
                                  </div>
                                ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-text-secondary">
                            {t("projects.noRowErrors")}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </WidgetCard>

                <div
                  id="project-door-matrix"
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
                        label: copy("Activity", "Активность", "פעילות"),
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

                  <div className="grid grid-cols-1 md:grid-cols-5 xl:grid-cols-9 gap-2 mb-3">
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
                          {value}
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
                      onClick={() => {
                        setMatrixOrderNumber("all");
                        setMatrixHouse("all");
                        setMatrixFloor("all");
                        setMatrixLocation("all");
                        setMatrixDoorType("all");
                        setMatrixStatus("all");
                        setMatrixIssueFilter("all");
                        setMatrixApartmentSearch("");
                        setMatrixMarkingSearch("");
                      }}
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
                                    loadingReasons || doorStatusAction !== null
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
                              {activeReasons.length === 0 && !loadingReasons ? (
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
                          {filteredDoorIds.length > 0
                            ? ` / ${filteredDoorIds.length}`
                            : ""}
                        </div>
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
                            bulkAssignLoading || selectedDoorIds.length === 0
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
                            !bulkAssignInstallerId
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
                                  <div className="grid grid-cols-[repeat(auto-fill,minmax(42px,1fr))] gap-1.5">
                                    {floorDoors.map(({ apartment, cell, door }) => (
                                      <button
                                            key={`${house.house_number}-${floor.floor_label}-${apartment.apartment_number}-${cell.location_code}-${door.door_id}-tile`}
                                            type="button"
                                            aria-pressed={selectedDoorIdSet.has(
                                              door.door_id,
                                            )}
                                            aria-label={copy(
                                              "Inspect door {door}",
                                              "Открыть дверь {door}",
                                              "פתח דלת {door}",
                                            ).replace(
                                              "{door}",
                                              door.door_marking,
                                            )}
                                            title={`${door.door_marking} · ${tokenLabel(
                                              door.status,
                                            )} · ${apartment.apartment_number} · ${locationLabel(
                                              cell.location_code,
                                            )}`}
                                            onClick={() =>
                                              setFocusedDoorId(door.door_id)
                                            }
                                            onDoubleClick={() =>
                                              toggleDoorSelection(door.door_id)
                                            }
                                            className={cn(
                                              "relative flex aspect-square min-h-10 items-center justify-center rounded-md border px-1 text-[11px] font-medium leading-none tabular-nums transition-transform hover:-translate-y-0.5 hover:ring-2 hover:ring-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35",
                                              matrixDoorTileTone(door),
                                              focusedDoorId === door.door_id &&
                                                "shadow-[0_0_0_2px_var(--dmx-accent)]",
                                              selectedDoorIdSet.has(
                                                door.door_id,
                                              ) &&
                                                "shadow-[0_0_0_2px_var(--dmx-text)]",
                                            )}
                                          >
                                            <LtrText
                                              as="span"
                                              className="truncate"
                                            >
                                              {matrixDoorTileLabel(door)}
                                            </LtrText>
                                            {door.issue_count > 0 ? (
                                              <span
                                                className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-surface bg-kpi-red"
                                                aria-hidden="true"
                                              />
                                            ) : null}
                                      </button>
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

                  <div className="mt-4 overflow-hidden rounded-lg border border-border bg-surface">
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
                        filteredMatrixRows.map((row) => (
                          <article
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
                          </article>
                        ))
                      )}
                    </div>
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
                            filteredMatrixRows.map((row) => (
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
                  <details
                    data-testid="project-import-layout-check"
                    className="overflow-hidden border-t border-border-subtle"
                  >
                    <summary className="flex cursor-pointer list-none flex-col gap-3 border-b border-border bg-surface px-4 py-3 marker:hidden md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0">
                        <div className={projectsMetricLabelClass}>
                          {copy(
                            "Import layout check",
                            "Проверка раскладки импорта",
                            "בדיקת פריסת יבוא",
                          )}
                        </div>
                        <div className="mt-1 text-[13px] font-semibold text-text">
                          {copy(
                            "Grouped source layout",
                            "Группировка исходной раскладки",
                            "פריסת מקור מקובצת",
                          )}
                        </div>
                        <div className="mt-1 max-w-3xl text-[11.5px] leading-5 text-text-secondary">
                          {copy(
                            "Use this only to verify Excel/import grouping. Daily control lives in the door matrix and audit ledger above.",
                            "Используйте этот блок только для сверки группировки Excel/импорта. Ежедневное управление находится выше: матрица дверей и реестр контроля.",
                            "השתמש בבלוק הזה רק לבדיקת קיבוץ Excel/יבוא. השליטה היומית נמצאת למעלה: מטריצת הדלתות ויומן הבקרה.",
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            {
                              label: copy("Floors", "Этажи", "קומות"),
                              value: floorGroups.length,
                            },
                            {
                              label: copy("Groups", "Группы", "קבוצות"),
                              value: layout?.buckets.length || 0,
                            },
                            {
                              label: copy("Doors", "Двери", "דלתות"),
                              value: layout?.total_doors || 0,
                            },
                          ].map((item) => (
                            <span
                              key={item.label}
                              className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-subtle px-2.5 py-1 text-[11px] text-text"
                            >
                              <span>{item.label}</span>
                              <LtrText as="span">{item.value}</LtrText>
                            </span>
                          ))}
                        </div>
                        <ChevronDown
                          className="h-4 w-4 text-text-secondary"
                          aria-hidden="true"
                        />
                      </div>
                    </summary>
                    <div className="space-y-4 bg-surface-subtle p-4">
                      {floorGroups.map((group) => (
                    <WidgetCard
                      key={group.floor}
                      title={String(group.floor)}
                      headerMeta={
                        <>
                          {t("projects.doorsCount").replace(
                            "{count}",
                            String(group.total),
                          )}
                        </>
                      }
                    >
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {group.buckets.map((bucket, idx) => (
                          <article
                            key={`${group.floor}-${idx}`}
                            className="rounded-lg border border-border bg-surface p-3"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="text-[12px] text-text-secondary">
                                  {copy(
                                    "Order Number",
                                    "Номер заказа",
                                    "מספר הזמנה",
                                  )}{" "}
                                  {bucket.order_number || "-"} |{" "}
                                  {t("projects.houseLabel")}{" "}
                                  {bucket.house_number || "-"}
                                </div>
                                <div className="text-[13px] font-semibold mt-0.5 text-text">
                                  {(
                                    bucket.location_code || "unknown"
                                  ).toUpperCase()}
                                  {bucket.door_marking
                                    ? ` / ${bucket.door_marking}`
                                    : ""}
                                </div>
                              </div>
                              <div className="rounded-full border border-border bg-surface-subtle px-2.5 py-1 text-[12px] text-text">
                                {bucket.total}
                              </div>
                            </div>

                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {Object.entries(bucket.status_breakdown).map(
                                ([status, count]) => (
                                  <StatusBadge
                                    key={status}
                                    status={status}
                                    label={`${tokenLabel(status)}: ${count}`}
                                    domain="door"
                                  />
                                ),
                              )}
                            </div>

                            <div className="mt-3 divide-y divide-border-subtle overflow-hidden rounded-lg border border-border bg-surface md:hidden">
                              {bucket.doors.map((door) => (
                                <div
                                  key={`${door.id}-mobile`}
                                  className="px-3 py-2.5"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className={projectsMetricLabelClass}>
                                        {t("projects.apt")}
                                      </div>
                                      <div className="mt-1 truncate text-[12px] font-semibold text-text">
                                        {door.apartment_number || "-"}
                                      </div>
                                    </div>
                                    <StatusBadge
                                      status={door.status}
                                      label={tokenLabel(door.status)}
                                      domain="door"
                                    />
                                  </div>
                                  <div className="mt-2 rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                                    <div className={projectsMetricLabelClass}>
                                      {t("projects.unit")}
                                    </div>
                                    <div className="mt-1 truncate text-[12px] font-medium text-text">
                                      {door.unit_label}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="mt-3 hidden overflow-hidden rounded-lg border border-border bg-surface md:block">
                              <table className="min-w-[760px] w-full text-[12px] leading-5">
                                <thead className="bg-surface-subtle text-text-secondary">
                                  <tr>
                                    <th className="text-start px-2 py-1.5 font-medium">
                                      {t("projects.apt")}
                                    </th>
                                    <th className="text-start px-2 py-1.5 font-medium">
                                      {t("projects.unit")}
                                    </th>
                                    <th className="text-start px-2 py-1.5 font-medium">
                                      {t("common.status")}
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {bucket.doors.map((door) => (
                                    <tr
                                      key={door.id}
                                      className="row-hover border-t border-border"
                                    >
                                      <td className="px-2 py-1.5">
                                        {door.apartment_number || "-"}
                                      </td>
                                      <td className="px-2 py-1.5">
                                        {door.unit_label}
                                      </td>
                                      <td className="px-2 py-1.5">
                                        <StatusBadge
                                          status={door.status}
                                          label={tokenLabel(door.status)}
                                          domain="door"
                                        />
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </article>
                        ))}
                      </div>
                    </WidgetCard>
                      ))}
                    </div>
                  </details>
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

      <Dialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen}>
        <DialogContent className="max-w-[920px]">
          <DialogHeader>
            <DialogTitle>
              {projectDialogMode === "create"
                ? copy("Create project", "Создать проект", "צור פרויקט")
                : copy("Edit project", "Редактировать проект", "ערוך פרויקט")}
            </DialogTitle>
            <DialogDescription>
              {copy(
                "Keep one structured project record: core data, site address and developer contact for fast field actions.",
                "Держите одну структурированную карточку проекта: основная информация, адрес объекта и контакт застройщика для быстрых полевых действий.",
                "שמור כרטיס פרויקט אחד ומסודר: נתוני בסיס, כתובת האתר ואיש קשר של היזם לפעולות מהירות בשטח.",
              )}
            </DialogDescription>
          </DialogHeader>

          <Accordion
            type="multiple"
            defaultValue={["main", "address", "contact"]}
            className="w-full"
          >
            <AccordionItem value="main">
              <AccordionTrigger className="text-start">
                {copy("Main information", "Основная информация", "מידע בסיסי")}
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="project-form-code">
                      {copy("Project code", "Код проекта", "קוד פרויקט")}
                    </Label>
                    <Input
                      id="project-form-code"
                      value={projectForm.code}
                      onChange={(event) =>
                        setProjectForm((prev) => ({
                          ...prev,
                          code: event.target.value,
                        }))
                      }
                      placeholder="PRJ-001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project-form-name">
                      {copy("Project name", "Название проекта", "שם הפרויקט")}
                    </Label>
                    <Input
                      id="project-form-name"
                      value={projectForm.name}
                      onChange={(event) =>
                        setProjectForm((prev) => ({
                          ...prev,
                          name: event.target.value,
                        }))
                      }
                      placeholder={copy(
                        "Ashdod Tower A",
                        "Ашдод Тауэр A",
                        "מגדל אשדוד A",
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project-form-start">
                      {copy(
                        "Planned start",
                        "Плановая дата начала",
                        "תאריך התחלה מתוכנן",
                      )}
                    </Label>
                    <Input
                      id="project-form-start"
                      type="date"
                      value={projectForm.planned_start_date}
                      onChange={(event) =>
                        setProjectForm((prev) => ({
                          ...prev,
                          planned_start_date: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project-form-end">
                      {copy(
                        "Planned finish",
                        "Плановая дата завершения",
                        "תאריך סיום מתוכנן",
                      )}
                    </Label>
                    <Input
                      id="project-form-end"
                      type="date"
                      value={projectForm.planned_end_date}
                      onChange={(event) =>
                        setProjectForm((prev) => ({
                          ...prev,
                          planned_end_date: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="project-form-lifecycle">
                      {copy("Lifecycle status", "Статус объекта", "סטטוס הפרויקט")}
                    </Label>
                    <Select
                      value={projectForm.lifecycle_status}
                      onValueChange={(value) =>
                        updateProjectFormField(
                          "lifecycle_status",
                          value as ProjectLifecycleStatus,
                        )
                      }
                    >
                      <SelectTrigger id="project-form-lifecycle">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {([
                          "PLANNED",
                          "ACTIVE",
                          "ON_HOLD",
                          "COMPLETED",
                          "CANCELLED",
                        ] as ProjectLifecycleStatus[]).map((status) => (
                          <SelectItem key={status} value={status}>
                            {tokenLabel(status)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="address">
              <AccordionTrigger className="text-start">
                {copy("Site address", "Адрес объекта", "כתובת האתר")}
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="project-form-address-search">
                      {copy(
                        "Address search / fallback",
                        "Поиск адреса / запасное поле",
                        "חיפוש כתובת / שדה חלופי",
                      )}
                    </Label>
                    <Input
                      id="project-form-address-search"
                      value={projectForm.address}
                      onChange={(event) =>
                        updateProjectFormField("address", event.target.value)
                      }
                      placeholder={copy(
                        "Street, building, city",
                        "Улица, дом, город",
                        "רחוב, בניין, עיר",
                      )}
                    />
                    {loadingProjectAddressSuggestions ||
                    projectAddressSuggestions.length > 0 ? (
                      <div className="rounded-lg border border-border bg-surface-subtle p-3">
                        <div className={projectsMetricLabelClass}>
                          {loadingProjectAddressSuggestions
                            ? copy(
                                "Searching address",
                                "Ищем адрес",
                                "מחפש כתובת",
                              )
                            : copy(
                                "Address suggestions",
                                "Подсказки адреса",
                                "הצעות כתובת",
                              )}
                        </div>
                        {projectAddressSuggestions.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {projectAddressSuggestions.map((suggestion) => (
                              <button
                                key={suggestion.key}
                                type="button"
                                onClick={() =>
                                  applyProjectAddressSuggestion(suggestion)
                                }
                                className="inline-flex min-h-9 items-center rounded-full border border-border bg-surface px-3 text-start text-[12px] font-medium text-text transition-colors hover:bg-surface"
                              >
                                {suggestion.label}
                              </button>
                            ))}
                          </div>
                        ) : loadingProjectAddressSuggestions ? (
                          <div className="mt-3 text-sm text-text-secondary">
                            {copy(
                              "Checking geocoder suggestions…",
                              "Проверяем подсказки геокодера…",
                              "בודק הצעות ממנוע הכתובות…",
                            )}
                          </div>
                        ) : (
                          <div className="mt-3 text-sm text-text-secondary">
                            {copy(
                              "No suggestions found yet. Continue typing or fill the fields manually.",
                              "Подсказки пока не найдены. Продолжайте ввод или заполните поля вручную.",
                              "עדיין לא נמצאו הצעות. המשך להקליד או מלא את השדות ידנית.",
                            )}
                          </div>
                        )}
                        <div className="mt-2 text-xs leading-5 text-text-secondary">
                          {copy(
                            "Choose a suggestion to autofill street, building, city and entrance. Coordinates arrive with the selected suggestion when available.",
                            "Выберите подсказку, чтобы автозаполнить улицу, дом, город и подъезд. Координаты приходят вместе с выбранной подсказкой, если они определены.",
                            "בחר הצעה כדי למלא אוטומטית רחוב, בניין, עיר וכניסה. קואורדינטות מגיעות יחד עם ההצעה שנבחרה כאשר הן זמינות.",
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project-form-street">
                      {copy("Street", "Улица", "רחוב")}
                    </Label>
                    <Input
                      id="project-form-street"
                      value={projectForm.address_street}
                      onChange={(event) =>
                        updateProjectFormField(
                          "address_street",
                          event.target.value,
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project-form-building">
                      {copy("Building", "Дом", "בניין")}
                    </Label>
                    <Input
                      id="project-form-building"
                      value={projectForm.address_building}
                      onChange={(event) =>
                        updateProjectFormField(
                          "address_building",
                          event.target.value,
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project-form-city">
                      {copy("City", "Город", "עיר")}
                    </Label>
                    <Input
                      id="project-form-city"
                      value={projectForm.address_city}
                      onChange={(event) =>
                        updateProjectFormField(
                          "address_city",
                          event.target.value,
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project-form-entrance">
                      {copy("Entrance", "Подъезд / вход", "כניסה")}
                    </Label>
                    <Input
                      id="project-form-entrance"
                      value={projectForm.address_entrance}
                      onChange={(event) =>
                        updateProjectFormField(
                          "address_entrance",
                          event.target.value,
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project-form-lat">{copy("Latitude", "Широта", "קו רוחב")}</Label>
                    <Input
                      id="project-form-lat"
                      value={projectForm.address_lat}
                      onChange={(event) =>
                        updateProjectFormField(
                          "address_lat",
                          event.target.value,
                        )
                      }
                      placeholder="31.2456789"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project-form-lng">{copy("Longitude", "Долгота", "קו אורך")}</Label>
                    <Input
                      id="project-form-lng"
                      value={projectForm.address_lng}
                      onChange={(event) =>
                        updateProjectFormField(
                          "address_lng",
                          event.target.value,
                        )
                      }
                      placeholder="34.7912345"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="project-form-waze">
                      {copy(
                        "Waze URL override",
                        "Ссылка Waze вручную",
                        "קישור Waze ידני",
                      )}
                    </Label>
                    <Input
                      id="project-form-waze"
                      value={projectForm.address_waze_url}
                      onChange={(event) =>
                        updateProjectFormField(
                          "address_waze_url",
                          event.target.value,
                        )
                      }
                      placeholder="https://www.waze.com/ul?..."
                    />
                    {projectFormFieldErrors.address_waze_url ? (
                      <div className="text-xs text-destructive">
                        {projectFormFieldErrors.address_waze_url}
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="flex flex-wrap content-start items-start gap-2">
                    <a
                      href={draftWazeLink || undefined}
                      target="_blank"
                      rel="noreferrer"
                      aria-disabled={!draftWazeLink}
                      className={cn(
                        "inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-[12px] font-medium transition-colors",
                        draftWazeLink
                          ? "border-border-strong bg-surface text-text hover:bg-surface-subtle"
                          : "cursor-not-allowed border-dashed border-border bg-surface-subtle text-text-secondary",
                      )}
                    >
                      <MapPinned className="h-4 w-4" aria-hidden="true" />
                      {copy("Test Waze", "Проверить Waze", "בדוק Waze")}
                    </a>
                    <div className="rounded-lg border border-border bg-surface-subtle px-3 py-2 text-xs text-text-secondary">
                      {buildDraftProjectAddress(projectForm) ||
                        copy(
                          "No address yet",
                          "Адрес пока не заполнен",
                          "הכתובת עדיין לא מולאה",
                        )}
                    </div>
                  </div>
                  <div className="overflow-hidden rounded-lg border border-border bg-surface text-sm">
                    {buildDraftMapPreviewUrl(projectForm) ? (
                      <div className="border-b border-border bg-surface-subtle p-2">
                        <iframe
                          title={copy(
                            "Map preview",
                            "Предпросмотр карты",
                            "תצוגה מקדימה של המפה",
                          )}
                          src={
                            buildDraftMapPreviewUrl(projectForm) || undefined
                          }
                          className="h-36 w-full rounded-lg border border-border bg-surface"
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                        />
                      </div>
                    ) : null}
                    <div className="px-4 py-4">
                      <div className={projectsMetricLabelClass}>
                        {copy(
                          "Route preview",
                          "Предпросмотр маршрута",
                          "תצוגת מסלול",
                        )}
                      </div>
                      <div className="mt-3 font-medium text-text">
                        {buildDraftProjectAddress(projectForm) ||
                          copy(
                            "Awaiting address",
                            "Ждём адрес",
                            "ממתין לכתובת",
                          )}
                      </div>
                      <div className="mt-2 text-xs leading-5 text-text-secondary">
                        {projectForm.address_lat.trim() &&
                        projectForm.address_lng.trim()
                          ? `${copy("Coordinates", "Координаты", "קואורדינטות")}: ${projectForm.address_lat}, ${projectForm.address_lng}`
                          : copy(
                              "No coordinates yet. Choose an address suggestion or fill them manually.",
                              "Координаты пока не заполнены. Выберите подсказку адреса или заполните их вручную.",
                              "עדיין אין קואורדינטות. בחר הצעת כתובת או מלא ידנית.",
                            )}
                      </div>
                      <div className="mt-3 text-xs text-text-secondary">
                        {draftWazeLink
                          ? copy(
                              "Waze link is ready for a quick field check.",
                              "Ссылка Waze готова для быстрой полевой проверки.",
                              "קישור Waze מוכן לבדיקה מהירה בשטח.",
                            )
                          : copy(
                              "Fill address data to unlock navigation.",
                              "Заполните адрес, чтобы включить навигацию.",
                              "מלא נתוני כתובת כדי לפתוח ניווט.",
                            )}
                      </div>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="contact">
              <AccordionTrigger className="text-start">
                {copy(
                  "Developer contact",
                  "Контакты застройщика",
                  "אנשי קשר של היזם",
                )}
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="project-form-dev-company">
                      {copy(
                        "Developer company",
                        "Компания застройщика",
                        "חברת יזם",
                      )}
                    </Label>
                    <Input
                      id="project-form-dev-company"
                      value={projectForm.developer_company}
                      onChange={(event) =>
                        updateProjectFormField(
                          "developer_company",
                          event.target.value,
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project-form-contact-name">
                      {copy("Contact name", "Имя ответственного", "שם איש קשר")}
                    </Label>
                    <Input
                      id="project-form-contact-name"
                      value={projectForm.contact_name}
                      onChange={(event) =>
                        updateProjectFormField(
                          "contact_name",
                          event.target.value,
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project-form-phone">
                      {copy("Primary phone", "Основной телефон", "טלפון ראשי")}
                    </Label>
                    <div className="flex items-center gap-2">
                      <div className="inline-flex h-10 items-center rounded-lg border border-border bg-surface-subtle px-3 text-xs font-medium text-text-secondary">
                        +972
                      </div>
                      <Input
                        id="project-form-phone"
                        value={projectForm.contact_phone}
                        onChange={(event) =>
                          updateProjectFormField(
                            "contact_phone",
                            formatProjectPhoneInput(event.target.value),
                          )
                        }
                        placeholder="+972501234567"
                      />
                    </div>
                    {projectFormFieldErrors.contact_phone ? (
                      <div className="text-xs text-destructive">
                        {projectFormFieldErrors.contact_phone}
                      </div>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project-form-phone-alt">
                      {copy("Alt phone", "Доп. телефон", "טלפון נוסף")}
                    </Label>
                    <div className="flex items-center gap-2">
                      <div className="inline-flex h-10 items-center rounded-lg border border-border bg-surface-subtle px-3 text-xs font-medium text-text-secondary">
                        +972
                      </div>
                      <Input
                        id="project-form-phone-alt"
                        value={projectForm.developer_phone_alt}
                        onChange={(event) =>
                          updateProjectFormField(
                            "developer_phone_alt",
                            formatProjectPhoneInput(event.target.value),
                          )
                        }
                        placeholder="+972501234568"
                      />
                    </div>
                    {projectFormFieldErrors.developer_phone_alt ? (
                      <div className="text-xs text-destructive">
                        {projectFormFieldErrors.developer_phone_alt}
                      </div>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project-form-whatsapp">WhatsApp</Label>
                    <div className="flex items-center gap-2">
                      <div className="inline-flex h-10 items-center rounded-lg border border-border bg-surface-subtle px-3 text-xs font-medium text-text-secondary">
                        +972
                      </div>
                      <Input
                        id="project-form-whatsapp"
                        value={projectForm.developer_whatsapp}
                        onChange={(event) =>
                          updateProjectFormField(
                            "developer_whatsapp",
                            formatProjectPhoneInput(event.target.value),
                          )
                        }
                        placeholder="+972501234569"
                      />
                    </div>
                    {projectFormFieldErrors.developer_whatsapp ? (
                      <div className="text-xs text-destructive">
                        {projectFormFieldErrors.developer_whatsapp}
                      </div>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project-form-email">{copy("Email", "Эл. почта", "דוא״ל")}</Label>
                    <Input
                      id="project-form-email"
                      type="email"
                      value={projectForm.contact_email}
                      onChange={(event) =>
                        updateProjectFormField(
                          "contact_email",
                          event.target.value,
                        )
                      }
                      placeholder="contact@example.com"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="project-form-notes">
                      {copy("Notes", "Заметки", "הערות")}
                    </Label>
                    <textarea
                      id="project-form-notes"
                      value={projectForm.developer_notes}
                      onChange={(event) =>
                        updateProjectFormField(
                          "developer_notes",
                          event.target.value,
                        )
                      }
                      className="control-textarea min-h-[110px] w-full"
                      placeholder={copy(
                        "Access rules, gate, working hours, site notes",
                        "Пропуск, ворота, режим работы, заметки по объекту",
                        "כללי כניסה, שער, שעות עבודה, הערות אתר",
                      )}
                    />
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap content-start items-start gap-2">
                  <a
                    href={draftWhatsappLink || undefined}
                    target="_blank"
                    rel="noreferrer"
                    aria-disabled={!draftWhatsappLink}
                    className={cn(
                      "inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-[12px] font-medium transition-colors",
                      draftWhatsappLink
                        ? "border-border-strong bg-surface text-text hover:bg-surface-subtle"
                        : "cursor-not-allowed border-dashed border-border bg-surface-subtle text-text-secondary",
                    )}
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                    {copy(
                      "Test WhatsApp",
                      "Проверить WhatsApp",
                      "בדוק WhatsApp",
                    )}
                  </a>
                  <a
                    href={draftCallLink || undefined}
                    aria-disabled={!draftCallLink}
                    className={cn(
                      "inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-[12px] font-medium transition-colors",
                      draftCallLink
                        ? "border-border-strong bg-surface text-text hover:bg-surface-subtle"
                        : "cursor-not-allowed border-dashed border-border bg-surface-subtle text-text-secondary",
                    )}
                  >
                    <Phone className="h-4 w-4" aria-hidden="true" />
                    {copy("Test call", "Проверить звонок", "בדוק שיחה")}
                  </a>
                  {!projectForm.contact_name.trim() &&
                  !projectForm.contact_phone.trim() &&
                  !projectForm.developer_whatsapp.trim() ? (
                    <div className="rounded-lg border border-status-warning-border bg-status-warning-bg px-3 py-2 text-xs text-status-warning-fg">
                      {copy(
                        "Add contacts to unlock quick field actions.",
                        "Добавьте контакты, чтобы включить быстрые полевые действия.",
                        "הוסף אנשי קשר כדי להפעיל פעולות שטח מהירות.",
                      )}
                    </div>
                  ) : null}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setProjectDialogOpen(false)}
              disabled={projectSubmitting}
            >
              {copy("Cancel", "Отмена", "ביטול")}
            </Button>
            <Button
              onClick={() => void handleProjectSubmit()}
              disabled={projectSubmitting}
            >
              {projectSubmitting
                ? copy("Saving...", "Сохраняем...", "שומר...")
                : projectDialogMode === "create"
                  ? copy("Create project", "Создать проект", "צור פרויקט")
                  : copy("Save changes", "Сохранить изменения", "שמור שינויים")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={urgencyDialogOpen} onOpenChange={setUrgencyDialogOpen}>
        <DialogContent className="max-w-[760px]">
          <DialogHeader>
            <DialogTitle>
              {copy(
                "Add urgency surcharge",
                "Добавить срочную надбавку",
                "הוסף תוספת דחיפות",
              )}
            </DialogTitle>
            <DialogDescription>
              {copy(
                "Record one approved urgency uplift row for this project or for a specific order number.",
                "Зафиксируйте одну утверждённую строку срочной надбавки для проекта или конкретного номера заказа.",
                "רשום שורת תוספת דחיפות מאושרת אחת לפרויקט או למספר הזמנה מסוים.",
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="urgency-scope">
                {copy("Scope", "Объём работ", "היקף עבודה")}
              </Label>
              <select
                id="urgency-scope"
                value={urgencyForm.scope}
                onChange={(event) =>
                  setUrgencyForm((prev) => ({
                    ...prev,
                    scope:
                      event.target.value === "ORDER_NUMBER"
                        ? "ORDER_NUMBER"
                        : "PROJECT",
                    order_number:
                      event.target.value === "ORDER_NUMBER"
                        ? prev.order_number
                        : "",
                  }))
                }
                className="control-input"
              >
                <option value="PROJECT">
                  {copy("Project", "Проект", "פרויקט")}
                </option>
                <option value="ORDER_NUMBER">
                  {copy("Order number", "Номер заказа", "מספר הזמנה")}
                </option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="urgency-order">
                {copy("Order number", "Номер заказа", "מספר הזמנה")}
              </Label>
              <Input
                id="urgency-order"
                value={urgencyForm.order_number}
                onChange={(event) =>
                  setUrgencyForm((prev) => ({
                    ...prev,
                    order_number: event.target.value,
                  }))
                }
                disabled={urgencyForm.scope !== "ORDER_NUMBER"}
                placeholder="AZ-5001"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="urgency-reason">
                {copy("Reason", "Причина", "סיבה")}
              </Label>
              <Input
                id="urgency-reason"
                value={urgencyForm.reason}
                onChange={(event) =>
                  setUrgencyForm((prev) => ({
                    ...prev,
                    reason: event.target.value,
                  }))
                }
                placeholder={copy(
                  "Late-night urgent install",
                  "Срочный ночной монтаж",
                  "התקנה דחופה בלילה",
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="urgency-client">
                {copy("Client amount", "Сумма клиента", "סכום לקוח")}
              </Label>
              <Input
                id="urgency-client"
                value={urgencyForm.client_amount}
                onChange={(event) =>
                  setUrgencyForm((prev) => ({
                    ...prev,
                    client_amount: event.target.value,
                  }))
                }
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="urgency-installer">
                {copy("Installer amount", "Сумма монтажника", "סכום מתקין")}
              </Label>
              <Input
                id="urgency-installer"
                value={urgencyForm.installer_amount}
                onChange={(event) =>
                  setUrgencyForm((prev) => ({
                    ...prev,
                    installer_amount: event.target.value,
                  }))
                }
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="urgency-effective">
                {copy("Effective date", "Дата действия", "תאריך תחולה")}
              </Label>
              <Input
                id="urgency-effective"
                type="date"
                value={urgencyForm.effective_date}
                onChange={(event) =>
                  setUrgencyForm((prev) => ({
                    ...prev,
                    effective_date: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="urgency-notes">
                {copy("Notes", "Примечание", "הערה")}
              </Label>
              <Input
                id="urgency-notes"
                value={urgencyForm.notes}
                onChange={(event) =>
                  setUrgencyForm((prev) => ({
                    ...prev,
                    notes: event.target.value,
                  }))
                }
                placeholder={copy(
                  "Approval note",
                  "Комментарий по согласованию",
                  "הערת אישור",
                )}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUrgencyDialogOpen(false)}
              disabled={urgencySubmitting}
            >
              {copy("Cancel", "Отмена", "ביטול")}
            </Button>
            <Button
              onClick={() => void handleUrgencySubmit()}
              disabled={urgencySubmitting}
            >
              {urgencySubmitting
                ? copy("Saving...", "Сохраняем...", "שומר...")
                : copy("Save surcharge", "Сохранить надбавку", "שמור תוספת")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={additionalWorkDialogOpen}
        onOpenChange={setAdditionalWorkDialogOpen}
      >
        <DialogContent className="max-w-[760px]">
          <DialogHeader>
            <DialogTitle>
              {copy(
                "Add additional work",
                "Добавить доп. работу",
                "הוסף עבודה נוספת",
              )}
            </DialogTitle>
            <DialogDescription>
              {copy(
                "Create one planned add-on line for the selected project. Installers will later record facts against this plan.",
                "Создайте одну плановую строку доп. работ для выбранного проекта. Позже монтажники будут фиксировать факты по этому плану.",
                "צור שורת תוספת מתוכננת אחת עבור הפרויקט שנבחר. מתקינים ירשמו מאוחר יותר עובדות נגד תוכנית זו.",
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="additional-work-type">
                {copy("Add-on type", "Тип доп. работы", "סוג עבודה נוספת")}
              </Label>
              <select
                id="additional-work-type"
                value={additionalWorkForm.addon_type_id}
                onChange={(event) =>
                  setAdditionalWorkForm((prev) => ({
                    ...prev,
                    addon_type_id: event.target.value,
                  }))
                }
                className="control-input"
              >
                <option value="">
                  {copy(
                    "Choose add-on",
                    "Выберите доп. работу",
                    "בחר עבודה נוספת",
                  )}
                </option>
                {activeAddonTypes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} {item.unit ? `(${item.unit})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="additional-work-qty">
                {copy("Qty planned", "Плановое количество", "כמות מתוכננת")}
              </Label>
              <Input
                id="additional-work-qty"
                value={additionalWorkForm.qty_planned}
                onChange={(event) =>
                  setAdditionalWorkForm((prev) => ({
                    ...prev,
                    qty_planned: event.target.value,
                  }))
                }
                placeholder="1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="additional-work-client-price">
                {copy("Client price", "Цена клиента", "מחיר לקוח")}
              </Label>
              <Input
                id="additional-work-client-price"
                value={additionalWorkForm.client_price}
                onChange={(event) =>
                  setAdditionalWorkForm((prev) => ({
                    ...prev,
                    client_price: event.target.value,
                  }))
                }
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="additional-work-installer-price">
                {copy("Installer price", "Цена монтажника", "מחיר מתקין")}
              </Label>
              <Input
                id="additional-work-installer-price"
                value={additionalWorkForm.installer_price}
                onChange={(event) =>
                  setAdditionalWorkForm((prev) => ({
                    ...prev,
                    installer_price: event.target.value,
                  }))
                }
                placeholder="0"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="additional-work-notes">
                {copy("Notes", "Примечание", "הערה")}
              </Label>
              <Input
                id="additional-work-notes"
                value={additionalWorkForm.notes}
                onChange={(event) =>
                  setAdditionalWorkForm((prev) => ({
                    ...prev,
                    notes: event.target.value,
                  }))
                }
                placeholder={copy(
                  "Optional planning note",
                  "Необязательная заметка",
                  "הערת תכנון אופציונלית",
                )}
              />
            </div>
          </div>

          <div className="text-[12px] text-text-secondary">
            {selectedAddonType
              ? copy(
                  `Selected unit: ${selectedAddonType.unit || "-"}`,
                  `Выбранная единица: ${selectedAddonType.unit || "-"}`,
                  `יחידת המדידה שנבחרה: ${selectedAddonType.unit || "-"}`,
                )
              : copy(
                  "Select an add-on type to confirm unit and pricing row.",
                  "Выберите тип доп. работы, чтобы подтвердить единицу и ценовую строку.",
                  "בחר סוג עבודה נוספת כדי לאשר יחידה ושורת תמחור.",
                )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAdditionalWorkDialogOpen(false)}
              disabled={additionalWorkSubmitting}
            >
              {copy("Cancel", "Отмена", "ביטול")}
            </Button>
            <Button
              onClick={() => void handleAdditionalWorkSubmit()}
              disabled={additionalWorkSubmitting}
            >
              {additionalWorkSubmitting
                ? copy("Saving...", "Сохраняем...", "שומר...")
                : copy(
                    "Save additional work",
                    "Сохранить доп. работу",
                    "שמור עבודה נוספת",
                  )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              disabled={manualDoorSubmitting}
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
