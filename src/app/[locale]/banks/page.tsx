import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, ilike, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { bloodInventory, organizations } from "@/db/schema";
import { Badge, EmptyState, PageHeader } from "@/components/ui/ui";
import { getDictionary, isLocale } from "@/lib/i18n";
import { districtName } from "@/lib/requests";
import { INVENTORY_STALE_HOURS } from "@/lib/constants";
import { relativeTime } from "@/lib/dates";
import {
  orgTypeLabel,
  verificationLabel,
  verificationTone,
  type VerificationState,
} from "@/lib/labels";

export default async function BanksPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; v?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const { q, v } = await searchParams;
  const db = getDb();

  const filters = [eq(organizations.isPublic, true)];
  if (v && ["verified", "pending", "unverified"].includes(v)) {
    filters.push(sql`${organizations.verification} = ${v}`);
  }
  if (q && q.trim()) {
    const term = `%${q.trim()}%`;
    filters.push(
      or(
        ilike(organizations.name, term),
        ilike(organizations.districtCode, term),
        ilike(organizations.slug, term),
      )!,
    );
  }

  const rows = await db
    .select({
      slug: organizations.slug,
      name: organizations.name,
      nameNe: organizations.nameNe,
      type: organizations.type,
      verification: organizations.verification,
      districtCode: organizations.districtCode,
      isDemo: organizations.isDemo,
      stockRows: sql<number>`count(${bloodInventory.id})::int`,
      freshRows: sql<number>`count(case when ${bloodInventory.units} > 0 and ${bloodInventory.updatedAt} > now() - interval '${sql.raw(String(INVENTORY_STALE_HOURS))} hours' then 1 end)::int`,
      lastUpdated: sql<Date | null>`max(${bloodInventory.updatedAt})`,
    })
    .from(organizations)
    .leftJoin(bloodInventory, eq(bloodInventory.orgId, organizations.id))
    .where(and(...filters))
    .groupBy(organizations.id)
    .orderBy(organizations.name)
    .limit(100);

  return (
    <div className="container-page py-8">
      <PageHeader title={dict.banks.title} subtitle={dict.banks.subtitle} />

      <form className="mt-5 flex flex-col gap-2 sm:flex-row" action={`/${locale}/banks`}>
        <label className="sr-only" htmlFor="bank-search">
          {dict.banks.searchPlaceholder}
        </label>
        <input
          id="bank-search"
          name="q"
          defaultValue={q ?? ""}
          placeholder={dict.banks.searchPlaceholder}
          className="input-base sm:max-w-sm"
        />
        <select name="v" defaultValue={v ?? ""} className="input-base sm:max-w-[12rem]" aria-label={dict.banks.filterVerification}>
          <option value="">{dict.common.all}</option>
          <option value="verified">{dict.common.verified}</option>
          <option value="pending">{dict.common.pending}</option>
          <option value="unverified">{dict.common.unverified}</option>
        </select>
        <button type="submit" className="button-secondary">
          {dict.common.search}
        </button>
      </form>

      {rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState title={dict.banks.empty}>{dict.banks.emptyHelp}</EmptyState>
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {rows.map((org) => (
            <li key={org.slug} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link
                    href={`/${locale}/banks/${org.slug}`}
                    className="text-lg font-semibold underline-offset-2 hover:underline"
                  >
                    {org.name}
                  </Link>
                  <p className="mt-0.5 text-sm text-muted">
                    {orgTypeLabel(org.type, dict)} · {districtName(org.districtCode, locale)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {org.isDemo ? <Badge tone="amber">{dict.common.demoData}</Badge> : null}
                  <Badge tone={verificationTone(org.verification as VerificationState)}>
                    {verificationLabel(org.verification as VerificationState, dict)}
                  </Badge>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                <span>
                  {dict.banks.stockRows}: {org.stockRows}
                </span>
                <span>
                  {dict.banks.freshRows}: {org.freshRows}
                </span>
                {org.lastUpdated ? (
                  <span>
                    {dict.banks.lastUpdated}:{" "}
                    {relativeTime(org.lastUpdated, new Date(), locale)}
                  </span>
                ) : (
                  <span>{dict.banks.neverUpdated}</span>
                )}
              </div>
              <Link
                href={`/${locale}/banks/${org.slug}`}
                className="button-secondary mt-4 w-full sm:w-auto"
              >
                {dict.common.view}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-xs leading-relaxed text-muted">{dict.banks.inventoryNote}</p>
    </div>
  );
}
