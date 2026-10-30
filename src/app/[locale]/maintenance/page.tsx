import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SystemState } from "@/components/ui/system-state";
import { getDictionary, isLocale } from "@/lib/i18n";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return { title: `${dict.system.maintenanceTitle} — ${dict.common.appName}`, robots: { index: false, follow: false } };
}

export default async function MaintenancePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const base = `/${locale}`;

  return (
    <SystemState
      code="503"
      tone="warning"
      title={dict.system.maintenanceTitle}
      body={dict.system.maintenanceBody}
    >
      <Link className="button-primary" href={`${base}/find`}>
        {dict.system.findBlood}
      </Link>
      <Link className="button-secondary" href={`${base}/contact`}>
        {dict.system.contactSupport}
      </Link>
    </SystemState>
  );
}
