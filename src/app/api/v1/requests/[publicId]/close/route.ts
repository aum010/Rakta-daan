import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { bloodRequests } from "@/db/schema";
import { requireApiUser } from "@/lib/auth";
import { closeRequest } from "@/lib/requests";
import {
  ApiError,
  assertSameOrigin,
  clientIpHash,
  jsonError,
  jsonOk,
  parseJson,
} from "@/lib/http";
import { requestStatusSchema } from "@/lib/validation";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ publicId: string }> },
) {
  try {
    assertSameOrigin(req);
    const user = await requireApiUser();
    const { publicId } = await context.params;
    const body = await parseJson(req, requestStatusSchema);
    const db = getDb();

    const [request] = await db
      .select({ id: bloodRequests.id })
      .from(bloodRequests)
      .where(eq(bloodRequests.publicId, publicId))
      .limit(1);
    if (!request) throw new ApiError(404, "not_found", "Request not found.");

    await closeRequest(db, {
      requestId: request.id,
      userId: user.id,
      status: body.status,
      reason: body.reason,
      ipHash: clientIpHash(req),
      isAdmin: user.isAdmin,
    });

    return jsonOk({ ok: true, status: body.status });
  } catch (error) {
    return jsonError(error);
  }
}
