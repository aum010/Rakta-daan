"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { format, type Locale } from "@/lib/i18n";
import type { Dictionary } from "@/messages/en";
import {
  ensureConversation,
  setContact,
  upsertConversation,
  useCoordination,
} from "@/lib/coordination/store";
import {
  CHANNEL_SUPPORT,
  type CoordinationRequest,
  type DemoChannel,
  type Participation,
} from "@/lib/coordination/types";
import { Badge, Callout, DemoBanner } from "@/components/ui/ui";
import { ParticipationBadge } from "./status";

/**
 * The requester as a participation-shaped record, so contact disclosure for
 * the requester reuses exactly the same consent mechanism as donors instead of
 * introducing a second one. Only `id` and `donorId` are read.
 */
function requesterAsParticipant(request: CoordinationRequest): Participation {
  return {
    id: `req:${request.reference}`,
    requestId: request.reference,
    donorId: "requester",
    donorName: request.requesterName,
    donorBloodGroup: request.bloodGroup,
    distanceKm: null,
    committedUnits: 0,
    confirmedUnits: 0,
    state: "accepted",
    invitedAt: request.createdAt,
    respondedAt: request.createdAt,
    arrivedAt: null,
    screenedAt: null,
    donatedAt: null,
    confirmedAt: null,
    updatedAt: request.updatedAt,
    withdrawalReason: null,
    sharingLiveLocation: false,
    liveLocationUpdatedAt: null,
    wave: 1,
  };
}

/**
 * External contact panel — the replacement for the internal chat.
 *
 * Rakta-Daan connects people through channels that already exist on their
 * phone (WhatsApp, Viber, telephone, SMS) rather than growing its own inbox.
 * Every channel is labelled with what this frontend actually does: calling is
 * a simulated preview, and the messaging channels are an integration boundary
 * that is not connected yet. Contact details stay hidden until the person
 * sharing them agrees.
 */
export function ContactPanel({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const state = useCoordination();
  const { request, role } = state;

  const [callOpen, setCallOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  /* Which key this viewer owns: the requester, or the donor they are acting as. */
  const myKey = role === "donor" ? (state.actingDonorId ?? "donor-self") : "requester";
  const saved = state.contacts[myKey];

  /* `draft` stays null until the viewer edits the form, so the inputs always
     reflect what the store holds — including after hydration or a load. */
  const [draft, setDraft] = useState<{ channel: DemoChannel; value: string } | null>(null);
  const [contactError, setContactError] = useState("");
  const shown = draft ?? saved ?? { channel: "phone" as DemoChannel, value: "" };

  const channelName = (key: DemoChannel) =>
    key === "phone"
      ? dict.coord.chat.chPhone
      : key === "whatsapp"
        ? dict.coord.chat.chWhatsapp
        : key === "viber"
          ? dict.coord.chat.chViber
          : dict.coord.chat.chSms;

  const saveContact = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = shown.value.trim();
    if (value.replace(/\D/g, "").length < 6) {
      setContactError(dict.coord.contact.numberRequired);
      return;
    }
    setContactError("");
    setContact(myKey, { channel: shown.channel, value });
    setDraft(null);
    setNotice(dict.coord.contact.saved);
  };

  const channels: Array<{ key: DemoChannel; name: string; note: string }> = [
    { key: "phone", name: dict.coord.chat.chPhone, note: dict.coord.chat.channelPhone },
    { key: "whatsapp", name: dict.coord.chat.chWhatsapp, note: dict.coord.chat.channelWhatsapp },
    { key: "viber", name: dict.coord.chat.chViber, note: dict.coord.chat.channelViber },
    { key: "sms", name: dict.coord.chat.chSms, note: dict.coord.chat.channelSms },
  ];

  const supportLabel = (key: DemoChannel) =>
    CHANNEL_SUPPORT[key] === "implemented"
      ? dict.coord.chat.supportImplemented
      : CHANNEL_SUPPORT[key] === "simulated"
        ? dict.coord.chat.supportSimulated
        : dict.coord.chat.supportUnavailable;

  const supportTone = (key: DemoChannel) =>
    CHANNEL_SUPPORT[key] === "implemented"
      ? "teal"
      : CHANNEL_SUPPORT[key] === "simulated"
        ? "amber"
        : "neutral";

  /* ------------------------------------------------------------------ *
   * No active request
   * ------------------------------------------------------------------ */
  if (!request) {
    return (
      <div className="grid gap-4">
        <DemoBanner>{dict.coord.home.demoNote}</DemoBanner>
        <section className="card p-4" aria-labelledby="contact-empty-title">
          <h3 id="contact-empty-title" className="text-base font-semibold">
            {dict.coord.contact.emptyTitle}
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            {dict.coord.contact.emptyBody}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link className="button-primary !min-h-0 !px-3 !py-2 text-sm" href={`/${locale}/request/new`}>
              {dict.common.startRequest}
            </Link>
            <Link className="button-secondary !min-h-0 !px-3 !py-2 text-sm" href={`/${locale}/app/track`}>
              {dict.coord.home.trackCta}
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const people: Participation[] =
    role === "donor" ? [requesterAsParticipant(request)] : request.participants;

  const conversationFor = (person: Participation) =>
    state.conversations.find(
      (item) => item.requestId === request.reference && item.participantId === person.id,
    ) ?? null;

  const decide = (person: Participation, disclose: boolean) => {
    const conversation = ensureConversation(request.reference, person);
    upsertConversation({ ...conversation, contactDisclosed: disclose });
    setNotice(disclose ? dict.coord.chat.disclosed : dict.coord.chat.hidden);
  };

  /* ------------------------------------------------------------------ *
   * People on this request
   * ------------------------------------------------------------------ */
  return (
    <div className="grid gap-4">
      <DemoBanner>{dict.coord.home.demoNote}</DemoBanner>

      {notice ? (
        <p role="status" className="text-sm font-medium text-teal-700">
          {notice}
        </p>
      ) : null}

      {/* How the other side reaches you ---------------------------------- */}
      <section className="card p-4" aria-labelledby="contact-mine-title">
        <h3 id="contact-mine-title" className="text-base font-semibold">
          {dict.coord.contact.yourDetails}
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          {dict.coord.contact.yourDetailsBody}
        </p>

        <form className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={saveContact} noValidate>
          <div className="field !mb-0">
            <label className="label" htmlFor="contact-channel">
              {dict.coord.contact.channelLabel}
            </label>
            <select
              id="contact-channel"
              className="input-base"
              value={shown.channel}
              onChange={(event) =>
                setDraft({
                  channel: event.target.value as DemoChannel,
                  value: shown.value,
                })
              }
            >
              {channels.map((channel) => (
                <option key={channel.key} value={channel.key}>
                  {channel.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field !mb-0">
            <label className="label" htmlFor="contact-value">
              {dict.coord.contact.numberLabel}
            </label>
            <input
              id="contact-value"
              type="tel"
              className={`input-base ${contactError ? "input-error" : ""}`}
              value={shown.value}
              placeholder={dict.coord.contact.numberPlaceholder}
              onChange={(event) =>
                setDraft({ channel: shown.channel, value: event.target.value })
              }
              aria-invalid={Boolean(contactError)}
              aria-describedby={contactError ? "contact-value-error" : "contact-value-hint"}
            />
            {contactError ? (
              <p id="contact-value-error" className="field-error mt-1" role="alert">
                {contactError}
              </p>
            ) : (
              <p id="contact-value-hint" className="hint mt-1">
                {dict.coord.contact.numberHint}
              </p>
            )}
          </div>

          <div className="sm:col-span-2">
            <button type="submit" className="button-secondary !min-h-0 !px-3 !py-2 text-sm">
              {dict.coord.contact.save}
            </button>
          </div>
        </form>
      </section>

      <section className="card p-4" aria-labelledby="contact-people-title">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 id="contact-people-title" className="text-base font-semibold">
              {dict.coord.contact.title}
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              {dict.coord.contact.subtitle}
            </p>
          </div>
          <Badge tone="neutral">
            {people.length === 1
              ? dict.coord.contact.participantsOne
              : format(dict.coord.contact.participants, { count: people.length })}
          </Badge>
        </div>

        {people.length === 0 ? (
          <p className="mt-3 text-sm text-muted">{dict.coord.contact.noParticipants}</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {people.map((person) => {
              const conversation = conversationFor(person);
              const disclosed = conversation?.contactDisclosed ?? false;
              const isRequester = person.donorId === "requester";
              return (
                <li key={person.id} className="rounded-xl border border-line bg-surface p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{person.donorName}</p>
                      <p className="text-xs text-muted">
                        {isRequester ? dict.coord.contact.whoRequester : dict.coord.contact.whoDonor}
                      </p>
                    </div>
                    {isRequester ? null : (
                      <ParticipationBadge state={person.state} dict={dict} />
                    )}
                  </div>

                  {(() => {
                    const theirs = state.contacts[person.donorId];
                    return (
                      <>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Badge tone="info">{channelName(theirs?.channel ?? "phone")}</Badge>
                          {theirs ? (
                            <span className="text-xs text-muted">
                              {format(dict.coord.contact.reachableOn, { channel: channelName(theirs.channel) })}
                            </span>
                          ) : (
                            <span className="text-xs text-muted">
                              {dict.coord.contact.notProvided}
                            </span>
                          )}
                        </div>

                        {disclosed && theirs ? (
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="font-mono text-sm">{theirs.value}</span>
                            <Badge tone="neutral">{dict.common.demoData}</Badge>
                            <button
                              type="button"
                              className="button-ghost !min-h-0 !px-3 !py-1.5 text-xs"
                              onClick={() => decide(person, false)}
                            >
                              {dict.coord.contact.stopSharing}
                            </button>
                          </div>
                        ) : (
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <Badge tone="neutral">{dict.coord.contact.hiddenLabel}</Badge>
                            <button
                              type="button"
                              className="button-secondary !min-h-0 !px-3 !py-1.5 text-xs"
                              onClick={() => decide(person, true)}
                              disabled={!theirs}
                            >
                              {dict.coord.contact.shareNow}
                            </button>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </li>
              );
            })}
          </ul>
        )}

        <p className="mt-3 text-xs leading-relaxed text-muted">
          {dict.coord.contact.consentIntro}
        </p>
      </section>

      {/* External channels ------------------------------------------- */}
      <section className="card p-4" aria-labelledby="contact-channels-title">
        <h3 id="contact-channels-title" className="text-base font-semibold">
          {dict.coord.chat.channelsTitle}
        </h3>

        <ul className="mt-3 grid gap-3">
          {channels.map((channel) => (
            <li key={channel.key} className="rounded-xl border border-line bg-surface p-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold">{channel.name}</p>
                <Badge tone={supportTone(channel.key)}>{supportLabel(channel.key)}</Badge>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted">{channel.note}</p>

              {channel.key === "phone" ? (
                <div className="mt-2">
                  {callOpen ? (
                    <div className="rounded-xl border border-brand-600/30 bg-brand-50 p-3">
                      <p className="text-sm font-semibold">{dict.coord.chat.callTitle}</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted">
                        {dict.coord.chat.callBody}
                      </p>
                      <p className="mt-1 text-xs text-muted">{dict.coord.chat.callNote}</p>
                      <button
                        type="button"
                        className="button-secondary mt-2 !min-h-0 !px-3 !py-2 text-xs"
                        onClick={() => setCallOpen(false)}
                      >
                        {dict.coord.chat.callEnd}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="button-secondary !min-h-0 !px-3 !py-2 text-xs"
                      aria-expanded={false}
                      onClick={() => setCallOpen(true)}
                    >
                      {dict.coord.chat.callStart}
                    </button>
                  )}
                </div>
              ) : null}
            </li>
          ))}
        </ul>

        <p className="mt-3 text-xs leading-relaxed text-muted">{dict.coord.contact.numberNote}</p>
      </section>

      {/* Honest boundary ------------------------------------------------ */}
      <Callout tone="neutral" title={dict.coord.contact.noInternalTitle}>
        {dict.coord.contact.noInternalBody}
      </Callout>

      <section className="card p-4" aria-labelledby="contact-fallback-title">
        <h3 id="contact-fallback-title" className="text-base font-semibold">
          {dict.nav.bloodBanks}
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-muted">{dict.contact.subtitle}</p>
        <Link className="button-secondary mt-3 !min-h-0 !px-3 !py-2 text-sm" href={`/${locale}/banks`}>
          {dict.nav.bloodBanks}
        </Link>
      </section>

      <p className="text-xs leading-relaxed text-muted">{dict.coord.safety.noDelivery}</p>
    </div>
  );
}
