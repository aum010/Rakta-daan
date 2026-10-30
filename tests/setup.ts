import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

(process.env as Record<string, string>).NODE_ENV = "test";
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgres://rakta:rakta@127.0.0.1:5435/rakta_daan_test";
process.env.AUTH_SECRET = "test-auth-secret-0000000000000000000000000000";
process.env.OTP_PEPPER = "test-otp-pepper-00000000000000000000000000000";
process.env.CRON_SECRET = "test-cron-secret";
process.env.WEBHOOK_SECRET = "test-webhook-secret";
process.env.APP_URL = "http://localhost:3000";
process.env.DEV_EXPOSE_OTP = "true";
process.env.MESSAGING_PROVIDER = "mock";
