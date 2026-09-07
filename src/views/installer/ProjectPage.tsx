"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  FolderOpen,
  MapPinned,
  MessageCircle,
  Phone,
  RefreshCcw,
  WalletCards,
  Wrench,
  XCircle,
} from "lucide-react";
import { LtrText } from "@/components/ui/LtrText";
import { StatusBadge } from "@/components/ui/status-badge";
import { apiFetch } from "@/lib/api";
import { readableApiError } from "@/lib/api-error-display";
import { formatLocaleDateTime, formatLocaleNumber } from "@/lib/formatting";
import { useI18n, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
const projectOverrides: Partial<Record<Locale, Record<string, string>>> = {
  en: {
    "installerProject.dismiss": "Dismiss",
    "installerProject.loadingProject": "Loading project details...",
    "installerProject.quickSearchPlaceholder":
      "Unit, order, apartment, location, marking",
    "installerProject.noAddonTypes": "No add-on types",
    "installerProject.optionalComment": "Optional comment",
    "installerProject.noReasons": "No reasons",
    "installerProject.doorLabel": "Door",
    "installerProject.onlyThisDoor": "Only this door",
    "installerProject.openDoor": "Open door",
    "installerProject.issueStatusFilter": "Issue status filter",
  },
  ru: {
    "installerProject.dismiss": "Закрыть",
    "installerProject.loadingProject": "Загружаем детали проекта...",
    "installerProject.quickSearchPlaceholder":
      "Дверь, заказ, квартира, локация, маркировка",
    "installerProject.noAddonTypes": "Нет типов доп. работ",
    "installerProject.optionalComment": "Необязательный комментарий",
    "installerProject.noReasons": "Нет причин",
    "installerProject.doorLabel": "Дверь",
    "installerProject.onlyThisDoor": "Только эта дверь",
    "installerProject.openDoor": "Открыть дверь",
    "installerProject.issueStatusFilter": "Фильтр статуса проблемы",
  },
  he: {
    "installerProject.dismiss": "סגור",
    "installerProject.loadingProject": "טוען פרטי פרויקט...",
    "installerProject.quickSearchPlaceholder": "דלת, הזמנה, דירה, מיקום, סימון",
    "installerProject.noAddonTypes": "אין סוגי תוספות",
    "installerProject.optionalComment": "הערה אופציונלית",
    "installerProject.noReasons": "אין סיבות",
    "installerProject.doorLabel": "דלת",
    "installerProject.onlyThisDoor": "רק הדלת הזו",
    "installerProject.openDoor": "פתח דלת",
    "installerProject.issueStatusFilter": "סינון סטטוס תקלה",
  },
};
type InstallerDoor = {
  id: string;
  unit_label: string;
  door_type_id: string;
  order_number: string | null;
  house_number: string | null;
  floor_label: string | null;
  apartment_number: string | null;
  location_code: string | null;
  door_marking: string | null;
  status: string;
  reason_id: string | null;
  comment: string | null;
  is_locked: boolean;
  version: number;
};
type InstallerIssue = {
  id: string;
  door_id: string;
  status: string;
  title: string | null;
  details: string | null;
};
type Reason = { id: string; code: string; name: string };
type AddonType = { id: string; name: string; unit: string };
type AddonPlan = { addon_type_id: string; qty_planned: string };
type AddonFact = {
  id: string;
  addon_type_id: string;
  qty_done: string;
  done_at: string;
  comment: string | null;
  source: string;
};
type InstallerProjectDetailsResponse = {
  id: string;
  name: string;
  address: string | null;
  address_details?: {
    street?: string | null;
    building?: string | null;
    city?: string | null;
    entrance?: string | null;
    lat?: string | number | null;
    lng?: string | number | null;
    waze_url?: string | null;
    waze_deep_link?: string | null;
  } | null;
  waze_url: string | null;
  whatsapp_url?: string | null;
  call_url?: string | null;
  developer?: {
    name?: string | null;
    contact_name?: string | null;
    phone?: string | null;
    phone_alt?: string | null;
    whatsapp?: string | null;
    notes?: string | null;
    whatsapp_deep_link?: string | null;
    call_deep_link?: string | null;
  } | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  developer_phone_alt?: string | null;
  developer_whatsapp?: string | null;
  developer_company?: string | null;
  developer_notes?: string | null;
  status: string;
  doors: InstallerDoor[];
  issues_open: InstallerIssue[];
  reasons_catalog: Reason[];
  addons: { types: AddonType[]; plan: AddonPlan[]; facts: AddonFact[] };
  server_time: string;
};
type DoorActionResponse = {
  ok: boolean;
  id: string;
  status: string;
  version: number;
};
function toAnchorId(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "item"
  );
}
type InstallerProjectPageProps = { projectId: string };
function normalizePhoneForDisplay(value: string | null | undefined): string {
  const trimmed = (value || "").trim();
  if (!trimmed) {
    return "";
  }
  const digits = trimmed.replace(/[^\d+]/g, "");
  if (digits.startsWith("+972") && digits.length === 13) {
    return `+972 ${digits.slice(4, 6)}-${digits.slice(6, 9)}-${digits.slice(9)}`;
  }
  return trimmed;
}
async function copyProjectPhoneToClipboard(
  value: string | null | undefined,
): Promise<boolean> {
  const trimmed = (value || "").trim();
  if (
    !trimmed ||
    typeof navigator === "undefined" ||
    !navigator.clipboard?.writeText
  ) {
    return false;
  }
  await navigator.clipboard.writeText(trimmed);
  return true;
}
type DoorQuickFilter =
  | "ALL"
  | "NOT_INSTALLED"
  | "INSTALLED"
  | "LOCKED"
  | "WITH_ISSUES";
function parseDoorQuickFilter(value: string | null): DoorQuickFilter | null {
  if (
    value === "ALL" ||
    value === "NOT_INSTALLED" ||
    value === "INSTALLED" ||
    value === "LOCKED" ||
    value === "WITH_ISSUES"
  ) {
    return value;
  }
  return null;
}
type ProjectNoticeTone = "error" | "warning";
type ProjectPriorityTone = "issue" | "locked" | "ready";
function projectNoticeClass(tone: ProjectNoticeTone): string {
  return cn(
    "flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm",
    tone === "error" &&
      "border-status-problem-border bg-status-problem-bg text-status-problem-fg",
    tone === "warning" &&
      "border-status-warning-border bg-status-warning-bg text-status-warning-fg",
  );
}
const projectPrimaryActionClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-transparent bg-accent px-3 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent";
const projectSmallActionClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-text transition-colors hover:bg-surface-subtle";
const projectMutedActionClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-surface-subtle px-3 text-xs font-medium text-text-secondary transition-colors hover:bg-surface";
const projectCompactActionClass =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-text transition-colors hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-60";
function projectQuickFilterClass(active: boolean): string {
  return cn(active ? "dmx-primary-action h-8" : "dmx-secondary-action h-8");
}
function projectPanelClass(extra?: string): string {
  return cn("rounded-lg border border-border bg-surface", extra);
}
function projectStateCardClass(): string {
  return projectPanelClass("p-4 text-sm text-text-secondary");
}
function projectDoorCardClass(hasIssue: boolean, isLocked: boolean): string {
  return cn(
    "rounded-lg border bg-surface p-3 transition-colors",
    hasIssue
      ? "border-status-problem-border bg-status-problem-bg"
      : isLocked
        ? "border-border bg-surface-subtle"
        : "border-border hover:border-border-strong hover:bg-surface-subtle",
  );
}
function projectPriorityChipClass(tone: ProjectPriorityTone): string {
  if (tone === "issue") {
    return "inline-flex items-center gap-1 rounded-lg border border-status-warning-border bg-status-warning-bg px-2 py-1.5 text-status-warning-fg";
  }
  if (tone === "locked") {
    return "inline-flex items-center gap-1 rounded-lg border border-status-blocked-border bg-status-blocked-bg px-2 py-1.5 text-status-blocked-fg";
  }
  return "inline-flex items-center gap-1 rounded-lg border border-status-ok-border bg-status-ok-bg px-2 py-1.5 text-status-ok-fg";
}
export default function InstallerProjectPage({
  projectId,
}: InstallerProjectPageProps) {
  const { locale, t } = useI18n();
  const copy = (en: string, ru: string, he: string) => {
    if (locale === "ru") return ru;
    if (locale === "he") return he;
    return en;
  };
  const normalizeReadableText = (value: string, fallback: string) =>
    /(\?{3,}|Р\u00a0\S|Р§\S)/.test(value) ? fallback : value;
  const pt = (key: string) =>
    normalizeReadableText(projectOverrides[locale]?.[key] ?? t(key), t(key));
  const doorStatusLabel = (status: string) => {
    const normalized = status.trim().toUpperCase();
    switch (normalized) {
      case "INSTALLED":
        return t("installerProject.installed");
      case "NOT_INSTALLED":
        return t("installerProject.notInstalled");
      case "LOCKED":
        return t("installerProject.locked");
      default:
        return status || "-";
    }
  };
  const shortOnlyThis =
    locale === "ru"
      ? "\u0422\u043e\u043b\u044c\u043a\u043e \u044d\u0442\u0430"
      : locale === "he"
        ? "\u05e8\u05e7 \u05d6\u05d5"
        : "Only this";
  const queryClient = useQueryClient();
  const [selectedReasonId, setSelectedReasonId] = useState("");
  const [notInstalledComment, setNotInstalledComment] = useState("");
  const [selectedAddonTypeId, setSelectedAddonTypeId] = useState("");
  const [addonQtyDone, setAddonQtyDone] = useState("1");
  const [addonComment, setAddonComment] = useState("");
  const [orderFilter, setOrderFilter] = useState("ALL");
  const [locationFilter, setLocationFilter] = useState("ALL");
  const [doorSearch, setDoorSearch] = useState("");
  const [doorQuickFilter, setDoorQuickFilter] =
    useState<DoorQuickFilter>("ALL");
  const [issueSearch, setIssueSearch] = useState("");
  const [issueStatusFilter, setIssueStatusFilter] = useState("ALL");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionHint, setActionHint] = useState<string | null>(null);
  const quickActionCopyTimeoutRef = useRef<number | null>(null);
  const detailsQuery = useQuery({
    queryKey: ["installer-project-details", projectId],
    queryFn: () =>
      apiFetch<InstallerProjectDetailsResponse>(
        `/api/v1/installer/projects/${projectId}`,
      ),
    staleTime: 15_000,
  });
  const details = detailsQuery.data;
  const reasons = details?.reasons_catalog || [];
  const addonTypes = details?.addons.types || [];
  const addressDetails = details?.address_details;
  const developer = details?.developer;
  const projectAddress =
    details?.address ||
    [
      addressDetails?.street,
      addressDetails?.building,
      addressDetails?.city,
      addressDetails?.entrance,
    ]
      .filter((value): value is string =>
        Boolean(value && String(value).trim()),
      )
      .join(", ") ||
    null;
  const wazeUrl =
    details?.waze_url ||
    addressDetails?.waze_deep_link ||
    addressDetails?.waze_url ||
    null;
  const whatsappUrl =
    details?.whatsapp_url || developer?.whatsapp_deep_link || null;
  const callUrl = details?.call_url || developer?.call_deep_link || null;
  const developerCompany =
    details?.developer_company || developer?.name || null;
  const contactName = details?.contact_name || developer?.contact_name || null;
  const contactPhone = details?.contact_phone || developer?.phone || null;
  const developerPhoneAlt =
    details?.developer_phone_alt || developer?.phone_alt || null;
  const developerWhatsapp =
    details?.developer_whatsapp || developer?.whatsapp || null;
  const developerNotes = details?.developer_notes || developer?.notes || null;
  useEffect(() => {
    if (!actionHint) {
      return;
    }
    const timeout = window.setTimeout(() => setActionHint(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [actionHint]);
  const clearPhoneCopyTimer = () => {
    if (quickActionCopyTimeoutRef.current != null) {
      window.clearTimeout(quickActionCopyTimeoutRef.current);
      quickActionCopyTimeoutRef.current = null;
    }
  };
  const showActionHint = (message: string) => {
    setActionError(null);
    setActionHint(message);
  };
  const handleCopyProjectPhone = async (value: string | null | undefined) => {
    const copied = await copyProjectPhoneToClipboard(value);
    if (copied) {
      setActionHint(
        copy(
          "Phone number copied.",
          "Номер телефона скопирован.",
          "מספר הטלפון הועתק.",
        ),
      );
    }
  };
  const schedulePhoneCopy = (value: string | null | undefined) => {
    clearPhoneCopyTimer();
    quickActionCopyTimeoutRef.current = window.setTimeout(() => {
      void handleCopyProjectPhone(value);
      quickActionCopyTimeoutRef.current = null;
    }, 700);
  };
  const orderOptions = useMemo(() => {
    const values = new Set<string>();
    for (const door of details?.doors || []) {
      if (door.order_number) {
        values.add(door.order_number);
      }
    }
    return Array.from(values).sort();
  }, [details?.doors]);
  const locationOptions = useMemo(() => {
    const values = new Set<string>();
    for (const door of details?.doors || []) {
      if (door.location_code) {
        values.add(door.location_code);
      }
    }
    return Array.from(values).sort();
  }, [details?.doors]);
  const issueDoorIds = useMemo(
    () => new Set((details?.issues_open || []).map((issue) => issue.door_id)),
    [details?.issues_open],
  );
  const issueDoorMap = useMemo(
    () => new Map((details?.doors || []).map((door) => [door.id, door])),
    [details?.doors],
  );
  const issueStatusOptions = useMemo(
    () =>
      Array.from(
        new Set((details?.issues_open || []).map((issue) => issue.status)),
      ).sort(),
    [details?.issues_open],
  );
  const issueStatusCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const issue of details?.issues_open || []) {
      counts.set(issue.status, (counts.get(issue.status) || 0) + 1);
    }
    return Array.from(counts.entries()).sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1];
      }
      return left[0].localeCompare(right[0]);
    });
  }, [details?.issues_open]);
  const quickFilterCounts = useMemo(() => {
    const doors = details?.doors || [];
    return {
      ALL: doors.length,
      NOT_INSTALLED: doors.filter((door) => door.status === "NOT_INSTALLED")
        .length,
      INSTALLED: doors.filter((door) => door.status === "INSTALLED").length,
      LOCKED: doors.filter((door) => door.is_locked).length,
      WITH_ISSUES: doors.filter((door) => issueDoorIds.has(door.id)).length,
    };
  }, [details?.doors, issueDoorIds]);
  const filteredDoors = useMemo(() => {
    const rows = details?.doors || [];
    const searchNeedle = doorSearch.trim().toLowerCase();
    return rows.filter((door) => {
      const matchesOrder =
        orderFilter === "ALL" || door.order_number === orderFilter;
      const matchesLocation =
        locationFilter === "ALL" || door.location_code === locationFilter;
      const matchesSearch =
        searchNeedle.length === 0 ||
        [
          door.unit_label,
          door.order_number,
          door.house_number,
          door.floor_label,
          door.apartment_number,
          door.location_code,
          door.door_marking,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(searchNeedle));
      const matchesQuickFilter =
        doorQuickFilter === "ALL" ||
        (doorQuickFilter === "NOT_INSTALLED" &&
          door.status === "NOT_INSTALLED") ||
        (doorQuickFilter === "INSTALLED" && door.status === "INSTALLED") ||
        (doorQuickFilter === "LOCKED" && door.is_locked) ||
        (doorQuickFilter === "WITH_ISSUES" && issueDoorIds.has(door.id));
      return (
        matchesOrder && matchesLocation && matchesSearch && matchesQuickFilter
      );
    });
  }, [
    details?.doors,
    doorQuickFilter,
    doorSearch,
    issueDoorIds,
    locationFilter,
    orderFilter,
  ]);
  const filteredIssues = useMemo(() => {
    const searchNeedle = issueSearch.trim().toLowerCase();
    return (details?.issues_open || [])
      .filter((issue) => {
        if (issueStatusFilter !== "ALL" && issue.status !== issueStatusFilter) {
          return false;
        }
        if (!searchNeedle) {
          return true;
        }
        const relatedDoor = issueDoorMap.get(issue.door_id);
        return [
          issue.title,
          issue.details,
          issue.status,
          relatedDoor?.unit_label,
          relatedDoor?.order_number,
          relatedDoor?.location_code,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(searchNeedle));
      })
      .sort((left, right) => {
        const priority = (value: string) => {
          if (value === "BLOCKED") return 0;
          if (value === "OPEN") return 1;
          return 2;
        };
        const leftPriority = priority(left.status);
        const rightPriority = priority(right.status);
        if (leftPriority !== rightPriority) {
          return leftPriority - rightPriority;
        }
        const leftDoor =
          issueDoorMap.get(left.door_id)?.unit_label || left.door_id;
        const rightDoor =
          issueDoorMap.get(right.door_id)?.unit_label || right.door_id;
        return leftDoor.localeCompare(rightDoor);
      });
  }, [details?.issues_open, issueDoorMap, issueSearch, issueStatusFilter]);
  const doorsByFloor = useMemo(() => {
    const groups = new Map<string, InstallerDoor[]>();
    for (const door of filteredDoors) {
      const floor = door.floor_label || "No floor";
      const existing = groups.get(floor) || [];
      existing.push(door);
      groups.set(floor, existing);
    }
    return Array.from(groups.entries());
  }, [filteredDoors]);
  const floorJumpTargets = useMemo(
    () =>
      doorsByFloor.map(([floor, doors]) => ({
        floor,
        count: doors.length,
        href: `#project-floor-${toAnchorId(floor)}`,
      })),
    [doorsByFloor],
  );
  const issueDoorJumpTargets = useMemo(() => {
    const doors = filteredDoors.filter((door) => issueDoorIds.has(door.id));
    const seen = new Set<string>();
    return doors.filter((door) => {
      if (seen.has(door.id)) {
        return false;
      }
      seen.add(door.id);
      return true;
    });
  }, [filteredDoors, issueDoorIds]);
  const priorityDoors = useMemo(() => {
    return filteredDoors
      .filter(
        (door) => issueDoorIds.has(door.id) || door.status === "NOT_INSTALLED",
      )
      .sort((left, right) => {
        const leftIssue = issueDoorIds.has(left.id) ? 1 : 0;
        const rightIssue = issueDoorIds.has(right.id) ? 1 : 0;
        if (leftIssue !== rightIssue) {
          return rightIssue - leftIssue;
        }
        const leftUnlocked = left.is_locked ? 0 : 1;
        const rightUnlocked = right.is_locked ? 0 : 1;
        if (leftUnlocked !== rightUnlocked) {
          return rightUnlocked - leftUnlocked;
        }
        return left.unit_label.localeCompare(right.unit_label);
      })
      .slice(0, 5)
      .map((door) => ({
        id: door.id,
        unitLabel: door.unit_label,
        href: `#door-${door.id}`,
        floorLabel: door.floor_label || "No floor",
        tone: issueDoorIds.has(door.id)
          ? "issue"
          : door.is_locked
            ? "locked"
            : "ready",
        label: issueDoorIds.has(door.id)
          ? "Issue"
          : door.is_locked
            ? "Locked"
            : "Not installed",
        quickSearchValue: door.unit_label,
      }));
  }, [filteredDoors, issueDoorIds]);
  const installMutation = useMutation({
    mutationFn: (doorId: string) =>
      apiFetch<DoorActionResponse>(
        `/api/v1/installer/doors/${doorId}/install`,
        { method: "POST" },
      ),
    onSuccess: async () => {
      setActionError(null);
      await queryClient.invalidateQueries({
        queryKey: ["installer-project-details", projectId],
      });
    },
    onError: (error) => {
      setActionError(
        readableApiError(
          error,
          locale,
          locale === "ru"
            ? "Не удалось отметить установку."
            : locale === "he"
              ? "לא ניתן לסמן את ההתקנה."
              : "Install action failed.",
        ),
      );
    },
  });
  const notInstalledMutation = useMutation({
    mutationFn: (payload: {
      doorId: string;
      reasonId: string;
      comment: string;
    }) =>
      apiFetch<DoorActionResponse>(
        `/api/v1/installer/doors/${payload.doorId}/not-installed`,
        {
          method: "POST",
          body: JSON.stringify({
            reason_id: payload.reasonId,
            comment: payload.comment || null,
          }),
        },
      ),
    onSuccess: async () => {
      setActionError(null);
      await queryClient.invalidateQueries({
        queryKey: ["installer-project-details", projectId],
      });
    },
    onError: (error) => {
      setActionError(
        readableApiError(
          error,
          locale,
          locale === "ru"
            ? "Не удалось отметить дверь как неустановленную."
            : locale === "he"
              ? "לא ניתן לסמן את הדלת כלא מותקנת."
              : "Not-installed action failed.",
        ),
      );
    },
  });
  const addonMutation = useMutation({
    mutationFn: (payload: {
      addonTypeId: string;
      qtyDone: string;
      comment: string;
    }) =>
      apiFetch<{ ok: boolean }>(
        `/api/v1/installer/addons/projects/${projectId}/facts`,
        {
          method: "POST",
          body: JSON.stringify({
            addon_type_id: payload.addonTypeId,
            qty_done: payload.qtyDone,
            comment: payload.comment || null,
          }),
        },
      ),
    onSuccess: async () => {
      setActionError(null);
      setAddonQtyDone("1");
      setAddonComment("");
      await queryClient.invalidateQueries({
        queryKey: ["installer-project-details", projectId],
      });
    },
    onError: (error) => {
      setActionError(
        readableApiError(
          error,
          locale,
          locale === "ru"
            ? "Не удалось сохранить факт по допработе."
            : locale === "he"
              ? "לא ניתן לשמור דיווח על עבודה נוספת."
              : "Add-on fact action failed.",
        ),
      );
    },
  });
  const pendingAction =
    installMutation.isPending ||
    notInstalledMutation.isPending ||
    addonMutation.isPending;
  const activeReasonId = selectedReasonId || reasons[0]?.id || "";
  const activeAddonTypeId = selectedAddonTypeId || addonTypes[0]?.id || "";
  const activeDoorFilterCount = [
    orderFilter !== "ALL",
    locationFilter !== "ALL",
    doorSearch.trim().length > 0,
    doorQuickFilter !== "ALL",
  ].filter(Boolean).length;
  const activeIssueFilterCount = [
    issueSearch.trim().length > 0,
    issueStatusFilter !== "ALL",
  ].filter(Boolean).length;
  function resetDoorFilters() {
    setOrderFilter("ALL");
    setLocationFilter("ALL");
    setDoorSearch("");
    setDoorQuickFilter("ALL");
  }
  function resetIssueFilters() {
    setIssueSearch("");
    setIssueStatusFilter("ALL");
  }
  function focusIssueDoor(door: InstallerDoor) {
    focusPriorityDoor({
      href: `#door-${door.id}`,
      quickSearchValue: door.unit_label,
    });
  }
  function focusIssueDoorsList() {
    setOrderFilter("ALL");
    setLocationFilter("ALL");
    setDoorSearch("");
    setDoorQuickFilter("WITH_ISSUES");
    if (typeof window !== "undefined") {
      window.location.hash = "project-doors";
    }
  }
  function focusPriorityDoor(door: { href: string; quickSearchValue: string }) {
    setOrderFilter("ALL");
    setLocationFilter("ALL");
    setDoorQuickFilter("ALL");
    setDoorSearch(door.quickSearchValue);
    if (typeof window !== "undefined") {
      window.location.hash = door.href.slice(1);
    }
  }
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const nextDoorFilter = parseDoorQuickFilter(params.get("door_filter"));
    if (nextDoorFilter) {
      setDoorQuickFilter(nextDoorFilter);
    }
    const nextIssueStatus = params.get("issue_status");
    if (nextIssueStatus) {
      setIssueStatusFilter(nextIssueStatus);
    }
    const nextIssueSearch = params.get("issue_search");
    if (nextIssueSearch) {
      setIssueSearch(nextIssueSearch);
    }
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    if (doorQuickFilter === "ALL") {
      params.delete("door_filter");
    } else {
      params.set("door_filter", doorQuickFilter);
    }
    if (issueStatusFilter === "ALL") {
      params.delete("issue_status");
    } else {
      params.set("issue_status", issueStatusFilter);
    }
    const normalizedIssueSearch = issueSearch.trim();
    if (normalizedIssueSearch.length === 0) {
      params.delete("issue_search");
    } else {
      params.set("issue_search", normalizedIssueSearch);
    }
    const nextSearch = params.toString();
    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`;
    window.history.replaceState({}, "", nextUrl);
  }, [doorQuickFilter, issueSearch, issueStatusFilter]);
  return (
    <div className="motion-stagger readability-wrap page-stack">
      {" "}
      <section className="border-b border-border pb-5">
        {" "}
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          {" "}
          <div className="max-w-3xl">
            {" "}
            <Link
              href="/installer"
              className="inline-flex items-center gap-2 text-sm text-text-secondary transition-colors hover:text-text"
            >
              {" "}
              <ArrowLeft className="h-4 w-4" />{" "}
              {t("installerProject.backToWorkspace")}{" "}
            </Link>{" "}
            <div className="page-eyebrow mt-4">
              {t("installerProject.eyebrow")}
            </div>{" "}
            <h1 className="mt-3 text-[26px] font-medium leading-tight text-text sm:text-[30px]">
              {" "}
              {details?.name || t("installerProject.projectDetails")}{" "}
            </h1>{" "}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm leading-6 text-text-secondary sm:text-[15px]">
              {" "}
              {wazeUrl && projectAddress ? (
                <a
                  href={wazeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 underline-offset-4 transition-colors hover:text-text hover:underline"
                >
                  {" "}
                  <MapPinned className="h-4 w-4" /> {projectAddress}{" "}
                </a>
              ) : (
                <span>{projectAddress || t("installerProject.noAddress")}</span>
              )}{" "}
              <span>|</span>{" "}
              <span>
                {" "}
                {t("installerProject.statusPrefix")}:{" "}
                {details?.status || "--"}{" "}
              </span>{" "}
            </div>{" "}
            <div className="mt-4 flex flex-wrap gap-2">
              {" "}
              <span className="metric-chip">
                {" "}
                {t("installerProject.doors")}{" "}
                <LtrText>
                  {formatLocaleNumber(details?.doors.length, locale)}
                </LtrText>{" "}
              </span>{" "}
              <span className="metric-chip">
                {" "}
                {t("installerProject.issues")}{" "}
                <LtrText>
                  {formatLocaleNumber(details?.issues_open.length, locale)}
                </LtrText>{" "}
              </span>{" "}
            </div>{" "}
          </div>{" "}
          <div className={projectPanelClass("min-w-0 max-w-xl space-y-4 p-4 sm:p-5 xl:min-w-[320px]")}>
            {" "}
            <div className="text-[12px] leading-5 text-text-secondary">
              {" "}
              {t("installerProject.contextCopy")}{" "}
            </div>{" "}
            <div className="grid gap-2 sm:grid-cols-2">
              {" "}
              <Link
                href={`/installer/calendar?project_id=${projectId}`}
                className={projectPrimaryActionClass}
              >
                {" "}
                <CalendarDays aria-hidden="true" className="h-4 w-4" />{" "}
                {t("installerProject.openSchedule")}{" "}
              </Link>{" "}
              <Link
                href={`/installer/earnings?project_id=${projectId}`}
                className={projectSmallActionClass}
              >
                {" "}
                <WalletCards aria-hidden="true" className="h-4 w-4" />{" "}
                {copy("Open earnings", "Открыть заработок", "פתח רווחים")}{" "}
              </Link>{" "}
              <Link
                href={`/installer/sync-queue?project_id=${projectId}`}
                className={projectSmallActionClass}
              >
                {" "}
                <RefreshCcw aria-hidden="true" className="h-4 w-4" />{" "}
                {copy(
                  "Open sync queue",
                  "Открыть очередь синка",
                  "פתח תור סנכרון",
                )}{" "}
              </Link>{" "}
              <a href="#project-doors" className={projectSmallActionClass}>
                {" "}
                <FolderOpen aria-hidden="true" className="h-4 w-4" />{" "}
                {t("installerProject.doorsSection")}{" "}
              </a>{" "}
              <a
                href="#project-open-issues"
                className={projectSmallActionClass}
              >
                {" "}
                <CircleAlert aria-hidden="true" className="h-4 w-4" />{" "}
                {t("installerProject.openIssues")}{" "}
              </a>{" "}
              {wazeUrl ? (
                <a
                  href={wazeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={projectSmallActionClass}
                >
                  {" "}
                  <MapPinned aria-hidden="true" className="h-4 w-4" />{" "}
                  {t("installerProject.openWaze")}{" "}
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => showActionHint(t("installerProject.noWaze"))}
                  className={projectMutedActionClass}
                >
                  {" "}
                  <MapPinned aria-hidden="true" className="h-4 w-4" />{" "}
                  {copy("Open Waze", "Открыть Waze", "פתח Waze")}{" "}
                </button>
              )}{" "}
              {whatsappUrl ? (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={projectSmallActionClass}
                >
                  {" "}
                  <MessageCircle aria-hidden="true" className="h-4 w-4" />{" "}
                  {copy(
                    "Open WhatsApp",
                    "Открыть WhatsApp",
                    "פתח WhatsApp",
                  )}{" "}
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    showActionHint(
                      copy(
                        "Add contact phone to unlock WhatsApp",
                        "Добавьте телефон контакта, чтобы включить WhatsApp",
                        "הוסף טלפון איש קשר כדי לפתוח WhatsApp",
                      ),
                    )
                  }
                  className={projectMutedActionClass}
                >
                  {" "}
                  <MessageCircle aria-hidden="true" className="h-4 w-4" />{" "}
                  {copy(
                    "Open WhatsApp",
                    "Открыть WhatsApp",
                    "פתח WhatsApp",
                  )}{" "}
                </button>
              )}{" "}
              {callUrl ? (
                <>
                  {" "}
                  <a href={callUrl} className={projectSmallActionClass}>
                    {" "}
                    <Phone aria-hidden="true" className="h-4 w-4" />{" "}
                    {copy(
                      "Call contact",
                      "Позвонить контакту",
                      "התקשר לאיש הקשר",
                    )}{" "}
                  </a>{" "}
                  <button
                    type="button"
                    title={copy(
                      "Click or hold to copy the number",
                      "Нажмите или удерживайте, чтобы скопировать номер",
                      "לחץ או החזק כדי להעתיק את המספר",
                    )}
                    onClick={() => void handleCopyProjectPhone(contactPhone)}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      void handleCopyProjectPhone(contactPhone);
                    }}
                    onPointerDown={() => schedulePhoneCopy(contactPhone)}
                    onPointerUp={clearPhoneCopyTimer}
                    onPointerLeave={clearPhoneCopyTimer}
                    className={cn(projectSmallActionClass, "tabular-nums")}
                  >
                    {" "}
                    {normalizePhoneForDisplay(contactPhone)}{" "}
                  </button>{" "}
                </>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    showActionHint(
                      copy(
                        "Add primary phone to unlock calling",
                        "Добавьте основной телефон, чтобы включить звонок",
                        "הוסף טלפון ראשי כדי לפתוח חיוג",
                      ),
                    )
                  }
                  className={projectMutedActionClass}
                >
                  {" "}
                  <Phone aria-hidden="true" className="h-4 w-4" />{" "}
                  {copy(
                    "Call contact",
                    "Позвонить контакту",
                    "התקשר לאיש הקשר",
                  )}{" "}
                </button>
              )}{" "}
            </div>{" "}
            <details className="rounded-lg border border-border bg-surface-subtle px-3 py-3 text-sm">
              {" "}
              <summary className="cursor-pointer list-none font-medium text-text">
                {" "}
                {copy(
                  "Developer contact",
                  "Контакт застройщика",
                  "איש קשר של היזם",
                )}{" "}
              </summary>{" "}
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {" "}
                <div className="rounded-lg border border-border bg-surface px-3 py-3 text-sm">
                  {" "}
                  <div className="text-[11px] uppercase text-text-secondary">
                    {" "}
                    {copy("Developer", "Застройщик", "יזם")}{" "}
                  </div>{" "}
                  <div className="mt-1 font-medium text-text">
                    {" "}
                    {details?.developer_company ||
                      copy("Not filled", "Не заполнено", "לא הוזן")}{" "}
                  </div>{" "}
                </div>{" "}
                <div className="rounded-lg border border-border bg-surface px-3 py-3 text-sm">
                  {" "}
                  <div className="text-[11px] uppercase text-text-secondary">
                    {" "}
                    {copy("Contact", "Контакт", "איש קשר")}{" "}
                  </div>{" "}
                  <div className="mt-1 font-medium text-text">
                    {" "}
                    {details?.contact_name ||
                      copy("Not filled", "Не заполнено", "לא הוזן")}{" "}
                  </div>{" "}
                  <div className="mt-1 text-xs text-text-secondary">
                    {" "}
                    {contactPhone
                      ? normalizePhoneForDisplay(contactPhone)
                      : copy(
                          "No phone yet",
                          "Телефон не добавлен",
                          "אין עדיין טלפון",
                        )}{" "}
                  </div>{" "}
                  {developerPhoneAlt ? (
                    <div className="mt-1 text-xs text-text-secondary">
                      {" "}
                      {copy("Alt", "Доп.", "נוסף")}:{" "}
                      {normalizePhoneForDisplay(developerPhoneAlt)}{" "}
                    </div>
                  ) : null}{" "}
                  {developerWhatsapp ? (
                    <div className="mt-1 text-xs text-text-secondary">
                      {" "}
                      WhatsApp:{" "}
                      {normalizePhoneForDisplay(developerWhatsapp)}{" "}
                    </div>
                  ) : null}{" "}
                </div>{" "}
              </div>{" "}
              {developerNotes ? (
                <div className="mt-2 rounded-lg border border-border bg-surface px-3 py-3 text-sm text-text-secondary">
                  {" "}
                  <div className="text-[11px] uppercase text-text-secondary">
                    {" "}
                    {copy(
                      "Site notes",
                      "Заметки по объекту",
                      "הערות לאתר",
                    )}{" "}
                  </div>{" "}
                  <div className="mt-1 leading-6 text-text/90">
                    {developerNotes}
                  </div>{" "}
                </div>
              ) : null}{" "}
            </details>{" "}
          </div>{" "}
        </div>{" "}
      </section>{" "}
      {detailsQuery.isError && (
        <div className={projectNoticeClass("error")}>
          {" "}
          <span>
            {readableApiError(
              detailsQuery.error,
              locale,
              t("installerProject.error"),
            )}
          </span>{" "}
          <button
            type="button"
            onClick={() => {
              void detailsQuery.refetch();
            }}
            className="dmx-secondary-action h-8"
          >
            {" "}
            {t("common.retry")}{" "}
          </button>{" "}
        </div>
      )}{" "}
      {actionHint && (
        <div className={projectNoticeClass("warning")}>
          {" "}
          <span>{actionHint}</span>{" "}
          <button
            type="button"
            onClick={() => setActionHint(null)}
            className="dmx-secondary-action h-8"
          >
            {" "}
            {pt("installerProject.dismiss")}{" "}
          </button>{" "}
        </div>
      )}{" "}
      {actionError && (
        <div className={projectNoticeClass("error")}>
          {" "}
          <span>{actionError}</span>{" "}
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="dmx-secondary-action h-8"
          >
            {" "}
            {pt("installerProject.dismiss")}{" "}
          </button>{" "}
        </div>
      )}{" "}
      {detailsQuery.isLoading && (
        <div className={projectStateCardClass()}>
          {" "}
          {pt("installerProject.loadingProject")}{" "}
        </div>
      )}{" "}
      {details && (
        <>
          {" "}
          <section className="grid gap-4 lg:grid-cols-2">
            {" "}
            <div className={projectPanelClass("space-y-3 p-4")}>
              {" "}
              <div className="flex flex-wrap items-center justify-between gap-2">
                {" "}
                <h2 className="text-lg font-semibold">
                  {t("installerProject.doorFilters")}
                </h2>{" "}
                <button
                  type="button"
                  onClick={resetDoorFilters}
                  disabled={
                    orderFilter === "ALL" &&
                    locationFilter === "ALL" &&
                    doorSearch.trim().length === 0 &&
                    doorQuickFilter === "ALL"
                  }
                  className={projectCompactActionClass}
                >
                  {" "}
                  {t("installerProject.resetDoorFilters")}{" "}
                </button>{" "}
              </div>{" "}
              <div className="flex flex-wrap gap-2">
                {" "}
                {(
                  [
                    ["ALL", t("common.all")],
                    ["NOT_INSTALLED", t("installerProject.notInstalled")],
                    ["INSTALLED", t("installerProject.installed")],
                    ["WITH_ISSUES", t("installerProject.withIssues")],
                    ["LOCKED", t("installerProject.locked")],
                  ] as Array<[DoorQuickFilter, string]>
                ).map(([value, label]) => {
                  const active = doorQuickFilter === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setDoorQuickFilter(value)}
                      className={projectQuickFilterClass(active)}
                    >
                      {" "}
                      <span>{label}</span>{" "}
                      <LtrText>({quickFilterCounts[value]})</LtrText>{" "}
                    </button>
                  );
                })}{" "}
              </div>{" "}
              <label className="block">
                {" "}
                <span className="text-xs text-text-secondary">
                  {t("installerProject.quickSearch")}
                </span>{" "}
                <input
                  value={doorSearch}
                  onChange={(event) => setDoorSearch(event.target.value)}
                  className="control-input mt-1"
                  placeholder={pt("installerProject.quickSearchPlaceholder")}
                />{" "}
              </label>{" "}
              <label className="block">
                {" "}
                <span className="text-xs text-text-secondary">
                  {t("installerProject.orderNumber")}
                </span>{" "}
                <select
                  value={orderFilter}
                  onChange={(event) => setOrderFilter(event.target.value)}
                  className="control-input mt-1"
                >
                  {" "}
                  <option value="ALL">
                    {t("installerProject.allOrders")}
                  </option>{" "}
                  {orderOptions.map((value) => (
                    <option key={value} value={value}>
                      {" "}
                      {value}{" "}
                    </option>
                  ))}{" "}
                </select>{" "}
              </label>{" "}
              <label className="block">
                {" "}
                <span className="text-xs text-text-secondary">
                  {t("installerProject.locationCode")}
                </span>{" "}
                <select
                  value={locationFilter}
                  onChange={(event) => setLocationFilter(event.target.value)}
                  className="control-input mt-1"
                >
                  {" "}
                  <option value="ALL">
                    {t("installerProject.allLocations")}
                  </option>{" "}
                  {locationOptions.map((value) => (
                    <option key={value} value={value}>
                      {" "}
                      {value}{" "}
                    </option>
                  ))}{" "}
                </select>{" "}
              </label>{" "}
            </div>{" "}
            <div
              id="project-add-on-fact"
              className={projectPanelClass("space-y-3 p-4")}
            >
              {" "}
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                {" "}
                <Wrench className="h-5 w-5" />{" "}
                {t("installerProject.addonFact")}{" "}
              </h2>{" "}
              <label className="block">
                {" "}
                <span className="text-xs text-text-secondary">
                  {t("installerProject.addonType")}
                </span>{" "}
                <select
                  value={activeAddonTypeId}
                  onChange={(event) =>
                    setSelectedAddonTypeId(event.target.value)
                  }
                  className="control-input mt-1"
                >
                  {" "}
                  {addonTypes.length === 0 && (
                    <option value="">
                      {pt("installerProject.noAddonTypes")}
                    </option>
                  )}{" "}
                  {addonTypes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {" "}
                      {item.name}{" "}
                    </option>
                  ))}{" "}
                </select>{" "}
              </label>{" "}
              <label className="block">
                {" "}
                <span className="text-xs text-text-secondary">
                  {t("installerProject.qtyDone")}
                </span>{" "}
                <input
                  value={addonQtyDone}
                  onChange={(event) => setAddonQtyDone(event.target.value)}
                  className="control-input mt-1"
                  placeholder="1"
                />{" "}
              </label>{" "}
              <label className="block">
                {" "}
                <span className="text-xs text-text-secondary">
                  {t("installerProject.comment")}
                </span>{" "}
                <textarea
                  value={addonComment}
                  onChange={(event) => setAddonComment(event.target.value)}
                  className="control-textarea mt-1 min-h-20"
                  placeholder={pt("installerProject.optionalComment")}
                />{" "}
              </label>{" "}
              <button
                type="button"
                disabled={
                  pendingAction || !activeAddonTypeId || !addonQtyDone.trim()
                }
                onClick={() => {
                  addonMutation.mutate({
                    addonTypeId: activeAddonTypeId,
                    qtyDone: addonQtyDone.trim(),
                    comment: addonComment.trim(),
                  });
                }}
                className="dmx-primary-action h-10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {" "}
                {t("installerProject.queueAddonFact")}{" "}
              </button>{" "}
            </div>{" "}
          </section>{" "}
          <section id="project-open-issues" className="space-y-3">
            {" "}
            <div className="flex flex-wrap items-center justify-between gap-3">
              {" "}
              <div>
                {" "}
                <h2 className="text-lg font-semibold">
                  {t("installerProject.openIssues")}
                </h2>{" "}
                <div className="text-sm text-text-secondary">
                  {" "}
                  {t("installerProject.visibleIssues")}{" "}
                  <LtrText>
                    {" "}
                    {`${formatLocaleNumber(filteredIssues.length, locale)} / ${formatLocaleNumber(details.issues_open.length, locale)}`}{" "}
                  </LtrText>{" "}
                  {activeIssueFilterCount > 0
                    ? ` | ${t("installerProject.activeFilters")} ${activeIssueFilterCount}`
                    : ""}{" "}
                </div>{" "}
                {issueStatusCounts.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {" "}
                    {issueStatusCounts.map(([status, count]) => {
                      const active = issueStatusFilter === status;
                      return (
                        <button
                          key={status}
                          type="button"
                          aria-pressed={active}
                          onClick={() =>
                            setIssueStatusFilter(active ? "ALL" : status)
                          }
                          className={projectQuickFilterClass(active)}
                        >
                          {" "}
                          {status} ({count}){" "}
                        </button>
                      );
                    })}{" "}
                  </div>
                )}{" "}
              </div>{" "}
              {details.issues_open.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {" "}
                  <button
                    type="button"
                    onClick={focusIssueDoorsList}
                    className={projectCompactActionClass}
                  >
                    {" "}
                    {t("installerProject.showIssueDoors")}{" "}
                  </button>{" "}
                  <input
                    value={issueSearch}
                    onChange={(event) => setIssueSearch(event.target.value)}
                    placeholder={t("installerProject.issueSearchPlaceholder")}
                    className="control-input h-9"
                  />{" "}
                  <select
                    aria-label={pt("installerProject.issueStatusFilter")}
                    value={issueStatusFilter}
                    onChange={(event) =>
                      setIssueStatusFilter(event.target.value)
                    }
                    className="control-input h-9"
                  >
                    {" "}
                    <option value="ALL">
                      {t("installerProject.allStatuses")}
                    </option>{" "}
                    {issueStatusOptions.map((status) => (
                      <option key={status} value={status}>
                        {" "}
                        {status}{" "}
                      </option>
                    ))}{" "}
                  </select>{" "}
                  <button
                    type="button"
                    onClick={resetIssueFilters}
                    disabled={activeIssueFilterCount === 0}
                    className={projectCompactActionClass}
                  >
                    {" "}
                    {t("installerProject.resetIssueFilters")}{" "}
                  </button>{" "}
                </div>
              )}{" "}
            </div>{" "}
            {details.issues_open.length === 0 && (
              <div className={projectStateCardClass()}>
                {" "}
                {t("installerProject.noOpenIssues")}{" "}
              </div>
            )}{" "}
            {details.issues_open.length > 0 && filteredIssues.length === 0 && (
              <div className={projectStateCardClass()}>
                {" "}
                {t("installerProject.noIssuesForFilters")}{" "}
              </div>
            )}{" "}
            {filteredIssues.map((issue) => {
              const relatedDoor = issueDoorMap.get(issue.door_id);
              return (
                <div
                  key={issue.id}
                  className="rounded-lg border border-status-warning-border bg-status-warning-bg p-4 text-status-warning-fg"
                >
                  {" "}
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    {" "}
                    <div>
                      {" "}
                      <div className="text-sm font-medium text-text">
                        {" "}
                        {issue.title ||
                          t("installerProject.issueFallback")}{" "}
                      </div>{" "}
                      <div className="mt-1 text-xs text-status-warning-fg">
                        {" "}
                        {pt("installerProject.doorLabel")}{" "}
                        {relatedDoor?.unit_label || issue.door_id}{" "}
                      </div>{" "}
                    </div>{" "}
                    <span className="rounded-md border border-status-warning-border bg-surface px-2 py-1 text-xs text-status-warning-fg">
                      {" "}
                      {issue.status}{" "}
                    </span>{" "}
                  </div>{" "}
                  <div className="mt-2 text-sm text-status-warning-fg">
                    {" "}
                    {issue.details || t("installerProject.noDetails")}{" "}
                  </div>{" "}
                  <div className="mt-3 flex flex-wrap gap-3 text-xs">
                    {" "}
                    {relatedDoor ? (
                      <>
                        {" "}
                        <button
                          type="button"
                          onClick={() => focusIssueDoor(relatedDoor)}
                          className="font-medium text-status-warning-fg underline-offset-4 hover:underline"
                        >
                          {" "}
                          {pt("installerProject.onlyThisDoor")}{" "}
                          {relatedDoor.unit_label}{" "}
                        </button>{" "}
                        <a
                          href={`#door-${relatedDoor.id}`}
                          className="font-medium text-status-warning-fg underline-offset-4 hover:underline"
                        >
                          {" "}
                          {pt("installerProject.openDoor")}{" "}
                          {relatedDoor.unit_label}{" "}
                        </a>{" "}
                        <Link
                          href={`/installer/issues?project_id=${projectId}&issue_id=${issue.id}&issue_status=${encodeURIComponent(issue.status)}`}
                          className="font-medium text-status-warning-fg underline-offset-4 hover:underline"
                        >
                          {" "}
                          {copy(
                            "Open in issues flow",
                            "Открыть в потоке проблем",
                            "פתח בזרימת התקלות",
                          )}{" "}
                        </Link>{" "}
                      </>
                    ) : (
                      <span className="text-status-warning-fg">
                        {t("installerProject.relatedDoorMissing")}
                      </span>
                    )}{" "}
                  </div>{" "}
                </div>
              );
            })}{" "}
          </section>{" "}
          <section
            className={projectPanelClass("sticky top-4 z-10 bg-surface/95 p-4 backdrop-blur")}
            aria-label={copy("Door summary bar", "Сводка по дверям", "סיכום דלתות")}
          >
            {" "}
            <div className="flex flex-wrap items-center justify-between gap-3">
              {" "}
              <div className="flex flex-wrap items-center gap-4 text-sm">
                {" "}
                <div>
                  {" "}
                  {t("installerProject.visibleDoors")}:{" "}
                  <LtrText className="font-semibold">
                    {" "}
                    {`${formatLocaleNumber(filteredDoors.length, locale)} / ${formatLocaleNumber(details.doors.length, locale)}`}{" "}
                  </LtrText>{" "}
                </div>{" "}
                <div>
                  {" "}
                  {t("installerProject.activeFilters")}:{" "}
                  <LtrText className="font-semibold">
                    {formatLocaleNumber(activeDoorFilterCount, locale)}
                  </LtrText>{" "}
                </div>{" "}
                <div>
                  {" "}
                  {t("installerProject.openIssues")}:{" "}
                  <LtrText className="font-semibold">
                    {formatLocaleNumber(details.issues_open.length, locale)}
                  </LtrText>{" "}
                </div>{" "}
              </div>{" "}
              <div className="flex flex-wrap gap-2">
                {" "}
                <a href="#project-doors" className={projectCompactActionClass}>
                  {" "}
                  {t("installerProject.doorsSection")}{" "}
                </a>{" "}
                <a
                  href="#project-open-issues"
                  className={projectCompactActionClass}
                >
                  {" "}
                  {t("installerProject.openIssues")}{" "}
                </a>{" "}
                <button
                  type="button"
                  onClick={resetDoorFilters}
                  disabled={activeDoorFilterCount === 0}
                  className={projectCompactActionClass}
                >
                  {" "}
                  {t("installerProject.resetAllDoorFilters")}{" "}
                </button>{" "}
              </div>{" "}
            </div>{" "}
            {(floorJumpTargets.length > 0 ||
              issueDoorJumpTargets.length > 0) && (
              <div className="mt-3 space-y-2 border-t border-border-subtle pt-3">
                {" "}
                {floorJumpTargets.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {" "}
                    <span className="text-text-secondary">
                      {t("installerProject.jumpToFloor")}:
                    </span>{" "}
                    {floorJumpTargets.map((target) => (
                      <a
                        key={target.href}
                        href={target.href}
                        className="inline-flex items-center rounded-lg border border-border bg-surface px-2.5 py-1.5 transition-colors hover:bg-surface-subtle"
                      >
                        {" "}
                        {target.floor} ({target.count}){" "}
                      </a>
                    ))}{" "}
                  </div>
                )}{" "}
                {issueDoorJumpTargets.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {" "}
                    <span className="text-text-secondary">
                      {t("installerProject.issueDoors")}:
                    </span>{" "}
                    {issueDoorJumpTargets.map((door) => (
                      <a
                        key={door.id}
                        href={`#door-${door.id}`}
                        className="inline-flex items-center rounded-lg border border-status-warning-border bg-status-warning-bg px-2.5 py-1.5 text-status-warning-fg transition-colors hover:bg-surface"
                      >
                        {" "}
                        {door.unit_label}{" "}
                      </a>
                    ))}{" "}
                  </div>
                )}{" "}
                {priorityDoors.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {" "}
                    <span className="text-text-secondary">
                      {t("installerProject.priorityDoors")}:
                    </span>{" "}
                    {priorityDoors.map((door) => (
                      <span
                        key={door.id}
                        className={projectPriorityChipClass(
                          door.tone as ProjectPriorityTone,
                        )}
                      >
                        {" "}
                        <a
                          href={door.href}
                          className="font-medium underline-offset-4 hover:underline"
                        >
                          {" "}
                          {door.unitLabel} - {door.label}{" "}
                        </a>{" "}
                        <button
                          type="button"
                          onClick={() => focusPriorityDoor(door)}
                          aria-label={`${shortOnlyThis} ${door.unitLabel}`}
                          className="rounded border border-current/20 bg-surface px-1.5 py-0.5 text-[11px] transition-colors hover:bg-surface-subtle"
                        >
                          {" "}
                          {shortOnlyThis}{" "}
                        </button>{" "}
                      </span>
                    ))}{" "}
                  </div>
                )}{" "}
              </div>
            )}{" "}
          </section>{" "}
          <section id="project-doors" className="space-y-3">
            {" "}
            <h2 className="text-lg font-semibold">
              {t("installerProject.doorsSection")}
            </h2>{" "}
            {doorsByFloor.length === 0 && (
              <div className={projectStateCardClass()}>
                {" "}
                {t("installerProject.noDoorsForFilters")}{" "}
              </div>
            )}{" "}
            {doorsByFloor.map(([floor, doors]) => (
              <div
                key={floor}
                id={`project-floor-${toAnchorId(floor)}`}
                className={projectPanelClass("space-y-3 p-4")}
              >
                {" "}
                <div className="text-sm font-semibold">
                  {" "}
                  {t("installerProject.floor")}: <LtrText>{floor}</LtrText>{" "}
                </div>{" "}
                <div className="space-y-2">
                  {" "}
                  {doors.map((door) => (
                    <div
                      key={door.id}
                      id={`door-${door.id}`}
                      className={projectDoorCardClass(
                        issueDoorIds.has(door.id),
                        door.is_locked,
                      )}
                    >
                      {" "}
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        {" "}
                        <div className="min-w-0">
                          {" "}
                          <div className="truncate font-medium">
                            {" "}
                            <LtrText>{door.unit_label}</LtrText>{" "}
                          </div>{" "}
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-secondary">
                            {" "}
                            <span>
                              {" "}
                              {t("installerProject.orderNumber")}{" "}
                              <LtrText>{door.order_number || "-"}</LtrText>{" "}
                            </span>{" "}
                            <span>
                              {" "}
                              {t("installerProject.apartment")}{" "}
                              <LtrText>
                                {door.apartment_number || "-"}
                              </LtrText>{" "}
                            </span>{" "}
                            <span>
                              {" "}
                              {t("installerProject.location")}{" "}
                              <LtrText>
                                {door.location_code || "-"}
                              </LtrText>{" "}
                            </span>{" "}
                          </div>{" "}
                        </div>{" "}
                        <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                          {" "}
                          <StatusBadge
                            status={door.status}
                            label={doorStatusLabel(door.status)}
                            domain="door"
                          />{" "}
                          {door.is_locked ? (
                            <StatusBadge
                              status="LOCKED"
                              label={t("installerProject.locked")}
                              domain="door"
                            />
                          ) : null}{" "}
                        </div>{" "}
                      </div>{" "}
                      <div className="mt-3 grid gap-2 md:grid-cols-[minmax(10rem,1fr)_minmax(10rem,1fr)_auto_auto]">
                        {" "}
                        <select
                          aria-label={`${copy("Reason", "Причина", "סיבה")} ${door.unit_label}`}
                          value={activeReasonId}
                          onChange={(event) =>
                            setSelectedReasonId(event.target.value)
                          }
                          className="control-input h-9 text-xs"
                        >
                          {" "}
                          {reasons.length === 0 && (
                            <option value="">
                              {pt("installerProject.noReasons")}
                            </option>
                          )}{" "}
                          {reasons.map((reason) => (
                            <option key={reason.id} value={reason.id}>
                              {" "}
                              {reason.code} - {reason.name}{" "}
                            </option>
                          ))}{" "}
                        </select>{" "}
                        <input
                          aria-label={`${t("installerProject.commentForNotInstalled")} ${door.unit_label}`}
                          autoComplete="off"
                          value={notInstalledComment}
                          onChange={(event) =>
                            setNotInstalledComment(event.target.value)
                          }
                          className="control-input h-9 text-xs"
                          placeholder={t(
                            "installerProject.commentForNotInstalled",
                          )}
                        />{" "}
                        <button
                          type="button"
                          disabled={pendingAction || door.is_locked}
                          onClick={() => installMutation.mutate(door.id)}
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-status-ok-border bg-status-ok-bg px-3 text-xs font-medium text-status-ok-fg transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {" "}
                          <CheckCircle2 aria-hidden="true" />{" "}
                          {t("installerProject.installed")}{" "}
                        </button>{" "}
                        <button
                          type="button"
                          disabled={
                            pendingAction || door.is_locked || !activeReasonId
                          }
                          onClick={() =>
                            notInstalledMutation.mutate({
                              doorId: door.id,
                              reasonId: activeReasonId,
                              comment: notInstalledComment.trim(),
                            })
                          }
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-status-problem-border bg-status-problem-bg px-3 text-xs font-medium text-status-problem-fg transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {" "}
                          <XCircle aria-hidden="true" />{" "}
                          {t("installerProject.notInstalled")}{" "}
                        </button>{" "}
                      </div>{" "}
                    </div>
                  ))}{" "}
                </div>{" "}
              </div>
            ))}{" "}
          </section>{" "}
          <section className="grid gap-4 lg:grid-cols-2">
            {" "}
            <div className={projectPanelClass("space-y-2 p-4")}>
              {" "}
              <h2 className="text-lg font-semibold">
                {t("installerProject.addonPlan")}
              </h2>{" "}
              {details.addons.plan.length === 0 && (
                <div className="text-sm text-text-secondary">
                  {t("installerProject.noAddonPlans")}
                </div>
              )}{" "}
              {details.addons.plan.map((item) => {
                const addonName =
                  addonTypes.find((addon) => addon.id === item.addon_type_id)
                    ?.name || item.addon_type_id;
                return (
                  <div
                    key={item.addon_type_id}
                    className="rounded-lg border border-border p-3"
                  >
                    {" "}
                    <div className="text-sm font-medium">{addonName}</div>{" "}
                    <div className="text-xs text-text-secondary">
                      {" "}
                      {t("installerProject.plannedQty")}:{" "}
                      {item.qty_planned}{" "}
                    </div>{" "}
                  </div>
                );
              })}{" "}
            </div>{" "}
            <div className={projectPanelClass("space-y-2 p-4")}>
              {" "}
              <h2 className="text-lg font-semibold">
                {t("installerProject.addonFacts")}
              </h2>{" "}
              {details.addons.facts.length === 0 && (
                <div className="text-sm text-text-secondary">
                  {t("installerProject.noAddonFacts")}
                </div>
              )}{" "}
              {details.addons.facts.map((fact) => {
                const addonName =
                  addonTypes.find((addon) => addon.id === fact.addon_type_id)
                    ?.name || fact.addon_type_id;
                return (
                  <div
                    key={fact.id}
                    className="rounded-lg border border-border p-3"
                  >
                    {" "}
                    <div className="text-sm font-medium">
                      {" "}
                      {addonName} | {t("installerProject.qty")}{" "}
                      <LtrText>
                        {formatLocaleNumber(fact.qty_done, locale)}
                      </LtrText>{" "}
                    </div>{" "}
                    <div className="text-xs text-text-secondary">
                      {" "}
                      <LtrText>
                        {formatLocaleDateTime(fact.done_at, locale)}
                      </LtrText>{" "}
                      | {t("installerProject.source")} {fact.source}{" "}
                    </div>{" "}
                    {fact.comment && (
                      <div className="mt-1 text-xs text-text-secondary">
                        {fact.comment}
                      </div>
                    )}{" "}
                  </div>
                );
              })}{" "}
            </div>{" "}
          </section>{" "}
        </>
      )}{" "}
    </div>
  );
}
