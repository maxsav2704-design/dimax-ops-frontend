import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PriceActivationDialog } from "@/components/prices/PriceActivationDialog";
import { activationCopy } from "@/components/prices/activation-copy";
import { PRICE_API, type PriceDetail, type PriceApplicationCheck, type CompanyPricingState } from "@/lib/factory-prices";

const { api } = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiFetch: api }));
const list: PriceDetail = {
  id: "new-list", version: 2, status: "CONFIRMED", currency: "ILS", reason: "QA agreement",
  agreement_reference: "Agreement 42", created_at: "2026-10-10T08:00:00Z", created_by: "owner",
  cancelled_at: null, cancellation_reason: null, items: [],
};
const t = activationCopy.en;
let check: PriceApplicationCheck;
let state: CompanyPricingState;
let fail: number | undefined;
const changed = vi.fn();
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><PriceActivationDialog list={list} onClose={vi.fn()} onChanged={changed} /></QueryClientProvider>);
}
async function fill() {
  await waitFor(() => expect(screen.getByLabelText(t.reason)).toBeEnabled());
  fireEvent.change(screen.getByLabelText(t.reason), { target: { value: " Reviewed factory amendment " } });
  fireEvent.click(screen.getByRole("checkbox"));
}

describe("reviewed price activation", () => {
  beforeEach(() => {
    check = { status: "REVIEW_REQUIRED", affects_earnings: false, confirmed_at: "2026-10-10T09:00:00Z",
      blockers: [], review: [{ code: "LEGACY_DIFFERENCES", count: 3 }] };
    state = { mode: "FACTORY", active_price: { price_list_id: "previous-list", version: 1,
      currency: "ILS", effective_from: "2026-10-09T09:00:00Z", items: [] } };
    fail = undefined; changed.mockClear(); api.mockReset();
    api.mockImplementation(async (path: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        if (fail !== undefined) throw { status: fail };
        return { id: "activation", price_list_id: list.id, approval_id: "approval", effective_from: "2026-10-10T12:00:00Z", reason: "Reviewed factory amendment", created_by: "owner" };
      }
      if (path === `${PRICE_API}/state`) return state;
      if (path.includes("/reconciliation?")) return { price_list_id: list.id, version: 2, application_check: check };
      throw new Error(`Unexpected request: ${path}`);
    });
  });
  it("requires review and reason and submits the observed active version only once", async () => {
    mount();
    expect(screen.getByRole("button", { name: t.submit })).toBeDisabled();
    await screen.findByText("v1");
    expect(screen.getByText(/Existing price differences to reconcile: 3/)).toBeInTheDocument();
    expect(api.mock.calls.every(([, init]) => !init?.method)).toBe(true);
    await fill();
    const button = screen.getByRole("button", { name: t.submit });
    fireEvent.click(button); fireEvent.click(button);
    await screen.findByText(t.success);
    const writes = api.mock.calls.filter(([, init]) => init?.method === "POST");
    expect(writes).toHaveLength(1);
    expect(writes[0][0]).toBe(`${PRICE_API}/new-list/activate`);
    expect(JSON.parse(writes[0][1].body)).toEqual({ request_id: expect.any(String), expected_active_price_list_id: "previous-list",
      reason: "Reviewed factory amendment", reviewed_transition: true });
    expect(changed).toHaveBeenCalledOnce();
  });
  it("uses an explicit null predecessor for first rollout", async () => {
    state = { mode: "LEGACY", active_price: null };
    mount(); await fill(); fireEvent.click(screen.getByRole("button", { name: t.submit }));
    await screen.findByText(t.success);
    expect(JSON.parse(api.mock.calls.find(([, init]) => init?.method === "POST")![1].body).expected_active_price_list_id).toBeNull();
  });
  it("blocks a legacy confirmation without mailbox evidence", async () => {
    check = { ...check, status: "BLOCKED", blockers: [{ code: "MAILBOX_NOT_VERIFIED", count: 1 }] };
    mount(); await screen.findByText(/This decision has no mailbox verification/);
    expect(screen.getByRole("checkbox")).toBeDisabled();
    expect(screen.getByRole("button", { name: t.submit })).toBeDisabled();
    expect(api.mock.calls.every(([, init]) => !init?.method)).toBe(true);
  });
  it("blocks a version already effective or older than the effective list", async () => {
    state.active_price = { ...state.active_price!, price_list_id: list.id, version: 2 };
    mount(); await screen.findByText(t.already);
    expect(screen.getByRole("button", { name: t.submit })).toBeDisabled();
  });
  it("fails closed when a current application check cannot be loaded", async () => {
    api.mockRejectedValue({ status: 503 });
    mount(); await screen.findByText(t.error);
    expect(screen.getByRole("button", { name: t.submit })).toBeDisabled();
  });
  it.each([0, 503, 403, 409, 422])("does not blindly retry after server status %s", async (status) => {
    fail = status; mount(); await fill();
    fireEvent.click(screen.getByRole("button", { name: t.submit }));
    await screen.findByRole("alert");
    expect(screen.getByRole("button", { name: t.submit })).toBeDisabled();
    expect(screen.getByRole("button", { name: t.refresh })).toBeDisabled();
    expect(api.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
    expect(changed).toHaveBeenCalledOnce();
  });
  it("requires renewed consent after refreshing conditions", async () => {
    mount(); await fill();
    fireEvent.click(screen.getByRole("button", { name: t.refresh }));
    await waitFor(() => expect(screen.getByRole("button", { name: t.refresh })).toBeEnabled());
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(screen.getByRole("button", { name: t.submit })).toBeDisabled();
  });
});
