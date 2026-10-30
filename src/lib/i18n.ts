import { en, type Dictionary } from "@/messages/en";
import { ne } from "@/messages/ne";

export const LOCALES = ["en", "ne"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

const DICTIONARIES: Record<Locale, Dictionary> = { en, ne };

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale] ?? DICTIONARIES.en;
}

/** Replaces {placeholder} tokens. Unknown tokens are left untouched. */
export function format(
  template: string,
  params: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in params ? String(params[key]) : match,
  );
}

export function localizedPath(locale: Locale, path = ""): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `/${locale}${clean === "/" ? "" : clean}`;
}

export function otherLocale(locale: Locale): Locale {
  return locale === "en" ? "ne" : "en";
}

/** Swaps the locale segment of a path such as /en/find. */
export function switchLocalePath(pathname: string, locale: Locale): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length > 0 && isLocale(segments[0])) {
    segments[0] = locale;
    return `/${segments.join("/")}`;
  }
  return `/${locale}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}

export function htmlLang(locale: Locale): string {
  return locale === "ne" ? "ne-NP" : "en";
}
