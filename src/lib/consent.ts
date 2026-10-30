import { desc, eq } from "drizzle-orm";
import type { Db } from "@/db";
import { donorConsents } from "@/db/schema";
import { POLICY_VERSION } from "./constants";

export type ConsentKind =
  | "terms"
  | "donor_alerts"
  | "channel_sms"
  | "channel_whatsapp"
  | "contact_release_on_response";

export type ConsentState = Record<ConsentKind, boolean>;

const DEFAULT_STATE: ConsentState = {
  terms: false,
  donor_alerts: false,
  channel_sms: false,
  channel_whatsapp: false,
  contact_release_on_response: false,
};

/** Appends a consent event. Never updates or deletes history. */
export async function recordConsent(
  db: Db,
  input: {
    donorId: string;
    kind: ConsentKind;
    granted: boolean;
    ipHash?: string | null;
    version?: string;
  },
): Promise<void> {
  await db.insert(donorConsents).values({
    donorId: input.donorId,
    kind: input.kind,
    granted: input.granted,
    policyVersion: input.version ?? POLICY_VERSION,
    ipHash: input.ipHash ?? null,
  });
}

/** Latest value per consent kind. */
export async function getDonorConsents(db: Db, donorId: string): Promise<ConsentState> {
  const rows = await db
    .select({
      kind: donorConsents.kind,
      granted: donorConsents.granted,
      createdAt: donorConsents.createdAt,
    })
    .from(donorConsents)
    .where(eq(donorConsents.donorId, donorId))
    .orderBy(desc(donorConsents.createdAt));

  const state: ConsentState = { ...DEFAULT_STATE };
  const seen = new Set<ConsentKind>();
  for (const row of rows) {
    if (seen.has(row.kind)) continue;
    seen.add(row.kind);
    state[row.kind] = row.granted;
  }
  return state;
}

/** Consent plus the matching columns on the donor row must agree. */
export function alertsAllowed(
  consents: ConsentState,
  donor: { consentAlerts: boolean; consentSms: boolean; consentWhatsapp: boolean },
): boolean {
  return (
    consents.donor_alerts &&
    donor.consentAlerts &&
    (consents.channel_sms || consents.channel_whatsapp)
  );
}
