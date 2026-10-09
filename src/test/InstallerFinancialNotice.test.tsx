import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InstallerFinancialBand, InstallerFinancialBasis, InstallerFinancialNotice } from "@/components/prices/InstallerFinancialNotice";
import { installerFinancialDataRisk } from "@/lib/installer-financials";

const locale = vi.hoisted(() => ({ value: "en" }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ locale: locale.value }) }));

describe("installer financial coverage", () => {
  it.each([
    ["en", "recorded performer", "Incomplete financial rows: 7", "Unrecorded works without an installer: 3", "Works without earnings: 2", "Incomplete"],
    ["ru", "фактического исполнителя", "Строки с неполными финансовыми данными: 7", "Работы без начисления и без монтажника: 3", "Работы без начислений: 2", "Неполные данные"],
    ["he", "למבצע הרשום", "שורות עם נתונים כספיים חסרים: 7", "עבודות ללא רישום שכר וללא מתקין: 3", "עבודות ללא שכר: 2", "נתונים חסרים"],
  ])("explains performer, missing records and unassigned work in %s", (language, basis, incomplete, unassigned, row, band) => {
    locale.value = language;
    render(<>
      <InstallerFinancialBasis data={{ pricing_mode: "FACTORY", incomplete_items: 7, unassigned_completed_works: 3 }} />
      <InstallerFinancialNotice data={{ pricing_mode: "FACTORY", unrecorded_completed_works: 2,
        missing_client_prices: 1, missing_rates_installed_doors: 1, missing_addon_plans_facts: 1 }} />
      <InstallerFinancialBand band="INCOMPLETE" />
    </>);
    expect(screen.getByRole("status")).toHaveTextContent(basis);
    expect(screen.getByRole("status")).toHaveTextContent(incomplete);
    expect(screen.getByRole("status")).toHaveTextContent(unassigned);
    expect(screen.getByText(new RegExp(row))).toBeInTheDocument();
    expect(screen.getByText(band, { exact: true })).toBeInTheDocument();
    expect(screen.queryByText("INCOMPLETE", { exact: true })).not.toBeInTheDocument();
  });

  it("does not double count overlapping coverage flags", () => {
    const data = { unrecorded_completed_works: 2, missing_client_prices: 1,
      missing_rates_installed_doors: 1, missing_addon_plans_facts: 1 };
    expect(installerFinancialDataRisk({ ...data, pricing_mode: "FACTORY" })).toBe(3);
    expect(installerFinancialDataRisk({ ...data, pricing_mode: "LEGACY" })).toBe(2);
  });

  it.each([
    ["en", "Strong", "Watch", "Risk"],
    ["ru", "Высокий результат", "Требует внимания", "Риск"],
    ["he", "תוצאה גבוהה", "דורש מעקב", "סיכון"],
  ])("localizes the existing assessment bands in %s", (language, strong, watch, risk) => {
    locale.value = language;
    render(<div><InstallerFinancialBand band="STRONG" /> / <InstallerFinancialBand band="WATCH" /> / <InstallerFinancialBand band="RISK" /></div>);
    expect(screen.getByText(`${strong} / ${watch} / ${risk}`)).toBeInTheDocument();
  });

  it("never labels legacy or unavailable data as recorded earnings", () => {
    const { container } = render(<>
      <InstallerFinancialBasis />
      <InstallerFinancialBasis data={{ pricing_mode: "LEGACY", incomplete_items: 1 }} />
      <InstallerFinancialNotice data={{ pricing_mode: "LEGACY", missing_rates_installed_doors: 1, missing_addon_plans_facts: 1 }} />
    </>);
    expect(container).toBeEmptyDOMElement();
  });
});
