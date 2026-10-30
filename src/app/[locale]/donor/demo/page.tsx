import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Callout, DemoBanner, PageHeader, SectionHeading } from "@/components/ui/ui";
import { getDictionary, isLocale } from "@/lib/i18n";
import {
  ArrowIcon,
  CalendarIcon,
  CheckCircleIcon,
  HeartIcon,
  LockIcon,
  ShieldIcon,
} from "@/components/ui/icons";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return {
    title: `${dict.donorDemo.landingTitle} — ${dict.common.appName}`,
    description: dict.donorDemo.landingSubtitle,
  };
}

export default async function DonorDemoPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const base = `/${locale}`;

  const benefits = [
    dict.donorDemo.benefitOne,
    dict.donorDemo.benefitTwo,
    dict.donorDemo.benefitThree,
    dict.donorDemo.benefitFour,
  ];

  return (
    <div className="container-page max-w-5xl py-8">
      <PageHeader
        eyebrow={dict.donorDemo.eyebrow}
        title={dict.donorDemo.landingTitle}
        subtitle={dict.donorDemo.landingSubtitle}
        breadcrumbs={[
          { href: base, label: dict.common.appName },
          { href: `${base}/donor/demo`, label: dict.nav.forDonors },
        ]}
        actions={
          <>
            <Link className="button-primary" href={`${base}/donor/demo/register`}>
              {dict.donorDemo.start}
              <ArrowIcon className="h-4 w-4" />
            </Link>
            <Link className="button-secondary" href={`${base}/register`}>
              {dict.donorDemo.signIn}
            </Link>
          </>
        }
      />

      <div className="mt-5">
        <DemoBanner>{dict.donorDemo.demoNotice}</DemoBanner>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="card p-6" aria-labelledby="benefits-title">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-700">
            <HeartIcon className="h-6 w-6" />
          </span>
          <h2 id="benefits-title" className="mt-3 text-xl font-bold">
            {dict.donorDemo.benefitsTitle}
          </h2>
          <ul className="mt-4 space-y-3">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex gap-2.5 text-sm leading-relaxed text-ink-soft">
                <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link className="button-primary" href={`${base}/donor/demo/register`}>
              {dict.donorDemo.start}
            </Link>
            <Link className="button-secondary" href={`${base}/donor/demo/dashboard`}>
              {dict.donorDemo.openDashboard}
            </Link>
          </div>
        </section>

        <div className="space-y-4">
          <section className="card p-5" aria-labelledby="eligibility-title">
            <h2 id="eligibility-title" className="flex items-center gap-2 text-base font-semibold">
              <ShieldIcon className="h-4 w-4 text-brand-600" />
              {dict.donorDemo.eligibilityTitle}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              {dict.donorDemo.eligibilityBody}
            </p>
          </section>

          <section className="card p-5" aria-labelledby="privacy-title">
            <h2 id="privacy-title" className="flex items-center gap-2 text-base font-semibold">
              <LockIcon className="h-4 w-4 text-brand-600" />
              {dict.donorDemo.privacyTitle}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              {dict.donorDemo.privacyBody}
            </p>
          </section>

          <Callout tone="warning" title={dict.home.emergencyTitle}>
            {dict.home.emergencyBody}
          </Callout>
        </div>
      </div>

      <section className="mt-8" aria-labelledby="donor-how">
        <SectionHeading
          id="donor-how"
          eyebrow={dict.donorDemo.eyebrow}
          title={dict.requestDemo.nextStepsTitle}
          copy={dict.donorDemo.dashboardSubtitle}
          action={
            <Link className="button-secondary" href={`${base}/learn/donation-guide`}>
              {dict.common.readGuide}
            </Link>
          }
        />
        <ol className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            { icon: <CalendarIcon className="h-5 w-5" />, text: dict.donorDemo.stepAbout },
            { icon: <HeartIcon className="h-5 w-5" />, text: dict.donorDemo.stepAvailability },
            { icon: <ShieldIcon className="h-5 w-5" />, text: dict.donorDemo.stepConsent },
          ].map((step, index) => (
            <li key={step.text} className="card p-4">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <span className="text-brand-600">{step.icon}</span>
                <span className="font-mono text-xs text-muted">0{index + 1}</span>
                {step.text}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Link className="button-primary" href={`${base}/donor/demo/register`}>
          {dict.donorDemo.start}
          <ArrowIcon className="h-4 w-4" />
        </Link>
        <Link className="button-ghost" href={`${base}/find`}>
          {dict.nav.findBlood}
        </Link>
        <Badge tone="info">{dict.common.demoMode}</Badge>
      </div>
    </div>
  );
}
