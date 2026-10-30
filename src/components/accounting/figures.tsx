"use client";

import { downloadAttachment, type ClaimAttachment } from "@/lib/factory-reconciliation";

/** A grid of labelled money figures (the settlement panels all show one). `cells`: [label, formatted value] pairs. */
export function FiguresGrid({ cells, testId, columns = "sm:grid-cols-5", children }: {
  cells: [string, string][]; testId?: string; columns?: string; children?: React.ReactNode;
}) {
  return <dl data-testid={testId} className={`grid grid-cols-2 gap-2 rounded-md border border-border p-3 text-sm ${columns}`}>
    {cells.map(([label, value]) => <div key={label}><dt className="text-xs text-text-secondary">{label}</dt><dd className="font-mono tabular-nums">{value}</dd></div>)}
    {children}
  </dl>;
}

/** Opens an uploaded file through the authenticated client (the routes answer with no-store and an attachment disposition). */
export function AttachmentLink({ path, file }: { path: string; file: ClaimAttachment }) {
  return <button type="button" className="underline decoration-dotted underline-offset-2 hover:text-text-primary"
    onClick={() => void downloadAttachment(path, file.filename)}>{file.filename}</button>;
}
