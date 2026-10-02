import { apiFetch } from "@/lib/api";

export const PRICE_API = "/api/v1/admin/price-lists";
export const PRICE_PAGE_SIZE = 20;
export type PriceLine = { kind: "DOOR" | "ADDON"; target_id: string; name: string; unit: string; installer_price: string };
export type PriceSummary = {
  id: string; version: number; status: "DRAFT" | "CONFIRMED" | "CANCELLED"; currency: "ILS";
  reason: string; agreement_reference: string; created_at: string; created_by: string;
  cancelled_at: string | null; cancellation_reason: string | null;
};
export type PriceDetail = PriceSummary & { items: PriceLine[] };
export type PricePage = { items: PriceSummary[]; total: number; latest_version: number };
export type Invitation = {
  id: string; price_list_id: string; factory_name: string; recipient_name: string; recipient_email: string;
  created_at: string; expires_at: string; revoked_at: string | null; revocation_reason: string | null;
  confirmed_at: string | null; confirmed_name: string | null;
};
export type InvitationPage = { items: Invitation[]; total: number };
export type IssuedInvitation = { invitation: Invitation; confirmation_url: string };
export type DraftInput = {
  request_id: string; expected_latest_version: number; reason: string; agreement_reference: string;
  items: Pick<PriceLine, "kind" | "target_id" | "installer_price">[];
};
export type CatalogWork = Omit<PriceLine, "installer_price">;

export function workKey(item: Pick<PriceLine, "kind" | "target_id">): string {
  return `${item.kind}:${item.target_id}`;
}

// Keep monetary input as decimal strings, without binary floating-point rounding.
export function normalizeInstallerPrice(value: string): string | null {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ""] = normalized.split(".");
  const result = `${whole.replace(/^0+(?=\d)/, "")}.${fraction.padEnd(2, "0")}`;
  return result === "0.00" ? null : result;
}

export function invitationStatus(item: Invitation, list: PriceSummary, latest: number, now = Date.now()) {
  if (item.confirmed_at) return "CONFIRMED" as const;
  if (item.revoked_at) return "REVOKED" as const;
  if (list.status === "CANCELLED") return "CANCELLED" as const;
  if (list.version !== latest) return "SUPERSEDED" as const;
  if (new Date(item.expires_at).getTime() <= now) return "EXPIRED" as const;
  return "PENDING" as const;
}

export function isUncertainPriceWrite(error: unknown): boolean {
  const status = typeof error === "object" && error !== null && "status" in error ? Number(error.status) : 0;
  return status === 0 || status >= 500;
}

export function priceErrorStatus(error: unknown): number {
  return typeof error === "object" && error !== null && "status" in error ? Number(error.status) : 0;
}

export async function priceRequest<T>(path: string, body: object): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    return await apiFetch<T>(path, { method: "POST", body: JSON.stringify(body), signal: controller.signal });
  } finally { clearTimeout(timer); }
}

export async function loadPriceCatalog(signal: AbortSignal): Promise<CatalogWork[]> {
  const works: CatalogWork[] = [];
  for (let offset = 0; ; offset += 200) {
    const page = await apiFetch<Array<{ id: string; name: string }>>(
      `/api/v1/admin/door-types?is_active=true&limit=200&offset=${offset}`, { signal },
    );
    works.push(...page.map((row) => ({ kind: "DOOR" as const, target_id: row.id, name: row.name, unit: "pcs" })));
    if (page.length < 200) break;
  }
  const addons = await apiFetch<{ items: Array<{ id: string; name: string; unit: string; is_active: boolean }> }>(
    "/api/v1/admin/addons/types", { signal },
  );
  works.push(...addons.items.filter((row) => row.is_active).map((row) => ({
    kind: "ADDON" as const, target_id: row.id, name: row.name, unit: row.unit,
  })));
  return works;
}
