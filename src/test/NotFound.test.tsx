import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LanguageProvider } from "@/lib/i18n";
import NotFound from "@/views/NotFound";

const { pathnameMock } = vi.hoisted(() => ({ pathnameMock: vi.fn(() => "/missing/route") }));

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameMock(),
}));

describe("NotFound", () => {
  beforeEach(() => {
    window.localStorage.setItem("dimax_locale", "en");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the 404 heading, a localized message and a link home", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<NotFound />);

    expect(screen.getByRole("heading", { level: 1, name: "404" })).toBeInTheDocument();
    expect(screen.getByText("Page not found")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Return to Home" })).toHaveAttribute("href", "/");
    expect(consoleError).toHaveBeenCalledWith(
      "404 Error: User attempted to access non-existent route:",
      "/missing/route",
    );
  });

  it.each([
    ["ru", "Страница не найдена", "Вернуться на главную"],
    ["he", "הדף לא נמצא", "חזרה לדף הראשי"],
  ])("localizes the message and the link in %s", async (locale, message, link) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    window.localStorage.setItem("dimax_locale", locale);
    render(
      <LanguageProvider>
        <NotFound />
      </LanguageProvider>,
    );

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: link })).toHaveAttribute("href", "/");
  });
});
