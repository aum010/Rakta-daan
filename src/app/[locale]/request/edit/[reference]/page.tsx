import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DemoRequestEdit } from "@/components/demo/demo-request-edit";
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
    title: `${dict.requestDemo.updateRequest} — ${dict.common.appName}`,
    robots: { index: false, follow: false },
  };
}

export default async function EditDemoRequestPage({
  params,
}: {
  params: Promise<{ locale: string; reference: string }>;
}) {
  const { locale, reference } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const base = `/${locale}`;

  return (
    <div className="container-page max-w-3xl py-8">
      <PageHeader
        eyebrow={dict.requestDemo.eyebrow}
        title={dict.requestDemo.updateRequest}
        subtitle={dict.requestDemo.reviewCopy}
        breadcrumbs={[
          { href: base, label: dict.common.appName },
          {
            href: `${base}/request/status/${reference}`,
            label: dict.requestDemo.status.title,
          },
          {
            href: `${base}/request/edit/${reference}`,
            label: dict.requestDemo.updateRequest,
          },
        ]}
      />
      <div className="mt-5">
        <DemoRequestEdit locale={locale} dict={dict} reference={reference} />
      </div>
    </div>
  );
}
