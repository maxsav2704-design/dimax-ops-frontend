import { z } from "zod";
import { apiBaseUrl, ApiError } from "./api";
import { commercialDetailSchema, COMMERCIAL_API } from "./commercial-prices";
import { termsDetailSchema } from "./contract-terms";

export const agreementSchema = z.object({
  company_id: z.string().uuid(), company_name: z.string(), contract_id: z.string().uuid(),
  contract_reference: z.string(), factory_name: z.string(), is_demo: z.boolean(),
  terms: termsDetailSchema, price: commercialDetailSchema,
});
export const candidateSchema = z.object({
  snapshot: agreementSchema, snapshot_hash: z.string().regex(/^[a-f0-9]{64}$/),
  contact: z.object({ id: z.string().uuid(), factory_name: z.string(), recipient_name: z.string(),
    recipient_email: z.string().email(), authority_reference: z.string() }).nullable(),
});
export const approvalSummarySchema = z.object({
  id: z.string().uuid(), contract_id: z.string().uuid(), terms_id: z.string().uuid(), price_id: z.string().uuid(),
  terms_version: z.number().int().positive(), price_version: z.number().int().positive(),
  factory_contact_id: z.string().uuid(), recipient_name: z.string(), recipient_email: z.string(),
  created_at: z.string(), expires_at: z.string(), confirmed_at: z.string().nullable(), confirmed_name: z.string().nullable(),
  revoked_at: z.string().nullable(), revocation_reason: z.string().nullable(), mailbox_verified_at: z.string().nullable(),
  snapshot_hash: z.string(), email_outbox_id: z.string().uuid(), delivery_status: z.string(),
  status: z.enum(["PENDING", "CONFIRMED", "REVOKED", "EXPIRED", "SUPERSEDED", "CONTACT_CHANGED"]),
  is_demo: z.boolean(), usable_for_billing: z.literal(false),
});
export const approvalPageSchema = z.object({ items: z.array(approvalSummarySchema), total: z.number().int().nonnegative() });
export const approvalDetailSchema = approvalSummarySchema.extend({ snapshot: agreementSchema });
export const publicCommercialSchema = z.object({
  snapshot: agreementSchema, snapshot_hash: z.string().regex(/^[a-f0-9]{64}$/), recipient_name: z.string(),
  expires_at: z.string(), status: z.enum(["PENDING", "CONFIRMED"]), confirmed_at: z.string().nullable(),
  confirmed_name: z.string().nullable(), usable_for_billing: z.literal(false),
});
export const mailboxCodeSchema = z.object({ status: z.literal("QUEUED"), expires_at: z.string(), resend_after: z.string() });
export type CommercialAgreement = z.infer<typeof agreementSchema>;
export type ApprovalCandidate = z.infer<typeof candidateSchema>;
export type CommercialApproval = z.infer<typeof approvalSummarySchema>;
export type PublicCommercialApproval = z.infer<typeof publicCommercialSchema>;
export function approvalsPath(contractId: string) { return COMMERCIAL_API + "/" + encodeURIComponent(contractId) + "/approvals"; }

// Public decisions never carry the administrator's JWT/cookies or trigger auth refresh.
export async function publicCommercialRequest<T>(action: "preview" | "confirm" | "request-code", body: object,
  schema: z.ZodType<T>, signal: AbortSignal): Promise<T> {
  const response = await fetch(apiBaseUrl() + "/api/v1/public/commercial-approvals/" + action, {
    method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" },
    signal, credentials: "omit", cache: "no-store", referrerPolicy: "no-referrer",
  });
  if (!response.ok) throw new ApiError(response.status, "Commercial confirmation failed");
  return schema.parse(await response.json());
}
