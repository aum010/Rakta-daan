"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Dictionary } from "@/messages/en";
import { format } from "@/lib/i18n";
import { apiRequest, describeError } from "@/services/api";
import { Callout } from "../ui/ui";

export function RequestOwnerActions({
  publicId,
  dict,
  status,
}: {
  publicId: string;
  dict: Dictionary;
  status: "open" | "fulfilled" | "cancelled" | "expired";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function run(key: string, fn: () => Promise<string>) {
    setBusy(key);
    setError(null);
    setMessage(null);
    try {
      setMessage(await fn());
      router.refresh();
    } catch (caught) {
      setError(describeError(caught, dict));
    } finally {
      setBusy(null);
    }
  }

  if (status !== "open") {
    return (
      <Callout tone="neutral" title={dict.request.alreadyClosed}>
        {dict.request.statusFulfilled}
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
      {message ? (
        <Callout tone="success" role="status">
          {message}
        </Callout>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          className="button-secondary"
          disabled={busy !== null}
          onClick={() =>
            run("notify", async () => {
              const result = await apiRequest<{ notified: number }>(
                `/api/v1/requests/${publicId}/notify-more`,
                { body: {} },
              );
              return format(
                result.notified === 1
                  ? dict.request.notifyMoreResultOne
                  : dict.request.notifyMoreResult,
                { count: result.notified },
              );
            })
          }
        >
          {busy === "notify" ? dict.common.saving : dict.request.notifyMore}
        </button>

        <button
          type="button"
          className="button-primary"
          disabled={busy !== null}
          onClick={() =>
            run("fulfilled", async () => {
              await apiRequest(`/api/v1/requests/${publicId}/close`, {
                body: { status: "fulfilled" },
              });
              return dict.request.confirmedFulfilled;
            })
          }
        >
          {busy === "fulfilled" ? dict.common.saving : dict.request.markFulfilled}
        </button>

        <button
          type="button"
          className="button-ghost"
          disabled={busy !== null}
          onClick={() => {
            if (!window.confirm(dict.request.cancelRequest)) return;
            void run("cancelled", async () => {
              await apiRequest(`/api/v1/requests/${publicId}/close`, {
                body: { status: "cancelled" },
              });
              return dict.request.confirmedCancelled;
            });
          }}
        >
          {busy === "cancelled" ? dict.common.saving : dict.request.cancelRequest}
        </button>
      </div>
    </div>
  );
}
