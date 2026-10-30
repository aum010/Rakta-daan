"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Dictionary } from "@/messages/en";
import type { Locale } from "@/lib/i18n";
import { DISTRICTS, PROVINCES } from "@/data/geography";
import { BLOOD_GROUPS, bloodGroupLabel } from "@/lib/blood";
import { apiRequest, ClientApiError, describeError } from "@/services/api";
import { Callout } from "../ui/ui";

export function DonorRegistrationForm({
  locale,
  dict,
  defaultName,
  phoneMasked,
}: {
  locale: Locale;
  dict: Dictionary;
  defaultName: string;
  phoneMasked: string;
}) {
  const router = useRouter();
  const [province, setProvince] = useState("P3");
  const [district, setDistrict] = useState("KTM");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const districts = useMemo(
    () => DISTRICTS.filter((item) => item.provinceCode === province),
    [province],
  );

  function onProvinceChange(code: string) {
    setProvince(code);
    const first = DISTRICTS.find((item) => item.provinceCode === code);
    if (first) setDistrict(first.code);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setFieldErrors({});
    const form = new FormData(event.currentTarget);

    const weightRaw = String(form.get("weightKg") ?? "").trim();
    const lastDonationRaw = String(form.get("lastDonationDate") ?? "").trim();

    const body = {
      name: String(form.get("name") ?? "").trim(),
      phone: String(form.get("phone") ?? "").trim(),
      locale,
      bloodGroup: String(form.get("bloodGroup")),
      sex: String(form.get("sex")),
      dateOfBirth: String(form.get("dateOfBirth")),
      weightKg: weightRaw ? Number(weightRaw) : undefined,
      provinceCode: province,
      districtCode: district,
      municipality: String(form.get("municipality") ?? "").trim() || undefined,
      ward: String(form.get("ward") ?? "").trim() || undefined,
      lastDonationDate: lastDonationRaw || undefined,
      consentAlerts: form.get("consentAlerts") === "on",
      consentSms: form.get("consentSms") === "on",
      consentWhatsapp: form.get("consentWhatsapp") === "on",
      consentContactRelease: form.get("consentContactRelease") === "on",
      acceptTerms: form.get("acceptTerms") === "on",
    };

    try {
      await apiRequest("/api/v1/donors", { body });
      router.push(`/${locale}/donor`);
      router.refresh();
    } catch (caught) {
      setError(describeError(caught, dict));
      if (caught instanceof ClientApiError) {
        const map: Record<string, string> = {};
        for (const field of caught.fieldErrors) {
          if (field.path) map[field.path] = field.message;
        }
        setFieldErrors(map);
      }
    } finally {
      setBusy(false);
    }
  }

  function fieldError(path: string) {
    return fieldErrors[path] ? (
      <p className="text-xs font-medium text-danger-700">{fieldErrors[path]}</p>
    ) : null;
  }

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      {error ? (
        <Callout tone="danger" role="alert">
          {error}
        </Callout>
      ) : null}

      <fieldset className="card p-5">
        <legend className="px-1 text-base font-semibold">{dict.register.sectionIdentity}</legend>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div className="field">
            <label className="label" htmlFor="donor-name">
              {dict.register.fullName}
            </label>
            <input
              id="donor-name"
              name="name"
              className="input-base"
              required
              defaultValue={defaultName}
              autoComplete="name"
            />
            {fieldError("name")}
          </div>

          <div className="field">
            <label className="label" htmlFor="donor-phone">
              {dict.auth.phone}
            </label>
            <input
              id="donor-phone"
              name="phone"
              className="input-base"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder={phoneMasked}
              required
            />
            <p className="hint">{dict.auth.phoneHint}</p>
            {fieldError("phone")}
          </div>

          <div className="field">
            <label className="label" htmlFor="donor-group">
              {dict.register.bloodGroup}
            </label>
            <select id="donor-group" name="bloodGroup" className="input-base" required defaultValue="O_POS">
              {BLOOD_GROUPS.map((item) => (
                <option key={item} value={item}>
                  {bloodGroupLabel(item, locale)}
                </option>
              ))}
            </select>
            <p className="hint">{dict.register.bloodGroupUnknown}</p>
          </div>

          <div className="field">
            <label className="label" htmlFor="donor-sex">
              {dict.register.sex}
            </label>
            <select id="donor-sex" name="sex" className="input-base" required defaultValue="male">
              <option value="male">{dict.register.male}</option>
              <option value="female">{dict.register.female}</option>
              <option value="other">{dict.register.other}</option>
            </select>
          </div>

          <div className="field">
            <label className="label" htmlFor="donor-dob">
              {dict.register.dateOfBirth}
            </label>
            <input
              id="donor-dob"
              name="dateOfBirth"
              className="input-base"
              type="date"
              required
              max={new Date().toISOString().slice(0, 10)}
            />
            <p className="hint">{dict.register.dateOfBirthHint}</p>
            {fieldError("dateOfBirth")}
          </div>

          <div className="field">
            <label className="label" htmlFor="donor-weight">
              {dict.register.weight}
            </label>
            <input
              id="donor-weight"
              name="weightKg"
              className="input-base"
              type="number"
              min={30}
              max={250}
              inputMode="numeric"
            />
            <p className="hint">{dict.register.weightHint}</p>
          </div>
        </div>
      </fieldset>

      <fieldset className="card p-5">
        <legend className="px-1 text-base font-semibold">{dict.register.sectionLocation}</legend>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div className="field">
            <label className="label" htmlFor="donor-province">
              {dict.find.province}
            </label>
            <select
              id="donor-province"
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
            <label className="label" htmlFor="donor-district">
              {dict.find.district}
            </label>
            <select
              id="donor-district"
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
            {fieldError("districtCode")}
          </div>

          <div className="field">
            <label className="label" htmlFor="donor-municipality">
              {dict.register.municipality} <span className="font-normal text-muted">({dict.common.optional})</span>
            </label>
            <input id="donor-municipality" name="municipality" className="input-base" maxLength={80} />
          </div>

          <div className="field">
            <label className="label" htmlFor="donor-ward">
              {dict.register.ward} <span className="font-normal text-muted">({dict.common.optional})</span>
            </label>
            <input id="donor-ward" name="ward" className="input-base" maxLength={4} inputMode="numeric" />
          </div>

          <div className="field">
            <label className="label" htmlFor="donor-last-donation">
              {dict.register.lastDonation}
            </label>
            <input
              id="donor-last-donation"
              name="lastDonationDate"
              className="input-base"
              type="date"
              max={new Date().toISOString().slice(0, 10)}
            />
            <p className="hint">{dict.register.lastDonationHint}</p>
            {fieldError("lastDonationDate")}
          </div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted">{dict.donor.distanceNote}</p>
      </fieldset>

      <fieldset className="card p-5">
        <legend className="px-1 text-base font-semibold">{dict.register.sectionConsent}</legend>

        <div className="mt-3 space-y-4">
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" name="consentAlerts" required className="mt-1 h-4 w-4" />
            <span>
              <span className="font-medium">{dict.register.consentAlertsLabel}</span>
              <span className="mt-1 block text-xs leading-relaxed text-muted">
                {dict.register.consentAlertsBody}
              </span>
            </span>
          </label>

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex items-center gap-2 rounded-lg border border-line p-3 text-sm">
              <input type="checkbox" name="consentSms" className="h-4 w-4" defaultChecked />
              <span>{dict.register.consentSms}</span>
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-line p-3 text-sm">
              <input type="checkbox" name="consentWhatsapp" className="h-4 w-4" />
              <span>{dict.register.consentWhatsapp}</span>
            </label>
          </div>
          {fieldError("consentSms")}

          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              name="consentContactRelease"
              required
              className="mt-1 h-4 w-4"
            />
            <span>
              <span className="font-medium">{dict.register.consentContactLabel}</span>
              <span className="mt-1 block text-xs leading-relaxed text-muted">
                {dict.register.consentContactBody}
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" name="acceptTerms" required className="mt-1 h-4 w-4" />
            <span>
              <span className="font-medium">{dict.register.acceptTerms}</span>
              <span className="mt-1 block text-xs leading-relaxed text-muted">
                {dict.register.acceptTermsHint}
              </span>
            </span>
          </label>
        </div>
      </fieldset>

      <div className="space-y-2">
        <button type="submit" className="button-primary w-full sm:w-auto" disabled={busy}>
          {busy ? dict.register.submitting : dict.register.submit}
        </button>
        <p className="text-xs leading-relaxed text-muted">{dict.register.notMedical}</p>
      </div>
    </form>
  );
}
