"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Wrench } from "lucide-react";

import { apiFetch } from "@/lib/api";

type InstallerDoor = {
  id: string;
  unit_label: string;
  door_type_id: string;
  our_price: string;
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
};

type InstallerIssue = {
  id: string;
  door_id: string;
  status: string;
  title: string | null;
  details: string | null;
};

type Reason = {
  id: string;
  code: string;
  name: string;
};

type AddonType = {
  id: string;
  name: string;
  unit: string;
};

type AddonPlan = {
  addon_type_id: string;
  qty_planned: string;
  client_price: string;
  installer_price: string;
};

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
  waze_url: string | null;
  status: string;
  doors: InstallerDoor[];
  issues_open: InstallerIssue[];
  reasons_catalog: Reason[];
  addons: {
    types: AddonType[];
    plan: AddonPlan[];
    facts: AddonFact[];
  };
  server_time: string;
};

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toAnchorId(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
}

type InstallerProjectPageProps = {
  projectId: string;
};

type DoorQuickFilter = "ALL" | "NOT_INSTALLED" | "INSTALLED" | "LOCKED" | "WITH_ISSUES";

function parseDoorQuickFilter(value: string | null): DoorQuickFilter | null {
  if (
    value === "ALL"
    || value === "NOT_INSTALLED"
    || value === "INSTALLED"
    || value === "LOCKED"
    || value === "WITH_ISSUES"
  ) {
    return value;
  }
  return null;
}

export default function InstallerProjectPage({ projectId }: InstallerProjectPageProps) {
  const queryClient = useQueryClient();
  const [selectedReasonId, setSelectedReasonId] = useState("");
  const [notInstalledComment, setNotInstalledComment] = useState("");
  const [selectedAddonTypeId, setSelectedAddonTypeId] = useState("");
  const [addonQtyDone, setAddonQtyDone] = useState("1");
  const [addonComment, setAddonComment] = useState("");
  const [orderFilter, setOrderFilter] = useState("ALL");
  const [locationFilter, setLocationFilter] = useState("ALL");
  const [doorSearch, setDoorSearch] = useState("");
  const [doorQuickFilter, setDoorQuickFilter] = useState<DoorQuickFilter>("ALL");
  const [issueSearch, setIssueSearch] = useState("");
  const [issueStatusFilter, setIssueStatusFilter] = useState("ALL");
  const [actionError, setActionError] = useState<string | null>(null);

  const detailsQuery = useQuery({
    queryKey: ["installer-project-details", projectId],
    queryFn: () =>
      apiFetch<InstallerProjectDetailsResponse>(`/api/v1/installer/projects/${projectId}`),
    staleTime: 15_000,
  });

  const details = detailsQuery.data;
  const reasons = details?.reasons_catalog || [];
  const addonTypes = details?.addons.types || [];

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
    [details?.issues_open]
  );
  const issueDoorMap = useMemo(
    () => new Map((details?.doors || []).map((door) => [door.id, door])),
    [details?.doors]
  );
  const issueStatusOptions = useMemo(
    () => Array.from(new Set((details?.issues_open || []).map((issue) => issue.status))).sort(),
    [details?.issues_open]
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
      NOT_INSTALLED: doors.filter((door) => door.status === "NOT_INSTALLED").length,
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
        (doorQuickFilter === "NOT_INSTALLED" && door.status === "NOT_INSTALLED") ||
        (doorQuickFilter === "INSTALLED" && door.status === "INSTALLED") ||
        (doorQuickFilter === "LOCKED" && door.is_locked) ||
        (doorQuickFilter === "WITH_ISSUES" && issueDoorIds.has(door.id));
      return matchesOrder && matchesLocation && matchesSearch && matchesQuickFilter;
    });
  }, [details?.doors, doorQuickFilter, doorSearch, issueDoorIds, locationFilter, orderFilter]);
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
        const leftDoor = issueDoorMap.get(left.door_id)?.unit_label || left.door_id;
        const rightDoor = issueDoorMap.get(right.door_id)?.unit_label || right.door_id;
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
    [doorsByFloor]
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
      .filter((door) => issueDoorIds.has(door.id) || door.status === "NOT_INSTALLED")
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
      apiFetch<{ ok: boolean }>(`/api/v1/installer/doors/${doorId}/install`, {
        method: "POST",
      }),
    onSuccess: async () => {
      setActionError(null);
      await queryClient.invalidateQueries({
        queryKey: ["installer-project-details", projectId],
      });
    },
    onError: (error) => {
      setActionError(error instanceof Error ? error.message : "Install action failed.");
    },
  });

  const notInstalledMutation = useMutation({
    mutationFn: (payload: { doorId: string; reasonId: string; comment: string }) =>
      apiFetch<{ ok: boolean }>(`/api/v1/installer/doors/${payload.doorId}/not-installed`, {
        method: "POST",
        body: JSON.stringify({
          reason_id: payload.reasonId,
          comment: payload.comment || null,
        }),
      }),
    onSuccess: async () => {
      setActionError(null);
      await queryClient.invalidateQueries({
        queryKey: ["installer-project-details", projectId],
      });
    },
    onError: (error) => {
      setActionError(
        error instanceof Error ? error.message : "Not-installed action failed."
      );
    },
  });

  const addonMutation = useMutation({
    mutationFn: (payload: { addonTypeId: string; qtyDone: string; comment: string }) =>
      apiFetch<{ ok: boolean }>(`/api/v1/installer/addons/projects/${projectId}/facts`, {
        method: "POST",
        body: JSON.stringify({
          addon_type_id: payload.addonTypeId,
          qty_done: payload.qtyDone,
          comment: payload.comment || null,
        }),
      }),
    onSuccess: async () => {
      setActionError(null);
      setAddonQtyDone("1");
      setAddonComment("");
      await queryClient.invalidateQueries({
        queryKey: ["installer-project-details", projectId],
      });
    },
    onError: (error) => {
      setActionError(error instanceof Error ? error.message : "Add-on fact action failed.");
    },
  });

  const pendingAction =
    installMutation.isPending || notInstalledMutation.isPending || addonMutation.isPending;

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

  function focusPriorityDoor(door: {
    href: string;
    quickSearchValue: string;
  }) {
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
    const nextUrl =
      `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`;

    window.history.replaceState({}, "", nextUrl);
  }, [doorQuickFilter, issueSearch, issueStatusFilter]);

  return (
    <div className="space-y-6">
      <section className="page-hero relative overflow-hidden">
        <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_top_right,hsl(var(--accent)/0.18),transparent_62%)] lg:block" />
        <div className="relative z-10 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <Link
              href="/installer"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to workspace
            </Link>
            <div className="page-eyebrow mt-4">Field execution cockpit</div>
            <h1 className="mt-3 font-display text-3xl tracking-[-0.04em] text-foreground sm:text-4xl">
              {details?.name || "Project details"}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[15px]">
              {details?.address || "No address"} | Status: {details?.status || "--"}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="metric-chip">Doors {details?.doors.length ?? "--"}</span>
              <span className="metric-chip">Visible {details ? filteredDoors.length : "--"}</span>
              <span className="metric-chip">
                Issues {details?.issues_open.length ?? "--"}
              </span>
              <span className="metric-chip">
                Updated {details?.server_time ? formatDate(details.server_time) : "--"}
              </span>
            </div>
          </div>
          <div className="surface-subtle min-w-[280px] max-w-xl space-y-4 p-4 sm:p-5">
            <div className="text-[12px] leading-5 text-muted-foreground">
              Move between the live schedule, issue triage and add-on facts without losing the
              working door context.
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                href={`/installer/calendar?project_id=${projectId}`}
                className="btn-premium justify-center rounded-xl px-4 py-3 text-sm font-medium"
              >
                Open schedule
              </Link>
              {details?.waze_url ? (
                <a
                  href={details.waze_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-xl border border-border/70 bg-background/75 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  Open Waze
                </a>
              ) : (
                <div className="rounded-xl border border-dashed border-border/70 bg-background/40 px-4 py-3 text-sm text-muted-foreground">
                  Waze route not configured
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {detailsQuery.isError && (
        <div className="rounded-lg border border-[hsl(var(--destructive)/0.35)] bg-[hsl(var(--destructive)/0.08)] px-4 py-3 text-sm text-[hsl(var(--destructive))]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>Failed to load project details.</span>
            <button
              type="button"
              onClick={() => {
                void detailsQuery.refetch();
              }}
              className="inline-flex items-center rounded-lg border border-[hsl(var(--destructive)/0.35)] bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {actionError && (
        <div className="rounded-lg border border-[hsl(var(--destructive)/0.35)] bg-[hsl(var(--destructive)/0.08)] px-4 py-3 text-sm text-[hsl(var(--destructive))]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>{actionError}</span>
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="inline-flex items-center rounded-lg border border-[hsl(var(--destructive)/0.35)] bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {detailsQuery.isLoading && (
        <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          Loading project...
        </div>
      )}

      {details && (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            <div className="surface-panel">
              <div className="text-sm text-muted-foreground">Doors total</div>
              <div className="mt-1 text-2xl font-semibold">{details.doors.length}</div>
            </div>
            <div className="surface-panel">
              <div className="text-sm text-muted-foreground">Visible by filters</div>
              <div className="mt-1 text-2xl font-semibold">{filteredDoors.length}</div>
            </div>
            <div className="surface-panel">
              <div className="text-sm text-muted-foreground">Open issues</div>
              <div className="mt-1 text-2xl font-semibold">{details.issues_open.length}</div>
            </div>
            <div className="surface-panel">
              <div className="text-sm text-muted-foreground">Last update</div>
              <div className="mt-1 text-sm font-medium">{formatDate(details.server_time)}</div>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="surface-panel space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">Door filters</h2>
                <button
                  type="button"
                  onClick={resetDoorFilters}
                  disabled={
                    orderFilter === "ALL" &&
                    locationFilter === "ALL" &&
                    doorSearch.trim().length === 0 &&
                    doorQuickFilter === "ALL"
                  }
                  className="inline-flex items-center rounded-lg border border-border bg-background px-3 py-1.5 text-xs transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Reset door filters
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["ALL", "All"],
                    ["NOT_INSTALLED", "Not installed"],
                    ["INSTALLED", "Installed"],
                    ["WITH_ISSUES", "With issues"],
                    ["LOCKED", "Locked"],
                  ] as Array<[DoorQuickFilter, string]>
                ).map(([value, label]) => {
                  const active = doorQuickFilter === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setDoorQuickFilter(value)}
                      className={
                        active
                          ? "rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground"
                          : "rounded-lg border border-border bg-background px-3 py-1.5 text-xs transition-colors hover:bg-muted"
                      }
                    >
                      {label} ({quickFilterCounts[value]})
                    </button>
                  );
                })}
              </div>
              <label className="block">
                <span className="text-xs text-muted-foreground">Quick search</span>
                <input
                  value={doorSearch}
                  onChange={(event) => setDoorSearch(event.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                  placeholder="Unit, order, apartment, location, marking"
                />
              </label>
              <label className="block">
                <span className="text-xs text-muted-foreground">Order number</span>
                <select
                  value={orderFilter}
                  onChange={(event) => setOrderFilter(event.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                >
                  <option value="ALL">All orders</option>
                  {orderOptions.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs text-muted-foreground">Location code</span>
                <select
                  value={locationFilter}
                  onChange={(event) => setLocationFilter(event.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                >
                  <option value="ALL">All locations</option>
                  {locationOptions.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div id="project-add-on-fact" className="surface-panel space-y-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Wrench className="h-5 w-5" />
                Add-on fact
              </h2>
              <label className="block">
                <span className="text-xs text-muted-foreground">Add-on type</span>
                <select
                  value={activeAddonTypeId}
                  onChange={(event) => setSelectedAddonTypeId(event.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                >
                  {addonTypes.length === 0 && <option value="">No add-on types</option>}
                  {addonTypes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs text-muted-foreground">Qty done</span>
                <input
                  value={addonQtyDone}
                  onChange={(event) => setAddonQtyDone(event.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                  placeholder="1"
                />
              </label>
              <label className="block">
                <span className="text-xs text-muted-foreground">Comment</span>
                <textarea
                  value={addonComment}
                  onChange={(event) => setAddonComment(event.target.value)}
                  className="mt-1 min-h-20 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  placeholder="Optional comment"
                />
              </label>
              <button
                type="button"
                disabled={pendingAction || !activeAddonTypeId || !addonQtyDone.trim()}
                onClick={() => {
                  addonMutation.mutate({
                    addonTypeId: activeAddonTypeId,
                    qtyDone: addonQtyDone.trim(),
                    comment: addonComment.trim(),
                  });
                }}
                className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                Queue add-on fact
              </button>
            </div>
          </section>

          <section id="project-open-issues" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Open issues</h2>
                <div className="text-sm text-muted-foreground">
                  Visible issues {filteredIssues.length} / {details.issues_open.length}
                  {activeIssueFilterCount > 0 ? ` | Active filters ${activeIssueFilterCount}` : ""}
                </div>
                {issueStatusCounts.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {issueStatusCounts.map(([status, count]) => {
                      const active = issueStatusFilter === status;
                      return (
                        <button
                          key={status}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setIssueStatusFilter(active ? "ALL" : status)}
                          className={
                            active
                              ? "rounded-lg bg-accent px-2.5 py-1 text-accent-foreground"
                              : "rounded-lg border border-border bg-background px-2.5 py-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          }
                        >
                          {status} ({count})
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              {details.issues_open.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={focusIssueDoorsList}
                    className="inline-flex items-center rounded-lg border border-border bg-card px-3 py-2 text-sm transition-colors hover:bg-muted"
                  >
                    Show issue doors
                  </button>
                  <input
                    value={issueSearch}
                    onChange={(event) => setIssueSearch(event.target.value)}
                    placeholder="Issue, details, door"
                    className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
                  />
                  <select
                    aria-label="Issue status filter"
                    value={issueStatusFilter}
                    onChange={(event) => setIssueStatusFilter(event.target.value)}
                    className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
                  >
                    <option value="ALL">All statuses</option>
                    {issueStatusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={resetIssueFilters}
                    disabled={activeIssueFilterCount === 0}
                    className="inline-flex items-center rounded-lg border border-border bg-card px-3 py-2 text-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Reset issue filters
                  </button>
                </div>
              )}
            </div>
            {details.issues_open.length === 0 && (
              <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
                No open issues.
              </div>
            )}
            {details.issues_open.length > 0 && filteredIssues.length === 0 && (
              <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
                No issues match current filters.
              </div>
            )}
            {filteredIssues.map((issue) => {
              const relatedDoor = issueDoorMap.get(issue.door_id);
              return (
              <div
                key={issue.id}
                className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium text-amber-300">
                      {issue.title || "Issue"}
                    </div>
                    <div className="mt-1 text-xs text-amber-100/80">
                      Door {relatedDoor?.unit_label || issue.door_id}
                    </div>
                  </div>
                  <span className="rounded-md border border-amber-400/40 px-2 py-1 text-xs text-amber-200">
                    {issue.status}
                  </span>
                </div>
                <div className="mt-2 text-sm text-amber-100/80">
                  {issue.details || "No details"}
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-xs">
                  {relatedDoor ? (
                    <>
                      <button
                        type="button"
                        onClick={() => focusIssueDoor(relatedDoor)}
                        className="font-medium text-amber-200 underline-offset-2 hover:underline"
                      >
                        Only this door {relatedDoor.unit_label}
                      </button>
                      <a
                        href={`#door-${relatedDoor.id}`}
                        className="font-medium text-amber-200 underline-offset-2 hover:underline"
                      >
                        Open door {relatedDoor.unit_label}
                      </a>
                    </>
                  ) : (
                    <span className="text-amber-100/70">Related door missing</span>
                  )}
                </div>
              </div>
            )})}
          </section>

          <section
            className="surface-panel sticky top-4 z-10 border border-border/80 bg-background/90 p-4 shadow-[0_22px_50px_-34px_hsl(var(--foreground)/0.45)] backdrop-blur"
            aria-label="Door summary bar"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div>
                  Visible doors: <span className="font-semibold">{filteredDoors.length}</span> /{" "}
                  <span className="font-semibold">{details.doors.length}</span>
                </div>
                <div>
                  Active filters: <span className="font-semibold">{activeDoorFilterCount}</span>
                </div>
                <div>
                  Open issues: <span className="font-semibold">{details.issues_open.length}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href="#project-doors"
                  className="inline-flex items-center rounded-lg border border-border bg-card px-3 py-1.5 text-xs transition-colors hover:bg-muted"
                >
                  Doors
                </a>
                <a
                  href="#project-open-issues"
                  className="inline-flex items-center rounded-lg border border-border bg-card px-3 py-1.5 text-xs transition-colors hover:bg-muted"
                >
                  Issues
                </a>
                <a
                  href="#project-add-on-fact"
                  className="inline-flex items-center rounded-lg border border-border bg-card px-3 py-1.5 text-xs transition-colors hover:bg-muted"
                >
                  Add-on fact
                </a>
                <button
                  type="button"
                  onClick={resetDoorFilters}
                  disabled={activeDoorFilterCount === 0}
                  className="inline-flex items-center rounded-lg border border-border bg-card px-3 py-1.5 text-xs transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Reset all door filters
                </button>
              </div>
            </div>
            {(floorJumpTargets.length > 0 || issueDoorJumpTargets.length > 0) && (
              <div className="mt-3 space-y-2 border-t border-border/70 pt-3">
                {floorJumpTargets.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Jump to floor:</span>
                    {floorJumpTargets.map((target) => (
                      <a
                        key={target.href}
                        href={target.href}
                        className="inline-flex items-center rounded-lg border border-border bg-card px-2.5 py-1.5 transition-colors hover:bg-muted"
                      >
                        {target.floor} ({target.count})
                      </a>
                    ))}
                  </div>
                )}
                {issueDoorJumpTargets.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Issue doors:</span>
                    {issueDoorJumpTargets.map((door) => (
                      <a
                        key={door.id}
                        href={`#door-${door.id}`}
                        className="inline-flex items-center rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-amber-900 transition-colors hover:bg-amber-500/20"
                      >
                        {door.unit_label}
                      </a>
                    ))}
                  </div>
                )}
                {priorityDoors.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Priority doors:</span>
                    {priorityDoors.map((door) => (
                      <span
                        key={door.id}
                        className={
                          door.tone === "issue"
                            ? "inline-flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-amber-900"
                            : door.tone === "locked"
                              ? "inline-flex items-center gap-1 rounded-lg border border-border bg-muted px-2 py-1.5"
                              : "inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1.5 text-emerald-900"
                        }
                      >
                        <a href={door.href} className="font-medium underline-offset-4 hover:underline">
                          {door.unitLabel} - {door.label}
                        </a>
                        <button
                          type="button"
                          onClick={() => focusPriorityDoor(door)}
                          aria-label={`Only this ${door.unitLabel}`}
                          className="rounded border border-current/20 bg-background/70 px-1.5 py-0.5 text-[11px] transition-colors hover:bg-background"
                        >
                          Only this
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          <section id="project-doors" className="space-y-3">
            <h2 className="text-lg font-semibold">Doors</h2>
            {doorsByFloor.length === 0 && (
              <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
                No doors for selected filters.
              </div>
            )}
            {doorsByFloor.map(([floor, doors]) => (
              <div
                key={floor}
                id={`project-floor-${toAnchorId(floor)}`}
                className="space-y-3 rounded-xl border border-border bg-card p-4"
              >
                <div className="text-sm font-semibold">Floor: {floor}</div>
                <div className="space-y-2">
                  {doors.map((door) => (
                    <div
                      key={door.id}
                      id={`door-${door.id}`}
                      className="rounded-lg border border-border bg-background p-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="font-medium">{door.unit_label}</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            Order {door.order_number || "-"} | Apartment{" "}
                            {door.apartment_number || "-"} | Location{" "}
                            {door.location_code || "-"}
                          </div>
                        </div>
                        <span className="rounded-md border border-border px-2 py-1 text-xs">
                          {door.status}
                        </span>
                      </div>

                      <div className="mt-3 grid gap-2 md:grid-cols-[1fr_1fr_auto_auto]">
                        <select
                          value={activeReasonId}
                          onChange={(event) => setSelectedReasonId(event.target.value)}
                          className="h-9 rounded-lg border border-border bg-background px-2 text-xs"
                        >
                          {reasons.length === 0 && <option value="">No reasons</option>}
                          {reasons.map((reason) => (
                            <option key={reason.id} value={reason.id}>
                              {reason.code} - {reason.name}
                            </option>
                          ))}
                        </select>
                        <input
                          value={notInstalledComment}
                          onChange={(event) => setNotInstalledComment(event.target.value)}
                          className="h-9 rounded-lg border border-border bg-background px-2 text-xs"
                          placeholder="Comment for NOT_INSTALLED"
                        />
                        <button
                          type="button"
                          disabled={pendingAction || door.is_locked}
                          onClick={() => installMutation.mutate(door.id)}
                          className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Installed
                        </button>
                        <button
                          type="button"
                          disabled={pendingAction || door.is_locked || !activeReasonId}
                          onClick={() =>
                            notInstalledMutation.mutate({
                              doorId: door.id,
                              reasonId: activeReasonId,
                              comment: notInstalledComment.trim(),
                            })
                          }
                          className="rounded-lg border border-border bg-muted px-3 py-2 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Not installed
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2 rounded-xl border border-border bg-card p-4">
              <h2 className="text-lg font-semibold">Add-on plan</h2>
              {details.addons.plan.length === 0 && (
                <div className="text-sm text-muted-foreground">No add-on plans.</div>
              )}
              {details.addons.plan.map((item) => {
                const addonName =
                  addonTypes.find((addon) => addon.id === item.addon_type_id)?.name ||
                  item.addon_type_id;
                return (
                  <div key={item.addon_type_id} className="rounded-lg border border-border p-3">
                    <div className="text-sm font-medium">{addonName}</div>
                    <div className="text-xs text-muted-foreground">
                      Planned qty: {item.qty_planned} | Installer price: {item.installer_price}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-2 rounded-xl border border-border bg-card p-4">
              <h2 className="text-lg font-semibold">Add-on facts</h2>
              {details.addons.facts.length === 0 && (
                <div className="text-sm text-muted-foreground">No submitted add-on facts.</div>
              )}
              {details.addons.facts.map((fact) => {
                const addonName =
                  addonTypes.find((addon) => addon.id === fact.addon_type_id)?.name ||
                  fact.addon_type_id;
                return (
                  <div key={fact.id} className="rounded-lg border border-border p-3">
                    <div className="text-sm font-medium">
                      {addonName} | Qty {fact.qty_done}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(fact.done_at)} | Source {fact.source}
                    </div>
                    {fact.comment && (
                      <div className="mt-1 text-xs text-muted-foreground">{fact.comment}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
