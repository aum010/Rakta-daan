import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { getDb, type Db } from "@/db";
import { orgMembers, sessions, users, type User } from "@/db/schema";
import { randomToken, sha256Hex, blindIndex, hashIp } from "./crypto";
import { SESSION_TTL_DAYS } from "./constants";
import { env } from "./env";
import { ApiError } from "./http";

export const SESSION_COOKIE = "rd_session";

export type SessionUser = {
  id: string;
  name: string;
  locale: string;
  isAdmin: boolean;
  phoneMasked: string;
  phoneVerifiedAt: Date | null;
};

export async function createSession(
  db: Db,
  userId: string,
  meta: { ip?: string | null; userAgent?: string | null } = {},
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 86_400_000);
  await db.insert(sessions).values({
    userId,
    tokenHash: sha256Hex(token),
    ipHash: hashIp(meta.ip ?? null),
    userAgent: meta.userAgent?.slice(0, 300) ?? null,
    expiresAt,
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProduction,
    path: "/",
    expires: expiresAt,
  });
  return { token, expiresAt };
}

export async function revokeCurrentSession(db: Db): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(eq(sessions.tokenHash, sha256Hex(token)));
  }
  jar.delete(SESSION_COOKIE);
}

/**
 * Resolves the signed-in user from the session cookie.
 * Cached per request so multiple server components share one query.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = getDb();
  const [row] = await db
    .select({
      sessionId: sessions.id,
      lastUsedAt: sessions.lastUsedAt,
      user: users,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(
      and(
        eq(sessions.tokenHash, sha256Hex(token)),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!row) return null;
  if (row.user.status !== "active") return null;

  // Touch at most hourly to avoid a write on every request.
  if (Date.now() - new Date(row.lastUsedAt).getTime() > 3_600_000) {
    await db
      .update(sessions)
      .set({ lastUsedAt: new Date() })
      .where(eq(sessions.id, row.sessionId));
  }

  return toSessionUser(row.user);
});

export function toSessionUser(user: User): SessionUser {
  return {
    id: user.id,
    name: user.name,
    locale: user.locale,
    isAdmin: user.isAdmin,
    phoneMasked: user.phoneMasked,
    phoneVerifiedAt: user.phoneVerifiedAt,
  };
}

export async function requireUser(locale: string, nextPath: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect(`/${locale}/login?next=${encodeURIComponent(nextPath)}`);
  }
  return user;
}

/** For route handlers: throws a JSON 401 instead of redirecting. */
export async function requireApiUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new ApiError(401, "unauthorized", "Sign in to continue.");
  return user;
}

export async function requireAdmin(locale: string, nextPath: string): Promise<SessionUser> {
  const user = await requireUser(locale, nextPath);
  if (!user.isAdmin) redirect(`/${locale}/dashboard?denied=admin`);
  return user;
}

export type OrgRole = "owner" | "editor" | "viewer";

const ROLE_RANK: Record<OrgRole, number> = { viewer: 1, editor: 2, owner: 3 };

export async function listOrgMemberships(
  db: Db,
  userId: string,
): Promise<Array<{ orgId: string; role: OrgRole }>> {
  const rows = await db
    .select({ orgId: orgMembers.orgId, role: orgMembers.role })
    .from(orgMembers)
    .where(eq(orgMembers.userId, userId));
  return rows;
}

export async function hasOrgRole(
  db: Db,
  userId: string,
  orgId: string,
  minRole: OrgRole,
): Promise<boolean> {
  const [row] = await db
    .select({ role: orgMembers.role })
    .from(orgMembers)
    .where(and(eq(orgMembers.userId, userId), eq(orgMembers.orgId, orgId)))
    .limit(1);
  if (!row) return false;
  return ROLE_RANK[row.role] >= ROLE_RANK[minRole];
}

export async function requireOrgRole(
  db: Db,
  userId: string,
  orgId: string,
  minRole: OrgRole = "editor",
): Promise<void> {
  const ok = await hasOrgRole(db, userId, orgId, minRole);
  if (!ok) {
    throw new ApiError(403, "forbidden", "You do not have access to this organization.");
  }
}

/** Session/user agent + IP for audit records. */
export async function requestMeta(): Promise<{ ip: string | null; userAgent: string | null }> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  return {
    ip: forwarded?.split(",")[0]?.trim() ?? headerList.get("x-real-ip"),
    userAgent: headerList.get("user-agent"),
  };
}

export function phoneHashFor(e164: string): string {
  return blindIndex(e164, "phone");
}

export async function countActiveSessions(db: Db, userId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sessions)
    .where(
      and(eq(sessions.userId, userId), isNull(sessions.revokedAt), gt(sessions.expiresAt, new Date())),
    );
  return row?.count ?? 0;
}
