"use client";

import Link from "next/link";
import { useAuthSession } from "@/hooks/use-auth-session";
import { AI_INSTALLER_PROMPTS, AI_PROMPTS, AI_SURFACES, aiContextHref, aiCopy, canUseAiSurface, type AiContext, type AiSurface } from "@/lib/dimax-ai";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type AiAssistPanelProps = {
  /** The object this section is showing; the workspace reads it first. */
  context: AiContext | null;
  /** What the object is, in the reader's words (e.g. the project name). */
  label: string;
  /** Ready questions for this section; defaults to the questions of the object kind. */
  prompts?: string[];
  /** The admin office (default) or the installer cabinet: different API, routes and access. */
  surface?: AiSurface;
  className?: string;
  testId?: string;
};

// Compact DIMAX AI launcher for a section. It does not run its own agent:
// every prompt opens the one /ai workspace with this object as context, so
// rights, proposals, confirmation and audit stay in a single mechanism.
export function AiAssistPanel({ context, label, prompts, surface = "admin", className, testId }: AiAssistPanelProps) {
  const session = useAuthSession();
  const { locale, dir } = useI18n();
  const t = aiCopy[locale];
  if (!canUseAiSurface(session, surface)) return null;
  const base = AI_SURFACES[surface].base;
  const questions = prompts ?? (surface === "installer" ? AI_INSTALLER_PROMPTS : AI_PROMPTS)[context?.kind ?? "company"].map((prompt) => prompt[locale]);
  return (
    <section dir={dir} data-testid={testId} aria-label={t.assist.title} className={cn("dmx-ai-assist", className)}>
      <span className="dmx-ai-orb dmx-ai-orb--mini" aria-hidden="true"><span className="dmx-ai-orb-core" /></span>
      <div className="min-w-0 flex-1">
        <p className="dmx-ai-assist-title">
          <span>{t.assist.title}</span>
          <span className="dmx-ai-assist-sub">{t.assist.hint}: {label}</span>
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {questions.map((prompt) => (
            <Link key={prompt} href={aiContextHref(context, prompt, base)} className="dmx-ai-chip">{prompt}</Link>
          ))}
          <Link href={aiContextHref(context, undefined, base)} className="dmx-ai-chip dmx-ai-chip--primary">{t.assist.open}</Link>
        </div>
      </div>
    </section>
  );
}
