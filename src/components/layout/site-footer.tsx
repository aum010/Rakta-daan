import Link from "next/link";
import type { Dictionary } from "@/messages/en";
import type { Locale } from "@/lib/i18n";

export function SiteFooter({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const base = `/${locale}`;

  const columns = [
    {
      title: dict.footer.product,
      links: [
        { href: `${base}/find`, label: dict.nav.findBlood },
        { href: `${base}/request/new`, label: dict.nav.requestBlood },
        { href: `${base}/banks`, label: dict.nav.bloodBanks },
        { href: `${base}/camps`, label: dict.nav.camps },
      ],
    },
    {
      title: dict.nav.learn,
      links: [
        { href: `${base}/learn/donation-guide`, label: dict.learn.guideTitle },
        { href: `${base}/learn/faq`, label: dict.learn.faqTitle },
        { href: `${base}/learn/compatibility`, label: dict.learn.compatibilityTitle },
        { href: `${base}/safety`, label: dict.common.safety },
      ],
    },
    {
      title: dict.footer.legal,
      links: [
        { href: `${base}/privacy`, label: dict.common.privacy },
        { href: `${base}/consent`, label: dict.consent.title },
        { href: `${base}/terms`, label: dict.common.terms },
        { href: `${base}/accessibility`, label: dict.accessibility.title },
      ],
    },
    {
      title: dict.footer.support,
      links: [
        { href: `${base}/help`, label: dict.nav.help },
        { href: `${base}/contact`, label: dict.footer.support },
        { href: `${base}/for-organisations`, label: dict.footer.organisations },
        { href: `${base}/org/demo`, label: dict.nav.orgPreview },
        { href: `${base}/admin/demo`, label: dict.nav.adminPreview },
      ],
    },
  ];

  return (
    <footer className="mt-16 border-t border-line bg-surface-muted/60">
      <div className="container-page grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-6">
        <div className="lg:col-span-2">
          <Link href={base} className="text-base font-semibold">
            {dict.common.appName}
          </Link>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
            {dict.footer.aboutText}
          </p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
            {dict.footer.builtFor}
          </p>
          <p className="mt-3 inline-flex rounded-lg border border-amber-700/20 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
            {dict.common.demoMode}
          </p>
        </div>

        {columns.map((column) => (
          <div key={column.title}>
            <p className="text-sm font-semibold">{column.title}</p>
            <ul className="mt-2 space-y-1.5 text-sm text-muted">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link className="hover:text-ink" href={link.href}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="container-page flex flex-col gap-2 py-4 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>{dict.footer.dataNote}</p>
          <p>
            © {new Date().getFullYear()} {dict.common.appName}
          </p>
        </div>
      </div>
      <div className="border-t border-line bg-surface/60">
        <p className="container-page py-3 text-xs leading-relaxed text-muted">
          {dict.footer.demoNote}
        </p>
      </div>
    </footer>
  );
}
