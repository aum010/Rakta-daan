"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Dictionary } from "@/messages/en";
import type { Locale } from "@/lib/i18n";
import {
  BLOOD_COMPONENTS,
  BLOOD_GROUPS,
  bloodGroupLabel,
  componentLabel,
  type BloodComponent,
  type BloodGroup,
} from "@/lib/blood";
import { apiRequest, describeError } from "@/services/api";
import { Callout } from "../ui/ui";

export function InventoryForm({
  orgSlug,
  locale,
  dict,
  initial,
  readOnly = false,
}: {
  orgSlug: string;
  locale: Locale;
  dict: Dictionary;
  initial: Record<string, number>;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, number>>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function key(group: BloodGroup, component: BloodComponent) {
    return `${group}:${component}`;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const updates = BLOOD_GROUPS.flatMap((group) =>
        BLOOD_COMPONENTS.map((component) => ({
          bloodGroup: group,
          component,
          units: Number(values[key(group, component)] ?? 0),
        })),
      );
      await apiRequest(`/api/v1/orgs/${orgSlug}/inventory`, {
        method: "PUT",
        body: { updates },
      });
      setSaved(true);
      router.refresh();
    } catch (caught) {
      setError(describeError(caught, dict));
    } finally {
      setBusy(false);
    }
  }

  if (readOnly) {
    return (
      <Callout tone="neutral">
        {locale === "ne"
          ? "तपाईंको भूमिकाले मौजुदात परिवर्तन गर्न दिँदैन।"
          : "Your role is view-only, so inventory cannot be changed here."}
      </Callout>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error ? (
        <Callout tone="danger" role="alert">
          {error}
        </Callout>
      ) : null}
      {saved ? (
        <Callout tone="success" role="status">
          {dict.org.saved}
        </Callout>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[28rem] border-collapse text-sm">
          <caption className="sr-only">{dict.org.inventory}</caption>
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="py-2 pr-3 font-semibold">{dict.find.bloodGroup}</th>
              <th className="py-2 pr-3 font-semibold">{dict.org.units}</th>
            </tr>
          </thead>
          <tbody>
            {BLOOD_GROUPS.map((group) => (
              <tr key={group} className="border-b border-line/60 last:border-0">
                <td className="py-2 pr-3 font-medium">{bloodGroupLabel(group, locale)}</td>
                <td className="py-2 pr-3">
                  <label className="sr-only" htmlFor={`inv-${group}-whole_blood`}>
                    {`${bloodGroupLabel(group, locale)} ${componentLabel("whole_blood", locale)}`}
                  </label>
                  <input
                    id={`inv-${group}-whole_blood`}
                    className="input-base !min-h-0 max-w-24 !py-1.5"
                    type="number"
                    min={0}
                    max={999}
                    value={values[key(group, "whole_blood")] ?? 0}
                    onChange={(event) =>
                      setValues((prev) => ({
                        ...prev,
                        [key(group, "whole_blood")]: Number(event.target.value || 0),
                      }))
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <details className="rounded-xl border border-line p-4">
        <summary className="cursor-pointer text-sm font-medium">
          {dict.org.component}: {componentLabel("platelets", locale)} /{" "}
          {componentLabel("plasma", locale)} / {componentLabel("prbc", locale)}
        </summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {(["prbc", "platelets", "plasma"] as const).map((component) => (
            <fieldset key={component} className="rounded-lg border border-line p-3">
              <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted">
                {componentLabel(component, locale)}
              </legend>
              <div className="mt-2 space-y-2">
                {BLOOD_GROUPS.map((group) => (
                  <div key={group} className="flex items-center justify-between gap-2">
                    <label className="text-sm" htmlFor={`inv-${group}-${component}`}>
                      {bloodGroupLabel(group, locale)}
                    </label>
                    <input
                      id={`inv-${group}-${component}`}
                      className="input-base !min-h-0 w-20 !py-1 text-right"
                      type="number"
                      min={0}
                      max={999}
                      value={values[key(group, component)] ?? 0}
                      onChange={(event) =>
                        setValues((prev) => ({
                          ...prev,
                          [key(group, component)]: Number(event.target.value || 0),
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      </details>

      <button type="submit" className="button-primary" disabled={busy}>
        {busy ? dict.common.saving : dict.org.saveInventory}
      </button>
    </form>
  );
}
