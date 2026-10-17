import { useEffect } from "react";

// E2 linked highlighting. Elements declare `data-entity="installer:<id>"` (or
// `project:<id>`, `door:<id>`); hovering or focusing one occurrence marks every
// occurrence on the page with `.is-linked`. One delegated listener set per page.

const LINKED = "is-linked";

function selectorFor(key: string): string {
  return `[data-entity="${key.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"]`;
}

export function entityKey(kind: "installer" | "project" | "door", id: string | number): string {
  return `${kind}:${id}`;
}

export function useEntityHighlight(enabled = true) {
  useEffect(() => {
    if (!enabled || typeof document === "undefined") return undefined;
    let current: string | null = null;
    const apply = (key: string | null) => {
      if (key === current) return;
      if (current) document.querySelectorAll(selectorFor(current)).forEach((el) => el.classList.remove(LINKED));
      current = key;
      if (key) document.querySelectorAll(selectorFor(key)).forEach((el) => el.classList.add(LINKED));
    };
    const keyOf = (target: EventTarget | null) => {
      const el = target instanceof Element ? target.closest("[data-entity]") : null;
      return el ? el.getAttribute("data-entity") : null;
    };
    const onEnter = (event: Event) => apply(keyOf(event.target));
    const onMouseOut = (event: MouseEvent) => {
      if (!keyOf(event.relatedTarget)) apply(null);
    };
    const onFocusOut = (event: FocusEvent) => {
      if (!keyOf(event.relatedTarget)) apply(null);
    };
    document.addEventListener("mouseover", onEnter);
    document.addEventListener("mouseout", onMouseOut);
    document.addEventListener("focusin", onEnter);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("mouseover", onEnter);
      document.removeEventListener("mouseout", onMouseOut);
      document.removeEventListener("focusin", onEnter);
      document.removeEventListener("focusout", onFocusOut);
      apply(null);
    };
  }, [enabled]);
}
