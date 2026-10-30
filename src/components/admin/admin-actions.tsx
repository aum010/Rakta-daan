"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Dictionary } from "@/messages/en";
import type { Locale } from "@/lib/i18n";
import { DISTRICTS, PROVINCES } from "@/data/geography";
import { apiRequest, describeError } from "@/services/api";
import { Callout } from "../ui/ui";

export function AdminOrgActions({
  orgId,
  dict,
  verification,
}: {
  orgId: string;
  dict: Dictionary;
  verification: string;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function act(action: "verify" | "reject" | "suspend") {
    setBusy(action);
    setError(null);
    try {
      await apiRequest(`/api/v1/admin/orgs/${orgId}/verification`, {
        body: { action, note: note.trim() || undefined },
      });
      setDone(true);
      router.refresh();
    } catch (caught) {
      setError(describeError(caught, dict));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-2 space-y-2">
      {error ? (
        <Callout tone="danger" role="alert">
          {error}
        </Callout>
      ) : null}
      {done ? (
        <Callout tone="success" role="status">
          {dict.admin.actionDone}
        </Callout>
      ) : null}
      <label className="sr-only" htmlFor={`note-${orgId}`}>
        {dict.admin.note}
      </label>
      <input
        id={`note-${orgId}`}
        className="input-base !min-h-0 !py-1.5 text-sm"
        placeholder={dict.admin.note}
        maxLength={300}
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="button-primary !min-h-0 !py-1.5 text-sm"
          disabled={busy !== null}
          onClick={() => act("verify")}
        >
          {busy === "verify" ? dict.common.saving : dict.admin.verify}
        </button>
        <button
          type="button"
          className="button-secondary !min-h-0 !py-1.5 text-sm"
          disabled={busy !== null}
          onClick={() => act("reject")}
        >
          {dict.admin.reject}
        </button>
        {verification === "verified" ? (
          <button
            type="button"
            className="button-ghost text-sm text-danger-700"
            disabled={busy !== null}
            onClick={() => act("suspend")}
          >
            {dict.admin.suspend}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function AdminAbuseActions({ id, dict }: { id: string; dict: Dictionary }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(status: "resolved" | "dismissed" | "reviewing") {
    setBusy(status);
    setError(null);
    try {
      await apiRequest(`/api/v1/admin/abuse/${id}`, {
        method: "PATCH",
        body: { status },
      });
      router.refresh();
    } catch (caught) {
      setError(describeError(caught, dict));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {error ? <p className="text-xs text-danger-700">{error}</p> : null}
      <button
        type="button"
        className="button-primary !min-h-0 !py-1.5 text-sm"
        disabled={busy !== null}
        onClick={() => act("resolved")}
      >
        {dict.admin.resolve}
      </button>
      <button
        type="button"
        className="button-secondary !min-h-0 !py-1.5 text-sm"
        disabled={busy !== null}
        onClick={() => act("dismissed")}
      >
        {dict.admin.dismiss}
      </button>
    </div>
  );
}

export function AdminCampForm({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const router = useRouter();
  const [province, setProvince] = useState("P3");
  const [district, setDistrict] = useState("KTM");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const districts = useMemo(
    () => DISTRICTS.filter((item) => item.provinceCode === province),
    [province],
  );

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const startsAt = new Date(String(form.get("startsAt")));
    const endsAt = new Date(String(form.get("endsAt")));
    try {
      await apiRequest("/api/v1/admin/camps", {
        body: {
          title: String(form.get("title") ?? "").trim(),
          titleNe: String(form.get("titleNe") ?? "").trim() || undefined,
          description: String(form.get("description") ?? "").trim() || undefined,
          provinceCode: province,
          districtCode: district,
          venue: String(form.get("venue") ?? "").trim(),
          organizerName: String(form.get("organizerName") ?? "").trim(),
          contactPhone: String(form.get("contactPhone") ?? "").trim() || undefined,
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
        },
      });
      setDone(true);
      router.refresh();
    } catch (caught) {
      setError(describeError(caught, dict));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Callout tone="success" role="status">
        {dict.admin.campCreated}
      </Callout>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {error ? (
        <Callout tone="danger" role="alert">
          {error}
        </Callout>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="field sm:col-span-2">
          <label className="label" htmlFor="camp-title">
            {dict.camps.title}
          </label>
          <input id="camp-title" name="title" className="input-base" required maxLength={120} />
        </div>
        <div className="field">
          <label className="label" htmlFor="camp-start">
            {dict.camps.when}
          </label>
          <input id="camp-start" name="startsAt" type="datetime-local" className="input-base" required />
        </div>
        <div className="field">
          <label className="label" htmlFor="camp-end">
            {dict.camps.when} (end)
          </label>
          <input id="camp-end" name="endsAt" type="datetime-local" className="input-base" required />
        </div>
        <div className="field">
          <label className="label" htmlFor="camp-province">
            {dict.find.province}
          </label>
          <select
            id="camp-province"
            className="input-base"
            value={province}
            onChange={(event) => {
              setProvince(event.target.value);
              const first = DISTRICTS.find((item) => item.provinceCode === event.target.value);
              if (first) setDistrict(first.code);
            }}
          >
            {PROVINCES.map((item) => (
              <option key={item.code} value={item.code}>
                {locale === "ne" ? item.nameNe : item.nameEn}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="label" htmlFor="camp-district">
            {dict.find.district}
          </label>
          <select
            id="camp-district"
            className="input-base"
            value={district}
            onChange={(event) => setDistrict(event.target.value)}
          >
            {districts.map((item) => (
              <option key={item.code} value={item.code}>
                {locale === "ne" ? item.nameNe : item.nameEn}
              </option>
            ))}
          </select>
        </div>
        <div className="field sm:col-span-2">
          <label className="label" htmlFor="camp-venue">
            {dict.camps.venue}
          </label>
          <input id="camp-venue" name="venue" className="input-base" required maxLength={160} />
        </div>
        <div className="field">
          <label className="label" htmlFor="camp-organizer">
            {dict.camps.organiser}
          </label>
          <input id="camp-organizer" name="organizerName" className="input-base" required />
        </div>
        <div className="field">
          <label className="label" htmlFor="camp-contact">
            {dict.camps.contact}
          </label>
          <input id="camp-contact" name="contactPhone" className="input-base" type="tel" />
        </div>
        <div className="field sm:col-span-2">
          <label className="label" htmlFor="camp-description">
            {dict.common.about}
          </label>
          <textarea id="camp-description" name="description" className="input-base" maxLength={600} />
        </div>
      </div>
      <button type="submit" className="button-primary" disabled={busy}>
        {busy ? dict.common.saving : dict.admin.addCamp}
      </button>
    </form>
  );
}
