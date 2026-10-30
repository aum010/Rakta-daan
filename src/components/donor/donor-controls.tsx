"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Dictionary } from "@/messages/en";
import { apiRequest, describeError } from "@/services/api";
import { Callout } from "../ui/ui";

type Availability = "available" | "unavailable" | "paused";

export function DonorControls({
  dict,
  availability,
  consentSms,
  consentWhatsapp,
  consentAlerts,
  consentContactRelease,
}: {
  dict: Dictionary;
  availability: Availability;
  consentSms: boolean;
  consentWhatsapp: boolean;
  consentAlerts: boolean;
  consentContactRelease: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [sms, setSms] = useState(consentSms);
  const [whatsapp, setWhatsapp] = useState(consentWhatsapp);
  const [alerts, setAlerts] = useState(consentAlerts);
  const [contact, setContact] = useState(consentContactRelease);

  async function patch(key: string, body: Record<string, unknown>, success: string) {
    setBusy(key);
    setError(null);
    setMessage(null);
    try {
      await apiRequest("/api/v1/donors/me", { method: "PATCH", body });
      setMessage(success);
      router.refresh();
    } catch (caught) {
      setError(describeError(caught, dict));
    } finally {
      setBusy(null);
    }
  }

  async function leave() {
    if (!window.confirm(dict.donor.leaveConfirm)) return;
    setBusy("leave");
    setError(null);
    try {
      await apiRequest("/api/v1/donors/me", { method: "DELETE" });
      router.refresh();
    } catch (caught) {
      setError(describeError(caught, dict));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      {error ? (
        <Callout tone="danger" role="alert">
          {error}
        </Callout>
      ) : null}
      {message ? (
        <Callout tone="success" role="status">
          {message}
        </Callout>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          className="button-primary"
          disabled={busy !== null}
          onClick={() => patch("available", { availability: "available" }, dict.donor.confirmed)}
        >
          {busy === "available" ? dict.common.saving : dict.donor.confirmNow}
        </button>
        {availability !== "available" ? (
          <button
            type="button"
            className="button-secondary"
            disabled={busy !== null}
            onClick={() => patch("available", { availability: "available" }, dict.donor.confirmed)}
          >
            {dict.donor.available}
          </button>
        ) : null}
        <button
          type="button"
          className="button-secondary"
          disabled={busy !== null}
          onClick={() => patch("unavailable", { availability: "unavailable" }, dict.donor.unavailable)}
        >
          {dict.donor.unavailable}
        </button>
        <button
          type="button"
          className="button-ghost"
          disabled={busy !== null}
          onClick={() => patch("alerts", { consentAlerts: false }, dict.donor.paused)}
        >
          {dict.donor.pauseAll}
        </button>
      </div>

      <form
        className="space-y-3 rounded-xl border border-line p-4"
        onSubmit={(event) => {
          event.preventDefault();
          void patch(
            "settings",
            {
              consentAlerts: alerts,
              consentSms: sms,
              consentWhatsapp: whatsapp,
              consentContactRelease: contact,
            },
            dict.donor.saveSettings,
          );
        }}
      >
        <h3 className="text-sm font-semibold">{dict.donor.settings}</h3>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={alerts}
            onChange={(event) => setAlerts(event.target.checked)}
          />
          <span>{dict.donor.alertsOn}</span>
        </label>

        <fieldset className="space-y-2">
          <legend className="text-xs font-semibold uppercase tracking-wide text-muted">
            {dict.donor.channels}
          </legend>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={sms}
              onChange={(event) => setSms(event.target.checked)}
            />
            <span>{dict.donor.smsChannel}</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={whatsapp}
              onChange={(event) => setWhatsapp(event.target.checked)}
            />
            <span>{dict.donor.whatsappChannel}</span>
          </label>
        </fieldset>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4"
            checked={contact}
            onChange={(event) => setContact(event.target.checked)}
          />
          <span>{dict.donor.contactRelease}</span>
        </label>

        <button type="submit" className="button-secondary" disabled={busy !== null}>
          {busy === "settings" ? dict.common.saving : dict.donor.saveSettings}
        </button>
      </form>

      <button
        type="button"
        className="button-ghost text-danger-700"
        disabled={busy !== null}
        onClick={leave}
      >
        {dict.donor.leave}
      </button>
    </div>
  );
}
