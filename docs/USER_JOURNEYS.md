# User Journeys

**Document Version:** 1.0  
**Last Updated:** January 29, 2025  
**Status:** Phase 0 — Journey Mapping  
**Architecture:** NestJS + Prisma + Next.js

---

## Executive Summary

This document maps complete user journeys through Rakta-Daan, from discovery to fulfillment. Each journey includes:
- User goals and context
- Step-by-step flow
- Technical requirements (NestJS endpoints, Prisma models)
- Success criteria
- Error handling
- Test scenarios

---

## Journey Classification

| Journey | User Type | Priority | Complexity | Backend Endpoints |
|---------|-----------|----------|------------|-------------------|
| **A:** Find Blood | Public/Requester | P0 | Medium | Search, Facilities |
| **B:** Create Request | Requester | P0 | High | Requests, Matching |
| **C:** Donor Registration | Donor | P0 | Medium | Auth, Donors |
| **D:** Accept Invitation | Donor | P0 | High | Invitations, Responses |
| **E:** Track Request | Requester | P0 | Medium | Requests, Status |
| **F:** Update Inventory | Facility Staff | P1 | Low | Inventory |

---

## Journey A: Find Blood (Public Visitor)

### A.1 User Context

**Actor:** Ravi, 32, needs blood for his father  
**Context:** Father scheduled for surgery tomorrow, hospital blood bank stock low  
**Device:** Mobile phone (Android), 4G connection  
**Goal:** Find O+ blood donors or facilities nearby quickly  

---

### A.2 Journey Flow

```
1. Open Rakta-Daan homepage
   ↓
2. Click "Find Blood" (prominent CTA)
   ↓
3. Select blood group: O+
   ↓
4. Choose location method:
   → [Allow GPS] → Detects: Kathmandu, Nepal
   → [Enter Manually] → Selects: Kathmandu District
   → [Not Now] → Proceeds without location (city-wide search)
   ↓
5. View search results:
   → Map view (facilities with pins)
   → List view (donors + facilities sorted by distance)
   ↓
6. Filter results:
   → Donors only
   → Facilities only
   → Within 5km / 10km / 20km
   ↓
7. View donor cards (anonymized):
   → "O+ Donor"
   → "Available"
   → "~3 km away" (approximate)
   → "Last donated 6 months ago"
   → [Create Request to Contact]
   ↓
8. View facility cards:
   → "Bir Hospital Blood Bank"
   → "O+ Whole Blood: 8 units" (updated 2 hours ago)
   → "2.5 km away"
   → Phone: +977-1-4321693
   → [Call] [Directions]
   ↓
9. Decision:
   → Create request (Journey B)
   → Call facility directly
   → Save for later
```

---

### A.3 Technical Requirements

**Frontend (Next.js):**
- `/[locale]/find` — Blood search page
- Components:
  - `BloodGroupPicker` (A+, A-, B+, B-, AB+, AB-, O+, O-)
  - `LocationSelector` (GPS, manual, skip)
  - `SearchResults` (map + list views)
  - `DonorCard` (anonymized preview)
  - `FacilityCard` (full details)

**Backend (NestJS):**

```typescript
// apps/api/src/donors/donors.controller.ts
@Controller('donors')
export class DonorsController {
  @Get('search')
  @Public() // No authentication required
  async searchDonors(
    @Query() dto: SearchDonorsDto
  ): Promise<SearchResultsDto> {
    // Uses PostGIS spatial query
    // Returns anonymized donor cards
  }
}

// apps/api/src/facilities/facilities.controller.ts
@Controller('facilities')
export class FacilitiesController {
  @Get('search')
  @Public()
  async searchFacilities(
    @Query() dto: SearchFacilitiesDto
  ): Promise<FacilityResultsDto> {
    // Includes blood inventory
    // Shows stock freshness
  }
}
```

**Database (Prisma):**

```prisma
model DonorProfile {
  id              String   @id @default(uuid())
  userId          String   @unique
  bloodGroup      BloodGroup
  availabilityState AvailabilityState
  latitude        Float?
  longitude       Float?
  geographyPoint  Unsupported("geography(Point, 4326)")?
  districtId      String
  
  // Privacy: exact location not returned in public search
  // Only approximate distance calculated server-side
}

model Facility {
  id              String   @id @default(uuid())
  name            String
  nameNepali      String?
  type            OrgType
  latitude        Float
  longitude       Float
  geographyPoint  Unsupported("geography(Point, 4326)")?
  phone           String?
  
  inventory       BloodInventory[]
}

model BloodInventory {
  id              String   @id @default(uuid())
  facilityId      String
  bloodGroup      BloodGroup
  component       BloodComponent
  unitsAvailable  Int
  lastUpdated     DateTime
  
  facility        Facility @relation(...)
}
```

**PostGIS Query (Donor Search):**

```typescript
// apps/api/src/donors/donors.service.ts
async findNearbyDonors(
  bloodGroup: BloodGroup,
  lat: number,
  lon: number,
  radiusKm: number
): Promise<DonorSearchResult[]> {
  return this.prisma.$queryRaw`
    SELECT 
      id,
      blood_group,
      availability_state,
      district_id,
      ST_Distance(
        geography_point, 
        ST_MakePoint(${lon}, ${lat})::geography
      ) / 1000 AS distance_km
    FROM donor_profiles
    WHERE 
      blood_group = ${bloodGroup}::"blood_group"
      AND availability_state = 'available'
      AND ST_DWithin(
        geography_point,
        ST_MakePoint(${lon}, ${lat})::geography,
        ${radiusKm * 1000}
      )
    ORDER BY geography_point <-> ST_MakePoint(${lon}, ${lat})::geography
    LIMIT 50
  `;
}
```

---

### A.4 Success Criteria

✅ **Journey Success:**
- User finds at least one available resource (donor or facility)
- Results load within 2 seconds
- Distance calculations are accurate
- Stock freshness is clearly displayed

❌ **Journey Failure:**
- No results found (edge case: rural area, rare blood type)
- GPS permission denied (fallback to manual works)
- Stale inventory shown as fresh (mitigated by freshness labels)

---

### A.5 Error Scenarios

| Error | Cause | Mitigation |
|-------|-------|------------|
| No donors found | Rural area or rare blood type | Show nearby facilities, expand radius |
| GPS denied | User privacy concern | Provide manual location selector |
| Slow loading | Poor network | Show skeleton loaders, optimize queries |
| Stale inventory | Facility hasn't updated | Label "Last updated 3 days ago" |

---

### A.6 Test Scenarios

```typescript
describe('Journey A: Find Blood', () => {
  describe('Public Search', () => {
    it('should return donors within 10km radius', async () => {
      const result = await request(app.getHttpServer())
        .get('/donors/search')
        .query({
          bloodGroup: 'O_POS',
          latitude: 27.7172,
          longitude: 85.3240,
          radiusKm: 10
        })
        .expect(200);
      
      expect(result.body.donors.length).toBeGreaterThan(0);
      expect(result.body.donors[0].distanceKm).toBeLessThan(10);
    });
    
    it('should anonymize donor contact info in public search', async () => {
      const result = await request(app.getHttpServer())
        .get('/donors/search')
        .query({ bloodGroup: 'O_POS', latitude: 27.7172, longitude: 85.3240 })
        .expect(200);
      
      expect(result.body.donors[0].phone).toBeUndefined();
      expect(result.body.donors[0].email).toBeUndefined();
      expect(result.body.donors[0].exactLocation).toBeUndefined();
    });
  });
});
```

---

## Journey B: Create Blood Request

### B.1 User Context

**Actor:** Ravi (from Journey A)  
**Context:** Search results showed limited options, wants to broadcast need  
**Device:** Mobile phone  
**Goal:** Create urgent blood request to notify nearby O+ donors  

---

### B.2 Journey Flow

```
1. Click "Create Request" from search results
   ↓
2. Authentication required → OTP login:
   → Enter phone: +977-9876543210
   → Receive SMS OTP: 123456
   → Verify OTP
   → Account created (first-time user)
   ↓
3. Fill request form:
   → Blood group: O+ (pre-filled from search)
   → Required units: 2
   → Urgency: Critical
   → Required by: Tomorrow 10:00 AM
   → Hospital: [Select] Bir Hospital
   → Location: Auto-filled from hospital
   → Patient info (optional):
      - Name: [Encrypted]
      - Age: 65
      - Gender: Male
      - Diagnosis: Scheduled surgery
   → Contact info:
      - Name: Ravi Kumar
      - Phone: +977-9876543210
      - Relation: Son
   → Additional notes: "Father needs blood for heart surgery tomorrow morning"
   → Public message: "Urgent: O+ blood needed at Bir Hospital"
   ↓
4. Review and consent:
   → Privacy notice shown
   → "I confirm this is a genuine request"
   → "I consent to donor contact via platform"
   → [Submit Request]
   ↓
5. Request created:
   → Confirmation screen
   → Request ID: REQ-2025-001234
   → Status: "Matching donors..."
   → [View Request] [Share Link]
   ↓
6. Matching algorithm runs (backend):
   → Find eligible O+ donors within 5km
   → Rank by distance, response rate
   → Create invitation batch (10 donors)
   → Send notifications via SMS/WhatsApp/Push
   ↓
7. Ravi sees request dashboard:
   → Status: "Awaiting Donor Response"
   → "10 donors notified"
   → "3 viewed invitation"
   → "1 accepted!" → Contact info revealed
   ↓
8. Contact accepted donor:
   → Donor: Aarav Sharma
   → Phone: +977-9812345678 (visible now)
   → [Call] [WhatsApp]
   ↓
9. Coordinate donation:
   → External conversation (WhatsApp)
   → Donor confirms availability
   → Ravi provides hospital details
   ↓
10. Track progress:
    → Status updated: "In Progress"
    → Optional: Donor shares live location
    → Ravi sees donor traveling to hospital
    ↓
11. Donation complete:
    → Hospital staff confirms donation
    → Status: "Partially Fulfilled" (1/2 units)
    → Matching continues for remaining unit
    ↓
12. Second donor accepts:
    → Another notification wave
    → Second donor commits
    → Both donations confirmed
    → Status: "Fulfilled"
```

---

### B.3 Technical Requirements

**Frontend (Next.js):**
- `/[locale]/request/new` — Request creation form
- `/[locale]/request/[publicId]` — Request tracking page
- Components:
  - `RequestForm` (multi-step wizard)
  - `HospitalSelector` (searchable dropdown)
  - `LocationInput` (map + address)
  - `ConsentCheckbox`
  - `RequestStatusCard`
  - `DonorCommitmentsList`

**Backend (NestJS):**

```typescript
// apps/api/src/requests/requests.controller.ts
@Controller('requests')
export class RequestsController {
  @Post()
  @UseGuards(JwtAuthGuard)
  async createRequest(
    @CurrentUser() user: User,
    @Body() dto: CreateRequestDto
  ): Promise<RequestResponseDto> {
    // 1. Validate inputs
    // 2. Create request record
    // 3. Encrypt patient info
    // 4. Trigger matching algorithm (async job)
    // 5. Return request with publicId
  }
  
  @Get(':publicId')
  @Public() // Shareable link
  async getRequest(
    @Param('publicId') publicId: string
  ): Promise<RequestDetailDto> {
    // Public view: limited info
    // Owner view: full details + donor contacts
  }
  
  @Patch(':publicId/close')
  @UseGuards(JwtAuthGuard, OwnershipGuard)
  async closeRequest(
    @Param('publicId') publicId: string,
    @Body() dto: CloseRequestDto
  ): Promise<void> {
    // Mark as fulfilled or cancelled
    // Notify pending donors
  }
}

// apps/api/src/matching/matching.service.ts
@Injectable()
export class MatchingService {
  async runMatchingAlgorithm(requestId: string): Promise<void> {
    // 1. Fetch request details
    // 2. Find eligible donors (PostGIS query)
    // 3. Rank candidates
    // 4. Create invitation batch
    // 5. Queue notification jobs (BullMQ)
  }
}

// apps/api/src/notifications/queues/invitation.processor.ts
@Processor('invitations')
export class InvitationProcessor {
  @Process('send-batch')
  async sendInvitationBatch(job: Job<InvitationBatchJob>): Promise<void> {
    // For each donor in batch:
    // 1. Create invitation record
    // 2. Send via preferred channel (SMS/WhatsApp/Push)
    // 3. Update invitation status
    // 4. Handle failures (retry logic)
  }
}
```

**Database (Prisma):**

```prisma
model BloodRequest {
  id              String   @id @default(uuid())
  publicId        String   @unique // REQ-2025-001234
  requesterId     String
  
  bloodGroup      BloodGroup
  requiredUnits   Int
  urgency         Urgency
  requiredBy      DateTime
  
  hospitalId      String?
  districtId      String
  latitude        Float
  longitude       Float
  geographyPoint  Unsupported("geography(Point, 4326)")?
  
  // Patient info (encrypted)
  patientNameEnc  String?
  patientAge      Int?
  patientGender   Sex?
  diagnosisEnc    String?
  
  // Contact info
  contactName     String
  contactPhone    String
  contactRelation String?
  
  // Messages
  additionalNotes String?
  publicMessage   String?
  
  // Status
  status          RequestStatus @default(OPEN)
  committedUnits  Int @default(0)
  fulfilledUnits  Int @default(0)
  
  // Matching
  searchRadiusKm  Int @default(10)
  matchCount      Int @default(0)
  
  // Timestamps
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  fulfilledAt     DateTime?
  cancelledAt     DateTime?
  
  // Relations
  requester       User @relation(...)
  hospital        Facility? @relation(...)
  invitations     DonorInvitation[]
  statusHistory   RequestStatusHistory[]
}

model DonorInvitation {
  id              String   @id @default(uuid())
  requestId       String
  donorId         String
  
  matchScore      Float
  distanceKm      Float
  
  status          ResponseStatus @default(NOTIFIED)
  unitsCommitted  Int @default(0)
  
  notifiedAt      DateTime @default(now())
  viewedAt        DateTime?
  respondedAt     DateTime?
  expiresAt       DateTime
  
  // Response
  declineReason   String?
  donorNotes      String?
  
  // Relations
  request         BloodRequest @relation(...)
  donor           DonorProfile @relation(...)
  
  @@unique([requestId, donorId])
  @@index([status, expiresAt])
}

model RequestStatusHistory {
  id              String   @id @default(uuid())
  requestId       String
  
  oldStatus       RequestStatus?
  newStatus       RequestStatus
  reason          String?
  triggeredBy     String? // userId or "system"
  
  createdAt       DateTime @default(now())
  
  request         BloodRequest @relation(...)
}

enum Urgency {
  ROUTINE
  URGENT
  CRITICAL
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
}

enum ResponseStatus {
  NOTIFIED
  VIEWED
  INTERESTED
  DECLINED
  DONATED
  NO_SHOW
  WITHDRAWN
}
```

---

### B.4 Request State Machine

```typescript
// apps/api/src/requests/request-state.machine.ts
export class RequestStateMachine {
  private transitions: Map<RequestStatus, RequestStatus[]> = new Map([
    [RequestStatus.OPEN, [
      RequestStatus.MATCHING,
      RequestStatus.CANCELLED
    ]],
    [RequestStatus.MATCHING, [
      RequestStatus.AWAITING_DONOR_RESPONSE,
      RequestStatus.EXPIRED,
      RequestStatus.CANCELLED
    ]],
    [RequestStatus.AWAITING_DONOR_RESPONSE, [
      RequestStatus.PARTIALLY_COMMITTED,
      RequestStatus.FULLY_COMMITTED,
      RequestStatus.MATCHING, // All declined, restart
      RequestStatus.EXPIRED,
      RequestStatus.CANCELLED
    ]],
    [RequestStatus.PARTIALLY_COMMITTED, [
      RequestStatus.FULLY_COMMITTED,
      RequestStatus.IN_PROGRESS, // First donor en route
      RequestStatus.AWAITING_DONOR_RESPONSE, // Withdrawal
      RequestStatus.CANCELLED
    ]],
    [RequestStatus.FULLY_COMMITTED, [
      RequestStatus.IN_PROGRESS,
      RequestStatus.PARTIALLY_COMMITTED, // Withdrawal
      RequestStatus.CANCELLED
    ]],
    [RequestStatus.IN_PROGRESS, [
      RequestStatus.PARTIALLY_FULFILLED,
      RequestStatus.FULFILLED,
      RequestStatus.CANCELLED
    ]],
    [RequestStatus.PARTIALLY_FULFILLED, [
      RequestStatus.FULFILLED,
      RequestStatus.CANCELLED
    ]],
    // Terminal states
    [RequestStatus.FULFILLED, []],
    [RequestStatus.CANCELLED, []],
    [RequestStatus.EXPIRED, []]
  ]);
  
  canTransition(from: RequestStatus, to: RequestStatus): boolean {
    return this.transitions.get(from)?.includes(to) ?? false;
  }
  
  async transitionTo(
    requestId: string,
    newStatus: RequestStatus,
    reason?: string,
    triggeredBy?: string
  ): Promise<void> {
    const request = await this.prisma.bloodRequest.findUnique({
      where: { id: requestId }
    });
    
    if (!this.canTransition(request.status, newStatus)) {
      throw new InvalidStateTransitionException(
        `Cannot transition from ${request.status} to ${newStatus}`
      );
    }
    
    // Transaction: update request + log history
    await this.prisma.$transaction([
      this.prisma.bloodRequest.update({
        where: { id: requestId },
        data: { status: newStatus }
      }),
      this.prisma.requestStatusHistory.create({
        data: {
          requestId,
          oldStatus: request.status,
          newStatus,
          reason,
          triggeredBy
        }
      })
    ]);
    
    // Trigger side effects (notifications, matching)
    await this.handleStatusChange(requestId, request.status, newStatus);
  }
}
```

---

### B.5 Success Criteria

✅ **Journey Success:**
- Request created within 30 seconds
- At least one donor notified within 1 minute
- First acceptance within 15 minutes (critical requests)
- Requester can contact accepted donor
- Request fulfilled within required timeline

❌ **Journey Failure:**
- No donors available (edge case)
- All donors decline (escalate to coordinators)
- Donor withdraws last minute (restart matching)

---

### B.6 Test Scenarios

```typescript
describe('Journey B: Create Request', () => {
  let authToken: string;
  
  beforeAll(async () => {
    // Authenticate as requester
    const loginRes = await request(app.getHttpServer())
      .post('/auth/otp/verify')
      .send({ phone: '+9779876543210', code: '123456' });
    authToken = loginRes.body.token;
  });
  
  it('should create blood request and trigger matching', async () => {
    const result = await request(app.getHttpServer())
      .post('/requests')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        bloodGroup: 'O_POS',
        requiredUnits: 2,
        urgency: 'CRITICAL',
        requiredBy: '2025-01-30T10:00:00Z',
        hospitalId: 'hospital-uuid',
        latitude: 27.7172,
        longitude: 85.3240,
        contactName: 'Ravi Kumar',
        contactPhone: '+9779876543210'
      })
      .expect(201);
    
    expect(result.body.publicId).toMatch(/^REQ-/);
    expect(result.body.status).toBe('MATCHING');
  });
  
  it('should enforce required units between 1-10', async () => {
    await request(app.getHttpServer())
      .post('/requests')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ requiredUnits: 15, bloodGroup: 'O_POS' })
      .expect(400);
  });
  
  it('should encrypt patient name and diagnosis', async () => {
    const result = await request(app.getHttpServer())
      .post('/requests')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        bloodGroup: 'O_POS',
        requiredUnits: 1,
        patientName: 'Ram Bahadur',
        diagnosis: 'Heart surgery'
      })
      .expect(201);
    
    // Verify encryption by checking database directly
    const dbRecord = await prisma.bloodRequest.findUnique({
      where: { id: result.body.id }
    });
    
    expect(dbRecord.patientNameEnc).not.toBe('Ram Bahadur');
    expect(dbRecord.patientNameEnc).toMatch(/^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/);
  });
});
```

---

## Journey C: Donor Registration

### C.1 User Context

**Actor:** Aarav, 28, first-time blood donor  
**Context:** Saw Rakta-Daan ad, wants to help emergency cases  
**Device:** Mobile phone  
**Goal:** Register as O+ donor, set availability  

---

### C.2 Journey Flow

```
1. Open Rakta-Daan homepage
   ↓
2. Click "Become a Donor"
   ↓
3. Authentication (OTP):
   → Enter phone: +977-9812345678
   → Receive OTP: 654321
   → Verify OTP
   → Account created
   ↓
4. Donor registration form (progressive disclosure):
   
   Step 1: Basic Info
   → Full name: Aarav Sharma
   → Date of birth: 1996-05-15 (Age 28 ✓ Eligible)
   → Gender: Male
   → Blood group: O+
   → [Next]
   
   Step 2: Location
   → Province: Bagmati
   → District: Kathmandu
   → City: Thamel
   → Address (optional): Ward 26, Thamel Marg
   → [Allow GPS] → Coordinates captured
   → [Next]
   
   Step 3: Health Information (Display only, not verified)
   → Weight: 75 kg (Min 50kg ✓)
   → Last donation: Never
   → Next eligible: Now ✓
   → Health conditions: None
   → Medications: None
   → Allergies: None
   → [Next]
   
   Step 4: Availability
   → Current status: Available ☑
   → Willing to travel: Yes
   → Max distance: 15 km
   → Preferred times:
      - Weekdays: ☑ Morning ☑ Afternoon
      - Weekends: ☑ Morning ☑ Afternoon ☑ Evening
   → [Next]
   
   Step 5: Contact Preferences
   → SMS notifications: ☑
   → WhatsApp notifications: ☑
   → Email notifications: ☐ (no email provided)
   → Push notifications: ☑
   → [Next]
   
   Step 6: Privacy & Consent
   → Profile visibility: ○ Public ● Donors only ○ Private
   → ☑ I consent to receive blood request notifications
   → ☑ I consent to share my contact info with requesters upon acceptance
   → ☑ I confirm I meet eligibility criteria (18-60 years, 50kg+)
   → ☑ I agree to Terms of Service and Privacy Policy
   → [Complete Registration]
   ↓
5. Registration successful:
   → Welcome screen
   → "You're now a registered donor!"
   → Profile created with badge: "New Donor"
   → [Go to Dashboard]
   ↓
6. Donor dashboard:
   → Availability: Available ✓
   → Blood group: O+ badge
   → Total donations: 0
   → Lifetimes saved: 0
   → Invitations: None yet
   → [Edit Profile] [Update Availability]
```

---

### C.3 Technical Requirements

**Frontend (Next.js):**
- `/[locale]/donor/register` — Multi-step registration wizard
- `/[locale]/donor/dashboard` — Donor home
- Components:
  - `DonorRegistrationWizard` (6 steps)
  - `BloodGroupBadge`
  - `AvailabilityToggle`
  - `LocationPicker`
  - `PrivacyControls`
  - `ConsentCheckboxes`

**Backend (NestJS):**

```typescript
// apps/api/src/donors/donors.controller.ts
@Controller('donors')
export class DonorsController {
  @Post()
  @UseGuards(JwtAuthGuard)
  async registerDonor(
    @CurrentUser() user: User,
    @Body() dto: RegisterDonorDto
  ): Promise<DonorProfileDto> {
    // 1. Validate eligibility (age 18-60, weight >= 50kg)
    // 2. Check user doesn't already have donor profile
    // 3. Create donor profile
    // 4. Create geography point (PostGIS)
    // 5. Create consent records
    // 6. Return profile
  }
  
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyProfile(
    @CurrentUser() user: User
  ): Promise<DonorProfileDto> {
    // Return authenticated donor's profile
  }
  
  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @CurrentUser() user: User,
    @Body() dto: UpdateDonorDto
  ): Promise<DonorProfileDto> {
    // Update donor profile
    // Recalculate next eligible date if last donation updated
  }
}

// apps/api/src/availability/availability.controller.ts
@Controller('availability')
export class AvailabilityController {
  @Patch()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DONOR')
  async updateAvailability(
    @CurrentUser() user: User,
    @Body() dto: UpdateAvailabilityDto
  ): Promise<void> {
    // Update availability state
    // If setting to "not_available", cancel pending invitations
  }
}
```

**Database (Prisma):**

```prisma
model DonorProfile {
  id                String   @id @default(uuid())
  userId            String   @unique
  
  // Blood info
  bloodGroup        BloodGroup
  
  // Location
  districtId        String
  city              String?
  address           String?
  latitude          Float?
  longitude         Float?
  geographyPoint    Unsupported("geography(Point, 4326)")?
  
  // Availability
  availabilityState AvailabilityState @default(AVAILABLE)
  willingToTravel   Boolean @default(true)
  maxTravelDistanceKm Int @default(10)
  
  // Health (display only, not medical verification)
  weight            Float?
  lastDonationDate  Date?
  nextEligibleDate  Date?
  chronicConditions Json @default("[]")
  medications       Json @default("[]")
  allergies         Json @default("[]")
  
  // Preferences
  preferredTimes    Json @default("{}")
  
  // Engagement metrics
  totalDonations    Int @default(0)
  lifetimesSaved    Int @default(0) // totalDonations * 3
  responseRate      Float @default(0)
  averageResponseMinutes Int?
  
  // Privacy
  profileVisibility ProfileVisibility @default(DONORS_ONLY)
  
  // Timestamps
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  deactivatedAt     DateTime?
  
  // Relations
  user              User @relation(...)
  district          District @relation(...)
  invitations       DonorInvitation[]
  consents          Consent[]
  
  @@index([bloodGroup, availabilityState])
  @@index([geographyPoint], type: Gist)
}

model Consent {
  id              String   @id @default(uuid())
  userId          String
  donorId         String?
  
  consentKind     ConsentKind
  granted         Boolean
  grantedAt       DateTime?
  revokedAt       DateTime?
  
  // IP address for audit
  ipAddress       String?
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  user            User @relation(...)
  donor           DonorProfile? @relation(...)
}

enum ConsentKind {
  TERMS
  DONOR_ALERTS
  CHANNEL_SMS
  CHANNEL_WHATSAPP
  CONTACT_RELEASE_ON_RESPONSE
}

enum AvailabilityState {
  AVAILABLE
  UNAVAILABLE
  PAUSED
}

enum ProfileVisibility {
  PUBLIC        // Searchable by anyone
  DONORS_ONLY   // Searchable by authenticated donors
  PRIVATE       // Invitation-only
}
```

---

### C.4 Eligibility Validation

```typescript
// apps/api/src/donors/dto/register-donor.dto.ts
import { IsEnum, IsInt, Min, Max, IsDateString, IsBoolean, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterDonorDto {
  @IsEnum(BloodGroup)
  bloodGroup: BloodGroup;
  
  @IsDateString()
  @Transform(({ value }) => {
    const birthDate = new Date(value);
    const age = (new Date().getFullYear() - birthDate.getFullYear());
    if (age < 18 || age > 60) {
      throw new BadRequestException('Donor must be 18-60 years old');
    }
    return value;
  })
  dateOfBirth: string;
  
  @IsOptional()
  @Min(50, { message: 'Minimum weight for donation is 50kg' })
  @Max(200)
  weight?: number;
  
  @IsEnum(Sex)
  sex: Sex;
  
  @IsString()
  districtId: string;
  
  @IsOptional()
  @IsLatitude()
  latitude?: number;
  
  @IsOptional()
  @IsLongitude()
  longitude?: number;
  
  @IsBoolean()
  willingToTravel: boolean;
  
  @IsInt()
  @Min(1)
  @Max(50)
  maxTravelDistanceKm: number;
  
  // ... other fields
}
```

---

### C.5 Success Criteria

✅ **Journey Success:**
- Donor registered in < 2 minutes
- All required fields validated
- Eligibility checked (age, weight)
- PostGIS geography point created
- Consent records saved
- Donor immediately searchable by matching algorithm

❌ **Journey Failure:**
- Under 18 or over 60 years old
- Weight < 50kg
- Duplicate donor profile attempt
- Invalid blood group

---

### C.6 Test Scenarios

```typescript
describe('Journey C: Donor Registration', () => {
  let authToken: string;
  
  beforeAll(async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/auth/otp/verify')
      .send({ phone: '+9779812345678', code: '654321' });
    authToken = loginRes.body.token;
  });
  
  it('should register eligible donor', async () => {
    const result = await request(app.getHttpServer())
      .post('/donors')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        bloodGroup: 'O_POS',
        dateOfBirth: '1996-05-15', // Age 28
        sex: 'MALE',
        weight: 75,
        districtId: 'kathmandu-district-uuid',
        latitude: 27.7172,
        longitude: 85.3240,
        willingToTravel: true,
        maxTravelDistanceKm: 15
      })
      .expect(201);
    
    expect(result.body.bloodGroup).toBe('O_POS');
    expect(result.body.availabilityState).toBe('AVAILABLE');
    expect(result.body.totalDonations).toBe(0);
  });
  
  it('should reject donor under 18 years old', async () => {
    await request(app.getHttpServer())
      .post('/donors')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        bloodGroup: 'A_POS',
        dateOfBirth: '2010-01-01', // Age 15
        sex: 'FEMALE',
        districtId: 'kathmandu-district-uuid'
      })
      .expect(400);
  });
  
  it('should reject donor with weight < 50kg', async () => {
    await request(app.getHttpServer())
      .post('/donors')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        bloodGroup: 'B_POS',
        dateOfBirth: '1995-01-01',
        sex: 'FEMALE',
        weight: 45, // Below minimum
        districtId: 'kathmandu-district-uuid'
      })
      .expect(400);
  });
  
  it('should create PostGIS geography point', async () => {
    const result = await request(app.getHttpServer())
      .post('/donors')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        bloodGroup: 'AB_POS',
        dateOfBirth: '1990-01-01',
        sex: 'OTHER',
        latitude: 27.7172,
        longitude: 85.3240,
        districtId: 'kathmandu-district-uuid'
      })
      .expect(201);
    
    // Verify geography point created in database
    const donor = await prisma.donorProfile.findUnique({
      where: { id: result.body.id }
    });
    
    // PostGIS query to verify
    const geoCheck = await prisma.$queryRaw`
      SELECT ST_X(geography_point::geometry) as lon,
             ST_Y(geography_point::geometry) as lat
      FROM donor_profiles
      WHERE id = ${donor.id}::uuid
    `;
    
    expect(geoCheck[0].lat).toBeCloseTo(27.7172, 4);
    expect(geoCheck[0].lon).toBeCloseTo(85.3240, 4);
  });
});
```

---

## Journey D: Accept Invitation (Donor Response)

### D.1 User Context

**Actor:** Aarav Sharma (registered donor from Journey C)  
**Context:** Receives SMS notification about urgent blood request nearby  
**Device:** Mobile phone  
**Goal:** Review request, decide to accept/decline, coordinate with requester  

---

### D.2 Journey Flow

```
1. Receive notification:
   → SMS: "Urgent: O+ blood needed at Bir Hospital (2.5 km away). Tap to respond: https://raktadaan.org/i/ABC123"
   → Push notification (if app open)
   → WhatsApp message (if enabled)
   ↓
2. Tap notification link → Opens invitation page
   ↓
3. View invitation details:
   → Request ID: REQ-2025-001234
   → Blood group: O+ (matches ✓)
   → Required units: 2
   → Urgency: CRITICAL 🔴
   → Hospital: Bir Hospital
   → Distance: 2.5 km away
   → Required by: Tomorrow 10:00 AM (18 hours from now)
   → Public message: "Urgent: O+ blood needed at Bir Hospital"
   → Time remaining: 28 minutes (invitation expires in 30 min)
   ↓
4. Check availability:
   → Current status: Available ✓
   → Last donation: Never → Eligible ✓
   → Distance: 2.5 km → Within max range (15 km) ✓
   → [Accept] [Decline]
   ↓
5. Decision A: Accept
   → Tap [Accept]
   → Confirmation: "Confirm you can donate 1 unit of O+ blood at Bir Hospital?"
   → Units to commit: 1 (default) | 2 (if willing)
   → Optional notes: "I can come today evening after 6 PM"
   → [Confirm]
   ↓
6. Acceptance recorded:
   → Success message: "Thank you! Your commitment has been recorded."
   → Status updated: "Accepted"
   → Contact info revealed:
      - Requester: Ravi Kumar (Son)
      - Phone: +977-9876543210
      - [Call] [WhatsApp]
   → Hospital details:
      - Bir Hospital
      - Address: Mahabouddha, Kathmandu
      - Phone: +977-1-4321693
      - [Get Directions]
   ↓
7. Optional: Enable live location sharing
   → "Help the requester track your arrival"
   → [Share Live Location] [Not Now]
   → If enabled:
      - Location session starts
      - GPS updates every 30 seconds
      - Requester sees donor traveling
   ↓
8. Contact requester:
   → Tap [WhatsApp] → Opens WhatsApp
   → External conversation:
      - Confirm time and hospital ward
      - Share ETA
      - Coordinate meeting point
   ↓
9. Travel to hospital:
   → Use Google Maps for directions
   → Optional: Live location visible to requester
   → Update status: "Traveling" (manual or auto-detected)
   ↓
10. Arrive at hospital:
    → Update status: "Arrived"
    → Meet requester or hospital staff
    → Proceed to blood bank for screening
    ↓
11. Screening and donation:
    → Hospital staff screen eligibility
    → If eligible: Donate blood
    → If ineligible: Update status "Unable to Donate"
    ↓
12. Donation complete:
    → Hospital staff confirm donation in system
    → Status updated: "Donated"
    → Aarav's profile updated:
       - Total donations: 0 → 1
       - Lifetimes saved: 0 → 3
       - Last donation: 2025-01-29
       - Next eligible: 2025-04-29 (3 months)
       - Availability: Auto-set to "Recently Donated"
    → Thank you message
    → Optional: Download certificate

---

OR: Decision B: Decline

5b. Decision B: Decline
    → Tap [Decline]
    → Reason (optional dropdown):
       - Recently donated
       - Not available at this time
       - Too far away
       - Health reasons
       - Other (free text)
    → [Submit]
    ↓
6b. Decline recorded:
    → "Thank you for responding. Your feedback helps us improve."
    → Status: "Declined"
    → Matching algorithm continues (next donor invited)
    → No contact info disclosed
```

---

### D.3 Technical Requirements

**Frontend (Next.js):**
- `/i/[token]` — Invitation response page (token-based, no auth required)
- `/[locale]/donor/invitations` — Authenticated donor's invitation list
- Components:
  - `InvitationCard` (request details, urgency indicator)
  - `AcceptanceConfirmation` (units to commit, notes)
  - `DeclineReasonSelector`
  - `ContactPanel` (revealed after acceptance)
  - `LiveLocationToggle`

**Backend (NestJS):**

```typescript
// apps/api/src/invitations/invitations.controller.ts
@Controller('invitations')
export class InvitationsController {
  @Get('token/:token')
  @Public() // Token-based access
  async getInvitationByToken(
    @Param('token') token: string
  ): Promise<InvitationDetailDto> {
    // Validate token (JWT or signed token)
    // Return invitation details + request info
    // Do NOT expose requester contact (until acceptance)
  }
  
  @Post('token/:token/accept')
  @Public()
  async acceptInvitation(
    @Param('token') token: string,
    @Body() dto: AcceptInvitationDto
  ): Promise<AcceptanceResponseDto> {
    // 1. Validate token & check expiry
    // 2. Check invitation not already responded
    // 3. Check request still open
    // 4. Allocate units (transaction, prevent over-commitment)
    // 5. Update invitation status
    // 6. Update request committed units
    // 7. Notify requester
    // 8. Return requester contact info
  }
  
  @Post('token/:token/decline')
  @Public()
  async declineInvitation(
    @Param('token') token: string,
    @Body() dto: DeclineInvitationDto
  ): Promise<void> {
    // 1. Validate token
    // 2. Update invitation status
    // 3. Log decline reason (analytics)
    // 4. Trigger next matching wave if needed
  }
  
  @Post(':invitationId/withdraw')
  @UseGuards(JwtAuthGuard)
  async withdrawCommitment(
    @CurrentUser() user: User,
    @Param('invitationId') invitationId: string,
    @Body() dto: WithdrawDto
  ): Promise<void> {
    // 1. Verify user is the donor
    // 2. Check invitation is in INTERESTED status
    // 3. Release committed units (transaction)
    // 4. Update request status
    // 5. Restart matching if needed
    // 6. Notify requester
  }
}
```

**Token Generation:**

```typescript
// apps/api/src/invitations/invitations.service.ts
@Injectable()
export class InvitationsService {
  constructor(private jwtService: JwtService) {}
  
  generateInvitationToken(invitation: DonorInvitation): string {
    // Create JWT with invitation ID and expiry
    return this.jwtService.sign(
      {
        invitationId: invitation.id,
        donorId: invitation.donorId,
        requestId: invitation.requestId
      },
      {
        expiresIn: '30m' // Token expires with invitation
      }
    );
  }
  
  async createAndNotifyInvitations(
    requestId: string,
    donorIds: string[]
  ): Promise<void> {
    const invitations = await this.prisma.donorInvitation.createMany({
      data: donorIds.map(donorId => ({
        requestId,
        donorId,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
        status: 'NOTIFIED'
      }))
    });
    
    // Queue notification jobs
    for (const invitation of invitations) {
      const token = this.generateInvitationToken(invitation);
      const link = `https://raktadaan.org/i/${token}`;
      
      await this.notificationQueue.add('send-invitation', {
        invitationId: invitation.id,
        donorId: invitation.donorId,
        link
      });
    }
  }
}
```

**Unit Allocation (Concurrency Safe):**

```typescript
// apps/api/src/invitations/invitations.service.ts
async acceptInvitation(
  invitationId: string,
  unitsToCommit: number,
  donorNotes?: string
): Promise<AcceptanceResult> {
  return await this.prisma.$transaction(async (tx) => {
    // 1. Lock invitation row
    const invitation = await tx.donorInvitation.findUniqueOrThrow({
      where: { id: invitationId },
      include: { request: true }
    });
    
    // 2. Check invitation not expired
    if (invitation.expiresAt < new Date()) {
      throw new InvitationExpiredException();
    }
    
    // 3. Check already responded
    if (invitation.status !== 'NOTIFIED' && invitation.status !== 'VIEWED') {
      throw new AlreadyRespondedException();
    }
    
    // 4. Lock request row
    const request = await tx.bloodRequest.findUniqueOrThrow({
      where: { id: invitation.requestId }
    });
    
    // 5. Calculate remaining units needed
    const remainingUnits = request.requiredUnits - request.committedUnits;
    
    if (remainingUnits <= 0) {
      throw new RequestFullyCommittedException();
    }
    
    // 6. Allocate units (min of requested and available)
    const allocatedUnits = Math.min(unitsToCommit, remainingUnits);
    
    // 7. Update invitation
    await tx.donorInvitation.update({
      where: { id: invitationId },
      data: {
        status: 'INTERESTED',
        unitsCommitted: allocatedUnits,
        respondedAt: new Date(),
        donorNotes
      }
    });
    
    // 8. Update request committed units
    await tx.bloodRequest.update({
      where: { id: invitation.requestId },
      data: {
        committedUnits: { increment: allocatedUnits }
      }
    });
    
    // 9. Check if fully committed
    const updatedRequest = await tx.bloodRequest.findUnique({
      where: { id: invitation.requestId }
    });
    
    if (updatedRequest.committedUnits >= updatedRequest.requiredUnits) {
      // Transition to FULLY_COMMITTED
      await this.stateMachine.transitionTo(
        invitation.requestId,
        RequestStatus.FULLY_COMMITTED,
        'All units committed',
        'system'
      );
      
      // Cancel other pending invitations
      await tx.donorInvitation.updateMany({
        where: {
          requestId: invitation.requestId,
          status: { in: ['NOTIFIED', 'VIEWED'] }
        },
        data: { status: 'WITHDRAWN' }
      });
    } else {
      // Partially committed
      await this.stateMachine.transitionTo(
        invitation.requestId,
        RequestStatus.PARTIALLY_COMMITTED,
        `${allocatedUnits} unit(s) committed`,
        'system'
      );
    }
    
    return {
      allocatedUnits,
      requesterContact: {
        name: request.contactName,
        phone: request.contactPhone,
        relation: request.contactRelation
      },
      hospitalDetails: { /* ... */ }
    };
  });
}
```

---

### D.4 Success Criteria

✅ **Journey Success:**
- Donor receives notification within 1 minute of matching
- Invitation page loads within 2 seconds
- Acceptance recorded within 5 seconds
- Requester contact info revealed immediately
- Unit allocation is concurrency-safe (no over-commitment)
- Donor can contact requester via external channel

❌ **Journey Failure:**
- Invitation expired before donor responded
- Request already fulfilled by other donors
- Database transaction conflict (rare, handled by retry)

---

### D.5 Test Scenarios

```typescript
describe('Journey D: Accept Invitation', () => {
  let invitationToken: string;
  let requestId: string;
  
  beforeAll(async () => {
    // Create request and invitation
    const request = await createTestRequest({
      bloodGroup: 'O_POS',
      requiredUnits: 2
    });
    requestId = request.id;
    
    const invitation = await createTestInvitation({
      requestId,
      donorId: 'donor-uuid'
    });
    
    invitationToken = generateInvitationToken(invitation);
  });
  
  it('should accept invitation and allocate units', async () => {
    const result = await request(app.getHttpServer())
      .post(`/invitations/token/${invitationToken}/accept`)
      .send({ unitsToCommit: 1, donorNotes: 'Can come after 6 PM' })
      .expect(200);
    
    expect(result.body.allocatedUnits).toBe(1);
    expect(result.body.requesterContact.phone).toBeDefined();
    
    // Verify database state
    const invitation = await prisma.donorInvitation.findFirst({
      where: { requestId }
    });
    expect(invitation.status).toBe('INTERESTED');
    expect(invitation.unitsCommitted).toBe(1);
    
    const req = await prisma.bloodRequest.findUnique({
      where: { id: requestId }
    });
    expect(req.committedUnits).toBe(1);
    expect(req.status).toBe('PARTIALLY_COMMITTED');
  });
  
  it('should prevent over-commitment (concurrent acceptances)', async () => {
    // Create request requiring 2 units
    const request = await createTestRequest({
      bloodGroup: 'A_POS',
      requiredUnits: 2
    });
    
    // Create 3 invitations
    const [inv1, inv2, inv3] = await Promise.all([
      createTestInvitation({ requestId: request.id, donorId: 'donor-1' }),
      createTestInvitation({ requestId: request.id, donorId: 'donor-2' }),
      createTestInvitation({ requestId: request.id, donorId: 'donor-3' })
    ]);
    
    const tokens = [
      generateInvitationToken(inv1),
      generateInvitationToken(inv2),
      generateInvitationToken(inv3)
    ];
    
    // All 3 donors try to accept simultaneously
    const results = await Promise.allSettled(
      tokens.map(token =>
        request(app.getHttpServer())
          .post(`/invitations/token/${token}/accept`)
          .send({ unitsToCommit: 1 })
      )
    );
    
    // Verify only 2 succeeded (allocated 2 units total)
    const succeeded = results.filter(r => r.status === 'fulfilled');
    expect(succeeded.length).toBe(2);
    
    // Verify request is fully committed
    const finalRequest = await prisma.bloodRequest.findUnique({
      where: { id: request.id }
    });
    expect(finalRequest.committedUnits).toBe(2);
    expect(finalRequest.status).toBe('FULLY_COMMITTED');
    
    // Verify 3rd invitation was cancelled
    const invitations = await prisma.donorInvitation.findMany({
      where: { requestId: request.id }
    });
    const interested = invitations.filter(i => i.status === 'INTERESTED');
    const withdrawn = invitations.filter(i => i.status === 'WITHDRAWN');
    expect(interested.length).toBe(2);
    expect(withdrawn.length).toBe(1);
  });
  
  it('should reject expired invitation', async () => {
    const expiredInvitation = await createTestInvitation({
      requestId,
      donorId: 'donor-uuid-2',
      expiresAt: new Date(Date.now() - 1000) // 1 second ago
    });
    
    const token = generateInvitationToken(expiredInvitation);
    
    await request(app.getHttpServer())
      .post(`/invitations/token/${token}/accept`)
      .send({ unitsToCommit: 1 })
      .expect(410); // Gone
  });
  
  it('should record decline reason for analytics', async () => {
    const invitation = await createTestInvitation({
      requestId,
      donorId: 'donor-uuid-3'
    });
    
    const token = generateInvitationToken(invitation);
    
    await request(app.getHttpServer())
      .post(`/invitations/token/${token}/decline`)
      .send({ reason: 'Recently donated' })
      .expect(200);
    
    const declined = await prisma.donorInvitation.findUnique({
      where: { id: invitation.id }
    });
    expect(declined.status).toBe('DECLINED');
    expect(declined.declineReason).toBe('Recently donated');
  });
});
```

---

## Journey E: Track Request (Requester Dashboard)

### E.1 User Context

**Actor:** Ravi (requester from Journey B)  
**Context:** Created request 30 minutes ago, checking progress  
**Device:** Mobile phone  
**Goal:** Monitor donor responses, contact accepted donors, track donation progress  

---

### E.2 Journey Flow

```
1. Open Rakta-Daan app
   ↓
2. Navigate to "My Requests"
   ↓
3. View request list:
   → REQ-2025-001234
   → Status: PARTIALLY_COMMITTED (1/2 units)
   → Created: 30 minutes ago
   → Required by: Tomorrow 10:00 AM
   → [View Details]
   ↓
4. Open request details page:
   
   Header:
   → Request ID: REQ-2025-001234
   → Status: PARTIALLY_COMMITTED 🟡
   → Progress: 1/2 units committed
   → Blood group: O+
   → Urgency: CRITICAL
   → Required by: Tomorrow 10:00 AM (17.5 hours remaining)
   
   Matching Progress:
   → "10 donors notified"
   → "5 viewed invitation"
   → "1 accepted" ✓
   → "4 declined"
   
   Committed Donors:
   ┌──────────────────────────────┐
   │ Aarav Sharma                 │
   │ O+ · 1 unit committed        │
   │ Status: Accepted ✓           │
   │ Responded: 15 minutes ago    │
   │ Phone: +977-9812345678       │
   │ [Call] [WhatsApp]            │
   │                              │
   │ Live Location: Not shared    │
   │ [Request Location Share]     │
   └──────────────────────────────┘
   
   Pending Invitations:
   → Wave 1: Completed (10 donors, 1 accepted)
   → Wave 2: In progress (15 donors, notified 5 min ago)
   → Next wave: In 25 minutes (if no response)
   
   Status History:
   → PARTIALLY_COMMITTED · 15 min ago
      "Aarav Sharma accepted (1 unit)"
   → AWAITING_DONOR_RESPONSE · 20 min ago
      "10 donors notified"
   → MATCHING · 25 min ago
      "Finding eligible donors..."
   → OPEN · 30 min ago
      "Request created"
   
   Actions:
   → [Increase Units] (if need more)
   → [Mark as Fulfilled] (requires hospital confirmation)
   → [Cancel Request]
   → [Share Request Link]
   ↓
5. Contact accepted donor:
   → Tap [WhatsApp] for Aarav
   → Opens WhatsApp
   → Send message: "Hi Aarav, thank you for accepting. Can you come to Bir Hospital today evening?"
   → Aarav replies: "Yes, I'll be there by 7 PM"
   ↓
6. Optional: Request live location:
   → Tap [Request Location Share]
   → Send request to Aarav
   → Aarav enables live sharing
   → Map appears showing Aarav's location
   → Real-time updates every 30 seconds
   → Distance: 3.2 km
   → ETA: 15 minutes
   ↓
7. Second donor accepts:
   → Push notification: "Priya Thapa accepted your request!"
   → Refresh request page
   → Status updated: FULLY_COMMITTED (2/2 units) ✓
   → New donor card appears:
   
   ┌──────────────────────────────┐
   │ Priya Thapa                  │
   │ O+ · 1 unit committed        │
   │ Status: Accepted ✓           │
   │ Responded: Just now          │
   │ Phone: +977-9856789012       │
   │ [Call] [WhatsApp]            │
   └──────────────────────────────┘
   
   → Pending invitations: All cancelled (request fully committed)
   ↓
8. Coordinate with both donors:
   → Arrange staggered times (avoid hospital congestion)
   → Aarav: 7:00 PM
   → Priya: 7:30 PM
   ↓
9. Donation day:
   → Aarav arrives and donates
   → Hospital staff update status: "Donated" (1/2 fulfilled)
   → Ravi receives notification
   → Status: PARTIALLY_FULFILLED (1/2 units)
   ↓
10. Priya arrives and donates:
    → Hospital staff update status: "Donated" (2/2 fulfilled)
    → Status: FULFILLED ✓
    → Request closed automatically
    → Ravi receives: "Your blood request has been fulfilled!"
    → Thank you message shown
    → Optional: Leave feedback for donors
```

---

### E.3 Technical Requirements

**Frontend (Next.js):**
- `/[locale]/request/[publicId]` — Request details page (public + owner views)
- `/[locale]/requester/dashboard` — Requester dashboard (authenticated)
- Components:
  - `RequestStatusCard` (status badge, progress bar)
  - `CommittedDonorCard` (contact info, live location)
  - `InvitationProgressCard` (waves, responses)
  - `StatusTimeline` (chronological history)
  - `LiveLocationMap` (if donor sharing)
  - `RequestActions` (increase units, cancel, share)

**Backend (NestJS):**

```typescript
// apps/api/src/requests/requests.controller.ts
@Controller('requests')
export class RequestsController {
  @Get(':publicId')
  async getRequest(
    @Param('publicId') publicId: string,
    @CurrentUser() user?: User
  ): Promise<RequestDetailDto> {
    const request = await this.requestsService.findByPublicId(publicId);
    
    // Public view: limited info
    if (!user || user.id !== request.requesterId) {
      return this.sanitizeForPublic(request);
    }
    
    // Owner view: full details + donor contacts
    return this.includePrivateDetails(request);
  }
  
  @Get(':publicId/status-history')
  @UseGuards(JwtAuthGuard, OwnershipGuard)
  async getStatusHistory(
    @Param('publicId') publicId: string
  ): Promise<StatusHistoryDto[]> {
    return this.requestsService.getStatusHistory(publicId);
  }
  
  @Get(':publicId/invitations')
  @UseGuards(JwtAuthGuard, OwnershipGuard)
  async getInvitations(
    @Param('publicId') publicId: string
  ): Promise<InvitationSummaryDto> {
    return this.requestsService.getInvitationSummary(publicId);
  }
  
  @Post(':publicId/fulfill')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('FACILITY_STAFF', 'ADMIN')
  async markFulfilled(
    @Param('publicId') publicId: string,
    @CurrentUser() user: User,
    @Body() dto: FulfillRequestDto
  ): Promise<void> {
    // Only hospital staff or admin can mark fulfilled
    await this.requestsService.markFulfilled(publicId, user.id, dto);
  }
}
```

**Real-Time Updates (Socket.IO):**

```typescript
// apps/api/src/requests/requests.gateway.ts
@WebSocketGateway({ namespace: '/requests' })
export class RequestsGateway {
  @SubscribeMessage('subscribe-request')
  async handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { requestId: string }
  ): Promise<void> {
    // Authenticate socket connection
    const user = await this.authService.validateSocketToken(client.handshake.auth.token);
    
    // Verify user is request owner or involved donor
    const request = await this.requestsService.findById(data.requestId);
    const isOwner = request.requesterId === user.id;
    const isInvolvedDonor = await this.checkDonorInvolvement(user.id, data.requestId);
    
    if (!isOwner && !isInvolvedDonor) {
      throw new WsException('Unauthorized');
    }
    
    // Join room
    client.join(`request:${data.requestId}`);
  }
  
  async emitStatusChange(requestId: string, newStatus: RequestStatus): Promise<void> {
    this.server.to(`request:${requestId}`).emit('status-changed', {
      requestId,
      status: newStatus,
      timestamp: new Date()
    });
  }
  
  async emitNewAcceptance(requestId: string, donorId: string): Promise<void> {
    this.server.to(`request:${requestId}`).emit('donor-accepted', {
      requestId,
      donorId, // Owner gets contact info
      timestamp: new Date()
    });
  }
}
```

**Live Location Tracking:**

```typescript
// apps/api/src/location/location.gateway.ts
@WebSocketGateway({ namespace: '/location' })
export class LocationGateway {
  @SubscribeMessage('start-sharing')
  async handleStartSharing(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { invitationId: string }
  ): Promise<void> {
    const user = await this.validateUser(client);
    
    // Create location sharing session
    const session = await this.locationService.createSession({
      invitationId: data.invitationId,
      donorId: user.id
    });
    
    client.join(`location:${session.id}`);
    
    // Notify requester that donor started sharing
    const invitation = await this.prisma.donorInvitation.findUnique({
      where: { id: data.invitationId },
      include: { request: true }
    });
    
    this.server.to(`request:${invitation.requestId}`).emit('location-sharing-started', {
      donorId: user.id,
      sessionId: session.id
    });
  }
  
  @SubscribeMessage('update-location')
  async handleLocationUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      sessionId: string;
      latitude: number;
      longitude: number;
      accuracy: number;
    }
  ): Promise<void> {
    // Validate session
    const session = await this.locationService.getSession(data.sessionId);
    
    if (session.status !== 'active') {
      throw new WsException('Session not active');
    }
    
    // Save location update
    await this.locationService.saveUpdate({
      sessionId: data.sessionId,
      latitude: data.latitude,
      longitude: data.longitude,
      accuracy: data.accuracy,
      recordedAt: new Date()
    });
    
    // Broadcast to requester
    const invitation = await this.prisma.donorInvitation.findUnique({
      where: { id: session.invitationId },
      include: { request: true }
    });
    
    this.server.to(`request:${invitation.requestId}`).emit('location-updated', {
      sessionId: data.sessionId,
      latitude: data.latitude,
      longitude: data.longitude,
      timestamp: new Date()
    });
  }
  
  @SubscribeMessage('stop-sharing')
  async handleStopSharing(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string }
  ): Promise<void> {
    await this.locationService.stopSession(data.sessionId);
    
    client.leave(`location:${data.sessionId}`);
    
    // Notify requester
    const session = await this.locationService.getSession(data.sessionId);
    const invitation = await this.prisma.donorInvitation.findUnique({
      where: { id: session.invitationId },
      include: { request: true }
    });
    
    this.server.to(`request:${invitation.requestId}`).emit('location-sharing-stopped', {
      sessionId: data.sessionId
    });
  }
}
```

**Database Schema (Location):**

```prisma
model LocationSharingSession {
  id              String   @id @default(uuid())
  invitationId    String   @unique
  donorId         String
  
  status          SessionStatus @default(ACTIVE)
  startedAt       DateTime @default(now())
  stoppedAt       DateTime?
  
  // Privacy: who can view
  visibleTo       Json // { requesterId: true, coordinatorIds: [] }
  
  invitation      DonorInvitation @relation(...)
  updates         LocationUpdate[]
}

model LocationUpdate {
  id              String   @id @default(uuid())
  sessionId       String
  
  latitude        Float
  longitude       Float
  accuracy        Float? // meters
  altitude        Float? // meters
  speed           Float? // m/s
  heading         Float? // degrees
  
  geographyPoint  Unsupported("geography(Point, 4326)")?
  
  recordedAt      DateTime // GPS timestamp
  createdAt       DateTime @default(now())
  
  session         LocationSharingSession @relation(...)
  
  @@index([sessionId, recordedAt])
  @@index([geographyPoint], type: Gist)
}

enum SessionStatus {
  ACTIVE
  PAUSED
  STOPPED
  EXPIRED
}
```

---

### E.4 Success Criteria

✅ **Journey Success:**
- Requester sees real-time status updates
- Donor contacts revealed after acceptance
- Live location map updates smoothly
- Status history is accurate and complete
- Request fulfillment recorded correctly

---

### E.5 Test Scenarios

```typescript
describe('Journey E: Track Request', () => {
  let authToken: string;
  let requestId: string;
  
  beforeAll(async () => {
    // Create requester account and request
    authToken = await getAuthToken('+9779876543210');
    const request = await createTestRequest({
      bloodGroup: 'O_POS',
      requiredUnits: 2,
      requesterId: 'requester-uuid'
    });
    requestId = request.id;
  });
  
  it('should show public view without authentication', async () => {
    const result = await request(app.getHttpServer())
      .get(`/requests/${requestId}`)
      .expect(200);
    
    // Public view
    expect(result.body.bloodGroup).toBe('O_POS');
    expect(result.body.urgency).toBeDefined();
    expect(result.body.hospitalName).toBeDefined();
    
    // Sensitive info hidden
    expect(result.body.contactPhone).toBeUndefined();
    expect(result.body.patientName).toBeUndefined();
    expect(result.body.committedDonors).toBeUndefined();
  });
  
  it('should show full details to request owner', async () => {
    const result = await request(app.getHttpServer())
      .get(`/requests/${requestId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    
    // Owner view
    expect(result.body.contactPhone).toBeDefined();
    expect(result.body.committedDonors).toBeDefined();
    expect(result.body.invitationSummary).toBeDefined();
  });
  
  it('should emit real-time status updates via WebSocket', (done) => {
    const client = io('http://localhost:4000/requests', {
      auth: { token: authToken }
    });
    
    client.emit('subscribe-request', { requestId });
    
    client.on('status-changed', (data) => {
      expect(data.requestId).toBe(requestId);
      expect(data.status).toBeDefined();
      client.disconnect();
      done();
    });
    
    // Trigger status change
    setTimeout(() => {
      updateRequestStatus(requestId, RequestStatus.PARTIALLY_COMMITTED);
    }, 100);
  });
});
```

---

## Journey F: Update Inventory (Facility Staff)

### F.1 User Context

**Actor:** Dr. Sunita, blood bank manager at Bir Hospital  
**Context:** Morning inventory check, needs to update stock levels  
**Device:** Desktop computer  
**Goal:** Update blood inventory to reflect current stock  

---

### F.2 Journey Flow

```
1. Login to Rakta-Daan (hospital staff account)
   ↓
2. Navigate to "Inventory Management"
   ↓
3. View current inventory:
   
   Bir Hospital Blood Bank
   Last updated: 3 hours ago
   
   ┌───────────┬───────────┬──────────┬─────────────┐
   │ Blood Type│ Component │ Available│ Reserved    │
   ├───────────┼───────────┼──────────┼─────────────┤
   │ O+        │ Whole     │ 8 units  │ 2 units     │
   │ O-        │ Whole     │ 2 units  │ 0 units     │
   │ A+        │ Whole     │ 12 units │ 1 unit      │
   │ A-        │ Whole     │ 3 units  │ 0 units     │
   │ B+        │ Whole     │ 6 units  │ 0 units     │
   │ B-        │ Whole     │ 1 unit   │ 0 units     │
   │ AB+       │ Whole     │ 5 units  │ 1 unit      │
   │ AB-       │ Whole     │ 0 units  │ 0 units ⚠️  │
   ├───────────┼───────────┼──────────┼─────────────┤
   │ O+        │ PRBC      │ 15 units │ 3 units     │
   │ ...       │           │          │             │
   └───────────┴───────────┴──────────┴─────────────┘
   
   [Update Inventory]
   ↓
4. Click [Update Inventory] → Bulk edit form:
   
   Enter new stock levels:
   → O+ Whole Blood: 8 → 10 units (+2 from new donations)
   → O- Whole Blood: 2 → 1 unit (-1 used for surgery)
   → AB- Whole Blood: 0 → 2 units (+2 from donation camp)
   → A+ PRBC: 12 → 10 units (-2 expired, removed)
   
   [Save Changes]
   ↓
5. Confirm changes:
   → Review updated quantities
   → [Confirm]
   ↓
6. Inventory updated:
   → Success message
   → Last updated: Just now
   → Changes logged in audit trail
   → Platform users see updated stock
```

---

### F.3 Technical Requirements

**Backend (NestJS):**

```typescript
// apps/api/src/inventory/inventory.controller.ts
@Controller('inventory')
export class InventoryController {
  @Get('facility/:facilityId')
  @Public() // Public view
  async getFacilityInventory(
    @Param('facilityId') facilityId: string
  ): Promise<InventoryDto[]> {
    return this.inventoryService.getInventory(facilityId);
  }
  
  @Patch('facility/:facilityId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('FACILITY_STAFF', 'ADMIN')
  async updateInventory(
    @Param('facilityId') facilityId: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateInventoryDto
  ): Promise<void> {
    // Verify user has permission for this facility
    await this.facilityService.verifyStaffAccess(user.id, facilityId);
    
    // Update inventory
    await this.inventoryService.bulkUpdate(facilityId, dto.items, user.id);
    
    // Trigger low-stock alerts if needed
    await this.alertService.checkLowStockAlerts(facilityId);
  }
}
```

**Database:**

```prisma
model BloodInventory {
  id              String   @id @default(uuid())
  facilityId      String
  
  bloodGroup      BloodGroup
  component       BloodComponent
  
  unitsAvailable  Int @default(0)
  unitsReserved   Int @default(0)
  unitsExpiring   Int @default(0) // Within 7 days
  
  lastUpdated     DateTime @default(now())
  updatedBy       String?
  
  // Thresholds
  minimumStock    Int @default(5)
  criticalLevel   Int @default(2)
  
  facility        Facility @relation(...)
  
  @@unique([facilityId, bloodGroup, component])
}

model InventoryUpdateLog {
  id              String   @id @default(uuid())
  inventoryId     String
  
  oldValue        Int
  newValue        Int
  changeReason    String?
  
  updatedBy       String
  updatedAt       DateTime @default(now())
  
  inventory       BloodInventory @relation(...)
}
```

---

## Summary: Journey-Endpoint Mapping

| Journey | Key Endpoints | NestJS Modules | Prisma Models |
|---------|---------------|----------------|---------------|
| **A: Find Blood** | GET /donors/search<br>GET /facilities/search | DonorsModule<br>FacilitiesModule | DonorProfile<br>Facility<br>BloodInventory |
| **B: Create Request** | POST /requests<br>POST /matching/run | RequestsModule<br>MatchingModule<br>NotificationsModule | BloodRequest<br>DonorInvitation<br>RequestStatusHistory |
| **C: Donor Registration** | POST /donors<br>GET /donors/me<br>PATCH /donors/me | DonorsModule<br>AuthModule | DonorProfile<br>Consent<br>User |
| **D: Accept Invitation** | GET /invitations/token/:token<br>POST /invitations/token/:token/accept<br>POST /invitations/token/:token/decline | InvitationsModule | DonorInvitation<br>BloodRequest |
| **E: Track Request** | GET /requests/:publicId<br>GET /requests/:publicId/status-history<br>WS /requests (Socket.IO) | RequestsModule<br>LocationModule (WebSocket) | BloodRequest<br>LocationSharingSession<br>LocationUpdate |
| **F: Update Inventory** | GET /inventory/facility/:id<br>PATCH /inventory/facility/:id | InventoryModule<br>FacilitiesModule | BloodInventory<br>InventoryUpdateLog |

---

## Test Coverage Requirements

Each journey must have:
1. **Happy path test** — Complete journey succeeds
2. **Authentication test** — Proper auth/authz enforced
3. **Validation test** — Invalid inputs rejected
4. **Concurrency test** — Race conditions handled (especially Journey D)
5. **Error recovery test** — Graceful degradation
6. **Performance test** — Acceptable latency

**Playwright E2E tests** must cover all 6 journeys end-to-end.

---

**Document Status:** ✅ Complete  
**Next Steps:** Create SYSTEM_ARCHITECTURE.md with NestJS module diagrams

---

*This document maps complete user journeys per Master Prompt Section 32 requirements.*
