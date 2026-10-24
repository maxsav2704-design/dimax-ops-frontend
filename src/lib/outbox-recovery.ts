import { z } from "zod";
import { apiFetch } from "@/lib/api";

export const recoveryPath = "/api/v1/admin/outbox/recovery";
export const recoveryPageSize = 10;
const action = z.enum(["HOLD", "RETRY", "ACCEPTED"]);
export const recoveryStatusSchema = z.object({
  epoch: z.string().uuid().nullable(), recovery_id: z.string().uuid().nullable(),
  state: z.enum(["NOT_ACTIVATED", "CONFIGURATION_REQUIRED", "REVIEW_REQUIRED", "REVIEW", "RELEASED"]),
  unresolved: z.number().int().nonnegative(), held: z.number().int().nonnegative(),
});
export const recoveryItemSchema = z.object({
  id: z.string().uuid(), recovery_id: z.string().uuid(), outbox_id: z.string().uuid(),
  action: action.nullable(), revision: z.number().int().nonnegative(),
});
export const recoveryDecisionSchema = z.object({
  id: z.string().uuid(), item_id: z.string().uuid(), request_id: z.string().uuid(),
  action, revision: z.number().int().positive(), reason: z.string(), evidence: z.string(),
  accepted_at: z.string().nullable(), actor_id: z.string().uuid(), created_at: z.string(),
});
const messageSchema = z.object({
  id: z.string().uuid(), channel: z.enum(["EMAIL", "WHATSAPP"]), recipient: z.string().nullable(),
  subject: z.string().nullable(), attachment_name: z.string().nullable(),
  status: z.enum(["PENDING", "FAILED", "SENT"]), scheduled_at: z.string(), sent_at: z.string().nullable(),
});
export type RecoveryItem = z.infer<typeof recoveryItemSchema>;
export type RecoveryDecision = z.infer<typeof recoveryDecisionSchema>;
export type RecoveryStatus = z.infer<typeof recoveryStatusSchema>;
export type RecoveryAction = z.infer<typeof action>;
export type RecoveryRow = RecoveryItem & { message: z.infer<typeof messageSchema> };
export type RecoveryRequest = {
  request_id: string; expected_revision: number; action: RecoveryAction;
  reason: string; evidence: string; accepted_at: string | null;
};

export async function fetchRecoveryRows(recoveryId: string, offset: number, signal: AbortSignal): Promise<RecoveryRow[]> {
  const items = await apiFetch(`${recoveryPath}/items?offset=${offset}&limit=${recoveryPageSize}`, { signal }, { schema: z.array(recoveryItemSchema) });
  if (items.some(item => item.recovery_id !== recoveryId)) throw new Error("Recovery changed");
  return Promise.all(items.map(async item => {
    // Bounded to one page. Do not retrieve raw payloads or approval tokens.
    const message = await apiFetch(`/api/v1/admin/outbox/${encodeURIComponent(item.outbox_id)}`, { signal }, { schema: messageSchema });
    if (message.id !== item.outbox_id) throw new Error("Message identity changed");
    return { ...item, message };
  }));
}

export const recoveryUtcOffsets = Array.from({ length: 105 }, (_, index) => {
  const minutes = index * 15 - 720;
  return `${minutes < 0 ? "-" : "+"}${String(Math.floor(Math.abs(minutes) / 60)).padStart(2, "0")}:${String(Math.abs(minutes) % 60).padStart(2, "0")}`;
});

export function providerAcceptedAt(wallTime: string, offset: string, now = Date.now()): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(wallTime) || !recoveryUtcOffsets.includes(offset)) return null;
  const local = new Date(`${wallTime}:00Z`);
  if (!Number.isFinite(local.getTime()) || local.toISOString().slice(0, 16) !== wallTime) return null;
  const value = new Date(`${wallTime}:00${offset}`);
  return value.getTime() <= now ? value.toISOString() : null;
}
