import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EmergencyHome } from "@/components/coordination/emergency-home";
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
    title: `${dict.coord.home.title} — ${dict.common.appName}`,
    description: dict.coord.home.intro,
    robots: { index: false, follow: false },
  };
}

export default async function CoordinationHomePage({
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
        eyebrow={dict.coord.home.eyebrow}
        title={dict.coord.home.title}
        subtitle={dict.coord.home.intro}
        breadcrumbs={[
          { href: base, label: dict.common.appName },
          { href: `${base}/app`, label: dict.coord.nav.home },
        ]}
      />
      <EmergencyHome locale={locale} dict={dict} />
    </div>
  );
}
