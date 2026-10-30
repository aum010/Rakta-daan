import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Callout, PageHeader } from "@/components/ui/ui";
import { DemoContactForm } from "@/components/demo/demo-contact-form";
import { getDictionary, isLocale } from "@/lib/i18n";
import { ArrowIcon, InfoIcon, UsersIcon } from "@/components/ui/icons";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return {
    title: `${dict.contact.title} — ${dict.common.appName}`,
    description: dict.contact.subtitle,
  };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const base = `/${locale}`;

  return (
    <div className="container-page max-w-4xl py-8">
      <PageHeader
        eyebrow={dict.help.title}
        title={dict.contact.title}
        subtitle={dict.contact.subtitle}
        breadcrumbs={[
          { href: base, label: dict.common.appName },
          { href: `${base}/help`, label: dict.help.title },
          { href: `${base}/contact`, label: dict.contact.title },
        ]}
      />

      <div className="mt-5">
        <Callout tone="warning" title={dict.help.emergencyTitle}>
          {dict.help.emergencyBody}
        </Callout>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <DemoContactForm dict={dict} />

        <aside className="space-y-3">
          <div className="card p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <InfoIcon className="h-4 w-4 text-brand-600" />
              {dict.contact.emailTitle}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-muted">{dict.contact.emailBody}</p>
          </div>
          <div className="card p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <UsersIcon className="h-4 w-4 text-brand-600" />
              {dict.contact.orgTitle}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-muted">{dict.contact.orgBody}</p>
            <Link
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
              href={`${base}/for-organisations`}
            >
              {dict.contact.orgCta}
              <ArrowIcon className="h-3 w-3" />
            </Link>
          </div>
          <div className="card p-4">
            <h2 className="text-sm font-semibold">{dict.learn.faqTitle}</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted">{dict.learn.faqBody}</p>
            <Link
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
              href={`${base}/learn/faq`}
            >
              {dict.learn.browseFaq}
              <ArrowIcon className="h-3 w-3" />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
