import { useState, type ReactNode } from "react";
import { Save } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { commercialCopy } from "./copy";
import type { useCommercialWrite } from "./use-commercial-write";

export function DraftDialog({ title, description, dirty, valid, write, onClose, onSave, children, submitLabel }: {
  title: string; description: string; dirty: boolean; valid: boolean;
  write: Pick<ReturnType<typeof useCommercialWrite>, "busy" | "locked" | "blocked" | "uncertain" | "error">;
  onClose: () => void; onSave: () => void; children: ReactNode;
  submitLabel?: string;
}) {
  const { locale, dir } = useI18n();
  const t = commercialCopy[locale];
  const [leaving, setLeaving] = useState(false);
  function close() {
    if (write.busy) return;
    if (dirty || write.uncertain) setLeaving(true);
    else onClose();
  }
  return <Dialog open onOpenChange={(open) => { if (!open) close(); }}>
    <DialogContent dir={dir} closeLabel={t.close} className="w-[calc(100%-2rem)] max-w-3xl">
      <DialogTitle className="pe-8">{title}</DialogTitle>
      <DialogDescription>{description}</DialogDescription>
      <form className="min-w-0 space-y-4" onSubmit={(event) => {
        event.preventDefault();
        if (!write.busy && !write.blocked && (write.uncertain || valid)) onSave();
      }}>
        <fieldset disabled={write.locked} className="min-w-0 space-y-4">{children}</fieldset>
        {write.error && <p role="alert" className="text-sm text-status-problem-fg">{t[write.error]}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={close} disabled={write.busy}>{t.cancel}</Button>
          <Button type="submit" disabled={write.busy || write.blocked || (!write.uncertain && !valid)}
            className="h-auto min-h-10 max-w-full whitespace-normal">
            <Save className="me-2 size-4 shrink-0" />{write.busy ? t.saving : write.uncertain ? t.retry : submitLabel ?? t.save}
          </Button>
        </div>
      </form>
      <AlertDialog open={leaving} onOpenChange={setLeaving}>
        <AlertDialogContent dir={dir}><AlertDialogHeader>
          <AlertDialogTitle>{t.leave}</AlertDialogTitle>
          <AlertDialogDescription>{write.uncertain ? t.uncertainLeave : t.leaveHint}</AlertDialogDescription>
        </AlertDialogHeader><AlertDialogFooter>
          <AlertDialogCancel>{t.keep}</AlertDialogCancel>
          <AlertDialogAction onClick={onClose}>{t.discard}</AlertDialogAction>
        </AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </DialogContent>
  </Dialog>;
}
