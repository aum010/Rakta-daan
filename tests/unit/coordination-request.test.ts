import { describe, expect, it } from "vitest";
import {
  acceptInvitation,
  cancelRequest,
  declineInvitation,
  expireRequest,
  increaseRequirement,
  invitationAcceptable,
  markArrived,
  markDonated,
  recordFacilityConfirmation,
  withdrawParticipation,
  computeAllocation,
  deriveRequestState,
} from "@/lib/coordination/request-machine";
import { buildEmergencyScenario } from "@/lib/coordination/scenarios";

const NOW = new Date("2026-10-27T07:00:00.000Z");

function scenario() {
  return buildEmergencyScenario();
}

describe("allocation", () => {
  it("starts with nothing committed and three units uncovered", () => {
    const allocation = computeAllocation(scenario());
    expect(allocation.unitsRequired).toBe(3);
    expect(allocation.unitsCommitted).toBe(0);
    expect(allocation.unitsConfirmed).toBe(0);
    expect(allocation.unitsUncommitted).toBe(3);
    expect(allocation.fullyCommitted).toBe(false);
    expect(allocation.fullyConfirmed).toBe(false);
  });

  it("counts only committing participants toward the committed total", () => {
    let request = scenario();
    for (const id of ["part-1", "part-2"]) {
      const result = acceptInvitation(request, id, NOW);
      expect(result.ok).toBe(true);
      if (result.ok) request = result.request;
    }
    const allocation = computeAllocation(request);
    expect(allocation.unitsCommitted).toBe(2);
    expect(allocation.unitsUncommitted).toBe(1);
    expect(allocation.fullyCommitted).toBe(false);
  });

  it("never reports confirmed units ahead of facility confirmation", () => {
    let request = scenario();
    const accepted = acceptInvitation(request, "part-1", NOW);
    expect(accepted.ok).toBe(true);
    if (!accepted.ok) return;
    request = accepted.request;
    expect(computeAllocation(request).unitsConfirmed).toBe(0);
  });
});

describe("multi-donor coordination", () => {
  it("covers a three-unit requirement across three donors one unit each", () => {
    let request = scenario();
    for (const id of ["part-1", "part-2", "part-3"]) {
      const result = acceptInvitation(request, id, NOW);
      expect(result.ok).toBe(true);
      if (result.ok) request = result.request;
    }
    const allocation = computeAllocation(request);
    expect(allocation.unitsCommitted).toBe(3);
    expect(allocation.unitsUncommitted).toBe(0);
    expect(allocation.fullyCommitted).toBe(true);
    expect(allocation.fullyConfirmed).toBe(false);
    expect(request.state).toBe("fully_committed");
    expect(request.timeline.some((event) => event.kind === "fully_covered")).toBe(true);
  });

  it("rejects a fourth acceptance once the requirement is covered", () => {
    let request = scenario();
    for (const id of ["part-1", "part-2", "part-3"]) {
      const result = acceptInvitation(request, id, NOW);
      if (result.ok) request = result.request;
    }
    const extra = acceptInvitation(request, "part-1", NOW);
    expect(extra.ok).toBe(false);
    if (!extra.ok) expect(extra.code).toBe("requirement_covered");
    expect(computeAllocation(request).unitsCommitted).toBe(3);
  });

  it("refuses to invite for units that are already covered", () => {
    let request = scenario();
    for (const id of ["part-1", "part-2", "part-3"]) {
      const result = acceptInvitation(request, id, NOW);
      if (result.ok) request = result.request;
    }
    // A donor still sitting on an outstanding invitation cannot commit more
    // units once the requirement is covered.
    const outstanding: typeof request.participants[number] = {
      ...request.participants[0]!,
      id: "part-4",
      donorId: "cand-05",
      state: "invited",
      committedUnits: 0,
      respondedAt: null,
    };
    expect(
      invitationAcceptable(request, outstanding),
    ).toMatchObject({ acceptable: false, reason: "requirement_covered" });
    expect(invitationAcceptable(request, request.participants[0]!).reason).toBe(
      "already_involved",
    );
  });

  it("recalculates the uncovered requirement when a donor withdraws", () => {
    let request = scenario();
    for (const id of ["part-1", "part-2", "part-3"]) {
      const result = acceptInvitation(request, id, NOW);
      if (result.ok) request = result.request;
    }
    expect(computeAllocation(request).unitsUncommitted).toBe(0);

    const withdrawal = withdrawParticipation(request, "part-2", NOW, {
      reason: "donor_withdrew",
    });
    expect(withdrawal.ok).toBe(true);
    if (!withdrawal.ok) return;
    request = withdrawal.request;

    const allocation = computeAllocation(request);
    expect(allocation.unitsCommitted).toBe(2);
    expect(allocation.unitsUncommitted).toBe(1);
    // Matching resumes for the uncovered quantity.
    expect(request.state).toBe("partially_covered");
    expect(request.participants.find((p) => p.id === "part-2")?.state).toBe("withdrawn");
    expect(request.participants.find((p) => p.id === "part-2")?.withdrawalReason).toBe(
      "donor_withdrew",
    );
  });

  it("reopens the requirement when the facility does not accept a donor, without carrying screening detail", () => {
    let request = scenario();
    for (const id of ["part-1", "part-2"]) {
      const result = acceptInvitation(request, id, NOW);
      if (result.ok) request = result.request;
    }
    const rejected = withdrawParticipation(request, "part-1", NOW, { byFacility: true });
    expect(rejected.ok).toBe(true);
    if (!rejected.ok) return;
    request = rejected.request;
    expect(request.participants.find((p) => p.id === "part-1")?.state).toBe("screened_out");
    expect(request.participants.find((p) => p.id === "part-1")?.withdrawalReason).toBeNull();
    expect(computeAllocation(request).unitsUncommitted).toBe(2);
  });

  it("reopens matching for the extra quantity when the requirement increases", () => {
    let request = scenario();
    const accepted = acceptInvitation(request, "part-1", NOW);
    if (accepted.ok) request = accepted.request;

    const increased = increaseRequirement(request, 5, NOW);
    expect(increased.ok).toBe(true);
    if (!increased.ok) return;
    request = increased.request;

    const allocation = computeAllocation(request);
    expect(allocation.unitsRequired).toBe(5);
    expect(allocation.unitsCommitted).toBe(1);
    expect(allocation.unitsUncommitted).toBe(4);
    expect(request.state).toBe("partially_covered");
    expect(request.timeline.some((event) => event.kind === "requirement_increased")).toBe(true);
  });
});

describe("closure rules", () => {
  it("marks fulfilled only after facility confirmation covers the requirement", () => {
    let request = scenario();
    for (const id of ["part-1", "part-2", "part-3"]) {
      const result = acceptInvitation(request, id, NOW);
      if (result.ok) request = result.request;
    }
    // Full commitment is not fulfilment.
    expect(request.state).toBe("fully_committed");
    expect(request.state).not.toBe("fulfilled");

    for (const id of ["part-1", "part-2", "part-3"]) {
      const arrived = markArrived(request, id, NOW);
      if (arrived.ok) request = arrived.request;
      const donated = markDonated(request, id, NOW);
      if (donated.ok) request = donated.request;
      const confirmed = recordFacilityConfirmation(request, id, 1, NOW);
      if (confirmed.ok) request = confirmed.request;
    }

    expect(request.state).toBe("fulfilled");
    expect(computeAllocation(request).unitsConfirmed).toBe(3);
    expect(request.fulfilledAt).not.toBeNull();
    // Closing one requirement closes the rest of the invitations.
    expect(request.participants.every((p) => p.state !== "invited")).toBe(true);
  });

  it("closes outstanding invitations when the request is cancelled", () => {
    let request = scenario();
    const cancelled = cancelRequest(request, NOW);
    expect(cancelled.ok).toBe(true);
    if (!cancelled.ok) return;
    request = cancelled.request;

    expect(request.state).toBe("cancelled");
    expect(request.participants.every((p) => p.state !== "invited")).toBe(true);

    const late = acceptInvitation(request, "part-1", NOW);
    expect(late.ok).toBe(false);
    if (!late.ok) expect(late.code).toBe("request_terminal");
  });

  it("refuses new acceptances after expiry", () => {
    let request = scenario();
    const expired = expireRequest(request, NOW);
    expect(expired.ok).toBe(true);
    if (!expired.ok) return;
    request = expired.request;

    expect(request.state).toBe("expired");
    const attempt = acceptInvitation(request, "part-1", NOW);
    expect(attempt.ok).toBe(false);
    if (!attempt.ok) expect(attempt.code).toBe("request_terminal");
  });

  it("declines without committing units", () => {
    let request = scenario();
    const declined = declineInvitation(request, "part-1", NOW);
    expect(declined.ok).toBe(true);
    if (!declined.ok) return;
    request = declined.request;
    expect(computeAllocation(request).unitsCommitted).toBe(0);
    expect(invitationAcceptable(request, request.participants[0]!)).toMatchObject({
      acceptable: false,
      reason: "invalid_state",
    });
  });
});

describe("derived state", () => {
  it("does not derive fulfilled from commitments alone", () => {
    const request = scenario();
    expect(deriveRequestState(request)).toBe("searching");
  });

  it("derives searching when nobody has committed", () => {
    expect(deriveRequestState(scenario(), "none")).toBe("searching");
  });
});
