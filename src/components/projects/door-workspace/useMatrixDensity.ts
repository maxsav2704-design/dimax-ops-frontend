import { useEffect, useState } from "react";

import { defaultMatrixDensity, MATRIX_DENSITY_STORAGE_KEY, type MatrixDensity } from "./matrix-shared";

const EVENT = "dmx:matrix-density";

function readStored(): string | null {
  try {
    return window.localStorage.getItem(MATRIX_DENSITY_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Matrix density shared by the preview grid and the full matrix: read once per
 * mount (default by project size), kept in sync between instances through a
 * window event, remembered per browser.
 */
export function useMatrixDensity(totalDoors: number): [MatrixDensity, (next: MatrixDensity) => void] {
  const [density, setDensityState] = useState<MatrixDensity>(() =>
    typeof window === "undefined" ? "cards" : defaultMatrixDensity(totalDoors, readStored()),
  );
  useEffect(() => {
    if (readStored() === null) setDensityState(defaultMatrixDensity(totalDoors, null));
  }, [totalDoors]);
  useEffect(() => {
    const onChange = (event: Event) => {
      const next = (event as CustomEvent<MatrixDensity>).detail;
      if (next === "rows" || next === "cards") setDensityState(next);
    };
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);
  const setDensity = (next: MatrixDensity) => {
    setDensityState(next);
    try {
      window.localStorage.setItem(MATRIX_DENSITY_STORAGE_KEY, next);
    } catch {
      /* storage unavailable: the choice lives for this page */
    }
    window.dispatchEvent(new CustomEvent<MatrixDensity>(EVENT, { detail: next }));
  };
  return [density, setDensity];
}
