# Security Design — Multi-Tenant Construction SaaS

## Table of Contents
1. [Authentication Flow](#1-authentication-flow)
2. [Authorization (RBAC)](#2-authorization-rbac)
3. [Multi-Tenant Data Isolation](#3-multi-tenant-data-isolation)
4. [API Security](#4-api-security)
5. [Input Validation Strategy](#5-input-validation-strategy)
6. [File Upload Security](#6-file-upload-security)
7. [Secret Management](#7-secret-management)
8. [Network Security](#8-network-security)
9. [WAF Configuration](#9-waf-configuration)
10. [OWASP Top 10 Mitigations](#10-owasp-top-10-mitigations)
11. [Audit Logging Strategy](#11-audit-logging-strategy)
12. [GDPR Compliance Checklist](#12-gdpr-compliance-checklist)
13. [Penetration Testing Checklist](#13-penetration-testing-checklist)

---

## 1. Authentication Flow

### Clerk JWT Authentication Architecture

```
User Browser
    |
    | 1. User signs in via Clerk-hosted UI or embedded Clerk components
    |
    v
Clerk Authentication (SaaS — external)
    |
    | 2. Clerk issues JWT (signed with Clerk's private RSA key)
    |    JWT payload:
    |    {
    |      "sub": "user_01HK...",
    |      "iss": "https://clerk.buildpro.com",
    |      "exp": 1705316400,
    |      "iat": 1705312800,
    |      "org_id": "org_01HK...",
    |      "org_role": "org:admin",
    |      "org_slug": "riverdale",
    |      "org_permissions": ["org:proj:read", "org:leads:write"],
    |      "azp": "buildpro.com"
    |    }
    |
    v
Browser stores JWT in httpOnly cookie (Clerk __session cookie)
    |
    | 3. Browser sends request with JWT in cookie
    |
    v
Next.js Middleware (Edge Runtime)
    |
    | 4. Middleware calls auth() from @clerk/nextjs/server
    |    - Fetches Clerk JWKS (cached in Redis for 1 hour)
    |    - Verifies JWT signature using Clerk's public key
    |    - Validates exp, iss, azp claims
    |    - Extracts userId, orgId, orgRole from claims
    |
    | 5. If JWT invalid → 401 Unauthorized
    |    If JWT valid but route requires org membership → verify in DB
    |    If JWT valid → inject user context into request
    |
    v
API Route / Page Handler
    |
    | 6. Access auth context via auth() or currentUser()
    |    All subsequent DB queries scoped to verified orgId
```

### Organization Switching

When a user switches between organizations (multi-org membership):

1. User clicks "Switch Organization" in Clerk's UI component
2. Clerk issues a new session token with the new `org_id`
3. Browser session cookie is updated automatically
4. Next.js middleware picks up new org context on next request
5. Redis session cache is invalidated for the old org context
6. All subsequent requests now scoped to the new organization

### Session Security

- JWT expiry: 1 hour (short-lived; Clerk auto-refreshes)
- JWT stored in `__session` httpOnly cookie (not accessible to JavaScript)
- `Secure` flag on all cookies (HTTPS-only transmission)
- `SameSite=Lax` prevents CSRF attacks on API routes
- Clerk session revocation: webhook triggers Redis session cache invalidation

### Webhook Event Verification (Clerk → Platform)

All Clerk webhooks arrive at `POST /api/v1/webhooks/clerk` and are verified using Svix:

```typescript
import { Webhook } from 'svix';

export async function POST(req: Request) {
  const body = await req.text();
  const headers = {
    'svix-id': req.headers.get('svix-id'),
    'svix-timestamp': req.headers.get('svix-timestamp'),
    'svix-signature': req.headers.get('svix-signature'),
  };

  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
  let event: ClerkWebhookEvent;
  
  try {
    event = wh.verify(body, headers) as ClerkWebhookEvent;
  } catch (err) {
    return new Response('Invalid signature', { status: 401 });
  }
  // Process verified event...
}
```

---

## 2. Authorization (RBAC)

### Role Hierarchy

```
SuperAdmin (Platform Operator)
  └── Full access to all organizations, all data
  └── Can bypass RLS (uses saas_admin DB role)
  └── Can view audit logs across all tenants

OrgAdmin
  └── Full access within their organization
  └── Member management (invite, role assignment, removal)
  └── Billing and subscription management
  └── API key management
  └── View audit logs for their org

Editor
  └── Create, edit, publish: website pages, projects, blog posts, media
  └── View and update leads (not delete)
  └── Cannot manage members, billing, API keys

Viewer
  └── Read-only access to all org data
  └── Cannot create, edit, or delete anything

Client
  └── View-only portal: their project updates, documents
  └── Limited to project status and assigned tasks only
  └── Cannot view other leads, analytics, or settings
```

### RBAC Permission Matrix

| Permission                | SuperAdmin | OrgAdmin | Editor | Viewer | Client |
|---------------------------|:----------:|:--------:|:------:|:------:|:------:|
| **Organizations**         |            |          |        |        |        |
| Create org                | Yes        | No       | No     | No     | No     |
| Update org settings       | Yes        | Yes      | No     | No     | No     |
| Delete/suspend org        | Yes        | No       | No     | No     | No     |
| View org details          | Yes        | Yes      | Yes    | Yes    | No     |
| **Members**               |            |          |        |        |        |
| Invite members            | Yes        | Yes      | No     | No     | No     |
| Update member roles       | Yes        | Yes      | No     | No     | No     |
| Remove members            | Yes        | Yes      | No     | No     | No     |
| View member list          | Yes        | Yes      | Yes    | Yes    | No     |
| **Website**               |            |          |        |        |        |
| Edit pages/theme/domain   | Yes        | Yes      | Yes    | No     | No     |
| Publish website           | Yes        | Yes      | Yes    | No     | No     |
| View website settings     | Yes        | Yes      | Yes    | Yes    | No     |
| **Projects**              |            |          |        |        |        |
| Create/edit projects      | Yes        | Yes      | Yes    | No     | No     |
| Delete projects           | Yes        | Yes      | No     | No     | No     |
| View all projects         | Yes        | Yes      | Yes    | Yes    | Yes*   |
| **Leads & CRM**           |            |          |        |        |        |
| Create/edit leads         | Yes        | Yes      | Yes    | No     | No     |
| Delete leads              | Yes        | Yes      | No     | No     | No     |
| Export leads              | Yes        | Yes      | No     | No     | No     |
| View all leads            | Yes        | Yes      | Yes    | Yes    | No     |
| View assigned leads only  | -          | -        | -      | -      | Yes    |
| **Analytics**             |            |          |        |        |        |
| View analytics            | Yes        | Yes      | Yes    | Yes    | No     |
| **Blog**                  |            |          |        |        |        |
| Create/edit/publish posts | Yes        | Yes      | Yes    | No     | No     |
| Delete posts              | Yes        | Yes      | No     | No     | No     |
| **Media**                 |            |          |        |        |        |
| Upload media              | Yes        | Yes      | Yes    | No     | No     |
| Delete media              | Yes        | Yes      | No     | No     | No     |
| **Billing**               |            |          |        |        |        |
| View billing              | Yes        | Yes      | No     | No     | No     |
| Update billing/plan       | Yes        | Yes      | No     | No     | No     |
| **API Keys**              |            |          |        |        |        |
| Create/revoke API keys    | Yes        | Yes      | No     | No     | No     |
| **Audit Logs**            |            |          |        |        |        |
| View org audit logs       | Yes        | Yes      | No     | No     | No     |
| View all audit logs       | Yes        | No       | No     | No     | No     |

*Client role: view only their own associated projects.

### Authorization Enforcement in Code

```typescript
// lib/auth.ts — Server-side authorization helpers

export async function requireRole(
  minRole: 'OrgAdmin' | 'Editor' | 'Viewer',
  context: AuthContext
): Promise<void> {
  const roleHierarchy = { SuperAdmin: 5, OrgAdmin: 4, Editor: 3, Viewer: 2, Client: 1 };
  const userLevel = roleHierarchy[context.orgRole] ?? 0;
  const requiredLevel = roleHierarchy[minRole];
  
  if (userLevel < requiredLevel) {
    throw new ForbiddenError(`Requires ${minRole} role or higher`);
  }
}

export async function requirePermission(
  permission: string,
  context: AuthContext
): Promise<void> {
  if (!context.orgPermissions.includes(permission)) {
    throw new ForbiddenError(`Missing permission: ${permission}`);
  }
}

// Usage in API route:
export async function DELETE(req: Request, { params }: { params: { leadId: string } }) {
  const { userId, orgId, orgRole } = auth();
  await requireRole('OrgAdmin', { orgRole });
  // ... proceed with deletion
}
```

---

## 3. Multi-Tenant Data Isolation

### Isolation Guarantee Architecture

```
Request → Middleware resolves tenant (hostname-based ONLY)
       → Headers set: x-tenant-id (signed, cannot be spoofed)
       → API route reads tenant ID from header
       → getTenantClient(tenantId) called
       → Prisma extension sets SET LOCAL app.current_org_id = tenantId
       → All DB queries auto-filtered by RLS policy
       → Response only contains tenant-owned data
```

### Preventing Tenant ID Spoofing

Tenant ID is **never** read from:
- Request body
- Query parameters
- `x-tenant-id` header sent by the client (middleware overwrites this)

Tenant ID is **only** set by:
- Next.js middleware (reads hostname, resolves from DB/Redis, writes signed header)
- Authenticated user's Clerk JWT `org_id` claim (for dashboard routes)

### RLS Verification Test (Run in CI)

```sql
-- Test that RLS prevents cross-tenant access
BEGIN;
SET LOCAL app.current_org_id = 'org-a-uuid';
INSERT INTO leads (organization_id, email) VALUES ('org-b-uuid', 'test@test.com');
-- Should FAIL with RLS policy violation
ROLLBACK;

-- Test that correct org access works
BEGIN;
SET LOCAL app.current_org_id = 'org-a-uuid';
INSERT INTO leads (organization_id, email) VALUES ('org-a-uuid', 'valid@test.com');
-- Should SUCCEED
ROLLBACK;
```

### S3 Access Control

All media access is mediated through CloudFront with signed URLs. Direct S3 access is blocked:

```typescript
// Generate presigned upload URL — validates org ownership of prefix
export async function generatePresignedUploadUrl(
  organizationId: string,
  filePath: string
): Promise<string> {
  // Enforce prefix: all tenant files must be under /tenants/{orgId}/
  const s3Key = `tenants/${organizationId}/${filePath}`;
  
  // S3 presigned URL — client uploads directly to S3, bypassing server
  const command = new PutObjectCommand({
    Bucket: process.env.MEDIA_BUCKET!,
    Key: s3Key,
    ContentType: 'image/jpeg',
    // Server-side encryption
    ServerSideEncryption: 'AES256',
  });
  
  return getSignedUrl(s3Client, command, { expiresIn: 900 }); // 15 minutes
}
```

---

## 4. API Security

### JWT Validation on Every Request

```typescript
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/api/public/(.*)',
  '/api/v1/webhooks/(.*)',
  '/api/health',
]);

export default clerkMiddleware(async (auth, req) => {
  // 1. Resolve tenant from hostname (always, for all routes)
  const tenant = await resolveTenant(req.headers.get('host'));
  
  // 2. For non-public routes, require authentication
  if (!isPublicRoute(req)) {
    await auth.protect(); // throws 401 if not authenticated
  }
  
  // 3. Inject resolved tenant into request headers
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-tenant-id', tenant?.id ?? '');
  requestHeaders.set('x-tenant-slug', tenant?.slug ?? '');
  
  return NextResponse.next({ request: { headers: requestHeaders } });
});
```

### API Key Authentication (for External Integrations)

```typescript
// lib/api-key-auth.ts
export async function authenticateApiKey(
  req: Request,
  tenantId: string
): Promise<ApiKey> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer bpk_')) {
    throw new UnauthorizedError('Missing or invalid API key format');
  }
  
  const rawKey = authHeader.slice(7); // Remove 'Bearer '
  const keyHash = createHash('sha256').update(rawKey).digest('hex');
  
  // Look up hashed key — plaintext is never stored
  const apiKey = await prisma.apiKey.findUnique({ where: { keyHash } });
  
  if (!apiKey) throw new UnauthorizedError('Invalid API key');
  if (apiKey.revokedAt) throw new UnauthorizedError('API key has been revoked');
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    throw new UnauthorizedError('API key has expired');
  }
  // Tenant scoping: API key must belong to the resolved tenant
  if (apiKey.organizationId !== tenantId) {
    throw new ForbiddenError('API key not authorized for this tenant');
  }
  
  // Async: update last_used_at (fire and forget)
  prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date(), requestCount: { increment: 1 } },
  }).catch(() => {}); // Non-blocking
  
  return apiKey;
}
```

### Rate Limiting Implementation (Redis Sliding Window)

```typescript
// lib/rate-limit.ts
export async function checkRateLimit(
  identifier: string,   // e.g., `tenant:${orgId}` or `ip:${ip}`
  endpoint: string,     // e.g., 'analytics_events'
  limit: number,        // e.g., 10000
  windowSeconds: number // e.g., 60
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const key = `rl:${endpoint}:${identifier}`;
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;
  
  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(key, 0, windowStart); // Remove old entries
  pipeline.zadd(key, now, `${now}`);               // Add current request
  pipeline.zcard(key);                             // Count in window
  pipeline.expire(key, windowSeconds + 1);         // TTL cleanup
  
  const results = await pipeline.exec();
  const count = results[2][1] as number;
  const allowed = count <= limit;
  
  return {
    allowed,
    remaining: Math.max(0, limit - count),
    resetAt: new Date(now + windowSeconds * 1000),
  };
}
```

---

## 5. Input Validation Strategy

### Zod Schema Validation on All API Inputs

Every API route validates its request body using Zod before processing:

```typescript
// lib/validations/leads.ts
import { z } from 'zod';

export const CreateLeadSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName:  z.string().min(1).max(100).optional(),
  email:     z.string().email().max(255).optional(),
  phone:     z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
  company:   z.string().max(255).optional(),
  source:    z.enum(['form', 'manual', 'import', 'ai_discovery', 'referral', 'api']),
  tags:      z.array(z.string().max(50)).max(20).default([]),
}).refine(
  (data) => data.email || data.phone,
  { message: 'At least one of email or phone is required' }
);

// API route usage:
const result = CreateLeadSchema.safeParse(await req.json());
if (!result.success) {
  return apiError(422, 'VALIDATION_ERROR', result.error.flatten());
}
const validatedData = result.data; // TypeScript knows this is safe
```

### Validation Rules

| Input Type        | Validation Applied                                              |
|-------------------|-----------------------------------------------------------------|
| Email             | RFC 5321 format, max 255 chars, lowercase normalized            |
| URL               | `z.string().url()` — must be valid HTTP/HTTPS URL              |
| Phone             | E.164 format with regex validation                              |
| Slug              | `/^[a-z0-9-]+$/` — lowercase alphanumeric and hyphens only     |
| Color             | `/^#[0-9a-f]{6}$/i` — valid hex color code                     |
| JSON fields       | `z.record()` or explicit schema — no arbitrary object injection |
| File upload       | MIME type allowlist checked server-side (not browser extension) |
| UUID params       | `z.string().uuid()` — rejects non-UUID path parameters         |
| Date strings      | `z.string().datetime()` — ISO 8601 format required             |
| HTML content      | DOMPurify sanitization before storage (XSS prevention)         |

### Output Sanitization

All user-supplied text rendered in tenant microsites is sanitized:

```typescript
import DOMPurify from 'isomorphic-dompurify';

// Before storing user-supplied rich text HTML
const sanitized = DOMPurify.sanitize(userHtml, {
  ALLOWED_TAGS: ['p', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'h2', 'h3', 'br'],
  ALLOWED_ATTR: ['href', 'target', 'rel'],
  FORBID_SCRIPTS: true,
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'style'],
});
```

---

## 6. File Upload Security

### Allowed File Types (Allowlist)

```typescript
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',   // Validated for XSS in SVG content before acceptance
  'application/pdf',
  'video/mp4',
  'video/webm',
]);

const MAX_FILE_SIZES: Record<string, number> = {
  'image/*': 10 * 1024 * 1024,     // 10 MB
  'application/pdf': 50 * 1024 * 1024, // 50 MB
  'video/*': 500 * 1024 * 1024,    // 500 MB
};
```

### Upload Security Flow

```
1. Client requests presigned upload URL
   POST /api/v1/media/upload-url
   Body: { fileName, mimeType, fileSizeBytes }

2. Server validates:
   - mimeType in ALLOWED_MIME_TYPES allowlist
   - fileSizeBytes <= MAX_FILE_SIZES[mimeType]
   - User has media:upload permission
   - Organization storage quota not exceeded
   - File name sanitized (no path traversal: ../, ./  etc.)

3. Server generates S3 presigned PUT URL with:
   - ContentType condition (enforces MIME type at S3 level)
   - ContentLengthRange condition (enforces file size at S3 level)
   - Expiry: 15 minutes
   - S3 Key: tenants/{orgId}/{sanitizedPath}

4. Client uploads directly to S3 (no server bandwidth used)

5. S3 Event Notification → Lambda → Malware scan (ClamAV via AWS Serverless Antivirus)
   - If infected: delete object, notify user, log incident
   - If clean: mark asset as 'ready' in DB, trigger image optimization

6. SVG files: additional XSS check — parse SVG, reject if contains <script> tags
```

### S3 Presigned URL Security

```
- URLs expire in 15 minutes (900 seconds)
- ContentType condition prevents MIME type switching after URL generation
- ContentLengthRange condition prevents oversized uploads
- S3 key prefix enforced (tenants/{orgId}/) — prevents cross-tenant uploads
- BlockPublicAccess enabled on bucket — no public URLs
- All access via CloudFront with Origin Access Control (OAC)
```

---

## 7. Secret Management

### Principles

1. No secrets in code, Git, or environment files committed to the repository
2. All secrets stored in AWS Secrets Manager
3. Secrets injected into ECS tasks via ECS Secrets (fetched at task startup)
4. Secrets accessed via IAM role — no static credentials in the application
5. Secret rotation automated where possible (RDS credentials via Lambda rotation)

### Secret Reference in ECS Task Definition

```json
{
  "secrets": [
    {
      "name": "DATABASE_URL",
      "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789:secret:/construction-saas/prod/database:DATABASE_URL::"
    },
    {
      "name": "CLERK_SECRET_KEY",
      "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789:secret:/construction-saas/prod/clerk:CLERK_SECRET_KEY::"
    }
  ]
}
```

### What Is Never Committed to Git

- Database connection strings
- API keys (Clerk, Stripe, OpenAI, PostHog)
- SMTP credentials
- JWT signing secrets
- Webhook secrets
- Any `.env` file with real values (only `.env.example` with placeholder values)

### Secret Rotation Schedule

| Secret                        | Rotation Method     | Frequency   |
|-------------------------------|---------------------|-------------|
| RDS `app_user` password       | Lambda auto-rotate  | 30 days     |
| RDS `saas_admin` password     | Manual              | 90 days     |
| Redis password                | Manual              | 90 days     |
| Clerk Webhook Secret          | Manual              | On suspicion|
| AI Service Webhook Secret     | Manual              | 180 days    |
| OpenAI API Key                | Manual              | 180 days    |
| Stripe Secret Key             | Manual              | Annual      |

---

## 8. Network Security

### Private Subnet Architecture

```
ECS Tasks → Private Subnets (10.0.11.0/24 - 10.0.13.0/24)
  - No direct internet access
  - Internet-bound traffic via NAT Gateway
  - Service-to-service via private DNS

RDS + Redis → Data Subnets (10.0.21.0/24 - 10.0.23.0/24)
  - No internet route whatsoever
  - Only accessible from Private Subnets
  - Security group whitelists ECS task SGs only
```

### Security Group Ingress Rules (Principle of Least Privilege)

```
sg-alb:          0.0.0.0/0:443 (HTTPS), 0.0.0.0/0:80 (HTTP redirect)
sg-ecs-web:      sg-alb:3000 (Next.js port from ALB only)
sg-ecs-ai:       sg-alb:8000 (FastAPI from ALB), sg-ecs-web:8000 (internal)
sg-rds:          sg-ecs-web:5432, sg-ecs-ai:5432 (no other ingress)
sg-redis:        sg-ecs-web:6379, sg-ecs-ai:6379 (no other ingress)
sg-lambda:       sg-rds:5432 (Lambda analytics processor only)
```

### TLS Configuration

- CloudFront: TLS 1.2 minimum, TLS 1.3 preferred
- ALB: TLS 1.2 minimum (HTTPS listeners)
- RDS: SSL required (`rds.force_ssl = 1` in parameter group)
- Redis: TLS enabled (`in-transit-encryption-enabled = true`)
- All internal VPC traffic: plaintext acceptable (private subnet trust boundary)

### HSTS and Security Headers

```
CloudFront Response Headers Policy:
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  X-Frame-Options: SAMEORIGIN
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: (per-tenant, configurable)
    default-src 'self';
    script-src 'self' 'nonce-{random}' https://clerk.buildpro.com;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' https://cdn.buildpro.com data:;
    connect-src 'self' https://api.buildpro.com https://posthog.com;
    font-src 'self' https://fonts.gstatic.com;
    frame-ancestors 'none'
```

---

## 9. WAF Configuration

See AWS_INFRASTRUCTURE.md for full WAF rule details. Summary:

| Rule Group                          | Threats Mitigated                          |
|-------------------------------------|--------------------------------------------|
| AWSManagedRulesCommonRuleSet        | SQLi, XSS, RFI, LFI, command injection     |
| AWSManagedRulesKnownBadInputsRuleSet | Log4Shell, SSRF, host header injection    |
| AWSManagedRulesAmazonIpReputationList | Known malicious IPs, botnets            |
| AWSManagedRulesBotControlRuleSet    | Automated scraping, credential stuffing    |
| Rate-based rules                    | DDoS, brute force, API abuse              |

Custom WAF rules added:
- Block requests with SQL injection patterns in query strings
- Block requests with `<script>` in `User-Agent` or `Referer` headers
- Challenge (CAPTCHA) requests that have suspicious browser fingerprints

---

## 10. OWASP Top 10 Mitigations

### A01: Broken Access Control
- RBAC enforced at API layer (role checks on every route)
- RLS enforced at DB layer (organization_id filter)
- Tenant ID resolved from hostname only (no client-supplied tenant ID)
- All resource access checks: `if (resource.organizationId !== authedOrgId) return 403`
- IDOR prevention: UUIDs for all IDs (non-sequential, unpredictable)

### A02: Cryptographic Failures
- All data encrypted in transit (TLS 1.2+ everywhere)
- All data encrypted at rest (RDS storage encryption, S3 SSE, Redis encryption)
- API keys stored as SHA-256 hashes (plaintext never stored)
- Passwords managed by Clerk (bcrypt, PBKDF2)
- No MD5 or SHA-1 used anywhere in the application
- Secrets stored in AWS Secrets Manager (never in environment files or code)

### A03: Injection
- Prisma ORM: parameterized queries by default (no raw SQL string interpolation)
- All user inputs validated via Zod before processing
- `prisma.$executeRaw` and `prisma.$queryRaw` avoided in application code
- If raw SQL needed (RLS setup): use `prisma.$executeRaw` with template literals (auto-parameterized)
- NoSQL injection: N/A (PostgreSQL only)

### A04: Insecure Design
- Threat modeling documented for each sensitive feature (leads, billing, AI scraping)
- Security review required for PR changes to auth, billing, or data access paths
- Principle of least privilege in IAM roles (ECS task roles scoped to exact resources needed)
- Defense-in-depth: five independent isolation layers (see Multi-Tenant Design doc)

### A05: Security Misconfiguration
- Terraform manages all infrastructure (no manual console changes in production)
- Security groups follow allow-list model (default deny)
- S3 buckets have BlockPublicAccess enabled
- No default credentials (RDS, Redis, ECR all require IAM or Secrets Manager)
- CloudFormation StackSets enforce baseline security controls across AWS accounts
- Regular AWS Trusted Advisor scans scheduled monthly

### A06: Vulnerable and Outdated Components
- `npm audit` runs in CI pipeline on every PR
- `dependabot.yml` configured for weekly dependency updates
- Trivy container vulnerability scan runs weekly and on every build
- Python dependencies checked with `safety check` in CI
- Node.js LTS version pinned in Dockerfile (`node:20-alpine`)

### A07: Identification and Authentication Failures
- Authentication fully delegated to Clerk (battle-tested auth infrastructure)
- JWT short expiry (1 hour), automatic refresh by Clerk SDK
- JWT stored in httpOnly cookie (not localStorage — XSS-resistant)
- Session revocation supported via Clerk webhook → Redis invalidation
- No custom password storage (Clerk manages all passwords with bcrypt)
- MFA supported via Clerk (TOTP, SMS)

### A08: Software and Data Integrity Failures
- CI/CD pipeline: code review required before merge
- Docker images: Trivy vulnerability scan before push to ECR
- ECR image signing (AWS Signer) for production deployments
- Terraform state stored in S3 with versioning + DynamoDB lock (no manual state edits)
- Package lock files committed (pnpm-lock.yaml, poetry.lock) for reproducible builds
- Clerk webhook signature verification (Svix) — no unverified webhooks processed

### A09: Security Logging and Monitoring Failures
- Audit logs written for all data mutations (see Section 11)
- CloudWatch alarms for: 5xx rate spike, unusual traffic patterns, RDS query anomalies
- WAF logs all blocked requests to CloudWatch
- RDS Enhanced Monitoring enabled (60-second granularity)
- ALB access logs to S3 (90-day retention)
- Security Hub enabled for AWS-level security findings
- GuardDuty enabled for threat detection (anomalous API calls, unusual data transfer)

### A10: Server-Side Request Forgery (SSRF)
- Scraping jobs (FastAPI) validate target URLs against an allowlist of domains
- No user-supplied URLs are fetched from the Next.js application layer
- VPC has no access to EC2 instance metadata service from ECS (IMDSv2 required; disable for ECS)
- Outbound from ECS restricted to known endpoints via security groups + NACLs
- Custom domain DNS verification: resolves only to expected CNAME targets

---

## 11. Audit Logging Strategy

### What Is Logged

Every significant data mutation writes an audit log entry:

```typescript
// lib/audit.ts
export async function auditLog({
  organizationId,
  userId,
  actorType = 'user',
  apiKeyId,
  action,            // e.g., 'lead.created', 'lead.status_changed', 'member.invited'
  resourceType,      // e.g., 'lead', 'organization_member', 'api_key'
  resourceId,
  before,            // snapshot of resource before change
  after,             // snapshot of resource after change
  req,               // Request object for IP/UA
}: AuditLogInput): Promise<void> {
  await adminPrisma.auditLog.create({
    data: {
      organizationId,
      userId,
      actorType,
      apiKeyId,
      action,
      resourceType,
      resourceId,
      beforeJson: before ? JSON.parse(JSON.stringify(before)) : undefined,
      afterJson:  after  ? JSON.parse(JSON.stringify(after))  : undefined,
      ipAddress:  req?.headers.get('x-forwarded-for')?.split(',')[0],
      userAgent:  req?.headers.get('user-agent'),
      requestId:  req?.headers.get('x-request-id'),
    },
  });
}
```

### Audit Log Events

| Event                              | Action String                   |
|------------------------------------|----------------------------------|
| Lead created                       | `lead.created`                  |
| Lead status changed                | `lead.status_changed`           |
| Lead deleted                       | `lead.deleted`                  |
| Lead exported                      | `lead.exported`                 |
| Member invited                     | `member.invited`                |
| Member role changed                | `member.role_changed`           |
| Member removed                     | `member.removed`                |
| API key created                    | `api_key.created`               |
| API key revoked                    | `api_key.revoked`               |
| Subscription changed               | `subscription.plan_changed`     |
| Custom domain added/removed        | `website.domain_changed`        |
| Organization suspended             | `organization.suspended`        |
| GDPR data export requested         | `gdpr.export_requested`         |
| GDPR erasure requested             | `gdpr.erasure_requested`        |

### Audit Log Immutability

The application role (`app_user`) has no UPDATE or DELETE permission on the `audit_logs` table. This is enforced at the database role level:

```sql
REVOKE UPDATE ON audit_logs FROM app_user;
REVOKE DELETE ON audit_logs FROM app_user;
```

Audit logs are archived to S3 Glacier after 2 years and retained for 7 years.

---

## 12. GDPR Compliance Checklist

### Lawful Basis for Processing

| Data Category               | Lawful Basis                               |
|-----------------------------|---------------------------------------------|
| Tenant user account data    | Contract (SaaS subscription agreement)      |
| End-user analytics          | Legitimate interest (+ consent for cookies) |
| Lead data (prospecting)     | Legitimate interest                         |
| AI-scraped lead data        | Legitimate interest (business data, public sources) |
| Email marketing             | Consent                                     |

### Data Minimization

- Analytics events hash IP addresses (SHA-256 with daily rotating salt)
- City-level geolocation only (no street address)
- Browser fingerprinting: visitor ID derived from hashed UA + IP (not persistent)
- Lead PII: only collect fields required for sales process

### Consent Management

- [x] Cookie consent banner on all tenant microsites (pre-tracking)
- [x] Granular consent: Functional, Analytics, Marketing categories
- [x] Analytics SDK checks consent before firing events
- [x] Consent stored with timestamp in analytics_events
- [x] PostHog configured in opt-out mode by default
- [x] Consent withdrawal: clears cookies and stops future tracking

### Data Subject Rights Implementation

- [x] Right to Access: `GET /api/v1/gdpr/export` — JSON/ZIP of all user PII
- [x] Right to Erasure: `DELETE /api/v1/gdpr/erase` — anonymizes name, email, phone in leads/users
- [x] Right to Portability: same as Access endpoint, machine-readable JSON
- [x] Right to Rectification: standard profile update endpoints
- [x] Right to Restriction: `POST /api/v1/gdpr/restrict` — sets `processing_restricted = true`
- [x] Data retention enforcement: automated job to anonymize leads older than 3 years

### Sub-Processor Data Processing Agreements

| Sub-Processor  | Data Shared                    | DPA Required | Status     |
|----------------|--------------------------------|--------------|------------|
| AWS            | All data (hosting)             | Yes          | Signed     |
| Clerk          | User auth data                 | Yes          | Signed     |
| Stripe         | Billing data                   | Yes          | Signed     |
| OpenAI         | Lead data for scoring          | Yes          | Signed     |
| PostHog        | Analytics events               | Yes          | Signed     |

---

## 13. Penetration Testing Checklist

Perform annually and after major architecture changes. Scope:

### Authentication & Session Tests

- [ ] JWT token forgery attempt (modify claims without valid signature)
- [ ] JWT algorithm confusion attack (HS256 vs RS256)
- [ ] Session fixation: can a pre-auth session be used post-auth?
- [ ] Session tokens in URLs (should never occur; use cookies)
- [ ] Brute force protection on sign-in (Clerk handles; verify lockout)
- [ ] Account enumeration via login error messages
- [ ] Password reset token expiry and one-time use enforcement

### Authorization Tests (IDOR / Privilege Escalation)

- [ ] Direct object reference: access `/api/v1/leads/{other_tenant_id_lead}` with valid JWT for different org
- [ ] Horizontal privilege escalation: Editor accessing OrgAdmin-only endpoints
- [ ] Vertical privilege escalation: manipulate org_role in request to gain SuperAdmin
- [ ] Cross-tenant data leakage: verify RLS blocks all cross-tenant queries
- [ ] API key cross-tenant: use org-A's API key to access org-B's data (should fail)
- [ ] Mass assignment: PATCH lead with `organization_id` in body (should be ignored)

### Input Validation Tests

- [ ] SQL injection via all string parameters (Prisma ORM should prevent; verify)
- [ ] XSS in stored fields: blog content, lead name, custom CSS (verify sanitization)
- [ ] Path traversal in file upload paths (`../../etc/passwd` in filename)
- [ ] SSRF via URL inputs (website URL, scraping target URL)
- [ ] XXE via SVG file upload
- [ ] ReDoS (regex denial-of-service) on email validation patterns
- [ ] Large payload injection (max request body size enforced?)

### Infrastructure Tests

- [ ] Port scan: verify only 443/80 exposed publicly; no direct access to RDS, Redis
- [ ] S3 bucket enumeration: no publicly accessible buckets or objects
- [ ] CloudFront bypass: direct ALB access without CloudFront (should require secret header)
- [ ] Metadata service access: ECS tasks should not reach `169.254.169.254` (IMDSv2 only)
- [ ] Secrets exposure: verify no secrets in CloudWatch logs, error messages, or responses
- [ ] Docker image scanning: no secrets baked into container images

### Business Logic Tests

- [ ] Plan limit bypass: exceed storage/API call/user limits without upgrading
- [ ] Free trial abuse: create multiple free trial accounts from same organization
- [ ] Lead import: upload malicious CSV (CSV injection, macro injection)
- [ ] Media upload: upload executable disguised as image (verify MIME type validation)
- [ ] Webhook replay attack: reuse a valid webhook signature for a different payload
- [ ] Rate limit bypass: distribute requests across IPs to avoid rate limits

### Reporting

- All findings categorized by CVSS score (Critical/High/Medium/Low)
- Critical and High findings: remediated within 7 days
- Medium findings: remediated within 30 days
- Low findings: remediated in next quarterly release
- Pentest reports stored securely (not in public Git repo)
