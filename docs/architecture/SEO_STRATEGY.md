# SEO Strategy — Multi-Tenant Construction SaaS

## Table of Contents
1. [Next.js App Router Metadata API](#1-nextjs-app-router-metadata-api)
2. [Per-Tenant Dynamic Sitemap Generation](#2-per-tenant-dynamic-sitemap-generation)
3. [robots.txt Per Tenant](#3-robotstxt-per-tenant)
4. [Structured Data (JSON-LD)](#4-structured-data-json-ld)
5. [OpenGraph and Twitter Card Metadata](#5-opengraph-and-twitter-card-metadata)
6. [Core Web Vitals Optimization](#6-core-web-vitals-optimization)
7. [Canonical URL Strategy](#7-canonical-url-strategy)
8. [Blog SEO](#8-blog-seo)
9. [Local SEO for Construction](#9-local-seo-for-construction)
10. [Page Speed Targets and Checklist](#10-page-speed-targets-and-checklist)

---

## 1. Next.js App Router Metadata API

### Dynamic Metadata Generation

Each tenant microsite generates metadata dynamically based on the tenant's configuration and the current page content. We use Next.js 14's `generateMetadata` function (Server Component, runs at request time for ISR).

### Root Tenant Layout Metadata

```typescript
// apps/web/app/(tenant)/layout.tsx

import { type Metadata } from 'next';
import { headers } from 'next/headers';
import { getTenantClient } from '@construction-saas/db';

export async function generateMetadata(): Promise<Metadata> {
  const tenantId = headers().get('x-tenant-id')!;
  const tenantSlug = headers().get('x-tenant-slug')!;
  const db = getTenantClient(tenantId);

  const website = await db.website.findUnique({
    where: { organizationId: tenantId },
    select: {
      title: true,
      tagline: true,
      description: true,
      ogImageUrl: true,
      faviconUrl: true,
      customDomain: true,
      domainVerified: true,
      seoConfigJson: true,
      contactInfoJson: true,
    },
  });

  const seoConfig = website?.seoConfigJson as Record<string, string> ?? {};
  const baseUrl = website?.domainVerified && website?.customDomain
    ? `https://${website.customDomain}`
    : `https://${tenantSlug}.buildpro.com`;

  return {
    metadataBase: new URL(baseUrl),
    title: {
      default: website?.title ?? 'Construction Services',
      template: seoConfig.titleTemplate ?? `%s | ${website?.title ?? 'Construction'}`,
    },
    description: website?.description ?? website?.tagline,
    keywords: seoConfig.keywords?.split(',').map((k: string) => k.trim()),
    authors: [{ name: website?.title }],
    creator: website?.title,
    publisher: website?.title,
    category: 'Construction Services',
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    icons: {
      icon: website?.faviconUrl ?? '/favicon.ico',
      apple: website?.faviconUrl,
    },
    alternates: {
      canonical: baseUrl,
    },
  };
}
```

### Page-Level Metadata Override

```typescript
// apps/web/app/(tenant)/projects/[slug]/page.tsx

import { type Metadata } from 'next';
import { headers } from 'next/headers';
import { getTenantClient } from '@construction-saas/db';
import { notFound } from 'next/navigation';

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tenantId = headers().get('x-tenant-id')!;
  const db = getTenantClient(tenantId);

  const project = await db.constructionProject.findFirst({
    where: { slug: params.slug, status: 'published' },
    select: {
      title: true,
      shortDescription: true,
      metaTitle: true,
      metaDescription: true,
      ogImageUrl: true,
      coverImageUrl: true,
      city: true,
      state: true,
      projectType: true,
      completionDate: true,
    },
  });

  if (!project) return {};

  const ogImage = project.ogImageUrl ?? project.coverImageUrl;

  return {
    title: project.metaTitle ?? project.title,
    description: project.metaDescription ?? project.shortDescription,
    openGraph: {
      title: project.metaTitle ?? project.title,
      description: project.metaDescription ?? project.shortDescription,
      images: ogImage ? [{ url: ogImage, width: 1200, height: 630, alt: project.title }] : [],
      type: 'article',
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: project.metaTitle ?? project.title,
      description: project.metaDescription ?? project.shortDescription,
      images: ogImage ? [ogImage] : [],
    },
  };
}

export async function generateStaticParams() {
  // Pre-generate slugs for ISR — Next.js will generate and cache these pages
  const tenantId = headers().get('x-tenant-id')!; // Available in generateStaticParams for ISR
  const db = getTenantClient(tenantId);
  const projects = await db.constructionProject.findMany({
    where: { status: 'published' },
    select: { slug: true },
  });
  return projects.map((p) => ({ slug: p.slug }));
}
```

---

## 2. Per-Tenant Dynamic Sitemap Generation

### Sitemap Route Handler

Each tenant gets a dedicated `/sitemap.xml` route that generates a sitemap scoped to their content. The sitemap URL resolves to the correct tenant based on the request hostname.

```typescript
// apps/web/app/(tenant)/sitemap.xml/route.ts

import { NextRequest } from 'next/server';
import { headers } from 'next/headers';
import { getTenantClient } from '@construction-saas/db';

export const revalidate = 3600; // Regenerate sitemap every 1 hour

export async function GET(req: NextRequest) {
  const tenantId = headers().get('x-tenant-id')!;
  const tenantSlug = headers().get('x-tenant-slug')!;
  const db = getTenantClient(tenantId);

  // Get base URL for this tenant
  const website = await db.website.findUnique({
    where: { organizationId: tenantId },
    select: { customDomain: true, domainVerified: true },
  });

  const baseUrl = website?.domainVerified && website?.customDomain
    ? `https://${website.customDomain}`
    : `https://${tenantSlug}.buildpro.com`;

  // Fetch all public content
  const [pages, projects, blogPosts, blogCategories] = await Promise.all([
    db.websitePage.findMany({
      where: { status: 'published', showInNav: true },
      select: { slug: true, updatedAt: true, pageType: true },
    }),
    db.constructionProject.findMany({
      where: { status: 'published' },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    }),
    db.blogPost.findMany({
      where: { status: 'published' },
      select: { slug: true, publishedAt: true, updatedAt: true },
      orderBy: { publishedAt: 'desc' },
    }),
    db.blogCategory.findMany({
      select: { slug: true, updatedAt: true },
    }),
  ]);

  const urls: SitemapEntry[] = [
    // Homepage
    { loc: baseUrl, lastmod: new Date().toISOString(), changefreq: 'weekly', priority: 1.0 },
    
    // Static pages
    ...pages.map((page) => ({
      loc: `${baseUrl}/${page.slug === 'home' ? '' : page.slug}`,
      lastmod: page.updatedAt.toISOString(),
      changefreq: 'monthly' as const,
      priority: page.pageType === 'contact' ? 0.8 : 0.7,
    })),
    
    // Projects
    { loc: `${baseUrl}/projects`, lastmod: new Date().toISOString(), changefreq: 'weekly', priority: 0.9 },
    ...projects.map((project) => ({
      loc: `${baseUrl}/projects/${project.slug}`,
      lastmod: project.updatedAt.toISOString(),
      changefreq: 'monthly' as const,
      priority: 0.8,
    })),
    
    // Blog
    { loc: `${baseUrl}/blog`, lastmod: new Date().toISOString(), changefreq: 'weekly', priority: 0.8 },
    ...blogPosts.map((post) => ({
      loc: `${baseUrl}/blog/${post.slug}`,
      lastmod: (post.updatedAt ?? post.publishedAt ?? new Date()).toISOString(),
      changefreq: 'yearly' as const,
      priority: 0.6,
    })),
    ...blogCategories.map((cat) => ({
      loc: `${baseUrl}/blog/category/${cat.slug}`,
      lastmod: cat.updatedAt.toISOString(),
      changefreq: 'weekly' as const,
      priority: 0.5,
    })),
  ];

  const xml = buildSitemapXml(urls);

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}

function buildSitemapXml(urls: SitemapEntry[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.map((url) => `  <url>
    <loc>${escapeXml(url.loc)}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority.toFixed(1)}</priority>
  </url>`).join('\n')}
</urlset>`;
}
```

### Sitemap Index (For Large Tenants)

When a tenant has 500+ projects or blog posts, split into sitemap index:

```
/sitemap-index.xml        → lists all sub-sitemaps
/sitemap-pages.xml        → static pages
/sitemap-projects-1.xml   → projects (batch 1: 500 items)
/sitemap-projects-2.xml   → projects (batch 2: next 500)
/sitemap-blog.xml         → blog posts
```

---

## 3. robots.txt Per Tenant

```typescript
// apps/web/app/(tenant)/robots.txt/route.ts

import { headers } from 'next/headers';
import { getTenantClient } from '@construction-saas/db';

export const revalidate = 3600;

export async function GET() {
  const tenantId = headers().get('x-tenant-id')!;
  const tenantSlug = headers().get('x-tenant-slug')!;
  const db = getTenantClient(tenantId);

  const website = await db.website.findUnique({
    where: { organizationId: tenantId },
    select: { customDomain: true, domainVerified: true, status: true, seoConfigJson: true },
  });

  const seoConfig = website?.seoConfigJson as Record<string, unknown> ?? {};
  const baseUrl = website?.domainVerified && website?.customDomain
    ? `https://${website.customDomain}`
    : `https://${tenantSlug}.buildpro.com`;

  // If website is not published, block all crawlers
  const isPublished = website?.status === 'published';
  
  const robotsTxt = isPublished
    ? `User-agent: *
Allow: /
Disallow: /api/
Disallow: /dashboard/
Disallow: /_next/

# Block AI training crawlers (optional, configurable per tenant)
User-agent: GPTBot
${(seoConfig.blockAiCrawlers as boolean) ? 'Disallow: /' : 'Allow: /'}

User-agent: Google-Extended
${(seoConfig.blockAiCrawlers as boolean) ? 'Disallow: /' : 'Allow: /'}

Sitemap: ${baseUrl}/sitemap.xml`
    : `User-agent: *
Disallow: /`;

  return new Response(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
```

---

## 4. Structured Data (JSON-LD)

### LocalBusiness Schema (Homepage)

```typescript
// lib/seo.ts — JSON-LD schema builders

interface ContactInfo {
  phone?: string;
  email?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

export function buildLocalBusinessSchema(
  org: { name: string; logoUrl?: string | null },
  website: { title: string; description?: string | null; seoConfigJson: unknown },
  contact: ContactInfo,
  baseUrl: string
) {
  const seo = website.seoConfigJson as Record<string, unknown>;
  
  return {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'GeneralContractor'],
    '@id': `${baseUrl}/#organization`,
    name: org.name,
    description: website.description,
    url: baseUrl,
    logo: {
      '@type': 'ImageObject',
      url: org.logoUrl,
    },
    image: `${baseUrl}/og-image.jpg`,
    telephone: contact.phone,
    email: contact.email,
    address: contact.addressLine1 ? {
      '@type': 'PostalAddress',
      streetAddress: contact.addressLine1,
      addressLocality: contact.city,
      addressRegion: contact.state,
      postalCode: contact.postalCode,
      addressCountry: contact.country ?? 'US',
    } : undefined,
    geo: (seo.latitude && seo.longitude) ? {
      '@type': 'GeoCoordinates',
      latitude: seo.latitude,
      longitude: seo.longitude,
    } : undefined,
    areaServed: (seo.areaServed as string[]) ?? [],
    serviceArea: {
      '@type': 'GeoCircle',
      geoMidpoint: { '@type': 'GeoCoordinates', latitude: seo.latitude, longitude: seo.longitude },
      geoRadius: seo.serviceRadiusMiles ?? 50,
    },
    priceRange: seo.priceRange ?? '$$',
    openingHoursSpecification: (seo.openingHours as unknown[]) ?? [],
    sameAs: [
      seo.facebookUrl,
      seo.instagramUrl,
      seo.linkedinUrl,
      seo.googleBusinessUrl,
    ].filter(Boolean),
  };
}
```

### Service Schema (Services Page)

```typescript
export function buildServiceSchema(
  serviceName: string,
  description: string,
  providerName: string,
  baseUrl: string,
  imageUrl?: string
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: serviceName,
    description: description,
    provider: {
      '@type': 'LocalBusiness',
      name: providerName,
      url: baseUrl,
    },
    serviceType: serviceName,
    areaServed: {
      '@type': 'Country',
      name: 'United States',
    },
    image: imageUrl,
    url: baseUrl,
  };
}
```

### Project (CreativeWork) Schema

```typescript
export function buildProjectSchema(
  project: {
    title: string;
    description?: string | null;
    completionDate?: Date | null;
    city?: string | null;
    state?: string | null;
    coverImageUrl?: string | null;
    clientTestimonial?: string | null;
    clientRating?: number | null;
    clientName?: string | null;
    budgetCents?: bigint | null;
  },
  providerName: string,
  projectUrl: string
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HomeAndConstructionBusiness',
    name: project.title,
    description: project.description,
    url: projectUrl,
    image: project.coverImageUrl,
    dateCompleted: project.completionDate?.toISOString().split('T')[0],
    locationCreated: project.city && project.state
      ? {
          '@type': 'Place',
          address: {
            '@type': 'PostalAddress',
            addressLocality: project.city,
            addressRegion: project.state,
          },
        }
      : undefined,
    creator: {
      '@type': 'Organization',
      name: providerName,
    },
    ...(project.clientTestimonial && {
      review: {
        '@type': 'Review',
        reviewBody: project.clientTestimonial,
        reviewRating: {
          '@type': 'Rating',
          ratingValue: project.clientRating ?? 5,
          bestRating: 5,
          worstRating: 1,
        },
        author: {
          '@type': 'Person',
          name: project.clientName ?? 'Client',
        },
      },
    }),
  };
}
```

### Blog Post (Article) Schema

```typescript
export function buildArticleSchema(
  post: {
    title: string;
    excerpt?: string | null;
    publishedAt?: Date | null;
    updatedAt: Date;
    coverImageUrl?: string | null;
    readingTimeMin?: number | null;
  },
  authorName: string,
  publisherName: string,
  publisherLogoUrl: string,
  articleUrl: string
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': articleUrl,
    headline: post.title,
    description: post.excerpt,
    image: post.coverImageUrl
      ? { '@type': 'ImageObject', url: post.coverImageUrl, width: 1200, height: 630 }
      : undefined,
    url: articleUrl,
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: {
      '@type': 'Person',
      name: authorName,
    },
    publisher: {
      '@type': 'Organization',
      name: publisherName,
      logo: {
        '@type': 'ImageObject',
        url: publisherLogoUrl,
      },
    },
    timeRequired: post.readingTimeMin ? `PT${post.readingTimeMin}M` : undefined,
    inLanguage: 'en-US',
  };
}
```

### FAQ Schema (for FAQ sections on service pages)

```typescript
export function buildFAQSchema(faqs: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}
```

### BreadcrumbList Schema

```typescript
export function buildBreadcrumbSchema(
  crumbs: Array<{ name: string; url: string }>
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: crumb.url,
    })),
  };
}
```

### JSON-LD Injection Component

```typescript
// components/tenant/JsonLd.tsx
export function JsonLd({ schema }: { schema: Record<string, unknown> | Record<string, unknown>[] }) {
  const schemas = Array.isArray(schema) ? schema : [schema];
  return (
    <>
      {schemas.map((s, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(s, null, 0) }}
        />
      ))}
    </>
  );
}
```

---

## 5. OpenGraph and Twitter Card Metadata

### Default OG Config (via generateMetadata)

```typescript
// Default OG image dimensions: 1200x630px
// Stored in S3, served via CloudFront CDN

openGraph: {
  title: 'Best Construction Company in Chicago | Riverdale Contracting',
  description: 'Expert residential and commercial construction in the greater Chicago area.',
  url: 'https://www.riverdalecontracting.com',
  siteName: 'Riverdale Contracting',
  images: [
    {
      url: 'https://cdn.buildpro.com/tenants/org-uuid/theme/og-image.jpg',
      width: 1200,
      height: 630,
      alt: 'Riverdale Contracting — Construction Excellence',
      type: 'image/jpeg',
    },
  ],
  locale: 'en_US',
  type: 'website',
},
twitter: {
  card: 'summary_large_image',
  site: '@buildpro',
  creator: '@riverdalecontracting',
  title: 'Best Construction Company in Chicago | Riverdale Contracting',
  description: 'Expert residential and commercial construction services.',
  images: ['https://cdn.buildpro.com/tenants/org-uuid/theme/og-image.jpg'],
},
```

### Dynamic OG Image Generation (Optional Advanced Feature)

Use `@vercel/og` or custom Canvas to generate dynamic OG images for blog posts and projects:

```typescript
// app/(tenant)/api/og/route.tsx

import { ImageResponse } from 'next/og';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get('title') ?? 'Construction Project';
  const subtitle = searchParams.get('subtitle');
  const logoUrl = searchParams.get('logo');
  const bgColor = searchParams.get('bg') ?? '#1a56db';

  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        background: `linear-gradient(135deg, ${bgColor}, ${bgColor}cc)`,
        padding: '60px',
        fontFamily: 'Inter, sans-serif',
      }}>
        {logoUrl && <img src={logoUrl} width={200} height={60} style={{ objectFit: 'contain', marginBottom: 32 }} />}
        <h1 style={{ fontSize: 56, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{title}</h1>
        {subtitle && <p style={{ fontSize: 28, color: 'rgba(255,255,255,0.8)', marginTop: 16 }}>{subtitle}</p>}
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
```

---

## 6. Core Web Vitals Optimization

### Target Scores

| Metric                     | Target (Good) | Current Target  |
|----------------------------|---------------|-----------------|
| LCP (Largest Contentful Paint) | < 2.5s    | < 1.8s (ISR pages) |
| INP (Interaction to Next Paint) | < 200ms  | < 150ms         |
| CLS (Cumulative Layout Shift)   | < 0.1    | < 0.05          |
| TTFB (Time to First Byte)       | < 800ms  | < 200ms (CDN-cached) |
| FCP (First Contentful Paint)    | < 1.8s   | < 1.2s          |

### ISR (Incremental Static Regeneration) Strategy

```typescript
// Different revalidation periods by content type
export const revalidate = 60;   // Project gallery — 60-second ISR
export const revalidate = 300;  // Blog posts — 5-minute ISR
export const revalidate = 3600; // About/Services pages — 1-hour ISR
export const revalidate = false; // Homepage — manual revalidation only (on content change)

// On-demand revalidation (called from admin mutations)
import { revalidatePath, revalidateTag } from 'next/cache';

// After project update:
revalidateTag(`tenant-${orgId}-projects`); // Invalidates all pages tagged with this
revalidatePath(`/${tenantSlug}/projects`);
revalidatePath(`/${tenantSlug}/projects/${project.slug}`);
```

### Image Optimization

```typescript
// Use next/image for all project and blog images
import Image from 'next/image';

export function ProjectCard({ project }: { project: ConstructionProject }) {
  return (
    <div className="relative aspect-video">
      <Image
        src={project.coverImageUrl}
        alt={project.title}
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        priority={project.isFeatured} // LCP image: priority load
        className="object-cover"
        // Next.js automatically: WebP conversion, resize, lazy loading
      />
    </div>
  );
}
```

```typescript
// next.config.ts
const config = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.buildpro.com',
        pathname: '/tenants/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 86400, // 24 hours
  },
};
```

### Font Strategy (Zero Layout Shift)

```typescript
// apps/web/app/(tenant)/layout.tsx

import { Inter, Playfair_Display, Montserrat } from 'next/font/google';

// Pre-load all supported tenant fonts with display=swap
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  variable: '--font-inter',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  display: 'swap',
  preload: false, // Only preload the tenant's selected font
  variable: '--font-playfair',
});

// Dynamic font loading based on tenant config
// The CSS variable is set in layout, components use var(--font-heading)
```

### JavaScript Bundle Optimization

```typescript
// Dynamic imports for heavy dashboard components
const LeadKanban = dynamic(() => import('@/components/dashboard/LeadKanban'), {
  loading: () => <KanbanSkeleton />,
  ssr: false, // Client-only component (drag-and-drop)
});

const BlockEditor = dynamic(() => import('@/components/dashboard/BlockEditor'), {
  loading: () => <EditorSkeleton />,
  ssr: false, // Rich text editor (Tiptap/ProseMirror)
});
```

### Preloading Critical Resources

```typescript
// In tenant layout head:
<link rel="preconnect" href="https://cdn.buildpro.com" crossOrigin="" />
<link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="" />
<link rel="dns-prefetch" href="https://api.buildpro.com" />

// Hero image preloading (for LCP improvement)
{heroImageUrl && (
  <link
    rel="preload"
    as="image"
    href={heroImageUrl}
    imageSrcSet="..."
  />
)}
```

---

## 7. Canonical URL Strategy

### Problem: Multi-Domain Content Duplication

Tenant content may be accessible from multiple URLs:
- `acme.buildpro.com/projects/riverside-office` (subdomain)
- `www.acmecontracting.com/projects/riverside-office` (custom domain)

Without canonical tags, search engines may split ranking signals between URLs.

### Solution: Custom Domain Takes Canonical Priority

```typescript
// lib/utils/seo.ts

export function getCanonicalBaseUrl(
  tenantSlug: string,
  customDomain?: string | null,
  domainVerified = false
): string {
  if (domainVerified && customDomain) {
    return `https://${customDomain}`;
  }
  return `https://${tenantSlug}.buildpro.com`;
}

// In generateMetadata:
const canonicalBase = getCanonicalBaseUrl(
  tenantSlug,
  website?.customDomain,
  website?.domainVerified
);

return {
  alternates: {
    canonical: `${canonicalBase}${pagePath}`,
  },
};
```

### During Custom Domain Migration

When a tenant switches from subdomain to custom domain:

1. Set canonical to new custom domain immediately upon verification
2. Add 301 redirect from `tenant.buildpro.com/*` → `custom-domain.com/*`
3. CloudFront function at edge handles the redirect (zero latency)
4. Submit new sitemap to Google Search Console with custom domain URL
5. Google will update index within 2-4 weeks

```typescript
// CloudFront Function for 301 redirect (JavaScript runtime)
function handler(event) {
  var request = event.request;
  var host = request.headers.host.value;
  
  // If request is to subdomain but tenant has custom domain verified
  if (host.endsWith('.buildpro.com') && tenantHasCustomDomain(host)) {
    var customDomain = getCustomDomain(host);
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: {
        location: { value: 'https://' + customDomain + request.uri },
        'cache-control': { value: 'max-age=86400' },
      },
    };
  }
  return request;
}
```

---

## 8. Blog SEO

### Slug Strategy

- Slugs generated from title: `5 signs you need a roof replacement` → `5-signs-you-need-a-roof-replacement`
- Maximum 70 characters
- Lowercase, hyphens only (no underscores, no special characters)
- Slugs are immutable once set (changing breaks backlinks)
- Old slug redirects: 301 redirect table in `website_pages` for moved content

```typescript
// lib/utils/slugify.ts
export function slugify(text: string, maxLength = 70): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')       // Remove non-word chars
    .replace(/[\s_-]+/g, '-')       // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, '')        // Trim leading/trailing hyphens
    .slice(0, maxLength)
    .replace(/-+$/, '');            // Remove trailing hyphen after slice
}
```

### Category-Based Internal Linking

```typescript
// In blog post page: render "Related Posts" section
const relatedPosts = await db.blogPost.findMany({
  where: {
    categoryId: post.categoryId,
    id: { not: post.id },
    status: 'published',
  },
  take: 3,
  orderBy: { viewCount: 'desc' },
  select: { title: true, slug: true, excerpt: true, coverImageUrl: true },
});
```

### Blog Post SEO Checklist (Enforced in Editor UI)

```typescript
interface BlogPostSEOValidation {
  titleLength: { min: 30; max: 60; current: number; };     // Red if outside range
  descriptionLength: { min: 120; max: 160; current: number; };
  hasH1: boolean;           // Title serves as H1 — must not have another H1
  hasH2s: boolean;          // At least 2 H2 subheadings for structure
  wordCount: { min: 600; current: number; };               // Minimum content length
  hasImages: boolean;       // At least one image with alt text
  allImagesHaveAlt: boolean; // Every image has descriptive alt text
  hasInternalLinks: boolean; // At least one link to another page on the site
  readingTime: number;       // Calculated from word count (200 words/minute)
  slugOptimized: boolean;    // Slug contains primary keyword
}
```

---

## 9. Local SEO for Construction

### NAP Consistency (Name, Address, Phone)

NAP data is stored in `organizations` and `websites.contactInfoJson`. It is rendered consistently across:

1. Header/footer contact information
2. Contact page
3. JSON-LD `LocalBusiness` schema
4. Google Business Profile (linked via URL in JSON-LD `sameAs`)
5. Footer copyright and contact details

The NAP display component pulls from a single source of truth:

```typescript
// contactInfoJson stored in websites table
interface ContactInfo {
  phone: string;          // "+13125551234" (E.164 format)
  phoneDisplay: string;   // "(312) 555-1234" (formatted for display)
  email: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  googleMapsUrl: string;  // Direct Google Maps link
  googleBusinessId: string; // For review links
}
```

### City-Based Location Pages (Scale Strategy)

For tenants operating in multiple cities, auto-generate location-specific landing pages:

```
/services/kitchen-remodeling-chicago-il
/services/bathroom-renovation-evanston-il
/services/commercial-construction-naperville-il
```

Each location page has:
- Unique meta title: `Kitchen Remodeling in Chicago, IL | Riverdale Contracting`
- City-specific content paragraphs
- Local JSON-LD with city-specific address
- Embedded Google Map of service area
- Local reviews and projects from that city

```typescript
// Generation strategy:
// - Service types × cities = location pages
// - Pages generated from database (no manual page creation required)
// - ISR with 1-hour revalidation
// - Sitemap auto-includes all generated location pages
```

### Google Business Profile Schema Integration

```typescript
export function buildGoogleBusinessProfileSchema(org: Organization, website: Website) {
  const contact = website.contactInfoJson as ContactInfo;
  
  return {
    '@context': 'https://schema.org',
    '@type': 'HomeAndConstructionBusiness',
    name: org.name,
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',   // Pulled from Google Places API or manual entry
      reviewCount: '47',
      bestRating: '5',
      worstRating: '1',
    },
    review: [
      // Top 3 reviews embedded from Google Business or manual entry
    ],
    hasMap: contact.googleMapsUrl,
    sameAs: [
      `https://www.google.com/maps/place/?q=place_id:${contact.googleBusinessId}`,
    ],
  };
}
```

---

## 10. Page Speed Targets and Optimization Checklist

### Performance Budget

| Metric                     | Target Score | Alert Threshold |
|----------------------------|:------------:|:---------------:|
| Google PageSpeed (Mobile)  | > 85         | < 75            |
| Google PageSpeed (Desktop) | > 95         | < 85            |
| LCP                        | < 2.5s       | > 3.0s          |
| INP                        | < 200ms      | > 500ms         |
| CLS                        | < 0.1        | > 0.25          |
| Total Page Size            | < 1.5 MB     | > 3 MB          |
| Total JS                   | < 250 KB     | > 500 KB        |
| Time to Interactive (TTI)  | < 3.5s       | > 5s            |

### Optimization Checklist

#### Images
- [x] All images served via CloudFront CDN (global edge)
- [x] next/image used for all `<img>` tags (auto WebP/AVIF + lazy loading)
- [x] LCP image uses `priority={true}` prop (preloaded)
- [x] `sizes` attribute set correctly for responsive images
- [x] Image dimensions specified (prevents CLS)
- [x] Thumbnails generated at upload time (Lambda resize) — no full-size images for thumbnails

#### Fonts
- [x] Google Fonts loaded via `next/font/google` (self-hosted, zero FOUT)
- [x] `font-display: swap` applied
- [x] Only one or two font families loaded per tenant
- [x] Font weights limited to those actually used (e.g., 400, 600, 700 only)

#### JavaScript
- [x] Heavy components lazy-loaded with `next/dynamic`
- [x] Unused code tree-shaken by Next.js bundler
- [x] Third-party scripts (analytics, chatbot) loaded with `next/script` strategy="lazyOnload"
- [x] No render-blocking scripts in `<head>`
- [x] React Server Components used for data-fetching (zero client JS for data)

#### CSS
- [x] Tailwind CSS with PurgeCSS (only used classes in bundle)
- [x] Critical CSS inlined (Next.js handles automatically)
- [x] No unused CSS frameworks

#### Caching
- [x] Static assets: `Cache-Control: max-age=31536000, immutable`
- [x] ISR pages: `s-maxage=60, stale-while-revalidate=3600`
- [x] API responses: `Cache-Control: no-store`
- [x] CloudFront Origin Shield enabled (reduces TTFB by ~60ms)

#### Server-Side
- [x] ISR used for all public pages (no SSR on every request)
- [x] Database queries optimized: only select needed columns
- [x] N+1 queries eliminated: use Prisma `include` for related data
- [x] Redis cache for tenant config (eliminates DB query for every page load)
- [x] Read replica used for public page queries (offloads primary DB)

#### Monitoring
- [x] Core Web Vitals tracked via PostHog (web vitals plugin)
- [x] Real User Monitoring (RUM) data in PostHog dashboard
- [x] Weekly automated Lighthouse CI runs in GitHub Actions
- [x] CloudWatch alarm when p95 latency exceeds 3000ms

### Lighthouse CI Configuration

```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI
on:
  schedule:
    - cron: '0 6 * * 1' # Every Monday at 6am UTC
  workflow_dispatch:

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Lighthouse
        uses: treosh/lighthouse-ci-action@v11
        with:
          urls: |
            https://demo.buildpro.com
            https://demo.buildpro.com/projects
            https://demo.buildpro.com/blog
          budgetPath: .lighthouserc.json
          uploadArtifacts: true
          temporaryPublicStorage: true
```

```json
// .lighthouserc.json
{
  "ci": {
    "assert": {
      "assertions": {
        "categories:performance": ["warn", { "minScore": 0.85 }],
        "categories:seo": ["error", { "minScore": 0.95 }],
        "categories:accessibility": ["warn", { "minScore": 0.90 }],
        "categories:best-practices": ["warn", { "minScore": 0.90 }],
        "first-contentful-paint": ["warn", { "maxNumericValue": 1800 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }]
      }
    }
  }
}
```
