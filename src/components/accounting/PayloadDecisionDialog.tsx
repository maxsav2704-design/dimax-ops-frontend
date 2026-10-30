"use client";

import { useState, type ReactNode } from "react";
import { Textarea } from "@/components/ui/textarea";
import type { ResponseSchema } from "@/lib/api";
import { DraftDialog } from "./DraftDialog";
import { useCommercialWrite } from "./use-commercial-write";

export type DecisionLabels = { title: string; description: string; fingerprint: string; approve: string; reject: string; reason: string; checked: string };

/** OWNER's decision on a fingerprinted payload (a write-off, a refund): the fingerprint shown in full, an explicit check, a reason. */
export function PayloadDecisionDialog<T>({ path, schema, payloadSha256, extraBody, summary, labels, onClose, onSaved }: {
  path: string; schema: ResponseSchema<T>; payloadSha256: string; extraBody?: Record<string, unknown>; summary: ReactNode;
  labels: DecisionLabels; onClose: () => void; onSaved: (row: T) => void;
}) {
  const [decision, setDecision] = useState<"APPROVE" | "REJECT">("APPROVE");
  const [reason, setReason] = useState("");
  const [checked, setChecked] = useState(false);
  const write = useCommercialWrite(path, schema, onSaved);
  return <DraftDialog title={labels.title} description={labels.description} dirty={reason.length > 0 || checked} valid={checked && reason.trim().length > 0}
    write={write} onClose={onClose} submitLabel={decision === "APPROVE" ? labels.approve : labels.reject}
    onSave={() => void write.save(() => ({ request_id: crypto.randomUUID(), payload_sha256: payloadSha256, ...extraBody, decision, reason: reason.trim() }))}>
    <div className="text-sm">{summary}</div>
    <p className="break-all font-mono text-xs"><span className="text-text-secondary">{labels.fingerprint}:</span> {payloadSha256}</p>
    <div className="flex gap-4 text-sm">
      <label className="flex items-center gap-2"><input type="radio" name="payload-decision" checked={decision === "APPROVE"} onChange={() => setDecision("APPROVE")} />{labels.approve}</label>
      <label className="flex items-center gap-2"><input type="radio" name="payload-decision" checked={decision === "REJECT"} onChange={() => setDecision("REJECT")} />{labels.reject}</label>
    </div>
    <label className="block space-y-1 text-sm">{labels.reason}<Textarea aria-label={labels.reason} value={reason} maxLength={1000} onChange={(e) => setReason(e.target.value)} /></label>
    <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-1" />{labels.checked}</label>
  </DraftDialog>;
}
