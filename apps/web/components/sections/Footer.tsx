"use client";

import React from "react";
import { motion } from "framer-motion";
import { Instagram, Facebook, Linkedin, Youtube, ArrowRight } from "lucide-react";

const serviceLinks = [
  "Commercial Construction",
  "Residential Construction",
  "Remodeling & Renovation",
  "Concrete & Foundations",
  "Roofing Systems",
  "Site Development",
  "Tenant Improvements",
  "Demolition",
];

const companyLinks = [
  { label: "About Us", href: "#why-graystone" },
  { label: "Projects", href: "#projects" },
  { label: "Our Process", href: "#process" },
  { label: "Careers", href: "#" },
  { label: "Contact", href: "#contact" },
];

const serviceAreas = [
  "Phoenix",
  "Scottsdale",
  "Tempe",
  "Mesa",
  "Gilbert",
  "Chandler",
  "Glendale",
  "Peoria",
];

const socialLinks = [
  { icon: Instagram, href: "#", label: "Instagram" },
  { icon: Facebook, href: "#", label: "Facebook" },
  { icon: Linkedin, href: "#", label: "LinkedIn" },
  { icon: Youtube, href: "#", label: "YouTube" },
];

export default function Footer() {
  const handleNavClick = (href: string) => {
    if (href === "#") return;
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <footer className="bg-[#0A0A0A] relative">
      {/* Gold top border */}
      <div className="h-[1px] bg-gradient-to-r from-transparent via-[#C6A15B] to-transparent" />

      {/* Top CTA band */}
      <div className="relative bg-[#111111] border-b border-[#1A1A1A] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#C6A15B]/5 via-transparent to-[#C6A15B]/5 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
            <div>
              <h3 className="font-display text-2xl sm:text-3xl md:text-4xl font-700 text-[#F9FAFB] mb-2">
                Ready to Build Something{" "}
                <span className="text-gradient-gold">Exceptional?</span>
              </h3>
              <p className="text-[#6B7280] text-sm md:text-base">
                Join 500+ Arizona projects built with precision and integrity.
              </p>
            </div>
            <motion.button
              onClick={() => handleNavClick("#contact")}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="flex-shrink-0 flex items-center gap-2 bg-[#C6A15B] text-[#111111] px-8 py-4 rounded-sm text-sm font-semibold tracking-wider uppercase hover:bg-[#D4B483] shadow-[0_0_30px_rgba(198,161,91,0.3)] hover:shadow-[0_0_50px_rgba(198,161,91,0.5)] transition-all duration-300"
            >
              Request Estimate
              <ArrowRight size={16} />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">
          {/* Column 1: Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="mb-5">
              <div className="font-display text-xl font-700 text-[#F9FAFB] tracking-[0.12em] leading-none">
                GRAYSTONE
              </div>
              <div className="h-[1px] w-full bg-gradient-to-r from-[#C6A15B] to-transparent mt-1 mb-1" />
              <div className="text-[10px] tracking-[0.25em] text-[#C6A15B] font-medium uppercase">
                Contracting LLC
              </div>
            </div>
            <p className="text-[#6B7280] text-sm leading-relaxed mb-6">
              Building Arizona with precision and integrity since 2009. Licensed, bonded, and fully insured for commercial and residential projects.
            </p>

            {/* Social links */}
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    aria-label={social.label}
                    className="w-9 h-9 rounded-sm bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center text-[#6B7280] hover:text-[#C6A15B] hover:border-[#C6A15B]/40 transition-all duration-200"
                  >
                    <Icon size={15} />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Column 2: Services */}
          <div>
            <h4 className="text-[10px] tracking-[0.3em] text-[#C6A15B] uppercase font-semibold mb-5">
              Services
            </h4>
            <ul className="space-y-2.5">
              {serviceLinks.map((service) => (
                <li key={service}>
                  <a
                    href="#services"
                    onClick={(e) => {
                      e.preventDefault();
                      handleNavClick("#services");
                    }}
                    className="text-sm text-[#6B7280] hover:text-[#C6A15B] transition-colors duration-200 flex items-center gap-1.5 group"
                  >
                    <span className="w-1 h-1 rounded-full bg-[#2A2A2A] group-hover:bg-[#C6A15B] transition-colors duration-200 flex-shrink-0" />
                    {service}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Company */}
          <div>
            <h4 className="text-[10px] tracking-[0.3em] text-[#C6A15B] uppercase font-semibold mb-5">
              Company
            </h4>
            <ul className="space-y-2.5">
              {companyLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    onClick={(e) => {
                      e.preventDefault();
                      handleNavClick(link.href);
                    }}
                    className="text-sm text-[#6B7280] hover:text-[#C6A15B] transition-colors duration-200 flex items-center gap-1.5 group"
                  >
                    <span className="w-1 h-1 rounded-full bg-[#2A2A2A] group-hover:bg-[#C6A15B] transition-colors duration-200 flex-shrink-0" />
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Service Areas */}
          <div>
            <h4 className="text-[10px] tracking-[0.3em] text-[#C6A15B] uppercase font-semibold mb-5">
              Service Areas
            </h4>
            <ul className="space-y-2.5">
              {serviceAreas.map((area) => (
                <li key={area}>
                  <span className="text-sm text-[#6B7280] flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-[#2A2A2A] flex-shrink-0" />
                    {area}, AZ
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-[#1A1A1A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <p className="text-[#4B5563] text-xs">
              &copy; {new Date().getFullYear()} Graystone Contracting LLC. All rights reserved. | ROC# [Placeholder]
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-[#4B5563] text-xs hover:text-[#C6A15B] transition-colors duration-200">
                Privacy Policy
              </a>
              <span className="text-[#2A2A2A]">|</span>
              <a href="#" className="text-[#4B5563] text-xs hover:text-[#C6A15B] transition-colors duration-200">
                Terms of Service
              </a>
              <span className="text-[#2A2A2A]">|</span>
              <a href="#" className="text-[#4B5563] text-xs hover:text-[#C6A15B] transition-colors duration-200">
                Sitemap
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
