"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Dictionary } from "@/messages/en";
import type { Locale } from "@/lib/i18n";
import { format } from "@/lib/i18n";
import { bloodGroupLabel, urgencyLabel } from "@/lib/blood";
import { formatDate, relativeTime } from "@/lib/dates";
import { DEMO_ORG_REQUESTS } from "@/mocks/fixtures";
import {
  calculateProfileCompletion,
  deleteDemoDonor,
  readDemoDonor,
  readDemoResponses,
  saveDemoResponse,
  updateDemoDonor,
  type DemoDonor,
  type DemoDonorAvailability,
  type DemoDonorResponse,
} from "@/mocks/donor";
import { useDemoDataVersion } from "@/mocks/use-demo-data";
import { Badge, Callout, DemoBanner, EmptyState, LoadingBlock } from "../ui/ui";
import {
  CheckCircleIcon,
  HeartIcon,
  LockIcon,
  SettingsIcon,
  UsersIcon,
} from "../ui/icons";
import type { BadgeTone } from "../ui/ui";

const AVAILABILITY_TONE: Record<DemoDonorAvailability, BadgeTone> = {
  available: "teal",
  unavailable: "amber",
  paused: "neutral",
};

export function DemoDonorDashboard({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary;
}) {
  const version = useDemoDataVersion();
  if (version < 0) {
    return (
      <div className="container-page max-w-4xl py-8">
        <LoadingBlock label={dict.common.loading} rows={3} />
      </div>
    );
  }
  return <DemoDonorDashboardInner locale={locale} dict={dict} />;
}

function DemoDonorDashboardInner({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary;
}) {
  const base = `/${locale}`;
  const [donor, setDonor] = useState<DemoDonor | null>(() => readDemoDonor());
  const [availability, setAvailability] = useState<DemoDonorAvailability>(
    () => readDemoDonor()?.availability ?? "available",
  );
  const [channels, setChannels] = useState(
    () => readDemoDonor()?.channels ?? { sms: true, whatsapp: false, email: false },
  );
  const [visibility, setVisibility] = useState(() => readDemoDonor()?.visibility ?? false);
  const [consentAlerts, setConsentAlerts] = useState(
    () => readDemoDonor()?.consentAlerts ?? true,
  );
  const [responses, setResponses] = useState<DemoDonorResponse[]>(() => readDemoResponses());
  const [notice, setNotice] = useState<{ tone: "success" | "warning" | "danger"; message: string } | null>(
    null,
  );
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const completion = useMemo(
    () => (donor ? calculateProfileCompletion(donor) : 0),
    [donor],
  );

  const openRequests = useMemo(
    () => DEMO_ORG_REQUESTS.filter((request) => request.status === "open"),
    [],
  );

  const responseFor = useMemo(() => {
    const map = new Map<string, DemoDonorResponse>();
    for (const item of responses) map.set(item.reference, item);
    return map;
  }, [responses]);

  function labelForAvailability(value: DemoDonorAvailability): string {
    return value === "available"
      ? dict.donorDemo.available
      : value === "unavailable"
        ? dict.donorDemo.unavailable
        : dict.donorDemo.paused;
  }

  function saveSettings() {
    setError("");
    setNotice(null);
    const hasChannel = channels.sms || channels.whatsapp || channels.email;
    if (consentAlerts && !hasChannel) {
      setError(dict.donorDemo.noChannel);
      return;
    }
    if (consentAlerts && !donor?.phone && !donor?.email) {
      setError(dict.donorDemo.addContact);
      return;
    }
    const updated = updateDemoDonor({
      availability,
      channels,
      visibility,
      consentAlerts,
    });
    if (!updated) {
      setError(dict.donorDemo.noProfileBody);
      return;
    }
    setDonor(updated);
    setNotice({ tone: "success", message: dict.donorDemo.saved });
  }

  function respond(reference: string, response: DemoDonorResponse["response"]) {
    setResponses(saveDemoResponse(reference, response));
    setNotice({ tone: "success", message: dict.donorDemo.responseSaved });
  }

  function removeProfile() {
    deleteDemoDonor();
    setDonor(null);
    setConfirmDelete(false);
    setNotice({ tone: "warning", message: dict.donorDemo.profileDeleted });
  }

  if (!donor) {
    return (
      <div className="container-page max-w-3xl py-8">
        <DemoBanner>{dict.donorDemo.demoNotice}</DemoBanner>
        {notice ? (
          <div className="mt-4">
            <Callout tone={notice.tone} role="status">
              {notice.message}
            </Callout>
          </div>
        ) : null}
        <div className="mt-4">
          <EmptyState title={dict.donorDemo.noProfileTitle} icon={<UsersIcon className="h-7 w-7" />}>
            <p>{dict.donorDemo.noProfileBody}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Link className="button-primary" href={`${base}/donor/demo/register`}>
                {dict.donorDemo.start}
              </Link>
              <Link className="button-secondary" href={`${base}/donor/demo`}>
                {dict.donorDemo.title}
              </Link>
            </div>
          </EmptyState>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page max-w-5xl py-8">
      <DemoBanner>{dict.donorDemo.demoNotice}</DemoBanner>

      <div className="mt-4 flex flex-col gap-3 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow mb-2">{dict.donorDemo.eyebrow}</p>
          <h1 className="text-2xl font-bold sm:text-3xl">
            {format(dict.donorDemo.welcome, { name: donor.name })}
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">
            {dict.donorDemo.dashboardSubtitle}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className="button-secondary" href={`${base}/find`}>
            {dict.nav.findBlood}
          </Link>
          <Link className="button-primary" href={`${base}/donor/demo/register`}>
            {dict.donorDemo.start}
          </Link>
        </div>
      </div>

      {notice ? (
        <div className="mt-4">
          <Callout tone={notice.tone} role="status">
            {notice.message}
          </Callout>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        <Badge tone={AVAILABILITY_TONE[donor.availability]}>
          {labelForAvailability(donor.availability)}
        </Badge>
        <Badge tone="brand">
          {donor.bloodGroup === "not_sure"
            ? dict.find.notSureLabel
            : bloodGroupLabel(donor.bloodGroup, locale)}
        </Badge>
        <Badge>{dict.donorDemo.district}</Badge>
      </div>

      <section className="mt-5 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="card p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{dict.donorDemo.profileCompletion}</h2>
            <span className="text-sm font-semibold text-brand-700">
              {format(dict.donorDemo.complete, { percent: completion })}
            </span>
          </div>
          <div className="progress-track mt-3" aria-hidden="true">
            <div className="progress-fill" style={{ width: `${completion}%` }} />
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            {dict.donorDemo.completionHint}
          </p>

          <dl className="mt-4 grid gap-2 text-sm">
            <div className="flex justify-between gap-3 border-b border-line pb-2">
              <dt className="text-muted">{dict.donorDemo.contactPreference}</dt>
              <dd className="text-right font-medium">
                {[
                  donor.channels.sms ? dict.donorDemo.channelSms : null,
                  donor.channels.whatsapp ? dict.donorDemo.channelWhatsapp : null,
                  donor.channels.email ? dict.donorDemo.channelEmail : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-3 border-b border-line pb-2">
              <dt className="text-muted">{dict.donorDemo.availability}</dt>
              <dd className="text-right font-medium">
                {format(dict.donorDemo.availabilityUpdated, {
                  time: relativeTime(donor.availabilityUpdatedAt, new Date(), locale),
                })}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">{dict.donorDemo.privacyCard}</dt>
              <dd className="text-right font-medium">
                {donor.visibility ? dict.donorDemo.visibilityLabel : dict.donorDemo.visibilityOff}
              </dd>
            </div>
          </dl>

          <div className="mt-4 rounded-xl border border-line bg-surface-muted/60 p-3 text-xs leading-relaxed text-muted">
            {dict.donorDemo.privacyBody}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <SettingsIcon className="h-5 w-5 text-brand-600" />
            {dict.donorDemo.settingsTitle}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            {dict.donorDemo.settingsBody}
          </p>

          <fieldset className="mt-4">
            <legend className="label">{dict.donorDemo.availability}</legend>
            <div className="mt-1 grid gap-2">
              {(["available", "unavailable", "paused"] as const).map((option) => (
                <label key={option} className="choice-card items-center">
                  <input
                    type="radio"
                    name="demo-availability"
                    value={option}
                    checked={availability === option}
                    onChange={() => setAvailability(option)}
                    className="accent-brand-600"
                  />
                  <span className="text-sm font-semibold">{labelForAvailability(option)}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-4">
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
                    checked={channels[key]}
                    onChange={(event) =>
                      setChannels((current) => ({ ...current, [key]: event.target.checked }))
                    }
                    className="accent-brand-600"
                  />
                  <span className="text-sm font-semibold">{label}</span>
                </label>
              ))}
            </div>
            {error ? (
              <p className="field-error mt-1" role="alert">
                {error}
              </p>
            ) : null}
          </fieldset>

          <div className="mt-4 space-y-2">
            <label className="choice-card items-start">
              <input
                type="checkbox"
                checked={consentAlerts}
                onChange={(event) => setConsentAlerts(event.target.checked)}
                className="mt-0.5 accent-brand-600"
              />
              <span>
                <span className="block text-sm font-semibold">
                  {dict.donorDemo.consentAlerts}
                </span>
                <span className="mt-0.5 block text-xs text-muted">
                  {dict.donorDemo.required}
                </span>
              </span>
            </label>
            <label className="choice-card items-start">
              <input
                type="checkbox"
                checked={visibility}
                onChange={(event) => setVisibility(event.target.checked)}
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
          </div>

          {!consentAlerts ? (
            <div className="mt-3">
              <Callout tone="warning">{dict.donorDemo.withdrawalNote}</Callout>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button type="button" className="button-primary" onClick={saveSettings}>
              {dict.donorDemo.save}
            </button>
            <span className="text-xs text-muted">{dict.donorDemo.saveNote}</span>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]" aria-labelledby="demo-invitations">
        <div className="card p-5">
          <h2 id="demo-invitations" className="flex items-center gap-2 text-lg font-semibold">
            <HeartIcon className="h-5 w-5 text-brand-600" />
            {dict.donorDemo.recentRequests}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            {dict.donorDemo.dashboardDemoNote}
          </p>

          {openRequests.length === 0 ? (
            <div className="mt-3">
              <EmptyState title={dict.donorDemo.recentRequestsEmpty} />
            </div>
          ) : (
            <ul className="mt-3 space-y-3">
              {openRequests.map((request) => {
                const response = responseFor.get(request.reference);
                return (
                  <li key={request.reference} className="rounded-xl border border-line p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={request.urgency === "critical" ? "danger" : "amber"}>
                        {urgencyLabel(request.urgency, locale)}
                      </Badge>
                      <span className="font-semibold">
                        {bloodGroupLabel(request.bloodGroup, locale)}
                      </span>
                      <span className="text-sm text-muted">
                        {request.units} {locale === "ne" ? "युनिट" : request.units === 1 ? "unit" : "units"}
                      </span>
                      <span className="ml-auto font-mono text-xs text-muted">
                        {request.reference}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-medium">{request.facility}</p>
                    <p className="text-xs text-muted">
                      {dict.donorDemo.detailsNeededBy}: {formatDate(request.neededBy, locale)}
                    </p>

                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm font-semibold text-brand-700">
                        {dict.donorDemo.viewDetails}
                      </summary>
                      <div className="mt-2 rounded-lg bg-surface-muted p-3 text-sm">
                        <dl className="grid gap-1.5 sm:grid-cols-2">
                          <div>
                            <dt className="text-xs text-muted">{dict.donorDemo.detailsFacility}</dt>
                            <dd className="font-medium">{request.facility}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-muted">{dict.donorDemo.detailsUnits}</dt>
                            <dd className="font-medium">{request.units}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-muted">{dict.donorDemo.detailsNeededBy}</dt>
                            <dd className="font-medium">{formatDate(request.neededBy, locale)}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-muted">{dict.donorDemo.detailsUrgency}</dt>
                            <dd className="font-medium">{urgencyLabel(request.urgency, locale)}</dd>
                          </div>
                        </dl>
                        <p className="mt-2 text-xs text-muted">{dict.donorDemo.inviteNote}</p>

                        {response ? (
                          <p className="mt-2 flex items-start gap-1.5 text-xs text-teal-700">
                            <CheckCircleIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            {format(dict.donorDemo.respondedOn, {
                              response:
                                response.response === "interested"
                                  ? dict.donorDemo.responseInterested
                                  : dict.donorDemo.responseDeclined,
                              date: formatDate(response.at, locale),
                            })}
                          </p>
                        ) : (
                          <div className="mt-2 flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="button-primary !min-h-0 !py-1.5 text-sm"
                              onClick={() => respond(request.reference, "interested")}
                            >
                              {dict.donorDemo.respondInterested}
                            </button>
                            <button
                              type="button"
                              className="button-secondary !min-h-0 !py-1.5 text-sm"
                              onClick={() => respond(request.reference, "declined")}
                            >
                              {dict.donorDemo.respondDeclined}
                            </button>
                          </div>
                        )}
                      </div>
                    </details>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <h2 className="text-lg font-semibold">{dict.donorDemo.responseHistory}</h2>
            {responses.length === 0 ? (
              <div className="mt-3">
                <EmptyState title={dict.donorDemo.responseHistoryEmpty} />
              </div>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {responses.map((response) => (
                  <li
                    key={response.reference}
                    className="flex items-start justify-between gap-2 border-b border-line pb-2 last:border-0 last:pb-0"
                  >
                    <div>
                      <p className="font-mono text-xs text-muted">{response.reference}</p>
                      <p className="font-medium">
                        {response.response === "interested"
                          ? dict.donorDemo.responseInterested
                          : dict.donorDemo.responseDeclined}
                      </p>
                    </div>
                    <span className="text-xs text-muted">{formatDate(response.at, locale)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card p-5">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <LockIcon className="h-5 w-5 text-brand-600" />
              {dict.donorDemo.privacyCard}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              {dict.donorDemo.privacyBody}
            </p>
            <ul className="mt-3 space-y-1.5 text-sm text-ink-soft">
              <li>{dict.donorDemo.benefitTwo}</li>
              <li>{dict.donorDemo.availabilityOnly}</li>
              <li>{dict.donorDemo.noRealMessage}</li>
            </ul>
          </div>

          <div className="card p-5">
            <h2 className="text-lg font-semibold">{dict.donorDemo.reset}</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              {dict.donorDemo.saveNote}
            </p>
            {confirmDelete ? (
              <div className="mt-3 rounded-xl border border-danger-700/20 bg-danger-50 p-3">
                <p className="text-sm font-semibold text-danger-700">
                  {dict.donorDemo.resetConfirm}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" className="button-danger" onClick={removeProfile}>
                    {dict.donorDemo.reset}
                  </button>
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => setConfirmDelete(false)}
                  >
                    {dict.common.cancel}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="button-secondary mt-3"
                onClick={() => setConfirmDelete(true)}
              >
                {dict.donorDemo.reset}
              </button>
            )}
          </div>
        </div>
      </section>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link className="button-secondary" href={`${base}/donor/demo`}>
          {dict.donorDemo.title}
        </Link>
        <Link className="button-ghost" href={`${base}/learn/faq`}>
          {dict.help.faqCta}
        </Link>
      </div>
    </div>
  );
}
