import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { organizations } from "@/db/schema";
import { Badge, Callout, EmptyState, PageHeader } from "@/components/ui/ui";
import { getDictionary, isLocale } from "@/lib/i18n";
import { districtName } from "@/lib/requests";
import { DISTRICTS } from "@/data/geography";
import { orgTypeLabel, verificationLabel, verificationTone } from "@/lib/labels";
import type { VerificationState } from "@/lib/labels";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return {
    title: `${dict.find.notSureTitle} — ${dict.common.appName}`,
    description: dict.find.notSureBody,
  };
}

export default async function FindGuidancePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ district?: string; radius?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const query = await searchParams;
  const districtCode = DISTRICTS.some((item) => item.code === query.district)
    ? query.district!
    : "KTM";
  const radiusKm = Number(query.radius) || 75;
  const base = `/${locale}`;

  const rows = await getDb()
    .select({
      slug: organizations.slug,
      name: organizations.name,
      type: organizations.type,
      verification: organizations.verification,
      isDemo: organizations.isDemo,
      address: organizations.address,
      phone: organizations.phone,
    })
    .from(organizations)
    .where(
      and(
        eq(organizations.isPublic, true),
        eq(organizations.districtCode, districtCode),
        sql`${organizations.verification} <> 'suspended'`,
      ),
    )
    .orderBy(asc(organizations.name))
    .limit(20);

  const steps = [
    dict.find.notSureStepTest,
    dict.find.notSureStepBanks,
    dict.find.notSureStepRequest,
  ];

  return (
    <div className="container-page max-w-4xl py-8">
      <PageHeader
        eyebrow={dict.find.bloodGroup}
        title={dict.find.notSureTitle}
        subtitle={dict.find.notSureBody}
        breadcrumbs={[
          { href: base, label: dict.common.appName },
          { href: `${base}/find`, label: dict.find.title },
          { href: `${base}/find/guidance`, label: dict.find.notSureTitle },
        ]}
        actions={
          <Link className="button-primary" href={`${base}/request/new`}>
            {dict.find.submitRequest}
          </Link>
        }
      />

      <div className="mt-5">
        <Callout tone="warning" title={dict.home.emergencyTitle}>
          {dict.home.emergencyBody}
        </Callout>
      </div>

      <section className="mt-6 grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <div className="card p-5">
          <h2 className="text-lg font-semibold">{dict.find.notSureTitle}</h2>
          <ol className="mt-3 space-y-3">
            {steps.map((step, index) => (
              <li key={step} className="flex gap-3 text-sm leading-relaxed text-ink-soft">
                <span className="step-number">{index + 1}</span>
                <span className="pt-1">{step}</span>
              </li>
            ))}
          </ol>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Link className="button-secondary" href={`${base}/banks?q=${districtCode}`}>
              {dict.find.notSureCta}
            </Link>
            <Link className="button-primary" href={`${base}/request/new`}>
              {dict.find.submitRequest}
            </Link>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-base font-semibold">{dict.find.donorsTitle}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {dict.find.donorPrivacyNote}
          </p>
          <p className="mt-3 text-xs leading-relaxed text-muted">{dict.find.kAnonymityNote}</p>
          <Link className="button-secondary mt-4 w-full" href={`${base}/find?district=${districtCode}`}>
            {dict.find.searchAnother}
          </Link>
        </div>
      </section>

      <section className="mt-8" aria-labelledby="guidance-facilities">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="guidance-facilities" className="text-lg font-semibold">
              {dict.find.banksTitle}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {districtName(districtCode, locale)} · {radiusKm} {dict.common.km}
            </p>
          </div>
          <Link
            className="button-ghost"
            href={`${base}/find?group=O_POS&district=${districtCode}&radius=${radiusKm}`}
          >
            {dict.find.searchAnother}
          </Link>
        </div>

        {rows.length === 0 ? (
          <div className="mt-4">
            <EmptyState title={dict.find.banksEmpty}>
              <p>{dict.find.banksEmptyHelp}</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <Link className="button-secondary" href={`${base}/banks`}>
                  {dict.find.nearbyBanks}
                </Link>
                <Link className="button-primary" href={`${base}/request/new`}>
                  {dict.find.submitRequest}
                </Link>
              </div>
            </EmptyState>
          </div>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {rows.map((row) => (
              <li key={row.slug} className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <Link
                    className="font-semibold underline-offset-2 hover:underline"
                    href={`${base}/banks/${row.slug}`}
                  >
                    {row.name}
                  </Link>
                  <div className="flex flex-wrap gap-1.5">
                    {row.isDemo ? <Badge tone="amber">{dict.common.demoData}</Badge> : null}
                    <Badge tone={verificationTone(row.verification as VerificationState)}>
                      {verificationLabel(row.verification as VerificationState, dict)}
                    </Badge>
                  </div>
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  {orgTypeLabel(row.type, dict)}
                  {row.address ? ` · ${row.address}` : ""}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link className="button-secondary !min-h-0 !py-1.5 text-sm" href={`${base}/banks/${row.slug}`}>
                    {dict.common.seeDetails}
                  </Link>
                  {row.phone ? (
                    <a className="button-ghost !min-h-0 !py-1.5 text-sm" href={`tel:${row.phone}`}>
                      {dict.common.callNow}
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-6 text-xs leading-relaxed text-muted">{dict.find.disclaimer}</p>
    </div>
  );
}
