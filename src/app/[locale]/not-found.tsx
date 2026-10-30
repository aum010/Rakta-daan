"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getDictionary, isLocale } from "@/lib/i18n";

export default function LocaleNotFoundPage() {
  const pathname = usePathname();
  const segment = pathname.split("/").filter(Boolean)[0] ?? "en";
  const locale = isLocale(segment) ? segment : "en";
  const dict = getDictionary(locale);
  const base = `/${locale}`;

  return (
    <div className="container-page flex min-h-[60vh] max-w-2xl flex-col justify-center py-12">
      <div className="card p-6 text-center sm:p-8">
        <p className="font-mono text-xs font-semibold uppercase tracking-widest text-muted">
          404
        </p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{dict.system.notFoundTitle}</h1>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-ink-soft">
          {dict.system.notFoundBody}
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <Link className="button-primary" href={base}>
            {dict.system.backHome}
          </Link>
          <Link className="button-secondary" href={`${base}/find`}>
            {dict.system.findBlood}
          </Link>
        </div>
      </div>
    </div>
  );
}
