"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getDictionary, isLocale } from "@/lib/i18n";
import { Callout } from "@/components/ui/ui";

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pathname = usePathname();
  const segment = pathname.split("/").filter(Boolean)[0] ?? "en";
  const locale = isLocale(segment) ? segment : "en";
  const dict = getDictionary(locale);

  return (
    <div className="container-page flex min-h-[60vh] max-w-2xl flex-col justify-center py-12">
      <div className="card p-6 text-center sm:p-8">
        <p className="font-mono text-xs font-semibold uppercase tracking-widest text-muted">500</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{dict.system.serverErrorTitle}</h1>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-ink-soft">
          {dict.system.serverErrorBody}
        </p>
        {error.digest ? (
          <p className="mt-3 font-mono text-xs text-muted">Ref: {error.digest}</p>
        ) : null}
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <button type="button" className="button-primary" onClick={reset}>
            {dict.system.retry}
          </button>
          <Link className="button-secondary" href={`/${locale}`}>
            {dict.system.backHome}
          </Link>
        </div>
        <div className="mt-5 text-left">
          <Callout tone="warning" title={dict.home.emergencyTitle}>
            {dict.home.emergencyBody}
          </Callout>
        </div>
      </div>
    </div>
  );
}
