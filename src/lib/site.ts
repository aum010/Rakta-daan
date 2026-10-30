export const SITE_URL = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** Public, indexable routes. Demo and account flows are intentionally excluded. */
export const PUBLIC_PATHS = [
  "",
  "/find",
  "/find/guidance",
  "/banks",
  "/camps",
  "/learn",
  "/learn/faq",
  "/learn/donation-guide",
  "/learn/compatibility",
  "/help",
  "/contact",
  "/consent",
  "/accessibility",
  "/safety",
  "/privacy",
  "/terms",
  "/about",
  "/for-organisations",
] as const;

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
