import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CompanyPriceStatus } from "@/components/prices/CompanyPriceStatus";
import type { CompanyPricingState } from "@/lib/factory-prices";

const locale = vi.hoisted(() => ({ value: "en" }));
vi.mock("@/lib/i18n", () => ({ useCopy: () => (en: string, ru: string, he: string) => (locale.value === "ru" ? ru : locale.value === "he" ? he : en), useI18n: () => ({ locale: locale.value }) }));
const state: CompanyPricingState = { mode: "FACTORY", active_price: {
  price_list_id: "confirmed-1", version: 3, effective_from: "2026-10-04T08:00:00Z", currency: "ILS", items: [],
} };
describe("company pricing status", () => {
  beforeEach(() => { locale.value = "en"; });
  it.each([
    ["en", "Active factory price list v3", "Open active version"],
    ["ru", "Действующий прайс завода v3", "Открыть действующую версию"],
    ["he", "מחירון מפעל בתוקף v3", "פתיחת הגרסה בתוקף"],
  ])("shows the active version and a working action in %s", (language, title, action) => {
    locale.value = language;
    const onOpen = vi.fn();
    render(<CompanyPriceStatus state={state} loading={false} error={false} refresh={vi.fn()} onOpen={onOpen} />);
    expect(screen.getByText(title)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: action }));
    expect(onOpen).toHaveBeenCalledExactlyOnceWith("confirmed-1");
  });
  it("does not present cached active prices as verified after a failed recheck", () => {
    const retry = vi.fn();
    render(<CompanyPriceStatus state={state} loading={false} error refresh={retry} onOpen={vi.fn()} />);
    expect(screen.queryByText("Active factory price list v3")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
