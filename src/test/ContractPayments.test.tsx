import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ContractPaymentsPanel } from "@/components/accounting/ContractPaymentsPanel";
import { ApiError } from "@/lib/api";
import { LanguageProvider } from "@/lib/i18n";
import { candidate, contractId } from "./commercial-approval-fixture";

const { api } = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock("@/lib/api", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/api")>()), apiFetch: api }));

const owner = candidate.snapshot.company_id;
const claimId = "4c1e2d3f-5a6b-4c7d-8e9f-0a1b2c3d4e5f";
const paymentId = "8c1e2d3f-5a6b-4c7d-8e9f-0a1b2c3d4e5f";
const claim = { id: claimId, contract_id: contractId, period_start: "2026-11-10", period_end: "2026-12-09", number: 1, version: 1, kind: "MAIN", status: "ISSUED",
  currency: "ILS", amount_ex_vat: "20000.00", vat: null, lines_count: 2, supersedes_claim_id: null, issued_at: "2026-12-21T09:00:00Z", cancelled_at: null,
  cancellation_reason: null, superseded_at: null, created_at: "2026-12-20T10:00:00Z" };
const contract = { id: contractId, factory_name: "Synthetic factory", reference: "TEST", reason: "Test only", status: "DRAFT" as const, currency: "ILS" as const,
  is_demo: true, created_by: owner, created_at: "2026-10-21T10:00:00Z" };
const proof = { id: "9c1e2d3f-5a6b-4c7d-8e9f-0a1b2c3d4e5f", claim_id: paymentId, filename: "statement.pdf", content_type: "application/pdf", size: 10, sha256: "a".repeat(64), created_at: "x" };
const base = { id: paymentId, contract_id: contractId, currency: "ILS", amount: "15000.00", received_on: "2027-01-10", counterparty_name: "Factory Ltd", bank_reference: "TRX-1",
  stated_purpose: null, purpose_kind: "SETTLEMENT", tax_basis: "EX_VAT", allocatable: true, status: "DRAFT", proof: null, allocated: "0.00", reserved: "0.00", refunded: "0.00",
  available: "0.00", duplicate_warnings: [], duplicate_acknowledged: false, posted_at: null, cancelled_at: null, cancellation_reason: null, reversed_at: null, reversal_reason: null,
  allocations: [], refunds: [], created_at: "2027-01-10T10:00:00Z" };
const summary = (over: object = {}) => ({ contract_id: contractId, currency: "ILS", received: "0.00", allocated: "0.00", reserved_for_refund: "0.00", refunded: "0.00",
  unallocated: "0.00", unallocated_by_purpose: { SETTLEMENT: "0.00", ADVANCE: "0.00", UNKNOWN: "0.00" }, needs_vat_rule: "0.00", payable_now: "19000.00", overpayment: "0.00",
  open_refunds: 0, vat: null, ...over });
let payments: object[];
let refunds: object[];
let postAttempts = 0;

function reads(url: string, init?: RequestInit) {
  if (init?.method === "POST") {
    if (url.endsWith("/proof")) { expect(init.body).toBeInstanceOf(FormData); payments = [{ ...base, proof }]; return payments[0]; }
    const body = JSON.parse(String(init.body));
    if (url.endsWith("/payments")) { payments = [base]; return base; }
    if (url.endsWith("/post")) {
      postAttempts += 1;
      if (!body.acknowledge_possible_duplicate) throw new ApiError(409, "dup", { error: { meta: { reason: "POSSIBLE_DUPLICATE", warnings: [{ payment_id: claimId, reason: "SAME_AMOUNT_AND_DATE" }] } } });
      payments = [{ ...base, proof, status: "POSTED", available: "15000.00", duplicate_acknowledged: true, duplicate_warnings: [{ payment_id: claimId, reason: "SAME_AMOUNT_AND_DATE" }] }];
      return payments[0];
    }
    if (url.endsWith("/allocations")) { payments = [{ ...base, proof, status: "POSTED", available: "0.00", allocated: "15000.00", allocations: [{ id: "7c1e2d3f-5a6b-4c7d-8e9f-0a1b2c3d4e5f",
      payment_id: paymentId, claim_id: claimId, claim_label: "1.1", part: body.part, amount: body.amount, active: true, allocated_at: "x", released_at: null, release_reason: null }] }]; return payments[0]; }
    if (url.endsWith("/refunds")) { refunds = [{ id: "6c1e2d3f-5a6b-4c7d-8e9f-0a1b2c3d4e5f", payment_id: paymentId, amount: body.amount, reason: body.reason, payload_sha256: "c".repeat(64),
      status: "PROPOSED", proposed_at: "x", decided_at: null, decision_reason: null, executed_on: null, bank_reference: null, proof: null, cancellation_reason: null }]; return refunds[0]; }
    if (url.endsWith("/decision")) { refunds = [{ ...refunds[0], status: body.decision === "APPROVE" ? "APPROVED" : "REJECTED", decision_reason: body.reason }]; return refunds[0]; }
    if (url.endsWith("/reverse")) { payments = [{ ...(payments[0] as object), status: "REVERSED", available: "0.00", reversal_reason: body.reason }]; return payments[0]; }
    throw new Error("Unexpected POST " + url);
  }
  if (url.includes("/payments/summary")) return summary(payments.length && (payments[0] as { status: string }).status === "POSTED" ? { received: "15000.00", unallocated: "15000.00" } : {});
  if (url.includes("/payments?")) return { items: payments, total: payments.length };
  if (url.includes("/refunds?")) return { items: refunds, total: refunds.length };
  if (url.includes("/claims?")) return { items: [claim], total: 1 };
  if (url.endsWith("/opening-balances")) return { items: [] };
  throw new Error("Unexpected URL " + url);
}
function mount(node: React.ReactNode) {
  return render(<LanguageProvider><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{node}</QueryClientProvider></LanguageProvider>);
}
const posted = (suffix: string) => JSON.parse(String((api.mock.calls.filter(([url, i]) => String(url).endsWith(suffix) && (i as RequestInit)?.method === "POST").at(-1)![1] as RequestInit).body));

describe("factory payments", () => {
  beforeEach(() => { localStorage.setItem("dimax_locale", "en"); payments = []; refunds = []; postAttempts = 0; api.mockReset(); api.mockImplementation(async (url: string, init?: RequestInit) => reads(url, init)); });

  it("registers a payment, attaches the proof, posts it only after answering the duplicate warning and allocates it", async () => {
    mount(<ContractPaymentsPanel contract={contract} />);
    expect(await screen.findByText("No payments yet.")).toBeInTheDocument();
    expect(screen.getByTestId("money-summary")).toHaveTextContent("Payable now");
    fireEvent.click(screen.getByRole("button", { name: "Register payment" }));
    let dialog = within(screen.getByRole("dialog"));
    fireEvent.change(dialog.getByLabelText("Amount"), { target: { value: "15000.00" } });
    fireEvent.change(dialog.getByLabelText("Received on"), { target: { value: "2027-01-10" } });
    fireEvent.change(dialog.getByLabelText("Counterparty (as on the statement)"), { target: { value: "Factory Ltd" } });
    fireEvent.change(dialog.getByLabelText("Bank reference"), { target: { value: "TRX-1" } });
    fireEvent.click(dialog.getByRole("button", { name: "Register payment" }));
    await waitFor(() => expect(api).toHaveBeenCalledWith(expect.stringMatching(/\/payments$/), expect.objectContaining({ method: "POST" }), expect.anything()));
    expect(posted("/payments")).toMatchObject({ amount: "15000.00", received_on: "2027-01-10", counterparty_name: "Factory Ltd", bank_reference: "TRX-1", purpose_kind: "SETTLEMENT", tax_basis: "EX_VAT" });
    const row = await screen.findByTestId("payment-row");
    expect(row).toHaveTextContent("Draft");
    expect(within(row).getByRole("button", { name: "Post" })).toBeDisabled();  // no proof yet
    fireEvent.change(within(row).getByLabelText(/Attach bank proof/), { target: { files: [new File(["%PDF"], "statement.pdf", { type: "application/pdf" })] } });
    await waitFor(() => expect(api).toHaveBeenCalledWith(expect.stringMatching(/\/proof$/), expect.objectContaining({ method: "POST" }), expect.anything()));
    await waitFor(() => expect(within(screen.getByTestId("payment-row")).getByRole("button", { name: "Post" })).toBeEnabled());
    fireEvent.click(within(screen.getByTestId("payment-row")).getByRole("button", { name: "Post" }));
    dialog = within(screen.getByRole("dialog"));
    fireEvent.click(dialog.getByRole("button", { name: "Post" }));
    expect((await dialog.findAllByText(/same amount and date/)).length).toBeGreaterThan(0);  // the warning is shown, nothing posted
    expect(dialog.getByRole("button", { name: "Post" })).toBeDisabled();
    fireEvent.click(dialog.getByLabelText("This is not a duplicate; post it"));
    fireEvent.click(dialog.getByRole("button", { name: "Post" }));
    await waitFor(() => expect(postAttempts).toBe(2));
    expect(posted("/post")).toMatchObject({ acknowledge_possible_duplicate: true });
    await waitFor(() => expect(screen.getByTestId("payment-row")).toHaveTextContent("Posted"));
    expect(screen.getByTestId("money-summary")).toHaveTextContent("15,000.00");
    fireEvent.click(within(screen.getByTestId("payment-row")).getByRole("button", { name: "Allocate" }));
    dialog = within(screen.getByRole("dialog"));
    await dialog.findByRole("option", { name: /1\.1/ });  // the package list loads when the dialog opens
    fireEvent.change(dialog.getByLabelText("Target"), { target: { value: "claim:" + claimId } });
    fireEvent.change(dialog.getByLabelText("Amount"), { target: { value: "15000.00" } });
    fireEvent.click(dialog.getByRole("button", { name: "Allocate" }));
    await waitFor(() => expect(api).toHaveBeenCalledWith(expect.stringMatching(/\/allocations$/), expect.objectContaining({ method: "POST" }), expect.anything()));
    expect(posted("/allocations")).toMatchObject({ claim_id: claimId, part: "PRINCIPAL", amount: "15000.00" });
    expect(await screen.findByTestId("allocation-row")).toHaveTextContent("1.1");
    expect(screen.getByTestId("allocation-row")).toHaveTextContent("Principal");
  });

  it("proposes a refund, lets the owner decide against the fingerprint and reverses a posted payment with a reason", async () => {
    payments = [{ ...base, proof, status: "POSTED", available: "15000.00" }];
    mount(<ContractPaymentsPanel contract={contract} />);
    const row = await screen.findByTestId("payment-row");
    fireEvent.click(within(row).getByRole("button", { name: "Propose refund" }));
    let dialog = within(screen.getByRole("dialog"));
    fireEvent.change(dialog.getByLabelText("Amount"), { target: { value: "1000.00" } });
    fireEvent.change(dialog.getByLabelText("Reason"), { target: { value: "Overpaid" } });
    fireEvent.click(dialog.getByRole("button", { name: "Propose refund" }));
    await waitFor(() => expect(api).toHaveBeenCalledWith(expect.stringMatching(/\/refunds$/), expect.objectContaining({ method: "POST" }), expect.anything()));
    expect(posted("/refunds")).toMatchObject({ payment_id: paymentId, amount: "1000.00", reason: "Overpaid" });
    const refund = await screen.findByTestId("refund-row");
    expect(refund).toHaveTextContent("Proposed");
    fireEvent.click(within(refund).getByRole("button", { name: "Decide" }));
    dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByText("c".repeat(64))).toBeInTheDocument();
    expect(dialog.getByRole("button", { name: "Approve" })).toBeDisabled();
    fireEvent.change(dialog.getByLabelText("Reason"), { target: { value: "Agreed" } });
    fireEvent.click(dialog.getByLabelText("I checked the payload and the fingerprint"));
    fireEvent.click(dialog.getByRole("button", { name: "Approve" }));
    await waitFor(() => expect(api).toHaveBeenCalledWith(expect.stringMatching(/\/decision$/), expect.objectContaining({ method: "POST" }), expect.anything()));
    expect(posted("/decision")).toMatchObject({ payload_sha256: "c".repeat(64), decision: "APPROVE", reason: "Agreed" });
    await waitFor(() => expect(screen.getByTestId("refund-row")).toHaveTextContent("Approved (reserved)"));
    expect(within(screen.getByTestId("refund-row")).getByRole("button", { name: "Execute" })).toBeInTheDocument();
    fireEvent.click(within(screen.getByTestId("payment-row")).getByRole("button", { name: "Reverse" }));
    dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByRole("button", { name: "Reverse" })).toBeDisabled();
    fireEvent.change(dialog.getByLabelText("Reason"), { target: { value: "Bank recalled the transfer" } });
    fireEvent.click(dialog.getByRole("button", { name: "Reverse" }));
    await waitFor(() => expect(api).toHaveBeenCalledWith(expect.stringMatching(/\/reverse$/), expect.objectContaining({ method: "POST" }), expect.anything()));
    expect(posted("/reverse")).toMatchObject({ reason: "Bank recalled the transfer" });
    expect(posted("/reverse").request_id).toMatch(/[0-9a-f-]{36}/);
    await waitFor(() => expect(screen.getByTestId("payment-row")).toHaveTextContent("Reversed"));

    api.mockRejectedValue({ status: 409 });
    mount(<ContractPaymentsPanel contract={contract} />);
    expect(await screen.findByText("Payments are switched off on this server.")).toBeInTheDocument();
  });
});
