# Remaining Work — Prioritized Action Plan

**Status:** 30 October 2026  
**Scope:** Enhancements and preparation for next phases (not blockers for production deployment)  
**Total:** ~40–60 hours of work across 3 phases

---

## PHASE 1 — Final Polish Before Deployment (5–10 hours)
**Priority: HIGH** | **Timeline: This week** | **Blocker for production: NO**

### 1.1 Enhanced Documentation for Deployment Teams

**Action:** Create a deployment runbook for operations teams.

**File:** `docs/deployment-runbook.md`

**Contents:**
- Pre-deployment checklist (git log clean, no secrets in code, build test on main)
- Deployment steps (DNS, CDN cache invalidation, database backup)
- Rollback procedure (how to revert if needed)
- Monitoring setup (error tracking, performance monitoring, uptime checks)
- Post-deployment verification (smoke tests, user journey checks)

**Estimate:** 2 hours

---

### 1.2 Environment Configuration Reference

**Action:** Enhance `.env.example` with additional documentation and safety checks.

**Current state:** `.env.example` exists with basic comments

**Enhancement:** Create `docs/environment-configuration.md` with:
- All variables explained (purpose, options, examples)
- Development vs. production settings
- Security recommendations
- Common troubleshooting

**Estimate:** 1.5 hours

---

### 1.3 Database Setup Guide

**Action:** Create a comprehensive database setup guide.

**File:** `docs/database-setup.md`

**Contents:**
- PostgreSQL version requirements (16+)
- Docker setup (docker-compose.yml walkthrough)
- Migration process explanation
- Seeding strategy (demo vs. production)
- Backup and recovery procedures

**Estimate:** 2 hours

---

### 1.4 README Final Verification

**Action:** Audit current README for completeness and accuracy.

**Check:**
- [ ] All command examples work as written
- [ ] All documentation links are valid
- [ ] Version numbers are current
- [ ] Contributing section is clear
- [ ] License is present and correct
- [ ] Setup time estimate is accurate

**Estimate:** 1 hour

---

### 1.5 API Documentation for Backend Teams

**Action:** Create comprehensive API documentation (what the frontend expects from the backend).

**File:** `docs/frontend/api-expectations.md`

**Contents:**
- Response schemas (samples for every endpoint)
- Error handling expectations
- Rate limiting requirements
- Authentication flow
- Real-world examples of integrating with each endpoint

**Estimate:** 2 hours

**Reference:** Use `docs/frontend/backend-integration-contract.md` as base

---

## PHASE 2 — Backend Integration Preparation (10–15 hours)
**Priority: HIGH** | **Timeline: Before backend integration begins** | **Blocker: NO**

### 2.1 API Service Adapter Enhancement

**File:** `src/services/api.ts`

**Current state:** Mocks + placeholder API calls

**Enhancement:** Create a feature flag system to easily swap between mock and real API.

**Implementation:**
```javascript
// src/services/api.ts
export const useApiProvider = (provider: 'mock' | 'real') => {
  return provider === 'mock' ? mockApi : realApi;
};
```

**Benefit:** Backend team can develop independently; frontend can use real API incrementally

**Estimate:** 3 hours

---

### 2.2 Environment-Based API Configuration

**Action:** Ensure API endpoints are configurable per environment without code changes.

**Update:** `.env.example` with API endpoint variables

```
# Development
NEXT_PUBLIC_API_URL_DEV=http://localhost:8000/api/v1

# Staging
NEXT_PUBLIC_API_URL_STAGING=https://staging-api.rakta-daan.local/api/v1

# Production
NEXT_PUBLIC_API_URL_PROD=https://api.rakta-daan.np/api/v1
```

**Benefit:** Teams can deploy to different environments without rebuilding

**Estimate:** 1.5 hours

---

### 2.3 Error Handling Standardization

**Action:** Create standardized error handling for API responses.

**File:** `src/lib/api-errors.ts`

**Implement:**
```javascript
export const ApiErrorType = {
  NETWORK: 'network_error',
  UNAUTHORIZED: 'unauthorized',
  FORBIDDEN: 'forbidden',
  NOT_FOUND: 'not_found',
  VALIDATION: 'validation_error',
  SERVER: 'server_error',
  TIMEOUT: 'timeout'
};

export const getErrorMessage = (error: ApiError) => {
  // Localized error messages in src/messages
};
```

**Benefit:** Consistent error UX across entire app; easier for backend team to align

**Estimate:** 2 hours

---

### 2.4 Authentication Flow Documentation

**File:** `docs/authentication-flow.md`

**Contents:**
- OTP generation and verification flow (diagrams)
- Session management (cookie vs. token)
- Refresh token strategy
- CSRF protection
- Account linking (if applicable)
- 2FA future requirements

**Estimate:** 2 hours

---

### 2.5 Integration Testing Setup for Backend

**Action:** Create integration test template for backend developers.

**File:** `tests/integration/api-integration.template.ts`

**Template:**
```typescript
describe('API Integration — Blood Search', () => {
  test('search returns facilities with freshness', async () => {
    const response = await fetch('/api/v1/search/blood?group=O+&lat=27.7&lng=85.3');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('facilities');
    expect(response.body.facilities[0]).toHaveProperty('updated_at');
  });
});
```

**Estimate:** 2 hours

---

### 2.6 Load Testing Baseline

**Action:** Document expected performance targets for backend team.

**File:** `docs/performance-targets.md`

**Contents:**
- Response time targets (p50, p95, p99)
- Throughput requirements (requests/sec)
- Concurrent user scenarios
- Geographic load distribution (Nepal-centric)
- Cache strategy recommendations

**Estimate:** 2 hours

---

## PHASE 3 — Production Readiness & Monitoring (15–20 hours)
**Priority: MEDIUM** | **Timeline: Before production launch** | **Blocker: NO**

### 3.1 Error Tracking Setup (Sentry/Rollbar)

**Action:** Configure error monitoring and create runbook for ops teams.

**File:** `docs/error-tracking-setup.md`

**Contents:**
- Sentry/Rollbar initialization code
- Alert rules (which errors page operations)
- Escalation procedures
- GDPR/privacy considerations (no PII in error reports)

**Estimate:** 3 hours

---

### 3.2 Monitoring Dashboard Template

**Action:** Create Prometheus/Grafana dashboard definition.

**File:** `docs/monitoring-dashboard.json`

**Metrics to track:**
- Page load time (by route)
- API response time (by endpoint)
- Error rate (by type)
- User geography (Nepal state distribution)
- Request success rate (by blood group searched)

**Estimate:** 3 hours

---

### 3.3 Security Hardening Checklist

**Action:** Create pre-production security audit checklist.

**File:** `docs/security-audit-checklist.md`

**Includes:**
- [ ] HTTPS enforced everywhere (HSTS header)
- [ ] No secrets in code (git-secrets configured)
- [ ] CSRF tokens on state-changing operations
- [ ] XSS protections (CSP headers)
- [ ] SQL injection protection (parameterized queries backend)
- [ ] Rate limiting on sensitive endpoints
- [ ] GDPR compliance (data retention, deletion)
- [ ] PII masking in logs
- [ ] Backup encryption

**Estimate:** 2 hours

---

### 3.4 User Privacy & Data Retention Runbook

**Action:** Document data deletion and retention procedures.

**File:** `docs/data-retention-operations.md`

**Contents:**
- GDPR right-to-be-forgotten implementation
- Request expiry and cleanup
- Donor history retention (legal requirements)
- Automated cleanup jobs (schedule, monitoring)
- Manual deletion procedures (with audit trail)
- Data export for compliance (GDPR Subject Access Requests)

**Estimate:** 3 hours

---

### 3.5 Incident Response Playbook

**Action:** Create an incident response guide for operations teams.

**File:** `docs/incident-response.md`

**Scenarios:**
- Database down (fallback mode?)
- API unavailable (static page?)
- Messaging provider outage (queue strategy)
- DDoS attack (rate limiting activation)
- Data breach (notification procedures)

**Estimate:** 3 hours

---

### 3.6 Oncall Runbook

**Action:** Create a quick reference for on-call engineers.

**File:** `docs/oncall-runbook.md`

**Contents:**
- Common alerts and resolution steps
- Escalation paths
- How to check logs
- How to trigger rollback
- Emergency contact numbers

**Estimate:** 2 hours

---

### 3.7 Analytics Setup Guide

**Action:** Configure analytics event tracking and create documentation.

**File:** `docs/analytics-setup.md`

**Events to track:**
- Blood search performed (blood group, location, result count)
- Request created (blood group, quantity)
- Donor registration (location)
- Facility search completion rate
- Page view funnel (home → search → results → contact)

**Estimate:** 2 hours

---

### 3.8 Legal & Compliance

**Action:** Create compliance checklist and gap analysis.

**File:** `docs/legal-compliance.md`

**Items:**
- [ ] Privacy policy reviewed by legal (Nepali + English)
- [ ] Terms of service reviewed by legal
- [ ] Medical disclaimers validated
- [ ] GDPR compliance verified (even though Nepal-focused)
- [ ] Liability limitations documented
- [ ] Data processing agreements (if using 3rd parties)

**Estimate:** 2 hours

---

## OPTIONAL ENHANCEMENTS (Nice-to-Have, 10–15 hours)

### Optional 1: Architecture Decision Records (ADRs)

**Files:** `docs/adr/` directory with `001-next-js-choice.md`, `002-no-shadcn.md`, etc.

**Purpose:** Document why major decisions were made (helpful for onboarding future teams)

**Estimate:** 3 hours

---

### Optional 2: Performance Optimization Guide

**File:** `docs/performance-optimization.md`

**Contents:**
- How to profile the app (DevTools, Lighthouse)
- Common bottlenecks (bundle size, API calls, image optimization)
- Optimization checklist before each release
- Cache strategy (browser, CDN, Redis)

**Estimate:** 2 hours

---

### Optional 3: Troubleshooting Guide

**File:** `docs/troubleshooting.md`

**Common issues:**
- "Build fails with X error"
- "Tests are flaky"
- "Search returns no results"
- "Location permission denied"
- "Can't log in with OTP"

**Estimate:** 2 hours

---

### Optional 4: Contribution Guidelines

**File:** `CONTRIBUTING.md` (root level)

**Contents:**
- How to set up development environment
- Code style and conventions
- How to add a new page
- How to add a new component
- PR review process
- Commit message format

**Estimate:** 2 hours

---

### Optional 5: Visual Regression Testing

**File:** `tests/e2e/visual-regression.spec.ts`

**Setup:** Playwright visual snapshots for key pages

**Benefit:** Catch unintended visual changes in CI

**Estimate:** 3 hours

---

### Optional 6: Lighthouse CI Integration

**File:** `.github/workflows/lighthouse.yml`

**Setup:** Automated Lighthouse audit on every PR

**Benefit:** Performance metrics in every pull request

**Estimate:** 2 hours

---

## Quick Wins (1–2 hours each)

- [ ] Add favicon refresh
- [ ] Set up Open Graph meta tags (social sharing preview)
- [ ] Create robots.txt with proper crawl rules
- [ ] Add sitemap.xml dynamically
- [ ] Create 404 page with helpful links
- [ ] Add breadcrumbs to nested pages
- [ ] Create a changelog (CHANGELOG.md)
- [ ] Add GitHub issue templates (.github/ISSUE_TEMPLATE/)
- [ ] Add GitHub PR template (.github/pull_request_template.md)
- [ ] Create CODE_OF_CONDUCT.md

---

## Summary: Work by Phase

| Phase | Focus | Hours | Timeline |
|---|---|---|---|
| **1** | Deployment readiness | 5–10 | This week |
| **2** | Backend integration prep | 10–15 | Before backend starts |
| **3** | Production monitoring & compliance | 15–20 | Before launch |
| **Optional** | Nice-to-have docs & features | 10–15 | Anytime |
| **Quick Wins** | Easy improvements | 1–2 each | Spare time |

**Total Critical Path: 30–35 hours**  
**Total with Optional: 50–65 hours**

---

## How to Prioritize

**If you have 5 hours:** Do PHASE 1 (deployment runbook + README verification)

**If you have 20 hours:** Do PHASE 1 + 2.1–2.3 (API configuration and error handling)

**If you have 50 hours:** Do all of PHASE 1 + 2 + 3 + quick wins

**If you have 70 hours:** Do everything (including optional)

---

## What NOT to Do

🚫 Don't add new features  
🚫 Don't refactor existing code  
🚫 Don't change the design system  
🚫 Don't modify the database schema  

**Focus:** Completing documentation, preparing for backend integration, and setting up production operations.

---

## Next Steps

1. **Choose a phase** based on your available time
2. **Assign ownership** (frontend lead, devops, backend lead)
3. **Create tickets** for each item
4. **Execute in order** (Phase 1 before Phase 2, etc.)
5. **Review and sign off** before production deployment

---

**All of this work is optional for production deployment, but highly recommended before going live with real users.**
