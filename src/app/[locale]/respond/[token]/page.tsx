import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { bloodRequests, donors, requestResponses, users } from "@/db/schema";
import { Badge, Callout, PageHeader } from "@/components/ui/ui";
import { ResponseButtons } from "@/components/request/response-buttons";
import { getDictionary, isLocale } from "@/lib/i18n";
import { bloodGroupLabel, componentLabel, urgencyLabel } from "@/lib/blood";
import { formatDateTime, relativeTime } from "@/lib/dates";
import { districtName } from "@/lib/requests";
import { getDonorConsents } from "@/lib/consent";
import { requestStatusLabel, requestStatusTone, responseStatusLabel } from "@/lib/labels";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function RespondPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const db = getDb();

  const [row] = await db
    .select({
      response: requestResponses,
      request: bloodRequests,
      donorName: users.name,
    })
    .from(requestResponses)
    .innerJoin(bloodRequests, eq(bloodRequests.id, requestResponses.requestId))
    .innerJoin(donors, eq(donors.id, requestResponses.donorId))
    .innerJoin(users, eq(users.id, donors.userId))
    .where(eq(requestResponses.respondToken, token))
    .limit(1);

  if (!row) {
    return (
      <div className="container-page max-w-xl py-16 text-center">
        <h1 className="text-2xl font-bold">{dict.respond.invalid}</h1>
        <Link href={`/${locale}/find`} className="button-primary mt-6">
          {dict.nav.findBlood}
        </Link>
      </div>
    );
  }

  const { request } = row;
  const consents = await getDonorConsents(db, row.response.donorId);
  const contactAllowed = consents.contact_release_on_response;
  const open = request.status === "open";

  return (
    <div className="container-page max-w-2xl py-8">
      <PageHeader
        title={dict.respond.title}
        subtitle={dict.respond.subtitle}
        actions={
          <Badge tone={requestStatusTone(request.status)}>
            {requestStatusLabel(request.status, dict)}
          </Badge>
        }
      />

      <div className="card mt-5 p-5">
        <div className="flex flex-wrap gap-2">
          <Badge tone="brand">{bloodGroupLabel(request.bloodGroupNeeded, locale)}</Badge>
          <Badge>{urgencyLabel(request.urgency, locale)}</Badge>
          <Badge>{componentLabel(request.component, locale)}</Badge>
        </div>

        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
              {dict.request.hospitalLabel}
            </dt>
            <dd className="mt-0.5 font-medium">{request.hospitalName}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
              {dict.request.districtLabel}
            </dt>
            <dd className="mt-0.5 font-medium">{districtName(request.districtCode, locale)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
              {dict.request.neededByLabel}
            </dt>
            <dd className="mt-0.5 font-medium">{formatDateTime(request.neededBy, locale)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
              {dict.request.units}
            </dt>
            <dd className="mt-0.5 font-medium">
              {request.unitsNeeded} · {relativeTime(request.createdAt, new Date(), locale)}
            </dd>
          </div>
        </dl>
      </div>

      <div className="card mt-4 p-5">
        <p className="text-sm text-muted">
          {dict.common.contact}: {row.donorName}
        </p>

        {row.response.status !== "notified" ? (
          <div className="mt-3">
            <Callout tone="info" title={dict.request.yourResponse}>
              {responseStatusLabel(row.response.status, dict)}
            </Callout>
          </div>
        ) : null}

        {open ? (
          <div className="mt-4">
            <ResponseButtons
              endpoint={`/api/v1/responses/${token}`}
              dict={dict}
              currentStatus={row.response.status}
              disabled={!contactAllowed && row.response.status !== "interested"}
              disabledReason={
                <Link className="underline" href={`/${locale}/donor`}>
                  {dict.respond.enableContact}
                </Link>
              }
            />
          </div>
        ) : (
          <div className="mt-4">
            <Callout tone="neutral" title={dict.respond.expired}>
              {dict.request.alreadyClosed}
            </Callout>
          </div>
        )}

        <p className="mt-4 text-xs leading-relaxed text-muted">{dict.respond.privacyNote}</p>
      </div>
    </div>
  );
}
