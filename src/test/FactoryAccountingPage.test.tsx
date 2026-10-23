import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StrictMode, type ReactNode } from "react";
import FactoryAccountingPage from "@/views/FactoryAccountingPage";
import { COMMERCIAL_API as API, commercialPricesPath } from "@/lib/commercial-prices";
import { LanguageProvider } from "@/lib/i18n";

const { api, auth } = vi.hoisted(() => ({ api: vi.fn(), auth: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiFetch: api }));
vi.mock("@/hooks/use-auth-session", () => ({ useAuthSession: auth }));
vi.mock("@/components/DashboardLayout", () => ({ DashboardLayout: ({ children }: { children: ReactNode }) => <div>{children}</div> }));

const owner = "1cac48c4-1b12-43fd-a02e-cab93c669e24";
const door = "f58a8a1d-d80a-458f-9263-b035f135c529";
const addon = "1e5b197a-18de-4f59-b833-5cf3d81b67cd";
const contract = {
  id: "63982c70-23a7-4ae7-9a23-9c661372c4be", factory_name: "DEMO Factory", reference: "DEMO-2026",
  reason: "Synthetic terms only", currency: "ILS", status: "DRAFT", is_demo: true, created_by: owner,
  created_at: "2026-10-20T10:00:00Z",
};
const path = commercialPricesPath(contract.id);
const price = {
  id: "ccf5a0c4-3142-4826-9c34-9a595b42bcf6", contract_id: contract.id, version: 1, status: "DRAFT",
  proposed_from: "2026-11-10", reason: "Test quote", agreement_reference: "Test only",
  created_by: owner, created_at: contract.created_at, currency: "ILS", vat_basis: "EXCLUSIVE",
  factory_confirmed: false, usable_for_billing: false, is_demo: true,
  items: [{ kind: "INSTALLATION", target_id: door, stage_code: "", name: "Entrance", unit: "pcs", unit_price_ex_vat: "400.00" }],
};
function reads(url: string) {
  if (url.startsWith(API + "?")) return { items: [contract], total: 1 };
  if (url.startsWith(path + "?")) return { items: [price], total: 1, latest_version: 1 };
  if (url === path + "/" + price.id) return price;
  if (url.startsWith("/api/v1/admin/door-types?")) return [{ id: door, name: "Entrance" }];
  if (url === "/api/v1/admin/addons/types") return { items: [{ id: addon, name: "Adjustment", unit: "hour", is_active: true }] };
  throw new Error("Unexpected request " + url);
}
function mount(locale = "en") {
  localStorage.setItem("dimax_locale", locale);
  return render(<StrictMode><LanguageProvider><FactoryAccountingPage /></LanguageProvider></StrictMode>);
}
async function editor() {
  await screen.findByText("Entrance", undefined, { timeout: 5000 });
  await waitFor(() => expect(screen.getByRole("button", { name: "New price version" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "New price version" }));
  const form = within(screen.getByRole("dialog"));
  fireEvent.change(form.getByLabelText("Change reason"), { target: { value: "Test amendment" } });
  await waitFor(() => expect(form.getByRole("button", { name: "Save draft" })).toBeEnabled());
  return form;
}

describe("commercial draft UI", () => {
  beforeEach(() => {
    localStorage.clear();
    auth.mockReturnValue({ role: "ADMIN", admin_scope: "OWNER" });
    api.mockReset(); api.mockImplementation(async (url: string) => reads(url));
  });
  it.each(["OPERATIONS", "FINANCE", "VIEWER", "INSTALLER", null])("does not query commercial data for %s", (scope) => {
    auth.mockReturnValue({ role: scope === "INSTALLER" ? "INSTALLER" : "ADMIN", admin_scope: scope });
    mount(); expect(screen.getByText("Contracts & billing access requires OWNER.")).toBeInTheDocument();
    expect(api).not.toHaveBeenCalled();
  });
  it("shows separate commercial terms, demo marking and no approval/billing controls", async () => {
    mount(); await screen.findByText("Entrance", {}, { timeout: 5000 });
    expect(screen.getByText("Factory decisions are recorded for a pair of versions in Factory confirmation.")).toBeInTheDocument();
    expect(screen.getByText("Not available for billing")).toBeInTheDocument();
    expect(screen.getByText(/Invented test prices/)).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "DIMAX price, ILS excl. VAT" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /confirm|activate|invoice/i })).not.toBeInTheDocument();
    expect(api.mock.calls.every(([url]) => !url.includes("/admin/price-lists"))).toBe(true);
  });
  it("creates a first contract with only user-owned draft fields", async () => {
    let created = false;
    api.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url === API && init?.method === "POST") { created = true; return contract; }
      if (url.startsWith(API + "?")) return { items: created ? [contract] : [], total: created ? 1 : 0 };
      return reads(url);
    });
    mount(); await screen.findByText("No contracts yet");
    fireEvent.click(screen.getByRole("button", { name: "New contract" }));
    const form = within(screen.getByRole("dialog"));
    expect(form.getByRole("button", { name: "Save draft" })).toBeDisabled();
    for (const [label, value] of [["Factory", "DEMO Factory"], ["Contract reference", "DEMO-2026"], ["Preparation reason", "Test terms"]]) {
      fireEvent.change(form.getByLabelText(label), { target: { value } });
    }
    fireEvent.click(form.getByRole("button", { name: "Save draft" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const body = JSON.parse(api.mock.calls.find(([url, init]) => url === API && init?.method === "POST")![1].body);
    expect(body).toEqual({ request_id: expect.any(String), factory_name: "DEMO Factory", reference: "DEMO-2026", reason: "Test terms" });
  });
  it("allows zero, stage and addon prices without sending installer prices or snapshot labels", async () => {
    api.mockImplementation(async (url: string, init?: RequestInit) => init?.method === "POST" ? price : reads(url));
    mount(); const form = await editor();
    fireEvent.change(form.getByLabelText("DIMAX price, ILS excl. VAT: Entrance"), { target: { value: "0" } });
    fireEvent.change(form.getByLabelText("Pricing basis"), { target: { value: "STAGE" } });
    fireEvent.change(form.getByLabelText("Select work"), { target: { value: door } });
    fireEvent.change(form.getByLabelText("Stage code"), { target: { value: "FRAME" } });
    fireEvent.click(form.getByRole("button", { name: "Add line" }));
    fireEvent.change(form.getByLabelText("DIMAX price, ILS excl. VAT: Entrance / FRAME"), { target: { value: "150,50" } });
    fireEvent.change(form.getByLabelText("Pricing basis"), { target: { value: "ADDON" } });
    fireEvent.change(form.getByLabelText("Select work"), { target: { value: addon } });
    fireEvent.click(form.getByRole("button", { name: "Add line" }));
    fireEvent.change(form.getByLabelText("DIMAX price, ILS excl. VAT: Adjustment"), { target: { value: "60" } });
    fireEvent.click(form.getByRole("button", { name: "Save draft" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const body = JSON.parse(api.mock.calls.find(([, init]) => init?.method === "POST")![1].body);
    expect(body.expected_latest_version).toBe(1);
    expect(body.items).toEqual([
      { kind: "INSTALLATION", target_id: door, stage_code: "", unit_price_ex_vat: "0.00" },
      { kind: "STAGE", target_id: door, stage_code: "FRAME", unit_price_ex_vat: "150.50" },
      { kind: "ADDON", target_id: addon, stage_code: "", unit_price_ex_vat: "60.00" },
    ]);
  });
  it("blocks duplicate stages and missing catalog entries", async () => {
    mount(); const form = await editor();
    fireEvent.change(form.getByLabelText("Select work"), { target: { value: door } });
    expect(form.getByRole("button", { name: "Add line" })).toBeDisabled();
    fireEvent.change(form.getByLabelText("Pricing basis"), { target: { value: "STAGE" } });
    fireEvent.change(form.getByLabelText("Select work"), { target: { value: door } });
    fireEvent.change(form.getByLabelText("Stage code"), { target: { value: "bad-code" } });
    expect(form.getByRole("button", { name: "Add line" })).toBeDisabled();
  });
  it.each([0, 200, 503])("retries an uncertain %s response with the exact same body", async (status) => {
    let attempts = 0;
    api.mockImplementation(async (url: string, init?: RequestInit) => {
      if (init?.method === "POST") { if (++attempts === 1) throw { status }; return price; }
      return reads(url);
    });
    mount(); const form = await editor();
    fireEvent.click(form.getByRole("button", { name: "Save draft" }));
    await screen.findByText(/save result is unknown/);
    expect(form.getByLabelText("Change reason")).toBeDisabled();
    fireEvent.click(form.getByRole("button", { name: "Check save again" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const writes = api.mock.calls.filter(([, init]) => init?.method === "POST");
    expect(writes).toHaveLength(2); expect(writes[0][1].body).toBe(writes[1][1].body);
  });
  it.each([403, 409])("stops writes after definitive %s errors", async (status) => {
    api.mockImplementation(async (url: string, init?: RequestInit) => { if (init?.method === "POST") throw { status }; return reads(url); });
    mount(); const form = await editor();
    fireEvent.click(form.getByRole("button", { name: "Save draft" }));
    await screen.findByRole("alert");
    expect(form.getByRole("button", { name: "Save draft" })).toBeDisabled();
    expect(form.getByLabelText("Change reason")).toBeDisabled();
  });
  it("asks before discarding changes and clears the modal when auth changes", async () => {
    mount(); const form = await editor();
    fireEvent.click(form.getByRole("button", { name: "Cancel" }));
    const warning = within(await screen.findByRole("alertdialog"));
    fireEvent.click(warning.getByRole("button", { name: "Keep editing" }));
    expect(form.getByLabelText("Change reason")).toHaveValue("Test amendment");
    auth.mockReturnValue({ role: "INSTALLER" });
    fireEvent(window, new CustomEvent("dimax-auth-changed"));
    await screen.findByText("Contracts & billing access requires OWNER.");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText("Entrance")).not.toBeInTheDocument();
  });
  it("disables creation when the backend has not been deployed", async () => {
    api.mockRejectedValue({ status: 404 });
    mount(); await screen.findByRole("alert");
    expect(screen.getByRole("button", { name: "New contract" })).toBeDisabled();
    expect(screen.getByText(/service is unavailable/)).toBeInTheDocument();
  });
  it("does not create a version from a catalog that failed to load", async () => {
    api.mockImplementation(async (url: string) => {
      if (url.startsWith("/api/v1/admin/door-types?")) throw { status: 503 };
      return reads(url);
    });
    mount(); await screen.findByText("Entrance");
    fireEvent.click(screen.getByRole("button", { name: "New price version" }));
    const form = within(screen.getByRole("dialog"));
    fireEvent.change(form.getByLabelText("Change reason"), { target: { value: "Test" } });
    await form.findByRole("alert");
    expect(form.getByRole("button", { name: "Save draft" })).toBeDisabled();
    expect(api.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
  });
  it("binds the selected contract to its own versions", async () => {
    const second = { ...contract, id: "1ed04b7a-13c5-40b9-9ae8-1cd918fb212b", factory_name: "Second factory", reference: "SECOND" };
    api.mockImplementation(async (url: string) => {
      if (url.startsWith(API + "?")) return { items: [contract, second], total: 2 };
      if (url.startsWith(commercialPricesPath(second.id) + "?")) return { items: [], total: 0, latest_version: 0 };
      return reads(url);
    });
    mount(); await screen.findByText("Entrance");
    fireEvent.click(screen.getByRole("button", { name: "Second factory / SECOND" }));
    await screen.findByRole("option", { name: "No price versions yet" });
    expect(screen.queryByText("Entrance")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "New price version" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Second factory");
    expect(within(screen.getByRole("dialog")).getByText("No price lines")).toBeInTheDocument();
  });
  it("loads contract pagination without carrying the previous contract detail", async () => {
    api.mockImplementation(async (url: string) => {
      if (url === API + "?limit=20&offset=20") return { items: [], total: 21 };
      if (url.startsWith(API + "?")) return { items: [contract], total: 21 };
      return reads(url);
    });
    mount(); await screen.findByText("Entrance");
    fireEvent.click(within(screen.getByRole("region", { name: "Contracts" })).getByRole("button", { name: "Next page" }));
    await screen.findByText("No contracts yet");
    expect(screen.queryByText("Entrance")).not.toBeInTheDocument();
    expect(api).toHaveBeenCalledWith(API + "?limit=20&offset=20", expect.anything(), expect.anything());
  });
  it.each([["ru", "Договоры и оплаты", "ltr"], ["he", "חוזים וחיובים", "rtl"]])("renders %s with correct direction", async (locale, heading, dir) => {
    mount(locale); await screen.findByText("Entrance");
    const title = screen.getByRole("heading", { level: 1, name: heading });
    expect(title.closest("[dir]")).toHaveAttribute("dir", dir);
    expect(screen.queryByText("Contracts & billing")).not.toBeInTheDocument();
  });
});
