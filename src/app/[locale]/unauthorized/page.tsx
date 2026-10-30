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
  return { title: `${dict.system.unauthorizedTitle} — ${dict.common.appName}`, robots: { index: false, follow: false } };
}

export default async function UnauthorizedPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const base = `/${locale}`;

  return (
    <SystemState code="401" title={dict.system.unauthorizedTitle} body={dict.system.unauthorizedBody}>
      <Link className="button-primary" href={`${base}/login`}>
        {dict.system.signIn}
      </Link>
      <Link className="button-secondary" href={`${base}/find`}>
        {dict.system.findBlood}
      </Link>
      <Link className="button-ghost" href={base}>
        {dict.system.backHome}
      </Link>
    </SystemState>
  );
}
