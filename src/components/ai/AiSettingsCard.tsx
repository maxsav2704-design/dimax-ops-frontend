"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, PlugZap } from "lucide-react";
import { InlineNotice, WidgetCard } from "@/components/dimax";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import { readableApiError } from "@/lib/api-error-display";
import { AI_API, aiCopy, type AiCheck, type AiRules, type AiStatus } from "@/lib/dimax-ai";
import { useI18n } from "@/lib/i18n";

// Settings → DIMAX AI: connection facts, the daily budget, the owner's company rules (versioned)
// and a one-shot connection check. Rules reach the agent as company authority; they cannot add
// tools or override the business rules, and every answer records the version it used.
export function AiSettingsCard({ canManage }: { canManage: boolean }) {
  const { locale } = useI18n();
  const t = aiCopy[locale];
  const queryClient = useQueryClient();
  const statusQuery = useQuery({ queryKey: ["ai-status"], queryFn: () => apiFetch<Partial<AiStatus>>(`${AI_API}/status`) });
  const rulesQuery = useQuery({ queryKey: ["ai-rules"], queryFn: () => apiFetch<Partial<AiRules>>(`${AI_API}/rules`) });
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState<{ tone: "success" | "error" | "warning"; message: string } | null>(null);
  useEffect(() => { setDraft(rulesQuery.data?.text ?? ""); }, [rulesQuery.data?.text]);

  const saveRules = useMutation({
    mutationFn: (text: string) => apiFetch<AiRules>(`${AI_API}/rules`, { method: "PUT", body: JSON.stringify({ text }) }),
    onSuccess: async (saved) => {
      setNotice({ tone: "success", message: `${t.settings.saved} · ${t.settings.version} ${saved.version}` });
      await queryClient.invalidateQueries({ queryKey: ["ai-rules"] });
      await queryClient.invalidateQueries({ queryKey: ["ai-status"] });
    },
    onError: (error) => setNotice({ tone: "error", message: readableApiError(error, locale, t.settings.saveFailed) }),
  });
  const check = useMutation({
    mutationFn: () => apiFetch<AiCheck>(`${AI_API}/check`, { method: "POST" }),
    onSuccess: (result) => setNotice(result.ok
      ? { tone: "success", message: `${t.settings.checkOk} · ${result.provider}${result.model ? ` · ${result.model}` : ""} · ${result.latency_ms} ms` }
      : { tone: "error", message: `${t.settings.checkFailed} · ${result.code ?? ""}` }),
    onError: (error) => setNotice({ tone: "error", message: readableApiError(error, locale, t.settings.checkFailed) }),
  });

  const status = statusQuery.data;
  const rules = rulesQuery.data;
  const dirty = draft !== (rules?.text ?? "");
  return (
    <WidgetCard title={t.title} headerMeta={t.settings.meta} data-testid="ai-settings-card">
      <div className="space-y-4">
        <ul className="dmx-ai-capabilities">
          {status?.provider ? <li data-tone={status.provider === "mock" ? "warn" : "muted"}>{status.provider === "mock" ? t.providerMock : t.providerLive}</li> : null}
          {status ? <li data-tone={status.ready ? "ok" : "warn"}>{status.ready ? t.settings.ready : status.reason === "disabled" ? t.disabled : t.disconnected}</li> : null}
          {status ? <li data-tone={status.actions_enabled ? "ok" : "muted"}>{status.actions_enabled ? t.actionsOn : t.actionsOff}</li> : null}
          {status?.execution ? <li data-tone="muted">{status.execution === "background" ? t.settings.background : t.settings.inline}</li> : null}
          {typeof status?.daily_limit === "number" ? <li data-tone={(status.daily_used ?? 0) >= status.daily_limit ? "warn" : "muted"}>{t.settings.budget(status.daily_used ?? 0, status.daily_limit)}</li> : null}
        </ul>
        <div className="space-y-2">
          <label htmlFor="dimax-ai-rules" className="block text-sm font-medium">{t.settings.rules}</label>
          <p className="text-12 text-text-secondary">{t.settings.rulesHint}</p>
          <Textarea id="dimax-ai-rules" value={draft} onChange={(event) => setDraft(event.target.value)} rows={5} maxLength={4000}
            disabled={!canManage || saveRules.isPending} placeholder={t.settings.rulesPlaceholder} className="resize-y" />
          <p className="text-11 text-text-secondary">
            {rules?.version ? `${t.settings.version} ${rules.version}` : t.settings.noRules}
            {rules?.updated_by ? ` · ${rules.updated_by}` : ""}
            {rules?.updated_at ? ` · ${new Date(rules.updated_at).toLocaleString(locale)}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" disabled={!canManage || !dirty || saveRules.isPending} onClick={() => saveRules.mutate(draft.trim())}>
            {saveRules.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}{t.settings.save}
          </Button>
          <Button type="button" variant="outline" disabled={!canManage || check.isPending} onClick={() => check.mutate()}>
            {check.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <PlugZap className="size-4" aria-hidden="true" />}{t.settings.check}
          </Button>
          {!canManage ? <span className="text-12 text-text-secondary">{t.settings.ownerOnly}</span> : null}
        </div>
        {notice ? <InlineNotice tone={notice.tone}>{notice.message}</InlineNotice> : null}
      </div>
    </WidgetCard>
  );
}
