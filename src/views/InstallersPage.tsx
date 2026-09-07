import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Link2,
  Pencil,
  Plus,
  ReceiptText,
  Search,
  Trash2,
  Unlink2,
  UserRound,
} from "lucide-react";

import { DashboardLayout } from "@/components/DashboardLayout";
import { DimaxPageHeader } from "@/components/DimaxPageHeader";
import {
  KpiCard as DimaxKpiCard,
  WidgetCard,
} from "@/components/dimax";
import { useAuthSession } from "@/hooks/use-auth-session";
import { apiFetch } from "@/lib/api";
import { readableApiError } from "@/lib/api-error-display";
import {
  canManageUsers,
  canRunPrivilegedAdminActions,
  canViewRates,
} from "@/lib/admin-access";
import { useI18n, type Locale } from "@/lib/i18n";
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

function installersNoticeClass(tone: "success" | "error" | "warning"): string {
  return cn(
    "mb-4 flex items-start gap-2 rounded-lg border px-4 py-3 text-[13px]",
    tone === "success" &&
      "border-status-ok-border bg-status-ok-bg text-status-ok-fg",
    tone === "error" &&
      "border-status-problem-border bg-status-problem-bg text-status-problem-fg",
    tone === "warning" &&
      "border-status-warning-border bg-status-warning-bg text-status-warning-fg",
  );
}

function InstallerCard({
  installer,
  locale,
  onEdit,
  onDelete,
  editDisabled,
  deleteDisabled,
  editHint,
  deleteHint,
}: {
  installer: Installer;
  locale: Locale;
  onEdit: () => void;
  onDelete: () => void;
  editDisabled: boolean;
  deleteDisabled: boolean;
  editHint?: string;
  deleteHint?: string;
}) {
  const copy = (en: string, ru: string, he: string) =>
    locale === "ru" ? ru : locale === "he" ? he : en;
  const initials = installer.full_name
    .split(" ")
    .map((part) => part[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <article className="flex h-full flex-col gap-4 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-surface-sunken text-[12px] font-semibold text-text">
            {initials || "IN"}
          </div>
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold text-text">
              {installer.full_name}
            </h3>
            <p className="mt-0.5 text-[12px] leading-6 text-text-secondary">
              {installer.status}
            </p>
          </div>
        </div>
        <span
          className={cn(
            "inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase",
            installer.is_active
              ? "border-status-ok-border bg-status-ok-bg text-status-ok-fg"
              : "border-status-blocked-border bg-status-blocked-bg text-status-blocked-fg",
          )}
        >
          {installer.is_active
            ? copy("Active", "Активен", "פעיל")
            : copy("Inactive", "Неактивен", "לא פעיל")}
        </span>
      </div>

      <div className="grid gap-2 text-[12px] text-text-secondary">
        <div className="rounded-lg border border-border bg-surface-subtle px-3 py-2">
          <div className="text-[11px] font-medium uppercase text-text-secondary">
            {copy("Phone", "Телефон", "טלפון")}
          </div>
          <div className="mt-1 leading-6 text-text">
            {installer.phone || "-"}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-surface-subtle px-3 py-2">
          <div className="text-[11px] font-medium uppercase text-text-secondary">
            {copy("Email", "Эл. почта", "דוא״ל")}
          </div>
          <div className="mt-1 break-all leading-6 text-text">
            {installer.email || "-"}
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-surface-subtle px-3 py-2">
            <div className="text-[11px] font-medium uppercase text-text-secondary">
              {copy("User link", "Ссылка пользователя", "קישור משתמש")}
            </div>
            <div className="mt-1 break-all leading-6 text-text">
              {installer.user_id || copy("not linked", "не связан", "לא מקושר")}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-surface-subtle px-3 py-2">
            <div className="text-[11px] font-medium uppercase text-text-secondary">
              {copy("Updated", "Обновлено", "עודכן")}
            </div>
            <div className="mt-1 leading-6 text-text">
              {formatDate(installer.updated_at)}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-end gap-2">
        <button
          onClick={onEdit}
          disabled={editDisabled}
          title={editHint}
          aria-label={`Edit ${installer.full_name}`}
          className="dmx-secondary-action h-9 w-9 px-0 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          disabled={deleteDisabled}
          title={deleteHint}
          aria-label={`Delete ${installer.full_name}`}
          className="dmx-secondary-action h-9 w-9 px-0 text-status-problem-fg hover:border-status-problem-border disabled:cursor-not-allowed disabled:opacity-60"
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
  locale,
}: {
  form: InstallerFormState;
  onChange: (next: InstallerFormState) => void;
  disabled: boolean;
  locale: Locale;
}) {
  const copy = (en: string, ru: string, he: string) =>
    locale === "ru" ? ru : locale === "he" ? he : en;
  void disabled;
  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="field-stack">
          <label className="field-label">{copy("Full name", "Полное имя", "שם מלא")}</label>
          <input
            value={form.full_name}
            onChange={(e) => onChange({ ...form, full_name: e.target.value })}
            disabled={disabled}
            className="control-input"
          />
        </div>
        <div className="field-stack">
          <label className="field-label">{copy("Status", "Статус", "סטטוס")}</label>
          <select
            value={form.status}
            onChange={(e) => onChange({ ...form, status: e.target.value })}
            disabled={disabled}
            className="control-input"
          >
            <option value="ACTIVE">{copy("ACTIVE", "АКТИВЕН", "פעיל")}</option>
            <option value="INACTIVE">{copy("INACTIVE", "НЕАКТИВЕН", "לא פעיל")}</option>
            <option value="BUSY">{copy("BUSY", "ЗАНЯТ", "עסוק")}</option>
          </select>
        </div>
        <div className="field-stack">
          <label className="field-label">{copy("Phone", "Телефон", "טלפון")}</label>
          <input
            value={form.phone}
            onChange={(e) => onChange({ ...form, phone: e.target.value })}
            disabled={disabled}
            className="control-input"
          />
        </div>
        <div className="field-stack">
          <label className="field-label">{copy("Email", "Эл. почта", "דוא״ל")}</label>
          <input
            value={form.email}
            onChange={(e) => onChange({ ...form, email: e.target.value })}
            disabled={disabled}
            className="control-input"
          />
        </div>
        <div className="field-stack">
          <label className="field-label">{copy("Address", "Адрес", "כתובת")}</label>
          <input
            value={form.address}
            onChange={(e) => onChange({ ...form, address: e.target.value })}
            disabled={disabled}
            className="control-input"
          />
        </div>
        <div className="field-stack">
          <label className="field-label">{copy("Passport ID", "Идентификатор паспорта", "מזהה דרכון")}</label>
          <input
            value={form.passport_id}
            onChange={(e) => onChange({ ...form, passport_id: e.target.value })}
            disabled={disabled}
            className="control-input"
          />
        </div>
      </div>

      <div className="field-stack mt-4">
        <label className="field-label">{copy("Notes", "Примечания", "הערות")}</label>
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
        {copy("Is active", "Активен", "פעיל")}
      </label>
    </>
  );
}

export default function InstallersPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale, t } = useI18n();
  const copy = (en: string, ru: string, he: string) => {
    if (locale === "ru") return ru;
    if (locale === "he") return he;
    return en;
  };
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const [form, setForm] = useState<InstallerFormState>(emptyForm());
  const [editingInstaller, setEditingInstaller] = useState<Installer | null>(
    null,
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deepLinkApplied, setDeepLinkApplied] = useState(false);
  const session = useAuthSession();
  const canManageInstallers = canManageUsers(session);
  const canViewInstallerRates = canViewRates(session);
  const canManageRates =
    canViewInstallerRates && canRunPrivilegedAdminActions(session);
  const canOpenInstallerDetails =
    canManageInstallers || canViewInstallerRates;
  const privilegedActionHint = canManageInstallers
    ? undefined
    : "Your access level is read-only in installers";
  const rateActionHint = canManageRates
    ? undefined
    : canViewInstallerRates
      ? "Rate changes are read-only for your scope"
      : "Rate access is restricted for your scope";
  const runRateWrite = <T,>(action: () => Promise<T>): Promise<T> => {
    if (!canManageRates) {
      return Promise.reject(new Error("Installer rate write access is required."));
    }
    return action();
  };
  const deepLinkInstallerId = (searchParams?.get("installer_id") || "").trim();

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
      return apiFetch<Installer[]>(
        `/api/v1/admin/installers?${params.toString()}`,
      );
    },
    refetchInterval: 30_000,
  });

  const doorTypesQuery = useQuery({
    queryKey: ["installer-door-types"],
    queryFn: () =>
      apiFetch<DoorType[]>("/api/v1/admin/door-types?is_active=true&limit=200"),
    enabled: isEditOpen && Boolean(editingInstaller),
  });

  const ratesQuery = useQuery({
    queryKey: ["installer-rates", editingInstaller?.id],
    queryFn: () =>
      apiFetch<InstallerRate[]>(
        `/api/v1/admin/installer-rates?installer_id=${editingInstaller?.id}&limit=200`,
      ),
    enabled: isEditOpen && Boolean(editingInstaller?.id) && canViewInstallerRates,
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
      setActionError(
        readableApiError(
          error,
          locale,
          locale === "ru"
            ? "Не удалось создать монтажника."
            : locale === "he"
              ? "לא ניתן ליצור מתקין."
              : "Failed to create installer.",
        ),
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editingInstaller) {
        throw new Error("No installer selected");
      }
      return apiFetch<Installer>(
        `/api/v1/admin/installers/${editingInstaller.id}`,
        {
          method: "PATCH",
          body: JSON.stringify(toPayload(form)),
        },
      );
    },
    onSuccess: async () => {
      setNotice("Installer profile updated.");
      setActionError(null);
      await queryClient.invalidateQueries({ queryKey: ["installers"] });
    },
    onError: (error) => {
      setNotice(null);
      setActionError(
        readableApiError(
          error,
          locale,
          locale === "ru"
            ? "Не удалось обновить монтажника."
            : locale === "he"
              ? "לא ניתן לעדכן את המתקין."
              : "Failed to update installer.",
        ),
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (installerId: string) =>
      apiFetch<void>(`/api/v1/admin/installers/${installerId}`, {
        method: "DELETE",
      }),
    onSuccess: async () => {
      setNotice("Installer deleted.");
      setActionError(null);
      await queryClient.invalidateQueries({ queryKey: ["installers"] });
    },
    onError: (error) => {
      setNotice(null);
      setActionError(
        readableApiError(
          error,
          locale,
          locale === "ru"
            ? "Не удалось удалить монтажника."
            : locale === "he"
              ? "לא ניתן למחוק את המתקין."
              : "Failed to delete installer.",
        ),
      );
    },
  });

  const linkUserMutation = useMutation({
    mutationFn: () => {
      if (!editingInstaller) {
        throw new Error("No installer selected");
      }
      return apiFetch<Installer>(
        `/api/v1/admin/installers/${editingInstaller.id}/link-user`,
        {
          method: "POST",
          body: JSON.stringify({ user_id: linkUserId.trim() }),
        },
      );
    },
    onSuccess: async (installer) => {
      setNotice("Installer user link updated.");
      setActionError(null);
      setEditingInstaller(installer);
      await queryClient.invalidateQueries({ queryKey: ["installers"] });
    },
    onError: (error) => {
      setNotice(null);
      setActionError(
        readableApiError(
          error,
          locale,
          locale === "ru"
            ? "Не удалось связать пользователя с монтажником."
            : locale === "he"
              ? "לא ניתן לקשר משתמש למתקין."
              : "Failed to link installer user.",
        ),
      );
    },
  });

  const unlinkUserMutation = useMutation({
    mutationFn: () => {
      if (!editingInstaller) {
        throw new Error("No installer selected");
      }
      return apiFetch<Installer>(
        `/api/v1/admin/installers/${editingInstaller.id}/link-user`,
        {
          method: "DELETE",
        },
      );
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
      setActionError(
        readableApiError(
          error,
          locale,
          locale === "ru"
            ? "Не удалось отвязать пользователя от монтажника."
            : locale === "he"
              ? "לא ניתן לנתק את המשתמש מהמתקין."
              : "Failed to unlink installer user.",
        ),
      );
    },
  });

  const createRateMutation = useMutation({
    mutationFn: () => {
      if (!editingInstaller) {
        throw new Error("No installer selected");
      }
      return runRateWrite(() => apiFetch<InstallerRate>("/api/v1/admin/installer-rates", {
        method: "POST",
        body: JSON.stringify({
          installer_id: editingInstaller.id,
          door_type_id: newRateDoorTypeId,
          price: newRatePrice,
        }),
      }));
    },
    onSuccess: async () => {
      setNotice("Installer rate added.");
      setActionError(null);
      setNewRatePrice("");
      await queryClient.invalidateQueries({
        queryKey: ["installer-rates", editingInstaller?.id],
      });
    },
    onError: (error) => {
      setNotice(null);
      setActionError(
        readableApiError(
          error,
          locale,
          locale === "ru"
            ? "Не удалось добавить ставку монтажника."
            : locale === "he"
              ? "לא ניתן להוסיף תעריף למתקין."
              : "Failed to add installer rate.",
        ),
      );
    },
  });

  const updateRateMutation = useMutation({
    mutationFn: (rateId: string) =>
      runRateWrite(() => apiFetch<InstallerRate>(`/api/v1/admin/installer-rates/${rateId}`, {
        method: "PATCH",
        body: JSON.stringify({ price: rateDrafts[rateId] }),
      })),
    onSuccess: async () => {
      setNotice("Installer rate updated.");
      setActionError(null);
      await queryClient.invalidateQueries({
        queryKey: ["installer-rates", editingInstaller?.id],
      });
    },
    onError: (error) => {
      setNotice(null);
      setActionError(
        readableApiError(
          error,
          locale,
          locale === "ru"
            ? "Не удалось обновить ставку монтажника."
            : locale === "he"
              ? "לא ניתן לעדכן את תעריף המתקין."
              : "Failed to update installer rate.",
        ),
      );
    },
  });

  const deleteRateMutation = useMutation({
    mutationFn: (rateId: string) =>
      runRateWrite(() => apiFetch<void>(`/api/v1/admin/installer-rates/${rateId}`, {
        method: "DELETE",
      })),
    onSuccess: async () => {
      setNotice("Installer rate deleted.");
      setActionError(null);
      await queryClient.invalidateQueries({
        queryKey: ["installer-rates", editingInstaller?.id],
      });
    },
    onError: (error) => {
      setNotice(null);
      setActionError(
        readableApiError(
          error,
          locale,
          locale === "ru"
            ? "Не удалось удалить ставку монтажника."
            : locale === "he"
              ? "לא ניתן למחוק את תעריף המתקין."
              : "Failed to delete installer rate.",
        ),
      );
    },
  });

  const installers = useMemo(
    () => installersQuery.data || [],
    [installersQuery.data],
  );

  useEffect(() => {
    setDeepLinkApplied(false);
  }, [deepLinkInstallerId]);

  useEffect(() => {
    if (!deepLinkInstallerId || deepLinkApplied || installersQuery.isLoading) {
      return;
    }

    const matchedInstaller =
      installers.find((installer) => installer.id === deepLinkInstallerId) ||
      null;
    setDeepLinkApplied(true);
    if (!matchedInstaller || !canOpenInstallerDetails) {
      return;
    }

    setActionError(null);
    setNotice(null);
    setEditingInstaller(matchedInstaller);
    setForm({
      full_name: matchedInstaller.full_name,
      phone: matchedInstaller.phone || "",
      email: matchedInstaller.email || "",
      address: "",
      passport_id: "",
      notes: "",
      status: matchedInstaller.status || "ACTIVE",
      is_active: matchedInstaller.is_active,
    });
    setIsEditOpen(true);
  }, [
    canOpenInstallerDetails,
    deepLinkApplied,
    deepLinkInstallerId,
    installers,
    installersQuery.isLoading,
  ]);
  const doorTypes = useMemo(
    () => doorTypesQuery.data || [],
    [doorTypesQuery.data],
  );
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
  const focusedInstaller = useMemo(
    () =>
      installers.find((installer) => installer.id === deepLinkInstallerId) ||
      null,
    [deepLinkInstallerId, installers],
  );
  const deepLinkInstallerMissing = Boolean(
    deepLinkInstallerId &&
      installersQuery.isFetched &&
      !installersQuery.isLoading &&
      !focusedInstaller,
  );

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
      <div className="page-shell page-stack-tight motion-stagger">
        <DimaxPageHeader
          eyebrow={t("installers.eyebrow")}
          title={t("installers.title")}
          badge={`${t("installers.total")} ${metrics.total}`}
          subtitle={t("installers.subtitle")}
          actions={
            <button
              onClick={onOpenCreate}
              disabled={!canManageInstallers}
              title={privilegedActionHint}
              className="dmx-primary-action h-9 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              {t("installers.addInstaller")}
            </button>
          }
        />

        <div className="grid gap-3 md:grid-cols-4">
          <DimaxKpiCard
            label={t("installers.total")}
            value={metrics.total}
            hint={t("common.portfolio")}
            barColor="blue"
          />
          <DimaxKpiCard
            label={t("common.active")}
            value={metrics.active}
            hint={t("installers.rateControls")}
            barColor="green"
          />
          <DimaxKpiCard
            label={t("common.inactive")}
            value={metrics.inactive}
            hint={`${t("installers.scope")}: ${statusFilter}`}
            barColor="yellow"
          />
          <DimaxKpiCard
            label={t("common.mode")}
            value={
              canManageInstallers
                ? t("common.manage")
                : canViewInstallerRates
                  ? "Rates only"
                  : t("common.readOnly")
            }
            hint={search.trim() ? t("common.filtered") : t("common.portfolio")}
            barColor={canManageInstallers ? "orange" : "red"}
          />
        </div>

        {focusedInstaller ? (
          <div className="toolbar-panel toolbar-row justify-between">
            <span className="rounded-full border border-status-progress-border bg-status-progress-bg px-3 py-1 text-[12px] font-medium text-status-progress-fg">
              {copy("Focused installer", "Выбранный монтажник", "המתקין שנבחר")} {focusedInstaller.id}
            </span>
            <button
              type="button"
              onClick={() => router.push("/installers")}
              className="dmx-secondary-action"
            >
              {copy("Show all installers", "Показать всех монтажников", "הצג את כל המתקינים")}
            </button>
          </div>
        ) : null}
        {deepLinkInstallerMissing ? (
          <div className="flex flex-col gap-3 rounded-lg border border-status-warning-border bg-status-warning-bg px-4 py-3 text-[13px] text-status-warning-fg sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {copy(
                  `Requested installer ${deepLinkInstallerId} is not available in the current installers list. Another installer was not opened automatically.`,
                  `Монтажник ${deepLinkInstallerId} недоступен в текущем списке. Другой монтажник не был открыт автоматически.`,
                  `המתקין ${deepLinkInstallerId} אינו זמין ברשימה הנוכחית. מתקין אחר לא נפתח אוטומטית.`,
                )}
              </span>
            </div>
            <button
              type="button"
              onClick={() => router.push("/installers")}
              className="dmx-secondary-action shrink-0"
            >
              {copy("Show all installers", "Показать всех монтажников", "הצג את כל המתקינים")}
            </button>
          </div>
        ) : null}

        <div className="toolbar-panel toolbar-row">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("installers.searchPlaceholder")}
              className="control-input ps-9"
            />
          </div>
          <button
            onClick={() => setStatusFilter("all")}
            aria-pressed={statusFilter === "all"}
            className={cn(
              statusFilter === "all"
                ? "dmx-primary-action h-9"
                : "dmx-secondary-action h-9",
            )}
          >
            {t("common.all")}
          </button>
          <button
            onClick={() => setStatusFilter("active")}
            aria-pressed={statusFilter === "active"}
            className={cn(
              statusFilter === "active"
                ? "dmx-primary-action h-9"
                : "dmx-secondary-action h-9",
            )}
          >
            {t("common.active")}
          </button>
          <button
            onClick={() => setStatusFilter("inactive")}
            aria-pressed={statusFilter === "inactive"}
            className={cn(
              statusFilter === "inactive"
                ? "dmx-primary-action h-9"
                : "dmx-secondary-action h-9",
            )}
          >
            {t("common.inactive")}
          </button>
        </div>

        {hasError && (
          <div className={installersNoticeClass("error")}>
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              {readableApiError(
                installersQuery.error,
                locale,
                t("installers.error"),
              )}
            </span>
          </div>
        )}
        {actionError && (
          <div className={installersNoticeClass("error")}>
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}
        {notice && (
          <div className={installersNoticeClass("success")}>
            <UserRound className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{notice}</span>
          </div>
        )}
        {!canManageInstallers && (
          <div className={installersNoticeClass("warning")}>
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              {canViewInstallerRates
                ? "Installer profile changes are read-only for your scope, but rate data remain available."
                : t("installers.readOnlyNotice")}
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {installersQuery.isLoading && (
            <div className="rounded-lg border border-border bg-surface p-4 text-[13px] text-text-secondary">
              {t("installers.loading")}
            </div>
          )}
          {!installersQuery.isLoading && installers.length === 0 && (
            <div className="col-span-full rounded-lg border border-border bg-surface p-6 text-center text-[13px] text-text-secondary">
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
              locale={locale}
              onEdit={() => onOpenEdit(installer)}
              onDelete={() => deleteMutation.mutate(installer.id)}
              editDisabled={!canOpenInstallerDetails}
              deleteDisabled={!canManageInstallers}
              editHint={
                canOpenInstallerDetails ? undefined : privilegedActionHint
              }
              deleteHint={privilegedActionHint}
            />
          ))}
        </div>
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="modal-shell max-w-[760px]">
            <div className="modal-header">
              <h2 className="text-[16px] font-semibold">
                {t("installers.createInstaller")}
              </h2>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="dmx-secondary-action h-9"
              >
                {copy("Close", "Закрыть", "סגור")}
              </button>
            </div>

            <InstallerBaseForm
              form={form}
              onChange={setForm}
              disabled={!canManageInstallers}
              locale={locale}
            />

            <div className="modal-footer">
              <button
                onClick={() => setIsCreateOpen(false)}
                className="dmx-secondary-action h-10"
              >
                {copy("Cancel", "Отмена", "ביטול")}
              </button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={
                  !canManageInstallers ||
                  !form.full_name.trim() ||
                  createMutation.isPending
                }
                title={privilegedActionHint}
                className="dmx-primary-action h-10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {copy("Save", "Сохранить", "שמור")}
              </button>
            </div>
          </div>
        </div>
      )}

      {isEditOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="modal-shell max-h-[92vh] max-w-[980px] overflow-auto">
            <div className="modal-header">
              <h2 className="text-[16px] font-semibold">
                {copy("Edit Installer", "Редактировать монтажника", "עריכת מתקין")}
              </h2>
              <button
                onClick={() => {
                  setIsEditOpen(false);
                  setEditingInstaller(null);
                }}
                className="dmx-secondary-action h-9"
              >
                {copy("Close", "Закрыть", "סגור")}
              </button>
            </div>

            <InstallerBaseForm
              form={form}
              onChange={setForm}
              disabled={!canManageInstallers}
              locale={locale}
            />

            <WidgetCard
              title={copy("User Link", "Учётная запись", "חשבון משתמש")}
              headerMeta={copy(
                "Bind the installer card to a platform user account.",
                "Свяжите карточку монтажника с учётной записью в системе.",
                "קשרו את כרטיס המתקין לחשבון משתמש במערכת.",
              )}
              className="mt-5"
            >
              <div className="text-[12px] leading-6 text-text-secondary">
                {copy("Current linked user:", "Текущий связанный пользователь:", "משתמש מקושר נוכחי:")} {editingInstaller?.user_id || "none"}
              </div>
              {editingInstaller && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        `/reports?installer_id=${editingInstaller.id}`,
                      )
                    }
                    className="dmx-secondary-action h-9"
                  >
                    {copy("Open KPI report", "Открыть отчет по KPI", "פתח את דוח KPI")}
                  </button>
                  {canViewInstallerRates ? (
                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/earnings-ledger?installer_id=${editingInstaller.id}`,
                        )
                      }
                      className="dmx-secondary-action h-9"
                    >
                      <ReceiptText className="h-3.5 w-3.5" />
                      {copy("Open payroll ledger", "Открыть журнал начислений", "פתח יומן תשלומים")}
                    </button>
                  ) : null}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={linkUserId}
                  disabled={!canManageInstallers}
                  onChange={(e) => setLinkUserId(e.target.value)}
                  placeholder={copy("User UUID for link", "UUID пользователя", "UUID משתמש")}
                  className="control-input h-10 min-w-[280px] flex-1"
                />
                <button
                  onClick={() => linkUserMutation.mutate()}
                  disabled={
                    !canManageInstallers ||
                    !linkUserId.trim() ||
                    linkUserMutation.isPending
                  }
                  title={privilegedActionHint}
                  className="dmx-secondary-action h-10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  {copy("Link", "Привязать", "קשר")}
                </button>
                <button
                  onClick={() => unlinkUserMutation.mutate()}
                  disabled={
                    !canManageInstallers ||
                    !editingInstaller?.user_id ||
                    unlinkUserMutation.isPending
                  }
                  title={privilegedActionHint}
                  className="dmx-secondary-action h-10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Unlink2 className="w-3.5 h-3.5" />
                  {copy("Unlink", "Отсоединить", "בטל קישור")}
                </button>
              </div>
            </WidgetCard>

            {canViewInstallerRates ? (
              <WidgetCard
                title={copy("Installer Rates", "Расценки монтажника", "תעריפי מתקין")}
                headerMeta={copy(
                  "Keep rate rows aligned with current door-type pricing.",
                  "Поддерживайте расценки в соответствии с актуальными типами дверей.",
                  "שמרו על התאמת התעריפים לסוגי הדלתות העדכניים.",
                )}
                actionSlot={
                  <div className="rounded-lg border border-border bg-surface-subtle px-3 py-2 text-end text-[12px] text-text-secondary">
                    {rates.length} {copy("rows", "строк", "שורות")}
                  </div>
                }
                className="mt-5"
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_140px_130px]">
                    <select
                      value={newRateDoorTypeId}
                      disabled={!canManageRates}
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
                      disabled={!canManageRates}
                      onChange={(e) => setNewRatePrice(e.target.value)}
                      placeholder={copy("Price", "Цена", "מחיר")}
                      className="control-input h-10"
                    />
                    <button
                      onClick={() => createRateMutation.mutate()}
                      disabled={
                        !canManageRates ||
                        !newRateDoorTypeId ||
                        !newRatePrice ||
                        createRateMutation.isPending
                      }
                      title={rateActionHint}
                      className="dmx-primary-action h-10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {copy("Add Rate", "Добавить ставку", "הוסף תעריף")}
                    </button>
                  </div>

                  <div className="space-y-2">
                    {ratesQuery.isLoading && (
                      <div className="text-[12px] leading-6 text-text-secondary">
                        {copy("Loading rates...", "Загрузка ставок...", "טוען תעריפים...")}
                      </div>
                    )}
                    {!ratesQuery.isLoading && rates.length === 0 && (
                      <div className="text-[12px] leading-6 text-text-secondary">
                        {copy("No rates configured yet.", "Тарифы пока не настроены.", "עדיין לא הוגדרו תעריפים.")}
                      </div>
                    )}
                    {rates.map((rate) => {
                      const doorType = doorTypeMap.get(rate.door_type_id);
                      return (
                        <div
                          key={rate.id}
                          className="grid gap-2 rounded-lg border border-border bg-surface-subtle px-3 py-3 md:grid-cols-[minmax(0,1fr)_120px_auto_auto] md:items-center"
                        >
                          <div className="min-w-0 text-[12px] font-medium leading-6 text-text">
                            {doorType
                              ? `${doorType.code} - ${doorType.name}`
                              : rate.door_type_id}
                          </div>
                          <input
                            value={rateDrafts[rate.id] ?? String(rate.price)}
                            disabled={!canManageRates}
                            onChange={(e) =>
                              setRateDrafts((prev) => ({
                                ...prev,
                                [rate.id]: e.target.value,
                              }))
                            }
                            className="control-input h-9 w-full px-2.5 tabular-nums"
                          />
                          <button
                            onClick={() => updateRateMutation.mutate(rate.id)}
                            disabled={
                              !canManageRates || updateRateMutation.isPending
                            }
                            title={rateActionHint}
                            className="dmx-secondary-action h-9 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {copy("Save", "Сохранить", "שמור")}
                          </button>
                          <button
                            onClick={() => deleteRateMutation.mutate(rate.id)}
                            disabled={
                              !canManageRates || deleteRateMutation.isPending
                            }
                            title={rateActionHint}
                            className="dmx-secondary-action h-9 text-status-problem-fg hover:border-status-problem-border disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {copy("Delete", "Удалить", "מחק")}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </WidgetCard>
            ) : (
              <WidgetCard title={copy("Installer Rates", "Расценки монтажника", "תעריפי מתקין")} className="mt-5">
                <p className="text-[12px] leading-6 text-text-secondary">
                  {copy(
                    "Rate controls are hidden for your current admin scope.",
                    "Управление ставками недоступно для текущей роли администратора.",
                    "ניהול התעריפים אינו זמין להרשאת המנהל הנוכחית.",
                  )}
                </p>
              </WidgetCard>
            )}

            <div className="modal-footer">
              <button
                onClick={() => {
                  setIsEditOpen(false);
                  setEditingInstaller(null);
                }}
                className="dmx-secondary-action h-10"
              >
                {copy("Cancel", "Отмена", "ביטול")}
              </button>
              <button
                onClick={() => updateMutation.mutate()}
                disabled={
                  !canManageInstallers ||
                  !form.full_name.trim() ||
                  updateMutation.isPending
                }
                title={privilegedActionHint}
                className="dmx-primary-action h-10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {copy("Save Installer", "Сохранить монтажника", "שמור מתקין")}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
