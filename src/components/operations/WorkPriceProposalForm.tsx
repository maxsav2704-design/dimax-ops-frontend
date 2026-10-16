"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { FilePlus2, RefreshCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import { readableApiError } from "@/lib/api-error-display";
import { useI18n, useCopy } from "@/lib/i18n";
import { proposalAmount, proposalRate } from "@/lib/work-price-proposal";
import { WorkPriceInvitation } from "./WorkPriceInvitation";

type Correction = { performed_at: string; evidence_reference: string };
type Proposal = { id: string; version: number; rate: string; amount: string; created_at: string; snapshot_hash?: string };
type Preparation = {
  review_token: string;
  scope: { quantity: string; unit: string; work_label: string; project_name: string; installer_name: string;
    missing_price: { performed_at: string } };
  latest: Proposal | null;
};
type Request = { request_id: string; review_token: string; rate: string; reason: string;
  agreement_reference: string; execution_evidence: string; confirm_execution_evidence: true;
  execution_correction: Correction | null };

export function WorkPriceProposalForm({ source, itemId, correction = null }: {
  source: "sync_event" | "sync_queue"; itemId: string; correction?: Correction | null;
}) {
  const { locale } = useI18n();
  const copy = useCopy();
  const [opened, setOpened] = useState(false);
  const [rate, setRate] = useState("");
  const [reason, setReason] = useState("");
  const [agreement, setAgreement] = useState("");
  const [evidence, setEvidence] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const attempt = useRef<{ fingerprint: string; body: Request } | null>(null);
  const path = `/api/v1/admin/sync/price-conflicts/${source}/${encodeURIComponent(itemId)}/work-price-proposals`;
  const query = useQuery({
    queryKey: ["work-price-proposal", source, itemId, correction],
    queryFn: ({ signal }) => apiFetch<Preparation>(path + "/review", {
      method: "POST", body: JSON.stringify({ execution_correction: correction }), signal,
    }),
    enabled: opened, retry: false, gcTime: 0, staleTime: 0, refetchOnWindowFocus: false,
  });
  const save = useMutation({
    mutationFn: (body: Request) => apiFetch<Proposal>(path, { method: "POST", body: JSON.stringify(body) }), retry: false,
  });
  const prepared = !query.isError && !query.isFetching ? query.data : undefined;
  const normalized = proposalRate(rate);
  const amount = prepared ? proposalAmount(rate, prepared.scope.quantity) : null;
  const valid = prepared && normalized && amount && confirmed && reason.trim().length >= 10
    && agreement.trim().length >= 10 && evidence.trim().length >= 10 && !save.isPending;
  const saved = save.data ?? prepared?.latest;
  const recheck = () => {
    setConfirmed(false); attempt.current = null; save.reset(); void query.refetch();
  };
  if (!opened) return <Button type="button" variant="outline" className="h-auto min-h-10 whitespace-normal text-start" onClick={() => setOpened(true)}>
    <FilePlus2 className="me-2 h-4 w-4 shrink-0" />{copy("Prepare a price proposal", "Подготовить предложение цены", "הכנת הצעת מחיר")}
  </Button>;
  return <section className="min-w-0 space-y-3 border-t border-border pt-3" aria-labelledby="work-price-proposal-title">
    <h3 id="work-price-proposal-title" className="text-sm font-semibold">{copy("Price for this work only", "Цена только за эту работу", "מחיר לעבודה הזאת בלבד")}</h3>
    <p className="text-xs leading-5 text-text-secondary">{copy(
      "Saving terms does not send a factory request or record earnings. Factory confirmation is separate. The company price list stays unchanged.",
      "Сохранение условий не отправляет запрос и не создаёт начисление. Согласование с заводом выполняется отдельно. Общий прайс не меняется.",
      "שמירת התנאים אינה שולחת בקשה למפעל ואינה זוקפת שכר. אישור המפעל נפרד. המחירון הכללי אינו משתנה.")}</p>
    {query.isFetching && <p role="status" className="text-sm">{copy("Checking the retained work...", "Проверяем сохранённую работу...", "בודק את העבודה שנשמרה...")}</p>}
    {query.isError && <div className="space-y-2">
      <p role="alert" className="text-sm text-status-problem-fg">{readableApiError(query.error, locale,
        copy("Unable to prepare this work. Check its assignment, date and status.", "Нельзя подготовить эту работу. Проверьте назначение, дату и статус.", "לא ניתן להכין עבודה זו. יש לבדוק שיוך, מועד ומצב."))}</p>
      <Button type="button" variant="outline" onClick={recheck}><RefreshCcw className="me-2 h-4 w-4" />{copy("Check again", "Проверить снова", "בדיקה חוזרת")}</Button>
    </div>}
    {saved && <div role="status" className="space-y-1 border-s-2 border-status-warning-border ps-3 text-sm">
      <p className="font-medium">{copy("Proposed terms saved", "Предложенные условия сохранены", "התנאים המוצעים נשמרו")} · v{saved.version}</p>
      <p dir="ltr">{saved.rate} ILS → {saved.amount} ILS</p>
      <p className="break-all text-xs text-text-secondary">{saved.id}</p>
    </div>}
    {saved?.snapshot_hash && <WorkPriceInvitation key={saved.id} proposalId={saved.id} proposalHash={saved.snapshot_hash} />}
    {save.isSuccess ? <Button type="button" variant="outline" onClick={recheck}>
      <FilePlus2 className="me-2 h-4 w-4" />{copy("Prepare a new version", "Подготовить новую версию", "הכנת גרסה חדשה")}
    </Button> : prepared && <form className="min-w-0 space-y-3" onSubmit={(event) => {
      event.preventDefault();
      if (!valid || !normalized || !prepared) return;
      const values = { review_token: prepared.review_token, rate: normalized, reason: reason.trim(),
        agreement_reference: agreement.trim(), execution_evidence: evidence.trim(),
        confirm_execution_evidence: true as const, execution_correction: correction };
      const fingerprint = JSON.stringify(values);
      if (attempt.current?.fingerprint !== fingerprint) attempt.current = { fingerprint, body: { ...values, request_id: crypto.randomUUID() } };
      save.mutate(attempt.current.body);
    }}>
      <p className="break-words text-sm">{prepared.scope.project_name} · {prepared.scope.work_label} · {prepared.scope.installer_name}</p>
      <p className="text-xs text-text-secondary">{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "long" }).format(new Date(prepared.scope.missing_price.performed_at))}</p>
      <label className="block space-y-1 text-sm" htmlFor="work-proposed-rate">
        <span>{copy("Proposed rate", "Предлагаемая ставка", "תעריף מוצע")} (ILS / {prepared.scope.unit})</span>
        <Input id="work-proposed-rate" inputMode="decimal" dir="ltr" value={rate} maxLength={13} required
          disabled={save.isPending} onChange={(event) => { setRate(event.target.value); setConfirmed(false); }} />
      </label>
      <p className="break-words text-sm" aria-live="polite">{copy("Proposed total (not accrued): ", "Предлагаемая сумма (не начислено): ", "סכום מוצע (טרם נזקף לשכר): ")}
        <span dir="ltr">{amount ? `${prepared.scope.quantity} × ${normalized} = ${amount} ILS` : "-"}</span>
      </p>
      {([
        ["work-proposal-reason", copy("Reason", "Причина", "נימוק"), reason, setReason],
        ["work-proposal-agreement", copy("Factory request / agreement reference", "Запрос / договорённость с заводом", "אסמכתא לבקשה / להסכמה עם המפעל"), agreement, setAgreement],
        ["work-proposal-evidence", copy("Execution and assignment evidence", "Подтверждение выполнения и назначения", "ראיות לביצוע ולשיוך המתקין"), evidence, setEvidence],
      ] as const).map(([id, title, value, setter]) => <label key={id} className="block space-y-1 text-sm" htmlFor={id}>
        <span>{title}</span><Textarea id={id} value={value} minLength={10} maxLength={500} required disabled={save.isPending}
          onChange={(event) => { setter(event.target.value); setConfirmed(false); }} />
      </label>)}
      <label className="flex items-start gap-2 text-sm" htmlFor="work-proposal-confirm">
        <Checkbox id="work-proposal-confirm" checked={confirmed} disabled={save.isPending} className="mt-0.5"
          onCheckedChange={(value) => setConfirmed(value === true)} />
        <span>{copy("I verified the work, quantity, execution date and installer assignment using independent evidence.",
          "Я проверил работу, количество, дату выполнения и назначение монтажника по независимому подтверждению.",
          "אימתתי את העבודה, הכמות, מועד הביצוע ושיוך המתקין באמצעות ראיות עצמאיות.")}</span>
      </label>
      {save.isError && <div className="space-y-2">
        <p role="alert" className="text-sm text-status-problem-fg">{(save.error as { status?: number }).status === 409
          ? copy("The work or proposal changed. Check again before saving.", "Работа или предложение изменились. Повторите проверку перед сохранением.", "העבודה או ההצעה השתנו. יש לבדוק שוב לפני שמירה.")
          : readableApiError(save.error, locale, copy("Saving is not confirmed. Retry with the same details.", "Сохранение не подтверждено. Повторите с теми же данными.", "השמירה לא אושרה. נסו שוב עם אותם פרטים."))}</p>
        <Button type="button" variant="outline" onClick={recheck}><RefreshCcw className="me-2 h-4 w-4" />{copy("Check again", "Проверить снова", "בדיקה חוזרת")}</Button>
      </div>}
      <Button type="submit" disabled={!valid} className="h-auto min-h-10 whitespace-normal text-start">
        <Save className="me-2 h-4 w-4 shrink-0" />{save.isPending ? copy("Saving...", "Сохраняем...", "שומר...")
          : copy("Save proposal, without accrual", "Сохранить предложение без начисления", "שמירת הצעה ללא זקיפת שכר")}
      </Button>
    </form>}
  </section>;
}
