"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Dictionary } from "@/messages/en";
import type { Locale } from "@/lib/i18n";
import { DISTRICTS, PROVINCES } from "@/data/geography";
import { BLOOD_COMPONENTS, BLOOD_GROUPS, URGENCY_VALUES, bloodGroupLabel, componentLabel, urgencyLabel } from "@/lib/blood";
import { apiRequest, ClientApiError, describeError } from "@/services/api";
import { localDateTimeValue } from "@/lib/dates";
import { CopyButton } from "../ui/copy-button";
import { Callout } from "../ui/ui";

type Created = {
  publicId: string;
  notified: { notified: number; simulated: number; failed: number; pending: number };
};

export function RequestForm({
  locale,
  dict,
  defaultGroup,
  defaultDistrict,
  defaultRadius,
  defaultName,
}: {
  locale: Locale;
  dict: Dictionary;
  defaultGroup: string;
  defaultDistrict: string;
  defaultRadius: number;
  defaultName: string;
}) {
  const router = useRouter();
  const [province, setProvince] = useState(
    DISTRICTS.find((item) => item.code === defaultDistrict)?.provinceCode ?? "P3",
  );
  const [district, setDistrict] = useState(defaultDistrict);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [created, setCreated] = useState<Created | null>(null);

  const districts = useMemo(
    () => DISTRICTS.filter((item) => item.provinceCode === province),
    [province],
  );

  const defaultNeededBy = useMemo(() => localDateTimeValue(6), []);

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

    const neededByLocal = String(form.get("neededBy") ?? "");
    const neededBy = neededByLocal ? new Date(neededByLocal).toISOString() : "";

    const body = {
      bloodGroupNeeded: String(form.get("bloodGroupNeeded")),
      component: String(form.get("component")),
      unitsNeeded: Number(form.get("unitsNeeded") ?? 1),
      urgency: String(form.get("urgency")),
      provinceCode: province,
      districtCode: district,
      hospitalName: String(form.get("hospitalName") ?? "").trim(),
      neededBy,
      contactName: String(form.get("contactName") ?? "").trim(),
      contactPhone: String(form.get("contactPhone") ?? "").trim(),
      patientReference: String(form.get("patientReference") ?? "").trim() || undefined,
      clinicalNote: String(form.get("clinicalNote") ?? "").trim() || undefined,
      shareContactPublicly: form.get("shareContactPublicly") === "on",
      notifyRadiusKm: Number(form.get("notifyRadiusKm") ?? defaultRadius),
    };

    try {
      const response = await apiRequest<{ publicId: string; notified: Created["notified"] }>(
        "/api/v1/requests",
        { body },
      );
      setCreated({ publicId: response.publicId, notified: response.notified });
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

  if (created) {
    const publicUrl = `${typeof window === "undefined" ? "" : window.location.origin}/${locale}/requests/${created.publicId}`;
    return (
      <div className="card p-6">
        <h2 className="text-xl font-bold">{dict.request.successTitle}</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          {created.notified.notified > 0
            ? dict.request.successBody.replace("{count}", String(created.notified.notified))
            : dict.request.successNone}
        </p>

        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {dict.request.shareLink}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input readOnly value={publicUrl} className="input-base font-mono text-xs" />
            <CopyButton value={publicUrl} label={dict.request.copyLink} copiedLabel={dict.request.copied} />
          </div>
        </div>

        {created.notified.simulated > 0 ? (
          <div className="mt-4">
            <Callout tone="warning" title={dict.common.simulated}>
              {locale === "ne"
                ? "यो वातावरणमा सन्देश प्रदायक सेट गरिएको छैन, त्यसैले सन्देश वास्तविक फोनमा गएको छैन।"
                : "No messaging provider is configured in this environment, so no real phone received a message."}
            </Callout>
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          <Link className="button-primary" href={`/${locale}/dashboard/requests/${created.publicId}`}>
            {dict.request.responsesTitle}
          </Link>
          <Link className="button-secondary" href={`/${locale}/dashboard`}>
            {dict.dashboard.title}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {error ? (
        <Callout tone="danger" role="alert">
          {error}
        </Callout>
      ) : null}

      <div className="card p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="field">
            <label className="label" htmlFor="req-group">
              {dict.request.patientGroup}
            </label>
            <select id="req-group" name="bloodGroupNeeded" className="input-base" defaultValue={defaultGroup}>
              {BLOOD_GROUPS.map((item) => (
                <option key={item} value={item}>
                  {bloodGroupLabel(item, locale)}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="label" htmlFor="req-component">
              {dict.request.component}
            </label>
            <select id="req-component" name="component" className="input-base" defaultValue="whole_blood">
              {BLOOD_COMPONENTS.map((item) => (
                <option key={item} value={item}>
                  {componentLabel(item, locale)}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="label" htmlFor="req-units">
              {dict.request.units}
            </label>
            <input
              id="req-units"
              name="unitsNeeded"
              type="number"
              min={1}
              max={10}
              defaultValue={1}
              className="input-base"
              required
            />
            {fieldError("unitsNeeded")}
          </div>

          <div className="field">
            <label className="label" htmlFor="req-urgency">
              {dict.request.urgency}
            </label>
            <select id="req-urgency" name="urgency" className="input-base" defaultValue="urgent">
              {URGENCY_VALUES.map((item) => (
                <option key={item} value={item}>
                  {urgencyLabel(item, locale)}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="label" htmlFor="req-province">
              {dict.find.province}
            </label>
            <select
              id="req-province"
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
            <label className="label" htmlFor="req-district">
              {dict.find.district}
            </label>
            <select
              id="req-district"
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

          <div className="field sm:col-span-2">
            <label className="label" htmlFor="req-hospital">
              {dict.request.hospital}
            </label>
            <input
              id="req-hospital"
              name="hospitalName"
              className="input-base"
              required
              minLength={3}
              maxLength={160}
              placeholder={dict.request.hospitalPlaceholder}
            />
            {fieldError("hospitalName")}
          </div>

          <div className="field">
            <label className="label" htmlFor="req-needed-by">
              {dict.request.neededBy}
            </label>
            <input
              id="req-needed-by"
              name="neededBy"
              type="datetime-local"
              className="input-base"
              defaultValue={defaultNeededBy}
              required
            />
            {fieldError("neededBy")}
          </div>

          <div className="field">
            <label className="label" htmlFor="req-radius">
              {dict.request.notifyRadius}
            </label>
            <select id="req-radius" name="notifyRadiusKm" className="input-base" defaultValue={defaultRadius}>
              {[25, 50, 75, 100, 150, 250].map((value) => (
                <option key={value} value={value}>
                  {value} {dict.common.km}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="field">
            <label className="label" htmlFor="req-contact-name">
              {dict.request.contactName}
            </label>
            <input
              id="req-contact-name"
              name="contactName"
              className="input-base"
              required
              defaultValue={defaultName}
              autoComplete="name"
            />
            {fieldError("contactName")}
          </div>

          <div className="field">
            <label className="label" htmlFor="req-contact-phone">
              {dict.request.contactPhone}
            </label>
            <input
              id="req-contact-phone"
              name="contactPhone"
              className="input-base"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              placeholder="98XXXXXXXX"
            />
            <p className="hint">{dict.request.contactPhoneHint}</p>
            {fieldError("contactPhone")}
          </div>

          <div className="field">
            <label className="label" htmlFor="req-patient-ref">
              {dict.request.patientReference}
            </label>
            <input id="req-patient-ref" name="patientReference" className="input-base" maxLength={80} />
            <p className="hint">{dict.request.patientReferenceHint}</p>
          </div>

          <div className="field sm:col-span-2">
            <label className="label" htmlFor="req-note">
              {dict.request.note}
            </label>
            <textarea id="req-note" name="clinicalNote" className="input-base min-h-24" maxLength={500} />
            <p className="hint">{dict.request.noteHint}</p>
          </div>

          <label className="flex items-start gap-3 text-sm sm:col-span-2">
            <input type="checkbox" name="shareContactPublicly" className="mt-1 h-4 w-4" />
            <span>
              <span className="font-medium">{dict.request.sharePublicly}</span>
              <span className="mt-1 block text-xs leading-relaxed text-muted">
                {dict.request.sharePubliclyHint}
              </span>
            </span>
          </label>
        </div>
      </div>

      <button type="submit" className="button-primary w-full sm:w-auto" disabled={busy}>
        {busy ? dict.request.submitting : dict.request.submit}
      </button>
    </form>
  );
}
