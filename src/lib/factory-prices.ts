import { apiFetch } from "@/lib/api";

export const PRICE_API = "/api/v1/admin/price-lists";
export const PRICE_PAGE_SIZE = 20;
export type CompanyPricingState = {
  mode: "LEGACY" | "FACTORY";
  active_price: null | {
    price_list_id: string; version: number; currency: "ILS"; effective_from: string;
    items: Array<{ kind: "DOOR" | "ADDON"; target_id: string; unit: string; rate: string }>;
  };
};
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
  mailbox_verified_at?: string | null;
};
export type InvitationPage = { items: Invitation[]; total: number };
export type IssuedInvitation = { invitation: Invitation; confirmation_url: string; email_outbox_id?: string | null };
export type DraftInput = {
  request_id: string; expected_latest_version: number; reason: string; agreement_reference: string;
  items: Pick<PriceLine, "kind" | "target_id" | "installer_price">[];
};
export type CatalogWork = Omit<PriceLine, "installer_price">;
export type ReconciliationSource = "INSTALLER_RATE" | "SCHEDULED_RATE" | "DOOR" | "ADDON_PLAN" | "ADDON_DEFAULT" | "ADDON_FACT" | "CATALOG";
export type ReconciliationStatus = "MATCH" | "DIFFERENT" | "MISSING_PROPOSED" | "MISSING_LEGACY" | "UNAVAILABLE" | "UNIT_CHANGED";
export type PriceApplicationIssueCode = "NOT_CONFIRMED" | "CONFIRMATION_MISSING" | "CONFIRMATION_MISMATCH" | "SUPERSEDED_CONFIRMED" |
  "NO_ITEMS" | "MISSING_DOOR_PRICES" | "MISSING_ADDON_PRICES" | "UNAVAILABLE_WORK" | "CATALOG_CHANGED" | "INSTALLER_SURCHARGES" |
  "LEGACY_DIFFERENCES" | "DOOR_SNAPSHOTS" | "SCHEDULED_RATES" | "UNACCRUED_WORK" | "URGENCY_CHARGES";
export type PriceApplicationCheck = {
  status: "BLOCKED" | "REVIEW_REQUIRED" | "VERIFIED"; affects_earnings: false; confirmed_at: string | null;
  blockers: Array<{ code: PriceApplicationIssueCode; count: number }>;
  review: Array<{ code: PriceApplicationIssueCode; count: number }>;
};
export type ReconciliationLine = {
  kind: "DOOR" | "ADDON"; target_id: string; name: string; unit: string;
  proposed_name: string | null; proposed_unit: string | null;
  source_type: ReconciliationSource; source_id: string; source_name: string | null;
  project_id: string | null; project_name: string | null; installer_id: string | null; installer_name: string | null;
  effective_from: string | null; quantity: string | null;
  legacy_price: string | null; proposed_price: string | null; delta: string | null; legacy_variants: number;
  uses_snapshot: boolean; uses_surcharge: boolean; catalog_changed: boolean;
  source_available: boolean; review_required: boolean; status: ReconciliationStatus;
};
export type ReconciliationPage = {
  price_list_id: string | null; version: number | null; currency: "ILS"; generated_at: string;
  application_check: PriceApplicationCheck | null;
  summary: {
    total_sources: number; review_sources: number; matching: number; different: number;
    missing_proposed: number; missing_legacy: number; unavailable: number; unit_changed: number;
    scheduled_rates: number; door_snapshots: number; door_surcharges: number; catalog_changes: number;
    urgency_surcharges: number; historical_entries: number; pending_addon_facts: number; multiple_rate_types: number;
  };
  items: ReconciliationLine[]; total: number;
};

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
