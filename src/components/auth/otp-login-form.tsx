"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Dictionary } from "@/messages/en";
import type { Locale } from "@/lib/i18n";
import { apiRequest, ClientApiError, describeError } from "@/services/api";
import { Callout } from "../ui/ui";

type OtpResponse = {
  ok: boolean;
  devCode?: string;
  simulated?: boolean;
  expiresInSeconds: number;
};

export function OtpLoginForm({
  locale,
  dict,
  next,
  initialPhone = "",
}: {
  locale: Locale;
  dict: Dictionary;
  next: string;
  initialPhone?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState(initialPhone);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [nameRequired, setNameRequired] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [simulated, setSimulated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  async function requestCode(event?: React.FormEvent) {
    event?.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const data = await apiRequest<OtpResponse>("/api/v1/auth/otp/request", {
        body: { phone, locale },
      });
      setStep("code");
      setDevCode(data.devCode ?? null);
      setSimulated(Boolean(data.simulated));
      setResendIn(60);
    } catch (caught) {
      setError(describeError(caught, dict));
    } finally {
      setBusy(false);
    }
  }

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await apiRequest("/api/v1/auth/otp/verify", {
        body: {
          phone,
          code,
          locale,
          name: name.trim() ? name.trim() : undefined,
          acceptTerms: true,
        },
      });
      router.push(next || `/${locale}/dashboard`);
      router.refresh();
    } catch (caught) {
      if (caught instanceof ClientApiError && caught.code === "profile_required") {
        setNameRequired(true);
        setError(dict.auth.newAccount);
      } else {
        setError(describeError(caught, dict));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-6">
      <h1 className="text-2xl font-bold">{dict.auth.title}</h1>
      <p className="mt-1.5 text-sm text-muted">{dict.auth.subtitle}</p>

      {error ? (
        <div className="mt-4">
          <Callout tone="danger" role="alert">
            {error}
          </Callout>
        </div>
      ) : null}

      {step === "phone" ? (
        <form onSubmit={requestCode} className="mt-5 space-y-4">
          <div className="field">
            <label className="label" htmlFor="login-phone">
              {dict.auth.phone}
            </label>
            <input
              id="login-phone"
              className="input-base"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              placeholder="98XXXXXXXX"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
            <p className="hint">{dict.auth.phoneHint}</p>
          </div>
          <button type="submit" className="button-primary w-full" disabled={busy || !phone.trim()}>
            {busy ? dict.auth.sending : dict.auth.sendCode}
          </button>
          <p className="hint">{dict.auth.termsNotice}</p>
        </form>
      ) : (
        <form onSubmit={verify} className="mt-5 space-y-4">
          {devCode ? (
            <Callout tone="warning" title={dict.auth.devCode.replace("{code}", devCode)}>
              <p>{dict.auth.devCodeHint}</p>
              {simulated ? <p className="mt-1">{dict.common.simulated} — {dict.common.notDelivered}</p> : null}
            </Callout>
          ) : null}

          <div className="field">
            <label className="label" htmlFor="login-code">
              {dict.auth.code}
            </label>
            <input
              id="login-code"
              className="input-base tracking-[0.35em]"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              required
              placeholder="000000"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
            />
            <p className="hint">
              {phone} · {dict.auth.otpSent}
            </p>
          </div>

          <div className="field">
            <label className="label" htmlFor="login-name">
              {dict.auth.name} <span className="font-normal text-muted">({dict.common.optional})</span>
            </label>
            <input
              id="login-name"
              className="input-base"
              autoComplete="name"
              required={nameRequired}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <p className="hint">{nameRequired ? dict.auth.newAccount : dict.auth.nameHint}</p>
          </div>

          <button
            type="submit"
            className="button-primary w-full"
            disabled={busy || code.length !== 6}
          >
            {busy ? dict.auth.verifying : dict.auth.verify}
          </button>

          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <button
              type="button"
              className="button-ghost"
              onClick={() => {
                setStep("phone");
                setCode("");
                setDevCode(null);
                setError(null);
              }}
            >
              {dict.common.back}
            </button>
            <button
              type="button"
              className="button-ghost"
              disabled={busy || resendIn > 0}
              onClick={() => requestCode()}
            >
              {resendIn > 0
                ? dict.auth.resendIn.replace("{seconds}", String(resendIn))
                : dict.auth.resend}
            </button>
          </div>
        </form>
      )}

      <p className="mt-5 border-t border-line pt-4 text-xs text-muted">
        {dict.auth.termsNotice}{" "}
        <Link className="underline" href={`/${locale}/terms`}>
          {dict.common.terms}
        </Link>{" "}
        ·{" "}
        <Link className="underline" href={`/${locale}/privacy`}>
          {dict.common.privacy}
        </Link>
      </p>
    </div>
  );
}
