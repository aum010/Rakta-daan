"use client";

import { useSyncExternalStore } from "react";

/**
 * Demo flows keep their data in localStorage, which does not exist on the
 * server. Rendering that data during the hydration pass would produce markup
 * the server never sent, so these components render a loading shell first and
 * only mount their real UI once the browser has hydrated.
 *
 * `useSyncExternalStore` is used (instead of an effect + setState) because
 * React guarantees the server snapshot is used during hydration and then
 * re-renders with the client value, so server and first client render always
 * agree.
 */
const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export function useHasMounted(): boolean {
  return useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
}