import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { DimaxPageHeader } from "@/components/DimaxPageHeader";

function setScroll(y: number) {
  Object.defineProperty(window, "scrollY", { configurable: true, writable: true, value: y });
}

afterEach(() => setScroll(0));

describe("condensed page header (E3)", () => {
  it("keeps title, status and the primary action once the page scrolls past 120 px", () => {
    render(
      <DimaxPageHeader
        title="Приёмка Excel: 9 дверей"
        status={<span data-testid="status">В работе</span>}
        actions={<button type="button">Импорт дверей</button>}
        condensedAction={<button type="button">Импорт дверей</button>}
      />,
    );
    const bar = screen.getByTestId("dmx-condensed-bar");
    expect(bar).toHaveAttribute("data-on", "false");
    act(() => {
      setScroll(200);
      fireEvent.scroll(window);
    });
    expect(bar).toHaveAttribute("data-on", "true");
    expect(bar).toHaveTextContent("Приёмка Excel: 9 дверей");
    expect(bar).toHaveTextContent("В работе");
    expect(screen.getAllByRole("button", { name: "Импорт дверей" })).toHaveLength(2);
    act(() => {
      setScroll(40);
      fireEvent.scroll(window);
    });
    expect(bar).toHaveAttribute("data-on", "false");
  });

  it("renders no bar for pages that do not ask for one", () => {
    render(<DimaxPageHeader title="Настройки" />);
    expect(screen.queryByTestId("dmx-condensed-bar")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Настройки");
  });
});
