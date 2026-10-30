import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrgDemoDashboard } from "@/components/demo/org-demo-dashboard";
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
    title: `${dict.orgDemo.title} — ${dict.common.appName}`,
    description: dict.orgDemo.subtitle,
    robots: { index: false, follow: false },
  };
}

export default async function OrgDemoPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  return <OrgDemoDashboard locale={locale} dict={dict} />;
}
