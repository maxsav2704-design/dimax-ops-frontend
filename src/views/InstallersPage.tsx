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
import { useUserRole } from "@/hooks/use-user-role";
import { apiFetch } from "@/lib/api";
import { canRunPrivilegedAdminActions } from "@/lib/admin-access";
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
  actionsDisabled,
  actionHint,
}: {
  installer: Installer;
  onEdit: () => void;
  onDelete: () => void;
  actionsDisabled: boolean;
  actionHint?: string;
}) {
  const initials = installer.full_name
    .split(" ")
    .map((part) => part[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <article className="glass-card rounded-xl p-4 border border-border">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-accent/15 text-accent font-semibold text-[12px] flex items-center justify-center">
            {initials || "IN"}
          </div>
          <div>
            <h3 className="text-[14px] font-semibold text-card-foreground">{installer.full_name}</h3>
            <p className="text-[12px] text-muted-foreground">{installer.status}</p>
          </div>
        </div>
        <span
          className={cn(
            "text-[10px] rounded-md px-2 py-1 border",
            installer.is_active
              ? "bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))] border-[hsl(var(--success)/0.25)]"
              : "bg-muted text-muted-foreground border-border"
          )}
        >
          {installer.is_active ? "Active" : "Inactive"}
        </span>
      </div>

      <div className="mt-3 space-y-1 text-[12px] text-muted-foreground">
        <div>Phone: {installer.phone || "-"}</div>
        <div>Email: {installer.email || "-"}</div>
        <div>User link: {installer.user_id || "not linked"}</div>
        <div>Updated: {formatDate(installer.updated_at)}</div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-1">
        <button
          onClick={onEdit}
          disabled={actionsDisabled}
          title={actionHint}
          className="h-8 w-8 rounded-md border border-border bg-card flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          disabled={actionsDisabled}
          title={actionHint}
          className="h-8 w-8 rounded-md border border-border bg-card text-[hsl(var(--destructive))] flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-[12px] text-muted-foreground mb-1">Full name</label>
          <input
            value={form.full_name}
            onChange={(e) => onChange({ ...form, full_name: e.target.value })}
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-[13px]"
          />
        </div>
        <div>
          <label className="block text-[12px] text-muted-foreground mb-1">Status</label>
          <select
            value={form.status}
            onChange={(e) => onChange({ ...form, status: e.target.value })}
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-[13px]"
          >
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
            <option value="BUSY">BUSY</option>
          </select>
        </div>
        <div>
          <label className="block text-[12px] text-muted-foreground mb-1">Phone</label>
          <input
            value={form.phone}
            onChange={(e) => onChange({ ...form, phone: e.target.value })}
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-[13px]"
          />
        </div>
        <div>
          <label className="block text-[12px] text-muted-foreground mb-1">Email</label>
          <input
            value={form.email}
            onChange={(e) => onChange({ ...form, email: e.target.value })}
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-[13px]"
          />
        </div>
        <div>
          <label className="block text-[12px] text-muted-foreground mb-1">Address</label>
          <input
            value={form.address}
            onChange={(e) => onChange({ ...form, address: e.target.value })}
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-[13px]"
          />
        </div>
        <div>
          <label className="block text-[12px] text-muted-foreground mb-1">Passport ID</label>
          <input
            value={form.passport_id}
            onChange={(e) => onChange({ ...form, passport_id: e.target.value })}
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-[13px]"
          />
        </div>
      </div>

      <div className="mt-3">
        <label className="block text-[12px] text-muted-foreground mb-1">Notes</label>
        <textarea
          rows={2}
          value={form.notes}
          onChange={(e) => onChange({ ...form, notes: e.target.value })}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px]"
        />
      </div>

      <label className="mt-3 inline-flex items-center gap-2 text-[12px] text-card-foreground">
        <input
          type="checkbox"
          checked={form.is_active}
          onChange={(e) => onChange({ ...form, is_active: e.target.checked })}
        />
        Is active
      </label>
    </>
  );
}

export default function InstallersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const [form, setForm] = useState<InstallerFormState>(emptyForm());
  const [editingInstaller, setEditingInstaller] = useState<Installer | null>(null);
  const userRole = useUserRole();
  const canManageInstallers = canRunPrivilegedAdminActions(userRole);
  const privilegedActionHint = canManageInstallers
    ? undefined
    : "Installer role is read-only in installers";

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
    enabled: isEditOpen && Boolean(editingInstaller?.id),
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
      setIsCreateOpen(false);
      setForm(emptyForm());
      await queryClient.invalidateQueries({ queryKey: ["installers"] });
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
      await queryClient.invalidateQueries({ queryKey: ["installers"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (installerId: string) =>
      apiFetch<void>(`/api/v1/admin/installers/${installerId}`, { method: "DELETE" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["installers"] });
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
      setEditingInstaller(installer);
      await queryClient.invalidateQueries({ queryKey: ["installers"] });
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
      setEditingInstaller(installer);
      setLinkUserId("");
      await queryClient.invalidateQueries({ queryKey: ["installers"] });
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
      setNewRatePrice("");
      await queryClient.invalidateQueries({ queryKey: ["installer-rates", editingInstaller?.id] });
    },
  });

  const updateRateMutation = useMutation({
    mutationFn: (rateId: string) =>
      apiFetch<InstallerRate>(`/api/v1/admin/installer-rates/${rateId}`, {
        method: "PATCH",
        body: JSON.stringify({ price: rateDrafts[rateId] }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["installer-rates", editingInstaller?.id] });
    },
  });

  const deleteRateMutation = useMutation({
    mutationFn: (rateId: string) =>
      apiFetch<void>(`/api/v1/admin/installer-rates/${rateId}`, { method: "DELETE" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["installer-rates", editingInstaller?.id] });
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
    setForm(emptyForm());
    setIsCreateOpen(true);
  };

  const onOpenEdit = (installer: Installer) => {
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
      <div className="p-6 lg:p-8 max-w-[1500px]">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl font-semibold text-foreground tracking-tight">Installers</h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              Manage installers, user links, and door type rates
            </p>
          </div>
          <button
            onClick={onOpenCreate}
            disabled={!canManageInstallers}
            title={privilegedActionHint}
            className="h-9 px-4 rounded-lg bg-accent text-accent-foreground text-[13px] font-medium flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Add Installer
          </button>
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
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search installer..."
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

        {hasError && (
          <div className="mb-4 rounded-lg border border-[hsl(var(--destructive)/0.35)] bg-[hsl(var(--destructive)/0.08)] px-4 py-3 text-[13px] text-[hsl(var(--destructive))] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>Failed to load installers data.</span>
          </div>
        )}
        {!canManageInstallers && (
          <div className="mb-4 rounded-lg border border-[hsl(var(--warning)/0.35)] bg-[hsl(var(--warning)/0.08)] px-4 py-3 text-[13px] text-[hsl(var(--warning-foreground))]">
            Installer role has read-only access to installers and rates.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {installersQuery.isLoading && (
            <div className="glass-card rounded-xl p-5 text-[13px] text-muted-foreground">
              Loading installers...
            </div>
          )}
          {!installersQuery.isLoading && installers.length === 0 && (
            <div className="glass-card rounded-xl p-6 text-[13px] text-muted-foreground col-span-full text-center">
              <div className="flex items-center justify-center mb-2">
                <UserRound className="w-5 h-5" />
              </div>
              No installers found.
            </div>
          )}
          {installers.map((installer) => (
            <InstallerCard
              key={installer.id}
              installer={installer}
              onEdit={() => onOpenEdit(installer)}
              onDelete={() => deleteMutation.mutate(installer.id)}
              actionsDisabled={!canManageInstallers}
              actionHint={privilegedActionHint}
            />
          ))}
        </div>
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="w-full max-w-[760px] rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[16px] font-semibold">Create Installer</h2>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="h-8 px-3 rounded-md border border-border text-[12px]"
              >
                Close
              </button>
            </div>

            <InstallerBaseForm form={form} onChange={setForm} disabled={!canManageInstallers} />

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsCreateOpen(false)}
                className="h-9 px-4 rounded-lg border border-border text-[13px]"
              >
                Cancel
              </button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={!canManageInstallers || !form.full_name.trim() || createMutation.isPending}
                title={privilegedActionHint}
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
          <div className="w-full max-w-[980px] rounded-xl border border-border bg-card p-5 max-h-[92vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[16px] font-semibold">Edit Installer</h2>
              <button
                onClick={() => {
                  setIsEditOpen(false);
                  setEditingInstaller(null);
                }}
                className="h-8 px-3 rounded-md border border-border text-[12px]"
              >
                Close
              </button>
            </div>

            <InstallerBaseForm form={form} onChange={setForm} disabled={!canManageInstallers} />

            <div className="mt-4 rounded-lg border border-border bg-background p-3">
              <h3 className="text-[13px] font-semibold mb-2">User Link</h3>
              <div className="text-[12px] text-muted-foreground mb-2">
                Current linked user: {editingInstaller?.user_id || "none"}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={linkUserId}
                  onChange={(e) => setLinkUserId(e.target.value)}
                  placeholder="User UUID for link"
                  className="h-9 flex-1 min-w-[280px] rounded-lg border border-border bg-card px-3 text-[13px]"
                />
                <button
                  onClick={() => linkUserMutation.mutate()}
                  disabled={!canManageInstallers || !linkUserId.trim() || linkUserMutation.isPending}
                  title={privilegedActionHint}
                  className="h-9 px-3 rounded-lg border border-border bg-card text-[12px] font-medium inline-flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  Link
                </button>
                <button
                  onClick={() => unlinkUserMutation.mutate()}
                  disabled={!canManageInstallers || !editingInstaller?.user_id || unlinkUserMutation.isPending}
                  title={privilegedActionHint}
                  className="h-9 px-3 rounded-lg border border-border bg-card text-[12px] font-medium inline-flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Unlink2 className="w-3.5 h-3.5" />
                  Unlink
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-border bg-background p-3">
              <h3 className="text-[13px] font-semibold mb-2">Installer Rates</h3>
              <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_120px] gap-2 mb-3">
                <select
                  value={newRateDoorTypeId}
                  onChange={(e) => setNewRateDoorTypeId(e.target.value)}
                  className="h-9 rounded-lg border border-border bg-card px-3 text-[12px]"
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
                  className="h-9 rounded-lg border border-border bg-card px-3 text-[12px]"
                />
                <button
                  onClick={() => createRateMutation.mutate()}
                  disabled={!canManageInstallers || !newRateDoorTypeId || !newRatePrice || createRateMutation.isPending}
                  title={privilegedActionHint}
                  className="h-9 rounded-lg bg-accent text-accent-foreground text-[12px] font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Add Rate
                </button>
              </div>

              <div className="space-y-2">
                {ratesQuery.isLoading && (
                  <div className="text-[12px] text-muted-foreground">Loading rates...</div>
                )}
                {!ratesQuery.isLoading && rates.length === 0 && (
                  <div className="text-[12px] text-muted-foreground">No rates configured yet.</div>
                )}
                {rates.map((rate) => {
                  const doorType = doorTypeMap.get(rate.door_type_id);
                  return (
                    <div
                      key={rate.id}
                      className="rounded-md border border-border bg-card px-3 py-2 flex flex-wrap items-center gap-2"
                    >
                      <div className="text-[12px] font-medium min-w-[220px]">
                        {doorType ? `${doorType.code} - ${doorType.name}` : rate.door_type_id}
                      </div>
                      <input
                        value={rateDrafts[rate.id] ?? String(rate.price)}
                        onChange={(e) =>
                          setRateDrafts((prev) => ({ ...prev, [rate.id]: e.target.value }))
                        }
                        className="h-8 w-[120px] rounded-md border border-border bg-background px-2 text-[12px]"
                      />
                      <button
                        onClick={() => updateRateMutation.mutate(rate.id)}
                        disabled={!canManageInstallers || updateRateMutation.isPending}
                        title={privilegedActionHint}
                        className="h-8 px-3 rounded-md border border-border text-[12px] disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => deleteRateMutation.mutate(rate.id)}
                        disabled={!canManageInstallers || deleteRateMutation.isPending}
                        title={privilegedActionHint}
                        className="h-8 px-3 rounded-md border border-border text-[12px] text-[hsl(var(--destructive))] disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        Delete
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setIsEditOpen(false);
                  setEditingInstaller(null);
                }}
                className="h-9 px-4 rounded-lg border border-border text-[13px]"
              >
                Cancel
              </button>
              <button
                onClick={() => updateMutation.mutate()}
                disabled={!canManageInstallers || !form.full_name.trim() || updateMutation.isPending}
                title={privilegedActionHint}
                className="h-9 px-4 rounded-lg bg-accent text-accent-foreground text-[13px] font-medium disabled:opacity-60 disabled:cursor-not-allowed"
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


