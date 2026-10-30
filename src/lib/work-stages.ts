import { z } from "zod";

// Work stages (backend 0088): catalog, versioned plans per door type, a plan per door, per-stage
// installers and immutable execution facts. No price or earning ever travels through these calls.
export const stageDefinitionSchema = z.object({
  id: z.string().uuid(), code: z.string(), name: z.string(), sort_order: z.number().int(), is_active: z.boolean(),
});
export const stagePlanSchema = z.object({
  id: z.string().uuid(), door_type_id: z.string().uuid(), version: z.number().int().positive(), reason: z.string(),
  created_by: z.string().uuid(), created_at: z.string(),
  items: z.array(z.object({ stage_code: z.string(), required: z.boolean(), sequence: z.number().int() })),
});
export const stagePlanPageSchema = z.object({ items: z.array(stagePlanSchema), latest_version: z.number().int().nonnegative() });
export const doorStageSchema = z.object({
  stage_code: z.string(), name: z.string(), required: z.boolean(), sequence: z.number().int(),
  installer_id: z.string().uuid().nullable(), assignment_id: z.string().uuid().nullable(),
  completed_at: z.string().nullable(), completed_by: z.string().uuid().nullable(), fact_id: z.string().uuid().nullable(),
  // Step 4: the earning that values the fact, or why there is none. Never an amount.
  earning_id: z.string().uuid().nullable().optional(),
  earning_status: z.enum(["RECORDED", "NO_RATE", "PRICING_INACTIVE"]).nullable().optional(),
});
export const doorStagesSchema = z.object({
  door_id: z.string().uuid(), door_status: z.string(), door_version: z.number().int(), plan_id: z.string().uuid(),
  plan_version: z.number().int(), stages: z.array(doorStageSchema), required_total: z.number().int(),
  required_done: z.number().int(), installed_by_stages: z.boolean(),
});
export const stageCompletionSchema = z.object({
  id: z.string().uuid(), status: z.string(), version: z.number().int(), applied: z.boolean(),
  required_total: z.number().int(), required_done: z.number().int(), door_installed: z.boolean(),
  earning_status: z.enum(["RECORDED", "NO_RATE", "PRICING_INACTIVE"]).nullable().optional(),
});

export type StageDefinition = z.infer<typeof stageDefinitionSchema>;
export type StagePlan = z.infer<typeof stagePlanSchema>;
export type DoorStages = z.infer<typeof doorStagesSchema>;
export type DoorStage = z.infer<typeof doorStageSchema>;

export const WORK_STAGES_API = "/api/v1/admin/work-stages";
export function stagePlansPath(doorTypeId: string) { return "/api/v1/admin/door-types/" + encodeURIComponent(doorTypeId) + "/stage-plans"; }
export function doorStagesPath(doorId: string) { return "/api/v1/admin/doors/" + encodeURIComponent(doorId) + "/stages"; }
export function doorWorkPlanPath(doorId: string) { return "/api/v1/admin/doors/" + encodeURIComponent(doorId) + "/work-plan"; }
export const STAGE_CODE = /^[A-Za-z][A-Za-z0-9_]{0,39}$/;
