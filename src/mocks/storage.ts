/**
 * Small, defensive wrappers around localStorage.
 *
 * Demo flows are frontend-only. Everything here is best-effort: private mode,
 * disabled storage or a full quota must never break the page. Server rendering
 * always receives the fallback value.
 */

export function canUseStorage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const key = "__rakta_daan_probe__";
    window.localStorage.setItem(key, "1");
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function readJson<T>(key: string, fallback: T): T {
  if (!canUseStorage()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJson<T>(key: string, value: T): boolean {
  if (!canUseStorage()) return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeStored(key: string): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore — deleting demo data is not worth surfacing an error.
  }
}
