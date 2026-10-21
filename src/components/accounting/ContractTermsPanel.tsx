import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { apiFetch } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { formatLocaleDateTime } from "@/lib/formatting";
import { priceErrorStatus } from "@/lib/factory-prices";
import { COMMERCIAL_PAGE_SIZE, type CommercialContract } from "@/lib/commercial-prices";
import { contractTermsPath, termsDetailSchema, termsPageSchema, type ContractTerms } from "@/lib/contract-terms";
import { commercialCopy } from "./copy";
import { termsCopy } from "./terms-copy";
import { ContractTermsEditor } from "./ContractTermsEditor";

export function ContractTermsPanel({ contract }: { contract: CommercialContract }) {
  const { locale } = useI18n();
  const t = termsCopy[locale]; const common = commercialCopy[locale];
  const client = useQueryClient();
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ base?: ContractTerms; latest: number } | null>(null);
  const path = contractTermsPath(contract.id);
  const versions = useQuery({ queryKey: ["contract-terms", contract.id, offset],
    queryFn: ({ signal }) => apiFetch(path + "?limit=" + COMMERCIAL_PAGE_SIZE + "&offset=" + offset, { signal }, { schema: termsPageSchema }) });
  const id = selected ?? versions.data?.items[0]?.id;
  const detail = useQuery({ queryKey: ["contract-terms-detail", contract.id, id], enabled: !!id,
    queryFn: ({ signal }) => apiFetch(path + "/" + id, { signal }, { schema: termsDetailSchema }) });
  const error = versions.error ?? detail.error;
  const row = !error ? detail.data : undefined;
  const fresh = !!versions.data && !error && !versions.isFetching && !detail.isFetching && (!id || !!row);
  function refresh() {
    void client.invalidateQueries({ queryKey: ["contract-terms", contract.id] });
    void client.invalidateQueries({ queryKey: ["contract-terms-detail", contract.id] });
  }
  function values(items: [string, string | null][]) {
    return <dl className="grid min-w-0 gap-4 sm:grid-cols-2">{items.map(([label, value]) =>
      <div key={label} className="min-w-0"><dt className="text-xs text-text-secondary">{label}</dt>
        <dd className="mt-1 whitespace-pre-wrap break-words text-sm [overflow-wrap:anywhere]"><bdi>{value || t.noEnd}</bdi></dd></div>)}</dl>;
  }
  return <section aria-label={t.tab} className="min-w-0 space-y-4">
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
      <div className="min-w-0 space-y-2"><h2 className="break-words text-lg font-semibold">{contract.factory_name}</h2>
        <p className="break-words font-mono text-xs text-text-secondary"><bdi>{contract.reference}</bdi></p>
        <StatusBadge status="DRAFT" label={common.draft} />{contract.is_demo && <span className="ms-2 text-xs text-text-secondary">{common.demo}</span>}
      </div>
      <Button disabled={!fresh} onClick={() => setEditor({ base: row, latest: versions.data!.latest_version })}
        className="h-auto min-h-10 max-w-full whitespace-normal"><Plus className="me-2 size-4 shrink-0" />{t.newVersion}</Button>
    </div>
    <p className="border-s-2 border-accent bg-surface-sunken p-3 text-sm">{contract.is_demo ? common.demoNotice : t.draft}</p>
    <p className="text-xs text-text-secondary">{t.money}</p>
    {versions.isPending && <p role="status" className="text-sm">{common.loading}</p>}
    {error && <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-status-problem-fg">
      <span>{[401, 403].includes(priceErrorStatus(error)) ? common.denied : common.serviceUnavailable}</span>
      <Button size="icon" variant="outline" aria-label={common.refresh} title={common.refresh} onClick={refresh}><RefreshCw className="size-4" /></Button>
    </div>}
    {versions.data && !versions.isError && <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex min-w-0 flex-wrap items-center gap-2 text-sm font-medium">{t.history}
          <select aria-label={t.history} disabled={!versions.data.items.length} value={id ?? ""} onChange={(event) => setSelected(event.target.value)}
            className="h-10 min-w-0 max-w-full rounded-md border border-border bg-surface px-2 text-sm">
            {!versions.data.items.length && <option value="">{t.empty}</option>}
            {versions.data.items.map((item) => <option key={item.id} value={item.id}>{common.version} {item.version} · {common.draft}</option>)}
          </select>
        </label>
        <div className="flex items-center gap-2 text-xs text-text-secondary"><span dir="ltr">{versions.data.total ? offset + 1 : 0}-{Math.min(offset + COMMERCIAL_PAGE_SIZE, versions.data.total)} / {versions.data.total}</span>
          <Button variant="outline" size="icon" title={common.previous} aria-label={common.previous} disabled={!offset || versions.isFetching}
            onClick={() => { setOffset(Math.max(0, offset - COMMERCIAL_PAGE_SIZE)); setSelected(null); }}><ChevronLeft className="size-4 rtl:rotate-180" /></Button>
          <Button variant="outline" size="icon" title={common.next} aria-label={common.next} disabled={offset + COMMERCIAL_PAGE_SIZE >= versions.data.total || versions.isFetching}
            onClick={() => { setOffset(offset + COMMERCIAL_PAGE_SIZE); setSelected(null); }}><ChevronRight className="size-4 rtl:rotate-180" /></Button>
        </div>
      </div>
      {id && detail.isPending && <p role="status" className="text-sm">{common.loading}</p>}
      {row && <>
        {values([[t.author, row.created_by_name], [t.created, formatLocaleDateTime(row.created_at, locale)],
          [t.reason, row.reason], [t.agreement_reference, row.agreement_reference]])}
        <h3 className="border-t border-border pt-4 text-sm font-semibold">{t.factory}</h3>
        {values([[t.factory_legal_name, row.factory_legal_name], [t.registration_number, row.registration_number], [t.address, row.address]])}
        <h3 className="border-t border-border pt-4 text-sm font-semibold">{t.contact}</h3>
        {values([[t.contact_name, row.contact_name], [t.contact_email, row.contact_email], [t.contact_phone, row.contact_phone]])}
        <p className="text-xs text-text-secondary">{t.contactNotice}</p>
        <h3 className="border-t border-border pt-4 text-sm font-semibold">{t.conditions}</h3>
        {values([[t.proposed_from, row.proposed_from], [t.proposed_until, row.proposed_until], [t.billing_basis, t[row.billing_basis]]])}
        <p className="text-xs text-text-secondary">{t.period}</p>
        {values([[t.payment_terms, row.payment_terms], [t.retention_terms, row.retention_terms]])}
        <p className="text-xs text-text-secondary">{t.termsNotice}</p>
        <p className="text-xs text-text-secondary">{t.draft}</p>
      </>}
    </>}
    {editor && <ContractTermsEditor contract={contract} {...editor} onClose={() => { setEditor(null); refresh(); }}
      onSaved={(saved) => {
        client.setQueryData(["contract-terms-detail", contract.id, saved.id], saved);
        setEditor(null); setOffset(0); setSelected(saved.id); refresh();
      }} />}
  </section>;
}
