import { describe, expect, it } from "vitest";
import {
  addDays,
  ageInYears,
  formatDate,
  formatDateTime,
  hoursSince,
  localDateTimeValue,
  relativeTime,
} from "@/lib/dates";

describe("dates", () => {
  const now = new Date("2026-10-26T12:00:00Z");

  it("computes age with birthday awareness", () => {
    expect(ageInYears("2008-10-26", now)).toBe(18);
    expect(ageInYears("2008-10-27", now)).toBe(17);
    expect(ageInYears("2008-10-25", now)).toBe(18);
    expect(ageInYears("1961-10-26", now)).toBe(65);
    expect(ageInYears("not-a-date", now)).toBe(-1);
  });

  it("formats in Nepal time", () => {
    // 12:00 UTC is 17:45 in Kathmandu.
    const formatted = formatDateTime(now, "en");
    expect(formatted).toContain("26 Oct 2026");
    expect(formatted).toMatch(/5:45/);
    expect(formatDate(now, "ne")).toContain("२०२६");
  });

  it("reports relative time", () => {
    expect(relativeTime(new Date(now.getTime() - 3 * 3_600_000), now)).toContain("3 hours");
    expect(relativeTime(new Date(now.getTime() + 2 * 86_400_000), now)).toContain("2 days");
  });

  it("counts hours since a timestamp", () => {
    expect(hoursSince(new Date(now.getTime() - 5 * 3_600_000), now)).toBe(5);
  });

  it("produces datetime-local values", () => {
    expect(localDateTimeValue(6)).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  it("adds days without mutating the input", () => {
    const start = new Date("2026-01-01T00:00:00Z");
    const later = addDays(start, 10);
    expect(later.toISOString().slice(0, 10)).toBe("2026-01-11");
    expect(start.toISOString().slice(0, 10)).toBe("2026-01-01");
  });
});
