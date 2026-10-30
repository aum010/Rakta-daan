import { describe, expect, it } from "vitest";
import {
  createDemoReference,
  isValidDemoReference,
  normalizeDemoReference,
} from "@/mocks/id";

describe("demo references", () => {
  it("creates human-readable references without ambiguous characters", () => {
    const reference = createDemoReference(() => 0, 6);
    expect(reference).toBe("DEMO-222222");
    expect(reference).toMatch(/^DEMO-[2-9A-HJ-NP-Z]{6}$/);
  });

  it("clamps the final alphabet position safely", () => {
    expect(createDemoReference(() => 0.999999, 6)).toBe("DEMO-ZZZZZZ");
    expect(createDemoReference(() => 1, 3)).toBe("DEMO-ZZZ");
  });

  it("normalises case and whitespace", () => {
    expect(normalizeDemoReference("  demo-abc234 ")).toBe("DEMO-ABC234");
    expect(normalizeDemoReference("demo - abc234")).toBe("DEMO-ABC234");
  });

  it("validates only the intended format", () => {
    expect(isValidDemoReference("demo-abc234")).toBe(true);
    expect(isValidDemoReference("DEMO-ABC234")).toBe(true);
    expect(isValidDemoReference("DEMO-ABC23")).toBe(false);
    expect(isValidDemoReference("DEMO-ABC23O")).toBe(false);
    expect(isValidDemoReference("ABC-ABC234")).toBe(false);
  });
});
