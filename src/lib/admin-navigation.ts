import type { AdminModule } from "@/lib/admin-access";
import type { Locale } from "@/lib/locale";
import { commercialCopy } from "@/components/accounting/copy";

// The admin's sections as palette entries. Titles come from the same nav.*
// keys the sidebar uses; keywords add the English and Russian spellings so a
// user can type either regardless of the interface language.

export type AdminSection = {
  path: string;
  module: AdminModule;
  navKey: string;
  keywords: string[];
};

export const ADMIN_SECTIONS: AdminSection[] = [
  { path: "/", module: "dashboard", navKey: "nav.dashboard", keywords: ["home", "главная", "dashboard"] },
  { path: "/projects", module: "projects", navKey: "nav.projects", keywords: ["projects", "проекты", "объекты"] },
  { path: "/calendar", module: "calendar", navKey: "nav.calendar", keywords: ["calendar", "календарь", "расписание"] },
  { path: "/issues", module: "issues", navKey: "nav.issues", keywords: ["issues", "проблемы"] },
  { path: "/installers", module: "installers", navKey: "nav.installers", keywords: ["installers", "монтажники"] },
  { path: "/journal", module: "journal", navKey: "nav.journal", keywords: ["journal", "журнал", "доставка"] },
  { path: "/price-lists", module: "price-lists", navKey: "nav.priceLists", keywords: ["price list", "прайс", "завод", "ставки"] },
  { path: "/factory-accounting", module: "factory-accounting", navKey: "nav.factoryAccounting", keywords: ["contracts", "billing", "factory settlements", "договоры", "оплаты", "расчёты", "commercial", "חוזים", "חיובים", "התחשבנות"] },
  { path: "/reports", module: "reports", navKey: "nav.reports", keywords: ["reports", "отчёты", "отчеты"] },
  { path: "/earnings-ledger", module: "reports", navKey: "nav.earningsLedger", keywords: ["ledger", "начисления", "payroll"] },
  { path: "/documents", module: "projects", navKey: "nav.documents", keywords: ["documents", "документы"] },
  { path: "/library", module: "library", navKey: "nav.library", keywords: ["library", "справочники", "каталог"] },
  { path: "/door-types", module: "door-types", navKey: "nav.doorTypes", keywords: ["door types", "типы дверей"] },
  { path: "/reasons", module: "reasons", navKey: "nav.reasons", keywords: ["reasons", "причины"] },
  { path: "/operations", module: "operations", navKey: "nav.operations", keywords: ["operations", "операции", "восстановление"] },
  { path: "/settings", module: "settings", navKey: "nav.settings", keywords: ["settings", "настройки"] },
];

export function sectionTitle(section: AdminSection, locale: Locale, t: (key: string) => string): string {
  if (section.module === "factory-accounting") return commercialCopy[locale].title;
  const translated = t(section.navKey);
  if (translated && translated !== section.navKey) return translated;
  const fallback: Record<string, [string, string, string]> = {
    "nav.priceLists": ["Factory price list", "Прайс завода", "מחירון מפעל"],
    "nav.documents": ["Documents", "Документы", "מסמכים"],
  };
  const entry = fallback[section.navKey];
  if (!entry) return section.navKey;
  return locale === "ru" ? entry[1] : locale === "he" ? entry[2] : entry[0];
}
