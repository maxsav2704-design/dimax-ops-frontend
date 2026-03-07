"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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

type InstallerProjectPageProps = {
  projectId: string;
};

export default function InstallerProjectPage({ projectId }: InstallerProjectPageProps) {
  const queryClient = useQueryClient();
  const [selectedReasonId, setSelectedReasonId] = useState("");
  const [notInstalledComment, setNotInstalledComment] = useState("");
  const [selectedAddonTypeId, setSelectedAddonTypeId] = useState("");
  const [addonQtyDone, setAddonQtyDone] = useState("1");
  const [addonComment, setAddonComment] = useState("");
  const [orderFilter, setOrderFilter] = useState("ALL");
  const [locationFilter, setLocationFilter] = useState("ALL");
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

  const filteredDoors = useMemo(() => {
    const rows = details?.doors || [];
    return rows.filter((door) => {
      const matchesOrder =
        orderFilter === "ALL" || door.order_number === orderFilter;
      const matchesLocation =
        locationFilter === "ALL" || door.location_code === locationFilter;
      return matchesOrder && matchesLocation;
    });
  }, [details?.doors, locationFilter, orderFilter]);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/installer"
            className="mb-2 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to workspace
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">
            {details?.name || "Project details"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {details?.address || "No address"} | Status: {details?.status || "--"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/installer/calendar?project_id=${projectId}`}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm transition-colors hover:bg-muted"
          >
            Open schedule
          </Link>
          {details?.waze_url ? (
            <a
              href={details.waze_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm transition-colors hover:bg-muted"
            >
              Open Waze
            </a>
          ) : null}
        </div>
      </div>

      {(detailsQuery.isError || actionError) && (
        <div className="rounded-lg border border-[hsl(var(--destructive)/0.35)] bg-[hsl(var(--destructive)/0.08)] px-4 py-3 text-sm text-[hsl(var(--destructive))]">
          {actionError || "Failed to load project details."}
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
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="text-sm text-muted-foreground">Doors total</div>
              <div className="mt-1 text-2xl font-semibold">{details.doors.length}</div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="text-sm text-muted-foreground">Visible by filters</div>
              <div className="mt-1 text-2xl font-semibold">{filteredDoors.length}</div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="text-sm text-muted-foreground">Open issues</div>
              <div className="mt-1 text-2xl font-semibold">{details.issues_open.length}</div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="text-sm text-muted-foreground">Last update</div>
              <div className="mt-1 text-sm font-medium">{formatDate(details.server_time)}</div>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3 rounded-xl border border-border bg-card p-4">
              <h2 className="text-lg font-semibold">Door filters</h2>
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

            <div className="space-y-3 rounded-xl border border-border bg-card p-4">
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

          {details.issues_open.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Open issues</h2>
              {details.issues_open.map((issue) => (
                <div
                  key={issue.id}
                  className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4"
                >
                  <div className="text-sm font-medium text-amber-300">
                    {issue.title || "Issue"}
                  </div>
                  <div className="mt-1 text-sm text-amber-100/80">
                    {issue.details || "No details"}
                  </div>
                </div>
              ))}
            </section>
          )}

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Doors</h2>
            {doorsByFloor.length === 0 && (
              <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
                No doors for selected filters.
              </div>
            )}
            {doorsByFloor.map(([floor, doors]) => (
              <div key={floor} className="space-y-3 rounded-xl border border-border bg-card p-4">
                <div className="text-sm font-semibold">Floor: {floor}</div>
                <div className="space-y-2">
                  {doors.map((door) => (
                    <div
                      key={door.id}
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
