import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { bloodRequests, donors, requestResponses } from "@/db/schema";
import { Badge, Callout, PageHeader } from "@/components/ui/ui";
import { ResponseButtons } from "@/components/request/response-buttons";
import { getSessionUser } from "@/lib/auth";
import { getDictionary, format, isLocale } from "@/lib/i18n";
import { bloodGroupLabel, componentLabel, urgencyLabel } from "@/lib/blood";
import { formatDateTime, relativeTime } from "@/lib/dates";
import { districtName, provinceName } from "@/lib/requests";
import { decryptString } from "@/lib/crypto";
import { requestStatusLabel, requestStatusTone, responseStatusLabel } from "@/lib/labels";
import type { BadgeTone } from "@/components/ui/ui";

const URGENCY_TONE: Record<string, BadgeTone> = {
  routine: "neutral",
  urgent: "amber",
  critical: "danger",
};

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function PublicRequestPage({
  params,
}: {
  params: Promise<{ locale: string; publicId: string }>;
}) {
  const { locale, publicId } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const db = getDb();

  const [request] = await db
    .select()
    .from(bloodRequests)
    .where(eq(bloodRequests.publicId, publicId.toUpperCase()))
    .limit(1);

  if (!request) {
    return (
      <div className="container-page max-w-2xl py-16 text-center">
        <h1 className="text-2xl font-bold">{dict.request.notFound}</h1>
        <Link href={`/${locale}/find`} className="button-primary mt-6">
          {dict.nav.findBlood}
        </Link>
      </div>
    );
  }

  const [counts] = await db
    .select({
      interested: sql<number>`count(case when ${requestResponses.status} = 'interested' then 1 end)::int`,
      donated: sql<number>`count(case when ${requestResponses.status} = 'donated' then 1 end)::int`,
      notified: sql<number>`count(*)::int`,
    })
    .from(requestResponses)
    .where(eq(requestResponses.requestId, request.id));

  const user = await getSessionUser();
  let myResponse: { status: string } | null = null;

  if (user) {
    const [donor] = await db
      .select({ id: donors.id })
      .from(donors)
      .where(and(eq(donors.userId, user.id), isNull(donors.withdrawnAt)))
      .limit(1);
    if (donor) {
      const [row] = await db
        .select({ status: requestResponses.status })
        .from(requestResponses)
        .where(
          and(
            eq(requestResponses.requestId, request.id),
            eq(requestResponses.donorId, donor.id),
            inArray(requestResponses.status, ["interested", "declined", "donated", "withdrawn"]),
          ),
        )
        .limit(1);
      myResponse = row ?? null;
    }
  }

  const publicPhone =
    request.shareContactPublicly && request.status === "open" && request.contactPhoneEnc
      ? decryptString(request.contactPhoneEnc, "request-contact")
      : null;

  return (
    <div className="container-page max-w-4xl py-8">
      <PageHeader
        title={format(dict.request.publicTitle, { id: request.publicId })}
        subtitle={`${dict.request.posted.replace(
          "{time}",
          relativeTime(request.createdAt, new Date(), locale),
        )} · ${format(dict.request.expires, {
          time: relativeTime(request.expiresAt, new Date(), locale),
        })}`}
        actions={
          <Badge tone={requestStatusTone(request.status)}>
            {requestStatusLabel(request.status, dict)}
          </Badge>
        }
      />

      <div className="mt-5 flex flex-wrap gap-2">
        <Badge tone="brand">{bloodGroupLabel(request.bloodGroupNeeded, locale)}</Badge>
        <Badge tone={URGENCY_TONE[request.urgency] ?? "neutral"}>
          {urgencyLabel(request.urgency, locale)}
        </Badge>
        <Badge>{componentLabel(request.component, locale)}</Badge>
        <Badge>
          {format(
            request.unitsNeeded === 1
              ? dict.request.unitsNeededOne
              : dict.request.unitsNeeded,
            { count: request.unitsNeeded },
          )}
        </Badge>
      </div>

      <section className="card mt-5 p-5">
        <dl className="grid gap-4 sm:grid-cols-2">
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
            <dd className="mt-0.5 font-medium">
              {districtName(request.districtCode, locale)},{" "}
              {provinceName(request.provinceCode, locale)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
              {dict.request.neededByLabel}
            </dt>
            <dd className="mt-0.5 font-medium">{formatDateTime(request.neededBy, locale)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
              {dict.request.responsesTitle}
            </dt>
            <dd className="mt-0.5 font-medium">
              {format(
                (counts?.interested ?? 0) + (counts?.donated ?? 0) === 1
                  ? dict.request.responsesCountOne
                  : dict.request.responsesCount,
                {
                  count: (counts?.interested ?? 0) + (counts?.donated ?? 0),
                },
              )}
            </dd>
          </div>
        </dl>

        {request.clinicalNote ? (
          <p className="mt-4 rounded-lg bg-surface-muted p-3 text-sm leading-relaxed text-ink-soft">
            {request.clinicalNote}
          </p>
        ) : null}

        {publicPhone ? (
          <p className="mt-4 text-sm">
            <span className="text-muted">{dict.request.contactShared}: </span>
            <a className="font-medium underline" href={`tel:${publicPhone}`}>
              {request.contactPhoneMasked}
            </a>
          </p>
        ) : (
          <p className="mt-4 text-xs leading-relaxed text-muted">{dict.request.contactNote}</p>
        )}
      </section>

      <section className="card mt-5 p-5">
        <h2 className="text-lg font-semibold">{dict.respond.title}</h2>
        <p className="mt-1 text-sm text-muted">{dict.respond.subtitle}</p>

        {request.status !== "open" ? (
          <div className="mt-4">
            <Callout tone="neutral" title={dict.request.alreadyClosed}>
              {dict.respond.expired}
            </Callout>
          </div>
        ) : user ? (
          <div className="mt-4">
            {myResponse ? (
              <div className="mb-4">
                <Callout tone="info" title={dict.request.yourResponse}>
                  {responseStatusLabel(myResponse.status, dict)}
                </Callout>
              </div>
            ) : null}
            <ResponseButtons
              endpoint={`/api/v1/requests/${request.publicId}/respond`}
              dict={dict}
              currentStatus={myResponse?.status}
            />
          </div>
        ) : (
          <div className="mt-4">
            <Link
              className="button-primary"
              href={`/${locale}/login?next=${encodeURIComponent(`/${locale}/requests/${request.publicId}`)}`}
            >
              {dict.respond.signIn}
            </Link>
          </div>
        )}

        <p className="mt-4 text-xs leading-relaxed text-muted">{dict.respond.privacyNote}</p>
      </section>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
        <Link className="underline" href={`/${locale}/safety`}>
          {dict.common.safety}
        </Link>
        <Link className="underline" href={`/${locale}/abuse?request=${request.publicId}`}>
          {dict.request.reportAbuse}
        </Link>
      </div>
    </div>
  );
}
