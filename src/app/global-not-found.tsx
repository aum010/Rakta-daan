import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

/**
 * The 404 for URLs that match no route at all.
 *
 * The app has no `app/layout.tsx` — the only root layout lives in
 * `app/[locale]/layout.tsx` — so a plain `app/not-found.tsx` was rendered
 * *inside* Next's default document, producing nested `<html>`/`<body>` tags.
 * `global-not-found` bypasses layout rendering entirely and must therefore
 * return a full document, which is exactly what this file does.
 */
export const metadata: Metadata = {
  title: "Page not found — Rakta-Daan",
  description: "The page you are looking for does not exist. Find blood or return home.",
  robots: { index: false, follow: false },
};

export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">
        <main className="container-page flex min-h-dvh max-w-2xl flex-col justify-center py-12">
          <div className="card p-6 text-center sm:p-8">
            <p className="font-mono text-xs font-semibold uppercase tracking-widest text-muted">
              404
            </p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">That page is not here</h1>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-ink-soft">
              The link may be old, mistyped or removed. Choose a language and start again from
              Find Blood.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
              <Link className="button-primary" href="/en">
                English homepage
              </Link>
              <Link className="button-secondary" href="/ne">
                नेपाली गृहपृष्ठ
              </Link>
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-3 text-sm">
              <Link className="font-semibold text-brand-700 hover:underline" href="/en/find">
                Find Blood / रगत खोज्नुहोस्
              </Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
