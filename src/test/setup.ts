import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});

// Node 22+ ships a global Web Storage stub that is inert without --localstorage-file
// and shadows jsdom's working localStorage under vitest. Tests that call
// window.localStorage.setItem then throw "setItem is not a function". Give the
// window a real in-memory Storage when the environment's one is not functional.
function installMemoryStorage(name: "localStorage" | "sessionStorage") {
  const existing = (window as unknown as Record<string, unknown>)[name] as Storage | undefined;
  if (existing && typeof existing.setItem === "function" && typeof existing.getItem === "function") {
    return;
  }
  const state = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return state.size;
    },
    clear: () => state.clear(),
    getItem: (key) => state.get(String(key)) ?? null,
    key: (index) => Array.from(state.keys())[index] ?? null,
    removeItem: (key) => {
      state.delete(String(key));
    },
    setItem: (key, value) => {
      state.set(String(key), String(value));
    },
  };
  Object.defineProperty(window, name, { value: storage, configurable: true, writable: true });
}

installMemoryStorage("localStorage");
installMemoryStorage("sessionStorage");

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
