import { describe, expect, it } from "vitest";
import {
  MockAdapter,
  DisabledAdapter,
  getAdapter,
} from "@/lib/messaging/adapters";
import {
  WHATSAPP_REQUEST_PARAM_ORDER,
  donorAlertParams,
  requestAlertText,
  requesterUpdateText,
  whatsappRequestParams,
} from "@/lib/messaging/templates";

const alert = {
  donorFirstName: "Sita",
  bloodGroup: "A_POS" as const,
  hospital: "Demo Hospital",
  district: "Kathmandu",
  urgency: "urgent" as const,
  neededBy: new Date("2026-10-26T12:00:00Z"),
  respondUrl: "http://localhost:3000/en/respond/token",
  locale: "en" as const,
};

describe("messaging", () => {
  it("keeps WhatsApp template parameter order stable", () => {
    expect(whatsappRequestParams(alert)).toHaveLength(WHATSAPP_REQUEST_PARAM_ORDER.length);
    expect(whatsappRequestParams(alert)[0]).toBe("Sita");
    expect(whatsappRequestParams(alert)[1]).toBe("A+");
    const params = donorAlertParams(alert);
    for (const key of WHATSAPP_REQUEST_PARAM_ORDER) {
      expect(params).toHaveProperty(key);
    }
  });

  it("writes request alerts without patient details", () => {
    const english = requestAlertText(alert);
    expect(english).toContain("A+");
    expect(english).toContain("Demo Hospital");
    expect(english).toContain(alert.respondUrl);
    expect(english.toLowerCase()).toContain("stop");

    const nepali = requestAlertText({ ...alert, locale: "ne" });
    expect(nepali).toContain("रक्त");
    expect(nepali).toContain(alert.respondUrl);
  });

  it("tells the requester what changed", () => {
    const text = requesterUpdateText({
      publicId: "ABC123",
      donorAction: "interested",
      dashboardUrl: "http://localhost:3000/en/dashboard/requests/ABC123",
      locale: "en",
    });
    expect(text).toContain("ABC123");
    expect(text).toContain("can help");
  });

  it("marks mock sends as simulated, not delivered", async () => {
    const adapter = new MockAdapter("sms");
    const outcome = await adapter.send({
      channel: "sms",
      to: "+9779801234567",
      template: "request_alert",
      locale: "en",
      params: {},
      text: "hello",
    });
    expect(outcome.status).toBe("sent");
    expect(outcome.simulated).toBe(true);
    expect(outcome.provider).toBe("mock");
  });

  it("refuses to send when no provider is configured", async () => {
    const adapter = new DisabledAdapter("sms");
    const outcome = await adapter.send({
      channel: "sms",
      to: "+9779801234567",
      template: "request_alert",
      locale: "en",
      params: {},
      text: "hello",
    });
    expect(outcome.status).toBe("skipped");
    expect(outcome.errorCode).toBe("provider_not_configured");
  });

  it("falls back to the mock adapter unless a provider is enabled", () => {
    const previous = process.env.MESSAGING_PROVIDER;
    process.env.MESSAGING_PROVIDER = "mock";
    expect(getAdapter("sms").name).toBe("mock");
    process.env.MESSAGING_PROVIDER = "none";
    expect(getAdapter("whatsapp").name).toBe("disabled");
    process.env.MESSAGING_PROVIDER = "whatsapp";
    // WhatsApp adapter is selected but reports itself unconfigured without credentials.
    expect(getAdapter("whatsapp").isConfigured()).toBe(false);
    process.env.MESSAGING_PROVIDER = previous;
  });
});
