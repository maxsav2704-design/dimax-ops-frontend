"use client";

import { useEffect, useId, useState } from "react";
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, FileText, Plus, RefreshCw } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { DimaxPageHeader } from "@/components/DimaxPageHeader";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ContractEditor } from "@/components/accounting/ContractEditor";
import { CommercialPriceEditor } from "@/components/accounting/CommercialPriceEditor";
import { ContractTermsPanel } from "@/components/accounting/ContractTermsPanel";
import { ContractApprovalsPanel } from "@/components/accounting/ContractApprovalsPanel";
import { approvalCopy } from "@/components/accounting/approval-copy";
import { termsCopy } from "@/components/accounting/terms-copy";
import { commercialCopy, type CommercialCopy } from "@/components/accounting/copy";
import { useAuthSession } from "@/hooks/use-auth-session";
import { apiFetch } from "@/lib/api";
import { canAccessAdminModule } from "@/lib/admin-access";
import { onAuthChanged } from "@/lib/auth-session";
import { useI18n } from "@/lib/i18n";
import { formatLocaleDateTime, formatLocaleMoney } from "@/lib/formatting";
import { priceErrorStatus } from "@/lib/factory-prices";
import { COMMERCIAL_API, COMMERCIAL_PAGE_SIZE, contractPageSchema, commercialPageSchema,
  commercialDetailSchema, commercialPricesPath, commercialLineKey,
  type CommercialContract, type CommercialPrice } from "@/lib/commercial-prices";
import { cn } from "@/lib/utils";

function Pager({ offset, total, busy, onChange, t }: {
  offset: number; total: number; busy: boolean; onChange: (offset: number) => void; t: CommercialCopy;
}) {
  return <div className="flex items-center justify-end gap-2 py-3 text-xs text-text-secondary">
    <span dir="ltr">{total ? offset + 1 : 0}-{Math.min(offset + COMMERCIAL_PAGE_SIZE, total)} / {total}</span>
    <Button variant="outline" size="icon" title={t.previous} aria-label={t.previous} disabled={busy || !offset}
      onClick={() => onChange(Math.max(0, offset - COMMERCIAL_PAGE_SIZE))}><ChevronLeft className="size-4 rtl:rotate-180" /></Button>
    <Button variant="outline" size="icon" title={t.next} aria-label={t.next} disabled={busy || offset + COMMERCIAL_PAGE_SIZE >= total}
      onClick={() => onChange(offset + COMMERCIAL_PAGE_SIZE)}><ChevronRight className="size-4 rtl:rotate-180" /></Button>
  </div>;
}

function DraftStatus({ demo, t }: { demo: boolean; t: CommercialCopy }) {
  return <span className="inline-flex flex-wrap gap-2 text-xs">
    <StatusBadge status="DRAFT" label={t.draft} />
    {demo && <span className="rounded-md border border-border bg-surface-sunken px-2 py-1 text-text-secondary">{t.demo}</span>}
  </span>;
}

function LoadError({ error, retry, t }: { error: unknown; retry: () => void; t: CommercialCopy }) {
  const status = priceErrorStatus(error);
  return <div role="alert" className="flex flex-wrap items-center gap-3 border-s-2 border-status-problem-border bg-status-problem-bg p-3 text-sm text-status-problem-fg">
    <span>{status === 401 || status === 403 ? t.denied : status === 404 || status >= 500 ? t.serviceUnavailable : t.error}</span>
    <Button variant="outline" size="icon" title={t.refresh} aria-label={t.refresh} onClick={retry}><RefreshCw className="size-4" /></Button>
  </div>;
}

function ContractPrices({ contract }: { contract: CommercialContract }) {
  const { locale } = useI18n();
  const t = commercialCopy[locale];
  const client = useQueryClient();
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ base?: CommercialPrice; latest: number } | null>(null);
  const path = commercialPricesPath(contract.id);
  const versions = useQuery({ queryKey: ["commercial-prices", contract.id, offset],
    queryFn: ({ signal }) => apiFetch(path + "?limit=" + COMMERCIAL_PAGE_SIZE + "&offset=" + offset, { signal }, { schema: commercialPageSchema }) });
  const selectedId = selected ?? versions.data?.items[0]?.id;
  const detail = useQuery({ queryKey: ["commercial-detail", contract.id, selectedId], enabled: !!selectedId,
    queryFn: ({ signal }) => apiFetch(path + "/" + selectedId, { signal }, { schema: commercialDetailSchema }) });
  const row = !versions.isError && !detail.isError ? detail.data : undefined;
  const fresh = !!versions.data && !versions.isError && !versions.isFetching && !detail.isFetching &&
    !detail.isError && (!selectedId || !!row);
  const refresh = () => { void client.invalidateQueries({ queryKey: ["commercial-prices", contract.id] }); void client.invalidateQueries({ queryKey: ["commercial-detail", contract.id] }); };
  return <section aria-label={t.versions} className="min-w-0 space-y-4">
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
      <div className="min-w-0 space-y-2"><h2 className="break-words text-lg font-semibold">{contract.factory_name}</h2>
        <p className="break-words text-sm text-text-secondary">{t.reference}: <bdi className="font-mono">{contract.reference}</bdi></p>
        <DraftStatus demo={contract.is_demo} t={t} />
      </div>
      <Button onClick={() => setEditor({ base: row, latest: versions.data!.latest_version })} disabled={!fresh}
        className="h-auto min-h-10 max-w-full whitespace-normal"><Plus className="me-2 size-4 shrink-0" />{t.newVersion}</Button>
    </div>
    <p className="break-words text-sm"><span className="text-text-secondary">{t.contractReason}: </span>{contract.reason}</p>
    {contract.is_demo && <p className="border-s-2 border-accent bg-surface-sunken p-3 text-sm">{t.demoNotice}</p>}
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary"><span>{t.notConfirmed}</span><span>{t.notBillable}</span><span>ILS · {t.vat}</span></div>
    {versions.isPending && <p role="status" className="text-sm">{t.loading}</p>}
    {versions.isError && <LoadError error={versions.error} retry={refresh} t={t} />}
    {versions.data && !versions.isError && <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-sm font-medium">{t.versions}
          <select aria-label={t.versions} value={selectedId ?? ""} disabled={!versions.data.items.length}
            onChange={(event) => setSelected(event.target.value)} className="h-10 min-w-0 max-w-full rounded-md border border-border bg-surface px-2 text-sm">
            {!versions.data.items.length && <option value="">{t.emptyVersions}</option>}
            {versions.data.items.map((item) => <option key={item.id} value={item.id}>{t.version} {item.version} · {t.draft}</option>)}
          </select>
        </label>
        <Pager t={t} offset={offset} total={versions.data.total} busy={versions.isFetching}
          onChange={(value) => { setOffset(value); setSelected(null); }} />
      </div>
      {selectedId && detail.isPending && <p role="status" className="text-sm">{t.loading}</p>}
      {detail.isError && <LoadError error={detail.error} retry={refresh} t={t} />}
      {row && <>
        <dl className="grid min-w-0 gap-3 text-sm sm:grid-cols-2">
          {[[t.proposed, row.proposed_from], [t.created, formatLocaleDateTime(row.created_at, locale)],
            [t.reason, row.reason], [t.agreement, row.agreement_reference]].map(([label, value]) =>
            <div key={label} className="min-w-0"><dt className="text-xs text-text-secondary">{label}</dt><dd className={cn("mt-1 break-words", (label === t.proposed || label === t.created) && "font-mono text-xs")}><bdi>{value}</bdi></dd></div>)}
        </dl>
        <div className="overflow-x-auto border-y border-border">
          <table className="w-full table-fixed text-sm"><caption className="sr-only">{t.work + " / " + t.price}</caption>
            <thead className="bg-surface-sunken text-xs text-text-secondary"><tr>
              <th scope="col" className="p-3 text-start font-medium">{t.work}</th>
              <th scope="col" className="w-14 p-2 text-start font-medium sm:w-20">{t.unit}</th>
              <th scope="col" className="w-32 p-3 text-end font-medium sm:w-44">{t.price}</th>
            </tr></thead>
            <tbody>{row.items.map((line) => <tr key={commercialLineKey(line)} className="border-t border-border">
              <td className="break-words p-3"><span className="font-medium">{line.name}</span>
                <span className="mt-1 block text-xs text-text-secondary">{t[line.kind]}{line.stage_code && <> · <bdi>{line.stage_code}</bdi></>}</span></td>
              <td className="break-words p-2 text-xs">{line.unit === "pcs" ? t.pcs : line.unit === "hour" ? t.hour : line.unit}</td>
              <td className="break-words p-3 text-end font-mono font-semibold tabular-nums">{formatLocaleMoney(line.unit_price_ex_vat, "ILS", locale, { minimumFractionDigits: 2 })}</td>
            </tr>)}</tbody>
          </table>
        </div>
        <p className="text-xs text-text-secondary">{t.alternatives}</p>
      </>}
    </>}
    {editor && <CommercialPriceEditor contract={contract} {...editor} onClose={() => { setEditor(null); refresh(); }}
      onSaved={(saved) => {
        client.setQueryData(["commercial-detail", contract.id, saved.id], saved);
        setEditor(null); setOffset(0); setSelected(saved.id); refresh();
      }} />}
  </section>;
}

function ContractWorkspace({ contract }: { contract: CommercialContract }) {
  const { locale } = useI18n();
  const t = termsCopy[locale];
  const [view, setView] = useState("prices");
  const id = useId();
  const tabs = [["prices", t.prices], ["terms", t.tab], ["approvals", approvalCopy[locale].tab]];
  return <div className="min-w-0 space-y-4">
    <div role="tablist" aria-label={contract.reference} className="flex flex-wrap gap-1 border-b border-border">
      {tabs.map(([key, label]) => <button key={key} id={id + key} type="button" role="tab"
        aria-selected={view === key} aria-controls={id + key + "-panel"} tabIndex={view === key ? 0 : -1}
        className={cn("min-h-10 max-w-full border-b-2 px-3 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent",
          view === key ? "border-accent text-text-primary" : "border-transparent text-text-secondary hover:bg-surface-sunken")}
        onClick={() => setView(key)} onKeyDown={(event) => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
          event.preventDefault();
          const index = tabs.findIndex(([value]) => value === view);
          const step = (event.key === "ArrowRight" ? 1 : -1) * (locale === "he" ? -1 : 1);
          const next = tabs[event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + step + tabs.length) % tabs.length][0];
          setView(next); document.getElementById(id + next)?.focus();
        }}>{label}</button>)}
    </div>
    {tabs.map(([key]) => <div key={key} role="tabpanel" id={id + key + "-panel"} aria-labelledby={id + key} hidden={view !== key}>
      {view === key && (key === "prices" ? <ContractPrices contract={contract} /> : key === "terms" ? <ContractTermsPanel contract={contract} /> : <ContractApprovalsPanel contract={contract} />)}
    </div>)}
  </div>;
}

function CommercialWorkspace() {
  const { locale, dir } = useI18n();
  const t = commercialCopy[locale];
  const client = useQueryClient();
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const contracts = useQuery({ queryKey: ["commercial-contracts", offset],
    queryFn: ({ signal }) => apiFetch(COMMERCIAL_API + "?limit=" + COMMERCIAL_PAGE_SIZE + "&offset=" + offset,
      { signal }, { schema: contractPageSchema }) });
  const selectedContract = contracts.data?.items.find((item) => item.id === selected) ?? contracts.data?.items[0];
  const refresh = () => { void client.invalidateQueries(); };
  return <div dir={dir} className="min-w-0 space-y-5 p-4 sm:p-6">
    <DimaxPageHeader title={t.title} eyebrow={t.scope} subtitle={t.contractDescription} badge={t.draft} actions={<>
      <Button size="icon" variant="outline" title={t.refresh} aria-label={t.refresh} onClick={refresh} disabled={contracts.isFetching}>
        <RefreshCw className={cn("size-4", contracts.isFetching && "animate-spin motion-reduce:animate-none")} /></Button>
      <Button onClick={() => setCreating(true)} disabled={!contracts.data || contracts.isError || contracts.isFetching}>
        <Plus className="me-2 size-4" />{t.newContract}</Button>
    </>} />
    {contracts.isPending && <p role="status" className="text-sm">{t.loading}</p>}
    {contracts.isError && <LoadError error={contracts.error} retry={refresh} t={t} />}
    {contracts.data && !contracts.isError && <div className="grid min-w-0 gap-6 xl:grid-cols-[15rem_minmax(0,1fr)]">
      <section aria-label={t.contracts} className="min-w-0">
        <h2 className="mb-3 text-base font-semibold">{t.contracts} <span className="text-text-secondary">({contracts.data.total})</span></h2>
        {!contracts.data.items.length && <p className="py-5 text-sm text-text-secondary">{t.emptyContracts}</p>}
        <div className="divide-y divide-border border-y border-border">
          {contracts.data.items.map((item) => <button key={item.id} type="button" aria-pressed={item.id === selectedContract?.id}
            aria-label={item.factory_name + " / " + item.reference}
            onClick={() => setSelected(item.id)} className={cn("flex w-full min-w-0 gap-3 border-s-2 p-3 text-start transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent",
              item.id === selectedContract?.id ? "border-s-accent bg-surface" : "border-s-transparent hover:bg-surface-sunken")}>
            <FileText className="mt-0.5 size-4 shrink-0 text-text-secondary" />
            <span className="min-w-0 space-y-1"><span className="block break-words text-sm font-semibold">{item.factory_name}</span>
              <span className="block break-words text-xs text-text-secondary">{item.reference}</span></span>
          </button>)}
        </div>
        <Pager t={t} offset={offset} total={contracts.data.total} busy={contracts.isFetching}
          onChange={(value) => { setOffset(value); setSelected(null); }} />
      </section>
      {selectedContract && <ContractWorkspace key={selectedContract.id} contract={selectedContract} />}
    </div>}
    {creating && <ContractEditor onClose={() => { setCreating(false); refresh(); }} onSaved={(row) => {
      setCreating(false); setOffset(0); setSelected(row.id); refresh();
    }} />}
  </div>;
}

function CommercialSession() {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } }));
  useEffect(() => () => { client.clear(); }, [client]);
  return <QueryClientProvider client={client}><CommercialWorkspace /></QueryClientProvider>;
}

export default function FactoryAccountingPage() {
  const session = useAuthSession();
  const { locale } = useI18n();
  const [epoch, setEpoch] = useState(0);
  useEffect(() => onAuthChanged(() => setEpoch((value) => value + 1)), []);
  return <DashboardLayout>{canAccessAdminModule(session, "factory-accounting") ?
    <CommercialSession key={epoch} /> : <p role="status" className="p-6 text-sm">{commercialCopy[locale].denied}</p>}
  </DashboardLayout>;
}
