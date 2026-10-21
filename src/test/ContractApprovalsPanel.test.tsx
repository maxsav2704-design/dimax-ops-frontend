import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ContractApprovalsPanel } from "@/components/accounting/ContractApprovalsPanel";
import { LanguageProvider } from "@/lib/i18n";
import { candidate, contractId } from "./commercial-approval-fixture";
const { api } = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiFetch: api }));
const contract = { id: contractId, factory_name: "Synthetic factory", reference: "TEST", reason: "Test only", status: "DRAFT" as const,
  currency: "ILS" as const, is_demo: true, created_by: candidate.snapshot.company_id, created_at: "2026-10-21T10:00:00Z" };
function reads(url: string) {
  if (url.includes("/approval-preview?")) return candidate;
  if (url.includes("/approvals?")) return { items: [], total: 0 };
  if (url.includes("/terms?")) return { items: [candidate.snapshot.terms], total: 1, latest_version: 2 };
  if (url.includes("/prices?")) return { items: [candidate.snapshot.price], total: 1, latest_version: 3 };
  throw new Error("Unexpected URL");
}
function mount() { return render(<LanguageProvider><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
  <ContractApprovalsPanel contract={contract} /></QueryClientProvider></LanguageProvider>); }
async function review() {
  await screen.findByText("No invitations yet");
  await waitFor(() => expect(screen.getByRole("button", { name: "Review latest versions" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "Review latest versions" }));
  await screen.findByRole("button", { name: "Send to factory" });
}
describe("commercial admin confirmation", () => {
  beforeEach(() => { localStorage.setItem("dimax_locale", "en"); api.mockReset(); api.mockImplementation(async (url: string) => reads(url)); });
  it("requires review and consent, never offers a recipient or price override", async () => {
    mount(); await review(); fireEvent.click(screen.getByRole("button", { name: "Send to factory" }));
    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByRole("button", { name: "Send to factory" })).toBeDisabled();
    expect(dialog.getByText("Test entrance door")).toBeInTheDocument();
    expect(dialog.getByText("factory@example.com")).toBeInTheDocument();
    expect(dialog.queryByRole("textbox")).not.toBeInTheDocument();
    fireEvent.click(dialog.getByRole("checkbox"));
    api.mockImplementation(async (url: string, init?: RequestInit) => {
      if (init?.method === "POST") throw { status: 500 };
      return reads(url);
    });
    fireEvent.click(dialog.getByRole("button", { name: "Send to factory" }));
    await dialog.findByRole("alert");
    const first = JSON.parse(api.mock.calls.find(([, init]) => init?.method === "POST")![1].body);
    expect(first).toEqual({ request_id: expect.any(String), terms_id: candidate.snapshot.terms.id,
      price_id: candidate.snapshot.price.id, snapshot_hash: candidate.snapshot_hash, factory_contact_id: candidate.contact!.id });
    const retry = dialog.getByRole("button", { name: "Check save again" }); fireEvent.click(retry);
    await waitFor(() => expect(api.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(2));
    expect(JSON.parse(api.mock.calls.filter(([, init]) => init?.method === "POST")[1][1].body)).toEqual(first);
  });
  it("blocks invitation without OWNER-approved contact", async () => {
    api.mockImplementation(async (url: string) => url.includes("/approval-preview?") ? { ...candidate, contact: null } : reads(url));
    mount(); await review(); expect(screen.getByRole("button", { name: "Send to factory" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "Factory representative" })).toHaveAttribute("href", "/price-lists");
  });
  it("hides actions when the history request fails", async () => {
    api.mockRejectedValue({ status: 403 }); mount(); await screen.findByRole("alert");
    expect(screen.getByRole("button", { name: "Review latest versions" })).toBeDisabled();
  });
});
