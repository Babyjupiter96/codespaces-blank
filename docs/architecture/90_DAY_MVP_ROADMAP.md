# 90-Day MVP Roadmap — Multi-Tenant Construction SaaS

## Overview

This roadmap covers the full 24-week (6-month) build-out from zero to production launch, with the first 12 weeks representing the "90-day MVP" core and weeks 13-24 covering AI features, polish, and hardening.

### Team

| Role                 | Count | Responsibilities                                                        |
|----------------------|:-----:|-------------------------------------------------------------------------|
| Cloud / DevOps Eng   | 1     | AWS infrastructure, Terraform, CI/CD, monitoring, database ops          |
| Frontend Engineer    | 1-2   | Next.js app router, React components, UI library, tenant microsites      |
| Backend Engineer     | 1     | API routes, Prisma, auth, webhooks, SQS integration, analytics pipeline  |
| AI / Python Engineer | 1     | FastAPI service, Celery, OpenAI integration, web scraping, lead scoring  |

### Cost Tracking

AWS costs estimated throughout. Refer to AWS_INFRASTRUCTURE.md for full pricing breakdown.

---

## Week 1-2: Infrastructure Setup + Monorepo Scaffold

### Cloud Engineer

**Terraform — Core Infrastructure**
- [ ] AWS account setup: Organizations, SSO, IAM Identity Center
- [ ] Terraform remote state: S3 bucket + DynamoDB lock table
- [ ] Terraform modules: VPC, security groups, NAT Gateways (3 AZs)
- [ ] RDS PostgreSQL: MVP instance (db.r6g.large, Multi-AZ disabled for dev)
- [ ] ElastiCache Redis: single node (cache.r6g.large)
- [ ] ECR repositories: web, ai-service
- [ ] Secrets Manager: initial secrets structure
- [ ] Route53: hosted zone for buildpro.com
- [ ] ACM: wildcard certificate for *.buildpro.com
- [ ] `dev` Terraform workspace complete and applied

**Deliverables:**
- VPC, RDS, Redis accessible from developer machines via bastion or VPN
- Terraform apply runs cleanly for `dev` environment

### Frontend Engineer

**Monorepo Scaffold**
- [ ] Initialize pnpm workspace with Turborepo
- [ ] `packages/config`: ESLint, TypeScript, Tailwind base configs
- [ ] `packages/ui`: empty component library with Button, Input stubs
- [ ] `apps/web`: Next.js 14 app router project initialized
- [ ] `apps/web`: Tailwind configured, globals.css baseline
- [ ] Docker: `web.Dockerfile` multi-stage build
- [ ] Local dev: `docker-compose.yml` with postgres, redis, localstack
- [ ] GitHub Actions: CI workflow (lint + typecheck on PR)

### Backend Engineer

**Database Foundation**
- [ ] `packages/db`: Prisma initialized, PostgreSQL provider configured
- [ ] Initial schema: organizations, users, roles, permissions tables
- [ ] `prisma migrate dev` working against local database
- [ ] Seed script: create system roles, default permissions
- [ ] `packages/db/src/client.ts`: Prisma singleton
- [ ] `packages/db/src/tenant-client.ts`: tenant-scoped Prisma extension
- [ ] RLS policies migration: enable RLS on all tenant tables

**Definition of Done:**
- `pnpm dev` starts Next.js with hot reload
- `docker-compose up` gives complete local environment
- `pnpm turbo run typecheck lint` passes with no errors
- Terraform `dev` environment deployed and healthy

**Estimated AWS Cost: $0** (all local dev; no production infra yet)

---

## Week 3-4: Auth + Tenant System + Database

### Cloud Engineer
- [ ] ECS Cluster: provisioned in dev environment
- [ ] ALB: configured with HTTPS listener (dev cert)
- [ ] ECS Task Definition: web service (with Secrets Manager integration)
- [ ] GitHub Actions: `deploy-staging.yml` pipeline (build → push ECR → update ECS)
- [ ] CloudWatch: log groups, basic alarms

### Frontend Engineer

**Auth Integration (Clerk)**
- [ ] Clerk application created (dev + production environments)
- [ ] `@clerk/nextjs` integrated into Next.js app
- [ ] Middleware: Clerk auth + tenant resolution skeleton
- [ ] Protected route groups: `(dashboard)`, `(admin)`
- [ ] Auth UI: Sign-in, Sign-up pages using Clerk components
- [ ] Organization selection UI (for multi-org users)

**Admin Dashboard Foundation**
- [ ] Admin layout: sidebar navigation, header with user menu
- [ ] Admin home page: placeholder with org count card
- [ ] Tenant list page: table skeleton (no data yet)

### Backend Engineer

**Tenant System + Full Schema**
- [ ] Complete Prisma schema (all 26 models from schema.prisma)
- [ ] All migrations applied: organizations, subscriptions, websites, members
- [ ] RLS policies: all 20+ tenant tables covered
- [ ] `GET /api/v1/auth/me` endpoint
- [ ] Clerk webhook handler: user.created, user.updated, org events
- [ ] `POST /api/v1/organizations` (SuperAdmin only)
- [ ] Tenant resolution middleware: subdomain + custom domain logic
- [ ] Redis integration: tenant config caching

**Tenant Onboarding API**
- [ ] `POST /api/v1/organizations` creates org + default website + theme + pages
- [ ] Organization member invite flow (Clerk org invitation API)
- [ ] Clerk webhook: sync invitation acceptance to organization_members

**Definition of Done:**
- Sign in with Clerk works; JWT validates correctly
- Creating an org via API creates all default records in DB
- Subdomain resolution works: `test.localhost` resolves to test tenant
- All Clerk webhook events processed correctly (tested via CLI)

**Estimated AWS Cost: ~$200/mo** (dev ECS + dev RDS; no prod yet)

---

## Week 5-6: Main Corporate Website

### Frontend Engineer

**Operator Marketing Site (buildpro.com)**
- [ ] Marketing layout: responsive header, footer
- [ ] Homepage: hero section, features overview, pricing teaser, CTA
- [ ] Pricing page: plan comparison table (3 tiers)
- [ ] About page: team, mission statement
- [ ] Marketing site is statically generated (no tenant context)

**Tenant Dashboard — Organization Settings**
- [ ] General settings form: name, logo upload, contact info
- [ ] Member management: list members, invite modal, role change
- [ ] Billing page: current plan, usage stats (read-only in MVP)

### Backend Engineer

**Organization Management API**
- [ ] `GET/PATCH /api/v1/organizations/:id`
- [ ] `GET /api/v1/organizations/:id/members`
- [ ] `POST /api/v1/organizations/:id/members/invite`
- [ ] `PATCH /api/v1/organizations/:id/members/:userId` (role update)
- [ ] `DELETE /api/v1/organizations/:id/members/:userId`
- [ ] `GET /api/v1/organizations/:id/subscription/usage` (quota tracking)
- [ ] Input validation: Zod schemas for all org endpoints
- [ ] Audit logging: all member and settings changes logged

**Definition of Done:**
- Marketing site live at buildpro.com (via staging CloudFront)
- Dashboard settings page allows logo/contact info update
- Member invite flow works end-to-end (invite → email → accept → logged in)
- All org API endpoints return correct responses with proper error codes

**Estimated AWS Cost: ~$400/mo** (staging environment live, similar spec to MVP)

---

## Week 7-8: Tenant Microsite Engine

### Frontend Engineer

**Tenant Public Microsite (*.buildpro.com)**
- [ ] Tenant layout: dynamic theme CSS variables from config
- [ ] Theme-aware navigation: logo, nav links from website config
- [ ] Homepage template: hero, featured projects, testimonials, contact CTA
- [ ] Projects gallery page: masonry grid, filter by type, ISR
- [ ] Single project page: image lightbox, description, metadata, ISR
- [ ] Contact page: lead capture form (frontend form component)
- [ ] 404 page: tenant-branded not found
- [ ] Dynamic sitemap route handler per tenant
- [ ] Dynamic robots.txt route handler per tenant

**components/tenant/**
- [ ] `ProjectGallery.tsx`: masonry grid with hover effects
- [ ] `ProjectCard.tsx`: image, title, type badge, location
- [ ] `LeadForm.tsx`: contact/quote form with client-side validation
- [ ] `TenantNav.tsx`: reads theme config, renders brand nav
- [ ] `TenantFooter.tsx`: brand footer with contact + social links
- [ ] `SectionRenderer.tsx`: renders page content blocks (hero, text, CTA)
- [ ] `JsonLd.tsx`: JSON-LD schema injection component

### Backend Engineer

**Website & Pages API**
- [ ] `GET/POST /api/v1/websites`
- [ ] `PATCH /api/v1/websites/:id`
- [ ] `POST /api/v1/websites/:id/publish`
- [ ] `GET/POST /api/v1/websites/:id/pages`
- [ ] `GET/PATCH/DELETE /api/v1/websites/:id/pages/:pageId`
- [ ] `GET/POST /api/v1/websites/:id/themes`
- [ ] `PATCH /api/v1/websites/:id/themes/:id`
- [ ] Public API: `GET /api/public/projects`, `GET /api/public/projects/:slug`

**Form Submission API**
- [ ] `POST /api/public/forms/submit` (public, no auth)
- [ ] Spam detection: Akismet or simple heuristic scoring
- [ ] Lead creation from form submission (deduplication by email)
- [ ] Email notification to tenant admin on new lead
- [ ] `form_submissions` record created with UTM params

**Definition of Done:**
- Navigating to `{slug}.buildpro.com` renders the tenant's branded microsite
- Project gallery loads and links to individual project pages
- Contact form submits and creates a lead record in the database
- ISR revalidation works: updating a project in admin triggers page refresh
- Sitemap is valid XML with all published content URLs

**Estimated AWS Cost: ~$400/mo** (staging, same as previous)

---

## Week 9-10: Admin Dashboard (Basic)

### Frontend Engineer

**Admin Dashboard — SuperAdmin**
- [ ] Tenant list: table with name, slug, plan, status, member count, created date
- [ ] Tenant detail: org info, usage stats, subscription status
- [ ] Tenant create: form to onboard new tenant
- [ ] Tenant suspend: confirm dialog + API call
- [ ] Cross-tenant stats panel: total tenants, total leads, total revenue

**Tenant Dashboard — Website Builder**
- [ ] Page manager: list pages, drag to reorder, status badge
- [ ] Block-based page editor (simplified): edit hero text, add sections
- [ ] Theme editor: color pickers, font selectors, logo upload with preview
- [ ] Website settings: title, tagline, social links, analytics ID
- [ ] Domain setup wizard: enter custom domain, show DNS instructions

**components/ui/** (packages/ui)
- [ ] `DataTable.tsx`: TanStack Table with sorting, pagination
- [ ] `ColorPicker.tsx`: hex color input with preview swatch
- [ ] `ImageUploader.tsx`: drag-and-drop + presigned upload + preview
- [ ] `DomainSetupWizard.tsx`: multi-step wizard component

### Backend Engineer

**Admin API**
- [ ] `GET /api/v1/admin/organizations` (SuperAdmin list with stats)
- [ ] `POST /api/v1/admin/organizations/:id/suspend`
- [ ] `GET /api/v1/admin/stats` (platform-wide metrics)
- [ ] Admin middleware: verify SuperAdmin role for all `/api/v1/admin/*`

**Media API**
- [ ] `POST /api/v1/media/upload-url` (presigned S3 PUT URL)
- [ ] `POST /api/v1/media/:id/confirm` (mark upload complete)
- [ ] Lambda: S3 event → image optimization (resize, WebP) via Sharp
- [ ] `GET /api/v1/media` (list assets with pagination)
- [ ] `PATCH /api/v1/media/:id` (update alt text, folder)
- [ ] `DELETE /api/v1/media/:id` (S3 delete + DB delete)

**Definition of Done:**
- SuperAdmin can view all tenants, create new ones, suspend existing
- Tenant admin can edit their website theme and pages from the dashboard
- Image upload flow works: drag file → presigned URL → S3 upload → CloudFront CDN URL
- Theme changes live-preview before save

---

## Week 11-12: Analytics Pipeline

### Cloud Engineer

**Kinesis + Lambda Infrastructure**
- [ ] Kinesis Data Stream: 2 shards, us-east-1
- [ ] Lambda: `analytics-event-processor` (Node.js 20, VPC, private subnet)
- [ ] Lambda event source mapping: Kinesis → Lambda (batch 1000 records, 10s window)
- [ ] Analytics DLQ: SQS for failed Lambda batches
- [ ] CloudWatch: Kinesis metrics dashboard, Lambda error alarm
- [ ] Lambda partition creator: EventBridge rule, creates monthly analytics partitions

### Frontend Engineer

**Analytics Dashboard (Tenant)**
- [ ] `packages/analytics`: browser SDK (visitor ID, page_view tracking, form_submit)
- [ ] Consent management: cookie banner (functional/analytics/marketing)
- [ ] Analytics dashboard page: pageviews chart, unique visitors, top pages
- [ ] Analytics sources breakdown: pie chart (direct, organic, social, referral)
- [ ] Date range selector: last 7d, 30d, 90d, custom
- [ ] Session list: recent sessions with device type, country, pages viewed

**PostHog Integration**
- [ ] PostHog project created (product analytics)
- [ ] PostHog browser SDK integrated (respects consent)
- [ ] Key events tracked: page_view, project_viewed, form_submitted, lead_created

### Backend Engineer

**Analytics API**
- [ ] `POST /api/v1/analytics/events` (event ingestion → Kinesis)
- [ ] `GET /api/v1/analytics/dashboard` (aggregate metrics from RDS)
- [ ] `GET /api/v1/analytics/pageviews` (timeseries data)
- [ ] `GET /api/v1/analytics/sources` (UTM source breakdown)
- [ ] `GET /api/v1/analytics/leads/funnel` (form submission → lead → qualified)
- [ ] Redis caching for analytics aggregates (5-minute TTL)
- [ ] Analytics queries route to read replica

**Definition of Done:**
- Page view events tracked and stored in `analytics_events` (partitioned table)
- Kinesis Lambda processes events with < 30-second latency
- Analytics dashboard shows real pageview data for demo tenant
- Cookie consent banner shows and blocks tracking until consent given
- Monthly partition created automatically by Lambda

**Estimated AWS Cost: ~$500/mo** (production environment provisioned)

---

## Week 13-16: Lead Management + CRM

### Frontend Engineer

**Leads CRM Dashboard**
- [ ] Lead list page: table with search, filter by status/source/assigned
- [ ] Kanban board view: drag cards between pipeline stages
- [ ] Lead detail page: contact info, notes timeline, AI score badge, activity feed
- [ ] Add lead note: rich text input with note type selector (note/call/email/meeting)
- [ ] Lead edit form: all fields, status/stage selectors, assignment dropdown
- [ ] Lead import wizard: CSV upload, column mapping, preview 10 rows, confirm
- [ ] Lead export: filter → download CSV
- [ ] Batch operations: select multiple leads, bulk status change

**components/dashboard/LeadKanban.tsx**
- [ ] Drag-and-drop using `@dnd-kit/core`
- [ ] Columns represent pipeline stages (configurable)
- [ ] Card shows: name, company, score badge, assigned avatar, last activity
- [ ] Drag between columns triggers `PATCH /api/v1/leads/:id` (pipelineStage update)

### Backend Engineer

**Leads API — Complete**
- [ ] `GET /api/v1/leads` with full filter/sort/search/pagination
- [ ] `POST /api/v1/leads` with deduplication (email match)
- [ ] `GET /api/v1/leads/:id` (with notes and AI scores)
- [ ] `PATCH /api/v1/leads/:id`
- [ ] `DELETE /api/v1/leads/:id` (OrgAdmin only)
- [ ] `GET/POST /api/v1/leads/:id/notes`
- [ ] `PATCH/DELETE /api/v1/leads/:id/notes/:noteId`
- [ ] `POST /api/v1/leads/import/csv` (parse CSV, validate, batch create)
- [ ] `GET /api/v1/leads/export` (CSV download with filters)
- [ ] Audit logging for all lead mutations

**Definition of Done:**
- Leads can be created manually, via form, and via CSV import
- Kanban drag-and-drop updates pipeline stage in DB
- Lead notes with different types (call, email, etc.) display in chronological order
- CSV export downloads correctly with applied filters

**Estimated AWS Cost: ~$500/mo** (production; same infrastructure)

---

## Week 17-20: AI Features

### Cloud Engineer
- [ ] SQS queues: ai-jobs, ai-jobs-dlq, scraping-jobs
- [ ] ECS: FastAPI ai-service task definition and service
- [ ] Celery worker: ECS task running `celery worker` command
- [ ] IAM: ai-service task role with S3, SQS, Secrets Manager access
- [ ] Monitoring: SQS queue depth alarm, Celery worker heartbeat metric

### AI / Python Engineer

**FastAPI AI Service Setup**
- [ ] FastAPI app: health endpoints, Celery integration, SQLAlchemy
- [ ] Celery: connected to SQS broker, Redis result backend
- [ ] OpenAI client: wrapper with retry logic and cost tracking
- [ ] `ai-service.Dockerfile`: multi-stage, Python 3.12, Playwright browsers

**Lead Scoring Task**
- [ ] Celery task: `score_lead(lead_id, org_id)`
- [ ] Prompt engineering: extract lead signals, score 0-100 with reasoning
- [ ] Write result to `ai_lead_scores` table
- [ ] Update `leads.score` and `leads.score_reason`
- [ ] Callback: notify Next.js webhook handler (result ready)

**Lead Discovery (Web Scraping)**
- [ ] Playwright-based scraper: Google Maps business search
- [ ] LinkedIn company search (respectful, within robots.txt)
- [ ] Data normalizer: extract name, email, phone, company from raw HTML
- [ ] Deduplication: check email against existing leads before adding
- [ ] Write to `scraped_leads` table

**Email Drafting Task**
- [ ] GPT-4o prompt: generate personalized outreach email
- [ ] Input: lead profile + tenant business context
- [ ] Output: subject line + email body (2 variations)
- [ ] Save drafts to lead notes (note_type='email', content=draft)

### Frontend Engineer

**AI Features Dashboard**
- [ ] Lead score badge: color-coded (0-40 red, 41-70 yellow, 71-100 green)
- [ ] "Score with AI" button on lead detail page
- [ ] Lead discovery page: search form, progress indicator, results review table
- [ ] Import approval: approve/reject scraped leads one-by-one or bulk
- [ ] Email drafting: "Draft Email" button on lead detail, show 2 variations
- [ ] AI usage meter: show credits used vs monthly limit

### Backend Engineer

**AI API**
- [ ] `POST /api/v1/ai/leads/:id/score` (enqueue scoring job)
- [ ] `GET /api/v1/ai/leads/:id/scores` (score history)
- [ ] `POST /api/v1/ai/lead-discovery` (create scraping job)
- [ ] `GET /api/v1/ai/lead-discovery/:jobId` (job status)
- [ ] `GET /api/v1/ai/lead-discovery/:jobId/results` (scraped leads list)
- [ ] `POST /api/v1/ai/lead-discovery/:jobId/import/:leadId` (approve lead)
- [ ] `POST /api/v1/ai/leads/:id/draft-email` (enqueue email drafting)
- [ ] Feature gate: check plan allows AI features before enqueuing
- [ ] Quota tracking: count AI calls vs plan limit per month

**Definition of Done:**
- Click "Score with AI" → score appears within 30 seconds
- Lead discovery job runs, returns 10+ scraped leads for review
- Email drafting generates a plausible outreach email in < 15 seconds
- All AI features blocked on Starter plan with upgrade prompt

**Estimated AWS Cost: ~$550/mo** (adds ECS ai-service tasks, SQS)

---

## Week 21-24: Polish, Testing, Hardening, Launch

### Cloud Engineer

**Production Infrastructure**
- [ ] Production Terraform workspace: Multi-AZ RDS, production ECS, production CloudFront
- [ ] WAF: production WebACL with all rules enabled
- [ ] CloudFront distributions: production with custom error pages
- [ ] RDS: automated backups enabled, Performance Insights enabled
- [ ] Disaster recovery runbook: RDS failover procedure documented
- [ ] Penetration testing: external pentest scoped to API + web surfaces
- [ ] AWS Trusted Advisor review: security, cost optimization recommendations
- [ ] Alert escalation: PagerDuty integration for CRITICAL CloudWatch alarms
- [ ] CloudWatch dashboard: production overview with all key metrics

### Frontend Engineer

**Blog Module**
- [ ] Blog post list: paginated, category filter, tag filter
- [ ] Blog post page: rendered content, author bio, related posts, social share
- [ ] Blog editor: rich text editor (Tiptap), SEO meta fields, schedule publish
- [ ] Category manager: create/edit/delete blog categories
- [ ] SEO validation in editor UI: title length, meta description, readability

**Tenant Microsite Enhancements**
- [ ] Services page template: service cards with icons, descriptions, CTA
- [ ] About page template: team section, mission statement, stats
- [ ] Testimonials component: star ratings, client quotes carousel
- [ ] Local SEO footer: NAP data, Google Maps embed
- [ ] GDPR cookie consent banner: complete implementation
- [ ] Accessibility audit: pass WCAG 2.1 AA (use axe-core in CI)

**Performance Hardening**
- [ ] Lighthouse CI: integrate in GitHub Actions, enforce score > 85 mobile
- [ ] Bundle analysis: `next bundle-analyzer` review, reduce JS bundle
- [ ] Core Web Vitals: measure LCP, CLS, INP on demo tenant; hit targets

### Backend Engineer

**Polish + Hardening**
- [ ] Rate limiting: Redis sliding window on all API endpoint groups
- [ ] GDPR endpoints: `GET /api/v1/gdpr/export`, `POST /api/v1/gdpr/erase`
- [ ] Audit log viewer: admin UI to browse audit trail
- [ ] Notification system: in-app notifications for new leads, AI job results
- [ ] Stripe integration: subscription upgrade/downgrade, billing portal
- [ ] Webhook: Stripe subscription events → update subscription status
- [ ] API key management: create, rotate, revoke API keys
- [ ] `POST /api/v1/organizations/:id/subscription/portal` (Stripe portal link)

**Testing**
- [ ] Unit tests: all utility functions, Zod validators
- [ ] Integration tests: all API endpoints (happy path + error cases)
- [ ] E2E tests: Playwright (tenant creation → website publish → lead form → CRM)
- [ ] Load test: k6 script, 100 concurrent users on demo tenant
- [ ] RLS test suite: verify cross-tenant isolation in CI

**Launch Checklist**
- [ ] DNS: production Route53 configured, buildpro.com pointing to production CloudFront
- [ ] SSL: production ACM wildcard cert active
- [ ] Monitoring: all CloudWatch alarms configured and tested
- [ ] Runbooks: incident response, deployment, RDS failover
- [ ] Data backup: RDS automated backup verified with restore test
- [ ] Security: dependency audit clean, no HIGH/CRITICAL CVEs
- [ ] Performance: all Lighthouse targets passing on production demo tenant
- [ ] Documentation: user docs for tenant admin, operator admin
- [ ] Soft launch: 2-3 pilot tenants onboarded for validation
- [ ] Production launch: DNS switched, monitoring active

**Definition of Done (Launch):**
- Platform serving 3+ pilot tenants on production
- Zero P0 bugs in 72 hours of operation
- All CloudWatch alarms in OK state
- Lighthouse mobile score > 85 on all tenant page types
- Backup restore tested successfully

**Estimated AWS Cost: ~$495/mo** (production MVP as per cost estimate)

---

## Risk Register

| Risk                                 | Likelihood | Impact | Mitigation                                           |
|--------------------------------------|:----------:|:------:|------------------------------------------------------|
| Clerk JWT validation latency         | Low        | High   | Cache JWKS in Redis; use edge middleware              |
| RLS misconfiguration allows data leak | Low       | Critical | Automated RLS tests in CI; pentest before launch   |
| OpenAI API rate limits               | Medium     | Medium | Implement exponential backoff; queue AI jobs         |
| Kinesis shard hot partition          | Low        | Medium | Use org_id as partition key (good distribution)      |
| CloudFront caching stale tenant pages | Medium    | Low    | On-demand revalidation via `revalidatePath()`        |
| Custom domain ACM cert timeout       | Medium     | Low    | Lambda polling + tenant notification for delays      |
| ECS task cold start latency          | Low        | Low    | Min 2 tasks always running; no scale-to-zero         |
| PostgreSQL connection exhaustion      | Medium     | High   | PgBouncer in front of RDS; monitor connections       |
| AI scraping blocked by target sites  | High       | Low    | Graceful fallback; respect robots.txt; rotate UAs    |
| Scope creep (feature requests)       | High       | Medium | Strict sprint scope; new features deferred to backlog|

---

## AWS Cost Summary by Phase

| Phase                    | Weeks  | Estimated Monthly AWS Cost |
|--------------------------|--------|---------------------------|
| Local dev only           | 1-2    | $0                        |
| Dev environment live     | 3-4    | ~$200                     |
| Staging environment live | 5-10   | ~$400                     |
| Production provisioned   | 11-12  | ~$500                     |
| Production live (MVP)    | 13-24  | ~$495                     |

Notes:
- Development costs covered by personal AWS accounts + dev Terraform workspace
- Staging mirrors production at 50% scale (smaller RDS, 1 ECS task)
- Production pricing based on MVP tier (10 tenants) from AWS_INFRASTRUCTURE.md
- Costs increase proportionally with tenant count (see Growth/Scale tiers)
- Budget alert: CloudWatch billing alarm at $600/mo for MVP
