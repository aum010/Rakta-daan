/**
 * Default notification-wave plan.
 *
 * Configurable by design: an administrator (in a future backend) should be
 * able to change radii, batch sizes and response windows per policy. The
 * prototype ships one sensible plan and exposes it in the demo controls so the
 * behaviour is inspectable rather than hidden in code.
 *
 * Wave 4 is coordinator-assisted escalation — it does not widen the map, it
 * flags the request for a human.
 */
import type { WaveConfig } from "./types";

export const DEFAULT_WAVE_PLAN: readonly WaveConfig[] = [
  {
    index: 1,
    labelKey: "wave.closest",
    radiusKm: 10,
    batchSize: 4,
    responseWindowMinutes: 15,
  },
  {
    index: 2,
    labelKey: "wave.nearby",
    radiusKm: 30,
    batchSize: 6,
    responseWindowMinutes: 30,
  },
  {
    index: 3,
    labelKey: "wave.expanded",
    radiusKm: 75,
    batchSize: 10,
    responseWindowMinutes: 60,
  },
  {
    index: 4,
    labelKey: "wave.escalation",
    radiusKm: 75,
    batchSize: 10,
    responseWindowMinutes: 120,
  },
];

/**
 * Deterministic response rate per wave index (0–100). Used only to decide how
 * many *simulated* candidates respond when a wave runs, so repeated runs of the
 * same scenario produce the same outcome.
 */
export const WAVE_RESPONSE_RATE: Record<number, number> = {
  1: 50,
  2: 40,
  3: 35,
  4: 60,
};
