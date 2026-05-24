"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

const stats = [
  { value: "15+", label: "Years Experience" },
  { value: "500+", label: "Projects Completed" },
  { value: "$50M+", label: "Value Delivered" },
  { value: "100%", label: "Licensed & Bonded" },
];

interface FloatingDot {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
}

const floatingDots: FloatingDot[] = [
  { id: 1, x: 12, y: 25, size: 3, duration: 7, delay: 0 },
  { id: 2, x: 85, y: 15, size: 2, duration: 9, delay: 1.5 },
  { id: 3, x: 68, y: 72, size: 4, duration: 6, delay: 0.8 },
  { id: 4, x: 30, y: 85, size: 2, duration: 8, delay: 2.2 },
  { id: 5, x: 92, y: 55, size: 3, duration: 7.5, delay: 1.1 },
  { id: 6, x: 50, y: 40, size: 2, duration: 10, delay: 0.5 },
  { id: 7, x: 18, y: 60, size: 2, duration: 8.5, delay: 3 },
];

export default function Hero() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleScrollTo = (href: string) => {
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] },
    },
  };

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#0A0A0A]">
      {/* Architectural grid */}
      <div className="absolute inset-0 architectural-grid opacity-40" />

      {/* Radial gradient overlay */}
      <div className="absolute inset-0 bg-gradient-radial from-[#111111]/0 via-[#0A0A0A]/60 to-[#0A0A0A] pointer-events-none" />

      {/* Gold accent gradient */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-radial from-[#C6A15B]/8 to-transparent pointer-events-none blur-3xl" />

      {/* Floating dots */}
      {mounted &&
        floatingDots.map((dot) => (
          <motion.div
            key={dot.id}
            className="absolute rounded-full bg-[#C6A15B] pointer-events-none"
            style={{
              left: `${dot.x}%`,
              top: `${dot.y}%`,
              width: dot.size,
              height: dot.size,
              opacity: 0.2,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.15, 0.35, 0.15],
            }}
            transition={{
              duration: dot.duration,
              delay: dot.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}

      {/* Main content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 flex flex-col items-center text-center">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center gap-6"
        >
          {/* Eyebrow */}
          <motion.div variants={itemVariants}>
            <div className="inline-flex items-center gap-3 px-4 py-2 border border-[#C6A15B]/30 bg-[#C6A15B]/5 rounded-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C6A15B] animate-pulse" />
              <span className="text-[11px] font-semibold tracking-[0.3em] text-[#C6A15B] uppercase">
                Licensed
              </span>
              <span className="w-1 h-1 rounded-full bg-[#C6A15B]/40" />
              <span className="text-[11px] font-semibold tracking-[0.3em] text-[#C6A15B] uppercase">
                Bonded
              </span>
              <span className="w-1 h-1 rounded-full bg-[#C6A15B]/40" />
              <span className="text-[11px] font-semibold tracking-[0.3em] text-[#C6A15B] uppercase">
                Insured
              </span>
            </div>
          </motion.div>

          {/* H1 */}
          <motion.div variants={itemVariants} className="space-y-2">
            <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-800 leading-[0.95] tracking-tight text-[#F9FAFB]">
              Building Arizona
            </h1>
            <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-800 leading-[0.95] tracking-tight">
              <span className="text-[#F9FAFB]">With </span>
              <span className="text-gradient-gold">Precision</span>
            </h1>
            <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-800 leading-[0.95] tracking-tight text-[#F9FAFB]">
              & Integrity
            </h1>
          </motion.div>

          {/* Subheadline */}
          <motion.p
            variants={itemVariants}
            className="max-w-2xl text-base sm:text-lg text-[#9CA3AF] leading-relaxed font-light"
          >
            From commercial landmarks to custom residences, Graystone Contracting delivers uncompromising quality on every project — on time, on budget, and built to last generations.
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row gap-4 mt-2"
          >
            <Button
              variant="default"
              size="xl"
              onClick={() => handleScrollTo("#contact")}
              className="group text-sm font-semibold tracking-wider uppercase bg-[#C6A15B] text-[#0A0A0A] hover:bg-[#D4B483] shadow-[0_0_40px_rgba(198,161,91,0.4)] hover:shadow-[0_0_60px_rgba(198,161,91,0.6)] transition-all duration-300"
            >
              Request a Free Estimate
            </Button>
            <Button
              variant="ghost"
              size="xl"
              onClick={() => handleScrollTo("#projects")}
              className="group border border-[#3A3A3A] text-[#F9FAFB] hover:border-[#C6A15B]/50 hover:text-[#C6A15B] text-sm font-semibold tracking-wider uppercase"
            >
              View Our Work
              <ArrowRight
                size={16}
                className="ml-1 group-hover:translate-x-1 transition-transform duration-200"
              />
            </Button>
          </motion.div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1, ease: "easeOut" }}
          className="w-full max-w-3xl mt-16 md:mt-20"
        >
          <div className="flex flex-wrap justify-center">
            {stats.map((stat, i) => (
              <React.Fragment key={stat.label}>
                <div className="flex flex-col items-center px-6 py-4 sm:py-0 sm:px-10">
                  <span className="font-display text-3xl sm:text-4xl font-700 text-gradient-gold leading-none">
                    {stat.value}
                  </span>
                  <span className="text-xs text-[#6B7280] mt-1.5 tracking-wider uppercase font-medium whitespace-nowrap">
                    {stat.label}
                  </span>
                </div>
                {i < stats.length - 1 && (
                  <div className="hidden sm:block w-[1px] bg-[#2A2A2A] self-stretch my-2" />
                )}
              </React.Fragment>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Bottom vignette */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#111111] to-transparent pointer-events-none" />

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.8 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 cursor-pointer group"
        onClick={() => handleScrollTo("#trust-bar")}
      >
        <span className="text-[10px] tracking-[0.3em] text-[#4B5563] uppercase font-medium group-hover:text-[#C6A15B] transition-colors">
          Scroll
        </span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="text-[#4B5563] group-hover:text-[#C6A15B] transition-colors"
        >
          <ChevronDown size={20} />
        </motion.div>
      </motion.div>
    </section>
  );
}
