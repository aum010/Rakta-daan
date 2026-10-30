import type { NextRequest } from "next/server";
import { getDb } from "@/db";
import { revokeCurrentSession, getSessionUser } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { assertSameOrigin, clientIpHash, jsonError, jsonOk } from "@/lib/http";

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const user = await getSessionUser();
    const db = getDb();
    await revokeCurrentSession(db);
    if (user) {
      await recordAudit(db, {
        actorUserId: user.id,
        action: "auth.logout",
        entityType: "user",
        entityId: user.id,
        ipHash: clientIpHash(req),
      });
    }
    return jsonOk({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
