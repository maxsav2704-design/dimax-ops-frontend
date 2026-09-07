"use client";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, CheckCheck, Pencil, Plus, Search } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { DimaxPageHeader } from "@/components/DimaxPageHeader";
import { KpiCard as DimaxKpiCard } from "@/components/dimax";
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
import { apiFetch } from "@/lib/api";
import { readableApiError } from "@/lib/api-error-display";
import { useI18n, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
type LibraryStatus = "ACTIVE" | "ARCHIVED";
type LibraryUnit = "piece" | "set" | "point";
type ProductLibraryItem = {
  id: string;
  sku: string;
  name_ru: string;
  name_he: string;
  install_type: string;
  manufacturer: string | null;
  unit: LibraryUnit;
  status: LibraryStatus;
  created_at?: string;
  updated_at?: string;
};
type LibraryListResponse =
  | ProductLibraryItem[]
  | { items?: ProductLibraryItem[] };
type ProductLibraryForm = {
  sku: string;
  name_ru: string;
  name_he: string;
  install_type: string;
  manufacturer: string;
  unit: LibraryUnit;
  status: LibraryStatus;
};
function emptyForm(): ProductLibraryForm {
  return {
    sku: "",
    name_ru: "",
    name_he: "",
    install_type: "",
    manufacturer: "",
    unit: "piece",
    status: "ACTIVE",
  };
}
function normalizeItems(response: LibraryListResponse): ProductLibraryItem[] {
  return Array.isArray(response) ? response : response.items || [];
}
function formatDateTime(value?: string): string {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}
function libraryNoticeClass(tone: "success" | "error"): string {
  return cn(
    "flex rounded-lg border px-4 py-3 text-[13px]",
    tone === "success" &&
      "items-center gap-2 border-status-ok-border bg-status-ok-bg text-status-ok-fg",
    tone === "error" &&
      "items-start gap-2 border-status-problem-border bg-status-problem-bg text-status-problem-fg",
  );
}
function libraryStatusClass(status: LibraryStatus): string {
  return cn(
    "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase ",
    status === "ACTIVE"
      ? "border-status-ok-border bg-status-ok-bg text-status-ok-fg"
      : "border-status-archived-border bg-status-archived-bg text-status-archived-fg",
  );
}
function libraryFilterButtonClass(active: boolean): string {
  return cn(active ? "dmx-primary-action h-9" : "dmx-secondary-action h-9");
}
export default function LibraryPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { locale } = useI18n();
  const copy = (en: string, ru: string, he: string) =>
    locale === "ru" ? ru : locale === "he" ? he : en;
  const searchParams = useSearchParams();
  const initialSearch = (searchParams?.get("q") || "").trim();
  const initialStatus =
    searchParams?.get("status") === "ACTIVE" ||
    searchParams?.get("status") === "ARCHIVED"
      ? (searchParams?.get("status") as LibraryStatus)
      : "all";
  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState<"all" | LibraryStatus>(
    initialStatus,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [form, setForm] = useState<ProductLibraryForm>(emptyForm());
  const [editingItem, setEditingItem] = useState<ProductLibraryItem | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deepLinkHandled, setDeepLinkHandled] = useState(false);
  const returnTo = (searchParams?.get("return_to") || "").trim();
  const focusedInstallType = (searchParams?.get("install_type") || "").trim();
  const hasFocusedProjectFlow = Boolean(returnTo);
  const buildProjectFlowHref = (
    product?: Pick<ProductLibraryItem, "id" | "install_type">,
  ) => {
    if (!returnTo) {
      return "";
    }
    const [pathname, queryString = ""] = returnTo.split("?");
    const params = new URLSearchParams(queryString);
    if (product) {
      params.set("library_product_id", product.id);
      params.set("library_install_type", product.install_type);
    }
    const suffix = params.toString();
    return suffix ? `${pathname}?${suffix}` : pathname;
  };
  const listQuery = useQuery({
    queryKey: ["library", search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search.trim()) {
        params.set("q", search.trim());
      }
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      params.set("limit", "500");
      const suffix = params.toString();
      const response = await apiFetch<LibraryListResponse>(
        `/api/v1/admin/library${suffix ? `?${suffix}` : ""}`,
      );
      return normalizeItems(response);
    },
    refetchInterval: 30_000,
  });
  useEffect(() => {
    if (deepLinkHandled || searchParams?.get("open") !== "create") {
      return;
    }
    setDeepLinkHandled(true);
    setMessage(null);
    setErrorMessage(null);
    setEditingItem(null);
    setForm({
      ...emptyForm(),
      sku: (searchParams?.get("sku") || "").trim(),
      install_type: (searchParams?.get("install_type") || "").trim(),
      status: "ACTIVE",
    });
    setIsCreateOpen(true);
  }, [deepLinkHandled, searchParams]);
  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch<ProductLibraryItem>("/api/v1/admin/library", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          manufacturer: form.manufacturer.trim() || null,
        }),
      }),
    onSuccess: async () => {
      setMessage("Library product created.");
      setErrorMessage(null);
      setForm(emptyForm());
      setIsCreateOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["library"] });
    },
    onError: (error) => {
      setMessage(null);
      setErrorMessage(
        readableApiError(
          error,
          locale,
          locale === "ru"
            ? "Не удалось создать товар в библиотеке."
            : locale === "he"
              ? "לא ניתן ליצור פריט בספרייה."
              : "Failed to create library product.",
        ),
      );
    },
  });
  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editingItem) {
        throw new Error("No product selected");
      }
      return apiFetch<ProductLibraryItem>(
        `/api/v1/admin/library/${editingItem.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            ...form,
            manufacturer: form.manufacturer.trim() || null,
          }),
        },
      );
    },
    onSuccess: async () => {
      setMessage("Library product updated.");
      setErrorMessage(null);
      setIsEditOpen(false);
      setEditingItem(null);
      await queryClient.invalidateQueries({ queryKey: ["library"] });
    },
    onError: (error) => {
      setMessage(null);
      setErrorMessage(
        readableApiError(
          error,
          locale,
          locale === "ru"
            ? "Не удалось обновить товар в библиотеке."
            : locale === "he"
              ? "לא ניתן לעדכן פריט בספרייה."
              : "Failed to update library product.",
        ),
      );
    },
  });
  const items = useMemo(() => listQuery.data || [], [listQuery.data]);
  const visibleItems = useMemo(() => {
    if (!focusedInstallType) {
      return items;
    }
    return items.filter(
      (item) =>
        item.install_type.trim().toLowerCase() ===
        focusedInstallType.toLowerCase(),
    );
  }, [focusedInstallType, items]);
  const metrics = useMemo(() => {
    const active = visibleItems.filter(
      (item) => item.status === "ACTIVE",
    ).length;
    return {
      total: visibleItems.length,
      active,
      archived: visibleItems.length - active,
    };
  }, [visibleItems]);
  const canSubmit =
    Boolean(form.sku.trim()) &&
    Boolean(form.name_ru.trim()) &&
    Boolean(form.name_he.trim()) &&
    Boolean(form.install_type.trim());
  function openCreateDialog() {
    setForm(emptyForm());
    setMessage(null);
    setErrorMessage(null);
    setIsCreateOpen(true);
  }
  function openEditDialog(item: ProductLibraryItem) {
    setEditingItem(item);
    setMessage(null);
    setErrorMessage(null);
    setForm({
      sku: item.sku,
      name_ru: item.name_ru,
      name_he: item.name_he,
      install_type: item.install_type,
      manufacturer: item.manufacturer || "",
      unit: item.unit,
      status: item.status,
    });
    setIsEditOpen(true);
  }
  return (
    <DashboardLayout>
      <div className="page-shell page-stack-tight motion-stagger">
        <DimaxPageHeader
          eyebrow={copy("Product library", "Справочник продукции", "ספריית מוצרים")}
          title={copy("Library", "Справочник", "ספרייה")}
          badge={`Rows ${metrics.total}`}
          subtitle={copy(
            "Canonical product definitions used by manual door creation and downstream pricing logic.",
            "Единый справочник позиций для ручного добавления дверей и расчёта стоимости.",
            "ספריית פריטים אחידה להוספה ידנית של דלתות ולחישוב מחירים.",
          )}
          actions={
            <>
              {returnTo ? (
                <button
                  type="button"
                  className="dmx-secondary-action h-9"
                  onClick={() => router.push(buildProjectFlowHref())}
                >
                  {copy("Back to project flow", "Вернуться к проекту", "חזרה לפרויקט")}
                </button>
              ) : null}
              <button
                type="button"
                className="dmx-primary-action h-9"
                onClick={openCreateDialog}
              >
                <Plus className="h-3.5 w-3.5" /> {copy("Add product", "Добавить позицию", "הוסף פריט")}
              </button>
            </>
          }
        />

        <div className="grid gap-3 md:grid-cols-5">
          <DimaxKpiCard
            label={copy("Visible", "Показано", "מוצגים")}
            value={visibleItems.length}
            hint={copy("Rows in current view", "Строки в текущем списке", "שורות בתצוגה הנוכחית")}
            barColor="blue"
          />
          <DimaxKpiCard
            label={copy("Active", "Активные", "פעילים")}
            value={metrics.active}
            hint={copy("Available for door creation", "Доступны при добавлении дверей", "זמינים בעת הוספת דלתות")}
            barColor="green"
          />
          <DimaxKpiCard
            label={copy("Archived", "Архив", "ארכיון")}
            value={metrics.archived}
            hint={copy("Kept for history", "Сохранены для истории", "נשמרו להיסטוריה")}
            barColor="yellow"
          />
          <DimaxKpiCard
            label={copy("Scope", "Фильтр", "סינון")}
            value={
              focusedInstallType
                ? `${focusedInstallType} · ${statusFilter === "all" ? "All" : statusFilter}`
                : statusFilter === "all"
                  ? "All"
                  : statusFilter
            }
            hint={copy("Current filter", "Текущий фильтр", "המסנן הנוכחי")}
            barColor="orange"
          />
          <DimaxKpiCard
            label={copy("Unit model", "Единица расчёта", "יחידת חישוב")}
            value="piece / set / point"
            hint={copy("Pricing unit options", "Варианты единиц для расчёта цены", "אפשרויות יחידה לחישוב מחיר")}
            barColor="blue"
          />
        </div>

        {hasFocusedProjectFlow ? (
          <div className="toolbar-panel toolbar-row justify-between">
            <span className="dmx-week-pill">
              {copy("Focused project flow", "Выбранный проект", "הפרויקט שנבחר")}
              {focusedInstallType ? ` · ${focusedInstallType}` : ""}
            </span>
            <button
              type="button"
              onClick={() => router.push("/library")}
              className="dmx-secondary-action h-8"
            >
              {copy("Show full library", "Показать весь справочник", "הצג את כל הספרייה")}
            </button>
          </div>
        ) : null}
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
                  "Search SKU, localized name, install type or manufacturer...",
                  "Поиск по SKU, названию, типу монтажа или производителю...",
                  "חיפוש לפי SKU, שם, סוג התקנה או יצרן...",
                )}
                className="control-input ps-10"
              />{" "}
            </div>{" "}
            <button
              type="button"
              className={libraryFilterButtonClass(statusFilter === "all")}
              onClick={() => setStatusFilter("all")}
            >
              {" "}
              {copy("All", "Все", "הכל")}{" "}
            </button>{" "}
            <button
              type="button"
              className={libraryFilterButtonClass(statusFilter === "ACTIVE")}
              onClick={() => setStatusFilter("ACTIVE")}
            >
              {" "}
              {copy("Active", "Активные", "פעילים")}{" "}
            </button>{" "}
            <button
              type="button"
              className={libraryFilterButtonClass(statusFilter === "ARCHIVED")}
              onClick={() => setStatusFilter("ARCHIVED")}
            >
              {" "}
              {copy("Archived", "В архиве", "הועבר לארכיון")}{" "}
            </button>{" "}
          </div>{" "}
        </section>{" "}
        {message && (
          <div className={libraryNoticeClass("success")}>
            {" "}
            <CheckCheck className="h-4 w-4 shrink-0" /> {message}{" "}
          </div>
        )}{" "}
        {(listQuery.isError || errorMessage) && (
          <div className={libraryNoticeClass("error")}>
            {" "}
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{" "}
            <span>
              {errorMessage ||
                readableApiError(
                  listQuery.error,
                  locale,
                  locale === "ru"
                    ? "Не удалось загрузить библиотеку."
                    : locale === "he"
                      ? "לא ניתן לטעון את הספרייה."
                      : "Failed to load library.",
                )}
            </span>{" "}
          </div>
        )}{" "}
        <section className="data-table-shell">
          {" "}
          <div className="divide-y divide-border-subtle md:hidden">
            {" "}
            {listQuery.isLoading ? (
              <div className="px-4 py-8 text-sm text-text-secondary">
                {copy("Loading library...", "Загрузка справочника...", "טוען ספרייה...")}
              </div>
            ) : visibleItems.length === 0 ? (
              <div className="px-4 py-8 text-sm text-text-secondary">
                {copy("No products found.", "Товары не найдены.", "לא נמצאו מוצרים.")}
              </div>
            ) : (
              visibleItems.map((item) => (
                <article key={`${item.id}-mobile`} className="px-3.5 py-3.5">
                  {" "}
                  <div className="flex items-start justify-between gap-3">
                    {" "}
                    <div className="min-w-0">
                      {" "}
                      <div className="truncate text-[13px] font-semibold text-text">
                        {item.sku}
                      </div>{" "}
                      <div className="mt-1 line-clamp-2 text-[12px] leading-5 text-text-secondary">
                        {" "}
                        {item.name_ru}{" "}
                      </div>{" "}
                      <div
                        className="mt-0.5 line-clamp-2 text-[12px] leading-5 text-text-secondary"
                        dir="rtl"
                      >
                        {" "}
                        {item.name_he}{" "}
                      </div>{" "}
                    </div>{" "}
                    <span className={libraryStatusClass(item.status)}>
                      {" "}
                      {item.status}{" "}
                    </span>{" "}
                  </div>{" "}
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {" "}
                    <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                      {" "}
                      <div className="text-[11px] font-medium uppercase text-text-secondary">
                        {copy("Install type", "Тип установки", "סוג התקנה")}
                      </div>{" "}
                      <div className="mt-1 truncate text-[12px] font-medium text-text">
                        {item.install_type}
                      </div>{" "}
                    </div>{" "}
                    <div className="rounded-lg border border-border bg-surface-subtle px-2.5 py-2">
                      {" "}
                      <div className="text-[11px] font-medium uppercase text-text-secondary">
                        {copy("Unit", "Единица", "יחידה")}
                      </div>{" "}
                      <div className="mt-1 truncate text-[12px] font-medium text-text">
                        {item.unit}
                      </div>{" "}
                    </div>{" "}
                  </div>{" "}
                  <div className="mt-3 rounded-lg border border-border bg-surface-subtle px-3 py-2 text-[12px] leading-5 text-text-secondary">
                    {" "}
                    {copy("Updated:", "Обновлено:", "עודכן:")} {formatDateTime(item.updated_at)}{" "}
                    {item.manufacturer ? ` · ${item.manufacturer}` : ""}{" "}
                  </div>{" "}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {" "}
                    {returnTo ? (
                      <button
                        type="button"
                        className="dmx-secondary-action h-8 px-2.5"
                        onClick={() => router.push(buildProjectFlowHref(item))}
                      >
                        {" "}
                        {copy("Use product", "Использовать продукт", "השתמש במוצר")}{" "}
                      </button>
                    ) : null}{" "}
                    <button
                      type="button"
                      className="dmx-secondary-action h-8 px-2.5"
                      onClick={() => openEditDialog(item)}
                      aria-label={`Edit ${item.sku} card`}
                    >
                      {" "}
                      <Pencil className="h-3.5 w-3.5" />{" "}
                    </button>{" "}
                  </div>{" "}
                </article>
              ))
            )}{" "}
          </div>{" "}
          <div className="hidden md:block">
            {" "}
            <Table>
              {" "}
              <TableHeader className="data-table-head">
                {" "}
                <TableRow className="border-b border-border hover:bg-transparent">
                  {" "}
                  <TableHead>{copy("SKU", "SKU", "מק\"ט")}</TableHead> <TableHead>{copy("RU name", "Название на русском", "שם ברוסית")}</TableHead>{" "}
                  <TableHead>{copy("HE name", "Название на иврите", "שם בעברית")}</TableHead>{" "}
                  <TableHead>{copy("Install type", "Тип установки", "סוג התקנה")}</TableHead>{" "}
                  <TableHead>{copy("Unit", "Единица", "יחידה")}</TableHead> <TableHead>{copy("Status", "Статус", "סטטוס")}</TableHead>{" "}
                  <TableHead>{copy("Updated", "Обновлено", "עודכן")}</TableHead>{" "}
                  <TableHead className="w-[96px] text-end">
                    {copy("Actions", "Действия", "פעולות")}
                  </TableHead>{" "}
                </TableRow>{" "}
              </TableHeader>{" "}
              <TableBody>
                {" "}
                {listQuery.isLoading ? (
                  <TableRow className="data-table-row">
                    {" "}
                    <TableCell
                      colSpan={8}
                      className="py-8 text-sm text-text-secondary"
                    >
                      {copy("Loading library...", "Загрузка справочника...", "טוען ספרייה...")}
                    </TableCell>{" "}
                  </TableRow>
                ) : visibleItems.length === 0 ? (
                  <TableRow className="data-table-row">
                    {" "}
                    <TableCell
                      colSpan={8}
                      className="py-8 text-sm text-text-secondary"
                    >
                      {copy("No products found.", "Товары не найдены.", "לא נמצאו מוצרים.")}
                    </TableCell>{" "}
                  </TableRow>
                ) : (
                  visibleItems.map((item) => (
                    <TableRow key={item.id} className="data-table-row">
                      {" "}
                      <TableCell className="font-medium text-text">
                        {item.sku}
                      </TableCell>{" "}
                      <TableCell className="text-text">
                        {item.name_ru}
                      </TableCell>{" "}
                      <TableCell className="text-text">
                        {item.name_he}
                      </TableCell>{" "}
                      <TableCell className="text-text-secondary">
                        {item.install_type}
                      </TableCell>{" "}
                      <TableCell className="text-text-secondary">
                        {item.unit}
                      </TableCell>{" "}
                      <TableCell>
                        {" "}
                        <span className={libraryStatusClass(item.status)}>
                          {" "}
                          {item.status}{" "}
                        </span>{" "}
                      </TableCell>{" "}
                      <TableCell className="text-text-secondary">
                        {formatDateTime(item.updated_at)}
                      </TableCell>{" "}
                      <TableCell>
                        {" "}
                        <div className="flex justify-end gap-1.5">
                          {" "}
                          {returnTo ? (
                            <button
                              type="button"
                              className="dmx-secondary-action h-8 px-2.5"
                              onClick={() =>
                                router.push(buildProjectFlowHref(item))
                              }
                            >
                              {" "}
                              {copy("Use in project flow", "Использование в ходе проекта", "שימוש בזרימת הפרויקט")}{" "}
                            </button>
                          ) : null}{" "}
                          <button
                            type="button"
                            className="dmx-secondary-action h-8 px-2.5"
                            onClick={() => openEditDialog(item)}
                            aria-label={`Edit ${item.sku}`}
                          >
                            {" "}
                            <Pencil className="h-3.5 w-3.5" />{" "}
                          </button>{" "}
                        </div>{" "}
                      </TableCell>{" "}
                    </TableRow>
                  ))
                )}{" "}
              </TableBody>{" "}
            </Table>{" "}
          </div>{" "}
        </section>{" "}
      </div>{" "}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        {" "}
        <DialogContent className="max-w-[760px]">
          {" "}
          <DialogHeader>
            {" "}
            <DialogTitle>{copy("Create library product", "Создать позицию справочника", "צור פריט בספרייה")}</DialogTitle>{" "}
            <DialogDescription>
              {" "}
              {copy("Define a reusable product row for manual door creation and downstream operational flows.", "Определите строку продукта многократного использования для создания дверей вручную и последующих операционных потоков.", "הגדר שורת מוצרים לשימוש חוזר ליצירת דלת ידנית ולזרימות תפעוליות במורד הזרם.")}{" "}
            </DialogDescription>{" "}
          </DialogHeader>{" "}
          <LibraryForm form={form} onChange={setForm} locale={locale} />{" "}
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
              disabled={!canSubmit || createMutation.isPending}
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
        <DialogContent className="max-w-[760px]">
          {" "}
          <DialogHeader>
            {" "}
            <DialogTitle>{copy("Edit library product", "Редактировать позицию справочника", "ערוך פריט בספרייה")}</DialogTitle>{" "}
            <DialogDescription>
              {" "}
              {copy("Keep the catalog clean and operationally safe. Archive rows instead of silently removing them from history.", "Содержите каталог в чистоте и эксплуатационной безопасности. Архивируйте строки вместо того, чтобы молча удалять их из истории.", "שמור על הקטלוג נקי ובטוח תפעולי. ארכיון שורות במקום להסיר אותן בשקט מההיסטוריה.")}{" "}
            </DialogDescription>{" "}
          </DialogHeader>{" "}
          <LibraryForm form={form} onChange={setForm} locale={locale} />{" "}
          <DialogFooter>
            {" "}
            <button
              type="button"
              className="dmx-secondary-action h-10"
              onClick={() => setIsEditOpen(false)}
            >
              {" "}
              {copy("Cancel", "Отмена", "ביטול")}{" "}
            </button>{" "}
            <button
              type="button"
              className="dmx-primary-action h-10 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => updateMutation.mutate()}
              disabled={!canSubmit || updateMutation.isPending}
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
function LibraryForm({
  form,
  onChange,
  locale,
}: {
  form: ProductLibraryForm;
  onChange: React.Dispatch<React.SetStateAction<ProductLibraryForm>>;
  locale: Locale;
}) {
  const copy = (en: string, ru: string, he: string) =>
    locale === "ru" ? ru : locale === "he" ? he : en;
  return (
    <div className="grid gap-4">
      {" "}
      <div className="grid gap-4 sm:grid-cols-2">
        {" "}
        <div className="field-stack">
          {" "}
          <Label htmlFor="library-sku">{copy("SKU", "SKU", "מק\"ט")}</Label>{" "}
          <Input
            id="library-sku"
            value={form.sku}
            onChange={(event) =>
              onChange((prev) => ({ ...prev, sku: event.target.value }))
            }
            className="control-input"
          />{" "}
        </div>{" "}
        <div className="field-stack">
          {" "}
          <Label htmlFor="library-install-type">{copy("Install type", "Тип установки", "סוג התקנה")}</Label>{" "}
          <Input
            id="library-install-type"
            value={form.install_type}
            onChange={(event) =>
              onChange((prev) => ({
                ...prev,
                install_type: event.target.value,
              }))
            }
            className="control-input"
          />{" "}
        </div>{" "}
      </div>{" "}
      <div className="grid gap-4 sm:grid-cols-2">
        {" "}
        <div className="field-stack">
          {" "}
          <Label htmlFor="library-name-ru">{copy("Name RU", "Название на русском", "שם ברוסית")}</Label>{" "}
          <Textarea
            id="library-name-ru"
            rows={3}
            value={form.name_ru}
            onChange={(event) =>
              onChange((prev) => ({ ...prev, name_ru: event.target.value }))
            }
            className="control-textarea min-h-[90px]"
          />{" "}
        </div>{" "}
        <div className="field-stack">
          {" "}
          <Label htmlFor="library-name-he">{copy("Name HE", "Название на иврите", "שם בעברית")}</Label>{" "}
          <Textarea
            id="library-name-he"
            rows={3}
            value={form.name_he}
            onChange={(event) =>
              onChange((prev) => ({ ...prev, name_he: event.target.value }))
            }
            className="control-textarea min-h-[90px]"
          />{" "}
        </div>{" "}
      </div>{" "}
      <div className="grid gap-4 sm:grid-cols-3">
        {" "}
        <div className="field-stack">
          {" "}
          <Label htmlFor="library-manufacturer">{copy("Manufacturer", "Производитель", "יצרן")}</Label>{" "}
          <Input
            id="library-manufacturer"
            value={form.manufacturer}
            onChange={(event) =>
              onChange((prev) => ({
                ...prev,
                manufacturer: event.target.value,
              }))
            }
            className="control-input"
          />{" "}
        </div>{" "}
        <div className="field-stack">
          {" "}
          <Label htmlFor="library-unit">{copy("Unit", "Единица", "יחידה")}</Label>{" "}
          <select
            id="library-unit"
            value={form.unit}
            onChange={(event) =>
              onChange((prev) => ({
                ...prev,
                unit: event.target.value as LibraryUnit,
              }))
            }
            className="control-input"
          >
            {" "}
            <option value="piece">{copy("piece", "шт.", "יח׳")}</option>{" "}
            <option value="set">{copy("set", "комплект", "סט")}</option>{" "}
            <option value="point">{copy("point", "точка", "נקודה")}</option>{" "}
          </select>{" "}
        </div>{" "}
        <div className="field-stack">
          {" "}
          <Label htmlFor="library-status">{copy("Status", "Статус", "סטטוס")}</Label>{" "}
          <select
            id="library-status"
            value={form.status}
            onChange={(event) =>
              onChange((prev) => ({
                ...prev,
                status: event.target.value as LibraryStatus,
              }))
            }
            className="control-input"
          >
            {" "}
            <option value="ACTIVE">{copy("ACTIVE", "АКТИВЕН", "פעיל")}</option>{" "}
            <option value="ARCHIVED">{copy("ARCHIVED", "В АРХИВЕ", "בארכיון")}</option>{" "}
          </select>{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
}
