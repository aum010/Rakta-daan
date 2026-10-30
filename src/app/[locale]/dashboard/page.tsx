import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { bloodRequests, requestResponses } from "@/db/schema";
import { Badge, Callout, EmptyState, PageHeader, Stat } from "@/components/ui/ui";
import { requireUser, listOrgMemberships } from "@/lib/auth";
import { getDictionary, format, isLocale } from "@/lib/i18n";
import { bloodGroupLabel, urgencyLabel } from "@/lib/blood";
import { districtName, donorByUserId } from "@/lib/requests";
import { relativeTime } from "@/lib/dates";
import { requestStatusLabel, requestStatusTone } from "@/lib/labels";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const user = await requireUser(locale, `/${locale}/dashboard`);
  const db = getDb();

  const requests = await db
    .select({
      publicId: bloodRequests.publicId,
      bloodGroup: bloodRequests.bloodGroupNeeded,
      urgency: bloodRequests.urgency,
      districtCode: bloodRequests.districtCode,
      hospitalName: bloodRequests.hospitalName,
      status: bloodRequests.status,
      createdAt: bloodRequests.createdAt,
      interested: sql<number>`count(case when ${requestResponses.status} in ('interested','donated') then 1 end)::int`,
      notified: sql<number>`count(${requestResponses.id})::int`,
    })
    .from(bloodRequests)
    .leftJoin(requestResponses, eq(requestResponses.requestId, bloodRequests.id))
    .where(eq(bloodRequests.createdByUserId, user.id))
    .groupBy(bloodRequests.id)
    .orderBy(desc(bloodRequests.createdAt))
    .limit(8);

  const donor = await donorByUserId(db, user.id);
  const memberships = await listOrgMemberships(db, user.id);
  const openCount = requests.filter((request) => request.status === "open").length;

  return (
    <div className="container-page py-8">
      <PageHeader
        title={dict.dashboard.title}
        subtitle={`${user.name} · ${user.phoneMasked}`}
        actions={
          <Link className="button-primary" href={`/${locale}/dashboard/requests/new`}>
            {dict.dashboard.newRequest}
          </Link>
        }
      />

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Stat label={dict.dashboard.openRequests} value={openCount} />
        <Stat label={dict.dashboard.closedRequests} value={requests.length - openCount} />
        <Stat
          label={dict.donor.availability}
          value={
            donor ? (
              <span className="text-base">{dict.donor[donor.availability]}</span>
            ) : (
              <Link className="text-base underline" href={`/${locale}/register`}>
                {dict.donor.becomeDonor}
              </Link>
            )
          }
        />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Link href={`/${locale}/donor`} className="card block p-5 hover:border-brand-200">
          <p className="font-semibold">{dict.donor.title}</p>
          <p className="mt-1 text-sm text-muted">
            {donor ? dict.donor.subtitle : dict.donor.notADonor}
          </p>
        </Link>
        {memberships.length > 0 ? (
          <Link href={`/${locale}/org`} className="card block p-5 hover:border-brand-200">
            <p className="font-semibold">{dict.org.title}</p>
            <p className="mt-1 text-sm text-muted">{dict.org.subtitle}</p>
          </Link>
        ) : null}
        {user.isAdmin ? (
          <Link href={`/${locale}/admin`} className="card block p-5 hover:border-brand-200">
            <p className="font-semibold">{dict.admin.title}</p>
            <p className="mt-1 text-sm text-muted">{dict.admin.subtitle}</p>
          </Link>
        ) : null}
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">{dict.dashboard.title}</h2>
        {requests.length === 0 ? (
          <div className="mt-3">
            <EmptyState title={dict.dashboard.empty}>{dict.dashboard.emptyHelp}</EmptyState>
          </div>
        ) : (
          <ul className="mt-3 space-y-3">
            {requests.map((request) => (
              <li key={request.publicId} className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">
                      {bloodGroupLabel(request.bloodGroup, locale)} ·{" "}
                      {districtName(request.districtCode, locale)}
                    </p>
                    <p className="text-sm text-muted">{request.hospitalName}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge tone={requestStatusTone(request.status)}>
                      {requestStatusLabel(request.status, dict)}
                    </Badge>
                    <Badge tone="amber">{urgencyLabel(request.urgency, locale)}</Badge>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted">
                  {format(dict.dashboard.created, {
                    time: relativeTime(request.createdAt, new Date(), locale),
                  })}{" "}
                  ·{" "}
                  {format(
                    request.interested === 1
                      ? dict.request.responsesCountOne
                      : dict.request.responsesCount,
                    { count: request.interested },
                  )}{" "}
                  ·{" "}
                  {dict.dashboard.notifications}: {request.notified}
                </p>
                <Link
                  className="button-secondary mt-3 !min-h-0 !py-1.5 text-sm"
                  href={`/${locale}/dashboard/requests/${request.publicId}`}
                >
                  {dict.dashboard.manage}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {user.isAdmin ? (
        <div className="mt-6">
          <Callout tone="info" title={dict.admin.title}>
            <Link className="underline" href={`/${locale}/admin`}>
              {dict.admin.subtitle}
            </Link>
          </Callout>
        </div>
      ) : null}
    </div>
  );
}
