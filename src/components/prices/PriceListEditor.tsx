"use client";

import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Save, Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";
import { priceCopy } from "./copy";
import {
  PRICE_API, isUncertainPriceWrite, loadPriceCatalog, normalizeInstallerPrice, priceErrorStatus,
  priceRequest, workKey, type DraftInput, type PriceDetail, type PriceLine,
} from "@/lib/factory-prices";

export function PriceListEditor({ base, latest, onClose, onSaved }: {
  base?: PriceDetail; latest: number; onClose: () => void; onSaved: (row: PriceDetail) => void;
}) {
  const { locale, dir } = useI18n();
  const t = priceCopy[locale];
  const [lines, setLines] = useState<PriceLine[]>(() => base?.items.map((row) => ({ ...row })) ?? []);
  const [reason, setReason] = useState("");
  const [agreement, setAgreement] = useState(base?.agreement_reference ?? "");
  const [selected, setSelected] = useState("");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const pending = useRef<DraftInput | null>(null);
  const locked = useRef(false);
  const catalog = useQuery({ queryKey: ["price-catalog"], queryFn: ({ signal }) => loadPriceCatalog(signal), retry: false });
  const available = new Map(catalog.data?.map((row) => [workKey(row), row]));
  const valid = !catalog.isError && !!catalog.data && reason.trim().length > 0 && agreement.trim().length > 0 &&
    lines.length > 0 && lines.length <= 500 && lines.every((row) => available.has(workKey(row)) && normalizeInstallerPrice(row.installer_price));

  function close() {
    if (busy) return;
    // Unsaved edits ask through an in-app alert dialog instead of window.confirm.
    if (dirty) setLeaveOpen(true);
    else onClose();
  }
  async function save() {
    if (locked.current || conflict || (!uncertain && !valid)) return;
    locked.current = true; setBusy(true); setError("");
    const body = pending.current ?? {
      request_id: crypto.randomUUID(), expected_latest_version: latest, reason: reason.trim(), agreement_reference: agreement.trim(),
      items: lines.map((row) => ({ kind: row.kind, target_id: row.target_id, installer_price: normalizeInstallerPrice(row.installer_price)!,
        ...(row.kind === "STAGE" ? { stage_code: row.stage_code ?? undefined } : {}) })),
    };
    pending.current = body;
    try {
      const result = await priceRequest<PriceDetail>(PRICE_API, body);
      onSaved(result);
    } catch (cause) {
      if (isUncertainPriceWrite(cause)) { setUncertain(true); setError(t.uncertainSave); }
      else {
        pending.current = null; setUncertain(false);
        const status = priceErrorStatus(cause);
        setConflict([403, 404, 409].includes(status));
        setError(status === 403 ? t.denied : status === 409 ? t.conflict : status === 422 ? t.validation : t.error);
      }
    } finally { locked.current = false; setBusy(false); }
  }

  return <Dialog open onOpenChange={(open) => { if (!open) close(); }}>
    <DialogContent dir={dir} className="w-[calc(100%-2rem)] max-w-3xl">
      <DialogTitle>{t.newVersion}</DialogTitle>
      <DialogDescription>{base ? `${t.fromVersion} ${base.version}. ` : ""}{t.copiedVersion}</DialogDescription>
      <form className="min-w-0 space-y-4" onSubmit={(event) => { event.preventDefault(); void save(); }}>
        <fieldset disabled={busy || uncertain || conflict} className="min-w-0 space-y-4">
          <label className="block space-y-1 text-sm">{t.reason}<Textarea aria-label={t.reason} value={reason} maxLength={1000} required onChange={(e) => { setReason(e.target.value); setDirty(true); }} /></label>
          <label className="block space-y-1 text-sm">{t.agreement}<Input aria-label={t.agreement} value={agreement} maxLength={500} required onChange={(e) => { setAgreement(e.target.value); setDirty(true); }} /></label>
          {catalog.isPending && <p role="status">{t.loading}</p>}
          {catalog.isError && <div role="alert" className="space-y-2 text-sm"><p>{t.error}</p><Button type="button" variant="outline" onClick={() => void catalog.refetch()}>{t.refresh}</Button></div>}
          <div className="flex min-w-0 gap-2">
            <select aria-label={t.choose} value={selected} onChange={(e) => setSelected(e.target.value)} className="h-10 min-w-0 flex-1 rounded-md border border-border bg-surface px-2 text-sm">
              <option value="">{t.choose}</option>
              {(["DOOR", "ADDON", "STAGE"] as const).map((kind) => <optgroup key={kind} label={t[kind]}>
                {catalog.data?.filter((row) => row.kind === kind && !lines.some((line) => workKey(line) === workKey(row))).map((row) =>
                  <option key={workKey(row)} value={workKey(row)}>{row.name}</option>)}
              </optgroup>)}
            </select>
            <Button type="button" size="icon" title={t.add} aria-label={t.add} disabled={!selected || lines.length >= 500} onClick={() => {
              const work = available.get(selected);
              if (work) { setLines([...lines, { ...work, installer_price: "" }]); setSelected(""); setDirty(true); }
            }}><Plus className="size-4" /></Button>
          </div>
          <div className="divide-y divide-border border-y border-border">
            {lines.length === 0 && <p className="py-5 text-sm text-text-secondary">{t.noItems}</p>}
            {lines.map((row, index) => {
              const invalid = !normalizeInstallerPrice(row.installer_price);
              const work = available.get(workKey(row)) ?? row;
              return <div key={workKey(row)} className="grid min-w-0 grid-cols-[minmax(0,1fr)_2.5rem] gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_10rem_2.5rem]">
                <div className="min-w-0 text-sm"><p className="break-words font-medium">{work.name}</p><p className="text-xs text-text-secondary">{t[row.kind]} · {work.unit === "pcs" ? t.pcs : work.unit === "hour" ? t.hour : work.unit}</p>
                  {!available.has(workKey(row)) && catalog.data && <p className="text-xs text-status-problem-fg">{t.unavailable}</p>}
                </div>
                <label className="col-start-1 row-start-2 min-w-0 text-xs sm:col-start-auto sm:row-start-auto">{t.price}
                  <Input aria-label={`${t.price}: ${work.name}`} aria-invalid={invalid} inputMode="decimal" autoComplete="off" value={row.installer_price} maxLength={14}
                    onChange={(e) => { setLines(lines.map((line, i) => i === index ? { ...line, installer_price: e.target.value } : line)); setDirty(true); }} />
                  {invalid && <span className="text-status-problem-fg">{t.invalidPrice}</span>}
                </label>
                <Button type="button" variant="ghost" size="icon" className="col-start-2 row-start-1 sm:col-start-3" title={`${t.remove}: ${work.name}`} aria-label={`${t.remove}: ${work.name}`} onClick={() => { setLines(lines.filter((_, i) => i !== index)); setDirty(true); }}><Trash2 className="size-4" /></Button>
              </div>;
            })}
          </div>
          <p className="text-xs text-text-secondary">{lines.length} / 500 · {t.items}</p>
        </fieldset>
        {error && <p role="alert" className="text-sm text-status-problem-fg">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={close} disabled={busy}>{t.close}</Button>
          <Button type="submit" disabled={busy || conflict || (!uncertain && !valid)} className="h-auto min-h-10 max-w-full whitespace-normal">
            <Save className="me-2 size-4 shrink-0" />{busy ? t.saving : uncertain ? t.retrySave : t.save}
          </Button>
        </div>
      </form>
      <AlertDialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <AlertDialogContent dir={dir}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.leave}</AlertDialogTitle>
            <AlertDialogDescription>{t.leaveHint}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.leaveKeep}</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setLeaveOpen(false); onClose(); }}>{t.leaveDiscard}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DialogContent>
  </Dialog>;
}
