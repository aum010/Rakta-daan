import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { getDb } from "@/db";
import { camps } from "@/db/schema";
import { Badge, Callout, EmptyState, PageHeader } from "@/components/ui/ui";
import { getDictionary, isLocale } from "@/lib/i18n";
import { districtName } from "@/lib/requests";
import { daysFromNow, formatDate, formatTimeRange } from "@/lib/dates";
import { CAMP_UPCOMING_DAYS } from "@/lib/constants";

export default async function CampsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const db = getDb();

  const from = new Date();
  const until = daysFromNow(CAMP_UPCOMING_DAYS);

  const rows = await db
    .select()
    .from(camps)
    .where(
      and(eq(camps.status, "scheduled"), gte(camps.startsAt, from), lte(camps.startsAt, until)),
    )
    .orderBy(asc(camps.startsAt))
    .limit(50);

  return (
    <div className="container-page py-8">
      <PageHeader title={dict.camps.title} subtitle={dict.camps.subtitle} />

      {rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState title={dict.camps.empty} />
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {rows.map((camp) => {
            const upcomingLabel = formatDate(camp.startsAt, locale);
            return (
              <li key={camp.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h2 className="text-lg font-semibold">
                    <Link
                      className="underline-offset-2 hover:underline"
                      href={`/${locale}/camps/${camp.id}`}
                    >
                      {locale === "ne" && camp.titleNe ? camp.titleNe : camp.title}
                    </Link>
                  </h2>
                  <div className="flex flex-wrap gap-1.5">
                    {camp.isDemo ? <Badge tone="amber">{dict.common.demoData}</Badge> : null}
                    <Badge tone="brand">{upcomingLabel}</Badge>
                  </div>
                </div>
                <dl className="mt-3 space-y-1.5 text-sm">
                  <div className="flex gap-2">
                    <dt className="w-20 shrink-0 text-muted">{dict.camps.when}</dt>
                    <dd>
                      {formatDate(camp.startsAt, locale)} ·{" "}
                      {formatTimeRange(camp.startsAt, camp.endsAt, locale)}
                    </dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-20 shrink-0 text-muted">{dict.camps.venue}</dt>
                    <dd>
                      {camp.venue}, {districtName(camp.districtCode, locale)}
                    </dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-20 shrink-0 text-muted">{dict.camps.organiser}</dt>
                    <dd>{camp.organizerName}</dd>
                  </div>
                  {camp.contactPhone ? (
                    <div className="flex gap-2">
                      <dt className="w-20 shrink-0 text-muted">{dict.camps.contact}</dt>
                      <dd>
                        <a
                          className="underline"
                          href={`tel:${camp.contactPhone.replace(/\s/g, "")}`}
                        >
                          {camp.contactPhone}
                        </a>
                      </dd>
                    </div>
                  ) : null}
                </dl>
                {camp.description ? (
                  <p className="mt-3 text-sm leading-relaxed text-ink-soft">{camp.description}</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-6">
        <Callout tone="neutral">
          {locale === "ne"
            ? `शिविर सूची अगामी ${CAMP_UPCOMING_DAYS} दिनका लागि मात्र देखाइन्छ।`
            : `Only camps in the next ${CAMP_UPCOMING_DAYS} days are listed. Contact the organiser to confirm.`}
        </Callout>
      </div>
    </div>
  );
}
