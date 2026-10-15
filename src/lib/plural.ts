import type { Locale } from "@/lib/locale";

/**
 * Locale-aware noun forms for counted labels ("1 incident", "2 инцидента", "5 инцидентов").
 *
 * - `en` / `he`: [one, other]
 * - `ru`: [one, few, many] (1 инцидент / 2 инцидента / 5 инцидентов)
 */
export type PluralSpec = {
  en: readonly [one: string, other: string];
  ru: readonly [one: string, few: string, many: string];
  he: readonly [one: string, other: string];
};

const rulesCache: Partial<Record<Locale, Intl.PluralRules>> = {};

function pluralCategory(locale: Locale, count: number): Intl.LDMLPluralRule {
  try {
    const rules =
      rulesCache[locale] ?? (rulesCache[locale] = new Intl.PluralRules(locale));
    return rules.select(count);
  } catch {
    return count === 1 ? "one" : "other";
  }
}

export function pluralNoun(locale: Locale, count: number, spec: PluralSpec): string {
  const category = pluralCategory(locale, count);
  if (locale === "ru") {
    const [one, few, many] = spec.ru;
    if (category === "one") return one;
    if (category === "few") return few;
    return many;
  }
  const [one, other] = locale === "he" ? spec.he : spec.en;
  return category === "one" ? one : other;
}

export function countNoun(locale: Locale, count: number, spec: PluralSpec): string {
  return `${count} ${pluralNoun(locale, count, spec)}`;
}
