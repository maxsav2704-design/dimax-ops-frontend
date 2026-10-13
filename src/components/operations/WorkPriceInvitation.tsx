"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Mail, RefreshCcw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { readableApiError } from "@/lib/api-error-display";
import { useI18n } from "@/lib/i18n";

type Contact = { id: string; factory_name: string; recipient_name: string; recipient_email: string };
type Invitation = { id: string; recipient_name: string; recipient_email: string; expires_at: string;
  revoked_at: string | null; confirmed_at: string | null; confirmed_name: string | null; email_outbox_id: string };
type SendRequest = { request_id: string; factory_contact_id: string; proposal_hash: string; expires_in_hours: number };

export function WorkPriceInvitation({ proposalId, proposalHash }: { proposalId: string; proposalHash: string }) {
  const { locale } = useI18n();
  const c = (en: string, ru: string, he: string) => locale === "ru" ? ru : locale === "he" ? he : en;
  const [opened, setOpened] = useState(false);
  const [consent, setConsent] = useState(false);
  const [hours, setHours] = useState(72);
  const [reason, setReason] = useState("");
  const attempt = useRef<{ fingerprint: string; body: SendRequest } | null>(null);
  const path = `/api/v1/admin/sync/work-price-proposals/${encodeURIComponent(proposalId)}/invitations`;
  const contact = useQuery({ queryKey: ["work-price-contact", proposalId], queryFn: ({ signal }) =>
    apiFetch<Contact | null>("/api/v1/admin/price-lists/factory/contact", { signal }), enabled: opened,
    retry: false, gcTime: 0, refetchOnWindowFocus: false });
  const history = useQuery({ queryKey: ["work-price-invitations", proposalId], queryFn: ({ signal }) =>
    apiFetch<{ items: Invitation[]; total: number }>(path, { signal }), enabled: opened,
    retry: false, gcTime: 0, refetchOnWindowFocus: false });
  const refresh = () => { setConsent(false); void contact.refetch(); void history.refetch(); };
  const send = useMutation({ mutationFn: (body: SendRequest) => apiFetch<Invitation>(path, { method: "POST", body: JSON.stringify(body) }),
    retry: false, onSuccess: () => { attempt.current = null; refresh(); } });
  const revoke = useMutation({ mutationFn: (id: string) => apiFetch<Invitation>(`${path}/${encodeURIComponent(id)}/revoke`,
    { method: "POST", body: JSON.stringify({ reason: reason.trim() }) }), retry: false,
    onSuccess: () => { setReason(""); refresh(); } });
  const latest = history.data?.items[0];
  const confirmed = !!latest?.confirmed_at;
  const pending = latest && !latest.revoked_at && !latest.confirmed_at && Date.parse(latest.expires_at) > Date.now();
  const busy = send.isPending || revoke.isPending || contact.isFetching || history.isFetching;
  const ready = !!contact.data && !!history.data && !contact.isError && !history.isError && !busy;
  const date = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  if (!opened) return <Button type="button" variant="outline" className="h-auto min-h-10 whitespace-normal text-start" onClick={() => setOpened(true)}>
    <Mail className="me-2 size-4 shrink-0" />{c("Factory confirmation", "Согласование с заводом", "אישור המפעל")}
  </Button>;
  return <section className="space-y-3 border-t border-border pt-3 text-sm" aria-label={c("Factory invitation", "Приглашение заводу", "הזמנה למפעל")}>
    <h4 className="font-semibold">{c("Factory confirmation", "Согласование с заводом", "אישור המפעל")}</h4>
    <p className="text-xs leading-5 text-text-secondary">{c("Confirmation is separate from accrual. No earnings or price-list changes are made here.",
      "Подтверждение отдельно от начисления. Заработок и общий прайс здесь не меняются.", "האישור נפרד מזקיפת שכר. השכר והמחירון הכללי אינם משתנים כאן.")}</p>
    {busy && <p role="status">{c("Please wait...", "Подождите...", "נא להמתין...")}</p>}
    {contact.data && <p className="break-words">{contact.data.factory_name} · {contact.data.recipient_name}<br />
      <bdi>{contact.data.recipient_email}</bdi></p>}
    {contact.isSuccess && !contact.data && <p role="alert">{c("The owner must approve a factory contact in Price lists first.",
      "Сначала OWNER должен утвердить контакт завода в разделе прайсов.", "תחילה על הבעלים לאשר איש קשר של המפעל במחירונים.")}</p>}
    {latest && <div role="status" className="space-y-1 border-s-2 border-border ps-3">
      <p className="font-medium">{confirmed ? c("Factory confirmed; not accrued", "Завод подтвердил; не начислено", "אושר במפעל; טרם נזקף לשכר")
        : latest.revoked_at ? c("Invitation revoked", "Приглашение отозвано", "ההזמנה בוטלה")
        : pending ? c("Invitation created; check delivery in Operations", "Приглашение создано; доставка в разделе операций", "ההזמנה נוצרה; מצב המשלוח במסך התפעול")
        : c("Invitation expired", "Срок приглашения истёк", "תוקף ההזמנה פג")}</p>
      <p className="break-words">{latest.recipient_name} · <bdi>{latest.recipient_email}</bdi></p>
      <p>{confirmed ? `${latest.confirmed_name} · ${date(latest.confirmed_at!)}` : date(latest.expires_at)}</p>
    </div>}
    {!confirmed && <>
      <label className="flex flex-wrap items-center gap-2">{c("Link lifetime", "Срок ссылки", "תוקף הקישור")}
        <select aria-label={c("Link lifetime", "Срок ссылки", "תוקף הקישור")} className="rounded-md border border-border bg-surface px-2 py-2"
          value={hours} disabled={busy} onChange={(event) => { setHours(Number(event.target.value)); setConsent(false); }}>
          {[24, 72, 168].map(value => <option key={value} value={value}>{value} {c("hours", "ч", "שעות")}</option>)}
        </select>
      </label>
      <label className="flex items-start gap-2 leading-5"><input type="checkbox" className="mt-1 size-4 shrink-0" checked={consent}
        disabled={!ready} onChange={event => setConsent(event.target.checked)} />
        {c("Send this version to the owner-approved contact. A new invitation replaces the previous link.",
          "Отправить эту версию утверждённому контакту. Новое приглашение заменит предыдущую ссылку.",
          "שליחת גרסה זו לאיש הקשר שאושר על ידי הבעלים. הזמנה חדשה מחליפה את הקישור הקודם.")}</label>
      <Button type="button" disabled={!ready || !consent} className="h-auto min-h-10 whitespace-normal text-start" onClick={() => {
        if (!contact.data || !ready || !consent) return;
        const values = { factory_contact_id: contact.data.id, proposal_hash: proposalHash, expires_in_hours: hours };
        const fingerprint = JSON.stringify(values);
        if (attempt.current?.fingerprint !== fingerprint) attempt.current = { fingerprint, body: { ...values, request_id: crypto.randomUUID() } };
        send.mutate(attempt.current.body);
      }}><Mail className="me-2 size-4 shrink-0" />{c("Send invitation by email", "Отправить приглашение на почту", "שליחת הזמנה בדוא״ל")}</Button>
    </>}
    {pending && <div className="space-y-2"><label className="block space-y-1">{c("Reason for revocation", "Причина отзыва", "סיבת הביטול")}
      <Input value={reason} maxLength={500} disabled={busy} onChange={event => setReason(event.target.value)} /></label>
      <Button type="button" variant="outline" disabled={busy || reason.trim().length < 10} onClick={() => revoke.mutate(latest.id)}>
        <XCircle className="me-2 size-4" />{c("Revoke invitation", "Отозвать приглашение", "ביטול הזמנה")}</Button>
    </div>}
    {[contact.error, history.error, send.error, revoke.error].filter(Boolean).map((error, index) => <p key={index} role="alert" className="break-words text-status-problem-fg">
      {readableApiError(error, locale, c("Action not confirmed. Check the result before retrying. Delivery requires a configured email service and public HTTPS address.",
        "Действие не подтверждено. Проверьте результат перед повтором. Для отправки нужны настроенная почта и публичный HTTPS-адрес.",
        "הפעולה לא אושרה. בדקו את התוצאה לפני ניסיון נוסף. המשלוח דורש שירות דוא״ל וכתובת HTTPS ציבורית."))}</p>)}
    <Button type="button" variant="outline" disabled={busy} onClick={refresh}><RefreshCcw className="me-2 size-4" />
      {c("Check status", "Проверить статус", "בדיקת מצב")}</Button>
  </section>;
}
