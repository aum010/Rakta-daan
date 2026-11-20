/**
 * Shared configuration for Rakta-Daan
 */

export const APP_CONFIG = {
  // API Configuration
  api: {
    port: parseInt(process.env.PORT || '4000', 10),
    url: process.env.API_URL || 'http://localhost:4000',
    version: 'v1',
  },

  // Web Configuration
  web: {
    url: process.env.WEB_URL || 'http://localhost:3000',
  },

  // Database
  database: {
    url: process.env.DATABASE_URL || 'postgresql://rakta:rakta@localhost:5432/rakta_daan',
  },

  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  // Authentication
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production',
    jwtExpiresIn: '7d',
    refreshTokenExpiresIn: '30d',
    otpExpiresIn: 5 * 60 * 1000, // 5 minutes
    otpMaxAttempts: 5,
  },

  // CORS
  cors: {
    origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  },

  // SMS Provider
  sms: {
    provider: process.env.SMS_PROVIDER || 'mock',
    sparrowToken: process.env.SPARROW_TOKEN,
    sparrowFrom: process.env.SPARROW_FROM || 'RaktaDaan',
  },

  // Email Provider
  email: {
    provider: process.env.EMAIL_PROVIDER || 'mock',
    resendApiKey: process.env.RESEND_API_KEY,
  },

  // WhatsApp
  whatsapp: {
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
  },

  // Matching Algorithm
  matching: {
    maxDonorsPerRequest: parseInt(process.env.MAX_DONORS_PER_REQUEST || '50', 10),
    notificationBatchSize: 10,
    defaultSearchRadiusKm: parseInt(process.env.DEFAULT_SEARCH_RADIUS_KM || '50', 10),
  },

  // Rate Limiting
  rateLimit: {
    otp: {
      windowMs: 60 * 1000, // 1 minute
      max: 3, // 3 requests per minute
    },
    api: {
      windowMs: 60 * 1000, // 1 minute
      max: 100, // 100 requests per minute
    },
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },

  // Monitoring
  monitoring: {
    sentryDsn: process.env.SENTRY_DSN,
  },
} as const;

export type AppConfig = typeof APP_CONFIG;
