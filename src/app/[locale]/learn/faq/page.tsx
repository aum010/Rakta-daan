import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Callout, PageHeader } from "@/components/ui/ui";
import { getDictionary, isLocale } from "@/lib/i18n";
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
    title: `${dict.learn.faqTitle} — ${dict.common.appName}`,
    description: dict.learn.faqBody,
  };
}

export default async function FaqPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const base = `/${locale}`;

  return (
    <div className="container-page max-w-3xl py-8">
      <PageHeader
        eyebrow={dict.learn.hubEyebrow}
        title={dict.learn.faqTitle}
        subtitle={dict.learn.faqIntro}
        breadcrumbs={[
          { href: base, label: dict.common.appName },
          { href: `${base}/learn`, label: dict.learn.title },
          { href: `${base}/learn/faq`, label: dict.learn.faqTitle },
        ]}
      />

      <div className="mt-5">
        <Callout tone="warning" title={dict.learn.guide.emergencyTitle}>
          {dict.learn.guide.emergencyBody}
        </Callout>
      </div>

      <div className="mt-6 space-y-3">
        {dict.learn.faqItems.map((item, index) => (
          <details key={item.q} className="faq-item" open={index === 0}>
            <summary>{item.q}</summary>
            <div>
              <p>{item.a}</p>
            </div>
          </details>
        ))}
      </div>

      <div className="card mt-8 p-5">
        <h2 className="text-lg font-semibold">{dict.help.contactTitle}</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">{dict.help.contactBody}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link className="button-primary" href={`${base}/contact`}>
            {dict.help.contactCta}
            <ArrowIcon className="h-4 w-4" />
          </Link>
          <Link className="button-secondary" href={`${base}/help`}>
            {dict.help.title}
          </Link>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link className="button-ghost" href={`${base}/learn`}>
          {dict.learn.backToLearn}
        </Link>
        <Link className="button-ghost" href={`${base}/find`}>
          {dict.nav.findBlood}
        </Link>
      </div>
    </div>
  );
}
