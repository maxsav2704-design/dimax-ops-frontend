import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";
import { COMMERCIAL_API, contractSchema, type CommercialContract } from "@/lib/commercial-prices";
import { commercialCopy } from "./copy";
import { useCommercialWrite } from "./use-commercial-write";
import { DraftDialog } from "./DraftDialog";

export function ContractEditor({ onSaved, onClose }: {
  onSaved: (row: CommercialContract) => void; onClose: () => void;
}) {
  const { locale } = useI18n();
  const t = commercialCopy[locale];
  const [factory, setFactory] = useState("");
  const [reference, setReference] = useState("");
  const [reason, setReason] = useState("");
  const write = useCommercialWrite(COMMERCIAL_API, contractSchema, onSaved);
  const valid = !!factory.trim() && !!reference.trim() && !!reason.trim();
  return <DraftDialog title={t.newContract} description={t.contractDescription}
    dirty={!!(factory || reference || reason)} valid={valid} write={write} onClose={onClose}
    onSave={() => void write.save(() => ({
      request_id: crypto.randomUUID(), factory_name: factory.trim(), reference: reference.trim(), reason: reason.trim(),
    }))}>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="space-y-1 text-sm">{t.factory}<Input aria-label={t.factory} value={factory}
        maxLength={200} required onChange={(event) => setFactory(event.target.value)} /></label>
      <label className="space-y-1 text-sm">{t.reference}<Input aria-label={t.reference} value={reference}
        maxLength={200} required onChange={(event) => setReference(event.target.value)} /></label>
    </div>
    <label className="block space-y-1 text-sm">{t.contractReason}<Textarea aria-label={t.contractReason}
      maxLength={1000} required value={reason} onChange={(event) => setReason(event.target.value)} /></label>
    <p className="text-xs text-text-secondary">{t.currency}: ILS · {t.vat}</p>
  </DraftDialog>;
}
