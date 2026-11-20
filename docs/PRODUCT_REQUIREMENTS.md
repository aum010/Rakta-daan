# Product Requirements Document

**Document Version:** 1.0  
**Last Updated:** January 29, 2025  
**Status:** Phase 0 — Requirements Definition  
**Target Architecture:** NestJS + Prisma + Next.js

---

## Executive Summary

Rakta-Daan is a **Nepal-focused, browser-based blood discovery, donor coordination, and blood-facility information platform** that helps people who need blood discover relevant nearby donors and facilities, create blood requests, coordinate donor participation, and monitor request progress.

**Core Value Proposition:**
- Find blood fast
- Connect responsibly
- Save time
- Mobile-first, no app installation required

---

## 1. Product Objective

Build a simple, reliable platform that helps users:

1. **Find relevant blood donors** — Geographic + blood type search
2. **Discover nearby blood banks and hospitals** — Facility directory with stock
3. **Create blood requests** — Emergency and scheduled needs
4. **Match requests with suitable donor candidates** — Intelligent matching algorithm
5. **Coordinate multiple donor commitments** — Handle multi-unit requirements
6. **Track request progress** — Real-time status updates
7. **Contact consenting donors** — External communication channels
8. **Confirm donation and fulfillment** — Authorized verification

---

## 2. Non-Negotiable Principles

### 2.1 Data Integrity

❌ **Never:**
- Invent real donors, stock, facilities, or statistics
- Display simulated information as real
- Show mock notifications as delivered
- Claim blood will be found

✅ **Always:**
- Label demo surfaces clearly
- Show inventory freshness or "unknown"
- State limitations honestly
- Require authorized confirmation for fulfillment

---

### 2.2 Privacy & Security

❌ **Never:**
- Expose private donor contact information publicly
- Expose precise donor coordinates publicly
- Make location sharing compulsory
- Create internal messaging/chat

✅ **Always:**
- Require consent for contact disclosure
- Use external communication channels only
- Encrypt PII at rest
- Implement granular privacy controls

---

### 2.3 Medical Safety

❌ **Never:**
- Make medical eligibility decisions
- Treat donor acceptance as proof of donation
- Mark request fulfilled without authorized confirmation
- Override medical protocols

✅ **Always:**
- Show eligibility as display status only
- Require facility confirmation for fulfillment
- Defer medical decisions to healthcare professionals
- Include safety disclaimers

---

## 3. User Roles & Permissions

### 3.1 Public Visitor

**Can:**
- View public information
- Search blood banks and facilities
- Learn how the platform works
- View safety and privacy information

**Cannot:**
- Access private donor records
- Create requests without registration
- Contact donors

---

### 3.2 Donor

**Can:**
- Register and manage profile
- Set availability status
- Choose contact preferences
- Control discoverability
- Receive invitations
- Accept or decline invitations
- Withdraw commitments
- Update participation status
- View donation history
- Control optional location sharing

**Cannot:**
- Access other donors' private information
- See unmatched requests without invitation
- Contact recipients without acceptance

---

### 3.3 Requester

**Can:**
- Create blood requests
- Search relevant donors and facilities
- View their own request status
- See authorized donor commitment information
- Use approved external contact options
- Cancel or close their requests
- Report inaccurate information

**Cannot:**
- Access donor contact info before acceptance
- Spam multiple donors
- Create fake requests

---

### 3.4 Hospital / Blood Bank

**Can (after verification):**
- Manage facility profile
- Manage authorized staff
- Update facility services
- Update blood-stock records
- View relevant requests
- Respond to authorized enquiries
- Confirm donation or fulfillment events

**Cannot:**
- Access donor private information without authorization
- Modify other facilities' data

---

### 3.5 Organization Manager

**Can:**
- Manage organization members
- Manage organization facilities
- View organization-level analytics
- Coordinate organizational workflows

**Cannot:**
- Access cross-organization data
- Override facility staff permissions

---

### 3.6 Coordinator

**Can:**
- Assist with request coordination
- Review assigned cases
- Help resolve incomplete requests
- Verify appropriate operational information
- Escalate issues

**Cannot:**
- Access sensitive donor information
- Make final fulfillment decisions

---

### 3.7 Administrator

**Can:**
- Manage roles and permissions
- Review organizations and facilities
- Review verification submissions
- Manage abuse reports
- Monitor system health
- Review audit logs
- Manage system settings

**Cannot:**
- Access encrypted donor contact info without justification
- Bypass audit logging
- Modify immutable records

---

## 4. Core Features (Priority Levels)

### P0 — Essential First Release (Must-Have)

**Frontend:**
- ✅ Landing page (informational)
- ✅ Blood search page (public)
- ✅ Blood bank directory
- ✅ Donation camps listing
- ✅ Donor registration
- ✅ Donor profile management
- ✅ Blood request creation
- ✅ Request status tracking
- ✅ Manual location selection
- ✅ GPS permission flow (optional)
- ✅ Bilingual support (English/Nepali)
- ✅ Mobile-first responsive design
- ✅ Accessibility (WCAG 2.1 AA)

**Backend (NestJS):**
- 🔴 Authentication (OTP-based)
- 🔴 Authorization (RBAC + permissions)
- 🔴 User management
- 🔴 Donor CRUD operations
- 🔴 Blood request CRUD operations
- 🔴 Matching engine (intelligent algorithm)
- 🔴 Invitation workflow
- 🔴 Donor response handling
- 🔴 Multiple donor commitments
- 🔴 Request status state machine
- 🔴 Facility directory
- 🔴 Admin functions
- 🔴 Audit logging
- 🔴 External contact handoff

**Database (Prisma + PostGIS):**
- 🔴 User and authentication tables
- 🔴 Donor profiles
- 🔴 Blood requests
- 🔴 Matches and invitations
- 🔴 Facilities and organizations
- 🔴 Blood inventory
- 🔴 Geography (provinces, districts)
- 🔴 Consent records
- 🔴 Audit logs
- 🔴 PostGIS spatial columns
- 🔴 PostGIS spatial indexes

**Integration:**
- 🔴 OpenAPI/Swagger documentation
- 🔴 Frontend ↔ Backend API integration
- 🔴 Session management

---

### P1 — Operational Enhancements (Should-Have)

**Backend:**
- 🔴 Redis + BullMQ (background jobs)
- 🔴 Notification queues
- 🔴 SMS provider integration (Sparrow SMS)
- 🔴 WhatsApp Business API integration
- 🔴 Email provider (Resend)
- 🔴 Real notification delivery tracking
- 🔴 Webhook receivers (SMS, WhatsApp)
- 🔴 Live location tracking backend
- 🔴 Location sharing sessions
- 🔴 GPS coordinate updates
- 🔴 Facility verification workflow
- 🔴 Blood stock updates
- 🔴 Donation history tracking
- 🔴 Donor availability scheduling
- 🔴 Coordinator dashboard
- 🔴 Donation camps management
- 🔴 Advanced search filters
- 🔴 Reporting and analytics
- 🔴 Pino structured logging
- 🔴 Sentry error tracking

**Frontend:**
- 🔴 Real-time request updates (Socket.IO)
- 🔴 Live location map
- 🔴 Push notifications
- 🔴 Advanced filters
- 🔴 Analytics dashboards

---

### P2 — Future Enhancements (Nice-to-Have)

- Demand forecasting
- Geographic demand heatmaps
- Organization-level analytics
- Predictive donor availability
- Donation reminders
- Gamification (badges, leaderboards)
- Certificate generation
- Mobile apps (iOS/Android)
- Integration with hospital EMR systems

---

## 5. Functional Requirements

### 5.1 User Registration & Authentication

**FR-AUTH-001:** Users shall register using phone number or email  
**FR-AUTH-002:** System shall send OTP for verification  
**FR-AUTH-003:** OTP shall expire after 5 minutes  
**FR-AUTH-004:** System shall rate-limit OTP requests (3 per 10 minutes)  
**FR-AUTH-005:** System shall issue JWT tokens upon successful verification  
**FR-AUTH-006:** Tokens shall be stored in HttpOnly cookies  
**FR-AUTH-007:** Sessions shall expire after 7 days of inactivity  
**FR-AUTH-008:** System shall support logout and session revocation  

---

### 5.2 Donor Management

**FR-DONOR-001:** Donors shall register with required information:
- Name
- Blood group (A+, A-, B+, B-, AB+, AB-, O+, O-)
- Date of birth (18-60 years)
- Gender
- Location (district, city, coordinates)
- Contact information (phone/email)

**FR-DONOR-002:** Donors shall set availability status:
- Available
- Not available
- Recently donated (auto-set after donation)
- Temporarily unavailable

**FR-DONOR-003:** System shall calculate next eligible donation date (3 months after last donation)  
**FR-DONOR-004:** Donors shall control profile visibility:
- Public (searchable by anyone)
- Donors only (searchable by authenticated donors)
- Private (invitation-only)

**FR-DONOR-005:** Donors shall set contact preferences:
- SMS notifications (on/off)
- WhatsApp notifications (on/off)
- Email notifications (on/off)
- In-app notifications (on/off)

**FR-DONOR-006:** Donors shall view donation history with:
- Date and time
- Facility name
- Verification status
- Certificates (if issued)

---

### 5.3 Blood Request Creation

**FR-REQUEST-001:** Users shall create blood requests with:
- Blood group (required)
- Required units (1-10)
- Urgency (routine, urgent, critical)
- Required by date/time
- Hospital/facility (optional)
- Location (district, city, address, coordinates)
- Patient information (optional, encrypted):
  - Name
  - Age
  - Gender
  - Diagnosis
- Contact information (required):
  - Contact name
  - Contact phone
  - Contact relation
- Additional notes (optional)
- Public message (optional)

**FR-REQUEST-002:** System shall validate:
- Blood group is valid enum
- Required units is 1-10
- Required by date is in future
- Contact phone is valid E.164 format

**FR-REQUEST-003:** System shall generate unique public ID (e.g., REQ-2025-001234)  
**FR-REQUEST-004:** System shall encrypt patient name and diagnosis at rest  
**FR-REQUEST-005:** System shall assign initial status: OPEN  
**FR-REQUEST-006:** System shall trigger matching algorithm upon creation  

---

### 5.4 Donor Matching Engine

**FR-MATCH-001:** System shall filter eligible donor candidates:
- Blood group matches request
- Availability status is "available"
- Donor is within search radius
- Donor has no recent invitation to same request
- Donor is eligible to donate (next eligible date passed)

**FR-MATCH-002:** System shall rank eligible candidates by:
- Distance (nearest first)
- Response rate (higher first)
- Last donation date (longer gap first)
- Availability freshness (recent updates first)

**FR-MATCH-003:** System shall use staged geographic expansion:
- Wave 1: 5km radius, top 10 candidates
- Wave 2: 10km radius, top 15 candidates (if Wave 1 fails)
- Wave 3: 20km radius, top 20 candidates (if Wave 2 fails)
- Wave 4: 50km radius, escalate to coordinators

**FR-MATCH-004:** System shall create invitation records for matched donors  
**FR-MATCH-005:** System shall send notifications via preferred channels  
**FR-MATCH-006:** Invitations shall expire after 30 minutes (configurable)  
**FR-MATCH-007:** System shall automatically trigger next wave if:
- Insufficient acceptances after wave timeout
- Donor withdrawals leave request under-committed

---

### 5.5 Donor Invitation & Response

**FR-INVITE-001:** Donors shall receive invitations with:
- Request public ID
- Blood group needed
- Required units
- Urgency level
- Hospital/facility
- Distance from donor
- Required by date/time
- Public message

**FR-INVITE-002:** Donors shall respond with one of:
- Accept (commit to donate)
- Decline (with optional reason)
- No response (invitation expires)

**FR-INVITE-003:** System shall prevent duplicate acceptances for same request  
**FR-INVITE-004:** System shall allocate committed units using database transactions  
**FR-INVITE-005:** System shall support partial fulfillment (multiple donors for multi-unit requests)  
**FR-INVITE-006:** System shall stop matching when committed units ≥ required units  
**FR-INVITE-007:** Donors shall be able to withdraw commitments before donation  
**FR-INVITE-008:** System shall recalculate remaining units upon withdrawal  
**FR-INVITE-009:** System shall restart matching if remaining units > 0  

---

### 5.6 Request Status Workflow

**FR-STATUS-001:** Requests shall follow state machine:

```
OPEN
  ↓
MATCHING (matching algorithm running)
  ↓
AWAITING_DONOR_RESPONSE (invitations sent, waiting for acceptance)
  ↓
PARTIALLY_COMMITTED (some units committed, more needed)
  ↓
FULLY_COMMITTED (all units committed, awaiting donation)
  ↓
IN_PROGRESS (donor(s) traveling or at facility)
  ↓
PARTIALLY_FULFILLED (some donations completed)
  ↓
FULFILLED (all donations confirmed by facility)

Alternative paths:
OPEN → CANCELLED (requester cancels)
MATCHING → EXPIRED (no matches found, deadline passed)
AWAITING_DONOR_RESPONSE → OPEN (all declined, restart matching)
FULLY_COMMITTED → PARTIALLY_COMMITTED (withdrawal)
```

**FR-STATUS-002:** System shall log every status change with:
- Timestamp
- Old status
- New status
- Reason (if applicable)
- Triggered by (user ID or "system")

**FR-STATUS-003:** System shall notify requester of status changes  
**FR-STATUS-004:** Only authorized users shall mark request as FULFILLED  

---

### 5.7 External Communication

**FR-COMM-001:** System shall NOT implement internal chat or messaging  
**FR-COMM-002:** System shall provide external communication options:
- Phone call (tel: link)
- WhatsApp (whatsapp:// link or Business API)
- Viber (viber:// link)
- SMS (via provider API)

**FR-COMM-003:** System shall disclose donor contact info only after:
- Donor accepts invitation
- Donor consents to contact release

**FR-COMM-004:** System shall log contact handoffs (audit trail)  
**FR-COMM-005:** System shall clearly indicate when user is leaving platform  
**FR-COMM-006:** System shall NOT claim message delivery unless confirmed by provider webhook  

---

### 5.8 Live Location Sharing (Optional)

**FR-LOCATION-001:** Location sharing shall be:
- Optional (never mandatory)
- Consent-based (explicit opt-in)
- Time-limited (session-based)
- Relationship-based (only for active matches)
- Reversible (can stop anytime)

**FR-LOCATION-002:** System shall support location purposes:
- Discovery (donor is searchable by location)
- Matching (donor location used in algorithm)
- Live tracking (real-time updates during donation trip)

**FR-LOCATION-003:** System shall create location sharing sessions with:
- Match ID
- Donor ID
- Request ID
- Start time
- Status (active, paused, stopped)
- Viewers (requester ID, coordinator ID)

**FR-LOCATION-004:** System shall accept GPS coordinate updates with:
- Latitude, longitude
- Accuracy (meters)
- Timestamp
- Optional: altitude, speed, heading

**FR-LOCATION-005:** System shall transmit location updates via:
- HTTP POST (periodic updates, e.g., every 30 seconds)
- WebSocket (real-time stream, if enabled)

**FR-LOCATION-006:** System shall display on requester's map:
- Donor's last known location
- Last update timestamp
- "Sharing active" or "Sharing stopped"
- Distance and ETA (approximate)

**FR-LOCATION-007:** System shall auto-stop sharing:
- After 4 hours (max session duration)
- When donor marks donation complete
- When request is fulfilled/cancelled

**FR-LOCATION-008:** System shall purge location coordinates after 7 days (privacy)  

---

### 5.9 Facility & Blood Inventory

**FR-FACILITY-001:** Facilities shall register with:
- Name (English and Nepali)
- Type (hospital, blood_bank, red_cross, ngo)
- Location (district, city, address, coordinates)
- Contact information (phone, email, website)
- Operating hours
- Blood bank capacity (if applicable)
- Services offered

**FR-FACILITY-002:** System shall require verification for facilities  
**FR-FACILITY-003:** Facilities shall update blood inventory with:
- Blood group
- Component (whole_blood, prbc, platelets, plasma)
- Units available
- Units reserved
- Last updated timestamp

**FR-FACILITY-004:** System shall display inventory freshness:
- "Updated 5 minutes ago"
- "Updated 2 hours ago"
- "Last updated yesterday"
- "Unknown" (if > 24 hours old)

**FR-FACILITY-005:** System shall alert facilities when stock is low:
- Below minimum threshold
- Critical level reached

---

### 5.10 Administration & Moderation

**FR-ADMIN-001:** Admins shall review verification requests:
- Organization verification (submit documents)
- Facility verification (license, contact confirmation)
- Donor identity verification (optional, for high-trust badge)

**FR-ADMIN-002:** Admins shall manage abuse reports:
- Spam reports
- Fake request reports
- Inappropriate behavior reports

**FR-ADMIN-003:** Admins shall take actions:
- Approve verification
- Reject verification (with reason)
- Suspend user account
- Delete inappropriate content
- Dismiss false reports

**FR-ADMIN-004:** System shall log all admin actions in audit log  
**FR-ADMIN-005:** Admins shall access analytics dashboard:
- Total donors registered
- Total requests created
- Match success rate
- Average response time
- Geographic distribution

---

## 6. Non-Functional Requirements

### 6.1 Performance

**NFR-PERF-001:** API response time shall be < 500ms (p95) for read operations  
**NFR-PERF-002:** API response time shall be < 1000ms (p95) for write operations  
**NFR-PERF-003:** Matching algorithm shall complete within 10 seconds for 10,000 donors  
**NFR-PERF-004:** PostGIS spatial queries shall use GIST indexes  
**NFR-PERF-005:** Database query count per request shall be minimized (N+1 prevention)  
**NFR-PERF-006:** Frontend initial page load shall be < 3 seconds (3G connection)  
**NFR-PERF-007:** Frontend LCP shall be < 2.5 seconds  

---

### 6.2 Scalability

**NFR-SCALE-001:** System shall support 100,000 registered donors  
**NFR-SCALE-002:** System shall support 1,000 concurrent requests  
**NFR-SCALE-003:** System shall support 10,000 concurrent users  
**NFR-SCALE-004:** Background job queues shall handle 1,000 jobs/minute  
**NFR-SCALE-005:** Database connection pool shall be configurable (default: 20)  

---

### 6.3 Availability

**NFR-AVAIL-001:** System uptime shall be > 99.5% (monthly)  
**NFR-AVAIL-002:** Planned maintenance windows shall be announced 48 hours in advance  
**NFR-AVAIL-003:** System shall have health check endpoints  
**NFR-AVAIL-004:** Database backups shall be automated (daily)  
**NFR-AVAIL-005:** Database restore shall be tested monthly  

---

### 6.4 Security

**NFR-SEC-001:** All HTTP traffic shall use TLS 1.3  
**NFR-SEC-002:** PII shall be encrypted at rest (AES-256-GCM)  
**NFR-SEC-003:** Passwords shall be hashed using bcrypt (cost factor 12)  
**NFR-SEC-004:** JWT tokens shall expire after 15 minutes (access tokens)  
**NFR-SEC-005:** Refresh tokens shall rotate on use  
**NFR-SEC-006:** API endpoints shall enforce authentication where required  
**NFR-SEC-007:** API endpoints shall enforce authorization (role checks)  
**NFR-SEC-008:** Input validation shall be performed on all user inputs (Zod schemas)  
**NFR-SEC-009:** SQL injection shall be prevented (parameterized queries, Prisma)  
**NFR-SEC-010:** XSS shall be prevented (React escaping, Content-Security-Policy)  
**NFR-SEC-011:** CSRF shall be prevented (SameSite cookies)  
**NFR-SEC-012:** Rate limiting shall be applied:
- OTP requests: 3 per 10 minutes per phone
- API requests: 100 per minute per authenticated user
- API requests: 20 per minute per IP (unauthenticated)

**NFR-SEC-013:** Audit logs shall record:
- User authentication events
- Request creation/updates
- Donor responses
- Admin actions
- API access to sensitive data

**NFR-SEC-014:** Secrets shall never be committed to version control  
**NFR-SEC-015:** Environment variables shall be validated at startup  

---

### 6.5 Privacy

**NFR-PRIV-001:** Donor phone numbers shall be encrypted (not searchable by number)  
**NFR-PRIV-002:** Donor exact coordinates shall not be exposed in public search results  
**NFR-PRIV-003:** Donor contact info shall be disclosed only after consent  
**NFR-PRIV-004:** Location coordinates shall be purged after 7 days  
**NFR-PRIV-005:** Deleted accounts shall have PII purged within 30 days  
**NFR-PRIV-006:** Users shall be able to export their data (GDPR-style)  
**NFR-PRIV-007:** Users shall be able to delete their accounts  
**NFR-PRIV-008:** Privacy policy shall be accessible on all pages  

---

### 6.6 Accessibility

**NFR-A11Y-001:** Frontend shall comply with WCAG 2.1 Level AA  
**NFR-A11Y-002:** All interactive elements shall be keyboard accessible  
**NFR-A11Y-003:** All images shall have alt text  
**NFR-A11Y-004:** Color contrast shall meet AA standards (4.5:1 for text)  
**NFR-A11Y-005:** Form errors shall be announced to screen readers  
**NFR-A11Y-006:** Focus indicators shall be visible  
**NFR-A11Y-007:** Headings shall follow semantic hierarchy  
**NFR-A11Y-008:** Motion animations shall respect prefers-reduced-motion  

---

### 6.7 Localization

**NFR-L10N-001:** System shall support English and Nepali languages  
**NFR-L10N-002:** Language switching shall persist across sessions  
**NFR-L10N-003:** All UI text shall be externalized (no hardcoded strings)  
**NFR-L10N-004:** Date/time shall be formatted per locale  
**NFR-L10N-005:** Blood group enums shall be displayed in user's language  

---

### 6.8 Monitoring & Observability

**NFR-MON-001:** Backend shall use structured logging (Pino)  
**NFR-MON-002:** Frontend errors shall be tracked (Sentry)  
**NFR-MON-003:** Backend errors shall be tracked (Sentry)  
**NFR-MON-004:** Logs shall include correlation IDs (request tracing)  
**NFR-MON-005:** Critical errors shall trigger alerts  
**NFR-MON-006:** System metrics shall be exposed:
- Request count
- Response time (p50, p95, p99)
- Error rate
- Active users
- Queue length (BullMQ)
- Database connection pool usage

---

## 7. Technical Requirements

### 7.1 Technology Stack (Non-Negotiable)

**Frontend:**
- Next.js 16+ (App Router)
- React 19+
- TypeScript 5.9+
- Tailwind CSS 4+
- shadcn/ui
- Lucide icons
- React Hook Form
- Zod validation
- Zustand (where needed)

**Backend:**
- Node.js 20+
- NestJS 10+
- TypeScript 5.9+
- Prisma 6+ (ORM)
- PostgreSQL 16 (database)
- PostGIS 3.4+ (geospatial)
- Redis 7+ (optional, for queues)
- BullMQ (optional, for jobs)

**Testing:**
- Jest (backend unit tests)
- Supertest (backend API tests)
- Vitest (frontend unit tests)
- Playwright (E2E tests)
- @axe-core/playwright (accessibility)

**Infrastructure:**
- Docker + Docker Compose
- GitHub Actions (CI/CD)
- Pino (logging)
- Sentry (error tracking)
- Helmet (security headers)

**Integrations:**
- Resend (email)
- Sparrow SMS (Nepal SMS provider)
- WhatsApp Business API
- S3-compatible storage (file uploads)

---

### 7.2 Architecture Constraints

**AC-001:** Backend MUST use NestJS (per master prompt Section 13)  
**AC-002:** ORM MUST use Prisma (per master prompt Section 0.1)  
**AC-003:** Database MUST use PostgreSQL 16 (per master prompt)  
**AC-004:** Frontend MUST use Next.js App Router (not Pages Router)  
**AC-005:** API MUST be RESTful with OpenAPI/Swagger docs  
**AC-006:** Spatial queries MUST use PostGIS (not application-level haversine)  
**AC-007:** Background jobs SHOULD use Redis + BullMQ (when needed)  
**AC-008:** Internal messaging/chat SHALL NOT be implemented  
**AC-009:** Frontend MUST NOT implement business logic (NestJS only)  
**AC-010:** Secrets MUST NOT be exposed to browser (no NEXT_PUBLIC_* API keys)  

---

## 8. Acceptance Criteria

### 8.1 Phase 0 Complete When:
- ✅ PROJECT_AUDIT.md created
- ✅ COMPETITOR_RESEARCH.md created
- ✅ PRODUCT_REQUIREMENTS.md created (this document)
- ⏳ USER_JOURNEYS.md created
- ⏳ SYSTEM_ARCHITECTURE.md created
- ⏳ DATABASE_DESIGN.md created (Prisma schema)
- ⏳ API_SPECIFICATION.md created (NestJS endpoints)
- ⏳ IMPLEMENTATION_ROADMAP.md created

---

### 8.2 Backend (NestJS) Complete When:
- NestJS application starts on port 4000
- OpenAPI/Swagger UI accessible at /api/docs
- All 23 API endpoints migrated from Next.js
- Authentication works (OTP + JWT)
- Authorization works (RBAC guards)
- Prisma schema validated
- PostGIS extension enabled
- Spatial queries working (donor search by radius)
- Redis connected (if enabled)
- BullMQ queues processing (if enabled)
- 100+ Jest unit tests passing
- 20+ Supertest API tests passing
- Health endpoint responds

---

### 8.3 Frontend Complete When:
- Frontend calls NestJS backend (not Next.js API routes)
- All pages load correctly
- Authentication persists (cookies)
- Forms submit successfully
- No console errors
- Playwright E2E tests passing
- Accessibility audits passing (0 violations)

---

### 8.4 Integration Complete When:
- Frontend ↔ Backend communication works
- CORS configured correctly
- Session management works
- File uploads work (S3)
- Notifications sent (real providers)
- Webhooks received (SMS, WhatsApp)
- Live location updates (if enabled)

---

### 8.5 Production Ready When:
- All P0 features implemented
- All critical bugs fixed
- Security tests passing
- Performance benchmarks met
- Database backups automated
- Deployment documented
- Monitoring configured
- Error tracking active
- CI/CD pipeline green

---

## 9. Out of Scope (Explicitly Not Included)

❌ **Will NOT Build:**
1. Internal chat or messaging system
2. Native mobile apps (iOS/Android) — browser-first
3. Video calls or voice calls (platform-initiated)
4. Payment processing or monetization
5. AI/ML features (premature without data)
6. Social features (posts, comments, likes)
7. Ride-sharing or transportation booking
8. Medical advice or diagnosis
9. Blood testing or screening
10. Hospital EMR integration (future consideration)

---

## 10. Assumptions

1. **Nepal Context:**
   - Users have smartphones with mobile browsers
   - 4G coverage available in major cities
   - WhatsApp and Viber are popular
   - SMS is reliable fallback
   - Blood donation age: 18-60 years
   - Donation frequency: every 3 months minimum

2. **User Behavior:**
   - Donors will respond to invitations promptly in emergencies
   - Requesters will provide accurate information
   - Facilities will update inventory reasonably frequently
   - Users will grant GPS permission for better matching

3. **Technical:**
   - Managed PostgreSQL supports PostGIS extension
   - Redis is available (managed or self-hosted)
   - SMS/WhatsApp providers have Nepal coverage
   - S3-compatible storage is available
   - HTTPS certificates can be obtained

4. **Regulatory:**
   - Platform is coordination tool, not medical service
   - No license required for donor directory
   - Privacy regulations similar to GDPR apply
   - Audit logging meets local requirements

---

## 11. Dependencies

### 11.1 External Services

1. **Sparrow SMS** (Nepal SMS provider)
   - API token required
   - Account setup needed
   - Cost per SMS

2. **WhatsApp Business API**
   - Meta Business account
   - Phone number ID
   - Access token
   - Webhook endpoint

3. **Resend** (Email provider)
   - API key required
   - Domain verification
   - Sender identity

4. **S3-Compatible Storage**
   - Access keys
   - Bucket configuration
   - CORS policy

5. **Google Maps API** (Optional, for geocoding)
   - API key
   - Billing enabled

---

### 11.2 Infrastructure

1. **PostgreSQL 16 with PostGIS**
   - Managed service or self-hosted
   - Sufficient storage (50GB+ recommended)
   - Daily backups

2. **Redis 7** (Optional, for queues)
   - Managed service or self-hosted
   - Persistence enabled

3. **Web Hosting**
   - Node.js 20+ support
   - Docker support (preferred)
   - Environment variables
   - HTTPS

4. **Domain & DNS**
   - Domain name (e.g., raktadaan.org)
   - SSL certificate
   - DNS configuration

---

## 12. Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **Low donor response rates** | HIGH | MEDIUM | • Multiple notification channels<br>• Urgency indicators<br>• Staged geographic expansion |
| **Fake requests or spam** | HIGH | MEDIUM | • Phone verification required<br>• Rate limiting<br>• Admin moderation<br>• Abuse reporting |
| **Inventory data staleness** | MEDIUM | HIGH | • Display freshness timestamps<br>• Alert facilities to update<br>• "Unknown" status after 24h |
| **GPS permission denial** | MEDIUM | HIGH | • Make GPS optional<br>• Manual location entry<br>• District-level fallback |
| **SMS delivery failures** | HIGH | MEDIUM | • Multiple channels (WhatsApp, email)<br>• Retry logic<br>• Provider fallback |
| **PostGIS complexity** | MEDIUM | MEDIUM | • Use parameterized $queryRaw<br>• Test thoroughly<br>• Document spatial queries |
| **Privacy violations** | CRITICAL | LOW | • Encrypt PII at rest<br>• Access control<br>• Audit logging<br>• Privacy policy |
| **Matching algorithm issues** | HIGH | MEDIUM | • Extensive unit tests<br>• Staged rollout<br>• Monitoring<br>• Manual coordinator fallback |

---

## 13. Success Metrics

### 13.1 Launch Metrics (First 3 Months)

- **Donors registered:** 5,000+ in Kathmandu Valley
- **Requests created:** 500+
- **Match success rate:** > 50% (at least one acceptance per request)
- **Average response time:** < 15 minutes (invitation to first acceptance)
- **Platform uptime:** > 99%

---

### 13.2 Long-Term Metrics (6-12 Months)

- **Donors nationwide:** 50,000+
- **District coverage:** 77/77 districts
- **Fulfilled requests:** 5,000+
- **Lives saved:** 15,000+ (estimated, 3 per donation)
- **Repeat donors:** 30%+
- **Facility partnerships:** 50+ hospitals/blood banks

---

## 14. Glossary

- **Donor:** Person willing to donate blood
- **Requester:** Person creating blood request
- **Match:** Donor-request pairing created by algorithm
- **Invitation:** Notification sent to matched donor
- **Commitment:** Donor's acceptance of invitation
- **Fulfillment:** Confirmed completed donation
- **Facility:** Hospital, blood bank, or organization
- **Organization:** Entity managing facilities or campaigns
- **Coordinator:** Platform staff assisting with requests
- **OTP:** One-time password for authentication
- **JWT:** JSON Web Token for authorization
- **PostGIS:** PostgreSQL extension for geospatial queries
- **BullMQ:** Background job queue library
- **Prisma:** ORM for database access
- **NestJS:** Backend framework
- **WCAG:** Web Content Accessibility Guidelines

---

**Document Status:** ✅ Complete  
**Review Required:** Architecture team  
**Next Steps:** Create USER_JOURNEYS.md

---

*This document defines the complete product requirements per Master Prompt requirements.*
