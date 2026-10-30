import { randomUUID } from "node:crypto";
import { env } from "@/lib/env";
import { toWhatsAppNumber } from "@/lib/phone";
import { WHATSAPP_REQUEST_PARAM_ORDER } from "./templates";
import type { MessagingAdapter, OutboundMessage, SendOutcome } from "./types";

/** Records the message as "sent" by a simulated provider. Never contacts anyone. */
export class MockAdapter implements MessagingAdapter {
  name = "mock";
  constructor(public channel: "sms" | "whatsapp") {}
  isConfigured() {
    return true;
  }
  async send(message: OutboundMessage): Promise<SendOutcome> {
    console.info(
      `[messaging:mock] ${message.channel} -> queued in simulator (template=${message.template}, locale=${message.locale})`,
    );
    return {
      status: "sent",
      provider: "mock",
      providerMessageId: `mock_${randomUUID()}`,
      simulated: true,
    };
  }
}

/** Used when MESSAGING_PROVIDER=none: nothing leaves the system. */
export class DisabledAdapter implements MessagingAdapter {
  name = "disabled";
  constructor(public channel: "sms" | "whatsapp") {}
  isConfigured() {
    return false;
  }
  async send(_message?: OutboundMessage): Promise<SendOutcome> {
    return {
      status: "skipped",
      provider: "none",
      errorCode: "provider_not_configured",
      errorMessage: "No messaging provider is configured; message was not sent.",
    };
  }
}

type GraphError = {
  error?: { message?: string; code?: number; error_subcode?: number; type?: string };
};

/**
 * WhatsApp Business Platform (Cloud API) template message.
 * Requirements: a Meta business account, an approved template whose body
 * parameters match WHATSAPP_REQUEST_PARAM_ORDER, and recipient opt-in.
 * See docs/integrations/messaging.md.
 */
export class WhatsAppAdapter implements MessagingAdapter {
  name = "whatsapp_cloud";
  channel = "whatsapp" as const;

  isConfigured(): boolean {
    const cfg = env.whatsapp;
    return Boolean(cfg.phoneNumberId && cfg.accessToken && cfg.templateRequest);
  }

  async send(message: OutboundMessage): Promise<SendOutcome> {
    const cfg = env.whatsapp;
    if (!this.isConfigured()) {
      return {
        status: "skipped",
        provider: this.name,
        errorCode: "provider_not_configured",
        errorMessage: "WhatsApp credentials or template name are missing.",
      };
    }
    const url = `https://graph.facebook.com/${cfg.graphVersion}/${cfg.phoneNumberId}/messages`;
    // Parameter order is contractual: it must match the approved template body.
    const params = WHATSAPP_REQUEST_PARAM_ORDER.map((key) => message.params[key] ?? "");
    const body = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: toWhatsAppNumber(message.to),
      type: "template",
      template: {
        name: cfg.templateRequest,
        language: { code: cfg.templateLang },
        components: [
          {
            type: "body",
            parameters: params.map((text) => ({ type: "text", text })),
          },
          {
            type: "button",
            sub_type: "url",
            index: "0",
            parameters: [{ type: "text", text: message.params.respond_token ?? "" }],
          },
        ],
      },
    };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfg.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
      });
      const json = (await res.json().catch(() => ({}))) as GraphError & {
        messages?: Array<{ id: string }>;
      };
      if (!res.ok) {
        const err = json.error;
        return {
          status: "failed",
          provider: this.name,
          errorCode: String(err?.code ?? res.status),
          errorMessage: err?.message ?? `WhatsApp API returned ${res.status}`,
          retryable: res.status === 429 || res.status >= 500,
        };
      }
      const providerId = json.messages?.[0]?.id;
      if (!providerId) {
        return {
          status: "failed",
          provider: this.name,
          errorCode: "unexpected_response",
          errorMessage: "WhatsApp accepted the call but returned no message id.",
          retryable: false,
        };
      }
      return { status: "sent", provider: this.name, providerMessageId: providerId };
    } catch (error) {
      const isTimeout = error instanceof Error && error.name === "TimeoutError";
      return {
        status: "failed",
        provider: this.name,
        errorCode: isTimeout ? "timeout" : "network_error",
        errorMessage: error instanceof Error ? error.message : "Unknown network error",
        retryable: true,
      };
    }
  }
}

/**
 * Sparrow SMS (Nepal). Requires an account token and an NTA-approved sender ID.
 * Docs: https://sparrowsms.com/blog/send-sms-with-sparrow-api/
 */
export class SparrowAdapter implements MessagingAdapter {
  name = "sparrow_sms";
  channel = "sms" as const;

  isConfigured(): boolean {
    const cfg = env.sparrow;
    return Boolean(cfg.token && cfg.senderId);
  }

  async send(message: OutboundMessage): Promise<SendOutcome> {
    const cfg = env.sparrow;
    if (!this.isConfigured()) {
      return {
        status: "skipped",
        provider: this.name,
        errorCode: "provider_not_configured",
        errorMessage: "Sparrow token or sender ID is missing.",
      };
    }
    const body = new URLSearchParams({
      token: cfg.token,
      from: cfg.senderId,
      to: message.to.replace(/^\+977/, ""),
      text: message.text.slice(0, 480),
    });

    try {
      const res = await fetch(cfg.apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
        signal: AbortSignal.timeout(15_000),
      });
      const json = (await res.json().catch(() => ({}))) as {
        code?: number;
        response_code?: number;
        message?: string;
        data?: { id?: string };
      };
      const code = json.code ?? json.response_code;
      if (!res.ok || (code !== undefined && code !== 200)) {
        return {
          status: "failed",
          provider: this.name,
          errorCode: String(code ?? res.status),
          errorMessage: json.message ?? `Sparrow returned ${res.status}`,
          retryable: res.status === 429 || res.status >= 500,
        };
      }
      return {
        status: "sent",
        provider: this.name,
        providerMessageId: json.data?.id ?? `sparrow_${Date.now()}`,
      };
    } catch (error) {
      const isTimeout = error instanceof Error && error.name === "TimeoutError";
      return {
        status: "failed",
        provider: this.name,
        errorCode: isTimeout ? "timeout" : "network_error",
        errorMessage: error instanceof Error ? error.message : "Unknown network error",
        retryable: true,
      };
    }
  }
}

/**
 * Resolves the adapter for a channel from MESSAGING_PROVIDER.
 * `mock` (default), `whatsapp`, `sparrow`, `whatsapp+sparrow`, `none`.
 */
export function getAdapter(channel: "sms" | "whatsapp"): MessagingAdapter {
  const provider = env.messagingProvider.toLowerCase();
  if (provider === "none") return new DisabledAdapter(channel);
  if (channel === "whatsapp" && provider.includes("whatsapp")) return new WhatsAppAdapter();
  if (channel === "sms" && provider.includes("sparrow")) return new SparrowAdapter();
  return new MockAdapter(channel);
}
