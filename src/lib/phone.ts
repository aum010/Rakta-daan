/**
 * Phone normalisation. Nepal-first, but accepts international numbers.
 * Nepali mobile numbers are 10 digits starting 97/98; landlines are 9 digits
 * including the leading 0 (e.g. 01-4XXXXXX). International input must include
 * a country code (+ or 00 prefix) and 8-15 digits.
 */

export type PhoneResult =
  | { ok: true; e164: string; masked: string; country: "NP" | "INTL" }
  | { ok: false; error: "empty" | "invalid" | "too_long" };

const NP_MOBILE = /^9[678]\d{8}$/;
const NP_LANDLINE = /^0\d{8,9}$/;
const NP_WITH_CODE = /^977(\d{9,10})$/;
const INTL = /^\+([1-9]\d{7,14})$/;

export function normalizePhone(raw: string | null | undefined): PhoneResult {
  if (!raw || !raw.trim()) return { ok: false, error: "empty" };
  let value = raw.trim().replace(/[\s()\-.]/g, "");
  if (value.startsWith("00")) value = `+${value.slice(2)}`;
  if (value.length > 20) return { ok: false, error: "too_long" };

  if (value.startsWith("+")) {
    const match = INTL.exec(value);
    if (!match) return { ok: false, error: "invalid" };
    const digits = match[1]!;
    if (digits.startsWith("977")) {
      return finishNepal(digits.slice(3));
    }
    return { ok: true, e164: `+${digits}`, masked: maskNumber(`+${digits}`), country: "INTL" };
  }

  if (NP_MOBILE.test(value)) return finishNepal(value);
  if (NP_LANDLINE.test(value)) return finishNepal(value.slice(1));
  const withCode = NP_WITH_CODE.exec(value);
  if (withCode) return finishNepal(withCode[1]!);

  return { ok: false, error: "invalid" };
}

function finishNepal(national: string): PhoneResult {
  // Mobile numbers are 10 digits; landline numbers are 8 digits without the trunk 0.
  if (!/^\d{8,10}$/.test(national)) return { ok: false, error: "invalid" };
  const e164 = `+977${national}`;
  return { ok: true, e164, masked: maskNumber(e164), country: "NP" };
}

export function maskNumber(e164: string): string {
  const visibleTail = e164.slice(-2);
  const prefix = e164.slice(0, 5);
  return `${prefix}••••••${visibleTail}`;
}

/** WhatsApp expects digits only, no plus. */
export function toWhatsAppNumber(e164: string): string {
  return e164.replace(/\D/g, "");
}

export function isValidNepalMobile(raw: string | null | undefined): boolean {
  const result = normalizePhone(raw);
  return result.ok && result.country === "NP" && /^\+9779[678]\d{8}$/.test(result.e164);
}
