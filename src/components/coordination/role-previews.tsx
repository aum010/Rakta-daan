"use client";

import Link from "next/link";
import { format, type Locale } from "@/lib/i18n";
import type { Dictionary } from "@/messages/en";
import { bloodGroupLabel, componentLabel, urgencyLabel, type BloodGroup } from "@/lib/blood";
import {
  DEMO_ABUSE_REPORTS,
  DEMO_FACILITIES,
  DEMO_ORG_REQUESTS,
  DEMO_VERIFICATION_CASES,
} from "@/mocks/fixtures";
import { computeAllocation } from "@/lib/coordination/request-machine";
import { useCoordination } from "@/lib/coordination/store";
import { Badge, Callout, DemoBanner, Stat } from "@/components/ui/ui";
import { WavePanel } from "./candidates";

/**
 * Mobile previews of the three operational roles: the facility desk, the
 * coordinator running waves, and the administrator reviewing queues.
 *
 * Every number here comes from the demonstration fixtures or the local
 * coordination store — there is no backend session behind these screens.
 */
export function RolePreviews({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const { request } = useCoordination();
  const allocation = request ? computeAllocation(request) : null;

  const facility = DEMO_FACILITIES[0];
  const openRequests = DEMO_ORG_REQUESTS.filter((item) => item.status === "open");
  const pendingVerifications = DEMO_VERIFICATION_CASES.filter(
    (item) => item.status === "pending",
  );
  const openAbuse = DEMO_ABUSE_REPORTS.filter((item) => item.status === "open");

  const reasonLabel: Record<string, string> = {
    fake: dict.abuse.reasonFake,
    harassment: dict.abuse.reasonHarassment,
    spam: dict.abuse.reasonSpam,
    wrong: dict.abuse.reasonWrong,
    other: dict.abuse.reasonOther,
  };

  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2 md:items-start xl:grid-cols-3">
      <div className="md:col-span-2 xl:col-span-3">
        <DemoBanner>{dict.coord.home.demoNote}</DemoBanner>
        <div className="mt-4">
          <Callout tone="info">{dict.coord.facility.previewNote}</Callout>
        </div>
      </div>

      {/* ---------------------------------------------------------- *
       * Facility desk
       * ---------------------------------------------------------- */}
      {facility ? (
        <section className="card p-4" aria-labelledby="facility-title">
        <p className="eyebrow">{dict.coord.facility.title}</p>
        <h2 id="facility-title" className="mt-1 text-lg font-semibold">
          {facility.name}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          {dict.coord.facility.subtitle}
        </p>

        <p className="eyebrow mt-4">{dict.coord.facility.inventory}</p>
        <ul className="mt-2 grid gap-2">
          {facility.inventory.map((row) => (
            <li
              key={`${row.group}-${row.component}`}
              className="flex items-start justify-between gap-3 rounded-xl border border-line bg-surface-muted p-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold">
                  {bloodGroupLabel(row.group as BloodGroup, locale)} · {row.units} ×{" "}
                  {componentLabel(row.component, locale)}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {format(dict.coord.facility.freshness, {
                    time: new Date(row.updatedAt).toLocaleString(),
                  })}
                </p>
              </div>
              {row.stale ? <Badge tone="amber">{dict.coord.facility.stale}</Badge> : null}
            </li>
          ))}
        </ul>

        <p className="eyebrow mt-4">{dict.coord.facility.incoming}</p>
        <ul className="mt-2 grid gap-2">
          {openRequests.map((item) => (
            <li
              key={item.reference}
              className="rounded-xl border border-line bg-surface-muted p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold">
                  {bloodGroupLabel(item.bloodGroup, locale)} · {item.units} ×{" "}
                  {componentLabel(item.component, locale)}
                </p>
                <Badge tone={item.urgency === "routine" ? "neutral" : "danger"}>
                  {urgencyLabel(item.urgency, locale)}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted">
                {item.facility} · {item.reference} ·{" "}
                {new Date(item.neededBy).toLocaleDateString()}
              </p>
            </li>
          ))}
          {openRequests.length === 0 ? (
            <li className="text-sm text-muted">{dict.coord.home.activeNoneBody}</li>
          ) : null}
        </ul>

        <section className="mt-4 rounded-xl border border-line bg-surface-muted p-3">
          <h3 className="text-sm font-semibold">{dict.coord.facility.confirmDonation}</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            {dict.coord.facility.confirmBody}
          </p>
          <Link className="button-secondary mt-2 w-full" href={`/${locale}/app/track`}>
            {dict.coord.home.trackCta}
          </Link>
        </section>
        </section>
      ) : null}

      {/* ---------------------------------------------------------- *
       * Coordinator
       * ---------------------------------------------------------- */}
      <section className="card p-4" aria-labelledby="coordinator-title">
        <p className="eyebrow">{dict.coord.facility.coordinatorTitle}</p>
        <h2 id="coordinator-title" className="mt-1 text-lg font-semibold">
          {dict.coord.track.title}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          {dict.coord.facility.coordinatorBody}
        </p>

        {allocation && request ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Stat
              label={dict.coord.home.activeTitle}
              value={format(dict.coord.home.activeCoverage, {
                committed: allocation.unitsCommitted,
                required: allocation.unitsRequired,
              })}
              hint={request.reference}
            />
            <Stat
              label={dict.coord.home.activeState}
              value={`${allocation.unitsConfirmed} / ${allocation.unitsRequired}`}
              hint={dict.coord.facility.confirmDonation}
            />
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">{dict.coord.home.activeNoneBody}</p>
        )}

        <div className="mt-3">
          <WavePanel dict={dict} />
        </div>
      </section>

      {/* ---------------------------------------------------------- *
       * Administrator
       * ---------------------------------------------------------- */}
      <section className="card p-4" aria-labelledby="admin-title">
        <p className="eyebrow">{dict.coord.facility.adminTitle}</p>
        <h2 id="admin-title" className="mt-1 text-lg font-semibold">
          {dict.adminDemo.title}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          {dict.coord.facility.adminBody}
        </p>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Stat
            label={dict.adminDemo.verificationPending}
            value={pendingVerifications.length}
            hint={dict.adminDemo.verificationTitle}
          />
          <Stat
            label={dict.adminDemo.abuseOpen}
            value={openAbuse.length}
            hint={dict.adminDemo.abuseTitle}
          />
        </div>

        <ul className="mt-3 grid gap-2">
          {pendingVerifications.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-line bg-surface-muted p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{item.organisation}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {item.id} · {item.districtCode} ·{" "}
                  {new Date(item.submittedAt).toLocaleDateString()}
                </p>
              </div>
              <Badge tone="amber">{dict.common.pending}</Badge>
            </li>
          ))}
          {openAbuse.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-line bg-surface-muted p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{item.reference}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {item.id} · {reasonLabel[item.reason] ?? item.reason}
                </p>
              </div>
              <Badge tone="danger">{dict.adminDemo.openRequests}</Badge>
            </li>
          ))}
        </ul>

        <Link className="button-secondary mt-4 w-full" href={`/${locale}/admin/demo`}>
          {dict.adminDemo.openPreview}
        </Link>
      </section>
    </div>
  );
}
