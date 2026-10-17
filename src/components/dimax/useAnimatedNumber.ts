import { useEffect, useRef, useState } from "react";

// E4 motion: a numeric KPI counts from its previous value to the new one in
// ~360 ms (eased), so a change reads as a change; off under reduced motion
// and on the first render (no counting up from zero on page load).

const DURATION_MS = 360;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return true;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return true;
  }
}

export function useAnimatedNumber(target: number): number {
  const [shown, setShown] = useState(target);
  const previous = useRef(target);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const from = previous.current;
    previous.current = target;
    if (from === target) return undefined;
    if (prefersReducedMotion() || typeof window.requestAnimationFrame !== "function" || !Number.isFinite(from) || !Number.isFinite(target)) {
      setShown(target);
      return undefined;
    }
    const started = performance.now();
    const decimals = Math.max(countDecimals(from), countDecimals(target));
    const step = (now: number) => {
      const progress = Math.min(1, (now - started) / DURATION_MS);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = from + (target - from) * eased;
      setShown(progress >= 1 ? target : Number(value.toFixed(decimals)));
      if (progress < 1) frame.current = window.requestAnimationFrame(step);
    };
    frame.current = window.requestAnimationFrame(step);
    return () => {
      if (frame.current != null) window.cancelAnimationFrame(frame.current);
    };
  }, [target]);

  return shown;
}

function countDecimals(value: number): number {
  if (!Number.isFinite(value) || Math.floor(value) === value) return 0;
  return Math.min(2, (value.toString().split(".")[1] || "").length);
}
