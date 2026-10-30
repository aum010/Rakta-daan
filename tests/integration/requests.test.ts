import { beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { getDb, type Db } from "@/db";
import { bloodRequests, messages, requestResponses } from "@/db/schema";
import { createBloodRequest, closeRequest, expireStaleRequests, submitResponse } from "@/lib/requests";
import { ApiError } from "@/lib/http";
import { createDonor, createUser, resetDb } from "../helpers";
import type { CreateRequestInput } from "@/lib/requests";

let db: Db;

beforeEach(async () => {
  db = getDb();
  await resetDb(db);
});

function input(overrides: Partial<CreateRequestInput> = {}): CreateRequestInput {
  return {
    bloodGroupNeeded: "A_POS",
    component: "whole_blood",
    unitsNeeded: 2,
    urgency: "urgent",
    provinceCode: "P3",
    districtCode: "KTM",
    hospitalName: "Test Teaching Hospital",
    neededBy: new Date(Date.now() + 6 * 3_600_000).toISOString(),
    contactName: "Requester",
    contactPhone: "9812345678",
    shareContactPublicly: false,
    notifyRadiusKm: 75,
    ...overrides,
  };
}

async function requester() {
  return (await createUser(db, { name: "Req User" })).user;
}

describe("blood request lifecycle", () => {
  it("notifies only eligible, consented, compatible donors", async () => {
    const owner = await requester();

    const good = await createUser(db, { name: "Good Donor" });
    const goodDonor = await createDonor(db, {
      donorUserId: good.user.id,
      bloodGroup: "A_POS",
      districtCode: "KTM",
    });

    const cooldown = await createUser(db, { name: "Recent Donor" });
    await createDonor(db, {
      donorUserId: cooldown.user.id,
      bloodGroup: "A_POS",
      lastDonationDate: new Date(Date.now() - 10 * 86_400_000).toISOString().slice(0, 10),
    });

    const stale = await createUser(db, { name: "Stale Donor" });
    await createDonor(db, {
      donorUserId: stale.user.id,
      bloodGroup: "O_NEG",
      availabilityConfirmedAt: new Date(Date.now() - 45 * 86_400_000),
    });

    const noConsent = await createUser(db, { name: "No Consent" });
    await createDonor(db, { donorUserId: noConsent.user.id, bloodGroup: "A_POS", consentAlerts: false });

    const wrongGroup = await createUser(db, { name: "B Donor" });
    await createDonor(db, { donorUserId: wrongGroup.user.id, bloodGroup: "B_POS" });

    const farAway = await createUser(db, { name: "Humla Donor" });
    await createDonor(db, {
      donorUserId: farAway.user.id,
      bloodGroup: "A_POS",
      districtCode: "HUM",
      provinceCode: "P6",
    });

    const created = await createBloodRequest(db, { userId: owner.id, input: input(), ipHash: null });

    expect(created.notified.notified).toBe(1);
    const responses = await db.select().from(requestResponses);
    expect(responses).toHaveLength(1);
    expect(responses[0]?.donorId).toBe(goodDonor.id);

    const queued = await db.select().from(messages);
    expect(queued).toHaveLength(1);
    expect(queued[0]?.status).toBe("sent");
    expect(queued[0]?.provider).toBe("mock");
    expect(queued[0]?.deliveredAt).toBeNull();
  });

  it("never contacts the requester as their own donor", async () => {
    const owner = await createUser(db, { name: "Also A Donor" });
    await createDonor(db, { donorUserId: owner.user.id, bloodGroup: "O_NEG" });

    const created = await createBloodRequest(db, { userId: owner.user.id, input: input(), ipHash: null });
    expect(created.notified.notified).toBe(0);
  });

  it("blocks a duplicate open request for the same district and group", async () => {
    const owner = await requester();
    await createBloodRequest(db, { userId: owner.id, input: input(), ipHash: null });
    await expect(
      createBloodRequest(db, { userId: owner.id, input: input(), ipHash: null }),
    ).rejects.toMatchObject({ code: "duplicate_request" });
  });

  it("lets an alerted donor respond and notifies the requester", async () => {
    const owner = await requester();
    const donorUser = await createUser(db, { name: "Willing Donor" });
    await createDonor(db, { donorUserId: donorUser.user.id, bloodGroup: "A_POS" });

    const created = await createBloodRequest(db, { userId: owner.id, input: input(), ipHash: null });
    const [response] = await db.select().from(requestResponses);
    expect(response).toBeDefined();

    const result = await submitResponse(db, {
      requestPublicId: created.publicId,
      donorId: response!.donorId,
      action: "interested",
      note: "Can come at 6pm",
      ipHash: null,
    });
    expect(result.status).toBe("interested");

    const [updated] = await db
      .select()
      .from(requestResponses)
      .where(eq(requestResponses.id, response!.id));
    expect(updated?.status).toBe("interested");
    expect(updated?.donorNote).toBe("Can come at 6pm");

    const requesterMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.template, "requester_update"));
    expect(requesterMessages.length).toBe(1);
    expect(requesterMessages[0]?.status).toBe("sent");
  });

  it("requires contact-sharing consent before declaring interest", async () => {
    const owner = await requester();
    const donorUser = await createUser(db, { name: "Private Donor" });
    await createDonor(db, {
      donorUserId: donorUser.user.id,
      bloodGroup: "A_POS",
      contactRelease: false,
    });
    const created = await createBloodRequest(db, { userId: owner.id, input: input(), ipHash: null });
    const [response] = await db.select().from(requestResponses);

    await expect(
      submitResponse(db, {
        requestPublicId: created.publicId,
        donorId: response!.donorId,
        action: "interested",
        ipHash: null,
      }),
    ).rejects.toMatchObject({ code: "contact_consent_required" });
  });

  it("allows a registered donor to volunteer without being alerted", async () => {
    const owner = await requester();
    const volunteer = await createUser(db, { name: "Volunteer" });
    const volunteerDonor = await createDonor(db, {
      donorUserId: volunteer.user.id,
      bloodGroup: "O_NEG",
      districtCode: "KTM",
      consentAlerts: false,
      consentSms: false,
      consentWhatsapp: false,
    });
    const created = await createBloodRequest(db, { userId: owner.id, input: input(), ipHash: null });

    // No alerts because consent was withheld.
    expect((await db.select().from(messages)).length).toBe(0);

    const result = await submitResponse(db, {
      requestPublicId: created.publicId,
      donorId: volunteerDonor.id,
      action: "interested",
      ipHash: null,
    });
    expect(result.status).toBe("interested");
    const [row] = await db.select().from(requestResponses);
    expect(row?.status).toBe("interested");
    expect(row?.notifiedAt).toBeNull();
  });

  it("rejects a token that belongs to another response", async () => {
    const owner = await requester();
    const otherDonorUser = await createUser(db, { name: "Other Donor" });
    await createDonor(db, { donorUserId: otherDonorUser.user.id, bloodGroup: "A_POS" });
    const created = await createBloodRequest(db, { userId: owner.id, input: input(), ipHash: null });
    const [response] = await db.select().from(requestResponses);

    await expect(
      submitResponse(db, {
        requestPublicId: created.publicId,
        donorId: response!.donorId,
        action: "interested",
        ipHash: null,
        respondToken: "wrong-token",
      }),
    ).rejects.toMatchObject({ code: "invalid_token" });
  });

  it("closes and expires requests", async () => {
    const owner = await requester();
    const created = await createBloodRequest(db, { userId: owner.id, input: input(), ipHash: null });

    await closeRequest(db, {
      requestId: created.id,
      userId: owner.id,
      status: "fulfilled",
      ipHash: null,
    });
    const [closed] = await db.select().from(bloodRequests);
    expect(closed?.status).toBe("fulfilled");

    const otherUser = await createUser(db, { name: "Someone Else" });
    await expect(
      closeRequest(db, {
        requestId: created.id,
        userId: otherUser.user.id,
        status: "cancelled",
        ipHash: null,
      }),
    ).rejects.toBeInstanceOf(ApiError);

    await db
      .update(bloodRequests)
      .set({ status: "open", expiresAt: new Date(Date.now() - 1000) })
      .where(eq(bloodRequests.id, created.id));
    expect(await expireStaleRequests(db)).toBe(1);
  });

  it("never stores the requester's phone in the clear", async () => {
    const owner = await requester();
    await createBloodRequest(db, { userId: owner.id, input: input(), ipHash: null });
    const [row] = await db
      .select()
      .from(bloodRequests)
      .where(and(eq(bloodRequests.contactName, "Requester")));
    expect(row?.contactPhoneEnc).not.toContain("9812345678");
    expect(row?.contactPhoneEnc?.startsWith("v1.")).toBe(true);
    expect(row?.contactPhoneMasked).toContain("•••");
  });
});
