import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ContractClaimsPanel } from "@/components/accounting/ContractClaimsPanel";
import { LanguageProvider } from "@/lib/i18n";
import { candidate, contractId } from "./commercial-approval-fixture";

const { api } = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiFetch: api }));

const owner = candidate.snapshot.company_id;
const contract = { id: contractId, factory_name: "Synthetic factory", reference: "TEST", reason: "Test only", status: "DRAFT" as const,
  currency: "ILS" as const, is_demo: true, created_by: owner, created_at: "2026-10-21T10:00:00Z" };
const period = { start: "2026-11-10", end: "2026-12-09", signed_journals: 1, rated_lines: 2, unrated_lines: 1, amount_ex_vat: "650.00",
  blocked_reason: null, vat: null, estimate_only: true as const };
const draft = { id: "4c1e2d3f-5a6b-4c7d-8e9f-0a1b2c3d4e5f", contract_id: contractId, period_start: "2026-11-10", period_end: "2026-12-09",
  number: 1, version: 1, kind: "MAIN" as const, status: "DRAFT" as const, currency: "ILS" as const, amount_ex_vat: "650.00", vat: null,
  lines_count: 2, supersedes_claim_id: null, issued_at: null, cancelled_at: null, cancellation_reason: null, superseded_at: null,
  created_at: "2026-12-20T10:00:00Z" };
const line = (label: string, extra: object) => ({ id: null, item_kind: "DOOR", journal_id: owner, journal_item_id: crypto.randomUUID(), project_name: "Claim site",
  label, work_date: "2026-11-15", quantity: "1", unit: "pcs", unit_price_ex_vat: "400.00", amount_ex_vat: "400.00", price_version: 3,
  agreement_id: owner, reason: "RATED", state: "CLAIMABLE", claimed_in: null, ...extra });
let claims: object[] = [];

function reads(url: string, init?: RequestInit) {
  if (init?.method === "POST") {
    const body = JSON.parse(String(init.body));
    if (url.endsWith("/claims")) { claims = [draft]; return { ...draft, lines: [], issue_snapshot: null, request: body }; }
    if (url.endsWith("/issue")) { claims = [{ ...draft, status: "ISSUED", issued_at: "2026-12-21T09:00:00Z" }]; return { ...claims[0], lines: [], issue_snapshot: {} }; }
    if (url.endsWith("/cancel")) { claims = [{ ...draft, status: "CANCELLED", cancelled_at: "x", cancellation_reason: body.reason }]; return { ...claims[0], lines: [], issue_snapshot: null }; }
    throw new Error("Unexpected POST " + url);
  }
  if (url.endsWith("/periods")) return { items: [period], cutover: "2026-11-10", today: "2026-12-20", current_start: "2026-12-10", undated_lines: 0, activation_enabled: true, estimate_only: true };
  if (url.includes("/claims/periods/2026-11-10")) return {
    start: "2026-11-10", end: "2026-12-09", blocked_reason: null, claimed_lines: 0, claimed_amount_ex_vat: "0.00", claimable_lines: 2,
    claimable_amount_ex_vat: "650.00", backlog_lines: 1, claims,
    lines: [line("E-1", {}), line("A-1", { item_kind: "ADDON", quantity: "2.5", unit: "hour", unit_price_ex_vat: "100.00", amount_ex_vat: "250.00" }),
      line("E-2", { unit_price_ex_vat: null, amount_ex_vat: null, price_version: null, reason: "NO_RATE", state: "BACKLOG" })] };
  if (url.includes("/claims?")) return { items: claims, total: claims.length };
  throw new Error("Unexpected URL " + url);
}
function mount(node: React.ReactNode) {
  return render(<LanguageProvider><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{node}</QueryClientProvider></LanguageProvider>);
}

describe("factory claims", () => {
  beforeEach(() => { localStorage.setItem("dimax_locale", "en"); claims = []; api.mockReset(); api.mockImplementation(async (url: string, init?: RequestInit) => reads(url, init)); });

  it("shows claimed, claimable and backlog rows of a period, composes a package and issues it after a review", async () => {
    mount(<ContractClaimsPanel contract={contract} />);
    fireEvent.change(await screen.findByLabelText("Period"), { target: { value: "2026-11-10" } });
    const view = await screen.findByTestId("claim-period");
    expect(within(view).getAllByText("Claimable").length).toBeGreaterThan(0);
    const rows = within(view).getAllByTestId("claim-line");
    expect(rows).toHaveLength(3);
    expect(rows[2]).toHaveTextContent("Backlog");
    expect(rows[2]).toHaveTextContent("No rate for this work");
    expect(within(view).queryByText(/VAT:/)).toBeNull();
    fireEvent.click(within(view).getByRole("button", { name: "Compose package" }));
    await waitFor(() => expect(api).toHaveBeenCalledWith(expect.stringMatching(/\/claims$/), expect.objectContaining({ method: "POST" }), expect.anything()));
    const [, init] = api.mock.calls.find(([url, i]) => String(url).endsWith("/claims") && i?.method === "POST")!;
    const body = JSON.parse(String((init as RequestInit).body));
    expect(body.period_start).toBe("2026-11-10");
    expect(body.request_id).toMatch(/[0-9a-f-]{36}/);
    expect(body).not.toHaveProperty("amount");
    const row = await screen.findByTestId("claim-row");
    expect(row).toHaveTextContent("1.1");
    expect(row).toHaveTextContent("Draft");
    fireEvent.click(within(row).getByRole("button", { name: "Issue" }));
    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByRole("button", { name: "Issue" })).toBeDisabled();
    fireEvent.click(dialog.getByLabelText("I reviewed every line of this package"));
    fireEvent.click(dialog.getByRole("button", { name: "Issue" }));
    await waitFor(() => expect(api).toHaveBeenCalledWith(expect.stringMatching(/\/issue$/), expect.objectContaining({ method: "POST" }), expect.anything()));
    const [, issueInit] = api.mock.calls.find(([url]) => String(url).endsWith("/issue"))!;
    expect(JSON.parse(String((issueInit as RequestInit).body))).toMatchObject({ expected_lines_count: 2, reviewed: true });
    expect(await screen.findByText("Issued")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Correct" })).toBeInTheDocument();
  });

  it("cancels a draft only with a reason and tells the owner when claims are switched off", async () => {
    claims = [draft];
    mount(<ContractClaimsPanel contract={contract} />);
    const row = await screen.findByTestId("claim-row");
    fireEvent.click(within(row).getByRole("button", { name: "Cancel draft" }));
    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByRole("button", { name: "Cancel draft" })).toBeDisabled();
    fireEvent.change(dialog.getByLabelText("Reason"), { target: { value: "Wrong period" } });
    fireEvent.click(dialog.getByRole("button", { name: "Cancel draft" }));
    await waitFor(() => expect(api).toHaveBeenCalledWith(expect.stringMatching(/\/cancel$/), expect.objectContaining({ method: "POST", body: expect.stringContaining("Wrong period") }), expect.anything()));
    api.mockRejectedValue({ status: 409 });
    mount(<ContractClaimsPanel contract={contract} />);
    expect(await screen.findByText("Claims are switched off on this server.")).toBeInTheDocument();
  });
});
