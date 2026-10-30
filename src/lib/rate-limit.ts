import { sql } from "drizzle-orm";
import type { Db } from "@/db";
import { rateLimits } from "@/db/schema";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

/**
 * Fixed-window limiter persisted in Postgres so limits hold across instances.
 * Windows are aligned to the window size, i.e. a window may be shorter than
 * `windowSeconds` right after a boundary.
 */
export async function consumeRateLimit(
  db: Db,
  options: {
    bucket: string;
    key: string;
    limit: number;
    windowSeconds: number;
    now?: Date;
  },
): Promise<RateLimitResult> {
  const now = options.now ?? new Date();
  const windowMs = options.windowSeconds * 1000;
  const windowStart = new Date(Math.floor(now.getTime() / windowMs) * windowMs);

  const [row] = await db
    .insert(rateLimits)
    .values({ bucket: options.bucket, key: options.key, windowStart, count: 1 })
    .onConflictDoUpdate({
      target: [rateLimits.bucket, rateLimits.key, rateLimits.windowStart],
      set: { count: sql`${rateLimits.count} + 1` },
    })
    .returning({ count: rateLimits.count });

  const count = row?.count ?? 1;
  const remaining = Math.max(0, options.limit - count);
  const resetAt = windowStart.getTime() + windowMs;
  return {
    allowed: count <= options.limit,
    remaining,
    retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now.getTime()) / 1000)),
  };
}

export async function enforceRateLimit(
  db: Db,
  options: {
    bucket: string;
    key: string;
    limit: number;
    windowSeconds: number;
    now?: Date;
  },
): Promise<RateLimitResult> {
  return consumeRateLimit(db, options);
}
