"use client";

import Link from "next/link";
import { useState } from "react";
import type { Dictionary } from "@/messages/en";
import type { Locale } from "@/lib/i18n";
import { bloodGroupLabel, componentLabel, urgencyLabel, type BloodComponent } from "@/lib/blood";
import { formatDate } from "@/lib/dates";
import { DEMO_CAMPS, DEMO_FACILITIES, DEMO_ORG_REQUESTS } from "@/mocks/fixtures";
import { districtName } from "@/lib/requests";
import { Badge, Callout, DemoBanner, EmptyState, Stat } from "../ui/ui";
import { ArrowIcon, BuildingIcon, CalendarIcon, CheckCircleIcon, PhoneIcon } from "../ui/icons";
import type { BadgeTone } from "../ui/ui";

type Row = {
  group: string;
  component: BloodComponent;
  units: number;
};

const facility = DEMO_FACILITIES[0]!;

const VERIFICATION_TONE: Record<string, BadgeTone> = {
  verified: "teal",
  pending: "amber",
  unverified: "neutral",
};

export function OrgDemoDashboard({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const base = `/${locale}`;
  const [rows, setRows] = useState<Row[]>(
    facility.inventory.map((row) => ({
      group: row.group,
      component: row.component,
      units: row.units,
    })),
  );
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const [camps, setCamps] = useState(
    DEMO_CAMPS.map((camp) => ({
      id: camp.id,
      title: camp.title,
      venue: camp.venue,
      startsAt: camp.startsAt,
    })),
  );
  const [campTitle, setCampTitle] = useState("");
  const [campVenue, setCampVenue] = useState("");
  const [campDate, setCampDate] = useState("");
  const [campNotice, setCampNotice] = useState("");

  const openRequests = DEMO_ORG_REQUESTS.filter((request) => request.status === "open");

  function saveInventory() {
    setError("");
    setSaved(false);
    if (!confirmed) {
      setError(dict.orgDemo.saveConfirmRequired);
      return;
    }
    if (rows.some((row) => !Number.isInteger(row.units) || row.units < 0 || row.units > 999)) {
      setError(dict.formErrors.units);
      return;
    }
    setSaved(true);
  }

  function addCamp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!campTitle.trim() || !campVenue.trim() || !campDate) {
      setCampNotice(dict.formErrors.required);
      return;
    }
    setCamps((current) => [
      {
        id: `camp-demo-local-${current.length + 1}`,
        title: campTitle.trim(),
        venue: campVenue.trim(),
        startsAt: new Date(`${campDate}T08:00:00Z`).toISOString(),
      },
      ...current,
    ]);
    setCampTitle("");
    setCampVenue("");
    setCampDate("");
    setCampNotice(dict.orgDemo.campCreated);
  }

  return (
    <div className="container-page max-w-5xl py-8">
      <DemoBanner>{dict.orgDemo.demoNotice}</DemoBanner>

      <div className="mt-4 flex flex-col gap-3 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow mb-2">{dict.orgDemo.eyebrow}</p>
          <h1 className="text-2xl font-bold sm:text-3xl">{dict.orgDemo.title}</h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">
            {dict.orgDemo.subtitle}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className="button-secondary" href={`${base}/for-organisations`}>
            {dict.orgDemo.requestAccess}
          </Link>
          <Link className="button-ghost" href={`${base}/org`}>
            {dict.orgDemo.openRealPortal}
          </Link>
        </div>
      </div>

      <nav className="mt-4 flex flex-wrap gap-2" aria-label={dict.orgDemo.title}>
        {[
          ["overview", dict.orgDemo.navOverview],
          ["inventory", dict.orgDemo.navInventory],
          ["requests", dict.orgDemo.navRequests],
          ["verification", dict.orgDemo.navVerification],
          ["camps", dict.orgDemo.navCamps],
        ].map(([id, label]) => (
          <a key={id} className="chip" href={`#org-${id}`}>
            {label}
          </a>
        ))}
      </nav>

      <section id="org-overview" className="mt-6 scroll-mt-24" aria-labelledby="org-overview-title">
        <div className="card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                <BuildingIcon className="h-6 w-6" />
              </span>
              <div>
                <h2 id="org-overview-title" className="text-lg font-bold">
                  {facility.name}
                </h2>
                <p className="text-sm text-muted">
                  {dict.orgDemo.bloodBank} · {districtName(facility.districtCode, locale)}
                </p>
                <p className="mt-1 text-sm text-ink-soft">{facility.address}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Badge tone="amber">{dict.common.demoData}</Badge>
              <Badge tone={VERIFICATION_TONE[facility.verification] ?? "neutral"}>
                {facility.verification === "verified"
                  ? dict.orgDemo.verificationVerified
                  : facility.verification === "pending"
                    ? dict.orgDemo.verificationPending
                    : dict.common.unverified}
              </Badge>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <p className="flex items-center gap-2 text-sm text-muted">
              <PhoneIcon className="h-4 w-4" />
              {facility.phone}
            </p>
            <p className="text-sm text-muted">{facility.email}</p>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted">{dict.orgDemo.profileBody}</p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Stat
            label={dict.orgDemo.freshCount}
            value={rows.filter((row) => row.units > 0).length}
            hint={dict.orgDemo.inventoryCopy}
          />
          <Stat label={dict.orgDemo.queueTitle} value={openRequests.length} />
          <Stat label={dict.orgDemo.campList} value={camps.length} />
        </div>
      </section>

      <section id="org-inventory" className="mt-8 scroll-mt-24" aria-labelledby="org-inventory-title">
        <h2 id="org-inventory-title" className="text-lg font-bold">
          {dict.orgDemo.inventoryTitle}
        </h2>
        <p className="mt-1 text-sm text-muted">{dict.orgDemo.inventoryCopy}</p>

        <div className="mt-3 overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="data-table min-w-[38rem]">
            <thead>
              <tr>
                <th scope="col">{dict.orgDemo.bloodGroup}</th>
                <th scope="col">{dict.orgDemo.component}</th>
                <th scope="col">{dict.orgDemo.units}</th>
                <th scope="col">{dict.orgDemo.status}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${row.group}-${row.component}-${index}`}>
                  <th scope="row" className="text-left">
                    {bloodGroupLabel(row.group as Parameters<typeof bloodGroupLabel>[0], locale)}
                  </th>
                  <td>
                    <select
                      className="input-base !min-h-0 !py-1 text-sm"
                      value={row.component}
                      onChange={(event) =>
                        setRows((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, component: event.target.value as BloodComponent }
                              : item,
                          ),
                        )
                      }
                      aria-label={dict.orgDemo.component}
                    >
                      {(["whole_blood", "prbc", "platelets", "plasma"] as const).map(
                        (component) => (
                          <option key={component} value={component}>
                            {componentLabel(component, locale)}
                          </option>
                        ),
                      )}
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      max={999}
                      className="input-base !min-h-0 w-24 !py-1 text-sm"
                      value={row.units}
                      onChange={(event) =>
                        setRows((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, units: Number(event.target.value) }
                              : item,
                          ),
                        )
                      }
                      aria-label={`${dict.orgDemo.units} ${bloodGroupLabel(row.group as Parameters<typeof bloodGroupLabel>[0], locale)}`}
                    />
                  </td>
                  <td>
                    <Badge tone={row.units > 0 ? "teal" : "amber"}>
                      {row.units > 0 ? dict.orgDemo.freshnessFresh : dict.orgDemo.freshnessStale}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <label className="choice-card mt-3 items-start">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => {
              setConfirmed(event.target.checked);
              setError("");
            }}
            className="mt-0.5 accent-brand-600"
          />
          <span className="text-sm leading-relaxed">{dict.orgDemo.confirmInventory}</span>
        </label>
        {error ? (
          <p className="field-error mt-1" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button type="button" className="button-primary" onClick={saveInventory}>
            {dict.orgDemo.saveDemo}
          </button>
          {saved ? (
            <span className="flex items-center gap-1.5 text-sm font-medium text-teal-700" role="status">
              <CheckCircleIcon className="h-4 w-4" />
              {dict.orgDemo.saved}
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted">{dict.orgDemo.inventoryNote}</p>
      </section>

      <section id="org-requests" className="mt-8 scroll-mt-24" aria-labelledby="org-requests-title">
        <h2 id="org-requests-title" className="text-lg font-bold">
          {dict.orgDemo.requestsTitle}
        </h2>
        <p className="mt-1 text-sm text-muted">{dict.orgDemo.requestsCopy}</p>

        {openRequests.length === 0 ? (
          <div className="mt-3">
            <EmptyState title={dict.orgDemo.queueEmpty} />
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="data-table min-w-[40rem]">
              <thead>
                <tr>
                  <th scope="col">{dict.orgDemo.bloodGroup}</th>
                  <th scope="col">{dict.orgDemo.component}</th>
                  <th scope="col">{dict.orgDemo.units}</th>
                  <th scope="col">{dict.orgDemo.urgency}</th>
                  <th scope="col">{dict.orgDemo.neededBy}</th>
                  <th scope="col">{dict.orgDemo.facility}</th>
                  <th scope="col">{dict.orgDemo.action}</th>
                </tr>
              </thead>
              <tbody>
                {openRequests.map((request) => (
                  <tr key={request.reference}>
                    <th scope="row" className="text-left font-mono text-xs">
                      {request.bloodGroup}
                    </th>
                    <td>{componentLabel(request.component, locale)}</td>
                    <td>{request.units}</td>
                    <td>
                      <Badge tone={request.urgency === "critical" ? "danger" : "amber"}>
                        {urgencyLabel(request.urgency, locale)}
                      </Badge>
                    </td>
                    <td>{formatDate(request.neededBy, locale)}</td>
                    <td>{request.facility}</td>
                    <td>
                      <Badge tone={request.responded ? "teal" : "neutral"}>
                        {request.responded ? dict.orgDemo.saved : dict.orgDemo.review}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section
        id="org-verification"
        className="mt-8 scroll-mt-24"
        aria-labelledby="org-verification-title"
      >
        <h2 id="org-verification-title" className="text-lg font-bold">
          {dict.orgDemo.verificationTitle}
        </h2>
        <div className="card mt-3 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={VERIFICATION_TONE[facility.verification] ?? "neutral"}>
              {facility.verification === "verified"
                ? dict.orgDemo.verificationVerified
                : dict.orgDemo.verificationPending}
            </Badge>
            <span className="text-xs text-muted">{formatDate(facility.lastUpdatedAt, locale)}</span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            {dict.orgDemo.verificationNote}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted">{dict.orgDemo.verificationCopy}</p>
        </div>
      </section>

      <section id="org-camps" className="mt-8 scroll-mt-24" aria-labelledby="org-camps-title">
        <h2 id="org-camps-title" className="text-lg font-bold">
          {dict.orgDemo.campsTitle}
        </h2>
        <p className="mt-1 text-sm text-muted">{dict.orgDemo.campsCopy}</p>

        <div className="mt-3 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="card p-4">
            <h3 className="text-sm font-semibold">{dict.orgDemo.campList}</h3>
            {camps.length === 0 ? (
              <p className="mt-2 text-sm text-muted">{dict.orgDemo.noCamps}</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {camps.map((camp) => (
                  <li key={camp.id} className="rounded-lg border border-line p-3 text-sm">
                    <p className="font-medium">{camp.title}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                      <CalendarIcon className="h-3.5 w-3.5" />
                      {formatDate(camp.startsAt, locale)} · {camp.venue}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <form className="card p-4" onSubmit={addCamp} noValidate>
            <h3 className="text-sm font-semibold">{dict.orgDemo.addCamp}</h3>
            <div className="mt-2 space-y-2">
              <div className="field">
                <label className="label" htmlFor="camp-title">
                  {dict.orgDemo.campTitle}
                </label>
                <input
                  id="camp-title"
                  className="input-base"
                  value={campTitle}
                  onChange={(event) => setCampTitle(event.target.value)}
                />
              </div>
              <div className="field">
                <label className="label" htmlFor="camp-venue">
                  {dict.orgDemo.campVenue}
                </label>
                <input
                  id="camp-venue"
                  className="input-base"
                  value={campVenue}
                  onChange={(event) => setCampVenue(event.target.value)}
                />
              </div>
              <div className="field">
                <label className="label" htmlFor="camp-date">
                  {dict.orgDemo.campDate}
                </label>
                <input
                  id="camp-date"
                  type="date"
                  className="input-base"
                  value={campDate}
                  onChange={(event) => setCampDate(event.target.value)}
                />
              </div>
            </div>
            <button type="submit" className="button-secondary mt-3 w-full">
              {dict.orgDemo.createCamp}
            </button>
            {campNotice ? (
              <p className="mt-2 text-xs text-muted" role="status">
                {campNotice}
              </p>
            ) : null}
          </form>
        </div>
      </section>

      <div className="mt-8">
        <Callout tone="warning">{dict.orgDemo.demoNotice}</Callout>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link className="button-secondary" href={`${base}/for-organisations`}>
          {dict.orgDemo.navBack}
          <ArrowIcon className="h-4 w-4" />
        </Link>
        <Link className="button-ghost" href={`${base}/admin/demo`}>
          {dict.adminDemo.title}
        </Link>
      </div>
    </div>
  );
}
