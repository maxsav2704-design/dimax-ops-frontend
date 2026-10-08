import { useI18n } from "@/lib/i18n";

export type ProjectPricingCoverage = {
  pricing_mode?: "LEGACY" | "FACTORY";
  price_list_version?: number | null;
  missing_planned_rates_doors?: number;
  missing_planned_rates_addons?: number;
  unrecorded_completed_works?: number;
  missing_addon_plans_facts?: number;
};

export function ProjectPricingNotice({ data }: { data: ProjectPricingCoverage }) {
  const { locale } = useI18n();
  const copy = (en: string, ru: string, he: string) => locale === "ru" ? ru : locale === "he" ? he : en;
  if (data.pricing_mode !== "FACTORY") return null;
  const missing = (data.missing_planned_rates_doors ?? 0) + (data.missing_planned_rates_addons ?? 0);
  const unrecorded = data.unrecorded_completed_works ?? 0;
  const noPlan = data.missing_addon_plans_facts ?? 0;
  return <div role="status" className="min-w-0 space-y-1 border-s-2 border-accent ps-3 text-xs text-text-secondary">
    <p className="font-medium text-text">{copy("Plan: confirmed factory price list", "План: подтверждённый прайс завода", "תכנון: מחירון מפעל מאושר")} v{data.price_list_version}.
      {" "}{copy("Actual payroll: recorded earnings.", "Факт начислений: журнал заработка.", "שכר בפועל: רישומי שכר.")}</p>
    <p>{copy("Historical urgency agreements are separate and are not accrued earnings.",
      "Исторические надбавки указаны отдельно и не являются начисленным заработком.",
      "הסכמי דחיפות היסטוריים מוצגים בנפרד ואינם שכר שנצבר.")}</p>
    {missing > 0 && <p className="text-status-problem-fg">{copy("Unpriced plan items", "Позиции плана без подтверждённой цены", "פריטי תכנון ללא מחיר מאושר")}: {missing}.
      {" "}{copy("Payroll plan and profit are incomplete.", "План начислений и прибыли не рассчитан полностью.", "תכנון השכר והרווח אינו מלא.")}</p>}
    {(unrecorded > 0 || noPlan > 0) && <p className="text-status-problem-fg">{copy("Works without a ledger entry", "Работы без записи о начислении", "עבודות ללא רישום שכר")}: {unrecorded}.
      {" "}{copy("Additional work without a client plan", "Допработы без клиентского плана", "עבודות נוספות ללא תוכנית לקוח")}: {noPlan}.
      {" "}{copy("Actual profit is incomplete.", "Фактическая прибыль не рассчитана полностью.", "הרווח בפועל אינו מלא.")}</p>}
  </div>;
}
