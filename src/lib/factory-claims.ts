import { z } from "zod";
import { contractPath } from "./commercial-prices";

// Step 6 (backend 0093): a claim is a package per contract and execution period made of the exact accepted
// signed journal rows, rated ex-VAT at the pair in effect. A row is claimed once; an issued package is frozen;
// a correction is a new version of the same number. VAT is never computed here.
const money = z.string().regex(/^-?\d+(?:\.\d{1,2})?$/);

export const claimLineSchema = z.object({
  id: z.string().uuid().nullable(), item_kind: z.enum(["DOOR", "ADDON", "STAGE"]), journal_id: z.string().uuid(),
  journal_item_id: z.string().uuid(), project_name: z.string(), label: z.string(), work_date: z.string().date(),
  quantity: z.string(), unit: z.string().nullable(), unit_price_ex_vat: money.nullable(), amount_ex_vat: money.nullable(),
  price_version: z.number().int().positive().nullable(), agreement_id: z.string().uuid().nullable(),
  reason: z.enum(["RATED", "NO_AGREEMENT", "NO_RATE", "STAGES_NOT_SUPPORTED"]),
  state: z.enum(["CLAIMED", "CLAIMABLE", "BACKLOG"]), claimed_in: z.string().nullable(),
});
export const claimSummarySchema = z.object({
  id: z.string().uuid(), contract_id: z.string().uuid(), period_start: z.string().date(), period_end: z.string().date(),
  number: z.number().int().positive(), version: z.number().int().positive(), kind: z.enum(["MAIN", "SUPPLEMENT"]),
  status: z.enum(["DRAFT", "ISSUED", "CANCELLED", "SUPERSEDED"]), currency: z.literal("ILS"), amount_ex_vat: money, vat: z.null(),
  lines_count: z.number().int().nonnegative(), supersedes_claim_id: z.string().uuid().nullable(), issued_at: z.string().nullable(),
  cancelled_at: z.string().nullable(), cancellation_reason: z.string().nullable(), superseded_at: z.string().nullable(), created_at: z.string(),
});
export const claimDetailSchema = claimSummarySchema.extend({ lines: z.array(claimLineSchema), issue_snapshot: z.record(z.string(), z.unknown()).nullable() });
export const claimPageSchema = z.object({ items: z.array(claimSummarySchema), total: z.number().int().nonnegative() });
export const claimPeriodViewSchema = z.object({
  start: z.string().date(), end: z.string().date(), blocked_reason: z.literal("MULTIPLE_CONTRACTS").nullable(),
  claimed_lines: z.number().int().nonnegative(), claimed_amount_ex_vat: money, claimable_lines: z.number().int().nonnegative(),
  claimable_amount_ex_vat: money, backlog_lines: z.number().int().nonnegative(), claims: z.array(claimSummarySchema), lines: z.array(claimLineSchema),
});

export type ClaimLine = z.infer<typeof claimLineSchema>;
export type ClaimSummary = z.infer<typeof claimSummarySchema>;
export type ClaimDetail = z.infer<typeof claimDetailSchema>;
export type ClaimPeriodView = z.infer<typeof claimPeriodViewSchema>;

export function claimsPath(contractId: string) { return contractPath(contractId) + "/claims"; }
export function claimPeriodPath(contractId: string, start: string) { return claimsPath(contractId) + "/periods/" + encodeURIComponent(start); }
