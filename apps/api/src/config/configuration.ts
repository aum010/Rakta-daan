export default () => ({
  port: parseInt(process.env.PORT ?? '4000', 10),
  database: {
    url: process.env.DATABASE_URL,
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'development-secret-change-in-production',
    expiresIn: '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'refresh-secret-change',
    refreshExpiresIn: '7d',
  },
  otp: {
    pepper: process.env.OTP_PEPPER || 'otp-pepper-change-in-production',
    expiryMinutes: 5,
  },
  web: {
    url: process.env.WEB_URL || 'http://localhost:3000',
  },
  sms: {
    provider: process.env.SMS_PROVIDER || 'mock',
    sparrowToken: process.env.SPARROW_TOKEN,
    sparrowFrom: process.env.SPARROW_FROM,
  },
  email: {
    provider: process.env.EMAIL_PROVIDER || 'mock',
    resendApiKey: process.env.RESEND_API_KEY,
  },
  whatsapp: {
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
  },
  s3: {
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION,
    bucket: process.env.S3_BUCKET,
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
  sentry: {
    dsn: process.env.SENTRY_DSN,
  },
});
