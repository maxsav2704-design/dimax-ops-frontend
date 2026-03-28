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
import { Button } from "@/components/ui/button";
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

type CatalogExportResponse = {
  items: CatalogItem[];
};

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

type CatalogForm = {
  code: string;
  name: string;
  is_active: boolean;
};

type CatalogCrudPageProps = {
  title: string;
  subtitle: string;
  endpoint: "/api/v1/admin/door-types" | "/api/v1/admin/reasons";
  queryKey: "door-types" | "reasons";
  entityLabel: string;
};

const CODE_RE = /^[A-Za-z0-9_-]{2,64}$/;

function emptyForm(): CatalogForm {
  return {
    code: "",
    name: "",
    is_active: true,
  };
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
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
    throw new Error("Invalid import format: expected array or { items: [...] }");
  }

  const result: CatalogForm[] = [];
  for (const row of maybeItems) {
    if (!row || typeof row !== "object") {
      continue;
    }
    const record = row as Record<string, unknown>;
    const code = String(record.code ?? "").trim();
    const name = String(record.name ?? "").trim();
    const isActive = record.is_active === undefined ? true : Boolean(record.is_active);
    if (!code || !name) {
      continue;
    }
    result.push({
      code,
      name,
      is_active: isActive,
    });
  }

  if (result.length === 0) {
    throw new Error("Import file contains no valid rows.");
  }
  return result;
}

export function CatalogCrudPage({
  title,
  subtitle,
  endpoint,
  queryKey,
  entityLabel,
}: CatalogCrudPageProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
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
      params.set("limit", "500");
      return apiFetch<CatalogItem[]>(`${endpoint}?${params.toString()}`);
    },
    refetchInterval: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch<CatalogItem>(endpoint, {
        method: "POST",
        body: JSON.stringify(form),
      }),
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
      return apiFetch<CatalogItem>(`${endpoint}/${editingItem.id}`, {
        method: "PATCH",
        body: JSON.stringify(form),
      });
    },
    onSuccess: async () => {
      setMessage(`${entityLabel} updated.`);
      await queryClient.invalidateQueries({ queryKey: [queryKey] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`${endpoint}/${id}`, {
        method: "DELETE",
      }),
    onSuccess: async () => {
      setMessage(`${entityLabel} deleted.`);
      await queryClient.invalidateQueries({ queryKey: [queryKey] });
    },
  });

  const bulkMutation = useMutation({
    mutationFn: (operation: "activate" | "deactivate" | "delete") =>
      apiFetch<CatalogBulkResponse>(`${endpoint}/bulk`, {
        method: "POST",
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          operation,
        }),
      }),
    onSuccess: async (data, operation) => {
      setSelectedIds(new Set());
      setMessage(
        `Bulk ${operation}: affected ${data.affected}, unchanged ${data.unchanged}, not found ${data.not_found}`
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
      apiFetch<CatalogImportResponse>(`${endpoint}/import`, {
        method: "POST",
        body: JSON.stringify({
          items,
          create_only: createOnlyImport,
        }),
      }),
    onSuccess: async (result) => {
      setMessage(
        `Import done: created ${result.created}, updated ${result.updated}, unchanged ${result.unchanged}, skipped ${result.skipped_existing}`
      );
      await queryClient.invalidateQueries({ queryKey: [queryKey] });
    },
  });

  const items = listQuery.data || [];
  const selectedCount = selectedIds.size;
  const allVisibleSelected = items.length > 0 && items.every((item) => selectedIds.has(item.id));

  const metrics = useMemo(() => {
    const active = items.filter((item) => item.is_active).length;
    return {
      total: items.length,
      active,
      inactive: items.length - active,
    };
  }, [items]);

  const canSubmitForm =
    Boolean(form.name.trim()) && Boolean(form.code.trim()) && CODE_RE.test(form.code.trim());

  const toggleSelectAllVisible = () => {
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
    setForm(emptyForm());
    setIsCreateOpen(true);
  };

  const onOpenEdit = (item: CatalogItem) => {
    setEditingItem(item);
    setForm({
      code: item.code,
      name: item.name,
      is_active: item.is_active,
    });
    setIsEditOpen(true);
  };

  const onImportFilePicked = async (file: File | null) => {
    if (!file) {
      return;
    }
    try {
      const text = await file.text();
      const parsedItems = parseImportPayload(text);
      importMutation.mutate(parsedItems);
    } catch (error) {
      setMessage(readableApiError(error, "en", "Import parsing failed."));
    }
  };

  return (
    <DashboardLayout>
      <div className="page-shell page-stack motion-stagger">
        <section className="page-hero">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <div className="page-eyebrow">{entityLabel} catalog</div>
              <h1 className="mt-3 font-display text-3xl tracking-[-0.04em] text-foreground sm:text-4xl">
                {title}
              </h1>
              <p className="mt-3 max-w-2xl text-[14px] leading-7 text-muted-foreground">{subtitle}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="metric-chip">Rows {metrics.total}</span>
                <span className="metric-chip">Active {metrics.active}</span>
                <span className="metric-chip">Selected {selectedCount}</span>
              </div>
            </div>
            <div className="surface-subtle min-w-[320px] max-w-xl space-y-4 p-4 sm:p-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-border/70 bg-background/70 px-3 py-3">
                  <div className="metric-label">Scope</div>
                  <div className="mt-1 text-lg font-semibold text-foreground capitalize">{statusFilter}</div>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/70 px-3 py-3">
                  <div className="metric-label">Visible</div>
                  <div className="mt-1 text-lg font-semibold text-foreground">{items.length}</div>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/70 px-3 py-3">
                  <div className="metric-label">Import mode</div>
                  <div className="mt-1 text-lg font-semibold text-foreground">
                    {createOnlyImport ? "Create only" : "Create + update"}
                  </div>
                </div>
              </div>
              <div className="toolbar-row">
                <Button variant="outline" size="sm" onClick={() => exportMutation.mutate()}>
                  <Download className="h-3.5 w-3.5" />
                  Export
                </Button>
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-3.5 w-3.5" />
                  Import
                </Button>
                <Button size="sm" onClick={onOpenCreate}>
                  <Plus className="h-3.5 w-3.5" />
                  Add {entityLabel}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    void onImportFilePicked(file);
                    event.currentTarget.value = "";
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="metric-tile">
            <div className="metric-label">Total</div>
            <div className="metric-value">{metrics.total}</div>
            <div className="metric-subtext">All visible catalog rows</div>
          </div>
          <div className="metric-tile-success">
            <div className="metric-label">Active</div>
            <div className="metric-value">{metrics.active}</div>
            <div className="metric-subtext">Available in live admin flows</div>
          </div>
          <div className="metric-tile-soft">
            <div className="metric-label">Inactive</div>
            <div className="metric-value">{metrics.inactive}</div>
            <div className="metric-subtext">Hidden from active assignment</div>
          </div>
        </div>

        <section className="toolbar-panel page-stack-tight">
          <div className="toolbar-row">
            <div className="relative min-w-[260px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={`Search ${entityLabel.toLowerCase()}...`}
                className="control-input pl-10"
              />
            </div>
            <Button
              variant={statusFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("all")}
            >
              All
            </Button>
            <Button
              variant={statusFilter === "active" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("active")}
            >
              Active
            </Button>
            <Button
              variant={statusFilter === "inactive" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("inactive")}
            >
              Inactive
            </Button>
          </div>
        </section>

        <section className="surface-panel panel-pad-sm page-stack-tight">
          <div className="panel-heading">
            <div>
              <div className="panel-title">Bulk actions</div>
              <div className="panel-subtitle">
                Review visible rows, adjust status in one pass, and keep imports disciplined.
              </div>
            </div>
            <div className="text-[12px] leading-6 text-muted-foreground">Selected: {selectedCount}</div>
          </div>
          <div className="toolbar-row">
            <label className="checkbox-row">
              <Checkbox checked={allVisibleSelected} onCheckedChange={toggleSelectAllVisible} />
              <span>Select all visible rows</span>
            </label>
            <Button
              variant="outline"
              size="sm"
              disabled={selectedCount === 0 || bulkMutation.isPending}
              onClick={() => bulkMutation.mutate("activate")}
            >
              Activate
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={selectedCount === 0 || bulkMutation.isPending}
              onClick={() => bulkMutation.mutate("deactivate")}
            >
              Deactivate
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={selectedCount === 0 || bulkMutation.isPending}
              onClick={() => bulkMutation.mutate("delete")}
            >
              Delete
            </Button>
          </div>
          <label className="checkbox-row">
            <Checkbox
              checked={createOnlyImport}
              onCheckedChange={(value) => setCreateOnlyImport(value === true)}
            />
            <span>Import in create-only mode</span>
          </label>
        </section>

        {message && (
          <div className="rounded-xl border border-[hsl(var(--success)/0.25)] bg-[hsl(var(--success)/0.08)] px-4 py-3 text-[13px] text-[hsl(var(--success))] flex items-center gap-2">
            <CheckCheck className="h-4 w-4 shrink-0" />
            {message}
          </div>
        )}

        {(listQuery.isError ||
          createMutation.isError ||
          updateMutation.isError ||
          deleteMutation.isError ||
          bulkMutation.isError ||
          importMutation.isError ||
          exportMutation.isError) && (
          <div className="rounded-xl border border-[hsl(var(--destructive)/0.35)] bg-[hsl(var(--destructive)/0.08)] px-4 py-3 text-[13px] text-[hsl(var(--destructive))] flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {readableApiError(
                listQuery.error ||
                  createMutation.error ||
                  updateMutation.error ||
                  deleteMutation.error ||
                  bulkMutation.error ||
                  importMutation.error ||
                  exportMutation.error,
                "en",
                "Request failed."
              )}
            </span>
          </div>
        )}

        <section className="data-table-shell">
          <Table>
            <TableHeader className="data-table-head">
              <TableRow className="border-b border-border/80 hover:bg-transparent">
                <TableHead className="w-[48px]">
                  <span className="sr-only">Select</span>
                </TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated at</TableHead>
                <TableHead className="w-[112px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listQuery.isLoading ? (
                <TableRow className="data-table-row">
                  <TableCell colSpan={6} className="py-8 text-sm text-muted-foreground">
                    Loading {title.toLowerCase()}...
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow className="data-table-row">
                  <TableCell colSpan={6} className="py-8 text-sm text-muted-foreground">
                    No rows found.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow
                    key={item.id}
                    className={cn(
                      "data-table-row",
                      selectedIds.has(item.id) && "bg-[hsl(var(--accent)/0.06)]"
                    )}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(item.id)}
                        onCheckedChange={() => toggleRowSelection(item.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium text-card-foreground">{item.code}</TableCell>
                    <TableCell className="text-card-foreground">{item.name}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]",
                          item.is_active
                            ? "border-[hsl(var(--success)/0.25)] bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]"
                            : "border-border bg-muted text-muted-foreground"
                        )}
                      >
                        {item.is_active ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTime(item.updated_at)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1.5">
                        <Button variant="outline" size="sm" onClick={() => onOpenEdit(item)} className="px-2.5">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteMutation.mutate(item.id)}
                          className="px-2.5 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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
        <DialogContent className="max-w-[620px]">
          <DialogHeader>
            <DialogTitle>Create {entityLabel}</DialogTitle>
            <DialogDescription>
              Add a new catalog row with disciplined naming and a stable status baseline.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="field-stack">
              <Label htmlFor={`${queryKey}-create-code`}>Code</Label>
              <Input
                id={`${queryKey}-create-code`}
                value={form.code}
                onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
                className="control-input"
              />
            </div>
            <div className="field-stack">
              <Label htmlFor={`${queryKey}-create-name`}>Name</Label>
              <Input
                id={`${queryKey}-create-name`}
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                className="control-input"
              />
            </div>
          </div>
          <label className="checkbox-row">
            <Checkbox
              checked={form.is_active}
              onCheckedChange={(value) =>
                setForm((prev) => ({ ...prev, is_active: value === true }))
              }
            />
            <span>Active</span>
          </label>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!canSubmitForm || createMutation.isPending}
            >
              Save
            </Button>
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
        <DialogContent className="max-w-[620px]">
          <DialogHeader>
            <DialogTitle>Edit {entityLabel}</DialogTitle>
            <DialogDescription>
              Adjust naming, code, and activation state without disturbing catalog structure.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="field-stack">
              <Label htmlFor={`${queryKey}-edit-code`}>Code</Label>
              <Input
                id={`${queryKey}-edit-code`}
                value={form.code}
                onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
                className="control-input"
              />
            </div>
            <div className="field-stack">
              <Label htmlFor={`${queryKey}-edit-name`}>Name</Label>
              <Input
                id={`${queryKey}-edit-name`}
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                className="control-input"
              />
            </div>
          </div>
          <label className="checkbox-row">
            <Checkbox
              checked={form.is_active}
              onCheckedChange={(value) =>
                setForm((prev) => ({ ...prev, is_active: value === true }))
              }
            />
            <span>Active</span>
          </label>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditOpen(false);
                setEditingItem(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => updateMutation.mutate()}
              disabled={!canSubmitForm || updateMutation.isPending}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
