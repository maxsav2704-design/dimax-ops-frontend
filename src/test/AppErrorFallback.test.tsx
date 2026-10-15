import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppErrorFallback } from "@/components/AppErrorFallback";
import { LOCALE_STORAGE_KEY } from "@/lib/locale";

// jsdom's localStorage is not functional in this setup; install a minimal stub.
const storageState = new Map<string, string>();
const storageMock = {
  getItem: (key: string) => storageState.get(key) ?? null,
  setItem: (key: string, value: string) => { storageState.set(key, value); },
  removeItem: (key: string) => { storageState.delete(key); },
};

beforeEach(() => {
  storageState.clear();
  Object.defineProperty(window, "localStorage", { value: storageMock, configurable: true });
  document.documentElement.lang = "";
});

afterEach(() => {
  storageState.clear();
  document.documentElement.lang = "";
});

describe("AppErrorFallback", () => {
  it("offers retry and a way home in the stored locale, with the error reference", () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, "ru");
    const reset = vi.fn();
    render(<AppErrorFallback error={Object.assign(new Error("boom"), { digest: "abc123" })} reset={reset} homeHref="/" />);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveAttribute("dir", "ltr");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Не удалось показать этот экран");
    expect(screen.getByText("abc123")).toHaveAttribute("dir", "ltr");
    expect(screen.getByRole("link", { name: "На главную" })).toHaveAttribute("href", "/");

    fireEvent.click(screen.getByRole("button", { name: "Повторить" }));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("switches to RTL for Hebrew and hides the reference when there is no digest", () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, "he");
    render(<AppErrorFallback error={new Error("boom")} reset={() => undefined} homeHref="/installer" />);

    expect(screen.getByRole("alert")).toHaveAttribute("dir", "rtl");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("לא ניתן להציג מסך זה");
    expect(screen.queryByText(/קוד שגיאה/)).toBeNull();
    expect(screen.getByRole("link", { name: "לדף הראשי" })).toHaveAttribute("href", "/installer");
  });

  it("falls back to English without a stored locale and never prints the raw error message", () => {
    render(<AppErrorFallback error={new Error("secret internal detail")} reset={() => undefined} standalone />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("This screen could not be shown");
    expect(screen.queryByText(/secret internal detail/)).toBeNull();
  });
});
