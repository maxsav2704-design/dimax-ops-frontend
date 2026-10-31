import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StrictMode, type ReactNode } from "react";
import PriceListsPage from "@/views/PriceListsPage";
import { FactoryContactPanel } from "@/components/prices/FactoryContactPanel";
import { PRICE_API, type FactoryContact } from "@/lib/factory-prices";
import { clearStoredSession, persistAccessToken } from "@/lib/auth-session";

// A signed access token for a person; the page drops its financial workspace only when the person changes.
const jwt = (sub: string, n = 1) => `h.${btoa(JSON.stringify({ sub, n })).replace(/=+$/, "")}.s`;
const signInAs = (sub: string, n = 1) => act(() => persistAccessToken(jwt(sub, n)));

const { api, auth } = vi.hoisted(() => ({ api: vi.fn(), auth: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiFetch: api }));
vi.mock("@/hooks/use-auth-session", () => ({ useAuthSession: auth }));
vi.mock("@/components/DashboardLayout", () => ({ DashboardLayout: ({ children }: { children: ReactNode }) => <div>{children}</div> }));

const draft = {
  id: "list-1", version: 1, status: "DRAFT", currency: "ILS", reason: "Factory request", agreement_reference: "Agreement 42",
  created_at: "2026-10-02T08:00:00Z", created_by: "owner", cancelled_at: null, cancellation_reason: null,
  items: [{ kind: "DOOR", target_id: "door-1", name: "Entrance", unit: "pcs", installer_price: "250.00" }],
};
const invitation = {
  id: "invite-1", price_list_id: "list-1", factory_name: "QA Factory", recipient_name: "Representative", recipient_email: "rep@example.test",
  created_at: "2026-10-02T09:00:00Z", expires_at: "2099-10-02T09:00:00Z", revoked_at: null, revocation_reason: null, confirmed_at: null, confirmed_name: null,
};
function reads(path: string) {
  if (path === `${PRICE_API}/factory/contact`) return { id: "contact-1", factory_name: "QA Factory",
    recipient_name: "Representative", recipient_email: "rep@example.test", authority_reference: "Agreement 42",
    approved_by: "owner", created_at: "2026-10-02T08:00:00Z" };
  if (path === `${PRICE_API}/state`) return { mode: "LEGACY", active_price: null };
  if (path.startsWith(`${PRICE_API}?`)) return { items: [draft], total: 1, latest_version: 1 };
  if (path === `${PRICE_API}/list-1`) return draft;
  if (path.includes("/approvals?")) return { items: [], total: 0 };
  if (path.startsWith("/api/v1/admin/door-types?")) return [{ id: "door-1", name: "Entrance" }];
  if (path === "/api/v1/admin/addons/types") return { items: [{ id: "addon-1", name: "Adjustment", unit: "hour", is_active: true }] };
  throw new Error(`Unexpected test request ${path}`);
}
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(<StrictMode><QueryClientProvider client={client}><PriceListsPage /></QueryClientProvider></StrictMode>);
  return { ...view, client };
}
async function inviteForm() {
  // 5 s: the first test in the file pays the jsdom/React cold start on a loaded host.
  await screen.findByText("Entrance", undefined, { timeout: 5000 });
  await waitFor(() => expect(screen.getByRole("button", { name: "Create factory link" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "Create factory link" }));
  const form = within(screen.getByRole("dialog"));
  expect(form.getByLabelText("Factory")).toHaveAttribute("readonly");
  expect(form.getByLabelText("Representative")).toHaveAttribute("readonly");
  expect(form.getByLabelText("Representative email")).toHaveValue("rep@example.test");
  expect(form.getByLabelText("Representative email")).toHaveAttribute("readonly");
  fireEvent.click(form.getByRole("checkbox", { name: /The contact is correct/ }));
  return form;
}

describe("factory price management", () => {
  beforeEach(() => {
    clearStoredSession(); persistAccessToken(jwt("owner-1"));
    auth.mockReturnValue({ role: "ADMIN", admin_scope: "OWNER", can_view_rates: true });
    api.mockReset(); api.mockImplementation(async (path: string) => reads(path));
  });
  it("lets operations invite but not replace the factory contact", async () => {
    auth.mockReturnValue({ role: "ADMIN", admin_scope: "OPERATIONS", can_view_rates: true });
    mount(); await inviteForm();
    expect(screen.queryByRole("button", { name: "Approve contact" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Revoke contact" })).not.toBeInTheDocument();
  });
  it("requires an explicit reason before the owner revokes factory authority", async () => {
    api.mockImplementation(async (path: string) => path.endsWith("/factory/contact/revoke") ? { ok: true } : reads(path));
    mount(); await screen.findByText("Entrance");
    fireEvent.click(screen.getByRole("button", { name: "Revoke contact" }));
    const form = within(screen.getByRole("dialog"));
    expect(form.getByRole("button", { name: "Confirm action" })).toBeDisabled();
    fireEvent.change(form.getByLabelText("Revocation reason"), { target: { value: "Representative left factory" } });
    fireEvent.click(form.getByRole("button", { name: "Confirm action" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const write = api.mock.calls.find(([path]) => path.endsWith("/factory/contact/revoke"))!;
    expect(JSON.parse(write[1].body)).toEqual({ expected_contact_id: "contact-1", reason: "Representative left factory" });
  });
  it("blocks invitations until the owner registers a contact", async () => {
    api.mockImplementation(async (path: string) => path === `${PRICE_API}/factory/contact` ? null : reads(path));
    mount(); await screen.findByText("Entrance");
    expect(screen.getByRole("button", { name: "Create factory link" })).toBeDisabled();
    expect(screen.getByText(/owner must approve a contact/)).toBeInTheDocument();
  });
  it("requires authority evidence and explicit owner consent when changing a contact", async () => {
    mount(); await screen.findByText("Entrance");
    fireEvent.click(screen.getByRole("button", { name: "Approve contact" }));
    const form = within(screen.getByRole("dialog"));
    expect(form.getByRole("button", { name: "Confirm action" })).toBeDisabled();
    fireEvent.change(form.getByLabelText("Representative email"), { target: { value: "new@example.test" } });
    fireEvent.change(form.getByLabelText("Authority reference"), { target: { value: "Verified agreement 43" } });
    fireEvent.click(form.getByRole("checkbox", { name: /verified this representative/ }));
    fireEvent.click(form.getByRole("button", { name: "Confirm action" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const write = api.mock.calls.find(([path, init]) => path === `${PRICE_API}/factory/contact` && init?.method === "POST")!;
    expect(JSON.parse(write[1].body)).toMatchObject({ expected_contact_id: "contact-1", recipient_email: "new@example.test", authority_reference: "Verified agreement 43" });
  });
  it("keeps the original contact revision when a background refresh changes the contact", async () => {
    const contact = reads(`${PRICE_API}/factory/contact`) as FactoryContact;
    const props = { owner: true, pending: false, error: false, onChanged: vi.fn() };
    const view = render(<FactoryContactPanel {...props} contact={contact} />);
    fireEvent.click(screen.getByRole("button", { name: "Approve contact" }));
    view.rerender(<FactoryContactPanel {...props} contact={{ ...contact, id: "contact-new" }} />);
    const form = within(screen.getByRole("dialog"));
    fireEvent.click(form.getByRole("checkbox", { name: /verified this representative/ }));
    fireEvent.click(form.getByRole("button", { name: "Confirm action" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const write = api.mock.calls.find(([path, init]) => path === `${PRICE_API}/factory/contact` && init?.method === "POST")!;
    expect(JSON.parse(write[1].body).expected_contact_id).toBe("contact-1");
  });
  it.each([
    { role: "INSTALLER", admin_scope: null, can_view_rates: false },
    { role: "ADMIN", admin_scope: "OPERATIONS", can_view_rates: false },
    { role: "ADMIN", admin_scope: "VIEWER", can_view_rates: true },
  ])("does not load financial data for denied access %j", (session) => {
    auth.mockReturnValue(session); mount();
    expect(screen.getByText("Price access is unavailable")).toBeInTheDocument();
    expect(api).not.toHaveBeenCalled();
  });
  it("makes finance read-only and never offers a factory-confirm button to admins", async () => {
    auth.mockReturnValue({ role: "ADMIN", admin_scope: "FINANCE", can_view_rates: true });
    mount(); await screen.findByText("Entrance");
    expect(screen.queryByRole("button", { name: "New version" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create factory link" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirm prices" })).not.toBeInTheDocument();
  });
  it.each(["FINANCE", "OWNER"])("limits activation of confirmed lists for %s", async (scope) => {
    auth.mockReturnValue({ role: "ADMIN", admin_scope: scope, can_view_rates: true });
    api.mockImplementation(async (path: string) => {
      if (path.startsWith(`${PRICE_API}?`)) return { items: [{ ...draft, status: "CONFIRMED" }], total: 1, latest_version: 1 };
      if (path === `${PRICE_API}/list-1`) return { ...draft, status: "CONFIRMED" };
      return reads(path);
    });
    mount(); await screen.findByText("Entrance");
    if (scope === "OWNER") await waitFor(() => expect(screen.getByRole("button", { name: "Apply confirmed prices" })).toBeEnabled());
    else expect(screen.queryByRole("button", { name: "Apply confirmed prices" })).not.toBeInTheDocument();
  });
  it("distinguishes the effective version from a newer confirmed list", async () => {
    const newer = { ...draft, id: "list-2", version: 2, status: "CONFIRMED", items: [{ ...draft.items[0], name: "Later price" }] };
    api.mockImplementation(async (path: string) => {
      if (path === `${PRICE_API}/state`) return { mode: "FACTORY", active_price: {
        price_list_id: draft.id, version: 1, currency: "ILS", effective_from: "2026-10-04T08:00:00Z", items: [],
      } };
      if (path.startsWith(`${PRICE_API}?`)) return { items: [newer, { ...draft, status: "CONFIRMED" }], total: 2, latest_version: 2 };
      if (path === `${PRICE_API}/list-1`) return { ...draft, status: "CONFIRMED" };
      if (path === `${PRICE_API}/list-2`) return newer;
      return reads(path);
    });
    mount(); await screen.findByText("Active factory price list v1");
    await screen.findByText("Entrance");
    fireEvent.click(screen.getByRole("button", { name: /Version 2/ }));
    await screen.findByText("Later price");
    expect(screen.getByText("Not currently effective")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open active version" }));
    await screen.findByText("Entrance");
    expect(screen.getByText("Currently effective")).toBeInTheDocument();
    expect(screen.queryByText("Later price")).not.toBeInTheDocument();
    expect(screen.queryByText(/not yet applied to work/)).not.toBeInTheDocument();
  });
  it("retries an ambiguous draft save using exactly the same request ID and payload", async () => {
    let writes = 0;
    api.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === PRICE_API && init?.method === "POST") {
        writes++;
        if (writes === 1) throw { status: 0 };
        return draft;
      }
      return reads(path);
    });
    mount(); await screen.findByText("Entrance");
    fireEvent.click(screen.getByRole("button", { name: "New version" }));
    const form = within(screen.getByRole("dialog"));
    fireEvent.change(form.getByLabelText("Change request / reason"), { target: { value: "Factory amendment" } });
    fireEvent.change(form.getByLabelText("Installer rate, ILS: Entrance"), { target: { value: "275,50" } });
    await waitFor(() => expect(form.getByRole("button", { name: "Save draft" })).toBeEnabled());
    fireEvent.click(form.getByRole("button", { name: "Save draft" }));
    fireEvent.click(await screen.findByRole("button", { name: "Retry the same save" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const bodies = api.mock.calls.filter(([path, init]) => path === PRICE_API && init?.method === "POST").map(([, init]) => JSON.parse(init.body));
    expect(bodies).toHaveLength(2); expect(bodies[0]).toEqual(bodies[1]);
    expect(bodies[0]).toMatchObject({ expected_latest_version: 1, items: [{ kind: "DOOR", target_id: "door-1", installer_price: "275.50" }] });
  });
  it("shows a one-time link without storing it in query caches or browser storage", async () => {
    const secret = `https://factory.example.test/price-approval#${"A".repeat(43)}`;
    api.mockImplementation(async (path: string, init?: RequestInit) => path.endsWith("/approvals") && init?.method === "POST" ?
      { invitation, confirmation_url: secret } : reads(path));
    const { client } = mount();
    const form = await inviteForm();
    fireEvent.click(form.getByRole("button", { name: "Create link" }));
    expect(await screen.findByText("Link created, not sent")).toBeInTheDocument();
    expect(screen.getByLabelText("Personal confirmation link")).toHaveValue(secret);
    expect(JSON.stringify(client.getQueryCache().getAll())).not.toContain(secret);
    expect(JSON.stringify(window.localStorage)).not.toContain(secret);
    expect(JSON.stringify(window.sessionStorage)).not.toContain(secret);
    fireEvent.click(screen.getAllByRole("button", { name: "Close" })[0]);
    expect(screen.queryByLabelText("Personal confirmation link")).not.toBeInTheDocument();
    expect(api.mock.calls.some(([path]) => path.includes("/public/price-approvals/confirm"))).toBe(false);
  });
  it("queues email only by explicit choice and does not claim delivery", async () => {
    api.mockImplementation(async (path: string, init?: RequestInit) => path.endsWith("/approvals") && init?.method === "POST" ?
      { invitation, confirmation_url: `https://dimax.example/price-approval#${"A".repeat(43)}`, email_outbox_id: "queued-email" } : reads(path));
    mount(); const form = await inviteForm();
    const send = form.getByRole("checkbox", { name: "Email this invitation to the representative" });
    expect(send).not.toBeChecked();
    fireEvent.click(send);
    fireEvent.click(form.getByRole("button", { name: "Create link" }));
    expect(await screen.findByText("Invitation queued for email")).toBeInTheDocument();
    expect(screen.getByText(/Queued, not yet delivered/)).toBeInTheDocument();
    const call = api.mock.calls.find(([path, init]) => path.endsWith("/approvals") && init?.method === "POST")!;
    expect(JSON.parse(call[1].body).send_email).toBe(true);
  });
  it("does not silently reissue an invitation after a lost response", async () => {
    api.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path.endsWith("/approvals") && init?.method === "POST") throw { status: 502 };
      return reads(path);
    });
    mount(); const form = await inviteForm();
    fireEvent.click(form.getByRole("button", { name: "Create link" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("response was lost");
    expect(form.getByRole("button", { name: "Create link" })).toBeDisabled();
    expect(api.mock.calls.filter(([path, init]) => path.endsWith("/approvals") && init?.method === "POST")).toHaveLength(1);
  });
  it("does not silently rebase a draft after a version conflict", async () => {
    api.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === PRICE_API && init?.method === "POST") throw { status: 409 };
      return reads(path);
    });
    mount(); await screen.findByText("Entrance");
    fireEvent.click(screen.getByRole("button", { name: "New version" }));
    const form = within(screen.getByRole("dialog"));
    fireEvent.change(form.getByLabelText("Change request / reason"), { target: { value: "New agreement" } });
    await waitFor(() => expect(form.getByRole("button", { name: "Save draft" })).toBeEnabled());
    fireEvent.click(form.getByRole("button", { name: "Save draft" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("changed on the server");
    expect(form.getByRole("button", { name: "Save draft" })).toBeDisabled();
    expect(api.mock.calls.filter(([path, init]) => path === PRICE_API && init?.method === "POST")).toHaveLength(1);
  });
  it("keeps an unsaved new version open through a routine token refresh, not through another account", async () => {
    persistAccessToken(jwt("owner-1", 1));
    try {
      mount(); await screen.findByText("Entrance");
      await waitFor(() => expect(screen.getByRole("button", { name: "New version" })).toBeEnabled());
      fireEvent.click(screen.getByRole("button", { name: "New version" }));
      const form = within(screen.getByRole("dialog"));
      fireEvent.change(form.getByLabelText("Change request / reason"), { target: { value: "Factory offer" } });
      act(() => persistAccessToken(jwt("owner-1", 2)));
      expect(within(screen.getByRole("dialog")).getByLabelText("Change request / reason")).toHaveValue("Factory offer");
      act(() => persistAccessToken(jwt("owner-2", 3)));
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    } finally {
      clearStoredSession();
    }
  });
  it("drops the financial workspace and any open link on a session change", async () => {
    const secret = `https://factory.example.test/price-approval#${"A".repeat(43)}`;
    api.mockImplementation(async (path: string, init?: RequestInit) => path.endsWith("/approvals") && init?.method === "POST" ?
      { invitation, confirmation_url: secret } : reads(path));
    mount(); const form = await inviteForm();
    fireEvent.click(form.getByRole("button", { name: "Create link" }));
    await screen.findByText("Link created, not sent");
    auth.mockReturnValue({ role: "INSTALLER" });
    signInAs("installer-1");
    expect(await screen.findByText("Price access is unavailable")).toBeInTheDocument();
    expect(screen.queryByLabelText("Personal confirmation link")).not.toBeInTheDocument();
    expect(screen.queryByText("Entrance")).not.toBeInTheDocument();
  });
  it("requires a reason to revoke a pending link", async () => {
    api.mockImplementation(async (path: string, init?: RequestInit) => path.endsWith("/revoke") && init?.method === "POST" ?
      { ...invitation, revoked_at: "2026-10-02T10:00:00Z" } : path.includes("/approvals?") ? { items: [invitation], total: 1 } : reads(path));
    mount(); fireEvent.click(await screen.findByRole("button", { name: "Revoke link: Representative" }));
    const form = within(screen.getByRole("dialog"));
    expect(form.getByRole("button", { name: "Confirm action" })).toBeDisabled();
    fireEvent.change(form.getByLabelText("Revocation reason"), { target: { value: "Wrong contact" } });
    fireEvent.click(form.getByRole("button", { name: "Confirm action" }));
    await waitFor(() => expect(api).toHaveBeenCalledWith(`${PRICE_API}/list-1/approvals/invite-1/revoke`, expect.objectContaining({ body: JSON.stringify({ reason: "Wrong contact" }) })));
  });
  it("creates the first price list from door and add-on catalog entries", async () => {
    api.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path.startsWith(`${PRICE_API}?`)) return { items: [], total: 0, latest_version: 0 };
      if (path === PRICE_API && init?.method === "POST") return draft;
      return reads(path);
    });
    mount(); await screen.findByText("No price-list versions yet");
    fireEvent.click(screen.getByRole("button", { name: "New version" }));
    const form = within(screen.getByRole("dialog"));
    fireEvent.change(form.getByLabelText("Change request / reason"), { target: { value: "Factory offer" } });
    fireEvent.change(form.getByLabelText("Agreement reference"), { target: { value: "QA agreement" } });
    await form.findByRole("option", { name: "Entrance" });
    for (const [key, name, price] of [["DOOR:door-1", "Entrance", "250"], ["ADDON:addon-1", "Adjustment", "9,50"]]) {
      fireEvent.change(form.getByLabelText("Select work"), { target: { value: key } });
      fireEvent.click(form.getByRole("button", { name: "Add work" }));
      expect(form.getByLabelText(`Installer rate, ILS: ${name}`)).toHaveValue("");
      fireEvent.change(form.getByLabelText(`Installer rate, ILS: ${name}`), { target: { value: price } });
    }
    fireEvent.click(form.getByRole("button", { name: "Save draft" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const body = JSON.parse(api.mock.calls.find(([path, init]) => path === PRICE_API && init?.method === "POST")![1].body);
    expect(body).toMatchObject({ expected_latest_version: 0, items: [
      { kind: "DOOR", target_id: "door-1", installer_price: "250.00" },
      { kind: "ADDON", target_id: "addon-1", installer_price: "9.50" },
    ] });
  });
  it("cancels only the selected draft with an explicit reason", async () => {
    api.mockImplementation(async (path: string, init?: RequestInit) => path.endsWith("/cancel") && init?.method === "POST" ?
      { ...draft, status: "CANCELLED", cancellation_reason: "Withdrawn offer" } : reads(path));
    mount(); fireEvent.click(await screen.findByRole("button", { name: "Cancel draft" }));
    const form = within(screen.getByRole("dialog"));
    expect(form.getByRole("button", { name: "Confirm action" })).toBeDisabled();
    fireEvent.change(form.getByLabelText("Cancellation reason"), { target: { value: "Withdrawn offer" } });
    fireEvent.click(form.getByRole("button", { name: "Confirm action" }));
    await waitFor(() => expect(api).toHaveBeenCalledWith(`${PRICE_API}/list-1/cancel`, expect.objectContaining({ body: JSON.stringify({ reason: "Withdrawn offer" }) })));
  });
  it("opens reconciliation for finance and clears it when the account changes", async () => {
    auth.mockReturnValue({ role: "ADMIN", admin_scope: "FINANCE", can_view_rates: true });
    api.mockImplementation(async (path: string) => path.includes("/reconciliation?") ? {
      price_list_id: draft.id, version: 1, currency: "ILS", generated_at: "2026-10-03T09:00:00Z", items: [], total: 0,
      application_check: { status: "BLOCKED", affects_earnings: false, confirmed_at: null, blockers: [{ code: "NOT_CONFIRMED", count: 1 }], review: [] },
      summary: { total_sources: 0, review_sources: 0, missing_proposed: 0, pending_addon_facts: 0,
        door_snapshots: 0, door_surcharges: 0, catalog_changes: 0, scheduled_rates: 0, urgency_surcharges: 0, historical_entries: 0, multiple_rate_types: 0 },
    } : reads(path));
    mount(); await screen.findByText("Entrance");
    fireEvent.click(screen.getByRole("button", { name: "Compare current rates" }));
    await screen.findByText("No items for these filters");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(api.mock.calls.every(([, init]) => !init?.method)).toBe(true);
    auth.mockReturnValue({ role: "INSTALLER" });
    signInAs("installer-1");
    await screen.findByText("Price access is unavailable");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText("No items for these filters")).not.toBeInTheDocument();
  });
  it("offers inventory when there are no price-list versions", async () => {
    api.mockImplementation(async (path: string) => {
      if (path.startsWith(`${PRICE_API}?`)) return { items: [], total: 0, latest_version: 0 };
      if (path.startsWith(`${PRICE_API}/reconciliation?`)) throw { status: 403 };
      return reads(path);
    });
    mount(); await screen.findByText("No price-list versions yet");
    fireEvent.click(screen.getByRole("button", { name: "Compare current rates" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Price access is unavailable");
    expect(api).toHaveBeenCalledWith(expect.stringContaining(`${PRICE_API}/reconciliation?`), expect.objectContaining({ signal: expect.anything() }));
  });
  it("asks through an in-app dialog before discarding unsaved editor changes", async () => {
    mount(); await screen.findByText("Entrance", undefined, { timeout: 5000 });
    fireEvent.click(screen.getByRole("button", { name: "New version" }));
    const form = within(screen.getByRole("dialog"));
    fireEvent.change(form.getByLabelText("Change request / reason"), { target: { value: "Typed, not saved" } });
    // [0] is the footer button; the dialog chrome also has an sr-only "Close".
    fireEvent.click(form.getAllByRole("button", { name: "Close" })[0]);
    const prompt = await screen.findByRole("alertdialog", { name: "Discard unsaved changes?" });
    fireEvent.click(within(prompt).getByRole("button", { name: "Keep editing" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(screen.getByLabelText("Change request / reason")).toHaveValue("Typed, not saved");
    fireEvent.click(screen.getAllByRole("button", { name: "Close" })[0]);
    const again = await screen.findByRole("alertdialog", { name: "Discard unsaved changes?" });
    fireEvent.click(within(again).getByRole("button", { name: "Discard changes" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(api.mock.calls.some(([path, init]) => path === PRICE_API && init?.method === "POST")).toBe(false);
  });
});
