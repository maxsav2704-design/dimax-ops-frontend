import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProjectMarginBasis, ProjectMarginNotice } from "@/components/prices/ProjectMarginNotice";
import { projectMarginDataRisk } from "@/lib/project-margin";

const locale = vi.hoisted(() => ({ value: "en" }));
vi.mock("@/lib/i18n", () => ({ useCopy: () => (en: string, ru: string, he: string) => (locale.value === "ru" ? ru : locale.value === "he" ? he : en), useI18n: () => ({ locale: locale.value }) }));

describe("project margin coverage", () => {
  it.each([
    ["en", "Project payroll: recorded earnings", "Projects with incomplete financial data: 7", "Works without earnings: 2"],
    ["ru", "Начисления по объектам: журнал заработка", "Объекты с неполными финансовыми данными: 7", "Работы без начислений: 2"],
    ["he", "שכר בפרויקטים: רישומי שכר", "פרויקטים עם נתונים כספיים חסרים: 7", "עבודות ללא שכר: 2"],
  ])("explains recorded amounts and missing data in %s", (language, basis, missing, row) => {
    locale.value = language;
    render(<>
      <ProjectMarginBasis mode="FACTORY" incomplete={7} />
      <ProjectMarginNotice data={{ pricing_mode: "FACTORY", unrecorded_completed_works: 2,
        missing_rates_installed_doors: 1, missing_addon_plans_facts: 0 }} />
    </>);
    expect(screen.getByRole("status")).toHaveTextContent(basis);
    expect(screen.getByRole("status")).toHaveTextContent(missing);
    expect(screen.getByText(new RegExp(row))).toBeInTheDocument();
  });

  it("counts unrecorded addons without double counting doors", () => {
    expect(projectMarginDataRisk({ pricing_mode: "FACTORY", unrecorded_completed_works: 2,
      missing_rates_installed_doors: 1, missing_addon_plans_facts: 3 })).toBe(5);
    expect(projectMarginDataRisk({ pricing_mode: "LEGACY", unrecorded_completed_works: 2,
      missing_rates_installed_doors: 1, missing_addon_plans_facts: 3 })).toBe(4);
  });

  it("does not claim legacy calculations are ledger actuals", () => {
    const { container } = render(<><ProjectMarginBasis mode="LEGACY" incomplete={0} />
      <ProjectMarginNotice data={{ pricing_mode: "LEGACY", missing_rates_installed_doors: 1, missing_addon_plans_facts: 1 }} /></>);
    expect(container).toBeEmptyDOMElement();
  });
});
