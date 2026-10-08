import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProjectPricingNotice } from "@/components/prices/ProjectPricingNotice";

const locale = vi.hoisted(() => ({ value: "en" }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ locale: locale.value }) }));

describe("project financial price basis", () => {
  it.each([
    ["en", "confirmed factory price list v2", "Unpriced plan items: 3", "Works without a ledger entry: 1"],
    ["ru", "подтверждённый прайс завода v2", "Позиции плана без подтверждённой цены: 3", "Работы без записи о начислении: 1"],
    ["he", "מחירון מפעל מאושר v2", "פריטי תכנון ללא מחיר מאושר: 3", "עבודות ללא רישום שכר: 1"],
  ])("shows basis and incomplete totals in %s", (language, basis, priceWarning, ledgerWarning) => {
    locale.value = language;
    render(<ProjectPricingNotice data={{ pricing_mode: "FACTORY", price_list_version: 2,
      missing_planned_rates_doors: 1, missing_planned_rates_addons: 2, unrecorded_completed_works: 1 }} />);
    expect(screen.getByRole("status")).toHaveTextContent(basis);
    expect(screen.getByRole("status")).toHaveTextContent(priceWarning);
    expect(screen.getByRole("status")).toHaveTextContent(ledgerWarning);
  });
  it("does not label legacy data as factory confirmed", () => {
    render(<ProjectPricingNotice data={{ pricing_mode: "LEGACY" }} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
