import { StrictMode } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PriceReconciliationDialog } from "@/components/prices/PriceReconciliationDialog";
import { PRICE_API, type PriceSummary, type ReconciliationLine, type ReconciliationPage } from "@/lib/factory-prices";

const { api } = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiFetch: api }));
const list: PriceSummary = { id: "list-1", version: 3, status: "DRAFT", currency: "ILS", reason: "Factory offer",
  agreement_reference: "QA", created_at: "2026-10-03T08:00:00Z", created_by: "owner", cancelled_at: null, cancellation_reason: null };
const line: ReconciliationLine = { kind: "DOOR", target_id: "type-1", name: "Entrance", unit: "pcs", proposed_name: "Entrance", proposed_unit: "pcs",
  source_type: "DOOR", source_id: "door-1", source_name: "A-101", project_id: "project-1", project_name: "QA object",
  installer_id: "installer-1", installer_name: "QA Installer", effective_from: null, quantity: null,
  legacy_price: "125.00", proposed_price: "250.00", delta: "125.00", legacy_variants: 2, uses_snapshot: true, uses_surcharge: true,
  catalog_changed: false, source_available: true, review_required: true, status: "DIFFERENT" };
const report: ReconciliationPage = { price_list_id: list.id, version: 3, currency: "ILS", generated_at: "2026-10-03T09:00:00Z", items: [line], total: 25,
  application_check: { status: "BLOCKED", affects_earnings: false, confirmed_at: null,
    blockers: [{ code: "NOT_CONFIRMED", count: 1 }], review: [{ code: "UNACCRUED_WORK", count: 3 }] },
  summary: { total_sources: 30, review_sources: 25, matching: 5, different: 10, missing_proposed: 5, missing_legacy: 3, unavailable: 2,
    unit_changed: 5, scheduled_rates: 2, door_snapshots: 2, door_surcharges: 1, catalog_changes: 5,
    urgency_surcharges: 1, historical_entries: 50, pending_addon_facts: 3, multiple_rate_types: 2 } };

function mount(baseline = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const close = vi.fn();
  const view = render(<StrictMode><QueryClientProvider client={client}><PriceReconciliationDialog list={baseline ? undefined : list} onClose={close} /></QueryClientProvider></StrictMode>);
  return { ...view, close, client };
}

describe("factory rate reconciliation", () => {
  beforeEach(() => { api.mockReset(); api.mockResolvedValue(report); window.localStorage.setItem("dimax_locale", "en"); });
  it("shows price sources and review flags without issuing a mutation", async () => {
    mount(); await screen.findByText("A-101");
    expect(screen.getByText("QA object")).toBeInTheDocument();
    expect(screen.getByText("QA Installer")).toBeInTheDocument();
    expect(screen.getByText("+125.00 ILS")).toBeInTheDocument();
    expect(screen.getByText("Recorded earnings remain unchanged.", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("Saved additional work without accrual requires a separate pricing decision.")).toBeInTheDocument();
    expect(screen.getByText("Work types with different existing prices: 2")).toBeInTheDocument();
    expect(screen.getByText("Different existing prices: 2")).toBeInTheDocument();
    expect(screen.getByText("Factory has not confirmed this version: 1")).toBeInTheDocument();
    expect(screen.getByText("Prices are not active in earnings. This check does not activate them.")).toBeInTheDocument();
    expect(api.mock.calls.every(([, options]) => !options.method && options.signal)).toBe(true);
    expect(screen.queryByRole("button", { name: /activate|approve|save/i })).not.toBeInTheDocument();
  });
  it("distinguishes verified data from active earnings and fails closed without a check", async () => {
    api.mockResolvedValue({ ...report, application_check: { status: "VERIFIED", affects_earnings: false, confirmed_at: report.generated_at, blockers: [], review: [] } });
    mount(); await screen.findByText("Factory decision and price coverage verified");
    expect(screen.getByText("Prices are not active in earnings. This check does not activate them.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /activate|apply prices/i })).not.toBeInTheDocument();
    api.mockResolvedValue({ ...report, application_check: null });
    fireEvent.click(screen.getByRole("button", { name: "Refresh reconciliation" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Application check is unavailable");
    expect(screen.queryByText("Factory decision and price coverage verified")).not.toBeInTheDocument();
  });
  it("keeps a matching rate flagged when other existing prices differ", async () => {
    api.mockResolvedValue({ ...report, total: 1, items: [{ ...line, source_type: "INSTALLER_RATE", status: "MATCH",
      legacy_price: "250.00", delta: "0.00", uses_snapshot: false, uses_surcharge: false }] });
    mount(); await screen.findByText("Matches");
    expect(screen.getByText("Different existing prices: 2")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Only items requiring review" })).toBeChecked();
  });
  it("paginates and resets the page when filters change", async () => {
    const { close } = mount(); await screen.findByText("A-101");
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    await waitFor(() => expect(api).toHaveBeenCalledWith(expect.stringContaining("offset=20&issues_only=true"), expect.anything()));
    fireEvent.change(screen.getByRole("combobox", { name: "Work type" }), { target: { value: "ADDON" } });
    await waitFor(() => expect(api).toHaveBeenCalledWith(expect.stringContaining("offset=0&issues_only=true&kind=ADDON"), expect.anything()));
    fireEvent.click(screen.getByRole("checkbox", { name: "Only items requiring review" }));
    await waitFor(() => expect(api).toHaveBeenCalledWith(expect.stringContaining("offset=0&issues_only=false&kind=ADDON"), expect.anything()));
    fireEvent.click(screen.getAllByRole("button", { name: "Close" })[0]);
    expect(close).toHaveBeenCalledOnce();
  });
  it("does not invent a monetary delta when the unit changed or a price is missing", async () => {
    api.mockResolvedValue({ ...report, total: 2, items: [
      { ...line, source_type: "ADDON_PLAN", source_id: "plan-1", kind: "ADDON", name: "Hourly adjustment", unit: "hour", proposed_unit: "pcs", status: "UNIT_CHANGED", catalog_changed: true, delta: null },
      { ...line, source_id: "door-2", source_name: "B-201", status: "MISSING_PROPOSED", proposed_price: null, delta: null },
    ] });
    mount(); await screen.findByText("Hourly adjustment");
    const table = screen.getByRole("table");
    const rows = within(table).getAllByRole("row");
    expect(within(rows[1]).getAllByRole("cell")[4]).toHaveTextContent("-");
    expect(within(rows[2]).getAllByRole("cell")[3]).toHaveTextContent("-");
    expect(screen.getByText("Units changed; rates cannot be compared directly")).toBeInTheDocument();
    expect(screen.queryByText("+125.00 ILS")).not.toBeInTheDocument();
  });
  it.each([[403, "Price access is unavailable"], [404, "This price-list version is no longer available"], [500, "Could not load reconciliation. Try again."]])(
    "shows an explicit read failure for %s", async (status, message) => {
      api.mockRejectedValue({ status }); mount();
      expect(await screen.findByRole("alert")).toHaveTextContent(message);
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
    },
  );
  it("removes old rows after a refresh fails and allows an explicit retry", async () => {
    mount(); await screen.findByText("A-101");
    api.mockRejectedValue({ status: 500 });
    fireEvent.click(screen.getByRole("button", { name: "Refresh reconciliation" }));
    await screen.findByRole("alert");
    expect(screen.queryByText("A-101")).not.toBeInTheDocument();
    api.mockResolvedValue({ ...report, items: [], total: 0 });
    fireEvent.click(screen.getByRole("button", { name: "Refresh reconciliation" }));
    expect(await screen.findByText("No items for these filters")).toBeInTheDocument();
  });
  it("keeps the empty page and overall review totals distinct", async () => {
    api.mockResolvedValue({ ...report, items: [], total: 0 });
    mount(); await screen.findByText("No items for these filters");
    expect(screen.getByText("0-0 / 0")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
    expect(screen.getByText("Require review").nextElementSibling).toHaveTextContent("25");
  });
  it("loads company inventory without creating a draft", async () => {
    api.mockResolvedValue({ ...report, price_list_id: null, version: null, application_check: null, items: [], total: 0 });
    mount(true); await screen.findByText("No items for these filters");
    expect(screen.getByRole("heading")).toHaveTextContent("Current company prices");
    expect(api).toHaveBeenCalledWith(`${PRICE_API}/reconciliation?limit=20&offset=0&issues_only=true`, expect.objectContaining({ signal: expect.anything() }));
    expect(api.mock.calls.every(([, options]) => !options.method)).toBe(true);
  });
});
