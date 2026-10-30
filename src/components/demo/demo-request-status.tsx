"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Dictionary } from "@/messages/en";
import type { Locale } from "@/lib/i18n";
import {
  bloodGroupLabel,
  componentLabel,
  urgencyLabel,
} from "@/lib/blood";
import { formatDateTime, relativeTime } from "@/lib/dates";
import { DISTRICT_BY_CODE } from "@/data/geography";
import {
  getDemoRequest,
  recordDemoRequestView,
  setDemoRequestStatus,
  type DemoRequest,
} from "@/mocks/request";
import { isValidDemoReference, normalizeDemoReference } from "@/mocks/id";
import {
  notifyDemoDataChanged,
  useDemoDataVersion,
} from "@/mocks/use-demo-data";
import { Badge, Callout, DemoBanner, LoadingBlock, PageHeader } from "../ui/ui";
import { CheckCircleIcon, ClockIcon, InfoIcon, LockIcon, SearchIcon } from "../ui/icons";
import type { BadgeTone } from "../ui/ui";

const STATUS_TONE: Record<DemoRequest["status"], BadgeTone> = {
  open: "brand",
  fulfilled: "teal",
  cancelled: "neutral",
  expired: "amber",
};

export function DemoRequestStatus({
  locale,
  dict,
  reference,
}: {
  locale: Locale;
  dict: Dictionary;
  reference: string;
}) {
  const base = `/${locale}`;
  const version = useDemoDataVersion();
  const loaded = version >= 0;
  const record = loaded ? getDemoRequest(reference) : null;
  const [copied, setCopied] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [notice, setNotice] = useState("");
  const viewRecorded = useRef(false);

  useEffect(() => {
    if (!loaded || viewRecorded.current) return;
    viewRecorded.current = true;
    const found = getDemoRequest(reference);
    if (!found) return;
    const updated = recordDemoRequestView(found.reference);
    if (updated) notifyDemoDataChanged();
  }, [loaded, reference]);

  const safeLink = useMemo(() => {
    if (typeof window === "undefined") return `/request/status/${reference}`;
    return `${window.location.origin}${base}/request/status/${record?.reference ?? reference}`;
  }, [base, record?.reference, reference]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(safeLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  function cancelRequest() {
    if (!record) return;
    const updated = setDemoRequestStatus(record.reference, "cancelled");
    if (updated) {
      notifyDemoDataChanged();
      setNotice(dict.requestDemo.cancelled);
    }
    setConfirmCancel(false);
  }

  if (!loaded) {
    return (
      <div className="container-page max-w-3xl py-8">
        <LoadingBlock label={dict.common.loading} rows={2} />
      </div>
    );
  }

  if (!record) {
    return (
      <div className="container-page max-w-3xl py-8">
        <DemoBanner>{dict.requestDemo.demoNotice}</DemoBanner>
        <div className="mt-4">
          <PageHeader
            title={dict.requestDemo.status.notFoundTitle}
            subtitle={dict.requestDemo.status.notFoundBody}
            breadcrumbs={[
              { href: base, label: dict.common.appName },
              { href: `${base}/request/new`, label: dict.nav.requestBlood },
              { href: `${base}/request/status/${reference}`, label: dict.requestDemo.status.title },
            ]}
          />
        </div>
        <div className="card mt-5 max-w-lg p-5">
          <h2 className="text-lg font-semibold">{dict.requestDemo.status.lookupTitle}</h2>
          <p className="mt-1 text-sm text-muted">{dict.requestDemo.status.lookupHint}</p>
          <LookupForm locale={locale} dict={dict} />
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link className="button-primary" href={`${base}/request/new`}>
            {dict.requestDemo.title}
          </Link>
          <Link className="button-secondary" href={`${base}/find`}>
            {dict.find.title}
          </Link>
        </div>
      </div>
    );
  }

  const district = DISTRICT_BY_CODE.get(record.district);
  const timeline = record.timeline.slice(-8).reverse();
  const timelineLabel: Record<string, string> = {
    created: dict.requestDemo.status.timelineCreated,
    viewed: dict.requestDemo.status.timelineViewed,
    updated: dict.requestDemo.status.timelineUpdated,
    cancelled: dict.requestDemo.status.timelineCancelled,
  };

  return (
    <div className="container-page max-w-4xl py-8">
      <DemoBanner>{dict.requestDemo.demoNotice}</DemoBanner>

      <div className="mt-4">
        <PageHeader
          eyebrow={dict.requestDemo.status.demo}
          title={dict.requestDemo.status.title}
          subtitle={dict.requestDemo.status.subtitle}
          breadcrumbs={[
            { href: base, label: dict.common.appName },
            { href: `${base}/request/new`, label: dict.nav.requestBlood },
            { href: `${base}/request/status/${record.reference}`, label: record.reference },
          ]}
          actions={
            <>
              {record.status === "open" ? (
                <Link
                  className="button-secondary"
                  href={`${base}/request/edit/${record.reference}`}
                >
                  {dict.requestDemo.updateRequest}
                </Link>
              ) : null}
              <Link className="button-primary" href={`${base}/request/new`}>
                {dict.requestDemo.title}
              </Link>
            </>
          }
        />
      </div>

      {notice ? (
        <div className="mt-4">
          <Callout tone="success" role="status">
            {notice}
          </Callout>
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="card p-5" aria-labelledby="status-summary">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={STATUS_TONE[record.status]}>
              {dict.requestDemo.status[record.status]}
            </Badge>
            <Badge tone="amber">{dict.requestDemo.status.saved}</Badge>
            <span className="text-xs text-muted">
              {formatDateTime(record.createdAt, locale)}
            </span>
          </div>

          <h2 id="status-summary" className="mt-3 text-2xl font-bold tracking-tight">
            {record.bloodGroup === "not_sure"
              ? dict.find.notSureLabel
              : bloodGroupLabel(record.bloodGroup, locale)}{" "}
            <span className="text-base font-medium text-muted">
              · {componentLabel(record.component, locale)}
            </span>
          </h2>

          <p className="mt-1 text-sm text-muted">
            {record.units} {locale === "ne" ? "युनिट" : record.units === 1 ? "unit" : "units"} ·{" "}
            {urgencyLabel(record.urgency, locale)}
          </p>

          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-xl border border-line p-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                {dict.requestDemo.hospital}
              </dt>
              <dd className="mt-1 font-medium">{record.hospital}</dd>
              <dd className="text-xs text-muted">
                {district ? (locale === "ne" ? district.nameNe : district.nameEn) : record.district}
                {record.area ? ` · ${record.area}` : ""}
              </dd>
            </div>
            <div className="rounded-xl border border-line p-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                {dict.requestDemo.neededBy}
              </dt>
              <dd className="mt-1 font-medium">{formatDateTime(record.neededBy, locale)}</dd>
              <dd className="text-xs text-muted">
                {dict.requestDemo.status.saved}
              </dd>
            </div>
            <div className="rounded-xl border border-line p-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                {dict.requestDemo.status.contactTitle}
              </dt>
              <dd className="mt-1 font-medium">
                {record.contactMethod === "phone" ? dict.common.phone : dict.common.email}
              </dd>
              <dd className="flex items-center gap-1 text-xs text-muted">
                <LockIcon className="h-3.5 w-3.5" />
                {dict.requestDemo.status.contactHidden}
              </dd>
            </div>
            <div className="rounded-xl border border-line p-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                {dict.requestDemo.reference}
              </dt>
              <dd className="mt-1 font-mono text-base font-bold">{record.reference}</dd>
              <dd className="text-xs text-muted">{dict.requestDemo.status.open}</dd>
            </div>
          </dl>

          {record.directions ? (
            <p className="mt-4 rounded-xl bg-surface-muted p-3 text-sm text-ink-soft">
              {record.directions}
            </p>
          ) : null}

          {record.status === "open" ? (
            <div className="mt-5 border-t border-line pt-4">
              {confirmCancel ? (
                <div role="alertdialog" aria-labelledby="cancel-heading" className="rounded-xl border border-danger-700/20 bg-danger-50 p-3">
                  <p id="cancel-heading" className="text-sm font-semibold text-danger-700">
                    {dict.requestDemo.cancelRequest}
                  </p>
                  <p className="mt-1 text-xs text-danger-700">
                    {dict.requestDemo.cancelled}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" className="button-danger" onClick={cancelRequest}>
                      {dict.requestDemo.cancelRequest}
                    </button>
                    <button
                      type="button"
                      className="button-secondary"
                      onClick={() => setConfirmCancel(false)}
                    >
                      {dict.common.cancel}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Link
                    className="button-secondary"
                    href={`${base}/request/edit/${record.reference}`}
                  >
                    {dict.requestDemo.updateRequest}
                  </Link>
                  <button
                    type="button"
                    className="button-ghost text-danger-700"
                    onClick={() => setConfirmCancel(true)}
                  >
                    {dict.requestDemo.cancelRequest}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-5">
              <Callout tone="neutral">{dict.requestDemo.notificationBody}</Callout>
            </div>
          )}
        </section>

        <div className="space-y-4">
          <section className="card p-5" aria-labelledby="share-heading">
            <h2 id="share-heading" className="flex items-center gap-2 text-base font-semibold">
              <LockIcon className="h-4 w-4 text-brand-600" />
              {dict.requestDemo.status.shareTitle}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              {dict.requestDemo.status.shareBody}
            </p>
            <label className="label mt-3" htmlFor="safe-link">
              {dict.request.publicTitle.replace("{id}", record.reference)}
            </label>
            <input
              id="safe-link"
              readOnly
              className="input-base font-mono text-xs"
              value={safeLink}
              onFocus={(event) => event.currentTarget.select()}
            />
            <button type="button" className="button-primary mt-2 w-full" onClick={copyLink}>
              {copied ? dict.requestDemo.copied : dict.requestDemo.copyLink}
            </button>
            <p className="mt-2 flex items-start gap-1.5 text-xs text-muted">
              <InfoIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {dict.requestDemo.status.noPhone}
            </p>
          </section>

          <section className="card p-5" aria-labelledby="timeline-heading">
            <h2 id="timeline-heading" className="text-base font-semibold">
              {dict.requestDemo.status.timelineTitle}
            </h2>
            <ol className="mt-3 space-y-3">
              {timeline.map((entry, index) => (
                <li key={`${entry.at}-${entry.kind}-${index}`} className="flex gap-2.5 text-sm">
                  <span className="mt-1 text-brand-600">
                    {entry.kind === "created" ? (
                      <CheckCircleIcon className="h-4 w-4" />
                    ) : (
                      <ClockIcon className="h-4 w-4" />
                    )}
                  </span>
                  <span>
                    <span className="block font-medium">
                      {timelineLabel[entry.kind] ?? entry.kind}
                    </span>
                    <span className="text-xs text-muted">
                      {relativeTime(entry.at, new Date(), locale)} ·{" "}
                      {formatDateTime(entry.at, locale)}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section className="card p-5" aria-labelledby="notification-heading">
            <h2 id="notification-heading" className="text-base font-semibold">
              {dict.requestDemo.notificationTitle}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              {dict.requestDemo.notificationBody}
            </p>
            <div className="mt-3 rounded-lg border border-dashed border-line-strong bg-surface-muted p-3 text-sm">
              <p className="font-medium">
                {dict.requestDemo.status.needTitle}:{" "}
                {record.bloodGroup === "not_sure"
                  ? dict.find.notSureLabel
                  : bloodGroupLabel(record.bloodGroup, locale)}
              </p>
              <p className="mt-1 text-xs text-muted">{record.hospital}</p>
            </div>
          </section>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link className="button-secondary" href={`${base}/find`}>
          {dict.requestDemo.backToFind}
        </Link>
        <Link className="button-ghost" href={`${base}/learn/faq`}>
          {dict.help.faqCta}
        </Link>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-muted">
        {dict.find.disclaimer}
      </p>
    </div>
  );
}

export function LookupForm({
  locale,
  dict,
  defaultValue = "",
}: {
  locale: Locale;
  dict: Dictionary;
  defaultValue?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState("");

  return (
    <form
      className="mt-3 flex flex-col gap-2 sm:flex-row"
      onSubmit={(event) => {
        event.preventDefault();
        const normalized = normalizeDemoReference(value);
        if (!isValidDemoReference(normalized)) {
          setError(dict.requestDemo.status.lookupError);
          return;
        }
        setError("");
        router.push(`/${locale}/request/status/${normalized}`);
      }}
      noValidate
    >
      <div className="flex-1">
        <label className="sr-only" htmlFor="lookup-reference">
          {dict.requestDemo.status.lookupLabel}
        </label>
        <input
          id="lookup-reference"
          className={`input-base font-mono uppercase ${error ? "input-error" : ""}`}
          placeholder="DEMO-7K4P2Q"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "lookup-error" : undefined}
        />
        {error ? (
          <p id="lookup-error" className="field-error mt-1" role="alert">
            {error}
          </p>
        ) : null}
      </div>
      <button type="submit" className="button-primary sm:self-start">
        <SearchIcon className="h-4 w-4" />
        {dict.requestDemo.status.lookupButton}
      </button>
    </form>
  );
}
