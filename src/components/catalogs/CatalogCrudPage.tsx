import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCheck,
  Download,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { DimaxPageHeader } from "@/components/DimaxPageHeader";
import { KpiCard as DimaxKpiCard } from "@/components/dimax";
import { Checkbox } from "@/components/ui/checkbox";
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
import { apiFetch } from "@/lib/api";
import { readableApiError } from "@/lib/api-error-display";
import {
  canManageImports,
  canRunPrivilegedAdminActions,
} from "@/lib/admin-access";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
type CatalogItem = {
  id: string;
  company_id: string;
  code: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};
type CatalogExportResponse = { items: CatalogItem[] };
type CatalogImportResponse = {
  created: number;
  updated: number;
  unchanged: number;
  skipped_existing: number;
};
type CatalogBulkResponse = {
  affected: number;
  not_found: number;
  unchanged: number;
};
type CatalogForm = { code: string; name: string; is_active: boolean };
type CatalogCrudPageProps = {
  title: string;
  subtitle: string;
  eyebrow?: string;
  purpose: string;
  endpoint: "/api/v1/admin/door-types" | "/api/v1/admin/reasons";
  queryKey: "door-types" | "reasons";
  entityLabel: string;
};
const CODE_RE = /^[A-Za-z0-9_-]{2,64}$/;
function emptyForm(): CatalogForm {
  return { code: "", name: "", is_active: true };
}
function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}
function catalogNoticeClass(tone: "success" | "error"): string {
  return cn(
    "flex rounded-lg border px-4 py-3 text-[13px]",
    tone === "success" &&
      "items-center gap-2 border-status-ok-border bg-status-ok-bg text-status-ok-fg",
    tone === "error" &&
      "items-start gap-2 border-status-problem-border bg-status-problem-bg text-status-problem-fg",
  );
}
function catalogStatusClass(active: boolean): string {
  return cn(
    "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase ",
    active
      ? "border-status-ok-border bg-status-ok-bg text-status-ok-fg"
      : "border-status-blocked-border bg-status-blocked-bg text-status-blocked-fg",
  );
}
function catalogFilterButtonClass(active: boolean): string {
  return cn(active ? "dmx-primary-action h-9" : "dmx-secondary-action h-9");
}
function catalogPanelClass(extra?: string): string {
  return cn("rounded-lg border border-border bg-surface", extra);
}
function catalogMetricLabelClass(): string {
  return "text-12 font-medium uppercase text-text-secondary";
}
function downloadJson(filename: string, body: unknown): void {
  const blob = new Blob([JSON.stringify(body, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
function parseImportPayload(rawText: string): CatalogForm[] {
  const data = JSON.parse(rawText) as unknown;
  const maybeItems = Array.isArray(data)
    ? data
    : data && typeof data === "object"
      ? (data as { items?: unknown }).items
      : null;
  if (!Array.isArray(maybeItems)) {
    throw new Error(
      "Invalid import format: expected array or { items: [...] }",
    );
  }
  const result: CatalogForm[] = [];
  for (const row of maybeItems) {
    if (!row || typeof row !== "object") {
      continue;
    }
    const record = row as Record<string, unknown>;
    const code = String(record.code ?? "").trim();
    const name = String(record.name ?? "").trim();
    const isActive =
      record.is_active === undefined ? true : Boolean(record.is_active);
    if (!code || !name) {
      continue;
    }
    result.push({ code, name, is_active: isActive });
  }
  if (result.length === 0) {
    throw new Error("Import file contains no valid rows.");
  }
  return result;
}
export function CatalogCrudPage({
  title,
  subtitle,
  eyebrow,
  purpose,
  endpoint,
  queryKey,
  entityLabel,
}: CatalogCrudPageProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { locale } = useI18n();
  const copy = (en: string, ru: string, he: string) =>
    locale === "ru" ? ru : locale === "he" ? he : en;
  const session = useAuthSession();
  const canManageCatalog = canRunPrivilegedAdminActions(session);
  const canImportCatalog = canManageImports(session);
  const runCatalogWrite = <T,>(action: () => Promise<T>): Promise<T> => {
    if (!canManageCatalog) {
      return Promise.reject(new Error("Catalog write access is required."));
    }
    return action();
  };
  const runCatalogImport = <T,>(action: () => Promise<T>): Promise<T> => {
    if (!canImportCatalog) {
      return Promise.reject(new Error("Catalog import access is required."));
    }
    return action();
  };
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [createOnlyImport, setCreateOnlyImport] = useState(false);
  const [form, setForm] = useState<CatalogForm>(emptyForm());
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const listQuery = useQuery({
    queryKey: [queryKey, search, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search.trim()) {
        params.set("q", search.trim());
      }
      if (statusFilter !== "all") {
        params.set("is_active", statusFilter === "active" ? "true" : "false");
      }
      params.set("limit", "200");
      return apiFetch<CatalogItem[]>(`${endpoint}?${params.toString()}`);
    },
    refetchInterval: 30_000,
  });
  const createMutation = useMutation({
    mutationFn: () =>
      runCatalogWrite(() => apiFetch<CatalogItem>(endpoint, {
        method: "POST",
        body: JSON.stringify(form),
      })),
    onSuccess: async () => {
      setIsCreateOpen(false);
      setForm(emptyForm());
      setMessage(`${entityLabel} created.`);
      await queryClient.invalidateQueries({ queryKey: [queryKey] });
    },
  });
  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editingItem) {
        throw new Error(`No ${entityLabel.toLowerCase()} selected`);
      }
      return runCatalogWrite(() => apiFetch<CatalogItem>(`${endpoint}/${editingItem.id}`, {
        method: "PATCH",
        body: JSON.stringify(form),
      }));
    },
    onSuccess: async () => {
      setMessage(`${entityLabel} updated.`);
      await queryClient.invalidateQueries({ queryKey: [queryKey] });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      runCatalogWrite(() =>
        apiFetch<void>(`${endpoint}/${id}`, { method: "DELETE" }),
      ),
    onSuccess: async () => {
      setMessage(`${entityLabel} deleted.`);
      await queryClient.invalidateQueries({ queryKey: [queryKey] });
    },
  });
  const bulkMutation = useMutation({
    mutationFn: (operation: "activate" | "deactivate" | "delete") =>
      runCatalogWrite(() => apiFetch<CatalogBulkResponse>(`${endpoint}/bulk`, {
        method: "POST",
        body: JSON.stringify({ ids: Array.from(selectedIds), operation }),
      })),
    onSuccess: async (data, operation) => {
      setSelectedIds(new Set());
      setMessage(
        `Bulk ${operation}: affected ${data.affected}, unchanged ${data.unchanged}, not found ${data.not_found}`,
      );
      await queryClient.invalidateQueries({ queryKey: [queryKey] });
    },
  });
  const exportMutation = useMutation({
    mutationFn: () => apiFetch<CatalogExportResponse>(`${endpoint}/export`),
    onSuccess: (data) => {
      const stamp = new Date().toISOString().replaceAll(":", "-");
      const safeName = title.toLowerCase().replaceAll(" ", "_");
      downloadJson(`${safeName}_export_${stamp}.json`, data.items);
      setMessage(`${title} export downloaded (${data.items.length} rows).`);
    },
  });
  const importMutation = useMutation({
    mutationFn: (items: CatalogForm[]) =>
      runCatalogImport(() => apiFetch<CatalogImportResponse>(`${endpoint}/import`, {
        method: "POST",
        body: JSON.stringify({ items, create_only: createOnlyImport }),
      })),
    onSuccess: async (result) => {
      setMessage(
        `Import done: created ${result.created}, updated ${result.updated}, unchanged ${result.unchanged}, skipped ${result.skipped_existing}`,
      );
      await queryClient.invalidateQueries({ queryKey: [queryKey] });
    },
  });
  const items = useMemo(() => listQuery.data || [], [listQuery.data]);
  const selectedCount = selectedIds.size;
  const allVisibleSelected =
    items.length > 0 && items.every((item) => selectedIds.has(item.id));
  const metrics = useMemo(() => {
    const active = items.filter((item) => item.is_active).length;
    return { total: items.length, active, inactive: items.length - active };
  }, [items]);
  const canSubmitForm =
    Boolean(form.name.trim()) &&
    Boolean(form.code.trim()) &&
    CODE_RE.test(form.code.trim());
  const toggleSelectAllVisible = () => {
    if (!canManageCatalog) return;
    setSelectedIds((prev) => {
      if (allVisibleSelected) {
        return new Set();
      }
      const next = new Set(prev);
      for (const item of items) {
        next.add(item.id);
      }
      return next;
    });
  };
  const toggleRowSelection = (id: string) => {
    if (!canManageCatalog) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  const onOpenCreate = () => {
    if (!canManageCatalog) return;
    setForm(emptyForm());
    setIsCreateOpen(true);
  };
  const onOpenEdit = (item: CatalogItem) => {
    if (!canManageCatalog) return;
    setEditingItem(item);
    setForm({ code: item.code, name: item.name, is_active: item.is_active });
    setIsEditOpen(true);
  };
  const onImportFilePicked = async (file: File | null) => {
    if (!canImportCatalog) return;
    if (!file) {
      return;
    }
    try {
      const text = await file.text();
      const parsedItems = parseImportPayload(text);
      importMutation.mutate(parsedItems);
    } catch (error) {
      setMessage(readableApiError(error, locale, "Import parsing failed."));
    }
  };
  return (
    <DashboardLayout>
      {" "}
      <div className="page-shell page-stack-tight motion-stagger">
        {" "}
        <section className={catalogPanelClass("p-5 sm:p-6")}>
          {" "}
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            {" "}
            <div className="max-w-3xl">
              {" "}
              <DimaxPageHeader
                eyebrow={eyebrow || `${entityLabel} catalog`}
                title={title}
                subtitle={subtitle}
              />{" "}
              <div className="mt-4 flex flex-wrap gap-2">
                {" "}
                <span className="dmx-week-pill">{copy("Rows", "Строки", "שורות")} {metrics.total}</span>{" "}
                <span className="dmx-week-pill">{copy("Active", "Активные", "פעילים")} {metrics.active}</span>{" "}
                <span className="dmx-week-pill">
                  {copy("Selected", "Выбрано", "נבחר")} {selectedCount}
                </span>{" "}
              </div>{" "}
            </div>{" "}
            <div className="w-full min-w-0 max-w-xl space-y-4 rounded-lg border border-border bg-surface-subtle p-4 sm:p-5 xl:min-w-[320px]">
              {" "}
              <div>
                {" "}
                <div className={catalogMetricLabelClass()}>{copy("Business role", "Назначение", "תפקיד")}</div>{" "}
                <p className="mt-1 text-[13px] leading-6 text-text-secondary">
                  {purpose}
                </p>{" "}
              </div>{" "}
              <div className="grid gap-3 sm:grid-cols-3">
                {" "}
                <div className="rounded-lg border border-border bg-surface px-3 py-3">
                  {" "}
                  <div className={catalogMetricLabelClass()}>{copy("Scope", "Раздел", "תחום")}</div>{" "}
                  <div className="mt-1 text-lg font-semibold text-text capitalize">
                    {statusFilter}
                  </div>{" "}
                </div>{" "}
                <div className="rounded-lg border border-border bg-surface px-3 py-3">
                  {" "}
                  <div className={catalogMetricLabelClass()}>{copy("Visible", "Показано", "מוצגים")}</div>{" "}
                  <div className="mt-1 text-lg font-semibold text-text">
                    {items.length}
                  </div>{" "}
                </div>{" "}
                <div className="rounded-lg border border-border bg-surface px-3 py-3">
                  {" "}
                  <div className={catalogMetricLabelClass()}>{copy("Import mode", "Режим импорта", "מצב ייבוא")}</div>{" "}
                  <div className="mt-1 text-lg font-semibold text-text">
                    {" "}
                    {createOnlyImport ? "Create only" : "Create + update"}{" "}
                  </div>{" "}
                </div>{" "}
              </div>{" "}
              <div className="toolbar-row">
                {" "}
                <button
                  type="button"
                  className="dmx-secondary-action h-9 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => exportMutation.mutate()}
                  disabled={exportMutation.isPending}
                >
                  {" "}
                  <Download className="h-3.5 w-3.5" /> {copy("Export", "Экспорт", "ייצוא")}{" "}
                </button>{" "}
                <button
                  type="button"
                  className="dmx-secondary-action h-9 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!canImportCatalog || importMutation.isPending}
                >
                  {" "}
                  <Upload className="h-3.5 w-3.5" /> {copy("Import", "Импорт", "ייבוא")}{" "}
                </button>{" "}
                <button
                  type="button"
                  className="dmx-primary-action h-9"
                  onClick={onOpenCreate}
                  disabled={!canManageCatalog}
                >
                  {" "}
                  <Plus className="h-3.5 w-3.5" /> {copy("Add", "Добавить", "הוסף")} {entityLabel}{" "}
                </button>{" "}
                <input
                  ref={fileInputRef}
                  type="file"
                  disabled={!canImportCatalog}
                  accept=".json,application/json"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    void onImportFilePicked(file);
                    event.currentTarget.value = "";
                  }}
                />{" "}
              </div>{" "}
            </div>{" "}
          </div>{" "}
        </section>{" "}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {" "}
          <DimaxKpiCard
            label={copy("Total", "Всего", "סה״כ")}
            value={metrics.total}
            hint={copy("Rows matching current filters", "Строки по текущим фильтрам", "שורות לפי המסננים הנוכחיים")}
            barColor="blue"
          />{" "}
          <DimaxKpiCard
            label={copy("Active", "Активные", "פעילים")}
            value={metrics.active}
            hint={copy("Available in active DIMAX flows", "Доступны в рабочих процессах DIMAX", "זמינים בתהליכי העבודה של DIMAX")}
            barColor="green"
          />{" "}
          <DimaxKpiCard
            label={copy("Inactive", "Неактивные", "לא פעילים")}
            value={metrics.inactive}
            hint={copy("Kept for history and reporting", "Сохранены для истории и отчётов", "נשמרו להיסטוריה ולדוחות")}
            barColor="orange"
          />{" "}
        </div>{" "}
        <section className="toolbar-panel page-stack-tight">
          {" "}
          <div className="toolbar-row">
            {" "}
            <div className="relative min-w-0 flex-1 sm:min-w-[260px]">
              {" "}
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />{" "}
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={copy(
                  `Search ${entityLabel.toLowerCase()}...`,
                  "Поиск по справочнику...",
                  "חיפוש בקטלוג...",
                )}
                className="control-input ps-10"
              />{" "}
            </div>{" "}
            <button
              type="button"
              className={catalogFilterButtonClass(statusFilter === "all")}
              onClick={() => setStatusFilter("all")}
            >
              {" "}
              {copy("All", "Все", "הכל")}{" "}
            </button>{" "}
            <button
              type="button"
              className={catalogFilterButtonClass(statusFilter === "active")}
              onClick={() => setStatusFilter("active")}
            >
              {" "}
              {copy("Active", "Активные", "פעילים")}{" "}
            </button>{" "}
            <button
              type="button"
              className={catalogFilterButtonClass(statusFilter === "inactive")}
              onClick={() => setStatusFilter("inactive")}
            >
              {" "}
              {copy("Inactive", "Неактивные", "לא פעילים")}{" "}
            </button>{" "}
          </div>{" "}
        </section>{" "}
        <section className={catalogPanelClass("page-stack-tight p-4")}>
          {" "}
          <div className="panel-heading">
            {" "}
            <div>
              {" "}
              <div className="panel-title">{copy("Bulk actions", "Групповые действия", "פעולות קבוצתיות")}</div>{" "}
              <div className="panel-subtitle">
                {" "}
                {copy("Review visible rows, adjust status in one pass, and keep imports disciplined.", "Просматривайте видимые строки, корректируйте статус за один проход и следите за дисциплиной импорта.", "סקור שורות גלויות, התאם סטטוס במעבר אחד ושמור על משמעת ביבוא.")}{" "}
              </div>{" "}
            </div>{" "}
            <div className="text-[12px] leading-6 text-text-secondary">
              {copy("Selected:", "Выбрано:", "נבחר:")} {selectedCount}
            </div>{" "}
          </div>{" "}
          <div className="toolbar-row">
            {" "}
            <label className="checkbox-row">
              {" "}
              <Checkbox
                checked={allVisibleSelected}
                disabled={!canManageCatalog}
                onCheckedChange={toggleSelectAllVisible}
              />{" "}
              <span>{copy("Select all visible rows", "Выбрать все видимые строки", "בחר את כל השורות הגלויות")}</span>{" "}
            </label>{" "}
            <button
              type="button"
              className="dmx-secondary-action h-9 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!canManageCatalog || selectedCount === 0 || bulkMutation.isPending}
              onClick={() => bulkMutation.mutate("activate")}
            >
              {" "}
              {copy("Activate", "Активировать", "הפעל")}{" "}
            </button>{" "}
            <button
              type="button"
              className="dmx-secondary-action h-9 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!canManageCatalog || selectedCount === 0 || bulkMutation.isPending}
              onClick={() => bulkMutation.mutate("deactivate")}
            >
              {" "}
              {copy("Deactivate", "Деактивировать", "השבת")}{" "}
            </button>{" "}
            <button
              type="button"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-status-problem-border bg-status-problem-bg px-3.5 text-[12px] font-medium leading-none text-status-problem-fg transition-colors duration-150 hover:bg-status-problem-bg disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!canManageCatalog || selectedCount === 0 || bulkMutation.isPending}
              onClick={() => bulkMutation.mutate("delete")}
            >
              {" "}
              {copy("Delete", "Удалить", "מחק")}{" "}
            </button>{" "}
          </div>{" "}
          <label className="checkbox-row">
            {" "}
            <Checkbox
              checked={createOnlyImport}
              disabled={!canImportCatalog}
              onCheckedChange={(value) => setCreateOnlyImport(value === true)}
            />{" "}
            <span>{copy("Import in create-only mode", "Импорт в режиме «только создание»", "ייבוא במצב יצירה בלבד")}</span>{" "}
          </label>{" "}
        </section>{" "}
        {message && (
          <div className={catalogNoticeClass("success")}>
            {" "}
            <CheckCheck className="h-4 w-4 shrink-0" /> {message}{" "}
          </div>
        )}{" "}
        {(listQuery.isError ||
          createMutation.isError ||
          updateMutation.isError ||
          deleteMutation.isError ||
          bulkMutation.isError ||
          importMutation.isError ||
          exportMutation.isError) && (
          <div className={catalogNoticeClass("error")}>
            {" "}
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{" "}
            <span>
              {" "}
              {readableApiError(
                listQuery.error ||
                  createMutation.error ||
                  updateMutation.error ||
                  deleteMutation.error ||
                  bulkMutation.error ||
                  importMutation.error ||
                  exportMutation.error,
                locale,
                "Request failed.",
              )}{" "}
            </span>{" "}
          </div>
        )}{" "}
        <section className="data-table-shell">
          {" "}
          <div className="divide-y divide-border-subtle md:hidden">
            {" "}
            {listQuery.isLoading ? (
              <div className="px-4 py-8 text-sm text-text-secondary">
                {" "}
                {copy("Loading", "Загрузка", "טוען")} {title.toLowerCase()}...{" "}
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-8 text-sm text-text-secondary">
                {" "}
                {copy("No rows found.", "Строки не найдены.", "לא נמצאו שורות.")}{" "}
              </div>
            ) : (
              items.map((item) => (
                <article
                  key={`${item.id}-mobile`}
                  className={cn(
                    "px-3.5 py-3.5",
                    selectedIds.has(item.id) && "bg-surface-sunken",
                  )}
                >
                  {" "}
                  <div className="flex items-start justify-between gap-3">
                    {" "}
                    <label className="mt-0.5 inline-flex shrink-0 items-center">
                      {" "}
                      <span className="sr-only">{copy("Select", "Выбрать", "בחר")} {item.code}</span>{" "}
                      <Checkbox
                        checked={selectedIds.has(item.id)}
                        disabled={!canManageCatalog}
                        onCheckedChange={() => toggleRowSelection(item.id)}
                      />{" "}
                    </label>{" "}
                    <div className="min-w-0 flex-1">
                      {" "}
                      <div className="truncate text-[13px] font-semibold text-text">
                        {item.code}
                      </div>{" "}
                      <div className="mt-1 line-clamp-2 text-[12px] leading-5 text-text-secondary">
                        {" "}
                        {item.name}{" "}
                      </div>{" "}
                    </div>{" "}
                    <span className={catalogStatusClass(item.is_active)}>
                      {" "}
                      {item.is_active
                        ? copy("Active", "Активен", "פעיל")
                        : copy("Inactive", "Неактивен", "לא פעיל")}{" "}
                    </span>{" "}
                  </div>{" "}
                  <div className="mt-3 rounded-lg border border-border bg-surface-subtle px-3 py-2 text-[12px] leading-5 text-text-secondary">
                    {" "}
                    {copy("Updated:", "Обновлено:", "עודכן:")} {formatDateTime(item.updated_at)}{" "}
                  </div>{" "}
                  <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                    {" "}
                    <button
                      type="button"
                      className="dmx-secondary-action h-8 px-2.5"
                      onClick={() => onOpenEdit(item)}
                      disabled={!canManageCatalog}
                      aria-label={copy(`Edit ${item.code} card`, `Редактировать ${item.code}`, `עריכת ${item.code}`)}
                    >
                      {" "}
                      <Pencil className="h-3.5 w-3.5" />{" "}
                    </button>{" "}
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(item.id)}
                      className="inline-flex h-8 items-center justify-center gap-2 rounded-full border border-status-problem-border bg-status-problem-bg px-2.5 text-[12px] font-medium leading-none text-status-problem-fg transition-colors duration-150 hover:bg-status-problem-bg disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={!canManageCatalog || deleteMutation.isPending}
                      aria-label={copy(`Delete ${item.code} card`, `Удалить ${item.code}`, `מחיקת ${item.code}`)}
                    >
                      {" "}
                      <Trash2 className="h-3.5 w-3.5" />{" "}
                    </button>{" "}
                  </div>{" "}
                </article>
              ))
            )}{" "}
          </div>{" "}
          <div className="hidden md:block">
            <Table>
              <TableHeader className="data-table-head">
                <TableRow className="border-b border-border hover:bg-transparent">
                  <TableHead className="w-[48px]">
                    <span className="sr-only">{copy("Select", "Выбрать", "בחר")}</span>
                  </TableHead>
                  <TableHead>{copy("Code", "Код", "קוד")}</TableHead>
                  <TableHead>{copy("Name", "Название", "שם")}</TableHead>
                  <TableHead>{copy("Status", "Статус", "סטטוס")}</TableHead>
                  <TableHead>{copy("Updated at", "Обновлено", "עודכן")}</TableHead>
                  <TableHead className="w-[112px] text-end">
                    {copy("Actions", "Действия", "פעולות")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listQuery.isLoading ? (
                  <TableRow className="data-table-row">
                    <TableCell
                      colSpan={6}
                      className="py-8 text-sm text-text-secondary"
                    >
                      {copy("Loading", "Загрузка", "טוען")} {title.toLowerCase()}...
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow className="data-table-row">
                    <TableCell
                      colSpan={6}
                      className="py-8 text-sm text-text-secondary"
                    >
                      {copy("No rows found.", "Строки не найдены.", "לא נמצאו שורות.")}
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow
                      key={item.id}
                      className={cn(
                        "data-table-row",
                        selectedIds.has(item.id) && "bg-surface-sunken",
                      )}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(item.id)}
                          disabled={!canManageCatalog}
                          onCheckedChange={() => toggleRowSelection(item.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium text-text">
                        {item.code}
                      </TableCell>
                      <TableCell className="text-text">{item.name}</TableCell>
                      <TableCell>
                        <span className={catalogStatusClass(item.is_active)}>
                          {item.is_active
                            ? copy("Active", "Активен", "פעיל")
                            : copy("Inactive", "Неактивен", "לא פעיל")}
                        </span>
                      </TableCell>
                      <TableCell className="text-text-secondary">
                        {formatDateTime(item.updated_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            className="dmx-secondary-action h-8 px-2.5"
                            onClick={() => onOpenEdit(item)}
                            disabled={!canManageCatalog}
                            aria-label={copy(`Edit ${item.code}`, `Редактировать ${item.code}`, `עריכת ${item.code}`)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteMutation.mutate(item.id)}
                            className="inline-flex h-8 items-center justify-center gap-2 rounded-full border border-status-problem-border bg-status-problem-bg px-2.5 text-[12px] font-medium leading-none text-status-problem-fg transition-colors duration-150 hover:bg-status-problem-bg disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={!canManageCatalog || deleteMutation.isPending}
                            aria-label={copy(`Delete ${item.code}`, `Удалить ${item.code}`, `מחיקת ${item.code}`)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </section>{" "}
      </div>{" "}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        {" "}
        <DialogContent className="max-w-[620px]">
          {" "}
          <DialogHeader>
            {" "}
            <DialogTitle>{copy("Create", "Создать", "צור")} {entityLabel}</DialogTitle>{" "}
            <DialogDescription>
              {" "}
              {copy(
                "Add a new catalog row with disciplined naming and a stable status baseline.",
                "Добавьте новую позицию справочника и задайте её начальный статус.",
                "הוסף רשומה חדשה לספרייה והגדר את המצב ההתחלתי שלה.",
              )}{" "}
            </DialogDescription>{" "}
          </DialogHeader>{" "}
          <div className="grid gap-4 sm:grid-cols-2">
            {" "}
            <div className="field-stack">
              {" "}
              <Label htmlFor={`${queryKey}-create-code`}>{copy("Code", "Код", "קוד")}</Label>{" "}
              <Input
                id={`${queryKey}-create-code`}
                value={form.code}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, code: event.target.value }))
                }
                className="control-input"
              />{" "}
            </div>{" "}
            <div className="field-stack">
              {" "}
              <Label htmlFor={`${queryKey}-create-name`}>{copy("Name", "Название", "שם")}</Label>{" "}
              <Input
                id={`${queryKey}-create-name`}
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
                className="control-input"
              />{" "}
            </div>{" "}
          </div>{" "}
          <label className="checkbox-row">
            {" "}
            <Checkbox
              checked={form.is_active}
              onCheckedChange={(value) =>
                setForm((prev) => ({ ...prev, is_active: value === true }))
              }
            />{" "}
            <span>{copy("Active", "Активен", "פעיל")}</span>{" "}
          </label>{" "}
          <DialogFooter>
            {" "}
            <button
              type="button"
              className="dmx-secondary-action h-10"
              onClick={() => setIsCreateOpen(false)}
            >
              {" "}
              {copy("Cancel", "Отмена", "ביטול")}{" "}
            </button>{" "}
            <button
              type="button"
              className="dmx-primary-action h-10 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => createMutation.mutate()}
              disabled={!canManageCatalog || !canSubmitForm || createMutation.isPending}
            >
              {" "}
              {copy("Save", "Сохранить", "שמור")}{" "}
            </button>{" "}
          </DialogFooter>{" "}
        </DialogContent>{" "}
      </Dialog>{" "}
      <Dialog
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) {
            setEditingItem(null);
          }
        }}
      >
        {" "}
        <DialogContent className="max-w-[620px]">
          {" "}
          <DialogHeader>
            {" "}
            <DialogTitle>{copy("Edit", "Править", "עריכה")} {entityLabel}</DialogTitle>{" "}
            <DialogDescription>
              {" "}
              {copy(
                "Adjust naming, code, and activation state without disturbing catalog structure.",
                "Измените название, код или активность позиции без удаления истории.",
                "עדכן שם, קוד או מצב פעילות בלי למחוק את ההיסטוריה.",
              )}{" "}
            </DialogDescription>{" "}
          </DialogHeader>{" "}
          <div className="grid gap-4 sm:grid-cols-2">
            {" "}
            <div className="field-stack">
              {" "}
              <Label htmlFor={`${queryKey}-edit-code`}>{copy("Code", "Код", "קוד")}</Label>{" "}
              <Input
                id={`${queryKey}-edit-code`}
                value={form.code}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, code: event.target.value }))
                }
                className="control-input"
              />{" "}
            </div>{" "}
            <div className="field-stack">
              {" "}
              <Label htmlFor={`${queryKey}-edit-name`}>{copy("Name", "Название", "שם")}</Label>{" "}
              <Input
                id={`${queryKey}-edit-name`}
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
                className="control-input"
              />{" "}
            </div>{" "}
          </div>{" "}
          <label className="checkbox-row">
            {" "}
            <Checkbox
              checked={form.is_active}
              onCheckedChange={(value) =>
                setForm((prev) => ({ ...prev, is_active: value === true }))
              }
            />{" "}
            <span>{copy("Active", "Активен", "פעיל")}</span>{" "}
          </label>{" "}
          <DialogFooter>
            {" "}
            <button
              type="button"
              className="dmx-secondary-action h-10"
              onClick={() => {
                setIsEditOpen(false);
                setEditingItem(null);
              }}
            >
              {" "}
              {copy("Cancel", "Отмена", "ביטול")}{" "}
            </button>{" "}
            <button
              type="button"
              className="dmx-primary-action h-10 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => updateMutation.mutate()}
              disabled={!canManageCatalog || !canSubmitForm || updateMutation.isPending}
            >
              {" "}
              {copy("Save", "Сохранить", "שמור")}{" "}
            </button>{" "}
          </DialogFooter>{" "}
        </DialogContent>{" "}
      </Dialog>{" "}
    </DashboardLayout>
  );
}
