"use client";

import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, CheckCheck, ChevronLeft, ChevronRight, FileCheck2, GitCompareArrows, Link2, Plus, RefreshCw } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { DimaxPageHeader } from "@/components/DimaxPageHeader";
import { Button } from "@/components/ui/button";
import { PriceListEditor } from "@/components/prices/PriceListEditor";
import { PriceActionDialog, type PriceAction } from "@/components/prices/PriceActionDialog";
import { FactoryContactPanel } from "@/components/prices/FactoryContactPanel";
import { PriceReconciliationDialog } from "@/components/prices/PriceReconciliationDialog";
import { PriceActivationDialog } from "@/components/prices/PriceActivationDialog";
import { activationCopy } from "@/components/prices/activation-copy";
import { reconciliationCopy } from "@/components/prices/reconciliation-copy";
import { priceCopy, type PriceCopy } from "@/components/prices/copy";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useCompanyPricingState } from "@/hooks/use-company-pricing-state";
import { CompanyPriceStatus } from "@/components/prices/CompanyPriceStatus";
import { apiFetch } from "@/lib/api";
import { canAccessAdminModule, canRunPrivilegedAdminActions } from "@/lib/admin-access";
import { onAuthChanged } from "@/lib/auth-session";
import { useI18n } from "@/lib/i18n";
import { formatLocaleDateTime, formatLocaleMoney } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import { PRICE_API, PRICE_PAGE_SIZE, invitationStatus, type FactoryContact, type PriceDetail, type PricePage, type InvitationPage } from "@/lib/factory-prices";

function Badge({ status, t }: { status: "DRAFT" | "CONFIRMED" | "CANCELLED" | "REVOKED" | "PENDING" | "EXPIRED" | "SUPERSEDED"; t: PriceCopy }) {
  return <span className={cn("inline-block max-w-full rounded-md border px-2 py-1 text-xs leading-4",
    status === "CONFIRMED" ? "border-status-ok-border bg-status-ok-bg text-status-ok-fg" :
      status === "DRAFT" || status === "PENDING" ? "border-status-warning-border bg-status-warning-bg text-status-warning-fg" : "border-border bg-surface-sunken text-text-secondary",
  )}>{t[status]}</span>;
}

function Pager({ offset, total, onChange, t }: { offset: number; total: number; onChange: (value: number) => void; t: PriceCopy }) {
  return <div className="flex items-center justify-end gap-2 py-3 text-xs text-text-secondary">
    <span>{total ? offset + 1 : 0}-{Math.min(offset + PRICE_PAGE_SIZE, total)} / {total}</span>
    <Button variant="outline" size="icon" title={t.previous} aria-label={t.previous} disabled={!offset} onClick={() => onChange(Math.max(0, offset - PRICE_PAGE_SIZE))}><ChevronLeft className="size-4 rtl:rotate-180" /></Button>
    <Button variant="outline" size="icon" title={t.next} aria-label={t.next} disabled={offset + PRICE_PAGE_SIZE >= total} onClick={() => onChange(offset + PRICE_PAGE_SIZE)}><ChevronRight className="size-4 rtl:rotate-180" /></Button>
  </div>;
}

function PriceWorkspace({ writable, owner }: { writable: boolean; owner: boolean }) {
  const { locale, dir } = useI18n();
  const t = priceCopy[locale];
  const client = useQueryClient();
  const pricing = useCompanyPricingState();
  const contact = useQuery({ queryKey: ["factory-contact"], queryFn: ({ signal }) => apiFetch<FactoryContact | null>(`${PRICE_API}/factory/contact`, { signal }) });
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ base?: PriceDetail; latest: number } | null>(null);
  const [action, setAction] = useState<(PriceAction & { contact?: FactoryContact }) | null>(null);
  const [activation, setActivation] = useState<PriceDetail | null>(null);
  const [reconciliation, setReconciliation] = useState<{ list?: PriceDetail } | null>(null);
  const [historyOffset, setHistoryOffset] = useState(0);
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(timer); }, []);
  const lists = useQuery({ queryKey: ["price-lists", offset], queryFn: ({ signal }) => apiFetch<PricePage>(`${PRICE_API}?limit=${PRICE_PAGE_SIZE}&offset=${offset}`, { signal }) });
  const selectedId = selected ?? (offset === 0 ? pricing.state?.active_price?.price_list_id : undefined) ?? lists.data?.items[0]?.id;
  const detail = useQuery({ queryKey: ["price-detail", selectedId], enabled: !!selectedId, queryFn: ({ signal }) => apiFetch<PriceDetail>(`${PRICE_API}/${selectedId}`, { signal }) });
  const history = useQuery({ queryKey: ["price-history", selectedId, historyOffset], enabled: !!selectedId,
    queryFn: ({ signal }) => apiFetch<InvitationPage>(`${PRICE_API}/${selectedId}/approvals?limit=${PRICE_PAGE_SIZE}&offset=${historyOffset}`, { signal }),
    refetchInterval: 30_000,
  });
  const latest = lists.data?.latest_version ?? 0;
  const row = detail.data;
  const fresh = !!lists.data && !lists.isError && !detail.isError && !lists.isFetching && !detail.isFetching;
  const refresh = () => { void client.invalidateQueries(); };
  // A decision may arrive while an administrator has the version open.
  useEffect(() => {
    if (history.data?.items.some((item) => item.confirmed_at) && row?.status === "DRAFT") {
      void client.invalidateQueries({ queryKey: ["price-detail", selectedId] });
      void client.invalidateQueries({ queryKey: ["price-lists"] });
    }
  }, [history.data, row?.status, client, selectedId]);
  const date = (value: string | null) => value ? formatLocaleDateTime(value, locale) : "-";
  const problem = lists.isError || detail.isError;

  return <div dir={dir} className="min-w-0 space-y-5 p-4 sm:p-6">
    <DimaxPageHeader eyebrow={t.scope} title={t.title} badge={!writable ? t.readonly : undefined} actions={<>
      <Button size="icon" variant="outline" title={t.refresh} aria-label={t.refresh} onClick={refresh} disabled={lists.isFetching}><RefreshCw className={cn("size-4", lists.isFetching && "animate-spin motion-reduce:animate-none")} /></Button>
      <Button variant="outline" onClick={() => setReconciliation({ list: row })} disabled={!fresh || (!!selectedId && !row)}><GitCompareArrows className="me-2 size-4" />{reconciliationCopy[locale].open}</Button>
      {writable && <Button onClick={() => setEditor({ base: row, latest })} disabled={!fresh || (!!selectedId && !row)}><Plus className="me-2 size-4" />{t.newVersion}</Button>}
    </>} />
    <CompanyPriceStatus {...pricing} onOpen={(id) => { setSelected(id); setHistoryOffset(0); }} />
    <FactoryContactPanel contact={contact.data} owner={owner} pending={contact.isPending} error={contact.isError} onChanged={refresh} />
    {lists.isPending && <p role="status" className="text-sm">{t.loading}</p>}
    {problem && <div role="alert" className="text-sm text-status-problem-fg">{t.error}</div>}
    {lists.data && !lists.isError && <div className="grid min-w-0 gap-6 xl:grid-cols-[15rem_minmax(0,1fr)]">
      <section aria-label={t.versions} className="min-w-0">
        <h2 className="mb-3 text-base font-semibold">{t.versions}</h2>
        {lists.data.items.length === 0 && <p className="py-5 text-sm text-text-secondary">{t.empty}</p>}
        <div className="divide-y divide-border border-y border-border">
          {lists.data.items.map((item) => <button key={item.id} type="button" aria-pressed={selectedId === item.id} onClick={() => { setSelected(item.id); setHistoryOffset(0); }}
            className={cn("flex w-full min-w-0 flex-col gap-2 border-s-2 px-3 py-3 text-start transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent", selectedId === item.id ? "border-s-accent bg-surface" : "border-s-transparent hover:bg-surface-sunken")}>
            <span className="flex w-full items-center justify-between gap-2 text-sm font-semibold"><span>{t.version} {item.version}</span><FileCheck2 className="size-4 shrink-0 text-text-secondary" /></span>
            <Badge status={item.status} t={t} /><span className="break-words text-xs text-text-secondary">{date(item.created_at)}</span>
          </button>)}
        </div>
        <Pager offset={offset} total={lists.data.total} t={t} onChange={(value) => { setOffset(value); setSelected(null); setHistoryOffset(0); }} />
      </section>
      <section className="min-w-0 space-y-5" aria-label={t.work}>
        {selectedId && detail.isPending && <p role="status">{t.loading}</p>}
        {row && !detail.isError && <>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
            <div className="flex flex-wrap items-center gap-3"><h2 className="text-lg font-semibold">{t.version} {row.version}</h2><Badge status={row.status} t={t} />
              {pricing.state && <span className="text-xs text-text-secondary">{pricing.state.active_price?.price_list_id === row.id
                ? locale === "ru" ? "Действующая версия" : locale === "he" ? "הגרסה בתוקף" : "Currently effective"
                : locale === "ru" ? "Не действует сейчас" : locale === "he" ? "אינה בתוקף כעת" : "Not currently effective"}</span>}
            </div>
            {writable && row.status === "DRAFT" && <div className="flex flex-wrap gap-2">
              {row.version === latest && <Button variant="outline" onClick={() => setAction({ kind: "invite", list: row, contact: contact.data ?? undefined })} disabled={!fresh || !contact.data || contact.isError || contact.isFetching}><Link2 className="me-2 size-4" />{t.invite}</Button>}
              <Button variant="outline" onClick={() => setAction({ kind: "cancel", list: row })} disabled={!fresh}><Ban className="me-2 size-4" />{t.cancel}</Button>
            </div>}
            {writable && row.status === "CONFIRMED" && pricing.state &&
              (!pricing.state.active_price || pricing.state.active_price.version < row.version) &&
              <Button disabled={!fresh || pricing.loading || pricing.error} onClick={() => setActivation(row)} className="h-auto min-h-10 max-w-full whitespace-normal">
                <CheckCheck className="me-2 size-4 shrink-0" />{activationCopy[locale].open}
              </Button>}
          </div>
          <dl className="grid min-w-0 gap-4 text-sm sm:grid-cols-2">
            {[[t.reason, row.reason], [t.agreement, row.agreement_reference], [t.created, date(row.created_at)], ...(row.cancellation_reason ? [[t.cancelReason, row.cancellation_reason]] : [])].map(([label, value]) =>
              <div key={label} className="min-w-0"><dt className="text-text-secondary">{label}</dt><dd className="mt-1 break-words">{value}</dd></div>)}
          </dl>
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full table-fixed text-sm"><thead className="bg-surface-sunken text-text-secondary"><tr>
              <th className="p-3 text-start font-medium">{t.work}</th><th className="w-12 p-2 text-start font-medium sm:w-20">{t.unit}</th><th className="w-28 p-3 text-end font-medium sm:w-44">{t.price}</th>
            </tr></thead><tbody>{row.items.map((item) => <tr key={`${item.kind}:${item.target_id}`} className="border-t border-border">
              <td className="break-words p-3"><span className="font-medium">{item.name}</span><span className="mt-1 block text-xs text-text-secondary">{t[item.kind]}</span></td>
              <td className="break-words p-2 text-xs text-text-secondary">{item.unit === "pcs" ? t.pcs : item.unit === "hour" ? t.hour : item.unit}</td>
              <td className="break-words p-3 text-end text-xs font-semibold tabular-nums sm:text-sm">{formatLocaleMoney(item.installer_price, row.currency, locale, { minimumFractionDigits: 2 })}</td>
            </tr>)}</tbody></table>
          </div>
          <section aria-label={t.history} className="min-w-0 border-t border-border pt-5">
            <h3 className="text-base font-semibold">{t.history}</h3>
            {history.isPending && <p role="status">{t.loading}</p>}
            {history.isError ? <p role="alert" className="mt-3 text-sm text-status-problem-fg">{t.error}</p> : <div className="divide-y divide-border">
              {history.data?.items.length === 0 && <p className="py-4 text-sm text-text-secondary">{t.noInvites}</p>}
              {history.data?.items.map((item) => <div key={item.id} className="grid min-w-0 gap-3 py-4 text-sm sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                <div className="min-w-0"><p className="break-words font-medium">{item.factory_name}</p><p className="break-words">{item.recipient_name}</p><p className="break-all text-xs text-text-secondary" dir="ltr">{item.recipient_email}</p></div>
                <div className="min-w-0 space-y-2"><Badge status={invitationStatus(item, row, latest, now)} t={t} />
                  <p className="break-words text-xs text-text-secondary">{t.created}: {date(item.created_at)}<br />{t.expires}: {date(item.expires_at)}</p>
                  {(item.confirmed_name || item.revocation_reason) && <p className="break-words text-xs">{t.record}: {item.confirmed_name || item.revocation_reason}<br />{date(item.confirmed_at || item.revoked_at)}</p>}
                  {item.confirmed_at && <p className="break-words text-xs text-text-secondary">{item.mailbox_verified_at ? t.mailboxVerified : t.mailboxLegacy}</p>}
                </div>
                {writable && !item.revoked_at && !item.confirmed_at && row.status === "DRAFT" && <Button variant="outline" size="icon" aria-label={`${t.revoke}: ${item.recipient_name}`} title={t.revoke} onClick={() => setAction({ kind: "revoke", list: row, invitation: item })}><Ban className="size-4" /></Button>}
              </div>)}
            </div>}
            {history.data && <Pager offset={historyOffset} total={history.data.total} onChange={setHistoryOffset} t={t} />}
          </section>
        </>}
      </section>
    </div>}
    {editor && <PriceListEditor {...editor} onClose={() => { setEditor(null); refresh(); }} onSaved={(saved) => {
      setEditor(null); setOffset(0); setSelected(saved.id); setHistoryOffset(0); refresh();
    }} />}
    {action && <PriceActionDialog action={action} contact={action.contact} onClose={() => setAction(null)} onChanged={refresh} />}
    {activation && <PriceActivationDialog list={activation} onClose={() => { setActivation(null); refresh(); }} onChanged={refresh} />}
    {reconciliation && <PriceReconciliationDialog list={reconciliation.list} onClose={() => setReconciliation(null)} />}
  </div>;
}

function PriceSession({ writable, owner }: { writable: boolean; owner: boolean }) {
  // Financial responses live only for this mounted authenticated workspace.
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } }));
  useEffect(() => () => { client.clear(); }, [client]);
  return <QueryClientProvider client={client}><PriceWorkspace writable={writable} owner={owner} /></QueryClientProvider>;
}

export default function PriceListsPage() {
  const session = useAuthSession();
  const { locale } = useI18n();
  const [epoch, setEpoch] = useState(0);
  useEffect(() => onAuthChanged(() => setEpoch((value) => value + 1)), []);
  return <DashboardLayout>{canAccessAdminModule(session, "price-lists") ?
    <PriceSession key={epoch} writable={canRunPrivilegedAdminActions(session)} owner={session?.admin_scope === "OWNER"} /> :
    <p role="status" className="p-6 text-sm">{priceCopy[locale].denied}</p>}
  </DashboardLayout>;
}
