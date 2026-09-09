import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api";
import { readableApiError, readableConflictCode } from "@/lib/api-error-display";

describe("api-error-display", () => {
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

  it("maps conflict codes to readable labels", () => {
    expect(readableConflictCode("CONFLICT_ASSIGNMENT_CHANGED", "en")).toBe("Assignment changed");
    expect(readableConflictCode("CONFLICT_INVALID_TRANSITION", "ru")).toBe("Недопустимый переход");
    expect(readableConflictCode(null, "he")).toBeNull();
  });
});
