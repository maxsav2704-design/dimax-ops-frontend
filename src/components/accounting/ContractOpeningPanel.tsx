"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { CommercialContract } from "@/lib/commercial-prices";
import { paymentAttachmentPath } from "@/lib/factory-payments";
import { priceErrorStatus } from "@/lib/factory-prices";
import { openingBalancePath, openingBalancesPath, openingBalancesViewSchema, uploadOpeningEvidence, type OpeningBalance, type OpeningBalancesView } from "@/lib/opening-balances";
import { DraftDialog } from "./DraftDialog";
import { AttachmentLink, FiguresGrid } from "./figures";
import { amountOk, field, setter, useMoney } from "./form";
import { openingCopy, type OpeningCopy } from "./opening-copy";
import { PayloadDecisionDialog } from "./PayloadDecisionDialog";
import { useCommercialWrite } from "./use-commercial-write";
import { useUpload } from "./use-upload";

type Dialog = { kind: "add" } | { kind: "edit"; row: OpeningBalance } | { kind: "reconcile"; row: OpeningBalance } | { kind: "decide"; row: OpeningBalance };

/** Opening balances of a contract: rows per kind, the factory's acknowledgement, OWNER's decision, early signed work. */
export function ContractOpeningPanel({ contract }: { contract: CommercialContract }) {
  const { locale } = useI18n(), t = openingCopy[locale], client = useQueryClient();
  const money = useMoney();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const view = useQuery({ queryKey: ["opening-balances", contract.id], retry: false,
    queryFn: ({ signal }) => apiFetch(openingBalancesPath(contract.id), { signal }, { schema: openingBalancesViewSchema }) });
  // Every write answers with the whole view: keep it instead of refetching it; the money panels are only marked stale.
  const refresh = (next?: OpeningBalancesView) => {
    if (next) client.setQueryData(["opening-balances", contract.id], next);
    for (const key of ["factory-payments", "factory-money", "factory-reconciliation"]) void client.invalidateQueries({ queryKey: [key, contract.id] });
    setDialog(null);
  };
  if (view.isError && priceErrorStatus(view.error) === 409) {
    return <p role="status" className="py-4 text-sm text-text-secondary">{t.disabled}</p>;
  }
  const data = view.data;
  return <section aria-label={t.tab} className="min-w-0 space-y-4">
    <div className="border-b border-border pb-3"><h2 className="text-base font-semibold">{t.title}</h2>
      <p className="mt-1 text-sm text-text-secondary">{t.intro}</p></div>
    {view.isPending && <p role="status" className="text-sm">{t.load}</p>}
    {view.isError && <p role="alert" className="text-sm text-status-problem-fg">{t.error}</p>}
    {data && <FiguresGrid testId="opening-figures" cells={[[t.asOf, data.as_of], [t.debt, money(data.figures.debt)], [t.retention, money(data.figures.retention)],
      [t.advance, money(data.figures.advance)], [t.disputed, money(data.figures.disputed)], [t.principalDue, money(data.figures.principal_due)],
      [t.principalPaid, money(data.figures.principal_paid)], [t.principalRemaining, money(data.figures.principal_remaining)]]}>
      <div><dt className="text-xs text-text-secondary">{t.coversEarlyWork}</dt><dd>{data.figures.covers_early_work ? t.yes : t.no}</dd></div>
      {Number(data.figures.needs_vat_rule ?? 0) > 0 && <div data-testid="opening-needs-vat-rule">
        <dt className="text-xs text-status-warning-fg">{t.needsVatRule}</dt><dd className="font-mono tabular-nums">{money(data.figures.needs_vat_rule ?? "0")}</dd></div>}
    </FiguresGrid>}
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">{t.rows} ({data?.items.length ?? 0})</h3>
      <Button size="sm" onClick={() => setDialog({ kind: "add" })}>{t.add}</Button></div>
    {data && data.items.length > 0 && <ul className="divide-y divide-border border-y border-border text-sm">
      {data.items.map((row) => <li key={row.id} data-testid="opening-row" className="flex flex-wrap items-start justify-between gap-2 py-2">
        <div className="space-y-1">
          <p><span className="font-medium">{t[row.kind]}</span> · <span className="font-mono tabular-nums">{money(row.amount)}</span> · {t[row.tax_basis]} · {t[row.status]} · {t.revision} {row.revision}</p>
          <p className="text-xs text-text-secondary"><bdi>{row.basis}</bdi>{row.terms_known ? (row.due_on ? ` · ${t.dueOn}: ${row.due_on}` : ` · ${t.releaseCondition}: ${row.release_condition ?? ""}`) : ""}{row.covers_early_work ? ` · ${t.coversEarly}` : ""}</p>
          <p className="text-xs">{row.acknowledged_amount === null ? <span className="rounded bg-status-problem-bg px-1 text-status-problem-fg">{t.notReconciled}</span>
            : <>{t.acknowledged}: <span className="font-mono tabular-nums">{money(row.acknowledged_amount)}</span> · {t.disputed}: <span className="font-mono tabular-nums">{money(row.disputed_amount ?? "0.00")}</span>{row.reconciled_author ? ` · ${row.reconciled_author}` : ""}</>}
            {row.advance_payment_id && <span className="ms-2 text-text-secondary">· {t.advancePayment}</span>}</p>
          <p className="text-xs text-text-secondary"><span className="font-mono">{t.fingerprint}: {row.payload_sha256.slice(0, 16)}…</span> · {t.evidence}: <AttachmentLink path={paymentAttachmentPath(contract.id, row.evidence.id)} file={row.evidence} />
            {row.reconciliation_attachment && <> · {t.answerFile}: <AttachmentLink path={paymentAttachmentPath(contract.id, row.reconciliation_attachment.id)} file={row.reconciliation_attachment} /></>}</p>
        </div>
        {row.status === "DRAFT" && <div className="flex flex-wrap gap-1">
          <Button size="sm" variant="outline" onClick={() => setDialog({ kind: "edit", row })}>{t.edit}</Button>
          <Button size="sm" variant="outline" onClick={() => setDialog({ kind: "reconcile", row })}>{t.reconcile}</Button>
          <Button size="sm" disabled={row.acknowledged_amount === null} onClick={() => setDialog({ kind: "decide", row })}>{t.decide}</Button>
        </div>}
      </li>)}
    </ul>}
    {data && <div className="space-y-2"><h3 className="text-sm font-semibold">{t.earlyWork} ({data.early_work.length})</h3>
      <p className="text-xs text-text-secondary">{t.earlyIntro}</p>
      {data.early_work.length === 0 ? <p className="text-sm text-text-secondary">{t.none}</p> : <div className="overflow-x-auto border-y border-border">
        <table className="w-full text-sm"><caption className="sr-only">{t.earlyWork}</caption>
          <thead className="bg-surface-sunken text-xs text-text-secondary"><tr>
            <th scope="col" className="p-2 text-start font-medium">{t.project}</th><th scope="col" className="p-2 text-start font-medium">{t.work}</th>
            <th scope="col" className="p-2 text-start font-medium">{t.date}</th><th scope="col" className="p-2 text-start font-medium">{t.status}</th></tr></thead>
          <tbody>{data.early_work.map((row) => <tr key={row.journal_item_id} data-testid="early-work-row" className="border-t border-border">
            <td className="p-2">{row.project_name}</td><td className="p-2"><bdi>{row.label}</bdi> · {t[row.item_kind]}</td>
            <td className="p-2 font-mono text-xs">{row.work_date}</td><td className="p-2 text-xs">{row.covered ? t.covered : t.notCovered}</td></tr>)}</tbody>
        </table></div>}
    </div>}
    {(dialog?.kind === "add" || dialog?.kind === "edit") && <RowDialog contractId={contract.id} row={dialog.kind === "edit" ? dialog.row : null} t={t} onClose={() => setDialog(null)} onSaved={refresh} />}
    {dialog?.kind === "reconcile" && <ReconcileDialog contractId={contract.id} row={dialog.row} t={t} onClose={() => setDialog(null)} onSaved={refresh} />}
    {dialog?.kind === "decide" && <PayloadDecisionDialog path={openingBalancePath(contract.id, dialog.row.id) + "/decision"} schema={openingBalancesViewSchema}
      payloadSha256={dialog.row.payload_sha256}
      labels={{ title: t.decideTitle, description: t.decideDescription, fingerprint: t.fingerprint, approve: t.APPROVE, reject: t.REJECT, reason: t.reason, checked: t.checked }}
      summary={<p>{t[dialog.row.kind]} · <span className="font-mono tabular-nums">{dialog.row.amount}</span> ILS · {t.acknowledged}: {dialog.row.acknowledged_amount ?? "—"} · {t.disputed}: {dialog.row.disputed_amount ?? "—"}</p>}
      onClose={() => setDialog(null)} onSaved={refresh} />}
  </section>;
}

type Form = { kind: "DEBT" | "RETENTION" | "ADVANCE"; amount: string; basis: string; tax_basis: string; terms_known: boolean; due_on: string; release_condition: string; covers_early_work: boolean };

function RowDialog({ contractId, row, t, onClose, onSaved }: { contractId: string; row: OpeningBalance | null; t: OpeningCopy; onClose: () => void; onSaved: (view: OpeningBalancesView) => void }) {
  const [form, setForm] = useState<Form>(row
    ? { kind: row.kind, amount: row.amount, basis: row.basis, tax_basis: row.tax_basis, terms_known: row.terms_known, due_on: row.due_on ?? "", release_condition: row.release_condition ?? "", covers_early_work: row.covers_early_work }
    : { kind: "DEBT", amount: "", basis: "", tax_basis: "EX_VAT", terms_known: true, due_on: "", release_condition: "", covers_early_work: false });
  const upload = useUpload((file) => uploadOpeningEvidence(contractId, file));
  const write = useCommercialWrite(row ? openingBalancePath(contractId, row.id) : openingBalancesPath(contractId), openingBalancesViewSchema, onSaved, { method: row ? "PATCH" : "POST" });
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm({ ...form, [key]: value });
  const retention = form.kind === "RETENTION";
  const termsOk = !form.terms_known || (retention ? form.release_condition.trim().length > 0 : form.due_on.length > 0);
  const valid = amountOk(form.amount) && form.basis.trim().length > 0 && termsOk && (!!upload.file || !!row);
  async function save() {
    // A new row needs its evidence; an edited row keeps the old file unless a new one was chosen.
    const evidenceId = (await upload.ensure()) ?? row?.evidence.id;
    if (!evidenceId) return;
    void write.save(() => ({ request_id: crypto.randomUUID(), kind: form.kind, amount: form.amount, basis: form.basis.trim(), tax_basis: form.tax_basis, terms_known: form.terms_known,
      due_on: form.terms_known && !retention ? form.due_on : null, release_condition: form.terms_known && retention ? form.release_condition.trim() : null,
      covers_early_work: form.kind === "DEBT" && form.covers_early_work, evidence_attachment_id: evidenceId }));
  }
  const [initial] = useState(form);  // "dirty" means changed, so an untouched edit closes without the discard question
  return <DraftDialog title={row ? t.editTitle : t.addTitle} description={row ? t.editDescription : t.addDescription} dirty={JSON.stringify(form) !== JSON.stringify(initial) || !!upload.file}
    valid={valid && !upload.uploading} write={upload.wrap(write)} onClose={onClose} submitLabel={row ? t.edit : t.add} onSave={() => void save()}>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block space-y-1 text-sm">{t.kind}<select aria-label={t.kind} value={form.kind} onChange={(e) => set("kind", e.target.value as Form["kind"])} className={field}>
        <option value="DEBT">{t.DEBT}</option><option value="RETENTION">{t.RETENTION}</option><option value="ADVANCE">{t.ADVANCE}</option></select></label>
      <label className="block space-y-1 text-sm">{t.amount}<Input inputMode="decimal" aria-label={t.amount} value={form.amount} onChange={(e) => set("amount", e.target.value)} /></label>
      <label className="block space-y-1 text-sm">{t.taxBasis}<select aria-label={t.taxBasis} value={form.tax_basis} onChange={(e) => set("tax_basis", e.target.value)} className={field}>
        <option value="EX_VAT">{t.EX_VAT}</option><option value="INC_VAT">{t.INC_VAT}</option><option value="UNSPECIFIED">{t.UNSPECIFIED}</option></select></label>
      <label className="flex items-center gap-2 text-sm sm:mt-6"><input type="checkbox" checked={form.terms_known} onChange={(e) => set("terms_known", e.target.checked)} />{t.termsKnown}</label>
      {form.terms_known && !retention && <label className="block space-y-1 text-sm">{t.dueOn}<Input type="date" aria-label={t.dueOn} value={form.due_on} onChange={(e) => set("due_on", e.target.value)} /></label>}
      {form.terms_known && retention && <label className="block space-y-1 text-sm sm:col-span-2">{t.releaseCondition}<Textarea aria-label={t.releaseCondition} value={form.release_condition} maxLength={2000} onChange={(e) => set("release_condition", e.target.value)} /></label>}
      <label className="block space-y-1 text-sm sm:col-span-2">{t.basis}<Textarea aria-label={t.basis} value={form.basis} maxLength={2000} onChange={(e) => set("basis", e.target.value)} /></label>
      {form.kind === "DEBT" && <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={form.covers_early_work} onChange={(e) => set("covers_early_work", e.target.checked)} />{t.coversEarly}</label>}
      <label className="block space-y-1 text-sm sm:col-span-2">{t.evidence}<Input type="file" aria-label={t.evidence} onChange={(e) => upload.setFile(e.target.files?.[0] ?? null)} /></label>
    </div>
    {upload.uploading && <p role="status" className="text-xs">{t.uploading}</p>}
  </DraftDialog>;
}

function ReconcileDialog({ contractId, row, t, onClose, onSaved }: { contractId: string; row: OpeningBalance; t: OpeningCopy; onClose: () => void; onSaved: (view: OpeningBalancesView) => void }) {
  const [form, setForm] = useState({ channel: "EMAIL", author_name: "", answered_at: "", acknowledged_amount: "", note: "" });
  const upload = useUpload((file) => uploadOpeningEvidence(contractId, file));
  const write = useCommercialWrite(openingBalancePath(contractId, row.id) + "/reconcile", openingBalancesViewSchema, onSaved);
  const set = setter<typeof form>(form, setForm);
  const valid = form.author_name.trim().length > 0 && form.answered_at.length > 0 && amountOk(form.acknowledged_amount, { zero: true }) && !!upload.file;
  async function save() {
    const attachmentId = await upload.ensure();
    if (!attachmentId) return;
    void write.save(() => ({ channel: form.channel, author_name: form.author_name.trim(), answered_at: new Date(form.answered_at).toISOString(),
      acknowledged_amount: form.acknowledged_amount, attachment_id: attachmentId, note: form.note.trim() || null }));
  }
  return <DraftDialog title={t.reconcileTitle} description={t.reconcileDescription} dirty={form.author_name.length > 0 || form.acknowledged_amount.length > 0 || !!upload.file}
    valid={valid && !upload.uploading} write={upload.wrap(write)} onClose={onClose} submitLabel={t.reconcile} onSave={() => void save()}>
    <p className="text-sm">{t[row.kind]} · <span className="font-mono tabular-nums">{row.amount}</span> ILS · <bdi>{row.basis}</bdi></p>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block space-y-1 text-sm">{t.channel}<select aria-label={t.channel} value={form.channel} onChange={set("channel")} className={field}>
        <option value="EMAIL">{t.EMAIL}</option><option value="WHATSAPP">{t.WHATSAPP}</option></select></label>
      <label className="block space-y-1 text-sm">{t.answeredAt}<Input type="datetime-local" aria-label={t.answeredAt} value={form.answered_at} onChange={set("answered_at")} /></label>
      <label className="block space-y-1 text-sm">{t.author}<Input aria-label={t.author} value={form.author_name} maxLength={255} onChange={set("author_name")} /></label>
      <label className="block space-y-1 text-sm">{t.acknowledgedAmount}<Input inputMode="decimal" aria-label={t.acknowledgedAmount} value={form.acknowledged_amount} onChange={set("acknowledged_amount")} /></label>
      <label className="block space-y-1 text-sm sm:col-span-2">{t.answerFile}<Input type="file" aria-label={t.answerFile} onChange={(e) => upload.setFile(e.target.files?.[0] ?? null)} /></label>
      <label className="block space-y-1 text-sm sm:col-span-2">{t.note}<Textarea aria-label={t.note} value={form.note} maxLength={2000} onChange={set("note")} /></label>
    </div>
    {upload.uploading && <p role="status" className="text-xs">{t.uploading}</p>}
  </DraftDialog>;
}
