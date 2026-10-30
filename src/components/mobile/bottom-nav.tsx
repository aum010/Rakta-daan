"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/messages/en";
import {
  AlertIcon,
  ClipboardIcon,
  DropletIcon,
  SearchIcon,
  UserIcon,
} from "@/components/ui/icons";

type TabDef = {
  key: string;
  label: string;
  href: string;
  Icon: typeof DropletIcon;
};

/**
 * Persistent bottom tab bar — always fixed to the bottom of the viewport.
 *
 * The five sections (Home, Find, Request, Track, Profile) are the same for
 * every role so the bar never reshuffles under the user's thumb, and it is
 * pinned from the first pixel of scroll rather than sitting at the end of the
 * document footer. It behaves like a native tab bar:
 *
 *  - `fixed` and opaque, so scrolled content never shows through it,
 *  - stacked above page content (`z-50`),
 *  - clearing the iOS/Android home indicator with `env(safe-area-inset-bottom)`,
 *  - the current section carries `aria-current="page"`.
 *
 * A spacer of exactly the same height closes the document (rendered separately as
 * `BottomNavSpacer`, after the site footer) so the footer never sits underneath
 * the bar. Secondary destinations live on the Profile page and in the header
 * menu, keeping the bar to five readable targets.
 *
 * The geometry is set **inline** as well as through the utilities. `.fixed`,
 * `.inset-x-0`, `.bottom-0` and `.z-50` only exist if the stylesheet that was
 * compiled for this component is the one the browser actually loaded; a stale
 * cached chunk would leave the bar as an ordinary block at the end of the
 * document — below the footer, reachable only by scrolling to the very end.
 * Inline styles are part of the HTML itself, so the bar pins to the viewport no
 * matter which stylesheet arrives with it.
 */
export function BottomNav({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const pathname = usePathname();

  const tabs: TabDef[] = [
    { key: "home", label: dict.coord.nav.home, href: `/${locale}/app`, Icon: DropletIcon },
    { key: "find", label: dict.coord.nav.find, href: `/${locale}/find`, Icon: SearchIcon },
    {
      key: "request",
      label: dict.coord.nav.request,
      href: `/${locale}/request/new`,
      Icon: AlertIcon,
    },
    {
      key: "track",
      label: dict.coord.nav.track,
      href: `/${locale}/app/track`,
      Icon: ClipboardIcon,
    },
    {
      key: "profile",
      label: dict.coord.nav.profile,
      href: `/${locale}/app/profile`,
      Icon: UserIcon,
    },
  ];

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <nav
        aria-label={dict.coord.nav.label}
        className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-surface shadow-[0_-3px_14px_rgba(15,23,42,0.10)]"
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 50,
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {/* The five targets stay centred, and breathe out as the viewport does —
            a 512px strip stretched across a 1440px desktop reads as a stray
            phone widget rather than a navigation bar. */}
        <ul className="mx-auto flex max-w-lg items-stretch justify-between px-1 md:max-w-2xl md:px-2 xl:max-w-4xl xl:px-4">
          {tabs.map(({ key, label, href, Icon }) => {
            const active = isActive(href);
            return (
              <li key={key} className="min-w-0 flex-1">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-16 flex-col items-center justify-center gap-1 px-1 py-2 text-center md:min-h-[4.5rem] ${
                    active ? "text-brand-600" : "text-muted hover:text-ink"
                  }`}
                >
                  <Icon className="h-5 w-5 md:h-6 md:w-6" />
                  <span className="truncate text-[11px] font-medium leading-tight md:text-xs">
                    {label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

/**
 * Reserve exactly the bar's height at the end of the document.
 *
 * Rendered after the site footer so the footer stops where the bar begins.
 */
export function BottomNavSpacer() {
  return (
    <div
      aria-hidden="true"
      style={{ height: "calc(1px + 4rem + env(safe-area-inset-bottom))" }}
    />
  );
}
