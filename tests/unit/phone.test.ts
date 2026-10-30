import { describe, expect, it } from "vitest";
import { isValidNepalMobile, maskNumber, normalizePhone, toWhatsAppNumber } from "@/lib/phone";

describe("phone normalization", () => {
  it("accepts a 10-digit Nepali mobile number", () => {
    const result = normalizePhone("9801234567");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.e164).toBe("+9779801234567");
      expect(result.country).toBe("NP");
      expect(result.masked).toContain("•••");
      expect(result.masked.endsWith("67")).toBe(true);
    }
  });

  it("accepts spaces, dashes and country codes", () => {
    for (const input of [
      "+977 980 123 4567",
      "00977-9801234567",
      "9779801234567",
      "+9779801234567",
    ]) {
      const result = normalizePhone(input);
      expect(result.ok, input).toBe(true);
      if (result.ok) expect(result.e164).toBe("+9779801234567");
    }
  });

  it("accepts a Kathmandu landline", () => {
    const result = normalizePhone("01-4123456");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.e164).toBe("+97714123456");
  });

  it("accepts international numbers", () => {
    const result = normalizePhone("+61 412 345 678");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.e164).toBe("+61412345678");
      expect(result.country).toBe("INTL");
    }
  });

  it("rejects short, empty and implausible input", () => {
    expect(normalizePhone("").ok).toBe(false);
    expect(normalizePhone("12345").ok).toBe(false);
    expect(normalizePhone("97000").ok).toBe(false);
    expect(normalizePhone("+999").ok).toBe(false);
    expect(normalizePhone("+1".padEnd(30, "9")).ok).toBe(false);
  });

  it("flags only Nepali mobiles for SMS thresholds", () => {
    expect(isValidNepalMobile("9801234567")).toBe(true);
    expect(isValidNepalMobile("014123456")).toBe(false);
    expect(isValidNepalMobile("+61412345678")).toBe(false);
  });

  it("masks while keeping a short tail", () => {
    expect(maskNumber("+9779801234567")).toBe("+9779••••••67");
    expect(toWhatsAppNumber("+9779801234567")).toBe("9779801234567");
  });
});
