"use client";

import { useState } from "react";
import { format } from "@/lib/i18n";
import type { Dictionary } from "@/messages/en";
import {
  SCENARIO_IDS,
  buildScenario,
  type ScenarioId,
} from "@/lib/coordination/scenarios";
import { resetCoordination, setCoordination, useCoordination } from "@/lib/coordination/store";
import { Callout } from "@/components/ui/ui";

/**
 * Loads one of the three seeded demonstration scenarios, or resets all demo
 * state. Everything stays in this browser; nothing is sent anywhere.
 */
export function ScenarioSwitcher({ dict }: { dict: Dictionary }) {
  const { scenario } = useCoordination();
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const isScenario = (value: string): value is ScenarioId =>
    (SCENARIO_IDS as readonly string[]).includes(value);

  const body = (id: ScenarioId) =>
    id === "emergency-three-units"
      ? dict.coord.scenarios.emergencyBody
      : id === "unknown-eligibility"
        ? dict.coord.scenarios.unknownEligibilityBody
        : dict.coord.scenarios.locationDeniedBody;

  const title = (id: ScenarioId) =>
    id === "emergency-three-units"
      ? dict.coord.scenarios.emergency
      : id === "unknown-eligibility"
        ? dict.coord.scenarios.unknownEligibility
        : dict.coord.scenarios.locationDenied;

  const currentLabel =
    scenario === "none" || !isScenario(scenario)
      ? dict.coord.scenarios.none
      : title(scenario);

  const load = (id: ScenarioId) => {
    setCoordination(buildScenario(id));
    setNotice(format(dict.coord.scenarios.loaded, { name: title(id) }));
    setConfirmReset(false);
  };

  const reset = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      setNotice(null);
      return;
    }
    resetCoordination();
    setNotice(dict.coord.scenarios.resetDone);
    setConfirmReset(false);
  };

  return (
    <div className="mt-6 grid gap-4">
      {notice ? (
        <Callout tone="success" role="status">
          {notice}
        </Callout>
      ) : null}

      <p className="text-sm text-muted">
        {format(dict.coord.scenarios.current, { name: currentLabel })}
      </p>

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {SCENARIO_IDS.map((id) => {
          const active = scenario === id;
          return (
            <li key={id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-base font-semibold">{title(id)}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{body(id)}</p>
                </div>
              </div>
              <button
                type="button"
                className="button-secondary mt-3 w-full"
                onClick={() => load(id)}
                disabled={active}
              >
                {active
                  ? format(dict.coord.scenarios.loaded, { name: title(id) })
                  : dict.coord.scenarios.choose}
              </button>
            </li>
          );
        })}
      </ul>

      <section className="card p-4">
        <h3 className="text-base font-semibold">{dict.coord.scenarios.reset}</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          {confirmReset ? dict.coord.scenarios.resetBody : dict.coord.home.demoNote}
        </p>
        <button
          type="button"
          className="button-secondary mt-3 w-full"
          onClick={reset}
          aria-expanded={confirmReset}
        >
          {confirmReset ? dict.coord.scenarios.resetConfirm : dict.coord.scenarios.reset}
        </button>
      </section>

      <p className="text-xs leading-relaxed text-muted">{dict.coord.safety.noDelivery}</p>
    </div>
  );
}
