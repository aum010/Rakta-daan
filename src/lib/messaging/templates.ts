import { formatDateTime } from "@/lib/dates";
import { bloodGroupShort, urgencyLabel, type BloodGroup, type Urgency } from "@/lib/blood";

export type RequestAlertData = {
  donorFirstName: string;
  bloodGroup: BloodGroup;
  hospital: string;
  district: string;
  urgency: Urgency;
  neededBy: Date;
  respondUrl: string;
  locale: "en" | "ne";
};

/**
 * WhatsApp body parameter order for the approved template. The template must be
 * created in Meta Business Manager with exactly this order; see
 * docs/integrations/messaging.md. Changing it requires a new template version.
 */
export const WHATSAPP_REQUEST_PARAM_ORDER = [
  "donor_first_name",
  "blood_group",
  "hospital",
  "district",
  "needed_by",
  "urgency",
] as const;

export function whatsappRequestParams(data: RequestAlertData): string[] {
  return [
    data.donorFirstName,
    bloodGroupShort(data.bloodGroup),
    data.hospital,
    data.district,
    formatDateTime(data.neededBy, data.locale),
    urgencyLabel(data.urgency, data.locale),
  ];
}

export function requestAlertText(data: RequestAlertData): string {
  if (data.locale === "ne") {
    return [
      `नमस्ते ${data.donorFirstName}, रक्त-दानमा तपाईंको सहयोग आवश्यक छ।`,
      `रक्त समूह: ${bloodGroupShort(data.bloodGroup)}`,
      `स्थान: ${data.hospital}, ${data.district}`,
      `आवश्यक समय: ${formatDateTime(data.neededBy, "ne")}`,
      `विवरण र प्रतिक्रिया: ${data.respondUrl}`,
      "यो सूचना तपाईंको दाता अनुमतिका आधारमा पठाइएको हो। रोक्न: /optout",
    ].join("\n");
  }
  return [
    `Namaste ${data.donorFirstName}, a patient needs ${bloodGroupShort(data.bloodGroup)} blood.`,
    `Place: ${data.hospital}, ${data.district}`,
    `Needed by: ${formatDateTime(data.neededBy, "en")} (${urgencyLabel(data.urgency, "en")})`,
    `Details and reply: ${data.respondUrl}`,
    "Sent because you opted in to donor alerts. Reply STOP to stop.",
  ].join("\n");
}

export function requesterUpdateText(input: {
  publicId: string;
  donorAction: "interested" | "donated";
  dashboardUrl: string;
  locale: "en" | "ne";
}): string {
  if (input.locale === "ne") {
    return input.donorAction === "interested"
      ? `एक दाताले तपाईंको अनुरोध ${input.publicId} मा सहयोग गर्न इच्छा देखाउनुभएको छ। विवरण हेर्न: ${input.dashboardUrl}`
      : `दाताले अनुरोध ${input.publicId} मा रगत दान गरेको जनाउनुभएको छ। कृपया पुष्टि गर्नुहोस्: ${input.dashboardUrl}`;
  }
  return input.donorAction === "interested"
    ? `A donor says they can help with request ${input.publicId}. See their details: ${input.dashboardUrl}`
    : `A donor marked request ${input.publicId} as donated. Please confirm: ${input.dashboardUrl}`;
}

export function donorAlertParams(
  data: RequestAlertData,
): Record<string, string> {
  return {
    donor_first_name: data.donorFirstName,
    blood_group: bloodGroupShort(data.bloodGroup),
    hospital: data.hospital,
    district: data.district,
    needed_by: formatDateTime(data.neededBy, data.locale),
    urgency: urgencyLabel(data.urgency, data.locale),
    respond_url: data.respondUrl,
  };
}
