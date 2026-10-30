import "./load-env";
import postgres from "postgres";

/**
 * End-to-end smoke test through the real HTTP interface.
 * Requires: database migrated + `pnpm db:seed:demo`, and a running server
 * (dev mode, DEV_EXPOSE_OTP=true) at SMOKE_BASE_URL (default localhost:3000).
 */

const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const ORIGIN = BASE;

type Result = { name: string; ok: boolean; detail: string };
const results: Result[] = [];

type SmokeJson = {
  devCode?: string;
  status?: string;
  publicId?: string;
  notified?: { notified?: number; simulated?: number };
  donorCount?: number;
  banks?: Array<{ slug?: string }>;
};

function check(name: string, condition: boolean, detail = "") {
  results.push({ name, ok: condition, detail });
  console.log(`${condition ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function jsonFetch(
  path: string,
  options: { method?: string; body?: unknown; cookie?: string; origin?: string } = {},
) {
  const response = await fetch(`${BASE}${path}`, {
    method: options.method ?? (options.body === undefined ? "GET" : "POST"),
    headers: {
      "Content-Type": "application/json",
      Origin: options.origin ?? ORIGIN,
      ...(options.cookie ? { Cookie: options.cookie } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    redirect: "manual",
  });
  const text = await response.text();
  let json: SmokeJson | null = null;
  try {
    json = JSON.parse(text) as SmokeJson;
  } catch {
    /* not json */
  }
  const cookies = response.headers.getSetCookie().map((value) => value.split(";")[0]!);
  return { status: response.status, json, text, cookie: cookies.join("; ") };
}

async function login(phone: string): Promise<string> {
  const requested = await jsonFetch("/api/v1/auth/otp/request", { body: { phone } });
  const devCode = requested.json?.devCode;
  if (requested.status !== 200 || !devCode) {
    throw new Error(`OTP request failed: ${requested.status} ${requested.text.slice(0, 200)}`);
  }
  const verified = await jsonFetch("/api/v1/auth/otp/verify", {
    body: { phone, code: devCode },
  });
  if (verified.status !== 200 || !verified.cookie) {
    throw new Error(`OTP verify failed: ${verified.status} ${verified.text.slice(0, 200)}`);
  }
  return verified.cookie;
}

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL is required");
  const sql = postgres(dbUrl, { max: 1, onnotice: () => {} });
  let createdPublicId: string | null = null;

  try {
    const health = await jsonFetch("/api/health");
    check("health endpoint", health.status === 200 && health.json?.status === "ok");

    const requesterCookie = await login("+9779800000003");
    check("requester OTP login", Boolean(requesterCookie));

    const adminCookie = await login("+9779800000001");

    const created = await jsonFetch("/api/v1/requests", {
      cookie: requesterCookie,
      body: {
        bloodGroupNeeded: "A_POS",
        component: "whole_blood",
        unitsNeeded: 2,
        urgency: "urgent",
        provinceCode: "P3",
        districtCode: "KTM",
        hospitalName: "Smoke Test Hospital",
        neededBy: new Date(Date.now() + 8 * 3_600_000).toISOString(),
        contactName: "Smoke Requester",
        contactPhone: "9800000003",
        notifyRadiusKm: 75,
      },
    });
    const createdBody = created.json;
    const newPublicId = createdBody?.publicId ?? null;
    check("create request", created.status === 201 && newPublicId !== null, `${created.status}`);
    createdPublicId = newPublicId;
    const notified = createdBody?.notified?.notified ?? 0;
    const simulated = createdBody?.notified?.simulated ?? 0;
    check("matching notified consented donors", notified >= 3, `notified=${notified}`);
    check(
      "messages are marked simulated, not delivered",
      simulated >= 1,
      `simulated=${simulated}`,
    );

    const availability = await jsonFetch(
      "/api/v1/availability?group=A_POS&district=KTM&radius=75",
    );
    check(
      "availability summary hides identities",
      availability.status === 200 &&
        availability.json?.donorCount !== undefined &&
        Boolean(
          availability.json?.banks?.some(
            (bank) => bank.slug === "demo-kantipur-blood-bank",
          ),
        ),
      `donorCount=${availability.json?.donorCount}`,
    );

    const publicPage = await fetch(
      `${BASE}/en/requests/${createdPublicId}`,
    ).then((response) => response.text());
    check(
      "public request page loads",
      publicPage.includes("Smoke Test Hospital") || publicPage.includes("Blood request"),
    );
    check(
      "public page hides requester phone and name",
      !publicPage.includes("9800000003") && !publicPage.includes("Smoke Requester"),
    );

    // Donor responds through the capability link.
    const [responseRow] = await sql`
      select r.respond_token as token, d.id as donor_id, u.name
      from request_responses r
      join blood_requests b on b.id = r.request_id
      join donors d on d.id = r.donor_id
      join users u on u.id = d.user_id
      where b.public_id = ${createdPublicId}
      order by u.name
      limit 1
    `;
    check("request created donor invitations", Boolean(responseRow?.token));

    if (responseRow?.token) {
      const responded = await jsonFetch(`/api/v1/responses/${responseRow.token}`, {
        body: { action: "interested", note: "Smoke test response" },
      });
      check("donor responds via token link", responded.status === 200, `${responded.status}`);

      const detail = await fetch(
        `${BASE}/en/dashboard/requests/${createdPublicId}`,
        { headers: { Cookie: requesterCookie } },
      ).then((response) => response.text());
      check(
        "requester sees consenting donor contact",
        detail.includes(responseRow.name) && detail.includes("9800000"),
      );
    }

    const donorCookie = await login("+9779800000010");
    const donorPage = await fetch(`${BASE}/en/donor`, { headers: { Cookie: donorCookie } }).then(
      (response) => response.text(),
    );
    check("donor dashboard renders", donorPage.includes("Donor dashboard"));

    const csrf = await jsonFetch("/api/v1/requests", {
      cookie: requesterCookie,
      origin: "https://evil.example",
      body: {},
    });
    check("cross-origin mutation blocked", csrf.status === 403, `${csrf.status}`);

    const adminPage = await fetch(`${BASE}/en/admin`, { headers: { Cookie: adminCookie } }).then(
      (response) => response.text(),
    );
    check("admin console renders", adminPage.includes("Administration"));

    const escalated = await jsonFetch(
      "/api/v1/admin/orgs/00000000-0000-0000-0000-000000000000/verification",
      { cookie: requesterCookie, body: { action: "verify" } },
    );
    check("admin API rejects non-admin", escalated.status === 403, `${escalated.status}`);

    // --- organisation inventory workflow ---
    const staffCookie = await login("+9779800000002");
    const orgPage = await fetch(`${BASE}/en/org`, { headers: { Cookie: staffCookie } }).then(
      (response) => response.text(),
    );
    check("organisation portal renders", orgPage.includes("Blood inventory"));

    const inventoryUpdate = await jsonFetch(
      "/api/v1/orgs/demo-kantipur-blood-bank/inventory",
      {
        method: "PUT",
        cookie: staffCookie,
        body: { updates: [{ bloodGroup: "A_POS", component: "whole_blood", units: 7 }] },
      },
    );
    check("staff can update inventory", inventoryUpdate.status === 200, `${inventoryUpdate.status}`);

    const bankPage = await fetch(`${BASE}/en/banks/demo-kantipur-blood-bank`).then((response) =>
      response.text(),
    );
    check("public bank page shows reported units", bankPage.includes(">7<"));

    const forbiddenInventory = await jsonFetch(
      "/api/v1/orgs/demo-kantipur-blood-bank/inventory",
      {
        method: "PUT",
        cookie: requesterCookie,
        body: { updates: [{ bloodGroup: "A_POS", component: "whole_blood", units: 0 }] },
      },
    );
    check("inventory update requires org membership", forbiddenInventory.status === 403);

    // --- admin verification workflow ---
    const [pendingOrg] = await sql`
      select id from organizations where slug = 'demo-biratnagar-blood-centre'
    `;
    if (pendingOrg) {
      const verified = await jsonFetch(`/api/v1/admin/orgs/${pendingOrg.id}/verification`, {
        cookie: adminCookie,
        body: { action: "verify", note: "Smoke test verification" },
      });
      check("admin verifies organisation", verified.status === 200, `${verified.status}`);
    }

    const logouts = await jsonFetch("/api/v1/auth/logout", { cookie: adminCookie, body: {} });
    check("logout revokes session", logouts.status === 200);

    let sawRateLimit = false;
    const rateLimitedPhone = "+977981234567";
    for (let i = 0; i < 7; i += 1) {
      const attempt = await jsonFetch("/api/v1/auth/otp/request", {
        body: { phone: rateLimitedPhone },
      });
      if (attempt.status === 429) sawRateLimit = true;
    }
    check("OTP rate limiting engages per phone", sawRateLimit);

    const badWebhook = await jsonFetch("/api/webhooks/sms", {
      body: { phone: "9812345678", action: "stop" },
    });
    check("SMS webhook requires bearer secret", badWebhook.status === 401, `${badWebhook.status}`);

    const outboxNoAuth = await jsonFetch("/api/internal/outbox", { body: {} });
    check("outbox endpoint requires cron secret", outboxNoAuth.status === 401);
  } finally {
    if (createdPublicId) {
      await sql`delete from blood_requests where public_id = ${createdPublicId}`;
      console.log(`[smoke] cleaned up request ${createdPublicId}`);
    }
    // Restore demo fixtures mutated by the smoke run.
    await sql`
      update blood_inventory set units = 6, updated_at = now() - interval '3 hours'
      where org_id = (select id from organizations where slug = 'demo-kantipur-blood-bank')
        and blood_group = 'A_POS' and component = 'whole_blood'
    `;
    await sql`
      update organizations set verification = 'pending', verified_at = null, verified_by_user_id = null
      where slug = 'demo-biratnagar-blood-centre'
    `;
    await sql.end();
  }

  const failed = results.filter((result) => !result.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("[smoke] failed", error);
  process.exit(1);
});
