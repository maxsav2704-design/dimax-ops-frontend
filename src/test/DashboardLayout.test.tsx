import { fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnchorHTMLAttributes } from "react";

import { DashboardLayout } from "@/components/DashboardLayout";

const { apiFetchMock, pathnameMock, authSessionMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
  pathnameMock: vi.fn(),
  authSessionMock: vi.fn(),
}));

vi.mock("@/lib/api", () => ({ apiFetch: apiFetchMock, logoutSession: vi.fn() }));
vi.mock("@/hooks/use-auth-session", () => ({ useAuthSession: authSessionMock }));
vi.mock("next/navigation", () => ({
  usePathname: () => pathnameMock(),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
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

describe("DashboardLayout shell (block 9)", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    apiFetchMock.mockResolvedValue({ unread_count: 0 });
    pathnameMock.mockReturnValue("/");
    authSessionMock.mockReturnValue({ role: "ADMIN", admin_scope: "OWNER", can_view_rates: true });
  });

  it("opens the labelled navigation drawer from the menu button and closes it on a choice", () => {
    renderLayout();
    expect(screen.queryByTestId("dmx-drawer")).not.toBeInTheDocument();
    const menu = screen.getByRole("button", { name: "Menu" });
    expect(menu).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(menu);
    const drawer = screen.getByTestId("dmx-drawer");
    const aside = within(drawer).getByRole("complementary", { name: "Admin navigation" });
    expect(aside).toHaveAttribute("data-variant", "drawer");
    expect(within(drawer).getByRole("link", { name: "Calendar" })).toBeInTheDocument();
    fireEvent.click(within(drawer).getByRole("link", { name: "Calendar" }));
    expect(screen.queryByTestId("dmx-drawer")).not.toBeInTheDocument();
  });

  it("keeps the fixed rail as the page navigation", () => {
    renderLayout();
    const rails = screen.getAllByRole("complementary", { name: "Admin navigation" });
    expect(rails).toHaveLength(1);
    expect(rails[0]).toHaveAttribute("data-variant", "rail");
    expect(screen.getByText("page content")).toBeInTheDocument();
  });
});
