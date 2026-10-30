"use client";

import { useState } from "react";
import Link from "next/link";
import { format, type Locale } from "@/lib/i18n";
import type { Dictionary } from "@/messages/en";
import { useCoordination } from "@/lib/coordination/store";
import { computeAllocation } from "@/lib/coordination/request-machine";
import { bloodGroupShort, componentLabel, urgencyLabel } from "@/lib/blood";
import { MOCK_CANDIDATES } from "@/lib/coordination/candidates";
import { eligibleOnly, rankCandidates } from "@/lib/coordination/waves";
import type { CoordinationRequest, MockCandidate, TimelineEvent } from "@/lib/coordination/types";
import { DemoBanner, EmergencyNote, EmptyState } from "@/components/ui/ui";
import { CandidateList, WavePanel } from "./candidates";
import { ParticipantsPanel } from "./participants";
import { CoordinationMap } from "./map";
import { RequestStateBadge, timelineLabel } from "./status";
import { RequestActions } from "./request-actions";
import { ContactPanel } from "./contact";
import { TripMap } from "./trip-map";

type TabKey = "overview" | "map" | "donors" | "contact" | "activity";

/** Eligible candidates in the current wave's radius, shown as map pins. */
function nearbyCandidates(request: CoordinationRequest): MockCandidate[] {
  const wave =
    request.waves.find((item) => item.index === Math.max(1, request.activeWave)) ??
    request.waves[0];
  const involved = new Set(request.participants.map((item) => item.donorId));
  return eligibleOnly(
    rankCandidates(MOCK_CANDIDATES, request, {
      radiusKm: wave?.radiusKm ?? 30,
      involved,
      now: new Date(),
    }),
  );
}

/**
 * Groups consecutive invitation events so the activity list reads as one
 * "N candidates invited" line instead of one line per candidate.
 */
function groupTimeline(timeline: TimelineEvent[]): TimelineEvent[] {
  const out: TimelineEvent[] = [];
  for (const event of timeline) {
    const previous = out[out.length - 1];
    if (event.kind === "candidate_invited" && previous?.kind === "candidate_invited") {
      out[out.length - 1] = {
        ...previous,
        detail: String(Number(previous.detail ?? "0") + 1),
        at: event.at,
      };
      continue;
    }
    out.push({ ...event });
  }
  return out;
}

function RequestOverview({
  dict,
  request,
  locale,
}: {
  dict: Dictionary;
  request: CoordinationRequest;
  locale: Locale;
}) {
  const allocation = computeAllocation(request);
  const committedPercent = Math.min(
    100,
    Math.round((allocation.unitsCommitted / allocation.unitsRequired) * 100),
  );
  const confirmedPercent = Math.min(
    100,
    Math.round((allocation.unitsConfirmed / allocation.unitsRequired) * 100),
  );

  return (
    <div className="grid gap-4">
      <section className="card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow">{dict.coord.request.reference}</p>
            <h2 className="mt-1 text-xl font-bold">{request.hospital}</h2>
            <p className="mt-1 text-sm text-muted">{request.reference}</p>
          </div>
          <RequestStateBadge state={request.state} dict={dict} />
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
            {bloodGroupShort(request.bloodGroup)}
          </span>
          <span className="rounded-full border border-line bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-ink-soft">
            {urgencyLabel(request.urgency, locale)}
          </span>
          <span className="rounded-full border border-line bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-ink-soft">
            {componentLabel(request.component, locale)}
          </span>
        </div>

        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
          <div className="flex min-w-0 gap-1.5">
            <dt className="shrink-0 text-muted">{dict.coord.request.reference}</dt>
            <dd className="truncate font-medium">{request.reference}</dd>
          </div>
          <div className="flex min-w-0 gap-1.5">
            <dt className="shrink-0 text-muted">{dict.coord.request.neededBy}</dt>
            <dd className="truncate font-medium">{new Date(request.neededBy).toLocaleString()}</dd>
          </div>
        </dl>
      </section>

      <section className="card p-4" aria-labelledby="coverage-title">
        <h3 id="coverage-title" className="text-base font-semibold">
          {dict.coord.request.coverage}
        </h3>
        {/* Compact three-across mini stats (mobile density) */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-line bg-surface p-2 text-center">
            <p className="text-lg font-bold leading-none">{allocation.unitsRequired}</p>
            <p className="mt-1 text-[10px] font-medium uppercase leading-tight tracking-wide text-muted">
              {dict.coord.request.unitsRequired}
            </p>
          </div>
          <div className="rounded-xl border border-line bg-surface p-2 text-center">
            <p className="text-lg font-bold leading-none text-brand-600">
              {allocation.unitsCommitted}
            </p>
            <p className="mt-1 text-[10px] font-medium uppercase leading-tight tracking-wide text-muted">
              {dict.coord.request.unitsCommitted}
            </p>
            <p className="mt-0.5 text-[11px] leading-tight text-ink-soft">
              {format(dict.coord.request.coverageValue, {
                committed: allocation.unitsCommitted,
                required: allocation.unitsRequired,
              })}
            </p>
          </div>
          <div className="rounded-xl border border-line bg-surface p-2 text-center">
            <p className="text-lg font-bold leading-none">{allocation.unitsConfirmed}</p>
            <p className="mt-1 text-[10px] font-medium uppercase leading-tight tracking-wide text-muted">
              {dict.coord.request.unitsConfirmed}
            </p>
            <p className="mt-0.5 text-[11px] leading-tight text-ink-soft">
              {format(dict.coord.request.confirmValue, {
                confirmed: allocation.unitsConfirmed,
                required: allocation.unitsRequired,
              })}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          <div>
            <div
              className="progress-track"
              role="progressbar"
              aria-label={dict.coord.request.unitsCommitted}
              aria-valuemin={0}
              aria-valuemax={allocation.unitsRequired}
              aria-valuenow={allocation.unitsCommitted}
            >
              <div className="progress-fill" style={{ width: `${committedPercent}%` }} />
            </div>
          </div>
          <div>
            <div
              className="progress-track"
              role="progressbar"
              aria-label={dict.coord.request.unitsConfirmed}
              aria-valuemin={0}
              aria-valuemax={allocation.unitsRequired}
              aria-valuenow={allocation.unitsConfirmed}
            >
              <div className="progress-fill" style={{ width: `${confirmedPercent}%` }} />
            </div>
          </div>
        </div>

        <p className="mt-3 text-sm text-ink-soft">
          {allocation.unitsUncommitted > 0
            ? format(
                allocation.unitsUncommitted === 1
                  ? dict.coord.request.needMoreOne
                  : dict.coord.request.needMore,
                { count: allocation.unitsUncommitted },
              )
            : dict.coord.request.fullyCovered}
        </p>
      </section>

      <RequestActions dict={dict} request={request} />
      <DemoBanner>{dict.coord.request.demoNote}</DemoBanner>
      <EmergencyNote>{dict.coord.safety.emergency}</EmergencyNote>
    </div>
  );
}

function ActivityPanel({ dict, request }: { dict: Dictionary; request: CoordinationRequest }) {
  const events = groupTimeline(request.timeline);
  return (
    <section className="card p-4" aria-labelledby="activity-title">
      <h3 id="activity-title" className="text-base font-semibold">
        {dict.coord.track.activityTab}
      </h3>
      <ol className="mt-3 space-y-3">
        {[...events].reverse().map((event, index) => (
          <li key={`${event.at}-${event.kind}-${index}`} className="flex gap-3 text-sm">
            <time
              dateTime={event.at}
              className="w-32 shrink-0 text-xs text-muted"
            >
              {new Date(event.at).toLocaleString()}
            </time>
            <span className="leading-relaxed text-ink-soft">
              {timelineLabel(event, dict)}
            </span>
          </li>
        ))}
        {events.length === 0 ? (
          <li className="text-sm text-muted">{dict.coord.waves.noneYet}</li>
        ) : null}
      </ol>
    </section>
  );
}

/** Mobile-first tracker: overview, map/list, donors, activity. */
export function TrackDashboard({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const { request } = useCoordination();
  const [tab, setTab] = useState<TabKey>("overview");

  if (!request) {
    return (
      <div className="mt-6">
        <EmptyState title={dict.coord.request.noRequestTitle}>
          <p>{dict.coord.request.noRequestBody}</p>
          <Link className="button-primary mt-3" href={`/${locale}/request/new`}>
            {dict.coord.request.startCta}
          </Link>
        </EmptyState>
      </div>
    );
  }

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: "overview", label: dict.coord.track.overview },
    { key: "map", label: dict.coord.track.mapTab },
    { key: "donors", label: dict.coord.track.donorsTab },
    { key: "contact", label: dict.coord.track.contactTab },
    { key: "activity", label: dict.coord.track.activityTab },
  ];

  return (
    <div className="mt-6 grid gap-4">
      <div
        className="sticky top-16 z-30 -mx-1 flex gap-1 overflow-x-auto rounded-xl border border-line bg-surface/95 p-1 backdrop-blur"
        role="tablist"
        aria-label={dict.coord.track.title}
      >
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            id={`tab-${item.key}`}
            aria-selected={tab === item.key}
            aria-controls={`panel-${item.key}`}
            onClick={() => setTab(item.key)}
            className={`min-h-11 flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold ${
              tab === item.key
                ? "bg-brand-600 text-white"
                : "text-muted hover:bg-surface-muted hover:text-ink"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} tabIndex={0}>
        {tab === "overview" ? (
          <div className="grid gap-4 md:grid-cols-2 md:items-start">
            <RequestOverview dict={dict} request={request} locale={locale} />
            <TripMap dict={dict} locale={locale} request={request} />
          </div>
        ) : null}
        {tab === "map" ? (
          <CoordinationMap
            dict={dict}
            locale={locale}
            request={request}
            candidates={nearbyCandidates(request)}
          />
        ) : null}
        {tab === "donors" ? (
          <div className="grid gap-4 md:grid-cols-2 md:items-start xl:grid-cols-3">
            <WavePanel dict={dict} />
            <ParticipantsPanel dict={dict} />
            <CandidateList dict={dict} request={request} />
          </div>
        ) : null}
        {tab === "contact" ? <ContactPanel locale={locale} dict={dict} /> : null}
        {tab === "activity" ? <ActivityPanel dict={dict} request={request} /> : null}
      </div>
    </div>
  );
}
