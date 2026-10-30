import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { bloodInventory, organizations } from "@/db/schema";
import { requireApiUser, requireOrgRole } from "@/lib/auth";
import { RATE_LIMITS } from "@/lib/constants";
import { consumeRateLimit } from "@/lib/rate-limit";
import { recordAudit } from "@/lib/audit";
import {
  ApiError,
  assertSameOrigin,
  clientIpHash,
  jsonError,
  jsonOk,
  parseJson,
} from "@/lib/http";
import { inventoryUpdateSchema } from "@/lib/validation";

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    assertSameOrigin(req);
    const user = await requireApiUser();
    const { slug } = await context.params;
    const body = await parseJson(req, inventoryUpdateSchema);
    const db = getDb();

    const [org] = await db
      .select({ id: organizations.id, name: organizations.name })
      .from(organizations)
      .where(eq(organizations.slug, slug))
      .limit(1);
    if (!org) throw new ApiError(404, "not_found", "Organisation not found.");

    await requireOrgRole(db, user.id, org.id, "editor");

    const limit = await consumeRateLimit(db, {
      bucket: "org_inventory_user",
      key: user.id,
      ...RATE_LIMITS.orgInventoryPerUser,
    });
    if (!limit.allowed) {
      throw new ApiError(429, "rate_limited", "Too many updates. Try again later.");
    }

    const now = new Date();
    for (const update of body.updates) {
      await db
        .insert(bloodInventory)
        .values({
          orgId: org.id,
          bloodGroup: update.bloodGroup,
          component: update.component,
          units: update.units,
          note: update.note ?? null,
          source: "manual",
          updatedByUserId: user.id,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [bloodInventory.orgId, bloodInventory.bloodGroup, bloodInventory.component],
          set: {
            units: update.units,
            note: update.note ?? null,
            updatedByUserId: user.id,
            updatedAt: now,
            source: "manual",
          },
        });
    }

    await recordAudit(db, {
      actorUserId: user.id,
      actorRole: "org_staff",
      action: "inventory.updated",
      entityType: "organization",
      entityId: org.id,
      metadata: {
        rows: body.updates.length,
        groups: body.updates.map((update) => update.bloodGroup),
      },
      ipHash: clientIpHash(req),
    });

    return jsonOk({ ok: true, updatedAt: now.toISOString(), rows: body.updates.length });
  } catch (error) {
    return jsonError(error);
  }
}
