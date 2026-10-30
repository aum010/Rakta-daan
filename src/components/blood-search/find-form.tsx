"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { DISTRICTS, PROVINCES } from "@/data/geography";
import { BLOOD_GROUPS, bloodGroupLabel } from "@/lib/blood";
import type { Locale } from "@/lib/i18n";

export type FindFormLabels = {
  bloodGroup: string;
  province: string;
  district: string;
  radius: string;
  search: string;
  all: string;
  km: string;
  notSureLabel: string;
  groupRequired: string;
  hospital: string;
  hospitalHint: string;
  hospitalPlaceholder: string;
};

export function FindForm({
  locale,
  labels,
  defaultGroup = "",
  defaultDistrict = "KTM",
  defaultRadius = 75,
  compact = false,
}: {
  locale: Locale;
  labels: FindFormLabels;
  defaultGroup?: string;
  defaultDistrict?: string;
  defaultRadius?: number;
  compact?: boolean;
}) {
  const router = useRouter();
  const initialProvince =
    DISTRICTS.find((district) => district.code === defaultDistrict)?.provinceCode ?? "P3";
  const [province, setProvince] = useState(initialProvince);
  const [district, setDistrict] = useState(defaultDistrict);
  const [group, setGroup] = useState(defaultGroup);
  const [radius, setRadius] = useState(defaultRadius);
  const [hospital, setHospital] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const districts = useMemo(
    () => DISTRICTS.filter((item) => item.provinceCode === province),
    [province],
  );

  function onProvinceChange(code: string) {
    setProvince(code);
    const first = DISTRICTS.find((item) => item.provinceCode === code);
    if (first) setDistrict(first.code);
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!group) {
      setError(labels.groupRequired);
      document.getElementById("find-group")?.focus();
      return;
    }
    setError("");
    setSubmitting(true);
    const query = new URLSearchParams({ district, radius: String(radius) });
    if (group === "not_sure") {
      router.push(`/${locale}/find/guidance?${query.toString()}`);
      return;
    }
    query.set("group", group);
    if (hospital.trim()) query.set("hospital", hospital.trim());
    router.push(`/${locale}/find?${query.toString()}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className={
        compact
          ? "grid gap-3 sm:grid-cols-2"
          : "grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end"
      }
      aria-label={labels.search}
    >
      <div className="field">
        <label className="label" htmlFor="find-group">
          {labels.bloodGroup}
        </label>
        <select
          id="find-group"
          className={`input-base ${error ? "input-error" : ""}`}
          value={group}
          onChange={(event) => {
            setGroup(event.target.value);
            setError("");
          }}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "find-group-error" : "find-group-hint"}
        >
          <option value="">{labels.bloodGroup}</option>
          {BLOOD_GROUPS.map((item) => (
            <option key={item} value={item}>
              {bloodGroupLabel(item, locale)}
            </option>
          ))}
          <option value="not_sure">{labels.notSureLabel}</option>
        </select>
        {error ? (
          <p id="find-group-error" className="field-error mt-1" role="alert">
            {error}
          </p>
        ) : (
          <p id="find-group-hint" className="hint mt-1">
            {labels.groupRequired}
          </p>
        )}
      </div>

      <div className="field">
        <label className="label" htmlFor="find-province">
          {labels.province}
        </label>
        <select
          id="find-province"
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
        <label className="label" htmlFor="find-district">
          {labels.district}
        </label>
        <select
          id="find-district"
          className="input-base"
          value={district}
          onChange={(event) => setDistrict(event.target.value)}
        >
          {districts.map((item) => (
            <option key={item.code} value={item.code}>
              {locale === "ne" ? item.nameNe : item.nameEn}
            </option>
          ))}
        </select>
      </div>

      {!compact ? (
        <div className="field">
          <label className="label" htmlFor="find-radius">
            {labels.radius}
          </label>
          <select
            id="find-radius"
            className="input-base"
            value={radius}
            onChange={(event) => setRadius(Number(event.target.value))}
          >
            {[25, 50, 75, 100, 150, 250].map((value) => (
              <option key={value} value={value}>
                {value} {labels.km}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <input type="hidden" name="radius" value={radius} />
      )}

      {!compact ? (
        <div className="field lg:col-span-2">
          <label className="label" htmlFor="find-hospital">
            {labels.hospital}
          </label>
          <input
            id="find-hospital"
            type="text"
            className="input-base"
            value={hospital}
            placeholder={labels.hospitalPlaceholder}
            onChange={(event) => setHospital(event.target.value)}
            aria-describedby="find-hospital-hint"
          />
          <p id="find-hospital-hint" className="hint mt-1">
            {labels.hospitalHint}
          </p>
        </div>
      ) : null}

      <button
        type="submit"
        className={`button-primary w-full ${compact ? "sm:col-span-2" : "lg:col-span-2"}`}
        disabled={submitting}
      >
        {labels.search}
      </button>
    </form>
  );
}
