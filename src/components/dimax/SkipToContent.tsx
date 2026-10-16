"use client";

import { useCopy } from "@/lib/i18n";

export const MAIN_CONTENT_ID = "dmx-main";

// First focusable element on every shell: keyboard users jump past the top
// bar and sidebar straight to <main id="dmx-main">. Visually hidden until it
// receives focus.
export function SkipToContent() {
  const copy = useCopy();
  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-md focus:border focus:border-border focus:bg-surface focus:px-3 focus:py-2 focus:text-13 focus:font-medium focus:text-text focus:shadow-overlay"
    >
      {copy("Skip to content", "Перейти к содержимому", "דלג לתוכן")}
    </a>
  );
}
