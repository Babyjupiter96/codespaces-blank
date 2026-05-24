"use client";

import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  Phone,
  PenTool,
  FileText,
  HardHat,
  CheckCircle,
  type LucideIcon,
} from "lucide-react";

interface ProcessStep {
  number: string;
  icon: LucideIcon;
  title: string;
  description: string;
}

const steps: ProcessStep[] = [
  {
    number: "01",
    icon: Phone,
    title: "Consultation",
    description:
      "We discuss your vision, timeline, and budget in a no-pressure conversation. We listen first and advise second.",
  },
  {
    number: "02",
    icon: PenTool,
    title: "Planning & Design",
    description:
      "Detailed architectural plans, permit acquisition, and a comprehensive project roadmap tailored to your goals.",
  },
  {
    number: "03",
    icon: FileText,
    title: "Transparent Proposal",
    description:
      "A fully itemized proposal with no hidden costs. You know exactly what you're getting and what you're paying for.",
  },
  {
    number: "04",
    icon: HardHat,
    title: "Construction",
    description:
      "Expert execution by our skilled crews with weekly progress updates and an open door to your project manager.",
  },
  {
    number: "05",
    icon: CheckCircle,
    title: "Final Walkthrough",
    description:
      "Comprehensive punch list review, your sign-off on every detail, and a complete project closeout package.",
  },
];

export default function Process() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const lineRef = useRef<HTMLDivElement>(null);
  const lineIsInView = useInView(lineRef, { once: true, margin: "-50px" });

  return (
    <section id="process" className="section-padding bg-[#111111] relative overflow-hidden">
      {/* Background accent */}
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-radial from-[#C6A15B]/5 to-transparent pointer-events-none blur-3xl" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14 md:mb-20"
        >
          <span className="text-[11px] tracking-[0.3em] text-[#C6A15B] uppercase font-semibold">
            How We Work
          </span>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-700 text-[#F9FAFB] mt-3 mb-4">
            Our Proven Process
          </h2>
          <p className="text-[#6B7280] max-w-2xl mx-auto text-base">
            Five clear steps from first conversation to final handover — designed to keep you informed, confident, and on budget.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <div className="h-[1px] w-12 bg-[#C6A15B]" />
            <div className="w-1.5 h-1.5 rounded-full bg-[#C6A15B]" />
            <div className="h-[1px] w-12 bg-[#C6A15B]" />
          </div>
        </motion.div>

        {/* Desktop: Horizontal timeline */}
        <div className="hidden lg:block">
          {/* Connecting line */}
          <div ref={lineRef} className="relative mb-8">
            <div className="absolute top-1/2 left-[10%] right-[10%] h-[1px] bg-[#2A2A2A] -translate-y-1/2" />
            <motion.div
              className="absolute top-1/2 left-[10%] h-[1px] bg-gradient-to-r from-[#C6A15B] to-[#A8854A] -translate-y-1/2"
              initial={{ width: 0 }}
              animate={lineIsInView ? { width: "80%" } : { width: 0 }}
              transition={{ duration: 1.5, delay: 0.3, ease: "easeOut" }}
            />
            {/* Step nodes on line */}
            <div className="flex justify-between items-center px-[10%]">
              {steps.map((step, i) => (
                <motion.div
                  key={step.number}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={lineIsInView ? { scale: 1, opacity: 1 } : {}}
                  transition={{ duration: 0.4, delay: 0.2 + i * 0.25 }}
                  className="w-3 h-3 rounded-full bg-[#C6A15B] border-2 border-[#C6A15B] z-10 relative"
                />
              ))}
            </div>
          </div>

          <div ref={ref} className="grid grid-cols-5 gap-4">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, y: 30 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: i * 0.12, ease: "easeOut" }}
                  className="group flex flex-col items-center text-center"
                >
                  {/* Step card */}
                  <div className="w-full border border-[#2A2A2A] bg-[#141414] rounded-sm p-6 hover:border-[#C6A15B]/40 hover:bg-[#161616] transition-all duration-300 mt-6">
                    <div className="font-display text-3xl font-700 text-[#C6A15B] mb-4 opacity-60">
                      {step.number}
                    </div>
                    <div className="w-10 h-10 mx-auto mb-4 rounded-sm bg-[#C6A15B]/10 flex items-center justify-center group-hover:bg-[#C6A15B]/20 transition-colors">
                      <Icon size={20} className="text-[#C6A15B]" strokeWidth={1.5} />
                    </div>
                    <h3 className="font-semibold text-[#F9FAFB] text-sm mb-2 group-hover:text-[#C6A15B] transition-colors">
                      {step.title}
                    </h3>
                    <p className="text-[#6B7280] text-xs leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Mobile/Tablet: Vertical timeline */}
        <div className="lg:hidden relative">
          {/* Vertical line */}
          <div className="absolute left-6 top-0 bottom-0 w-[1px] bg-[#2A2A2A]" />
          <motion.div
            className="absolute left-6 top-0 w-[1px] bg-gradient-to-b from-[#C6A15B] to-[#A8854A]"
            initial={{ height: 0 }}
            whileInView={{ height: "100%" }}
            viewport={{ once: true }}
            transition={{ duration: 2, ease: "easeOut" }}
          />

          <div className="space-y-6">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="relative flex gap-6 pl-16"
                >
                  {/* Node */}
                  <div className="absolute left-[18px] top-4 w-5 h-5 rounded-full bg-[#1A1A1A] border-2 border-[#C6A15B] flex items-center justify-center z-10">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#C6A15B]" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 border border-[#2A2A2A] bg-[#141414] rounded-sm p-5 hover:border-[#C6A15B]/40 transition-all duration-300">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <div className="font-display text-2xl font-700 text-[#C6A15B] opacity-50 leading-none mb-1">
                          {step.number}
                        </div>
                        <div className="w-8 h-8 rounded-sm bg-[#C6A15B]/10 flex items-center justify-center">
                          <Icon size={16} className="text-[#C6A15B]" strokeWidth={1.5} />
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold text-[#F9FAFB] text-base mb-1.5">
                          {step.title}
                        </h3>
                        <p className="text-[#6B7280] text-sm leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* CTA below process */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center mt-14"
        >
          <p className="text-[#6B7280] mb-5 text-base">
            Ready to start the process? Let&apos;s talk about your project today.
          </p>
          <button
            onClick={() => document.querySelector("#contact")?.scrollIntoView({ behavior: "smooth" })}
            className="inline-flex items-center gap-2 bg-[#C6A15B] text-[#111111] px-8 py-4 rounded-sm text-sm font-semibold tracking-wider uppercase hover:bg-[#D4B483] shadow-[0_0_30px_rgba(198,161,91,0.3)] hover:shadow-[0_0_50px_rgba(198,161,91,0.5)] transition-all duration-300"
          >
            Start Your Consultation
          </button>
        </motion.div>
      </div>
    </section>
  );
}
