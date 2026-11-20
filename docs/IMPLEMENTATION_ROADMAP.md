# Implementation Roadmap

**Document Version:** 1.0  
**Last Updated:** January 29, 2025  
**Status:** Phase 0 — Project Plan  
**Architecture:** NestJS + Prisma Migration

---

## Executive Summary

This roadmap outlines the **7-8 week migration** from the current Next.js full-stack implementation to the master prompt's required **NestJS + Prisma** architecture.

**Total Estimated Duration:** 7-8 weeks (35-40 working days)  
**Team Size:** 1 full-stack engineer (adjustable for team)  
**Start Date:** Week of February 5, 2025  
**Target Completion:** Late March / Early April 2025

---

## Milestone Overview

| Phase | Duration | Focus | Deliverables |
|-------|----------|-------|--------------|
| **Phase 0** | 3-5 days | Documentation | 9 architecture documents ✅ |
| **Phase 1** | 7-10 days | NestJS + Prisma Setup | Backend foundation, PostGIS |
| **Phase 2** | 15-20 days | API Migration | 23 endpoints rebuilt |
| **Phase 3** | 5-7 days | Frontend Integration | Next.js → NestJS integration |
| **Phase 4** | 5-7 days | Testing Migration | Jest + Supertest tests |
| **Phase 5** | 3-5 days | Integration & QA | End-to-end testing |
| **Phase 6** | 2-3 days | Deployment & Handover | Production deployment |

---

## Phase 0: Documentation (✅ COMPLETE)

### Objective
Complete all master prompt-required Phase 0 documents before implementation.

### Deliverables
- ✅ STATE.md
- ✅ docs/PROJECT_AUDIT.md
- ✅ docs/COMPETITOR_RESEARCH.md
- ✅ docs/PRODUCT_REQUIREMENTS.md
- ✅ docs/USER_JOURNEYS.md
- ✅ docs/SYSTEM_ARCHITECTURE.md
- ✅ docs/DATABASE_DESIGN.md
- ✅ docs/API_SPECIFICATION.md
- ✅ docs/IMPLEMENTATION_ROADMAP.md (this document)

### Duration
**Completed:** January 29, 2025

---

## Phase 1: NestJS Backend Setup + Prisma Migration

### Objective
Initialize NestJS project, migrate Drizzle → Prisma, enable PostGIS.

### Week 1-2 (7-10 days)

#### Day 1: Project Structure Setup

**Tasks:**
1. Create monorepo structure
   ```bash
   mkdir -p apps/api apps/web packages/shared-types packages/validation
   ```

2. Initialize pnpm workspace
   ```yaml
   # pnpm-workspace.yaml
   packages:
     - 'apps/*'
     - 'packages/*'
   ```

3. Initialize NestJS backend
   ```bash
   cd apps/
   npx @nestjs/cli new api
   ```

4. Move existing Next.js to `apps/web/`
   ```bash
   mv src apps/web/
   mv public apps/web/
   mv next.config.ts apps/web/
   ```

5. Update root `package.json` with workspace scripts

**Deliverables:**
- ✅ Monorepo structure created
- ✅ pnpm workspace configured
- ✅ NestJS project initialized
- ✅ Frontend moved to `apps/web/`

---

#### Day 2-3: Prisma Schema Creation

**Tasks:**
1. Install Prisma
   ```bash
   pnpm add -D prisma
   pnpm add @prisma/client
   ```

2. Initialize Prisma
   ```bash
   npx prisma init
   ```

3. Convert Drizzle schema → `prisma/schema.prisma`
   - Start with core models: User, DonorProfile, BloodRequest
   - Add enums: BloodGroup, Urgency, RequestStatus, etc.
   - Define relations
   - Add indexes

4. Create PostGIS setup SQL
   ```sql
   -- prisma/sql/00_enable_postgis.sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   CREATE EXTENSION IF NOT EXISTS postgis_topology;
   ```

5. Add geography columns to schema
   ```prisma
   model DonorProfile {
     // ...
     geographyPoint Unsupported("geography(Point, 4326)")?
     @@index([geographyPoint], type: Gist)
   }
   ```

**Deliverables:**
- ✅ `prisma/schema.prisma` complete (18+ models)
- ✅ PostGIS SQL scripts created
- ✅ All enums migrated
- ✅ Relations defined

---

#### Day 4: Database Migration & Testing

**Tasks:**
1. Create initial migration
   ```bash
   npx prisma migrate dev --name init
   ```

2. Run PostGIS setup
   ```bash
   psql -U rakta -d rakta_daan -f prisma/sql/00_enable_postgis.sql
   ```

3. Backfill geography points from existing lat/lon
   ```sql
   UPDATE donor_profiles
   SET geography_point = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
   WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
   ```

4. Test Prisma queries
   ```typescript
   // Test basic CRUD
   const user = await prisma.user.create({ data: { ... } });
   
   // Test PostGIS query
   const nearby = await prisma.$queryRaw`
     SELECT * FROM donor_profiles
     WHERE ST_DWithin(geography_point, ST_MakePoint(85.324, 27.717)::geography, 10000);
   `;
   ```

**Deliverables:**
- ✅ Database migrated successfully
- ✅ PostGIS enabled and tested
- ✅ Geography points created
- ✅ Spatial indexes working

---

#### Day 5-6: NestJS Core Modules Setup

**Tasks:**
1. Create module structure
   ```bash
   cd apps/api/src
   nest g module database
   nest g module config
   nest g module auth
   nest g module users
   nest g module donors
   nest g module requests
   ```

2. Set up Prisma service
   ```typescript
   // apps/api/src/database/prisma.service.ts
   @Injectable()
   export class PrismaService extends PrismaClient implements OnModuleInit {
     async onModuleInit() {
       await this.$connect();
     }
   }
   ```

3. Set up Config module
   ```typescript
   // apps/api/src/config/configuration.ts
   export default () => ({
     database: {
       url: process.env.DATABASE_URL,
     },
     jwt: {
       secret: process.env.JWT_SECRET,
       expiresIn: '15m',
     },
     // ...
   });
   ```

4. Create base DTOs and decorators
   ```typescript
   // apps/api/src/common/decorators/current-user.decorator.ts
   export const CurrentUser = createParamDecorator(
     (data: unknown, ctx: ExecutionContext) => {
       const request = ctx.switchToHttp().getRequest();
       return request.user;
     },
   );
   ```

5. Set up Swagger
   ```typescript
   // apps/api/src/main.ts
   const config = new DocumentBuilder()
     .setTitle('Rakta-Daan API')
     .setVersion('1.0')
     .addBearerAuth()
     .build();
   const document = SwaggerModule.createDocument(app, config);
   SwaggerModule.setup('api/docs', app, document);
   ```

**Deliverables:**
- ✅ Core NestJS modules created
- ✅ Prisma service configured
- ✅ Environment validation setup
- ✅ Swagger/OpenAPI configured

---

#### Day 7-8: Redis + BullMQ Setup

**Tasks:**
1. Install BullMQ
   ```bash
   pnpm add @nestjs/bull bullmq ioredis
   ```

2. Configure BullMQ
   ```typescript
   // apps/api/src/app.module.ts
   @Module({
     imports: [
       BullModule.forRoot({
         connection: {
           host: 'localhost',
           port: 6379,
         },
       }),
       BullModule.registerQueue(
         { name: 'matching' },
         { name: 'invitations' },
         { name: 'notifications' },
         { name: 'expiry' }
       ),
     ],
   })
   ```

3. Create queue processors
   ```typescript
   // apps/api/src/notifications/processors/invitation.processor.ts
   @Processor('invitations')
   export class InvitationProcessor {
     @Process('send-batch')
     async handleSendBatch(job: Job) {
       // Process invitation notifications
     }
   }
   ```

4. Test queue functionality
   ```typescript
   await this.invitationQueue.add('send-batch', {
     invitationIds: ['id1', 'id2']
   });
   ```

**Deliverables:**
- ✅ Redis connected
- ✅ BullMQ configured
- ✅ 4 queues created
- ✅ Sample processor tested

---

#### Day 9-10: Docker Compose Update

**Tasks:**
1. Update `docker-compose.yml`
   ```yaml
   services:
     db:
       image: postgis/postgis:16-3.4-alpine
       # ...
     
     redis:
       image: redis:7-alpine
       # ...
     
     api:
       build:
         context: .
         dockerfile: infrastructure/docker/Dockerfile.api
       environment:
         DATABASE_URL: postgresql://rakta:rakta@db:5432/rakta_daan
         REDIS_URL: redis://redis:6379
       # ...
   ```

2. Create Dockerfile for API
   ```dockerfile
   # infrastructure/docker/Dockerfile.api
   FROM node:20-alpine
   WORKDIR /app
   COPY package.json pnpm-lock.yaml ./
   RUN npm install -g pnpm && pnpm install --frozen-lockfile
   COPY . .
   RUN pnpm --filter api build
   CMD ["pnpm", "--filter", "api", "start:prod"]
   ```

3. Test full stack startup
   ```bash
   docker compose up -d
   docker compose logs -f api
   ```

**Deliverables:**
- ✅ Docker Compose updated
- ✅ API Dockerfile created
- ✅ Full stack starts successfully
- ✅ Health endpoint responds

---

### Phase 1 Acceptance Criteria

- [ ] NestJS backend starts on port 4000
- [ ] Swagger UI accessible at `/api/docs`
- [ ] Prisma migrations applied successfully
- [ ] PostGIS queries working
- [ ] Redis connected and functional
- [ ] BullMQ queues processing jobs
- [ ] Docker Compose brings up all services
- [ ] Health endpoint returns 200 OK

---

## Phase 2: API Endpoint Migration

### Objective
Migrate all 23 API endpoints from Next.js to NestJS.

### Week 3-5 (15-20 days)

#### Module 1: AuthModule (Days 11-13, 3 days)

**Endpoints to Migrate:**
- POST `/auth/otp/request`
- POST `/auth/otp/verify`
- POST `/auth/logout`
- GET `/auth/me`

**Tasks:**
1. Create `AuthController` with Swagger decorators
2. Implement `AuthService`:
   - OTP generation (6 digits, 5-minute expiry)
   - OTP verification
   - JWT token issuance
   - Session management
3. Implement `OtpService`:
   - Store OTP in database
   - Rate limiting (3 per 10 minutes)
4. Create `JwtStrategy` for Passport
5. Create `JwtAuthGuard`
6. Write unit tests (Jest)
7. Write API tests (Supertest)

**Test Coverage:**
- OTP request rate limiting
- OTP expiry
- JWT token validation
- Invalid OTP rejection
- Session creation

**Deliverables:**
- ✅ AuthModule complete
- ✅ 4 endpoints working
- ✅ 15+ tests passing
- ✅ Swagger docs generated

---

#### Module 2: UsersModule (Day 14, 1 day)

**Tasks:**
1. Create `UsersController`
2. Implement `UsersService` (CRUD)
3. Admin-only user list endpoint
4. Update user profile
5. Soft delete support
6. Tests

**Deliverables:**
- ✅ UsersModule complete
- ✅ 5+ tests passing

---

#### Module 3: DonorsModule (Days 15-17, 3 days)

**Endpoints to Migrate:**
- GET `/donors/search` (public, PostGIS)
- POST `/donors`
- GET `/donors/me`
- PATCH `/donors/me`
- PATCH `/availability`

**Tasks:**
1. Create `DonorsController`
2. Implement `DonorsService`:
   - Registration with eligibility validation
   - Profile updates
   - Availability state management
   - Next eligible date calculation
3. Implement PostGIS donor search:
   ```typescript
   async findNearbyDonors(lat, lon, bloodGroup, radius) {
     return prisma.$queryRaw`
       SELECT ...
       WHERE ST_DWithin(geography_point, ST_MakePoint(${lon}, ${lat})::geography, ${radius * 1000})
       ORDER BY geography_point <-> ST_MakePoint(${lon}, ${lat})::geography
     `;
   }
   ```
4. Create `EligibilityService` (age, weight validation)
5. Write comprehensive tests (edge cases)

**Test Coverage:**
- Eligibility validation (age 18-60, weight >= 50kg)
- PostGIS spatial queries
- Availability state transitions
- Next eligible date calculation

**Deliverables:**
- ✅ DonorsModule complete
- ✅ 5 endpoints working
- ✅ 20+ tests passing
- ✅ PostGIS queries optimized

---

#### Module 4: RequestsModule (Days 18-20, 3 days)

**Endpoints to Migrate:**
- GET `/requests` (public list)
- POST `/requests`
- GET `/requests/:publicId`
- PATCH `/requests/:publicId`
- POST `/requests/:publicId/close`
- POST `/requests/:publicId/notify`
- GET `/requests/:publicId/status-history`

**Tasks:**
1. Create `RequestsController`
2. Implement `RequestsService`:
   - Request creation (generate publicId)
   - PII encryption (patient name, diagnosis)
   - Status management
   - Request search/filtering
3. Implement `RequestStateMachine`:
   - Valid state transitions
   - State change logging
4. Implement `RequestsGateway` (Socket.IO):
   - Real-time status updates
   - Room subscription with auth
5. Trigger matching algorithm on creation
6. Tests

**Test Coverage:**
- Request creation validation
- PII encryption
- State machine transitions
- Authorization (owner access)
- Real-time updates

**Deliverables:**
- ✅ RequestsModule complete
- ✅ 7 endpoints working
- ✅ 25+ tests passing
- ✅ WebSocket gateway functional

---

#### Module 5: MatchingModule (Days 21-24, 4 days)

**Core Algorithm Implementation:**

**Tasks:**
1. Create `MatchingController`
2. Implement `MatchingService`:
   - Candidate filtering (blood group, location, availability)
   - Candidate ranking (distance, response rate)
   - Wave scheduling (5km → 10km → 20km)
3. Implement `MatchingAlgorithm`:
   - Score calculation
   - PostGIS distance queries
   - Batch creation
4. Create `MatchingProcessor` (BullMQ):
   - Background matching jobs
   - Wave scheduling
5. Extensive testing (concurrency, edge cases)

**Algorithm Pseudocode:**
```typescript
async function runMatchingAlgorithm(requestId: string): Promise<void> {
  const request = await getRequest(requestId);
  
  for (const wave of [5, 10, 20, 50]) {
    const candidates = await findCandidates(request, radiusKm: wave, limit: wave * 2);
    
    if (candidates.length > 0) {
      await createInvitations(candidates, requestId);
      await scheduleNextWave(requestId, delay: 30 minutes);
      return;
    }
  }
  
  await escalateToCoordinators(requestId);
}
```

**Test Coverage:**
- Candidate filtering accuracy
- PostGIS distance calculations
- Wave progression logic
- No duplicate invitations
- Queue job processing

**Deliverables:**
- ✅ MatchingModule complete
- ✅ Core algorithm working
- ✅ 30+ tests passing
- ✅ Queue processing tested

---

#### Module 6: InvitationsModule (Days 25-26, 2 days)

**Endpoints to Migrate:**
- GET `/invitations/token/:token`
- POST `/invitations/token/:token/accept`
- POST `/invitations/token/:token/decline`
- POST `/invitations/:id/withdraw`

**Tasks:**
1. Create `InvitationsController`
2. Implement `InvitationsService`:
   - Token generation (JWT)
   - Acceptance with unit allocation (transaction)
   - Decline with reason logging
   - Withdrawal with unit release
3. Create `InvitationProcessor` (BullMQ):
   - Send notifications
   - Multi-channel delivery
4. Tests (especially concurrency for acceptance)

**Critical Test:**
```typescript
it('should prevent over-commitment (concurrent acceptances)', async () => {
  // 3 donors try to accept simultaneously for 2-unit request
  // Only 2 should succeed, 3rd gets rejected
});
```

**Deliverables:**
- ✅ InvitationsModule complete
- ✅ 4 endpoints working
- ✅ 20+ tests passing
- ✅ Concurrency-safe unit allocation

---

#### Module 7: FacilitiesModule (Days 27-28, 2 days)

**Endpoints to Migrate:**
- GET `/facilities/search` (public, PostGIS)
- GET `/facilities/:id`
- POST `/facilities`
- PATCH `/facilities/:id`

**Tasks:**
1. Create `FacilitiesController`
2. Implement `FacilitiesService`:
   - Facility CRUD
   - PostGIS facility search
   - Verification workflow
3. Tests

**Deliverables:**
- ✅ FacilitiesModule complete
- ✅ 4 endpoints working
- ✅ 15+ tests passing

---

#### Module 8: InventoryModule (Day 29, 1 day)

**Endpoints to Migrate:**
- GET `/inventory/facility/:id` (public)
- PATCH `/inventory/facility/:id` (facility staff only)

**Tasks:**
1. Create `InventoryController`
2. Implement `InventoryService`:
   - Inventory CRUD
   - Stock freshness tracking
   - Low-stock alerts
3. Role guard (facility_staff only for updates)
4. Tests

**Deliverables:**
- ✅ InventoryModule complete
- ✅ 2 endpoints working
- ✅ 10+ tests passing

---

#### Module 9: AdminModule (Day 30, 1 day)

**Endpoints to Migrate:**
- GET `/admin/abuse/:id`
- GET `/admin/camps`
- POST `/admin/orgs/:id/verification`
- POST `/abuse-reports`

**Tasks:**
1. Create `AdminController`
2. Implement admin actions (approve/reject verification)
3. Abuse report handling
4. Role guard (admin only)
5. Audit logging
6. Tests

**Deliverables:**
- ✅ AdminModule complete
- ✅ 4 endpoints working
- ✅ 15+ tests passing

---

#### Module 10: NotificationsModule (Day 31, 1 day)

**Tasks:**
1. Create `NotificationsService`
2. Implement provider adapters:
   - `SmsService` (Sparrow SMS integration)
   - `WhatsAppService` (placeholder)
   - `EmailService` (Resend integration)
3. Create `NotificationProcessor` (BullMQ)
4. Webhook receiver for delivery status
5. Tests

**Deliverables:**
- ✅ NotificationsModule complete
- ✅ Multi-channel support
- ✅ Queue processing
- ✅ 10+ tests passing

---

### Phase 2 Acceptance Criteria

- [ ] All 23 API endpoints migrated to NestJS
- [ ] 100+ Jest unit tests passing
- [ ] 25+ Supertest API tests passing
- [ ] OpenAPI/Swagger docs complete and accurate
- [ ] PostGIS queries optimized (< 100ms for 10K donors)
- [ ] Matching algorithm tested with concurrency scenarios
- [ ] BullMQ queues processing reliably
- [ ] Authorization guards enforced on all protected endpoints

---

## Phase 3: Frontend Integration

### Objective
Update Next.js frontend to call NestJS backend.

### Week 6 (5-7 days)

#### Day 32-33: API Client Refactoring

**Tasks:**
1. Update `apps/web/src/services/api.ts`:
   ```typescript
   // Old: calls /api/v1/* (Next.js routes)
   // New: calls http://localhost:4000/api/v1/* (NestJS)
   
   const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
   
   export async function apiRequest(endpoint: string, options?: RequestInit) {
     const response = await fetch(`${API_BASE_URL}${endpoint}`, {
       ...options,
       credentials: 'include', // Send cookies
       headers: {
         'Content-Type': 'application/json',
         ...options?.headers
       }
     });
     
     if (!response.ok) {
       throw new ApiError(response.status, await response.json());
     }
     
     return response.json();
   }
   ```

2. Update environment variables:
   ```env
   # apps/web/.env.local
   NEXT_PUBLIC_API_URL=http://localhost:4000
   ```

3. Remove `apps/web/src/app/api/` directory (no longer needed)

4. Test all API calls from frontend

**Deliverables:**
- ✅ API client updated
- ✅ Next.js API routes removed
- ✅ All pages load correctly

---

#### Day 34-35: Authentication Flow Update

**Tasks:**
1. Update OTP login flow:
   - Form submission calls NestJS
   - JWT token stored in HttpOnly cookie
   - Session persistence
2. Update authentication context/hooks
3. Update protected route middleware
4. Test login/logout flow

**Deliverables:**
- ✅ Login works with NestJS backend
- ✅ Sessions persist
- ✅ Protected routes enforce authentication

---

#### Day 36-37: WebSocket Integration

**Tasks:**
1. Install Socket.IO client
   ```bash
   cd apps/web
   pnpm add socket.io-client
   ```

2. Create WebSocket hook:
   ```typescript
   // apps/web/src/hooks/useRequestUpdates.ts
   export function useRequestUpdates(requestId: string) {
     const [socket, setSocket] = useState<Socket | null>(null);
     
     useEffect(() => {
       const socket = io('http://localhost:4000/requests', {
         auth: { token: getAuthToken() }
       });
       
       socket.emit('subscribe-request', { requestId });
       
       socket.on('status-changed', (data) => {
         // Update UI
       });
       
       setSocket(socket);
       
       return () => {
         socket.disconnect();
       };
     }, [requestId]);
   }
   ```

3. Update request tracking page to use WebSocket
4. Test real-time updates

**Deliverables:**
- ✅ WebSocket connection established
- ✅ Real-time status updates working

---

#### Day 38: CORS Configuration

**Tasks:**
1. Configure CORS in NestJS:
   ```typescript
   // apps/api/src/main.ts
   app.enableCors({
     origin: process.env.WEB_URL || 'http://localhost:3000',
     credentials: true
   });
   ```

2. Test cross-origin requests
3. Verify cookies work cross-origin

**Deliverables:**
- ✅ CORS configured correctly
- ✅ No CORS errors in browser console

---

### Phase 3 Acceptance Criteria

- [ ] Frontend calls NestJS backend successfully
- [ ] Authentication flow works end-to-end
- [ ] All pages load without errors
- [ ] Real-time updates functional
- [ ] CORS configured properly
- [ ] No API integration errors

---

## Phase 4: Testing Migration

### Objective
Migrate Vitest tests to Jest, add Supertest API tests.

### Week 7 (5-7 days)

#### Day 39-40: Jest Setup for Backend

**Tasks:**
1. Configure Jest for NestJS:
   ```typescript
   // apps/api/jest.config.js
   module.exports = {
     preset: '@nestjs/testing',
     testEnvironment: 'node',
     roots: ['<rootDir>/src'],
     testMatch: ['**/*.spec.ts'],
     collectCoverageFrom: ['src/**/*.ts']
   };
   ```

2. Create test database setup:
   ```typescript
   // apps/api/test/setup.ts
   beforeAll(async () => {
     await prisma.$executeRaw`CREATE DATABASE rakta_daan_test;`;
     await prisma.$executeRaw`CREATE EXTENSION postgis;`;
   });
   ```

3. Write base test utilities:
   ```typescript
   // apps/api/test/utils/test-helpers.ts
   export async function createTestUser() { ... }
   export async function createTestRequest() { ... }
   export async function getAuthToken() { ... }
   ```

**Deliverables:**
- ✅ Jest configured
- ✅ Test database setup
- ✅ Test utilities created

---

#### Day 41-43: Write API Tests (Supertest)

**Tasks:**
1. Write integration tests for each module:
   - AuthModule (login flow, token validation)
   - DonorsModule (registration, search)
   - RequestsModule (create, list, update)
   - MatchingModule (algorithm execution)
   - InvitationsModule (accept/decline, concurrency)

2. Example test:
   ```typescript
   // apps/api/test/integration/requests.e2e.spec.ts
   describe('RequestsController (e2e)', () => {
     let app: INestApplication;
     let authToken: string;
     
     beforeAll(async () => {
       const moduleFixture = await Test.createTestingModule({
         imports: [AppModule],
       }).compile();
       
       app = moduleFixture.createNestApplication();
       await app.init();
       
       authToken = await getAuthToken(app);
     });
     
     it('/requests (POST)', async () => {
       return request(app.getHttpServer())
         .post('/requests')
         .set('Authorization', `Bearer ${authToken}`)
         .send({
           bloodGroup: 'O_POS',
           requiredUnits: 2,
           urgency: 'CRITICAL'
         })
         .expect(201)
         .expect((res) => {
           expect(res.body.publicId).toMatch(/^REQ-/);
         });
     });
   });
   ```

3. Target: 25+ API integration tests

**Deliverables:**
- ✅ 25+ Supertest tests written
- ✅ All tests passing
- ✅ Code coverage > 70%

---

#### Day 44-45: Keep Frontend Tests (Vitest)

**Tasks:**
1. Keep Vitest for frontend (don't migrate)
2. Update frontend tests to mock NestJS API calls
3. Ensure all 180 Vitest tests still pass

**Deliverables:**
- ✅ Frontend tests passing
- ✅ API mocks updated

---

### Phase 4 Acceptance Criteria

- [ ] 100+ Jest unit tests passing (backend)
- [ ] 25+ Supertest API tests passing (backend)
- [ ] 180 Vitest tests passing (frontend)
- [ ] 40 Playwright E2E tests passing
- [ ] Code coverage > 70% for backend

---

## Phase 5: Integration & QA

### Objective
End-to-end testing, bug fixes, performance optimization.

### Week 8 (3-5 days)

#### Day 46-47: End-to-End Testing

**Tasks:**
1. Run Playwright E2E tests against NestJS backend
2. Update E2E tests for any API changes
3. Test all 6 user journeys:
   - Journey A: Find Blood
   - Journey B: Create Request
   - Journey C: Donor Registration
   - Journey D: Accept Invitation
   - Journey E: Track Request
   - Journey F: Update Inventory

4. Fix integration issues

**Deliverables:**
- ✅ All Playwright tests passing
- ✅ User journeys validated

---

#### Day 48: Performance Testing

**Tasks:**
1. Benchmark PostGIS queries:
   - Test with 10K+ donor records
   - Ensure < 100ms response time
   - Verify GIST index usage via EXPLAIN ANALYZE

2. Load test API endpoints:
   - 100 concurrent requests
   - Measure response times (p50, p95, p99)

3. Optimize slow queries

**Deliverables:**
- ✅ Performance benchmarks documented
- ✅ Optimizations applied

---

#### Day 49: Security Testing

**Tasks:**
1. Test authentication bypass attempts
2. Test IDOR vulnerabilities
3. Test SQL injection (Prisma should prevent)
4. Test XSS (React should prevent)
5. Test rate limiting
6. Test unauthorized access to protected endpoints

**Deliverables:**
- ✅ No critical security issues
- ✅ Security checklist complete

---

#### Day 50: Bug Fixes

**Tasks:**
1. Fix issues found during testing
2. Address edge cases
3. Improve error messages
4. Polish UX

**Deliverables:**
- ✅ All critical bugs fixed
- ✅ Known issues documented

---

### Phase 5 Acceptance Criteria

- [ ] All E2E tests passing
- [ ] Performance benchmarks meet targets
- [ ] No critical security issues
- [ ] All critical bugs fixed
- [ ] System stable under load

---

## Phase 6: Deployment & Handover

### Objective
Deploy to production, documentation, handover.

### Week 8-9 (2-3 days)

#### Day 51: Production Configuration

**Tasks:**
1. Set up production environment variables
2. Configure managed PostgreSQL (Neon/Supabase)
3. Enable PostGIS on production database
4. Configure managed Redis (Upstash)
5. Set up Sentry error tracking
6. Configure production CORS
7. Set up SSL certificates

**Deliverables:**
- ✅ Production environment configured
- ✅ Database migrations applied
- ✅ Secrets configured

---

#### Day 52: Deployment

**Tasks:**
1. Deploy NestJS backend to Railway/Render
2. Deploy Next.js frontend to Vercel
3. Test production deployment
4. Monitor logs and errors
5. Set up health checks
6. Configure auto-scaling

**Deliverables:**
- ✅ Backend deployed and running
- ✅ Frontend deployed and running
- ✅ Health checks passing

---

#### Day 53: Documentation & Handover

**Tasks:**
1. Update README.md with new setup instructions
2. Document API changes
3. Create deployment runbook
4. Document troubleshooting steps
5. Create handover document
6. Knowledge transfer session

**Deliverables:**
- ✅ Documentation complete
- ✅ Handover complete
- ✅ Team trained

---

### Phase 6 Acceptance Criteria

- [ ] Production deployment successful
- [ ] System monitoring active
- [ ] Documentation updated
- [ ] Team trained on new architecture
- [ ] Handover complete

---

## Risk Management

### High-Risk Items

| Risk | Mitigation |
|------|------------|
| PostGIS complexity | Test thoroughly in dev, document queries |
| Data loss during migration | Backup before migration, test restore |
| Performance degradation | Benchmark early, optimize PostGIS indexes |
| Breaking existing features | Comprehensive E2E testing |
| Deployment issues | Test on staging first, rollback plan ready |

### Contingency Plans

**If Migration Takes Longer:**
- Prioritize P0 features
- Defer P1 features to post-launch
- Add buffer week to schedule

**If Critical Issues Found:**
- Stop migration
- Fix issues in current system
- Resume migration when stable

---

## Success Metrics

### Technical Metrics
- ✅ All 238 tests passing (180 Vitest + 40 Playwright + 18 new)
- ✅ API response time < 500ms (p95)
- ✅ PostGIS queries < 100ms
- ✅ Code coverage > 70%
- ✅ 0 critical security issues
- ✅ OpenAPI docs 100% complete

### Project Metrics
- ✅ Completed within 7-8 weeks
- ✅ All P0 features implemented
- ✅ Zero production downtime during deployment
- ✅ Team trained and confident with new stack

---

## Dependencies & Blockers

### External Dependencies
- PostgreSQL with PostGIS support (managed provider)
- Redis (managed provider)
- SMS provider API credentials (Sparrow SMS)
- Email provider API key (Resend)
- Production hosting (Railway/Render + Vercel)

### Internal Dependencies
- User decision to proceed with NestJS migration ✅ (approved)
- Design system and components (already exists) ✅
- Database schema design (already exists) ✅

### Potential Blockers
- PostGIS setup complexity → Mitigated by using postgis/postgis Docker image
- BullMQ learning curve → Mitigated by starting with simple queues
- Prisma spatial types limitation → Mitigated by using $queryRaw for PostGIS

---

## Communication Plan

### Weekly Updates
- Document progress in STATE.md
- Share completed milestones
- Escalate blockers immediately

### Phase Completion Reviews
- Demo working features
- Review test results
- Plan next phase

---

## Conclusion

This roadmap provides a **detailed, week-by-week plan** to migrate Rakta-Daan from Next.js full-stack to NestJS + Prisma architecture as required by the master prompt.

**Key Advantages of This Approach:**
- Preserves excellent existing frontend (Next.js 16 + React 19)
- Rebuilds backend with proper NestJS modular architecture
- Enables PostGIS for performant geospatial queries
- Integrates BullMQ for reliable background jobs
- Maintains comprehensive test coverage

**Estimated Timeline:** 7-8 weeks  
**Confidence Level:** HIGH (clear tasks, proven technologies)

---

**Next Action:** Begin Phase 1 Day 1 — Create monorepo structure

---

*This roadmap was created per Master Prompt Section 32 requirements.*
