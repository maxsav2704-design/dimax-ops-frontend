import { useI18n } from "@/lib/i18n";
import { formatLocaleMoney } from "@/lib/formatting";
import type { CommercialAgreement } from "@/lib/commercial-approvals";
import { commercialLineKey } from "@/lib/commercial-prices";
import { approvalCopy } from "./approval-copy";
import { termsCopy } from "./terms-copy";
import { commercialCopy } from "./copy";

export function AgreementSnapshot({ snapshot }: { snapshot: CommercialAgreement }) {
  const { locale } = useI18n();
  const t = approvalCopy[locale], terms = termsCopy[locale], prices = commercialCopy[locale];
  const row = snapshot.terms;
  const fields = ["factory_legal_name", "registration_number", "address", "contact_name", "contact_email", "contact_phone",
    "payment_terms", "retention_terms", "reason", "agreement_reference"] as const;
  return <div className="min-w-0 space-y-4">
    <div className="space-y-1 border-b border-border pb-3">
      <h2 className="break-words text-base font-semibold">{snapshot.company_name} / {snapshot.factory_name}</h2>
      <p className="break-words font-mono text-xs"><bdi>{snapshot.contract_reference}</bdi></p>
      <p className="text-sm text-text-secondary">{t.scope}</p>
    </div>
    {snapshot.is_demo && <p role="note" className="border-s-2 border-accent bg-surface-sunken p-3 text-sm">{t.demo}</p>}
    <h3 className="text-sm font-semibold">{t.terms} v{row.version} · {t.price} v{snapshot.price.version}</h3>
    <dl className="grid min-w-0 gap-3 text-sm sm:grid-cols-2">
      {fields.map((key) => <div key={key} className="min-w-0"><dt className="text-xs text-text-secondary">{terms[key]}</dt>
        <dd className="mt-1 whitespace-pre-wrap break-words"><bdi>{row[key] || terms.noEnd}</bdi></dd></div>)}
      <div><dt className="text-xs text-text-secondary">{terms.billing_basis}</dt><dd>{terms[row.billing_basis]}</dd></div>
      <div><dt className="text-xs text-text-secondary">{t.valid}</dt><dd><bdi>{row.proposed_from}</bdi> {t.until} <bdi>{row.proposed_until || terms.noEnd}</bdi></dd></div>
    </dl>
    <p className="text-xs text-text-secondary">{terms.period}</p>
    <div className="border-t border-border pt-3 text-sm"><h3 className="font-semibold">{t.price} v{snapshot.price.version}</h3>
      <p className="break-words">{prices.proposed}: <bdi>{snapshot.price.proposed_from}</bdi></p>
      <p className="break-words">{prices.reason}: {snapshot.price.reason}</p>
      <p className="break-words">{prices.agreement}: {snapshot.price.agreement_reference}</p>
    </div>
    <table className="w-full table-fixed border-y border-border text-sm">
      <caption className="sr-only">{t.price}</caption>
      <thead className="bg-surface-sunken text-xs text-text-secondary"><tr>
        <th scope="col" className="p-2 text-start">{prices.work}</th><th scope="col" className="w-16 p-2 text-start">{prices.unit}</th>
        <th scope="col" className="w-28 p-2 text-end">{prices.price}</th></tr></thead>
      <tbody>{snapshot.price.items.map((line) => <tr key={commercialLineKey(line)} className="border-t border-border">
        <td className="break-words p-2">{line.name}<span className="block text-xs text-text-secondary">{prices[line.kind]} <bdi>{line.stage_code}</bdi></span></td>
        <td className="break-words p-2 text-xs">{line.unit === "pcs" ? prices.pcs : line.unit === "hour" ? prices.hour : line.unit}</td>
        <td className="break-words p-2 text-end font-mono text-xs">{formatLocaleMoney(line.unit_price_ex_vat, "ILS", locale, { minimumFractionDigits: 2 })}</td>
      </tr>)}</tbody>
    </table>
    <p className="text-xs text-text-secondary">{prices.alternatives}</p>
    <p className="border-s-2 border-border ps-3 text-sm text-text-secondary">{t.recordOnly}</p>
  </div>;
}
