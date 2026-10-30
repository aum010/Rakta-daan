"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import type { Dictionary } from "@/messages/en";
import type { Locale } from "@/lib/i18n";
import { DISTRICTS, PROVINCES } from "@/data/geography";
import { BloodGroupPicker, type BloodGroupChoice } from "../blood-search/blood-group-picker";
import { Callout, DemoBanner } from "../ui/ui";
import { ArrowIcon, CheckCircleIcon, LockIcon, ShieldIcon } from "../ui/icons";
import {
  createDemoDonor,
  demoDonorInputSchema,
  saveDemoDonor,
  type DemoDonorAvailability,
  type DemoDonorInput,
} from "@/mocks/donor";

type Step = "about" | "availability" | "consent";
const STEPS: Step[] = ["about", "availability", "consent"];

type FormState = {
  name: string;
  bloodGroup: BloodGroupChoice;
  province: string;
  district: string;
  availability: DemoDonorAvailability;
  channels: { sms: boolean; whatsapp: boolean; email: boolean };
  phone: string;
  email: string;
  consentAlerts: boolean;
  consentContact: boolean;
  consentTerms: boolean;
  visibility: boolean;
};

function initialState(): FormState {
  return {
    name: "",
    bloodGroup: "",
    province: "P3",
    district: "KTM",
    availability: "available",
    channels: { sms: true, whatsapp: false, email: false },
    phone: "",
    email: "",
    consentAlerts: false,
    consentContact: false,
    consentTerms: false,
    visibility: false,
  };
}

export function DemoDonorRegistration({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary;
}) {
  const base = `/${locale}`;
  const [form, setForm] = useState<FormState>(initialState);
  const [stepIndex, setStepIndex] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const [storageFailed, setStorageFailed] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const step = STEPS[stepIndex] ?? "about";

  const districts = useMemo(
    () => DISTRICTS.filter((district) => district.provinceCode === form.province),
    [form.province],
  );

  const stepLabels: Record<Step, string> = {
    about: dict.donorDemo.stepAbout,
    availability: dict.donorDemo.stepAvailability,
    consent: dict.donorDemo.stepConsent,
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

  function validate(target: Step): boolean {
    const next: Record<string, string> = {};
    if (target === "about") {
      if (form.name.trim().length < 2) next.name = dict.formErrors.name;
      if (!form.bloodGroup) next.bloodGroup = dict.formErrors.chooseGroup;
      if (!form.district) next.district = dict.formErrors.required;
    }
    if (target === "availability") {
      const { sms, whatsapp, email } = form.channels;
      if (!sms && !whatsapp && !email) next.channels = dict.donorDemo.noChannel;
      if ((sms || whatsapp) && !/^[+\d][\d\s-]{6,23}$/.test(form.phone)) {
        next.phone = dict.formErrors.phone;
      }
      if (email && form.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) {
        next.email = dict.formErrors.email;
      }
    }
    if (target === "consent") {
      if (!form.consentAlerts) next.consentAlerts = dict.formErrors.consent;
      if (!form.consentContact) next.consentContact = dict.formErrors.consent;
      if (!form.consentTerms) next.consentTerms = dict.formErrors.consent;
    }
    setErrors(next);
    if (Object.keys(next).length > 0) {
      document.getElementById(Object.keys(next)[0] ?? "")?.focus();
      return false;
    }
    return true;
  }

  function next() {
    if (!validate(step)) return;
    goToStep(Math.min(stepIndex + 1, STEPS.length - 1));
  }

  function back() {
    setErrors({});
    goToStep(Math.max(stepIndex - 1, 0));
  }

  function submit() {
    if (!validate("consent")) return;
    const input = inputFromForm();
    if (!input) return;
    const parsed = demoDonorInputSchema.safeParse(input);
    if (!parsed.success) {
      const mapped: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!mapped[key]) mapped[key] = issue.message;
      }
      setErrors(mapped);
      return;
    }
    const donor = createDemoDonor(parsed.data);
    const stored = saveDemoDonor(donor);
    setStorageFailed(!stored);
    setDone(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function inputFromForm(): DemoDonorInput {
    return {
      name: form.name,
      bloodGroup: form.bloodGroup as DemoDonorInput["bloodGroup"],
      district: form.district,
      availability: form.availability,
      channels: form.channels,
      phone: form.phone,
      email: form.email,
      consentAlerts: form.consentAlerts,
      consentContact: form.consentContact,
      consentTerms: form.consentTerms,
      visibility: form.visibility,
    };
  }

  if (done) {
    return (
      <div className="animate-soft-rise">
        <DemoBanner>{dict.donorDemo.demoNotice}</DemoBanner>
        <div className="card mt-4 p-6 sm:p-8">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-700">
            <CheckCircleIcon className="h-7 w-7" />
          </span>
          <h2 className="mt-4 text-2xl font-bold">{dict.donorDemo.successTitle}</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
            {dict.donorDemo.successBody}
          </p>
          {storageFailed ? (
            <div className="mt-4">
              <Callout tone="warning">{dict.donorDemo.noProfileBody}</Callout>
            </div>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-2">
            <Link className="button-primary" href={`${base}/donor/demo/dashboard`}>
              {dict.donorDemo.openDashboard}
              <ArrowIcon className="h-4 w-4" />
            </Link>
            <Link className="button-secondary" href={`${base}/donor/demo`}>
              {dict.donorDemo.title}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <DemoBanner>{dict.donorDemo.demoNotice}</DemoBanner>

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

      <form
        className="mt-5"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (step === "consent") submit();
          else next();
        }}
      >
        <div className="card p-5 sm:p-6">
          <h2 ref={headingRef} tabIndex={-1} className="text-xl font-bold outline-none">
            {step === "about"
              ? dict.donorDemo.stepAbout
              : step === "availability"
                ? dict.donorDemo.stepAvailability
                : dict.donorDemo.stepConsent}
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">
            {step === "about"
              ? dict.donorDemo.registerSubtitle
              : step === "availability"
                ? dict.donorDemo.channelNote
                : dict.donorDemo.reviewBody}
          </p>

          {step === "about" ? (
            <div className="mt-5 space-y-5">
              <div className="field">
                <label className="label" htmlFor="donor-name">
                  {dict.donorDemo.name}
                </label>
                <input
                  id="donor-name"
                  type="text"
                  autoComplete="name"
                  className={`input-base ${errors.name ? "input-error" : ""}`}
                  value={form.name}
                  onChange={(event) => update("name", event.target.value)}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? "donor-name-error" : undefined}
                />
                {errors.name ? (
                  <p id="donor-name-error" className="field-error mt-1" role="alert">
                    {errors.name}
                  </p>
                ) : null}
              </div>

              <BloodGroupPicker
                value={form.bloodGroup}
                onChange={(value) => update("bloodGroup", value)}
                locale={locale}
                legend={dict.donorDemo.bloodGroup}
                notSureLabel={dict.find.notSureLabel}
                error={errors.bloodGroup}
                hint={dict.donorDemo.groupHint}
                name="donorBloodGroup"
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="field">
                  <label className="label" htmlFor="donor-province">
                    {dict.donorDemo.province}
                  </label>
                  <select
                    id="donor-province"
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
                  <label className="label" htmlFor="donor-district">
                    {dict.donorDemo.district}
                  </label>
                  <select
                    id="donor-district"
                    className="input-base"
                    value={form.district}
                    onChange={(event) => update("district", event.target.value)}
                    aria-describedby="donor-district-hint"
                  >
                    {districts.map((district) => (
                      <option key={district.code} value={district.code}>
                        {locale === "ne" ? district.nameNe : district.nameEn}
                      </option>
                    ))}
                  </select>
                  <p id="donor-district-hint" className="hint mt-1">
                    {dict.donorDemo.districtHint}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {step === "availability" ? (
            <div className="mt-5 space-y-5">
              <fieldset>
                <legend className="label">{dict.donorDemo.availability}</legend>
                <div className="mt-1 grid gap-2">
                  {(["available", "unavailable", "paused"] as const).map((option) => (
                    <label key={option} className="choice-card items-start">
                      <input
                        type="radio"
                        name="availability"
                        value={option}
                        checked={form.availability === option}
                        onChange={() => update("availability", option)}
                        className="mt-0.5 accent-brand-600"
                      />
                      <span>
                        <span className="block text-sm font-semibold">
                          {option === "available"
                            ? dict.donorDemo.available
                            : option === "unavailable"
                              ? dict.donorDemo.unavailable
                              : dict.donorDemo.paused}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
                <p className="hint mt-1">{dict.donorDemo.availabilityNote}</p>
              </fieldset>

              <fieldset>
                <legend className="label">{dict.donorDemo.channels}</legend>
                <div className="mt-1 grid gap-2 sm:grid-cols-3">
                  {(
                    [
                      ["sms", dict.donorDemo.channelSms],
                      ["whatsapp", dict.donorDemo.channelWhatsapp],
                      ["email", dict.donorDemo.channelEmail],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="choice-card items-center">
                      <input
                        type="checkbox"
                        checked={form.channels[key]}
                        onChange={(event) =>
                          update("channels", { ...form.channels, [key]: event.target.checked })
                        }
                        className="accent-brand-600"
                      />
                      <span className="text-sm font-semibold">{label}</span>
                    </label>
                  ))}
                </div>
                {errors.channels ? (
                  <p className="field-error mt-1" role="alert">
                    {errors.channels}
                  </p>
                ) : null}
                <p className="hint mt-1">{dict.donorDemo.channelNote}</p>
              </fieldset>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="field">
                  <label className="label" htmlFor="donor-phone">
                    {dict.common.phone}
                  </label>
                  <input
                    id="donor-phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    className={`input-base ${errors.phone ? "input-error" : ""}`}
                    value={form.phone}
                    onChange={(event) => update("phone", event.target.value)}
                    aria-invalid={Boolean(errors.phone)}
                    aria-describedby={errors.phone ? "donor-phone-error" : undefined}
                  />
                  {errors.phone ? (
                    <p id="donor-phone-error" className="field-error mt-1" role="alert">
                      {errors.phone}
                    </p>
                  ) : null}
                </div>
                <div className="field">
                  <label className="label" htmlFor="donor-email">
                    {dict.common.email}
                  </label>
                  <input
                    id="donor-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    className={`input-base ${errors.email ? "input-error" : ""}`}
                    value={form.email}
                    onChange={(event) => update("email", event.target.value)}
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? "donor-email-error" : undefined}
                  />
                  {errors.email ? (
                    <p id="donor-email-error" className="field-error mt-1" role="alert">
                      {errors.email}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-xl border border-line bg-surface-muted/60 p-4 text-sm">
                <p className="flex items-center gap-2 font-semibold">
                  <LockIcon className="h-4 w-4 text-brand-600" />
                  {dict.donorDemo.privacyTitle}
                </p>
                <p className="mt-1 text-ink-soft">{dict.donorDemo.privacyBody}</p>
              </div>
            </div>
          ) : null}

          {step === "consent" ? (
            <div className="mt-5 space-y-3">
              {(
                [
                  ["consentAlerts", dict.donorDemo.consentAlerts],
                  ["consentContact", dict.donorDemo.consentContact],
                  ["consentTerms", dict.donorDemo.consentTerms],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <label className="choice-card items-start">
                    <input
                      id={key}
                      type="checkbox"
                      checked={form[key]}
                      onChange={(event) => update(key, event.target.checked)}
                      className="mt-0.5 accent-brand-600"
                      aria-invalid={Boolean(errors[key])}
                    />
                    <span>
                      <span className="block text-sm font-semibold">{label}</span>
                      <span className="mt-0.5 block text-xs text-muted">
                        {dict.donorDemo.required}
                      </span>
                    </span>
                  </label>
                  {errors[key] ? (
                    <p className="field-error mt-1" role="alert">
                      {errors[key]}
                    </p>
                  ) : null}
                </div>
              ))}

              <label className="choice-card items-start">
                <input
                  type="checkbox"
                  checked={form.visibility}
                  onChange={(event) => update("visibility", event.target.checked)}
                  className="mt-0.5 accent-brand-600"
                />
                <span>
                  <span className="block text-sm font-semibold">
                    {dict.donorDemo.visibilityLabel}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {dict.donorDemo.optional}
                  </span>
                </span>
              </label>

              <div className="rounded-xl border border-line bg-surface-muted/60 p-4 text-sm">
                <p className="flex items-center gap-2 font-semibold">
                  <ShieldIcon className="h-4 w-4 text-teal-700" />
                  {dict.donorDemo.privacyCheck}
                </p>
                <ul className="mt-2 space-y-1 text-ink-soft">
                  <li>{dict.donorDemo.noRealMessage}</li>
                  <li>{dict.donorDemo.availabilityOnly}</li>
                  <li>{dict.donorDemo.benefitTwo}</li>
                </ul>
              </div>

              <p className="text-xs leading-relaxed text-muted">{dict.donorDemo.reviewBody}</p>
            </div>
          ) : null}

          <div className="mt-6 flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
            {stepIndex === 0 ? (
              <Link className="button-ghost" href={`${base}/donor/demo`}>
                {dict.donorDemo.title}
              </Link>
            ) : (
              <button type="button" className="button-secondary" onClick={back}>
                {dict.common.back}
              </button>
            )}
            {step === "consent" ? (
              <button type="submit" className="button-primary">
                {dict.donorDemo.submit}
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
      </form>
    </div>
  );
}
