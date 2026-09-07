import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import { RequireAuth } from "@/components/RequireAuth";

const { replaceMock, pathnameMock } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  pathnameMock: vi.fn(),
}));

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
  }),
  usePathname: () => pathnameMock(),
}));

vi.mock("@/lib/api", () => ({
  apiFetch: apiFetchMock,
}));

function renderSubject(
  children: ReactNode = <div>protected</div>,
  scope: "admin" | "installer" | "any" = "admin"
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <RequireAuth scope={scope}>{children}</RequireAuth>
      </QueryClientProvider>
    ),
  };
}

describe("RequireAuth", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    pathnameMock.mockReset();
    apiFetchMock.mockReset();
    pathnameMock.mockReturnValue("/reports");
    window.history.replaceState({}, "", "/reports");
  });

  it("redirects to login when session bootstrap fails", async () => {
    apiFetchMock.mockRejectedValue(new Error("unauthorized"));

    renderSubject();

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/login?next=%2Freports&error=auth_required");
    });
  });

  it("preserves protected route query params in login next redirect", async () => {
    pathnameMock.mockReturnValue("/projects");
    window.history.replaceState(
      {},
      "",
      "/projects?project_id=project-1&focus_section=doors"
    );
    apiFetchMock.mockRejectedValue(new Error("unauthorized"));

    renderSubject();

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith(
        "/login?next=%2Fprojects%3Fproject_id%3Dproject-1%26focus_section%3Ddoors&error=auth_required"
      );
    });
  });

  it("redirects installer from admin scope to installer workspace", async () => {
    pathnameMock.mockReturnValue("/settings");
    apiFetchMock.mockResolvedValue({ role: "INSTALLER" });

    renderSubject();

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/installer");
    });
  });

  it("renders children for admin role", async () => {
    apiFetchMock.mockResolvedValue({ role: "ADMIN", admin_scope: "OPERATIONS" });

    renderSubject();

    expect(await screen.findByText("protected")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("renders children for installer scope when role is installer", async () => {
    pathnameMock.mockReturnValue("/installer");
    apiFetchMock.mockResolvedValue({ role: "INSTALLER" });

    renderSubject(<div>installer protected</div>, "installer");

    expect(await screen.findByText("installer protected")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("redirects admin from installer scope to admin workspace", async () => {
    pathnameMock.mockReturnValue("/installer");
    apiFetchMock.mockResolvedValue({ role: "ADMIN", admin_scope: "OPERATIONS" });

    renderSubject(<div>installer protected</div>, "installer");

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/");
    });
  });

  it("fails closed when ADMIN profile scope is missing", async () => {
    apiFetchMock.mockResolvedValue({ role: "ADMIN", admin_scope: null });

    renderSubject(<div>must stay protected</div>);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/login");
    });
    expect(screen.queryByText("must stay protected")).not.toBeInTheDocument();
  });

  it("allows restored session without a preloaded access token", async () => {
    apiFetchMock.mockResolvedValue({ role: "ADMIN", admin_scope: "OPERATIONS" });

    renderSubject(<div>restored protected</div>);

    expect(await screen.findByText("restored protected")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("seeds auth session cache before rendering protected children", async () => {
    apiFetchMock.mockResolvedValue({
      role: "ADMIN",
      admin_scope: "OPERATIONS",
      can_view_rates: false,
    });

    const { queryClient } = renderSubject();

    expect(await screen.findByText("protected")).toBeInTheDocument();
    expect(queryClient.getQueryData(["auth-me"])).toEqual({
      role: "ADMIN",
      admin_scope: "OPERATIONS",
      can_view_rates: false,
      can_manage_imports: false,
      can_manage_users: false,
    });
  });
});
