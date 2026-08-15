"use client";

import { cn } from "@/lib/utils";
import { languageOptions, useI18n } from "@/lib/i18n";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useI18n();

  return (
    <div className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-surface p-0.5">
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
              "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors duration-150",
              compact ? "min-w-[38px]" : "min-w-[56px]",
              active
                ? "bg-accent text-accent-foreground"
                : "text-text-secondary hover:bg-surface-sunken hover:text-text",
            )}
          >
            {compact ? option.shortLabel : option.fullLabel}
          </button>
        );
      })}
    </div>
  );
}
