import { z } from "zod";
import { apiFetch } from "./api";
import { COMMERCIAL_API } from "./commercial-prices";
import { attachmentSchema, type ClaimAttachment } from "./factory-reconciliation";

// Step 8 (backend 0095): money received from the factory apart from what it settles. A payment is posted only with a
// bank proof and an explicit answer to duplicate warnings; allocations are many-to-many with issued claim versions
// (PRINCIPAL or RETENTION part) and bounded by the available money and the part still due; refunds of an overpayment
// are proposed, approved by OWNER (reserve, not a transfer) and executed with a bank reference and proof.
const money = z.string().regex(/^-?\d+(?:\.\d{1,2})?$/);
const uuid = z.string().uuid();

export const allocationSchema = z.object({
  id: uuid, payment_id: uuid, claim_id: uuid, claim_label: z.string(), part: z.enum(["PRINCIPAL", "RETENTION"]), amount: money, active: z.boolean(),
  allocated_at: z.string(), released_at: z.string().nullable(), release_reason: z.string().nullable(),
});
export const refundSchema = z.object({
  id: uuid, payment_id: uuid, amount: money, reason: z.string(), payload_sha256: z.string().length(64),
  status: z.enum(["PROPOSED", "APPROVED", "EXECUTED", "REJECTED", "CANCELLED"]), proposed_at: z.string(), decided_at: z.string().nullable(),
  decision_reason: z.string().nullable(), executed_on: z.string().nullable(), bank_reference: z.string().nullable(), proof: attachmentSchema.nullable(),
  cancellation_reason: z.string().nullable(),
});
export const duplicateWarningSchema = z.object({ payment_id: uuid, reason: z.enum(["SAME_AMOUNT_AND_DATE", "SAME_PROOF"]) });
export const paymentSchema = z.object({
  id: uuid, contract_id: uuid, currency: z.literal("ILS"), amount: money, received_on: z.string().date(), counterparty_name: z.string(),
  bank_reference: z.string().nullable(), stated_purpose: z.string().nullable(), purpose_kind: z.enum(["SETTLEMENT", "ADVANCE", "UNKNOWN"]),
  tax_basis: z.enum(["EX_VAT", "INC_VAT", "UNSPECIFIED"]), allocatable: z.boolean(), status: z.enum(["DRAFT", "POSTED", "CANCELLED", "REVERSED"]),
  proof: attachmentSchema.nullable(), allocated: money, reserved: money, refunded: money, available: money,
  duplicate_warnings: z.array(duplicateWarningSchema), duplicate_acknowledged: z.boolean(), posted_at: z.string().nullable(),
  cancelled_at: z.string().nullable(), cancellation_reason: z.string().nullable(), reversed_at: z.string().nullable(), reversal_reason: z.string().nullable(),
  allocations: z.array(allocationSchema), refunds: z.array(refundSchema), created_at: z.string(),
});
export const paymentPageSchema = z.object({ items: z.array(paymentSchema), total: z.number().int().nonnegative() });
export const refundPageSchema = z.object({ items: z.array(refundSchema), total: z.number().int().nonnegative() });
export const moneySummarySchema = z.object({
  contract_id: uuid, currency: z.literal("ILS"), received: money, allocated: money, reserved_for_refund: money, refunded: money, unallocated: money,
  unallocated_by_purpose: z.object({ SETTLEMENT: money, ADVANCE: money, UNKNOWN: money }), needs_vat_rule: money, payable_now: money, overpayment: money,
  open_refunds: z.number().int().nonnegative(), vat: z.null(),
});

export type Payment = z.infer<typeof paymentSchema>;
export type Allocation = z.infer<typeof allocationSchema>;
export type Refund = z.infer<typeof refundSchema>;
export type MoneySummary = z.infer<typeof moneySummarySchema>;
export type DuplicateWarning = z.infer<typeof duplicateWarningSchema>;

function contractPath(contractId: string) { return COMMERCIAL_API + "/" + encodeURIComponent(contractId); }
export function paymentsPath(contractId: string) { return contractPath(contractId) + "/payments"; }
export function paymentPath(contractId: string, paymentId: string) { return paymentsPath(contractId) + "/" + encodeURIComponent(paymentId); }
export function moneySummaryPath(contractId: string) { return paymentsPath(contractId) + "/summary"; }
export function paymentAttachmentPath(contractId: string, attachmentId: string) { return paymentsPath(contractId) + "/attachments/" + encodeURIComponent(attachmentId); }
export function refundsPath(contractId: string) { return contractPath(contractId) + "/refunds"; }
export function refundPath(contractId: string, refundId: string) { return refundsPath(contractId) + "/" + encodeURIComponent(refundId); }

/** Attaches the bank proof to a draft payment; the server stores it once per payment (sha256). */
export async function uploadPaymentProof(contractId: string, paymentId: string, file: File, signal?: AbortSignal): Promise<Payment> {
  const body = new FormData();
  body.append("file", file, file.name);
  return apiFetch(paymentPath(contractId, paymentId) + "/proof", { method: "POST", body, signal }, { schema: paymentSchema });
}

/** Uploads the proof of an executed refund (outgoing transfer). */
export async function uploadRefundProof(contractId: string, file: File, signal?: AbortSignal): Promise<ClaimAttachment> {
  const body = new FormData();
  body.append("file", file, file.name);
  return apiFetch(refundsPath(contractId) + "/attachments", { method: "POST", body, signal }, { schema: attachmentSchema });
}
