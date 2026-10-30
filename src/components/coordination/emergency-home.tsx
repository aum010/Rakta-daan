"use client";

import Link from "next/link";
import { format, type Locale } from "@/lib/i18n";
import type { Dictionary } from "@/messages/en";
import { updateCoordination, useCoordination } from "@/lib/coordination/store";
import { computeAllocation } from "@/lib/coordination/request-machine";
import { DemoBanner, EmergencyNote } from "@/components/ui/ui";
import {
  ArrowIcon,
  ClipboardIcon,
  PinIcon,
  ShieldIcon,
  UsersIcon,
} from "@/components/ui/icons";
import { bloodGroupShort, urgencyLabel } from "@/lib/blood";
import { RequestStateBadge } from "./status";

/**
 * Role-aware emergency home for the mobile-first coordination flow.
 * Everything shown here comes from browser-local demo state.
 */
export function EmergencyHome({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const { request, role } = useCoordination();
  const allocation = request ? computeAllocation(request) : null;
  const targetRole = role === "donor" ? "requester" : "donor";
  const targetRoleName =
    targetRole === "donor" ? dict.coord.nav.roleDonor : dict.coord.nav.roleRequester;
  const coveragePercent = allocation
    ? Math.min(100, Math.round((allocation.unitsCommitted / allocation.unitsRequired) * 100))
    : 0;

  const quickActions = [
    { key: "locate", label: dict.coord.home.quickLocate, href: `/${locale}/app/location`, Icon: PinIcon },
    {
      key: "scenarios",
      label: dict.coord.home.quickScenarios,
      href: `/${locale}/app/scenarios`,
      Icon: ClipboardIcon,
    },
    { key: "safety", label: dict.coord.home.quickSafety, href: `/${locale}/safety`, Icon: ShieldIcon },
    { key: "roles", label: dict.coord.home.quickRoles, href: `/${locale}/app/roles`, Icon: UsersIcon },
  ];

  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2 md:items-start">
      {/* Emergency call to action — the reason the page exists, so it keeps the
          full width on every tier */}
      <section className="rounded-2xl border border-brand-700 bg-brand-600 p-4 text-white shadow-sm sm:p-5 md:col-span-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/80">
          {dict.coord.home.eyebrow}
        </p>
        <h2 className="mt-1.5 text-xl font-bold">{dict.coord.home.emergencyTitle}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-white/90">
          {dict.coord.home.emergencyBody}
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Link
            href={`/${locale}/request/new`}
            className="rounded-lg bg-white px-4 py-2.5 text-center text-sm font-semibold text-brand-700 hover:bg-brand-50"
          >
            {dict.coord.home.emergencyCta}
          </Link>
          <Link
            href={`/${locale}/banks`}
            className="rounded-lg border border-white/70 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-white/10"
          >
            {dict.coord.home.findCta}
          </Link>
        </div>
      </section>

      {/* Active request or empty state — compact card with tag pills */}
      {request && allocation ? (
        <section className="card p-3" aria-labelledby="active-request-title">
          <div className="flex items-center justify-between gap-2">
            <p className="eyebrow">{dict.coord.home.activeTitle}</p>
            <RequestStateBadge state={request.state} dict={dict} />
          </div>
          <h3 id="active-request-title" className="mt-1 truncate text-base font-semibold">
            {request.hospital}
          </h3>

          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
              {bloodGroupShort(request.bloodGroup)}
            </span>
            <span className="rounded-full border border-line bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-ink-soft">
              {urgencyLabel(request.urgency, locale)}
            </span>
            <span className="rounded-full border border-line bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-ink-soft">
              {request.reference}
            </span>
          </div>

          <p className="mt-2 text-xs leading-relaxed text-muted">
            {dict.coord.request.neededBy}: {new Date(request.neededBy).toLocaleString()}
          </p>

          <p className="mt-2 text-sm text-ink-soft">
            {format(dict.coord.home.activeCoverage, {
              committed: allocation.unitsCommitted,
              required: allocation.unitsRequired,
            })}
          </p>
          <div
            className="progress-track mt-2"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={allocation.unitsRequired}
            aria-valuenow={allocation.unitsCommitted}
            aria-label={dict.coord.request.coverage}
          >
            <div className="progress-fill" style={{ width: `${coveragePercent}%` }} />
          </div>

          <Link href={`/${locale}/app/track`} className="button-primary mt-4 w-full">
            {dict.coord.home.trackCta}
          </Link>
        </section>
      ) : (
        <section className="card p-4">
          <p className="eyebrow">{dict.coord.home.activeTitle}</p>
          <h3 className="mt-1 text-lg font-semibold">{dict.coord.home.activeNoneTitle}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            {dict.coord.home.activeNoneBody}
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Link href={`/${locale}/request/new`} className="button-primary flex-1">
              {dict.coord.home.emergencyCta}
            </Link>
            <Link href={`/${locale}/request/status`} className="button-secondary flex-1">
              {dict.requestDemo.status.lookupTitle}
            </Link>
          </div>
        </section>
      )}

      {/* Role — compact inline row */}
      <section className="card p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow">{dict.coord.home.roleTitle}</p>
            <p className="mt-0.5 text-sm font-semibold">
              {role === "donor" ? dict.coord.nav.roleDonor : dict.coord.nav.roleRequester}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted">
              {role === "donor" ? dict.coord.home.roleDonorBody : dict.coord.home.roleRequesterBody}
            </p>
          </div>
          <button
            type="button"
            className="button-secondary !min-h-0 shrink-0 !px-3 !py-2 text-xs"
            onClick={() => updateCoordination({ role: targetRole })}
          >
            {format(dict.coord.nav.switchRole, { role: targetRoleName })}
          </button>
        </div>
      </section>

      {role === "requester" ? (
        <section className="card flex items-center justify-between gap-3 p-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">{dict.coord.home.donorTitle}</h3>
            <p className="mt-0.5 text-xs leading-relaxed text-muted">
              {dict.coord.home.donorBody}
            </p>
          </div>
          <Link
            href={`/${locale}/app/donor`}
            className="button-secondary !min-h-0 shrink-0 !px-3 !py-2 text-xs"
          >
            {dict.coord.home.donorCta}
          </Link>
        </section>
      ) : null}

      {/* Quick actions — compact 2-column tiles */}
      <section aria-labelledby="quick-actions-title">
        <h3 id="quick-actions-title" className="text-sm font-semibold">
          {dict.coord.home.quickTitle}
        </h3>
        <ul className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
          {quickActions.map(({ key, label, href, Icon }) => (
            <li key={key}>
              <Link
                href={href}
                className="card flex h-full flex-col gap-1.5 p-3 hover:bg-surface-muted"
              >
                <span
                  aria-hidden="true"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600"
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="flex items-center gap-1 text-sm font-semibold">
                  {label}
                  <ArrowIcon className="h-3.5 w-3.5 shrink-0 text-muted" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="md:col-span-2">
        <DemoBanner>{dict.coord.home.demoNote}</DemoBanner>
      </div>
      <div className="md:col-span-2">
        <EmergencyNote>{dict.coord.safety.emergency}</EmergencyNote>
      </div>
    </div>
  );
}
