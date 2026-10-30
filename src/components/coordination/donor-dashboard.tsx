"use client";

import { useState } from "react";
import Link from "next/link";
import { format, type Locale } from "@/lib/i18n";
import type { Dictionary } from "@/messages/en";
import { BLOOD_COMPONENTS, bloodGroupShort, type BloodComponent } from "@/lib/blood";
import { MOCK_CANDIDATES, candidateById } from "@/lib/coordination/candidates";
import {
  updateCoordination,
  updateRequest,
  useCoordination,
} from "@/lib/coordination/store";
import {
  acceptInvitation,
  declineInvitation,
  withdrawParticipation,
} from "@/lib/coordination/request-machine";
import { DEMO_DONATION_POLICY } from "@/lib/coordination/eligibility";
import {
  isCommitting,
  type DonationRecord,
  type Participation,
} from "@/lib/coordination/types";
import { Badge, Callout, DemoBanner } from "@/components/ui/ui";
import { CheckIcon, CloseIcon } from "@/components/ui/icons";
import { ParticipationBadge, eligibilityLabel } from "./status";
import { ContactPanel } from "./contact";

function historyStatus(record: DonationRecord, dict: Dictionary): string {
  switch (record.verification) {
    case "verified":
      return dict.coord.donor.donStatusVerified;
    case "submitted":
      return dict.coord.donor.donStatusSubmitted;
    case "rejected":
      return dict.coord.donor.donStatusRejected;
    case "self_reported":
      return dict.coord.donor.donStatusSelfReported;
  }
}

/**
 * Donor-facing dashboard: availability, invitations, eligibility display and
 * donation history. Everything is local demonstration state; eligibility is
 * shown as a display status only and never as medical clearance.
 */
export function DonorDashboard({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const state = useCoordination();
  const {
    request,
    donationHistory,
    actingDonorId,
    donorAvailability,
    donorAvailabilityConfirmedAt,
    locationConsent,
  } = state;

  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ date: "", facility: "", component: "whole_blood" });
  const [withdrawId, setWithdrawId] = useState<string | null>(null);
  const [contactId, setContactId] = useState<string | null>(null);

  const me = candidateById(actingDonorId ?? MOCK_CANDIDATES[0]?.id ?? "") ?? null;
  const mine: Participation[] = request
    ? request.participants.filter((item) => item.donorId === me?.id)
    : [];
  const latestDonation = [...donationHistory].sort((a, b) => b.date.localeCompare(a.date))[0];
  const nextEligibleDate = latestDonation
    ? new Date(
        new Date(`${latestDonation.date}T00:00:00Z`).getTime() +
          DEMO_DONATION_POLICY.wholeBloodIntervalDays * 86_400_000,
      )
    : null;
  const inCooldown = nextEligibleDate ? nextEligibleDate.getTime() > new Date().getTime() : false;

  const setAvailability = (value: "available" | "unavailable" | "paused") => {
    updateCoordination({
      donorAvailability: value,
      donorAvailabilityConfirmedAt: value === "available" ? new Date().toISOString() : null,
    });
    setNotice(
      value === "available"
        ? dict.donor.confirmed
        : format(dict.coord.donor.availabilitySaved, {
            state:
              value === "paused" ? dict.donor.paused : dict.donor.unavailable,
          }),
    );
  };

  const respond = (participant: Participation, action: "accept" | "decline") => {
    if (!request) return;
    const outcome =
      action === "accept"
        ? acceptInvitation(request, participant.id, new Date())
        : declineInvitation(request, participant.id, new Date());
    if (!outcome.ok) {
      setError(dict.coord.coordination.transitionInvalid);
      return;
    }
    setError(null);
    updateRequest(() => outcome.request);
    updateCoordination({ actingDonorId: participant.donorId, role: "donor" });
    setNotice(action === "accept" ? dict.coord.donor.accepted : dict.coord.donor.declined);
  };

  const withdraw = (participant: Participation) => {
    if (!request) return;
    const outcome = withdrawParticipation(request, participant.id, new Date());
    if (!outcome.ok) {
      setError(dict.coord.coordination.transitionInvalid);
      return;
    }
    updateRequest(() => outcome.request);
    setWithdrawId(null);
    setNotice(dict.coord.donor.withdrawn);
  };

  const toggleLiveLocation = (participant: Participation, value: boolean) => {
    if (!request) return;
    updateRequest((current) => ({
      ...current,
      participants: current.participants.map((item) =>
        item.id === participant.id
          ? {
              ...item,
              sharingLiveLocation: value,
              liveLocationUpdatedAt: value ? new Date().toISOString() : null,
            }
          : item,
      ),
    }));
  };

  const saveDonation = () => {
    if (!form.date) {
      setError(dict.coord.donor.historyDateRequired);
      return;
    }
    const record: DonationRecord = {
      id: `don-${Date.now()}`,
      date: form.date,
      component: form.component as BloodComponent,
      facility: form.facility.trim() || dict.common.demoData,
      verification: "self_reported",
      source: dict.common.selfReported,
      updatedAt: new Date().toISOString(),
      verificationRef: null,
    };
    updateCoordination((current) => ({
      donationHistory: [record, ...current.donationHistory],
    }));
    setError(null);
    setNotice(dict.coord.donor.historySaved);
    setAdding(false);
    setForm({ date: "", facility: "", component: "whole_blood" });
  };

  const availabilityStamp = donorAvailabilityConfirmedAt
    ? format(dict.coord.donor.availStampConfirmed, {
        date: new Date(donorAvailabilityConfirmedAt).toLocaleDateString(),
      })
    : format(dict.coord.donor.availStampStale, { date: "—" });

  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2 md:items-start xl:grid-cols-3">
      <div className="md:col-span-2 xl:col-span-3">
        <DemoBanner>{dict.coord.home.demoNote}</DemoBanner>
      </div>

      {/* Notices always span the row — a warning tucked into one column of a
          dashboard is a warning nobody reads. Rendered only when there is one,
          so an empty cell never adds a phantom row of spacing. */}
      {notice || error || inCooldown ? (
        <div className="md:col-span-2 xl:col-span-3">
          {notice ? (
            <Callout tone="success" role="status">
              {notice}
            </Callout>
          ) : null}
          {error ? (
            <Callout tone="danger" role="alert">
              {error}
            </Callout>
          ) : null}
          {inCooldown ? (
            <Callout tone="warning">{dict.donor.cooldownActive}</Callout>
          ) : null}
        </div>
      ) : null}

      {/* Availability */}
      <section className="card p-4" aria-labelledby="availability-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 id="availability-title" className="text-base font-semibold">
              {dict.coord.donor.availabilityTitle}
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              {dict.coord.donor.availabilityBody}
            </p>
          </div>
          <Badge
            tone={
              donorAvailability === "available"
                ? "teal"
                : donorAvailability === "paused"
                  ? "amber"
                  : "neutral"
            }
          >
            {donorAvailability === "available"
              ? dict.donor.available
              : donorAvailability === "paused"
                ? dict.donor.paused
                : dict.donor.unavailable}
          </Badge>
        </div>

        <p className="mt-3 text-xs text-muted">{availabilityStamp}</p>
        {donorAvailabilityConfirmedAt === null ? (
          <p className="mt-1 text-xs text-muted">{dict.coord.donor.availabilityStale}</p>
        ) : null}

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <button
            type="button"
            className="button-primary"
            aria-pressed={donorAvailability === "available"}
            onClick={() => setAvailability("available")}
          >
            {dict.coord.donor.setAvailable}
          </button>
          <button
            type="button"
            className="button-secondary"
            aria-pressed={donorAvailability === "unavailable"}
            onClick={() => setAvailability("unavailable")}
          >
            {dict.coord.donor.setUnavailable}
          </button>
          <button
            type="button"
            className="button-secondary"
            aria-pressed={donorAvailability === "paused"}
            onClick={() => setAvailability("paused")}
          >
            {dict.coord.donor.setPaused}
          </button>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted">{dict.donor.availabilityHint}</p>
      </section>

      {/* Profile + eligibility */}
      {me ? (
        <section className="card p-4" aria-labelledby="donor-profile-title">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 id="donor-profile-title" className="text-base font-semibold">
                {me.name}
              </h3>
              <p className="mt-1 text-sm text-muted">
                {me.bloodGroup} · {me.districtCode}
              </p>
            </div>
            <Badge tone="brand">
              {me.verification === "verified"
                ? dict.common.verified
                : me.verification === "pending"
                  ? dict.common.pending
                  : dict.common.unverified}
            </Badge>
          </div>

          <div className="mt-3">
            <p className="text-xs uppercase tracking-wide text-muted">
              {dict.coord.donor.eligibilityTitle}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge tone={me.eligibility === "eligible" ? "teal" : "amber"}>
                {eligibilityLabel(me.eligibility, dict)}
              </Badge>
              <span className="text-xs text-muted">
                {me.availability === "available"
                  ? dict.donor.available
                  : me.availability === "paused"
                    ? dict.donor.paused
                    : me.availability === "unavailable"
                      ? dict.donor.unavailable
                      : dict.coord.candidates.availUnknown}
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              {dict.coord.donor.eligibilityBody}
            </p>
          </div>

          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted">
                {dict.donor.lastDonation}
              </dt>
              <dd>
                {latestDonation
                  ? format(dict.coord.donor.lastDonation, { date: latestDonation.date })
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted">
                {dict.coord.donor.eligibilityTitle}
              </dt>
              <dd>
                {nextEligibleDate
                  ? format(dict.coord.donor.nextEligible, {
                      date: nextEligibleDate.toISOString().slice(0, 10),
                    })
                  : "—"}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs leading-relaxed text-muted">{dict.donor.distanceNote}</p>
        </section>
      ) : null}

      {/* Invitations */}
      <section className="card p-4" aria-labelledby="invitations-title">
        <h3 id="invitations-title" className="text-base font-semibold">
          {dict.coord.donor.invitationsTitle}
        </h3>
        <ul className="mt-3 grid gap-3">
          {mine.map((participant) => {
            const required = request?.unitsRequired ?? 0;
            const hospital = request?.hospital ?? "";
            const invitationUnits = Math.max(1, participant.committedUnits || required);
            return (
              <li key={participant.id} className="rounded-xl border border-line bg-surface p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                    {dict.coord.donor.notifLabel}
                  </p>
                  <ParticipationBadge state={participant.state} dict={dict} />
                </div>

                {/*
                  Simulated messaging-app notification, mirroring the format a
                  donor would receive (message card + one-tap actions). Nothing
                  leaves this browser — the note below says so on every card.
                */}
                <div className="mt-2 rounded-xl border border-line bg-surface-muted p-2.5">
                  <p className="text-sm font-semibold">
                    🩸 {dict.coord.donor.notifTitle}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                    {format(
                      invitationUnits === 1
                        ? dict.coord.donor.invitedToOne
                        : dict.coord.donor.invitedTo,
                      {
                        units: invitationUnits,
                        hospital,
                      },
                    )}
                    {request ? ` · ${bloodGroupShort(request.bloodGroup)}` : ""}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                    {dict.coord.donor.notifAsk}
                  </p>
                  <p className="mt-1.5 text-[11px] text-muted">
                    {request ? new Date(request.neededBy).toLocaleString() : ""}
                  </p>
                </div>

                {participant.state === "invited" ? (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      aria-label={dict.coord.coordination.accept}
                      className="button-primary !min-h-0 !px-3 !py-2 text-xs"
                      onClick={() => respond(participant, "accept")}
                    >
                      <CheckIcon className="h-3.5 w-3.5" aria-hidden="true" />
                      {dict.coord.donor.acceptShort}
                    </button>
                    <button
                      type="button"
                      className="button-secondary !min-h-0 !px-3 !py-2 text-xs"
                      onClick={() => respond(participant, "decline")}
                    >
                      <CloseIcon className="h-3.5 w-3.5" aria-hidden="true" />
                      {dict.coord.coordination.decline}
                    </button>
                  </div>
                ) : null}

                {isCommitting(participant.state) ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link className="button-secondary !min-h-0 !px-3 !py-2 text-xs" href={`/${locale}/app/track`}>
                      {dict.coord.home.trackCta}
                    </Link>
                    <button
                      type="button"
                      className="button-secondary !min-h-0 !px-3 !py-2 text-xs"
                      aria-expanded={contactId === participant.id}
                      onClick={() =>
                        setContactId(contactId === participant.id ? null : participant.id)
                      }
                    >
                      {dict.coord.contact.title}
                    </button>
                    <button
                      type="button"
                      className="button-ghost !min-h-0 !px-3 !py-2 text-xs text-danger-700"
                      aria-expanded={withdrawId === participant.id}
                      onClick={() =>
                        setWithdrawId(withdrawId === participant.id ? null : participant.id)
                      }
                    >
                      {dict.coord.coordination.withdraw}
                    </button>
                  </div>
                ) : null}

                {contactId === participant.id ? (
                  <div className="mt-3">
                    <ContactPanel locale={locale} dict={dict} />
                  </div>
                ) : null}

                {withdrawId === participant.id ? (
                  <div className="mt-3 rounded-xl border border-danger-700/25 bg-danger-50 p-3">
                    <p className="text-sm font-semibold text-danger-700">
                      {dict.coord.coordination.withdrawTitle}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-danger-700">
                      {dict.coord.coordination.withdrawBody}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="button-primary !min-h-0 !px-3 !py-2 text-xs"
                        onClick={() => withdraw(participant)}
                      >
                        {dict.coord.coordination.withdrawConfirm}
                      </button>
                      <button
                        type="button"
                        className="button-secondary !min-h-0 !px-3 !py-2 text-xs"
                        onClick={() => setWithdrawId(null)}
                      >
                        {dict.common.cancel}
                      </button>
                    </div>
                  </div>
                ) : null}

                <p className="mt-2 text-[11px] leading-relaxed text-muted">
                  {dict.coord.donor.notifNote}
                </p>
              </li>
            );
          })}
          {mine.length === 0 ? (
            <li className="text-sm text-muted">{dict.coord.donor.invitationsEmpty}</li>
          ) : null}
        </ul>
      </section>

      {/* Live location — opt-in only, per participation */}
      {mine.some((participant) => isCommitting(participant.state)) ? (
        <section className="card p-4" aria-labelledby="live-location-title">
          <h3 id="live-location-title" className="text-base font-semibold">
            {dict.coord.donor.liveLocationTitle}
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            {dict.coord.donor.liveLocationBody}
          </p>
          {locationConsent.donor_live ? (
            <div className="mt-3 grid gap-2">
              {mine
                .filter((participant) => isCommitting(participant.state))
                .map((participant) => (
                  <label
                    key={participant.id}
                    className="flex items-start gap-3 rounded-xl border border-line bg-surface-muted p-3"
                  >
                    <input
                      type="checkbox"
                      className="mt-1 h-5 w-5 shrink-0 accent-brand-600"
                      checked={participant.sharingLiveLocation}
                      onChange={(event) =>
                        toggleLiveLocation(participant, event.target.checked)
                      }
                    />
                    <span className="text-sm">
                      {participant.sharingLiveLocation
                        ? dict.coord.coordination.liveLocation
                        : dict.coord.coordination.liveLocationOff}
                    </span>
                  </label>
                ))}
            </div>
          ) : (
            <Callout tone="neutral">
              <p>{dict.coord.location.consentBody}</p>
              <Link className="button-secondary mt-2" href={`/${locale}/app/location`}>
                {dict.coord.home.quickLocate}
              </Link>
            </Callout>
          )}
        </section>
      ) : null}

      {/* Donation history */}
      {/* Donation history wants width for its rows: full span on a tablet,
          one of three columns on a desktop. */}
      <section className="card p-4 md:col-span-2 xl:col-span-1" aria-labelledby="history-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 id="history-title" className="text-base font-semibold">
            {dict.coord.donor.historyTitle}
          </h3>
          <button
            type="button"
            className="button-secondary !min-h-0 !px-3 !py-2 text-xs"
            aria-expanded={adding}
            onClick={() => setAdding((value) => !value)}
          >
            {dict.coord.donor.addHistory}
          </button>
        </div>

        {adding ? (
          <div className="mt-3 rounded-xl border border-line bg-surface-muted p-3">
            <p className="text-sm text-muted">{dict.coord.donor.addHistoryBody}</p>
            <div className="mt-2 grid gap-3 sm:grid-cols-3">
              <div className="field">
                <label className="label" htmlFor="donation-date">
                  {dict.coord.donor.historyDate}
                </label>
                <input
                  id="donation-date"
                  type="date"
                  className="input-base"
                  value={form.date}
                  onChange={(event) => setForm({ ...form, date: event.target.value })}
                />
              </div>
              <div className="field">
                <label className="label" htmlFor="donation-facility">
                  {dict.coord.donor.historyFacility}
                </label>
                <input
                  id="donation-facility"
                  type="text"
                  className="input-base"
                  value={form.facility}
                  onChange={(event) => setForm({ ...form, facility: event.target.value })}
                />
              </div>
              <div className="field">
                <label className="label" htmlFor="donation-component">
                  {dict.coord.donor.historyComponent}
                </label>
                <select
                  id="donation-component"
                  className="input-base"
                  value={form.component}
                  onChange={(event) => setForm({ ...form, component: event.target.value })}
                >
                  {BLOOD_COMPONENTS.map((component) => (
                    <option key={component} value={component}>
                      {dict.labels[component]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button type="button" className="button-primary mt-3 w-full" onClick={saveDonation}>
              {dict.coord.donor.historySave}
            </button>
          </div>
        ) : null}

        <ul className="mt-3 grid gap-3">
          {donationHistory.map((record) => (
            <li key={record.id} className="rounded-xl border border-line bg-surface p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{record.facility}</p>
                  <p className="mt-1 text-xs text-muted">
                    {record.date} · {dict.labels[record.component]}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {format(dict.coord.donor.historySource, { source: record.source })}
                  </p>
                </div>
                <Badge
                  tone={
                    record.verification === "verified"
                      ? "teal"
                      : record.verification === "rejected"
                        ? "danger"
                        : "neutral"
                  }
                >
                  {historyStatus(record, dict)}
                </Badge>
              </div>
            </li>
          ))}
          {donationHistory.length === 0 ? (
            <li className="text-sm text-muted">{dict.coord.donor.historyEmpty}</li>
          ) : null}
        </ul>
      </section>

      <p className="text-xs leading-relaxed text-muted md:col-span-2 xl:col-span-3">
        {dict.coord.safety.noDelivery} {dict.donor.availabilityHint}
      </p>
    </div>
  );
}
