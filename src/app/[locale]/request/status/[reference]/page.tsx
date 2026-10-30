import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DemoRequestStatus } from "@/components/demo/demo-request-status";
import { getDictionary, isLocale } from "@/lib/i18n";
import { isValidDemoReference } from "@/mocks/id";

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

export default async function DemoRequestStatusPage({
  params,
}: {
  params: Promise<{ locale: string; reference: string }>;
}) {
  const { locale, reference } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const normalized = reference.toUpperCase();

  return (
    <DemoRequestStatus
      locale={locale}
      dict={dict}
      reference={isValidDemoReference(normalized) ? normalized : reference}
    />
  );
}
