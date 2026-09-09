import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import { RequireAuth } from "@/components/RequireAuth";
import { ApiError } from "@/lib/api";

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

vi.mock("@/lib/api", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/api")>(),
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

  it.each([401, 403])("redirects to login when access is rejected with %s", async (status) => {
    apiFetchMock.mockRejectedValue(new ApiError(status, "unauthorized"));

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
    apiFetchMock.mockRejectedValue(new ApiError(401, "unauthorized"));

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

  it.each([
    new ApiError(0, "Failed to fetch", { error: { code: "NETWORK_UNAVAILABLE" } }),
    new ApiError(503, "Service unavailable"),
    new ApiError(429, "Too many requests"),
  ])("blocks protected content without logging out on temporary failure %j", async (error) => {
    apiFetchMock.mockRejectedValue(error);
    const { queryClient } = renderSubject();
    const cachedSession = { role: "ADMIN", admin_scope: "OPERATIONS" };
    queryClient.setQueryData(["auth-me"], cachedSession);
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not verify access");
    expect(screen.getByRole("button", { name: "Try again" })).toBeEnabled();
    expect(screen.queryByText("protected")).not.toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
    expect(queryClient.getQueryData(["auth-me"])).toEqual(cachedSession);
  });

  it("recovers on explicit retry without navigating away from the protected URL", async () => {
    apiFetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce({ role: "ADMIN", admin_scope: "OWNER" });
    renderSubject();
    fireEvent.click(await screen.findByRole("button", { name: "Try again" }));
    expect(await screen.findByText("protected")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(apiFetchMock).toHaveBeenCalledTimes(2);
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("hides the next route until its access check succeeds", async () => {
    apiFetchMock.mockResolvedValueOnce({ role: "ADMIN", admin_scope: "OWNER" });
    const { rerender, queryClient } = renderSubject();
    await screen.findByText("protected");
    pathnameMock.mockReturnValue("/settings");
    apiFetchMock.mockRejectedValueOnce(new ApiError(503, "Server unavailable"));
    rerender(
      <QueryClientProvider client={queryClient}>
        <RequireAuth><div>private settings</div></RequireAuth>
      </QueryClientProvider>,
    );
    expect(screen.queryByText("private settings")).not.toBeInTheDocument();
    await screen.findByRole("alert");
    expect(screen.queryByText("private settings")).not.toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });
});
