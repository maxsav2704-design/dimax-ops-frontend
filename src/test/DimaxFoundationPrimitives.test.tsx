import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DimaxPageHeader } from "@/components/DimaxPageHeader";
import { CardSkeleton, DateTime, EmptyState, InlineNotice, Money, TableSkeleton } from "@/components/dimax";

const { localeMock } = vi.hoisted(() => ({ localeMock: { locale: "ru" as "en" | "ru" | "he" } }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ locale: localeMock.locale, t: (key: string) => key }) }));

describe("DimaxPageHeader", () => {
  it("renders one h1 with breadcrumbs, badge, subtitle, meta and actions, without stray whitespace", () => {
    const { container } = render(
      <DimaxPageHeader
        breadcrumbs={[{ label: "Главная", href: "/" }, { label: "Отчёты" }]}
        title="Панель отчётов"
        badge="Неделя 42"
        subtitle="Сводка по компании"
        meta={<span>3 сигнала</span>}
        actions={<button type="button">Экспорт</button>}
      />,
    );
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Панель отчётов");
    expect(screen.getByRole("navigation", { name: /breadcrumb/i })).toHaveTextContent("Отчёты");
    expect(screen.getByText("Неделя 42")).toBeInTheDocument();
    expect(screen.getByText("3 сигнала")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Экспорт" })).toBeInTheDocument();
    // The previous implementation emitted {" "} text nodes between every element.
    const stray = Array.from(container.querySelectorAll("section > *, section > div > *"))
      .flatMap((node) => Array.from(node.childNodes))
      .filter((node) => node.nodeType === Node.TEXT_NODE && node.textContent === " ");
    expect(stray).toHaveLength(0);
  });

  it("falls back to the eyebrow when no breadcrumbs are given", () => {
    render(<DimaxPageHeader eyebrow="Справочники" title="Типы дверей" />);
    expect(screen.getByText("Справочники")).toHaveClass("type-eyebrow");
    expect(screen.queryByRole("navigation")).toBeNull();
  });
});

describe("state primitives", () => {
  it("EmptyState is a polite status with title, description and action", () => {
    render(<EmptyState title="Нет дверей" description="Добавьте двери вручную" action={<button type="button">Добавить</button>} testId="empty" />);
    const state = screen.getByTestId("empty");
    expect(state).toHaveAttribute("role", "status");
    expect(state).toHaveTextContent("Нет дверей");
    expect(screen.getByRole("button", { name: "Добавить" })).toBeInTheDocument();
  });

  it("InlineNotice announces errors as alerts and others as status, with a localized dismiss", () => {
    const onDismiss = vi.fn();
    render(
      <>
        <InlineNotice tone="error" testId="err">Не удалось сохранить</InlineNotice>
        <InlineNotice tone="success" onDismiss={onDismiss} testId="ok">Сохранено</InlineNotice>
      </>,
    );
    expect(screen.getByTestId("err")).toHaveAttribute("role", "alert");
    expect(screen.getByTestId("ok")).toHaveAttribute("role", "status");
    fireEvent.click(screen.getByRole("button", { name: "Скрыть" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("skeletons are busy status regions with the requested geometry", () => {
    const { container } = render(
      <>
        <TableSkeleton rows={3} columns={4} testId="table" />
        <CardSkeleton cards={2} testId="cards" />
      </>,
    );
    expect(screen.getByTestId("table")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByTestId("table")).toHaveAttribute("aria-label", "Загрузка");
    expect(container.querySelectorAll('[data-testid="table"] .animate-pulse')).toHaveLength(4 + 3 * 4);
    expect(container.querySelectorAll('[data-testid="cards"] > div')).toHaveLength(2);
  });
});

describe("value primitives", () => {
  it("Money uses the app locale and the company currency, isolated LTR in Hebrew", () => {
    localeMock.locale = "he";
    const { container } = render(<Money value="1250.5" />);
    const text = container.textContent ?? "";
    expect(text).toContain("ILS");
    expect(text.startsWith("⁦")).toBe(true);
    expect(container.firstElementChild).toHaveClass("num");
    localeMock.locale = "ru";
  });

  it("Money prints a dash for missing values and DateTime exposes a machine-readable datetime", () => {
    const { container } = render(
      <>
        <Money value={null} />
        <DateTime value="2026-10-15T09:49:43.447Z" mode="date" />
      </>,
    );
    expect(container.textContent).toContain("—");
    const time = container.querySelector("time");
    expect(time).toHaveAttribute("dateTime", "2026-10-15T09:49:43.447Z");
    expect(time?.textContent).toMatch(/2026/);
    expect(time?.textContent).not.toMatch(/\d{2}:\d{2}/);
  });
});
