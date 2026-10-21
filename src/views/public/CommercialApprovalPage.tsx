"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Mail, RefreshCw, ShieldCheck } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AgreementSnapshot } from "@/components/accounting/AgreementSnapshot";
import { approvalCopy } from "@/components/accounting/approval-copy";
import { useI18n } from "@/lib/i18n";
import { priceErrorStatus } from "@/lib/factory-prices";
import { formatLocaleDateTime } from "@/lib/formatting";
import { mailboxCodeSchema, publicCommercialRequest, publicCommercialSchema, type PublicCommercialApproval } from "@/lib/commercial-approvals";

function Decision({ token }: { token: string }) {
  const { locale } = useI18n(), t = approvalCopy[locale];
  const [data, setData] = useState<PublicCommercialApproval | null>(null);
  const [busy, setBusy] = useState(false), [accepted, setAccepted] = useState(false);
  const [name, setName] = useState(""), [code, setCode] = useState("");
  const [error, setError] = useState<"error" | "unavailable" | "codeError" | "limited" | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [codeInfo, setCodeInfo] = useState<{ expires_at: string; resend_after: string } | null>(null);
  const [clock, setClock] = useState(Date.now());
  const controller = useRef<AbortController | null>(null);

  async function run(action: "preview" | "confirm" | "request-code") {
    if (controller.current) return;
    if (!token) { setError("unavailable"); setBlocked(true); return; }
    if (action === "confirm" && (!data || blocked || !accepted || name.trim().length < 2 || !/^\d{6}$/.test(code))) return;
    const active = new AbortController(); controller.current = active;
    const timeout = setTimeout(() => active.abort(), 30_000);
    setBusy(true); setError(null);
    if (action === "preview") { setData(null); setAccepted(false); }
    try {
      if (action === "request-code") {
        const result = await publicCommercialRequest(action, { token }, mailboxCodeSchema, active.signal);
        if (controller.current === active) { setCodeInfo(result); setCode(""); }
      } else {
        const body = action === "preview" ? { token } : {
          token, terms_version: data!.snapshot.terms.version, price_version: data!.snapshot.price.version,
          snapshot_hash: data!.snapshot_hash, signer_name: name.trim(), accepted: true, verification_code: code,
        };
        const result = await publicCommercialRequest(action, body, publicCommercialSchema, active.signal);
        if (controller.current === active) { setData(result); setBlocked(false); }
      }
    } catch (cause) {
      if (controller.current !== active) return;
      const status = priceErrorStatus(cause);
      setError(status === 403 ? "codeError" : status === 429 ? "limited" : [404, 409, 422].includes(status) ? "unavailable" : "error");
      if (status !== 403 && status !== 429) setBlocked(true);
    } finally {
      clearTimeout(timeout);
      if (controller.current === active) { controller.current = null; setBusy(false); }
    }
  }
  useEffect(() => {
    void run("preview");
    return () => { const active = controller.current; controller.current = null; active?.abort(); };
    // A new fragment remounts Decision; never reuse consent for another invitation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);
  useEffect(() => { const timer = setInterval(() => setClock(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const expired = data ? clock >= Date.parse(data.expires_at) : false;
  return <div className="min-w-0 space-y-5">
    {busy && <p role="status" className="text-sm">{t.load}</p>}
    {error && <div role="alert" className="space-y-2 border-s-2 border-status-problem-border bg-status-problem-bg p-3 text-sm">
      <p>{t[error]}</p><Button disabled={busy} variant="outline" onClick={() => void run("preview")}><RefreshCw className="me-2 size-4" />{t.check}</Button>
    </div>}
    {data && <>
      <AgreementSnapshot snapshot={data.snapshot} />
      <p className="text-sm">{t.recipient}: <strong>{data.recipient_name}</strong></p>
      <p className="text-xs text-text-secondary">{t.expiry}: {formatLocaleDateTime(data.expires_at, locale)}</p>
      {data.status === "CONFIRMED" ? <div role="status" className="border-s-2 border-status-success-border bg-status-success-bg p-4 text-sm text-status-success-fg">
        <p className="flex items-center gap-2 font-semibold"><CheckCircle2 className="size-5" />{t.done}</p>
        <p>{data.confirmed_name} · {data.confirmed_at && formatLocaleDateTime(data.confirmed_at, locale)}</p>
      </div> : expired ? <p role="alert">{t.unavailable}</p> : <form className="space-y-4 border-t border-border pt-4"
        onSubmit={(event) => { event.preventDefault(); void run("confirm"); }}>
        <fieldset disabled={busy || blocked} className="space-y-4">
          <label className="block text-sm">{t.name}<Input className="mt-2" value={name} maxLength={160} minLength={2} required
            autoComplete="name" onChange={(event) => setName(event.target.value)} /></label>
          <div className="space-y-2"><p className="text-xs text-text-secondary">{t.codeHint}</p>
            <Button type="button" variant="outline" disabled={!!codeInfo && clock < Date.parse(codeInfo.resend_after)}
              onClick={() => void run("request-code")}><Mail className="me-2 size-4" />{t.requestCode}</Button>
            {codeInfo && <p role="status" className="text-xs">{t.queued} · {t.expiry}: {formatLocaleDateTime(codeInfo.expires_at, locale)}</p>}
          </div>
          <label className="block text-sm">{t.code}<Input value={code} className="mt-2 max-w-52 font-mono" dir="ltr" inputMode="numeric"
            autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required onChange={(event) => setCode(event.target.value)} /></label>
          <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={accepted} required
            className="mt-1 size-4 shrink-0 accent-accent" onChange={(event) => setAccepted(event.target.checked)} />{t.consent}</label>
          <Button type="submit" className="h-auto min-h-10 whitespace-normal" disabled={!accepted || name.trim().length < 2 || !/^\d{6}$/.test(code)}>
            <ShieldCheck className="me-2 size-4 shrink-0" />{t.confirm}</Button>
        </fieldset>
      </form>}
    </>}
  </div>;
}

export default function CommercialApprovalPage() {
  const { locale, dir } = useI18n(), t = approvalCopy[locale];
  const [token, setToken] = useState<string | null>(null);
  const read = useRef(false);
  useEffect(() => {
    const load = () => {
      const raw = window.location.hash.slice(1);
      setToken(/^[A-Za-z0-9_-]{43}$/.test(raw) ? raw : "");
      window.history.replaceState(window.history.state, "", window.location.pathname);
    };
    if (!read.current) { read.current = true; load(); }
    window.addEventListener("hashchange", load);
    return () => window.removeEventListener("hashchange", load);
  }, []);
  return <main dir={dir} className="min-h-screen bg-background text-text-primary">
    <header className="border-b border-border bg-surface"><div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-4">
      <span className="bg-text-primary px-3 py-2 text-sm font-bold text-accent">DIMAX</span><LanguageSwitcher />
    </div></header>
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6"><h1 className="text-xl font-semibold">{t.title}</h1>
      {token === null ? <p role="status">{t.load}</p> : <Decision key={token} token={token} />}
    </div>
  </main>;
}
