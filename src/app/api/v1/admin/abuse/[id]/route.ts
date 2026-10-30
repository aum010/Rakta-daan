import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { abuseReports } from "@/db/schema";
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

const schema = z.object({
  status: z.enum(["reviewing", "resolved", "dismissed"]),
  note: z.string().trim().max(300).optional(),
});

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(req);
    const user = await requireApiUser();
    if (!user.isAdmin) throw new ApiError(403, "forbidden", "Administrator access required.");

    const { id } = await context.params;
    const body = await parseJson(req, schema);
    const db = getDb();

    const [updated] = await db
      .update(abuseReports)
      .set({
        status: body.status,
        resolutionNote: body.note ?? null,
        resolvedAt: body.status === "reviewing" ? null : new Date(),
        resolvedByUserId: body.status === "reviewing" ? null : user.id,
      })
      .where(eq(abuseReports.id, id))
      .returning({ id: abuseReports.id });

    if (!updated) throw new ApiError(404, "not_found", "Report not found.");

    await recordAudit(db, {
      actorUserId: user.id,
      actorRole: "admin",
      action: `abuse.${body.status}`,
      entityType: "abuse_report",
      entityId: id,
      metadata: { note: body.note ?? null },
      ipHash: clientIpHash(req),
    });

    return jsonOk({ ok: true, status: body.status });
  } catch (error) {
    return jsonError(error);
  }
}
