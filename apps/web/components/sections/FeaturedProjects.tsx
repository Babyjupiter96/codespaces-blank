"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowRight, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Project {
  name: string;
  type: string;
  year: string;
  value: string;
  sqft: string;
  timeline: string;
  gradient: string;
  featured?: boolean;
  tall?: boolean;
}

const featuredProject: Project = {
  name: "Phoenix Commerce Center",
  type: "Commercial",
  year: "2024",
  value: "$4.2M",
  sqft: "48,000",
  timeline: "14 months",
  gradient: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
  featured: true,
};

const gridProjects: Project[] = [
  {
    name: "Scottsdale Luxury Residence",
    type: "Residential",
    year: "2024",
    value: "$1.8M",
    sqft: "6,400",
    timeline: "18 months",
    gradient: "linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 50%, #242424 100%)",
    tall: true,
  },
  {
    name: "Mesa Industrial Complex",
    type: "Commercial",
    year: "2023",
    value: "$7.1M",
    sqft: "85,000",
    timeline: "22 months",
    gradient: "linear-gradient(135deg, #0a0a14 0%, #141428 50%, #1e1e3c 100%)",
    tall: false,
  },
  {
    name: "Tempe Restaurant Buildout",
    type: "Tenant Improvement",
    year: "2024",
    value: "$380K",
    sqft: "3,200",
    timeline: "4 months",
    gradient: "linear-gradient(135deg, #0d1117 0%, #161b22 50%, #1c2333 100%)",
    tall: false,
  },
  {
    name: "Gilbert Medical Office",
    type: "Commercial",
    year: "2023",
    value: "$2.4M",
    sqft: "12,000",
    timeline: "10 months",
    gradient: "linear-gradient(135deg, #111111 0%, #1c1c1c 50%, #252525 100%)",
    tall: true,
  },
];

export default function FeaturedProjects() {
  return (
    <section
      id="projects"
      className="section-padding bg-[#0A0A0A]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-10 md:mb-12"
        >
          <div>
            <span className="text-[11px] tracking-[0.3em] text-[#C6A15B] uppercase font-semibold">
              Our Portfolio
            </span>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-700 text-[#F9FAFB] mt-3">
              Landmark Projects
              <br />
              <span className="text-gradient-gold">Across Arizona</span>
            </h2>
          </div>
          <a
            href="#contact"
            onClick={(e) => {
              e.preventDefault();
              document.querySelector("#contact")?.scrollIntoView({ behavior: "smooth" });
            }}
            className="inline-flex items-center gap-2 text-[#C6A15B] text-sm font-medium hover:gap-3 transition-all duration-200 flex-shrink-0"
          >
            View All Projects
            <ArrowRight size={14} />
          </a>
        </motion.div>

        {/* Featured project */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative rounded-sm overflow-hidden mb-5 group cursor-pointer"
          style={{ height: "400px" }}
        >
          {/* Background */}
          <div
            className="absolute inset-0 transition-transform duration-700 group-hover:scale-105"
            style={{ background: featuredProject.gradient }}
          />

          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A]/90 via-[#0A0A0A]/20 to-transparent" />

          {/* Decorative lines */}
          <div className="absolute inset-0 architectural-grid opacity-20" />

          {/* Content overlay */}
          <div className="absolute bottom-0 left-0 p-8 z-10">
            <Badge variant="gold" className="mb-3 text-[10px] tracking-wider">
              FEATURED PROJECT
            </Badge>
            <h3 className="font-display text-2xl sm:text-3xl font-700 text-[#F9FAFB] mb-2">
              {featuredProject.name}
            </h3>
            <p className="text-[#9CA3AF] text-sm mb-4">
              {featuredProject.type} &bull; {featuredProject.year} &bull; {featuredProject.value}
            </p>
            <div className="flex items-center gap-2 text-[#C6A15B] text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <span>View Project</span>
              <ExternalLink size={14} />
            </div>
          </div>

          {/* Stats on hover */}
          <div className="absolute top-6 right-6 flex gap-4 opacity-0 group-hover:opacity-100 transition-all duration-300">
            <div className="glass rounded-sm px-4 py-3 text-center">
              <div className="text-[#C6A15B] font-semibold text-lg">{featuredProject.sqft}</div>
              <div className="text-[#6B7280] text-xs mt-0.5">Sq Ft</div>
            </div>
            <div className="glass rounded-sm px-4 py-3 text-center">
              <div className="text-[#C6A15B] font-semibold text-lg">{featuredProject.timeline}</div>
              <div className="text-[#6B7280] text-xs mt-0.5">Timeline</div>
            </div>
          </div>
        </motion.div>

        {/* Grid projects */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {gridProjects.map((project, i) => (
            <motion.div
              key={project.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group relative rounded-sm overflow-hidden cursor-pointer"
              style={{ height: project.tall ? "320px" : "250px" }}
            >
              {/* Background */}
              <div
                className="absolute inset-0 transition-transform duration-700 group-hover:scale-105"
                style={{ background: project.gradient }}
              />

              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A]/95 via-[#0A0A0A]/30 to-transparent" />

              {/* Architectural grid */}
              <div className="absolute inset-0 architectural-grid opacity-15" />

              {/* Content */}
              <div className="absolute bottom-0 left-0 p-5 z-10 w-full">
                <p className="text-[#C6A15B] text-[10px] tracking-wider uppercase font-medium mb-1">
                  {project.type}
                </p>
                <h4 className="font-display text-base font-600 text-[#F9FAFB] mb-1">
                  {project.name}
                </h4>
                <p className="text-[#6B7280] text-xs">{project.year} &bull; {project.value}</p>

                {/* Hover stats */}
                <div className="mt-3 grid grid-cols-2 gap-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                  <div className="glass-dark rounded-sm p-2 text-center">
                    <div className="text-[#C6A15B] text-sm font-semibold">{project.sqft}</div>
                    <div className="text-[#6B7280] text-[10px]">Sq Ft</div>
                  </div>
                  <div className="glass-dark rounded-sm p-2 text-center">
                    <div className="text-[#C6A15B] text-sm font-semibold">{project.timeline}</div>
                    <div className="text-[#6B7280] text-[10px]">Timeline</div>
                  </div>
                </div>
              </div>

              {/* Border on hover */}
              <div className="absolute inset-0 border border-transparent group-hover:border-[#C6A15B]/30 rounded-sm transition-all duration-300" />
            </motion.div>
          ))}
        </div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-10 border border-[#2A2A2A] rounded-sm bg-[#141414] px-6 py-5"
        >
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-center">
            <div className="text-sm text-[#9CA3AF]">
              <span className="text-[#C6A15B] font-semibold">500+ Projects</span> Completed
            </div>
            <div className="hidden sm:block w-[1px] h-4 bg-[#2A2A2A]" />
            <div className="text-sm text-[#9CA3AF]">
              <span className="text-[#C6A15B] font-semibold">Arizona</span> & Surrounding States
            </div>
            <div className="hidden sm:block w-[1px] h-4 bg-[#2A2A2A]" />
            <div className="text-sm text-[#9CA3AF]">
              <span className="text-[#C6A15B] font-semibold">Commercial</span> to Residential
            </div>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center mt-8"
        >
          <button
            onClick={() => document.querySelector("#contact")?.scrollIntoView({ behavior: "smooth" })}
            className="inline-flex items-center gap-2 text-[#C6A15B] border border-[#C6A15B]/30 px-8 py-3 rounded-sm text-sm font-medium hover:bg-[#C6A15B]/10 hover:border-[#C6A15B] transition-all duration-300"
          >
            Start Your Project
            <ArrowRight size={14} />
          </button>
        </motion.div>
      </div>
    </section>
  );
}
