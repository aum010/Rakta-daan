import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, gte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  abuseReports,
  auditEvents,
  camps,
  messages,
  organizations,
} from "@/db/schema";
import { Badge, Callout, EmptyState, PageHeader, Stat } from "@/components/ui/ui";
import {
  AdminAbuseActions,
  AdminCampForm,
  AdminOrgActions,
} from "@/components/admin/admin-actions";
import { requireAdmin } from "@/lib/auth";
import { getDictionary, isLocale } from "@/lib/i18n";
import { districtName } from "@/lib/requests";
import { formatDateTime, relativeTime } from "@/lib/dates";
import {
  messageStatusTone,
  orgTypeLabel,
  verificationLabel,
  verificationTone,
  type VerificationState,
} from "@/lib/labels";
import { collectConfigWarnings } from "@/lib/env";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const user = await requireAdmin(locale, `/${locale}/admin`);
  const db = getDb();
  const now = new Date();
  const warnings = collectConfigWarnings();

  const orgs = await db
    .select()
    .from(organizations)
    .orderBy(organizations.verification, organizations.name)
    .limit(60);

  const recentMessages = await db
    .select({
      id: messages.id,
      channel: messages.channel,
      template: messages.template,
      status: messages.status,
      provider: messages.provider,
      errorCode: messages.errorCode,
      errorMessage: messages.errorMessage,
      createdAt: messages.createdAt,
      attempts: messages.attempts,
    })
    .from(messages)
    .orderBy(desc(messages.createdAt))
    .limit(20);

  const deliveryStats = await db
    .select({
      status: messages.status,
      count: sql<number>`count(*)::int`,
    })
    .from(messages)
    .groupBy(messages.status);

  const reports = await db
    .select()
    .from(abuseReports)
    .orderBy(desc(abuseReports.createdAt))
    .limit(20);

  const upcomingCamps = await db
    .select()
    .from(camps)
    .where(gte(camps.startsAt, now))
    .orderBy(camps.startsAt)
    .limit(10);

  const audit = await db
    .select()
    .from(auditEvents)
    .orderBy(desc(auditEvents.createdAt))
    .limit(20);

  const pending = orgs.filter(
    (org) => org.verification === "pending" || org.verification === "unverified",
  );

  return (
    <div className="container-page py-8">
      <PageHeader
        title={dict.admin.title}
        subtitle={`${dict.admin.subtitle} · ${user.name}`}
        actions={
          <Badge tone="info">
            {formatDateTime(now, locale)}
          </Badge>
        }
      />

      {warnings.length > 0 ? (
        <div className="mt-4">
          <Callout tone="warning" title="Configuration">
            <ul className="list-disc space-y-1 pl-4">
              {warnings.map((warning) => (
                <li key={warning.key}>
                  <span className="font-mono text-xs">{warning.key}</span>: {warning.message}
                </li>
              ))}
            </ul>
          </Callout>
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Stat label={dict.admin.verificationQueue} value={pending.length} />
        <Stat
          label={dict.admin.messages}
          value={deliveryStats.reduce((total, row) => total + row.count, 0)}
        />
        <Stat
          label={dict.admin.abuse}
          value={reports.filter((report) => report.status === "open").length}
        />
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">{dict.admin.orgs}</h2>
        <p className="mt-1 text-sm text-muted">{dict.admin.unverifiedWarning}</p>
        <ul className="mt-3 space-y-3">
          {orgs.map((org) => (
            <li key={org.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">
                    {org.name}
                    {org.isDemo ? (
                      <span className="ml-2">
                        <Badge tone="amber">{dict.common.demoData}</Badge>
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted">
                    {orgTypeLabel(org.type, dict)} · {districtName(org.districtCode, locale)} ·{" "}
                    <span className="font-mono">{org.slug}</span>
                  </p>
                </div>
                <Badge tone={verificationTone(org.verification as VerificationState)}>
                  {verificationLabel(org.verification as VerificationState, dict)}
                </Badge>
              </div>
              {org.verificationNote ? (
                <p className="mt-1 text-xs text-muted">{org.verificationNote}</p>
              ) : null}
              <AdminOrgActions orgId={org.id} dict={dict} verification={org.verification} />
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">{dict.admin.messages}</h2>
        {recentMessages.length === 0 ? (
          <div className="mt-3">
            <EmptyState title={dict.admin.noMessages} />
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <th className="py-2 pr-3 font-semibold">{dict.admin.status}</th>
                  <th className="py-2 pr-3 font-semibold">{dict.admin.provider}</th>
                  <th className="py-2 pr-3 font-semibold">Template</th>
                  <th className="py-2 pr-3 font-semibold">{dict.admin.reason}</th>
                  <th className="py-2 font-semibold">{dict.common.today}</th>
                </tr>
              </thead>
              <tbody>
                {recentMessages.map((message) => (
                  <tr key={message.id} className="border-b border-line/70 last:border-0">
                    <td className="py-2 pr-3">
                      <Badge tone={messageStatusTone(message.status)}>{message.status}</Badge>
                    </td>
                    <td className="py-2 pr-3 text-muted">{message.provider ?? "—"}</td>
                    <td className="py-2 pr-3 font-mono text-xs">{message.template}</td>
                    <td className="py-2 pr-3 text-xs text-muted">
                      {message.errorCode ? `${message.errorCode}: ` : ""}
                      {message.errorMessage ?? "—"}
                    </td>
                    <td className="py-2 text-xs text-muted">
                      {relativeTime(message.createdAt, now, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-xs text-muted">
          {dict.common.simulated} · {dict.common.notDelivered}
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">{dict.admin.abuse}</h2>
        {reports.length === 0 ? (
          <div className="mt-3">
            <EmptyState title={dict.admin.abuseEmpty} />
          </div>
        ) : (
          <ul className="mt-3 space-y-3">
            {reports.map((report) => (
              <li key={report.id} className="card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">
                    {report.reason} · {report.status}
                  </p>
                  <span className="text-xs text-muted">
                    {relativeTime(report.createdAt, now, locale)}
                  </span>
                </div>
                {report.details ? (
                  <p className="mt-1 text-sm text-ink-soft">{report.details}</p>
                ) : null}
                <p className="mt-1 font-mono text-xs text-muted">
                  {report.requestId ?? "no request"}
                </p>
                {report.status !== "resolved" && report.status !== "dismissed" ? (
                  <AdminAbuseActions id={report.id} dict={dict} />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="card p-5">
          <h2 className="text-lg font-semibold">{dict.admin.camps}</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {upcomingCamps.length === 0 ? (
              <li className="text-muted">{dict.camps.empty}</li>
            ) : (
              upcomingCamps.map((camp) => (
                <li key={camp.id}>
                  <p className="font-medium">{camp.title}</p>
                  <p className="text-xs text-muted">
                    {formatDateTime(camp.startsAt, locale)} · {districtName(camp.districtCode, locale)}
                  </p>
                </li>
              ))
            )}
          </ul>
          <div className="mt-4 border-t border-line pt-4">
            <AdminCampForm locale={locale} dict={dict} />
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-lg font-semibold">{dict.admin.audit}</h2>
          <ul className="mt-2 divide-y divide-line text-sm">
            {audit.map((event) => (
              <li key={event.id} className="py-2 first:pt-0 last:pb-0">
                <p className="font-medium">{event.action}</p>
                <p className="text-xs text-muted">
                  {event.entityType ?? "—"} · {relativeTime(event.createdAt, now, locale)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <p className="mt-6 text-xs text-muted">
        <Link className="underline" href={`/${locale}/dashboard`}>
          {dict.common.dashboard}
        </Link>
      </p>
    </div>
  );
}
