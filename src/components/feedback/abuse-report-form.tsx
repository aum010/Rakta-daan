"use client";

import { useState } from "react";
import type { Dictionary } from "@/messages/en";
import { apiRequest, describeError } from "@/services/api";
import { Callout } from "../ui/ui";

export function AbuseReportForm({
  dict,
  defaultRequestId = "",
}: {
  dict: Dictionary;
  defaultRequestId?: string;
}) {
  const [reason, setReason] = useState("fake_request");
  const [details, setDetails] = useState("");
  const [contact, setContact] = useState("");
  const [requestId, setRequestId] = useState(defaultRequestId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiRequest("/api/v1/abuse-reports", {
        body: {
          requestPublicId: requestId.trim() || undefined,
          reason,
          details: details.trim() || undefined,
          contact: contact.trim() || undefined,
        },
      });
      setDone(true);
    } catch (caught) {
      setError(describeError(caught, dict));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Callout tone="success" role="status">
        {dict.abuse.success}
      </Callout>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error ? (
        <Callout tone="danger" role="alert">
          {error}
        </Callout>
      ) : null}

      <div className="field">
        <label className="label" htmlFor="abuse-request">
          {dict.abuse.requestId}
        </label>
        <input
          id="abuse-request"
          className="input-base font-mono uppercase"
          maxLength={14}
          value={requestId}
          onChange={(event) => setRequestId(event.target.value.toUpperCase())}
        />
      </div>

      <div className="field">
        <label className="label" htmlFor="abuse-reason">
          {dict.abuse.reason}
        </label>
        <select
          id="abuse-reason"
          className="input-base"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        >
          <option value="fake_request">{dict.abuse.reasonFake}</option>
          <option value="harassment">{dict.abuse.reasonHarassment}</option>
          <option value="spam">{dict.abuse.reasonSpam}</option>
          <option value="wrong_information">{dict.abuse.reasonWrong}</option>
          <option value="other">{dict.abuse.reasonOther}</option>
        </select>
      </div>

      <div className="field">
        <label className="label" htmlFor="abuse-details">
          {dict.abuse.details}
        </label>
        <textarea
          id="abuse-details"
          className="input-base min-h-28"
          maxLength={1000}
          required={!contact.trim()}
          value={details}
          onChange={(event) => setDetails(event.target.value)}
        />
        <p className="hint">{dict.abuse.detailsHint}</p>
      </div>

      <div className="field">
        <label className="label" htmlFor="abuse-contact">
          {dict.abuse.contact}
        </label>
        <input
          id="abuse-contact"
          className="input-base"
          maxLength={120}
          value={contact}
          onChange={(event) => setContact(event.target.value)}
        />
        <p className="hint">{dict.abuse.contactHint}</p>
      </div>

      <button type="submit" className="button-primary" disabled={busy}>
        {busy ? dict.common.saving : dict.abuse.submit}
      </button>
    </form>
  );
}
