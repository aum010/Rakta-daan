"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Dictionary } from "@/messages/en";
import type { Locale } from "@/lib/i18n";
import {
  BLOOD_COMPONENTS,
  URGENCY_VALUES,
  bloodGroupLabel,
  componentLabel,
  urgencyLabel,
  type BloodComponent,
  type Urgency,
} from "@/lib/blood";
import { DISTRICTS, PROVINCES } from "@/data/geography";
import { isFutureDateTime, localDateTimeValue } from "@/lib/dates";
import { useDemoDataVersion } from "@/mocks/use-demo-data";
import { BloodGroupPicker, type BloodGroupChoice } from "../blood-search/blood-group-picker";
import { LocationAssist } from "@/components/coordination/location";
import { importDemoRequest } from "@/lib/coordination/import";
import { updateCoordination } from "@/lib/coordination/store";
import type { LocationChoice } from "@/lib/coordination/types";
import { Badge, Callout, DemoBanner, LoadingBlock } from "../ui/ui";
import { ArrowIcon, CheckCircleIcon, ClockIcon, LockIcon } from "../ui/icons";
import {
  createDemoRequest,
  demoRequestInputSchema,
  saveDemoRequest,
  updateDemoRequest,
  type DemoContactMethod,
  type DemoRelationship,
  type DemoRequest,
  type DemoRequestInput,
} from "@/mocks/request";

type FormState = {
  bloodGroup: BloodGroupChoice;
  component: BloodComponent;
  units: string;
  neededBy: string;
  urgency: Urgency;
  hospital: string;
  province: string;
  district: string;
  area: string;
  directions: string;
  contactName: string;
  contactMethod: DemoContactMethod;
  phone: string;
  email: string;
  relationship: DemoRelationship | "";
  notes: string;
  consentAccuracy: boolean;
  consentShare: boolean;
  consentUpdates: boolean;
};

const STEPS = ["need", "location", "contact", "review"] as const;
type Step = (typeof STEPS)[number];

/** Fields the homepage emergency panel can pre-fill before the wizard opens. */
export type RequestPrefill = Partial<FormState>;

function initialState(): FormState {
  return {
    bloodGroup: "",
    component: "whole_blood",
    units: "1",
    neededBy: "",
    urgency: "urgent",
    hospital: "",
    province: "P3",
    district: "KTM",
    area: "",
    directions: "",
    contactName: "",
    contactMethod: "phone",
    phone: "",
    email: "",
    relationship: "",
    notes: "",
    consentAccuracy: false,
    consentShare: false,
    consentUpdates: false,
  };
}

function fromRecord(record: DemoRequest): FormState {
  const date = new Date(record.neededBy);
  const pad = (value: number) => String(value).padStart(2, "0");
  const local = Number.isNaN(date.getTime())
    ? ""
    : `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  return {
    bloodGroup: record.bloodGroup,
    component: record.component,
    units: String(record.units),
    neededBy: local,
    urgency: record.urgency,
    hospital: record.hospital,
    province:
      DISTRICTS.find((district) => district.code === record.district)?.provinceCode ?? "P3",
    district: record.district,
    area: record.area ?? "",
    directions: record.directions ?? "",
    contactName: record.contactName,
    contactMethod: record.contactMethod,
    phone: record.phone ?? "",
    email: record.email ?? "",
    relationship: record.relationship ?? "",
    notes: record.notes ?? "",
    consentAccuracy: record.consentAccuracy,
    consentShare: record.consentShare,
    consentUpdates: record.consentUpdates,
  };
}

export function DemoRequestWizard(props: {
  locale: Locale;
  dict: Dictionary;
  initial?: DemoRequest;
  prefill?: RequestPrefill;
}) {
  const version = useDemoDataVersion();
  if (version < 0) {
    return <LoadingBlock label={props.dict.common.loading} rows={3} />;
  }
  return <DemoRequestWizardInner {...props} />;
}

function DemoRequestWizardInner({
  locale,
  dict,
  initial,
  prefill,
}: {
  locale: Locale;
  dict: Dictionary;
  initial?: DemoRequest;
  prefill?: RequestPrefill;
}) {
  const router = useRouter();
  const base = `/${locale}`;
  const [form, setForm] = useState<FormState>(() => ({
    ...(initial
      ? fromRecord(initial)
      : { ...initialState(), neededBy: localDateTimeValue(8) }),
    ...(prefill ?? {}),
  }));
  const [stepIndex, setStepIndex] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [created, setCreated] = useState<DemoRequest | null>(null);
  const [copied, setCopied] = useState(false);
  const [storageFailed, setStorageFailed] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const step = STEPS[stepIndex] ?? "need";

  const districts = useMemo(
    () => DISTRICTS.filter((district) => district.provinceCode === form.province),
    [form.province],
  );

  const stepLabels: Record<Step, string> = {
    need: dict.requestDemo.stepNeed,
    location: dict.requestDemo.stepLocation,
    contact: dict.requestDemo.stepContact,
    review: dict.requestDemo.stepReview,
  };

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[String(key)]) return current;
      const next = { ...current };
      delete next[String(key)];
      return next;
    });
  }

  function goToStep(index: number) {
    setStepIndex(index);
    window.setTimeout(() => headingRef.current?.focus(), 0);
  }

  function validateStep(target: Step): boolean {
    const next: Record<string, string> = {};
    if (target === "need") {
      if (!form.bloodGroup) next.bloodGroup = dict.formErrors.chooseGroup;
      const units = Number(form.units);
      if (!Number.isInteger(units) || units < 1 || units > 10) {
        next.units = dict.formErrors.units;
      }
      if (!isFutureDateTime(form.neededBy)) {
        next.neededBy = dict.formErrors.neededBy;
      }
    }
    if (target === "location") {
      if (form.hospital.trim().length < 2) next.hospital = dict.formErrors.hospital;
      if (!form.district) next.district = dict.formErrors.required;
    }
    if (target === "contact") {
      if (form.contactName.trim().length < 2) next.contactName = dict.formErrors.name;
      if (form.contactMethod === "phone" && !/^[+\d][\d\s-]{6,23}$/.test(form.phone)) {
        next.phone = dict.formErrors.phone;
      }
      if (
        form.contactMethod === "email" &&
        !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)
      ) {
        next.email = dict.formErrors.email;
      }
    }
    if (target === "review") {
      if (!form.consentAccuracy) next.consentAccuracy = dict.formErrors.consent;
      if (!form.consentShare) next.consentShare = dict.formErrors.consent;
    }
    setErrors(next);
    if (Object.keys(next).length > 0) {
      const first = Object.keys(next)[0];
      if (first) document.getElementById(first)?.focus();
      return false;
    }
    return true;
  }

  function next() {
    if (!validateStep(step)) return;
    goToStep(Math.min(stepIndex + 1, STEPS.length - 1));
  }

  function back() {
    setErrors({});
    goToStep(Math.max(stepIndex - 1, 0));
  }

  function inputFromForm(): DemoRequestInput | null {
    const candidate = {
      bloodGroup: form.bloodGroup,
      component: form.component,
      units: form.units,
      urgency: form.urgency,
      neededBy: form.neededBy ? new Date(form.neededBy).toISOString() : "",
      hospital: form.hospital,
      district: form.district,
      area: form.area,
      directions: form.directions,
      contactName: form.contactName,
      contactMethod: form.contactMethod,
      phone: form.phone,
      email: form.email,
      relationship: form.relationship,
      notes: form.notes,
      consentAccuracy: form.consentAccuracy,
      consentShare: form.consentShare,
      consentUpdates: form.consentUpdates,
    };
    const parsed = demoRequestInputSchema.safeParse(candidate);
    if (!parsed.success) {
      const mapped: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!mapped[key]) mapped[key] = issue.message;
      }
      setErrors(mapped);
      return null;
    }
    return parsed.data;
  }

  function submit() {
    if (!validateStep("review")) return;
    const input = inputFromForm();
    if (!input) return;
    if (initial) {
      const updated = updateDemoRequest(initial.reference, input);
      if (!updated) {
        setErrors({ form: dict.requestDemo.status.notFoundBody });
        return;
      }
      router.push(`${base}/request/status/${updated.reference}`);
      return;
    }
    const record = createDemoRequest(input);
    const stored = saveDemoRequest(record);
    setStorageFailed(!stored);
    setCreated(record);
    seedCoordination(record);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /** Hands the submitted request to the coordination demo (browser-local). */
  function seedCoordination(record: DemoRequest) {
    const location: LocationChoice = {
      provinceCode: form.province,
      districtCode: form.district,
      municipality: "",
      area: form.area,
      hospital: form.hospital,
      lat: null,
      lng: null,
      source: "manual",
    };
    updateCoordination({
      role: "requester",
      location,
      request: importDemoRequest(record, location),
    });
  }

  async function copyLink() {
    if (!created) return;
    const link = `${window.location.origin}${base}/request/status/${created.reference}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  if (created) {
    return (
      <div className="animate-soft-rise">
        <DemoBanner>{dict.requestDemo.demoNotice}</DemoBanner>
        <div className="card mt-4 p-6 sm:p-8">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-700">
            <CheckCircleIcon className="h-7 w-7" />
          </span>
          <h2 className="mt-4 text-2xl font-bold sm:text-3xl">
            {dict.requestDemo.confirmationTitle}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
            {dict.requestDemo.confirmationBody}
          </p>

          <div className="mt-5 rounded-xl border border-line bg-surface-muted p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              {dict.requestDemo.reference}
            </p>
            <p className="mt-1 font-mono text-xl font-bold tracking-wide">
              {created.reference}
            </p>
          </div>

          <h2 className="mt-6 text-lg font-semibold">{dict.requestDemo.nextStepsTitle}</h2>
          <ol className="mt-3 space-y-3 text-sm text-ink-soft">
            {[
              dict.requestDemo.nextStepOne,
              dict.requestDemo.nextStepTwo,
              dict.requestDemo.nextStepThree,
            ].map((item, index) => (
              <li key={item} className="flex gap-3">
                <span className="step-number">{index + 1}</span>
                <span className="pt-1.5 leading-relaxed">{item}</span>
              </li>
            ))}
          </ol>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Link className="button-primary" href={`${base}/request/status/${created.reference}`}>
              {dict.requestDemo.openStatus}
              <ArrowIcon className="h-4 w-4" />
            </Link>
            <Link className="button-secondary" href={`${base}/app/track`}>
              {dict.coord.home.trackCta}
            </Link>
            <button type="button" className="button-secondary" onClick={copyLink}>
              {copied ? dict.requestDemo.copied : dict.requestDemo.copyLink}
            </button>
          </div>

          {storageFailed ? (
            <div className="mt-4">
              <Callout tone="warning">{dict.requestDemo.status.notFoundBody}</Callout>
            </div>
          ) : null}

          <div className="mt-6 border-t border-line pt-4">
            <Link className="text-sm font-semibold text-brand-700 hover:underline" href={`${base}/request/new`}>
              {dict.requestDemo.newRequest}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <DemoBanner>{dict.requestDemo.demoNotice}</DemoBanner>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          {dict.common.stepOf
            .replace("{current}", String(stepIndex + 1))
            .replace("{total}", String(STEPS.length))}
        </p>
        <p className="text-xs font-semibold text-brand-700">{stepLabels[step]}</p>
      </div>
      <div className="progress-track mt-2" aria-hidden="true">
        <div
          className="progress-fill"
          style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
        />
      </div>
      <ol className="mt-3 hidden flex-wrap gap-2 sm:flex">
        {STEPS.map((item, index) => (
          <li key={item}>
            <button
              type="button"
              className="chip"
              data-active={index === stepIndex}
              aria-current={index === stepIndex ? "step" : undefined}
              onClick={() => {
                if (index < stepIndex) goToStep(index);
              }}
              disabled={index > stepIndex}
            >
              <span className="font-mono text-[0.7rem]">{index + 1}</span>
              {stepLabels[item]}
            </button>
          </li>
        ))}
      </ol>

      <form
        className="mt-5"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (step === "review") submit();
          else next();
        }}
      >
        <div className="card p-5 sm:p-6">
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="text-xl font-bold outline-none sm:text-2xl"
          >
            {step === "need"
              ? dict.requestDemo.needTitle
              : step === "location"
                ? dict.requestDemo.locationTitle
                : step === "contact"
                  ? dict.requestDemo.contactTitle
                  : dict.requestDemo.reviewTitle}
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">
            {step === "need"
              ? dict.requestDemo.needCopy
              : step === "location"
                ? dict.requestDemo.locationCopy
                : step === "contact"
                  ? dict.requestDemo.contactCopy
                  : dict.requestDemo.reviewCopy}
          </p>

          {errors.form ? (
            <div className="mt-4">
              <Callout tone="danger" role="alert">
                {errors.form}
              </Callout>
            </div>
          ) : null}

          {step === "need" ? (
            <div className="mt-5 space-y-5">
              <BloodGroupPicker
                value={form.bloodGroup}
                onChange={(value) => update("bloodGroup", value)}
                locale={locale}
                legend={dict.requestDemo.group}
                notSureLabel={dict.find.notSureLabel}
                error={errors.bloodGroup}
                hint={dict.requestDemo.groupNotSureHint}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="field">
                  <label className="label" htmlFor="component">
                    {dict.requestDemo.component}
                  </label>
                  <select
                    id="component"
                    className="input-base"
                    value={form.component}
                    onChange={(event) =>
                      update("component", event.target.value as BloodComponent)
                    }
                  >
                    {BLOOD_COMPONENTS.map((component) => (
                      <option key={component} value={component}>
                        {componentLabel(component, locale)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label className="label" htmlFor="units">
                    {dict.requestDemo.units}
                  </label>
                  <input
                    id="units"
                    type="number"
                    min={1}
                    max={10}
                    inputMode="numeric"
                    className={`input-base ${errors.units ? "input-error" : ""}`}
                    value={form.units}
                    onChange={(event) => update("units", event.target.value)}
                    aria-invalid={Boolean(errors.units)}
                    aria-describedby={errors.units ? "units-error" : "units-hint"}
                  />
                  <p id="units-hint" className="hint mt-1">
                    {dict.requestDemo.unitsHint}
                  </p>
                  {errors.units ? (
                    <p id="units-error" className="field-error mt-1" role="alert">
                      {errors.units}
                    </p>
                  ) : null}
                </div>
                <div className="field">
                  <label className="label" htmlFor="neededBy">
                    {dict.requestDemo.neededBy}
                  </label>
                  <input
                    id="neededBy"
                    type="datetime-local"
                    className={`input-base ${errors.neededBy ? "input-error" : ""}`}
                    value={form.neededBy}
                    onChange={(event) => update("neededBy", event.target.value)}
                    aria-invalid={Boolean(errors.neededBy)}
                    aria-describedby={errors.neededBy ? "neededBy-error" : undefined}
                  />
                  {errors.neededBy ? (
                    <p id="neededBy-error" className="field-error mt-1" role="alert">
                      {errors.neededBy}
                    </p>
                  ) : null}
                </div>
                <fieldset className="field" aria-describedby="urgency-hint">
                  <legend className="label">{dict.requestDemo.urgency}</legend>
                  <div className="mt-1 grid gap-2">
                    {URGENCY_VALUES.map((urgency) => (
                      <label key={urgency} className="choice-card items-start">
                        <input
                          type="radio"
                          name="urgency"
                          value={urgency}
                          checked={form.urgency === urgency}
                          onChange={() => update("urgency", urgency)}
                          className="mt-1 accent-brand-600"
                        />
                        <span>
                          <span className="block text-sm font-semibold">
                            {urgencyLabel(urgency, locale)}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                  <p id="urgency-hint" className="hint mt-1">
                    {dict.requestDemo.urgencyHint}
                  </p>
                </fieldset>
              </div>
            </div>
          ) : null}

          {step === "location" ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <LocationAssist
                  dict={dict}
                  onPick={(picked) =>
                    setForm((current) => ({
                      ...current,
                      province: picked.provinceCode,
                      district: picked.districtCode,
                      area: picked.area || current.area,
                    }))
                  }
                />
              </div>
              <div className="field sm:col-span-2">
                <label className="label" htmlFor="hospital">
                  {dict.requestDemo.hospital}
                </label>
                <input
                  id="hospital"
                  type="text"
                  className={`input-base ${errors.hospital ? "input-error" : ""}`}
                  placeholder={dict.requestDemo.hospitalPlaceholder}
                  value={form.hospital}
                  onChange={(event) => update("hospital", event.target.value)}
                  aria-invalid={Boolean(errors.hospital)}
                  aria-describedby={errors.hospital ? "hospital-error" : undefined}
                />
                {errors.hospital ? (
                  <p id="hospital-error" className="field-error mt-1" role="alert">
                    {errors.hospital}
                  </p>
                ) : null}
              </div>
              <div className="field">
                <label className="label" htmlFor="request-province">
                  {dict.requestDemo.province}
                </label>
                <select
                  id="request-province"
                  className="input-base"
                  value={form.province}
                  onChange={(event) => {
                    const province = event.target.value;
                    const first = DISTRICTS.find((item) => item.provinceCode === province);
                    setForm((current) => ({
                      ...current,
                      province,
                      district: first?.code ?? current.district,
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
                <label className="label" htmlFor="request-district">
                  {dict.requestDemo.district}
                </label>
                <select
                  id="request-district"
                  className="input-base"
                  value={form.district}
                  onChange={(event) => update("district", event.target.value)}
                >
                  {districts.map((district) => (
                    <option key={district.code} value={district.code}>
                      {locale === "ne" ? district.nameNe : district.nameEn}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="label" htmlFor="area">
                  {dict.requestDemo.area}
                </label>
                <input
                  id="area"
                  type="text"
                  className="input-base"
                  value={form.area}
                  onChange={(event) => update("area", event.target.value)}
                  aria-describedby="area-hint"
                />
                <p id="area-hint" className="hint mt-1">
                  {dict.requestDemo.areaHint}
                </p>
              </div>
              <div className="field">
                <label className="label" htmlFor="directions">
                  {dict.requestDemo.directions}
                </label>
                <input
                  id="directions"
                  type="text"
                  className="input-base"
                  value={form.directions}
                  onChange={(event) => update("directions", event.target.value)}
                  aria-describedby="directions-hint"
                />
                <p id="directions-hint" className="hint mt-1">
                  {dict.requestDemo.directionsHint}
                </p>
              </div>
            </div>
          ) : null}

          {step === "contact" ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="field">
                <label className="label" htmlFor="contactName">
                  {dict.requestDemo.name}
                </label>
                <input
                  id="contactName"
                  type="text"
                  autoComplete="name"
                  className={`input-base ${errors.contactName ? "input-error" : ""}`}
                  value={form.contactName}
                  onChange={(event) => update("contactName", event.target.value)}
                  aria-invalid={Boolean(errors.contactName)}
                  aria-describedby={errors.contactName ? "contactName-error" : undefined}
                />
                {errors.contactName ? (
                  <p id="contactName-error" className="field-error mt-1" role="alert">
                    {errors.contactName}
                  </p>
                ) : null}
              </div>

              <fieldset className="field">
                <legend className="label">{dict.requestDemo.contactMethod}</legend>
                <div className="mt-1 grid gap-2 sm:grid-cols-2">
                  {(["phone", "email"] as const).map((method) => (
                    <label key={method} className="choice-card items-center">
                      <input
                        type="radio"
                        name="contactMethod"
                        value={method}
                        checked={form.contactMethod === method}
                        onChange={() => update("contactMethod", method)}
                        className="accent-brand-600"
                      />
                      <span className="text-sm font-semibold">
                        {method === "phone" ? dict.common.phone : dict.common.email}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {form.contactMethod === "phone" ? (
                <div className="field">
                  <label className="label" htmlFor="phone">
                    {dict.requestDemo.phone}
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    className={`input-base ${errors.phone ? "input-error" : ""}`}
                    value={form.phone}
                    onChange={(event) => update("phone", event.target.value)}
                    aria-invalid={Boolean(errors.phone)}
                    aria-describedby={errors.phone ? "phone-error" : undefined}
                  />
                  {errors.phone ? (
                    <p id="phone-error" className="field-error mt-1" role="alert">
                      {errors.phone}
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="field">
                  <label className="label" htmlFor="email">
                    {dict.requestDemo.emailAddress}
                  </label>
                  <input
                    id="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    className={`input-base ${errors.email ? "input-error" : ""}`}
                    value={form.email}
                    onChange={(event) => update("email", event.target.value)}
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? "email-error" : undefined}
                  />
                  {errors.email ? (
                    <p id="email-error" className="field-error mt-1" role="alert">
                      {errors.email}
                    </p>
                  ) : null}
                </div>
              )}

              <div className="field">
                <label className="label" htmlFor="relationship">
                  {dict.requestDemo.relationship}
                </label>
                <select
                  id="relationship"
                  className="input-base"
                  value={form.relationship}
                  onChange={(event) =>
                    update("relationship", event.target.value as DemoRelationship | "")
                  }
                >
                  <option value="">{dict.common.choose}</option>
                  <option value="family">{dict.requestDemo.relationshipOptions.family}</option>
                  <option value="friend">{dict.requestDemo.relationshipOptions.friend}</option>
                  <option value="self">{dict.requestDemo.relationshipOptions.self}</option>
                  <option value="hospital">{dict.requestDemo.relationshipOptions.hospital}</option>
                  <option value="other">{dict.requestDemo.relationshipOptions.other}</option>
                </select>
              </div>

              <div className="field sm:col-span-2">
                <label className="label" htmlFor="notes">
                  {dict.requestDemo.notes}
                </label>
                <textarea
                  id="notes"
                  className="input-base min-h-24"
                  value={form.notes}
                  onChange={(event) => update("notes", event.target.value)}
                  aria-describedby="notes-hint"
                />
                <p id="notes-hint" className="hint mt-1">
                  {dict.requestDemo.notesHint}
                </p>
              </div>
            </div>
          ) : null}

          {step === "review" ? (
            <div className="mt-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <dl className="rounded-xl border border-line bg-surface-muted/50 p-4 text-sm">
                  <div className="flex justify-between gap-3 border-b border-line pb-2">
                    <dt className="text-muted">{dict.requestDemo.group}</dt>
                    <dd className="text-right font-semibold">
                      {form.bloodGroup === "not_sure"
                        ? dict.find.notSureLabel
                        : form.bloodGroup
                          ? bloodGroupLabel(form.bloodGroup, locale)
                          : "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 border-b border-line py-2">
                    <dt className="text-muted">{dict.requestDemo.component}</dt>
                    <dd className="text-right font-semibold">
                      {componentLabel(form.component, locale)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 border-b border-line py-2">
                    <dt className="text-muted">{dict.requestDemo.units}</dt>
                    <dd className="text-right font-semibold">{form.units}</dd>
                  </div>
                  <div className="flex justify-between gap-3 pt-2">
                    <dt className="text-muted">{dict.requestDemo.urgency}</dt>
                    <dd className="text-right font-semibold">
                      {urgencyLabel(form.urgency, locale)}
                    </dd>
                  </div>
                </dl>

                <dl className="rounded-xl border border-line bg-surface-muted/50 p-4 text-sm">
                  <div className="border-b border-line pb-2">
                    <dt className="text-muted">{dict.requestDemo.hospital}</dt>
                    <dd className="mt-0.5 font-semibold">{form.hospital || "—"}</dd>
                  </div>
                  <div className="border-b border-line py-2">
                    <dt className="text-muted">{dict.requestDemo.district}</dt>
                    <dd className="mt-0.5 font-semibold">
                      {DISTRICTS.find((district) => district.code === form.district)?.[
                        locale === "ne" ? "nameNe" : "nameEn"
                      ] ?? form.district}
                    </dd>
                  </div>
                  <div className="pt-2">
                    <dt className="text-muted">{dict.requestDemo.contactMethod}</dt>
                    <dd className="mt-0.5 font-semibold">
                      {form.contactMethod === "phone" ? form.phone : form.email}
                    </dd>
                  </div>
                </dl>
              </div>

              {form.bloodGroup === "not_sure" ? (
                <div className="mt-4">
                  <Callout tone="warning">{dict.requestDemo.groupNotSureHint}</Callout>
                </div>
              ) : null}

              <div className="mt-4 rounded-xl border border-line bg-surface p-4">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <LockIcon className="h-4 w-4 text-brand-600" />
                  {dict.requestDemo.privacyTitle}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                  {dict.requestDemo.privacyBody}
                </p>
              </div>

              <fieldset className="mt-5">
                <legend className="label">{dict.requestDemo.privacyTitle}</legend>
                <div className="mt-2 space-y-2">
                  <label className="choice-card items-start">
                    <input
                      id="consentAccuracy"
                      type="checkbox"
                      checked={form.consentAccuracy}
                      onChange={(event) => update("consentAccuracy", event.target.checked)}
                      className="mt-0.5 accent-brand-600"
                      aria-invalid={Boolean(errors.consentAccuracy)}
                    />
                    <span>
                      <span className="block text-sm font-semibold">
                        {dict.requestDemo.consentAccuracy}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted">
                        {dict.requestDemo.consentRequired}
                      </span>
                    </span>
                  </label>
                  {errors.consentAccuracy ? (
                    <p className="field-error" role="alert">
                      {errors.consentAccuracy}
                    </p>
                  ) : null}

                  <label className="choice-card items-start">
                    <input
                      id="consentShare"
                      type="checkbox"
                      checked={form.consentShare}
                      onChange={(event) => update("consentShare", event.target.checked)}
                      className="mt-0.5 accent-brand-600"
                      aria-invalid={Boolean(errors.consentShare)}
                    />
                    <span>
                      <span className="block text-sm font-semibold">
                        {dict.requestDemo.consentShare}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted">
                        {dict.requestDemo.consentRequired}
                      </span>
                    </span>
                  </label>
                  {errors.consentShare ? (
                    <p className="field-error" role="alert">
                      {errors.consentShare}
                    </p>
                  ) : null}

                  <label className="choice-card items-start">
                    <input
                      id="consentUpdates"
                      type="checkbox"
                      checked={form.consentUpdates}
                      onChange={(event) => update("consentUpdates", event.target.checked)}
                      className="mt-0.5 accent-brand-600"
                    />
                    <span>
                      <span className="block text-sm font-semibold">
                        {dict.requestDemo.consentUpdates}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted">
                        {dict.requestDemo.consentOptional}
                      </span>
                    </span>
                  </label>
                </div>
              </fieldset>
            </div>
          ) : null}

          <div className="mt-6 flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
            {stepIndex === 0 ? (
              <Link className="button-ghost" href={`${base}/find`}>
                {dict.requestDemo.backToFind}
              </Link>
            ) : (
              <button type="button" className="button-secondary" onClick={back}>
                {dict.common.back}
              </button>
            )}
            <div className="flex flex-col gap-2 sm:flex-row">
              {step === "review" ? (
                <button type="submit" className="button-primary">
                  {initial ? dict.requestDemo.updateRequest : dict.requestDemo.submit}
                  <ArrowIcon className="h-4 w-4" />
                </button>
              ) : (
                <button type="submit" className="button-primary">
                  {dict.common.continue}
                  <ArrowIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </form>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <p className="flex items-center gap-2 text-xs text-muted">
          <LockIcon className="h-4 w-4 shrink-0" />
          {dict.requestDemo.status.noPhone}
        </p>
        <p className="flex items-center gap-2 text-xs text-muted">
          <ClockIcon className="h-4 w-4 shrink-0" />
          {dict.common.demoMode}
        </p>
      </div>

      {form.bloodGroup === "not_sure" ? (
        <div className="mt-4">
          <Badge tone="amber">{dict.find.notSureLabel}</Badge>
        </div>
      ) : null}
    </div>
  );
}
