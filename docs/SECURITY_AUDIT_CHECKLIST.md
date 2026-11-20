# Pre-Production Security Audit Checklist

**Purpose:** Verify security readiness before production deployment.

**Audience:** Security engineer, DevOps lead, platform lead.

**Frequency:** Complete before each production release.

**Severity levels:** 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low

---

## HTTPS & TLS

- [ ] **🔴 HTTPS enforced on all pages**
  - Test: `curl -I https://rakta-daan.np` should show 200, not redirect
  - Test: `curl -I http://rakta-daan.np` should redirect to HTTPS
  - **Fix:** Enable HTTP→HTTPS redirect in web server

- [ ] **🔴 HSTS header present**
  - Test: `curl -I https://rakta-daan.np | grep -i strict-transport`
  - Expected: `Strict-Transport-Security: max-age=31536000; includeSubDomains`
  - **Fix:** Add to web server config (Nginx, Apache, or app middleware)

- [ ] **🔴 SSL certificate valid**
  - Test: `openssl s_client -connect rakta-daan.np:443 < /dev/null | grep "Verify return code"`
  - Expected: `0 (ok)`
  - **Fix:** Renew certificate if expiring soon (Let's Encrypt recommended)

- [ ] **🟠 TLS 1.2+ only (no SSL 3, TLS 1.0, 1.1)**
  - Test: `nmap --script ssl-enum-ciphers rakta-daan.np`
  - **Fix:** Update web server TLS configuration

- [ ] **🟢 Session cookies flagged Secure and HttpOnly**
  - Test: Browser DevTools → Application → Cookies
  - Look for: `Secure` ✓, `HttpOnly` ✓
  - **Fix:** Update session cookie middleware in backend

---

## Secrets Management

- [ ] **🔴 No secrets in version control**
  - Test: `git log --all -p | grep -iE "password|secret|api.?key|token" | head -20`
  - Expected: No matches or only references in documentation
  - **Fix:** Use `.env.local` and `.env.example` (no secrets in `.env.example`)
  - **Check:** `.env.local` is in `.gitignore`

- [ ] **🔴 No API keys in browser**
  - Test: Open browser DevTools → Network tab
  - Search for: API keys, tokens, passwords in requests
  - Expected: No keys visible
  - **Fix:** All API keys must be on backend; never in client code

- [ ] **🟠 Environment variables not logged**
  - Test: Check application logs for environment variable exposure
  - Expected: No `DATABASE_URL`, `AUTH_SECRET`, etc. in logs
  - **Fix:** Sanitize logs in error handlers

- [ ] **🟠 Secrets rotation policy in place**
  - Test: Verify document exists: `docs/secrets-rotation-policy.md`
  - Expected: Policy for rotating API keys, database passwords quarterly
  - **Fix:** Create rotation runbook

---

## Authentication & Authorization

- [ ] **🔴 OTP requires user confirmation**
  - Test: Register → request OTP → verify OTP is required before access
  - Expected: Cannot access account without verifying OTP
  - **Fix:** Enforce OTP verification in auth middleware

- [ ] **🟠 Rate limiting on login/OTP endpoints**
  - Test: Send 20 requests to `POST /api/v1/auth/otp` in quick succession
  - Expected: 429 Too Many Requests after 5-10 requests
  - **Fix:** Implement rate limiting by IP and phone number

- [ ] **🟡 CSRF protection on state-changing operations**
  - Test: Form submissions should include CSRF token
  - Expected: POST requests have X-CSRF-Token header or hidden field
  - **Fix:** Add CSRF middleware to backend

- [ ] **🟡 Session timeout (inactivity)**
  - Test: Log in, wait 30 minutes without activity, reload page
  - Expected: Session expired, must log in again
  - **Fix:** Set session timeout to 30 minutes (configurable)

- [ ] **🟢 Role-based access control (RBAC) enforced**
  - Test: Non-admin user tries to access `/admin` API
  - Expected: 403 Forbidden
  - **Fix:** Add role checks on backend endpoints

---

## Input Validation & Sanitization

- [ ] **🔴 SQL injection prevention**
  - Test: Input `'; DROP TABLE users; --` into search box
  - Expected: Treated as literal string, no error
  - **Fix:** Use parameterized queries (Drizzle ORM handles this)
  - **Verify:** Check `src/db/` uses parameterized queries

- [ ] **🟠 XSS prevention**
  - Test: Input `<script>alert('XSS')</script>` into form
  - Expected: Displayed as escaped text, no alert
  - **Fix:** React auto-escapes by default; verify no `dangerouslySetInnerHTML`
  - **Verify:** Grep for `dangerouslySetInnerHTML` → should return 0 results

- [ ] **🟠 Command injection prevention**
  - Test: No system commands executed from user input
  - **Fix:** Never use `child_process.exec()` with user input; use `execFile()` instead

- [ ] **🟡 File upload validation**
  - Test: Try uploading `.exe`, `.js`, or malicious files
  - Expected: Rejected with 400 Bad Request
  - **Fix:** Validate MIME type, size, and extension on backend

- [ ] **🟡 Input length limits**
  - Test: Submit a form with extremely long text (> 10MB)
  - Expected: Rejected with 413 Payload Too Large
  - **Fix:** Set Content-Length limit on backend

---

## Data Protection

- [ ] **🔴 Sensitive data encrypted at rest**
  - Test: Check that database column `phone_number` is encrypted
  - Test: Raw database record should not show readable phone
  - **Fix:** Use database-level encryption or column-level encryption

- [ ] **🔴 Sensitive data encrypted in transit**
  - Test: All API responses over HTTPS (✓ checked above)
  - Test: Check network tab in DevTools — no unencrypted sensitive data

- [ ] **🟠 Passwords hashed (not encrypted)**
  - Test: Check database — password column should be hash, not plaintext or reversible
  - **Fix:** Use bcrypt (minimum 12 rounds) or Argon2
  - **Verify:** `src/db/schema.ts` uses `bcrypt` for password hashing

- [ ] **🟡 PII masking in logs**
  - Test: Check application logs for phone numbers, emails
  - Expected: PII masked (e.g., `+977-****-****`)
  - **Fix:** Add masking function in error handler

- [ ] **🟡 Data retention policy enforced**
  - Test: Verify old requests are deleted
  - Test: `SELECT * FROM requests WHERE created_at < NOW() - INTERVAL '90 days' | wc -l`
  - Expected: 0 results (or policy limit)
  - **Fix:** Implement database cleanup job

---

## API Security

- [ ] **🔴 No sensitive data in URLs**
  - Test: Check request URLs for phone, email, auth tokens
  - Expected: No personal data in query strings
  - **Fix:** Use POST with body for sensitive data

- [ ] **🔴 API endpoints authenticated/authorized**
  - Test: Call `/api/v1/requests/[id]` without auth token
  - Expected: 401 Unauthorized (if endpoint requires auth)
  - **Fix:** Add authentication check on restricted endpoints

- [ ] **🟠 API response headers secure**
  - Test: `curl -I https://rakta-daan.np/api/v1/facilities`
  - Expected: See security headers
  ```
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  X-XSS-Protection: 1; mode=block
  ```
  - **Fix:** Add headers in backend middleware

- [ ] **🟠 CORS properly configured**
  - Test: `curl -H "Origin: https://evil.example.com" https://rakta-daan.np/api/v1/`
  - Expected: No `Access-Control-Allow-Origin` header (or only for `rakta-daan.np`)
  - **Fix:** Set `CORS_ALLOWED_ORIGINS` environment variable

- [ ] **🟡 API versioning in place**
  - Test: Check API endpoints use `/api/v1/` prefix
  - Expected: Endpoints versioned (v1, v2, etc.)
  - **Fix:** Update API routes to include version

---

## Frontend Security

- [ ] **🔴 No console errors with sensitive data**
  - Test: Open browser DevTools → Console
  - Expected: No errors visible; no stack traces with file paths
  - **Fix:** Set up error boundary; send errors to server, not console

- [ ] **🟠 No secrets in localStorage/sessionStorage**
  - Test: Open DevTools → Application → Storage
  - Expected: No API keys, auth tokens, or passwords
  - **Fix:** Use secure HTTP-only cookies for auth tokens

- [ ] **🟠 Content Security Policy (CSP) header present**
  - Test: `curl -I https://rakta-daan.np | grep -i content-security`
  - Expected: CSP header with reasonable directives
  - **Fix:** Add CSP header in web server config

- [ ] **🟡 No inline scripts or styles**
  - Test: `grep -r "onclick\|onerror\|<style>" src/` (should be 0 or minimal)
  - Expected: Scripts in separate files, not inline
  - **Fix:** Extract inline styles/scripts

---

## Dependency Security

- [ ] **🔴 No known vulnerable dependencies**
  - Test: `pnpm audit --audit-level=moderate`
  - Expected: 0 high or critical vulnerabilities
  - **Fix:** Update dependencies or find alternatives
  - Verify: `pnpm audit` passes

- [ ] **🟠 Dependency lock file up to date**
  - Test: `pnpm-lock.yaml` is committed to git
  - Expected: Lock file matches `package.json`
  - **Fix:** Run `pnpm install` and commit lock file

- [ ] **🟡 Supply chain security**
  - Test: Review new dependencies added in this release
  - Check: NPM registry for typosquatting (e.g., `react` vs `reac`)
  - Fix: Use `npm ls` to verify dependency tree

---

## Infrastructure Security

- [ ] **🔴 Database not publicly accessible**
  - Test: `nmap -p 5432 rakta-daan.np` should show port closed
  - Expected: PostgreSQL port not exposed to internet
  - **Fix:** Put database behind firewall; only accessible from app server

- [ ] **🔴 SSH access restricted**
  - Test: `nmap -p 22 rakta-daan.np` should show port filtered or closed
  - Expected: SSH not directly accessible from internet
  - **Fix:** Use bastion host or VPN for SSH access

- [ ] **🟠 Firewall rules in place**
  - Test: Review cloud provider firewall / security group rules
  - Expected: Only necessary ports open (80, 443)
  - **Fix:** Create firewall rules document

- [ ] **🟠 Regular backups taken**
  - Test: Verify backup schedule exists
  - Test: `ls -la /backups/rakta_daan_*.sql | head -5`
  - Expected: Recent backups present
  - **Fix:** Configure automated daily backups

- [ ] **🟡 Monitoring and alerting active**
  - Test: Check Sentry/error tracking dashboard
  - Expected: Errors are being tracked; alerts are configured
  - **Fix:** Set up Sentry + alerts

---

## Compliance & Privacy

- [ ] **🔴 Privacy policy complies with GDPR/local law**
  - Test: Read `privacy-policy` page
  - Expected: Clearly states what data is collected, how it's used, user rights
  - **Fix:** Have legal review privacy policy

- [ ] **🔴 Terms of Service present and reviewed**
  - Test: `/terms` page exists
  - Expected: Legal has reviewed and approved
  - **Fix:** Create ToS or have lawyer draft

- [ ] **🟠 GDPR right-to-be-forgotten implemented**
  - Test: Endpoint exists to delete user data: `DELETE /api/v1/users/me`
  - Expected: All user data removed after request
  - **Fix:** Implement data deletion endpoint

- [ ] **🟠 Data processing agreement (if using 3rd parties)**
  - Test: Verify DPA exists with any data processors
  - Expected: Document on file for Sentry, Vercel, analytics, etc.
  - **Fix:** Request DPA from vendors

- [ ] **🟡 Incident response plan documented**
  - Test: File exists: `docs/incident-response.md`
  - Expected: Procedure for handling security incidents
  - **Fix:** Create incident response playbook

---

## Monitoring & Logging

- [ ] **🔴 Error tracking active**
  - Test: Trigger an error intentionally
  - Test: Check Sentry/error tracker for the error
  - Expected: Error appears within 2 minutes
  - **Fix:** Set up Sentry or similar

- [ ] **🟠 Audit logging on sensitive actions**
  - Test: Create a request → check audit log
  - Expected: Action logged with timestamp and user ID
  - **Fix:** Implement audit logging for: auth, request creation, data changes

- [ ] **🟡 Suspicious activity alerts**
  - Test: Review alert configuration
  - Expected: Alerts for: failed login attempts, SQL injection attempts, rate limit breaches
  - **Fix:** Configure alerts in error tracking or WAF

---

## Third-Party Services

- [ ] **🟠 Third-party APIs use HTTPS**
  - Test: Check all external API calls in `src/services/`
  - Expected: All use `https://` URLs
  - **Fix:** Update any `http://` to `https://`

- [ ] **🟡 Third-party API keys stored securely**
  - Test: Check `.env.local` (should be in `.gitignore`)
  - Expected: Keys are not in version control
  - **Fix:** Use environment variables for all API keys

- [ ] **🟡 Third-party SLAs documented**
  - Test: File exists: `docs/third-party-slas.md`
  - Expected: List of services with uptime SLA and fallback plan
  - **Fix:** Document dependencies and SLAs

---

## Incident Response

- [ ] **🟠 Incident response plan is documented**
  - Test: File exists: `docs/incident-response.md`
  - Expected: Steps for common incidents (breach, DDoS, data loss)

- [ ] **🟡 On-call runbook is available**
  - Test: File exists: `docs/oncall-runbook.md`
  - Expected: Quick reference for on-call engineers

- [ ] **🟡 Security contact information is available**
  - Test: Security team contact info in `README.md` or `SECURITY.md`
  - Expected: Clear process for reporting vulnerabilities

---

## Pre-Flight Checks (Day Before Deployment)

Run these final checks 24 hours before production deployment:

```bash
# 1. Verify no uncommitted secrets
git diff HEAD | grep -iE "password|secret|api.?key"

# 2. Run security audit
pnpm audit --audit-level=moderate

# 3. Check for vulnerable dependencies
npm ls

# 4. Verify build passes all tests
pnpm verify

# 5. Test against staging API
E2E_BASE_URL=https://staging.rakta-daan.local pnpm test:e2e

# 6. Check HTTPS and headers
curl -I https://staging.rakta-daan.local | grep -i "strict-transport\|x-content\|x-frame"

# 7. Review recent commits
git log --oneline -10

# 8. Verify backup was taken
ls -la /backups/rakta_daan_*.sql | head -1

# 9. Check database connectivity
psql -h prod-db.company.local -U rakta_daan -d rakta_daan -c "SELECT 1"

# 10. Review open security issues
# - Check GitHub Issues for any labeled "security"
# - Check Sentry for recurring errors
```

---

## Sign-Off

This checklist must be reviewed and approved before production deployment.

**Reviewed by (print name):** ____________________________  
**Date:** ____________________________  
**Approved by (Tech Lead):** ____________________________  
**Approved by (Security/DevOps):** ____________________________  

---

## Issue Tracking

If any items are not yet complete, create GitHub issues:

```
Title: [SECURITY] <Item name> not complete
Label: security
Priority: Critical/High/Medium/Low
Assign to: <Team member responsible>
```

Example:

```
Title: [SECURITY] Database encryption at rest not configured
Label: security
Priority: High
Body:
- [ ] Enable column-level encryption on `phone_number` column
- [ ] Update schema migration
- [ ] Test decryption on read
Assign to: @backend-lead
```

---

**Last updated:** 30 October 2026  
**Next review:** Before next production release  
**Maintained by:** Security + DevOps team
