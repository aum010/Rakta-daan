# System Architecture

**Document Version:** 1.0  
**Last Updated:** January 29, 2025  
**Status:** Phase 0 — Architecture Design  
**Target Stack:** NestJS + Prisma + Next.js + PostGIS

---

## Executive Summary

Rakta-Daan uses a **modern monorepo architecture** with:
- **Frontend:** Next.js 16 (App Router) + React 19
- **Backend:** NestJS 10 (modular monolith)
- **Database:** PostgreSQL 16 + PostGIS + Prisma ORM
- **Queues:** Redis + BullMQ
- **Real-time:** Socket.IO
- **Monitoring:** Pino + Sentry

This document defines the complete system architecture for the NestJS migration.

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USERS (Browser)                         │
│              Mobile (390px+) · Tablet · Desktop                 │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                   Next.js Frontend (Port 3000)                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  App Router                                              │  │
│  │  • /[locale]/* → Pages (SSR + Client Components)        │  │
│  │  • React Server Components (data fetching)              │  │
│  │  • Client Components (interactivity)                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  API Client (services/api.ts)                           │  │
│  │  • HTTP fetch to NestJS backend                         │  │
│  │  • Authentication token management                       │  │
│  │  • Error handling & retry logic                         │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP/REST + WebSocket
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                   NestJS Backend (Port 4000)                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Controllers (HTTP Layer)                               │  │
│  │  • REST endpoints (/api/v1/*)                          │  │
│  │  • Request validation (class-validator)                 │  │
│  │  • OpenAPI/Swagger decorators                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Guards & Middleware                                     │  │
│  │  • JWT authentication                                    │  │
│  │  • Role-based authorization (RBAC)                      │  │
│  │  • Rate limiting                                         │  │
│  │  • CORS handling                                         │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Services (Business Logic)                              │  │
│  │  • Domain logic                                          │  │
│  │  • Matching algorithm                                    │  │
│  │  • Notification orchestration                           │  │
│  │  • State transitions                                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Prisma Service (Data Layer)                            │  │
│  │  • Type-safe database access                            │  │
│  │  • Transaction support                                   │  │
│  │  • Raw SQL for PostGIS queries                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  WebSocket Gateways (Real-time)                         │  │
│  │  • Request status updates (Socket.IO)                   │  │
│  │  • Live location streaming                              │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────┬──────────────────────────────┬─────────────┬─────────┘
          │                              │             │
          │ Prisma Client                │             │ BullMQ
          │                              │             │
┌─────────▼─────────┐   ┌───────────────▼────┐   ┌────▼────────┐
│  PostgreSQL 16    │   │ Redis 7             │   │ BullMQ Queue│
│  + PostGIS 3.4    │   │ • Session store     │   │ • Invitations│
│                   │   │ • Rate limit cache  │   │ • Notifications│
│ • 18+ tables      │   │ • BullMQ queues     │   │ • Matching   │
│ • Spatial indexes │   └─────────────────────┘   │ • Expiry     │
│ • Encrypted PII   │                             └──────────────┘
└───────────────────┘
          │
          │ Notifications
          │
┌─────────▼────────────────────────────────────────────────────────┐
│                    External Integrations                         │
│  ┌──────────┐  ┌────────────┐  ┌────────┐  ┌────────────────┐  │
│  │ Sparrow  │  │ WhatsApp   │  │ Resend │  │ S3-Compatible  │  │
│  │ SMS      │  │ Business   │  │ Email  │  │ Storage        │  │
│  │          │  │ API        │  │        │  │                │  │
│  └──────────┘  └────────────┘  └────────┘  └────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Monorepo Structure

```
rakta-daan/
├── apps/
│   ├── web/                         # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/                 # App Router pages
│   │   │   ├── components/          # React components
│   │   │   ├── services/            # API client
│   │   │   ├── messages/            # i18n
│   │   │   └── hooks/               # React hooks
│   │   ├── public/
│   │   ├── package.json
│   │   ├── next.config.ts
│   │   └── tailwind.config.ts
│   └── api/                         # NestJS backend
│       ├── src/
│       │   ├── main.ts              # Bootstrap
│       │   ├── app.module.ts        # Root module
│       │   ├── common/              # Shared utilities
│       │   ├── config/              # Environment config
│       │   ├── database/            # Prisma service
│       │   ├── auth/                # AuthModule
│       │   ├── users/               # UsersModule
│       │   ├── donors/              # DonorsModule
│       │   ├── requests/            # RequestsModule
│       │   ├── matching/            # MatchingModule
│       │   ├── invitations/         # InvitationsModule
│       │   ├── facilities/          # FacilitiesModule
│       │   ├── organizations/       # OrganizationsModule
│       │   ├── inventory/           # InventoryModule
│       │   ├── notifications/       # NotificationsModule
│       │   ├── integrations/        # External providers
│       │   ├── location/            # LocationModule
│       │   ├── camps/               # CampsModule
│       │   ├── administration/      # AdminModule
│       │   ├── audit/               # AuditModule
│       │   └── health/              # HealthModule
│       ├── test/
│       │   ├── unit/
│       │   └── integration/
│       └── package.json
├── packages/
│   ├── shared-types/                # Common TypeScript types
│   ├── validation/                  # Zod schemas
│   └── config/                      # Shared config
├── prisma/
│   ├── schema.prisma                # Database schema
│   ├── migrations/                  # Migration history
│   ├── seed.ts                      # Seed script
│   └── sql/                         # PostGIS setup
├── infrastructure/
│   ├── docker/
│   │   ├── Dockerfile.web
│   │   ├── Dockerfile.api
│   │   └── Dockerfile.worker
│   └── deployment/
├── docs/                            # Documentation
├── scripts/                         # Utility scripts
├── .github/workflows/               # CI/CD
├── docker-compose.yml               # Local development
├── pnpm-workspace.yaml              # Workspace config
├── package.json                     # Root package
└── README.md
```

---

## 3. NestJS Module Architecture

### 3.1 Core Modules

```typescript
// apps/api/src/app.module.ts
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,           // Prisma service
    AuthModule,               // OTP, JWT, sessions
    UsersModule,              // User CRUD
    DonorsModule,             // Donor management
    RequestsModule,           // Blood requests
    MatchingModule,           // Matching algorithm
    InvitationsModule,        // Invitation workflow
    FacilitiesModule,         // Hospitals, blood banks
    OrganizationsModule,      // Organization management
    InventoryModule,          // Blood stock
    NotificationsModule,      // Multi-channel notifications
    IntegrationsModule,       // SMS, WhatsApp, email
    LocationModule,           // Live location tracking
    CampsModule,              // Donation camps
    AdministrationModule,     // Admin, moderation
    AuditModule,              // Audit logging
    HealthModule              // Health checks
  ]
})
export class AppModule {}
```

---

### 3.2 Module Details

#### AuthModule

```typescript
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '15m' }
    }),
    UsersModule
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    OtpService,
    SessionService
  ],
  exports: [AuthService, JwtStrategy]
})
export class AuthModule {}
```

**Responsibilities:**
- OTP generation and verification (SMS)
- JWT token issuance and refresh
- Session management
- Password reset

**Key Services:**
- `AuthService` — Core auth logic
- `OtpService` — Generate/verify OTP codes
- `SessionService` — Session CRUD
- `JwtStrategy` — Passport JWT strategy

---

#### DonorsModule

```typescript
@Module({
  imports: [DatabaseModule, NotificationsModule],
  controllers: [DonorsController, AvailabilityController],
  providers: [DonorsService, EligibilityService],
  exports: [DonorsService]
})
export class DonorsModule {}
```

**Responsibilities:**
- Donor registration
- Profile management
- Availability updates
- Eligibility validation (age, weight)
- Donation history

**Key Services:**
- `DonorsService` — CRUD operations
- `EligibilityService` — Validate eligibility rules

---

#### RequestsModule

```typescript
@Module({
  imports: [
    DatabaseModule,
    MatchingModule,
    NotificationsModule
  ],
  controllers: [RequestsController],
  providers: [
    RequestsService,
    RequestStateMachine,
    RequestsGateway // Socket.IO
  ],
  exports: [RequestsService]
})
export class RequestsModule {}
```

**Responsibilities:**
- Request creation
- Status transitions
- Request search
- Fulfillment confirmation
- Real-time updates (WebSocket)

**Key Services:**
- `RequestsService` — CRUD + business logic
- `RequestStateMachine` — Status transition validation
- `RequestsGateway` — Socket.IO for real-time updates

---

#### MatchingModule

```typescript
@Module({
  imports: [
    DatabaseModule,
    DonorsModule,
    InvitationsModule,
    BullModule.registerQueue({ name: 'matching' })
  ],
  controllers: [MatchingController],
  providers: [
    MatchingService,
    MatchingAlgorithm,
    MatchingProcessor // BullMQ worker
  ],
  exports: [MatchingService]
})
export class MatchingModule {}
```

**Responsibilities:**
- Donor-request matching algorithm
- Candidate filtering (blood type, location, availability)
- Candidate ranking (distance, response rate)
- Staged geographic expansion (waves)
- Matching job queue

**Key Services:**
- `MatchingService` — Orchestration
- `MatchingAlgorithm` — Core algorithm logic
- `MatchingProcessor` — Background job processor

**Matching Algorithm (Pseudocode):**
```typescript
async function runMatchingAlgorithm(requestId: string): Promise<void> {
  const request = await getRequest(requestId);
  
  // Wave 1: 5km radius
  const wave1 = await findCandidates(request, radiusKm: 5, limit: 10);
  if (wave1.length > 0) {
    await createInvitations(wave1);
    await scheduleWave2(requestId, delay: '30 minutes');
    return;
  }
  
  // Wave 2: 10km radius
  const wave2 = await findCandidates(request, radiusKm: 10, limit: 15);
  if (wave2.length > 0) {
    await createInvitations(wave2);
    await scheduleWave3(requestId, delay: '30 minutes');
    return;
  }
  
  // Wave 3: 20km radius
  const wave3 = await findCandidates(request, radiusKm: 20, limit: 20);
  if (wave3.length > 0) {
    await createInvitations(wave3);
    return;
  }
  
  // No matches found, escalate to coordinators
  await escalateToCoordinators(requestId);
}

async function findCandidates(
  request: BloodRequest,
  radiusKm: number,
  limit: number
): Promise<DonorCandidate[]> {
  // PostGIS spatial query
  const candidates = await prisma.$queryRaw`
    SELECT 
      id,
      user_id,
      blood_group,
      ST_Distance(geography_point, ST_MakePoint(${request.longitude}, ${request.latitude})::geography) / 1000 AS distance_km
    FROM donor_profiles
    WHERE 
      blood_group = ${request.bloodGroup}::"blood_group"
      AND availability_state = 'available'
      AND next_eligible_date <= NOW()
      AND ST_DWithin(
        geography_point,
        ST_MakePoint(${request.longitude}, ${request.latitude})::geography,
        ${radiusKm * 1000}
      )
      AND id NOT IN (
        SELECT donor_id FROM donor_invitations
        WHERE request_id = ${request.id}::uuid
      )
    ORDER BY 
      geography_point <-> ST_MakePoint(${request.longitude}, ${request.latitude})::geography,
      response_rate DESC,
      last_donation_date ASC
    LIMIT ${limit}
  `;
  
  return candidates;
}
```

---

#### InvitationsModule

```typescript
@Module({
  imports: [
    DatabaseModule,
    NotificationsModule,
    BullModule.registerQueue({ name: 'invitations' })
  ],
  controllers: [InvitationsController],
  providers: [
    InvitationsService,
    InvitationProcessor // BullMQ worker
  ],
  exports: [InvitationsService]
})
export class InvitationsModule {}
```

**Responsibilities:**
- Create invitation records
- Generate invitation tokens
- Handle acceptance/decline
- Manage expiry
- Withdrawal handling

**Key Services:**
- `InvitationsService` — CRUD + token generation
- `InvitationProcessor` — Send notifications (queue)

---

#### NotificationsModule

```typescript
@Module({
  imports: [
    DatabaseModule,
    IntegrationsModule,
    BullModule.registerQueue({ name: 'notifications' })
  ],
  providers: [
    NotificationsService,
    NotificationProcessor // BullMQ worker
  ],
  exports: [NotificationsService]
})
export class NotificationsModule {}
```

**Responsibilities:**
- Queue notification jobs
- Multi-channel delivery (SMS, WhatsApp, Email, Push)
- Delivery status tracking
- Retry logic

**Key Services:**
- `NotificationsService` — Queue management
- `NotificationProcessor` — Process queue jobs

**Notification Flow:**
```typescript
async function notifyDonor(
  donorId: string,
  notificationType: NotificationType,
  payload: any
): Promise<void> {
  // Get donor notification preferences
  const donor = await prisma.donorProfile.findUnique({
    where: { id: donorId },
    include: { user: { include: { consents: true } } }
  });
  
  const channels = [];
  if (donor.user.consents.sms) channels.push('sms');
  if (donor.user.consents.whatsapp) channels.push('whatsapp');
  if (donor.user.consents.push) channels.push('push');
  
  // Queue job for each channel
  for (const channel of channels) {
    await notificationQueue.add('send', {
      donorId,
      channel,
      type: notificationType,
      payload
    });
  }
}
```

---

#### IntegrationsModule

```typescript
@Module({
  providers: [
    SmsService,          // Sparrow SMS
    WhatsAppService,     // WhatsApp Business API
    EmailService,        // Resend
    StorageService       // S3-compatible
  ],
  exports: [
    SmsService,
    WhatsAppService,
    EmailService,
    StorageService
  ]
})
export class IntegrationsModule {}
```

**Responsibilities:**
- SMS delivery via Sparrow SMS (Nepal)
- WhatsApp message delivery
- Email delivery via Resend
- File upload to S3-compatible storage

**Provider Interface:**
```typescript
interface CommunicationProvider {
  send(params: SendMessageParams): Promise<SendResult>;
  getDeliveryStatus(messageId: string): Promise<DeliveryStatus>;
}

class SmsService implements CommunicationProvider {
  async send(params: SendMessageParams): Promise<SendResult> {
    const response = await axios.post('https://api.sparrowsms.com/v2/sms', {
      token: process.env.SPARROW_TOKEN,
      from: process.env.SPARROW_FROM,
      to: params.to,
      text: params.message
    });
    
    return {
      messageId: response.data.id,
      status: 'sent'
    };
  }
}
```

---

#### LocationModule

```typescript
@Module({
  imports: [DatabaseModule],
  providers: [
    LocationService,
    LocationGateway // Socket.IO
  ],
  exports: [LocationService]
})
export class LocationModule {}
```

**Responsibilities:**
- Location sharing session management
- GPS coordinate updates
- Real-time location streaming (WebSocket)
- Privacy controls
- Auto-purge old locations (7 days)

**Key Services:**
- `LocationService` — Session CRUD, coordinate storage
- `LocationGateway` — Socket.IO for real-time streaming

---

## 4. Database Architecture (Prisma + PostGIS)

### 4.1 Core Entities

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String   @id @default(uuid()) @db.Uuid
  phoneEnc      String   @map("phone_enc")
  phoneHash     String   @unique @map("phone_hash")
  emailEnc      String?  @map("email_enc")
  emailHash     String?  @unique @map("email_hash")
  fullName      String   @map("full_name")
  dateOfBirth   DateTime? @map("date_of_birth") @db.Date
  sex           Sex?
  role          UserRole @default(DONOR)
  status        UserStatus @default(ACTIVE)
  
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")
  deletedAt     DateTime? @map("deleted_at")
  
  donorProfile  DonorProfile?
  sessions      Session[]
  otps          OtpVerification[]
  consents      Consent[]
  
  @@map("users")
  @@index([phoneHash])
  @@index([emailHash])
}

model DonorProfile {
  id                String   @id @default(uuid()) @db.Uuid
  userId            String   @unique @map("user_id") @db.Uuid
  bloodGroup        BloodGroup @map("blood_group")
  
  districtId        String   @map("district_id") @db.Uuid
  city              String?
  address           String?
  latitude          Float?   @db.DoublePrecision
  longitude         Float?   @db.DoublePrecision
  geographyPoint    Unsupported("geography(Point, 4326)")? @map("geography_point")
  
  availabilityState AvailabilityState @default(AVAILABLE) @map("availability_state")
  willingToTravel   Boolean  @default(true) @map("willing_to_travel")
  maxTravelDistanceKm Int    @default(10) @map("max_travel_distance_km")
  
  weight            Float?   @db.DoublePrecision
  lastDonationDate  DateTime? @map("last_donation_date") @db.Date
  nextEligibleDate  DateTime? @map("next_eligible_date") @db.Date
  chronicConditions Json     @default("[]") @map("chronic_conditions")
  medications       Json     @default("[]")
  allergies         Json     @default("[]")
  
  totalDonations    Int      @default(0) @map("total_donations")
  lifetimesSaved    Int      @default(0) @map("lifetimes_saved")
  responseRate      Float    @default(0) @map("response_rate")
  
  profileVisibility ProfileVisibility @default(DONORS_ONLY) @map("profile_visibility")
  
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")
  
  user              User @relation(fields: [userId], references: [id], onDelete: Cascade)
  district          District @relation(fields: [districtId], references: [id])
  invitations       DonorInvitation[]
  
  @@map("donor_profiles")
  @@index([bloodGroup, availabilityState])
  @@index([geographyPoint], type: Gist)
}

model BloodRequest {
  id              String   @id @default(uuid()) @db.Uuid
  publicId        String   @unique @map("public_id")
  requesterId     String   @map("requester_id") @db.Uuid
  
  bloodGroup      BloodGroup @map("blood_group")
  requiredUnits   Int      @map("required_units")
  urgency         Urgency
  requiredBy      DateTime @map("required_by")
  
  hospitalId      String?  @map("hospital_id") @db.Uuid
  districtId      String   @map("district_id") @db.Uuid
  latitude        Float    @db.DoublePrecision
  longitude       Float    @db.DoublePrecision
  geographyPoint  Unsupported("geography(Point, 4326)")? @map("geography_point")
  
  patientNameEnc  String?  @map("patient_name_enc")
  patientAge      Int?     @map("patient_age")
  patientGender   Sex?     @map("patient_gender")
  diagnosisEnc    String?  @map("diagnosis_enc")
  
  contactName     String   @map("contact_name")
  contactPhone    String   @map("contact_phone")
  contactRelation String?  @map("contact_relation")
  
  additionalNotes String?  @map("additional_notes") @db.Text
  publicMessage   String?  @map("public_message") @db.Text
  
  status          RequestStatus @default(OPEN)
  committedUnits  Int      @default(0) @map("committed_units")
  fulfilledUnits  Int      @default(0) @map("fulfilled_units")
  
  searchRadiusKm  Int      @default(10) @map("search_radius_km")
  matchCount      Int      @default(0) @map("match_count")
  
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  fulfilledAt     DateTime? @map("fulfilled_at")
  cancelledAt     DateTime? @map("cancelled_at")
  expiresAt       DateTime? @map("expires_at")
  
  requester       User @relation(fields: [requesterId], references: [id])
  hospital        Facility? @relation(fields: [hospitalId], references: [id])
  district        District @relation(fields: [districtId], references: [id])
  invitations     DonorInvitation[]
  statusHistory   RequestStatusHistory[]
  
  @@map("blood_requests")
  @@index([status, urgency])
  @@index([bloodGroup])
  @@index([geographyPoint], type: Gist)
}

model DonorInvitation {
  id              String   @id @default(uuid()) @db.Uuid
  requestId       String   @map("request_id") @db.Uuid
  donorId         String   @map("donor_id") @db.Uuid
  
  matchScore      Float    @map("match_score")
  distanceKm      Float    @map("distance_km")
  
  status          ResponseStatus @default(NOTIFIED)
  unitsCommitted  Int      @default(0) @map("units_committed")
  
  notifiedAt      DateTime @default(now()) @map("notified_at")
  viewedAt        DateTime? @map("viewed_at")
  respondedAt     DateTime? @map("responded_at")
  expiresAt       DateTime @map("expires_at")
  
  declineReason   String?  @map("decline_reason")
  donorNotes      String?  @map("donor_notes") @db.Text
  
  request         BloodRequest @relation(fields: [requestId], references: [id], onDelete: Cascade)
  donor           DonorProfile @relation(fields: [donorId], references: [id], onDelete: Cascade)
  
  @@unique([requestId, donorId])
  @@map("donor_invitations")
  @@index([status, expiresAt])
}

// ... other models (Facility, BloodInventory, LocationSharingSession, etc.)

enum BloodGroup {
  A_POS
  A_NEG
  B_POS
  B_NEG
  AB_POS
  AB_NEG
  O_POS
  O_NEG
  
  @@map("blood_group")
}

enum Urgency {
  ROUTINE
  URGENT
  CRITICAL
  
  @@map("urgency")
}

enum RequestStatus {
  OPEN
  MATCHING
  AWAITING_DONOR_RESPONSE
  PARTIALLY_COMMITTED
  FULLY_COMMITTED
  IN_PROGRESS
  PARTIALLY_FULFILLED
  FULFILLED
  CANCELLED
  EXPIRED
  
  @@map("request_status")
}

enum ResponseStatus {
  NOTIFIED
  VIEWED
  INTERESTED
  DECLINED
  DONATED
  NO_SHOW
  WITHDRAWN
  
  @@map("response_status")
}

// ... other enums
```

---

## 5. API Architecture (REST + OpenAPI)

### 5.1 Endpoint Structure

```
/api/v1/
├── auth/
│   ├── POST /otp/request
│   ├── POST /otp/verify
│   ├── POST /logout
│   └── GET  /me
├── donors/
│   ├── GET    /search (public)
│   ├── POST   /
│   ├── GET    /me
│   ├── PATCH  /me
│   └── GET    /:id (admin)
├── availability/
│   └── PATCH  /
├── requests/
│   ├── GET    / (public)
│   ├── POST   /
│   ├── GET    /:publicId (public)
│   ├── PATCH  /:publicId
│   ├── POST   /:publicId/close
│   ├── POST   /:publicId/notify
│   └── GET    /:publicId/status-history
├── invitations/
│   ├── GET    /token/:token (public)
│   ├── POST   /token/:token/accept (public)
│   ├── POST   /token/:token/decline (public)
│   └── POST   /:id/withdraw
├── facilities/
│   ├── GET    /search (public)
│   ├── GET    /:id (public)
│   ├── POST   /
│   └── PATCH  /:id
├── inventory/
│   ├── GET    /facility/:id (public)
│   └── PATCH  /facility/:id
├── camps/
│   ├── GET    / (public)
│   ├── POST   /
│   └── PATCH  /:id
├── admin/
│   ├── GET    /users
│   ├── GET    /requests
│   ├── GET    /abuse-reports
│   ├── POST   /verifications/:id/approve
│   └── POST   /verifications/:id/reject
└── health/
    └── GET    /
```

---

### 5.2 OpenAPI/Swagger Setup

```typescript
// apps/api/src/main.ts
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log']
  });
  
  // Security
  app.use(helmet());
  
  // CORS
  app.enableCors({
    origin: process.env.WEB_URL,
    credentials: true
  });
  
  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true
  }));
  
  // Swagger/OpenAPI
  const config = new DocumentBuilder()
    .setTitle('Rakta-Daan API')
    .setDescription('Blood discovery and donor coordination API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('donors', 'Donor management')
    .addTag('requests', 'Blood requests')
    .addTag('invitations', 'Donor invitations')
    .addTag('facilities', 'Hospitals and blood banks')
    .addTag('admin', 'Administration')
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  
  // Start server
  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`NestJS API listening on http://localhost:${port}`);
  console.log(`Swagger docs: http://localhost:${port}/api/docs`);
}
bootstrap();
```

**Example Controller with Swagger:**

```typescript
@ApiTags('donors')
@Controller('donors')
export class DonorsController {
  @ApiOperation({ summary: 'Register as a donor' })
  @ApiResponse({ status: 201, description: 'Donor registered successfully', type: DonorProfileDto })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBearerAuth()
  @Post()
  @UseGuards(JwtAuthGuard)
  async registerDonor(
    @CurrentUser() user: User,
    @Body() dto: RegisterDonorDto
  ): Promise<DonorProfileDto> {
    return this.donorsService.register(user.id, dto);
  }
}
```

---

## 6. Real-Time Architecture (Socket.IO)

```typescript
// apps/api/src/requests/requests.gateway.ts
@WebSocketGateway({ namespace: '/requests', cors: { origin: process.env.WEB_URL } })
export class RequestsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;
  
  constructor(
    private authService: AuthService,
    private requestsService: RequestsService
  ) {}
  
  async handleConnection(client: Socket) {
    try {
      // Authenticate socket
      const token = client.handshake.auth.token;
      const user = await this.authService.validateToken(token);
      client.data.userId = user.id;
    } catch (error) {
      client.disconnect();
    }
  }
  
  handleDisconnect(client: Socket) {
    // Cleanup
  }
  
  @SubscribeMessage('subscribe-request')
  async handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { requestId: string }
  ) {
    // Verify access
    const request = await this.requestsService.findById(data.requestId);
    const hasAccess = await this.checkAccess(client.data.userId, request);
    
    if (!hasAccess) {
      throw new WsException('Unauthorized');
    }
    
    client.join(`request:${data.requestId}`);
  }
  
  async emitStatusChange(requestId: string, newStatus: RequestStatus) {
    this.server.to(`request:${requestId}`).emit('status-changed', {
      requestId,
      status: newStatus,
      timestamp: new Date()
    });
  }
}
```

---

## 7. Background Jobs (BullMQ)

```typescript
// apps/api/src/notifications/queues/invitation.processor.ts
@Processor('invitations')
export class InvitationProcessor {
  constructor(
    private prisma: PrismaService,
    private smsService: SmsService,
    private whatsAppService: WhatsAppService
  ) {}
  
  @Process('send-batch')
  async handleSendBatch(job: Job<InvitationBatchJob>) {
    const { invitationIds } = job.data;
    
    for (const invitationId of invitationIds) {
      const invitation = await this.prisma.donorInvitation.findUnique({
        where: { id: invitationId },
        include: { donor: { include: { user: true } }, request: true }
      });
      
      const token = this.generateToken(invitation);
      const link = `https://raktadaan.org/i/${token}`;
      const message = this.formatMessage(invitation, link);
      
      // Send via preferred channel
      if (invitation.donor.user.smsEnabled) {
        await this.smsService.send({
          to: invitation.donor.user.phone,
          message
        });
      }
      
      if (invitation.donor.user.whatsappEnabled) {
        await this.whatsAppService.send({
          to: invitation.donor.user.phone,
          message
        });
      }
      
      await job.updateProgress((invitationIds.indexOf(invitationId) + 1) / invitationIds.length * 100);
    }
  }
  
  @OnQueueCompleted()
  onCompleted(job: Job) {
    console.log(`Invitation batch ${job.id} completed`);
  }
  
  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    console.error(`Invitation batch ${job.id} failed:`, error);
    // Implement retry logic or dead letter queue
  }
}
```

**Queue Setup:**

```typescript
// apps/api/src/notifications/notifications.module.ts
@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'invitations' },
      { name: 'notifications' },
      { name: 'matching' },
      { name: 'expiry' }
    )
  ],
  providers: [
    InvitationProcessor,
    NotificationProcessor,
    MatchingProcessor,
    ExpiryProcessor
  ]
})
export class NotificationsModule {}
```

---

## 8. Deployment Architecture

### 8.1 Docker Compose (Local Development)

```yaml
version: '3.9'

services:
  db:
    image: postgis/postgis:16-3.4-alpine
    environment:
      POSTGRES_DB: rakta_daan
      POSTGRES_USER: rakta
      POSTGRES_PASSWORD: rakta
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./prisma/sql:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U rakta"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s

  api:
    build:
      context: .
      dockerfile: infrastructure/docker/Dockerfile.api
    environment:
      DATABASE_URL: postgresql://rakta:rakta@db:5432/rakta_daan
      REDIS_URL: redis://redis:6379
    ports:
      - "4000:4000"
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./apps/api/src:/app/apps/api/src

  web:
    build:
      context: .
      dockerfile: infrastructure/docker/Dockerfile.web
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:4000
    ports:
      - "3000:3000"
    depends_on:
      - api
    volumes:
      - ./apps/web/src:/app/apps/web/src

volumes:
  postgres_data:
  redis_data:
```

---

### 8.2 Production Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Cloudflare CDN                          │
│              (DDoS protection, SSL, caching)                    │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                     Load Balancer (Nginx)                       │
│          (SSL termination, request routing)                     │
└─────────┬──────────────────────────────────┬────────────────────┘
          │                                  │
          │ /                                │ /api/
          │                                  │
┌─────────▼────────┐              ┌─────────▼────────────┐
│  Next.js (SSR)   │              │  NestJS API          │
│  Vercel/Railway  │              │  Railway/Render      │
│  • Auto-scaling  │              │  • Auto-scaling      │
│  • Edge deploy   │              │  • Multi-instance    │
└──────────────────┘              └──────────┬───────────┘
                                             │
                                  ┌──────────▼───────────┐
                                  │ PostgreSQL 16        │
                                  │ (Managed - Neon/     │
                                  │  Supabase)           │
                                  │ • PostGIS enabled    │
                                  │ • Daily backups      │
                                  │ • Point-in-time      │
                                  └──────────────────────┘
                                  ┌──────────────────────┐
                                  │ Redis (Managed)      │
                                  │ • Upstash/Redis Labs │
                                  │ • Persistence        │
                                  └──────────────────────┘
```

---

## 9. Monitoring & Observability

```typescript
// Pino structured logging
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

// Sentry error tracking
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1
});

// Correlation IDs
@Injectable()
export class CorrelationMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    req['correlationId'] = uuid();
    res.setHeader('X-Correlation-ID', req['correlationId']);
    next();
  }
}
```

---

## 10. Security Architecture

### 10.1 Security Layers

```
1. Network Security
   • HTTPS only (TLS 1.3)
   • DDoS protection (Cloudflare)
   • WAF rules

2. Application Security
   • Helmet (security headers)
   • CORS configuration
   • Rate limiting (Redis-based)
   • Input validation (class-validator)
   • SQL injection prevention (Prisma parameterization)

3. Authentication & Authorization
   • JWT tokens (15-minute expiry)
   • Refresh tokens (7-day rotation)
   • Role-based access control (RBAC)
   • Permission guards

4. Data Security
   • PII encryption at rest (AES-256-GCM)
   • Database encryption (PostgreSQL TDE)
   • Encrypted backups
   • Secure secrets management

5. Audit & Compliance
   • Audit logging (all sensitive operations)
   • GDPR compliance (data export/deletion)
   • Privacy-first architecture
```

---

**Document Status:** ✅ Complete  
**Next Steps:** Create DATABASE_DESIGN.md with complete Prisma schema

---

*This document defines the complete system architecture per Master Prompt requirements.*
