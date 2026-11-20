# API Specification

**Document Version:** 1.0  
**Last Updated:** 2025-01-29  
**Status:** Phase 0 - API Documentation  
**Base URL:** `https://api.raktadaan.org` (production) | `http://localhost:3000` (development)

---

## Executive Summary

Rakta-Daan exposes a RESTful API built with **Next.js 16 API Routes**. All endpoints follow REST conventions, return JSON, and use standard HTTP status codes. Authentication uses **JWT tokens** with session management.

### API Versioning
- **Current Version:** v1
- **URL Pattern:** `/api/v1/*`
- **Versioning Strategy:** URL-based (not header-based)
- **Deprecation Policy:** 6-month notice before v1 sunset

---

## 1. Authentication

### 1.1 Overview

**Method:** JWT-based authentication with OTP verification  
**Token Type:** Bearer token in `Authorization` header  
**Token Lifetime:** 7 days (rolling refresh)  
**Storage:** HttpOnly cookies (web), AsyncStorage (mobile)

---

### 1.2 Request OTP

**Endpoint:** `POST /api/v1/auth/otp/request`

**Description:** Initiates OTP-based authentication by sending a one-time password to the user's phone or email.

**Request Body:**
```json
{
  "identifier": "+9779876543210",  // Phone (E.164 format) or email
  "type": "phone"                   // "phone" or "email"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "data": {
    "expiresAt": "2025-01-29T12:35:00Z",  // 5 minutes from now
    "cooldownSeconds": 60                 // Resend cooldown
  }
}
```

**Rate Limiting:** 3 requests per 10 minutes per identifier

**Errors:**
- `400 Bad Request` - Invalid phone/email format
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - SMS/email delivery failed

---

### 1.3 Verify OTP

**Endpoint:** `POST /api/v1/auth/otp/verify`

**Description:** Verifies the OTP code and issues JWT token. Creates user account if first-time login.

**Request Body:**
```json
{
  "identifier": "+9779876543210",
  "type": "phone",
  "code": "123456"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "phone": "+9779876543210",
      "email": null,
      "fullName": null,
      "role": "donor",
      "verified": false,
      "createdAt": "2025-01-29T12:30:00Z"
    },
    "isNewUser": true  // First-time login
  }
}
```

**Errors:**
- `400 Bad Request` - Missing fields
- `401 Unauthorized` - Invalid or expired OTP
- `500 Internal Server Error` - Token generation failed

**Side Effects:**
- Creates new user if `isNewUser: true`
- Sets `HttpOnly` cookie with JWT token
- Logs audit event

---

### 1.4 Logout

**Endpoint:** `POST /api/v1/auth/logout`

**Description:** Invalidates the current JWT token and clears session.

**Headers:**
```http
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Side Effects:**
- Adds token to blacklist (Redis)
- Clears HttpOnly cookie
- Logs audit event

---

## 2. Donor Endpoints

### 2.1 Create/Update Donor Profile

**Endpoint:** `POST /api/v1/donors` or `PATCH /api/v1/donors/me`

**Description:** Creates a new donor profile or updates the authenticated user's profile.

**Authentication:** Required

**Request Body:**
```json
{
  "bloodType": "O+",
  "dateOfBirth": "1995-05-15",
  "gender": "male",
  "weight": 70.5,
  "height": 175,
  "districtId": "550e8400-e29b-41d4-a716-446655440000",
  "city": "Kathmandu",
  "address": "Thamel, Ward 26",
  "latitude": 27.7172,
  "longitude": 85.3240,
  "willingToTravel": true,
  "maxTravelDistance": 15,
  "lastDonationDate": "2024-10-15",
  "chronicConditions": ["diabetes"],
  "medications": ["metformin"],
  "allergies": []
}
```

**Response:** `201 Created` or `200 OK`
```json
{
  "success": true,
  "message": "Donor profile created successfully",
  "data": {
    "id": "650e8400-e29b-41d4-a716-446655440000",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "bloodType": "O+",
    "rhFactor": "positive",
    "availabilityStatus": "available",
    "nextEligibleDate": "2025-01-15",
    "totalDonations": 0,
    "lifetimesSaved": 0,
    "responseRate": 0,
    "createdAt": "2025-01-29T12:30:00Z",
    "updatedAt": "2025-01-29T12:30:00Z"
  }
}
```

**Validation:**
- `bloodType`: Required, one of A+, A-, B+, B-, AB+, AB-, O+, O-
- `dateOfBirth`: Must be 18-60 years old
- `weight`: Minimum 50kg required for donation
- `lastDonationDate`: If provided, must be > 3 months ago
- `latitude/longitude`: Valid WGS84 coordinates

**Errors:**
- `400 Bad Request` - Validation failed
- `401 Unauthorized` - Not authenticated
- `409 Conflict` - Donor profile already exists (for POST)

---

### 2.2 Get Donor Profile

**Endpoint:** `GET /api/v1/donors/me`

**Description:** Retrieves the authenticated user's donor profile.

**Authentication:** Required

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "650e8400-e29b-41d4-a716-446655440000",
    "bloodType": "O+",
    "rhFactor": "positive",
    "availabilityStatus": "available",
    "districtId": "550e8400-e29b-41d4-a716-446655440000",
    "district": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Kathmandu",
      "province": "3"
    },
    "city": "Kathmandu",
    "latitude": 27.7172,
    "longitude": 85.3240,
    "willingToTravel": true,
    "maxTravelDistance": 15,
    "lastDonationDate": "2024-10-15",
    "nextEligibleDate": "2025-01-15",
    "totalDonations": 5,
    "lifetimesSaved": 15,
    "responseRate": 87.5,
    "averageResponseTime": 12,
    "badgeIds": ["badge-id-1", "badge-id-2"],
    "milestoneReached": 5,
    "createdAt": "2023-01-15T10:00:00Z",
    "updatedAt": "2025-01-29T12:30:00Z"
  }
}
```

**Errors:**
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - No donor profile found

---

### 2.3 Search Donors (Admin/Hospital Only)

**Endpoint:** `GET /api/v1/donors`

**Description:** Search donors by filters. Restricted to admin and hospital staff.

**Authentication:** Required (role: admin, hospital_staff)

**Query Parameters:**
```
?bloodType=O+
&districtId=550e8400-e29b-41d4-a716-446655440000
&availabilityStatus=available
&limit=50
&offset=0
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "donors": [
      {
        "id": "650e8400-e29b-41d4-a716-446655440000",
        "bloodType": "O+",
        "availabilityStatus": "available",
        "district": { "name": "Kathmandu" },
        "totalDonations": 5,
        "responseRate": 87.5
        // Note: PII like name, phone redacted for privacy
      }
    ],
    "pagination": {
      "total": 245,
      "limit": 50,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

**Errors:**
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Insufficient permissions

---

## 3. Blood Request Endpoints

### 3.1 Create Blood Request

**Endpoint:** `POST /api/v1/requests`

**Description:** Creates a new blood request. Automatically triggers matching algorithm.

**Authentication:** Required

**Request Body:**
```json
{
  "bloodType": "O+",
  "quantity": 2,
  "urgency": "critical",
  "requiredBy": "2025-01-30T18:00:00Z",
  "hospitalId": "750e8400-e29b-41d4-a716-446655440000",
  "districtId": "550e8400-e29b-41d4-a716-446655440000",
  "city": "Kathmandu",
  "address": "Bir Hospital, Emergency Ward",
  "latitude": 27.7050,
  "longitude": 85.3140,
  "patientName": "Encrypted-Patient-Name",  // Optional, will be encrypted
  "patientAge": 45,
  "patientGender": "male",
  "diagnosis": "Accident, severe blood loss",
  "requestType": "emergency",
  "replacementDonorRequired": false,
  "contactName": "Ram Kumar Sharma",
  "contactPhone": "+9779812345678",
  "contactRelation": "father",
  "additionalNotes": "Patient in critical condition, needs AB+ urgently",
  "publicMessage": "Urgent need for AB+ blood at Bir Hospital",
  "searchRadius": 10
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "Blood request created successfully",
  "data": {
    "id": "850e8400-e29b-41d4-a716-446655440000",
    "publicId": "REQ-2025-001234",  // Shareable ID
    "bloodType": "O+",
    "quantity": 2,
    "urgency": "critical",
    "status": "open",
    "requiredBy": "2025-01-30T18:00:00Z",
    "hospital": {
      "id": "750e8400-e29b-41d4-a716-446655440000",
      "name": "Bir Hospital"
    },
    "contactName": "Ram Kumar Sharma",
    "contactPhone": "+9779812345678",
    "searchRadius": 10,
    "matchCount": 0,
    "createdAt": "2025-01-29T12:30:00Z",
    "expiresAt": "2025-01-31T18:00:00Z"
  }
}
```

**Validation:**
- `bloodType`: Required
- `quantity`: 1-10 units
- `urgency`: critical, urgent, routine
- `requiredBy`: Must be in future
- `contactPhone`: Valid E.164 format

**Side Effects:**
- Triggers matching algorithm (background job)
- Notifies nearby donors (if urgent/critical)
- Creates audit log entry

**Errors:**
- `400 Bad Request` - Validation failed
- `401 Unauthorized` - Not authenticated

---

### 3.2 Get Blood Request

**Endpoint:** `GET /api/v1/requests/{publicId}`

**Description:** Retrieves a blood request by its public ID. Anyone with the link can view.

**Authentication:** Optional (public endpoint for sharing)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "850e8400-e29b-41d4-a716-446655440000",
    "publicId": "REQ-2025-001234",
    "bloodType": "O+",
    "quantity": 2,
    "urgency": "critical",
    "status": "open",
    "requiredBy": "2025-01-30T18:00:00Z",
    "hospital": {
      "name": "Bir Hospital",
      "address": "Kathmandu"
    },
    "district": { "name": "Kathmandu" },
    "contactName": "Ram Kumar Sharma",
    "contactPhone": "+977981****678",  // Masked for privacy
    "publicMessage": "Urgent need for AB+ blood at Bir Hospital",
    "matchCount": 15,
    "responseCount": 3,
    "createdAt": "2025-01-29T12:30:00Z",
    "updatedAt": "2025-01-29T12:45:00Z"
  }
}
```

**Privacy:**
- Patient name not exposed (unless requester)
- Contact phone partially masked
- Exact location not shared (only district/hospital)

**Errors:**
- `404 Not Found` - Invalid publicId

---

### 3.3 List Blood Requests

**Endpoint:** `GET /api/v1/requests`

**Description:** Lists blood requests with filtering.

**Authentication:** Optional (returns public data), Required for full details

**Query Parameters:**
```
?status=open
&urgency=critical
&bloodType=O+
&districtId=550e8400-e29b-41d4-a716-446655440000
&limit=20
&offset=0
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "requests": [
      {
        "publicId": "REQ-2025-001234",
        "bloodType": "O+",
        "urgency": "critical",
        "status": "open",
        "requiredBy": "2025-01-30T18:00:00Z",
        "hospital": { "name": "Bir Hospital" },
        "district": { "name": "Kathmandu" },
        "matchCount": 15,
        "createdAt": "2025-01-29T12:30:00Z"
      }
    ],
    "pagination": {
      "total": 47,
      "limit": 20,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

---

### 3.4 Update Blood Request

**Endpoint:** `PATCH /api/v1/requests/{publicId}`

**Description:** Updates a blood request (only by creator).

**Authentication:** Required (must be request creator)

**Request Body:** (all fields optional)
```json
{
  "urgency": "urgent",
  "requiredBy": "2025-01-31T18:00:00Z",
  "quantity": 3,
  "status": "in_progress"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Blood request updated successfully",
  "data": { /* updated request */ }
}
```

**Errors:**
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Not the request creator
- `404 Not Found` - Invalid publicId

---

### 3.5 Close Blood Request

**Endpoint:** `POST /api/v1/requests/{publicId}/close`

**Description:** Marks a blood request as fulfilled or cancelled.

**Authentication:** Required (must be request creator)

**Request Body:**
```json
{
  "status": "fulfilled",  // or "cancelled"
  "reason": "Blood arranged from blood bank"  // For cancellation
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Blood request closed successfully",
  "data": {
    "id": "850e8400-e29b-41d4-a716-446655440000",
    "status": "fulfilled",
    "fulfilledAt": "2025-01-29T14:30:00Z"
  }
}
```

**Side Effects:**
- Notifies all pending matches
- Cancels pending invitations
- Updates donor response rates

---

### 3.6 Notify Donors

**Endpoint:** `POST /api/v1/requests/{publicId}/notify`

**Description:** Manually triggers donor notifications for a request. Auto-triggered on creation for urgent/critical requests.

**Authentication:** Required (must be request creator or admin)

**Request Body:**
```json
{
  "searchRadius": 20,  // km (optional, default from request)
  "force": false       // Re-notify already notified donors
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Donor notification triggered",
  "data": {
    "candidatesEvaluated": 245,
    "matchesGenerated": 15,
    "notificationsSent": 15,
    "estimatedReachTime": "5 minutes"
  }
}
```

**Side Effects:**
- Runs matching algorithm
- Creates match records
- Sends push/SMS/email notifications

---

## 4. Matching & Response Endpoints

### 4.1 Get Matches for Request

**Endpoint:** `GET /api/v1/requests/{publicId}/matches`

**Description:** Lists all matches for a blood request (creator only).

**Authentication:** Required (must be request creator or admin)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "matches": [
      {
        "id": "950e8400-e29b-41d4-a716-446655440000",
        "donor": {
          "id": "650e8400-e29b-41d4-a716-446655440000",
          "bloodType": "O+",
          "totalDonations": 5,
          "responseRate": 87.5
          // Name/phone redacted unless donor accepted
        },
        "matchScore": 92.5,
        "distance": 3.2,
        "status": "accepted",
        "notifiedAt": "2025-01-29T12:31:00Z",
        "acceptedAt": "2025-01-29T12:35:00Z"
      }
    ],
    "summary": {
      "total": 15,
      "pending": 10,
      "accepted": 3,
      "declined": 2
    }
  }
}
```

---

### 4.2 Respond to Match (Donor)

**Endpoint:** `POST /api/v1/responses/{token}`

**Description:** Allows a donor to accept/decline a match using a secure token from notification.

**Authentication:** Optional (token-based)

**Request Body:**
```json
{
  "action": "accept",  // or "decline"
  "declineReason": "Recently donated",  // Required if declining
  "notes": "Available today after 3 PM"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Response recorded successfully",
  "data": {
    "matchId": "950e8400-e29b-41d4-a716-446655440000",
    "status": "accepted",
    "respondedAt": "2025-01-29T12:35:00Z",
    "requester": {
      "contactName": "Ram Kumar Sharma",
      "contactPhone": "+9779812345678",
      "hospital": "Bir Hospital"
    }
  }
}
```

**Side Effects:**
- Notifies requester of acceptance
- Updates match status
- Updates donor response metrics
- If accepted, shares requester contact info with donor

**Errors:**
- `400 Bad Request` - Invalid token or expired
- `409 Conflict` - Already responded

---

## 5. Availability Endpoints

### 5.1 Update Availability

**Endpoint:** `PATCH /api/v1/availability`

**Description:** Updates donor's availability status.

**Authentication:** Required

**Request Body:**
```json
{
  "availabilityStatus": "not_available",  // available, not_available, recently_donated, temporarily_unavailable
  "reason": "Traveling abroad",
  "unavailableUntil": "2025-02-15T00:00:00Z"  // Optional
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Availability updated successfully",
  "data": {
    "availabilityStatus": "not_available",
    "updatedAt": "2025-01-29T12:30:00Z"
  }
}
```

**Side Effects:**
- Excludes donor from future matching
- Cancels pending matches (if any)

---

## 6. Organization & Inventory Endpoints

### 6.1 Get Hospital Inventory

**Endpoint:** `GET /api/v1/orgs/{slug}/inventory`

**Description:** Retrieves blood inventory for a hospital/blood bank.

**Authentication:** Optional (public data)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "organization": {
      "id": "750e8400-e29b-41d4-a716-446655440000",
      "name": "Bir Hospital Blood Bank",
      "slug": "bir-hospital"
    },
    "inventory": [
      {
        "bloodType": "O+",
        "component": "whole_blood",
        "unitsAvailable": 15,
        "status": "adequate",
        "lastUpdated": "2025-01-29T11:00:00Z"
      },
      {
        "bloodType": "AB-",
        "component": "whole_blood",
        "unitsAvailable": 1,
        "status": "critical",
        "lastUpdated": "2025-01-29T11:00:00Z"
      }
    ],
    "lastUpdated": "2025-01-29T11:00:00Z"
  }
}
```

---

### 6.2 Update Inventory (Hospital Staff)

**Endpoint:** `PATCH /api/v1/orgs/{slug}/inventory`

**Description:** Updates blood inventory levels.

**Authentication:** Required (role: hospital_staff, organization admin)

**Request Body:**
```json
{
  "items": [
    {
      "bloodType": "O+",
      "component": "whole_blood",
      "unitsAvailable": 18,
      "unitsExpiringSoon": 2
    }
  ]
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Inventory updated successfully",
  "data": { /* updated inventory */ }
}
```

**Side Effects:**
- Triggers low-stock alerts if below threshold
- Notifies nearby donors if critical

---

## 7. Admin Endpoints

### 7.1 Manage Abuse Reports

**Endpoint:** `GET /api/v1/admin/abuse`

**Description:** Lists abuse reports for moderation.

**Authentication:** Required (role: admin)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "reports": [
      {
        "id": "a50e8400-e29b-41d4-a716-446655440000",
        "type": "spam",
        "reportedEntity": "blood_request",
        "reportedEntityId": "850e8400-e29b-41d4-a716-446655440000",
        "reportedBy": { "id": "...", "fullName": "..." },
        "reason": "Fake blood request for money",
        "status": "pending",
        "createdAt": "2025-01-29T10:00:00Z"
      }
    ]
  }
}
```

---

### 7.2 Resolve Abuse Report

**Endpoint:** `PATCH /api/v1/admin/abuse/{id}`

**Description:** Takes action on an abuse report.

**Authentication:** Required (role: admin)

**Request Body:**
```json
{
  "action": "suspend",  // approve, suspend, delete, dismiss
  "notes": "Verified as spam, user suspended"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Abuse report resolved",
  "data": { /* updated report */ }
}
```

**Side Effects:**
- If action=suspend: Suspends reported user
- If action=delete: Soft deletes reported content
- Notifies reporter of outcome

---

### 7.3 Verify Organization

**Endpoint:** `POST /api/v1/admin/orgs/{id}/verification`

**Description:** Approves or rejects an organization verification request.

**Authentication:** Required (role: admin)

**Request Body:**
```json
{
  "status": "verified",  // verified, rejected
  "notes": "Documents verified, license valid"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Organization verification updated",
  "data": { /* organization */ }
}
```

---

## 8. Webhook Endpoints

### 8.1 SMS Delivery Status

**Endpoint:** `POST /api/webhooks/sms`

**Description:** Receives SMS delivery status from SMS gateway (e.g., Twilio, Sparrow SMS).

**Authentication:** Webhook signature verification

**Request Body:** (Twilio format)
```json
{
  "MessageSid": "SM1234567890abcdef",
  "MessageStatus": "delivered",  // queued, sent, delivered, failed
  "To": "+9779876543210",
  "From": "+9779999999999"
}
```

**Response:** `200 OK`
```json
{
  "success": true
}
```

**Side Effects:**
- Updates notification delivery status
- Retries if failed
- Logs delivery metrics

---

### 8.2 WhatsApp Message Status

**Endpoint:** `POST /api/webhooks/whatsapp`

**Description:** Receives WhatsApp message status (planned).

**Authentication:** Meta webhook verification

**Response:** `200 OK`

---

## 9. Utility Endpoints

### 9.1 Health Check

**Endpoint:** `GET /api/health`

**Description:** Service health check for monitoring.

**Response:** `200 OK`
```json
{
  "status": "healthy",
  "timestamp": "2025-01-29T12:30:00Z",
  "version": "1.0.0",
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "sms": "healthy"
  }
}
```

---

### 9.2 Internal Outbox Processor

**Endpoint:** `POST /api/internal/outbox`

**Description:** Background job processor for transactional outbox pattern.

**Authentication:** Internal only (localhost or cron token)

**Response:** `200 OK`
```json
{
  "success": true,
  "processed": 15,
  "failed": 0
}
```

---

## 10. Response Formats

### 10.1 Success Response

```json
{
  "success": true,
  "message": "Operation completed successfully",  // Optional
  "data": { /* response data */ }
}
```

---

### 10.2 Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid blood type provided",
    "details": [
      {
        "field": "bloodType",
        "message": "Must be one of: A+, A-, B+, B-, AB+, AB-, O+, O-"
      }
    ]
  }
}
```

**Error Codes:**
- `VALIDATION_ERROR` - Input validation failed
- `AUTHENTICATION_ERROR` - Not authenticated or invalid token
- `AUTHORIZATION_ERROR` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `CONFLICT` - Resource already exists or state conflict
- `RATE_LIMIT_ERROR` - Too many requests
- `INTERNAL_ERROR` - Server error

---

## 11. HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET, PATCH, DELETE |
| 201 | Created | Successful POST (resource created) |
| 400 | Bad Request | Validation error, malformed request |
| 401 | Unauthorized | Not authenticated (missing/invalid token) |
| 403 | Forbidden | Authenticated but insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource already exists, state conflict |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server error |
| 503 | Service Unavailable | Maintenance mode or dependency down |

---

## 12. Rate Limiting

**Default Limits:**
- Authenticated: 100 requests/minute
- Unauthenticated: 20 requests/minute
- OTP requests: 3 requests/10 minutes per identifier

**Headers:**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1706528400
```

**Rate Limit Response:** `429 Too Many Requests`
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_ERROR",
    "message": "Too many requests. Please try again later.",
    "retryAfter": 60  // seconds
  }
}
```

---

## 13. Pagination

**Query Parameters:**
```
?limit=50     // Max 100
&offset=0     // Page offset
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "items": [ /* array of items */ ],
    "pagination": {
      "total": 245,
      "limit": 50,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

---

## 14. Filtering & Sorting

**Common Filters:**
```
?bloodType=O+
&districtId=uuid
&status=open
&urgency=critical
&createdAfter=2025-01-01T00:00:00Z
```

**Sorting:**
```
?sortBy=createdAt      // Field to sort by
&sortOrder=desc        // asc or desc
```

---

## 15. CORS Policy

**Allowed Origins:**
- Production: `https://raktadaan.org`, `https://www.raktadaan.org`
- Development: `http://localhost:3000`, `http://localhost:3001`

**Allowed Methods:** `GET, POST, PATCH, DELETE, OPTIONS`

**Allowed Headers:** `Content-Type, Authorization, X-Request-ID`

**Credentials:** `true` (cookies allowed)

---

## 16. Security

### 16.1 Authentication Header

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### 16.2 HTTPS Required

All production API requests must use HTTPS. HTTP requests are redirected to HTTPS.

---

### 16.3 Request ID

Every request is assigned a unique ID for tracing:

```http
X-Request-ID: 550e8400-e29b-41d4-a716-446655440000
```

Returned in response headers for debugging.

---

## 17. Webhook Security

### 17.1 Signature Verification

Webhooks include a signature header for verification:

```http
X-Webhook-Signature: sha256=abcdef123456...
```

**Verification:**
```typescript
const signature = crypto
  .createHmac('sha256', process.env.WEBHOOK_SECRET!)
  .update(requestBody)
  .digest('hex');

if (signature !== receivedSignature) {
  throw new Error('Invalid webhook signature');
}
```

---

## 18. Planned Endpoints (Phase 1)

### 18.1 Live Location

```
POST /api/v1/matches/{id}/location/start    - Start location sharing
POST /api/v1/matches/{id}/location/update   - Update GPS coordinates
POST /api/v1/matches/{id}/location/stop     - Stop location sharing
GET  /api/v1/matches/{id}/location/stream   - SSE stream for live tracking
```

---

### 18.2 Advanced Matching

```
POST /api/v1/requests/{id}/rematch          - Re-run matching algorithm
GET  /api/v1/requests/{id}/matching-logs    - View algorithm execution logs
```

---

### 18.3 Gamification

```
GET  /api/v1/donors/me/badges               - Get earned badges
GET  /api/v1/donors/me/leaderboard          - Leaderboard position
```

---

### 18.4 Analytics

```
GET  /api/v1/analytics/dashboard            - Admin dashboard stats
GET  /api/v1/analytics/impact               - Platform impact metrics
```

---

## 19. Testing

### 19.1 Test Credentials

**Development Environment:**
```
Phone: +9779800000001 (OTP: 123456)
Role: Donor

Phone: +9779800000002 (OTP: 123456)
Role: Admin
```

---

### 19.2 Postman Collection

Available at: `docs/postman/rakta-daan-api.json`

---

## 20. Changelog

### v1.0.0 (2025-01-29)
- Initial API specification
- Core endpoints: Auth, Donors, Requests, Matches
- Rate limiting and error handling
- Webhook support for SMS delivery

### Planned v1.1.0
- Live location tracking endpoints
- Advanced matching parameters
- Gamification endpoints
- WhatsApp integration

---

## 21. Support

**API Documentation:** https://docs.raktadaan.org/api  
**Status Page:** https://status.raktadaan.org  
**Support Email:** api@raktadaan.org  
**Discord:** https://discord.gg/raktadaan

---

*Document prepared as part of Phase 0 project audit per master prompt requirements.*
