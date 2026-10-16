import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api";
import { readableApiError, readableConflictCode } from "@/lib/api-error-display";

describe("api-error-display", () => {
  it.each([
    ["en", "FACTORY_ADDON_PRICE_REQUIRED", "confirmed factory price list"],
    ["ru", "FACTORY_ADDON_PRICE_REQUIRED", "подтверждённого прайса завода"],
    ["he", "FACTORY_ADDON_PRICE_REQUIRED", "מחירון המפעל המאושר"],
    ["en", "FACTORY_URGENCY_REQUIRES_ADDON", "Manual surcharges are locked"],
    ["ru", "FACTORY_URGENCY_REQUIRES_ADDON", "Ручные надбавки заблокированы"],
    ["he", "FACTORY_URGENCY_REQUIRES_ADDON", "תוספות ידניות חסומות"],
  ] as const)("localizes %s %s", (locale, reason, expected) => {
    const error = new ApiError(409, "Internal pricing boundary", { error: { code: "CONFLICT", meta: { reason } } });
    expect(readableApiError(error, locale, "fallback")).toContain(expected);
  });
  it.each([
    ["en", "Factory pricing is now active."],
    ["ru", "Включён единый прайс завода."],
    ["he", "מחירון המפעל הופעל."],
  ] as const)("explains a concurrent factory cutover in %s", (locale, message) => {
    const error = new ApiError(409, "Individual rates are historical", {
      error: { code: "CONFLICT", meta: { reason: "FACTORY_PRICES_ACTIVE" } },
    });
    expect(readableApiError(error, locale, "fallback")).toContain(message);
  });
  it.each([
    ["en", "Could not reach the server. Check your connection and try again.", "Could not verify your session. Please try again shortly."],
    ["ru", "Нет связи с сервером. Проверьте соединение и повторите попытку.", "Не удалось проверить сессию. Повторите попытку через некоторое время."],
    ["he", "לא ניתן להתחבר לשרת. יש לבדוק את החיבור ולנסות שוב.", "לא ניתן לאמת את ההתחברות. יש לנסות שוב בעוד זמן קצר."],
  ] as const)("localizes connection and refresh failures in %s", (locale, network, refresh) => {
    expect(readableApiError(new ApiError(0, "Failed to fetch", { error: { code: "NETWORK_UNAVAILABLE" } }), locale, "fallback")).toBe(network);
    expect(readableApiError(new ApiError(503, "Unavailable", { error: { code: "AUTH_REFRESH_UNAVAILABLE" } }), locale, "fallback")).toBe(refresh);
  });

  it("maps auth required to readable localized copy", () => {
    const error = new ApiError(401, "Unauthorized", {
      error: {
        code: "AUTH_REQUIRED",
        message: "Unauthorized",
      },
    });

    expect(readableApiError(error, "en", "fallback")).toBe(
      "Your session expired. Sign in again to continue."
    );
    expect(readableApiError(error, "ru", "fallback")).toBe(
      "Сессия истекла. Войди снова, чтобы продолжить."
    );
  });

  it("maps a rejected login to localized copy instead of the raw API detail", () => {
    const error = new ApiError(401, "Invalid credentials", {
      error: { code: "INVALID_CREDENTIALS", message: "Invalid credentials" },
    });

    expect(readableApiError(error, "en", "fallback")).toBe("Company ID, email or password is incorrect.");
    expect(readableApiError(error, "ru", "fallback")).toBe("Неверный ID компании, электронная почта или пароль.");
    expect(readableApiError(error, "he", "fallback")).toBe("מזהה החברה, האימייל או הסיסמה שגויים.");
  });

  it("maps a malformed response to localized copy", () => {
    const error = new ApiError(200, "Unexpected response shape from /api/v1/auth/me", {
      error: { code: "INVALID_RESPONSE", message: "Unexpected response shape", meta: { path: "/api/v1/auth/me" } },
    });
    expect(readableApiError(error, "ru", "fallback")).toContain("неожиданном формате");
    expect(readableApiError(error, "he", "fallback")).toContain("לא צפוי");
  });

  it("maps conflict codes to readable labels", () => {
    expect(readableConflictCode("CONFLICT_ASSIGNMENT_CHANGED", "en")).toBe("Assignment changed");
    expect(readableConflictCode("CONFLICT_INVALID_TRANSITION", "ru")).toBe("Недопустимый переход");
    expect(readableConflictCode(null, "he")).toBeNull();
  });
});
