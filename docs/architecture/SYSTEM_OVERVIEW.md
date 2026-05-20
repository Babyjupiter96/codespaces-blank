# System Architecture Overview — Multi-Tenant Construction SaaS

## Table of Contents
1. [Platform Overview](#1-platform-overview)
2. [Multi-Tenancy Model](#2-multi-tenancy-model)
3. [Tenant Resolution Strategy](#3-tenant-resolution-strategy)
4. [Request Flow Diagram](#4-request-flow-diagram)
5. [Service Boundaries](#5-service-boundaries)
6. [Data Isolation Guarantees](#6-data-isolation-guarantees)
7. [Caching Strategy](#7-caching-strategy)
8. [Security Layers](#8-security-layers)
9. [Cost Optimization](#9-cost-optimization)
10. [Scaling Strategy](#10-scaling-strategy)
11. [GDPR and Compliance](#11-gdpr-and-compliance)

---

## 1. Platform Overview

This platform is a multi-tenant SaaS product designed for a primary construction company to manage and deliver branded microsites for multiple clients. Each client (tenant) receives:

- A fully white-labeled website at a subdomain (e.g., `client.buildpro.com`) or a custom domain (e.g., `www.clientcompany.com`)
- A branded gallery of construction projects and photo albums
- Lead capture forms with CRM integration
- A managed blog with full SEO tooling
- Analytics dashboard (page views, lead conversions, session tracking)
- AI-powered lead discovery and scoring

The SaaS operator (the construction company) manages all tenants from a centralized admin dashboard. Each tenant has its own branding, settings, and isolated data, but all share the same underlying infrastructure.

### Core Entity Hierarchy

```
SaaS Operator (SuperAdmin)
    └── Organizations (Tenants)
            ├── Users (OrgAdmin, Editor, Viewer, Client)
            ├── Website (pages, theme, SEO, custom domain)
            ├── Projects (construction portfolio, images)
            ├── Leads and CRM (lead notes, pipeline stages)
            ├── Blog (posts, categories, SEO metadata)
            └── Analytics (events, sessions, funnels)
```

### Technology Stack

| Layer            | Technology                                              |
|------------------|---------------------------------------------------------|
| Frontend         | Next.js 14 App Router (RSC + ISR)                       |
| Backend API      | Next.js API Routes (REST, /api/v1/*)                    |
| AI Microservice  | Python FastAPI + Celery                                 |
| Database         | PostgreSQL 15 via Prisma ORM                            |
| Auth             | Clerk (multi-tenant, JWT)                               |
| Hosting          | AWS ECS Fargate, RDS, CloudFront, S3, Route53           |
| IaC              | Terraform (modular)                                     |
| CI/CD            | GitHub Actions                                          |
| Analytics        | PostHog + AWS Kinesis to Lambda to RDS                  |
| Cache            | Redis via ElastiCache                                   |
| Queue            | AWS SQS + Celery                                        |
| CDN              | CloudFront                                              |
| Containers       | Docker                                                  |

---

## 2. Multi-Tenancy Model

### Approach: Shared Database with Row-Level Security (RLS)

We use a single shared PostgreSQL database with `organization_id` (tenant ID) on every tenant-scoped table, enforced by PostgreSQL Row-Level Security policies.

#### Why Shared DB + RLS over Schema-Per-Tenant?

| Factor               | Shared DB + RLS              | Schema-Per-Tenant              | Database-Per-Tenant        |
|----------------------|------------------------------|--------------------------------|----------------------------|
| Tenant count 1000+   | Single instance, no overhead | 1000 schemas; migrations painful | Prohibitively expensive   |
| Data isolation       | RLS enforced at DB level     | Physical separation            | Strongest isolation        |
| Cost at MVP          | 1 RDS instance               | 1 RDS instance, complex       | 1000 RDS instances         |
| Migration complexity | Single migration path        | Fan-out to all schemas        | Fan-out to all DBs         |
| Cross-tenant queries | Possible with superuser role | Complex joins across schemas   | Not feasible               |
| Connection pooling   | Simple (one DB)              | One pool per schema            | One pool per DB            |
| Verdict              | Recommended                  | Not viable at scale            | Not viable at scale        |

#### Tenant Context Propagation

Every tenant-scoped Prisma client is initialized with the `organizationId` before any query executes. The PostgreSQL session variable is set within a transaction:

```typescript
// packages/db/src/tenant-client.ts
export function getTenantClient(organizationId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          const [, result] = await prisma.$transaction([
            prisma.$executeRaw`SET LOCAL app.current_org_id = ${organizationId}`,
            query(args),
          ]);
          return result;
        },
      },
    },
  });
}
```

The PostgreSQL RLS policy applied to all tenant-scoped tables:

```sql
ALTER TABLE construction_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON construction_projects
  AS PERMISSIVE FOR ALL
  TO app_user
  USING (organization_id = current_setting('app.current_org_id')::uuid);
```

The superadmin application role (`saas_admin`) is granted BYPASSRLS to allow cross-tenant admin operations.

---

## 3. Tenant Resolution Strategy

Tenants are resolved at the Next.js middleware layer before any rendering or data fetching occurs. The resolution pipeline executes on every request to a tenant-facing route.

### Resolution Pipeline

```
Incoming Request
       |
       v
Extract hostname from request headers
       |
       +---> admin.buildpro.com  --> Admin context (Clerk org, no tenant resolution)
       |
       +---> buildpro.com        --> Operator marketing site context
       |
       +---> {slug}.buildpro.com --> Subdomain resolution pipeline
       |
       +---> {custom-domain}     --> Custom domain resolution pipeline
```

### Step 1: Subdomain Resolution

For managed subdomains (e.g., `clientname.buildpro.com`):

1. Parse hostname: `clientname.buildpro.com` → slug = `clientname`
2. Redis GET: `tenant:slug:{slug}` (TTL: 5 minutes)
3. Cache miss: `SELECT id, slug, theme_config, status FROM organizations WHERE slug = $1 AND status = 'active'`
4. Cache tenant config in Redis
5. Inject headers: `x-tenant-id`, `x-tenant-slug`, `x-tenant-config-json`

### Step 2: Custom Domain Resolution

For custom domains (e.g., `www.clientco.com`):

1. Detect hostname does not match `*.buildpro.com` pattern
2. Redis GET: `tenant:domain:{hostname}` (TTL: 15 minutes)
3. Cache miss: `SELECT o.* FROM organizations o JOIN websites w ON w.organization_id = o.id WHERE w.custom_domain = $1 AND w.domain_verified = true`
4. Cache result and inject tenant headers identically to subdomain flow

### Step 3: Cache TTL Strategy

| Key Pattern                       | TTL        | Invalidation Trigger               |
|-----------------------------------|------------|------------------------------------|
| `tenant:slug:{slug}`              | 5 minutes  | Organization slug change           |
| `tenant:domain:{hostname}`        | 15 minutes | Custom domain update or removal    |
| `tenant:config:{org_id}`          | 10 minutes | Theme or branding configuration update |
| `session:{clerk_session_id}`      | 1 hour     | Clerk webhook session.ended        |
| `tenant:flags:{org_id}`           | 1 hour     | Subscription plan change           |
| `rl:{ip}:{endpoint_group}`        | 1 minute   | Rolling window — auto-expiring     |

### Step 4: Negative Caching

Unresolvable hostnames are cached with a short TTL (60 seconds) to prevent DB hammering from bot traffic hitting random subdomains.

```redis
SET tenant:slug:nonexistent "NOT_FOUND" EX 60
```

### Custom Domain Provisioning Flow

```
1. Tenant admin enters custom domain in dashboard
2. System generates verification CNAME record
3. Tenant adds CNAME: www.clientco.com → proxy.buildpro.com
4. Lambda function polls DNS every 5 minutes for verification
5. On DNS verified: ACM certificate requested via DNS validation
6. ACM issues cert (automated, ~3 minutes)
7. CloudFront CNAME added to distribution
8. websites.domain_verified = true; websites.custom_domain_status = 'active'
9. Redis key invalidated; next request picks up new domain mapping
```

---

## 4. Request Flow Diagram

### High-Level System Request Flow

```
  USER BROWSER
       |
       | HTTPS Request (GET https://clientco.buildpro.com/projects)
       v
  +-----------------+
  |  Route53 DNS    |  Wildcard A record: *.buildpro.com -> CloudFront IP
  +-----------------+
       |
       v
  +-----------------+
  |   AWS WAF       |  Rate limit: 1000 req/min per IP
  |                 |  OWASP Managed Rules (SQLi, XSS, etc.)
  |                 |  IP Reputation List
  |                 |  Bot Control (challenge suspicious UAs)
  +-----------------+
       |
       v
  +-----------------------------+
  |   CloudFront Distribution   |
  |                             |
  |  Cache HIT? --> Serve from  |
  |  edge (ISR pages, assets)   |
  |                             |
  |  Cache MISS --> forward to  |
  |  ALB origin                 |
  +-----------------------------+
       |  (cache miss)
       v
  +---------------------------+
  |  Application Load         |
  |  Balancer (ALB)           |
  |  SSL termination          |
  |  Sticky sessions: disabled |
  |  Target group: ECS tasks  |
  +---------------------------+
       |
       v
  +------------------------------------------+
  |  ECS Fargate Task — Next.js App          |
  |                                          |
  |  [Next.js Middleware — Edge Runtime]     |
  |    1. Extract hostname                   |
  |    2. Redis lookup for tenant config     |
  |    3. DB lookup on cache miss            |
  |    4. Inject x-tenant-id header          |
  |    5. Auth: validate Clerk JWT           |
  |                                          |
  |  [App Router — Route Handler]            |
  |    /app/[tenant]/projects/page.tsx       |
  |    - getTenantClient(tenantId)           |
  |    - Fetch projects (RLS-scoped query)   |
  |    - Apply tenant theme config           |
  |    - Stream RSC HTML to client           |
  +------------------------------------------+
       |
       | (data queries)
       v
  +------------------+    +------------------+
  |  Redis           |    |  PostgreSQL RDS  |
  |  (ElastiCache)   |    |  Primary         |
  |                  |    |  (RLS enforced)  |
  |  Tenant config   |    |                  |
  |  Session cache   |    +------------------+
  |  Rate limiters   |           |
  +------------------+    +------------------+
                          |  PostgreSQL RDS  |
                          |  Read Replica    |
                          |  (analytics, ISR)|
                          +------------------+

  RESPONSE FLOWS BACK:
  ECS --> ALB --> CloudFront (cached per ISR rules) --> User
```

### Analytics Event Flow

```
  User Browser
       |
       | Event: page_view, click, form_submit
       v
  PostHog SDK (product analytics)     Custom Analytics SDK
       |                                      |
       | (direct to PostHog cloud)            | POST /api/v1/analytics/events
       v                                      v
  PostHog                            Next.js API Route
  (product metrics)                          |
                                             | Batch write (10 events or 1s timeout)
                                             v
                                    Kinesis Data Stream
                                    (2 shards, 2000 ev/s)
                                             |
                                    Lambda Consumer
                                    (triggered per shard)
                                             |
                                             v
                                    Batch INSERT to:
                                    analytics_events (RDS)
                                    analytics_sessions (RDS)
```

### AI/Scraping Job Flow

```
  Next.js API Route
  POST /api/v1/ai/lead-discovery
       |
       | Enqueue SQS message:
       | { tenantId, jobType: "lead_discovery", payload: {...} }
       v
  AWS SQS Queue: ai-jobs-{env}
       |
       v
  Celery Worker (FastAPI ECS Task)
       |
       +-- lead_discovery: Playwright scraping -> parse -> normalize
       +-- lead_scoring: OpenAI API -> score 1-100 -> update lead record
       +-- email_draft: OpenAI API -> generate personalized email
       +-- quote_generation: Template + GPT -> structured quote PDF
       |
       v
  PostgreSQL: writes scraped_leads, ai_lead_scores
       |
       v
  SQS Result Queue -> Next.js webhook handler -> notify dashboard
```

---

## 5. Service Boundaries

### Service Map

```
+------------------------------------------------------------------+
|                      PUBLIC INTERNET                             |
+------------------------------------------------------------------+
         |                    |                    |
  Tenant Microsites    Admin Dashboard      AI Service (internal)
  *.buildpro.com       admin.buildpro.com   Port 8000 (VPC-only)
  custom-domain.com    buildpro.com
         |                    |
+--------v--------------------v------------------------------------+
|                  CloudFront + WAF + ACM                         |
+-------------------------------+----------------------------------+
                                |
+-------------------------------v----------------------------------+
|               Application Load Balancer                         |
+-------------------+------------------------------+--------------+
                    |                              |
    +---------------v--------------+  +-----------v-----------+
    |   Next.js App (ECS Fargate)  |  |  FastAPI AI Svc (ECS) |
    |                              |  |                       |
    |  - Multi-tenant middleware   |  |  - /api/ai/* routes   |
    |  - Admin dashboard routes    |  |  - Celery workers     |
    |  - Public microsite routes   |  |  - Playwright scraper |
    |  - REST API (/api/v1/*)      |  |  - OpenAI integration |
    |  - Clerk auth integration    |  |                       |
    +---+---------+----------------+  +-----------+-----------+
        |         |                              |
        |         |                   SQS queues (ai-jobs, results)
        |         |                              |
+-------v---------v------------------------------v--------------+
|                      Data Layer (Private Subnets)             |
|                                                               |
|  +------------------+  +------------------+  +------------+  |
|  |  PostgreSQL RDS  |  |  Redis           |  |  S3        |  |
|  |  Primary         |  |  (ElastiCache)   |  |  Buckets   |  |
|  |  Multi-AZ        |  |  Cluster         |  |  (assets,  |  |
|  |  + Read Replica  |  |                  |  |   logs,    |  |
|  +------------------+  +------------------+  |   backup)  |  |
|                                              +------------+  |
+---------------------------------------------------------------+
                                |
+-------------------------------v---------------------------------+
|                  Analytics Pipeline                            |
|  Kinesis Data Streams --> Lambda Consumer --> RDS              |
|  PostHog (product analytics, SaaS hosted)                      |
+----------------------------------------------------------------+
```

### Service Responsibility Matrix

| Service              | Owns                                      | Does NOT Own                         |
|----------------------|-------------------------------------------|--------------------------------------|
| Next.js App          | Tenant routing, SSR/ISR, admin UI, REST API | AI inference, web scraping, batch jobs |
| FastAPI AI Service   | Lead discovery, scoring, email gen, scraping | Tenant routing, auth, billing        |
| PostgreSQL (RDS)     | All persistent business data, RLS          | Cache, session management            |
| Redis (ElastiCache)  | Tenant config cache, sessions, rate limits | Persistent data                      |
| S3                   | Media assets, exports, backups, logs       | Serving dynamic content              |
| CloudFront           | Edge caching, SSL termination, CDN         | Business logic                       |
| Kinesis              | Analytics event ingestion and ordering     | Event processing logic               |
| Lambda               | Analytics processing, cert automation      | Long-running tasks                   |
| SQS                  | Async job queuing, decoupling              | Job execution                        |

---

## 6. Data Isolation Guarantees

### Defense-in-Depth Model

Data isolation is enforced at five independent layers. A failure at any one layer does not expose cross-tenant data.

#### Layer 1: Application Middleware (First Line)
- `x-tenant-id` header is resolved from hostname exclusively — never from request body or query parameters
- Middleware rejects any request where tenant cannot be resolved (404 for unauthenticated, 403 for authenticated)
- Tenant ID injection is the first middleware step, before any business logic

#### Layer 2: Prisma Client Factory (Second Line)
- All queries to tenant-scoped tables use a `getTenantClient(organizationId)` factory
- Factory pattern ensures `organizationId` is always injected into WHERE clauses
- Superadmin operations use a separate elevated client with explicit cross-tenant access documented

#### Layer 3: PostgreSQL RLS (Third Line — Cannot Be Bypassed by App Code)
- RLS enabled on all 25+ tenant-scoped tables
- Application DB role (`app_user`) cannot bypass RLS
- Session variable `app.current_org_id` must be set before any query on tenant tables
- Superadmin role (`saas_admin`) has BYPASSRLS for admin operations

#### Layer 4: S3 Prefix Isolation (Storage Layer)
- All tenant assets: `s3://media-bucket/tenants/{organizationId}/{filename}`
- Presigned URL generation validates requesting user's organization matches prefix
- Bucket policy denies access to `/tenants/*` without correct prefix scoping

#### Layer 5: Cache Namespace Isolation (Cache Layer)
- All Redis keys prefixed: `tenant:{organizationId}:*`
- Cache key collision is structurally impossible with UUID-based org IDs

---

## 7. Caching Strategy

### Cache Hierarchy

```
Level 1: Browser Cache
  Static assets: max-age=31536000 (1 year, content-hashed filenames)
  API responses: no-store (always fresh)
       |
Level 2: CloudFront Edge Cache
  ISR pages:          s-maxage=60, stale-while-revalidate=3600
  Static JS/CSS:      max-age=31536000, immutable
  Media images (S3):  max-age=86400 (24 hours)
  API routes:         no-cache (pass-through)
  Sitemaps:           max-age=3600 (1 hour)
       |
Level 3: Redis (ElastiCache)
  Tenant config:      TTL 600s  (10 min)
  Session data:       TTL 3600s (1 hour)
  Rate limit counters: TTL 60s  (rolling window)
  Analytics aggregates: TTL 300s (5 min)
  Feature flags:      TTL 3600s (1 hour)
       |
Level 4: PostgreSQL (Source of Truth)
  All persistent data
  Read replica for analytics and ISR queries
  Primary for all writes
```

### Cache Invalidation Events

| Event                          | Cache Target Invalidated                               | Method                          |
|--------------------------------|--------------------------------------------------------|---------------------------------|
| Tenant theme updated           | `tenant:config:{orgId}` + CloudFront tenant pages      | Redis DEL + CF invalidation API |
| Blog post published            | CloudFront `/blog/*` for tenant domain                 | `revalidatePath()` + CF API     |
| New project image uploaded     | CloudFront `/projects/*` for tenant domain             | `revalidatePath()`              |
| Custom domain changed          | `tenant:domain:{old}` + `tenant:domain:{new}`          | Redis DEL                       |
| User session revoked           | `session:{userId}`                                     | Clerk webhook + Redis DEL       |
| Subscription plan changed      | `tenant:flags:{orgId}`                                 | Redis DEL                       |
| Tenant deactivated             | `tenant:slug:{slug}` + `tenant:domain:{domain}`        | Redis DEL (negative cache set)  |

### Next.js ISR Strategy

- Tenant microsite pages: `export const revalidate = 60` (60-second ISR)
- Blog posts: `export const revalidate = 300` (5-minute ISR)
- Project gallery: `export const revalidate = 60`
- On-demand revalidation via `revalidateTag(tenant-${orgId})` triggered from admin mutations
- Static generation for pages that rarely change (about, services) with `revalidate = 3600`

---

## 8. Security Layers

### Layer 1: AWS WAF (Outermost Defense)
- Rate limiting: 1000 requests per 5-minute window per IP (tenant sites); 200/5-min (admin)
- AWS Managed Rules: CommonRuleSet (SQLi, XSS), KnownBadInputsRuleSet
- Amazon IP Reputation List: auto-blocks known malicious IPs
- Bot Control: CAPTCHA challenge for suspicious user agents
- Geo-blocking: configurable per environment; blocked countries get 403

### Layer 2: CloudFront / TLS
- HTTPS enforced at CloudFront (HTTP to HTTPS redirect)
- TLS 1.2 minimum; TLS 1.3 preferred
- HSTS: `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- Security headers policy: `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy` per tenant (configurable in theme config)

### Layer 3: Clerk JWT Authentication
- All `/api/v1/*` routes (except public webhooks) require valid Clerk JWT
- JWT validated via Clerk JWKS (JWKS URL cached in Redis for 1 hour)
- Claims extracted: `userId`, `orgId`, `orgRole`, `orgSlug`, `sessionId`
- JWT expiry enforced; refresh handled automatically by Clerk SDK
- Clerk webhooks verified by Svix signature validation

### Layer 4: RBAC Authorization

```
Role           Permissions
-----------    ----------------------------------------------------------
SuperAdmin     All operations across all tenants (BYPASSRLS)
OrgAdmin       Full CRUD for their organization; member management; billing
Editor         Create/edit website content, projects, blog posts; no billing
Viewer         Read-only access to their organization's data
Client         View-only portal: their project updates, lead status
```

Permission checks are enforced at three points:
1. Next.js route groups (`/app/admin` requires SuperAdmin)
2. API route middleware (`requireOrgRole('OrgAdmin')`)
3. PostgreSQL RLS policies (belt-and-suspenders)

### Layer 5: Input Validation
- All API request bodies validated with Zod schemas before processing
- Validation errors return 422 with structured field-level error messages
- File upload MIME type validated on server (not just browser extension)
- SQL injection impossible via Prisma parameterized queries; RLS adds double protection

### Layer 6: API Key Security
- API keys: 32-byte CSPRNG hex string, prefixed with `bpk_live_` or `bpk_test_`
- Stored as `sha256(apiKey)` in `api_keys.key_hash` — plaintext shown once at creation
- Each key scoped to one organization with explicit permission scopes
- Keys rate-limited independently of user JWT rate limits
- Key rotation supported; multiple active keys per org allowed

---

## 9. Cost Optimization

### Compute Efficiency
- ECS Fargate Spot for stateless Next.js tasks (up to 70% discount vs On-Demand)
- Fargate Savings Plans for baseline compute commitment (saves ~20%)
- Right-size ECS tasks: Next.js at 0.5 vCPU / 1GB RAM per task (scale quantity, not size)
- Lambda for analytics processing: zero idle cost; sub-100ms invocations billed in 1ms increments

### Database Efficiency
- Shared RDS across all tenants (vs per-tenant RDS): 10-100x cost savings at scale
- RDS Reserved Instances (1-year): ~40% savings over On-Demand
- gp3 storage: better IOPS baseline at lower cost than gp2
- Read replicas defer expensive analytics queries off the primary

### Storage Efficiency
- S3 Intelligent-Tiering for media assets (auto-moves to Standard-IA after 30 days of no access)
- S3 Lifecycle: logs to Glacier after 90 days; delete after 365 days
- CloudFront target cache hit ratio >85%: reduces origin ECS invocations and bandwidth
- VPC endpoints for S3 and DynamoDB: eliminates NAT Gateway per-GB charges for those services

### Cold Start Avoidance
- Next.js app: minimum 2 ECS tasks always running (no scale-to-zero)
- Analytics Lambda: provisioned concurrency (2 instances) for consistent p95 latency
- FastAPI AI service: minimum 1 task; scheduled warm-up ping every 5 minutes

---

## 10. Scaling Strategy

### Compute Scaling (ECS Auto Scaling)

```
Metric:       CPU Utilization (Target Tracking)
Target:       60%
Scale-out:    +1 task per breach (cooldown: 60s)
Scale-in:     -1 task per sustained low usage (cooldown: 300s)

Service          Min Tasks   Max Tasks   Instance Type
-----------      ---------   ---------   ----------------
Next.js App      2           20          0.5 vCPU / 1GB RAM
FastAPI AI       1           10          1 vCPU / 2GB RAM
```

### Database Scaling

```
Phase     RDS Instance       Config                         Notes
-------   ----------------   ----------------------------   ----------------------
MVP       db.r6g.large       Single-AZ, 100GB gp3           10-50 tenants
Growth    db.r6g.xlarge      Multi-AZ + 1 Read Replica      50-200 tenants
Scale     db.r6g.2xlarge     Multi-AZ + 2 Read Replicas     200-1000 tenants
```

Read replica routing:
- Analytics queries, dashboard reads, ISR data fetches: Read Replica
- All mutations (leads, projects, forms, settings): Primary only

Connection pooling:
- PgBouncer in transaction mode: max 200 DB connections shared across all ECS tasks
- Prisma connection pool: `min: 2, max: 10` per ECS task instance

### Analytics Pipeline Scaling

```
Kinesis shards:  Start 2 (2000 events/sec) -> auto-scale to 10 (10,000/sec)
Lambda consumer: 1 per shard, 5-minute batch window, max 1000 records per batch
RDS writes:      Bulk INSERT (100 events per statement) to analytics_events
Partitioning:    analytics_events RANGE partitioned by month (automatic via Lambda)
```

### Redis Scaling

```
Phase     Node Type          Config                    Notes
-------   ----------------   -----------------------   -------------------
MVP       cache.r6g.large    Single node               < 1GB working set
Growth    cache.r6g.large    2 shards x 1 replica      Cluster mode enabled
Scale     cache.r6g.xlarge   3 shards x 2 replicas     Full HA cluster
```

---

## 11. GDPR and Compliance

### Data Residency
- Default deployment region: `us-east-1`
- EU tenant option: `eu-west-1` (separate Terraform workspace; data never leaves EU)
- Cross-region replication disabled by default for GDPR data residency compliance

### Data Subject Rights

| Right                  | Endpoint                            | Implementation                                               |
|------------------------|-------------------------------------|--------------------------------------------------------------|
| Right to Access        | `GET /api/v1/gdpr/export`           | Generates JSON/ZIP of all PII for the requesting user        |
| Right to Erasure       | `DELETE /api/v1/gdpr/erase`         | Anonymizes PII; retains aggregate analytics (no PII)         |
| Right to Portability   | `GET /api/v1/gdpr/export?format=json` | Machine-readable JSON of all user-generated data           |
| Right to Rectification | `PATCH /api/v1/users/profile`       | Standard profile update API                                  |
| Right to Restriction   | `POST /api/v1/gdpr/restrict`        | Sets `users.processing_restricted = true`; blocks writes     |

### Consent Management
- Cookie consent banner on all tenant sites (customizable per tenant)
- Consent granularity: Functional, Analytics, Marketing
- Analytics SDK respects consent: events only sent if `analytics` consent granted
- Consent event stored: `analytics_events` with `event_type = 'consent_granted'`
- PostHog configured in opt-out mode globally; opt-in on consent

### Data Retention Schedule

| Data Category          | Retention Period    | After Expiry                           |
|------------------------|---------------------|----------------------------------------|
| Lead PII               | 3 years post-inactivity | Auto-anonymized (nullify name, email, phone) |
| Analytics raw events   | 13 months           | Partition dropped (pg partition pruning) |
| Analytics aggregates   | Indefinite          | No PII; aggregates only                |
| Session data (Redis)   | 1 hour (TTL)        | Automatic Redis expiry                 |
| Session data (RDS)     | 30 days             | Scheduled job purge                    |
| Audit logs             | 7 years             | Archived to S3 Glacier after 2 years   |
| RDS automated backups  | 35 days             | Automatic RDS backup rotation          |

### Compliance Checklist

- [x] Privacy Policy and Terms of Service per tenant (template provided, customizable)
- [x] Cookie consent banner on all microsite pages
- [x] Data Processing Agreements with sub-processors (AWS, Clerk, OpenAI, PostHog)
- [x] Audit log for all data mutations (see `audit_logs` table)
- [x] RLS-enforced data isolation
- [x] API input validation (Zod) preventing injection attacks
- [x] HTTPS enforced on all endpoints
- [ ] Annual penetration testing (roadmap: Q2 after MVP launch)
- [ ] SOC 2 Type I readiness (roadmap: Q4 Year 1)
- [ ] SOC 2 Type II audit (roadmap: Year 2)
- [ ] ISO 27001 assessment (roadmap: Scale tier, 1000+ tenants)
