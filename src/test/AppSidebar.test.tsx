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
const { userRoleMock } = vi.hoisted(() => ({
  userRoleMock: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  apiFetch: apiFetchMock,
}));

vi.mock("@/hooks/use-user-role", () => ({
  useUserRole: userRoleMock,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameMock(),
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
    userRoleMock.mockReset();
    pathnameMock.mockReturnValue("/");
    userRoleMock.mockReturnValue("ADMIN");
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
  });
});
