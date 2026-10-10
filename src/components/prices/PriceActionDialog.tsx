"use client";

import { useRef, useState } from "react";
import { Copy, Link2, ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";
import { PRICE_API, isUncertainPriceWrite, priceErrorStatus, priceRequest, type Invitation, type IssuedInvitation, type PriceDetail } from "@/lib/factory-prices";
import { priceCopy } from "./copy";

export type PriceAction = { kind: "invite" | "cancel"; list: PriceDetail } | { kind: "revoke"; list: PriceDetail; invitation: Invitation };

export function PriceActionDialog({ action, onClose, onChanged }: {
  action: PriceAction; onClose: () => void; onChanged: () => void;
}) {
  const { locale, dir } = useI18n();
  const t = priceCopy[locale];
  const invite = action.kind === "invite";
  const title = invite ? t.invite : action.kind === "cancel" ? t.cancel : t.revoke;
  const [factory, setFactory] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [hours, setHours] = useState("72");
  const [sendEmail, setSendEmail] = useState(false);
  const [emailQueued, setEmailQueued] = useState(false);
  const copy = (en: string, ru: string, he: string) => locale === "ru" ? ru : locale === "he" ? he : en;
  const [accepted, setAccepted] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [blocked, setBlocked] = useState(false);
  const [link, setLink] = useState("");
  const [copyResult, setCopyResult] = useState("");
  const lock = useRef(false);
  const valid = invite ? accepted && factory.trim().length >= 2 && name.trim().length >= 2 && email.trim() &&
    /^\d+$/.test(hours) && Number(hours) >= 1 && Number(hours) <= 168 : reason.trim().length > 0;
  let localLink = false;
  try { localLink = ["localhost", "127.0.0.1", "[::1]"].includes(new URL(link).hostname); } catch { /* No issued link yet. */ }

  async function submit() {
    if (lock.current || !valid || blocked || link) return;
    lock.current = true; setBusy(true); setError("");
    const base = `${PRICE_API}/${action.list.id}`;
    try {
      if (invite) {
        const result = await priceRequest<IssuedInvitation>(`${base}/approvals`, {
          factory_name: factory.trim(), recipient_name: name.trim(), recipient_email: email.trim(), expires_in_hours: Number(hours),
          send_email: sendEmail,
        });
        setLink(result.confirmation_url);
        setEmailQueued(Boolean(result.email_outbox_id));
      } else {
        const path = action.kind === "revoke" ? `${base}/approvals/${action.invitation.id}/revoke` : `${base}/cancel`;
        await priceRequest(path, { reason: reason.trim() });
        onClose();
      }
      onChanged();
    } catch (cause) {
      const unknown = isUncertainPriceWrite(cause);
      setError(unknown ? invite ? t.unknownInvite : t.unknownAction : priceErrorStatus(cause) === 403 ? t.denied : priceErrorStatus(cause) === 409 ? t.conflict : invite && sendEmail
        ? copy("Email could not be queued. Check the recipient, public HTTPS address and invitation email configuration.", "Не удалось поставить письмо в очередь. Проверьте получателя, публичный HTTPS-адрес и настройки отправки приглашений.", "לא ניתן להוסיף דוא״ל לתור. יש לבדוק את הנמען, כתובת HTTPS הציבורית והגדרות שליחת ההזמנות.")
        : t.validation);
      setBlocked(unknown || [403, 404, 409].includes(priceErrorStatus(cause)));
      if (unknown || priceErrorStatus(cause) === 409) onChanged();
    } finally { lock.current = false; setBusy(false); }
  }

  return <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
    <DialogContent dir={dir} className="w-[calc(100%-2rem)] max-w-lg">
      <DialogTitle>{link ? emailQueued ? copy("Invitation queued for email", "Приглашение поставлено в очередь email", "ההזמנה נוספה לתור הדוא״ל") : t.linkReady : title}</DialogTitle>
      <DialogDescription>{t.version} {action.list.version} · {action.list.agreement_reference}</DialogDescription>
      {link ? <div className="min-w-0 space-y-4">
        {emailQueued && <p role="status" className="text-sm">{copy("Queued, not yet delivered. Check the email queue in Operations.", "В очереди, ещё не доставлено. Статус письма доступен в разделе «Операции».", "בתור, טרם נמסר. סטטוס הדוא״ל זמין במסך התפעול.")}</p>}
        <p className="text-sm">{t.linkWarning}</p>
        {localLink && <p role="alert" className="text-sm text-status-warning-fg">{t.localLink}</p>}
        <Input aria-label={t.linkLabel} value={link} readOnly dir="ltr" autoComplete="off" onFocus={(event) => event.target.select()} />
        <Button type="button" onClick={() => {
          void navigator.clipboard?.writeText(link).then(() => setCopyResult(t.copied)).catch(() => setCopyResult(t.copyFailed));
          if (!navigator.clipboard) setCopyResult(t.copyFailed);
        }}><Copy className="me-2 size-4" />{t.copy}</Button>
        {copyResult && <p role="status" className="text-sm">{copyResult}</p>}
        <Button type="button" variant="outline" onClick={onClose} className="ms-2">{t.close}</Button>
      </div> : <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
        <fieldset disabled={busy || blocked} className="space-y-4">
          {invite ? <>
            <label className="block space-y-1 text-sm">{t.factory}<Input aria-label={t.factory} value={factory} minLength={2} maxLength={160} required onChange={(e) => setFactory(e.target.value)} /></label>
            <label className="block space-y-1 text-sm">{t.representative}<Input aria-label={t.representative} value={name} minLength={2} maxLength={160} required onChange={(e) => setName(e.target.value)} /></label>
            <label className="block space-y-1 text-sm">{t.email}<Input aria-label={t.email} type="email" dir="ltr" value={email} maxLength={320} required onChange={(e) => setEmail(e.target.value)} /></label>
            <label className="block space-y-1 text-sm">{t.hours}<Input aria-label={t.hours} type="number" min={1} max={168} step={1} value={hours} required onChange={(e) => setHours(e.target.value)} /></label>
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={sendEmail} onChange={(event) => setSendEmail(event.target.checked)} className="mt-1 size-4 shrink-0" />{copy("Email this invitation to the representative", "Отправить приглашение на почту представителя", "שליחת ההזמנה בדוא״ל לנציג")}</label>
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-1 size-4 shrink-0" />{t.inviteConsent}</label>
          </> : <label className="block space-y-1 text-sm">{action.kind === "cancel" ? t.cancelReason : t.revokeReason}
            <Textarea aria-label={action.kind === "cancel" ? t.cancelReason : t.revokeReason} value={reason} required maxLength={1000} onChange={(e) => setReason(e.target.value)} />
          </label>}
        </fieldset>
        {error && <p role="alert" className="text-sm text-status-problem-fg">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={onClose}>{t.close}</Button>
          <Button type="submit" disabled={busy || blocked || !valid} className="h-auto min-h-10 max-w-full whitespace-normal">
            {invite ? <Link2 className="me-2 size-4 shrink-0" /> : <ShieldCheck className="me-2 size-4 shrink-0" />}{busy ? t.saving : invite ? t.createLink : t.confirmAction}
          </Button>
        </div>
      </form>}
    </DialogContent>
  </Dialog>;
}
