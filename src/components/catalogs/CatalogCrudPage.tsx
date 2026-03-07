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
import { apiFetch } from "@/lib/api";
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
      setMessage(error instanceof Error ? error.message : "Import parsing failed");
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-[1500px]">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl font-semibold text-foreground tracking-tight">{title}</h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">{subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => exportMutation.mutate()}
              className="h-9 px-3 rounded-lg border border-border bg-card text-[12px] font-medium inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="h-9 px-3 rounded-lg border border-border bg-card text-[12px] font-medium inline-flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              Import
            </button>
            <button
              onClick={onOpenCreate}
              className="h-9 px-4 rounded-lg bg-accent text-accent-foreground text-[13px] font-medium inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add {entityLabel}
            </button>
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div className="glass-card rounded-xl p-4">
            <p className="text-[12px] text-muted-foreground">Total</p>
            <p className="text-[24px] font-semibold">{metrics.total}</p>
          </div>
          <div className="glass-card rounded-xl p-4">
            <p className="text-[12px] text-muted-foreground">Active</p>
            <p className="text-[24px] font-semibold text-[hsl(var(--success))]">{metrics.active}</p>
          </div>
          <div className="glass-card rounded-xl p-4">
            <p className="text-[12px] text-muted-foreground">Inactive</p>
            <p className="text-[24px] font-semibold text-muted-foreground">{metrics.inactive}</p>
          </div>
        </div>

        <div className="glass-card rounded-xl p-4 mb-4 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={`Search ${entityLabel.toLowerCase()}...`}
              className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-[13px]"
            />
          </div>
          <button
            onClick={() => setStatusFilter("all")}
            className={cn(
              "h-9 px-3 rounded-md border text-[12px]",
              statusFilter === "all"
                ? "bg-accent text-accent-foreground border-accent"
                : "bg-card border-border text-muted-foreground"
            )}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter("active")}
            className={cn(
              "h-9 px-3 rounded-md border text-[12px]",
              statusFilter === "active"
                ? "bg-accent text-accent-foreground border-accent"
                : "bg-card border-border text-muted-foreground"
            )}
          >
            Active
          </button>
          <button
            onClick={() => setStatusFilter("inactive")}
            className={cn(
              "h-9 px-3 rounded-md border text-[12px]",
              statusFilter === "inactive"
                ? "bg-accent text-accent-foreground border-accent"
                : "bg-card border-border text-muted-foreground"
            )}
          >
            Inactive
          </button>
        </div>

        <div className="glass-card rounded-xl p-4 mb-4">
          <div className="flex flex-wrap items-center gap-2 justify-between">
            <label className="inline-flex items-center gap-2 text-[12px] text-muted-foreground">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={toggleSelectAllVisible}
              />
              Select all visible rows
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[12px] text-muted-foreground">
                Selected: {selectedCount}
              </span>
              <button
                disabled={selectedCount === 0 || bulkMutation.isPending}
                onClick={() => bulkMutation.mutate("activate")}
                className="h-8 px-3 rounded-md border border-border bg-card text-[12px] disabled:opacity-50"
              >
                Activate
              </button>
              <button
                disabled={selectedCount === 0 || bulkMutation.isPending}
                onClick={() => bulkMutation.mutate("deactivate")}
                className="h-8 px-3 rounded-md border border-border bg-card text-[12px] disabled:opacity-50"
              >
                Deactivate
              </button>
              <button
                disabled={selectedCount === 0 || bulkMutation.isPending}
                onClick={() => bulkMutation.mutate("delete")}
                className="h-8 px-3 rounded-md border border-border bg-card text-[12px] text-[hsl(var(--destructive))] disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
          <label className="mt-3 inline-flex items-center gap-2 text-[12px] text-muted-foreground">
            <input
              type="checkbox"
              checked={createOnlyImport}
              onChange={(event) => setCreateOnlyImport(event.target.checked)}
            />
            Import in create-only mode
          </label>
        </div>

        {message && (
          <div className="mb-4 rounded-lg border border-[hsl(var(--success)/0.25)] bg-[hsl(var(--success)/0.08)] px-4 py-3 text-[13px] text-[hsl(var(--success))] flex items-center gap-2">
            <CheckCheck className="w-4 h-4" />
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
          <div className="mb-4 rounded-lg border border-[hsl(var(--destructive)/0.35)] bg-[hsl(var(--destructive)/0.08)] px-4 py-3 text-[13px] text-[hsl(var(--destructive))] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              {String(
                listQuery.error ||
                  createMutation.error ||
                  updateMutation.error ||
                  deleteMutation.error ||
                  bulkMutation.error ||
                  importMutation.error ||
                  exportMutation.error ||
                  "Request failed"
              )}
            </span>
          </div>
        )}

        <div className="glass-card rounded-xl overflow-hidden border border-border">
          <div className="grid grid-cols-[42px_1fr_1fr_140px_180px_96px] gap-3 px-4 py-3 border-b border-border bg-muted/30 text-[11px] uppercase tracking-wide text-muted-foreground">
            <span />
            <span>Code</span>
            <span>Name</span>
            <span>Status</span>
            <span>Updated At</span>
            <span>Actions</span>
          </div>

          {listQuery.isLoading && (
            <div className="px-4 py-6 text-[13px] text-muted-foreground">
              Loading {title.toLowerCase()}...
            </div>
          )}

          {!listQuery.isLoading && items.length === 0 && (
            <div className="px-4 py-6 text-[13px] text-muted-foreground">
              No rows found.
            </div>
          )}

          {!listQuery.isLoading &&
            items.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "grid grid-cols-[42px_1fr_1fr_140px_180px_96px] gap-3 px-4 py-3 border-t border-border/70 text-[13px] items-center",
                  selectedIds.has(item.id) && "bg-[hsl(var(--accent)/0.06)]"
                )}
              >
                <div>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.id)}
                    onChange={() => toggleRowSelection(item.id)}
                  />
                </div>
                <div className="font-medium text-card-foreground">{item.code}</div>
                <div className="text-card-foreground">{item.name}</div>
                <div>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-semibold",
                      item.is_active
                        ? "text-[hsl(var(--success))] bg-[hsl(var(--success)/0.12)] border-[hsl(var(--success)/0.25)]"
                        : "text-muted-foreground bg-muted border-border"
                    )}
                  >
                    {item.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="text-muted-foreground">{formatDateTime(item.updated_at)}</div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onOpenEdit(item)}
                    className="h-8 w-8 rounded-md border border-border bg-card inline-flex items-center justify-center"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(item.id)}
                    className="h-8 w-8 rounded-md border border-border bg-card text-[hsl(var(--destructive))] inline-flex items-center justify-center"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="w-full max-w-[560px] rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[16px] font-semibold">Create {entityLabel}</h2>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="h-8 px-3 rounded-md border border-border text-[12px]"
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-[12px] text-muted-foreground mb-1">Code</label>
                <input
                  value={form.code}
                  onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-[13px]"
                />
              </div>
              <div>
                <label className="block text-[12px] text-muted-foreground mb-1">Name</label>
                <input
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-[13px]"
                />
              </div>
              <label className="inline-flex items-center gap-2 text-[12px] text-card-foreground">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, is_active: event.target.checked }))
                  }
                />
                Active
              </label>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsCreateOpen(false)}
                className="h-9 px-4 rounded-lg border border-border text-[13px]"
              >
                Cancel
              </button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={!canSubmitForm || createMutation.isPending}
                className="h-9 px-4 rounded-lg bg-accent text-accent-foreground text-[13px] font-medium disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {isEditOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="w-full max-w-[560px] rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[16px] font-semibold">Edit {entityLabel}</h2>
              <button
                onClick={() => {
                  setIsEditOpen(false);
                  setEditingItem(null);
                }}
                className="h-8 px-3 rounded-md border border-border text-[12px]"
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-[12px] text-muted-foreground mb-1">Code</label>
                <input
                  value={form.code}
                  onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-[13px]"
                />
              </div>
              <div>
                <label className="block text-[12px] text-muted-foreground mb-1">Name</label>
                <input
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-[13px]"
                />
              </div>
              <label className="inline-flex items-center gap-2 text-[12px] text-card-foreground">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, is_active: event.target.checked }))
                  }
                />
                Active
              </label>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setIsEditOpen(false);
                  setEditingItem(null);
                }}
                className="h-9 px-4 rounded-lg border border-border text-[13px]"
              >
                Cancel
              </button>
              <button
                onClick={() => updateMutation.mutate()}
                disabled={!canSubmitForm || updateMutation.isPending}
                className="h-9 px-4 rounded-lg bg-accent text-accent-foreground text-[13px] font-medium disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
