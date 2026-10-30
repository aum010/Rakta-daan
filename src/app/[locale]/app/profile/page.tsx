import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProfilePanel } from "@/components/coordination/profile";
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
    title: `${dict.coord.profile.title} — ${dict.common.appName}`,
    description: dict.coord.profile.subtitle,
    robots: { index: false, follow: false },
  };
}

/**
 * Profile tab — the fifth and final item in the persistent bottom navigation.
 *
 * There is no account system in this frontend-only phase, so "profile" means
 * the current coordination view, consent state, and the secondary sections of
 * the site. Everything here is browser-local demonstration state.
 */
export default async function ProfilePage({
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
        title={dict.coord.profile.title}
        subtitle={dict.coord.profile.subtitle}
        breadcrumbs={[
          { href: base, label: dict.common.appName },
          { href: `${base}/app`, label: dict.coord.nav.home },
          { href: `${base}/app/profile`, label: dict.coord.profile.title },
        ]}
      />
      <ProfilePanel locale={locale} dict={dict} />
    </div>
  );
}
