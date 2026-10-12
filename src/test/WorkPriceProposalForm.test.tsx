import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WorkPriceProposalForm } from "@/components/operations/WorkPriceProposalForm";

const mocks = vi.hoisted(() => ({ api: vi.fn(), locale: "en" }));
vi.mock("@/lib/api", () => ({ apiFetch: mocks.api }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ locale: mocks.locale }) }));
const prepared = { review_token: "a".repeat(64), latest: null, scope: {
  project_name: "QA project", installer_name: "QA Installer", work_label: "Adjustment", quantity: "1.50", unit: "pcs",
  missing_price: { performed_at: "2026-10-01T08:00:00Z" },
} };
const result = { id: "saved-proposal", version: 1, rate: "9.01", amount: "13.52", created_at: "2026-10-12T09:00:00Z" };
const path = "/api/v1/admin/sync/price-conflicts/sync_queue/retained-work/work-price-proposals";

function subject(correction?: { performed_at: string; evidence_reference: string }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><WorkPriceProposalForm source="sync_queue" itemId="retained-work" correction={correction} /></QueryClientProvider>);
}

async function fill() {
  fireEvent.click(screen.getByRole("button", { name: "Prepare a price proposal" }));
  fireEvent.change(await screen.findByLabelText("Proposed rate (ILS / pcs)"), { target: { value: "9,01" } });
  fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Missing historical factory rate" } });
  fireEvent.change(screen.getByLabelText("Factory request / agreement reference"), { target: { value: "Factory agreement QA-100" } });
  fireEvent.change(screen.getByLabelText("Execution and assignment evidence"), { target: { value: "Verified site work log QA-100" } });
  fireEvent.click(screen.getByRole("checkbox"));
}

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  mocks.locale = "en"; mocks.api.mockReset();
  mocks.api.mockImplementation((url) => Promise.resolve(url.endsWith("/review") ? prepared : result));
});

afterEach(() => vi.unstubAllGlobals());

describe("retained work price proposal", () => {
  it("does not call the API until explicitly opened", () => {
    subject(); expect(mocks.api).not.toHaveBeenCalled();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
  it("calculates cents but sends only a proposed rate and evidence, never an earned amount", async () => {
    subject(); await fill();
    expect(screen.getByText("1.50 × 9.01 = 13.52 ILS")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save proposal, without accrual" }));
    await screen.findByText(/Proposal saved, not factory-approved/);
    const body = JSON.parse(mocks.api.mock.calls.find(([url]) => url === path)![1].body);
    expect(body).toEqual({ request_id: expect.any(String), review_token: prepared.review_token, rate: "9.01",
      reason: "Missing historical factory rate", agreement_reference: "Factory agreement QA-100",
      execution_evidence: "Verified site work log QA-100", confirm_execution_evidence: true, execution_correction: null });
    expect(mocks.api.mock.calls.map(([url]) => url)).toEqual([path + "/review", path]);
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });
  it("requires evidence, a valid rate and a new confirmation after terms change", async () => {
    subject(); await fill();
    const button = screen.getByRole("button", { name: "Save proposal, without accrual" });
    expect(button).toBeEnabled();
    fireEvent.change(screen.getByLabelText("Proposed rate (ILS / pcs)"), { target: { value: "10" } });
    expect(button).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.change(screen.getByLabelText("Execution and assignment evidence"), { target: { value: "short" } });
    fireEvent.click(screen.getByRole("checkbox"));
    expect(button).toBeDisabled();
  });
  it("reuses a request ID after an ambiguous network failure", async () => {
    let attempts = 0;
    mocks.api.mockImplementation((url) => url.endsWith("/review") ? Promise.resolve(prepared)
      : ++attempts === 1 ? Promise.reject(new Error("Connection lost")) : Promise.resolve(result));
    subject(); await fill();
    fireEvent.click(screen.getByRole("button", { name: "Save proposal, without accrual" }));
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Save proposal, without accrual" }));
    await screen.findByText(/Proposal saved, not factory-approved/);
    const bodies = mocks.api.mock.calls.filter(([url]) => url === path).map(([, options]) => options.body);
    expect(bodies).toHaveLength(2); expect(bodies[0]).toBe(bodies[1]);
  });
  it("never restores a form from stale data after a failed recheck", async () => {
    mocks.api.mockImplementation((url) => url.endsWith("/review") ? Promise.resolve(prepared)
      : Promise.reject({ status: 409 }));
    subject(); await fill();
    fireEvent.click(screen.getByRole("button", { name: "Save proposal, without accrual" }));
    await screen.findByRole("alert");
    mocks.api.mockRejectedValue({ status: 403 });
    fireEvent.click(screen.getByRole("button", { name: "Check again" }));
    await waitFor(() => expect(screen.queryByLabelText("Proposed rate (ILS / pcs)")).not.toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Save proposal, without accrual" })).not.toBeInTheDocument();
  });
  it("passes a separate execution correction without replacing the work", async () => {
    const correction = { performed_at: "2026-10-01T08:00:00Z", evidence_reference: "Site log QA-100" };
    subject(correction); await fill();
    fireEvent.click(screen.getByRole("button", { name: "Save proposal, without accrual" }));
    await screen.findByText(/Proposal saved, not factory-approved/);
    expect(JSON.parse(mocks.api.mock.calls[0][1].body)).toEqual({ execution_correction: correction });
    expect(JSON.parse(mocks.api.mock.calls[1][1].body).execution_correction).toEqual(correction);
  });
  it.each([["ru", "Подготовить предложение цены", "Цена только за эту работу"],
    ["he", "הכנת הצעת מחיר", "מחיר לעבודה הזאת בלבד"]])("labels preparation in %s", async (locale, button, heading) => {
    mocks.locale = locale; subject(); fireEvent.click(screen.getByRole("button", { name: button }));
    expect(await screen.findByRole("heading", { name: heading })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save proposal, without accrual" })).not.toBeInTheDocument();
  });
});
