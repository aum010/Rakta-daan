import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LookupForm } from "@/components/demo/demo-request-status";
import { PageHeader } from "@/components/ui/ui";
import { getDictionary, isLocale } from "@/lib/i18n";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return {
    title: `${dict.requestDemo.status.title} — ${dict.common.appName}`,
    robots: { index: false, follow: false },
  };
}

export default async function DemoRequestLookupPage({
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
        title={dict.requestDemo.status.lookupTitle}
        subtitle={dict.requestDemo.status.lookupHint}
        breadcrumbs={[
          { href: base, label: dict.common.appName },
          { href: `${base}/request/new`, label: dict.nav.requestBlood },
          { href: `${base}/request/status`, label: dict.requestDemo.status.title },
        ]}
      />
      <div className="card mt-5 max-w-lg p-5">
        <LookupForm locale={locale} dict={dict} />
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link className="button-primary" href={`${base}/request/new`}>
          {dict.requestDemo.title}
        </Link>
        <Link className="button-secondary" href={`${base}/find`}>
          {dict.find.title}
        </Link>
      </div>
    </div>
  );
}
