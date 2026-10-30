import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { bloodInventory, organizations } from "@/db/schema";
import { Badge, Callout, EmptyState, PageHeader } from "@/components/ui/ui";
import { getDictionary, isLocale } from "@/lib/i18n";
import { districtName, provinceName } from "@/lib/requests";
import { bloodGroupLabel, componentLabel } from "@/lib/blood";
import { formatDateTime, relativeTime } from "@/lib/dates";
import { INVENTORY_STALE_HOURS } from "@/lib/constants";
import {
  orgTypeLabel,
  verificationLabel,
  verificationTone,
  type VerificationState,
} from "@/lib/labels";

export default async function BankDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const db = getDb();

  const [org] = await db
    .select()
    .from(organizations)
    .where(and(eq(organizations.slug, slug), eq(organizations.isPublic, true)))
    .limit(1);

  if (!org) notFound();

  const rows = await db
    .select()
    .from(bloodInventory)
    .where(eq(bloodInventory.orgId, org.id))
    .orderBy(asc(bloodInventory.bloodGroup), asc(bloodInventory.component));

  const now = new Date();

  return (
    <div className="container-page py-8">
      <PageHeader
        title={locale === "ne" && org.nameNe ? org.nameNe : org.name}
        subtitle={`${orgTypeLabel(org.type, dict)} · ${districtName(org.districtCode, locale)}, ${provinceName(org.provinceCode, locale)}`}
        actions={
          <Link
            className="button-secondary"
            href={`/${locale}/find?district=${org.districtCode}`}
          >
            {dict.nav.findBlood}
          </Link>
        }
      />

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge tone={verificationTone(org.verification as VerificationState)}>
          {verificationLabel(org.verification as VerificationState, dict)}
        </Badge>
        {org.isDemo ? <Badge tone="amber">{dict.common.demoData}</Badge> : null}
        {org.verifiedAt ? (
          <Badge>
            {dict.banks.lastUpdated}: {formatDateTime(org.verifiedAt, locale)}
          </Badge>
        ) : null}
      </div>

      <section className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="card p-5">
          <h2 className="text-lg font-semibold">{dict.banks.inventoryTitle}</h2>
          <p className="mt-1 text-sm text-muted">{dict.banks.inventoryNote}</p>

          {rows.length === 0 ? (
            <div className="mt-4">
              <EmptyState title={dict.banks.neverUpdated} />
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[32rem] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                    <th className="py-2 pr-3 font-semibold">{dict.find.bloodGroup}</th>
                    <th className="py-2 pr-3 font-semibold">{dict.org.component}</th>
                    <th className="py-2 pr-3 font-semibold">{dict.org.units}</th>
                    <th className="py-2 font-semibold">{dict.banks.lastUpdated}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const hours = (now.getTime() - new Date(row.updatedAt).getTime()) / 3_600_000;
                    const stale = hours >= INVENTORY_STALE_HOURS;
                    return (
                      <tr key={row.id} className="border-b border-line/70 last:border-0">
                        <td className="py-2.5 pr-3 font-medium">
                          {bloodGroupLabel(row.bloodGroup, locale)}
                        </td>
                        <td className="py-2.5 pr-3 text-muted">
                          {componentLabel(row.component, locale)}
                        </td>
                        <td className="py-2.5 pr-3 font-semibold">{row.units}</td>
                        <td className="py-2.5">
                          <span className="text-muted">
                            {relativeTime(row.updatedAt, now, locale)}
                          </span>
                          {stale ? (
                            <span className="ml-2 inline-flex">
                              <Badge tone="amber">{dict.find.stale}</Badge>
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-4 text-xs leading-relaxed text-muted">{dict.find.disclaimer}</p>
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <h2 className="text-lg font-semibold">{dict.banks.contactTitle}</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {org.phone ? (
                <li>
                  <a className="underline" href={`tel:${org.phone.replace(/\s/g, "")}`}>
                    {org.phone}
                  </a>
                </li>
              ) : null}
              {org.email ? (
                <li>
                  <a className="underline" href={`mailto:${org.email}`}>
                    {org.email}
                  </a>
                </li>
              ) : null}
              {org.website ? (
                <li>
                  <a
                    className="underline"
                    href={org.website}
                    rel="nofollow noopener noreferrer"
                    target="_blank"
                  >
                    {org.website}
                  </a>
                </li>
              ) : null}
              {org.address ? <li className="text-muted">{org.address}</li> : null}
            </ul>
          </div>

          <Callout tone="info" title={dict.home.trustVerifiedTitle}>
            {dict.home.trustVerifiedBody}
          </Callout>

          <Callout tone="warning" title={dict.home.trustReportedTitle}>
            {dict.home.trustReportedBody}
          </Callout>

          <Link href={`/${locale}/for-organisations`} className="button-secondary w-full">
            {dict.banks.requestStaffAccess}
          </Link>
        </div>
      </section>
    </div>
  );
}
