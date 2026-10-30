import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { bloodInventory, orgMembers, organizations } from "@/db/schema";
import { Badge, Callout, EmptyState, PageHeader } from "@/components/ui/ui";
import { InventoryForm } from "@/components/organization/inventory-form";
import { requireUser } from "@/lib/auth";
import { getDictionary, isLocale } from "@/lib/i18n";
import { districtName } from "@/lib/requests";
import { relativeTime } from "@/lib/dates";
import {
  orgTypeLabel,
  verificationLabel,
  verificationTone,
  type VerificationState,
} from "@/lib/labels";
import type { BloodComponent, BloodGroup } from "@/lib/blood";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function OrgPortalPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ org?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const user = await requireUser(locale, `/${locale}/org`);
  const db = getDb();
  const { org: requestedSlug } = await searchParams;

  const memberships = await db
    .select({
      orgId: organizations.id,
      slug: organizations.slug,
      name: organizations.name,
      role: orgMembers.role,
    })
    .from(orgMembers)
    .innerJoin(organizations, eq(organizations.id, orgMembers.orgId))
    .where(eq(orgMembers.userId, user.id));

  if (memberships.length === 0) {
    return (
      <div className="container-page max-w-2xl py-10">
        <PageHeader title={dict.org.title} subtitle={dict.org.subtitle} />
        <div className="mt-6">
          <EmptyState title={dict.org.noAccess}>{dict.org.noAccessHelp}</EmptyState>
        </div>
        <Link className="button-secondary mt-4" href={`/${locale}/for-organisations`}>
          {dict.org.requestAccess}
        </Link>
      </div>
    );
  }

  const selected =
    memberships.find((membership) => membership.slug === requestedSlug) ?? memberships[0]!;

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, selected.orgId))
    .limit(1);
  if (!org) notFound();

  const inventory = await db
    .select()
    .from(bloodInventory)
    .where(eq(bloodInventory.orgId, org.id))
    .orderBy(asc(bloodInventory.bloodGroup), asc(bloodInventory.component));

  const initial: Record<string, number> = {};
  for (const row of inventory) {
    initial[`${row.bloodGroup as BloodGroup}:${row.component as BloodComponent}`] = row.units;
  }

  const lastUpdated = inventory.reduce<Date | null>((latest, row) => {
    const updated = new Date(row.updatedAt);
    return !latest || updated > latest ? updated : latest;
  }, null);

  const team = await db
    .select({ role: orgMembers.role, userId: orgMembers.userId })
    .from(orgMembers)
    .where(inArray(orgMembers.orgId, [org.id]));

  return (
    <div className="container-page max-w-4xl py-8">
      <PageHeader
        title={selected.name}
        subtitle={`${orgTypeLabel(org.type, dict)} · ${districtName(org.districtCode, locale)}`}
        actions={
          <Badge tone={verificationTone(org.verification as VerificationState)}>
            {verificationLabel(org.verification as VerificationState, dict)}
          </Badge>
        }
      />

      {memberships.length > 1 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {memberships.map((membership) => (
            <Link
              key={membership.orgId}
              href={`/${locale}/org?org=${membership.slug}`}
              className={`badge ${membership.orgId === org.id ? "bg-brand-50 text-brand-700 border-brand-200" : ""}`}
            >
              {membership.name}
            </Link>
          ))}
        </div>
      ) : null}

      {org.verification !== "verified" ? (
        <div className="mt-4">
          <Callout tone="warning" title={dict.org.verificationPending}>
            {dict.home.trustVerifiedBody}
          </Callout>
        </div>
      ) : null}

      <section className="card mt-5 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold">{dict.org.inventory}</h2>
          <p className="text-xs text-muted">
            {lastUpdated
              ? `${dict.banks.lastUpdated}: ${relativeTime(lastUpdated, new Date(), locale)}`
              : dict.banks.neverUpdated}
          </p>
        </div>
        <p className="mt-1 text-sm text-muted">{dict.org.freshness}</p>
        <div className="mt-4">
          <InventoryForm
            orgSlug={org.slug}
            locale={locale}
            dict={dict}
            initial={initial}
            readOnly={selected.role === "viewer"}
          />
        </div>
        <p className="mt-4 text-xs leading-relaxed text-muted">{dict.find.disclaimer}</p>
      </section>

      <section className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="card p-5">
          <h2 className="text-base font-semibold">{dict.org.members}</h2>
          <ul className="mt-2 space-y-1 text-sm text-muted">
            {team.map((member) => (
              <li key={member.userId}>
                {member.role} · {member.userId.slice(0, 8)}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">{dict.org.noAccessHelp}</p>
        </div>

        <div className="card p-5">
          <h2 className="text-base font-semibold">{dict.banks.contactTitle}</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {org.phone ? <li>{org.phone}</li> : null}
            {org.email ? <li>{org.email}</li> : null}
            {org.address ? <li className="text-muted">{org.address}</li> : null}
          </ul>
          <Link className="button-secondary mt-3" href={`/${locale}/banks/${org.slug}`}>
            {dict.common.view}
          </Link>
        </div>
      </section>

      <p className="mt-6 text-xs text-muted">
        <Link className="underline" href={`/${locale}/dashboard`}>
          {dict.common.dashboard}
        </Link>
      </p>
    </div>
  );
}
