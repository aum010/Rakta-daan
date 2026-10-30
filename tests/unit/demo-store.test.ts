import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createDemoRequest,
  deleteDemoRequest,
  getDemoRequest,
  persistDemoRequests,
  readDemoRequests,
  recordDemoRequestView,
  saveDemoRequest,
  setDemoRequestStatus,
  updateDemoRequest,
  type DemoRequestInput,
} from "@/mocks/request";
import {
  calculateProfileCompletion,
  createDemoDonor,
  deleteDemoDonor,
  readDemoDonor,
  readDemoResponses,
  saveDemoDonor,
  saveDemoResponse,
  updateDemoDonor,
  type DemoDonorInput,
} from "@/mocks/donor";

const NOW = new Date("2026-10-27T09:00:00Z");

class MemoryStorage {
  private values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, String(value));
  }
}

function requestInput(): DemoRequestInput {
  return {
    bloodGroup: "A_POS",
    component: "whole_blood",
    units: 1,
    urgency: "routine",
    neededBy: new Date(NOW.getTime() + 24 * 3_600_000).toISOString(),
    hospital: "Demo Hospital",
    district: "KTM",
    area: "",
    directions: "",
    contactName: "Demo Requester",
    contactMethod: "phone",
    phone: "9800000000",
    email: "",
    relationship: "friend",
    notes: "",
    consentAccuracy: true,
    consentShare: true,
    consentUpdates: false,
  };
}

function donorInput(): DemoDonorInput {
  return {
    name: "Demo Donor",
    bloodGroup: "O_POS",
    district: "KTM",
    availability: "available",
    channels: { sms: true, whatsapp: false, email: false },
    phone: "9812345678",
    email: "",
    consentAlerts: true,
    consentContact: true,
    consentTerms: true,
    visibility: true,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  Object.defineProperty(globalThis, "window", {
    value: { localStorage: new MemoryStorage() },
    configurable: true,
  });
});

afterEach(() => {
  vi.useRealTimers();
  Reflect.deleteProperty(globalThis, "window");
});

describe("demo request store", () => {
  it("saves, reads and finds a request by normalised reference", () => {
    const record = createDemoRequest(requestInput());
    expect(saveDemoRequest(record)).toBe(true);

    expect(readDemoRequests()).toHaveLength(1);
    expect(getDemoRequest(record.reference.toLowerCase())?.reference).toBe(record.reference);
    expect(deleteDemoRequest(record.reference)).toBeUndefined();
    expect(readDemoRequests()).toHaveLength(0);
  });

  it("expires open requests after their urgency window", () => {
    const record = createDemoRequest({ ...requestInput(), urgency: "critical" });
    saveDemoRequest(record);

    vi.setSystemTime(new Date(NOW.getTime() + 25 * 3_600_000));
    const [expired] = readDemoRequests();
    expect(expired?.status).toBe("expired");
    expect(expired?.timeline.some((entry) => entry.kind === "updated")).toBe(true);
  });

  it("updates only open requests and extends the expiry window", () => {
    const record = createDemoRequest(requestInput());
    saveDemoRequest(record);

    const updated = updateDemoRequest(
      record.reference,
      { ...requestInput(), units: 3, urgency: "critical" },
      new Date(NOW.getTime() + 3_600_000),
    );
    expect(updated?.units).toBe(3);
    expect(updated?.expiresAt).toBe(new Date(NOW.getTime() + 25 * 3_600_000).toISOString());

    setDemoRequestStatus(record.reference, "cancelled");
    expect(updateDemoRequest(record.reference, requestInput())).toBeNull();
  });

  it("records status views at most once per hour", () => {
    const record = createDemoRequest(requestInput());
    saveDemoRequest(record);

    const first = recordDemoRequestView(record.reference);
    expect(first?.timeline.filter((entry) => entry.kind === "viewed")).toHaveLength(1);

    vi.setSystemTime(new Date(NOW.getTime() + 30 * 60_000));
    const second = recordDemoRequestView(record.reference);
    expect(second?.timeline.filter((entry) => entry.kind === "viewed")).toHaveLength(1);

    vi.setSystemTime(new Date(NOW.getTime() + 2 * 3_600_000));
    const third = recordDemoRequestView(record.reference);
    expect(third?.timeline.filter((entry) => entry.kind === "viewed")).toHaveLength(2);
  });

  it("keeps only the ten most recent requests", () => {
    const records = Array.from({ length: 12 }, (_, index) => {
      const at = new Date(NOW.getTime() + index * 1000);
      return createDemoRequest(requestInput(), at);
    });
    expect(persistDemoRequests(records)).toBe(true);
    expect(readDemoRequests()).toHaveLength(10);
  });
});

describe("demo donor store", () => {
  it("calculates a completion score and never exceeds 100", () => {
    expect(calculateProfileCompletion(donorInput())).toBe(100);
    expect(
      calculateProfileCompletion({
        ...donorInput(),
        phone: "",
        consentAlerts: false,
        consentContact: false,
        consentTerms: false,
      }),
    ).toBeLessThan(100);
  });

  it("persists, updates and deletes a donor profile", () => {
    const donor = createDemoDonor(donorInput());
    expect(saveDemoDonor(donor)).toBe(true);
    expect(readDemoDonor()?.name).toBe("Demo Donor");

    const updated = updateDemoDonor(
      {
        availability: "paused",
        channels: { sms: true, whatsapp: true, email: false },
      },
      new Date(NOW.getTime() + 2 * 3_600_000),
    );
    expect(updated?.availability).toBe("paused");
    expect(updated?.channels).toEqual({ sms: true, whatsapp: true, email: false });
    expect(updated?.availabilityUpdatedAt).toBe(
      new Date(NOW.getTime() + 2 * 3_600_000).toISOString(),
    );

    deleteDemoDonor();
    expect(readDemoDonor()).toBeNull();
  });

  it("keeps the availability timestamp when other settings change", () => {
    saveDemoDonor(createDemoDonor(donorInput()));
    const updated = updateDemoDonor(
      { visibility: false },
      new Date(NOW.getTime() + 2 * 3_600_000),
    );
    expect(updated?.availabilityUpdatedAt).toBe(NOW.toISOString());
  });

  it("replaces repeated responses and caps the history", () => {
    expect(saveDemoResponse("DEMO-ABC234", "interested")).toHaveLength(1);
    expect(saveDemoResponse("DEMO-ABC234", "declined")[0]?.response).toBe("declined");

    for (let index = 0; index < 25; index += 1) {
      saveDemoResponse(`DEMO-${String(index).padStart(6, "2")}`, "interested");
    }
    expect(readDemoResponses().length).toBe(20);
  });
});
