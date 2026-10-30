import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Callout, PageHeader } from "@/components/ui/ui";
import { getDictionary, isLocale } from "@/lib/i18n";
import { ArrowIcon, CalendarIcon, CheckCircleIcon } from "@/components/ui/icons";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return {
    title: `${dict.learn.guide.title} — ${dict.common.appName}`,
    description: dict.learn.guide.intro,
  };
}

export default async function DonationGuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const base = `/${locale}`;
  const guide = dict.learn.guide;

  const sections = [
    { title: guide.beforeTitle, points: guide.beforePoints },
    { title: guide.duringTitle, points: guide.duringPoints },
    { title: guide.afterTitle, points: guide.afterPoints },
  ];

  return (
    <div className="container-page max-w-3xl py-8">
      <PageHeader
        eyebrow={dict.learn.hubEyebrow}
        title={guide.title}
        subtitle={guide.intro}
        breadcrumbs={[
          { href: base, label: dict.common.appName },
          { href: `${base}/learn`, label: dict.learn.title },
          { href: `${base}/learn/donation-guide`, label: guide.title },
        ]}
        actions={
          <Link className="button-primary" href={`${base}/donor/demo`}>
            {dict.donorDemo.start}
            <ArrowIcon className="h-4 w-4" />
          </Link>
        }
      />

      <div className="mt-5">
        <Callout tone="warning" title={guide.emergencyTitle}>
          {guide.emergencyBody}
        </Callout>
      </div>

      <div className="mt-6 space-y-4">
        {sections.map((section, index) => (
          <section key={section.title} className="card p-5" aria-labelledby={`guide-${index}`}>
            <h2 id={`guide-${index}`} className="flex items-center gap-2 text-lg font-semibold">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 font-mono text-xs font-bold text-brand-700">
                {index + 1}
              </span>
              {section.title}
            </h2>
            <ul className="mt-3 space-y-2">
              {section.points.map((point) => (
                <li key={point} className="flex gap-2.5 text-sm leading-relaxed text-ink-soft">
                  <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="card p-5">
          <h2 className="text-base font-semibold">{guide.eligibilityTitle}</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{guide.eligibilityBody}</p>
        </div>
        <div className="card p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <CalendarIcon className="h-4 w-4 text-brand-600" />
            {guide.intervalTitle}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{guide.intervalBody}</p>
        </div>
        <div className="card p-5 sm:col-span-2">
          <h2 className="text-base font-semibold">{guide.notEligibleTitle}</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{guide.notEligibleBody}</p>
        </div>
      </section>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link className="button-secondary" href={`${base}/camps`}>
          {dict.nav.camps}
        </Link>
        <Link className="button-ghost" href={`${base}/learn/compatibility`}>
          {dict.learn.browseCompatibility}
        </Link>
      </div>
    </div>
  );
}
