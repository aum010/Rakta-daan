import type { NextRequest } from "next/server";
import { getDb } from "@/db";
import { camps } from "@/db/schema";
import { requireApiUser } from "@/lib/auth";
import { publicId } from "@/lib/crypto";
import { recordAudit } from "@/lib/audit";
import {
  ApiError,
  assertSameOrigin,
  clientIpHash,
  jsonError,
  jsonOk,
  parseJson,
} from "@/lib/http";
import { campSchema } from "@/lib/validation";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const user = await requireApiUser();
    if (!user.isAdmin) throw new ApiError(403, "forbidden", "Administrator access required.");

    const body = await parseJson(req, campSchema);
    const db = getDb();

    const startsAt = new Date(body.startsAt);
    const endsAt = new Date(body.endsAt);
    if (endsAt <= startsAt) {
      throw new ApiError(422, "invalid_window", "The camp must end after it starts.");
    }

    const slug = `${slugify(body.title) || "camp"}-${publicId(4).toLowerCase()}`;
    const [created] = await db
      .insert(camps)
      .values({
        slug,
        title: body.title,
        titleNe: body.titleNe ?? null,
        description: body.description ?? null,
        provinceCode: body.provinceCode,
        districtCode: body.districtCode,
        venue: body.venue,
        organizerName: body.organizerName,
        contactPhone: body.contactPhone ?? null,
        startsAt,
        endsAt,
        status: "scheduled",
      })
      .returning({ id: camps.id, slug: camps.slug });

    await recordAudit(db, {
      actorUserId: user.id,
      actorRole: "admin",
      action: "camp.created",
      entityType: "camp",
      entityId: created?.id,
      metadata: { district: body.districtCode },
      ipHash: clientIpHash(req),
    });

    return jsonOk({ ok: true, slug: created?.slug }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
