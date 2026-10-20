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
  const pending = useRef<object | null>(null);
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; controller.current?.abort(); };
  }, []);

  async function save(buildBody: () => object) {
    if (controller.current || blocked) return;
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
        setError(status === 401 || status === 403 ? "denied" : status === 409 ? "conflict" : "validation");
      }
    } finally {
      clearTimeout(timer); controller.current = null;
      if (mounted.current) setBusy(false);
    }
  }
  return { busy, uncertain, blocked, error, save, locked: busy || uncertain || blocked };
}
