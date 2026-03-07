import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import { RequireAuth } from "@/components/RequireAuth";

const { replaceMock, pathnameMock } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  pathnameMock: vi.fn(),
}));

const { getAccessTokenMock, apiFetchMock } = vi.hoisted(() => ({
  getAccessTokenMock: vi.fn(),
  apiFetchMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
  }),
  usePathname: () => pathnameMock(),
}));

vi.mock("@/lib/api", () => ({
  getAccessToken: getAccessTokenMock,
  apiFetch: apiFetchMock,
}));

function renderSubject(
  children: ReactNode = <div>protected</div>,
  scope: "admin" | "installer" | "any" = "admin"
) {
  return render(<RequireAuth scope={scope}>{children}</RequireAuth>);
}

describe("RequireAuth", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    pathnameMock.mockReset();
    getAccessTokenMock.mockReset();
    apiFetchMock.mockReset();
    pathnameMock.mockReturnValue("/reports");
  });

  it("redirects to login when token is missing", async () => {
    getAccessTokenMock.mockReturnValue(null);

    renderSubject();

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/login?next=%2Freports");
    });
  });

  it("redirects installer from admin scope to installer workspace", async () => {
    getAccessTokenMock.mockReturnValue("token");
    pathnameMock.mockReturnValue("/settings");
    apiFetchMock.mockResolvedValue({ role: "INSTALLER" });

    renderSubject();

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/installer");
    });
  });

  it("renders children for admin role", async () => {
    getAccessTokenMock.mockReturnValue("token");
    apiFetchMock.mockResolvedValue({ role: "ADMIN" });

    renderSubject();

    expect(await screen.findByText("protected")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("renders children for installer scope when role is installer", async () => {
    getAccessTokenMock.mockReturnValue("token");
    pathnameMock.mockReturnValue("/installer");
    apiFetchMock.mockResolvedValue({ role: "INSTALLER" });

    renderSubject(<div>installer protected</div>, "installer");

    expect(await screen.findByText("installer protected")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("redirects admin from installer scope to admin workspace", async () => {
    getAccessTokenMock.mockReturnValue("token");
    pathnameMock.mockReturnValue("/installer");
    apiFetchMock.mockResolvedValue({ role: "ADMIN" });

    renderSubject(<div>installer protected</div>, "installer");

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/");
    });
  });
});
