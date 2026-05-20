# Database Schema — Multi-Tenant Construction SaaS

## Table of Contents
1. [ER Diagram](#1-er-diagram)
2. [Table Definitions](#2-table-definitions)
3. [Row-Level Security Policies](#3-row-level-security-policies)
4. [Index Strategy](#4-index-strategy)
5. [Partitioning Plan](#5-partitioning-plan)
6. [Database Roles](#6-database-roles)

---

## 1. ER Diagram

```
+------------------+         +----------------------------+
|  organizations   |         |  subscription_plans        |
|------------------|         |----------------------------|
| id (PK)          |         | id (PK)                    |
| name             |         | name                       |
| slug             |         | price_monthly_cents         |
| custom_domain    |         | price_yearly_cents          |
| status           |         | max_tenants                |
| logo_url         |         | max_storage_gb             |
| theme_config     |         | max_api_calls_per_month    |
| plan_id (FK)     +-------->+ features_json              |
| created_at       |         | created_at                 |
| updated_at       |         +----------------------------+
+--------+---------+
         |
         | 1:N
         |
+--------v---------+         +----------------------------+
|  subscriptions   |         |  users                     |
|------------------|         |----------------------------|
| id (PK)          |         | id (PK)                    |
| organization_id  |         | clerk_id (UNIQUE)          |
| plan_id (FK)     |         | email (UNIQUE)             |
| status           |         | first_name                 |
| stripe_sub_id    |         | last_name                  |
| current_period_  |         | avatar_url                 |
|   start          |         | phone                      |
| current_period_  |         | created_at                 |
|   end            |         | updated_at                 |
| created_at       |         +----------------------------+
| updated_at       |                    |
+------------------+                    | N:N (via org_members)
                                        |
         +------------------------------+
         |
+--------v--------------------+
|  organization_members       |
|-----------------------------|
| id (PK)                     |
| organization_id (FK)        |-----> organizations
| user_id (FK)                |-----> users
| role_id (FK)                |-----> roles
| invited_by_user_id (FK)     |-----> users
| invitation_status           |
| joined_at                   |
| created_at                  |
| updated_at                  |
+-----------------------------+

+------------------+         +------------------+
|  roles           |         |  permissions     |
|------------------|         |------------------|
| id (PK)          |         | id (PK)          |
| name             |         | resource         |
| organization_id  |         | action           |
|   (nullable)     |         | description      |
| is_system_role   |         | created_at       |
| created_at       |         +------------------+
| updated_at       |                  |
+--------+---------+                  |
         |                            |
         | N:N (via role_permissions) |
         +----------------------------+
         |
+--------v-----------+
|  role_permissions  |
|--------------------|
| role_id (FK)       |-----> roles
| permission_id (FK) |-----> permissions
| created_at         |
+--------------------+

+------------------+         +---------------------------+
|  websites        |         |  website_themes           |
|------------------|         |---------------------------|
| id (PK)          |         | id (PK)                   |
| organization_id  |         | organization_id (FK)      |
| theme_id (FK)    +-------->+ name                      |
| title            |         | primary_color             |
| description      |         | secondary_color           |
| custom_domain    |         | accent_color              |
| domain_verified  |         | font_heading              |
| domain_status    |         | font_body                 |
| favicon_url      |         | logo_url                  |
| og_image_url     |         | dark_mode_enabled         |
| google_analytics |         | custom_css                |
| status           |         | header_config_json        |
| seo_config_json  |         | footer_config_json        |
| created_at       |         | created_at                |
| updated_at       |         | updated_at                |
+--------+---------+         +---------------------------+
         |
         | 1:N
+--------v---------+
|  website_pages   |
|------------------|
| id (PK)          |
| website_id (FK)  |
| organization_id  |
| title            |
| slug             |
| content_json     |
| meta_title       |
| meta_description |
| og_image_url     |
| page_type        |
| status           |
| sort_order       |
| created_at       |
| updated_at       |
+------------------+

+---------------------+       +---------------------+
|  construction_      |       |  project_images     |
|  projects           |       |---------------------|
|---------------------|       | id (PK)             |
| id (PK)             |       | project_id (FK)     |
| organization_id(FK) |       | organization_id(FK) |
| title               |       | asset_id (FK)       |
| slug                |       | caption             |
| description         |       | alt_text            |
| project_type        |       | sort_order          |
| status              |       | is_cover_image      |
| location            |       | created_at          |
| city                |       | updated_at          |
| state               +------>+---------------------+
| country             |
| start_date          |       +---------------------+
| completion_date     |       |  media_assets       |
| budget_cents        |       |---------------------|
| client_name         |       | id (PK)             |
| testimonial         |       | organization_id(FK) |
| is_featured         |       | file_name           |
| cover_image_url     |       | file_size_bytes     |
| meta_title          |       | mime_type           |
| meta_description    |       | s3_key              |
| created_at          |       | s3_bucket           |
| updated_at          |       | cdn_url             |
+---------------------+       | width_px            |
                              | height_px           |
                              | uploaded_by_id(FK)  |
                              | created_at          |
                              | updated_at          |
                              +---------------------+

+------------------+         +------------------+
|  leads           |         |  lead_notes      |
|------------------|         |------------------|
| id (PK)          |         | id (PK)          |
| organization_id  |         | lead_id (FK)     |
| first_name       |         | organization_id  |
| last_name        |         | user_id (FK)     |
| email            |         | content          |
| phone            |         | created_at       |
| company          |         | updated_at       |
| source           |         +------------------+
| status           |
| pipeline_stage   |         +------------------------+
| assigned_to (FK) |         |  form_submissions      |
| score            |         |------------------------|
| score_reason     |         | id (PK)                |
| project_interest |         | organization_id (FK)   |
| budget_estimate  |         | lead_id (FK, nullable) |
| timeline         |         | form_type              |
| notes            |         | form_data_json         |
| lost_reason      |         | source_url             |
| won_value_cents  |         | utm_source             |
| last_activity_at |         | utm_medium             |
| created_at       |         | utm_campaign           |
| updated_at       |         | ip_address             |
+------------------+         | user_agent             |
                             | created_at             |
                             +------------------------+

+------------------------+    +----------------------+
|  analytics_events      |    |  analytics_sessions  |
|------------------------|    |----------------------|
| id (PK)                |    | id (PK)              |
| organization_id (FK)   |    | organization_id(FK)  |
| session_id (FK)        |    | visitor_id           |
| visitor_id             |    | started_at           |
| event_type             |    | ended_at             |
| page_url               |    | page_count           |
| page_title             |    | duration_seconds     |
| referrer_url           |    | entry_page           |
| utm_source             |    | exit_page            |
| utm_medium             |    | utm_source           |
| utm_campaign           |    | utm_medium           |
| utm_content            |    | utm_campaign         |
| utm_term               |    | device_type          |
| event_data_json        |    | browser              |
| device_type            |    | os                   |
| browser                |    | country              |
| os                     |    | city                 |
| country                |    | is_bounce            |
| city                   |    | lead_id (FK)         |
| ip_address (hashed)    |    | created_at           |
| created_at             |    | updated_at           |
+------------------------+    +----------------------+
(partitioned by month)

+------------------+         +---------------------+
|  blog_posts      |         |  blog_categories    |
|------------------|         |---------------------|
| id (PK)          |         | id (PK)             |
| organization_id  |         | organization_id(FK) |
| author_id (FK)   |         | name                |
| category_id (FK) +-------->+ slug                |
| title            |         | description         |
| slug             |         | meta_title          |
| excerpt          |         | meta_description    |
| content_json     |         | created_at          |
| cover_image_url  |         | updated_at          |
| status           |         +---------------------+
| published_at     |
| meta_title       |
| meta_description |
| og_image_url     |
| reading_time_min |
| tags             |
| schema_json      |
| created_at       |
| updated_at       |
+------------------+

+------------------+         +----------------------+
|  api_keys        |         |  notifications       |
|------------------|         |----------------------|
| id (PK)          |         | id (PK)              |
| organization_id  |         | organization_id(FK)  |
| name             |         | user_id (FK)         |
| key_hash         |         | title                |
| key_prefix       |         | message              |
| scopes           |         | notification_type    |
| last_used_at     |         | is_read              |
| expires_at       |         | action_url           |
| created_by (FK)  |         | metadata_json        |
| revoked_at       |         | created_at           |
| created_at       |         | updated_at           |
| updated_at       |         +----------------------+

+------------------+         +----------------------+
|  audit_logs      |         |  scraping_jobs       |
|------------------|         |----------------------|
| id (PK)          |         | id (PK)              |
| organization_id  |         | organization_id(FK)  |
| user_id          |         | job_type             |
| actor_type       |         | status               |
| action           |         | target_url           |
| resource_type    |         | parameters_json      |
| resource_id      |         | result_count         |
| before_json      |         | error_message        |
| after_json       |         | started_at           |
| ip_address       |         | completed_at         |
| user_agent       |         | celery_task_id       |
| created_at       |         | created_at           |
+------------------+         | updated_at           |
                             +----------------------+

+---------------------+      +----------------------+
|  scraped_leads      |      |  ai_lead_scores      |
|---------------------|      |----------------------|
| id (PK)             |      | id (PK)              |
| organization_id(FK) |      | lead_id (FK)         |
| scraping_job_id(FK) |      | organization_id(FK)  |
| first_name          |      | score                |
| last_name           |      | score_version        |
| email               |      | confidence           |
| phone               |      | reasoning            |
| company             |      | signals_json         |
| website_url         |      | model_used           |
| linkedin_url        |      | created_at           |
| source_url          |      | updated_at           |
| raw_data_json       |      +----------------------+
| import_status       |
| lead_id (FK)        |
| created_at          |
| updated_at          |
+---------------------+
```

---

## 2. Table Definitions

### organizations

```sql
CREATE TABLE organizations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(255) NOT NULL,
    slug                VARCHAR(100) NOT NULL UNIQUE,
    status              VARCHAR(20) NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'suspended', 'pending', 'cancelled')),
    plan_id             UUID REFERENCES subscription_plans(id),
    logo_url            TEXT,
    favicon_url         TEXT,
    primary_email       VARCHAR(255),
    primary_phone       VARCHAR(50),
    address_line1       VARCHAR(255),
    address_line2       VARCHAR(255),
    city                VARCHAR(100),
    state               VARCHAR(100),
    country             VARCHAR(2) DEFAULT 'US',
    postal_code         VARCHAR(20),
    timezone            VARCHAR(50) DEFAULT 'America/New_York',
    locale              VARCHAR(10) DEFAULT 'en-US',
    theme_config        JSONB NOT NULL DEFAULT '{}',
    settings_json       JSONB NOT NULL DEFAULT '{}',
    metadata_json       JSONB NOT NULL DEFAULT '{}',
    clerk_org_id        VARCHAR(255) UNIQUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_organizations_slug ON organizations (slug);
CREATE INDEX idx_organizations_status ON organizations (status);
CREATE INDEX idx_organizations_plan_id ON organizations (plan_id);
CREATE INDEX idx_organizations_clerk_org_id ON organizations (clerk_org_id);
```

### users

```sql
CREATE TABLE users (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_id                VARCHAR(255) NOT NULL UNIQUE,
    email                   VARCHAR(255) NOT NULL UNIQUE,
    email_verified          BOOLEAN NOT NULL DEFAULT false,
    first_name              VARCHAR(100),
    last_name               VARCHAR(100),
    avatar_url              TEXT,
    phone                   VARCHAR(50),
    phone_verified          BOOLEAN NOT NULL DEFAULT false,
    timezone                VARCHAR(50) DEFAULT 'America/New_York',
    locale                  VARCHAR(10) DEFAULT 'en-US',
    processing_restricted   BOOLEAN NOT NULL DEFAULT false,
    last_sign_in_at         TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_clerk_id ON users (clerk_id);
CREATE INDEX idx_users_email ON users (email);
```

### organization_members

```sql
CREATE TABLE organization_members (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id             UUID NOT NULL REFERENCES roles(id),
    invited_by_user_id  UUID REFERENCES users(id),
    invitation_email    VARCHAR(255),
    invitation_status   VARCHAR(20) NOT NULL DEFAULT 'pending'
                            CHECK (invitation_status IN ('pending', 'accepted', 'declined', 'expired')),
    joined_at           TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, user_id)
);

CREATE INDEX idx_org_members_org_id ON organization_members (organization_id);
CREATE INDEX idx_org_members_user_id ON organization_members (user_id);
CREATE INDEX idx_org_members_role_id ON organization_members (role_id);
```

### roles

```sql
CREATE TABLE roles (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(100) NOT NULL,
    organization_id     UUID REFERENCES organizations(id) ON DELETE CASCADE,
    is_system_role      BOOLEAN NOT NULL DEFAULT false,
    description         TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, name)
);

-- System roles are seeded (organization_id is NULL for system roles)
INSERT INTO roles (name, is_system_role) VALUES
    ('SuperAdmin', true),
    ('OrgAdmin', true),
    ('Editor', true),
    ('Viewer', true),
    ('Client', true);

CREATE INDEX idx_roles_organization_id ON roles (organization_id);
CREATE INDEX idx_roles_is_system ON roles (is_system_role);
```

### permissions

```sql
CREATE TABLE permissions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource    VARCHAR(100) NOT NULL,
    action      VARCHAR(50) NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (resource, action)
);

-- Example permissions
INSERT INTO permissions (resource, action) VALUES
    ('organizations', 'read'), ('organizations', 'update'), ('organizations', 'delete'),
    ('members', 'read'), ('members', 'create'), ('members', 'update'), ('members', 'delete'),
    ('websites', 'read'), ('websites', 'create'), ('websites', 'update'), ('websites', 'delete'),
    ('projects', 'read'), ('projects', 'create'), ('projects', 'update'), ('projects', 'delete'),
    ('leads', 'read'), ('leads', 'create'), ('leads', 'update'), ('leads', 'delete'), ('leads', 'export'),
    ('analytics', 'read'),
    ('blog', 'read'), ('blog', 'create'), ('blog', 'update'), ('blog', 'delete'),
    ('media', 'read'), ('media', 'upload'), ('media', 'delete'),
    ('billing', 'read'), ('billing', 'update'),
    ('api_keys', 'read'), ('api_keys', 'create'), ('api_keys', 'delete'),
    ('audit_logs', 'read');
```

### role_permissions

```sql
CREATE TABLE role_permissions (
    role_id         UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id   UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX idx_role_permissions_role_id ON role_permissions (role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions (permission_id);
```

### subscription_plans

```sql
CREATE TABLE subscription_plans (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                    VARCHAR(100) NOT NULL UNIQUE,
    stripe_product_id       VARCHAR(255) UNIQUE,
    stripe_price_monthly_id VARCHAR(255),
    stripe_price_yearly_id  VARCHAR(255),
    price_monthly_cents     INTEGER NOT NULL DEFAULT 0,
    price_yearly_cents      INTEGER NOT NULL DEFAULT 0,
    max_users               INTEGER NOT NULL DEFAULT 3,
    max_projects            INTEGER NOT NULL DEFAULT 10,
    max_leads               INTEGER NOT NULL DEFAULT 100,
    max_storage_gb          INTEGER NOT NULL DEFAULT 5,
    max_api_calls_per_month INTEGER NOT NULL DEFAULT 1000,
    features_json           JSONB NOT NULL DEFAULT '[]',
    is_active               BOOLEAN NOT NULL DEFAULT true,
    sort_order              INTEGER NOT NULL DEFAULT 0,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### subscriptions

```sql
CREATE TABLE subscriptions (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id             UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
    plan_id                     UUID NOT NULL REFERENCES subscription_plans(id),
    status                      VARCHAR(20) NOT NULL DEFAULT 'active'
                                    CHECK (status IN ('active', 'past_due', 'cancelled', 'trialing', 'paused')),
    stripe_subscription_id      VARCHAR(255) UNIQUE,
    stripe_customer_id          VARCHAR(255),
    billing_cycle               VARCHAR(10) NOT NULL DEFAULT 'monthly'
                                    CHECK (billing_cycle IN ('monthly', 'yearly')),
    current_period_start        TIMESTAMPTZ,
    current_period_end          TIMESTAMPTZ,
    trial_end                   TIMESTAMPTZ,
    cancelled_at                TIMESTAMPTZ,
    cancel_at_period_end        BOOLEAN NOT NULL DEFAULT false,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_organization_id ON subscriptions (organization_id);
CREATE INDEX idx_subscriptions_stripe_subscription_id ON subscriptions (stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON subscriptions (status);
```

### websites

```sql
CREATE TABLE websites (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id         UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
    theme_id                UUID REFERENCES website_themes(id),
    title                   VARCHAR(255) NOT NULL,
    tagline                 VARCHAR(500),
    description             TEXT,
    custom_domain           VARCHAR(255) UNIQUE,
    domain_verified         BOOLEAN NOT NULL DEFAULT false,
    domain_status           VARCHAR(20) DEFAULT 'pending'
                                CHECK (domain_status IN ('pending', 'verifying', 'active', 'failed', 'removed')),
    domain_verified_at      TIMESTAMPTZ,
    favicon_url             TEXT,
    og_image_url            TEXT,
    google_analytics_id     VARCHAR(50),
    google_tag_manager_id   VARCHAR(50),
    facebook_pixel_id       VARCHAR(50),
    status                  VARCHAR(20) NOT NULL DEFAULT 'draft'
                                CHECK (status IN ('draft', 'published', 'suspended')),
    seo_config_json         JSONB NOT NULL DEFAULT '{}',
    social_links_json       JSONB NOT NULL DEFAULT '{}',
    contact_info_json       JSONB NOT NULL DEFAULT '{}',
    schema_json             JSONB NOT NULL DEFAULT '{}',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_websites_organization_id ON websites (organization_id);
CREATE INDEX idx_websites_custom_domain ON websites (custom_domain);
CREATE INDEX idx_websites_status ON websites (status);
```

### website_themes

```sql
CREATE TABLE website_themes (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name                VARCHAR(100) NOT NULL,
    primary_color       VARCHAR(7) NOT NULL DEFAULT '#1a56db',
    secondary_color     VARCHAR(7) NOT NULL DEFAULT '#0e9f6e',
    accent_color        VARCHAR(7) NOT NULL DEFAULT '#ff5a1f',
    background_color    VARCHAR(7) NOT NULL DEFAULT '#ffffff',
    text_color          VARCHAR(7) NOT NULL DEFAULT '#111827',
    font_heading        VARCHAR(100) NOT NULL DEFAULT 'Inter',
    font_body           VARCHAR(100) NOT NULL DEFAULT 'Inter',
    font_scale          DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    border_radius       VARCHAR(20) NOT NULL DEFAULT '8px',
    logo_url            TEXT,
    dark_logo_url       TEXT,
    dark_mode_enabled   BOOLEAN NOT NULL DEFAULT false,
    custom_css          TEXT,
    header_config_json  JSONB NOT NULL DEFAULT '{}',
    footer_config_json  JSONB NOT NULL DEFAULT '{}',
    component_overrides JSONB NOT NULL DEFAULT '{}',
    is_active           BOOLEAN NOT NULL DEFAULT true,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_website_themes_organization_id ON website_themes (organization_id);
```

### website_pages

```sql
CREATE TABLE website_pages (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    website_id          UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    parent_page_id      UUID REFERENCES website_pages(id),
    title               VARCHAR(255) NOT NULL,
    slug                VARCHAR(255) NOT NULL,
    content_json        JSONB NOT NULL DEFAULT '{}',
    meta_title          VARCHAR(60),
    meta_description    VARCHAR(160),
    og_image_url        TEXT,
    page_type           VARCHAR(50) NOT NULL DEFAULT 'custom'
                            CHECK (page_type IN ('home', 'about', 'services', 'projects', 'contact', 'blog', 'custom')),
    status              VARCHAR(20) NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft', 'published', 'archived')),
    sort_order          INTEGER NOT NULL DEFAULT 0,
    show_in_nav         BOOLEAN NOT NULL DEFAULT true,
    schema_json         JSONB NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (website_id, slug)
);

CREATE INDEX idx_website_pages_website_id ON website_pages (website_id);
CREATE INDEX idx_website_pages_organization_id ON website_pages (organization_id);
CREATE INDEX idx_website_pages_status ON website_pages (organization_id, status);
CREATE INDEX idx_website_pages_slug ON website_pages (website_id, slug);
```

### construction_projects

```sql
CREATE TABLE construction_projects (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title               VARCHAR(255) NOT NULL,
    slug                VARCHAR(255) NOT NULL,
    description         TEXT,
    short_description   VARCHAR(500),
    project_type        VARCHAR(100),
    status              VARCHAR(20) NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft', 'published', 'archived')),
    location            VARCHAR(255),
    city                VARCHAR(100),
    state               VARCHAR(100),
    country             VARCHAR(2) DEFAULT 'US',
    postal_code         VARCHAR(20),
    latitude            DECIMAL(10, 8),
    longitude           DECIMAL(11, 8),
    start_date          DATE,
    completion_date     DATE,
    duration_days       INTEGER,
    budget_cents        BIGINT,
    square_footage      INTEGER,
    client_name         VARCHAR(255),
    client_testimonial  TEXT,
    client_rating       SMALLINT CHECK (client_rating BETWEEN 1 AND 5),
    is_featured         BOOLEAN NOT NULL DEFAULT false,
    cover_image_url     TEXT,
    tags                TEXT[] NOT NULL DEFAULT '{}',
    services_used       TEXT[] NOT NULL DEFAULT '{}',
    meta_title          VARCHAR(60),
    meta_description    VARCHAR(160),
    og_image_url        TEXT,
    schema_json         JSONB NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, slug)
);

CREATE INDEX idx_projects_organization_id ON construction_projects (organization_id);
CREATE INDEX idx_projects_status ON construction_projects (organization_id, status);
CREATE INDEX idx_projects_is_featured ON construction_projects (organization_id, is_featured);
CREATE INDEX idx_projects_slug ON construction_projects (organization_id, slug);
CREATE INDEX idx_projects_completion_date ON construction_projects (organization_id, completion_date DESC);
```

### project_images

```sql
CREATE TABLE project_images (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id          UUID NOT NULL REFERENCES construction_projects(id) ON DELETE CASCADE,
    organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    asset_id            UUID REFERENCES media_assets(id),
    image_url           TEXT NOT NULL,
    thumbnail_url       TEXT,
    caption             VARCHAR(500),
    alt_text            VARCHAR(255),
    sort_order          INTEGER NOT NULL DEFAULT 0,
    is_cover_image      BOOLEAN NOT NULL DEFAULT false,
    width_px            INTEGER,
    height_px           INTEGER,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_project_images_project_id ON project_images (project_id);
CREATE INDEX idx_project_images_organization_id ON project_images (organization_id);
CREATE INDEX idx_project_images_sort_order ON project_images (project_id, sort_order);
```

### media_assets

```sql
CREATE TABLE media_assets (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    uploaded_by_id      UUID REFERENCES users(id),
    file_name           VARCHAR(255) NOT NULL,
    original_file_name  VARCHAR(255) NOT NULL,
    file_size_bytes     BIGINT NOT NULL,
    mime_type           VARCHAR(100) NOT NULL,
    s3_key              TEXT NOT NULL UNIQUE,
    s3_bucket           VARCHAR(255) NOT NULL,
    cdn_url             TEXT NOT NULL,
    thumbnail_url       TEXT,
    width_px            INTEGER,
    height_px           INTEGER,
    duration_seconds    INTEGER,
    alt_text            VARCHAR(255),
    tags                TEXT[] NOT NULL DEFAULT '{}',
    folder_path         VARCHAR(500) NOT NULL DEFAULT '/',
    metadata_json       JSONB NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_media_assets_organization_id ON media_assets (organization_id);
CREATE INDEX idx_media_assets_uploaded_by ON media_assets (uploaded_by_id);
CREATE INDEX idx_media_assets_mime_type ON media_assets (organization_id, mime_type);
CREATE INDEX idx_media_assets_folder ON media_assets (organization_id, folder_path);
```

### leads

```sql
CREATE TABLE leads (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    first_name          VARCHAR(100),
    last_name           VARCHAR(100),
    email               VARCHAR(255),
    phone               VARCHAR(50),
    company             VARCHAR(255),
    job_title           VARCHAR(100),
    website_url         VARCHAR(500),
    linkedin_url        VARCHAR(500),
    source              VARCHAR(50) NOT NULL DEFAULT 'manual'
                            CHECK (source IN ('form', 'manual', 'import', 'ai_discovery', 'referral', 'api')),
    status              VARCHAR(20) NOT NULL DEFAULT 'new'
                            CHECK (status IN ('new', 'contacted', 'qualified', 'proposal', 'won', 'lost', 'unqualified')),
    pipeline_stage      VARCHAR(50) NOT NULL DEFAULT 'inbox',
    assigned_to_id      UUID REFERENCES users(id),
    score               SMALLINT CHECK (score BETWEEN 0 AND 100),
    score_reason        TEXT,
    project_interest    VARCHAR(255),
    budget_estimate     VARCHAR(100),
    timeline            VARCHAR(100),
    service_type        VARCHAR(100),
    address_line1       VARCHAR(255),
    city                VARCHAR(100),
    state               VARCHAR(100),
    country             VARCHAR(2) DEFAULT 'US',
    tags                TEXT[] NOT NULL DEFAULT '{}',
    lost_reason         TEXT,
    won_value_cents     BIGINT,
    won_at              TIMESTAMPTZ,
    last_contacted_at   TIMESTAMPTZ,
    last_activity_at    TIMESTAMPTZ,
    do_not_contact      BOOLEAN NOT NULL DEFAULT false,
    gdpr_consent        BOOLEAN NOT NULL DEFAULT false,
    gdpr_consent_at     TIMESTAMPTZ,
    metadata_json       JSONB NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leads_organization_id ON leads (organization_id);
CREATE INDEX idx_leads_status ON leads (organization_id, status);
CREATE INDEX idx_leads_pipeline_stage ON leads (organization_id, pipeline_stage);
CREATE INDEX idx_leads_assigned_to ON leads (organization_id, assigned_to_id);
CREATE INDEX idx_leads_source ON leads (organization_id, source);
CREATE INDEX idx_leads_score ON leads (organization_id, score DESC);
CREATE INDEX idx_leads_created_at ON leads (organization_id, created_at DESC);
CREATE INDEX idx_leads_email ON leads (organization_id, email);
```

### lead_notes

```sql
CREATE TABLE lead_notes (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id             UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id             UUID NOT NULL REFERENCES users(id),
    note_type           VARCHAR(20) NOT NULL DEFAULT 'note'
                            CHECK (note_type IN ('note', 'call', 'email', 'meeting', 'system')),
    content             TEXT NOT NULL,
    is_pinned           BOOLEAN NOT NULL DEFAULT false,
    metadata_json       JSONB NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lead_notes_lead_id ON lead_notes (lead_id);
CREATE INDEX idx_lead_notes_organization_id ON lead_notes (organization_id);
CREATE INDEX idx_lead_notes_user_id ON lead_notes (user_id);
```

### form_submissions

```sql
CREATE TABLE form_submissions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    lead_id             UUID REFERENCES leads(id),
    form_type           VARCHAR(50) NOT NULL DEFAULT 'contact'
                            CHECK (form_type IN ('contact', 'quote', 'consultation', 'callback', 'newsletter', 'custom')),
    form_data_json      JSONB NOT NULL DEFAULT '{}',
    source_url          TEXT,
    page_title          VARCHAR(255),
    utm_source          VARCHAR(100),
    utm_medium          VARCHAR(100),
    utm_campaign        VARCHAR(100),
    utm_content         VARCHAR(100),
    utm_term            VARCHAR(100),
    ip_address          VARCHAR(45),
    user_agent          TEXT,
    processing_status   VARCHAR(20) NOT NULL DEFAULT 'pending'
                            CHECK (processing_status IN ('pending', 'processed', 'spam', 'failed')),
    spam_score          DECIMAL(4,2),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_form_submissions_organization_id ON form_submissions (organization_id);
CREATE INDEX idx_form_submissions_lead_id ON form_submissions (lead_id);
CREATE INDEX idx_form_submissions_form_type ON form_submissions (organization_id, form_type);
CREATE INDEX idx_form_submissions_created_at ON form_submissions (organization_id, created_at DESC);
```

### analytics_events (Partitioned)

```sql
CREATE TABLE analytics_events (
    id                  UUID NOT NULL DEFAULT gen_random_uuid(),
    organization_id     UUID NOT NULL REFERENCES organizations(id),
    session_id          UUID REFERENCES analytics_sessions(id),
    visitor_id          VARCHAR(64) NOT NULL,
    event_type          VARCHAR(50) NOT NULL,
    page_url            TEXT,
    page_title          VARCHAR(500),
    referrer_url        TEXT,
    utm_source          VARCHAR(100),
    utm_medium          VARCHAR(100),
    utm_campaign        VARCHAR(100),
    utm_content         VARCHAR(100),
    utm_term            VARCHAR(100),
    event_data_json     JSONB NOT NULL DEFAULT '{}',
    device_type         VARCHAR(20),
    browser             VARCHAR(50),
    os                  VARCHAR(50),
    country             VARCHAR(2),
    city                VARCHAR(100),
    ip_address_hash     VARCHAR(64),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, created_at)   -- include partition key in PK
) PARTITION BY RANGE (created_at);

-- Create monthly partitions (automated via Lambda scheduled function)
CREATE TABLE analytics_events_2025_01
    PARTITION OF analytics_events
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE analytics_events_2025_02
    PARTITION OF analytics_events
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
-- ... (continued monthly)

CREATE INDEX idx_analytics_events_org_id ON analytics_events (organization_id, created_at DESC);
CREATE INDEX idx_analytics_events_session_id ON analytics_events (session_id);
CREATE INDEX idx_analytics_events_visitor_id ON analytics_events (organization_id, visitor_id);
CREATE INDEX idx_analytics_events_event_type ON analytics_events (organization_id, event_type, created_at DESC);
```

### analytics_sessions

```sql
CREATE TABLE analytics_sessions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    visitor_id          VARCHAR(64) NOT NULL,
    started_at          TIMESTAMPTZ NOT NULL,
    ended_at            TIMESTAMPTZ,
    page_count          INTEGER NOT NULL DEFAULT 1,
    duration_seconds    INTEGER,
    entry_page          TEXT,
    exit_page           TEXT,
    utm_source          VARCHAR(100),
    utm_medium          VARCHAR(100),
    utm_campaign        VARCHAR(100),
    device_type         VARCHAR(20),
    browser             VARCHAR(50),
    os                  VARCHAR(50),
    country             VARCHAR(2),
    city                VARCHAR(100),
    is_bounce           BOOLEAN NOT NULL DEFAULT true,
    lead_id             UUID REFERENCES leads(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_analytics_sessions_organization_id ON analytics_sessions (organization_id, started_at DESC);
CREATE INDEX idx_analytics_sessions_visitor_id ON analytics_sessions (organization_id, visitor_id);
CREATE INDEX idx_analytics_sessions_lead_id ON analytics_sessions (lead_id);
```

### blog_categories

```sql
CREATE TABLE blog_categories (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name                VARCHAR(100) NOT NULL,
    slug                VARCHAR(100) NOT NULL,
    description         TEXT,
    meta_title          VARCHAR(60),
    meta_description    VARCHAR(160),
    sort_order          INTEGER NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, slug)
);

CREATE INDEX idx_blog_categories_organization_id ON blog_categories (organization_id);
```

### blog_posts

```sql
CREATE TABLE blog_posts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    author_id           UUID NOT NULL REFERENCES users(id),
    category_id         UUID REFERENCES blog_categories(id),
    title               VARCHAR(255) NOT NULL,
    slug                VARCHAR(255) NOT NULL,
    excerpt             VARCHAR(500),
    content_json        JSONB NOT NULL DEFAULT '{}',
    content_html        TEXT,
    cover_image_url     TEXT,
    cover_image_alt     VARCHAR(255),
    status              VARCHAR(20) NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft', 'published', 'archived', 'scheduled')),
    published_at        TIMESTAMPTZ,
    scheduled_at        TIMESTAMPTZ,
    meta_title          VARCHAR(60),
    meta_description    VARCHAR(160),
    og_image_url        TEXT,
    reading_time_min    SMALLINT,
    tags                TEXT[] NOT NULL DEFAULT '{}',
    schema_json         JSONB NOT NULL DEFAULT '{}',
    view_count          INTEGER NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, slug)
);

CREATE INDEX idx_blog_posts_organization_id ON blog_posts (organization_id);
CREATE INDEX idx_blog_posts_status ON blog_posts (organization_id, status);
CREATE INDEX idx_blog_posts_published_at ON blog_posts (organization_id, published_at DESC);
CREATE INDEX idx_blog_posts_category_id ON blog_posts (category_id);
CREATE INDEX idx_blog_posts_author_id ON blog_posts (author_id);
CREATE INDEX idx_blog_posts_slug ON blog_posts (organization_id, slug);
CREATE INDEX idx_blog_posts_tags ON blog_posts USING GIN (tags);
```

### api_keys

```sql
CREATE TABLE api_keys (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name                VARCHAR(100) NOT NULL,
    key_hash            VARCHAR(64) NOT NULL UNIQUE,
    key_prefix          VARCHAR(12) NOT NULL,
    scopes              TEXT[] NOT NULL DEFAULT '{}',
    environment         VARCHAR(10) NOT NULL DEFAULT 'live'
                            CHECK (environment IN ('live', 'test')),
    last_used_at        TIMESTAMPTZ,
    expires_at          TIMESTAMPTZ,
    created_by_id       UUID REFERENCES users(id),
    revoked_at          TIMESTAMPTZ,
    revoked_by_id       UUID REFERENCES users(id),
    request_count       BIGINT NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_api_keys_organization_id ON api_keys (organization_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys (key_hash);
CREATE INDEX idx_api_keys_key_prefix ON api_keys (key_prefix);
```

### notifications

```sql
CREATE TABLE notifications (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title               VARCHAR(255) NOT NULL,
    message             TEXT NOT NULL,
    notification_type   VARCHAR(50) NOT NULL DEFAULT 'info'
                            CHECK (notification_type IN ('info', 'success', 'warning', 'error', 'lead', 'system')),
    is_read             BOOLEAN NOT NULL DEFAULT false,
    read_at             TIMESTAMPTZ,
    action_url          TEXT,
    action_label        VARCHAR(100),
    metadata_json       JSONB NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_organization_id ON notifications (organization_id);
CREATE INDEX idx_notifications_user_id ON notifications (user_id, is_read, created_at DESC);
```

### audit_logs

```sql
CREATE TABLE audit_logs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID REFERENCES organizations(id),
    user_id             UUID REFERENCES users(id),
    actor_type          VARCHAR(20) NOT NULL DEFAULT 'user'
                            CHECK (actor_type IN ('user', 'system', 'api_key', 'webhook')),
    api_key_id          UUID REFERENCES api_keys(id),
    action              VARCHAR(100) NOT NULL,
    resource_type       VARCHAR(100) NOT NULL,
    resource_id         UUID,
    before_json         JSONB,
    after_json          JSONB,
    metadata_json       JSONB NOT NULL DEFAULT '{}',
    ip_address          VARCHAR(45),
    user_agent          TEXT,
    request_id          VARCHAR(100),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    -- NO updated_at: audit_logs are immutable (INSERT only)
);

CREATE INDEX idx_audit_logs_organization_id ON audit_logs (organization_id, created_at DESC);
CREATE INDEX idx_audit_logs_user_id ON audit_logs (user_id, created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs (resource_type, resource_id);
CREATE INDEX idx_audit_logs_action ON audit_logs (organization_id, action, created_at DESC);
```

### scraping_jobs

```sql
CREATE TABLE scraping_jobs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by_id       UUID REFERENCES users(id),
    job_type            VARCHAR(50) NOT NULL
                            CHECK (job_type IN ('lead_discovery', 'competitor_analysis', 'market_research', 'social_scan')),
    status              VARCHAR(20) NOT NULL DEFAULT 'queued'
                            CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
    target_url          TEXT,
    target_query        VARCHAR(500),
    parameters_json     JSONB NOT NULL DEFAULT '{}',
    result_count        INTEGER DEFAULT 0,
    error_message       TEXT,
    error_details_json  JSONB,
    started_at          TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    celery_task_id      VARCHAR(255) UNIQUE,
    sqs_message_id      VARCHAR(255),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_scraping_jobs_organization_id ON scraping_jobs (organization_id);
CREATE INDEX idx_scraping_jobs_status ON scraping_jobs (organization_id, status);
CREATE INDEX idx_scraping_jobs_celery_task_id ON scraping_jobs (celery_task_id);
```

### scraped_leads

```sql
CREATE TABLE scraped_leads (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    scraping_job_id     UUID NOT NULL REFERENCES scraping_jobs(id),
    first_name          VARCHAR(100),
    last_name           VARCHAR(100),
    email               VARCHAR(255),
    phone               VARCHAR(50),
    company             VARCHAR(255),
    job_title           VARCHAR(100),
    website_url         VARCHAR(500),
    linkedin_url        VARCHAR(500),
    source_url          TEXT NOT NULL,
    raw_data_json       JSONB NOT NULL DEFAULT '{}',
    normalized_data_json JSONB NOT NULL DEFAULT '{}',
    import_status       VARCHAR(20) NOT NULL DEFAULT 'pending'
                            CHECK (import_status IN ('pending', 'approved', 'rejected', 'imported', 'duplicate')),
    duplicate_lead_id   UUID REFERENCES leads(id),
    lead_id             UUID REFERENCES leads(id),
    reviewed_by_id      UUID REFERENCES users(id),
    reviewed_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_scraped_leads_organization_id ON scraped_leads (organization_id);
CREATE INDEX idx_scraped_leads_scraping_job_id ON scraped_leads (scraping_job_id);
CREATE INDEX idx_scraped_leads_import_status ON scraped_leads (organization_id, import_status);
CREATE INDEX idx_scraped_leads_lead_id ON scraped_leads (lead_id);
```

### ai_lead_scores

```sql
CREATE TABLE ai_lead_scores (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id             UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    score               SMALLINT NOT NULL CHECK (score BETWEEN 0 AND 100),
    score_version       VARCHAR(20) NOT NULL DEFAULT 'v1',
    confidence          DECIMAL(4,3) CHECK (confidence BETWEEN 0 AND 1),
    reasoning           TEXT,
    signals_json        JSONB NOT NULL DEFAULT '{}',
    model_used          VARCHAR(100) NOT NULL DEFAULT 'gpt-4o',
    prompt_tokens       INTEGER,
    completion_tokens   INTEGER,
    cost_usd_micros     INTEGER,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_lead_scores_lead_id ON ai_lead_scores (lead_id);
CREATE INDEX idx_ai_lead_scores_organization_id ON ai_lead_scores (organization_id, created_at DESC);
CREATE INDEX idx_ai_lead_scores_score ON ai_lead_scores (organization_id, score DESC);
```

---

## 3. Row-Level Security Policies

All tenant-scoped tables have RLS enabled. The application layer sets the session variable before executing any queries.

### Application Role Setup

```sql
-- Application role (used by Next.js and FastAPI services)
CREATE ROLE app_user LOGIN PASSWORD '...';

-- Superadmin role (used by admin dashboard only)
CREATE ROLE saas_admin LOGIN PASSWORD '...';
ALTER ROLE saas_admin BYPASSRLS;

-- Read-only role (used by analytics read replica connections)
CREATE ROLE app_readonly LOGIN PASSWORD '...';
```

### RLS Policy Template

Applied to each of these tables: `organization_members`, `websites`, `website_themes`, `website_pages`, `construction_projects`, `project_images`, `media_assets`, `leads`, `lead_notes`, `form_submissions`, `analytics_events`, `analytics_sessions`, `blog_posts`, `blog_categories`, `api_keys`, `notifications`, `scraping_jobs`, `scraped_leads`, `ai_lead_scores`

```sql
-- Enable RLS
ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;
ALTER TABLE {table_name} FORCE ROW LEVEL SECURITY;

-- Tenant isolation policy
CREATE POLICY tenant_isolation ON {table_name}
    AS PERMISSIVE
    FOR ALL
    TO app_user, app_readonly
    USING (
        organization_id = current_setting('app.current_org_id', true)::uuid
    )
    WITH CHECK (
        organization_id = current_setting('app.current_org_id', true)::uuid
    );
```

### Setting Tenant Context per Transaction

```sql
-- Set at the start of every application transaction
BEGIN;
SET LOCAL app.current_org_id = '550e8400-e29b-41d4-a716-446655440000';
-- All queries within this transaction are now tenant-scoped
SELECT * FROM leads; -- automatically filtered to current org
COMMIT;
```

### Audit Log Policy (INSERT-only for app_user)

```sql
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_insert_only ON audit_logs
    AS PERMISSIVE FOR INSERT TO app_user
    WITH CHECK (true);

CREATE POLICY audit_read_own ON audit_logs
    AS PERMISSIVE FOR SELECT TO app_user
    USING (organization_id = current_setting('app.current_org_id', true)::uuid);

-- No UPDATE or DELETE policies for app_user (immutable audit log)
```

---

## 4. Index Strategy

### Index Types by Use Case

| Index Type    | Tables                           | Purpose                                        |
|---------------|----------------------------------|------------------------------------------------|
| B-tree        | All FK columns, status, slug     | Exact match and range queries                  |
| B-tree DESC   | created_at, published_at, score  | Latest-first ordering (common in dashboards)   |
| GIN           | blog_posts.tags, leads.tags      | Array containment queries (`@>`, `&&`)         |
| GIN           | JSONB columns (analytics)        | JSON path queries                              |
| Partial       | leads WHERE status = 'new'       | Optimize hot paths (new lead alerts)           |

### Composite Index Strategy

All tenant-scoped queries always include `organization_id` as the leftmost column of composite indexes:

```sql
-- Pattern: (organization_id, lookup_column) for tenant-scoped lookups
CREATE INDEX idx_leads_email ON leads (organization_id, email);

-- Pattern: (organization_id, filter_column, sort_column) for paginated lists
CREATE INDEX idx_blog_posts_published ON blog_posts (organization_id, status, published_at DESC);
```

### Covering Indexes for Common Dashboard Queries

```sql
-- Dashboard lead summary: avoid heap access for count queries
CREATE INDEX idx_leads_status_summary ON leads (organization_id, status)
    INCLUDE (created_at, score, assigned_to_id);

-- Analytics event count by type (dashboard metric cards)
CREATE INDEX idx_analytics_event_type_daily ON analytics_events (organization_id, event_type, created_at)
    WHERE created_at > NOW() - INTERVAL '30 days';  -- partial index for hot data
```

---

## 5. Partitioning Plan

### analytics_events — Range Partitioning by Month

```sql
-- Parent table (partitioned)
CREATE TABLE analytics_events (
    ...
    created_at TIMESTAMPTZ NOT NULL
) PARTITION BY RANGE (created_at);

-- Partition maintenance Lambda (runs on 1st of each month):
CREATE TABLE analytics_events_{YYYY}_{MM}
    PARTITION OF analytics_events
    FOR VALUES FROM ('{YYYY}-{MM}-01') TO ('{YYYY}-{MM+1}-01');

-- Old partition archival (after 13 months):
-- 1. pg_dump partition to S3 Parquet (for historical analytics)
-- 2. DROP TABLE analytics_events_{YYYY}_{MM} (frees storage)
```

### Partition Benefits

- **Query performance**: Dashboard queries with `WHERE created_at BETWEEN ...` prune all irrelevant partitions
- **Maintenance**: Monthly partition DROP is instant (no DELETE overhead, no VACUUM needed)
- **Archival**: Individual month partitions can be detached and archived to S3 without full table scan
- **Bulk load**: Kinesis Lambda loads only into current month's partition

### Future Partitioning Candidates (Scale Tier)

- `audit_logs`: Partition by `created_at` (yearly) for 7-year retention
- `form_submissions`: Partition by `created_at` (quarterly) at high volume
- `analytics_sessions`: Partition by `created_at` (quarterly)

---

## 6. Database Roles

```sql
-- Connection limits per role
ALTER ROLE app_user CONNECTION LIMIT 150;
ALTER ROLE app_readonly CONNECTION LIMIT 50;
ALTER ROLE saas_admin CONNECTION LIMIT 5;

-- Grant schema access
GRANT USAGE ON SCHEMA public TO app_user, app_readonly, saas_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_readonly;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO saas_admin;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- Revoke dangerous permissions from app_user
REVOKE DELETE ON audit_logs FROM app_user;
REVOKE UPDATE ON audit_logs FROM app_user;
REVOKE DROP ON ALL TABLES IN SCHEMA public FROM app_user;
```
