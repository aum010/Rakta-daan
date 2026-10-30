import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DemoDonorDashboard } from "@/components/demo/demo-donor-dashboard";
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
    title: `${dict.donorDemo.dashboardTitle} — ${dict.common.appName}`,
    robots: { index: false, follow: false },
  };
}

export default async function DonorDemoDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  return <DemoDonorDashboard locale={locale} dict={dict} />;
}
