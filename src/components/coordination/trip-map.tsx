"use client";

import { useEffect, useMemo, useState } from "react";
import { format, type Locale } from "@/lib/i18n";
import type { Dictionary } from "@/messages/en";
import { haversineKm, districtCentroid, type Point } from "@/lib/geo";
import { DISTRICT_BY_CODE } from "@/data/geography";
import { MOCK_CANDIDATES } from "@/lib/coordination/candidates";
import { isCommitting, type CoordinationRequest } from "@/lib/coordination/types";
import { updateCoordination, useCoordination } from "@/lib/coordination/store";
import { Badge, Callout } from "@/components/ui/ui";

/** Average city speed used only to phrase an ETA. Never presented as a guarantee. */
const ASSUMED_KMH = 25;

function districtPoint(code: string): Point | null {
  return districtCentroid(code);
}

/**
 * Trip tracking: where the donor and the receiver are, for one request.
 *
 * The shape follows what people already expect from a ride-hailing app — two
 * pinned ends, a route between them, distance and ETA — because that is the
 * mental model that makes "is the donor on the way?" answerable in a second.
 *
 * What it will not do is imply a capability the frontend does not have. Two
 * consent purposes gate the live view, positions are district-level, the
 * movement you see is explicitly labelled simulated, and there is a stop
 * control that takes effect immediately. See docs/frontend/location-tracking.md.
 */
export function TripMap({
  dict,
  locale,
  request,
}: {
  dict: Dictionary;
  locale: Locale;
  request: CoordinationRequest;
}) {
  const { locationConsent } = useCoordination();
  const [rawProgress, setProgress] = useState(0);

  /* The donor currently travelling — the most recently committed participant. */
  const traveller = useMemo(
    () =>
      [...request.participants]
        .filter((participant) => isCommitting(participant.state))
        .sort((a, b) => (b.respondedAt ?? "").localeCompare(a.respondedAt ?? ""))[0] ?? null,
    [request.participants],
  );

  const candidate = traveller
    ? MOCK_CANDIDATES.find((item) => item.id === traveller.donorId) ?? null
    : null;

  const receiverPoint: Point | null = useMemo(
    () =>
      request.hospitalLat && request.hospitalLng
        ? { latitude: request.hospitalLat, longitude: request.hospitalLng }
        : districtPoint(request.districtCode),
    [request.hospitalLat, request.hospitalLng, request.districtCode],
  );

  const donorPoint: Point | null = useMemo(() => {
    if (!candidate) return null;
    return districtPoint(candidate.districtCode) ?? (traveller?.distanceKm ? receiverPoint : null);
  }, [candidate, traveller, receiverPoint]);

  const live = locationConsent.donor_live;
  const watched = locationConsent.requester_live;

  /* Simulated travel — only while both sides consent, and always labelled. */
  useEffect(() => {
    if (!live) return;
    const timer = window.setInterval(() => {
      setProgress((value) => (value >= 1 ? 1 : Math.min(1, value + 0.04)));
    }, 900);
    return () => window.clearInterval(timer);
  }, [live]);

  /* Derived, not reset in an effect: consent off means "no movement". */
  const progress = live ? rawProgress : 0;

  const totalKm = useMemo(() => {
    /* District centroids collapse to zero inside one district, so prefer the
       fixture's district-to-district distance and fall back to geometry. */
    if (traveller?.distanceKm != null) return traveller.distanceKm;
    if (!receiverPoint || !donorPoint) return null;
    return Math.round(haversineKm(donorPoint, receiverPoint) * 10) / 10;
  }, [donorPoint, receiverPoint, traveller]);

  const remainingKm =
    totalKm === null ? null : Math.round(totalKm * (1 - progress) * 10) / 10;
  const etaMinutes =
    totalKm === null ? null : Math.max(1, Math.round(((totalKm * (1 - progress)) / ASSUMED_KMH) * 60));

  /* Derived from the domain state, not from the simulated dot. */
  const hasArrived =
    traveller?.state === "arrived" ||
    traveller?.state === "donated" ||
    traveller?.state === "confirmed" ||
    progress >= 1;

  const position = (point: Point | null) => {
    if (!point || !receiverPoint || !donorPoint) return { left: "50%", top: "50%" };
    const minLat = Math.min(donorPoint.latitude, receiverPoint.latitude);
    const maxLat = Math.max(donorPoint.latitude, receiverPoint.latitude);
    const minLng = Math.min(donorPoint.longitude, receiverPoint.longitude);
    const maxLng = Math.max(donorPoint.longitude, receiverPoint.longitude);
    const spanLat = Math.max(maxLat - minLat, 0.02);
    const spanLng = Math.max(maxLng - minLng, 0.02);
    const latPad = spanLat * 0.35;
    const lngPad = spanLng * 0.35;
    const left = ((point.longitude - (minLng - lngPad)) / (spanLng + lngPad * 2)) * 100;
    const top = (((maxLat + latPad) - point.latitude) / (spanLat + latPad * 2)) * 100;
    return { left: `${Math.min(90, Math.max(10, left))}%`, top: `${Math.min(90, Math.max(10, top))}%` };
  };

  const receiverStyle = position(receiverPoint);
  const donorStyle = position(donorPoint);
  const onRouteStyle = {
    left: `${parseFloat(donorStyle.left) + (parseFloat(receiverStyle.left) - parseFloat(donorStyle.left)) * progress}%`,
    top: `${parseFloat(donorStyle.top) + (parseFloat(receiverStyle.top) - parseFloat(donorStyle.top)) * progress}%`,
  };

  const toggle = (purpose: "donor_live" | "requester_live", value: boolean) => {
    updateCoordination((current) => ({
      locationConsent: { ...current.locationConsent, [purpose]: value },
    }));
    if (purpose === "donor_live" && !value) setProgress(0);
  };

  if (!traveller || !receiverPoint) {
    return (
      <section className="card p-4" aria-labelledby="trip-title">
        <h3 id="trip-title" className="text-base font-semibold">
          {dict.coord.trip.title}
        </h3>
        <p className="mt-1 text-sm font-medium text-ink-soft">{dict.coord.trip.noneTitle}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted">{dict.coord.trip.noneBody}</p>
      </section>
    );
  }

  const donorName = candidate?.name ?? traveller.donorName;

  return (
    <section className="card p-4" aria-labelledby="trip-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="trip-title" className="text-base font-semibold">
          {dict.coord.trip.title}
        </h3>
        <Badge tone={live ? "teal" : "neutral"}>
          {live ? dict.coord.trip.liveOn : dict.coord.trip.liveOff}
        </Badge>
      </div>
      <p className="mt-1 text-sm leading-relaxed text-muted">{dict.coord.trip.subtitle}</p>

      {/* Map ------------------------------------------------------------- */}
      <div
        className="relative mt-3 aspect-[4/3] w-full overflow-hidden rounded-xl border border-line bg-surface-muted"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent 0 39px, rgba(220,201,191,0.5) 39px 40px), repeating-linear-gradient(90deg, transparent 0 39px, rgba(220,201,191,0.5) 39px 40px)",
        }}
      >
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <line
            x1={donorStyle.left}
            y1={donorStyle.top}
            x2={receiverStyle.left}
            y2={receiverStyle.top}
            stroke="rgba(15,23,42,0.35)"
            strokeWidth="0.7"
            strokeDasharray="3 2"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* Receiver end */}
        <span
          style={receiverStyle}
          title={dict.coord.trip.receiver}
          className="absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-brand-700 bg-brand-600 text-xs font-bold text-white shadow"
        >
          H
        </span>
        <span className="sr-only">{dict.coord.trip.receiver}: {request.hospital}</span>

        {/* Donor end */}
        <span
          style={donorStyle}
          title={dict.coord.trip.donor}
          className="absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-teal-800 bg-teal-700 text-xs font-bold text-white shadow"
        >
          ✓
        </span>
        <span className="sr-only">{dict.coord.trip.donor}: {donorName}</span>

        {/* Current position while travelling */}
        {live && donorPoint ? (
          <span
            style={onRouteStyle}
            aria-hidden="true"
            className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-amber-500 shadow ring-2 ring-amber-500/40"
          />
        ) : null}
      </div>

      {/* Readout ---------------------------------------------------------- */}
      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl border border-line bg-surface-muted p-2">
          <dt className="text-[11px] uppercase tracking-wide text-muted">
            {dict.coord.trip.distance}
          </dt>
          <dd className="text-sm font-semibold">
            {remainingKm === null ? "—" : `${remainingKm} ${dict.common.km}`}
          </dd>
        </div>
        <div className="rounded-xl border border-line bg-surface-muted p-2">
          <dt className="text-[11px] uppercase tracking-wide text-muted">
            {dict.coord.trip.eta}
          </dt>
          <dd className="text-sm font-semibold">
            {etaMinutes === null ? "—" : `${etaMinutes} ${dict.common.minutes}`}
          </dd>
        </div>
        <div className="rounded-xl border border-line bg-surface-muted p-2">
          <dt className="text-[11px] uppercase tracking-wide text-muted">
            {dict.coord.trip.status}
          </dt>
          <dd className="text-sm font-semibold">
            {hasArrived ? dict.coord.trip.arrived : dict.coord.trip.enRoute}
          </dd>
        </div>
      </dl>

      <p className="mt-3 text-xs leading-relaxed text-muted">
        {format(dict.coord.trip.between, { donor: donorName, receiver: request.hospital })} ·{" "}
        {(() => {
          const district = DISTRICT_BY_CODE.get(request.districtCode);
          if (!district) return request.districtCode;
          return locale === "ne" ? district.nameNe : district.nameEn;
        })()}
      </p>

      {/* Consent + honest labelling -------------------------------------- */}
      <div className="mt-3 space-y-2">
        <label className="flex items-start gap-2 rounded-xl border border-line bg-surface p-3 text-sm">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={live}
            onChange={(event) => toggle("donor_live", event.target.checked)}
          />
          <span>
            <span className="block font-medium">{dict.coord.location.purposeDonorLive}</span>
            <span className="block text-xs text-muted">
              {dict.coord.location.purposeDonorLiveHint}
            </span>
          </span>
        </label>

        <label className="flex items-start gap-2 rounded-xl border border-line bg-surface p-3 text-sm">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={watched}
            onChange={(event) => toggle("requester_live", event.target.checked)}
          />
          <span>
            <span className="block font-medium">{dict.coord.location.purposeRequesterLive}</span>
            <span className="block text-xs text-muted">
              {dict.coord.location.purposeRequesterLiveHint}
            </span>
          </span>
        </label>

        {live ? (
          <button
            type="button"
            className="button-secondary w-full !min-h-0 !py-2 text-sm"
            onClick={() => toggle("donor_live", false)}
          >
            {dict.coord.trip.stopSharing}
          </button>
        ) : null}
      </div>

      <div className="mt-3">
        <Callout tone="warning" title={dict.coord.trip.simulatedTitle}>
          <p>{dict.coord.trip.simulatedBody}</p>
          <p className="mt-1">{dict.coord.map.distanceNote}</p>
        </Callout>
      </div>
    </section>
  );
}
