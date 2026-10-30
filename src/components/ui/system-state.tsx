import type { ReactNode } from "react";
import Link from "next/link";
import { AlertIcon } from "./icons";

export function SystemState({
  title,
  body,
  code,
  children,
  tone = "neutral",
}: {
  title: string;
  body: string;
  code?: string;
  children?: ReactNode;
  tone?: "neutral" | "warning" | "danger";
}) {
  const palette =
    tone === "danger"
      ? "bg-danger-50 text-danger-700 border-danger-700/20"
      : tone === "warning"
        ? "bg-amber-50 text-amber-700 border-amber-700/25"
        : "bg-brand-50 text-brand-700 border-brand-200";

  return (
    <div className="container-page flex min-h-[60vh] max-w-2xl flex-col justify-center py-12">
      <div className="card p-6 text-center sm:p-8">
        <span
          className={`mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full border ${palette}`}
        >
          <AlertIcon className="h-7 w-7" />
        </span>
        {code ? (
          <p className="mt-4 font-mono text-xs font-semibold uppercase tracking-widest text-muted">
            {code}
          </p>
        ) : null}
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{title}</h1>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-ink-soft">{body}</p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">{children}</div>
      </div>
    </div>
  );
}

export function HomeLink({ href, label }: { href: string; label: string }) {
  return (
    <Link className="button-primary" href={href}>
      {label}
    </Link>
  );
}
