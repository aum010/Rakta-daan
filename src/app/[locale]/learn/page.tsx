import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, SectionHeading } from "@/components/ui/ui";
import { getDictionary, isLocale } from "@/lib/i18n";
import {
  ArrowIcon,
  BookIcon,
  CheckCircleIcon,
  ClipboardIcon,
  HeartIcon,
  InfoIcon,
  LockIcon,
  ShieldIcon,
  UsersIcon,
} from "@/components/ui/icons";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return { title: `${dict.learn.title} — ${dict.common.appName}`, description: dict.learn.subtitle };
}

export default async function LearnPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const base = `/${locale}`;

  const cards = [
    {
      href: `${base}/learn/donation-guide`,
      icon: <HeartIcon className="h-6 w-6" />,
      title: dict.learn.guideTitle,
      body: dict.learn.guideBody,
      cta: dict.learn.browseGuide,
    },
    {
      href: `${base}/learn/faq`,
      icon: <ClipboardIcon className="h-6 w-6" />,
      title: dict.learn.faqTitle,
      body: dict.learn.faqBody,
      cta: dict.learn.browseFaq,
    },
    {
      href: `${base}/learn/compatibility`,
      icon: <BookIcon className="h-6 w-6" />,
      title: dict.learn.compatibilityTitle,
      body: dict.learn.compatibilityBody,
      cta: dict.learn.browseCompatibility,
    },
    {
      href: `${base}/safety`,
      icon: <ShieldIcon className="h-6 w-6" />,
      title: dict.learn.safetyTitle,
      body: dict.learn.safetyBody,
      cta: dict.learn.browseSafety,
    },
    {
      href: `${base}/consent`,
      icon: <LockIcon className="h-6 w-6" />,
      title: dict.consent.title,
      body: dict.learn.privacyBody,
      cta: dict.common.learnMore,
    },
    {
      href: `${base}/accessibility`,
      icon: <InfoIcon className="h-6 w-6" />,
      title: dict.accessibility.title,
      body: dict.accessibility.subtitle,
      cta: dict.common.learnMore,
    },
  ];

  return (
    <div className="container-page max-w-5xl py-8">
      <PageHeader
        eyebrow={dict.learn.hubEyebrow}
        title={dict.learn.title}
        subtitle={dict.learn.subtitle}
        breadcrumbs={[
          { href: base, label: dict.common.appName },
          { href: `${base}/learn`, label: dict.learn.title },
        ]}
        actions={
          <Link className="button-primary" href={`${base}/find`}>
            {dict.nav.findBlood}
            <ArrowIcon className="h-4 w-4" />
          </Link>
        }
      />

      <section className="mt-6 grid gap-4 sm:grid-cols-2" aria-label={dict.learn.title}>
        {cards.map((card) => (
          <article key={card.href} className="card card-hover flex flex-col p-5">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-700">
              {card.icon}
            </span>
            <h2 className="mt-3 text-lg font-semibold">{card.title}</h2>
            <p className="mt-1.5 flex-1 text-sm leading-relaxed text-ink-soft">{card.body}</p>
            <Link
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"
              href={card.href}
            >
              {card.cta}
              <ArrowIcon className="h-3.5 w-3.5" />
            </Link>
          </article>
        ))}
      </section>

      <section className="mt-8" aria-labelledby="learn-next">
        <SectionHeading
          id="learn-next"
          title={dict.learn.quickLinks}
          copy={dict.home.trustReportedBody}
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Link className="card card-hover p-4" href={`${base}/find`}>
            <span className="flex items-center gap-2 text-sm font-semibold">
              <CheckCircleIcon className="h-4 w-4 text-brand-600" />
              {dict.nav.findBlood}
            </span>
            <span className="mt-1 block text-xs leading-relaxed text-muted">
              {dict.find.subtitle}
            </span>
          </Link>
          <Link className="card card-hover p-4" href={`${base}/camps`}>
            <span className="flex items-center gap-2 text-sm font-semibold">
              <UsersIcon className="h-4 w-4 text-brand-600" />
              {dict.nav.camps}
            </span>
            <span className="mt-1 block text-xs leading-relaxed text-muted">
              {dict.camps.subtitle}
            </span>
          </Link>
          <Link className="card card-hover p-4" href={`${base}/donor/demo`}>
            <span className="flex items-center gap-2 text-sm font-semibold">
              <HeartIcon className="h-4 w-4 text-brand-600" />
              {dict.nav.forDonors}
            </span>
            <span className="mt-1 block text-xs leading-relaxed text-muted">
              {dict.donorDemo.landingSubtitle}
            </span>
          </Link>
        </div>
      </section>

      <p className="mt-8 text-xs leading-relaxed text-muted">{dict.home.disclaimer}</p>
    </div>
  );
}
