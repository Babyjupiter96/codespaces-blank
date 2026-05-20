# AWS Infrastructure Plan — Multi-Tenant Construction SaaS

## Table of Contents
1. [VPC Design](#1-vpc-design)
2. [ECS Fargate](#2-ecs-fargate)
3. [RDS PostgreSQL](#3-rds-postgresql)
4. [ElastiCache Redis](#4-elasticache-redis)
5. [S3 Buckets](#5-s3-buckets)
6. [CloudFront Distributions](#6-cloudfront-distributions)
7. [Route53](#7-route53)
8. [ACM Certificates](#8-acm-certificates)
9. [WAF Configuration](#9-waf-configuration)
10. [Kinesis Data Streams](#10-kinesis-data-streams)
11. [Lambda Functions](#11-lambda-functions)
12. [SQS Queues](#12-sqs-queues)
13. [Secrets Manager](#13-secrets-manager)
14. [CloudWatch](#14-cloudwatch)
15. [Cost Estimates](#15-cost-estimates)

---

## 1. VPC Design

### CIDR Layout

```
Region: us-east-1 (primary)

VPC CIDR: 10.0.0.0/16

Availability Zones: us-east-1a, us-east-1b, us-east-1c

Public Subnets (ALB, NAT Gateways):
  us-east-1a: 10.0.1.0/24    (254 hosts)
  us-east-1b: 10.0.2.0/24    (254 hosts)
  us-east-1c: 10.0.3.0/24    (254 hosts)

Private Subnets (ECS Tasks):
  us-east-1a: 10.0.11.0/24   (254 hosts)
  us-east-1b: 10.0.12.0/24   (254 hosts)
  us-east-1c: 10.0.13.0/24   (254 hosts)

Data Subnets (RDS, ElastiCache):
  us-east-1a: 10.0.21.0/24   (254 hosts)
  us-east-1b: 10.0.22.0/24   (254 hosts)
  us-east-1c: 10.0.23.0/24   (254 hosts)
```

### Network Topology

```
Internet
    |
    | (HTTPS/443, HTTP/80)
    v
+---------------------------+
|   Internet Gateway (IGW)  |
+---------------------------+
    |
+---------------------------+
|   Public Subnets          |
|   - Application Load      |
|     Balancer (ALB)        |
|   - NAT Gateways (1/AZ)   |
+---------------------------+
    |
    | (Internal traffic, 10.0.0.0/16)
    v
+---------------------------+
|   Private Subnets         |
|   - ECS Fargate Tasks     |
|     (Next.js, FastAPI)    |
|   - VPC Endpoints         |
+---------------------------+
    |
    | (Port 5432, 6379)
    v
+---------------------------+
|   Data Subnets            |
|   - RDS PostgreSQL        |
|     (Multi-AZ)            |
|   - ElastiCache Redis     |
|     (Cluster mode)        |
+---------------------------+
```

### Routing

- Public subnets route `0.0.0.0/0` → Internet Gateway
- Private subnets route `0.0.0.0/0` → NAT Gateway (per-AZ for resiliency)
- Data subnets have no route to internet (air-gapped)

### VPC Endpoints (Private Link — Reduces NAT Gateway Costs)

| Endpoint Type | Service           | Purpose                                    |
|---------------|-------------------|--------------------------------------------|
| Gateway       | S3                | ECS to S3 without traversing NAT Gateway   |
| Gateway       | DynamoDB          | Terraform state (if using DynamoDB lock)   |
| Interface     | Secrets Manager   | ECS tasks fetch secrets securely           |
| Interface     | ECR API           | Pull container images from ECR             |
| Interface     | ECR DKR           | Docker image layer pulls                   |
| Interface     | CloudWatch Logs   | Send container logs without internet       |
| Interface     | SQS               | ECS to SQS without NAT Gateway             |
| Interface     | Kinesis Streams   | ECS to Kinesis without NAT Gateway         |

### Security Groups

```
sg-alb:
  Inbound:  443 from 0.0.0.0/0, 80 from 0.0.0.0/0
  Outbound: 3000 to sg-ecs-web, 8000 to sg-ecs-ai

sg-ecs-web:
  Inbound:  3000 from sg-alb
  Outbound: 5432 to sg-rds, 6379 to sg-redis, 443 to 0.0.0.0/0 (via NAT)

sg-ecs-ai:
  Inbound:  8000 from sg-alb, 8000 from sg-ecs-web
  Outbound: 5432 to sg-rds, 6379 to sg-redis, 443 to 0.0.0.0/0

sg-rds:
  Inbound:  5432 from sg-ecs-web, 5432 from sg-ecs-ai
  Outbound: (none)

sg-redis:
  Inbound:  6379 from sg-ecs-web, 6379 from sg-ecs-ai
  Outbound: (none)
```

### Network ACLs (Stateless — Extra Layer)

- Data subnet NACL: only allow traffic from private subnet CIDR (`10.0.11.0/22`)
- Public subnet NACL: allow 443, 80 inbound; ephemeral ports 1024-65535 for responses

---

## 2. ECS Fargate

### ECS Cluster

```
Cluster Name: construction-saas-{env}
Capacity Providers: FARGATE, FARGATE_SPOT
  Default Strategy: FARGATE_SPOT 70% / FARGATE 30% (cost optimization)
Container Insights: Enabled (CloudWatch metrics)
```

### Task Definitions

#### Next.js Web Service

```
Family: web-{env}
CPU:    512 (0.5 vCPU)
Memory: 1024 MB (1 GB)
Network Mode: awsvpc
Task Role: iam-role-ecs-web-task (S3, Secrets Manager, SQS, Kinesis access)
Execution Role: iam-role-ecs-execution (ECR, CloudWatch Logs access)

Containers:
  web:
    Image:     {account}.dkr.ecr.us-east-1.amazonaws.com/web:{tag}
    Port:      3000
    Memory:    896 MB (soft: 768 MB)
    CPU:       448
    Environment Variables: (from Secrets Manager)
      - DATABASE_URL
      - DIRECT_DATABASE_URL
      - REDIS_URL
      - CLERK_SECRET_KEY
      - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
    Log Driver: awslogs
    Log Group:  /ecs/web-{env}
    Health Check: CMD ["curl", "-f", "http://localhost:3000/api/health"]
    HealthCheck interval: 30s, timeout: 5s, retries: 3, startPeriod: 60s
```

#### FastAPI AI Service

```
Family: ai-service-{env}
CPU:    1024 (1 vCPU)
Memory: 2048 MB (2 GB)
Network Mode: awsvpc
Task Role: iam-role-ecs-ai-task (S3, SQS, Secrets Manager, Bedrock access)

Containers:
  ai-service:
    Image:  {account}.dkr.ecr.us-east-1.amazonaws.com/ai-service:{tag}
    Port:   8000
    Memory: 1792 MB (soft: 1536 MB)
    CPU:    896
    Environment Variables:
      - DATABASE_URL
      - REDIS_URL
      - OPENAI_API_KEY
      - SQS_QUEUE_URL
      - AWS_DEFAULT_REGION

  celery-worker:
    Image:  {account}.dkr.ecr.us-east-1.amazonaws.com/ai-service:{tag}
    Command: ["celery", "-A", "app.tasks.celery_app", "worker", "-l", "info", "-c", "4"]
    Memory: 1792 MB
    CPU:    896
    (No port — worker only)
```

### ECS Services

#### Web Service

```
Service Name: web-{env}
Launch Type: FARGATE (with FARGATE_SPOT capacity provider)
Desired Count: 2 (minimum for HA across AZs)
Deployment Configuration:
  minimumHealthyPercent: 100
  maximumPercent: 200
  deploymentCircuitBreaker: enabled (rollback on failure)
Load Balancer:
  Target Group: tg-web-{env} (port 3000, health: /api/health)
  Listener: ALB HTTPS:443
Network:
  VPC Subnets: private subnets (all 3 AZs)
  Security Group: sg-ecs-web
  Assign Public IP: false
Service Discovery: enabled (internal DNS: web.{env}.local)
Auto Scaling:
  Min: 2, Max: 20
  Policy: Target Tracking (ECSServiceAverageCPUUtilization = 60)
  Scale-out cooldown: 60s
  Scale-in cooldown: 300s
```

#### AI Service

```
Service Name: ai-service-{env}
Launch Type: FARGATE
Desired Count: 1
Deployment Configuration:
  minimumHealthyPercent: 50
  maximumPercent: 200
Network:
  VPC Subnets: private subnets
  Security Group: sg-ecs-ai
  Assign Public IP: false
Auto Scaling:
  Min: 1, Max: 10
  Policy: Target Tracking (SQS ApproximateNumberOfMessagesVisible, target: 10)
```

### Application Load Balancer

```
Name: alb-construction-saas-{env}
Type: Application
Scheme: internet-facing
Subnets: public subnets (all 3 AZs)
Security Group: sg-alb
Access Logs: s3://logs-{account}/alb/

Listeners:
  HTTP:80  → Redirect to HTTPS:443
  HTTPS:443 → Forward to target groups based on host header

Listener Rules (priority order):
  1. Host: admin.buildpro.com → Target Group: tg-web-admin
  2. Host: api.buildpro.com   → Target Group: tg-web (API only)
  3. Host: *.buildpro.com     → Target Group: tg-web
  4. Default                  → Target Group: tg-web

Target Group (tg-web-{env}):
  Protocol: HTTP, Port: 3000
  Health Check: GET /api/health, 200 expected
  Healthy threshold: 2
  Unhealthy threshold: 3
  Interval: 30s, Timeout: 5s
  Stickiness: disabled (stateless)
  Deregistration delay: 30s (fast drain for rolling deploys)
```

---

## 3. RDS PostgreSQL

### Primary Instance

```
Engine:            PostgreSQL 15.4
Instance Class:    db.r6g.large (2 vCPU, 16 GB RAM)  — MVP
                   db.r6g.xlarge (4 vCPU, 32 GB RAM) — Growth
                   db.r6g.2xlarge (8 vCPU, 64 GB RAM) — Scale
Multi-AZ:          true (standby replica in us-east-1b)
Storage:           100 GB gp3 (3000 IOPS baseline, 125 MB/s throughput)
                   Auto-scaling: up to 500 GB
Subnet Group:      data subnets (private, no internet route)
Security Group:    sg-rds
Publicly Accessible: false
Deletion Protection: true (production)
Backup:
  Automated:       35-day retention
  Backup Window:   03:00-04:00 UTC (low traffic)
  Maintenance:     Monday 04:00-05:00 UTC
Parameter Group:   construction-saas-pg15
  - shared_buffers: {DBMemory*0.25}  (e.g., 4GB for r6g.large)
  - effective_cache_size: {DBMemory*0.75}
  - max_connections: 200
  - log_min_duration_statement: 1000ms
  - log_checkpoints: on
  - log_connections: on
  - log_lock_waits: on
  - wal_level: logical (for potential future CDC)
  - row_security: on
Performance Insights: enabled (7-day free retention)
Enhanced Monitoring: enabled (60-second granularity)
```

### Read Replica

```
Instance Class: db.r6g.large (same as primary at Growth)
AZ: us-east-1c (different from primary and standby)
Purpose: Analytics queries, ISR data fetches, dashboard reads
Promoted to primary: manual promotion only (failover not auto for replica)
```

### Connection Pooling (PgBouncer)

PgBouncer runs as a sidecar container in the ECS task or as a separate ECS service:

```
PgBouncer Configuration:
  pool_mode: transaction
  max_client_conn: 500
  default_pool_size: 20 (per database)
  server_pool_size: 5
  server_lifetime: 3600
  server_idle_timeout: 600
  log_connections: 0     (reduce noise)
  log_disconnections: 0
  stats_period: 60
```

---

## 4. ElastiCache Redis

### Cluster Configuration

```
Engine:           Redis 7.2
Node Type:        cache.r6g.large (2 vCPU, 13 GB)  — MVP
                  cache.r6g.large cluster mode       — Growth
                  cache.r6g.xlarge cluster mode      — Scale

MVP (Single Node):
  Cluster Mode: disabled
  1 node (no replica)
  Note: acceptable for MVP; add replica before launch if budget allows

Growth (Cluster Mode Enabled):
  Cluster Mode: enabled
  Shards: 2
  Replicas per shard: 1
  Total nodes: 4 (2 primary + 2 replica)

Scale:
  Shards: 3
  Replicas per shard: 2
  Total nodes: 9

Subnet Group: data subnets
Security Group: sg-redis
At-Rest Encryption: enabled (AES-256)
In-Transit Encryption: enabled (TLS)
Automatic Failover: enabled (Growth+)
Backup: daily snapshot, 7-day retention
Maintenance Window: Sunday 03:00-04:00 UTC
```

### Key Namespacing Strategy

```
Tenant config:        tenant:config:{org_id}          TTL: 600s
Tenant slug map:      tenant:slug:{slug}               TTL: 300s
Tenant domain map:    tenant:domain:{hostname}         TTL: 900s
Session:              session:{clerk_id}               TTL: 3600s
Feature flags:        tenant:flags:{org_id}            TTL: 3600s
Rate limit:           rl:{type}:{identifier}:{window}  TTL: 60s
Analytics cache:      analytics:{org_id}:{date}:{key}  TTL: 300s
JWKS cache:           auth:jwks:clerk                  TTL: 3600s
```

---

## 5. S3 Buckets

### Bucket Inventory

| Bucket Name                             | Purpose                                    | Versioning | Public |
|-----------------------------------------|--------------------------------------------|------------|--------|
| `construction-saas-media-{env}`         | Tenant media assets (images, videos, docs) | Enabled    | No     |
| `construction-saas-assets-{env}`        | Static app assets (fallback origin)        | Disabled   | No     |
| `construction-saas-exports-{env}`       | CSV exports, GDPR data exports             | Disabled   | No     |
| `construction-saas-backups-{env}`       | RDS snapshots, audit log archives          | Disabled   | No     |
| `construction-saas-logs-{env}`          | ALB access logs, CloudFront logs, WAF logs | Disabled   | No     |
| `construction-saas-tf-state`            | Terraform remote state                     | Enabled    | No     |

### Media Bucket — Folder Structure

```
construction-saas-media-{env}/
├── tenants/
│   └── {organization_id}/
│       ├── projects/
│       │   └── {project_id}/
│       │       ├── cover.jpg
│       │       ├── gallery/
│       │       │   ├── img-001.jpg
│       │       │   └── img-001-thumb.jpg
│       ├── blog/
│       │   └── {post_id}/
│       │       └── cover.jpg
│       ├── theme/
│       │   ├── logo.png
│       │   └── favicon.ico
│       └── uploads/
│           └── {year}/{month}/{filename}
```

### Bucket Policies

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "CloudFrontReadOnly",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::construction-saas-media-{env}/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::{account}:distribution/{dist-id}"
        }
      }
    },
    {
      "Sid": "DenyPublicAccess",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::construction-saas-media-{env}",
        "arn:aws:s3:::construction-saas-media-{env}/*"
      ],
      "Condition": {
        "Bool": { "aws:SecureTransport": "false" }
      }
    }
  ]
}
```

### S3 Lifecycle Rules

```
Media bucket:
  Rule 1: Transition to Standard-IA after 90 days (infrequently accessed old images)
  Rule 2: Transition to Glacier Instant Retrieval after 365 days
  Rule 3: Delete incomplete multipart uploads after 7 days

Logs bucket:
  Rule 1: Transition to Standard-IA after 30 days
  Rule 2: Transition to Glacier after 90 days
  Rule 3: Delete after 365 days

Backups bucket:
  Rule 1: Transition to Glacier after 7 days
  Rule 2: Delete after 90 days

Exports bucket:
  Rule 1: Delete after 30 days (exports are temporary download links)
```

---

## 6. CloudFront Distributions

### Distribution 1 — Main Application (Tenant Microsites + Admin)

```
Origin: ALB (alb-construction-saas-{env})
Origin Protocol: HTTPS only
Origin Header: X-CF-Secret: {secret} (validates requests came from CloudFront)
Price Class: PriceClass_100 (US + Europe)
Aliases:
  - buildpro.com
  - *.buildpro.com
  - admin.buildpro.com
SSL Certificate: ACM wildcard (*.buildpro.com + buildpro.com)
HTTP Version: HTTP/2 + HTTP/3
Security Headers Policy: custom (HSTS, CSP, X-Frame-Options)
Logging: s3://construction-saas-logs-{env}/cloudfront/

Cache Behaviors:
  /api/*            → No cache (Forward all headers, cookies, query strings)
  /_next/static/*   → Cache Forever (max-age=31536000, immutable; from S3 fallback)
  /sitemap.xml      → Cache 1 hour
  /robots.txt       → Cache 1 hour
  /favicon.ico      → Cache 24 hours
  Default (*)       → ISR cache (s-maxage=60, stale-while-revalidate=3600)

WAF: aws-waf-construction-saas (all rules applied)
Origin Shield: enabled in us-east-1 (reduces origin hits by ~60%)
```

### Distribution 2 — Media Assets (S3 Origin)

```
Origin: S3 (construction-saas-media-{env}) via OAC (Origin Access Control)
Price Class: PriceClass_All (global reach for tenant images)
Aliases: cdn.buildpro.com, media.buildpro.com
SSL Certificate: ACM (cdn.buildpro.com)

Cache Behaviors:
  /tenants/*/theme/*   → Cache 24 hours (logos, favicons)
  /tenants/*/projects/* → Cache 1 hour (project images)
  /tenants/*/blog/*    → Cache 1 hour (blog images)
  Default              → Cache 1 hour

Image Optimization: CloudFront + Lambda@Edge for on-the-fly WebP conversion
Response Compression: gzip + brotli enabled
```

---

## 7. Route53

### Hosted Zones

```
buildpro.com (public hosted zone)
  A    buildpro.com          → CloudFront Distribution 1 (alias)
  A    *.buildpro.com        → CloudFront Distribution 1 (alias, wildcard)
  A    admin.buildpro.com    → CloudFront Distribution 1 (alias)
  A    cdn.buildpro.com      → CloudFront Distribution 2 (alias)
  CNAME proxy.buildpro.com   → CloudFront Distribution 1 DNS name (custom domain CNAME target)
  MX   buildpro.com          → AWS SES (email sending for notifications)
  TXT  _dmarc.buildpro.com   → DMARC policy
  TXT  buildpro.com          → SPF record

internal.buildpro.com (private hosted zone, VPC-only)
  A    web.internal.buildpro.com → ALB internal DNS
  A    ai.internal.buildpro.com  → ALB internal path for AI service
```

### Custom Domain Flow (Per-Tenant)

```
Tenant wants: www.clientco.com → buildpro tenant microsite

1. Tenant adds CNAME in their domain registrar:
   www.clientco.com → proxy.buildpro.com

2. Route53: proxy.buildpro.com → CloudFront Distribution 1

3. CloudFront distribution has CNAME alias for www.clientco.com (added via API)

4. ACM certificate for www.clientco.com issued via DNS validation (automated)

5. Middleware detects www.clientco.com, resolves to tenant, renders microsite
```

### Health Checks

```
Primary ALB health check:
  Type: HTTPS
  FQDN: alb-{env}.us-east-1.elb.amazonaws.com
  Path: /api/health
  Interval: 30s
  Threshold: 3 consecutive failures → CloudWatch alarm

Route53 resolver logging: enabled for private hosted zone debugging
```

---

## 8. ACM Certificates

### Wildcard Certificate (Primary)

```
Domain:       buildpro.com
SANs:         *.buildpro.com
Region:       us-east-1 (required for CloudFront)
Validation:   DNS (auto-validated via Route53)
Auto-renewal: Enabled
Used by:      CloudFront Distribution 1 (main app)
```

### Per-Tenant Custom Domain Certificates

Custom domain certs are provisioned programmatically via the AWS SDK when tenants add custom domains:

```python
# Lambda: custom-domain-provisioner
async def provision_certificate(domain: str) -> str:
    """
    1. Request ACM certificate for domain
    2. Get DNS validation records from ACM
    3. Return CNAME record for tenant to add to their DNS
    4. Poll until domain_status='ISSUED' (Lambda scheduled every 5 min)
    5. Update CloudFront distribution with new CNAME alias
    6. Update websites.domain_verified = true in DB
    """
    acm = boto3.client('acm', region_name='us-east-1')
    response = acm.request_certificate(
        DomainName=domain,
        ValidationMethod='DNS',
        Tags=[{'Key': 'tenant-domain', 'Value': domain}]
    )
    return response['CertificateArn']
```

---

## 9. WAF Configuration

### WebACL: aws-waf-construction-saas

```
Scope: CLOUDFRONT (global)
Default Action: Allow

Rules (in priority order):

Priority 1 — AWSManagedRulesCommonRuleSet
  Action: Block
  Covers: XSS, SQLi, size restrictions, known attack patterns

Priority 2 — AWSManagedRulesKnownBadInputsRuleSet
  Action: Block
  Covers: Log4j exploits, RFI, host header injection

Priority 3 — AWSManagedRulesAmazonIpReputationList
  Action: Block
  Covers: Known malicious IP addresses, botnets

Priority 4 — AWSManagedRulesBotControlRuleSet
  Action: Challenge (CAPTCHA for suspicious bots)
  Override: Allow for known good bots (Googlebot, Bingbot)

Priority 5 — Rate Limit: Tenant API Requests
  Rule Type: Rate-based
  Limit: 1000 requests per 5 minutes per IP
  Scope: All requests
  Action: Block (429 response)

Priority 6 — Rate Limit: Auth Endpoints
  Rule Type: Rate-based
  Scope: URI path starts with /api/v1/auth/
  Limit: 100 requests per 5 minutes per IP
  Action: Block

Priority 7 — Rate Limit: Webhook Endpoints
  Rule Type: Rate-based
  Scope: URI path starts with /api/v1/webhooks/
  Limit: 500 requests per minute per IP
  Action: Block

Priority 8 — Geo-Blocking (Optional, configurable)
  Rule Type: IP Set (geo match)
  Action: Block
  Default: No countries blocked in MVP

WAF Logging:
  Log Group: /aws/waf/construction-saas-{env}
  Sampled Requests: All blocked requests logged
  Integration: CloudWatch Metrics + Dashboards
```

---

## 10. Kinesis Data Streams

### Analytics Event Stream

```
Stream Name:    construction-saas-analytics-{env}
Shard Count:
  MVP:          2 shards  (2,000 events/second, 2 MB/s write)
  Growth:       5 shards  (5,000 events/second, 5 MB/s write)
  Scale:        20 shards (20,000 events/second)

Retention Period: 24 hours (raw events processed and stored in RDS within 5 minutes)
Encryption: Server-side encryption (SSE) with AWS managed key

Auto Scaling:
  Metric: IncomingRecords > 800/shard/second for 5 minutes → add 1 shard
  Metric: IncomingRecords < 200/shard/second for 30 minutes → remove 1 shard
  Note: Kinesis shard updates have 8-hour cooldown; plan capacity ahead

Producer:
  Source: Next.js API Route /api/v1/analytics/events
  Library: @aws-sdk/client-kinesis (PutRecords batch API)
  Partition Key: organization_id (ensures org events go to same shard for ordering)
  Batch Size: Up to 500 records per PutRecords call

Consumer:
  Type: Lambda (Enhanced Fan-Out for dedicated 2MB/s read per Lambda)
  Trigger: Kinesis event source mapping on stream
  Batch Size: 1000 records
  Maximum Batching Window: 10 seconds (trade latency for batch efficiency)
  Parallelization Factor: 1 (1 Lambda per shard)
  Bisect Batch On Error: true
  Destination on failure: SQS DLQ
```

---

## 11. Lambda Functions

### Analytics Event Processor

```
Function Name:    analytics-event-processor-{env}
Runtime:          nodejs20.x
Memory:           512 MB
Timeout:          300 seconds (5 minutes)
Architecture:     arm64 (Graviton2, 20% cheaper)
VPC:              Private subnets (needs RDS access)
Security Group:   sg-lambda-analytics
Provisioned Concurrency: 2 (avoid cold starts for real-time processing)

Environment Variables:
  DATABASE_URL: from Secrets Manager
  BATCH_SIZE: 100 (INSERT batch size for SQL)

Trigger: Kinesis stream (construction-saas-analytics-{env})
DLQ: SQS (analytics-dlq-{env})

Logic:
  1. Receive batch of records from Kinesis
  2. Parse and validate each event JSON
  3. Group by organization_id
  4. Bulk INSERT to analytics_events (100 rows per statement)
  5. Upsert analytics_sessions (update duration, page_count)
  6. Return success (Kinesis advances shard iterator)
```

### Custom Domain Certificate Provisioner

```
Function Name:    domain-cert-provisioner-{env}
Runtime:          python3.12
Memory:           256 MB
Timeout:          60 seconds
Architecture:     arm64
VPC:              Not in VPC (needs ACM, CloudFront, Route53 API access)

Triggers:
  1. SQS event (when tenant adds custom domain)
  2. EventBridge scheduled rule (every 5 minutes, check pending domains)

Logic:
  1. Check domains with status='verifying' in DB
  2. Call ACM DescribeCertificate → check ValidationStatus
  3. If 'ISSUED': update CloudFront distribution + update DB status='active'
  4. If 'PENDING_VALIDATION' > 24 hours: send alert to OrgAdmin
```

### Analytics Partition Creator

```
Function Name:    analytics-partition-creator-{env}
Runtime:          python3.12
Memory:           256 MB
Timeout:          60 seconds
VPC:              Private subnets

Trigger: EventBridge scheduled rule (1st of each month, 00:05 UTC)

Logic:
  1. Calculate next month's date range
  2. Execute: CREATE TABLE analytics_events_{YYYY}_{MM} PARTITION OF analytics_events ...
  3. Also DROP partition from 14 months ago (after S3 archival)
```

### CloudFront Cache Invalidator

```
Function Name:    cf-cache-invalidator-{env}
Runtime:          nodejs20.x
Memory:           128 MB
Timeout:          30 seconds

Trigger: SQS queue (cache-invalidation-{env})
  Messages published by Next.js API when content is updated

Logic:
  1. Receive cache invalidation request { tenantSlug, paths[] }
  2. Determine CloudFront distribution for tenant
  3. Create CloudFront invalidation for specified paths
  4. Log invalidation ID to CloudWatch
```

---

## 12. SQS Queues

### Queue Inventory

```
Queue 1: ai-jobs-{env}
  Type: Standard (ordering not required for AI jobs)
  Visibility Timeout: 300s (5 min — jobs can take up to 3 min)
  Message Retention: 4 days
  Receive Message Wait Time: 20s (long polling)
  Redrive Policy: After 3 failures → ai-jobs-dlq-{env}
  Encryption: SSE-SQS

Queue 2: ai-jobs-dlq-{env}
  Type: Standard
  Message Retention: 14 days (for debugging failed jobs)

Queue 3: email-notifications-{env}
  Type: Standard
  Visibility Timeout: 60s
  Message Retention: 1 day
  Redrive Policy: After 2 failures → email-dlq-{env}

Queue 4: scraping-jobs-{env}
  Type: Standard
  Visibility Timeout: 600s (10 min — scraping can take time)
  Message Retention: 4 days
  Redrive Policy: After 2 failures → scraping-dlq-{env}

Queue 5: cache-invalidation-{env}
  Type: Standard
  Visibility Timeout: 30s
  Message Retention: 1 hour (invalidations must be fast)
  Redrive Policy: After 3 failures → cache-invalidation-dlq-{env}

Queue 6: analytics-dlq-{env}
  Type: Standard
  Message Retention: 14 days
  Purpose: Failed Kinesis Lambda analytics events (for replay)
```

### Message Formats

```json
// ai-jobs queue message
{
  "jobId": "uuid",
  "organizationId": "uuid",
  "jobType": "lead_scoring",
  "priority": "normal",
  "payload": {
    "leadId": "uuid",
    "contextData": {}
  },
  "enqueuedAt": "2025-01-15T10:30:00Z",
  "enqueuedBy": "user_uuid"
}
```

---

## 13. Secrets Manager

### Secret Inventory

```
/construction-saas/{env}/database
  DATABASE_URL: postgresql://app_user:...@rds-endpoint:5432/saas_db
  DIRECT_DATABASE_URL: postgresql://app_user:...@rds-endpoint:5432/saas_db (bypasses PgBouncer)
  ADMIN_DATABASE_URL: postgresql://saas_admin:...@rds-endpoint:5432/saas_db

/construction-saas/{env}/redis
  REDIS_URL: rediss://:{password}@elasticache-endpoint:6379/0

/construction-saas/{env}/clerk
  CLERK_SECRET_KEY: sk_live_...
  CLERK_WEBHOOK_SECRET: whsec_...

/construction-saas/{env}/openai
  OPENAI_API_KEY: sk-...

/construction-saas/{env}/stripe
  STRIPE_SECRET_KEY: sk_live_...
  STRIPE_WEBHOOK_SECRET: whsec_...

/construction-saas/{env}/ai-service
  AI_SERVICE_WEBHOOK_SECRET: random-32-byte-hex

/construction-saas/{env}/posthog
  POSTHOG_API_KEY: phc_...
```

### Secret Rotation

- Database credentials: automatic rotation every 30 days (Lambda rotation function)
- Redis password: manual rotation (coordinated with ElastiCache update)
- API keys (Clerk, Stripe, OpenAI): manual rotation with version staging

### IAM Permissions

```json
{
  "Effect": "Allow",
  "Action": [
    "secretsmanager:GetSecretValue",
    "secretsmanager:DescribeSecret"
  ],
  "Resource": [
    "arn:aws:secretsmanager:us-east-1:{account}:secret:/construction-saas/{env}/*"
  ]
}
```

---

## 14. CloudWatch

### Log Groups

```
/ecs/web-{env}              — Next.js application logs
/ecs/ai-service-{env}       — FastAPI service logs
/ecs/celery-{env}           — Celery worker logs
/aws/lambda/analytics-event-processor-{env}
/aws/lambda/domain-cert-provisioner-{env}
/aws/rds/instance/construction-saas-{env}/postgresql
/aws/waf/construction-saas-{env}
/alb/access-logs             — ALB access logs (parsed from S3)
```

Log Retention: 30 days (application), 90 days (RDS), 365 days (WAF + ALB)

### Dashboards

```
Dashboard 1: Platform Overview
  - ECS task count (web + ai-service)
  - ALB request count and latency (p50, p95, p99)
  - ALB 5xx error rate
  - RDS CPU, connections, read/write IOPS
  - Redis CPU, memory, cache hit rate
  - Kinesis incoming record rate

Dashboard 2: Tenant Analytics
  - Analytics events per minute (Kinesis)
  - Lambda processor duration and error rate
  - Analytics DLQ depth (should be 0)

Dashboard 3: AI Service
  - SQS ai-jobs queue depth
  - Celery task success/failure rate
  - OpenAI API latency (custom metric from logs)
  - AI DLQ depth
```

### CloudWatch Alarms

```
CRITICAL Alarms (PagerDuty + Slack):
  - ALB 5xx rate > 5% for 5 minutes
  - ECS task count < 2 (web service)
  - RDS CPU > 90% for 10 minutes
  - RDS free storage < 10 GB
  - Redis CPU > 90% for 10 minutes
  - Analytics DLQ depth > 0

WARNING Alarms (Slack only):
  - ALB p99 latency > 3000ms for 5 minutes
  - ECS CPU utilization > 70% (before auto-scale fires)
  - RDS CPU > 70% for 10 minutes
  - Redis cache hit rate < 80%
  - SQS ai-jobs depth > 100 messages (backlog growing)
  - Lambda analytics processor error rate > 1%
```

---

## 15. Cost Estimates

All prices in USD, based on AWS us-east-1 on-demand pricing (2025). Reserved instance pricing applied where noted.

### MVP Tier — 10 Tenants, ~1000 page views/day

| Service                 | Config                           | Monthly Cost |
|-------------------------|----------------------------------|--------------|
| ECS Fargate (web)       | 2 tasks × 0.5vCPU × 1GB, 24/7   | $29          |
| ECS Fargate (ai-svc)    | 1 task × 1vCPU × 2GB, 24/7      | $29          |
| RDS PostgreSQL          | db.r6g.large, Multi-AZ, 100GB gp3 | $198 (RI 1yr) |
| ElastiCache Redis       | cache.r6g.large, 1 node         | $96 (RI 1yr)  |
| ALB                     | ~100 LCU/month                   | $22          |
| CloudFront              | ~50 GB transfer, 1M requests     | $10          |
| S3 (media + logs)       | ~20 GB storage, ~10K requests    | $5           |
| Route53                 | 1 hosted zone, ~1M queries       | $1           |
| NAT Gateways            | 3 AZs × ~10 GB data              | $35          |
| Kinesis                 | 2 shards × 730 hours             | $23          |
| Lambda                  | ~1M invocations                  | $2           |
| SQS                     | ~100K messages                   | $1           |
| Secrets Manager         | 8 secrets, ~10K API calls        | $4           |
| CloudWatch              | Logs + metrics + dashboards       | $15          |
| ACM                     | Free (public certs)              | $0           |
| WAF                     | 1 WebACL + 8 rules               | $15          |
| ECR                     | 2 repos, ~5 GB storage           | $5           |
| Data Transfer Out       | ~50 GB                           | $5           |
| **MVP Total**           |                                  | **~$495/mo** |

### Growth Tier — 100 Tenants, ~50K page views/day

| Service                 | Config                                    | Monthly Cost |
|-------------------------|-------------------------------------------|--------------|
| ECS Fargate (web)       | 4-8 tasks avg × 0.5vCPU × 1GB            | $116         |
| ECS Fargate (ai-svc)    | 2-4 tasks avg × 1vCPU × 2GB              | $116         |
| RDS PostgreSQL          | db.r6g.xlarge, Multi-AZ + 1 Read Replica | $528 (RI)    |
| ElastiCache Redis       | cache.r6g.large, 2-shard cluster (4 nodes)| $384 (RI)   |
| ALB                     | ~2000 LCU/month                           | $85          |
| CloudFront              | ~500 GB transfer, 20M requests            | $85          |
| S3 (media + logs)       | ~500 GB storage, ~500K requests           | $20          |
| Route53                 | 1 zone, ~10M queries                      | $5           |
| NAT Gateways            | 3 AZs × ~100 GB data                     | $140         |
| Kinesis                 | 5 shards                                 | $57          |
| Lambda                  | ~10M invocations                          | $20          |
| SQS                     | ~5M messages                              | $5           |
| Secrets Manager         | 10 secrets, ~100K API calls               | $8           |
| CloudWatch              | Larger log volumes                        | $50          |
| WAF                     | Higher request volume                     | $50          |
| ECR                     | 2 repos, ~10 GB storage                   | $10          |
| Data Transfer Out       | ~500 GB                                   | $45          |
| **Growth Total**        |                                           | **~$1,724/mo** |

### Scale Tier — 1,000 Tenants, ~1M page views/day

| Service                 | Config                                          | Monthly Cost |
|-------------------------|-------------------------------------------------|--------------|
| ECS Fargate (web)       | 10-20 tasks avg × 0.5vCPU × 1GB (Spot mix)      | $580         |
| ECS Fargate (ai-svc)    | 5-10 tasks avg × 1vCPU × 2GB                    | $580         |
| RDS PostgreSQL          | db.r6g.2xlarge, Multi-AZ + 2 Read Replicas       | $2,160 (RI)  |
| ElastiCache Redis       | cache.r6g.xlarge, 3-shard cluster (9 nodes)      | $1,620 (RI)  |
| ALB                     | ~20,000 LCU/month                               | $715         |
| CloudFront              | ~10 TB transfer, 500M requests                  | $1,150       |
| S3 (media + logs)       | ~10 TB storage, ~20M requests                   | $280         |
| Route53                 | Multiple zones, ~100M queries                   | $55          |
| NAT Gateways            | 3 AZs × ~1 TB data                             | $500         |
| Kinesis                 | 20 shards                                      | $228         |
| Lambda                  | ~100M invocations                               | $200         |
| SQS                     | ~50M messages                                   | $50          |
| Secrets Manager         | 15 secrets, ~1M API calls                       | $15          |
| CloudWatch              | High-volume logs + metrics                       | $300         |
| WAF                     | Scale-level request volume                       | $250         |
| ECR                     | 4 repos (multi-region)                          | $40          |
| Data Transfer Out       | ~10 TB                                          | $900         |
| Support (Business)      | AWS Business Support                            | $450         |
| **Scale Total**         |                                                | **~$10,073/mo** |

### Cost Reduction Levers at Scale

1. Fargate Spot: 60-70% discount on non-critical tasks (Celery workers, batch jobs)
2. Compute Savings Plans: 20% discount on committed Fargate usage
3. RDS Reserved (3-year): 60% discount vs on-demand
4. CloudFront Origin Shield: reduces ALB + ECS invocations by ~60%
5. S3 Intelligent-Tiering: auto-reduce storage costs for infrequent access
6. Reserved ElastiCache (1-year): 38% savings
7. Custom domains via wildcard cert: avoids per-tenant ACM costs
