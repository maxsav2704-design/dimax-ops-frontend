"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, RefreshCcw, ShieldAlert } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { WorkPriceProposalForm } from "@/components/operations/WorkPriceProposalForm";
import { useAuthSession } from "@/hooks/use-auth-session";
import { canAccessAdminModule } from "@/lib/admin-access";
import { apiFetch } from "@/lib/api";
import { onAuthChanged } from "@/lib/auth-session";
import { readableApiError } from "@/lib/api-error-display";
import { useI18n } from "@/lib/i18n";

const explanations = {
  EXECUTION_TIME_CORRECTION: ["Execution time was verified separately. The original device record will be retained.", "Дата работы проверена отдельно. Исходная запись телефона будет сохранена.", "מועד הביצוע נבדק בנפרד. הרשומה המקורית מהמכשיר תישמר."],
  ASSIGNMENT_EVIDENCE_REQUIRED: ["The server cannot verify assignment at the reported execution time.", "Сервер не может подтвердить назначение монтажника на указанную дату работы.", "השרת אינו יכול לאמת את שיוך המתקין במועד הביצוע המדווח."],
  HISTORICAL_PRICE_REVIEW: ["Work arrived after a price change. Verify execution evidence before using the old price.", "Работа получена после смены прайса. Для прежней цены нужно проверить подтверждение даты выполнения.", "העבודה התקבלה לאחר שינוי מחירון. יש לאמת את מועד הביצוע לפני שימוש במחיר הקודם."],
  LEGACY_EXECUTION_REVIEW: ["The device reports work before factory pricing began. Verify it before applying the first confirmed price list.", "Телефон указал работу до включения заводского прайса. Проверьте её перед применением первого подтверждённого прайса.", "המכשיר מדווח על עבודה לפני הפעלת מחירון המפעל. יש לאמת אותה לפני החלת המחירון המאושר הראשון."],
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
  ORIGINAL_PRICE_UNAVAILABLE: ["The original version has no matching work and unit. Quantity needs separate review.", "В исходной версии нет соответствующей работы с той же единицей. Количество требует отдельной проверки.", "בגרסה המקורית אין עבודה תואמת באותה יחידה. הכמות דורשת בדיקה נפרדת."],
} as const;

type ExecutionCorrection = { performed_at: string; evidence_reference: string };

const utcOffsets = Array.from({ length: 105 }, (_, index) => {
  const minutes = index * 15 - 720;
  return `${minutes < 0 ? "-" : "+"}${String(Math.floor(Math.abs(minutes) / 60)).padStart(2, "0")}:${String(Math.abs(minutes) % 60).padStart(2, "0")}`;
});

function correctionTime(value: string, offset: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) || !utcOffsets.includes(offset)) return null;
  const wallTime = new Date(`${value}:00Z`);
  if (!Number.isFinite(wallTime.getTime()) || wallTime.toISOString().slice(0, 16) !== value) return null;
  return new Date(`${value}:00${offset}`).toISOString();
}

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
  resolution_available: boolean;
  requires_execution_evidence?: boolean;
  time_correction_available?: boolean;
  execution_correction?: ExecutionCorrection | null;
  review_token: string | null;
  missing_price?: null | {
    price_list_id: string;
    version: number;
    kind: "DOOR" | "ADDON";
    target_id: string;
    performed_at: string;
    effective_from: string;
    selection: "AT_EXECUTION" | "FIRST_CONFIRMED_LEGACY";
  };
  applicable_quote: null | {
    version: number;
    rate: string;
    unit: string;
    currency: string;
    effective_from: string;
    selection: "AT_EXECUTION" | "FIRST_CONFIRMED_LEGACY";
  };
};

type ResolutionRequest = {
  request_id: string;
  review_token: string;
  reason: string;
  confirm_execution_evidence?: boolean;
  execution_correction?: ExecutionCorrection;
};

export function PriceConflictReviewDialog({ source, itemId, onClose }: {
  source: "sync_event" | "sync_queue";
  itemId: string;
  onClose: () => void;
}) {
  const { locale } = useI18n();
  const session = useAuthSession();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [executionTime, setExecutionTime] = useState("");
  const [utcOffset, setUtcOffset] = useState("");
  const [evidenceReference, setEvidenceReference] = useState("");
  const [correction, setCorrection] = useState<ExecutionCorrection | null>(null);
  const attempt = useRef<ResolutionRequest | null>(null);
  const [sessionChanged, setSessionChanged] = useState(false);
  const allowed = !sessionChanged && canAccessAdminModule(session, "price-lists");
  const canResolve = allowed && (session?.admin_scope === "OWNER" || session?.admin_scope === "OPERATIONS");
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
    refetchOnWindowFocus: false,
  });
  const correctionQuery = useQuery({
    queryKey: ["price-conflict-execution-review", source, itemId, correction],
    queryFn: ({ signal }) => apiFetch<Review>(`/api/v1/admin/sync/price-conflicts/${source}/${encodeURIComponent(itemId)}/execution-review`, {
      method: "POST", body: JSON.stringify(correction), signal,
    }),
    enabled: canResolve && !!correction && !!query.data?.time_correction_available && !query.isError,
    retry: false, gcTime: 0, staleTime: 0, refetchOnWindowFocus: false,
  });
  const resolution = useMutation({
    mutationFn: (body: ResolutionRequest) => apiFetch<{
      id: string; completed_work_id: string; amount: string; resolved_at: string;
    }>(`/api/v1/admin/sync/price-conflicts/${source}/${encodeURIComponent(itemId)}/resolve`, {
      method: "POST", body: JSON.stringify(body),
    }),
    retry: false,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["operations-sync-problems"] });
      void queryClient.invalidateQueries({ queryKey: ["operations-sync-health"] });
      void queryClient.invalidateQueries({ queryKey: ["earnings-ledger"] });
    },
  });
  // Do not display a previous response after permission loss or a failed recheck.
  const review = allowed && !query.isError
    ? (canResolve && correction && !correctionQuery.isError && !correctionQuery.isFetching ? correctionQuery.data : query.data)
    : undefined;
  const { reset: resetResolution } = resolution;
  useEffect(() => {
    setReason(""); setExecutionTime(""); setUtcOffset(""); setEvidenceReference("");
    setCorrection(null); resetResolution();
  }, [source, itemId, resetResolution]);
  useEffect(() => {
    setCorrection(null);
  }, [query.dataUpdatedAt]);
  useEffect(() => {
    setConfirmed(false);
    attempt.current = null;
  }, [source, itemId, review?.review_token]);
  const invalidateCorrection = () => {
    setCorrection(null); setConfirmed(false); attempt.current = null;
    resolution.reset();
  };
  const proposedTime = correctionTime(executionTime, utcOffset);
  const quote = review?.applicable_quote;
  const missingPrice = review?.analysis_code === "MISSING_FACTORY_PRICE" ? review.missing_price : null;
  const submit = () => {
    if (!canResolve || !review?.resolution_available || !review.review_token || !confirmed
      || reason.trim().length < 10 || query.isFetching || (correction && correctionQuery.isFetching)
      || resolution.isPending || resolution.isSuccess) return;
    // Keep the same key after an uncertain network outcome so retry cannot accrue twice.
    if (!attempt.current || attempt.current.review_token !== review.review_token || attempt.current.reason !== reason.trim()) {
      attempt.current = { request_id: crypto.randomUUID(), review_token: review.review_token, reason: reason.trim(),
        ...(review.requires_execution_evidence ? { confirm_execution_evidence: true } : {}),
        ...(review.execution_correction ? { execution_correction: review.execution_correction } : {}) };
    }
    resolution.mutate(attempt.current);
  };
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
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto p-4 sm:p-6" dir={locale === "he" ? "rtl" : "ltr"}
        closeLabel={copy("Close", "Закрыть", "סגירה")}>
        <DialogHeader className="pe-8 text-start">
          <DialogTitle>{copy("Price conflict review", "Разбор конфликта цены", "בדיקת התנגשות מחיר")}</DialogTitle>
          <DialogDescription>{resolution.isSuccess
            ? copy("The decision and original work are retained in the audit log.", "Решение и исходная работа сохранены в журнале действий.", "ההחלטה והעבודה המקורית נשמרו ביומן הביקורת.")
            : resolution.isPending
              ? copy("Checking and recording the decision.", "Проверяем и сохраняем решение.", "בודק ושומר את ההחלטה.")
            : resolution.isError
              ? copy("The result is not confirmed. Do not create duplicate work.", "Результат не подтверждён. Не создавайте повторную работу.", "התוצאה טרם אושרה. אין ליצור עבודה כפולה.")
            : copy("Original work retained. No earnings have been changed.", "Исходная работа сохранена. Начисления не изменены.", "העבודה המקורית נשמרה. לא שונו סכומי השכר.")}</DialogDescription>
        </DialogHeader>
        {!allowed ? <p role="alert">{copy("Rate access is required.", "Нужен доступ к расценкам.", "נדרשת הרשאה לצפייה במחירים.")}</p> : resolution.isSuccess ? (
          <div role="status" className="space-y-3 py-4">
            <CheckCircle2 className="h-6 w-6 text-status-ok-fg" />
            <h3 className="text-base font-semibold">{copy("Work recorded", "Работа учтена", "העבודה נרשמה")}</h3>
            <p className="text-sm">{copy("Accrued: ", "Начислено: ", "נזקף לשכר: ")}{resolution.data.amount} ILS</p>
            <p className="text-xs text-text-secondary">{copy("The updated mobile app will receive acknowledgement on its next sync.",
              "Обновлённое мобильное приложение получит подтверждение при следующей синхронизации.", "האפליקציה המעודכנת תקבל אישור בסנכרון הבא.")}</p>
            <p className="break-all text-xs text-text-secondary">{copy("Decision: ", "Решение: ", "החלטה: ")}{resolution.data.id}</p>
          </div>
        ) : query.isPending ? (
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
              {field(copy("Applicable confirmed version", "Применимый подтверждённый прайс", "המחירון המאושר המתאים"),
                quote ? `v${quote.version}` : missingPrice ? `v${missingPrice.version}` : null)}
            </dl>
            {review.analysis_code === "MISSING_FACTORY_PRICE" && (
              <section className="space-y-2 border-t border-border pt-3" aria-labelledby="missing-factory-price-title">
                <h3 id="missing-factory-price-title" className="text-sm font-semibold">{copy(
                  "Separate factory approval required", "Нужно отдельное подтверждение завода", "נדרש אישור נפרד מהמפעל")}</h3>
                <p className="text-sm leading-5">{copy(
                  "Work is retained without earnings. A later price list does not price this work retroactively; a factory decision for this specific work is required.",
                  "Работа сохранена без начисления. Более поздний прайс не задаёт ей цену задним числом: нужно решение завода именно по этой работе.",
                  "העבודה נשמרה ללא זקיפת שכר. מחירון מאוחר יותר אינו קובע לה מחיר בדיעבד; נדרשת החלטת מפעל לעבודה המסוימת הזאת.")}</p>
                {missingPrice && <dl className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                  {field(copy("Price selection", "Основание выбора прайса", "בסיס בחירת המחירון"), missingPrice.selection === "FIRST_CONFIRMED_LEGACY"
                    ? copy("First factory-confirmed list (legacy work)", "Первый подтверждённый прайс (старая очередь)", "המחירון המאושר הראשון (תור ישן)")
                    : copy("Price list effective at execution", "Прайс, действовавший при выполнении", "המחירון שהיה בתוקף בעת הביצוע"))}
                  {field(copy("Date used for price selection", "Дата для выбора прайса", "המועד ששימש לבחירת המחירון"), date(missingPrice.performed_at))}
                </dl>}
                <p className="text-xs leading-5 text-text-secondary">{copy(
                  "No approval request has been sent from this review. A saved price proposal is not factory confirmation. Keep the original queue entry.",
                  "Из этого окна запрос не отправлялся. Сохранённое предложение цены не является подтверждением завода. Сохраните исходную запись в очереди.",
                  "לא נשלחה בקשת אישור מחלון זה. הצעת מחיר שמורה אינה אישור מפעל. יש לשמור את הרשומה המקורית בתור.")}</p>
                {canResolve && missingPrice && <WorkPriceProposalForm
                  key={`${source}:${itemId}:${JSON.stringify(review.execution_correction ?? null)}`}
                  source={source} itemId={itemId} correction={review.execution_correction} />}
              </section>
            )}
            {canResolve && query.data?.time_correction_available && (
              <form className="space-y-3 border-t border-border pt-3" onSubmit={(event) => {
                event.preventDefault();
                if (!proposedTime || evidenceReference.trim().length < 10 || resolution.isPending || correctionQuery.isFetching) return;
                setConfirmed(false); attempt.current = null;
                const next = { performed_at: proposedTime, evidence_reference: evidenceReference.trim() };
                if (correction?.performed_at === next.performed_at && correction.evidence_reference === next.evidence_reference) {
                  void correctionQuery.refetch();
                } else setCorrection(next);
              }}>
                <h3 className="text-sm font-semibold">{copy("Verified execution time", "Проверенная дата работы", "מועד ביצוע מאומת")}</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="space-y-1 text-sm" htmlFor="execution-time">
                    <span>{copy("Date and time", "Дата и время", "תאריך ושעה")}</span>
                    <Input id="execution-time" type="datetime-local" step="60" value={executionTime} required dir="ltr"
                      disabled={resolution.isPending} onChange={(event) => { setExecutionTime(event.target.value); invalidateCorrection(); }} />
                  </label>
                  <div className="space-y-1 text-sm">
                    <label htmlFor="execution-offset">{copy("UTC offset at execution", "Смещение UTC на дату работы", "הפרש UTC במועד הביצוע")}</label>
                    <select id="execution-offset" value={utcOffset} required dir="ltr" disabled={resolution.isPending}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onChange={(event) => { setUtcOffset(event.target.value); invalidateCorrection(); }}>
                      <option value="">{copy("Select offset", "Выберите смещение", "בחירת הפרש")}</option>
                      {utcOffsets.map((offset) => <option key={offset} value={offset}>UTC{offset}</option>)}
                    </select>
                  </div>
                </div>
                <label className="block space-y-1 text-sm" htmlFor="execution-evidence">
                  <span>{copy("Evidence reference", "Подтверждающий документ / запись", "אסמכתא לראיות")}</span>
                  <Textarea id="execution-evidence" value={evidenceReference} minLength={10} maxLength={500} required
                    disabled={resolution.isPending} onChange={(event) => { setEvidenceReference(event.target.value); invalidateCorrection(); }} />
                </label>
                <Button type="submit" variant="outline" disabled={!proposedTime || evidenceReference.trim().length < 10 || resolution.isPending || correctionQuery.isFetching}>
                  <RefreshCcw className="me-2 h-4 w-4" />{copy("Check corrected date", "Проверить исправленную дату", "בדיקת המועד המתוקן")}
                </Button>
                {correction && correctionQuery.isFetching && <p role="status" className="text-sm">{copy("Checking evidence...", "Проверяем сведения...", "בודק ראיות...")}</p>}
                {correction && correctionQuery.isError && <p role="alert" className="text-sm text-status-problem-fg">{readableApiError(correctionQuery.error, locale,
                  copy("Unable to verify the corrected date.", "Не удалось проверить исправленную дату.", "לא ניתן לאמת את המועד המתוקן."))}</p>}
              </form>
            )}
            {review.execution_correction && (
              <dl className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                {field(copy("Execution time for this decision", "Дата работы для этого решения", "מועד ביצוע להחלטה זו"), date(review.execution_correction.performed_at))}
                {field(copy("Evidence reference", "Подтверждающий документ / запись", "אסמכתא לראיות"), review.execution_correction.evidence_reference)}
              </dl>
            )}
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
                {missingPrice && <>
                  {field(copy("Price list missing the rate", "Прайс без нужной ставки", "המחירון שחסר בו התעריף"), missingPrice.price_list_id)}
                  {field(copy("Work type ID", "ID типа работы", "מזהה סוג העבודה"), missingPrice.target_id)}
                </>}
              </dl>
            </details>
            {canResolve && review.resolution_available && review.review_token && quote && (
              <form className="space-y-3 border-t border-border pt-3" onSubmit={(event) => { event.preventDefault(); submit(); }}>
                <h3 className="text-sm font-semibold">{copy("Accept execution-time price", "Принять цену на момент выполнения", "אישור המחיר במועד הביצוע")}</h3>
                <label className="block space-y-1 text-sm" htmlFor="price-decision-reason">
                  <span>{copy("Decision reason", "Причина решения", "נימוק להחלטה")}</span>
                  <Textarea id="price-decision-reason" value={reason} onChange={(event) => setReason(event.target.value)}
                    minLength={10} maxLength={500} required disabled={resolution.isPending} />
                </label>
                <label className="flex items-start gap-2 text-sm" htmlFor="price-decision-confirm">
                  <Checkbox id="price-decision-confirm" checked={confirmed} disabled={resolution.isPending}
                    onCheckedChange={(value) => setConfirmed(value === true)} className="mt-0.5" />
                  <span>{review.requires_execution_evidence ? copy(
                    "I verified execution time and installer assignment using evidence independent of the device clock, and described it in the reason.",
                    "Я проверил дату работы и назначение монтажника по подтверждению, независимому от часов телефона, и описал его в причине решения.",
                    "אימתתי את מועד הביצוע ואת שיוך המתקין לפי ראיות שאינן שעון המכשיר, ותיארתי אותן בנימוק.") : copy("I checked the installer, work, quantity and execution time.",
                    "Я проверил монтажника, работу, количество и время выполнения.", "בדקתי את המתקין, העבודה, הכמות ומועד הביצוע.")}</span>
                </label>
                {resolution.isError && <div className="space-y-2">
                  <p role="alert" className="text-sm text-status-problem-fg">{(resolution.error as { status?: number }).status === 409
                    ? copy("Work or price conditions changed. Check again before applying a decision.",
                      "Условия работы или цены изменились. Повторите проверку перед решением.", "תנאי העבודה או המחיר השתנו. יש לבדוק שוב לפני אישור ההחלטה.")
                    : readableApiError(resolution.error, locale, copy("The decision was not confirmed. Retry with the same details or check the queue.",
                      "Решение не подтверждено. Повторите с теми же данными или проверьте очередь.", "ההחלטה לא אושרה. נסו שוב עם אותם פרטים או בדקו את התור."))}</p>
                  <Button type="button" variant="outline" disabled={query.isFetching} onClick={() => {
                    invalidateCorrection(); void query.refetch();
                  }}><RefreshCcw className="me-2 h-4 w-4" />{copy("Check again", "Проверить снова", "בדיקה חוזרת")}</Button>
                </div>}
                <Button type="submit" disabled={!confirmed || reason.trim().length < 10 || query.isFetching || resolution.isPending}>
                  <CheckCircle2 className="me-2 h-4 w-4" />{resolution.isPending
                    ? copy("Recording...", "Сохраняем...", "שומר...")
                    : copy("Record work: ", "Учесть работу: ", "רישום עבודה: ") + `${review.preview_amount} ILS`}
                </Button>
              </form>
            )}
          </>
        ) : null}
        <div className="flex justify-end"><Button variant="outline" onClick={onClose}>{copy("Close review", "Закрыть проверку", "סגירת הבדיקה")}</Button></div>
      </DialogContent>
    </Dialog>
  );
}
