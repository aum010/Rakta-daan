import type { Metadata } from "next";
import "../globals.css";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { BottomNav, BottomNavSpacer } from "@/components/mobile/bottom-nav";
import { getSessionUser } from "@/lib/auth";
import { DEFAULT_LOCALE, getDictionary, htmlLang, isLocale, LOCALES } from "@/lib/i18n";
import { SITE_URL, absoluteUrl } from "@/lib/site";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return {
    title: dict.meta.title,
    description: dict.meta.description,
    applicationName: dict.common.appName,
    category: "health",
    keywords: [
      "blood donation Nepal",
      "blood bank Kathmandu",
      "find blood",
      "रक्तदान",
      "रगत",
      "blood donor",
      "Rakta-Daan",
    ],
    authors: [{ name: "Rakta-Daan" }],
    creator: "Rakta-Daan",
    publisher: "Rakta-Daan",
    referrer: "strict-origin-when-cross-origin",
    formatDetection: { telephone: false, address: false, email: false },
    metadataBase: new URL(SITE_URL),
    alternates: {
      canonical: `/${locale}`,
      languages: {
        "en-NP": "/en",
        "ne-NP": "/ne",
        "x-default": "/en",
      },
    },
    openGraph: {
      title: dict.meta.title,
      description: dict.meta.description,
      type: "website",
      locale: locale === "ne" ? "ne_NP" : "en_NP",
      siteName: dict.common.appName,
      url: absoluteUrl(`/${locale}`),
    },
    twitter: {
      card: "summary",
      title: dict.meta.title,
      description: dict.meta.description,
    },
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      title: dict.common.appName,
      statusBarStyle: "default",
    },
    robots: { index: true, follow: true },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: requested } = await params;
  /*
   * Never call `notFound()` here. There is no `app/layout.tsx`, so this *is*
   * the root layout; throwing from it cannot render a not-found boundary and
   * produces Next's empty error document. Every page under `[locale]` already
   * rejects an unknown locale, which renders `[locale]/not-found.tsx` inside
   * this layout where the chrome and 404 status still work. Here we only
   * normalise the value so the shared chrome can render in the meantime.
   */
  const locale = isLocale(requested) ? requested : DEFAULT_LOCALE;
  const dict = getDictionary(locale);
  const user = await getSessionUser();

  return (
    <html lang={htmlLang(locale)}>
      <body className="min-h-dvh antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2"
        >
          {dict.common.skipToContent}
        </a>
        <SiteHeader locale={locale} dict={dict} user={user} />
        <main id="main">{children}</main>
        {/* The tab bar is fixed to the viewport, and sits before the footer in the
            document so it is never read or tabbed to as "the end of the footer". */}
        <BottomNav locale={locale} dict={dict} />
        <SiteFooter locale={locale} dict={dict} />
        <BottomNavSpacer />
      </body>
    </html>
  );
}
