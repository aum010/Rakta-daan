export const NEPAL_TZ = "Asia/Kathmandu";

export function ageInYears(dateOfBirth: string | Date, now: Date = new Date()): number {
  const dob = typeof dateOfBirth === "string" ? new Date(`${dateOfBirth}T00:00:00Z`) : dateOfBirth;
  if (Number.isNaN(dob.getTime())) return -1;
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - dob.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < dob.getUTCDate())) age -= 1;
  return age;
}

export function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / 86_400_000);
}

export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 3_600_000);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

export function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function isPast(date: Date | string | null | undefined, now = new Date()): boolean {
  if (!date) return false;
  return new Date(date).getTime() < now.getTime();
}

/**
 * True when `value` parses as a date/time at or after now. Kept as a module
 * helper so components do not call `Date.now()` during render.
 */
export function isFutureDateTime(value: string): boolean {
  if (!value) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.getTime() >= Date.now();
}

/** e.g. "27 Oct 2026, 4:35 pm" in Nepal time. */
export function formatDateTime(
  date: Date | string,
  locale: "en" | "ne" = "en",
): string {
  const value = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale === "ne" ? "ne-NP" : "en-GB", {
    timeZone: NEPAL_TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(value);
}

export function formatDate(date: Date | string, locale: "en" | "ne" = "en"): string {
  const value = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale === "ne" ? "ne-NP" : "en-GB", {
    timeZone: NEPAL_TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(value);
}

export function formatTimeRange(
  start: Date | string,
  end: Date | string,
  locale: "en" | "ne" = "en",
): string {
  const fmt = new Intl.DateTimeFormat(locale === "ne" ? "ne-NP" : "en-GB", {
    timeZone: NEPAL_TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${fmt.format(new Date(start))} – ${fmt.format(new Date(end))}`;
}

/** "3 hours ago", "in 2 days" — relative, timezone-independent. */
export function relativeTime(
  date: Date | string,
  now: Date = new Date(),
  locale: "en" | "ne" = "en",
): string {
  const value = typeof date === "string" ? new Date(date) : date;
  const diffMs = value.getTime() - now.getTime();
  const abs = Math.abs(diffMs);
  const rtf = new Intl.RelativeTimeFormat(locale === "ne" ? "ne-NP" : "en", {
    numeric: "auto",
  });
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 31_536_000_000],
    ["month", 2_592_000_000],
    ["day", 86_400_000],
    ["hour", 3_600_000],
    ["minute", 60_000],
  ];
  for (const [unit, ms] of units) {
    if (abs >= ms) return rtf.format(Math.round(diffMs / ms), unit);
  }
  return rtf.format(0, "minute");
}

/** Helpers used by server components so time reads stay out of render bodies. */
export function currentTime(): Date {
  return new Date();
}

export function daysFromNow(days: number): Date {
  const now = new Date();
  return new Date(now.getTime() + days * 86_400_000);
}

/** `YYYY-MM-DDTHH:mm` in the runtime's local timezone, for datetime-local inputs. */
export function localDateTimeValue(hoursFromNow: number): string {
  const target = new Date(Date.now() + hoursFromNow * 3_600_000);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}T${pad(target.getHours())}:${pad(target.getMinutes())}`;
}

/** Hours since a timestamp; used for inventory freshness labels. */
export function hoursSince(date: Date | string, now: Date = new Date()): number {
  const value = typeof date === "string" ? new Date(date) : date;
  return Math.floor((now.getTime() - value.getTime()) / 3_600_000);
}
