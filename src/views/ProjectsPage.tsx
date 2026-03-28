import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  FileSpreadsheet,
  FilterX,
  Layers3,
  MapPinned,
  MessageCircle,
  Phone,
  Plus,
  PencilLine,
  RefreshCw,
  Search,
  Upload,
} from "lucide-react";

import { DashboardLayout } from "@/components/DashboardLayout";
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
import { ApiError, apiFetch } from "@/lib/api";
import { readableApiError } from "@/lib/api-error-display";
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
  code?: string | null;
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
  code?: string | null;
  address?: string;
  planned_start_date?: string | null;
  planned_end_date?: string | null;
  status?: string;
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
  Record<"contact_phone" | "developer_phone_alt" | "developer_whatsapp" | "address_waze_url", string>
>;

type DoorType = {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
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
  { lat: "31.2518", lng: "34.7915", aliases: ["ashkelon", "אשקלון", "ашкелон"] },
  { lat: "31.7683", lng: "35.2137", aliases: ["jerusalem", "ירושלים", "иерусалим"] },
  { lat: "32.0853", lng: "34.7818", aliases: ["tel aviv", "tel-aviv", "תל אביב", "тель авив"] },
  { lat: "32.7940", lng: "34.9896", aliases: ["haifa", "חיפה", "хайфа"] },
  { lat: "31.9980", lng: "34.7320", aliases: ["rishon lezion", "ראשון לציון", "ришон лецион"] },
  { lat: "32.3215", lng: "34.8532", aliases: ["netanya", "נתניה", "нетания"] },
  { lat: "31.2520", lng: "34.7913", aliases: ["beer sheva", "be'er sheva", "באר שבע", "беэр шева"] },
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
  const base = structured.length > 0 ? structured.join(", ") : form.address.trim();
  if (!base) {
    return "";
  }
  return form.address_entrance.trim() ? `${base}, ${form.address_entrance.trim()}` : base;
}

function buildDraftWazeLink(form: ProjectFormState): string | null {
  if (form.address_waze_url.trim()) {
    return form.address_waze_url.trim();
  }
  if (form.address_lat.trim() && form.address_lng.trim()) {
    return `https://www.waze.com/ul?ll=${encodeURIComponent(form.address_lat.trim())},${encodeURIComponent(form.address_lng.trim())}&navigate=yes`;
  }
  const address = buildDraftProjectAddress(form);
  if (!address) {
    return null;
  }
  return `https://www.waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`;
}

function buildDraftWhatsappLink(form: ProjectFormState): string | null {
  const phone = normalizeDraftPhone(form.developer_whatsapp || form.contact_phone);
  if (!phone) {
    return null;
  }
  const message = [form.code.trim(), form.name.trim()].filter(Boolean).join(" · ");
  const waPhone = phone.replace("+", "");
  return message ? `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}` : `https://wa.me/${waPhone}`;
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
  locale: Locale
): string {
  const copyByField: Record<keyof ProjectFormFieldErrors, Record<Locale, string>> = {
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

function lookupProjectCityCoords(city: string): { lat: string; lng: string } | null {
  const normalized = city.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  const match = PROJECT_CITY_COORDS.find((item) =>
    item.aliases.some((alias) => normalized.includes(alias))
  );
  return match ? { lat: match.lat, lng: match.lng } : null;
}

function buildProjectAddressSuggestions(raw: string): ProjectAddressSuggestion[] {
  const value = raw.trim();
  if (value.length < 3) {
    return [];
  }

  const suggestions: ProjectAddressSuggestion[] = [];
  const seen = new Set<string>();

  const pushSuggestion = (street: string, building: string, city: string, entrance: string) => {
    const normalizedStreet = street.trim();
    const normalizedBuilding = building.trim();
    const normalizedCity = city.trim();
    const normalizedEntrance = entrance.trim();
    if (!normalizedStreet && !normalizedCity) {
      return;
    }
    const label = [normalizedStreet, normalizedBuilding, normalizedCity, normalizedEntrance]
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

  const commaParts = value.split(",").map((part) => part.trim()).filter(Boolean);
  if (commaParts.length >= 3) {
    pushSuggestion(
      commaParts[0] || "",
      commaParts[1] || "",
      commaParts[2] || "",
      commaParts.slice(3).join(", ")
    );
  }

  const compactMatch = value.match(
    /^(.+?)\s+(\d+[A-Za-zА-Яа-я\-\/]*)\s+([A-Za-z\u0590-\u05FF\u0400-\u04FF][A-Za-z\u0590-\u05FF\u0400-\u04FF\s-]*?)(?:\s+([A-Za-z0-9\u0590-\u05FF\u0400-\u04FF-]+))?$/u
  );
  if (compactMatch) {
    pushSuggestion(
      compactMatch[1] || "",
      compactMatch[2] || "",
      compactMatch[3] || "",
      compactMatch[4] || ""
    );
  }

  if (suggestions.length === 0) {
    pushSuggestion(value, "", "", "");
  }

  return suggestions;
}

function projectFormFromDetails(details: ProjectDetailsResponse | null): ProjectFormState {
  return {
    code: details?.code || "",
    name: details?.name || "",
    planned_start_date: details?.planned_start_date || "",
    planned_end_date: details?.planned_end_date || "",
    address: details?.address || "",
    address_street: details?.address_street || "",
    address_building: details?.address_building || "",
    address_city: details?.address_city || "",
    address_entrance: details?.address_entrance || "",
    address_lat: details?.address_lat != null ? String(details.address_lat) : "",
    address_lng: details?.address_lng != null ? String(details.address_lng) : "",
    address_waze_url: details?.address_waze_url || "",
    developer_company: details?.developer_company || "",
    contact_name: details?.contact_name || "",
    contact_phone: details?.contact_phone || "",
    developer_phone_alt: details?.developer_phone_alt || "",
    developer_whatsapp: details?.developer_whatsapp || "",
    contact_email: details?.contact_email || "",
    developer_notes: details?.developer_notes || "",
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
  const copy = (en: string, ru: string, he: string) =>
    locale === "ru" ? ru : locale === "he" ? he : en;
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
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [doorTypes, setDoorTypes] = useState<DoorType[]>([]);
  const [libraryProducts, setLibraryProducts] = useState<LibraryProductItem[]>([]);
  const [installers, setInstallers] = useState<InstallerListItem[]>([]);
  const [addonTypes, setAddonTypes] = useState<AddonTypeItem[]>([]);
  const [projectAddonPlan, setProjectAddonPlan] = useState<ProjectAddonPlanItem[]>([]);
  const [urgencySurcharges, setUrgencySurcharges] = useState<UrgencySurchargeItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectDetails, setProjectDetails] = useState<ProjectDetailsResponse | null>(null);
  const [layout, setLayout] = useState<ProjectDoorsLayoutResponse | null>(null);
  const [projectPlanFact, setProjectPlanFact] = useState<ProjectPlanFactResponse | null>(null);
  const [projectRisk, setProjectRisk] = useState<ProjectRiskDrilldownResponse | null>(null);
  const [search, setSearch] = useState("");
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingDoorTypes, setLoadingDoorTypes] = useState(false);
  const [loadingLibraryProducts, setLoadingLibraryProducts] = useState(false);
  const [loadingInstallers, setLoadingInstallers] = useState(false);
  const [loadingAddonTypes, setLoadingAddonTypes] = useState(false);
  const [loadingProjectAddonPlan, setLoadingProjectAddonPlan] = useState(false);
  const [loadingUrgencySurcharges, setLoadingUrgencySurcharges] = useState(false);
  const [loadingProjectDetails, setLoadingProjectDetails] = useState(false);
  const [loadingLayout, setLoadingLayout] = useState(false);
  const [loadingProjectPlanFact, setLoadingProjectPlanFact] = useState(false);
  const [loadingProjectRisk, setLoadingProjectRisk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectFlowNotice, setProjectFlowNotice] = useState<string | null>(null);
  const [projectActionHint, setProjectActionHint] = useState<string | null>(null);
  const quickActionCopyTimeoutRef = useRef<number | null>(null);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [projectDialogMode, setProjectDialogMode] = useState<"create" | "edit">("create");
  const [projectForm, setProjectForm] = useState<ProjectFormState>(emptyProjectForm());
  const [projectFormFieldErrors, setProjectFormFieldErrors] = useState<ProjectFormFieldErrors>({});
  const [projectSubmitting, setProjectSubmitting] = useState(false);
  const [manualDoorDialogOpen, setManualDoorDialogOpen] = useState(false);
  const [manualDoorForm, setManualDoorForm] = useState<ManualDoorFormState>(emptyManualDoorForm());
  const [manualDoorSubmitting, setManualDoorSubmitting] = useState(false);
  const [additionalWorkDialogOpen, setAdditionalWorkDialogOpen] = useState(false);
  const [additionalWorkForm, setAdditionalWorkForm] = useState<AdditionalWorkFormState>(emptyAdditionalWorkForm());
  const [additionalWorkSubmitting, setAdditionalWorkSubmitting] = useState(false);
  const [urgencyDialogOpen, setUrgencyDialogOpen] = useState(false);
  const [urgencyForm, setUrgencyForm] = useState<UrgencySurchargeFormState>(emptyUrgencySurchargeForm());
  const [urgencySubmitting, setUrgencySubmitting] = useState(false);

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
  const [projectAddressSuggestions, setProjectAddressSuggestions] = useState<ProjectAddressSuggestion[]>([]);
  const [loadingProjectAddressSuggestions, setLoadingProjectAddressSuggestions] = useState(false);
  const [deepLinkFocusApplied, setDeepLinkFocusApplied] = useState(false);
  const [matrixHouse, setMatrixHouse] = useState("all");
  const [matrixOrderNumber, setMatrixOrderNumber] = useState("all");
  const [matrixFloor, setMatrixFloor] = useState("all");
  const [matrixLocation, setMatrixLocation] = useState("all");
  const [matrixDoorType, setMatrixDoorType] = useState("all");
  const [matrixStatus, setMatrixStatus] = useState("all");
  const [matrixApartmentSearch, setMatrixApartmentSearch] = useState("");
  const [matrixMarkingSearch, setMatrixMarkingSearch] = useState("");

  const deepLinkProjectId = (searchParams?.get("project_id") || "").trim();
  const deepLinkFocusSection = (searchParams?.get("focus_section") || "").trim().toLowerCase();
  const deepLinkOrderNumber = (searchParams?.get("order_number") || "").trim();
  const focusedSectionLabel =
    deepLinkFocusSection === "doors"
      ? "Doors"
      : deepLinkFocusSection === "addons"
        ? "Additional works"
        : deepLinkFocusSection === "urgency"
          ? "Urgency surcharge"
          : "";
  const deepLinkLibraryProductId = (searchParams?.get("library_product_id") || "").trim();
  const deepLinkLibraryInstallType = (searchParams?.get("library_install_type") || "").trim();
  const deepLinkFailedIds = useMemo(
    () => parseIdsCsv(searchParams?.get("failed_project_ids") || null),
    [searchParams]
  );
  const deepLinkOnlyFailed = searchParams?.get("only_failed_runs") === "1";
  const [deepLinkDoorFlowApplied, setDeepLinkDoorFlowApplied] = useState(false);
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
  const activeLibraryProducts = useMemo(
    () => libraryProducts.filter((item) => item.status === "ACTIVE"),
    [libraryProducts]
  );
  const activeInstallers = useMemo(
    () => installers.filter((item) => item.is_active && item.status !== "ARCHIVED"),
    [installers]
  );
  const selectedLibraryProduct = useMemo(
    () => activeLibraryProducts.find((item) => item.id === manualDoorForm.product_id) || null,
    [activeLibraryProducts, manualDoorForm.product_id]
  );
  const activeAddonTypes = useMemo(
    () => addonTypes.filter((item) => item.status !== "ARCHIVED"),
    [addonTypes]
  );
  const selectedAddonType = useMemo(
    () => activeAddonTypes.find((item) => item.id === additionalWorkForm.addon_type_id) || null,
    [activeAddonTypes, additionalWorkForm.addon_type_id]
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
      { rows: 0, qty: 0, client: 0, installer: 0 }
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
      { rows: 0, client: 0, installer: 0, orderScoped: 0 }
    );
  }, [urgencySurcharges]);

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
                <th className="text-left px-2 py-1.5 font-medium">{copy("Locations", "Локации", "מיקומים")}</th>
                <th className="text-left px-2 py-1.5 font-medium">{copy("Doors", "Двери", "דלתות")}</th>
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
      setError(readableApiError(e, locale, t("projects.failedLoadProjects")));
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
      setError(readableApiError(e, locale, t("projects.failedLoadDoorTypes")));
    } finally {
      setLoadingDoorTypes(false);
    }
  };

  const loadLibraryProducts = async () => {
    setLoadingLibraryProducts(true);
    try {
      const response = await apiFetch<LibraryProductItem[] | { items?: LibraryProductItem[] }>(
        "/api/v1/admin/library?status=ACTIVE&limit=500"
      );
      setLibraryProducts(Array.isArray(response) ? response : response.items || []);
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
      params.set("limit", "500");
      const response = await apiFetch<InstallerListItem[] | { items?: InstallerListItem[] }>(
        `/api/v1/admin/installers?${params.toString()}`
      );
      setInstallers(Array.isArray(response) ? response : response.items || []);
    } catch {
      setInstallers([]);
    } finally {
      setLoadingInstallers(false);
    }
  };

  const loadAddonTypes = async () => {
    setLoadingAddonTypes(true);
    try {
      const response = await apiFetch<AddonTypeItem[] | { items?: AddonTypeItem[] }>(
        "/api/v1/admin/addons/types?limit=500"
      );
      setAddonTypes(Array.isArray(response) ? response : response.items || []);
    } catch {
      setAddonTypes([]);
    } finally {
      setLoadingAddonTypes(false);
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
      setError(readableApiError(e, locale, t("projects.failedLoadLayout")));
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

  const loadProjectAddonPlan = async (projectId: string) => {
    setLoadingProjectAddonPlan(true);
    try {
      const response = await apiFetch<ProjectAddonPlanItem[] | { items?: ProjectAddonPlanItem[] }>(
        `/api/v1/admin/projects/${projectId}/addons/plan`
      );
      setProjectAddonPlan(Array.isArray(response) ? response : response.items || []);
    } catch {
      setProjectAddonPlan([]);
    } finally {
      setLoadingProjectAddonPlan(false);
    }
  };

  const loadUrgencySurcharges = async (projectId: string) => {
    setLoadingUrgencySurcharges(true);
    try {
      const response = await apiFetch<UrgencySurchargeItem[] | { items?: UrgencySurchargeItem[] }>(
        `/api/v1/admin/projects/${projectId}/urgency-surcharges`
      );
      setUrgencySurcharges(Array.isArray(response) ? response : response.items || []);
    } catch {
      setUrgencySurcharges([]);
    } finally {
      setLoadingUrgencySurcharges(false);
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
    void loadLibraryProducts();
    void loadInstallers();
    void loadAddonTypes();
    void loadMappingProfiles();
    void loadFailedQueue();
  }, []);

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
    if (deepLinkFocusApplied || !selectedProjectId || selectedProjectId !== deepLinkProjectId) {
      return;
    }

    const targetSectionId =
      deepLinkFocusSection === "doors"
        ? "project-door-matrix"
        : deepLinkFocusSection === "addons"
          ? "project-additional-works"
          : deepLinkFocusSection === "urgency"
            ? "project-urgency-surcharge"
            : null;

    if (deepLinkOrderNumber) {
      setMatrixOrderNumber(deepLinkOrderNumber);
    }

    if (!targetSectionId && !deepLinkOrderNumber) {
      return;
    }

    setDeepLinkFocusApplied(true);
    window.setTimeout(() => {
      document.getElementById(targetSectionId || "project-door-matrix")?.scrollIntoView?.({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
  }, [
    deepLinkFocusApplied,
    deepLinkFocusSection,
    deepLinkOrderNumber,
    deepLinkProjectId,
    selectedProjectId,
  ]);

  useEffect(() => {
    if (deepLinkDoorFlowApplied || !selectedProjectId || selectedProjectId !== deepLinkProjectId) {
      return;
    }
    if (deepLinkFocusSection !== "doors") {
      return;
    }
    if (!deepLinkLibraryProductId && !deepLinkLibraryInstallType) {
      return;
    }

    if (deepLinkLibraryProductId && activeLibraryProducts.length > 0) {
      const matchedProduct = activeLibraryProducts.find((item) => item.id === deepLinkLibraryProductId);
      if (!matchedProduct && !deepLinkLibraryInstallType) {
        setDeepLinkDoorFlowApplied(true);
        return;
      }
      setManualDoorForm({
        ...emptyManualDoorForm(),
        product_id: matchedProduct?.id || "",
        install_type: matchedProduct?.install_type || deepLinkLibraryInstallType,
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
      void loadProjectPlanFact(selectedProjectId);
      void loadProjectRisk(selectedProjectId);
      void loadProjectAddonPlan(selectedProjectId);
      void loadUrgencySurcharges(selectedProjectId);
      void loadImportHistory(selectedProjectId);
    } else {
      setProjectDetails(null);
      setProjectPlanFact(null);
      setProjectRisk(null);
      setProjectAddonPlan([]);
      setUrgencySurcharges([]);
      setImportHistory([]);
      setFocusedImportRunDetails(null);
    }
  }, [selectedProjectId, importHistoryModeFilter]);

  useEffect(() => {
    void loadFailedQueue();
  }, [failedQueueOffset, failedQueueOnlySelectedProject, selectedProjectId]);

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
      setError(readableApiError(e, locale, t("projects.failedImportFile")));
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
      setError(readableApiError(e, locale, t("projects.failedReconcileProjects")));
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
      setError(readableApiError(e, locale, t("projects.failedRetryQueueRuns")));
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

  const projectFormPayload = {
    code: projectForm.code.trim() || null,
    name: projectForm.name.trim(),
    planned_start_date: projectForm.planned_start_date || null,
    planned_end_date: projectForm.planned_end_date || null,
    address: projectForm.address.trim(),
    address_street: projectForm.address_street.trim() || null,
    address_building: projectForm.address_building.trim() || null,
    address_city: projectForm.address_city.trim() || null,
    address_entrance: projectForm.address_entrance.trim() || null,
    address_lat: projectForm.address_lat.trim() ? Number(projectForm.address_lat) : null,
    address_lng: projectForm.address_lng.trim() ? Number(projectForm.address_lng) : null,
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
  const draftWhatsappLink = buildDraftWhatsappLink(projectForm);
  const draftCallLink = normalizeDraftPhone(projectForm.contact_phone)
    ? `tel:${normalizeDraftPhone(projectForm.contact_phone)}`
    : null;

  const openCreateProjectDialog = () => {
    setProjectDialogMode("create");
    setProjectForm(emptyProjectForm());
    setProjectFormFieldErrors({});
    setProjectFlowNotice(null);
    setProjectActionHint(null);
    setError(null);
    setProjectDialogOpen(true);
  };

  const openEditProjectDialog = () => {
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

  const applyProjectAddressSuggestion = (suggestion: ProjectAddressSuggestion) => {
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
          "הוסף טלפון ראשי כדי לפתוח חיוג ישיר."
        )
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
          "מספר הטלפון הועתק."
        )
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

  const updateProjectFormField = <K extends keyof ProjectFormState>(
    field: K,
    value: ProjectFormState[K]
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
          `/api/v1/admin/projects/address-suggestions?q=${encodeURIComponent(query)}&limit=5`
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
    if (!projectForm.name.trim()) {
      setError(copy("Project name is required.", "Название проекта обязательно.", "שם הפרויקט הוא שדה חובה."));
      return;
    }

    setProjectSubmitting(true);
    setError(null);
    setProjectFormFieldErrors({});

    try {
      if (projectDialogMode === "create") {
        const response = await apiFetch<{ id: string }>("/api/v1/admin/projects", {
          method: "POST",
          body: JSON.stringify(projectFormPayload),
        });
        await loadProjects();
        setSelectedProjectId(response.id);
        setProjectDialogOpen(false);
        setProjectForm(emptyProjectForm());
        setProjectFlowNotice(
          copy(
            "Project created. Continue with address, contacts and import flow.",
            "Проект создан. Продолжайте с адресом, контактами и импортом.",
            "הפרויקט נוצר. המשך עם כתובת, אנשי קשר וזרימת הייבוא."
          )
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
          "הגדרות הפרויקט עודכנו. פעולות מהירות מוכנות היכן שהנתונים מולאו."
        )
      );
    } catch (e) {
      if (e instanceof ApiError) {
        const fieldFromMeta = typeof e.meta?.field === "string" ? e.meta.field : null;
        const apiField = (e.field || fieldFromMeta) as keyof ProjectFormFieldErrors | undefined;
        if (e.code === "INVALID_PHONE" && apiField && apiField in emptyProjectForm()) {
          setProjectFormFieldErrors((prev) => ({
            ...prev,
            [apiField]: buildProjectFieldErrorCopy(apiField, locale),
          }));
        }
        if (e.code === "INVALID_WAZE_URL") {
          setProjectFormFieldErrors((prev) => ({
            ...prev,
            address_waze_url: buildProjectFieldErrorCopy("address_waze_url", locale),
          }));
        }
      }
      setError(readableApiError(e, locale, copy("Unable to save project settings.", "Не удалось сохранить настройки проекта.", "לא ניתן לשמור את הגדרות הפרויקט.")));
    } finally {
      setProjectSubmitting(false);
    }
  };

  const openManualDoorDialog = () => {
    const nextForm = emptyManualDoorForm();
    setManualDoorForm(nextForm);
    setProjectFlowNotice(null);
    setProjectActionHint(null);
    setError(null);
    setManualDoorDialogOpen(true);
  };

  const handleManualDoorSubmit = async () => {
    if (!selectedProjectId) {
      return;
    }
    const normalizedDoorCode = manualDoorForm.door_code.trim();
    if (!manualDoorForm.product_id || !normalizedDoorCode || !manualDoorForm.unit.trim()) {
      setError(
        copy(
          "Choose a product and fill door code + unit before saving.",
          "Выберите продукт и заполните код двери и unit перед сохранением.",
          "בחר מוצר ומלא קוד דלת ו-unit לפני השמירה."
        )
      );
      return;
    }
    if (existingDoorMarkings.has(normalizedDoorCode.toLowerCase())) {
      setError(
        copy(
          `Door code ${normalizedDoorCode} already exists in this project. Review the matrix before creating another door.`,
          `Код двери ${normalizedDoorCode} уже есть в этом проекте. Проверьте матрицу перед созданием новой двери.`,
          `קוד הדלת ${normalizedDoorCode} כבר קיים בפרויקט הזה. בדוק את המטריצה לפני יצירת דלת נוספת.`
        )
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
          `הדלת ${normalizedDoorCode} נוספה. מטריצת הפרויקט כבר מסוננת לדלת הזו.`
        )
      );
    } catch (e) {
      setError(
        readableApiError(
          e,
          locale,
          copy(
            "Failed to create door.",
            "Не удалось создать дверь.",
            "יצירת הדלת נכשלה."
          )
        )
      );
    } finally {
      setManualDoorSubmitting(false);
    }
  };

  const openAdditionalWorkDialog = () => {
    setAdditionalWorkForm(emptyAdditionalWorkForm());
    setProjectFlowNotice(null);
    setProjectActionHint(null);
    setError(null);
    setAdditionalWorkDialogOpen(true);
  };

  const handleAdditionalWorkSubmit = async () => {
    if (!selectedProjectId) {
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
          "בחר עבודת תוספת ומלא כמות ומחירים לפני השמירה."
        )
      );
      return;
    }
    if (!Number.isFinite(qtyPlanned) || qtyPlanned <= 0 || !Number.isFinite(clientPrice) || clientPrice <= 0 || !Number.isFinite(installerPrice) || installerPrice <= 0) {
      setError(
        copy(
          "Use positive numbers for planned qty and both prices.",
          "Используйте положительные числа для количества и обеих цен.",
          "השתמש במספרים חיוביים לכמות ולשני המחירים."
        )
      );
      return;
    }

    setAdditionalWorkSubmitting(true);
    setError(null);
    try {
      await apiFetch(`/api/v1/admin/projects/${selectedProjectId}/addons/plan`, {
        method: "POST",
        body: JSON.stringify({
          addon_type_id: additionalWorkForm.addon_type_id,
          qty_planned: additionalWorkForm.qty_planned.trim(),
          client_price: additionalWorkForm.client_price.trim(),
          installer_price: additionalWorkForm.installer_price.trim(),
          notes: additionalWorkForm.notes.trim() || null,
        }),
      });
      setAdditionalWorkDialogOpen(false);
      setAdditionalWorkForm(emptyAdditionalWorkForm());
      await loadProjectAddonPlan(selectedProjectId);
      await loadProjectPlanFact(selectedProjectId);
      await loadProjectRisk(selectedProjectId);
      if (typeof document !== "undefined") {
        window.setTimeout(() => {
          document.getElementById("project-additional-works")?.scrollIntoView?.({
            behavior: "smooth",
            block: "start",
          });
        }, 0);
      }
      setProjectFlowNotice(
        copy(
          `${selectedAddonType?.name || "Additional work"} was added to the project plan.`,
          `${selectedAddonType?.name || "Доп. работа"} добавлена в план проекта.`,
          `${selectedAddonType?.name || "עבודה נוספת"} נוספה לתוכנית הפרויקט.`
        )
      );
    } catch (e) {
      setError(
        readableApiError(
          e,
          locale,
          copy(
            "Failed to save additional work plan.",
            "Не удалось сохранить план доп. работ.",
            "שמירת תוכנית עבודות נוספות נכשלה."
          )
        )
      );
    } finally {
      setAdditionalWorkSubmitting(false);
    }
  };

  const openUrgencyDialog = () => {
    setUrgencyForm(emptyUrgencySurchargeForm());
    setProjectFlowNotice(null);
    setProjectActionHint(null);
    setError(null);
    setUrgencyDialogOpen(true);
  };

  const handleUrgencySubmit = async () => {
    if (!selectedProjectId) {
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
          "Заполните причину и обе суммы surcharge. Для surcharge по заказу также нужен номер заказа.",
          "מלא סיבה ושני סכומי surcharge. עבור surcharge לפי הזמנה נדרש גם מספר הזמנה."
        )
      );
      return;
    }
    if (!Number.isFinite(clientAmount) || clientAmount <= 0 || !Number.isFinite(installerAmount) || installerAmount <= 0) {
      setError(
        copy(
          "Use positive amounts for both surcharge values.",
          "Используйте положительные суммы для обеих надбавок.",
          "השתמש בסכומים חיוביים לשתי תוספות הדחיפות."
        )
      );
      return;
    }

    setUrgencySubmitting(true);
    setError(null);
    try {
      await apiFetch(`/api/v1/admin/projects/${selectedProjectId}/urgency-surcharges`, {
        method: "POST",
        body: JSON.stringify({
          scope: urgencyForm.scope,
          order_number: urgencyForm.scope === "ORDER_NUMBER" ? urgencyForm.order_number.trim() : null,
          reason: urgencyForm.reason.trim(),
          client_amount: urgencyForm.client_amount.trim(),
          installer_amount: urgencyForm.installer_amount.trim(),
          effective_date: urgencyForm.effective_date || null,
          notes: urgencyForm.notes.trim() || null,
        }),
      });
      setUrgencyDialogOpen(false);
      setUrgencyForm(emptyUrgencySurchargeForm());
      await loadUrgencySurcharges(selectedProjectId);
      await loadProjectPlanFact(selectedProjectId);
      await loadProjectRisk(selectedProjectId);
      if (urgencyForm.scope === "ORDER_NUMBER" && urgencyForm.order_number.trim()) {
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
          document.getElementById("project-urgency-surcharge")?.scrollIntoView?.({
            behavior: "smooth",
            block: "start",
          });
        }, 0);
      }
      setProjectFlowNotice(
        copy(
          urgencyForm.scope === "ORDER_NUMBER" && urgencyForm.order_number.trim()
            ? `Urgency surcharge for order ${urgencyForm.order_number.trim()} was saved. The project matrix is now filtered to that order.`
            : "Project-level urgency surcharge was saved.",
          urgencyForm.scope === "ORDER_NUMBER" && urgencyForm.order_number.trim()
            ? `Срочная надбавка для заказа ${urgencyForm.order_number.trim()} сохранена. Матрица проекта уже отфильтрована по этому заказу.`
            : "Срочная надбавка уровня проекта сохранена.",
          urgencyForm.scope === "ORDER_NUMBER" && urgencyForm.order_number.trim()
            ? `תוספת הדחיפות להזמנה ${urgencyForm.order_number.trim()} נשמרה. מטריצת הפרויקט כבר מסוננת להזמנה הזו.`
            : "תוספת דחיפות ברמת הפרויקט נשמרה."
        )
      );
    } catch (e) {
      setError(
        readableApiError(
          e,
          locale,
          copy(
            "Failed to save urgency surcharge.",
            "Не удалось сохранить urgency surcharge.",
            "שמירת urgency surcharge נכשלה."
          )
        )
      );
    } finally {
      setUrgencySubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="motion-stagger readability-wrap max-w-[1500px] space-y-6 p-6 lg:p-8">
        <section className="page-hero readability-wrap relative overflow-hidden">
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
              </div>
              {selectedProjectId && selectedProjectId === deepLinkProjectId ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="metric-chip">Focused project {selectedProjectId}</span>
                  {focusedSectionLabel ? (
                    <span className="metric-chip">Focused section {focusedSectionLabel}</span>
                  ) : null}
                  {deepLinkOrderNumber ? (
                    <span className="metric-chip">Order {deepLinkOrderNumber}</span>
                  ) : null}
                  {(focusedSectionLabel || deepLinkOrderNumber) ? (
                    <button
                      type="button"
                      onClick={() => router.push(`/projects?project_id=${selectedProjectId}`)}
                      className="inline-flex items-center rounded-lg border border-border/70 bg-background/75 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                    >
                      Show full project workspace
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => router.push("/projects")}
                    className="inline-flex items-center rounded-lg border border-border/70 bg-background/75 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                  >
                    Show all projects
                  </button>
                </div>
              ) : null}
            </div>
            <div className="surface-subtle min-w-0 max-w-xl space-y-4 p-4 sm:p-5 xl:min-w-[320px]">
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
                  className="btn-premium h-10 rounded-xl px-4 text-[13px] font-medium"
                >
                  <RefreshCw className="w-4 h-4" strokeWidth={1.8} />
                  {t("common.refresh")}
                </button>
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

        {projectFlowNotice && (
          <div className="mb-4 rounded-lg border border-[hsl(var(--success)/0.35)] bg-[hsl(var(--success)/0.08)] px-4 py-3 text-[13px] text-[hsl(var(--success))] flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{projectFlowNotice}</span>
          </div>
        )}
        {projectActionHint && (
          <div className="mb-4 rounded-lg border border-[hsl(var(--warning)/0.35)] bg-[hsl(var(--warning)/0.08)] px-4 py-3 text-[13px] text-[hsl(var(--warning-foreground))] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{projectActionHint}</span>
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
            <div className="mb-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="page-eyebrow">{tt("projects.projectList")}</div>
                  <h2 className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                    {tt("projects.portfolioNavigator")}
                  </h2>
                  <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
                    {tt("projects.filteredCount")} {filteredProjects.length} · {tt("projects.selectedCount")}{" "}
                    {bulkSelectedProjectIds.length}
                  </p>
                </div>
                <Button type="button" onClick={openCreateProjectDialog} className="gap-2 self-start">
                  <Plus className="h-4 w-4" />
                  {copy("New project", "Новый проект", "פרויקט חדש")}
                </Button>
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
            <div className="surface-subtle mb-3 space-y-3 p-3">
              <div className="text-[12px] font-medium text-foreground">{locale === "ru" ? "\u041c\u0430\u0441\u0441\u043e\u0432\u044b\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044f" : locale === "he" ? "\u05e4\u05e2\u05d5\u05dc\u05d5\u05ea \u05de\u05e8\u05d5\u05d1\u05d5\u05ea" : "Batch actions"}</div>
              <div className="space-y-3">
                <label className="inline-flex items-start gap-2 text-[12px] leading-snug text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={(e) => toggleSelectAllFilteredProjects(e.target.checked)}
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
                    disabled={bulkReviewLoading || bulkSelectedProjectIds.length === 0}
                    className="inline-flex min-h-10 items-center justify-center rounded-xl border border-border/70 bg-background/70 px-4 text-center text-[12px] font-medium leading-tight disabled:cursor-not-allowed disabled:opacity-50"
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
                    disabled={bulkReconcileLoading || bulkSelectedProjectIds.length === 0}
                    className="inline-flex min-h-10 items-center justify-center rounded-xl border border-border/70 bg-background/70 px-4 text-center text-[12px] font-medium leading-tight disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {bulkReconcileLoading
                      ? tt("projects.reconciling")
                      : bulkOnlyFailedRuns
                        ? `${tt("projects.retryFailed")} (${bulkSelectedProjectIds.length})`
                        : `${tt("projects.reconcile")} (${bulkSelectedProjectIds.length})`}
                  </button>
                </div>
              </div>
              <div className="border-t border-border/70 pt-3">
                <label className="inline-flex items-center gap-2 text-[12px] text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={bulkOnlyFailedRuns}
                    onChange={(e) => setBulkOnlyFailedRuns(e.target.checked)}
                  />
                  {tt("projects.retryFailedLatestOnly")}
                </label>
              </div>
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
                        "flex min-h-[110px] w-full flex-col justify-between rounded-xl border px-3 py-3 text-left transition-all duration-200",
                        active
                          ? "border-accent/40 bg-[linear-gradient(135deg,hsl(var(--accent)/0.16),hsl(var(--accent)/0.06))] shadow-[0_18px_40px_-26px_hsl(var(--accent)/0.55)]"
                          : "border-border/70 bg-background/75 hover:border-accent/25 hover:bg-[hsl(var(--accent)/0.04)]"
                      )}
                    >
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold text-card-foreground">{project.name}</div>
                        <div className="mt-0.5 text-[12px] text-muted-foreground">{project.address}</div>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-2">
                        {t("projects.statusPrefix")}: {tokenLabel(project.status)}
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="xl:col-span-2 space-y-5">
            {selectedProject ? (
              <>
                <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="surface-panel flex min-h-[136px] flex-col justify-between">
                    <div className="flex min-h-[18px] items-center text-[12px] text-muted-foreground">
                      {t("projects.projectLabel")}
                    </div>
                    <div className="mt-3 min-w-0">
                      <div className="text-[14px] font-semibold">{selectedProject.name}</div>
                      <div className="mt-1 text-[12px] text-muted-foreground">{selectedProject.address}</div>
                    </div>
                    {projectDetails?.developer_company ? (
                      <div className="mt-3 text-[12px] text-muted-foreground">
                        {t("projects.developer")}: {projectDetails.developer_company}
                      </div>
                    ) : null}
                  </div>
                  <div className="surface-panel flex min-h-[136px] flex-col justify-between">
                    <div className="flex min-h-[18px] items-center gap-1 text-[12px] text-muted-foreground">
                      <Building2 className="w-3.5 h-3.5" />
                      {t("projects.totalDoors")}
                    </div>
                    <div className="mt-3 text-[22px] font-semibold">
                      {layout ? layout.total_doors : "-"}
                    </div>
                  </div>
                  <div className="surface-panel flex min-h-[136px] flex-col justify-between">
                    <div className="flex min-h-[18px] items-center gap-1 text-[12px] text-muted-foreground">
                      <Layers3 className="w-3.5 h-3.5" />
                      {t("projects.layoutBuckets")}
                    </div>
                    <div className="mt-3 text-[22px] font-semibold">
                      {layout ? layout.buckets.length : "-"}
                    </div>
                  </div>
                  <div className="surface-panel flex min-h-[136px] flex-col justify-between">
                    <div className="flex min-h-[18px] items-center text-[12px] text-muted-foreground">
                      {t("projects.openBlockers")}
                    </div>
                    <div className="mt-3 text-[22px] font-semibold">
                      {loadingProjectDetails ? "-" : projectDetails?.issues_open?.length || 0}
                    </div>
                    <div className="mt-3 text-[12px] text-muted-foreground">
                      {projectDetails?.contact_name
                        ? `${t("projects.contact")}: ${projectDetails.contact_name}`
                        : t("projects.noContactAssigned")}
                    </div>
                  </div>
                </div>

                <div className="surface-panel space-y-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-3xl">
                      <div className="page-eyebrow">
                        {copy("Project settings", "Настройки проекта", "הגדרות פרויקט")}
                      </div>
                      <h3 className="mt-2 text-[15px] font-semibold leading-tight text-foreground">
                        {projectDetails?.code
                          ? `${projectDetails.code} · ${selectedProject.name}`
                          : selectedProject.name}
                      </h3>
                      <p className="mt-2 text-[12px] leading-6 text-muted-foreground">
                        {projectDetails?.address || copy("Add the site address and developer contact to unlock Waze, WhatsApp and direct calling.", "Добавьте адрес объекта и контакт застройщика, чтобы включить Waze, WhatsApp и прямой звонок.", "הוסף כתובת אתר ואיש קשר של היזם כדי להפעיל Waze, WhatsApp וחיוג ישיר.")}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                        {projectDetails?.planned_start_date ? (
                          <span className="metric-chip">
                            {copy("Start", "Старт", "התחלה")} {projectDetails.planned_start_date}
                          </span>
                        ) : null}
                        {projectDetails?.planned_end_date ? (
                          <span className="metric-chip">
                            {copy("Finish", "Финиш", "סיום")} {projectDetails.planned_end_date}
                          </span>
                        ) : null}
                        <span className="metric-chip">
                          {copy("Contact", "Контакт", "איש קשר")} {projectDetails?.contact_name || copy("missing", "не заполнен", "חסר")}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
                      <Button type="button" variant="outline" onClick={openEditProjectDialog} className="gap-2">
                        <PencilLine className="h-4 w-4" />
                        {copy("Edit project", "Редактировать проект", "ערוך פרויקט")}
                      </Button>
                      {projectDetails?.waze_deep_link ? (
                        <a
                          href={projectDetails.waze_deep_link}
                          target="_blank"
                          rel="noreferrer"
                          title={projectDetails.address || ""}
                          className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-background/75 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                        >
                          <MapPinned className="h-4 w-4" />
                          Waze
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            showProjectActionHint(
                              copy(
                                "Add address in project settings to unlock Waze.",
                                "Добавьте адрес в настройках проекта, чтобы включить Waze.",
                                "הוסף כתובת בהגדרות הפרויקט כדי לפתוח את Waze."
                              )
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-xl border border-dashed border-border/70 bg-muted/40 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
                        >
                          <MapPinned className="h-4 w-4" />
                          Waze
                        </button>
                      )}
                      {projectDetails?.whatsapp_deep_link ? (
                        <a
                          href={projectDetails.whatsapp_deep_link}
                          target="_blank"
                          rel="noreferrer"
                          title={[projectDetails.contact_name, projectDetails.developer_whatsapp || projectDetails.contact_phone].filter(Boolean).join(" · ")}
                          className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-background/75 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                        >
                          <MessageCircle className="h-4 w-4" />
                          WhatsApp
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            showProjectActionHint(
                              copy(
                                "Add a contact phone or WhatsApp number to unlock WhatsApp.",
                                "Добавьте телефон контакта или номер WhatsApp, чтобы включить WhatsApp.",
                                "הוסף טלפון איש קשר או מספר WhatsApp כדי לפתוח את WhatsApp."
                              )
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-xl border border-dashed border-border/70 bg-muted/40 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
                        >
                          <MessageCircle className="h-4 w-4" />
                          WhatsApp
                        </button>
                      )}
                      {projectDetails?.call_deep_link ? (
                        <a
                          href={projectDetails.call_deep_link}
                          title={projectDetails.contact_phone || ""}
                          className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-background/75 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                        >
                          <Phone className="h-4 w-4" />
                          {copy("Call", "Позвонить", "התקשר")}
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            showProjectActionHint(
                              copy(
                                "Add a primary phone in project settings to unlock calling.",
                                "Добавьте основной телефон в настройках проекта, чтобы включить звонок.",
                                "הוסף טלפון ראשי בהגדרות הפרויקט כדי לפתוח חיוג."
                              )
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-xl border border-dashed border-border/70 bg-muted/40 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
                        >
                          <Phone className="h-4 w-4" />
                          {copy("Call", "Позвонить", "התקשר")}
                        </button>
                      )}
                      {projectDetails?.contact_phone ? (
                        <button
                          type="button"
                          title={copy(
                            "Click or hold to copy the number",
                            "Нажмите или удерживайте, чтобы скопировать номер",
                            "לחץ או החזק כדי להעתיק את המספר"
                          )}
                          onClick={() => void copyProjectPhone(projectDetails.contact_phone)}
                          onContextMenu={(event) => {
                            event.preventDefault();
                            void copyProjectPhone(projectDetails.contact_phone);
                          }}
                          onPointerDown={() => scheduleProjectPhoneCopy(projectDetails.contact_phone)}
                          onPointerUp={clearProjectPhoneCopyTimer}
                          onPointerLeave={clearProjectPhoneCopyTimer}
                          className="inline-flex items-center rounded-xl border border-border/70 bg-background/60 px-3 py-2 text-sm font-medium tabular-nums text-foreground transition-colors hover:bg-muted"
                        >
                          {formatReadablePhone(projectDetails.contact_phone)}
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 text-[12px] text-muted-foreground">
                    <div className="rounded-xl border border-border/70 bg-background/60 px-3 py-3">
                      <div className="font-medium text-foreground">{copy("Developer", "Застройщик", "יזם")}</div>
                      <div className="mt-1">{projectDetails?.developer_company || "—"}</div>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-background/60 px-3 py-3">
                      <div className="font-medium text-foreground">{copy("Contact", "Контакт", "איש קשר")}</div>
                      <div className="mt-1">{projectDetails?.contact_name || "—"}</div>
                      <div className="mt-1">{projectDetails?.contact_phone ? formatReadablePhone(projectDetails.contact_phone) : "—"}</div>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-background/60 px-3 py-3">
                      <div className="font-medium text-foreground">WhatsApp</div>
                      <div className="mt-1">
                        {projectDetails?.developer_whatsapp || projectDetails?.contact_phone
                          ? formatReadablePhone(projectDetails?.developer_whatsapp || projectDetails?.contact_phone)
                          : "—"}
                      </div>
                      <div className="mt-1">{projectDetails?.contact_email || "—"}</div>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-background/60 px-3 py-3">
                      <div className="font-medium text-foreground">{copy("Notes", "Заметки", "הערות")}</div>
                      <div className="mt-1 line-clamp-3">{projectDetails?.developer_notes || "—"}</div>
                    </div>
                  </div>
                </div>

                <div id="project-additional-works" className="surface-panel space-y-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="max-w-2xl">
                      <div className="page-eyebrow">
                        {copy("Manual Door Creation", "Ручное создание двери", "יצירה ידנית של דלת")}
                      </div>
                      <h3 className="mt-2 text-[15px] font-semibold leading-tight text-foreground">
                        {copy(
                          "Add a missing door without waiting for a new import run.",
                          "Добавьте недостающую дверь без ожидания нового импорта.",
                          "הוסף דלת חסרה בלי לחכות להרצת ייבוא חדשה."
                        )}
                      </h3>
                      <p className="mt-2 text-[12px] leading-6 text-muted-foreground">
                        {copy(
                          "Use a canonical product from Library, assign an installer if needed, and refresh the layout immediately.",
                          "Используйте канонический продукт из Library, при необходимости назначьте монтажника и сразу обновите раскладку проекта.",
                          "בחר מוצר קנוני מהספרייה, שיוך מתקין אם צריך, ורענן מיד את פריסת הפרויקט."
                        )}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                        <span className="metric-chip">
                          {copy("Library products", "Продукты Library", "מוצרי ספרייה")} {activeLibraryProducts.length}
                        </span>
                        <span className="metric-chip">
                          {copy("Active installers", "Активные монтажники", "מתקינים פעילים")} {activeInstallers.length}
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
                                `/projects?project_id=${selectedProjectId || ""}&focus_section=doors`
                              )}`
                            )
                          }
                        >
                          {copy("Open Library", "Открыть Library", "פתח ספרייה")}
                        </Button>
                        <Button
                          type="button"
                          onClick={openManualDoorDialog}
                          className="gap-2"
                          disabled={loadingLibraryProducts || activeLibraryProducts.length === 0}
                        >
                          <Plus className="h-4 w-4" />
                          {copy("Add door manually", "Добавить дверь вручную", "הוסף דלת ידנית")}
                        </Button>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {loadingLibraryProducts
                          ? copy("Loading library...", "Загружаем Library...", "טוען ספרייה...")
                          : activeLibraryProducts.length === 0
                            ? copy(
                                "Add active products in Library first.",
                                "Сначала добавьте активные продукты в Library.",
                                "קודם הוסף מוצרים פעילים בספרייה."
                              )
                            : copy(
                                "Door will appear after project refresh.",
                                "Дверь появится после обновления проекта.",
                                "הדלת תופיע אחרי רענון הפרויקט."
                              )}
                      </div>
                    </div>
                  </div>
                </div>

                <div id="project-urgency-surcharge" className="surface-panel space-y-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="max-w-2xl">
                      <div className="page-eyebrow">
                        {copy("Additional Works", "Дополнительные работы", "עבודות נוספות")}
                      </div>
                      <h3 className="mt-2 text-[15px] font-semibold leading-tight text-foreground">
                        {copy(
                          "Plan add-on work lines before installers start recording facts.",
                          "Планируйте строки доп. работ до того, как монтажники начнут фиксировать факты.",
                          "תכנן שורות עבודות נוספות לפני שהמתקינים מתחילים לרשום ביצוע בפועל."
                        )}
                      </h3>
                      <p className="mt-2 text-[12px] leading-6 text-muted-foreground">
                        {copy(
                          "Keep one simple project plan: what add-on is expected, how many units, and both client/install prices.",
                          "Держите простой план по проекту: какой доп нужен, сколько единиц и обе цены — клиентская и монтажная.",
                          "שמור תוכנית פרויקט פשוטה: איזה add-on נדרש, כמה יחידות, ומהם מחירי הלקוח והמתקין."
                        )}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-start gap-2 md:items-end">
                      <Button
                        type="button"
                        onClick={openAdditionalWorkDialog}
                        className="gap-2"
                        disabled={loadingAddonTypes || activeAddonTypes.length === 0}
                      >
                        <Plus className="h-4 w-4" />
                        {copy("Add additional work", "Добавить доп. работу", "הוסף עבודה נוספת")}
                      </Button>
                      <div className="text-[11px] text-muted-foreground">
                        {loadingAddonTypes
                          ? copy("Loading add-on types...", "Загружаем типы доп. работ...", "טוען סוגי עבודות נוספות...")
                          : activeAddonTypes.length === 0
                            ? copy(
                                "No active add-on types yet.",
                                "Пока нет активных типов доп. работ.",
                                "עדיין אין סוגי עבודות נוספות פעילים."
                              )
                            : copy(
                                "Installer facts can land on this plan later.",
                                "Позже монтажники смогут фиксировать факты по этому плану.",
                                "בהמשך מתקינים יוכלו לדווח ביצוע בפועל על התוכנית הזו."
                              )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="surface-subtle flex min-h-[96px] flex-col justify-between rounded-xl p-3.5">
                      <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                        {copy("Plan rows", "Строк плана", "שורות תוכנית")}
                      </div>
                      <div className="text-xl font-semibold tabular-nums text-foreground">{addonPlanTotals.rows}</div>
                    </div>
                    <div className="surface-subtle flex min-h-[96px] flex-col justify-between rounded-xl p-3.5">
                      <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                        {copy("Planned qty", "Плановое кол-во", "כמות מתוכננת")}
                      </div>
                      <div className="text-xl font-semibold tabular-nums text-foreground">{addonPlanTotals.qty}</div>
                    </div>
                    <div className="surface-subtle flex min-h-[96px] flex-col justify-between rounded-xl p-3.5">
                      <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                        {copy("Client total", "Сумма клиента", "סה\"כ לקוח")}
                      </div>
                      <div className="text-xl font-semibold tabular-nums text-foreground">{formatMoney(addonPlanTotals.client)}</div>
                    </div>
                    <div className="surface-subtle flex min-h-[96px] flex-col justify-between rounded-xl p-3.5">
                      <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                        {copy("Installer total", "Сумма монтажника", "סה\"כ מתקין")}
                      </div>
                      <div className="text-xl font-semibold tabular-nums text-foreground">{formatMoney(addonPlanTotals.installer)}</div>
                    </div>
                  </div>

                  <div className="mt-4 overflow-auto rounded-xl border border-border/70 bg-background/70">
                    <table className="min-w-[720px] w-full text-[12px] leading-5">
                      <thead className="bg-muted/40 text-muted-foreground">
                        <tr>
                          <th className="w-[28%] px-3 py-2.5 text-left font-medium">
                            {copy("Add-on", "Доп. работа", "עבודה נוספת")}
                          </th>
                          <th className="px-3 py-2.5 text-left font-medium">
                            {copy("Unit", "Ед.", "יחידה")}
                          </th>
                          <th className="px-3 py-2.5 text-right font-medium">
                            {copy("Qty planned", "План", "כמות")}
                          </th>
                          <th className="px-3 py-2.5 text-right font-medium">
                            {copy("Client price", "Цена клиента", "מחיר לקוח")}
                          </th>
                          <th className="px-3 py-2.5 text-right font-medium">
                            {copy("Installer price", "Цена монтажника", "מחיר מתקין")}
                          </th>
                          <th className="px-3 py-2.5 text-left font-medium">
                            {copy("Notes", "Примечание", "הערה")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingProjectAddonPlan ? (
                          <tr>
                            <td className="px-3 py-4 text-muted-foreground" colSpan={6}>
                              {copy(
                                "Loading additional works plan...",
                                "Загружаем план доп. работ...",
                                "טוען תוכנית עבודות נוספות..."
                              )}
                            </td>
                          </tr>
                        ) : projectAddonPlan.length === 0 ? (
                          <tr>
                            <td className="px-3 py-4 text-muted-foreground" colSpan={6}>
                              {copy(
                                "No additional works planned yet.",
                                "Пока нет запланированных доп. работ.",
                                "עדיין אין עבודות נוספות מתוכננות."
                              )}
                            </td>
                          </tr>
                        ) : (
                          projectAddonPlan.map((item, index) => {
                            const addon = activeAddonTypes.find((row) => row.id === item.addon_type_id) || null;
                            return (
                              <tr
                                key={item.id || `${item.addon_type_id}-${index}`}
                                className="row-hover border-t border-border/70"
                              >
                                <td className="px-3 py-2.5 font-medium text-foreground">
                                  {item.addon_name || addon?.name || item.addon_type_id}
                                </td>
                                <td className="px-3 py-2.5 text-muted-foreground">{addon?.unit || "-"}</td>
                                <td className="px-3 py-2.5 text-right tabular-nums">{item.qty_planned}</td>
                                <td className="px-3 py-2.5 text-right tabular-nums">{formatMoney(Number(item.client_price) || 0)}</td>
                                <td className="px-3 py-2.5 text-right tabular-nums">{formatMoney(Number(item.installer_price) || 0)}</td>
                                <td className="px-3 py-2.5 text-muted-foreground">{item.notes || "-"}</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="surface-panel space-y-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="max-w-2xl">
                      <div className="page-eyebrow">
                        {copy("Urgency Surcharge", "Срочная надбавка", "תוספת דחיפות")}
                      </div>
                      <h3 className="mt-2 text-[15px] font-semibold leading-tight text-foreground">
                        {copy(
                          "Track approved urgency uplift without mixing it into the door list.",
                          "Фиксируйте утверждённую срочную надбавку отдельно, не смешивая её со списком дверей.",
                          "עקוב אחרי תוספת דחיפות מאושרת בלי לערבב אותה ברשימת הדלתות."
                        )}
                      </h3>
                      <p className="mt-2 text-[12px] leading-6 text-muted-foreground">
                        {copy(
                          "Use project-level or order-level surcharge rows so finance and operations see the same uplift logic.",
                          "Используйте строки surcharge на уровне проекта или заказа, чтобы финансы и operations видели одну и ту же логику надбавки.",
                          "השתמש בשורות surcharge ברמת פרויקט או הזמנה כדי שפיננסים ותפעול יראו את אותה לוגיקת תוספת."
                        )}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-start gap-2 md:items-end">
                      <Button type="button" onClick={openUrgencyDialog} className="gap-2">
                        <Plus className="h-4 w-4" />
                        {copy("Add urgency surcharge", "Добавить срочную надбавку", "הוסף תוספת דחיפות")}
                      </Button>
                      <div className="text-[11px] text-muted-foreground">
                        {copy(
                          "Keep surcharge visible and auditable as a separate plan layer.",
                          "Держите surcharge видимым и аудируемым как отдельный плановый слой.",
                          "שמור surcharge גלוי וניתן לביקורת כשכבת תכנון נפרדת."
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="surface-subtle flex min-h-[96px] flex-col justify-between rounded-xl p-3.5">
                      <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                        {copy("Rows", "Строки", "שורות")}
                      </div>
                      <div className="text-xl font-semibold tabular-nums text-foreground">{urgencyTotals.rows}</div>
                    </div>
                    <div className="surface-subtle flex min-h-[96px] flex-col justify-between rounded-xl p-3.5">
                      <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                        {copy("Order-scoped", "По заказу", "לפי הזמנה")}
                      </div>
                      <div className="text-xl font-semibold tabular-nums text-foreground">{urgencyTotals.orderScoped}</div>
                    </div>
                    <div className="surface-subtle flex min-h-[96px] flex-col justify-between rounded-xl p-3.5">
                      <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                        {copy("Client uplift", "Надбавка клиента", "תוספת לקוח")}
                      </div>
                      <div className="text-xl font-semibold tabular-nums text-foreground">{formatMoney(urgencyTotals.client)}</div>
                    </div>
                    <div className="surface-subtle flex min-h-[96px] flex-col justify-between rounded-xl p-3.5">
                      <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                        {copy("Installer uplift", "Надбавка монтажника", "תוספת מתקין")}
                      </div>
                      <div className="text-xl font-semibold tabular-nums text-foreground">{formatMoney(urgencyTotals.installer)}</div>
                    </div>
                  </div>

                  <div className="mt-4 overflow-auto rounded-xl border border-border/70 bg-background/70">
                    <table className="min-w-[760px] w-full text-[12px] leading-5">
                      <thead className="bg-muted/40 text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2.5 text-left font-medium">{copy("Scope", "Скоуп", "היקף")}</th>
                          <th className="px-3 py-2.5 text-left font-medium">{copy("Order", "Заказ", "הזמנה")}</th>
                          <th className="w-[30%] px-3 py-2.5 text-left font-medium">{copy("Reason", "Причина", "סיבה")}</th>
                          <th className="px-3 py-2.5 text-right font-medium">{copy("Client", "Клиент", "לקוח")}</th>
                          <th className="px-3 py-2.5 text-right font-medium">{copy("Installer", "Монтажник", "מתקין")}</th>
                          <th className="px-3 py-2.5 text-left font-medium">{copy("Effective", "Дата", "תאריך")}</th>
                          <th className="px-3 py-2.5 text-left font-medium">{copy("Notes", "Примечание", "הערה")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingUrgencySurcharges ? (
                          <tr>
                            <td className="px-3 py-4 text-muted-foreground" colSpan={7}>
                              {copy(
                                "Loading urgency surcharge plan...",
                                "Загружаем план срочной надбавки...",
                                "טוען תוכנית תוספת דחיפות..."
                              )}
                            </td>
                          </tr>
                        ) : urgencySurcharges.length === 0 ? (
                          <tr>
                            <td className="px-3 py-4 text-muted-foreground" colSpan={7}>
                              {copy(
                                "No urgency surcharge rows yet.",
                                "Пока нет строк срочной надбавки.",
                                "עדיין אין שורות תוספת דחיפות."
                              )}
                            </td>
                          </tr>
                        ) : (
                          urgencySurcharges.map((item, index) => (
                            <tr key={item.id || `${item.scope}-${item.order_number || "project"}-${index}`} className="row-hover border-t border-border/70">
                              <td className="px-3 py-2.5">
                                {item.scope === "ORDER_NUMBER"
                                  ? copy("Order", "Заказ", "הזמנה")
                                  : copy("Project", "Проект", "פרויקט")}
                              </td>
                              <td className="px-3 py-2.5">{item.order_number || "-"}</td>
                              <td className="px-3 py-2.5 font-medium text-foreground">{item.reason}</td>
                              <td className="px-3 py-2.5 text-right tabular-nums">{formatMoney(Number(item.client_amount) || 0)}</td>
                              <td className="px-3 py-2.5 text-right tabular-nums">{formatMoney(Number(item.installer_amount) || 0)}</td>
                              <td className="px-3 py-2.5">{item.effective_date || "-"}</td>
                              <td className="px-3 py-2.5 text-muted-foreground">{item.notes || "-"}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="surface-panel">
                  <div className="flex flex-col gap-3 border-b border-border/70 pb-4 md:flex-row md:items-start md:justify-between">
                    <div className="max-w-3xl">
                      <h3 className="text-[15px] font-semibold leading-tight">{t("projects.projectFinancialScreen")}</h3>
                      <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                        {t("projects.projectFinancialSubtitle")}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-2 md:items-end">
                      <div className="pt-0.5 text-[12px] text-muted-foreground md:text-right">
                        {loadingProjectPlanFact || loadingProjectRisk
                          ? t("projects.refreshingFinancialView")
                          : projectRisk?.generated_at
                            ? `${copy("Updated", "Обновлено", "עודכן")}: ${formatDateTime(projectRisk.generated_at)}`
                            : t("projects.financialDataReady")}
                      </div>
                      {selectedProjectId ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="h-9"
                          onClick={() =>
                            router.push(`/reports?project_id=${encodeURIComponent(selectedProjectId)}`)
                          }
                        >
                          {copy(
                            "Open project report",
                            "Открыть отчёт по проекту",
                            "פתח דוח פרויקט"
                          )}
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  {loadingProjectPlanFact || loadingProjectRisk ? (
                    <div className="mt-4 text-[13px] text-muted-foreground">
                      {t("projects.loadingFinancialScreen")}
                    </div>
                  ) : projectPlanFact && projectRisk ? (
                    <div className="mt-4 space-y-4">
                      <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-2 xl:grid-cols-6">
                        <div className="relative flex min-h-[176px] flex-col overflow-hidden rounded-2xl border border-border/70 bg-[linear-gradient(180deg,hsl(var(--background)/0.92),hsl(var(--accent)/0.08))] p-4">
                          <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,hsl(var(--accent)/0.7),transparent)]" />
                          <div className="min-h-[2.75rem] text-[11px] uppercase tracking-wider text-muted-foreground">
                            {copy("Completion", "Готовность", "השלמה")}
                          </div>
                          <div className="mt-auto pt-3">
                            <div className="text-xl font-semibold">{formatPct(projectPlanFact.completion_pct)}</div>
                            <div className="mt-1 text-[12px] text-muted-foreground">
                              {copy("Installed", "Установлено", "הותקן")}: {projectPlanFact.installed_doors}/{projectPlanFact.total_doors}
                            </div>
                          </div>
                        </div>
                        <div className="relative flex min-h-[176px] flex-col overflow-hidden rounded-2xl border border-border/70 bg-[linear-gradient(180deg,hsl(var(--background)/0.92),hsl(var(--accent)/0.08))] p-4">
                          <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,hsl(var(--accent)/0.7),transparent)]" />
                          <div className="min-h-[2.75rem] text-[11px] uppercase tracking-wider text-muted-foreground">
                            {copy("Actual Margin", "Фактическая маржа", "מרווח בפועל")}
                          </div>
                          <div className="mt-auto pt-3">
                            <div className="text-xl font-semibold">{formatPct(projectRisk.summary.actual_margin_pct)}</div>
                            <div className="mt-1 text-[12px] text-muted-foreground">
                              {copy("Profit", "Прибыль", "רווח")}: {formatMoney(projectRisk.summary.actual_profit_total)}
                            </div>
                          </div>
                        </div>
                        <div className="relative flex min-h-[176px] flex-col overflow-hidden rounded-2xl border border-border/70 bg-[linear-gradient(180deg,hsl(var(--background)/0.92),hsl(var(--accent)/0.08))] p-4">
                          <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,hsl(var(--accent)/0.7),transparent)]" />
                          <div className="min-h-[2.75rem] text-[11px] uppercase tracking-wider text-muted-foreground">
                            {copy("Revenue Gap", "Разрыв по выручке", "פער בהכנסה")}
                          </div>
                          <div className="mt-auto pt-3">
                            <div className="text-xl font-semibold">{formatMoney(projectPlanFact.revenue_gap_total)}</div>
                            <div className="mt-1 text-[12px] text-muted-foreground">
                              {copy("Delayed", "Задержано", "בעיכוב")}: {formatMoney(projectRisk.summary.delayed_revenue_total)}
                            </div>
                          </div>
                        </div>
                        <div className="relative flex min-h-[176px] flex-col overflow-hidden rounded-2xl border border-border/70 bg-[linear-gradient(180deg,hsl(var(--background)/0.92),hsl(var(--accent)/0.08))] p-4">
                          <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,hsl(var(--accent)/0.7),transparent)]" />
                          <div className="min-h-[2.75rem] text-[11px] uppercase tracking-wider text-muted-foreground">
                            {copy("Profit Gap", "Разрыв по прибыли", "פער ברווח")}
                          </div>
                          <div className="mt-auto pt-3">
                            <div className="text-xl font-semibold">{formatMoney(projectPlanFact.profit_gap_total)}</div>
                            <div className="mt-1 text-[12px] text-muted-foreground">
                              {copy("Risk", "Риск", "סיכון")}: {formatMoney(projectRisk.summary.blocked_issue_profit_at_risk)}
                            </div>
                          </div>
                        </div>
                        <div className="relative flex min-h-[176px] flex-col overflow-hidden rounded-2xl border border-border/70 bg-[linear-gradient(180deg,hsl(var(--background)/0.92),hsl(var(--accent)/0.08))] p-4">
                          <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,hsl(var(--accent)/0.7),transparent)]" />
                          <div className="min-h-[2.75rem] text-[11px] uppercase tracking-wider text-muted-foreground">
                            {copy("Open Issues", "Открытые проблемы", "בעיות פתוחות")}
                          </div>
                          <div className="mt-auto pt-3">
                            <div className="text-xl font-semibold">{projectPlanFact.open_issues}</div>
                            <div className="mt-1 text-[12px] text-muted-foreground">
                              {copy("Blocked", "Заблокировано", "חסום")}: {projectRisk.summary.blocked_open_issues}
                            </div>
                          </div>
                        </div>
                        <div className="relative flex min-h-[176px] flex-col overflow-hidden rounded-2xl border border-border/70 bg-[linear-gradient(180deg,hsl(var(--background)/0.92),hsl(var(--accent)/0.08))] p-4">
                          <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,hsl(var(--accent)/0.7),transparent)]" />
                          <div className="min-h-[2.75rem] text-[11px] uppercase tracking-wider text-muted-foreground">
                            {copy("Data Risk", "Риск данных", "סיכון נתונים")}
                          </div>
                          <div className="mt-auto pt-3">
                            <div className="text-xl font-semibold">{projectPlanFact.missing_actual_rates_doors}</div>
                            <div className="mt-1 text-[12px] text-muted-foreground">
                              {copy("Add-on gaps", "Пробелы add-on", "פערי add-on")}: {projectPlanFact.missing_addon_plans_facts}
                            </div>
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
                            <table className="min-w-[760px] w-full text-[12px] leading-5">
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
                                      {tokenLabel(driver.severity)}
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
                            <table className="min-w-[760px] w-full text-[12px] leading-5">
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
                            <table className="min-w-[760px] w-full text-[12px] leading-5">
                              <thead className="bg-[linear-gradient(180deg,hsl(var(--muted)/0.65),hsl(var(--muted)/0.35))] text-muted-foreground">
                                <tr>
                                  <th className="px-3 py-2 text-left font-medium">
                                    {copy("Order Number", "Номер заказа", "מספר הזמנה")}
                                  </th>
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
                      <table className="min-w-[760px] w-full text-[12px] leading-5">
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
                      <table className="min-w-[760px] w-full text-[12px] leading-5">
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
                    <table className="min-w-[760px] w-full text-[12px] leading-5">
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

                <div id="project-door-matrix" className="glass-card rounded-xl p-4">
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
                          <option value="ANALYZED">{copy("ANALYZED", "ПРОАНАЛИЗИРОВАНО", "נותח")}</option>
                          <option value="SUCCESS">{copy("SUCCESS", "УСПЕШНО", "הצליח")}</option>
                          <option value="PARTIAL">{copy("PARTIAL", "ЧАСТИЧНО", "חלקי")}</option>
                          <option value="FAILED">{copy("FAILED", "ОШИБКА", "נכשל")}</option>
                          <option value="EMPTY">{copy("EMPTY", "ПУСТО", "ריק")}</option>
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
                                    {tokenLabel(run.status)}
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
                                        {retryingRunId === run.id ? `${t("projects.retry")}…` : t("projects.retry")}
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
                            <div className="font-medium mt-0.5">{tokenLabel(focusedImportRunDetails.status)}</div>
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
                                                            {tokenLabel(door.status)}
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
                    <table className="min-w-[760px] w-full text-[12px] leading-5">
                      <thead className="bg-muted/40 text-muted-foreground">
                        <tr>
                          <th className="text-left px-2 py-2 font-medium">
                            {copy("Order Number", "Номер заказа", "מספר הזמנה")}
                          </th>
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
                              {copy(
                                "No doors for selected filters.",
                                "Нет дверей для выбранных фильтров.",
                                "אין דלתות עבור המסננים שנבחרו."
                              )}
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
                                  {tokenLabel(row.status)}
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
                                  {copy("Order Number", "Номер заказа", "מספר הזמנה")} {bucket.order_number || "-"} | {t("projects.houseLabel")} {bucket.house_number || "-"}
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
                                  {tokenLabel(status)}: {count}
                                </span>
                              ))}
                            </div>

                            <div className="mt-3 overflow-hidden rounded-md border border-border">
                              <table className="min-w-[760px] w-full text-[12px] leading-5">
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
                                          {tokenLabel(door.status)}
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
                "שמור כרטיס פרויקט אחד ומסודר: נתוני בסיס, כתובת האתר ואיש קשר של היזם לפעולות מהירות בשטח."
              )}
            </DialogDescription>
          </DialogHeader>

          <Accordion type="multiple" defaultValue={["main", "address", "contact"]} className="w-full">
            <AccordionItem value="main">
              <AccordionTrigger className="text-left">
                {copy("Main information", "Основная информация", "מידע בסיסי")}
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="project-form-code">{copy("Project code", "Код проекта", "קוד פרויקט")}</Label>
                    <Input id="project-form-code" value={projectForm.code} onChange={(event) => setProjectForm((prev) => ({ ...prev, code: event.target.value }))} placeholder="PRJ-001" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project-form-name">{copy("Project name", "Название проекта", "שם הפרויקט")}</Label>
                    <Input id="project-form-name" value={projectForm.name} onChange={(event) => setProjectForm((prev) => ({ ...prev, name: event.target.value }))} placeholder={copy("Ashdod Tower A", "Ашдод Тауэр A", "מגדל אשדוד A")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project-form-start">{copy("Planned start", "Плановая дата начала", "תאריך התחלה מתוכנן")}</Label>
                    <Input id="project-form-start" type="date" value={projectForm.planned_start_date} onChange={(event) => setProjectForm((prev) => ({ ...prev, planned_start_date: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project-form-end">{copy("Planned finish", "Плановая дата завершения", "תאריך סיום מתוכנן")}</Label>
                    <Input id="project-form-end" type="date" value={projectForm.planned_end_date} onChange={(event) => setProjectForm((prev) => ({ ...prev, planned_end_date: event.target.value }))} />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="address">
              <AccordionTrigger className="text-left">
                {copy("Site address", "Адрес объекта", "כתובת האתר")}
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="project-form-address-search">{copy("Address search / fallback", "Поиск адреса / запасное поле", "חיפוש כתובת / שדה חלופי")}</Label>
                    <Input id="project-form-address-search" value={projectForm.address} onChange={(event) => updateProjectFormField("address", event.target.value)} placeholder={copy("Street, building, city", "Улица, дом, город", "רחוב, בניין, עיר")} />
                    {loadingProjectAddressSuggestions || projectAddressSuggestions.length > 0 ? (
                      <div className="rounded-2xl border border-border/70 bg-background/60 p-3">
                        <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                          {loadingProjectAddressSuggestions
                            ? copy("Searching address", "Ищем адрес", "מחפש כתובת")
                            : copy("Address suggestions", "Подсказки адреса", "הצעות כתובת")}
                        </div>
                        {projectAddressSuggestions.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {projectAddressSuggestions.map((suggestion) => (
                              <button
                                key={suggestion.key}
                                type="button"
                                onClick={() => applyProjectAddressSuggestion(suggestion)}
                                className="inline-flex items-center rounded-xl border border-border/70 bg-background px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                              >
                                {suggestion.label}
                              </button>
                            ))}
                          </div>
                        ) : loadingProjectAddressSuggestions ? (
                          <div className="mt-3 text-sm text-muted-foreground">
                            {copy("Checking geocoder suggestions…", "Проверяем подсказки геокодера…", "בודק הצעות ממנוע הכתובות…")}
                          </div>
                        ) : (
                          <div className="mt-3 text-sm text-muted-foreground">
                            {copy("No suggestions found yet. Continue typing or fill the fields manually.", "Подсказки пока не найдены. Продолжайте ввод или заполните поля вручную.", "עדיין לא נמצאו הצעות. המשך להקליד או מלא את השדות ידנית.")}
                          </div>
                        )}
                        <div className="mt-2 text-xs leading-5 text-muted-foreground">
                          {copy(
                            "Choose a suggestion to autofill street, building, city and entrance. Coordinates arrive with the selected suggestion when available.",
                            "Выберите подсказку, чтобы автозаполнить улицу, дом, город и подъезд. Координаты приходят вместе с выбранной подсказкой, если они определены.",
                            "בחר הצעה כדי למלא אוטומטית רחוב, בניין, עיר וכניסה. קואורדינטות מגיעות יחד עם ההצעה שנבחרה כאשר הן זמינות."
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project-form-street">{copy("Street", "Улица", "רחוב")}</Label>
                    <Input id="project-form-street" value={projectForm.address_street} onChange={(event) => updateProjectFormField("address_street", event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project-form-building">{copy("Building", "Дом", "בניין")}</Label>
                    <Input id="project-form-building" value={projectForm.address_building} onChange={(event) => updateProjectFormField("address_building", event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project-form-city">{copy("City", "Город", "עיר")}</Label>
                    <Input id="project-form-city" value={projectForm.address_city} onChange={(event) => updateProjectFormField("address_city", event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project-form-entrance">{copy("Entrance", "Подъезд / вход", "כניסה")}</Label>
                    <Input id="project-form-entrance" value={projectForm.address_entrance} onChange={(event) => updateProjectFormField("address_entrance", event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project-form-lat">Lat</Label>
                    <Input id="project-form-lat" value={projectForm.address_lat} onChange={(event) => updateProjectFormField("address_lat", event.target.value)} placeholder="31.2456789" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project-form-lng">Lng</Label>
                    <Input id="project-form-lng" value={projectForm.address_lng} onChange={(event) => updateProjectFormField("address_lng", event.target.value)} placeholder="34.7912345" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="project-form-waze">{copy("Waze URL override", "Ссылка Waze вручную", "קישור Waze ידני")}</Label>
                    <Input id="project-form-waze" value={projectForm.address_waze_url} onChange={(event) => updateProjectFormField("address_waze_url", event.target.value)} placeholder="https://www.waze.com/ul?..." />
                    {projectFormFieldErrors.address_waze_url ? (
                      <div className="text-xs text-destructive">{projectFormFieldErrors.address_waze_url}</div>
                    ) : null}
                  </div>
                </div>
                <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={draftWazeLink || undefined}
                      target="_blank"
                      rel="noreferrer"
                      aria-disabled={!draftWazeLink}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium",
                        draftWazeLink ? "border-border/70 bg-background/75 text-foreground hover:bg-muted" : "cursor-not-allowed border-dashed border-border/70 bg-muted/40 text-muted-foreground"
                      )}
                    >
                      <MapPinned className="h-4 w-4" />
                      {copy("Test Waze", "Проверить Waze", "בדוק Waze")}
                    </a>
                    <div className="rounded-xl border border-border/70 bg-background/60 px-3 py-2 text-xs text-muted-foreground">
                      {buildDraftProjectAddress(projectForm) || copy("No address yet", "Адрес пока не заполнен", "הכתובת עדיין לא מולאה")}
                    </div>
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-border/70 bg-[linear-gradient(180deg,hsl(var(--background)/0.94),hsl(var(--accent)/0.08))] text-sm">
                    {buildDraftMapPreviewUrl(projectForm) ? (
                      <div className="border-b border-border/60 bg-muted/10 p-2">
                        <iframe
                          title={copy("Map preview", "Предпросмотр карты", "תצוגה מקדימה של המפה")}
                          src={buildDraftMapPreviewUrl(projectForm) || undefined}
                          className="h-36 w-full rounded-xl border border-border/60 bg-background"
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                        />
                      </div>
                    ) : null}
                    <div className="px-4 py-4">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      {copy("Route preview", "Предпросмотр маршрута", "תצוגת מסלול")}
                    </div>
                    <div className="mt-3 font-medium text-foreground">
                      {buildDraftProjectAddress(projectForm) || copy("Awaiting address", "Ждём адрес", "ממתין לכתובת")}
                    </div>
                    <div className="mt-2 text-xs leading-5 text-muted-foreground">
                      {projectForm.address_lat.trim() && projectForm.address_lng.trim()
                        ? `${copy("Coordinates", "Координаты", "קואורדינטות")}: ${projectForm.address_lat}, ${projectForm.address_lng}`
                        : copy("No coordinates yet. Choose an address suggestion or fill them manually.", "Координаты пока не заполнены. Выберите подсказку адреса или заполните их вручную.", "עדיין אין קואורדינטות. בחר הצעת כתובת או מלא ידנית.")}
                    </div>
                    <div className="mt-3 text-xs text-muted-foreground">
                      {draftWazeLink
                        ? copy("Waze link is ready for a quick field check.", "Ссылка Waze готова для быстрой полевой проверки.", "קישור Waze מוכן לבדיקה מהירה בשטח.")
                        : copy("Fill address data to unlock navigation.", "Заполните адрес, чтобы включить навигацию.", "מלא נתוני כתובת כדי לפתוח ניווט.")}
                    </div>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="contact">
              <AccordionTrigger className="text-left">
                {copy("Developer contact", "Контакты застройщика", "אנשי קשר של היזם")}
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="project-form-dev-company">{copy("Developer company", "Компания застройщика", "חברת יזם")}</Label>
                    <Input id="project-form-dev-company" value={projectForm.developer_company} onChange={(event) => updateProjectFormField("developer_company", event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project-form-contact-name">{copy("Contact name", "Имя ответственного", "שם איש קשר")}</Label>
                    <Input id="project-form-contact-name" value={projectForm.contact_name} onChange={(event) => updateProjectFormField("contact_name", event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project-form-phone">{copy("Primary phone", "Основной телефон", "טלפון ראשי")}</Label>
                    <div className="flex items-center gap-2">
                      <div className="inline-flex h-10 items-center rounded-xl border border-border/70 bg-muted/30 px-3 text-xs font-medium text-muted-foreground">
                        {copy("🇮🇱 +972", "🇮🇱 +972", "🇮🇱 +972")}
                      </div>
                      <Input
                        id="project-form-phone"
                        value={projectForm.contact_phone}
                        onChange={(event) => updateProjectFormField("contact_phone", formatProjectPhoneInput(event.target.value))}
                        placeholder="+972501234567"
                      />
                    </div>
                    {projectFormFieldErrors.contact_phone ? (
                      <div className="text-xs text-destructive">{projectFormFieldErrors.contact_phone}</div>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project-form-phone-alt">{copy("Alt phone", "Доп. телефон", "טלפון נוסף")}</Label>
                    <div className="flex items-center gap-2">
                      <div className="inline-flex h-10 items-center rounded-xl border border-border/70 bg-muted/30 px-3 text-xs font-medium text-muted-foreground">
                        {copy("🇮🇱 +972", "🇮🇱 +972", "🇮🇱 +972")}
                      </div>
                      <Input
                        id="project-form-phone-alt"
                        value={projectForm.developer_phone_alt}
                        onChange={(event) => updateProjectFormField("developer_phone_alt", formatProjectPhoneInput(event.target.value))}
                        placeholder="+972501234568"
                      />
                    </div>
                    {projectFormFieldErrors.developer_phone_alt ? (
                      <div className="text-xs text-destructive">{projectFormFieldErrors.developer_phone_alt}</div>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project-form-whatsapp">WhatsApp</Label>
                    <div className="flex items-center gap-2">
                      <div className="inline-flex h-10 items-center rounded-xl border border-border/70 bg-muted/30 px-3 text-xs font-medium text-muted-foreground">
                        {copy("🇮🇱 +972", "🇮🇱 +972", "🇮🇱 +972")}
                      </div>
                      <Input
                        id="project-form-whatsapp"
                        value={projectForm.developer_whatsapp}
                        onChange={(event) => updateProjectFormField("developer_whatsapp", formatProjectPhoneInput(event.target.value))}
                        placeholder="+972501234569"
                      />
                    </div>
                    {projectFormFieldErrors.developer_whatsapp ? (
                      <div className="text-xs text-destructive">{projectFormFieldErrors.developer_whatsapp}</div>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project-form-email">Email</Label>
                    <Input id="project-form-email" type="email" value={projectForm.contact_email} onChange={(event) => updateProjectFormField("contact_email", event.target.value)} placeholder="contact@example.com" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="project-form-notes">{copy("Notes", "Заметки", "הערות")}</Label>
                    <textarea
                      id="project-form-notes"
                      value={projectForm.developer_notes}
                      onChange={(event) => updateProjectFormField("developer_notes", event.target.value)}
                      className="control-textarea min-h-[110px] w-full"
                      placeholder={copy("Access rules, gate, working hours, site notes", "Пропуск, ворота, режим работы, заметки по объекту", "כללי כניסה, שער, שעות עבודה, הערות אתר")}
                    />
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <a
                    href={draftWhatsappLink || undefined}
                    target="_blank"
                    rel="noreferrer"
                    aria-disabled={!draftWhatsappLink}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium",
                      draftWhatsappLink ? "border-border/70 bg-background/75 text-foreground hover:bg-muted" : "cursor-not-allowed border-dashed border-border/70 bg-muted/40 text-muted-foreground"
                    )}
                  >
                    <MessageCircle className="h-4 w-4" />
                    {copy("Test WhatsApp", "Проверить WhatsApp", "בדוק WhatsApp")}
                  </a>
                  <a
                    href={draftCallLink || undefined}
                    aria-disabled={!draftCallLink}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium",
                      draftCallLink ? "border-border/70 bg-background/75 text-foreground hover:bg-muted" : "cursor-not-allowed border-dashed border-border/70 bg-muted/40 text-muted-foreground"
                    )}
                  >
                    <Phone className="h-4 w-4" />
                    {copy("Test call", "Проверить звонок", "בדוק שיחה")}
                  </a>
                  {!projectForm.contact_name.trim() && !projectForm.contact_phone.trim() && !projectForm.developer_whatsapp.trim() ? (
                    <div className="rounded-xl border border-[hsl(var(--warning)/0.35)] bg-[hsl(var(--warning)/0.08)] px-3 py-2 text-xs text-[hsl(var(--warning-foreground))]">
                      {copy("Add contacts to unlock quick field actions.", "Добавьте контакты, чтобы включить быстрые полевые действия.", "הוסף אנשי קשר כדי להפעיל פעולות שטח מהירות.")}
                    </div>
                  ) : null}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <DialogFooter>
            <Button variant="outline" onClick={() => setProjectDialogOpen(false)} disabled={projectSubmitting}>
              {copy("Cancel", "Отмена", "ביטול")}
            </Button>
            <Button onClick={() => void handleProjectSubmit()} disabled={projectSubmitting}>
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
              {copy("Add urgency surcharge", "Добавить срочную надбавку", "הוסף תוספת דחיפות")}
            </DialogTitle>
            <DialogDescription>
              {copy(
                "Record one approved urgency uplift row for this project or for a specific order number.",
                "Зафиксируйте одну утверждённую строку срочной надбавки для проекта или конкретного номера заказа.",
                "רשום שורת תוספת דחיפות מאושרת אחת לפרויקט או למספר הזמנה מסוים."
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="urgency-scope">{copy("Scope", "Скоуп", "היקף")}</Label>
              <select
                id="urgency-scope"
                value={urgencyForm.scope}
                onChange={(event) =>
                  setUrgencyForm((prev) => ({
                    ...prev,
                    scope: event.target.value === "ORDER_NUMBER" ? "ORDER_NUMBER" : "PROJECT",
                    order_number: event.target.value === "ORDER_NUMBER" ? prev.order_number : "",
                  }))
                }
                className="control-input"
              >
                <option value="PROJECT">{copy("Project", "Проект", "פרויקט")}</option>
                <option value="ORDER_NUMBER">{copy("Order number", "Номер заказа", "מספר הזמנה")}</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="urgency-order">{copy("Order number", "Номер заказа", "מספר הזמנה")}</Label>
              <Input
                id="urgency-order"
                value={urgencyForm.order_number}
                onChange={(event) =>
                  setUrgencyForm((prev) => ({ ...prev, order_number: event.target.value }))
                }
                disabled={urgencyForm.scope !== "ORDER_NUMBER"}
                placeholder="AZ-5001"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="urgency-reason">{copy("Reason", "Причина", "סיבה")}</Label>
              <Input
                id="urgency-reason"
                value={urgencyForm.reason}
                onChange={(event) =>
                  setUrgencyForm((prev) => ({ ...prev, reason: event.target.value }))
                }
                placeholder={copy("Late-night urgent install", "Срочный ночной монтаж", "התקנה דחופה בלילה")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="urgency-client">{copy("Client amount", "Сумма клиента", "סכום לקוח")}</Label>
              <Input
                id="urgency-client"
                value={urgencyForm.client_amount}
                onChange={(event) =>
                  setUrgencyForm((prev) => ({ ...prev, client_amount: event.target.value }))
                }
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="urgency-installer">{copy("Installer amount", "Сумма монтажника", "סכום מתקין")}</Label>
              <Input
                id="urgency-installer"
                value={urgencyForm.installer_amount}
                onChange={(event) =>
                  setUrgencyForm((prev) => ({ ...prev, installer_amount: event.target.value }))
                }
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="urgency-effective">{copy("Effective date", "Дата действия", "תאריך תחולה")}</Label>
              <Input
                id="urgency-effective"
                type="date"
                value={urgencyForm.effective_date}
                onChange={(event) =>
                  setUrgencyForm((prev) => ({ ...prev, effective_date: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="urgency-notes">{copy("Notes", "Примечание", "הערה")}</Label>
              <Input
                id="urgency-notes"
                value={urgencyForm.notes}
                onChange={(event) =>
                  setUrgencyForm((prev) => ({ ...prev, notes: event.target.value }))
                }
                placeholder={copy("Approval note", "Комментарий по согласованию", "הערת אישור")}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUrgencyDialogOpen(false)} disabled={urgencySubmitting}>
              {copy("Cancel", "Отмена", "ביטול")}
            </Button>
            <Button onClick={() => void handleUrgencySubmit()} disabled={urgencySubmitting}>
              {urgencySubmitting
                ? copy("Saving...", "Сохраняем...", "שומר...")
                : copy("Save surcharge", "Сохранить надбавку", "שמור תוספת")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={additionalWorkDialogOpen} onOpenChange={setAdditionalWorkDialogOpen}>
        <DialogContent className="max-w-[760px]">
          <DialogHeader>
            <DialogTitle>
              {copy("Add additional work", "Добавить доп. работу", "הוסף עבודה נוספת")}
            </DialogTitle>
            <DialogDescription>
              {copy(
                "Create one planned add-on line for the selected project. Installers will later record facts against this plan.",
                "Создайте одну плановую строку доп. работ для выбранного проекта. Позже монтажники будут фиксировать факты по этому плану.",
                "צור שורת add-on מתוכננת אחת לפרויקט הנבחר. בהמשך מתקינים ידווחו ביצוע בפועל מול התוכנית הזו."
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
                  setAdditionalWorkForm((prev) => ({ ...prev, addon_type_id: event.target.value }))
                }
                className="control-input"
              >
                <option value="">{copy("Choose add-on", "Выберите доп. работу", "בחר עבודה נוספת")}</option>
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
                  setAdditionalWorkForm((prev) => ({ ...prev, qty_planned: event.target.value }))
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
                  setAdditionalWorkForm((prev) => ({ ...prev, client_price: event.target.value }))
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
                  setAdditionalWorkForm((prev) => ({ ...prev, installer_price: event.target.value }))
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
                  setAdditionalWorkForm((prev) => ({ ...prev, notes: event.target.value }))
                }
                placeholder={copy("Optional planning note", "Необязательная заметка", "הערת תכנון אופציונלית")}
              />
            </div>
          </div>

          <div className="text-[12px] text-muted-foreground">
            {selectedAddonType
              ? copy(
                  `Selected unit: ${selectedAddonType.unit || "-"}`,
                  `Выбранная единица: ${selectedAddonType.unit || "-"}`,
                  `יחידת המדידה שנבחרה: ${selectedAddonType.unit || "-"}`
                )
              : copy(
                  "Select an add-on type to confirm unit and pricing row.",
                  "Выберите тип доп. работы, чтобы подтвердить единицу и ценовую строку.",
                  "בחר סוג עבודה נוספת כדי לאשר יחידה ושורת תמחור."
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
            <Button onClick={() => void handleAdditionalWorkSubmit()} disabled={additionalWorkSubmitting}>
              {additionalWorkSubmitting
                ? copy("Saving...", "Сохраняем...", "שומר...")
                : copy("Save additional work", "Сохранить доп. работу", "שמור עבודה נוספת")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={manualDoorDialogOpen} onOpenChange={setManualDoorDialogOpen}>
        <DialogContent className="max-w-[840px]">
          <DialogHeader>
            <DialogTitle>
              {copy("Add door manually", "Добавить дверь вручную", "הוסף דלת ידנית")}
            </DialogTitle>
            <DialogDescription>
              {copy(
                "Create one operational door row directly in the selected project using a product from Library.",
                "Создайте одну рабочую строку двери прямо в выбранном проекте, используя продукт из Library.",
                "צור רשומת דלת תפעולית ישירות בפרויקט הנבחר בעזרת מוצר מהספרייה."
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="manual-door-product">
                {copy("Library product", "Продукт Library", "מוצר ספרייה")}
              </Label>
              <select
                id="manual-door-product"
                value={manualDoorForm.product_id}
                onChange={(event) =>
                  setManualDoorForm((prev) => ({
                    ...prev,
                    product_id: event.target.value,
                    install_type:
                      activeLibraryProducts.find((item) => item.id === event.target.value)?.install_type ||
                      prev.install_type,
                  }))
                }
                className="control-input"
              >
                <option value="">{copy("Choose a product", "Выберите продукт", "בחר מוצר")}</option>
                {activeLibraryProducts.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.sku} - {locale === "he" ? item.name_he || item.name_ru : item.name_ru || item.name_he}
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
                  setManualDoorForm((prev) => ({ ...prev, door_code: event.target.value }))
                }
                placeholder={copy("D-1201", "D-1201", "D-1201")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-door-unit">
                {copy("Unit / apartment", "Unit / квартира", "Unit / דירה")}
              </Label>
              <Input
                id="manual-door-unit"
                value={manualDoorForm.unit}
                onChange={(event) =>
                  setManualDoorForm((prev) => ({ ...prev, unit: event.target.value }))
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
                  setManualDoorForm((prev) => ({ ...prev, floor: event.target.value }))
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
                  setManualDoorForm((prev) => ({ ...prev, location_code: event.target.value }))
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
                  setManualDoorForm((prev) => ({ ...prev, order_number: event.target.value }))
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
                  setManualDoorForm((prev) => ({ ...prev, install_type: event.target.value }))
                }
                placeholder={copy("service", "service", "service")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-door-installer">
                {copy("Assigned installer", "Назначенный монтажник", "מתקין משויך")}
              </Label>
              <select
                id="manual-door-installer"
                value={manualDoorForm.assigned_installer_id}
                onChange={(event) =>
                  setManualDoorForm((prev) => ({ ...prev, assigned_installer_id: event.target.value }))
                }
                className="control-input"
              >
                <option value="">{copy("Leave unassigned", "Оставить без назначения", "השאר ללא שיוך")}</option>
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
                {copy("Planned install date", "Плановая дата монтажа", "תאריך התקנה מתוכנן")}
              </Label>
              <Input
                id="manual-door-date"
                type="date"
                value={manualDoorForm.planned_install_date}
                onChange={(event) =>
                  setManualDoorForm((prev) => ({ ...prev, planned_install_date: event.target.value }))
                }
              />
            </div>
          </div>

          <label className="mt-3 inline-flex items-center gap-2 text-[13px] text-foreground">
            <input
              type="checkbox"
              checked={manualDoorForm.is_critical}
              onChange={(event) =>
                setManualDoorForm((prev) => ({ ...prev, is_critical: event.target.checked }))
              }
            />
            {copy("Mark as critical door", "Отметить как критичную дверь", "סמן כדלת קריטית")}
          </label>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setManualDoorDialogOpen(false)}
              disabled={manualDoorSubmitting}
            >
              {copy("Cancel", "Отмена", "ביטול")}
            </Button>
            <Button onClick={() => void handleManualDoorSubmit()} disabled={manualDoorSubmitting}>
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



