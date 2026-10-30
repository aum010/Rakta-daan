import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Callout, PageHeader } from "@/components/ui/ui";
import { getDictionary, isLocale } from "@/lib/i18n";
import { ArrowIcon, LockIcon } from "@/components/ui/icons";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return { title: `${dict.consent.title} — ${dict.common.appName}`, description: dict.consent.subtitle };
}

export default async function ConsentPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const base = `/${locale}`;
  const copy = dict.consent;
  const sections = [
    { title: copy.sections.purposeTitle, body: copy.sections.purposeBody },
    { title: copy.sections.channelsTitle, body: copy.sections.channelsBody },
    { title: copy.sections.contactTitle, body: copy.sections.contactBody },
    { title: copy.sections.withdrawTitle, body: copy.sections.withdrawBody },
    { title: copy.sections.medicalTitle, body: copy.sections.medicalBody },
  ];

  return (
    <div className="container-page max-w-3xl py-8">
      <PageHeader
        eyebrow={dict.learn.privacyTitle}
        title={copy.title}
        subtitle={copy.subtitle}
        breadcrumbs={[
          { href: base, label: dict.common.appName },
          { href: `${base}/learn`, label: dict.learn.title },
          { href: `${base}/consent`, label: copy.title },
        ]}
        actions={
          <Link className="button-primary" href={`${base}/donor/demo/dashboard`}>
            {copy.openPreferences}
            <ArrowIcon className="h-4 w-4" />
          </Link>
        }
      />

      <div className="mt-5">
        <Callout tone="info">{copy.demoNotice}</Callout>
      </div>

      <div className="mt-6 space-y-3">
        {sections.map((section) => (
          <section key={section.title} className="card p-5">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <LockIcon className="h-4 w-4 text-brand-600" />
              {section.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{section.body}</p>
          </section>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link className="button-secondary" href={`${base}/privacy`}>
          {copy.readPrivacy}
        </Link>
        <Link className="button-ghost" href={`${base}/learn/faq`}>
          {dict.learn.browseFaq}
        </Link>
      </div>
    </div>
  );
}
