import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Callout, PageHeader } from "@/components/ui/ui";
import { getDictionary, isLocale } from "@/lib/i18n";
import {
  ArrowIcon,
  ClipboardIcon,
  HeartIcon,
  InfoIcon,
  LockIcon,
  SearchIcon,
  SettingsIcon,
} from "@/components/ui/icons";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return { title: `${dict.help.title} — ${dict.common.appName}`, description: dict.help.subtitle };
}

export default async function HelpPage({
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
      href: `${base}/find`,
      icon: <SearchIcon className="h-5 w-5" />,
      title: dict.help.searchTitle,
      body: dict.help.searchBody,
    },
    {
      href: `${base}/request/new`,
      icon: <ClipboardIcon className="h-5 w-5" />,
      title: dict.help.requestTitle,
      body: dict.help.requestBody,
    },
    {
      href: `${base}/donor/demo`,
      icon: <HeartIcon className="h-5 w-5" />,
      title: dict.help.donorTitle,
      body: dict.help.donorBody,
    },
    {
      href: `${base}/consent`,
      icon: <LockIcon className="h-5 w-5" />,
      title: dict.help.privacyTitle,
      body: dict.help.privacyBody,
    },
    {
      href: `${base}/abuse`,
      icon: <InfoIcon className="h-5 w-5" />,
      title: dict.help.reportTitle,
      body: dict.help.reportBody,
    },
    {
      href: `${base}/learn/faq`,
      icon: <SettingsIcon className="h-5 w-5" />,
      title: dict.learn.faqTitle,
      body: dict.learn.faqBody,
    },
  ];

  return (
    <div className="container-page max-w-5xl py-8">
      <PageHeader
        eyebrow={dict.help.title}
        title={dict.help.title}
        subtitle={dict.help.subtitle}
        breadcrumbs={[
          { href: base, label: dict.common.appName },
          { href: `${base}/help`, label: dict.help.title },
        ]}
        actions={
          <Link className="button-primary" href={`${base}/contact`}>
            {dict.help.contactCta}
            <ArrowIcon className="h-4 w-4" />
          </Link>
        }
      />

      <div className="mt-5">
        <Callout tone="warning" title={dict.help.emergencyTitle}>
          {dict.help.emergencyBody}
        </Callout>
      </div>

      <section className="mt-6" aria-labelledby="help-cards">
        <h2 id="help-cards" className="text-lg font-semibold">
          {dict.help.cardsTitle}
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <Link key={card.href} className="card card-hover p-4" href={card.href}>
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                {card.icon}
              </span>
              <span className="mt-2 block text-sm font-semibold">{card.title}</span>
              <span className="mt-1 block text-xs leading-relaxed text-muted">{card.body}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-8 card p-5">
        <h2 className="text-lg font-semibold">{dict.help.contactTitle}</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">{dict.help.contactBody}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link className="button-primary" href={`${base}/contact`}>
            {dict.help.contactCta}
          </Link>
          <Link className="button-secondary" href={`${base}/abuse`}>
            {dict.help.reportCta}
          </Link>
          <Link className="button-ghost" href={`${base}/learn/faq`}>
            {dict.help.faqCta}
          </Link>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted">{dict.help.responseTime}</p>
      </section>
    </div>
  );
}
