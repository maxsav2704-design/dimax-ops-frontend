import { useEffect, useState } from "react";

export const CONDENSE_SCROLL_PX = 120;

/** True once the window has scrolled past `threshold` pixels (E3 condensed header). */
export function useScrolledPast(threshold = CONDENSE_SCROLL_PX): boolean {
  const [past, setPast] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const update = () => setPast(window.scrollY > threshold);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [threshold]);
  return past;
}
