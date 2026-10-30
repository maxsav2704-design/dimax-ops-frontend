"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { claimDetailSchema, type ClaimLine, type ClaimSummary } from "@/lib/factory-claims";
import { priceErrorStatus } from "@/lib/factory-prices";
import {
  claimAttachmentPath, claimPath, claimReconciliationSchema, contractReconciliationPath, contractReconciliationSchema, reconciliationPath,
  uploadClaimAttachment, type ClaimResponse, type Correction, type ReconciliationFigures,
} from "@/lib/factory-reconciliation";
import { DraftDialog } from "./DraftDialog";
import { amountOk, field, useMoney } from "./form";
import { PayloadDecisionDialog } from "./PayloadDecisionDialog";
import { reconciliationCopy, type ReconciliationCopy } from "./reconciliation-copy";
import { useCommercialWrite } from "./use-commercial-write";
import { useUpload } from "./use-upload";

type Dialog = { kind: "answer" } | { kind: "prepare" } | { kind: "decide"; correction: Correction } | { kind: "retention" } | { kind: "release" };

function Figures({ figures, t }: { figures: ReconciliationFigures; t: ReconciliationCopy }) {
  const money = useMoney();
  const cells: [string, string][] = [
    [t.presented, money(figures.presented_ex_vat)],
    [t.acknowledged, figures.acknowledged_ex_vat === null ? t.notComparable : money(figures.acknowledged_ex_vat)],
    [t.disputed, money(figures.disputed_ex_vat)], [t.writtenOff, money(figures.written_off_ex_vat)], [t.outstanding, money(figures.outstanding_ex_vat)],
    [t.retention, money(figures.retention_ex_vat)], [t.released, money(figures.retention_released_ex_vat)], [t.held, money(figures.retention_held_ex_vat)],
    [t.payableNow, money(figures.payable_now_ex_vat)], [t.paid, money(figures.paid_ex_vat)], [t.retentionPaid, money(figures.retention_paid_ex_vat)],
    [t.balanceDue, money(figures.balance_due_ex_vat)],
  ];
  return <dl data-testid="reconciliation-figures" className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
    {cells.map(([label, value]) => <div key={label}><dt className="text-xs text-text-secondary">{label}</dt><dd className="font-mono tabular-nums">{value}</dd></div>)}
    <div className="col-span-2 sm:col-span-5"><dt className="sr-only">{t.status}</dt><dd className="text-xs">{t[figures.answer_state]} · {t[figures.settlement]}</dd></div>
  </dl>;
}

/** Contract-wide totals of the issued packages; hidden when the reconciliation flag is off. */
export function ContractReconciliationSummary({ contractId }: { contractId: string }) {
  const { locale } = useI18n(), t = reconciliationCopy[locale];
  const summary = useQuery({ queryKey: ["factory-reconciliation", contractId], retry: false,
    queryFn: ({ signal }) => apiFetch(contractReconciliationPath(contractId), { signal }, { schema: contractReconciliationSchema }) });
  if (!summary.data) return null;
  return <section aria-label={t.summary} className="space-y-2 rounded-md border border-border p-3">
    <h3 className="text-sm font-semibold">{t.summary}</h3>
    <p className="text-xs text-text-secondary">{t.issuedClaims}: {summary.data.issued_claims} · {t.answered}: {summary.data.answered_claims} · {t.clarificationClaims}: {summary.data.clarification_required_claims} · {t.pendingCorrections}: {summary.data.pending_corrections}</p>
    <Figures figures={summary.data.figures} t={t} />
  </section>;
}

/** Reconciliation of one issued claim version: the factory's answers, OWNER write-offs, the retention and its releases. */
export function ClaimReconciliationPanel({ contractId, claim, onClose }: { contractId: string; claim: ClaimSummary; onClose: () => void }) {
  const { locale } = useI18n(), t = reconciliationCopy[locale], client = useQueryClient();
  const money = useMoney();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const state = useQuery({ queryKey: ["factory-reconciliation", contractId, claim.id], retry: false,
    queryFn: ({ signal }) => apiFetch(reconciliationPath(contractId, claim.id), { signal }, { schema: claimReconciliationSchema }) });
  // The claim's lines are needed only by the answer and write-off dialogs.
  const detail = useQuery({ queryKey: ["factory-claim", contractId, claim.id], enabled: dialog?.kind === "answer" || dialog?.kind === "prepare",
    queryFn: ({ signal }) => apiFetch(claimPath(contractId, claim.id), { signal }, { schema: claimDetailSchema }) });
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ["factory-reconciliation", contractId] });
    void client.invalidateQueries({ queryKey: ["factory-claims", contractId] });
    setDialog(null);
  };
  if (state.isError && priceErrorStatus(state.error) === 409) {
    return <p role="status" className="py-2 text-sm text-text-secondary">{t.disabled}</p>;
  }
  const data = state.data;
  const issued = data?.status === "ISSUED";
  const attachmentLink = (id: string, name: string) => <a className="underline" href={claimAttachmentPath(contractId, claim.id, id)}><bdi>{name}</bdi></a>;
  return <section aria-label={t.title} data-testid="claim-reconciliation" className="space-y-4 rounded-md border border-border p-3">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div><h3 className="text-sm font-semibold">{t.title} · <span className="font-mono">{claim.number}.{claim.version}</span></h3>
        <p className="text-xs text-text-secondary">{t.intro}</p></div>
      <Button size="sm" variant="outline" onClick={onClose}>{t.close}</Button>
    </div>
    {state.isPending && <p role="status" className="text-sm">{t.load}</p>}
    {state.isError && <p role="alert" className="text-sm text-status-problem-fg">{t.error}</p>}
    {data && (data.figures ? <Figures figures={data.figures} t={t} /> : <p className="text-sm text-text-secondary">{t.noNumbers}</p>)}
    {data && <>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-sm font-semibold">{t.answers} ({data.responses.length})</h4>
          {(issued || data.status === "SUPERSEDED") && <Button size="sm" onClick={() => setDialog({ kind: "answer" })}>{t.registerAnswer}</Button>}</div>
        {data.responses.length > 0 && <ul className="divide-y divide-border border-y border-border text-sm">
          {data.responses.map((row) => <li key={row.id} data-testid="factory-answer" className="space-y-1 py-2">
            <p><span className="font-medium"><bdi>{row.author_name}</bdi></span> · {t[row.channel]} · <span className="font-mono text-xs">{row.answered_at.slice(0, 16).replace("T", " ")}</span>
              {row.id === data.current_response_id && <span className="ms-2 rounded bg-surface-sunken px-1 text-xs">{t.current}</span>}</p>
            <p className="font-mono text-xs tabular-nums">{t.acknowledged}: {money(row.acknowledged_amount)} ({t[row.tax_basis]}) · {t.disputed}: {money(row.disputed_amount_ex_vat)} · {row.detail === "LINES" ? t.detailed : t.packageLevel}
              {row.clarification_required && <span className="ms-2 rounded bg-status-problem-bg px-1 text-status-problem-fg">{t.clarification}</span>}</p>
            {row.note && <p className="text-xs text-text-secondary"><bdi>{row.note}</bdi></p>}
            {row.lines.length > 0 && <ul className="text-xs text-text-secondary">{row.lines.map((line) => <li key={line.claim_line_id}><bdi>{line.label}</bdi>: {t[line.decision]}{line.factory_note ? ` — ${line.factory_note}` : ""}</li>)}</ul>}
            <p className="text-xs">{t.attachment}: {attachmentLink(row.attachment.id, row.attachment.filename)} · <span className="font-mono">{row.attachment.sha256.slice(0, 12)}</span></p>
          </li>)}
        </ul>}
      </div>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-sm font-semibold">{t.writeOffs} ({data.corrections.length})</h4>
          {issued && <Button size="sm" onClick={() => setDialog({ kind: "prepare" })}>{t.prepareWriteOff}</Button>}</div>
        {data.corrections.length > 0 && <ul className="divide-y divide-border border-y border-border text-sm">
          {data.corrections.map((row) => <li key={row.id} data-testid="write-off" className="flex flex-wrap items-center justify-between gap-2 py-2">
            <div><p><span className="font-mono tabular-nums">{money(row.amount_ex_vat)}</span> · {t[row.status]} · <bdi>{row.reason}</bdi></p>
              <p className="font-mono text-xs text-text-secondary">{t.fingerprint}: {row.payload_sha256.slice(0, 16)}… · {t.version} {row.claim_version}{row.decision_reason ? ` · ${row.decision_reason}` : ""}</p></div>
            {row.status === "PREPARED" && issued && <Button size="sm" variant="outline" onClick={() => setDialog({ kind: "decide", correction: row })}>{t.decide}</Button>}
          </li>)}
        </ul>}
      </div>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-sm font-semibold">{t.retentionTitle}</h4>
          {issued && <div className="flex gap-1">
            <Button size="sm" onClick={() => setDialog({ kind: "retention" })}>{data.retention ? t.changeRetention : t.setRetention}</Button>
            {data.retention && <Button size="sm" variant="outline" onClick={() => setDialog({ kind: "release" })}>{t.release}</Button>}
          </div>}</div>
        {data.retention ? <div data-testid="retention" className="text-sm">
          <p><span className="font-mono tabular-nums">{money(data.retention.amount_ex_vat)}</span> · {t.revision} {data.retention.revision} · <bdi>{data.retention.basis}</bdi></p>
          <p className="text-xs text-text-secondary">{t.releaseCondition}: <bdi>{data.retention.release_condition}</bdi></p>
        </div> : <p className="text-sm text-text-secondary">{t.noRetention}</p>}
        {data.releases.length > 0 && <ul className="divide-y divide-border border-y border-border text-sm">
          {data.releases.map((row) => <li key={row.id} data-testid="release" className="py-2">
            <span className="font-mono tabular-nums">{money(row.amount_ex_vat)}</span> · <span className="font-mono text-xs">{row.occurred_at.slice(0, 10)}</span> · <bdi>{row.evidence}</bdi>
            {row.attachment && <span className="text-xs"> · {attachmentLink(row.attachment.id, row.attachment.filename)}</span>}
          </li>)}
        </ul>}
        {data.retention_history.length > 1 && <p className="text-xs text-text-secondary">{t.history}: {data.retention_history.map((row) => `${row.revision} ${money(row.amount_ex_vat)} (${t[row.status]})`).join(" · ")}</p>}
      </div>
      {data.allocations.length > 0 && <div className="space-y-1"><h4 className="text-sm font-semibold">{t.allocations}</h4>
        <ul className="text-xs">{data.allocations.map((a) => <li key={a.id} data-testid="claim-allocation">
          <span className="font-mono tabular-nums">{money(a.amount)}</span> · {t[a.part]} · {a.bank_reference ?? a.payment_id.slice(0, 8)} · {a.active ? t.active : `${t.releasedAllocation}: ${a.release_reason ?? ""}`}</li>)}</ul></div>}
    </>}
    {dialog?.kind === "answer" && data && <AnswerDialog contractId={contractId} claim={claim} lines={detail.data?.lines ?? []} onClose={() => setDialog(null)} onSaved={refresh} />}
    {dialog?.kind === "prepare" && data && <PrepareDialog contractId={contractId} claim={claim} lines={detail.data?.lines ?? []} responses={data.responses} onClose={() => setDialog(null)} onSaved={refresh} />}
    {dialog?.kind === "decide" && data && <PayloadDecisionDialog path={claimPath(contractId, claim.id) + "/corrections/" + dialog.correction.id + "/decision"}
      schema={claimReconciliationSchema} payloadSha256={dialog.correction.payload_sha256} extraBody={{ expected_claim_version: claim.version }}
      labels={{ title: t.decideTitle, description: t.decideDescription, fingerprint: t.fingerprint, approve: t.APPROVE, reject: t.REJECT, reason: t.reason, checked: t.checkedPayload }}
      summary={<><p><span className="font-mono">{dialog.correction.amount_ex_vat}</span> ILS · <bdi>{dialog.correction.reason}</bdi></p>
        <p className="text-xs"><span className="text-text-secondary">{t.expectedVersion}:</span> {claim.number}.{claim.version}</p></>}
      onClose={() => setDialog(null)} onSaved={refresh} />}
    {dialog?.kind === "retention" && data && <RetentionDialog contractId={contractId} claim={claim} onClose={() => setDialog(null)} onSaved={refresh} />}
    {dialog?.kind === "release" && data && <ReleaseDialog contractId={contractId} claim={claim} onClose={() => setDialog(null)} onSaved={refresh} />}
  </section>;
}

type DialogProps = { contractId: string; claim: ClaimSummary; onClose: () => void; onSaved: () => void };

function AnswerDialog({ contractId, claim, lines, onClose, onSaved }: DialogProps & { lines: ClaimLine[] }) {
  const { locale } = useI18n(), t = reconciliationCopy[locale];
  const [form, setForm] = useState({ channel: "EMAIL", author_name: "", author_contact: "", answered_at: "", acknowledged_amount: "", tax_basis: "EX_VAT", note: "" });
  const [withLines, setWithLines] = useState(false);
  const [decisions, setDecisions] = useState<Record<string, "ACKNOWLEDGED" | "DISPUTED">>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const upload = useUpload((file) => uploadClaimAttachment(contractId, claim.id, file));
  const write = useCommercialWrite(claimPath(contractId, claim.id) + "/responses", claimReconciliationSchema, onSaved);
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [key]: e.target.value });
  const valid = form.author_name.trim().length > 0 && form.answered_at.length > 0 && amountOk(form.acknowledged_amount, { zero: true }) && !!upload.file
    && (!withLines || lines.every((line) => line.id && decisions[line.id]));
  const dirty = form.author_name.length > 0 || form.acknowledged_amount.length > 0 || !!upload.file;
  async function save() {
    const attachmentId = await upload.ensure();
    if (!attachmentId) return;
    void write.save(() => ({
      request_id: crypto.randomUUID(), channel: form.channel, author_name: form.author_name.trim(), author_contact: form.author_contact.trim() || null,
      answered_at: new Date(form.answered_at).toISOString(), attachment_id: attachmentId, acknowledged_amount: form.acknowledged_amount,
      tax_basis: form.tax_basis, note: form.note.trim() || null,
      lines: withLines ? lines.filter((line) => line.id).map((line) => ({ claim_line_id: line.id, decision: decisions[line.id!], factory_note: notes[line.id!]?.trim() || null })) : null,
    }));
  }
  return <DraftDialog title={t.answerTitle} description={t.answerDescription} dirty={dirty} valid={valid && !upload.uploading}
    write={upload.wrap(write)} onClose={onClose} submitLabel={t.registerAnswer} onSave={() => void save()}>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block space-y-1 text-sm">{t.channel}<select aria-label={t.channel} value={form.channel} onChange={set("channel")} className={field}>
        <option value="EMAIL">{t.EMAIL}</option><option value="WHATSAPP">{t.WHATSAPP}</option></select></label>
      <label className="block space-y-1 text-sm">{t.answeredAt}<Input type="datetime-local" aria-label={t.answeredAt} value={form.answered_at} onChange={set("answered_at")} /></label>
      <label className="block space-y-1 text-sm">{t.author}<Input aria-label={t.author} value={form.author_name} maxLength={255} onChange={set("author_name")} /></label>
      <label className="block space-y-1 text-sm">{t.contact}<Input aria-label={t.contact} value={form.author_contact} maxLength={255} onChange={set("author_contact")} /></label>
      <label className="block space-y-1 text-sm">{t.acknowledgedAmount}<Input inputMode="decimal" aria-label={t.acknowledgedAmount} value={form.acknowledged_amount} onChange={set("acknowledged_amount")} /></label>
      <label className="block space-y-1 text-sm">{t.taxBasis}<select aria-label={t.taxBasis} value={form.tax_basis} onChange={set("tax_basis")} className={field}>
        <option value="EX_VAT">{t.EX_VAT}</option><option value="INC_VAT">{t.INC_VAT}</option><option value="UNSPECIFIED">{t.UNSPECIFIED}</option></select></label>
      <label className="block space-y-1 text-sm sm:col-span-2">{t.file}<Input type="file" aria-label={t.file} onChange={(e) => upload.setFile(e.target.files?.[0] ?? null)} /></label>
      <label className="block space-y-1 text-sm sm:col-span-2">{t.note}<Textarea aria-label={t.note} value={form.note} maxLength={2000} onChange={set("note")} /></label>
    </div>
    {form.tax_basis === "EX_VAT" && lines.length > 0 && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={withLines} onChange={(e) => setWithLines(e.target.checked)} />{t.withLines}</label>}
    {withLines && form.tax_basis === "EX_VAT" && <ul className="space-y-1 text-sm">{lines.filter((line) => line.id).map((line) => <li key={line.id} className="grid gap-1 sm:grid-cols-3">
      <span><bdi>{line.label}</bdi> · <span className="font-mono text-xs">{line.amount_ex_vat}</span></span>
      <select aria-label={`${t.decision}: ${line.label}`} value={decisions[line.id!] ?? ""} onChange={(e) => setDecisions({ ...decisions, [line.id!]: e.target.value as "ACKNOWLEDGED" | "DISPUTED" })} className={field}>
        <option value="">—</option><option value="ACKNOWLEDGED">{t.ACKNOWLEDGED}</option><option value="DISPUTED">{t.DISPUTED}</option></select>
      <Input aria-label={`${t.factoryNote}: ${line.label}`} value={notes[line.id!] ?? ""} maxLength={1000} onChange={(e) => setNotes({ ...notes, [line.id!]: e.target.value })} />
    </li>)}</ul>}
    {upload.uploading && <p role="status" className="text-xs">{t.uploading}</p>}
  </DraftDialog>;
}

function PrepareDialog({ contractId, claim, lines, responses, onClose, onSaved }: DialogProps & { lines: ClaimLine[]; responses: ClaimResponse[] }) {
  const { locale } = useI18n(), t = reconciliationCopy[locale];
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [basis, setBasis] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const write = useCommercialWrite(claimPath(contractId, claim.id) + "/corrections", claimReconciliationSchema, onSaved);
  return <DraftDialog title={t.prepareTitle} description={t.prepareDescription} dirty={amount.length > 0 || reason.length > 0} valid={amountOk(amount) && reason.trim().length > 0}
    write={write} onClose={onClose} submitLabel={t.prepareWriteOff}
    onSave={() => void write.save(() => ({ request_id: crypto.randomUUID(), kind: "WRITE_OFF", amount_ex_vat: amount, line_ids: picked.length ? picked : null,
      basis_response_id: basis || null, reason: reason.trim() }))}>
    <label className="block space-y-1 text-sm">{t.amount}<Input inputMode="decimal" aria-label={t.amount} value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
    {lines.length > 0 && <fieldset className="space-y-1 text-sm"><legend>{t.lines}</legend>
      {lines.filter((line) => line.id).map((line) => <label key={line.id} className="flex items-center gap-2"><input type="checkbox" checked={picked.includes(line.id!)}
        onChange={(e) => setPicked(e.target.checked ? [...picked, line.id!] : picked.filter((id) => id !== line.id))} /><bdi>{line.label}</bdi> · <span className="font-mono text-xs">{line.amount_ex_vat}</span></label>)}
    </fieldset>}
    <label className="block space-y-1 text-sm">{t.basis}<select aria-label={t.basis} value={basis} onChange={(e) => setBasis(e.target.value)} className={field}>
      <option value="">{t.noBasis}</option>{responses.map((row) => <option key={row.id} value={row.id}>{row.author_name} · {row.answered_at.slice(0, 10)} · {row.acknowledged_amount}</option>)}</select></label>
    <label className="block space-y-1 text-sm">{t.reason}<Textarea aria-label={t.reason} value={reason} maxLength={1000} onChange={(e) => setReason(e.target.value)} /></label>
  </DraftDialog>;
}

function RetentionDialog({ contractId, claim, onClose, onSaved }: DialogProps) {
  const { locale } = useI18n(), t = reconciliationCopy[locale];
  const [form, setForm] = useState({ amount_ex_vat: "", basis: "", release_condition: "", reason: "" });
  const write = useCommercialWrite(claimPath(contractId, claim.id) + "/retention", claimReconciliationSchema, onSaved);
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [key]: e.target.value });
  const valid = amountOk(form.amount_ex_vat, { zero: true }) && form.basis.trim().length > 0 && form.release_condition.trim().length > 0 && form.reason.trim().length > 0;
  return <DraftDialog title={t.setTitle} description={t.setDescription} dirty={Object.values(form).some((v) => v.length > 0)} valid={valid} write={write} onClose={onClose}
    submitLabel={t.setRetention}
    onSave={() => void write.save(() => ({ request_id: crypto.randomUUID(), amount_ex_vat: form.amount_ex_vat, basis: form.basis.trim(),
      release_condition: form.release_condition.trim(), reason: form.reason.trim() }))}>
    <label className="block space-y-1 text-sm">{t.amount}<Input inputMode="decimal" aria-label={t.amount} value={form.amount_ex_vat} onChange={set("amount_ex_vat")} /></label>
    <label className="block space-y-1 text-sm">{t.retentionBasis}<Textarea aria-label={t.retentionBasis} value={form.basis} maxLength={2000} onChange={set("basis")} /></label>
    <label className="block space-y-1 text-sm">{t.releaseCondition}<Textarea aria-label={t.releaseCondition} value={form.release_condition} maxLength={2000} onChange={set("release_condition")} /></label>
    <label className="block space-y-1 text-sm">{t.reason}<Textarea aria-label={t.reason} value={form.reason} maxLength={1000} onChange={set("reason")} /></label>
  </DraftDialog>;
}

function ReleaseDialog({ contractId, claim, onClose, onSaved }: DialogProps) {
  const { locale } = useI18n(), t = reconciliationCopy[locale];
  const [form, setForm] = useState({ amount_ex_vat: "", evidence: "", occurred_at: "" });
  const upload = useUpload((file) => uploadClaimAttachment(contractId, claim.id, file));
  const write = useCommercialWrite(claimPath(contractId, claim.id) + "/retention/releases", claimReconciliationSchema, onSaved);
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [key]: e.target.value });
  const valid = amountOk(form.amount_ex_vat) && form.evidence.trim().length > 0 && form.occurred_at.length > 0;
  async function save() {
    const attachmentId = await upload.ensure();
    void write.save(() => ({ request_id: crypto.randomUUID(), amount_ex_vat: form.amount_ex_vat, evidence: form.evidence.trim(),
      attachment_id: attachmentId, occurred_at: new Date(form.occurred_at).toISOString() }));
  }
  return <DraftDialog title={t.releaseTitle} description={t.releaseDescription} dirty={Object.values(form).some((v) => v.length > 0)} valid={valid && !upload.uploading}
    write={upload.wrap(write)} onClose={onClose} submitLabel={t.release} onSave={() => void save()}>
    <label className="block space-y-1 text-sm">{t.amount}<Input inputMode="decimal" aria-label={t.amount} value={form.amount_ex_vat} onChange={set("amount_ex_vat")} /></label>
    <label className="block space-y-1 text-sm">{t.occurredAt}<Input type="datetime-local" aria-label={t.occurredAt} value={form.occurred_at} onChange={set("occurred_at")} /></label>
    <label className="block space-y-1 text-sm">{t.evidence}<Textarea aria-label={t.evidence} value={form.evidence} maxLength={2000} onChange={set("evidence")} /></label>
    <label className="block space-y-1 text-sm">{t.evidenceFile}<Input type="file" aria-label={t.evidenceFile} onChange={(e) => upload.setFile(e.target.files?.[0] ?? null)} /></label>
  </DraftDialog>;
}
