import Link from "next/link";
import type { Dictionary } from "@/messages/en";
import type { Locale } from "@/lib/i18n";
import type { SessionUser } from "@/lib/auth";
import { DropletIcon, HeartIcon, SearchIcon } from "../ui/icons";
import { LanguageSwitcher } from "./language-switcher";
import { MobileMenu } from "./mobile-menu";

export function SiteHeader({
  locale,
  dict,
  user,
}: {
  locale: Locale;
  dict: Dictionary;
  user: SessionUser | null;
}) {
  const base = `/${locale}`;
  const links = [
    { href: `${base}/banks`, label: dict.nav.bloodBanks },
    { href: `${base}/camps`, label: dict.nav.camps },
    { href: `${base}/donor/demo`, label: dict.nav.forDonors },
    { href: `${base}/learn`, label: dict.nav.learn },
    { href: `${base}/help`, label: dict.nav.help },
  ];
  const mobileLinks = [
    { href: `${base}/find`, label: dict.home.ctaFind },
    { href: `${base}/request/new`, label: dict.nav.requestBlood },
    { href: `${base}/banks`, label: dict.nav.bloodBanks },
    { href: `${base}/camps`, label: dict.nav.camps },
    { href: `${base}/donor/demo`, label: dict.nav.forDonors },
    { href: `${base}/learn`, label: dict.nav.learn },
    { href: `${base}/help`, label: dict.nav.help },
    { href: `${base}/contact`, label: dict.footer.support },
    { href: `${base}/consent`, label: dict.consent.title },
    { href: `${base}/accessibility`, label: dict.accessibility.title },
    { href: `${base}/org/demo`, label: dict.nav.orgPreview },
    { href: `${base}/admin/demo`, label: dict.nav.adminPreview },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/95 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-3">
        <Link
          href={base}
          className="flex shrink-0 items-center gap-2 font-semibold tracking-tight"
          aria-label={dict.common.appName}
        >
          <span className="text-brand-600">
            <DropletIcon className="h-7 w-7" />
          </span>
          <span className="text-lg">{dict.common.appName}</span>
        </Link>

        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-0.5">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="rounded-lg px-2.5 py-2 text-sm font-medium text-ink-soft hover:bg-surface-muted"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-1.5">
          <LanguageSwitcher locale={locale} label={dict.common.language} />
          <Link
            href={user ? `${base}/dashboard` : `${base}/login`}
            className="hidden rounded-lg px-2.5 py-2 text-sm font-semibold text-ink-soft hover:bg-surface-muted sm:block"
          >
            {user ? dict.common.dashboard : dict.common.signIn}
          </Link>
          <Link
            href={`${base}/find`}
            className="button-primary hidden !min-h-0 !px-3.5 !py-2 text-sm sm:inline-flex"
          >
            <SearchIcon className="h-4 w-4" />
            {dict.home.ctaFind}
          </Link>
          <Link
            href={`${base}/donor/demo`}
            className="button-secondary !min-h-0 !px-3 !py-2 text-sm lg:hidden"
            aria-label={dict.nav.becomeDonor}
          >
            <HeartIcon className="h-4 w-4" />
            <span className="hidden sm:inline">{dict.nav.becomeDonor}</span>
          </Link>
          <MobileMenu
            links={mobileLinks}
            primaryHref={`${base}/find`}
            primaryLabel={dict.home.ctaFind}
            secondaryHref={`${base}/donor/demo`}
            secondaryLabel={dict.nav.becomeDonor}
            menuLabel={dict.nav.menu}
            closeLabel={dict.common.close}
          />
        </div>
      </div>
    </header>
  );
}
