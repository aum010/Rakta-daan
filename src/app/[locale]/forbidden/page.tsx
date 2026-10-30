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
  return { title: `${dict.system.forbiddenTitle} — ${dict.common.appName}`, robots: { index: false, follow: false } };
}

export default async function ForbiddenPage({
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
      code="403"
      tone="warning"
      title={dict.system.forbiddenTitle}
      body={dict.system.forbiddenBody}
    >
      <Link className="button-primary" href={`${base}/contact`}>
        {dict.system.contactSupport}
      </Link>
      <Link className="button-secondary" href={base}>
        {dict.system.backHome}
      </Link>
    </SystemState>
  );
}
