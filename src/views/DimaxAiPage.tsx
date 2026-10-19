"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Bot, Check, Loader2, X } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { InstallerShell } from "@/components/installer/InstallerShell";
import { DimaxPageHeader } from "@/components/DimaxPageHeader";
import { ConfirmActionDialog } from "@/components/dimax";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuthSession } from "@/hooks/use-auth-session";
import { apiFetch } from "@/lib/api";
import { onAuthChanged } from "@/lib/auth-session";
import {
  AI_SURFACES, aiCopy, canUseAiSurface, parseAiContext, previewRows, previewValue, safeAiSourcePath, PREVIEW_FIELD_LABEL, PROPOSAL_TOOL_LABEL,
  type AiContext, type AiConversation, type AiPage, type AiProposal, type AiReply, type AiStatus, type AiSurface, type AiTask, type AiTaskRequest,
} from "@/lib/dimax-ai";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Copy = (typeof aiCopy)["en"];

/* ---------- visual: the central element ---------- */

function useOffscreenPause<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setPaused(!entry.isIntersecting), { threshold: 0.05 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return { ref, paused };
}

function Orb({ state }: { state: "idle" | "working" | "awaiting" }) {
  const { ref, paused } = useOffscreenPause<HTMLDivElement>();
  return (
    <div ref={ref} className="dmx-ai-orb" data-state={state} data-paused={paused ? "true" : undefined} aria-hidden="true">
      <span className="dmx-ai-orb-ring" />
      <span className="dmx-ai-orb-ring dmx-ai-orb-ring--2" />
      <span className="dmx-ai-orb-core" />
    </div>
  );
}

/* ---------- answer, sources, timeline ---------- */

function Sources({ sources, title }: { sources: { kind: string; id: string; label: string; path: string }[]; title: string }) {
  const safe = sources.filter((source) => safeAiSourcePath(source.path));
  if (!safe.length) return null;
  return (
    <div className="dmx-ai-sources">
      <span className="dmx-ai-label">{title}</span>
      <ul className="flex flex-wrap gap-1.5">
        {safe.map((source) => (
          <li key={`${source.kind}:${source.id}`} className="min-w-0">
            <Link href={source.path} className="dmx-ai-chip" data-kind={source.kind}>{source.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Answer({ reply, t }: { reply: AiReply; t: Copy }) {
  return (
    <>
      <p dir="auto" className="whitespace-pre-wrap break-words text-sm leading-6">{reply.answer}</p>
      <Sources sources={reply.sources} title={t.sources} />
    </>
  );
}

function Timeline({ task, t }: { task: AiTask; t: Copy }) {
  const steps = task.reply?.steps ?? [];
  const reads = steps.filter((step) => !step.tool.startsWith("propose_")).length;
  const proposals = steps.filter((step) => step.tool.startsWith("propose_") && step.ok).length;
  const items: { key: string; label: string; state: "done" | "active" | "failed" }[] = [{ key: "received", label: t.timeline.received, state: "done" }];
  if (task.context) items.push({ key: "context", label: t.timeline.context, state: task.status === "RUNNING" ? "active" : "done" });
  if (task.status === "RUNNING") {
    items.push({ key: "reading", label: t.timeline.reading, state: "active" });
  } else if (task.status === "COMPLETED") {
    items.push({ key: "reading", label: `${t.timeline.reading} · ${t.stepsCount(reads)}`, state: "done" });
    if (proposals) items.push({ key: "proposing", label: t.timeline.proposing, state: "done" });
    items.push({ key: "answer", label: t.timeline.answer, state: "done" });
  } else {
    items.push({ key: "failed", label: t.timeline.failed, state: "failed" });
  }
  return (
    <ol className="dmx-ai-timeline">
      {items.map((item) => (
        <li key={item.key} className="dmx-ai-timeline-item" data-state={item.state}>
          <span className="dmx-ai-timeline-dot" aria-hidden="true" />
          <span>{item.label}</span>
        </li>
      ))}
    </ol>
  );
}

/* ---------- proposal card ---------- */

function proposalStatusText(proposal: AiProposal, t: Copy, busy: boolean): string {
  if (busy) return t.proposal.confirming;
  switch (proposal.status) {
    case "EXECUTED": return t.proposal.executed;
    case "REJECTED": return t.proposal.rejected;
    case "EXPIRED": return t.proposal.expired;
    case "CONFLICT": return t.proposal.conflict;
    case "FAILED": return t.proposal.failed;
    case "CONFIRMED": return t.proposal.confirming;
    default: return t.proposal.proposed;
  }
}

function ProposalCard({ proposal, t, locale, busy, canDecide, onReview, onReject }: {
  proposal: AiProposal; t: Copy; locale: "en" | "ru" | "he"; busy: boolean; canDecide: boolean;
  onReview: () => void; onReject: () => void;
}) {
  const rows = previewRows(proposal.preview);
  const entity = proposal.preview.entity;
  const summary = proposal.preview.summary ?? {};
  const open = proposal.status === "PROPOSED";
  const tone = proposal.status === "EXECUTED" ? "ok" : open || proposal.status === "CONFIRMED" ? "pending" : "muted";
  const resultSources = proposal.result?.sources ?? [];
  return (
    <article className="dmx-ai-proposal" data-status={proposal.status} data-testid="dimax-ai-proposal">
      <header className="dmx-ai-proposal-head">
        <div className="min-w-0">
          <span className="dmx-ai-label">{t.proposal.title}</span>
          <h4 className="text-sm font-semibold text-text">{PROPOSAL_TOOL_LABEL[proposal.tool_name]?.[locale] ?? proposal.tool_name}</h4>
          <p className="dmx-ai-proposal-meta">
            {["project", "door", "issue_title"].map((key) => summary[key] ? previewValue(summary[key], locale) : null).filter(Boolean).join(" · ")}
          </p>
        </div>
        <span className="dmx-ai-pill" data-tone={tone} role="status">
          {proposal.status === "EXECUTED" ? <Check className="size-3.5" aria-hidden="true" /> : null}
          {proposalStatusText(proposal, t, busy)}
        </span>
      </header>
      {rows.length ? (
        <table className="dmx-ai-diff">
          <thead>
            <tr><th scope="col"><span className="sr-only">{t.proposal.title}</span></th><th scope="col">{t.proposal.before}</th><th scope="col">{t.proposal.after}</th></tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} data-changed={row.changed ? "true" : undefined}>
                <th scope="row">{PREVIEW_FIELD_LABEL[row.key]?.[locale] ?? row.key}</th>
                <td dir="auto">{previewValue(row.before, locale)}</td>
                <td dir="auto">{row.changed ? previewValue(row.after, locale) : <span className="text-text-secondary">{t.proposal.unchanged}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {proposal.status === "EXECUTED" && proposal.result ? (
        <div className="dmx-ai-proposal-result">
          <span className="dmx-ai-label">{t.proposal.result}</span>
          <dl className="dmx-ai-facts">
            {Object.entries(proposal.result.result ?? {}).filter(([key]) => !key.endsWith("_id") && key !== "door_version").map(([key, value]) => (
              <div key={key}><dt>{PREVIEW_FIELD_LABEL[key]?.[locale] ?? key}</dt><dd>{previewValue(value, locale)}</dd></div>
            ))}
          </dl>
          <Sources sources={resultSources} title={t.proposal.open} />
        </div>
      ) : null}
      {proposal.status === "FAILED" && proposal.result?.message ? <p className="text-sm text-destructive">{proposal.result.message}</p> : null}
      {open ? (
        <footer className="dmx-ai-proposal-actions">
          <Button type="button" size="sm" disabled={busy || !canDecide} onClick={onReview} data-testid="dimax-ai-proposal-review">
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />}
            {t.proposal.review}
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={busy || !canDecide} onClick={onReject}>
            <X className="size-4" aria-hidden="true" />{t.proposal.reject}
          </Button>
          {entity && safeAiSourcePath(entity.path) ? <Link href={entity.path} className="dmx-ai-chip">{entity.label}</Link> : null}
          <span className="ms-auto text-11 text-text-secondary">{t.proposal.expires} {new Date(proposal.expires_at).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}</span>
        </footer>
      ) : null}
    </article>
  );
}

/* ---------- the workspace ---------- */

function Workspace({ surface }: { surface: AiSurface }) {
  const { locale, dir } = useI18n();
  const t = aiCopy[locale];
  const AI_API = AI_SURFACES[surface].api;
  const examples = surface === "installer" ? t.installerExamples : t.examples;
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [connectionError, setConnectionError] = useState(false);
  const [check, setCheck] = useState(0);
  const [question, setQuestion] = useState(() => (searchParams?.get("q") ?? "").slice(0, 4000));
  const [context, setContext] = useState<AiContext | null>(() => parseAiContext(searchParams?.get("context")));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [historyError, setHistoryError] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [moreConversations, setMoreConversations] = useState(false);
  // Undefined selects the most recent saved conversation on initial entry; a deep link with context starts a new one.
  const [conversationId, setConversationId] = useState<string | null | undefined>(() => (parseAiContext(searchParams?.get("context")) ? null : undefined));
  const [tasks, setTasks] = useState<AiTask[]>([]);
  const [moreTasks, setMoreTasks] = useState(false);
  const [pending, setPending] = useState<AiTaskRequest | null>(null);
  const [deciding, setDeciding] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<AiProposal | null>(null);
  const retryKeys = useRef(new Map<string, string>());
  const confirmKeys = useRef(new Map<string, string>());
  const active = useRef<AbortController | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; active.current?.abort(); };
  }, []);
  const loadConversations = useCallback(async (signal?: AbortSignal, offset = 0) => {
    const page = await apiFetch<AiPage<AiConversation>>(`${AI_API}/conversations?limit=20&offset=${offset}`, { signal });
    if (!mounted.current || signal?.aborted) return;
    setConversations((old) => offset ? [...old, ...page.items] : page.items);
    setMoreConversations(page.has_more);
    if (!offset) setConversationId((old) => old === undefined ? page.items[0]?.id ?? null : old);
  }, [AI_API]);
  useEffect(() => {
    const controller = new AbortController();
    setStatus(null); setConnectionError(false);
    void apiFetch<AiStatus>(`${AI_API}/status`, { signal: controller.signal })
      .then((value) => { if (!controller.signal.aborted) setStatus(value); })
      .catch(() => { if (!controller.signal.aborted) setConnectionError(true); });
    void loadConversations(controller.signal).catch(() => { if (!controller.signal.aborted) setHistoryError(true); });
    return () => controller.abort();
  }, [check, loadConversations, AI_API]);
  useEffect(() => {
    setTasks([]); setMoreTasks(false); setHistoryError(false);
    if (!conversationId) return;
    const controller = new AbortController();
    setHistoryLoading(true);
    void apiFetch<AiPage<AiTask>>(`${AI_API}/conversations/${conversationId}/tasks?limit=20&offset=0`, { signal: controller.signal })
      .then((page) => { if (!controller.signal.aborted) { setTasks(page.items); setMoreTasks(page.has_more); } })
      .catch(() => { if (!controller.signal.aborted) setHistoryError(true); })
      .finally(() => { if (!controller.signal.aborted) setHistoryLoading(false); });
    return () => controller.abort();
  }, [conversationId, check, AI_API]);

  const runningId = tasks.find((task) => task.status === "RUNNING")?.id;
  useEffect(() => {
    if (!runningId) return;
    const controller = new AbortController();
    let polling = false;
    const interval = setInterval(() => {
      if (polling) return;
      polling = true;
      void apiFetch<AiTask>(`${AI_API}/tasks/${runningId}`, { signal: controller.signal })
        .then((task) => {
          if (!controller.signal.aborted) {
            setTasks((old) => old.map((item) => item.id === task.id ? task : item));
            if (task.status !== "RUNNING") retryKeys.current.delete(task.id);
          }
        })
        .catch((failure: { status?: number }) => {
          if (controller.signal.aborted) return;
          setHistoryError(true);
          if (failure.status === 401 || failure.status === 403 || failure.status === 404) {
            setTasks([]); setConversations([]); setConversationId(null); setPending(null); setQuestion("");
          }
        })
        .finally(() => { polling = false; });
    }, 3000);
    return () => { clearInterval(interval); controller.abort(); };
  }, [runningId, AI_API]);

  function failureText(failure: { code?: string; status?: number }) {
    return failure.status === 403 || failure.status === 401 ? t.accessError :
      failure.status === 429 || failure.code === "AI_PROVIDER_LIMIT" ? t.limit :
      failure.code === "AI_PROVIDER_TIMEOUT" || failure.code === "AI_DEADLINE" ? t.timeout :
      failure.code === "AI_NOT_CONFIGURED" ? t.disconnected : t.unavailable;
  }
  async function send(path: string, body: AiTaskRequest | { request_id: string }) {
    if (active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setBusy(true); setError("");
    try {
      const task = await apiFetch<AiTask>(path, { method: "POST", signal: controller.signal, body: JSON.stringify(body) });
      if (!mounted.current || controller.signal.aborted) return;
      setPending(null); setQuestion("");
      setTasks((old) => [task, ...old.filter((item) => item.id !== task.id)]);
      setConversationId(task.conversation_id);
      void loadConversations().catch(() => { if (mounted.current) setHistoryError(true); });
      return task;
    } catch (err) {
      if (mounted.current && !controller.signal.aborted) {
        const failure = err as { code?: string; status?: number };
        setError(failure.status ? failureText(failure) : t.unknownDelivery);
        if (failure.status === 401 || failure.status === 403) {
          setPending(null); setTasks([]); setConversations([]); setConversationId(null);
        } else if (failure.status && failure.status >= 400 && failure.status < 500) {
          setPending(null);
        }
      }
    } finally {
      if (active.current === controller) {
        active.current = null;
        if (mounted.current) setBusy(false);
      }
    }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    const message = question.trim();
    if (!message || active.current || pending || runningId || historyLoading || !status?.ready) return;
    if (message.length > 4000) { setError(t.tooLong); return; }
    const body: AiTaskRequest = { request_id: crypto.randomUUID(), conversation_id: conversationId ?? null, message, locale, context };
    setPending(body);
    await send(`${AI_API}/tasks`, body);
  }
  async function retryTask(task: AiTask) {
    const key = retryKeys.current.get(task.id) ?? crypto.randomUUID();
    retryKeys.current.set(task.id, key);
    const acknowledged = await send(`${AI_API}/tasks/${task.id}/retry`, { request_id: key });
    // Keep the token across lost acknowledgements. A subsequent explicit retry
    // after an acknowledged failure needs a fresh attempt token.
    if (acknowledged && acknowledged.status !== "RUNNING") retryKeys.current.delete(task.id);
  }
  function stopWaiting() {
    active.current?.abort(); active.current = null; setBusy(false); setError(t.cancelled);
  }
  async function cancelTask(task: AiTask) {
    try {
      const result = await apiFetch<AiTask>(`${AI_API}/tasks/${task.id}/cancel`, { method: "POST" });
      if (mounted.current) setTasks((old) => old.map((item) => item.id === result.id ? result : item));
    } catch (err) { if (mounted.current) setError(failureText(err as { status?: number })); }
  }
  function replaceProposal(next: AiProposal) {
    setTasks((old) => old.map((task) => task.id === next.task_id
      ? { ...task, proposals: (task.proposals ?? []).map((item) => item.id === next.id ? next : item) }
      : task));
  }
  async function decide(proposal: AiProposal, action: "confirm" | "reject") {
    if (deciding) return;
    setDeciding(proposal.id); setError("");
    try {
      // The decision token survives a lost response: the server reuses it and never saves twice.
      const key = confirmKeys.current.get(proposal.id) ?? crypto.randomUUID();
      confirmKeys.current.set(proposal.id, key);
      const result = await apiFetch<AiProposal>(`${AI_API}/proposals/${proposal.id}/${action}`, {
        method: "POST", body: action === "confirm" ? JSON.stringify({ request_id: key }) : undefined,
      });
      if (!mounted.current) return;
      if (result.status !== "CONFIRMED") confirmKeys.current.delete(proposal.id);
      replaceProposal(result);
      setReviewing(null);
    } catch (err) {
      if (!mounted.current) return;
      const failure = err as { code?: string; status?: number };
      setError(failure.status ? failureText(failure) : t.proposal.decisionLost);
      if (failure.status === 401 || failure.status === 403) { setTasks([]); setConversations([]); setConversationId(null); }
      setReviewing(null);
    } finally {
      if (mounted.current) setDeciding(null);
    }
  }
  async function loadOlderTasks() {
    if (!conversationId || historyLoading) return;
    const selected = conversationId;
    setHistoryLoading(true);
    try {
      const page = await apiFetch<AiPage<AiTask>>(`${AI_API}/conversations/${selected}/tasks?limit=20&offset=${tasks.length}`);
      if (mounted.current) { setTasks((old) => [...old, ...page.items]); setMoreTasks(page.has_more); }
    } catch { if (mounted.current) setHistoryError(true); }
    finally { if (mounted.current) setHistoryLoading(false); }
  }
  function chooseConversation(value: string) {
    stopWaiting(); setPending(null); setError(""); setQuestion(""); setHistoryLoading(false);
    setConversationId(value || null);
  }

  const awaiting = tasks.some((task) => (task.proposals ?? []).some((proposal) => proposal.status === "PROPOSED"));
  const orbState = busy || !!runningId ? "working" : awaiting ? "awaiting" : "idle";
  const canDecide = !!status?.actions_enabled;

  return (
    <div dir={dir} className="dmx-ai-shell">
      <DimaxPageHeader eyebrow="DIMAX" title={t.title} subtitle={surface === "installer" ? t.installerSubtitle : t.subtitle}
        badge={<span className="rounded-md border px-2 py-1 text-xs text-text-secondary">{status?.actions_enabled ? t.actionsOn : t.readOnly}</span>} />

      <div className="dmx-ai-grid">
        {/* ---- rail: dialogs, tasks, connection ---- */}
        <aside className="dmx-ai-rail">
          <section className="dmx-ai-card" aria-labelledby="dimax-ai-rail-title">
            <h2 id="dimax-ai-rail-title" className="dmx-ai-card-title">{t.rail}</h2>
            <label htmlFor="dimax-ai-conversation" className="block text-sm font-medium">{t.conversations}</label>
            <div className="flex min-w-0 flex-wrap gap-2">
              <select id="dimax-ai-conversation" value={conversationId ?? ""} disabled={busy || historyLoading}
                onChange={(event) => chooseConversation(event.target.value)}
                className="min-w-0 w-full rounded-md border bg-surface px-3 py-2 text-sm">
                <option value="">{t.newConversation}</option>
                {conversations.map((conversation) => <option key={conversation.id} value={conversation.id}>{conversation.title}</option>)}
              </select>
            </div>
            <ul className="dmx-ai-conversations" aria-label={t.rail}>
              {conversations.slice(0, 8).map((conversation) => (
                <li key={conversation.id}>
                  <button type="button" className="dmx-ai-conversation" aria-current={conversation.id === conversationId ? "true" : undefined}
                    disabled={busy || historyLoading} onClick={() => chooseConversation(conversation.id)}>
                    <span className="truncate">{conversation.title}</span>
                    <span className="dmx-ai-conversation-time">{new Date(conversation.updated_at).toLocaleDateString(locale)}</span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" disabled={busy || historyLoading} onClick={() => chooseConversation("")}>{t.newConversation}</Button>
              {moreConversations && <Button variant="outline" size="sm" disabled={busy} onClick={() => void loadConversations(undefined, conversations.length)
                .catch(() => { if (mounted.current) setHistoryError(true); })}>{t.more}</Button>}
            </div>
            {historyError && <div role="alert" className="flex flex-wrap items-center gap-2 text-sm"><span>{t.historyError}</span>
              <Button variant="outline" size="sm" onClick={() => setCheck((old) => old + 1)}>{t.retry}</Button></div>}
          </section>
          <section className="dmx-ai-card" aria-labelledby="dimax-ai-connection-title">
            <h2 id="dimax-ai-connection-title" className="dmx-ai-card-title">{t.connection}</h2>
            {!status && !connectionError && <p role="status" className="text-sm text-text-secondary">{t.pending}</p>}
            {connectionError && <div role="alert" className="space-y-3"><p>{t.unavailable}</p>
              <Button variant="outline" size="sm" onClick={() => setCheck((old) => old + 1)}>{t.retry}</Button></div>}
            {status && !status.ready && <div role="status" className="space-y-3">
              <p className="text-sm">{status.reason === "disabled" ? t.disabled : t.disconnected}</p>
              <Button variant="outline" size="sm" onClick={() => setCheck((old) => old + 1)}>{t.retry}</Button>
            </div>}
            {status && <ul className="dmx-ai-capabilities">
              <li data-tone={status.provider === "mock" ? "warn" : "muted"}>{status.provider === "mock" ? t.providerMock : t.providerLive}</li>
              <li data-tone={status.actions_enabled ? "ok" : "muted"}>{status.actions_enabled ? t.actionsOn : t.actionsOff}</li>
            </ul>}
          </section>
        </aside>

        {/* ---- main: hero, composer, thread ---- */}
        <div className="dmx-ai-main">
          <section className="dmx-ai-hero" data-state={orbState}>
            <Orb state={orbState} />
            <div className="min-w-0 flex-1">
              <p className="dmx-ai-hero-state" role="status">{orbState === "working" ? t.heroWorking : orbState === "awaiting" ? t.heroAwaiting : t.heroIdle}</p>
              {context ? (
                <div className="dmx-ai-context" data-testid="dimax-ai-context">
                  <span className="dmx-ai-label">{t.contextLabel}</span>
                  <span className="dmx-ai-pill" data-tone="pending">{t.contextKinds[context.kind]} · <span dir="ltr" className="font-mono text-11">{context.id.slice(0, 8)}</span></span>
                  <button type="button" className="dmx-ai-link" onClick={() => setContext(null)}>{t.contextClear}</button>
                  <span className="basis-full text-11 text-text-secondary">{t.contextHint}</span>
                </div>
              ) : null}
            </div>
          </section>

          <section className="dmx-ai-card dmx-ai-composer">
            <form onSubmit={submit} className="space-y-3">
              <label htmlFor="dimax-ai-question" className="block text-sm font-medium">{t.question}</label>
              <Textarea id="dimax-ai-question" value={question} onChange={(event) => setQuestion(event.target.value)}
                maxLength={4000} rows={3} disabled={busy || !!pending} className="resize-y" />
              <div className="flex flex-wrap gap-2">
                {examples.map((example) => <Button key={example} type="button" variant="outline" size="sm"
                  disabled={busy || !!pending} className="h-auto whitespace-normal text-start" onClick={() => setQuestion(example)}>{example}</Button>)}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="submit" disabled={!status?.ready || busy || !!pending || !!runningId || historyLoading || !question.trim()}>
                  {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Bot className="size-4" aria-hidden="true" />}
                  {busy ? t.working : t.ask}
                </Button>
                {busy ? <Button type="button" variant="outline" onClick={stopWaiting}>{t.cancel}</Button> :
                  <Button type="button" variant="outline" disabled={!!pending} onClick={() => { setQuestion(""); setError(""); }}>{t.clear}</Button>}
                {!busy && pending && <Button type="button" variant="outline"
                  onClick={() => void send(`${AI_API}/tasks`, pending)}>{t.recover}</Button>}
              </div>
            </form>
            {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
          </section>

          <section aria-live="polite" aria-busy={busy || historyLoading} className="dmx-ai-thread">
            <h2 className="dmx-ai-card-title">{t.answer}</h2>
            {moreTasks && <Button variant="outline" size="sm" disabled={historyLoading || busy} onClick={() => void loadOlderTasks()}>{t.more}</Button>}
            {tasks.length ? [...tasks].reverse().map((task, index) => (
              <article key={task.id} className="dmx-ai-task" data-status={task.status} style={{ "--dmx-ai-reveal": Math.min(index, 6) } as React.CSSProperties}>
                <header className="dmx-ai-task-head">
                  <p dir="auto" className="whitespace-pre-wrap break-words text-sm font-medium">{task.message}</p>
                  <p className="text-11 text-text-secondary">{t.saved} · {new Date(task.created_at).toLocaleString(locale)}
                    {task.context ? <> · {t.contextKinds[task.context.kind]}</> : null}</p>
                </header>
                <Timeline task={task} t={t} />
                <div className="dmx-ai-task-body">
                  {task.reply && task.status === "COMPLETED" ? <Answer reply={task.reply} t={t} /> :
                    <p role="status" className="text-sm text-text-secondary">{task.status === "RUNNING" ? t.working :
                      task.status === "INTERRUPTED" ? t.interrupted : task.status === "CANCELLED" ? t.taskCancelled :
                        failureText({ code: task.error_code ?? undefined })}</p>}
                  {task.reply?.provider === "mock" ? <p className="text-11 text-text-secondary">{t.providerMock}</p> : null}
                </div>
                {(task.proposals ?? []).map((proposal) => (
                  <ProposalCard key={proposal.id} proposal={proposal} t={t} locale={locale} busy={deciding === proposal.id} canDecide={canDecide}
                    onReview={() => setReviewing(proposal)} onReject={() => void decide(proposal, "reject")} />
                ))}
                {task.status === "RUNNING" && <Button variant="outline" size="sm" onClick={() => void cancelTask(task)}>{t.cancelTask}</Button>}
                {(task.status === "FAILED" || task.status === "INTERRUPTED") && task.attempt_count < 3 && task.id === tasks[0]?.id &&
                  <Button variant="outline" size="sm" disabled={busy || !status?.ready || !!pending} onClick={() => void retryTask(task)}>{t.retryTask}</Button>}
              </article>
            )) : <p className="text-sm text-text-secondary">{busy || historyLoading ? t.working : t.empty}</p>}
          </section>
        </div>
      </div>

      <ConfirmActionDialog open={!!reviewing} onOpenChange={(open) => { if (!open) setReviewing(null); }}
        title={reviewing ? PROPOSAL_TOOL_LABEL[reviewing.tool_name]?.[locale] ?? reviewing.tool_name : ""}
        changes={<div className="space-y-2">
          <p>{t.proposal.dialogChanges}</p>
          {reviewing ? <ul className="space-y-1">
            {previewRows(reviewing.preview).filter((row) => row.changed).map((row) => (
              <li key={row.key}><span className="font-medium text-text">{PREVIEW_FIELD_LABEL[row.key]?.[locale] ?? row.key}:</span> {previewValue(row.after, locale)}</li>
            ))}
          </ul> : null}
        </div>}
        keeps={t.proposal.keeps} confirmLabel={t.proposal.confirm} busy={!!deciding} testId="dimax-ai-confirm"
        onConfirm={() => reviewing ? decide(reviewing, "confirm") : undefined} />
    </div>
  );
}

export default function DimaxAiPage({ surface = "admin" }: { surface?: AiSurface }) {
  const session = useAuthSession();
  const { locale } = useI18n();
  const [epoch, setEpoch] = useState(0);
  useEffect(() => onAuthChanged(() => setEpoch((old) => old + 1)), []);
  const allowed = canUseAiSurface(session, surface);
  const Layout = surface === "installer" ? InstallerShell : DashboardLayout;
  return <Layout>{allowed ? <Workspace key={`${epoch}:${session?.role}:${session?.admin_scope}`} surface={surface} /> :
    <p role="alert">{aiCopy[locale].access}</p>}</Layout>;
}
