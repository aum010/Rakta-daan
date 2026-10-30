import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminDemoDashboard } from "@/components/demo/admin-demo-dashboard";
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
    title: `${dict.adminDemo.title} — ${dict.common.appName}`,
    description: dict.adminDemo.subtitle,
    robots: { index: false, follow: false },
  };
}

export default async function AdminDemoPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  return <AdminDemoDashboard locale={locale} dict={dict} />;
}
