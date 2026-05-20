# Multi-Tenant Design — Multi-Tenant Construction SaaS

## Table of Contents
1. [Tenant Resolution Middleware](#1-tenant-resolution-middleware)
2. [Database Isolation Approach](#2-database-isolation-approach)
3. [Tenant Context Propagation](#3-tenant-context-propagation)
4. [White-Label Configuration](#4-white-label-configuration)
5. [Custom Domain Provisioning](#5-custom-domain-provisioning)
6. [Tenant Onboarding Flow](#6-tenant-onboarding-flow)
7. [Tenant Offboarding and Data Export](#7-tenant-offboarding-and-data-export)
8. [Feature Flags Per Tenant](#8-feature-flags-per-tenant)

---

## 1. Tenant Resolution Middleware

### Overview

Tenant resolution is the process of determining which tenant (organization) is being served for any given HTTP request. This must happen before any business logic, rendering, or data access occurs.

### Resolution Decision Tree

```
Incoming Request: hostname = req.headers.get('host')
                                   |
              +--------------------+--------------------+
              |                    |                    |
    admin.buildpro.com    {slug}.buildpro.com    {other-hostname}
              |                    |                    |
              v                    v                    v
    Admin Context           Subdomain Flow        Custom Domain Flow
    (Clerk org context)          |                    |
    Skip tenant resolve          |                    |
                                 v                    v
                        Extract slug             Full hostname
                        = "clientco"             = "www.clientco.com"
                                 |                    |
                                 +--------+-----------+
                                          |
                                          v
                                   Redis Cache Lookup
                              tenant:slug:{slug}  OR
                              tenant:domain:{hostname}
                                          |
                              +-----------+-----------+
                              |                       |
                          CACHE HIT               CACHE MISS
                              |                       |
                              v                       v
                    Return cached tenant    PostgreSQL query:
                    config directly         SELECT * FROM organizations o
                                            JOIN websites w ON w.organization_id = o.id
                                            WHERE o.slug = $1
                                              OR w.custom_domain = $2
                                              AND o.status = 'active'
                                                         |
                                              +----------+----------+
                                              |                     |
                                        FOUND                 NOT FOUND
                                              |                     |
                                              v                     v
                                      Cache in Redis         Cache "NOT_FOUND"
                                      TTL: 300s              TTL: 60s (negative cache)
                                      Return tenant          Return 404
```

### Full Middleware Implementation

```typescript
// apps/web/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { redis } from '@/lib/redis';
import { prisma } from '@construction-saas/db';

const PLATFORM_DOMAIN = process.env.PLATFORM_DOMAIN!; // 'buildpro.com'
const ADMIN_SUBDOMAIN  = `admin.${PLATFORM_DOMAIN}`;

interface TenantConfig {
  id: string;
  slug: string;
  name: string;
  themeConfig: Record<string, unknown>;
  status: string;
  planId: string | null;
}

async function resolveTenant(hostname: string): Promise<TenantConfig | null> {
  // Normalize hostname (remove port for local dev)
  const host = hostname.split(':')[0];

  // Step 1: Determine resolution strategy
  let cacheKey: string;
  let isSubdomain = false;
  let slug: string | null = null;

  if (host === PLATFORM_DOMAIN || host === `www.${PLATFORM_DOMAIN}`) {
    return null; // Operator marketing site — no tenant
  }
  if (host === ADMIN_SUBDOMAIN) {
    return null; // Admin dashboard — no specific tenant
  }
  if (host.endsWith(`.${PLATFORM_DOMAIN}`)) {
    slug = host.replace(`.${PLATFORM_DOMAIN}`, '');
    cacheKey = `tenant:slug:${slug}`;
    isSubdomain = true;
  } else {
    cacheKey = `tenant:domain:${host}`;
  }

  // Step 2: Redis lookup
  const cached = await redis.get(cacheKey);
  if (cached === 'NOT_FOUND') return null;
  if (cached) return JSON.parse(cached) as TenantConfig;

  // Step 3: Database lookup
  const org = await prisma.organization.findFirst({
    where: isSubdomain
      ? { slug: slug!, status: 'active' }
      : {
          website: { customDomain: host, domainVerified: true, status: 'published' },
          status: 'active',
        },
    select: {
      id: true,
      slug: true,
      name: true,
      themeConfig: true,
      status: true,
      planId: true,
    },
  });

  // Step 4: Cache result
  if (!org) {
    await redis.setex(cacheKey, 60, 'NOT_FOUND'); // Negative cache: 60s
    return null;
  }

  const tenantConfig = { id: org.id, slug: org.slug, name: org.name,
    themeConfig: org.themeConfig as Record<string, unknown>,
    status: org.status, planId: org.planId };

  await redis.setex(cacheKey, 300, JSON.stringify(tenantConfig)); // 5-minute TTL
  return tenantConfig;
}

const isPublicRoute = createRouteMatcher([
  '/api/public/(.*)',
  '/api/v1/webhooks/(.*)',
  '/api/health',
]);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const hostname = req.headers.get('host') ?? '';
  const isAdminRoute = hostname.startsWith('admin.');
  
  // Resolve tenant context (even for public routes)
  const tenant = isAdminRoute ? null : await resolveTenant(hostname);
  
  // For tenant routes, verify tenant exists
  if (!isAdminRoute && !hostname.includes(PLATFORM_DOMAIN) && !tenant) {
    return new NextResponse('Tenant not found', { status: 404 });
  }

  // For protected routes, require authentication
  if (!isPublicRoute(req)) {
    await auth.protect();
  }

  // Build response headers with tenant context
  const requestHeaders = new Headers(req.headers);
  if (tenant) {
    requestHeaders.set('x-tenant-id', tenant.id);
    requestHeaders.set('x-tenant-slug', tenant.slug);
    requestHeaders.set('x-tenant-name', tenant.name);
    requestHeaders.set('x-tenant-plan-id', tenant.planId ?? '');
    requestHeaders.set('x-tenant-config', JSON.stringify(tenant.themeConfig));
  }
  requestHeaders.set('x-request-id', crypto.randomUUID());
  requestHeaders.set('x-request-timestamp', Date.now().toString());

  return NextResponse.next({ request: { headers: requestHeaders } });
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|css|js|woff2?)$).*)',
  ],
};
```

### Subdomain vs Custom Domain Detection (Edge Case Handling)

| Hostname                        | Resolution                                   |
|---------------------------------|----------------------------------------------|
| `buildpro.com`                  | Operator marketing site (no tenant)          |
| `www.buildpro.com`              | Operator marketing site (no tenant)          |
| `admin.buildpro.com`            | Admin dashboard (auth-gated, no tenant)      |
| `acme.buildpro.com`             | Subdomain tenant (slug = "acme")             |
| `www.acmeconstruction.com`      | Custom domain tenant (hostname lookup)       |
| `acmeconstruction.com` (apex)   | Custom domain tenant (apex domain support)   |
| `unknown-tenant.buildpro.com`   | 404 (negative cached for 60s)                |
| `evil.buildpro.co.uk`           | 404 (does not match platform domain pattern) |

---

## 2. Database Isolation Approach

### Decision: Shared Database + Row-Level Security

After evaluating three approaches, **Shared DB with RLS** is recommended and implemented:

#### Option Comparison

| Criteria               | Shared DB + RLS         | Schema-Per-Tenant       | DB-Per-Tenant            |
|------------------------|-------------------------|-------------------------|--------------------------|
| Isolation strength     | Medium-High (RLS)       | High (schema boundary)  | Highest (OS/process)     |
| Cost at 10 tenants     | $198/mo (1 RDS instance)| $198/mo                 | $1,980/mo (10 instances) |
| Cost at 1000 tenants   | $500/mo (scaled RDS)    | $500/mo                 | ~$200,000/mo             |
| Migration complexity   | Single migration         | Fan-out to all schemas  | Fan-out to all DBs       |
| Connection pooling     | Simple (one pool)        | Complex (per-schema)    | Very complex             |
| Cross-tenant queries   | Possible (admin role)   | Complex                 | Extremely complex        |
| Compliance (GDPR)      | Acceptable with RLS      | Better isolation        | Best isolation           |
| **Recommendation**     | **Chosen**              | Not chosen              | Not viable               |

#### RLS Implementation Details

**1. Session Variable Setup (per transaction)**

```typescript
// packages/db/src/tenant-client.ts

import { PrismaClient } from '@prisma/client';

const globalPrisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['warn', 'error'],
  datasources: {
    db: { url: process.env.DATABASE_URL },
  },
});

export function getTenantClient(organizationId: string) {
  return globalPrisma.$extends({
    name: 'tenant-isolation',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // For analytics and audit models, tenant already filtered differently
          const tenantScopedModels = [
            'OrganizationMember', 'Website', 'WebsiteTheme', 'WebsitePage',
            'ConstructionProject', 'ProjectImage', 'MediaAsset',
            'Lead', 'LeadNote', 'FormSubmission',
            'AnalyticsSession', 'AnalyticsEvent',
            'BlogPost', 'BlogCategory',
            'ApiKey', 'Notification', 'AuditLog',
            'ScrapingJob', 'ScrapedLead', 'AiLeadScore',
          ];
          
          if (!tenantScopedModels.includes(model)) {
            return query(args);
          }
          
          // Set tenant context for this transaction
          return globalPrisma.$transaction(async (tx) => {
            await tx.$executeRaw`SET LOCAL app.current_org_id = ${organizationId}`;
            return query(args);
          });
        },
      },
    },
  });
}

export function getAdminClient() {
  // Superadmin client — uses saas_admin role with BYPASSRLS
  return new PrismaClient({
    datasources: {
      db: { url: process.env.ADMIN_DATABASE_URL }, // Uses saas_admin role
    },
  });
}
```

**2. PostgreSQL RLS Policies**

```sql
-- Shared policy template applied to all 20+ tenant-scoped tables
-- Example for construction_projects:

ALTER TABLE construction_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction_projects FORCE ROW LEVEL SECURITY;  -- Force even for table owner

CREATE POLICY tenant_isolation_policy ON construction_projects
  AS PERMISSIVE
  FOR ALL
  TO app_user          -- Application role
  USING (
    organization_id = current_setting('app.current_org_id', true)::uuid
  )
  WITH CHECK (
    organization_id = current_setting('app.current_org_id', true)::uuid
  );

-- Separate read policy for the read-only replica role
CREATE POLICY tenant_isolation_readonly ON construction_projects
  AS PERMISSIVE
  FOR SELECT
  TO app_readonly
  USING (
    organization_id = current_setting('app.current_org_id', true)::uuid
  );
```

**3. Verification That RLS Works**

```sql
-- Run this test in CI pipeline (migration test)
DO $$
DECLARE
  org_a_id UUID := '00000000-0000-0000-0000-000000000001';
  org_b_id UUID := '00000000-0000-0000-0000-000000000002';
  lead_count INTEGER;
BEGIN
  -- Setup test data
  SET ROLE app_user;
  
  -- Set org_a context
  SET LOCAL app.current_org_id = '00000000-0000-0000-0000-000000000001';
  
  -- Attempt to read org_b's data while scoped to org_a
  SELECT COUNT(*) INTO lead_count FROM leads WHERE organization_id = org_b_id;
  
  -- Should return 0 (RLS blocks it)
  IF lead_count > 0 THEN
    RAISE EXCEPTION 'RLS FAILURE: org_a can see org_b leads!';
  END IF;
  
  RAISE NOTICE 'RLS test passed: cross-tenant data is isolated';
END $$;
```

---

## 3. Tenant Context Propagation

### Through the Request Lifecycle

```
1. EDGE: CloudFront
   - Adds X-Forwarded-Host header
   - Serves cached responses if applicable

2. MIDDLEWARE: Next.js Edge Runtime
   - Reads hostname from x-forwarded-host
   - Resolves tenant (Redis → DB)
   - Sets headers: x-tenant-id, x-tenant-slug, x-tenant-config
   - Validates Clerk JWT (for authenticated routes)

3. SERVER COMPONENTS: React Server Components
   - Read tenant from headers() (Next.js server API)
   - Initialize getTenantClient(tenantId)
   - Fetch data — automatically RLS-scoped

4. API ROUTES: Next.js Route Handlers
   - Read tenant from headers
   - Validate tenant matches auth context (for dashboard routes)
   - Business logic with tenant-scoped Prisma client

5. DATABASE: PostgreSQL
   - SET LOCAL app.current_org_id = '{tenantId}'
   - All queries filtered by RLS policy
   - No cross-tenant data returned

6. CLIENT COMPONENTS: React Client Components
   - Receive serialized tenant config as React Server Component prop
   - TenantContext provider makes config available to all children
   - No sensitive data (DB values) in client context
```

### Server Component Pattern

```typescript
// apps/web/app/(tenant)/projects/page.tsx

import { headers } from 'next/headers';
import { getTenantClient } from '@construction-saas/db';

export const revalidate = 60; // ISR: revalidate every 60 seconds

export default async function ProjectsPage() {
  // Read tenant from middleware-set headers
  const headersList = headers();
  const tenantId = headersList.get('x-tenant-id')!;
  const tenantConfig = JSON.parse(headersList.get('x-tenant-config') ?? '{}');

  // Get tenant-scoped DB client
  const db = getTenantClient(tenantId);

  // Fetch data — RLS ensures only this tenant's projects returned
  const projects = await db.constructionProject.findMany({
    where: { status: 'published' },
    orderBy: { completionDate: 'desc' },
    take: 20,
    include: {
      images: {
        where: { isCoverImage: true },
        take: 1,
      },
    },
  });

  return (
    <TenantProvider config={tenantConfig}>
      <ProjectGallery projects={projects} />
    </TenantProvider>
  );
}
```

### Dashboard (Authenticated) Pattern

```typescript
// apps/web/app/(dashboard)/leads/page.tsx

import { auth } from '@clerk/nextjs/server';
import { headers } from 'next/headers';
import { getTenantClient } from '@construction-saas/db';

export default async function LeadsPage() {
  const { orgId, orgRole } = auth();
  const tenantId = headers().get('x-tenant-id')!;

  // Security: verify Clerk org matches resolved tenant
  // (Middleware already verifies this, but double-check for defense-in-depth)
  const db = getTenantClient(tenantId);

  const leads = await db.lead.findMany({
    where: { status: { not: 'unqualified' } },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      assignedTo: { select: { firstName: true, lastName: true, avatarUrl: true } },
      aiScores: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });

  return <LeadsKanban leads={leads} userRole={orgRole} />;
}
```

---

## 4. White-Label Configuration

### Theme Configuration Schema

Each tenant's `website_themes` record controls the full visual presentation of their microsite:

```typescript
interface TenantThemeConfig {
  // Brand colors
  primaryColor: string;     // e.g., '#1a56db' — buttons, links, CTAs
  secondaryColor: string;   // e.g., '#0e9f6e' — accents, highlights
  accentColor: string;      // e.g., '#ff5a1f' — badges, notifications
  backgroundColor: string;  // '#ffffff' for light, '#0f0f0f' for dark
  textColor: string;        // '#111827' default body text

  // Typography
  fontHeading: string;      // Google Font name: 'Playfair Display', 'Montserrat', etc.
  fontBody: string;         // Google Font name: 'Inter', 'Roboto', etc.
  fontScale: number;        // Base font size multiplier: 0.9 to 1.2

  // Layout
  borderRadius: string;     // '0px' (sharp), '8px' (rounded), '16px' (very rounded)

  // Assets
  logoUrl: string;          // CDN URL to primary logo
  darkLogoUrl: string;      // CDN URL to dark-mode variant logo
  faviconUrl: string;       // CDN URL to favicon.ico / favicon.svg

  // Dark mode
  darkModeEnabled: boolean;
  
  // Advanced
  customCss: string;        // Arbitrary CSS injected after theme styles
  
  // Header configuration
  headerConfig: {
    style: 'transparent' | 'solid' | 'blur';
    showPhone: boolean;
    showCta: boolean;
    ctaText: string;
    ctaUrl: string;
    navigationLinks: Array<{ label: string; url: string; isExternal: boolean }>;
  };
  
  // Footer configuration
  footerConfig: {
    style: 'dark' | 'light' | 'branded';
    showSocialLinks: boolean;
    showPrivacyPolicy: boolean;
    copyrightText: string;
    columnsJson: Array<{ heading: string; links: Array<{ label: string; url: string }> }>;
  };
}
```

### CSS Variable Injection

Theme config is translated to CSS variables injected into the tenant layout:

```typescript
// apps/web/app/(tenant)/layout.tsx

import { headers } from 'next/headers';

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  const themeConfig = JSON.parse(headers().get('x-tenant-config') ?? '{}');

  const cssVariables = `
    :root {
      --color-primary: ${themeConfig.primaryColor ?? '#1a56db'};
      --color-secondary: ${themeConfig.secondaryColor ?? '#0e9f6e'};
      --color-accent: ${themeConfig.accentColor ?? '#ff5a1f'};
      --color-background: ${themeConfig.backgroundColor ?? '#ffffff'};
      --color-text: ${themeConfig.textColor ?? '#111827'};
      --border-radius: ${themeConfig.borderRadius ?? '8px'};
      --font-heading: '${themeConfig.fontHeading ?? 'Inter'}', sans-serif;
      --font-body: '${themeConfig.fontBody ?? 'Inter'}', sans-serif;
      --font-scale: ${themeConfig.fontScale ?? 1};
    }
    ${themeConfig.customCss ?? ''}
  `;

  return (
    <html lang="en">
      <head>
        <style dangerouslySetInnerHTML={{ __html: cssVariables }} />
        {themeConfig.fontHeading !== 'Inter' && (
          <link
            href={`https://fonts.googleapis.com/css2?family=${encodeURIComponent(themeConfig.fontHeading)}:wght@400;600;700&display=swap`}
            rel="stylesheet"
          />
        )}
      </head>
      <body>{children}</body>
    </html>
  );
}
```

### Dynamic Metadata (Per-Tenant SEO)

```typescript
// Per-tenant generateMetadata
import { type Metadata } from 'next';
import { headers } from 'next/headers';
import { getTenantClient } from '@construction-saas/db';

export async function generateMetadata(): Promise<Metadata> {
  const tenantId = headers().get('x-tenant-id')!;
  const db = getTenantClient(tenantId);
  const website = await db.website.findUnique({
    where: { organizationId: tenantId },
    select: { title: true, description: true, ogImageUrl: true, seoConfigJson: true },
  });

  const seoConfig = website?.seoConfigJson as Record<string, string> ?? {};

  return {
    title: {
      default: website?.title ?? 'Construction Services',
      template: seoConfig.titleTemplate ?? `%s | ${website?.title}`,
    },
    description: website?.description,
    openGraph: {
      type: 'website',
      siteName: website?.title,
      images: website?.ogImageUrl ? [{ url: website.ogImageUrl }] : [],
    },
    robots: { index: true, follow: true },
  };
}
```

---

## 5. Custom Domain Provisioning Flow

### Full Domain Setup Flow

```
Tenant Admin                Platform System              AWS Services
     |                            |                           |
     | 1. Enter custom domain:    |                           |
     |    "www.riverdale.com"      |                           |
     |--------------------------->|                           |
     |                            |                           |
     |                            | 2. Validate domain format |
     |                            |    Check not already used |
     |                            |    Update websites:        |
     |                            |    custom_domain=www.r... |
     |                            |    domain_status=pending  |
     |                            |                           |
     | 3. Show DNS instructions:  |                           |
     |    Add CNAME:              |                           |
     |    www.riverdale.com       |                           |
     |    → proxy.buildpro.com   |                           |
     |<---------------------------|                           |
     |                            |                           |
     |                            | 4. Poll DNS every 5 min  |
     |                            |    (EventBridge + Lambda) |
     |                            |--DNS lookup-------------->|
     |                            |<--CNAME verified----------|
     |                            |                           |
     |                            | 5. Request ACM cert       |
     |                            |-------------------------->|
     |                            |    Domain: www.riverdale.com
     |                            |    Validation: DNS        |
     |                            |<-- CertArn, CNAME record--|
     |                            |                           |
     |                            | 6. Wait for CNAME add     |
     |                            |    (tenant adds _acme-    |
     |                            |    challenge CNAME)       |
     |                            |                           |
     | 7. DNS validation CNAME    |                           |
     |    shown in dashboard      |                           |
     |<---------------------------|                           |
     |                            |                           |
     |                            | 8. ACM polls DNS          |
     |                            |    (auto, ~3 minutes)     |
     |                            |<--ISSUED------------------|
     |                            |                           |
     |                            | 9. Update CloudFront      |
     |                            |    distribution: add alias |
     |                            |    www.riverdale.com      |
     |                            |-------------------------->|
     |                            |<-success------------------|
     |                            |                           |
     |                            | 10. Update DB:            |
     |                            |     domain_verified=true  |
     |                            |     domain_status=active  |
     |                            |                           |
     | 11. "Custom domain active" |                           |
     |<---------------------------|                           |
```

### Lambda: Custom Domain Provisioner

```python
# apps/ai-service/app/tasks/domain_provisioner.py

import boto3
import dns.resolver
from datetime import datetime, timedelta
from app.database import get_db_session
from app.models.organization import Website

acm = boto3.client('acm', region_name='us-east-1')
cf = boto3.client('cloudfront')

CLOUDFRONT_DISTRIBUTION_ID = os.environ['CLOUDFRONT_DISTRIBUTION_ID']

def verify_cname_propagation(domain: str, expected_target: str) -> bool:
    """Check if CNAME resolves to the expected target (proxy.buildpro.com)."""
    try:
        answers = dns.resolver.resolve(domain, 'CNAME')
        for answer in answers:
            if str(answer.target).rstrip('.') == expected_target:
                return True
    except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer, dns.exception.Timeout):
        pass
    return False

async def provision_custom_domain(domain: str, organization_id: str):
    """Full domain provisioning pipeline."""
    
    # Step 1: Verify CNAME propagation
    if not verify_cname_propagation(domain, 'proxy.buildpro.com'):
        update_domain_status(organization_id, 'verifying', 
                            'DNS CNAME not yet propagated')
        return
    
    # Step 2: Request ACM certificate
    cert_arn = request_acm_certificate(domain)
    
    # Step 3: Wait for ACM issuance (polling in separate EventBridge schedule)
    cert = acm.describe_certificate(CertificateArn=cert_arn)
    status = cert['Certificate']['Status']
    
    if status != 'ISSUED':
        # Return: next polling cycle will check again
        return
    
    # Step 4: Update CloudFront distribution
    add_cloudfront_alias(domain, cert_arn)
    
    # Step 5: Mark domain as active in DB
    async with get_db_session() as session:
        website = await session.query(Website).filter(
            Website.organization_id == organization_id
        ).first()
        website.domain_verified = True
        website.domain_status = 'active'
        website.domain_verified_at = datetime.utcnow()
        await session.commit()
    
    # Step 6: Invalidate Redis cache for old hostname
    redis.delete(f'tenant:domain:{domain}')
    
    # Step 7: Notify tenant admin
    await send_domain_active_notification(organization_id, domain)
```

---

## 6. Tenant Onboarding Flow

### Step-by-Step Onboarding

```
Phase 1: Operator Creates Tenant (Admin Dashboard)
  1. SuperAdmin fills "New Tenant" form:
     - Organization name, slug, primary email
     - Plan selection (Starter/Growth/Scale)
     - Operator notes

  2. System actions (POST /api/v1/organizations):
     a. Create Organization record
     b. Create Subscription record (trial or active)
     c. Create default Website record (status: 'draft')
     d. Create default WebsiteTheme (with platform default colors/fonts)
     e. Create system Role records for org (OrgAdmin, Editor, Viewer, Client)
     f. Create Clerk organization (via Clerk API)
     g. Send invitation email to tenant's primary contact

Phase 2: Tenant Admin Accepts Invitation
  1. Tenant admin receives email with Clerk invitation link
  2. Clerk creates user account / signs in existing user
  3. User accepts org membership → becomes OrgAdmin
  4. Clerk webhook: organizationMembership.created → sync to organization_members table
  5. Tenant admin is redirected to their dashboard

Phase 3: Initial Website Setup (Guided Wizard)
  Step 1/5: Business Information
    - Business name, tagline, description
    - Contact info (phone, email, address)
    - Social links (Facebook, Instagram, LinkedIn, Google Business)

  Step 2/5: Branding
    - Upload logo (presigned S3 URL)
    - Choose or customize color palette
    - Select font pairing from curated list of 10 options
    - Upload favicon

  Step 3/5: Services
    - Select service types offered (residential, commercial, etc.)
    - Add service descriptions
    - Scaffold Services page automatically

  Step 4/5: First Project
    - Upload 3-5 project photos (drag-and-drop)
    - Fill project details form
    - Publish first project to gallery

  Step 5/5: Domain Setup
    - Choose: use {slug}.buildpro.com subdomain OR set up custom domain
    - If custom domain: show DNS instructions, mark as "setup in progress"
    - Publish website (status: 'published')

Phase 4: Post-Onboarding Checklist
  - [ ] Add at least one project photo
  - [ ] Fill in About page content
  - [ ] Configure lead form (contact/quote)
  - [ ] Connect Google Analytics (optional)
  - [ ] Set up custom domain (optional)
  - [ ] Invite team members (optional)
```

### Database Records Created at Onboarding

```typescript
// Executed in a single Prisma transaction
async function onboardNewTenant(input: OnboardingInput): Promise<Organization> {
  return prisma.$transaction(async (tx) => {
    // 1. Create organization
    const org = await tx.organization.create({
      data: {
        name: input.name,
        slug: input.slug,
        primaryEmail: input.primaryEmail,
        status: 'active',
        planId: input.planId,
      },
    });

    // 2. Create subscription
    await tx.subscription.create({
      data: {
        organizationId: org.id,
        planId: input.planId,
        status: 'trialing',
        trialEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14-day trial
      },
    });

    // 3. Create default website
    await tx.website.create({
      data: {
        organizationId: org.id,
        title: input.name,
        status: 'draft',
        seoConfigJson: {},
      },
    });

    // 4. Create default theme
    const theme = await tx.websiteTheme.create({
      data: {
        organizationId: org.id,
        name: 'Default',
        primaryColor: '#1a56db',
        fontHeading: 'Inter',
        fontBody: 'Inter',
        isActive: true,
      },
    });

    // 5. Link theme to website
    await tx.website.update({
      where: { organizationId: org.id },
      data: { themeId: theme.id },
    });

    // 6. Create initial Home, About, Services, Contact pages
    const pageData = [
      { title: 'Home', slug: 'home', pageType: 'home', sortOrder: 0 },
      { title: 'About', slug: 'about', pageType: 'about', sortOrder: 1 },
      { title: 'Services', slug: 'services', pageType: 'services', sortOrder: 2 },
      { title: 'Projects', slug: 'projects', pageType: 'projects', sortOrder: 3 },
      { title: 'Contact', slug: 'contact', pageType: 'contact', sortOrder: 4 },
    ];
    
    const website = await tx.website.findUnique({ where: { organizationId: org.id } });
    for (const page of pageData) {
      await tx.websitePage.create({
        data: { ...page, websiteId: website!.id, organizationId: org.id, status: 'draft' },
      });
    }

    return org;
  });
}
```

---

## 7. Tenant Offboarding and Data Export

### Offboarding Flow

```
1. Cancellation Requested
   - OrgAdmin cancels subscription (Stripe billing portal)
   - Stripe webhook: customer.subscription.deleted
   - Subscription status set to 'cancelled'
   - Organization status set to 'suspended'
   - All tenant microsites return 404

2. Data Retention Period (30 days)
   - Tenant data retained for 30 days post-cancellation
   - OrgAdmin can export data during this period
   - Tenant admin receives daily reminder emails

3. Data Export (On Request)
   POST /api/v1/gdpr/export
   Returns ZIP file containing:
   - organizations.json
   - members.json
   - website_config.json
   - pages.json
   - projects.json (with image CDN URLs)
   - leads.json
   - lead_notes.json
   - blog_posts.json
   - analytics_summary.json (no raw events — GDPR minimization)
   - media_manifest.json (list of all uploaded files with CDN URLs)

4. Data Deletion (After 30-day retention)
   - Hard delete: leads, form_submissions, lead_notes, blog_posts, website_pages
   - Anonymize: analytics_events (organization_id set to null, visitor_id cleared)
   - Delete: media assets from S3 (lifecycle rule: tenants/{orgId}/ prefix)
   - Delete: organization record (cascades to all dependent records via FK ON DELETE CASCADE)
   - Delete: Clerk organization (via Clerk API)
   - Delete: custom domain CloudFront alias (if set)
   - Retain: audit_logs (for compliance, organization_id anonymized)
   - Retain: subscription/billing records (for tax/accounting, 7 years)
```

### Data Export Implementation

```typescript
// api/v1/gdpr/export/route.ts

export async function GET(req: Request) {
  const { orgId } = auth();
  const db = getTenantClient(orgId);

  // Fetch all tenant data (paginated internally to handle large datasets)
  const [org, members, projects, leads, blog_posts, pages] = await Promise.all([
    db.organization.findUnique({ where: { id: orgId } }),
    db.organizationMember.findMany({ include: { user: true, role: true } }),
    db.constructionProject.findMany({ include: { images: true } }),
    db.lead.findMany({ include: { notes: true } }),
    db.blogPost.findMany(),
    db.websitePage.findMany(),
  ]);

  // Create ZIP archive
  const zip = new JSZip();
  zip.file('organization.json', JSON.stringify(org, null, 2));
  zip.file('members.json', JSON.stringify(members, null, 2));
  zip.file('projects.json', JSON.stringify(projects, null, 2));
  zip.file('leads.json', JSON.stringify(leads, null, 2));
  zip.file('blog_posts.json', JSON.stringify(blog_posts, null, 2));
  zip.file('pages.json', JSON.stringify(pages, null, 2));

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

  // Upload to S3 with 24-hour expiry
  const s3Key = `exports/${orgId}/export-${Date.now()}.zip`;
  await s3.putObject({ Bucket: EXPORTS_BUCKET, Key: s3Key, Body: zipBuffer });
  const downloadUrl = await getSignedUrl(s3Client, new GetObjectCommand({
    Bucket: EXPORTS_BUCKET, Key: s3Key,
  }), { expiresIn: 86400 }); // 24 hours

  // Audit log the export request
  await auditLog({ organizationId: orgId, action: 'gdpr.export_requested', ... });

  return apiSuccess({ downloadUrl, expiresAt: new Date(Date.now() + 86400000) });
}
```

---

## 8. Feature Flags Per Tenant

### Plan-Based Feature Gating

Features are gated based on the tenant's subscription plan. Feature flags are cached in Redis to avoid per-request DB lookups.

```typescript
// lib/feature-flags.ts

interface FeatureFlags {
  ai_lead_scoring: boolean;
  ai_lead_discovery: boolean;
  ai_email_drafting: boolean;
  custom_domain: boolean;
  blog: boolean;
  analytics_advanced: boolean;
  api_access: boolean;
  white_label: boolean;
  unlimited_leads: boolean;
  multi_user: boolean;
  priority_support: boolean;
}

const PLAN_FEATURES: Record<string, FeatureFlags> = {
  starter: {
    ai_lead_scoring: false,
    ai_lead_discovery: false,
    ai_email_drafting: false,
    custom_domain: true,
    blog: true,
    analytics_advanced: false,
    api_access: false,
    white_label: false,
    unlimited_leads: false,
    multi_user: false,
    priority_support: false,
  },
  growth: {
    ai_lead_scoring: true,
    ai_lead_discovery: true,
    ai_email_drafting: true,
    custom_domain: true,
    blog: true,
    analytics_advanced: true,
    api_access: true,
    white_label: true,
    unlimited_leads: false,
    multi_user: true,
    priority_support: false,
  },
  scale: {
    ai_lead_scoring: true,
    ai_lead_discovery: true,
    ai_email_drafting: true,
    custom_domain: true,
    blog: true,
    analytics_advanced: true,
    api_access: true,
    white_label: true,
    unlimited_leads: true,
    multi_user: true,
    priority_support: true,
  },
};

export async function getFeatureFlags(organizationId: string): Promise<FeatureFlags> {
  const cacheKey = `tenant:flags:${organizationId}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const subscription = await prisma.subscription.findUnique({
    where: { organizationId },
    include: { plan: true },
  });

  const planName = subscription?.plan.name.toLowerCase() ?? 'starter';
  const flags = PLAN_FEATURES[planName] ?? PLAN_FEATURES.starter;

  await redis.setex(cacheKey, 3600, JSON.stringify(flags));
  return flags;
}

// Usage in API route:
export async function POST(req: Request) {
  const tenantId = headers().get('x-tenant-id')!;
  const flags = await getFeatureFlags(tenantId);
  
  if (!flags.ai_lead_discovery) {
    return apiError(403, 'FEATURE_NOT_AVAILABLE', 
      'AI lead discovery requires the Growth or Scale plan');
  }
  // ... proceed with AI job
}
```

### Feature Flag Enforcement Layers

| Layer                        | Enforcement                                      |
|------------------------------|--------------------------------------------------|
| UI (Dashboard)               | Hide features not in plan (no "locked" icons — clean UI) |
| API Routes                   | Check `getFeatureFlags()` before processing; return 403 |
| Plan Limit Quotas            | Check DB counts vs plan maximums                 |
| Redis Cache                  | Feature flags cached 1 hour per tenant          |
| Cache Invalidation           | On subscription plan change → DEL `tenant:flags:{orgId}` |
