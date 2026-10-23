import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { CheckCircle2, ChevronLeft, ChevronRight, Eye, Mail, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { apiFetch } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { formatLocaleDateTime } from "@/lib/formatting";
import { COMMERCIAL_API, commercialPageSchema, commercialPricesPath, type CommercialContract } from "@/lib/commercial-prices";
import { termsPageSchema, contractTermsPath } from "@/lib/contract-terms";
import { approvalDetailSchema, approvalPageSchema, approvalSummarySchema, approvalsPath, candidateSchema,
  type ApprovalCandidate, type CommercialApproval } from "@/lib/commercial-approvals";
import { agreementPageSchema, agreementSummarySchema, agreementsPath, type CommercialAgreement as AgreementRow } from "@/lib/commercial-agreements";
import { AgreementSnapshot } from "./AgreementSnapshot";
import { agreementCopy } from "./agreement-copy";
import { approvalCopy } from "./approval-copy";
import { useCommercialWrite } from "./use-commercial-write";
import { DraftDialog } from "./DraftDialog";

function SendDialog({ candidate, contractId, close }: { candidate: ApprovalCandidate; contractId: string; close: () => void }) {
  const { locale } = useI18n(), t = approvalCopy[locale];
  const [consent, setConsent] = useState(false);
  const write = useCommercialWrite(approvalsPath(contractId), approvalSummarySchema, close);
  return <DraftDialog title={t.send} description={t.pendingNotice} dirty={consent} valid={consent && !!candidate.contact}
    write={write} onClose={close} submitLabel={t.send} onSave={() => void write.save(() => ({
      request_id: crypto.randomUUID(), terms_id: candidate.snapshot.terms.id, price_id: candidate.snapshot.price.id,
      snapshot_hash: candidate.snapshot_hash, factory_contact_id: candidate.contact!.id,
    }))}>
    <AgreementSnapshot snapshot={candidate.snapshot} />
    <div className="border-y border-border py-3 text-sm"><h3 className="font-semibold">{t.recipient}</h3>
      {candidate.contact ? <><p>{candidate.contact.factory_name} / {candidate.contact.recipient_name}</p>
        <p className="break-all"><bdi>{candidate.contact.recipient_email}</bdi></p>
        <p className="break-words text-xs text-text-secondary">{candidate.contact.authority_reference}</p></> : <p role="alert">{t.noContact}</p>}
    </div>
    <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={consent} className="mt-1 size-4 shrink-0 accent-accent"
      onChange={(event) => setConsent(event.target.checked)} />{t.sendConsent}</label>
  </DraftDialog>;
}

function ActivateDialog({ row, cutover, close }: { row: CommercialApproval; cutover: string; close: () => void }) {
  const { locale } = useI18n(), t = approvalCopy[locale], a = agreementCopy[locale];
  const [effectiveFrom, setEffectiveFrom] = useState(cutover);
  const [reason, setReason] = useState("");
  const [consent, setConsent] = useState(false);
  const write = useCommercialWrite(agreementsPath(row.contract_id), agreementSummarySchema, close);
  const valid = consent && !!reason.trim() && /^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom) && effectiveFrom >= cutover;
  return <DraftDialog title={a.activateTitle} description={a.activateDescription} dirty={consent || !!reason} valid={valid}
    write={write} onClose={close} submitLabel={a.activate}
    onSave={() => void write.save(() => ({ request_id: crypto.randomUUID(), approval_id: row.id, effective_from: effectiveFrom, reason: reason.trim(), accepted: true }))}>
    <p className="text-sm font-semibold">{t.terms} v{row.terms_version} / {t.price} v{row.price_version} · {row.confirmed_name}</p>
    <label className="block text-sm">{a.effectiveFrom}<input type="date" value={effectiveFrom} min={cutover} required
      onChange={(event) => setEffectiveFrom(event.target.value)} className="mt-2 block rounded-md border border-border bg-surface p-2 font-mono" /></label>
    <p className="text-xs text-text-secondary">{a.cutoverHint}</p>
    <label className="block text-sm">{a.reason}<textarea value={reason} maxLength={1000} required onChange={(event) => setReason(event.target.value)}
      className="mt-2 min-h-20 w-full rounded-md border border-border bg-surface p-3" /></label>
    <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={consent} className="mt-1 size-4 shrink-0 accent-accent"
      onChange={(event) => setConsent(event.target.checked)} />{a.consent}</label>
  </DraftDialog>;
}

function AgreementLine({ row, locale }: { row: AgreementRow; locale: "en" | "ru" | "he" }) {
  const a = agreementCopy[locale], t = approvalCopy[locale];
  const status = row.status === "ACTIVE" ? a.active : row.status === "SCHEDULED" ? a.scheduled : a.ended;
  return <p className="text-sm"><span className="font-semibold">{t.terms} v{row.terms_version} / {t.price} v{row.price_version}</span>
    <span className="ms-2 text-xs text-text-secondary">{status}</span>
    <span className="block text-xs text-text-secondary">{a.from} <bdi>{row.effective_from}</bdi> {row.effective_until ? <>{a.until} <bdi>{row.effective_until}</bdi></> : a.open} · {a.activated} {a.by} {row.activated_by_name}</span></p>;
}

function RevokeDialog({ row, close }: { row: CommercialApproval; close: () => void }) {
  const { locale } = useI18n(), t = approvalCopy[locale];
  const [reason, setReason] = useState("");
  const write = useCommercialWrite(approvalsPath(row.contract_id) + "/" + row.id + "/revoke", approvalSummarySchema, close);
  return <DraftDialog title={t.revoke} description={`${t.terms} v${row.terms_version} / ${t.price} v${row.price_version}`}
    dirty={!!reason} valid={!!reason.trim()} write={write} onClose={close} submitLabel={t.revoke}
    onSave={() => void write.save(() => ({ reason: reason.trim() }))}>
    <label className="block text-sm">{t.reason}<textarea value={reason} maxLength={1000} required onChange={(event) => setReason(event.target.value)}
      className="mt-2 min-h-24 w-full rounded-md border border-border bg-surface p-3" /></label>
  </DraftDialog>;
}

export function ContractApprovalsPanel({ contract }: { contract: CommercialContract }) {
  const { locale, dir } = useI18n(), t = approvalCopy[locale], client = useQueryClient();
  const [offset, setOffset] = useState(0), [review, setReview] = useState(false);
  const [sending, setSending] = useState<ApprovalCandidate | null>(null);
  const [revoking, setRevoking] = useState<CommercialApproval | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [activating, setActivating] = useState<CommercialApproval | null>(null);
  const agreements = useQuery({ queryKey: ["commercial-agreements", contract.id],
    queryFn: ({ signal }) => apiFetch(agreementsPath(contract.id) + "?limit=20&offset=0", { signal }, { schema: agreementPageSchema }) });
  const history = useQuery({ queryKey: ["commercial-approvals", contract.id, offset],
    queryFn: ({ signal }) => apiFetch(approvalsPath(contract.id) + `?limit=20&offset=${offset}`, { signal }, { schema: approvalPageSchema }) });
  const versions = useQuery({ queryKey: ["commercial-approval-versions", contract.id], enabled: review,
    queryFn: async ({ signal }) => {
      const terms = await apiFetch(contractTermsPath(contract.id) + "?limit=1", { signal }, { schema: termsPageSchema });
      const price = await apiFetch(commercialPricesPath(contract.id) + "?limit=1", { signal }, { schema: commercialPageSchema });
      if (!terms.items[0] || !price.items[0]) return null;
      return apiFetch(COMMERCIAL_API + "/" + contract.id + "/approval-preview?terms_id=" + terms.items[0].id + "&price_id=" + price.items[0].id,
        { signal }, { schema: candidateSchema });
    } });
  const detail = useQuery({ queryKey: ["commercial-approval-detail", contract.id, selected], enabled: !!selected,
    queryFn: ({ signal }) => apiFetch(approvalsPath(contract.id) + "/" + selected, { signal }, { schema: approvalDetailSchema }) });
  function refresh() { void client.invalidateQueries({ queryKey: ["commercial-approvals", contract.id] });
    void client.invalidateQueries({ queryKey: ["commercial-approval-versions", contract.id] });
    void client.invalidateQueries({ queryKey: ["commercial-approval-detail", contract.id] });
    void client.invalidateQueries({ queryKey: ["commercial-agreements", contract.id] });
    void client.invalidateQueries({ queryKey: ["commercial-periods", contract.id] }); }
  const a = agreementCopy[locale];
  const canActivate = agreements.data?.activation_enabled === true;
  const candidate = !versions.isError && !versions.isFetching ? versions.data : undefined;
  const hasConfirmedPair = candidate && history.data?.items.some((item) => item.status === "CONFIRMED" &&
    item.terms_id === candidate.snapshot.terms.id && item.price_id === candidate.snapshot.price.id);
  return <section aria-label={t.tab} className="min-w-0 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
      <h2 className="text-base font-semibold">{t.history}</h2><div className="flex flex-wrap gap-2">
        <Button variant="outline" size="icon" title={t.refresh} aria-label={t.refresh} onClick={refresh}><RefreshCw className="size-4" /></Button>
        <Button disabled={history.isError || history.isFetching} onClick={() => { setReview(true); void versions.refetch(); }}><Eye className="me-2 size-4" />{t.review}</Button>
      </div>
    </div>
    <p className="text-sm text-text-secondary">{t.recordOnly}</p>
    {agreements.data && <section aria-label={a.inEffect} className="space-y-2 border-y border-border py-3">
      <h3 className="text-sm font-semibold">{a.inEffect}</h3>
      {agreements.data.current ? <AgreementLine row={agreements.data.current} locale={locale} /> : !agreements.data.items.length && <p className="text-sm text-text-secondary">{a.none}</p>}
      {agreements.data.items.filter((row) => row.id !== agreements.data?.current?.id).map((row) => <AgreementLine key={row.id} row={row} locale={locale} />)}
    </section>}
    {(history.isPending || (review && versions.isFetching)) && <p role="status" className="text-sm">{t.load}</p>}
    {(history.isError || (review && versions.isError)) && <p role="alert" className="text-sm text-status-problem-fg">{t.error}</p>}
    {review && candidate === null && <p className="text-sm">{t.missing}</p>}
    {review && candidate && <div className="space-y-3 border-y border-border py-4 text-sm">
      <h3 className="font-semibold">{t.pair}: {t.terms} v{candidate.snapshot.terms.version} / {t.price} v{candidate.snapshot.price.version}</h3>
      {candidate.snapshot.is_demo && <p className="border-s-2 border-accent ps-3">{t.demo}</p>}
      {candidate.contact ? <p className="break-words">{t.recipient}: {candidate.contact.recipient_name} · <bdi>{candidate.contact.recipient_email}</bdi></p>
        : <p>{t.noContact} <Link className="underline" href="/price-lists">{t.manageContact}</Link></p>}
      {hasConfirmedPair ? <p role="status">{t.done}</p> : <Button onClick={() => setSending(candidate)} disabled={!candidate.contact || history.isError || history.isFetching}>
        <Mail className="me-2 size-4" />{t.send}</Button>}
    </div>}
    {!history.isError && history.data && <>
      {!history.data.total && <p className="py-4 text-sm text-text-secondary">{t.empty}</p>}
      <ul className="divide-y divide-border">{history.data.items.map((row) => <li key={row.id} className="flex min-w-0 flex-wrap items-start justify-between gap-3 py-4">
        <div className="min-w-0 space-y-1 text-sm"><p className="font-semibold">{t.terms} v{row.terms_version} / {t.price} v{row.price_version}
          <span className="ms-3 text-xs text-text-secondary">{t[row.status]}</span></p>
          <p className="break-words">{row.recipient_name} · <bdi>{row.recipient_email}</bdi></p>
          <p className="text-xs text-text-secondary">{t.delivery}: {row.delivery_status === "SENT" ? t.SENT : row.delivery_status === "FAILED" ? t.FAILED : row.delivery_status === "CANCELLED" ? t.CANCELLED : t.mailPending}</p>
          <p className="text-xs text-text-secondary">{t.expiry}: {formatLocaleDateTime(row.expires_at, locale)}</p>
          {row.confirmed_at && <p className="text-xs">{row.confirmed_name} · {formatLocaleDateTime(row.confirmed_at, locale)}{row.agreement_id && <span className="ms-2 text-text-secondary">· {a.alreadyInEffect}</span>}</p>}
          {row.revocation_reason && <p className="break-words text-xs">{row.revocation_reason}</p>}
        </div><div className="flex gap-2">
          <Button variant="outline" size="icon" title={t.details} aria-label={t.details} onClick={() => setSelected(row.id)}><Eye className="size-4" /></Button>
          {!row.confirmed_at && !row.revoked_at && <Button variant="outline" size="icon" title={t.revoke} aria-label={t.revoke}
            disabled={history.isFetching} onClick={() => setRevoking(row)}><XCircle className="size-4" /></Button>}
          {canActivate && row.status === "CONFIRMED" && !row.agreement_id && <Button size="sm" disabled={history.isFetching || agreements.isFetching}
            onClick={() => setActivating(row)}><CheckCircle2 className="me-2 size-4" />{a.activate}</Button>}
        </div>
      </li>)}</ul>
      <div className="flex items-center justify-end gap-2 text-xs"><span>{history.data.total}</span>
        <Button variant="outline" size="icon" aria-label={t.previous} title={t.previous} disabled={history.isFetching || !offset} onClick={() => setOffset(offset - 20)}><ChevronLeft className="size-4 rtl:rotate-180" /></Button>
        <Button variant="outline" size="icon" aria-label={t.next} title={t.next} disabled={history.isFetching || offset + 20 >= history.data.total} onClick={() => setOffset(offset + 20)}><ChevronRight className="size-4 rtl:rotate-180" /></Button>
      </div>
    </>}
    {sending && <SendDialog candidate={sending} contractId={contract.id} close={() => { setSending(null); refresh(); }} />}
    {revoking && <RevokeDialog row={revoking} close={() => { setRevoking(null); refresh(); }} />}
    {activating && agreements.data && <ActivateDialog row={activating} cutover={agreements.data.cutover} close={() => { setActivating(null); refresh(); }} />}
    {selected && <Dialog open onOpenChange={(open) => { if (!open) setSelected(null); }}><DialogContent dir={dir} closeLabel={t.close} className="w-[calc(100%-2rem)] max-w-3xl">
      <DialogTitle>{t.details}</DialogTitle><DialogDescription>{t.recordOnly}</DialogDescription>
      {detail.isPending && <p role="status">{t.load}</p>}{detail.isError && <p role="alert">{t.error}</p>}
      {detail.data && !detail.isError && <AgreementSnapshot snapshot={detail.data.snapshot} />}
    </DialogContent></Dialog>}
  </section>;
}
