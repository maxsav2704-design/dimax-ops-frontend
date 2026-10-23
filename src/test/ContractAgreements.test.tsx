import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ContractApprovalsPanel } from "@/components/accounting/ContractApprovalsPanel";
import { ContractPeriodsPanel } from "@/components/accounting/ContractPeriodsPanel";
import { LanguageProvider } from "@/lib/i18n";
import { candidate, contractId } from "./commercial-approval-fixture";
import type { AgreementPage } from "@/lib/commercial-agreements";

const { api } = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiFetch: api }));

const owner = candidate.snapshot.company_id;
const contract = { id: contractId, factory_name: "Synthetic factory", reference: "TEST", reason: "Test only", status: "DRAFT" as const,
  currency: "ILS" as const, is_demo: true, created_by: owner, created_at: "2026-10-21T10:00:00Z" };
const confirmedRow = {
  id: "7a1d0d4e-6d3f-4f1a-9f0e-5d7a7c6b2c11", contract_id: contractId, terms_id: candidate.snapshot.terms.id, price_id: candidate.snapshot.price.id,
  terms_version: 2, price_version: 3, factory_contact_id: owner, recipient_name: "Factory Representative", recipient_email: "factory@example.com",
  created_at: "2026-10-21T10:00:00Z", expires_at: "2099-01-01T12:00:00Z", confirmed_at: "2026-10-22T09:00:00Z", confirmed_name: "Factory Representative",
  revoked_at: null, revocation_reason: null, mailbox_verified_at: "2026-10-22T09:00:00Z", snapshot_hash: "a".repeat(64),
  email_outbox_id: owner, delivery_status: "SENT", status: "CONFIRMED" as const, is_demo: true, agreement_id: null, usable_for_billing: false as const,
};
const agreement = {
  id: "9b2c4d6e-8f0a-4b1c-9d2e-3f4a5b6c7d8e", contract_id: contractId, terms_id: confirmedRow.terms_id, price_id: confirmedRow.price_id,
  approval_id: confirmedRow.id, terms_version: 2, price_version: 3, billing_basis: "FULL_INSTALLATION" as const, effective_from: "2026-11-10",
  effective_until: null, activated_by: owner, activated_by_name: "Test Owner", activated_at: "2026-10-23T08:00:00Z", reason: "Agreed",
  snapshot_hash: "a".repeat(64), status: "SCHEDULED" as const, is_demo: true, usable_for_billing: false as const,
};
const emptyAgreements: AgreementPage = { items: [], total: 0, activation_enabled: true, cutover: "2026-11-10", today: "2026-10-23", current: null };
const periodSummary = { start: "2026-11-10", end: "2026-12-09", signed_journals: 2, rated_lines: 3, unrated_lines: 1, amount_ex_vat: "1250.50",
  blocked_reason: null, vat: null, estimate_only: true as const };

function reads(url: string, agreements = emptyAgreements) {
  if (url.includes("/agreements?")) return agreements;
  if (url.includes("/approvals?")) return { items: [confirmedRow], total: 1 };
  if (url.includes("/approval-preview?")) return candidate;
  if (url.includes("/terms?")) return { items: [candidate.snapshot.terms], total: 1, latest_version: 2 };
  if (url.includes("/prices?")) return { items: [candidate.snapshot.price], total: 1, latest_version: 3 };
  if (url.endsWith("/periods")) return { items: [periodSummary], cutover: "2026-11-10", today: "2026-12-20", current_start: "2026-12-10", undated_lines: 1, activation_enabled: true, estimate_only: true };
  if (url.includes("/periods/2026-11-10")) return { ...periodSummary, lines: [
    { journal_id: owner, project_name: "Estimate site", kind: "INSTALLATION", label: "E-1", work_date: "2026-11-15", quantity: "1", unit: "pcs",
      unit_price_ex_vat: "400.00", amount_ex_vat: "400.00", price_version: 3, agreement_id: agreement.id, reason: "RATED" },
    { journal_id: owner, project_name: "Estimate site", kind: "INSTALLATION", label: "E-2", work_date: "2026-11-16", quantity: "1", unit: null,
      unit_price_ex_vat: null, amount_ex_vat: null, price_version: null, agreement_id: agreement.id, reason: "NO_RATE" }] };
  throw new Error("Unexpected URL " + url);
}
function mount(node: React.ReactNode) {
  return render(<LanguageProvider><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{node}</QueryClientProvider></LanguageProvider>);
}

describe("commercial activation", () => {
  beforeEach(() => { localStorage.setItem("dimax_locale", "en"); api.mockReset(); api.mockImplementation(async (url: string) => reads(url)); });

  it("lets OWNER put a confirmed pair into effect with a date, reason and explicit consent", async () => {
    mount(<ContractApprovalsPanel contract={contract} />);
    expect(await screen.findByText("No pair is in effect yet.")).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: "Put into effect" }));
    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByRole("button", { name: "Put into effect" })).toBeDisabled();
    const date = dialog.getByLabelText("Effective from") as HTMLInputElement;
    expect(date.value).toBe("2026-11-10");
    fireEvent.change(date, { target: { value: "2026-11-05" } });
    fireEvent.change(dialog.getByLabelText("Reason"), { target: { value: "Agreed with the factory" } });
    fireEvent.click(dialog.getByRole("checkbox"));
    expect(dialog.getByRole("button", { name: "Put into effect" })).toBeDisabled(); // before the accounting start
    fireEvent.change(date, { target: { value: "2026-11-10" } });
    expect(dialog.getByRole("button", { name: "Put into effect" })).toBeEnabled();
    api.mockImplementation(async (url: string, init?: RequestInit) => init?.method === "POST" ? agreement : reads(url, { ...emptyAgreements, items: [agreement], total: 1, current: null }));
    fireEvent.click(dialog.getByRole("button", { name: "Put into effect" }));
    await waitFor(() => expect(api.mock.calls.some(([, init]) => init?.method === "POST")).toBe(true));
    const body = JSON.parse(api.mock.calls.find(([, init]) => init?.method === "POST")![1].body);
    expect(body).toEqual({ request_id: expect.any(String), approval_id: confirmedRow.id, effective_from: "2026-11-10", reason: "Agreed with the factory", accepted: true });
    expect(await screen.findByText(/Scheduled/)).toBeInTheDocument();
  });

  it("hides activation when the server flag is off or the decision is already in effect", async () => {
    api.mockImplementation(async (url: string) => reads(url, { ...emptyAgreements, activation_enabled: false }));
    mount(<ContractApprovalsPanel contract={contract} />);
    await screen.findByText("No pair is in effect yet.");
    await screen.findByText("Confirmed");
    expect(screen.queryByRole("button", { name: "Put into effect" })).not.toBeInTheDocument();
  });

  it("shows the period estimate without VAT and explains unrated lines", async () => {
    mount(<ContractPeriodsPanel contract={contract} />);
    expect(await screen.findByText("2026-11-10 – 2026-12-09")).toBeInTheDocument();
    expect(screen.getByText(/VAT is not calculated/)).toBeInTheDocument();
    expect(screen.getByText(/Lines without a work date/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "2026-11-10 – 2026-12-09" }));
    expect(await screen.findByText("E-2")).toBeInTheDocument();
    expect(screen.getByText(/No rate for this work in the pair in effect/)).toBeInTheDocument();
    expect(screen.getAllByText(/400\.00/).length).toBeGreaterThan(0);
  });

  it("tells the owner when the stage is switched off on the server", async () => {
    api.mockRejectedValue({ status: 409 });
    mount(<ContractPeriodsPanel contract={contract} />);
    expect(await screen.findByText("Activation is switched off on this server.")).toBeInTheDocument();
  });
});
