import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Callout, PageHeader } from "@/components/ui/ui";
import { getDictionary, isLocale } from "@/lib/i18n";
import {
  BLOOD_GROUPS,
  DONOR_CAN_GIVE_TO,
  bloodGroupLabel,
  bloodGroupShort,
} from "@/lib/blood";
import { ArrowIcon } from "@/components/ui/icons";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return {
    title: `${dict.learn.compatibility.title} — ${dict.common.appName}`,
    description: dict.learn.compatibility.intro,
  };
}

export default async function CompatibilityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const base = `/${locale}`;
  const copy = dict.learn.compatibility;

  return (
    <div className="container-page max-w-4xl py-8">
      <PageHeader
        eyebrow={dict.learn.hubEyebrow}
        title={copy.title}
        subtitle={copy.intro}
        breadcrumbs={[
          { href: base, label: dict.common.appName },
          { href: `${base}/learn`, label: dict.learn.title },
          { href: `${base}/learn/compatibility`, label: copy.title },
        ]}
        actions={
          <Link className="button-primary" href={`${base}/find`}>
            {dict.nav.findBlood}
            <ArrowIcon className="h-4 w-4" />
          </Link>
        }
      />

      <div className="mt-6 overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="data-table min-w-[34rem]">
          <caption className="sr-only">{copy.title}</caption>
          <thead>
            <tr>
              <th scope="col">{copy.donorHeader}</th>
              <th scope="col">{copy.canGiveHeader}</th>
            </tr>
          </thead>
          <tbody>
            {BLOOD_GROUPS.map((group) => (
              <tr key={group}>
                <th scope="row" className="whitespace-nowrap text-left">
                  <span className="font-semibold">{bloodGroupLabel(group, locale)}</span>{" "}
                  <span className="font-mono text-xs text-muted">{bloodGroupShort(group)}</span>
                </th>
                <td>
                  {DONOR_CAN_GIVE_TO[group]
                    .map((recipient) => bloodGroupLabel(recipient, locale))
                    .join(" · ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4">
        <Callout tone="info" title={dict.find.componentWarning}>
          {copy.note}
        </Callout>
      </div>

      <section className="mt-6 card p-5">
        <h2 className="text-lg font-semibold">{dict.learn.faqTitle}</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">{dict.learn.faqBody}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link className="button-secondary" href={`${base}/learn/faq`}>
            {dict.learn.browseFaq}
          </Link>
          <Link className="button-ghost" href={`${base}/find/guidance`}>
            {dict.find.readGuidance}
          </Link>
        </div>
      </section>

      <p className="mt-6 text-xs leading-relaxed text-muted">{dict.find.disclaimer}</p>
    </div>
  );
}
