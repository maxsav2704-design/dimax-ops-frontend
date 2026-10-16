import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkPriceInvitation } from "@/components/operations/WorkPriceInvitation";

const mocks = vi.hoisted(() => ({ api: vi.fn(), locale: "en" }));
vi.mock("@/lib/api", () => ({ apiFetch: mocks.api }));
vi.mock("@/lib/i18n", () => ({ useCopy: () => (en: string, ru: string, he: string) => (mocks.locale === "ru" ? ru : mocks.locale === "he" ? he : en), useI18n: () => ({ locale: mocks.locale }) }));
const contact = { id: "approved-contact", factory_name: "Factory QA", recipient_name: "Representative QA", recipient_email: "factory@example.org" };
const invitation = { ...contact, id: "invitation", expires_at: "2099-10-01T10:00:00Z", revoked_at: null,
  confirmed_at: null, confirmed_name: null, email_outbox_id: "queued-email" };
const path = "/api/v1/admin/sync/work-price-proposals/proposal/invitations";
function subject() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><WorkPriceInvitation proposalId="proposal" proposalHash={"f".repeat(64)} /></QueryClientProvider>);
}
const open = async () => {
  fireEvent.click(screen.getByRole("button", { name: "Factory confirmation" }));
  await waitFor(() => expect(screen.getByRole("checkbox")).toBeEnabled());
};
beforeEach(() => {
  mocks.locale = "en"; mocks.api.mockReset();
  mocks.api.mockImplementation((url, options) => Promise.resolve(url.endsWith("/contact") ? contact
    : options?.method === "POST" ? invitation : { items: [], total: 0 }));
});
describe("factory invitation for one work", () => {
  it("opens explicitly and sends only the approved contact and immutable proposal hash", async () => {
    subject(); expect(mocks.api).not.toHaveBeenCalled(); await open();
    expect(screen.getByText("factory@example.org")).toBeInTheDocument();
    const send = screen.getByRole("button", { name: "Send invitation by email" });
    expect(send).toBeDisabled(); fireEvent.click(screen.getByRole("checkbox")); fireEvent.click(send);
    await waitFor(() => expect(mocks.api.mock.calls.some(([, options]) => options?.method === "POST")).toBe(true));
    const [, options] = mocks.api.mock.calls.find(([, options]) => options?.method === "POST")!;
    expect(JSON.parse(options.body)).toEqual({ request_id: expect.any(String), factory_contact_id: contact.id,
      proposal_hash: "f".repeat(64), expires_in_hours: 72 });
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(mocks.api.mock.calls.some(([url]) => url.includes("/confirm") || url.includes("/resolve"))).toBe(false);
  });
  it("does not invent a contact when none was approved", async () => {
    mocks.api.mockImplementation((url) => Promise.resolve(url.endsWith("/contact") ? null : { items: [], total: 0 }));
    subject(); fireEvent.click(screen.getByRole("button", { name: "Factory confirmation" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("owner must approve");
    expect(screen.getByRole("button", { name: "Send invitation by email" })).toBeDisabled();
  });
  it("preserves the same request after an uncertain send", async () => {
    mocks.api.mockImplementation((url, options) => options?.method === "POST" ? Promise.reject(new Error("Lost response"))
      : Promise.resolve(url.endsWith("/contact") ? contact : { items: [], total: 0 }));
    subject(); await open(); fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Send invitation by email" }));
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Send invitation by email" }));
    await waitFor(() => expect(mocks.api.mock.calls.filter(([, options]) => options?.method === "POST")).toHaveLength(2));
    const bodies = mocks.api.mock.calls.filter(([, options]) => options?.method === "POST").map(([, options]) => options.body);
    expect(bodies[0]).toBe(bodies[1]);
  });
  it("clears consent when lifetime changes and on status recheck", async () => {
    subject(); await open(); fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.change(screen.getByLabelText("Link lifetime"), { target: { value: "24" } });
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    fireEvent.click(screen.getByRole("checkbox")); fireEvent.click(screen.getByRole("button", { name: "Check status" }));
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });
  it("shows a recorded decision with separate accrual review but no resend or revoke", async () => {
    mocks.api.mockImplementation((url) => Promise.resolve(url.endsWith("/contact") ? contact : { total: 1,
      items: [{ ...invitation, confirmed_at: "2026-10-13T10:00:00Z", confirmed_name: "Factory QA" }] }));
    subject(); fireEvent.click(screen.getByRole("button", { name: "Factory confirmation" }));
    await screen.findByText("Factory confirmed");
    expect(screen.getByRole("button", { name: "Review accrual" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Send invitation by email" })).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });
  it("requires a reason to revoke and targets the exact invitation", async () => {
    mocks.api.mockImplementation((url, options) => Promise.resolve(url.endsWith("/contact") ? contact
      : options?.method === "POST" ? { ...invitation, revoked_at: "2026-10-13T10:00:00Z" } : { items: [invitation], total: 1 }));
    subject(); await open();
    const revoke = screen.getByRole("button", { name: "Revoke invitation" }); expect(revoke).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Reason for revocation"), { target: { value: "Factory request withdrawn" } });
    fireEvent.click(revoke);
    await waitFor(() => expect(mocks.api).toHaveBeenCalledWith(`${path}/invitation/revoke`, expect.objectContaining({
      method: "POST", body: JSON.stringify({ reason: "Factory request withdrawn" }) })));
  });
  it.each([["ru", "Согласование с заводом"], ["he", "אישור המפעל"]])("labels the action in %s", (locale, name) => {
    mocks.locale = locale; subject(); expect(screen.getByRole("button", { name })).toBeInTheDocument();
  });
});
