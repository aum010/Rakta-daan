/** Central environment access. Values are read lazily so tests can override them. */

function read(name: string, fallback?: string): string {
  const value = process.env[name];
  if (value === undefined || value === "") {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  get nodeEnv(): string {
    return process.env.NODE_ENV ?? "development";
  },
  get isProduction(): boolean {
    return this.nodeEnv === "production";
  },
  get databaseUrl(): string {
    return read("DATABASE_URL", "postgres://rakta:rakta@127.0.0.1:5435/rakta_daan");
  },
  get appUrl(): string {
    return read("APP_URL", "http://localhost:3000").replace(/\/$/, "");
  },
  get authSecret(): string {
    return read("AUTH_SECRET", "dev-only-auth-secret-change-me-0000000000000000");
  },
  get otpPepper(): string {
    return read("OTP_PEPPER", "dev-only-otp-pepper-change-me-00000000000000000");
  },
  get cronSecret(): string {
    return read("CRON_SECRET", "dev-only-cron-secret-change-me");
  },
  get webhookSecret(): string {
    return read("WEBHOOK_SECRET", "dev-only-webhook-secret-change-me");
  },
  /**
   * Development-only convenience: surfaces the login OTP in the API response and
   * in server logs so the flow can be exercised without an SMS provider.
   * Forced off in production regardless of the value.
   */
  get exposeOtp(): boolean {
    if (this.isProduction) return false;
    return read("DEV_EXPOSE_OTP", "false") === "true";
  },
  get messagingProvider(): string {
    return read("MESSAGING_PROVIDER", "mock");
  },
  get fromName(): string {
    return read("MESSAGING_FROM_NAME", "Rakta-Daan");
  },
  get whatsapp(): {
    graphVersion: string;
    phoneNumberId: string;
    accessToken: string;
    templateRequest: string;
    templateLang: string;
    appSecret: string;
    verifyToken: string;
  } {
    return {
      graphVersion: read("WHATSAPP_GRAPH_VERSION", "v23.0"),
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? "",
      accessToken: process.env.WHATSAPP_ACCESS_TOKEN ?? "",
      templateRequest: read("WHATSAPP_TEMPLATE_REQUEST", "blood_request_alert"),
      templateLang: read("WHATSAPP_TEMPLATE_LANG", "en"),
      appSecret: process.env.WHATSAPP_APP_SECRET ?? "",
      verifyToken: process.env.WHATSAPP_VERIFY_TOKEN ?? "",
    };
  },
  get sparrow(): { apiUrl: string; token: string; senderId: string } {
    return {
      apiUrl: read("SPARROW_API_URL", "https://api.sparrowsms.com/v2/sms/"),
      token: process.env.SPARROW_TOKEN ?? "",
      senderId: process.env.SPARROW_SENDER_ID ?? "",
    };
  },
};

export type ConfigWarning = { key: string; message: string };

/** Reports what is not production-ready. Used by /api/health and `pnpm verify`. */
export function collectConfigWarnings(): ConfigWarning[] {
  const warnings: ConfigWarning[] = [];
  const secretish: Array<[string, string]> = [
    ["AUTH_SECRET", env.authSecret],
    ["OTP_PEPPER", env.otpPepper],
    ["CRON_SECRET", env.cronSecret],
  ];
  for (const [key, value] of secretish) {
    if (value.startsWith("dev-only")) {
      warnings.push({ key, message: "Using the development placeholder secret." });
    }
  }
  if (env.exposeOtp) {
    warnings.push({
      key: "DEV_EXPOSE_OTP",
      message: "OTP codes are returned to the browser. Development only.",
    });
  }
  const provider = env.messagingProvider;
  if (provider === "none" || provider === "mock") {
    warnings.push({
      key: "MESSAGING_PROVIDER",
      message:
        "No real provider is configured. Messages are recorded as simulated and are NOT delivered.",
    });
  }
  if (provider.includes("whatsapp")) {
    if (!env.whatsapp.accessToken || !env.whatsapp.phoneNumberId) {
      warnings.push({
        key: "WHATSAPP_ACCESS_TOKEN",
        message: "WhatsApp selected but credentials are incomplete.",
      });
    }
    if (!env.whatsapp.templateRequest) {
      warnings.push({
        key: "WHATSAPP_TEMPLATE_REQUEST",
        message: "WhatsApp requires an approved template name.",
      });
    }
  }
  if (provider.includes("sparrow")) {
    if (!env.sparrow.token || !env.sparrow.senderId) {
      warnings.push({
        key: "SPARROW_TOKEN",
        message: "Sparrow SMS selected but token/sender ID are missing.",
      });
    }
  }
  return warnings;
}
