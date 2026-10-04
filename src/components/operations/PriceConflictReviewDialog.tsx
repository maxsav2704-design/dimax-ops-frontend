"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { RefreshCcw, ShieldAlert } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuthSession } from "@/hooks/use-auth-session";
import { canAccessAdminModule } from "@/lib/admin-access";
import { apiFetch } from "@/lib/api";
import { onAuthChanged } from "@/lib/auth-session";
import { readableApiError } from "@/lib/api-error-display";
import { useI18n } from "@/lib/i18n";

const explanations = {
  VERSION_MISMATCH: ["The recorded version differs from the execution-time price.", "Версия в команде отличается от цены на момент выполнения.", "הגרסה שנרשמה שונה מהמחיר במועד הביצוע."],
  VERSION_MATCH: ["The versions match now. Other work conditions still need review.", "Сейчас версии совпадают. Остальные условия работы ещё нужно проверить.", "הגרסאות תואמות כעת. עדיין נדרשת בדיקת יתר תנאי העבודה."],
  NO_VERSION: ["The original command has no price version.", "В исходной команде нет версии прайса.", "בפקודה המקורית אין גרסת מחירון."],
  INVALID_VERSION: ["The original price version is invalid.", "Некорректная версия прайса в исходной команде.", "גרסת המחירון בפקודה המקורית אינה תקינה."],
  MISSING_EXECUTION_TIME: ["Execution time is missing. Receipt time cannot replace it.", "Нет времени выполнения. Дата получения не может его заменить.", "מועד הביצוע חסר. מועד הקבלה אינו תחליף."],
  INVALID_EXECUTION_TIME: ["Execution time needs verification.", "Время выполнения требует проверки.", "מועד הביצוע דורש בדיקה."],
  NO_ACTIVE_FACTORY_PRICES: ["Factory pricing has not been activated.", "Подтверждённые заводом цены ещё не введены в действие.", "התמחור המאושר טרם הופעל."],
  MISSING_FACTORY_PRICE: ["The applicable version has no price for this work.", "В действовавшей версии нет цены для этой работы.", "בגרסה המתאימה אין מחיר לעבודה זו."],
  INVALID_FACTORY_EVIDENCE: ["Factory approval or the price timeline could not be verified.", "Не удалось проверить подтверждение завода или историю действия цен.", "לא ניתן לאמת את אישור המפעל או את היסטוריית המחירים."],
  WORK_UNAVAILABLE: ["The project or work type is unavailable.", "Объект или тип работы недоступен.", "הפרויקט או סוג העבודה אינם זמינים."],
  INVALID_QUANTITY: ["The recorded quantity cannot be used for a calculation.", "Записанное количество нельзя использовать для расчёта.", "לא ניתן לחשב לפי הכמות שנרשמה."],
  UNSUPPORTED_WORK: ["This command needs a separate technical review.", "Эта команда требует отдельной технической проверки.", "פקודה זו דורשת בדיקה טכנית נפרדת."],
  CATALOG_UNIT_CHANGED: ["The catalog unit differs from the confirmed price unit.", "Единица в справочнике отличается от единицы подтверждённой цены.", "יחידת הקטלוג שונה מיחידת המחיר המאושר."],
} as const;

type Review = {
  id: string;
  project_name: string | null;
  installer_name: string | null;
  work_label: string | null;
  performed_at: string | null;
  received_at: string;
  quantity: string | null;
  seen_price_list_id: string | null;
  seen_version: number | null;
  seen_version_status: "MISSING" | "INVALID" | "UNAVAILABLE" | "AVAILABLE";
  analysis_code: keyof typeof explanations;
  preview_amount: string | null;
  applicable_quote: null | {
    version: number;
    rate: string;
    unit: string;
    currency: string;
    effective_from: string;
    selection: "AT_EXECUTION" | "FIRST_CONFIRMED_LEGACY";
  };
};

export function PriceConflictReviewDialog({ source, itemId, onClose }: {
  source: "sync_event" | "sync_queue";
  itemId: string;
  onClose: () => void;
}) {
  const { locale } = useI18n();
  const session = useAuthSession();
  const [sessionChanged, setSessionChanged] = useState(false);
  const allowed = !sessionChanged && canAccessAdminModule(session, "price-lists");
  useEffect(() => onAuthChanged(() => {
    setSessionChanged(true);
    onClose();
  }), [onClose]);
  const language = locale === "ru" ? 1 : locale === "he" ? 2 : 0;
  const copy = (en: string, ru: string, he: string) => [en, ru, he][language];
  const query = useQuery({
    queryKey: ["price-conflict-review", source, itemId],
    queryFn: ({ signal }) => apiFetch<Review>(`/api/v1/admin/sync/price-conflicts/${source}/${encodeURIComponent(itemId)}`, { signal }),
    enabled: allowed,
    retry: false,
    gcTime: 0,
    staleTime: 0,
  });
  // Do not display a previous response after permission loss or a failed recheck.
  const review = allowed && !query.isError ? query.data : undefined;
  const quote = review?.applicable_quote;
  const date = (value: string | null) => value
    ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "long" }).format(new Date(value))
    : copy("Not recorded", "Не записано", "לא נרשם");
  const field = (label: string, value: string | number | null) => (
    <div className="min-w-0 border-b border-border-subtle py-2">
      <dt className="text-xs text-text-secondary">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-text" dir="auto">{value ?? copy("Unavailable", "Недоступно", "לא זמין")}</dd>
    </div>
  );
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-xl p-4 sm:p-6" dir={locale === "he" ? "rtl" : "ltr"}
        closeLabel={copy("Close", "Закрыть", "סגירה")}>
        <DialogHeader className="pe-8 text-start">
          <DialogTitle>{copy("Price conflict review", "Разбор конфликта цены", "בדיקת התנגשות מחיר")}</DialogTitle>
          <DialogDescription>{copy("Original work retained. No earnings have been changed.", "Исходная работа сохранена. Начисления не изменены.", "העבודה המקורית נשמרה. לא שונו סכומי השכר.")}</DialogDescription>
        </DialogHeader>
        {!allowed ? <p role="alert">{copy("Rate access is required.", "Нужен доступ к расценкам.", "נדרשת הרשאה לצפייה במחירים.")}</p> : query.isPending ? (
          <p role="status" className="text-sm text-text-secondary">{copy("Checking price history...", "Проверка истории цен...", "בודק היסטוריית מחירים...")}</p>
        ) : query.isError ? (
          <div role="alert" className="space-y-3 text-sm text-status-problem-fg">
            <p>{readableApiError(query.error, locale, copy("Unable to load the review.", "Не удалось загрузить проверку.", "לא ניתן לטעון את הבדיקה."))}</p>
            <Button variant="outline" onClick={() => void query.refetch()} disabled={query.isFetching}>
              <RefreshCcw className="me-2 h-4 w-4" />{copy("Check again", "Проверить снова", "בדיקה חוזרת")}
            </Button>
          </div>
        ) : review ? (
          <>
            <div className="flex items-start gap-2 border-s-2 border-status-warning-border bg-status-warning-bg p-3 text-sm text-status-warning-fg" role="status">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{explanations[review.analysis_code]?.[language] ?? copy("Manual review required.", "Нужна ручная проверка.", "נדרשת בדיקה ידנית.")}</p>
            </div>
            <dl className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
              {field(copy("Project", "Объект", "פרויקט"), review.project_name)}
              {field(copy("Installer", "Монтажник", "מתקין"), review.installer_name)}
              {field(copy("Work", "Работа", "עבודה"), review.work_label)}
              {field(copy("Quantity", "Количество", "כמות"), review.quantity)}
              {field(copy("Executed (device time)", "Выполнено (время устройства)", "בוצע (זמן המכשיר)"), date(review.performed_at))}
              {field(copy("Received by server", "Получено сервером", "התקבל בשרת"), date(review.received_at))}
              {field(copy("Version in original command", "Версия в исходной команде", "גרסה בפקודה המקורית"),
                review.seen_version != null ? `v${review.seen_version}` : review.seen_version_status === "MISSING"
                  ? copy("Not recorded", "Не записана", "לא נרשמה") : copy("Unverified", "Не проверена", "לא אומתה"))}
              {field(copy("Confirmed version at execution", "Подтверждённая версия на дату работы", "גרסה מאושרת במועד הביצוע"), quote ? `v${quote.version}` : null)}
            </dl>
            {quote && (
              <section className="space-y-2 border-t border-border pt-3">
                <h3 className="text-sm font-semibold">{copy("Calculation for review, not accrued", "Расчёт для проверки, не начисление", "חישוב לבדיקה, לא זיכוי בשכר")}</h3>
                <dl className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                  {field(copy("Confirmed rate", "Подтверждённая ставка", "תעריף מאושר"), `${quote.rate} ${quote.currency} / ${quote.unit}`)}
                  {field(copy("Calculated amount", "Расчётная сумма", "סכום מחושב"), review.preview_amount == null ? null : `${review.preview_amount} ${quote.currency}`)}
                </dl>
                <p className="text-xs leading-5 text-text-secondary">{quote.selection === "FIRST_CONFIRMED_LEGACY"
                  ? copy("Legacy work: first factory-confirmed price list.", "Старая очередь: первый подтверждённый заводом прайс.", "תור ישן: המחירון הראשון שאושר במפעל.")
                  : copy("Price effective from: ", "Цена действует с: ", "המחיר בתוקף מתאריך: ") + date(quote.effective_from)}</p>
              </section>
            )}
            <p className="text-xs leading-5 text-text-secondary">{copy(
              "Comparison uses the current catalog work type and recorded execution time. Assignment, work status and original price evidence still require review. Cold resync does not settle this conflict.",
              "Сравнение использует текущий тип работы из справочника и записанное время выполнения. Назначение, статус работы и исходные сведения о цене ещё требуют проверки. Сброс синхронизации этот конфликт не разрешает.",
              "ההשוואה משתמשת בסוג העבודה הנוכחי בקטלוג ובמועד הביצוע שנרשם. עדיין יש לבדוק שיוך, מצב עבודה וראיות מחיר מקוריות. איפוס סנכרון אינו פותר התנגשות זו.")}</p>
            <details className="min-w-0 text-xs text-text-secondary">
              <summary className="cursor-pointer py-2">{copy("Original identifiers", "Исходные идентификаторы", "מזהים מקוריים")}</summary>
              <dl className="min-w-0">
                {field(copy("Command", "Команда", "פקודה"), review.id)}
                {field(copy("Price list in command", "Прайс в команде", "מחירון בפקודה"), review.seen_price_list_id)}
              </dl>
            </details>
          </>
        ) : null}
        <div className="flex justify-end"><Button variant="outline" onClick={onClose}>{copy("Close review", "Закрыть проверку", "סגירת הבדיקה")}</Button></div>
      </DialogContent>
    </Dialog>
  );
}
