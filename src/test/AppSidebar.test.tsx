import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnchorHTMLAttributes } from "react";

import { AppSidebar } from "@/components/AppSidebar";

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}));
const { pathnameMock } = vi.hoisted(() => ({
  pathnameMock: vi.fn(),
}));
const { replaceMock } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
}));
const { authSessionMock } = vi.hoisted(() => ({
  authSessionMock: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  apiFetch: apiFetchMock,
  logoutSession: vi.fn(),
}));

vi.mock("@/hooks/use-auth-session", () => ({
  useAuthSession: authSessionMock,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameMock(),
  useRouter: () => ({
    replace: replaceMock,
  }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("AppSidebar", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    pathnameMock.mockReset();
    replaceMock.mockReset();
    authSessionMock.mockReset();
    pathnameMock.mockReturnValue("/");
    authSessionMock.mockReturnValue({
      role: "ADMIN",
      admin_scope: "OWNER",
      can_view_rates: true,
    });
    apiFetchMock.mockResolvedValue({ unread_count: 3 });
  });

  it("shows clickable calendar navigation in admin panel", async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AppSidebar />
      </QueryClientProvider>
    );

    const calendarLink = await screen.findByRole("link", { name: /calendar/i });
    expect(calendarLink).toBeInTheDocument();
    expect(calendarLink).toHaveAttribute("href", "/calendar");
    expect(await screen.findByRole("link", { name: /library/i })).toHaveAttribute("href", "/library");
  }, 15000);

  it("hides operations navigation for finance scope", async () => {
    authSessionMock.mockReturnValue({
      role: "ADMIN",
      admin_scope: "FINANCE",
      can_view_rates: true,
    });

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AppSidebar />
      </QueryClientProvider>
    );

    expect(screen.queryByRole("link", { name: /operations/i })).not.toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /reports/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /projects/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /library/i })).not.toBeInTheDocument();
  });
});
