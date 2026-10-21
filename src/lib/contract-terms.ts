import { z } from "zod";
import { COMMERCIAL_API } from "./commercial-prices";

const label = z.string().trim().min(1).max(200);
export const termsFieldsSchema = z.object({
  factory_legal_name: label, registration_number: z.string().trim().min(1).max(80),
  address: z.string().trim().min(1).max(1000), contact_name: label.nullable(),
  contact_email: z.string().trim().email().max(254).nullable(),
  contact_phone: z.string().trim().min(3).max(40).regex(/^\+?[0-9 ()-]+$/).regex(/[0-9]/).nullable(),
  proposed_from: z.string().date(), proposed_until: z.string().date().nullable(),
  billing_basis: z.enum(["FULL_INSTALLATION", "STAGES"]),
  payment_terms: z.string().trim().min(1).max(4000), retention_terms: z.string().trim().min(1).max(4000),
  reason: z.string().trim().min(1).max(1000), agreement_reference: label,
});
export const termsInputSchema = termsFieldsSchema.refine(
  (row) => !row.proposed_until || row.proposed_until >= row.proposed_from,
  { path: ["proposed_until"], message: "End before start" },
);
export const termsSummarySchema = z.object({
  id: z.string().uuid(), contract_id: z.string().uuid(), version: z.number().int().positive(),
  status: z.literal("DRAFT"), proposed_from: z.string().date(), proposed_until: z.string().date().nullable(),
  reason: z.string(), agreement_reference: z.string(), created_by: z.string().uuid(), created_by_name: z.string(),
  created_at: z.string().datetime({ offset: true }), is_demo: z.boolean(),
  factory_confirmed: z.literal(false), usable_for_billing: z.literal(false), currency: z.literal("ILS"),
  vat_basis: z.literal("EXCLUSIVE"), period_start_day: z.literal(10), period_timezone: z.literal("Asia/Jerusalem"),
});
export const termsDetailSchema = termsSummarySchema.merge(termsFieldsSchema);
export const termsPageSchema = z.object({
  items: z.array(termsSummarySchema), total: z.number().int().nonnegative(), latest_version: z.number().int().nonnegative(),
});
export type ContractTerms = z.infer<typeof termsDetailSchema>;
export function contractTermsPath(contractId: string) {
  return COMMERCIAL_API + "/" + encodeURIComponent(contractId) + "/terms";
}
