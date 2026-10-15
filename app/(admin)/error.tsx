"use client";

import { AppErrorFallback } from "@/components/AppErrorFallback";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <AppErrorFallback error={error} reset={reset} homeHref="/" />;
}
