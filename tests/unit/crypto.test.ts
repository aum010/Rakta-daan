import { beforeAll, describe, expect, it } from "vitest";

beforeAll(() => {
  process.env.AUTH_SECRET = "unit-test-auth-secret-0000000000000000000000";
  process.env.OTP_PEPPER = "unit-test-otp-pepper-00000000000000000000000";
});

describe("crypto", () => {
  it("round-trips ciphertext", async () => {
    const { encryptString, decryptString } = await import("@/lib/crypto");
    const plaintext = "+9779801234567";
    const encrypted = encryptString(plaintext, "phone");
    expect(encrypted).not.toContain(plaintext);
    expect(encrypted.startsWith("v1.")).toBe(true);
    expect(decryptString(encrypted, "phone")).toBe(plaintext);
  });

  it("produces a different ciphertext every time", async () => {
    const { encryptString } = await import("@/lib/crypto");
    expect(encryptString("same", "phone")).not.toBe(encryptString("same", "phone"));
  });

  it("rejects tampered ciphertext", async () => {
    const { encryptString, decryptString } = await import("@/lib/crypto");
    const encrypted = encryptString("+9779801234567", "phone");
    const parts = encrypted.split(".");
    const ct = parts[3]!;
    parts[3] = `${ct.slice(0, -2)}${ct.endsWith("AA") ? "BB" : "AA"}`;
    expect(() => decryptString(parts.join("."), "phone")).toThrow();
  });

  it("does not decrypt with the wrong purpose", async () => {
    const { encryptString, decryptString } = await import("@/lib/crypto");
    const encrypted = encryptString("secret", "phone");
    expect(() => decryptString(encrypted, "request-contact")).toThrow();
  });

  it("creates deterministic blind indexes that differ by purpose", async () => {
    const { blindIndex } = await import("@/lib/crypto");
    const a = blindIndex("+9779801234567", "phone");
    const b = blindIndex("+9779801234567", "phone");
    const c = blindIndex("+9779801234567", "ip");
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("generates numeric OTPs and unguessable public ids", async () => {
    const { randomDigits, publicId, randomToken, safeEqual } = await import("@/lib/crypto");
    for (let i = 0; i < 50; i += 1) {
      const code = randomDigits(6);
      expect(code).toMatch(/^\d{6}$/);
    }
    const ids = new Set(Array.from({ length: 200 }, () => publicId(10)));
    expect(ids.size).toBe(200);
    expect([...ids][0]).toMatch(/^[0-9A-HJKMNP-TV-Z]{10}$/);
    expect(randomToken(24)).toHaveLength(32);
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
  });
});
