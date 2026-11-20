# API Integration Guide for Backend Teams

**Purpose:** Specification for what the frontend expects from the backend API.

**Audience:** Backend engineers, full-stack developers, API designers.

**Status:** Ready for backend implementation; all contracts documented.

---

## Overview

The frontend communicates with the backend through a single API service layer: `src/services/api.ts`.

**Current state:** All calls are mocked for demonstration purposes.

**Next phase:** Swap mock implementations to real API calls by updating `src/services/api.ts`.

---

## How to Integrate

### Step 1: Update Environment Variables

Add your API endpoint to `.env.local`:

```bash
# Before integration
NEXT_PUBLIC_API_MODE=mock

# After backend is ready
NEXT_PUBLIC_API_MODE=real
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
# OR for production:
NEXT_PUBLIC_API_URL=https://api.rakta-daan.np/api/v1
```

### Step 2: Implement Backend Endpoints

Refer to the endpoint specifications below. Each endpoint documents:
- Request method and path
- Query parameters
- Request body (if applicable)
- Response schema (with example)
- Error responses
- Status codes

### Step 3: Update `src/services/api.ts`

Replace mock implementations with real fetch calls:

```typescript
// BEFORE (mock):
export const searchBlood = (query) => {
  return Promise.resolve(mockData.facilities);
};

// AFTER (real):
export const searchBlood = async (query) => {
  const response = await fetch(`${API_URL}/search/blood?blood_group=${query.blood_group}`);
  if (!response.ok) throw new Error(response.statusText);
  return response.json();
};
```

### Step 4: Test

```bash
# Run the integration tests
pnpm test

# Run e2e tests against your backend
NEXT_PUBLIC_API_MODE=real E2E_BASE_URL=http://localhost:3000 pnpm test:e2e

# Run smoke tests
SMOKE_BASE_URL=http://localhost:3000 pnpm smoke
```

---

## API Endpoints Specification

### 1. Blood Search

Search for blood banks and donors matching a blood group and location.

**Endpoint:** `GET /api/v1/search/blood`

**Query Parameters:**

| Parameter | Type | Required | Example | Notes |
|---|---|---|---|---|
| `blood_group` | string | Yes | `"O+"` | One of: A+, A-, B+, B-, AB+, AB-, O+, O- |
| `component` | string | Yes | `"whole_blood"` | One of: whole_blood, rbc, platelets, plasma |
| `quantity` | integer | Yes | `2` | Units required |
| `latitude` | number | No | `27.7172` | Requester's latitude (for distance calculation) |
| `longitude` | number | No | `85.3240` | Requester's longitude |
| `radius_km` | integer | No | `20` | Search radius in kilometers (default: 20) |
| `district` | string | No | `"Kathmandu"` | If no GPS coordinates provided |

**Response:**

```json
{
  "success": true,
  "data": {
    "facilities": [
      {
        "id": "fac_12345",
        "name": "Kathmandu Red Cross Blood Bank",
        "type": "blood_bank",
        "address": "Kalimati, Kathmandu",
        "phone": "+977-1-4248849",
        "district": "Kathmandu",
        "latitude": 27.7095,
        "longitude": 85.2864,
        "distance_km": 2.3,
        "verified": true,
        "stock": {
          "blood_group": "O+",
          "component": "whole_blood",
          "units": 5,
          "updated_at": "2026-10-30T08:30:00Z",
          "freshness_minutes": 30
        },
        "services": ["whole_blood", "rbc", "platelets"],
        "hours": "9:00-17:00",
        "contact_available": ["phone", "whatsapp"]
      }
    ],
    "donors": [
      {
        "id": "don_67890",
        "blood_group": "O+",
        "district": "Kathmandu",
        "distance_km": 5.2,
        "verified": true,
        "availability": "available",
        "contact_channels": ["phone", "whatsapp"],
        "last_donation_date": "2026-10-15",
        "eligibility_status": "requires_review"
      }
    ],
    "search_query": {
      "blood_group": "O+",
      "component": "whole_blood",
      "location": "Kathmandu",
      "radius_km": 20
    }
  }
}
```

**Error Responses:**

```json
// 400 Bad Request
{
  "success": false,
  "error": {
    "code": "invalid_blood_group",
    "message": "Blood group must be one of: A+, A-, B+, B-, AB+, AB-, O+, O-"
  }
}

// 500 Server Error
{
  "success": false,
  "error": {
    "code": "database_error",
    "message": "Failed to query facilities. Please try again."
  }
}
```

**Status Codes:**
- `200` — Search successful (results may be empty)
- `400` — Invalid parameters
- `401` — Unauthorized (not needed for public search)
- `500` — Server error

---

### 2. Get Facility Details

Get detailed information about a specific blood bank or hospital.

**Endpoint:** `GET /api/v1/facilities/:facility_id`

**Path Parameters:**

| Parameter | Type | Example |
|---|---|---|
| `facility_id` | string | `"fac_12345"` |

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "fac_12345",
    "name": "Kathmandu Red Cross Blood Bank",
    "type": "blood_bank",
    "description": "Part of Nepal Red Cross Society. Provides all blood components.",
    "address": "Kalimati, Kathmandu",
    "phone": "+977-1-4248849",
    "email": "info@nrcs.org",
    "website": "https://nrcs.org",
    "latitude": 27.7095,
    "longitude": 85.2864,
    "district": "Kathmandu",
    "municipality": "Kathmandu Metropolitan City",
    "verified": true,
    "verification_date": "2026-01-15",
    "hours": {
      "monday_friday": "9:00-17:00",
      "saturday": "9:00-14:00",
      "sunday": "closed",
      "note": "Closed on national holidays"
    },
    "services": [
      {
        "type": "whole_blood",
        "available": true,
        "description": "Whole blood donation and transfusion"
      },
      {
        "type": "rbc",
        "available": true,
        "description": "Red blood cell concentrate"
      },
      {
        "type": "platelets",
        "available": true,
        "description": "Platelet concentrate"
      }
    ],
    "current_stock": [
      {
        "blood_group": "O+",
        "component": "whole_blood",
        "units": 5,
        "updated_at": "2026-10-30T08:30:00Z"
      },
      {
        "blood_group": "O+",
        "component": "rbc",
        "units": 12,
        "updated_at": "2026-10-30T08:30:00Z"
      }
    ],
    "staff_contact": {
      "name": "Dr. Ramesh Sharma",
      "phone": "+977-1-4248849",
      "role": "Blood Bank Manager",
      "available": "Yes (now open)"
    }
  }
}
```

**Status Codes:**
- `200` — Facility found
- `404` — Facility not found
- `500` — Server error

---

### 3. Create Blood Request

Create a new blood request (emergency search).

**Endpoint:** `POST /api/v1/requests`

**Authentication:** None required (public endpoint)

**Request Body:**

```json
{
  "patient_reference": "John D.",
  "blood_group": "A+",
  "component": "whole_blood",
  "quantity": 2,
  "urgency": "urgent",
  "hospital_id": "fac_12345",
  "hospital_name": "Tribhuvan University Teaching Hospital",
  "address": "Maharajgunj, Kathmandu",
  "latitude": 27.7262,
  "longitude": 85.3192,
  "requester_name": "Mary Doe",
  "requester_phone": "+977-9841234567",
  "requester_email": "mary@example.com",
  "required_by": "2026-10-30T14:00:00Z",
  "notes": "For emergency surgery",
  "consent_to_share": true
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "req_99999",
    "public_id": "RAKTA-ABC123",
    "patient_reference": "John D.",
    "blood_group": "A+",
    "component": "whole_blood",
    "quantity": 2,
    "quantity_remaining": 2,
    "urgency": "urgent",
    "hospital": {
      "id": "fac_12345",
      "name": "Tribhuvan University Teaching Hospital"
    },
    "requester": {
      "name": "Mary Doe",
      "phone_verified": false
    },
    "status": "active",
    "created_at": "2026-10-30T10:15:00Z",
    "expires_at": "2026-10-31T10:15:00Z",
    "commitment_count": 0,
    "confirmation_count": 0
  }
}
```

**Error Responses:**

```json
// 400 Bad Request
{
  "success": false,
  "error": {
    "code": "invalid_request",
    "message": "Required field 'blood_group' is missing"
  }
}

// 429 Too Many Requests
{
  "success": false,
  "error": {
    "code": "rate_limited",
    "message": "Too many requests. Please try again in 60 seconds."
  }
}
```

**Status Codes:**
- `201` — Request created
- `400` — Invalid request
- `429` — Rate limited (implement this!)
- `500` — Server error

---

### 4. Get Request Status

Get the current status of a blood request.

**Endpoint:** `GET /api/v1/requests/:request_id`

**Path Parameters:**

| Parameter | Type | Example |
|---|---|---|
| `request_id` | string | `"req_99999"` or `"RAKTA-ABC123"` (public ID) |

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "req_99999",
    "public_id": "RAKTA-ABC123",
    "patient_reference": "John D.",
    "blood_group": "A+",
    "component": "whole_blood",
    "quantity_required": 2,
    "quantity_committed": 1,
    "quantity_confirmed": 0,
    "status": "active",
    "urgency": "urgent",
    "hospital": {
      "name": "Tribhuvan University Teaching Hospital",
      "phone": "+977-1-4110000"
    },
    "created_at": "2026-10-30T10:15:00Z",
    "updated_at": "2026-10-30T10:45:00Z",
    "expires_at": "2026-10-31T10:15:00Z",
    "commitments": [
      {
        "donor_id": "don_67890",
        "status": "agreed",
        "units": 1,
        "contacted_at": "2026-10-30T10:30:00Z",
        "agreed_at": "2026-10-30T10:35:00Z",
        "contact_channel": "whatsapp"
      }
    ],
    "last_activity": "Donor agreed to help (1 unit)",
    "requester_actions": [
      {
        "action": "edit",
        "available": true,
        "href": "/request/req_99999/edit"
      },
      {
        "action": "cancel",
        "available": true,
        "href": "/request/req_99999/cancel"
      },
      {
        "action": "close",
        "available": false,
        "reason": "At least one donor must confirm"
      }
    ]
  }
}
```

**Status Codes:**
- `200` — Request found
- `404` — Request not found (or expired and purged)
- `500` — Server error

---

### 5. Update Request Status

Update a request (edit, cancel, or close).

**Endpoint:** `PATCH /api/v1/requests/:request_id`

**Authentication:** Requester must provide OTP or session token (implement this!)

**Request Body:**

```json
{
  "action": "cancel",
  "reason": "Found blood elsewhere"
}
```

Or:

```json
{
  "action": "edit",
  "quantity": 3,
  "notes": "Updated after surgery plans changed"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "req_99999",
    "status": "cancelled",
    "updated_at": "2026-10-30T11:00:00Z",
    "message": "Request has been cancelled"
  }
}
```

**Status Codes:**
- `200` — Request updated
- `400` — Invalid action
- `401` — Unauthorized
- `404` — Request not found
- `500` — Server error

---

### 6. Donor Registration

Register a new blood donor.

**Endpoint:** `POST /api/v1/donors`

**Request Body:**

```json
{
  "name": "Ramesh Shrestha",
  "phone": "+977-9841234567",
  "email": "ramesh@example.com",
  "blood_group": "O+",
  "district": "Kathmandu",
  "municipality": "Kathmandu Metropolitan City",
  "availability": "available",
  "contact_channels": ["phone", "whatsapp"],
  "consent_to_be_contacted": true,
  "consent_to_share_location": false,
  "terms_accepted": true
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "don_new123",
    "name": "Ramesh Shrestha",
    "phone": "+977-9841234567",
    "blood_group": "O+",
    "district": "Kathmandu",
    "availability": "available",
    "contact_channels": ["phone", "whatsapp"],
    "verified": false,
    "created_at": "2026-10-30T10:00:00Z",
    "verification_token": "verify_abc123xyz"
  }
}
```

**Status Codes:**
- `201` — Donor registered
- `400` — Invalid data
- `409` — Donor already exists (phone already registered)
- `500` — Server error

---

### 7. Get Facilities (Directory)

Get a list of blood banks and hospitals.

**Endpoint:** `GET /api/v1/facilities`

**Query Parameters:**

| Parameter | Type | Example | Notes |
|---|---|---|---|
| `district` | string | `"Kathmandu"` | Filter by district |
| `type` | string | `"blood_bank"` | One of: blood_bank, hospital, clinic |
| `verified_only` | boolean | `true` | Only show verified facilities |
| `latitude` | number | `27.7172` | For distance sorting |
| `longitude` | number | `85.3240` |  |
| `page` | integer | `1` | Pagination (default: 1) |
| `limit` | integer | `20` | Results per page (default: 20, max: 100) |

**Response:**

```json
{
  "success": true,
  "data": {
    "facilities": [
      {
        "id": "fac_12345",
        "name": "Kathmandu Red Cross Blood Bank",
        "type": "blood_bank",
        "address": "Kalimati, Kathmandu",
        "district": "Kathmandu",
        "phone": "+977-1-4248849",
        "verified": true,
        "distance_km": 2.3
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "pages": 3
    }
  }
}
```

**Status Codes:**
- `200` — Success
- `400` — Invalid parameters
- `500` — Server error

---

### 8. Get Camps (Events)

Get a list of blood donation camps.

**Endpoint:** `GET /api/v1/camps`

**Query Parameters:**

| Parameter | Type | Example |
|---|---|---|
| `district` | string | `"Kathmandu"` |
| `start_date` | string | `"2026-11-01"` (ISO 8601) |
| `end_date` | string | `"2026-11-30"` |
| `upcoming_only` | boolean | `true` |

**Response:**

```json
{
  "success": true,
  "data": {
    "camps": [
      {
        "id": "camp_123",
        "name": "Monthly Blood Drive - Kathmandu",
        "organiser": "Nepal Red Cross",
        "date": "2026-11-05",
        "start_time": "09:00",
        "end_time": "17:00",
        "venue": "Tundikhel, Kathmandu",
        "district": "Kathmandu",
        "description": "Monthly voluntary blood donation drive",
        "contact_phone": "+977-1-4248849",
        "registration_available": true
      }
    ]
  }
}
```

**Status Codes:**
- `200` — Success
- `400` — Invalid parameters
- `500` — Server error

---

## Error Handling

All error responses follow this format:

```json
{
  "success": false,
  "error": {
    "code": "error_code",
    "message": "Human-readable error message",
    "details": {
      "field": "additional context if applicable"
    }
  }
}
```

**Common error codes:**

| Code | HTTP | Meaning |
|---|---|---|
| `invalid_request` | 400 | Request validation failed |
| `not_found` | 404 | Resource not found |
| `unauthorized` | 401 | Authentication required |
| `forbidden` | 403 | Not authorized to access |
| `rate_limited` | 429 | Too many requests |
| `database_error` | 500 | Database query failed |
| `server_error` | 500 | Unexpected server error |

---

## Authentication

**Current phase:** Most endpoints are public (no auth required).

**Future phase:** Secure endpoints with:

1. **OTP for requesters:**
   - `POST /api/v1/auth/otp` → Send OTP to phone
   - `POST /api/v1/auth/verify` → Verify OTP, get session token

2. **Token-based auth:**
   - Session tokens (JWT or opaque tokens)
   - Refresh token rotation
   - CSRF protection on state-changing operations

---

## Rate Limiting

**Recommended limits:**

| Endpoint | Limit | Window |
|---|---|---|
| Blood search | 100 requests | Per hour, per IP |
| Request creation | 10 requests | Per hour, per IP |
| Any authenticated endpoint | 1000 requests | Per hour, per user |

**Response headers:**

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1604059200
```

---

## Testing Your API

### Manual Testing

```bash
# Test blood search
curl "http://localhost:8000/api/v1/search/blood?blood_group=O%2B&component=whole_blood&quantity=2&district=Kathmandu"

# Test facility details
curl "http://localhost:8000/api/v1/facilities/fac_12345"

# Test request creation
curl -X POST "http://localhost:8000/api/v1/requests" \
  -H "Content-Type: application/json" \
  -d '{
    "patient_reference": "John D.",
    "blood_group": "A+",
    "component": "whole_blood",
    "quantity": 2,
    "hospital_name": "Hospital XYZ",
    "requester_name": "Mary",
    "requester_phone": "+977-9841234567",
    "consent_to_share": true
  }'
```

### Automated Testing

The frontend has integration tests ready:

```bash
# Install and run integration tests
pnpm test

# Run e2e tests against your backend
NEXT_PUBLIC_API_MODE=real E2E_BASE_URL=http://localhost:3000 pnpm test:e2e

# Run smoke tests
SMOKE_BASE_URL=http://localhost:3000 pnpm smoke
```

---

## CORS and Headers

**CORS headers to return:**

```
Access-Control-Allow-Origin: https://rakta-daan.np (or * in development)
Access-Control-Allow-Methods: GET, POST, PATCH, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
```

**Security headers recommended:**

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

---

## Performance Expectations

**Target response times (p95):**

- Search endpoints: < 500ms
- Facility details: < 200ms
- Request creation: < 500ms
- List endpoints (camps, facilities): < 300ms (for 20 results)

**Optimization tips:**

1. Index on `blood_group`, `district`, `latitude`, `longitude`
2. Cache facility listings (change infrequently)
3. Cache camp listings (query by date range)
4. Use database connection pooling
5. Implement query result pagination (max 100 items per request)

---

## Deployment and Environment-Specific URLs

**Development:**
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

**Staging:**
```
NEXT_PUBLIC_API_URL=https://staging-api.rakta-daan.local/api/v1
```

**Production:**
```
NEXT_PUBLIC_API_URL=https://api.rakta-daan.np/api/v1
```

Update `src/services/api.ts` to read from the environment variable:

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
```

---

## Next Steps

1. **Implement the endpoints** above (or subset in priority order)
2. **Test manually** with curl or Postman
3. **Run integration tests** against your implementation
4. **Update environment variables** in the frontend
5. **Run e2e tests** to verify the full workflow

**Questions?** Refer to `docs/frontend/backend-integration-contract.md` for the original contract, or check `src/services/api.ts` to see the current mock implementations.

---

**Last updated:** 30 October 2026  
**Maintained by:** Frontend team  
**Next review:** After backend API implementation
