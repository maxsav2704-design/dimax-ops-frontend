import type { Locale } from "@/lib/locale";
import { isLocale, localeMeta, localeFromLanguageTag } from "@/lib/locale";

function getIntlLocale(locale: Locale): string {
  if (locale === "ru") {
    return "ru-RU";
  }
  if (locale === "he") {
    return "he-IL";
  }
  return "en-US";
}

export function resolveFormattingLocale(locale?: Locale | null): Locale {
  if (locale && isLocale(locale)) {
    return locale;
  }

  if (typeof document !== "undefined" && isLocale(document.documentElement.lang)) {
    return document.documentElement.lang;
  }

  if (typeof window !== "undefined") {
    return localeFromLanguageTag(window.navigator.language);
  }

  return "en";
}

export function isRtlLocale(locale?: Locale | null): boolean {
  const resolved = resolveFormattingLocale(locale);
  return localeMeta[resolved].dir === "rtl";
}

export function withLtrIsolation(value: string, locale?: Locale | null): string {
  if (!isRtlLocale(locale)) {
    return value;
  }
  return `\u2066${value}\u2069`;
}

export function formatLocaleNumber(
  value: string | number | null | undefined,
  locale?: Locale | null,
  options?: Intl.NumberFormatOptions
): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return String(value);
  }

  const resolved = resolveFormattingLocale(locale);
  const formatted = new Intl.NumberFormat(getIntlLocale(resolved), options).format(numeric);
  return withLtrIsolation(formatted, resolved);
}

export function formatLocaleMoney(
  value: string | number | null | undefined,
  currency?: string | null,
  locale?: Locale | null,
  options?: Intl.NumberFormatOptions
): string {
  const formatted = formatLocaleNumber(value, locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options,
  });
  if (!currency || formatted === "—") {
    return formatted;
  }
  return withLtrIsolation(`${formatted} ${currency}`, locale);
}

export function formatLocalePercent(
  value: string | number | null | undefined,
  locale?: Locale | null,
  options?: Intl.NumberFormatOptions
): string {
  const formatted = formatLocaleNumber(value, locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  });
  if (formatted === "—") {
    return formatted;
  }
  return withLtrIsolation(`${formatted}%`, locale);
}

export function formatLocaleDateTime(
  value: string | number | Date | null | undefined,
  locale?: Locale | null,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!value) {
    return "—";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  const resolved = resolveFormattingLocale(locale);
  const formatted = new Intl.DateTimeFormat(getIntlLocale(resolved), {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  }).format(date);
  return withLtrIsolation(formatted, resolved);
}
