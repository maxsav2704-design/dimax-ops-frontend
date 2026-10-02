import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PriceApprovalPage from "@/views/public/PriceApprovalPage";

const fetchMock = vi.fn();
vi.mock("@/lib/api", () => ({ apiBaseUrl: () => "https://api.dimax.test" }));
const token = "A".repeat(43);
const draft = {
  company_name: "Test DIMAX", factory_name: "Factory", recipient_name: "Representative", version: 2,
  currency: "ILS", reason: "Revised offer", agreement_reference: "Offer 42", snapshot_hash: "f".repeat(64),
  expires_at: "2026-10-05T10:00:00Z", status: "PENDING", confirmed_at: null, confirmed_name: null,
  affects_earnings: false, items: [{ kind: "DOOR", name: "Entrance door", unit: "pcs", installer_price: "250.00" }],
};
const reply = (body: object, status = 200) => ({ ok: status === 200, status, json: async () => body });

describe("PriceApprovalPage", () => {
  beforeEach(() => {
    fetchMock.mockReset(); vi.stubGlobal("fetch", fetchMock);
    window.history.replaceState({}, "", `/price-approval#${token}`);
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it("previews without confirming, strips the secret and confirms exactly the displayed version", async () => {
    fetchMock.mockResolvedValueOnce(reply(draft)).mockResolvedValueOnce(reply({ ...draft, status: "CONFIRMED",
      confirmed_name: "Representative", confirmed_at: "2026-10-02T12:00:00Z" }));
    render(<PriceApprovalPage />);
    expect(await screen.findByText("Entrance door")).toBeInTheDocument();
    expect(window.location.hash).toBe("");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const button = screen.getByRole("button", { name: "Confirm prices" });
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Your full name"), { target: { value: "Representative" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(button);
    expect(await screen.findByText("Factory confirmation recorded")).toBeInTheDocument();
    const [url, options] = fetchMock.mock.calls[1];
    expect(url).toBe("https://api.dimax.test/api/v1/public/price-approvals/confirm");
    expect(options.credentials).toBe("omit");
    expect(options.referrerPolicy).toBe("no-referrer");
    expect(JSON.parse(options.body)).toEqual({ token, expected_version: 2, snapshot_hash: draft.snapshot_hash,
      signer_name: "Representative", accepted: true });
    expect(options.headers.Authorization).toBeUndefined();
    expect(window.localStorage.getItem("factory-token")).toBeNull();
  });

  it("does not call the server without a valid link", async () => {
    window.history.replaceState({}, "", "/price-approval");
    render(<PriceApprovalPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("This link is unavailable");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("reloads the same link when it is reopened in the current tab", async () => {
    fetchMock.mockResolvedValueOnce(reply(draft)).mockResolvedValueOnce(reply({ ...draft, version: 3 }));
    render(<PriceApprovalPage />);
    await screen.findByText("Entrance door");
    window.history.replaceState({}, "", `/price-approval#${token}`);
    fireEvent(window, new Event("hashchange"));
    expect(await screen.findByText("Test DIMAX · Version 3")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(window.location.hash).toBe("");
  });

  it.each([404, 409, 429])("blocks confirmation on error %s", async (status) => {
    fetchMock.mockResolvedValue(reply({}, status));
    render(<PriceApprovalPage />);
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirm prices" })).not.toBeInTheDocument();
  });

  it("checks an ambiguous result without replaying confirmation", async () => {
    fetchMock.mockResolvedValueOnce(reply(draft)).mockRejectedValueOnce(new Error("Lost response"))
      .mockResolvedValueOnce(reply({ ...draft, status: "CONFIRMED", confirmed_name: "Representative", confirmed_at: "2026-10-02T12:00:00Z" }));
    render(<PriceApprovalPage />);
    await screen.findByText("Entrance door");
    fireEvent.change(screen.getByLabelText("Your full name"), { target: { value: "Representative" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Confirm prices" }));
    const check = await screen.findByRole("button", { name: "Check result" });
    expect(screen.getByRole("button", { name: "Confirm prices" })).toBeDisabled();
    fireEvent.click(check);
    expect(await screen.findByText("Factory confirmation recorded")).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock.mock.calls.filter(([url]) => url.endsWith("/confirm"))).toHaveLength(1);
  });
});
