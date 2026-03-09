"use client";

import { cn } from "@/lib/utils";
import { languageOptions, useI18n } from "@/lib/i18n";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useI18n();

  return (
    <div className="inline-flex items-center gap-1 rounded-2xl border border-border/70 bg-background/70 p-1">
      {languageOptions.map((option) => {
        const active = option.locale === locale;
        return (
          <button
            key={option.locale}
            type="button"
            onClick={() => setLocale(option.locale)}
            aria-pressed={active}
            title={option.fullLabel}
            className={cn(
              "rounded-xl px-2.5 py-1.5 text-[11px] font-medium transition-all duration-200",
              compact ? "min-w-[38px]" : "min-w-[56px]",
              active
                ? "bg-accent text-accent-foreground shadow-[0_12px_24px_-18px_hsl(var(--accent)/0.7)]"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {compact ? option.shortLabel : option.fullLabel}
          </button>
        );
      })}
    </div>
  );
}
