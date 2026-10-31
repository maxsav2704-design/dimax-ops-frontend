import type { Locale } from "@/lib/locale";
import { pickLocale } from "@/lib/locale";

type Triple = { en: string; ru: string; he: string };

// The server names why a billing write was refused (409 meta.reason); the office reads the reason, not a generic text.
const REASONS: Record<string, Triple> = {
  EXCEEDS_OVERPAYMENT: {
    en: "The refund is larger than the overpayment: money that still covers open packages or the opening balance is not returned.",
    ru: "Возврат больше переплаты: деньги, которые ещё покрывают открытые предъявления или входящий остаток, не возвращаются.",
    he: "ההחזר גדול מהתשלום העודף: כסף שעדיין מכסה הגשות פתוחות או יתרת פתיחה אינו מוחזר.",
  },
  EXCEEDS_AVAILABLE: {
    en: "The amount is larger than what is still unallocated on this payment.",
    ru: "Сумма больше, чем осталось нераспределённым в этом платеже.",
    he: "הסכום גדול ממה שנותר לא מוקצה בתשלום זה.",
  },
  PRESENTED_WORK: {
    en: "The date falls inside work already presented or reserved in a package. Choose a later date; a price difference for presented work is settled in the reconciliation.",
    ru: "Дата попадает в работы, уже предъявленные заводу или зарезервированные в пакете. Выберите дату позже; разница в цене за предъявленные работы решается в сверке.",
    he: "התאריך נופל בתוך עבודות שכבר הוגשו למפעל או שוריינו בחבילה. יש לבחור תאריך מאוחר יותר; הפרש מחיר לעבודות שהוגשו מוסדר בהתאמה.",
  },
  NOTHING_TO_CLAIM: {
    en: "Nothing left to present for this period.",
    ru: "За этот период предъявлять больше нечего.",
    he: "אין מה להגיש עוד לתקופה זו.",
  },
  ALREADY_CLAIMED: {
    en: "Another package reserved some of this work meanwhile. Refresh the period.",
    ru: "Часть этих работ тем временем зарезервировал другой пакет. Обновите период.",
    he: "חבילה אחרת שריינה בינתיים חלק מהעבודות. יש לרענן את התקופה.",
  },
  RECONCILED: {
    en: "This version carries settlement decisions (write-off, retention, release or allocated money); re-decide them first.",
    ru: "У этой версии есть решения по расчётам (списание, удержание, освобождение или распределённые деньги); сначала пересмотрите их.",
    he: "לגרסה זו יש החלטות התחשבנות (מחיקה, עיכבון, שחרור או כסף שהוקצה); יש להחליט עליהן מחדש קודם.",
  },
  MULTIPLE_CONTRACTS: {
    en: "Two contracts are in effect for this period; billing is blocked until only one is.",
    ru: "В этом периоде действуют два договора; расчёт заблокирован, пока не останется один.",
    he: "בתקופה זו בתוקף שני חוזים; החיוב חסום עד שיישאר אחד.",
  },
  PAYLOAD_MISMATCH: {
    en: "The proposal changed since it was opened. Refresh and review it again.",
    ru: "Предложение изменилось после открытия. Обновите и проверьте его снова.",
    he: "ההצעה השתנתה מאז שנפתחה. יש לרענן ולבדוק שוב.",
  },
};

/** The readable reason of a refused billing write, or null when the server gave none we know. */
export function conflictReasonText(meta: Record<string, unknown> | null | undefined, locale: Locale): string | null {
  const reason = meta?.reason;
  return typeof reason === "string" && REASONS[reason] ? pickLocale(locale, REASONS[reason].en, REASONS[reason].ru, REASONS[reason].he) : null;
}
