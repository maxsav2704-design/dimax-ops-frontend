import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StrictMode } from "react";
import CommercialApprovalPage from "@/views/public/CommercialApprovalPage";
import { LanguageProvider } from "@/lib/i18n";
import { publicApproval } from "./commercial-approval-fixture";
const fetchMock = vi.fn(), token = "A".repeat(43);
const response = (body: unknown, status = 200) => ({ ok: status === 200, status, json: async () => body });
function mount(locale = "en", strict = false) {
  localStorage.setItem("dimax_locale", locale);
  const app = <LanguageProvider><CommercialApprovalPage /></LanguageProvider>;
  return render(strict ? <StrictMode>{app}</StrictMode> : app);
}
async function fill() {
  await screen.findByText("Test entrance door");
  fireEvent.change(screen.getByLabelText("Your full name"), { target: { value: "Factory Representative" } });
  fireEvent.change(screen.getByLabelText("Code from email"), { target: { value: "123456" } });
  fireEvent.click(screen.getByRole("checkbox"));
}
describe("commercial public confirmation", () => {
  beforeEach(() => { localStorage.clear(); fetchMock.mockReset(); vi.stubGlobal("fetch", fetchMock);
    window.history.replaceState({}, "", "/commercial-approval#" + token); });
  afterEach(() => vi.unstubAllGlobals());
  it("reviews without confirming and binds both versions, consent, digest and code", async () => {
    fetchMock.mockResolvedValue(response(publicApproval)); mount();
    await screen.findByText("Test entrance door");
    expect(window.location.hash).toBe(""); expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Confirm both versions" })).toBeDisabled();
    await fill();
    fetchMock.mockResolvedValue(response({ ...publicApproval, status: "CONFIRMED", confirmed_name: "Factory Representative", confirmed_at: "2026-10-21T12:00:00Z" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm both versions" }));
    await screen.findByText("Factory decision recorded");
    const [url, options] = fetchMock.mock.calls.at(-1)!;
    expect(url).toContain("/public/commercial-approvals/confirm");
    expect(JSON.parse(options.body)).toEqual({ token, terms_version: 2, price_version: 3,
      snapshot_hash: publicApproval.snapshot_hash, signer_name: "Factory Representative", accepted: true, verification_code: "123456" });
    expect(options.credentials).toBe("omit"); expect(options.referrerPolicy).toBe("no-referrer");
    expect(options.headers.Authorization).toBeUndefined();
  });
  it("keeps uncertain submission blocked until preview verifies it", async () => {
    fetchMock.mockResolvedValue(response(publicApproval)); mount(); await fill();
    fetchMock.mockRejectedValue(new Error("lost reply"));
    fireEvent.click(screen.getByRole("button", { name: "Confirm both versions" }));
    await screen.findByRole("alert"); expect(screen.getByRole("button", { name: "Confirm both versions" })).toBeDisabled();
    fetchMock.mockResolvedValue(response({ ...publicApproval, status: "CONFIRMED" }));
    fireEvent.click(screen.getByRole("button", { name: "Check result" })); await screen.findByText("Factory decision recorded");
    expect(fetchMock.mock.calls.filter(([url]) => url.endsWith("/confirm"))).toHaveLength(1);
  });
  it("queues a code without confirming and enforces resend delay", async () => {
    fetchMock.mockResolvedValue(response(publicApproval)); mount(); await screen.findByText("Test entrance door");
    fetchMock.mockResolvedValue(response({ status: "QUEUED", expires_at: "2099-01-01T12:00:00Z", resend_after: "2099-01-01T11:00:00Z" }));
    fireEvent.click(screen.getByRole("button", { name: "Email a verification code" }));
    await screen.findByText(/Code email queued/);
    expect(screen.getByRole("button", { name: "Email a verification code" })).toBeDisabled();
    expect(fetchMock.mock.calls.some(([url]) => url.endsWith("/confirm"))).toBe(false);
  });
  it.each(["ru", "he"])("renders %s and safely loads under strict mode", async (locale) => {
    fetchMock.mockResolvedValue(response(publicApproval)); mount(locale, true);
    await screen.findByText("Test entrance door");
    expect(screen.getByRole("main")).toHaveAttribute("dir", locale === "he" ? "rtl" : "ltr");
    expect(screen.queryByText("Confirm both versions")).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.every(([url]) => url.endsWith("/preview"))).toBe(true);
  });
  it("fails closed for an invalid response or missing token", async () => {
    fetchMock.mockResolvedValue(response({ ...publicApproval, snapshot: {} })); mount();
    await screen.findByRole("alert"); expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });
  it("resets consent when a different invitation is opened", async () => {
    fetchMock.mockResolvedValue(response(publicApproval)); mount(); await fill();
    window.history.replaceState({}, "", "/commercial-approval#" + "B".repeat(43));
    fireEvent(window, new HashChangeEvent("hashchange"));
    await waitFor(() => expect(screen.getByLabelText("Your full name")).toHaveValue(""));
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });
});
