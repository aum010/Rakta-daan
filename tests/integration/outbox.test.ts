import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { getDb, type Db } from "@/db";
import { donors, messages, optOuts } from "@/db/schema";
import { blindIndex } from "@/lib/crypto";
import { dispatchQueued, enqueueMessage } from "@/lib/messaging/outbox";
import { createDonor, createUser, resetDb } from "../helpers";

let db: Db;

beforeEach(async () => {
  db = getDb();
  await resetDb(db);
});

async function seedQueuedMessage(options: {
  consentSms?: boolean;
  consentAlerts?: boolean;
} = {}) {
  const donorUser = await createUser(db, { name: "Queued Donor" });
  const donor = await createDonor(db, {
    donorUserId: donorUser.user.id,
    consentSms: options.consentSms ?? true,
    consentAlerts: options.consentAlerts ?? true,
  });
  await enqueueMessage(db, {
    idempotencyKey: `test:${donor.id}`,
    channel: "sms",
    template: "request_alert",
    recipientUserId: donorUser.user.id,
    donorId: donor.id,
    toPhoneHash: donorUser.phoneHash,
    params: { donor_first_name: "Queued" },
    text: "A patient needs blood.",
    consentSnapshot: { channel: "sms" },
  });
  return { donor, donorUser };
}

describe("outbox", () => {
  it("sends through the mock adapter and records simulated state", async () => {
    await seedQueuedMessage();
    const summary = await dispatchQueued(db, { limit: 10 });
    expect(summary.processed).toBe(1);
    expect(summary.sent).toBe(1);
    expect(summary.simulated).toBe(1);

    const [message] = await db.select().from(messages);
    expect(message?.status).toBe("sent");
    expect(message?.provider).toBe("mock");
    expect(message?.providerMessageId).toMatch(/^mock_/);
    expect(message?.sentAt).not.toBeNull();
    expect(message?.deliveredAt).toBeNull();
  });

  it("does not send twice", async () => {
    await seedQueuedMessage();
    await dispatchQueued(db, { limit: 10 });
    const second = await dispatchQueued(db, { limit: 10 });
    expect(second.processed).toBe(0);
  });

  it("re-checks consent at send time", async () => {
    const { donor } = await seedQueuedMessage();
    await db
      .update(donors)
      .set({ consentAlerts: false })
      .where(eq(donors.id, donor.id));

    const summary = await dispatchQueued(db, { limit: 10 });
    expect(summary.skipped).toBe(1);
    const [message] = await db.select().from(messages);
    expect(message?.status).toBe("skipped");
    expect(message?.errorCode).toBe("consent_withdrawn");
  });

  it("honours phone-level opt-outs", async () => {
    const { donorUser } = await seedQueuedMessage();
    await db.insert(optOuts).values({
      phoneHash: blindIndex(donorUser.phone, "phone"),
      channel: "sms",
      reason: "test STOP",
    });

    const summary = await dispatchQueued(db, { limit: 10 });
    expect(summary.skipped).toBe(1);
    const [message] = await db.select().from(messages);
    expect(message?.errorCode).toBe("opted_out");
  });

  it("skips messages for deleted recipients", async () => {
    const { donorUser } = await seedQueuedMessage();
    await db
      .update(donors)
      .set({ withdrawnAt: new Date() })
      .where(eq(donors.userId, donorUser.user.id));

    const summary = await dispatchQueued(db, { limit: 10 });
    expect(summary.skipped).toBe(1);
    const [message] = await db.select().from(messages);
    expect(message?.status).toBe("skipped");
  });

  it("is idempotent at enqueue time", async () => {
    const { donor, donorUser } = await seedQueuedMessage();
    const inserted = await enqueueMessage(db, {
      idempotencyKey: `test:${donor.id}`,
      channel: "sms",
      template: "request_alert",
      recipientUserId: donorUser.user.id,
      donorId: donor.id,
      toPhoneHash: donorUser.phoneHash,
      params: {},
      text: "duplicate",
      consentSnapshot: {},
    });
    expect(inserted).toBe(false);
    const rows = await db.select().from(messages);
    expect(rows).toHaveLength(1);
  });
});
