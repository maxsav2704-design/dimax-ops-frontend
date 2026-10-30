import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ClaimReconciliationPanel, ContractReconciliationSummary } from "@/components/accounting/ClaimReconciliationPanel";
import { LanguageProvider } from "@/lib/i18n";
import { candidate, contractId } from "./commercial-approval-fixture";

const { api } = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiFetch: api }));

const owner = candidate.snapshot.company_id;
const claimId = "4c1e2d3f-5a6b-4c7d-8e9f-0a1b2c3d4e5f";
const lineA = "1c1e2d3f-5a6b-4c7d-8e9f-0a1b2c3d4e01", lineB = "1c1e2d3f-5a6b-4c7d-8e9f-0a1b2c3d4e02";
const claim = { id: claimId, contract_id: contractId, period_start: "2026-11-10", period_end: "2026-12-09", number: 1, version: 1, kind: "MAIN" as const,
  status: "ISSUED" as const, currency: "ILS" as const, amount_ex_vat: "20000.00", vat: null, lines_count: 2, supersedes_claim_id: null,
  issued_at: "2026-12-21T09:00:00Z", cancelled_at: null, cancellation_reason: null, superseded_at: null, created_at: "2026-12-20T10:00:00Z" };
const line = (id: string, label: string) => ({ id, item_kind: "DOOR", journal_id: owner, journal_item_id: crypto.randomUUID(), project_name: "Claim site", label,
  work_date: "2026-11-15", quantity: "1", unit: "pcs", unit_price_ex_vat: "10000.00", amount_ex_vat: "10000.00", price_version: 3, agreement_id: owner,
  reason: "RATED", state: "CLAIMED", claimed_in: "1.1" });
const attachment = { id: "2c1e2d3f-5a6b-4c7d-8e9f-0a1b2c3d4e5f", claim_id: claimId, filename: "answer.eml", content_type: "message/rfc822", size: 42,
  sha256: "a".repeat(64), created_at: "2026-12-22T10:00:00Z" };
const figures = (over: object = {}) => ({ currency: "ILS", presented_ex_vat: "20000.00", answer_state: "UNANSWERED", acknowledged_ex_vat: null, disputed_ex_vat: "0.00",
  written_off_ex_vat: "0.00", outstanding_ex_vat: "20000.00", retention_ex_vat: "0.00", retention_released_ex_vat: "0.00", retention_held_ex_vat: "0.00",
  payable_now_ex_vat: "20000.00", paid_ex_vat: null, vat: null, ...over });
let state: Record<string, unknown>;
const empty = () => ({ claim_id: claimId, number: 1, version: 1, status: "ISSUED", issue_snapshot_sha256: "b".repeat(64), figures: figures(),
  current_response_id: null, responses: [], corrections: [], retention: null, retention_history: [], releases: [], attachments: [] });
const response = { id: "3c1e2d3f-5a6b-4c7d-8e9f-0a1b2c3d4e5f", claim_id: claimId, claim_number: 1, claim_version: 1, issue_snapshot_sha256: "b".repeat(64),
  presented_amount_ex_vat: "20000.00", channel: "EMAIL", author_name: "Dana", author_contact: null, answered_at: "2026-12-22T09:30:00+02:00", attachment,
  acknowledged_amount: "18000.00", tax_basis: "EX_VAT", comparison: "COMPARABLE", detail: "NONE", disputed_amount_ex_vat: "2000.00", clarification_required: true,
  note: null, lines: [], registered_at: "2026-12-22T10:00:00Z" };
const correction = { id: "5c1e2d3f-5a6b-4c7d-8e9f-0a1b2c3d4e5f", claim_id: claimId, claim_version: 1, kind: "WRITE_OFF", payload: { amount_ex_vat: "2000.00" },
  payload_sha256: "c".repeat(64), amount_ex_vat: "2000.00", line_ids: [lineB], basis_response_id: response.id, reason: "Factory disputes door B",
  status: "PREPARED", prepared_at: "2026-12-23T10:00:00Z", decided_at: null, decision_reason: null, applied_amount_ex_vat: null, voided_by_correction_id: null };
const retention = { id: "6c1e2d3f-5a6b-4c7d-8e9f-0a1b2c3d4e5f", revision: 1, amount_ex_vat: "1000.00", basis: "§7.2", release_condition: "Final acceptance",
  reason: "Per contract", status: "ACTIVE", supersedes_id: null, created_at: "2026-12-23T10:00:00Z", superseded_at: null };

function reads(url: string, init?: RequestInit) {
  if (init?.method === "POST") {
    if (url.endsWith("/attachments")) { expect(init.body).toBeInstanceOf(FormData); return attachment; }
    const body = JSON.parse(String(init.body));
    if (url.endsWith("/responses")) { state = { ...state, responses: [response], current_response_id: response.id, figures: figures({ answer_state: "ANSWERED", acknowledged_ex_vat: "18000.00", disputed_ex_vat: "2000.00" }) }; return state; }
    if (url.endsWith("/corrections")) { state = { ...state, corrections: [{ ...correction, reason: body.reason }] }; return state; }
    if (url.endsWith("/decision")) { state = { ...state, corrections: [{ ...correction, status: "APPROVED", applied_amount_ex_vat: "2000.00", decision_reason: body.reason }],
      figures: figures({ answer_state: "ANSWERED", acknowledged_ex_vat: "18000.00", disputed_ex_vat: "2000.00", written_off_ex_vat: "2000.00", outstanding_ex_vat: "18000.00", payable_now_ex_vat: "18000.00" }) }; return state; }
    if (url.endsWith("/retention")) { state = { ...state, retention, retention_history: [retention], figures: figures({ retention_ex_vat: "1000.00", retention_held_ex_vat: "1000.00", payable_now_ex_vat: "19000.00" }) }; return state; }
    if (url.endsWith("/releases")) { state = { ...state, releases: [{ id: "7c1e2d3f-5a6b-4c7d-8e9f-0a1b2c3d4e5f", retention_id: retention.id, retention_revision: 1, amount_ex_vat: body.amount_ex_vat,
      evidence: body.evidence, attachment: null, occurred_at: body.occurred_at, registered_at: "x" }], figures: figures({ retention_ex_vat: "1000.00", retention_released_ex_vat: "400.00", retention_held_ex_vat: "600.00", payable_now_ex_vat: "19400.00" }) }; return state; }
    throw new Error("Unexpected POST " + url);
  }
  if (url.endsWith(`/claims/${claimId}/reconciliation`)) return state;
  if (url.endsWith(`/claims/${claimId}`)) return { ...claim, lines: [line(lineA, "Door A"), line(lineB, "Door B")], issue_snapshot: {} };
  if (url.endsWith("/reconciliation")) return { contract_id: contractId, issued_claims: 1, answered_claims: 1, clarification_required_claims: 1, pending_corrections: 0,
    figures: figures({ answer_state: "NEEDS_CLARIFICATION", disputed_ex_vat: "20000.00" }) };
  throw new Error("Unexpected URL " + url);
}
function mount(node: React.ReactNode) {
  return render(<LanguageProvider><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{node}</QueryClientProvider></LanguageProvider>);
}
const posted = (suffix: string) => JSON.parse(String((api.mock.calls.find(([url, i]) => String(url).endsWith(suffix) && (i as RequestInit)?.method === "POST")![1] as RequestInit).body));

describe("claim reconciliation", () => {
  beforeEach(() => { localStorage.setItem("dimax_locale", "en"); state = empty(); api.mockReset(); api.mockImplementation(async (url: string, init?: RequestInit) => reads(url, init)); });

  it("registers the factory's answer with its attachment and shows presented, acknowledged and disputed apart", async () => {
    mount(<ClaimReconciliationPanel contractId={contractId} claim={claim} onClose={() => undefined} />);
    const panel = within(await screen.findByTestId("claim-reconciliation"));
    expect(panel.getByTestId("reconciliation-figures")).toHaveTextContent("No answer yet");
    expect(panel.getByTestId("reconciliation-figures")).toHaveTextContent("payments are a later step");
    fireEvent.click(panel.getByRole("button", { name: "Register answer" }));
    const dialog = within(screen.getByRole("dialog"));
    fireEvent.change(dialog.getByLabelText("Author at the factory"), { target: { value: "Dana" } });
    fireEvent.change(dialog.getByLabelText("Answered at"), { target: { value: "2026-12-22T09:30" } });
    fireEvent.change(dialog.getByLabelText("Acknowledged amount"), { target: { value: "18000.00" } });
    expect(dialog.getByRole("button", { name: "Register answer" })).toBeDisabled();  // the attachment is required
    const file = new File(["Subject: claim"], "answer.eml", { type: "message/rfc822" });
    fireEvent.change(dialog.getByLabelText("Attached answer"), { target: { files: [file] } });
    fireEvent.click(dialog.getByRole("button", { name: "Register answer" }));
    await waitFor(() => expect(api).toHaveBeenCalledWith(expect.stringMatching(/\/responses$/), expect.objectContaining({ method: "POST" }), expect.anything()));
    const body = posted("/responses");
    expect(body).toMatchObject({ channel: "EMAIL", author_name: "Dana", attachment_id: attachment.id, acknowledged_amount: "18000.00", tax_basis: "EX_VAT", lines: null });
    expect(body.request_id).toMatch(/[0-9a-f-]{36}/);
    const answer = await screen.findByTestId("factory-answer");
    expect(answer).toHaveTextContent("Dana");
    expect(answer).toHaveTextContent("Clarification required");
    expect(answer).toHaveTextContent("Package level");
    expect(screen.getByTestId("reconciliation-figures")).toHaveTextContent("Answered");
    expect(screen.getByTestId("reconciliation-figures")).toHaveTextContent("2,000.00");
  });

  it("prepares a write-off and lets the owner decide against the fingerprint and the expected version", async () => {
    state = { ...empty(), responses: [response], current_response_id: response.id, figures: figures({ answer_state: "ANSWERED", acknowledged_ex_vat: "18000.00", disputed_ex_vat: "2000.00" }) };
    mount(<ClaimReconciliationPanel contractId={contractId} claim={claim} onClose={() => undefined} />);
    const panel = within(await screen.findByTestId("claim-reconciliation"));
    fireEvent.click(panel.getByRole("button", { name: "Prepare write-off" }));
    let dialog = within(screen.getByRole("dialog"));
    fireEvent.change(dialog.getByLabelText("Amount ex-VAT"), { target: { value: "2000.00" } });
    fireEvent.click(dialog.getByLabelText(/Door B/));
    fireEvent.change(dialog.getByLabelText("Based on answer"), { target: { value: response.id } });
    fireEvent.change(dialog.getByLabelText("Reason"), { target: { value: "Factory disputes door B" } });
    fireEvent.click(dialog.getByRole("button", { name: "Prepare write-off" }));
    await waitFor(() => expect(api).toHaveBeenCalledWith(expect.stringMatching(/\/corrections$/), expect.objectContaining({ method: "POST" }), expect.anything()));
    expect(posted("/corrections")).toMatchObject({ kind: "WRITE_OFF", amount_ex_vat: "2000.00", line_ids: [lineB], basis_response_id: response.id, reason: "Factory disputes door B" });
    const row = await screen.findByTestId("write-off");
    expect(row).toHaveTextContent("Prepared");
    expect(screen.getByTestId("reconciliation-figures")).toHaveTextContent("20,000.00");  // nothing changes before the decision
    fireEvent.click(within(row).getByRole("button", { name: "Decide" }));
    dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByText("c".repeat(64))).toBeInTheDocument();
    expect(dialog.getByRole("button", { name: "Approve" })).toBeDisabled();
    fireEvent.change(dialog.getByLabelText("Reason"), { target: { value: "Agreed on 23 Dec" } });
    fireEvent.click(dialog.getByLabelText("I checked the payload, the fingerprint and the version"));
    fireEvent.click(dialog.getByRole("button", { name: "Approve" }));
    await waitFor(() => expect(api).toHaveBeenCalledWith(expect.stringMatching(/\/decision$/), expect.objectContaining({ method: "POST" }), expect.anything()));
    expect(posted("/decision")).toMatchObject({ payload_sha256: "c".repeat(64), expected_claim_version: 1, decision: "APPROVE", reason: "Agreed on 23 Dec" });
    await waitFor(() => expect(screen.getByTestId("write-off")).toHaveTextContent("Approved"));
    expect(screen.getByTestId("reconciliation-figures")).toHaveTextContent("18,000.00");
  });

  it("records a retention, releases part of it and shows the summary; tells the owner when the flag is off", async () => {
    mount(<ClaimReconciliationPanel contractId={contractId} claim={claim} onClose={() => undefined} />);
    const panel = within(await screen.findByTestId("claim-reconciliation"));
    expect(panel.getByText("No retention recorded.")).toBeInTheDocument();
    fireEvent.click(panel.getByRole("button", { name: "Set retention" }));
    let dialog = within(screen.getByRole("dialog"));
    fireEvent.change(dialog.getByLabelText("Amount ex-VAT"), { target: { value: "1000.00" } });
    fireEvent.change(dialog.getByLabelText("Contract basis"), { target: { value: "§7.2" } });
    fireEvent.change(dialog.getByLabelText("Release condition"), { target: { value: "Final acceptance" } });
    fireEvent.change(dialog.getByLabelText("Reason"), { target: { value: "Per contract" } });
    fireEvent.click(dialog.getByRole("button", { name: "Set retention" }));
    await waitFor(() => expect(api).toHaveBeenCalledWith(expect.stringMatching(/\/retention$/), expect.objectContaining({ method: "POST" }), expect.anything()));
    expect(posted("/retention")).toMatchObject({ amount_ex_vat: "1000.00", basis: "§7.2", release_condition: "Final acceptance", reason: "Per contract" });
    expect(await screen.findByTestId("retention")).toHaveTextContent("Revision 1");
    expect(screen.getByTestId("reconciliation-figures")).toHaveTextContent("19,000.00");
    fireEvent.click(screen.getByRole("button", { name: "Register release" }));
    dialog = within(screen.getByRole("dialog"));
    fireEvent.change(dialog.getByLabelText("Amount ex-VAT"), { target: { value: "400.00" } });
    fireEvent.change(dialog.getByLabelText("Occurred at"), { target: { value: "2027-01-05T10:00" } });
    fireEvent.change(dialog.getByLabelText("Evidence"), { target: { value: "Protocol building A" } });
    fireEvent.click(dialog.getByRole("button", { name: "Register release" }));
    await waitFor(() => expect(api).toHaveBeenCalledWith(expect.stringMatching(/\/releases$/), expect.objectContaining({ method: "POST" }), expect.anything()));
    expect(posted("/releases")).toMatchObject({ amount_ex_vat: "400.00", evidence: "Protocol building A", attachment_id: null });
    expect(await screen.findByTestId("release")).toHaveTextContent("400.00");
    expect(screen.getByTestId("reconciliation-figures")).toHaveTextContent("19,400.00");

    mount(<ContractReconciliationSummary contractId={contractId} />);
    expect(await screen.findByText("Reconciliation summary")).toBeInTheDocument();
    expect(screen.getByText(/Need clarification: 1/)).toBeInTheDocument();

    api.mockRejectedValue({ status: 409 });
    mount(<ClaimReconciliationPanel contractId={contractId} claim={claim} onClose={() => undefined} />);
    expect(await screen.findByText("Reconciliation is switched off on this server.")).toBeInTheDocument();
  });
});
