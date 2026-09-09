"use client";

import type { Locale } from "@/lib/i18n";

type LocalizedTriple = {
  en: string;
  ru: string;
  he: string;
};

const ERROR_COPY: Record<string, LocalizedTriple> = {
  NETWORK_UNAVAILABLE: {
    en: "Could not reach the server. Check your connection and try again.",
    ru: "Нет связи с сервером. Проверьте соединение и повторите попытку.",
    he: "לא ניתן להתחבר לשרת. יש לבדוק את החיבור ולנסות שוב.",
  },
  AUTH_REFRESH_UNAVAILABLE: {
    en: "Could not verify your session. Please try again shortly.",
    ru: "Не удалось проверить сессию. Повторите попытку через некоторое время.",
    he: "לא ניתן לאמת את ההתחברות. יש לנסות שוב בעוד זמן קצר.",
  },
  AUTH_REQUIRED: {
    en: "Your session expired. Sign in again to continue.",
    ru: "Сессия истекла. Войди снова, чтобы продолжить.",
    he: "פג תוקף ההתחברות. יש להתחבר מחדש כדי להמשיך.",
  },
  FORBIDDEN_SCOPE: {
    en: "This action is not available for your access level.",
    ru: "Это действие недоступно для твоего уровня доступа.",
    he: "הפעולה הזו אינה זמינה עבור רמת הגישה שלך.",
  },
  CONFLICT_ASSIGNMENT_CHANGED: {
    en: "Assignment changed on the server. Refresh data and reopen the current item.",
    ru: "Назначение изменилось на сервере. Обнови данные и открой текущий элемент заново.",
    he: "השיוך השתנה בשרת. רענן את הנתונים ופתח מחדש את הפריט הנוכחי.",
  },
  CONFLICT_INVALID_TRANSITION: {
    en: "This status change is no longer valid. Refresh data and try the next allowed step.",
    ru: "Этот переход статуса уже недоступен. Обнови данные и выбери следующий допустимый шаг.",
    he: "שינוי הסטטוס הזה כבר לא תקף. רענן את הנתונים ונסה את הצעד הבא המותר.",
  },
  RATE_NOT_FOUND: {
    en: "Rate data is unavailable right now. Refresh the page or contact the office.",
    ru: "Данные по ставке сейчас недоступны. Обнови страницу или свяжись с офисом.",
    he: "נתוני התעריף אינם זמינים כרגע. רענן את העמוד או פנה למשרד.",
  },
};

const CONFLICT_COPY: Record<string, LocalizedTriple> = {
  CONFLICT_ASSIGNMENT_CHANGED: {
    en: "Assignment changed",
    ru: "Назначение изменилось",
    he: "השיוך השתנה",
  },
  CONFLICT_INVALID_TRANSITION: {
    en: "Invalid transition",
    ru: "Недопустимый переход",
    he: "מעבר לא תקין",
  },
};

function pickLocale(copy: LocalizedTriple, locale: Locale): string {
  if (locale === "ru") return copy.ru;
  if (locale === "he") return copy.he;
  return copy.en;
}

function isApiErrorLike(error: unknown): error is {
  code?: string;
  message?: string;
  status?: number;
  field?: string;
  meta?: Record<string, unknown>;
} {
  return typeof error === "object" && error !== null && ("status" in error || "code" in error);
}

export function readableApiError(
  error: unknown,
  locale: Locale,
  fallback: string
): string {
  if (isApiErrorLike(error)) {
    if (error.code && ERROR_COPY[error.code]) {
      return pickLocale(ERROR_COPY[error.code], locale);
    }

    if (error.message && error.message.trim()) {
      return error.message;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

export function readableConflictCode(code: string | null | undefined, locale: Locale): string | null {
  if (!code) {
    return null;
  }

  if (CONFLICT_COPY[code]) {
    return pickLocale(CONFLICT_COPY[code], locale);
  }

  return code;
}
