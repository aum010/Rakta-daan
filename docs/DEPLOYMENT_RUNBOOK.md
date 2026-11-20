# Deployment Runbook

**Purpose:** Step-by-step guide for deploying Rakta-Daan to production.

**Audience:** DevOps engineers, platform engineers, release managers.

**Tested:** This runbook is based on the existing CI/CD setup in `.github/workflows/ci.yml`.

---

## Pre-Deployment Checklist

### 1. Code Quality Gates

Before deploying, ensure all gates pass locally:

```bash
# Run the full verification suite
pnpm verify

# Expected output:
# ✓ typecheck (0 errors)
# ✓ lint (0 problems)
# ✓ test (180+ tests passing)
# ✓ build (clean production build)
```

**Blocker:** If any gate fails, stop and fix before proceeding.

---

### 2. Git History Verification

```bash
# Ensure working tree is clean
git status

# Expected: "nothing to commit, working tree clean"

# Verify no secrets in git history
git-secrets --scan

# OR manually check:
git log --all -p | grep -i "password\|secret\|api.?key" || echo "✓ No secrets found"
```

---

### 3. Dependency Audit

```bash
# Check for security vulnerabilities
pnpm audit

# Review the report. High-severity vulnerabilities must be resolved.
# Low/moderate can be assessed for risk.
```

---

### 4. Documentation Completeness

- [ ] README.md is current (all links work, commands are accurate)
- [ ] `.env.example` matches actual environment variables
- [ ] All critical docs are updated (backend-integration-contract, API expectations)
- [ ] CHANGELOG.md reflects this release

---

### 5. Database Backup

```bash
# Before any deployment, backup production database
# (Ask database administrator to confirm backup completed)

pg_dump rakta_daan -h prod-db.company.local > rakta_daan_$(date +%Y%m%d_%H%M%S).sql

# Verify backup size is reasonable (should be > 1MB if database has data)
```

---

## Deployment Steps

### Step 1: Build the Application

```bash
# On the deployment machine, check out the release branch
git checkout main
git pull origin main

# Install dependencies (uses pnpm-lock.yaml for reproducible builds)
pnpm install --frozen-lockfile

# Build the production bundle
pnpm build

# Expected: "✓ compiled successfully"
# Check that .next/ folder exists and is > 5MB
```

---

### Step 2: Run Final Tests

```bash
# Run the full test suite one more time
pnpm verify

# Run smoke tests against the build (if doing a canary deployment)
E2E_BASE_URL=http://localhost:3010 pnpm test:e2e

# Start the built app locally to verify it runs
pnpm start &
sleep 5
curl http://localhost:3000 | head -20
kill %1
```

---

### Step 3: Deploy to Staging (Optional but Recommended)

```bash
# Push the built bundle to staging environment
# This depends on your hosting provider (Vercel, Netlify, AWS, etc.)

# Example for Vercel:
vercel deploy --prod --token $VERCEL_TOKEN

# Example for custom VPS:
rsync -av .next/ staging-server:/var/www/rakta-daan/.next/
ssh staging-server 'cd /var/www/rakta-daan && pnpm start'
```

---

### Step 4: Staging Verification

```bash
# Test critical user journeys on staging
SMOKE_BASE_URL=https://staging.rakta-daan.local pnpm smoke

# Expected: All 24 checks pass
# If any fail, rollback staging and investigate
```

---

### Step 5: Production Deployment

```bash
# Deploy to production
# (Method depends on your hosting provider)

# Example for Vercel (production):
vercel deploy --prod --token $VERCEL_TOKEN --name rakta-daan

# Example for custom VPS:
ssh prod-server 'cd /var/www/rakta-daan && git pull origin main && pnpm install --frozen-lockfile && pnpm build && pnpm restart'
```

---

### Step 6: Production Verification

```bash
# Immediate post-deployment checks
SMOKE_BASE_URL=https://rakta-daan.np pnpm smoke

# Manual spot checks
# 1. Open https://rakta-daan.np in a browser
# 2. Verify homepage loads (check Network tab for no 5xx errors)
# 3. Try a blood search (should return results)
# 4. Verify language switch works (English ↔ Nepali)
# 5. Check console for JavaScript errors (should be none)

# Monitor error tracking
# - Check Sentry/Rollbar for new errors (should be 0 in first 5 minutes)
# - Monitor application logs for exceptions
```

---

### Step 7: DNS and CDN Cache Invalidation

```bash
# If using a CDN (CloudFlare, AWS CloudFront, etc.)
# Clear cache to ensure users get the latest build

# CloudFlare example:
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache" \
  -H "X-Auth-Email: $CF_EMAIL" \
  -H "X-Auth-Key: $CF_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"purge_everything": true}'

# Verify DNS resolves to new server
nslookup rakta-daan.np
# Should show production server IP

# Check HTTPS certificate is valid
openssl s_client -connect rakta-daan.np:443 < /dev/null | grep "Verify return code"
# Should show "0 (ok)"
```

---

## Rollback Procedure

If production deployment fails or causes critical issues:

### Quick Rollback (< 5 min)

```bash
# If hosting on Vercel
vercel rollback --prod --token $VERCEL_TOKEN

# OR revert to previous git commit and redeploy
git revert HEAD
git push origin main
pnpm build && (deploy to prod)
```

### Full Rollback (with database)

```bash
# 1. Stop the application
ssh prod-server 'systemctl stop rakta-daan'

# 2. Restore database backup (if database changes were involved)
psql rakta_daan < rakta_daan_20261030_120000.sql

# 3. Restore previous build
rsync -av backup/.next/ prod-server:/var/www/rakta-daan/.next/

# 4. Restart application
ssh prod-server 'systemctl start rakta-daan'

# 5. Verify
SMOKE_BASE_URL=https://rakta-daan.np pnpm smoke
```

---

## Post-Deployment Checklist

After successful deployment:

- [ ] **Verify search works** — Blood search on homepage returns results
- [ ] **Check request creation** — New request can be submitted
- [ ] **Test donor registration** — Donor signup flow works
- [ ] **Verify contact links** — WhatsApp/SMS/call buttons work
- [ ] **Check accessibility** — Tab through pages with keyboard, no keyboard traps
- [ ] **Monitor errors** — Error tracking shows 0 critical issues
- [ ] **Check performance** — Lighthouse performance score ≥ 80
- [ ] **Verify HTTPS** — All pages load over HTTPS; no mixed content warnings
- [ ] **Test languages** — Both English and Nepali interfaces work
- [ ] **Monitor database** — Database query performance is normal
- [ ] **Notify team** — Post deployment summary in #announcements

---

## Monitoring and Alerting

### What to Monitor

1. **Application errors:**
   - 5xx errors should be near 0
   - 404 errors should be < 2% of traffic
   - Set alert if error rate > 1% for 5 minutes

2. **Performance:**
   - Page load time should average < 2 seconds
   - API response time should average < 500ms
   - Set alert if response time > 2s for 10 minutes

3. **Uptime:**
   - Health check endpoint: `GET /api/health`
   - Should return `{ status: "ok" }` with 200 status
   - Set alert if downtime > 1 minute

4. **Database:**
   - Connection pool usage should be < 80%
   - Slow queries (> 1s) should trigger log alert
   - Set alert if disk usage > 80%

### Example Monitoring Setup

```bash
# Health check endpoint (should already exist)
curl https://rakta-daan.np/api/health
# Expected response: { "status": "ok" }

# Monitoring with uptime service (e.g., Pingdom, Datadog)
# Check every 60 seconds; alert if down for 5+ minutes

# Application logs (Sentry, LogRocket, etc.)
# Alert on error count spike (> 10 errors in 5 minutes)

# Performance monitoring (Lighthouse CI, New Relic, etc.)
# Alert if Core Web Vitals degrade significantly
```

---

## Common Issues and Resolutions

### Issue: Build fails with "out of memory"

**Solution:**
```bash
# Increase Node memory for the build
NODE_OPTIONS="--max-old-space-size=4096" pnpm build
```

---

### Issue: Deployment successful but app shows 404 on all routes

**Solution:**
- Check that Next.js routes are correctly deployed
- Verify `.next` folder exists on production server
- Check that app is running: `systemctl status rakta-daan`
- Check logs: `journalctl -u rakta-daan -n 50`

---

### Issue: Search returns "API connection error"

**Solution:**
- Verify database is running: `psql rakta_daan -c "SELECT 1"`
- Check `NEXT_PUBLIC_API_URL` environment variable is set correctly
- Verify database connection string is correct in `.env`
- Check database has seed data: `SELECT COUNT(*) FROM facilities;`

---

### Issue: Old version still showing in browser

**Solution:**
- Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Clear cache in CDN (see Step 7 above)
- Check that new build was actually deployed: `curl https://rakta-daan.np/_next/static/ | grep -i build-id`

---

## Rollback Checklist

- [ ] Error rate has spiked significantly (> 5% of requests)
- [ ] Critical user journey is broken (e.g., blood search returns 0 results for all queries)
- [ ] Database is not responding
- [ ] HTTPS certificate has expired or is invalid
- [ ] Performance has degraded significantly (TTFB > 5s)

If 2+ of these are true, execute rollback immediately.

---

## Post-Mortem (if rollback was needed)

After any rollback:

1. **Document what happened:**
   - What code was deployed?
   - What was the expected change?
   - What went wrong?
   - What broke?

2. **Create ticket:**
   - Title: "Post-mortem: [Issue]"
   - Include timeline, root cause, and resolution
   - Assign to relevant team member

3. **Fix and retest:**
   - Fix the issue locally
   - Run full test suite: `pnpm verify`
   - Test in staging: `SMOKE_BASE_URL=https://staging... pnpm smoke`
   - Re-deploy to production

4. **Update process:**
   - If this issue was preventable, add a check to the verification suite
   - Update this runbook if needed

---

## Contact and Escalation

**For deployment issues:**
1. Check this runbook
2. Check error logs: `ssh prod-server 'journalctl -u rakta-daan -n 100'`
3. Check error tracking: Sentry/Rollbar dashboard
4. Escalate to platform lead if still unresolved

**For database issues:**
- Contact database administrator
- Provide exact error message and timestamp

**For DNS/CDN issues:**
- Contact DevOps/infrastructure team
- Provide curl output showing issue

---

## Deployment Frequency

**Recommended cadence:**
- Bug fixes: Deploy within 24 hours of merge to main
- Features: Deploy on Tuesday or Thursday (predictable schedule)
- Critical fixes: Deploy immediately (no waiting)

**Blackout periods:**
- Avoid deployments Friday 4pm–Monday 9am (weekend)
- Avoid deployments during known maintenance windows
- Avoid deployments on major holidays

---

## Version and Release Notes

After each deployment, tag the release:

```bash
git tag -a v1.0.1 -m "Release: Blood search fixes + accessibility improvements"
git push origin v1.0.1
```

**Update CHANGELOG.md:**

```markdown
## v1.0.1 (30 October 2026)

### Fixed
- Blood search returns no results for district-level queries
- Contact buttons invisible on mobile (z-index issue)

### Added
- Accessibility audit: 0 violations (WCAG 2.1 A/AA)
- Documentation for backend integration

### Performance
- TTFB improved from 420ms to 180ms (caching optimizations)
```

---

**Last updated:** 30 October 2026  
**Maintained by:** DevOps team  
**Next review:** After each production deployment
