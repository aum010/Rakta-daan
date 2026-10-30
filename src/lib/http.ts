import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodType } from "zod";
import { env } from "./env";
import { hashIp } from "./crypto";

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function jsonOk<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, {
    ...init,
    headers: {
      "Cache-Control": "no-store",
      ...(init?.headers ?? {}),
    },
  });
}

export function jsonError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message, details: error.details } },
      { status: error.status, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "validation_error",
          message: "Some fields need attention.",
          details: error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
      },
      { status: 422, headers: { "Cache-Control": "no-store" } },
    );
  }
  console.error("[api] unhandled error", error);
  return NextResponse.json(
    { error: { code: "internal_error", message: "Something went wrong." } },
    { status: 500, headers: { "Cache-Control": "no-store" } },
  );
}

export function clientIp(req: NextRequest): string {
  // NOTE: only trustworthy when the app runs behind a proxy that overwrites
  // these headers. Documented in docs/operations/deployment.md.
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "127.0.0.1";
}

export function clientIpHash(req: NextRequest): string | null {
  return hashIp(clientIp(req));
}

/**
 * CSRF defence. Every mutating endpoint requires a JSON body, and JSON bodies
 * cannot be produced by a cross-site HTML form. In addition, when a browser
 * supplies an Origin header it must match this deployment.
 */
export function assertSameOrigin(req: NextRequest): void {
  const origin = req.headers.get("origin");
  if (!origin) {
    const site = req.headers.get("sec-fetch-site");
    if (site && site !== "same-origin" && site !== "none") {
      throw new ApiError(403, "cross_origin", "Cross-site request blocked.");
    }
    return;
  }
  const allowed = new Set<string>();
  try {
    allowed.add(new URL(env.appUrl).origin);
  } catch {
    /* ignore malformed APP_URL */
  }
  allowed.add(req.nextUrl.origin);
  const forwardedHost = req.headers.get("x-forwarded-host");
  if (forwardedHost) {
    const proto = req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "");
    allowed.add(`${proto}://${forwardedHost}`);
  }
  if (!allowed.has(origin)) {
    throw new ApiError(403, "cross_origin", "Cross-site request blocked.");
  }
}

export async function parseJson<T>(req: NextRequest, schema: ZodType<T>): Promise<T> {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new ApiError(415, "unsupported_media_type", "Expected application/json.");
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ApiError(400, "invalid_json", "Request body is not valid JSON.");
  }
  return schema.parse(body);
}

export function requireBearerSecret(req: NextRequest, expected: string): void {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token || token !== expected) {
    throw new ApiError(401, "unauthorized", "Invalid credentials.");
  }
}
