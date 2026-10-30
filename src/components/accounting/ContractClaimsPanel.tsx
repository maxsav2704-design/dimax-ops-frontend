"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { formatLocaleMoney } from "@/lib/formatting";
import { periodPageSchema, periodsPath } from "@/lib/commercial-agreements";
import type { CommercialContract } from "@/lib/commercial-prices";
import { priceErrorStatus } from "@/lib/factory-prices";
import {
  claimDetailSchema, claimPageSchema, claimPeriodPath, claimPeriodViewSchema, claimsPath, type ClaimSummary,
} from "@/lib/factory-claims";
import { claimCopy } from "./claim-copy";
import { ClaimReconciliationPanel, ContractReconciliationSummary } from "./ClaimReconciliationPanel";
import { reconciliationCopy } from "./reconciliation-copy";
import { DraftDialog } from "./DraftDialog";
import { useCommercialWrite } from "./use-commercial-write";

type Action = { kind: "issue" | "cancel" | "correct"; claim: ClaimSummary };

/** Claims to the factory: a package per period from the accepted signed rows. OWNER only; VAT never computed. */
export function ContractClaimsPanel({ contract }: { contract: CommercialContract }) {
  const { locale } = useI18n(), t = claimCopy[locale], client = useQueryClient();
  const [period, setPeriod] = useState<string>("");
  const [action, setAction] = useState<Action | null>(null);
  const [reconcile, setReconcile] = useState<ClaimSummary | null>(null);
  const periods = useQuery({ queryKey: ["commercial-periods", contract.id],
    queryFn: ({ signal }) => apiFetch(periodsPath(contract.id), { signal }, { schema: periodPageSchema }) });
  const claims = useQuery({ queryKey: ["factory-claims", contract.id],
    queryFn: ({ signal }) => apiFetch(claimsPath(contract.id) + "?limit=50&offset=0", { signal }, { schema: claimPageSchema }) });
  const view = useQuery({ queryKey: ["factory-claim-period", contract.id, period], enabled: !!period,
    queryFn: ({ signal }) => apiFetch(claimPeriodPath(contract.id, period), { signal }, { schema: claimPeriodViewSchema }) });
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ["factory-claims", contract.id] });
    void client.invalidateQueries({ queryKey: ["factory-claim-period", contract.id] });
    setAction(null);
  };
  const compose = useCommercialWrite(claimsPath(contract.id), claimDetailSchema, refresh);
  const money = (value: string) => formatLocaleMoney(value, "ILS", locale, { minimumFractionDigits: 2 });
  if (claims.isError && priceErrorStatus(claims.error) === 409) {
    return <p role="status" className="py-4 text-sm text-text-secondary">{t.disabled}</p>;
  }
  return <section aria-label={t.tab} className="min-w-0 space-y-4">
    <div className="border-b border-border pb-3"><h2 className="text-base font-semibold">{t.title}</h2>
      <p className="mt-1 text-sm text-text-secondary">{t.intro}</p>
      <p className="text-xs text-text-secondary">{t.vatNote}</p></div>
    {(periods.isPending || claims.isPending) && <p role="status" className="text-sm">{t.load}</p>}
    {(periods.isError || claims.isError) && <p role="alert" className="text-sm text-status-problem-fg">{t.error}</p>}
    {periods.data && <label className="block max-w-xs space-y-1 text-sm">{t.period}
      <select aria-label={t.period} value={period} onChange={(e) => setPeriod(e.target.value)} className="h-9 w-full rounded-md border border-border bg-surface px-2 text-sm">
        <option value="">{t.choosePeriod}</option>
        {periods.data.items.map((row) => <option key={row.start} value={row.start}>{row.start} – {row.end}</option>)}
      </select></label>}
    {period && view.isPending && <p role="status" className="text-sm">{t.load}</p>}
    {period && view.isError && <p role="alert" className="text-sm text-status-problem-fg">{t.error}</p>}
    {view.data && <div className="space-y-3" data-testid="claim-period">
      <dl className="grid grid-cols-3 gap-2 text-sm">
        <div><dt className="text-xs text-text-secondary">{t.claimed}</dt><dd className="font-mono tabular-nums">{view.data.claimed_lines} · {money(view.data.claimed_amount_ex_vat)}</dd></div>
        <div><dt className="text-xs text-text-secondary">{t.claimable}</dt><dd className="font-mono tabular-nums">{view.data.claimable_lines} · {money(view.data.claimable_amount_ex_vat)}</dd></div>
        <div><dt className="text-xs text-text-secondary">{t.backlog}</dt><dd className="font-mono tabular-nums">{view.data.backlog_lines}</dd></div>
      </dl>
      {view.data.blocked_reason && <p role="status" className="text-xs text-status-problem-fg">{t.blocked}</p>}
      <Button size="sm" disabled={compose.locked || !!view.data.blocked_reason || view.data.claimable_lines === 0}
        onClick={() => void compose.save(() => ({ request_id: crypto.randomUUID(), period_start: period }))}>{t.compose}</Button>
      {view.data.claimable_lines === 0 && !view.data.blocked_reason && <p className="text-xs text-text-secondary">{t.nothing}</p>}
      {compose.error && <p role="alert" className="text-xs text-status-problem-fg">{t.error}</p>}
      <div className="overflow-x-auto border-y border-border">
        <table className="w-full text-sm"><caption className="sr-only">{t.lines}</caption>
          <thead className="bg-surface-sunken text-xs text-text-secondary"><tr>
            <th scope="col" className="p-2 text-start font-medium">{t.project}</th>
            <th scope="col" className="p-2 text-start font-medium">{t.work}</th>
            <th scope="col" className="p-2 text-start font-medium">{t.date}</th>
            <th scope="col" className="p-2 text-end font-medium">{t.quantity}</th>
            <th scope="col" className="p-2 text-end font-medium">{t.amount}</th>
            <th scope="col" className="p-2 text-start font-medium">{t.state}</th>
          </tr></thead>
          <tbody>{view.data.lines.map((line) => <tr key={line.journal_item_id} data-testid="claim-line" className="border-t border-border">
            <td className="p-2">{line.project_name}</td>
            <td className="p-2"><bdi>{line.label}</bdi><span className="block text-xs text-text-secondary">{t[line.item_kind]}</span></td>
            <td className="p-2 font-mono text-xs">{line.work_date}</td>
            <td className="p-2 text-end tabular-nums">{line.quantity}{line.unit ? ` ${line.unit}` : ""}</td>
            <td className="p-2 text-end font-mono tabular-nums">{line.amount_ex_vat ? money(line.amount_ex_vat) : "—"}</td>
            <td className="p-2 text-xs">{t[line.state]}{line.claimed_in ? ` ${t.in} ${line.claimed_in}` : ""}
              {line.reason !== "RATED" && <span className="block text-text-secondary">{t[line.reason]}</span>}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </div>}
    {claims.data && <ContractReconciliationSummary contractId={contract.id} />}
    {claims.data && <div className="space-y-2">
      <h3 className="text-sm font-semibold">{t.packages} ({claims.data.total})</h3>
      {claims.data.items.length > 0 && <div className="overflow-x-auto border-y border-border">
        <table className="w-full text-sm"><caption className="sr-only">{t.packages}</caption>
          <thead className="bg-surface-sunken text-xs text-text-secondary"><tr>
            <th scope="col" className="p-2 text-start font-medium">{t.number}</th>
            <th scope="col" className="p-2 text-start font-medium">{t.period}</th>
            <th scope="col" className="p-2 text-start font-medium">{t.kind}</th>
            <th scope="col" className="p-2 text-start font-medium">{t.status}</th>
            <th scope="col" className="p-2 text-end font-medium">{t.lines}</th>
            <th scope="col" className="p-2 text-end font-medium">{t.amount}</th>
            <th scope="col" className="p-2 text-start font-medium"><span className="sr-only">{t.status}</span></th>
          </tr></thead>
          <tbody>{claims.data.items.map((row) => <tr key={row.id} data-testid="claim-row" className="border-t border-border">
            <td className="p-2 font-mono text-xs">{row.number}.{row.version}</td>
            <td className="p-2 font-mono text-xs"><bdi>{row.period_start} – {row.period_end}</bdi></td>
            <td className="p-2">{t[row.kind]}</td>
            <td className="p-2">{t[row.status]}{row.issued_at ? <span className="block text-xs text-text-secondary">{t.issuedAt}: {row.issued_at.slice(0, 10)}</span> : null}</td>
            <td className="p-2 text-end tabular-nums">{row.lines_count}</td>
            <td className="p-2 text-end font-mono font-semibold tabular-nums">{money(row.amount_ex_vat)}</td>
            <td className="p-2"><div className="flex flex-wrap gap-1">
              {row.status === "DRAFT" && <Button size="sm" onClick={() => setAction({ kind: "issue", claim: row })}>{t.issue}</Button>}
              {row.status === "DRAFT" && <Button size="sm" variant="outline" onClick={() => setAction({ kind: "cancel", claim: row })}>{t.cancel}</Button>}
              {row.status === "ISSUED" && <Button size="sm" variant="outline" onClick={() => setAction({ kind: "correct", claim: row })}>{t.correct}</Button>}
              {(row.status === "ISSUED" || row.status === "SUPERSEDED") && <Button size="sm" variant="outline" aria-pressed={reconcile?.id === row.id}
                onClick={() => setReconcile(reconcile?.id === row.id ? null : row)}>{reconciliationCopy[locale].reconcile}</Button>}
            </div></td>
          </tr>)}</tbody>
        </table>
      </div>}
      {reconcile && <ClaimReconciliationPanel contractId={contract.id} claim={reconcile} onClose={() => setReconcile(null)} />}
    </div>}
    {action && <ClaimActionDialog contractId={contract.id} action={action} onClose={() => setAction(null)} onSaved={refresh} />}
  </section>;
}

function ClaimActionDialog({ contractId, action, onClose, onSaved }: { contractId: string; action: Action; onClose: () => void; onSaved: () => void }) {
  const { locale } = useI18n(), t = claimCopy[locale];
  const [reviewed, setReviewed] = useState(false);
  const [reason, setReason] = useState("");
  const write = useCommercialWrite(claimsPath(contractId) + "/" + action.claim.id + "/" + action.kind, claimDetailSchema, onSaved);
  const needsReason = action.kind !== "issue";
  const valid = action.kind === "issue" ? reviewed : reason.trim().length > 0;
  const titles = { issue: [t.issueTitle, t.issueDescription, t.issue], cancel: [t.cancelTitle, t.cancelDescription, t.cancel], correct: [t.correctTitle, t.correctDescription, t.correct] }[action.kind];
  return <DraftDialog title={titles[0]} description={titles[1]} dirty={reviewed || reason.trim().length > 0} valid={valid} write={write} onClose={onClose}
    submitLabel={titles[2]}
    onSave={() => void write.save(() => action.kind === "issue"
      ? { request_id: crypto.randomUUID(), expected_lines_count: action.claim.lines_count, reviewed: true }
      : { request_id: crypto.randomUUID(), reason: reason.trim() })}>
    <p className="text-sm"><span className="font-mono">{action.claim.number}.{action.claim.version}</span> · {action.claim.lines_count} {t.lines} · {action.claim.amount_ex_vat} ILS</p>
    {action.kind === "issue" && <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} className="mt-1" />{t.review}</label>}
    {needsReason && <label className="block space-y-1 text-sm">{t.reason}<Textarea aria-label={t.reason} value={reason} maxLength={1000} onChange={(e) => setReason(e.target.value)} /></label>}
  </DraftDialog>;
}
