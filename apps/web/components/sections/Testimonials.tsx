"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Star, Quote } from "lucide-react";

interface Testimonial {
  id: number;
  name: string;
  role: string;
  company: string;
  text: string;
  initials: string;
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    name: "Michael Chen",
    role: "CEO",
    company: "Phoenix Tech Campus",
    text: "Graystone transformed our vision into a world-class facility. On time, on budget, exceptional quality. The team's professionalism and attention to detail set them apart from every contractor we've worked with.",
    initials: "MC",
  },
  {
    id: 2,
    name: "Sarah Williams",
    role: "Custom Home Client",
    company: "Scottsdale, AZ",
    text: "Our dream home was built with precision and care. The team's communication was flawless from day one — we always knew what was happening and felt like genuine partners throughout the entire process.",
    initials: "SW",
  },
  {
    id: 3,
    name: "Robert Torres",
    role: "Principal",
    company: "Torres Property Development",
    text: "Three projects with Graystone. The consistency in quality and professionalism is unmatched in Arizona. They've become our default contractor because they've never once let us down.",
    initials: "RT",
  },
  {
    id: 4,
    name: "Jennifer Park",
    role: "Owner",
    company: "Park Restaurant Group",
    text: "The tenant improvement on our flagship Tempe location was stunning — and they delivered two weeks early. When a contractor saves you time and money, you tell everyone you know.",
    initials: "JP",
  },
  {
    id: 5,
    name: "David Martinez",
    role: "Managing Partner",
    company: "Mesa Industrial Properties",
    text: "Massive project, zero surprises. Graystone is the only contractor we call for industrial work. Their site management and communication protocols are genuinely best-in-class.",
    initials: "DM",
  },
];

export default function Testimonials() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);

  const goNext = useCallback(() => {
    setDirection(1);
    setCurrent((prev) => (prev + 1) % testimonials.length);
  }, []);

  const goPrev = useCallback(() => {
    setDirection(-1);
    setCurrent((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  }, []);

  useEffect(() => {
    const timer = setInterval(goNext, 5000);
    return () => clearInterval(timer);
  }, [goNext]);

  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 60 : -60,
      opacity: 0,
      scale: 0.98,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -60 : 60,
      opacity: 0,
      scale: 0.98,
    }),
  };

  const t = testimonials[current];

  return (
    <section className="section-padding bg-[#0A0A0A] relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-radial from-[#C6A15B]/4 via-transparent to-transparent pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <span className="text-[11px] tracking-[0.3em] text-[#C6A15B] uppercase font-semibold">
            Client Stories
          </span>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-700 text-[#F9FAFB] mt-3">
            What Arizona Builds With Us
          </h2>
        </motion.div>

        {/* Carousel */}
        <div className="relative">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={current}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="glass-dark border border-[#2A2A2A] rounded-sm p-8 md:p-12 relative"
            >
              {/* Gold quote mark */}
              <div className="absolute top-8 left-8 md:top-10 md:left-10 opacity-20">
                <Quote size={48} className="text-[#C6A15B]" />
              </div>

              <div className="relative z-10 flex flex-col items-center text-center">
                {/* Stars */}
                <div className="flex gap-1 mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={18}
                      className="text-[#C6A15B] fill-[#C6A15B]"
                    />
                  ))}
                </div>

                {/* Quote */}
                <blockquote className="text-[#F9FAFB] text-lg sm:text-xl md:text-2xl font-display italic leading-relaxed max-w-3xl mb-8">
                  &ldquo;{t.text}&rdquo;
                </blockquote>

                {/* Divider */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-[1px] w-12 bg-[#C6A15B]/40" />
                  <div className="w-1 h-1 rounded-full bg-[#C6A15B]/60" />
                  <div className="h-[1px] w-12 bg-[#C6A15B]/40" />
                </div>

                {/* Author */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#C6A15B]/15 border border-[#C6A15B]/30 flex items-center justify-center">
                    <span className="text-[#C6A15B] font-semibold text-sm tracking-wider">
                      {t.initials}
                    </span>
                  </div>
                  <div className="text-left">
                    <div className="text-[#F9FAFB] font-semibold text-base">{t.name}</div>
                    <div className="text-[#6B7280] text-sm">
                      {t.role}, {t.company}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation buttons */}
          <button
            onClick={goPrev}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-6 w-10 h-10 rounded-full bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center text-[#6B7280] hover:text-[#C6A15B] hover:border-[#C6A15B]/50 transition-all duration-200 z-20"
            aria-label="Previous testimonial"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={goNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-6 w-10 h-10 rounded-full bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center text-[#6B7280] hover:text-[#C6A15B] hover:border-[#C6A15B]/50 transition-all duration-200 z-20"
            aria-label="Next testimonial"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Dot indicators */}
        <div className="flex items-center justify-center gap-2 mt-8">
          {testimonials.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setDirection(i > current ? 1 : -1);
                setCurrent(i);
              }}
              className={`transition-all duration-300 rounded-full ${
                i === current
                  ? "w-6 h-2 bg-[#C6A15B]"
                  : "w-2 h-2 bg-[#2A2A2A] hover:bg-[#C6A15B]/40"
              }`}
              aria-label={`Go to testimonial ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
