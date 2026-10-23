import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { formatLocaleMoney } from "@/lib/formatting";
import { periodDetailSchema, periodPageSchema, periodsPath } from "@/lib/commercial-agreements";
import type { CommercialContract } from "@/lib/commercial-prices";
import { priceErrorStatus } from "@/lib/factory-prices";
import { agreementCopy } from "./agreement-copy";

/** Read-only period estimate: signed journal lines valued at the pair in effect. OWNER only, nothing is claimed. */
export function ContractPeriodsPanel({ contract }: { contract: CommercialContract }) {
  const { locale } = useI18n(), t = agreementCopy[locale];
  const [selected, setSelected] = useState<string | null>(null);
  const periods = useQuery({ queryKey: ["commercial-periods", contract.id],
    queryFn: ({ signal }) => apiFetch(periodsPath(contract.id), { signal }, { schema: periodPageSchema }) });
  const detail = useQuery({ queryKey: ["commercial-period", contract.id, selected], enabled: !!selected,
    queryFn: ({ signal }) => apiFetch(periodsPath(contract.id) + "/" + selected, { signal }, { schema: periodDetailSchema }) });
  const money = (value: string) => formatLocaleMoney(value, "ILS", locale, { minimumFractionDigits: 2 });
  if (periods.isError && priceErrorStatus(periods.error) === 409) {
    return <p role="status" className="py-4 text-sm text-text-secondary">{t.disabled}</p>;
  }
  return <section aria-label={t.periods} className="min-w-0 space-y-4">
    <div className="border-b border-border pb-3"><h2 className="text-base font-semibold">{t.periodsTitle}</h2>
      <p className="mt-1 text-sm text-text-secondary">{t.estimate}</p>
      <p className="text-xs text-text-secondary">{t.vatNote}</p></div>
    {periods.isPending && <p role="status" className="text-sm">{t.load}</p>}
    {periods.isError && <p role="alert" className="text-sm text-status-problem-fg">{t.error}</p>}
    {periods.data && !selected && <>
      {!periods.data.items.length && <p className="py-4 text-sm text-text-secondary">{t.emptyPeriods}</p>}
      {periods.data.undated_lines > 0 && <p className="text-xs text-text-secondary">{t.undated}: {periods.data.undated_lines}</p>}
      {periods.data.items.length > 0 && <div className="overflow-x-auto border-y border-border">
        <table className="w-full text-sm"><caption className="sr-only">{t.periodsTitle}</caption>
          <thead className="bg-surface-sunken text-xs text-text-secondary"><tr>
            <th scope="col" className="p-3 text-start font-medium">{t.period}</th>
            <th scope="col" className="p-3 text-end font-medium">{t.signed}</th>
            <th scope="col" className="p-3 text-end font-medium">{t.rated}</th>
            <th scope="col" className="p-3 text-end font-medium">{t.unrated}</th>
            <th scope="col" className="p-3 text-end font-medium">{t.amount}</th>
          </tr></thead>
          <tbody>{periods.data.items.map((row) => <tr key={row.start} className="border-t border-border">
            <td className="p-3"><button type="button" className="font-mono text-xs underline" onClick={() => setSelected(row.start)}>
              <bdi>{row.start} – {row.end}</bdi></button>
              {row.blocked_reason && <span role="status" className="mt-1 block text-xs text-status-problem-fg">{t.blocked}</span>}</td>
            <td className="p-3 text-end tabular-nums">{row.signed_journals}</td>
            <td className="p-3 text-end tabular-nums">{row.rated_lines}</td>
            <td className="p-3 text-end tabular-nums">{row.unrated_lines}</td>
            <td className="p-3 text-end font-mono font-semibold tabular-nums">{money(row.amount_ex_vat)}</td>
          </tr>)}</tbody>
        </table>
      </div>}
    </>}
    {selected && <div className="space-y-3">
      <Button variant="outline" size="sm" onClick={() => setSelected(null)}><ChevronLeft className="me-2 size-4 rtl:rotate-180" />{t.back}</Button>
      {detail.isPending && <p role="status" className="text-sm">{t.load}</p>}
      {detail.isError && <p role="alert" className="text-sm text-status-problem-fg">{t.error}</p>}
      {detail.data && <>
        <h3 className="font-semibold"><bdi>{detail.data.start} – {detail.data.end}</bdi> · {t.amount}: {money(detail.data.amount_ex_vat)}</h3>
        {detail.data.blocked_reason && <p role="status" className="text-sm text-status-problem-fg">{t.blocked}</p>}
        <div className="overflow-x-auto border-y border-border">
          <table className="w-full text-sm"><caption className="sr-only">{t.lines}</caption>
            <thead className="bg-surface-sunken text-xs text-text-secondary"><tr>
              <th scope="col" className="p-2 text-start font-medium">{t.project}</th>
              <th scope="col" className="p-2 text-start font-medium">{t.work}</th>
              <th scope="col" className="p-2 text-start font-medium">{t.date}</th>
              <th scope="col" className="p-2 text-end font-medium">{t.quantity}</th>
              <th scope="col" className="p-2 text-end font-medium">{t.rate}</th>
              <th scope="col" className="p-2 text-end font-medium">{t.amount}</th>
            </tr></thead>
            <tbody>{detail.data.lines.map((line, index) => <tr key={line.journal_id + index} className="border-t border-border">
              <td className="break-words p-2">{line.project_name}</td>
              <td className="break-words p-2"><span className="font-medium"><bdi>{line.label}</bdi></span>
                <span className="block text-xs text-text-secondary">{t[line.kind]}{line.reason !== "RATED" && <> · {t[line.reason]}</>}</span></td>
              <td className="p-2 font-mono text-xs">{line.work_date}</td>
              <td className="p-2 text-end tabular-nums">{line.quantity}{line.unit ? ` ${line.unit}` : ""}</td>
              <td className="p-2 text-end tabular-nums">{line.unit_price_ex_vat ? <>{money(line.unit_price_ex_vat)}<span className="block text-xs text-text-secondary">{t.version}{line.price_version}</span></> : "—"}</td>
              <td className="p-2 text-end font-mono tabular-nums">{line.amount_ex_vat ? money(line.amount_ex_vat) : "—"}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </>}
    </div>}
  </section>;
}
