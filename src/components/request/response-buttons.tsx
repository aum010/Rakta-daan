"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { Dictionary } from "@/messages/en";
import { apiRequest, describeError } from "@/services/api";
import { Callout } from "../ui/ui";

type Action = "interested" | "declined" | "donated" | "withdrawn";

export function ResponseButtons({
  endpoint,
  dict,
  currentStatus,
  disabled = false,
  disabledReason,
}: {
  endpoint: string;
  dict: Dictionary;
  currentStatus?: string;
  disabled?: boolean;
  disabledReason?: ReactNode;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function submit(action: Action) {
    setBusy(action);
    setError(null);
    try {
      await apiRequest(endpoint, {
        body: { action, note: note.trim() ? note.trim() : undefined },
      });
      setDone(dict.respond.submitted);
      setNote("");
      router.refresh();
    } catch (caught) {
      setError(describeError(caught, dict));
    } finally {
      setBusy(null);
    }
  }

  if (disabled) {
    return (
      <Callout tone="warning" title={dict.respond.contactConsentMissing}>
        {disabledReason}
      </Callout>
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <Callout tone="danger" role="alert">
          {error}
        </Callout>
      ) : null}
      {done ? (
        <Callout tone="success" role="status">
          {done}
        </Callout>
      ) : null}

      <div className="field">
        <label className="label" htmlFor="response-note">
          {dict.respond.noteLabel}
        </label>
        <textarea
          id="response-note"
          className="input-base min-h-20"
          maxLength={400}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={dict.respond.noteHint}
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          className="button-primary"
          onClick={() => submit("interested")}
          disabled={busy !== null}
        >
          {busy === "interested" ? dict.common.saving : dict.respond.interested}
        </button>
        <button
          type="button"
          className="button-secondary"
          onClick={() => submit("declined")}
          disabled={busy !== null}
        >
          {busy === "declined" ? dict.common.saving : dict.respond.declined}
        </button>
        <button
          type="button"
          className="button-secondary"
          onClick={() => submit("donated")}
          disabled={busy !== null}
        >
          {busy === "donated" ? dict.common.saving : dict.respond.donated}
        </button>
        {currentStatus === "interested" ? (
          <button
            type="button"
            className="button-ghost"
            onClick={() => submit("withdrawn")}
            disabled={busy !== null}
          >
            {dict.respond.statusWithdrawn}
          </button>
        ) : null}
      </div>

      <p className="text-xs leading-relaxed text-muted">{dict.respond.contactNotice}</p>
    </div>
  );
}
