"use client";

import { useState } from "react";
import { format } from "@/lib/i18n";
import type { Dictionary } from "@/messages/en";
import { MOCK_CANDIDATES } from "@/lib/coordination/candidates";
import {
  currentWaveProgress,
  eligibleOnly,
  inviteBatchSize,
  lastWaveIndex,
  rankCandidates,
  recordInvitation,
  simulateWaveResponses,
  startWave,
  waveForIndex,
} from "@/lib/coordination/waves";
import { updateRequest, useCoordination } from "@/lib/coordination/store";
import {
  acceptsNewCommitments,
  type CoordinationRequest,
  type MockCandidate,
  type Participation,
} from "@/lib/coordination/types";
import { availabilityLabel } from "@/lib/labels";
import { Badge, Callout } from "@/components/ui/ui";
import {
  candidateAvailabilityLabel,
  eligibilityLabel,
  exclusionLabel,
} from "./status";

function newParticipation(
  candidate: MockCandidate,
  request: CoordinationRequest,
  wave: number,
  at: string,
): Participation {
  return {
    id: `part-${candidate.id}`,
    requestId: request.reference,
    donorId: candidate.id,
    donorName: candidate.name,
    donorBloodGroup: candidate.bloodGroup,
    distanceKm: candidate.distanceKm,
    committedUnits: 0,
    confirmedUnits: 0,
    state: "invited",
    invitedAt: at,
    respondedAt: null,
    arrivedAt: null,
    screenedAt: null,
    donatedAt: null,
    confirmedAt: null,
    updatedAt: at,
    withdrawalReason: null,
    sharingLiveLocation: false,
    liveLocationUpdatedAt: null,
    wave,
  };
}

/**
 * Wave status plus the two honest controls a coordinator has in the
 * prototype: send the next batch, and simulate how that batch responds.
 */
export function WavePanel({ dict }: { dict: Dictionary }) {
  const { request } = useCoordination();
  const [notice, setNotice] = useState<string | null>(null);

  if (!request) return null;

  const now = new Date();
  const progress = currentWaveProgress(request, now);
  const nextIndex = progress.wave
    ? progress.wave.index + 1
    : Math.max(1, request.activeWave + 1);
  const config =
    progress.config ??
    waveForIndex(request.waves, Math.max(1, request.activeWave)) ??
    request.waves[0] ??
    null;
  const canStart =
    acceptsNewCommitments(request.state) && nextIndex <= lastWaveIndex(request.waves);
  const batchExhausted = progress.wave
    ? progress.wave.invited > 0 && progress.wave.responses >= progress.wave.invited
    : false;
  const canAdvance = canStart && (!progress.open || batchExhausted || progress.msRemaining <= 0);
  const allExhausted = !canStart && !progress.open;
  const minutesLeft = Math.ceil(progress.msRemaining / 60_000);

  const startNext = () => {
    const result = startWave(request, nextIndex, new Date());
    if (!result.ok) {
      setNotice(dict.coord.coordination.transitionInvalid);
      return;
    }
    const at = new Date().toISOString();
    const waveConfig = waveForIndex(result.request.waves, nextIndex);
    if (!waveConfig) return;
    const involved = new Set(result.request.participants.map((item) => item.donorId));
    const ranked = rankCandidates(MOCK_CANDIDATES, result.request, {
      radiusKm: waveConfig.radiusKm,
      involved,
      now,
    });
    const batch = eligibleOnly(ranked).slice(0, inviteBatchSize(result.request));
    let next = result.request;
    for (const candidate of batch) {
      next = {
        ...next,
        participants: [...next.participants, newParticipation(candidate, next, nextIndex, at)],
      };
      next = recordInvitation(next, nextIndex, now);
    }
    updateRequest(() => next);
    setNotice(format(dict.coord.waves.invitedCount, { count: batch.length, index: nextIndex }));
  };

  const simulate = () => {
    updateRequest((current) => simulateWaveResponses(current, new Date()));
    setNotice(dict.coord.waves.simulatedNotice);
  };

  return (
    <section className="card p-4" aria-labelledby="wave-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="wave-title" className="text-base font-semibold">
            {dict.coord.waves.title}
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-muted">{dict.coord.waves.subtitle}</p>
        </div>
        {progress.wave ? (
          <Badge tone={progress.open ? "amber" : "neutral"}>
            {format(dict.coord.waves.waveLabel, { index: progress.wave.index })}
          </Badge>
        ) : null}
      </div>

      {config ? (
        <ul className="mt-3 flex flex-wrap gap-2 text-xs text-ink-soft">
          <li className="chip">
            {format(dict.coord.waves.radius, { km: config.radiusKm })}
          </li>
          <li className="chip">
            {format(dict.coord.waves.batch, { count: config.batchSize })}
          </li>
          <li className="chip">
            {format(dict.coord.waves.window, { minutes: config.responseWindowMinutes })}
          </li>
        </ul>
      ) : null}

      {progress.wave ? (
        <div className="mt-3">
          <p className="text-sm text-ink-soft">
            {format(dict.coord.waves.responses, {
              responded: progress.wave.responses,
              invited: progress.wave.invited,
            })}
          </p>
          <div
            className="progress-track mt-2"
            role="progressbar"
            aria-label={dict.coord.waves.progressLabel}
            aria-valuemin={0}
            aria-valuemax={Math.max(progress.wave.invited, 1)}
            aria-valuenow={progress.wave.responses}
          >
            <div
              className="progress-fill"
              style={{
                width: `${
                  progress.wave.invited > 0
                    ? Math.min(100, (progress.wave.responses / progress.wave.invited) * 100)
                    : 0
                }%`,
              }}
            />
          </div>
          <p className="mt-2 text-xs text-muted">
            {progress.open
              ? `${minutesLeft} ${dict.common.minutes}`
              : format(dict.coord.waves.closed, { index: progress.wave.index })}
          </p>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">{dict.coord.waves.noneYet}</p>
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {progress.open ? (
          <button
            type="button"
            className="button-secondary"
            onClick={simulate}
            disabled={progress.wave ? progress.wave.responses >= progress.wave.invited : true}
          >
            {dict.coord.waves.simulate}
          </button>
        ) : null}

        {canStart && canAdvance ? (
          <button
            type="button"
            className="button-primary"
            onClick={startNext}
          >
            {progress.open ? dict.coord.waves.advance : dict.coord.waves.start}
          </button>
        ) : null}
      </div>

      {progress.open && !canAdvance ? (
        <p className="mt-3 text-xs text-muted">{dict.coord.waves.autoNote}</p>
      ) : null}
      {!canStart && progress.wave?.index === lastWaveIndex(request.waves) ? (
        <p className="mt-3 text-xs text-muted">{dict.coord.waves.complete}</p>
      ) : null}
      {allExhausted ? <p className="mt-3 text-xs text-muted">{dict.coord.waves.complete}</p> : null}

      {notice ? (
        <div className="mt-3">
          <Callout tone="info" role="status">
            {notice}
          </Callout>
        </div>
      ) : null}
    </section>
  );
}

type Filter = "all" | "eligible" | "excluded";

/**
 * Ranked candidate list. A rank is a suggestion about whom to ask — it is
 * explicitly not a medical clearance, and the screen says so.
 */
export function CandidateList({
  dict,
  request,
}: {
  dict: Dictionary;
  request: CoordinationRequest;
}) {
  const [filter, setFilter] = useState<Filter>("all");

  const config =
    waveForIndex(request.waves, Math.max(1, request.activeWave)) ?? request.waves[0] ?? null;
  const involved = new Set(request.participants.map((item) => item.donorId));
  const ranked = rankCandidates(MOCK_CANDIDATES, request, {
    radiusKm: config?.radiusKm ?? 30,
    involved,
    now: new Date(),
  });

  const eligibleCount = ranked.filter((row) => row.excluded === null).length;
  const excludedCount = ranked.length - eligibleCount;
  const rows = ranked.filter((row) =>
    filter === "all"
      ? true
      : filter === "eligible"
        ? row.excluded === null
        : row.excluded !== null,
  );

  const filters: Array<{ key: Filter; label: string }> = [
    { key: "all", label: dict.coord.candidates.filterAll },
    { key: "eligible", label: dict.coord.candidates.filterEligible },
    { key: "excluded", label: dict.coord.candidates.filterExcluded },
  ];

  return (
    <section className="card p-4" aria-labelledby="candidates-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="candidates-title" className="text-base font-semibold">
            {dict.coord.candidates.title}
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            {dict.coord.candidates.subtitle}
          </p>
        </div>
        <div className="flex gap-2 text-xs text-muted">
          <span>{format(dict.coord.candidates.considered, { count: ranked.length })}</span>
          <span>{format(dict.coord.candidates.excludedCount, { count: excludedCount })}</span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={dict.coord.candidates.title}>
        {filters.map((item) => (
          <button
            key={item.key}
            type="button"
            aria-pressed={filter === item.key}
            onClick={() => setFilter(item.key)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
              filter === item.key
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-line-strong bg-surface text-ink-soft hover:bg-surface-muted"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <ul className="mt-3 grid gap-2">
        {rows.map((row) => {
          const candidate = row.candidate;
          const eligible = row.excluded === null;
          const involvedAlready = involved.has(candidate.id);
          return (
            <li
              key={candidate.id}
              className="rounded-xl border border-line bg-surface p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 truncate text-sm font-semibold">
                    {eligible ? `#${row.rank} ` : ""}
                    {candidate.name}
                    <Badge tone="brand">{candidate.bloodGroup}</Badge>
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {format(dict.coord.candidates.distance, { km: row.distanceKm })}
                    {" · "}
                    {format(dict.coord.candidates.confirmed, {
                      days: candidate.availabilityConfirmedDaysAgo,
                    })}
                  </p>
                </div>
                <Badge tone={eligible ? "teal" : "neutral"}>
                  {eligible
                    ? dict.coord.candidates.eligible
                    : involvedAlready
                      ? dict.coord.request.participation.invited
                      : dict.coord.candidates.excluded}
                </Badge>
              </div>

              <ul className="mt-2 flex flex-wrap gap-2 text-xs text-ink-soft">
                <li className="chip">
                  {candidate.availability === "available"
                    ? availabilityLabel("available", dict)
                    : candidate.availability === "unavailable"
                      ? availabilityLabel("unavailable", dict)
                      : candidate.availability === "paused"
                        ? availabilityLabel("paused", dict)
                        : candidateAvailabilityLabel(candidate.availability, dict)}
                </li>
                <li className="chip">{eligibilityLabel(candidate.eligibility, dict)}</li>
                <li className="chip">
                  {candidate.verification === "verified"
                    ? dict.common.verified
                    : candidate.verification === "pending"
                      ? dict.common.pending
                      : dict.common.unverified}
                </li>
              </ul>

              {row.excluded ? (
                <p className="mt-2 text-xs text-muted">
                  {exclusionLabel(row.excluded, dict)}
                </p>
              ) : null}
            </li>
          );
        })}
        {rows.length === 0 ? (
          <li className="text-sm text-muted">{dict.coord.candidates.empty}</li>
        ) : null}
      </ul>

      <p className="mt-3 text-xs leading-relaxed text-muted">
        {dict.coord.candidates.note}
      </p>
    </section>
  );
}
