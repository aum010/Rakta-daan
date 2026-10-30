import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { camps } from "@/db/schema";
import { Badge, Callout, PageHeader } from "@/components/ui/ui";
import { getDictionary, isLocale } from "@/lib/i18n";
import { districtName } from "@/lib/requests";
import { formatDate, formatTimeRange } from "@/lib/dates";
import { ArrowIcon, CalendarIcon, PhoneIcon } from "@/components/ui/icons";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return { title: `${dict.camps.title} — ${dict.common.appName}` };
}

export default async function CampDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  if (!UUID_PATTERN.test(id)) notFound();
  const dict = getDictionary(locale);
  const base = `/${locale}`;

  const [camp] = await getDb()
    .select()
    .from(camps)
    .where(eq(camps.id, id))
    .limit(1);

  if (!camp) notFound();

  const title = locale === "ne" && camp.titleNe ? camp.titleNe : camp.title;

  return (
    <div className="container-page max-w-3xl py-8">
      <PageHeader
        eyebrow={dict.nav.camps}
        title={title}
        subtitle={dict.camps.subtitle}
        breadcrumbs={[
          { href: base, label: dict.common.appName },
          { href: `${base}/camps`, label: dict.camps.title },
          { href: `${base}/camps/${camp.id}`, label: title },
        ]}
        actions={
          <Link className="button-secondary" href={`${base}/camps`}>
            {dict.camps.title}
          </Link>
        }
      />

      <div className="mt-4 flex flex-wrap gap-2">
        {camp.isDemo ? <Badge tone="amber">{dict.common.demoData}</Badge> : null}
        <Badge tone={camp.status === "cancelled" ? "danger" : "teal"}>
          {camp.status === "cancelled" ? dict.camps.cancelled : dict.camps.title}
        </Badge>
        <Badge tone="brand">{districtName(camp.districtCode, locale)}</Badge>
      </div>

      {camp.status === "cancelled" ? (
        <div className="mt-4">
          <Callout tone="danger">{dict.camps.cancelled}</Callout>
        </div>
      ) : null}

      <section className="mt-6 card p-5">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <CalendarIcon className="h-5 w-5 text-brand-600" />
          {dict.camps.when}
        </h2>
        <p className="mt-2 text-sm leading-relaxed">
          {formatDate(camp.startsAt, locale)} ·{" "}
          {formatTimeRange(camp.startsAt, camp.endsAt, locale)}
        </p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted">{dict.camps.venue}</dt>
            <dd className="mt-1 font-medium">
              {camp.venue}, {districtName(camp.districtCode, locale)}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted">{dict.camps.organiser}</dt>
            <dd className="mt-1 font-medium">{camp.organizerName}</dd>
          </div>
          {camp.contactPhone ? (
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted">{dict.camps.contact}</dt>
              <dd className="mt-1">
                <a
                  className="inline-flex items-center gap-1.5 font-medium text-brand-700 hover:underline"
                  href={`tel:${camp.contactPhone.replace(/\s/g, "")}`}
                >
                  <PhoneIcon className="h-4 w-4" />
                  {camp.contactPhone}
                </a>
              </dd>
            </div>
          ) : null}
        </dl>
        {camp.description ? (
          <p className="mt-4 text-sm leading-relaxed text-ink-soft">{camp.description}</p>
        ) : null}
      </section>

      <section className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="card p-4">
          <h2 className="text-sm font-semibold">{dict.learn.guide.eligibilityTitle}</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            {dict.learn.guide.eligibilityBody}
          </p>
          <Link
            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
            href={`${base}/learn/donation-guide`}
          >
            {dict.learn.browseGuide}
            <ArrowIcon className="h-3 w-3" />
          </Link>
        </div>
        <div className="card p-4">
          <h2 className="text-sm font-semibold">{dict.donorDemo.eyebrow}</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">{dict.donorDemo.landingSubtitle}</p>
          <Link
            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
            href={`${base}/donor/demo`}
          >
            {dict.donorDemo.start}
            <ArrowIcon className="h-3 w-3" />
          </Link>
        </div>
      </section>

      <div className="mt-5">
        <Callout tone="neutral">{dict.camps.subtitle}</Callout>
      </div>
    </div>
  );
}
