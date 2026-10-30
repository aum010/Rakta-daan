"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Dictionary } from "@/messages/en";
import type { Locale } from "@/lib/i18n";
import { format } from "@/lib/i18n";
import { BLOOD_GROUPS, bloodGroupLabel, componentLabel, urgencyLabel } from "@/lib/blood";
import { formatDate, formatDateTime } from "@/lib/dates";
import { districtName } from "@/lib/requests";
import {
  DEMO_ABUSE_REPORTS,
  DEMO_ADMIN_REQUESTS,
  DEMO_AUDIT_EVENTS,
  DEMO_FACILITIES,
  DEMO_NOTIFICATIONS,
  DEMO_VERIFICATION_CASES,
} from "@/mocks/fixtures";
import { Badge, Callout, DemoBanner, EmptyState, Stat } from "../ui/ui";
import { ArrowIcon, CheckCircleIcon, ShieldIcon } from "../ui/icons";
import type { BadgeTone } from "../ui/ui";

type Tab =
  | "overview"
  | "requests"
  | "donors"
  | "banks"
  | "verification"
  | "reports"
  | "notifications"
  | "abuse"
  | "activity"
  | "settings";

const REQUEST_STATUS_TONE: Record<string, BadgeTone> = {
  open: "brand",
  fulfilled: "teal",
  cancelled: "neutral",
  expired: "amber",
};

const NOTIFICATION_TONE: Record<string, BadgeTone> = {
  queued: "info",
  simulated: "amber",
  delivered: "teal",
  failed: "danger",
};

const DONOR_COUNTS: Record<string, number> = {
  A_POS: 18,
  A_NEG: 2,
  B_POS: 14,
  B_NEG: 3,
  AB_POS: 5,
  AB_NEG: 1,
  O_POS: 21,
  O_NEG: 6,
};

export function AdminDemoDashboard({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary;
}) {
  const base = `/${locale}`;
  const [tab, setTab] = useState<Tab>("overview");
  const [role, setRole] = useState<"admin" | "reviewer" | "support">("admin");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState("");
  const [verification, setVerification] = useState<Record<string, string>>({});
  const [abuseState, setAbuseState] = useState<Record<string, string>>({});
  const [channelFilter, setChannelFilter] = useState("");
  const [notice, setNotice] = useState("");

  const [verifiedOnly, setVerifiedOnly] = useState(true);
  const [consentRequired, setConsentRequired] = useState(true);
  const [auditAccess, setAuditAccess] = useState(true);
  const [simulate, setSimulate] = useState(true);
  const [provider, setProvider] = useState("mock");
  const [settingsSaved, setSettingsSaved] = useState(false);

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: dict.adminDemo.navOverview },
    { id: "requests", label: dict.adminDemo.navRequests },
    { id: "donors", label: dict.adminDemo.navDonors },
    { id: "banks", label: dict.adminDemo.navBanks },
    { id: "verification", label: dict.adminDemo.navVerification },
    { id: "reports", label: dict.adminDemo.navReports },
    { id: "notifications", label: dict.adminDemo.navNotifications },
    { id: "abuse", label: dict.adminDemo.navAbuse },
    { id: "activity", label: dict.adminDemo.navActivity },
    { id: "settings", label: dict.adminDemo.navSettings },
  ];

  const requests = useMemo(() => {
    const term = search.trim().toLowerCase();
    return DEMO_ADMIN_REQUESTS.filter((request) => {
      if (statusFilter && request.status !== statusFilter) return false;
      if (urgencyFilter && request.urgency !== urgencyFilter) return false;
      if (!term) return true;
      return [request.reference, request.facility, request.contactName, request.districtCode]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [search, statusFilter, urgencyFilter]);

  const notifications = DEMO_NOTIFICATIONS.filter(
    (notification) => !channelFilter || notification.channel === channelFilter,
  );

  function verificationStatus(id: string, fallback: string): string {
    return verification[id] ?? fallback;
  }

  function abuseStatus(id: string, fallback: string): string {
    return abuseState[id] ?? fallback;
  }

  function updateVerification(id: string, status: "verified" | "rejected") {
    setVerification((current) => ({ ...current, [id]: status }));
    setNotice(dict.adminDemo.statusUpdated);
  }

  function updateAbuse(id: string, status: "resolved" | "dismissed") {
    setAbuseState((current) => ({ ...current, [id]: status }));
    setNotice(dict.adminDemo.statusUpdated);
  }

  function saveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSettingsSaved(true);
    setNotice(dict.adminDemo.settingsSaved);
  }

  const openCount = DEMO_ADMIN_REQUESTS.filter((request) => request.status === "open").length;
  const pendingVerification = DEMO_VERIFICATION_CASES.filter(
    (item) => verificationStatus(item.id, item.status) === "pending",
  ).length;
  const notificationIssues = DEMO_NOTIFICATIONS.filter((item) => item.status === "failed").length;
  const openAbuse = DEMO_ABUSE_REPORTS.filter(
    (item) => abuseStatus(item.id, item.status) === "open",
  ).length;

  return (
    <div className="container-page max-w-6xl py-8">
      <DemoBanner>{dict.adminDemo.demoNotice}</DemoBanner>

      <div className="mt-4 flex flex-col gap-3 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow mb-2">{dict.adminDemo.eyebrow}</p>
          <h1 className="text-2xl font-bold sm:text-3xl">{dict.adminDemo.title}</h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">
            {dict.adminDemo.subtitle}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="field">
            <label className="label" htmlFor="admin-role">
              {dict.adminDemo.roleLabel}
            </label>
            <select
              id="admin-role"
              className="input-base !min-h-0 !py-1.5 text-sm"
              value={role}
              onChange={(event) => setRole(event.target.value as typeof role)}
            >
              <option value="admin">{dict.adminDemo.roleAdmin}</option>
              <option value="reviewer">{dict.adminDemo.roleReviewer}</option>
              <option value="support">{dict.adminDemo.roleSupport}</option>
            </select>
          </div>
          <Link className="button-secondary" href={`${base}/admin`}>
            {dict.adminDemo.navBack}
          </Link>
        </div>
      </div>

      <div className="mt-3">
        <p className="flex items-start gap-2 text-xs leading-relaxed text-muted">
          <ShieldIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          {dict.adminDemo.signInNotice}
        </p>
      </div>

      <nav className="mt-4 flex flex-wrap gap-2" aria-label={dict.adminDemo.title}>
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            className="chip"
            data-active={tab === item.id}
            aria-current={tab === item.id ? "page" : undefined}
            onClick={() => {
              setTab(item.id);
              setNotice("");
            }}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {notice ? (
        <div className="mt-4">
          <Callout tone="success" role="status">
            {notice}
          </Callout>
        </div>
      ) : null}

      {tab === "overview" ? (
        <section className="mt-5" aria-label={dict.adminDemo.overviewTitle}>
          <h2 className="text-lg font-bold">{dict.adminDemo.overviewTitle}</h2>
          <p className="mt-1 text-sm text-muted">{dict.adminDemo.overviewCopy}</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label={dict.adminDemo.requestVolume} value={DEMO_ADMIN_REQUESTS.length} />
            <Stat label={dict.adminDemo.openRequests} value={openCount} />
            <Stat label={dict.adminDemo.verificationPending} value={pendingVerification} />
            <Stat label={dict.adminDemo.notificationIssues} value={notificationIssues} />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="card p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">{dict.adminDemo.recentRequests}</h3>
                <button
                  type="button"
                  className="text-xs font-semibold text-brand-700 hover:underline"
                  onClick={() => setTab("requests")}
                >
                  {dict.adminDemo.navRequests}
                </button>
              </div>
              <ul className="mt-2 divide-y divide-line">
                {DEMO_ADMIN_REQUESTS.slice(0, 4).map((request) => (
                  <li key={request.reference} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                    <span className="font-mono text-xs text-muted">{request.reference}</span>
                    <span className="font-semibold">{request.bloodGroup}</span>
                    <span className="text-muted">{request.facility}</span>
                    <Badge tone={REQUEST_STATUS_TONE[request.status] ?? "neutral"}>
                      {dict.requestDemo.status[request.status]}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">{dict.adminDemo.recentVerification}</h3>
                <button
                  type="button"
                  className="text-xs font-semibold text-brand-700 hover:underline"
                  onClick={() => setTab("verification")}
                >
                  {dict.adminDemo.navVerification}
                </button>
              </div>
              <ul className="mt-2 space-y-2">
                {DEMO_VERIFICATION_CASES.filter(
                  (item) => verificationStatus(item.id, item.status) === "pending",
                )
                  .slice(0, 3)
                  .map((item) => (
                    <li key={item.id} className="rounded-lg border border-line p-2 text-sm">
                      <p className="font-medium">{item.organisation}</p>
                      <p className="text-xs text-muted">
                        {item.id} · {districtName(item.districtCode, locale)}
                      </p>
                    </li>
                  ))}
              </ul>
            </div>
          </div>

          <div className="mt-4 card p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">{dict.adminDemo.recentNotifications}</h3>
              <button
                type="button"
                className="text-xs font-semibold text-brand-700 hover:underline"
                onClick={() => setTab("notifications")}
              >
                {dict.adminDemo.navNotifications}
              </button>
            </div>
            <ul className="mt-2 divide-y divide-line">
              {DEMO_NOTIFICATIONS.slice(0, 3).map((item) => (
                <li key={item.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                  <span className="font-mono text-xs text-muted">{item.id}</span>
                  <span>{item.channel}</span>
                  <span className="text-muted">{item.template}</span>
                  <Badge tone={NOTIFICATION_TONE[item.status] ?? "neutral"}>
                    {dict.adminDemo[item.status as keyof typeof dict.adminDemo] ?? item.status}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {tab === "requests" ? (
        <section className="mt-5" aria-label={dict.adminDemo.requestsTitle}>
          <h2 className="text-lg font-bold">{dict.adminDemo.requestsTitle}</h2>
          <p className="mt-1 text-sm text-muted">{dict.adminDemo.requestsCopy}</p>

          <div className="card mt-3 p-3">
            <div className="grid gap-2 sm:grid-cols-[1.4fr_1fr_1fr]">
              <div className="field">
                <label className="label" htmlFor="admin-search">
                  {dict.common.search}
                </label>
                <input
                  id="admin-search"
                  className="input-base"
                  placeholder={dict.adminDemo.searchPlaceholder}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <div className="field">
                <label className="label" htmlFor="admin-status">
                  {dict.adminDemo.filterStatus}
                </label>
                <select
                  id="admin-status"
                  className="input-base"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <option value="">{dict.adminDemo.all}</option>
                  {(["open", "fulfilled", "cancelled", "expired"] as const).map((status) => (
                    <option key={status} value={status}>
                      {dict.requestDemo.status[status]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="label" htmlFor="admin-urgency">
                  {dict.adminDemo.filterUrgency}
                </label>
                <select
                  id="admin-urgency"
                  className="input-base"
                  value={urgencyFilter}
                  onChange={(event) => setUrgencyFilter(event.target.value)}
                >
                  <option value="">{dict.adminDemo.all}</option>
                  {(["routine", "urgent", "critical"] as const).map((urgency) => (
                    <option key={urgency} value={urgency}>
                      {urgencyLabel(urgency, locale)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <p className="mt-2 text-xs text-muted">
            {format(dict.adminDemo.total, { count: requests.length })}
          </p>

          {requests.length === 0 ? (
            <div className="mt-3">
              <EmptyState title={dict.adminDemo.noResults} />
            </div>
          ) : (
            <ul className="mt-2 space-y-2">
              {requests.map((request) => (
                <li key={request.reference} className="card p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-muted">{request.reference}</span>
                    <span className="font-semibold">{bloodGroupLabel(request.bloodGroup, locale)}</span>
                    <span className="text-sm text-muted">
                      {request.units} · {componentLabel(request.component, locale)}
                    </span>
                    <Badge tone={request.urgency === "critical" ? "danger" : "amber"}>
                      {urgencyLabel(request.urgency, locale)}
                    </Badge>
                    <Badge tone={REQUEST_STATUS_TONE[request.status] ?? "neutral"}>
                      {dict.requestDemo.status[request.status]}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm font-medium">{request.facility}</p>
                  <p className="text-xs text-muted">
                    {districtName(request.districtCode, locale)} ·{" "}
                    {formatDate(request.createdAt, locale)}
                  </p>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm font-semibold text-brand-700">
                      {dict.adminDemo.details}
                    </summary>
                    <div className="mt-2 rounded-lg bg-surface-muted p-3 text-sm">
                      <dl className="grid gap-2 sm:grid-cols-2">
                        <div>
                          <dt className="text-xs text-muted">{dict.adminDemo.facility}</dt>
                          <dd>{request.facility}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted">{dict.orgDemo.neededBy}</dt>
                          <dd>{formatDate(request.neededBy, locale)}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted">{dict.requestDemo.status.contactTitle}</dt>
                          <dd>{request.contactName}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted">{dict.adminDemo.notified}</dt>
                          <dd>{request.notified}</dd>
                        </div>
                      </dl>
                      <p className="mt-2 text-xs text-muted">{request.note}</p>
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {tab === "donors" ? (
        <section className="mt-5" aria-label={dict.adminDemo.donorsTitle}>
          <h2 className="text-lg font-bold">{dict.adminDemo.donorsTitle}</h2>
          <p className="mt-1 text-sm text-muted">{dict.adminDemo.donorsCopy}</p>
          <div className="mt-3">
            <Callout tone="info">{dict.adminDemo.donorsNote}</Callout>
          </div>

          <div className="mt-3 overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="data-table min-w-[30rem]">
              <thead>
                <tr>
                  <th scope="col">{dict.adminDemo.bloodGroup}</th>
                  <th scope="col">{dict.adminDemo.donorCount}</th>
                  <th scope="col">{dict.adminDemo.district}</th>
                </tr>
              </thead>
              <tbody>
                {BLOOD_GROUPS.map((group) => {
                  const count = DONOR_COUNTS[group] ?? 0;
                  return (
                    <tr key={group}>
                      <th scope="row" className="text-left">
                        {bloodGroupLabel(group, locale)}
                      </th>
                      <td>{count < 3 ? dict.adminDemo.fewerThanThree : count}</td>
                      <td>{dict.common.approximate}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {tab === "banks" ? (
        <section className="mt-5" aria-label={dict.adminDemo.banksTitle}>
          <h2 className="text-lg font-bold">{dict.adminDemo.banksTitle}</h2>
          <p className="mt-1 text-sm text-muted">{dict.adminDemo.banksCopy}</p>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {DEMO_FACILITIES.map((facility) => (
              <li key={facility.slug} className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{facility.name}</p>
                    <p className="text-xs text-muted">
                      {facility.type === "blood_bank"
                        ? dict.orgDemo.bloodBank
                        : dict.orgDemo.hospital}{" "}
                      · {districtName(facility.districtCode, locale)}
                    </p>
                  </div>
                  <Badge tone="amber">{dict.common.demoData}</Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                  <span>
                    {dict.orgDemo.freshCount}:{" "}
                    {facility.inventory.filter((row) => !row.stale).length}
                  </span>
                  <span>
                    {dict.orgDemo.staleCount}:{" "}
                    {facility.inventory.filter((row) => row.stale).length}
                  </span>
                  <span>{formatDate(facility.lastUpdatedAt, locale)}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {tab === "verification" ? (
        <section className="mt-5" aria-label={dict.adminDemo.verificationTitle}>
          <h2 className="text-lg font-bold">{dict.adminDemo.verificationTitle}</h2>
          <p className="mt-1 text-sm text-muted">{dict.adminDemo.verificationCopy}</p>

          <ul className="mt-3 space-y-3">
            {DEMO_VERIFICATION_CASES.map((item) => {
              const status = verificationStatus(item.id, item.status);
              return (
                <li key={item.id} className="card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{item.organisation}</p>
                      <p className="text-xs text-muted">
                        {item.id} · {districtName(item.districtCode, locale)} ·{" "}
                        {formatDate(item.submittedAt, locale)}
                      </p>
                    </div>
                    <Badge
                      tone={
                        status === "verified"
                          ? "teal"
                          : status === "rejected"
                            ? "danger"
                            : "amber"
                      }
                    >
                      {status === "verified"
                        ? dict.common.verified
                        : status === "rejected"
                          ? dict.common.rejected
                          : dict.common.pending}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-ink-soft">{item.requiredActions}</p>
                  <p className="mt-1 text-xs text-muted">
                    {dict.adminDemo.reviewerNote}: {dict.adminDemo.requiredActions}
                  </p>
                  {status === "pending" ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="button-primary !min-h-0 !py-1.5 text-sm"
                        onClick={() => updateVerification(item.id, "verified")}
                      >
                        {dict.adminDemo.approve}
                      </button>
                      <button
                        type="button"
                        className="button-secondary !min-h-0 !py-1.5 text-sm"
                        onClick={() => updateVerification(item.id, "rejected")}
                      >
                        {dict.adminDemo.reject}
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {tab === "reports" ? (
        <section className="mt-5" aria-label={dict.adminDemo.reportsTitle}>
          <h2 className="text-lg font-bold">{dict.adminDemo.reportsTitle}</h2>
          <p className="mt-1 text-sm text-muted">{dict.adminDemo.reportsCopy}</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label={dict.adminDemo.reportRequests} value={DEMO_ADMIN_REQUESTS.length} />
            <Stat label={dict.adminDemo.reportFacilities} value={DEMO_FACILITIES.length} />
            <Stat label={dict.adminDemo.reportNotifications} value={DEMO_NOTIFICATIONS.length} />
            <Stat label={dict.adminDemo.reportOpenAbuse} value={openAbuse} />
          </div>

          <div className="mt-4 card p-4">
            <h3 className="text-sm font-semibold">{dict.adminDemo.recentRequests}</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {(["open", "fulfilled", "cancelled", "expired"] as const).map((status) => (
                <Badge key={status} tone={REQUEST_STATUS_TONE[status] ?? "neutral"}>
                  {dict.requestDemo.status[status]}:{" "}
                  {DEMO_ADMIN_REQUESTS.filter((request) => request.status === status).length}
                </Badge>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {tab === "notifications" ? (
        <section className="mt-5" aria-label={dict.adminDemo.notificationsTitle}>
          <h2 className="text-lg font-bold">{dict.adminDemo.notificationsTitle}</h2>
          <p className="mt-1 text-sm text-muted">{dict.adminDemo.notificationsCopy}</p>

          <div className="mt-3 flex flex-wrap items-end gap-2">
            <div className="field">
              <label className="label" htmlFor="admin-channel">
                {dict.adminDemo.filterChannel}
              </label>
              <select
                id="admin-channel"
                className="input-base !min-h-0 !py-1.5 text-sm"
                value={channelFilter}
                onChange={(event) => setChannelFilter(event.target.value)}
              >
                <option value="">{dict.adminDemo.all}</option>
                <option value="sms">SMS</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="email">{dict.common.email}</option>
              </select>
            </div>
            <p className="text-xs text-muted">
              {format(dict.adminDemo.total, { count: notifications.length })}
            </p>
          </div>

          <div className="mt-3 overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="data-table min-w-[44rem]">
              <thead>
                <tr>
                  <th scope="col">{dict.adminDemo.channel}</th>
                  <th scope="col">{dict.adminDemo.recipient}</th>
                  <th scope="col">{dict.adminDemo.provider}</th>
                  <th scope="col">{dict.adminDemo.timestamp}</th>
                  <th scope="col">{dict.adminDemo.status}</th>
                  <th scope="col">{dict.adminDemo.reason}</th>
                </tr>
              </thead>
              <tbody>
                {notifications.map((item) => (
                  <tr key={item.id}>
                    <th scope="row" className="text-left uppercase">
                      {item.channel}
                    </th>
                    <td className="font-mono text-xs">{item.recipient}</td>
                    <td>{item.provider}</td>
                    <td className="whitespace-nowrap">{formatDateTime(item.timestamp, locale)}</td>
                    <td>
                      <Badge tone={NOTIFICATION_TONE[item.status] ?? "neutral"}>
                        {dict.adminDemo[item.status as keyof typeof dict.adminDemo] ?? item.status}
                      </Badge>
                    </td>
                    <td className="text-xs text-muted">{item.reason ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3">
            <Callout tone="warning">{dict.adminDemo.providerWarning}</Callout>
          </div>
        </section>
      ) : null}

      {tab === "abuse" ? (
        <section className="mt-5" aria-label={dict.adminDemo.abuseTitle}>
          <h2 className="text-lg font-bold">{dict.adminDemo.abuseTitle}</h2>
          <p className="mt-1 text-sm text-muted">{dict.adminDemo.abuseCopy}</p>

          <ul className="mt-3 space-y-3">
            {DEMO_ABUSE_REPORTS.map((report) => {
              const status = abuseStatus(report.id, report.status);
              return (
                <li key={report.id} className="card p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-muted">{report.id}</span>
                    <span className="font-mono text-xs">{report.reference}</span>
                    <Badge
                      tone={status === "open" ? "amber" : status === "resolved" ? "teal" : "neutral"}
                    >
                      {status}
                    </Badge>
                    <span className="text-xs text-muted">{formatDate(report.createdAt, locale)}</span>
                  </div>
                  <p className="mt-2 text-sm">{report.summary}</p>
                  {status === "open" ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="button-primary !min-h-0 !py-1.5 text-sm"
                        onClick={() => updateAbuse(report.id, "resolved")}
                      >
                        {dict.adminDemo.resolve}
                      </button>
                      <button
                        type="button"
                        className="button-secondary !min-h-0 !py-1.5 text-sm"
                        onClick={() => updateAbuse(report.id, "dismissed")}
                      >
                        {dict.adminDemo.dismiss}
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {tab === "activity" ? (
        <section className="mt-5" aria-label={dict.adminDemo.activityTitle}>
          <h2 className="text-lg font-bold">{dict.adminDemo.activityTitle}</h2>
          <p className="mt-1 text-sm text-muted">{dict.adminDemo.activityCopy}</p>

          <ul className="mt-3 divide-y divide-line rounded-xl border border-line bg-surface">
            {DEMO_AUDIT_EVENTS.map((event) => (
              <li key={event.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3 text-sm">
                <span className="font-mono text-xs text-muted">{event.id}</span>
                <span className="font-medium">{event.action}</span>
                <span className="font-mono text-xs">{event.target}</span>
                <span className="text-xs text-muted">{event.actor}</span>
                <span className="ml-auto text-xs text-muted">
                  {formatDateTime(event.at, locale)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {tab === "settings" ? (
        <section className="mt-5" aria-label={dict.adminDemo.settingsTitle}>
          <h2 className="text-lg font-bold">{dict.adminDemo.settingsTitle}</h2>
          <p className="mt-1 text-sm text-muted">{dict.adminDemo.settingsCopy}</p>

          <form className="card mt-3 p-4" onSubmit={saveSettings}>
            <div className="space-y-2">
              {[
                [verifiedOnly, setVerifiedOnly, dict.adminDemo.settingVerified] as const,
                [consentRequired, setConsentRequired, dict.adminDemo.settingConsent] as const,
                [auditAccess, setAuditAccess, dict.adminDemo.settingAudit] as const,
                [simulate, setSimulate, dict.adminDemo.settingSimulate] as const,
              ].map(([checked, setChecked, label]) => (
                <label key={label} className="choice-card items-start">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => setChecked(event.target.checked)}
                    className="mt-0.5 accent-brand-600"
                  />
                  <span className="text-sm leading-relaxed">{label}</span>
                </label>
              ))}
            </div>

            <div className="field mt-3 max-w-sm">
              <label className="label" htmlFor="admin-provider">
                {dict.adminDemo.providerLabel}
              </label>
              <select
                id="admin-provider"
                className="input-base"
                value={provider}
                onChange={(event) => setProvider(event.target.value)}
              >
                <option value="mock">{dict.adminDemo.providerMock}</option>
                <option value="demo">{dict.adminDemo.providerSafe}</option>
              </select>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button type="submit" className="button-primary">
                {dict.adminDemo.save}
              </button>
              {settingsSaved ? (
                <span
                  className="flex items-center gap-1.5 text-sm font-medium text-teal-700"
                  role="status"
                >
                  <CheckCircleIcon className="h-4 w-4" />
                  {dict.adminDemo.settingsSaved}
                </span>
              ) : null}
            </div>

            <div className="mt-3">
              <Callout tone="danger">{dict.adminDemo.dontDisableAuth}</Callout>
            </div>
          </form>
        </section>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-2">
        <Link className="button-secondary" href={`${base}/admin`}>
          {dict.adminDemo.navBack}
          <ArrowIcon className="h-4 w-4" />
        </Link>
        <Link className="button-ghost" href={`${base}/org/demo`}>
          {dict.orgDemo.title}
        </Link>
      </div>
    </div>
  );
}
