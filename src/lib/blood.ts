export const BLOOD_GROUPS = [
  "A_POS",
  "A_NEG",
  "B_POS",
  "B_NEG",
  "AB_POS",
  "AB_NEG",
  "O_POS",
  "O_NEG",
] as const;

export type BloodGroup = (typeof BLOOD_GROUPS)[number];

export const BLOOD_COMPONENTS = [
  "whole_blood",
  "prbc",
  "platelets",
  "plasma",
] as const;

export type BloodComponent = (typeof BLOOD_COMPONENTS)[number];

/**
 * Which donor groups a recipient group can safely receive red cells from.
 * (Whole blood / packed red blood cells. Platelet and plasma compatibility
 * differs and is NOT claimed by this table — see docs/product/assumptions-and-decisions.md.)
 */
export const RECIPIENT_ACCEPTS: Record<BloodGroup, readonly BloodGroup[]> = {
  O_NEG: ["O_NEG"],
  O_POS: ["O_NEG", "O_POS"],
  A_NEG: ["O_NEG", "A_NEG"],
  A_POS: ["O_NEG", "O_POS", "A_NEG", "A_POS"],
  B_NEG: ["O_NEG", "B_NEG"],
  B_POS: ["O_NEG", "O_POS", "B_NEG", "B_POS"],
  AB_NEG: ["O_NEG", "A_NEG", "B_NEG", "AB_NEG"],
  AB_POS: ["O_NEG", "A_NEG", "B_NEG", "AB_NEG", "O_POS", "A_POS", "B_POS", "AB_POS"],
};

/** Which recipients a donor's red cells can go to. */
export const DONOR_CAN_GIVE_TO: Record<BloodGroup, readonly BloodGroup[]> = {
  O_NEG: ["O_NEG", "O_POS", "A_NEG", "A_POS", "B_NEG", "B_POS", "AB_NEG", "AB_POS"],
  O_POS: ["O_POS", "A_POS", "B_POS", "AB_POS"],
  A_NEG: ["A_NEG", "A_POS", "AB_NEG", "AB_POS"],
  A_POS: ["A_POS", "AB_POS"],
  B_NEG: ["B_NEG", "B_POS", "AB_NEG", "AB_POS"],
  B_POS: ["B_POS", "AB_POS"],
  AB_NEG: ["AB_NEG", "AB_POS"],
  AB_POS: ["AB_POS"],
};

export function compatibleDonorGroups(recipient: BloodGroup): readonly BloodGroup[] {
  return RECIPIENT_ACCEPTS[recipient];
}

export function canDonateTo(donor: BloodGroup, recipient: BloodGroup): boolean {
  return DONOR_CAN_GIVE_TO[donor].includes(recipient);
}

const LABELS: Record<BloodGroup, { en: string; ne: string; short: string }> = {
  A_POS: { en: "A positive", ne: "ए पोजिटिभ", short: "A+" },
  A_NEG: { en: "A negative", ne: "ए नेगेटिभ", short: "A−" },
  B_POS: { en: "B positive", ne: "बी पोजिटिभ", short: "B+" },
  B_NEG: { en: "B negative", ne: "बी नेगेटिभ", short: "B−" },
  AB_POS: { en: "AB positive", ne: "एबी पोजिटिभ", short: "AB+" },
  AB_NEG: { en: "AB negative", ne: "एबी नेगेटिभ", short: "AB−" },
  O_POS: { en: "O positive", ne: "ओ पोजिटिभ", short: "O+" },
  O_NEG: { en: "O negative", ne: "ओ नेगेटिभ", short: "O−" },
};

export function bloodGroupLabel(group: BloodGroup, locale: "en" | "ne"): string {
  return LABELS[group][locale];
}

export function bloodGroupShort(group: BloodGroup): string {
  return LABELS[group].short;
}

const COMPONENT_LABELS: Record<BloodComponent, { en: string; ne: string }> = {
  whole_blood: { en: "Whole blood", ne: "पूर्ण रगत" },
  prbc: { en: "Packed red cells", ne: "प्याक्ड रेड सेल्स" },
  platelets: { en: "Platelets", ne: "प्लेटलेट्स" },
  plasma: { en: "Plasma", ne: "प्लाज्मा" },
};

export function componentLabel(component: BloodComponent, locale: "en" | "ne"): string {
  return COMPONENT_LABELS[component][locale];
}

export const URGENCY_VALUES = ["routine", "urgent", "critical"] as const;
export type Urgency = (typeof URGENCY_VALUES)[number];

const URGENCY_LABELS: Record<Urgency, { en: string; ne: string }> = {
  routine: { en: "Planned", ne: "योजनाबद्ध" },
  urgent: { en: "Urgent", ne: "अत्यावश्यक" },
  critical: { en: "Critical", ne: "अति गम्भीर" },
};

export function urgencyLabel(urgency: Urgency, locale: "en" | "ne"): string {
  return URGENCY_LABELS[urgency][locale];
}

export function isBloodGroup(value: string): value is BloodGroup {
  return (BLOOD_GROUPS as readonly string[]).includes(value);
}

/**
 * Products where this platform's A/B/AB/O compatibility table is safe to use
 * for suggesting donors. Plasma and platelet compatibility are the inverse /
 * different and would need a separate table; we do not claim them.
 */
export function supportsCompatibilityMatching(component: BloodComponent): boolean {
  return component === "whole_blood" || component === "prbc";
}
