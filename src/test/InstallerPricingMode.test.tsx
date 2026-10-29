import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import InstallersPage from "@/views/InstallersPage";

const { api, auth, push } = vi.hoisted(() => ({ api: vi.fn(), auth: vi.fn(), push: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiFetch: api }));
vi.mock("@/hooks/use-auth-session", () => ({ useAuthSession: auth }));
vi.mock("@/components/DashboardLayout", () => ({ DashboardLayout: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), useSearchParams: () => new URLSearchParams("installer_id=installer-1") }));

const statePath = "/api/v1/admin/price-lists/state";
const factory = { mode: "FACTORY", active_price: { price_list_id: "list-1", version: 1,
  effective_from: "2026-10-04T08:00:00Z", currency: "ILS", items: [] } };
const legacy = { mode: "LEGACY", active_price: null };
const rate = { id: "rate-1", door_type_id: "door-1", installer_id: "installer-1", price: "111.00" };
function reads(path: string) {
  if (path.includes("/admin/installers?")) return [{ id: "installer-1", company_id: "qa", full_name: "QA installer",
    is_active: true, created_at: "2026-10-04T08:00:00Z", updated_at: "2026-10-04T08:00:00Z" }];
  if (path.includes("/admin/door-types")) return [{ id: "door-1", code: "EN", name: "Entrance" }];
  if (path.includes("/admin/installer-rates?")) return [rate];
  throw new Error(`Unexpected request ${path}`);
}
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const view = render(<QueryClientProvider client={client}><InstallersPage /></QueryClientProvider>);
  return { client, ...view };
}

describe("individual rate cutover", () => {
  beforeEach(() => {
    api.mockReset(); push.mockReset();
    auth.mockReturnValue({ role: "ADMIN", admin_scope: "OWNER", can_view_rates: true, can_manage_users: true });
    api.mockImplementation(async (path: string) => path === statePath ? factory : reads(path));
  });
  it("keeps history, hides obsolete writers and links to the active company list", async () => {
    mount();
    await screen.findByText("Historical individual rates");
    expect(await screen.findByText("111.00 ILS")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add Rate" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open active version" }));
    expect(push).toHaveBeenCalledWith("/price-lists");
    expect(api.mock.calls.some(([, init]) => init?.method)).toBe(false);
    expect(screen.getByRole("button", { name: "Save Installer" })).toBeEnabled();
  });
  it("blocks writes while pricing is loading, then permits the existing legacy flow", async () => {
    let finish!: (value: typeof legacy) => void;
    api.mockImplementation((path: string, init?: RequestInit) => {
      if (path === statePath) return new Promise((resolve) => { finish = resolve; });
      if (init?.method === "POST") return Promise.resolve(rate);
      return Promise.resolve(reads(path));
    });
    mount();
    expect(await screen.findByRole("button", { name: "Add Rate" })).toBeDisabled();
    await act(async () => finish(legacy));
    fireEvent.change(screen.getByPlaceholderText("Price"), { target: { value: "125.50" } });
    await waitFor(() => expect(screen.getByRole("button", { name: "Add Rate" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Add Rate" }));
    await waitFor(() => expect(api).toHaveBeenCalledWith("/api/v1/admin/installer-rates", expect.objectContaining({ method: "POST" })));
  });
  it("fails closed on an unavailable pricing service and supports retry", async () => {
    let failed = true;
    api.mockImplementation(async (path: string) => {
      if (path === statePath) { if (failed) throw new Error("offline"); return legacy; }
      return reads(path);
    });
    mount();
    const status = await screen.findByRole("region", { name: "Current pricing" });
    await within(status).findByRole("alert");
    fireEvent.change(screen.getByDisplayValue("111.00"), { target: { value: "999" } });
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    failed = false;
    fireEvent.click(within(status).getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Save" })).toBeEnabled());
  });
  it("refreshes pricing after a server rejects a stale legacy write", async () => {
    let cutover = false;
    api.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === statePath) return cutover ? factory : legacy;
      if (init?.method === "PATCH") { cutover = true; throw { status: 409 }; }
      return reads(path);
    });
    mount();
    await waitFor(() => expect(screen.getByRole("button", { name: "Save" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByText("Historical individual rates");
    expect(api.mock.calls.filter(([, init]) => init?.method === "PATCH")).toHaveLength(1);
  });
  it("discards previous company pricing on an authentication change", async () => {
    const { client } = mount();
    await screen.findByText("Active factory price list v1");
    api.mockImplementation(async (path: string) => {
      if (path === statePath) throw new Error("new company not reachable");
      return reads(path);
    });
    fireEvent(window, new CustomEvent("dimax-auth-changed"));
    await screen.findByText("Pricing could not be verified. Price changes are locked.");
    expect(screen.queryByText("Active factory price list v1")).not.toBeInTheDocument();
    expect(JSON.stringify(client.getQueriesData({ queryKey: ["company-pricing-state"] }))).not.toContain("list-1");
  });
  it("does not fetch company prices without rate access", async () => {
    auth.mockReturnValue({ role: "ADMIN", admin_scope: "OWNER", can_view_rates: false, can_manage_users: true });
    mount(); await screen.findByText("Edit Installer");
    expect(api.mock.calls.some(([path]) => path === statePath)).toBe(false);
  });
});
