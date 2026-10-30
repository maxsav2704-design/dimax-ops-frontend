import { z } from "zod";
import { contractPath } from "./commercial-prices";
import { attachmentSchema, postFile, type ClaimAttachment } from "./factory-reconciliation";

// Step 9 (backend 0096): opening balances before the cutover — DEBT, RETENTION (extracted from the debt, never added)
// and ADVANCE — entered apart with evidence, reconciled with the factory (disputed amount kept), approved by OWNER
// against a fingerprinted payload. An approved advance becomes a posted payment; an approved debt is settled by
// allocations; early signed work is listed and never claimable.
const money = z.string().regex(/^-?\d+(?:\.\d{1,2})?$/);
const uuid = z.string().uuid();

export const openingBalanceSchema = z.object({
  id: uuid, contract_id: uuid, kind: z.enum(["DEBT", "RETENTION", "ADVANCE"]), currency: z.literal("ILS"), amount: money, as_of: z.string().date(),
  basis: z.string(), tax_basis: z.enum(["EX_VAT", "INC_VAT", "UNSPECIFIED"]), terms_known: z.boolean(), due_on: z.string().date().nullable(),
  release_condition: z.string().nullable(), covers_early_work: z.boolean(), evidence: attachmentSchema,
  status: z.enum(["DRAFT", "APPROVED", "REJECTED"]), revision: z.number().int().positive(), payload: z.record(z.string(), z.unknown()),
  payload_sha256: z.string().length(64), acknowledged_amount: money.nullable(), disputed_amount: money.nullable(),
  reconciled_channel: z.enum(["EMAIL", "WHATSAPP"]).nullable(), reconciled_author: z.string().nullable(), reconciled_at: z.string().nullable(),
  reconciliation_attachment: attachmentSchema.nullable(), reconciliation_note: z.string().nullable(), decided_at: z.string().nullable(),
  decision_reason: z.string().nullable(), advance_payment_id: uuid.nullable(), created_at: z.string(),
});
export const openingFiguresSchema = z.object({
  currency: z.literal("ILS"), as_of: z.string().date(), debt: money, retention: money, advance: money, disputed: money, principal_due: money,
  principal_paid: money, principal_remaining: money, covers_early_work: z.boolean(),
});
export const earlyWorkRowSchema = z.object({
  item_kind: z.enum(["DOOR", "ADDON", "STAGE"]), journal_id: uuid, journal_item_id: uuid, project_name: z.string(), label: z.string(),
  work_date: z.string().date(), covered: z.boolean(),
});
export const openingBalancesViewSchema = z.object({
  contract_id: uuid, as_of: z.string().date(), items: z.array(openingBalanceSchema), figures: openingFiguresSchema, early_work: z.array(earlyWorkRowSchema),
});

export type OpeningBalance = z.infer<typeof openingBalanceSchema>;
export type OpeningBalancesView = z.infer<typeof openingBalancesViewSchema>;

export function openingBalancesPath(contractId: string) { return contractPath(contractId) + "/opening-balances"; }
export function openingBalancePath(contractId: string, balanceId: string) { return openingBalancesPath(contractId) + "/" + encodeURIComponent(balanceId); }

/** Uploads an evidence file (a statement, the factory's answer) for the opening balances of the contract. */
export function uploadOpeningEvidence(contractId: string, file: File, signal?: AbortSignal): Promise<ClaimAttachment> {
  return postFile(openingBalancesPath(contractId) + "/attachments", file, attachmentSchema, signal);
}
