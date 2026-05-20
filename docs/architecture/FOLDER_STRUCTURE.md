# Monorepo Folder Structure — Multi-Tenant Construction SaaS

## Overview

The platform is organized as a **pnpm monorepo** managed with **Turborepo**. All packages share TypeScript configurations, ESLint rules, and Tailwind presets via the `packages/config` workspace.

```
construction-saas/
├── apps/
│   ├── web/                          # Next.js 14 — Tenant microsites + Admin dashboard
│   └── ai-service/                   # Python FastAPI — AI, scraping, Celery workers
├── packages/
│   ├── db/                           # Prisma schema, migrations, seed scripts, typed client
│   ├── ui/                           # Shared React component library (Tailwind-based)
│   ├── analytics/                    # Analytics SDK (browser + server-side)
│   └── config/                       # Shared ESLint, TypeScript, Tailwind base configs
├── infrastructure/
│   ├── terraform/                    # AWS infrastructure as code (modular)
│   └── docker/                       # Dockerfiles for all services
├── .github/
│   └── workflows/                    # CI/CD GitHub Actions pipelines
└── docs/
    └── architecture/                 # Architecture decision records + system docs
```

---

## Detailed Structure

### apps/web — Next.js Application

```
apps/web/
├── package.json                      # Dependencies: next, react, @clerk/nextjs, prisma client
├── next.config.ts                    # Image domains, env vars, redirects, headers
├── tailwind.config.ts                # Extends @construction-saas/config/tailwind
├── tsconfig.json                     # Extends @construction-saas/config/tsconfig/nextjs.json
├── middleware.ts                     # Tenant resolution, Clerk auth, rate limiting
├── instrumentation.ts                # OpenTelemetry / Sentry server-side init
├── sentry.client.config.ts           # Sentry browser configuration
├── sentry.server.config.ts           # Sentry server configuration
│
├── app/                              # Next.js App Router root
│   ├── layout.tsx                    # Root layout: HTML shell, ClerkProvider, ThemeProvider
│   ├── globals.css                   # Global CSS reset + CSS variables
│   │
│   ├── (marketing)/                  # Operator marketing site (buildpro.com)
│   │   ├── layout.tsx                # Marketing layout: nav, footer
│   │   ├── page.tsx                  # Homepage
│   │   ├── pricing/
│   │   │   └── page.tsx              # Pricing page
│   │   └── about/
│   │       └── page.tsx              # About page
│   │
│   ├── (admin)/                      # Admin dashboard (admin.buildpro.com)
│   │   ├── layout.tsx                # Admin layout: sidebar nav, breadcrumbs
│   │   ├── page.tsx                  # Admin home: overview stats
│   │   ├── tenants/
│   │   │   ├── page.tsx              # List all tenants with status, plan
│   │   │   ├── [orgId]/
│   │   │   │   ├── page.tsx          # Tenant detail: usage, settings
│   │   │   │   ├── members/page.tsx  # Tenant members
│   │   │   │   ├── billing/page.tsx  # Tenant billing / plan
│   │   │   │   └── audit/page.tsx    # Tenant audit log viewer
│   │   │   └── new/page.tsx          # Onboard new tenant
│   │   ├── analytics/
│   │   │   └── page.tsx              # Cross-tenant analytics overview
│   │   ├── ai-jobs/
│   │   │   └── page.tsx              # AI job queue monitor
│   │   └── settings/
│   │       └── page.tsx              # Platform-wide settings
│   │
│   ├── (dashboard)/                  # Tenant dashboard (org-specific authenticated area)
│   │   ├── layout.tsx                # Dashboard layout: tenant sidebar, header
│   │   ├── page.tsx                  # Dashboard home: leads, analytics, activity
│   │   ├── website/
│   │   │   ├── page.tsx              # Website settings overview
│   │   │   ├── pages/
│   │   │   │   ├── page.tsx          # Page manager
│   │   │   │   └── [pageId]/
│   │   │   │       └── page.tsx      # Page editor (rich text + block builder)
│   │   │   ├── theme/
│   │   │   │   └── page.tsx          # Theme editor: colors, fonts, logo
│   │   │   └── domain/
│   │   │       └── page.tsx          # Custom domain setup + DNS status
│   │   ├── projects/
│   │   │   ├── page.tsx              # Project list with drag-and-drop ordering
│   │   │   ├── new/page.tsx          # Create project form
│   │   │   └── [projectId]/
│   │   │       ├── page.tsx          # Project editor
│   │   │       └── images/page.tsx   # Image gallery manager (drag to reorder)
│   │   ├── leads/
│   │   │   ├── page.tsx              # Kanban board + list view toggle
│   │   │   ├── [leadId]/
│   │   │   │   └── page.tsx          # Lead detail: notes, scores, timeline
│   │   │   ├── import/page.tsx       # CSV import wizard
│   │   │   └── discovery/
│   │   │       ├── page.tsx          # AI lead discovery dashboard
│   │   │       └── [jobId]/page.tsx  # Discovery job results review
│   │   ├── analytics/
│   │   │   ├── page.tsx              # Analytics dashboard
│   │   │   ├── sessions/page.tsx     # Session explorer
│   │   │   └── reports/page.tsx      # Custom report builder
│   │   ├── blog/
│   │   │   ├── page.tsx              # Blog post list
│   │   │   ├── new/page.tsx          # New post editor
│   │   │   ├── [postId]/page.tsx     # Edit post
│   │   │   └── categories/page.tsx  # Category manager
│   │   ├── media/
│   │   │   └── page.tsx              # Media library: folder tree + grid view
│   │   ├── settings/
│   │   │   ├── page.tsx              # General settings
│   │   │   ├── members/page.tsx      # Team member management
│   │   │   ├── api-keys/page.tsx     # API key management
│   │   │   ├── billing/page.tsx      # Subscription and billing
│   │   │   └── notifications/page.tsx # Notification preferences
│   │   └── ai/
│   │       └── page.tsx              # AI features hub: scoring, email drafting
│   │
│   ├── (tenant)/                     # Public tenant microsites (*.buildpro.com / custom domains)
│   │   ├── layout.tsx                # Tenant layout: applies theme config, nav
│   │   ├── page.tsx                  # Tenant home page (ISR)
│   │   ├── projects/
│   │   │   ├── page.tsx              # Project gallery (ISR, revalidate=60)
│   │   │   └── [slug]/page.tsx       # Single project detail (ISR)
│   │   ├── blog/
│   │   │   ├── page.tsx              # Blog listing (ISR)
│   │   │   ├── [slug]/page.tsx       # Single blog post (ISR)
│   │   │   └── category/[slug]/page.tsx # Category page
│   │   ├── [pageSlug]/
│   │   │   └── page.tsx              # Dynamic CMS pages (ISR)
│   │   ├── sitemap.xml/
│   │   │   └── route.ts              # Dynamic sitemap per tenant
│   │   └── robots.txt/
│   │       └── route.ts              # Dynamic robots.txt per tenant
│   │
│   └── api/
│       └── v1/
│           ├── auth/
│           │   └── me/route.ts                    # GET /api/v1/auth/me
│           ├── webhooks/
│           │   ├── clerk/route.ts                 # POST /api/v1/webhooks/clerk
│           │   ├── stripe/route.ts                # POST /api/v1/webhooks/stripe
│           │   └── ai-service/route.ts            # POST /api/v1/webhooks/ai-service
│           ├── organizations/
│           │   ├── route.ts                       # GET (list), POST (create)
│           │   └── [orgId]/
│           │       ├── route.ts                   # GET, PATCH, DELETE
│           │       ├── members/
│           │       │   ├── route.ts               # GET (list), POST (invite)
│           │       │   └── [userId]/route.ts      # PATCH (role), DELETE (remove)
│           │       ├── roles/
│           │       │   ├── route.ts               # GET, POST
│           │       │   └── [roleId]/route.ts      # PATCH, DELETE
│           │       ├── subscription/
│           │       │   └── route.ts               # GET, POST (upgrade/cancel)
│           │       └── stats/route.ts             # GET usage stats
│           ├── websites/
│           │   ├── route.ts                       # GET, POST
│           │   └── [websiteId]/
│           │       ├── route.ts                   # GET, PATCH
│           │       ├── pages/
│           │       │   ├── route.ts               # GET, POST
│           │       │   └── [pageId]/route.ts      # GET, PATCH, DELETE
│           │       ├── themes/
│           │       │   ├── route.ts               # GET, POST
│           │       │   └── [themeId]/route.ts     # PATCH, DELETE
│           │       └── domain/route.ts            # POST (set), DELETE (remove), GET (verify)
│           ├── projects/
│           │   ├── route.ts                       # GET, POST
│           │   └── [projectId]/
│           │       ├── route.ts                   # GET, PATCH, DELETE
│           │       └── images/
│           │           ├── route.ts               # GET, POST
│           │           └── [imageId]/route.ts     # PATCH, DELETE
│           ├── leads/
│           │   ├── route.ts                       # GET, POST
│           │   ├── import/
│           │   │   └── csv/route.ts               # POST (upload CSV)
│           │   ├── export/route.ts                # GET (download CSV/JSON)
│           │   ├── bulk-update/route.ts           # POST
│           │   └── [leadId]/
│           │       ├── route.ts                   # GET, PATCH, DELETE
│           │       ├── notes/
│           │       │   ├── route.ts               # GET, POST
│           │       │   └── [noteId]/route.ts      # PATCH, DELETE
│           │       └── score/route.ts             # GET, POST (trigger scoring)
│           ├── analytics/
│           │   ├── events/route.ts                # POST (ingest)
│           │   ├── dashboard/route.ts             # GET (overview metrics)
│           │   ├── pageviews/route.ts             # GET (timeseries)
│           │   └── leads/
│           │       └── funnel/route.ts            # GET (conversion funnel)
│           ├── blog/
│           │   ├── posts/
│           │   │   ├── route.ts                   # GET, POST
│           │   │   └── [postId]/route.ts          # GET, PATCH, DELETE
│           │   └── categories/
│           │       ├── route.ts                   # GET, POST
│           │       └── [catId]/route.ts           # PATCH, DELETE
│           ├── media/
│           │   ├── upload-url/route.ts            # POST (get presigned S3 URL)
│           │   ├── route.ts                       # GET (list assets)
│           │   └── [assetId]/route.ts             # GET, PATCH, DELETE
│           ├── ai/
│           │   ├── lead-discovery/
│           │   │   ├── route.ts                   # GET (list jobs), POST (create)
│           │   │   └── [jobId]/
│           │   │       ├── route.ts               # GET (status), DELETE (cancel)
│           │   │       └── results/route.ts       # GET scraped leads
│           │   └── leads/
│           │       └── [leadId]/
│           │           ├── score/route.ts         # POST (score)
│           │           └── draft-email/route.ts   # POST (generate email)
│           └── public/
│               ├── projects/
│               │   ├── route.ts                   # GET (public gallery)
│               │   └── [slug]/route.ts            # GET (single project)
│               ├── blog/
│               │   ├── posts/route.ts             # GET published posts
│               │   └── [slug]/route.ts            # GET single post
│               └── chatbot/
│                   └── message/route.ts           # POST (chatbot message)
│
├── components/
│   ├── admin/                        # Admin dashboard components
│   │   ├── TenantTable.tsx           # Sortable tenant list with status badges
│   │   ├── AIJobMonitor.tsx          # Real-time job status with progress bars
│   │   └── CrossTenantAnalytics.tsx  # Aggregate analytics chart
│   ├── dashboard/                    # Tenant dashboard components
│   │   ├── LeadKanban.tsx            # Drag-and-drop kanban board
│   │   ├── LeadCard.tsx              # Lead card with score badge
│   │   ├── ProjectEditor.tsx         # Project form with image uploader
│   │   ├── BlockEditor.tsx           # Page content block editor
│   │   ├── MediaLibrary.tsx          # Grid + folder tree media picker
│   │   ├── AnalyticsChart.tsx        # Chart.js wrapper for analytics
│   │   ├── ThemePreview.tsx          # Live theme preview iframe
│   │   └── DomainSetupWizard.tsx     # Step-by-step domain configuration UI
│   ├── tenant/                       # Tenant microsite components (public-facing)
│   │   ├── ProjectGallery.tsx        # Masonry project gallery
│   │   ├── ProjectCard.tsx           # Project card with hover overlay
│   │   ├── LeadForm.tsx              # Contact/quote form with validation
│   │   ├── BlogList.tsx              # Blog post list with pagination
│   │   ├── BlogPost.tsx              # Blog post renderer (JSON to HTML)
│   │   ├── SectionRenderer.tsx       # Dynamic page section renderer
│   │   ├── TenantNav.tsx             # Tenant-branded navigation
│   │   └── TenantFooter.tsx          # Tenant-branded footer
│   └── shared/
│       ├── ErrorBoundary.tsx         # React error boundary
│       ├── LoadingSpinner.tsx        # Spinner with size variants
│       └── ConfirmDialog.tsx         # Reusable confirmation modal
│
├── lib/
│   ├── auth.ts                       # Clerk helpers: getAuth, requireAuth, requireRole
│   ├── tenant.ts                     # Tenant resolution: getTenant(host), getTenantClient
│   ├── db.ts                         # Prisma client singleton + tenant client factory
│   ├── redis.ts                      # Redis client singleton (ioredis)
│   ├── s3.ts                         # S3 client + presigned URL helpers
│   ├── analytics.ts                  # Analytics event helpers (server-side)
│   ├── ai.ts                         # OpenAI client wrapper
│   ├── sqs.ts                        # SQS client + job queue helpers
│   ├── rate-limit.ts                 # Rate limiting logic using Redis
│   ├── audit.ts                      # Audit log writer helper
│   ├── email.ts                      # Email sender (AWS SES)
│   ├── stripe.ts                     # Stripe client + webhook helpers
│   ├── validations/                  # Zod schema definitions
│   │   ├── organizations.ts          # Organization CRUD schemas
│   │   ├── leads.ts                  # Lead CRUD + filter schemas
│   │   ├── projects.ts               # Project CRUD schemas
│   │   ├── websites.ts               # Website + page + theme schemas
│   │   ├── analytics.ts              # Analytics event schema
│   │   └── blog.ts                   # Blog post + category schemas
│   └── utils/
│       ├── slugify.ts                # URL-safe slug generator
│       ├── paginate.ts               # Pagination helper for Prisma queries
│       ├── format.ts                 # Date, currency, number formatters
│       └── seo.ts                    # SEO metadata builders
│
├── hooks/                            # React hooks (client components)
│   ├── useTenant.ts                  # Read current tenant config from context
│   ├── useLeads.ts                   # SWR hook for leads with infinite scroll
│   ├── useAnalytics.ts               # Analytics dashboard data hook
│   └── useMediaUpload.ts             # File upload hook: presigned URL + progress
│
├── contexts/
│   ├── TenantContext.tsx             # React context for tenant config in RSC-to-client bridge
│   └── NotificationContext.tsx       # Toast notification state
│
├── types/
│   ├── tenant.ts                     # TenantConfig, TenantTheme types
│   ├── api.ts                        # API response envelope types
│   └── index.ts                      # Re-exports
│
└── public/
    ├── favicon.ico                   # Default favicon (overridden per tenant)
    ├── robots.txt                    # Default robots.txt (wildcard deny; tenant-specific served dynamically)
    └── images/
        └── placeholder.jpg           # Default placeholder image
```

---

### apps/ai-service — Python FastAPI AI Service

```
apps/ai-service/
├── pyproject.toml                    # Poetry deps: fastapi, celery, playwright, openai, sqlalchemy
├── poetry.lock
├── Dockerfile                        # Multi-stage build: builder + runtime
├── .env.example                      # Environment variable template
│
├── app/
│   ├── main.py                       # FastAPI app factory: CORS, middleware, router registration
│   ├── config.py                     # Pydantic Settings: DATABASE_URL, REDIS_URL, OPENAI_API_KEY
│   ├── database.py                   # SQLAlchemy async engine + session factory
│   ├── dependencies.py               # FastAPI dependency injection: db session, auth header
│   │
│   ├── api/
│   │   ├── v1/
│   │   │   ├── router.py             # Aggregate all v1 routers
│   │   │   ├── health.py             # GET /health — readiness + liveness probes
│   │   │   ├── jobs.py               # GET /jobs, GET /jobs/{id} — job status endpoints
│   │   │   └── callbacks.py          # Internal callback endpoints from Celery workers
│   │
│   ├── tasks/                        # Celery task definitions
│   │   ├── celery_app.py             # Celery instance: SQS broker, Redis result backend
│   │   ├── lead_discovery.py         # Task: scrape leads from URLs/queries
│   │   ├── lead_scoring.py           # Task: score lead via OpenAI function calling
│   │   ├── email_drafting.py         # Task: generate personalized email drafts
│   │   ├── quote_generation.py       # Task: generate quote PDF from project data
│   │   └── chatbot.py                # Task: handle chatbot conversation turns
│   │
│   ├── scrapers/                     # Web scraping modules
│   │   ├── base.py                   # BaseScraper: Playwright browser manager
│   │   ├── linkedin.py               # LinkedIn company/people search scraper
│   │   ├── google_maps.py            # Google Maps business scraper
│   │   ├── yelp.py                   # Yelp business directory scraper
│   │   └── normalizer.py             # Raw scrape data → normalized lead fields
│   │
│   ├── ai/                           # AI integration modules
│   │   ├── openai_client.py          # OpenAI client wrapper with retry logic
│   │   ├── scoring_prompt.py         # Prompt templates for lead scoring
│   │   ├── email_prompt.py           # Prompt templates for email drafting
│   │   ├── quote_prompt.py           # Prompt templates for quote generation
│   │   └── chatbot_chain.py          # LangChain chain for chatbot conversations
│   │
│   ├── models/                       # SQLAlchemy ORM models (mirrors Prisma schema)
│   │   ├── organization.py           # Organization model
│   │   ├── lead.py                   # Lead, LeadNote, AiLeadScore models
│   │   ├── scraping.py               # ScrapingJob, ScrapedLead models
│   │   └── base.py                   # Base model with id/created_at/updated_at
│   │
│   └── utils/
│       ├── logging.py                # Structured JSON logging (CloudWatch)
│       ├── sqs.py                    # SQS consumer and publisher helpers
│       ├── retry.py                  # Exponential backoff decorator
│       └── security.py               # HMAC validation for internal webhooks
│
└── tests/
    ├── conftest.py                   # Pytest fixtures: async db, mock OpenAI
    ├── test_lead_discovery.py        # Unit tests for scraping + normalization
    ├── test_lead_scoring.py          # Unit tests for scoring prompt + response parsing
    └── test_email_drafting.py        # Unit tests for email generation
```

---

### packages/db — Prisma Database Package

```
packages/db/
├── package.json                      # Exports Prisma client, types, utilities
├── tsconfig.json                     # Extends @construction-saas/config/tsconfig/base.json
│
├── prisma/
│   ├── schema.prisma                 # Full Prisma schema (all 26 models)
│   ├── migrations/                   # Auto-generated migration files
│   │   ├── 20250101000001_init/
│   │   │   └── migration.sql         # Initial schema migration
│   │   ├── 20250101000002_add_rls/
│   │   │   └── migration.sql         # RLS policies + roles + grants
│   │   └── 20250101000003_seed_roles/
│   │       └── migration.sql         # System roles + permissions seed
│   └── seed.ts                       # Development seed: demo org, users, projects
│
└── src/
    ├── client.ts                     # Prisma client singleton (edge-compatible)
    ├── tenant-client.ts              # getTenantClient(orgId): tenant-scoped Prisma extension
    ├── admin-client.ts               # getAdminClient(): BYPASSRLS client for SuperAdmin
    ├── types.ts                      # Re-exported Prisma generated types
    └── utils/
        ├── paginate.ts               # buildPaginationArgs(page, perPage) helper
        └── rls.ts                    # setTenantContext(prisma, orgId) helper
```

---

### packages/ui — Shared Component Library

```
packages/ui/
├── package.json                      # Peer deps: react, tailwindcss
├── tsconfig.json
├── tailwind.config.ts                # Extends base config; exports for consuming apps
│
└── src/
    ├── index.ts                      # Re-exports all components
    ├── components/
    │   ├── Button/
    │   │   ├── Button.tsx            # Button variants: primary, secondary, ghost, danger
    │   │   └── Button.stories.tsx    # Storybook story
    │   ├── Input/
    │   │   ├── Input.tsx             # Form input with error state, helper text
    │   │   └── Textarea.tsx          # Textarea variant
    │   ├── Select/
    │   │   └── Select.tsx            # Select dropdown (Radix UI based)
    │   ├── Modal/
    │   │   └── Modal.tsx             # Accessible modal (Radix Dialog)
    │   ├── Table/
    │   │   └── Table.tsx             # Sortable, paginated data table
    │   ├── Badge/
    │   │   └── Badge.tsx             # Status badge: color variants by status
    │   ├── Card/
    │   │   └── Card.tsx              # Card container with header/body/footer
    │   ├── Tabs/
    │   │   └── Tabs.tsx              # Tab group (Radix Tabs)
    │   ├── Toast/
    │   │   └── Toast.tsx             # Toast notification (Radix Toast)
    │   ├── Avatar/
    │   │   └── Avatar.tsx            # User avatar with initials fallback
    │   ├── Spinner/
    │   │   └── Spinner.tsx           # Loading spinner with size variants
    │   ├── EmptyState/
    │   │   └── EmptyState.tsx        # Empty state with icon + CTA
    │   ├── DataTable/
    │   │   └── DataTable.tsx         # TanStack Table wrapper with sorting/filtering
    │   └── PageHeader/
    │       └── PageHeader.tsx        # Page title + breadcrumb + action button
    │
    └── utils/
        ├── cn.ts                     # clsx + tailwind-merge utility function
        └── variants.ts               # CVA variant definitions for component props
```

---

### packages/analytics — Analytics SDK

```
packages/analytics/
├── package.json
├── tsconfig.json
│
└── src/
    ├── index.ts                      # Re-exports browser and server SDKs
    ├── browser/
    │   ├── index.ts                  # Browser SDK: page_view, click, form_submit events
    │   ├── tracker.ts                # Core tracker: visitor ID (fingerprint), session management
    │   ├── queue.ts                  # Event queue: batches events, flushes on timeout or count
    │   ├── consent.ts                # Consent manager: respects cookie consent before tracking
    │   └── types.ts                  # Browser event type definitions
    ├── server/
    │   ├── index.ts                  # Server SDK: track events from API routes (Kinesis)
    │   ├── kinesis.ts                # Kinesis Data Streams publisher
    │   └── types.ts                  # Server event type definitions
    └── shared/
        ├── events.ts                 # Shared event type constants
        └── utils.ts                  # Shared utilities: hash IP, generate visitor ID
```

---

### packages/config — Shared Configurations

```
packages/config/
├── package.json
│
├── eslint/
│   ├── base.js                       # Base ESLint: TypeScript, import order rules
│   ├── nextjs.js                     # Next.js specific ESLint rules
│   └── react.js                      # React hooks, accessibility rules
│
├── typescript/
│   ├── base.json                     # Base tsconfig: strict, paths
│   ├── nextjs.json                   # Next.js tsconfig extends base
│   └── node.json                     # Node.js tsconfig for packages
│
└── tailwind/
    └── base.ts                       # Base Tailwind config: colors, fonts, breakpoints
```

---

### infrastructure/terraform — AWS Infrastructure

```
infrastructure/terraform/
├── main.tf                           # Root module: provider config, backend (S3 + DynamoDB)
├── variables.tf                      # Input variables: environment, region, domain names
├── outputs.tf                        # Outputs: ALB DNS, RDS endpoint, CloudFront IDs
├── terraform.tfvars.example          # Example variable values (not committed)
│
├── modules/
│   ├── vpc/
│   │   ├── main.tf                   # VPC, subnets (public/private/data), IGW, NAT GW
│   │   ├── variables.tf              # Module inputs: CIDR blocks, AZ count
│   │   └── outputs.tf                # VPC ID, subnet IDs, route table IDs
│   ├── ecs/
│   │   ├── main.tf                   # ECS cluster, task definitions, services, auto-scaling
│   │   ├── alb.tf                    # Application Load Balancer + target groups + listeners
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── rds/
│   │   ├── main.tf                   # RDS PostgreSQL instance, parameter group, subnet group
│   │   ├── replica.tf                # Read replica configuration
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── elasticache/
│   │   ├── main.tf                   # ElastiCache Redis cluster, subnet group
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── s3/
│   │   ├── main.tf                   # S3 buckets: media, logs, backups; lifecycle rules
│   │   ├── policies.tf               # Bucket policies: tenant prefix scoping
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── cloudfront/
│   │   ├── main.tf                   # CloudFront distributions: main, admin, assets
│   │   ├── waf.tf                    # WAF WebACL: rate limiting, OWASP rules
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── route53/
│   │   ├── main.tf                   # Hosted zones, wildcard records, health checks
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── acm/
│   │   ├── main.tf                   # Wildcard cert + per-tenant custom domain certs
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── kinesis/
│   │   ├── main.tf                   # Kinesis Data Stream: shards, retention
│   │   ├── lambda.tf                 # Lambda consumer + event source mapping
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── sqs/
│   │   ├── main.tf                   # SQS queues: ai-jobs, email, scraping, DLQ configs
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── secrets/
│   │   ├── main.tf                   # Secrets Manager secrets: DB, Redis, API keys
│   │   ├── variables.tf
│   │   └── outputs.tf
│   └── monitoring/
│       ├── main.tf                   # CloudWatch dashboards, log groups, metric filters
│       ├── alarms.tf                 # CloudWatch alarms: CPU, memory, error rate, latency
│       ├── variables.tf
│       └── outputs.tf
│
└── environments/
    ├── dev/
    │   └── terraform.tfvars          # Dev environment variable overrides
    ├── staging/
    │   └── terraform.tfvars          # Staging environment variable overrides
    └── production/
        └── terraform.tfvars          # Production environment variable overrides
```

---

### infrastructure/docker — Dockerfiles

```
infrastructure/docker/
├── web.Dockerfile                    # Multi-stage Next.js: deps → builder → runner (node:20-alpine)
├── ai-service.Dockerfile             # Multi-stage FastAPI: base → builder → runtime (python:3.12-slim)
└── nginx/
    └── nginx.conf                    # Nginx config for local dev reverse proxy (optional)
```

---

### .github/workflows — CI/CD Pipelines

```
.github/
└── workflows/
    ├── ci.yml                        # CI: lint, typecheck, test on all PRs
    ├── deploy-staging.yml            # Deploy to staging on push to 'develop' branch
    ├── deploy-production.yml         # Deploy to production on push to 'main' branch (manual approval)
    ├── db-migrate.yml                # Run Prisma migrations (triggered by deploy workflows)
    ├── security-scan.yml             # Weekly: Trivy vulnerability scan, npm audit
    └── terraform-plan.yml            # Terraform plan on infrastructure PRs
```

---

### Root Configuration Files

```
construction-saas/
├── package.json                      # pnpm workspace root: scripts, engines
├── pnpm-workspace.yaml               # Workspace package globs
├── turbo.json                        # Turborepo pipeline: build, lint, test, typecheck
├── .env.example                      # All environment variable keys (no values)
├── .gitignore                        # Node, Python, Terraform, .env exclusions
├── .prettierrc                       # Prettier formatting config
└── docker-compose.yml                # Local dev: postgres, redis, localstack (S3/SQS/Kinesis)
```
