"use client";

import { useState } from "react";
import { format } from "@/lib/i18n";
import type { Dictionary } from "@/messages/en";
import { updateRequest, useCoordination } from "@/lib/coordination/store";
import {
  acceptInvitation,
  declineInvitation,
  markArrived,
  markDonated,
  recordFacilityConfirmation,
  withdrawParticipation,
} from "@/lib/coordination/request-machine";
import { isCommitting, type Participation } from "@/lib/coordination/types";
import { bloodGroupShort } from "@/lib/blood";
import { Badge, Callout } from "@/components/ui/ui";
import { ParticipationBadge, distanceLabel } from "./status";

/**
 * Multi-donor coordination: who committed, who arrived, who withdrew, and what
 * still has to be confirmed by the facility. Every state change recalculates
 * coverage through the domain machine — the UI never adjusts totals itself.
 */
export function ParticipantsPanel({ dict }: { dict: Dictionary }) {
  const { request, role, actingDonorId } = useCoordination();
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [withdrawId, setWithdrawId] = useState<string | null>(null);
  const [withdrawReason, setWithdrawReason] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [confirmUnits, setConfirmUnits] = useState("1");

  if (!request) return null;

  const committing = request.participants.filter((item) => isCommitting(item.state)).length;

  const apply = (
    outcome:
      | { ok: true; request: typeof request }
      | { ok: false; code: string; request: typeof request },
    success: string,
  ) => {
    if (!outcome.ok) {
      setError(dict.coord.coordination.transitionInvalid);
      setNotice(null);
      return;
    }
    setError(null);
    setNotice(success);
    updateRequest(() => outcome.request);
  };

  const isMine = (participant: Participation) =>
    participant.donorId === actingDonorId && role === "donor";

  return (
    <section className="card p-4" aria-labelledby="participants-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="participants-title" className="text-base font-semibold">
            {dict.coord.coordination.title}
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            {dict.coord.coordination.subtitle}
          </p>
        </div>
        <Badge tone="brand">
          {format(
            committing === 1
              ? dict.coord.coordination.participantsOne
              : dict.coord.coordination.participants,
            { count: committing },
          )}
        </Badge>
      </div>

      {notice ? (
        <div className="mt-3">
          <Callout tone="success" role="status">
            {notice}
          </Callout>
        </div>
      ) : null}
      {error ? (
        <div className="mt-3">
          <Callout tone="danger" role="alert">
            {error}
          </Callout>
        </div>
      ) : null}

      <ul className="mt-4 grid gap-3">
        {request.participants.map((participant) => {
          // Withdrawal reopens coverage; it is never offered after the facility
          // has confirmed a donation.
          const canWithdraw =
            participant.state === "accepted" || participant.state === "arrived";
          const canConfirm =
            participant.state === "donated" || participant.state === "arrived";
          const canArrive = participant.state === "accepted";
          const canDonate = participant.state === "arrived";
          const canRespond =
            participant.state === "invited" && isMine(participant);

          return (
            <li key={participant.id} className="rounded-xl border border-line bg-surface p-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-2.5">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700"
                  >
                    {participant.donorName.slice(0, 1)}
                  </span>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold">
                      {participant.donorName}
                      <span className="rounded-full bg-brand-50 px-1.5 py-0.5 text-[11px] font-semibold text-brand-700">
                        {bloodGroupShort(participant.donorBloodGroup)}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {participant.distanceKm !== null
                        ? format(dict.coord.coordination.distance, {
                            km: participant.distanceKm,
                          })
                        : distanceLabel(null, dict)}
                      {" · "}
                      {format(dict.coord.coordination.wave, { index: participant.wave })}
                      {participant.committedUnits > 0
                        ? ` · ${format(
                            participant.committedUnits === 1
                              ? dict.coord.coordination.committedUnitsOne
                              : dict.coord.coordination.committedUnits,
                            { count: participant.committedUnits },
                          )}`
                        : null}
                    </p>
                  </div>
                </div>
                <ParticipationBadge state={participant.state} dict={dict} />
              </div>

              <p className="mt-2 text-xs text-muted">
                {participant.sharingLiveLocation
                  ? dict.coord.coordination.liveLocation
                  : dict.coord.coordination.liveLocationOff}
              </p>

              {canRespond || canArrive || canDonate || canConfirm || canWithdraw ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {canRespond ? (
                    <>
                      <button
                        type="button"
                        className="button-primary !min-h-0 !px-3 !py-2 text-xs"
                        onClick={() =>
                          apply(
                            acceptInvitation(request, participant.id, new Date()),
                            dict.coord.donor.accepted,
                          )
                        }
                      >
                        {dict.coord.coordination.accept}
                      </button>
                      <button
                        type="button"
                        className="button-secondary !min-h-0 !px-3 !py-2 text-xs"
                        onClick={() =>
                          apply(
                            declineInvitation(request, participant.id, new Date()),
                            dict.coord.donor.declined,
                          )
                        }
                      >
                        {dict.coord.coordination.decline}
                      </button>
                    </>
                  ) : null}

                  {canArrive ? (
                    <button
                      type="button"
                      className="button-secondary !min-h-0 !px-3 !py-2 text-xs"
                      onClick={() =>
                        apply(
                          markArrived(request, participant.id, new Date()),
                          dict.coord.coordination.arrivedDone,
                        )
                      }
                    >
                      {dict.coord.coordination.arrive}
                    </button>
                  ) : null}

                  {canDonate ? (
                    <button
                      type="button"
                      className="button-secondary !min-h-0 !px-3 !py-2 text-xs"
                      onClick={() =>
                        apply(
                          markDonated(request, participant.id, new Date()),
                          dict.coord.coordination.donatedDone,
                        )
                      }
                    >
                      {dict.coord.coordination.donate}
                    </button>
                  ) : null}

                  {canConfirm ? (
                    <button
                      type="button"
                      className="button-primary !min-h-0 !px-3 !py-2 text-xs"
                      aria-expanded={confirmId === participant.id}
                      onClick={() => {
                        setConfirmId(confirmId === participant.id ? null : participant.id);
                        setConfirmUnits(String(Math.max(1, participant.committedUnits)));
                      }}
                    >
                      {dict.coord.coordination.confirmOutcome}
                    </button>
                  ) : null}

                  {canWithdraw ? (
                    <button
                      type="button"
                      className="button-ghost !min-h-0 !px-3 !py-2 text-xs text-danger-700"
                      aria-expanded={withdrawId === participant.id}
                      onClick={() => {
                        setWithdrawId(withdrawId === participant.id ? null : participant.id);
                        setWithdrawReason("");
                      }}
                    >
                      {dict.coord.coordination.withdraw}
                    </button>
                  ) : null}
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
                  <label className="label mt-2" htmlFor={`withdraw-${participant.id}`}>
                    {dict.coord.coordination.withdrawReason}
                  </label>
                  <input
                    id={`withdraw-${participant.id}`}
                    type="text"
                    className="input-base"
                    value={withdrawReason}
                    onChange={(event) => setWithdrawReason(event.target.value)}
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="button-primary !min-h-0 !px-3 !py-2 text-xs"
                      onClick={() => {
                        apply(
                          withdrawParticipation(request, participant.id, new Date(), {
                            reason: withdrawReason.trim() || undefined,
                          }),
                          dict.coord.coordination.withdrawn,
                        );
                        setWithdrawId(null);
                      }}
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

              {confirmId === participant.id ? (
                <div className="mt-3 rounded-xl border border-line bg-surface-muted p-3">
                  <p className="text-sm font-semibold">{dict.coord.coordination.confirmTitle}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    {dict.coord.coordination.confirmBody}
                  </p>
                  <label className="label mt-2" htmlFor={`confirm-${participant.id}`}>
                    {dict.coord.coordination.confirmUnits}
                  </label>
                  <input
                    id={`confirm-${participant.id}`}
                    type="number"
                    min={1}
                    max={Math.max(1, participant.committedUnits)}
                    className="input-base"
                    value={confirmUnits}
                    onChange={(event) => setConfirmUnits(event.target.value)}
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="button-primary !min-h-0 !px-3 !py-2 text-xs"
                      onClick={() => {
                        const units = Math.max(1, Math.round(Number(confirmUnits) || 1));
                        if (units > participant.committedUnits) {
                          setError(
                            format(
                              request.unitsRequired === 1
                                ? dict.coord.coordination.confirmOverOne
                                : dict.coord.coordination.confirmOver,
                              { required: request.unitsRequired },
                            ),
                          );
                          return;
                        }
                        apply(
                          recordFacilityConfirmation(
                            request,
                            participant.id,
                            units,
                            new Date(),
                          ),
                          dict.coord.coordination.confirmed,
                        );
                        setConfirmId(null);
                      }}
                    >
                      {dict.coord.coordination.confirmSubmit}
                    </button>
                    <button
                      type="button"
                      className="button-secondary !min-h-0 !px-3 !py-2 text-xs"
                      onClick={() => setConfirmId(null)}
                    >
                      {dict.common.cancel}
                    </button>
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
        {request.participants.length === 0 ? (
          <li className="text-sm text-muted">{dict.coord.coordination.noParticipants}</li>
        ) : null}
      </ul>
    </section>
  );
}
