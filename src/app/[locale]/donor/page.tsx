import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { Badge, Callout, EmptyState, PageHeader, Stat } from "@/components/ui/ui";
import { DonorControls } from "@/components/donor/donor-controls";
import { requireUser } from "@/lib/auth";
import { getDictionary, format, isLocale } from "@/lib/i18n";
import { donorByUserId, pendingInvitations, districtName } from "@/lib/requests";
import { getDonorConsents } from "@/lib/consent";
import { AVAILABILITY_FRESH_DAYS, DONATION_COOLDOWN_DAYS } from "@/lib/constants";
import { addDays, formatDate, relativeTime } from "@/lib/dates";
import { availabilityLabel } from "@/lib/labels";
import { bloodGroupShort } from "@/lib/blood";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function DonorDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const user = await requireUser(locale, `/${locale}/donor`);
  const db = getDb();

  const donor = await donorByUserId(db, user.id);

  if (!donor) {
    return (
      <div className="container-page max-w-2xl py-10">
        <PageHeader title={dict.donor.title} subtitle={dict.donor.subtitle} />
        <div className="mt-6">
          <EmptyState title={dict.donor.notADonor}>
            <Link className="button-primary mt-4" href={`/${locale}/register`}>
              {dict.donor.becomeDonor}
            </Link>
          </EmptyState>
        </div>
      </div>
    );
  }

  const consents = await getDonorConsents(db, donor.id);
  const invitations = await pendingInvitations(db, donor.id);
  const now = new Date();

  const confirmedDaysAgo = Math.floor(
    (now.getTime() - new Date(donor.availabilityConfirmedAt).getTime()) / 86_400_000,
  );
  const stale = confirmedDaysAgo > AVAILABILITY_FRESH_DAYS;
  const nextEligible = donor.lastDonationDate
    ? addDays(new Date(`${donor.lastDonationDate}T00:00:00Z`), DONATION_COOLDOWN_DAYS)
    : null;
  const inCooldown = nextEligible ? nextEligible > now : false;

  return (
    <div className="container-page max-w-4xl py-8">
      <PageHeader
        title={dict.donor.title}
        subtitle={dict.donor.subtitle}
        actions={
          <Link className="button-secondary" href={`/${locale}/dashboard`}>
            {dict.common.dashboard}
          </Link>
        }
      />

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge tone={donor.availability === "available" && !stale ? "teal" : "neutral"}>
          {availabilityLabel(donor.availability, dict)}
        </Badge>
        <Badge tone="info">{dict.donor.phoneVerified}</Badge>
        <Badge>
          {dict.find.district}: {districtName(donor.districtCode, locale)}
        </Badge>
      </div>

      {stale ? (
        <div className="mt-4">
          <Callout tone="warning" title={dict.donor.availabilityHint}>
            {relativeTime(donor.availabilityConfirmedAt, now, locale)}
          </Callout>
        </div>
      ) : null}

      {inCooldown && nextEligible ? (
        <div className="mt-4">
          <Callout tone="warning" title={dict.donor.cooldownActive}>
            {format(dict.donor.nextEligible, { date: formatDate(nextEligible, locale) })}
          </Callout>
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Stat
          label={dict.donor.lastDonation}
          value={donor.lastDonationDate ? formatDate(donor.lastDonationDate, locale) : "—"}
        />
        <Stat
          label={dict.donor.invitations}
          value={invitations.filter((item) => item.requestStatus === "open").length}
        />
        <Stat
          label={dict.donor.availability}
          value={relativeTime(donor.availabilityConfirmedAt, now, locale)}
        />
      </div>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="card p-5">
          <h2 className="text-lg font-semibold">{dict.donor.settings}</h2>
          <div className="mt-3">
            <DonorControls
              dict={dict}
              availability={donor.availability}
              consentSms={consents.channel_sms}
              consentWhatsapp={consents.channel_whatsapp}
              consentAlerts={consents.donor_alerts && donor.consentAlerts}
              consentContactRelease={consents.contact_release_on_response}
            />
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-lg font-semibold">{dict.donor.invitations}</h2>
          <p className="mt-1 text-sm text-muted">{dict.donor.distanceNote}</p>

          {invitations.length === 0 ? (
            <div className="mt-3">
              <EmptyState title={dict.donor.noInvitations} />
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {invitations.map((invitation) => (
                <li key={invitation.responseId} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">
                      {bloodGroupShort(invitation.bloodGroup)} ·{" "}
                      {districtName(invitation.districtCode, locale)}
                    </p>
                    <Badge tone={invitation.responseStatus === "interested" ? "teal" : "info"}>
                      {invitation.responseStatus}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted">{invitation.hospital}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {dict.request.neededByLabel}:{" "}
                    {formatDate(invitation.neededBy, locale)} ·{" "}
                    {relativeTime(invitation.createdAt, now, locale)}
                  </p>
                  <Link
                    className="button-secondary mt-2 !min-h-0 !py-1.5 text-sm"
                    href={`/${locale}/respond/${invitation.respondToken}`}
                  >
                    {dict.donor.respond}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <div className="mt-6">
        <Callout tone="info" title={dict.donor.verification}>
          {dict.donor.phoneVerified} · {dict.respond.privacyNote}
        </Callout>
      </div>
    </div>
  );
}
