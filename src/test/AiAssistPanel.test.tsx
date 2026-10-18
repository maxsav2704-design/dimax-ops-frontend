import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnchorHTMLAttributes } from "react";
import { AiAssistPanel } from "@/components/ai/AiAssistPanel";

const { auth, language } = vi.hoisted(() => ({ auth: vi.fn(), language: { locale: "en" as "en" | "ru" | "he" } }));
vi.mock("@/hooks/use-auth-session", () => ({ useAuthSession: auth }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ locale: language.locale, dir: language.locale === "he" ? "rtl" : "ltr" }) }));
vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => <a href={href} {...rest}>{children}</a> }));

const PROJECT = "1f16d537-5617-4c4b-a944-dafba2bcead9";

describe("AiAssistPanel", () => {
  beforeEach(() => { language.locale = "en"; auth.mockReturnValue({ role: "ADMIN", admin_scope: "OPERATIONS" }); });

  it("opens the one workspace with the section's object as context", () => {
    render(<AiAssistPanel context={{ kind: "project", id: PROJECT }} label="Tower B" testId="panel" />);
    expect(screen.getByTestId("panel")).toHaveTextContent("Ask about this object: Tower B");
    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      `/ai?context=project%3A${PROJECT}&q=Which+positions+are+not+finished%3F`,
      `/ai?context=project%3A${PROJECT}&q=What+blocks+this+project%3F`,
      `/ai?context=project%3A${PROJECT}&q=Report+an+obstacle+on+a+position`,
      `/ai?context=project%3A${PROJECT}`,
    ]);
  });

  it("uses company questions without a context and the section's own prompts when given", () => {
    render(<AiAssistPanel context={null} label="Today" prompts={["Custom one"]} testId="panel" />);
    expect(screen.getByRole("link", { name: "Custom one" })).toHaveAttribute("href", "/ai?q=Custom+one");
    expect(screen.getByRole("link", { name: "Open the workspace" })).toHaveAttribute("href", "/ai");
  });

  it("renders Hebrew with RTL direction and nothing for an installer", () => {
    language.locale = "he";
    const { unmount } = render(<AiAssistPanel context={{ kind: "issue", id: PROJECT }} label="ליקוי" testId="panel" />);
    expect(screen.getByTestId("panel")).toHaveAttribute("dir", "rtl");
    expect(screen.getByRole("link", { name: "פתח את סביבת העבודה" })).toBeInTheDocument();
    unmount();
    auth.mockReturnValue({ role: "INSTALLER", admin_scope: null });
    render(<AiAssistPanel context={null} label="x" testId="panel" />);
    expect(screen.queryByTestId("panel")).not.toBeInTheDocument();
  });
});
