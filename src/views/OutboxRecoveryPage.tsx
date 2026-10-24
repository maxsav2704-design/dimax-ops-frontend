"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { ChevronLeft, ChevronRight, FileCheck2, History, Mail, Play, RefreshCw, ShieldCheck } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { DimaxPageHeader } from "@/components/DimaxPageHeader";
import { InlineNotice } from "@/components/dimax";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuthSession } from "@/hooks/use-auth-session";
import { apiFetch } from "@/lib/api";
import { onAuthChanged } from "@/lib/auth-session";
import { useCopy, useI18n } from "@/lib/i18n";
import {
  fetchRecoveryRows, providerAcceptedAt, recoveryDecisionSchema, recoveryPageSize,
  recoveryPath, recoveryStatusSchema, recoveryUtcOffsets,
  type RecoveryAction, type RecoveryRequest, type RecoveryRow,
} from "@/lib/outbox-recovery";

function useRecoveryLabels() {
  const copy = useCopy();
  return {
    HOLD: copy("On hold", "На удержании", "בהמתנה לבירור"),
    RETRY: copy("Retry authorized", "Повтор разрешён", "שליחה חוזרת אושרה"),
    ACCEPTED: copy("Accepted by provider", "Принято провайдером", "התקבל אצל הספק"),
    unresolved: copy("Needs review", "Требует сверки", "נדרשת בדיקה"),
  };
}

function DecisionForm({ row, busy, uncertain, onSubmit }: {
  row: RecoveryRow; busy: boolean; uncertain: boolean;
  onSubmit: (body: RecoveryRequest) => void;
}) {
  const copy = useCopy();
  const labels = useRecoveryLabels();
  const [action, setAction] = useState<RecoveryAction>("HOLD");
  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState("");
  const [time, setTime] = useState("");
  const [offset, setOffset] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const attempt = useRef<RecoveryRequest | null>(null);
  const accepted = action === "ACCEPTED" ? providerAcceptedAt(time, offset) : null;
  const valid = reason.trim() && evidence.trim() && confirmed && (action !== "ACCEPTED" || accepted);
  return <form className="space-y-4" onSubmit={event => {
    event.preventDefault();
    if (busy || (!attempt.current && !valid)) return;
    attempt.current ??= {
      request_id: crypto.randomUUID(), expected_revision: row.revision, action,
      reason: reason.trim(), evidence: evidence.trim(), accepted_at: accepted,
    };
    onSubmit(attempt.current);
  }}>
    <fieldset disabled={busy || uncertain} className="space-y-4">
      <label className="block space-y-1 text-13">
        <span>{copy("Decision", "Решение", "החלטה")}</span>
        <select className="h-10 w-full rounded-md border border-border bg-surface px-3" value={action}
          onChange={event => { setAction(event.target.value as RecoveryAction); setConfirmed(false); }}>
          <option value="HOLD">{labels.HOLD}</option><option value="RETRY">{labels.RETRY}</option><option value="ACCEPTED">{labels.ACCEPTED}</option>
        </select>
      </label>
      <InlineNotice tone="warning">{action === "HOLD"
        ? copy("This message will remain blocked, even after the queue is released.", "Это письмо останется заблокированным и после возобновления очереди.", "הודעה זו תישאר חסומה גם לאחר חידוש התור.")
        : action === "RETRY"
          ? copy("Another delivery attempt will be allowed. Scheduled messages keep their date.", "Будет разрешена ещё одна попытка отправки. Запланированные письма сохранят свою дату.", "יותר ניסיון שליחה נוסף. הודעות מתוזמנות ישמרו על מועדן.")
          : copy("Provider acceptance is not confirmation of reading, signing or factory approval.", "Принятие провайдером не подтверждает прочтение, подпись или согласование заводом.", "קבלה אצל הספק אינה אישור קריאה, חתימה או אישור מפעל.")}</InlineNotice>
      <label className="block space-y-1 text-13"><span>{copy("Reason", "Основание решения", "נימוק")}</span>
        <Textarea value={reason} maxLength={1000} required onChange={event => setReason(event.target.value)} /></label>
      <label className="block space-y-1 text-13"><span>{copy("Evidence reference", "Ссылка на подтверждение", "אסמכתה")}</span>
        <Input value={evidence} maxLength={1000} required onChange={event => setEvidence(event.target.value)} /></label>
      {action === "ACCEPTED" && <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1 text-13"><span>{copy("Provider acceptance time", "Время принятия провайдером", "מועד הקבלה אצל הספק")}</span>
          <Input type="datetime-local" dir="ltr" value={time} required onChange={event => setTime(event.target.value)} /></label>
        <label className="block space-y-1 text-13"><span>{copy("UTC offset", "Смещение UTC", "הפרש מ-UTC")}</span>
          <select dir="ltr" value={offset} required className="h-10 w-full rounded-md border border-border bg-surface px-3" onChange={event => setOffset(event.target.value)}>
            <option value="">{copy("Select", "Выберите", "בחירה")}</option>
            {recoveryUtcOffsets.map(value => <option key={value} value={value}>UTC{value}</option>)}
          </select></label>
        {time && !accepted && <p role="status" className="text-12 text-status-problem-fg sm:col-span-2">{copy("A valid time, timezone and a date not in the future are required.", "Нужны корректное время, часовой пояс и дата не в будущем.", "נדרשים מועד תקין, אזור זמן ותאריך שאינו בעתיד.")}</p>}
      </div>}
      <label className="flex items-start gap-2 text-13"><input type="checkbox" checked={confirmed} className="mt-1 accent-accent" onChange={event => setConfirmed(event.target.checked)} />
        <span>{copy("I checked the message, recipient and evidence.", "Я проверил письмо, получателя и подтверждение.", "בדקתי את ההודעה, הנמען והאסמכתה.")}</span></label>
    </fieldset>
    <DialogFooter><Button type="submit" disabled={busy || (!uncertain && !valid)} className="h-auto min-h-10 whitespace-normal py-2">
      <FileCheck2 aria-hidden />{uncertain ? copy("Retry the same decision", "Повторить то же решение", "ניסיון חוזר לאותה החלטה") : copy("Record decision", "Зафиксировать решение", "שמירת החלטה")}
    </Button></DialogFooter>
  </form>;
}

export default function OutboxRecoveryPage() {
  const copy = useCopy();
  const { locale } = useI18n();
  const labels = useRecoveryLabels();
  const session = useAuthSession();
  const client = useQueryClient();
  const instance = useId();
  const [sessionChanged, setSessionChanged] = useState(false);
  const active = useRef(true);
  const allowed = !sessionChanged && session?.role === "ADMIN" && ["OWNER", "OPERATIONS"].includes(session.admin_scope ?? "");
  const owner = allowed && session?.admin_scope === "OWNER";
  const [tab, setTab] = useState<"items" | "history">("items");
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<RecoveryRow | null>(null);
  const [command, setCommand] = useState<"begin" | "release" | null>(null);
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [notice, setNotice] = useState("");
  const keys = ["outbox-recovery", instance];
  useEffect(() => onAuthChanged(() => {
    active.current = false;
    setSessionChanged(true);
    setSelected(null);
    setCommand(null);
    void client.cancelQueries({ queryKey: ["outbox-recovery", instance] });
    client.removeQueries({ queryKey: ["outbox-recovery", instance] });
  }), [client, instance]);
  const status = useQuery({
    queryKey: [...keys, "status"],
    queryFn: ({ signal }) => apiFetch(recoveryPath, { signal }, { schema: recoveryStatusSchema }),
    enabled: allowed, retry: false, gcTime: 0, refetchOnWindowFocus: false,
  });
  const current = allowed && !status.isError ? status.data : undefined;
  const hasReview = !!current?.recovery_id && ["REVIEW", "RELEASED"].includes(current.state);
  const items = useQuery({
    queryKey: [...keys, "items", current?.recovery_id, offset],
    queryFn: ({ signal }) => fetchRecoveryRows(current!.recovery_id!, offset, signal),
    enabled: allowed && hasReview && tab === "items", retry: false, gcTime: 0, refetchOnWindowFocus: false,
  });
  const history = useQuery({
    queryKey: [...keys, "history", offset],
    queryFn: ({ signal }) => apiFetch(`${recoveryPath}/decisions?offset=${offset}&limit=${recoveryPageSize}`, { signal }, { schema: z.array(recoveryDecisionSchema) }),
    enabled: allowed && !!current && tab === "history", retry: false, gcTime: 0, refetchOnWindowFocus: false,
  });
  const refresh = () => client.invalidateQueries({ queryKey: keys });
  const mutation = useMutation({
    mutationFn: ({ path, body }: { path: string; body: object }) => apiFetch(path, { method: "POST", body: JSON.stringify(body) }),
    retry: false,
    onSuccess: async () => {
      if (!active.current) return;
      setSelected(null); setCommand(null);
      setNotice(copy("Saved. Queue state has been refreshed.", "Сохранено. Состояние очереди обновлено.", "נשמר. מצב התור עודכן."));
      await refresh();
      await client.invalidateQueries({ predicate: query => query.queryKey.some(key => typeof key === "string" && key.includes("outbox") && key !== "outbox-recovery") });
    },
    onError: () => { if (active.current) void refresh(); },
  });
  const busy = mutation.isPending;
  const code = (mutation.error as { status?: number } | null)?.status;
  const conflict = mutation.isError && [401, 403, 404, 409, 422].includes(code ?? 0);
  const uncertain = mutation.isError && !conflict;
  const queryError = status.error || (tab === "items" ? items.error : history.error);
  const formatDate = (value: string | null) => value ? new Date(value).toLocaleString(locale === "he" ? "he-IL" : locale === "ru" ? "ru-RU" : "en-GB") : "—";
  const pageRows = tab === "items" ? items.data : history.data;
  const loading = tab === "items" ? items.isFetching : history.isFetching;
  const selectedCurrent = selected && selected.recovery_id === current?.recovery_id;
  const canEdit = selected && [null, "HOLD"].includes(selected.action) && selected.message.status !== "SENT";
  const openCommand = (value: "begin" | "release") => {
    mutation.reset(); setReason(""); setConfirmed(false); setCommand(value); setNotice("");
  };

  return <DashboardLayout><div className="page-shell page-stack-tight">
    <DimaxPageHeader title={copy("Mail reconciliation", "Сверка писем", "בדיקת הודעות")}
      breadcrumbs={[{ label: copy("Operations", "Операции", "תפעול"), href: "/operations" }, { label: copy("Recovery", "Восстановление", "שחזור") }]}
      actions={<Button variant="outline" disabled={!allowed || busy || status.isFetching || loading} onClick={() => void refresh()}><RefreshCw aria-hidden />{copy("Refresh", "Обновить", "רענון")}</Button>} />
    {!allowed ? <InlineNotice tone="warning">{sessionChanged
      ? copy("The session changed. Reopen this section before continuing.", "Сессия изменилась. Откройте раздел заново перед продолжением.", "ההתחברות השתנתה. פתחו את המסך מחדש לפני המשך.")
      : copy("Owner or operations access is required.", "Требуется доступ владельца или операционного администратора.", "נדרשת הרשאת בעלים או תפעול.")}</InlineNotice> : <>
      {notice && !queryError && <InlineNotice tone="success" onDismiss={() => setNotice("")}>{notice}</InlineNotice>}
      {queryError && <InlineNotice tone="error">{copy("Reconciliation data could not be refreshed. Refresh the page before continuing; if this repeats, contact the administrator.", "Не удалось обновить данные сверки. Обновите страницу перед продолжением; если ошибка повторяется, обратитесь к администратору.", "לא ניתן לרענן את נתוני הבדיקה. רעננו את העמוד לפני המשך; אם השגיאה חוזרת, פנו למנהל.")}</InlineNotice>}
      {status.isLoading && <p role="status" className="text-13">{copy("Loading queue state…", "Загружаем состояние очереди…", "טוען מצב תור…")}</p>}
      {current && <>
        <section className="border-y border-border py-4" aria-label={copy("Recovery state", "Состояние восстановления", "מצב שחזור")}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <h2 className="flex items-center gap-2 text-16 font-semibold"><ShieldCheck className="size-5 shrink-0 text-accent" aria-hidden />{
                current.state === "RELEASED" ? copy("Queue released", "Очередь возобновлена", "התור חודש") :
                current.state === "NOT_ACTIVATED" ? copy("Recovery mode is not active", "Режим восстановления не включён", "מצב שחזור אינו פעיל") :
                current.state === "CONFIGURATION_REQUIRED" ? copy("Recovery configuration required", "Нужна настройка восстановления", "נדרשת הגדרת שחזור") :
                copy("Delivery is paused", "Отправка приостановлена", "השליחה מושהית")}</h2>
              {hasReview && <p className="text-13 text-text-secondary">{labels.unresolved}: <strong className="text-text">{current.unresolved}</strong> · {labels.HOLD}: <strong className="text-text">{current.held}</strong></p>}
            </div>
            {owner && current.state === "REVIEW_REQUIRED" && <Button disabled={busy || status.isFetching} onClick={() => openCommand("begin")}><FileCheck2 aria-hidden />{copy("Open review", "Открыть сверку", "פתיחת בדיקה")}</Button>}
            {owner && current.state === "REVIEW" && <Button disabled={busy || status.isFetching || current.unresolved > 0} onClick={() => openCommand("release")}><Play aria-hidden />{copy("Resume queue", "Возобновить очередь", "חידוש התור")}</Button>}
          </div>
          {current.state === "NOT_ACTIVATED" && <p className="mt-2 text-13 text-text-secondary">{copy("Normal delivery settings apply. No recovery review is active.", "Действуют обычные настройки отправки. Активной сверки восстановления нет.", "הגדרות השליחה הרגילות בתוקף. אין בדיקת שחזור פעילה.")}</p>}
          {current.state === "CONFIGURATION_REQUIRED" && <p className="mt-2 text-13 text-status-problem-fg">{copy("The API and workers need the same recovery identifier. Contact the deployment administrator.", "API и worker должны использовать один идентификатор восстановления. Нужна проверка администратора развёртывания.", "ה-API וה-workers צריכים מזהה שחזור זהה. נדרשת בדיקת מנהל הפריסה.")}</p>}
          {hasReview && current.held > 0 && <p className="mt-2 text-13 text-text-secondary">{copy("Messages on hold will not be sent.", "Письма на удержании не отправляются.", "הודעות בהמתנה לבירור לא יישלחו.")}</p>}
          {current.epoch && <details className="mt-3 text-12 text-text-secondary"><summary className="cursor-pointer">{copy("Recovery reference", "Идентификатор восстановления", "מזהה שחזור")}</summary><p dir="ltr" className="mt-1 break-all font-mono">{current.epoch}</p></details>}
        </section>
        <div role="tablist" aria-label={copy("Reconciliation views", "Разделы сверки", "תצוגות בדיקה")} className="flex gap-4 border-b border-border">
          {(["items", "history"] as const).map(value => <button type="button" role="tab" aria-selected={tab === value} aria-controls={`recovery-${value}`} id={`recovery-tab-${value}`} key={value}
            tabIndex={tab === value ? 0 : -1} onKeyDown={event => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
              event.preventDefault();
              const next = event.key === "Home" ? "items" : event.key === "End" ? "history" : tab === "items" ? "history" : "items";
              setTab(next); setOffset(0);
              document.getElementById(`recovery-tab-${next}`)?.focus();
            }}
            onClick={() => { setTab(value); setOffset(0); }} className="flex items-center gap-2 border-b-2 border-transparent px-1 py-3 text-13 text-text-secondary aria-selected:border-accent aria-selected:text-text">
            {value === "items" ? <Mail className="size-4" aria-hidden /> : <History className="size-4" aria-hidden />}
            {value === "items" ? copy("Messages", "Письма", "הודעות") : copy("Decision history", "Журнал решений", "יומן החלטות")}</button>)}
        </div>
        <section role="tabpanel" id={`recovery-${tab}`} aria-labelledby={`recovery-tab-${tab}`} className="min-w-0 space-y-3">
          {loading && <p role="status" className="text-13">{copy("Loading…", "Загрузка…", "טוען…")}</p>}
          {tab === "items" && !hasReview && <p className="py-6 text-13 text-text-secondary">{copy("No active review.", "Активной сверки нет.", "אין בדיקה פעילה.")}</p>}
          {!loading && !queryError && (hasReview || tab === "history") && pageRows?.length === 0 && <p className="py-6 text-13 text-text-secondary">{copy("No records on this page.", "На этой странице записей нет.", "אין רשומות בעמוד זה.")}</p>}
          {!queryError && tab === "items" && hasReview && items.data && <div className="overflow-x-auto">
            <table className="w-full text-start text-13 max-sm:block"><caption className="sr-only">{copy("Messages requiring reconciliation", "Письма для сверки", "הודעות לבדיקה")}</caption>
              <thead className="border-b border-border text-12 text-text-secondary max-sm:sr-only"><tr>
                <th scope="col" className="w-1/2 px-3 py-2 text-start font-medium sm:w-auto">{copy("Message / recipient", "Письмо / получатель", "הודעה / נמען")}</th>
                <th scope="col" className="px-3 py-2 text-start font-medium">{copy("Decision", "Решение", "החלטה")}</th>
                <th scope="col" className="w-14 px-2 py-2 text-end font-medium sm:w-auto"><span className="sr-only sm:not-sr-only">{copy("Review", "Сверка", "בדיקה")}</span></th>
              </tr></thead><tbody className="max-sm:block">{items.data.map(row => <tr key={row.id} className="border-b border-border hover:bg-surface-subtle max-sm:grid max-sm:grid-cols-[minmax(0,1fr)_auto]">
                <td className="max-w-72 px-3 py-3 max-sm:col-start-1 max-sm:row-start-1 max-sm:max-w-none max-sm:pb-1"><div className="break-words font-medium">{row.message.subject || copy("No subject", "Без темы", "ללא נושא")}</div>
                  <div dir="auto" className="mt-1 break-all text-12 text-text-secondary">{row.message.recipient || "—"}</div>
                  <div className="mt-1 text-12 text-text-secondary">{row.message.channel === "EMAIL" ? copy("Email", "Почта", "דוא״ל") : "WhatsApp"} · {formatDate(row.message.scheduled_at)}</div></td>
                <td className="break-words px-3 py-3 max-sm:col-start-1 max-sm:row-start-2 max-sm:pt-0"><span className={row.action === "HOLD" || row.action === null ? "text-status-warning-fg" : "text-text-secondary"}>{row.action ? labels[row.action] : labels.unresolved}</span></td>
                <td className="px-2 py-3 text-end max-sm:col-start-2 max-sm:row-span-2 max-sm:row-start-1 max-sm:self-center"><Button variant="outline" size="sm" className="max-sm:h-9 max-sm:w-9 max-sm:p-0" title={copy("Review", "Проверить", "בדיקה")} disabled={busy || status.isFetching || loading} onClick={() => { mutation.reset(); setNotice(""); setSelected(row); }}>
                  <FileCheck2 aria-hidden /><span className="sr-only sm:not-sr-only">{copy("Review", "Проверить", "בדיקה")}</span></Button></td>
              </tr>)}</tbody></table>
          </div>}
          {!queryError && tab === "history" && history.data?.map(entry => <article key={entry.id} className="space-y-2 border-b border-border py-4 text-13">
            <div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold">{labels[entry.action]}</h3><time className="text-12 text-text-secondary" dateTime={entry.created_at}>{formatDate(entry.created_at)}</time></div>
            <p className="whitespace-pre-wrap break-words">{entry.reason}</p><p className="break-words text-text-secondary">{copy("Evidence", "Подтверждение", "אסמכתה")}: {entry.evidence}</p>
            {entry.accepted_at && <p>{copy("Provider accepted", "Принято провайдером", "התקבל אצל הספק")}: {formatDate(entry.accepted_at)}</p>}
            <details className="text-12 text-text-secondary"><summary className="cursor-pointer">{copy("Author and reference", "Автор и идентификатор", "מחבר ומזהה")}</summary>
              <dl className="mt-2 grid gap-1 break-all"><dt>{copy("Author ID", "ID автора", "מזהה מחבר")}</dt><dd dir="ltr">{entry.actor_id}</dd>
                <dt>{copy("Item ID", "ID записи", "מזהה רשומה")}</dt><dd dir="ltr">{entry.item_id}</dd><dt>{copy("Revision", "Версия решения", "גרסת החלטה")}</dt><dd>{entry.revision}</dd></dl></details>
          </article>)}
          {(hasReview || tab === "history") && <nav aria-label={copy("Pages", "Страницы", "עמודים")} className="flex items-center justify-end gap-3 py-3">
            <Button size="icon" variant="outline" aria-label={copy("Previous page", "Предыдущая страница", "עמוד קודם")} title={copy("Previous page", "Предыдущая страница", "עמוד קודם")} disabled={offset === 0 || loading || busy} onClick={() => setOffset(value => Math.max(0, value - recoveryPageSize))}><ChevronLeft className="rtl:rotate-180" /></Button>
            <span className="text-13 tabular-nums">{offset / recoveryPageSize + 1}</span>
            <Button size="icon" variant="outline" aria-label={copy("Next page", "Следующая страница", "עמוד הבא")} title={copy("Next page", "Следующая страница", "עמוד הבא")} disabled={loading || busy || !!queryError || pageRows?.length !== recoveryPageSize} onClick={() => setOffset(value => value + recoveryPageSize)}><ChevronRight className="rtl:rotate-180" /></Button>
          </nav>}
        </section>
      </>}
    </>}
    <Dialog open={allowed && (!!command || !!selectedCurrent)} onOpenChange={open => { if (!open && !busy) { setCommand(null); setSelected(null); mutation.reset(); } }}>
      <DialogContent closeLabel={copy("Close", "Закрыть", "סגירה")} className="flex w-[calc(100%_-_2rem)] max-w-xl flex-col gap-0 overflow-hidden p-0 text-start" onEscapeKeyDown={event => { if (busy) event.preventDefault(); }} onPointerDownOutside={event => { if (busy) event.preventDefault(); }}>
        <DialogHeader className="shrink-0 px-6 pt-6 text-start"><DialogTitle className="pe-7">{command === "begin" ? copy("Open recovery review", "Открыть сверку восстановления", "פתיחת בדיקת שחזור") : command === "release" ? copy("Resume queue", "Возобновить очередь", "חידוש התור") : copy("Message review", "Сверка письма", "בדיקת הודעה")}</DialogTitle>
          <DialogDescription>{command === "release" ? copy("Messages on hold remain blocked. Work, signatures and earnings will not be replayed.", "Письма на удержании останутся заблокированными. Работы, подписи и начисления не повторяются.", "הודעות בהמתנה יישארו חסומות. עבודות, חתימות וצבירות שכר לא יבוצעו שוב.") :
            copy("Decisions are recorded with the administrator and evidence reference.", "Решения сохраняются с автором и ссылкой на подтверждение.", "ההחלטות נשמרות עם המחבר והאסמכתה.")}</DialogDescription></DialogHeader>
        <div className="min-h-0 space-y-4 overflow-y-auto p-6">
        {mutation.isError && <InlineNotice tone="error">{conflict ? copy("The state or permissions changed. Close this window, refresh and review again.", "Состояние или права изменились. Закройте окно, обновите данные и повторите сверку.", "המצב או ההרשאות השתנו. סגרו, רעננו ובדקו מחדש.") :
          copy("The result is not confirmed. Do not create another decision; retry this same request or check the history.", "Результат не подтверждён. Не создавайте другое решение: повторите тот же запрос или проверьте журнал.", "התוצאה לא אושרה. אין ליצור החלטה אחרת; נסו שוב את אותה בקשה או בדקו ביומן.")}</InlineNotice>}
        {selectedCurrent && selected && <>
          <dl className="space-y-1 border-y border-border py-3 text-13"><dt className="font-medium break-words">{selected.message.subject || copy("No subject", "Без темы", "ללא נושא")}</dt>
            <dd dir="auto" className="break-all text-text-secondary">{selected.message.recipient || "—"}</dd><dd className="break-words">{selected.message.attachment_name}</dd>
            <dd dir="ltr" className="break-all font-mono text-12 text-text-secondary">{selected.outbox_id}</dd></dl>
          {canEdit ? <DecisionForm key={selected.id} row={selected} busy={busy || conflict || !current || status.isFetching || items.isError} uncertain={uncertain}
            onSubmit={body => { if (allowed && !busy && !conflict) mutation.mutate({ path: `${recoveryPath}/items/${selected.id}/decisions`, body }); }} /> :
            <InlineNotice tone="info">{copy("This decision is final. The message cannot be replayed through reconciliation.", "Решение окончательное. Повторная отправка через сверку недоступна.", "ההחלטה סופית. לא ניתן לשלוח שוב דרך הבדיקה.")}</InlineNotice>}
        </>}
        {command && <form className="space-y-4" onSubmit={event => {
          event.preventDefault();
          if (!owner || busy || conflict || status.isFetching || !reason.trim() || !confirmed) return;
          if (command === "release" && (current?.state !== "REVIEW" || current.unresolved > 0)) return;
          if (command === "begin" && current?.state !== "REVIEW_REQUIRED") return;
          mutation.mutate({ path: `${recoveryPath}/${command}`, body: { reason: reason.trim() } });
        }}>
          <label className="block space-y-1 text-13"><span>{copy("Reason", "Основание решения", "נימוק")}</span><Textarea required value={reason} maxLength={1000} disabled={busy || conflict} onChange={event => setReason(event.target.value)} /></label>
          <label className="flex items-start gap-2 text-13"><input type="checkbox" className="mt-1 accent-accent" checked={confirmed} disabled={busy || conflict} onChange={event => setConfirmed(event.target.checked)} /><span>{copy("I confirm this recovery action.", "Подтверждаю это действие восстановления.", "אני מאשר את פעולת השחזור.")}</span></label>
          <DialogFooter><Button type="submit" disabled={!owner || busy || conflict || !current || status.isFetching || !reason.trim() || !confirmed || (command === "release" && current?.unresolved !== 0)}><ShieldCheck aria-hidden />{copy("Confirm", "Подтвердить", "אישור")}</Button></DialogFooter>
        </form>}
        </div>
      </DialogContent>
    </Dialog>
    <Link href="/operations" className="inline-flex items-center gap-2 text-13 text-text-secondary hover:text-text"><ChevronLeft className="size-4 rtl:rotate-180" aria-hidden />{copy("Back to operations", "К операциям", "חזרה לתפעול")}</Link>
  </div></DashboardLayout>;
}
