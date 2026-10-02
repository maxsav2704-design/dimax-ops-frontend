import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StrictMode, type ReactNode } from "react";
import PriceListsPage from "@/views/PriceListsPage";
import { PRICE_API } from "@/lib/factory-prices";

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
  await screen.findByText("Entrance");
  await waitFor(() => expect(screen.getByRole("button", { name: "Create factory link" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "Create factory link" }));
  const form = within(screen.getByRole("dialog"));
  fireEvent.change(form.getByLabelText("Factory"), { target: { value: "QA Factory" } });
  fireEvent.change(form.getByLabelText("Representative"), { target: { value: "Representative" } });
  fireEvent.change(form.getByLabelText("Representative email"), { target: { value: "rep@example.test" } });
  fireEvent.click(form.getByRole("checkbox"));
  return form;
}

describe("factory price management", () => {
  beforeEach(() => {
    auth.mockReturnValue({ role: "ADMIN", admin_scope: "OWNER", can_view_rates: true });
    api.mockReset(); api.mockImplementation(async (path: string) => reads(path));
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
    fireEvent.click(screen.getAllByRole("button", { name: "Close", exact: true })[0]);
    expect(screen.queryByLabelText("Personal confirmation link")).not.toBeInTheDocument();
    expect(api.mock.calls.some(([path]) => path.includes("/public/price-approvals/confirm"))).toBe(false);
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
  it("drops the financial workspace and any open link on a session change", async () => {
    const secret = `https://factory.example.test/price-approval#${"A".repeat(43)}`;
    api.mockImplementation(async (path: string, init?: RequestInit) => path.endsWith("/approvals") && init?.method === "POST" ?
      { invitation, confirmation_url: secret } : reads(path));
    mount(); const form = await inviteForm();
    fireEvent.click(form.getByRole("button", { name: "Create link" }));
    await screen.findByText("Link created, not sent");
    auth.mockReturnValue({ role: "INSTALLER" });
    fireEvent(window, new CustomEvent("dimax-auth-changed"));
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
    mount(); fireEvent.click(await screen.findByRole("button", { name: "Cancel draft", exact: true }));
    const form = within(screen.getByRole("dialog"));
    expect(form.getByRole("button", { name: "Confirm action" })).toBeDisabled();
    fireEvent.change(form.getByLabelText("Cancellation reason"), { target: { value: "Withdrawn offer" } });
    fireEvent.click(form.getByRole("button", { name: "Confirm action" }));
    await waitFor(() => expect(api).toHaveBeenCalledWith(`${PRICE_API}/list-1/cancel`, expect.objectContaining({ body: JSON.stringify({ reason: "Withdrawn offer" }) })));
  });
});
