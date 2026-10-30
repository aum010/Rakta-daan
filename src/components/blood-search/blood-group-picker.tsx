"use client";

import { BLOOD_GROUPS, bloodGroupLabel, bloodGroupShort, type BloodGroup } from "@/lib/blood";
import type { Locale } from "@/lib/i18n";

export type BloodGroupChoice = BloodGroup | "not_sure" | "";

export function BloodGroupPicker({
  value,
  onChange,
  locale,
  legend,
  notSureLabel,
  name = "bloodGroup",
  includeNotSure = true,
  error,
  hint,
  compact = false,
}: {
  value: BloodGroupChoice;
  onChange: (value: BloodGroupChoice) => void;
  locale: Locale;
  legend: string;
  notSureLabel: string;
  name?: string;
  includeNotSure?: boolean;
  error?: string;
  hint?: string;
  compact?: boolean;
}) {
  const hintId = hint ? `${name}-hint` : undefined;
  const errorId = error ? `${name}-error` : undefined;

  return (
    <fieldset aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}>
      <legend className="label">{legend}</legend>
      {hint ? (
        <p id={hintId} className="hint mt-0.5">
          {hint}
        </p>
      ) : null}
      <div
        className={`mt-2 grid gap-1.5 ${compact ? "grid-cols-4 sm:grid-cols-5" : "grid-cols-4 sm:grid-cols-5"}`}
      >
        {BLOOD_GROUPS.map((group) => (
          <label key={group} className="blood-group-option">
            <input
              type="radio"
              name={name}
              value={group}
              checked={value === group}
              onChange={() => onChange(group)}
              className="sr-only"
            />
            <span aria-label={bloodGroupLabel(group, locale)}>{bloodGroupShort(group)}</span>
          </label>
        ))}
        {includeNotSure ? (
          <label className="blood-group-option col-span-2 text-xs font-semibold sm:col-span-1">
            <input
              type="radio"
              name={name}
              value="not_sure"
              checked={value === "not_sure"}
              onChange={() => onChange("not_sure")}
              className="sr-only"
            />
            <span>{notSureLabel}</span>
          </label>
        ) : null}
      </div>
      {error ? (
        <p id={errorId} className="field-error mt-1.5" role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
