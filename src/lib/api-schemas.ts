import { z } from "zod";

// Runtime shapes for the payloads the UI must never render from a broken
// response: the session, factory prices and recorded earnings. Objects use
// passthrough() so new backend fields never fail validation; only the fields
// the UI reads are checked.

export const authMeSchema = z
  .object({
    role: z.string(),
    admin_scope: z.string().nullable().optional(),
    can_view_rates: z.boolean().nullable().optional(),
    can_manage_imports: z.boolean().nullable().optional(),
    can_manage_users: z.boolean().nullable().optional(),
  })
  .passthrough();

const priceKindSchema = z.enum(["DOOR", "ADDON", "STAGE"]);

export const priceLineSchema = z
  .object({
    kind: priceKindSchema,
    target_id: z.string(),
    stage_code: z.string().nullable().optional(),
    name: z.string(),
    unit: z.string(),
    installer_price: z.string(),
  })
  .passthrough();

export const priceSummarySchema = z
  .object({
    id: z.string(),
    version: z.number(),
    status: z.enum(["DRAFT", "CONFIRMED", "CANCELLED"]),
    currency: z.literal("ILS"),
    reason: z.string(),
    agreement_reference: z.string(),
    created_at: z.string(),
    created_by: z.string(),
    cancelled_at: z.string().nullable(),
    cancellation_reason: z.string().nullable(),
  })
  .passthrough();

export const priceDetailSchema = priceSummarySchema.extend({
  items: z.array(priceLineSchema),
});

export const pricePageSchema = z
  .object({
    items: z.array(priceSummarySchema),
    total: z.number(),
    latest_version: z.number(),
  })
  .passthrough();

export const companyPricingStateSchema = z
  .object({
    mode: z.enum(["LEGACY", "FACTORY"]),
    active_price: z
      .object({
        price_list_id: z.string(),
        version: z.number(),
        currency: z.literal("ILS"),
        effective_from: z.string(),
        items: z.array(
          z
            // The device snapshot carries door and addon rates only; stage rates stay server-side (0090).
            .object({ kind: z.enum(["DOOR", "ADDON"]), target_id: z.string(), unit: z.string(), rate: z.string() })
            .passthrough(),
        ),
      })
      .passthrough()
      .nullable(),
  })
  .passthrough();

const moneyLike = z.union([z.string(), z.number()]);

export const earningsLedgerItemSchema = z
  .object({
    id: z.string(),
    entry_type: z.enum(["ORIGINAL", "REVERSAL", "CORRECTION"]),
    correction_ref_id: z.string().nullable(),
    completed_at: z.string(),
    quantity: moneyLike,
    rate_snapshot: moneyLike,
    amount_snapshot: moneyLike,
    reason: z.string().nullable(),
    work_kind: priceKindSchema,
    project_id: z.string().nullable(),
    project_name: z.string().nullable(),
    door_id: z.string().nullable(),
    door_label: z.string().nullable(),
    door_code: z.string().nullable(),
    addon_fact_id: z.string().nullable(),
    addon_type_id: z.string().nullable().optional(),
    addon_type_name: z.string().nullable().optional(),
    addon_comment: z.string().nullable().optional(),
    stage_fact_id: z.string().nullable().optional(),
    stage_code: z.string().nullable().optional(),
    installer_id: z.string(),
    installer_name: z.string().nullable(),
    can_correct: z.boolean(),
    work_price: z
      .object({ id: z.string(), approval_id: z.string(), reason: z.string(), accrued_at: z.string() })
      .passthrough()
      .nullable()
      .optional(),
  })
  .passthrough();

export const earningsLedgerResponseSchema = z
  .object({
    items: z.array(earningsLedgerItemSchema),
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
  })
  .passthrough();
