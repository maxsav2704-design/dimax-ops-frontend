import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";
import { contractTermsPath, termsDetailSchema, termsInputSchema, type ContractTerms } from "@/lib/contract-terms";
import type { CommercialContract } from "@/lib/commercial-prices";
import { DraftDialog } from "./DraftDialog";
import { termsCopy } from "./terms-copy";
import { useCommercialWrite } from "./use-commercial-write";

const empty = {
  factory_legal_name: "", registration_number: "", address: "", contact_name: "", contact_email: "", contact_phone: "",
  proposed_from: "", proposed_until: "", billing_basis: "", payment_terms: "", retention_terms: "", reason: "", agreement_reference: "",
};
type Field = keyof typeof empty;
const optional = new Set<Field>(["contact_name", "contact_email", "contact_phone", "proposed_until"]);
const limits: Partial<Record<Field, number>> = {
  factory_legal_name: 200, registration_number: 80, address: 1000, contact_name: 200, contact_email: 254,
  contact_phone: 40, payment_terms: 4000, retention_terms: 4000, reason: 1000, agreement_reference: 200,
};

export function ContractTermsEditor({ contract, base, latest, onClose, onSaved }: {
  contract: CommercialContract; base?: ContractTerms; latest: number; onClose: () => void; onSaved: (row: ContractTerms) => void;
}) {
  const { locale } = useI18n();
  const t = termsCopy[locale];
  const [fields, setFields] = useState(() => Object.fromEntries(Object.keys(empty).map((key) =>
    [key, key === "reason" ? "" : base?.[key as Field] ?? ""])) as typeof empty);
  const [dirty, setDirty] = useState(false);
  const parsed = termsInputSchema.safeParse(Object.fromEntries(Object.entries(fields).map(([key, value]) =>
    [key, optional.has(key as Field) && !value.trim() ? null : value.trim()])));
  const write = useCommercialWrite(contractTermsPath(contract.id), termsDetailSchema, onSaved);
  function update(key: Field, value: string) { setFields((previous) => ({ ...previous, [key]: value })); setDirty(true); }
  function field(key: Field, multiline = false) {
    const props = {
      "aria-label": t[key], value: fields[key], required: !optional.has(key), maxLength: limits[key],
      onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => update(key, event.target.value),
    };
    return <label key={key} className="block min-w-0 space-y-1 text-sm">{t[key]}
      {multiline ? <Textarea {...props} rows={3} /> : <Input {...props}
        type={key.startsWith("proposed_") ? "date" : key === "contact_email" ? "email" : key === "contact_phone" ? "tel" : "text"}
        dir={key === "contact_email" || key === "contact_phone" || key === "registration_number" || key.startsWith("proposed_") ? "ltr" : undefined} />}
    </label>;
  }
  return <DraftDialog title={t.newVersion} description={contract.reference + ". " + t.description}
    dirty={dirty} valid={parsed.success} write={write} onClose={onClose}
    onSave={() => { if (parsed.success) void write.save(() => ({ ...parsed.data, request_id: crypto.randomUUID(), expected_latest_version: latest })); }}>
    <p className="border-s-2 border-accent bg-surface-sunken p-3 text-sm">{t.draft}</p>
    <fieldset className="min-w-0 space-y-3 border-t border-border pt-3"><legend className="text-sm font-semibold">{t.factory}</legend>
      <div className="grid gap-3 sm:grid-cols-2">{field("factory_legal_name")}{field("registration_number")}</div>{field("address", true)}
    </fieldset>
    <fieldset className="min-w-0 space-y-3 border-t border-border pt-3"><legend className="text-sm font-semibold">{t.contact}</legend>
      {field("contact_name")}<div className="grid gap-3 sm:grid-cols-2">{field("contact_email")}{field("contact_phone")}</div>
      <p className="text-xs text-text-secondary">{t.contactNotice}</p>
    </fieldset>
    <fieldset className="min-w-0 space-y-3 border-t border-border pt-3"><legend className="text-sm font-semibold">{t.conditions}</legend>
      <div className="grid gap-3 sm:grid-cols-2">{field("proposed_from")}{field("proposed_until")}</div>
      <label className="block min-w-0 space-y-1 text-sm">{t.billing_basis}
        <select aria-label={t.billing_basis} required value={fields.billing_basis} onChange={(event) => update("billing_basis", event.target.value)}
          className="h-10 w-full min-w-0 rounded-md border border-border bg-surface px-2 text-sm">
          <option value="">{t.chooseBasis}</option><option value="FULL_INSTALLATION">{t.FULL_INSTALLATION}</option><option value="STAGES">{t.STAGES}</option>
        </select>
      </label>
      {field("payment_terms", true)}{field("retention_terms", true)}
      <p className="text-xs text-text-secondary">{t.period}</p><p className="text-xs text-text-secondary">{t.termsNotice}</p>
    </fieldset>
    <fieldset className="min-w-0 space-y-3 border-t border-border pt-3"><legend className="text-sm font-semibold">{t.basis}</legend>
      {field("agreement_reference")}{field("reason", true)}
    </fieldset>
    {dirty && !parsed.success && <p className="text-sm text-status-problem-fg">{t.invalid}</p>}
  </DraftDialog>;
}
