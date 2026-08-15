export type Locale = "en" | "ru" | "he";

export const LOCALE_STORAGE_KEY = "dimax_locale";

export const localeMeta: Record<Locale, { label: string; dir: "ltr" | "rtl" }> = {
  en: { label: "EN", dir: "ltr" },
  ru: { label: "RU", dir: "ltr" },
  he: { label: "עב", dir: "rtl" },
};

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "en" || value === "ru" || value === "he";
}

export function localeFromLanguageTag(value: string | null | undefined): Locale {
  const normalized = (value || "").trim().toLowerCase();
  if (normalized.startsWith("ru")) {
    return "ru";
  }
  if (normalized.startsWith("he") || normalized.startsWith("iw")) {
    return "he";
  }
  return "en";
}

export function getBootstrapLocale(): Locale {
  if (typeof window === "undefined") {
    return "en";
  }

  const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  if (isLocale(stored)) {
    return stored;
  }

  const documentLocale = document.documentElement.lang;
  if (isLocale(documentLocale)) {
    return documentLocale;
  }

  return localeFromLanguageTag(window.navigator.language);
}

export function getDocumentLocaleBootstrapScript(): string {
  return `
    (function () {
      try {
        var storageKey = ${JSON.stringify(LOCALE_STORAGE_KEY)};
        var stored = window.localStorage.getItem(storageKey);
        var browser = (window.navigator.language || "").toLowerCase();
        var locale = stored === "ru" || stored === "he" || stored === "en"
          ? stored
          : (browser.indexOf("ru") === 0
            ? "ru"
            : ((browser.indexOf("he") === 0 || browser.indexOf("iw") === 0) ? "he" : "en"));
        var dir = locale === "he" ? "rtl" : "ltr";
        document.documentElement.lang = locale;
        document.documentElement.dir = dir;
      } catch (error) {
        document.documentElement.lang = "en";
        document.documentElement.dir = "ltr";
      }
    })();
  `;
}
