import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StrictMode, type ReactNode } from "react";
import FactoryAccountingPage from "@/views/FactoryAccountingPage";
import { COMMERCIAL_API as API } from "@/lib/commercial-prices";
import { contractTermsPath, termsInputSchema } from "@/lib/contract-terms";
import { LanguageProvider } from "@/lib/i18n";

const { api, auth } = vi.hoisted(() => ({ api: vi.fn(), auth: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiFetch: api }));
vi.mock("@/hooks/use-auth-session", () => ({ useAuthSession: auth }));
vi.mock("@/components/DashboardLayout", () => ({ DashboardLayout: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
const author = "1cac48c4-1b12-43fd-a02e-cab93c669e24";
const contract = {
  id: "63982c70-23a7-4ae7-9a23-9c661372c4be", factory_name: "Synthetic Factory", reference: "TEST ONLY",
  reason: "Synthetic", currency: "ILS", status: "DRAFT", is_demo: true, created_by: author, created_at: "2026-10-21T10:00:00Z",
};
const path = contractTermsPath(contract.id);
const fields = {
  factory_legal_name: "Synthetic Factory Ltd", registration_number: "TEST-123", address: "Synthetic address",
  contact_name: null, contact_email: null, contact_phone: null, proposed_from: "2026-11-10", proposed_until: null,
  billing_basis: "STAGES", payment_terms: "Synthetic payment clause", retention_terms: "Synthetic no retention",
  reason: "Synthetic preparation", agreement_reference: "TEST ONLY",
};
const first = {
  ...fields, id: "ccf5a0c4-3142-4826-9c34-9a595b42bcf6", contract_id: contract.id, version: 1, status: "DRAFT",
  created_by: author, created_by_name: "Test Owner", created_at: contract.created_at, is_demo: true,
  factory_confirmed: false, usable_for_billing: false, currency: "ILS", vat_basis: "EXCLUSIVE", period_start_day: 10, period_timezone: "Asia/Jerusalem",
};
let rows = [first];
function reads(url: string) {
  if (url.startsWith(API + "?")) return { items: [contract], total: 1 };
  if (url.includes("/prices?")) return { items: [], total: 0, latest_version: 0 };
  if (url.startsWith(path + "?")) return { items: rows, total: rows.length, latest_version: rows.length };
  if (url.startsWith(path + "/")) return rows.find((row) => url.endsWith(row.id));
  throw new Error("Unexpected request " + url);
}
function mount(locale = "en") {
  localStorage.setItem("dimax_locale", locale);
  return render(<StrictMode><LanguageProvider><FactoryAccountingPage /></LanguageProvider></StrictMode>);
}
async function openTerms() {
  fireEvent.click(await screen.findByRole("tab", { name: "Factory details and terms" }));
  await screen.findByRole("combobox", { name: "Terms history" });
  await waitFor(() => expect(screen.getByRole("button", { name: "New terms version" })).toBeEnabled());
}
async function editor() {
  await openTerms(); fireEvent.click(screen.getByRole("button", { name: "New terms version" }));
  return within(screen.getByRole("dialog"));
}

describe("contract terms", () => {
  beforeEach(() => {
    rows = [first]; localStorage.clear(); auth.mockReturnValue({ role: "ADMIN", admin_scope: "OWNER" });
    api.mockReset(); api.mockImplementation(async (url: string) => reads(url));
  });
  it("loads terms only in their own tab and keeps prices separate", async () => {
    mount(); await screen.findByRole("tab", { name: "Factory details and terms" });
    expect(api.mock.calls.some(([url]) => url.includes("/terms"))).toBe(false);
    await openTerms(); await screen.findByText("Synthetic Factory Ltd");
    expect(screen.getByText("Test Owner")).toBeInTheDocument();
    expect(screen.getByText(/10th inclusive/)).toBeInTheDocument();
    expect(screen.getByText(/no authority to approve/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /activate|approve|delete|send/i })).not.toBeInTheDocument();
  });
  it("creates a first snapshot with explicit terms and no contact authority", async () => {
    rows = [];
    api.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url === path && init?.method === "POST") { rows = [first]; return first; }
      return reads(url);
    });
    mount(); const form = await editor();
    expect(form.getByRole("button", { name: "Save draft" })).toBeDisabled();
    for (const [label, value] of [["Legal name", fields.factory_legal_name], ["Registration / tax number", fields.registration_number],
      ["Registered address", fields.address], ["Proposed start date", fields.proposed_from], ["Payment due terms", fields.payment_terms],
      ["Retention and release terms", fields.retention_terms], ["Change reason", fields.reason], ["Agreement reference", fields.agreement_reference]]) {
      fireEvent.change(form.getByLabelText(label), { target: { value } });
    }
    fireEvent.change(form.getByLabelText("Installation payment basis"), { target: { value: "STAGES" } });
    fireEvent.click(form.getByRole("button", { name: "Save draft" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const body = JSON.parse(api.mock.calls.find(([, init]) => init?.method === "POST")![1].body);
    expect(body).toEqual({ ...fields, request_id: expect.any(String), expected_latest_version: 0 });
    expect(await screen.findByText("Synthetic Factory Ltd")).toBeInTheDocument();
  });
  it("copies a version, requires a new reason and keeps prior history readable", async () => {
    const second = { ...first, id: "1ed04b7a-13c5-40b9-9ae8-1cd918fb212b", version: 2, reason: "Amended", address: "New address" };
    api.mockImplementation(async (url: string, init?: RequestInit) => {
      if (init?.method === "POST") { rows = [second, first]; return second; }
      return reads(url);
    });
    mount(); const form = await editor();
    expect(form.getByLabelText("Legal name")).toHaveValue(first.factory_legal_name);
    expect(form.getByLabelText("Change reason")).toHaveValue("");
    fireEvent.change(form.getByLabelText("Change reason"), { target: { value: "Amended" } });
    fireEvent.change(form.getByLabelText("Registered address"), { target: { value: "New address" } });
    fireEvent.click(form.getByRole("button", { name: "Save draft" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByText("New address")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: "Terms history" }), { target: { value: first.id } });
    expect(await screen.findByText(fields.address)).toBeInTheDocument();
    const writes = api.mock.calls.filter(([, init]) => init?.method === "POST");
    expect(writes).toHaveLength(1); expect(JSON.parse(writes[0][1].body).expected_latest_version).toBe(1);
  });
  it.each([403, 409])("locks the editor after definitive %s", async (status) => {
    api.mockImplementation(async (url: string, init?: RequestInit) => { if (init?.method === "POST") throw { status }; return reads(url); });
    mount(); const form = await editor();
    fireEvent.change(form.getByLabelText("Change reason"), { target: { value: "New" } });
    fireEvent.click(form.getByRole("button", { name: "Save draft" }));
    await form.findByRole("alert");
    expect(form.getByRole("button", { name: "Save draft" })).toBeDisabled();
  });
  it("replays the identical uncertain write and warns before closing", async () => {
    let calls = 0;
    api.mockImplementation(async (url: string, init?: RequestInit) => {
      if (init?.method === "POST") { if (++calls === 1) throw { status: 503 }; return first; }
      return reads(url);
    });
    mount(); const form = await editor();
    fireEvent.change(form.getByLabelText("Change reason"), { target: { value: "New" } });
    fireEvent.click(form.getByRole("button", { name: "Save draft" }));
    await form.findByRole("alert");
    expect(form.getByLabelText("Legal name")).toBeDisabled();
    fireEvent.click(form.getByRole("button", { name: "Cancel" }));
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Keep editing" }));
    fireEvent.click(form.getByRole("button", { name: "Check save again" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const writes = api.mock.calls.filter(([, init]) => init?.method === "POST");
    expect(writes).toHaveLength(2); expect(writes[0][1].body).toBe(writes[1][1].body);
  });
  it("does not show stale details or allow a write after a failed terms read", async () => {
    api.mockImplementation(async (url: string) => { if (url.includes("/terms")) throw { status: 404 }; return reads(url); });
    mount(); fireEvent.click(await screen.findByRole("tab", { name: "Factory details and terms" }));
    await screen.findByRole("alert");
    expect(screen.getByRole("button", { name: "New terms version" })).toBeDisabled();
    expect(screen.queryByText("Synthetic Factory Ltd")).not.toBeInTheDocument();
  });
  it("clears the open terms editor on lost permission", async () => {
    mount(); await editor(); auth.mockReturnValue({ role: "INSTALLER" });
    fireEvent(window, new CustomEvent("dimax-auth-changed"));
    await screen.findByText("Factory settlement access requires OWNER.");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("supports keyboard switching", async () => {
    mount(); const tab = await screen.findByRole("tab", { name: "Commercial prices" });
    fireEvent.keyDown(tab, { key: "End" });
    expect(await screen.findByRole("tab", { name: "Factory details and terms" })).toHaveAttribute("aria-selected", "true");
  });
  it.each([["ru", "Реквизиты и условия", "Новая версия условий"], ["he", "פרטי המפעל ותנאי החוזה", "גרסת תנאים חדשה"]])("localizes %s", async (locale, label, button) => {
    mount(locale); fireEvent.click(await screen.findByRole("tab", { name: label }));
    await screen.findByText("Synthetic Factory Ltd");
    fireEvent.click(screen.getByRole("button", { name: button }));
    expect(await screen.findByRole("dialog")).toHaveAttribute("dir", locale === "he" ? "rtl" : "ltr");
  });
  it.each([{ ...fields, proposed_until: "2026-11-09" }, { ...fields, contact_email: "bad" },
    { ...fields, billing_basis: "BOTH" }, { ...fields, contact_phone: "---" }, { ...fields, payment_terms: " " }])("rejects invalid terms", (value) => {
    expect(termsInputSchema.safeParse(value).success).toBe(false);
  });
});
