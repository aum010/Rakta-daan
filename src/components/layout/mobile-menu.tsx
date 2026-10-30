"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CloseIcon, MenuIcon } from "../ui/icons";

export function MobileMenu({
  links,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  menuLabel,
  closeLabel,
}: {
  links: Array<{ href: string; label: string }>;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  menuLabel: string;
  closeLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        className="button-secondary !min-h-0 !px-3 !py-2"
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={open ? closeLabel : menuLabel}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <CloseIcon /> : <MenuIcon />}
      </button>

      {open ? (
        <div
          id="mobile-nav"
          ref={panelRef}
          className="absolute inset-x-0 top-full z-40 border-b border-line bg-surface p-4 shadow-lg"
        >
          <ul className="flex flex-col gap-1">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block rounded-lg px-3 py-2.5 text-base font-medium hover:bg-surface-muted"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-col gap-2 border-t border-line pt-3">
            <Link
              href={primaryHref}
              className="button-primary w-full"
              onClick={() => setOpen(false)}
            >
              {primaryLabel}
            </Link>
            {secondaryHref && secondaryLabel ? (
              <Link
                href={secondaryHref}
                className="button-secondary w-full"
                onClick={() => setOpen(false)}
              >
                {secondaryLabel}
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
