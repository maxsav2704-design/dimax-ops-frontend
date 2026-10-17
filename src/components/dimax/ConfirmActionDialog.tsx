import { useEffect, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCopy } from "@/lib/i18n";

// E10 one confirmation pattern for destructive and money-affecting actions:
// the title is the verb, the body says what changes and what does not, a review
// checkbox gates the action when the business rule asks for one, and the
// primary button repeats the verb.

type ConfirmActionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The verb, e.g. "Activate price list for all projects". */
  title: ReactNode;
  /** What changes. */
  changes: ReactNode;
  /** What does not change (e.g. "Recorded earnings are not recalculated"). */
  keeps?: ReactNode;
  /** When set, the confirm button stays disabled until the box is checked. */
  reviewLabel?: ReactNode;
  confirmLabel: ReactNode;
  onConfirm: () => void | Promise<void>;
  busy?: boolean;
  tone?: "default" | "danger";
  testId?: string;
};

export function ConfirmActionDialog({
  open, onOpenChange, title, changes, keeps, reviewLabel, confirmLabel, onConfirm, busy, tone = "default", testId,
}: ConfirmActionDialogProps) {
  const copy = useCopy();
  const [reviewed, setReviewed] = useState(false);
  useEffect(() => {
    if (!open) setReviewed(false);
  }, [open]);
  const blocked = !!reviewLabel && !reviewed;
  const checkboxId = `${testId ?? "confirm-action"}-review`;
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!busy) onOpenChange(next); }}>
      <DialogContent data-testid={testId} className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 text-13 leading-5 text-text-secondary">
              <div>{changes}</div>
              {keeps ? <div className="rounded-md bg-surface-sunken px-3 py-2 text-text">{keeps}</div> : null}
            </div>
          </DialogDescription>
        </DialogHeader>
        {reviewLabel ? (
          <label htmlFor={checkboxId} className="flex items-start gap-2.5 text-13 text-text">
            <Checkbox id={checkboxId} checked={reviewed} onCheckedChange={(value) => setReviewed(value === true)} disabled={busy} className="mt-0.5" />
            <span>{reviewLabel}</span>
          </label>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            {copy("Cancel", "Отмена", "ביטול")}
          </Button>
          <Button
            type="button"
            variant={tone === "danger" ? "destructive" : "default"}
            onClick={() => { void onConfirm(); }}
            disabled={busy || blocked}
            title={blocked ? copy("Confirm the review first", "Сначала отметьте, что проверили", "אשרו תחילה שבדקתם") : undefined}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
