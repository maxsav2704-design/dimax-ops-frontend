"use client";

import { AppErrorFallback } from "@/components/AppErrorFallback";
import "./globals.css";

// Last-resort boundary: replaces the root layout, so it must render html/body itself.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <AppErrorFallback error={error} reset={reset} homeHref="/" standalone />
      </body>
    </html>
  );
}
