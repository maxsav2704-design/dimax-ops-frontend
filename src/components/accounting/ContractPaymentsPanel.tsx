"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, apiFetch } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { formatLocaleMoney } from "@/lib/formatting";
import { claimPageSchema, claimsPath, type ClaimSummary } from "@/lib/factory-claims";
import type { CommercialContract } from "@/lib/commercial-prices";
import { priceErrorStatus } from "@/lib/factory-prices";
import {
  moneySummaryPath, moneySummarySchema, paymentAttachmentPath, paymentPath, paymentSchema, paymentPageSchema, paymentsPath, refundPageSchema,
  refundPath, refundSchema, refundsPath, uploadPaymentProof, uploadRefundProof, type DuplicateWarning, type Payment, type Refund,
} from "@/lib/factory-payments";
import { DraftDialog } from "./DraftDialog";
import { paymentCopy, type PaymentCopy } from "./payment-copy";
import { useCommercialWrite } from "./use-commercial-write";

type Dialog =
  | { kind: "register" } | { kind: "post"; payment: Payment } | { kind: "cancel"; payment: Payment } | { kind: "reverse"; payment: Payment }
  | { kind: "allocate"; payment: Payment } | { kind: "release"; payment: Payment; allocationId: string } | { kind: "propose"; payment: Payment }
  | { kind: "decide"; refund: Refund } | { kind: "execute"; refund: Refund } | { kind: "cancelRefund"; refund: Refund };
const field = "h-9 w-full rounded-md border border-border bg-surface px-2 text-sm";
const amountOk = (value: string) => /^\d+(\.\d{1,2})?$/.test(value) && Number(value) > 0;

/** Payments from the factory: money received apart from what it settles; allocations, OWNER reversals and refunds. */
export function ContractPaymentsPanel({ contract }: { contract: CommercialContract }) {
  const { locale } = useI18n(), t = paymentCopy[locale], client = useQueryClient();
  const money = (value: string) => formatLocaleMoney(value, "ILS", locale, { minimumFractionDigits: 2 });
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const payments = useQuery({ queryKey: ["factory-payments", contract.id], retry: false,
    queryFn: ({ signal }) => apiFetch(paymentsPath(contract.id) + "?limit=50&offset=0", { signal }, { schema: paymentPageSchema }) });
  const summary = useQuery({ queryKey: ["factory-money", contract.id], retry: false,
    queryFn: ({ signal }) => apiFetch(moneySummaryPath(contract.id), { signal }, { schema: moneySummarySchema }) });
  const refunds = useQuery({ queryKey: ["factory-refunds", contract.id], retry: false,
    queryFn: ({ signal }) => apiFetch(refundsPath(contract.id) + "?limit=50&offset=0", { signal }, { schema: refundPageSchema }) });
  const claims = useQuery({ queryKey: ["factory-claims", contract.id],
    queryFn: ({ signal }) => apiFetch(claimsPath(contract.id) + "?limit=50&offset=0", { signal }, { schema: claimPageSchema }) });
  const refresh = () => {
    for (const key of ["factory-payments", "factory-money", "factory-refunds", "factory-reconciliation"]) void client.invalidateQueries({ queryKey: [key, contract.id] });
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
    {(dialog?.kind === "cancel" || dialog?.kind === "reverse") && <ReasonDialog path={paymentPath(contract.id, dialog.payment.id) + "/" + dialog.kind} schema={paymentSchema}
      withRequest={dialog.kind === "reverse"} title={dialog.kind === "cancel" ? t.cancelTitle : t.reverseTitle} description={dialog.kind === "cancel" ? t.cancelDescription : t.reverseDescription}
      submit={dialog.kind === "cancel" ? t.cancel : t.reverse} t={t} onClose={() => setDialog(null)} onSaved={refresh} />}
    {dialog?.kind === "release" && <ReasonDialog path={paymentPath(contract.id, dialog.payment.id) + "/allocations/" + dialog.allocationId + "/release"} schema={paymentSchema}
      withRequest={false} title={t.releaseTitle} description={t.releaseDescription} submit={t.release} t={t} onClose={() => setDialog(null)} onSaved={refresh} />}
    {dialog?.kind === "cancelRefund" && <ReasonDialog path={refundPath(contract.id, dialog.refund.id) + "/cancel"} schema={refundSchema} withRequest={false}
      title={t.cancelRefundTitle} description={t.cancelRefundDescription} submit={t.cancelRefund} t={t} onClose={() => setDialog(null)} onSaved={refresh} />}
    {dialog?.kind === "allocate" && <AllocateDialog contractId={contract.id} payment={dialog.payment} claims={issued} onClose={() => setDialog(null)} onSaved={refresh} />}
    {dialog?.kind === "propose" && <ProposeDialog contractId={contract.id} payment={dialog.payment} onClose={() => setDialog(null)} onSaved={refresh} />}
    {dialog?.kind === "decide" && <DecideDialog contractId={contract.id} refund={dialog.refund} onClose={() => setDialog(null)} onSaved={refresh} />}
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
      <td className="p-2 font-mono text-xs">{row.bank_reference ?? "—"}{row.proof && <a className="block underline" href={paymentAttachmentPath(contractId, row.proof.id)}>{t.proof}</a>}</td>
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
        <span className="font-mono">{a.claim_label}</span> · {t[a.part]} · <span className="font-mono tabular-nums">{money(a.amount)}</span> · {a.active ? t.active : `${t.released}: ${a.release_reason ?? ""}`}
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
  return <DraftDialog title={t.registerTitle} description={t.registerDescription} dirty={Object.values(form).some((v) => v.length > 0 && v !== "SETTLEMENT" && v !== "EX_VAT")} valid={valid}
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

function PostDialog({ contractId, payment, onClose, onSaved }: DialogProps & { payment: Payment }) {
  const { locale } = useI18n(), t = paymentCopy[locale];
  const [warnings, setWarnings] = useState<DuplicateWarning[] | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<"conflict" | "denied" | "validation" | "uncertain" | null>(null);
  async function save() {
    setBusy(true); setError(null);
    try {
      await apiFetch(paymentPath(contractId, payment.id) + "/post", { method: "POST",
        body: JSON.stringify({ request_id: crypto.randomUUID(), acknowledge_possible_duplicate: acknowledged }) }, { schema: paymentSchema });
      onSaved();
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 409 && cause.meta?.reason === "POSSIBLE_DUPLICATE") setWarnings((cause.meta.warnings as DuplicateWarning[]) ?? []);
      else { const status = priceErrorStatus(cause); setError(status === 401 || status === 403 ? "denied" : status === 409 ? "conflict" : status >= 500 || status < 400 ? "uncertain" : "validation"); }
    } finally { setBusy(false); }
  }
  return <DraftDialog title={t.postTitle} description={t.postDescription} dirty={acknowledged} valid={!warnings || acknowledged}
    write={{ busy, locked: busy, blocked: false, uncertain: false, error }} onClose={onClose} submitLabel={t.post} onSave={() => void save()}>
    <p className="text-sm"><span className="font-mono tabular-nums">{payment.amount}</span> ILS · {payment.received_on} · <bdi>{payment.counterparty_name}</bdi></p>
    {warnings && <div role="alert" className="space-y-2 rounded-md border border-status-problem-fg/40 p-2 text-sm">
      <p>{t.possibleDuplicate}</p>
      <ul className="text-xs">{warnings.map((w, i) => <li key={i} className="font-mono">{w.payment_id.slice(0, 8)} · {t[w.reason]}</li>)}</ul>
      <label className="flex items-start gap-2"><input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} className="mt-1" />{t.acknowledge}</label>
    </div>}
  </DraftDialog>;
}

function ReasonDialog<T>({ path, schema, withRequest, title, description, submit, t, onClose, onSaved }: {
  path: string; schema: Parameters<typeof useCommercialWrite<T>>[1]; withRequest: boolean; title: string; description: string; submit: string; t: PaymentCopy; onClose: () => void; onSaved: () => void;
}) {
  const [reason, setReason] = useState("");
  const write = useCommercialWrite<T>(path, schema, onSaved);
  return <DraftDialog title={title} description={description} dirty={reason.length > 0} valid={reason.trim().length > 0} write={write} onClose={onClose} submitLabel={submit}
    onSave={() => void write.save(() => (withRequest ? { request_id: crypto.randomUUID(), reason: reason.trim() } : { reason: reason.trim() }))}>
    <label className="block space-y-1 text-sm">{t.reason}<Textarea aria-label={t.reason} value={reason} maxLength={1000} onChange={(e) => setReason(e.target.value)} /></label>
  </DraftDialog>;
}

function AllocateDialog({ contractId, payment, claims, onClose, onSaved }: DialogProps & { payment: Payment; claims: ClaimSummary[] }) {
  const { locale } = useI18n(), t = paymentCopy[locale];
  const [claimId, setClaimId] = useState("");
  const [part, setPart] = useState<"PRINCIPAL" | "RETENTION">("PRINCIPAL");
  const [amount, setAmount] = useState("");
  const write = useCommercialWrite(paymentPath(contractId, payment.id) + "/allocations", paymentSchema, onSaved);
  return <DraftDialog title={t.allocateTitle} description={t.allocateDescription} dirty={claimId.length > 0 || amount.length > 0} valid={claimId.length > 0 && amountOk(amount)} write={write}
    onClose={onClose} submitLabel={t.allocate}
    onSave={() => void write.save(() => ({ request_id: crypto.randomUUID(), claim_id: claimId, part, amount }))}>
    <p className="text-sm">{t.available}: <span className="font-mono tabular-nums">{payment.available}</span> ILS</p>
    <label className="block space-y-1 text-sm">{t.claim}<select aria-label={t.claim} value={claimId} onChange={(e) => setClaimId(e.target.value)} className={field}>
      <option value="">—</option>{claims.map((row) => <option key={row.id} value={row.id}>{row.number}.{row.version} · {row.period_start} · {row.amount_ex_vat}</option>)}</select></label>
    <label className="block space-y-1 text-sm">{t.part}<select aria-label={t.part} value={part} onChange={(e) => setPart(e.target.value as "PRINCIPAL" | "RETENTION")} className={field}>
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

function DecideDialog({ contractId, refund, onClose, onSaved }: DialogProps & { refund: Refund }) {
  const { locale } = useI18n(), t = paymentCopy[locale];
  const [decision, setDecision] = useState<"APPROVE" | "REJECT">("APPROVE");
  const [reason, setReason] = useState("");
  const [checked, setChecked] = useState(false);
  const write = useCommercialWrite(refundPath(contractId, refund.id) + "/decision", refundSchema, onSaved);
  return <DraftDialog title={t.decideTitle} description={t.decideDescription} dirty={reason.length > 0 || checked} valid={checked && reason.trim().length > 0} write={write}
    onClose={onClose} submitLabel={t[decision]}
    onSave={() => void write.save(() => ({ request_id: crypto.randomUUID(), payload_sha256: refund.payload_sha256, decision, reason: reason.trim() }))}>
    <p className="text-sm"><span className="font-mono tabular-nums">{refund.amount}</span> ILS · <bdi>{refund.reason}</bdi></p>
    <p className="break-all font-mono text-xs"><span className="text-text-secondary">{t.fingerprint}:</span> {refund.payload_sha256}</p>
    <div className="flex gap-4 text-sm">
      <label className="flex items-center gap-2"><input type="radio" name="refund-decision" checked={decision === "APPROVE"} onChange={() => setDecision("APPROVE")} />{t.APPROVE}</label>
      <label className="flex items-center gap-2"><input type="radio" name="refund-decision" checked={decision === "REJECT"} onChange={() => setDecision("REJECT")} />{t.REJECT}</label>
    </div>
    <label className="block space-y-1 text-sm">{t.reason}<Textarea aria-label={t.reason} value={reason} maxLength={1000} onChange={(e) => setReason(e.target.value)} /></label>
    <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-1" />{t.checked}</label>
  </DraftDialog>;
}

function ExecuteDialog({ contractId, refund, onClose, onSaved }: DialogProps & { refund: Refund }) {
  const { locale } = useI18n(), t = paymentCopy[locale];
  const [form, setForm] = useState({ executed_on: "", bank_reference: "" });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [proofId, setProofId] = useState<string | null>(null);
  const write = useCommercialWrite(refundPath(contractId, refund.id) + "/execute", refundSchema, onSaved);
  async function save() {
    let id = proofId;
    if (!id) {
      if (!file) return;
      setUploading(true);
      try { id = (await uploadRefundProof(contractId, file)).id; setProofId(id); } finally { setUploading(false); }
    }
    void write.save(() => ({ request_id: crypto.randomUUID(), executed_on: form.executed_on, bank_reference: form.bank_reference.trim(), proof_attachment_id: id }));
  }
  return <DraftDialog title={t.executeTitle} description={t.executeDescription} dirty={form.executed_on.length > 0 || form.bank_reference.length > 0 || !!file}
    valid={form.executed_on.length > 0 && form.bank_reference.trim().length > 0 && !!file && !uploading}
    write={{ ...write, busy: write.busy || uploading, locked: write.locked || uploading }} onClose={onClose} submitLabel={t.execute} onSave={() => void save()}>
    <p className="text-sm"><span className="font-mono tabular-nums">{refund.amount}</span> ILS · <bdi>{refund.reason}</bdi></p>
    <label className="block space-y-1 text-sm">{t.executedOn}<Input type="date" aria-label={t.executedOn} value={form.executed_on} onChange={(e) => setForm({ ...form, executed_on: e.target.value })} /></label>
    <label className="block space-y-1 text-sm">{t.bankReference}<Input aria-label={t.bankReference} value={form.bank_reference} maxLength={120} onChange={(e) => setForm({ ...form, bank_reference: e.target.value })} /></label>
    <label className="block space-y-1 text-sm">{t.proofFile}<Input type="file" aria-label={t.proofFile} onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
    {uploading && <p role="status" className="text-xs">{t.uploading}</p>}
  </DraftDialog>;
}
