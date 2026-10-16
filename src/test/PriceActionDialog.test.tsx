import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PriceActionDialog } from "@/components/prices/PriceActionDialog";
import { PRICE_API, type PriceDetail } from "@/lib/factory-prices";

const { api } = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  apiFetch: api,
}));

const list: PriceDetail = {
  id: "list-1", version: 2, status: "DRAFT", currency: "ILS", reason: "Factory request", agreement_reference: "Agreement 42",
  created_at: "2026-10-02T08:00:00Z", created_by: "owner", cancelled_at: null, cancellation_reason: null,
  items: [{ kind: "DOOR", target_id: "door-1", name: "Entrance", unit: "pcs", installer_price: "250.00" }],
};

function mount(kind: "cancel" | "revoke" = "cancel") {
  const onClose = vi.fn();
  const onChanged = vi.fn();
  const action = kind === "cancel"
    ? { kind: "cancel" as const, list }
    : { kind: "revoke" as const, list, invitation: {
        id: "invite-1", price_list_id: "list-1", factory_name: "QA Factory", recipient_name: "Rep", recipient_email: "rep@example.test",
        created_at: "2026-10-02T09:00:00Z", expires_at: "2099-10-02T09:00:00Z", revoked_at: null, revocation_reason: null,
        confirmed_at: null, confirmed_name: null,
      } };
  render(<PriceActionDialog action={action} onClose={onClose} onChanged={onChanged} />);
  return { onClose, onChanged, dialog: within(screen.getByRole("dialog")) };
}

describe("PriceActionDialog", () => {
  beforeEach(() => {
    api.mockReset();
    window.localStorage.setItem("dimax_locale", "en");
  });

  it("cancels a draft only with a reason and reports the version it acts on", async () => {
    api.mockResolvedValue({ ok: true });
    const { dialog, onClose, onChanged } = mount("cancel");

    expect(dialog.getByText(/Version 2 · Agreement 42/)).toBeInTheDocument();
    const confirm = dialog.getByRole("button", { name: "Confirm action" });
    expect(confirm).toBeDisabled();

    fireEvent.change(dialog.getByLabelText("Cancellation reason"), { target: { value: "Superseded by v3" } });
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(onChanged).toHaveBeenCalledOnce();
    const [path, init] = api.mock.calls[0] as [string, RequestInit];
    expect(path).toBe(`${PRICE_API}/list-1/cancel`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ reason: "Superseded by v3" });
  });

  it("revokes an invitation through the invitation endpoint", async () => {
    api.mockResolvedValue({ ok: true });
    const { dialog, onClose } = mount("revoke");
    fireEvent.change(dialog.getByLabelText("Revocation reason"), { target: { value: "Wrong recipient" } });
    fireEvent.click(dialog.getByRole("button", { name: "Confirm action" }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(api.mock.calls[0]?.[0]).toBe(`${PRICE_API}/list-1/approvals/invite-1/revoke`);
  });

  it("blocks the action after a permission or conflict rejection instead of retrying blindly", async () => {
    const { ApiError } = await import("@/lib/api");
    api.mockRejectedValue(new ApiError(403, "forbidden"));
    const { dialog, onClose, onChanged } = mount("cancel");
    fireEvent.change(dialog.getByLabelText("Cancellation reason"), { target: { value: "Superseded" } });
    fireEvent.click(dialog.getByRole("button", { name: "Confirm action" }));

    expect(await dialog.findByRole("alert")).toHaveTextContent("Price access is unavailable");
    expect(dialog.getByRole("button", { name: "Confirm action" })).toBeDisabled();
    expect(onClose).not.toHaveBeenCalled();
    expect(onChanged).not.toHaveBeenCalled();
    expect(api).toHaveBeenCalledTimes(1);
  });

  it("surfaces an unknown outcome without closing, so the operator checks history first", async () => {
    api.mockRejectedValue({ status: 0 });
    const { dialog, onClose, onChanged } = mount("cancel");
    fireEvent.change(dialog.getByLabelText("Cancellation reason"), { target: { value: "Superseded" } });
    fireEvent.click(dialog.getByRole("button", { name: "Confirm action" }));

    expect(await dialog.findByRole("alert")).toHaveTextContent("The result is unknown");
    expect(onClose).not.toHaveBeenCalled();
    expect(onChanged).toHaveBeenCalledOnce();
  });
});
