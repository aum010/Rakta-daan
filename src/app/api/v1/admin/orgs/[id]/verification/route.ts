import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { organizations } from "@/db/schema";
import { requireApiUser } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import {
  ApiError,
  assertSameOrigin,
  clientIpHash,
  jsonError,
  jsonOk,
  parseJson,
} from "@/lib/http";
import { orgVerificationSchema } from "@/lib/validation";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(req);
    const user = await requireApiUser();
    if (!user.isAdmin) throw new ApiError(403, "forbidden", "Administrator access required.");

    const { id } = await context.params;
    const body = await parseJson(req, orgVerificationSchema);
    const db = getDb();

    const [org] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.id, id))
      .limit(1);
    if (!org) throw new ApiError(404, "not_found", "Organisation not found.");

    const verification =
      body.action === "verify" ? "verified" : body.action === "reject" ? "rejected" : "suspended";

    await db
      .update(organizations)
      .set({
        verification,
        verificationNote: body.note ?? null,
        verifiedAt: verification === "verified" ? new Date() : null,
        verifiedByUserId: verification === "verified" ? user.id : null,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, org.id));

    await recordAudit(db, {
      actorUserId: user.id,
      actorRole: "admin",
      action: `organization.${verification}`,
      entityType: "organization",
      entityId: org.id,
      metadata: { note: body.note ?? null },
      ipHash: clientIpHash(req),
    });

    return jsonOk({ ok: true, verification });
  } catch (error) {
    return jsonError(error);
  }
}
