"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch, type ResponseSchema } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { claimPageSchema, claimsPath, type ClaimSummary } from "@/lib/factory-claims";
import type { CommercialContract } from "@/lib/commercial-prices";
import { priceErrorStatus } from "@/lib/factory-prices";
import { downloadAttachment } from "@/lib/factory-reconciliation";
import {
  moneySummaryPath, moneySummarySchema, paymentAttachmentPath, paymentPath, paymentSchema, paymentPageSchema, paymentsPath, refundPageSchema,
  refundPath, refundSchema, refundsPath, uploadPaymentProof, uploadRefundProof, type DuplicateWarning, type Payment, type Refund,
} from "@/lib/factory-payments";
import { openingBalancesPath, openingBalancesViewSchema, type OpeningBalance } from "@/lib/opening-balances";
import { DraftDialog } from "./DraftDialog";
import { amountOk, field, useMoney } from "./form";
import { PayloadDecisionDialog } from "./PayloadDecisionDialog";
import { paymentCopy, type PaymentCopy } from "./payment-copy";
import { useCommercialWrite } from "./use-commercial-write";
import { useUpload } from "./use-upload";

type Dialog =
  | { kind: "register" } | { kind: "post"; payment: Payment } | { kind: "cancel"; payment: Payment } | { kind: "reverse"; payment: Payment }
  | { kind: "allocate"; payment: Payment } | { kind: "release"; payment: Payment; allocationId: string } | { kind: "propose"; payment: Payment }
  | { kind: "decide"; refund: Refund } | { kind: "execute"; refund: Refund } | { kind: "cancelRefund"; refund: Refund };

/** Payments from the factory: money received apart from what it settles; allocations, OWNER reversals and refunds. */
export function ContractPaymentsPanel({ contract }: { contract: CommercialContract }) {
  const { locale } = useI18n(), t = paymentCopy[locale], client = useQueryClient();
  const money = useMoney();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const payments = useQuery({ queryKey: ["factory-payments", contract.id], retry: false,
    queryFn: ({ signal }) => apiFetch(paymentsPath(contract.id) + "?limit=50&offset=0", { signal }, { schema: paymentPageSchema }) });
  const summary = useQuery({ queryKey: ["factory-money", contract.id], retry: false,
    queryFn: ({ signal }) => apiFetch(moneySummaryPath(contract.id), { signal }, { schema: moneySummarySchema }) });
  const refunds = useQuery({ queryKey: ["factory-refunds", contract.id], retry: false,
    queryFn: ({ signal }) => apiFetch(refundsPath(contract.id) + "?limit=50&offset=0", { signal }, { schema: refundPageSchema }) });
  // The package list is needed only by the allocation dialog.
  const claims = useQuery({ queryKey: ["factory-claims", contract.id], enabled: dialog?.kind === "allocate",
    queryFn: ({ signal }) => apiFetch(claimsPath(contract.id) + "?limit=50&offset=0", { signal }, { schema: claimPageSchema }) });
  // Approved opening debt is the other allocation target; a 409 means step 9 is switched off, any other failure is shown.
  const opening = useQuery({ queryKey: ["opening-balances", contract.id], enabled: dialog?.kind === "allocate", retry: false,
    queryFn: ({ signal }) => apiFetch(openingBalancesPath(contract.id), { signal }, { schema: openingBalancesViewSchema }) });
  const refresh = () => {
    for (const key of ["factory-payments", "factory-money", "factory-refunds", "factory-reconciliation", "opening-balances"]) void client.invalidateQueries({ queryKey: [key, contract.id] });
    setDialog(null);
  };
  async function attachProof(payment: Payment, file: File | null) {
    if (!file) return;
    setUploadingFor(payment.id);
    try { await uploadPaymentProof(contract.id, payment.id, file); refresh(); } finally { setUploadingFor(null); }
  }
  if (payments.isError && priceErrorStatus(payments.error) === 409) {
    return <p role="status" className="py-4 text-sm text-text-secondary">{t.disabled}</p>;
  }
  const issued = (claims.data?.items ?? []).filter((row) => row.status === "ISSUED");
  const openingDebts = (opening.data?.items ?? []).filter((row) => row.kind === "DEBT" && row.status === "APPROVED");
  const openingFailed = opening.isError && priceErrorStatus(opening.error) !== 409;
  const reasonDialog = (path: string, schema: ResponseSchema<unknown>, withRequest: boolean, title: string, description: string, submit: string) =>
    <ReasonDialog path={path} schema={schema} withRequest={withRequest} title={title} description={description} submit={submit} t={t} onClose={() => setDialog(null)} onSaved={refresh} />;
  return <section aria-label={t.tab} className="min-w-0 space-y-4">
    <div className="border-b border-border pb-3"><h2 className="text-base font-semibold">{t.title}</h2>
      <p className="mt-1 text-sm text-text-secondary">{t.intro}</p><p className="text-xs text-text-secondary">{t.vatNote}</p></div>
    {(payments.isPending || summary.isPending) && <p role="status" className="text-sm">{t.load}</p>}
    {(payments.isError || summary.isError) && <p role="alert" className="text-sm text-status-problem-fg">{t.error}</p>}
    {summary.data && <dl data-testid="money-summary" className="grid grid-cols-2 gap-2 rounded-md border border-border p-3 text-sm sm:grid-cols-5">
      {([[t.received, summary.data.received], [t.allocated, summary.data.allocated], [t.unallocated, summary.data.unallocated], [t.reserved, summary.data.reserved_for_refund],
        [t.refunded, summary.data.refunded], [t.needsVat, summary.data.needs_vat_rule], [t.payableNow, summary.data.payable_now], [t.overpayment, summary.data.overpayment]] as [string, string][])
        .map(([label, value]) => <div key={label}><dt className="text-xs text-text-secondary">{label}</dt><dd className="font-mono tabular-nums">{money(value)}</dd></div>)}
      <div><dt className="text-xs text-text-secondary">{t.openRefunds}</dt><dd className="font-mono tabular-nums">{summary.data.open_refunds}</dd></div>
      <div className="col-span-2 sm:col-span-5"><dt className="text-xs text-text-secondary">{t.byPurpose}</dt>
        <dd className="font-mono text-xs tabular-nums">{t.SETTLEMENT} {money(summary.data.unallocated_by_purpose.SETTLEMENT)} · {t.ADVANCE} {money(summary.data.unallocated_by_purpose.ADVANCE)} · {t.UNKNOWN} {money(summary.data.unallocated_by_purpose.UNKNOWN)}</dd></div>
    </dl>}
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">{t.payments} ({payments.data?.total ?? 0})</h3>
      <Button size="sm" onClick={() => setDialog({ kind: "register" })}>{t.register}</Button></div>
    {payments.data && payments.data.items.length === 0 && <p className="text-sm text-text-secondary">{t.noPayments}</p>}
    {payments.data && payments.data.items.length > 0 && <div className="overflow-x-auto border-y border-border">
      <table className="w-full text-sm"><caption className="sr-only">{t.payments}</caption>
        <thead className="bg-surface-sunken text-xs text-text-secondary"><tr>
          <th scope="col" className="p-2 text-start font-medium">{t.date}</th><th scope="col" className="p-2 text-start font-medium">{t.counterparty}</th>
          <th scope="col" className="p-2 text-start font-medium">{t.reference}</th><th scope="col" className="p-2 text-end font-medium">{t.amount}</th>
          <th scope="col" className="p-2 text-start font-medium">{t.status}</th><th scope="col" className="p-2 text-end font-medium">{t.available}</th>
          <th scope="col" className="p-2 text-start font-medium"><span className="sr-only">{t.status}</span></th>
        </tr></thead>
        <tbody>{payments.data.items.map((row) => <PaymentRow key={row.id} row={row} t={t} money={money} contractId={contract.id} uploading={uploadingFor === row.id}
          onProof={(file) => void attachProof(row, file)} onAction={setDialog} />)}</tbody>
      </table>
    </div>}
    <div className="space-y-2"><h3 className="text-sm font-semibold">{t.refunds} ({refunds.data?.total ?? 0})</h3>
      {refunds.data && refunds.data.items.length === 0 && <p className="text-sm text-text-secondary">{t.noRefunds}</p>}
      {refunds.data && refunds.data.items.length > 0 && <ul className="divide-y divide-border border-y border-border text-sm">
        {refunds.data.items.map((row) => <li key={row.id} data-testid="refund-row" className="flex flex-wrap items-center justify-between gap-2 py-2">
          <div><p><span className="font-mono tabular-nums">{money(row.amount)}</span> · {t[row.status]} · <bdi>{row.reason}</bdi>{row.bank_reference ? <span className="font-mono text-xs"> · {row.bank_reference}</span> : null}</p>
            <p className="font-mono text-xs text-text-secondary">{t.fingerprint}: {row.payload_sha256.slice(0, 16)}…{row.decision_reason ? ` · ${row.decision_reason}` : ""}</p></div>
          <div className="flex gap-1">
            {row.status === "PROPOSED" && <Button size="sm" onClick={() => setDialog({ kind: "decide", refund: row })}>{t.decide}</Button>}
            {row.status === "APPROVED" && <Button size="sm" onClick={() => setDialog({ kind: "execute", refund: row })}>{t.execute}</Button>}
            {(row.status === "PROPOSED" || row.status === "APPROVED") && <Button size="sm" variant="outline" onClick={() => setDialog({ kind: "cancelRefund", refund: row })}>{t.cancelRefund}</Button>}
          </div>
        </li>)}
      </ul>}
    </div>
    {dialog?.kind === "register" && <RegisterDialog contractId={contract.id} onClose={() => setDialog(null)} onSaved={refresh} />}
    {dialog?.kind === "post" && <PostDialog contractId={contract.id} payment={dialog.payment} onClose={() => setDialog(null)} onSaved={refresh} />}
    {dialog?.kind === "cancel" && reasonDialog(paymentPath(contract.id, dialog.payment.id) + "/cancel", paymentSchema, false, t.cancelTitle, t.cancelDescription, t.cancel)}
    {dialog?.kind === "reverse" && reasonDialog(paymentPath(contract.id, dialog.payment.id) + "/reverse", paymentSchema, true, t.reverseTitle, t.reverseDescription, t.reverse)}
    {dialog?.kind === "release" && reasonDialog(paymentPath(contract.id, dialog.payment.id) + "/allocations/" + dialog.allocationId + "/release", paymentSchema, false, t.releaseTitle, t.releaseDescription, t.release)}
    {dialog?.kind === "cancelRefund" && reasonDialog(refundPath(contract.id, dialog.refund.id) + "/cancel", refundSchema, false, t.cancelRefundTitle, t.cancelRefundDescription, t.cancelRefund)}
    {dialog?.kind === "allocate" && <AllocateDialog contractId={contract.id} payment={dialog.payment} claims={issued} openingDebts={openingDebts} openingFailed={openingFailed} onClose={() => setDialog(null)} onSaved={refresh} />}
    {dialog?.kind === "propose" && <ProposeDialog contractId={contract.id} payment={dialog.payment} onClose={() => setDialog(null)} onSaved={refresh} />}
    {dialog?.kind === "decide" && <PayloadDecisionDialog path={refundPath(contract.id, dialog.refund.id) + "/decision"} schema={refundSchema} payloadSha256={dialog.refund.payload_sha256}
      labels={{ title: t.decideTitle, description: t.decideDescription, fingerprint: t.fingerprint, approve: t.APPROVE, reject: t.REJECT, reason: t.reason, checked: t.checked }}
      summary={<p><span className="font-mono tabular-nums">{dialog.refund.amount}</span> ILS · <bdi>{dialog.refund.reason}</bdi></p>} onClose={() => setDialog(null)} onSaved={refresh} />}
    {dialog?.kind === "execute" && <ExecuteDialog contractId={contract.id} refund={dialog.refund} onClose={() => setDialog(null)} onSaved={refresh} />}
  </section>;
}

function PaymentRow({ row, t, money, contractId, uploading, onProof, onAction }: {
  row: Payment; t: PaymentCopy; money: (v: string) => string; contractId: string; uploading: boolean; onProof: (file: File | null) => void; onAction: (d: Dialog) => void;
}) {
  return <>
    <tr data-testid="payment-row" className="border-t border-border">
      <td className="p-2 font-mono text-xs">{row.received_on}</td>
      <td className="p-2"><bdi>{row.counterparty_name}</bdi><span className="block text-xs text-text-secondary">{t[row.purpose_kind]} · {t[row.tax_basis]}</span></td>
      <td className="p-2 font-mono text-xs">{row.bank_reference ?? "—"}{row.proof && <button type="button" className="block underline"
        onClick={() => void downloadAttachment(paymentAttachmentPath(contractId, row.proof!.id), row.proof!.filename)}>{t.proof}</button>}</td>
      <td className="p-2 text-end font-mono font-semibold tabular-nums">{money(row.amount)}</td>
      <td className="p-2">{t[row.status]}{row.duplicate_acknowledged && <span className="block text-xs text-text-secondary">{t.acknowledge}</span>}
        {row.reversal_reason && <span className="block text-xs text-text-secondary"><bdi>{row.reversal_reason}</bdi></span>}</td>
      <td className="p-2 text-end font-mono tabular-nums">{money(row.available)}</td>
      <td className="p-2"><div className="flex flex-wrap gap-1">
        {row.status === "DRAFT" && <label className="text-xs"><span className="sr-only">{t.attachProof}</span>
          <input type="file" aria-label={`${t.attachProof} ${row.received_on}`} disabled={uploading} onChange={(e) => onProof(e.target.files?.[0] ?? null)} className="max-w-40 text-xs" /></label>}
        {row.status === "DRAFT" && <Button size="sm" disabled={!row.proof || uploading} onClick={() => onAction({ kind: "post", payment: row })}>{t.post}</Button>}
        {row.status === "DRAFT" && <Button size="sm" variant="outline" onClick={() => onAction({ kind: "cancel", payment: row })}>{t.cancel}</Button>}
        {row.status === "POSTED" && row.allocatable && <Button size="sm" onClick={() => onAction({ kind: "allocate", payment: row })}>{t.allocate}</Button>}
        {row.status === "POSTED" && <Button size="sm" variant="outline" onClick={() => onAction({ kind: "propose", payment: row })}>{t.propose}</Button>}
        {row.status === "POSTED" && <Button size="sm" variant="outline" onClick={() => onAction({ kind: "reverse", payment: row })}>{t.reverse}</Button>}
      </div>{uploading && <p role="status" className="text-xs">{t.uploading}</p>}</td>
    </tr>
    {row.allocations.length > 0 && <tr className="border-t border-border bg-surface-sunken/40"><td colSpan={7} className="p-2 text-xs">
      <span className="font-medium">{t.allocations}:</span>
      <ul className="mt-1 space-y-1">{row.allocations.map((a) => <li key={a.id} data-testid="allocation-row" className="flex flex-wrap items-center gap-2">
        <span className="font-mono">{a.target_kind === "OPENING_DEBT" ? t.openingDebt : a.claim_label}</span> · {t[a.part]} · <span className="font-mono tabular-nums">{money(a.amount)}</span> · {a.active ? t.active : `${t.released}: ${a.release_reason ?? ""}`}
        {a.active && row.status === "POSTED" && <Button size="sm" variant="outline" onClick={() => onAction({ kind: "release", payment: row, allocationId: a.id })}>{t.release}</Button>}
      </li>)}</ul>
    </td></tr>}
  </>;
}

type DialogProps = { contractId: string; onClose: () => void; onSaved: () => void };

function RegisterDialog({ contractId, onClose, onSaved }: DialogProps) {
  const { locale } = useI18n(), t = paymentCopy[locale];
  const [form, setForm] = useState({ amount: "", received_on: "", counterparty_name: "", bank_reference: "", stated_purpose: "", purpose_kind: "SETTLEMENT", tax_basis: "EX_VAT" });
  const write = useCommercialWrite(paymentsPath(contractId), paymentSchema, onSaved);
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [key]: e.target.value });
  const valid = amountOk(form.amount) && form.received_on.length > 0 && form.counterparty_name.trim().length > 0;
  return <DraftDialog title={t.registerTitle} description={t.registerDescription} dirty={form.amount.length > 0 || form.counterparty_name.length > 0} valid={valid}
    write={write} onClose={onClose} submitLabel={t.register}
    onSave={() => void write.save(() => ({ request_id: crypto.randomUUID(), amount: form.amount, received_on: form.received_on, counterparty_name: form.counterparty_name.trim(),
      bank_reference: form.bank_reference.trim() || null, stated_purpose: form.stated_purpose.trim() || null, purpose_kind: form.purpose_kind, tax_basis: form.tax_basis }))}>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block space-y-1 text-sm">{t.amount}<Input inputMode="decimal" aria-label={t.amount} value={form.amount} onChange={set("amount")} /></label>
      <label className="block space-y-1 text-sm">{t.receivedOn}<Input type="date" aria-label={t.receivedOn} value={form.received_on} onChange={set("received_on")} /></label>
      <label className="block space-y-1 text-sm">{t.counterparty}<Input aria-label={t.counterparty} value={form.counterparty_name} maxLength={255} onChange={set("counterparty_name")} /></label>
      <label className="block space-y-1 text-sm">{t.bankReference}<Input aria-label={t.bankReference} value={form.bank_reference} maxLength={120} onChange={set("bank_reference")} /></label>
      <label className="block space-y-1 text-sm">{t.purposeKind}<select aria-label={t.purposeKind} value={form.purpose_kind} onChange={set("purpose_kind")} className={field}>
        <option value="SETTLEMENT">{t.SETTLEMENT}</option><option value="ADVANCE">{t.ADVANCE}</option><option value="UNKNOWN">{t.UNKNOWN}</option></select></label>
      <label className="block space-y-1 text-sm">{t.taxBasis}<select aria-label={t.taxBasis} value={form.tax_basis} onChange={set("tax_basis")} className={field}>
        <option value="EX_VAT">{t.EX_VAT}</option><option value="INC_VAT">{t.INC_VAT}</option><option value="UNSPECIFIED">{t.UNSPECIFIED}</option></select></label>
      <label className="block space-y-1 text-sm sm:col-span-2">{t.statedPurpose}<Textarea aria-label={t.statedPurpose} value={form.stated_purpose} maxLength={1000} onChange={set("stated_purpose")} /></label>
    </div>
  </DraftDialog>;
}

/** Posting goes through the shared write hook; a 409 POSSIBLE_DUPLICATE is the server asking the office to decide, not a failure. */
function PostDialog({ contractId, payment, onClose, onSaved }: DialogProps & { payment: Payment }) {
  const { locale } = useI18n(), t = paymentCopy[locale];
  const [acknowledged, setAcknowledged] = useState(false);
  const write = useCommercialWrite(paymentPath(contractId, payment.id) + "/post", paymentSchema, onSaved);
  const warnings = write.conflictMeta?.reason === "POSSIBLE_DUPLICATE" ? (write.conflictMeta.warnings as DuplicateWarning[]) : null;
  const asked = !!warnings;
  return <DraftDialog title={t.postTitle} description={t.postDescription} dirty={acknowledged} valid={!asked || acknowledged}
    write={{ ...write, blocked: asked ? false : write.blocked, locked: asked ? write.busy : write.locked, error: asked ? null : write.error }}
    onClose={onClose} submitLabel={t.post}
    onSave={() => void write.save(() => ({ request_id: crypto.randomUUID(), acknowledge_possible_duplicate: acknowledged }), { answered: asked })}>
    <p className="text-sm"><span className="font-mono tabular-nums">{payment.amount}</span> ILS · {payment.received_on} · <bdi>{payment.counterparty_name}</bdi></p>
    {warnings && <div role="alert" className="space-y-2 rounded-md border border-status-problem-fg/40 p-2 text-sm">
      <p>{t.possibleDuplicate}</p>
      <ul className="text-xs">{warnings.map((w, i) => <li key={i} className="font-mono">{w.payment_id.slice(0, 8)} · {t[w.reason]}</li>)}</ul>
      <label className="flex items-start gap-2"><input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} className="mt-1" />{t.acknowledge}</label>
    </div>}
  </DraftDialog>;
}

function ReasonDialog<T>({ path, schema, withRequest, title, description, submit, t, onClose, onSaved }: {
  path: string; schema: ResponseSchema<T>; withRequest: boolean; title: string; description: string; submit: string; t: PaymentCopy; onClose: () => void; onSaved: () => void;
}) {
  const [reason, setReason] = useState("");
  const write = useCommercialWrite<T>(path, schema, onSaved);
  return <DraftDialog title={title} description={description} dirty={reason.length > 0} valid={reason.trim().length > 0} write={write} onClose={onClose} submitLabel={submit}
    onSave={() => void write.save(() => (withRequest ? { request_id: crypto.randomUUID(), reason: reason.trim() } : { reason: reason.trim() }))}>
    <label className="block space-y-1 text-sm">{t.reason}<Textarea aria-label={t.reason} value={reason} maxLength={1000} onChange={(e) => setReason(e.target.value)} /></label>
  </DraftDialog>;
}

function AllocateDialog({ contractId, payment, claims, openingDebts, openingFailed, onClose, onSaved }: DialogProps & { payment: Payment; claims: ClaimSummary[]; openingDebts: OpeningBalance[]; openingFailed: boolean }) {
  const { locale } = useI18n(), t = paymentCopy[locale];
  // "claim:<id>" or "opening:<id>": exactly one target per allocation; an opening debt takes only the principal, so `part` is the single truth.
  const [target, setTarget] = useState("");
  const [part, setPart] = useState<"PRINCIPAL" | "RETENTION">("PRINCIPAL");
  const [amount, setAmount] = useState("");
  const write = useCommercialWrite(paymentPath(contractId, payment.id) + "/allocations", paymentSchema, onSaved);
  const [targetKind, targetId] = target.split(":");
  const toOpening = targetKind === "opening";
  return <DraftDialog title={t.allocateTitle} description={t.allocateDescription} dirty={target.length > 0 || amount.length > 0} valid={target.length > 0 && amountOk(amount)} write={write}
    onClose={onClose} submitLabel={t.allocate}
    onSave={() => void write.save(() => ({ request_id: crypto.randomUUID(), ...(toOpening ? { opening_balance_id: targetId } : { claim_id: targetId }), part, amount }))}>
    <p className="text-sm">{t.available}: <span className="font-mono tabular-nums">{payment.available}</span> ILS</p>
    {openingFailed && <p role="alert" className="text-sm text-status-problem-fg">{t.openingDebt}: {t.error}</p>}
    <label className="block space-y-1 text-sm">{t.target}<select aria-label={t.target} value={target} onChange={(e) => { setTarget(e.target.value); if (e.target.value.startsWith("opening:")) setPart("PRINCIPAL"); }} className={field}>
      <option value="">—</option>
      <optgroup label={t.claim}>{claims.map((row) => <option key={row.id} value={"claim:" + row.id}>{row.number}.{row.version} · {row.period_start} · {row.amount_ex_vat}</option>)}</optgroup>
      {openingDebts.length > 0 && <optgroup label={t.openingDebt}>{openingDebts.map((row) => <option key={row.id} value={"opening:" + row.id}>{t.openingDebt} · {row.as_of} · {row.amount}</option>)}</optgroup>}
    </select></label>
    <label className="block space-y-1 text-sm">{t.part}<select aria-label={t.part} value={part} disabled={toOpening} onChange={(e) => setPart(e.target.value as "PRINCIPAL" | "RETENTION")} className={field}>
      <option value="PRINCIPAL">{t.PRINCIPAL}</option><option value="RETENTION">{t.RETENTION}</option></select></label>
    <label className="block space-y-1 text-sm">{t.amount}<Input inputMode="decimal" aria-label={t.amount} value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
  </DraftDialog>;
}

function ProposeDialog({ contractId, payment, onClose, onSaved }: DialogProps & { payment: Payment }) {
  const { locale } = useI18n(), t = paymentCopy[locale];
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const write = useCommercialWrite(refundsPath(contractId), refundSchema, onSaved);
  return <DraftDialog title={t.proposeTitle} description={t.proposeDescription} dirty={amount.length > 0 || reason.length > 0} valid={amountOk(amount) && reason.trim().length > 0} write={write}
    onClose={onClose} submitLabel={t.propose}
    onSave={() => void write.save(() => ({ request_id: crypto.randomUUID(), payment_id: payment.id, amount, reason: reason.trim() }))}>
    <p className="text-sm">{t.available}: <span className="font-mono tabular-nums">{payment.available}</span> ILS</p>
    <label className="block space-y-1 text-sm">{t.amount}<Input inputMode="decimal" aria-label={t.amount} value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
    <label className="block space-y-1 text-sm">{t.reason}<Textarea aria-label={t.reason} value={reason} maxLength={1000} onChange={(e) => setReason(e.target.value)} /></label>
  </DraftDialog>;
}

function ExecuteDialog({ contractId, refund, onClose, onSaved }: DialogProps & { refund: Refund }) {
  const { locale } = useI18n(), t = paymentCopy[locale];
  const [form, setForm] = useState({ executed_on: "", bank_reference: "" });
  const upload = useUpload((file) => uploadRefundProof(contractId, file));
  const write = useCommercialWrite(refundPath(contractId, refund.id) + "/execute", refundSchema, onSaved);
  async function save() {
    const proofId = await upload.ensure();
    if (!proofId) return;
    void write.save(() => ({ request_id: crypto.randomUUID(), executed_on: form.executed_on, bank_reference: form.bank_reference.trim(), proof_attachment_id: proofId }));
  }
  return <DraftDialog title={t.executeTitle} description={t.executeDescription} dirty={form.executed_on.length > 0 || form.bank_reference.length > 0 || !!upload.file}
    valid={form.executed_on.length > 0 && form.bank_reference.trim().length > 0 && !!upload.file && !upload.uploading}
    write={upload.wrap(write)} onClose={onClose} submitLabel={t.execute} onSave={() => void save()}>
    <p className="text-sm"><span className="font-mono tabular-nums">{refund.amount}</span> ILS · <bdi>{refund.reason}</bdi></p>
    <label className="block space-y-1 text-sm">{t.executedOn}<Input type="date" aria-label={t.executedOn} value={form.executed_on} onChange={(e) => setForm({ ...form, executed_on: e.target.value })} /></label>
    <label className="block space-y-1 text-sm">{t.bankReference}<Input aria-label={t.bankReference} value={form.bank_reference} maxLength={120} onChange={(e) => setForm({ ...form, bank_reference: e.target.value })} /></label>
    <label className="block space-y-1 text-sm">{t.proofFile}<Input type="file" aria-label={t.proofFile} onChange={(e) => upload.setFile(e.target.files?.[0] ?? null)} /></label>
    {upload.uploading && <p role="status" className="text-xs">{t.uploading}</p>}
  </DraftDialog>;
}
