"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Layers } from "lucide-react";
import { WidgetCard } from "@/components/dimax";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { readableApiError } from "@/lib/api-error-display";
import { priceErrorStatus } from "@/lib/factory-prices";
import { useI18n } from "@/lib/i18n";
import { formatLocaleDateTime } from "@/lib/formatting";
import { doorStagesPath, doorWorkPlanPath, doorStagesSchema, stageCompletionSchema, stagePlanPageSchema, stagePlansPath } from "@/lib/work-stages";
import { stageCopy } from "@/components/doors/stage-copy";

type Installer = { id: string; full_name: string; is_active: boolean };

/** Stages of the focused door: plan, who installs which stage, what is done. The office never enters a price here. */
export function DoorStagesCard({ doorId, doorTypeId, canPlan, installers, onDoorChanged }: {
  doorId: string; doorTypeId: string; canPlan: boolean; installers: Installer[]; onDoorChanged?: () => void;
}) {
  const { locale } = useI18n(), t = stageCopy[locale], client = useQueryClient();
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  const [planId, setPlanId] = useState(""), [picked, setPicked] = useState<Record<string, string>>({});
  const stages = useQuery({ queryKey: ["door-stages", doorId],
    queryFn: async ({ signal }) => { const raw = await apiFetch<unknown>(doorStagesPath(doorId), { signal }); return raw === null ? null : doorStagesSchema.parse(raw); } });
  const plans = useQuery({ queryKey: ["stage-plans", doorTypeId], enabled: stages.data === null && canPlan,
    queryFn: async ({ signal }) => stagePlanPageSchema.parse(await apiFetch<unknown>(stagePlansPath(doorTypeId), { signal })) });
  if (stages.isError && priceErrorStatus(stages.error) === 409) return null; // stage not switched on: nothing to show
  const refresh = () => { void client.invalidateQueries({ queryKey: ["door-stages", doorId] }); onDoorChanged?.(); };
  async function run(action: () => Promise<unknown>) {
    setBusy(true); setError(null);
    try { await action(); refresh(); } catch (e) { setError(readableApiError(e, locale, t.error)); } finally { setBusy(false); }
  }
  const post = (path: string, body: object) => apiFetch<unknown>(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = stages.data;
  const activeInstallers = installers.filter((row) => row.is_active);
  const nameOf = (id: string | null) => installers.find((row) => row.id === id)?.full_name ?? (id ? id.slice(0, 8) : t.unassigned);
  const hasFacts = !!data?.stages.some((s) => s.fact_id);
  return <WidgetCard data-testid="door-stages-card" title={t.card} titleAccessory={<Layers className="size-4 text-text-secondary" aria-hidden="true" />}
    headerMeta={data ? `${t.progress}: ${data.required_done}/${data.required_total} · ${t.plan} v${data.plan_version}` : undefined}>
    <div className="space-y-3 px-4 py-3 text-13">
      {stages.isPending && <p role="status" className="text-12 text-text-secondary">{t.load}</p>}
      {stages.isError && <p role="alert" className="text-12 text-danger">{t.error}</p>}
      {data === null && <>
        <p className="text-12 text-text-secondary">{t.noPlan}</p>
        {canPlan && plans.data && (plans.data.items.length ? <div className="flex flex-wrap items-center gap-2">
          <select aria-label={t.plan} value={planId} onChange={(e) => setPlanId(e.target.value)} className="h-8 rounded-md border border-border bg-surface px-2 text-12">
            <option value="">{t.choose}</option>
            {plans.data.items.map((plan) => <option key={plan.id} value={plan.id}>{t.version} {plan.version} · {plan.items.map((i) => i.stage_code).join(", ")}</option>)}
          </select>
          <Button size="sm" disabled={busy || !planId} onClick={() => void run(() => post(doorWorkPlanPath(doorId), { plan_id: planId }))}>{t.applyPlan}</Button>
        </div> : <p className="text-12 text-text-secondary">{t.noPlans}</p>)}
      </>}
      {data && <>
        {data.installed_by_stages && <p className="text-12 text-text-secondary">{t.locked}</p>}
        {hasFacts && !data.installed_by_stages && <p className="text-12 text-text-secondary">{t.cannotReplan}</p>}
        <ul className="divide-y divide-border-subtle">{data.stages.map((stage) => <li key={stage.stage_code} data-testid="door-stage-row" className="flex flex-wrap items-center gap-2 py-2">
          <span className="min-w-40"><span className="font-mono text-xs"><bdi>{stage.stage_code}</bdi></span> · {stage.name}
            <span className="block text-11 text-text-secondary">{stage.required ? t.required : t.optional}</span></span>
          {stage.fact_id ? <span className="inline-flex flex-wrap items-center gap-1 text-12"><CheckCircle2 className="size-4 text-status-ok-fg" aria-hidden="true" />{t.done} · {nameOf(stage.completed_by)} · {stage.completed_at ? formatLocaleDateTime(stage.completed_at, locale) : ""}
              {stage.earning_status && <span data-testid="stage-earning-status" className={stage.earning_status === "RECORDED" ? "block w-full text-11 text-text-secondary" : "block w-full text-11 text-status-warning-fg"}>{t[stage.earning_status]}</span>}</span>
            : <>
              <span className="text-12 text-text-secondary">{t.pending} · {t.installer}: {nameOf(stage.installer_id)}</span>
              {canPlan && !data.installed_by_stages && <>
                <select aria-label={`${t.installer} ${stage.stage_code}`} value={picked[stage.stage_code] ?? stage.installer_id ?? ""}
                  onChange={(e) => setPicked((prev) => ({ ...prev, [stage.stage_code]: e.target.value }))}
                  className="h-8 rounded-md border border-border bg-surface px-2 text-12">
                  <option value="">{t.choose}</option>
                  {activeInstallers.map((row) => <option key={row.id} value={row.id}>{row.full_name}</option>)}
                </select>
                <Button size="sm" variant="outline" disabled={busy || !(picked[stage.stage_code] ?? stage.installer_id) || (picked[stage.stage_code] ?? stage.installer_id) === stage.installer_id}
                  onClick={() => void run(() => post(doorStagesPath(doorId) + "/" + stage.stage_code + "/assign", { installer_id: picked[stage.stage_code] ?? stage.installer_id }))}>{t.installer}</Button>
                {stage.installer_id && <Button size="sm" disabled={busy} title={t.recordHint}
                  onClick={() => void run(() => apiFetch(doorStagesPath(doorId) + "/" + stage.stage_code + "/complete",
                    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ installer_id: stage.installer_id, request_id: crypto.randomUUID() }) })
                    .then((raw) => stageCompletionSchema.parse(raw)))}>{t.record}</Button>}
              </>}
            </>}
        </li>)}</ul>
        <p className="text-11 text-text-secondary">{t.earningHint} {t.history}</p>
      </>}
      {error && <p role="alert" className="text-12 text-danger">{error}</p>}
    </div>
  </WidgetCard>;
}
