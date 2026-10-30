"use client";

import { useSyncExternalStore } from "react";

/**
 * A tiny subscription channel for demo data stored in localStorage.
 *
 * `useDemoDataVersion` returns -1 on the server and during hydration, then 0
 * once the browser store is available. Components can use that boundary to
 * avoid reading browser storage during server rendering without setting state
 * from an effect.
 */
let version = 0;
const listeners = new Set<() => void>();

export function notifyDemoDataChanged(): void {
  version += 1;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key.startsWith("rakta-daan:")) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useDemoDataVersion(): number {
  return useSyncExternalStore(
    subscribe,
    () => version,
    () => -1,
  );
}
