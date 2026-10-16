"use client";

import { useRef, useState } from "react";
import { Ban, Pencil, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n, useCopy } from "@/lib/i18n";
import { PRICE_API, priceRequest, type FactoryContact } from "@/lib/factory-prices";
import { priceCopy } from "./copy";

export function FactoryContactPanel({ contact, owner, pending, error, onChanged }: {
  contact: FactoryContact | null | undefined; owner: boolean; pending: boolean; error: boolean; onChanged: () => void;
}) {
  const { locale } = useI18n();
  const [editing, setEditing] = useState<{ contact: FactoryContact | null } | null>(null);
  const [revoking, setRevoking] = useState<FactoryContact | null>(null);
  const text = useCopy();
  return <section className="min-w-0 border-y border-border py-4" aria-label={text("Factory contact", "Контакт завода", "איש קשר במפעל")}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-sm font-semibold">{text("Authorized factory contact", "Уполномоченный контакт завода", "איש קשר מורשה במפעל")}</h2>
      {owner && <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={pending || error} onClick={() => setEditing({ contact: contact ?? null })}><Pencil className="me-2 size-4" />{text("Approve contact", "Утвердить контакт", "אישור איש קשר")}</Button>
        {contact && <Button variant="outline" disabled={pending || error} onClick={() => setRevoking(contact)}><Ban className="me-2 size-4" />{text("Revoke contact", "Отозвать полномочия", "ביטול הרשאה")}</Button>}
      </div>}
    </div>
    {pending ? <p role="status" className="mt-2 text-sm">{priceCopy[locale].loading}</p> : error ? <p role="alert" className="mt-2 text-sm text-status-problem-fg">{priceCopy[locale].error}</p> : contact ?
      <div className="mt-2 min-w-0 text-sm"><p className="break-words">{contact.factory_name} · {contact.recipient_name}</p><p dir="ltr" className="break-all text-text-secondary">{contact.recipient_email}</p><p className="mt-1 break-words text-xs text-text-secondary">{contact.authority_reference}</p></div> :
      <p className="mt-2 text-sm text-text-secondary">{text("The company owner must approve a contact before invitations can be sent.", "До отправки приглашений владелец компании должен утвердить контакт завода.", "על בעל החברה לאשר איש קשר לפני שליחת הזמנות.")}</p>}
    {editing && <ContactEditor contact={editing.contact} onClose={() => setEditing(null)} onChanged={onChanged} />}
    {revoking && <ContactRevocation contact={revoking} onClose={() => setRevoking(null)} onChanged={onChanged} />}
  </section>;
}

function ContactRevocation({ contact, onClose, onChanged }: { contact: FactoryContact; onClose: () => void; onChanged: () => void }) {
  const { locale, dir } = useI18n();
  const t = priceCopy[locale];
  const text = useCopy();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const lock = useRef(false);
  async function revoke() {
    if (lock.current || error || reason.trim().length < 10) return;
    lock.current = true; setBusy(true);
    try {
      await priceRequest(`${PRICE_API}/factory/contact/revoke`, { expected_contact_id: contact.id, reason: reason.trim() });
      onChanged(); onClose();
    } catch { setError(true); onChanged(); }
    finally { lock.current = false; setBusy(false); }
  }
  return <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}><DialogContent dir={dir} className="max-w-lg">
    <DialogTitle>{text("Revoke contact", "Отозвать полномочия", "ביטול הרשאה")}</DialogTitle>
    <DialogDescription>{text("Pending links will stop working. Confirmed prices and earnings remain unchanged.", "Неподтверждённые ссылки перестанут работать. Подтверждённые цены и заработок сохранятся.", "קישורים ממתינים יפסיקו לפעול. מחירים מאושרים והכנסות לא ישתנו.")}</DialogDescription>
    <p className="break-words text-sm">{contact.recipient_name}</p>
    <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void revoke(); }}>
      <label className="block space-y-1 text-sm">{t.revokeReason}<Textarea required minLength={10} maxLength={500} disabled={busy || error} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
      {error && <p role="alert" className="text-sm text-status-problem-fg">{t.unknownAction}</p>}
      <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={onClose}>{t.close}</Button><Button type="submit" disabled={busy || error || reason.trim().length < 10}><Ban className="me-2 size-4" />{busy ? t.saving : t.confirmAction}</Button></div>
    </form>
  </DialogContent></Dialog>;
}

function ContactEditor({ contact, onClose, onChanged }: { contact: FactoryContact | null; onClose: () => void; onChanged: () => void }) {
  const { locale, dir } = useI18n();
  const t = priceCopy[locale];
  const text = useCopy();
  const [values, setValues] = useState({ factory_name: contact?.factory_name ?? "", recipient_name: contact?.recipient_name ?? "", recipient_email: contact?.recipient_email ?? "", authority_reference: contact?.authority_reference ?? "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const lock = useRef(false);
  async function save() {
    if (lock.current || !accepted || error) return;
    lock.current = true; setBusy(true);
    try {
      await priceRequest(`${PRICE_API}/factory/contact`, { ...values, expected_contact_id: contact?.id ?? null });
      onChanged(); onClose();
    } catch { setError(true); onChanged(); }
    finally { lock.current = false; setBusy(false); }
  }
  const fields = [
    ["factory_name", t.factory], ["recipient_name", t.representative], ["recipient_email", t.email],
    ["authority_reference", text("Authority reference", "Основание полномочий", "אסמכתה להרשאה")],
  ] as const;
  return <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}><DialogContent dir={dir} className="max-w-lg">
    <DialogTitle>{text("Approve factory contact", "Утвердить контакт завода", "אישור איש קשר במפעל")}</DialogTitle>
    <DialogDescription>{text("Replacing the contact revokes pending invitations. Confirmed decisions are retained.", "Замена контакта отзывает неподтверждённые приглашения. Принятые решения сохраняются.", "החלפת איש הקשר מבטלת הזמנות ממתינות. החלטות שאושרו נשמרות.")}</DialogDescription>
    <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void save(); }}>
      <fieldset disabled={busy || error} className="space-y-3">
        {fields.map(([key, label]) => <label key={key} className="block space-y-1 text-sm">{label}<Input value={values[key]} required minLength={key === "authority_reference" ? 3 : 2} maxLength={key === "authority_reference" ? 500 : key === "recipient_email" ? 320 : 160} type={key === "recipient_email" ? "email" : "text"} dir={key === "recipient_email" ? "ltr" : undefined} onChange={(event) => setValues({ ...values, [key]: event.target.value })} /></label>)}
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} className="mt-1 size-4 shrink-0" />{text("I have verified this representative's authority to approve factory prices.", "Я проверил полномочия представителя на подтверждение цен завода.", "בדקתי את סמכות הנציג לאשר את מחירי המפעל.")}</label>
      </fieldset>
      {error && <p role="alert" className="text-sm text-status-problem-fg">{text("Could not confirm the result. Close this form and check the current contact before trying again.", "Результат не подтверждён. Закройте форму и проверьте текущий контакт перед повтором.", "לא ניתן לאמת את התוצאה. יש לסגור את הטופס ולבדוק את איש הקשר הנוכחי לפני ניסיון נוסף.")}</p>}
      <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={onClose}>{t.close}</Button><Button type="submit" disabled={busy || error || !accepted}><ShieldCheck className="me-2 size-4" />{busy ? t.saving : t.confirmAction}</Button></div>
    </form>
  </DialogContent></Dialog>;
}
