import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api";
import { readableApiError, readableConflictCode } from "@/lib/api-error-display";

describe("api-error-display", () => {
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
