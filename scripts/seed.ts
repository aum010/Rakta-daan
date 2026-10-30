import "./load-env";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import { DISTRICTS, PROVINCES } from "../src/data/geography";
import {
  bloodInventory,
  bloodRequests,
  camps,
  districts,
  donorConsents,
  donors,
  messages,
  organizations,
  orgMembers,
  provinces,
  requestResponses,
  users,
} from "../src/db/schema";
import { blindIndex, encryptString, publicId } from "../src/lib/crypto";
import { POLICY_VERSION } from "../src/lib/constants";
import { maskNumber } from "../src/lib/phone";

const DEMO = process.argv.includes("--demo");

function phone(seq: number): string {
  return `+97798000000${String(seq).padStart(2, "0")}`;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");
  if (DEMO && process.env.NODE_ENV === "production" && process.env.SEED_DEMO !== "1") {
    throw new Error("Refusing to seed demo data in production without SEED_DEMO=1.");
  }

  const client = postgres(url, { max: 1, onnotice: () => {} });
  const db = drizzle(client);

  try {
    console.log("[seed] provinces and districts");
    for (const province of PROVINCES) {
      await db
        .insert(provinces)
        .values(province)
        .onConflictDoUpdate({
          target: provinces.code,
          set: { nameEn: province.nameEn, nameNe: province.nameNe, sortOrder: province.sortOrder },
        });
    }
    for (const district of DISTRICTS) {
      await db
        .insert(districts)
        .values(district)
        .onConflictDoUpdate({
          target: districts.code,
          set: {
            nameEn: district.nameEn,
            nameNe: district.nameNe,
            provinceCode: district.provinceCode,
            latitude: district.latitude,
            longitude: district.longitude,
          },
        });
    }
    console.log(`[seed] ${PROVINCES.length} provinces, ${DISTRICTS.length} districts`);

    if (!DEMO) {
      console.log("[seed] skip demo data (pass --demo to load fixtures)");
      return;
    }

    console.log("[seed] demo accounts (all phone numbers are reserved fixtures)");

    async function upsertUser(input: {
      seq: number;
      name: string;
      locale?: string;
      isAdmin?: boolean;
    }) {
      const e164 = phone(input.seq);
      const phoneHash = blindIndex(e164, "phone");
      const [existing] = await db
        .select()
        .from(users)
        .where(eq(users.phoneHash, phoneHash))
        .limit(1);
      if (existing) return existing;
      const [created] = await db
        .insert(users)
        .values({
          phoneHash,
          phoneEnc: encryptString(e164, "phone"),
          phoneMasked: maskNumber(e164),
          name: input.name,
          locale: input.locale ?? "en",
          isAdmin: input.isAdmin ?? false,
          phoneVerifiedAt: new Date(),
        })
        .returning();
      if (!created) throw new Error("failed to create demo user");
      return created;
    }

    const admin = await upsertUser({ seq: 1, name: "Demo Administrator", isAdmin: true });
    const staff = await upsertUser({ seq: 2, name: "Demo Blood Bank Staff" });
    const requester = await upsertUser({ seq: 3, name: "Demo Requester" });

    const donorFixtures = [
      {
        seq: 10,
        name: "Sita Sharma",
        group: "A_POS" as const,
        district: "KTM",
        province: "P3",
        sex: "female" as const,
        dob: "1996-03-14",
        availability: "available" as const,
        confirmedDaysAgo: 1,
        lastDonation: null,
        sms: true,
        whatsapp: true,
        locale: "en",
      },
      {
        seq: 11,
        name: "Bikash Thapa",
        group: "O_NEG" as const,
        district: "LAL",
        province: "P3",
        sex: "male" as const,
        dob: "1990-08-02",
        availability: "available" as const,
        confirmedDaysAgo: 4,
        lastDonation: "2025-11-10",
        sms: true,
        whatsapp: false,
        locale: "ne",
      },
      {
        seq: 12,
        name: "Anita Gurung",
        group: "A_NEG" as const,
        district: "BHA",
        province: "P3",
        sex: "female" as const,
        dob: "1999-12-21",
        availability: "available" as const,
        confirmedDaysAgo: 2,
        lastDonation: null,
        sms: false,
        whatsapp: true,
        locale: "en",
      },
      {
        seq: 13,
        name: "Ramesh Karki",
        group: "B_POS" as const,
        district: "KTM",
        province: "P3",
        sex: "male" as const,
        dob: "1988-05-09",
        availability: "unavailable" as const,
        confirmedDaysAgo: 3,
        lastDonation: null,
        sms: true,
        whatsapp: false,
        locale: "en",
      },
      {
        seq: 14,
        name: "Puja Rai",
        group: "O_POS" as const,
        district: "KAS",
        province: "P4",
        sex: "female" as const,
        dob: "1994-02-17",
        availability: "available" as const,
        confirmedDaysAgo: 5,
        lastDonation: new Date(Date.now() - 20 * 86400000).toISOString().slice(0, 10),
        sms: true,
        whatsapp: true,
        locale: "ne",
      },
      {
        seq: 15,
        name: "Nabin Shrestha",
        group: "A_POS" as const,
        district: "MOR",
        province: "P1",
        sex: "male" as const,
        dob: "1992-10-30",
        availability: "available" as const,
        confirmedDaysAgo: 62,
        lastDonation: null,
        sms: true,
        whatsapp: false,
        locale: "en",
      },
    ];

    const createdDonors = [];
    for (const fixture of donorFixtures) {
      const user = await upsertUser({ seq: fixture.seq, name: fixture.name, locale: fixture.locale });
      const [existingDonor] = await db
        .select()
        .from(donors)
        .where(eq(donors.userId, user.id))
        .limit(1);
      if (existingDonor) {
        createdDonors.push(existingDonor);
        continue;
      }
      const [donor] = await db
        .insert(donors)
        .values({
          userId: user.id,
          bloodGroup: fixture.group,
          sex: fixture.sex,
          dateOfBirth: fixture.dob,
          weightKg: 60,
          provinceCode: fixture.province,
          districtCode: fixture.district,
          municipality: fixture.district === "KTM" ? "Kathmandu Metropolitan City" : null,
          ward: null,
          availability: fixture.availability,
          availabilityConfirmedAt: new Date(Date.now() - fixture.confirmedDaysAgo * 86400000),
          lastDonationDate: fixture.lastDonation,
          consentAlerts: true,
          consentSms: fixture.sms,
          consentWhatsapp: fixture.whatsapp,
          consentVersion: POLICY_VERSION,
          verification: "phone_verified",
        })
        .returning();
      if (!donor) throw new Error("failed to create demo donor");

      const consents = [
        { kind: "terms" as const, granted: true },
        { kind: "donor_alerts" as const, granted: true },
        { kind: "contact_release_on_response" as const, granted: true },
        { kind: "channel_sms" as const, granted: fixture.sms },
        { kind: "channel_whatsapp" as const, granted: fixture.whatsapp },
      ];
      for (const consent of consents) {
        await db.insert(donorConsents).values({
          donorId: donor.id,
          kind: consent.kind,
          granted: consent.granted,
          policyVersion: POLICY_VERSION,
        });
      }
      createdDonors.push(donor);
    }

    const orgFixtures = [
      {
        slug: "demo-kantipur-blood-bank",
        name: "[Demo] Kantipur Community Blood Bank",
        nameNe: "[नमुना] कान्तिपुर सामुदायिक रक्त बैंक",
        type: "blood_bank" as const,
        verification: "verified" as const,
        districtCode: "KTM",
        provinceCode: "P3",
        address: "Demo address, Kathmandu",
        phone: "+977-1-4000000",
      },
      {
        slug: "demo-pokhara-hospital-blood-unit",
        name: "[Demo] Pokhara Regional Hospital Blood Unit",
        nameNe: "[नमुना] पोखरा प्रादेशिक अस्पताल रक्त इकाई",
        type: "hospital" as const,
        verification: "verified" as const,
        districtCode: "KAS",
        provinceCode: "P4",
        address: "Demo address, Pokhara",
        phone: "+977-61-500000",
      },
      {
        slug: "demo-biratnagar-blood-centre",
        name: "[Demo] Biratnagar Voluntary Blood Centre",
        nameNe: "[नमुना] विराटनगर स्वयंसेवी रक्त केन्द्र",
        type: "blood_bank" as const,
        verification: "pending" as const,
        districtCode: "MOR",
        provinceCode: "P1",
        address: "Demo address, Biratnagar",
        phone: "+977-21-400000",
      },
    ];

    for (const fixture of orgFixtures) {
      const [org] = await db
        .insert(organizations)
        .values({
          ...fixture,
          isDemo: true,
          verifiedAt: fixture.verification === "verified" ? new Date() : null,
          verifiedByUserId: fixture.verification === "verified" ? admin.id : null,
        })
        .onConflictDoNothing({ target: organizations.slug })
        .returning();

      if (!org) continue;

      if (fixture.slug === "demo-kantipur-blood-bank") {
        await db.insert(orgMembers).values({ orgId: org.id, userId: staff.id, role: "owner" });
        const groups = ["A_POS", "A_NEG", "B_POS", "B_NEG", "AB_POS", "AB_NEG", "O_POS", "O_NEG"] as const;
        const units = [6, 2, 4, 1, 3, 0, 5, 1];
        for (let i = 0; i < groups.length; i += 1) {
          await db
            .insert(bloodInventory)
            .values({
              orgId: org.id,
              bloodGroup: groups[i]!,
              component: "whole_blood",
              units: units[i]!,
              source: "manual",
              updatedByUserId: staff.id,
              updatedAt: new Date(Date.now() - 3 * 3600000),
              note: "Demo stock figure",
            })
            .onConflictDoNothing();
        }
      }

      if (fixture.slug === "demo-pokhara-hospital-blood-unit") {
        await db
          .insert(bloodInventory)
          .values({
            orgId: org.id,
            bloodGroup: "O_POS",
            component: "whole_blood",
            units: 2,
            source: "manual",
            updatedByUserId: staff.id,
            updatedAt: new Date(Date.now() - 60 * 3600000),
            note: "Demo stock figure (intentionally stale)",
          })
          .onConflictDoNothing();
      }
    }

    console.log("[seed] demo camps");
    const campStart = new Date(Date.now() + 5 * 86400000);
    const campEnd = new Date(campStart.getTime() + 6 * 3600000);
    await db
      .insert(camps)
      .values({
        slug: "demo-kathmandu-voluntary-camp",
        title: "[Demo] Community blood donation camp",
        titleNe: "[नमुना] सामुदायिक रक्तदान शिविर",
        description:
          "Demo fixture: a walk-in voluntary donation camp. Confirm details with the organiser before travelling.",
        provinceCode: "P3",
        districtCode: "KTM",
        venue: "Demo Community Hall, Kathmandu",
        organizerName: "[Demo] Kantipur Community Blood Bank",
        contactPhone: "+977-1-4000000",
        startsAt: campStart,
        endsAt: campEnd,
        status: "scheduled",
        isDemo: true,
      })
      .onConflictDoNothing({ target: camps.slug });

    console.log("[seed] demo request");
    const [existingRequest] = await db
      .select({ id: bloodRequests.id })
      .from(bloodRequests)
      .where(eq(bloodRequests.publicId, "DEMO123456"))
      .limit(1);

    if (!existingRequest) {
      const [request] = await db
        .insert(bloodRequests)
        .values({
          publicId: "DEMO123456",
          createdByUserId: requester.id,
          bloodGroupNeeded: "B_POS",
          component: "whole_blood",
          unitsNeeded: 2,
          urgency: "urgent",
          provinceCode: "P3",
          districtCode: "KTM",
          hospitalName: "[Demo] Teaching Hospital, Kathmandu",
          neededBy: new Date(Date.now() + 24 * 3600000),
          contactName: "Demo Requester",
          contactPhoneEnc: encryptString(phone(3), "request-contact"),
          contactPhoneMasked: maskNumber(phone(3)),
          clinicalNote: "Demo fixture used to exercise the request dashboard.",
          shareContactPublicly: false,
          expiresAt: new Date(Date.now() + 72 * 3600000),
        })
        .returning();

      if (request && createdDonors[0]) {
        const [response] = await db
          .insert(requestResponses)
          .values({
            requestId: request.id,
            donorId: createdDonors[0].id,
            status: "interested",
            respondToken: publicId(32),
            matchScore: 88,
            distanceKm: 0,
            notifiedAt: new Date(Date.now() - 2 * 3600000),
            respondedAt: new Date(Date.now() - 40 * 60000),
            donorNote: "Demo response: I can come to the hospital this evening.",
          })
          .returning();

        await db.insert(messages).values([
          {
            idempotencyKey: `demo:${request.id}:1`,
            channel: "sms",
            template: "request_alert",
            recipientUserId: null,
            donorId: createdDonors[0].id,
            requestId: request.id,
            toPhoneHash: blindIndex(phone(10), "phone"),
            status: "sent",
            provider: "mock",
            providerMessageId: "mock_demo_1",
            attempts: 1,
            sentAt: new Date(Date.now() - 2 * 3600000),
            payload: { demo: true, locale: "en" },
            consentSnapshot: { demo: true },
          },
          {
            idempotencyKey: `demo:${request.id}:2`,
            channel: "whatsapp",
            template: "request_alert",
            recipientUserId: null,
            donorId: createdDonors[2]?.id ?? null,
            requestId: request.id,
            toPhoneHash: blindIndex(phone(12), "phone"),
            status: "failed",
            provider: "whatsapp_cloud",
            errorCode: "131026",
            errorMessage: "Demo fixture: example provider failure (recipient not on WhatsApp).",
            attempts: 1,
            failedAt: new Date(Date.now() - 90 * 60000),
            payload: { demo: true },
            consentSnapshot: { demo: true },
          },
        ]);

        if (response) {
          console.log("[seed] demo response + message rows created");
        }
      }
    }

    console.log("[seed] demo credentials (development only, OTP login):");
    console.log(`  admin      ${phone(1)}`);
    console.log(`  org staff  ${phone(2)}`);
    console.log(`  requester  ${phone(3)}`);
    console.log(`  donors     ${phone(10)} … ${phone(15)}`);
    console.log(`  demo request /en/requests/DEMO123456`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("[seed] failed", error);
  process.exit(1);
});
