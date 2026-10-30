"use client";

import { useState } from "react";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/messages/en";
import { DISTRICTS, PROVINCES, districtsOfProvince } from "@/data/geography";
import { haversineKm } from "@/lib/geo";
import { updateCoordination, useCoordination } from "@/lib/coordination/store";
import type { LocationChoice, LocationPurpose } from "@/lib/coordination/types";
import { Callout } from "@/components/ui/ui";

type Picked = {
  provinceCode: string;
  districtCode: string;
  area: string;
  source: LocationChoice["source"];
};

/** Nearest district headquarters — a coarse, deliberately imprecise match. */
function nearestDistrict(latitude: number, longitude: number) {
  const first = DISTRICTS[0];
  if (!first) return null;
  let best = first;
  let bestKm = Number.POSITIVE_INFINITY;
  for (const district of DISTRICTS) {
    const km = haversineKm(
      { latitude, longitude },
      { latitude: district.latitude, longitude: district.longitude },
    );
    if (km < bestKm) {
      bestKm = km;
      best = district;
    }
  }
  return { district: best, distanceKm: Math.round(bestKm * 10) / 10 };
}

/**
 * Device-location permission card.
 *
 * The browser prompt is only requested after an explicit tap, denial is a
 * first-class outcome, and a granted position is reduced to a district — no
 * coordinate is persisted by this prototype.
 */
export function LocationAssist({
  dict,
  onPick,
}: {
  dict: Dictionary;
  onPick: (picked: Picked) => void;
}) {
  const { locationPermission } = useCoordination();
  const [pending, setPending] = useState(false);

  const useDevice = () => {
    if (!("geolocation" in navigator)) {
      updateCoordination({ locationPermission: "denied" });
      return;
    }
    setPending(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPending(false);
        const nearest = nearestDistrict(
          position.coords.latitude,
          position.coords.longitude,
        );
        if (!nearest) {
          updateCoordination({ locationPermission: "denied" });
          return;
        }
        updateCoordination({ locationPermission: "granted" });
        onPick({
          provinceCode: nearest.district.provinceCode,
          districtCode: nearest.district.code,
          area: "",
          source: "device",
        });
      },
      () => {
        setPending(false);
        updateCoordination({ locationPermission: "denied" });
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600_000 },
    );
  };

  const skip = () => updateCoordination({ locationPermission: "dismissed" });

  if (locationPermission === "unknown") {
    return (
      <Callout tone="info" title={dict.coord.location.permissionTitle}>
        <p>{dict.coord.location.permissionBody}</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            className="button-primary flex-1"
            onClick={useDevice}
            disabled={pending}
          >
            {pending ? dict.common.loading : dict.coord.location.permissionAllow}
          </button>
          <button type="button" className="button-secondary flex-1" onClick={skip}>
            {dict.coord.location.permissionManual}
          </button>
        </div>
      </Callout>
    );
  }

  if (locationPermission === "granted") {
    return (
      <Callout tone="success" role="status" title={dict.coord.location.permissionGranted}>
        <button type="button" className="button-secondary mt-2" onClick={useDevice}>
          {dict.coord.location.useDevice}
        </button>
      </Callout>
    );
  }

  return (
    <Callout
      tone={locationPermission === "denied" ? "danger" : "neutral"}
      role="status"
      title={
        locationPermission === "denied"
          ? dict.coord.location.permissionDenied
          : dict.coord.location.permissionDismissed
      }
    >
      <p className="text-sm">{dict.coord.location.manualTitle}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" className="button-secondary" onClick={useDevice}>
          {dict.coord.location.useDevice}
        </button>
      </div>
      <p className="mt-2 text-xs text-muted">{dict.coord.location.accuracyNote}</p>
    </Callout>
  );
}

const PURPOSES: Array<{ key: LocationPurpose; label: string; hint: string }> = [
  {
    key: "requester_discovery",
    label: "purposeRequesterDiscovery",
    hint: "purposeRequesterDiscoveryHint",
  },
  { key: "donor_matching", label: "purposeDonorMatching", hint: "purposeDonorMatchingHint" },
  { key: "donor_live", label: "purposeDonorLive", hint: "purposeDonorLiveHint" },
  { key: "requester_live", label: "purposeRequesterLive", hint: "purposeRequesterLiveHint" },
];

/** Four separate, individually reversible location purposes. */
export function LocationConsentList({ dict }: { dict: Dictionary }) {
  const { locationConsent } = useCoordination();

  const toggle = (purpose: LocationPurpose, value: boolean) => {
    updateCoordination((current) => ({
      locationConsent: { ...current.locationConsent, [purpose]: value },
    }));
  };

  return (
    <section className="card p-4" aria-labelledby="location-consent-title">
      <h3 id="location-consent-title" className="text-base font-semibold">
        {dict.coord.location.consentTitle}
      </h3>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        {dict.coord.location.consentBody}
      </p>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {PURPOSES.map((purpose) => (
          <li key={purpose.key} className="rounded-xl border border-line bg-surface-muted p-3">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 h-5 w-5 shrink-0 accent-brand-600"
                checked={locationConsent[purpose.key]}
                onChange={(event) => toggle(purpose.key, event.target.checked)}
              />
              <span>
                <span className="block text-sm font-medium">
                  {dict.coord.location[purpose.label as "purposeDonorLive"]}
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted">
                  {dict.coord.location[purpose.hint as "purposeDonorLiveHint"]}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Full location screen: permission, manual entry with a district picker, and
 * the four consent purposes. Everything is written to browser-local state.
 */
export function LocationPanel({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const { location, locationPermission } = useCoordination();
  const [form, setForm] = useState<{
    provinceCode: string;
    districtCode: string;
    municipality: string;
    area: string;
    hospital: string;
  }>(() =>
    location
      ? {
          provinceCode: location.provinceCode,
          districtCode: location.districtCode,
          municipality: location.municipality,
          area: location.area,
          hospital: location.hospital,
        }
      : {
          provinceCode: PROVINCES[0]?.code ?? "P1",
          districtCode:
            districtsOfProvince(PROVINCES[0]?.code ?? "P1")[0]?.code ??
            DISTRICTS[0]?.code ??
            "",
          municipality: "",
          area: "",
          hospital: "",
        },
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const districts = districtsOfProvince(form.provinceCode);

  const pickFromDevice = (picked: Picked) => {
    setForm((current) => ({
      ...current,
      provinceCode: picked.provinceCode,
      districtCode: picked.districtCode,
      area: picked.area || current.area,
    }));
    setNotice(dict.coord.location.permissionGranted);
  };

  const save = () => {
    if (!form.districtCode) {
      setError(dict.coord.location.required);
      return;
    }
    if (!form.hospital.trim()) {
      setError(dict.coord.location.requiredHospital);
      return;
    }
    setError(null);
    const choice: LocationChoice = {
      provinceCode: form.provinceCode,
      districtCode: form.districtCode,
      municipality: form.municipality.trim(),
      area: form.area.trim(),
      hospital: form.hospital.trim(),
      lat: null,
      lng: null,
      source: "manual",
      accuracyNote: dict.coord.location.accuracyNote,
    };
    updateCoordination({ location: choice });
    setNotice(dict.coord.location.saved);
  };

  return (
    <div className="mt-6 grid gap-4">
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

      <LocationAssist dict={dict} onPick={pickFromDevice} />

      <section className="card p-4" aria-labelledby="manual-location-title">
        <h3 id="manual-location-title" className="text-base font-semibold">
          {dict.coord.location.manualTitle}
        </h3>

        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div className="field">
            <label className="label" htmlFor="loc-province">
              {dict.coord.location.province}
            </label>
            <select
              id="loc-province"
              className="input-base"
              value={form.provinceCode}
              onChange={(event) => {
                const provinceCode = event.target.value;
                setForm((current) => ({
                  ...current,
                  provinceCode,
                  districtCode:
                    districtsOfProvince(provinceCode)[0]?.code ?? current.districtCode,
                }));
              }}
            >
              {PROVINCES.map((province) => (
                <option key={province.code} value={province.code}>
                  {locale === "ne" ? province.nameNe : province.nameEn}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="label" htmlFor="loc-district">
              {dict.coord.location.district}
            </label>
            <select
              id="loc-district"
              className={`input-base ${error && !form.districtCode ? "input-error" : ""}`}
              value={form.districtCode}
              onChange={(event) =>
                setForm((current) => ({ ...current, districtCode: event.target.value }))
              }
            >
              {districts.map((district) => (
                <option key={district.code} value={district.code}>
                  {locale === "ne" ? district.nameNe : district.nameEn}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="label" htmlFor="loc-municipality">
              {dict.coord.location.municipality}
            </label>
            <input
              id="loc-municipality"
              type="text"
              className="input-base"
              value={form.municipality}
              onChange={(event) =>
                setForm((current) => ({ ...current, municipality: event.target.value }))
              }
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="loc-area">
              {dict.coord.location.area}
            </label>
            <input
              id="loc-area"
              type="text"
              className="input-base"
              value={form.area}
              onChange={(event) => setForm((current) => ({ ...current, area: event.target.value }))}
            />
          </div>

          <div className="field sm:col-span-2">
            <label className="label" htmlFor="loc-hospital">
              {dict.coord.location.hospital}
            </label>
            <input
              id="loc-hospital"
              type="text"
              className={`input-base ${error && !form.hospital.trim() ? "input-error" : ""}`}
              value={form.hospital}
              onChange={(event) =>
                setForm((current) => ({ ...current, hospital: event.target.value }))
              }
            />
          </div>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-muted">
          {dict.coord.location.accuracyNote} {dict.coord.location.noCoordinates}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          {locationPermission === "denied"
            ? dict.coord.location.permissionDenied
            : dict.coord.location.subtitle}
        </p>

        <button type="button" className="button-primary mt-4 w-full" onClick={save}>
          {dict.common.save}
        </button>
      </section>

      <LocationConsentList dict={dict} />
    </div>
  );
}
