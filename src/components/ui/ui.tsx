import type { ReactNode } from "react";
import Link from "next/link";
import { AlertIcon, ArrowIcon, ChevronRightIcon, InfoIcon } from "./icons";

export type BadgeTone = "brand" | "teal" | "amber" | "danger" | "neutral" | "info";

const TONES: Record<BadgeTone, string> = {
  brand: "bg-brand-50 text-brand-700 border-brand-200",
  teal: "bg-teal-50 text-teal-700 border-teal-700/20",
  amber: "bg-amber-50 text-amber-700 border-amber-700/25",
  danger: "bg-danger-50 text-danger-700 border-danger-700/25",
  neutral: "bg-surface-muted text-ink-soft border-line-strong",
  info: "bg-info-50 text-info-700 border-info-700/20",
};

export function Badge({
  children,
  tone = "neutral",
  title,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  title?: string;
}) {
  return (
    <span className={`badge ${TONES[tone]}`} title={title}>
      {children}
    </span>
  );
}

export function Callout({
  tone = "info",
  title,
  children,
  role,
}: {
  tone?: "info" | "warning" | "danger" | "success" | "neutral";
  title?: string;
  children: ReactNode;
  role?: "alert" | "status";
}) {
  const styles = {
    info: "border-line-strong bg-surface",
    warning: "border-amber-700/25 bg-amber-50 text-amber-800",
    danger: "border-danger-700/25 bg-danger-50 text-danger-700",
    success: "border-teal-700/20 bg-teal-50 text-teal-700",
    neutral: "border-line bg-surface-muted",
  } as const;
  return (
    <div
      role={role}
      className={`rounded-xl border p-4 text-sm leading-relaxed ${styles[tone]}`}
    >
      {title ? <p className="font-semibold">{title}</p> : null}
      <div className={title ? "mt-1" : ""}>{children}</div>
    </div>
  );
}

export type Crumb = { href: string; label: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${item.href}-${item.label}`} className="flex items-center gap-1.5">
              {last ? (
                <span aria-current="page" className="font-medium text-ink-soft">
                  {item.label}
                </span>
              ) : (
                <Link className="hover:text-ink hover:underline" href={item.href}>
                  {item.label}
                </Link>
              )}
              {last ? null : <ChevronRightIcon className="h-3 w-3 text-line-strong" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow,
  breadcrumbs,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  eyebrow?: string;
  breadcrumbs?: Crumb[];
}) {
  return (
    <div>
      {breadcrumbs ? <Breadcrumbs items={breadcrumbs} /> : null}
      {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
      <div className="flex flex-col gap-3 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
          {subtitle ? (
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">{subtitle}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

export function SectionHeading({
  title,
  copy,
  eyebrow,
  action,
  id,
}: {
  title: string;
  copy?: string;
  eyebrow?: string;
  action?: ReactNode;
  id?: string;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
        <h2 id={id} className="section-title">
          {title}
        </h2>
        {copy ? <p className="section-copy mt-2 text-sm sm:text-base">{copy}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function TextLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 font-semibold text-brand-700 underline-offset-4 hover:underline ${className}`}
    >
      {children}
      <ArrowIcon className="h-3.5 w-3.5" />
    </Link>
  );
}

export function EmptyState({
  title,
  children,
  icon,
}: {
  title: string;
  children?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-line-strong bg-surface/60 p-6 text-center">
      {icon ? <div className="mx-auto mb-2 flex justify-center text-brand-600">{icon}</div> : null}
      <p className="font-medium">{title}</p>
      {children ? <div className="mt-2 text-sm text-muted">{children}</div> : null}
    </div>
  );
}

export function DemoBanner({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={`demo-banner ${className}`} role="note">
      <InfoIcon className="h-4 w-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

export function EmergencyNote({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-700/20 bg-amber-50 p-4 text-sm leading-relaxed text-amber-800">
      <AlertIcon className="mt-0.5 h-5 w-5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
      {hint ? <p className="mt-1 text-xs leading-relaxed text-muted">{hint}</p> : null}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton ${className}`} />;
}

export function LoadingBlock({
  label = "Loading…",
  rows = 3,
}: {
  label?: string;
  rows?: number;
}) {
  return (
    <div role="status" aria-live="polite" className="space-y-3">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="card p-4">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="mt-2 h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}

export function Pagination({
  page,
  totalPages,
  hrefForPage,
  labels,
}: {
  page: number;
  totalPages: number;
  hrefForPage: (page: number) => string;
  labels: { previous: string; next: string; page: string };
}) {
  if (totalPages <= 1) return null;
  const previous = Math.max(1, page - 1);
  const next = Math.min(totalPages, page + 1);
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3 pt-4">
      <Link
        href={hrefForPage(previous)}
        aria-disabled={page === 1}
        className={`button-secondary !min-h-0 !py-2 text-sm ${page === 1 ? "pointer-events-none opacity-50" : ""}`}
      >
        {labels.previous}
      </Link>
      <p className="text-xs text-muted">
        {labels.page} {page} / {totalPages}
      </p>
      <Link
        href={hrefForPage(next)}
        aria-disabled={page === totalPages}
        className={`button-secondary !min-h-0 !py-2 text-sm ${page === totalPages ? "pointer-events-none opacity-50" : ""}`}
      >
        {labels.next}
      </Link>
    </nav>
  );
}
