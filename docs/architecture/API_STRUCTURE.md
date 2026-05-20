# API Structure — Multi-Tenant Construction SaaS

## Table of Contents
1. [Base URL Patterns](#1-base-url-patterns)
2. [Response Envelope Format](#2-response-envelope-format)
3. [Error Code Taxonomy](#3-error-code-taxonomy)
4. [Auth Endpoints](#4-auth-endpoints)
5. [Tenant Management Endpoints](#5-tenant-management-endpoints)
6. [Website Management Endpoints](#6-website-management-endpoints)
7. [Projects API](#7-projects-api)
8. [Leads API](#8-leads-api)
9. [Analytics API](#9-analytics-api)
10. [Blog API](#10-blog-api)
11. [Media API](#11-media-api)
12. [AI & Automation API](#12-ai--automation-api)
13. [Webhook Endpoints](#13-webhook-endpoints)
14. [Rate Limiting Rules](#14-rate-limiting-rules)

---

## 1. Base URL Patterns

```
Production:
  API Base:       https://buildpro.com/api/v1
  Admin API:      https://admin.buildpro.com/api/v1
  AI Service:     https://ai.internal.buildpro.com (VPC-only, not public)

Tenant Microsite Public API (read-only, public):
  https://{tenant}.buildpro.com/api/public
  https://{custom-domain}/api/public

Staging:
  https://staging.buildpro.com/api/v1

Development:
  http://localhost:3000/api/v1
```

### URL Structure Convention

```
/api/v1/{resource}                          # Collection operations (GET list, POST create)
/api/v1/{resource}/{id}                     # Item operations (GET, PATCH, DELETE)
/api/v1/{resource}/{id}/{sub-resource}      # Nested resource collections
/api/v1/{resource}/{id}/{sub-resource}/{id2} # Nested resource items
/api/v1/admin/{resource}                    # SuperAdmin cross-tenant operations
/api/public/{resource}                      # Unauthenticated public endpoints (tenant-scoped via host)
```

---

## 2. Response Envelope Format

All API responses use a consistent JSON envelope:

### Success Response (2xx)

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "requestId": "req_01HK...",
    "timestamp": "2025-01-15T10:30:00Z",
    "version": "1.0"
  }
}
```

### Paginated List Response

```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "perPage": 20,
    "total": 143,
    "totalPages": 8,
    "hasNextPage": true,
    "hasPreviousPage": false,
    "cursor": "eyJpZCI6InV1aWQifQ=="
  },
  "meta": {
    "requestId": "req_01HK...",
    "timestamp": "2025-01-15T10:30:00Z"
  }
}
```

### Error Response (4xx, 5xx)

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "One or more fields are invalid.",
    "details": [
      {
        "field": "email",
        "code": "INVALID_EMAIL",
        "message": "Must be a valid email address."
      }
    ]
  },
  "meta": {
    "requestId": "req_01HK...",
    "timestamp": "2025-01-15T10:30:00Z"
  }
}
```

---

## 3. Error Code Taxonomy

| HTTP Status | Error Code                   | Description                                               |
|-------------|------------------------------|-----------------------------------------------------------|
| 400         | `VALIDATION_ERROR`           | Request body failed Zod schema validation                 |
| 400         | `INVALID_QUERY_PARAMS`       | Query parameters invalid or missing                       |
| 400         | `MALFORMED_JSON`             | Request body is not valid JSON                            |
| 401         | `UNAUTHENTICATED`            | Missing or invalid authentication token                   |
| 401         | `JWT_EXPIRED`                | Clerk JWT has expired                                     |
| 401         | `INVALID_API_KEY`            | API key not found, revoked, or expired                    |
| 403         | `FORBIDDEN`                  | Authenticated but insufficient permissions                |
| 403         | `TENANT_MISMATCH`            | Resource does not belong to authenticated tenant          |
| 403         | `FEATURE_NOT_AVAILABLE`      | Feature not included in current subscription plan        |
| 404         | `NOT_FOUND`                  | Resource not found (or hidden due to RLS)                 |
| 409         | `CONFLICT`                   | Resource already exists (e.g., duplicate slug)            |
| 409         | `DOMAIN_ALREADY_CLAIMED`     | Custom domain registered to another tenant                |
| 422         | `UNPROCESSABLE_ENTITY`       | Semantically invalid (e.g., end date before start date)  |
| 429         | `RATE_LIMIT_EXCEEDED`        | Too many requests; includes `Retry-After` header          |
| 429         | `PLAN_LIMIT_REACHED`         | Monthly quota exhausted (leads, API calls, storage)       |
| 500         | `INTERNAL_ERROR`             | Unexpected server error                                   |
| 502         | `UPSTREAM_ERROR`             | AI service or external API unavailable                    |
| 503         | `SERVICE_UNAVAILABLE`        | Maintenance mode or overloaded                            |

---

## 4. Auth Endpoints

### Clerk Webhook Handler

```
POST /api/v1/webhooks/clerk
```

Processes Clerk organization and user lifecycle events. Verified via Svix signature header.

**Events handled:**
- `user.created` → Create user record in PostgreSQL
- `user.updated` → Sync user profile changes
- `user.deleted` → Soft-delete user, reassign leads
- `organizationMembership.created` → Sync member role
- `organizationMembership.deleted` → Remove member access
- `organization.created` → Create organization, seed default website/theme
- `session.ended` → Invalidate Redis session cache

```
Headers:
  svix-id: msg_01HK...
  svix-timestamp: 1705312200
  svix-signature: v1,base64sha256=...

Response: 200 OK (always, to acknowledge receipt)
```

### Session Validation

```
GET /api/v1/auth/me
```

Returns the current authenticated user's profile and organization memberships.

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "Jane",
      "lastName": "Doe",
      "avatarUrl": "https://..."
    },
    "memberships": [
      {
        "organizationId": "uuid",
        "organizationName": "Acme Construction",
        "organizationSlug": "acme",
        "role": "OrgAdmin",
        "permissions": ["projects:read", "projects:write", "leads:read"]
      }
    ]
  }
}
```

---

## 5. Tenant Management Endpoints

### Organizations

```
GET    /api/v1/organizations                    # List orgs (SuperAdmin only)
POST   /api/v1/organizations                    # Create org (SuperAdmin only)
GET    /api/v1/organizations/:id                # Get org details
PATCH  /api/v1/organizations/:id                # Update org settings
DELETE /api/v1/organizations/:id                # Suspend/delete org (SuperAdmin only)
GET    /api/v1/organizations/:id/stats          # Org usage stats
POST   /api/v1/organizations/:id/transfer       # Transfer SuperAdmin ownership
```

**POST /api/v1/organizations — Request Body:**
```json
{
  "name": "Riverdale Contracting",
  "slug": "riverdale",
  "primaryEmail": "info@riverdale.com",
  "planId": "uuid",
  "timezone": "America/Chicago"
}
```

### Members

```
GET    /api/v1/organizations/:id/members           # List members
POST   /api/v1/organizations/:id/members/invite    # Invite new member (sends email)
PATCH  /api/v1/organizations/:id/members/:userId   # Update member role
DELETE /api/v1/organizations/:id/members/:userId   # Remove member
GET    /api/v1/organizations/:id/members/invitations # List pending invitations
DELETE /api/v1/organizations/:id/members/invitations/:invId # Cancel invitation
```

**POST /api/v1/organizations/:id/members/invite — Request Body:**
```json
{
  "email": "editor@example.com",
  "roleId": "uuid",
  "message": "Welcome to our construction platform!"
}
```

### Roles & Permissions

```
GET    /api/v1/organizations/:id/roles             # List roles (system + custom)
POST   /api/v1/organizations/:id/roles             # Create custom role
PATCH  /api/v1/organizations/:id/roles/:roleId     # Update custom role
DELETE /api/v1/organizations/:id/roles/:roleId     # Delete custom role
GET    /api/v1/permissions                          # List all available permissions
```

### Subscription & Billing

```
GET    /api/v1/organizations/:id/subscription      # Get current subscription
POST   /api/v1/organizations/:id/subscription/upgrade  # Upgrade plan
POST   /api/v1/organizations/:id/subscription/cancel   # Cancel subscription
GET    /api/v1/organizations/:id/subscription/invoices # List invoices
GET    /api/v1/organizations/:id/subscription/usage    # Current usage vs limits
POST   /api/v1/organizations/:id/subscription/portal   # Create Stripe billing portal session
```

---

## 6. Website Management Endpoints

### Website Configuration

```
GET    /api/v1/websites                            # Get current org's website
POST   /api/v1/websites                            # Create website (one per org)
PATCH  /api/v1/websites/:id                        # Update website settings
GET    /api/v1/websites/:id/preview                # Generate preview URL
POST   /api/v1/websites/:id/publish                # Publish draft changes
POST   /api/v1/websites/:id/domain                 # Set custom domain
DELETE /api/v1/websites/:id/domain                 # Remove custom domain
GET    /api/v1/websites/:id/domain/verify          # Check DNS verification status
POST   /api/v1/websites/:id/domain/reverify        # Re-trigger DNS verification
```

**PATCH /api/v1/websites/:id — Request Body:**
```json
{
  "title": "Riverdale Contracting",
  "tagline": "Building Excellence Since 1995",
  "googleAnalyticsId": "G-XXXXXXXXXX",
  "seoConfigJson": {
    "defaultMetaTitle": "{page_title} | Riverdale Contracting",
    "defaultMetaDescription": "Expert construction services in Chicago.",
    "robotsTxt": "User-agent: *\nAllow: /\nSitemap: https://riverdale.buildpro.com/sitemap.xml"
  }
}
```

### Themes

```
GET    /api/v1/websites/:id/themes                 # List themes for org
POST   /api/v1/websites/:id/themes                 # Create theme
PATCH  /api/v1/websites/:id/themes/:themeId        # Update theme
DELETE /api/v1/websites/:id/themes/:themeId        # Delete theme
POST   /api/v1/websites/:id/themes/:themeId/activate # Set as active theme
```

### Pages

```
GET    /api/v1/websites/:id/pages                  # List pages (nested structure)
POST   /api/v1/websites/:id/pages                  # Create page
GET    /api/v1/websites/:id/pages/:pageId          # Get page with content
PATCH  /api/v1/websites/:id/pages/:pageId          # Update page
DELETE /api/v1/websites/:id/pages/:pageId          # Delete page
POST   /api/v1/websites/:id/pages/:pageId/publish  # Publish page
POST   /api/v1/websites/:id/pages/reorder          # Reorder nav items
```

**POST /api/v1/websites/:id/pages — Request Body:**
```json
{
  "title": "Our Services",
  "slug": "services",
  "pageType": "services",
  "contentJson": {
    "sections": [
      {
        "type": "hero",
        "heading": "Expert Construction Services",
        "subheading": "From residential to commercial, we do it all."
      }
    ]
  },
  "metaTitle": "Construction Services | Riverdale Contracting",
  "metaDescription": "Explore our full range of construction services in Chicago.",
  "showInNav": true
}
```

---

## 7. Projects API

### Project CRUD

```
GET    /api/v1/projects                            # List projects (paginated, filterable)
POST   /api/v1/projects                            # Create project
GET    /api/v1/projects/:id                        # Get project with images
PATCH  /api/v1/projects/:id                        # Update project
DELETE /api/v1/projects/:id                        # Delete project (soft-delete)
POST   /api/v1/projects/:id/publish                # Publish project
POST   /api/v1/projects/:id/archive                # Archive project
POST   /api/v1/projects/:id/feature               # Toggle featured status
```

**GET /api/v1/projects — Query Parameters:**
```
?page=1
&perPage=20
&status=published|draft|archived
&featured=true|false
&projectType=residential|commercial|industrial
&city=Chicago
&search=kitchen+renovation
&sortBy=completionDate|createdAt|title
&sortOrder=asc|desc
&tags[]=modern&tags[]=sustainable
```

**POST /api/v1/projects — Request Body:**
```json
{
  "title": "Riverside Office Complex",
  "slug": "riverside-office-complex",
  "description": "A 12-story commercial office building...",
  "projectType": "commercial",
  "location": "123 River Rd, Chicago, IL 60601",
  "city": "Chicago",
  "state": "IL",
  "country": "US",
  "startDate": "2024-03-01",
  "completionDate": "2024-11-15",
  "budgetCents": 1250000000,
  "squareFootage": 45000,
  "clientName": "Riverside Properties LLC",
  "clientTestimonial": "Exceptional quality and on-time delivery.",
  "clientRating": 5,
  "isFeatured": true,
  "tags": ["commercial", "office", "sustainable"],
  "servicesUsed": ["foundation", "structural", "electrical", "plumbing"],
  "metaTitle": "Riverside Office Complex | Riverdale Contracting",
  "metaDescription": "A landmark 12-story commercial development in Chicago."
}
```

### Project Images

```
GET    /api/v1/projects/:id/images                 # List images (ordered)
POST   /api/v1/projects/:id/images                 # Add image (by asset ID or URL)
PATCH  /api/v1/projects/:id/images/:imageId        # Update caption/alt/order
DELETE /api/v1/projects/:id/images/:imageId        # Remove image
POST   /api/v1/projects/:id/images/reorder         # Reorder images
POST   /api/v1/projects/:id/images/:imageId/cover  # Set as cover image
```

### Public Gallery API (Unauthenticated)

```
GET    /api/public/projects                        # Public project gallery
GET    /api/public/projects/:slug                  # Single project (by slug)
GET    /api/public/projects/featured               # Featured projects only
```

These endpoints respect the tenant context from the request hostname. Cache-Control: `s-maxage=60`.

---

## 8. Leads API

### Lead CRUD

```
GET    /api/v1/leads                               # List leads (paginated, filterable)
POST   /api/v1/leads                               # Create lead manually
GET    /api/v1/leads/:id                           # Get lead with notes and scores
PATCH  /api/v1/leads/:id                           # Update lead
DELETE /api/v1/leads/:id                           # Delete lead (SuperAdmin only)
POST   /api/v1/leads/:id/convert                   # Convert scraped_lead to lead
```

**GET /api/v1/leads — Query Parameters:**
```
?page=1
&perPage=20
&status=new|contacted|qualified|proposal|won|lost
&pipelineStage=inbox|follow-up|proposal|negotiation|closed
&source=form|manual|import|ai_discovery
&assignedTo={userId}
&minScore=50
&search=john+smith
&sortBy=createdAt|score|lastActivityAt
&sortOrder=asc|desc
&tags[]=enterprise&tags[]=referral
&city=Chicago
&dateFrom=2025-01-01
&dateTo=2025-12-31
```

**PATCH /api/v1/leads/:id — Request Body:**
```json
{
  "status": "qualified",
  "pipelineStage": "proposal",
  "assignedToId": "uuid",
  "score": 78,
  "budgetEstimate": "$500k - $1M",
  "timeline": "Q2 2025",
  "tags": ["enterprise", "hot-lead"]
}
```

### Lead Notes

```
GET    /api/v1/leads/:id/notes                     # List notes for a lead
POST   /api/v1/leads/:id/notes                     # Add note
PATCH  /api/v1/leads/:id/notes/:noteId             # Edit note
DELETE /api/v1/leads/:id/notes/:noteId             # Delete note
POST   /api/v1/leads/:id/notes/:noteId/pin         # Pin/unpin note
```

**POST /api/v1/leads/:id/notes — Request Body:**
```json
{
  "noteType": "call",
  "content": "Spoke with John for 20 minutes. He is interested in the Q2 office renovation project. Sending proposal by Friday.",
  "isPinned": false
}
```

### Lead Import & Export

```
POST   /api/v1/leads/import/csv                    # Upload CSV, returns job ID
GET    /api/v1/leads/import/:jobId/status          # Poll import job status
GET    /api/v1/leads/export                        # Export leads to CSV/JSON
POST   /api/v1/leads/bulk-update                   # Bulk status/stage update
DELETE /api/v1/leads/bulk-delete                   # Bulk delete (SuperAdmin)
```

**POST /api/v1/leads/import/csv — Request:**
- `Content-Type: multipart/form-data`
- File: CSV with columns: `first_name, last_name, email, phone, company, source`
- Returns: `{ jobId: "uuid", rowCount: 245 }`

### Lead Scoring

```
POST   /api/v1/leads/:id/score                     # Trigger AI scoring (async)
GET    /api/v1/leads/:id/score                     # Get latest AI score + history
POST   /api/v1/leads/bulk-score                    # Score all unscored leads
```

---

## 9. Analytics API

### Event Ingestion

```
POST   /api/v1/analytics/events                    # Ingest one or more events (SDK)
POST   /api/v1/analytics/events/batch              # Batch ingest (server-side)
```

**POST /api/v1/analytics/events — Request Body:**
```json
{
  "events": [
    {
      "eventType": "page_view",
      "visitorId": "anon_abc123",
      "pageUrl": "https://acme.buildpro.com/projects",
      "pageTitle": "Our Projects",
      "referrerUrl": "https://google.com",
      "utmSource": "google",
      "utmMedium": "organic",
      "deviceType": "mobile",
      "browser": "Chrome",
      "os": "iOS",
      "country": "US",
      "city": "Chicago",
      "sessionId": "uuid",
      "eventDataJson": {}
    }
  ]
}
```

Rate limit: 1000 events per request; 10,000 events per minute per tenant.

### Dashboard Queries

```
GET    /api/v1/analytics/dashboard                 # Overview metrics (configurable date range)
GET    /api/v1/analytics/pageviews                 # Page views timeseries
GET    /api/v1/analytics/sessions                  # Session metrics
GET    /api/v1/analytics/sources                   # Traffic sources breakdown
GET    /api/v1/analytics/pages                     # Top pages by views
GET    /api/v1/analytics/devices                   # Device/browser breakdown
GET    /api/v1/analytics/geography                 # Geographic distribution
GET    /api/v1/analytics/leads/funnel              # Lead conversion funnel
GET    /api/v1/analytics/leads/sources             # Lead sources breakdown
```

**GET /api/v1/analytics/dashboard — Query Parameters:**
```
?from=2025-01-01
&to=2025-01-31
&compare=previous_period      # Compare to prior period
&granularity=day|week|month
```

**Response:**
```json
{
  "data": {
    "totalPageViews": 12450,
    "uniqueVisitors": 3821,
    "avgSessionDuration": 187,
    "bounceRate": 0.42,
    "newLeads": 23,
    "leadConversionRate": 0.006,
    "timeseries": [
      { "date": "2025-01-01", "pageViews": 412, "visitors": 128 }
    ],
    "comparison": {
      "pageViewsChange": 0.15,
      "visitorsChange": 0.08
    }
  }
}
```

---

## 10. Blog API

### Blog Post CRUD

```
GET    /api/v1/blog/posts                          # List posts (paginated)
POST   /api/v1/blog/posts                          # Create post
GET    /api/v1/blog/posts/:id                      # Get post (by ID, admin)
PATCH  /api/v1/blog/posts/:id                      # Update post
DELETE /api/v1/blog/posts/:id                      # Delete post
POST   /api/v1/blog/posts/:id/publish              # Publish post
POST   /api/v1/blog/posts/:id/schedule             # Schedule post for future publish
POST   /api/v1/blog/posts/:id/unpublish            # Unpublish post
POST   /api/v1/blog/posts/:id/duplicate            # Duplicate post as draft
```

**POST /api/v1/blog/posts — Request Body:**
```json
{
  "title": "5 Signs You Need a Roof Replacement",
  "slug": "5-signs-roof-replacement",
  "excerpt": "Don't wait until your roof fails. Here are the warning signs.",
  "categoryId": "uuid",
  "contentJson": {
    "blocks": [
      { "type": "paragraph", "content": "Identifying roof damage early..." }
    ]
  },
  "coverImageUrl": "https://cdn.buildpro.com/.../roof.jpg",
  "tags": ["roofing", "maintenance", "home-improvement"],
  "metaTitle": "5 Signs You Need a Roof Replacement | Riverdale Contracting",
  "metaDescription": "Expert advice on identifying roof damage before it becomes costly.",
  "schemaJson": {
    "@type": "Article",
    "author": { "@type": "Person", "name": "Jane Smith" }
  }
}
```

### Categories

```
GET    /api/v1/blog/categories                     # List categories
POST   /api/v1/blog/categories                     # Create category
PATCH  /api/v1/blog/categories/:id                 # Update category
DELETE /api/v1/blog/categories/:id                 # Delete category
GET    /api/v1/blog/categories/:id/posts           # Posts in category
```

### Public Blog API (Unauthenticated)

```
GET    /api/public/blog/posts                      # Published posts list
GET    /api/public/blog/posts/:slug                # Single post by slug
GET    /api/public/blog/categories                 # All categories
GET    /api/public/blog/categories/:slug/posts     # Posts by category slug
GET    /api/public/blog/tags/:tag/posts            # Posts by tag
GET    /api/public/sitemap                         # Full sitemap data
```

---

## 11. Media API

### S3 Presigned Upload

```
POST   /api/v1/media/upload-url                    # Get presigned S3 PUT URL
GET    /api/v1/media                               # List media assets (paginated)
GET    /api/v1/media/:id                           # Get single asset
PATCH  /api/v1/media/:id                           # Update alt text, tags, folder
DELETE /api/v1/media/:id                           # Delete asset (S3 + DB record)
POST   /api/v1/media/bulk-delete                   # Bulk delete assets
GET    /api/v1/media/folders                       # List folder structure
POST   /api/v1/media/folders                       # Create folder
```

**POST /api/v1/media/upload-url — Request Body:**
```json
{
  "fileName": "project-hero.jpg",
  "mimeType": "image/jpeg",
  "fileSizeBytes": 2048576,
  "folder": "/projects/riverside-office"
}
```

**Response:**
```json
{
  "data": {
    "uploadUrl": "https://s3.amazonaws.com/...?X-Amz-Signature=...",
    "uploadFields": {},
    "assetId": "uuid",
    "s3Key": "tenants/org-uuid/projects/riverside-office/project-hero.jpg",
    "cdnUrl": "https://cdn.buildpro.com/tenants/org-uuid/.../project-hero.jpg",
    "expiresAt": "2025-01-15T10:45:00Z"
  }
}
```

**Client Upload Flow:**
1. Client calls `POST /api/v1/media/upload-url` to get presigned URL
2. Client PUTs file directly to S3 using presigned URL (no server bandwidth used)
3. Client calls `POST /api/v1/media/:id/confirm` to mark upload complete
4. Server triggers Lambda for image optimization (resize, WebP conversion)
5. Asset `cdn_url` becomes available within 5 seconds

```
POST   /api/v1/media/:id/confirm                   # Confirm S3 upload complete
POST   /api/v1/media/:id/optimize                  # Re-trigger image optimization
```

---

## 12. AI & Automation API

### Lead Discovery Jobs

```
POST   /api/v1/ai/lead-discovery                   # Start lead discovery job
GET    /api/v1/ai/lead-discovery                   # List discovery jobs
GET    /api/v1/ai/lead-discovery/:jobId            # Get job status and results
DELETE /api/v1/ai/lead-discovery/:jobId            # Cancel queued job
GET    /api/v1/ai/lead-discovery/:jobId/results    # List scraped leads from job
POST   /api/v1/ai/lead-discovery/:jobId/import/:leadId # Approve and import scraped lead
POST   /api/v1/ai/lead-discovery/:jobId/reject/:leadId # Reject scraped lead
```

**POST /api/v1/ai/lead-discovery — Request Body:**
```json
{
  "jobType": "lead_discovery",
  "targetQuery": "general contractors Chicago IL",
  "targetUrl": "https://linkedin.com/search/...",
  "parameters": {
    "location": "Chicago, IL",
    "industry": "construction",
    "maxResults": 50,
    "sources": ["linkedin", "yelp", "google_maps"]
  }
}
```

### Lead Scoring

```
POST   /api/v1/ai/leads/:id/score                  # Score a single lead
POST   /api/v1/ai/leads/batch-score                # Score multiple leads
GET    /api/v1/ai/leads/:id/scores                 # Score history for a lead
```

**POST /api/v1/ai/leads/:id/score — Response:**
```json
{
  "data": {
    "jobId": "uuid",
    "status": "queued",
    "estimatedCompletionSeconds": 15
  }
}
```

### Email Drafting

```
POST   /api/v1/ai/leads/:id/draft-email            # Generate outreach email draft
GET    /api/v1/ai/leads/:id/emails                 # List generated emails for lead
```

**POST /api/v1/ai/leads/:id/draft-email — Request Body:**
```json
{
  "emailType": "initial_outreach",
  "tone": "professional",
  "context": "They recently posted about a new office building project on LinkedIn.",
  "callToAction": "schedule a 15-minute call"
}
```

### Quote Generation

```
POST   /api/v1/ai/leads/:id/generate-quote         # Generate quote document
GET    /api/v1/ai/leads/:id/quotes                 # List generated quotes
GET    /api/v1/ai/leads/:id/quotes/:quoteId        # Download quote PDF
```

### Chatbot (Tenant Public Chatbot)

```
POST   /api/public/chatbot/message                 # Send message to tenant chatbot
GET    /api/public/chatbot/session/:sessionId      # Get chat history
```

---

## 13. Webhook Endpoints

### Clerk Webhooks

```
POST   /api/v1/webhooks/clerk
```

Verification: Svix signature validation using `CLERK_WEBHOOK_SECRET`.

### Stripe Webhooks

```
POST   /api/v1/webhooks/stripe
```

Verification: Stripe signature validation using `STRIPE_WEBHOOK_SECRET`.

**Events handled:**
- `customer.subscription.updated` → Update subscription status, plan
- `customer.subscription.deleted` → Mark subscription cancelled; send offboarding email
- `invoice.payment_failed` → Mark subscription `past_due`; notify OrgAdmin
- `invoice.payment_succeeded` → Reset overdue flags; send receipt

### AI Service Callback

```
POST   /api/v1/webhooks/ai-service
```

Internal webhook (VPC-only). Called by FastAPI service when async jobs complete.

Verification: HMAC-SHA256 with `AI_SERVICE_WEBHOOK_SECRET`.

**Payload:**
```json
{
  "jobId": "uuid",
  "jobType": "lead_scoring",
  "status": "completed",
  "organizationId": "uuid",
  "resultData": { ... }
}
```

---

## 14. Rate Limiting Rules

Rate limits are enforced at the CloudFront WAF layer (IP-based) and per-tenant API layer (token/key-based).

### Endpoint Group Rate Limits

| Endpoint Group                     | Limit (per tenant, sliding window) | Limit (per IP)              |
|------------------------------------|------------------------------------|-----------------------------|
| `POST /api/v1/analytics/events`    | 10,000 events/minute               | 5,000 events/minute         |
| `GET /api/v1/analytics/*`          | 100 requests/minute                | 200 requests/minute         |
| `POST /api/v1/webhooks/*`          | 1,000 requests/minute              | 200 requests/minute (WAF)   |
| `POST /api/v1/ai/*`                | 20 jobs/hour (plan-limited)        | 50 requests/minute          |
| `POST /api/v1/media/upload-url`    | 100 requests/minute                | 50 requests/minute          |
| `POST /api/v1/leads`               | 1,000 creates/hour                 | 100 requests/minute         |
| `GET /api/v1/leads`                | 300 requests/minute                | 200 requests/minute         |
| `GET /api/public/*`                | 500 requests/minute per tenant     | 200 requests/minute (WAF)   |
| All other `GET /api/v1/*`          | 500 requests/minute                | 300 requests/minute         |
| All other `POST/PATCH/DELETE`      | 200 requests/minute                | 100 requests/minute         |

### Rate Limit Headers

All API responses include:

```
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 247
X-RateLimit-Reset: 1705312260
Retry-After: 12     (only on 429 responses)
```

### Plan-Based Quotas (Monthly Limits)

| Metric                    | Starter       | Growth        | Scale          |
|---------------------------|---------------|---------------|----------------|
| AI scoring calls          | 100/month     | 1,000/month   | Unlimited      |
| Lead discovery jobs       | 5/month       | 50/month      | 500/month      |
| API key requests          | 10,000/month  | 100,000/month | 1,000,000/month |
| Media storage             | 5 GB          | 50 GB         | 500 GB         |
| Team members              | 3             | 10            | Unlimited      |

Exceeding plan limits returns `429 PLAN_LIMIT_REACHED` with a link to upgrade.
