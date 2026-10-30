import { useEffect, useRef, useState } from "react";
import type { ResponseSchema } from "@/lib/api";
import { commercialWrite } from "@/lib/commercial-prices";
import { priceErrorStatus } from "@/lib/factory-prices";
import type { CommercialCopy } from "./copy";

export function useCommercialWrite<T>(path: string, schema: ResponseSchema<T>, onSaved: (row: T) => void) {
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [error, setError] = useState<keyof CommercialCopy | null>(null);
  const [conflictMeta, setConflictMeta] = useState<Record<string, unknown> | null>(null);
  const pending = useRef<object | null>(null);
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; controller.current?.abort(); };
  }, []);

  /** `answered`: the user answered the server's 409 question (e.g. a possible duplicate) and sends a new body. */
  async function save(buildBody: () => object, { answered = false } = {}) {
    if (controller.current || (blocked && !answered)) return;
    if (answered) { pending.current = null; setBlocked(false); setConflictMeta(null); }
    const active = new AbortController();
    controller.current = active;
    const timer = setTimeout(() => active.abort(), 30_000);
    setBusy(true); setError(null);
    try {
      const body = pending.current ?? buildBody();
      pending.current = body;
      const result = await commercialWrite(path, body, schema, active.signal);
      if (mounted.current) onSaved(result);
    } catch (cause) {
      if (!mounted.current) return;
      const status = priceErrorStatus(cause);
      // A 2xx response with an invalid body can still mean the write committed.
      if (status < 400 || status >= 500) { setUncertain(true); setError("uncertain"); }
      else {
        pending.current = null; setUncertain(false);
        setBlocked([401, 403, 404, 409].includes(status));
        // The server's 409 body (ApiError.meta), read duck-typed so test doubles of the api module need no class.
        const meta = status === 409 && typeof cause === "object" && cause !== null && "meta" in cause ? (cause as { meta?: Record<string, unknown> }).meta : undefined;
        setConflictMeta(meta ?? null);
        setError(status === 401 || status === 403 ? "denied" : status === 409 ? "conflict" : "validation");
      }
    } finally {
      clearTimeout(timer); controller.current = null;
      if (mounted.current) setBusy(false);
    }
  }
  return { busy, uncertain, blocked, error, conflictMeta, save, locked: busy || uncertain || blocked };
}
