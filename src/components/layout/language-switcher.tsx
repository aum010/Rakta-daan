"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { switchLocalePath, type Locale } from "@/lib/i18n";

export function LanguageSwitcher({
  locale,
  label,
  className = "",
}: {
  locale: Locale;
  label: string;
  className?: string;
}) {
  const pathname = usePathname() || `/${locale}`;
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const target = switchLocalePath(pathname, locale === "en" ? "ne" : "en");
  const visible = locale === "en" ? "नेपाली" : "English";

  return (
    <Link
      href={query ? `${target}?${query}` : target}
      hrefLang={locale === "en" ? "ne" : "en"}
      lang={locale === "en" ? "ne" : "en"}
      className={`button-ghost text-sm ${className}`}
      /* WCAG 2.5.3: the accessible name must contain the visible label text. */
      aria-label={`${label}: ${visible}`}
      title={label}
    >
      {visible}
    </Link>
  );
}
