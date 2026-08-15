"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  CalendarDays,
  CheckCheck,
  Download,
  History,
  RefreshCw,
  RotateCcw,
  X,
} from "lucide-react";

import { DashboardLayout } from "@/components/DashboardLayout";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAuthSession } from "@/hooks/use-auth-session";
import { apiDownload, apiFetch } from "@/lib/api";
import { readableApiError } from "@/lib/api-error-display";
import { canRunPrivilegedAdminActions, canViewRates } from "@/lib/admin-access";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type LedgerEntryType = "ORIGINAL" | "REVERSAL" | "CORRECTION";
type LedgerWorkKind = "DOOR" | "ADDON";

type EarningsLedgerItem = {
  id: string;
  entry_type: LedgerEntryType;
  correction_ref_id: string | null;
  completed_at: string;
  quantity: string | number;
  rate_snapshot: string | number;
  amount_snapshot: string | number;
  reason: string | null;
  work_kind: LedgerWorkKind;
  project_id: string | null;
  project_name: string | null;
  door_id: string | null;
  door_label: string | null;
  door_code: string | null;
  addon_fact_id: string | null;
  addon_type_id?: string | null;
  addon_type_name?: string | null;
  addon_comment?: string | null;
  installer_id: string;
  installer_name: string | null;
  can_correct: boolean;
};

type EarningsLedgerResponse = {
  items: EarningsLedgerItem[];
  total: number;
  limit: number;
  offset: number;
};

type InstallerOption = {
  id: string;
  full_name: string;
};

type ProjectOption = {
  id: string;
  name: string;
};

type ListResponse<T> = T[] | { items?: T[] };

type CorrectionResponse = {
  correction: {
    id: string;
    amount_snapshot: string | number;
  };
};

const LEDGER_PAGE_SIZE = 25;
const LEDGER_EXPORT_LIMIT = 10000;
const LEDGER_ROUTE = "/earnings-ledger";

function normalizeItems<T>(response: ListResponse<T>): T[] {
  return Array.isArray(response) ? response : response.items || [];
}

function formatMoney(value: string | number | null | undefined): string {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) {
    return String(value ?? "-");
  }
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

function formatCompactDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

function dateFromValue(value: string): string | null {
  if (!value) {
    return null;
  }
  return new Date(`${value}T00:00:00`).toISOString();
}

function dateInputValue(value: string | null | undefined): string {
  if (!value) {
    return "";
  }
  return value.slice(0, 10);
}

function dateInputFromDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthRange(reference: Date): { from: string; to: string } {
  const start = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const end = new Date(reference.getFullYear(), reference.getMonth() + 1, 0);
  return {
    from: dateInputFromDate(start),
    to: dateInputFromDate(end),
  };
}

function entryTypeValue(
  value: string | null | undefined,
): LedgerEntryType | "all" {
  return value === "ORIGINAL" || value === "REVERSAL" || value === "CORRECTION"
    ? value
    : "all";
}

function workKindValue(
  value: string | null | undefined,
): LedgerWorkKind | "all" {
  return value === "DOOR" || value === "ADDON" ? value : "all";
}

function dateToValue(value: string): string | null {
  if (!value) {
    return null;
  }
  return new Date(`${value}T23:59:59.999`).toISOString();
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

async function downloadCsvExport(
  pathWithQuery: string,
  fallbackFilename: string,
): Promise<void> {
  const response = await apiDownload(pathWithQuery, {
    method: "GET",
    credentials: "include",
  });
  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition") || "";
  const match = disposition.match(/filename=\"?([^"]+)\"?/i);
  downloadBlob(blob, match?.[1] || fallbackFilename);
}

function entryTone(entryType: LedgerEntryType): string {
  if (entryType === "ORIGINAL") {
    return "border-status-ok-border bg-status-ok-bg text-status-ok-fg";
  }
  if (entryType === "REVERSAL") {
    return "border-status-problem-border bg-status-problem-bg text-status-problem-fg";
  }
  return "border-status-warning-border bg-status-warning-bg text-status-warning-fg";
}

function ledgerNoticeClass(tone: "success" | "error"): string {
  return cn(
    "flex rounded-lg border px-4 py-3 text-[13px]",
    tone === "success" &&
      "items-center gap-2 border-status-ok-border bg-status-ok-bg text-status-ok-fg",
    tone === "error" &&
      "items-start gap-2 border-status-problem-border bg-status-problem-bg text-status-problem-fg",
  );
}

function ledgerWarningClass(): string {
  return "flex rounded-lg border border-status-warning-border bg-status-warning-bg px-4 py-3 text-[13px] text-status-warning-fg";
}

function workLabel(item: EarningsLedgerItem): string {
  if (item.work_kind === "ADDON") {
    return item.addon_type_name || item.addon_fact_id || "-";
  }
  return item.door_label || item.door_code || "-";
}

function workReference(item: EarningsLedgerItem): string | null {
  if (item.work_kind === "ADDON") {
    return (
      item.addon_comment || item.addon_fact_id || item.addon_type_id || null
    );
  }
  return item.door_code || item.door_id || null;
}

export default function EarningsLedgerPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const session = useAuthSession();
  const { locale } = useI18n();
  const hasRateAccess = canViewRates(session);
  const canCorrectRates =
    hasRateAccess && canRunPrivilegedAdminActions(session);
  const [installerId, setInstallerId] = useState(
    searchParams?.get("installer_id") || "",
  );
  const [projectId, setProjectId] = useState(
    searchParams?.get("project_id") || "",
  );
  const [dateFrom, setDateFrom] = useState(
    dateInputValue(searchParams?.get("date_from")),
  );
  const [dateTo, setDateTo] = useState(
    dateInputValue(searchParams?.get("date_to")),
  );
  const [entryType, setEntryType] = useState<LedgerEntryType | "all">(
    entryTypeValue(searchParams?.get("entry_type")),
  );
  const [workKind, setWorkKind] = useState<LedgerWorkKind | "all">(
    workKindValue(searchParams?.get("work_kind")),
  );
  const [offset, setOffset] = useState(0);
  const [selectedEntry, setSelectedEntry] = useState<EarningsLedgerItem | null>(
    null,
  );
  const [newRate, setNewRate] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const copy = (en: string, ru: string, he: string) => {
    if (locale === "ru") return ru;
    if (locale === "he") return he;
    return en;
  };

  useEffect(() => {
    if (!hasRateAccess || typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams();
    if (installerId) params.set("installer_id", installerId);
    if (projectId) params.set("project_id", projectId);
    if (entryType !== "all") params.set("entry_type", entryType);
    if (workKind !== "all") params.set("work_kind", workKind);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);

    const nextSearch = params.toString();
    const nextUrl = nextSearch ? `${LEDGER_ROUTE}?${nextSearch}` : LEDGER_ROUTE;
    window.history.replaceState(window.history.state, "", nextUrl);
  }, [
    dateFrom,
    dateTo,
    entryType,
    hasRateAccess,
    installerId,
    projectId,
    workKind,
  ]);

  const ledgerPath = useMemo(() => {
    const params = new URLSearchParams();
    params.set("limit", String(LEDGER_PAGE_SIZE));
    params.set("offset", String(offset));
    if (installerId) params.set("installer_id", installerId);
    if (projectId) params.set("project_id", projectId);
    if (entryType !== "all") params.set("entry_type", entryType);
    if (workKind !== "all") params.set("work_kind", workKind);
    const from = dateFromValue(dateFrom);
    const to = dateToValue(dateTo);
    if (from) params.set("date_from", from);
    if (to) params.set("date_to", to);
    return `/api/v1/admin/earnings/ledger?${params.toString()}`;
  }, [dateFrom, dateTo, entryType, installerId, offset, projectId, workKind]);

  const installersQuery = useQuery({
    queryKey: ["earnings-ledger-installers"],
    queryFn: async () =>
      normalizeItems(
        await apiFetch<ListResponse<InstallerOption>>(
          "/api/v1/admin/installers?limit=200",
        ),
      ),
    enabled: hasRateAccess,
    refetchInterval: 120_000,
  });

  const projectsQuery = useQuery({
    queryKey: ["earnings-ledger-projects"],
    queryFn: async () =>
      normalizeItems(
        await apiFetch<ListResponse<ProjectOption>>("/api/v1/admin/projects"),
      ),
    enabled: hasRateAccess,
    refetchInterval: 120_000,
  });

  const availableProjects = projectsQuery.data || [];
  const projectScopePending = Boolean(projectId && projectsQuery.isLoading);
  const projectFilterMissing = Boolean(
    projectId &&
      projectsQuery.isFetched &&
      !projectsQuery.isLoading &&
      !availableProjects.some((project) => project.id === projectId),
  );
  const ledgerEnabled =
    hasRateAccess && !projectScopePending && !projectFilterMissing;

  const ledgerQuery = useQuery({
    queryKey: ["earnings-ledger", ledgerPath],
    queryFn: () => apiFetch<EarningsLedgerResponse>(ledgerPath),
    enabled: ledgerEnabled,
    refetchInterval: 30_000,
  });

  const correctionMutation = useMutation({
    mutationFn: () => {
      if (!canCorrectRates) {
        throw new Error("Correction access denied");
      }
      if (!selectedEntry) {
        throw new Error("No ledger entry selected");
      }
      return apiFetch<CorrectionResponse>(
        "/api/v1/admin/earnings/corrections",
        {
          method: "POST",
          body: JSON.stringify({
            completed_work_id: selectedEntry.id,
            rate_snapshot: newRate,
            reason: correctionReason.trim(),
          }),
        },
      );
    },
    onSuccess: async (response) => {
      setNotice(
        copy(
          `Correction saved: ${formatMoney(response.correction.amount_snapshot)}`,
          `Коррекция сохранена: ${formatMoney(response.correction.amount_snapshot)}`,
          `התיקון נשמר: ${formatMoney(response.correction.amount_snapshot)}`,
        ),
      );
      setSelectedEntry(null);
      setNewRate("");
      setCorrectionReason("");
      await queryClient.invalidateQueries({ queryKey: ["earnings-ledger"] });
    },
  });

  const exportMutation = useMutation({
    mutationFn: () => {
      if (projectFilterMissing) {
        throw new Error("Project filter is not available in the current scope");
      }
      const params = new URLSearchParams();
      params.set("limit", String(LEDGER_EXPORT_LIMIT));
      params.set("offset", "0");
      if (installerId) params.set("installer_id", installerId);
      if (projectId) params.set("project_id", projectId);
      if (entryType !== "all") params.set("entry_type", entryType);
      if (workKind !== "all") params.set("work_kind", workKind);
      const from = dateFromValue(dateFrom);
      const to = dateToValue(dateTo);
      if (from) params.set("date_from", from);
      if (to) params.set("date_to", to);
      return downloadCsvExport(
        `/api/v1/admin/earnings/ledger/export?${params.toString()}`,
        "earnings_ledger.csv",
      );
    },
    onSuccess: () => {
      setNotice(
        copy(
          "Ledger export is ready.",
          "Экспорт начислений готов.",
          "ייצוא יומן התשלומים מוכן.",
        ),
      );
    },
  });

  const items = ledgerQuery.data?.items || [];
  const canPrev = offset > 0;
  const canNext = offset + LEDGER_PAGE_SIZE < (ledgerQuery.data?.total || 0);
  const totalAmount = items.reduce(
    (sum, item) => sum + Number(item.amount_snapshot || 0),
    0,
  );
  const parsedNewRate = Number(newRate);
  const hasValidNewRate =
    newRate.trim() !== "" &&
    Number.isFinite(parsedNewRate) &&
    parsedNewRate > 0;
  const correctionDisabled =
    !canCorrectRates ||
    correctionMutation.isPending ||
    !selectedEntry ||
    !hasValidNewRate ||
    !correctionReason.trim();
  const selectedInstallerName =
    installersQuery.data?.find((installer) => installer.id === installerId)
      ?.full_name || installerId;
  const selectedProjectName =
    availableProjects.find((project) => project.id === projectId)?.name ||
    projectId;
  const activeFilters = [
    installerId
      ? {
          key: "installer",
          label: copy("Installer", "Монтажник", "מתקין"),
          value: selectedInstallerName,
        }
      : null,
    projectId
      ? {
          key: "project",
          label: copy("Project", "Объект", "פרויקט"),
          value: selectedProjectName,
        }
      : null,
    entryType !== "all"
      ? {
          key: "entryType",
          label: copy("Entry", "Запись", "רשומה"),
          value: entryType,
        }
      : null,
    workKind !== "all"
      ? {
          key: "workKind",
          label: copy("Work", "Работа", "עבודה"),
          value: workKind,
        }
      : null,
    dateFrom || dateTo
      ? {
          key: "period",
          label: copy("Period", "Период", "תקופה"),
          value: `${dateFrom || copy("Any start", "Любое начало", "כל התחלה")} - ${
            dateTo || copy("Any end", "Любой конец", "כל סיום")
          }`,
        }
      : null,
  ].filter((filter): filter is { key: string; label: string; value: string } =>
    Boolean(filter),
  );
  const hasActiveFilters = activeFilters.length > 0;

  const resetPaging = () => setOffset(0);
  const applyPeriod = (range: { from: string; to: string }) => {
    setDateFrom(range.from);
    setDateTo(range.to);
    resetPaging();
  };
  const applyCurrentMonth = () => applyPeriod(monthRange(new Date()));
  const applyPreviousMonth = () => {
    const now = new Date();
    applyPeriod(monthRange(new Date(now.getFullYear(), now.getMonth() - 1, 1)));
  };
  const clearPeriod = () => {
    setDateFrom("");
    setDateTo("");
    resetPaging();
  };
  const clearAllFilters = () => {
    setInstallerId("");
    setProjectId("");
    setEntryType("all");
    setWorkKind("all");
    setDateFrom("");
    setDateTo("");
    resetPaging();
  };

  if (!hasRateAccess) {
    return (
      <DashboardLayout>
        <div className="page-shell page-stack-tight motion-stagger">
          <section className="rounded-lg border border-border bg-surface p-5 sm:p-6">
            <div className="mb-2 text-[10.5px] font-medium uppercase text-text-secondary">
              Payroll
            </div>
            <h1 className="dmx-page-title">
              {copy("Earnings Ledger", "Реестр начислений", "יומן תשלומים")}
            </h1>
          </section>
          <div className={ledgerNoticeClass("error")}>
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {copy(
              "Payroll ledger requires finance access.",
              "Реестр начислений требует финансового доступа.",
              "יומן התשלומים דורש גישת כספים.",
            )}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="page-shell page-stack-tight motion-stagger">
        <section className="dmx-page-header">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <div className="mb-2 text-[10.5px] font-medium uppercase text-text-secondary">
                Payroll
              </div>
              <h1 className="dmx-page-title">
                {copy("Earnings Ledger", "Реестр начислений", "יומן תשלומים")}
              </h1>
              <p className="dmx-page-subtitle mt-1 max-w-2xl">
                {copy(
                  "Audit installer payouts, reversals and rate corrections without changing door status logic.",
                  "Проверка выплат монтажникам, откатов и корректировок ставок без изменения статусов дверей.",
                  "בקרת תשלומים, ביטולים ותיקוני תעריפים בלי לשנות סטטוס דלת.",
                )}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="dmx-week-pill">
                  {copy("Rows", "Строк", "שורות")}{" "}
                  {ledgerQuery.data?.total ?? 0}
                </span>
                <span className="dmx-week-pill">
                  {copy("Visible amount", "Сумма на экране", "סכום מוצג")}{" "}
                  {formatMoney(totalAmount)}
                </span>
              </div>
            </div>
            <div className="surface-subtle min-w-[280px] max-w-lg p-4 sm:p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border bg-surface px-3 py-3">
                  <div className="text-[11px] font-medium uppercase text-text-secondary">
                    {copy("Scope", "Фильтр", "סינון")}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-text">
                    {entryType === "all"
                      ? copy("All entries", "Все записи", "כל הרשומות")
                      : entryType}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-surface px-3 py-3">
                  <div className="text-[11px] font-medium uppercase text-text-secondary">
                    {copy("Work kind", "Тип работы", "סוג עבודה")}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-text">
                    {workKind === "all"
                      ? copy("Door + addon", "Двери + допы", "דלת + תוספות")
                      : workKind}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="dmx-secondary-action mt-4 h-9 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => ledgerQuery.refetch()}
                disabled={
                  ledgerQuery.isFetching ||
                  projectScopePending ||
                  projectFilterMissing
                }
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {copy("Refresh", "Обновить", "רענן")}
              </button>
              <button
                type="button"
                className="dmx-primary-action mt-4 h-9 disabled:cursor-not-allowed disabled:opacity-50 sm:ms-2"
                onClick={() => exportMutation.mutate()}
                disabled={
                  exportMutation.isPending ||
                  ledgerQuery.isLoading ||
                  projectScopePending ||
                  projectFilterMissing
                }
              >
                <Download className="h-3.5 w-3.5" />
                {copy("Export CSV", "Экспорт CSV", "ייצוא CSV")}
              </button>
            </div>
          </div>
          {hasActiveFilters ? (
            <div
              aria-label={copy(
                "Active ledger filters",
                "Активные фильтры реестра",
                "מסנני יומן פעילים",
              )}
              className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3"
            >
              <span className="text-xs font-semibold uppercase text-text-secondary">
                {copy("Active filters", "Активные фильтры", "מסננים פעילים")}
              </span>
              {activeFilters.map((filter) => (
                <span
                  key={filter.key}
                  className="inline-flex min-h-8 max-w-full items-center gap-1 rounded-full border border-border bg-surface-subtle px-2.5 py-1 text-xs text-text"
                >
                  <span className="text-text-secondary">{filter.label}</span>
                  <span className="max-w-[220px] truncate font-medium">
                    {filter.value}
                  </span>
                </span>
              ))}
              <button
                type="button"
                className="dmx-secondary-action h-8"
                onClick={clearAllFilters}
              >
                <X className="h-3.5 w-3.5" />
                {copy(
                  "Clear all filters",
                  "Сбросить все фильтры",
                  "נקה את כל המסננים",
                )}
              </button>
            </div>
          ) : null}
        </section>

        {projectFilterMissing ? (
          <div className={ledgerWarningClass()}>
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span>
                {copy(
                  `Requested project ${projectId} is not available in the current payroll scope. The ledger was not loaded for another project.`,
                  `Объект ${projectId} недоступен в текущем контексте начислений. Реестр не был загружен по другому объекту.`,
                  `הפרויקט ${projectId} אינו זמין בהקשר השכר הנוכחי. היומן לא נטען עבור פרויקט אחר.`,
                )}
              </span>
              <button
                type="button"
                className="dmx-secondary-action shrink-0"
                onClick={() => {
                  setProjectId("");
                  resetPaging();
                }}
              >
                {copy("Show all projects", "Показать все объекты", "הצג את כל הפרויקטים")}
              </button>
            </div>
          </div>
        ) : null}

        <section className="toolbar-panel page-stack-tight">
          <div className="toolbar-row">
            <select
              aria-label={copy(
                "Installer filter",
                "Фильтр монтажника",
                "מסנן מתקין",
              )}
              value={installerId}
              onChange={(event) => {
                setInstallerId(event.target.value);
                resetPaging();
              }}
              className="control-input min-w-[220px]"
            >
              <option value="">
                {copy("All installers", "Все монтажники", "כל המתקינים")}
              </option>
              {(installersQuery.data || []).map((installer) => (
                <option key={installer.id} value={installer.id}>
                  {installer.full_name}
                </option>
              ))}
            </select>
            <select
              aria-label={copy(
                "Project filter",
                "Фильтр объекта",
                "מסנן פרויקט",
              )}
              value={projectId}
              onChange={(event) => {
                setProjectId(event.target.value);
                resetPaging();
              }}
              className="control-input min-w-[220px]"
            >
              <option value="">
                {copy("All projects", "Все объекты", "כל הפרויקטים")}
              </option>
              {availableProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <select
              aria-label={copy(
                "Entry type filter",
                "Фильтр типа записи",
                "מסנן סוג רשומה",
              )}
              value={entryType}
              onChange={(event) => {
                setEntryType(event.target.value as LedgerEntryType | "all");
                resetPaging();
              }}
              className="control-input min-w-[180px]"
            >
              <option value="all">
                {copy("All entries", "Все записи", "כל הרשומות")}
              </option>
              <option value="ORIGINAL">ORIGINAL</option>
              <option value="REVERSAL">REVERSAL</option>
              <option value="CORRECTION">CORRECTION</option>
            </select>
            <select
              aria-label={copy(
                "Work kind filter",
                "Фильтр типа работы",
                "מסנן סוג עבודה",
              )}
              value={workKind}
              onChange={(event) => {
                setWorkKind(event.target.value as LedgerWorkKind | "all");
                resetPaging();
              }}
              className="control-input min-w-[150px]"
            >
              <option value="all">
                {copy("Door + addon", "Двери + допы", "דלת + תוספות")}
              </option>
              <option value="DOOR">DOOR</option>
              <option value="ADDON">ADDON</option>
            </select>
            <div className="field-stack min-w-[160px]">
              <label
                className="field-label"
                htmlFor="earnings-ledger-date-from"
              >
                {copy("Date from", "Дата от", "מתאריך")}
              </label>
              <input
                id="earnings-ledger-date-from"
                type="date"
                value={dateFrom}
                onChange={(event) => {
                  setDateFrom(event.target.value);
                  resetPaging();
                }}
                className="control-input"
              />
            </div>
            <div className="field-stack min-w-[160px]">
              <label className="field-label" htmlFor="earnings-ledger-date-to">
                {copy("Date to", "Дата до", "עד תאריך")}
              </label>
              <input
                id="earnings-ledger-date-to"
                type="date"
                value={dateTo}
                onChange={(event) => {
                  setDateTo(event.target.value);
                  resetPaging();
                }}
                className="control-input"
              />
            </div>
            <div className="flex min-w-[260px] flex-wrap items-end gap-2 self-end">
              <button
                type="button"
                className="dmx-secondary-action h-10"
                onClick={applyCurrentMonth}
              >
                <CalendarDays className="h-3.5 w-3.5" />
                {copy("This month", "Этот месяц", "החודש")}
              </button>
              <button
                type="button"
                className="dmx-secondary-action h-10"
                onClick={applyPreviousMonth}
              >
                <History className="h-3.5 w-3.5" />
                {copy("Last month", "Прошлый месяц", "חודש קודם")}
              </button>
              <button
                type="button"
                className="dmx-secondary-action h-10 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={clearPeriod}
                disabled={!dateFrom && !dateTo}
              >
                <X className="h-3.5 w-3.5" />
                {copy("Clear dates", "Сброс дат", "נקה תאריכים")}
              </button>
            </div>
          </div>
        </section>

        {notice ? (
          <div className={ledgerNoticeClass("success")}>
            <CheckCheck className="h-4 w-4 shrink-0" />
            {notice}
          </div>
        ) : null}

        {ledgerQuery.isError ||
        correctionMutation.isError ||
        exportMutation.isError ? (
          <div className={ledgerNoticeClass("error")}>
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {readableApiError(
                ledgerQuery.error ||
                  correctionMutation.error ||
                  exportMutation.error,
                locale,
                copy(
                  "Failed to load, update or export earnings ledger.",
                  "Не удалось загрузить, обновить или экспортировать реестр начислений.",
                  "טעינת, עדכון או ייצוא יומן התשלומים נכשלו.",
                ),
              )}
            </span>
          </div>
        ) : null}

        <section className="data-table-shell overflow-hidden">
          <div className="divide-y divide-border-subtle md:hidden">
            {ledgerQuery.isLoading ? (
              <div className="px-4 py-8 text-sm text-text-secondary">
                {copy(
                  "Loading ledger...",
                  "Загружаем реестр...",
                  "טוען יומן...",
                )}
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-8 text-sm text-text-secondary">
                {copy(
                  "No ledger entries match current filters.",
                  "Нет начислений по текущим фильтрам.",
                  "אין רשומות לפי הסינון הנוכחי.",
                )}
              </div>
            ) : (
              items.map((item) => {
                const amount = Number(item.amount_snapshot);
                const reference = workReference(item);

                return (
                  <article key={item.id} className="px-3.5 py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={cn(
                              "inline-flex rounded-full border px-2 py-1 text-[10.5px] font-semibold leading-none",
                              entryTone(item.entry_type),
                            )}
                          >
                            {item.entry_type}
                          </span>
                          <span className="inline-flex rounded-full bg-surface-sunken px-2 py-1 text-[10.5px] font-medium leading-none text-text-secondary">
                            {item.work_kind}
                          </span>
                        </div>
                        <div className="mt-2 truncate text-[13px] font-semibold text-text">
                          {item.project_name || item.project_id || "-"}
                        </div>
                        <div className="mt-0.5 truncate text-[12px] text-text-secondary">
                          {workLabel(item)}
                        </div>
                      </div>
                      <div
                        className={cn(
                          "shrink-0 text-end text-[17px] font-medium leading-tight tabular-nums",
                          amount < 0 ? "text-status-problem-fg" : "text-text",
                        )}
                      >
                        {formatMoney(item.amount_snapshot)}
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="min-w-0 rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                        <div className="text-[11px] font-medium uppercase text-text-secondary">
                          {copy("Installer", "Монтажник", "מתקין")}
                        </div>
                        <div className="mt-1 truncate text-[12px] font-medium text-text">
                          {item.installer_name || item.installer_id}
                        </div>
                      </div>
                      <div className="min-w-0 rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                        <div className="text-[11px] font-medium uppercase text-text-secondary">
                          {copy("Date", "Дата", "תאריך")}
                        </div>
                        <div
                          className="mt-1 truncate text-[12px] text-text-secondary tabular-nums"
                          dir="ltr"
                        >
                          {formatCompactDateTime(item.completed_at)}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                        <div className="text-[11px] font-medium uppercase text-text-secondary">
                          {copy("Qty", "Кол-во", "כמות")}
                        </div>
                        <div className="mt-1 text-[13px] font-medium text-text tabular-nums">
                          {formatMoney(item.quantity)}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                        <div className="text-[11px] font-medium uppercase text-text-secondary">
                          {copy("Rate", "Ставка", "תעריף")}
                        </div>
                        <div className="mt-1 text-[13px] font-medium text-text tabular-nums">
                          {formatMoney(item.rate_snapshot)}
                        </div>
                      </div>
                    </div>

                    {reference || item.reason ? (
                      <div className="mt-3 rounded-lg border border-border bg-surface-subtle px-3 py-2 text-[12px] leading-5 text-text-secondary">
                        {reference ? (
                          <div className="truncate">{reference}</div>
                        ) : null}
                        {item.reason ? (
                          <div className={cn(reference && "mt-1")}>
                            {item.reason}
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-border-subtle pt-3">
                      <div className="min-w-0 text-[11px] text-text-secondary">
                        {copy(
                          "Payroll entry",
                          "Запись начисления",
                          "רשומת תשלום",
                        )}
                      </div>
                      <button
                        type="button"
                        className="dmx-secondary-action h-8 shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={!canCorrectRates || !item.can_correct}
                        onClick={() => {
                          setSelectedEntry(item);
                          setNewRate(String(item.rate_snapshot ?? ""));
                          setCorrectionReason("");
                        }}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        {copy("Correct", "Коррекция", "תקן")}
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>

          <div className="hidden md:block">
            <Table className="min-w-[980px]">
              <TableHeader className="data-table-head">
                <TableRow className="border-b border-border hover:bg-transparent">
                  <TableHead>{copy("Date", "Дата", "תאריך")}</TableHead>
                  <TableHead>{copy("Type", "Тип", "סוג")}</TableHead>
                  <TableHead>
                    {copy("Installer", "Монтажник", "מתקין")}
                  </TableHead>
                  <TableHead>
                    {copy("Project / Door", "Объект / дверь", "פרויקט / דלת")}
                  </TableHead>
                  <TableHead className="text-end">
                    {copy("Qty", "Кол-во", "כמות")}
                  </TableHead>
                  <TableHead className="text-end">
                    {copy("Rate", "Ставка", "תעריף")}
                  </TableHead>
                  <TableHead className="text-end">
                    {copy("Amount", "Сумма", "סכום")}
                  </TableHead>
                  <TableHead className="w-[120px] text-end">
                    {copy("Action", "Действие", "פעולה")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledgerQuery.isLoading ? (
                  <TableRow className="data-table-row">
                    <TableCell
                      colSpan={8}
                      className="py-8 text-sm text-text-secondary"
                    >
                      {copy(
                        "Loading ledger...",
                        "Загружаем реестр...",
                        "טוען יומן...",
                      )}
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow className="data-table-row">
                    <TableCell
                      colSpan={8}
                      className="py-8 text-sm text-text-secondary"
                    >
                      {copy(
                        "No ledger entries match current filters.",
                        "Нет начислений по текущим фильтрам.",
                        "אין רשומות לפי הסינון הנוכחי.",
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow
                      key={item.id}
                      className="data-table-row align-top"
                    >
                      <TableCell className="whitespace-nowrap text-text-secondary">
                        {formatDateTime(item.completed_at)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold",
                            entryTone(item.entry_type),
                          )}
                        >
                          {item.entry_type}
                        </span>
                        <div className="mt-1 text-[11px] text-text-secondary">
                          {item.work_kind}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-text">
                        {item.installer_name || item.installer_id}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-text">
                          {item.project_name || item.project_id || "-"}
                        </div>
                        <div className="text-[12px] text-text-secondary">
                          {workLabel(item)}
                        </div>
                        {workReference(item) ? (
                          <div className="mt-0.5 max-w-[360px] text-[11px] text-text-secondary">
                            {workReference(item)}
                          </div>
                        ) : null}
                        {item.reason ? (
                          <div className="mt-1 max-w-[360px] text-[12px] text-text-secondary">
                            {item.reason}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-end tabular-nums">
                        {formatMoney(item.quantity)}
                      </TableCell>
                      <TableCell className="text-end tabular-nums">
                        {formatMoney(item.rate_snapshot)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-end font-semibold tabular-nums",
                          Number(item.amount_snapshot) < 0
                            ? "text-status-problem-fg"
                            : "text-text",
                        )}
                      >
                        {formatMoney(item.amount_snapshot)}
                      </TableCell>
                      <TableCell className="text-end">
                        <button
                          type="button"
                          className="dmx-secondary-action h-8 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={!canCorrectRates || !item.can_correct}
                          onClick={() => {
                            setSelectedEntry(item);
                            setNewRate(String(item.rate_snapshot ?? ""));
                            setCorrectionReason("");
                          }}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          {copy("Correct", "Коррекция", "תקן")}
                        </button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-[12px]">
            <div className="text-text-secondary">
              {copy("Total", "Всего", 'סה"כ')}: {ledgerQuery.data?.total || 0}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="dmx-secondary-action h-8 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canPrev}
                onClick={() =>
                  setOffset((value) => Math.max(0, value - LEDGER_PAGE_SIZE))
                }
              >
                {copy("Prev", "Назад", "הקודם")}
              </button>
              <button
                type="button"
                className="dmx-secondary-action h-8 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canNext}
                onClick={() => setOffset((value) => value + LEDGER_PAGE_SIZE)}
              >
                {copy("Next", "Далее", "הבא")}
              </button>
            </div>
          </div>
        </section>
      </div>

      <Dialog
        open={Boolean(selectedEntry)}
        onOpenChange={(open) => !open && setSelectedEntry(null)}
      >
        <DialogContent className="max-w-[560px]">
          <DialogHeader>
            <DialogTitle>
              {copy("Correct payout rate", "Коррекция ставки", "תיקון תעריף")}
            </DialogTitle>
            <DialogDescription>
              {copy(
                "Creates reversal and correction rows. Door status and installation history are not changed.",
                "Создаёт строки отката и коррекции. Статус двери и история монтажа не меняются.",
                "יוצר שורות ביטול ותיקון. סטטוס הדלת והיסטוריית ההתקנה לא משתנים.",
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="rounded-lg border border-border bg-surface-subtle px-3 py-3 text-[13px]">
              <div className="font-medium text-text">
                {selectedEntry?.installer_name || selectedEntry?.installer_id}
              </div>
              <div className="mt-1 text-text-secondary">
                {selectedEntry?.project_name ||
                  selectedEntry?.project_id ||
                  "-"}{" "}
                · {selectedEntry ? workLabel(selectedEntry) : "-"}
              </div>
            </div>
            <div className="field-stack">
              <Label htmlFor="earnings-correction-rate">
                {copy("New rate", "Новая ставка", "תעריף חדש")}
              </Label>
              <Input
                id="earnings-correction-rate"
                value={newRate}
                onChange={(event) => setNewRate(event.target.value)}
                className="control-input"
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
              />
            </div>
            <div className="field-stack">
              <Label htmlFor="earnings-correction-reason">
                {copy("Reason", "Причина", "סיבה")}
              </Label>
              <Textarea
                id="earnings-correction-reason"
                value={correctionReason}
                onChange={(event) => setCorrectionReason(event.target.value)}
                className="control-textarea min-h-[96px]"
              />
            </div>
          </div>
          <DialogFooter>
            <button
              type="button"
              className="dmx-secondary-action h-10"
              onClick={() => setSelectedEntry(null)}
            >
              {copy("Cancel", "Отмена", "ביטול")}
            </button>
            <button
              type="button"
              className="dmx-primary-action h-10 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => correctionMutation.mutate()}
              disabled={correctionDisabled}
            >
              {copy("Save correction", "Сохранить коррекцию", "שמור תיקון")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
