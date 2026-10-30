import { z } from "zod";
import { apiFetch } from "./api";
import { claimsPath } from "./factory-claims";

// Step 7 (backend 0094): the factory's answer is bound to an exact issued claim version and gives three numbers
// (presented, acknowledged, disputed) that never write anything off by themselves; a write-off is prepared with
// an exact fingerprinted payload and approved by OWNER against that fingerprint and the expected version; a
// retention is part of the obligation, changed only by a new revision and released against evidence.
const money = z.string().regex(/^-?\d+(?:\.\d{1,2})?$/);
const uuid = z.string().uuid();

export const attachmentSchema = z.object({
  id: uuid, claim_id: uuid, filename: z.string(), content_type: z.string(), size: z.number().int().positive(), sha256: z.string().length(64),
  created_at: z.string(),
});
export const responseLineSchema = z.object({
  claim_line_id: uuid, label: z.string(), amount_ex_vat: money, decision: z.enum(["ACKNOWLEDGED", "DISPUTED"]), factory_note: z.string().nullable(),
});
export const claimResponseSchema = z.object({
  id: uuid, claim_id: uuid, claim_number: z.number().int().positive(), claim_version: z.number().int().positive(), issue_snapshot_sha256: z.string(),
  presented_amount_ex_vat: money, channel: z.enum(["EMAIL", "WHATSAPP"]), author_name: z.string(), author_contact: z.string().nullable(),
  answered_at: z.string(), attachment: attachmentSchema, acknowledged_amount: money, tax_basis: z.enum(["EX_VAT", "INC_VAT", "UNSPECIFIED"]),
  comparison: z.enum(["COMPARABLE", "NEEDS_CLARIFICATION"]), detail: z.enum(["NONE", "LINES"]), disputed_amount_ex_vat: money,
  clarification_required: z.boolean(), note: z.string().nullable(), lines: z.array(responseLineSchema), registered_at: z.string(),
});
export const correctionSchema = z.object({
  id: uuid, claim_id: uuid, claim_version: z.number().int().positive(), kind: z.literal("WRITE_OFF"), payload: z.record(z.string(), z.unknown()),
  payload_sha256: z.string().length(64), amount_ex_vat: money, line_ids: z.array(uuid), basis_response_id: uuid.nullable(), reason: z.string(),
  status: z.enum(["PREPARED", "APPROVED", "REJECTED", "VOID"]), prepared_at: z.string(), decided_at: z.string().nullable(),
  decision_reason: z.string().nullable(), applied_amount_ex_vat: money.nullable(), voided_by_correction_id: uuid.nullable(),
});
export const retentionSchema = z.object({
  id: uuid, revision: z.number().int().positive(), amount_ex_vat: money, basis: z.string(), release_condition: z.string(), reason: z.string(),
  status: z.enum(["ACTIVE", "SUPERSEDED"]), supersedes_id: uuid.nullable(), created_at: z.string(), superseded_at: z.string().nullable(),
});
export const releaseSchema = z.object({
  id: uuid, retention_id: uuid, retention_revision: z.number().int().positive(), amount_ex_vat: money, evidence: z.string(),
  attachment: attachmentSchema.nullable(), occurred_at: z.string(), registered_at: z.string(),
});
export const figuresSchema = z.object({
  currency: z.literal("ILS"), presented_ex_vat: money, answer_state: z.enum(["UNANSWERED", "NEEDS_CLARIFICATION", "ANSWERED"]),
  acknowledged_ex_vat: money.nullable(), disputed_ex_vat: money, written_off_ex_vat: money, outstanding_ex_vat: money, retention_ex_vat: money,
  retention_released_ex_vat: money, retention_held_ex_vat: money, payable_now_ex_vat: money, paid_ex_vat: z.null(), vat: z.null(),
});
export const claimReconciliationSchema = z.object({
  claim_id: uuid, number: z.number().int().positive(), version: z.number().int().positive(),
  status: z.enum(["ISSUED", "SUPERSEDED", "DRAFT", "CANCELLED"]), issue_snapshot_sha256: z.string().nullable(), figures: figuresSchema.nullable(),
  current_response_id: uuid.nullable(), responses: z.array(claimResponseSchema), corrections: z.array(correctionSchema),
  retention: retentionSchema.nullable(), retention_history: z.array(retentionSchema), releases: z.array(releaseSchema),
  attachments: z.array(attachmentSchema),
});
export const contractReconciliationSchema = z.object({
  contract_id: uuid, issued_claims: z.number().int().nonnegative(), answered_claims: z.number().int().nonnegative(),
  clarification_required_claims: z.number().int().nonnegative(), pending_corrections: z.number().int().nonnegative(), figures: figuresSchema,
});

export type ClaimReconciliation = z.infer<typeof claimReconciliationSchema>;
export type ReconciliationFigures = z.infer<typeof figuresSchema>;
export type ClaimResponse = z.infer<typeof claimResponseSchema>;
export type Correction = z.infer<typeof correctionSchema>;
export type ClaimAttachment = z.infer<typeof attachmentSchema>;

export function claimPath(contractId: string, claimId: string) { return claimsPath(contractId) + "/" + encodeURIComponent(claimId); }
export function reconciliationPath(contractId: string, claimId: string) { return claimPath(contractId, claimId) + "/reconciliation"; }
export function contractReconciliationPath(contractId: string) { return claimsPath(contractId).replace(/\/claims$/, "/reconciliation"); }
export function attachmentsPath(contractId: string, claimId: string) { return claimPath(contractId, claimId) + "/attachments"; }

/** Uploads one answer or evidence file; the server stores it once per claim (sha256) and returns its record. */
export async function uploadClaimAttachment(contractId: string, claimId: string, file: File, signal?: AbortSignal): Promise<ClaimAttachment> {
  const body = new FormData();
  body.append("file", file, file.name);
  return apiFetch(attachmentsPath(contractId, claimId), { method: "POST", body, signal }, { schema: attachmentSchema });
}
