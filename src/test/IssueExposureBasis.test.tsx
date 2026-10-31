import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { IssueExposureBasis, UnpricedExposureNotice } from "@/components/prices/IssueExposureBasis";

const locale = vi.hoisted(() => ({ value: "en" }));
vi.mock("@/lib/i18n", () => ({ useCopy: () => (en: string, ru: string, he: string) => (locale.value === "ru" ? ru : locale.value === "he" ? he : en), useI18n: () => ({ locale: locale.value }) }));

describe("issue exposure basis", () => {
  it.each([
    ["en", "not earned wages", "each door once", "active confirmed price list: 4", "Reasons shown: 1 / 9", "Add-ons without earnings / client prices: 2 / 1"],
    ["ru", "не начисленный заработок", "каждая дверь учтена один раз", "подтверждённый прайс: 4", "Показано причин: 1 / 9", "Допработы без начислений / цены клиента: 2 / 1"],
    ["he", "לא שכר שנצבר", "כל דלת נספרת פעם אחת", "מחירון מאושר פעיל: 4", "סיבות מוצגות: 1 / 9", "תוספות ללא שכר / מחיר לקוח: 2 / 1"],
  ])("explains forecast, overlap and completeness in %s", (language, scope, overlap, version, reasons, addons) => {
    locale.value = language;
    render(<IssueExposureBasis data={{ pricing_mode: "FACTORY", price_list_version: 4, exposure_profit_total: null,
      unpriced_exposure_doors: 2, unpriced_open_issue_doors: 1, unpriced_blocked_issue_doors: 0, unpriced_delayed_doors: 2,
      reason_rows_total: 9, addon_rows_total: 7, incomplete_addon_rows: 3,
      addon_unrecorded_completed_works: 2, addon_missing_client_prices: 1 }} reasonsShown={1} addonsShown={1} />);
    for (const text of [scope, overlap, version, reasons, addons, "- ILS", "1 / 7", "1 / 0 / 2"]) {
      expect(screen.getByRole("status")).toHaveTextContent(text);
    }
  });

  it("keeps known zero distinct from unavailable exposure", () => {
    locale.value = "en";
    render(<IssueExposureBasis data={{ pricing_mode: "FACTORY", price_list_version: 1, exposure_profit_total: 0,
      exposure_doors: 0, reason_rows_total: 0, addon_rows_total: 0 }} reasonsShown={0} addonsShown={0} />);
    expect(screen.getByRole("status")).toHaveTextContent("Risk across unique doors: 0.00 ILS. Doors: 0");
    expect(screen.queryByText(/Doors without a confirmed rate/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Add-ons without earnings/)).not.toBeInTheDocument();
  });

  it("does not call legacy rates factory-confirmed", () => {
    locale.value = "en";
    render(<IssueExposureBasis data={{ pricing_mode: "LEGACY", exposure_profit_total: 20 }} />);
    expect(screen.getByRole("status")).toHaveTextContent("Forecast exposure");
    expect(screen.queryByText(/active confirmed/)).not.toBeInTheDocument();
  });

  it("does not fabricate a basis or warning for unavailable data", () => {
    const { container } = render(<><IssueExposureBasis /><UnpricedExposureNotice count={0} /></>);
    expect(container).toBeEmptyDOMElement();
  });
});
