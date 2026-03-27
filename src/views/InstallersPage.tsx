import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Link2,
  Pencil,
  Plus,
  Search,
  Trash2,
  Unlink2,
  UserRound,
} from "lucide-react";

import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuthSession } from "@/hooks/use-auth-session";
import { apiFetch } from "@/lib/api";
import { readableApiError } from "@/lib/api-error-display";
import { canRunPrivilegedAdminActions, canViewRates } from "@/lib/admin-access";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Installer = {
  id: string;
  company_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  status: string;
  is_active: boolean;
  user_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type DoorType = {
  id: string;
  code: string;
  name: string;
};

type InstallerRate = {
  id: string;
  installer_id: string;
  door_type_id: string;
  price: string;
};

type InstallerPayload = {
  full_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  passport_id: string | null;
  notes: string | null;
  status: string;
  is_active: boolean;
};

type InstallerFormState = {
  full_name: string;
  phone: string;
  email: string;
  address: string;
  passport_id: string;
  notes: string;
  status: string;
  is_active: boolean;
};

function emptyForm(): InstallerFormState {
  return {
    full_name: "",
    phone: "",
    email: "",
    address: "",
    passport_id: "",
    notes: "",
    status: "ACTIVE",
    is_active: true,
  };
}

function toPayload(form: InstallerFormState): InstallerPayload {
  return {
    full_name: form.full_name.trim(),
    phone: form.phone.trim() || null,
    email: form.email.trim() || null,
    address: form.address.trim() || null,
    passport_id: form.passport_id.trim() || null,
    notes: form.notes.trim() || null,
    status: form.status.trim() || "ACTIVE",
    is_active: form.is_active,
  };
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString();
}

function InstallerCard({
  installer,
  onEdit,
  onDelete,
  editDisabled,
  deleteDisabled,
  editHint,
  deleteHint,
}: {
  installer: Installer;
  onEdit: () => void;
  onDelete: () => void;
  editDisabled: boolean;
  deleteDisabled: boolean;
  editHint?: string;
  deleteHint?: string;
}) {
  const initials = installer.full_name
    .split(" ")
    .map((part) => part[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <article className="surface-panel panel-pad-sm flex h-full flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/15 text-[12px] font-semibold text-accent shadow-[inset_0_1px_0_hsl(0_0%_100%/0.35)]">
            {initials || "IN"}
          </div>
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold tracking-tight text-card-foreground">
              {installer.full_name}
            </h3>
            <p className="mt-0.5 text-[12px] leading-6 text-muted-foreground">{installer.status}</p>
          </div>
        </div>
        <span
          className={cn(
            "inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]",
            installer.is_active
              ? "bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))] border-[hsl(var(--success)/0.25)]"
              : "bg-muted text-muted-foreground border-border"
          )}
        >
          {installer.is_active ? "Active" : "Inactive"}
        </span>
      </div>

      <div className="grid gap-2 text-[12px] text-muted-foreground">
        <div className="rounded-xl border border-border/60 bg-background/55 px-3 py-2">
          <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/80">Phone</div>
          <div className="mt-1 leading-6 text-card-foreground">{installer.phone || "-"}</div>
        </div>
        <div className="rounded-xl border border-border/60 bg-background/55 px-3 py-2">
          <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/80">Email</div>
          <div className="mt-1 break-all leading-6 text-card-foreground">{installer.email || "-"}</div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-background/55 px-3 py-2">
            <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/80">User link</div>
            <div className="mt-1 break-all leading-6 text-card-foreground">
              {installer.user_id || "not linked"}
            </div>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/55 px-3 py-2">
            <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/80">Updated</div>
            <div className="mt-1 leading-6 text-card-foreground">{formatDate(installer.updated_at)}</div>
          </div>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-end gap-2">
        <button
          onClick={onEdit}
          disabled={editDisabled}
          title={editHint}
          aria-label={`Edit ${installer.full_name}`}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-background/80 transition-colors hover:border-accent/35 hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          disabled={deleteDisabled}
          title={deleteHint}
          aria-label={`Delete ${installer.full_name}`}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-background/80 text-[hsl(var(--destructive))] transition-colors hover:border-[hsl(var(--destructive)/0.4)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </article>
  );
}

function InstallerBaseForm({
  form,
  onChange,
  disabled,
}: {
  form: InstallerFormState;
  onChange: (next: InstallerFormState) => void;
  disabled: boolean;
}) {
  void disabled;
  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="field-stack">
          <label className="field-label">Full name</label>
          <input
            value={form.full_name}
            onChange={(e) => onChange({ ...form, full_name: e.target.value })}
            disabled={disabled}
            className="control-input"
          />
        </div>
        <div className="field-stack">
          <label className="field-label">Status</label>
          <select
            value={form.status}
            onChange={(e) => onChange({ ...form, status: e.target.value })}
            disabled={disabled}
            className="control-input"
          >
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
            <option value="BUSY">BUSY</option>
          </select>
        </div>
        <div className="field-stack">
          <label className="field-label">Phone</label>
          <input
            value={form.phone}
            onChange={(e) => onChange({ ...form, phone: e.target.value })}
            disabled={disabled}
            className="control-input"
          />
        </div>
        <div className="field-stack">
          <label className="field-label">Email</label>
          <input
            value={form.email}
            onChange={(e) => onChange({ ...form, email: e.target.value })}
            disabled={disabled}
            className="control-input"
          />
        </div>
        <div className="field-stack">
          <label className="field-label">Address</label>
          <input
            value={form.address}
            onChange={(e) => onChange({ ...form, address: e.target.value })}
            disabled={disabled}
            className="control-input"
          />
        </div>
        <div className="field-stack">
          <label className="field-label">Passport ID</label>
          <input
            value={form.passport_id}
            onChange={(e) => onChange({ ...form, passport_id: e.target.value })}
            disabled={disabled}
            className="control-input"
          />
        </div>
      </div>

      <div className="field-stack mt-4">
        <label className="field-label">Notes</label>
        <textarea
          rows={2}
          value={form.notes}
          onChange={(e) => onChange({ ...form, notes: e.target.value })}
          disabled={disabled}
          className="control-textarea"
        />
      </div>

      <label className="checkbox-row mt-4">
        <input
          type="checkbox"
          checked={form.is_active}
          disabled={disabled}
          onChange={(e) => onChange({ ...form, is_active: e.target.checked })}
        />
        Is active
      </label>
    </>
  );
}

export default function InstallersPage() {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const [form, setForm] = useState<InstallerFormState>(emptyForm());
  const [editingInstaller, setEditingInstaller] = useState<Installer | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const session = useAuthSession();
  const canManageInstallers = canRunPrivilegedAdminActions(session);
  const canManageRates = canViewRates(session);
  const canOpenInstallerDetails = canManageInstallers || canManageRates;
  const privilegedActionHint = canManageInstallers
    ? undefined
    : "Installer role is read-only in installers";
  const rateActionHint = canManageRates ? undefined : "Rate access is restricted for your scope";

  const [linkUserId, setLinkUserId] = useState("");
  const [newRateDoorTypeId, setNewRateDoorTypeId] = useState("");
  const [newRatePrice, setNewRatePrice] = useState("");
  const [rateDrafts, setRateDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editingInstaller) {
      setLinkUserId(editingInstaller.user_id || "");
    } else {
      setLinkUserId("");
    }
  }, [editingInstaller]);

  const installersQuery = useQuery({
    queryKey: ["installers", search, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search.trim()) {
        params.set("q", search.trim());
      }
      if (statusFilter !== "all") {
        params.set("is_active", statusFilter === "active" ? "true" : "false");
      }
      params.set("limit", "200");
      return apiFetch<Installer[]>(`/api/v1/admin/installers?${params.toString()}`);
    },
    refetchInterval: 30_000,
  });

  const doorTypesQuery = useQuery({
    queryKey: ["installer-door-types"],
    queryFn: () => apiFetch<DoorType[]>("/api/v1/admin/door-types?is_active=true&limit=500"),
    enabled: isEditOpen && Boolean(editingInstaller),
  });

  const ratesQuery = useQuery({
    queryKey: ["installer-rates", editingInstaller?.id],
    queryFn: () =>
      apiFetch<InstallerRate[]>(
        `/api/v1/admin/installer-rates?installer_id=${editingInstaller?.id}&limit=500`
      ),
    enabled: isEditOpen && Boolean(editingInstaller?.id) && canManageRates,
  });

  useEffect(() => {
    const rates = ratesQuery.data || [];
    const nextDrafts: Record<string, string> = {};
    for (const rate of rates) {
      nextDrafts[rate.id] = String(rate.price);
    }
    setRateDrafts(nextDrafts);
  }, [ratesQuery.data]);

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch<Installer>("/api/v1/admin/installers", {
        method: "POST",
        body: JSON.stringify(toPayload(form)),
      }),
    onSuccess: async () => {
      setNotice("Installer created.");
      setActionError(null);
      setIsCreateOpen(false);
      setForm(emptyForm());
      await queryClient.invalidateQueries({ queryKey: ["installers"] });
    },
    onError: (error) => {
      setNotice(null);
      setActionError(readableApiError(error, "en", "Failed to create installer."));
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editingInstaller) {
        throw new Error("No installer selected");
      }
      return apiFetch<Installer>(`/api/v1/admin/installers/${editingInstaller.id}`, {
        method: "PATCH",
        body: JSON.stringify(toPayload(form)),
      });
    },
    onSuccess: async () => {
      setNotice("Installer profile updated.");
      setActionError(null);
      await queryClient.invalidateQueries({ queryKey: ["installers"] });
    },
    onError: (error) => {
      setNotice(null);
      setActionError(readableApiError(error, "en", "Failed to update installer."));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (installerId: string) =>
      apiFetch<void>(`/api/v1/admin/installers/${installerId}`, { method: "DELETE" }),
    onSuccess: async () => {
      setNotice("Installer deleted.");
      setActionError(null);
      await queryClient.invalidateQueries({ queryKey: ["installers"] });
    },
    onError: (error) => {
      setNotice(null);
      setActionError(readableApiError(error, "en", "Failed to delete installer."));
    },
  });

  const linkUserMutation = useMutation({
    mutationFn: () => {
      if (!editingInstaller) {
        throw new Error("No installer selected");
      }
      return apiFetch<Installer>(`/api/v1/admin/installers/${editingInstaller.id}/link-user`, {
        method: "POST",
        body: JSON.stringify({ user_id: linkUserId.trim() }),
      });
    },
    onSuccess: async (installer) => {
      setNotice("Installer user link updated.");
      setActionError(null);
      setEditingInstaller(installer);
      await queryClient.invalidateQueries({ queryKey: ["installers"] });
    },
    onError: (error) => {
      setNotice(null);
      setActionError(readableApiError(error, "en", "Failed to link installer user."));
    },
  });

  const unlinkUserMutation = useMutation({
    mutationFn: () => {
      if (!editingInstaller) {
        throw new Error("No installer selected");
      }
      return apiFetch<Installer>(`/api/v1/admin/installers/${editingInstaller.id}/link-user`, {
        method: "DELETE",
      });
    },
    onSuccess: async (installer) => {
      setNotice("Installer user link removed.");
      setActionError(null);
      setEditingInstaller(installer);
      setLinkUserId("");
      await queryClient.invalidateQueries({ queryKey: ["installers"] });
    },
    onError: (error) => {
      setNotice(null);
      setActionError(readableApiError(error, "en", "Failed to unlink installer user."));
    },
  });

  const createRateMutation = useMutation({
    mutationFn: () => {
      if (!editingInstaller) {
        throw new Error("No installer selected");
      }
      return apiFetch<InstallerRate>("/api/v1/admin/installer-rates", {
        method: "POST",
        body: JSON.stringify({
          installer_id: editingInstaller.id,
          door_type_id: newRateDoorTypeId,
          price: newRatePrice,
        }),
      });
    },
    onSuccess: async () => {
      setNotice("Installer rate added.");
      setActionError(null);
      setNewRatePrice("");
      await queryClient.invalidateQueries({ queryKey: ["installer-rates", editingInstaller?.id] });
    },
    onError: (error) => {
      setNotice(null);
      setActionError(readableApiError(error, "en", "Failed to add installer rate."));
    },
  });

  const updateRateMutation = useMutation({
    mutationFn: (rateId: string) =>
      apiFetch<InstallerRate>(`/api/v1/admin/installer-rates/${rateId}`, {
        method: "PATCH",
        body: JSON.stringify({ price: rateDrafts[rateId] }),
      }),
    onSuccess: async () => {
      setNotice("Installer rate updated.");
      setActionError(null);
      await queryClient.invalidateQueries({ queryKey: ["installer-rates", editingInstaller?.id] });
    },
    onError: (error) => {
      setNotice(null);
      setActionError(readableApiError(error, "en", "Failed to update installer rate."));
    },
  });

  const deleteRateMutation = useMutation({
    mutationFn: (rateId: string) =>
      apiFetch<void>(`/api/v1/admin/installer-rates/${rateId}`, { method: "DELETE" }),
    onSuccess: async () => {
      setNotice("Installer rate deleted.");
      setActionError(null);
      await queryClient.invalidateQueries({ queryKey: ["installer-rates", editingInstaller?.id] });
    },
    onError: (error) => {
      setNotice(null);
      setActionError(readableApiError(error, "en", "Failed to delete installer rate."));
    },
  });

  const installers = installersQuery.data || [];
  const doorTypes = doorTypesQuery.data || [];
  const rates = ratesQuery.data || [];

  const doorTypeMap = useMemo(() => {
    return new Map(doorTypes.map((doorType) => [doorType.id, doorType]));
  }, [doorTypes]);

  useEffect(() => {
    if (!newRateDoorTypeId && doorTypes.length > 0) {
      setNewRateDoorTypeId(doorTypes[0].id);
    }
  }, [doorTypes, newRateDoorTypeId]);

  const hasError = installersQuery.isError;

  const metrics = useMemo(() => {
    const active = installers.filter((x) => x.is_active).length;
    const inactive = installers.length - active;
    return { total: installers.length, active, inactive };
  }, [installers]);

  const onOpenCreate = () => {
    setNotice(null);
    setActionError(null);
    setForm(emptyForm());
    setIsCreateOpen(true);
  };

  const onOpenEdit = (installer: Installer) => {
    setNotice(null);
    setActionError(null);
    setEditingInstaller(installer);
    setForm({
      full_name: installer.full_name,
      phone: installer.phone || "",
      email: installer.email || "",
      address: "",
      passport_id: "",
      notes: "",
      status: installer.status || "ACTIVE",
      is_active: installer.is_active,
    });
    setIsEditOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="page-shell page-stack motion-stagger">
        <section className="page-hero relative overflow-hidden">
          <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_top_right,hsl(var(--accent)/0.18),transparent_62%)] lg:block" />
          <div className="relative z-10 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <div className="page-eyebrow">{t("installers.eyebrow")}</div>
              <h1 className="mt-3 font-display text-3xl tracking-[-0.04em] text-foreground sm:text-4xl">
                {t("installers.title")}
              </h1>
              <p className="mt-3 max-w-2xl text-[14px] leading-7 text-muted-foreground">
                {t("installers.subtitle")}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="metric-chip">{t("installers.total")} {metrics.total}</span>
                <span className="metric-chip">{t("common.active")} {metrics.active}</span>
                {canManageRates ? <span className="metric-chip">{t("installers.rateControls")}</span> : null}
              </div>
            </div>
            <div className="surface-subtle min-w-[320px] max-w-xl space-y-4 p-4 sm:p-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-border/70 bg-background/70 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{t("installers.scope")}</div>
                  <div className="mt-1 text-lg font-semibold text-foreground">{statusFilter}</div>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/70 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{t("installers.searchLabel")}</div>
                  <div className="mt-1 text-lg font-semibold text-foreground">
                    {search.trim() ? t("common.filtered") : t("common.portfolio")}
                  </div>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/70 px-3 py-3">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{t("common.mode")}</div>
                  <div className="mt-1 text-lg font-semibold text-foreground">
                    {canManageInstallers ? t("common.manage") : canManageRates ? "Rates only" : t("common.readOnly")}
                  </div>
                </div>
              </div>
              <button
                onClick={onOpenCreate}
                disabled={!canManageInstallers}
                title={privilegedActionHint}
                className="btn-premium h-11 rounded-xl px-4 text-[13px] font-medium disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                {t("installers.addInstaller")}
              </button>
            </div>
          </div>
        </section>

        <div className="toolbar-panel">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("installers.searchPlaceholder")}
              className="control-input pl-9"
            />
          </div>
          <button
            onClick={() => setStatusFilter("all")}
            className={cn(
              "h-9 rounded-xl border px-3 text-[12px] font-medium",
              statusFilter === "all"
                ? "bg-accent text-accent-foreground border-accent"
                : "bg-background/70 border-border/70 text-muted-foreground"
            )}
          >
            {t("common.all")}
          </button>
          <button
            onClick={() => setStatusFilter("active")}
            className={cn(
              "h-9 rounded-xl border px-3 text-[12px] font-medium",
              statusFilter === "active"
                ? "bg-accent text-accent-foreground border-accent"
                : "bg-background/70 border-border/70 text-muted-foreground"
            )}
          >
            {t("common.active")}
          </button>
          <button
            onClick={() => setStatusFilter("inactive")}
            className={cn(
              "h-9 rounded-xl border px-3 text-[12px] font-medium",
              statusFilter === "inactive"
                ? "bg-accent text-accent-foreground border-accent"
                : "bg-background/70 border-border/70 text-muted-foreground"
            )}
          >
            {t("common.inactive")}
          </button>
        </div>

        {hasError && (
          <div className="mb-4 rounded-lg border border-[hsl(var(--destructive)/0.35)] bg-[hsl(var(--destructive)/0.08)] px-4 py-3 text-[13px] text-[hsl(var(--destructive))] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{readableApiError(installersQuery.error, "en", t("installers.error"))}</span>
          </div>
        )}
        {actionError && (
          <div className="mb-4 rounded-lg border border-[hsl(var(--destructive)/0.35)] bg-[hsl(var(--destructive)/0.08)] px-4 py-3 text-[13px] text-[hsl(var(--destructive))] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}
        {notice && (
          <div className="mb-4 rounded-lg border border-[hsl(var(--success)/0.35)] bg-[hsl(var(--success)/0.08)] px-4 py-3 text-[13px] text-[hsl(var(--success))] flex items-start gap-2">
            <UserRound className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{notice}</span>
          </div>
        )}
        {!canManageInstallers && (
          <div className="mb-4 rounded-lg border border-[hsl(var(--warning)/0.35)] bg-[hsl(var(--warning)/0.08)] px-4 py-3 text-[13px] text-[hsl(var(--warning-foreground))]">
            {canManageRates
              ? "Installer profile changes are read-only for your scope, but rate controls remain available."
              : t("installers.readOnlyNotice")}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {installersQuery.isLoading && (
            <div className="surface-panel text-[13px] text-muted-foreground">
              {t("installers.loading")}
            </div>
          )}
          {!installersQuery.isLoading && installers.length === 0 && (
            <div className="surface-panel col-span-full p-6 text-center text-[13px] text-muted-foreground">
              <div className="flex items-center justify-center mb-2">
                <UserRound className="w-5 h-5" />
              </div>
              {t("installers.empty")}
            </div>
          )}
          {installers.map((installer) => (
            <InstallerCard
              key={installer.id}
              installer={installer}
              onEdit={() => onOpenEdit(installer)}
              onDelete={() => deleteMutation.mutate(installer.id)}
              editDisabled={!canOpenInstallerDetails}
              deleteDisabled={!canManageInstallers}
              editHint={canOpenInstallerDetails ? undefined : privilegedActionHint}
              deleteHint={privilegedActionHint}
            />
          ))}
        </div>
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="modal-shell max-w-[760px]">
            <div className="modal-header">
              <h2 className="text-[16px] font-semibold">{t("installers.createInstaller")}</h2>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="inline-flex h-9 items-center rounded-xl border border-border/70 px-3 text-[12px] font-medium text-muted-foreground transition-colors hover:border-accent/35 hover:text-accent"
              >
                Close
              </button>
            </div>

            <InstallerBaseForm form={form} onChange={setForm} disabled={!canManageInstallers} />

            <div className="modal-footer">
              <button
                onClick={() => setIsCreateOpen(false)}
                className="inline-flex h-10 items-center rounded-xl border border-border/70 px-4 text-[13px] font-medium text-muted-foreground transition-colors hover:border-accent/35 hover:text-accent"
              >
                Cancel
              </button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={!canManageInstallers || !form.full_name.trim() || createMutation.isPending}
                title={privilegedActionHint}
                className="inline-flex h-10 items-center rounded-xl bg-accent px-4 text-[13px] font-medium text-accent-foreground shadow-[0_16px_34px_-18px_hsl(var(--accent)/0.55)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {isEditOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="modal-shell max-h-[92vh] max-w-[980px] overflow-auto">
            <div className="modal-header">
              <h2 className="text-[16px] font-semibold">Edit Installer</h2>
              <button
                onClick={() => {
                  setIsEditOpen(false);
                  setEditingInstaller(null);
                }}
                className="inline-flex h-9 items-center rounded-xl border border-border/70 px-3 text-[12px] font-medium text-muted-foreground transition-colors hover:border-accent/35 hover:text-accent"
              >
                Close
              </button>
            </div>

            <InstallerBaseForm form={form} onChange={setForm} disabled={!canManageInstallers} />

            <div className="surface-panel panel-pad-sm mt-5 space-y-3">
              <div className="panel-heading">
                <div>
                  <h3 className="panel-title">User Link</h3>
                  <p className="panel-subtitle">Bind the installer card to a platform user account.</p>
                </div>
              </div>
              <div className="text-[12px] leading-6 text-muted-foreground">
                Current linked user: {editingInstaller?.user_id || "none"}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={linkUserId}
                  onChange={(e) => setLinkUserId(e.target.value)}
                  placeholder="User UUID for link"
                  className="control-input h-10 min-w-[280px] flex-1"
                />
                <button
                  onClick={() => linkUserMutation.mutate()}
                  disabled={!canManageInstallers || !linkUserId.trim() || linkUserMutation.isPending}
                  title={privilegedActionHint}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-border/70 bg-background/80 px-3 text-[12px] font-medium transition-colors hover:border-accent/35 hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  Link
                </button>
                <button
                  onClick={() => unlinkUserMutation.mutate()}
                  disabled={!canManageInstallers || !editingInstaller?.user_id || unlinkUserMutation.isPending}
                  title={privilegedActionHint}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-border/70 bg-background/80 px-3 text-[12px] font-medium transition-colors hover:border-accent/35 hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Unlink2 className="w-3.5 h-3.5" />
                  Unlink
                </button>
              </div>
            </div>

            {canManageRates ? (
            <div className="surface-panel panel-pad-sm mt-5 space-y-4">
              <div className="panel-heading">
                <div>
                  <h3 className="panel-title">Installer Rates</h3>
                  <p className="panel-subtitle">Keep rate rows aligned with current door-type pricing.</p>
                </div>
                <div className="rounded-xl border border-border/70 bg-background/70 px-3 py-2 text-right text-[12px] text-muted-foreground">
                  {rates.length} rows
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_140px_130px]">
                <select
                  value={newRateDoorTypeId}
                  onChange={(e) => setNewRateDoorTypeId(e.target.value)}
                  className="control-input h-10"
                >
                  {(doorTypes || []).map((doorType) => (
                    <option key={doorType.id} value={doorType.id}>
                      {doorType.code} - {doorType.name}
                    </option>
                  ))}
                </select>
                <input
                  value={newRatePrice}
                  onChange={(e) => setNewRatePrice(e.target.value)}
                  placeholder="Price"
                  className="control-input h-10"
                />
                <button
                  onClick={() => createRateMutation.mutate()}
                  disabled={!canManageRates || !newRateDoorTypeId || !newRatePrice || createRateMutation.isPending}
                  title={rateActionHint}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-accent px-4 text-[12px] font-medium text-accent-foreground shadow-[0_16px_34px_-18px_hsl(var(--accent)/0.55)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Add Rate
                </button>
              </div>

              <div className="space-y-2">
                {ratesQuery.isLoading && (
                  <div className="text-[12px] leading-6 text-muted-foreground">Loading rates...</div>
                )}
                {!ratesQuery.isLoading && rates.length === 0 && (
                  <div className="text-[12px] leading-6 text-muted-foreground">No rates configured yet.</div>
                )}
                {rates.map((rate) => {
                  const doorType = doorTypeMap.get(rate.door_type_id);
                  return (
                    <div
                      key={rate.id}
                      className="grid gap-2 rounded-2xl border border-border/70 bg-background/60 px-3 py-3 md:grid-cols-[minmax(0,1fr)_120px_auto_auto] md:items-center"
                    >
                      <div className="min-w-0 text-[12px] font-medium leading-6 text-card-foreground">
                        {doorType ? `${doorType.code} - ${doorType.name}` : rate.door_type_id}
                      </div>
                      <input
                        value={rateDrafts[rate.id] ?? String(rate.price)}
                        onChange={(e) =>
                          setRateDrafts((prev) => ({ ...prev, [rate.id]: e.target.value }))
                        }
                        className="control-input h-9 w-full px-2.5 tabular-nums"
                      />
                      <button
                        onClick={() => updateRateMutation.mutate(rate.id)}
                        disabled={!canManageRates || updateRateMutation.isPending}
                        title={rateActionHint}
                        className="inline-flex h-9 items-center rounded-xl border border-border/70 bg-background/80 px-3 text-[12px] font-medium transition-colors hover:border-accent/35 hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => deleteRateMutation.mutate(rate.id)}
                        disabled={!canManageRates || deleteRateMutation.isPending}
                        title={rateActionHint}
                        className="inline-flex h-9 items-center rounded-xl border border-border/70 bg-background/80 px-3 text-[12px] font-medium text-[hsl(var(--destructive))] transition-colors hover:border-[hsl(var(--destructive)/0.4)] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Delete
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
            ) : (
              <div className="surface-panel panel-pad-sm mt-5">
                <p className="text-[12px] leading-6 text-muted-foreground">
                  Rate controls are hidden for your current admin scope.
                </p>
              </div>
            )}

            <div className="modal-footer">
              <button
                onClick={() => {
                  setIsEditOpen(false);
                  setEditingInstaller(null);
                }}
                className="inline-flex h-10 items-center rounded-xl border border-border/70 px-4 text-[13px] font-medium text-muted-foreground transition-colors hover:border-accent/35 hover:text-accent"
              >
                Cancel
              </button>
              <button
                onClick={() => updateMutation.mutate()}
                disabled={!canManageInstallers || !form.full_name.trim() || updateMutation.isPending}
                title={privilegedActionHint}
                className="inline-flex h-10 items-center rounded-xl bg-accent px-4 text-[13px] font-medium text-accent-foreground shadow-[0_16px_34px_-18px_hsl(var(--accent)/0.55)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Save Installer
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}


