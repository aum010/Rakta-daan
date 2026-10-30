import { sql } from "drizzle-orm";
import type { Db } from "@/db";
import { DISTRICTS, PROVINCES } from "@/data/geography";
import {
  districts,
  donorConsents,
  donors,
  provinces,
  users,
} from "@/db/schema";
import { blindIndex, encryptString } from "@/lib/crypto";
import { maskNumber } from "@/lib/phone";
import { POLICY_VERSION } from "@/lib/constants";

export async function resetDb(db: Db): Promise<void> {
  await db.execute(sql`
    DO $$
    DECLARE r record;
    BEGIN
      FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE';
      END LOOP;
    END $$;
  `);
  await db.insert(provinces).values(PROVINCES);
  await db.insert(districts).values(DISTRICTS);
}

let phoneCounter = 1000;

export function testPhone(): string {
  phoneCounter += 1;
  const suffix = String(phoneCounter).padStart(6, "0");
  return `+97798${suffix}`;
}

export async function createUser(
  db: Db,
  options: { name?: string; isAdmin?: boolean; locale?: string; phone?: string } = {},
) {
  const e164 = options.phone ?? testPhone();
  const phoneHash = blindIndex(e164, "phone");
  const [user] = await db
    .insert(users)
    .values({
      phoneHash,
      phoneEnc: encryptString(e164, "phone"),
      phoneMasked: maskNumber(e164),
      name: options.name ?? "Test User",
      locale: options.locale ?? "en",
      isAdmin: options.isAdmin ?? false,
      phoneVerifiedAt: new Date(),
    })
    .returning();
  if (!user) throw new Error("failed to create user");
  return { user, phone: e164, phoneHash };
}

export async function createDonor(
  db: Db,
  options: {
    donorUserId: string;
    bloodGroup?: "A_POS" | "A_NEG" | "B_POS" | "B_NEG" | "AB_POS" | "AB_NEG" | "O_POS" | "O_NEG";
    districtCode?: string;
    provinceCode?: string;
    availability?: "available" | "unavailable" | "paused";
    availabilityConfirmedAt?: Date;
    lastDonationDate?: string | null;
    deferredUntil?: string | null;
    consentAlerts?: boolean;
    consentSms?: boolean;
    consentWhatsapp?: boolean;
    contactRelease?: boolean;
    dateOfBirth?: string;
    withdrawn?: boolean;
  },
) {
  const [donor] = await db
    .insert(donors)
    .values({
      userId: options.donorUserId,
      bloodGroup: options.bloodGroup ?? "A_POS",
      sex: "male",
      dateOfBirth: options.dateOfBirth ?? "1995-01-01",
      weightKg: 65,
      provinceCode: options.provinceCode ?? "P3",
      districtCode: options.districtCode ?? "KTM",
      availability: options.availability ?? "available",
      availabilityConfirmedAt: options.availabilityConfirmedAt ?? new Date(),
      lastDonationDate: options.lastDonationDate ?? null,
      deferredUntil: options.deferredUntil ?? null,
      consentAlerts: options.consentAlerts ?? true,
      consentSms: options.consentSms ?? true,
      consentWhatsapp: options.consentWhatsapp ?? false,
      consentVersion: POLICY_VERSION,
      withdrawnAt: options.withdrawn ? new Date() : null,
    })
    .returning();
  if (!donor) throw new Error("failed to create donor");

  for (const [kind, granted] of Object.entries({
    terms: true,
    donor_alerts: options.consentAlerts ?? true,
    channel_sms: options.consentSms ?? true,
    channel_whatsapp: options.consentWhatsapp ?? false,
    contact_release_on_response: options.contactRelease ?? true,
  }) as Array<[string, boolean]>) {
    await db.insert(donorConsents).values({
      donorId: donor.id,
      kind: kind as "terms",
      granted,
      policyVersion: POLICY_VERSION,
    });
  }

  return donor;
}
