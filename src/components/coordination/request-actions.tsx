"use client";

import { useState } from "react";
import { format } from "@/lib/i18n";
import type { Dictionary } from "@/messages/en";
import { updateRequest, useCoordination } from "@/lib/coordination/store";
import {
  cancelRequest,
  computeAllocation,
  expireRequest,
  increaseRequirement,
} from "@/lib/coordination/request-machine";
import {
  acceptsNewCommitments,
  isTerminal,
  type CoordinationRequest,
} from "@/lib/coordination/types";
import { Callout } from "@/components/ui/ui";

type Outcome =
  | { ok: true; request: CoordinationRequest }
  | { ok: false; code: string; request: CoordinationRequest };

/**
 * Requester-side lifecycle controls: increase the requirement, cancel, or close
 * once — and only once — the facility has confirmed every unit. Fulfilment is
 * never derived from donor clicks alone.
 */
export function RequestActions({
  dict,
  request,
}: {
  dict: Dictionary;
  request: CoordinationRequest;
}) {
  const { role } = useCoordination();
  const [mode, setMode] = useState<"none" | "cancel" | "increase">("none");
  const [units, setUnits] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const allocation = computeAllocation(request);
  const terminal = isTerminal(request.state);
  const fulfilled = request.state === "fulfilled";

  const apply = (outcome: Outcome, success: string) => {
    if (!outcome.ok) {
      setError(dict.coord.coordination.transitionInvalid);
      setNotice(null);
      return;
    }
    setError(null);
    setNotice(success);
    setMode("none");
    updateRequest(() => outcome.request);
  };

  if (role !== "requester") return null;

  return (
    <section className="card p-4" aria-labelledby="request-actions-title">
      <h3 id="request-actions-title" className="text-base font-semibold">
        {dict.coord.track.actions}
      </h3>

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

      {fulfilled ? (
        <div className="mt-3">
          <Callout tone="success" role="status">
            {dict.coord.coordination.closed}
          </Callout>
        </div>
      ) : null}

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {!terminal && acceptsNewCommitments(request.state) ? (
          <button
            type="button"
            className="button-secondary"
            aria-expanded={mode === "increase"}
            onClick={() => {
              setMode(mode === "increase" ? "none" : "increase");
              setError(null);
              setUnits("");
            }}
          >
            {dict.coord.coordination.increase}
          </button>
        ) : null}

        {!terminal ? (
          <button
            type="button"
            className="button-secondary"
            aria-expanded={mode === "cancel"}
            onClick={() => setMode(mode === "cancel" ? "none" : "cancel")}
          >
            {dict.coord.coordination.cancel}
          </button>
        ) : null}

        {!terminal ? (
          <button
            type="button"
            className="button-secondary"
            onClick={() => apply(expireRequest(request, new Date()), dict.coord.coordination.expired)}
          >
            {dict.coord.coordination.expire}
          </button>
        ) : null}
      </div>

      {/* Closing happens through facility confirmation — never on donor clicks. */}
      {fulfilled ? null : (
        <div className="mt-4 rounded-xl border border-line bg-surface-muted p-3">
          <p className="text-sm font-semibold">{dict.coord.coordination.close}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            {dict.coord.coordination.closeBody}
          </p>
          <button
            type="button"
            className="button-primary mt-3 w-full"
            disabled={!allocation.fullyConfirmed}
            onClick={() =>
              apply(
                {
                  ok: true,
                  request: {
                    ...request,
                    state: "fulfilled",
                    fulfilledAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  },
                },
                dict.coord.coordination.closed,
              )
            }
          >
            {dict.coord.coordination.closeConfirm}
          </button>
          <p className="mt-2 text-xs text-muted">
            {format(dict.coord.request.confirmValue, {
              confirmed: allocation.unitsConfirmed,
              required: allocation.unitsRequired,
            })}
          </p>
        </div>
      )}

      {mode === "increase" ? (
        <div className="mt-3 rounded-xl border border-line bg-surface p-3">
          <p className="text-sm font-semibold">{dict.coord.coordination.increaseTitle}</p>
          <p className="mt-1 text-xs text-muted">{dict.coord.coordination.increaseBody}</p>
          <label className="label mt-2" htmlFor="increase-units">
            {dict.coord.coordination.increaseUnits}
          </label>
          <input
            id="increase-units"
            type="number"
            min={request.unitsRequired + 1}
            max={10}
            className="input-base"
            value={units}
            onChange={(event) => setUnits(event.target.value)}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className="button-primary !min-h-0 !px-3 !py-2 text-xs"
              onClick={() => {
                const total = Math.round(Number(units) || 0);
                apply(
                  increaseRequirement(request, total, new Date()),
                  format(dict.coord.coordination.increased, { count: total }),
                );
              }}
            >
              {dict.coord.coordination.increaseSubmit}
            </button>
            <button
              type="button"
              className="button-secondary !min-h-0 !px-3 !py-2 text-xs"
              onClick={() => setMode("none")}
            >
              {dict.common.cancel}
            </button>
          </div>
        </div>
      ) : null}

      {mode === "cancel" ? (
        <div className="mt-3 rounded-xl border border-danger-700/25 bg-danger-50 p-3">
          <p className="text-sm font-semibold text-danger-700">
            {dict.coord.coordination.cancelTitle}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-danger-700">
            {dict.coord.coordination.cancelBody}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className="button-primary !min-h-0 !px-3 !py-2 text-xs"
              onClick={() =>
                apply(cancelRequest(request, new Date()), dict.coord.coordination.cancelled)
              }
            >
              {dict.coord.coordination.cancelConfirm}
            </button>
            <button
              type="button"
              className="button-secondary !min-h-0 !px-3 !py-2 text-xs"
              onClick={() => setMode("none")}
            >
              {dict.common.back}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
