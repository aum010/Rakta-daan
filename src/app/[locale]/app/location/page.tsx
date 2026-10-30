import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LocationPanel } from "@/components/coordination/location";
import { DemoBanner, PageHeader } from "@/components/ui/ui";
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
    title: `${dict.coord.location.title} — ${dict.common.appName}`,
    description: dict.coord.location.subtitle,
    robots: { index: false, follow: false },
  };
}

export default async function LocationPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const base = `/${locale}`;

  return (
    <div className="container-page max-w-3xl py-6 sm:py-8 xl:max-w-6xl">
      <PageHeader
        eyebrow={dict.coord.nav.home}
        title={dict.coord.location.title}
        subtitle={dict.coord.location.subtitle}
        breadcrumbs={[
          { href: base, label: dict.common.appName },
          { href: `${base}/app`, label: dict.coord.nav.home },
          { href: `${base}/app/location`, label: dict.coord.location.title },
        ]}
      />
      <div className="mt-4">
        <DemoBanner>{dict.coord.safety.consentFirst}</DemoBanner>
      </div>
      <LocationPanel dict={dict} locale={locale} />
    </div>
  );
}
