"use client";

import { useRef, useState } from "react";
import type { Dictionary } from "@/messages/en";
import { Callout, DemoBanner } from "../ui/ui";
import { ArrowIcon, CheckCircleIcon } from "../ui/icons";

type Topic = keyof Dictionary["contact"]["topics"];

export function DemoContactForm({ dict }: { dict: Dictionary }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState<Topic>("general");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = dict.formErrors.name;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) next.email = dict.contact.errorEmail;
    if (message.trim().length < 20) next.message = dict.contact.errorMessage;
    setErrors(next);
    if (Object.keys(next).length > 0) {
      const first = Object.keys(next)[0];
      if (first) document.getElementById(`contact-${first}`)?.focus();
      return;
    }
    setSending(true);
    window.setTimeout(() => {
      setSending(false);
      setSent(true);
    }, 350);
  }

  if (sent) {
    return (
      <div className="card p-6" role="status">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-700">
          <CheckCircleIcon className="h-7 w-7" />
        </span>
        <h2 className="mt-4 text-xl font-bold">{dict.contact.successTitle}</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{dict.contact.successBody}</p>
        <button
          type="button"
          className="button-secondary mt-4"
          onClick={() => {
            setSent(false);
            setName("");
            setEmail("");
            setMessage("");
            setTopic("general");
            setErrors({});
            formRef.current?.reset();
          }}
        >
          {dict.common.back}
        </button>
      </div>
    );
  }

  return (
    <form ref={formRef} className="card p-5" onSubmit={submit} noValidate>
      <DemoBanner>{dict.contact.demoNotice}</DemoBanner>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="field">
          <label className="label" htmlFor="contact-name">
            {dict.contact.name}
          </label>
          <input
            id="contact-name"
            type="text"
            autoComplete="name"
            className={`input-base ${errors.name ? "input-error" : ""}`}
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "contact-name-error" : undefined}
          />
          {errors.name ? (
            <p id="contact-name-error" className="field-error mt-1" role="alert">
              {errors.name}
            </p>
          ) : null}
        </div>

        <div className="field">
          <label className="label" htmlFor="contact-email">
            {dict.contact.emailAddress}
          </label>
          <input
            id="contact-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            className={`input-base ${errors.email ? "input-error" : ""}`}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "contact-email-error" : undefined}
          />
          {errors.email ? (
            <p id="contact-email-error" className="field-error mt-1" role="alert">
              {errors.email}
            </p>
          ) : null}
        </div>

        <div className="field sm:col-span-2">
          <label className="label" htmlFor="contact-topic">
            {dict.contact.topic}
          </label>
          <select
            id="contact-topic"
            className="input-base"
            value={topic}
            onChange={(event) => setTopic(event.target.value as Topic)}
          >
            {(Object.keys(dict.contact.topics) as Topic[]).map((key) => (
              <option key={key} value={key}>
                {dict.contact.topics[key]}
              </option>
            ))}
          </select>
        </div>

        <div className="field sm:col-span-2">
          <label className="label" htmlFor="contact-message">
            {dict.contact.message}
          </label>
          <textarea
            id="contact-message"
            className={`input-base min-h-32 ${errors.message ? "input-error" : ""}`}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            aria-invalid={Boolean(errors.message)}
            aria-describedby={errors.message ? "contact-message-error" : "contact-message-hint"}
          />
          {errors.message ? (
            <p id="contact-message-error" className="field-error mt-1" role="alert">
              {errors.message}
            </p>
          ) : (
            <p id="contact-message-hint" className="hint mt-1">
              {dict.contact.messageHint}
            </p>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="submit" className="button-primary" disabled={sending}>
          {sending ? dict.contact.sending : dict.contact.submit}
          <ArrowIcon className="h-4 w-4" />
        </button>
        <span className="text-xs text-muted">{dict.contact.noEmergency}</span>
      </div>

      <div className="mt-4">
        <Callout tone="neutral">{dict.help.responseTime}</Callout>
      </div>
    </form>
  );
}
