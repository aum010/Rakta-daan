/**
 * Coordination demo store.
 *
 * A small external store (subscribe + getSnapshot) backed by localStorage, so
 * the same state can be read by any component without prop-drilling and with a
 * single source of truth for the requester and donor views.
 *
 * Everything persisted here is browser-local demonstration state. Nothing is
 * sent anywhere, and `resetScenario()` restores the seeded scenario at any
 * time. Storage failures degrade to in-memory state rather than breaking the
 * page — see src/mocks/storage.ts for the same defensive approach.
 */
"use client";

import { useSyncExternalStore } from "react";
import { readJson, writeJson, removeStored, canUseStorage } from "@/mocks/storage";
import type {
  Conversation,
  CoordinationRequest,
  DemoChannel,
  DonationRecord,
  LocationChoice,
  LocationConsent,
  Participation,
  TimelineEvent,
} from "./types";

export const COORDINATION_KEY = "rakta-daan:coordination:v1";

export type CoordinationRole = "requester" | "donor";

/**
 * How one side has asked to be reached: an external channel plus the number or
 * handle on that channel. Blank until they provide it — the platform never
 * invents a contact detail, and the other side only sees it after consent.
 *
 * Keyed by `"requester"` or a donor id.
 */
export type ContactChannel = { channel: DemoChannel; value: string };

export const CONTACT_KEYS = { requester: "requester" } as const;

/**
 * A donation certificate the donor attached to their own profile.
 *
 * Images are downscaled and kept as a data URL in this browser; other file
 * types keep their name only. Nothing is uploaded anywhere.
 */
export type StoredFile = {
  id: string;
  name: string;
  preview: string | null;
  addedAt: string;
};

export type CoordinationState = {
  scenario: string;
  role: CoordinationRole;
  request: CoordinationRequest | null;
  conversations: Conversation[];
  donationHistory: DonationRecord[];
  locationConsent: LocationConsent;
  location: LocationChoice | null;
  locationPermission: "unknown" | "granted" | "denied" | "dismissed";
  /** Acting donor's self-reported availability (the donor's own state). */
  donorAvailability: "available" | "unavailable" | "paused";
  /** Null until the donor confirms availability in this session. */
  donorAvailabilityConfirmedAt: string | null;
  /** Demo donor identity used when acting as the donor side of a request. */
  actingDonorId: string | null;
  /** How each side asked to be reached — see `ContactChannel`. */
  contacts: Record<string, ContactChannel>;
  /** Downscaled profile picture (data URL), stored in this browser only. */
  avatarDataUrl: string | null;
  /** Donation certificates attached by the donor — browser-local only. */
  certificates: StoredFile[];
  lastNotice: string | null;
};

export const DEFAULT_CONSENT: LocationConsent = {
  requester_discovery: false,
  donor_matching: false,
  donor_live: false,
  requester_live: false,
};

export function emptyState(scenario = "none"): CoordinationState {
  return {
    scenario,
    role: "requester",
    request: null,
    conversations: [],
    donationHistory: [],
    locationConsent: { ...DEFAULT_CONSENT },
    location: null,
    locationPermission: "unknown",
    donorAvailability: "available",
    donorAvailabilityConfirmedAt: null,
    actingDonorId: null,
    contacts: {},
    avatarDataUrl: null,
    certificates: [],
    lastNotice: null,
  };
}

/* ------------------------------------------------------------------ *
 * Store plumbing
 * ------------------------------------------------------------------ */

let state: CoordinationState = emptyState();
const listeners = new Set<() => void>();
let hydrated = false;

function emit(): void {
  for (const listener of listeners) listener();
}

function load(): void {
  if (hydrated) return;
  hydrated = true;
  if (!canUseStorage()) return;
  const stored = readJson<CoordinationState | null>(COORDINATION_KEY, null);
  if (stored && typeof stored === "object" && "scenario" in stored) {
    state = { ...emptyState(stored.scenario), ...stored };
  }
}

function persist(): void {
  if (!canUseStorage()) return;
  writeJson(COORDINATION_KEY, state);
}

export function getCoordinationState(): CoordinationState {
  load();
  return state;
}

export function subscribeCoordination(listener: () => void): () => void {
  load();
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === COORDINATION_KEY) {
      hydrated = false;
      load();
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * React binding. The server snapshot is a stable value so hydration never
 * loops; browser state arrives after mount through `getSnapshot`.
 */
const SERVER_SNAPSHOT: CoordinationState = emptyState();

export function useCoordination(): CoordinationState {
  return useSyncExternalStore(
    subscribeCoordination,
    getCoordinationState,
    () => SERVER_SNAPSHOT,
  );
}

export function setCoordination(next: CoordinationState): void {
  state = next;
  persist();
  emit();
}

export function updateCoordination(
  patch: Partial<CoordinationState> | ((current: CoordinationState) => Partial<CoordinationState>),
): void {
  const resolved = typeof patch === "function" ? patch(state) : patch;
  state = { ...state, ...resolved };
  persist();
  emit();
}

/** Record how one side has asked to be reached (`"requester"` or a donor id). */
export function setContact(key: string, contact: ContactChannel): void {
  updateCoordination((current) => ({
    contacts: { ...current.contacts, [key]: contact },
  }));
}

export function updateRequest(mutator: (request: CoordinationRequest) => CoordinationRequest): void {
  if (!state.request) return;
  state = { ...state, request: mutator(state.request) };
  persist();
  emit();
}

export function appendTimeline(event: TimelineEvent): void {
  updateRequest((request) => ({
    ...request,
    timeline: [...request.timeline, event],
    updatedAt: event.at,
  }));
}

export function resetCoordination(): void {
  state = emptyState();
  if (canUseStorage()) removeStored(COORDINATION_KEY);
  hydrated = true;
  emit();
}

/* ------------------------------------------------------------------ *
 * Conversations
 * ------------------------------------------------------------------ */

export function upsertConversation(conversation: Conversation): void {
  updateCoordination((current) => ({
    conversations: current.conversations.some((item) => item.id === conversation.id)
      ? current.conversations.map((item) => (item.id === conversation.id ? conversation : item))
      : [...current.conversations, conversation],
  }));
}

export function getConversation(id: string): Conversation | null {
  return state.conversations.find((item) => item.id === id) ?? null;
}

/** Opens (or reuses) the conversation for a participation. */
export function ensureConversation(requestId: string, participation: Participation): Conversation {
  const id = `conv:${requestId}:${participation.donorId}`;
  const existing = state.conversations.find((item) => item.id === id);
  if (existing) return existing;
  const conversation: Conversation = {
    id,
    requestId,
    participantId: participation.id,
    messages: [],
    contactDisclosed: false,
    blocked: false,
    updatedAt: new Date().toISOString(),
  };
  upsertConversation(conversation);
  return conversation;
}
