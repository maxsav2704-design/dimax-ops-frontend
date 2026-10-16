"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ClipboardCheck, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import { readableApiError } from "@/lib/api-error-display";
import { useI18n, useCopy } from "@/lib/i18n";

type Accrual = { id: string; completed_work_id: string; amount: string; accrued_at: string; reason: string };
type Review = { approval_hash: string; reference: string; rate: string; amount: string; currency: string;
  confirmed_name: string; confirmed_at: string; accrual: Accrual | null;
  scope: { project_name: string; installer_name: string; work_label: string; quantity: string; unit: string;
    missing_price: { performed_at: string } } };
type Request = { request_id: string; approval_hash: string; reason: string; confirm_accrual: true };

export function WorkPriceAccrual({ approvalId }: { approvalId: string }) {
  const { locale } = useI18n();
  const c = useCopy();
  const client = useQueryClient();
  const [opened, setOpened] = useState(false);
  const [reason, setReason] = useState("");
  const [consent, setConsent] = useState(false);
  const attempt = useRef<{ fingerprint: string; body: Request } | null>(null);
  const path = `/api/v1/admin/sync/work-price-approvals/${encodeURIComponent(approvalId)}/accrual`;
  const key = ["work-price-accrual", approvalId];
  const review = useQuery({ queryKey: key, queryFn: ({ signal }) => apiFetch<Review>(path, { signal }), enabled: opened,
    retry: false, gcTime: 0, refetchOnWindowFocus: false });
  const save = useMutation({ mutationFn: (body: Request) => apiFetch<Accrual>(path, { method: "POST", body: JSON.stringify(body) }),
    retry: false, onSuccess: (accrual) => {
      attempt.current = null; setConsent(false);
      client.setQueryData<Review>(key, old => old ? { ...old, accrual } : old);
      for (const queryKey of ["operations-sync-problems", "operations-sync-health", "earnings-ledger"]) {
        void client.invalidateQueries({ queryKey: [queryKey] });
      }
    } });
  const data = review.data;
  const accrued = save.data ?? data?.accrual;
  const busy = review.isFetching || save.isPending;
  const ready = !!data && !review.isError && !busy && !accrued;
  const date = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  if (!opened) return <Button type="button" variant="outline" className="h-auto min-h-10 whitespace-normal text-start" onClick={() => setOpened(true)}>
    <ClipboardCheck className="me-2 size-4 shrink-0" />{c("Review accrual", "Проверить начисление", "בדיקת זקיפת שכר")}</Button>;
  return <section className="space-y-3 border-t border-border pt-3 text-sm" aria-label={c("Accrual", "Начисление", "זקיפת שכר")}>
    <h4 className="font-semibold">{c("Accrual", "Начисление", "זקיפת שכר")}</h4>
    {busy && <p role="status">{c("Please wait...", "Подождите...", "נא להמתין...")}</p>}
    {data && <>
      <dl className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-x-3 gap-y-2 [&>dd]:break-words [&>dt]:text-text-secondary">
        <dt>{c("Project", "Объект", "פרויקט")}</dt><dd>{data.scope.project_name}</dd>
        <dt>{c("Installer", "Монтажник", "מתקין")}</dt><dd>{data.scope.installer_name}</dd>
        <dt>{c("Work", "Работа", "עבודה")}</dt><dd>{data.scope.work_label}<br /><bdi>{data.reference}</bdi></dd>
        <dt>{c("Performed", "Выполнено", "בוצע")}</dt><dd>{date(data.scope.missing_price.performed_at)}</dd>
        <dt>{c("Quantity", "Количество", "כמות")}</dt><dd><bdi>{data.scope.quantity} {data.scope.unit}</bdi></dd>
        <dt>{c("Factory decision", "Подтверждение завода", "אישור המפעל")}</dt><dd>{data.confirmed_name}<br />{date(data.confirmed_at)}</dd>
        <dt>{c("Calculation", "Расчёт", "חישוב")}</dt><dd className="font-semibold tabular-nums"><bdi>{data.scope.quantity} × {data.rate} = {data.amount} {data.currency}</bdi></dd>
      </dl>
      {accrued ? <div role="status" className="space-y-1 border-s-2 border-status-success-fg ps-3">
        <p className="flex items-center gap-2 font-semibold"><CheckCircle2 className="size-4 shrink-0" />{c("Accrual recorded", "Начисление записано", "זקיפת השכר נרשמה")}</p>
        <p>{date(accrued.accrued_at)}</p><p className="break-words">{accrued.reason}</p>
      </div> : <>
        <label className="block space-y-1">{c("Accrual reason", "Основание начисления", "נימוק לזקיפת השכר")}
          <Textarea value={reason} maxLength={500} disabled={busy} onChange={event => { setReason(event.target.value); setConsent(false); }} /></label>
        <label className="flex items-start gap-2 leading-5"><input type="checkbox" className="mt-1 size-4 shrink-0" checked={consent}
          disabled={!ready} onChange={event => setConsent(event.target.checked)} />
          {c("I checked the work and factory decision. Accrue this amount to this installer.",
            "Работа и подтверждение завода проверены. Начислить эту сумму указанному монтажнику.",
            "בדקתי את העבודה ואת אישור המפעל. יש לזקוף סכום זה למתקין המצוין.")}</label>
        <Button type="button" className="h-auto min-h-10 whitespace-normal text-start" disabled={!ready || !consent || reason.trim().length < 10}
          onClick={() => {
            if (!ready || !consent || !data || reason.trim().length < 10) return;
            const values = { approval_hash: data.approval_hash, reason: reason.trim(), confirm_accrual: true as const };
            const fingerprint = JSON.stringify(values);
            if (attempt.current?.fingerprint !== fingerprint) attempt.current = { fingerprint, body: { ...values, request_id: crypto.randomUUID() } };
            save.mutate(attempt.current.body);
          }}><CheckCircle2 className="me-2 size-4 shrink-0" />{c("Confirm accrual", "Подтвердить начисление", "אישור זקיפת השכר")}</Button>
      </>}
    </>}
    {[review.error, save.error].filter(Boolean).map((error, index) => <p key={index} role="alert" className="break-words text-status-problem-fg">
      {readableApiError(error, locale, c("Accrual was not confirmed. Check the result before retrying.",
        "Начисление не подтверждено. Проверьте результат перед повтором.", "זקיפת השכר לא אושרה. בדקו את התוצאה לפני ניסיון נוסף."))}</p>)}
    <Button type="button" variant="outline" disabled={busy} onClick={() => { setConsent(false); save.reset(); void review.refetch(); }}>
      <RefreshCcw className="me-2 size-4" />{c("Check accrual", "Проверить результат", "בדיקת התוצאה")}</Button>
  </section>;
}
