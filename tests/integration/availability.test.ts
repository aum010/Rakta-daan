import { beforeEach, describe, expect, it } from "vitest";
import { getDb, type Db } from "@/db";
import { bloodInventory, organizations } from "@/db/schema";
import { availabilitySummary } from "@/lib/requests";
import { consumeRateLimit } from "@/lib/rate-limit";
import { createDonor, createUser, resetDb } from "../helpers";

let db: Db;

beforeEach(async () => {
  db = getDb();
  await resetDb(db);
});

async function bank(options: {
  slug: string;
  verification: "verified" | "pending" | "suspended";
  provinceCode?: string;
  districtCode?: string;
  units?: number;
  updatedHoursAgo?: number;
}) {
  const [org] = await db
    .insert(organizations)
    .values({
      slug: options.slug,
      name: `Bank ${options.slug}`,
      type: "blood_bank",
      verification: options.verification,
      provinceCode: options.provinceCode ?? "P3",
      districtCode: options.districtCode ?? "KTM",
      isPublic: true,
      phone: "+977-1-0000000",
    })
    .returning();
  if (!org) throw new Error("org");
  if (options.units !== undefined) {
    await db.insert(bloodInventory).values({
      orgId: org.id,
      bloodGroup: "A_POS",
      component: "whole_blood",
      units: options.units,
      updatedAt: new Date(Date.now() - (options.updatedHoursAgo ?? 1) * 3_600_000),
    });
  }
  return org;
}

describe("availability summary", () => {
  it("hides exact counts below three donors", async () => {
    const one = await createUser(db, { name: "One" });
    await createDonor(db, { donorUserId: one.user.id, bloodGroup: "A_POS" });

    const single = await availabilitySummary(db, { bloodGroup: "A_POS", districtCode: "KTM" });
    expect(single.donorCount).toBe("few");
    expect(single.exactDonorCount).toBe(1);

    for (const name of ["Two", "Three"]) {
      const extra = await createUser(db, { name });
      await createDonor(db, { donorUserId: extra.user.id, bloodGroup: "O_NEG" });
    }
    const trio = await availabilitySummary(db, { bloodGroup: "A_POS", districtCode: "KTM" });
    expect(trio.donorCount).toBe(3);
  });

  it("returns compatible groups and excludes ineligible donors", async () => {
    const good = await createUser(db, { name: "Good" });
    await createDonor(db, { donorUserId: good.user.id, bloodGroup: "O_POS" });
    const incompatible = await createUser(db, { name: "Bad" });
    await createDonor(db, { donorUserId: incompatible.user.id, bloodGroup: "B_POS" });
    const stale = await createUser(db, { name: "Stale" });
    await createDonor(db, {
      donorUserId: stale.user.id,
      bloodGroup: "A_POS",
      availabilityConfirmedAt: new Date(Date.now() - 60 * 86_400_000),
    });

    const summary = await availabilitySummary(db, { bloodGroup: "A_POS", districtCode: "KTM" });
    expect(summary.exactDonorCount).toBe(1);
    expect(summary.compatibleGroups).toEqual(["O_POS"]);
  });

  it("lists verified banks first and marks stale stock", async () => {
    await bank({ slug: "pending-bank", verification: "pending", units: 4 });
    await bank({ slug: "verified-bank", verification: "verified", units: 2, updatedHoursAgo: 60 });
    await bank({ slug: "suspended-bank", verification: "suspended", units: 9 });

    const summary = await availabilitySummary(db, { bloodGroup: "A_POS", districtCode: "KTM" });
    expect(summary.banks.map((entry) => entry.slug)).toEqual(["verified-bank", "pending-bank"]);
    const verified = summary.banks[0];
    expect(verified?.units).toBe(2);
    expect(verified?.stale).toBe(true);
    expect(summary.banks[1]?.stale).toBe(false);
  });

  it("filters banks outside the radius", async () => {
    await bank({ slug: "far-bank", verification: "verified", districtCode: "HUM", provinceCode: "P6" });
    const summary = await availabilitySummary(db, {
      bloodGroup: "A_POS",
      districtCode: "KTM",
      radiusKm: 50,
    });
    expect(summary.banks).toHaveLength(0);
  });
});

describe("rate limiting", () => {
  it("blocks once the window quota is exhausted", async () => {
    // Pin the clock so a minute boundary crossed mid-test cannot reset the window.
    const now = new Date();
    const options = { bucket: "test_bucket", key: "k1", limit: 2, windowSeconds: 60, now };
    expect((await consumeRateLimit(db, options)).allowed).toBe(true);
    expect((await consumeRateLimit(db, options)).allowed).toBe(true);
    const blocked = await consumeRateLimit(db, options);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("isolates keys and windows", async () => {
    const now = new Date();
    const base = { bucket: "test_bucket", limit: 1, windowSeconds: 60, now };
    await consumeRateLimit(db, { ...base, key: "a" });
    expect((await consumeRateLimit(db, { ...base, key: "b" })).allowed).toBe(true);
    const future = new Date(now.getTime() + 120_000);
    expect((await consumeRateLimit(db, { ...base, key: "a", now: future })).allowed).toBe(true);
  });
});
