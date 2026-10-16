import { useI18n, useCopy } from "@/lib/i18n";
import { installerFinancialDataRisk, type InstallerFinancialCoverage, type InstallerMatrixCoverage } from "@/lib/installer-financials";

export function InstallerFinancialBasis({ data, period = false }: { data?: InstallerMatrixCoverage; period?: boolean }) {
  const { locale } = useI18n();
  const copy = useCopy();
  if (data?.pricing_mode !== "FACTORY") return null;
  return <div role="status" className="min-w-0 space-y-1 px-3 py-2 text-xs text-text-secondary">
    <p>{period ? copy(
      "Door installations only, by completion date and recorded performer. Cancelled work is excluded, including later cancellations. This is not a payroll movement statement. Revenue uses the saved client price, or the current door price when no snapshot exists.",
      "Только монтаж дверей: по дате выполнения и фактическому исполнителю. Отменённые работы исключены, в том числе при более поздней отмене. Это не ведомость движений начислений. Выручка использует сохранённую цену клиента. При отсутствии снимка используется текущая цена двери.",
      "התקנות דלתות בלבד, לפי מועד הביצוע והמבצע הרשום. עבודות שבוטלו אינן נכללות, גם אם בוטלו מאוחר יותר. זה אינו דוח תנועות שכר. ההכנסה מבוססת על מחיר הלקוח השמור, או על מחיר הדלת הנוכחי כשאין צילום מחיר.") : copy("Completed work and net earnings belong to the recorded performer. Open issues belong to the current assignee. Revenue uses current client prices.",
      "Работы и начисления с учётом отмен остаются у фактического исполнителя. Открытые проблемы относятся к текущему ответственному. Выручка рассчитана по текущим ценам клиента.",
      "עבודות ושכר לאחר ביטולים משויכים למבצע הרשום. תקלות פתוחות משויכות למתקין האחראי כיום. ההכנסה מחושבת לפי מחירי הלקוח הנוכחיים.")}</p>
    {(data.incomplete_items ?? 0) > 0 && <p className="text-status-warning-fg">{copy("Incomplete financial rows", "Строки с неполными финансовыми данными", "שורות עם נתונים כספיים חסרים")}: {data.incomplete_items}.
      {" "}{copy("Includes rows outside this page; unknown profit is not ranked.",
        "Включая строки вне этой страницы; неизвестная прибыль не участвует в рейтинге.",
        "כולל שורות מחוץ לעמוד זה; רווח לא ידוע אינו מדורג.")}</p>}
    {(data.unassigned_completed_works ?? 0) > 0 && <p className="text-status-warning-fg">{copy("Unrecorded works without an installer", "Работы без начисления и без монтажника", "עבודות ללא רישום שכר וללא מתקין")}: {data.unassigned_completed_works}.</p>}
  </div>;
}

export function InstallerFinancialNotice({ data }: { data: InstallerFinancialCoverage }) {
  const { locale } = useI18n();
  const copy = useCopy();
  if (data.pricing_mode !== "FACTORY" || installerFinancialDataRisk(data) === 0) return null;
  return <p className="mt-1 text-xs leading-4 text-status-warning-fg">
    {copy("Works without earnings", "Работы без начислений", "עבודות ללא שכר")}: {data.unrecorded_completed_works ?? 0}.
    {" "}{copy("Works without a client price", "Работы без цены клиента", "עבודות ללא מחיר לקוח")}: {data.missing_client_prices ?? 0}.
  </p>;
}

export function InstallerFinancialBand({ band }: { band: string }) {
  const { locale } = useI18n();
  const labels: Record<string, [string, string, string]> = {
    INCOMPLETE: ["Incomplete", "Неполные данные", "נתונים חסרים"],
    STRONG: ["Strong", "Высокий результат", "תוצאה גבוהה"],
    WATCH: ["Watch", "Требует внимания", "דורש מעקב"],
    RISK: ["Risk", "Риск", "סיכון"],
  };
  const label = labels[band];
  return <>{label ? label[locale === "ru" ? 1 : locale === "he" ? 2 : 0] : band}</>;
}
