"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Phone, Mail, MapPin, Clock, ShieldCheck, CheckCircle, type LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FormData {
  fullName: string;
  email: string;
  phone: string;
  projectType: string;
  budget: string;
  timeline: string;
  description: string;
}

export default function QuoteForm() {
  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    email: "",
    phone: "",
    projectType: "",
    budget: "",
    timeline: "",
    description: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSelectChange = (name: keyof FormData) => (value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate network request
    await new Promise((resolve) => setTimeout(resolve, 1500));
    console.log("Quote request submitted:", formData);
    setLoading(false);
    setSubmitted(true);
  };

  return (
    <section
      id="contact"
      className="relative section-padding bg-[#0D0D0D] overflow-hidden"
    >
      {/* Background accent */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#C6A15B]/40 to-transparent" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-radial from-[#C6A15B]/6 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-gradient-radial from-[#C6A15B]/4 to-transparent blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 md:mb-14"
        >
          <span className="text-[11px] tracking-[0.3em] text-[#C6A15B] uppercase font-semibold">
            Get Started
          </span>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-700 text-[#F9FAFB] mt-3 mb-4">
            Start Your Project
          </h2>
          <p className="text-[#6B7280] max-w-xl mx-auto text-base">
            Get a free, no-obligation estimate from Arizona&apos;s premier construction team. We respond within 24 hours.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-12">
          {/* Form */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="lg:col-span-3"
          >
            {submitted ? (
              <div className="flex flex-col items-center justify-center text-center py-20 border border-[#C6A15B]/30 bg-[#141414] rounded-sm">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", duration: 0.6 }}
                  className="w-16 h-16 rounded-full bg-[#C6A15B]/15 flex items-center justify-center mb-6"
                >
                  <CheckCircle size={32} className="text-[#C6A15B]" />
                </motion.div>
                <h3 className="font-display text-2xl font-700 text-[#F9FAFB] mb-3">
                  Request Received
                </h3>
                <p className="text-[#6B7280] max-w-sm text-sm leading-relaxed">
                  Thank you for reaching out. A member of our team will contact you within one business day to discuss your project.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="mt-8 text-[#C6A15B] text-sm underline underline-offset-4 hover:text-[#D4B483] transition-colors"
                >
                  Submit another request
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="border border-[#2A2A2A] bg-[#141414] rounded-sm p-6 md:p-8 space-y-5"
              >
                {/* Row 1: Name + Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-[#9CA3AF] font-medium tracking-wider uppercase">
                      Full Name *
                    </label>
                    <Input
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      placeholder="John Smith"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-[#9CA3AF] font-medium tracking-wider uppercase">
                      Email Address *
                    </label>
                    <Input
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="john@company.com"
                      required
                    />
                  </div>
                </div>

                {/* Row 2: Phone + Project Type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-[#9CA3AF] font-medium tracking-wider uppercase">
                      Phone Number
                    </label>
                    <Input
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="(602) 555-0000"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-[#9CA3AF] font-medium tracking-wider uppercase">
                      Project Type *
                    </label>
                    <Select
                      value={formData.projectType}
                      onValueChange={handleSelectChange("projectType")}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="commercial">Commercial Construction</SelectItem>
                        <SelectItem value="residential">Residential Construction</SelectItem>
                        <SelectItem value="remodeling">Remodeling & Renovation</SelectItem>
                        <SelectItem value="concrete">Concrete & Foundation</SelectItem>
                        <SelectItem value="roofing">Roofing Systems</SelectItem>
                        <SelectItem value="site">Site Development</SelectItem>
                        <SelectItem value="tenant">Tenant Improvement</SelectItem>
                        <SelectItem value="demolition">Demolition</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Row 3: Budget + Timeline */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-[#9CA3AF] font-medium tracking-wider uppercase">
                      Estimated Budget
                    </label>
                    <Select
                      value={formData.budget}
                      onValueChange={handleSelectChange("budget")}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select range..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="under-50k">Under $50K</SelectItem>
                        <SelectItem value="50k-150k">$50K – $150K</SelectItem>
                        <SelectItem value="150k-500k">$150K – $500K</SelectItem>
                        <SelectItem value="500k-1m">$500K – $1M</SelectItem>
                        <SelectItem value="over-1m">Over $1M</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-[#9CA3AF] font-medium tracking-wider uppercase">
                      Project Timeline
                    </label>
                    <Select
                      value={formData.timeline}
                      onValueChange={handleSelectChange("timeline")}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="When to start?" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asap">ASAP</SelectItem>
                        <SelectItem value="1-3m">1 – 3 Months</SelectItem>
                        <SelectItem value="3-6m">3 – 6 Months</SelectItem>
                        <SelectItem value="6-12m">6 – 12 Months</SelectItem>
                        <SelectItem value="planning">Planning Phase</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-xs text-[#9CA3AF] font-medium tracking-wider uppercase">
                    Project Description
                  </label>
                  <Textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Tell us about your project — scope, goals, key requirements, and anything else we should know..."
                    rows={4}
                    className="min-h-[110px]"
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#C6A15B] text-[#111111] py-4 rounded-sm text-sm font-semibold tracking-widest uppercase hover:bg-[#D4B483] disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-300 shadow-[0_0_30px_rgba(198,161,91,0.3)] hover:shadow-[0_0_50px_rgba(198,161,91,0.5)]"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-[#111111]/30 border-t-[#111111] rounded-full animate-spin" />
                      Sending...
                    </span>
                  ) : (
                    "Request Your Free Estimate"
                  )}
                </button>

                <p className="text-[#4B5563] text-xs text-center">
                  No spam. No obligation. We respond within 24 business hours.
                </p>
              </form>
            )}
          </motion.div>

          {/* Contact info */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="lg:col-span-2 flex flex-col gap-6"
          >
            {/* Contact details */}
            <div className="border border-[#2A2A2A] bg-[#141414] rounded-sm p-6 space-y-5">
              <h3 className="font-display text-xl font-600 text-[#F9FAFB]">
                Contact Graystone
              </h3>

              <div className="space-y-4">
                <ContactItem
                  icon={Phone}
                  label="Phone"
                  value="(602) 555-0100"
                  href="tel:+16025550100"
                />
                <ContactItem
                  icon={Mail}
                  label="Email"
                  value="info@graystonecontracting.com"
                  href="mailto:info@graystonecontracting.com"
                />
                <ContactItem
                  icon={MapPin}
                  label="Location"
                  value="Phoenix, AZ 85001"
                  href="https://maps.google.com"
                />
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-sm bg-[#C6A15B]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Clock size={14} className="text-[#C6A15B]" />
                  </div>
                  <div>
                    <p className="text-[#6B7280] text-xs uppercase tracking-wider mb-1">Hours</p>
                    <p className="text-[#F9FAFB] text-sm">Mon–Fri: 7:00 AM – 6:00 PM</p>
                    <p className="text-[#9CA3AF] text-sm">Saturday: 8:00 AM – 2:00 PM</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Trust badges */}
            <div className="border border-[#2A2A2A] bg-[#141414] rounded-sm p-6">
              <h4 className="text-xs tracking-[0.2em] text-[#6B7280] uppercase font-medium mb-4">
                Licensed & Verified
              </h4>
              <div className="space-y-3">
                {[
                  "ROC License #[Placeholder]",
                  "A+ Better Business Bureau Rating",
                  "15+ Years in Business",
                  "Full Liability & Workers' Comp Coverage",
                  "Arizona Licensed General Contractor",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <ShieldCheck size={14} className="text-[#C6A15B] flex-shrink-0" />
                    <span className="text-sm text-[#9CA3AF]">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Emergency contact */}
            <div className="border border-[#C6A15B]/20 bg-[#C6A15B]/5 rounded-sm p-5">
              <p className="text-[#C6A15B] text-xs font-semibold uppercase tracking-wider mb-1">
                Need an immediate response?
              </p>
              <p className="text-[#F9FAFB] text-sm">
                Call us directly at{" "}
                <a
                  href="tel:+16025550100"
                  className="text-[#C6A15B] font-semibold hover:underline"
                >
                  (602) 555-0100
                </a>
                . We answer during business hours.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function ContactItem({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  href: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-sm bg-[#C6A15B]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={14} className="text-[#C6A15B]" />
      </div>
      <div>
        <p className="text-[#6B7280] text-xs uppercase tracking-wider mb-0.5">{label}</p>
        <a
          href={href}
          className="text-[#F9FAFB] text-sm hover:text-[#C6A15B] transition-colors duration-200"
          target={href.startsWith("http") ? "_blank" : undefined}
          rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
        >
          {value}
        </a>
      </div>
    </div>
  );
}
