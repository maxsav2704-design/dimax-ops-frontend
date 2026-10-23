import { z } from "zod";
import { COMMERCIAL_API } from "./commercial-prices";

// Activation stage (backend 0087): an OWNER puts a factory-confirmed pair into effect from a date
// and sees a read-only period estimate. Nothing here claims, invoices or pays.
const money = z.string().regex(/^-?\d+(?:\.\d{1,2})?$/);

export const agreementSummarySchema = z.object({
  id: z.string().uuid(), contract_id: z.string().uuid(), terms_id: z.string().uuid(), price_id: z.string().uuid(),
  approval_id: z.string().uuid(), terms_version: z.number().int().positive(), price_version: z.number().int().positive(),
  billing_basis: z.enum(["FULL_INSTALLATION", "STAGES"]), effective_from: z.string().date(), effective_until: z.string().date().nullable(),
  activated_by: z.string().uuid(), activated_by_name: z.string(), activated_at: z.string(), reason: z.string(),
  snapshot_hash: z.string(), status: z.enum(["SCHEDULED", "ACTIVE", "ENDED"]), is_demo: z.boolean(), usable_for_billing: z.literal(false),
});
export const agreementPageSchema = z.object({
  items: z.array(agreementSummarySchema), total: z.number().int().nonnegative(), activation_enabled: z.boolean(),
  cutover: z.string().date(), today: z.string().date(), current: agreementSummarySchema.nullable(),
});
export const periodLineSchema = z.object({
  journal_id: z.string().uuid(), project_name: z.string(), kind: z.enum(["INSTALLATION", "ADDON"]), label: z.string(),
  work_date: z.string().date(), quantity: z.string(), unit: z.string().nullable(), unit_price_ex_vat: money.nullable(),
  amount_ex_vat: money.nullable(), price_version: z.number().int().positive().nullable(), agreement_id: z.string().uuid().nullable(),
  reason: z.enum(["RATED", "NO_AGREEMENT", "STAGES_NOT_SUPPORTED", "NO_RATE"]),
});
export const periodSummarySchema = z.object({
  start: z.string().date(), end: z.string().date(), signed_journals: z.number().int().nonnegative(),
  rated_lines: z.number().int().nonnegative(), unrated_lines: z.number().int().nonnegative(), amount_ex_vat: money,
  blocked_reason: z.literal("MULTIPLE_CONTRACTS").nullable(), vat: z.null(), estimate_only: z.literal(true),
});
export const periodPageSchema = z.object({
  items: z.array(periodSummarySchema), cutover: z.string().date(), today: z.string().date(), current_start: z.string().date(),
  undated_lines: z.number().int().nonnegative(), activation_enabled: z.boolean(), estimate_only: z.literal(true),
});
export const periodDetailSchema = periodSummarySchema.extend({ lines: z.array(periodLineSchema) });

export type CommercialAgreement = z.infer<typeof agreementSummarySchema>;
export type AgreementPage = z.infer<typeof agreementPageSchema>;
export type PeriodSummary = z.infer<typeof periodSummarySchema>;
export type PeriodDetail = z.infer<typeof periodDetailSchema>;
export type PeriodLine = z.infer<typeof periodLineSchema>;

export function agreementsPath(contractId: string) { return COMMERCIAL_API + "/" + encodeURIComponent(contractId) + "/agreements"; }
export function periodsPath(contractId: string) { return COMMERCIAL_API + "/" + encodeURIComponent(contractId) + "/periods"; }
