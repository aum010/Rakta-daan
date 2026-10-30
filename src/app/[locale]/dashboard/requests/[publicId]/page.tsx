import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { bloodRequests, donorConsents, donors, messages, requestResponses, users } from "@/db/schema";
import { Badge, Callout, EmptyState, PageHeader } from "@/components/ui/ui";
import { CopyButton } from "@/components/ui/copy-button";
import { RequestOwnerActions } from "@/components/request/request-owner-actions";
import { requireUser } from "@/lib/auth";
import { getDictionary, format, isLocale } from "@/lib/i18n";
import { bloodGroupLabel, componentLabel, urgencyLabel } from "@/lib/blood";
import { formatDateTime, relativeTime } from "@/lib/dates";
import { districtName, provinceName } from "@/lib/requests";
import { decryptString } from "@/lib/crypto";
import { env } from "@/lib/env";
import {
  requestStatusLabel,
  requestStatusTone,
  responseStatusLabel,
} from "@/lib/labels";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ locale: string; publicId: string }>;
}) {
  const { locale, publicId } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const user = await requireUser(locale, `/${locale}/dashboard/requests/${publicId}`);
  const db = getDb();

  const [request] = await db
    .select()
    .from(bloodRequests)
    .where(
      and(
        eq(bloodRequests.publicId, publicId.toUpperCase()),
        eq(bloodRequests.createdByUserId, user.id),
      ),
    )
    .limit(1);

  if (!request) {
    return (
      <div className="container-page max-w-xl py-16 text-center">
        <h1 className="text-2xl font-bold">{dict.request.notFound}</h1>
        <Link href={`/${locale}/dashboard`} className="button-secondary mt-6">
          {dict.dashboard.title}
        </Link>
      </div>
    );
  }

  const responses = await db
    .select({
      id: requestResponses.id,
      status: requestResponses.status,
      note: requestResponses.donorNote,
      respondedAt: requestResponses.respondedAt,
      distanceKm: requestResponses.distanceKm,
      donorId: donors.id,
      donorName: users.name,
      donorPhoneEnc: users.phoneEnc,
    })
    .from(requestResponses)
    .innerJoin(donors, eq(donors.id, requestResponses.donorId))
    .innerJoin(users, eq(users.id, donors.userId))
    .where(eq(requestResponses.requestId, request.id))
    .orderBy(desc(requestResponses.respondedAt))
    .limit(100);

  const consentRows = responses.length
    ? await db
        .select({
          donorId: donorConsents.donorId,
          granted: donorConsents.granted,
          createdAt: donorConsents.createdAt,
        })
        .from(donorConsents)
        .where(
          and(
            inArray(
              donorConsents.donorId,
              responses.map((response) => response.donorId),
            ),
            eq(donorConsents.kind, "contact_release_on_response"),
          ),
        )
        .orderBy(desc(donorConsents.createdAt))
    : [];

  // Rows are newest-first, so the first record per donor is the current state.
  const contactConsent = new Map<string, boolean>();
  for (const row of consentRows) {
    if (!contactConsent.has(row.donorId)) contactConsent.set(row.donorId, row.granted);
  }

  const alertStats = await db
    .select({
      status: messages.status,
      provider: messages.provider,
      count: sql<number>`count(*)::int`,
    })
    .from(messages)
    .where(eq(messages.requestId, request.id))
    .groupBy(messages.status, messages.provider);

  const simulated = alertStats
    .filter((row) => row.provider === "mock")
    .reduce((total, row) => total + row.count, 0);
  const failed = alertStats
    .filter((row) => row.status === "failed")
    .reduce((total, row) => total + row.count, 0);
  const queued = alertStats
    .filter((row) => row.status === "queued" || row.status === "sending")
    .reduce((total, row) => total + row.count, 0);

  const responded = responses.filter((row) => row.status === "interested" || row.status === "donated");
  const declined = responses.filter((row) => row.status === "declined").length;
  const publicUrl = `${env.appUrl}/${locale}/requests/${request.publicId}`;

  return (
    <div className="container-page max-w-4xl py-8">
      <PageHeader
        title={format(dict.request.publicTitle, { id: request.publicId })}
        subtitle={`${request.hospitalName} · ${districtName(request.districtCode, locale)}, ${provinceName(request.provinceCode, locale)}`}
        actions={
          <>
            <Badge tone={requestStatusTone(request.status)}>
              {requestStatusLabel(request.status, dict)}
            </Badge>
            <Link className="button-secondary" href={`/${locale}/requests/${request.publicId}`}>
              {dict.common.view}
            </Link>
          </>
        }
      />

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge tone="brand">{bloodGroupLabel(request.bloodGroupNeeded, locale)}</Badge>
        <Badge>{componentLabel(request.component, locale)}</Badge>
        <Badge tone="amber">{urgencyLabel(request.urgency, locale)}</Badge>
        <Badge>
          {format(
            request.unitsNeeded === 1
              ? dict.request.unitsNeededOne
              : dict.request.unitsNeeded,
            { count: request.unitsNeeded },
          )}
        </Badge>
      </div>

      <section className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="card p-5">
          <h2 className="text-base font-semibold">{dict.request.neededByLabel}</h2>
          <p className="mt-1 text-sm">{formatDateTime(request.neededBy, locale)}</p>
          <p className="mt-1 text-xs text-muted">
            {format(dict.request.expires, {
              time: relativeTime(request.expiresAt, new Date(), locale),
            })}
          </p>
          <h2 className="mt-4 text-base font-semibold">{dict.request.contactShared}</h2>
          <p className="mt-1 text-sm">
            {request.contactName} · {request.contactPhoneMasked}
          </p>
          <p className="mt-1 text-xs text-muted">{dict.request.contactPhoneHint}</p>
        </div>

        <div className="card p-5">
          <h2 className="text-base font-semibold">{dict.dashboard.notifications}</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {alertStats.length === 0 ? (
              <li className="text-muted">{dict.admin.noMessages}</li>
            ) : (
              alertStats.map((row) => (
                <li key={`${row.status}-${row.provider}`} className="flex justify-between gap-3">
                  <span className="text-muted">
                    {row.status} · {row.provider ?? "—"}
                  </span>
                  <span className="font-medium">{row.count}</span>
                </li>
              ))
            )}
          </ul>
          {simulated > 0 ? (
            <p className="mt-2 text-xs text-amber-700">
              {simulated} {dict.common.simulated} · {dict.common.notDelivered}
            </p>
          ) : null}
          {queued > 0 ? (
            <p className="mt-2 text-xs text-muted">{queued} queued for delivery.</p>
          ) : null}
          {failed > 0 ? (
            <p className="mt-2 text-xs text-danger-700">{failed} failed — see admin delivery log.</p>
          ) : null}
        </div>
      </section>

      <section className="card mt-5 p-5">
        <h2 className="text-lg font-semibold">{dict.request.shareTitle}</h2>
        <p className="mt-1 text-sm text-muted">{dict.request.shareHint}</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input readOnly value={publicUrl} className="input-base font-mono text-xs" />
          <CopyButton
            value={publicUrl}
            label={dict.request.copyLink}
            copiedLabel={dict.request.copied}
            className="button-secondary whitespace-nowrap"
          />
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">{dict.request.responsesTitle}</h2>
        <p className="mt-1 text-sm text-muted">
          {format(
            responded.length === 1
              ? dict.request.responsesCountOne
              : dict.request.responsesCount,
            { count: responded.length },
          )}
          {declined > 0 ? ` · ${declined} ${dict.request.declined.toLowerCase()}` : ""}
        </p>

        {responded.length === 0 ? (
          <div className="mt-3">
            <EmptyState title={dict.request.responsesEmpty}>
              {dict.dashboard.noMatchingDonors}
            </EmptyState>
          </div>
        ) : (
          <ul className="mt-3 space-y-3">
            {responded.map((response) => {
              const shareContact = contactConsent.get(response.donorId) === true;
              let phone: string | null = null;
              if (shareContact) {
                try {
                  phone = decryptString(response.donorPhoneEnc, "phone");
                } catch {
                  phone = null;
                }
              }
              return (
                <li key={response.id} className="card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{response.donorName}</p>
                      <p className="text-xs text-muted">
                        {response.distanceKm !== null
                          ? `${response.distanceKm} ${dict.common.km} · `
                          : ""}
                        {response.respondedAt
                          ? relativeTime(response.respondedAt, new Date(), locale)
                          : ""}
                      </p>
                    </div>
                    <Badge tone={response.status === "donated" ? "teal" : "brand"}>
                      {responseStatusLabel(response.status, dict)}
                    </Badge>
                  </div>
                  {phone ? (
                    <p className="mt-2 text-sm">
                      <a className="font-medium underline" href={`tel:${phone}`}>
                        {phone}
                      </a>
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-muted">{dict.request.noContact}</p>
                  )}
                  {response.note ? (
                    <p className="mt-2 rounded-lg bg-surface-muted p-3 text-sm">
                      {response.note}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">{dict.dashboard.manage}</h2>
        <div className="mt-3">
          <RequestOwnerActions publicId={request.publicId} dict={dict} status={request.status} />
        </div>
      </section>

      <div className="mt-6">
        <Callout tone="neutral">
          {dict.request.contactNote}
        </Callout>
      </div>
    </div>
  );
}
