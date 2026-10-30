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
    title: `${dict.accessibility.title} — ${dict.common.appName}`,
    description: dict.accessibility.subtitle,
  };
}

export default async function AccessibilityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const base = `/${locale}`;
  const copy = dict.accessibility;
  const sections = [
    { title: copy.sections.commitmentTitle, body: copy.sections.commitmentBody },
    { title: copy.sections.measuresTitle, body: copy.sections.measuresBody },
    { title: copy.sections.limitsTitle, body: copy.sections.limitsBody },
  ];

  return (
    <div className="container-page max-w-3xl py-8">
      <PageHeader
        eyebrow={dict.footer.legal}
        title={copy.title}
        subtitle={copy.subtitle}
        breadcrumbs={[
          { href: base, label: dict.common.appName },
          { href: `${base}/accessibility`, label: copy.title },
        ]}
        actions={
          <Link className="button-primary" href={`${base}/contact`}>
            {copy.contactCta}
            <ArrowIcon className="h-4 w-4" />
          </Link>
        }
      />

      <div className="mt-6 space-y-3">
        {sections.map((section) => (
          <section key={section.title} className="card p-5">
            <h2 className="text-base font-semibold">{section.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{section.body}</p>
          </section>
        ))}
        <section className="card p-5">
          <h2 className="text-base font-semibold">{copy.sections.feedbackTitle}</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            {copy.sections.feedbackBody}
          </p>
          <Link className="button-secondary mt-3" href={`${base}/contact`}>
            {copy.contactCta}
          </Link>
        </section>
      </div>

      <div className="mt-5">
        <Callout tone="neutral">{dict.footer.demoNote}</Callout>
      </div>
    </div>
  );
}
