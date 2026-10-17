import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DashboardLayout } from "@/components/DashboardLayout";

const { apiFetchMock, pushMock, authSessionMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
  pushMock: vi.fn(),
  authSessionMock: vi.fn(),
}));

vi.mock("@/lib/api", () => ({ apiFetch: apiFetchMock, logoutSession: vi.fn() }));
vi.mock("@/hooks/use-auth-session", () => ({ useAuthSession: authSessionMock }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ replace: vi.fn(), push: pushMock }),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

function renderLayout() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <DashboardLayout>
        <p>page content</p>
      </DashboardLayout>
    </QueryClientProvider>,
  );
}

describe("command palette (Ctrl+K)", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    pushMock.mockReset();
    try {
      window.localStorage.removeItem("dmx.palette.recent.v1");
    } catch {
      /* ignore */
    }
    authSessionMock.mockReturnValue({ role: "ADMIN", admin_scope: "OWNER", can_view_rates: true });
    apiFetchMock.mockImplementation(async (path: string) => {
      if (path === "/api/v1/admin/projects") return { items: [{ id: "p-1", name: "Tower Alpha", code: "QA-001", address: "Ashdod" }] };
      if (path.startsWith("/api/v1/admin/installers")) return { items: [{ id: "i-1", full_name: "Installer One", email: "one@dimax.dev" }] };
      return { unread_count: 0 };
    });
  });

  it("opens with Ctrl+K, ranks sections and records by the typed query, navigates on Enter and remembers the choice", async () => {
    renderLayout();
    expect(screen.queryByTestId("command-palette")).not.toBeInTheDocument();
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    const palette = await screen.findByTestId("command-palette");
    const input = within(palette).getByRole("combobox");
    // Before typing: sections and actions (the first eight); records appear once they match a query.
    expect(within(palette).getAllByRole("option")[0]).toHaveTextContent("Create project");

    fireEvent.change(input, { target: { value: "qa-00" } });
    await waitFor(() => expect(within(palette).getAllByRole("option")[0]).toHaveTextContent("Tower Alpha"));
    expect(within(palette).getAllByRole("option")[0]).toHaveAttribute("aria-selected", "true");

    fireEvent.change(input, { target: { value: "inst" } });
    expect(within(palette).getAllByRole("option")[0]).toHaveTextContent("Installers");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(within(palette).getAllByRole("option")[1]).toHaveAttribute("aria-selected", "true");
    expect(within(palette).getAllByRole("option")[1]).toHaveTextContent("Installer One");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(pushMock).toHaveBeenCalledWith("/installers?installer_id=i-1");
    await waitFor(() => expect(screen.queryByTestId("command-palette")).not.toBeInTheDocument());
    expect(JSON.parse(window.localStorage.getItem("dmx.palette.recent.v1") || "[]")).toEqual(["installer:i-1"]);

    fireEvent.click(screen.getByRole("button", { name: /Search/ }));
    const reopened = await screen.findByTestId("command-palette");
    expect(within(reopened).getByText("Recent")).toBeInTheDocument();
    expect(within(reopened).getAllByRole("option")[0]).toHaveTextContent("Installer One");
  });

  it("hides sections and actions the session cannot reach", async () => {
    authSessionMock.mockReturnValue({ role: "ADMIN", admin_scope: "VIEWER", can_view_rates: false });
    renderLayout();
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    const palette = await screen.findByTestId("command-palette");
    fireEvent.change(within(palette).getByRole("combobox"), { target: { value: "create" } });
    expect(within(palette).queryByText("Create project")).not.toBeInTheDocument();
    fireEvent.change(within(palette).getByRole("combobox"), { target: { value: "settings" } });
    expect(within(palette).queryByText("Settings")).not.toBeInTheDocument();
  });
});
