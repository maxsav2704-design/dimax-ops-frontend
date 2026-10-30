import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ContractOpeningPanel } from "@/components/accounting/ContractOpeningPanel";
import { LanguageProvider } from "@/lib/i18n";
import { candidate, contractId } from "./commercial-approval-fixture";

const { api } = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock("@/lib/api", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/api")>()), apiFetch: api }));

const owner = candidate.snapshot.company_id;
const balanceId = "5c1e2d3f-5a6b-4c7d-8e9f-0a1b2c3d4e5f";
const contract = { id: contractId, factory_name: "Synthetic factory", reference: "TEST", reason: "Test only", status: "DRAFT" as const, currency: "ILS" as const,
  is_demo: true, created_by: owner, created_at: "2026-10-21T10:00:00Z" };
const evidence = { id: "9c1e2d3f-5a6b-4c7d-8e9f-0a1b2c3d4e5f", claim_id: null, payment_id: null, filename: "statement.pdf", content_type: "application/pdf", size: 10, sha256: "a".repeat(64), created_at: "x" };
const answer = { ...evidence, id: "8c1e2d3f-5a6b-4c7d-8e9f-0a1b2c3d4e5f", filename: "answer.eml", content_type: "message/rfc822" };
const figures = (over: object = {}) => ({ currency: "ILS", as_of: "2026-11-09", debt: "0.00", retention: "0.00", advance: "0.00", disputed: "0.00", principal_due: "0.00",
  principal_paid: "0.00", principal_remaining: "0.00", covers_early_work: false, ...over });
const early = { item_kind: "DOOR", journal_id: "3c1e2d3f-5a6b-4c7d-8e9f-0a1b2c3d4e5f", journal_item_id: "2c1e2d3f-5a6b-4c7d-8e9f-0a1b2c3d4e5f", project_name: "Tower A",
  label: "Entrance door 12", work_date: "2026-11-02", covered: false };
const draft = { id: balanceId, contract_id: contractId, kind: "DEBT", currency: "ILS", amount: "12000.00", as_of: "2026-11-09", basis: "Statement", tax_basis: "EX_VAT", terms_known: true,
  due_on: "2026-12-10", release_condition: null, covers_early_work: false, evidence, status: "DRAFT", revision: 1, payload: {}, payload_sha256: "b".repeat(64),
  acknowledged_amount: null, disputed_amount: null, reconciled_channel: null, reconciled_author: null, reconciled_at: null, reconciliation_attachment: null,
  reconciliation_note: null, decided_at: null, decision_reason: null, advance_payment_id: null, created_at: "2026-11-01T10:00:00Z" };
let items: Record<string, unknown>[];
const view = () => {
  const approved = items.filter((row) => row.status === "APPROVED" && row.kind === "DEBT");
  const debt = approved.reduce((sum, row) => sum + Number(row.amount), 0).toFixed(2);
  const covered = approved.some((row) => row.covers_early_work);
  return { contract_id: contractId, as_of: "2026-11-09", items, figures: figures({ debt, principal_due: debt, principal_remaining: debt, covers_early_work: covered }), early_work: [{ ...early, covered }] };
};

function reads(url: string, init?: RequestInit) {
  if (init?.method === "POST" && url.endsWith("/attachments")) {
    expect(init.body).toBeInstanceOf(FormData);
    return ((init.body as FormData).get("file") as File).name === "answer.eml" ? answer : evidence;
  }
  if (init?.method === "POST" || init?.method === "PATCH") {
    const body = JSON.parse(String(init.body));
    if (url.endsWith("/opening-balances")) {
      items = [{ ...draft, kind: body.kind, amount: body.amount, basis: body.basis, tax_basis: body.tax_basis, terms_known: body.terms_known, due_on: body.due_on,
        release_condition: body.release_condition, covers_early_work: body.covers_early_work, payload: body }];
      return view();
    }
    if (url.endsWith("/" + balanceId)) { items = [{ ...items[0], kind: body.kind, amount: body.amount, revision: 2, acknowledged_amount: null, disputed_amount: null }]; return view(); }
    if (url.endsWith("/reconcile")) {
      items = [{ ...items[0], acknowledged_amount: body.acknowledged_amount, disputed_amount: (Number(items[0].amount) - Number(body.acknowledged_amount)).toFixed(2),
        reconciled_channel: body.channel, reconciled_author: body.author_name, reconciled_at: body.answered_at, reconciliation_attachment: answer, reconciliation_note: body.note }];
      return view();
    }
    if (url.endsWith("/decision")) { items = [{ ...items[0], status: body.decision === "APPROVE" ? "APPROVED" : "REJECTED", decided_at: "x", decision_reason: body.reason }]; return view(); }
    throw new Error("Unexpected write " + url);
  }
  if (url.endsWith("/opening-balances")) return view();
  throw new Error("Unexpected URL " + url);
}
function mount(node: React.ReactNode) {
  return render(<LanguageProvider><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{node}</QueryClientProvider></LanguageProvider>);
}
const written = (suffix: string, method = "POST") => JSON.parse(String((api.mock.calls.filter(([url, i]) => String(url).endsWith(suffix) && (i as RequestInit)?.method === method).at(-1)![1] as RequestInit).body));

describe("opening balances", () => {
  beforeEach(() => { localStorage.setItem("dimax_locale", "en"); items = []; api.mockReset(); api.mockImplementation(async (url: string, init?: RequestInit) => reads(url, init)); });

  it("adds a debt with evidence, records the factory's acknowledgement and lets OWNER approve against the fingerprint", async () => {
    mount(<ContractOpeningPanel contract={contract} />);
    expect(await screen.findByTestId("opening-figures")).toHaveTextContent("2026-11-09");
    expect(screen.getByTestId("early-work-row")).toHaveTextContent("Not covered");  // early signed work is listed, never claimed
    fireEvent.click(screen.getByRole("button", { name: "Add row" }));
    let dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByRole("button", { name: "Add row" })).toBeDisabled();
    fireEvent.change(dialog.getByLabelText("Amount"), { target: { value: "12000.00" } });
    fireEvent.change(dialog.getByLabelText("Basis"), { target: { value: "Factory statement of 2026-11-09" } });
    fireEvent.change(dialog.getByLabelText("Due on"), { target: { value: "2026-12-10" } });
    fireEvent.click(dialog.getByLabelText("This debt covers the early unpresented work"));
    expect(dialog.getByRole("button", { name: "Add row" })).toBeDisabled();  // no evidence yet
    fireEvent.change(dialog.getByLabelText("Evidence file"), { target: { files: [new File(["%PDF"], "statement.pdf", { type: "application/pdf" })] } });
    fireEvent.click(dialog.getByRole("button", { name: "Add row" }));
    await waitFor(() => expect(api).toHaveBeenCalledWith(expect.stringMatching(/\/opening-balances$/), expect.objectContaining({ method: "POST" }), expect.anything()));
    expect(written("/opening-balances")).toMatchObject({ kind: "DEBT", amount: "12000.00", basis: "Factory statement of 2026-11-09", tax_basis: "EX_VAT", terms_known: true,
      due_on: "2026-12-10", release_condition: null, covers_early_work: true, evidence_attachment_id: evidence.id });
    const row = await screen.findByTestId("opening-row");
    expect(row).toHaveTextContent("Draft");
    expect(row).toHaveTextContent("Not reconciled yet");
    expect(within(row).getByRole("button", { name: "Decide" })).toBeDisabled();  // no decision before the factory answered
    fireEvent.click(within(row).getByRole("button", { name: "Reconcile" }));
    dialog = within(screen.getByRole("dialog"));
    fireEvent.change(dialog.getByLabelText("Author at the factory"), { target: { value: "Dana" } });
    fireEvent.change(dialog.getByLabelText("Answered at"), { target: { value: "2026-11-12T09:30" } });
    fireEvent.change(dialog.getByLabelText("Acknowledged amount"), { target: { value: "10000.00" } });
    fireEvent.change(dialog.getByLabelText("Attached answer"), { target: { files: [new File(["ok"], "answer.eml", { type: "message/rfc822" })] } });
    fireEvent.click(dialog.getByRole("button", { name: "Reconcile" }));
    await waitFor(() => expect(api).toHaveBeenCalledWith(expect.stringMatching(/\/reconcile$/), expect.objectContaining({ method: "POST" }), expect.anything()));
    expect(written("/reconcile")).toMatchObject({ channel: "EMAIL", author_name: "Dana", acknowledged_amount: "10000.00", attachment_id: answer.id, note: null });
    await waitFor(() => expect(screen.getByTestId("opening-row")).toHaveTextContent("Acknowledged"));
    expect(screen.getByTestId("opening-row")).toHaveTextContent("2,000.00");  // the difference stays disputed
    fireEvent.click(within(screen.getByTestId("opening-row")).getByRole("button", { name: "Decide" }));
    dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByText("b".repeat(64))).toBeInTheDocument();
    expect(dialog.getByRole("button", { name: "Approve" })).toBeDisabled();
    fireEvent.change(dialog.getByLabelText("Reason"), { target: { value: "Statement and answer match" } });
    fireEvent.click(dialog.getByLabelText("I checked the figures, the evidence and the factory's acknowledgement"));
    fireEvent.click(dialog.getByRole("button", { name: "Approve" }));
    await waitFor(() => expect(api).toHaveBeenCalledWith(expect.stringMatching(/\/decision$/), expect.objectContaining({ method: "POST" }), expect.anything()));
    expect(written("/decision")).toMatchObject({ payload_sha256: "b".repeat(64), decision: "APPROVE", reason: "Statement and answer match" });
    await waitFor(() => expect(screen.getByTestId("opening-row")).toHaveTextContent("Approved"));
    expect(screen.getByTestId("opening-figures")).toHaveTextContent("12,000.00");
    expect(screen.getByTestId("early-work-row")).toHaveTextContent("Covered by the opening debt");
    expect(within(screen.getByTestId("opening-row")).queryByRole("button", { name: "Edit" })).toBeNull();  // approved rows are fixed
  });

  it("edits a draft through PATCH, keeping the old evidence, and asks for a release condition on a retention", async () => {
    items = [{ ...draft, acknowledged_amount: "12000.00", disputed_amount: "0.00", reconciled_channel: "EMAIL", reconciled_author: "Dana", reconciled_at: "x", reconciliation_attachment: answer }];
    mount(<ContractOpeningPanel contract={contract} />);
    const row = await screen.findByTestId("opening-row");
    expect(within(row).getByRole("button", { name: "statement.pdf" })).toBeInTheDocument();  // the evidence and the answer open from the row
    expect(within(row).getByRole("button", { name: "answer.eml" })).toBeInTheDocument();
    fireEvent.click(within(row).getByRole("button", { name: "Edit" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }));  // untouched: closes without the discard question
    expect(screen.queryByRole("alertdialog")).toBeNull();
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    fireEvent.click(within(row).getByRole("button", { name: "Edit" }));
    const dialog = within(screen.getByRole("dialog"));
    fireEvent.change(dialog.getByLabelText("Kind"), { target: { value: "RETENTION" } });
    expect(dialog.queryByLabelText("Due on")).toBeNull();
    expect(dialog.getByRole("button", { name: "Edit" })).toBeDisabled();  // a retention needs its release condition
    fireEvent.change(dialog.getByLabelText("Release condition"), { target: { value: "After the handover of Tower A" } });
    fireEvent.change(dialog.getByLabelText("Amount"), { target: { value: "1200.00" } });
    fireEvent.click(dialog.getByRole("button", { name: "Edit" }));
    await waitFor(() => expect(api).toHaveBeenCalledWith(expect.stringMatching(/\/opening-balances\/[0-9a-f-]+$/), expect.objectContaining({ method: "PATCH" }), expect.anything()));
    expect(written("/" + balanceId, "PATCH")).toMatchObject({ kind: "RETENTION", amount: "1200.00", due_on: null, release_condition: "After the handover of Tower A", covers_early_work: false, evidence_attachment_id: evidence.id });
    expect(api.mock.calls.some(([url]) => String(url).endsWith("/attachments"))).toBe(false);  // the old evidence is kept
    await waitFor(() => expect(screen.getByTestId("opening-row")).toHaveTextContent("Not reconciled yet"));  // a changed draft must be reconciled again
  });
});
