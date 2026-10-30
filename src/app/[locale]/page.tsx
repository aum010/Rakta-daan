import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertIcon,
  ArrowIcon,
  BuildingIcon,
  CalendarIcon,
  CheckCircleIcon,
  CheckIcon,
  DropletIcon,
  HeartIcon,
  LockIcon,
  SearchIcon,
  ShieldIcon,
  UsersIcon,
} from "@/components/ui/icons";
import { EmergencySearch } from "@/components/blood-search/emergency-search";
import { EntryLocationCard } from "@/components/coordination/entry-location";
import { Badge, Callout, SectionHeading } from "@/components/ui/ui";
import { getDictionary, isLocale } from "@/lib/i18n";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const base = `/${locale}`;

  const trustPoints = [
    {
      icon: <ShieldIcon className="h-5 w-5" />,
      title: dict.home.trustVerifiedTitle,
      body: dict.home.trustVerifiedBody,
    },
    {
      icon: <CheckIcon className="h-5 w-5" />,
      title: dict.home.trustFreshnessTitle,
      body: dict.home.trustFreshnessBody,
    },
    {
      icon: <UsersIcon className="h-5 w-5" />,
      title: dict.home.trustAvailabilityTitle,
      body: dict.home.trustAvailabilityBody,
    },
    {
      icon: <LockIcon className="h-5 w-5" />,
      title: dict.home.trustPrivacyTitle,
      body: dict.home.trustPrivacyBody,
    },
  ];

  return (
    <>
      {/* First-visit location ask — grants or defers before anything else. */}
      <EntryLocationCard dict={dict} />

      <section className="border-b border-line bg-gradient-to-b from-brand-50 via-canvas to-canvas">
        <div className="container-page grid gap-10 py-10 md:py-16 lg:grid-cols-[1.05fr_1fr] lg:items-start">
          <div>
            <Badge tone="brand">
              <DropletIcon className="h-4 w-4" />
              {dict.home.eyebrow}
            </Badge>
            <h1 className="mt-4 text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-6xl">
              {dict.home.heroTitle}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg">
              {dict.home.heroSubtitle}
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link href={`${base}/find`} className="button-primary">
                {dict.home.ctaFind}
                <ArrowIcon />
              </Link>
              <Link href={`${base}/donor/demo`} className="button-secondary">
                <HeartIcon className="h-4 w-4" />
                {dict.home.ctaDonate}
              </Link>
              <Link href={`${base}/banks`} className="button-ghost">
                {dict.home.ctaBanks}
              </Link>
            </div>

            <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium text-muted">
              {[dict.home.heroTrustNoApp, dict.home.heroTrustNoAccount, dict.home.heroTrustPrivate].map(
                (item) => (
                  <li key={item} className="flex items-center gap-1.5">
                    <CheckCircleIcon className="h-3.5 w-3.5 text-teal-700" />
                    {item}
                  </li>
                ),
              )}
            </ul>

            <div className="mt-6">
              <Callout tone="warning" title={dict.home.emergencyTitle}>
                {dict.home.emergencyBody}
              </Callout>
            </div>
          </div>

          <div className="card p-5 sm:p-6" id="home-search">
            <h2 className="text-xl font-bold">{dict.home.heroSearchTitle}</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">{dict.home.heroSearchCopy}</p>
            <div className="mt-4">
              <EmergencySearch locale={locale} dict={dict} />
            </div>
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-surface-muted p-3 text-xs leading-relaxed text-muted">
              <LockIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {dict.find.kAnonymityNote}
            </div>
            <Link
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline"
              href={`${base}/find/guidance`}
            >
              {dict.find.notSureLabel}?
              <ArrowIcon className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      <section className="container-page py-10" aria-labelledby="home-quick">
        <SectionHeading id="home-quick" title={dict.home.quickTitle} />
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Link className="card card-hover flex items-start gap-3 p-5" href={`${base}/find`}>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
              <SearchIcon className="h-6 w-6" />
            </span>
            <span className="min-w-0">
              <span className="block text-base font-semibold">{dict.home.ctaBanks}</span>
              <span className="mt-1 block text-sm leading-relaxed text-ink-soft">
                {dict.find.subtitle}
              </span>
            </span>
          </Link>
          <Link className="card card-hover flex items-start gap-3 p-5" href={`${base}/register`}>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
              <HeartIcon className="h-6 w-6" />
            </span>
            <span className="min-w-0">
              <span className="block text-base font-semibold">{dict.home.ctaDonate}</span>
              <span className="mt-1 block text-sm leading-relaxed text-ink-soft">
                {dict.home.donorBody}
              </span>
            </span>
          </Link>
        </div>
      </section>

      <section className="border-y border-line bg-surface-muted/50" aria-labelledby="home-steps">
        <div className="container-page py-10">
          <SectionHeading
            id="home-steps"
            title={dict.home.howTitle}
            copy={dict.home.howSubtitle}
          />
          <ol className="mt-5 grid gap-4 md:grid-cols-3">
            {[
              { title: dict.home.step1Title, body: dict.home.step1Body },
              { title: dict.home.step2Title, body: dict.home.step2Body },
              { title: dict.home.step3Title, body: dict.home.step3Body },
            ].map((step, index) => (
              <li key={step.title} className="card p-5">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                  {index + 1}
                </span>
                <h3 className="mt-3 text-base font-semibold">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{step.body}</p>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs leading-relaxed text-muted">{dict.home.howNote}</p>
        </div>
      </section>

      <section className="container-page py-10" aria-labelledby="home-trust">
        <SectionHeading
          id="home-trust"
          eyebrow={dict.home.trustTitle}
          title={dict.home.trustTitle}
          copy={dict.home.trustSubtitle}
        />
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {trustPoints.map((point) => (
            <li key={point.title} className="card p-5">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-teal-50 text-teal-700">
                {point.icon}
              </span>
              <h3 className="mt-2 text-sm font-semibold">{point.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{point.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-y border-line bg-surface-muted/50">
        <div className="container-page grid gap-4 py-10 lg:grid-cols-2">
          <article className="card p-6">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-700">
              <BuildingIcon className="h-6 w-6" />
            </span>
            <h2 className="mt-3 text-xl font-bold">{dict.home.banksTitle}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{dict.home.banksBody}</p>
            <Link className="button-secondary mt-4" href={`${base}/banks`}>
              {dict.home.banksCta}
              <ArrowIcon className="h-4 w-4" />
            </Link>
          </article>

          <article className="card p-6">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-700">
              <CalendarIcon className="h-6 w-6" />
            </span>
            <h2 className="mt-3 text-xl font-bold">{dict.home.campsTitle}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{dict.home.campsBody}</p>
            <Link className="button-secondary mt-4" href={`${base}/camps`}>
              {dict.home.campsCta}
              <ArrowIcon className="h-4 w-4" />
            </Link>
          </article>
        </div>
      </section>

      <section className="container-page py-10" aria-labelledby="home-learn">
        <SectionHeading
          id="home-learn"
          eyebrow={dict.learn.hubEyebrow}
          title={dict.home.faqTitle}
          copy={dict.home.faqSubtitle}
          action={
            <Link className="button-secondary" href={`${base}/learn`}>
              {dict.home.faqCta}
              <ArrowIcon className="h-4 w-4" />
            </Link>
          }
        />
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            {
              href: `${base}/learn/donation-guide`,
              title: dict.learn.guideTitle,
              body: dict.learn.guideBody,
            },
            {
              href: `${base}/learn/compatibility`,
              title: dict.learn.compatibilityTitle,
              body: dict.learn.compatibilityBody,
            },
            {
              href: `${base}/safety`,
              title: dict.home.safetyTitle,
              body: dict.home.safetyBody,
            },
          ].map((item) => (
            <Link key={item.href} className="card card-hover p-5" href={item.href}>
              <h3 className="text-sm font-semibold">{item.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{item.body}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-700">
                {dict.common.readMore}
                <ArrowIcon className="h-3 w-3" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="container-page pb-10">
        <div className="card flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <AlertIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div className="max-w-2xl">
              <h2 className="text-lg font-bold">{dict.home.supportTitle}</h2>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">{dict.home.supportBody}</p>
            </div>
          </div>
          <Link className="button-secondary shrink-0" href={`${base}/help`}>
            {dict.home.supportCta}
            <ArrowIcon className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="container-page pb-10">
        <div className="card flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-xl font-bold sm:text-2xl">{dict.home.forBanksTitle}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
              {dict.home.forBanksBody}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link href={`${base}/for-organisations`} className="button-secondary">
              {dict.home.forBanksCta}
              <ArrowIcon />
            </Link>
            <Link href={`${base}/org/demo`} className="button-ghost">
              {dict.orgDemo.title}
            </Link>
          </div>
        </div>
        <p className="mx-auto mt-6 max-w-3xl text-center text-xs leading-relaxed text-muted">
          {dict.home.disclaimer}
        </p>
        <p className="mx-auto mt-2 max-w-3xl text-center text-xs leading-relaxed text-muted">
          {dict.footer.demoNote}
        </p>
      </section>
    </>
  );
}
