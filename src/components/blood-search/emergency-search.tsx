"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DISTRICTS, PROVINCES } from "@/data/geography";
import {
  BLOOD_COMPONENTS,
  BLOOD_GROUPS,
  URGENCY_VALUES,
  bloodGroupLabel,
  componentLabel,
  urgencyLabel,
} from "@/lib/blood";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/messages/en";
import { LocationAssist } from "@/components/coordination/location";
import { useCoordination } from "@/lib/coordination/store";

/**
 * The home page's main emergency panel.
 *
 * It collects exactly what the request needs before anything exists — blood
 * group, component, quantity, urgency and where — then hands those values to
 * the request wizard, which validates them again and shows a review step.
 * Nothing is stored or sent from this panel.
 *
 * Location is offered rather than assumed: the browser prompt only appears
 * after an explicit tap, a device position is reduced to a district, and
 * declining it leaves every manual option intact.
 */
export function EmergencySearch({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const router = useRouter();
  const base = `/${locale}`;
  const { locationPermission, location } = useCoordination();

  const [group, setGroup] = useState("");
  const [component, setComponent] = useState<string>("whole_blood");
  const [units, setUnits] = useState("1");
  const [urgency, setUrgency] = useState<string>("urgent");
  const [hospital, setHospital] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  /* Location is derived, never synced in an effect: a location picked at the
     top of the page supplies the value until the user chooses one themselves,
     and their choice always wins from then on. */
  const [userProvince, setUserProvince] = useState<string | null>(null);
  const [userDistrict, setUserDistrict] = useState<string | null>(null);

  const fallbackProvince =
    DISTRICTS.find((item) => item.code === "KTM")?.provinceCode ?? "P3";
  const province = userProvince ?? location?.provinceCode ?? fallbackProvince;
  const district = userDistrict ?? location?.districtCode ?? "KTM";

  const districts = DISTRICTS.filter((item) => item.provinceCode === province);

  function onProvinceChange(code: string) {
    setUserProvince(code);
    const first = DISTRICTS.find((item) => item.provinceCode === code);
    setUserDistrict(first?.code ?? null);
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!group) {
      setError(dict.find.groupRequired);
      document.getElementById("emergency-group")?.focus();
      return;
    }
    setError("");
    setSubmitting(true);

    /* "Not sure" is a guidance route, not a request — never guess a group. */
    if (group === "not_sure") {
      router.push(
        `${base}/find/guidance?district=${district}&radius=75`,
      );
      return;
    }

    const query = new URLSearchParams({
      group,
      component,
      units,
      urgency,
      district,
    });
    if (hospital.trim()) query.set("hospital", hospital.trim());
    router.push(`${base}/request/new?${query.toString()}`);
  }

  return (
    <form onSubmit={onSubmit} noValidate aria-label={dict.home.heroSearchTitle} className="mt-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Location consent — only once the entry card has been answered, so the
            page never shows two prompts for the same permission. */}
        {locationPermission !== "unknown" ? (
          <div className="sm:col-span-2">
            <LocationAssist
              dict={dict}
              onPick={(picked) => {
                setUserProvince(picked.provinceCode);
                setUserDistrict(picked.districtCode);
              }}
            />
          </div>
        ) : null}

        <div className="field sm:col-span-2">
          <label className="label" htmlFor="emergency-group">
            {dict.find.bloodGroup}
          </label>
          <select
            id="emergency-group"
            className={`input-base ${error ? "input-error" : ""}`}
            value={group}
            onChange={(event) => {
              setGroup(event.target.value);
              setError("");
            }}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "emergency-group-error" : "emergency-group-hint"}
          >
            <option value="">{dict.find.bloodGroup}</option>
            {BLOOD_GROUPS.map((item) => (
              <option key={item} value={item}>
                {bloodGroupLabel(item, locale)}
              </option>
            ))}
            <option value="not_sure">{dict.find.notSureLabel}</option>
          </select>
          {error ? (
            <p id="emergency-group-error" className="field-error mt-1" role="alert">
              {error}
            </p>
          ) : (
            <p id="emergency-group-hint" className="hint mt-1">
              {dict.find.groupRequired}
            </p>
          )}
        </div>

        <div className="field">
          <label className="label" htmlFor="emergency-component">
            {dict.requestDemo.component}
          </label>
          <select
            id="emergency-component"
            className="input-base"
            value={component}
            onChange={(event) => setComponent(event.target.value)}
          >
            {BLOOD_COMPONENTS.map((item) => (
              <option key={item} value={item}>
                {componentLabel(item, locale)}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label className="label" htmlFor="emergency-units">
            {dict.requestDemo.units}
          </label>
          <input
            id="emergency-units"
            type="number"
            min={1}
            max={20}
            step={1}
            className="input-base"
            value={units}
            onChange={(event) => setUnits(event.target.value)}
            aria-describedby="emergency-units-hint"
          />
          <p id="emergency-units-hint" className="hint mt-1">
            {dict.requestDemo.unitsHint}
          </p>
        </div>

        <div className="field">
          <label className="label" htmlFor="emergency-urgency">
            {dict.requestDemo.urgency}
          </label>
          <select
            id="emergency-urgency"
            className="input-base"
            value={urgency}
            onChange={(event) => setUrgency(event.target.value)}
          >
            {URGENCY_VALUES.map((item) => (
              <option key={item} value={item}>
                {urgencyLabel(item, locale)}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label className="label" htmlFor="emergency-hospital">
            {dict.requestDemo.hospital}
          </label>
          <input
            id="emergency-hospital"
            type="text"
            className="input-base"
            value={hospital}
            placeholder={dict.requestDemo.hospitalPlaceholder}
            onChange={(event) => setHospital(event.target.value)}
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="emergency-province">
            {dict.find.province}
          </label>
          <select
            id="emergency-province"
            className="input-base"
            value={province}
            onChange={(event) => onProvinceChange(event.target.value)}
          >
            {PROVINCES.map((item) => (
              <option key={item.code} value={item.code}>
                {locale === "ne" ? item.nameNe : item.nameEn}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label className="label" htmlFor="emergency-district">
            {dict.find.district}
          </label>
          <select
            id="emergency-district"
            className="input-base"
            value={district}
            onChange={(event) => setUserDistrict(event.target.value)}
          >
            {districts.map((item) => (
              <option key={item.code} value={item.code}>
                {locale === "ne" ? item.nameNe : item.nameEn}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="button-primary sm:col-span-2"
          disabled={submitting}
        >
          {dict.home.searchSubmit}
        </button>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted">{dict.requestDemo.demoNotice}</p>
    </form>
  );
}
