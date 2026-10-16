import { useI18n, useCopy } from "@/lib/i18n";

export type OrderFinancialCoverage = {
  pricing_mode?: "LEGACY" | "FACTORY";
  incomplete_orders?: number;
  total?: number;
};

export function OrderFinancialBasis({ data, shown }: { data?: OrderFinancialCoverage; shown?: number }) {
  const { locale } = useI18n();
  const copy = useCopy();
  if (data?.pricing_mode !== "FACTORY") return null;
  return <div role="status" className="min-w-0 space-y-1 px-3 py-2 text-xs text-text-secondary">
    <p>{copy(
      "Numbered doors only, excluding add-ons. Progress uses current door status; earnings use recorded movements including cancellations. Revenue uses the saved client price, or the current price when absent. Project and order membership use current door records.",
      "Только двери с номером заказа, без допработ. Готовность определяется текущими статусами; начисления берутся из журнала с учётом отмен. Выручка рассчитана по сохранённой цене клиента, при её отсутствии по текущей. Привязка к объекту и заказу соответствует текущим данным дверей.",
      "דלתות עם מספר הזמנה בלבד, ללא תוספות. ההתקדמות לפי מצב הדלת הנוכחי; השכר לפי תנועות רשומות כולל ביטולים. ההכנסה לפי מחיר הלקוח השמור, או המחיר הנוכחי כשאין מחיר שמור. השיוך לפרויקט ולהזמנה לפי רישומי הדלתות הנוכחיים.")}</p>
    {(data.incomplete_orders ?? 0) > 0 && <p className="text-status-warning-fg">{copy(
      "Orders with incomplete finances", "Заказы с неполными финансовыми данными", "הזמנות עם נתונים כספיים חסרים")}: {data.incomplete_orders}.
      {" "}{copy("Includes orders outside this page; unknown profit is not ranked.",
        "Включая заказы вне этой страницы; неизвестная прибыль не участвует в рейтинге.",
        "כולל הזמנות מחוץ לעמוד זה; רווח לא ידוע אינו מדורג.")}</p>}
    {shown !== undefined && data.total !== undefined && <p>{copy("Orders shown", "Показано заказов", "הזמנות מוצגות")}: {shown} / {data.total}.</p>}
  </div>;
}
