"use client";

import { useState } from "react";
import Link from "next/link";
import { format, type Locale } from "@/lib/i18n";
import type { Dictionary } from "@/messages/en";
import {
  updateCoordination,
  useCoordination,
  type CoordinationRole,
} from "@/lib/coordination/store";
import { candidateById } from "@/lib/coordination/candidates";
import { bloodGroupShort } from "@/lib/blood";
import { DISTRICT_BY_CODE } from "@/data/geography";
import { Badge, SectionHeading } from "@/components/ui/ui";
import { eligibilityLabel } from "./status";
import {
  AlertIcon,
  BookIcon,
  BuildingIcon,
  CalendarIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  ClipboardIcon,
  DropletIcon,
  InfoIcon,
  LockIcon,
  SearchIcon,
  SettingsIcon,
  ShieldIcon,
  UsersIcon,
} from "@/components/ui/icons";

/**
 * Downscale an image on the client and return a JPEG data URL.
 * Returns `null` when the file cannot be decoded, so a bad file never throws
 * into the render path.
 */
function readImageFile(file: File, maxPx: number): Promise<string | null> {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/")) {
      resolve(null);
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => resolve(null);
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => resolve(null);
      image.onload = () => {
        const scale = Math.min(1, maxPx / Math.max(image.width, image.height) || 1);
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (!context) {
          resolve(null);
          return;
        }
        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.src = String(reader.result ?? "");
    };
    reader.readAsDataURL(file);
  });
}

function Accordion({
  title,
  hint,
  defaultOpen = false,
  children,
}: {
  title: string;
  hint?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details open={defaultOpen} className="card overflow-hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-sm font-semibold [&::-webkit-details-marker]:hidden hover:bg-surface-muted">
        <span className="min-w-0">
          <span className="block truncate">{title}</span>
          {hint ? <span className="block truncate text-xs font-normal text-muted">{hint}</span> : null}
        </span>
        <ChevronRightIcon className="h-4 w-4 shrink-0 text-muted" />
      </summary>
      <div className="border-t border-line px-4 py-4">{children}</div>
    </details>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

/**
 * Profile tab — the donor's own record, and the home for everything that is
 * not one of the four primary sections.
 *
 * Deliberately built as collapsible groups rather than a set of dashboards:
 * one profile that lists who they are, when they last gave, their certificates,
 * how to reach them, their consent state and their settings. Everything here is
 * browser-local demonstration state; the picture and certificates never leave
 * the device.
 */
export function ProfilePanel({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const state = useCoordination();
  const base = `/${locale}`;

  const otherRole: CoordinationRole = state.role === "donor" ? "requester" : "donor";
  const otherRoleName =
    otherRole === "donor" ? dict.coord.nav.roleDonor : dict.coord.nav.roleRequester;

  const me = candidateById(state.actingDonorId ?? "cand-01");
  const bloodGroup = me?.bloodGroup ?? "O_POS";
  const district = me ? DISTRICT_BY_CODE.get(me.districtCode) : undefined;
  const history = [...state.donationHistory].sort((a, b) => b.date.localeCompare(a.date));
  const lastDonation = history[0] ?? null;
  const myKey = state.role === "donor" ? (state.actingDonorId ?? "donor-self") : "requester";
  const myContact = state.contacts[myKey];
  const consentGranted = Object.values(state.locationConsent).some(Boolean);

  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [certError, setCertError] = useState<string | null>(null);

  const onAvatar = async (file: File | null) => {
    if (!file) return;
    const dataUrl = await readImageFile(file, 320);
    if (!dataUrl) {
      setAvatarError(dict.coord.profile.avatarError);
      return;
    }
    setAvatarError(null);
    updateCoordination({ avatarDataUrl: dataUrl });
  };

  const onCertificate = async (file: File | null) => {
    if (!file) return;
    const preview = await readImageFile(file, 900);
    if (!preview && !file.type.startsWith("image/")) {
      // Non-image files keep their name only — nothing is uploaded either way.
      updateCoordination((current) => ({
        certificates: [
          ...current.certificates,
          {
            id: `cert-${Date.now()}`,
            name: file.name,
            preview: null,
            addedAt: new Date().toISOString(),
          },
        ],
      }));
      setCertError(null);
      return;
    }
    if (!preview) {
      setCertError(dict.coord.profile.avatarError);
      return;
    }
    setCertError(null);
    updateCoordination((current) => ({
      certificates: [
        ...current.certificates,
        {
          id: `cert-${Date.now()}`,
          name: file.name,
          preview,
          addedAt: new Date().toISOString(),
        },
      ],
    }));
  };

  const initials = (me?.name ?? dict.common.appName)
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const primaryLinks = [
    {
      href: `${base}/app/donor`,
      label: dict.coord.donor.dashboardTitle,
      body: dict.coord.profile.donorBody,
      Icon: UsersIcon,
    },
    {
      href: `${base}/app/track`,
      label: dict.coord.nav.track,
      body: dict.coord.profile.trackBody,
      Icon: ClipboardIcon,
    },
    {
      href: `${base}/app/scenarios`,
      label: dict.coord.scenarios.title,
      body: dict.coord.profile.scenariosBody,
      Icon: SettingsIcon,
    },
  ];

  const secondaryLinks = [
    { href: `${base}/find`, label: dict.nav.findBlood, Icon: SearchIcon },
    { href: `${base}/request/new`, label: dict.nav.requestBlood, Icon: AlertIcon },
    { href: `${base}/banks`, label: dict.nav.bloodBanks, Icon: DropletIcon },
    { href: `${base}/camps`, label: dict.nav.camps, Icon: CalendarIcon },
    { href: `${base}/learn`, label: dict.nav.learn, Icon: BookIcon },
    { href: `${base}/help`, label: dict.nav.help, Icon: InfoIcon },
    { href: `${base}/org/demo`, label: dict.nav.orgPreview, Icon: BuildingIcon },
    { href: `${base}/admin/demo`, label: dict.nav.adminPreview, Icon: SettingsIcon },
  ];

  const legalLinks = [
    { href: `${base}/privacy`, label: dict.common.privacy },
    { href: `${base}/consent`, label: dict.consent.title },
    { href: `${base}/terms`, label: dict.common.terms },
    { href: `${base}/accessibility`, label: dict.accessibility.title },
    { href: `${base}/safety`, label: dict.common.safety },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 md:items-start">
      {/* Identity ------------------------------------------------------- */}
      <section className="card p-4 md:col-span-2" aria-labelledby="profile-view-title">
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            {state.avatarDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={state.avatarDataUrl}
                alt={dict.coord.profile.avatarLabel}
                className="h-20 w-20 rounded-full border border-line object-cover"
              />
            ) : (
              <span
                aria-hidden="true"
                className="flex h-20 w-20 items-center justify-center rounded-full border border-line bg-brand-50 text-xl font-bold text-brand-700"
              >
                {initials}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              {dict.coord.profile.roleTitle}
            </p>
            <h2 id="profile-view-title" className="mt-0.5 truncate text-lg font-semibold">
              {me?.name ?? dict.common.appName}
            </h2>
            <div className="mt-1.5 flex flex-wrap gap-2">
              <Badge tone="brand">{bloodGroupShort(bloodGroup)}</Badge>
              <Badge tone={state.role === "donor" ? "teal" : "brand"}>
                {state.role === "donor"
                  ? dict.coord.nav.roleDonor
                  : dict.coord.nav.roleRequester}
              </Badge>
              {me ? (
                <Badge tone={me.availability === "available" ? "teal" : "neutral"}>
                  {me.availability === "available"
                    ? dict.donor.available
                    : me.availability === "paused"
                      ? dict.donor.paused
                      : dict.donor.unavailable}
                </Badge>
              ) : null}
            </div>
          </div>
        </div>

        {/* Picture upload */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="button-secondary !min-h-0 !px-3 !py-2 text-sm">
            {state.avatarDataUrl
              ? dict.coord.profile.avatarReplace
              : dict.coord.profile.avatarUpload}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => void onAvatar(event.target.files?.[0] ?? null)}
            />
          </label>
          {state.avatarDataUrl ? (
            <button
              type="button"
              className="button-ghost !min-h-0 !px-3 !py-2 text-sm"
              onClick={() => updateCoordination({ avatarDataUrl: null })}
            >
              {dict.coord.profile.avatarRemove}
            </button>
          ) : null}
          <p className="basis-full text-xs leading-relaxed text-muted">
            {dict.coord.profile.avatarHint}
          </p>
          {avatarError ? (
            <p role="alert" className="basis-full text-xs text-danger-700">
              {avatarError}
            </p>
          ) : null}
        </div>
      </section>

      {/* Donor details -------------------------------------------------- */}
      <Accordion title={dict.coord.profile.detailsTitle} defaultOpen>
        <dl className="divide-y divide-line">
          <Row
            label={dict.coord.profile.bloodGroupLabel}
            value={bloodGroupShort(bloodGroup)}
          />
          <Row
            label={dict.coord.profile.districtLabel}
            value={district ? (locale === "ne" ? district.nameNe : district.nameEn) : "—"}
          />
          <Row
            label={dict.coord.donor.eligibilityTitle}
            value={me ? eligibilityLabel(me.eligibility, dict) : "—"}
          />
          <Row
            label={dict.coord.donor.availabilityTitle}
            value={
              state.donorAvailability === "available"
                ? dict.donor.available
                : state.donorAvailability === "paused"
                  ? dict.donor.paused
                  : dict.donor.unavailable
            }
          />
          <Row
            label={dict.coord.profile.lastDonationLabel}
            value={
              lastDonation
                ? `${lastDonation.date} · ${lastDonation.facility}`
                : dict.coord.profile.noDonation
            }
          />
          <Row
            label={dict.coord.profile.donationTotalLabel}
            value={String(history.length)}
          />
        </dl>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          {dict.coord.profile.selfReportedNote}
        </p>
      </Accordion>

      {/* History + certificates ----------------------------------------- */}
      <Accordion title={dict.coord.profile.historyTitle} hint={dict.coord.profile.historyBody}>
        {history.length === 0 ? (
          <p className="text-sm text-muted">{dict.coord.profile.historyEmpty}</p>
        ) : (
          <ul className="space-y-2">
            {history.map((record) => (
              <li key={record.id} className="rounded-xl border border-line bg-surface p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{record.date}</p>
                  <Badge
                    tone={
                      record.verification === "verified"
                        ? "teal"
                        : record.verification === "rejected"
                          ? "danger"
                          : "neutral"
                    }
                  >
                    {record.verification === "verified"
                      ? dict.coord.donor.donStatusVerified
                      : record.verification === "submitted"
                        ? dict.coord.donor.donStatusSubmitted
                        : record.verification === "rejected"
                          ? dict.coord.donor.donStatusRejected
                          : dict.coord.donor.donStatusSelfReported}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {record.component} · {record.facility}
                </p>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 border-t border-line pt-4">
          <h4 className="text-sm font-semibold">{dict.coord.profile.certificatesTitle}</h4>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            {dict.coord.profile.certificatesBody}
          </p>

          <label className="button-secondary mt-3 inline-flex !min-h-0 !px-3 !py-2 text-sm">
            {dict.coord.profile.certUpload}
            <input
              type="file"
              accept="image/*,.pdf"
              className="sr-only"
              onChange={(event) => void onCertificate(event.target.files?.[0] ?? null)}
            />
          </label>
          {certError ? (
            <p role="alert" className="mt-2 text-xs text-danger-700">
              {certError}
            </p>
          ) : null}

          {state.certificates.length === 0 ? (
            <p className="mt-3 text-sm text-muted">{dict.coord.profile.certEmpty}</p>
          ) : (
            <ul className="mt-3 grid gap-2">
              {state.certificates.map((certificate) => (
                <li
                  key={certificate.id}
                  className="flex items-center gap-3 rounded-xl border border-line bg-surface p-2.5"
                >
                  {certificate.preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={certificate.preview}
                      alt=""
                      className="h-12 w-12 rounded-md border border-line object-cover"
                    />
                  ) : (
                    <span className="flex h-12 w-12 items-center justify-center rounded-md bg-surface-muted text-xs font-semibold text-muted">
                      PDF
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{certificate.name}</span>
                    <span className="block text-xs text-muted">
                      {new Date(certificate.addedAt).toLocaleDateString()}
                    </span>
                  </span>
                  <button
                    type="button"
                    className="button-ghost !min-h-0 !px-2 !py-1.5 text-xs"
                    onClick={() =>
                      updateCoordination((current) => ({
                        certificates: current.certificates.filter(
                          (item) => item.id !== certificate.id,
                        ),
                      }))
                    }
                  >
                    {dict.coord.profile.certRemove}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Accordion>

      {/* Contact -------------------------------------------------------- */}
      <Accordion title={dict.coord.profile.contactTitle} hint={dict.coord.profile.contactBody}>
        {myContact ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="info">
              {myContact.channel === "phone"
                ? dict.coord.chat.chPhone
                : myContact.channel === "whatsapp"
                  ? dict.coord.chat.chWhatsapp
                  : myContact.channel === "viber"
                    ? dict.coord.chat.chViber
                    : dict.coord.chat.chSms}
            </Badge>
            <span className="font-mono text-sm">{myContact.value}</span>
          </div>
        ) : (
          <p className="text-sm text-muted">{dict.coord.profile.contactNone}</p>
        )}
        <Link
          className="button-secondary mt-3 inline-flex !min-h-0 !px-3 !py-2 text-sm"
          href={`${base}/app/track`}
        >
          {dict.coord.profile.contactEdit}
        </Link>
      </Accordion>

      {/* Consent -------------------------------------------------------- */}
      <Accordion title={dict.coord.profile.consentTitle} hint={dict.coord.profile.consentBody}>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={consentGranted ? "teal" : "neutral"}>
            {consentGranted
              ? dict.coord.profile.locationOn
              : dict.coord.profile.locationOff}
          </Badge>
          <span className="text-xs text-muted">{dict.coord.profile.locationConsent}</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link className="button-secondary !min-h-0 !px-3 !py-2 text-sm" href={`${base}/app/location`}>
            {dict.coord.location.title}
          </Link>
          <Link className="button-ghost !min-h-0 !px-3 !py-2 text-sm" href={`${base}/consent`}>
            {dict.consent.title}
          </Link>
        </div>
      </Accordion>

      {/* Settings ------------------------------------------------------- */}
      <Accordion title={dict.coord.profile.settingsTitle} hint={dict.coord.profile.settingsBody}>
        <p className="text-sm leading-relaxed text-muted">{dict.coord.profile.roleBody}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="button-secondary !min-h-0 !px-3 !py-2 text-sm"
            onClick={() => updateCoordination({ role: otherRole })}
          >
            {format(dict.coord.nav.switchRole, { role: otherRoleName })}
          </button>
          <Link className="button-ghost !min-h-0 !px-3 !py-2 text-sm" href={`${base}/app/scenarios`}>
            {dict.coord.scenarios.reset}
          </Link>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
          <LockIcon className="h-3.5 w-3.5" />
          {dict.coord.profile.signedOut}
        </p>
      </Accordion>

      {/* Primary destinations ------------------------------------------- */}
      <section className="md:col-span-2" aria-labelledby="profile-primary-title">
        <SectionHeading
          id="profile-primary-title"
          title={dict.coord.profile.sectionsTitle}
          copy={dict.coord.profile.sectionsBody}
        />
        <ul className="mt-3 space-y-2">
          {primaryLinks.map(({ href, label, body, Icon }) => (
            <li key={href}>
              <Link href={href} className="card flex items-center gap-3 p-4 hover:bg-surface-muted">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{label}</span>
                  <span className="block truncate text-xs text-muted">{body}</span>
                </span>
                <ChevronRightIcon className="h-4 w-4 shrink-0 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="md:col-span-2" aria-labelledby="profile-all-title">
        <h2 id="profile-all-title" className="text-base font-semibold">
          {dict.nav.menu}
        </h2>
        <ul className="mt-3 grid grid-cols-2 gap-2">
          {secondaryLinks.map(({ href, label, Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex items-center gap-2 rounded-lg border border-line bg-surface-muted px-3 py-2.5 text-sm font-medium hover:bg-surface-deep"
              >
                <Icon className="h-4 w-4 shrink-0 text-muted" />
                <span className="truncate">{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="md:col-span-2" aria-labelledby="profile-legal-title">
        <h2 id="profile-legal-title" className="text-base font-semibold">
          {dict.coord.profile.consentTitle}
        </h2>
        <ul className="mt-2 flex flex-wrap gap-2">
          {legalLinks.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-muted px-3 py-1.5 text-xs font-medium hover:bg-surface-deep"
              >
                <ShieldIcon className="h-3.5 w-3.5 text-muted" />
                {label}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
          <CheckCircleIcon className="h-3.5 w-3.5" />
          {dict.common.demoData} · {dict.common.selfReported}
        </p>
      </section>
    </div>
  );
}
