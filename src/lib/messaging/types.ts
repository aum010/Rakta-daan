export type MessagingChannel = "sms" | "whatsapp";

export type OutboundMessage = {
  channel: MessagingChannel;
  /** E.164 destination. Never logged. */
  to: string;
  template: string;
  locale: "en" | "ne";
  params: Record<string, string>;
  /** Free-text body used by SMS; template params used by WhatsApp. */
  text: string;
};

export type SendOutcome = {
  /**
   * `sent` means the provider accepted the message. It does NOT mean the
   * message was delivered — delivery is only recorded from provider webhooks.
   * `skipped` means we refused to send (no configuration, no consent, opt-out).
   */
  status: "sent" | "failed" | "skipped";
  provider: string;
  providerMessageId?: string;
  errorCode?: string;
  errorMessage?: string;
  retryable?: boolean;
  /** True when no real provider was called (mock adapter). */
  simulated?: boolean;
};

export type MessagingAdapter = {
  name: string;
  channel: MessagingChannel;
  isConfigured(): boolean;
  send(message: OutboundMessage): Promise<SendOutcome>;
};
