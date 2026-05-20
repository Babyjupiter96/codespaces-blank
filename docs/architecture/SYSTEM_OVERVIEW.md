# System Architecture Overview
## Construction SaaS Platform — Phase 1

---

## 1. Platform Overview

This platform is a **multi-tenant SaaS** that enables a primary construction company (the platform operator) to spin up and manage fully branded microsites for each of their construction clients. Each client (tenant) receives:

- A branded website with custom domain support
- Project gallery, portfolio, and service pages
- Lead capture forms with CRM integration
- Blog with SEO optimization
- Analytics and visitor tracking
- AI-powered lead discovery and scoring

The platform operator manages all tenants through a centralized admin dashboard, with the ability to create, configure, and monitor every tenant site from one control plane.

---

## 2. Multi-Tenancy Model

### Approach: Shared Database with Row-Level Security (RLS)

All tenants share a single PostgreSQL database. Every tenant-scoped table contains an `organization_id` foreign key column. PostgreSQL Row-Level Security policies enforce that application database users can only SELECT, INSERT, UPDATE, and DELETE rows belonging to their resolved tenant context.

This approach was chosen over schema-per-tenant or database-per-tenant because:

- **Cost efficiency**: A single RDS instance serves all tenants at the MVP stage; per-tenant schemas would fragment connection pooling.
- **Operational simplicity**: One migration path for schema changes across all tenants.
- **Sufficient isolation**: RLS at the database level plus application-layer middleware provides defense-in-depth.
- **Scalability path**: The `organization_id` column is the natural sharding key if we ever need to migrate to a distributed database.

### Tenant Identification

Each tenant is identified by a unique `organization_id` (UUID). This ID flows through every layer of the system:

```
Request → Middleware (resolve tenant) → Context → API Handler → DB Query (filtered by organization_id)
```

---

## 3. Tenant Resolution Strategy

### Subdomain Resolution

For managed subdomains (e.g., `clientname.buildpro.com`):

1. Next.js middleware intercepts every request.
2. The hostname header is parsed: `clientname.buildpro.com` → slug = `clientname`.
3. The middleware queries Redis for the cached tenant config keyed by slug.
4. On cache miss, the middleware queries PostgreSQL for `organizations WHERE slug = 'clientname'`.
5. The resolved `organizationId` and tenant config are injected into request headers for downstream use.

### Custom Domain Resolution

For custom domains (e.g., `www.clientswebsite.com`):

1. The middleware detects the hostname does not match `*.buildpro.com`.
2. It performs a Redis lookup keyed by the full hostname: `tenant:domain:www.clientswebsite.com`.
3. On cache miss, it queries `websites WHERE custom_domain = 'www.clientswebsite.com'` to resolve the organization.
4. The resolved tenant context is set identically to the subdomain flow.

### Admin Dashboard Resolution

Requests to `admin.buildpro.com` bypass tenant resolution and instead use Clerk's organization context from the authenticated session.

### Cache TTL Strategy

| Key Pattern                          | TTL        | Invalidation Trigger         |
|--------------------------------------|------------|------------------------------|
| `tenant:slug:{slug}`                 | 5 minutes  | Org config update            |
| `tenant:domain:{hostname}`           | 15 minutes | Custom domain change         |
| `tenant:config:{organization_id}`    | 10 minutes | Theme/branding update        |
| `session:{clerk_session_id}`         | 1 hour     | Clerk session invalidation   |

---

## 4. Request Flow Diagram

```
                              ┌─────────────────────────────────────────────────┐
                              │               INTERNET / CLIENT                 │
                              └──────────────────────┬──────────────────────────┘
                                                     │ HTTPS Request
                                                     ▼
                              ┌─────────────────────────────────────────────────┐
                              │           AWS WAF (Rate limiting,               │
                              │        OWASP rules, geo-blocking)               │
                              └──────────────────────┬──────────────────────────┘
                                                     │
                              ┌──────────────────────┼──────────────────────────┐
                              │                      ▼                          │
                              │         AWS CloudFront (CDN)                    │
                              │  ┌─────────────────────────────────┐            │
                              │  │  Cache-Control headers evaluated │            │
                              │  │  Static assets served from S3   │            │
                              │  │  Edge functions for tenant header│            │
                              │  └─────────────────┬───────────────┘            │
                              │                    │ Cache MISS                 │
                              │                    ▼                            │
                              │         ALB (Application Load Balancer)         │
                              │                    │                            │
                              │        ┌───────────┴──────────────┐             │
                              │        │                          │             │
                              │        ▼                          ▼             │
                              │  ┌───────────────┐    ┌──────────────────────┐  │
                              │  │  ECS Fargate  │    │  ECS Fargate         │  │
                              │  │  Next.js App  │    │  Python FastAPI      │  │
                              │  │  (web service)│    │  (ai-service)        │  │
                              │  └──────┬────────┘    └──────────┬───────────┘  │
                              │         │                        │              │
                              └─────────┼────────────────────────┼──────────────┘
                                        │                        │
                            ┌───────────┼────────────────────────┼───────────┐
                            │           │   PRIVATE SUBNET        │           │
                            │    ┌──────┼──────────────────┐      │           │
                            │    │      ▼                  ▼      │           │
                            │    │  ┌────────┐   ┌──────────────┐ │           │
                            │    │  │ Redis  │   │  RDS Postgres│ │           │
                            │    │  │(ElastiC│   │  Primary     │ │           │
                            │    │  │ache)   │   │  + Replica   │ │           │
                            │    │  └────────┘   └──────────────┘ │           │
                            │    │                                 │           │
                            │    │  ┌─────────┐   ┌────────────┐  │           │
                            │    │  │   SQS   │   │  S3 Buckets│  │           │
                            │    │  │ Queues  │   │  (assets,  │  │           │
                            │    │  └────┬────┘   │   media)   │  │           │
                            │    │       │         └────────────┘  │           │
                            │    │       ▼                         │           │
                            │    │  ┌──────────┐                   │           │
                            │    │  │  Celery  │                   │           │
                            │    │  │  Workers │                   │           │
                            │    │  │(AI/Scrape│                   │           │
                            │    │  └──────────┘                   │           │
                            │    └─────────────────────────────────┘           │
                            │                                                   │
                            │    ┌──────────────────────────────────────────┐   │
                            │    │    ANALYTICS PIPELINE                    │   │
                            │    │  Events → Kinesis → Lambda → RDS         │   │
                            │    └──────────────────────────────────────────┘   │
                            └───────────────────────────────────────────────────┘
```

### Detailed Request Flow: Tenant Microsite Page Load

```
1. Browser → CloudFront edge location
2. CloudFront checks cache (static assets served immediately)
3. Dynamic request forwarded to ALB with X-Forwarded-Host header
4. ALB routes to Next.js ECS task
5. Next.js middleware fires:
   a. Extract hostname from headers
   b. Redis GET tenant:domain:{hostname} or tenant:slug:{slug}
   c. On miss: PostgreSQL query → populate Redis cache
   d. Set x-tenant-id, x-org-id headers on request
6. App Router renders page with tenant context from headers
7. Server Components fetch data with tenant-scoped Prisma queries
8. React Server Component streams HTML to client
9. Client hydrates with React
10. Analytics SDK fires page_view event → /api/v1/analytics/events
11. Events API batches and sends to Kinesis Data Stream
12. Lambda consumer processes batch → writes to analytics_events table
```

---

## 5. Service Boundaries

### Next.js Web Application (apps/web)

**Responsibilities:**
- Serve tenant microsites (SSR/ISR)
- Serve admin dashboard (authenticated, SSR)
- Serve main marketing site
- API routes for: auth webhooks, tenant management, website management, project CRUD, leads CRUD, analytics ingestion, blog CRUD, media management

**Does NOT handle:**
- AI inference / lead scoring
- Web scraping
- Long-running batch jobs

### Python FastAPI AI Service (apps/ai-service)

**Responsibilities:**
- Lead discovery via web scraping (Playwright, BeautifulSoup)
- AI lead scoring (OpenAI GPT-4o via function calling)
- Email draft generation
- Quote generation from project data
- Chatbot responses
- Celery task queue for all async jobs

**Communication with Next.js:**
- Next.js enqueues jobs via SQS or direct HTTP call to ai-service
- ai-service writes results back to PostgreSQL directly
- ai-service publishes status updates via SQS → Next.js webhook handler

### Analytics Pipeline

**Responsibilities:**
- Ingest high-volume click/page-view events
- Aggregate metrics for dashboard
- Store raw events for compliance / replay

**Flow:**
```
Client SDK → /api/v1/analytics/events (Next.js) → Kinesis Data Stream
→ Lambda Consumer → Batch INSERT analytics_events (PostgreSQL)
→ Lambda Aggregator (scheduled) → UPDATE analytics_sessions
```

---

## 6. Data Isolation Guarantees

### Layer 1: Application Middleware

All API routes resolve tenant context before executing business logic. Unauthorized cross-tenant requests are rejected at the middleware layer with HTTP 403.

### Layer 2: Prisma Query Layer

All Prisma queries for tenant-scoped models include `where: { organizationId: ctx.organizationId }`. A shared Prisma client factory ensures the tenant context is always required.

```typescript
// packages/db/src/tenant-client.ts
export function getTenantClient(organizationId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          if ('where' in args) {
            args.where = { ...args.where, organizationId };
          }
          return query(args);
        },
      },
    },
  });
}
```

### Layer 3: PostgreSQL Row-Level Security

RLS policies are enabled on all tenant-scoped tables. The application sets `SET LOCAL app.current_org_id = '...'` at the start of each transaction.

```sql
-- Applied to all tenant-scoped tables
ALTER TABLE construction_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON construction_projects
  USING (organization_id = current_setting('app.current_org_id')::uuid);
```

### Layer 4: Network Isolation

- RDS is in a private subnet with no public endpoint.
- Security groups allow inbound PostgreSQL (5432) only from ECS task security groups.
- All inter-service communication is within the VPC.

---

## 7. Caching Strategy

### Redis (ElastiCache) — Application Cache

| Cache Type            | Key Pattern                           | TTL    | Use Case                              |
|-----------------------|---------------------------------------|--------|---------------------------------------|
| Tenant Config         | `tenant:config:{org_id}`              | 10 min | Theme, domain, branding               |
| Tenant Slug Map       | `tenant:slug:{slug}`                  | 5 min  | Subdomain → org_id resolution         |
| Tenant Domain Map     | `tenant:domain:{hostname}`            | 15 min | Custom domain → org_id resolution     |
| Session Data          | `session:{clerk_id}`                  | 1 hr   | Clerk session augmentation            |
| Feature Flags         | `flags:{org_id}`                      | 1 hr   | Plan-based feature gate cache         |
| Rate Limit Counters   | `rl:{ip}:{endpoint}`                  | 1 min  | Sliding window rate limiting          |
| Analytics Aggregates  | `analytics:{org_id}:{date}:{metric}`  | 5 min  | Dashboard query cache                 |

### CloudFront — CDN Cache

| Asset Type            | Cache-Control Header                  | Notes                                 |
|-----------------------|---------------------------------------|---------------------------------------|
| Static JS/CSS bundles | `public, max-age=31536000, immutable` | Content-hashed filenames              |
| Images (S3)           | `public, max-age=86400`               | 24-hour cache, CDN invalidation on update |
| Tenant pages (ISR)    | `s-maxage=60, stale-while-revalidate` | Next.js ISR revalidation              |
| API responses         | `no-store`                            | Never cached at CDN                   |
| Sitemap.xml           | `public, max-age=3600`                | 1-hour CDN cache                      |

### Next.js Incremental Static Regeneration (ISR)

- Tenant microsite pages use `revalidate = 60` seconds.
- On-demand revalidation via `revalidatePath()` is triggered when content changes in the admin dashboard.
- Marketing/blog pages use `revalidate = 300` seconds.

---

## 8. Security Layers

### Layer 1: AWS WAF

- Rate limiting: 1,000 requests/minute per IP globally; 100/minute on `/api/v1/auth/*`
- OWASP Managed Rule Group enabled
- Amazon IP Reputation List enabled
- Geo-blocking: configurable per deployment environment
- Bot Control: managed rule group for known bot signatures

### Layer 2: CloudFront

- HTTPS-only (HTTP → HTTPS redirect enforced)
- TLS 1.2+ minimum
- Custom headers (e.g., `X-Frame-Options: SAMEORIGIN`) injected via CloudFront response headers policy

### Layer 3: Clerk JWT Validation

All authenticated API routes validate the Clerk JWT:
- Signature verification using Clerk's JWKS endpoint (cached in Redis)
- `orgId` and `userId` extracted from JWT claims
- Organization membership verified against local `organization_members` table

### Layer 4: PostgreSQL RLS

As described in Section 6. All tenant data access filtered at database level.

### Layer 5: API Key Scoping

External API access (webhooks, partner integrations) uses hashed API keys stored in `api_keys` table:
- Keys are scoped to a single organization
- Permission scopes: `read:leads`, `write:leads`, `read:analytics`, `write:forms`
- Keys are hashed with bcrypt before storage; only shown once at creation

---

## 9. Cost Optimization

### Reserved Instances

- RDS: 1-year reserved instance for primary database (saves ~40% vs on-demand)
- ECS Fargate Savings Plans: commit to baseline compute (saves ~20%)
- ElastiCache: 1-year reserved nodes

### S3 Lifecycle Policies

- Media assets: Standard → Standard-IA after 90 days → Glacier after 1 year
- Log files: Standard → Standard-IA after 30 days → delete after 1 year
- Database backups: Standard → Glacier after 7 days → delete after 90 days

### CloudFront Caching

- High cache-hit ratio reduces origin requests to ECS, lowering compute cost
- Target: >85% cache hit ratio for static assets
- ISR reduces SSR compute per page view significantly

### Lambda Cold Start Avoidance

- Analytics Lambda consumer is kept warm via provisioned concurrency (2 instances minimum)
- CloudWatch scheduled rule pings health check Lambda every 5 minutes for non-provisioned functions

### Multi-tenant Efficiency

- Shared RDS instance across all tenants (vs. per-tenant RDS) saves 10x at MVP scale
- Shared ECS tasks process all tenant requests (no per-tenant task allocation until Scale tier)
- Shared CloudFront distribution with host-based routing (no per-tenant distribution at MVP)

---

## 10. Scaling Strategy

### Horizontal Scaling: ECS Fargate

- Target CPU utilization: 60% → Auto Scaling triggers at 70%
- Scale-in cooldown: 300 seconds; scale-out cooldown: 60 seconds
- Min capacity: 2 tasks (for HA across AZs); Max capacity: 20 tasks (MVP)
- At Scale tier: separate ECS services for web, api, and ai-service with independent scaling

### Database Scaling

**Read Replicas:**
- Dashboard analytics queries routed to read replica
- Public tenant microsite page queries routed to read replica
- Write operations (form submissions, lead creation) go to primary

**Connection Pooling:**
- PgBouncer in transaction mode with 200 max connections
- Prisma configured with connection pool size = (ECS_TASK_COUNT × 5)

**Partitioning:**
- `analytics_events` partitioned by month (RANGE on `created_at`)
- Automatic partition creation via scheduled Lambda

### Kinesis Sharding

- Start with 2 shards (~2,000 events/second capacity)
- Each shard handles one Lambda consumer
- Auto-scale to 10 shards at Growth tier (10,000 events/second)
- Shard-level metrics monitored via CloudWatch; alert at 80% utilization

### Redis Cluster

- Start: 1 shard, 1 replica node (cluster mode disabled)
- Growth: Enable cluster mode with 3 shards for horizontal scaling
- Scale: 6 shards with 1 replica each

---

## 11. GDPR / Compliance

### Data Residency

- All data stored in AWS `us-east-1` by default
- EU customers: option to deploy to `eu-west-1` region (separate Terraform workspace)
- Cross-region replication disabled by default to maintain data residency

### Data Subject Rights

| Right                     | Implementation                                                         |
|---------------------------|------------------------------------------------------------------------|
| Right to Access           | `/api/v1/users/data-export` — generates JSON/CSV of all user data      |
| Right to Erasure          | `/api/v1/users/delete` — cascades deletion, anonymizes analytics data  |
| Right to Portability      | Export endpoint returns machine-readable JSON                          |
| Right to Rectification    | Standard profile update APIs                                           |
| Right to Restriction      | `users.processing_restricted = true` flag; all writes blocked          |

### Consent Management

- Cookie consent banner (tenant-configurable) required for analytics tracking
- PostHog configured in opt-out mode (no tracking until consent given)
- Consent events stored in `analytics_events` with `event_type = 'consent_granted'`

### Audit Logging

- All data modifications logged to `audit_logs` table with: actor, action, table, row_id, before/after JSON, IP address, timestamp
- Audit logs are append-only (no UPDATE or DELETE permissions for application role)
- 2-year retention in S3 Glacier for compliance

### Data Retention

- Lead data: retained for 3 years after last activity (configurable per tenant)
- Analytics events: raw data retained 13 months; aggregates retained indefinitely
- Session data: Redis TTL 1 hour; PostgreSQL sessions purged after 30 days
- Deleted tenant data: hard-deleted from primary tables; anonymized in analytics

### Security Certifications Path

- Phase 1 target: SOC 2 Type I readiness (controls documentation)
- Phase 2 target: SOC 2 Type II audit
- Long-term: ISO 27001 consideration at 1,000+ tenants
