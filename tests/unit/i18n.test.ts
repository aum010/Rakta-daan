import { describe, expect, it } from "vitest";
import { en } from "@/messages/en";
import { ne } from "@/messages/ne";
import {
  format,
  getDictionary,
  htmlLang,
  isLocale,
  LOCALES,
  otherLocale,
  switchLocalePath,
} from "@/lib/i18n";

function keyPaths(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object") return [prefix];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    keyPaths(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe("i18n", () => {
  it("has identical key structure in both languages", () => {
    expect(keyPaths(ne).sort()).toEqual(keyPaths(en).sort());
  });

  it("has no empty translations", () => {
    for (const locale of LOCALES) {
      const dict = getDictionary(locale);
      for (const path of keyPaths(dict)) {
        const value = path
          .split(".")
          .reduce<unknown>((acc, key) => (acc as Record<string, unknown>)[key], dict);
        expect(typeof value, path).toBe("string");
        expect((value as string).trim().length, `${locale}:${path}`).toBeGreaterThan(0);
      }
    }
  });

  it("validates locale codes", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("ne")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
    expect(otherLocale("en")).toBe("ne");
    expect(htmlLang("ne")).toBe("ne-NP");
  });

  it("interpolates known placeholders only", () => {
    expect(format("Hello {name}, {missing}", { name: "Sita" })).toBe("Hello Sita, {missing}");
    expect(format("No placeholders", {})).toBe("No placeholders");
  });

  it("swaps locale segments safely", () => {
    expect(switchLocalePath("/en/find", "ne")).toBe("/ne/find");
    expect(switchLocalePath("/ne", "en")).toBe("/en");
    expect(switchLocalePath("/requests/ABC", "ne")).toBe("/ne/requests/ABC");
  });

  it("keeps the Nepali copy distinct from English", () => {
    expect(ne.home.heroTitle).not.toBe(en.home.heroTitle);
    expect(ne.common.privacy).toContain("गोपनीयता");
  });
});
