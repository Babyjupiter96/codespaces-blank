"use client";

import dynamic from "next/dynamic";

const Navbar = dynamic(() => import("@/components/sections/Navbar"), { ssr: false });
const Hero = dynamic(() => import("@/components/sections/Hero"), { ssr: false });
const TrustBar = dynamic(() => import("@/components/sections/TrustBar"), { ssr: false });
const Services = dynamic(() => import("@/components/sections/Services"), { ssr: false });
const FeaturedProjects = dynamic(() => import("@/components/sections/FeaturedProjects"), { ssr: false });
const WhyGraystone = dynamic(() => import("@/components/sections/WhyGraystone"), { ssr: false });
const Testimonials = dynamic(() => import("@/components/sections/Testimonials"), { ssr: false });
const Process = dynamic(() => import("@/components/sections/Process"), { ssr: false });
const QuoteForm = dynamic(() => import("@/components/sections/QuoteForm"), { ssr: false });
const Footer = dynamic(() => import("@/components/sections/Footer"), { ssr: false });

export default function HomeClient() {
  return (
    <main className="min-h-screen bg-[#111111]">
      <Navbar />
      <Hero />
      <TrustBar />
      <Services />
      <FeaturedProjects />
      <WhyGraystone />
      <Testimonials />
      <Process />
      <QuoteForm />
      <Footer />
    </main>
  );
}
