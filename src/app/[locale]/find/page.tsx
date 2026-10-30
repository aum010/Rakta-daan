import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getDb } from "@/db";
import { FindForm } from "@/components/blood-search/find-form";
import { Badge, Callout, PageHeader, SectionHeading } from "@/components/ui/ui";
import { getDictionary, isLocale, format } from "@/lib/i18n";
import { availabilitySummary, districtName } from "@/lib/requests";
import { bloodGroupLabel, compatibleDonorGroups, isBloodGroup } from "@/lib/blood";
import { DISTRICTS } from "@/data/geography";
import { relativeTime } from "@/lib/dates";
import { MAX_RADIUS_KM } from "@/lib/constants";
import type { BadgeTone } from "@/components/ui/ui";

const VERIFICATION_TONE: Record<string, BadgeTone> = {
  verified: "teal",
  pending: "amber",
  unverified: "neutral",
  rejected: "danger",
  suspended: "danger",
};

export default async function FindPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    group?: string;
    district?: string;
    radius?: string;
    hospital?: string;
    verified?: string;
    sort?: string;
  }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const query = await searchParams;

  const districtCode = DISTRICTS.some((item) => item.code === query.district)
    ? query.district!
    : "KTM";
  const parsedRadius = Number(query.radius ?? 75);
  const radiusKm =
    Number.isFinite(parsedRadius) && parsedRadius >= 5 && parsedRadius <= MAX_RADIUS_KM
      ? Math.round(parsedRadius)
      : 75;

  if (query.group === "not_sure") {
    redirect(
      `/${locale}/find/guidance?district=${districtCode}&radius=${radiusKm}`,
    );
  }

  const group = query.group && isBloodGroup(query.group) ? query.group : null;
  const hospitalQuery = (query.hospital ?? "").trim();
  const verifiedOnly = query.verified === "1";
  const sort =
    query.sort === "fresh" || query.sort === "name" ? query.sort : "distance";

  const labels = {
    bloodGroup: dict.find.bloodGroup,
    province: dict.find.province,
    district: dict.find.district,
    radius: dict.find.radius,
    search: dict.find.searchButton,
    all: dict.common.all,
    km: dict.common.km,
    notSureLabel: dict.find.notSureLabel,
    groupRequired: dict.find.groupRequired,
    hospital: dict.find.hospital,
    hospitalHint: dict.find.hospitalHint,
    hospitalPlaceholder: dict.find.hospitalPlaceholder,
  };

  const formCard = (
    <div className="card mt-6 p-5">
      <FindForm
        locale={locale}
        defaultGroup={group ?? ""}
        defaultDistrict={districtCode}
        defaultRadius={radiusKm}
        labels={labels}
      />
    </div>
  );

  const notSurePanel = (
    <div className="mt-4 rounded-xl border border-amber-700/20 bg-amber-50 p-4">
      <h2 className="text-base font-semibold text-amber-800">{dict.find.notSureTitle}</h2>
      <p className="mt-1 text-sm leading-relaxed text-amber-800">{dict.find.notSureBody}</p>
      <ol className="mt-3 space-y-2 text-sm text-amber-900">
        {[
          dict.find.notSureStepTest,
          dict.find.notSureStepBanks,
          dict.find.notSureStepRequest,
        ].map((step, index) => (
          <li key={step} className="flex gap-2.5">
            <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-700/15 font-mono text-[0.7rem] font-bold">
              {index + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      <Link
        className="button-secondary mt-3"
        href={`/${locale}/find/guidance?district=${districtCode}&radius=${radiusKm}`}
      >
        {dict.find.readGuidance}
      </Link>
    </div>
  );

  if (!group) {
    return (
      <div className="container-page py-8">
        <PageHeader title={dict.find.title} subtitle={dict.find.subtitle} />
        {formCard}

        <section className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="card p-5">
            <h2 className="text-xl font-bold">{dict.find.noResultsTitle}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              {dict.find.noResultsBody}
            </p>
            {notSurePanel}
          </div>
          <div className="card p-5">
            <h2 className="text-lg font-semibold">{dict.find.notSureTitle}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {dict.find.donorPrivacyNote}
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <Link className="button-secondary" href={`/${locale}/banks`}>
                {dict.find.notSureCta}
              </Link>
              <Link className="button-ghost" href={`/${locale}/request/new`}>
                {dict.find.submitRequest}
              </Link>
            </div>
          </div>
        </section>

        <div className="mt-6 space-y-3">
          <Callout tone="warning">{dict.find.componentWarning}</Callout>
          <p className="text-xs leading-relaxed text-muted">{dict.find.disclaimer}</p>
        </div>
      </div>
    );
  }

  const summary = await availabilitySummary(getDb(), {
    bloodGroup: group,
    districtCode,
    radiusKm,
  });

  const compatible = compatibleDonorGroups(group)
    .map((item) => bloodGroupLabel(item, locale))
    .join(" · ");

  let banks = summary.banks;
  if (hospitalQuery) {
    const term = hospitalQuery.toLowerCase();
    banks = banks.filter((bank) =>
      [bank.name, bank.nameNe ?? "", districtName(bank.districtCode, locale)]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }
  if (verifiedOnly) banks = banks.filter((bank) => bank.verification === "verified");
  const sorted = [...banks];
  if (sort === "fresh") {
    sorted.sort(
      (a, b) =>
        (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0),
    );
  } else if (sort === "name") {
    sorted.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    sorted.sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));
  }

  const noBankResults = sorted.length === 0;
  const widerRadius = Math.min(MAX_RADIUS_KM, Math.max(radiusKm + 50, radiusKm * 2));
  const searchContext = format(dict.find.searchContext, {
    group: bloodGroupLabel(group, locale),
    district: districtName(districtCode, locale),
  });

  return (
    <div className="container-page py-8">
      <PageHeader
        title={dict.find.title}
        subtitle={dict.find.subtitle}
        actions={
          <>
            <Link className="button-primary" href={`/${locale}/request/new`}>
              {dict.find.createRequest}
            </Link>
            <Link className="button-secondary" href={`/${locale}/banks`}>
              {dict.find.nearbyBanks}
            </Link>
          </>
        }
      />

      {formCard}

      <section className="mt-6 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="card p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="brand">{bloodGroupLabel(group, locale)}</Badge>
            <Badge>{districtName(districtCode, locale)}</Badge>
            <Badge>
              {radiusKm} {dict.common.km}
            </Badge>
            {hospitalQuery ? <Badge tone="info">{hospitalQuery}</Badge> : null}
          </div>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted">
            {searchContext}
          </p>
          <h2 className="mt-1 text-lg font-semibold">
            {format(dict.find.resultTitle, {
              district: districtName(districtCode, locale),
            })}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            {summary.donorCount === "few"
              ? dict.find.donorsFew
              : summary.donorCount === 0
                ? dict.find.donorsNone
                : format(dict.find.donorsAvailable, {
                    count: summary.donorCount,
                    radius: radiusKm,
                  })}
          </p>
          {summary.donorCount === 0 ? (
            <p className="mt-2 text-sm text-muted">{dict.find.donorsNoneHelp}</p>
          ) : null}
          <p className="mt-3 text-xs leading-relaxed text-muted">{dict.find.kAnonymityNote}</p>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            {format(dict.find.genericCompatible, { groups: compatible })}
          </p>
          <div className="mt-4 rounded-lg border border-line bg-surface-muted p-3 text-sm">
            <p className="font-medium">{dict.find.createRequest}</p>
            <p className="mt-1 text-muted">{dict.find.createRequestHint}</p>
            <Link className="button-primary mt-3 w-full sm:w-auto" href={`/${locale}/request/new`}>
              {dict.find.createRequest}
            </Link>
          </div>
        </div>

        <div className="card p-5">
          <SectionHeading
            title={dict.find.banksTitle}
            copy={dict.find.banksSubtitle}
            action={
              <Badge tone={noBankResults ? "amber" : "neutral"}>
                {format(
                  sorted.length === 1 ? dict.find.banksCountOne : dict.find.banksCount,
                  { count: sorted.length },
                )}
              </Badge>
            }
          />

          <form
            className="mt-4 rounded-xl border border-line bg-surface-muted/50 p-3"
            action={`/${locale}/find`}
          >
            <input type="hidden" name="group" value={group} />
            <input type="hidden" name="district" value={districtCode} />
            <input type="hidden" name="radius" value={String(radiusKm)} />
            {hospitalQuery ? (
              <input type="hidden" name="hospital" value={hospitalQuery} />
            ) : null}
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              {dict.find.filtersTitle}
            </p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="field flex-1">
                <label className="label" htmlFor="find-sort">
                  {dict.find.sortLabel}
                </label>
                <select
                  id="find-sort"
                  name="sort"
                  className="input-base"
                  defaultValue={sort}
                >
                  <option value="distance">{dict.find.sortDistance}</option>
                  <option value="fresh">{dict.find.sortFreshness}</option>
                  <option value="name">{dict.find.sortName}</option>
                </select>
              </div>
              <label className="choice-card items-center sm:mb-0.5">
                <input
                  type="checkbox"
                  name="verified"
                  value="1"
                  defaultChecked={verifiedOnly}
                  className="accent-brand-600"
                />
                <span className="text-sm font-medium">{dict.find.filtersVerified}</span>
              </label>
              <button type="submit" className="button-secondary sm:self-end">
                {dict.find.filterApply}
              </button>
            </div>
            {(verifiedOnly || hospitalQuery || sort !== "distance") && (
              <Link
                className="mt-2 inline-block text-xs font-semibold text-brand-700 hover:underline"
                href={`/${locale}/find?group=${group}&district=${districtCode}&radius=${radiusKm}`}
              >
                {dict.find.filterClear}
              </Link>
            )}
          </form>

          {noBankResults ? (
            <div className="mt-4">
              <div className="rounded-xl border border-dashed border-line-strong bg-surface/70 p-5">
                <h3 className="font-semibold">{dict.find.noResultsTitle}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">
                  {dict.find.noResultsBody}
                </p>
                <div className="mt-3 flex flex-col gap-2">
                  {widerRadius > radiusKm ? (
                    <Link
                      className="button-secondary"
                      href={`/${locale}/find?group=${group}&district=${districtCode}&radius=${widerRadius}`}
                    >
                      {dict.find.noResultsRadiusAction} ({widerRadius} {dict.common.km})
                    </Link>
                  ) : null}
                  <Link className="button-secondary" href={`/${locale}/banks?q=${districtCode}`}>
                    {dict.find.noResultsBankAction}
                  </Link>
                  <Link className="button-primary" href={`/${locale}/request/new`}>
                    {dict.find.noResultsRequestAction}
                  </Link>
                  <Link className="button-ghost" href="#find-group">
                    {dict.find.noResultsLocationAction}
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {sorted.map((bank) => (
                <li key={bank.slug} className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link
                      href={`/${locale}/banks/${bank.slug}`}
                      className="font-medium underline-offset-2 hover:underline"
                    >
                      {bank.name}
                    </Link>
                    <Badge tone={VERIFICATION_TONE[bank.verification] ?? "neutral"}>
                      {dict.common[bank.verification as keyof typeof dict.common] ??
                        bank.verification}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                    <span>{districtName(bank.districtCode, locale)}</span>
                    {bank.distanceKm !== null ? (
                      <span>
                        {bank.distanceKm} {dict.common.km}
                      </span>
                    ) : null}
                    <span>
                      {bank.units === null
                        ? dict.find.unitsUnknown
                        : format(
                            bank.units === 1
                              ? dict.find.unitsReportedOne
                              : dict.find.unitsReported,
                            { units: bank.units },
                          )}
                    </span>
                    {bank.updatedAt ? (
                      <span>
                        {format(dict.find.updatedAgo, {
                          time: relativeTime(bank.updatedAt, new Date(), locale),
                        })}
                      </span>
                    ) : null}
                    {bank.stale && bank.units !== null ? (
                      <Badge tone="amber">{dict.find.stale}</Badge>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <div className="mt-4">{notSurePanel}</div>

      <div className="mt-6 space-y-3">
        <Callout tone="warning">{dict.find.componentWarning}</Callout>
        <p className="text-xs leading-relaxed text-muted">{dict.find.disclaimer}</p>
      </div>
    </div>
  );
}
