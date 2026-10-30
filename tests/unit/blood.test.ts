import { describe, expect, it } from "vitest";
import {
  BLOOD_GROUPS,
  RECIPIENT_ACCEPTS,
  DONOR_CAN_GIVE_TO,
  bloodGroupLabel,
  bloodGroupShort,
  canDonateTo,
  compatibleDonorGroups,
  componentLabel,
  supportsCompatibilityMatching,
} from "@/lib/blood";

describe("blood compatibility", () => {
  it("keeps donor and recipient tables consistent", () => {
    for (const donor of BLOOD_GROUPS) {
      for (const recipient of BLOOD_GROUPS) {
        const donorTableAllows = DONOR_CAN_GIVE_TO[donor].includes(recipient);
        const recipientTableAllows = RECIPIENT_ACCEPTS[recipient].includes(donor);
        expect(donorTableAllows, `${donor} -> ${recipient}`).toBe(recipientTableAllows);
      }
    }
  });

  it("treats O negative as the universal red-cell donor", () => {
    for (const recipient of BLOOD_GROUPS) {
      expect(canDonateTo("O_NEG", recipient)).toBe(true);
    }
  });

  it("only gives AB positive blood to AB positive recipients", () => {
    expect(compatibleDonorGroups("AB_POS")).toHaveLength(8);
    expect(DONOR_CAN_GIVE_TO.AB_POS).toEqual(["AB_POS"]);
  });

  it("does not allow a positive donor for a negative recipient", () => {
    expect(canDonateTo("O_POS", "O_NEG")).toBe(false);
    expect(canDonateTo("A_POS", "O_NEG")).toBe(false);
    expect(canDonateTo("A_NEG", "O_NEG")).toBe(false);
    expect(canDonateTo("A_NEG", "A_NEG")).toBe(true);
    expect(canDonateTo("A_NEG", "AB_POS")).toBe(true);
  });

  it("does not claim compatibility matching for platelets or plasma", () => {
    expect(supportsCompatibilityMatching("whole_blood")).toBe(true);
    expect(supportsCompatibilityMatching("prbc")).toBe(true);
    expect(supportsCompatibilityMatching("platelets")).toBe(false);
    expect(supportsCompatibilityMatching("plasma")).toBe(false);
  });

  it("has labels in both languages", () => {
    for (const group of BLOOD_GROUPS) {
      expect(bloodGroupLabel(group, "en").length).toBeGreaterThan(1);
      expect(bloodGroupLabel(group, "ne").length).toBeGreaterThan(1);
      expect(bloodGroupShort(group)).toMatch(/^[ABO]+[+−]$/);
    }
    expect(componentLabel("platelets", "ne")).toBe("प्लेटलेट्स");
  });
});
