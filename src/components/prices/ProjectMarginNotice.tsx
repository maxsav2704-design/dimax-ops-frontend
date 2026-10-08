import { useI18n } from "@/lib/i18n";
import { projectMarginDataRisk, type ProjectMarginCoverage } from "@/lib/project-margin";

export function ProjectMarginBasis({ mode, incomplete = 0 }: {
  mode?: "LEGACY" | "FACTORY";
  incomplete?: number;
}) {
  const { locale } = useI18n();
  const copy = (en: string, ru: string, he: string) => locale === "ru" ? ru : locale === "he" ? he : en;
  if (mode !== "FACTORY") return null;
  return <div role="status" className="min-w-0 space-y-1 px-3 py-2 text-xs text-text-secondary">
    <p>{copy("Project payroll: recorded earnings, including reversals and corrections. Current rates do not reprice completed work.",
      "Начисления по объектам: журнал заработка с учётом отмен и корректировок. Новый прайс не пересчитывает выполненные работы.",
      "שכר בפרויקטים: רישומי שכר, כולל ביטולים ותיקונים. מחירון חדש אינו משנה עבודות שבוצעו.")}</p>
    {incomplete > 0 && <p className="text-status-problem-fg">{copy("Projects with incomplete financial data", "Объекты с неполными финансовыми данными", "פרויקטים עם נתונים כספיים חסרים")}: {incomplete}.
      {" "}{copy("Unknown profit is not ranked; this count includes projects outside the displayed rows.",
        "Неизвестная прибыль не участвует в рейтинге; счётчик учитывает и объекты вне показанных строк.",
        "רווח לא ידוע אינו מדורג; הספירה כוללת גם פרויקטים שאינם בשורות המוצגות.")}</p>}
  </div>;
}

export function ProjectMarginNotice({ data }: { data: ProjectMarginCoverage }) {
  const { locale } = useI18n();
  const copy = (en: string, ru: string, he: string) => locale === "ru" ? ru : locale === "he" ? he : en;
  if (data.pricing_mode !== "FACTORY" || projectMarginDataRisk(data) === 0) return null;
  return <p className="mt-1 text-xs leading-4 text-status-problem-fg">
    {copy("Works without earnings", "Работы без начислений", "עבודות ללא שכר")}: {data.unrecorded_completed_works ?? 0}.
    {" "}{copy("Additional work without a client plan", "Допработы без клиентского плана", "עבודות נוספות ללא תוכנית לקוח")}: {data.missing_addon_plans_facts}.
  </p>;
}
