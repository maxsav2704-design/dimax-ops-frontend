import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";
import { loadPriceCatalog, workKey } from "@/lib/factory-prices";
import { commercialDetailSchema, commercialLineKey, commercialPricesPath, normalizeCommercialPrice,
  type CommercialContract, type CommercialLine, type CommercialPrice, type CommercialPriceInput } from "@/lib/commercial-prices";
import { commercialCopy } from "./copy";
import { useCommercialWrite } from "./use-commercial-write";
import { DraftDialog } from "./DraftDialog";

const selectClass = "h-10 w-full min-w-0 rounded-md border border-border bg-surface px-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent";

export function CommercialPriceEditor({ contract, base, latest, onClose, onSaved }: {
  contract: CommercialContract; base?: CommercialPrice; latest: number;
  onClose: () => void; onSaved: (row: CommercialPrice) => void;
}) {
  const { locale } = useI18n();
  const t = commercialCopy[locale];
  const [lines, setLines] = useState<CommercialLine[]>(() => base?.items.map((line) => ({ ...line })) ?? []);
  const [proposed, setProposed] = useState(base?.proposed_from ?? "");
  const [reason, setReason] = useState("");
  const [agreement, setAgreement] = useState(base?.agreement_reference ?? "");
  const [kind, setKind] = useState<CommercialLine["kind"]>("INSTALLATION");
  const [target, setTarget] = useState("");
  const [stage, setStage] = useState("");
  const [dirty, setDirty] = useState(false);
  const catalog = useQuery({ queryKey: ["commercial-catalog"], queryFn: ({ signal }) => loadPriceCatalog(signal) });
  const available = new Map(catalog.data?.map((item) => [workKey(item), item]));
  const targetKey = (line: CommercialLine) => (line.kind === "ADDON" ? "ADDON:" : "DOOR:") + line.target_id;
  const write = useCommercialWrite(commercialPricesPath(contract.id), commercialDetailSchema, onSaved);
  const stageValid = kind !== "STAGE" || /^[A-Z][A-Z0-9_]{0,39}$/.test(stage);
  const newKey = [kind, target, kind === "STAGE" ? stage : ""].join(":");
  const selected = available.get((kind === "ADDON" ? "ADDON:" : "DOOR:") + target);
  const canAdd = !!selected && stageValid && lines.length < 500 &&
    !lines.some((line) => commercialLineKey(line) === newKey) && !catalog.isFetching && !catalog.isError;
  const valid = !!proposed && !!reason.trim() && !!agreement.trim() &&
    !!catalog.data && !catalog.isError && !catalog.isFetching && lines.length > 0 && lines.length <= 500 &&
    lines.every((line) => available.has(targetKey(line)) && normalizeCommercialPrice(line.unit_price_ex_vat) !== null);
  const unitName = (unit: string) => unit === "pcs" ? t.pcs : unit === "hour" ? t.hour : unit;
  function add() {
    if (!canAdd || !selected) return;
    setLines([...lines, { kind, target_id: selected.target_id, stage_code: kind === "STAGE" ? stage : "",
      name: selected.name, unit: selected.unit, unit_price_ex_vat: "" }]);
    setTarget(""); setStage(""); setDirty(true);
  }
  return <DraftDialog title={t.newVersion} description={contract.factory_name + " · " + contract.reference + ". " + t.priceDescription}
    dirty={dirty} valid={valid} write={write} onClose={onClose}
    onSave={() => void write.save((): CommercialPriceInput => ({
      request_id: crypto.randomUUID(), expected_latest_version: latest, proposed_from: proposed,
      reason: reason.trim(), agreement_reference: agreement.trim(),
      items: lines.map((line) => ({ kind: line.kind, target_id: line.target_id, stage_code: line.stage_code,
        unit_price_ex_vat: normalizeCommercialPrice(line.unit_price_ex_vat)! })),
    }))}>
    {contract.is_demo && <p className="border-s-2 border-accent bg-surface-sunken p-3 text-sm">{t.demoNotice}</p>}
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="min-w-0 space-y-1 text-sm">{t.proposed}<Input type="date" aria-label={t.proposed}
        value={proposed} required onChange={(event) => { setProposed(event.target.value); setDirty(true); }} /></label>
      <label className="min-w-0 space-y-1 text-sm">{t.agreement}<Input aria-label={t.agreement} value={agreement}
        maxLength={200} required onChange={(event) => { setAgreement(event.target.value); setDirty(true); }} /></label>
    </div>
    <label className="block space-y-1 text-sm">{t.reason}<Textarea aria-label={t.reason} value={reason}
      maxLength={1000} required onChange={(event) => { setReason(event.target.value); setDirty(true); }} /></label>
    {catalog.isPending && <p role="status" className="text-sm">{t.loading}</p>}
    {catalog.isError && <div role="alert" className="flex items-center gap-3 text-sm text-status-problem-fg">
      {t.error}<Button type="button" size="icon" variant="outline" aria-label={t.refresh} title={t.refresh}
        onClick={() => void catalog.refetch()}><RefreshCw className="size-4" /></Button>
    </div>}
    <div className="grid min-w-0 gap-3 sm:grid-cols-2">
      <label className="min-w-0 space-y-1 text-sm">{t.kind}<select aria-label={t.kind} className={selectClass}
        value={kind} onChange={(event) => { setKind(event.target.value as CommercialLine["kind"]); setTarget(""); setStage(""); }}>
        {(["INSTALLATION", "STAGE", "ADDON"] as const).map((value) => <option value={value} key={value}>{t[value]}</option>)}
      </select></label>
      <label className="min-w-0 space-y-1 text-sm">{t.choose}<select aria-label={t.choose} className={selectClass}
        value={target} onChange={(event) => setTarget(event.target.value)}>
        <option value="">{t.choose}</option>
        {catalog.data?.filter((item) => item.kind === (kind === "ADDON" ? "ADDON" : "DOOR"))
          .map((item) => <option key={item.target_id} value={item.target_id}>{item.name}</option>)}
      </select></label>
      {kind === "STAGE" && <label className="min-w-0 space-y-1 text-sm">{t.stage}
        <Input dir="ltr" aria-label={t.stage} aria-invalid={!!stage && !stageValid} value={stage} maxLength={40}
          onChange={(event) => setStage(event.target.value.toUpperCase())} />
        {!!stage && !stageValid && <span className="text-xs text-status-problem-fg">{t.stageInvalid}</span>}
      </label>}
      <div className="flex items-end justify-end sm:col-start-2"><Button type="button" variant="outline"
        onClick={add} disabled={!canAdd}><Plus className="me-2 size-4" />{t.add}</Button></div>
    </div>
    <div className="divide-y divide-border border-y border-border">
      {!lines.length && <p className="py-4 text-sm text-text-secondary">{t.noItems}</p>}
      {lines.map((line, index) => {
        const current = available.get(targetKey(line));
        const invalid = normalizeCommercialPrice(line.unit_price_ex_vat) === null;
        const label = (current?.name ?? line.name) + (line.stage_code ? " / " + line.stage_code : "");
        return <div key={commercialLineKey(line)} className="grid min-w-0 grid-cols-[minmax(0,1fr)_2.5rem] gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_14rem_2.5rem]">
          <div className="min-w-0 text-sm"><p className="break-words font-medium">{label}</p>
            <p className="text-xs text-text-secondary">{t[line.kind]} · {unitName(current?.unit ?? line.unit)}</p>
            {catalog.data && !current && <p className="text-xs text-status-problem-fg">{t.unavailable}</p>}
          </div>
          <label className="col-start-1 row-start-2 min-w-0 text-xs sm:col-start-2 sm:row-start-1">{t.price}
            <Input dir="ltr" aria-label={t.price + ": " + label} inputMode="decimal" autoComplete="off" maxLength={13}
              value={line.unit_price_ex_vat} aria-invalid={invalid} onChange={(event) => {
                setLines(lines.map((item, i) => i === index ? { ...item, unit_price_ex_vat: event.target.value } : item)); setDirty(true);
              }} />
            {invalid && <span className="text-status-problem-fg">{t.invalidPrice}</span>}
          </label>
          <Button type="button" variant="ghost" size="icon" className="col-start-2 row-start-1 sm:col-start-3"
            title={t.remove + ": " + label} aria-label={t.remove + ": " + label}
            onClick={() => { setLines(lines.filter((_, i) => i !== index)); setDirty(true); }}><Trash2 className="size-4" /></Button>
        </div>;
      })}
    </div>
    <p className="text-xs text-text-secondary">{t.items}: {lines.length} / 500 · {t.alternatives}</p>
  </DraftDialog>;
}
