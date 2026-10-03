"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { PRICE_API, PRICE_PAGE_SIZE, priceErrorStatus, type PriceSummary, type ReconciliationPage } from "@/lib/factory-prices";
import { formatLocaleDateTime, formatLocaleMoney, formatLocaleNumber } from "@/lib/formatting";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { priceCopy } from "./copy";
import { reconciliationCopy } from "./reconciliation-copy";

export function PriceReconciliationDialog({ list, onClose }: { list?: PriceSummary; onClose: () => void }) {
  const { locale, dir } = useI18n();
  const t = reconciliationCopy[locale];
  const p = priceCopy[locale];
  const [offset, setOffset] = useState(0);
  const [issues, setIssues] = useState(true);
  const [kind, setKind] = useState("");
  const query = useQuery({
    queryKey: ["price-reconciliation", list?.id ?? "company", offset, issues, kind],
    queryFn: ({ signal }) => apiFetch<ReconciliationPage>(`${PRICE_API}${list ? `/${list.id}` : ""}/reconciliation?limit=${PRICE_PAGE_SIZE}&offset=${offset}&issues_only=${issues}${kind ? `&kind=${kind}` : ""}`, { signal }),
    refetchOnWindowFocus: false,
  });
  const data = !query.isError ? query.data : undefined;
  const summary = data?.summary;
  const date = (value: string) => formatLocaleDateTime(value, locale);
  const money = (value: string | null, delta = false) => value === null ? "-" : formatLocaleMoney(value, list?.currency ?? "ILS", locale,
    { minimumFractionDigits: 2, ...(delta ? { signDisplay: "always" as const } : {}) });
  const unit = (value: string | null) => value === "pcs" ? p.pcs : value === "hour" ? p.hour : value;
  const status = priceErrorStatus(query.error);
  const first = data?.items.length ? offset + 1 : 0;
  const last = data?.items.length ? offset + data.items.length : 0;

  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent dir={dir} className="flex max-h-[90dvh] w-[calc(100vw_-_2rem)] max-w-6xl flex-col overflow-hidden p-4 sm:p-6">
      <div className="min-w-0 pe-8">
        <DialogTitle>{t.title} · {list ? `${p.version} ${list.version}` : t.baseline}</DialogTitle>
        <DialogDescription>{list ? t.description : t.baselineDescription}</DialogDescription>
      </div>
      <div className="min-h-0 min-w-0 space-y-4 overflow-y-auto">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={issues} onChange={(event) => { setIssues(event.target.checked); setOffset(0); }} />{t.issues}</label>
          <label className="flex min-w-0 items-center gap-2 text-sm">{t.filter}
            <select className="max-w-full rounded-md border border-border bg-surface px-2 py-1.5" value={kind} onChange={(event) => { setKind(event.target.value); setOffset(0); }}>
              <option value="">{t.all}</option><option value="DOOR">{t.installation}</option><option value="ADDON">{t.addon}</option>
            </select>
          </label>
          <Button size="icon" variant="outline" title={t.refresh} aria-label={t.refresh} disabled={query.isFetching} onClick={() => { void query.refetch(); }}>
            <RefreshCw className={cn("size-4", query.isFetching && "animate-spin motion-reduce:animate-none")} />
          </Button>
        </div>
        {query.isPending && <p role="status" className="text-sm">{t.loading}</p>}
        {query.isError && <p role="alert" className="text-sm text-status-problem-fg">{status === 403 ? t.denied : status === 404 ? t.unavailableVersion : t.error}</p>}
        {data && summary && <>
          <div className="flex flex-wrap justify-between gap-2 text-xs text-text-secondary"><p>{t.companyTotals}</p><p>{t.checked}: {date(data.generated_at)}</p></div>
          {list && <section aria-label={t.checkTitle} className="space-y-2 border-s-4 border-border ps-3 text-sm">
            <h3 className="font-semibold">{t.checkTitle}</h3>
            {data.application_check ? <>
              <p className={data.application_check.status === "VERIFIED" ? "text-status-ok-fg" : "text-status-warning-fg"}>
                {data.application_check.status === "BLOCKED" ? t.checkBlocked : data.application_check.status === "REVIEW_REQUIRED" ? t.checkReview : t.checkVerified}
              </p>
              {[...data.application_check.blockers, ...data.application_check.review].length > 0 && <ul className="space-y-1 text-xs text-text-secondary">
                {[...data.application_check.blockers, ...data.application_check.review].map((issue) => <li key={issue.code}>{t[`CHECK_${issue.code}`]}: {issue.count}</li>)}
              </ul>}
              <p className="text-xs text-text-secondary">{t.checkNotApplied}</p>
            </> : <p role="alert" className="text-status-warning-fg">{t.checkUnavailable}</p>}
          </section>}
          <dl className="grid grid-cols-2 gap-3 border-y border-border py-3 sm:grid-cols-4">
            {[[t.sources, summary.total_sources], [t.review, summary.review_sources], [list ? t.missing : t.MISSING_PROPOSED, summary.missing_proposed], [t.pending, summary.pending_addon_facts]].map(([label, value]) =>
              <div key={label} className="min-w-0"><dt className="text-xs text-text-secondary">{label}</dt><dd className="mt-1 text-lg font-semibold tabular-nums">{value}</dd></div>)}
          </dl>
          <div className="space-y-1 text-xs text-text-secondary">
            <p className={summary.multiple_rate_types > 0 ? "text-status-warning-fg" : undefined}>{t.multipleRates}: {summary.multiple_rate_types}</p>
            <p>{t.snapshot}: {summary.door_snapshots} · {t.surcharge}: {summary.door_surcharges} · {t.catalogChanged}: {summary.catalog_changes}</p>
            <p>{t.SCHEDULED_RATE}: {summary.scheduled_rates} · {t.urgency}: {summary.urgency_surcharges} · {t.historical}: {summary.historical_entries}</p>
            <p>{t.defaultNote}</p>
            {summary.scheduled_rates > 0 && <p>{t.futureNote}</p>}
            {summary.pending_addon_facts > 0 && <p className="text-status-warning-fg">{t.unpaidNote}</p>}
          </div>
          {data.items.length === 0 ? <p className="py-3 text-sm text-text-secondary">{t.empty}</p> : <div className="max-w-full overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[850px] table-fixed text-xs"><thead className="bg-surface-sunken text-text-secondary"><tr>
              <th className="w-44 p-3 text-start font-medium">{t.work}</th><th className="w-56 p-3 text-start font-medium">{t.source}</th>
              <th className="w-32 p-3 text-end font-medium">{t.current}</th><th className="w-32 p-3 text-end font-medium">{list ? t.proposed : p.price}</th>
              <th className="w-32 p-3 text-end font-medium">{t.delta}</th><th className="w-40 p-3 text-start font-medium">{t.status}</th>
            </tr></thead><tbody>{data.items.map((row) => <tr key={`${row.source_type}:${row.source_id}`} className="border-t border-border">
              <td className="break-words p-3 align-top"><p className="font-medium text-text">{row.name}</p><p className="mt-1 text-text-secondary">{p[row.kind]} · {unit(row.unit)}</p>
                {row.catalog_changed && row.proposed_name && <p className="mt-1 text-text-secondary">{t.catalogVersion}: {row.proposed_name} · {unit(row.proposed_unit)}</p>}
              </td>
              <td className="break-words p-3 align-top"><p className="font-medium">{t[row.source_type]}</p>
                {row.source_name && <p className="mt-1">{row.source_name}</p>}
                {row.project_name && row.project_name !== row.source_name && <p>{row.project_name}</p>}
                {row.installer_name && row.installer_name !== row.source_name && <p>{row.installer_name}</p>}
                {row.quantity && <p>{t.quantity}: {formatLocaleNumber(row.quantity, locale)}</p>}
                {row.effective_from && <p className="mt-1 text-text-secondary">{t.asOf}: {date(row.effective_from)}</p>}
              </td>
              <td className="break-words p-3 text-end align-top tabular-nums">{money(row.legacy_price)}</td>
              <td className="break-words p-3 text-end align-top font-medium tabular-nums">{money(row.proposed_price)}</td>
              <td className="break-words p-3 text-end align-top tabular-nums">{money(row.delta, true)}</td>
              <td className="break-words p-3 align-top"><p className={row.status === "MATCH" ? "text-status-ok-fg" : "text-status-warning-fg"}>{t[row.status]}</p>
                <div className="mt-1 space-y-1 text-text-secondary">
                  {row.uses_snapshot && <p>{t.snapshot}</p>}{row.uses_surcharge && <p>{t.surcharge}</p>}
                  {row.catalog_changed && <p>{t.catalogChanged}</p>}{!row.source_available && <p>{t.missingParent}</p>}
                  {row.status === "UNIT_CHANGED" && <p>{t.unitsChanged}</p>}
                  {row.legacy_variants > 1 && ["INSTALLER_RATE", "DOOR", "ADDON_PLAN"].includes(row.source_type) && <p className="text-status-warning-fg">{t.variants}: {row.legacy_variants}</p>}
                </div>
              </td>
            </tr>)}</tbody></table>
          </div>}
        </>}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <Button variant="outline" onClick={onClose}>{t.close}</Button>
        {data && <div className="flex items-center gap-2 text-xs text-text-secondary"><span>{first}-{last} / {data.total}</span>
          <Button variant="outline" size="icon" title={t.previous} aria-label={t.previous} disabled={!offset || query.isFetching} onClick={() => setOffset(Math.max(0, offset - PRICE_PAGE_SIZE))}><ChevronLeft className="size-4 rtl:rotate-180" /></Button>
          <Button variant="outline" size="icon" title={t.next} aria-label={t.next} disabled={offset + PRICE_PAGE_SIZE >= data.total || query.isFetching} onClick={() => setOffset(offset + PRICE_PAGE_SIZE)}><ChevronRight className="size-4 rtl:rotate-180" /></Button>
        </div>}
      </div>
    </DialogContent>
  </Dialog>;
}
