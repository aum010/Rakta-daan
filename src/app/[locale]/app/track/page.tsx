import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TrackDashboard } from "@/components/coordination/track";
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
    title: `${dict.coord.track.title} — ${dict.common.appName}`,
    description: dict.coord.track.subtitle,
    robots: { index: false, follow: false },
  };
}

export default async function TrackPage({
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
        eyebrow={dict.common.demoMode}
        title={dict.coord.track.title}
        subtitle={dict.coord.track.subtitle}
        breadcrumbs={[
          { href: base, label: dict.common.appName },
          { href: `${base}/app`, label: dict.coord.nav.home },
          { href: `${base}/app/track`, label: dict.coord.track.title },
        ]}
      />
      <TrackDashboard locale={locale} dict={dict} />
    </div>
  );
}
