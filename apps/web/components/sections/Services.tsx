"use client";

import React from "react";
import { motion, useInView, type Variants } from "framer-motion";
import {
  Building2,
  Home,
  Hammer,
  Layers,
  Triangle,
  MapPin,
  LayoutGrid,
  Wrench,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

interface Service {
  icon: LucideIcon;
  name: string;
  description: string;
}

const services: Service[] = [
  {
    icon: Building2,
    name: "Commercial Construction",
    description:
      "Full-scope commercial builds from office complexes to retail centers, delivered with precision and built to code.",
  },
  {
    icon: Home,
    name: "Residential Construction",
    description:
      "Custom luxury homes and production builds that combine architectural vision with exceptional craftsmanship.",
  },
  {
    icon: Hammer,
    name: "Remodeling & Renovation",
    description:
      "Transformative interior and exterior remodels that breathe new life into existing spaces.",
  },
  {
    icon: Layers,
    name: "Concrete & Foundations",
    description:
      "Expert concrete work including foundations, flatwork, retaining walls, and structural elements.",
  },
  {
    icon: Triangle,
    name: "Roofing Systems",
    description:
      "Complete roofing solutions for commercial and residential properties — installation, repair, and replacement.",
  },
  {
    icon: MapPin,
    name: "Site Development",
    description:
      "Comprehensive site preparation including grading, drainage, utilities, and pre-construction groundwork.",
  },
  {
    icon: LayoutGrid,
    name: "Tenant Improvements",
    description:
      "Custom build-outs for retail, office, and hospitality spaces that meet your brand standards and code requirements.",
  },
  {
    icon: Wrench,
    name: "Demolition",
    description:
      "Safe, efficient demolition services for structures of all types with proper disposal and site preparation.",
  },
];

export default function Services() {
  const ref = React.useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.07,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" },
    },
  };

  return (
    <section id="services" className="section-padding bg-[#111111]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14 md:mb-16"
        >
          <span className="text-[11px] tracking-[0.3em] text-[#C6A15B] uppercase font-semibold">
            What We Build
          </span>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-700 text-[#F9FAFB] mt-3 mb-4">
            Comprehensive Construction Services
          </h2>
          <p className="text-[#6B7280] max-w-2xl mx-auto text-base sm:text-lg">
            From ground-breaking to ribbon-cutting, we handle every phase of construction with the expertise and dedication your project deserves.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <div className="h-[1px] w-12 bg-[#C6A15B]" />
            <div className="w-1.5 h-1.5 rounded-full bg-[#C6A15B]" />
            <div className="h-[1px] w-12 bg-[#C6A15B]" />
          </div>
        </motion.div>

        {/* Services grid */}
        <motion.div
          ref={ref}
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5"
        >
          {services.map((service) => (
            <ServiceCard
              key={service.name}
              service={service}
              variants={cardVariants}
            />
          ))}
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center mt-12"
        >
          <p className="text-[#6B7280] text-sm mb-4">
            Not sure which service fits your project?
          </p>
          <a
            href="#contact"
            onClick={(e) => {
              e.preventDefault();
              document.querySelector("#contact")?.scrollIntoView({ behavior: "smooth" });
            }}
            className="inline-flex items-center gap-2 text-[#C6A15B] text-sm font-medium hover:gap-3 transition-all duration-200"
          >
            Talk to our team
            <ArrowRight size={14} />
          </a>
        </motion.div>
      </div>
    </section>
  );
}

function ServiceCard({
  service,
  variants,
}: {
  service: Service;
  variants: Variants;
}) {
  const Icon = service.icon;

  return (
    <motion.div
      variants={variants}
      className="group relative bg-[#1A1A1A] border border-[#2A2A2A] rounded-sm p-6 cursor-pointer hover:-translate-y-1 hover:border-[#C6A15B] hover:shadow-[0_8px_32px_rgba(198,161,91,0.12)] transition-all duration-300 overflow-hidden"
    >
      {/* Hover gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#C6A15B]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="relative z-10">
        {/* Icon */}
        <div className="mb-5">
          <div className="w-10 h-10 rounded-sm bg-[#C6A15B]/10 flex items-center justify-center group-hover:bg-[#C6A15B]/20 transition-colors duration-300">
            <Icon
              size={20}
              className="text-[#C6A15B]"
              strokeWidth={1.5}
            />
          </div>
        </div>

        {/* Content */}
        <h3 className="text-[#F9FAFB] font-semibold text-base mb-2.5 group-hover:text-[#C6A15B] transition-colors duration-300">
          {service.name}
        </h3>
        <p className="text-[#6B7280] text-sm leading-relaxed">{service.description}</p>

        {/* Arrow */}
        <div className="flex items-center gap-1.5 mt-4 text-[#C6A15B] text-xs font-medium opacity-0 group-hover:opacity-100 translate-x-[-8px] group-hover:translate-x-0 transition-all duration-300">
          <span>Learn more</span>
          <ArrowRight size={12} />
        </div>
      </div>

      {/* Corner accent */}
      <div className="absolute bottom-0 right-0 w-12 h-12 border-b border-r border-[#C6A15B]/0 group-hover:border-[#C6A15B]/30 transition-all duration-300 rounded-sm" />
    </motion.div>
  );
}
