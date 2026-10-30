/**
 * Consent-gated communication rules.
 *
 * Two separate gates, both enforced here so the UI cannot accidentally skip
 * them:
 *
 *  1. **Authorisation** — only the requester and donors with an active
 *     participation may read or post in a request conversation.
 *  2. **Contact disclosure** — a phone number or hand-off to WhatsApp /
 *     Messenger / Viber stays hidden until the owner explicitly consents to
 *     sharing it, and the consent dialog must state what will be shared.
 *
 * Nothing here performs a call or sends a message. Channel support is declared
 * up front (`CHANNEL_SUPPORT`) so the interface never implies a capability the
 * prototype does not have.
 */
import { CHANNEL_SUPPORT, type Conversation, type DemoChannel, type Participation } from "./types";

export type AccessDecision =
  | { allowed: true }
  | { allowed: false; reason: "not_participant" | "not_accepted" | "blocked" | "request_closed" };

/**
 * Whether `actorId` may view the conversation for a request.
 *
 * - The requester (owner) always may, unless blocked.
 * - A donor may only after accepting, and only for their own participation.
 * - Anyone else is refused — including donors who were invited but declined,
 *   and donors attached to a different request.
 */
export function canAccessConversation(params: {
  conversation: Conversation;
  actorId: string;
  isRequester: boolean;
  participants: readonly Participation[];
  requestTerminal: boolean;
}): AccessDecision {
  const { conversation, actorId, isRequester, participants, requestTerminal } = params;

  if (isRequester) {
    return conversation.blocked ? { allowed: false, reason: "blocked" } : { allowed: true };
  }

  const participation = participants.find((p) => p.donorId === actorId);
  if (!participation) return { allowed: false, reason: "not_participant" };
  if (participation.requestId !== conversation.requestId) {
    return { allowed: false, reason: "not_participant" };
  }
  if (
    participation.state === "invited" ||
    participation.state === "declined" ||
    participation.state === "withdrawn"
  ) {
    return { allowed: false, reason: "not_accepted" };
  }
  if (conversation.blocked) return { allowed: false, reason: "blocked" };
  if (requestTerminal && participation.state !== "confirmed") {
    // History stays readable after closure, but posting is stopped by the UI.
    return { allowed: true };
  }
  return { allowed: true };
}

export type DisclosureRequest = {
  channel: DemoChannel;
  /** What the owner is agreeing to reveal, shown verbatim in the dialog. */
  shareWhat: Array<"display_name" | "phone_number" | "profile_link">;
  acknowledged: boolean;
};

export type DisclosureDecision =
  | { allowed: true; support: (typeof CHANNEL_SUPPORT)[DemoChannel] }
  | { allowed: false; reason: "unsupported" | "not_acknowledged" | "in_app_only" };

/**
 * Gate for revealing contact details or moving to another platform.
 * In-app chat needs no disclosure; every other channel does.
 */
export function requestDisclosure(request: DisclosureRequest): DisclosureDecision {
  if (request.channel === "in_app") {
    return { allowed: true, support: CHANNEL_SUPPORT.in_app };
  }
  if (CHANNEL_SUPPORT[request.channel] === "unavailable") {
    return { allowed: false, reason: "unsupported" };
  }
  if (!request.acknowledged || request.shareWhat.length === 0) {
    return { allowed: false, reason: "not_acknowledged" };
  }
  return { allowed: true, support: CHANNEL_SUPPORT[request.channel] };
}

/**
 * Honest notices the prototype must show. Keeping them in one place stops any
 * screen from inventing a stronger claim than the truth.
 */
export const CHANNEL_NOTICES = {
  messageSent: "notice.messageSent",
  callPreview: "notice.callPreview",
  thirdParty: "notice.thirdParty",
  disclosureShared: "notice.disclosureShared",
} as const;

export function channelNoticeKey(channel: DemoChannel): string | null {
  if (channel === "in_app") return CHANNEL_NOTICES.messageSent;
  if (channel === "phone") return CHANNEL_NOTICES.callPreview;
  if (channel === "sms") return CHANNEL_NOTICES.messageSent;
  return CHANNEL_NOTICES.thirdParty;
}

export type QuickReplyKey =
  | "quick.accepted"
  | "quick.preparing"
  | "quick.onTheWay"
  | "quick.arrived"
  | "quick.entrance"
  | "quick.withdraw";

export const QUICK_REPLIES: readonly QuickReplyKey[] = [
  "quick.accepted",
  "quick.preparing",
  "quick.onTheWay",
  "quick.arrived",
  "quick.entrance",
  "quick.withdraw",
];
