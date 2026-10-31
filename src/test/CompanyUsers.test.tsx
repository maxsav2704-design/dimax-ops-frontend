import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { CompanyUsersCard } from "@/components/settings/CompanyUsersCard";
import { MyPasswordCard } from "@/components/settings/MyPasswordCard";

const { api } = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiFetch: api }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ locale: "en", dir: "ltr" }), useCopy: () => (en: string) => en }));

const me = { id: "u-owner" };
const owner = { id: "u-owner", full_name: "Owner One", email: "owner@x.test", role: "ADMIN", is_active: true, admin_scope: "OWNER",
  can_view_rates: true, can_manage_imports: true, can_manage_users: true, installer_id: null, installer_name: null, created_at: "2026-10-31T10:00:00Z" };
const clerk = { ...owner, id: "u-clerk", full_name: "Office Clerk", email: "clerk@x.test", admin_scope: "OPERATIONS", can_manage_users: false };

function mount(node: ReactNode) {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{node}</QueryClientProvider>);
}

describe("company users", () => {
  beforeEach(() => { api.mockReset(); });

  it("adds an account and shows its password once, with a copy button", async () => {
    api.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url === "/api/v1/auth/me") return me;
      if (url.startsWith("/api/v1/admin/installers")) return { items: [] };
      if (url === "/api/v1/admin/users" && init?.method === "POST") {
        return { user: { ...clerk, id: "u-new", full_name: "New Person", email: "new@x.test" }, temporary_password: "Tmp-Pass-123456" };
      }
      if (url === "/api/v1/admin/users") return { items: [owner, clerk] };
      throw new Error("unexpected " + url);
    });
    mount(<CompanyUsersCard />);
    expect(await screen.findAllByTestId("company-user-row")).toHaveLength(2);
    const add = screen.getByRole("button", { name: "Add user" });
    expect(add).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "New Person" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "new@x.test" } });
    fireEvent.change(screen.getByLabelText("Access"), { target: { value: "FINANCE" } });
    fireEvent.click(add);
    await waitFor(() => expect(api).toHaveBeenCalledWith("/api/v1/admin/users", expect.objectContaining({
      method: "POST", body: JSON.stringify({ full_name: "New Person", email: "new@x.test", role: "ADMIN", admin_scope: "FINANCE" }) })));
    const reveal = await screen.findByTestId("one-time-password");
    expect(reveal).toHaveTextContent("Tmp-Pass-123456");
    expect(reveal).toHaveTextContent("Shown once");
    fireEvent.click(within(reveal).getByRole("button", { name: "Done" }));
    expect(screen.queryByTestId("one-time-password")).toBeNull();
  });

  it("asks before switching an account off, and your own row has no actions", async () => {
    api.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url === "/api/v1/auth/me") return me;
      if (url.startsWith("/api/v1/admin/installers")) return { items: [] };
      if (url === "/api/v1/admin/users/u-clerk" && init?.method === "PATCH") return { ...clerk, is_active: false };
      if (url === "/api/v1/admin/users") return { items: [owner, clerk] };
      throw new Error("unexpected " + url);
    });
    mount(<CompanyUsersCard />);
    const rows = await screen.findAllByTestId("company-user-row");
    await waitFor(() => expect(within(rows[0]).getByRole("button", { name: "Switch off" })).toBeDisabled());
    expect(within(rows[0]).getByText(/you/)).toBeInTheDocument();
    fireEvent.click(within(rows[1]).getByRole("button", { name: "Switch off" }));
    const dialog = await screen.findByTestId("company-user-confirm");
    expect(dialog).toHaveTextContent("every open session ends now");
    expect(api).not.toHaveBeenCalledWith("/api/v1/admin/users/u-clerk", expect.anything());
    fireEvent.click(within(dialog).getByRole("button", { name: "Switch off" }));
    await waitFor(() => expect(api).toHaveBeenCalledWith("/api/v1/admin/users/u-clerk", expect.objectContaining({
      method: "PATCH", body: JSON.stringify({ is_active: false }) })));
  });

  it("changes your own password only when both new entries match", async () => {
    api.mockResolvedValue(undefined);
    mount(<MyPasswordCard />);
    const button = screen.getByRole("button", { name: "Change password" });
    fireEvent.change(screen.getByLabelText("Current password"), { target: { value: "old-one" } });
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "a-new-password-1" } });
    fireEvent.change(screen.getByLabelText("Repeat the new password"), { target: { value: "a-new-password-2" } });
    expect(screen.getByText("The two passwords differ.")).toBeInTheDocument();
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Repeat the new password"), { target: { value: "a-new-password-1" } });
    fireEvent.click(button);
    await waitFor(() => expect(api).toHaveBeenCalledWith("/api/v1/auth/change-password", expect.objectContaining({
      method: "POST", body: JSON.stringify({ current_password: "old-one", new_password: "a-new-password-1" }) })));
    expect(await screen.findByText(/sign in again with the new password/)).toBeInTheDocument();
  });
});
