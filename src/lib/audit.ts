import type { Db } from "@/db";
import { auditEvents } from "@/db/schema";

export type AuditInput = {
  actorUserId?: string | null;
  actorRole?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipHash?: string | null;
};

/** Never pass personal data (phone numbers, names, notes) in `metadata`. */
export async function recordAudit(db: Db, input: AuditInput): Promise<void> {
  await db.insert(auditEvents).values({
    actorUserId: input.actorUserId ?? null,
    actorRole: input.actorRole ?? null,
    action: input.action,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    metadata: input.metadata ?? null,
    ipHash: input.ipHash ?? null,
  });
}
