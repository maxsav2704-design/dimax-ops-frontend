import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InstallerShell } from "@/components/installer/InstallerShell";

vi.mock("next/navigation", () => ({ usePathname: () => "/installer", useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock("@/lib/api", () => ({ logoutSession: vi.fn() }));
vi.mock("@/components/LanguageSwitcher", () => ({ LanguageSwitcher: () => null }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ locale: "en", t: (key: string) => key }), useCopy: () => (en: string) => en }));

function setOnline(value: boolean) {
  Object.defineProperty(window.navigator, "onLine", { configurable: true, get: () => value });
  window.dispatchEvent(new Event(value ? "online" : "offline"));
}

describe("installer shell", () => {
  afterEach(() => setOnline(true));

  it("says at once that nothing is saved without the network, and clears it when the network is back", () => {
    render(<InstallerShell><p>page</p></InstallerShell>);
    expect(screen.queryByTestId("installer-offline")).toBeNull();
    act(() => setOnline(false));
    expect(screen.getByTestId("installer-offline")).toHaveTextContent("nothing you do here is saved");
    act(() => setOnline(true));
    expect(screen.queryByTestId("installer-offline")).toBeNull();
  });
});
