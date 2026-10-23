"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { readableApiError } from "@/lib/api-error-display";
import { priceErrorStatus } from "@/lib/factory-prices";
import { useI18n } from "@/lib/i18n";
import { STAGE_CODE, WORK_STAGES_API, stageDefinitionSchema, stagePlanPageSchema, stagePlansPath, type StageDefinition } from "@/lib/work-stages";
import { stageCopy } from "./stage-copy";

type DoorTypeItem = { id: string; code: string; name: string; is_active: boolean };

/** Stage catalog and versioned plans per door type. Planning only: no prices, no earnings. */
export function WorkStagesSection({ canPlan }: { canPlan: boolean }) {
  const { locale } = useI18n(), t = stageCopy[locale], client = useQueryClient();
  const [code, setCode] = useState(""), [name, setName] = useState(""), [order, setOrder] = useState("10");
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  const [doorTypeId, setDoorTypeId] = useState(""), [editing, setEditing] = useState(false);
  const [reason, setReason] = useState(""), [chosen, setChosen] = useState<Record<string, "required" | "optional" | "">>({});
  const definitions = useQuery({ queryKey: ["work-stages"], queryFn: async ({ signal }) => {
    const raw = await apiFetch<unknown>(WORK_STAGES_API, { signal });
    return Array.isArray(raw) ? raw.map((row) => stageDefinitionSchema.parse(row)) : [];
  } });
  const doorTypes = useQuery({ queryKey: ["work-stage-door-types"], queryFn: async ({ signal }) => {
    const response = await apiFetch<DoorTypeItem[] | { items?: DoorTypeItem[] }>("/api/v1/admin/door-types?limit=200", { signal });
    const rows = Array.isArray(response) ? response : response?.items ?? [];
    return Array.isArray(rows) ? rows : [];
  } });
  const plans = useQuery({ queryKey: ["stage-plans", doorTypeId], enabled: !!doorTypeId,
    queryFn: async ({ signal }) => stagePlanPageSchema.parse(await apiFetch<unknown>(stagePlansPath(doorTypeId), { signal })) });
  const disabled = definitions.isError && priceErrorStatus(definitions.error) === 409;
  const activeDefinitions = (definitions.data ?? []).filter((row) => row.is_active);
  const refresh = () => { void client.invalidateQueries({ queryKey: ["work-stages"] }); void client.invalidateQueries({ queryKey: ["stage-plans"] }); };

  async function run(action: () => Promise<unknown>) {
    setBusy(true); setError(null);
    try { await action(); refresh(); } catch (e) { setError(readableApiError(e, locale, t.error)); } finally { setBusy(false); }
  }
  const addStage = () => run(async () => {
    await apiFetch(WORK_STAGES_API, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim().toUpperCase(), name: name.trim(), sort_order: Number(order) || 0 }) });
    setCode(""); setName("");
  });
  const toggle = (row: StageDefinition) => run(() => apiFetch(WORK_STAGES_API + "/" + row.code, { method: "PATCH",
    headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_active: !row.is_active }) }));
  const planItems = activeDefinitions.filter((row) => chosen[row.code]).map((row) => ({ stage_code: row.code, required: chosen[row.code] === "required" }));
  const planValid = reason.trim().length > 0 && planItems.length > 0 && planItems.some((item) => item.required);
  const savePlan = () => run(async () => {
    await apiFetch(stagePlansPath(doorTypeId), { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expected_latest_version: plans.data?.latest_version ?? 0, reason: reason.trim(), items: planItems }) });
    setEditing(false); setReason(""); setChosen({});
  });
  if (disabled) return <p role="status" className="text-sm text-text-secondary">{t.disabled}</p>;
  return <div data-testid="work-stages-section" className="space-y-6 text-13">
    <section aria-label={t.catalog} className="space-y-3 rounded-lg border border-border bg-surface p-4">
      <h2 className="text-base font-semibold">{t.catalog}</h2>
      <p className="text-sm text-text-secondary">{t.catalogHint}</p>
      {definitions.isPending && <p role="status">{t.load}</p>}
      {definitions.isError && !disabled && <p role="alert" className="text-status-problem-fg">{t.error}</p>}
      {definitions.data && (definitions.data.length ? <ul className="divide-y divide-border border-y border-border">
        {definitions.data.map((row) => <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
          <span><span className="font-mono text-xs"><bdi>{row.code}</bdi></span> · {row.name} <span className="text-xs text-text-secondary">· {t.order} {row.sort_order} · {row.is_active ? t.active : t.inactive}</span></span>
          {canPlan && <Button size="sm" variant="outline" disabled={busy} onClick={() => void toggle(row)}>{row.is_active ? t.deactivate : t.activate}</Button>}
        </li>)}</ul> : <p className="text-sm text-text-secondary">{t.empty}</p>)}
      {canPlan && <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs">{t.code}<input value={code} onChange={(e) => setCode(e.target.value)} maxLength={40} aria-label={t.code}
          className="mt-1 block w-32 rounded-md border border-border bg-surface px-2 py-1.5 font-mono uppercase" /></label>
        <label className="text-xs">{t.name}<input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} aria-label={t.name}
          className="mt-1 block w-48 rounded-md border border-border bg-surface px-2 py-1.5" /></label>
        <label className="text-xs">{t.order}<input value={order} onChange={(e) => setOrder(e.target.value)} inputMode="numeric" aria-label={t.order}
          className="mt-1 block w-16 rounded-md border border-border bg-surface px-2 py-1.5" /></label>
        <Button size="sm" disabled={busy || !STAGE_CODE.test(code.trim()) || !name.trim()} onClick={() => void addStage()}><Plus className="me-1 size-4" />{t.add}</Button>
        <span className="text-xs text-text-secondary">{t.codeHint}</span>
      </div>}
      {error && <p role="alert" className="text-xs text-status-problem-fg">{error}</p>}
    </section>
    <section aria-label={t.plans} className="space-y-3 rounded-lg border border-border bg-surface p-4">
      <h2 className="text-base font-semibold">{t.plans}</h2>
      <label className="block text-xs">{t.doorType}
        <select aria-label={t.doorType} value={doorTypeId} onChange={(e) => { setDoorTypeId(e.target.value); setEditing(false); }}
          className="mt-1 block max-w-md rounded-md border border-border bg-surface px-2 py-1.5">
          <option value="">{t.choose}</option>
          {(doorTypes.data ?? []).filter((row) => row.is_active).map((row) => <option key={row.id} value={row.id}>{row.name} ({row.code})</option>)}
        </select></label>
      {doorTypeId && plans.isPending && <p role="status">{t.load}</p>}
      {doorTypeId && plans.isError && <p role="alert" className="text-status-problem-fg">{t.error}</p>}
      {plans.data && <>
        {!plans.data.items.length && <p className="text-sm text-text-secondary">{t.noPlans}</p>}
        <ul className="space-y-2">{plans.data.items.map((plan) => <li key={plan.id} className="rounded-md border border-border p-2">
          <p className="font-medium">{t.version} {plan.version} <span className="text-xs text-text-secondary">· {plan.reason}</span></p>
          <ol className="mt-1 list-decimal ps-5 text-xs">{plan.items.map((item) => <li key={item.stage_code}><bdi>{item.stage_code}</bdi> · {item.required ? t.required : t.optional}</li>)}</ol>
        </li>)}</ul>
        {canPlan && !editing && <Button size="sm" variant="outline" onClick={() => setEditing(true)} disabled={!activeDefinitions.length}>{t.newPlan}</Button>}
        {canPlan && editing && <div className="space-y-2 rounded-md border border-dashed border-border p-3">
          <p className="text-xs text-text-secondary">{t.planHint}</p>
          <ul className="space-y-1">{activeDefinitions.map((row) => <li key={row.id} className="flex flex-wrap items-center gap-2">
            <span className="w-40"><bdi>{row.code}</bdi> · {row.name}</span>
            <select aria-label={row.code} value={chosen[row.code] ?? ""} onChange={(e) => setChosen((prev) => ({ ...prev, [row.code]: e.target.value as "required" | "optional" | "" }))}
              className="rounded-md border border-border bg-surface px-2 py-1 text-xs">
              <option value="">—</option><option value="required">{t.required}</option><option value="optional">{t.optional}</option>
            </select></li>)}</ul>
          <label className="block text-xs">{t.reason}<input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} aria-label={t.reason}
            className="mt-1 block w-full max-w-md rounded-md border border-border bg-surface px-2 py-1.5" /></label>
          {!planItems.some((item) => item.required) && planItems.length > 0 && <p className="text-xs text-status-problem-fg">{t.needRequired}</p>}
          <div className="flex gap-2"><Button size="sm" disabled={busy || !planValid} onClick={() => void savePlan()}>{t.save}</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>{t.cancel}</Button></div>
        </div>}
      </>}
    </section>
  </div>;
}
