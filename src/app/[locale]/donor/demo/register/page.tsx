import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DemoDonorRegistration } from "@/components/demo/demo-donor-registration";
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
    title: `${dict.donorDemo.registerTitle} — ${dict.common.appName}`,
    description: dict.donorDemo.registerSubtitle,
    robots: { index: false, follow: false },
  };
}

export default async function DonorDemoRegisterPage({
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
        eyebrow={dict.donorDemo.eyebrow}
        title={dict.donorDemo.registerTitle}
        subtitle={dict.donorDemo.registerSubtitle}
        breadcrumbs={[
          { href: base, label: dict.common.appName },
          { href: `${base}/donor/demo`, label: dict.nav.forDonors },
          { href: `${base}/donor/demo/register`, label: dict.donorDemo.registerTitle },
        ]}
      />
      <div className="mt-5">
        <DemoDonorRegistration locale={locale} dict={dict} />
      </div>
    </div>
  );
}
