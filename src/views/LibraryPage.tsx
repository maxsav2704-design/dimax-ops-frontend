"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, CheckCheck, Pencil, Plus, Search } from "lucide-react";

import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import { readableApiError } from "@/lib/api-error-display";
import { useI18n } from "@/lib/i18n";
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
  | {
      items?: ProductLibraryItem[];
    };

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

export default function LibraryPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { locale } = useI18n();
  const searchParams = useSearchParams();
  const initialSearch = (searchParams?.get("q") || "").trim();
  const initialStatus = searchParams?.get("status") === "ACTIVE" || searchParams?.get("status") === "ARCHIVED"
    ? (searchParams?.get("status") as LibraryStatus)
    : "all";
  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState<"all" | LibraryStatus>(initialStatus);
  const [message, setMessage] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [form, setForm] = useState<ProductLibraryForm>(emptyForm());
  const [editingItem, setEditingItem] = useState<ProductLibraryItem | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deepLinkHandled, setDeepLinkHandled] = useState(false);
  const returnTo = (searchParams?.get("return_to") || "").trim();
  const focusedInstallType = (searchParams?.get("install_type") || "").trim();
  const hasFocusedProjectFlow = Boolean(returnTo);

  const buildProjectFlowHref = (product?: Pick<ProductLibraryItem, "id" | "install_type">) => {
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
      const response = await apiFetch<LibraryListResponse>(`/api/v1/admin/library${suffix ? `?${suffix}` : ""}`);
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
      setErrorMessage(readableApiError(error, locale, locale === "ru" ? "?? ??????? ??????? ??????? ??????????." : locale === "he" ? "?? ???? ????? ???? ??????? ???????." : "Failed to create library product."));
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editingItem) {
        throw new Error("No product selected");
      }
      return apiFetch<ProductLibraryItem>(`/api/v1/admin/library/${editingItem.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...form,
          manufacturer: form.manufacturer.trim() || null,
        }),
      });
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
      setErrorMessage(readableApiError(error, locale, locale === "ru" ? "?? ??????? ???????? ??????? ??????????." : locale === "he" ? "?? ???? ????? ???? ??????? ???????." : "Failed to update library product."));
    },
  });

  const items = listQuery.data || [];
  const visibleItems = useMemo(() => {
    if (!focusedInstallType) {
      return items;
    }
    return items.filter((item) => item.install_type.trim().toLowerCase() === focusedInstallType.toLowerCase());
  }, [focusedInstallType, items]);

  const metrics = useMemo(() => {
    const active = visibleItems.filter((item) => item.status === "ACTIVE").length;
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
      <div className="page-shell page-stack motion-stagger">
        <section className="page-hero">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <div className="page-eyebrow">Product library</div>
              <h1 className="mt-3 font-display text-3xl tracking-[-0.04em] text-foreground sm:text-4xl">
                Library
              </h1>
              <p className="mt-3 max-w-2xl text-[14px] leading-7 text-muted-foreground">
                Canonical product definitions used by manual door creation and downstream pricing logic.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="metric-chip">Rows {metrics.total}</span>
                <span className="metric-chip">Active {metrics.active}</span>
                <span className="metric-chip">Archived {metrics.archived}</span>
              </div>
              {hasFocusedProjectFlow ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="metric-chip">
                    Focused project flow{focusedInstallType ? ` · ${focusedInstallType}` : ""}
                  </span>
                  <button
                    type="button"
                    onClick={() => router.push("/library")}
                    className="inline-flex items-center rounded-lg border border-border/70 bg-background/75 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                  >
                    Show full library
                  </button>
                </div>
              ) : null}
            </div>
              <div className="surface-subtle min-w-[320px] max-w-xl space-y-4 p-4 sm:p-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-border/70 bg-background/70 px-3 py-3">
                    <div className="metric-label">Visible</div>
                    <div className="mt-1 text-lg font-semibold tabular-nums text-foreground">{visibleItems.length}</div>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/70 px-3 py-3">
                    <div className="metric-label">Scope</div>
                    <div className="mt-1 text-lg font-semibold text-foreground">
                      {focusedInstallType ? `${focusedInstallType} · ${statusFilter === "all" ? "All" : statusFilter}` : statusFilter === "all" ? "All" : statusFilter}
                    </div>
                  </div>
                <div className="rounded-2xl border border-border/70 bg-background/70 px-3 py-3">
                  <div className="metric-label">Unit model</div>
                  <div className="mt-1 text-lg font-semibold text-foreground">piece / set / point</div>
                </div>
              </div>
              <div className="toolbar-row">
                {returnTo ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(buildProjectFlowHref())}
                  >
                    Back to project flow
                  </Button>
                ) : null}
                <Button size="sm" onClick={openCreateDialog}>
                  <Plus className="h-3.5 w-3.5" />
                  Add product
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="toolbar-panel page-stack-tight">
          <div className="toolbar-row">
            <div className="relative min-w-[260px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search SKU, RU/HE name, install type, manufacturer..."
                className="control-input pl-10"
              />
            </div>
            <Button variant={statusFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("all")}>
              All
            </Button>
            <Button variant={statusFilter === "ACTIVE" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("ACTIVE")}>
              Active
            </Button>
            <Button variant={statusFilter === "ARCHIVED" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("ARCHIVED")}>
              Archived
            </Button>
          </div>
        </section>

        {message && (
          <div className="rounded-xl border border-[hsl(var(--success)/0.25)] bg-[hsl(var(--success)/0.08)] px-4 py-3 text-[13px] text-[hsl(var(--success))] flex items-center gap-2">
            <CheckCheck className="h-4 w-4 shrink-0" />
            {message}
          </div>
        )}

        {(listQuery.isError || errorMessage) && (
          <div className="rounded-xl border border-[hsl(var(--destructive)/0.35)] bg-[hsl(var(--destructive)/0.08)] px-4 py-3 text-[13px] text-[hsl(var(--destructive))] flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorMessage || readableApiError(listQuery.error, locale, locale === "ru" ? "?? ??????? ????????? ?????????? ?????????." : locale === "he" ? "?? ???? ????? ?? ?????? ???????." : "Failed to load library.")}</span>
          </div>
        )}

        <section className="data-table-shell">
          <Table>
            <TableHeader className="data-table-head">
              <TableRow className="border-b border-border/80 hover:bg-transparent">
                <TableHead>SKU</TableHead>
                <TableHead>RU name</TableHead>
                <TableHead>HE name</TableHead>
                <TableHead>Install type</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="w-[96px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listQuery.isLoading ? (
                <TableRow className="data-table-row">
                  <TableCell colSpan={8} className="py-8 text-sm text-muted-foreground">Loading library...</TableCell>
                </TableRow>
              ) : visibleItems.length === 0 ? (
                <TableRow className="data-table-row">
                  <TableCell colSpan={8} className="py-8 text-sm text-muted-foreground">No products found.</TableCell>
                </TableRow>
              ) : (
                visibleItems.map((item) => (
                  <TableRow key={item.id} className="data-table-row">
                    <TableCell className="font-medium text-card-foreground">{item.sku}</TableCell>
                    <TableCell className="text-card-foreground">{item.name_ru}</TableCell>
                    <TableCell className="text-card-foreground">{item.name_he}</TableCell>
                    <TableCell className="text-muted-foreground">{item.install_type}</TableCell>
                    <TableCell className="text-muted-foreground">{item.unit}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]",
                          item.status === "ACTIVE"
                            ? "border-[hsl(var(--success)/0.25)] bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]"
                            : "border-border bg-muted text-muted-foreground"
                        )}
                      >
                        {item.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTime(item.updated_at)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1.5">
                        {returnTo ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(buildProjectFlowHref(item))}
                            className="px-2.5"
                          >
                            Use in project flow
                          </Button>
                        ) : null}
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(item)} className="px-2.5" aria-label={`Edit ${item.sku}`}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </section>
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-[760px]">
          <DialogHeader>
            <DialogTitle>Create library product</DialogTitle>
            <DialogDescription>
              Define a reusable product row for manual door creation and downstream operational flows.
            </DialogDescription>
          </DialogHeader>
          <LibraryForm form={form} onChange={setForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!canSubmit || createMutation.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) {
            setEditingItem(null);
          }
        }}
      >
        <DialogContent className="max-w-[760px]">
          <DialogHeader>
            <DialogTitle>Edit library product</DialogTitle>
            <DialogDescription>
              Keep the catalog clean and operationally safe. Archive rows instead of silently removing them from history.
            </DialogDescription>
          </DialogHeader>
          <LibraryForm form={form} onChange={setForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={() => updateMutation.mutate()} disabled={!canSubmit || updateMutation.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function LibraryForm({
  form,
  onChange,
}: {
  form: ProductLibraryForm;
  onChange: React.Dispatch<React.SetStateAction<ProductLibraryForm>>;
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="field-stack">
          <Label htmlFor="library-sku">SKU</Label>
          <Input id="library-sku" value={form.sku} onChange={(event) => onChange((prev) => ({ ...prev, sku: event.target.value }))} className="control-input" />
        </div>
        <div className="field-stack">
          <Label htmlFor="library-install-type">Install type</Label>
          <Input id="library-install-type" value={form.install_type} onChange={(event) => onChange((prev) => ({ ...prev, install_type: event.target.value }))} className="control-input" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="field-stack">
          <Label htmlFor="library-name-ru">Name RU</Label>
          <Textarea id="library-name-ru" rows={3} value={form.name_ru} onChange={(event) => onChange((prev) => ({ ...prev, name_ru: event.target.value }))} className="control-textarea min-h-[90px]" />
        </div>
        <div className="field-stack">
          <Label htmlFor="library-name-he">Name HE</Label>
          <Textarea id="library-name-he" rows={3} value={form.name_he} onChange={(event) => onChange((prev) => ({ ...prev, name_he: event.target.value }))} className="control-textarea min-h-[90px]" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="field-stack">
          <Label htmlFor="library-manufacturer">Manufacturer</Label>
          <Input id="library-manufacturer" value={form.manufacturer} onChange={(event) => onChange((prev) => ({ ...prev, manufacturer: event.target.value }))} className="control-input" />
        </div>
        <div className="field-stack">
          <Label htmlFor="library-unit">Unit</Label>
          <select id="library-unit" value={form.unit} onChange={(event) => onChange((prev) => ({ ...prev, unit: event.target.value as LibraryUnit }))} className="control-input">
            <option value="piece">piece</option>
            <option value="set">set</option>
            <option value="point">point</option>
          </select>
        </div>
        <div className="field-stack">
          <Label htmlFor="library-status">Status</Label>
          <select id="library-status" value={form.status} onChange={(event) => onChange((prev) => ({ ...prev, status: event.target.value as LibraryStatus }))} className="control-input">
            <option value="ACTIVE">ACTIVE</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
        </div>
      </div>
    </div>
  );
}

