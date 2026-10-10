"use client";

import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCheck, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { formatLocaleDateTime } from "@/lib/formatting";
import { PRICE_API, priceRequest, priceErrorStatus, isUncertainPriceWrite,
  type CompanyPricingState, type EffectivePriceVersion, type PriceDetail, type ReconciliationPage } from "@/lib/factory-prices";
import { activationCopy } from "./activation-copy";
import { reconciliationCopy } from "./reconciliation-copy";

export function PriceActivationDialog({ list, onClose, onChanged }: {
  list: PriceDetail; onClose: () => void; onChanged: () => void;
}) {
  const { locale, dir } = useI18n();
  const t = activationCopy[locale];
  const issues = reconciliationCopy[locale];
  const [reason, setReason] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [locked, setLocked] = useState(false);
  const [result, setResult] = useState<EffectivePriceVersion | null>(null);
  const submitting = useRef(false);
  const query = useQuery({
    queryKey: ["price-activation-check", list.id], retry: false, gcTime: 0, staleTime: 0,
    refetchOnWindowFocus: false, refetchOnReconnect: false,
    queryFn: async ({ signal }) => {
      const state = await apiFetch<CompanyPricingState>(`${PRICE_API}/state`, { signal });
      const report = await apiFetch<ReconciliationPage>(`${PRICE_API}/${list.id}/reconciliation?limit=1&offset=0`, { signal });
      if (!report.application_check || report.price_list_id !== list.id || report.version !== list.version) throw new Error("Unavailable transition check");
      return { state, check: report.application_check };
    },
  });
  const data = query.isError ? undefined : query.data;
  const active = data?.state.active_price;
  const replaced = !!active && active.version >= list.version;
  const eligible = !!data && !query.isFetching && !replaced && list.status === "CONFIRMED" &&
    data.check.status !== "BLOCKED" && data.check.blockers.length === 0;
  const valid = eligible && accepted && reason.trim().length > 0 && reason.trim().length <= 1000;

  async function submit() {
    if (submitting.current || !valid || locked || result || !data) return;
    submitting.current = true; setBusy(true); setError("");
    try {
      const receipt = await priceRequest<EffectivePriceVersion>(`${PRICE_API}/${list.id}/activate`, {
        request_id: crypto.randomUUID(), expected_active_price_list_id: active?.price_list_id ?? null,
        reason: reason.trim(), reviewed_transition: true,
      });
      setResult(receipt); onChanged();
    } catch (cause) {
      const status = priceErrorStatus(cause);
      setError(isUncertainPriceWrite(cause) ? t.unknown : status === 403 ? t.denied : status === 409 ? t.conflict : t.failed);
      // No automatic retry of a financial transition, including a lost response.
      setLocked(true); onChanged();
    } finally { submitting.current = false; setBusy(false); }
  }

  return <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
    <DialogContent dir={dir} className="max-h-[90dvh] w-[calc(100vw_-_2rem)] max-w-xl overflow-y-auto p-4 sm:p-6">
      <DialogTitle className="pe-6">{result ? t.success : t.title}</DialogTitle>
      <DialogDescription>{t.candidate}: {list.version} · {list.agreement_reference}</DialogDescription>
      {result ? <>
        <p role="status" className="text-sm text-status-ok-fg">{t.effective}: {formatLocaleDateTime(result.effective_from, locale)}</p>
        <p className="break-words text-sm">{result.reason}</p>
        <Button variant="outline" onClick={onClose}>{t.close}</Button>
      </> : <form className="min-w-0 space-y-4" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
        {query.isFetching && <p role="status" className="text-sm">{t.loading}</p>}
        {query.isError && <p role="alert" className="text-sm text-status-problem-fg">{priceErrorStatus(query.error) === 403 ? t.denied : t.error}</p>}
        {data && <>
          <p className="text-sm"><span className="text-text-secondary">{t.current}: </span>{active ? `v${active.version}` : t.legacy}</p>
          {replaced ? <p role="alert" className="text-sm text-status-warning-fg">{t.already}</p> : data.check.blockers.length > 0 &&
            <p role="alert" className="text-sm text-status-problem-fg">{t.blocked}</p>}
          <section aria-label={t.review} className="space-y-2 border-y border-border py-3 text-sm">
            {[...data.check.blockers, ...data.check.review].map((item) => <p key={item.code} className="break-words">{issues[`CHECK_${item.code}`]}: {item.count}</p>)}
            <p>{t.policy}</p><p className="text-text-secondary">{t.legacyPolicy}</p>
          </section>
        </>}
        <fieldset disabled={busy || locked || !eligible} className="space-y-4">
          <label className="block space-y-1 text-sm">{t.reason}<Textarea aria-label={t.reason} value={reason} maxLength={1000} required onChange={(event) => setReason(event.target.value)} /></label>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} className="mt-1 size-4 shrink-0" />{t.consent}</label>
        </fieldset>
        {error && <p role="alert" className="text-sm text-status-problem-fg">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={onClose}>{t.close}</Button>
          <Button type="button" variant="outline" size="icon" title={t.refresh} aria-label={t.refresh} disabled={busy || locked || query.isFetching}
            onClick={() => { setAccepted(false); void query.refetch(); }}><RefreshCw className="size-4" /></Button>
          <Button type="submit" disabled={busy || locked || !valid} className="h-auto min-h-10 max-w-full whitespace-normal">
            <CheckCheck className="me-2 size-4 shrink-0" />{busy ? t.saving : t.submit}
          </Button>
        </div>
      </form>}
    </DialogContent>
  </Dialog>;
}
