import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OrderFinancialBasis } from "@/components/prices/OrderFinancialBasis";

const locale = vi.hoisted(() => ({ value: "en" }));
vi.mock("@/lib/i18n", () => ({ useCopy: () => (en: string, ru: string, he: string) => (locale.value === "ru" ? ru : locale.value === "he" ? he : en), useI18n: () => ({ locale: locale.value }) }));

describe("order financial basis", () => {
  it.each([
    ["en", "excluding add-ons", "including cancellations", "saved client price", "Orders with incomplete finances: 3", "Orders shown: 1 / 8"],
    ["ru", "без допработ", "с учётом отмен", "сохранённой цене клиента", "Заказы с неполными финансовыми данными: 3", "Показано заказов: 1 / 8"],
    ["he", "ללא תוספות", "כולל ביטולים", "מחיר הלקוח השמור", "הזמנות עם נתונים כספיים חסרים: 3", "הזמנות מוצגות: 1 / 8"],
  ])("explains accounting and full coverage in %s", (language, scope, cancellation, revenue, gaps, count) => {
    locale.value = language;
    render(<OrderFinancialBasis data={{ pricing_mode: "FACTORY", incomplete_orders: 3, total: 8 }} shown={1} />);
    for (const text of [scope, cancellation, revenue, gaps, count]) {
      expect(screen.getByRole("status")).toHaveTextContent(text);
    }
  });

  it("retains the basis for an empty result without inventing gaps", () => {
    locale.value = "en";
    render(<OrderFinancialBasis data={{ pricing_mode: "FACTORY", incomplete_orders: 0, total: 0 }} shown={0} />);
    expect(screen.getByRole("status")).toHaveTextContent("Orders shown: 0 / 0");
    expect(screen.queryByText(/Orders with incomplete finances/)).not.toBeInTheDocument();
  });

  it("does not label legacy or unavailable figures as recorded money", () => {
    const { container } = render(<><OrderFinancialBasis /><OrderFinancialBasis data={{ pricing_mode: "LEGACY" }} /></>);
    expect(container).toBeEmptyDOMElement();
  });
});
