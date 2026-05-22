import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Graystone Contracting LLC | Premium Construction Arizona",
  description:
    "Graystone Contracting LLC delivers premium commercial and residential construction across Arizona. Licensed, bonded & insured. 15+ years of excellence, 500+ projects completed.",
  keywords: [
    "construction company Arizona",
    "commercial construction Phoenix",
    "residential contractor Scottsdale",
    "general contractor Arizona",
    "building contractor Phoenix",
    "Graystone Contracting",
    "luxury construction Arizona",
    "commercial builder Phoenix",
    "remodeling contractor Arizona",
    "tenant improvement Phoenix",
  ],
  authors: [{ name: "Graystone Contracting LLC" }],
  creator: "Graystone Contracting LLC",
  publisher: "Graystone Contracting LLC",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://graystonecontracting.com",
    siteName: "Graystone Contracting LLC",
    title: "Graystone Contracting LLC | Premium Construction Arizona",
    description:
      "Building Arizona with precision and integrity. Commercial & residential construction, remodeling, and development. 15+ years, 500+ projects.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Graystone Contracting LLC — Premium Construction Arizona",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Graystone Contracting LLC | Premium Construction Arizona",
    description:
      "Building Arizona with precision and integrity. 15+ years, 500+ projects completed.",
    images: ["/og-image.jpg"],
  },
  alternates: {
    canonical: "https://graystonecontracting.com",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": "https://graystonecontracting.com",
  name: "Graystone Contracting LLC",
  description:
    "Premium commercial and residential construction company serving Arizona. Licensed, bonded, and insured.",
  url: "https://graystonecontracting.com",
  telephone: "+1-602-555-0100",
  email: "info@graystonecontracting.com",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Phoenix",
    addressLocality: "Phoenix",
    addressRegion: "AZ",
    postalCode: "85001",
    addressCountry: "US",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: "33.4484",
    longitude: "-112.0740",
  },
  areaServed: [
    "Phoenix, AZ",
    "Scottsdale, AZ",
    "Tempe, AZ",
    "Mesa, AZ",
    "Gilbert, AZ",
    "Chandler, AZ",
    "Glendale, AZ",
    "Peoria, AZ",
  ],
  priceRange: "$$$$",
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "07:00",
      closes: "18:00",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: "Saturday",
      opens: "08:00",
      closes: "14:00",
    },
  ],
  sameAs: [
    "https://www.instagram.com/graystonecontracting",
    "https://www.facebook.com/graystonecontracting",
    "https://www.linkedin.com/company/graystone-contracting",
  ],
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "5.0",
    reviewCount: "127",
    bestRating: "5",
    worstRating: "1",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${playfairDisplay.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <meta name="theme-color" content="#111111" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      </head>
      <body className="bg-[#111111] text-[#F9FAFB] antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
