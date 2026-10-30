import { z } from "zod";
import { apiFetch, type ResponseSchema } from "@/lib/api";

export const COMMERCIAL_API = "/api/v1/admin/accounting/contracts";
export const COMMERCIAL_PAGE_SIZE = 20;

// Commercial zero is explicit, not a missing rate. Never round input with Number().
export function normalizeCommercialPrice(value: string): string | null {
  const input = value.trim().replace(",", ".");
  if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(input)) return null;
  const [whole, fraction = ""] = input.split(".");
  return whole.replace(/^0+(?=\d)/, "") + "." + fraction.padEnd(2, "0");
}

export const contractSchema = z.object({
  id: z.string().uuid(), factory_name: z.string(), reference: z.string(), reason: z.string(),
  currency: z.literal("ILS"), status: z.literal("DRAFT"), is_demo: z.boolean(),
  created_by: z.string().uuid(), created_at: z.string().datetime({ offset: true }),
});
export const contractPageSchema = z.object({
  items: z.array(contractSchema), total: z.number().int().nonnegative(),
});
export const commercialLineSchema = z.object({
  kind: z.enum(["INSTALLATION", "STAGE", "ADDON"]), target_id: z.string().uuid(),
  stage_code: z.string().regex(/^([A-Z][A-Z0-9_]{0,39})?$/),
  name: z.string(), unit: z.string(),
  unit_price_ex_vat: z.string().refine((value) => normalizeCommercialPrice(value) !== null),
});
export const commercialSummarySchema = z.object({
  id: z.string().uuid(), contract_id: z.string().uuid(), version: z.number().int().positive(),
  status: z.literal("DRAFT"), proposed_from: z.string().date(),
  reason: z.string(), agreement_reference: z.string(),
  created_by: z.string().uuid(), created_at: z.string().datetime({ offset: true }),
  currency: z.literal("ILS"), vat_basis: z.literal("EXCLUSIVE"),
  factory_confirmed: z.literal(false), usable_for_billing: z.literal(false), is_demo: z.boolean(),
});
export const commercialDetailSchema = commercialSummarySchema.extend({ items: z.array(commercialLineSchema) });
export const commercialPageSchema = z.object({
  items: z.array(commercialSummarySchema), total: z.number().int().nonnegative(),
  latest_version: z.number().int().nonnegative(),
});
export type CommercialContract = z.infer<typeof contractSchema>;
export type CommercialPrice = z.infer<typeof commercialDetailSchema>;
export type CommercialLine = z.infer<typeof commercialLineSchema>;
export type CommercialPriceInput = {
  request_id: string; expected_latest_version: number; proposed_from: string;
  reason: string; agreement_reference: string;
  items: Pick<CommercialLine, "kind" | "target_id" | "stage_code" | "unit_price_ex_vat">[];
};
export function commercialLineKey(line: Pick<CommercialLine, "kind" | "target_id" | "stage_code">) {
  return [line.kind, line.target_id, line.stage_code].join(":");
}
/** The contract's own API path; every settlement module builds its routes from it. */
export function contractPath(contractId: string) {
  return COMMERCIAL_API + "/" + encodeURIComponent(contractId);
}
export function commercialPricesPath(contractId: string) {
  return contractPath(contractId) + "/prices";
}
export async function commercialWrite<T>(path: string, body: object, schema: ResponseSchema<T>, signal: AbortSignal, method: "POST" | "PATCH" = "POST") {
  return apiFetch(path, { method, body: JSON.stringify(body), signal }, { schema });
}
